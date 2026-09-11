/**
 * Neuroshima 5e — dane pojazdów.
 *
 * Tabela statystyk pojazdów z podręcznika (s. 262) plus stopnie trudności pościgu (s. 266).
 * Projekt całości: `PLAN_poscigi.md`.
 *
 * ## Po co osobny plik z podwoziami, skoro aktor pojazdu i tak trzyma swoje statystyki
 *
 * Bo aktor trzyma statystyki **jednej sztuki**, często już zmodyfikowanej (GMT400 ma PW 180
 * zamiast podwoziowych 100 — dopancerzony i tak zostaje, decyzja MG z 2026-09-11). Podwozie
 * jest wzorcem, z którego buduje się nowy pojazd i względem którego można powiedzieć „ten wóz
 * jest mocniejszy, niż powinien". Ten sam podział co `bestiary-data.mjs` vs. konkretny NPC.
 *
 * ## Mapowanie na model dnd5e
 *
 * Typ aktora `vehicle` pokrywa prawie wszystko natywnie — patrz `PLAN_poscigi.md` §3.
 * Najważniejsze i najmniej oczywiste: **`attributes.hp.mt` to „Mishap Threshold", czyli
 * dokładnie neuroshimowy Próg awarii**, a `attributes.hp.dt` to Próg obrażeń. Nie trzeba na to
 * własnych pól i nie wolno ich dorabiać.
 *
 * ## Rozbieżności w samym podręczniku (zostawione świadomie, nie „naprawione")
 *
 *  - **Motocykl**: tabela zbiorcza (s. 262) podaje Szybkość 56 m, a jego własny statblok
 *    (s. 263) — 54 m. Przyjęte 54, bo statblok jest bardziej szczegółowy; `uwagi` to odnotowuje.
 *  - **Autobus**: nagłówek statbloku mówi „cofanie 12 m" przy Szybkości 24 (czyli połowa),
 *    ale cecha „Cofanie" w tym samym statbloku mówi „jedną czwartą". Przyjęte 12 m za nagłówkiem.
 *  - **TT w bezruchu** podręcznik podaje tylko w statblokach (Osobówka 15/10, Motocykl 15/10,
 *    Rower 15/10, Autobus 10/5) — zawsze −5. Dla podwozi bez własnego statbloku pole jest
 *    `null`, a nie zgadywane; `ttBezruchu()` stosuje wzorzec −5 i mówi wprost, że to ekstrapolacja.
 *  - **Rozmiar** też jest tylko w statblokach. Podwozia bez niego mają `rozmiar: null`.
 */

/* -------------------------------------------- */
/*  Podwozia (tabela s. 262)                     */
/* -------------------------------------------- */

/**
 * @typedef {object} Podwozie
 * @property {string} id
 * @property {string} nazwa
 * @property {number|null} szybkosc      Metry na turę. `null` = pochodna Szybkości jeźdźca.
 * @property {string} [szybkoscOpis]     Dla pojazdów mięśniowych („Szybkość jeźdźca × 2”).
 * @property {number|null} cofanie       Metry na turę. `null` = brak biegu wstecznego.
 * @property {number} zaloga
 * @property {number} ladownosc          Kilogramy.
 * @property {number} tt
 * @property {number|null} ttBezruchu    Tylko jeśli podręcznik podaje wprost.
 * @property {number} pw
 * @property {number} progObrazen
 * @property {number|null} progAwarii    `null` = pojazd niesilnikowy, nie ma awarii.
 * @property {number} cena               Gamble.
 * @property {number} dostepnosc         Procent.
 * @property {string|null} rozmiar       Klucz `CONFIG.DND5E.actorSizes`, jeśli znany.
 * @property {boolean} silnikowy         Czy podlega Tabeli Awarii Pojazdów Silnikowych.
 * @property {string} [uwagi]
 */

