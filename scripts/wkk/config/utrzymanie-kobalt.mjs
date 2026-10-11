/**
 * Utrzymanie — liczby WKK (PLAN_m5_postoj.md D13, D38).
 *
 * Gospodarz: `config/postoj-rules.mjs` (`szansaBogaty`, `przeskok`), tylko pod Kobaltem. W NOE Normalny =
 * Bogaty mechanicznie (s. 47); różnica jest w karcie podsumowania i tutaj.
 */

/**
 * D38 — Bogate życie daje szansę na Fuksa rosnącą z każdym dniem: 1 / (11 − n), n = kolejne dni Bogatego
 * życia bez Fuksa z tego źródła (dzień 1 — 1/10, dzień 10 — pewny). Sukces zeruje n. Fuks na 7 dni.
 */
export const BOGATY_KOBALT = Object.freeze({
  mianownik: 11,
  pewnyDnia: 10,
  terminDni: 7
});
