/**
 * Neuroshima 5e — firearm tracer VFX engine.
 *
 * A lightweight, self-contained PIXI particle system purpose-built for gunfire.
 * Replaces the Sequencer/JB2A webm approach (which does not scale to a Minigun
 * Miażdżąca seria) with:
 *   - procedurally-baked textures (offscreen canvas → cached PIXI.Texture),
 *   - a single shared ticker updating all live particles,
 *   - an object pool (sprites are recycled, never re-allocated),
 *   - a socket broadcast so every client renders locally (no video sync).
 *
 * Design notes: PLAN_shooting_vfx.md. Tunable at runtime via `game.neuroshima.vfx.tune`.
 *
 * Textures are baked in JS (not authored offline) specifically to keep the tuning
 * loop live: change a number → `rebake()` → see it immediately. The engine consumes
 * a PIXI.Texture regardless of origin, so an authored PNG can be swapped in later.
 */

import { getCaliberVisualOverride } from "../config/caliber-vfx.mjs";
import { getWeaponVisualOverride } from "../config/weapon-vfx.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const SOCKET_EVENT = `module.${MODULE_ID}`;

/* -------------------------------------------- */
/*  Tunable parameters                            */
/* -------------------------------------------- */

/** Live-tunable knobs. Mutate then call `rebake()` for texture-affecting values. */
export const TUNE = {
  // — Tracer texture (baked) —
  tracerLength: 240,       // px, very elongated streak (head→tail)
  tracerThickness: 6,      // px, core line width
  coreColor: "#fff4d6",    // hot white-gold core
  glowColor: "#ff7a1a",    // orange glow/tail
  glowBlur: 9,             // px, baked soft blur (NOT a runtime filter)

  // — Motion —
  speed: 4600,             // px/sec, fast
  spreadPx: 24,            // lateral jitter of aim point within a burst
  staggerMs: 20,           // delay between successive tracers in a burst
  // Ceiling on how long a TARGETED burst (single fire, KS) may take to leave the
  // barrel. `staggerMs` is shortened, never lengthened, so these stay short and
  // snappy. Does not apply to area fire — see the area block below. 0 disables.
  burstMaxMs: 2200,

  // — Area (template) burst pacing —
  // Templated modes read completely differently from a snap shot: DS/MS/OZ are
  // sustained fire raking a zone, so their tracers are spread over a real
  // duration instead of being dumped out at `staggerMs`. The launch window is
  // STRETCHED to fill the duration below (targeted fire is only ever
  // compressed), which is what makes a 30-round Długa seria last ~2,4 s instead
  // of the ~0,6 s it took when it shared the snap-shot cadence.
  areaMsPerRound: 80,      // ≈750 rpm — duration scales with rounds actually fired
  areaMinMs: 1200,         // floor, so even a 6-round OZ reads as sustained
  areaMaxMs: 4200,         // ceiling, so a 200-round MS stays watchable
  // Area tracers also fly slower than a snap shot's, so the burst reads as a
  // sweep you can follow rather than an instant flicker. 1 = same as `speed`.
  areaSpeedScale: 0.65,

  // — Miss behaviour —
  missVeerDeg: 16,         // extra angle a missed shot veers off the shooter→target axis
  missVeerJitter: 8,       // ± random extra veer
  missOvershoot: 1.7,      // how far past the target distance a miss keeps flying
  missFadeMs: 200,         // fade-to-alpha:0 duration once past closest approach

  // — Muzzle flash (baked) —
  muzzleSize: 96,          // px texture size
  muzzleColor: "#ffcf7a",
  muzzleDurMs: 70,         // quick pop
  muzzleScale: 0.9,        // peak scale relative to texture

  // — Magdump scaling (visible tracers vs real rounds) —
  maxParticles: 300,       // hard cap on visible tracers per burst (refined by benchmark)
  mapKnee: 3,              // rounds ≤ knee render 1:1
  // Roughly equal to the span it fills (maxParticles - mapKnee = 297), which is
  // what makes the curve start at 1:1 and then thin out. It was 34, giving an
  // initial slope of ~8.7 — a 20-round burst drew 120 tracers. See
  // visibleTracerCount() for the relationship.
  mapCompression: 300,     // e-folding in rounds; LOWER = denser, HIGHER = thinner
};

/* -------------------------------------------- */
/*  Module state                                  */
/* -------------------------------------------- */

let _layer = null;                 // PIXI.Container in world space
let _tracerTexture = null;         // baked
let _muzzleTexture = null;         // baked
let _tracerAnchorX = 1;            // normalized head anchor
let _tracerRevealLen = 0;          // px of travel needed to fully reveal the streak (== drawn line length)
// Per-(weapon,caliber) baked visual sets, keyed "w:<weaponId>|c:<caliberId>".
// Lazily populated the first time a given combination is actually fired.
const _visualCache = new Map();
const _pool = [];                  // recycled PIXI.Sprite
const _active = [];                // live particles
let _tickerBound = false;

