/**
 * Neuroshima 5e — Per-caliber tracer VFX + sound overrides.
 *
 * AUTHOR-TIME EDITABLE. Sparse — omit calibers/modes with no bespoke override;
 * missing entries fall back to today's generic mode-tier behavior unchanged.
 *
 * Fields per caliber entry:
 *   sound.{p,ks,ds,ms,oz} — a WeaponSound.* key, remapping which EXISTING
 *     sound tier plays for this caliber+mode. NOT a raw file path. When real
 *     per-caliber audio is authored, add a new WeaponSound member + SOUND_PATHS
 *     entry (sounds.mjs) and point here — keeps SOUND_RADIUS (sequencer.mjs)
 *     and remote-socket playback (_playLocal) working with zero extra plumbing.
 *   visual — a flat subset of tracer-vfx.mjs's TUNE object (tracerLength,
 *     tracerThickness, coreColor, glowColor, speed, muzzleSize, muzzleColor,
 *     muzzleScale, ...). NOT sub-keyed by fire mode — a caliber's tracer looks
 *     the same across P/KS/DS/MS; round count is handled separately by
 *     visibleTracerCount(). Lazily baked + cached per caliber (tracer-vfx.mjs).
 *
 * A higher-priority WEAPON_VFX tier (weapon-vfx.mjs, keyed by
 * item.system.identifier) can override individual fields on top of whatever
 * this caliber sets — see that file for when a specific gun needs to differ
 * from its caliber's default (e.g. Minigun vs. The Pig, both 7.62mm).
 *
 * ---- Official fire-mode roster per caliber (from Tabele/Bronie/BronPalna.md,
 *      cross-referenced against these ids — documentation only, NOT enforced
 *      or blocking; house rules may add permutations) ----
 *
 *   22lr     P          — Mk IV, K-22
 *   38spl    P          — Trzydziestka ósemka
 *   9mm      P, KS, DS  — B92, B93R, G17, Empepiątka, UZI
 *   45acp    P, KS, DS  — Jedenastka, Mark 23, Peacemaker, HK Universal, Tommy gun
 *   44mag    P          — Desert Eagle, .44 Magnum, Deer Hunter
 *   556      P,KS,DS,MS — AR, XM-8, Minimi
 *   76239ak  P, DS      — AK (Kałach)
 *   762      P,KS,DS,MS — R700, Scar, HK G3, M14, SR25, The Pig, Minigun (MS only)
 *   3006     P          — Lewar M95, Field 03, M1 US Rifle
 *   50bmg    P, DS, MS  — Light Fifty, Browning
 *   12ga_s/b P          — Obrzyn, Dwururka, Pompka, SP12 Tactical
 *   40mm     P          — MGL1S, Thumper
 *   60mm     P          — Bazooka
 *   120mm    P          — Moździerz (not in BronPalna.md — "Broń Specjalna" table)
 *
 * Miotana ammo ids (strzala/belt/kulka/igla/strzykawka) are also seeded below:
 * bows/crossbows with a configured quiver already route through tracerFire()
 * and getShotSoundKey() in real play (see magazine.mjs's _isTrackedRangedWeapon,
 * which gates on having a mag, not on being a firearm) — no architectural
 * reason to exclude them, just no bespoke overrides authored yet.
 */

