/**
 * Handel — liczby WKK (PLAN_m5_postoj.md D3, D41).
 *
 * Gospodarz: `config/handel-rules.mjs` (wycena, generator towaru) i `config/addons-data.mjs`
 * (`rodzajUlepszenia`), które czytają te stałe tylko przy `{ kobalt: true }`.
 */

/**
 * D3 — pod Kobaltem handlarz skupuje po połowie ceny regionalnej (NOE: 100%). Wpływanie i korekta MG
 * podnoszą to w oknie wymiany; liczba jest punktem wyjścia, nie sufitem.
 */
export const SKUP_KOBALT = 0.5;

/**
 * D41 — Osełka jest pod Kobaltem towarem: na listach i w zamówieniach, dostępność z progu ceny (20 gb →
 * 50%, D32), kategoria cen Broń; stosuje ją właściciel jak dziś. W NOE Naostrzenie to przeróbka kowala
 * (D31), więc na listy nie trafia.
 */
export const NASADKI_KOBALT = Object.freeze(["naostrzenie"]);
