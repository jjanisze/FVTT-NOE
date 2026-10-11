/**
 * Neuroshima 5e — postój: czyste zasady (PLAN_m5_postoj.md §7.1, E0).
 *
 * Czysty: bez `game`, bez `CONFIG`. Warstwa Foundry (szkic doby, zatwierdzenie MG, przeskok) czyta stąd
 * budżety, skutki snu, utrzymanie, zarobki i rachunek. WKK (sen poniżej 6 h, odsypianie, Bogaty, woda) —
 * `wkk/config/{sen,utrzymanie,woda}-kobalt.mjs`, tylko przy `{ kobalt: true }`.
 *
 * ## Reguły (NOE s. 45–47, s. 74; odczyty MG — `scripts/wkk/README.md`)
 *
 *   - **Doba** (D7, U48): sen + zajęcia = 24 h; „praca” (produkcja, naprawa, Praca, Trening, Budowa, koncert)
 *     łącznie ≤ 10 h — s. 145 i s. 47 czytane jako jeden dzień pracy (RAI). Przekroczenie to linia, nie blokada.
 *   - **Sen** (s. 45, D20, D34): ≥ 6 h — DO; 4–5 h — korzyści KO (odczyt MG: DO przerwany po 4 h, s. 46);
 *     mniej — bez korzyści; 0–1 h — doba bez snu, RO KON ST 20 (s. 45). WKK: RO za 2–5 h i odsypianie (D35).
 *   - **Utrzymanie** (s. 47, D13, U33): Nędzny 5 gb — najgorsza woda, bez leków; Normalny 10 — woda, leki;
 *     Bogaty 20 — filtrowana woda, leki. W NOE Normalny = Bogaty mechanicznie; WKK — szansa Bogatego (D38).
 *   - **Praca** (s. 47, U30): 1 gb × wartość pasywna za 10 h, proporcjonalnie za mniej (w dół).
 *   - **Trening/Nauka** (s. 47, U31): 300 h, 1 gb/h × Usługi speców (D25). **Budowa bazy**: 1 gb/h.
 *   - **Rozrywka** (s. 47): miasteczko i miasto, 10 h, ≥ 50 gb — Fuks na 7 dni. **Plotkowanie**: ≥ 1 h,
 *     ≥ 5 gb, CHA (Śledztwo) ST 10 — 1 informacja + 1 za każde 5 ponad ST. **Hazard**: ST 20, sukces
 *     podwaja stawkę, porażka ją zabiera; 1 h (D40).
 *   - **Za garść gambli** (s. 74, U37): raz na dobę, 4 h, wynik × mnożnik miejsca, w dół.
 *   - **Rachunek** (D18, U29): koszty i zarobki doby; saldo < 0 — czerwone, nie blokada.
 *   - **Przeskok** (D19, U58): wartości oczekiwane bez rzutów dzień po dniu.
 */

import { REGIONY } from "./handel-data.mjs";
import { RO_KROTKI_SEN_KOBALT, ODSYPIANIE_KOBALT } from "../wkk/config/sen-kobalt.mjs";
import { BOGATY_KOBALT } from "../wkk/config/utrzymanie-kobalt.mjs";
import { WODA_KOBALT, JAKOSCI_WODY } from "../wkk/config/woda-kobalt.mjs";

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  Stałe                                        */
/* -------------------------------------------- */

/** Doba (D7) i dzień pracy (U48). */
export const DOBA_H = 24;
export const PRACA_H = 10;
/** Sen potrzebny do DO (s. 45, D34) i domyślne pole szkicu (D20). */
export const SEN_DO_H = 6;
export const SEN_DOMYSLNY_H = 8;
/** Doba bez snu (s. 45): RO KON ST 20 albo Wyczerpanie; 1 h liczona jak brak snu (D20). */
export const BEZ_SNU = Object.freeze({ doGodzin: 1, st: 20 });

/** Budżety zajęć (U26): `praca` liczy się do 10 h i do doby, `czas` — tylko do doby. */
export const BUDZETY = Object.freeze({ praca: "praca", czas: "czas" });

/** Koszt utrzymania (s. 47) i co pokrywa (U33). `obraz` — ilustracja karty (§7.23, D13). */
export const UTRZYMANIE = Object.freeze({
  nedzny: Object.freeze({ label: "Nędzny", koszt: 5, woda: "brudna", leki: false, obraz: "utrzymanie-nedzny" }),
  normalny: Object.freeze({ label: "Normalny", koszt: 10, woda: "pitna", leki: true, obraz: "utrzymanie-normalny" }),
  bogaty: Object.freeze({ label: "Bogaty", koszt: 20, woda: "filtrowana", leki: true, obraz: "utrzymanie-bogaty" })
});

