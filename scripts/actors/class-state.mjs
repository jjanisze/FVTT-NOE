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

/**
 * Border/title colours shared by every module chat card (Forsowanie, Fuks, …).
 * `body` is the plain one-liner most cards use. `lead`/`items`/`pills` build the
 * richer layout Berserk's "on" card uses — modelled after stock Rage's own chat
 * card (paragraph lead, a bulleted breakdown of what it grants, a footer row of
 * short tags), just in this module's existing colour-bordered-div language
 * instead of dnd5e's native card chrome.
 *
 * Text colours use Foundry/dnd5e's own theme tokens (`--color-text-*`), not
 * fixed hex — the chat log carries its own `theme-light`/`theme-dark` class
 * independent of the rest of the UI (confirmed live: this world's chat log is
 * `theme-light`, near-white message background, while the app shell around it
 * is dark), so a fixed light-gray reads fine in one and is nearly invisible in
 * the other. `--color-text-primary`/`--color-text-secondary` flip with it; the
 * hex after the comma is only a fallback for the (Foundry-internal) case where
 * the variable is undefined.
 */
const CARD_STYLE = (color, { title, body, lead, items, pills }) => {
  const parts = [];
  const secondary = "color: var(--color-text-secondary, #888);";
  const primary = "color: var(--color-text-primary, #ccc);";
  if (body) parts.push(`<div style="font-size: 11px; ${secondary}">${body}</div>`);
  if (lead) parts.push(`<div style="font-size: 11px; margin-bottom: 4px; ${secondary}">${lead}</div>`);
  if (items?.length) {
    parts.push(`<ul style="margin: 0 0 4px 0; padding-left: 16px; font-size: 11px; ${primary}">`
      + items.map(i => `<li style="margin-bottom: 2px;">${i}</li>`).join("") + `</ul>`);
  }
  if (pills?.length) {
    parts.push(`<div style="font-size: 10px; margin-top: 2px; ${secondary}">`
      + pills.map(p => `<span style="background: rgba(128, 128, 128, 0.18); border-radius: 3px; `
        + `padding: 1px 6px; margin-right: 4px; display: inline-block;">${p}</span>`).join("")
      + `</div>`);
  }
  return `
  <div style="border-left: 4px solid ${color}; background: ${_rgba(color, 0.08)}; padding: 6px 8px; border-radius: 0 4px 4px 0;">
    <div style="font-weight: bold; color: ${color}; font-size: 13px; margin-bottom: 2px;">${title}</div>
    ${parts.join("")}
  </div>`;
};

function _rgba(hex, alpha) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
      { key: "system.attributes.ac.bonus", mode: 2, value: "0", priority: 30 },
      // Obrażenia Berserkera — extra damage die on Strength-based attacks (weapon
      // or unarmed), scaling with Brutal level. Same dnd5e bonus path (`mwak`)
      // stock Rage uses, and the same scope limitation: melee only, not thrown.
      { key: "system.bonuses.mwak.damage", mode: 2, value: "+@scale.brutal.obrazeniaBerserkera", priority: null },
      // Siła Berserkera — advantage on Strength checks and Strength saves.
      { key: "system.abilities.str.check.roll.mode", mode: 2, value: "1", priority: null },
      { key: "system.abilities.str.save.roll.mode", mode: 2, value: "1", priority: null }
    ],
    // Chat card copy for the on/off transition. `detail` may be a function of the
    // actor, for values that depend on level (the damage die).
    chatOn: {
      color: "#c0392b",
      title: "🩸 BERSERK",
      detail: actor => {
        const die = actor?.getRollData?.()?.scale?.brutal?.obrazeniaBerserkera ?? "?";
        const acBonus = _berserkAcBonus(actor);
        const acNote = acBonus > 0
          ? `TT +${acBonus} (bez pancerza, hełmu i tarczy).`
          : `TT +0 — nosisz pancerz, hełm lub tarczę, nieaktywne.`;
        return {
          lead: `${actor?.name ?? "Postać"} wpada w szał.`,
          items: [
            `<strong>Siła Berserkera</strong> — Ułatwienie w testach Siły i RO na Siłę.`,
            `<strong>Obrażenia Berserkera</strong> — +${die} do obrażeń ataków opartych na Sile.`,
            `<strong>Obłęd Berserkera</strong> — ${acNote}`,
            `<strong>Szarża Berserkera</strong> [B] — Przyspieszenie w Akcji Bonusowej do wroga, którego widzisz lub słyszysz.`
          ],
          pills: ["Akcja Bonusowa", "10 rund", "Cel: Ty"]
        };
      }
    },
    chatOff: {
      color: "#7f8c8d",
      title: "Koniec Berserku",
      detail: actor => `${actor?.name ?? "Postać"} wychodzi z Berserku.`
    }
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

