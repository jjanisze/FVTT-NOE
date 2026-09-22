/**
 * Neuroshima 5e — vocabulary for Active Effect `changes` entries.
 *
 * One place for the two things every change in this module has to get right, so that
 * neither can be decided ad hoc at the call site again.
 *
 * ## 1. Change type
 *
 * FVTT 14 replaced the numeric `mode` (`CONST.ACTIVE_EFFECT_MODES`) with a string
 * `type`, and moved the array itself from `changes` to `system.changes`; both shims
 * are removed in v16. The strings below are the whole API — they are their own values,
 * deliberately NOT taken from `CONST.ACTIVE_EFFECT_CHANGE_TYPES`, whose values are
 * default *priorities*, not type identifiers (`add` and `subtract` are both `20`
 * there, so they cannot even be told apart). Writing one of those numbers into `type`
 * produces the silent nonsense `"custom.20"`.
 *
 * Spelled out rather than read from a global because this module is imported by the
 * compendium builder and by `node --check`, where `CONST` does not exist.
 *
 * ## 2. Priority — a house rule, and the reason this file exists at all
 *
 * Foundry sorts every change by `priority` ascending and leaves ties in document
 * order, which `createEmbeddedDocuments` does not guarantee. Unprioritised changes
 * therefore apply in a nondeterministic order, and in 14.364 that is *every*
 * unprioritised change: `ActiveEffect#prepareBaseData` falls back to
 * `CHANGE_TYPES[type]?.priority`, but those entries store the number under
 * `defaultPriority`, so the lookup is always `undefined` and the fallback `0` wins.
 * Per-type default ordering is currently inert, and will switch on silently whenever
 * core fixes that. Every change this module writes carries an explicit priority so
 * that day is a no-op.
 *
 * The ladder is Foundry's own (custom 0, multiply 10, add/subtract 20, downgrade 30,
 * upgrade 40, override 50) with **add and multiply swapped**. That inversion is a
 * ruling about Szybkość, the only stat this module modifies with both types:
 *
 *   Zranienie subtracts a flat 4,5 m; Przeciążenie (Udźwig) and Upojenie 3 halve.
 *   Halving applies to the Szybkość you actually have, so the flat penalty lands
 *   first: (9 − 4,5) × ½ = 2,25 m, not (9 × ½) − 4,5 = 0 m, which froze a merely
 *   lightly wounded character solid without them ever reaching udźwig maksymalny.
 *
 * "Spada do 0" stays an `override` at the top of the ladder, so it always wins and is
 * never clawed back by a later subtraction.
 */

/**
 * Change types, as their own string values.
 * @type {Readonly<Record<string, string>>}
 */
export const CHANGE_TYPE = Object.freeze({
  custom: "custom",
  multiply: "multiply",
  add: "add",
  subtract: "subtract",
  downgrade: "downgrade",
  upgrade: "upgrade",
  override: "override"
});

/**
 * House application order. See §2 above — `add` before `multiply` is the ruling,
 * the rest is Foundry's ladder.
 * @type {Readonly<Record<string, number>>}
 */
export const CHANGE_PRIORITY = Object.freeze({
  custom: 0,
  add: 10,
  subtract: 10,
  multiply: 20,
  downgrade: 30,
  upgrade: 40,
  override: 50
});

/**
 * Build one `system.changes` entry with its house priority already stamped on.
 * @param {string} key                  Data path the change targets.
 * @param {string} type                 One of `CHANGE_TYPE`.
 * @param {string|number} value         Change value; numbers stay numbers, formulas stay strings.
 * @param {object} [overrides]          Rare per-change escapes, e.g. an explicit `priority`.
 * @returns {{key: string, type: string, value: string|number, priority: number}}
 */
export function change(key, type, value, overrides = {}) {
  if (!(type in CHANGE_PRIORITY)) throw new Error(`Unknown Active Effect change type: ${type}`);
  return { key, type, value, priority: CHANGE_PRIORITY[type], ...overrides };
}

/**
 * Canonical form of a changes array, for comparing what an effect *has* against what
 * it *should have*.
 *
 * Needed because the two sides are never literally equal: an effect read back from the
 * database carries `phase` (schema default) and, if it was written before this
 * migration, a `value` that core's legacy `changes` → `system.changes` migration
 * JSON-parsed from `"-1"` into `-1`. A raw `JSON.stringify` comparison of the two
 * reports a difference every single time, which is exactly how the disease and
 * levelled-condition resyncs came to rewrite every effect they owned on every call.
 *
 * Compares only the fields that decide behaviour, with `value` coerced to a string so
 * the two spellings of the same number agree.
 * @param {Array<object>} [changes]
 * @returns {string}
 */
export function normalizeChanges(changes) {
  return JSON.stringify((changes ?? []).map(c => [
    c.key ?? "",
    c.type ?? CHANGE_TYPE.add,
    String(c.value ?? ""),
    c.priority ?? CHANGE_PRIORITY[c.type] ?? 0
  ]));
}
