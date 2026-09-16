/**
 * Dum-dum bleed profile — WKK-only, no RAW basis. From the dum-dum round (.44 Mag, caliber
 * `44mag_dd`, `wkk/config/ammo-data.mjs`) via the `Rozrywająca` weapon-save property
 * (`wkk/combat/weapon-save-properties.mjs`). Spliced into `BLEED_PROFILES` by
 * `combat/bleeding.mjs` — see that file's header comment for how it's chosen over the RAW
 * `hemofilia` profile when both could apply to the same actor.
 *
 * Hits harder (1k8), lands at the START of the victim's turn, and crucially cannot be waited
 * out: there is no save that stops it, only dressing the wound does. That is the whole point
 * of the ammunition.
 */
export const DUMDUM_BLEED_PROFILE = Object.freeze({
  id: "dumdum",
  label: "Krwawienie (pocisk dum-dum)",
  when: "start",
  damage: "1d8",
  medicineDC: 15,
  dose: false,
  severity: 2,
  save: null
});