/**
 * ---------------------------------------------------------------------------
 * HOW THESE VISUALS WERE DERIVED
 * ---------------------------------------------------------------------------
 * Every field is a delta from `TUNE` in tracer-vfx.mjs (the generic firearm
 * look: 240 px streak, 6 px thick, white-gold core, orange glow, 4600 px/s).
 * Omit a field to inherit it. Three ideas drive the numbers:
 *
 * 1. SPEED tracks real muzzle velocity, but COMPRESSED. A literal mapping would
 *    put a .22 LR at ~2100 px/s and a crossbow bolt at ~400, which reads as
 *    broken rather than slow. The scale used keeps the ordering honest while
 *    staying legible at table distances:
 *        pistols 2800-4000 · rifles 5000-6100 · .50 BMG 6000
 *        shotguns ~3000 · launchers 1200-1700 · muscle-powered 1100-1800
 *
 * 2. SIZE tracks projectile energy. `tracerLength` and `tracerThickness` scale
 *    with the round; `muzzleSize`/`muzzleScale`/`muzzleDurMs` scale with the
 *    powder charge behind it, which is why a .44 Magnum flashes bigger than a
 *    9 mm despite both being handguns.
 *
 * 3. COLOR follows real tracer compounds where one exists:
 *        Western/NATO  → orange-red   (default glow)
 *        Soviet/AK      → GREEN       (7,62x39 — the one deliberate outlier,
 *                                      and a free visual tell for who is shooting)
 *        .50 BMG        → deep red, very large
 *    Ammunition that has no tracer element at all — shot, slugs, grenades,
 *    arrows, bolts, darts — instead gets a short, dim, desaturated streak
 *    standing in for a visible projectile or its smoke trail, NOT a glowing
 *    round. Muscle-powered ammo drops `muzzle*` to near nothing: a bow has no
 *    muzzle flash.
 *
 * `spreadPx` is accuracy (buckshot 64 px, anti-materiel rifle 12 px) and
 * `staggerMs` is cyclic rate, so both are set wherever a caliber's automatic
 * behaviour differs from the default.
 *
 * Tune these live with the Tracer VFX panel: pick a caliber in the dropdown and
 * the sliders edit THAT caliber's override, then "Eksport" copies a ready-made
 * replacement block for this file.
 */
