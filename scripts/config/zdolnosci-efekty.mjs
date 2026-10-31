/**
 * Neuroshima 5e — zdolności jako dane (PLAN_m7 E3: rodziny R1 i R2).
 *
 * Stock najpierw (§1 planu): to, co da się powiedzieć danymi dnd5e 6, nie potrzebuje kodu —
 *
 *   - `EFEKTY` — Efekty Aktywne przenoszone z przedmiotu zdolności na aktora: reguły 6.0 z warunkiem na danych rzutu
 *     (`attack` / `check` / `save` + `dnd5e.bonus` / `dnd5e.advantage`; spike E0 b), niewrażliwości (`traits.ci`),
 *     odporności (`traits.dr`), ruch, Udźwig. Warunek na całym efekcie (`warunki`) — np. „tylko w Berserku”
 *     (`statuses.berserk`, stan efektu Berserka).
 *   - `BIEGLOSCI` — grupy biegłości (kształt `PROFESSIONS[].bieglosci`) jako awans `Trait` na poziomie 0 przedmiotu:
 *     dnd5e uruchamia go, gdy zdolność ląduje na postaci — z awansu klasy, wyboru profesji albo Pochodzenia (spike E0 a).
 *     Wyjątek: Specjalizacja Złodzieja — poziomy klasy 1 i 5 (zdolność przyznawana na 1. poziomie).
 *   - `ULATWIENIA` — warunki spoza danych rzutu dla rejestru §3.0.3 (`combat/ulatwienia-testow.mjs`): walka trwa,
 *     źródło RO z karty; `gdy: "stol"` — warunek fabularny („gdy rozmawiasz z półświatkiem”), podsuwany w plakietce.
 *
 * Klucze: `abilityId` zdolności klasowej / profesji / opcji albo `originAbilityId` zdolności Pochodzenia — jedna
 * przestrzeń nazw (identyfikatory się nie powtarzają). Strony RAW w komentarzach; bez cytatów (repozytorium publiczne).
 */

import { change, CHANGE_TYPE } from "./effect-changes.mjs";

const reg = (key, type, value, conditions) => ({ key, type, value: String(value), ...(conditions ? { conditions } : {}) });
const naRzut = (k, v) => [{ k, v }];
const ULATWIENIE = "+1";
/** Wpływanie (s. 41): Oszustwo, Perswazja, Występy, Zastraszanie, Tresura. */
const WPLYWANIE = ["skill:osz", "skill:per", "skill:wys", "skill:zas", "skill:tre"];

/** @type {Readonly<Record<string, {name: string, warunki?: object[], zmiany: object[]}[]>>} */
export const EFEKTY = Object.freeze({
  /* --- klasy, profesje, opcje --- */
  // Wyjadacz (Twardziel 1, Zwiadowca 2): +3 do Testów Ataku bronią palną, dystansową i rzucaną (U29).
  "sokole-oko": [{ name: "Sokole oko", zmiany: [reg("attack", "dnd5e.bonus", 3, naRzut("roll.attack.type", "ranged"))] }],
  // Brutal 3 (D14): każdy RO na ZRC; nie przy Oślepieniu, Ogłuszeniu, Nieprzytomności — stockowy Danger Sense.
  "szosty-zmysl": [{
    name: "Szósty zmysł",
    warunki: [{ o: "NOR", v: [{ k: "statuses.blinded", v: 1 }, { k: "statuses.stunned", v: 1 }, { k: "statuses.unconscious", v: 1 }] }],
    zmiany: [reg("save", "dnd5e.advantage", ULATWIENIE, naRzut("roll.ability", "dex"))]
  }],
  // Ganger — Głupi: niewrażliwość na Przerażenie (Odważny — `combat/zdolnosci-wsparcie.mjs`).
  "odwazny-czy-glupi": [{ name: "Głupi", zmiany: [change("system.traits.ci.value", CHANGE_TYPE.add, "frightened")] }],
  // Gladiator — Zew areny, Doping: w Berserku niewrażliwość na Przerażenie.
  "zew-areny": [{
    name: "Zew areny — Doping", warunki: [{ k: "statuses.berserk", v: 1 }],
    zmiany: [change("system.traits.ci.value", CHANGE_TYPE.add, "frightened")]
  }],
  // Chemik: odporność na kwas i truciznę (Ułatwienie w RO KON — `ULATWIENIA`).
  "smakuje-jak-arszenik": [{
    name: "Smakuje jak arszenik",
    zmiany: [change("system.traits.dr.value", CHANGE_TYPE.add, "acid"), change("system.traits.dr.value", CHANGE_TYPE.add, "poison")]
  }],
  // Szczur: odporność na trucizny i promieniowanie (radioaktywne = `radiant`); choroby to nie typ obrażeń.
  "a-co-mi-tam": [{
    name: "A co mi tam",
    zmiany: [change("system.traits.dr.value", CHANGE_TYPE.add, "poison"), change("system.traits.dr.value", CHANGE_TYPE.add, "radiant")]
  }],
  // Szczur — Szary, Mądra kryjówka: + mod. INT lub MDR do Skradania się — wyższy (wybór „lub” na korzyść gracza, §5.4).
  "szary": [{ name: "Szary — Mądra kryjówka", zmiany: [reg("check", "dnd5e.bonus", "max(@abilities.int.mod, @abilities.wis.mod)", naRzut("roll.skill", "skr"))] }],
  // Szczur — Zwinność szczura, Wspinacz: Szybkość wspinania równa Szybkości (Skoczek — handoff ruchu).
  "zwinnosc-szczura": [{ name: "Zwinność szczura — Wspinacz", zmiany: [change("system.attributes.movement.climb", CHANGE_TYPE.upgrade, "@attributes.movement.walk")] }],

  /* --- Pochodzenia (s. 60–65) --- */
  "ja-juz-swoje-odchorowalem": [{ name: "Ja już swoje odchorowałem", zmiany: [reg("save", "dnd5e.advantage", ULATWIENIE, naRzut("roll.ability", "con"))] }],
  "zdrowa-okolica": [{ name: "Zdrowa okolica", zmiany: [reg("save", "dnd5e.advantage", ULATWIENIE, naRzut("roll.ability", "con"))] }],
  "telepata": [{ name: "Telepata", zmiany: [reg("check", "dnd5e.advantage", ULATWIENIE, naRzut("roll.skill", "int"))] }],
  "doktor-quinn": [{ name: "Doktor Quinn", zmiany: [reg("check", "dnd5e.advantage", ULATWIENIE, naRzut("roll.skill", "med"))] }],
  "zjadlem-wlasnego-psa": [{ name: "Wiesz, zjadłem własnego psa", zmiany: [reg("check", "dnd5e.advantage", ULATWIENIE, naRzut("roll.skill", "zas"))] }],
  "gornik-z-dziada-pradziada": [{
    name: "Górnik z dziada pradziada",
    zmiany: [
      reg("check", "dnd5e.advantage", ULATWIENIE, naRzut("roll.skill", "atl")),
      change("system.attributes.encumbrance.multipliers.overall", CHANGE_TYPE.multiply, 2)
    ]
  }]
});

