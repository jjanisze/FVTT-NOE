/**
 * Neuroshima 5e — Gogle (NVG/thermal goggles), homebrew `equipment` item.
 *
 * No RAW baseline exists for this — `neuroshima_5e_modifications.md` never mechanises
 * Noktowizor/Termowizor as player-worn gear, only as inert weapon-addon flags
 * (`config/addons-data.mjs`'s SM-rail scope attachments, `applyMode: ["flag-only"]`, "vision
 * hook" never built). This is genuinely new, per `PLAN_nvg_thermal.md` — headworn, always-on
 * while switched on (an explicit Activity, same UX as Latarka, not equip-driven — locked GM
 * call), general-purpose vision aid rather than a scope you only look through while aiming one
 * specific gun. That weapon-addon hook stays out of scope; see the plan's §7 for how it plugs
 * into this same plumbing later without a rewrite.
 *
 * ## Two devices, two different engine primitives — not two flavors of the same effect
 *
 * - **Noktowizor** (RAW: "widzi w ciemnościach niemal tak dobrze, jak w dzień... w czerni i
 *   bieli") — this needs *two* things, not one: `visionMode: NOKTOWIZJA_VISION_ID` (this file's
 *   own copy of core's `lightAmplification` — same ready-made green-tinted image-intensifier
 *   look, plus analog grain, see this file's "Analog grain" doc section below — pure paint, see
 *   `vision-sources.mjs`'s "sightRange is the mechanic" doc section) **plus**
 *   `sightRange: GOGLE_NOKTO_RANGE`, which
 *   actually overrides the wearer's `token.sight.range` — the real, load-bearing half. Caught
 *   live: shipping only the visionMode reproduces the *look* of NVG (screen tints green, existing
 *   light reads brighter) without the *mechanic* RAW asks for (seeing further into darkness than
 *   without it) — a token's sight range in the dark is governed by `sight.range`
 *   (`basicSight`/`DetectionModeDarkvision`, checked purely by range, not by visionMode), which a
 *   pure color-filter VisionMode never touches. No detection-mode change: it doesn't reveal
 *   anything invisible, just extends + re-lights what normal sight would eventually see anyway.
 * - **Termowizor** (thermal): needs *both* halves of `config/detection-termowizja.mjs` —
 *   `TERMOWIZJA_VISION_ID` (custom VisionMode, flat/desaturated backdrop, works in zero light)
 *   for the screen, and `TERMOWIZJA_ID` (the DetectionMode already shipping for Bestiariusz
 *   creatures) added to the wearer's own token so it actually sees through walls-false
 *   concealment/Niewidoczność the same way a monster's innate Termowizja already does. Same
 *   hot-orange outline either direction — one shared filter, not a second one for PCs. Left
 *   without its own `sightRange`: real thermal optics don't render terrain detail either, only
 *   heat blobs against a flat background — the DetectionMode's own range already handles
 *   "spot a creature at N m regardless of light," which is genuinely all RAW asks Termowizja for
 *   here (unlike Noktowizja's explicit "as well as day" general-sight claim).
 *
 * ## Battery model — identical shape to `latarka.mjs`, no dynamo fork
 *
 * Both variants are battery-powered (no RAW "wind it yourself" option exists for optics the way
 * it does for a flashlight), so unlike Latarka this file doesn't need a per-form `battery`
 * toggle — charge accounting, "Włóż baterie", and the depleted-battery "go dark" sweep are the
 * exact same 2k4-hour-per-cell model, copied rather than abstracted a third time (see
 * `power-source.mjs`'s own doc comment on why that shared paradigm exists).
 *
 * ## One pair of goggles at a time
 *
 * `vision-sources.mjs`'s single-active-vision-source enforcement (independent of Latarka's
 * single-active-*light*-source slot — see that file's doc comment for why the two don't
 * interact) means turning on one pair of goggles force-turns-off any other — including a second
 * Noktowizor, not just the opposing variant. You wear one headset.
 *
 * ## Analog grain on the Noktowizor image
 *
 * `visionMode: "lightAmplification"` really means *this module's own* `NOKTOWIZJA_VISION_ID` —
 * a copy of core's vision mode with one difference: `vision.background.shader` is a small
 * subclass of core's `AmplificationBackgroundVisionShader`
 * (`client/canvas/rendering/shaders/vision/effects/amplification.mjs`) that adds a procedural
 * noise term to the same tint math — same green image-intensifier look, plus per-frame grain.
 *
 * **Which pass, and why that one and not `canvas.shader`**: the green tint you actually see
 * inside the token's sight radius is NOT produced by the vision mode's `canvas.shader` (the
 * `AmplificationSamplerShader` core swaps onto `PrimaryCanvasGroup`'s full-scene sprite). It is
 * produced by the *vision source's own* background layer, which samples the raw
 * `canvas.primary.renderTexture` and writes `gl_FragColor = vec4(finalColor, 1.0) * depth`
 * (`AdaptiveLightingShader.FRAGMENT_END`) — fully opaque — over the top of that sprite. So within
 * the vision polygon, i.e. everywhere the Noktowizor wearer can actually see, whatever
 * `canvas.shader` computed is completely overdrawn. Cost that a whole session of debugging: a
 * correctly bound, correctly compiled, correctly uniform-fed `canvas.shader` subclass produces
 * *zero* visible change. Don't put screen effects there.
 *
 * This piggybacks on an already-mandatory pass: `AmplificationBackgroundVisionShader.isRequired`
 * is hardcoded `true`, so this layer renders every frame the mode is active regardless, and the
 * grain is a handful of extra ALU ops inside it — no texture sample, no asset to ship, no extra
 * render target. Deliberately NOT a bolt-on `PIXI.Filter` on `canvas.stage`, which would be a
 * genuine additional full-framebuffer pass for the same result.
 *
 * The per-frame flicker rides the `time` uniform that core already animates for
 * `{animated: true}` vision modes (`VisionMode#animate` -> `PointVisionSource#animateTime`, the
 * same hook `tremorsense` uses) rather than a module-owned ticker — so it costs nothing while the
 * goggles are off, and degrades to a static grain (not a broken one) if a client has core's
 * "Animate Light Sources" setting disabled.
 */

