import { AMMO_CALIBERS } from "../config/ammo-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export function registerAmmoInventory() {
  for (const hookName of [
    "renderActorSheet",
    "renderCharacterActorSheet",
    "renderNPCActorSheet"
  ]) {
    Hooks.on(hookName, _onRenderActorSheetInjectAmmoButton);
  }

  Hooks.on("preCreateItem", _onPreCreateItemGuardAmmoMistype);

  console.log("Neuroshima 5e | Ammo inventory UI registered");
}

/* ============================================================
 * Guard: ammo landing in inventory as the wrong item type
 * ============================================================
 *
 * The reload system (`_findAmmo` in magazine.mjs) only ever looks at
 * `actor.itemTypes.consumable` with `system.type.value === "ammo"` — anything
 * else is invisible to it no matter how it's named. A world-wide sweep found 10
 * pre-existing items (mostly Roll20-import leftovers) named like ammo
 * ("Amunicja .12 Ga Breneka", "pociski.38spl", ".44Mag ammo", …) but typed as
 * generic "loot", silently unusable for reloading until someone actually tried
 * and got "brak amunicji w ekwipunku" — the mismatch is otherwise undetectable
 * on the sheet, since the loot item still LOOKS like it's there.
 *
 * This intercepts any new item on an actor whose name matches a known caliber
 * but isn't already a properly-tracked ammo consumable, cancels that creation,
 * and redirects to `_addAmmoToActor()` — the exact same construction path the
 * "DODAJ AMUNICJĘ" button uses — so it can never enter the inventory in the
 * wrong slot, regardless of how it got there (compendium drag, hand-typed loot
 * item, macro, compendium-browser drop, …). If the actor already has that
 * caliber tracked, the quantity merges into the existing stack instead of
 * creating a confusing duplicate.
 */
function _onPreCreateItemGuardAmmoMistype(item, data, options, userId) {
  if (game.user.id !== userId) return true; // only the creating client redirects
  if (item.parent?.documentName !== "Actor") return true;
  if (_looksLikeTrackedAmmo(item)) return true;
  if (!["loot", "consumable"].includes(item.type)) return true;

  const caliber = _matchAmmoCaliber(item.name);
  if (!caliber) return true;

  const actor = item.parent;
  const quantity = Number(data?.system?.quantity ?? item.system?.quantity ?? 1) || 1;

  ui.notifications.warn(
    `"${item.name}" wygląda na amunicję (${caliber.label}), ale trafiała do złego slotu (${item.type}) — `
    + `tworzę ją od razu jako śledzoną Amunicję, żeby system przeładowania ją widział.`
  );
  _addAmmoToActor(actor, caliber.id, quantity);

  return false; // cancel the original, wrongly-typed creation
}

function _looksLikeTrackedAmmo(item) {
  return item.type === "consumable" && item.system?.type?.value === "ammo";
}

