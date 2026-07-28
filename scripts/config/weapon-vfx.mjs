/**
 * Neuroshima 5e — Per-weapon tracer VFX + sound overrides.
 *
 * AUTHOR-TIME EDITABLE. Only add an entry when a SPECIFIC weapon needs to
 * override its caliber's sound/visuals — e.g. a signature weapon like the
 * Minigun, which shouldn't sound like an ordinary 7.62mm MS burst (The Pig
 * uses the same caliber+mode and should still get the caliber's generic
 * sound). Most weapons should NOT appear here; they inherit entirely from
 * caliber-vfx.mjs's CALIBER_VFX.
 *
 * Keyed by `item.system.identifier` (the weapon's stable, unique slug — e.g.
 * "minigun", "the-pig" — not its display name, which can be translated/edited).
 *
 * Same field shape as CALIBER_VFX (see caliber-vfx.mjs's header comment) —
 * sound.{p,ks,ds,ms,oz} remaps a WeaponSound tier, visual is a flat TUNE
 * subset. Resolution is a CSS-style cascade for visuals: this tier's fields
 * layer on top of the caliber's, so a weapon overriding only muzzleScale
 * still inherits its caliber's color/length/speed rather than losing them.
 * Sound has no such cascade (each mode's key is atomic) — weapon wins,
 * else caliber, else the generic default.
 */

// NOTE: per-weapon SOUND overrides now live in `sound-banks.mjs`'s WEAPON_BANKS,
// not here — the Minigun's dedicated audio is wired there as bank "minigun".
// This file's `sound` field still works and still takes priority, but it can
// only remap a whole generic WeaponSound tier, so it is the wrong tool for
// per-weapon audio; prefer a bank. Visuals (`visual`) remain this file's job.
//
// Entries below are the weapons whose visual signature must differ from their
// caliber's default. Each field cascades over CALIBER_VFX, so these are small
// deltas — a weapon overriding only spread still inherits its caliber's colour,
// length and speed.
export const WEAPON_VFX = {
  // 7,62 mm, but nothing else firing 7,62 looks like this. Extreme cyclic rate
  // (staggerMs 6 vs the default 20) and a loose cone. A far LOWER mapCompression
  // than default keeps a magdump at 1:1 for as long as the particle cap allows
  // — a Minigun MS should read as a solid stream, not a handful of dots.
  "minigun": {
    visual: {
      tracerLength: 300, tracerThickness: 6, glowBlur: 12,
      glowColor: "#ff6a10",
      speed: 5600, spreadPx: 34, staggerMs: 6,
      muzzleSize: 140, muzzleScale: 1.3, muzzleDurMs: 90,
      // Densest in the game (lowest compression) — a Minigun MS holds 1:1 right
      // up to the particle cap, so it reads as a solid stream.
      maxParticles: 300, mapKnee: 6, mapCompression: 100,
    },
  },

  // Belt-fed 7,62 GPMG. Heavier and looser than a rifle in the same caliber,
  // but explicitly NOT the Minigun — same reasoning as the sound side, where
  // The Pig must not borrow the minigun's audio.
  "the-pig": {
    visual: {
      spreadPx: 30, staggerMs: 12,
      muzzleScale: 1.05,
      mapCompression: 200,
    },
  },

  // Belt-fed .50: wider and slower-cycling than the Light Fifty's precision.
  "browning": {
    visual: { spreadPx: 22, staggerMs: 14, mapCompression: 450 },
  },

  // Anti-materiel rifle used as a precision weapon — the tightest spread in the
  // game. Identifier carries a damage suffix in the world data, hence the odd key.
  "light-fifty-2k20": {
    visual: { spreadPx: 6, muzzleScale: 1.25 },
  },

  // Not a projectile weapon at all: a short, very wide, very slow wall of fire.
  // Reachable only by identifier — its "ammunition" is Paliwo, which is not a
  // caliber, so no CALIBER_VFX entry can apply to it.
  "miotacz-ognia": {
    visual: {
      tracerLength: 70, tracerThickness: 16, glowBlur: 20,
      coreColor: "#ffd77a", glowColor: "#ff4a08",
      speed: 900, spreadPx: 46, staggerMs: 4,
      muzzleSize: 150, muzzleColor: "#ffa84a", muzzleScale: 1.2, muzzleDurMs: 130,
      mapKnee: 8, mapCompression: 90,
    },
  },

  // LAW is the other identifier-only weapon: its ammunition is "Rakieta", which
  // has no AMMO_CALIBERS entry, so the item carries no ammoType and no caliber
  // lookup can reach it. Without this it would fall back to the generic tracer
  // while its sibling Bazooka (60 mm) got the full rocket treatment — the same
  // gap that had to be closed on the sound side.
  "law": {
    visual: {
      tracerLength: 160, tracerThickness: 11, glowBlur: 16,
      coreColor: "#fff0c0", glowColor: "#ff5a10",
      speed: 1700, spreadPx: 18,
      muzzleSize: 170, muzzleColor: "#ffd090", muzzleScale: 1.5, muzzleDurMs: 160,
    },
  },
};

/**
 * @param {string|null|undefined} weaponId  item.system.identifier
 * @param {string} fireMode  "p" | "ks" | "ds" | "ms" | "oz"
 * @returns {string|null}
 */
export function getWeaponSoundOverride(weaponId, fireMode) {
  return weaponId ? WEAPON_VFX[weaponId]?.sound?.[fireMode] ?? null : null;
}

/**
 * @param {string|null|undefined} weaponId
 * @returns {object|null}  Flat TUNE subset, or null if this weapon has no visual override.
 */
export function getWeaponVisualOverride(weaponId) {
  return weaponId ? WEAPON_VFX[weaponId]?.visual ?? null : null;
}
