/**
 * Neuroshima 5e — przepisy produkcji (PLAN_produkcja §5.1, etap E0).
 *
 * **Przepis ≠ źródło dostępu.** ST, czas, surowce i narzędzia należą do przepisu; Schemat,
 * Wprawa i „Proste” tylko otwierają drzwi. Każdy przedmiot ma **przepis standardowy** (wzór
 * z NOE s. 144–146), a tabele profesji Speca (s. 80–84) dokładają **przepisy profesji** —
 * obok, nie zamiast, i tylko dla tej profesji (D22). Z WKK profesja nie jest osobnym przepisem,
 * tylko cechą wykonawcy (D26) — tabela daje wtedy już tylko listę przedmiotów, podział
 * surowców i zestaw narzędzi profesji.
 *
 * Trzy źródła przepisów:
 *
 * 1. **Tabele** — sześć profesji i elaboracja amunicji (s. 136; tabela *narzędzia*, nie
 *    profesji — ma ją każdy biegły w narzędziach rusznikarza). Liczby przepisane z podręcznika
 *    z poprawkami D31 (literówki). Wiersze-kategorie Rusznikarstwa rozwinięte na bronie.
 * 2. **Generator z katalogów** — każdy wpis katalogu modułu z ceną dostaje przepis standardowy:
 *    wzór + jawna lista narzędzi (domyślna z kategorii, nadpisywalna per wpis) + profil
 *    podziału surowców (domyślny z kategorii; gdy przedmiot ma wiersz w tabeli profesji —
 *    proporcje z tabeli, D22).
 * 3. **Przepis ad hoc MG** — powstaje w runtime (E2), nie tutaj.
 *
 * Wynik przepisu wskazuje wpis w `KATALOG` przez `ref` = `<źródło>:<id>`:
 *   weapon / armor / ammo / grenade / chemia / addon / prowiant / toolkit / gear / magazine /
 *   item (przedmioty z `items/*.mjs`) / pojazd (wynik: aktor — karta dla MG do M4) /
 *   raw (przedmiot z cennika NOE bez katalogu modułu — zwykły `loot` z ceną i wagą) /
 *   tabela (wiersz tabeli bez ceny w podręczniku; cena = 2 × surowce z tabeli, D-audyt §5.1b).
 * `raw:` i `tabela:` to zadania dla katalogów — `validate:recipes` je wypisuje.
 *
 * Repo jest publiczne: same liczby, parafrazy i numery stron — żadnych cytatów.
 * Plik jest czysty (bez `game`), bo czyta go też `dev/validate-recipes.mjs` w Node.
 */

import { WEAPONS } from "./weapons-data.mjs";
import { ARMORS } from "./armor-data.mjs";
import { AMMO_CALIBERS, GRENADE_TYPES } from "./ammo-data.mjs";
import { CHEMIA } from "./chemia-data.mjs";
import { ADDON_DEFS } from "./addons-data.mjs";
import { PROWIANT_CATALOG } from "./prowiant-data.mjs";
import { TOOLKITS } from "./toolkits-data.mjs";
import { REAL_GEAR, GEAR_PLACEHOLDERS } from "./gear-data.mjs";
import { MAGAZINES, magClass } from "./magazines-data.mjs";
import { PODWOZIA } from "./vehicles-data.mjs";
import { LATARKA_FORMS } from "../items/latarka.mjs";
import { GOGLE_VARIANTS } from "../items/gogle.mjs";
import { BATERIE_ITEM } from "../items/baterie.mjs";
import { DETONATOR, ELECTRIC_FUZE } from "../items/detonator.mjs";
import { KWAS } from "../items/kwas.mjs";
import { parseToolExpr, toolExprString } from "./tool-expr.mjs";
import {
  parseSurowce, budzetSurowcow, standardoweMinuty, stZWartosci, podzielBudzet, profilZLinii, sumaGb
} from "./production-rules.mjs";

/* ============================================ */
/*  1. Profesje — zestawy i tabele              */
/* ============================================ */

/**
 * Sześć profesji Speca z tabelami schematów. `zestaw` = narzędzia wymienione w opisie
 * zdolności: bez WKK to część wymogu przepisu profesji (D22), z WKK pełny zestaw pod ręką
 * daje ×0,5 zamiast ×0,75 (D32).
 */
export const PROFESJE = Object.freeze({
  pirotechnika: Object.freeze({ label: "Pirotechnika", zestaw: "chemika & rusznikarza", s: 80 }),
  rusznikarstwo: Object.freeze({ label: "Rusznikarstwo", zestaw: "kowala & rusznikarza", s: 81 }),
  farmacja: Object.freeze({ label: "Farmacja", zestaw: "chemika & aptekarza", s: 82 }),
  mechanika: Object.freeze({ label: "Mechanika", zestaw: "mechanika & kowala", s: 82 }),
  hakerstwo: Object.freeze({ label: "Hakerstwo", zestaw: "hakera & elektronika", s: 83 }),
  serwisowanie: Object.freeze({ label: "Serwisowanie", zestaw: "chemika & elektronika", s: 84 })
});

/**
 * Wiersz tabeli: `[nazwa w tabeli, ref, ilość, ST, czas, surowce]`.
 * Czas: liczba = godziny; `"1min"` = minuty (tylko Koktajl Mołotowa, D30).
 * `ref` wskazuje `KATALOG`; wiersze usług i aktorów bez katalogu mają `usluga:` / `aktor:`.
 */
const T = (nazwa, ref, ilosc, st, czas, surowce, extra = {}) => ({ nazwa, ref, ilosc, st, czas, surowce, ...extra });