/** Lowercase, transliterate ł, strip diacritics and all non-alphanumerics. */
function _normalizeAmmoName(str) {
  return (str ?? "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Match a free-typed item name against a known caliber by its short `id`
 * (e.g. "45acp", "12gab", "belt") rather than the full display label — ids are
 * short and distinctive enough to survive the naming drift seen in the wild
 * ("Nabój .45 ACP (2)", "pociski.38spl", ".44Mag ammo") without the false
 * negatives a full-label substring match would produce (e.g. the label
 * ".12 Ga (b – breneka)" normalizes with a doubled "b" that a plain-typed
 * "Breneka" name never reproduces).
 */
function _matchAmmoCaliber(name) {
  const norm = _normalizeAmmoName(name);
  if (!norm) return null;
  return AMMO_CALIBERS.find(c => norm.includes(_normalizeAmmoName(c.id))) ?? null;
}

function _onRenderActorSheetInjectAmmoButton(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  // Znajdź przyciski/nagłówki w zakładce inwentarza. 
  // Różni się dla dnd5e v2 (stary arkusz) i v3/v4 (nowy arkusz).
  const inventoryTab = root.querySelector('.tab.inventory') 
    ?? root.querySelector('.inventory-element') 
    ?? root.querySelector('section[data-tab="inventory"]')
    ?? root.querySelector('div[data-tab="inventory"]');
  if (!inventoryTab) return;

  // Sprawdź, czy przycisk już nie istnieje (żeby nie pętlić)
  if (inventoryTab.querySelector('.neuro-add-ammo-btn')) return;

  // Akumulatory do stopki
  let totalPrice = 0;
  let totalWeightKg = 0;

  // Pobierz wszystkie przedmioty typu "ammo" i zbij je do stringa UI, usunąwszy je wpierw z głównej listy "Używek" (jeśli system tak renderuje). 
  // Na szczęście modyfikacja DOMu pozwala nam przestawić wyrenderowane li-Itemy.
  
  const uiList = document.createElement("ul");
  uiList.className = "item-list neuro-ammo-list";
  uiList.style.marginTop = "0";
  uiList.style.padding = "0";
  uiList.style.listStyle = "none"; // 1) Pozbywamy się kropki na liście

  // Wyklucz magazynki i granaty — obsługują je osobne sekcje.
  const customAmmoArr = (actor.items || []).filter(i =>
    i.type === "consumable" &&
    i.system.type?.value === "ammo" &&
    !i.system.type?.subtype?.startsWith("magazine-") &&
    !i.system.type?.subtype?.startsWith("grenade-")
  );

  for (let am of customAmmoArr) {
     const qty = am.system.quantity ?? 0;
     // W DnD5e v3 waga to obiekt { value: 0.012, units: 'kg' }
     const weight = am.system.weight?.value ?? am.system.weight ?? 0;
     const price = am.system.price?.value ?? 0;
     
     // Obliczanie wagi. Jeśli poniżej 1 kg, pokazujemy w gramach. Rezygnujemy z .toFixed() by wyświetlać czytelnie pełne wartości gramów
     let weightStr = "0 g";
     if (!isNaN(weight)) {
        const wKg = weight * qty;
        weightStr = wKg < 1 ? Math.round(wKg * 1000) + " g" : wKg.toFixed(2) + " kg";
        totalWeightKg += wKg;
     }
     totalPrice += price * qty;
     
     // Znajdź formułę obrażeń w AMMO_CALIBERS
     const subtype = am.system.type?.subtype;
     const caliberInfo = AMMO_CALIBERS.find(c => c.id === subtype);
     const damage = caliberInfo?.formula ? caliberInfo.formula : "—";

     // Złota ikona dnd5e
     const iconHtml = `<dnd5e-icon draggable="false" src="${am.img}" aria-label="${am.name}" class="item-image gold-icon" style="--icon-fill: #9f9275"></dnd5e-icon>`;

     // Stwórz wpis dla tej amunicji
     const li = document.createElement("li");
     li.className = "item collapsible collapsed";
     li.setAttribute("data-item-id", am.id);
     li.style.listStyle = "none";
     li.style.marginBottom = "0";
     li.innerHTML = `
        <div class="item-row flexrow" style="display: flex; align-items: center; justify-content: space-between; background-color: #252830; height: 42px; border-bottom: 1px dotted #3B3D46; padding: 0 5px; color: #cacdd5;">
            <div class="item-name item-action item-tooltip rollable flexrow" role="button" aria-label="${am.name}" style="flex: 2; min-width: 0; align-items: center; gap: 8px;">
                ${iconHtml}
                <div class="name name-stacked flexcol" style="min-width: 0;">
                    <span class="title" title="${am.name}" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cacdd5; font-weight: 500;">${am.name}</span>
                </div>
            </div>
            <div class="item-detail item-price" data-column-id="price" style="flex: 0 0 80px; text-align: center; display: flex; align-items: center; justify-content: center;">
                <span class="value">${price} gb</span>
            </div>
            <div class="item-detail item-weight" data-column-id="weight" style="flex: 0 0 60px; text-align: center; display: flex; align-items: center; justify-content: center;">
                <span class="value">${weightStr}</span>
            </div>
            <div class="item-detail item-quantity" data-column-id="quantity" style="flex: 0 0 70px; display: flex; align-items: center; justify-content: space-evenly;">
                <a class="adjustment-button always-interactive" data-action="decrease" data-property="system.quantity">
                    <i class="fa-solid fa-minus" inert=""></i>
                </a>
                <input type="text" class="always-interactive" value="${qty}" placeholder="0" data-dtype="Number" data-name="system.quantity" inputmode="numeric" pattern="^(\\+|-|=)?\\d*" min="0" aria-label="Ilość">
                <a class="adjustment-button always-interactive" data-action="increase" data-property="system.quantity">
                    <i class="fa-solid fa-plus" inert=""></i>
                </a>
            </div>
            <div class="item-detail item-damage" data-column-id="damage" style="flex: 0 0 70px; text-align: center; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #e67575;">
                <span class="value">${damage}</span>
            </div>
            <div class="item-detail item-controls always-visible" data-column-id="controls" style="flex: 0 0 70px; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                <button type="button" class="unbutton config-button item-control item-edit" title="Edytuj" style="color: #ccc;">
                    <i class="fas fa-edit" inert=""></i>
                </button>
                <button type="button" class="unbutton config-button item-control item-delete" title="Usuń" style="color: #ccc;">
                    <i class="fas fa-trash" inert=""></i>
                </button>
            </div>
        </div>
     `;
     
     // Event Listenery
     const qtyInput = li.querySelector('input[data-name="system.quantity"]');
     qtyInput.addEventListener('change', async (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) await am.update({ "system.quantity": val });
     });
     li.querySelectorAll('.adjustment-button[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
           e.preventDefault();
           const action = btn.dataset.action;
           const min = qtyInput.min !== "" ? Number(qtyInput.min) : -Infinity;
           const current = Number(qtyInput.value) || 0;
           qtyInput.value = Math.max(min, current + (action === 'increase' ? 1 : -1));
           qtyInput.dispatchEvent(new Event('change'));
        });
     });
     li.querySelector('.item-edit').addEventListener('click', () => am.sheet.render(true));
     li.querySelector('.item-delete').addEventListener('click', () => am.deleteDialog());

     uiList.appendChild(li);

     // Usuń go z listy natywnej (żeby nie było podwójnego wyświetlania w "Używki").
     // remove() zamiast display:none — natywny wiersz i tak jest odbudowywany przy
     // każdym renderze, a usunięcie odchudza DOM arkusza.
     const nativeLi = inventoryTab.querySelector(`li[data-item-id="${am.id}"]`);
     nativeLi?.remove();
  }

  // Stwórz panel Ammo wzorowany na oryginalnym dnd5e
  const panel = document.createElement("div");
  panel.innerHTML = `
     <div class="items-header header flexrow" style="display:flex; align-items: center; justify-content: space-between; background-color: #471d24; height: 30px; border-bottom: 2px solid #FFFFFF; color: #FFFFFF; font-size: 0.9em; font-weight: bold; padding: 0 5px;">
        <h3 class="item-name" style="flex: 2; margin: 0; padding-left: 5px; color: #FFFFFF; font-size: 1.1em; text-decoration: none; border: none;">Amunicja</h3>
        <div class="item-header item-price" data-column-id="price" style="flex: 0 0 80px; text-align: center;">Cena</div>
        <div class="item-header item-weight" data-column-id="weight" style="flex: 0 0 60px; text-align: center;">Waga</div>
        <div class="item-header item-quantity" data-column-id="quantity" style="flex: 0 0 70px; text-align: center;">Ilość</div>
        <div class="item-header item-damage" data-column-id="damage" style="flex: 0 0 70px; text-align: center;">Obrażenia</div>
        <div class="item-header item-controls" data-column-id="controls" style="flex: 0 0 70px;"></div>
     </div>
  `;
  panel.appendChild(uiList);

  // Stopka: guzik + podsumowanie łącznej ceny i wagi
  const totalWeightFooterStr = totalWeightKg < 1
    ? Math.round(totalWeightKg * 1000) + " g"
    : totalWeightKg.toFixed(2) + " kg";

  const footer = document.createElement("div");
  footer.style.cssText = "display: flex; align-items: center; margin-top: 4px; gap: 0;";

  const footerBtn = document.createElement("button");
  footerBtn.type = "button";
  footerBtn.className = "neuro-add-ammo-btn";
  footerBtn.innerHTML = `<i class="fas fa-box-open"></i> DODAJ AMUNICJĘ`;
  footerBtn.style.cssText = "flex: 1; text-align: left; padding: 4px 12px; background: rgba(45,55,72,0.2); border: 1px solid #556270; color: var(--color-text-light-primary); white-space: nowrap;";
  footerBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    _showAmmoDialog(actor);
  });

  const summary = document.createElement("div");
  summary.className = "neuro-ammo-summary";
  summary.style.cssText = "flex: 0 0 auto; display: flex; align-items: center; font-size: 0.85em; color: var(--color-text-secondary, #aaa);";
  summary.innerHTML = `
    <span style="padding: 0 10px; text-align: right;">Cena: <strong style="color: var(--color-text-light-primary, #e0e0e0);">${Math.round(totalPrice)} gb</strong></span>
    <span style="display: inline-block; width: 1px; height: 16px; background: #556270; margin: 0;"></span>
    <span style="padding: 0 10px; text-align: right;">Waga: <strong style="color: var(--color-text-light-primary, #e0e0e0);">${totalWeightFooterStr}</strong></span>
  `;

  footer.appendChild(footerBtn);
  footer.appendChild(summary);

  // Wrapper — jeden flex-child w dnd5e-inventory, eliminuje 16px gap między panelem a przyciskiem
  const wrapper = document.createElement("div");
  wrapper.className = "neuro-ammo-wrapper";
  wrapper.appendChild(panel);
  wrapper.appendChild(footer);

  const currencyHeader = inventoryTab.querySelector('.currency');
  if (currencyHeader) {
    currencyHeader.after(wrapper);
  } else {
    inventoryTab.prepend(wrapper);
  }
}