/** @type {Readonly<Record<string, object[]>>} grupy biegłości (`nadania`, `wybory`, `tryb`, `tytul`, `poziom?`) */
export const BIEGLOSCI = Object.freeze({
  /* --- profesje --- */
  "serwisowanie": [{ nadania: ["tool:elektronika"], tryb: "default" }],
  "mechanika": [{ nadania: ["tool:mechanika"], tryb: "default" }],
  "hakerstwo": [{ nadania: ["tool:hakera"], tryb: "default" }],
  "farmacja": [{ nadania: ["tool:aptekarza"], tryb: "default" }],
  // Ganger — Jeden z nich, Postrach okolicy: Zastraszanie, a jeśli już jest — Specjalizacja.
  "jeden-z-nich": [{ nadania: ["skills:zas"], tryb: "upgrade" }],
  // Złodziej 1 — jedna umiejętność i jedno narzędzie z tych, które już masz; 5. poziom — jeszcze jedno z dwóch.
  "specjalizacja-zlodziej": [
    { wybory: [{ ile: 1, pula: ["skills:*"] }, { ile: 1, pula: ["tool:*"] }], tryb: "expertise", tytul: "Specjalizacja", poziom: 1 },
    { wybory: [{ ile: 1, pula: ["skills:*", "tool:*"] }], tryb: "expertise", tytul: "Specjalizacja", poziom: 5 }
  ],

  /* --- Pochodzenia --- */
  "przedwojenna-edukacja": [{ wybory: [{ ile: 1, pula: ["tool:tool:*"] }], tryb: "default" }],
  "nano-tech": [{ nadania: ["tool:elektronika"], tryb: "default" }],
  "dieta-cud": [{ nadania: ["tool:kucharza"], tryb: "default" }],
  "polegam-tylko-na-sobie": [{ nadania: ["tool:kowala"], tryb: "default" }],
  "siodme-poty": [{ nadania: ["skills:poj"], tryb: "default" }],
  "jesli-ma-silnik-to-ruszy": [{ nadania: ["tool:mechanika"], tryb: "default" }],
  "wychuchana-spluwa": [{ nadania: ["tool:rusznikarza"], tryb: "default" }],
  "szlachetne-urodzenie": [{ wybory: [{ ile: 2, pula: ["skills:his", "skills:osz", "skills:per", "skills:zas"] }], tryb: "default" }],
  "wloczykij": [{ nadania: ["tool:kartografa"], tryb: "default" }],
  "edukacja": [{ wybory: [{ ile: 2, pula: ["skills:prz", "skills:med", "skills:his", "skills:tch", "tool:tool:*"] }], tryb: "default" }],
  "zjadlem-wlasnego-psa": [{ nadania: ["skills:zas", "tool:rzeznika"], tryb: "default" }],
  "na-symulatorach-to-dzialalo": [{ wybory: [{ ile: 2, pula: ["skills:poj", "skills:tch", "tool:mechanika", "tool:elektronika"] }], tryb: "default" }],
  "cholerny-kaznodzieja": [{ nadania: ["skills:per"], tryb: "default" }],
  "przed-wojna-wszystko-bylo-lepiej": [{ nadania: ["skills:his", "skills:med"], tryb: "default" }],
  "czlowiek-zwany-koniem": [{ wybory: [{ ile: 2, pula: ["skills:atl", "skills:tre", "skills:med"] }], tryb: "default" }],
  "doktor-quinn": [{ nadania: ["skills:med"], tryb: "default" }],
  "zdrowa-okolica": [{ nadania: ["saves:con"], tryb: "default" }],
  "hazardzista": [{ nadania: ["skills:zwi", "skills:osz"], tryb: "default" }],
  "telepata": [{ nadania: ["skills:int"], tryb: "default" }]
});

