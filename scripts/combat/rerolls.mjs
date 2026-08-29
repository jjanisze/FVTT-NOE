/**
 * Neuroshima 5e — Przerzuty: Forsowanie & Fuks
 *
 * Two reroll mechanics shown as subtle buttons under d20 test results.
 *
 * FORSOWANIE (Pushing a Test):
 *   - Eligible: skill, ability, tool checks (NOT attacks, NOT saves)
 *   - Reroll: k20 + full ability SCORE (not modifier, not proficiency)
 *   - Cost: +1 Wyczerpanie (automatic, regardless of result)
 *   - Always available if world setting is enabled
 *
 * FUKS (Lucky Break):
 *   - Eligible: ALL d20 rolls (attacks, saves, skill/ability/tool checks)
 *   - Reroll: same formula as original (new dice, same modifiers)
 *   - Cost: 1 Fuks (consumable resource, max 3 per character)
 *   - Greyed out when character has 0 Fuksy
 *   - New result must be accepted
 *   - Source: Fanty items, abilities, GM rewards
 *
 * Both require a confirmation dialog before use.
 * Chat messages for results have distinct colored styling.
 */

import { addExhaustion } from "../config/exhaustion.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** RAW cap: a character can hold at most three Fuksy. */
export const MAX_FUKSY = 3;

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

  Hooks.on("dnd5e.renderChatMessage", onRenderChatMessage);

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
  return actor.getFlag(MODULE_ID, "fuksy") ?? 0;
}

/**
 * Set the Fuks count for an actor (clamped to 0..MAX_FUKSY).
 * @param {Actor} actor
 * @param {number} count
 * @returns {Promise<number>} New count
 */
