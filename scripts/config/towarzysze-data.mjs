/**
 * Neuroshima 5e — towarzysze i drony: dane z NOE (PLAN_m3_towarzysze.md §7.2).
 *
 * ⚠ GENEROWANE — nie edytować ręcznie. Źródło: NOE s. 75–76, 83–84, 99–101 → `dev/classes/extract_companions.py`
 * → `dev/classes/companions.json` → `dev/classes/gen_companions.py` (część `npm run build:classes`). Decyzje bez
 * własnego zdania w RAW (rodzaj tury, waga drona złożonego D21, kontrolery D32) — tabele w generatorze.
 *
 * Czysty: bez `game`, bez `CONFIG`.
 *
 * ## Wzory
 *
 * Składnia roll data dnd5e, wytłumaczona z fraz podręcznika ścisłą gramatyką („14 plus twoja Premia
 * Biegłości” → `14 + @wlasciciel.prof`; nieznana fraza = błąd budowy). Te same napisy trafiają do natywnych
 * pól (TT `custom`, premia ataku `flat`), a `config/towarzysze-rules.mjs` liczy je u siebie. Trzy konteksty
 * (U2, D23):
 *   - `@wlasciciel` — migawka właściciela **na żywo**: `prof`, `abilities.<id>.mod`, `poziomKlasy`
 *     (poziom w klasie z flagi towarzysza), `poziom` (postaci);
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

/**
 * Rodzaje towarzyszy. Klucz = `flags.<mod>.towarzysz.rodzaj` (U1). `rozmiar` — klucz rozmiaru dnd5e;
 * `zrodlo` — identyfikator zdolności klasowej; `klasa` — klasa właściciela, od której liczy się poziom.
 */