const TABELE = {
  /* s. 80 — narzędzia chemika i rusznikarza */
  pirotechnika: [
    T("Dynamit (laska)", "grenade:grenade-dynamite", 1, 15, 20, "19 CH, 1 MK"),
    T("Granat dymny", "grenade:grenade-smoke", 1, 15, 20, "15 CH, 4 CZ, 1 MK"),
    T("Granat gazowy", "grenade:grenade-gas", 1, 20, 30, "25 CH, 4 CZ, 1 MK"),
    T("Granat hukowy", "grenade:grenade-flashbang", 1, 20, 30, "25 CH, 4 CZ, 1 MK"),
    T("Granat improwizowany", "grenade:grenade-improvised", 1, 10, 10, "9 CH, 1 MK/MO"),
    T("Granat odłamkowy", "grenade:grenade-frag", 1, 20, 35, "30 CH, 4 CZ, 1 MK"),
    T("Granat zapalający", "grenade:grenade-incendiary", 1, 20, 35, "30 CH, 4 CZ, 1 MK"),
    T("Granat 40 mm", "ammo:40mm", 1, 15, 15, "10 CH, 3 CZ, 2 MK"),
    T("IED", "grenade:grenade-ied", 1, 15, 20, "5 CE, 10 CH, 4 CZ, 1 MK"),
    // D30: „1 minuta” to błąd tabeli, nie wyjątek — bez WKK zostaje dosłownie (D22),
    // z WKK tabele nie niosą liczb (D26), więc czas i tak idzie ze wzoru.
    T("Koktajl Mołotowa", "grenade:grenade-molotov", 1, 5, "1min", "4 CH, 1 MK"),
    T("Mina przeciwpiechotna", "grenade:grenade-antipersonnel-mine", 1, 25, 40, "30 CH, 5 CZ, 5 MK"),
    T("Mina przeciwpancerna", "grenade:grenade-antivehicle-mine", 1, 25, 60, "5 CE, 40 CH, 5 CZ, 10 MK"),
    T("Plastik C4 (100 g)", "grenade:grenade-c4-remote", 1, 25, 50, "50 CH"),
    T("Pocisk 60 mm", "ammo:60mm", 1, 20, 30, "25 CH, 1 CZ, 4 MK"),
    T("Proch czarny (20 g)", "raw:proch-czarny-20g", 1, 10, 5, "2 CH, 3 MK/MO"),
    T("Proch strzelniczy (20 g)", "raw:proch-strzelniczy-20g", 1, 15, 10, "5 CH, 5 MK/MO")
  ],

  /* s. 81 — narzędzia kowala i rusznikarza. Wiersze-kategorie rozwija `_kategorieRusznikarstwa`. */
  rusznikarstwo: [
    T("Celownik trytowy", "addon:celownik-trytowy", 1, 10, 20, "9 CZ, 1 MK"),
    T("Chwyt przedni", "addon:chwyt-przedni", 1, 10, 20, "5 CZ, 5 MK"),
    T("Dwójnóg", "addon:dwojnog", 1, 15, 30, "5 CZ, 10 MK/MO"),
    T("Granatnik podwieszany", "addon:granatnik", 1, 20, 70, "15 CZ, 20 MK"),
    T("Kolba dostawna", "addon:kolba-dostawna", 1, 10, 20, "10 MK/MO"),
    T("Kolba składana", "addon:kolba-skladana", 1, 15, 30, "1 CZ, 14 MK/MO"),
    T("Konwersja komory i lufy", "addon:konwersja", 1, 20, 60, "5 CZ, 25 MK"),
    T("Nowy zestaw sprężyn", "addon:zestaw-sprezyn", 1, 15, 40, "20 CZ"),
    T("Okładziny uchwytu", "addon:okladziny", 1, 10, 20, "10 MK/MO"),
    T("Pocisk 60 mm", "ammo:60mm", 1, 20, 30, "20 CH, 1 CZ, 9 MK"),
    T("Pocisk 120 mm", "ammo:120mm", 1, 25, 45, "40 CH, 1 CZ, 4 MK"),
    T("Szyna montażowa", "addon:szyna", 1, 15, 30, "1 CZ, 14 MK"),
    T("Śrutówka podlufowa", "addon:srutowka-podlufowa", 1, 20, 50, "15 CZ, 10 MK"),
    T("Tłumik", "addon:tlumik", 1, 20, 60, "10 CZ, 20 MK"),
    T("Trójnóg", "addon:trojnog", 1, 15, 40, "5 CZ, 15 MK/MO"),
    T("Uchwyt bagnetu", "addon:uchwyt-bagnetu", 1, 5, 10, "5 MK"),
    T("Zmiana pojemności magazynka", "tabela:zmiana-pojemnosci-magazynka", 1, 10, 20, "5 CZ, 5 MK")
  ],

  /* s. 82 — narzędzia chemika i aptekarza */
  farmacja: [
    T("Antybiotyk (10 dawek)", "chemia:antybiotyk", 1, 10, 20, "20 CH/MO"),
    T("Alkohol tani (1 l)", "chemia:alkoholTani", 1, 10, 3, "3 CH/MO"),
    T("AR 23", "chemia:ar23", 1, 25, 35, "33 CH, 1 CZ, 1 MK"),
    T("AR-35 BETA", "chemia:ar35", 1, 25, 50, "49 CH, 1 CZ, 1 MK"),
    T("Deadline", "chemia:deadline", 1, 20, 25, "25 CH/MO, 1 MK"),
    T("Detoks (5 fiolek)", "chemia:detoks", 1, 10, 20, "20 CH/MO"),
    T("Medpak", "chemia:medpak", 1, 15, 13, "11 CH/MO, 1 CZ, 1 MK"),
    T("Nitrogliceryna (20 g)", "raw:nitrogliceryna-20g", 1, 15, 10, "10 CH/MO"),
    T("Painkiller (10 tabletek)", "chemia:painkiller", 1, 10, 10, "10 CH/MO"),
    T("Pocisk-strzykawka", "ammo:strzykawka", 1, 10, 3, "2 CZ, 1 MK"),
    T("Proch czarny (20 g)", "raw:proch-czarny-20g", 1, 10, 5, "2 CH, 3 MK/MO"),
    T("Proch strzelniczy (20 g)", "raw:proch-strzelniczy-20g", 1, 15, 10, "5 CH, 5 MK/MO"),
    T("RadOff", "chemia:radoff", 1, 15, 15, "14 CH/MO, 1 MK"),
    T("Środki dezynfekujące (1 l)", "raw:srodki-dezynfekujace", 1, 10, 5, "5 CH/MO"),
    T("Środek usypiający (1 fiolka)", "raw:srodek-usypiajacy", 1, 10, 10, "10 CH/MO"),
    T("Tornado (1 działka)", "chemia:tornado", 1, 25, 50, "50 CH/MO"),
    T("Trybiotyl (1 porcja)", "chemia:trybiotyl", 1, 15, 15, "15 CH/MO"),
    T("Trucizna (1 fiolka)", "raw:trucizna", 1, 10, 10, "10 CH/MO"),
    T("Uzupełnienie zestawu małego medyka", "item:medyk-refill", 1, 10, 5, "5 CH/MO, 1 MK"),
    T("WD-TABS (10 tabletek)", "chemia:wdTabs", 1, 10, 10, "10 CH/MO"),
    T("Zamiennik dowolnego leku (5 dawek)", "tabela:zamiennik-leku", 1, 20, 10, "10 CH/MO")
  ],

  /* s. 82 — narzędzia mechanika i kowala */
  mechanika: [
    T("Buggy", "pojazd:buggy", 1, 20, 500, "50 CZ, 200 MK"),
    T("Deskorolka", "pojazd:deskorolka", 1, 5, 20, "5 CZ, 5 MK"),
    T("Motorower", "pojazd:motorower", 1, 20, 200, "50 CZ, 50 MK"),
    T("Motocykl", "pojazd:motocykl", 1, 25, 300, "50 CZ, 100 MK"),
    T("Osobówka (składak)", "pojazd:osobowka", 1, 20, 1000, "100 CZ, 400 MK"),
    T("Paralotnia", "tabela:paralotnia", 1, 25, 100, "20 CZ, 30 MK"),
    T("Pancerz wspomagany", "armor:pancerz-stalowej-policji", 1, 30, 1000, "100 CE, 100 CZ, 300 MK"),
    T("Rower", "pojazd:rower", 1, 10, 40, "10 CZ, 10 MK"),
    T("Traktor (mały)", "pojazd:traktor", 1, 20, 1000, "100 CZ, 400 MK"),
    // D31: tabela ma 19 MK — 20 h przy cenie 20 gb dają 10 gb surowców (docs/Errata-produkcja.md).
    T("Wózek typu dwukółka", "gear:wozek", 1, 10, 20, "1 CZ, 9 MK", { errata: "19 MK → 9 MK" })
  ],

  /* s. 83 — narzędzia hakera i elektronika */
  hakerstwo: [
    T("Adapter wifi", "tabela:adapter-wifi", 1, 10, 30, "10 CE, 4 CZ, 1 MK"),
    T("Dron kroczący", "tabela:dron-kroczacy", 1, 20, 70, "15 CE, 1 CH, 10 CZ, 9 MK"),
    T("Dron latający", "tabela:dron-latajacy", 1, 25, 90, "10 CE, 1 CH, 29 CZ, 5 MK"),
    T("Komputer osobisty", "raw:komputer-osobisty", 1, 15, 40, "15 CE, 1 CH, 3 CZ, 1 MK"),
    T("Komputer gamingowy", "raw:komputer-gamingowy", 1, 25, 80, "30 CE, 1 CH, 8 CZ, 1 MK"),
    T("Kontroler zdalnego sterowania (100 m)", "raw:kontroler", 1, 15, 40, "10 CE, 9 CZ, 1 MK"),
    T("Laptop", "raw:laptop", 1, 25, 80, "30 CE, 1 CH, 8 CZ, 1 MK"),
    T("Laptop wojskowy", "gear:laptop_wojskowy", 1, 30, 140, "50 CE, 1 CH, 14 CZ, 5 MK"),
    T("Monitorek", "tabela:monitorek", 1, 10, 20, "7 CE, 2 CZ, 1 MK"),
    T("Nośnik danych", "raw:nosnik-danych", 1, 10, 20, "8 CE, 1 CZ, 1 MK"),
    T("Przeprogramowanie malutkiej i małej maszyny Molocha", "tabela:przeprogramowanie-mala", 1, 10, 25, "10 CE, 2 CZ"),
    T("Przeprogramowanie średniej maszyny Molocha", "tabela:przeprogramowanie-srednia", 1, 15, 50, "20 CE, 5 CZ"),
    T("Przeprogramowanie dużej maszyny Molocha", "tabela:przeprogramowanie-duza", 1, 20, 100, "40 CE, 10 CZ"),
    T("Router", "tabela:router", 1, 10, 20, "8 CE, 1 CZ, 1 MK")
  ],

  /* s. 84 — narzędzia chemika i elektronika */
  serwisowanie: [
    T("Agregat", "raw:agregat", 1, 20, 50, "1 CE, 15 CZ, 9 MK"),
    T("Akumulator", "raw:akumulator", 1, 15, 40, "5 CH, 10 CZ, 5 MK"),
    T("Alternator", "raw:alternator", 1, 15, 40, "15 CZ, 1 CE, 4 MK"),
    T("Baterie", "item:baterie", 1, 10, 20, "9 CH, 1 MK"),
    // D31: tabela ma 20 h — 20 gb surowców i cena 40 gb dają 40 h (docs/Errata-produkcja.md).
    T("Celownik optyczny", "addon:celownik-optyczny", 1, 15, 40, "5 CE, 5 CZ, 10 MK", { errata: "20 h → 40 h" }),
    T("Defibrylator", "raw:defibrylator", 1, 20, 60, "5 CE, 20 CZ, 5 MK"),
    T("Detektor ruchu", "raw:detektor-ruchu", 1, 25, 80, "30 CE, 5 CZ, 5 MK"),
    T("Krótkofalówka", "raw:krotkofalowka", 1, 10, 24, "1 CE, 10 CZ, 1 MK"),
    T("Kompas", "raw:kompas", 1, 5, 4, "1 CZ, 1 MK"),
    T("Laserowy wskaźnik celu", "addon:laserowy-wskaznik", 1, 20, 60, "9 CE, 20 CZ, 1 MK"),
    T("Latarka", "item:latarka-reczna", 1, 10, 20, "9 CZ, 1 MK"),
    T("Miernik skażenia chemicznego", "raw:miernik-skazenia", 1, 20, 50, "5 CE, 5 CH, 10 CZ, 5 MK"),
    T("Miernik promieniowania", "raw:miernik-promieniowania", 1, 15, 30, "3 CE, 2 CH, 8 CZ, 2 MK"),
    T("Noktowizor", "addon:noktowizor", 1, 20, 70, "25 CE, 7 CZ, 3 MK"),
    T("Palnik acetylenowo-tlenowy", "raw:palnik", 1, 10, 20, "2 CH, 5 CZ, 3 MK"),
    T("Odtwarzacz CD", "raw:odtwarzacz-cd", 1, 15, 40, "15 CE, 4 CZ, 1 MK"),
    T("Powiększalnik", "addon:powiekszalnik", 1, 20, 60, "9 CE, 20 CZ, 1 MK"),
    T("Radio", "raw:radio", 1, 10, 15, "3 CE, 3 CZ, 1 MK"),
    T("Termowizor", "addon:termowizor", 1, 30, 200, "90 CE, 5 CZ, 5 MK"),
    T("Turbina wiatrowa/wodna", "raw:turbina", 1, 20, 60, "5 CE, 10 CZ, 15 MK"),
    T("Wykrywacz metalu", "raw:wykrywacz-metalu", 1, 15, 30, "5 CE, 5 CZ, 5 MK"),
    T("Wytrychy elektroniczne", "raw:wytrychy-elektroniczne", 1, 20, 50, "20 CE, 4 CZ, 1 MK"),
    T("Zapalnik elektryczny", "item:zapalnik-elektryczny", 1, 5, 5, "5 CZ"),
    T("Zegarek", "tabela:zegarek", 1, 10, 20, "9 CZ, 1 MK")
  ]
};

