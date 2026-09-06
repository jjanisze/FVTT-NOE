/**
 * Neuroshima 5e — Sequencer integration layer.
 *
 * Soft dependency on the Sequencer module (https://foundryvtt.com/packages/sequencer).
 * All functions are no-ops / fall back to legacy behavior when Sequencer is absent.
 *
 * Public API:
 *   seqPlayAudio(src, vol, opts)          — play audio via Sequencer; returns false if unavailable
 *   seqStartLoop(src, vol, origin, opts)  — start a persisted, indefinitely-looping sound
 *   seqStopLoop(origin)                   — end a loop started with seqStartLoop, for all clients
 *   seqEffect(file, source, opts)         — canvas VFX on a token or a raw {x,y} point, one-shot or persistent
 *   seqEndEffect(name)                    — end a named persistent effect, for all clients
 *   seqEffectRunning(name)                — is that named effect still playing?
 *   seqScrollText(text, source, opts)     — floating combat text above a token
 *
 * Docs: C:\Git\FoundryVTT-Sequencer\docs\api\sound.md
 *       C:\Git\FoundryVTT-Sequencer\docs\api\effect.md
 *       C:\Git\FoundryVTT-Sequencer\docs\api\scrolling-text.md
 *       C:\Git\FoundryVTT-Sequencer\typings\types.d.ts
 */

/* -------------------------------------------- */
/*  Internals                                     */
/* -------------------------------------------- */

function _getSequencer() {
  return game.modules.get("sequencer")?.active ? window.Sequence : null;
}

/**
 * Resolve an Actor, TokenDocument, or Token placeable to a canvas Token placeable.
 * Returns null when no token can be found on the current scene.
 * @param {Actor|TokenDocument|Token|null} source
 * @returns {Token|null}
 */
function _resolveToken(source) {
  if (!source) return null;
  // Token placeable (has a TokenDocument as .document)
  if (source.document?.documentName === "Token") return source;
  // TokenDocument → return its canvas placeable object
  if (source.documentName === "Token") return source.object ?? null;
  // Actor → first active token on the current canvas scene
  if (source.documentName === "Actor") return source.getActiveTokens()[0] ?? null;
  return null;
}

/* -------------------------------------------- */
/*  Radius table (feet) per WeaponSound key       */
/* -------------------------------------------- */

/** Default hearing radius (in scene grid units, typically feet) per sound type. */
const SOUND_RADIUS = {
  shot_firearm:        50,
  shot_silenced:       20,
  shot_ranged:         30,
  burst_short:         60,
  burst_long:          70,
  burst_crushing:      90,
  suppressive:         70,
  jam:                 10,
  empty_click:          8,
  reload_mag:           8,
  reload_single:        8,
  reload_other:         8,
  unjam:                8,
  weapon_break:        10,
  clean_weapon:         6,
  shot_rocket:         90,
  shot_grenade:        60,
  explosion_large:    120,
  explosion_small:     80,
  exp_flashbang:       60,
  exp_gas:             50,
  exp_molotov:         60,
  exp_pipebomb:        70,
  exp_blast:           80,
  exp_blast_short:     80,
  exp_detonator:       15,
  mine_arm:            10,
  melee_miss:          15,
  melee_hit_blunt:     15,
  melee_hit_slashing:  15,
  melee_hit_heavy:     20,
  melee_hit_massive:   25,
  melee_degrade:       10,
  engine_start:        30,
  engine_stop:         25,
  engine_idle_loop:    20,
  // Impact is emitted at the TARGET, not the shooter. Kept fairly tight: a
  // round striking a body is a much quieter event than the report that sent it.
  impact:              25,
};

/* -------------------------------------------- */
/*  Public API — Audio                            */
/* -------------------------------------------- */

/**
 * Play an audio file via Sequencer.
 *
 * Phase 1 (current): .globalSound() — all players on the scene hear it at the same volume.
 * Phase 2 (future):  .atLocation(token) — positional audio with distance falloff and panning.
 *
 * @param {string}  src             Full file path (relative to FVTT data root, e.g. modules/…/shot.ogg).
 * @param {number}  vol             Linear volume 0–1 (exponential scaling already applied by caller).
 * @param {object}  [opts]
 * @param {Actor|TokenDocument|Token|null} [opts.token]  Origin for positional audio (Phase 2).
 * @param {string}  [opts.soundKey] WeaponSound enum key, used to look up radius in SOUND_RADIUS.
 * @returns {boolean} true = Sequencer handled playback; false = caller must use legacy fallback.
 */
