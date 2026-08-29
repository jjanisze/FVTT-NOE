/**
 * Neuroshima 5e — Narzędzia małego kowala: "Naostrzenie broni" and "Naprawa
 * zdegradowanej broni białej".
 *
 * Both actions act on a weapon from the smith's OWN inventory (their tool kit works
 * on their own gear — same owner-resolution philosophy as the kit's check activity
 * itself, see `toolkit-check-activity.mjs`), not on scene targets. They plug into
 * that file's check-gate mechanism (`registerCheckGate`):
 *
 *   - `canUse` — filters out the action (from the item-choice dialog, and blocks a
 *     bare item click) the moment there is NOTHING eligible to act on. This is the
 *     "prevent a roll from taking place at an appropriately early stage, including
 *     on the character sheet" gate: no weapon, no card, no roll.
 *   - `run` — at `use()` time, resolves the eligible weapon list; if there's more
 *     than one candidate, asks which one via a picker dialog (same shape as the
 *     "Wytrącenie" held-item picker in combat/melee-maneuvers.mjs). The chosen
 *     weapon's UUID is stashed as a flag on the usage card, since that card is the
 *     one thing shared between `use()` (now) and the later roll-button click.
 *
 * The actual outcome (sharpen / repair) is applied from `neuroshima.toolCheckRolled`,
 * fired by `NeuroToolCheckActivity.rollCheck` once the check is actually rolled — DC
 * comparison decides success, exactly like every other check activity's card already
 * shows, we just also act on it.
 */

import { ADDON_DEFS } from "../config/addons-data.mjs";
import { isAddonCompatible, installAddonById } from "../weapons/addons.mjs";
import { isMeleeWeapon, getDegradationState, repairWeapon } from "../weapons/melee-degradation.mjs";
import { registerCheckGate } from "./toolkit-check-activity.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Sharpening only makes sense on an edge or a point. */
const SHARPENABLE_DAMAGE_TYPES = new Set(["slashing", "piercing"]);

export function registerKowalActions() {
  registerCheckGate("kowalaNaostrzenie", {
    canUse: activity => _canActOn(activity, getSharpenableWeapons),
    run: activity => _pickAndTag(activity, {
      kind: "naostrzenie",
      getWeapons: getSharpenableWeapons,
      emptyWarning: "Brak broni białej do naostrzenia — potrzeba siecznej lub kłującej, nienaostrzonej i nieuszkodzonej broni.",
      dialogTitle: "Naostrzenie broni",
      dialogHint: "Którą broń naostrzyć?"
    })
  });

  registerCheckGate("kowalaNaprawa", {
    canUse: activity => _canActOn(activity, getRepairableWeapons),
    run: activity => _pickAndTag(activity, {
      kind: "naprawa",
      getWeapons: getRepairableWeapons,
      emptyWarning: "Brak zdegradowanej broni białej do naprawy.",
      dialogTitle: "Naprawa broni",
      dialogHint: "Którą broń naprawić?"
    })
  });

  Hooks.on("neuroshima.toolCheckRolled", _onToolCheckRolled);
  console.log("Neuroshima 5e | Kowal actions (naostrzenie/naprawa weapon picker) registered");
}

/* ============================================================
 * Eligibility
 * ============================================================ */

function _damageTypes(weapon) {
  const raw = weapon.system?.damage?.base?.types ?? [];
  return raw instanceof Set ? raw : new Set(raw);
}

function _isSharpenable(item) {
  if ( !isMeleeWeapon(item) ) return false;
  if ( getDegradationState(item).originalDenomination ) return false; // damaged — repair first
  const types = _damageTypes(item);
  if ( ![...types].some(t => SHARPENABLE_DAMAGE_TYPES.has(t)) ) return false;
  return isAddonCompatible(item, ADDON_DEFS.naostrzenie) === null;
}

function _isRepairable(item) {
  return isMeleeWeapon(item) && !!getDegradationState(item).originalDenomination;
}

/** @returns {Item5e[]} */
export function getSharpenableWeapons(actor) {
  return actor.items.filter(_isSharpenable);
}

/** @returns {Item5e[]} */
export function getRepairableWeapons(actor) {
  return actor.items.filter(_isRepairable);
}

/* ============================================================
 * Check gate
 * ============================================================ */

/** No actor context (e.g. sheet preview of an unowned item) never blocks. */
function _canActOn(activity, getWeapons) {
  const actor = activity.actor;
  if ( !actor ) return true;
  return getWeapons(actor).length > 0;
}

async function _pickAndTag(activity, cfg) {
  const actor = activity.actor;
  if ( !actor ) return; // nothing to gate without an owner

  const weapons = cfg.getWeapons(actor);
  if ( !weapons.length ) {
    ui.notifications.warn(cfg.emptyWarning);
    return false;
  }

  let weapon = weapons[0];
  if ( weapons.length > 1 ) {
    weapon = await _pickWeaponDialog(weapons, cfg);
    if ( !weapon ) return false; // dismissed
  }

  return { data: { flags: { [MODULE_ID]: { kowalaAction: cfg.kind, kowalaWeapon: weapon.uuid } } } };
}

/** Same shape as the "Wytrącenie" held-item picker in combat/melee-maneuvers.mjs. */
async function _pickWeaponDialog(weapons, { dialogTitle, dialogHint }) {
  const options = weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join("");
  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title: dialogTitle },
    content: `<p>${dialogHint}</p><select name="weapon">${options}</select>`,
    ok: {
      label: "Wybierz",
      callback: (event, button) => button.form.elements.weapon.value
    },
    rejectClose: false
  });
  if ( !id ) return null;
  return weapons.find(w => w.id === id) ?? null;
}

/* ============================================================
 * Outcome
 * ============================================================ */

async function _onToolCheckRolled({ actor, rolls, message }) {
  const kowalaAction = message?.getFlag?.(MODULE_ID, "kowalaAction");
  if ( !kowalaAction ) return;

  const weaponUuid = message.getFlag(MODULE_ID, "kowalaWeapon");
  const weapon = weaponUuid ? fromUuidSync(weaponUuid) : null;
  if ( !weapon ) return;

  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if ( !roll ) return; // roll dialog was cancelled

  if ( !roll.isSuccess ) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p>Bez skutku — <strong>${weapon.name}</strong> pozostaje bez zmian.</p>`
    });
    return;
  }

  if ( kowalaAction === "naostrzenie" ) await installAddonById(weapon, "naostrzenie");
  else if ( kowalaAction === "naprawa" ) await repairWeapon(weapon, { chat: true });
}