/**
 * s. 81 — wiersze-kategorie Rusznikarstwa: jedno ST na kategorię, czas „cena × 1 h”
 * (ciężka i specjalna: „koszt × 2 h”, koszt = cena — L4), surowce „(CZ + MK) = 50% ceny”,
 * czyli jedna linia z alternatywą: dowolna mieszanka CZ i MK.
 */
const RUSZNIKARSTWO_KATEGORIE = Object.freeze([
  { nazwa: "Broń palna krótka", st: 15, godzinNaGb: 1, pasuje: w => w.type === "palnaKrotka" },
  { nazwa: "Broń palna pośrednia", st: 20, godzinNaGb: 1, pasuje: w => w.type === "palnaPosr" },
  { nazwa: "Broń palna długa", st: 25, godzinNaGb: 1, pasuje: w => w.type === "palnaDluga" },
  { nazwa: "Broń miotana: kusze", st: 20, godzinNaGb: 1, pasuje: w => w.type === "miotana" && w.id.startsWith("kusza") },
  { nazwa: "Broń palna ciężka i specjalna", st: 25, godzinNaGb: 2, pasuje: w => w.type === "palnaCiezka" || w.type === "specjalna" }
]);

/** s. 136 — elaboracja amunicji: tabela narzędzi rusznikarza, ST 10 dla całej tabeli. */
const ELABORACJA = [
  T(".38 SPL (18 szt.)", "ammo:38spl", 18, 10, 9, "8 CH, 1 MK"),
  T("9 mm (10 szt.)", "ammo:9mm", 10, 10, 10, "9 CH, 1 MK"),
  T(".45 ACP (6 szt.)", "ammo:45acp", 6, 10, 9, "8 CH, 1 MK"),
  T(".44 Mag (6 szt.)", "ammo:44mag", 6, 10, 9, "8 CH, 1 MK"),
  T("5,56 mm (6 szt.)", "ammo:556", 6, 10, 9, "8 CH, 1 MK"),
  T("7,62 × 39 mm (5 szt.)", "ammo:76239ak", 5, 10, 10, "9 CH, 1 MK"),
  T("7,62 mm (5 szt.)", "ammo:762", 5, 10, 10, "9 CH, 1 MK"),
  T(".30-06 (5 szt.)", "ammo:3006", 5, 10, 10, "9 CH, 1 MK"),
  T(".50 BMG (2 szt.)", "ammo:50bmg", 2, 10, 10, "9 CH, 1 MK"),
  T(".12 Ga (ś) (10 szt.)", "ammo:12ga_s", 10, 10, 10, "9 CH, 1 MK"),
  T(".12 Ga (b) (10 szt.)", "ammo:12ga_b", 10, 10, 10, "9 CH, 1 MK")
];
const ELABORACJA_NARZEDZIA = "rusznikarza";

/* ============================================ */
/*  2. Kategorie — domyślne narzędzia i podział */
/* ============================================ */

/**
 * Domyślny wymóg narzędzi i profil podziału surowców per kategoria (L11). Narzędzia z list
 * „Produkcja” zestawów (s. 134–136); pozycja z list dwóch narzędzi dostaje „lub”. Profile
 * z przykładów podręcznika i tabel profesji (granat odłamkowy 30/4/1, elaboracja 9/1, pojazdy
 * 1:4). Podział to podpowiedź — MG może go zmienić przy starcie Roboty.
 */
