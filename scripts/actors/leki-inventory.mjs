/**
 * Neuroshima 5e — Leki (Chemia) inventory panel, in the Zasoby tab.
 *
 * Pulls every real `lekarstwo` item (`system.type.value === "lekarstwo"`, the type
 * `chemiaItemData()` builds — see `config/chemia-data.mjs` / `items/chemia.mjs`) out
 * of the generic Używki list and renders them as their own panel, same relocation
 * pattern as `grenade-inventory.mjs`/`surowce-inventory.mjs`. "Zażyj" fires the
 * item's own activity through the native pipeline (not `neuroSilent` — this is a
 * fresh explicit click, not a duplicate of some other button), so dosing, effects,
 * autoDestroy and the chat-card flavour line all behave exactly as they do from the
 * native inventory row. Uses left / doses per package still come straight off
 * `system.uses`, nothing here tracks state of its own.
 *
 * Like every Zasoby panel it renders even when empty and ends with a „DODAJ …” button:
 * `oknoDodajLek` picks from the chemia catalogue (grouped by subtype) and `addLekToActor`
 * merges into the existing stack by `chemiaKey`, the same way ammo and Prowiant do.
 */

import { handyToggleHtml, bindHandyToggle, registerHandyFamily } from "./handy-items.mjs";
import { CHEMIA, CHEMIA_SUBTYPES, chemiaItemData } from "../config/chemia-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const WRAPPER_CLASS = "neuro-leki-wrapper";

export function registerLekiInventory() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetInjectLeki);
  }
  // Pasek przedmiotów podręcznych: klik w kafelek = „Zażyj" z wiersza; podpis = dawki
  // w otwartym opakowaniu, gdy jest ich więcej niż jedna.
  registerHandyFamily("medicine", {
    use: async item => {
      const act = item.system.activities?.contents?.[0] ?? [...(item.system.activities ?? [])][0];
      if (act) return act.use({}, { configure: false }, {});
      return item.use?.({}, { configure: false });
    },
    caption: item => {
      const uses = item.system.uses ?? {};
      return Number(uses.max) > 1 ? `${Number(uses.max) - Number(uses.spent ?? 0)}/${uses.max}` : "";
    }
  });
  console.log("Neuroshima 5e | Leki (Chemia) inventory UI registered");
}

function _isChemiaItem(item) {
  return item.type === "consumable" && item.system.type?.value === "lekarstwo";
}

