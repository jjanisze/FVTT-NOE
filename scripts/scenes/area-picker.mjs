/**
 * Neuroshima 5e — canvas point picker with a live footprint preview.
 *
 * One picker for everything that lands on a point the player chooses: grenades and mines
 * (`actors/grenade-inventory.mjs`), Kolczatka (`items/kolczatka.mjs`), Flara and Pistolet na
 * race (`wkk/items/`). Each used to carry its own identical copy of a bare `pointerdown`
 * listener — "small per-item-file glue, not worth sharing" — which showed nothing at all while
 * aiming: no footprint, no cursor change, just a notification. Once the picker has to draw
 * something, it stops being a handful of lines, so it lives here.
 *
 * What the player sees while aiming:
 *  - the real footprint under the cursor — the same geometry the marker/tile/light will have,
 *    centred on the same raw point (no grid snap, because the placement code doesn't snap);
 *  - a line from the thrower with the distance, coloured by the caller's range bands — the
 *    same thresholds the caller warns about after the click, so the preview never disagrees
 *    with the chat card;
 *  - a crosshair cursor.
 *
 * Left click places; right click or Escape cancels. Both are swallowed in the capture phase,
 * so the click doesn't also select/drag a token under it and Escape doesn't also close the
 * character sheet the throw was started from.
 *
 * Why not dnd5e's `AbilityTemplate.drawPreview()` — that path renders fine on v14 (Thumper,
 * MGL1S and the DS/MS/OZ fire modes use it), but it ends by creating a MeasuredTemplate, and
 * these callers deliberately create something else (a Drawing, a Tile, a light) via a GM
 * relay — see `grenade-inventory.mjs`'s top doc comment.
 */

/** Band colours — same values as `grenade-inventory.mjs`'s `_getThrowBandColor`. */
const BAND_COLORS = { ok: 0x54c86a, warn: 0xd8b24a, danger: 0xe06666 };
const NEUTRAL_COLOR = 0xff9f40;

/**
 * @typedef {object} PickerShape
 * @property {"rect"|"circle"} kind
 * @property {number} [width]    rect, px
 * @property {number} [height]   rect, px
 * @property {number[]} [radii]  circle, px — several for concentric rings (e.g. bright/dim light)
 */

/**
 * Metres → canvas px on the given scene.
 * @param {number} meters
 * @param {Scene} [scene]
 */
export function metersToPx(meters, scene = canvas.scene) {
  const unitsPerGrid = Number(scene?.grid?.distance ?? 1);
  const pxPerGrid = Number(scene?.grid?.size ?? 100);
  return (meters * pxPerGrid) / unitsPerGrid;
}

/** Grid distance in scene units, with the same fallbacks the callers always used. */
export function measureMeters(from, to) {
  if (!canvas?.grid) return 0;

  try {
    if (typeof canvas.grid.measurePath === "function") {
      const d = Number(canvas.grid.measurePath([{ A: from, B: to }])?.distance ?? 0);
      if (!Number.isNaN(d) && d > 0) return d;
    }
  } catch (_e) { /* fallback below */ }

  try {
    if (typeof canvas.grid.measureDistance === "function") {
      const d = Number(canvas.grid.measureDistance(from, to, { gridSpaces: true }));
      if (!Number.isNaN(d) && d > 0) return d;
    }
  } catch (_e) { /* geometric fallback below */ }

  const px = Math.hypot((to.x ?? 0) - (from.x ?? 0), (to.y ?? 0) - (from.y ?? 0));
  const unitsPerGrid = Number(canvas.scene?.grid?.distance ?? 1);
  const pxPerGrid = Number(canvas.grid?.size ?? 100);
  return (px / pxPerGrid) * unitsPerGrid;
}

/**
 * "ok" up to `short`, "warn" up to `long`, "danger" beyond. Without `short` there is no
 * middle band — only "ok" and "danger".
 * @param {number} distance
 * @param {{short?: number, long?: number}} range
 * @returns {"ok"|"warn"|"danger"|null}
 */
export function rangeBand(distance, { short, long } = {}) {
  if (!(long > 0)) return null;
  if (short > 0 && distance <= short) return "ok";
  if (distance <= long) return short > 0 ? "warn" : "ok";
  return "danger";
}

/**
 * Let the player click a point on the canvas, with a live preview of what will land there.
 * @param {object} [options]
 * @param {string} [options.hint]               Notification shown when aiming starts.
 * @param {PickerShape|null} [options.shape]    Footprint centred on the cursor.
 * @param {{x:number, y:number}|null} [options.origin]  Thrower's centre — draws the range line.
 * @param {{short?: number, long?: number}|null} [options.range]  Metres; colours line + footprint.
 * @returns {Promise<{x:number, y:number}|null>}  Canvas coordinates, or null when cancelled.
 */