import {
  registerVisionProvider, registerVisionOffSwitch, enforceSingleVisionSource, syncActorVision,
} from "./vision-sources.mjs";
import { registerPowerSource, getPowerStatus, renderPowerRow } from "./power-source.mjs";
import { TERMOWIZJA_ID, TERMOWIZJA_VISION_ID } from "../config/detection-termowizja.mjs";
import { isBaterie } from "./baterie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Constants                                     */
/* -------------------------------------------- */

const ON_ID = "gogle-wlacz";
const OFF_ID = "gogle-wylacz";
const INSERT_ID = "gogle-wloz-baterie";

const FLAG_VARIANT = "gogleWariant";      // "noktowizor" | "termowizor"
const FLAG_ON = "gogleOn";                // bool
const FLAG_HAS_BATTERY = "gogleHasBaterie";
const FLAG_CHARGE = "gogleCharge";        // 0–100, % of the loaded battery's rolled lifetime remaining
const FLAG_CHARGE_MAX_MIN = "gogleChargeMaxMin"; // minutes rolled (2k4h) for the *current* battery
const FLAG_START = "gogleStartTime";      // worldTime this ON session started
const FLAG_BURNOUT_AT = "gogleBurnoutAt"; // worldTime this session would go dark on its own

// No RAW anchor for a range at all — Bestiariusz creatures' innate Termowizja/Noktowizja span
// 9-300m depending on the beast (`dev/bestiary/bestiary.json`), but that's a biological sense, not
// a man-portable optic, and RAW's own numbers are exactly the kind of "reasonable for a spec
// sheet, way too generous for a VTT dungeon map" case Kolor Kobaltu already cut Latarka's dim
// cone down from (180m -> 22m, `PLAN_kobalt.md` rule 6). Both picked in that same dungeon-pacing
// ballpark rather than anywhere near the apex-predator end of the creature range — tunable,
// flagged as a GM balance call, not a derived number.
const GOGLE_TERMO_RANGE = 24;
// A bit more generous than Termowizor: Noktowizor grants genuine general sight (RAW: "as well as
// day"), not just creature-detection, and has no cone restriction (full ambient FOV, unlike
// Latarka's angled beam) — so it should out-range a flashlight's dim throw, not just match it.
const GOGLE_NOKTO_RANGE = 30;

