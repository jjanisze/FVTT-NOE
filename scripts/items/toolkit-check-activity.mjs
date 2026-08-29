/**
 * Neuroshima 5e — native "check" Activity for personal tool kits.
 *
 * Stock dnd5e's `check` Activity click-handler (`CheckActivity.#rollCheck`, private,
 * dnd5e/module/documents/activity/check.mjs) resolves WHO rolls via
 * `getSceneTargets()` — i.e. whatever token(s) are currently *controlled* on the
 * canvas, falling back to the clicking user's assigned character. That's correct for
 * a Check activity used as a generic "impose a check on others" primitive (a trap, a
 * hazard, an NPC feature) — but wrong for a personal tool kit: clicking your own
 * kowal kit while some other token happens to be controlled (very common for a GM
 * flipping between NPC sheets) rolls the check for the WRONG actor, not the kit's
 * owner.
 *
 * `getSceneTargets(actor)` already supports exactly the fix we need — pass it the
 * item's own actor and it resolves that actor's token regardless of what else is
 * controlled. Stock `#rollCheck` just never passes it. Rather than cancel dnd5e's
 * entire activation pipeline (the old approach, see toolkit-check.mjs), we subclass
 * `CheckActivity` and override ONLY the `rollCheck` chat-card action — everything
 * else (the usage dialog, the collapsible chat card, the per-DC buttons, the
 * ability/activation/duration pills) is inherited unchanged from dnd5e, so a
 * toolkit item using this activity type looks and behaves exactly like a stock
 * tool (Cobbler's Tools, Smith's Tools, …).
 *
 * This mirrors the existing pattern in scripts/weapons/fire-modes.mjs and
 * scripts/weapons/magazine.mjs (subclass a base dnd5e Activity, register it under a
 * new key in CONFIG.DND5E.activityTypes) — nothing new architecturally.
 *
 * ## Check gates (per-action pre-roll hooks)
 *
 * Some kit actions need more than a bare check — kowal's "Naostrzenie broni" and
 * "Naprawa zdegradowanej broni białej" first need to know WHICH weapon the check
 * applies to, offer a picker when there's more than one candidate, and block the
 * roll outright (before any chat card even appears) when there is nothing eligible
 * to act on. `registerCheckGate(key, gate)` lets a kit-specific module (e.g.
 * `items/toolkit-kowal.mjs`) hook into that, keeping THIS file generic:
 *
 *   - an activity opts in via `flags.<module>.checkGate = "<key>"` (set in
 *     `_buildCheckActivity` from a `gate` on its `ToolkitAction` entry);
 *   - `gate.canUse(activity)` is a synchronous eligibility check — wired into
 *     `canUse` below, it makes an action with nothing to act on disappear from the
 *     item-choice dialog (and block a single-activity item click) BEFORE any roll,
 *     satisfying "gate on the character sheet" for free;
 *   - `gate.run(activity)` runs at `use()` time (item click confirmed) — it may
 *     await an async picker dialog, then either return `false` (already warned;
 *     use() is aborted, no chat card, no roll) or a partial `message` config to
 *     merge in (e.g. stashing the chosen weapon's UUID as a flag on the usage
 *     card). That card is the one document shared between `use()` (now) and the
 *     later roll-button click (`rollCheck`, below) — see `neuroshima.toolCheckRolled`.
 */

const ACTIVITY_TYPE = "neuroToolCheck";
const MODULE_ID = "neuroshima-2026-overrides";

/** @type {Map<string, {canUse(activity): boolean, run(activity): Promise<false|object|void>}>} */
const CHECK_GATES = new Map();

/** Register a check gate under `key` (matched via `flags.<module>.checkGate`). */
export function registerCheckGate(key, gate) {
  CHECK_GATES.set(key, gate);
}

/** Resolve the gate (if any) an activity opted into. */
function _resolveGate(activity) {
  const key = activity.flags?.[MODULE_ID]?.checkGate;
  return key ? CHECK_GATES.get(key) : null;
}