export const KATEGORIE = Object.freeze({
  "bron-biala": { label: "Broń biała", narzedzia: "kowala", profil: "4 MK, 1 CZ" },
  "bron-miotana": { label: "Broń miotana", narzedzia: "stolarza | kowala", profil: "7 MK, 3 MO" },
  "luki": { label: "Łuki", narzedzia: "stolarza", profil: "7 MK, 3 MO" },
  "kusze": { label: "Kusze", narzedzia: "rusznikarza", profil: "1 CZ/MK" },
  "bron-palna": { label: "Broń palna", narzedzia: "rusznikarza", profil: "1 CZ/MK" },
  "amunicja": { label: "Amunicja", narzedzia: "rusznikarza", profil: "9 CH, 1 MK", jednorazowy: true },
  "amunicja-ciezka": { label: "Pociski granatnikowe", narzedzia: "chemika & rusznikarza", profil: "25 CH, 1 CZ, 4 MK", jednorazowy: true },
  "pociski": { label: "Pociski miotane", narzedzia: "kowala | stolarza", profil: "1 MK", jednorazowy: true },
  "granaty": { label: "Granaty, miny, ładunki", narzedzia: "chemika & rusznikarza", profil: "30 CH, 4 CZ, 1 MK", jednorazowy: true },
  "pancerz": { label: "Pancerze", narzedzia: "kowala", profil: "9 MK, 1 CZ" },
  "leki": { label: "Leki", narzedzia: "aptekarza", profil: "19 CH/MO, 1 MK", jednorazowy: true },
  "narkotyki": { label: "Narkotyki", narzedzia: "chemika", profil: "1 CH/MO", jednorazowy: true },
  "uzywki": { label: "Używki", narzedzia: "gorzelnika", profil: "1 CH/MO", jednorazowy: true },
  "materialy-wybuchowe": { label: "Materiały pirotechniczne", narzedzia: "chemika", profil: "1 CH, 1 MK/MO", jednorazowy: true },
  "chemia-uzytkowa": { label: "Chemia użytkowa", narzedzia: "chemika", profil: "1 CH/MO", jednorazowy: true },
  "ulepszenia-biale": { label: "Ulepszenia broni białej", narzedzia: "kowala", profil: "7 MK, 3 CZ" },
  "ulepszenia-dystansowe": { label: "Ulepszenia broni dystansowej", narzedzia: "rusznikarza", profil: "1 CZ, 1 MK" },
  "optyka": { label: "Optyka", narzedzia: "szklarza | elektronika", profil: "2 CE, 1 CZ, 2 MK" },
  "elektronika": { label: "Elektronika", narzedzia: "elektronika", profil: "6 CE, 3 CZ, 1 MK", tagi: ["elektronika"] },
  "komputery": { label: "Komputery", narzedzia: "hakera & elektronika", profil: "30 CE, 1 CH, 8 CZ, 1 MK", tagi: ["elektronika"] },
  "prowiant": { label: "Prowiant", narzedzia: "kucharza", profil: "1 MO", jednorazowy: true },
  "woda": { label: "Woda", narzedzia: "gorzelnika", profil: "1 MO", jednorazowy: true },
  "zestawy": { label: "Zestawy narzędzi", narzedzia: "kowala", profil: "3 MK, 2 CZ" },
  "sprzet": { label: "Sprzęt", narzedzia: "kowala", profil: "4 MK, 1 CZ" },
  "magazynki": { label: "Magazynki", narzedzia: "rusznikarza", profil: "3 CZ, 2 MK" },
  "pojazdy": { label: "Pojazdy", narzedzia: "mechanika", profil: "1 CZ, 4 MK" },
  "uslugi": { label: "Usługi", narzedzia: "", profil: "1 CZ" }
});

/**
 * Nadpisania per wpis katalogu: `narzedzia`, `profil`, `jednorazowy`, `tagi`, `kategoria`,
 * `produkcja: false` (nie da się wyprodukować — surowiec naturalny, rekwizyt fabularny).
 * Pusty `narzedzia: ""` to decyzja „bez narzędzi”, zapisana wprost.
 */
const NADPISANIA = {
  /* Broń biała i miotana — listy kowala i stolarza (s. 135–136) */
  "weapon:bat": { narzedzia: "krawca", profil: "4 MO, 1 MK" },
  "weapon:bejsbol-rurka": { narzedzia: "kowala | stolarza" },
  "weapon:widly": { narzedzia: "kowala | stolarza" },
  "weapon:wlocznia": { narzedzia: "kowala | stolarza" },
  "weapon:oszczep": { narzedzia: "kowala | stolarza" },
  "weapon:pila-spalinowa": { narzedzia: "mechanika & kowala", profil: "2 CZ, 3 MK", tagi: ["pojazd-mechaniczny"] },
  "weapon:pilomiecz": { narzedzia: "mechanika & kowala", profil: "2 CZ, 3 MK" },
  "weapon:szoker": { narzedzia: "elektronika & kowala", profil: "2 CE, 1 CZ, 2 MK", tagi: ["elektronika"] },
  "weapon:bolas": { narzedzia: "klusownika | krawca", profil: "3 MK, 2 MO" },
  "weapon:dmuchawka": { narzedzia: "stolarza | slusarza" },
  "weapon:bumerang": { narzedzia: "stolarza" },
  "weapon:noz-do-rzucania": { narzedzia: "kowala", profil: "4 MK, 1 CZ" },
  "weapon:proca": { narzedzia: "stolarza | krawca", profil: "1 MK, 1 MO" },
  "weapon:zloty-desert-eagle": { produkcja: false }, // WKK — rekwizyt jednego gracza, nie przedmiot seryjny
  // Pogromca i jego naboje — tylko przez zdolność Łowcy mutantów (PRZEPISY_ZDOLNOSCI, D35).
  "weapon:pogromca": { produkcja: false },
  "ammo:pogromca-trucizna": { produkcja: false },
  "ammo:pogromca-kwas": { produkcja: false },
  "ammo:pogromca-ogien": { produkcja: false },

  /* Pancerze — krawiec: lekkie pancerze; kowal: płyty, zbroje śmieciowe, hełm, tarcze (s. 135) */
  "armor:kurtka-cwiekowana": { narzedzia: "krawca", profil: "3 MO, 2 MK" },
  "armor:pancerz-skorzany": { narzedzia: "krawca", profil: "9 MO, 1 MK" },
  "armor:koscianiy-pancerz": { narzedzia: "krawca | kowala", profil: "4 MO, 1 MK" },
  "armor:plate-carrier-i": { narzedzia: "krawca & kowala" },
  "armor:plate-carrier-ii": { narzedzia: "krawca & kowala" },
  "armor:plate-carrier-iii": { narzedzia: "krawca & kowala" },
  "armor:kamizelka-taktyczna": { narzedzia: "krawca" },
  "armor:pancerz-kompozytowy": { narzedzia: "kowala & krawca" },
  "armor:pancerz-stalowej-policji": { narzedzia: "mechanika & kowala" },
  "armor:wojskowy-pancerz-hydrauliczny": { narzedzia: "mechanika & kowala", profil: "1 CE, 1 CZ, 3 MK" },
  "armor:ochraniacze-nog": { narzedzia: "kowala | krawca" },
  "armor:ochraniacze-rak": { narzedzia: "kowala | krawca" },

  /* Amunicja */
  "ammo:22lr": { produkcja: false }, // NOE: „nie można elaborować”
  "ammo:strzala": { kategoria: "pociski" },
  "ammo:belt": { kategoria: "pociski" },
  "ammo:kulka": { kategoria: "pociski", narzedzia: "kowala" },
  "ammo:igla": { kategoria: "pociski", narzedzia: "kowala" },
  "ammo:strzykawka": { kategoria: "pociski", narzedzia: "medyka | aptekarza" },
  "ammo:race": { narzedzia: "chemika", profil: "4 CH, 1 CZ" },
  "ammo:40mm": { kategoria: "amunicja-ciezka" },
  "ammo:60mm": { kategoria: "amunicja-ciezka" },
  "ammo:120mm": { kategoria: "amunicja-ciezka" },

  /* Granaty i ładunki — chemik: koktajl Mołotowa, proch (s. 134) */
  "grenade:grenade-molotov": { narzedzia: "chemika" },
  "grenade:grenade-dynamite": { narzedzia: "chemika" },
  "grenade:grenade-c4-remote": { narzedzia: "chemika" },
  "grenade:grenade-improvised": { narzedzia: "chemika" },
  "grenade:grenade-ied": { narzedzia: "chemika & elektronika" },
  "grenade:grenade-signal": { narzedzia: "chemika" },

  /* Chemia — aptekarz: painkillery (także medyk, s. 135), gorzelnik: alkohol */
  "chemia:painkiller": { narzedzia: "aptekarza | medyka" },
  "chemia:ar23": { narzedzia: "chemika & aptekarza" },
  "chemia:ar35": { narzedzia: "chemika & aptekarza" },
  "chemia:deadline": { narzedzia: "chemika & aptekarza" },
  "chemia:anestix": { narzedzia: "chemika & aptekarza" },
  "chemia:alkoholTani": { kategoria: "uzywki" },
  "chemia:alkoholMarkowy": { kategoria: "uzywki" },
  "chemia:cygaro": { narzedzia: "", profil: "1 MO" },
  "chemia:papieros": { narzedzia: "", profil: "1 MO" },
  "chemia:tytonDoZucia": { narzedzia: "", profil: "1 MO" },

  /* Ulepszenia — elektronika i optyka poza rusznikarzem */
  "addon:szoker": { narzedzia: "elektronika & kowala", profil: "2 CE, 1 CZ, 2 MK", tagi: ["elektronika"] },
  "addon:dozownik": { narzedzia: "kowala", profil: "1 MK, 1 CZ" },
  "addon:bagnet": { narzedzia: "kowala", profil: "4 MK, 1 CZ" },
  "addon:celownik-optyczny": { kategoria: "optyka" },
  "addon:kolimator": { kategoria: "optyka" },
  "addon:powiekszalnik": { kategoria: "optyka" },
  "addon:laserowy-wskaznik": { kategoria: "elektronika" },
  "addon:noktowizor": { kategoria: "elektronika" },
  "addon:termowizor": { kategoria: "elektronika" },
  "addon:latarka": { kategoria: "elektronika" },

  /* Prowiant — kucharz, kłusownik (s. 135); surowce naturalne się zdobywa, nie produkuje */
  "prowiant:prowiant": { narzedzia: "kucharza | klusownika" },
  "prowiant:mieso_suszone": { narzedzia: "kucharza | klusownika" },
  "prowiant:mieso": { produkcja: false },
  "prowiant:ryby": { produkcja: false },
  "prowiant:owoce": { produkcja: false },
  "prowiant:mleko": { produkcja: false },
  "prowiant:woda_brudna": { produkcja: false },
  // Uzdatnianie wody (chemik, s. 134) to przeróbka brudnej wody, nie produkcja z surowców — wzór
  // dawałby 0 gb surowców (cena 1 gb), czyli wodę z niczego.
  "prowiant:woda_pitna": { produkcja: false },

  /* Zestawy narzędzi */
  "toolkit:stolarza": { narzedzia: "stolarza | kowala" },
  "toolkit:elektronika": { narzedzia: "elektronika", profil: "1 CE, 1 CZ, 1 MK" },
  "toolkit:hakera": { narzedzia: "elektronika & hakera", profil: "2 CE, 1 CZ, 1 MK" },
  "toolkit:chemika": { narzedzia: "szklarza | kowala" },
  "toolkit:aptekarza": { narzedzia: "szklarza | kowala" },
  "toolkit:gorzelnika": { narzedzia: "szklarza | kowala" },
  "toolkit:krawca": { narzedzia: "krawca | kowala" },
  "toolkit:medyka": { narzedzia: "aptekarza & kowala", profil: "1 CH/MO, 1 MK" },

  /* Sprzęt */
  "gear:sidla": { narzedzia: "klusownika | kowala", profil: "1 MK" },
  "gear:sprzet_wspinaczkowy": { narzedzia: "kowala | krawca" },
  "gear:strzaly": { narzedzia: "kowala | stolarza", profil: "1 MK", jednorazowy: true },
  "gear:wozek": { narzedzia: "kowala | mechanika" },
  "gear:laptop_wojskowy": { kategoria: "komputery" },
  "gear:emulator_kart": { kategoria: "elektronika" },

  /* Pojazdy — tag dla „Jeśli ma silnik, to ruszy” tylko przy silniku */
  "pojazd:deskorolka": { narzedzia: "stolarza", profil: "1 CZ, 1 MK" },
  "pojazd:rower": { narzedzia: "mechanika" }
};

