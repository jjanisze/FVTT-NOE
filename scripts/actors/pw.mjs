/**
 * Neuroshima 5e — Punkty Wytrzymałości (PW) override.
 *
 * Neuroshima PW is flat per level, not hit-die-average based:
 *
 *   | Klasa                         | poz. 1       | kolejne     | KW |
 *   | Brutal / Twardziel / Zwiadowca| 16 + mod KON | 4 + mod KON | k8 |
 *   | Cwaniak / Spec / Złodziej     | 12 + mod KON | 3 + mod KON | k6 |
 *
 * dnd5e's HitPoints advancement is hard-wired to the hit die (d8 -> avg 5, max 8),
 * so it cannot produce 16 at level 1. We keep the HitPoints advancement — it drives
 * the Kość Wytrzymałości pool spent on a Krótki odpoczynek — but recompute `hp.max`.
 *
 * Multiclass: the character's *first* class contributes its level-1 value; every
 * other level (including further levels of the first class) contributes that
 * class's per-level value. KON modifier applies once per character level, as in 5e.
 */

import { CLASSES } from "../config/classes-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Compute Neuroshima PW max for an actor, or null if the actor has no Neuroshima class.
 * @param {Actor5e} actor
 * @returns {number|null}
 */
export function computeNeuroshimaPW(actor) {
  const classes = Object.entries(actor.classes ?? {})
    .map(([identifier, item]) => ({ identifier, levels: item.system.levels ?? 0 }))
    .filter(c => CLASSES[c.identifier] && c.levels > 0);

  if (!classes.length) return null;

  const totalLevel = classes.reduce((n, c) => n + c.levels, 0);
  if (!totalLevel) return null;

  // Which class did the character start as? dnd5e tracks this; fall back to the
  // class with the most levels, then to the first one found.
  const originalId = actor.system.details?.originalClass;
  const original = classes.find(c => c.identifier === originalId)
    ?? [...classes].sort((a, b) => b.levels - a.levels)[0];

  let base = 0;
  for (const c of classes) {
    const pw = CLASSES[c.identifier].pw;
    const isOriginal = c.identifier === original.identifier;
    base += (isOriginal ? pw.first : 0);
    base += pw.perLevel * (c.levels - (isOriginal ? 1 : 0));
  }

  const conMod = actor.system.abilities?.con?.mod ?? 0;
  const bonuses = actor.system.attributes?.hp?.bonuses ?? {};
  const overall = Number(bonuses.overall) || 0;
  const perLevelBonus = (Number(bonuses.level) || 0) * totalLevel;

  return Math.max(1, base + (conMod * totalLevel) + overall + perLevelBonus);
}

/**
 * Patch Actor5e#prepareDerivedData so PW is recomputed after dnd5e finishes.
 * A prototype wrap is used rather than a hook because dnd5e computes `hp.max`
 * inside prepareDerivedData and exposes no post-HP hook in 5.3.
 */
export function registerPW() {
  const ActorClass = CONFIG.Actor.documentClass;
  const original = ActorClass.prototype.prepareDerivedData;

  ActorClass.prototype.prepareDerivedData = function(...args) {
    original.apply(this, args);

    if (this.type !== "character") return;
    if (this.getFlag(MODULE_ID, "pwOverride") === false) return;   // per-actor opt-out

    // Respect dnd5e's own manual-max-HP convention instead of always winning: a non-null
    // `_source` value means a GM explicitly typed a number into the Hit Points Configuration
    // dialog's Max field — the exact signal vanilla dnd5e itself uses to skip its own
    // hit-die-advancement calc (`if (hp.max === null)` in character.mjs). Honoring it here is
    // what makes that field a real, working override instead of one that silently gets
    // discarded on the next derive (see chat log 2026-09-13 / IMPLEMENTATION.md).
    if (this._source.system?.attributes?.hp?.max != null) return;

    try {
      const pw = computeNeuroshimaPW(this);
      if (pw === null) return;

      const hp = this.system.attributes?.hp;
      if (!hp) return;

      hp.max = pw;

      // dnd5e's own AttributesFields.prepareHitPoints (attributes.mjs) already ran inside
      // original.apply() above — it fired its hit-die-advancement branch (since `_source.max`
      // was null) and derived effectiveMax/value/damage/pct from ITS OWN computed max, which
      // can legitimately differ from, and be smaller than, the Neuroshima PW figure. Its own
      // `value = Math.min(value, effectiveMax)` may already have shaved real HP off a
      // character who was at/near their correct (larger) PW max. Re-derive everything off the
      // new max, and pull `value` fresh from the persisted source rather than trusting that
      // transiently-clamped in-memory figure, so every HP-driven display agrees with the
      // Neuroshima PW value and nobody silently loses HP on a routine re-render.
      hp.effectiveMax = Math.max(hp.max + (hp.tempmax ?? 0), 0);
      const sourceValue = this._source.system.attributes.hp.value;
      hp.value = Number.isNumeric(sourceValue) ? Math.min(sourceValue, hp.effectiveMax) : hp.value;
      hp.damage = hp.effectiveMax - hp.value;
      hp.pct = Math.clamp(hp.effectiveMax ? (hp.value / hp.effectiveMax) * 100 : 0, 0, 100);
    } catch (err) {
      console.error(`${MODULE_ID} | PW computation failed for ${this.name}`, err);
    }
  };

  console.log(`${MODULE_ID} | PW override registered (flat per-level Neuroshima values)`);
}