/** @type {Record<string, Podwozie>} */
export const PODWOZIA = {
  autobus: {
    id: "autobus", nazwa: "Autobus",
    szybkosc: 24, cofanie: 12, zaloga: 20, ladownosc: 5000,
    tt: 10, ttBezruchu: 5, pw: 150, progObrazen: 5, progAwarii: 20,
    cena: 1200, dostepnosc: 20, rozmiar: "grg", silnikowy: true,
    uwagi: "Ogromna maszyna. 20 miejsc siedzących poza kierowcą. Spalanie 40 l/100 km."
  },
  bwp: {
    id: "bwp", nazwa: "Bojowy wóz piechoty",
    szybkosc: 18, cofanie: 9, zaloga: 12, ladownosc: 5000,
    tt: 15, ttBezruchu: null, pw: 200, progObrazen: 12, progAwarii: 25,
    cena: 1500, dostepnosc: 5, rozmiar: null, silnikowy: true
  },
  buggy: {
    id: "buggy", nazwa: "Buggy",
    szybkosc: 24, cofanie: 12, zaloga: 2, ladownosc: 250,
    tt: 12, ttBezruchu: null, pw: 50, progObrazen: 5, progAwarii: 10,
    cena: 500, dostepnosc: 20, rozmiar: null, silnikowy: true
  },
  buldozer: {
    id: "buldozer", nazwa: "Buldożer",
    szybkosc: 12, cofanie: 6, zaloga: 2, ladownosc: 15000,
    tt: 12, ttBezruchu: null, pw: 170, progObrazen: 10, progAwarii: 20,
    cena: 2000, dostepnosc: 10, rozmiar: null, silnikowy: true
  },
  ciezarowka: {
    id: "ciezarowka", nazwa: "Ciężarówka",
    szybkosc: 24, cofanie: 12, zaloga: 3, ladownosc: 10000,
    tt: 10, ttBezruchu: null, pw: 150, progObrazen: 5, progAwarii: 20,
    cena: 1300, dostepnosc: 10, rozmiar: null, silnikowy: true
  },
  czolg: {
    id: "czolg", nazwa: "Czołg",
    szybkosc: 18, cofanie: 9, zaloga: 4, ladownosc: 5000,
    tt: 20, ttBezruchu: null, pw: 300, progObrazen: 15, progAwarii: 30,
    cena: 3000, dostepnosc: 5, rozmiar: null, silnikowy: true
  },
  deskorolka: {
    id: "deskorolka", nazwa: "Deskorolka",
    szybkosc: null, szybkoscOpis: "Szybkość jeźdźca × 2", cofanie: null,
    zaloga: 1, ladownosc: 100,
    tt: 10, ttBezruchu: null, pw: 10, progObrazen: 5, progAwarii: null,
    cena: 20, dostepnosc: 80, rozmiar: null, silnikowy: false
  },
  hammer: {
    id: "hammer", nazwa: "Hammer",
    szybkosc: 36, cofanie: 18, zaloga: 5, ladownosc: 1000,
    tt: 17, ttBezruchu: null, pw: 100, progObrazen: 10, progAwarii: 25,
    cena: 1600, dostepnosc: 10, rozmiar: "huge", silnikowy: true,
    uwagi: "Rozmiar przyjęty jak Osobówka (Wielka maszyna) — podręcznik nie daje Hammerowi "
      + "własnego statbloku. Podwozie GMT400 drużyny."
  },
  motorower: {
    id: "motorower", nazwa: "Motorower",
    szybkosc: 24, cofanie: null, zaloga: 1, ladownosc: 350,
    tt: 15, ttBezruchu: null, pw: 25, progObrazen: 5, progAwarii: 10,
    cena: 200, dostepnosc: 40, rozmiar: null, silnikowy: true
  },
  motocykl: {
    id: "motocykl", nazwa: "Motocykl",
    szybkosc: 54, cofanie: null, zaloga: 2, ladownosc: 500,
    tt: 15, ttBezruchu: 10, pw: 40, progObrazen: 5, progAwarii: 10,
    cena: 300, dostepnosc: 30, rozmiar: "lg", silnikowy: true,
    uwagi: "Duża maszyna. Tabela zbiorcza podaje 56 m, statblok 54 m — przyjęte 54. "
      + "Spalanie 5 l/100 km."
  },
  osobowka: {
    id: "osobowka", nazwa: "Osobówka",
    szybkosc: 36, cofanie: 18, zaloga: 5, ladownosc: 1000,
    tt: 15, ttBezruchu: 10, pw: 80, progObrazen: 10, progAwarii: 20,
    cena: 1000, dostepnosc: 40, rozmiar: "huge", silnikowy: true,
    uwagi: "Wielka maszyna. Od 3 do 5 miejsc siedzących. Spalanie 10 l/100 km."
  },
  rower: {
    id: "rower", nazwa: "Rower",
    szybkosc: null, szybkoscOpis: "Szybkość rowerzysty × 2", cofanie: null,
    zaloga: 1, ladownosc: 250,
    tt: 15, ttBezruchu: 10, pw: 20, progObrazen: 5, progAwarii: null,
    cena: 40, dostepnosc: 60, rozmiar: "med", silnikowy: false,
    uwagi: "Średnia maszyna. Przerzutka (akcja bonusowa) zmienia mnożnik na ×3 / ×2 / ×1."
  },
  traktor: {
    id: "traktor", nazwa: "Traktor",
    szybkosc: 12, cofanie: 6, zaloga: 2, ladownosc: 10000,
    tt: 12, ttBezruchu: null, pw: 100, progObrazen: 5, progAwarii: 20,
    cena: 1000, dostepnosc: 20, rozmiar: null, silnikowy: true
  },
  wozStrazacki: {
    id: "wozStrazacki", nazwa: "Wóz strażacki",
    szybkosc: 24, cofanie: 12, zaloga: 6, ladownosc: 5000,
    tt: 12, ttBezruchu: null, pw: 170, progObrazen: 5, progAwarii: 20,
    cena: 1500, dostepnosc: 10, rozmiar: null, silnikowy: true
  }
};

