import { SUROWCE_TYPES, getSurowiecType } from "../config/surowce-data.mjs";

/**
 * Neuroshima 5e — Surowce inventory panel.
 *
 * Pulls the five raw-material types (CH, CE, CZ, MK, MO) out of the generic
 * "Używki" list and renders them as labelled resource pools on the inventory
 * tab — one row per material type, showing a weight bar, total weight and a
 * total count. Each pool keeps full item functionality reachable: quantity
 * editing, Wyświetl w czacie, Wyposaż, Ulubione, edycja, usunięcie and a
 * rozwiń/zwiń opis. The native rows are hidden so nothing is duplicated.
 */

const WRAPPER_CLASS = "neuro-surowce-wrapper";

export function registerSurowceInventory() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetInjectSurowce);
  }
  console.log("Neuroshima 5e | Surowce inventory UI registered");
}

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/** Weight-unit → kilograms conversion factors (physical, not dnd5e's simplified). */
const TO_KG = Object.freeze({ kg: 1, g: 0.001, Mg: 1000, lb: 0.45359237, tn: 907.18474 });

/** Convert a weight value in the given dnd5e unit to kilograms. */
function _weightToKg(value, units) {
  const v = isNaN(value) ? 0 : Number(value);
  return v * (TO_KG[units] ?? 1);
}

/** Item weight in kg (handles v3 `{value, units}` objects and bare numbers). */
function _itemWeightKg(item) {
  const w = item.system.weight;
  const value = w?.value ?? (typeof w === "number" ? w : 0);
  const units = w?.units ?? "kg";
  return _weightToKg(value, units);
}

/** Format a kilogram amount as grams (<1 kg) or kilograms. */
function _fmtWeight(kg) {
  if (!kg) return "0 g";
  return kg < 1 ? Math.round(kg * 1000) + " g" : kg.toFixed(2) + " kg";
}

/* -------------------------------------------- */
/*  Rendering                                   */
/* -------------------------------------------- */

