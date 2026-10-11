/**
 * Bebeszenie — wiersze WKK (PLAN_m5_postoj.md D11, D36).
 *
 * Gospodarz: `config/bebeszenie-data.mjs` (`wierszBebeszenia`), który dokłada je tylko pod Kobaltem. Tabele
 * NOE (s. 269) nie mają Malutkiej bestii (Kitchin, Neokot, Techmorwa malutka) ani Ogromnej maszyny.
 * Jednostki jak w tabelach NOE modułu: minuty, kg (przeliczane na jednostki surowców w gospodarzu).
 */

/** D36 — Malutka bestia: 15 min, ST 5, 2 kg MO, 5 kg mięsa. */
export const BESTIA_MALUTKA_KOBALT = Object.freeze({ minuty: 15, st: 5, kg: Object.freeze({ MO: 2, mieso: 5 }) });

/**
 * D36 — Ogromna maszyna: ×2 Wielkiej (64 h, CH 100 kg, MK 6000 kg, CE 100 kg, CZ 200 kg); ST bez wzrostu —
 * RAW nie ma ST > 25 w bebeszeniu.
 */
export const MASZYNA_OGROMNA_KOBALT = Object.freeze({ minuty: 64 * 60, st: 25, kg: Object.freeze({ CH: 100, MK: 6000, CE: 100, CZ: 200 }) });
