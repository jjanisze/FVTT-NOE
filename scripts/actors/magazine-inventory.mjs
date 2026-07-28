/**
 * Neuroshima 5e — Zapasowe Magazynki (Spare Magazines) inventory section.
 *
 * Wstrzykuje sekcję "Zapasowe Magazynki" ponad sekcją Amunicja.
 * Wyświetla się tylko gdy aktor ma ≥ 1 item spełniający filtr magazynka.
 *
 * Szczegóły projektu: PLAN_magazine_system.md
 */

import { AMMO_CALIBER_MAP } from "../config/ammo-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* ─────────────────────────────────────────────────────────────────
   Stałe konfiguracyjne
───────────────────────────────────────────────────────────────── */

/** Prawidłowe podtypy magazynków — `system.type.subtype` na itemie consumable. */
export const MAG_SUBTYPES = [
  "magazine-short",
  "magazine-medium",
  "magazine-long",
  "magazine-heavy",
  "magazine-quiver",
  "magazine-speedloader",
];

/** Nazwy wyświetlane dla każdego podtypu. */
export const MAG_LABELS = {
  "magazine-short":       "Krótki magazynek",
  "magazine-medium":      "Pośredni magazynek",
  "magazine-long":        "Długi magazynek",
  "magazine-heavy":       "Ciężki magazynek / taśma",
  "magazine-quiver":      "Kołczan",
  "magazine-speedloader": "Szybkoładowarka rew.",
};

/** Ścieżki ikon (względem roota modułu) dla każdego podtypu. */
export const MAG_ICONS = {
  "magazine-short":       `modules/${MODULE_ID}/icons/magazines/mag_handgun.svg`,
  "magazine-medium":      `modules/${MODULE_ID}/icons/magazines/mag_machine_pistol.svg`,
  "magazine-long":        `modules/${MODULE_ID}/icons/magazines/mag_assault_rifle.svg`,
  "magazine-heavy":       `modules/${MODULE_ID}/icons/magazines/mag_machine_gun_belt.svg`,
  "magazine-quiver":      `modules/${MODULE_ID}/icons/magazines/quiver.svg`,
  "magazine-speedloader": `modules/${MODULE_ID}/icons/magazines/speedloader.svg`,
};

/** Domyślne ceny w gb. */
export const MAG_PRICES = {
  "magazine-short":       10,
  "magazine-medium":      15,
  "magazine-long":        20,
  "magazine-heavy":       40,
  "magazine-quiver":      5,
  "magazine-speedloader": 8,
};

/** Domyślne wagi w kg. */
export const MAG_WEIGHTS = {
  "magazine-short":       0.12,
  "magazine-medium":      0.18,
  "magazine-long":        0.24,
  "magazine-heavy":       0.80,
  "magazine-quiver":      0.10,
  "magazine-speedloader": 0.06,
};

/* ─────────────────────────────────────────────────────────────────
   Mapowanie: broń → typ magazynka
───────────────────────────────────────────────────────────────── */

/** Bezpośrednie mapowanie Neuroshima weapon type → subtype magazynka. */
const WEAPON_TYPE_TO_MAG = {
  palnaKrotka: "magazine-short",
  palnaPosr:   "magazine-medium",
  palnaDluga:  "magazine-long",
  palnaCiezka: "magazine-heavy",
  miotana:     "magazine-quiver",
  // biala, specjalna, natural → null (brak zewnętrznego magazynka)
};

/** Mapowanie kategorii kalibru → subtype dla broni martialR (bez beb/wmag). */
const CALIBER_CATEGORY_TO_MAG = {
  "Pistoletowa": "magazine-short",
  "Karabinowa":  "magazine-long",   // nadpisane dla .50 BMG poniżej
  "Śrutowa":     "magazine-medium",
  "Miotana":     "magazine-quiver",
  // Granatnikowa → null
};

/** Specjalne mapowania kalibru ID → override (nadpisują kategorię). */
const CALIBER_ID_OVERRIDE = {
  "50bmg": "magazine-heavy",
};

