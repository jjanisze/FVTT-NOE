/**
 * Ruch w walce — uzupełnienia luk NOE wybrane dla M8 (PLAN_m8_ruch_i_ekonomia_akcji §2.1). WKK.
 *
 * NOE (s. 26, 29–30) mówi, ile ruchu daje Szybkość, Przyspieszenie i Bieganie, ale milczy o tym, co się dzieje, gdy
 * te źródła się spotykają w jednej turze. MG wybrał (2026-11-15) cztery konwencje; gospodarzem jest czysty model
 * `config/ekonomia-data.mjs` (`budzetRuchu`), przełącznikiem — „Kolor Kobaltu”. Bez Kobaltu moduł **nie podstawia innej
 * ukrytej interpretacji**: budżet w takiej sytuacji dostaje etykietę „rozstrzygnij ręcznie”, a linijka nie potwierdza
 * go na zielono (§2.2). Drukowane koszty — Szybkość, granty Przyspieszenia i Biegania, teren — działają zawsze.
 *
 *   - **D14** — grant zachowuje liczbę z chwili wykonania; późniejsza zmiana efektywnej Szybkości przesuwa tylko bazę.
 *   - **D17** — przy zmianie rodzaju Szybkości odejmuje się wspólny wcześniejszy koszt ruchu (SRD 5.2.1 s. 188).
 *   - **D30** — ruch z wyczekanej akcji (w Reakcji) korzysta wyłącznie ze świeżego grantu tej reakcji.
 *   - **D31** — grant Przyspieszenia jest przypisany do wybranego rodzaju Szybkości.
 */

/** Klucze konwencji → krótki opis do etykiety „rozstrzygnij ręcznie”. */
export const RUCH_KOBALT = Object.freeze({
  d14: "Szybkość zmieniła się po grancie ruchu",
  d17: "zmiana rodzaju Szybkości po wcześniejszym ruchu",
  d30: "starszy grant ruchu w trwającej reakcji",
  d31: "grant ruchu innego rodzaju Szybkości"
});

/** Wszystkie konwencje włączone (z Kobaltem) albo wyłączone (bez). */
export function konwencjeRuchu(kobalt) {
  return Object.freeze(Object.fromEntries(Object.keys(RUCH_KOBALT).map(k => [k, !!kobalt])));
}