async function _showAmmoDialog(actor) {
  const options = AMMO_CALIBERS.map(c => 
    `<option value="${c.id}">${c.label} (${c.price} gb)</option>`
  ).join("");

  const costs = Object.fromEntries(
    AMMO_CALIBERS.map(c => [c.id, { price: c.price, weight: c.weight || 0.02 }])
  );

  const content = `
    <form>
      <div class="form-group">
        <label>Kaliber</label>
        <div class="form-fields">
          <select name="ammoId" style="width: 100%;">
            ${options}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Sztuk</label>
        <div class="form-fields">
          <input type="number" name="quantity" value="20" min="1" max="999">
        </div>
      </div>
      <hr>
      <div style="text-align: center; font-size: 1.1em; color: var(--color-text-light-highlight);">
        Waga: <span id="ammo-total-weight">0.0</span> kg &nbsp; | &nbsp; Cena: <span id="ammo-total-price">0</span> gb
      </div>
    </form>
  `;

  // Używamy V2 Application Framework - DialogV2
  const { DialogV2 } = foundry.applications.api;

  await DialogV2.wait({
    window: { title: "Dodaj Amunicję" },
    content: content,
    render: (event, dialogApp) => {
      // W V2 framework, drugi argument nierzadko zwraca instancję aplikacji, więc wyłuskujemy element HTML:
      const root = dialogApp?.element || (dialogApp?.querySelector ? dialogApp : document);
      
      const ammoSelect = root.querySelector('select[name="ammoId"]');
      const qtyInput = root.querySelector('input[name="quantity"]');
      const weightSpan = root.querySelector('#ammo-total-weight');
      const priceSpan = root.querySelector('#ammo-total-price');

      function updateTotals() {
        const selected = costs[ammoSelect.value];
        const qty = parseInt(qtyInput.value) || 0;
        if(selected && weightSpan && priceSpan) {
          weightSpan.textContent = (selected.weight * qty).toFixed(2);
          priceSpan.textContent = Math.ceil(selected.price * qty); 
        }
      }
      
      if(ammoSelect) ammoSelect.addEventListener('change', updateTotals);
      if(qtyInput) qtyInput.addEventListener('input', updateTotals);
      updateTotals();
    },
    buttons: [
      {
        action: "add",
        icon: "fa-solid fa-check",
        label: "Dodaj",
        callback: async (event, button, dialog) => {
          const ammoId = dialog.element.querySelector('[name="ammoId"]')?.value;
          const quantity = parseInt(dialog.element.querySelector('[name="quantity"]')?.value || "0", 10);
          if (ammoId && quantity > 0) {
            await _addAmmoToActor(actor, ammoId, quantity);
          }
        }
      },
      {
        action: "cancel",
        icon: "fa-solid fa-times",
        label: "Anuluj"
      }
    ]
  });
}

