/**
 * Neuroshima 5e — szabrowanie i losowe przedmioty: dane i czyste zasady (PLAN_m5_postoj.md §7.1, U10–U14, E0).
 *
 * Tabele NOE przepisane ręcznie, testy sprawdzają domknięcie k100/k10/k12 i odwołania do katalogu oraz
 * Bestiariusza (`tests/szabrowanie-zasady.test.mjs`):
 *   - `RUINY` — Tabela szabrowania przykładowych ruin (s. 271): czas, szansa komplikacji, kości surowców;
 *   - `KOMPLIKACJE` — Tabela komplikacji szabrowania (s. 270): k10, mieszkańcy z podrzutem k4;
 *   - `LOSOWE_PRZEDMIOTY` — Tabela losowych przedmiotów (s. 271): k100 → kategoria;
 *   - `TABELE_K100` / `TABELE_K12` — kolumny k100 tabel sprzętu (s. 130–144) i k12 (instrumenty, istoty).
 * Odczyty MG luk RAW: czas ÷ liczba szukających i podział rodzajów (D12), los ważony dostępnością dla
 * tabel bez kolumny k100 (D9).
 *
 * Surowce liczone w jednostkach modułu — 1 jednostka = 1 gb = 100 g (CH, CE, CZ) albo 1 kg (MK, MO)
 * (`config/surowce-data.mjs`), więc „4k8 × 100 g” to 4k8 jednostek CH.
 *
 * Czysty: bez `game`. Czyta go też Node (paczka `tabele`).
 */

import { kosc, rzucKosci, wierszTabeli, wybierzWazony } from "./losowanie.mjs";
import { WEAPONS } from "./weapons-data.mjs";
import { ARMORS } from "./armor-data.mjs";
import { GRENADE_TYPES } from "./ammo-data.mjs";
import { losujFanty } from "./fanty-data.mjs";

/* -------------------------------------------- */
/*  Ruiny (s. 271)                               */
/* -------------------------------------------- */

/** Rodzaje surowców szabrowania, w kolejności podziału „po kolei” (D12). */
export const RODZAJE_SZABROWANIA = Object.freeze(["CZ", "CH", "CE", "MK"]);

const R = (label, minuty, komplikacje, CH, MK, CE, CZ, obraz) => Object.freeze({
  label, minuty, komplikacje, surowce: Object.freeze({ CH, MK, CE, CZ }), obraz
});

/** `surowce` — zapis kości w jednostkach modułu (×100 g dla CH/CE/CZ, ×1 kg dla MK). `obraz` — §7.23. */
export const RUINY = Object.freeze({
  "apteka": R("Apteka", 30, 20, "4d8", "1d20", "1d6", "1d10", "apteka"),
  "biuro": R("Biuro / mieszkanie", 15, 10, "1d8", "2d20", "1d6", "1d10", "biuro"),
  "magazyn": R("Niewielki magazyn", 120, 60, "4d8", "4d20", "4d6", "4d10", "magazyn"),
  "piwnica": R("Piwnica / strych", 30, 30, "2d8", "4d20", "2d6", "2d10", "piwnica"),
  "sklepik": R("Sklepik", 60, 40, "3d8", "4d20", "2d6", "2d10", "sklepik"),
  "warsztat": R("Warsztat / pracownia", 60, 50, "1d8", "4d20", "3d6", "4d10", "warsztat"),
  "wrak": R("Wrak samolotu / statku", 60, 60, "4d8", "6d20", "3d6", "4d10", "wrak")
});

/** Test szabrowania (s. 271): MDR (Percepcja lub Śledztwo) ST 10; ≥ 20 — podwójnie i przedmiot; nat. 20 — Fant. */
export const SZABROWANIE = Object.freeze({
  st: 10, cecha: "wis", umiejetnosci: Object.freeze(["prc", "sle"]),
  podwojnieOd: 20,
  wykrywaczMetalu: "raw:wykrywacz-metalu"
});

/* -------------------------------------------- */
/*  Komplikacje (s. 270)                         */
/* -------------------------------------------- */

const M = (...wiersze) => Object.freeze(wiersze.map(([k4, liczba, istota]) => Object.freeze({ k4, liczba, istota })));

/**
 * k10. `mieszkancy` — podrzut k4 → `{ liczba, istota }` (id wpisu Bestiariusza). Pułapki: ST zauważenia
 * (pasywna Percepcja), rozbrojenia i RO, obszar, skutki. MG może wstawić coś innego (s. 271).
 */
