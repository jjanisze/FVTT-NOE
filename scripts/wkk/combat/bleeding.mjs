/**
 * Krwawienie (Dum-dum) — WKK-only, no RAW basis. From the dum-dum round (.44 Mag, caliber `44mag_dd`,
 * `wkk/config/ammo-data.mjs`) via the `Rozrywająca` weapon-save property (`wkk/combat/weapon-save-properties.mjs`).
 *
 * GM decision (2026-10-31, `docs/Krwawienia.md`): the same bleed as Podstępny atak under another name, but a separate
 * effect — a target can carry both at once. So this is only the rename; `config/krwawienia-data.mjs` clones the
 * Podstępny atak entry with these keys on top.
 */
export const DUMDUM_BLEED = Object.freeze({
  id: "dumdum",
  status: "krwawienieDumdum",
  label: "Krwawienie (Dum-dum)",
  img: "modules/neuroshima-2026-overrides/icons/statuses/krwawienie-dumdum.svg",
  zrodlo: "WKK — nabój .44 Mag dum-dum (zasada 24)",
  opis: "<p>(WKK) Jak Krwawienie (Podstępny atak): 1k8 obrażeń na początku swojej tury, aż ktoś opatrzy ranę — Test "
    + "narzędzi małego medyka ST 10 (ładunek narzędzi). Osobny efekt, może być naraz z Podstępnym atakiem.</p>"
    + "<p>Przy 0 PW każde tyknięcie to porażka w Rzucie Przeciw Śmierci; stabilizacja krwawienia nie zatrzymuje. "
    + "Jedna akcja leczenia zatrzymuje jedno krwawienie.</p>"
});

/**
 * WKK #43 (Kolor Kobaltu; MG, 2026-10-31 / 2026-11-01). The Hemofilia medicine (Desmopresyna, Preparaty
 * krwiopochodne) stops any bleed, not only Hemofilia — one chosen bleed per dose, like every treatment action. Never the
 * Wyciek of a machine. Without Kobalt: Hemofilia only (RAW). The kit charge and the ST 10 dressing test are no longer
 * WKK — they are the module's reading for everyone (`docs/Krwawienia.md`).
 */
export const KRWAWIENIE_KOBALT = Object.freeze({ lek: true });
