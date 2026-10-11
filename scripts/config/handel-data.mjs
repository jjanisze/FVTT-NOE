/**
 * Neuroshima 5e — handel: dane (PLAN_m5_postoj.md §7.2, E0).
 *
 * Liczby z NOE s. 43–44 (lokalizacje, ceny regionalne, ilości), przepisane ręcznie i sprawdzane testami
 * domknięcia (`tests/handel-zasady.test.mjs`). Odczyty MG luk RAW (drzewo NOE, nie WKK — wypełniają ciszę,
 * nie zmieniają liczby z druku; lista w `scripts/wkk/README.md`):
 *   - D8, D31 — które kategorie katalogu liczą się w której kolumnie cen regionalnych;
 *   - D29 — sposób losowania towaru punktu handlowego (miejsca, udział kategorii głównych, Podstawy);
 *   - U1 — knajpa domyślnie od wioski w górę.
 * WKK (skup 50%, Osełka jako towar) — `wkk/config/handel-kobalt.mjs`.
 *
 * Czysty: bez `game`, czyta go też Node.
 */

/* -------------------------------------------- */
/*  Lokalizacja (s. 43)                          */
/* -------------------------------------------- */

/**
 * Rodzaj miejsca postoju. `modyfikator` — Tabela modyfikacji dostępności (s. 43); `miejsca` — liczba miejsc
 * na liście handlarza (D29, odczyt MG, do zmiany w oknie); `knajpa` — domyślne pole Miejsca (Plotkowanie,
 * U35); `rozrywka` — RAW s. 47 tylko miasteczko i miasto; `utrzymanie` — koszt utrzymania tylko w
 * miejscowości (U33); `obraz` — ilustracja handlarza z przykładów s. 43 (§7.23).
 */
export const LOKALIZACJE = Object.freeze({
  dzicz: Object.freeze({ label: "Dzicz", modyfikator: -50, przyklad: "obwoźny sprzedawca", miejsca: 6, knajpa: false, rozrywka: false, utrzymanie: false, obraz: "obwozny" }),
  wioska: Object.freeze({ label: "Wioska", modyfikator: -30, przyklad: "barman, punkt handlowy dla traperów", miejsca: 10, knajpa: true, rozrywka: false, utrzymanie: true, obraz: "barman" }),
  miasteczko: Object.freeze({ label: "Miasteczko", modyfikator: 0, przyklad: "sklep wielobranżowy, targowisko", miejsca: 15, knajpa: true, rozrywka: true, utrzymanie: true, obraz: null }),
  miasto: Object.freeze({ label: "Miasto", modyfikator: 10, przyklad: "dzielnica handlowa", miejsca: 25, knajpa: true, rozrywka: true, utrzymanie: true, obraz: null })
});

export const RODZAJE_MIEJSC = Object.freeze(Object.keys(LOKALIZACJE));

/* -------------------------------------------- */
/*  Ceny regionalne (s. 44)                      */
/* -------------------------------------------- */

/** Kolumny Tabeli modyfikacji cen regionalnych, w kolejności druku. */
export const KATEGORIE_CEN = Object.freeze({
  paliwo: "Paliwo",
  elektronika: "Elektronika",
  mechanika: "Mechanika",
  prochy: "Prochy",
  bron: "Broń",
  zywnosc: "Żywność",
  uslugi: "Usługi speców"
});

const _KOL = Object.keys(KATEGORIE_CEN);
const _R = (label, ...procenty) => Object.freeze({ label, ...Object.fromEntries(_KOL.map((k, i) => [k, procenty[i]])) });

/** 11 regionów × 7 kategorii, procent ceny z tabel (s. 44). Działa w obie strony — kupno i sprzedaż. */
export const REGIONY = Object.freeze({
  "detroit": _R("Detroit", 200, 100, 50, 200, 150, 100, 200),
  "appalachy": _R("Federacja Appalachów", 100, 150, 200, 100, 150, 150, 100),
  "hegemonia": _R("Południowa Hegemonia", 150, 50, 100, 150, 200, 100, 150),
  "nowy-jork": _R("Nowy Jork", 75, 150, 150, 100, 150, 200, 25),
  "miami": _R("Miami", 100, 100, 100, 25, 150, 50, 100),
  "missisipi": _R("Missisipi", 75, 100, 100, 150, 150, 150, 150),
  "posterunek": _R("Posterunek", 200, 200, 150, 50, 200, 200, 25),
  "pustynia": _R("Pustynia", 150, 25, 25, 50, 50, 100, 50),
  "teksas": _R("Teksas", 25, 50, 100, 25, 100, 25, 200),
  "vegas": _R("Vegas", 100, 150, 100, 25, 150, 150, 150),
  "salt-lake-city": _R("Salt Lake City", 100, 100, 100, 50, 150, 25, 100)
});