const _perf = {
  active: 0,
  peakActive: 0,
  spawnedTotal: 0,
  recycledTotal: 0,
  fps: 60,
  droppedFrames: 0,
};

/* -------------------------------------------- */
/*  Small helpers                                 */
/* -------------------------------------------- */

function _hexToRgba(hex, a = 1) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Resolve a Token *placeable* (not just a point) so callers can read its size. */
function _resolveToken(source) {
  if (!source) return null;
  if (source.center && typeof source.w === "number") return source;                      // Token placeable
  if (source.object?.center && typeof source.object.w === "number") return source.object; // TokenDocument
  if (source.documentName === "Actor") return source.getActiveTokens?.()[0] ?? null;
  return null;
}

function _resolveCenter(source) {
  const tok = _resolveToken(source);
  if (tok) return { x: tok.center.x, y: tok.center.y };
  if (typeof source?.x === "number" && typeof source?.y === "number") return { x: source.x, y: source.y };
  return null;
}

/**
 * Muzzle origin: the shooter's token center, pushed toward the aim point until it exits
 * the token's bounding box — so the barrel sits at the token's edge facing the target,
 * scaling with actual token size (Large/Huge tokens push it further out). Token rotation
 * is deliberately ignored — only the shooter→target line matters.
 * Falls back to the plain center when the shooter isn't a placed token, or there's no aim
 * point to derive a direction from (e.g. no target selected).
 */
function _resolveMuzzleOrigin(shooter, aimPoint) {
  const tok = _resolveToken(shooter);
  const center = tok ? { x: tok.center.x, y: tok.center.y } : _resolveCenter(shooter);
  if (!center) return null;
  if (!tok || !aimPoint) return center;

  const dx = aimPoint.x - center.x, dy = aimPoint.y - center.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return center;
  const ux = dx / dist, uy = dy / dist;

  // Ray/AABB exit distance along (ux,uy) — correct for non-square (e.g. 2x1) tokens too.
  const hw = tok.w / 2, hh = tok.h / 2;
  const tx = hw / Math.max(Math.abs(ux), 1e-6);
  const ty = hh / Math.max(Math.abs(uy), 1e-6);
  const offset = Math.min(tx, ty);

  return { x: center.x + ux * offset, y: center.y + uy * offset };
}

/**
 * Per-tracer launch delay, shortened so `n` tracers all leave the barrel within
 * `burstMaxMs`. Never lengthens the configured stagger — short bursts keep their
 * tuned rhythm and only long ones (MS) get compressed.
 */
function _staggerFor(n, tune) {
  if (!(tune.burstMaxMs > 0) || n <= 1) return tune.staggerMs;
  return Math.min(tune.staggerMs, tune.burstMaxMs / (n - 1));
}

/* -------------------------------------------- */
/*  Area (template) fire geometry                 */
/* -------------------------------------------- */

/**
 * Resolve an area template to `{ bounds, contains }` in SCENE coordinates.
 *
 * Foundry v14 retired placed MeasuredTemplates: `TemplateLayer#_draw` leaves its
 * object container permanently empty ("only preview Measured Templates are
 * possible") and every placed template is mirrored by a **Region document that
 * shares the template's id**, flagged `core.MeasuredTemplate`. The Region is what
 * renders, what carries the shape, and what the rules test against — so it is
 * what the tracers must aim at.
 *
 * This matters beyond tidiness: the legacy `MeasuredTemplate#_computeShape()` is
 * still present and still callable, but on a scene whose grid is not 20 px per
 * unit it returns a wildly inflated shape (this world's 36 m × 1,5 m DS line
 * comes out 84 m × 70 m, because `distance` is now stored in 20-px units and
 * `width` in pixels while the deprecated math treats both as grid units).
 * Sampling that would have sprayed a burst across most of the map.
 *
 * The legacy branch is kept only as a pre-v14 fallback, where it is correct.
 */
function _resolveAreaGeometry(doc) {
  const region = (doc.documentName === "Region")
    ? doc
    : (canvas.scene?.regions?.get(doc.id) ?? null);
  if (region?.polygonTree) {
    // polygonTree.testPoint(), not region.testPoint(): the latter also filters on
    // elevation, which a 2D impact point does not carry.
    return { bounds: region.bounds, contains: p => region.polygonTree.testPoint(p) };
  }

  const obj = doc.object ?? canvas.templates?.get(doc.id) ?? null;
  let shape = obj?.shape ?? null;
  if (!shape && obj?._computeShape) { try { shape = obj._computeShape(); } catch { /* ignore */ } }
  if (!shape || !Number.isFinite(doc.x) || !Number.isFinite(doc.y)) return null;
  const b = shape.getBounds();
  return {
    bounds: new PIXI.Rectangle(b.x + doc.x, b.y + doc.y, b.width, b.height),
    contains: p => shape.contains(p.x - doc.x, p.y - doc.y),
  };
}

