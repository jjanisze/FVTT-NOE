/**
 * Skok Gladiatora — obrażenia (PLAN_m8_ruch_i_ekonomia_akcji §2.1 D33, §4.5). WKK.
 *
 * NOE s. 70 drukuje „1k6 obrażeń obuchowych za każde 3 metry długości lub wysokości twojego skoku”, ale nie mówi,
 * czy długość i wysokość się sumują ani jak liczyć niepełne 3 m. MG wybrał (2026-11-15): `floor(max(długość,
 * wysokość) / 3 m)` kości — bez sumowania składowych i bez zaokrąglania w górę (2,9 m → 0k6, 4,5 + 3 m → 1k6).
 * Gospodarz: `config/skok-data.mjs` (`kosciGladiatora`), karta w `combat/skok.mjs`. Bez Kobaltu karta nie podstawia
 * innego odczytu: RO i Powalenie (drukowane) działają, liczbę kości rozstrzyga stół (§2.2).
 */

/** Klucz konwencji → krótki opis do etykiety „rozstrzygnij ręcznie”. */
export const SKOK_KOBALT = Object.freeze({
  d33: "obrażenia Skoku Gladiatora — 1k6 za każde 3 m długości lub wysokości skoku"
});

/** Konwencje włączone (z Kobaltem) albo wyłączone (bez). */
export function konwencjeSkoku(kobalt) {
  return Object.freeze({ d33: !!kobalt });
}