/**
 * Wyznacza typ magazynka (subtype string lub null) dla danej broni.
 *
 * Kolejność priorytetów:
 *   1. Właściwość "beb" → speedloader
 *   2. Właściwość "wmag" → null (wbudowany magazynek)
 *   3. Neuroshima weapon type (palnaKrotka itp.)
 *   4. martialR → dedukcja z kalibru (ammoType) przez kategorię
 *   5. Fallback → "magazine-short"
 *
 * @param {Item5e} weapon
 * @returns {string|null}
 */
export function getMagTypeForWeapon(weapon) {
  const props = weapon.system.properties ?? {};
  const hasProp = key => (props instanceof Set ? props.has(key) : !!props[key]);

  // Krok 1: właściwości wewnętrzne
  if (hasProp("beb")) return "magazine-speedloader";
  if (hasProp("wmag")) return null;

  // Krok 2: Neuroshima weapon type
  const wType = weapon.system.type?.value ?? "";
  if (wType in WEAPON_TYPE_TO_MAG) return WEAPON_TYPE_TO_MAG[wType];
  if (["biala", "specjalna", "natural"].includes(wType)) return null;

  // Krok 3: martialR / nieznany typ → dedukcja z kalibru
  const ammoType = weapon.flags?.[MODULE_ID]?.mag?.ammoType;
  if (ammoType) {
    // Sprawdź override po ID kalibru
    if (ammoType in CALIBER_ID_OVERRIDE) return CALIBER_ID_OVERRIDE[ammoType];

    // Sprawdź kategorię
    const caliberDef = AMMO_CALIBER_MAP[ammoType];
    if (caliberDef?.category && caliberDef.category in CALIBER_CATEGORY_TO_MAG) {
      return CALIBER_CATEGORY_TO_MAG[caliberDef.category];
    }
  }

  // Krok 4: ostateczny fallback
  return "magazine-short";
}

/* ─────────────────────────────────────────────────────────────────
   Pomocniki
───────────────────────────────────────────────────────────────── */

/**
 * Zwraca liczbę gotowych (załadowanych) magazynków z flag modułu.
 * @param {Item5e} item
 * @returns {number}
 */
function getReadyCount(item) {
  return item.flags?.[MODULE_ID]?.ready ?? 0;
}

/**
 * Czy item jest magazynkiem (consumable ammo z subtype "magazine-*")?
 * @param {Item5e} item
 * @returns {boolean}
 */
export function isMagazineItem(item) {
  return (
    item.type === "consumable" &&
    item.system.type?.value === "ammo" &&
    item.system.type?.subtype?.startsWith("magazine-")
  );
}

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
   Główna funkcja wstrzykiwania
───────────────────────────────────────────────────────────────── */

