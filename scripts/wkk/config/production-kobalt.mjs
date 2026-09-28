/**
 * Produkcja (`config/production-rules.mjs`) — liczby WKK. Plan: `PLAN_produkcja.md` §3.
 *
 * Każda stała poniżej ma w pliku-gospodarzu swój odpowiednik `..._RAW` i jest wybierana
 * w jednym miejscu użycia przez `isKobaltEnabled()` (wzorzec z `scripts/wkk/README.md`).
 * Zmiana ustawienia w trakcie Roboty działa od następnej pracy: przepis zostaje ze snapshotu,
 * a mnożniki, ST i waga liczą się według bieżącego stanu przełącznika.
 */

/**
 * D14 — porzucenie Roboty. RAW go nie zna (bez WKK przycisku nie ma, `PORZUCENIE_RAW = null`).
 * Porzucenie wcześnie oddaje wszystko — nic jeszcze nie przetopiono; później połowę,
 * bo reszta jest już w półproduktach, których nikt nie odkupi.
 */
export const PORZUCENIE_KOBALT = Object.freeze({
  progPelnegoZwrotu: 0.10, // postęp ≤ 10% → zwrot 100%
  zwrotPozniej: 0.5        // powyżej → 50%
});

/**
 * D4 — waga Roboty płynie od wagi surowców do wagi wyniku, proporcjonalnie do postępu.
 * RAW (D25) trzyma przez całą pracę wagę wejścia: bez wartości w podręczniku nic nie znika
 * ani nie powstaje.
 */
export const WAGA_ROBOTY_KOBALT = Object.freeze({ interpolacja: true });

/**
 * D15 — Schemat waży 1 g na godzinę produkcji przepisu standardowego (traktor 1000 h → 1 kg).
 * RAW nie podaje wagi, więc bez WKK Schemat waży 0.
 */
export const SCHEMAT_GRAMY_NA_GODZINE_KOBALT = 1;

/**
 * D26–D28, D32 — profesja Speca jako cecha wykonawcy zamiast osobnego przepisu.
 *
 * - `czesc` (×0,75) — samo wykonanie przez profesjonalistę,
 * - `pelny` (×0,5) — z pełnym zestawem narzędzi profesji pod ręką (postać albo kontener Roboty),
 * - `podloga` — iloczyn wszystkich mnożników czasu (także Fabrykatora) nie schodzi niżej,
 *   co akurat wypada na profesję z pełnym zestawem razem z Fabrykatorem (0,5 · 0,5),
 * - `stMaks` — drabina ST bez stopnia 30: powyżej 75 gb zawsze 25 (wariant C w D26 — czysty
 *   „tylko czas” dawałby pojazdom Mechaniki ST 30, gorzej niż tabela RAW).
 *
 * Surowce bez rabatu: tabela daje już tylko listę przedmiotów, podział i zestaw profesji.
 * D30 (Koktajl Mołotowa „1 minuta” to błąd tabeli) nie potrzebuje osobnej stałej — z WKK
 * tabele nie niosą liczb, więc czas bierze się ze wzoru jak dla każdego przedmiotu.
 */
export const PROFESJA_KOBALT = Object.freeze({
  czesc: 0.75,
  pelny: 0.5,
  podloga: 0.25,
  stMaks: 25
});
