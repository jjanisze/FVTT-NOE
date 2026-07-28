/**
 * Neuroshima 5e - GENERATED FILE, DO NOT EDIT BY HAND.
 *
 * Regenerate with:
 *   dev/audio/build_sound_banks.ps1
 *
 * Maps each sound bank to its available slots and the number of alternate
 * takes per slot, as actually present under sounds/banks/. Files are named
 * {slot}_v{1..N}.ogg, so a count of N means _v1 through _vN exist and any
 * of them may be chosen at random for variety.
 *
 * The editorial layer - which caliber/weapon maps to which bank - is
 * hand-maintained in sound-banks.mjs, which imports this.
 */

export const BANK_MANIFEST = Object.freeze({
  "ak": Object.freeze({ "click": 1, "impact-F": 2, "impact-M": 2, "impact-S": 2, "impact-W": 2, "reload": 1, "shot": 2 }),
  "ar": Object.freeze({ "click": 1, "reload": 1, "shot": 2 }),
  "bolt": Object.freeze({ "reload": 1 }),
  "crossbow": Object.freeze({ "click": 1, "impact-F": 2, "impact-M": 2, "impact-S": 2, "impact-W": 2, "reload": 1, "shot": 2 }),
  "explosion": Object.freeze({ "impact": 1 }),
  "explosion-emp": Object.freeze({ "impact": 1 }),
  "flamethrower": Object.freeze({ "click": 1, "reload": 1, "shot": 4 }),
  "flyby": Object.freeze({ "ambient": 1 }),
  "fnfal": Object.freeze({ "burst": 2, "click": 1, "reload": 1, "shot": 2 }),
  "hmg": Object.freeze({ "burst": 2, "click": 2, "impact-burst-M": 2, "impact-M": 2, "shot": 2 }),
  "impact-intermediate": Object.freeze({ "impact-burst-F": 2, "impact-burst-M": 2, "impact-burst-S": 2, "impact-burst-W": 2, "impact-F": 2, "impact-M": 2, "impact-S": 2, "impact-W": 2 }),
  "launcher": Object.freeze({ "impact": 2, "reload": 1, "shot": 2 }),
  "minigun": Object.freeze({ "click": 1, "impact-F": 2, "impact-M": 2, "impact-S": 2, "impact-W": 2, "reload": 1, "shot": 2 }),
  "pistol": Object.freeze({ "click": 1, "impact-F": 2, "impact-M": 2, "impact-S": 2, "impact-W": 2, "reload": 2, "shot": 2 }),
  "pistol-heavy": Object.freeze({ "click": 1, "shot": 3 }),
  "rifle-high": Object.freeze({ "shot": 2 }),
  "shotgun": Object.freeze({ "burst": 1, "click": 1, "impact-F": 2, "impact-M": 2, "impact-S": 2, "impact-W": 2, "reload": 1, "shot": 2 }),
  "silenced": Object.freeze({ "click": 1, "impact-F": 1, "impact-M": 2, "impact-S": 2, "impact-W": 2, "reload": 1, "shot": 2 }),
  "thrown": Object.freeze({ "shot": 1 }),
  "thrown-net": Object.freeze({ "shot": 1 }),
  "uzi": Object.freeze({ "reload": 1 }),

  // --- Banki SYNTEZOWANE (dev/audio/build_synth_bursts.ps1) ---
  "ar-synth": Object.freeze({ "burst-ms": 1 }),
  "fnfal-synth": Object.freeze({ "burst-ms": 1 }),
  "smg-synth": Object.freeze({ "burst-ds": 1, "burst-ks": 1, "burst-oz": 1 }),
});

/** Base path for every bank file, relative to the FVTT data root. */
export const BANKS_BASE = "modules/neuroshima-2026-overrides/sounds/banks";