/* -------------------------------------------- */
/*  Noktowizja vision mode — lightAmplification + analog grain                                 */
/* -------------------------------------------- */
// See this file's "Analog grain on the Noktowizor image" doc section above for why this hooks in
// here (a subclass of the vision source's own background shader) rather than the vision mode's
// `canvas.shader` or a separate stage/overlay filter.

const NOKTOWIZJA_VISION_ID = "neuroshimaNoktowizja";

const GRAIN_DENSITY = 0.55;    // noise cells per screen pixel — ~3 px speckle. Aspect-correct: the
                               // shader multiplies by `screenDimensions`, not by normalized uvs.
const GRAIN_INTENSITY = 0.30;  // ±luminance jitter, kept subtle per "slight analog noise", not asked for more.

/**
 * Subclass of core's `AmplificationBackgroundVisionShader`
 * (`client/canvas/rendering/shaders/vision/effects/amplification.mjs`) — its `_createFragmentShader`
 * body reproduced verbatim (a static method can only replace a parent's GLSL string, not splice
 * into it) plus a noise term on `finalColor` before the shared adjustment/falloff tail. Built
 * lazily so `foundry.canvas.rendering.shaders` isn't touched at module-evaluation time.
 *
 * See this file's "Analog grain" doc section for why the grain lives in *this* pass and not in the
 * vision mode's `canvas.shader`.
 */
function _defineNoktowizjaVisionShader() {
  const AmplificationBackgroundVisionShader =
    foundry.canvas.rendering.shaders.AmplificationBackgroundVisionShader;

  return class NoktowizjaGrainVisionShader extends AmplificationBackgroundVisionShader {
    /** @override */
    static _createFragmentShader() {
      return `
      ${this.SHADER_HEADER}
      ${this.PERCEIVED_BRIGHTNESS}
      ${this.PRNG}

      void main() {
        ${this.FRAGMENT_BEGIN}
        float lum = perceivedBrightness(baseColor.rgb);
        vec3 vision = vec3(smoothstep(0.0, 1.0, lum * 1.5)) * colorTint;
        finalColor = vision + (vision * (lum + brightness) * 0.1) + (baseColor.rgb * (1.0 - computedDarknessLevel) * 0.125);

        // Analog grain. Sampled in screen space (vSamplerUvs * screenDimensions) so the speckle
        // stays pinned to the display instead of sliding around with the token, and re-seeded each
        // frame off the animated \`time\` uniform so it flickers like film rather than sitting still.
        vec2 grainUvs = (vSamplerUvs * screenDimensions * ${GRAIN_DENSITY.toFixed(3)})
          + (vec2(fract(time * 7.3), fract(time * 11.9)) * 500.0);
        finalColor += (random(grainUvs) - 0.5) * ${GRAIN_INTENSITY.toFixed(3)};

        ${this.ADJUSTMENTS}
        ${this.BACKGROUND_TECHNIQUES}
        ${this.FALLOFF}
        ${this.FRAGMENT_END}
      }`;
    }
  };
}