/**
 * Sample `n` impact points inside an area's geometry, in scene coordinates.
 *
 * Rejection sampling over the bounding box — `contains()` is the whole contract,
 * so this works for any shape (line, rectangle, circle, polygon) without knowing
 * which one it got.
 *
 * Two biases on top of uniform:
 *  - points nearer the muzzle are accepted with probability d/dMax, so a long
 *    line (DS 36 m, MS 150 m — both anchored AT the shooter) concentrates its
 *    impacts downrange instead of dumping a third of the burst into the
 *    shooter's own square. On a compact zone (OZ 3×3 m) every point is at
 *    roughly the same range, so the bias is inert — the same rule does the
 *    right thing for both without a per-shape special case.
 *  - nothing lands within half a grid square of the muzzle.
 *
 * The bias is dropped once half the attempt budget is spent, so a pathological
 * shape degrades to plain uniform sampling rather than returning short.
 */
function _sampleAreaPoints(geometry, origin, n) {
  const b = geometry.bounds;
  let dMax = 0;
  for (const [cx, cy] of [[b.x, b.y], [b.right, b.y], [b.x, b.bottom], [b.right, b.bottom]]) {
    dMax = Math.max(dMax, Math.hypot(cx - origin.x, cy - origin.y));
  }
  const dMin = (canvas.grid?.size ?? 100) * 0.5;
  const budget = n * 40 + 200;
  const points = [];
  for (let tries = 0; (points.length < n) && (tries < budget); tries++) {
    // Rounded BEFORE the containment test, not after: sub-pixel impact positions
    // are invisible and the points get rounded for the socket payload anyway, so
    // rounding afterwards could nudge a point just outside the shape it was
    // accepted for.
    const p = {
      x: Math.round(b.x + Math.random() * b.width),
      y: Math.round(b.y + Math.random() * b.height),
    };
    if (!geometry.contains(p)) continue;
    const d = Math.hypot(p.x - origin.x, p.y - origin.y);
    if (d < dMin) continue;
    if ((tries < budget / 2) && (dMax > 0) && (Math.random() > d / dMax)) continue;
    points.push(p);
  }
  return points;
}

/* -------------------------------------------- */
/*  Texture baking (procedural, re-runnable)      */
/* -------------------------------------------- */

function _bakeTracerTexture(tune = TUNE) {
  const t = tune;
  const pad = Math.ceil(t.glowBlur * 2 + 2);
  const w = Math.ceil(t.tracerLength + pad * 2);
  const h = Math.ceil(t.tracerThickness + pad * 2);
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d");
  const cy = h / 2;
  const x0 = pad;            // tail
  const x1 = w - pad;        // head
  c.lineCap = "round";

  // Glow pass (soft, orange).
  c.strokeStyle = t.glowColor;
  c.shadowColor = t.glowColor;
  c.shadowBlur = t.glowBlur;
  c.globalAlpha = 0.85;
  c.lineWidth = t.tracerThickness;
  c.beginPath(); c.moveTo(x0, cy); c.lineTo(x1, cy); c.stroke();

  // Core pass (hot, brightening toward the head) using additive blending.
  c.globalCompositeOperation = "lighter";
  c.globalAlpha = 1;
  c.shadowColor = t.coreColor;
  c.shadowBlur = Math.max(1, t.glowBlur * 0.5);
  const grad = c.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0.0, _hexToRgba(t.coreColor, 0));
  grad.addColorStop(0.6, _hexToRgba(t.coreColor, 0.5));
  grad.addColorStop(1.0, _hexToRgba(t.coreColor, 1));
  c.strokeStyle = grad;
  c.lineWidth = Math.max(1, t.tracerThickness * 0.42);
  c.beginPath(); c.moveTo(x0, cy); c.lineTo(x1, cy); c.stroke();

  return {
    texture: PIXI.Texture.from(cv),
    anchorX: x1 / w,       // head sits at the particle position
    revealLen: x1 - x0,    // == tracerLength; travel needed before the tail clears the muzzle
  };
}