const zeZrodlaKtx = (...z) => ctx => z.some(x => (ctx.kontekst ?? []).includes(x));

/**
 * Wiersze rejestru §3.0.3 ze zdolności. `id` — klucz zdolności; wiersz dostaje go, jeśli aktor ma tę zdolność.
 * @type {Readonly<object[]>}
 */
export const ULATWIENIA = Object.freeze([
  // Żołnierz — Rutyna: w walce Ułatwienie w RO na ZRC i MDR (U27).
  { id: "rutyna", label: "Rutyna", rzut: ["save:dex", "save:wis"], rodzaj: "ulatwienie", gdy: ctx => !!ctx.walka },
  // Zabójca maszyn — Empiryk: RO na efekty wywoływane przez maszyny.
  { id: "empiryk", label: "Empiryk", rzut: ["save:*"], rodzaj: "ulatwienie", gdy: zeZrodlaKtx("maszyna") },
  // Chemik — Smakuje jak arszenik: RO na KON przeciw kwasom, truciznom i skażeniu.
  { id: "smakuje-jak-arszenik", label: "Smakuje jak arszenik", rzut: ["save:con"], rodzaj: "ulatwienie", gdy: zeZrodlaKtx("kwas", "trucizna", "skazenie") },
  // Szczur — A co mi tam: RO przeciw chorobom, truciznom i radiacji.
  { id: "a-co-mi-tam", label: "A co mi tam", rzut: ["save:*"], rodzaj: "ulatwienie", gdy: zeZrodlaKtx("choroba", "trucizna", "skazenie") },
  // Pochodzenia.
  { id: "kwas-w-zylach", label: "Kwas w żyłach", rzut: ["save:*"], rodzaj: "ulatwienie", gdy: zeZrodlaKtx("trucizna", "kwas") },
  { id: "moloch-cos-slyszalem", label: "Moloch? Coś słyszałem", rzut: ["save:*"], rodzaj: "ulatwienie", gdy: zeZrodlaKtx("maszyna") },
  { id: "moloch-cos-slyszalem", label: "Moloch? Coś słyszałem (wiedza o maszynach)", rzut: ["check:int"], rodzaj: "ulatwienie", gdy: () => "stol", klucz: "moloch-wiedza" },
  // Warunki fabularne — podsuwane („stół”, §5.4).
  { id: "slang", label: "Slang (półświatek)", rzut: ["skill:per", "skill:sle"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "jeden-z-nas", label: "Jeden z nas (stróże prawa)", rzut: WPLYWANIE, rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "jeden-z-nich", label: "Jeden z nich — Sami swoi", rzut: ["check:cha"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "reputacja", label: "Reputacja (negocjacje stawki)", rzut: WPLYWANIE, rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "kamuflaz", label: "Kamuflaż — Ghillie", rzut: ["skill:skr"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "skrytka", label: "Skrytka (ukrywanie przedmiotu)", rzut: ["skill:skr"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "duch-pustyni", label: "Duch pustyni (piasek)", rzut: ["skill:skr", "skill:sur"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "hi-tech", label: "Hi-tech (elektronika)", rzut: ["check:*"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "przedwojenna-edukacja", label: "Przedwojenna edukacja", rzut: ["check:int"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "przed-wojna-wszystko-bylo-lepiej", label: "Przed wojną wszystko było lepsze", rzut: ["check:*"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "cholerny-kaznodzieja", label: "Cholerny kaznodzieja (wiara)", rzut: WPLYWANIE, rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "chodzmy-na-pewno-juz-utonal", label: "Chodźmy, na pewno już utonął (pływanie)", rzut: ["skill:atl"], rodzaj: "ulatwienie", gdy: () => "stol" },
  { id: "moj-biom", label: "Mój biom", rzut: ["check:int", "check:wis"], rodzaj: "ulatwienie", gdy: () => "stol" },
  ...["ludzie", "maszyny", "mutanty", "potwory", "zwierzeta"].map(w => ({
    id: `moj-wrog-${w}`, label: `Mój wróg (${w}: tropienie, wiedza)`, rzut: ["skill:sur", "check:int"], rodzaj: "ulatwienie", gdy: () => "stol"
  }))
]);
