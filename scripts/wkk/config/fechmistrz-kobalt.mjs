/**
 * Fechmistrz (Mistrz broni białej, s. 104) — czas zmiany broni, WKK (`docs/Kobalt.md` zasada 44).
 *
 * RAW: wybraną broń zmieniasz po Długim odpoczynku, w czasie którego trenujesz z nową. MG kazał wybrać czas treningu
 * w Kobalcie (2026-11-02): 30 h — 10% Treningu/Nauki nowej biegłości (300 h, s. 47). Mistrz przestawia się na nową
 * broń, nie uczy się od zera. Godziny idą z budżetu pracy postoju, przez kolejne Długie odpoczynki. Gospodarz:
 * `config/sztuczki-walka.mjs` (`fechmistrzPostep`), zajęcie odpoczynku w `combat/sztuczki-walka.mjs`.
 */

/** Godzin treningu z nową bronią do zmiany wyboru Fechmistrza. */
export const FECHMISTRZ_KOBALT_H = 30;
