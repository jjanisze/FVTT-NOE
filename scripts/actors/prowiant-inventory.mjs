/**
 * Neuroshima 5e — Prowiant (food/water) inventory panel, in the Zasoby tab.
 *
 * Same relocation pattern as `surowce-inventory.mjs`, matching by
 * `getProwiantCategory()` (loose name regex — see `config/prowiant-data.mjs`
 * for why this isn't a rigid enumerated catalog like Surowce/Grenades).
 *
 * Sums weight per category and divides by the RAW daily threshold
 * (`Tabele/Zywnosc.md`) to show days of supply. Nothing here applies Wyczerpanie
 * automatically — the GM reads the number and acts on it, same standing rule as
 * everywhere else in this module.
 *
 * ## Naprawa 2026-09-09: prowiant był nieedytowalny i nie do znalezienia
 *
 * Ten panel, jak każdy sąsiedni, **usuwa** natywne wiersze ekwipunku dla przedmiotów, które
 * przejmuje. Różnica polegała na tym, że Leki i Magazynki oddają w zamian pełne wiersze z
 * kontrolkami, a Prowiant rysował wyłącznie zbiorczą linijkę per kategoria („Konserwa ×5, Litr
 * Wody ×2") — bez pola ilości, bez edycji, bez kasowania.
 *
 * Efekt zgłoszony przez MG: *„Szukałem Woda, w ekwipunku i zapasach — nie ma. Wobec czego nie
 * mogę dodać wody ani konserw manualnie."* I tak było: jedzenia i wody nie dało się ani zmienić,
 * ani otworzyć, ani usunąć z żadnego widoku, bo jedyny wiersz, który je pokazywał, był kasowany
 * z DOM-u. Wyglądało to na świadome „panel informacyjny", a było zgubieniem przedmiotu.
 *
 * Panel pokazuje teraz wiersz na przedmiot (ilość ±, edycja, kasowanie) i dokłada przycisk
 * „Dodaj prowiant" z katalogiem z `Tabele/Zywnosc.md`. Podsumowanie dni zapasu zostaje jako
 * osobny wiersz na dole każdej kategorii — bo to była jedyna rzecz, która tu działała.
 */

import {
  PROWIANT_CATEGORIES, getProwiantCategory,
  PROWIANT_CATALOG, buildProwiantItemData
} from "../config/prowiant-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const WRAPPER_CLASS = "neuro-prowiant-wrapper";

export function registerProwiantInventory() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetInjectProwiant);
  }
  console.log("Neuroshima 5e | Prowiant (food/water) inventory UI registered");
}

function _itemWeightKg(item) {
  const w = item.system.weight;
  const value = w?.value ?? (typeof w === "number" ? w : 0);
  return Number.isFinite(value) ? value : 0;
}

function _fmt(kg, unit) {
  if (!kg) return `0 ${unit}`;
  return `${kg % 1 === 0 ? kg : kg.toFixed(1)} ${unit}`;
}

