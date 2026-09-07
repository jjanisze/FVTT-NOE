/**
 * Neuroshima 5e — dane podróży, biomów i zapasów (karta drużyny).
 *
 * Czysta tabelaryzacja podręcznika. Żadnej logiki — te stałe czyta
 * `actors/party-travel.mjs`, `actors/party-supplies.mjs` i `actors/party-sheet.mjs`.
 *
 * Źródła:
 *  - Tempo podróży, str. „Podróż” (~2448–2525): 4 tempa, maks. 8 h marszu na dobę.
 *  - Trudny teren (~1357): 1,5 m ruchu kosztuje 3 m, efekty się nie kumulują.
 *  - Zwiadowca 1 „Mój biom” (~6296): 10 biomów, liczba wg `@scale.zwiadowca.mojBiom`.
 *  - Niedożywienie / Odwodnienie (~17316–17340): dzienne zapotrzebowanie wg rozmiaru.
 */

/**
 * Tempa podróży, od najwolniejszego do najszybszego — kolejność jest znacząca,
 * bo akcja `changePace` przesuwa się po tej tablicy o ±1.
 *
 * `perMinute` w metrach, `perHour` i `perDay` w kilometrach. `perDay` zakłada
 * RAW-owe 8 h marszu; tryb całodobowy (pojazd z rotacją kierowców) mnoży ×3.
 * @type {Array<{id: string, label: string, narzednik: string, perMinute: number, perHour: number, perDay: number,
 *               wymog: string, efekty: Array<{tekst: string, dobry: boolean}>,
 *               mods: Array<{skill: string, mode: number}>, ukrycieNiemozliwe?: boolean}>}
 */
export const TEMPA = [
  {
    id: "powolne",
    label: "Powolne",
    narzednik: "powolnym",
    perMinute: 50,
    perHour: 3,
    perDay: 24,
    wymog: "Wymuszone przez trudny teren: góry, bagna, gęste dżungle, śnieżne zaspy.",
    efekty: [{ tekst: "Ułatwienie w Testach Mądrości (Percepcja lub Survival)", dobry: true }],
    mods: [{ skill: "prc", mode: 1 }, { skill: "sur", mode: 1 }]
  },
  {
    id: "normalne",
    label: "Normalne",
    narzednik: "normalnym",
    perMinute: 100,
    perHour: 6,
    perDay: 48,
    wymog: "Typowy marsz po bezdrożach, ruinach i lasach — pieszo, wierzchem lub wozem.",
    efekty: [],
    mods: []
  },
  {
    id: "szybkie",
    label: "Szybkie",
    narzednik: "szybkim",
    perMinute: 200,
    perHour: 12,
    perDay: 96,
    wymog: "Wierzchowiec lub wolny pojazd (rower) na terenie płaskim albo na drodze.",
    efekty: [{ tekst: "Utrudnienie w Testach Zręczności (Skradanie się)", dobry: false }],
    mods: [{ skill: "skr", mode: -1 }]
  },
  {
    id: "bardzoSzybkie",
    label: "Bardzo szybkie",
    narzednik: "bardzo szybkim",
    perMinute: 500,
    perHour: 30,
    perDay: 240,
    wymog: "Wyłącznie pojazd mechaniczny ≥30 km/h po przejezdnej drodze.",
    efekty: [
      { tekst: "Utrudnienie w Testach Mądrości (Percepcja lub Survival)", dobry: false },
      { tekst: "Ukrycie się jest niemożliwe", dobry: false }
    ],
    mods: [{ skill: "prc", mode: -1 }, { skill: "sur", mode: -1 }],
    ukrycieNiemozliwe: true
  }
];

/** @type {Record<string, object>} Tempa po id. */
export const TEMPA_MAP = Object.fromEntries(TEMPA.map(t => [t.id, t]));

/**
 * Sposób przemieszczania się. Podręcznik wiąże tempo z transportem wprost
 * („Tempo podróży zależy od terenu i sposobu przemieszczania się”), więc transport
 * jest sufitem tempa, a nie tylko opisem.
 * @type {Array<{id: string, label: string, icon: string, przyslowek: string, czasownik: string, maxTempo: string, opis: string}>}
 */