async function _addAmmoToActor(actor, ammoId, quantity) {
  const caliber = AMMO_CALIBERS.find(c => c.id === ammoId);
  if (!caliber) return;

  // Zbudujmy ItemDnd5e
  // Sprawdź czy aktor ma już ten podtyp amunicji
  const existing = actor.items.find(i => 
    i.type === "consumable" && 
    i.system.type?.value === "ammo" && 
    i.system.type?.subtype === caliber.id
  );

  if (existing) {
    // Zwiększ quantity
    const newQty = (existing.system.quantity ?? 0) + quantity;
    await existing.update({ "system.quantity": newQty });
    ui.notifications.info(`Zwiększono ilość ${caliber.label} do ${newQty}.`);
  } else {
    // Ikona: bierzemy wprost z katalogu (ammo-data.mjs's `AMMO_CALIBERS[].icon` — dokładnie po to
    // ten pole tam jest udokumentowane: "Used when programmatically creating ammo items…").
    // Był tu wcześniej osobny, ręcznie utrzymywany fileMap z dokładnie tymi samymi wartościami
    // dla każdego istniejącego kalibru — czysty risk dryfu (każdy nowy kaliber w AMMO_CALIBERS,
    // który ktoś zapomni dopisać tutaj, cicho dostawałby ikonę 9 mm zamiast własnej). Usunięty
    // przy okazji dodawania kalibru "race" (Pistolet na Race), zamiast dopisywać go do dwóch miejsc.
    const iconFilename = caliber.icon || "ammo_9_mm.svg";

    // Utwórz nowy
    const itemData = {
      name: caliber.label,
      type: "consumable",
      img: `modules/${MODULE_ID}/icons/ammo/${iconFilename}`,
      system: {
        type: {
          value: "ammo",
          subtype: caliber.id
        },
        quantity: quantity,
        weight: {
          value: caliber.weight || 0.02,
          units: "kg"
        },
        price: {
          value: caliber.price,
          denomination: "gp" // Traktujemy gp jako gb (gamble)
        },
        description: {
          value: caliber.note ? `<p>${caliber.note}</p>` : ""
        }
      }
    };

    await Item.create(itemData, { parent: actor });
    ui.notifications.info(`Dodano ${quantity} szt. amunicji ${caliber.label}.`);
  }
}

