/**
 * Neuroshima 5e — Sztuczki (feats).
 *
 * 53 entries transcribed from `Tabele/Sztuczki.md`, which stays the source of
 * truth for the prose: `req` and `text` quote that table and must not drift.
 *
 * ## Tracking what is actually automated
 *
 * Almost none of these are wired into the system yet, and a Sztuczka that looks
 * mechanical but silently does nothing is worse than one that plainly says the GM
 * owns it. So every entry declares its coverage:
 *
 *   `auto`   — list of `{ what, where }`: a bit that the code really enforces, and
 *              the module that enforces it. Empty array = nothing is automated.
 *   `manual` — the part that is deliberately left to the table, forever.
 *
 * `sztuczkaStatus()` derives `auto` / `partial` / `none` from those two, the pack
 * builder stamps the verdict into the item description, and
 * `game.neuroshima.sztuczki.report()` prints the whole ledger. Filling this in is
 * meant to be gradual — add an `auto` entry the moment the code lands, and the
 * item text updates on the next pack build.
 *
 * Statistic bumps ("+1 ZRC lub MDR") are NOT counted as automation: dnd5e has no
 * "choose an ability to raise" advancement that fits a feat picked mid-level, so
 * the player edits the score. That is stated once here rather than 30 times.
 */

import { createCoverageLedger } from "./coverage-ledger.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Where a Sztuczka's rules live in the rulebook material. */
export const SZTUCZKI_SOURCE = "Tabele/Sztuczki.md";

/**
 * @typedef {object} SztuczkaAuto
 * @property {string} what   What the system enforces, in one line.
 * @property {string} where  Module that owns it, relative to `scripts/`.
 *
 * @typedef {object} SztuczkaDef
 * @property {string} label
 * @property {string} req                Requirements, verbatim from the table.
 * @property {string} text               Effect summary, verbatim from the table.
 * @property {string} category           SZTUCZKI_CATEGORIES key.
 * @property {boolean} [repeatable]      Can be taken more than once.
 * @property {string[]} [legacyAbilityKeys] `ABILITY_KEYS` satisfied by owning this feat
 *                                       (`actors/abilities.mjs`). One Sztuczka can grant
 *                                       several — `Szybkie palce` covers two.
 * @property {SztuczkaAuto[]} auto       Automated parts (empty = none yet).
 * @property {string} [manual]           What stays the GM's call by design.
 */

export const SZTUCZKI_CATEGORIES = Object.freeze({
  wrecz: "Walka wręcz",
  dystans: "Walka bronią palną / dystansową",
  mobilnosc: "Mobilność / Defensywa",
  pojazdy: "Pojazdy",
  produkcja: "Produkcja / Wiedza / Umiejętności",
  wsparcie: "Wsparcie / Społeczne",
  granaty: "Granaty / Materiały",
  rozwoj: "Rozwój Cech / Pancerze / Szkolenie",
  rekonesans: "Rekonesans / Specjalne"
});