/* ============================================ */
/*  3. Przedmioty z cennika NOE bez katalogu     */
/* ============================================ */

/**
 * Cele przepisów, których moduł nie ma jeszcze jako przedmiotów z mechaniką. Cena i waga
 * z cennika (s. 138 Elektronika, s. 139 Różności, s. 137 materiały pirotechniczne); przedział
 * wag → środek. Produkcja tworzy zwykły `loot`. Każdy wpis to zadanie dla katalogów.
 */
const RAW_PRZEDMIOTY = [
  ["agregat", "Agregat", 50, 15, 138, "elektronika", { narzedzia: "mechanika | elektronika" }],
  ["akumulator", "Akumulator", 40, 20, 138, "elektronika"],
  ["alternator", "Alternator", 40, 5, 138, "elektronika", { narzedzia: "mechanika | elektronika" }],
  ["defibrylator", "Defibrylator", 60, 10, 138, "elektronika"],
  ["detektor-ruchu", "Detektor ruchu", 80, 1, 138, "elektronika"],
  ["komputer-osobisty", "Komputer osobisty", 40, 15, 138, "komputery"],
  ["komputer-gamingowy", "Komputer gamingowy", 80, 15, 138, "komputery"],
  ["kontroler", "Kontroler zdalnego sterowania", 40, 2, 138, "elektronika"],
  ["krotkofalowka", "Krótkofalówka", 25, 2, 138, "elektronika"],
  ["laptop", "Laptop", 80, 5, 138, "komputery"],
  ["miernik-skazenia", "Miernik skażenia chemicznego", 50, 5, 138, "elektronika"],
  ["miernik-promieniowania", "Miernik promieniowania", 30, 3, 138, "elektronika"],
  ["nosnik-danych", "Nośnik danych", 40, 0.5, 138, "elektronika"],
  ["odtwarzacz-cd", "Odtwarzacz CD", 40, 1.5, 138, "elektronika"],
  ["radio", "Radio", 15, 2.5, 138, "elektronika"],
  ["turbina", "Turbina wiatrowa/wodna", 60, 25, 138, "elektronika", { narzedzia: "mechanika | elektronika" }],
  ["wykrywacz-metalu", "Wykrywacz metalu", 30, 3, 138, "elektronika"],
  ["wytrychy-elektroniczne", "Wytrychy elektroniczne", 25, 0.5, 138, "elektronika"],
  ["kompas", "Kompas", 10, 0.1, 139, "sprzet", { narzedzia: "elektronika | szklarza", profil: "1 CZ, 1 MK" }],
  ["palnik", "Palnik acetylenowo-tlenowy", 20, 2, 139, "sprzet", { narzedzia: "mechanika | slusarza", profil: "2 CH, 5 CZ, 3 MK" }],
  ["klodka", "Kłódka", 10, 0.5, 139, "sprzet", { narzedzia: "kowala | slusarza" }],
  ["lopata", "Łopata", 5, 2, 139, "sprzet"],
  ["srodek-usypiajacy", "Środek usypiający (fiolka)", 20, 0.1, 139, "chemia-uzytkowa", { narzedzia: "aptekarza | chemika" }],
  ["srodki-dezynfekujace", "Środki dezynfekujące (1 l)", 10, 1, 139, "chemia-uzytkowa", { narzedzia: "chemika | gorzelnika" }],
  ["trucizna", "Trucizna (prosta, fiolka)", 20, 0.1, 139, "chemia-uzytkowa", { narzedzia: "chemika | aptekarza" }],
  // s. 137 podaje proch za 100 g (katalog `chemia` też), a tabele profesji porcję 20 g —
  // osobny przedmiot, żeby nie produkować ułamka sztuki (`system.quantity` jest całkowite).
  ["proch-czarny-20g", "Proch czarny (20 g)", 10, 0.02, 137, "materialy-wybuchowe"],
  ["proch-strzelniczy-20g", "Proch strzelniczy (20 g)", 20, 0.02, 137, "materialy-wybuchowe"],
  ["nitrogliceryna-20g", "Nitrogliceryna (20 g)", 20, 0.02, 137, "materialy-wybuchowe"]
];

/**
 * Wiersze tabel bez ceny w podręczniku (§5.1b „Bez ceny w RAW”). Cena = 2 × surowce
 * z wiersza — każdy z nich trzyma się wzoru przy tej cenie (godziny ≈ 2 × surowce przy
 * wielorazowych). Waga — szacunek MG, do potwierdzenia. `wynik`: przedmiot, aktor (drony,
 * do M3) albo usługa (karta dla MG).
 */