export const KOMPLIKACJE = Object.freeze([
  Object.freeze({ k10: 1, id: "potwory", label: "Mieszkańcy (potwory)", mieszkancy: M([1, "2d4", "bit-boys"], [2, "1d4", "techmorwa-malutka"], [3, "1", "techmorwa-srednia"], [4, "1d4", "harpie-aka-wampiry"]) }),
  Object.freeze({ k10: 2, id: "zwierzeta", label: "Mieszkańcy (zwierzęta)", mieszkancy: M([1, "1d2", "gigantyczny-pajak"], [2, "1d4", "roj-szczurow"], [3, "2d4", "pies-mutek"], [4, "1", "pies-bojowy"]) }),
  Object.freeze({ k10: 3, id: "ludzie", label: "Mieszkańcy (ludzie)", mieszkancy: M([1, "2d4", "gangus-zolnierz"], [2, "1d6", "konwojent-straznik"], [3, "2d4", "zolnierz-posterunku"], [4, "1d10", "cywil"]) }),
  Object.freeze({ k10: 4, id: "mutanci", label: "Mieszkańcy (mutanci)", mieszkancy: M([1, "1d4", "generacja-i-nocny-ghul"], [2, "1", "generacja-ii-genotyp-wilczy"], [3, "1", "generacja-iii-grubas"], [4, "1", "generacja-iii-szpieg"]) }),
  Object.freeze({
    k10: 5, id: "pulapka-granat", label: "Pułapka z granatem", zauwazenie: 15, rozbrojenie: 15,
    ro: Object.freeze({ cecha: "dex", st: 15 }), obszar: Object.freeze({ ksztalt: "szescian", bok: 9 }),
    obrazenia: Object.freeze([Object.freeze({ wzor: "4d6", typ: "explosive" }), Object.freeze({ wzor: "4d6", typ: "slashing" })]),
    stany: Object.freeze(["prone", "deafened"]), polowa: true, powtorkaRO: true
  }),
  Object.freeze({
    k10: 6, id: "pulapka-siec", label: "Pułapka z siecią", zauwazenie: 15, rozbrojenie: 10,
    ro: Object.freeze({ cecha: "dex", st: 15 }), obszar: Object.freeze({ ksztalt: "szescian", bok: 3 }),
    stany: Object.freeze(["grappled", "restrained"])
  }),
  Object.freeze({
    k10: 7, id: "podloga", label: "Uszkodzona podłoga", zauwazenie: 15,
    ro: Object.freeze({ cecha: "dex", st: 10 }), obrazenia: Object.freeze([Object.freeze({ wzor: "2d6", typ: "bludgeoning" })]), upadek: true
  }),
  Object.freeze({ k10: 8, id: "opary", label: "Trujące opary", stany: Object.freeze(["poisoned"]), maskaChroni: true }),
  Object.freeze({ k10: 9, id: "skazenie", label: "Skażenie", poziom: "1d4" }),
  Object.freeze({ k10: 10, id: "maszyny", label: "Maszyny Molocha", mieszkancy: M([1, "1d4", "kurczak"], [2, "1d4", "lowca"], [3, "1", "gladiator"], [4, "2d4", "pajak"]) })
]);

/**
 * Komplikacja w ukryciu (s. 271): k100 ≤ szansa ruin → k10 na tabeli; mieszkańcy — k4 i liczba.
 * @returns {{jest: boolean, k100: number, komplikacja: object|null, k10: number|null, mieszkancy: {k4: number, istota: string, liczba: number}|null, poziom: number|null}}
 */
export function rzucKomplikacje(ruina, rng = Math.random, { wymus = null } = {}) {
  const k100 = kosc(100, rng);
  const jest = wymus !== null ? true : k100 <= (ruina?.komplikacje ?? 0);
  if (!jest) return { jest: false, k100, komplikacja: null, k10: null, mieszkancy: null, poziom: null };
  const k10 = wymus ?? kosc(10, rng);
  const komplikacja = KOMPLIKACJE.find(k => k.k10 === k10) ?? null;
  let mieszkancy = null;
  let poziom = null;
  if (komplikacja?.mieszkancy) {
    const k4 = kosc(4, rng);
    const w = komplikacja.mieszkancy.find(m => m.k4 === k4);
    mieszkancy = { k4, istota: w.istota, liczba: rzucKosci(w.liczba, rng).suma };
  }
  if (komplikacja?.poziom) poziom = rzucKosci(komplikacja.poziom, rng).suma;
  return { jest: true, k100, komplikacja, k10, mieszkancy, poziom };
}

/* -------------------------------------------- */
/*  Czas, podział, zdobycz                       */
/* -------------------------------------------- */

/** Czas szabrowania (D12): czas ruin ÷ liczba szukających (pole do nadpisania). */
export function czasSzabrowania(ruina, osoby = 1) {
  return Math.ceil((ruina?.minuty ?? 0) / Math.max(1, Math.floor(osoby) || 1));
}

