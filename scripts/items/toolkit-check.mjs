/**
 * Neuroshima 5e — Toolkit checks always roll for the OWNER.
 *
 * dnd5e's `check` activity rolls its ability/tool check for the current SCENE TARGETS
 * (falling back to the user's assigned character), not for the actor that owns the item.
 * That is correct for "everyone make a check" effects, but wrong for a personal tool kit:
 * clicking your ślusarz kit while an enemy is targeted would roll the lock-pick check for
 * the ENEMY (who owns no kit → the availability note reads "brak zestawu").
 *
 * Here we intercept the use of any tool-kit `check` activity and instead roll the tool
 * check for the item's own actor, with the activity's DC. This also collapses the old
 * card→button→roll flow into a single click, and makes the "Narzędzia: …" note accurate.
 *
 * Kits with `nativeCheck: true` in TOOLKITS (kowala, so far — see toolkits-data.mjs)
 * are generated with the `neuroToolCheck` activity type instead of stock `check`
 * (see toolkit-check-activity.mjs), which fixes the SAME owner-resolution problem
 * without cancelling dnd5e's activation flow — so the stock chevron chat card, roll
 * buttons and dialog are preserved. `_isToolkitCheck` below only matches `type ===
 * "check"`, so those kits are automatically skipped here — no explicit exclusion
 * needed. As kits graduate to `nativeCheck: true` this hook's reach shrinks; once
 * all 22 have graduated, this whole file can be retired.
 */

const MODULE_ID = "neuroshima-2026-overrides";

export function registerToolkitChecks() {
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  console.log("Neuroshima 5e | Toolkit checks (owner rolls) registered");
}

/** A `check` activity living on one of our tool-kit items. */
function _isToolkitCheck(activity) {
  if ( activity?.type !== "check" ) return false;
  const item = activity.item;
  if ( item?.type !== "tool" ) return false;
  const baseItem = item.system?.type?.baseItem;
  return !!baseItem && (baseItem in (CONFIG.DND5E.tools ?? {}));
}

function _onPreUseActivity(activity, _usageConfig, _dialogConfig, _messageConfig) {
  if ( !_isToolkitCheck(activity) || !activity.actor ) return;
  // Roll for the owner, then cancel dnd5e's default (target-based) usage flow.
  _rollOwnerToolCheck(activity);
  return false;
}

async function _rollOwnerToolCheck(activity) {
  const actor = activity.actor;
  const item  = activity.item;
  const tool  = item.system.type.baseItem;
  const ability = activity.check?.ability || item.system.ability || CONFIG.DND5E.tools[tool]?.ability;

  const dcFormula = activity.check?.dc?.formula;
  const dc = dcFormula ? Number(dcFormula) : null;
  const flavor = `${activity.name}${Number.isFinite(dc) && dc ? ` (ST ${dc})` : ""}`;

  await actor.rollToolCheck(
    { tool, ability, ...(Number.isFinite(dc) && dc ? { target: dc } : {}) },
    {},
    { data: { flavor } }
  );
}
