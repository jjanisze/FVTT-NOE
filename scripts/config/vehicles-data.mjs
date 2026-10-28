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

/** Individual wreck images; legacy `wrak` categories remain classification metadata. */
export const GRAFIKI_WRAKOW = {
  "osobowka": "tokens/wraki/pojazd-osobowy.webp",
  "hammer": "tokens/wraki/pojazd-hammer.webp",
  "motocykl": "tokens/wraki/pojazd-motocykl.webp",
  "rower": "tokens/wraki/pojazd-rower.webp",
  "buggy": "tokens/wraki/pojazd-buggy.webp",
  "ciezarowka": "tokens/wraki/pojazd-ciezarowka.webp",
  "autobus": "tokens/wraki/pojazd-autobus.webp",
  "traktor": "tokens/wraki/pojazd-traktor.webp",
  "wozStrazacki": "tokens/wraki/pojazd-woz-strazacki.webp",
  "buldozer": "tokens/wraki/pojazd-buldozer.webp",
  "bwp": "tokens/wraki/pojazd-bwp.webp",
  "czolg": "tokens/wraki/pojazd-czolg.webp",
  "motorower": "tokens/wraki/pojazd-motorower.webp",
  "deskorolka": "tokens/wraki/pojazd-deskorolka.webp"
};

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
    szybkosc: 18, cofanie: 9, zaloga: 9, ladownosc: 5000,
    tt: 15, ttBezruchu: null, pw: 200, progObrazen: 12, progAwarii: 25,
    cena: 1500, dostepnosc: 5, rozmiar: null, silnikowy: true,
    uwagi: "M2A2 Bradley: 3 członków załogi i 6 żołnierzy desantu na ławkach przy burtach (WKK, wybór MG; zamiast ogólnej załogi 12 z NOE)."
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
/*  Katalog M4 (PLAN_m4_pojazdy §5)              */
/* -------------------------------------------- */

/**
 * Wszystko, czego tabela s. 262 nie mówi, a karta, jadący i silnik potrzebują. Warstwy (D6):
 * RAW tam, gdzie podręcznik ma statblok (Autobus, Rower, Motocykl, Osobówka); dla dziesięciu
 * pozostałych **interpolacja z tych czterech** (RAI) — ciężar i rozmiar → SIŁ, zwrotność → ZRC,
 * wytrzymałość → KON — plus jedna–dwie własne, tanie cechy (WKK). Liczby są do weta MG (§10).
 *
 *  - `obrys` — kratki 1,5 m, szerokość × długość przy obrocie 0 (przodem w dół, jak grafika).
 *    Grafika żetonu ma dokładnie ten kadr (dev/art/m4, 300 px na kratkę).
 *  - `strefy` — miejsca rozłożone ogólnie w obrysie (D3); `od`/`do` — ułamek długości od przodu.
 *    Pierwsze miejsce pierwszej strefy to kierowca. Liczba miejsc = `PODWOZIA[id].zaloga`.
 *  - `silnik` — zestaw efektów (D8): „benzyna”, „diesel”, „motocykl”; `null` = pojazd mięśniowy.
 *  - `rura` — wylot spalin w kadrze grafiki (ułamek szerokości od lewej, wysokości od góry); ta sama
 *    liczba co `exhaust` w `dev/art/m4/gen_catalog.py` — art jest malowany pod nią.
 *  - `klasa` — ST odpalania na krótko (§4.5): jednoślad 10, osobowy 15, ciężki/pancerny 20.
 *  - `wrak` — dawna klasa wraku; grafiki indywidualne wybiera `GRAFIKI_WRAKOW` (§4.12).
 *  - `cechy` — klucze `CECHY_POJAZDOW` z parametrami; `warstwa` mówi, skąd cecha jest.
 *
 * @type {Record<string, object>}
 */
