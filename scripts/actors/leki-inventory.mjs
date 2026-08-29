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
 */

const MODULE_ID = "neuroshima-2026-overrides";
const WRAPPER_CLASS = "neuro-leki-wrapper";

export function registerLekiInventory() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetInjectLeki);
  }
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
  if (!items.length) return;

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

    const uses = item.system.uses ?? {};
    const doseLabel = uses.max && Number(uses.max) > 1
      ? `${(Number(uses.max) - Number(uses.spent ?? 0))}/${uses.max} dawek`
      : `${qty} szt.`;

    const activity = item.system.activities?.contents?.[0] ?? [...(item.system.activities ?? [])][0];
    const useLabel = activity?.name || "Zażyj";

    const iconHtml = `<dnd5e-icon draggable="false" src="${item.img}" aria-label="${item.name}" class="item-image gold-icon" style="--icon-fill:#9f9275"></dnd5e-icon>`;

    const li = document.createElement("li");
    li.className = "item";
    li.setAttribute("data-item-id", item.id);
    li.style.cssText = "list-style:none; margin-bottom:0;";
    li.innerHTML = `
      <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#1f2a22; min-height:42px; border-bottom:1px dotted #3a4a3d; padding:4px 5px; color:#cacdd5;">
        <div class="item-name item-tooltip flexrow" style="flex:1.8; align-items:center; gap:8px; min-width:180px;">
          ${iconHtml}
          <span class="title" style="color:#cacdd5; font-weight:500;">${item.name}</span>
        </div>
        <div class="item-detail" style="flex:0 0 90px; text-align:center;">${doseLabel}</div>
        <div class="item-detail" style="flex:0 0 70px; text-align:center;">${Math.round(price)} gb</div>
        <div class="item-detail" style="flex:0 0 70px; text-align:center;">${weight < 1 ? Math.round(weight * 1000) + " g" : weight.toFixed(2) + " kg"}</div>
        <div class="item-detail item-controls always-visible" style="flex:0 0 150px; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
          <button type="button" class="unbutton config-button item-control item-take" title="${useLabel}" style="color:#9fd39f;"><i class="fas fa-syringe" inert></i> ${useLabel}</button>
          <button type="button" class="unbutton config-button item-control item-edit" title="Edytuj" style="color:#ccc;"><i class="fas fa-edit" inert></i></button>
          <button type="button" class="unbutton config-button item-control item-delete" title="Usuń" style="color:#ccc;"><i class="fas fa-trash" inert></i></button>
        </div>
      </div>
    `;

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
      <div style="flex:0 0 90px; text-align:center;">Dawki</div>
      <div style="flex:0 0 70px; text-align:center;">Cena</div>
      <div style="flex:0 0 70px; text-align:center;">Waga</div>
      <div style="flex:0 0 150px;"></div>
    </div>
  `;
  panel.appendChild(uiList);

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex; align-items:center; justify-content:flex-end; margin-top:4px; padding:4px 10px; font-size:0.85em; color:var(--color-text-secondary, #aaa);";
  footer.innerHTML = `
    <span style="padding:0 10px;">Cena: <strong style="color:var(--color-text-light-primary, #e0e0e0);">${Math.round(totalPrice)} gb</strong></span>
    <span style="display:inline-block; width:1px; height:16px; background:#3a4a3d; margin:0;"></span>
    <span style="padding:0 10px;">Waga: <strong style="color:var(--color-text-light-primary, #e0e0e0);">${totalWeight < 1 ? Math.round(totalWeight * 1000) + " g" : totalWeight.toFixed(2) + " kg"}</strong></span>
  `;

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
