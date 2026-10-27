/**
 * Neuroshima 5e — woda i wspinaczka: czyste zasady (NOE s. 255–256, „Wspinaczka” s. 256; PLAN_m6 §5.6, E6).
 *
 * Czysty: bez `game`, bez dokumentów. Warstwa Foundry — `scenes/woda.mjs` (Region `woda`, karty, statusy, HUD) i
 * wiersze silnika okoliczności (`config/okolicznosci-ataku.mjs`).
 *
 *   - **Pływanie** (s. 255): koszt ruchu robi dnd5e (RAW = stock). Wejście do wody w ubraniu i ze sprzętem — MG może
 *     wymagać SIŁ (Atletyka) ST 10 (Utrudnienie z pancerza liczy `actors/armor-rules.mjs`); porażka — Szybkość 0.
 *   - **Ruch pod wodą** (s. 255): bez Szybkości pływania — na początku każdej tury SIŁ (Atletyka) ST nurtu (10 spokojna,
 *     15 rwąca rzeka, 20 wzburzony ocean, 25 wir); porażka — cała Szybkość tracona i opadanie na dno („Tonie” + „Pod
 *     wodą”), sukces — wypływa. **Tylko w walce** (U15, MG): poza walką test zarządza MG.
 *   - **Wstrzymywanie oddechu** (s. 255): 1 + mod. KON minut; obrażenia — RO KON ST 10 albo Uduszenie
 *     (`actors/zagrozenia.mjs`).
 *   - **Walka pod wodą** (s. 255–256) — wiersze silnika okoliczności, połowa obrażeń, zacięcie przy ≤ 5.
 *   - **Wspinaczka** (s. 256): SIŁ (Atletyka) ST 10 (śliska ściana, mało chwytów — 15+, MG), dwie wolne ręce, ciężki
 *     plecak — Utrudnienie. Koszt ruchu — dnd5e.
 */

const _f = Object.freeze;

/** Status „Pod wodą” (zanurzony) i „Tonie” (Szybkość 0, opada) — `config/conditions.mjs`. */
export const POD_WODA = "podWoda";
export const TONIE = "tonie";

/** Nurt → ST testu SIŁ (Atletyka) (s. 255). */
export const NURTY = _f({
  spokojna: _f({ st: 10, label: "Spokojna woda" }),
  rwaca: _f({ st: 15, label: "Rwąca rzeka" }),
  wzburzona: _f({ st: 20, label: "Wzburzony ocean" }),
  wir: _f({ st: 25, label: "Wir wodny" })
});

/** Głębokość wody w Regionie: płytka — po pas (Osłona ½ stojącym), głęboka — pływanie. */
export const GLEBOKOSCI = _f({
  plytka: _f({ label: "Płytka (brodzenie)" }),
  gleboka: _f({ label: "Głęboka (pływanie)" })
});

/** Wejście do wody w ubraniu i ze sprzętem (s. 255). */
export const ST_WEJSCIA = 10;
/** Wspinaczka (s. 256): prosta ściana; śliska albo z małą liczbą chwytów — MG podnosi. */
export const ST_WSPINACZKI = 10;

/** ST nurtu (nieznany — spokojna). */
export function stNurtu(nurt) {
  return (NURTY[nurt] ?? NURTY.spokojna).st;
}

/**
 * Czy na początku tury w tej wodzie należy się test pływania (s. 255; U15 — tylko w walce).
 * @param {{glebokosc?: string, walka?: boolean, plywa?: boolean}} p  `plywa` — Szybkość pływania
 */
export function testNaPoczatkuTury({ glebokosc, walka, plywa } = {}) {
  return glebokosc === "gleboka" && !!walka && !plywa;
}

/**
 * Wynik testu pływania (s. 255): porażka — Tonie i Pod wodą (opada na dno), sukces — Tonie schodzi i wypływa, jeśli
 * pod wodę wciągnęło go tonięcie (nurkujący z własnej woli zostaje pod wodą).
 * @returns {{tonie: boolean, zanurza: boolean, wynurza: boolean}}
 */
export function poTescie(sukces) {
  return sukces ? { tonie: false, zanurza: false, wynurza: true } : { tonie: true, zanurza: true, wynurza: false };
}

/** Zasięg broni pod wodą w metrach (s. 255): palna 30 cm, miotana i rzucana 1,5 m. */
export const ZASIEG_POD_WODA = _f({ palna: 0.3, miotana: 1.5 });

/** Zacięcie broni palnej: naturalny wynik, przy którym się zacina — zanurzona ≤ 5 (s. 255), inaczej pechowa 1. */
export function progZaciecia(podWoda) {
  return podWoda ? 5 : 1;
}

/**
 * Połowa obrażeń (s. 255–256): pocisk wystrzelony pod wodą; broń miotana i rzucana w cel pod wodą.
 * @param {{palna?: boolean, miotana?: boolean, atakujacyPodWoda?: boolean, celPodWoda?: boolean}} p
 */
export function polowaObrazen({ palna, miotana, atakujacyPodWoda, celPodWoda } = {}) {
  return (!!palna && !!atakujacyPodWoda) || (!!miotana && !!celPodWoda);
}

/**
 * Test wspinaczki (s. 256).
 * @param {{wolneRece?: number, ciezkiPlecak?: boolean, st?: number}} p
 * @returns {{st: number, utrudnienie: boolean, rece: boolean}}  `rece` — dwie wolne ręce (inaczej naruszenie)
 */
export function testWspinaczki({ wolneRece = 2, ciezkiPlecak = false, st = ST_WSPINACZKI } = {}) {
  return { st: Math.max(ST_WSPINACZKI, Number(st) || ST_WSPINACZKI), utrudnienie: !!ciezkiPlecak, rece: wolneRece >= 2 };
}