export const KATALOG_POJAZDOW = {
  osobowka: {
    rozmiar: "huge", obrys: { w: 1.5, h: 3 }, silnik: "benzyna", rura: [0.30, 0.03],
    klasa: "osobowy", wrak: "osobowy", cechy: ["cofanie", "potracenie", "skokOsobowki", "gazDoDechy", "slalom"],
    statystyki: { str: 20, dex: 12, con: 16 }, zrodloStatystyk: "NOE", bak: 60, spalanie: 10,
    // Only actors built with the matched interior use these seats; older/custom art keeps its layout.
    strefyGrafiki: [{
      id: "kabina", nazwa: "Kabina", od: 0.485, do: 0.65, rzedy: [2, 3],
      kolumny: [[0.63, 0.37], [0.67, 0.5, 0.33]]
    }],
    strefy: [{ id: "kabina", nazwa: "Kabina", od: 0.3, do: 0.72, rzedy: [2, 3] }]
  },
  autobus: {
    rozmiar: "grg", obrys: { w: 2, h: 8 }, silnik: "diesel", rura: [0.78, 0.02],
    klasa: "ciezki", wrak: "ciezki", cechy: [{ id: "cofanie", cwierc: true }, "potracenie", "skokAutobusu"],
    statystyki: { str: 26, dex: 8, con: 20 }, zrodloStatystyk: "NOE", bak: 300, spalanie: 40,
    strefyGrafiki: [
      { id: "kabina", nazwa: "Kierowca", od: 0.167, do: 0.167, rzedy: [1], kolumny: [[0.737]], kierowca: true },
      { id: "pasazerowie", nazwa: "Pasażerowie", od: 0.272, do: 0.603, rzedy: [4,4,4,4,4],
        kolumny: Array.from({ length: 5 }, () => [0.788,0.64,0.365,0.217]) }
    ],
    strefy: [{ id: "kabina", nazwa: "Wnętrze", od: 0.06, do: 0.94, rzedy: [1, 4, 4, 4, 4, 4] }]
  },
  motocykl: {
    rozmiar: "lg", obrys: { w: 0.5, h: 1.5 }, silnik: "motocykl", rura: [0.30, 0.05],
    klasa: "jednoslad", wrak: "jednoslad", cechy: [{ id: "akrobacja", test: "pojazdy", st: 15 }, "skokMotocykla", "szostyBieg", "slalom"],
    statystyki: { str: 16, dex: 16, con: 12 }, zrodloStatystyk: "NOE", bak: 18, spalanie: 5,
    strefyGrafiki: [{ id: "siodlo", nazwa: "Siodło", od: 0.54, do: 0.735, rzedy: [1, 1],
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }],
    strefy: [{ id: "siodlo", nazwa: "Siodło", od: 0.42, do: 0.68, rzedy: [1, 1],
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }]
  },
  rower: {
    rozmiar: "med", obrys: { w: 0.6, h: 1.5 }, silnik: null, rura: null,
    klasa: "jednoslad", wrak: "jednoslad", cechy: [{ id: "akrobacja", test: "akrobatyka", st: 10 }, "skokRoweru", "uciazliwyPancerz", "przerzutka", "slalom"],
    statystyki: { str: 10, dex: 18, con: 10 }, zrodloStatystyk: "NOE", bak: 0, spalanie: 0,
    strefyGrafiki: [{ id: "siodlo", nazwa: "Siodełko", od: 0.69, do: 0.69, rzedy: [1],
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }],
    strefy: [{ id: "siodlo", nazwa: "Siodełko", od: 0.55, do: 0.55, rzedy: [1],
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }]
  },
  buggy: {
    rozmiar: "lg", obrys: { w: 1.4, h: 2.8 }, silnik: "benzyna", rura: [0.50, 0.035],
    klasa: "osobowy", wrak: "osobowy", cechy: ["terenowka", "skokMotocykla", "potracenie", "slalom", "otwartaRama"],
    statystyki: { str: 16, dex: 16, con: 12 }, zrodloStatystyk: "RAI", bak: 40, spalanie: 8,
    strefyGrafiki: [{ id: "kabina", nazwa: "Fotele", od: 0.525, do: 0.525, rzedy: [2],
      kolumny: [[0.635, 0.365]], oslona: "polowa", prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }],
    strefy: [{ id: "kabina", nazwa: "Fotele", od: 0.45, do: 0.45, rzedy: [2], oslona: "polowa",
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }]
  },
  hammer: {
    rozmiar: "huge", obrys: { w: 1.5, h: 3 }, silnik: "diesel", rura: [0.25, 0.03],
    klasa: "osobowy", wrak: "osobowy", cechy: ["terenowka", "cofanie", "potracenie", "gazDoDechy", "wiezyczka"],
    statystyki: { str: 20, dex: 10, con: 18 }, zrodloStatystyk: "RAI", bak: 95, spalanie: 15,
    strefyGrafiki: [
      { id: "kabina", nazwa: "Kabina", od: 0.47, do: 0.64, rzedy: [2, 2],
        kolumny: [[0.67, 0.33], [0.67, 0.33]] },
      { id: "wiezyczka", nazwa: "Wieżyczka", od: 0.565, do: 0.565, rzedy: [1],
        kolumny: [[0.5]], stanowisko: true, oslona: "trzyCzwarte",
        prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }
    ],
    strefy: [
      { id: "kabina", nazwa: "Kabina", od: 0.3, do: 0.68, rzedy: [2, 2] },
      { id: "wiezyczka", nazwa: "Wieżyczka", od: 0.52, do: 0.52, rzedy: [1], stanowisko: true, oslona: "trzyCzwarte",
        prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }
    ]
  },
  ciezarowka: {
    rozmiar: "grg", obrys: { w: 2, h: 6 }, silnik: "diesel", rura: [0.115, 0.60],
    klasa: "ciezki", wrak: "ciezki", cechy: [{ id: "cofanie", cwierc: true }, "potracenie", "paka"],
    statystyki: { str: 24, dex: 8, con: 18 }, zrodloStatystyk: "RAI", bak: 200, spalanie: 30,
    strefyGrafiki: [
      { id: "kabina", nazwa: "Kabina", od: 0.290556, do: 0.290556, rzedy: [3],
        kolumny: [[0.675, 0.5, 0.325]] },
      { id: "paka", nazwa: "Paka", od: 0.52, do: 0.84, rzedy: [3, 3, 2],
        kolumny: [[0.72, 0.5, 0.28], [0.72, 0.5, 0.28], [0.66, 0.34]],
        stojace: true, oslona: "polowa", prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }
    ],
    strefy: [
      { id: "kabina", nazwa: "Kabina", od: 0.2, do: 0.2, rzedy: [3] },
      { id: "paka", nazwa: "Paka", od: 0.42, do: 0.92, rzedy: [3, 3, 2], stojace: true, oslona: "polowa",
        prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }
    ]
  },
  wozStrazacki: {
    rozmiar: "grg", obrys: { w: 2, h: 5.5 }, silnik: "diesel", rura: [0.242, 0.43],
    klasa: "ciezki", wrak: "ciezki", cechy: ["cofanie", "potracenie", "dzialkoWodne", "syrena"],
    statystyki: { str: 24, dex: 8, con: 18 }, zrodloStatystyk: "RAI", bak: 200, spalanie: 35,
    strefyGrafiki: [
      { id: "kabina", nazwa: "Kabina", od: 0.198, do: 0.305, rzedy: [3, 2],
        kolumny: [[0.685, 0.5, 0.335], [0.683, 0.341]] },
      { id: "dzialko", nazwa: "Działko wodne", od: 0.527, do: 0.527, rzedy: [1], kolumny: [[0.64]],
        stanowisko: true, oslona: "polowa", prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }
    ],
    strefy: [
      { id: "kabina", nazwa: "Kabina", od: 0.1, do: 0.28, rzedy: [3, 2] },
      { id: "dzialko", nazwa: "Działko wodne", od: 0.5, do: 0.5, rzedy: [1], stanowisko: true, oslona: "polowa",
        prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }
    ]
  },
  buldozer: {
    rozmiar: "grg", obrys: { w: 2.5, h: 4 }, silnik: "diesel", rura: [0.451, 0.538],
    klasa: "ciezki", wrak: "gasienicowy", cechy: ["gasienice", "lemiesz", "bezGazuDoDechy"],
    statystyki: { str: 28, dex: 6, con: 22 }, zrodloStatystyk: "RAI", bak: 400, spalanie: 40,
    strefyGrafiki: [{ id: "kabina", nazwa: "Operator i pomocnik", od: 0.6133, do: 0.6133, rzedy: [2],
      kolumny: [[0.4387, 0.5747]], prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }],
    strefy: [{ id: "kabina", nazwa: "Kabina", od: 0.6, do: 0.6, rzedy: [2],
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }]
  },
  czolg: {
    rozmiar: "grg", obrys: { w: 2.6, h: 5.6 }, silnik: "diesel", rura: [0.50, 0.059524],
    teksturaGrafiki: { fit: "width", anchorX: 0.5, anchorY: 0.4 },
    wiezaGrafiki: { kadr: [780,2100], os: [389,884], wycinek: [70,458,638,1588] },
    klasa: "pancerny", wrak: "gasienicowy", cechy: ["gasienice", "wieza", "pancerneWnetrze", "miazdzenie"],
    statystyki: { str: 28, dex: 6, con: 24 }, zrodloStatystyk: "RAI", bak: 500, spalanie: 120,
    strefyGrafiki: [
      { id: "kadlub", nazwa: "Kierowca", od: 0.220238, do: 0.220238, rzedy: [1], kolumny: [[0.5]], oslona: "calkowita" },
      { id: "wieza", nazwa: "Dowódca i ładowniczy", od: 0.541667, do: 0.479167, rzedy: [1,1],
        kolumny: [[0.365385],[0.662821]], oslona: "calkowita" },
      { id: "dzialo", nazwa: "Działonowy", od: 0.416667, do: 0.416667, rzedy: [1],
        kolumny: [[0.353846]], stanowisko: true, oslona: "calkowita" }
    ],
    strefy: [
      { id: "kadlub", nazwa: "Kadłub", od: 0.14, do: 0.14, rzedy: [1], oslona: "calkowita" },
      { id: "wieza", nazwa: "Wieża", od: 0.48, do: 0.48, rzedy: [2], oslona: "calkowita" },
      { id: "dzialo", nazwa: "Działonowy", od: 0.6, do: 0.6, rzedy: [1], stanowisko: true, oslona: "calkowita" }
    ]
  },
  bwp: {
    rozmiar: "grg", obrys: { w: 2.4, h: 4.5 }, silnik: "diesel", rura: [0.165278, 0.731852],
    wiezaGrafiki: { kadr: [720,1350], os: [300,790], wycinek: [81,586,495,627] },
    klasa: "pancerny", wrak: "gasienicowy", cechy: ["gasienice", "pancerneWnetrze", "desant", "strzelnice"],
    statystyki: { str: 26, dex: 8, con: 22 }, zrodloStatystyk: "RAI", bak: 460, spalanie: 60,
    strefy: [
      { id: "kabina", nazwa: "Kierowca", od: 0.252593, do: 0.252593, rzedy: [1], kolumny: [[0.706944]], obroty: [[0]], oslona: "calkowita" },
      { id: "wieza", nazwa: "Działonowy i dowódca", od: 0.418519, do: 0.418519, rzedy: [2],
        kolumny: [[0.513889, 0.323611]], obroty: [[0, 0]], stanowisko: true, oslona: "calkowita" },
      { id: "desant", nazwa: "Desant — ławki przy burtach", od: 0.594074, do: 0.837037, rzedy: [2, 2, 2],
        kolumny: [[0.704167, 0.293056], [0.704167, 0.293056], [0.704167, 0.293056]],
        obroty: [[90, 270], [90, 270], [90, 270]], oslona: "calkowita" }
    ]
  },
  traktor: {
    rozmiar: "huge", obrys: { w: 1.5, h: 2.5 }, silnik: "diesel", rura: [0.567, 0.499],
    klasa: "ciezki", wrak: "ciezki", cechy: ["terenowka", "uciag"],
    statystyki: { str: 22, dex: 8, con: 18 }, zrodloStatystyk: "RAI", bak: 150, spalanie: 20,
    strefyGrafiki: [{ id: "kabina", nazwa: "Siedzisko i błotnik", od: 0.68, do: 0.706667, rzedy: [1, 1],
      kolumny: [[0.5], [0.704444]], prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }],
    strefy: [{ id: "kabina", nazwa: "Siedzisko i błotnik", od: 0.58, do: 0.72, rzedy: [1, 1],
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }]
  },
  motorower: {
    rozmiar: "med", obrys: { w: 0.6, h: 1.56 }, silnik: "motocykl", rura: [0.25, 0.18],
    klasa: "jednoslad", wrak: "jednoslad", cechy: [{ id: "akrobacja", test: "pojazdy", st: 10 }, "slalom", "oszczedny"],
    statystyki: { str: 12, dex: 14, con: 10 }, zrodloStatystyk: "RAI", bak: 6, spalanie: 2,
    strefyGrafiki: [{ id: "siodlo", nazwa: "Siodełko", od: 0.64, do: 0.64, rzedy: [1],
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }],
    strefy: [{ id: "siodlo", nazwa: "Siodełko", od: 0.55, do: 0.55, rzedy: [1],
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }]
  },
  deskorolka: {
    rozmiar: "sm", obrys: { w: 0.6, h: 0.72 }, silnik: null, rura: null,
    klasa: "jednoslad", wrak: "jednoslad", cechy: ["uciazliwyPancerz", "ollie"],
    statystyki: { str: 6, dex: 16, con: 8 }, zrodloStatystyk: "RAI", bak: 0, spalanie: 0,
    strefy: [{ id: "deska", nazwa: "Deska", od: 0.5, do: 0.5, rzedy: [1], stojace: true,
      prezentacja: { widocznosc: "otwarta", warstwa: "nad" } }]
  }
};

