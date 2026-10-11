/**
 * Jakość wody — liczby WKK (PLAN_m5_postoj.md D23, D37).
 *
 * Zasada z wewnętrznej alfy systemu, usunięta z druku, bo na papierze nie da się jej śledzić; w Foundry
 * się da. Wraca jako WKK pod podustawieniem „Jakość wody (WKK)” (U54). Gospodarz: `config/postoj-rules.mjs`
 * (`skutkiWody`), krok jedzenia zatwierdzenia doby i `consumeDailyNeeds`.
 *
 * Alfa miała ST 12 / 15 / 16 — brudna i chemiczna niższe, bo na Nędznym poziomie rzut jest codzienny.
 */

/** Jakości od najczystszej; `consumeDailyNeeds` bierze najpierw najczystszą. */
export const JAKOSCI_WODY = Object.freeze(["filtrowana", "pitna", "brudna", "skazona-chem", "skazona-rad"]);

/**
 * D37 — RO KON raz na dobę picia gorszej wody:
 *   - brudna: ST 10, porażka — Choroba zakaźna (biegunka, s. 111; antybiotyk 10 dni); kto już choruje, nie rzuca;
 *   - skażona radioaktywnie: ST 15, porażka — Wyczerpanie „Skażenie radioaktywne”;
 *   - skażona chemicznie: ST 15, porażka — 1k6 od kwasu i Wyczerpanie.
 * Gotowanie 15 min albo WD-Tabs czynią wodę pitną (tylko brudną).
 */
export const WODA_KOBALT = Object.freeze({
  "brudna": Object.freeze({ label: "brudna", st: 10, choroba: "biegunka", uzdatnialna: true }),
  "skazona-rad": Object.freeze({ label: "skażona radioaktywnie", st: 15, wyczerpanie: "skazenie", uzdatnialna: false }),
  "skazona-chem": Object.freeze({ label: "skażona chemicznie", st: 15, obrazenia: "1d6", typObrazen: "acid", wyczerpanie: "zatrucie", uzdatnialna: false })
});

/** `prowiantId` zapasów → jakość (D37, §7.14). Nowe pozycje WKK „Woda skażona (rad.)”, „(chem.)”. */
export const JAKOSC_Z_PROWIANTU = Object.freeze({
  woda_filtrowana: "filtrowana",
  woda_pitna: "pitna",
  woda_brudna: "brudna",
  woda_skazona_rad: "skazona-rad",
  woda_skazona_chem: "skazona-chem"
});
