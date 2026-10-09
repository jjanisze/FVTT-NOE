/**
 * Neuroshima 5e — naprawa awarii maszyn: reguły WKK (PLAN_m3_towarzysze.md §7.11, D9, D25, D28).
 *
 * Host: `config/towarzysze-rules.mjs` `naprawaAwarii()`, który czyta te wpisy tylko przy
 * `{ kobalt: true }`. NOE nie ma tabeli napraw — naprawę awarii rozstrzyga MG (karta T1).
 *
 * Zamiast „% ceny, podział jak przy produkcji celu” (naprawa M2) — **konkretne części wg tego, co
 * się zepsuło**, w małych ilościach (D28: różnorodność, nie kwota). Każdy wymieniony surowiec idzie
 * w ułamku swojej ilości w przepisie drona (w górę, min. 1); Chemia — w przepisie 1 — ma ilość stałą.
 */

/** Ułamek ilości z przepisu wg stopnia naprawy M2 (`NAPRAWA_KOLEJNOSC`); `pelna` — harówa podniesiona. */
export const ULAMKI_NAPRAWY_KOBALT = Object.freeze({
  drobnostka: 1 / 5,
  troche: 1 / 2,
  harowa: 3 / 4,
  pelna: 1
});

/** Chemia w stałej ilości wg stopnia — w przepisie drona jest 1, ułamek dałby zawsze 1. */
export const CHEMIA_NAPRAWY_KOBALT = Object.freeze({
  drobnostka: 2,
  troche: 3,
  harowa: 4,
  pelna: 4 // harówa podniesiona: reszta idzie w pełnej ilości z przepisu, Chemia nie spada poniżej harówy
});

/**
 * Pozycje Tabeli awarii maszyn (k20) → stopień naprawy i surowce. `przemijajaca` — mija sama, naprawy
 * nie ma; `wymiana` — część do wymiany („nie opłaca się naprawiać”); `wrak` — nienaprawialne (U11).
 */
export const NAPRAWA_AWARII_KOBALT = Object.freeze({
  1: Object.freeze({ stopien: "drobnostka", surowce: Object.freeze(["MK", "CZ"]), wymiana: true, opis: "wymiana broni i montaż" }),
  2: Object.freeze({ stopien: "harowa", surowce: Object.freeze(["CZ", "MK", "CH"]), opis: "napęd (smar)" }),
  3: Object.freeze({ stopien: "troche", surowce: Object.freeze(["CE", "CZ"]), opis: "moduł celowania" }),
  4: Object.freeze({ stopien: "harowa", surowce: Object.freeze(["CE"]), opis: "procesor" }),
  5: Object.freeze({ przemijajaca: true, opis: "zasilanie — mija samo" }),
  6: Object.freeze({ stopien: "troche", surowce: Object.freeze(["MK", "CZ"]), opis: "mocowanie broni (PW naprawą RAW, nowa amunicja)" }),
  7: Object.freeze({ stopien: "troche", surowce: Object.freeze(["CZ", "MK"]), opis: "manipulator" }),
  8: Object.freeze({ stopien: "troche", surowce: Object.freeze(["CE", "CZ"]), opis: "optyka (soczewki, matryca)" }),
  9: Object.freeze({ stopien: "drobnostka", surowce: Object.freeze(["CH"]), opis: "wyciek płynów" }),
  10: Object.freeze({ przemijajaca: true, opis: "reset systemów — mija sam" }),
  11: Object.freeze({ stopien: "drobnostka", surowce: Object.freeze(["CE", "CH"]), opis: "okablowanie (PW naprawą RAW)" }),
  12: Object.freeze({ przemijajaca: true, opis: "żyroskop — mija sam" }),
  13: Object.freeze({ stopien: "troche", surowce: Object.freeze(["MK", "CZ"]), opis: "pancerz (blachy)" }),
  14: Object.freeze({ stopien: "harowa", surowce: Object.freeze(["CE", "CZ"]), opis: "moduł celowania" }),
  15: Object.freeze({ stopien: "troche", surowce: Object.freeze(["CZ", "CH"]), opis: "siłowniki (hydraulika)" }),
  16: Object.freeze({ stopien: "harowa", surowce: Object.freeze(["CZ", "MK", "CH"]), wymiana: true, opis: "wymiana siłowników" }),
  17: Object.freeze({ stopien: "drobnostka", surowce: Object.freeze(["CE"]), opis: "pamięć" }),
  18: Object.freeze({ stopien: "troche", surowce: Object.freeze(["CE"]), opis: "pamięć — wgranie od nowa" }),
  19: Object.freeze({ stopien: "troche", surowce: Object.freeze(["CE", "CH"]), opis: "zasilanie (elektrolit, paliwo)" }),
  20: Object.freeze({ wrak: true, opis: "autodestrukcja — wrak" })
});
