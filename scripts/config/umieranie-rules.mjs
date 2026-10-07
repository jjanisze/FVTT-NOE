/**
 * Neuroshima 5e — umieranie wg NOE: czyste zasady (PLAN_m1_walka.md §7.1, E0).
 *
 * Czysty: bez `game`, bez `CONFIG`, bez dokumentów. Warstwa Foundry to `combat/umieranie.mjs`
 * (maszyna stanów, lejek zapisu, karty); tu tylko liczby i rozstrzygnięcia RAW, które ona czyta.
 *
 * ## Reguły (NOE s. 34, „Utrata Punktów Wytrzymałości”)
 *
 *   - **Obrażenia przy 0 PW** — jedna porażka w Rzutach Przeciw Śmierci; z ataku wręcz — dwie
 *     („zamiast tego”). Krytyk nie podwaja (inaczej niż w 5e); krytyk daje za to Stopień Zranienia.
 *   - **Olbrzymie obrażenia** — jedno zdarzenie ≥ podwojonych maksymalnych PW: śmierć na miejscu.
 *     „Jedno zdarzenie” = jedno nałożenie jednej karty obrażeń na jeden cel (U3).
 *   - **Maksymalne PW równe 0** — śmierć.
 *   - **Rzut Przeciw Śmierci** — k20 ≥ 10, „nie jest Testem k20” (bez premii, Wyczerpania,
 *     Przerzutów i Fuksów — U12); 1 = dwie porażki, 20 = 1 PW; trzy sukcesy — stabilny; trzy
 *     porażki — śmierć (D1: przez kartę MG). Stabilizacja i powrót do przytomności zerują tor.
 *   - **Stabilny bez leczenia** odzyskuje 1 PW po 1k8 godzin (s. 34; 5e: 1k4).
 *
 * ## Zagrożenia (s. 255–259; konsumenci w E7)
 *
 *   - Uduszenie: oddech na 1 + mod. KON minut, minimum 30 s — tu w turach po 6 s.
 *   - Przemarznięcie: RO KON ST 5 + 1 za każdy °C poniżej zera, co godzinę.
 *   - Sen: doba bez snu → RO KON ST 20.
 */

/** Rzut Przeciw Śmierci: próg sukcesu i długość toru (s. 34). */
export const RZUT_PRZECIW_SMIERCI = Object.freeze({ st: 10, tor: 3 });

/** Stabilny bez leczenia: 1 PW po tylu godzinach (s. 34). */
export const STABILNY_FORMULA = "1d8";

/** Sekundy jednej tury walki. */
export const SEKUND_NA_TURE = 6;

/**
 * Przyczyny śmierci, które kończą się kartą „Śmierć” (D1). `pw0` nie jest przyczyną — BN przy
 * 0 PW umiera domyślnie (D2), ale to osobna karta „BN pada”.
 */
export const PRZYCZYNY_SMIERCI = Object.freeze({
  rzuty: Object.freeze({ label: "Trzy porażki w Rzutach Przeciw Śmierci", strona: "s. 34", ostatniaAkcja: true }),
  olbrzymie: Object.freeze({ label: "Olbrzymie obrażenia", strona: "s. 34", ostatniaAkcja: false }),
  maksPW: Object.freeze({ label: "Maksymalne PW równe 0", strona: "s. 34", ostatniaAkcja: false }),
  stopien: Object.freeze({ label: "Kolejny Stopień Zranienia ponad Krytyczny", strona: "s. 32", ostatniaAkcja: false }),
  wyczerpanie: Object.freeze({ label: "Szósty poziom Wyczerpania", strona: "s. 35", ostatniaAkcja: false })
});

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Ile porażek w Rzutach Przeciw Śmierci daje to nałożenie obrażeń (s. 34).
 *
 * Tylko przy PW **już** równych 0 — cios, który dopiero zbija PW do 0, wprowadza w umieranie, ale
 * porażki nie daje. Leczenie i obrażenia zerowe nie liczą się wcale.
 * @param {{pwPrzed: number, obrazenia: number, wrecz?: boolean}} p
 * @returns {0|1|2}
 */
export function porazkiZaObrazenia({ pwPrzed, obrazenia, wrecz = false } = {}) {
  if (_num(pwPrzed) > 0) return 0;
  if (!(_num(obrazenia) > 0)) return 0;
  return wrecz ? 2 : 1;
}

/**
 * Olbrzymie obrażenia: jedno zdarzenie ≥ 2 × maksymalne PW (s. 34). Przykład z podręcznika:
 * maks. 20 PW — śmierć od 40 obrażeń naraz.
 * @param {{obrazenia: number, maksPW: number}} p
 */
export function olbrzymieObrazenia({ obrazenia, maksPW } = {}) {
  const max = _num(maksPW);
  if (max <= 0) return false; // śmierć z maks. PW = 0 to osobna przyczyna
  return _num(obrazenia) >= 2 * max;
}

/** Maksymalne PW równe 0 — śmierć (s. 34). Ujemne wartości traktujemy tak samo. */
export function smiercZMaksPW(maksPW) {
  return Number.isFinite(Number(maksPW)) && Number(maksPW) <= 0;
}

/** Formuła godzin do 1 PW stabilnego bez leczenia (U5: ślepy rzut MG przy stabilizacji). */
export function stabilnyGodziny() {
  return STABILNY_FORMULA;
}

