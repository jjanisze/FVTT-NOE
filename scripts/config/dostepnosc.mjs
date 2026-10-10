/**
 * Neuroshima 5e — dostępność przedmiotu (procent z cennika NOE; WKK nadpisuje wybrane).
 *
 * Jeden pomocnik dla wszystkiego, co pyta „jak łatwo to kupić”: opis przedmiotu dziś, okno handlarza w
 * M5. Liczby NOE leżą w katalogu produkcji (`config/recipes-data.mjs`, pole `dostepnosc`), nadpisania
 * WKK — w `wkk/config/dostepnosc-kobalt.mjs` (wzorzec z `scripts/wkk/README.md`). Bez globali Foundry:
 * buildery paczek wołają go w Node.
 */

import { KATALOG } from "./recipes-data.mjs";
import { DOSTEPNOSC_KOBALT } from "../wkk/config/dostepnosc-kobalt.mjs";

/**
 * Dostępność w procentach albo `null`, gdy cennik jej nie podaje.
 * @param {string} ref  odwołanie katalogu (`raw:kontroler`)
 * @param {{kobalt?: boolean}} [o]
 * @returns {number|null}
 */
export function dostepnosc(ref, { kobalt = false } = {}) {
  if (kobalt && Number.isFinite(DOSTEPNOSC_KOBALT[ref])) return DOSTEPNOSC_KOBALT[ref];
  const d = Number(KATALOG.get(ref)?.dostepnosc);
  return Number.isFinite(d) ? d : null;
}

/** Linia opisu: „30%”, a gdy WKK się różni — „30% (WKK: 10%)”; `null` bez danych. */
export function liniaDostepnosci(ref) {
  const noe = dostepnosc(ref);
  const wkk = dostepnosc(ref, { kobalt: true });
  if (noe === null && wkk === null) return null;
  if (wkk === null || wkk === noe) return `${noe}%`;
  return noe === null ? `WKK: ${wkk}%` : `${noe}% (WKK: ${wkk}%)`;
}