/** Kości Potrącenia wg rozmiaru pojazdu (§5): kotwice RAW — Wielka 3k10 / 4k10, Ogromna 6k10 / 8k10. */
export const POTRACENIE_WG_ROZMIARU = {
  lg: { ofiara: "2d10", wieksza: "3d10", ofiaraMaks: "med" },
  huge: { ofiara: "3d10", wieksza: "4d10", ofiaraMaks: "med" },
  grg: { ofiara: "6d10", wieksza: "8d10", ofiaraMaks: "lg" }
};

/** ST odpalania na krótko wg klasy pojazdu (D12, WKK). */
export const ST_NA_KROTKO = { jednoslad: 10, osobowy: 15, ciezki: 20, pancerny: 20 };

/**
 * Cechy pojazdów. `opis(p)` — parafraza (repozytorium publiczne), `p` — parametry z katalogu.
 * `warstwa`: „NOE” (statblok RAW), „RAI” (cecha RAW przeniesiona na pojazd bez statbloku),
 * „WKK” (nasza). `czas`: null (pasywna), „bonus”, „reakcja”, „akcja”.
 * @type {Record<string, {nazwa: string, warstwa: string, czas: string|null, opis: (p: object) => string}>}
 */
export const CECHY_POJAZDOW = {
  cofanie: {
    nazwa: "Cofanie", warstwa: "NOE", czas: null,
    opis: p => `Jedzie do tyłu z ${p.cwierc ? "jedną czwartą" : "połową"} Szybkości; Testy Mądrości (Pojazdy) w czasie cofania — z Utrudnieniem.`
  },
  potracenie: {
    nazwa: "Potrącenie", warstwa: "NOE", czas: null,
    opis: p => `Przejazd przez pole z istotą ${p.ofiaraMaks} lub mniejszą: RO na Zręczność ST 15 albo Powalenie i ${p.ofiara} obuchowych (już Powalona — drugi raz tyle). Istota większa: ona, pojazd i jadący dostają ${p.wieksza}.`
  },
  skokOsobowki: {
    nazwa: "Skok", warstwa: "NOE", czas: null,
    opis: () => "Po co najmniej 72 m prosto w tej turze i Teście Mądrości (Pojazdy) ST 20 — skok do 9 m (18 m przy podwójnym rozbiegu). Porażka: ląduje przewrócony. Lądowanie — obrażenia od upadku dla pojazdu i jadących; rampa wydłuża skok o różnicę wysokości."
  },
  skokAutobusu: {
    nazwa: "Skok", warstwa: "NOE", czas: null,
    opis: () => "Po co najmniej 72 m prosto w tej turze i Teście Mądrości (Pojazdy) ST 20 — skok do 6 m (12 m przy podwójnym rozbiegu). Porażka: ląduje przewrócony. Lądowanie — obrażenia od upadku dla pojazdu i jadących."
  },
  skokMotocykla: {
    nazwa: "Skok", warstwa: "NOE", czas: null,
    opis: () => "Po co najmniej 36 m prosto w tej turze i Teście Mądrości (Pojazdy) ST 20 — skok do 9 m (18 m przy podwójnym rozbiegu). Porażka: maszyna i kierowca lądują Powaleni. Lądowanie — obrażenia od upadku."
  },
  skokRoweru: {
    nazwa: "Skok", warstwa: "NOE", czas: null,
    opis: () => "Po co najmniej 18 m prosto w tej turze i Teście Zręczności (Akrobatyka) ST 15 — skok do 3 m (6 m przy podwójnym rozbiegu). Lądowanie — obrażenia od upadku dla roweru i rowerzysty."
  },
  akrobacja: {
    nazwa: "Akrobacja", warstwa: "NOE", czas: null,
    opis: p => `Raz w turze, za połowę Szybkości: jazda na jednym kole, bez trzymanki, nawrót w miejscu — Test ${p.test === "pojazdy" ? "Mądrości (Pojazdy)" : "Zręczności (Akrobatyka)"} ST ${p.st}. Porażka: Powalenie i zatrzymanie.`
  },
  uciazliwyPancerz: {
    nazwa: "Uciążliwy pancerz", warstwa: "NOE", czas: null,
    opis: () => "Jadący w ciężkim pancerzu ma Utrudnienie do Testów Zręczności (Akrobatyka) na tym pojeździe."
  },
  przerzutka: {
    nazwa: "Przerzutka", warstwa: "NOE", czas: "bonus",
    opis: () => "Zmiana przełożenia: szosowe — Szybkość rowerzysty ×3 (dobra droga), standardowe — ×2, terenowe — ×1 (trudny, stabilny teren)."
  },
  szostyBieg: {
    nazwa: "Szósty bieg", warstwa: "NOE", czas: "bonus",
    opis: () => "Do początku następnej tury dodatkowy ruch równy Szybkości ×2. Ataki na motocykl i kierowcę — z Utrudnieniem, kierowca też atakuje z Utrudnieniem; ST Testów (Pojazdy) +5 do końca następnej tury. Trudny teren lub przeszkoda: przewrócenie, 6k10 obuchowych maszynie i kierowcy."
  },
  gazDoDechy: {
    nazwa: "Gaz do dechy", warstwa: "NOE", czas: "bonus",
    opis: () => "Poza trudnym terenem: do początku następnej tury dodatkowy ruch równy Szybkości ×2. Ataki na pojazd i jadących — z Utrudnieniem, jadący też atakują z Utrudnieniem; ST Testów (Pojazdy) +5 do końca następnej tury. Trudny teren lub przeszkoda: przewrócenie, 4k10 obuchowych pojazdowi i jadącym."
  },
  slalom: {
    nazwa: "Slalom", warstwa: "NOE", czas: "reakcja",
    opis: () => "Ułatwienie do jednego Rzutu Obronnego pojazdu na Zręczność."
  },
  terenowka: {
    nazwa: "Terenówka", warstwa: "RAI", czas: null,
    opis: () => "Pojazd przystosowany do trudnego terenu (s. 261): jedzie tam z połową Szybkości bez testów kierowcy."
  },
  gasienice: {
    nazwa: "Gąsienice", warstwa: "WKK", czas: null,
    opis: () => "Gruz i trudny teren bez kary do Szybkości i bez testów."
  },
  otwartaRama: {
    nazwa: "Otwarta rama", warstwa: "WKK", czas: null,
    opis: () => "Jadący nigdy nie mają więcej niż połowiczną osłonę."
  },
  wiezyczka: {
    nazwa: "Wieżyczka", warstwa: "WKK", czas: null,
    opis: () => "Stanowisko na dachu: strzelec ma osłonę ¾, broń montowana strzela w każdą stronę."
  },
  paka: {
    nazwa: "Paka", warstwa: "WKK", czas: null,
    opis: () => "Miejsca stojące z połowiczną osłoną. W jadącej ciężarówce stojący na pace na początku swojej tury zdaje Test Zręczności (Akrobatyka) ST 10 albo jest Powalony."
  },
  dzialkoWodne: {
    nazwa: "Działko wodne", warstwa: "WKK", czas: "akcja",
    opis: () => "Ze stanowiska: linia 18 m. Gasi Podpalenie i ogień; istoty w linii — RO na Siłę ST 13 albo odepchnięte o 3 m i Powalone. Zbiornik na 10 strzałów."
  },
  syrena: {
    nazwa: "Syrena", warstwa: "WKK", czas: "bonus",
    opis: () => "Do następnej tury kierowcy Utrudnienie do Testów Mądrości (Percepcja) opartych na słuchu w promieniu 30 m."
  },
  lemiesz: {
    nazwa: "Lemiesz", warstwa: "WKK", czas: "akcja",
    opis: () => "Spycha przeszkody i mniejsze pojazdy. Istoty przed lemieszem: RO na Siłę ST 15 albo przepchnięte i Powalone. Niszczenie obiektów ×2."
  },
  bezGazuDoDechy: {
    nazwa: "Wolny jak walec", warstwa: "WKK", czas: null,
    opis: () => "Nie ma Gazu do dechy ani podobnych przyspieszeń."
  },
  wieza: {
    nazwa: "Wieża", warstwa: "WKK", czas: null,
    opis: () => "Stanowisko działonowego strzela w każdą stronę."
  },
  pancerneWnetrze: {
    nazwa: "Pancerne wnętrze", warstwa: "WKK", czas: null,
    opis: () => "Jadący mają całkowitą osłonę; ze środka strzelają tylko z broni montowanej."
  },
  miazdzenie: {
    nazwa: "Miażdżenie", warstwa: "WKK", czas: null,
    opis: () => "Powalona istota nie ma Rzutu Obronnego przeciw Potrąceniu."
  },
  desant: {
    nazwa: "Desant", warstwa: "WKK", czas: null,
    opis: () => "Rampa: desant wysiada bez kosztu ruchu."
  },
  strzelnice: {
    nazwa: "Strzelnice", warstwa: "WKK", czas: null,
    opis: () => "Desant strzela ze środka z osłoną ¾."
  },
  uciag: {
    nazwa: "Uciąg", warstwa: "WKK", czas: "akcja",
    opis: () => "Holuje pojazd do swojego rozmiaru albo przyczepę (Szybkość obu ×½); wyciąga z rowu i gruzu."
  },
  oszczedny: {
    nazwa: "Oszczędny", warstwa: "WKK", czas: null,
    opis: () => "Spalanie 2 l / 100 km."
  },
  ollie: {
    nazwa: "Ollie", warstwa: "WKK", czas: null,
    opis: () => "Raz w turze za połowę Szybkości, Test Zręczności (Akrobatyka) ST 10: przeskok przez krawężnik lub przeszkodę do 1 m. Porażka — Powalenie."
  }
};

