/**
 * Dostępność przedmiotów — liczby WKK (PLAN_m3_towarzysze.md D33).
 *
 * Gospodarz: `config/dostepnosc.mjs` (`dostepnosc(ref, { kobalt })`), który bierze tę tabelę zamiast
 * dostępności z cennika NOE, gdy Kobalt jest włączony. Dziś czyta ją opis przedmiotu; okno handlarza
 * (M5) będzie czytać tego samego pomocnika.
 */

/**
 * D33 — fabryczny kontroler zdalnego sterowania jest w świecie WKK znaleziskiem (NOE: 30%), więc
 * zwykłą drogą do drona zostaje domowy kontroler ze schematu Hakera (zob. też D37: pod Kobaltem
 * fabrycznego nie da się zbudować).
 */
export const DOSTEPNOSC_KOBALT = Object.freeze({
  "raw:kontroler": 10
});