/**
 * Podział rodzajów surowców między szukających (D12, domyślnie po kolei). Jeden szukający szuka
 * wszystkiego; czterech — każdy jednego.
 * @param {string[]} osoby  identyfikatory szukających
 * @returns {Record<string, string[]>} id → rodzaje
 */
export function podzialRodzajow(osoby) {
  const out = Object.fromEntries((osoby ?? []).map(o => [o, []]));
  if (!osoby?.length) return out;
  RODZAJE_SZABROWANIA.forEach((r, i) => out[osoby[i % osoby.length]].push(r));
  return out;
}

/**
 * Zdobycz jednego szukającego (s. 271). Sukces — kości surowców jego rodzajów; ≥ 20 — podwójnie i losowy
 * przedmiot; naturalna 20 — dodatkowo Fant. Porażka — nic (inny szukający może spróbować).
 * @param {object} o
 * @param {object} o.ruina
 * @param {string[]} o.rodzaje
 * @param {number} o.wynik
 * @param {boolean} [o.nat20]
 * @param {Record<string, number>} [o.rzuty]   sumy kości per rodzaj (wynik z karty); brak — rzut `rng`
 * @returns {{sukces: boolean, surowce: Record<string, number>, przedmiot: boolean, fant: boolean, mnoznik: number}}
 */
export function zdobycz({ ruina, rodzaje, wynik, nat20 = false, rzuty = null, rng = Math.random }) {
  const sukces = Number(wynik) >= SZABROWANIE.st;
  if (!sukces) return { sukces: false, surowce: {}, przedmiot: false, fant: false, mnoznik: 0 };
  const mnoznik = Number(wynik) >= SZABROWANIE.podwojnieOd ? 2 : 1;
  const surowce = {};
  for (const r of rodzaje ?? []) {
    const zapis = ruina?.surowce?.[r];
    if (!zapis) continue;
    const suma = rzuty?.[r] ?? rzucKosci(zapis, rng).suma;
    surowce[r] = suma * mnoznik;
  }
  return { sukces: true, surowce, przedmiot: mnoznik === 2, fant: !!nat20, mnoznik };
}

/* -------------------------------------------- */
/*  Tabele sprzętu z kolumną k100 / k12          */
/* -------------------------------------------- */

const W = (od, do_, nazwa, ref = null, cena = null, waga = null, ilosc = 1) => Object.freeze({ od, do: do_, nazwa, ref, cena, waga, ilosc });
const RZUC_DWA = (od) => Object.freeze({ od, do: od, nazwa: "Rzuć dwa razy", rzucDwa: true });

/**
 * Kolumny k100 (s. 130–144). `ref` — wpis katalogu (`config/recipes-data.mjs`); bez `ref` — zwykły przedmiot
 * z nazwą, ceną i wagą z tabeli (karta pokazuje go MG). `ilosc` — sztuki katalogu na wiersz (woda 5 l).
 */