function _bakeMuzzleTexture(tune = TUNE) {
  const t = tune;
  const s = Math.ceil(t.muzzleSize);
  const cv = document.createElement("canvas");
  cv.width = s; cv.height = s;
  const c = cv.getContext("2d");
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, _hexToRgba(t.muzzleColor, 0.95));
  g.addColorStop(0.6, _hexToRgba(t.glowColor, 0.45));
  g.addColorStop(1.0, _hexToRgba(t.glowColor, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
  return { texture: PIXI.Texture.from(cv) };
}

/**
 * Drop the per-(weapon,caliber) baked cache without touching the global
 * textures. Call after mutating a CALIBER_VFX / WEAPON_VFX `visual` block at
 * runtime — the debug panel does this on every slider move, where a full
 * `rebake()` would needlessly re-bake the global textures too.
 */
export function invalidateVisualCache() {
  for (const entry of _visualCache.values()) {
    entry.tracerTexture.destroy(true);
    entry.muzzleTexture.destroy(true);
  }
  _visualCache.clear();
}

/** (Re)bake all textures from the current TUNE values. Call after mutating TUNE. */
export function rebake() {
  _tracerTexture?.destroy(true);
  _muzzleTexture?.destroy(true);
  const tracerBaked = _bakeTracerTexture();
  _tracerTexture = tracerBaked.texture;
  _tracerAnchorX = tracerBaked.anchorX;
  _tracerRevealLen = tracerBaked.revealLen;
  _muzzleTexture = _bakeMuzzleTexture().texture;
  // Existing pooled sprites keep their old texture ref only until reused; refresh eagerly.
  for (const spr of _pool) spr.texture = _tracerTexture;

  // Cached per-weapon/per-caliber bakes are {...TUNE, ...override} snapshots —
  // stale the instant a global TUNE field changes. Drop them; they'll re-bake
  // lazily on next use.
  invalidateVisualCache();
}

/**
 * Resolve the texture/tune set to use for one shot: weapon-specific override
 * (if any) cascaded over the caliber's override (if any) cascaded over the
 * global default TUNE — each FIELD resolves independently through the three
 * tiers, so e.g. a weapon overriding only muzzleScale still inherits its
 * caliber's color/length/speed rather than losing them. Baked lazily and
 * cached per (weaponId, caliberId) pair actually seen.
 * @param {string|null} caliberId
 * @param {string|null} weaponId
 */
function _resolveVisualSet(caliberId, weaponId) {
  const caliberOverride = caliberId ? getCaliberVisualOverride(caliberId) : null;
  const weaponOverride = weaponId ? getWeaponVisualOverride(weaponId) : null;
  if (!caliberOverride && !weaponOverride) {
    return {
      tune: TUNE, tracerTexture: _tracerTexture, tracerAnchorX: _tracerAnchorX,
      tracerRevealLen: _tracerRevealLen, muzzleTexture: _muzzleTexture,
    };
  }

  const cacheKey = `w:${weaponId ?? ""}|c:${caliberId ?? ""}`;
  const cached = _visualCache.get(cacheKey);
  if (cached) return cached;

  const tune = { ...TUNE, ...(caliberOverride ?? {}), ...(weaponOverride ?? {}) };
  const tracerBaked = _bakeTracerTexture(tune);
  const muzzleBaked = _bakeMuzzleTexture(tune);
  const entry = {
    tune,
    tracerTexture: tracerBaked.texture,
    tracerAnchorX: tracerBaked.anchorX,
    tracerRevealLen: tracerBaked.revealLen,
    muzzleTexture: muzzleBaked.texture,
  };
  _visualCache.set(cacheKey, entry);
  return entry;
}

/* -------------------------------------------- */
/*  Sprite pool                                   */
/* -------------------------------------------- */

function _acquire(texture) {
  const spr = _pool.pop() ?? new PIXI.Sprite();
  spr.texture = texture;
  spr.visible = true;
  spr.alpha = 1;
  spr.scale.set(1, 1);   // pooled sprites may carry leftover scale from a prior muzzle life
  spr.blendMode = PIXI.BLEND_MODES.ADD;
  _layer.addChild(spr);
  return spr;
}

function _release(p) {
  const spr = p.sprite;
  spr.visible = false;
  if (spr.parent) spr.parent.removeChild(spr);
  _pool.push(spr);
  _perf.recycledTotal++;
}

/* -------------------------------------------- */
/*  Particle spawning                             */
/* -------------------------------------------- */

function _spawnMuzzle(origin, angle, visualSet, delay = 0) {
  if (!visualSet.muzzleTexture) return;
  const spr = _acquire(visualSet.muzzleTexture);
  spr.anchor.set(0.5, 0.5);
  spr.position.set(origin.x, origin.y);
  spr.rotation = angle;
  spr.scale.set(visualSet.tune.muzzleScale * 0.5);
  spr.visible = delay <= 0;   // a deferred flash must not sit fully-formed at the barrel
  _active.push({
    sprite: spr,
    kind: "muzzle",
    born: performance.now() + delay,
    life: visualSet.tune.muzzleDurMs,
    muzzleScale: visualSet.tune.muzzleScale, // snapshot — see _update() for why this can't read TUNE live
  });
}

function _spawnTracer(origin, aim, { hit, delay, visualSet, speedScale = 1 }) {
  const tune = visualSet.tune;
  const spr = _acquire(visualSet.tracerTexture);
  spr.anchor.set(visualSet.tracerAnchorX, 0.5);
  spr.visible = false; // stays hidden until the stagger delay elapses AND it's clear of the muzzle

  let dx = aim.x - origin.x;
  let dy = aim.y - origin.y;
  const dist = Math.hypot(dx, dy) || 1;
  let ux = dx / dist, uy = dy / dist;

  let maxTravel = dist;
  let fadeStart = dist;          // for hits: no fade, recycle on arrival
  let fadeMs = 0;

  if (!hit) {
    // Veer off the shooter→target axis, keep flying past, fade after closest approach.
    const veer = (tune.missVeerDeg + (Math.random() * 2 - 1) * tune.missVeerJitter)
      * (Math.random() < 0.5 ? -1 : 1) * Math.PI / 180;
    const cos = Math.cos(veer), sin = Math.sin(veer);
    const rx = ux * cos - uy * sin;
    const ry = ux * sin + uy * cos;
    ux = rx; uy = ry;
    maxTravel = dist * tune.missOvershoot;
    fadeStart = dist * Math.cos(veer);   // closest approach to the target along the veered line
    fadeMs = tune.missFadeMs;
  }

  spr.position.set(origin.x, origin.y);
  spr.rotation = Math.atan2(uy, ux);

  _active.push({
    sprite: spr,
    kind: "tracer",
    ox: origin.x, oy: origin.y,
    ux, uy,
    travelled: 0,
    maxTravel,
    fadeStart,
    fadeMs,
    hit,
    speed: tune.speed * speedScale,
    startAt: performance.now() + (delay ?? 0),
    fadeElapsed: 0,
    arrived: false,       // hit only: true once clamped to maxTravel — released the NEXT tick
    // Stay hidden until this much travel has accumulated, so the (fixed-length) streak
    // never renders trailing behind the muzzle — it appears already clear of the barrel
    // instead of visibly emerging from inside/behind the shooter's token. Clamped to
    // maxTravel so point-blank shots still reveal (at worst right at arrival) rather than
    // never appearing at all.
    revealAt: Math.min(visualSet.tracerRevealLen, maxTravel),
  });
}

/* -------------------------------------------- */
/*  Ticker update                                 */
/* -------------------------------------------- */

function _update() {
  if (!_active.length) { _sampleFps(); return; }
  const now = performance.now();
  const dt = Math.min(canvas.app.ticker.deltaMS, 50) / 1000; // clamp big frame gaps

  for (let i = _active.length - 1; i >= 0; i--) {
    const p = _active[i];

    if (p.kind === "muzzle") {
      const age = now - p.born;
      if (age < 0) continue;                     // deferred flash, not due yet
      if (!p.sprite.visible) p.sprite.visible = true;
      const k = age / p.life;
      if (k >= 1) { _release(p); _active.splice(i, 1); continue; }
      // quick scale-up then alpha-out — uses the snapshot taken at spawn, not
      // the live global TUNE, so a per-weapon/per-caliber muzzleScale override
      // actually takes effect instead of silently reading whatever the debug
      // panel's slider currently is.
      const s = p.muzzleScale * (0.5 + 0.6 * Math.min(1, k * 2));
      p.sprite.scale.set(s);
      p.sprite.alpha = 1 - k;
      continue;
    }

    // tracer
    if (now < p.startAt) continue;         // still staggered

    // Hits are clamped to maxTravel and rendered there for exactly one extra tick before
    // release — otherwise the arrival frame gets hidden in the same tick it's reached
    // (canvas.app.ticker renders at LOW priority, after this NORMAL-priority update), so
    // every hit looked like it stopped one frame short — a constant, speed-dependent
    // shortfall, never an overshoot, regardless of shot distance.
    if (p.hit && p.arrived) { _release(p); _active.splice(i, 1); continue; }

    p.travelled += p.speed * dt;
    if (p.hit && p.travelled >= p.maxTravel) {
      p.travelled = p.maxTravel;   // clamp: land exactly on the target, never overshoot
      p.arrived = true;
    }
    if (!p.sprite.visible && p.travelled >= p.revealAt) p.sprite.visible = true;
    const x = p.ox + p.ux * p.travelled;
    const y = p.oy + p.uy * p.travelled;
    p.sprite.position.set(x, y);

    if (p.hit) continue;

    // miss: fade after passing closest approach
    if (p.travelled >= p.fadeStart) {
      p.fadeElapsed += canvas.app.ticker.deltaMS;
      p.sprite.alpha = Math.max(0, 1 - p.fadeElapsed / p.fadeMs);
    }
    if (p.sprite.alpha <= 0 || p.travelled >= p.maxTravel) { _release(p); _active.splice(i, 1); }
  }

  _perf.active = _active.length;
  if (_perf.active > _perf.peakActive) _perf.peakActive = _perf.active;
  _sampleFps();
}

function _sampleFps() {
  const inst = canvas.app.ticker.FPS;
  _perf.fps = _perf.fps * 0.9 + inst * 0.1;   // EMA
  if (inst < 45) _perf.droppedFrames++;
}

/* -------------------------------------------- */
/*  Magdump scaling                               */
/* -------------------------------------------- */

/**
 * Map real rounds fired → visible tracer count.
 * 1:1 up to `mapKnee`, then non-linear compression asymptotic to `maxParticles`.
 *
 * TUNING THE CURVE — `mapCompression` is an e-folding length in rounds, and its
 * only meaningful reference point is the span it is filling
 * (`maxParticles - mapKnee`). The curve's initial slope at the knee is
 * `span / mapCompression`, so:
 *
 *     mapCompression ≈ span   → starts 1:1, then thins out    (the sane default)
 *     mapCompression < span   → rises FASTER than 1:1; the min() below pins it
 *                               to 1:1 until the curve flattens, so small values
 *                               mean "stay 1:1 as long as the cap allows"
 *     mapCompression > span   → thins immediately, well below 1:1
 *
 * So LOWER is denser and HIGHER is sparser — the opposite of what the name
 * suggests, because it is an e-folding length, not a compression ratio. Lower it
 * for a solid stream (Minigun), raise it to thin one out (.50 BMG, whose tracers
 * are individually enormous).
 *
 * The `Math.min(r, …)` is a hard invariant rather than tuning: however the curve
 * is set, a burst must never draw more tracers than it fired bullets. Without it
 * the shipped default drew 120 tracers for a 20-round burst.
 *
 * @param {number} rounds
 * @param {object} [tune=TUNE]  Pass a resolved visualSet.tune to respect a
 *   caliber/weapon's own mapKnee/mapCompression/maxParticles, if it sets any.
 * @returns {number}
 */
export function visibleTracerCount(rounds, tune = TUNE) {
  const r = Math.max(1, Math.floor(rounds));
  if (r <= tune.mapKnee) return r;
  const extra = r - tune.mapKnee;
  const span = tune.maxParticles - tune.mapKnee;
  const visible = tune.mapKnee + span * (1 - Math.exp(-extra / tune.mapCompression));
  return Math.min(r, tune.maxParticles, Math.round(visible));
}

/* -------------------------------------------- */
/*  Public fire API                               */
/* -------------------------------------------- */

/**
 * Render a firearm discharge locally (spawns muzzle + tracers). No networking.
 * @param {{x:number,y:number}} origin
 * @param {{x:number,y:number}|null} target
 * @param {object} opts
 * @param {boolean} [opts.hit=false]
 * @param {number}  [opts.count=1]  Visible tracer count (already mapped).
 * @param {string|null} [opts.caliber]   Caliber id (getMag(item)?.ammoType), for visual override lookup.
 * @param {string|null} [opts.weaponId]  item.system.identifier, for visual override lookup (takes priority over caliber).
 */
export function fireLocal(origin, target, { hit = false, count = 1, caliber = null, weaponId = null } = {}) {
  if (!_layer || !_tracerTexture) return;
  if (!origin) return;

  const visualSet = _resolveVisualSet(caliber, weaponId);

  const aimBase = target ?? { x: origin.x, y: origin.y };
  const angle = Math.atan2(aimBase.y - origin.y, aimBase.x - origin.x);

  _spawnMuzzle(origin, angle, visualSet);

  // Tracer + downrange payoff only when there is a target (rewards targeting).
  if (!target) return;

  const n = Math.max(1, Math.min(count, visualSet.tune.maxParticles));
  const stagger = _staggerFor(n, visualSet.tune);
  for (let i = 0; i < n; i++) {
    const jx = (Math.random() * 2 - 1) * visualSet.tune.spreadPx;
    const jy = (Math.random() * 2 - 1) * visualSet.tune.spreadPx;
    _spawnTracer(origin, { x: target.x + jx, y: target.y + jy }, {
      hit,
      delay: i * stagger,
      visualSet,
    });
    _perf.spawnedTotal++;
  }
}

/**
 * Render an area burst locally: one muzzle flash, then a tracer to each supplied
 * impact point. No networking.
 *
 * Unlike fireLocal(), `spreadPx` is deliberately NOT applied — the points were
 * sampled inside the template, and jittering them would throw rounds outside the
 * area the player actually drew. The sampling IS the spread.
 *
 * @param {{x:number,y:number}} origin
 * @param {Array<{x:number,y:number}>} points  Impact points, scene coordinates.
 * @param {object} opts
 * @param {string|null} [opts.caliber]
 * @param {string|null} [opts.weaponId]
 */
export function fireAreaLocal(origin, points, { caliber = null, weaponId = null, durationMs = null } = {}) {
  if (!_layer || !_tracerTexture) return;
  if (!origin || !points?.length) return;

  const visualSet = _resolveVisualSet(caliber, weaponId);
  const tune = visualSet.tune;
  const pts = points.slice(0, tune.maxParticles);

  // Muzzle points at the centre of mass of the impacts, not at any one of them.
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= pts.length; my /= pts.length;
  const angle = Math.atan2(my - origin.y, mx - origin.x);

  // Spread over the requested duration (STRETCHING the cadence — the opposite of
  // _staggerFor, which only ever compresses). Falls back to the targeted cadence
  // when no duration is supplied.
  const stagger = (durationMs > 0 && pts.length > 1)
    ? durationMs / (pts.length - 1)
    : _staggerFor(pts.length, tune);

  // One muzzle flash is wrong for sustained fire: rounds are still leaving the
  // barrel seconds after a single pop has faded. Flash on a cadence instead,
  // self-limited to one per `muzzleDurMs` so a 146-tracer MS produces a
  // continuous flicker rather than 146 overlapping sprites.
  const flashEvery = Math.max(1, Math.ceil(tune.muzzleDurMs / Math.max(stagger, 1)));

  for (let i = 0; i < pts.length; i++) {
    const delay = i * stagger;
    if ((i % flashEvery) === 0) _spawnMuzzle(origin, angle, visualSet, delay);
    _spawnTracer(origin, pts[i], {
      hit: true, delay, visualSet, speedScale: tune.areaSpeedScale ?? 1,
    });
    _perf.spawnedTotal++;
  }
}

/**
 * How long an area burst should take, scaled by the rounds actually fired and
 * clamped. Uses real rounds rather than the visible tracer count so a 200-round
 * MS still feels longer than a 30-round DS even though magdump compression has
 * brought their tracer counts closer together.
 */
function _areaBurstDurationMs(rounds, tune) {
  const scaled = Math.max(1, rounds) * (tune.areaMsPerRound ?? 0);
  return Math.min(tune.areaMaxMs ?? scaled, Math.max(tune.areaMinMs ?? 0, scaled));
}

/**
 * Fire a burst INTO a placed MeasuredTemplate, broadcasting to all clients.
 *
 * This is the area-fire counterpart to tracerFire(): the fire modes that resolve
 * against a template (DS, MS, OZ) have no single target token to aim at, so the
 * template the player placed is the aim — every round lands somewhere inside it.
 * Impacts are always terminal (`hit: true`); an area burst has no to-hit roll to
 * miss, and rounds veering outside the drawn shape would misrepresent the rules.
 *
 * @param {object} opts
 * @param {Token|TokenDocument|Actor} opts.shooter
 * @param {MeasuredTemplateDocument|MeasuredTemplate} opts.template
 * @param {number} [opts.rounds=1]  Real rounds fired (mapped to visible count).
 * @param {string|null} [opts.caliber]
 * @param {string|null} [opts.weaponId]
 */
export function tracerFireArea({ shooter, template, rounds = 1, caliber = null, weaponId = null } = {}) {
  // Accepts either document flavour: a MeasuredTemplateDocument, or the Region
  // that carries its geometry under v14. Neither is required to expose x/y at the
  // document root, so don't gate on it — _resolveAreaGeometry decides. The array
  // unwrap is for dnd5e's `results.templates`, whose entries are themselves
  // arrays (see _templateDocs in fire-modes.mjs).
  const raw = Array.isArray(template) ? template[0] : template;
  const doc = raw?.document ?? raw;
  if (!doc?.id) return;

  const tune = _resolveVisualSet(caliber, weaponId).tune;
  const n = visibleTracerCount(rounds, tune);

  const geometry = _resolveAreaGeometry(doc);
  if (!geometry) return;

  // Always fired from the shooter's barrel, aimed at the middle of the area —
  // even for a line the player anchored on their own token, where the muzzle and
  // the line's origin coincide anyway. Bullets come from the gun.
  const b = geometry.bounds;
  const center = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const origin = _resolveMuzzleOrigin(shooter, center);
  if (!origin) return;

  const points = _sampleAreaPoints(geometry, origin, n);
  if (!points.length) points.push({ x: Math.round(center.x), y: Math.round(center.y) });

  // Duration is resolved here, not per client, so every viewer sees the same
  // burst length even if their TUNE has drifted.
  const durationMs = _areaBurstDurationMs(rounds, tune);

  fireAreaLocal(origin, points, { caliber, weaponId, durationMs });

  game.socket.emit(SOCKET_EVENT, {
    type: "fireAreaVfx",
    sceneId: canvas.scene?.id ?? null,
    origin, points, caliber, weaponId, durationMs,
  });
}

/**
 * Fire from tokens/actors, broadcasting to all clients on the scene.
 * @param {object} opts
 * @param {Token|TokenDocument|Actor} opts.shooter
 * @param {Token|TokenDocument|Actor|null} [opts.target]
 * @param {boolean} [opts.hit=false]
 * @param {number}  [opts.rounds=1]   Real rounds fired (mapped to visible count).
 * @param {string|null} [opts.caliber]   Caliber id (getMag(item)?.ammoType), for visual/sound override lookup.
 * @param {string|null} [opts.weaponId]  item.system.identifier, for visual override lookup (takes priority over caliber).
 */
export function tracerFire({ shooter, target, hit = false, rounds = 1, caliber = null, weaponId = null } = {}) {
  const tgt = _resolveCenter(target);
  const origin = _resolveMuzzleOrigin(shooter, tgt);
  if (!origin) return;
  const count = visibleTracerCount(rounds, _resolveVisualSet(caliber, weaponId).tune);

  fireLocal(origin, tgt, { hit, count, caliber, weaponId });

  game.socket.emit(SOCKET_EVENT, {
    type: "fireVfx",
    sceneId: canvas.scene?.id ?? null,
    origin, target: tgt, hit, count, caliber, weaponId,
  });
}

/* -------------------------------------------- */
/*  Benchmark / perf                              */
/* -------------------------------------------- */

/**
 * Stress test: spawn `count` long-lived tracers and report sustained FPS.
 * Used to derive the performance cap. Runs async, resolves after `holdMs`.
 * @param {number} count
 * @param {number} [holdMs=1500]
 * @returns {Promise<{count:number, fps:number, active:number}>}
 */
export async function stress(count, holdMs = 1500) {
  if (!_layer || !_tracerTexture) return { count, fps: 0, active: 0 };
  const c = canvas.stage.pivot;            // fire across the current view
  const cx = c.x, cy = c.y;
  const visualSet = _resolveVisualSet(null, null);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    _spawnTracer({ x: cx - Math.cos(a) * 4000, y: cy - Math.sin(a) * 4000 },
      { x: cx + Math.cos(a) * 4000, y: cy + Math.sin(a) * 4000 },
      { hit: true, delay: 0, visualSet });
    _perf.spawnedTotal++;
  }
  const samples = [];
  const t0 = performance.now();
  while (performance.now() - t0 < holdMs) {
    await new Promise(r => setTimeout(r, 100));
    samples.push(canvas.app.ticker.FPS);
  }
  const fps = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { count, fps: Math.round(fps), active: _perf.active };
}

