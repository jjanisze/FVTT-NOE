/**
 * Dum-dum bleed profile — WKK-only, no RAW basis. From the dum-dum round (.44 Mag, caliber
 * `44mag_dd`, `wkk/config/ammo-data.mjs`) via the `Rozrywająca` weapon-save property
 * (`wkk/combat/weapon-save-properties.mjs`). Spliced into `BLEED_PROFILES` by
 * `combat/bleeding.mjs` — see that file's header comment for how it's chosen over the RAW
 * `hemofilia` profile when both could apply to the same actor.
 *
 * Hits harder (1k8), lands at the START of the victim's turn, and no save stops it — only
 * dressing the wound does, plus (with Kolor Kobaltu) the stop paths of `KRWAWIENIE_KOBALT` below.
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

/**
 * WKK #43 (Kolor Kobaltu; MG, 2026-10-31). The book has three rules that all go by „Krwawienie” and
 * behave differently — Hemofilia, Podstępny atak, the Stopień Zranienia bleed of Rdza/Rtęć/Stal
 * (`docs/Pytania-do-autora.md` §17). Until the author answers:
 *   - `ladunek`     — the Medycyna test on any bleed spends a charge of narzędzia małego medyka, either
 *                     result (as Pomoc medyczna, rule 15); an empty kit only with Aspiryna i Miętusy —
 *                     with Utrudnienie and no charge, as healing from an empty bag;
 *   - `lek`         — a bleed without a save (Podstępny atak, dum-dum, Przycelowanie's artery) also stops on the Hemofilia
 *                     medicine (Desmopresyna, Preparaty krwiopochodne), as Hemofilia itself does;
 *   - `turyObrazen` — and it ends on its own after this many turns of damage, the counterpart of
 *                     Hemofilia's three saves in a row.
 * Without Kobalt: the test spends nothing, and a bleed without a save lasts until the wound is dressed.
 */
export const KRWAWIENIE_KOBALT = Object.freeze({ ladunek: true, lek: true, turyObrazen: 3 });