function _onRenderActorSheetInjectMagazines(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  const inventoryTab = root.querySelector('.tab.inventory')
    ?? root.querySelector('.inventory-element')
    ?? root.querySelector('section[data-tab="inventory"]')
    ?? root.querySelector('div[data-tab="inventory"]');
  if (!inventoryTab) return;

  // Guard — nie wstrzykuj dwa razy
  if (inventoryTab.querySelector('.neuro-add-magazine-btn')) return;

  // Filtruj magazynki (sekcja zawsze widoczna żeby móc dodać pierwszy)
  const magazines = (actor.items || []).filter(isMagazineItem);

  // Akumulatory stopki
  let totalPrice = 0;
  let totalWeightKg = 0;

  const uiList = document.createElement("ul");
  uiList.className = "item-list neuro-magazine-list";
  uiList.style.cssText = "margin-top:0; padding:0; list-style:none;";

  for (const mag of magazines) {
    const qty = mag.system.quantity ?? 0;
    const ready = getReadyCount(mag);
    const weight = mag.system.weight?.value ?? 0;
    const price = mag.system.price?.value ?? 0;
    const subtype = mag.system.type?.subtype ?? "magazine-short";
    const iconSrc = mag.img || MAG_ICONS[subtype] || MAG_ICONS["magazine-short"];

    const wKg = weight * qty;
    totalWeightKg += wKg;
    totalPrice += price * qty;
    const weightStr = wKg < 1 ? Math.round(wKg * 1000) + " g" : wKg.toFixed(2) + " kg";

    // Czy pokazywać kolumnę "Gotowych"? Nie dla kołczanu.
    const showReady = subtype !== "magazine-quiver";

    const iconHtml = `<dnd5e-icon draggable="false" src="${iconSrc}" aria-label="${mag.name}" class="item-image gold-icon" style="--icon-fill: #9f9275"></dnd5e-icon>`;

    const li = document.createElement("li");
    li.className = "item collapsible collapsed";
    li.setAttribute("data-item-id", mag.id);
    li.style.cssText = "list-style:none; margin-bottom:0;";

    li.innerHTML = `
      <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#252830; height:42px; border-bottom:1px dotted #3B3D46; padding:0 5px; color:#cacdd5;">
        <div class="item-name item-action item-tooltip rollable flexrow" role="button" aria-label="${mag.name}" style="flex:2; align-items:center; gap:8px;">
          ${iconHtml}
          <div class="name name-stacked flexcol">
            <span class="title" style="color:#cacdd5; font-weight:500;">${mag.name}</span>
          </div>
        </div>
        <div class="item-detail item-price" style="flex:0 0 80px; text-align:center; display:flex; align-items:center; justify-content:center;">
          <span class="value">${price} gb</span>
        </div>
        <div class="item-detail item-weight" style="flex:0 0 60px; text-align:center; display:flex; align-items:center; justify-content:center;">
          <span class="value">${weightStr}</span>
        </div>
        <div class="item-detail item-quantity" style="flex:0 0 70px; display:flex; align-items:center; justify-content:space-evenly;">
          <a class="adjustment-button always-interactive" data-action="decrease" data-field="qty">
            <i class="fa-solid fa-minus" inert=""></i>
          </a>
          <input type="text" class="always-interactive neuro-qty-input" value="${qty}" placeholder="0"
            data-dtype="Number" inputmode="numeric" pattern="^(\\+|-|=)?\\d*" min="0" aria-label="Ilość">
          <a class="adjustment-button always-interactive" data-action="increase" data-field="qty">
            <i class="fa-solid fa-plus" inert=""></i>
          </a>
        </div>
        <div class="item-detail item-ready" style="flex:0 0 70px; display:flex; align-items:center; justify-content:space-evenly;">
          ${showReady ? `
          <a class="adjustment-button always-interactive" data-action="decrease" data-field="ready">
            <i class="fa-solid fa-minus" inert=""></i>
          </a>
          <input type="text" class="always-interactive neuro-ready-input" value="${ready}" placeholder="0"
            data-dtype="Number" inputmode="numeric" pattern="^(\\+|-|=)?\\d*" min="0" aria-label="Gotowych">
          <a class="adjustment-button always-interactive" data-action="increase" data-field="ready">
            <i class="fa-solid fa-plus" inert=""></i>
          </a>
          ` : `<span style="color:#666; font-size:0.8em;">—</span>`}
        </div>
        <div class="item-detail item-controls always-visible" style="flex:0 0 70px; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
          <button type="button" class="unbutton config-button item-control item-edit" title="Edytuj" style="color:#ccc;">
            <i class="fas fa-edit" inert=""></i>
          </button>
          <button type="button" class="unbutton config-button item-control item-delete" title="Usuń" style="color:#ccc;">
            <i class="fas fa-trash" inert=""></i>
          </button>
        </div>
      </div>
    `;

    // --- Event listenery ---
    const qtyInput = li.querySelector('.neuro-qty-input');
    const readyInput = li.querySelector('.neuro-ready-input');

    // Quantity change
    qtyInput?.addEventListener('change', async (e) => {
      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
      qtyInput.value = val;
      const currentReady = getReadyCount(mag);
      const newReady = Math.min(currentReady, val);  // ready ≤ qty
      await mag.update({ "system.quantity": val, [`flags.${MODULE_ID}.ready`]: newReady });
      if (readyInput) readyInput.value = newReady;
    });

    // Ready change
    readyInput?.addEventListener('change', async (e) => {
      const maxReady = mag.system.quantity ?? 0;
      const val = Math.min(maxReady, Math.max(0, parseInt(e.target.value, 10) || 0));
      readyInput.value = val;
      await mag.update({ [`flags.${MODULE_ID}.ready`]: val });
    });

    // Adjustment buttons
    li.querySelectorAll('.adjustment-button[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const field = btn.dataset.field;
        const isIncrease = btn.dataset.action === 'increase';
        const input = field === 'qty' ? qtyInput : readyInput;
        if (!input) return;
        const current = parseInt(input.value, 10) || 0;
        input.value = Math.max(0, current + (isIncrease ? 1 : -1));
        input.dispatchEvent(new Event('change'));
      });
    });

    // Edit / Delete
    li.querySelector('.item-edit')?.addEventListener('click', () => mag.sheet.render(true));
    li.querySelector('.item-delete')?.addEventListener('click', () => mag.deleteDialog());

    // Ukryj natywne renderowanie (jeśli pojawia się w "Używki")
    const nativeLi = inventoryTab.querySelector(`li[data-item-id="${mag.id}"]`);
    nativeLi?.remove();

    uiList.appendChild(li);
  }

  /* ── Panel (nagłówek + lista) ─────────────────────────────── */
  const panel = document.createElement("div");
  panel.innerHTML = `
    <div class="items-header header flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#471d24; height:30px; border-bottom:2px solid #FFFFFF; color:#FFFFFF; font-size:0.9em; font-weight:bold; padding:0 5px;">
      <h3 class="item-name" style="flex:2; margin:0; padding-left:5px; color:#FFFFFF; font-size:1.1em; text-decoration:none; border:none;">Zapasowe Magazynki</h3>
      <div class="item-header item-price" style="flex:0 0 80px; text-align:center;">Cena</div>
      <div class="item-header item-weight" style="flex:0 0 60px; text-align:center;">Waga</div>
      <div class="item-header item-quantity" style="flex:0 0 70px; text-align:center;">Ilość</div>
      <div class="item-header item-ready" style="flex:0 0 70px; text-align:center;">Gotowych</div>
      <div class="item-header item-controls" style="flex:0 0 70px;"></div>
    </div>
  `;
  panel.appendChild(uiList);

  /* ── Stopka ───────────────────────────────────────────────── */
  const totalWeightFooterStr = totalWeightKg < 1
    ? Math.round(totalWeightKg * 1000) + " g"
    : totalWeightKg.toFixed(2) + " kg";

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex; align-items:center; margin-top:4px; gap:0;";

  const footerBtn = document.createElement("button");
  footerBtn.type = "button";
  footerBtn.className = "neuro-add-magazine-btn";
  footerBtn.innerHTML = `<i class="fas fa-layer-group"></i> DODAJ MAGAZYNEK`;
  footerBtn.style.cssText = "flex:1; text-align:left; padding:4px 12px; background:rgba(45,55,72,0.2); border:1px solid #556270; color:var(--color-text-light-primary); white-space:nowrap;";
  footerBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    _showMagazineDialog(actor);
  });

  const summary = document.createElement("div");
  summary.className = "neuro-magazine-summary";
  summary.style.cssText = "flex:0 0 auto; display:flex; align-items:center; font-size:0.85em; color:var(--color-text-secondary,#aaa);";
  summary.innerHTML = `
    <span style="padding:0 10px; text-align:right;">Cena: <strong style="color:var(--color-text-light-primary,#e0e0e0);">${Math.round(totalPrice)} gb</strong></span>
    <span style="display:inline-block; width:1px; height:16px; background:#556270; margin:0;"></span>
    <span style="padding:0 10px; text-align:right;">Waga: <strong style="color:var(--color-text-light-primary,#e0e0e0);">${totalWeightFooterStr}</strong></span>
  `;

  footer.appendChild(footerBtn);
  footer.appendChild(summary);

  /* ── Wrapper — jeden flex-child w dnd5e-inventory ─────────── */
  const wrapper = document.createElement("div");
  wrapper.appendChild(panel);
  wrapper.appendChild(footer);

  // Wstaw przed sekcją Amunicja lub po .currency
  const ammoWrapper = inventoryTab.querySelector('.neuro-ammo-wrapper');
  if (ammoWrapper) {
    ammoWrapper.before(wrapper);
  } else {
    const currencyHeader = inventoryTab.querySelector('.currency');
    currencyHeader ? currencyHeader.after(wrapper) : inventoryTab.prepend(wrapper);
  }
}