export const TABELE_K100 = Object.freeze({
  elektronika: Object.freeze({
    label: "Elektronika", s: 130, wiersze: Object.freeze([
      W(1, 5, "Agregat", "raw:agregat"), W(6, 10, "Akumulator", "raw:akumulator"), W(11, 15, "Alternator", "raw:alternator"),
      W(16, 17, "Analizator chemiczny", null, 100, 5), W(18, 30, "Baterie", "item:baterie"), W(31, 33, "Defibrylator", "raw:defibrylator"),
      W(34, 35, "Detektor ruchu", "raw:detektor-ruchu"), W(36, 38, "Detonator radiowy", "item:detonator"),
      W(39, 44, "Komputer osobisty", "raw:komputer-osobisty"), W(45, 47, "Komputer gamingowy", "raw:komputer-gamingowy"),
      W(48, 52, "Kontroler zdalnego sterowania", "raw:kontroler"), W(53, 60, "Krótkofalówka", "raw:krotkofalowka"),
      W(61, 65, "Laptop", "raw:laptop"), W(66, 66, "Laptop wojskowy", "gear:laptop_wojskowy"),
      W(67, 69, "Miernik skażenia chemicznego", "raw:miernik-skazenia"), W(70, 73, "Miernik promieniowania", "raw:miernik-promieniowania"),
      W(74, 75, "Monitor", null, 40, 5), W(76, 76, "Noktowizor", "item:gogle-noktowizor"), W(77, 80, "Nośnik danych", "raw:nosnik-danych"),
      W(81, 83, "Odtwarzacz CD", "raw:odtwarzacz-cd"), W(84, 91, "Radio", "raw:radio"), W(92, 92, "Termowizor", "item:gogle-termowizor"),
      W(93, 94, "Turbina wiatrowa/wodna", "raw:turbina"), W(95, 96, "Wykrywacz metalu", "raw:wykrywacz-metalu"),
      W(97, 97, "Wytrychy elektroniczne", "raw:wytrychy-elektroniczne"), W(98, 99, "Zapalnik elektryczny", "item:zapalnik-elektryczny"),
      RZUC_DWA(100)
    ])
  }),
  lekarstwa: Object.freeze({
    label: "Lekarstwa", s: 132, wiersze: Object.freeze([
      W(1, 7, "Desmopresyna", "chemia:desmopresyna"), W(8, 28, "Aspiryna K", "chemia:aspirynaK"), W(29, 47, "Dracophen", "chemia:dracophen"),
      W(48, 55, "Reminex", "chemia:reminex"), W(56, 63, "Relanium", "chemia:relanium"), W(64, 71, "Wapniak", "chemia:wapniak"),
      W(72, 79, "Psychotropy", "chemia:psychotropy"), W(80, 100, "Actinix", "chemia:actinix")
    ])
  }),
  narzedzia: Object.freeze({
    label: "Narzędzia", s: 134, wiersze: Object.freeze([
      W(1, 2, "Mały aptekarz", "toolkit:aptekarza"), W(3, 7, "Mały charakteryzator", "toolkit:charakteryzatora"), W(8, 10, "Mały chemik", "toolkit:chemika"),
      W(11, 13, "Mały elektronik", "toolkit:elektronika"), W(14, 15, "Mały fałszerz", "toolkit:falszerza"), W(16, 22, "Mały gorzelnik", "toolkit:gorzelnika"),
      W(23, 24, "Mały haker", "toolkit:hakera"), W(25, 28, "Mały jubiler", "toolkit:jubilera"), W(29, 30, "Mały kartograf", "toolkit:kartografa"),
      W(31, 40, "Mały kłusownik", "toolkit:klusownika"), W(41, 46, "Mały kowal", "toolkit:kowala"), W(47, 53, "Mały krawiec", "toolkit:krawca"),
      W(54, 61, "Mały kucharz", "toolkit:kucharza"), W(62, 67, "Mały mechanik", "toolkit:mechanika"), W(68, 72, "Mały medyk", "toolkit:medyka"),
      W(73, 77, "Mały rusznikarz", "toolkit:rusznikarza"), W(78, 86, "Mały rzeźnik", "toolkit:rzeznika"), W(87, 90, "Mały stolarz", "toolkit:stolarza"),
      W(91, 91, "Mały szuler", "toolkit:szulera"), W(92, 94, "Mały szklarz", "toolkit:szklarza"), W(95, 97, "Mały tatuażysta", "toolkit:tatuazysty"),
      W(98, 100, "Mały ślusarz", "toolkit:slusarza")
    ])
  }),
  prochy: Object.freeze({
    label: "Prochy i używki", s: 137, wiersze: Object.freeze([
      W(1, 3, "Nitrogliceryna (100 ml)", "chemia:nitrogliceryna"), W(4, 10, "Proch czarny (100 g)", "chemia:prochCzarny"),
      W(11, 14, "Proch strzelniczy (100 g)", "chemia:prochStrzelniczy"), W(15, 20, "Narkotyki łatwe w produkcji", "chemia:narkotykiLatwe"),
      W(21, 21, "Narkotyki przedwojenne", "chemia:narkotykiPrzedwojenne"), W(22, 23, "Tornado", "chemia:tornado"), W(24, 25, "Neodrugs", "chemia:neodrugs"),
      W(26, 32, "Alkohol (tani) 1 l", "chemia:alkoholTani"), W(33, 36, "Alkohol (markowy) 1 l", "chemia:alkoholMarkowy"), W(37, 40, "Cygaro", "chemia:cygaro"),
      W(41, 46, "Papieros", "chemia:papieros"), W(47, 49, "Tytoń do żucia", "chemia:tytonDoZucia"), W(50, 51, "Anestix", "chemia:anestix"),
      W(52, 56, "Antybiotyk (10 dawek)", "chemia:antybiotyk"), W(57, 57, "AR-23", "chemia:ar23"), W(58, 58, "AR-35 BETA", "chemia:ar35"),
      W(59, 60, "Deadline", "chemia:deadline"), W(61, 64, "Detoks (5 fiolek)", "chemia:detoks"), W(65, 69, "Medpak", "chemia:medpak"),
      W(70, 72, "Neuro-Cola", "chemia:neuroCola"), W(73, 79, "Painkiller (10 tabletek)", "chemia:painkiller"), W(80, 83, "RadMov", "chemia:radmov"),
      W(84, 85, "RadOff", "chemia:radoff"), W(86, 90, "Taurus", "chemia:taurus"), W(91, 95, "Trybiotyl", "chemia:trybiotyl"),
      W(96, 100, "WD-Tabs (10 tabletek)", "chemia:wdTabs")
    ])
  }),
  roznosci: Object.freeze({
    label: "Różności", s: 139, wiersze: Object.freeze([
      W(1, 3, "Gwizdek", null, 5, 0.1), W(4, 6, "Hamak", null, 10, 2), W(7, 8, "Kłódka", "raw:klodka"), W(9, 9, "Książka", null, 50, 1),
      W(10, 10, "Kolczatki", "item:kolczatka"), W(11, 13, "Koc", null, 5, 2), W(14, 14, "Koc gaśniczy", null, 20, 15),
      W(15, 16, "Koktajl Mołotowa", "grenade:grenade-molotov"), W(17, 17, "Kompas", "raw:kompas"), W(18, 18, "Kostium", null, 20, 2),
      W(19, 19, "Kwas (fiolka)", "item:kwas"), W(20, 20, "Kulki stalowe", null, 10, 0.5), W(21, 22, "Lampa naftowa", null, 10, 1),
      W(23, 24, "Lina (15 m)", null, 10, 7), W(25, 25, "Latarka", "item:latarka-reczna"), W(26, 26, "Latarka dynamo", "item:latarka-dynamowa"),
      W(27, 27, "Lornetka", null, 30, 1), W(28, 28, "Lusterko z klapką", null, 10, 0.1), W(29, 30, "Łańcuch (5 m)", null, 20, 10),
      W(31, 32, "Łopata", "raw:lopata"), W(33, 33, "Mapa", null, 30, 0.1), W(34, 34, "Maska przeciwgazowa", null, 20, 1),
      W(35, 35, "Megafon/mikrofon", null, 40, 1), W(36, 37, "Nafta (1 l)", null, 5, 1), W(38, 39, "Namiot", null, 20, 5),
      W(40, 40, "Narty i kijki", null, 20, 3), W(41, 43, "Paliwo chrzczone (5 l)", "raw:paliwo-chrzczone"), W(44, 45, "Paliwo dobre (5 l)", "raw:paliwo-dobre"),
      W(46, 47, "Paliwo przeciętne (5 l)", "raw:paliwo-przecietne"), W(48, 48, "Palnik", "raw:palnik"), W(49, 49, "Perfumy", null, 50, 0.1),
      W(50, 52, "Prowiant", "prowiant:prowiant"), W(53, 53, "Skafander ochronny", null, 70, 10), W(54, 55, "Sieć", null, 10, 3),
      W(56, 57, "Siodło", null, 50, 10), W(58, 58, "Sprzęt do nurkowania", null, 30, 25), W(59, 59, "Sprzęt do wspinaczki", "gear:sprzet_wspinaczkowy"),
      W(60, 61, "Śpiwór", null, 10, 1), W(62, 62, "Środek usypiający", "raw:srodek-usypiajacy"), W(63, 64, "Środki czyszczące (1 l)", null, 10, 1),
      W(65, 66, "Środki dezynfekujące (1 l)", "raw:srodki-dezynfekujace"), W(67, 69, "Świeczka", null, 1, 0.1), W(70, 70, "Staza", null, 10, 0.1),
      W(71, 72, "Super klej (100 g)", null, 10, 0.1), W(73, 74, "Szkło powiększające", null, 50, 0.1), W(75, 75, "Szybkoładowarka", null, 20, 0.2),
      W(76, 77, "Taśma klejąca (10 m)", null, 10, 1), W(78, 78, "Trucizna (prosta)", "raw:trucizna"), W(79, 80, "Ubrania podróżne", null, 20, 4),
      W(81, 81, "Ubrania porządne", null, 100, 4), W(82, 82, "Uzupełnienie m. medyka", "item:medyk-refill"),
      W(83, 84, "Woda pitna (5 l)", "prowiant:woda_pitna", null, null, 5), W(85, 90, "Wózek (dwukółka)", "gear:wozek"),
      W(91, 92, "Zapalniczka plastikowa", null, 20, 0), W(93, 93, "Zapalniczka Zippo", null, 50, 0.1), W(94, 100, "Zapałki (50 szt.)", null, 10, 0.1)
    ])
  }),
  zywnosc: Object.freeze({
    label: "Żywność", s: 144, wiersze: Object.freeze([
      W(1, 5, "Chleb (1 kg)", "prowiant:chleb"), W(6, 10, "Cukier (1 kg)", null, 30, 1), W(11, 15, "Herbata (0,5 kg)", null, 25, 0.5),
      W(16, 20, "Jajko (50 g)", null, 2, 0.05), W(21, 25, "Kawa (0,5 kg)", null, 30, 0.5), W(26, 30, "Kawa zbożowa (1 kg)", null, 20, 1),
      W(31, 35, "Konserwa (1 kg)", "prowiant:konserwa"), W(36, 40, "Liofilizowana żywność (1 kg)", "prowiant:liofilizat"),
      W(41, 45, "Masło (200 g)", null, 10, 0.2), W(46, 50, "Mięso (1 kg)", "prowiant:mieso"), W(51, 55, "Mleko (1 l)", "prowiant:mleko"),
      W(56, 60, "Olej roślinny (1 l)", null, 20, 1), W(61, 65, "Owoce i warzywa (1 kg)", "prowiant:owoce"), W(66, 70, "Przyprawy (100 g)", null, 10, 0.1),
      W(71, 75, "Ryby (1 kg)", "prowiant:ryby"), W(76, 80, "Ser (1 kg)", "prowiant:ser"), W(81, 85, "Sól (1 kg)", null, 20, 1),
      W(86, 90, "Ziarno (1 kg)", null, 2, 1), W(91, 95, "Woda brudna (1 l)", "prowiant:woda_brudna"), W(96, 99, "Woda pitna (1 l)", "prowiant:woda_pitna"),
      W(100, 100, "Woda filtrowana (1 l)", "prowiant:woda_filtrowana")
    ])
  })
});

