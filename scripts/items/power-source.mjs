/**
 * Neuroshima 5e — shared "this item is a toggleable power/fuel consumer" paradigm.
 *
 * Before this file, Pochodnia (fuel, world-time burn-down) and Latarka (battery charge,
 * same burn-down shape) each rolled their own near-identical item-sheet "Paliwo"/"Bateria"
 * row, and neither showed anything on the inventory list itself — a player had to open the
 * item sheet to find out whether a torch or a flashlight was actually lit. Two problems, one
 * root cause: no shared concept of "a device with a depleting charge that's on or off," so
 * every new device (Latarka, and now radio/krótkofalówka/miernik promieniowania down the
 * line) would otherwise re-derive its own copy of the same percent/countdown/edit-while-off
 * logic `pochodnia.mjs` and `latarka.mjs` already had to keep in lockstep by hand.
 *
 * ## Model
 *
 * Each power-consuming item module registers a *descriptor lookup*: `test(item)` says
 * whether this module owns that item, `describe(item)` returns its current state or `null`.
 * `getPowerStatus(item)` finds the first matching registration and calls `describe`.
 *
 * `describe` returns:
 * ```
 * {
 *   on: boolean,
 *   unlimited: boolean,       // true for a source that never depletes (e.g. dynamo) — no %,
 *                             // no countdown, just an on/off state
 *   percent: number,          // 0–100, LIVE (already accounts for elapsed burn if `on`)
 *   remainingMinutes: number, // live minutes left at the current percent — ignored if unlimited
 *   unitLabel: string,        // "Paliwo" | "Bateria" | …
 *   flagPath: string,         // dotted flag path for the editable input's `name` attribute
 *   editable: boolean,        // whether the owning player may hand-edit the percent right now
 *   onNote: string,           // e.g. "płonie" | "świeci" — used in the "can't edit" hint
 *   offHint: string,          // e.g. "dolanie oleju, świeża szmata…" | "" — shown while editable
 *   lowThreshold?: number,    // % at/below which the badge switches to the "low" warning tier
 * }
 * ```
 *
 * This module owns no state of its own — same "pure plumbing" posture as `light-sources.mjs`,
 * which this deliberately mirrors (registry of per-item-type descriptors instead of
 * per-actor light providers, since "is this item on and how much is left" is a per-item
 * question, not one where multiple sources compete for one answer).
 */

const MODULE_ID = "neuroshima-2026-overrides";
const DEFAULT_LOW_THRESHOLD = 20;

/** @type {{test: (item: Item) => boolean, describe: (item: Item) => object|null}[]} */
const _sources = [];

/** Register a power-source descriptor lookup — see this file's doc comment for the shape. */
export function registerPowerSource({ test, describe }) {
  _sources.push({ test, describe });
}

/** Returns the live descriptor for `item`, or `null` if no registered source recognizes it. */
export function getPowerStatus(item) {
  if (!item) return null;
  for (const { test, describe } of _sources) {
    if (!test(item)) continue;
    try {
      return describe(item) ?? null;
    } catch (e) {
      console.warn(`${MODULE_ID} | power-source: describe() threw`, e);
      return null;
    }
  }
  return null;
}

/* -------------------------------------------- */
/*  Shared formatting                             */
/* -------------------------------------------- */