/** Za garść gambli (s. 74): mnożnik wyniku Testu CHA (Występy) lub instrumentu. */
export const MIEJSCA_KONCERTU = Object.freeze({
  "ulica": Object.freeze({ label: "Ulica", mnoznik: 0.5 }),
  "tania-knajpa": Object.freeze({ label: "Tania knajpa", mnoznik: 1 }),
  "dobra-knajpa": Object.freeze({ label: "Dobra knajpa", mnoznik: 2 }),
  "drogi-klub": Object.freeze({ label: "Drogi klub", mnoznik: 3 })
});
export const KONCERT = Object.freeze({ godziny: 4, wyczerpanie: 1 });

/** Hazard (s. 47): przykładowe gry i testy; ST 20; 1 h (D40). */
export const HAZARD = Object.freeze({
  st: 20,
  godziny: 1,
  gry: Object.freeze({
    karty: Object.freeze({ label: "Karty", testy: Object.freeze([{ cecha: "cha", umiejetnosc: "osz" }]) }),
    kosci: Object.freeze({ label: "Kości", testy: Object.freeze([{ cecha: "dex", umiejetnosc: "zwi" }]) }),
    walki: Object.freeze({ label: "Walki gladiatorów lub potworów", testy: Object.freeze([{ cecha: "wis", umiejetnosc: "prc" }, { cecha: "int", umiejetnosc: "prz" }]) }),
    wyscigi: Object.freeze({ label: "Wyścigi", testy: Object.freeze([{ cecha: "wis", umiejetnosc: "poj" }, { cecha: "wis", umiejetnosc: "tre" }]) }),
    szuler: Object.freeze({ label: "Narzędzia szulera", testy: Object.freeze([{ narzedzia: "szulera" }]) })
  })
});

export const ROZRYWKA = Object.freeze({ godziny: 10, minGb: 50, fuksDni: 7 });
export const PLOTKI = Object.freeze({ minGodzin: 1, minGb: 5, st: 10, co: 5, cecha: "cha", umiejetnosc: "sle" });
export const TRENING = Object.freeze({ godziny: 300, gbNaGodzine: 1, maksDziennie: 10 });
export const BUDOWA = Object.freeze({ gbNaGodzine: 1, maksDziennie: 10 });
export const PRACA = Object.freeze({ godziny: 10 });
/** Szukanie towarzysza (M3 D30, U38): 24 h; Oswajanie — po nich 3 doby oswajania (s. 99). */
export const SZUKANIE = Object.freeze({ godziny: 24, oswajanieDob: 3 });

/* -------------------------------------------- */
/*  Doba i sen                                   */
/* -------------------------------------------- */

/**
 * Budżet doby (D7, U48). Zajęcie: `{ id, godziny, budzet: "praca"|"czas" }`.
 * @returns {{suma: number, sen: number, praca: number, wolne: number, przekroczenia: {rodzaj: string, ile: number}[]}}
 */
export function budzetDoby({ sen = SEN_DOMYSLNY_H, zajecia = [] } = {}) {
  const s = Math.max(0, _num(sen));
  let praca = 0;
  let razem = 0;
  for (const z of zajecia ?? []) {
    const h = Math.max(0, _num(z?.godziny));
    razem += h;
    if (z?.budzet === BUDZETY.praca) praca += h;
  }
  const suma = s + razem;
  const przekroczenia = [];
  if (suma > DOBA_H) przekroczenia.push({ rodzaj: "doba", ile: suma - DOBA_H });
  if (praca > PRACA_H) przekroczenia.push({ rodzaj: "praca", ile: praca - PRACA_H });
  return { suma, sen: s, praca, wolne: Math.max(0, DOBA_H - suma), przekroczenia };
}

/**
 * Skutki snu tej doby (D20, D34, D35). Godziny w dół do pełnych.
 * @returns {{korzysci: "DO"|"KO"|"brak", ro: number|null, odsypianie: 0|1|2, warstwa: "NOE"|"WKK"|null}}
 *   `ro` — ST RO KON (porażka: Bezsenność); `odsypianie` — poziomy Bezsenności zdjęte snem (tylko WKK).
 */