export function registerToolkitCheckActivity() {
  if ( CONFIG.DND5E.activityTypes[ACTIVITY_TYPE] ) return;

  const BaseCheckActivity = CONFIG.DND5E.activityTypes.check?.documentClass;
  if ( !BaseCheckActivity ) {
    console.warn("Neuroshima 5e | Could not register toolkit check activity: missing base check activity");
    return;
  }

  class NeuroToolCheckActivity extends BaseCheckActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: ACTIVITY_TYPE,
      usage: {
        actions: {
          rollCheck: NeuroToolCheckActivity.rollCheck
        }
      }
    }, { inplace: false }));

    /**
     * Filters an ineligible gated action out of the item-choice dialog (and blocks a
     * single-activity item click) entirely — see the "Check gates" note above.
     * @override
     */
    get canUse() {
      if ( !super.canUse ) return false;
      const gate = _resolveGate(this);
      return !gate || (gate.canUse(this) !== false);
    }

    /**
     * Runs a registered check gate (if any) before the stock `use()` flow — see the
     * "Check gates" note above. The gate may block use entirely (returns `false`,
     * already notified the user) or hand back a partial `message` config to merge in
     * (e.g. tagging the usage card with a chosen weapon's UUID).
     * @override
     */
    async use(usage={}, dialog={}, message={}) {
      const gate = _resolveGate(this);
      if ( gate ) {
        const patch = await gate.run(this);
        if ( patch === false ) return;
        if ( patch && (typeof patch === "object") ) {
          message = foundry.utils.mergeObject(message, patch, { inplace: false });
        }
      }
      return super.use(usage, dialog, message);
    }

    /**
     * Identical to stock `CheckActivity`'s private `#rollCheck`, except the target
     * resolution is seeded with the item's own actor instead of scene selection, and
     * each per-target roll fires `neuroshima.toolCheckRolled` afterwards so a
     * gate-registering module can react to the outcome (see the "Check gates" note).
     * @this {NeuroToolCheckActivity}
     * @param {PointerEvent} event     Triggering click event.
     * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
     * @param {ChatMessage5e} message  Message associated with the activation.
     */
    static async rollCheck(event, target, message) {
      const getSceneTargets = globalThis.dnd5e.utils.getSceneTargets;
      const targets = getSceneTargets(this.item.actor);
      if ( !targets.length && game.user.character ) targets.push(game.user.character);
      if ( !targets.length ) ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });

      let { ability, dc, skill, tool } = target.dataset;
      dc = parseInt(dc);
      const rollData = { event, target: Number.isFinite(dc) ? dc : this.check.dc.value };
      if ( ability in CONFIG.DND5E.abilities ) rollData.ability = ability;

      for ( const token of targets ) {
        const actor = token instanceof Actor ? token : token.actor;
        const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: token.document });
        const messageData = { data: { speaker } };
        let rolls;
        if ( skill ) rolls = await actor.rollSkill({ ...rollData, skill }, {}, messageData);
        else if ( tool ) {
          rollData.tool = tool;
          if ( (this.item.type === "tool")
            && (!this.item.system.type.baseItem || (tool === this.item.system.type.baseItem)) ) {
            rollData.bonus = this.item.system.bonus;
            rollData.prof = this.item.system.prof;
            rollData.item = this.item;
          }
          rolls = await actor.rollToolCheck(rollData, {}, messageData);
        }
        else rolls = await actor.rollAbilityCheck(rollData, {}, messageData);

        /**
         * Fires once per target actor after a NeuroToolCheckActivity roll resolves. The
         * `message` here is the SAME usage card a `use()`-time gate (see
         * `registerCheckGate`) may have tagged with context flags — it's the one document
         * both phases of the two-step check-activity flow (use → later roll-button click)
         * share, so that's where a gate stashes e.g. which weapon was picked.
         * @event neuroshima.toolCheckRolled
         * @param {{activity: Activity, item: Item5e, actor: Actor5e, rolls: Roll[], dc: number, message: ChatMessage5e}} data
         */
        Hooks.callAll("neuroshima.toolCheckRolled", { activity: this, item: this.item, actor, rolls, dc: rollData.target, message });
      }
    }
  }

  CONFIG.DND5E.activityTypes[ACTIVITY_TYPE] = {
    documentClass: NeuroToolCheckActivity
  };

  console.log("Neuroshima 5e | Toolkit check activity registered (owner-resolved rollCheck, native UI)");
}

export { ACTIVITY_TYPE as TOOLKIT_CHECK_ACTIVITY_TYPE };