/**
 * Registers `NOKTOWIZJA_VISION_ID` — a copy of core's `lightAmplification` differing only in
 * `vision.background.shader` (the grain subclass above) and the `{animated: true}` option that
 * makes core keep its `time` uniform ticking. Must run at `init`, same timing requirement as
 * `detection-termowizja.mjs`'s `registerTermowizja`/`registerTermowizjaVision` — before the canvas
 * builds its vision modes for the first scene draw. Called from `main.mjs`'s `init` block, not
 * from `registerGogle()` (which runs at `ready`, too late for this).
 *
 * `canvas`/`lighting` are core's, untouched: they govern how the *rest* of the screen (outside the
 * wearer's sight polygon, lit by ambient light) is tinted, and matching stock `lightAmplification`
 * there is exactly what's wanted.
 */
export function registerNoktowizjaVision() {
  try {
    const VisionMode = foundry.canvas.perception.VisionMode;
    const core = CONFIG.Canvas.visionModes.lightAmplification;

    CONFIG.Canvas.visionModes[NOKTOWIZJA_VISION_ID] = new VisionMode({
      id: NOKTOWIZJA_VISION_ID,
      label: "Noktowizja",
      canvas: { shader: core.canvas.shader, uniforms: { ...core.canvas.uniforms } },
      lighting: core.lighting,
      vision: { ...core.vision, background: { shader: _defineNoktowizjaVisionShader() } },
    }, { animated: true });
    console.log(`${MODULE_ID} | Noktowizja (grain) vision mode registered`);
  } catch (err) {
    console.error(`${MODULE_ID} | failed to register Noktowizja vision mode`, err);
  }
}

const ICON_BASE = `modules/${MODULE_ID}/icons/items/loot`;

export const GOGLE_VARIANTS = {
  noktowizor: {
    key: "noktowizor",
    label: "Gogle noktowizyjne",
    img: `${ICON_BASE}/noktowizor_gogle.svg`,
    price: 100,   // same anchor as the SM-rail Noktowizor addon (`addons-data.mjs`) — the closest
    weight: 0.35, // existing price/weight this ruleset has for equivalent-tech optics.
    visionMode: NOKTOWIZJA_VISION_ID, // lightAmplification + grain — see this file's doc comment.
    sightRange: GOGLE_NOKTO_RANGE, // the actual mechanic — visionMode alone is only the paint.
    detectionModeId: null,
    detectionRange: 0,
    description: `<p>Wzmacniacz obrazu w podczerwieni. Widzi w ciemnościach niemal tak dobrze jak `
      + `w dzień — czarno-biały obraz, bez rozróżniania kolorów. Zasięg: <strong>`
      + `${GOGLE_NOKTO_RANGE} m</strong>.</p>`,
  },
  termowizor: {
    key: "termowizor",
    label: "Gogle termowizyjne",
    img: `${ICON_BASE}/termowizor_gogle.svg`,
    price: 200,  // same anchor as the SM-rail Termowizor addon (`addons-data.mjs`).
    weight: 0.4,
    visionMode: TERMOWIZJA_VISION_ID,
    detectionModeId: TERMOWIZJA_ID,
    detectionRange: GOGLE_TERMO_RANGE,
    description: `<p>Kamera termowizyjna. Działa w całkowitej ciemności, przenika kamuflaż i `
      + `Niewidoczność (widzi ciepło, nie kontur) — ale nic nie pokaże, jeśli nosiciel zostanie `
      + `oślepiony. Zasięg wykrywania: <strong>${GOGLE_TERMO_RANGE} m</strong>.</p>`,
  },
};

// Neither variant needs a tint override — `lightAmplification`/the Termowizja VisionMode both
// bake their own color into the mode itself (`config.mjs`/`detection-termowizja.mjs`), unlike a
// light source where color is the whole point. `null` here means "let the mode's own default win."
const NO_VISION_TINT = null;

/* -------------------------------------------- */
/*  Helpers                                       */
/* -------------------------------------------- */

function _liveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