export const RODZAJE = Object.freeze({
  "zmutowany-owad": Object.freeze({
    nazwa: "Zmutowany owad",
    zrodlo: "oswajanie-zwierzat",
    klasa: "zwiadowca",
    strona: "s. 99",
    typAktora: "npc",
    maszyna: false,
    stopnieZranienia: true,
    rozmiar: "sm",
    tura: "komenda",
    pb: null,
    kw: Object.freeze({ kosc: 6, mnoznik: 0.5 }),
    atak: Object.freeze({ nazwa: "Ukąszenie", obrazenia: "1d4 + 4", typ: "piercing" }),
    wzory: Object.freeze({ tt: "14 + @wlasciciel.prof", pwMaks: "3 + 10 * @wlasciciel.abilities.wis.mod", atak: "4 + @wlasciciel.prof" }),
    udzwig: Object.freeze({ uzytkowy: 16, maksymalny: 32 })
  }),
  "zmutowany-ssak": Object.freeze({
    nazwa: "Zmutowany ssak",
    zrodlo: "oswajanie-zwierzat",
    klasa: "zwiadowca",
    strona: "s. 99",
    typAktora: "npc",
    maszyna: false,
    stopnieZranienia: true,
    rozmiar: "lg",
    tura: "komenda",
    pb: null,
    kw: Object.freeze({ kosc: 10, mnoznik: 0.5 }),
    atak: Object.freeze({ nazwa: "Atak kończyną", obrazenia: "2d6 + 4", typ: "bludgeoning" }),
    wzory: Object.freeze({ tt: "11 + @wlasciciel.prof", pwMaks: "9 + 10 * @wlasciciel.abilities.wis.mod", atak: "4 + @wlasciciel.prof" }),
    udzwig: Object.freeze({ uzytkowy: 180, maksymalny: 360 })
  }),
  "zmutowany-gad": Object.freeze({
    nazwa: "Zmutowany gad",
    zrodlo: "oswajanie-zwierzat",
    klasa: "zwiadowca",
    strona: "s. 100",
    typAktora: "npc",
    maszyna: false,
    stopnieZranienia: true,
    rozmiar: "med",
    tura: "komenda",
    pb: null,
    kw: Object.freeze({ kosc: 8, mnoznik: 0.5 }),
    atak: Object.freeze({ nazwa: "Ugryzienie", obrazenia: "1d6 + 2", typ: "piercing" }),
    wzory: Object.freeze({ tt: "12 + @wlasciciel.prof", pwMaks: "6 + 10 * @wlasciciel.abilities.wis.mod", atak: "2 + @wlasciciel.prof" }),
    udzwig: Object.freeze({ uzytkowy: 70, maksymalny: 140 })
  }),
  "psi-partner": Object.freeze({
    nazwa: "Psi partner",
    zrodlo: "partner",
    klasa: "zwiadowca",
    strona: "s. 100",
    typAktora: "npc",
    maszyna: false,
    stopnieZranienia: true,
    rozmiar: "sm",
    tura: "komenda",
    pb: null,
    kw: Object.freeze({ kosc: 6, mnoznik: 1 }),
    atak: Object.freeze({ nazwa: "Ugryzienie", obrazenia: "1d6 + 2", typ: "piercing" }),
    wzory: Object.freeze({ tt: "12 + @wlasciciel.prof", pwMaks: "10 + 10 * @wlasciciel.abilities.wis.mod", atak: "2 + @wlasciciel.prof" }),
    udzwig: Object.freeze({ uzytkowy: 28, maksymalny: 48 })
  }),
  "ludzki-partner": Object.freeze({
    nazwa: "Ludzki partner",
    zrodlo: "partner",
    klasa: "zwiadowca",
    strona: "s. 101",
    typAktora: "character",
    maszyna: false,
    stopnieZranienia: true,
    rozmiar: "med",
    tura: "komenda",
    pb: 2,
    kw: Object.freeze({ kosc: 6, mnoznik: 1 }),
    wzory: Object.freeze({ pwMaks: "5 * @wlasciciel.poziomKlasy" }),
    cechy: Object.freeze({
      zestaw: Object.freeze([14, 14, 12, 12, 10, 8]),
      punkty: 24
    }),
    rzutyObronne: 2,
    umiejetnosci: 2,
    sztuczki: 1
  }),
  "prawa-reka": Object.freeze({
    nazwa: "Prawa ręka",
    zrodlo: "moja-prawa-reka",
    klasa: "cwaniak",
    strona: "s. 75–76",
    typAktora: "character",
    maszyna: false,
    stopnieZranienia: true,
    rozmiar: "med",
    tura: "pelna",
    pb: 2,
    kw: Object.freeze({ kosc: 6, mnoznik: 1 }),
    wzory: Object.freeze({ pwMaks: "5 * @wlasciciel.poziomKlasy" }),
    cechy: Object.freeze({
      zestaw: Object.freeze([14, 14, 12, 12, 10, 8]),
      punkty: 24
    }),
    rzutyObronne: 2,
    umiejetnosci: 2,
    sztuczki: 1
  }),
  "dron-kroczacy": Object.freeze({
    nazwa: "Dron kroczący",
    zrodlo: "hakerstwo",
    klasa: "spec",
    strona: "s. 83",
    typAktora: "npc",
    maszyna: true,
    stopnieZranienia: false,
    rozmiar: "med",
    tura: "operator",
    pb: null,
    lata: false,
    progi: Object.freeze({ obrazen: 5, awarii: 15 }),
    akumulatorGodzin: 1,
    przepis: "dron-kroczacy",
    zlozony: Object.freeze({ waga: 25, cena: 70 }),
    kw: null,
    wzory: Object.freeze({
      tt: "10 + @tworca.abilities.int.mod + @tworca.prof",
      pwMaks: "10 * @tworca.abilities.int.mod",
      atak: "2 + @tworca.prof + @operator.abilities.dex.mod",
      obrazeniaPremia: "@tworca.abilities.int.mod",
      stObszarowe: "8 + @tworca.prof + @operator.abilities.dex.mod"
    }),
    udzwig: Object.freeze({ uzytkowy: 70, maksymalny: 140 })
  }),
  "dron-latajacy": Object.freeze({
    nazwa: "Dron latający",
    zrodlo: "hakerstwo",
    klasa: "spec",
    strona: "s. 83–84",
    typAktora: "npc",
    maszyna: true,
    stopnieZranienia: false,
    rozmiar: "sm",
    tura: "operator",
    pb: null,
    lata: true,
    progi: Object.freeze({ obrazen: null, awarii: 10 }),
    akumulatorGodzin: 4,
    przepis: "dron-latajacy",
    zlozony: Object.freeze({ waga: 4, cena: 90 }),
    kw: null,
    wzory: Object.freeze({
      tt: "10 + @tworca.abilities.int.mod + @tworca.prof",
      pwMaks: "5 * @tworca.abilities.int.mod",
      atak: "3 + @tworca.prof + @operator.abilities.dex.mod",
      obrazeniaPremia: "@tworca.abilities.int.mod",
      stObszarowe: "8 + @tworca.prof + @operator.abilities.dex.mod"
    }),
    udzwig: Object.freeze({ uzytkowy: 15, maksymalny: 30 })
  })
});

