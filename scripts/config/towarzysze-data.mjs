/**
 * Neuroshima 5e — towarzysze i drony: dane z NOE (PLAN_m3_towarzysze.md §7.2).
 *
 * **Do E6 pisane ręcznie** z NOE s. 75–76 (Prawa ręka), 83–84 (drony), 99–101 (zwierzęta, Partner).
 * Od E6 plik generuje potok klas (`dev/classes/companions.json` → `npm run build:classes`); generator
 * ma odtworzyć ten kształt, a paczka Quench `towarzysze` pilnuje liczb z RAW (statblocki przy PB 2/3/4,
 * MDR +1…+4, wzory dronów przy INT +2…+5) — niezależnie od tego, kto plik napisał.
 *
 * Czysty: bez `game`, bez `CONFIG`.
 *
 * ## Wzory
 *
 * Składnia roll data dnd5e — te same napisy trafiają do natywnych pól (TT `custom`, premia ataku
 * `flat`), a `config/towarzysze-rules.mjs` liczy je u siebie ścisłą gramatyką (liczby, `@ścieżka`,
 * `+ - * /`, nawiasy, `floor/ceil/min/max`). Trzy konteksty (U2, D23):
 *   - `@wlasciciel` — migawka właściciela **na żywo**: `prof`, `abilities.<id>.mod`, `poziomKlasy`
 *     (poziom w klasie z flagi towarzysza: `zwiadowca`, `cwaniak`, `spec`), `poziom` (postaci);
 *   - `@tworca` — stempel twórcy drona z chwili budowy: `prof`, `abilities.int.mod`;
 *   - `@operator` — migawka operatora drona na żywo: `prof`, `abilities.<id>.mod`.
 *
 * Statblocki zwierząt drukują umiejętności i RO policzone przy PB +2 — z PB właściciela rosną tylko
 * TT i atak, bo tylko one piszą „plus twoja Premia Biegłości” (D4).
 */

/** Rodzaj tury z §3.3: komenda (zatrzask, D2), pełna kontrola (Prawa ręka), tura operatora (dron, D35). */
export const TURY = Object.freeze({
  komenda: "komenda",
  pelna: "pelna",
  operator: "operator"
});

const _zwierze = (o) => Object.freeze({
  typAktora: "npc",
  maszyna: false,
  stopnieZranienia: true, // STOPIEŃ ZRANIENIA O O O O — s. 205 (D3)
  pb: null,               // PB z SP szablonu, nie rośnie z właścicielem (D4)
  ...o
});

const _ludzki = (o) => Object.freeze({
  typAktora: "character",
  maszyna: false,
  stopnieZranienia: true,
  rozmiar: "med",
  pb: 2, // „Premia Biegłości: +2 (nie rośnie)” — efekt U3
  kw: Object.freeze({ kosc: 6, mnoznik: 1 }),
  wzory: Object.freeze({ pwMaks: "5 * @wlasciciel.poziomKlasy" }),
  cechy: Object.freeze({ zestaw: Object.freeze([14, 14, 12, 12, 10, 8]), punkty: 24 }),
  rzutyObronne: 2,
  umiejetnosci: 2, // „dwóch umiejętnościach lub zestawach narzędzi”
  sztuczki: 1,
  ...o
});

const _dron = (o) => Object.freeze({
  typAktora: "npc",
  maszyna: true,
  stopnieZranienia: false, // „Maszyny nie otrzymują Stopni Zranienia” — s. 205, 214
  pb: null,
  kw: null,
  zrodlo: "hakerstwo",
  klasa: "spec",
  strona: "s. 83–84",
  tura: TURY.operator,
  ...o
});

/**
 * Rodzaje towarzyszy. Klucz = `flags.<mod>.towarzysz.rodzaj` (U1).
 * `rozmiar` — klucz rozmiaru dnd5e; `zrodlo` — identyfikator zdolności klasowej; `klasa` — klasa
 * właściciela, od której liczy się poziom.
 */
