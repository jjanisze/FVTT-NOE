/**
 * Neuroshima 5e — Termowizja as a real canvas detection mode + vision mode.
 *
 * Nine Bestiariusz creatures have Termowizja (Juggernaut, Kidnaper, Biodroid,
 * Kitchin and friends). dnd5e's `attributes.senses` schema is a closed set —
 * `ranges.{darkvision, blindsight, tremorsense, truesight}` — with no room for
 * a fifth sense, and widening an actor DataModel is exactly the kind of change
 * ARCHITECTURE.md §2 warns against.
 *
 * Foundry's own vision layer, however, is open: `CONFIG.Canvas.detectionModes`
 * takes arbitrary modes, and each Token carries its own `detectionModes` array
 * with a per-token range. So Termowizja is modelled where it actually belongs —
 * on the canvas, not in the character sheet. The pack builder writes
 * `prototypeToken.detectionModes` for every creature that has it.
 *
 * ## What thermal vision is, mechanically
 *
 * - **Not light-dependent.** Works in total darkness; that is the whole point.
 * - **Blocked by walls** (`walls: true`). It sees heat, not through concrete.
 * - **Defeats visual concealment.** Camouflage and stealth hide a silhouette,
 *   not a body's heat, so a target with the Niewidoczność status is still
 *   detected. This is the one place Termowizja beats Noktowizja outright.
 * - **Useless if the sensor is blinded.** A creature with Oślepienie has lost
 *   the optics carrying this, so the mode goes dark with it.
 *
 * ## The other half: a VisionMode for what the *wearer's own screen* looks like
 *
 * The DetectionMode above answers "can this creature spot that target?" — it says nothing about
 * what the general canvas looks like from that creature's own point of view. `TERMOWIZJA_VISION_ID`
 * fills that gap for Termowizor goggles (`scripts/items/gogle.mjs`).
 *
 * First cut of this shipped with *zero* general terrain sight (RAW-faithful — "kamery" spot heat,
 * nothing says they show terrain — but boring, and the mechanics author's own reaction on seeing it
 * live was that a real thermal *sight* is a sensor-fusion device, not a bare heat camera). Current
 * shape is a genuine two-channel design instead of "Noktowizja but worse": the DetectionMode above
 * stays true heat-only detection (works in absolute zero light, long range, but only ever says
 * "something's there" — no shape, no size, no label); this VisionMode adds a short,
 * deliberately-low-resolution **fusion** channel that shows real terrain, active only while the
 * wearer has real light to amplify. "Has light" is checked once, at the `sightRange` level
 * (`gogle.mjs`'s `_gogleVisionProvider`, gated on `light-sources.mjs`'s `hasActiveLight`) rather
 * than per-pixel inside the shader — a per-pixel "is *this spot* lit" read was tried first and
 * abandoned (see this file's other doc comment, right above `TERMOWIZJA_VISION_ID`, for the
 * measurements that killed it). With no light: `sightRange` is simply absent and this channel
 * shows nothing beyond the same tiny arm's-reach baseline every actor has. Same hard desaturation +
 * hot-orange `OutlineOverlayFilter` identity as before either direction: a monster spotting a
 * thermally-visible PC, and a PC wearing these goggles spotting a monster, still render
 * identically for the detection half — the fusion channel only changes what the *backdrop* looks
 * like, never the creature-spotting color.
 */

const MODULE_ID = "neuroshima-2026-overrides";

export const TERMOWIZJA_ID = "neuroshimaTermowizja";

/**
 * Build the detection mode class lazily: `foundry.canvas.perception` is only
 * populated once the client bundle has evaluated, which is after module import
 * but before `init` fires.
 */
