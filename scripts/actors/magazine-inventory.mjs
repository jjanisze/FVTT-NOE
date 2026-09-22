/**
 * Neuroshima 5e — sekcja „Magazynki" w ekwipunku.
 *
 * Projekt: PLAN_magazynki.md §7. Wstrzykuje sekcję ponad sekcją Amunicja.
 *
 * ## Wiersz na SZTUKĘ, nie na klasę
 *
 * Do 2026-09-22 był to wiersz na *klasę* magazynka z kolumnami Ilość / Gotowych — bo magazynki
 * były kwantowe i nie trzymały niczego własnego. Teraz każdy magazynek ma swoją zawartość,
 * w ustalonej kolejności, więc **dwa magazynki 5,56 o różnej zawartości to dwa osobne dokumenty
 * Item**, a `system.quantity` zostaje na 1. Grupowanie wizualne po broni robi to, co robiła
 * kolumna Ilość: pozwala przeczytać osiem magazynków bez liczenia ich wzrokiem.
 *
 * ## Jedyna podpowiedź automatu
 *
 * Wiersz **pulsuje**, gdy magazynek nie jest pełny, a w ekwipunku leży pasujący kaliber. Nic
 * więcej — nie ma automatycznego uzupełniania i nie będzie. „Które z trzech 7.62 napełnić" nie
 * ma dobrej odpowiedzi, więc ładowanie jest jawną interakcją gracza, jak czyszczenie broni.
 * Automat wskazuje palcem; decyduje człowiek.
 */

import { AMMO_CALIBER_MAP } from "../config/ammo-data.mjs";
import {
  MAGAZINES, MAG_CLASSES, MAG_SUBTYPES, magazineDef, magClass, magIconPath,
  magazineWeight, buildMagazineItemData
} from "../config/magazines-data.mjs";
import {
  isMagazineItem, magazineDefOf, magazineRounds, describeRounds, acceptedCalibers
} from "../weapons/magazine-model.mjs";
import { openLoadWindow, unloadMagazineAction } from "../weapons/magazine.mjs";
import { isAtHand, toggleAtHand, handyCount, HANDY_LIMIT } from "./handy-items.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* Re-eksport dla zgodności — `MAG_SUBTYPES` i `isMagazineItem` mieszkają teraz przy danych
   i przy modelu, ale importowanie ich stąd jest nadal sensowne dla kodu UI. */
export { MAG_SUBTYPES, isMagazineItem };

/* ─────────────────────────────────────────────────────────────────
   Rejestracja hooków
───────────────────────────────────────────────────────────────── */

export function registerMagazineInventory() {
  for (const hookName of [
    "renderActorSheet",
    "renderCharacterActorSheet",
    "renderNPCActorSheet",
  ]) {
    Hooks.on(hookName, _onRenderActorSheetInjectMagazines);
  }
  console.log("Neuroshima 5e | Magazine inventory UI registered");
}

/* ─────────────────────────────────────────────────────────────────
   Wstrzykiwanie sekcji
───────────────────────────────────────────────────────────────── */