function _onRenderActorSheetInjectLeki(app, html) {
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

  if (inventoryTab.querySelector(`.${WRAPPER_CLASS}`)) return; // one render pass, one panel

  const items = (actor.items || []).filter(_isChemiaItem);

  let totalWeight = 0;
  let totalPrice = 0;

  const uiList = document.createElement("ul");
  uiList.className = "item-list neuro-leki-list";
  uiList.style.cssText = "margin-top:0; padding:0; list-style:none;";

  for (const item of items) {
    const qty = item.system.quantity ?? 1;
    const weight = (item.system.weight?.value ?? 0) * qty;
    const price = (item.system.price?.value ?? 0) * qty;
    totalWeight += weight;
    totalPrice += price;

    // Units are fungible — every per-dose state (daily doses, tolerance, pending effects) lives
    // on the actor — so quantity is a plain stack count, same as Prowiant. Only a multi-dose
    // package has something worth showing beyond it: what's left in the open one.
    const uses = item.system.uses ?? {};
    const doseLine = Number(uses.max) > 1
      ? `<span class="neuro-leki-doses" style="font-size:0.8em; color:#8fa892;">${Number(uses.max) - Number(uses.spent ?? 0)}/${uses.max} dawek w opak.</span>`
      : "";

    const activity = item.system.activities?.contents?.[0] ?? [...(item.system.activities ?? [])][0];
    const useLabel = activity?.name || "Zażyj";

    const iconHtml = `<dnd5e-icon draggable="false" src="${item.img}" aria-label="${item.name}" class="item-image gold-icon" style="--icon-fill:#9f9275"></dnd5e-icon>`;

    const li = document.createElement("li");
    li.className = "item";
    li.setAttribute("data-item-id", item.id);
    li.style.cssText = "list-style:none; margin-bottom:0;";
    li.innerHTML = `
      <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#1f2a22; min-height:42px; border-bottom:1px dotted #3a4a3d; padding:4px 5px; color:#cacdd5;">
        <div class="item-name item-tooltip flexrow" style="flex:1.8; align-items:center; gap:8px; min-width:150px;">
          ${iconHtml}
          <div style="display:flex; flex-direction:column; line-height:1.2;">
            <span class="title" style="color:#cacdd5; font-weight:500;">${item.name}</span>
            ${doseLine}
          </div>
        </div>
        <div class="item-detail" style="flex:0 0 70px; text-align:center;">${Math.round(price)} gb</div>
        <div class="item-detail" style="flex:0 0 70px; text-align:center;">${weight < 1 ? Math.round(weight * 1000) + " g" : weight.toFixed(2) + " kg"}</div>
        <div class="item-detail item-quantity" style="flex:0 0 90px; display:flex; align-items:center; justify-content:space-evenly;">
          <a class="adjustment-button always-interactive" data-action="decrease"><i class="fa-solid fa-minus" inert></i></a>
          <input type="text" class="always-interactive neuro-leki-qty" value="${qty}" placeholder="0"
            data-dtype="Number" inputmode="numeric" pattern="^(\\+|-|=)?\\d*" min="0" aria-label="Ilość" style="width:36px; text-align:center;">
          <a class="adjustment-button always-interactive" data-action="increase"><i class="fa-solid fa-plus" inert></i></a>
        </div>
        <div class="item-detail item-controls always-visible" style="flex:0 0 100px; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
          ${handyToggleHtml(item)}
          <button type="button" class="unbutton config-button item-control item-take" title="${useLabel}" style="color:#9fd39f;"><i class="fas fa-syringe" inert></i></button>
          <button type="button" class="unbutton config-button item-control item-edit" title="Edytuj" style="color:#ccc;"><i class="fas fa-edit" inert></i></button>
          <button type="button" class="unbutton config-button item-control item-delete" title="Usuń" style="color:#ccc;"><i class="fas fa-trash" inert></i></button>
        </div>
      </div>
    `;

    bindHandyToggle(li, item);

    const input = li.querySelector(".neuro-leki-qty");
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

    li.querySelector(".item-take").addEventListener("click", async ev => {
      ev.preventDefault();
      const act = item.system.activities?.contents?.[0] ?? [...(item.system.activities ?? [])][0];
      if (act) await act.use({}, { configure: false }, {});
      else await item.use?.({}, { configure: false });
    });
    li.querySelector(".item-edit").addEventListener("click", () => item.sheet.render(true));
    li.querySelector(".item-delete").addEventListener("click", () => item.deleteDialog());

    uiList.appendChild(li);

    inventoryTab.querySelector(`li[data-item-id="${item.id}"]`)?.remove();
  }

  const panel = document.createElement("div");
  panel.innerHTML = `
    <div class="items-header header flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#1f3324; min-height:30px; border-bottom:2px solid #FFFFFF; color:#FFFFFF; font-size:0.9em; font-weight:bold; padding:0 5px;">
      <h3 class="item-name" style="flex:1.8; margin:0; padding-left:5px; color:#FFFFFF; font-size:1.1em; text-decoration:none; border:none;">Leki</h3>
      <div style="flex:0 0 70px; text-align:center;">Cena</div>
      <div style="flex:0 0 70px; text-align:center;">Waga</div>
      <div style="flex:0 0 90px; text-align:center;">Ilość</div>
      <div style="flex:0 0 100px;"></div>
    </div>
  `;
  panel.appendChild(uiList);

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex; align-items:center; margin-top:4px; gap:0; font-size:0.85em; color:var(--color-text-secondary, #aaa);";
  footer.innerHTML = `
    <button type="button" class="neuro-add-leki-btn" style="flex:1; text-align:left; padding:4px 12px; background:rgba(31,51,36,0.35); border:1px solid #3a4a3d; color:var(--color-text-light-primary, #e0e0e0); white-space:nowrap; font-size:var(--font-size-13, 13px);">
      <i class="fas fa-pills"></i> DODAJ LEK
    </button>
    <span style="padding:0 10px;">Cena: <strong style="color:var(--color-text-light-primary, #e0e0e0);">${Math.round(totalPrice)} gb</strong></span>
    <span style="display:inline-block; width:1px; height:16px; background:#3a4a3d; margin:0;"></span>
    <span style="padding:0 10px;">Waga: <strong style="color:var(--color-text-light-primary, #e0e0e0);">${totalWeight < 1 ? Math.round(totalWeight * 1000) + " g" : totalWeight.toFixed(2) + " kg"}</strong></span>
  `;

  footer.querySelector(".neuro-add-leki-btn").addEventListener("click", ev => {
    ev.preventDefault();
    oknoDodajLek(actor);
  });

  const wrapper = document.createElement("div");
  wrapper.className = WRAPPER_CLASS;
  wrapper.appendChild(panel);
  wrapper.appendChild(footer);

  const grenadeWrapper = inventoryTab.querySelector(".neuro-grenade-wrapper");
  if (grenadeWrapper) grenadeWrapper.after(wrapper);
  else {
    const ammoWrapper = inventoryTab.querySelector(".neuro-ammo-wrapper");
    if (ammoWrapper) ammoWrapper.before(wrapper);
    else inventoryTab.prepend(wrapper);
  }
}

/* -------------------------------------------- */
/*  Dodawanie                                   */
/* -------------------------------------------- */

/** Pozycje katalogu, które trafiają do panelu Leki (bez „inne” — proch i nitrogliceryna to materiały). */
function _katalogLekow() {
  return Object.entries(CHEMIA).filter(([, def]) => (def.itemType ?? "consumable") === "consumable");
}

/**
 * Dodaj lek do ekwipunku aktora, scalając ze stosem o tym samym `chemiaKey`.
 * @param {Actor} actor
 * @param {string} key       klucz z `CHEMIA`
 * @param {number} quantity
 */
export async function addLekToActor(actor, key, quantity) {
  const def = CHEMIA[key];
  if (!def || !(quantity > 0)) return null;
  const existing = actor.items.find(i => _isChemiaItem(i) && i.getFlag(MODULE_ID, "chemiaKey") === key);
  if (existing) {
    const next = (existing.system.quantity ?? 0) + quantity;
    await existing.update({ "system.quantity": next });
    ui.notifications.info(`${existing.name}: ${next} szt.`);
    return existing;
  }
  const [created] = await actor.createEmbeddedDocuments("Item", [chemiaItemData(key, { quantity })]);
  ui.notifications.info(`Dodano ${quantity} × ${def.label}.`);
  return created;
}

/** „Dodaj lek” — katalog chemii pogrupowany jak w arkuszu przedmiotu, z ceną i wagą na żywo. */
export async function oknoDodajLek(actor) {
  if (!actor) return null;
  const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
  const katalog = _katalogLekow();
  const grupy = Object.entries(CHEMIA_SUBTYPES).map(([sub, label]) => {
    const opcje = katalog.filter(([, d]) => d.subtype === sub)
      .map(([k, d]) => `<option value="${k}">${esc(d.label)} — ${d.price} gb, dost. ${d.availability}%</option>`).join("");
    return opcje ? `<optgroup label="${esc(label)}">${opcje}</optgroup>` : "";
  }).join("");
  const content = `
    <div class="form-group">
      <label>Pozycja</label>
      <div class="form-fields"><select name="key" style="flex:1;">${grupy}</select></div>
    </div>
    <div class="form-group">
      <label>Sztuk</label>
      <div class="form-fields"><input type="number" name="qty" value="1" min="1" step="1" style="flex:1;"></div>
    </div>
    <hr>
    <div style="text-align:center;">Waga: <strong class="neuro-lek-waga">0 g</strong> · Cena: <strong class="neuro-lek-cena">0</strong> gb</div>`;

  const wynik = await foundry.applications.api.DialogV2.wait({
    window: { title: "Dodaj lek", icon: "fa-solid fa-pills" },
    position: { width: 440 },
    content,
    render: (_ev, dialog) => {
      const form = dialog.element.querySelector("form");
      const przelicz = () => {
        const d = CHEMIA[form.elements.key.value];
        const qty = Math.max(0, parseInt(form.elements.qty.value, 10) || 0);
        const kg = (d?.weight ?? 0) * qty;
        form.querySelector(".neuro-lek-waga").textContent = kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg.toFixed(2)} kg`;
        form.querySelector(".neuro-lek-cena").textContent = Math.round((d?.price ?? 0) * qty);
      };
      form.addEventListener("input", przelicz);
      form.addEventListener("change", przelicz);
      przelicz();
    },
    buttons: [
      {
        action: "add", icon: "fa-solid fa-check", label: "Dodaj", default: true,
        callback: (_ev, button) => ({
          key: button.form.elements.key.value,
          qty: Math.max(1, parseInt(button.form.elements.qty.value, 10) || 1)
        })
      },
      { action: "cancel", icon: "fa-solid fa-times", label: "Anuluj" }
    ],
    rejectClose: false
  });
  if (!wynik?.key) return null;
  return addLekToActor(actor, wynik.key, wynik.qty);
}
