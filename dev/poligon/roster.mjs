/**
 * Obsada — the Poligon's cast, as data (PLAN_human_testing.md §3.4). Generic NOE characters, never
 * campaign ones. Each is built once through dnd5e's real advancement (lib/obsada.mjs) into the world
 * compendium "Poligon · Obsada"; stations import copies, so a reset takes seconds and the GM can wreck
 * a persona freely. Rebuilt when class data changes (the panel's Świeżość says when).
 *
 *   klasa / poziom   class identifier and level (the class is dropped at 1, then levelled up)
 *   profesja         the profession picked at the Subclass step (level 3)
 *   pochodzenie      the background (Pochodzenie) dropped after the class
 *   cechy            ability scores before Pochodzenie (+1/+1)
 *   picks            what to choose at named advancement steps — step title → item name(s) / skill label(s)
 *   sztuczka         the starting Sztuczka (NOE: one at creation, no advancement)
 *   multi            further classes `[{klasa, poziom, picks}]` (multiclass)
 *   ekwipunek        the loadout, applied to every imported copy through the kit (doll, magazines)
 *
 * Pochodzenia rotate so every region is someone's; the M3 five are the Hangar's (§5.0).
 */

const C = (str, dex, con, int, wis, cha) => ({ str, dex, con, int, wis, cha });

/** Typical loadouts — `pack:name` or `pack:{flag}`; see lib/kit.mjs `give()`. */
export const LOADOUTS = {
  brutal: [{ ref: "bron:Topór strażacki", place: "hand.0" }, { ref: "bron:Maczeta", place: "melee" }, { ref: "pancerze:Kurtka ćwiekowana", place: "auto" }],
  cwaniak: [{ ref: "bron:Peacemaker", place: "ranged", load: true }, { ref: "amunicja:{45acp}", qty: 12 }, { ref: "bron:Nóż taktyczny", place: "melee" }],
  spec: [{ ref: "bron:G17", place: "ranged", load: true }, { ref: "narzedzia:{mechanika}" }, { ref: "narzedzia:{elektronika}" }, { ref: "sprzet:Latarka czołówka" }],
  twardziel: [{ ref: "bron:AK (Kałach)", place: "hand.0", load: { spareMags: 2 } }, { ref: "bron:B 92", place: "ranged", load: true }, { ref: "pancerze:Plate carrier typ II", place: "auto" }, { ref: "pancerze:Hełm", place: "auto" }, { ref: "granaty:{grenade-frag}", qty: 2 }],
  zlodziej: [{ ref: "bron:Sztylet", place: "melee" }, { ref: "bron:Kusza automatyczna pistoletowa", place: "ranged", load: true }, { ref: "amunicja:{belt}", qty: 10 }, { ref: "narzedzia:{slusarza}" }],
  zwiadowca: [{ ref: "bron:R700", place: "hand.0", load: true }, { ref: "amunicja:{762}", qty: 20 }, { ref: "bron:Maczeta", place: "melee" }, { ref: "narzedzia:{klusownika}" }, { ref: "pancerze:Pancerz skórzany", place: "auto" }]
};

const PROF_PICKS = {
  // One automated ability per profession, so the 18 cover a pick each (ledger coverage, §3.4).
  Ganger: "Ja i mój gang!", Gladiator: "Zew areny", Najemnik: "Maszyna do zabijania",
  Gwiazda: "Let’s rock!", "Kaznodzieja Nowej Ery": "Tarcza wiary", Mafiozo: "Renoma",
  Chemik: "Pirotechnika", Medyk: "Łapiduch", Monter: "Mechanika",
  Kowboj: "Rewolwerowiec", "Wojownik Autostrady": "Kaskader", "Żołnierz": "Trening w zbroi",
  Kurier: "Skrytka", Szczur: "Zwinność szczura", "Zabójca": "Strzelec",
  "Łowca Mutantów": "Pogromca", "Sędzia": "Rzuć broń i gleba!", "Zabójca Maszyn": "Słaby punkt"
};