export function skutkiSnu(godziny, { kobalt = false } = {}) {
  const h = Math.max(0, Math.floor(_num(godziny)));
  if (h >= SEN_DO_H) {
    let odsypianie = 0;
    if (kobalt) odsypianie = ODSYPIANIE_KOBALT.find(o => h >= o.odGodzin)?.poziomy ?? 0;
    return { korzysci: "DO", ro: null, odsypianie, warstwa: odsypianie ? "WKK" : null };
  }
  if (h <= BEZ_SNU.doGodzin) return { korzysci: "brak", ro: BEZ_SNU.st, odsypianie: 0, warstwa: "NOE" };
  const korzysci = h >= 4 ? "KO" : "brak";
  if (!kobalt) return { korzysci, ro: null, odsypianie: 0, warstwa: null };
  const w = RO_KROTKI_SEN_KOBALT.find(r => h >= r.od && h <= r.do);
  return { korzysci, ro: w?.st ?? null, odsypianie: 0, warstwa: w ? "WKK" : null };
}

/* -------------------------------------------- */
/*  Utrzymanie i woda                            */
/* -------------------------------------------- */

/** Koszt utrzymania na dzień (s. 47); bez poziomu — 0 (dzicz, „znalazł robotę”). */
export function kosztUtrzymania(poziom) {
  return UTRZYMANIE[poziom]?.koszt ?? 0;
}

/**
 * Co pokrywa utrzymanie (U33): jedzenie i woda doby (zapasy nie schodzą), jakość wody, leki (dawka z
 * utrzymania przy Zachodzie słońca dla chorób przewlekłych — D13).
 * @returns {{jedzenie: boolean, woda: string|null, leki: boolean}}
 */
export function pokrycieUtrzymania(poziom) {
  const u = UTRZYMANIE[poziom];
  if (!u) return { jedzenie: false, woda: null, leki: false };
  return { jedzenie: true, woda: u.woda, leki: u.leki };
}

/**
 * WKK D38 — szansa Bogatego na Fuksa w `n`-tym kolejnym dniu bez Fuksa z tego źródła: 1 / (11 − n).
 * @returns {number} 0–1 (0 bez Kobaltu)
 */
export function szansaBogaty(n, { kobalt = false } = {}) {
  if (!kobalt) return 0;
  const d = Math.max(1, Math.floor(_num(n)));
  if (d >= BOGATY_KOBALT.pewnyDnia) return 1;
  return 1 / (BOGATY_KOBALT.mianownik - d);
}

/**
 * WKK D38 — rozstrzygnięcie dnia Bogatego: `u` z [0, 1) (kość); sukces zeruje licznik.
 * @returns {{fuks: boolean, n: number}} `n` — licznik po tym dniu
 */
export function dzienBogaty({ n = 0, u }, { kobalt = false } = {}) {
  if (!kobalt) return { fuks: false, n: 0 };
  const dzien = Math.max(0, Math.floor(_num(n))) + 1;
  const fuks = _num(u) < szansaBogaty(dzien, { kobalt });
  return { fuks, n: fuks ? 0 : dzien };
}

/**
 * Skutek wypicia wody danej jakości (WKK D37). Bez Kobaltu albo woda pitna/filtrowana — `null`.
 * @returns {{st: number, choroba?: string, wyczerpanie?: string, obrazenia?: string, typObrazen?: string}|null}
 */
export function skutkiWody(jakosc, { kobalt = false, juzChoruje = false } = {}) {
  if (!kobalt) return null;
  const w = WODA_KOBALT[jakosc];
  if (!w) return null;
  if (w.choroba && juzChoruje) return null;
  return { ...w };
}

/** Najczystsza dostępna jakość z listy (D37: `consumeDailyNeeds` bierze najpierw najczystszą). */
export function najczystszaWoda(jakosci) {
  const set = new Set(jakosci ?? []);
  return JAKOSCI_WODY.find(j => set.has(j)) ?? null;
}

/* -------------------------------------------- */
/*  Zarobki i zajęcia                            */
/* -------------------------------------------- */

/**
 * Wartość pasywna (U30, jak dnd5e): 10 + mod. + PB × biegłość (0, 1, 2 — ekspertyza) ±5 przy Ułatwieniu /
 * Utrudnieniu.
 */
export function wartoscPasywna({ mod = 0, pb = 0, bieglosc = 0, ulatwienie = false, utrudnienie = false } = {}) {
  const adv = (ulatwienie ? 5 : 0) - (utrudnienie ? 5 : 0);
  return 10 + _num(mod) + _num(pb) * _num(bieglosc) + adv;
}

/** Praca (s. 47): 1 gb × wartość pasywna za 10 h, proporcjonalnie za mniej, w dół. Ponad 10 h nie płaci. */
export function zarobekPracy({ pasywna, godziny }) {
  const h = Math.max(0, Math.min(PRACA.godziny, _num(godziny)));
  return Math.floor(Math.max(0, _num(pasywna)) * h / PRACA.godziny);
}

