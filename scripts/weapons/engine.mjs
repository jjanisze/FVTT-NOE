/**
 * Neuroshima 5e — Engine start/stop for `spalinowa` (combustion-engine) weapons.
 *
 * Piła spalinowa (and any future item tagged `spalinowa`, e.g. Miotacz ognia) gets two
 * activities auto-provisioned — "Uruchom silnik" / "Zgaś silnik" — that play a start/stop
 * SFX and toggle a persisted, looping idle sound via Sequencer (see sequencer.mjs).
 *
 * Deliberately NOT in scope: fuel/resource tracking. Per PLAN_weapon_properties.md §4,
 * `spalinowa`'s resource cost (0.5 L / 30 min) is left to the player + GM to track manually —
 * this module only handles the on/off toggle and its audio.
 */

import { WeaponSound, getWeaponSoundPath, getDefaultVolume, playWeaponSound } from "./sounds.mjs";
import { seqStartLoop, seqStopLoop } from "./sequencer.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG_RUNNING = "engineRunning";

const ENGINE_START_ID = "engine-start";
const ENGINE_STOP_ID = "engine-stop";

/* -------------------------------------------- */
/*  Helpers                                       */
/* -------------------------------------------- */

function hasSpalinowa(item) {
  const props = item?.system?.properties;
  if (!props) return false;
  return typeof props.has === "function" ? props.has("spalinowa") : Array.isArray(props) && props.includes("spalinowa");
}

function getEngineActivity(item, identifier) {
  return item.system.activities?.find(a => a.visibility?.identifier === identifier) ?? null;
}

function _getLiveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

/**
 * Create the "Uruchom silnik" / "Zgaś silnik" activities on a `spalinowa` item if it
 * doesn't already have them. Safe to call repeatedly (idempotent).
 *
 * @param {Item5e} item
 */
export async function ensureEngineActivities(item) {
  if (!hasSpalinowa(item)) return;

  if (!getEngineActivity(item, ENGINE_START_ID)) {
    await item.createActivity("utility", {
      name: "Uruchom silnik",
      activation: { type: "action" },
      visibility: { identifier: ENGINE_START_ID },
      description: { chatFlavor: "Silnik zapala się z warkotem." },
    }, { renderSheet: false });
  }

  if (!getEngineActivity(item, ENGINE_STOP_ID)) {
    await item.createActivity("utility", {
      name: "Zgaś silnik",
      activation: { type: "special" },
      visibility: { identifier: ENGINE_STOP_ID },
      description: { chatFlavor: "Silnik gaśnie." },
    }, { renderSheet: false });
  }
}

/* -------------------------------------------- */
/*  Start / stop                                  */
/* -------------------------------------------- */

async function startEngine(item) {
  if (item.getFlag(MODULE_ID, FLAG_RUNNING)) return;

  const token = item.actor?.getActiveTokens?.()[0] ?? null;
  playWeaponSound(WeaponSound.ENGINE_START, { token });

  const loopSrc = getWeaponSoundPath(WeaponSound.ENGINE_IDLE_LOOP);
  const vol = Math.pow(getDefaultVolume(), 2);
  seqStartLoop(loopSrc, vol, item.uuid, { token, soundKey: WeaponSound.ENGINE_IDLE_LOOP });

  await item.setFlag(MODULE_ID, FLAG_RUNNING, true);
}

async function stopEngine(item, { silent = false } = {}) {
  if (!item.getFlag?.(MODULE_ID, FLAG_RUNNING)) return;

  seqStopLoop(item.uuid);
  if (!silent) {
    const token = item.actor?.getActiveTokens?.()[0] ?? null;
    playWeaponSound(WeaponSound.ENGINE_STOP, { token });
  }

  await item.setFlag(MODULE_ID, FLAG_RUNNING, false);
}

/**
 * One-time backfill: ensure every `spalinowa` item already in the world (both
 * unowned world items and actors' embedded items) has its engine activities.
 * GM-only, since it writes documents. New items are covered going forward by
 * the `createItem` hook in {@link registerEngineControls}.
 */
async function ensureAllEngineActivities() {
  const items = [...game.items];
  for (const actor of game.actors) items.push(...actor.items);
  for (const item of items) {
    if (hasSpalinowa(item) && (!getEngineActivity(item, ENGINE_START_ID) || !getEngineActivity(item, ENGINE_STOP_ID))) {
      await ensureEngineActivities(item);
    }
  }
}

/* -------------------------------------------- */
/*  Validation (block invalid state transitions)  */
/* -------------------------------------------- */

/**
 * Blocks activity use that doesn't make sense given the engine's current state:
 * - Attacking with the engine off (can't cut with a dead chainsaw).
 * - Starting an already-running engine.
 * - Stopping an already-stopped engine.
 *
 * @param {Activity} activity
 * @returns {boolean|void}  false to block use (dnd5e.preUseActivity convention).
 */
function onPreUseActivity(activity) {
  const item = _getLiveItem(activity?.item);
  if (!item || !hasSpalinowa(item)) return;

  const running = item.getFlag(MODULE_ID, FLAG_RUNNING) ?? false;
  const identifier = activity.visibility?.identifier;

  if (activity.type === "attack" && !running) {
    ui.notifications.warn(`${item.name}: silnik nie pracuje. Najpierw go uruchom.`);
    return false;
  }
  if (identifier === ENGINE_START_ID && running) {
    ui.notifications.warn(`${item.name}: silnik już pracuje.`);
    return false;
  }
  if (identifier === ENGINE_STOP_ID && !running) {
    ui.notifications.warn(`${item.name}: silnik jest już zgaszony.`);
    return false;
  }
}

/* -------------------------------------------- */
/*  Registration                                  */
/* -------------------------------------------- */

export function registerEngineControls() {
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);

  Hooks.on("dnd5e.postUseActivity", (activity) => {
    const item = _getLiveItem(activity?.item);
    if (!item || !hasSpalinowa(item)) return;
    const identifier = activity.visibility?.identifier;
    if (identifier === ENGINE_START_ID) startEngine(item);
    else if (identifier === ENGINE_STOP_ID) stopEngine(item);
  });

  // Stop any lingering loop if the weapon itself is deleted while running.
  Hooks.on("deleteItem", (item) => {
    if (hasSpalinowa(item) && item.getFlag(MODULE_ID, FLAG_RUNNING)) {
      seqStopLoop(item.uuid);
    }
  });

  // Auto-provision the activities on new `spalinowa` items (world or embedded).
  Hooks.on("createItem", (item) => {
    if (game.user.isGM) ensureEngineActivities(item);
  });

  // One-time backfill for items that already existed before this feature shipped.
  if (game.user.isGM) ensureAllEngineActivities();

  console.log("Neuroshima 5e | Engine start/stop registered");
}