const TABELA_BEZ_CENY = {
  "zmiana-pojemnosci-magazynka": { nazwa: "Zmiana pojemności magazynka", wynik: "usluga", kategoria: "uslugi", narzedzia: "rusznikarza" },
  "zamiennik-leku": { nazwa: "Zamiennik leku (5 dawek)", wynik: "usluga", kategoria: "leki", jednorazowy: true },
  "paralotnia": { nazwa: "Paralotnia", wynik: "item", kategoria: "sprzet", waga: 15, narzedzia: "krawca" },
  "adapter-wifi": { nazwa: "Adapter wifi", wynik: "item", kategoria: "elektronika", waga: 0.1 },
  "dron-kroczacy": { nazwa: "Dron kroczący", wynik: "aktor", kategoria: "komputery" },
  "dron-latajacy": { nazwa: "Dron latający", wynik: "aktor", kategoria: "komputery" },
  "monitorek": { nazwa: "Monitorek", wynik: "item", kategoria: "elektronika", waga: 1 },
  "przeprogramowanie-mala": { nazwa: "Przeprogramowanie malutkiej i małej maszyny Molocha", wynik: "usluga", kategoria: "uslugi", narzedzia: "hakera" },
  "przeprogramowanie-srednia": { nazwa: "Przeprogramowanie średniej maszyny Molocha", wynik: "usluga", kategoria: "uslugi", narzedzia: "hakera" },
  "przeprogramowanie-duza": { nazwa: "Przeprogramowanie dużej maszyny Molocha", wynik: "usluga", kategoria: "uslugi", narzedzia: "hakera" },
  "router": { nazwa: "Router", wynik: "item", kategoria: "elektronika", waga: 0.5 },
  "zegarek": { nazwa: "Zegarek", wynik: "item", kategoria: "elektronika", waga: 0.1 }
};

/** Zaślepki `craftingPlaceholder` (gear-data) → cena z cennika, albo cel gdzie indziej. */
const ZASLEPKI = {
  belty: { zamiast: "ammo:belt" },
  igly: { zamiast: "ammo:igla" },
  klodka: { zamiast: "raw:klodka" },
  lopata: { zamiast: "raw:lopata" },
  lom: { bezCeny: true },
  podkowy: { bezCeny: true },
  plyty_pancerne: { bezCeny: true }
};

/* ============================================ */
/*  4. Katalog — jeden indeks celów przepisów    */
/* ============================================ */

/**
 * @typedef {object} KatalogWpis
 * @property {string} ref           `<źródło>:<id>`
 * @property {string} nazwa
 * @property {number} cena          gb za sztukę (cena podręcznikowa — L18: Kolory jej nie zmieniają)
 * @property {number} waga          kg za sztukę
 * @property {string} kategoria     klucz `KATEGORIE`
 * @property {boolean} jednorazowy
 * @property {"item"|"aktor"|"usluga"} wynik
 * @property {boolean} produkcja    false = nie da się wyprodukować
 * @property {boolean} schemat      czy generować Schemat (paczka `schematy`, E3)
 * @property {string} narzedzia     wyrażenie §5.1a (postać kanoniczna)
 * @property {{typy: string[], waga: number}[]} profil
 * @property {string[]} tagi        „elektronika”, „pojazd-mechaniczny” → Ułatwienia z Pochodzeń
 * @property {"modul"|"raw"|"tabela"} pochodzenie
 * @property {number} [s]           strona cennika NOE (raw)
 */

function _kategoriaBroni(w) {
  if (w.type === "biala") return "bron-biala";
  if (w.type === "miotana") {
    if (w.id.startsWith("kusza")) return "kusze";
    if (w.id.startsWith("luk")) return "luki";
    return "bron-miotana";
  }
  return "bron-palna";
}

function _kategoriaPancerza() { return "pancerz"; }

function _kategoriaAmunicji(c) {
  if (c.category === "Granatnikowa") return "amunicja-ciezka";
  if (c.category === "Miotana") return "pociski";
  return "amunicja";
}

function _kategoriaChemii(c) {
  if (c.subtype === "narkotyk") return "narkotyki";
  if (c.subtype === "uzywka") return "uzywki";
  if (c.subtype === "inne") return "materialy-wybuchowe";
  return "leki";
}

function _kategoriaUlepszenia(a) {
  return a.category === "biala" ? "ulepszenia-biale" : "ulepszenia-dystansowe";
}

/** Surowe wpisy katalogu (przed nadpisaniami). Jednorazowość domyślna z kategorii. */
function _surowyKatalog() {
  const out = [];
  const add = (ref, nazwa, cena, waga, kategoria, extra = {}) =>
    out.push({ ref, nazwa, cena: Number(cena) || 0, waga: Number(waga) || 0, kategoria, pochodzenie: "modul", ...extra });
  // Dostępność (%) — Schemat ma o połowę mniejszą (s. 146). Pola różnią się między plikami danych.
  const dost = x => ({ dostepnosc: x?.avail ?? x?.availability ?? x?.dostepnosc ?? null });

  // Właściwość `jednorazowa` (LAW) — czas jak dla przedmiotu jednorazowego (errata: 150 h, nie 300 h).
  for (const w of WEAPONS) {
    add(`weapon:${w.id}`, w.name, w.price, w.weight, _kategoriaBroni(w),
      { ...dost(w), ...((w.props ?? []).includes("jednorazowa") ? { jednorazowy: true } : {}) });
  }
  for (const a of ARMORS) add(`armor:${a.id}`, a.name, a.price, a.weight, _kategoriaPancerza(a), dost(a));
  for (const c of AMMO_CALIBERS) add(`ammo:${c.id}`, c.label ?? c.name, c.price, c.weight, _kategoriaAmunicji(c), dost(c));
  for (const g of GRENADE_TYPES) add(`grenade:${g.id}`, g.label, g.price, g.weight, "granaty", dost(g));
  for (const [id, c] of Object.entries(CHEMIA)) add(`chemia:${id}`, c.label, c.price, c.weight, _kategoriaChemii(c), dost(c));
  for (const a of Object.values(ADDON_DEFS)) add(`addon:${a.id}`, a.label, a.price, a.weight, _kategoriaUlepszenia(a));
  for (const p of PROWIANT_CATALOG) add(`prowiant:${p.id}`, p.label, p.price, p.weight, p.category === "woda" ? "woda" : "prowiant", dost(p));
  for (const t of TOOLKITS) add(`toolkit:${t.id}`, t.label, t.price, t.weight, "zestawy", dost(t));
  for (const g of REAL_GEAR) add(`gear:${g.id}`, g.label, g.price, g.weight, "sprzet", dost(g));
  for (const m of MAGAZINES) {
    const cls = magClass(m);
    add(`magazine:${m.id}`, m.name, cls.price, cls.weight, "magazynki", dost(cls));
  }
  for (const p of Object.values(PODWOZIA)) {
    add(`pojazd:${p.id}`, p.nazwa, p.cena, 0, "pojazdy", {
      ...dost(p), wynik: "aktor", tagi: p.silnikowy ? ["pojazd-mechaniczny"] : []
    });
  }

  // Przedmioty z `items/*.mjs` — liczby z ich własnych stałych (latarka: z buildera, patrz niżej).
  for (const [key, f] of Object.entries(LATARKA_FORMS)) {
    // `items/latarka.mjs` — buildLatarkaItemData: 0,3 kg, 15 gb z baterią, 60 gb z dynamem.
    add(`item:latarka-${key}`, f.label, f.battery ? 15 : 60, 0.3, "elektronika");
  }
  for (const [key, v] of Object.entries(GOGLE_VARIANTS)) add(`item:gogle-${key}`, v.label, v.price, v.weight, "elektronika");
  // Baterie się ładuje (s. 138), a zapalnik elektryczny ma w tabeli Serwisowania czas wielorazowego
  // (5 h przy 5 gb) — oba liczone jak wielorazowe, zgodnie z audytem w docs/Errata-produkcja.md.
  add("item:baterie", BATERIE_ITEM.label, BATERIE_ITEM.price, BATERIE_ITEM.weight, "elektronika", { profilDomyslny: "9 CH, 1 MK" });
  add("item:detonator", DETONATOR.name, DETONATOR.price, DETONATOR.weight, "elektronika");
  add("item:zapalnik-elektryczny", ELECTRIC_FUZE.name, ELECTRIC_FUZE.price, ELECTRIC_FUZE.weight, "elektronika");
  add("item:kwas", KWAS.name, KWAS.price, KWAS.weight, "chemia-uzytkowa");
  // `items/kolczatka.mjs` — buildKolczatkaItemData: 10 gb. `items/toolkit-medyk.mjs`: 5 gb, 0,5 kg.
  add("item:kolczatka", "Kolczatki", 10, 0.5, "sprzet", { narzedzia: "kowala", profil: "1 MK" });
  add("item:medyk-refill", "Uzupełnienie Narzędzi Małego Medyka", 5, 0.5, "leki");

  for (const [id, nazwa, cena, waga, s, kategoria, extra = {}] of RAW_PRZEDMIOTY) {
    out.push({ ref: `raw:${id}`, nazwa, cena, waga, kategoria, pochodzenie: "raw", s, ...extra });
  }

  // Wiersze tabel bez ceny — cena z surowców wiersza (2 × Σ).
  const wierszeBezCeny = new Map();
  for (const rows of Object.values(TABELE)) {
    for (const r of rows) if (r.ref.startsWith("tabela:") && !wierszeBezCeny.has(r.ref)) wierszeBezCeny.set(r.ref, r);
  }
  for (const [ref, row] of wierszeBezCeny) {
    const id = ref.slice("tabela:".length);
    const def = TABELA_BEZ_CENY[id];
    if (!def) continue; // validate:recipes zgłosi brak definicji
    out.push({
      ref, nazwa: def.nazwa, cena: 2 * sumaGb(parseSurowce(row.surowce)), waga: def.waga ?? 0,
      kategoria: def.kategoria, pochodzenie: "tabela", wynik: def.wynik, schemat: false,
      ...(def.narzedzia !== undefined ? { narzedzia: def.narzedzia } : {}),
      ...(def.jednorazowy !== undefined ? { jednorazowy: def.jednorazowy } : {})
    });
  }

  // Zaślepki gear-data: albo przekierowanie na prawdziwy cel, albo brak ceny (zadanie dla katalogu).
  for (const g of GEAR_PLACEHOLDERS) {
    const z = ZASLEPKI[g.id] ?? { bezCeny: true };
    out.push({
      ref: `gear:${g.id}`, nazwa: g.label, cena: 0, waga: 0, kategoria: "sprzet", pochodzenie: "modul",
      produkcja: false, zaslepka: true, zamiast: z.zamiast ?? null
    });
  }
  return out;
}