/**
 * Kategoria katalogu (`KATEGORIE` w `config/recipes-data.mjs`) → kolumna cen regionalnych (D8, odczyt MG).
 * `null` — bez mnożnika (sprzęt, schematy; Fanty nie są w katalogu). Ulepszenia rozstrzyga D31 w
 * `handel-rules.mjs` (nasadka — Broń, a optyka i elektronika — Elektronika; przeróbka — Usługi speców), a
 * paliwo — tag wpisu.
 */
export const KATEGORIA_CENOWA = Object.freeze({
  "bron-biala": "bron", "bron-miotana": "bron", "luki": "bron", "kusze": "bron", "bron-palna": "bron",
  "amunicja": "bron", "amunicja-ciezka": "bron", "pociski": "bron", "granaty": "bron", "magazynki": "bron",
  "pancerz": "bron",
  "ulepszenia-biale": "bron", "ulepszenia-dystansowe": "bron",
  "zestawy": "mechanika", "pojazdy": "mechanika",
  "leki": "prochy", "narkotyki": "prochy", "uzywki": "prochy", "materialy-wybuchowe": "prochy",
  "elektronika": "elektronika", "komputery": "elektronika", "optyka": "elektronika",
  "prowiant": "zywnosc", "woda": "zywnosc",
  "uslugi": "uslugi",
  "paliwo": "paliwo",
  // Różności z s. 139 (kwas, trucizna, środki) — tabela Różności, nie Prochów: bez mnożnika jak sprzęt (D8).
  "chemia-uzytkowa": null,
  "sprzet": null
});

/** Surowce (s. 144) — kolumna cen (D8): CH — Prochy, CE — Elektronika, CZ i MK — Mechanika, MO — Żywność. */
export const KATEGORIA_CENOWA_SUROWCA = Object.freeze({ CH: "prochy", CE: "elektronika", CZ: "mechanika", MK: "mechanika", MO: "zywnosc" });

/* -------------------------------------------- */
/*  Ilość, stan, skup                            */
/* -------------------------------------------- */

/** Kategorie katalogu liczone jak amunicja — „rzadko więcej niż 3k20” (s. 43, U5). */
export const KATEGORIE_AMUNICJI = Object.freeze(["amunicja", "amunicja-ciezka", "pociski"]);

/** Ilość u handlarza (s. 43): wielorazowy — 1, jednorazowy — 2k4, amunicja — 3k20. */
export const ILOSC = Object.freeze({ wielorazowy: "1", jednorazowy: "2d4", amunicja: "3d20" });

/** Stan przedmiotu → mnożnik ceny. Zepsuty za połowę (s. 132 — Fant wymagający drobnej naprawy; U2). */
export const STAN = Object.freeze({
  sprawny: Object.freeze({ label: "sprawny", mnoznik: 1 }),
  zepsuty: Object.freeze({ label: "wymaga naprawy", mnoznik: 0.5 })
});

/** Skup NOE: handlarz kupuje po 100% ceny regionalnej (D3). WKK — `SKUP_KOBALT`. */
export const SKUP_NOE = 1;

/** Wpływanie przy wymianie: Perswazja, Oszustwo albo Zastraszanie, ST 15 (s. 44). */
export const WPLYWANIE = Object.freeze({ st: 15, umiejetnosci: Object.freeze(["per", "osz", "zas"]) });

/** Kolejne godziny gamblingu tej doby: RO na MDR albo CHA, ST 10; porażka — Wyczerpanie (s. 44, U6). */
export const GAMBLING_RO = Object.freeze({ st: 10, cechy: Object.freeze(["wis", "cha"]) });

/** Gambling we krwi (Pochodzenie Nowy Jork, s. 63): +5 do dostępności, bez zmęczenia. */
export const GAMBLING_WE_KRWI = Object.freeze({ premia: 5 });

/* -------------------------------------------- */
/*  Generator towaru (D29, odczyt MG)            */
/* -------------------------------------------- */

/**
 * Grupy towaru punktu handlowego — kategorie główne do wyboru w oknie (2–3) i podział listy (≈ 80% / 20%).
 * `kat` — kategorie katalogu; ulepszenia (`addon:`) idą do `ulepszenia` niezależnie od kategorii katalogu.
 * `obraz` — ilustracja handlarza (§7.23) dla kategorii głównej, gdy rodzaj miejsca nie wybrał wcześniej.
 */
