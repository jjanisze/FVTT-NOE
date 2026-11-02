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
 * Statistic bumps ("+1 ZRC lub MDR") — `cechy`, from the "Rozwój Cechy" line of the October rulebook (s. 102–108):
 * an ability list (one of them +1; one entry = fixed), `"dowolna"`, or `{ punkty, cap }` (Ćwiczenie czyni mistrza).
 * The pack builder turns it into an `AbilityScoreImprovement` advancement at level 0 on the feat — dnd5e runs it in
 * the same advancement flow that picked the Sztuczka (PLAN_m7 E0 spike a, the 2024 feat pattern) — and the coverage
 * badge counts it as automation (PLAN_m7 E3, D8). Until 2026-10-31 the player edited the score by hand.
 */

import { createCoverageLedger } from "./coverage-ledger.mjs";
import { change, CHANGE_TYPE } from "./effect-changes.mjs";
import { KATEGORIE_BRONI } from "./classes-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Pule biegłości (kształt `PROFESSIONS[].bieglosci`): siedem kategorii broni z tabel, zestawy narzędzi. */
const BRON = KATEGORIE_BRONI.map(k => `weapon:${k}`);
const ZESTAW = "tool:tool:*";

/** Approved native art; rule IDs retain their original spelling. */
const SZTUCZKA_ICONS = Object.freeze({
  "aramis": "aramis.svg",
  "aspirynaIMietusy": "aspiryna-i-mietusy.svg",
  "barbarka": "barbarka.svg",
  "benzynaZamiastKrwi": "benzyna-zamiast-krwi.svg",
  "bezTrzymanki": "bez-trzymanki.svg",
  "ciszejNizCien": "ciszej-niz-cien.svg",
  "cwiczenieCzyniMistrza": "cwiczenie-czyni-mistrza.svg",
  "czlowiekPajak": "czlowiek-pajak.svg",
  "fabrykator": "fabrykator.svg",
  "fachowiec": "fachowiec.svg",
  "gradOlowiu": "grad-olowiu.svg",
  "grenadier": "grenadier.svg",
  "gunfight": "gunfight.svg",
  "immunitet": "immunitet.svg",
  "jestZajebiscie": "jest-zajebiscie.svg",
  "karateka": "karateka.svg",
  "kuloodpornosc": "kuloodpornosc.svg",
  "lawnik": "lawnik.svg",
  "miotacz": "miotacz.svg",
  "mistrzBroniBialej": "mistrz-broni-bialej.svg",
  "mistrzWalkiWrecz": "mistrz-walki-wrecz.svg",
  "muzyk": "muzyk.svg",
  "neo": "neo.svg",
  "nozownik": "nozownik.svg",
  "padnijPowstan": "padnij-powstan.svg",
  "pakowanie": "pakowanie.svg",
  "panPlaster": "pan-plaster.svg",
  "pancerny": "pancerny.svg",
  "patriota": "patriota.svg",
  "pewnaReka": "pewna-reka.svg",
  "pierwotnyInstynkt": "pierwotny-instynkt.svg",
  "plugAndPlay": "plug-and-play.svg",
  "przycelowanie": "przycelowanie.svg",
  "przydasie": "przydasie.svg",
  "pulpFiction": "pulp-fiction.svg",
  "robinHood": "robin-hood.svg",
  "rodeo": "rodeo.svg",
  "rozroba": "rozroba.svg",
  "ruchomeGniazdoCkm": "ruchome-gniazdo-ckm.svg",
  "samuraj": "samuraj.svg",
  "siekierezada": "siekierezada.svg",
  "snajper": "snajper.svg",
  "szachista": "szachista.svg",
  "szkolenieWBroni": "szkolenie-w-broni.svg",
  "szkolenieWCiezkimPancerzu": "szkolenie-w-ciezkim-pancerzu.svg",
  "szkolenieWSrednimPancerzu": "szkolenie-w-srednim-pancerzu.svg",
  "szturmowiec": "szturmowiec.svg",
  "szybkiBill": "szybki-bill.svg",
  "szybkiePalce": "szybkie-palce.svg",
  "uczSieUcz": "ucz-sie-ucz.svg",
  "ukrytyCel": "ukryty-cel.svg",
  "wrestler": "wrestler.svg",
  "zlomiarz": "zlomiarz.svg"
});

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
 * @property {object[]} [bieglosci]       Proficiency groups → level-0 `Trait` advancements (shape of
 *                                       `PROFESSIONS[].bieglosci`; builder: `dev/packs/build-packs.mjs`).
 * @property {{name: string, zmiany: object[]}[]} [efekty] Transfer Active Effects on the feat (shape of
 *                                       `EFEKTY` in `zdolnosci-efekty.mjs`).
 * @property {boolean} [tylkoCechy]      The Sztuczka is nothing but its Rozwój Cechy — the only one whose ASI
 *                                       alone earns the „pełne” badge (`validate-packs` checks the rest).
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
    cechy: ["str", "dex"],
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
    cechy: ["int", "cha"],
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
    aktywnosci: [
      { id: "glowa", typ: "attack", nazwa: "Atak głową", aktywacja: "action", kosc: 4, cechy: ["str"], flagi: { atakGlowa: true } },
      { id: "z-baski", typ: "attack", nazwa: "Z baśki", aktywacja: "bonus", kosc: 4, cechy: ["str"],
        flagi: { atakGlowa: true, autoKrytyk: "Z baśki — trafienie krytyczne" } }
    ],
    auto: [
      { what: "Atak głową 1k4 obuch. + SIŁ — aktywność na Sztuczce.", where: "config/sztuczki-ataki.mjs" },
      { what: "Z baśki [B] — atak głową w Akcji Bonusowej; trafienie = obrażenia krytyczne (bez dublowania przy 20).", where: "combat/sztuczki-ataki.mjs" },
      { what: "Wyjaśnić ci? — przycisk pod trafieniem głową (cel twojego rozmiaru albo mniejszy): RO SIŁ ST 8 + PB + SIŁ celu przez MG, porażka — Powalenie.", where: "combat/sztuczki-ataki.mjs" }
    ],
    manual: "Czy cel ma głowę (Z baśki) — MG."
  },
  bezTrzymanki: {
    label: "Bez trzymanki",
    cechy: ["dex", "wis"],
    req: "ZRC 15+, biegłość Pojazdy",
    text: "+1 ZRC lub MDR; kierowanie jednośladem bez rąk (z Utrudnieniem MDR).",
    category: "pojazdy",
    auto: [],
    manual: "Kierowanie jednośladem bez rąk (Test z Utrudnieniem MDR) — rozstrzyga MG."
  },
  benzynaZamiastKrwi: {
    label: "Benzyna zamiast krwi",
    req: "MDR 13+, biegłość Pojazdy",
    text: "TT pojazdu +MDR; możliwość przyjęcia ataku w pojazd w Reakcji; "
      + "pojazd korzysta z Unikania / Odstąpienia jak kierowca.",
    category: "pojazdy",
    auto: [
      { what: "Grigorij — TT prowadzonego pojazdu + mod. MDR kierowcy w werdykcie ataku.", where: "combat/sztuczki-ataki.mjs" },
      { what: "Slalom — Unikanie kierowcy daje pojazdowi Utrudnienie atakujących (silnik okoliczności).", where: "combat/sztuczki-ataki.mjs" }
    ],
    manual: "Lepiej we mnie [R] (przyjęcie ataku w pojazd, gdy kierowca nie siedzi w środku) — przenosi MG; Odstąpienie "
      + "pojazdu — moduł nie liczy ataków okazyjnych (M8)."
  },
  ciszejNizCien: {
    label: "Ciszej niż cień",
    cechy: ["dex"],
    req: "ZRC 15+, biegłość Skradanie się",
    text: "+1 ZRC; przeciwnicy mają Utrudnienie w Testach Percepcji dotyczących wykrycia obecności.",
    category: "mobilnosc",
    auto: [{
      what: "Podpowiedź Utrudnienia w Percepcji BN, gdy na jego scenie ukrywa się postać z tą Sztuczką (Ukrywanie się, Niewidoczność).",
      where: "combat/ulatwienia-testow.mjs"
    }],
    manual: "Czy Test Percepcji szuka akurat tej postaci — MG zaznacza Utrudnienie w oknie rzutu."
  },
  czlowiekPajak: {
    label: "Człowiek-pająk",
    cechy: ["str", "dex"],
    req: "Biegłość: Atletyka",
    text: "+1 SIŁ lub ZRC; Szybkość wspinaczki = Szybkość (wolne ręce / zestaw wspinaczkowy); "
      + "pochylony teren nie jest trudnym terenem; Ułatwienie w RO przy upadku.",
    category: "mobilnosc",
    efekty: [{ name: "Człowiek-pająk — wspinaczka", zmiany: [change("system.attributes.movement.speeds.climb", CHANGE_TYPE.upgrade, "@attributes.movement.speeds.walk")] }],
    auto: [{ what: "Szybkość wspinaczki = Szybkość — Efekt Aktywny na Sztuczce.", where: "config/sztuczki-data.mjs" }],
    manual: "Warunek „wolne ręce albo zestaw wspinaczkowy”, pochylony teren bez trudnego terenu i Ułatwienie w RO przy "
      + "upadku — MG."
  },
  cwiczenieCzyniMistrza: {
    label: "Ćwiczenie czyni mistrza",
    cechy: { punkty: 2, cap: 2 },
    req: "Brak",
    text: "+1 do dwóch Cech Bazowych lub +2 do jednej (max 20). Można wybierać wielokrotnie.",
    category: "rozwoj",
    repeatable: true,
    tylkoCechy: true,
    auto: []
  },
  fabrykator: {
    label: "Fabrykator",
    cechy: ["dex", "int"],
    req: "INT 18+, biegłość w 3 zestawach narzędzi",
    text: "+1 INT lub ZRC; produkcja przedmiotów 50% szybciej (mnóstwo narzędzi).",
    category: "produkcja",
    legacyAbilityKeys: ["fabrykator"],
    auto: [{
      what: "Produkcja: czas pracy ×0,5 przy każdej pracy nad Robotą i w Szybkiej produkcji "
        + "(nie przy naprawie — D34).",
      where: "production/wykonawca.mjs"
    }]
  },
  fachowiec: {
    label: "Fachowiec",
    cechy: "dowolna",
    req: "INT 11+",
    text: "+1 dowolna Cecha; biegłość w 2 wybranych zestawach narzędzi.",
    category: "produkcja",
    bieglosci: [{ wybory: [{ ile: 2, pula: [ZESTAW] }], tryb: "default", tytul: "Zestawy narzędzi" }],
    auto: [{ what: "Biegłość w 2 zestawach narzędzi — awans przy wzięciu Sztuczki.", where: "actors/bieglosci.mjs" }]
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
    cechy: ["str"],
    req: "Brak",
    text: "+1 SIŁ; Stalowe jaja [R] — podbiegnięcie do granatu (4,5 m) i rzut w Reakcji "
      + "bez ataków okazyjnych; dwukrotny zasięg rzutu granatem.",
    category: "granaty",
    auto: [],
    manual: "Stalowe jaja [R] (podbiegnięcie do granatu i rzut w Reakcji) i dwukrotny zasięg rzutu granatem — MG."
  },
  gunfight: {
    label: "Gunfight",
    cechy: ["dex"],
    req: "ZRC 17+",
    text: "+1 ZRC; brak Utrudnienia do Testów Ataku bronią palną od wrogów w zasięgu do 1,5 m.",
    category: "dystans",
    legacyAbilityKeys: ["gunfight"],
    auto: [{
      what: "Bez Utrudnienia „atak dystansowy w zwarciu” przy ataku bronią palną (silnik okoliczności ataku).",
      where: "config/okolicznosci-ataku.mjs"
    }]
  },
  immunitet: {
    label: "Immunitet",
    cechy: ["con"],
    req: "KON 13+, biegłość Medycyna",
    text: "+1 KON; nigdy nie złapiesz nowej choroby; Ułatwienie w RO przeciw chorobom już posiadanym.",
    category: "wsparcie",
    auto: [{
      what: "Ułatwienie w RO, których źródłem jest choroba — wiersz rejestru ułatwień w oknie rzutu.",
      where: "combat/ulatwienia-testow.mjs"
    }],
    manual: "„Nigdy nie złapiesz nowej choroby” — MG nie nakłada nowych chorób; moduł nie blokuje zarażenia."
  },
  jestZajebiscie: {
    label: "Jest zajebiście",
    req: "CHA 15+, biegłość Oszustwo",
    text: "Zajebista gadka [A] — sporny Test CHA (Oszustwo) vs. Intuicja drużyny; "
      + "ci, którzy polegli, dostają Ułatwienie w najbliższym teście.",
    category: "wsparcie",
    aktywnosci: [{ id: "gadka", typ: "utility", nazwa: "Zajebista gadka", aktywacja: "action" }],
    auto: [
      { what: "Zajebista gadka [A] — test Oszustwa i karta z przyciskiem Intuicji dla drużyny; niższy wynik (remis — bez zmian) "
        + "daje Ułatwienie w najbliższym Teście Cechy, Ataku albo RO, zdejmowane po rzucie.", where: "combat/sztuczki-ataki.mjs" }
    ]
  },
  karateka: {
    label: "Karateka",
    req: "Brak",
    text: "Ataki ręką/nogą 1k6 (SIŁ lub ZRC); Szybki cios [B] — jeden atak wręcz w Akcji Bonusowej.",
    category: "wrecz",
    aktywnosci: [
      { id: "piesci", typ: "attack", nazwa: "Stalowe pięści", aktywacja: "action", kosc: 6, cechy: ["str", "dex"] },
      { id: "szybki-cios", typ: "attack", nazwa: "Szybki cios", aktywacja: "bonus", kosc: 6, cechy: ["str", "dex"] }
    ],
    auto: [
      { what: "Stalowe pięści 1k6 obuch. — aktywność na Sztuczce; SIŁ albo ZRC (wyższa domyślnie, wybór w oknie ataku).", where: "combat/sztuczki-ataki.mjs" },
      { what: "Szybki cios [B] — ten sam atak w Akcji Bonusowej (znacznik B).", where: "config/sztuczki-ataki.mjs" }
    ]
  },
  kuloodpornosc: {
    label: "Kuloodporność",
    req: "ZRC 15+, CHA/MDR/INT 15+, brak pancerza",
    text: "Bez pancerza: TT + Premia Biegłości.",
    category: "mobilnosc",
    legacyAbilityKeys: ["kuloodpornosc"],
    auto: [{
      what: "TT + Premia Biegłości bez pancerza (także ochraniaczy), hełmu i tarczy (silnik TT, powód nieaktywności w dymku TT).",
      where: "config/tt-rules.mjs"
    }]
  },
  lawnik: {
    label: "Ławnik",
    // Bez Rozwoju Cechy: „+1 SIŁ lub KON” z tabeli kampanii usunięto z podręcznika (MG, PLAN_m7 D15).
    req: "SIŁ 17+",
    text: "Biegłość broń improwizowana (ciężkie 10 kg+ → 3k4 obrażeń obuchowych); "
      + "Ułatwienie przy ataku ciężkim przedmiotem; możliwość Powalenia.",
    category: "wrecz",
    bieglosci: [{ nadania: ["weapon:improwizowana"], tryb: "default", tytul: "Broń improwizowana" }],
    auto: [{ what: "Biegłość w broni improwizowanej — awans przy wzięciu Sztuczki.", where: "actors/bieglosci.mjs" }],
    manual: "Ciężki przedmiot 10 kg+ (3k4 obrażeń obuchowych), Ułatwienie przy ataku nim i Powalenie — MG."
  },
  miotacz: {
    label: "Miotacz",
    req: "SIŁ 15+, biegłość broń miotana",
    text: "Zasięg broni rzucanej ×2; +2 do Testów Ataku bronią rzucaną.",
    category: "granaty",
    auto: [
      { what: "Zasięg normalny i daleki broni rzucanej ×2 w silniku okoliczności ataku (zasięg daleki, poza zasięgiem).", where: "config/okolicznosci-ataku.mjs" },
      { what: "+2 do Testu Ataku bronią rzucaną — część rzutu z plakietką.", where: "combat/zdolnosci-walka.mjs" }
    ]
  },
  mistrzBroniBialej: {
    label: "Mistrz broni białej",
    cechy: ["dex", "int"],
    req: "INT 13+, ZRC 15+",
    text: "+1 INT lub ZRC; Fechmistrz — wybrana broń biała zadaje dodatkową kostkę obrażeń "
      + "(zmiana po Długim Odpoczynku z treningiem).",
    category: "wrecz",
    auto: [],
    manual: "Fechmistrz — dodatkowa kość obrażeń wybraną bronią białą i jej zmiana po Długim odpoczynku: "
      + "gracz dorzuca kość, wybór pilnuje MG."
  },
  mistrzWalkiWrecz: {
    label: "Mistrz walki wręcz",
    req: "Brak",
    text: "Manewry [B] — Odepchnięcie / Odstąpienie / Wytrącenie w Akcji Bonusowej; "
      + "Parowanie [R] — TT +1k4 przeciw jednemu atakowi wręcz.",
    category: "wrecz",
    legacyAbilityKeys: ["mistrzWalkiWrecz"],
    auto: [{
      what: "Parowanie [R] — TT +1k4 wobec jednego ataku wręcz, w oknie „Reakcje celu” na karcie ataku (rzut u gracza).",
      where: "combat/obrona.mjs"
    }],
    manual: "Manewry w Akcji Bonusowej — przyciski manewrów jak zwykle, koszt Akcji Bonusowej pilnuje gracz."
  },
  muzyk: {
    label: "Muzyk",
    cechy: ["cha"],
    req: "CHA 13+",
    text: "+1 CHA; biegłość w 2 instrumentach; Pieśń otuchy (1×/Długi Odpoczynek) — "
      + "Fuks dla 1 + mod. CHA sojuszników.",
    category: "wsparcie",
    // Two instruments, chosen in dnd5e's advancement window when the Sztuczka lands (PLAN_m6 §5.1).
    bieglosci: [{ wybory: [{ ile: 2, pula: ["tool:music:*"] }], tryb: "default", tytul: "Instrumenty" }],
    auto: [{
      what: "Pieśń otuchy — aktywność na Sztuczce, 1×/Długi odpoczynek: wybór 1 + mod. CHA sojuszników, każdy dostaje "
        + "Fuksa (u cudzych postaci przez przekaźnik MG).",
      where: "actors/fuksy.mjs"
    }, {
      what: "Biegłość w 2 instrumentach — awans przy wzięciu Sztuczki (wybór z kategorii „Instrumenty muzyczne”; "
        + "awans buduje `dev/packs/build-packs.mjs`).",
      where: "actors/bieglosci.mjs"
    }]
  },
  neo: {
    label: "Neo",
    req: "INT 15+, ZRC 15+",
    text: "Bullet time [R] — gdy zostaniesz trafiony, możesz w Reakcji podnieść swoją TT "
      + "o 5 wobec tego ataku.",
    category: "mobilnosc",
    legacyAbilityKeys: ["neo"],
    auto: [{
      what: "Bullet time [R] — TT +5 wobec trafiającego ataku, w oknie „Reakcje celu” (wyszarzone, gdy nic nie zmieni).",
      where: "combat/obrona.mjs"
    }]
  },
  nozownik: {
    label: "Nożownik",
    req: "ZRC 17+",
    text: "Nożownik [B] — po trafieniu nożem w turze, w Akcji Bonusowej drugi atak nożem; "
      + "jeśli trafisz, zadajesz obrażenia krytyczne.",
    category: "wrecz",
    auto: [{
      what: "Przycisk Nożownik [B] pod trafieniem nożem w swojej turze (Nóż taktyczny, Kamienny nóż, Nóż do rzucania, Sztylet — "
        + "D19): drugi atak tym nożem w ten cel, trafienie = obrażenia krytyczne.", where: "combat/sztuczki-ataki.mjs"
    }]
  },
  padnijPowstan: {
    label: "Padnij/Powstań",
    req: "ZRC 15+, KON 13+",
    text: "Wstawanie nie kosztuje Szybkości; Szybkość +3 m; "
      + "wyjście z zasięgu ataku wręcz bez ataków okazyjnych.",
    category: "mobilnosc",
    efekty: [{ name: "Padnij/Powstań — Szybkonogi", zmiany: [change("system.attributes.movement.speeds.walk", CHANGE_TYPE.add, 3)] }],
    auto: [{ what: "Szybkość +3 m — Efekt Aktywny na Sztuczce.", where: "config/sztuczki-data.mjs" }],
    manual: "Wstawanie bez kosztu Szybkości i wyjście z zasięgu bez ataków okazyjnych — moduł nie liczy ruchu w turze "
      + "(M8)."
  },
  pakowanie: {
    label: "Pakowanie",
    cechy: ["int", "wis"],
    req: "INT lub MDR 13+",
    text: "+1 MDR lub INT; wyciągnięcie dowolnego przedmiotu z plecaka jako Darmowa Interakcja; "
      + "Udźwig ×2.",
    category: "rekonesans",
    // Tylko klauzula „Bez dna" ma legacy-klucz — to jedyna część automatyzowana (zob. `auto`
    // poniżej). „Mam pod ręką [I]" to osobno nazwana klauzula tej samej Sztuczki (znaleziona
    // żywcem jako WŁASNY bare-name feat, dokładnie jak Bez Dna) — bez mechaniki, patrz `manual`.
    legacyAbilityKeys: ["bezDna", "mamPodReka"],
    auto: [{
      what: "Bez dna: Udźwig użytkowy i maksymalny ×2 — Active Effect na "
        + "system.attributes.encumbrance.multipliers.overall, dopinany/odpinany automatycznie "
        + "zależnie od posiadania Sztuczki. Plakietka w widoku Ekwipunku.",
      where: "actors/bez-dna.mjs"
    }, {
      what: "Mam pod ręką: Oporządzenie pokazuje wyciągnięcie z plecaka jako [I] na linii ruchu w walce.",
      where: "actors/doll.mjs"
    }],
    manual: "„Mam pod ręką [I]” jest tylko nazwane na linii ruchu Oporządzenia — ekonomii akcji moduł nie liczy "
      + "(PLAN_paper_doll D7)."
  },
  pancerny: {
    label: "Pancerny",
    req: "SIŁ 13+, wyszkolenie w ciężkich pancerzach",
    text: "W ciężkim pancerzu: Próg obrażeń 10 przeciwko obrażeniom ciętym, kłutym i obuchowym "
      + "(sumuje się z progiem pancerza).",
    category: "rozwoj",
    auto: [{ what: "Próg obrażeń +10 (cięte, kłute, obuchowe) w ciężkim pancerzu, dodany do progu pancerza.", where: "actors/armor-rules.mjs" }]
  },
  panPlaster: {
    label: "Pan Plaster",
    cechy: ["int", "wis"],
    req: "Biegłość: Medycyna",
    text: "+1 MDR lub INT; narzędzia małego medyka rzucają dodatkową kostkę PW; "
      + "połowa dawki leku zaspokaja dzienne zapotrzebowanie.",
    category: "produkcja",
    auto: [{
      what: "Dodatkowa kostka PW przy leczeniu zestawem małego medyka.",
      where: "items/toolkit-medyk.mjs"
    }, {
      what: "Pół dawki leku na chorobę: podając lek innej postaci (Podaj na liście Leków, pacjent przyjmuje) i biorąc "
        + "własną dawkę (Weź dawkę) — napoczęta połowa zapamiętana na opakowaniu (D18).",
      where: "actors/podaj-dawke.mjs"
    }]
  },
  patriota: {
    label: "Patriota",
    cechy: "dowolna",
    req: "Brak",
    text: "+1 dowolna Cecha; dodatkowa zdolność z listy zdolności swojego Pochodzenia.",
    category: "rozwoj",
    auto: [{
      what: "Dodatkowa zdolność Pochodzenia — awans przy wzięciu Sztuczki (wybór z puli zdolności Pochodzeń).",
      where: "config/sztuczki-data.mjs"
    }],
    manual: "Awans nie zawęża puli do Pochodzenia postaci — wybór sprawdza MG."
  },
  pewnaReka: {
    label: "Pewna ręka",
    cechy: ["dex"],
    req: "ZRC 17+",
    text: "+1 ZRC; Pewny strzał [B] — Szybkość spada do 0, ale Ułatwienie do 1 ataku dystansowego "
      + "(nie przy seriach); brak Utrudnienia za niestabilne podłoże.",
    category: "dystans",
    auto: [],
    manual: "Pewny strzał [B] (Szybkość 0, Ułatwienie do jednego ataku dystansowego, nie przy seriach) i brak "
      + "Utrudnienia za niestabilne podłoże — gracz zaznacza w oknie rzutu, MG pilnuje."
  },
  pierwotnyInstynkt: {
    label: "Pierwotny instynkt",
    req: "ZRC 15+, MDR 15+, biegłość Percepcja",
    text: "+5 do Inicjatywy; +5 do Testów Percepcji.",
    category: "rekonesans",
    // Percepcja: reguła dnd5e 6 na rzucie (jak Szary) — dnd5e wlicza ją też do biernej Percepcji.
    efekty: [{
      name: "Pierwotny instynkt",
      zmiany: [
        change("system.attributes.init.bonus", CHANGE_TYPE.add, 5),
        { key: "check", type: "dnd5e.bonus", value: "5", conditions: [{ k: "roll.skill", v: "prc" }] }
      ]
    }],
    auto: [{ what: "+5 do Inicjatywy, +5 do Testów Percepcji (także biernej) — Efekt Aktywny na Sztuczce.", where: "config/sztuczki-data.mjs" }]
  },
  plugAndPlay: {
    label: "Plug & Play",
    req: "Biegłość: Technika + narzędzia małego hakera",
    text: "Ułatwienie przy przejmowaniu paneli sterowania urządzeń elektronicznych; "
      + "możliwość sterowania ciężkimi maszynami / wozami bojowymi laptopem.",
    category: "wsparcie",
    auto: [{ what: "Hakowanie — podpowiedź Ułatwienia w Teście INT (także Technika, narzędzia hakera) w oknie rzutu.", where: "config/zdolnosci-efekty.mjs" }],
    manual: "Czy test to przejęcie panelu urządzenia — MG zaznacza. Konsolka (kierowanie ciężką maszyną laptopem, narzędzia "
      + "hakera zamiast Pojazdów) — MG."
  },
  przycelowanie: {
    label: "Przycelowanie",
    cechy: ["dex"],
    req: "ZRC 15+",
    text: "+1 ZRC; Celuję w… [B] — wycelowanie w konkretną kończynę lub element; "
      + "TT wzrasta, ale trafienie daje efekt wg tabeli Przycelowania.",
    category: "rekonesans",
    auto: [{
      what: "„Celuję w…” w oknie ataku: TT celu + premia części, głowa — automatyczne TK; przycisk skutku pod trafieniem "
        + "(wytrącenie, Powalenie, opona, tętnica / hydraulika); element maszyny — także pojazd.",
      where: "combat/przycelowanie.mjs"
    }]
  },
  przydasie: {
    label: "Przydasie",
    cechy: ["int", "wis"],
    req: "MDR 13+, biegłość Percepcja",
    text: "+1 INT lub MDR; surowce potrzebne do produkcji własnoręcznie wykonywanych "
      + "przedmiotów tańsze o 50%.",
    category: "produkcja",
    legacyAbilityKeys: ["przydasie"],
    auto: [{
      what: "Produkcja: surowce ×0,5 (w górę) przy starcie Roboty i w Szybkiej produkcji; czas bez zmian.",
      where: "production/wykonawca.mjs"
    }]
  },
  pulpFiction: {
    label: "Pulp Fiction",
    cechy: ["dex"],
    req: "ZRC 15+",
    text: "+1 ZRC; brak Utrudnienia przy strzelaniu pistoletem / PM jedną ręką; "
      + "każda broń palna krótka zyskuje właściwość lekka.",
    category: "dystans",
    legacyAbilityKeys: ["pulpFiction"],
    auto: [{
      what: "Strzał z pistoletu / PM jedną ręką bez domyślnego Utrudnienia; broń palna krótka liczy się "
        + "jako lekka przy ataku drugą ręką (Oporządzenie).",
      where: "combat/grip.mjs"
    }]
  },
  robinHood: {
    label: "Robin Hood",
    req: "ZRC 15+, biegłość broń miotana",
    text: "Stalowe palce [I] — ładowanie broni miotanej w Darmowej Interakcji; "
      + "Celowanie [B] — Ułatwienie do ataku z łuku / kuszy po Akcji Bonusowej.",
    category: "dystans",
    aktywnosci: [{ id: "celowanie", typ: "utility", nazwa: "Celowanie", aktywacja: "bonus" }],
    auto: [
      { what: "Stalowe palce — broń miotana z właściwością ładowanie gotowa po strzale bez osobnej czynności.", where: "weapons/magazine.mjs" },
      { what: "Celowanie [B] — aktywność na Sztuczce przy jednym celu: najbliższy atak z łuku albo kuszy w ten cel z Ułatwieniem.", where: "combat/sztuczki-ataki.mjs" }
    ]
  },
  rodeo: {
    label: "Rodeo",
    cechy: ["wis"],
    req: "MDR 13+, biegłość Tresura",
    text: "+1 MDR; ujeżdżanie dzikich zwierząt (Test MDR Tresura ST 10 + mod. SIŁ istoty); "
      + "Kawalerzysta — TT wierzchowca + Premia Biegłości.",
    category: "pojazdy",
    auto: [
      { what: "Ujeżdżanie z HUD-u istoty: Test MDR (Tresura) ST 10 + mod. SIŁ; sukces — wierzchowiec słucha tego jeźdźca.", where: "pojazdy/jezdziec.mjs" },
      { what: "Kawalerzysta: TT wierzchowca + Premia Biegłości, póki jeździec siedzi w siodle.", where: "pojazdy/jezdziec.mjs" }
    ]
  },
  rozroba: {
    label: "Rozróba",
    cechy: ["str", "con"],
    req: "SIŁ 17+",
    text: "+1 SIŁ lub KON; Młynek [B] — gdy co najmniej 3 wrogów jest w zasięgu 1,5 m, "
      + "w Akcji Bonusowej jeden atak wręcz bronią białą przeciw każdemu z nich.",
    category: "wrecz",
    auto: [],
    manual: "Młynek [B] — atak wręcz przeciw każdemu z co najmniej 3 wrogów w zasięgu 1,5 m: gracz atakuje "
      + "po kolei, warunek pilnuje MG."
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
    cechy: ["str", "dex"],
    req: "ZRC 13+",
    text: "+1 SIŁ lub ZRC; +1 do Testów Ataku i obrażeń bronią zadającą obrażenia cięte; dobycie "
      + "finezyjnej broni białej zadającej obrażenia cięte bez Darmowej Interakcji; TT +1, gdy dzierżysz "
      + "finezyjną broń białą zadającą obrażenia cięte.",
    category: "wrecz",
    // „Zadającą obrażenia cięte" = wśród typów obrażeń jest `slashing` — czyli także
    // broń mieszana (Nóż taktyczny: kłute+cięte), zgodnie z literalnym brzmieniem.
    legacyAbilityKeys: ["samuraj"],
    auto: [
      {
        what: "+1 do Testów Ataku bronią zadającą obrażenia cięte — hak `dnd5e.preRollAttack`.",
        where: "actors/samuraj.mjs"
      },
      {
        what: "+1 do obrażeń bronią zadającą obrażenia cięte — hak `dnd5e.preRollDamage`.",
        where: "actors/samuraj.mjs"
      },
      {
        what: "Zasłona — TT +1, gdy finezyjna broń biała zadająca obrażenia cięte jest w ręce (Oporządzenie); "
          + "silnik TT, bez Efektu Aktywnego.",
        where: "config/tt-rules.mjs"
      },
      {
        what: "Dobycie: Oporządzenie pokazuje dobycie i schowanie takiej broni jako darmowe na linii ruchu w walce.",
        where: "actors/doll.mjs"
      }
    ],
    manual: "Darmowe Interakcje nie są liczone (PLAN_paper_doll D7) — Dobycie jest tylko nazwane na linii "
      + "ruchu Oporządzenia."
  },
  siekierezada: {
    label: "Siekierezada",
    cechy: ["str", "dex"],
    req: "SIŁ 13+",
    text: "+1 SIŁ lub ZRC; wyciągnięcie 2 siekierek jednocześnie w 1 Darmowej Interakcji; "
      + "zasięg rzutu siekierkami ×2; TT +1 przy walce dwiema siekierkami.",
    category: "wrecz",
    legacyAbilityKeys: ["siekierezada"],
    auto: [{
      what: "Podwójne dobycie: nazwane na linii ruchu Oporządzenia przy dobyciu siekierki.",
      where: "actors/doll.mjs"
    }, {
      what: "Tańczący z siekierkami — TT +1 z siekierką z katalogu w każdej ręce (silnik TT).",
      where: "config/tt-rules.mjs"
    }, {
      what: "Rzut siekierką: zasięg normalny i daleki ×2 w silniku okoliczności ataku.",
      where: "config/okolicznosci-ataku.mjs"
    }]
  },
  snajper: {
    label: "Snajper",
    cechy: ["dex", "wis"],
    req: "ZRC 17+, MDR 15+",
    text: "+1 ZRC lub MDR; brak Utrudnienia za daleki dystans; "
      + "zasięg daleki broni dystansowej ×2.",
    category: "dystans",
    legacyAbilityKeys: ["snajper"],
    auto: [{
      what: "Zasięg daleki ×2 i bez Utrudnienia za daleki dystans (silnik okoliczności ataku; ze Strzelcem — ×3).",
      where: "config/okolicznosci-ataku.mjs"
    }]
  },
  szachista: {
    label: "Szachista",
    req: "INT 15+",
    text: "Roszada — podczas Unikania: TT +3 i brak ataków okazyjnych do początku następnej tury.",
    category: "mobilnosc",
    legacyAbilityKeys: ["szachista"],
    auto: [{
      what: "Roszada — TT +3 przy stanie Unikanie (do początku następnej tury), gaśnie z Unikaniem.",
      where: "config/tt-rules.mjs"
    }],
    manual: "Brak ataków okazyjnych przy Roszadzie — MG."
  },
  szkolenieWBroni: {
    label: "Szkolenie w broni",
    cechy: ["str", "dex"],
    req: "Brak",
    text: "+1 SIŁ lub ZRC; biegłość w jednej wybranej kategorii broni.",
    category: "rozwoj",
    bieglosci: [{ wybory: [{ ile: 1, pula: BRON }], tryb: "default", tytul: "Kategoria broni" }],
    auto: [{ what: "Biegłość w jednej kategorii broni — awans przy wzięciu Sztuczki.", where: "actors/bieglosci.mjs" }]
  },
  szkolenieWCiezkimPancerzu: {
    label: "Szkolenie w ciężkim pancerzu",
    cechy: ["str", "con"],
    req: "SIŁ 13+, wyszkolenie w średnim pancerzu",
    text: "+1 SIŁ lub KON; wyszkolenie w ciężkich pancerzach.",
    category: "rozwoj",
    bieglosci: [{ nadania: ["armor:hvy"], tryb: "default", tytul: "Ciężkie pancerze" }],
    auto: [{ what: "Wyszkolenie w ciężkich pancerzach — awans przy wzięciu Sztuczki.", where: "actors/bieglosci.mjs" }]
  },
  szkolenieWSrednimPancerzu: {
    label: "Szkolenie w średnim pancerzu",
    cechy: ["str", "con"],
    req: "SIŁ 10+, wyszkolenie w lekkim pancerzu",
    text: "+1 SIŁ lub KON; wyszkolenie w średnich pancerzach.",
    category: "rozwoj",
    bieglosci: [{ nadania: ["armor:med"], tryb: "default", tytul: "Średnie pancerze" }],
    auto: [{ what: "Wyszkolenie w średnich pancerzach — awans przy wzięciu Sztuczki.", where: "actors/bieglosci.mjs" }]
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
    cechy: ["dex", "con"],
    req: "ZRC 15+, KON 17+",
    text: "+1 ZRC lub KON; biegłość w Inicjatywie (+PB do Inicjatywy); "
      + "Długie susy [B] — Bieganie w Akcji Bonusowej.",
    category: "mobilnosc",
    // Biegłość w Inicjatywie — stockowa flaga dnd5e (reguły „modern”: PB do Inicjatywy, jak Alert 2024).
    efekty: [{ name: "Szybki Bill — Inicjatywa", zmiany: [change("flags.dnd5e.initiativeAlert", CHANGE_TYPE.override, true)] }],
    auto: [{ what: "Biegłość w Inicjatywie (+PB) — Efekt Aktywny na Sztuczce.", where: "config/sztuczki-data.mjs" }],
    manual: "Długie susy [B] — Bieganie w Akcji Bonusowej: koszt akcji pilnuje gracz."
  },
  szybkiePalce: {
    label: "Szybkie palce",
    cechy: ["dex"],
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
    cechy: "dowolna",
    req: "INT 10+",
    text: "+1 dowolna Cecha; biegłość w 2 wybranych umiejętnościach.",
    category: "produkcja",
    bieglosci: [{ wybory: [{ ile: 2, pula: ["skills:*"] }], tryb: "default", tytul: "Umiejętności" }],
    auto: [{ what: "Biegłość w 2 umiejętnościach — awans przy wzięciu Sztuczki.", where: "actors/bieglosci.mjs" }]
  },
  ukrytyCel: {
    label: "Ukryty cel",
    req: "MDR 15+, biegłość Percepcja",
    text: "Ignorujesz osłonę ½ i ¾ celu; ignorujesz Utrudnienie z akcji Unikanie.",
    category: "rekonesans",
    auto: [
      { what: "Osłona ½ i ¾ bez premii do TT celu we wszystkich ścieżkach ataku (okno ataku, KS i DS).", where: "combat/cover.mjs" },
      { what: "Bez Utrudnienia z Unikania celu w silniku okoliczności ataku.", where: "config/okolicznosci-ataku.mjs" }
    ]
  },
  wrestler: {
    label: "Wrestler",
    cechy: ["str"],
    req: "SIŁ 15+",
    text: "+1 SIŁ; Ułatwienie do Testów Ataku wobec Pochwyconego; Duszenie (zamiast ataku — "
      + "1 + mod. SIŁ obrażeń obuchowych); Rzut na matę (Pochwycony duży lub mniejszy, "
      + "z Utrudnieniem → Powalenie).",
    category: "wrecz",
    auto: [],
    manual: "Ułatwienie wobec Pochwyconego, Duszenie i Rzut na matę — MG."
  },
  zlomiarz: {
    label: "Złomiarz",
    cechy: ["int", "wis"],
    req: "INT 13+, biegłość Śledztwo",
    text: "+1 INT lub MDR; Ułatwienie w Testach Śledztwa przy wycenianiu przedmiotów; "
      + "Ułatwienie w Testach MDR/INT podczas szabrowania.",
    category: "produkcja",
    legacyAbilityKeys: ["zlomiarz"],
    auto: [{
      what: "Szabrowanie (Śmieciarz): Ułatwienie do testu szukania — Percepcja i Śledztwo — w prośbie do "
        + "gracza; okno MG pokazuje je przy szukającym.",
      where: "postoj/szabrowanie.mjs"
    }],
    manual: "Wycena (Antykwariusz): Ułatwienie w Testach Śledztwa przy wycenianiu — wycenia MG "
      + "(PLAN_m5_postoj D4)."
  }
});

