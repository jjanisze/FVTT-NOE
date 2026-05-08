/**
 * Neuroshima 5e — Ammo / caliber system.
 *
 * Responsibilities:
 *   1. When caliber (mag.ammoType) changes on a weapon → auto-sync
 *      system.damage.base.formula + types + ammo-derived properties.
 *   2. dnd5e.postRollAttack → if in combat with targeted tokens:
 *      auto-roll damage from caliber and apply to hit targets.
 *   3. renderChatMessage on attack roll cards → red "Obrażenia" button
 *      when no auto-apply happened (no targets / not in combat).
 *
 * Skipped for burst-mode activities (neuroKs/neuroDs/neuroMs/neuroOz)
 * because those handle their own damage multiplication.
 */

import { AMMO_CALIBER_MAP } from "../config/ammo-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const AMMO_PROPS_FLAG = "ammoProps";

/** Activity types handled by fire-modes.mjs — skip auto-damage for them. */
const BURST_ACTIVITY_TYPES = new Set(["neuroKs", "neuroDs", "neuroMs", "neuroOz"]);

/** Guard: prevent updateItem recursion when we trigger a caliber-sync update. */
const syncingCaliberUpdate = new Set();

/* ─────────────────────────────────────────────────────────────────── */
/*  Registration                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export function registerAmmoSystem() {
  // 1. Sync weapon damage / properties when caliber flag changes.
  Hooks.on("updateItem", _onUpdateItemSyncCaliberDamage);

  // 2. Auto-apply damage to hit targets after attack roll.
  Hooks.on("dnd5e.postRollAttack", _onPostRollAttackAutoApply);

  // 3. Add "Obrażenia" button to attack-roll chat cards.
  Hooks.on("renderChatMessage", _onRenderAttackChatMessage);

  console.log("Neuroshima 5e | Ammo system registered");
}

/* ─────────────────────────────────────────────────────────────────── */
/*  1. Caliber → damage sync                                           */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * When flags.neuroshima-2026-overrides.mag.ammoType changes on a weapon,
 * update the weapon's base damage formula, damage type, and properties.
 */