/** Kolumny k12 (s. 132, 143). Żywe istoty → karta MG (aktor); `istota` — wpis Bestiariusza, gdy jest. */
export const TABELE_K12 = Object.freeze({
  instrumenty: Object.freeze({
    label: "Instrumenty muzyczne", s: 132, wiersze: Object.freeze([
      W(1, 1, "Akordeon", null, 50, 10), W(2, 2, "Banjo", null, 40, 3), W(3, 3, "Gitara akustyczna", null, 50, 2),
      W(4, 4, "Gitara basowa", null, 100, 4), W(5, 5, "Gitara elektryczna", null, 130, 4), W(6, 6, "Harmonijka ustna", null, 20, 0.1),
      W(7, 7, "Keyboard", null, 150, 7), W(8, 8, "Kontrabas elektryczny", null, 150, 10), W(9, 9, "Mikser audio + głośniki", null, 110, 5),
      W(10, 10, "Perkusja", null, 150, 20), W(11, 11, "Saksofon", null, 100, 6), W(12, 12, "Skrzypce elektryczne", null, 120, 0.5)
    ])
  }),
  zywe: Object.freeze({
    label: "Żywe istoty", s: 143, aktor: true, wiersze: Object.freeze([
      Object.freeze({ od: 1, do: 1, nazwa: "Koń (skażony)", cena: 100, istota: "kon-skazony" }),
      Object.freeze({ od: 2, do: 2, nazwa: "Koń (zdrowy)", cena: 300, istota: "kon-zdrowy" }),
      Object.freeze({ od: 3, do: 3, nazwa: "Koń (teksańczyk)", cena: 500, istota: "kon-teksanczyk" }),
      Object.freeze({ od: 4, do: 4, nazwa: "Koza", cena: 70 }), Object.freeze({ od: 5, do: 5, nazwa: "Krowa", cena: 300 }),
      Object.freeze({ od: 6, do: 6, nazwa: "Neokot", cena: 20, istota: "neokot" }), Object.freeze({ od: 7, do: 7, nazwa: "Kura", cena: 20 }),
      Object.freeze({ od: 8, do: 8, nazwa: "Owca", cena: 40 }), Object.freeze({ od: 9, do: 9, nazwa: "Pies bojowy", cena: 30, istota: "pies-bojowy" }),
      Object.freeze({ od: 10, do: 10, nazwa: "Szczur", cena: 2 }), Object.freeze({ od: 11, do: 11, nazwa: "Świnia", cena: 150 }),
      Object.freeze({ od: 12, do: 12, nazwa: "Wół", cena: 100 })
    ])
  })
});

