/**
 * Neuroshima 5e — "spend N dice, once per round" class features (Wściekły cios and kin).
 *
 * `class-features-data.mjs` already carries the shape for this whole family — a `resource`
 * field (`{ die: "1d6", label }`) and an `oncePerTurn` flag — on Wściekły cios, Bolesny atak,
 * Słaby punkt, Mutant na śniadanie, Maszyna do zabijania and Mój bóg kule nosi. None of it was
 * ever read anywhere at runtime: activating any of these ran the same generic "spend one use,
 * print the flavor text" activity every other passive/limited-use feature gets. No round gate,
 * no dice count, no roll, no damage.
 *
 * This slice wires that up **generically** off `resource`/`oncePerTurn` — so it's mechanically
 * ready for the rest of the family — but is only exercised end-to-end for Wściekły cios (the
 * others differ enough in *when* they trigger — sneak-attack-style conditions, not "any
 * Strength attack" — that giving them the same trigger button would be guessing at rules this
 * pass doesn't check). Extending coverage is picking the right damage-type default and trigger
 * copy per ability, not new plumbing.
 *
 * Design, matched to the table's actual flow instead of a modal:
 *   1. Player already rolled the attack, already hit, targets are still selected (same
 *      assumption dnd5e's own "Apply Damage" button makes, and `dozownik.mjs`'s hit-detection
 *      already leans on `game.user.targets` the same way).
 *   2. Clicking the ability (hotbar macro, or the item's own use control) posts a chat card —
 *      not a dialog — with one button per number of dice still available. Once per round, so
 *      one click is the whole decision; nothing left to confirm.
 *   3. That button spends the dice, rolls a *real* `CONFIG.Dice.DamageRoll` and posts it via
 *      `roll.toMessage()` — the same call `grenade-inventory.mjs`'s "Rzuć obrażenia" uses — so
 *      the native dnd5e damage card (resistances, the real Apply Damage button) does the actual
 *      application. This module never touches the target's HP directly.
 *   4. A scrolling-text flourish over the attacker and a JB2A impact on the target
 *      (`sequencer.mjs`, soft dependency — silently absent without Sequencer/JB2A).
 *
 * Entry point: intercepts `dnd5e.preUseActivity`, the same defense-in-depth spot
 * `class-state.mjs` uses for toggle abilities — it exists for the identical reason: the
 * hotbar macro is not the only way to trigger the item's activity (the sheet's own use control
 * goes through the same activity), and letting the generic one fire alongside this would burn
 * a second use for nothing.
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { seqScrollText, seqEffect } from "../weapons/sequencer.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG_ABILITY = "abilityId";
const FLAG_ROUND = "resourceDiceRound";

/* -------------------------------------------- */
/*  Helpers                                       */
/* -------------------------------------------- */

function _liveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

function _uses(item) {
  const max = Number(item.system.uses?.max) || 0;
  const spent = Number(item.system.uses?.spent) || 0;
  return { max, spent, remaining: Math.max(0, max - spent) };
}

/** Has this `oncePerTurn` ability already fired this combat round? Outside combat, no gate. */
function _alreadyUsedThisRound(item) {
  if (!game.combat) return false;
  const last = item.getFlag(MODULE_ID, FLAG_ROUND);
  return !!last && last.combatId === game.combat.id && last.round === game.combat.round;
}

async function _markUsedThisRound(item) {
  if (!game.combat) return;
  await item.setFlag(MODULE_ID, FLAG_ROUND, { combatId: game.combat.id, round: game.combat.round });
}

/** "1d6" + count 3 -> "3d6". Keeps the die size the data declares, ignores its base count. */
function _diceFormula(die, count) {
  return die.replace(/^\d+/, String(count));
}

function _damageTypeOptions(selected) {
  return Object.entries(CONFIG.DND5E.damageTypes ?? {})
    .map(([key, def]) => `<option value="${key}" ${key === selected ? "selected" : ""}>${def.label}</option>`)
    .join("");
}

/* -------------------------------------------- */
/*  Posting the selection card                    */
/* -------------------------------------------- */