function _onRenderActorSheetInjectProwiant(app, html) {
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

  if (inventoryTab.querySelector(`.${WRAPPER_CLASS}`)) return;

  const itemsByCat = new Map();
  for (const item of actor.items || []) {
    const cat = getProwiantCategory(item);
    if (!cat) continue;
    if (!itemsByCat.has(cat.id)) itemsByCat.set(cat.id, []);
    itemsByCat.get(cat.id).push(item);
  }

  const pools = PROWIANT_CATEGORIES.map(cat => {
    const items = itemsByCat.get(cat.id) ?? [];
    let totalQty = 0, totalKg = 0;
    for (const it of items) {
      const qty = Number(it.system.quantity ?? 0);
      totalQty += qty;
      totalKg += _itemWeightKg(it) * qty;
    }
    return { cat, items, totalQty, totalKg };
  }).filter(p => p.items.length > 0);

  // Sekcja jest widoczna także przy pustym plecaku — inaczej nie da się dodać PIERWSZEJ racji,
  // dokładnie ta sama zasada, którą stosuje sekcja Zapasowych Magazynków.
  for (const pool of pools) {
    for (const item of pool.items) inventoryTab.querySelector(`li[data-item-id="${item.id}"]`)?.remove();
  }

  const uiList = document.createElement("ul");
  uiList.className = "item-list neuro-prowiant-list";
  uiList.style.cssText = "margin:0; padding:0; list-style:none;";

  for (const pool of pools) {
    for (const item of pool.items) uiList.appendChild(_itemRow(item, pool.cat));
    uiList.appendChild(_summaryRow(pool));
  }

  const panel = document.createElement("div");
  panel.innerHTML = `
    <div class="items-header header flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#242a33; min-height:30px; border-bottom:2px solid #FFFFFF; color:#FFFFFF; font-size:0.9em; font-weight:bold; padding:0 5px;">
      <h3 class="item-name" style="flex:1.8; margin:0; padding-left:5px; color:#FFFFFF; font-size:1.1em; text-decoration:none; border:none;">Prowiant</h3>
      <div style="flex:0 0 70px; text-align:center;">Cena</div>
      <div style="flex:0 0 70px; text-align:center;">Waga</div>
      <div style="flex:0 0 90px; text-align:center;">Ilość</div>
      <div style="flex:0 0 70px; text-align:right; padding-right:6px;"></div>
    </div>
  `;
  panel.appendChild(uiList);

  const addRow = document.createElement("div");
  addRow.style.cssText = "padding:6px 10px;";
  addRow.innerHTML = `
    <button type="button" class="neuro-add-prowiant-btn" style="width:auto; white-space:nowrap;">
      <i class="fas fa-utensils"></i> DODAJ PROWIANT
    </button>
  `;
  addRow.querySelector(".neuro-add-prowiant-btn").addEventListener("click", async ev => {
    ev.preventDefault();
    await _promptAddProwiant(actor);
  });

  const note = document.createElement("div");
  note.style.cssText = "padding:0 10px 6px; font-size:0.78em; color:var(--color-text-secondary, #888); font-style:italic;";
  note.textContent = "Próg 0,5 kg jedzenia i 2 l wody dziennie (Tabela Żywności). "
    + "Licznik jest informacyjny — Wyczerpanie nakłada MG.";

  const wrapper = document.createElement("div");
  wrapper.className = WRAPPER_CLASS;
  wrapper.appendChild(panel);
  wrapper.appendChild(addRow);
  wrapper.appendChild(note);

  const anchor = inventoryTab.querySelector(".neuro-leki-wrapper")
    ?? inventoryTab.querySelector(".neuro-grenade-wrapper")
    ?? inventoryTab.querySelector(".neuro-magazine-wrapper")
    ?? inventoryTab.querySelector(".neuro-ammo-wrapper");
  if (anchor) anchor.after(wrapper);
  else {
    const currencyHeader = inventoryTab.querySelector(".currency");
    if (currencyHeader) currencyHeader.after(wrapper);
    else inventoryTab.prepend(wrapper);
  }
}

/* -------------------------------------------- */
/*  Wiersze                                      */
/* -------------------------------------------- */

/** Pełny wiersz przedmiotu — ten sam układ kontrolek co Leki i Zapasowe Magazynki. */
function _itemRow(item, cat) {
  const qty = Number(item.system.quantity ?? 0);
  const unitKg = _itemWeightKg(item);
  const totalKg = unitKg * qty;
  const price = (item.system.price?.value ?? 0) * qty;

  const li = document.createElement("li");
  li.className = "item";
  li.setAttribute("data-item-id", item.id);
  li.style.cssText = "list-style:none; margin:0;";
  li.innerHTML = `
    <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#20242c; min-height:42px; border-bottom:1px dotted #363c48; padding:4px 5px; color:#cacdd5;">
      <div class="item-name item-tooltip flexrow" style="flex:1.8; align-items:center; gap:8px; min-width:160px;">
        <dnd5e-icon draggable="false" src="${item.img}" aria-label="${item.name}" class="item-image gold-icon" style="--icon-fill:${cat.accent}"></dnd5e-icon>
        <span class="title" style="color:#cacdd5; font-weight:500;">${item.name}</span>
      </div>
      <div class="item-detail" style="flex:0 0 70px; text-align:center;">${Math.round(price)} gb</div>
      <div class="item-detail" style="flex:0 0 70px; text-align:center; font-variant-numeric:tabular-nums;">${_fmt(totalKg, cat.unit)}</div>
      <div class="item-detail item-quantity" style="flex:0 0 90px; display:flex; align-items:center; justify-content:space-evenly;">
        <a class="adjustment-button always-interactive" data-action="decrease"><i class="fa-solid fa-minus" inert></i></a>
        <input type="text" class="always-interactive neuro-prowiant-qty" value="${qty}" placeholder="0"
          data-dtype="Number" inputmode="numeric" pattern="^(\\+|-|=)?\\d*" min="0" aria-label="Ilość" style="width:36px; text-align:center;">
        <a class="adjustment-button always-interactive" data-action="increase"><i class="fa-solid fa-plus" inert></i></a>
      </div>
      <div class="item-detail item-controls always-visible" style="flex:0 0 70px; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
        <button type="button" class="unbutton config-button item-control item-edit" title="Edytuj" style="color:#ccc;"><i class="fas fa-edit" inert></i></button>
        <button type="button" class="unbutton config-button item-control item-delete" title="Usuń" style="color:#ccc;"><i class="fas fa-trash" inert></i></button>
      </div>
    </div>
  `;

  const input = li.querySelector(".neuro-prowiant-qty");
  input.addEventListener("change", async e => {
    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
    e.target.value = val;
    await item.update({ "system.quantity": val });
  });
  for (const btn of li.querySelectorAll(".adjustment-button[data-action]")) {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const delta = btn.dataset.action === "increase" ? 1 : -1;
      input.value = Math.max(0, (parseInt(input.value, 10) || 0) + delta);
      input.dispatchEvent(new Event("change"));
    });
  }
  li.querySelector(".item-edit").addEventListener("click", () => item.sheet.render(true));
  li.querySelector(".item-delete").addEventListener("click", () => item.deleteDialog());

  return li;
}