/* -------------------------------------------- */
/*  Tabela losowych przedmiotów (s. 271)         */
/* -------------------------------------------- */

const _bronTypu = typy => new Set(WEAPONS.filter(w => typy.includes(w.type)).map(w => `weapon:${w.id}`));
const _pancerzTypu = typy => new Set(ARMORS.filter(a => typy.includes(a.armorType)).map(a => `armor:${a.id}`));
const _granatKat = kat => new Set(GRENADE_TYPES.filter(g => kat.includes(g.category)).map(g => `grenade:${g.id}`));

/**
 * k100 → co losować dalej. `tabela` — kolumna k100/k12; `katalog` — los ważony dostępnością (D9) z pozycji
 * katalogu (zbiór `refy` albo kategorie `kat`); `aktor` — karta MG (istota żywa; sprawny pojazd — M4);
 * `schemat` — konkretny Schemat z paczki `schematy`; `rzucDwa` — rekurencja.
 */
export const LOSOWE_PRZEDMIOTY = Object.freeze([
  Object.freeze({ od: 1, do: 10, nazwa: "Amunicja", s: 125, katalog: Object.freeze({ kat: ["amunicja", "pociski"] }) }),
  Object.freeze({ od: 11, do: 13, nazwa: "Elektronika", s: 130, tabela: "elektronika" }),
  Object.freeze({ od: 14, do: 15, nazwa: "Lekarstwa", s: 132, tabela: "lekarstwa" }),
  Object.freeze({ od: 16, do: 20, nazwa: "Narzędzia", s: 134, tabela: "narzedzia" }),
  Object.freeze({ od: 21, do: 25, nazwa: "Prochy i używki", s: 137, tabela: "prochy" }),
  Object.freeze({ od: 26, do: 50, nazwa: "Różności", s: 139, tabela: "roznosci" }),
  Object.freeze({ od: 51, do: 55, nazwa: "Broń biała", s: 116, katalog: Object.freeze({ refy: _bronTypu(["biala"]) }) }),
  Object.freeze({ od: 56, do: 60, nazwa: "Broń miotana", s: 119, katalog: Object.freeze({ refy: _bronTypu(["miotana"]) }) }),
  Object.freeze({ od: 61, do: 64, nazwa: "Broń palna krótka", s: 122, katalog: Object.freeze({ refy: _bronTypu(["palnaKrotka"]) }) }),
  Object.freeze({ od: 65, do: 70, nazwa: "Broń palna pośrednia", s: 122, katalog: Object.freeze({ refy: _bronTypu(["palnaPosr"]) }) }),
  Object.freeze({ od: 71, do: 75, nazwa: "Broń palna długa", s: 123, katalog: Object.freeze({ refy: _bronTypu(["palnaDluga"]) }) }),
  Object.freeze({ od: 76, do: 78, nazwa: "Broń palna ciężka", s: 124, katalog: Object.freeze({ refy: _bronTypu(["palnaCiezka"]) }) }),
  Object.freeze({ od: 79, do: 79, nazwa: "Broń specjalna", s: 124, katalog: Object.freeze({ refy: _bronTypu(["specjalna"]) }) }),
  Object.freeze({ od: 80, do: 81, nazwa: "Instrument muzyczny", s: 132, tabela: "instrumenty", k: 12 }),
  Object.freeze({ od: 82, do: 82, nazwa: "Istota żywa", s: 143, tabela: "zywe", k: 12, aktor: true }),
  Object.freeze({ od: 83, do: 85, nazwa: "Pancerz lekki", s: 113, katalog: Object.freeze({ refy: _pancerzTypu(["light"]) }) }),
  Object.freeze({ od: 86, do: 90, nazwa: "Pancerz średni", s: 113, katalog: Object.freeze({ refy: _pancerzTypu(["medium"]) }) }),
  Object.freeze({ od: 91, do: 91, nazwa: "Pancerz ciężki", s: 113, katalog: Object.freeze({ refy: _pancerzTypu(["heavy"]) }) }),
  Object.freeze({ od: 92, do: 92, nazwa: "Akcesoria pancerza", s: 113, katalog: Object.freeze({ refy: _pancerzTypu(["trinket", "shield"]) }) }),
  Object.freeze({ od: 93, do: 93, nazwa: "Schemat pancerza wspomaganego", schemat: "armor:pancerz-stalowej-policji" }),
  Object.freeze({ od: 94, do: 94, nazwa: "Schemat pancerza hydraulicznego", schemat: "armor:wojskowy-pancerz-hydrauliczny" }),
  Object.freeze({ od: 95, do: 95, nazwa: "Sprawny pojazd", s: 262, aktor: true, pojazd: true }),
  Object.freeze({ od: 96, do: 96, nazwa: "Mina / ładunek wybuchowy", s: 127, katalog: Object.freeze({ refy: _granatKat(["Miny", "Ładunki"]) }) }),
  Object.freeze({ od: 97, do: 98, nazwa: "Granat", s: 126, katalog: Object.freeze({ refy: _granatKat(["Granaty"]) }) }),
  Object.freeze({ od: 99, do: 99, nazwa: "Żywność", s: 144, tabela: "zywnosc" }),
  Object.freeze({ od: 100, do: 100, nazwa: "Rzuć dwa razy", rzucDwa: true })
]);

