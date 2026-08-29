/**
 * Neuroshima 5e — fix for dnd5e's inventory row expand/collapse icon getting stuck.
 *
 * Root cause (confirmed live, reproduces on stock items — e.g. Cobbler's Tools —
 * unrelated to anything else in this module):
 *
 * The "Toggle Description" and "Additional Controls" (3-dot) icon buttons in the
 * inventory row's controls column sit ~14px apart. When a click resolves onto (or
 * bleeds into) the 3-dot button instead of its neighbour, dnd5e's
 * `ContextMenu5e.triggerEvent` fires and synthesizes a `contextmenu` event targeting
 * the ROW (not the button), opening the context menu at the click's coordinates. If
 * "Expand"/"Collapse" ends up under the cursor, that entry's own callback is
 * `li => this._onAction(li, "toggleExpand")` — it passes the ROW, not the button.
 *
 * `InventoryElement#_onToggleExpand(target, {item})` assumes `target` IS the toggle
 * button:
 *   - `row = target.closest("[data-uuid]")` — still resolves correctly when `target`
 *     is the row itself (`.closest()` matches the element itself first), so the
 *     content fold/unfold keeps working.
 *   - `icon = target.querySelector(":scope > i")` — looks for a DIRECT child `<i>`.
 *     On the row this is always null (the icon is nested inside `.item-row >
 *     .item-controls > button > i`), so the icon glyph is never updated — silently,
 *     with no visible error to the user.
 *
 * Net effect: the row visibly folds/unfolds correctly, the right-click menu's
 * "Expand"/"Collapse" label is always correct (computed independently from
 * `expandedSections`), but the LEFT-CLICK toggle button's own icon gets stuck
 * wherever it was first rendered — reproducing on any item, tool or otherwise.
 *
 * Fix: re-resolve the real toggle button (and therefore its icon) from the row
 * before delegating to the original handler, regardless of what `target` actually
 * was. Idempotent either way — if `target` was already the button, this is a no-op.
 */
export function registerInventoryToggleFix() {
  const InventoryElement = customElements.get("dnd5e-inventory");
  if ( !InventoryElement ) {
    console.warn("Neuroshima 5e | dnd5e-inventory custom element not found; inventory toggle-icon fix not applied");
    return;
  }

  const original = InventoryElement.prototype._onToggleExpand;
  if ( typeof original !== "function" ) {
    console.warn("Neuroshima 5e | InventoryElement#_onToggleExpand not found; inventory toggle-icon fix not applied");
    return;
  }

  InventoryElement.prototype._onToggleExpand = function(target, options) {
    const row = target.closest("[data-uuid]");
    const realButton = row?.querySelector(':scope > .item-row [data-action="toggleExpand"]') ?? target;
    return original.call(this, realButton, options);
  };

  console.log("Neuroshima 5e | Inventory expand/collapse icon fix applied");
}