/** Za garść gambli (s. 74): wynik testu × mnożnik miejsca, w dół (15 na ulicy → 7 gb). */
export function zarobekKoncertu({ wynik, miejsce }) {
  const m = MIEJSCA_KONCERTU[miejsce]?.mnoznik ?? 0;
  return Math.floor(Math.max(0, _num(wynik)) * m);
}

/** Mnożnik Usług speców regionu (D25) — trener i rzemieślnik. */
export function mnoznikUslug(region) {
  const r = REGIONY[region];
  return r ? r.uslugi / 100 : 1;
}

/**
 * Trening/Nauka (s. 47, U31): postęp i koszt doby. 300 h, 1 gb/h × Usługi speców.
 * @returns {{godziny: number, zostalo: number, ukonczony: boolean, koszt: number}}
 */
export function postepTreningu({ dotychczas = 0, godziny = 0, region = null } = {}) {
  const h = Math.max(0, _num(godziny));
  const razem = Math.min(TRENING.godziny, _num(dotychczas) + h);
  const koszt = Math.round(h * TRENING.gbNaGodzine * mnoznikUslug(region) * 100) / 100;
  return { godziny: razem, zostalo: TRENING.godziny - razem, ukonczony: razem >= TRENING.godziny, koszt };
}

/** Budowa bazy (s. 47, U32): 1 gb/h, korzyść ustalona z MG. */
export function postepBudowy({ dotychczas = 0, godziny = 0, wymagane = 0 } = {}) {
  const h = Math.max(0, _num(godziny));
  const cel = Math.max(0, _num(wymagane));
  const razem = cel ? Math.min(cel, _num(dotychczas) + h) : _num(dotychczas) + h;
  return { godziny: razem, zostalo: cel ? cel - razem : null, ukonczona: cel > 0 && razem >= cel, koszt: h * BUDOWA.gbNaGodzine };
}

/** Szukanie towarzysza (U38): godziny do 24, dzielone na doby. */
export function postepSzukania({ dotychczas = 0, godziny = 0, wymagane = SZUKANIE.godziny } = {}) {
  const razem = Math.min(wymagane, _num(dotychczas) + Math.max(0, _num(godziny)));
  return { godziny: razem, zostalo: wymagane - razem, ukonczone: razem >= wymagane };
}

/** Plotkowanie (s. 47, U35): 0 przy porażce; 1 + ⌊(wynik − 10) ÷ 5⌋ przy sukcesie. */
export function liczbaInformacji(wynik) {
  const w = _num(wynik);
  if (w < PLOTKI.st) return 0;
  return 1 + Math.floor((w - PLOTKI.st) / PLOTKI.co);
}

/** Hazard (s. 47, U36): ST 20; sukces — zarobek = stawka, porażka — stawka przepada. */
export function wynikHazardu({ wynik, stawka, st = HAZARD.st }) {
  const s = Math.max(0, _num(stawka));
  const wygrana = _num(wynik) >= st;
  return { wygrana, zarobek: wygrana ? s : 0, strata: wygrana ? 0 : s };
}

/** Rozrywka (s. 47): miasteczko i miasto, ≥ 10 h, ≥ 50 gb. */
export function rozrywkaDajeFuksa({ rodzaj, godziny, gb }) {
  return ["miasteczko", "miasto"].includes(rodzaj) && _num(godziny) >= ROZRYWKA.godziny && _num(gb) >= ROZRYWKA.minGb;
}

/* -------------------------------------------- */
/*  Rachunek                                     */
/* -------------------------------------------- */

/**
 * Saldo rachunku doby (D18, U29). Linia: `{ rodzaj: "koszt"|"zarobek", kwota, opis }`.
 * @returns {{koszty: number, zarobki: number, saldo: number, ujemne: boolean}}
 */
export function saldoRachunku(linie) {
  let koszty = 0;
  let zarobki = 0;
  for (const l of linie ?? []) {
    const k = Math.max(0, _num(l?.kwota));
    if (l?.rodzaj === "zarobek") zarobki += k;
    else if (l?.rodzaj === "koszt") koszty += k;
  }
  const saldo = Math.round((zarobki - koszty) * 100) / 100;
  return { koszty: Math.round(koszty * 100) / 100, zarobki: Math.round(zarobki * 100) / 100, saldo, ujemne: saldo < 0 };
}

/* -------------------------------------------- */
/*  Przeskok narracyjny                          */
/* -------------------------------------------- */