/** Podsumowanie kategorii: ile dni zapasu. Jedyna rzecz, która w tym panelu działała wcześniej. */
function _summaryRow(pool) {
  const days = pool.cat.dailyThreshold > 0 ? pool.totalKg / pool.cat.dailyThreshold : 0;
  const daysColor = days >= 3 ? "#7fbf6a" : days >= 1 ? "#d8b24a" : "#e06666";

  const li = document.createElement("li");
  li.className = "item neuro-prowiant-summary";
  li.style.cssText = "list-style:none; margin:0;";
  li.innerHTML = `
    <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#191d24; min-height:28px; border-bottom:1px solid #363c48; padding:2px 5px; color:#9096a3; font-size:0.85em;">
      <div style="flex:1.8; padding-left:34px;">
        <span style="color:${pool.cat.accent}; font-weight:600;">${pool.cat.label}</span> — razem
      </div>
      <div style="flex:0 0 70px;"></div>
      <div style="flex:0 0 70px; text-align:center; font-variant-numeric:tabular-nums;">${_fmt(pool.totalKg, pool.cat.unit)}</div>
      <div style="flex:0 0 90px; text-align:center; color:${daysColor}; font-weight:600;">${days.toFixed(1)} dni</div>
      <div style="flex:0 0 70px;"></div>
    </div>
  `;
  return li;
}

/* -------------------------------------------- */
/*  Dodawanie                                    */
/* -------------------------------------------- */

async function _promptAddProwiant(actor) {
  const groups = { jedzenie: "Jedzenie", woda: "Woda i napoje" };
  const options = Object.entries(groups).map(([catId, label]) => {
    const rows = PROWIANT_CATALOG.filter(e => e.category === catId)
      .map(e => `<option value="${e.id}">${e.label} — ${e.price} gb, dost. ${e.avail}%</option>`)
      .join("");
    return `<optgroup label="${label}">${rows}</optgroup>`;
  }).join("");

  const content = `
    <p>Ceny i dostępność wprost z Tabeli Żywności.</p>
    <div class="form-group">
      <label>Pozycja</label>
      <div class="form-fields"><select name="entry" style="flex:1;">${options}</select></div>
    </div>
    <div class="form-group">
      <label>Ilość</label>
      <div class="form-fields"><input type="number" name="qty" value="1" min="1" step="1" style="flex:1;"></div>
    </div>`;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Dodaj prowiant" },
    content,
    ok: {
      label: "Dodaj",
      callback: (_ev, button) => ({
        id: button.form.elements.entry.value,
        qty: Math.max(1, parseInt(button.form.elements.qty.value, 10) || 1)
      })
    },
    rejectClose: false
  });
  if (!result?.id) return;

  // Ten sam stos, jeśli już jest — inaczej karta rośnie o kolejną „Konserwa (1 kg)" przy
  // każdym zakupie, dokładnie tak jak robi to `_addAmmoToActor` dla amunicji.
  const data = buildProwiantItemData(result.id, result.qty);
  const existing = actor.items.find(i =>
    i.getFlag(MODULE_ID, "prowiantId") === result.id
    || (i.type === "loot" && i.name === data.name));

  if (existing) {
    const next = (existing.system.quantity ?? 0) + result.qty;
    await existing.update({ "system.quantity": next });
    ui.notifications.info(`${existing.name}: ${next} szt.`);
    return;
  }
  await actor.createEmbeddedDocuments("Item", [data]);
  ui.notifications.info(`Dodano ${result.qty} × ${data.name}.`);
}
