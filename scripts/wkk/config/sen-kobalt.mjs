/**
 * Sen — liczby WKK (PLAN_m5_postoj.md D20, D34, D35).
 *
 * Gospodarz: `config/postoj-rules.mjs` (`skutkiSnu`), który czyta tę tabelę tylko pod Kobaltem i
 * podustawieniem „Sen (WKK)” (U54). NOE i WKK zgadzają się co do progu DO (6 h, s. 45); WKK dokłada
 * RO za krótki sen i odsypianie Bezsenności.
 */

/**
 * D20 — RO na KON za krótki sen; porażka — Bezsenność (źródło Wyczerpania `bezsennosc`). 0–1 h liczy NOE
 * (doba bez snu, s. 45: ST 20), więc tu tylko progi, których NOE nie zna.
 */
export const RO_KROTKI_SEN_KOBALT = Object.freeze([
  Object.freeze({ od: 4, do: 5, st: 10 }),
  Object.freeze({ od: 2, do: 3, st: 15 })
]);

/**
 * D35 — odsypianie: pod Kobaltem Bezsenność jest uporczywa i zwykłe DO jej nie zdejmuje. Zdejmuje ją sen
 * ponad normę: 12 h — jeden poziom, 18 h — dwa. Nie więcej — reszta doby to jedzenie, leki i troska o siebie.
 */
export const ODSYPIANIE_KOBALT = Object.freeze([
  Object.freeze({ odGodzin: 18, poziomy: 2 }),
  Object.freeze({ odGodzin: 12, poziomy: 1 })
]);