const PROFESSIONS = {
  brutal: ["Ganger", "Gladiator", "Najemnik"],
  cwaniak: ["Gwiazda", "Kaznodzieja Nowej Ery", "Mafiozo"],
  spec: ["Chemik", "Medyk", "Monter"],
  twardziel: ["Kowboj", "Wojownik Autostrady", "Żołnierz"],
  zlodziej: ["Kurier", "Szczur", "Zabójca"],
  zwiadowca: ["Łowca Mutantów", "Sędzia", "Zabójca Maszyn"]
};

const CLASS_LABEL = { brutal: "Brutal", cwaniak: "Cwaniak", spec: "Spec", twardziel: "Twardziel", zlodziej: "Złodziej", zwiadowca: "Zwiadowca" };
const CECHY = {
  brutal: C(15, 13, 14, 8, 12, 10), cwaniak: C(8, 14, 12, 12, 10, 15), spec: C(8, 13, 12, 15, 14, 10),
  twardziel: C(15, 14, 13, 10, 12, 8), zlodziej: C(10, 15, 12, 13, 12, 10), zwiadowca: C(12, 15, 13, 10, 14, 8)
};
const ORIGINS = ["Asgard", "Człowiek Pustyni", "Detroit", "Federacja Appalachów", "Miami", "Missisipi", "Nowy Jork",
  "Południowa Hegemonia", "Posterunek", "Salt Lake City", "Teksas", "Vegas"];

/**
 * The automated entries of the coverage ledgers (`coverage: auto | partial` on the pack items) go on
 * personas, so a human meets every one of them somewhere (§3.4 invariant; checked by
 * `game.poligon.obsada.coverage()` and the `poligon` e2e suite).
 */
const AUTO_SZTUCZKI = ["Siekierezada", "Pulp Fiction", "Aspiryna i Miętusy", "Ruchome gniazdo CKM", "Szybkie palce", "Aramis",
  "Neo", "Kuloodporność", "Szturmowiec", "Grad ołowiu", "Muzyk", "Pan Plaster", "Fabrykator", "Szachista", "Przydasie",
  "Samuraj", "Mistrz walki wręcz", "Pakowanie"];
const AUTO_ORIGIN = { "Nowy Jork": "Gambling we krwi", Asgard: "Nano-Tech", Detroit: "Jeśli ma silnik, to ruszy", "Federacja Appalachów": "Wychuchana spluwa" };
const originPick = origin => (AUTO_ORIGIN[origin] ? { "Zdolność z Pochodzenia": AUTO_ORIGIN[origin] } : {});
/** A Sztuczka a station needs on a given profession persona; the rotation still advances, so nobody else shifts. */
const PROF_SZTUCZKA = { Szczur: "Złomiarz" };

/** Level-1 choices that put an automated ability on the class set (the rest take the first option). */
const L1_PICKS = { twardziel: { "Wyjadacz — wybierz jedną": "Stalowy nadgarstek" } };

const slug = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const roster = [];
let o = 0;
let s = 0;
const nextSztuczka = () => AUTO_SZTUCZKI[s++ % AUTO_SZTUCZKI.length];

// One per class at level 1, each with an automated starting Sztuczka.
for (const k of Object.keys(CLASS_LABEL)) {
  const origin = ORIGINS[o++ % ORIGINS.length];
  roster.push({
    id: `${k}-1`, name: `${CLASS_LABEL[k]} (1)`, rola: `${CLASS_LABEL[k]} 1 — świeżo zrobiona postać`,
    klasa: k, poziom: 1, pochodzenie: origin, cechy: CECHY[k], picks: { ...originPick(origin), ...(L1_PICKS[k] ?? {}) },
    sztuczka: nextSztuczka(), ekwipunek: LOADOUTS[k], grupa: "klasy"
  });
}