function isGogle(item) {
  return item?.type === "equipment" && !!item.getFlag?.(MODULE_ID, FLAG_VARIANT);
}

function variantOf(item) {
  return GOGLE_VARIANTS[item?.getFlag?.(MODULE_ID, FLAG_VARIANT)] ?? null;
}

function isOn(item) {
  return !!item?.getFlag?.(MODULE_ID, FLAG_ON);
}

function hasBattery(item) {
  return !!item?.getFlag?.(MODULE_ID, FLAG_HAS_BATTERY);
}

function _getActivity(item, identifier) {
  return item.system.activities?.find(a => a.visibility?.identifier === identifier) ?? null;
}

/* -------------------------------------------- */
/*  Chat card                                     */
/* -------------------------------------------- */

async function _postCard(item, html, { flavor } = {}) {
  const speaker = ChatMessage.getSpeaker({ actor: item.actor });
  await ChatMessage.create({
    speaker,
    flavor: flavor ?? item.name,
    content: `<div class="neuro-gogle-card"><div class="neuro-gogle-head">${item.name}</div>${html}</div>`,
  });
}

/* -------------------------------------------- */
/*  Token vision                                  */
/* -------------------------------------------- */

/** Registered once at `registerGogle()` — see `vision-sources.mjs`. */
function _gogleVisionProvider(actor) {
  if (!actor) return null;
  for (const item of actor.items) {
    if (!isGogle(item) || !isOn(item)) continue;
    if (!item.system?.equipped) continue;
    const variant = variantOf(item);
    if (!variant) continue;
    return {
      visionMode: variant.visionMode,
      color: NO_VISION_TINT,
      sightRange: variant.sightRange,
      detectionModeId: variant.detectionModeId,
      detectionRange: variant.detectionRange,
    };
  }
  return null;
}

/* -------------------------------------------- */
/*  Charge accounting — same shape as latarka.mjs's battery                                   */
/* -------------------------------------------- */

/** See `latarka.mjs`'s `_liveChargePercent` for the identical reasoning. */
function _liveChargePercent(item) {
  const charge = item.getFlag(MODULE_ID, FLAG_CHARGE) ?? 0;
  if (!isOn(item)) return charge;

  const maxMin = item.getFlag(MODULE_ID, FLAG_CHARGE_MAX_MIN);
  if (!maxMin) return charge;

  const start = item.getFlag(MODULE_ID, FLAG_START) ?? game.time.worldTime;
  const elapsedMin = Math.max(0, (game.time.worldTime - start) / 60);
  const consumedPct = (elapsedMin / maxMin) * 100;
  return Math.max(0, charge - consumedPct);
}

/** Registered once at `registerGogle()` — see `items/power-source.mjs`. */
function _goglePowerDescriptor(item) {
  const variant = variantOf(item);
  if (!variant) return null;
  const on = isOn(item);
  const percent = _liveChargePercent(item);
  return {
    on,
    unlimited: false,
    percent,
    remainingMinutes: (item.getFlag(MODULE_ID, FLAG_CHARGE_MAX_MIN) ?? 0) * (percent / 100),
    unitLabel: "Bateria",
    flagPath: `flags.${MODULE_ID}.${FLAG_CHARGE}`,
    editable: item.isOwner && !on,
    onNote: "włączone",
    offHint: "",
  };
}

/* -------------------------------------------- */
/*  Turn on / off / insert battery / go dark      */
/* -------------------------------------------- */