function defineTermowizja() {
  const { DetectionMode } = foundry.canvas.perception;
  const { OutlineOverlayFilter } = foundry.canvas.rendering.filters;
  const Token = foundry.canvas.placeables.Token;

  return class DetectionModeTermowizja extends DetectionMode {
    /** Hot-orange outline, so a thermally-spotted token reads differently
     *  from one seen normally or by tremorsense (which uses magenta). */
    static getDetectionFilter() {
      return this._detectionFilter ??= OutlineOverlayFilter.create({
        outlineColor: [1, 0.35, 0, 1],
        knockout: true,
        wave: false
      });
    }

    /** @override */
    _canDetect(visionSource, target) {
      const src = visionSource.object?.document;
      // The sensor itself is out of action.
      if (src?.hasStatusEffect(CONFIG.specialStatusEffects.BLIND)) return false;
      if (src?.hasStatusEffect(CONFIG.specialStatusEffects.BURROW)) return false;

      // Only creatures radiate; scenery does not.
      if (!(target instanceof Token)) return false;

      // Deliberately NOT checking INVISIBLE: hiding from eyes does not hide a
      // heat signature. This is what Termowizja is for.
      const tgt = target.document;
      if (tgt.hasStatusEffect(CONFIG.specialStatusEffects.BURROW)) return false;

      return true;
    }
  };
}

/**
 * Register the mode. Must run at `init`, before the canvas builds its vision
 * modes for the first scene draw.
 */
export function registerTermowizja() {
  try {
    const cls = defineTermowizja();
    CONFIG.Canvas.detectionModes[TERMOWIZJA_ID] = new cls({
      id: TERMOWIZJA_ID,
      label: "Termowizja",
      type: foundry.canvas.perception.DetectionMode.DETECTION_TYPES.SIGHT,
      walls: true,
      angle: true,
      tokenConfig: true
    });
    console.log(`${MODULE_ID} | Termowizja detection mode registered`);
  } catch (err) {
    console.error(`${MODULE_ID} | failed to register Termowizja detection mode`, err);
  }
}

/* -------------------------------------------- */
/*  VisionMode — the wearer's own screen                                     */
/* -------------------------------------------- */
// ## Sensor fusion, not "worse Noktowizja" — 6 września 2026
//
// First cut of this vision mode gave Termowizor zero general terrain sight at all (no
// `sightRange` in `gogle.mjs`'s variant entry) — RAW-faithful to the letter ("kamery" spot heat,
// nothing says they show terrain) but, per the mechanics author's own reaction when shown it live:
// a real thermal *sight* is a sensor-fusion device, not a bare heat camera — it overlays a
// low-light-amplified visible-spectrum image for terrain/navigation, which only has anything to
// amplify where there's actually some light to fuse in. Two-channel design, mirroring what modern
// FLIR-fusion optics actually do:
//
// - **Detection channel** (`TERMOWIZJA_ID` above, unchanged): true heat vision — sees a creature's
//   *presence* through smoke, foliage, camouflage, Niewidoczność, totally independent of light,
//   out to a genuinely long range (RAW-flavoured 500m — picked knowing the engine will never
//   render anywhere near that far on any dungeon-scale map; it's a ceiling that says "this channel
//   doesn't fall off with distance the way eyesight does," not a number meant to bind). Crucially
//   it says only "something's there" — no label, no size, no exact edge to the detection range the
//   way a flashlight's cone has a visible boundary. A flashlight's 100+m throw would flood-light a
//   huge area with total clarity; heat detection at long range is the opposite trade: cheap to
//   grant a big number because it conveys almost no information next to what it actually shows.
// - **Fusion channel** (this VisionMode, `sightRange` in `gogle.mjs`'s termowizor variant): short,
//   deliberately low-resolution general terrain sight — real FLIR sensors are nowhere near
//   camera-grade resolution — active only while the wearer has a real light source lit (own
//   flashlight, torch, whatever `light-sources.mjs` currently has burning for them). A per-pixel
//   "is *this exact spot* lit" read (sampling `perceivedBrightness(baseColor.rgb)` or
//   `computedDarknessLevel`) was the first attempt, on the theory that it would respond to *any*
//   nearby light — an ally's, ambient — not just the wearer's own gear, with zero cross-module
//   coupling. Abandoned after a controlled, pixel-exact measurement (same token position, one real
//   light toggled on vs off, read back via saved screenshots): neither uniform distinguished "next
//   to a lit light source" from "far from every light source" in this engine version, in any way
//   this file could get a reliable read on. Gating at the `sightRange` level instead — one
//   `hasActiveLight` check per vision sync (`gogle.mjs`'s `_gogleVisionProvider`), not one per
//   pixel — does mean only the *wearer's* own light counts, a narrower "benefits from flashlight
//   use" than originally envisioned, but a mechanic that's actually verified to work beats one that
//   looks more elegant on paper and might not.
//
// ## Why this needed a `vision.background.shader`, not `canvas.shader`, from square one
//
// The original cut of this file tinted the screen via `canvas.shader`
// (`ColorAdjustmentsSamplerShader`) — the exact mechanism a full session of debugging proved
// invisible for Noktowizja's grain (`gogle.mjs`'s "Analog grain" doc section): within the wearer's
// own sight polygon, `canvas.shader` is entirely overdrawn by the vision source's own
// `vision.background.shader`. Never confirmed broken for Termowizja specifically (flagged, not
// tested, in the handoff after the Noktowizja fix), but there was no reason to ship the same
// probably-dead code twice when building the fusion shader below replaces it outright.
//
// ## Why `sightRange` has to be non-zero for any of this to render at all
//
// Confirmed live (screenshot, Piekarz forced to `sight.range: 1.5` while wearing Noktowizja): a
// lit area *outside* the wearer's own `sight.range` polygon renders in plain, unmodified color —
// `lightPerception`'s unlimited range makes it visible at all, but nothing repaints it with the
// active `visionMode`'s styling. So a torch-lit room 15m away only looks "thermal" if
// `sight.range` actually reaches that far — `gogle.mjs`'s termowizor variant now carries a real
// (short, GM-picked) `sightRange` for exactly this reason. Side effect, accepted rather than
// engineered around: `sight.range` is also what `basicSight`/`DetectionModeDarkvision` uses to
// decide what a token can mechanically perceive at all, unconditionally — so a lit-flashlight
// Termowizor wearer does technically perceive out to the full 16m even in a corner their own
// light doesn't reach. Not engineered around: this engine ties "how far the visual styling
// reaches" and "how far the token can perceive anything at all" to the same one field, and there
// is no clean way to decouple them. Minor, mostly-invisible-in-play looseness, accepted rather
// than chased further — the shader's desaturated/boiling look is uniform across the whole 16m
// regardless (see `_defineTermowizjaFusionShader` below), so it never visually oversells the
// unlit corner as clearly seen; it just quietly counts as "perceived" for game-state purposes.
export const TERMOWIZJA_VISION_ID = "neuroshimaTermowizjaVision";

