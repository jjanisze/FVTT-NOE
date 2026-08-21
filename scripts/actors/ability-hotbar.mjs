/**
 * Neuroshima 5e — auto-managed class ability hotbar.
 *
 * Class abilities flagged `hotbar: true` in `class-features-data.mjs` get a macro
 * created in the native FVTT hotbar automatically as the character gains levels,
 * and removed when the ability goes away.
 *
 * A plain Foundry macro slot renders only a static image + name, so the two things
 * the GM asked for are drawn on top by this module:
 *
 *   - a live charge badge (`2/3`, plus ●●○ pips when max <= 6), read from the
 *     backing item's `system.uses`, greyed out at zero
 *   - active-state art: togglable abilities (Berserk) swap `<id>.svg` for
 *     `<id>_active.svg` and gain a pulsing frame while the state is up
 *
 * Ownership: this module only ever touches macros carrying
 * `flags.neuroshima-2026-overrides.abilityId`. User-placed macros are never moved
 * or deleted, and occupied slots are skipped when placing new ones.
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { isStateActive } from "./class-state.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG_ABILITY = "abilityId";

/* -------------------------------------------- */
/*  Macro management                             */
/* -------------------------------------------- */

/** The abilities on this actor that should own a hotbar macro. */
function _eligibleAbilities(actor) {
  const out = [];
  for (const item of actor.items) {
    const abilityId = item.getFlag(MODULE_ID, FLAG_ABILITY);
    if (!abilityId) continue;
    const feature = CLASS_FEATURES[abilityId];
    if (feature?.hotbar) out.push({ abilityId, item, feature });
  }
  return out;
}

function _macroCommand(abilityId) {
  // Kept deliberately small — all logic lives in the module API so that macros
  // never need regenerating when behaviour changes.
  return `game.modules.get("${MODULE_ID}").api.hotbar.use("${abilityId}");`;
}

function _iconFor(feature, active) {
  const base = `modules/${MODULE_ID}/icons/abilities/${feature.id}`;
  return active ? `${base}_active.svg` : `${base}.svg`;
}

/**
 * Serialisation for hotbar syncs.
 *
 * `createEmbeddedDocuments` fires `createItem` once per document, so granting a
 * level's worth of abilities fires several resyncs at once. Run concurrently they
 * each observe the same "not yet owned" state and each create a macro, producing
 * duplicates. Syncs are therefore debounced per actor and then chained so only one
 * runs at a time.
 */
const _syncChain = new Map();   // actorId -> tail promise
const _syncTimer = new Map();   // actorId -> debounce timeout

/** Queue a sync, serialised behind any sync already running for this actor. */
export function queueHotbarSync(actor, options) {
  if (!actor?.id) return Promise.resolve();
  const prev = _syncChain.get(actor.id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => syncHotbar(actor, options));
  _syncChain.set(actor.id, next);
  next.finally(() => { if (_syncChain.get(actor.id) === next) _syncChain.delete(actor.id); });
  return next;
}

/** Debounced queue — collapses a burst of document events into one sync. */
function scheduleHotbarSync(actor) {
  if (!actor?.id) return;
  clearTimeout(_syncTimer.get(actor.id));
  _syncTimer.set(actor.id, setTimeout(() => {
    _syncTimer.delete(actor.id);
    queueHotbarSync(actor);
  }, 150));
}

/**
 * Sync the hotbar for the currently-assigned character.
 * Idempotent: safe to call on every level-up, item change, or login.
 * Prefer `queueHotbarSync` from event handlers — see the note above.
 */
export async function syncHotbar(actor, { user = game.user } = {}) {
  if (!actor || actor.type !== "character") return;
  if (user.character?.id !== actor.id && !user.isGM) return;

  const eligible = _eligibleAbilities(actor);
  const wanted = new Map(eligible.map(e => [e.abilityId, e]));

  const slots = user.hotbar ?? {};
  const owned = new Map();          // abilityId -> slot
  const occupied = new Set();

  for (const [slot, macroId] of Object.entries(slots)) {
    if (!macroId) continue;
    occupied.add(Number(slot));
    const macro = game.macros.get(macroId);
    const abilityId = macro?.getFlag(MODULE_ID, FLAG_ABILITY);
    if (abilityId) owned.set(abilityId, Number(slot));
  }

  // Remove macros for abilities the actor no longer has.
  for (const [abilityId, slot] of owned) {
    if (wanted.has(abilityId)) continue;
    await user.assignHotbarMacro(null, slot);
    const macro = game.macros.get(slots[slot]);
    if (macro?.getFlag(MODULE_ID, FLAG_ABILITY)) await macro.delete();
    occupied.delete(slot);
  }

  // Add macros for newly-gained abilities, into the first free slot.
  for (const { abilityId, item, feature } of eligible) {
    if (owned.has(abilityId)) continue;

    let slot = null;
    for (let i = 1; i <= 50; i++) {
      if (!occupied.has(i)) { slot = i; break; }
    }
    if (slot === null) {
      ui.notifications?.warn(`Brak wolnego miejsca na pasku dla zdolności: ${feature.label}`);
      break;
    }

    // Reuse an existing macro for this ability if one is lying around unplaced
    // (and delete any extras), so a lost race can never leave duplicates behind.
    const existing = game.macros.filter(m => m.getFlag(MODULE_ID, FLAG_ABILITY) === abilityId);
    let macro = existing[0] ?? null;
    for (const dup of existing.slice(1)) await dup.delete();

    if (macro) {
      await macro.update({ name: feature.label, img: item.img ?? _iconFor(feature, false) });
    } else {
      macro = await Macro.create({
        name: feature.label,
        type: "script",
        img: item.img ?? _iconFor(feature, false),
        scope: "global",
        command: _macroCommand(abilityId),
        flags: { [MODULE_ID]: { [FLAG_ABILITY]: abilityId, actorId: actor.id } }
      });
    }

    await user.assignHotbarMacro(macro, slot);
    owned.set(abilityId, slot);
    occupied.add(slot);
  }

  ui.hotbar?.render();
}