function _zbudujKatalog() {
  const map = new Map();
  for (const raw of _surowyKatalog()) {
    const nad = NADPISANIA[raw.ref] ?? {};
    const kategoria = nad.kategoria ?? raw.kategoria;
    const kat = KATEGORIE[kategoria];
    if (!kat) throw new Error(`recipes-data: nieznana kategoria „${kategoria}” (${raw.ref})`);
    const narzedziaSrc = nad.narzedzia ?? raw.narzedzia ?? kat.narzedzia;
    const profilSrc = nad.profil ?? raw.profil ?? raw.profilDomyslny ?? kat.profil;
    const entry = {
      ref: raw.ref,
      nazwa: raw.nazwa,
      cena: raw.cena,
      waga: raw.waga,
      kategoria,
      jednorazowy: nad.jednorazowy ?? raw.jednorazowy ?? !!kat.jednorazowy,
      wynik: raw.wynik ?? "item",
      produkcja: nad.produkcja ?? raw.produkcja ?? raw.cena > 0,
      schemat: raw.schemat ?? true,
      narzedzia: toolExprString(parseToolExpr(narzedziaSrc)),
      profil: profilZLinii(parseSurowce(profilSrc)).map(p => ({ typy: p.typy, waga: p.waga })),
      tagi: [...new Set([...(kat.tagi ?? []), ...(raw.tagi ?? []), ...(nad.tagi ?? [])])],
      pochodzenie: raw.pochodzenie,
      dostepnosc: raw.dostepnosc ?? null,
      ...(raw.s ? { s: raw.s } : {}),
      ...(raw.zaslepka ? { zaslepka: true, zamiast: raw.zamiast } : {})
    };
    if (map.has(entry.ref)) throw new Error(`recipes-data: zdublowany wpis katalogu ${entry.ref}`);
    map.set(entry.ref, Object.freeze(entry));
  }
  return map;
}

/** Wszystkie cele przepisów, `ref` → wpis. */
export const KATALOG = _zbudujKatalog();

/* ============================================ */
/*  5. Przepisy                                  */
/* ============================================ */

/**
 * @typedef {object} Przepis
 * @property {string} id              `std/<ref>`, `<profesja>/<ref>`, `elaboracja/<ref>`
 * @property {string} nazwa
 * @property {{typ: string, ref: string, ilosc: number}} wynik
 * @property {boolean} jednorazowy
 * @property {number} cena            gb za sztukę — próg schematu (L3)
 * @property {number} wartosc         gb za całą partię — ST ze wzoru (L3)
 * @property {number} st
 * @property {number} minuty          czas bazowy (D29)
 * @property {{typy: string[], gb: number}[]} surowce
 * @property {string} narzedzia       wyrażenie §5.1a (postać kanoniczna)
 * @property {string[]} tagi
 * @property {string|null} profesja   dla przepisów profesji
 * @property {{wzor?: true, tabela?: string, s?: number, errata?: string}} zrodlo
 */

/** Kanoniczny zapis `(a) & (b)` po parsowaniu — duplikaty i nawiasy znikają. */
function _i(a, b) {
  return toolExprString(parseToolExpr([a, b].filter(Boolean).map(x => `(${x})`).join(" & ")));
}

/** Pierwszy wiersz tabeli profesji dla danego ref — źródło domyślnego podziału standardu (D22). */
function _wierszeProfesjiWgRef() {
  const out = new Map();
  for (const rows of Object.values(TABELE)) for (const r of rows) if (!out.has(r.ref)) out.set(r.ref, r);
  return out;
}

function _minutyWiersza(czas) {
  if (czas === "1min") return 1;
  return Number(czas) * 60;
}

/** Przepis standardowy z katalogu (wzór s. 144–146). */
function _przepisStandardowy(k, profilZTabeli) {
  const ilosc = 1;
  const wartosc = k.cena * ilosc;
  const profil = profilZTabeli ?? k.profil;
  return Object.freeze({
    id: `std/${k.ref}`,
    nazwa: k.nazwa,
    wynik: Object.freeze({ typ: k.wynik, ref: k.ref, ilosc }),
    jednorazowy: k.jednorazowy,
    cena: k.cena,
    wartosc,
    st: stZWartosci(wartosc),
    minuty: standardoweMinuty(wartosc, k.jednorazowy),
    surowce: Object.freeze(podzielBudzet(budzetSurowcow(wartosc), profil)),
    narzedzia: k.narzedzia,
    tagi: k.tagi,
    profesja: null,
    zrodlo: Object.freeze({ wzor: true })
  });
}

/** Przepis z wiersza tabeli (profesji albo elaboracji). */
function _przepisZWiersza(tabela, row, { profesja, narzedzia, s }) {
  const k = KATALOG.get(row.ref);
  const cena = k?.cena ?? 0;
  return Object.freeze({
    id: `${tabela}/${row.ref}`,
    nazwa: k?.nazwa ?? row.nazwa,
    nazwaWTabeli: row.nazwa,
    wynik: Object.freeze({ typ: k?.wynik ?? "item", ref: row.ref, ilosc: row.ilosc }),
    jednorazowy: k?.jednorazowy ?? false,
    cena,
    wartosc: cena * row.ilosc,
    st: row.st,
    minuty: _minutyWiersza(row.czas),
    surowce: Object.freeze(parseSurowce(row.surowce)),
    narzedzia,
    tagi: k?.tagi ?? [],
    profesja,
    zrodlo: Object.freeze({ tabela, s, ...(row.errata ? { errata: row.errata } : {}) })
  });
}

