/**
 * Neuroshima 5e — Siła Przeciwnika (SP) i Premia z Biegłości dla NPC.
 *
 * ## The problem
 *
 * dnd5e derives an NPC's proficiency bonus from its Challenge Rating:
 *
 *     this.attributes.prof = Proficiency.calculateMod(Math.max(cr, level, 1))
 *     // module/data/actor/npc.mjs:380  ->  floor((cr + 7) / 4)
 *
 * Neuroshima's **Siła Przeciwnika** is not a CR. It is an encounter-budget
 * number weighed against Siła Drużyny, and the rulebook prints PB *separately*
 * because the two do not track each other:
 *
 *   | Przeciwnik    | SP  | PB  | PB that 5e would derive from SP |
 *   |---------------|-----|-----|---------------------------------|
 *   | Koń (Skażony) |   1 | +1  | +2  (5e has no PB +1 at all)     |
 *   | Bit-Boys      |   5 | +2  | +3                               |
 *   | Gigamut       |  24 | +6  | +9                               |
 *   | Juggernaut    | 125 | +6  | +33                              |
 *
 * So SP cannot simply be written into `details.cr` and left to dnd5e.
 *
 * ## The approach
 *
 * `details.cr` **does** hold the SP value — it is the number the GM cares about,
 * it is what the (relabelled) "Siła przeciwnika" field on the sheet should show,
 * and `getCRExp` tolerates values outside the CR table via its own `??`
 * fallback, so nothing downstream breaks.
 *
 * The proficiency bonus is then forced back to the rulebook's value from a
 * module flag, by wrapping `prepareDerivedData` — the same prototype-wrap
 * `actors/pw.mjs` uses, and for the same reason: dnd5e computes `prof` inside
 * `prepareDerivedData` and exposes no hook after it. The two wrappers chain
 * safely; each calls the original it captured.
 *
 * Actors with no Neuroshima PB flag are left completely alone, so hand-made and
 * SRD NPCs keep stock 5e behaviour.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Read the rulebook proficiency bonus off an actor.
 * @param {Actor5e} actor
 * @returns {number|null}  null when this actor is not a Bestiariusz NPC
 */
export function getNeuroshimaPB(actor) {
  const pb = actor.getFlag(MODULE_ID, "bestiary.pb");
  return Number.isFinite(pb) ? pb : null;
}

/**
 * Read Siła Przeciwnika off an actor. Falls back to `details.cr`, which is
 * where the pack builder writes it.
 * @param {Actor5e} actor
 * @returns {number|null}
 */
export function getSP(actor) {
  const sp = actor.getFlag(MODULE_ID, "bestiary.sp");
  if (Number.isFinite(sp)) return sp;
  return actor.type === "npc" ? (actor.system.details?.cr ?? null) : null;
}

/**
 * Patch Actor5e#prepareDerivedData so an NPC's PB comes from the rulebook
 * rather than from its SP.
 */
export function registerSP() {
  const ActorClass = CONFIG.Actor.documentClass;
  const original = ActorClass.prototype.prepareDerivedData;

  ActorClass.prototype.prepareDerivedData = function(...args) {
    original.apply(this, args);

    if (this.type !== "npc") return;

    try {
      const pb = getNeuroshimaPB(this);
      if (pb === null) return;          // not a Bestiariusz NPC — leave 5e alone

      const attrs = this.system.attributes;
      if (!attrs) return;
      if (attrs.prof === pb) return;

      const delta = pb - attrs.prof;
      attrs.prof = pb;

      // Everything dnd5e already derived from the old prof — skill and save
      // totals, passive scores — was computed before this point, so shift the
      // proficient ones by the difference rather than recomputing from scratch.
      for (const skill of Object.values(this.system.skills ?? {})) {
        if (!skill.value) continue;
        const mult = skill.value;                 // 0.5 / 1 / 2 (half / prof / expertise)
        const shift = Math.floor(delta * mult);
        skill.total += shift;
        if (Number.isFinite(skill.passive)) skill.passive += shift;
      }
      for (const ability of Object.values(this.system.abilities ?? {})) {
        if (ability.proficient) ability.save += Math.floor(delta * ability.proficient);
      }
    } catch (err) {
      console.error(`${MODULE_ID} | SP/PB computation failed for ${this.name}`, err);
    }
  };

  console.log(`${MODULE_ID} | SP override registered (PB decoupled from Siła Przeciwnika)`);
}