/** @type {Readonly<Record<string, SztuczkaDef>>} */
export const SZTUCZKI = Object.freeze({
  aramis: {
    label: "Aramis",
    req: "ZRC 15+ lub SIŁ 15+",
    text: "+1 SIŁ lub ZRC; Wytrącenie w Akcji Bonusowej; Utrudnienie dla celu przy Rozbrajaniu.",
    category: "rekonesans",
    auto: [{
      what: "Wytrącenie jako manewr (RO Siła/Zręczność celu przeciw ST 8 + mod. + PB, wypadnięcie "
        + "przedmiotu z ręki); posiadanie Aramisa domyślnie zaznacza Utrudnienie w RO celu.",
      where: "combat/melee-maneuvers.mjs"
    }],
    manual: "Wykonanie Wytrącenia w Akcji Bonusowej zamiast Akcji — moduł nie liczy ekonomii akcji."
  },
  aspirynaIMietusy: {
    label: "Aspiryna i Miętusy",
    req: "Biegłość: Medycyna + Oszustwo",
    text: "+1 INT lub CHA; leczenie narzędziami małego medyka nawet bez zapasów (z Utrudnieniem).",
    category: "produkcja",
    auto: [{
      what: "Leczenie pustym zestawem medyka: checkbox w oknie rzutu, brak zużycia zapasu, "
        + "Utrudnienie domyślnie zaznaczone gdy zestaw jest pusty.",
      where: "items/toolkit-medyk.mjs"
    }]
  },
  barbarka: {
    label: "Barbarka",
    req: "SIŁ 15+",
    text: "Atak głową 1k4; atak głową w głowę w Akcji Bonusowej (trafienie krytyczne); "
      + "możliwość Powalenia przy ataku głową.",
    category: "wrecz",
    auto: []
  },
  bezTrzymanki: {
    label: "Bez trzymanki",
    req: "ZRC 15+, biegłość Pojazdy",
    text: "+1 ZRC lub MDR; kierowanie jednośladem bez rąk (z Utrudnieniem MDR).",
    category: "pojazdy",
    auto: []
  },
  benzynaZamiastKrwi: {
    label: "Benzyna zamiast krwi",
    req: "MDR 13+, biegłość Pojazdy",
    text: "TT pojazdu +MDR; możliwość przyjęcia ataku w pojazd w Reakcji; "
      + "pojazd korzysta z Unikania / Odstąpienia jak kierowca.",
    category: "pojazdy",
    auto: []
  },
  ciszejNizCien: {
    label: "Ciszej niż cień",
    req: "ZRC 15+, biegłość Skradanie się",
    text: "+1 ZRC; przeciwnicy mają Utrudnienie w Testach Percepcji dotyczących wykrycia obecności.",
    category: "mobilnosc",
    auto: [],
    manual: "Utrudnienie dotyczy Testów przeciwnika, a nie posiadacza Sztuczki — "
      + "system nie wie, który Test Percepcji szuka akurat tej postaci."
  },
  czlowiekPajak: {
    label: "Człowiek-pająk",
    req: "Biegłość: Atletyka",
    text: "+1 SIŁ lub ZRC; Szybkość wspinaczki = Szybkość (wolne ręce / zestaw wspinaczkowy); "
      + "pochylony teren nie jest trudnym terenem; Ułatwienie w RO przy upadku.",
    category: "mobilnosc",
    auto: []
  },
  cwiczenieCzyniMistrza: {
    label: "Ćwiczenie czyni mistrza",
    req: "Brak",
    text: "+1 do dwóch Cech Bazowych lub +2 do jednej (max 20). Można wybierać wielokrotnie.",
    category: "rozwoj",
    repeatable: true,
    auto: []
  },
  fabrykator: {
    label: "Fabrykator",
    req: "INT 18+, biegłość w 3 zestawach narzędzi",
    text: "+1 INT lub ZRC; produkcja przedmiotów 50% szybciej (mnóstwo narzędzi).",
    category: "produkcja",
    auto: []
  },
  fachowiec: {
    label: "Fachowiec",
    req: "INT 11+",
    text: "+1 dowolna Cecha; biegłość w 2 wybranych zestawach narzędzi.",
    category: "produkcja",
    auto: []
  },
  gradOlowiu: {
    label: "Grad ołowiu",
    req: "ZRC 15+, SIŁ 15+",
    text: "Strzelanie krótką serią (KS) staje się częścią akcji Atakowania — "
      + "tyle KS ile ataków w turze.",
    category: "dystans",
    legacyAbilityKeys: ["gradOlowiu"],
    auto: [{
      what: "Zdjęcie blokady „jedna KS na rundę” — kolejna krótka seria w tej samej rundzie "
        + "przechodzi, z komunikatem wyjątku reguły.",
      where: "weapons/fire-modes.mjs"
    }],
    manual: "Limit ataków w turze — karta go nie śledzi, pilnuje gracz lub MG."
  },
  grenadier: {
    label: "Grenadier",
    req: "Brak",
    text: "+1 SIŁ; Stalowe jaja [R] — podbiegnięcie do granatu (4,5 m) i rzut w Reakcji "
      + "bez ataków okazyjnych; dwukrotny zasięg rzutu granatem.",
    category: "granaty",
    auto: []
  },
  gunfight: {
    label: "Gunfight",
    req: "ZRC 17+",
    text: "+1 ZRC; brak Utrudnienia do Testów Ataku bronią palną od wrogów w zasięgu do 1,5 m.",
    category: "dystans",
    auto: []
  },
  immunitet: {
    label: "Immunitet",
    req: "KON 13+, biegłość Medycyna",
    text: "+1 KON; nigdy nie złapiesz nowej choroby; Ułatwienie w RO przeciw chorobom już posiadanym.",
    category: "wsparcie",
    auto: []
  },
  jestZajebiscie: {
    label: "Jest zajebiście",
    req: "CHA 15+, biegłość Oszustwo",
    text: "Zajebista gadka [A] — sporny Test CHA (Oszustwo) vs. Intuicja drużyny; "
      + "ci, którzy polegli, dostają Ułatwienie w najbliższym teście.",
    category: "wsparcie",
    auto: []
  },
  karateka: {
    label: "Karateka",
    req: "Brak",
    text: "Ataki ręką/nogą 1k6 (SIŁ lub ZRC); Szybki cios [B] — jeden atak wręcz w Akcji Bonusowej.",
    category: "wrecz",
    auto: []
  },
  kuloodpornosc: {
    label: "Kuloodporność",
    req: "ZRC 15+, CHA/MDR/INT 15+, brak pancerza",
    text: "Bez pancerza: TT + Premia Biegłości.",
    category: "mobilnosc",
    auto: []
  },
  lawnik: {
    label: "Ławnik",
    req: "SIŁ 17+",
    text: "+1 SIŁ lub KON; biegłość broń improwizowana (ciężkie 10 kg+ → 3k4 obrażeń obuchowych); "
      + "Ułatwienie przy ataku ciężkim przedmiotem; możliwość Powalenia.",
    category: "wrecz",
    auto: []
  },
  miotacz: {
    label: "Miotacz",
    req: "SIŁ 15+, biegłość broń miotana",
    text: "Zasięg broni rzucanej ×2; +2 do Testów Ataku bronią rzucaną.",
    category: "granaty",
    auto: []
  },
  mistrzBroniBialej: {
    label: "Mistrz broni białej",
    req: "INT 13+, ZRC 15+",
    text: "+1 INT lub ZRC; Fechmistrz — wybrana broń biała zadaje dodatkową kostkę obrażeń "
      + "(zmiana po Długim Odpoczynku z treningiem).",
    category: "wrecz",
    auto: []
  },
  mistrzWalkiWrecz: {
    label: "Mistrz walki wręcz",
    req: "Brak",
    text: "Manewry [B] — Odepchnięcie / Odstąpienie / Wytrącenie w Akcji Bonusowej; "
      + "Parowanie [R] — TT +1k4 przeciw jednemu atakowi wręcz.",
    category: "wrecz",
    auto: []
  },
  muzyk: {
    label: "Muzyk",
    req: "CHA 13+",
    text: "+1 CHA; biegłość w 2 instrumentach; Pieśń otuchy (1×/Długi Odpoczynek) — "
      + "Fuks dla tylu sojuszników co modyfikator CHA.",
    category: "wsparcie",
    auto: []
  },
  neo: {
    label: "Neo",
    req: "INT 15+, ZRC 15+",
    text: "Bullet time [R] — gdy zostaniesz trafiony, możesz w Reakcji podnieść swoją TT "
      + "o 5 wobec tego ataku.",
    category: "mobilnosc",
    auto: []
  },
  nozownik: {
    label: "Nożownik",
    req: "ZRC 17+",
    text: "Nożownik [B] — po trafieniu nożem w turze, w Akcji Bonusowej drugi atak nożem; "
      + "jeśli trafisz, zadajesz obrażenia krytyczne.",
    category: "wrecz",
    auto: []
  },
  padnijPowstan: {
    label: "Padnij/Powstań",
    req: "ZRC 15+, KON 13+",
    text: "Wstawanie nie kosztuje Szybkości; Szybkość +3 m; "
      + "wyjście z zasięgu ataku wręcz bez ataków okazyjnych.",
    category: "mobilnosc",
    auto: []
  },
  pakowanie: {
    label: "Pakowanie",
    req: "INT lub MDR 13+",
    text: "+1 MDR lub INT; wyciągnięcie dowolnego przedmiotu z plecaka jako Darmowa Interakcja; "
      + "Udźwig ×2.",
    category: "rekonesans",
    auto: []
  },
  pancerny: {
    label: "Pancerny",
    req: "SIŁ 13+, wyszkolenie w ciężkich pancerzach",
    text: "W ciężkim pancerzu: Próg obrażeń 10 przeciwko obrażeniom ciętym, kłutym i obuchowym "
      + "(sumuje się z progiem pancerza).",
    category: "rozwoj",
    auto: []
  },
  panPlaster: {
    label: "Pan Plaster",
    req: "Biegłość: Medycyna",
    text: "+1 MDR lub INT; narzędzia małego medyka rzucają dodatkową kostkę PW; "
      + "połowa dawki leku zaspokaja dzienne zapotrzebowanie.",
    category: "produkcja",
    auto: [{
      what: "Dodatkowa kostka PW przy leczeniu zestawem małego medyka.",
      where: "items/toolkit-medyk.mjs"
    }],
    manual: "„Połowa dawki leku zaspokaja dzienne zapotrzebowanie” nie jest wpięta w licznik "
      + "dawek chorób przewlekłych — zapas zużywa się normalnie."
  },
  patriota: {
    label: "Patriota",
    req: "Brak",
    text: "+1 dowolna Cecha; dodatkowa zdolność z listy zdolności swojego Pochodzenia.",
    category: "rozwoj",
    auto: []
  },
  pewnaReka: {
    label: "Pewna ręka",
    req: "ZRC 17+",
    text: "+1 ZRC; Pewny strzał [B] — Szybkość spada do 0, ale Ułatwienie do 1 ataku dystansowego "
      + "(nie przy seriach); brak Utrudnienia za niestabilne podłoże.",
    category: "dystans",
    auto: []
  },
  pierwotnyInstynkt: {
    label: "Pierwotny instynkt",
    req: "ZRC 15+, MDR 15+, biegłość Percepcja",
    text: "+5 do Inicjatywy; +5 do Testów Percepcji.",
    category: "rekonesans",
    auto: []
  },
  plugAndPlay: {
    label: "Plug & Play",
    req: "Biegłość: Technika + narzędzia małego hakera",
    text: "Ułatwienie przy przejmowaniu paneli sterowania urządzeń elektronicznych; "
      + "możliwość sterowania ciężkimi maszynami / wozami bojowymi laptopem.",
    category: "wsparcie",
    auto: []
  },
  przycelowanie: {
    label: "Przycelowanie",
    req: "ZRC 15+",
    text: "+1 ZRC; Celuję w… [B] — wycelowanie w konkretną kończynę lub element; "
      + "TT wzrasta, ale trafienie daje efekt wg tabeli Przycelowania.",
    category: "rekonesans",
    auto: []
  },
  przydasie: {
    label: "Przydasie",
    req: "MDR 13+, biegłość Percepcja",
    text: "+1 INT lub MDR; surowce potrzebne do produkcji własnoręcznie wykonywanych "
      + "przedmiotów tańsze o 50%.",
    category: "produkcja",
    auto: []
  },
  pulpFiction: {
    label: "Pulp Fiction",
    req: "ZRC 15+",
    text: "+1 ZRC; brak Utrudnienia przy strzelaniu pistoletem / PM jedną ręką; "
      + "każda broń palna krótka zyskuje właściwość lekka.",
    category: "dystans",
    auto: []
  },
  robinHood: {
    label: "Robin Hood",
    req: "ZRC 15+, biegłość broń miotana",
    text: "Stalowe palce [I] — ładowanie broni miotanej w Darmowej Interakcji; "
      + "Celowanie [B] — Ułatwienie do ataku z łuku / kuszy po Akcji Bonusowej.",
    category: "dystans",
    auto: []
  },
  rodeo: {
    label: "Rodeo",
    req: "MDR 13+, biegłość Tresura",
    text: "+1 MDR; ujeżdżanie dzikich zwierząt (Test MDR Tresura ST 10 + mod. SIŁ istoty); "
      + "Kawalerzysta — TT wierzchowca + Premia Biegłości.",
    category: "pojazdy",
    auto: []
  },
  rozroba: {
    label: "Rozróba",
    req: "SIŁ 17+",
    text: "+1 SIŁ lub KON; Młynek [B] — gdy co najmniej 3 wrogów jest w zasięgu 1,5 m, "
      + "w Akcji Bonusowej jeden atak wręcz bronią białą przeciw każdemu z nich.",
    category: "wrecz",
    auto: []
  },
  ruchomeGniazdoCkm: {
    label: "Ruchome gniazdo CKM",
    req: "SIŁ 15+, KON 15+, biegłość broń palna pośrednia/ciężka",
    text: "Chmura ołowiu — długa seria (DS) pakuje 2× więcej pocisków "
      + "(podwójne kostki obrażeń wobec celów w polu rażenia).",
    category: "dystans",
    legacyAbilityKeys: ["ruchomeGniazdoCkm"],
    auto: [{
      what: "Podwojenie zużycia amunicji i liczby kości obrażeń długiej serii.",
      where: "weapons/fire-modes.mjs"
    }]
  },
  samuraj: {
    label: "Samuraj",
    req: "ZRC 13+",
    text: "+1 SIŁ lub ZRC; +1 do Testów Ataku i obrażeń bronią sieczną; wyciągnięcie finezyjnej "
      + "broni siecznej bez Darmowej Interakcji; TT +1 z taką bronią w ręku.",
    category: "wrecz",
    auto: []
  },
  siekierezada: {
    label: "Siekierezada",
    req: "SIŁ 13+",
    text: "+1 SIŁ lub ZRC; wyciągnięcie 2 siekierek jednocześnie w 1 Darmowej Interakcji; "
      + "zasięg rzutu siekierkami ×2; TT +1 przy walce dwiema siekierkami.",
    category: "wrecz",
    auto: []
  },
  snajper: {
    label: "Snajper",
    req: "ZRC 17+, MDR 15+",
    text: "+1 ZRC lub MDR; brak Utrudnienia za daleki dystans; "
      + "zasięg daleki broni dystansowej ×2.",
    category: "dystans",
    auto: []
  },
  szachista: {
    label: "Szachista",
    req: "INT 15+",
    text: "Roszada — podczas Unikania: TT +3 i brak ataków okazyjnych do początku następnej tury.",
    category: "mobilnosc",
    auto: []
  },
  szkolenieWBroni: {
    label: "Szkolenie w broni",
    req: "Brak",
    text: "+1 SIŁ lub ZRC; biegłość w jednej wybranej kategorii broni.",
    category: "rozwoj",
    auto: []
  },
  szkolenieWCiezkimPancerzu: {
    label: "Szkolenie w ciężkim pancerzu",
    req: "SIŁ 13+, wyszkolenie w średnim pancerzu",
    text: "+1 SIŁ lub KON; wyszkolenie w ciężkich pancerzach.",
    category: "rozwoj",
    auto: []
  },
  szkolenieWSrednimPancerzu: {
    label: "Szkolenie w średnim pancerzu",
    req: "SIŁ 10+, wyszkolenie w lekkim pancerzu",
    text: "+1 SIŁ lub KON; wyszkolenie w średnich pancerzach.",
    category: "rozwoj",
    auto: []
  },
  szturmowiec: {
    label: "Szturmowiec",
    req: "ZRC 15+, SIŁ 15+",
    text: "Strzelanie krótkimi seriami (KS) w normalnym zasięgu bez Utrudnienia.",
    category: "dystans",
    legacyAbilityKeys: ["szturmowiec"],
    auto: [{
      what: "Krótka seria domyślnie nie ustawia Utrudnienia w oknie rzutu ataku.",
      where: "weapons/fire-modes.mjs"
    }],
    manual: "Warunek „w normalnym zasięgu” — MG może ręcznie przywrócić Utrudnienie w dialogu."
  },
  szybkiBill: {
    label: "Szybki Bill",
    req: "ZRC 15+, KON 17+",
    text: "+1 ZRC lub KON; biegłość w Inicjatywie (+PB do Inicjatywy); "
      + "Długie susy [B] — Bieganie w Akcji Bonusowej.",
    category: "mobilnosc",
    auto: []
  },
  szybkiePalce: {
    label: "Szybkie palce",
    req: "ZRC 15+",
    text: "+1 ZRC; Szybka wymiana [B] — zmiana magazynka lub szybkoładowacza w Akcji Bonusowej; "
      + "Szybkie przeładowanie [B] — ignorowanie właściwości przeładowanie "
      + "(albo 1 nabój rewolweru / karabinu w Akcji Bonusowej).",
    category: "dystans",
    legacyAbilityKeys: ["szybkaWymiana", "szybkiePrzeladowanie"],
    auto: [{
      what: "Szybka wymiana — wymiana magazynka / szybkoładowacza w Akcji Bonusowej.",
      where: "weapons/magazine.mjs"
    }, {
      what: "Szybkie przeładowanie — pominięcie właściwości przeładowanie i doładowanie "
        + "pojedynczego naboju w Akcji Bonusowej.",
      where: "weapons/magazine.mjs"
    }]
  },
  uczSieUcz: {
    label: "Ucz się, ucz",
    req: "INT 10+",
    text: "+1 dowolna Cecha; biegłość w 2 wybranych umiejętnościach.",
    category: "produkcja",
    auto: []
  },
  ukrytyCel: {
    label: "Ukryty cel",
    req: "MDR 15+, biegłość Percepcja",
    text: "Ignorujesz osłonę ½ i ¾ celu; ignorujesz Utrudnienie z akcji Unikanie.",
    category: "rekonesans",
    auto: []
  },
  wrestler: {
    label: "Wrestler",
    req: "SIŁ 15+",
    text: "+1 SIŁ; Ułatwienie do Testów Ataku wobec Pochwyconego; Duszenie (zamiast ataku — "
      + "1 + mod. SIŁ obrażeń obuchowych); Rzut na matę (Pochwycony duży lub mniejszy, "
      + "z Utrudnieniem → Powalenie).",
    category: "wrecz",
    auto: []
  },
  zlomiarz: {
    label: "Złomiarz",
    req: "INT 13+, biegłość Śledztwo",
    text: "+1 INT lub MDR; Ułatwienie w Testach Śledztwa przy wycenianiu przedmiotów; "
      + "Ułatwienie w Testach MDR/INT podczas szabrowania.",
    category: "produkcja",
    auto: []
  }
});

