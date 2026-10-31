/**
 * Neuroshima 5e — Przerzuty: Forsowanie & Fuks
 *
 * Two reroll mechanics shown as subtle buttons under d20 test results. Since PLAN_m7 E0 (2026-10-31) both are
 * **sources of the post-roll registry** (`combat/po-rzucie.mjs`): the bar, the roll chain, "superseded" cards and
 * the hook live there; this file keeps what is theirs — eligibility, the confirmation dialogs, the roll and the cost.
 *
 * FORSOWANIE (Pushing a Test):
 *   - Eligible: skill, ability, tool checks (NOT attacks, NOT saves)
 *   - Reroll: k20 + full ability SCORE (not modifier, not proficiency)
 *   - Cost: +1 Wyczerpanie (automatic, regardless of result)
 *   - Always available if world setting is enabled
 *
 * FUKS (Lucky Break):
 *   - Eligible: ALL d20 rolls (attacks, saves, skill/ability/tool checks)
 *   - Reroll: same formula as the chain's original roll (new dice, same modifiers; U2 — added dice are lost)
 *   - Cost: 1 Fuks (consumable resource, max 3 per character)
 *   - Greyed out when character has 0 Fuksy
 *   - New result must be accepted
 *   - Source: Fanty items, abilities, GM rewards
 *
 * Both are a Przerzut — by definition a retry of a **failed** Test k20 (s. 16; Fuks s. 17): with a known ST/TT the
 * buttons hide after a success, without one they stay (registry rule, `config/po-rzucie-rules.mjs`). After any
 * reroll in the chain neither comes back. Both require a confirmation dialog before use.
 *
 * HOOK `neuroshima.rerolled` (alias of `neuroshima.rollModified`) — `combat/po-rzucie.mjs` fires it after every
 * modification, so whatever was waiting on the source roll can re-resolve against the new total. The crafting final
 * Test (`production/robota.mjs`) was the first listener: its source message carries `flags.<mod>.robotaTest`, and a
 * reroll that meets the ST finishes the Robota (PLAN_produkcja D2).
 */