export function seqPlayAudio(src, vol, { token, soundKey } = {}) {
  const Seq = _getSequencer();
  if (!Seq) return false;

  const resolvedToken = _resolveToken(token);

  let section = new Seq().sound().file(src).volume(vol);

  if (resolvedToken) {
    // Phase 2: positional audio from the firing token
    const radius = SOUND_RADIUS[soundKey] ?? 50;
    section = section
      .atLocation(resolvedToken)
      .radius(radius)
      .distanceEasing(true)
      .panSound()
      .constrainedByWalls(false)
      .muffledEffect({ type: "lowpass", intensity: 5 })
      .alwaysForGMs();
  } else {
    // Phase 1: global broadcast to all connected clients on the scene
    section = section.globalSound();
  }

  section.play();
  return true;
}

/**
 * Start a persisted, indefinitely-looping audio track via Sequencer (e.g. an
 * idling engine). The loop keeps playing — including for clients who join or
 * reload later — until stopped with {@link seqStopLoop} using the same origin.
 *
 * No-op (returns false) when Sequencer is inactive; the caller is expected to
 * treat that as "no ambient loop available" rather than falling back to a
 * legacy `<audio loop>`, since only Sequencer's Sound Manager can end it
 * cleanly and in sync for every connected client.
 *
 * @param {string}  src     Full file path (relative to FVTT data root).
 * @param {number}  vol     Linear volume 0–1 (exponential scaling already applied by caller).
 * @param {string}  origin  UUID (e.g. the item's) used to find and end this loop later.
 * @param {object}  [opts]
 * @param {Actor|TokenDocument|Token|null} [opts.token]  Origin for positional audio.
 * @param {string}  [opts.soundKey] WeaponSound enum key, used to look up radius in SOUND_RADIUS.
 * @returns {boolean} true = loop started; false = Sequencer unavailable.
 */
export function seqStartLoop(src, vol, origin, { token, soundKey } = {}) {
  const Seq = _getSequencer();
  if (!Seq || !origin) return false;

  const resolvedToken = _resolveToken(token);

  let section = new Seq().sound().file(src).volume(vol)
    .origin(origin)
    .persist(true)
    .loopOptions({ loops: 0 })
    .fadeInAudio(250)
    .fadeOutAudio(400)
    .extraEndDuration(400);

  if (resolvedToken) {
    const radius = SOUND_RADIUS[soundKey] ?? 30;
    section = section
      .atLocation(resolvedToken)
      .radius(radius)
      .distanceEasing(true)
      .panSound()
      .constrainedByWalls(false)
      .muffledEffect({ type: "lowpass", intensity: 5 })
      .alwaysForGMs();
  } else {
    section = section.globalSound();
  }

  section.play();
  return true;
}

/**
 * Stop a loop previously started with {@link seqStartLoop}, for every
 * connected client. No-op when Sequencer is inactive or nothing is playing
 * for that origin.
 *
 * @param {string} origin  Same UUID passed to seqStartLoop.
 * @returns {boolean} true = Sequencer handled it; false = Sequencer unavailable.
 */
export function seqStopLoop(origin) {
  if (!game.modules.get("sequencer")?.active || !origin) return false;
  window.Sequencer.SoundManager.endSounds({ origin });
  return true;
}

/* -------------------------------------------- */
/*  Public API — Canvas effects                  */
/* -------------------------------------------- */