/* -------------------------------------------- */
/*  Using an ability from the bar                */
/* -------------------------------------------- */

/**
 * Entry point for the generated macros. Toggles stateful abilities, otherwise
 * rolls the item's activity.
 */
export async function useAbility(abilityId) {
  const actor = game.user.character
    ?? canvas.tokens?.controlled?.[0]?.actor
    ?? null;
  if (!actor) {
    ui.notifications?.warn("Brak wybranej postaci.");
    return;
  }

  const item = actor.items.find(i => i.getFlag(MODULE_ID, FLAG_ABILITY) === abilityId);
  if (!item) {
    ui.notifications?.warn("Ta postać nie posiada tej zdolności.");
    return;
  }

  const feature = CLASS_FEATURES[abilityId];
  if (feature?.toggle) {
    const { toggleClassState } = await import("./class-state.mjs");
    await toggleClassState(actor, abilityId);
    ui.hotbar?.render();
    return;
  }

  await item.use();
  ui.hotbar?.render();
}

/* -------------------------------------------- */
/*  Slot decoration (badge + active art)         */
/* -------------------------------------------- */

function _decorateHotbar(html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const actor = game.user.character ?? canvas.tokens?.controlled?.[0]?.actor ?? null;

  for (const slotEl of root.querySelectorAll("li.slot[data-slot]")) {
    // Clear any previous decoration so re-renders don't stack.
    slotEl.querySelector(".neuro-ability-badge")?.remove();
    slotEl.classList.remove("neuro-ability", "neuro-ability--active", "neuro-ability--empty");

    const slot = Number(slotEl.dataset.slot);
    const macroId = game.user.hotbar?.[slot];
    if (!macroId) continue;

    const macro = game.macros.get(macroId);
    const abilityId = macro?.getFlag(MODULE_ID, FLAG_ABILITY);
    if (!abilityId) continue;

    const feature = CLASS_FEATURES[abilityId];
    if (!feature) continue;

    slotEl.classList.add("neuro-ability");

    const item = actor?.items.find(i => i.getFlag(MODULE_ID, FLAG_ABILITY) === abilityId);

    // Active-state art swap.
    const active = feature.toggle && actor ? isStateActive(actor, feature.toggle.effect) : false;
    if (active) slotEl.classList.add("neuro-ability--active");

    const img = slotEl.querySelector("img.slot-icon");
    if (img && feature.toggle) {
      const wanted = _iconFor(feature, active);
      // Only swap when the active-variant asset actually exists; otherwise keep
      // the base art and rely on the CSS active frame.
      if (active) img.dataset.neuroBase ??= img.getAttribute("src");
      const fallback = img.dataset.neuroBase ?? item?.img;
      img.setAttribute("src", active ? wanted : (fallback ?? wanted));
      img.onerror = () => { if (fallback) img.setAttribute("src", fallback); };
    }

    // Charge badge.
    const uses = item?.system?.uses;
    if (uses?.max) {
      const max = Number(uses.max) || Number(item.system.uses.max) || 0;
      const spent = Number(uses.spent) || 0;
      const left = Math.max(0, max - spent);

      const badge = document.createElement("span");
      badge.className = "neuro-ability-badge";
      badge.textContent = max > 0 && max <= 6
        ? "●".repeat(left) + "○".repeat(Math.max(0, max - left))
        : `${left}/${max}`;
      badge.dataset.tooltip = `${feature.label}: ${left} z ${max}`;
      if (left === 0) slotEl.classList.add("neuro-ability--empty");
      slotEl.appendChild(badge);
    }
  }
}

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerAbilityHotbar() {
  Hooks.on("renderHotbar", (_app, html) => _decorateHotbar(html));

  // Re-sync when class levels change or ability items come and go.
  // Debounced + serialised: a level-up grants several items in one operation.
  const resync = doc => {
    const actor = doc instanceof Actor ? doc : doc?.parent;
    if (actor instanceof Actor) scheduleHotbarSync(actor);
  };
  Hooks.on("createItem", resync);
  Hooks.on("deleteItem", resync);
  Hooks.on("dnd5e.advancementManagerComplete", (_mgr, actor) => scheduleHotbarSync(actor));

  // Redraw badges when uses are spent/restored or a state flips.
  Hooks.on("updateItem", (item, changed) => {
    if (!item.getFlag(MODULE_ID, FLAG_ABILITY)) return;
    if (foundry.utils.hasProperty(changed, "system.uses")) ui.hotbar?.render();
  });
  for (const hook of ["createActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, effect => {
      if (effect.getFlag(MODULE_ID, "classState")) ui.hotbar?.render();
    });
  }

  Hooks.once("ready", () => {
    if (game.user.character) syncHotbar(game.user.character);
  });

  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.hotbar = { use: useAbility, sync: syncHotbar };
  }

  console.log(`${MODULE_ID} | Ability hotbar registered`);
}