/* -------------------------------------------- */
/*  Coverage                                     */
/* -------------------------------------------- */

const LEDGER = createCoverageLedger({
  entries: SZTUCZKI,
  cssPrefix: "neuro-sztuczka",
  noneHtml: "<strong>Bez automatyki.</strong> Efekt rozstrzyga MG przy stole.",
  title: "Sztuczki"
});

/**
 * How much of one Sztuczka the system really enforces.
 * @param {string} key
 * @returns {"auto"|"partial"|"none"}
 */
export const sztuczkaStatus = LEDGER.status;

/** Human-readable badge appended to the item description by the pack builder. */
export const sztuczkaCoverageHtml = LEDGER.html;

/**
 * The whole ledger, for `game.neuroshima.sztuczki.report()`.
 * @returns {{auto: string[], partial: string[], none: string[]}}
 */
export const sztuczkiCoverage = LEDGER.coverage;

/** Print the ledger to console — which Sztuczki still need code. */
export const reportSztuczki = LEDGER.report;

/* -------------------------------------------- */
/*  Item data                                    */
/* -------------------------------------------- */

/** @returns {SztuczkaDef|null} */
export function getSztuczka(key) {
  return key ? (SZTUCZKI[key] ?? null) : null;
}

/**
 * Build the `feat` item data for one Sztuczka.
 *
 * These are descriptive items: no activities, because nothing here has a single
 * "press this" moment that would survive being guessed at. The mechanical bits
 * that ARE automated live in their own modules and key off the feat's name (see
 * `items/toolkit-medyk.mjs`), so the label must match the table exactly.
 *
 * @param {string} key
 * @param {object} [options]
 * @param {string} [options._id]
 * @returns {object} Item creation data.
 */
export function sztuczkaItemData(key, { _id } = {}) {
  const def = SZTUCZKI[key];
  if (!def) throw new Error(`Unknown sztuczka "${key}"`);

  const data = {
    name: def.label,
    type: "feat",
    img: "icons/svg/upgrade.svg",
    system: {
      description: {
        value: `<p>${def.text}</p>${sztuczkaCoverageHtml(key)}`,
        chat: ""
      },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      type: { value: "feat", subtype: "" },
      requirements: def.req === "Brak" ? "" : def.req,
      properties: [],
      prerequisites: { repeatable: def.repeatable === true },
      uses: { max: "", spent: 0, recovery: [] },
      activities: {}
    },
    flags: {
      [MODULE_ID]: {
        sztuczka: key,
        category: def.category,
        coverage: sztuczkaStatus(key)
      }
    }
  };

  if (_id) data._id = _id;
  return data;
}

/** Public API, exposed on `game.neuroshima.sztuczki`. */
export const sztuczkiApi = {
  all: SZTUCZKI,
  get: getSztuczka,
  status: sztuczkaStatus,
  coverage: sztuczkiCoverage,
  report: reportSztuczki
};