export const TRANSPORT = [
  {
    id: "pieszo",
    label: "Pieszo",
    przyslowek: "pieszo",
    czasownik: "Idź",
    icon: "fa-solid fa-person-walking",
    maxTempo: "normalne",
    opis: "Marsz, wierzchem stępa albo wóz ciągnięty przez zwierzę. Maks. tempo Normalne."
  },
  {
    id: "wierzchowiec",
    label: "Wierzchowiec / rower",
    przyslowek: "wierzchem",
    czasownik: "Jedź",
    icon: "fa-solid fa-horse",
    maxTempo: "szybkie",
    opis: "Wierzchowiec lub wolny pojazd po płaskim terenie albo drodze. Maks. tempo Szybkie."
  },
  {
    id: "pojazd",
    label: "Pojazd mechaniczny",
    przyslowek: "samochodem",
    czasownik: "Jedź",
    icon: "fa-solid fa-truck-pickup",
    maxTempo: "bardzoSzybkie",
    opis: "Silnik ≥30 km/h po przejezdnej drodze. Tylko tu działa marsz całodobowy."
  }
];

/** @type {Record<string, object>} Transporty po id. */
export const TRANSPORT_MAP = Object.fromEntries(TRANSPORT.map(t => [t.id, t]));

export const TRANSPORT_DOMYSLNY = "pieszo";

/**
 * Zbiornik wewnętrzny pojazdu, gdy nikt nie wpisał specyfikacji.
 * Podręcznik podaje spalanie w l/100 km w statblocku pojazdu (np. autobus — 40 l/100 km).
 */
export const PALIWO_DOMYSLNE = { max: 80, spalanie: 20 };

/** Domyślne tempo drużyny. */
export const TEMPO_DOMYSLNE = "normalne";

/** Godziny marszu na dobę: RAW 8, z rotacją kierowców w pojeździe — 24. */
export const GODZIN_MARSZU = 8;
export const GODZIN_MARSZU_CALODOBOWO = 24;

/* -------------------------------------------- */
/*  Biomy (Zwiadowca 1 — Mój biom)               */
/* -------------------------------------------- */

/**
 * Dziesięć biomów do wyboru. `id` trafia do
 * `flags["neuroshima-2026-overrides"].biomy` na karcie Zwiadowcy.
 * `przez` to biernik do zdania opisowego („podróż … przez neodżunglę”).
 * @type {Array<{id: string, label: string, icon: string, przez: string}>}
 */
export const BIOMY = [
  { id: "bagna", label: "Bagna", icon: "fa-solid fa-water", przez: "bagna" },
  { id: "gory", label: "Góry", icon: "fa-solid fa-mountain", przez: "góry" },
  { id: "las", label: "Las", icon: "fa-solid fa-tree", przez: "las" },
  { id: "miasto", label: "Miasto", icon: "fa-solid fa-city", przez: "miasto" },
  { id: "neodzungla", label: "Neodżungla", icon: "fa-solid fa-leaf", przez: "neodżunglę" },
  { id: "podziemia", label: "Podziemia", icon: "fa-solid fa-dungeon", przez: "podziemia" },
  { id: "preria", label: "Preria", icon: "fa-solid fa-wheat-awn", przez: "prerię" },
  { id: "pustynia", label: "Pustynia", icon: "fa-solid fa-sun-plant-wilt", przez: "pustynię" },
  { id: "ruiny", label: "Ruiny", icon: "fa-solid fa-building-circle-exclamation", przez: "ruiny" },
  { id: "tereny-maszyn", label: "Tereny Maszyn", icon: "fa-solid fa-gears", przez: "tereny maszyn" }
];

/** @type {Record<string, object>} Biomy po id. */
export const BIOMY_MAP = Object.fromEntries(BIOMY.map(b => [b.id, b]));