/** "3g 45min" / "45min" / "0min" — the one place this project formats a minute count. */
export function formatRemaining(minutes) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem}min`;
  if (rem === 0) return `${h}g`;
  return `${h}g ${rem}min`;
}

/** True if some registered source's `test` claims this item — regardless of what `describe`
 * would currently return (a burnt-out Pochodnia still has no fuel state worth stacking).
 * Exported: the quantity-lock UI below and `config/inventory-audit.mjs`'s integrity check
 * both need to ask "is this item one of the stateful, one-document-per-instance types" without
 * duplicating the registry lookup. */
export function isPowerSourceItem(item) {
  return _sources.some(({ test }) => {
    try { return test(item); } catch (e) { return false; }
  });
}

/* -------------------------------------------- */
/*  Quantity lock — "one document, one instance's state"                                       */
/* -------------------------------------------- */

/**
 * A registered power source keeps its on/off + charge/fuel state as flags on ONE item document
 * — same place `system.quantity` lives. Letting quantity climb above 1 would silently claim "3
 * flashlights" while actually modeling one shared on/off switch and one shared battery, which is
 * simply wrong, not just imprecise (confirmed live: nothing about the charge/on state scales
 * with quantity — `_liveChargePercent`/`_liveFuelPercent` know nothing about it). This mirrors
 * how weapons already work in this module — a jammed/modded pistol is one document, not a stack
 * of three sharing one jam counter; a player who wants three flashlights gets three separate
 * Latarka items, each with its own battery, exactly like three separate pistols.
 *
 * Blocks a deliberate player edit (the quantity input on the sheet) with an explanation; a
 * creation with quantity already >1 (import, manual `Item.create`, compendium drag with a stale
 * value) is clamped silently instead — nothing to explain to anyone at that point.
 */
function _onPreUpdateItem(item, changes) {
  if (!foundry.utils.hasProperty(changes, "system.quantity")) return true;
  const qty = foundry.utils.getProperty(changes, "system.quantity");
  if (qty == null || qty <= 1) return true;
  if (!isPowerSourceItem(item)) return true;
  ui.notifications.warn(
    `${item.name}: ma własny stan (bateria/paliwo, wł/wył) na tym dokumencie — nie da się go `
    + `sztaplować. Weź osobną sztukę na każde kolejne urządzenie.`
  );
  return false;
}

function _onPreCreateItem(item, data) {
  const qty = foundry.utils.getProperty(data, "system.quantity");
  if (qty == null || qty <= 1) return true;
  if (!isPowerSourceItem(item)) return true;
  item.updateSource({ "system.quantity": 1 });
  return true;
}

/* -------------------------------------------- */
/*  Inventory-row badge — "is this thing on right now"                                        */
/* -------------------------------------------- */

/**
 * Same mechanism as `jams.mjs`/`melee-degradation.mjs`'s row highlighting: a CSS class on the
 * `.item[data-item-id]` row, turned into a small corner badge by `neuroshima.css`. Reuses that
 * badge's screen position — Pochodnia/Latarka/future battery gadgets are never simultaneously
 * a jammed firearm, a degraded melee weapon, or an addon-bearing weapon, so there's no real
 * collision even though the slot is shared.
 */
function _onRenderActorSheetPowerBadge(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  root.querySelectorAll(".item[data-item-id]").forEach(row => {
    const item = actor.items.get(row.dataset.itemId);
    const status = getPowerStatus(item);
    row.classList.remove("neuro-power-on", "neuro-power-low");
    if (status?.on) {
      const low = !status.unlimited && status.percent <= (status.lowThreshold ?? DEFAULT_LOW_THRESHOLD);
      row.classList.add(low ? "neuro-power-low" : "neuro-power-on");
    }
    if (isPowerSourceItem(item)) _lockQuantityInput(row.querySelector(".item-quantity"));
  });
}

/**
 * `preUpdateItem`/`preCreateItem` above stop the write, but a player who clicks the +/- twice
 * before the rejection round-trips back still *sees* it climb for a moment — "it complains but I
 * can still break it," reported live. This closes that gap the way the actor sheet's own
 * `@root.locked` branch does for a genuinely locked sheet (see `dnd5e`'s
 * `templates/inventory/columns/quantity.hbs`): disable the two adjustment arrows and make the
 * number read-only, so there's nothing left to click that could ever produce the illusion of a
 * pending change. This is deliberately not the same thing as the block above — that one is the
 * actual integrity guarantee (defends against macros, other clients, anything that skips this
 * render pass entirely); this is just making the sheet stop offering a control that always loses.
 */
function _lockQuantityInput(qtyBlock) {
  if (!qtyBlock || qtyBlock.dataset.neuroQtyLocked) return;
  qtyBlock.dataset.neuroQtyLocked = "true";
  const hint = "Ma własny stan (bateria/paliwo, wł/wył) na tym dokumencie — nie da się go sztaplować.";
  qtyBlock.querySelectorAll(".adjustment-button").forEach(btn => {
    btn.classList.add("neuro-qty-locked");
    btn.title = hint;
    btn.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); }, true);
  });
  // dnd5e's inventory-row quantity input uses `data-name`, not a plain `name` attribute (its own
  // "always-interactive" row-editing mechanism, distinct from a native form field) — the item
  // sheet's own header quantity field (a normal DataField widget) uses plain `name` instead.
  // Confirmed live: the two templates genuinely differ, not an oversight to pick just one.
  const input = qtyBlock.querySelector("input[name='system.quantity'], input[data-name='system.quantity']");
  if (input) { input.readOnly = true; input.classList.add("neuro-qty-locked"); input.title = hint; }
}

/** Same lock, applied to the item sheet's own header quantity field (a plain NumberField
 * input, no adjustment arrows there — see `templates/items/header.hbs` in dnd5e's source). */
function _onRenderItemSheetQuantityLock(app, html) {
  const item = app.document ?? app.item;
  if (!item || !isPowerSourceItem(item)) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const input = root.querySelector(".quantity input[name='system.quantity']");
  if (input) {
    input.readOnly = true;
    input.classList.add("neuro-qty-locked");
    input.title = "Ma własny stan (bateria/paliwo, wł/wył) na tym dokumencie — nie da się go sztaplować.";
  }
}

/* -------------------------------------------- */
/*  Item-sheet row — shared "Paliwo"/"Bateria" UI                                              */
/* -------------------------------------------- */

/**
 * Injects the power-source row on an item sheet. Callers pass the same anchor selector
 * `pochodnia.mjs`/`latarka.mjs`/`magazine.mjs` already use for their own Details-tab rows, and
 * the live `status` from `getPowerStatus(item)` (or an equivalent hand-built descriptor).
 */
export function renderPowerRow(root, status) {
  const detailsSection = root.querySelector(".item-properties, .details-tab, [data-tab='details'] .form-group:last-of-type");
  if (!detailsSection) return;

  const pct = Math.round(status.percent);
  const remaining = status.unlimited ? null : formatRemaining(status.remainingMinutes);

  const row = document.createElement("div");
  row.classList.add("form-group", "neuro-power-row");

  if (status.unlimited) {
    row.innerHTML = `
      <label>${status.unitLabel}</label>
      <div class="form-fields"><span>${status.on ? "zasilanie ręczne — nie kończy się" : "gotowe do włączenia"}</span></div>
    `;
  } else if (status.editable) {
    row.innerHTML = `
      <label>${status.unitLabel}</label>
      <div class="form-fields" style="display:flex; align-items:center; gap:6px;">
        <input type="number" name="${status.flagPath}" value="${pct}" min="0" max="100" step="1"
               data-dtype="Number" style="width:60px; text-align:center;">
        <span>%</span>
        <span style="font-size:11px; color:#888;">
          ${status.offHint ?? ""}${status.offHint ? " — " : ""}starczy na ~${remaining} przy tym poziomie
        </span>
      </div>
    `;
  } else {
    row.innerHTML = `
      <label>${status.unitLabel}</label>
      <div class="form-fields">
        <span>${pct}%${status.on ? ` — ${status.onNote ?? "aktywne"}, zostało ~${remaining}` : ""}</span>
      </div>
    `;
  }

  detailsSection.after(row);
}

/* -------------------------------------------- */
/*  Registration                                  */
/* -------------------------------------------- */

export function registerPowerSourceUI() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetPowerBadge);
  }
  // Not really "UI" (see the quantity-lock doc comment above) but this is already the one place
  // every power-source-consuming module calls to wire up the shared paradigm, so it lives here
  // rather than adding a second registration call every one of them would need to remember.
  Hooks.on("preUpdateItem", _onPreUpdateItem);
  Hooks.on("preCreateItem", _onPreCreateItem);
  Hooks.on("renderItemSheet5e", _onRenderItemSheetQuantityLock);
  console.log(`${MODULE_ID} | Power-source badges registered`);
}