/**
 * Statblocki zwierząt w kształcie wpisu Bestiariusza — szablony paczki `towarzysze` buduje ten sam builder
 * (Współpraca dostaje `packTactics`, F12). Liczby zależne od właściciela policzone dla właściciela z PB +2,
 * MDR +2 i 3. poziomem klasy — to tylko wartości szablonu; na karcie towarzysza liczy je moduł (`wzory`).
 */
export const STATBLOKI = Object.freeze({
  "zmutowany-owad": Object.freeze({
    name: "Zmutowany owad",
    size: "sm",
    creatureType: "zwierze",
    ac: 16,
    initiative: 6,
    hp: Object.freeze({ avg: 23, formula: "1d6" }),
    abilities: Object.freeze({
      str: 8,
      dex: 18,
      con: 14,
      int: 4,
      wis: 16,
      cha: 4
    }),
    skills: Object.freeze({ skr: 6 }),
    saves: Object.freeze({}),
    immunities: Object.freeze(["radiant", "poison"]),
    senses: Object.freeze({ blindsight: 9, passivePerception: 13 }),
    speed: Object.freeze({ walk: 9, climb: 9, burrow: 4.5 }),
    carry: Object.freeze({ normal: 16, max: 32 }),
    features: Object.freeze([
      Object.freeze({
        id: "kopacz",
        name: "Kopacz",
        section: "traits",
        text: "Kiedy zakopuje się w piachu lub w ziemi, nie prowokuje ataków okazyjnych.",
        automation: null
      }),
      Object.freeze({
        id: "pajecza-wspinaczka",
        name: "Pajęcza wspinaczka",
        section: "traits",
        text: "Może chodzić po każdej chropowatej powierzchni, nawet do góry nogami.",
        automation: null
      }),
      Object.freeze({
        id: "udzwig",
        name: "Udźwig",
        section: "traits",
        text: "Użytkowy: 16 kg. Maksymalny: 32 kg.",
        automation: null
      })
    ]),
    attacks: Object.freeze([
      Object.freeze({
        id: "ukaszenie",
        name: "Ukąszenie",
        kind: "mwak",
        reach: 1.5,
        range: null,
        section: "actions",
        bonus: 6,
        damage: Object.freeze({ avg: 6, formula: "1d4 + 4", type: "piercing" }),
        rider: null,
        onHit: null,
        dropsAs: null
      })
    ])
  }),
  "zmutowany-ssak": Object.freeze({
    name: "Zmutowany ssak",
    size: "lg",
    creatureType: "zwierze",
    ac: 13,
    initiative: -1,
    hp: Object.freeze({ avg: 29, formula: "1d10" }),
    abilities: Object.freeze({
      str: 18,
      dex: 12,
      con: 12,
      int: 6,
      wis: 14,
      cha: 4
    }),
    skills: Object.freeze({ atl: 6 }),
    saves: Object.freeze({}),
    immunities: Object.freeze([]),
    senses: Object.freeze({ darkvision: 18, passivePerception: 12 }),
    speed: Object.freeze({ walk: 12, climb: 6 }),
    carry: Object.freeze({ normal: 180, max: 360 }),
    features: Object.freeze([
      Object.freeze({
        id: "doskonale-zmysly",
        name: "Doskonałe zmysły",
        section: "traits",
        text: "Ma Ułatwienie w Testach Mądrości (Percepcja) opartych na węchu i słuchu.",
        automation: null
      }),
      Object.freeze({
        id: "wspolpraca",
        name: "Współpraca",
        section: "traits",
        text: "Jeśli w zasięgu do 1,5 metra od przeciwnika znajduje się przytomny sojusznik, otrzymuje Ułatwienie do Testów Ataku wręcz.",
        automation: Object.freeze({ kind: "packTactics", range: 1.5 })
      }),
      Object.freeze({
        id: "udzwig",
        name: "Udźwig",
        section: "traits",
        text: "Użytkowy: 180 kg. Maksymalny: 360 kg.",
        automation: null
      })
    ]),
    attacks: Object.freeze([
      Object.freeze({
        id: "atak-konczyna",
        name: "Atak kończyną",
        kind: "mwak",
        reach: 1.5,
        range: null,
        section: "actions",
        bonus: 6,
        damage: Object.freeze({ avg: 10, formula: "2d6 + 4", type: "bludgeoning" }),
        rider: "Trafiony cel otrzymuje stan Powalenie, jeśli jest rozmiaru średniego lub mniejszego.",
        onHit: Object.freeze({ condition: "prone", maxSize: "med" }),
        dropsAs: null
      })
    ])
  }),
  "zmutowany-gad": Object.freeze({
    name: "Zmutowany gad",
    size: "med",
    creatureType: "zwierze",
    ac: 14,
    initiative: 2,
    hp: Object.freeze({ avg: 26, formula: "1d8" }),
    abilities: Object.freeze({
      str: 14,
      dex: 14,
      con: 18,
      int: 4,
      wis: 12,
      cha: 4
    }),
    skills: Object.freeze({ prc: 3 }),
    saves: Object.freeze({}),
    immunities: Object.freeze([]),
    senses: Object.freeze({ termowizja: 18, passivePerception: 13 }),
    speed: Object.freeze({ walk: 9, swim: 18 }),
    carry: Object.freeze({ normal: 70, max: 140 }),
    features: Object.freeze([
      Object.freeze({
        id: "ziemnowodny",
        name: "Ziemnowodny",
        section: "traits",
        text: "Potrafi oddychać zarówno na lądzie, jak i pod wodą.",
        automation: null
      }),
      Object.freeze({
        id: "udzwig",
        name: "Udźwig",
        section: "traits",
        text: "Użytkowy: 70 kg. Maksymalny: 140 kg.",
        automation: null
      })
    ]),
    attacks: Object.freeze([
      Object.freeze({
        id: "ugryzienie",
        name: "Ugryzienie",
        kind: "mwak",
        reach: 1.5,
        range: null,
        section: "actions",
        bonus: 4,
        damage: Object.freeze({ avg: 5, formula: "1d6 + 2", type: "piercing" }),
        rider: "Trafiona istota musi zdać RO na Kondycję o ST 10, inaczej zostanie Zatruta na 1 minutę. Cel wykonuje ponowny RO na końcu swojej tury.",
        onHit: null,
        dropsAs: null
      })
    ])
  }),
  "psi-partner": Object.freeze({
    name: "Psi partner",
    size: "sm",
    creatureType: "zwierze",
    ac: 14,
    initiative: 4,
    hp: Object.freeze({ avg: 30, formula: "3d6" }),
    abilities: Object.freeze({
      str: 14,
      dex: 14,
      con: 12,
      int: 8,
      wis: 14,
      cha: 6
    }),
    skills: Object.freeze({ prc: 4, skr: 4 }),
    saves: Object.freeze({ dex: 4, wis: 4 }),
    immunities: Object.freeze([]),
    senses: Object.freeze({ darkvision: 18, passivePerception: 14 }),
    speed: Object.freeze({ walk: 18 }),
    carry: Object.freeze({ normal: 28, max: 48 }),
    features: Object.freeze([
      Object.freeze({
        id: "doskonale-zmysly",
        name: "Doskonałe zmysły",
        section: "traits",
        text: "Pies ma Ułatwienie w Testach Mądrości (Percepcja) opartych na węchu i słuchu.",
        automation: null
      }),
      Object.freeze({
        id: "wspolpraca",
        name: "Współpraca",
        section: "traits",
        text: "Jeśli w zasięgu do 1,5 metra od przeciwnika znajduje się przytomny sojusznik, pies otrzymuje Ułatwienie do Testów Ataku wręcz.",
        automation: Object.freeze({ kind: "packTactics", range: 1.5 })
      }),
      Object.freeze({
        id: "psi-bohater",
        name: "Psi bohater",
        section: "traits",
        text: "Umiera na takich samych zasadach jak BG, czyli stosuje Stopnie Zranienia i wykonuje Rzuty Przeciw Śmierci.",
        automation: null
      }),
      Object.freeze({
        id: "wymagania",
        name: "Wymagania",
        section: "traits",
        text: "Pojenie skażoną wodą i nieodpowiednie karmienie może pogorszyć jego zdrowie.",
        automation: null
      }),
      Object.freeze({
        id: "udzwig",
        name: "Udźwig",
        section: "traits",
        text: "Użytkowy: 28 kg. Maksymalny: 48 kg.",
        automation: null
      })
    ]),
    attacks: Object.freeze([
      Object.freeze({
        id: "ugryzienie",
        name: "Ugryzienie",
        kind: "mwak",
        reach: 1.5,
        range: null,
        section: "actions",
        bonus: 4,
        damage: Object.freeze({ avg: 5, formula: "1d6 + 2", type: "piercing" }),
        rider: "Trafiony cel zostaje Pochwycony, jeśli jest rozmiaru średniego lub mniejszego.",
        onHit: Object.freeze({ condition: "grappled", maxSize: "med" }),
        dropsAs: null
      })
    ])
  }),
  "dron-kroczacy": Object.freeze({
    name: "Dron kroczący",
    size: "med",
    creatureType: "maszyna",
    ac: 15,
    initiative: 0,
    hp: Object.freeze({ avg: 30, formula: "" }),
    abilities: Object.freeze({
      str: 14,
      dex: 14,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10
    }),
    skills: Object.freeze({}),
    saves: Object.freeze({}),
    immunities: Object.freeze(["psychic", "poison"]),
    conditionImmunities: Object.freeze(["frightened", "poisoned", "charmed"]),
    senses: Object.freeze({ darkvision: 18 }),
    speed: Object.freeze({ walk: 9 }),
    carry: Object.freeze({ normal: 70, max: 140 }),
    damageThreshold: 5,
    failureThreshold: 15,
    features: Object.freeze([
      Object.freeze({
        id: "modyfikacje",
        name: "Modyfikacje",
        section: "traits",
        text: "Dron może mieć zainstalowane liczne urządzenia tj. broń, kamery, oświetlenie czy skomplikowane urządzenia elektroniczne. Dokładne modyfikacje oraz ich koszt, należy ustalić z MG.",
        automation: null
      }),
      Object.freeze({
        id: "udzwig",
        name: "Udźwig",
        section: "traits",
        text: "Użytkowy: 70 kg. Maksymalny: 140 kg.",
        automation: null
      }),
      Object.freeze({
        id: "atak",
        name: "Atak",
        section: "actions",
        text: "Dron może wykonać w swojej akcji jeden atak, którego zasięg i obrażenia zależą od zamontowanej broni.",
        automation: null
      })
    ]),
    attacks: Object.freeze([])
  }),
  "dron-latajacy": Object.freeze({
    name: "Dron latający",
    size: "sm",
    creatureType: "maszyna",
    ac: 15,
    initiative: 0,
    hp: Object.freeze({ avg: 15, formula: "" }),
    abilities: Object.freeze({
      str: 10,
      dex: 16,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10
    }),
    skills: Object.freeze({}),
    saves: Object.freeze({}),
    immunities: Object.freeze(["psychic", "poison"]),
    conditionImmunities: Object.freeze(["frightened", "poisoned", "charmed"]),
    senses: Object.freeze({ darkvision: 18 }),
    speed: Object.freeze({ fly: 18 }),
    carry: Object.freeze({ normal: 15, max: 30 }),
    damageThreshold: null,
    failureThreshold: 10,
    features: Object.freeze([
      Object.freeze({
        id: "modyfikacje",
        name: "Modyfikacje",
        section: "traits",
        text: "Dron może mieć zainstalowane liczne urządzenia tj. broń, kamery, oświetlenie czy skomplikowane urządzenia elektroniczne. Dokładne modyfikacje oraz ich koszt, należy ustalić z MG.",
        automation: null
      }),
      Object.freeze({
        id: "udzwig",
        name: "Udźwig",
        section: "traits",
        text: "Użytkowy: 15 kg. Maksymalny: 30 kg.",
        automation: null
      }),
      Object.freeze({
        id: "atak",
        name: "Atak",
        section: "actions",
        text: "Dron może wykonać w swojej akcji jeden atak, którego zasięg i obrażenia zależą od zamontowanej broni.",
        automation: null
      })
    ]),
    attacks: Object.freeze([])
  })
});