export async function setFuksy(actor, count) {
  const clamped = Math.max(0, Math.min(MAX_FUKSY, count));
  await actor.setFlag(MODULE_ID, "fuksy", clamped);
  return clamped;
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
  const newCount = await setFuksy(actor, current + 1);
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

function _isPlayerCharacter(actor) {
  return actor?.type === "character";
}

/* -------------------------------------------- */
/*  Chat Message — Button Injection              */
/* -------------------------------------------- */

/**
 * Hook: dnd5e.renderChatMessage
 * Injects subtle Forsuj / Fuks buttons under d20 roll results.
 */
function onRenderChatMessage(message, html) {
  const rollData = message.flags?.dnd5e?.roll;
  if (!rollData) return;

  // Skip reroll result messages and already-rerolled source messages
  if (message.flags?.[MODULE_ID]?.forsowanie) return;
  if (message.flags?.[MODULE_ID]?.fuks) return;
  if (message.flags?.[MODULE_ID]?.rerolled) return;

  // Re-render guard: don't duplicate bar
  if (html.querySelector(".neuroshima-reroll-bar")) return;

  const rollType = rollData.type;
  const forsowanieEnabled = game.settings.get(MODULE_ID, "forsowanieEnabled");
  const isForsowanieEligible = forsowanieEnabled
    && ["skill", "ability", "tool"].includes(rollType);
  const isFuksEligible = ["skill", "ability", "tool", "attack", "save"].includes(rollType);

  if (!isForsowanieEligible && !isFuksEligible) return;

  // Get actor
  const actorId = message.speaker?.actor;
  if (!actorId) return;
  const actor = game.actors.get(actorId);
  if (!actor?.isOwner || !_isPlayerCharacter(actor)) return;

  // Build the subtle reroll bar
  const bar = document.createElement("div");
  bar.classList.add("neuroshima-reroll-bar");
  Object.assign(bar.style, {
    display: "flex",
    gap: "6px",
    marginTop: "6px",
    justifyContent: "center",
    alignItems: "center"
  });

  // ---- Forsowanie button ----
  if (isForsowanieEligible) {
    const abilityKey = _getAbilityKey(rollData, actor);
    if (abilityKey) {
      const abilityLabel = CONFIG.DND5E.abilities[abilityKey]?.label ?? abilityKey;
      const abilityScore = actor.system.abilities[abilityKey]?.value;

      if (abilityScore !== undefined) {
        const btn = document.createElement("button");
        btn.classList.add("forsuj-btn");
        btn.dataset.actorId = actorId;
        btn.dataset.messageId = message.id;
        btn.dataset.ability = abilityKey;
        btn.dataset.abilityScore = String(abilityScore);
        btn.dataset.abilityLabel = abilityLabel;
        Object.assign(btn.style, {
          fontSize: "11px",
          padding: "2px 8px",
          background: "rgba(230, 126, 34, 0.15)",
          border: "1px solid rgba(230, 126, 34, 0.4)",
          borderRadius: "3px",
          color: "#e67e22",
          cursor: "pointer",
          fontWeight: "normal",
          lineHeight: "1.4"
        });
        btn.textContent = `⚡ Forsuj (k20+${abilityScore})`;
        btn.addEventListener("click", _onClickForsowanie);
        bar.appendChild(btn);
      }
    }
  }

  // ---- Fuks button ----
  if (isFuksEligible) {
    const fuksy = getFuksy(actor);
    const hasFuksy = fuksy > 0;
    const btn = document.createElement("button");
    btn.classList.add("fuks-btn");
    btn.dataset.actorId = actorId;
    btn.dataset.messageId = message.id;
    Object.assign(btn.style, {
      fontSize: "11px",
      padding: "2px 8px",
      borderRadius: "3px",
      fontWeight: "normal",
      lineHeight: "1.4",
      background: hasFuksy ? "rgba(39, 174, 96, 0.15)" : "rgba(128, 128, 128, 0.08)",
      border: hasFuksy ? "1px solid rgba(39, 174, 96, 0.4)" : "1px solid rgba(128, 128, 128, 0.2)",
      color: hasFuksy ? "#27ae60" : "#666",
      cursor: hasFuksy ? "pointer" : "default",
      opacity: hasFuksy ? "1" : "0.5"
    });
    btn.textContent = `🍀 Fuks (${fuksy})`;
    if (hasFuksy) {
      btn.addEventListener("click", _onClickFuks);
    } else {
      btn.disabled = true;
      btn.setAttribute("data-tooltip", "Brak Fuksów");
    }
    bar.appendChild(btn);
  }

  const content = html.querySelector(".message-content") ?? html;
  content.appendChild(bar);
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
function _describeRoll(message) {
  const rollData = message.flags?.dnd5e?.roll;
  if (!rollData) return message.rolls?.[0]?.formula ?? "k20";

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
    default: return message.rolls?.[0]?.formula ?? "k20";
  }
}

/* -------------------------------------------- */
/*  Forsowanie — Confirmation & Execution        */
/* -------------------------------------------- */

async function _onClickForsowanie(event) {
  event.preventDefault();
  event.stopPropagation();
  const btn = event.currentTarget;
  const { actorId, messageId, abilityScore: scoreStr, abilityLabel } = btn.dataset;
  const abilityScore = Number(scoreStr);

  const actor = game.actors.get(actorId);
  if (!actor || !_isPlayerCharacter(actor)) return;

  const currentExhaustion = actor.system.attributes?.exhaustion ?? 0;
  const deathWarning = currentExhaustion >= 5
    ? `<p style="color: #e74c3c; font-weight: bold;">⚠ Kolejny poziom Wyczerpania oznacza ŚMIERĆ!</p>`
    : "";

  // Confirmation dialog
  const confirmed = await new Promise(resolve => {
    new Dialog({
      title: "Forsowanie",
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
      buttons: {
        yes: {
          icon: '<i class="fas fa-bolt"></i>',
          label: "Forsuj!",
          callback: () => resolve(true)
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "Anuluj",
          callback: () => resolve(false)
        }
      },
      default: "no",
      close: () => resolve(false)
    }).render(true);
  });

  if (!confirmed) return;

  // Disable the entire bar immediately
  const bar = btn.closest(".neuroshima-reroll-bar");
  if (bar) bar.querySelectorAll("button").forEach(b => { b.disabled = true; });
  btn.textContent = "⚡ Forsowanie...";

  // Roll k20 + full ability score
  const roll = new Roll("1d20 + @score", { score: abilityScore });
  await roll.evaluate();

  // Styled chat message with amber border
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <div style="border-left: 4px solid #e67e22; background: rgba(230, 126, 34, 0.08); padding: 6px 8px; border-radius: 0 4px 4px 0; margin-bottom: 4px;">
        <div style="font-weight: bold; color: #e67e22; font-size: 13px; margin-bottom: 2px;">⚡ FORSOWANIE</div>
        <div style="font-size: 11px; color: var(--color-text-secondary, #aaa);">Test ${abilityLabel} — k20 + ${abilityScore}</div>
      </div>
    `,
    flags: { [MODULE_ID]: { forsowanie: true } }
  });

  // Apply exhaustion
  await addExhaustion(actor, "forsowanie");

  // Mark source message as rerolled (prevents re-adding buttons)
  const originalMessage = game.messages.get(messageId);
  if (originalMessage) {
    await originalMessage.update({ [`flags.${MODULE_ID}.rerolled`]: true });
  }

  bar?.remove();
}

/* -------------------------------------------- */
/*  Fuks — Confirmation & Execution              */
/* -------------------------------------------- */

async function _onClickFuks(event) {
  event.preventDefault();
  event.stopPropagation();
  const btn = event.currentTarget;
  const { actorId, messageId } = btn.dataset;

  const actor = game.actors.get(actorId);
  if (!actor || !_isPlayerCharacter(actor)) return;

  const fuksy = getFuksy(actor);
  if (fuksy <= 0) return;

  const originalMessage = game.messages.get(messageId);
  if (!originalMessage?.rolls?.length) {
    ui.notifications.error("Nie znaleziono rzutu do przerzucenia.");
    return;
  }

  const originalRoll = originalMessage.rolls[0];
  const rollDesc = _describeRoll(originalMessage);

  // Confirmation dialog
  const confirmed = await new Promise(resolve => {
    new Dialog({
      title: "Fuks",
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
      buttons: {
        yes: {
          icon: '<i class="fas fa-dice"></i>',
          label: "Użyj Fuksa!",
          callback: () => resolve(true)
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "Anuluj",
          callback: () => resolve(false)
        }
      },
      default: "no",
      close: () => resolve(false)
    }).render(true);
  });

  if (!confirmed) return;

  // Disable the entire bar immediately
  const bar = btn.closest(".neuroshima-reroll-bar");
  if (bar) bar.querySelectorAll("button").forEach(b => { b.disabled = true; });
  btn.textContent = "🍀 Fuks...";

  // Reroll with the same formula and data
  const reroll = new Roll(originalRoll.formula, originalRoll.data ?? {});
  await reroll.evaluate();

  // Styled chat message with green border
  await reroll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <div style="border-left: 4px solid #27ae60; background: rgba(39, 174, 96, 0.08); padding: 6px 8px; border-radius: 0 4px 4px 0; margin-bottom: 4px;">
        <div style="font-weight: bold; color: #27ae60; font-size: 13px; margin-bottom: 2px;">🍀 FUKS</div>
        <div style="font-size: 11px; color: var(--color-text-secondary, #aaa);">${rollDesc} — przerzut</div>
      </div>
    `,
    flags: { [MODULE_ID]: { fuks: true } }
  });

  // Decrement Fuksy
  await setFuksy(actor, fuksy - 1);
  seqScrollText("FUKS!", actor, { color: "#2ecc71", fontSize: 36, duration: 2000 });

  // Mark source message as rerolled
  if (originalMessage) {
    await originalMessage.update({ [`flags.${MODULE_ID}.rerolled`]: true });
  }

  bar?.remove();
}