export async function turnOn(item) {
  item = _liveItem(item);
  if (!variantOf(item) || isOn(item)) return;

  if (!hasBattery(item)) { ui.notifications.warn(`${item.name}: brak baterii.`); return; }
  const charge = item.getFlag(MODULE_ID, FLAG_CHARGE) ?? 0;
  if (charge <= 0) { ui.notifications.warn(`${item.name}: baterie są martwe.`); return; }

  const maxMin = item.getFlag(MODULE_ID, FLAG_CHARGE_MAX_MIN) ?? 1;
  const now = game.time.worldTime;
  const remainingSec = maxMin * 60 * (charge / 100);

  await item.update({
    [`flags.${MODULE_ID}.${FLAG_ON}`]: true,
    [`flags.${MODULE_ID}.${FLAG_START}`]: now,
    [`flags.${MODULE_ID}.${FLAG_BURNOUT_AT}`]: now + remainingSec,
  });

  // Only one active vision device per actor — must run after this item's own ON write (so it
  // isn't the thing that gets turned back off), before the sync below. Independent of Latarka's
  // single-*light*-source slot — see `vision-sources.mjs`'s doc comment for why the two don't
  // interact (locked v1 call, `PLAN_nvg_thermal.md` §6 decision 2).
  await enforceSingleVisionSource(item.actor, item);

  await syncActorVision(item.actor);
  await _postCard(item, `<p>Włączone. Bateria: <strong>${Math.round(_liveChargePercent(item))}%</strong>.</p>`);
}

export async function turnOff(item, { silent = false, reason = null } = {}) {
  item = _liveItem(item);
  if (!variantOf(item) || !isOn(item)) return;

  await item.update({
    [`flags.${MODULE_ID}.${FLAG_ON}`]: false,
    [`flags.${MODULE_ID}.${FLAG_CHARGE}`]: _liveChargePercent(item),
    [`flags.${MODULE_ID}.-=${FLAG_START}`]: null,
    [`flags.${MODULE_ID}.-=${FLAG_BURNOUT_AT}`]: null,
  });

  await syncActorVision(item.actor);
  if (!silent) {
    await _postCard(item,
      `<p>Wyłączone${reason ? ` — ${reason}` : ""}. Bateria zachowana: `
      + `<strong>${Math.round(_liveChargePercent(item))}%</strong>.</p>`);
  }
}

/** Registered once at `registerGogle()` — see `vision-sources.mjs`'s `enforceSingleVisionSource`. */
async function _turnOffOtherGogle(actor, keepItem) {
  for (const item of actor.items) {
    if (item.id === keepItem?.id) continue;
    if (isGogle(item) && isOn(item)) await turnOff(item, { reason: "założono inne gogle" });
  }
}

/** GM/owner-driven: consumes one owned Baterie item, loads a fresh 2k4h charge. */
export async function insertBattery(item) {
  item = _liveItem(item);
  if (!variantOf(item)) return;
  const actor = item.actor;
  if (!actor) { ui.notifications.warn("Włożenie baterii wymaga, żeby gogle leżały w ekwipunku."); return; }

  const stack = actor.items.find(i => isBaterie(i) && (i.system.quantity ?? 0) > 0);
  if (!stack) { ui.notifications.warn("Brak baterii w ekwipunku."); return; }

  const qty = stack.system.quantity ?? 1;
  if (qty <= 1) await stack.delete();
  else await stack.update({ "system.quantity": qty - 1 });

  const rollMinutes = (await new Roll("2d4").roll()).total * 60;

  const wasOn = isOn(item);
  const update = {
    [`flags.${MODULE_ID}.${FLAG_HAS_BATTERY}`]: true,
    [`flags.${MODULE_ID}.${FLAG_CHARGE}`]: 100,
    [`flags.${MODULE_ID}.${FLAG_CHARGE_MAX_MIN}`]: rollMinutes,
  };
  if (wasOn) {
    const now = game.time.worldTime;
    update[`flags.${MODULE_ID}.${FLAG_START}`] = now;
    update[`flags.${MODULE_ID}.${FLAG_BURNOUT_AT}`] = now + rollMinutes * 60;
  }
  await item.update(update);

  await _postCard(item,
    `<p>Świeże baterie. Starczą na <strong>${Math.round(rollMinutes / 60)} godzin</strong>.</p>`);
}

