/**
 * Neuroshima 5e — what a dnd5e chat message is about (PLAN_migracja_dnd5e6.md E3, §3.3).
 *
 * dnd5e 5.3 kept it in flags: `flags.dnd5e.roll` (type, ability, skillId, toolId, attackMode, …), `.item`,
 * `.activity`, `.targets`, `.originatingMessage`, `.use`, `.messageType`. dnd5e 6.0 made every dnd5e message a
 * typed data model — `message.type` is `attack`, `damage`, `healing`, `save`, `check`, `usage`, … — with the same
 * facts under `message.system`, and its world migration deletes the old flags (`migration.mjs` `migrateMessageData`).
 * This file is the only reader of that shape, so the next change lands in one place.
 *
 * `rollInfo` hands back 5.3's `flags.dnd5e.roll` object, rebuilt from 6.0 data: the rules that read it (rerolls,
 * diseases, tool checks, …) keep their vocabulary.
 */

/**
 * @typedef RollInfo  5.3's `flags.dnd5e.roll`, rebuilt.
 * @property {string} type          attack, damage, healing, save, death, ability, skill, tool, hitDie, hitPoints, generic
 * @property {string} [ability]     ability of a check, save or attack
 * @property {string} [skillId]
 * @property {string} [toolId]
 * @property {string} [attackMode]
 * @property {string} [ammunition]
 * @property {string} [itemUuid]
 * @property {boolean} [forceSuccess]
 * @property {*} [damageOnSave]
 */

/** Message types that carry one roll of a known kind; `check` and `save` are split further below. */
const ROLL_TYPES = new Set(["attack", "damage", "healing", "generic", "hitDie", "hitPoints"]);

/**
 * The roll a dnd5e message carries, in 5.3's terms; null for anything else (usage cards, chat, our own cards).
 * @param {ChatMessage5e} message
 * @returns {RollInfo|null}
 */
export function rollInfo(message) {
  const type = message?.type;
  const sys = message?.system ?? {};
  const itemUuid = sys.item?.uuid ?? undefined;
  if (type === "save") {
    return sys.type === "death" ? { type: "death" } : { type: "save", ability: sys.ability, forceSuccess: sys.resisted, itemUuid };
  }
  if (type === "check") {
    const kind = sys.skill ? "skill" : sys.tool ? "tool" : "ability";
    return { type: kind, ability: sys.ability, skillId: sys.skill ?? undefined, toolId: sys.tool ?? undefined, itemUuid };
  }
  if (!ROLL_TYPES.has(type)) return null;
  const info = { type, itemUuid };
  if (type === "attack") Object.assign(info, { ability: sys.ability, attackMode: sys.mode, ammunition: sys.ammunition });
  if (type === "damage" || type === "healing") info.damageOnSave = sys.onSave ?? null;
  return info;
}

/** The roll type alone (`rollInfo(message)?.type`). */
export const rollTypeOf = message => rollInfo(message)?.type ?? null;

/** The item a message is about (usage card or roll), as a uuid; null when none. */
export const itemUuidOf = message => message?.system?.item?.uuid ?? null;

/** `{id, type, uuid, name, img}` of the activity a message is about, or null. */
export const activityRefOf = message => message?.system?.activity ?? null;

/** An activity usage card (5.3: `flags.dnd5e.messageType === "usage"`). */
export const isUsageCard = message => message?.type === "usage";

/**
 * Id of the message this one was rolled from (the usage card behind an attack or damage roll), or null. 6.0 keeps it
 * in `system.origin` (a document reference — the id in the source).
 */
export function originIdOf(message) {
  const src = message?._source?.system?.origin ?? message?.system?.origin;
  return (typeof src === "string" ? src : src?.id) ?? null;
}

/**
 * The message's recorded targets as 5.3 shaped them (`{uuid, name, img, ac}` — 6.0 names the actor uuid `actor`).
 * @returns {{uuid: string, name: string, img: string, ac: number}[]}
 */
export function targetsOf(message) {
  return (message?.system?.targets ?? []).map(t => ({ ...t, uuid: t.actor ?? t.uuid }));
}
