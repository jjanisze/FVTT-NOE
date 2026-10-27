/**
 * WKK — Łyżeczka w Kolorze Kobaltu (PLAN_m6_drobne_zasady.md §5.2.1, MG 2026-10-26).
 *
 * RAW Łyżeczki (s. 69–70) daje tabelę wagi, a jej biegłość dubluje biegłość Gladiatora w broni improwizowanej.
 * MG odrzucił premię do trafienia (wąskie pasmo TT) i wybrał dopiski w duchu *weapon master* / *tavern brawler*:
 *
 *   - **Zawsze coś pod ręką** — raz na turę, Darmowa Interakcja: przedmiot z otoczenia (klasa wagi do SIŁ kg), MG może
 *     zawetować;
 *   - **Dalszy rzut** — 6/18 m zamiast płaskich 6 m, tabela wagi także dla rzutu;
 *   - **Właściwość z rodzaju** — jedna właściwość NOE, do której pasuje rodzaj przedmiotu, z listy bramkowanej wagą;
 *     MG może zawetować;
 *   - **Przerzut jedynek** — kości obrażeń łyżeczki, które wypadną 1, przerzuca się raz.
 *
 * Czysty: bez `game`. Warstwa Foundry: `actors/improwizacja.mjs` (pyta `isKobaltEnabled()`).
 */

const _f = Object.freeze;

/** Dalszy rzut: normalny/daleki. */
export const LYZECZKA_ZASIEG_KOBALT = _f({ value: 6, long: 18 });

/**
 * Właściwość z rodzaju — wybór per wiersz tabeli wagi (`config/improwizacja-rules.mjs` `LYZECZKA_TABELA`).
 * Klucze właściwości: dnd5e `lgt` (Lekka) i właściwości NOE z istniejącą automatyką (`combat/obalajaca.mjs`,
 * `wkk/combat/weapon-save-properties.mjs`, Burząca — obiekty M6 E4).
 */
export const WLASCIWOSCI_LYZECZKI = _f([
  _f(["lgt", "obalajaca", "unieruchamiajaca"]),   // ≤ 5 kg
  _f(["obalajaca", "powalajaca", "unieruchamiajaca"]),   // 6–11 kg
  _f(["powalajaca", "burzaca"]),   // 12–17 kg
  _f(["powalajaca", "burzaca"])    // 18–20 kg
]);

/** Przerzut jedynek: modyfikator kości rdzenia — przerzuca raz (`rr` przerzucałby do skutku). */
export const PRZERZUT_JEDYNEK = "r1";

/** Wzór kości obrażeń łyżeczki w Kobalcie (`3d6r1`). */
export function koscLyzeczkiKobalt({ number, faces }) {
  return `${number}d${faces}${PRZERZUT_JEDYNEK}`;
}

/** Czy właściwość wolno wybrać dla tej wagi (wiersz tabeli). */
export function wlasciwoscDozwolona(wiersz, klucz) {
  return !!WLASCIWOSCI_LYZECZKI[wiersz]?.includes(klucz);
}