function _onRenderActorSheetInjectSurowce(app, html) {
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

  // Guard against the multiple render hooks firing for one render pass.
  if (inventoryTab.querySelector(`.${WRAPPER_CLASS}`)) return;

  // Collect surowce, grouped by type code; only inject when the actor has any.
  const itemsByCode = new Map();
  for (const item of actor.items || []) {
    const type = getSurowiecType(item);
    if (!type) continue;
    if (!itemsByCode.has(type.code)) itemsByCode.set(type.code, []);
    itemsByCode.get(type.code).push(item);

    // Usuń natywny wiersz z "Używek", aby uniknąć duplikacji. remove() zamiast
    // display:none — natywny wiersz jest odbudowywany przy każdym renderze.
    const nativeLi = inventoryTab.querySelector(`li[data-item-id="${item.id}"]`);
    nativeLi?.remove();
  }
  if (itemsByCode.size === 0) return;

  // Per-type totals, in canonical order. Empty types render as 0 pools so the
  // full set of resources is visible at a glance.
  const pools = SUROWCE_TYPES.map(type => {
    const items = itemsByCode.get(type.code) ?? [];
    let totalQty = 0;
    let totalKg = 0;
    for (const it of items) {
      const qty = Number(it.system.quantity ?? 0);
      totalQty += qty;
      totalKg += _itemWeightKg(it) * qty;
    }
    return { type, items, totalQty, totalKg };
  });

  const maxKg = Math.max(...pools.map(p => p.totalKg), 0.0001);

  const uiList = document.createElement("ul");
  uiList.className = "item-list neuro-surowce-list";
  uiList.style.cssText = "margin:0; padding:0; list-style:none;";

  for (const pool of pools) {
    if (pool.items.length <= 1) {
      // Normal case: the pool maps directly to a single item (or is empty).
      uiList.appendChild(_buildPoolRow(actor, pool, maxKg));
    } else {
      // Rare case: several stacks of one material — show the pooled total,
      // then each backing stack as its own editable sub-row.
      uiList.appendChild(_buildPoolRow(actor, pool, maxKg, { readOnly: true }));
      for (const item of pool.items) {
        uiList.appendChild(_buildItemSubRow(actor, pool.type, item));
      }
    }
  }

  // Section header.
  const panel = document.createElement("div");
  panel.innerHTML = `
    <div class="items-header header flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#2a3326; min-height:30px; border-bottom:2px solid #FFFFFF; color:#FFFFFF; font-size:0.9em; font-weight:bold; padding:0 5px;">
      <h3 class="item-name" style="flex:1.6; margin:0; padding-left:5px; color:#FFFFFF; font-size:1.1em; text-decoration:none; border:none;">Surowce</h3>
      <div style="flex:2; text-align:left; padding-left:8px;">Zapas (waga)</div>
      <div style="flex:0 0 90px; text-align:center;">Ilość</div>
      <div style="flex:0 0 132px;"></div>
    </div>
  `;
  panel.appendChild(uiList);

  // Footer: transfer-to-vehicle action + totals summary.
  const grandKg = pools.reduce((s, p) => s + p.totalKg, 0);
  const grandQty = pools.reduce((s, p) => s + p.totalQty, 0);

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex; align-items:center; justify-content:space-between; margin-top:4px; gap:0;";

  const transferBtn = document.createElement("button");
  transferBtn.type = "button";
  transferBtn.className = "neuro-surowce-transfer-btn";
  transferBtn.title = "Przenieś surowce do zaznaczonego pojazdu (w zasięgu 5 m)";
  transferBtn.innerHTML = `<i class="fas fa-truck-ramp-box"></i> PRZEKAŻ DO POJAZDU`;
  transferBtn.style.cssText = "flex:0 0 auto; text-align:left; padding:4px 12px; background:rgba(42,51,38,0.35); border:1px solid #5f7d52; color:var(--color-text-light-primary); white-space:nowrap; cursor:pointer;";
  transferBtn.addEventListener("click", (ev) => { ev.preventDefault(); _transferToVehicle(actor); });

  const summary = document.createElement("div");
  summary.style.cssText = "flex:0 0 auto; display:flex; align-items:center; font-size:0.85em; color:var(--color-text-secondary, #aaa);";
  summary.innerHTML = `
    <span style="padding:0 10px;">Łącznie sztuk: <strong style="color:var(--color-text-light-primary, #e0e0e0);">${grandQty}</strong></span>
    <span style="display:inline-block; width:1px; height:16px; background:#5f7d52; margin:0;"></span>
    <span style="padding:0 10px;">Waga: <strong style="color:var(--color-text-light-primary, #e0e0e0);">${_fmtWeight(grandKg)}</strong></span>
  `;

  footer.appendChild(transferBtn);
  footer.appendChild(summary);

  const wrapper = document.createElement("div");
  wrapper.className = WRAPPER_CLASS;
  wrapper.appendChild(panel);
  wrapper.appendChild(footer);

  // Place after the other custom Neuroshima sections, otherwise after currency.
  const anchor = inventoryTab.querySelector(".neuro-ammo-wrapper")
    ?? inventoryTab.querySelector(".neuro-magazine-wrapper")
    ?? inventoryTab.querySelector(".neuro-grenade-wrapper");
  if (anchor) anchor.after(wrapper);
  else {
    const currencyHeader = inventoryTab.querySelector(".currency");
    if (currencyHeader) currencyHeader.after(wrapper);
    else inventoryTab.prepend(wrapper);
  }
}

/* -------------------------------------------- */

/**
 * Build a pool row for one material type. When the pool is backed by exactly
 * one item (the usual case) the row is fully interactive; an empty pool renders
 * a muted 0 row; a `readOnly` header row is used above multi-stack groups.
 */
function _buildPoolRow(actor, pool, maxKg, { readOnly = false } = {}) {
  const { type, items, totalQty, totalKg } = pool;
  const item = items[0] ?? null;
  const interactive = !readOnly && !!item;
  const isEmpty = items.length === 0;

  const barPct = totalKg > 0 ? Math.max(3, Math.round((totalKg / maxKg) * 100)) : 0;
  const iconPath = `modules/neuroshima-2026-overrides/icons/items/loot/${type.icon}`;
  const accent = type.accent;
  const muted = isEmpty ? "opacity:0.45;" : "";

  const li = document.createElement("li");
  li.className = "item";
  if (item) li.setAttribute("data-item-id", item.id);
  li.style.cssText = "list-style:none; margin:0;";

  li.innerHTML = `
    <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#23271f; min-height:42px; border-bottom:1px dotted #3a4232; padding:4px 5px; color:#cacdd5; ${muted}">
      <div class="surowiec-name flexrow" role="${interactive && item ? "button" : ""}" aria-label="${type.label}" title="${interactive && item ? "Kliknij: rozwiń opis | Shift+Klik: edytuj" : type.label}" style="flex:1.6; align-items:center; gap:8px; min-width:170px; ${interactive && item ? "cursor:pointer;" : ""}">
        <dnd5e-icon draggable="false" src="${iconPath}" aria-label="${type.label}" class="item-image gold-icon" style="--icon-fill:${accent};"></dnd5e-icon>
        <div class="name name-stacked flexcol">
          <span class="title" style="color:#cacdd5; font-weight:500;">${type.label} <span style="color:#8a8f80; font-weight:400;">(${type.code})</span></span>
        </div>
      </div>
      <div class="item-detail" style="flex:2; display:flex; align-items:center; gap:8px; padding-left:8px;">
        <div style="flex:1; height:10px; background:#181b15; border:1px solid #3a4232; border-radius:2px; overflow:hidden;">
          <div style="width:${barPct}%; height:100%; background:${accent};"></div>
        </div>
        <span style="flex:0 0 64px; text-align:right; font-variant-numeric:tabular-nums;">${_fmtWeight(totalKg)}</span>
      </div>
      ${_qtyCellHtml(interactive ? item : null, totalQty)}
      ${_controlsCellHtml(actor, interactive ? item : null)}
    </div>
  `;

  if (interactive && item) _wireRow(li, actor, item, type);
  return li;
}