export function pickCanvasPoint({ hint, shape = null, origin = null, range = null } = {}) {
  if (!canvas?.ready || !canvas.app?.stage || !canvas.controls) {
    ui.notifications.warn("Brak aktywnej sceny.");
    return Promise.resolve(null);
  }
  if (hint) ui.notifications.info(`${hint} (PPM lub ESC — anuluj)`);

  const view = canvas.app.view;
  const preview = new PIXI.Container();
  preview.eventMode = "none";
  const gfx = preview.addChild(new PIXI.Graphics());
  const label = preview.addChild(new foundry.canvas.containers.PreciseText("",
    foundry.canvas.containers.PreciseText.getTextStyle({ fontSize: Math.max(18, canvas.dimensions.size / 4) })));
  label.anchor.set(0.5, 1);
  canvas.controls.addChild(preview);

  // Foundry's own cursors are custom images per state — swap them all, restore on exit.
  const cursorStyles = canvas.app.renderer.events.cursorStyles;
  const savedCursors = { ...cursorStyles };
  for (const key of Object.keys(cursorStyles)) cursorStyles[key] = "crosshair";
  view.style.cursor = "crosshair";

  const draw = pt => _drawPreview(gfx, label, pt, { shape, origin, range });
  draw(canvas.mousePosition ?? { x: 0, y: 0 });

  return new Promise(resolve => {
    let done = false;
    const finish = result => {
      if (done) return;
      done = true;
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
      Hooks.off("canvasTearDown", onTearDown);
      Object.assign(cursorStyles, savedCursors);
      view.style.cursor = "";
      preview.destroy({ children: true });
      resolve(result);
    };
    const toCanvas = e => canvas.canvasCoordinatesFromClient({ x: e.clientX, y: e.clientY });

    const onMove = e => { if (e.target === view) draw(toCanvas(e)); };
    const onDown = e => {
      if (e.target !== view) return;          // clicks on the UI (sheet, sidebar) are left alone
      e.stopPropagation();
      e.preventDefault();
      if (e.button === 0) {
        const p = toCanvas(e);
        finish({ x: p.x, y: p.y });
      } else finish(null);
    };
    const onKey = e => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      finish(null);
    };
    const onTearDown = () => finish(null);

    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    Hooks.on("canvasTearDown", onTearDown);
  });
}

/**
 * @param {PIXI.Graphics} gfx
 * @param {PreciseText} label
 * @param {{x:number, y:number}} pt
 */
function _drawPreview(gfx, label, pt, { shape, origin, range }) {
  const distance = origin ? measureMeters(origin, pt) : null;
  const band = distance !== null && range ? rangeBand(distance, range) : null;
  const color = band ? BAND_COLORS[band] : NEUTRAL_COLOR;
  const lineWidth = Math.max(2, canvas.dimensions.size / 40);

  gfx.clear();
  if (origin) {
    gfx.lineStyle(lineWidth, color, 0.7);
    gfx.moveTo(origin.x, origin.y);
    gfx.lineTo(pt.x, pt.y);
  }

  let halfHeight = 0;
  if (shape?.kind === "rect") {
    halfHeight = shape.height / 2;
    gfx.lineStyle(lineWidth, color, 0.9);
    gfx.beginFill(color, 0.2);
    gfx.drawRect(pt.x - shape.width / 2, pt.y - halfHeight, shape.width, shape.height);
    gfx.endFill();
  } else if (shape?.kind === "circle" && shape.radii?.length) {
    // Largest first, so each smaller ring's fill stacks on top — inner reads as "more".
    const radii = [...shape.radii].sort((a, b) => b - a);
    halfHeight = radii[0];
    for (const r of radii) {
      gfx.lineStyle(lineWidth, color, 0.9);
      gfx.beginFill(color, 0.12);
      gfx.drawCircle(pt.x, pt.y, r);
      gfx.endFill();
    }
  }

  // Always mark the exact point — the footprint is centred on it.
  const arm = canvas.dimensions.size / 5;
  gfx.lineStyle(lineWidth, color, 1);
  gfx.moveTo(pt.x - arm, pt.y).lineTo(pt.x + arm, pt.y);
  gfx.moveTo(pt.x, pt.y - arm).lineTo(pt.x, pt.y + arm);

  if (distance === null) {
    label.visible = false;
    return;
  }
  label.visible = true;
  label.text = range?.long > 0
    ? `${distance.toFixed(1)} m / maks. ${range.long.toFixed(1)} m`
    : `${distance.toFixed(1)} m`;
  label.style.fill = color;
  label.position.set(pt.x, pt.y - halfHeight - lineWidth * 2);
}