export const RODZAJE = Object.freeze({
  "zmutowany-owad": _zwierze({
    nazwa: "Zmutowany owad", zrodlo: "oswajanie-zwierzat", klasa: "zwiadowca", strona: "s. 99",
    rozmiar: "sm", tura: TURY.komenda,
    wzory: Object.freeze({ tt: "14 + @wlasciciel.prof", pwMaks: "3 + 10 * @wlasciciel.abilities.wis.mod", atak: "4 + @wlasciciel.prof" }),
    kw: Object.freeze({ kosc: 6, mnoznik: 0.5 }),
    atak: Object.freeze({ nazwa: "Ukąszenie", obrazenia: "1d4 + 4", typ: "piercing" }),
    udzwig: Object.freeze({ uzytkowy: 16, maksymalny: 32 })
  }),
  "zmutowany-ssak": _zwierze({
    nazwa: "Zmutowany ssak", zrodlo: "oswajanie-zwierzat", klasa: "zwiadowca", strona: "s. 99",
    rozmiar: "lg", tura: TURY.komenda,
    wzory: Object.freeze({ tt: "11 + @wlasciciel.prof", pwMaks: "9 + 10 * @wlasciciel.abilities.wis.mod", atak: "4 + @wlasciciel.prof" }),
    kw: Object.freeze({ kosc: 10, mnoznik: 0.5 }),
    atak: Object.freeze({ nazwa: "Atak kończyną", obrazenia: "2d6 + 4", typ: "bludgeoning" }),
    udzwig: Object.freeze({ uzytkowy: 180, maksymalny: 360 })
  }),
  "zmutowany-gad": _zwierze({
    nazwa: "Zmutowany gad", zrodlo: "oswajanie-zwierzat", klasa: "zwiadowca", strona: "s. 100",
    rozmiar: "med", tura: TURY.komenda,
    wzory: Object.freeze({ tt: "12 + @wlasciciel.prof", pwMaks: "6 + 10 * @wlasciciel.abilities.wis.mod", atak: "2 + @wlasciciel.prof" }),
    kw: Object.freeze({ kosc: 8, mnoznik: 0.5 }),
    atak: Object.freeze({ nazwa: "Ugryzienie", obrazenia: "1d6 + 2", typ: "piercing" }),
    udzwig: Object.freeze({ uzytkowy: 70, maksymalny: 140 })
  }),
  "psi-partner": _zwierze({
    nazwa: "Psi partner", zrodlo: "partner", klasa: "zwiadowca", strona: "s. 100",
    rozmiar: "sm", tura: TURY.komenda,
    wzory: Object.freeze({ tt: "12 + @wlasciciel.prof", pwMaks: "10 + 10 * @wlasciciel.abilities.wis.mod", atak: "2 + @wlasciciel.prof" }),
    kw: Object.freeze({ kosc: 6, mnoznik: 1 }),
    atak: Object.freeze({ nazwa: "Ugryzienie", obrazenia: "1d6 + 2", typ: "piercing" }),
    udzwig: Object.freeze({ uzytkowy: 28, maksymalny: 48 })
  }),
  "ludzki-partner": _ludzki({
    nazwa: "Ludzki partner", zrodlo: "partner", klasa: "zwiadowca", strona: "s. 101", tura: TURY.komenda
  }),
  "prawa-reka": _ludzki({
    nazwa: "Prawa ręka", zrodlo: "moja-prawa-reka", klasa: "cwaniak", strona: "s. 75–76", tura: TURY.pelna
  }),
  "dron-kroczacy": _dron({
    nazwa: "Dron kroczący", rozmiar: "med", lata: false,
    wzory: Object.freeze({
      tt: "10 + @tworca.abilities.int.mod + @tworca.prof",
      pwMaks: "10 * @tworca.abilities.int.mod",
      atak: "2 + @tworca.prof + @operator.abilities.dex.mod",
      obrazeniaPremia: "@tworca.abilities.int.mod",
      stObszarowe: "8 + @tworca.prof + @operator.abilities.dex.mod"
    }),
    progi: Object.freeze({ obrazen: 5, awarii: 15 }),
    akumulatorGodzin: 1, // „1 godzinę pracy średniego drona”
    przepis: "dron-kroczacy",
    zlozony: Object.freeze({ waga: 25, cena: 70 }), // D21 (RAI): cena z czasu produkcji, s. 145
    udzwig: Object.freeze({ uzytkowy: 70, maksymalny: 140 })
  }),
  "dron-latajacy": _dron({
    nazwa: "Dron latający", rozmiar: "sm", lata: true,
    wzory: Object.freeze({
      tt: "10 + @tworca.abilities.int.mod + @tworca.prof",
      pwMaks: "5 * @tworca.abilities.int.mod",
      atak: "3 + @tworca.prof + @operator.abilities.dex.mod",
      obrazeniaPremia: "@tworca.abilities.int.mod",
      stObszarowe: "8 + @tworca.prof + @operator.abilities.dex.mod"
    }),
    progi: Object.freeze({ obrazen: null, awarii: 10 }),
    akumulatorGodzin: 4,
    przepis: "dron-latajacy",
    zlozony: Object.freeze({ waga: 4, cena: 90 }),
    udzwig: Object.freeze({ uzytkowy: 15, maksymalny: 30 })
  })
});