async function _onUpdateItemSyncCaliberDamage(item, changes) {
  if (item.type !== "weapon") return;
  if (syncingCaliberUpdate.has(item.uuid)) return;

  const ammoTypePath = `flags.${MODULE_ID}.mag.ammoType`;
  if (!foundry.utils.hasProperty(changes, ammoTypePath)) return;

  const caliberId = foundry.utils.getProperty(changes, ammoTypePath) ?? "";
  const caliber = AMMO_CALIBER_MAP[caliberId] ?? null;

  const updates = {};

  /* ── Damage formula + type ── */
  if (caliber?.formula) {
    const parsed = _parseDamageFormula(caliber.formula);
    if (parsed) {
      updates["system.damage.base.number"] = parsed.number;
      updates["system.damage.base.denomination"] = parsed.denomination;
    }
    updates["system.damage.base.types"] = [caliber.type];
  }

  /* ── Ammo-derived properties ── */
  // Read the weapon's current property set, then:
  //   a) Remove properties that were previously added by the OLD caliber.
  //   b) Add properties from the NEW caliber.
  const currentProps = new Set(item.system?.properties ?? []);
  const oldAmmoProps = item.getFlag(MODULE_ID, AMMO_PROPS_FLAG) ?? [];
  for (const p of oldAmmoProps) currentProps.delete(p);

  const newAmmoProps = caliber?.props ?? [];
  for (const p of newAmmoProps) currentProps.add(p);

  updates["system.properties"] = [...currentProps];
  updates[`flags.${MODULE_ID}.${AMMO_PROPS_FLAG}`] = newAmmoProps;

  if (foundry.utils.isEmpty(updates)) return;

  syncingCaliberUpdate.add(item.uuid);
  try {
    await item.update(updates);
  } finally {
    syncingCaliberUpdate.delete(item.uuid);
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/*  2. Auto-apply damage to targeted tokens on a hit                   */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Fires after dnd5e resolves an attack roll and consumes ammo.
 * If we're in active combat AND the user has targeted tokens, roll the
 * caliber's damage and apply it to each targeted token that was hit.
 *
 * @param {D20Roll[]} rolls  The resulting attack rolls.
 * @param {{ subject: Activity }} data  The activity that fired the roll.
 */
async function _onPostRollAttackAutoApply(rolls, { subject } = {}) {
  /* Only for single-shot attack activities */
  if (!subject || BURST_ACTIVITY_TYPES.has(subject.type)) return;
  if (!game.combat) return;
  if (!game.user.targets?.size) return;

  const item = _getLiveItem(subject?.item);
  if (!item || item.type !== "weapon") return;

  const caliberId = item.getFlag(MODULE_ID, "mag")?.ammoType ?? "";
  if (!caliberId) return;

  const caliber = AMMO_CALIBER_MAP[caliberId];
  if (!caliber?.formula) return;

  const attackRoll = rolls?.[0];
  if (!attackRoll) return;

  const actor = subject.actor;
  const speaker = ChatMessage.getSpeaker({ actor });

  const results = [];

  for (const target of game.user.targets) {
    const targetActor = target.document?.actor ?? target.actor;
    if (!targetActor) continue;

    /* Hit check: compare attack total to target's AC if available */
    const targetAC = targetActor.system?.attributes?.ac?.value;
    const isHit = (targetAC == null) || (attackRoll.total >= targetAC);
    if (!isHit) {
      results.push({ name: target.name, hit: false, total: 0 });
      continue;
    }

    /* Roll damage */
    const roll = new Roll(caliber.formula, actor?.getRollData?.() ?? {});
    await roll.evaluate();

    const damages = [{
      value: Math.max(0, roll.total),
      type: caliber.type,
      properties: new Set(caliber.props ?? [])
    }];

    await targetActor.applyDamage(damages, { isDelta: true, multiplier: 1 });
    results.push({ name: target.name, hit: true, total: roll.total, formula: roll.formula });
  }

  if (!results.length) return;

  /* Build summary chat message */
  const typeLabel = CONFIG.DND5E.damageTypes?.[caliber.type]?.label ?? caliber.type;
  const lines = results.map(r =>
    r.hit
      ? `<li><strong>${r.name}</strong>: ${r.total} (${r.formula}) ${typeLabel}</li>`
      : `<li><strong>${r.name}</strong>: pudło (AC ${_getTargetAC(r.name)})</li>`
  ).join("");

  const propLabels = (caliber.props ?? [])
    .map(p => CONFIG.DND5E.itemProperties?.[p]?.label ?? p)
    .join(", ");

  await ChatMessage.create({
    speaker,
    content: `<div class="neuro-auto-damage-msg">
      <strong class="neuro-auto-damage-header">
        <i class="fa-solid fa-burst"></i> Auto-obrażenia (${caliber.label})
      </strong>
      <ul>${lines}</ul>
      ${propLabels ? `<p class="neuro-auto-damage-props">${propLabels}</p>` : ""}
      ${caliber.aoe ? `<p class="neuro-auto-damage-aoe"><i class="fa-solid fa-circle-exclamation"></i> ${caliber.aoe}</p>` : ""}
    </div>`,
  });
}

/* ─────────────────────────────────────────────────────────────────── */
/*  3. "Obrażenia" button in attack-roll chat cards                    */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Inject a red "Obrażenia" button into attack-roll chat messages that
 * come from a weapon with a caliber set.
 *
 * Shown for:
 *   - All caliber weapons in combat (fallback in case auto-apply missed).
 *   - Always shown outside combat so GM can manually apply damage.
 *
 * Hidden for burst-mode activities (neuroKs / neuroDs / …).
 */
function _onRenderAttackChatMessage(message, html) {
  /* Attack roll messages only */
  if (message.flags?.dnd5e?.roll?.type !== "attack") return;

  /* Skip burst fire modes */
  const activityType = message.flags?.dnd5e?.activity?.type;
  if (BURST_ACTIVITY_TYPES.has(activityType)) return;

  /* Get associated weapon */
  const item = message.getAssociatedItem?.();
  if (!item || item.type !== "weapon") return;

  const caliberId = item.getFlag(MODULE_ID, "mag")?.ammoType ?? "";
  if (!caliberId) return;

  const caliber = AMMO_CALIBER_MAP[caliberId];
  if (!caliber) return;

  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;

  /* Only visible to GM and the weapon owner */
  if (!game.user.isGM && !item.isOwner) return;

  const inCombat = !!game.combat;
  const hasTargets = (game.user.targets?.size ?? 0) > 0;
  const autoApplied = inCombat && hasTargets;

  const typeLabel = CONFIG.DND5E.damageTypes?.[caliber.type]?.label ?? caliber.type;
  const damageInfo = caliber.formula
    ? `${caliber.formula} ${typeLabel}`
    : `(${typeLabel} — formuła z broni)`;

  const btnLabel = autoApplied
    ? `<i class="fa-solid fa-burst"></i> Nałóż ponownie — ${damageInfo}`
    : `<i class="fa-solid fa-burst"></i> Obrażenia — ${damageInfo}`;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("neuro-damage-btn");
  if (!autoApplied) btn.classList.add("neuro-damage-btn--red");
  btn.innerHTML = btnLabel;
  btn.dataset.caliberId = caliberId;
  btn.dataset.messageId = message.id;

  btn.addEventListener("click", async ev => {
    ev.preventDefault();
    await _applyDamageFromButton(caliber, item);
  });

  /* Append after the dice-total or at end of message-content */
  const insertPoint = el.querySelector(".dice-total")
    ?? el.querySelector(".dice-roll")
    ?? el.querySelector(".message-content")
    ?? el;
  insertPoint.after(btn);
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Manual damage application (button click)                           */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Roll and apply caliber damage to targeted tokens (or controlled tokens
 * as fallback). Called when the GM clicks the red "Obrażenia" button.
 *
 * @param {{ id, label, formula, type, props, aoe }} caliber
 * @param {Item5e} sourceItem  The weapon that was fired.
 */
async function _applyDamageFromButton(caliber, sourceItem) {
  if (!caliber.formula) {
    ui.notifications.warn(`${caliber.label}: ta amunicja nie ma formuły obrażeń — ustaw obrażenia ręcznie na broni.`);
    return;
  }

  /* Resolve targets: targeted > controlled > warn */
  const targets = game.user.targets?.size
    ? [...game.user.targets]
    : [...(canvas.tokens?.controlled ?? [])];

  if (!targets.length) {
    ui.notifications.warn("Brak zacelowanego ani zaznaczonego tokena. Kliknij prawym na pionka → Cel, albo zaznacz token.");
    return;
  }

  const actor = sourceItem.actor;
  const roll = new Roll(caliber.formula, actor?.getRollData?.() ?? {});
  await roll.evaluate();

  const damages = [{
    value: Math.max(0, roll.total),
    type: caliber.type,
    properties: new Set(caliber.props ?? [])
  }];

  for (const target of targets) {
    const targetActor = target.document?.actor ?? target.actor ?? target;
    if (targetActor?.applyDamage) {
      await targetActor.applyDamage(damages, { isDelta: true, multiplier: 1 });
    }
  }

  const typeLabel = CONFIG.DND5E.damageTypes?.[caliber.type]?.label ?? caliber.type;
  const targetNames = targets.map(t => t.document?.name ?? t.name ?? "?").join(", ");
  const propLabels = (caliber.props ?? [])
    .map(p => CONFIG.DND5E.itemProperties?.[p]?.label ?? p)
    .join(", ");

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-auto-damage-msg">
      <strong class="neuro-auto-damage-header">
        <i class="fa-solid fa-burst"></i> Obrażenia (${caliber.label})
      </strong>
      <p><strong>${roll.total}</strong> (${roll.formula}) ${typeLabel} → ${targetNames}</p>
      ${propLabels ? `<p class="neuro-auto-damage-props">${propLabels}</p>` : ""}
      ${caliber.aoe ? `<p class="neuro-auto-damage-aoe"><i class="fa-solid fa-circle-exclamation"></i> ${caliber.aoe}</p>` : ""}
    </div>`,
  });
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Helpers                                                             */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Parse a simple "NdM" damage formula into {number, denomination}.
 * Returns null if the formula doesn't match standard dice notation.
 * @param {string} formula  e.g. "2d8", "1d6", "15d6"
 * @returns {{ number: number, denomination: number }|null}
 */
function _parseDamageFormula(formula) {
  if (!formula) return null;
  const match = formula.match(/^(\d+)d(\d+)$/);
  if (!match) return null;
  return { number: parseInt(match[1], 10), denomination: parseInt(match[2], 10) };
}

/**
 * Resolve the live (embedded) item from an activity's (possibly cloned) item.
 * dnd5e v5.3 clones items during activity use — always look up via actor.items.
 */
function _getLiveItem(item) {
  if (!item) return null;
  const actor = item.actor;
  if (!actor) return item;
  return actor.items.get(item.id) ?? item;
}

/**
 * Helper used in auto-damage summary to label a missed target with its AC.
 * @param {string} name
 * @returns {string}
 */
function _getTargetAC(name) {
  for (const t of (game.user.targets ?? [])) {
    if (t.name === name) return t.document?.actor?.system?.attributes?.ac?.value ?? "?";
  }
  return "?";
}
