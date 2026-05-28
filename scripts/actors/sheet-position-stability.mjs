/**
 * Neuroshima 5e — Actor sheet scroll stability after +/- inventory clicks.
 *
 * Root cause (confirmed in runtime):
 *   When a custom ammo/magazine/grenade +/- button fires item.update(), dnd5e
 *   re-renders the `inventory` part of the sheet. During that rerender the
 *   `.main-content` scrollTop is reset, which makes the visible content jump.
 *   The window position (top/left) does NOT change — only the inner scroll.
 *
 * Fix strategy:
 *   1. Intercept clicks on our custom +/- buttons.
 *   2. Snapshot the scrollTop of `.main-content` and the viewport-relative
 *      position of the clicked row (so we can anchor to it after rerender).
 *   3. On the next renderXxxActorSheet hook call, apply a single, one-shot
 *      scroll correction via setTimeout(0).
 *   4. No intervals, no repeated enforcement, no window setPosition() calls.
 */

const PENDING_TTL_MS = 1500;
// Upper bound on correctable scroll drift in px. Sized to cover the full
// height of a typical actor sheet inventory (several thousand px). We
// keep an upper bound at all to avoid "correcting" a user who manually
// scrolled far between the click and the re-render (TTL_MS guards this).
const MAX_CORRECTABLE_SCROLL_PX = 6000;

/** key -> { scrollTop, rowItemId, rowTopInHost, expiresAt } */
const PENDING_FIXES = new Map();

/* -------------------------------------------------
 *  Public entry point
 * ------------------------------------------------- */

export function registerSheetPositionStability() {
  for (const hookName of [
    "renderActorSheet",
    "renderCharacterActorSheet",
    "renderNPCActorSheet",
  ]) {
    Hooks.on(hookName, _onRender);
  }
  console.log("Neuroshima 5e | Sheet scroll stability registered");
}

/* -------------------------------------------------
 *  Hook handler -- called after every re-render
 * ------------------------------------------------- */

function _onRender(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return;

  const key = actor.uuid ?? app.id ?? null;

  // Apply pending scroll correction from a previous +/- click.
  _consumePending(app, html, key);

  // Disable CSS Scroll Anchoring on the scroll container so that DOM
  // mutations from sibling hooks (e.g. zranienie injection) do not
  // trigger automatic scrollTop adjustments that fight our correction.
  const scrollHost = _resolveRoot(html)?.querySelector(".main-content")
                  ?? _resolveRoot(app?.element)?.querySelector(".main-content");
  if (scrollHost) scrollHost.style.overflowAnchor = "none";

  // Bind click listener once per root element.
  const root = _resolveRoot(html);
  if (!root) return;
  if (root.dataset.neuroScrollStabilityBound === "1") return;
  root.dataset.neuroScrollStabilityBound = "1";

  root.addEventListener("click", (event) => {
    if (!_isCustomAdjustClick(event.target)) return;
    _snapshotScroll(app, event.target, key);
  });
}

/* -------------------------------------------------
 *  Detect quantity +/- buttons (ours AND native dnd5e)
 * ------------------------------------------------- */

function _isCustomAdjustClick(target) {
  if (!(target instanceof HTMLElement)) return false;
  const btn = target.closest('[data-action="increase"], [data-action="decrease"]');
  if (!btn) return false;
  // Our custom ammo / magazine / grenade tables.
  if (btn.closest(".neuro-ammo-list, .neuro-magazine-list, .neuro-grenade-list")) return true;
  // Native dnd5e quantity buttons on any inventory row (weapons, items, etc.).
  if (btn.dataset.property === "system.quantity" && btn.closest("[data-item-id]")) return true;
  return false;
}

/* -------------------------------------------------
 *  Snapshot -- taken immediately before update
 * ------------------------------------------------- */

function _snapshotScroll(app, clickTarget, key) {
  const root = _resolveRoot(app?.element);
  const scrollHost = root?.querySelector(".main-content") ?? null;
  if (!scrollHost) return;

  const scrollTop = scrollHost.scrollTop;

  const row = clickTarget.closest("[data-item-id]") ?? null;
  const rowItemId = row?.dataset?.itemId ?? null;
  let rowTopInHost = null;
  if (row) {
    const rowRect = row.getBoundingClientRect();
    const hostRect = scrollHost.getBoundingClientRect();
    rowTopInHost = rowRect.top - hostRect.top;
  }

  PENDING_FIXES.set(key, {
    scrollTop,
    rowItemId,
    rowTopInHost,
    expiresAt: Date.now() + PENDING_TTL_MS,
  });
}

/* -------------------------------------------------
 *  Correction -- applied on the render after click
 * ------------------------------------------------- */

function _consumePending(app, html, key) {
  if (!key) return;
  const pending = PENDING_FIXES.get(key);
  if (!pending) return;
  PENDING_FIXES.delete(key);

  if (pending.expiresAt <= Date.now()) return;

  const root = _resolveRoot(html) ?? _resolveRoot(app?.element);
  if (!root) return;

  // Defer to microtask so that other renderXxxActorSheet hooks (e.g.
  // zranienie.mjs injecting sidebar elements) run first. With
  // overflow-anchor:none on the scroll host, CSS Scroll Anchoring is
  // disabled, so those mutations will NOT bump scrollTop. The microtask
  // fires before the browser paints, so there is no visible jitter.
  queueMicrotask(() => _applyScrollFix(root, pending));
}

function _applyScrollFix(root, pending) {
  const scrollHost = root.querySelector(".main-content");
  if (!scrollHost) return;

  // Row-based anchor: only reliable when the row is inside the scroll
  // container and has a non-zero size. Custom elements (e.g. dnd5e-inventory)
  // can collapse to zero-height, in which case getBoundingClientRect()
  // returns top=0 regardless of scroll — the anchor would compute delta=0
  // and silently skip. Guard: only trust the anchor when the row is visually
  // inside the scroll host (its rect.top ≥ scrollHost.rect.top - some slack).
  if (pending.rowItemId && Number.isFinite(pending.rowTopInHost)) {
    const row = root.querySelector(`[data-item-id="${pending.rowItemId}"]`);
    if (row) {
      const hostRect = scrollHost.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      // Only trust the row anchor when it has a real viewport position
      // (not collapsed inside a zero-height custom element).
      const rowIsReliable = rowRect.top >= hostRect.top - 10 || rowRect.bottom > hostRect.top;
      if (rowIsReliable) {
        const currentRowTopInHost = rowRect.top - hostRect.top;
        const delta = currentRowTopInHost - pending.rowTopInHost;
        if (Math.abs(delta) >= 0.5 && Math.abs(delta) <= MAX_CORRECTABLE_SCROLL_PX) {
          scrollHost.scrollTop += delta;
          return;
        }
        // delta ≈ 0 means scroll anchoring already preserved position –
        // still check raw scrollTop drift (CSS anchoring may have bumped it).
      }
      // Row unreliable (zero-height parent) → fall through to raw fallback.
    }
  }

  // Raw fallback: restore scrollTop when it drifted in correctable range.
  const drift = scrollHost.scrollTop - pending.scrollTop;
  if (Math.abs(drift) >= 0.5 && Math.abs(drift) <= MAX_CORRECTABLE_SCROLL_PX) {
    scrollHost.scrollTop = pending.scrollTop;
  }
}

/* -------------------------------------------------
 *  Helpers
 * ------------------------------------------------- */

function _resolveRoot(source) {
  if (source instanceof HTMLElement) return source;
  if (source?.[0] instanceof HTMLElement) return source[0];
  if (source?.element instanceof HTMLElement) return source.element;
  return null;
}