export const GRUPY_TOWARU = Object.freeze({
  bron: Object.freeze({ label: "Broń", kat: Object.freeze(["bron-biala", "bron-miotana", "luki", "kusze", "bron-palna"]), obraz: "bron" }),
  amunicja: Object.freeze({ label: "Amunicja i granaty", kat: Object.freeze(["amunicja", "amunicja-ciezka", "pociski", "granaty", "magazynki"]), obraz: "bron" }),
  pancerze: Object.freeze({ label: "Pancerze", kat: Object.freeze(["pancerz"]), obraz: "bron" }),
  ulepszenia: Object.freeze({ label: "Ulepszenia i optyka", kat: Object.freeze([]), obraz: "bron" }),
  leki: Object.freeze({ label: "Leki", kat: Object.freeze(["leki", "narkotyki"]), obraz: "apteka" }),
  uzywki: Object.freeze({ label: "Używki", kat: Object.freeze(["uzywki"]), obraz: "barman" }),
  chemia: Object.freeze({ label: "Chemia i pirotechnika", kat: Object.freeze(["chemia-uzytkowa", "materialy-wybuchowe"]), obraz: "apteka" }),
  elektronika: Object.freeze({ label: "Elektronika", kat: Object.freeze(["elektronika", "komputery", "optyka"]), obraz: "warsztat" }),
  narzedzia: Object.freeze({ label: "Narzędzia", kat: Object.freeze(["zestawy"]), obraz: "warsztat" }),
  zywnosc: Object.freeze({ label: "Żywność i woda", kat: Object.freeze(["prowiant", "woda"]), obraz: "stragan" }),
  rozne: Object.freeze({ label: "Różności", kat: Object.freeze(["sprzet", "paliwo"]), obraz: "wielobranzowy" })
});

/**
 * „Podstawy” (D29) — kategoria do zaznaczenia: woda, jedzenie, leki podstawowe i dwa popularne kalibry
 * (.22 LR — umowna waluta z s. 44, i 9 mm). Losują dostępność jak każda pozycja — bez gwarancji, bez narzutu.
 */
export const PODSTAWY = Object.freeze([
  "prowiant:woda_pitna", "prowiant:prowiant", "prowiant:chleb",
  "chemia:painkiller", "chemia:aspirynaK", "chemia:medpak",
  "ammo:22lr", "ammo:9mm"
]);

/** Udział miejsc dla kategorii głównych (D29: ok. 80%). */
export const UDZIAL_GLOWNYCH = 0.8;

/**
 * Fachowiec punktu handlowego (D33): rusznikarz — przeróbki broni dystansowej, kowal — białej, elektronik —
 * Szoker. Generator ustawia go handlarzom z kategorią główną Broń w miasteczku i mieście.
 */
export const FACHOWCY = Object.freeze({
  rusznikarz: Object.freeze({ label: "Rusznikarz", kategorie: Object.freeze(["dystansowa"]) }),
  kowal: Object.freeze({ label: "Kowal", kategorie: Object.freeze(["biala"]) }),
  elektronik: Object.freeze({ label: "Elektronik", ulepszenia: Object.freeze(["szoker"]) })
});

/* -------------------------------------------- */
/*  Ulepszenia (D31, D32)                        */
/* -------------------------------------------- */

/**
 * D32 — dostępność nasadki, której RAW nie podaje: bliźniak z tabeli Sprzętu, gdzie jest (s. 130–131,
 * s. 139), reszta z progu ceny. Odczyt MG, liczby do zmiany.
 */
export const DOSTEPNOSC_NASADEK = Object.freeze({
  blizniaki: Object.freeze({ noktowizor: 15, termowizor: 5, latarka: 60 }),
  progi: Object.freeze([
    Object.freeze({ doCeny: 20, dostepnosc: 50 }),
    Object.freeze({ doCeny: 50, dostepnosc: 30 }),
    Object.freeze({ doCeny: 100, dostepnosc: 15 }),
    Object.freeze({ doCeny: Infinity, dostepnosc: 5 })
  ])
});

/* -------------------------------------------- */
/*  Waluty lokalne (U41, D39)                    */
/* -------------------------------------------- */

/** Poza swoim regionem waluta lokalna nic nie jest warta (s. 43); MG wpisuje inną wartość (D39). */
export const WALUTA_POZA_REGIONEM = 0;