function _onRenderActorSheetInjectMagazines(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  const inventoryTab = root.querySelector(".tab.inventory")
    ?? root.querySelector(".inventory-element")
    ?? root.querySelector('section[data-tab="inventory"]')
    ?? root.querySelector('div[data-tab="inventory"]');
  if (!inventoryTab) return;
  if (inventoryTab.querySelector(".neuro-add-magazine-btn")) return;   // nie wstrzykuj dwa razy

  const magazines = (actor.items ?? []).filter(isMagazineItem);
  const inCombat = !!actor.inCombat;

  /* Który magazynek siedzi w której broni — jeden przebieg, zamiast szukania per wiersz. */
  const loadedIn = new Map();
  for (const weapon of actor.items ?? []) {
    if (weapon.type !== "weapon") continue;
    const id = weapon.getFlag(MODULE_ID, "loadedMag");
    if (id) loadedIn.set(id, weapon);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "neuro-magazine-wrapper";
  wrapper.appendChild(_buildHeader(actor));

  const list = document.createElement("ul");
  list.className = "item-list neuro-magazine-list";

  let totalPrice = 0;
  let totalWeightKg = 0;

  for (const group of _groupMagazines(magazines)) {
    if (group.label) {
      const heading = document.createElement("li");
      heading.className = "neuro-magazine-group";
      heading.textContent = group.label;
      list.appendChild(heading);
    }
    for (const mag of group.items) {
      const def = magazineDefOf(mag);
      const rounds = magazineRounds(mag);
      const weight = magazineWeight(def, rounds);
      totalWeightKg += weight;
      totalPrice += magClass(def).price;
      list.appendChild(_buildRow(actor, mag, def, rounds, {
        weight, inCombat, loadedInto: loadedIn.get(mag.id) ?? null
      }));
      /* Natywny wiersz w „Używki" pokazywałby ten sam przedmiot drugi raz, bez zawartości. */
      inventoryTab.querySelector(`li[data-item-id="${mag.id}"]`)?.remove();
    }
  }

  wrapper.appendChild(list);
  wrapper.appendChild(_buildFooter(actor, { totalPrice, totalWeightKg }));

  const ammoWrapper = inventoryTab.querySelector(".neuro-ammo-wrapper");
  if (ammoWrapper) ammoWrapper.before(wrapper);
  else {
    const currencyHeader = inventoryTab.querySelector(".currency");
    currencyHeader ? currencyHeader.after(wrapper) : inventoryTab.prepend(wrapper);
  }
}

/* ─────────────────────────────────────────────────────────────────
   Grupowanie
───────────────────────────────────────────────────────────────── */

/**
 * Magazynki pogrupowane po gnieździe (czyli po modelu broni), szybkoładowarki i kołczany na
 * końcu. Nagłówek grupy pojawia się dopiero od dwóch grup — przy jednym magazynku byłby
 * ozdobnikiem.
 */
function _groupMagazines(magazines) {
  const byKey = new Map();
  for (const mag of magazines) {
    const def = magazineDefOf(mag);
    const key = def ? (def.magwell ?? `caliber:${def.caliber}`) : "__unknown";
    if (!byKey.has(key)) byKey.set(key, { label: _groupLabel(def), items: [] });
    byKey.get(key).items.push(mag);
  }
  const groups = [...byKey.values()];
  if (groups.length <= 1) for (const g of groups) g.label = null;
  return groups;
}

function _groupLabel(def) {
  if (!def) return "Nierozpoznane";
  if (def.kind === "speedloader") return `Szybkoładowarki ${_caliberLabel(def.caliber)}`;
  if (def.kind === "quiver") return def.name;
  return def.name.replace(/^Magazynek do /, "Do ").replace(/^Taśma do /, "Taśma do ");
}

/* ─────────────────────────────────────────────────────────────────
   Wiersz
───────────────────────────────────────────────────────────────── */

function _buildRow(actor, mag, def, rounds, { weight, inCombat, loadedInto }) {
  const capacity = def?.capacity ?? 0;
  const full = def && rounds.length >= capacity;
  const canTopUp = def && !full && _hasMatchingAmmo(actor, def);

  const li = document.createElement("li");
  li.className = "item neuro-magazine-item";
  li.dataset.itemId = mag.id;
  /* Pulsowanie = „masz czym to dopełnić". Jedyna podpowiedź, jaką ten panel daje. */
  if (canTopUp) li.classList.add("is-toppable");
  if (!def) li.classList.add("is-inert");

  const weightStr = weight < 1 ? `${Math.round(weight * 1000)} g` : `${weight.toFixed(2)} kg`;
  const contents = describeRounds(rounds);
  const whereNote = loadedInto
    ? `<span class="neuro-magazine-in" data-tooltip="Wpięty w broń — wypnij go z karty broni.">w: ${loadedInto.name}</span>`
    : "";

  li.innerHTML = `
    <div class="item-row flexrow neuro-magazine-row">
      <div class="item-name flexrow">
        <dnd5e-icon draggable="false" src="${mag.img || magIconPath(def?.cls)}" aria-label="${mag.name}"
                    class="item-image gold-icon"></dnd5e-icon>
        <div class="name name-stacked flexcol">
          <span class="title">${mag.name}</span>
          <span class="subtitle">${contents}${whereNote ? ` · ${whereNote}` : ""}</span>
        </div>
      </div>
      <div class="item-detail neuro-magazine-fill">
        ${def ? `<span class="neuro-magazine-count ${full ? "is-full" : ""}">${rounds.length}/${capacity}</span>`
              : `<span class="neuro-magazine-count is-inert" data-tooltip="Nierozpoznany magazynek — brak definicji w katalogu.">?</span>`}
      </div>
      <div class="item-detail item-weight"><span class="value">${weightStr}</span></div>
      <div class="item-detail item-controls always-visible neuro-magazine-controls">
        <button type="button" class="unbutton item-control neuro-mag-hand ${isAtHand(mag) ? "is-on" : ""}"
                data-tooltip="Przedmiot podręczny: wyciągnięcie w ramach Darmowej Interakcji. Maksymalnie ${HANDY_LIMIT} łącznie z granatami i lekami.">
          <i class="fas fa-hand" inert></i>
        </button>
        <button type="button" class="unbutton item-control neuro-mag-load" ${inCombat || !def ? "disabled" : ""}
                data-tooltip="${inCombat ? "Naboi nie wkłada się do magazynka w walce." : "Załaduj"}">
          <i class="fas fa-download" inert></i>
        </button>
        <button type="button" class="unbutton item-control neuro-mag-unload" ${inCombat || !rounds.length ? "disabled" : ""}
                data-tooltip="${inCombat ? "Rozładowywanie nie jest czynnością bojową." : "Rozładuj wszystko"}">
          <i class="fas fa-upload" inert></i>
        </button>
        <button type="button" class="unbutton config-button item-control item-edit" data-tooltip="Edytuj">
          <i class="fas fa-edit" inert></i>
        </button>
        <button type="button" class="unbutton config-button item-control item-delete" data-tooltip="Usuń">
          <i class="fas fa-trash" inert></i>
        </button>
      </div>
    </div>
    ${rounds.length ? `<div class="neuro-magazine-queue"><span class="label">Kolejność wystrzału:</span> ${_queuePreview(rounds)}</div>` : ""}
  `;

  li.querySelector(".neuro-mag-hand")?.addEventListener("click", async ev => {
    ev.preventDefault();
    await toggleAtHand(mag);
  });
  li.querySelector(".neuro-mag-load")?.addEventListener("click", ev => {
    ev.preventDefault();
    void openLoadWindow(mag);
  });
  li.querySelector(".neuro-mag-unload")?.addEventListener("click", ev => {
    ev.preventDefault();
    void unloadMagazineAction(mag);
  });
  li.querySelector(".item-edit")?.addEventListener("click", () => mag.sheet.render(true));
  li.querySelector(".item-delete")?.addEventListener("click", () => mag.deleteDialog());

  return li;
}

/** Podgląd kolejki: zwinięty do grup, w kolejności wystrzału (pierwszy chip leci pierwszy). */
function _queuePreview(rounds) {
  const groups = [];
  for (const id of rounds) {
    const last = groups[groups.length - 1];
    if (last && last.id === id) last.n += 1;
    else groups.push({ id, n: 1 });
  }
  return groups.map(g => `<span class="neuro-magazine-chip">▸ ${g.n}× ${_caliberLabel(g.id)}</span>`).join("");
}

/** Czy aktor ma w ekwipunku nabój, który wolno wsadzić do tego pojemnika. */
function _hasMatchingAmmo(actor, def) {
  const ids = new Set(acceptedCalibers(def).map(c => c.id));
  return (actor.items ?? []).some(i =>
    i.type === "consumable"
    && i.system?.type?.value === "ammo"
    && ids.has(i.system?.type?.subtype)
    && Number(i.system?.quantity ?? 0) > 0);
}

function _caliberLabel(id) {
  return AMMO_CALIBER_MAP[id]?.label ?? id;
}

/* ─────────────────────────────────────────────────────────────────
   Nagłówek i stopka
───────────────────────────────────────────────────────────────── */

function _buildHeader(actor) {
  const used = handyCount(actor);
  const header = document.createElement("div");
  header.className = "items-header header flexrow neuro-magazine-header";
  header.innerHTML = `
    <h3 class="item-name">Magazynki</h3>
    <span class="neuro-handy-counter ${used >= HANDY_LIMIT ? "is-full" : ""}"
          data-tooltip="Przedmioty podręczne przy pasie — magazynki, granaty i leki łącznie. RAW: maksymalnie ${HANDY_LIMIT}.">
      <i class="fas fa-hand" inert></i> ${used}/${HANDY_LIMIT}
    </span>
    <div class="item-header neuro-magazine-fill">Naboje</div>
    <div class="item-header item-weight">Waga</div>
    <div class="item-header item-controls"></div>
  `;
  return header;
}

function _buildFooter(actor, { totalPrice, totalWeightKg }) {
  const weightStr = totalWeightKg < 1
    ? `${Math.round(totalWeightKg * 1000)} g`
    : `${totalWeightKg.toFixed(2)} kg`;

  const footer = document.createElement("div");
  footer.className = "neuro-magazine-footer";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "neuro-add-magazine-btn";
  addBtn.innerHTML = `<i class="fas fa-layer-group"></i> DODAJ MAGAZYNEK`;
  addBtn.addEventListener("click", ev => {
    ev.preventDefault();
    void _showMagazineDialog(actor);
  });

  const summary = document.createElement("div");
  summary.className = "neuro-magazine-summary";
  summary.innerHTML = `
    <span>Cena: <strong>${Math.round(totalPrice)} gb</strong></span>
    <span class="sep"></span>
    <span>Waga: <strong>${weightStr}</strong></span>
  `;

  footer.appendChild(addBtn);
  footer.appendChild(summary);
  return footer;
}

/* ─────────────────────────────────────────────────────────────────
   Dialog „Dodaj magazynek"
───────────────────────────────────────────────────────────────── */

/**
 * Wybór z katalogu, nie z sześciu klas rozmiaru.
 *
 * Magazynek generyczny przestał istnieć jako przedmiot: nie da się już stworzyć „Magazynka
 * (broń palna krótka)". Kategoria broni jest odtąd wyłącznie pojęciem cennikowym — kupuje się
 * „Magazynek do Desert Eagle", nie „magazynek do pistoletu". Wynika to wprost z zasady
 * „per model broni" i gdyby generyczny magazynek dało się tu stworzyć, wracałby tylnymi
 * drzwiami przy każdym zakupie.
 */
async function _showMagazineDialog(actor) {
  const byGroup = new Map();
  for (const def of MAGAZINES) {
    const group = MAG_CLASSES[def.cls]?.label ?? "Inne";
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(def);
  }

  const options = [...byGroup.entries()].map(([group, defs]) =>
    `<optgroup label="${group}">`
    + defs.map(d => `<option value="${d.id}">${d.name} — ${d.capacity} szt. `
      + `${_caliberLabel(d.caliber)}, ${magClass(d).price} gb</option>`).join("")
    + `</optgroup>`).join("");

  const content = `
    <form class="neuro-add-magazine-form">
      <div class="form-group">
        <label>Magazynek</label>
        <div class="form-fields"><select name="magId">${options}</select></div>
      </div>
      <div class="form-group">
        <label>Ile sztuk</label>
        <div class="form-fields"><input type="number" name="count" value="1" min="1" max="12"></div>
      </div>
      <p class="hint">Magazynki przychodzą <strong>puste</strong> — naboje wkłada się do nich
      osobno, przyciskiem „Załaduj". Każda sztuka to osobny przedmiot, bo każda ma własną
      zawartość.</p>
    </form>`;

  await foundry.applications.api.DialogV2.wait({
    window: { title: "Dodaj magazynek" },
    content,
    buttons: [
      {
        action: "add", icon: "fa-solid fa-check", label: "Dodaj", default: true,
        callback: async (_event, _button, dialog) => {
          const root = dialog.element;
          const id = root.querySelector('[name="magId"]')?.value;
          const count = Math.max(1, parseInt(root.querySelector('[name="count"]')?.value || "1", 10));
          const def = magazineDef(id);
          if (!def) return;
          const data = Array.from({ length: count }, () => buildMagazineItemData(def));
          await actor.createEmbeddedDocuments("Item", data);
          ui.notifications.info(`Dodano ${count}× ${def.name}.`);
        }
      },
      { action: "cancel", icon: "fa-solid fa-times", label: "Anuluj" }
    ],
    rejectClose: false
  });
}