/**
 * Zdolności źródłowe (§3.1) → rodzaje i szukanie (§3.5). Szukanie w M3 to tylko podpowiedź (D30).
 * `k6` — losowanie zwierzęcia przy Oswajaniu.
 */
export const ZRODLA = Object.freeze({
  "partner": Object.freeze({
    nazwa: "Partner", klasa: "zwiadowca", rodzaje: Object.freeze(["psi-partner", "ludzki-partner"]),
    szukanie: Object.freeze({ godziny: 24, strona: "s. 101" })
  }),
  "oswajanie-zwierzat": Object.freeze({
    nazwa: "Oswajanie zwierząt", klasa: "zwiadowca",
    rodzaje: Object.freeze(["zmutowany-owad", "zmutowany-ssak", "zmutowany-gad"]),
    k6: Object.freeze({ 1: "zmutowany-owad", 2: "zmutowany-owad", 3: "zmutowany-ssak", 4: "zmutowany-ssak", 5: "zmutowany-gad", 6: "zmutowany-gad" }),
    szukanie: Object.freeze({ godziny: 24, dniOswajania: 3, strona: "s. 99" })
  }),
  "moja-prawa-reka": Object.freeze({
    nazwa: "Moja prawa ręka", klasa: "cwaniak", rodzaje: Object.freeze(["prawa-reka"]),
    szukanie: Object.freeze({ godziny: 24, strona: "s. 75" })
  }),
  "hakerstwo": Object.freeze({
    nazwa: "Hakerstwo", klasa: "spec", rodzaje: Object.freeze(["dron-kroczacy", "dron-latajacy"]),
    szukanie: null // drony się buduje (Robota), nie szuka
  })
});

/**
 * Kontrolery zdalnego sterowania (D32, U17): zasięg na otwartej przestrzeni i przez ściany / pod ziemią.
 * Fabryczny — Sprzęt, s. 130–131; domowy — schemat Hakera, s. 83 (20 m przez ściany: odczyt MG).
 */
export const KONTROLERY = Object.freeze({
  fabryczny: Object.freeze({ nazwa: "Kontroler zdalnego sterowania", zasieg: 300, zasiegPrzeszkody: 50, strona: "s. 130–131" }),
  domowy: Object.freeze({ nazwa: "Kontroler zdalnego sterowania (domowej roboty)", zasieg: 100, zasiegPrzeszkody: 20, strona: "s. 83" })
});

/** Agregat prądotwórczy na dronie: 0,5 l paliwa na godzinę (s. 83). */
export const AGREGAT_L_NA_H = 0.5;
