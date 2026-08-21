/**
 * Neuroshima 5e — stateful class abilities (Berserk, Kondycha, …).
 *
 * A "stateful" ability is one that turns ON and persists, as opposed to a one-shot
 * roll. It is declared in `class-features-data.mjs` via the `toggle` field:
 *
 *   toggle: {
 *     effect: "neuro-berserk",
 *     duration: { rounds: 10 },
 *     breaksOn: ["unconscious", "incapacitated", "charmed"],
 *     afterEnd: "noActionNextTurn"
 *   }
 *
 * Turning it on: spends one use, creates an ActiveEffect, fires scrolling text,
 * and swaps the hotbar macro art (handled by ability-hotbar.mjs, which listens for
 * the `neuroshima.classStateChanged` hook).
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Visual/behavioural config per state, keyed by the toggle's `effect` id. */
const STATE_CONFIG = {
  "neuro-berserk": {
    label: "Berserk",
    icon: "icons/svg/blood.svg",
    tint: "#8b1a1a",
    scrollText: { text: "BERSERK!", color: "#c0392b" },
    endText: { text: "Koniec Berserku", color: "#7f8c8d" },
    changes: [
      // Obłęd Berserkera — +mod SIŁ to TT while unarmoured. dnd5e evaluates this
      // against the actor's roll data; the armour condition is enforced in
      // `_berserkAcBonus` below, which zeroes it out when armour is worn.
      { key: "system.attributes.ac.bonus", mode: 2, value: "0", priority: 30 }
    ]
  },
  "neuro-kondycha": {
    label: "Kondycha",
    icon: "icons/svg/shield.svg",
    tint: "#1f6f8b",
    scrollText: { text: "KONDYCHA", color: "#2980b9" },
    endText: null,
    changes: []
  }
};

/* -------------------------------------------- */
/*  Public API                                   */
/* -------------------------------------------- */

/** Is the given state currently active on the actor? */
export function isStateActive(actor, effectId) {
  return !!actor?.effects?.find(e => e.getFlag(MODULE_ID, "classState") === effectId);
}

/** All active Neuroshima class states on an actor. */
export function activeStates(actor) {
  return (actor?.effects ?? [])
    .map(e => e.getFlag(MODULE_ID, "classState"))
    .filter(Boolean);
}

/**
 * Toggle a stateful ability on or off.
 * @param {Actor5e} actor
 * @param {string} abilityId       key in CLASS_FEATURES
 * @param {object} [options]
 * @param {boolean} [options.spendUse=true]  consume one use when switching on
 * @returns {Promise<boolean|null>} the new state, or null if it could not change
 */
export async function toggleClassState(actor, abilityId, { spendUse = true } = {}) {
  const feature = CLASS_FEATURES[abilityId];
  const toggle = feature?.toggle;
  if (!toggle) return null;

  const effectId = toggle.effect;
  const existing = actor.effects.find(e => e.getFlag(MODULE_ID, "classState") === effectId);

  if (existing) {
    await existing.delete();
    return false;
  }

  // Find the backing item so we can spend a use.
  const item = _findAbilityItem(actor, abilityId);
  if (spendUse && item?.system.uses?.max) {
    const uses = item.system.uses;
    const remaining = (uses.max ?? 0) - (uses.spent ?? 0);
    if (remaining <= 0) {
      ui.notifications?.warn(`${feature.label}: brak dostępnych użyć.`);
      return null;
    }
    await item.update({ "system.uses.spent": (uses.spent ?? 0) + 1 });
  }

  const cfg = STATE_CONFIG[effectId] ?? { label: feature.label, changes: [] };
  const changes = foundry.utils.deepClone(cfg.changes ?? []);

  if (effectId === "neuro-berserk") {
    const bonus = _berserkAcBonus(actor);
    const acChange = changes.find(c => c.key === "system.attributes.ac.bonus");
    if (acChange) acChange.value = String(bonus);
  }

  const duration = {};
  if (toggle.duration?.rounds) {
    duration.rounds = toggle.duration.rounds;
    if (game.combat) duration.startRound = game.combat.round;
  }

  await ActiveEffect.create({
    name: cfg.label,
    img: cfg.icon ?? item?.img ?? "icons/svg/upgrade.svg",
    tint: cfg.tint ?? null,
    origin: item?.uuid ?? actor.uuid,
    duration,
    changes,
    flags: {
      [MODULE_ID]: {
        classState: effectId,
        abilityId,
        breaksOn: toggle.breaksOn ?? [],
        afterEnd: toggle.afterEnd ?? null
      }
    }
  }, { parent: actor });

  if (cfg.scrollText) {
    seqScrollText?.(cfg.scrollText.text, actor.getActiveTokens?.()[0], { color: cfg.scrollText.color });
  }

  return true;
}

/* -------------------------------------------- */
/*  Internals                                    */
/* -------------------------------------------- */

function _findAbilityItem(actor, abilityId) {
  return actor.items.find(i => i.getFlag(MODULE_ID, "abilityId") === abilityId) ?? null;
}

/**
 * Obłęd Berserkera: TT += mod SIŁ, but only with no armour, helmet or shield.
 * Returns 0 when armoured so the effect is inert rather than absent — keeping the
 * change present means re-equipping does not require re-applying the effect.
 */
function _berserkAcBonus(actor) {
  const wearing = actor.items.some(i =>
    (i.type === "equipment")
    && i.system.equipped
    && ["light", "medium", "heavy", "shield"].includes(i.system.type?.value));
  return wearing ? 0 : (actor.system.abilities?.str?.mod ?? 0);
}

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerClassState() {
  // Break states when an interrupting condition lands.
  Hooks.on("createActiveEffect", async (effect, _opts, userId) => {
    if (game.user.id !== userId) return;
    const actor = effect.parent;
    if (!(actor instanceof Actor)) return;

    const status = effect.statuses?.first?.() ?? [...(effect.statuses ?? [])][0];
    if (!status) return;

    for (const state of actor.effects) {
      const breaks = state.getFlag(MODULE_ID, "breaksOn");
      if (breaks?.includes(status)) {
        const abilityId = state.getFlag(MODULE_ID, "abilityId");
        await state.delete();
        ui.notifications?.info(
          `${CLASS_FEATURES[abilityId]?.label ?? "Stan"} przerwany przez: ${status}.`);
      }
    }
  });

  // Expire states whose duration has run out, and announce the end.
  Hooks.on("updateCombat", async (combat, changed) => {
    if (!game.user.isGM) return;
    if (!("round" in changed) && !("turn" in changed)) return;

    for (const combatant of combat.combatants) {
      const actor = combatant.actor;
      if (!actor) continue;
      for (const effect of [...actor.effects]) {
        const stateId = effect.getFlag(MODULE_ID, "classState");
        if (!stateId) continue;
        if (effect.duration?.remaining !== null && effect.duration?.remaining <= 0) {
          const cfg = STATE_CONFIG[stateId];
          await effect.delete();
          if (cfg?.endText) {
            seqScrollText?.(cfg.endText.text, combatant.token?.object, { color: cfg.endText.color });
          }
          if (effect.getFlag(MODULE_ID, "afterEnd") === "noActionNextTurn") {
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content: `<p><strong>${actor.name}</strong> wychodzi z Berserku — zmęczenie sprawia, `
                + `że nie wykonuje żadnej akcji do końca swojej następnej tury.</p>`
            });
          }
        }
      }
    }
  });

  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.classState = { toggleClassState, isStateActive, activeStates };
  }

  console.log(`${MODULE_ID} | Class state layer registered`);
}
