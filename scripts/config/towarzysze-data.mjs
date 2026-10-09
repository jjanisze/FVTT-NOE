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

/* -------------------------------------------- */
/*  Statblocki zwierząt — szablony paczki        */
/* -------------------------------------------- */

const _cecha = (id, name, text, automation = null) => Object.freeze({ id, name, section: "traits", text, automation });
const _udzwig = (uzytkowy, maksymalny) => _cecha("udzwig", "Udźwig", `Użytkowy: ${uzytkowy} kg. Maksymalny: ${maksymalny} kg.`);
const DOSKONALE_ZMYSLY = _cecha("doskonale-zmysly", "Doskonałe zmysły",
  "Ma Ułatwienie w Testach Mądrości (Percepcja) opartych na węchu i słuchu.");
const WSPOLPRACA = _cecha("wspolpraca", "Współpraca",
  "Jeśli w zasięgu do 1,5 metra od przeciwnika znajduje się przytomny sojusznik, otrzymuje Ułatwienie do Testów Ataku wręcz.",
  Object.freeze({ kind: "packTactics", range: 1.5 }));

/**
 * Statblocki zwierząt w kształcie wpisu Bestiariusza (`dev/bestiary/bestiary.json`) — szablony paczki
 * `towarzysze` buduje ten sam builder (Współpraca dostaje automatykę `packTactics` za darmo, F12). Liczby
 * zależne od właściciela (TT, PW, atak) policzone dla właściciela z PB +2 i MDR +2 — to tylko wartości
 * szablonu; na karcie towarzysza liczy je moduł (`wzory`). Umiejętności i RO jak w druku (D4).
 */
export const STATBLOKI = Object.freeze({
  "zmutowany-owad": Object.freeze({
    name: "Zmutowany owad", size: "sm", creatureType: "zwierze", ac: 16, initiative: 6,
    hp: Object.freeze({ avg: 23, formula: "1d6" }),
    abilities: Object.freeze({ str: 8, dex: 18, con: 14, int: 4, wis: 16, cha: 4 }),
    skills: Object.freeze({ skr: 6 }), saves: Object.freeze({}),
    immunities: Object.freeze(["radiant", "poison"]),
    senses: Object.freeze({ blindsight: 9, passivePerception: 13 }),
    speed: Object.freeze({ walk: 9, climb: 9, burrow: 4.5 }),
    carry: Object.freeze({ normal: 16, max: 32 }),
    features: Object.freeze([
      _cecha("kopacz", "Kopacz", "Kiedy zakopuje się w piachu lub w ziemi, nie prowokuje ataków okazyjnych."),
      _cecha("pajecza-wspinaczka", "Pajęcza wspinaczka", "Może chodzić po każdej chropowatej powierzchni, nawet do góry nogami."),
      _udzwig(16, 32)
    ]),
    attacks: Object.freeze([Object.freeze({
      id: "ukaszenie", name: "Ukąszenie", kind: "mwak", reach: 1.5, range: null, section: "actions", bonus: 6,
      damage: Object.freeze({ avg: 6, formula: "1d4 + 4", type: "piercing" }), rider: null, onHit: null, dropsAs: null
    })])
  }),
  "zmutowany-ssak": Object.freeze({
    name: "Zmutowany ssak", size: "lg", creatureType: "zwierze", ac: 13, initiative: -1,
    hp: Object.freeze({ avg: 29, formula: "1d10" }),
    abilities: Object.freeze({ str: 18, dex: 12, con: 12, int: 6, wis: 14, cha: 4 }),
    skills: Object.freeze({ atl: 6 }), saves: Object.freeze({}),
    immunities: Object.freeze([]),
    senses: Object.freeze({ darkvision: 18, passivePerception: 12 }),
    speed: Object.freeze({ walk: 12, climb: 6 }),
    carry: Object.freeze({ normal: 180, max: 360 }),
    features: Object.freeze([DOSKONALE_ZMYSLY, WSPOLPRACA, _udzwig(180, 360)]),
    attacks: Object.freeze([Object.freeze({
      id: "atak-konczyna", name: "Atak kończyną", kind: "mwak", reach: 1.5, range: null, section: "actions", bonus: 6,
      damage: Object.freeze({ avg: 10, formula: "2d6 + 4", type: "bludgeoning" }),
      rider: "Trafiony cel otrzymuje stan Powalenie, jeśli jest rozmiaru średniego lub mniejszego.",
      onHit: Object.freeze({ condition: "prone", maxSize: "med" }), dropsAs: null
    })])
  }),
  "zmutowany-gad": Object.freeze({
    name: "Zmutowany gad", size: "med", creatureType: "zwierze", ac: 14, initiative: 2,
    hp: Object.freeze({ avg: 26, formula: "1d8" }),
    abilities: Object.freeze({ str: 14, dex: 14, con: 18, int: 4, wis: 12, cha: 4 }),
    skills: Object.freeze({ prc: 3 }), saves: Object.freeze({}),
    immunities: Object.freeze([]),
    senses: Object.freeze({ termowizja: 18, passivePerception: 13 }),
    speed: Object.freeze({ walk: 9, swim: 18 }),
    carry: Object.freeze({ normal: 70, max: 140 }),
    features: Object.freeze([
      _cecha("ziemnowodny", "Ziemnowodny", "Potrafi oddychać zarówno na lądzie, jak i pod wodą."),
      _udzwig(70, 140)
    ]),
    attacks: Object.freeze([Object.freeze({
      id: "ugryzienie", name: "Ugryzienie", kind: "mwak", reach: 1.5, range: null, section: "actions", bonus: 4,
      damage: Object.freeze({ avg: 5, formula: "1d6 + 2", type: "piercing" }),
      rider: "Trafiona istota musi zdać RO na Kondycję o ST 10, inaczej zostanie Zatruta na 1 minutę. Cel wykonuje ponowny RO na końcu swojej tury.",
      onHit: null, dropsAs: null
    })])
  }),
  "psi-partner": Object.freeze({
    name: "Psi partner", size: "sm", creatureType: "zwierze", ac: 14, initiative: 4,
    hp: Object.freeze({ avg: 30, formula: "3d6" }),
    abilities: Object.freeze({ str: 14, dex: 14, con: 12, int: 8, wis: 14, cha: 6 }),
    skills: Object.freeze({ prc: 4, skr: 4 }), saves: Object.freeze({ dex: 4, wis: 4 }),
    immunities: Object.freeze([]),
    senses: Object.freeze({ darkvision: 18, passivePerception: 14 }),
    speed: Object.freeze({ walk: 18 }),
    carry: Object.freeze({ normal: 28, max: 48 }),
    features: Object.freeze([
      DOSKONALE_ZMYSLY, WSPOLPRACA,
      _cecha("psi-bohater", "Psi bohater", "Umiera na takich samych zasadach jak BG, czyli stosuje Stopnie Zranienia i wykonuje Rzuty Przeciw Śmierci."),
      _cecha("wymagania", "Wymagania", "Pojenie skażoną wodą i nieodpowiednie karmienie może pogorszyć jego zdrowie."),
      _udzwig(28, 48)
    ]),
    attacks: Object.freeze([Object.freeze({
      id: "ugryzienie", name: "Ugryzienie", kind: "mwak", reach: 1.5, range: null, section: "actions", bonus: 4,
      damage: Object.freeze({ avg: 5, formula: "1d6 + 2", type: "piercing" }),
      rider: "Trafiony cel zostaje Pochwycony, jeśli jest rozmiaru średniego lub mniejszego.",
      onHit: Object.freeze({ condition: "grappled", maxSize: "med" }), dropsAs: null
    })])
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