/**
 * Build an editable sub-row for a single backing stack inside a multi-stack pool.
 */
function _buildItemSubRow(actor, type, item) {
  const qty = Number(item.system.quantity ?? 0);
  const kg = _itemWeightKg(item) * qty;

  const li = document.createElement("li");
  li.className = "item";
  li.setAttribute("data-item-id", item.id);
  li.style.cssText = "list-style:none; margin:0;";
  li.innerHTML = `
    <div class="item-row flexrow" style="display:flex; align-items:center; justify-content:space-between; background-color:#1d2019; min-height:38px; border-bottom:1px dotted #2f352a; padding:3px 5px 3px 22px; color:#aeb3a4; font-size:0.92em;">
      <div class="surowiec-name flexrow" role="button" aria-label="${item.name}" title="Kliknij: rozwiń opis | Shift+Klik: edytuj" style="flex:1.6; align-items:center; gap:8px; min-width:150px; cursor:pointer;">
        <dnd5e-icon draggable="false" src="${item.img}" aria-label="${item.name}" class="item-image gold-icon" style="--icon-fill:${type.accent};"></dnd5e-icon>
        <span class="title" style="color:#aeb3a4;">${item.name}</span>
      </div>
      <div class="item-detail" style="flex:2; text-align:right; padding-right:8px; font-variant-numeric:tabular-nums;">${_fmtWeight(kg)}</div>
      ${_qtyCellHtml(item, qty)}
      ${_controlsCellHtml(actor, item)}
    </div>
  `;
  _wireRow(li, actor, item, type);
  return li;
}

/* -------------------------------------------- */

/** Quantity cell — adjustable when bound to an item, otherwise a static total. */
function _qtyCellHtml(item, totalQty) {
  if (!item) {
    return `<div class="item-detail" style="flex:0 0 90px; text-align:center; font-variant-numeric:tabular-nums;">${totalQty}</div>`;
  }
  return `
    <div class="item-detail" style="flex:0 0 90px; display:flex; align-items:center; justify-content:space-evenly;">
      <a class="adjustment-button always-interactive" data-action="decrease"><i class="fa-solid fa-minus" inert></i></a>
      <input type="text" class="always-interactive" value="${item.system.quantity ?? 0}" placeholder="0" data-dtype="Number" data-name="system.quantity" inputmode="numeric" pattern="^(\\+|-|=)?\\d*" min="0" aria-label="Ilość" style="width:38px; text-align:center;">
      <a class="adjustment-button always-interactive" data-action="increase"><i class="fa-solid fa-plus" inert></i></a>
    </div>
  `;
}

/** Control buttons — chat, equip, favourite, edit, delete. */
function _controlsCellHtml(actor, item) {
  if (!item) return `<div class="item-detail" style="flex:0 0 132px;"></div>`;
  const equipped = !!item.system.equipped;
  const favorited = !!actor.system.hasFavorite?.(item.getRelativeUUID(actor));
  return `
    <div class="item-detail item-controls always-visible" style="flex:0 0 132px; display:flex; align-items:center; justify-content:flex-end; gap:6px;">
      <button type="button" class="unbutton config-button surowiec-chat" title="Wyświetl w czacie" style="color:#ccc;"><i class="fa-solid fa-message" inert></i></button>
      <button type="button" class="unbutton config-button surowiec-equip" title="${equipped ? "Zdejmij" : "Wyposaż"}" style="color:${equipped ? "#d8c97a" : "#ccc"};"><i class="fa-solid fa-shield-halved" inert></i></button>
      <button type="button" class="unbutton config-button surowiec-favorite" title="${favorited ? "Usuń z ulubionych" : "Ulubione"}" style="color:${favorited ? "#d8c97a" : "#ccc"};"><i class="fa-solid fa-bookmark" inert></i></button>
      <button type="button" class="unbutton config-button surowiec-edit" title="Edytuj" style="color:#ccc;"><i class="fa-solid fa-edit" inert></i></button>
      <button type="button" class="unbutton config-button surowiec-delete" title="Usuń" style="color:#ccc;"><i class="fa-solid fa-trash" inert></i></button>
    </div>
  `;
}