/** Snapshot of live performance counters. */
export function stats() {
  return { ...(_perf), pooled: _pool.length };
}

/** Immediately clear all live particles. */
export function clearAll() {
  for (const p of _active) _release(p);
  _active.length = 0;
  _perf.active = 0;
}

/* -------------------------------------------- */
/*  Layer lifecycle + registration               */
/* -------------------------------------------- */

function _createLayer() {
  _destroyLayer();
  _layer = new PIXI.Container();
  _layer.eventMode = "none";
  _layer.sortableChildren = false;
  _layer.zIndex = 1000;
  canvas.stage.addChild(_layer);
  if (!_tracerTexture) rebake();
}

function _destroyLayer() {
  clearAll();
  if (_layer) {
    _layer.destroy({ children: true });
    _layer = null;
  }
  _pool.length = 0;
}

/**
 * Register the tracer VFX engine. Call once from the `ready` hook.
 */
export function registerTracerVfx() {
  Hooks.on("canvasReady", () => _createLayer());
  Hooks.on("canvasTearDown", () => _destroyLayer());
  if (canvas?.ready) _createLayer();

  if (!_tickerBound) {
    canvas.app.ticker.add(_update);
    _tickerBound = true;
  }

  // Receive fire events broadcast by other clients.
  game.socket.on(SOCKET_EVENT, data => {
    if ((data?.type !== "fireVfx") && (data?.type !== "fireAreaVfx")) return;
    if (data.sceneId && canvas.scene?.id !== data.sceneId) return;
    if (data.type === "fireAreaVfx") {
      // Impact points travel over the wire rather than being re-sampled per client
      // — sampling is random, so every client must render the same draw.
      fireAreaLocal(data.origin, data.points, {
        caliber: data.caliber, weaponId: data.weaponId, durationMs: data.durationMs,
      });
      return;
    }
    fireLocal(data.origin, data.target, { hit: data.hit, count: data.count, caliber: data.caliber, weaponId: data.weaponId });
  });

  // Expose a live tuning + benchmark harness (GM automation / debug panel).
  game.neuroshima = game.neuroshima ?? {};
  game.neuroshima.vfx = {
    tune: TUNE,
    rebake,
    fire: tracerFire,
    fireArea: tracerFireArea,
    fireLocal,
    fireAreaLocal,
    visibleTracerCount,
    stress,
    stats,
    clear: clearAll,
    /** Quick self-test between the first two tokens on the scene. */
    testFire(hit = true, rounds = 1) {
      const toks = canvas.tokens.placeables;
      if (toks.length < 2) return ui.notifications.warn("Need 2 tokens on the scene.");
      tracerFire({ shooter: toks[0], target: toks[1], hit, rounds });
    },
    /**
     * Area self-test: fires from the controlled (or first) token into the last
     * template on the scene — place one by hand, then call this.
     */
    testFireArea(rounds = 20, caliber = null) {
      const tpl = canvas.templates.placeables.at(-1);
      if (!tpl) return ui.notifications.warn("Place a template on the scene first.");
      const shooter = canvas.tokens.controlled[0] ?? canvas.tokens.placeables[0];
      if (!shooter) return ui.notifications.warn("Need a token on the scene.");
      tracerFireArea({ shooter, template: tpl.document, rounds, caliber });
    },
  };

  console.log("Neuroshima 5e | Tracer VFX engine registered");
}
