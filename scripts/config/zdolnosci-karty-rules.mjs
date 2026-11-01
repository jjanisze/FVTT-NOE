/**
 * Neuroshima 5e — karty MG zdolności (PLAN_m7 E7, rodzina R9): czyste zasady. Bez `game`, bez dokumentów — testy Quench
 * i silnik `combat/zdolnosci-karty.mjs`. Bez cytatów (repozytorium publiczne).
 */

const _f = Object.freeze;
const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  Łapiduch (Medyk)                             */
/* -------------------------------------------- */

/** Czas od ustania tętna → ST Testu Medycyny reanimacji: do 1, 2, 4 i 8 minut. */
export const REANIMACJA_ST = _f([_f({ doSekund: 60, st: 15 }), _f({ doSekund: 120, st: 20 }), _f({ doSekund: 240, st: 25 }), _f({ doSekund: 480, st: 30 })]);

/** Reanimacja trwa minutę — karta to mówi, zegar przesuwa MG. */
export const REANIMACJA_TRWA = 60;

/**
 * ST reanimacji po `sekundy` od śmierci; `null` — za późno (ponad 8 minut).
 * @param {number} sekundy
 * @returns {number|null}
 */
export function stReanimacji(sekundy) {
  const s = Math.max(0, _num(sekundy));
  return REANIMACJA_ST.find(p => s <= p.doSekund)?.st ?? null;
}

/**
 * Przyczyny śmierci (`PRZYCZYNY_SMIERCI`), po których reanimacja ma sens. RAW wyłącza tylko Olbrzymie obrażenia; maks.
 * PW 0 i szósty poziom Wyczerpania zostają po reanimacji i znów zabijają (RAI), maszyn się nie reanimuje.
 */
export const REANIMACJA_PRZYCZYNY = _f(["rzuty", "stopien"]);

/* -------------------------------------------- */
/*  Kłusownik (Zwiadowca 2)                      */
/* -------------------------------------------- */

/** ST zauważenia pułapki, wyzwolenia się z niej i uniknięcia części obrażeń: 8 + mod. MDR + PB. */
export function stPulapki({ mdr = 0, pb = 0 } = {}) {
  return 8 + _num(mdr) + _num(pb);
}

/* -------------------------------------------- */
/*  Bez tajemnic (Łowca mutantów)                */
/* -------------------------------------------- */

/** Progi Testu INT (Przyroda): nazwa, słabe punkty, trzy współczynniki. */
export const BEZ_TAJEMNIC = _f([
  _f({ id: "nazwa", st: 10, label: "Nazwa" }),
  _f({ id: "slabe", st: 15, label: "Słabe punkty" }),
  _f({ id: "wspolczynniki", st: 20, label: "Trzy współczynniki" })
]);

/** Czego dowiaduje się postać przy wyniku `wynik` — ids progów osiągniętych. */
export function progiBezTajemnic(wynik) {
  return BEZ_TAJEMNIC.filter(p => _num(wynik) >= p.st).map(p => p.id);
}

/** Bez tajemnic działa na mutanty i potwory (kategorie Bestiariusza). */
export const BEZ_TAJEMNIC_KATEGORIE = _f(["mutant", "potwor"]);

/* -------------------------------------------- */
/*  Coś mi tu śmierdzi (Missisipi, D9)           */
/* -------------------------------------------- */

/** Zasięg wyczucia mutantów w metrach i ST Testu Percepcji, który wskazuje istotę. */
export const SMROD_ZASIEG = 9;
export const SMROD_ST = 15;

/**
 * Mutanty, które właśnie weszły w zasięg — sygnał tylko przy nowych, żeby ruch w miejscu nie zalewał czatu.
 * @param {Iterable<string>} przedtem
 * @param {Iterable<string>} teraz
 * @returns {string[]}
 */
export function nowiWZasiegu(przedtem, teraz) {
  const p = new Set(przedtem ?? []);
  return [...new Set(teraz ?? [])].filter(id => !p.has(id));
}

export const __testing = _f({ stReanimacji, stPulapki, progiBezTajemnic, nowiWZasiegu });