function _kategorieRusznikarstwa() {
  const rows = [];
  for (const kat of RUSZNIKARSTWO_KATEGORIE) {
    for (const w of WEAPONS) {
      const ref = `weapon:${w.id}`;
      const k = KATALOG.get(ref);
      if (!kat.pasuje(w) || !k?.produkcja) continue;
      rows.push({
        ...T(kat.nazwa, ref, 1, kat.st, k.cena * kat.godzinNaGb, `${budzetSurowcow(k.cena)} CZ/MK`),
        kategoriaTabeli: kat.nazwa
      });
    }
  }
  return rows;
}

function _zbudujPrzepisy() {
  const standardowe = new Map();
  const profesji = new Map();
  const elaboracji = new Map();
  const profil = _wierszeProfesjiWgRef();

  for (const k of KATALOG.values()) {
    if (!k.produkcja) continue;
    const row = profil.get(k.ref);
    const p = _przepisStandardowy(k, row ? profilZLinii(parseSurowce(row.surowce)) : null);
    standardowe.set(p.id, p);
  }

  for (const [prof, def] of Object.entries(PROFESJE)) {
    const rows = [...TABELE[prof], ...(prof === "rusznikarstwo" ? _kategorieRusznikarstwa() : [])];
    for (const row of rows) {
      const k = KATALOG.get(row.ref);
      const p = _przepisZWiersza(prof, row, {
        profesja: prof,
        narzedzia: _i(def.zestaw, k?.narzedzia ?? ""),
        s: def.s
      });
      if (profesji.has(p.id)) throw new Error(`recipes-data: zdublowany przepis ${p.id}`);
      profesji.set(p.id, p);
    }
  }

  for (const row of ELABORACJA) {
    const p = _przepisZWiersza("elaboracja", row, { profesja: null, narzedzia: ELABORACJA_NARZEDZIA, s: 136 });
    elaboracji.set(p.id, p);
  }
  return { standardowe, profesji, elaboracji };
}

/**
 * Przepisy zdolności — nie tabele, tylko zdolności z własnymi regułami (D35). Dostęp daje sama
 * zdolność (`abilityId`), niezależnie od WKK. `bezTestu` — zdolność opisuje wynik, nie ryzyko.
 * Naboje Pogromcy i trucizna Truciciela to aktywności Długiego odpoczynku, nie Roboty (§9).
 */
function _przepisyZdolnosci() {
  const out = new Map();
  const k = KATALOG.get("weapon:pogromca");
  if (k) {
    // NOE s. 99: 100 gb surowców, 100 h; koszt produkcji 10 MK, 10 CE, 80 CZ.
    out.set("zdolnosc/weapon:pogromca", Object.freeze({
      id: "zdolnosc/weapon:pogromca",
      nazwa: k.nazwa,
      wynik: Object.freeze({ typ: "item", ref: k.ref, ilosc: 1 }),
      jednorazowy: false,
      cena: k.cena,
      wartosc: k.cena,
      st: 0,
      bezTestu: true,
      minuty: 100 * 60,
      surowce: Object.freeze(parseSurowce("10 MK, 10 CE, 80 CZ")),
      narzedzia: toolExprString(parseToolExpr("rusznikarza")),
      tagi: [],
      profesja: null,
      zrodlo: Object.freeze({ zdolnosc: "pogromca", s: 99 })
    }));
  }
  return out;
}

const _P = _zbudujPrzepisy();

/** Przepisy zdolności (Pogromca), `id` → przepis. */
export const PRZEPISY_ZDOLNOSCI = _przepisyZdolnosci();

/** Przepisy standardowe (zawsze), `id` → przepis. */
export const PRZEPISY_STANDARDOWE = _P.standardowe;

/** Przepisy profesji (tylko bez WKK, D22/D26), `id` → przepis. */
export const PRZEPISY_PROFESJI = _P.profesji;

/** Elaboracja amunicji (s. 136) — tabela narzędzia, obie wersje zasad. */
export const PRZEPISY_ELABORACJI = _P.elaboracji;

/**
 * Lista przedmiotów w tabeli każdej profesji (`ref`-y) — Wprawa z profesji (D24) daje ich
 * przepisy standardowe, a z WKK to także zakres cechy profesji (D26).
 */
export const LISTA_PROFESJI = Object.freeze(Object.fromEntries(
  Object.keys(PROFESJE).map(prof => [
    prof,
    Object.freeze(new Set([...PRZEPISY_PROFESJI.values()].filter(p => p.profesja === prof).map(p => p.wynik.ref)))
  ])
));

/** Profesje, na których liście jest dany przedmiot. */
export function profesjeDlaRef(ref) {
  return Object.keys(PROFESJE).filter(prof => LISTA_PROFESJI[prof].has(ref));
}

/** Wszystkie przepisy obowiązujące przy danym ustawieniu WKK. */
export function wszystkiePrzepisy({ kobalt }) {
  return [
    ...PRZEPISY_STANDARDOWE.values(),
    ...PRZEPISY_ELABORACJI.values(),
    ...PRZEPISY_ZDOLNOSCI.values(),
    ...(kobalt ? [] : PRZEPISY_PROFESJI.values())
  ];
}

/** Przepis po id, niezależnie od trybu (snapshot Roboty pamięta swój). */
export function przepis(id) {
  return PRZEPISY_STANDARDOWE.get(id) ?? PRZEPISY_PROFESJI.get(id) ?? PRZEPISY_ELABORACJI.get(id)
    ?? PRZEPISY_ZDOLNOSCI.get(id) ?? null;
}

/**
 * Przepis ad hoc MG (§5.1 pkt 3): dowolny przedmiot, cena ustalona z MG („jeśli ceny nie ma
 * w podręczniku, ustal ją razem z MG”, s. 145), reszta ze wzoru. Zapisywany jako snapshot
 * na Robocie, Schemacie albo Wprawie — nie trafia do danych.
 * @param {object} o
 * @param {string} o.id           unikalny — wołający podaje (`adhoc/<randomID>`), plik zostaje czysty
 * @param {string} o.nazwa
 * @param {number} o.cena         gb za sztukę
 * @param {boolean} [o.jednorazowy]
 * @param {number} [o.ilosc]
 * @param {string} [o.narzedzia]  wyrażenie §5.1a
 * @param {string} [o.profil]     np. „4 MK, 1 CZ” — proporcje podziału
 * @param {string|null} [o.ref]   cel z `KATALOG`, jeśli jest
 * @param {object|null} [o.dane]  dane przedmiotu-wyniku (przeciągnięty przedmiot)
 */
export function przepisAdHoc({ id, nazwa, cena, jednorazowy = false, ilosc = 1, narzedzia = "", profil = null, ref = null, dane = null, tagi = [] }) {
  const k = ref ? KATALOG.get(ref) : null;
  const wartosc = (Number(cena) || 0) * ilosc;
  const prof = profil ? profilZLinii(parseSurowce(profil)) : (k?.profil ?? profilZLinii(parseSurowce(KATEGORIE.sprzet.profil)));
  return {
    id,
    nazwa,
    wynik: { typ: k?.wynik ?? "item", ref: ref ?? "adhoc", ilosc, ...(dane ? { dane } : {}) },
    jednorazowy,
    cena: Number(cena) || 0,
    wartosc,
    st: stZWartosci(wartosc),
    minuty: standardoweMinuty(wartosc, jednorazowy),
    surowce: podzielBudzet(budzetSurowcow(wartosc), prof),
    narzedzia: toolExprString(parseToolExpr(narzedzia)),
    tagi: [...new Set([...(k?.tagi ?? []), ...tagi])],
    profesja: null,
    zrodlo: { adHoc: true }
  };
}

/** Surowe tabele — dla walidatora i testów zgodności ze wzorem. */
export const __testing = Object.freeze({
  TABELE, ELABORACJA, RUSZNIKARSTWO_KATEGORIE, NADPISANIA, RAW_PRZEDMIOTY, TABELA_BEZ_CENY, ZASLEPKI,
  kategorieRusznikarstwa: _kategorieRusznikarstwa
});