/** Battery ran out on its own — go dark, don't destroy the item. */
async function _goDark(item) {
  item = _liveItem(item);
  if (!isOn(item)) return;

  await item.update({
    [`flags.${MODULE_ID}.${FLAG_ON}`]: false,
    [`flags.${MODULE_ID}.${FLAG_HAS_BATTERY}`]: false,
    [`flags.${MODULE_ID}.${FLAG_CHARGE}`]: 0,
    [`flags.${MODULE_ID}.-=${FLAG_START}`]: null,
    [`flags.${MODULE_ID}.-=${FLAG_BURNOUT_AT}`]: null,
  });

  await syncActorVision(item.actor);
  await _postCard(item, `<p>Bateria siada. Gogle gasną.</p>`, { flavor: "Rozładowane" });
}

/* -------------------------------------------- */
/*  Activities                                    */
/* -------------------------------------------- */

const _ensuringActivities = new Map();

/** Same single-flight guard as `latarka.mjs`'s `ensureLatarkaActivities` — see its comment. */
export function ensureGogleActivities(item) {
  if (!isGogle(item)) return Promise.resolve();
  const key = item.uuid ?? item.id;

  const inFlight = _ensuringActivities.get(key);
  if (inFlight) return inFlight;

  const promise = _ensureGogleActivitiesUnguarded(item).finally(() => {
    _ensuringActivities.delete(key);
  });
  _ensuringActivities.set(key, promise);
  return promise;
}

async function _ensureGogleActivitiesUnguarded(item) {
  if (!_getActivity(item, ON_ID)) {
    await item.createActivity("utility", {
      name: "Włącz gogle",
      activation: { type: "action" },
      visibility: { identifier: ON_ID },
      description: { chatFlavor: "Gogle się włączają." },
    }, { renderSheet: false });
  }
  if (!_getActivity(item, OFF_ID)) {
    await item.createActivity("utility", {
      name: "Wyłącz gogle",
      activation: { type: "special" },
      visibility: { identifier: OFF_ID },
      description: { chatFlavor: "Gogle gasną." },
    }, { renderSheet: false });
  }
  if (!_getActivity(item, INSERT_ID)) {
    await item.createActivity("utility", {
      name: "Włóż baterie",
      activation: { type: "special" },
      visibility: { identifier: INSERT_ID },
      description: { chatFlavor: "Świeże baterie." },
    }, { renderSheet: false });
  }
}

/* -------------------------------------------- */
/*  Item factory                                  */
/* -------------------------------------------- */

function _baseSystemData() {
  return {
    type: { value: "trinket", baseItem: "" },
    uses: { max: "", spent: 0, recovery: [] }, // see `latarka.mjs`'s uses-fix doc comment — same bug class
    equipped: false, identified: true, quantity: 1,
  };
}

export function buildGogleItemData(variantKey) {
  const variant = GOGLE_VARIANTS[variantKey];
  if (!variant) throw new Error(`Nieznany wariant Gogli: ${variantKey}`);

  return {
    name: variant.label,
    type: "equipment",
    img: variant.img,
    system: {
      ..._baseSystemData(),
      description: { value: variant.description, chat: "" },
      weight: { value: variant.weight, units: "kg" },
      price: { value: variant.price, denomination: "gp" },
      identifier: `gogle-${variantKey}`,
    },
    flags: {
      [MODULE_ID]: {
        [FLAG_VARIANT]: variantKey,
        [FLAG_ON]: false,
        [FLAG_HAS_BATTERY]: false,
        [FLAG_CHARGE]: 0,
      }
    }
  };
}