const BOIL_DENSITY = 0.12;    // coarser than Noktowizja's GRAIN_DENSITY (0.55) — a chunkier
                               // "boiling" block artifact instead of fine luminance static, so the
                               // two goggles read as different sensors at a glance, not variations
                               // on one noise texture.
const BOIL_INTENSITY = 0.16;  // subtler than Noktowizja's GRAIN_INTENSITY (0.30) — this channel is
                               // active over a wider area (16m vs a fixed small circle) for longer
                               // stretches of play, so a heavier jitter would fatigue faster.

/**
 * The fusion background shader — subclasses core's `BackgroundVisionShader` directly (not
 * `AmplificationBackgroundVisionShader`, despite `gogle.mjs`'s grain shader doing that for
 * Noktowizja): Amplification's own math pushes brightness up aggressively regardless of how dark a
 * scene really is (that's *its* differentiator, an image-intensifier's gain) — wrong for a channel
 * that's supposed to show real light accurately, dim if it's really dim, with no gain of its own.
 *
 * Deliberately NOT gating on `perceivedBrightness(baseColor)`/`computedDarknessLevel` per pixel to
 * decide "is this spot lit enough to show terrain" — tried first, abandoned: neither uniform
 * distinguishes "next to a lit AmbientLight" from "far from every light source" in this engine
 * version in any way this file could get a reliable read on (measured directly, pixel-exact,
 * against a controlled same-position/light-toggled-off test — brightness came back flat either
 * way). The *range* is the gate instead: `gogle.mjs`'s `_gogleVisionProvider` only grants
 * `sightRange` at all while `hasActiveLight` (`light-sources.mjs`) is true, so this shader only
 * ever draws anywhere once the wearer already has real light to fuse — no per-pixel guessing
 * needed, and the desaturated/boiling look below is simply always "on" wherever it draws.
 *
 * Built lazily, same reason `_defineNoktowizjaVisionShader` in `gogle.mjs` is.
 */
