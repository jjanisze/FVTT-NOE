/**
 * Neuroshima 5e — Prowiant (food/water) inventory panel, in the Zasoby tab.
 *
 * Same relocation pattern as `surowce-inventory.mjs`, matching by
 * `getProwiantCategory()` (loose name regex — see `config/prowiant-data.mjs`
 * for why this isn't a rigid enumerated catalog like Surowce/Grenades).
 *
 * Display-only: sums weight per category and divides by the RAW daily
 * threshold (`Tabele/Zywnosc.md`) to show days of supply. Nothing here
 * applies Wyczerpanie automatically — the GM reads the number and acts on it,
 * same standing rule as everywhere else in this module.
 */

import { PROWIANT_CATEGORIES, getProwiantCategory } from "../config/prowiant-data.mjs";

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
  if (itemsByCat.size === 0) return;

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

  for (const pool of pools) {
    for (const item of pool.items) inventoryTab.querySelector(`li[data-item-id="${item.id}"]`)?.remove();
  }

  const uiList = document.createElement("ul");
  uiList.className = "item-list neuro-prowiant-list";
  uiList.style.cssText = "margin:0; padding:0; list-style:none;";

  for (const pool of pools) {
    const days = pool.cat.dailyThreshold > 0 ? pool.totalKg / pool.cat.dailyThreshold : 0;
    const daysColor = days >= 3 ? "#7fbf6a" : days >= 1 ? "#d8b24a" : "#e06666";

    const li = document.createElement("li");
    li.className = "item";
    li.style.cssText = "list-style:none; margin:0;";
    li.innerHTML = `
      <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#20242c; min-height:42px; border-bottom:1px dotted #363c48; padding:4px 5px; color:#cacdd5;">
        <div class="flexrow" style="flex:1.4; align-items:center; gap:8px; min-width:150px;">
          <span class="fa-stack" style="width:24px; height:24px; --icon-fill:${pool.cat.accent};"><i class="fas fa-circle" style="color:${pool.cat.accent}; opacity:0.18;"></i></span>
          <span class="title" style="color:#cacdd5; font-weight:500;">${pool.cat.label}</span>
        </div>
        <div class="item-detail" style="flex:1.6; font-size:0.85em; color:#9096a3; padding-left:4px;">
          ${pool.items.map(i => `${i.name} ×${i.system.quantity ?? 0}`).join(", ")}
        </div>
        <div class="item-detail" style="flex:0 0 90px; text-align:center; font-variant-numeric:tabular-nums;">${_fmt(pool.totalKg, pool.cat.unit)}</div>
        <div class="item-detail" style="flex:0 0 130px; text-align:center; color:${daysColor}; font-weight:600;">
          ${days.toFixed(1)} dni zapasu
        </div>
      </div>
    `;
    uiList.appendChild(li);
  }

  const panel = document.createElement("div");
  panel.innerHTML = `
    <div class="items-header header flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#242a33; min-height:30px; border-bottom:2px solid #FFFFFF; color:#FFFFFF; font-size:0.9em; font-weight:bold; padding:0 5px;">
      <h3 class="item-name" style="flex:1.4; margin:0; padding-left:5px; color:#FFFFFF; font-size:1.1em; text-decoration:none; border:none;">Prowiant</h3>
      <div style="flex:1.6; padding-left:4px;">Pozycje</div>
      <div style="flex:0 0 90px; text-align:center;">Zapas</div>
      <div style="flex:0 0 130px; text-align:center;">Wystarczy na</div>
    </div>
  `;
  panel.appendChild(uiList);

  const note = document.createElement("div");
  note.style.cssText = "padding:4px 10px; font-size:0.78em; color:var(--color-text-secondary, #888); font-style:italic;";
  note.textContent = "Informacyjne — próg 0,5 kg jedzenia / 2 l wody dziennie (Tabela Żywności). "
    + "Nic tu nie nakłada automatycznie Wyczerpania.";

  const wrapper = document.createElement("div");
  wrapper.className = WRAPPER_CLASS;
  wrapper.appendChild(panel);
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