/* -------------------------------------------- */
/*  Coverage                                     */
/* -------------------------------------------- */

const CECHA_PL = Object.freeze({ str: "SIŁ", dex: "ZRC", con: "KON", int: "INT", wis: "MDR", cha: "CHA" });

/** Opis Rozwoju Cechy z pola `cechy` (do plakietki). */
export function opisCech(cechy) {
  if (!cechy) return "";
  if (cechy === "dowolna") return "+1 do dowolnej Cechy";
  if (!Array.isArray(cechy)) return `+${cechy.cap} do jednej Cechy albo +1 do ${cechy.punkty} Cech`;
  return `+1 ${cechy.map(c => CECHA_PL[c] ?? c).join(" lub ")}`;
}

/** Plakietka liczy Rozwój Cechy jako automatykę: awans dnd5e przy wyborze Sztuczki (PLAN_m7 E3, D8). */
const LEDGER_ENTRIES = Object.fromEntries(Object.entries(SZTUCZKI).map(([key, def]) => [key, def.cechy ? {
  ...def,
  auto: [{ what: `Rozwój Cechy (${opisCech(def.cechy)}, maks. 20) — awans przy wyborze Sztuczki`, where: "config/sztuczki-data.mjs" }, ...(def.auto ?? [])]
} : def]));

const LEDGER = createCoverageLedger({
  entries: LEDGER_ENTRIES,
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
    img: SZTUCZKA_ICONS[key] ? `modules/${MODULE_ID}/icons/abilities/${SZTUCZKA_ICONS[key]}` : "icons/svg/upgrade.svg",
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