/** Zdolności źródłowe (§3.1) → rodzaje i szukanie (§3.5). Szukanie w M3 to tylko podpowiedź (D30). */
export const ZRODLA = Object.freeze({
  partner: Object.freeze({
    nazwa: "Partner",
    klasa: "zwiadowca",
    rodzaje: Object.freeze(["psi-partner", "ludzki-partner"]),
    szukanie: Object.freeze({ godziny: 24, strona: "s. 101" })
  }),
  "oswajanie-zwierzat": Object.freeze({
    nazwa: "Oswajanie zwierząt",
    klasa: "zwiadowca",
    rodzaje: Object.freeze(["zmutowany-owad", "zmutowany-ssak", "zmutowany-gad"]),
    k6: Object.freeze({
      "1": "zmutowany-owad",
      "2": "zmutowany-owad",
      "3": "zmutowany-ssak",
      "4": "zmutowany-ssak",
      "5": "zmutowany-gad",
      "6": "zmutowany-gad"
    }),
    szukanie: Object.freeze({ godziny: 24, dniOswajania: 3, strona: "s. 99" })
  }),
  "moja-prawa-reka": Object.freeze({
    nazwa: "Moja prawa ręka",
    klasa: "cwaniak",
    rodzaje: Object.freeze(["prawa-reka"]),
    szukanie: Object.freeze({ godziny: 24, strona: "s. 75" })
  }),
  hakerstwo: Object.freeze({
    nazwa: "Hakerstwo",
    klasa: "spec",
    rodzaje: Object.freeze(["dron-kroczacy", "dron-latajacy"]),
    szukanie: null
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

/** Agregat prądotwórczy na dronie: litry paliwa na godzinę (s. 83). */
export const AGREGAT_L_NA_H = 0.5;