/* ─────────────────────────────────────────────────────────────────
   Dialog "Dodaj Magazynek"
───────────────────────────────────────────────────────────────── */

async function _showMagazineDialog(actor) {
  const typeOptions = MAG_SUBTYPES.map(sub =>
    `<option value="${sub}">${MAG_LABELS[sub]} (${MAG_PRICES[sub]} gb)</option>`
  ).join("");

  const content = `
    <form>
      <div class="form-group">
        <label>Typ</label>
        <div class="form-fields">
          <select name="magSubtype" style="width:100%;">${typeOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label>Ilość</label>
        <div class="form-fields">
          <input type="number" name="quantity" value="2" min="1" max="99">
        </div>
      </div>
      <div class="form-group">
        <label>Gotowych</label>
        <div class="form-fields">
          <input type="number" name="ready" value="2" min="0" max="99">
        </div>
      </div>
      <hr>
      <div style="text-align:center; font-size:1.1em; color:var(--color-text-light-highlight);">
        Waga: <span id="mag-total-weight">0.0</span> kg &nbsp;|&nbsp; Cena: <span id="mag-total-price">0</span> gb
      </div>
    </form>
  `;

  const { DialogV2 } = foundry.applications.api;

  await DialogV2.wait({
    window: { title: "Dodaj Magazynek" },
    content,
    render: (_event, dialogApp) => {
      const root = dialogApp?.element || (dialogApp?.querySelector ? dialogApp : document);
      const typeSelect = root.querySelector('[name="magSubtype"]');
      const qtyInput = root.querySelector('[name="quantity"]');
      const readyInput = root.querySelector('[name="ready"]');
      const weightSpan = root.querySelector('#mag-total-weight');
      const priceSpan = root.querySelector('#mag-total-price');

      function updateTotals() {
        const sub = typeSelect?.value ?? "magazine-short";
        const qty = parseInt(qtyInput?.value) || 0;
        const w = MAG_WEIGHTS[sub] ?? 0.12;
        const p = MAG_PRICES[sub] ?? 10;
        if (weightSpan) weightSpan.textContent = (w * qty).toFixed(2);
        if (priceSpan) priceSpan.textContent = Math.ceil(p * qty);
        // Sync ready max do qty
        if (readyInput) readyInput.max = qty;
      }

      typeSelect?.addEventListener('change', updateTotals);
      qtyInput?.addEventListener('input', updateTotals);
      updateTotals();
    },
    buttons: [
      {
        action: "add",
        icon: "fa-solid fa-check",
        label: "Dodaj",
        callback: async (_event, _button, dialog) => {
          const sub = dialog.element.querySelector('[name="magSubtype"]')?.value;
          const qty = parseInt(dialog.element.querySelector('[name="quantity"]')?.value || "0", 10);
          const ready = Math.min(qty, parseInt(dialog.element.querySelector('[name="ready"]')?.value || "0", 10));
          if (sub && qty > 0) {
            await _addMagazineToActor(actor, sub, qty, ready);
          }
        },
      },
      { action: "cancel", icon: "fa-solid fa-times", label: "Anuluj" },
    ],
  });
}