/** Same "seed/refresh the Zbrojownia's own copy" shape as `latarka.mjs`'s `createLatarkaStock`. */
export async function createGogleStock(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if (!actor) { ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia)."); return null; }

  const byName = new Map(actor.items.filter(i => isGogle(i)).map(i => [i.name, i]));
  const toCreate = [];
  const toUpdate = [];

  for (const variantKey of Object.keys(GOGLE_VARIANTS)) {
    const data = buildGogleItemData(variantKey);
    const existing = byName.get(data.name);
    if (existing) toUpdate.push({ _id: existing.id, ...data });
    else toCreate.push(data);
  }

  if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);
  if (toUpdate.length) await actor.updateEmbeddedDocuments("Item", toUpdate);

  for (const item of actor.items.filter(i => isGogle(i))) await ensureGogleActivities(item);

  ui.notifications.info(`Zbrojownia: ${toCreate.length} nowych gogli, ${toUpdate.length} zaktualizowanych.`);
  return { created: toCreate.length, updated: toUpdate.length };
}

export async function createGogleItem(variantKey, { actor } = {}) {
  const data = buildGogleItemData(variantKey);
  const created = actor
    ? (await actor.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.create(data);
  if (!created) throw new Error("Gogle: createEmbeddedDocuments/Item.create returned nothing");

  await ensureGogleActivities(created);
  return created;
}

/* -------------------------------------------- */
/*  Hooks                                         */
/* -------------------------------------------- */

function onPreUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isGogle(item)) return;
  const identifier = activity.visibility?.identifier;

  if (identifier === ON_ID) {
    if (isOn(item)) { ui.notifications.warn(`${item.name} już włączone.`); return false; }
    if (!hasBattery(item)) {
      ui.notifications.warn(`${item.name}: brak baterii.`);
      return false;
    }
  }
  if (identifier === OFF_ID && !isOn(item)) {
    ui.notifications.warn(`${item.name} już wyłączone.`);
    return false;
  }
}

function onPostUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isGogle(item)) return;
  const identifier = activity.visibility?.identifier;
  if (identifier === ON_ID) turnOn(item);
  else if (identifier === OFF_ID) turnOff(item);
  else if (identifier === INSERT_ID) insertBattery(item);
}

/** GM-only sweep: go dark on anything whose scheduled instant has passed. */
async function onWorldTime() {
  if (!game.user.isActiveGM) return;
  const now = game.time.worldTime;
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    if (!isGogle(item)) continue;
    const at = item.getFlag(MODULE_ID, FLAG_BURNOUT_AT);
    if (at != null && now >= at) await _goDark(item);
  }
}

function onUpdateItem(item, changes) {
  if (!isGogle(item)) return;
  if (foundry.utils.hasProperty(changes, "system.equipped")) syncActorVision(item.actor);
}

/**
 * Bateria row on the item sheet's Details tab — shared markup/logic from `items/power-source.mjs`.
 */
function onRenderItemSheet(app, html) {
  const item = app.document ?? app.item;
  if (!isGogle(item)) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const status = getPowerStatus(item);
  if (status) renderPowerRow(root, status);
}

async function ensureAllGogleActivities() {
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    if (isGogle(item) && !_getActivity(item, ON_ID)) await ensureGogleActivities(item);
  }
}

export function registerGogle() {
  registerVisionProvider(_gogleVisionProvider);
  registerVisionOffSwitch(_turnOffOtherGogle);
  registerPowerSource({ test: isGogle, describe: _goglePowerDescriptor });

  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
  Hooks.on("updateWorldTime", onWorldTime);
  Hooks.on("updateItem", onUpdateItem);
  Hooks.on("renderItemSheet5e", onRenderItemSheet);

  Hooks.on("createItem", (item) => { if (game.user.isGM) ensureGogleActivities(item); });
  if (game.user.isGM) ensureAllGogleActivities();

  console.log(`${MODULE_ID} | Gogle registered`);
}

/** Public API, exposed on `game.neuroshima.gogle` from main.mjs. */
export const gogleApi = {
  variants: GOGLE_VARIANTS,
  turnOn,
  turnOff,
  insertBattery,
  create: createGogleItem,
  stock: createGogleStock,
};