/** Pozycje katalogu dla kategorii bez kolumny k100. */
export function pozycjeKategorii(kategoria, katalog) {
  const k = kategoria?.katalog;
  if (!k) return [];
  const out = [];
  for (const w of katalog) {
    if (w.zaslepka || w.wynik !== "item") continue;
    if (k.refy ? k.refy.has(w.ref) : (k.kat ?? []).includes(w.kategoria)) out.push(w);
  }
  return out;
}

/**
 * Losowy przedmiot (U13): Tabela losowych przedmiotów → kategoria → wiersz kolumny k100/k12 albo los ważony
 * dostępnością (D9) z katalogu; „rzuć dwa razy” — rekurencja (głębokość ograniczona).
 * @param {object} o
 * @param {Iterable<object>} o.katalog  wpisy `KATALOG`
 * @param {number} [o.k100]             wynik na Tabeli losowych przedmiotów (brak — rzut `rng`)
 * @param {() => number} [o.rng]
 * @returns {{kategoria: string, wiersz?: object, ref?: string|null, nazwa: string, ilosc: number, cena?: number|null, waga?: number|null, aktor?: boolean, istota?: string|null, schemat?: string|null, pojazd?: boolean}[]}
 */
export function losujPrzedmiot({ katalog, k100 = null, rng = Math.random, glebokosc = 0 }) {
  const kat = [...(katalog ?? [])];
  const rzut = k100 ?? kosc(100, rng);
  const kategoria = wierszTabeli(LOSOWE_PRZEDMIOTY, rzut);
  if (!kategoria) return [];
  if (kategoria.rzucDwa) {
    if (glebokosc >= 5) return [];
    return [
      ...losujPrzedmiot({ katalog: kat, rng, glebokosc: glebokosc + 1 }),
      ...losujPrzedmiot({ katalog: kat, rng, glebokosc: glebokosc + 1 })
    ];
  }
  if (kategoria.schemat) return [{ kategoria: kategoria.nazwa, nazwa: kategoria.nazwa, schemat: kategoria.schemat, ref: null, ilosc: 1 }];
  if (kategoria.pojazd) return [{ kategoria: kategoria.nazwa, nazwa: kategoria.nazwa, aktor: true, pojazd: true, ref: null, ilosc: 1 }];
  if (kategoria.tabela) {
    const t = TABELE_K100[kategoria.tabela] ?? TABELE_K12[kategoria.tabela];
    const k = kategoria.k ?? 100;
    const w = wierszTabeli(t.wiersze, kosc(k, rng));
    if (w?.rzucDwa) {
      if (glebokosc >= 5) return [];
      const jeszcze = () => {
        const w2 = wierszTabeli(t.wiersze, kosc(k, rng));
        return w2 && !w2.rzucDwa ? [w2] : [];
      };
      return [...jeszcze(), ...jeszcze()].map(x => _zWiersza(kategoria, x, t));
    }
    return w ? [_zWiersza(kategoria, w, t)] : [];
  }
  const pozycje = pozycjeKategorii(kategoria, kat).filter(p => (Number(p.dostepnosc) || 0) > 0);
  const p = wybierzWazony(pozycje, x => Number(x.dostepnosc) || 0, rng);
  if (!p) return [{ kategoria: kategoria.nazwa, nazwa: kategoria.nazwa, ref: null, ilosc: 1 }];
  return [{ kategoria: kategoria.nazwa, nazwa: p.nazwa, ref: p.ref, ilosc: 1, cena: p.cena, waga: p.waga }];
}

function _zWiersza(kategoria, w, t) {
  return {
    kategoria: kategoria.nazwa,
    wiersz: w,
    nazwa: w.nazwa,
    ref: w.ref ?? null,
    ilosc: w.ilosc ?? 1,
    cena: w.cena ?? null,
    waga: w.waga ?? null,
    ...(t.aktor ? { aktor: true, istota: w.istota ?? null } : {})
  };
}

/**
 * Zdobyczna apteczka (s. 132): dwa rzuty k100 na Lekarstwa, po 2k10 dawek każdego.
 * @returns {{ref: string, nazwa: string, ilosc: number}[]}
 */
export function zdobycznaApteczka(rng = Math.random) {
  const t = TABELE_K100.lekarstwa.wiersze;
  return [0, 1].map(() => {
    const w = wierszTabeli(t, kosc(100, rng));
    return { ref: w.ref, nazwa: w.nazwa, ilosc: rzucKosci("2d10", rng).suma };
  });
}

/** Losowy Fant dla szabrowania z naturalną 20 (s. 271) — z `config/fanty-data.mjs`. */
export function losowyFant(rng = Math.random) {
  return losujFanty(rng);
}
