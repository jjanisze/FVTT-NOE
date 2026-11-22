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

/*
 * ## Inventory columns toggled inside the ResizeObserver callback (dnd5e 6.0.6)
 *
 * `InventoryElement#_onResize` (`module/applications/components/inventory.mjs:662`) toggles `.hidden-width` on
 * columns from inside the observer callback. On a narrow sheet that re-wraps the rows, the list's height changes in the
 * same frame and the browser raises "ResizeObserver loop completed with undelivered notifications" as a window error
 * on every character sheet render (Quench fails the running test on it). Toggling in the next frame gives the same
 * columns without the error.
 */
const InventoryElement = customElements.get("dnd5e-inventory");
if (InventoryElement) {
  const onResize = InventoryElement.prototype._onResize;
  InventoryElement.prototype._onResize = function(entries) {
    (this.ownerDocument?.defaultView ?? window).requestAnimationFrame(() => onResize.call(this, entries));
  };
}
