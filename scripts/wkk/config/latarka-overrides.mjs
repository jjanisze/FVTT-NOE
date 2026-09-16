/**
 * Latarka (`items/latarka.mjs`) — WKK override of RAW's light-radius numbers.
 *
 * The one clean "NOE item, WKK numbers" case in this module: `LIGHT_RAW` (kept in
 * `items/latarka.mjs`) is the book value, unmodified; this is the house-ruled replacement,
 * live-branched at the point of use via `isKobaltEnabled()` — see that file's `_light()`.
 *
 * Kolor Kobaltu (docs/Kobalt.md, rule 6) shrinks both radii — RAW's ranges are considered too
 * generous on a VTT. Bright cuts cleanly to 1/3 (45m -> 15m) and reads right at that scale. Dim
 * does NOT also get the flat 1/3 treatment (that would still be 60m): on the actual silo/dungeon
 * maps this campaign uses, a 60m dim spill lit most of a level at once, which felt less like "a
 * flashlight in the dark" and more like turning on the room lights — it also flattened any reason
 * to want a longer-ranged upgrade later. 22m keeps a real dim halo past the bright cone (RAW's own
 * bright:dim ratio, ~1:4, would be pointless to preserve here) without trivializing exploration.
 * Cone angles are unaffected by either of the above — locked decision, `PLAN_kobalt.md` — only
 * distance shrinks.
 */
export const LIGHT_KOBALT = { bright: 15, dim: 22, angle: 90, narrowAngle: 45 };