/* -------------------------------------------- */

/** Attach all interactive behaviour to a built row for `item`. */
function _wireRow(li, actor, item, type) {
  // Quantity input + adjustment buttons.
  const qtyInput = li.querySelector('input[data-name="system.quantity"]');
  if (qtyInput) {
    qtyInput.addEventListener("change", async (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) await item.update({ "system.quantity": Math.max(0, val) });
    });
    li.querySelectorAll(".adjustment-button[data-action]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const current = Number(qtyInput.value) || 0;
        qtyInput.value = Math.max(0, current + (btn.dataset.action === "increase" ? 1 : -1));
        qtyInput.dispatchEvent(new Event("change"));
      });
    });
  }

  // Name click → expand/collapse description; Shift+Click → edit.
  const nameEl = li.querySelector(".surowiec-name");
  if (nameEl) {
    nameEl.addEventListener("click", (e) => {
      e.preventDefault();
      if (e.shiftKey) return item.sheet.render(true);
      _toggleDescription(li, item, type);
    });
  }

  li.querySelector(".surowiec-chat")?.addEventListener("click", (e) => {
    e.preventDefault();
    item.displayCard();
  });
  li.querySelector(".surowiec-equip")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await item.update({ "system.equipped": !item.system.equipped });
  });
  li.querySelector(".surowiec-favorite")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const uuid = item.getRelativeUUID(actor);
    if (actor.system.hasFavorite?.(uuid)) await actor.system.removeFavorite(uuid);
    else await actor.system.addFavorite({ type: "item", id: uuid });
  });
  li.querySelector(".surowiec-edit")?.addEventListener("click", (e) => {
    e.preventDefault();
    item.sheet.render(true);
  });
  li.querySelector(".surowiec-delete")?.addEventListener("click", (e) => {
    e.preventDefault();
    item.deleteDialog();
  });
}

/** Toggle an inline, enriched description panel beneath a row. */
async function _toggleDescription(li, item, type) {
  const existing = li.querySelector(".surowiec-desc");
  if (existing) { existing.remove(); return; }

  const raw = item.system.description?.value || "";
  let content = raw;
  try {
    const TE = foundry.applications.ux.TextEditor.implementation;
    content = await TE.enrichHTML(raw, { secrets: false, relativeTo: item, rollData: item.getRollData?.() ?? {} });
  } catch (_err) { /* fall back to raw HTML */ }

  const desc = document.createElement("div");
  desc.className = "surowiec-desc";
  desc.style.cssText = `padding:6px 12px 8px 40px; background:#1b1e17; border-bottom:1px dotted #3a4232; border-left:3px solid ${type.accent}; color:#b6bbac; font-size:0.9em;`;
  desc.innerHTML = content || `<em style="opacity:0.6;">Brak opisu.</em>`;
  li.appendChild(desc);
}

/* -------------------------------------------- */
/*  Transfer to vehicle                         */
/* -------------------------------------------- */

/** Total cargo capacity of a vehicle in kg (Infinity if not configured). */
function _vehicleCapacityKg(vehicle) {
  const cap = vehicle.system?.attributes?.capacity?.cargo;
  const value = (cap && typeof cap === "object") ? cap.value : cap;
  const units = (cap && typeof cap === "object") ? (cap.units ?? "kg") : "kg";
  if (value == null || isNaN(value)) return Infinity;
  return _weightToKg(Number(value), units);
}

/** Current total weight of all items carried by a vehicle, in kg. */
function _vehicleCargoKg(vehicle) {
  let kg = 0;
  for (const item of vehicle.items) kg += _itemWeightKg(item) * (item.system?.quantity ?? 1);
  return kg;
}

/** Nearest gap between two token footprints, in scene distance units (metres). */
function _tokenGapMeters(t1, t2) {
  const s = canvas.grid.size;
  const rect = (t) => ({ x: t.document.x, y: t.document.y, w: t.document.width * s, h: t.document.height * s });
  const a = rect(t1), b = rect(t2);
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
  const dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  return (Math.hypot(dx, dy) / s) * canvas.grid.distance;
}

const TRANSFER_RANGE_M = 5;

