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
import { getLastAttackCoverDecision } from "../combat/cover.mjs";
import { playExplosionSoundForItem, playImpactSound } from "./sounds.mjs";

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
  //    Use renderChatMessageHTML (FVTT v14) which passes HTMLElement directly.
  //    Fall back to renderChatMessage for older versions.
  Hooks.on("renderChatMessageHTML", _onRenderAttackChatMessage);

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
  // `fixedDamage` = kostki broni biją domyślną formułę kalibru. Bez tego wybór
  // .12 Ga sprowadziłby Pompkę (4k4) i Dwurówkę (3k4) do wspólnych 2k4.
  const fixedDamage = item.getFlag(MODULE_ID, "fixedDamage") === true;
  if (caliber?.formula && !fixedDamage) {
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

  /* Separate targets into hits and misses */
  const hits = [];
  const misses = [];

  for (const target of game.user.targets) {
    const targetActor = target.document?.actor ?? target.actor;
    if (!targetActor) continue;
    const targetAC = targetActor.system?.attributes?.ac?.value;
    const isHit = (targetAC == null) || (attackRoll.total >= targetAC);
    if (isHit) hits.push({ target, targetActor });
    else misses.push(target.name ?? "?");
  }

  if (!hits.length && !misses.length) return;

  /* Nothing to apply if all shots missed — GM can use the button to see damage */
  if (!hits.length) return;

  /* Roll damage once, apply to every hit target */
  const roll = new CONFIG.Dice.DamageRoll(caliber.formula, actor?.getRollData?.() ?? {}, { type: caliber.type });
  await roll.evaluate();

  /* Apply cover damage reduction if a through-cover shot was made */
  const coverDecision = getLastAttackCoverDecision(item, subject.id);
  const coverReduction = coverDecision?.applyDamageReduction ? (coverDecision.damageReduction ?? 0) : 0;
  const rawDamage = Math.max(0, roll.total);
  const finalDamage = Math.max(0, rawDamage - coverReduction);

  const damages = [{
    value: finalDamage,
    type: caliber.type,
    properties: new Set(caliber.props ?? [])
  }];

  for (const { target, targetActor } of hits) {
    await targetActor.applyDamage(damages, { isDelta: true, multiplier: 1 });
    // Impact SFX, emitted at the target rather than the shooter. This is the
    // only path with both the firing weapon and the struck actor in scope —
    // dnd5e's own applyDamage hooks receive the victim but not the weapon, so
    // they cannot pick the right bank or material.
    //
    // fireMode is left at its "p" default: this path only runs for single-shot
    // attacks. Burst modes go through Activity.rollDamage (fire-modes.mjs) and
    // are applied by the GM from the chat card, so they never arrive here — the
    // `impact-burst-*` recordings are consequently unreachable in play for now,
    // and only .50 BMG / symbol `#` have any. Wiring them up needs a hook on the
    // burst damage-application path that still knows which weapon fired.
    playImpactSound(item, targetActor, { caliberId: caliber.id, token: target });
  }

  /* Play explosion sound if weapon is explosive (Bazooka, LAW, MGL1S, Thumper, Moździerz) */
  playExplosionSoundForItem(item);

  /* Build flavor: caliber name + cover reduction note + hit/miss list */
  const hitNames = hits.map(h => h.target.name ?? "?").join(", ");
  const missLine = misses.length ? ` | <em>pudło: ${misses.join(", ")}</em>` : "";
  const reductionLine = coverReduction > 0 ? ` <em>(osłona −${coverReduction})</em>` : "";
  const flavor = `<i class="fa-solid fa-burst"></i> Obrażenia (${caliber.label})${reductionLine} → ${hitNames}${missLine}`;

  await roll.toMessage({
    speaker,
    flavor,
    flags: { dnd5e: { roll: { type: "damage" } } }
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
  /* Attack activity cards only — dnd5e v5.3 uses activity.type, not roll.type */
  const activityType = message.flags?.dnd5e?.activity?.type;
  if (activityType !== "attack") return;

  /* Skip burst fire modes */
  if (BURST_ACTIVITY_TYPES.has(activityType)) return;

  /* Get associated weapon via flags (getAssociatedItem may not exist on usage cards) */
  const itemUuid = message.flags?.dnd5e?.item?.uuid;
  if (!itemUuid) return;

  const item = fromUuidSync(itemUuid);
  if (!item || item.type !== "weapon") return;

  const caliberId = item.getFlag(MODULE_ID, "mag")?.ammoType ?? "";
  if (!caliberId) return;

  /* Only visible to GM and the weapon owner */
  if (!game.user.isGM && !item.isOwner) return;

  /* Defer by one macrotask — dnd5e injects its rollDamage button via async
     microtasks (Promise.resolve chains). Using setTimeout(0) ensures we run
     AFTER all of dnd5e's microtasks have settled, so querySelector finds the
     built-in button and removes it before we inject our own. */
  setTimeout(() => _injectDamageButton(message, html, item, caliberId), 0);
}

/**
 * Build and inject the "Obrażenia" button into the message DOM element.
 * Called deferred (via Promise.resolve) to wait for dnd5e's own rendering.
 */
function _injectDamageButton(message, html, item, caliberId) {
  /* Caliber may not be in AMMO_CALIBER_MAP (legacy/custom id) — build a fallback
     so the button still appears and the GM can manually roll damage. */
  const caliber = AMMO_CALIBER_MAP[caliberId] ?? {
    id: caliberId,
    label: caliberId,
    formula: (() => {
      const n = item.system.damage?.base?.number ?? 0;
      const d = item.system.damage?.base?.denomination ?? 0;
      return (n && d) ? `${n}d${d}` : "";
    })(),
    type: [...(item.system.damage?.base?.types ?? [])][0] ?? "piercing",
    props: [],
  };

  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;

  // Remove the built-in dnd5e "Obrażenia" button — our button replaces it
  const builtinDamageBtn = el.querySelector('[data-action="rollDamage"]');
  builtinDamageBtn?.remove();

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
  const roll = new CONFIG.Dice.DamageRoll(caliber.formula, actor?.getRollData?.() ?? {}, { type: caliber.type });
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
      playImpactSound(sourceItem, targetActor, { caliberId: caliber.id, token: target });
    }
  }

  /* Play explosion sound if weapon is explosive */
  playExplosionSoundForItem(sourceItem);

  const targetNames = targets.map(t => t.document?.name ?? t.name ?? "?").join(", ");
  const flavor = `<i class="fa-solid fa-burst"></i> Obrażenia (${caliber.label}) → ${targetNames}`;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    flags: { dnd5e: { roll: { type: "damage" } } }
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