// One per profession at level 5 (the mid-level set; with the six above: every class twice). Level 4's
// Sztuczka pick takes the next automated one (or PROF_SZTUCZKA — Szczur scavenges on the Złomowisko).
for (const [k, list] of Object.entries(PROFESSIONS)) {
  for (const prof of list) {
    const origin = ORIGINS[o++ % ORIGINS.length];
    const sztuczka = nextSztuczka();
    roster.push({
      id: `${slug(prof)}-5`, name: `${prof} (5)`, rola: `${CLASS_LABEL[k]} 5 · ${prof} · ${PROF_PICKS[prof]}`,
      klasa: k, poziom: 5, profesja: prof, pochodzenie: origin, cechy: CECHY[k],
      picks: { "Zdolność z profesji": PROF_PICKS[prof], Sztuczka: PROF_SZTUCZKA[prof] ?? sztuczka, ...originPick(origin) },
      ekwipunek: LOADOUTS[k], grupa: "profesje"
    });
  }
}

// The Hangar's five (§5.0): each carries the M3 ability its profession offers at level 3.
roster.push(
  { id: "haker", name: "Haker", rola: "Spec 3 · Monter · Hakerstwo — twórca dronów (INT +3)", klasa: "spec", poziom: 3, profesja: "Monter",
    pochodzenie: "Detroit", cechy: C(8, 13, 12, 16, 14, 10), picks: { "Zdolność z profesji": "Hakerstwo" },
    ekwipunek: [{ ref: "bron:G17", place: "ranged", load: true }, { ref: "narzedzia:{hakera}" }, { ref: "sprzet:Latarka czołówka" }], grupa: "m3" },
  { id: "sedzia", name: "Sędzia", rola: "Zwiadowca 3 · Sędzia · Partner (ludzki partner)", klasa: "zwiadowca", poziom: 3, profesja: "Sędzia",
    pochodzenie: "Teksas", cechy: CECHY.zwiadowca, picks: { "Zdolność z profesji": "Partner" }, ekwipunek: LOADOUTS.zwiadowca, grupa: "m3" },
  { id: "lowca", name: "Łowca", rola: "Zwiadowca 3 · Łowca Mutantów · Oswajanie zwierząt", klasa: "zwiadowca", poziom: 3, profesja: "Łowca Mutantów",
    pochodzenie: "Człowiek Pustyni", cechy: CECHY.zwiadowca, picks: { "Zdolność z profesji": "Oswajanie zwierząt" }, ekwipunek: LOADOUTS.zwiadowca, grupa: "m3" },
  { id: "mafiozo", name: "Mafiozo", rola: "Cwaniak 3 · Mafiozo · Moja prawa ręka", klasa: "cwaniak", poziom: 3, profesja: "Mafiozo",
    pochodzenie: "Vegas", cechy: CECHY.cwaniak, picks: { "Zdolność z profesji": "Moja prawa ręka" }, ekwipunek: LOADOUTS.cwaniak, grupa: "m3" },
  { id: "zabojca-maszyn", name: "Zabójca Maszyn", rola: "Zwiadowca 3 · Zabójca Maszyn · Emiter EMP", klasa: "zwiadowca", poziom: 3, profesja: "Zabójca Maszyn",
    pochodzenie: "Posterunek", cechy: CECHY.zwiadowca, picks: { "Zdolność z profesji": "Emiter EMP", "Mój wróg — wybierz jedną": "Mój wróg: Maszyny" },
    ekwipunek: [{ ref: "bron:Emiter EMP", place: "hand.0" }, { ref: "bron:Maczeta", place: "melee" }], grupa: "m3" }
);

// Specials (§3.4).
roster.push(
  { id: "goly", name: "Goły", rola: "Twardziel 1 bez niczego — pusta karta, pusta lalka", klasa: "twardziel", poziom: 1, pochodzenie: "Missisipi",
    cechy: CECHY.twardziel, ekwipunek: [], grupa: "specjalne" },
  { id: "chomik", name: "Chomik", rola: "Brutal 3 z wszystkim naraz — Przeciążenie, Unieruchomienie, ~300 przedmiotów (Magazyn → Wszystko)", klasa: "brutal", poziom: 3,
    profesja: "Najemnik", pochodzenie: "Nowy Jork", cechy: CECHY.brutal, picks: { "Zdolność z profesji": "Skuteczny cios" }, ekwipunek: LOADOUTS.brutal, grupa: "specjalne", chomik: true },
  { id: "weteran", name: "Weteran", rola: "Twardziel 10 (Żołnierz, Trzeci atak) + Zwiadowca 2 — wysoki poziom, wieloklasowość", klasa: "twardziel", poziom: 10, profesja: "Żołnierz",
    pochodzenie: "Federacja Appalachów", cechy: C(15, 15, 14, 10, 13, 8), picks: { "Zdolność z profesji": "Rutyna" },
    multi: [{ klasa: "zwiadowca", poziom: 2 }], ekwipunek: LOADOUTS.twardziel, grupa: "specjalne" },
  { id: "warsztat", name: "Warsztat", rola: "Spec 5 · Monter · Mechanika — schematy, surowce, narzędzia", klasa: "spec", poziom: 5, profesja: "Monter",
    pochodzenie: "Salt Lake City", cechy: CECHY.spec, picks: { "Zdolność z profesji": "Mechanika" },
    ekwipunek: [{ ref: "bron:G17", place: "ranged", load: true }, { ref: "narzedzia:{mechanika}" }, { ref: "narzedzia:{rusznikarza}" }], grupa: "specjalne", warsztat: true }
);