import { addExhaustion } from "../config/exhaustion.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";
import { jestTowarzyszem } from "../actors/towarzysze.mjs";
import { MAX_FUKSY } from "../config/fuksy-rules.mjs";
import { liczbaFuksow, zuzyjFuksa, przyznajFuksa, ustawLiczbeFuksow } from "../actors/fuksy.mjs";
import { TESTY_K20, TESTY_CECHY } from "../config/po-rzucie-rules.mjs";
import { zarejestrujZrodloPoRzucie } from "./po-rzucie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** RAW cap: a character can hold at most three Fuksy. */
export { MAX_FUKSY };

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerRerolls() {
  game.settings.register(MODULE_ID, "forsowanieEnabled", {
    name: "Forsowanie (Opcjonalne)",
    hint: "Pozwala graczom forsować nieudane testy cech/umiejętności/narzędzi. Przerzut używa k20 + pełna wartość cechy. Automatycznie nakłada 1 Wyczerpanie.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  zarejestrujZrodloPoRzucie(FORSOWANIE);
  zarejestrujZrodloPoRzucie(FUKS);

  console.log("Neuroshima 5e | Przerzuty (Forsowanie + Fuks) registered");
}

/* -------------------------------------------- */
/*  Fuks Management                              */
/* -------------------------------------------- */

/**
 * Get the current Fuks count for an actor.
 * @param {Actor} actor
 * @returns {number} 0 to MAX_FUKSY
 */
export function getFuksy(actor) {
  return liczbaFuksow(actor);
}

/**
 * Set the Fuks count for an actor (clamped to 0..MAX_FUKSY).
 * @param {Actor} actor
 * @param {number} count
 * @returns {Promise<number>} New count
 */
export async function setFuksy(actor, count) {
  // Fuksy v2 (PLAN_m5_postoj U24): lista z pochodzeniem i terminem — licznik tylko dla zgodności.
  return ustawLiczbeFuksow(actor, count);
}

/**
 * Grant one Fuks to an actor (e.g. from a Fant item or GM reward).
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.chat=true]
 * @returns {Promise<number>} New count
 */
export async function addFuks(actor, { chat = true } = {}) {
  const current = getFuksy(actor);
  if (current >= MAX_FUKSY) {
    if (chat) ui.notifications.warn(`${actor.name} ma już maksymalną liczbę Fuksów (${MAX_FUKSY}).`);
    return current;
  }
  await przyznajFuksa(actor, "mg", { karta: false });
  const newCount = getFuksy(actor);
  if (chat) {
    await ChatMessage.create({
      content: `<div style="border-left: 4px solid #27ae60; background: rgba(39, 174, 96, 0.08); padding: 6px 8px; border-radius: 0 4px 4px 0;">
        <strong>${actor.name}</strong> otrzymuje Fuksa! (${newCount}/${MAX_FUKSY}) 🍀
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }
  return newCount;
}

/** BG — nie towarzysz: „Fant daje Fuksa bohaterowi” (D5 M3). */
function _isPlayerCharacter(actor) {
  return actor?.type === "character" && !jestTowarzyszem(actor);
}

/** Pasek widzi tylko właściciel bohatera, którego to rzut (jak przed rejestrem). */
function _wlascicielBohatera(ctx) {
  return !!ctx.actor?.isOwner && _isPlayerCharacter(ctx.actor);
}

/**
 * Extract the ability key used in a roll, from dnd5e roll flags.
 */
function _getAbilityKey(rollData, actor) {
  if (rollData.type === "ability") return rollData.ability;
  if (rollData.type === "skill") {
    const skillId = rollData.skillId;
    return actor.system.skills?.[skillId]?.ability;
  }
  if (rollData.type === "tool") return rollData.ability;
  return null;
}

/**
 * Build a human-readable description of what a roll tested.
 */
function _describeRoll(rollData, roll) {
  if (!rollData) return roll?.formula ?? "k20";

  switch (rollData.type) {
    case "attack": return "Atak";
    case "save": {
      const abl = CONFIG.DND5E.abilities?.[rollData.ability]?.label ?? rollData.ability;
      return `RO na ${abl}`;
    }
    case "skill": {
      const skillId = rollData.skillId;
      return CONFIG.DND5E.skills?.[skillId]?.label ?? skillId;
    }
    case "ability": {
      const abl = CONFIG.DND5E.abilities?.[rollData.ability]?.label ?? rollData.ability;
      return `Test ${abl}`;
    }
    case "tool": return "Test narzędzi";
    default: return roll?.formula ?? "k20";
  }
}

/* -------------------------------------------- */
/*  Forsowanie                                   */
/* -------------------------------------------- */

const FORSOWANIE = Object.freeze({
  id: "forsowanie",
  label: "⚡ Forsuj",
  klasa: "forsuj-btn",
  kolejnosc: 10,
  typy: TESTY_CECHY,
  przerzut: true,
  wynik: "porazka",
  styl: { background: "rgba(230, 126, 34, 0.15)", border: "1px solid rgba(230, 126, 34, 0.4)", color: "#e67e22", cursor: "pointer" },

  ocen(ctx) {
    if (!game.settings.get(MODULE_ID, "forsowanieEnabled")) return { stan: "ukryty" };
    if (!_wlascicielBohatera(ctx)) return { stan: "ukryty" };
    const key = _getAbilityKey(ctx.info, ctx.actor);
    const score = key ? ctx.actor.system.abilities[key]?.value : undefined;
    if (score === undefined) return { stan: "ukryty" };
    return { stan: "aktywny", etykieta: `⚡ Forsuj (k20+${score})` };
  },

  async wykonaj(ctx) {
    const actor = ctx.actor;
    const abilityKey = _getAbilityKey(ctx.info, actor);
    const abilityLabel = CONFIG.DND5E.abilities[abilityKey]?.label ?? abilityKey;
    const abilityScore = Number(actor.system.abilities[abilityKey]?.value);

    const currentExhaustion = actor.system.attributes?.exhaustion ?? 0;
    const deathWarning = currentExhaustion >= 5
      ? `<p style="color: #e74c3c; font-weight: bold;">⚠ Kolejny poziom Wyczerpania oznacza ŚMIERĆ!</p>`
      : "";

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Forsowanie" },
      content: `
        <div style="padding: 4px 0;">
          <p><strong>${actor.name}</strong> forsuje test.</p>
          <p>Przerzut: <strong>k20 + ${abilityLabel} (${abilityScore})</strong></p>
          <p style="color: #e67e22; font-weight: bold;">
            Koszt: +1 Wyczerpanie (${currentExhaustion} → ${currentExhaustion + 1}/6)
          </p>
          ${deathWarning}
        </div>
      `,
      yes: { icon: "fas fa-bolt", label: "Forsuj!" },
      no: { icon: "fas fa-times", label: "Anuluj", default: true },
      rejectClose: false
    });
    if (!confirmed) return null;

    // Roll k20 + full ability score
    const roll = await new Roll("1d20 + @score", { score: abilityScore }).evaluate();
    return {
      roll,
      flavor: `
        <div style="border-left: 4px solid #e67e22; background: rgba(230, 126, 34, 0.08); padding: 6px 8px; border-radius: 0 4px 4px 0; margin-bottom: 4px;">
          <div style="font-weight: bold; color: #e67e22; font-size: 13px; margin-bottom: 2px;">⚡ FORSOWANIE</div>
          <div style="font-size: 11px; color: var(--color-text-secondary, #aaa);">Test ${abilityLabel} — k20 + ${abilityScore}</div>
        </div>
      `,
      flags: { forsowanie: true },
      poWiadomosci: () => addExhaustion(actor, "forsowanie")
    };
  }
});

/* -------------------------------------------- */
/*  Fuks                                         */
/* -------------------------------------------- */

const FUKS = Object.freeze({
  id: "fuks",
  label: "🍀 Fuks",
  klasa: "fuks-btn",
  kolejnosc: 20,
  typy: TESTY_K20,
  przerzut: true,
  wynik: "porazka",
  styl: { background: "rgba(39, 174, 96, 0.15)", border: "1px solid rgba(39, 174, 96, 0.4)", color: "#27ae60", cursor: "pointer" },
  stylSzary: { background: "rgba(128, 128, 128, 0.08)", border: "1px solid rgba(128, 128, 128, 0.2)", color: "#666", cursor: "default", opacity: "0.5" },

  ocen(ctx) {
    if (!_wlascicielBohatera(ctx)) return { stan: "ukryty" };
    const fuksy = getFuksy(ctx.actor);
    if (fuksy <= 0) return { stan: "szary", powod: "Brak Fuksów", etykieta: `🍀 Fuks (${fuksy})` };
    return { stan: "aktywny", etykieta: `🍀 Fuks (${fuksy})` };
  },

  async wykonaj(ctx) {
    const actor = ctx.actor;
    const fuksy = getFuksy(actor);
    if (fuksy <= 0) return null;

    // Przerzut liczy rzut od nowa z formuły rzutu pierwotnego łańcucha (U2).
    const originalRoll = ctx.root?.rolls?.[0] ?? ctx.roll;
    const rollDesc = _describeRoll(ctx.info, originalRoll);

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Fuks" },
      content: `
        <div style="padding: 4px 0;">
          <p><strong>${actor.name}</strong> używa Fuksa!</p>
          <p>Przerzut: <strong>${rollDesc}</strong> (${originalRoll.formula})</p>
          <p style="color: #27ae60; font-weight: bold;">
            Koszt: 1 Fuks (${fuksy} → ${fuksy - 1}/${MAX_FUKSY})
          </p>
          <p style="font-size: 11px; color: var(--color-text-secondary, #aaa);">Nowy wynik musisz zaakceptować.</p>
        </div>
      `,
      yes: { icon: "fas fa-dice", label: "Użyj Fuksa!" },
      no: { icon: "fas fa-times", label: "Anuluj", default: true },
      rejectClose: false
    });
    if (!confirmed) return null;

    // Reroll with the same formula and data
    const roll = await new Roll(originalRoll.formula, originalRoll.data ?? {}).evaluate();
    return {
      roll,
      flavor: `
        <div style="border-left: 4px solid #27ae60; background: rgba(39, 174, 96, 0.08); padding: 6px 8px; border-radius: 0 4px 4px 0; margin-bottom: 4px;">
          <div style="font-weight: bold; color: #27ae60; font-size: 13px; margin-bottom: 2px;">🍀 FUKS</div>
          <div style="font-size: 11px; color: var(--color-text-secondary, #aaa);">${rollDesc} — przerzut</div>
        </div>
      `,
      flags: { fuks: true },
      poWiadomosci: async () => {
        // Zużyj Fuksa, który wygasa najwcześniej (Fuksy v2, U24).
        await zuzyjFuksa(actor);
        seqScrollText("FUKS!", actor, { color: "#2ecc71", fontSize: 36, duration: 2000 });
      }
    };
  }
});