async function postResourceDiceCard(actor, item, feature, abilityId) {
  if (_alreadyUsedThisRound(item)) {
    ui.notifications.warn(`${feature.label}: już użyto w tej rundzie.`);
    return;
  }

  const { remaining, max } = _uses(item);
  if (remaining <= 0) {
    ui.notifications.warn(`${feature.label}: brak dostępnych kości (0 z ${max}).`);
    return;
  }

  const buttons = Array.from({ length: remaining }, (_, i) => i + 1)
    .map(n => `<button type="button" data-count="${n}">${n}k6</button>`)
    .join("");

  const content = `
    <div class="neuro-resource-dice-card" data-item-uuid="${item.uuid}" data-ability-id="${abilityId}">
      <div class="neuro-resource-dice-head">${feature.label}</div>
      <p>Masz <strong>${remaining}</strong> z ${max} kości (${feature.resource.die} każda).
        Użyj po trafieniu atakiem opartym na Sile — cel powinien być nadal zaznaczony.</p>
      <div class="neuro-resource-dice-controls">
        <select class="neuro-resource-dice-type" data-tooltip="Typ obrażeń trafienia, do którego dorzucasz">
          ${_damageTypeOptions("bludgeoning")}
        </select>
        <div class="neuro-resource-dice-buttons">${buttons}</div>
      </div>
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content
  });
}

/* -------------------------------------------- */
/*  Resolving a click                             */
/* -------------------------------------------- */

async function _onCommit(message, root, count) {
  const itemUuid = root.dataset.itemUuid;
  const abilityId = root.dataset.abilityId;
  const feature = CLASS_FEATURES[abilityId];
  const item = _liveItem(await fromUuid(itemUuid));
  if (!item || !feature) return;

  const actor = item.actor;
  if (_alreadyUsedThisRound(item)) {
    ui.notifications.warn(`${feature.label}: już użyto w tej rundzie.`);
    return;
  }
  const { remaining } = _uses(item);
  if (count > remaining) {
    ui.notifications.warn(`${feature.label}: tylko ${remaining} kości dostępnych.`);
    return;
  }

  // Freeze the card first — a slow damage roll must not leave a second clickable window.
  root.dataset.resolved = "true";
  root.querySelectorAll("button, select").forEach(el => el.disabled = true);

  const damageType = root.querySelector(".neuro-resource-dice-type")?.value ?? "bludgeoning";
  const typeLabel = CONFIG.DND5E.damageTypes?.[damageType]?.label ?? damageType;

  await item.update({ "system.uses.spent": (Number(item.system.uses.spent) || 0) + count });
  await _markUsedThisRound(item);

  const formula = _diceFormula(feature.resource.die, count);

  await message.update({
    content: `
      <div class="neuro-resource-dice-card" data-resolved="true">
        <div class="neuro-resource-dice-head">${feature.label}</div>
        <p>Dorzucono <strong>${formula}</strong> (${typeLabel}) do trafienia — rzut poniżej.</p>
      </div>`
  });

  const roll = new CONFIG.Dice.DamageRoll(formula, {}, { type: damageType });
  await roll.evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${feature.label} — ${formula} ${typeLabel}`,
    flags: { dnd5e: { roll: { type: "damage" } } }
  });

  const attackerToken = actor?.getActiveTokens?.()[0] ?? null;
  const targetToken = game.user.targets?.first() ?? null;
  seqScrollText(feature.label.toUpperCase() + "!", attackerToken, { color: "#c0392b" });
  if (targetToken) seqEffect("jb2a.impact.009.orange", targetToken, { scale: 0.8 });
}

function _onRenderResourceDiceCard(message, html) {
  const el = html instanceof HTMLElement ? html : html?.[0];
  const root = el?.querySelector(".neuro-resource-dice-card");
  if (!root || root.dataset.resolved === "true") return;

  root.querySelectorAll(".neuro-resource-dice-buttons button").forEach(btn => {
    btn.addEventListener("click", () => _onCommit(message, root, Number(btn.dataset.count)), { once: true });
  });
}

/* -------------------------------------------- */
/*  Registration                                  */
/* -------------------------------------------- */

function onPreUseActivity(activity) {
  const item = activity?.item;
  const abilityId = item?.getFlag(MODULE_ID, FLAG_ABILITY);
  const feature = abilityId ? CLASS_FEATURES[abilityId] : null;
  if (!feature?.resource) return; // not this family — let the native activity run

  const actor = item.actor;
  if (actor) postResourceDiceCard(actor, item, feature, abilityId);
  return false; // cancel the native activity: no plain-text card, no silent extra use spent
}

export function registerClassResourceDice() {
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("renderChatMessageHTML", _onRenderResourceDiceCard);

  console.log("Neuroshima 5e | Class resource-dice abilities registered");
}