/**
 * Move all surowce (CH, CE, CZ, MK, MO) from `sourceActor` into the currently
 * selected vehicle token, up to the vehicle's remaining cargo capacity, provided
 * the vehicle is within {@link TRANSFER_RANGE_M} of the source token. Posts a
 * chat message with the total deposited weight.
 */
async function _transferToVehicle(sourceActor) {
  const controlled = canvas.tokens?.controlled ?? [];
  if (controlled.length !== 1) {
    return ui.notifications.warn("Zaznacz dokładnie jeden token pojazdu.");
  }
  const vehicleToken = controlled[0];
  const vehicle = vehicleToken.actor;
  if (vehicle?.type !== "vehicle") {
    return ui.notifications.warn("Zaznaczony token nie jest pojazdem.");
  }
  if (vehicle === sourceActor) {
    return ui.notifications.warn("Źródło i pojazd to ten sam aktor.");
  }

  const sourceToken = sourceActor.getActiveTokens?.()[0];
  if (!sourceToken) {
    return ui.notifications.warn(`${sourceActor.name}: brak tokenu na bieżącej scenie.`);
  }
  if (sourceToken.scene?.id !== vehicleToken.scene?.id) {
    return ui.notifications.warn("Token źródła i pojazd są na różnych scenach.");
  }

  const gap = _tokenGapMeters(sourceToken, vehicleToken);
  if (gap > TRANSFER_RANGE_M) {
    return ui.notifications.warn(`Pojazd jest za daleko: ${gap.toFixed(1)} m (maks. ${TRANSFER_RANGE_M} m).`);
  }

  // Surowce stacks with stock, in canonical type order.
  const stacks = (sourceActor.items.contents)
    .filter(i => getSurowiecType(i) && (i.system.quantity ?? 0) > 0)
    .sort((a, b) => getSurowiecType(a).order - getSurowiecType(b).order);
  if (!stacks.length) {
    return ui.notifications.info("Brak surowców do przekazania.");
  }
  const totalAvailUnits = stacks.reduce((s, i) => s + (i.system.quantity ?? 0), 0);

  const capacityKg = _vehicleCapacityKg(vehicle);
  let remainingKg = capacityKg - _vehicleCargoKg(vehicle);
  if (remainingKg <= 0) {
    return ui.notifications.warn(`${vehicle.name}: ładownia jest pełna.`);
  }

  const toCreate = [];
  const toUpdateVehicle = [];
  const toUpdateSource = [];
  let movedKg = 0;
  let movedUnits = 0;

  for (const item of stacks) {
    const unitKg = _itemWeightKg(item);
    const have = item.system.quantity ?? 0;
    const fit = unitKg > 0 ? Math.floor(remainingKg / unitKg) : have;
    const move = Math.max(0, Math.min(have, fit));
    if (move <= 0) continue;

    const existing = vehicle.items.find(v => v.type === item.type && v.name === item.name);
    if (existing) {
      toUpdateVehicle.push({ _id: existing.id, "system.quantity": (existing.system.quantity ?? 0) + move });
    } else {
      const data = item.toObject();
      delete data._id;
      delete data.folder;
      data.system.quantity = move;
      if ("equipped" in data.system) data.system.equipped = false;
      toCreate.push(data);
    }
    toUpdateSource.push({ _id: item.id, "system.quantity": have - move });

    movedKg += unitKg * move;
    movedUnits += move;
    remainingKg -= unitKg * move;
    if (remainingKg <= 0) break;
  }

  if (movedUnits <= 0) {
    return ui.notifications.warn(`${vehicle.name}: ładownia pełna — nic się nie zmieściło.`);
  }

  if (toCreate.length) await vehicle.createEmbeddedDocuments("Item", toCreate);
  if (toUpdateVehicle.length) await vehicle.updateEmbeddedDocuments("Item", toUpdateVehicle);
  if (toUpdateSource.length) await sourceActor.updateEmbeddedDocuments("Item", toUpdateSource);

  const partial = movedUnits < totalAvailUnits;
  const content = `
    <div class="dnd5e2 chat-card" style="padding:6px 8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <i class="fas fa-truck-ramp-box" style="color:#9f9275;"></i>
        <strong>Przekazano surowce → ${vehicle.name}</strong>
      </div>
      <div style="margin-top:4px;">Łączna waga: <strong>${_fmtWeight(movedKg)}</strong></div>
      ${partial ? `<div style="margin-top:2px; opacity:0.8; font-size:0.9em;"><i class="fas fa-triangle-exclamation"></i> Ładownia pełna — część surowców pozostała u źródła.</div>` : ``}
    </div>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: sourceActor }), content });
  ui.notifications.info(`Przekazano ${_fmtWeight(movedKg)} surowców do ${vehicle.name}.`);
}