/**
 * TT w bezruchu. Podręcznik podaje je tylko w statblokach i zawsze jako −5.
 * @param {Podwozie} p
 * @returns {{wartosc: number, zrodlo: "podrecznik"|"ekstrapolacja"}}
 */
export function ttBezruchu(p) {
  if (p.ttBezruchu !== null) return { wartosc: p.ttBezruchu, zrodlo: "podrecznik" };
  return { wartosc: p.tt - 5, zrodlo: "ekstrapolacja" };
}

/* -------------------------------------------- */
/*  Pościg — środowisko (tabela s. 266)          */
/* -------------------------------------------- */

/**
 * ST Testu Pościgu zależny od środowiska. Klucz trafia do flagi sceny.
 * @type {Record<string, {id: string, nazwa: string, st: number, opis: string}>}
 */
export const SRODOWISKA = {
  otwarte: {
    id: "otwarte", nazwa: "Otwarta przestrzeń", st: 5,
    opis: "Szeroka szosa, suche podłoże."
  },
  ulice: {
    id: "ulice", nazwa: "Miejskie ulice", st: 10,
    opis: "Zakręty, rzadkie przeszkody, przypadkowi przechodnie, deszcz."
  },
  ciasno: {
    id: "ciasno", nazwa: "Wąskie uliczki", st: 15,
    opis: "Dużo przeszkód, liczni przechodnie, mgła."
  }
};

/** Domyślne środowisko nowego pościgu. */
export const SRODOWISKO_DOMYSLNE = "otwarte";

/* -------------------------------------------- */
/*  Pościg — stałe z zasad (s. 266–268)          */
/* -------------------------------------------- */

/** Metry odpowiadające jednemu znacznikowi pościgu. */
export const METRY_NA_ZNACZNIK = 36;

/** Znacznik startowy ściganych (RAW: nr 4, licząc od 1). */
export const START_SCIGANI = 4;

/** Znacznik startowy ścigających (RAW: nr 1). */
export const START_SCIGAJACY = 1;

/** Przewaga w znacznikach kończąca pościg na korzyść ściganego. */
export const PRZEWAGA_KONCZACA = 7;

/** Liczba rund, po której pościg kończy się na rzecz najdalszego uczestnika. */
export const RUND_MAKS = 10;

/**
 * Ile znaczników daje przebyty dystans. RAW: „Aby przesunąć się o 1 znacznik, kierowca musi
 * przemieścić pojazd o co najmniej 36 m”.
 * @param {number} metry
 * @returns {number}
 */
export function znacznikiZDystansu(metry) {
  return Math.floor((Number(metry) || 0) / METRY_NA_ZNACZNIK);
}
