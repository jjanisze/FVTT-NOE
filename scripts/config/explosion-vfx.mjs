/**
 * Neuroshima 5e — grenade explosion VFX asset table.
 *
 * Source: 5 sprites the GM parked as reference Tiles in the "!!SZABLONY!!" scratch
 * scene while hunting for usable explosion art (`worlds/OUTPUT/scenes/tiles/
 * _21_21SZABLONY/tile_0.png` … `tile_4.png` — generic pipeline filenames, not
 * hand-named in Foundry). Copied here as permanent module assets under new
 * descriptive names — PLAN_sequencer.md's own "File layout" section already
 * reserved a `vfx/` folder for exactly this ("Phase 4 assets only"), it just never
 * got anything in it because no explosion art had been sourced yet.
 *
 * Two visual families, picked by damage TYPE (grenade-inventory.mjs's own
 * `_parseDamageSpec` already resolves this from the catalog's Polish `effect`
 * text — "wybuchow(e)" / "ci(ę)t(e)" etc. → "explosive"/"slashing"/…,
 * "ogie(ń/n)" → "fire" — no new text parsing needed here):
 *
 *   - RING_VARIANTS — concentric-square blast rings (tile_0..tile_3), for any
 *     resolved type OTHER than "fire". Four sizes so a grenade picks the
 *     variant closest to its OWN blast size instead of one asset stretched
 *     across every grenade in the game — a 9 m frag blast gets the biggest/
 *     busiest ring set; a 3 m improvised charge gets the sparsest one. See
 *     `pickRingVariant`.
 *   - FIRE — a single flame-blob sprite (tile_4), for the two catalog entries
 *     whose `effect` text says "ogień" instead of "wybuchowe": Koktajl
 *     Mołotowa and Granat zapalający. Visually wrong to reuse a concussive-
 *     looking concentric-ring sprite for a fire that's meant to *linger and
 *     burn*, not detonate once.
 *
 * Smoke/gas/flashbang grenades (Dymny, Gazowy, Hukowy) deliberately get NO
 * asset here — `_parseDamageSpec` finds no dice in their effect text ("Chmura
 * dymu…", "Oślepienie + Zatrucie…"), so `grenade-inventory.mjs` skips the VFX
 * call entirely rather than misusing a fire/explosion sprite for a phenomenon
 * that isn't either. That's a genuine "still needs its own art" gap, not a bug.
 *
 * ## Sizing — GRID SQUARES, not pixels or meters
 *
 * Native sizes below are recorded in grid squares on the SZABLONY reference
 * scene (`tile_0.png` is 420 px on a 70 px/square grid = 6 squares), because
 * squares are exactly what `Sequence#effect().size(n, {gridUnits: true})`
 * consumes — Sequencer multiplies by whatever scene the effect actually plays
 * on, so this table stays correct even though SZABLONY's own px-per-meter
 * ratio (70 px / 1.5 m) differs from a real play scene's (e.g. Silos — 64 px /
 * 1.5 m). Recording native size in meters or raw pixels here would have baked
 * in SZABLONY's specific ratio and silently mis-sized the sprite everywhere
 * else — checked live before writing this table, not assumed.
 */

export const EXPLOSION_RING_VARIANTS = [
  { file: "modules/neuroshima-2026-overrides/vfx/explosion_ring_xl.png", squares: 6 },
  { file: "modules/neuroshima-2026-overrides/vfx/explosion_ring_l.png", squares: 5 },
  { file: "modules/neuroshima-2026-overrides/vfx/explosion_ring_m.png", squares: 4 },
  { file: "modules/neuroshima-2026-overrides/vfx/explosion_ring_s.png", squares: 3 },
];

export const EXPLOSION_FIRE = Object.freeze({
  file: "modules/neuroshima-2026-overrides/vfx/fire_burst.png",
  squares: 3,
});

/**
 * Permanent-ish scorch decal (2026-09-06 follow-up), user-supplied — a soft,
 * feathered black burst on an opaque white background (GraphicsCrate stock
 * art; the "_prev_sm" in the original filename suggests it may be a
 * marketplace PREVIEW/sample render rather than the final purchased asset —
 * worth a second look before this ships to players, not blocking here).
 *
 * Deliberately NOT sized like the ring/fire sprites above (nearest-native-
 * fit): the scorch mark should always read as smaller than the blast that
 * made it, scaling proportionally with NO minimum floor — a tiny charge
 * leaves a tiny mark, not a floor-clamped "small-at-worst" one the way the
 * label text is allowed to be. See `SCORCH_SIZE_FRACTION`'s use in
 * `grenade-inventory.mjs`'s `_spawnScorchMark`.
 *
 * Opaque white background needs a blend mode to disappear into the terrain
 * (plain alpha compositing would paint a white square) — `darkenMode` names
 * the specific blend requested; `multiply` is the more common choice for
 * this exact kind of soft grayscale decal (proportional darkening even
 * through the feathered edges, where "darken"'s per-channel minimum can go
 * nearly inert against midtone ground) and is one word to swap to if
 * "darken" ends up not reading as expected once seen live on more than one
 * background.
 */
export const SCORCH_MARK = Object.freeze({
  file: "modules/neuroshima-2026-overrides/vfx/scorch_mark.webp",
  blendMode: "darken",
  opacity: 0.5,
});

// Fraction of the blast's own footprint the scorch decal is sized to —
// proportional, no floor, so a small charge leaves a correspondingly tiny
// mark rather than something clamped to a "smallest usable" size.
export const SCORCH_SIZE_FRACTION = 0.6;

// ~1 year of GAME time (game.time.worldTime, seconds) — "permanent for all
// practical campaign purposes" without being literally forever, so a very
// long campaign doesn't accumulate scorch marks without end. Independent of
// EXPLOSIVE_MARKER_LIFETIME_SECONDS in grenade-inventory.mjs — the mark is
// meant to significantly outlive the blast marker and its fire/ring VFX.
export const SCORCH_MARK_LIFETIME_SECONDS = 365 * 24 * 60 * 60;

/**
 * Nearest-native-size ring variant for a given target footprint.
 * @param {number} targetSquares  Blast diameter/side, in the TARGET scene's own grid squares.
 * @returns {{file: string, squares: number}}
 */
export function pickRingVariant(targetSquares) {
  return EXPLOSION_RING_VARIANTS.reduce((best, cand) =>
    Math.abs(cand.squares - targetSquares) < Math.abs(best.squares - targetSquares) ? cand : best
  );
}