/**
 * Post a styled chat card for a state transition, if the state config declares one.
 * `detail` may resolve to a plain string (rendered as `body`) or an object with
 * `lead`/`items`/`pills` for the richer layout — see `CARD_STYLE`.
 */
function _postStateCard(actor, cfg, phase) {
  const spec = phase === "on" ? cfg?.chatOn : cfg?.chatOff;
  if (!spec) return;
  const resolved = typeof spec.detail === "function" ? spec.detail(actor) : (spec.detail ?? "");
  const layout = typeof resolved === "string" ? { body: resolved } : resolved;
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: CARD_STYLE(spec.color, { title: spec.title, ...layout })
  });
}

/**
 * Announce a state ending, however it ended (manual toggle-off, an interrupting
 * condition, or the duration running out) — same scrollText + chat card in every
 * case, so the table always gets the same signal.
 */
function _announceEnd(actor, effectId, { token } = {}) {
  const cfg = STATE_CONFIG[effectId];
  if (!cfg) return;
  if (cfg.endText) {
    seqScrollText?.(cfg.endText.text, token ?? actor?.getActiveTokens?.()[0], { color: cfg.endText.color });
  }
  _postStateCard(actor, cfg, "off");
}

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
    _announceEnd(actor, effectId);
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
  _postStateCard(actor, cfg, "on");

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
  // Toggle abilities (Berserk, Kondycha) get a "utility" activity generated for
  // every feature with an action tag or limited uses (`build-packs.mjs`,
  // `buildFeature()`) — that generator has no concept of `toggle` abilities, so
  // it builds the same clickable-with-its-own-itemUses-consumption activity for
  // them as for anything else. The hotbar macro (`ability-hotbar.mjs`) already
  // special-cases `feature.toggle` to call `toggleClassState` directly instead
  // of `item.use()`, so it was never affected — but clicking the ability's own
  // "use" control on the character sheet (or any other native trigger of the
  // activity) goes straight through the generic activity: it happily spends a
  // real, Long-Rest-limited use and posts a plain description card, with **no**
  // AE, no scrollText, no styled card — i.e. it looks like nothing happened,
  // while quietly burning the resource. Caught live: two uses gone from a real
  // character (Piekarz) for zero mechanical effect.
  //
  // Fix: intercept before the native activity does anything, and redirect to
  // the same `toggleClassState` the hotbar already uses — so every entry point
  // ends up mechanically identical, not just the one this module built new UI
  // for.
  Hooks.on("dnd5e.preUseActivity", (activity, _usageConfig, _dialogConfig, _messageConfig) => {
    const item = activity?.item;
    const abilityId = item?.getFlag(MODULE_ID, "abilityId");
    const feature = abilityId ? CLASS_FEATURES[abilityId] : null;
    if (!feature?.toggle) return; // not a toggle ability — let the native activity run normally

    const actor = item.actor;
    if (actor) toggleClassState(actor, abilityId);
    return false; // cancel the native activity: no double consumption, no duplicate/plain card
  });

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
        const stateId = state.getFlag(MODULE_ID, "classState");
        await state.delete();
        ui.notifications?.info(
          `${CLASS_FEATURES[abilityId]?.label ?? "Stan"} przerwany przez: ${status}.`);
        _announceEnd(actor, stateId);
      }
    }
  });

  // A rest (short or long — Neuroshima's are 4h/24h, either one is far past
  // Berserk's 10-round duration) always ends any active toggle state. Nothing
  // else did this: duration-based expiry only ever runs off `updateCombat`
  // (round/turn changes), which a rest never triggers, so an active Berserk
  // effect would otherwise just sit there — active, mechanically, indefinitely
  // — until either a combat round ticked or someone noticed and toggled it off
  // by hand. Caught live: rested Piekarz twice with Berserk still active and it
  // never cleared. `dnd5e.restCompleted` fires once, client-side, only on
  // whoever actually triggered the rest — no isGM guard needed here the way
  // `updateCombat` needs one (that one fires on every connected client).
  Hooks.on("dnd5e.restCompleted", (actor) => {
    for (const effect of [...actor.effects]) {
      const stateId = effect.getFlag(MODULE_ID, "classState");
      if (!stateId) continue;
      effect.delete();
      _announceEnd(actor, stateId);
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
          const afterEnd = effect.getFlag(MODULE_ID, "afterEnd");
          await effect.delete();
          _announceEnd(actor, stateId, { token: combatant.token?.object });
          if (afterEnd === "noActionNextTurn") {
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content: CARD_STYLE("#e74c3c", {
                title: "⚠ Zmęczenie po Berserku",
                body: `${actor.name} nie wykonuje żadnej akcji do końca swojej następnej tury.`
              })
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
