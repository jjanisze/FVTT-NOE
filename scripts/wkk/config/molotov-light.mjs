/**
 * Koktajl Mołotowa (`actors/molotov.mjs`) — WKK-only light.
 *
 * Unlike Latarka (`latarka-overrides.mjs`), there is no RAW value to override: the rulebook gives
 * a lit Molotov no light at all. So this isn't "NOE item, WKK numbers" — the light itself is the
 * WKK rule. `molotovLight()` in the host file returns this under Kolor Kobaltu and `null` (no
 * light) without it. GM decision 2026-09-24: small mechanical impact, but light changes what
 * tokens can see, so by the classification rule it's WKK, not presentation.
 *
 * Why it exists at all: lighting and throwing are two separate actions/clicks, and a burning rag
 * in hand should read as one on the map — even for a few seconds of real time between the two in
 * the same turn. The same light follows the bottle to the ground while it waits for the end of the
 * turn. A poor lamp by design: it can't be put out and bursts in the holder's hand after 3 rounds.
 *
 * Same kind as the Flara (heavily jerked "torch" animation, both sliders maxed) but nowhere near as
 * bright: Flara 12/24 m, a rag in a bottle 1.5/4.5 m.
 */
export const MOLOTOV_LIGHT_KOBALT = Object.freeze({
  bright: 1.5, dim: 4.5,
  color: "#ff8a2a", alpha: 0.3,
  luminosity: 0.3, attenuation: 0.6,
  animation: Object.freeze({ type: "torch", speed: 10, intensity: 10 })
});