/** Etykiety rozmiarów maszyn (rodzaj żeński, jak w statblokach: „Wielka maszyna”). */
export const ROZMIAR_MASZYNY = { tiny: "Drobna", sm: "Mała", med: "Średnia", lg: "Duża", huge: "Wielka", grg: "Ogromna" };

/** Cechy pojazdu jako `{id, …parametry}`; Potrącenie dostaje kości wg rozmiaru. */
export function cechyPojazdu(id) {
  const k = KATALOG_POJAZDOW[id];
  if (!k) return [];
  return k.cechy.map(c => {
    const wpis = typeof c === "string" ? { id: c } : { ...c };
    if (wpis.id === "potracenie") {
      const d = POTRACENIE_WG_ROZMIARU[k.rozmiar] ?? POTRACENIE_WG_ROZMIARU.lg;
      Object.assign(wpis, { ofiara: d.ofiara.replace("d", "k"), wieksza: d.wieksza.replace("d", "k"),
        ofiaraMaks: { sm: "małą", med: "średnią", lg: "dużą", huge: "wielką" }[d.ofiaraMaks] ?? d.ofiaraMaks });
    }
    return wpis;
  });
}

/** Rozmiar pojazdu: statblok RAW, a bez niego katalog (RAI). */
export function rozmiarPojazdu(id) {
  return PODWOZIA[id]?.rozmiar ?? KATALOG_POJAZDOW[id]?.rozmiar ?? null;
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