/**
 * Play a JB2A (or any Sequencer-database) effect on a token — or, since the
 * grenade-explosion VFX added 2026-09-06, at a raw canvas point that isn't
 * anchored to any placeable at all.
 *
 * Both dependencies are soft: no Sequencer, no resolvable location, or no such
 * entry in the effect database and this returns false without throwing.
 * `.file()` on a missing database path is a hard error in Sequencer, hence the
 * `entryExists` guard — a user who never installed JB2A should lose the flames,
 * not the burning rules. That guard only applies to Sequencer-database dot
 * paths (`"jb2a.flames.01.orange"`); a literal file path (anything containing
 * "/", e.g. `"modules/…/vfx/explosion_ring_xl.png"`) was never registered in
 * that database and is skipped straight to `.file()`, exactly like Sequencer's
 * own docs describe both forms working (effect.md, "File").
 *
 * API reference: C:\Git\FoundryVTT-Sequencer\docs\api\effect.md
 *
 * @param {string} file   Sequencer database path OR a literal file path.
 * @param {Actor|TokenDocument|Token|{x:number,y:number}|null} source  A raw
 *   `{x,y}` point plays at that exact canvas position instead of on a token —
 *   distinguished from a placeable/document by having no `.document`/
 *   `.documentName` of its own, so a real Token/TokenDocument is never
 *   mistaken for one even though both also expose numeric `.x`/`.y`.
 * @param {object}  [opts]
 * @param {number}  [opts.scale=1]      Size relative to the token. Ignored when `sizeSquares` is set.
 * @param {number}  [opts.sizeSquares]  Absolute size in TARGET-scene grid squares (via
 *   `.size(n, {gridUnits:true})`) — for a raw-point effect that has no token to scale
 *   relative to. Takes priority over `scale` when set.
 * @param {number}  [opts.opacity=1]
 * @param {boolean} [opts.attach]       Follow the token as it moves, instead of a fixed spot.
 *   Ignored for a raw-point `source` (nothing to attach to).
 * @param {string}  [opts.name]         Required with `attach` + persist; the handle for seqEndEffect.
 * @param {boolean} [opts.persist]      Loop indefinitely and survive a reload.
 * @param {*}       [opts.tieTo]        A Document (or array of Documents) to pass to
 *   `.tieToDocuments()` — ends this effect automatically the instant any of them is
 *   deleted, instead of requiring a separate cleanup hook.
 * @param {boolean} [opts.belowTokens=false]   Render under the token layer (ground-level VFX).
 * @param {boolean} [opts.randomRotation=false]
 * @param {string}  [opts.blendMode]    Compositing mode, e.g. "darken"/"multiply" — see
 *   Sequencer's effect.md ("Blend Mode"). Needed for an opaque-background decal (a scorch
 *   mark on a white square, say) to actually vanish into the terrain instead of painting
 *   a visible box; plain alpha compositing alone won't do that.
 * @param {number}  [opts.zIndex]       Explicit paint-order tiebreak against another effect
 *   sharing the same `belowTokens`/elevation tier — e.g. a scorch decal UNDER its own
 *   explosion sprite needs this pinned down explicitly rather than relying on whichever
 *   order they happened to be created in.
 * @param {string}  [opts.label]        Text baked ONTO the effect itself (Sequencer's
 *   `.text()`) — guaranteed to share the effect's own paint order/position, unlike a
 *   separate Drawing's label, which renders on a different layer with no shared
 *   z-index to arbitrate (this is what grenade-inventory.mjs's blast marker hit).
 * @param {object}  [opts.labelStyle]   PIXI TextStyle override; defaults to a bold
 *   white-on-black-stroke style sized for readability over a bright sprite.
 * @param {number}  [opts.fadeIn=0]
 * @param {number}  [opts.fadeOut=400]
 * @param {number}  [opts.delay=0]
 * @returns {boolean} true = Sequencer played it.
 */