/* ─────────────────────────────────────────────────────────────────
   Tworzenie / aktualizacja itemu magazynka
───────────────────────────────────────────────────────────────── */

async function _addMagazineToActor(actor, subtype, quantity, ready) {
  // Szukaj istniejącego itemu tego podtypu
  const existing = actor.items.find(
    (i) => isMagazineItem(i) && i.system.type?.subtype === subtype
  );

  if (existing) {
    const newQty = (existing.system.quantity ?? 0) + quantity;
    const newReady = Math.min(newQty, getReadyCount(existing) + ready);
    await existing.update({
      "system.quantity": newQty,
      [`flags.${MODULE_ID}.ready`]: newReady,
    });
    ui.notifications.info(`Zwiększono ilość ${MAG_LABELS[subtype]} do ${newQty}.`);
  } else {
    const itemData = {
      name: MAG_LABELS[subtype],
      type: "consumable",
      img: MAG_ICONS[subtype],
      system: {
        type: { value: "ammo", subtype },
        quantity,
        weight: { value: MAG_WEIGHTS[subtype], units: "kg" },
        price: { value: MAG_PRICES[subtype], denomination: "gp" },
      },
      flags: {
        [MODULE_ID]: { ready },
      },
    };
    await Item.create(itemData, { parent: actor });
    ui.notifications.info(`Dodano ${quantity} szt.: ${MAG_LABELS[subtype]}.`);
  }
}