/** Korzyści z „Mój biom”, wyświetlane w panelu Podróży gdy ktoś zna wybrany biom. */
export const BIOM_KORZYSCI = [
  "Ułatwienie w Testach Inteligencji i Mądrości związanych z biomem",
  "Pieszo: trudny teren nie spowalnia zwiadowcy ani jego drużyny",
  "Nikt i nic nie jest w stanie zaskoczyć zwiadowcy",
  "Samotnie: skradanie się w tempie normalnego ruchu",
  "8 h szukania wody i pożywienia wyżywi cztery osoby przez dobę",
  "Tropiąc: dokładna liczebność, rozmiar i czas pozostawienia śladów"
];

/** Ile osób na dobę wyżywi jeden zwiadowca po 8 h zbieractwa w swoim biomie. */
export const BIOM_ZBIERACTWO_OSOB = 4;

/* -------------------------------------------- */
/*  Zapasy                                       */
/* -------------------------------------------- */

/** Dzienne zapotrzebowanie na jedzenie w kg, wg rozmiaru (klucze `CONFIG.DND5E.actorSizes`). */
export const JEDZENIE_NA_DOBE = { tiny: 0.1, sm: 0.25, med: 0.5, lg: 2, huge: 8, grg: 32 };

/** Dzienne zapotrzebowanie na wodę w litrach, wg rozmiaru. */
export const WODA_NA_DOBE = { tiny: 0.5, sm: 1, med: 2, lg: 30, huge: 60, grg: 240 };

/** RO na Kondycję za zjedzenie mniej niż połowy racji. Woda nie daje rzutu — Wyczerpanie jest automatyczne. */
export const NIEDOZYWIENIE_ST = 10;

/** Test Mądrości (Survival) na godzinnym polowaniu na postoju. */
export const POLOWANIE_ST = 15;

/** Test narzędzi małego kucharza; wynik ≥ `GOTOWANIE_FUKS` rozdaje Fuksa na 24 h. */
export const GOTOWANIE_ST = 10;
export const GOTOWANIE_FUKS = 20;

/**
 * Klasyfikacja zapasów. Itemy z flagą `flags[MODULE].zasob.kind` mają pierwszeństwo;
 * reszta jest rozpoznawana po nazwie, żeby zakładka miała sens przed migracją.
 *
 * `perUnit` to ilość na jedną sztukę (`quantity`), gdy item nie ma sensownej wagi:
 * jedzenie w kg, woda w litrach.
 * @type {Array<{kind: string, label: string, icon: string, unit: string, rx: RegExp, perUnit: number}>}
 */
export const ZASOBY_KATEGORIE = [
  {
    kind: "jedzenie",
    label: "Prowiant",
    icon: "fa-solid fa-drumstick-bite",
    unit: "kg",
    perUnit: 0.5,
    rx: /prowiant|konserw|racj[ai]|suchar|jedzenie|\bżywnoś|menażk/i
  },
  {
    kind: "woda",
    label: "Woda pitna",
    icon: "fa-solid fa-droplet",
    unit: "l",
    perUnit: 1,
    // \bwody\b added 2026-09-07: Alan's "Litr Wody" (genitive case) fell through \bwoda\b
    // entirely — "wody" doesn't contain "woda" as a substring, not a boundary issue. The
    // bare word boundary keeps this safe against unrelated words like "zawody"/"dowody"
    // (no internal word break before the fused "wody" in those).
    rx: /woda pitna|\bwoda\b|\bwody\b|manierk|bukłak|butelka wody|kanister z wod/i
  },
  {
    kind: "lek",
    label: "Leki",
    icon: "fa-solid fa-kit-medical",
    unit: "szt.",
    perUnit: 1,
    rx: /radoff|antybiotyk|uzupełnieni|apteczk|bandaż|morfin|lekarstw/i
  },
  {
    kind: "paliwo",
    label: "Paliwo",
    icon: "fa-solid fa-gas-pump",
    unit: "l",
    perUnit: 20,
    rx: /paliw|benzyn|ropa|kanister/i
  }
];