function _defineTermowizjaFusionShader() {
  const BackgroundVisionShader = foundry.canvas.rendering.shaders.BackgroundVisionShader;

  return class TermowizjaFusionVisionShader extends BackgroundVisionShader {
    /** @override */
    static _createFragmentShader() {
      return `
      ${this.SHADER_HEADER}
      ${this.PRNG}

      void main() {
        ${this.FRAGMENT_BEGIN}

        // Coarser "boiling" block noise + a faint scanline — a distinct sensor identity from
        // Noktowizja's fine per-pixel grain, always present wherever this shader draws at all.
        vec2 boilUvs = floor(vSamplerUvs * screenDimensions * ${BOIL_DENSITY.toFixed(3)})
          + (vec2(fract(time * 2.1), fract(time * 1.7)) * 400.0);
        finalColor += (random(boilUvs) - 0.5) * ${BOIL_INTENSITY.toFixed(3)};
        finalColor += sin(vSamplerUvs.y * screenDimensions.y * 0.35 + time * 6.0) * 0.03;

        ${this.ADJUSTMENTS}
        ${this.BACKGROUND_TECHNIQUES}
        ${this.FALLOFF}
        ${this.FRAGMENT_END}
      }`;
    }

    /** @inheritDoc */
    static get defaultUniforms() {
      return {
        ...super.defaultUniforms,
        // Termowizor's look shouldn't quietly revert toward plain color wherever a scene's own
        // darkness *region* setting happens to read low (`BackgroundVisionShader.FRAGMENT_END`'s
        // `mix(baseColor, finalColor, computedDarknessLevel)`) — the `sightRange` gate above is the
        // one and only thing deciding whether this mode is showing anything at all.
        linkedToDarknessLevel: false,
      };
    }

    /** @inheritDoc */
    get isRequired() {
      return true;
    }
  };
}

/** Built lazily — same reason `defineTermowizja` is: `foundry.canvas`/`canvas.rendering` only
 *  populate once the client bundle has evaluated. */
function defineTermowizjaVisionMode() {
  const VisionMode = foundry.canvas.perception.VisionMode;
  const { ColorAdjustmentsSamplerShader } = foundry.canvas.rendering.shaders;

  return new VisionMode({
    id: TERMOWIZJA_VISION_ID,
    label: "Termowizja",
    // Left as-is: proven dead code within the wearer's own sight polygon (overdrawn by
    // `vision.background` below), same as Noktowizja's equivalent field — see this file's doc
    // comment. Harmless to leave populated; nothing currently spends effort keeping it in sync.
    canvas: {
      shader: ColorAdjustmentsSamplerShader,
      uniforms: { contrast: 0.15, saturation: -1, brightness: 0.1 }
    },
    lighting: {
      // No `LIGHTING_VISIBILITY.REQUIRED` anywhere here (unlike core's `lightAmplification`) —
      // thermal must work in a scene at full darkness, that's the entire point. `darkness:
      // {adaptive: false}` opts fully out of the light-driven pipeline, same as core's own
      // `monochromatic`/`blindness` modes do for the same reason.
      background: {
        postProcessingModes: ["SATURATION"],
        uniforms: { saturation: -1 }
      },
      illumination: {
        postProcessingModes: ["SATURATION"],
        uniforms: { saturation: -1 }
      },
      coloration: {
        postProcessingModes: ["SATURATION"],
        uniforms: { saturation: -1 }
      }
    },
    vision: {
      darkness: { adaptive: false },
      background: { shader: _defineTermowizjaFusionShader() },
      // `saturation`/`contrast` reach the shader above as ordinary uniforms consumed by the
      // inherited `ADJUSTMENTS` tail (runs after this file's own noise, per `_createFragmentShader`
      // above) — `saturation: -1` is what actually desaturates the image; the shader itself only
      // adds noise, it doesn't touch color.
      defaults: { attenuation: 0.15, contrast: 0.15, saturation: -1, brightness: 0.3 }
    }
  }, { animated: true });
}

/** Register the mode. Same `init`-time requirement as `registerTermowizja`. */
export function registerTermowizjaVision() {
  try {
    CONFIG.Canvas.visionModes[TERMOWIZJA_VISION_ID] = defineTermowizjaVisionMode();
    console.log(`${MODULE_ID} | Termowizja vision mode registered`);
  } catch (err) {
    console.error(`${MODULE_ID} | failed to register Termowizja vision mode`, err);
  }
}