export const CALIBER_VFX = {
  /* ── Pistoletowa ─────────────────────────────────────────────── */

  // Rimfire. Smallest round in the game — a faint, short streak and a flash
  // barely worth the name.
  "22lr": {
    visual: {
      tracerLength: 110, tracerThickness: 3, glowBlur: 5,
      coreColor: "#ffeccc", glowColor: "#ff9a3a",
      speed: 3000, spreadPx: 20,
      muzzleSize: 56, muzzleScale: 0.5, muzzleDurMs: 50,
    },
  },

  // Revolver round: subsonic and lazy, a touch fatter than .22.
  "38spl": {
    visual: {
      tracerLength: 130, tracerThickness: 4, glowBlur: 6,
      coreColor: "#ffeccc", glowColor: "#ff8f30",
      speed: 2900, spreadPx: 22,
      muzzleSize: 68, muzzleScale: 0.6, muzzleDurMs: 55,
    },
  },

  // The service-pistol baseline everything else is judged against.
  "9mm": {
    visual: {
      tracerLength: 150, tracerThickness: 4, glowBlur: 7,
      speed: 3400, spreadPx: 22,
      muzzleSize: 72, muzzleScale: 0.65, muzzleDurMs: 60,
    },
  },

  // Heavier and markedly slower than 9 mm — a fat, deep-orange lob.
  "45acp": {
    visual: {
      tracerLength: 140, tracerThickness: 5, glowBlur: 8,
      glowColor: "#ff6a12",
      speed: 2800, spreadPx: 24,
      muzzleSize: 82, muzzleScale: 0.75, muzzleDurMs: 65,
    },
  },

  // Magnum handgun: still a pistol streak, but the muzzle blast is rifle-sized.
  "44mag": {
    visual: {
      tracerLength: 180, tracerThickness: 6, glowBlur: 9,
      glowColor: "#ff5a08",
      speed: 4000, spreadPx: 20,
      muzzleSize: 104, muzzleScale: 1.0, muzzleDurMs: 85,
    },
  },

  /* ── Karabinowa ──────────────────────────────────────────────── */

  // Small, extremely fast bullet: the longest thin streak, near-white core.
  "556": {
    visual: {
      tracerLength: 300, tracerThickness: 4, glowBlur: 8,
      coreColor: "#ffffff", glowColor: "#ff8c2a",
      speed: 6100, spreadPx: 18,
      muzzleSize: 88, muzzleScale: 0.8,
      // Denser than default (lower = denser): light, fast tracers read well
      // en masse, and 5,56 is the classic suppressive-fire caliber.
      mapCompression: 240,
    },
  },

  // GREEN tracer — Soviet/Warsaw Pact compound. Deliberately the one caliber
  // that does not read orange, so AK fire is identifiable at a glance across
  // the table. Heavier and less accurate than 5,56.
  "76239ak": {
    visual: {
      tracerLength: 250, tracerThickness: 5, glowBlur: 10,
      coreColor: "#eaffe4", glowColor: "#4ade4a",
      muzzleColor: "#ffd88a",
      speed: 5000, spreadPx: 26,
      muzzleSize: 92, muzzleScale: 0.85,
    },
  },

  // Full-power battle rifle: long, hot, flat-shooting.
  "762": {
    visual: {
      tracerLength: 320, tracerThickness: 5, glowBlur: 9,
      coreColor: "#fff8e0", glowColor: "#ff7018",
      speed: 5700, spreadPx: 18,
      muzzleSize: 96, muzzleScale: 0.9,
    },
  },

  // Hunting cartridge — heavy bullet, bolt guns, deliberate aim. Tightest
  // non-anti-materiel spread and a big, slow flash.
  "3006": {
    visual: {
      tracerLength: 300, tracerThickness: 6, glowBlur: 10,
      glowColor: "#ff6614",
      speed: 5300, spreadPx: 14,
      muzzleSize: 104, muzzleScale: 0.95, muzzleDurMs: 85,
    },
  },

  // Anti-materiel. Biggest of everything: a thick red bar with an enormous
  // flash, and the tightest spread in the game.
  "50bmg": {
    visual: {
      tracerLength: 460, tracerThickness: 9, glowBlur: 14,
      coreColor: "#ffffff", glowColor: "#ff4d05",
      speed: 6000, spreadPx: 12,
      muzzleSize: 150, muzzleColor: "#ffe0a0", muzzleScale: 1.35, muzzleDurMs: 110,
      // Thinned deliberately (higher = thinner): these tracers are individually
      // enormous, so a belt-fed .50 burst near 1:1 would be a wall of red.
      mapKnee: 2, mapCompression: 450,
    },
  },

  /* ── Śrutowa ─────────────────────────────────────────────────── */

  // Buckshot: no tracer at all. The visual sells a CONE of pellets — very short
  // stubs, the widest spread in the game, and zero stagger so the whole pattern
  // leaves the barrel at once instead of trickling out.
  "12ga_s": {
    visual: {
      tracerLength: 70, tracerThickness: 3, glowBlur: 4,
      coreColor: "#ffe9c8", glowColor: "#ff8a3a",
      speed: 3000, spreadPx: 64, staggerMs: 0,
      muzzleSize: 118, muzzleScale: 1.05, muzzleDurMs: 80,
    },
  },

  // Slug: one heavy projectile from the same shell — same huge flash as
  // buckshot, but a single thick stub on a tight line.
  "12ga_b": {
    visual: {
      tracerLength: 120, tracerThickness: 7, glowBlur: 6,
      glowColor: "#ff7016",
      speed: 3300, spreadPx: 18,
      muzzleSize: 118, muzzleScale: 1.05, muzzleDurMs: 80,
    },
  },

  /* ── Granatnikowa / Ppanc ────────────────────────────────────── */

  // 40 mm grenade: a slow, visibly lobbed projectile. Smoky brown glow rather
  // than a hot tracer, since nothing here is burning phosphor.
  "40mm": {
    visual: {
      tracerLength: 90, tracerThickness: 8, glowBlur: 12,
      coreColor: "#ffd9a0", glowColor: "#b06a2a",
      speed: 1500, spreadPx: 26,
      muzzleSize: 110, muzzleColor: "#ffb060", muzzleScale: 1.0, muzzleDurMs: 110,
    },
  },

  // Bazooka rocket: slow, fat and burning — the streak IS the motor plume, and
  // the backblast is the largest muzzle effect in the game.
  "60mm": {
    visual: {
      tracerLength: 160, tracerThickness: 11, glowBlur: 16,
      coreColor: "#fff0c0", glowColor: "#ff5a10",
      speed: 1700, spreadPx: 18,
      muzzleSize: 170, muzzleColor: "#ffd090", muzzleScale: 1.5, muzzleDurMs: 160,
    },
  },

  // Mortar bomb: slowest thing that leaves a barrel, and mostly smoke.
  "120mm": {
    visual: {
      tracerLength: 140, tracerThickness: 12, glowBlur: 18,
      coreColor: "#e8d8b8", glowColor: "#9a5a28",
      speed: 1200, spreadPx: 30,
      muzzleSize: 190, muzzleColor: "#ffc880", muzzleScale: 1.6, muzzleDurMs: 200,
    },
  },

  /* ── Miotana ─────────────────────────────────────────────────── */
  // Muscle-powered ammunition has no propellant and no tracer compound, so the
  // streak stands in for a visible shaft in flight and the muzzle flash is
  // reduced to almost nothing — a bow does not flash. Kept faintly visible
  // rather than invisible so the shot still reads on a busy canvas.

  "strzala": {
    visual: {
      tracerLength: 90, tracerThickness: 3, glowBlur: 2,
      coreColor: "#d8c49a", glowColor: "#6b5535",
      speed: 1500, spreadPx: 20,
      muzzleSize: 24, muzzleColor: "#8a7550", muzzleScale: 0.15, muzzleDurMs: 30,
    },
  },

  // Crossbow bolt: shorter and faster than an arrow.
  "belt": {
    visual: {
      tracerLength: 75, tracerThickness: 3, glowBlur: 2,
      coreColor: "#cfc2a4", glowColor: "#5f4c30",
      speed: 1800, spreadPx: 16,
      muzzleSize: 24, muzzleColor: "#8a7550", muzzleScale: 0.15, muzzleDurMs: 30,
    },
  },

  // Sling stone: a grey blur, barely a streak.
  "kulka": {
    visual: {
      tracerLength: 50, tracerThickness: 4, glowBlur: 2,
      coreColor: "#cccccc", glowColor: "#6a6a6a",
      speed: 1200, spreadPx: 28,
      muzzleSize: 20, muzzleColor: "#7a7a7a", muzzleScale: 0.12, muzzleDurMs: 25,
    },
  },

  // Blowgun dart: the least visible projectile in the game, deliberately.
  "igla": {
    visual: {
      tracerLength: 45, tracerThickness: 2, glowBlur: 1,
      coreColor: "#cfd6c2", glowColor: "#4a5340",
      speed: 1100, spreadPx: 18,
      muzzleSize: 16, muzzleColor: "#6a7360", muzzleScale: 0.1, muzzleDurMs: 20,
    },
  },

  // Syringe round (Strzelba Palmera): gas-launched, so slightly more presence
  // than a blowgun dart and a faint cold tint.
  "strzykawka": {
    visual: {
      tracerLength: 60, tracerThickness: 3, glowBlur: 2,
      coreColor: "#cfe2d8", glowColor: "#4a6358",
      speed: 1600, spreadPx: 20,
      muzzleSize: 40, muzzleColor: "#8aa89a", muzzleScale: 0.3, muzzleDurMs: 40,
    },
  },
};

/**
 * Sound is a plain lookup, not a cascade — each sound.<mode> is a single
 * atomic WeaponSound key, nothing to merge field-by-field.
 * @param {string|null|undefined} caliberId
 * @param {string} fireMode  "p" | "ks" | "ds" | "ms" | "oz"
 * @returns {string|null}
 */
export function getCaliberSoundOverride(caliberId, fireMode) {
  return caliberId ? CALIBER_VFX[caliberId]?.sound?.[fireMode] ?? null : null;
}

/**
 * @param {string|null|undefined} caliberId
 * @returns {object|null}  Flat TUNE subset, or null if this caliber has no visual override.
 */
export function getCaliberVisualOverride(caliberId) {
  return caliberId ? CALIBER_VFX[caliberId]?.visual ?? null : null;
}