export function seqEffect(file, source, {
  scale = 1, opacity = 1, attach = false, name, persist = false,
  sizeSquares, tieTo, belowTokens = false, randomRotation = false,
  blendMode, zIndex,
  label, labelStyle,
  fadeIn = 0, fadeOut = 400, delay = 0
} = {}) {
  const Seq = _getSequencer();
  if (!Seq) return false;

  const isDbPath = !String(file).includes("/");
  if (isDbPath && !window.Sequencer.Database.entryExists(file)) {
    console.warn(`neuroshima-2026-overrides | brak efektu "${file}" w bazie Sequencera — pomijam`);
    return false;
  }

  const isRawPoint = !!source && typeof source.x === "number" && typeof source.y === "number"
    && !source.document && !source.documentName;
  const token = isRawPoint ? null : _resolveToken(source);
  if (!isRawPoint && !token) return false;

  let fx = new Seq().effect().file(file).opacity(opacity);
  fx = isRawPoint ? fx.atLocation(source)
    : (attach ? fx.attachTo(token, { bindAlpha: false }) : fx.atLocation(token));
  fx = sizeSquares ? fx.size(sizeSquares, { gridUnits: true }) : fx.scaleToObject(scale);
  if (persist) fx = fx.persist();
  if (belowTokens) fx = fx.belowTokens();
  if (randomRotation) fx = fx.randomRotation();
  if (blendMode) fx = fx.blendMode(blendMode);
  if (Number.isFinite(zIndex)) fx = fx.zIndex(zIndex);
  if (label) {
    // Sequencer's own renderer multiplies fontSize by (150 / canvas.grid.size)
    // before handing it to PIXI (canvas-effect.js) — confirmed live, along with
    // two things that AREN'T true despite looking plausible: the sprite's own
    // shrink-to-fit scale from `.size()` above does NOT reach this text (a
    // live PIXI-tree walk found the text's rendered scale matches the canvas
    // zoom alone, nothing else), and PIXI never wraps text on its own — no
    // `wordWrap` was ever set, so a long label just ran on at full width
    // regardless of font size. So "gigantic" → "still XLARGE" wasn't the
    // per-glyph size settling down, it was the STRING overflowing a small
    // sprite with nothing to stop it. Fixed with both pieces together:
    //  - fontSize scales mildly WITH the effect's own size (16..24 effective
    //    px across sizeSquares 2..6) — "small" on a small blast, "medium" at
    //    most on a big one, never fixed-and-oversized for every size alike.
    //  - wordWrapWidth caps each line at the sprite's own on-screen footprint
    //    (`sizeSquares * canvas.grid.size` — the same grid-units math `.size()`
    //    itself uses, and the same coordinate space the text turned out to
    //    live in), `breakWords:false` so it only breaks BETWEEN words (after
    //    "granat", not mid-word), `align:"center"` so the wrapped lines don't
    //    look lopsided under the centered sprite.
    const squares = Number(sizeSquares) || 3;
    const effectivePx = Math.min(24, Math.max(16, 16 + 2 * (squares - 2)));
    fx = fx.text(label, labelStyle ?? {
      fill: "#ffffff", fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: effectivePx * ((canvas.grid?.size ?? 150) / 150),
      stroke: "#000000", strokeThickness: 4,
      align: "center",
      wordWrap: true,
      breakWords: false,
      wordWrapWidth: squares * (canvas.grid?.size ?? 150)
    });
  }
  if (name) fx = fx.name(name);
  if (fadeIn) fx = fx.fadeIn(fadeIn);
  if (fadeOut) fx = fx.fadeOut(fadeOut);
  if (delay) fx = fx.delay(delay);
  if (tieTo) fx = fx.tieToDocuments(tieTo);
  fx.play();
  return true;
}

/**
 * End a named effect started with {@link seqEffect}, on every client.
 * @param {string} name
 * @returns {boolean} true = Sequencer handled it.
 */
export function seqEndEffect(name) {
  if (!game.modules.get("sequencer")?.active || !name) return false;
  window.Sequencer.EffectManager.endEffects({ name });
  return true;
}

/**
 * Is a named effect currently playing anywhere on the canvas?
 * @param {string} name
 * @returns {boolean}
 */
export function seqEffectRunning(name) {
  if (!game.modules.get("sequencer")?.active || !name) return false;
  return (window.Sequencer.EffectManager.getEffects({ name }) ?? []).length > 0;
}

/* -------------------------------------------- */
/*  Public API — Scrolling Combat Text           */
/* -------------------------------------------- */

/**
 * Display floating scrolling text above a token on the canvas.
 * No-op when Sequencer is not active or no token can be resolved.
 *
 * API reference: C:\Git\FoundryVTT-Sequencer\docs\api\scrolling-text.md
 *
 * @param {string}  text
 * @param {Actor|TokenDocument|Token|null} source  Token or actor to float text above.
 * @param {object}  [opts]
 * @param {string}  [opts.color="#ffffff"]    PIXI fill color (hex string).
 * @param {number}  [opts.fontSize=28]
 * @param {number}  [opts.duration=1500]      Total visible time in ms.
 */
export function seqScrollText(text, source, { color = "#ffffff", fontSize = 28, duration = 1500 } = {}) {
  const Seq = _getSequencer();
  if (!Seq) return;

  const token = _resolveToken(source);
  if (!token) return;

  new Seq()
    .scrollingText()
      .atLocation(token)
      .text(text, {
        fill: color,
        fontSize,
        fontFamily: "Arial Black, Arial, sans-serif",
        strokeThickness: 4,
        stroke: "#000000",
      })
      .duration(duration)
      .direction("TOP")
    .play();
}