/**
 * Przeskok o `dni` dób (D19, U58): wartości oczekiwane, bez rzutów dzień po dniu.
 * @param {object} o
 * @param {number} o.dni
 * @param {object} o.plan   dzień typowy: `{ sen, utrzymanie, praca: {godziny, pasywna}, trening: {godziny},
 *   budowa: {godziny}, robota: {godziny}, inneKoszty, inneZarobki }`
 * @param {object} o.stan   `{ trening: {godziny}, budowa: {godziny, wymagane}, robota: {zostaloMinut},
 *   wyczerpanie: {zwykle, bezsennosc}, fuksy: [{wygasa}], teraz, bogatyN, region }`
 * @returns {object} zagregowane skutki dla podglądu i jednego zapisu
 */
export function przeskok({ dni, plan = {}, stan = {}, kobalt = false } = {}) {
  const N = Math.max(0, Math.floor(_num(dni)));
  const region = stan.region ?? null;
  const dzien = 86400;

  // Rachunek doby typowej × N.
  const kosztDnia = kosztUtrzymania(plan.utrzymanie) + _num(plan.inneKoszty)
    + postepTreningu({ godziny: plan.trening?.godziny ?? 0, region }).koszt
    + postepBudowy({ godziny: plan.budowa?.godziny ?? 0 }).koszt;
  const zarobekDnia = zarobekPracy({ pasywna: plan.praca?.pasywna ?? 0, godziny: plan.praca?.godziny ?? 0 }) + _num(plan.inneZarobki);
  const koszty = Math.round(kosztDnia * N * 100) / 100;
  const zarobki = Math.round(zarobekDnia * N * 100) / 100;

  // Postępy.
  const trening = postepTreningu({ dotychczas: stan.trening?.godziny ?? 0, godziny: (plan.trening?.godziny ?? 0) * N, region });
  const budowa = postepBudowy({ dotychczas: stan.budowa?.godziny ?? 0, godziny: (plan.budowa?.godziny ?? 0) * N, wymagane: stan.budowa?.wymagane ?? 0 });
  const minutyRoboty = Math.max(0, _num(plan.robota?.godziny)) * 60 * N;
  const zostaloRoboty = stan.robota ? Math.max(0, _num(stan.robota.zostaloMinut) - minutyRoboty) : null;

  // Wyczerpanie: każde DO zdejmuje poziom zwykły; pod Kobaltem Bezsenność schodzi tylko odsypianiem —
  // pierwsze doby po 12 h snu, poziom na dobę (D35). Bez Kobaltu Bezsenność to zwykły poziom.
  const zwykle = Math.max(0, Math.floor(_num(stan.wyczerpanie?.zwykle)));
  const bez = Math.max(0, Math.floor(_num(stan.wyczerpanie?.bezsennosc)));
  const wyczerpanie = kobalt
    ? { zwykleZdjete: Math.min(zwykle, N), bezsennoscZdjeta: Math.min(bez, N), dobOdsypiania: Math.min(bez, N) }
    : { zwykleZdjete: Math.min(zwykle + bez, N), bezsennoscZdjeta: 0, dobOdsypiania: 0 };

  // Fuksy ulotne, które wygasną.
  const koniec = _num(stan.teraz) + N * dzien;
  const fuksyWygasna = (stan.fuksy ?? []).filter(f => f?.wygasa !== null && f?.wygasa !== undefined && f.wygasa <= koniec).length;

  // WKK Bogaty (D38) bez rzutów: pewny Fuks co 10 dób, zostaje na końcu, jeśli wypadł w ostatnich 7 dobach.
  let bogaty = null;
  if (kobalt && plan.utrzymanie === "bogaty") {
    let n = Math.max(0, Math.floor(_num(stan.bogatyN)));
    let ostatni = null;
    let ile = 0;
    for (let d = 1; d <= N; d++) {
      n += 1;
      if (n >= BOGATY_KOBALT.pewnyDnia) { ile++; ostatni = d; n = 0; }
    }
    bogaty = { fuksow: ile, nPo: n, zostaje: ostatni !== null && ostatni > N - BOGATY_KOBALT.terminDni, dzienOstatniego: ostatni };
  }

  return {
    dni: N,
    rachunek: { koszty, zarobki, saldo: Math.round((zarobki - koszty) * 100) / 100, kosztDnia, zarobekDnia },
    trening, budowa,
    robota: { minuty: minutyRoboty, zostalo: zostaloRoboty, ukonczona: zostaloRoboty === 0 },
    wyczerpanie, fuksyWygasna, bogaty,
    sekundy: N * dzien
  };
}