roster.push({
  id: "stary-wyga", name: "Stary wyga", rola: "Złodziej 9 (Kurier) — Dziewięć żyć, Matrix, Saper w drodze", klasa: "zlodziej", poziom: 9, profesja: "Kurier",
  pochodzenie: "Południowa Hegemonia", cechy: CECHY.zlodziej, picks: { "Zdolność z profesji": "Znajomości" }, ekwipunek: LOADOUTS.zlodziej, grupa: "specjalne"
});

/**
 * Coverage: automated profession picks the mid-level set does not carry (each profession offers 3–4,
 * a level-5 persona takes one). Level 3 — the pick is all they are for. `obsada.coverage()` names any
 * automated ability still without a persona.
 */
const COVERAGE = [["Medyk", "Farmacja"], ["Zabójca Maszyn", "Empiryk"], ["Monter", "Serwisowanie"], ["Chemik", "Rusznikarstwo"],
  ["Kowboj", "Pistolero"], ["Szczur", "Truciciel"], ["Gwiazda", "Za garść gambli"], ["Łowca Mutantów", "Mutant na śniadanie"],
  // M4 E7 (2026-10-19): all three Wojownik Autostrady picks are automated; the level-5 persona carries Kaskader.
  ["Wojownik Autostrady", "Drzwi w drzwi"], ["Wojownik Autostrady", "Pancerna fura"],
  // M4 W5 (2026-10-30): the long-rest card — the Stajnia's Kowboj.
  ["Kowboj", "Zawsze w siodle"]];
for (const [prof, pick] of COVERAGE) {
  const k = Object.keys(PROFESSIONS).find(c => PROFESSIONS[c].includes(prof));
  roster.push({
    id: `${slug(prof)}-${slug(pick)}`, name: `${prof}: ${pick}`, rola: `${CLASS_LABEL[k]} 3 · ${prof} · ${pick} (pokrycie automatyki)`,
    klasa: k, poziom: 3, profesja: prof, pochodzenie: ORIGINS[o++ % ORIGINS.length], cechy: CECHY[k],
    picks: { "Zdolność z profesji": pick }, ekwipunek: LOADOUTS[k], grupa: "pokrycie"
  });
}

// M4 W5 (2026-10-30): the riding abilities on one rider — appended last, so no rotation above shifts.
roster.push({
  id: "jezdziec", name: "Jeździec", rola: "Zwiadowca 3 · Łowca Mutantów · Wyjadacz: Jeździec, Rodeo, Ale jazda! (pokrycie automatyki)",
  klasa: "zwiadowca", poziom: 3, profesja: "Łowca Mutantów", pochodzenie: "Detroit", cechy: CECHY.zwiadowca,
  picks: { "Zdolność z profesji": PROF_PICKS["Łowca Mutantów"], "Wyjadacz — wybierz jedną": "Jeździec", "Zdolność z Pochodzenia": "Ale jazda!" },
  sztuczka: "Rodeo", ekwipunek: LOADOUTS.zwiadowca, grupa: "pokrycie"
});

export const ROSTER = Object.freeze(roster);
export const personaDef = id => ROSTER.find(p => p.id === id) ?? null;