/**
 * Rzut Przeciw Śmierci → nowy tor (s. 34). `wynik` to naturalna kość — rzut jest czystą k20 (U12),
 * więc wynik i kość to to samo.
 * @param {{wynik: number, sukcesy?: number, porazki?: number}} p
 * @returns {{sukcesy: number, porazki: number, zdarzenie: "pw1"|"stabilny"|"smierc"|null}}
 *   `pw1` — naturalna 20, odzyskuje 1 PW (tor się zeruje, bo wraca przytomność);
 *   `stabilny` — trzeci sukces (tor się zeruje, s. 34: „lista sukcesów i porażek się resetuje”);
 *   `smierc` — trzecia porażka (tor zostaje — karta „Śmierć” go pokazuje).
 */
export function poRzucie({ wynik, sukcesy = 0, porazki = 0 } = {}) {
  const k = _num(wynik);
  const { st, tor } = RZUT_PRZECIW_SMIERCI;
  if (k >= 20) return { sukcesy: 0, porazki: 0, zdarzenie: "pw1" };
  if (k >= st) {
    const s = Math.min(tor, _num(sukcesy) + 1);
    return s >= tor
      ? { sukcesy: 0, porazki: 0, zdarzenie: "stabilny" }
      : { sukcesy: s, porazki: _num(porazki), zdarzenie: null };
  }
  const f = Math.min(tor, _num(porazki) + (k <= 1 ? 2 : 1));
  return { sukcesy: _num(sukcesy), porazki: f, zdarzenie: f >= tor ? "smierc" : null };
}

/**
 * Stan maszyny umierania (§7.2) z natywnych pól dnd5e (U1) — jedna odpowiedź dla karty, panelu
 * i haków. Kolejność ma znaczenie: martwy wygrywa ze wszystkim, PW > 0 to zawsze przytomność
 * (Nokautowanie to 1 PW + Nieprzytomność, nie umieranie).
 * @param {{pw: number, stabilny?: boolean, martwy?: boolean}} p
 * @returns {"martwy"|"przytomny"|"stabilny"|"umierajacy"}
 */
export function stanUmierania({ pw, stabilny = false, martwy = false } = {}) {
  if (martwy) return "martwy";
  if (_num(pw) > 0) return "przytomny";
  return stabilny ? "stabilny" : "umierajacy";
}

/* -------------------------------------------- */
/*  Zagrożenia (E7)                              */
/* -------------------------------------------- */

/**
 * Wstrzymany oddech: 1 + mod. KON minut, minimum 30 sekund (s. 259) — w turach walki po 6 s.
 * @param {number} modKON
 * @returns {number} liczba pełnych tur
 */
export function oddechTur(modKON) {
  const minuty = Math.max(0.5, 1 + _num(modKON));
  return Math.round((minuty * 60) / SEKUND_NA_TURE);
}

/**
 * Przemarznięcie: ST RO na Kondycję co godzinę (s. 258). `null` — temperatura nie jest ujemna,
 * zagrożenia nie ma.
 * @param {number} tempC
 * @returns {number|null}
 */
export function stMrozu(tempC) {
  const t = Number(tempC);
  if (!Number.isFinite(t) || t >= 0) return null;
  return 5 + Math.ceil(-t);
}

/** Doba bez snu: RO na Kondycję ST 20, porażka — poziom Wyczerpania (s. 45). */
export function stSnu() {
  return 20;
}

/** Obrażenia przy wstrzymanym oddechu: RO na Kondycję o tym ST albo zaczyna się dusić (s. 194). */
export const ST_ODDECHU_PRZY_OBRAZENIACH = 10;

/**
 * Uduszenie po końcu tury istoty (s. 259): wstrzymuje oddech — odliczanie; powietrze skończyło się
 * na końcu tej tury — od następnej się dusi; dusi się — poziom Wyczerpania na końcu każdej tury.
 * Pierwszy poziom przychodzi więc na końcu pierwszej tury bez powietrza, nie tej, w której się skończyło.
 * @param {{faza: "oddech"|"dusi", tury?: number}} stan
 * @returns {{faza: "oddech"|"dusi", tury: number, wyczerpanie: boolean}}
 */
export function poTurzeOddechu({ faza = "oddech", tury = 0 } = {}) {
  if (faza === "dusi") return { faza: "dusi", tury: 0, wyczerpanie: true };
  const zostalo = Math.max(0, Math.trunc(_num(tury)) - 1);
  return zostalo > 0
    ? { faza: "oddech", tury: zostalo, wyczerpanie: false }
    : { faza: "dusi", tury: 0, wyczerpanie: false };
}

/**
 * Przemarznięcie dla jednej istoty (s. 258; koc s. 140, śpiwór s. 142): ile RO i jak.
 * Ciepło ubrany albo temperatura ≥ 0 — nic; śpiwór — każdy RO zdany automatycznie; koc — Ułatwienie.
 * @param {{tempC: number, godziny?: number, cieplo?: boolean, spiwor?: boolean, koc?: boolean}} p
 * @returns {{st: number|null, rzuty: number, automatycznie: boolean, tryb: number}}
 *   `tryb` jak `ADV_MODE` dnd5e (1 Ułatwienie).
 */
export function planMrozu({ tempC, godziny = 1, cieplo = false, spiwor = false, koc = false } = {}) {
  const st = stMrozu(tempC);
  const n = Math.max(0, Math.trunc(_num(godziny)));
  if (st === null || cieplo || !n) return { st, rzuty: 0, automatycznie: false, tryb: 0 };
  if (spiwor) return { st, rzuty: n, automatycznie: true, tryb: 0 };
  return { st, rzuty: n, automatycznie: false, tryb: koc ? 1 : 0 };
}

export const __testing = Object.freeze({
  porazkiZaObrazenia, olbrzymieObrazenia, smiercZMaksPW, stabilnyGodziny, poRzucie, stanUmierania,
  oddechTur, stMrozu, stSnu, poTurzeOddechu, planMrozu
});
