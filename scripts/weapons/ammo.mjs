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
 * effective damage (see `_effectiveDamage`) and apply it to each targeted
 * token that was hit.
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
  const dmg = _effectiveDamage(item, caliber);
  if (!dmg) return;

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
  const roll = new CONFIG.Dice.DamageRoll(dmg.formula, actor?.getRollData?.() ?? {}, { type: dmg.type });
  await roll.evaluate();

  /* Apply cover damage reduction if a through-cover shot was made */
  const coverDecision = getLastAttackCoverDecision(item, subject.id);
  const coverReduction = coverDecision?.applyDamageReduction ? (coverDecision.damageReduction ?? 0) : 0;
  const rawDamage = Math.max(0, roll.total);
  const finalDamage = Math.max(0, rawDamage - coverReduction);

  const damages = [{
    value: finalDamage,
    type: dmg.type,
    properties: new Set(dmg.props)
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
  const flavor = `<i class="fa-solid fa-burst"></i> Obrażenia (${caliber?.label ?? item.name})${reductionLine} → ${hitNames}${missLine}`;

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
  const caliber = AMMO_CALIBER_MAP[caliberId] ?? null;
  const dmg = _effectiveDamage(item, caliber);
  const label = caliber?.label ?? item.name;

  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;

  // Remove the built-in dnd5e "Obrażenia" button — our button replaces it
  const builtinDamageBtn = el.querySelector('[data-action="rollDamage"]');
  builtinDamageBtn?.remove();

  const inCombat = !!game.combat;
  const hasTargets = (game.user.targets?.size ?? 0) > 0;
  const autoApplied = inCombat && hasTargets;

  const dmgType = dmg?.type ?? caliber?.type;
  const typeLabel = CONFIG.DND5E.damageTypes?.[dmgType]?.label ?? dmgType ?? "";
  const damageInfo = dmg?.formula
    ? `${dmg.formula} ${typeLabel}`
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
    await _applyDamageFromButton(dmg, label, item, caliberId);
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
 * Roll and apply the effective damage (see `_effectiveDamage`) to targeted tokens (or controlled
 * tokens as fallback). Called when the GM clicks the red "Obrażenia"/"Nałóż ponownie" button.
 *
 * @param {{ formula, type, props }|null} dmg  Pre-resolved by `_injectDamageButton`.
 * @param {string} label          Display name for chat flavor (caliber label, or the item's own
 *                                 name when the caliber is unknown/unset).
 * @param {Item5e} sourceItem     The weapon that was fired.
 * @param {string} caliberId      For `playImpactSound`'s bank lookup only.
 */
async function _applyDamageFromButton(dmg, label, sourceItem, caliberId) {
  if (!dmg?.formula) {
    ui.notifications.warn(`${label}: brak formuły obrażeń — ustaw obrażenia ręcznie na broni.`);
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
  const roll = new CONFIG.Dice.DamageRoll(dmg.formula, actor?.getRollData?.() ?? {}, { type: dmg.type });
  await roll.evaluate();

  const damages = [{
    value: Math.max(0, roll.total),
    type: dmg.type,
    properties: new Set(dmg.props)
  }];

  for (const target of targets) {
    const targetActor = target.document?.actor ?? target.actor ?? target;
    if (targetActor?.applyDamage) {
      await targetActor.applyDamage(damages, { isDelta: true, multiplier: 1 });
      playImpactSound(sourceItem, targetActor, { caliberId, token: target });
    }
  }

  /* Play explosion sound if weapon is explosive */
  playExplosionSoundForItem(sourceItem);

  const targetNames = targets.map(t => t.document?.name ?? t.name ?? "?").join(", ");
  const flavor = `<i class="fa-solid fa-burst"></i> Obrażenia (${label}) → ${targetNames}`;

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
 * Resolve the {formula, type, props} this weapon should actually roll for damage — everywhere
 * above used to read `caliber.formula`/`caliber.type` unconditionally, which is right for the
 * vast majority of weapons but wrong for two real, found-live cases:
 *
 * ## Bugfix (2026-09-06), found via Pistolet na Race
 *
 * `fixedDamage: true` (`config/weapons-data.mjs` — Magnum .44, .30-06/12 Ga/„.50 BMG" weapons,
 * Pistolet na Race, Strzelba Palmera, …) exists SPECIFICALLY because a weapon's own table damage
 * differs from its shared caliber's generic baseline (see this weapon-catalog's own comment on
 * the flag: ".12 Ga would collapse Pompka's 4k4 and Dwururka's 3k4 into a shared 2k4"). Every
 * damage-rolling path in this file ignored that flag completely and used `caliber.formula`
 * regardless — two distinct failure modes from the same root cause, both real:
 *   - A caliber with a real but DIFFERENT formula than the weapon's actual table value — R700
 *     (own damage 2d8) and Deer Hunter (own damage 1d12) both share caliber "3006" (formula
 *     "2d6"); Pompka (4d4) shares "12ga_s" (formula "2d4") — silently rolled the WRONG dice, no
 *     error, nothing visibly off.
 *   - A caliber with NO formula at all — Pistolet na Race's "race", Strzelba Palmera's
 *     "strzykawka" — every path below bailed out entirely: auto-apply did nothing, the manual
 *     button did nothing but warn "ta amunicja nie ma formuły obrażeń," and the chat-card button
 *     label fell back to a vague "(TYP — formuła z broni)" placeholder. Exactly the "1d4 fire
 *     damage isn't reflected anywhere, no way to apply it" symptom reported live, and the
 *     "Nałóż ponownie" click producing that same warning (misread as a broken dialog).
 *
 * Fixed by preferring the weapon's own `system.damage.base` whenever `fixedDamage` is set (or the
 * caliber id isn't recognised at all — the old per-callsite fallback this replaces), falling back
 * to the caliber only when the weapon's own base has no usable dice. Dmuchawka's igła caliber also
 * has an empty formula, but that weapon's own damage is a flat "+1" bonus with no dice at all
 * (`number`/`denomination` both null) — this correctly still returns `null` for it rather than
 * inventing a formula that was never there.
 *
 * @param {Item5e} item             The weapon (live, embedded).
 * @param {object|null} caliber     `AMMO_CALIBER_MAP[caliberId]`, or null if unrecognised.
 * @returns {{formula: string, type: string, props: string[]}|null}
 */
function _effectiveDamage(item, caliber) {
  const preferWeaponDamage = (item.getFlag(MODULE_ID, "fixedDamage") === true) || !caliber;
  if (preferWeaponDamage) {
    const base = item.system?.damage?.base;
    const n = Number(base?.number);
    const d = Number(base?.denomination);
    if (Number.isFinite(n) && n > 0 && Number.isFinite(d) && d > 0) {
      return {
        formula: `${n}d${d}`,
        type: base?.types?.[0] ?? caliber?.type ?? "piercing",
        props: caliber?.props ?? [],
      };
    }
  }
  if (caliber?.formula) return { formula: caliber.formula, type: caliber.type, props: caliber.props ?? [] };
  return null;
}

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


