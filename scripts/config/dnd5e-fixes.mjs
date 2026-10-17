/**
 * Neuroshima 5e — bugs in dnd5e itself that break the module's rules, worked around until dnd5e fixes them.
 * Each entry names the dnd5e version and the line; delete it once the release this module requires has the fix.
 *
 * ## `Infinite` (dnd5e 6.0.6, also `master` and `6.0.x` on 2026-10-17)
 *
 * `ConditionData#_onUpdate` (`module/data/active-effect/condition.mjs:173`):
 *
 *     const delta = this.level - (options.dnd5e?.originalLevel ?? Infinite);
 *
 * `Infinite` is not defined (it means `Infinity`). Only dnd5e's own `increase`/`decrease`/`setLevel` pass
 * `originalLevel`; every other update of a levelled condition — ours (Wyczerpanie pips, Zranienie, Rekonwalescencja),
 * a GM disabling or renaming the effect, its expiry — throws a ReferenceError on every client after the update has
 * been saved, so whatever runs after the update on that client never runs. Defining the name with the value it was
 * meant to have makes `delta` non-finite, which is exactly the "no scrolling status" branch the code intends.
 */

globalThis.Infinite ??= Infinity;
