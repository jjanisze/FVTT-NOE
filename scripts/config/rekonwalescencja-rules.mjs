/**
 * Neuroshima 5e — powrót do zdrowia: czyste zasady (PLAN_m1_walka.md §7.1, E0).
 *
 * Czysty: bez `game`, bez `CONFIG`, bez dokumentów. Czytają go odpoczynek (E5, E6), widok
 * Wyczerpania (§7.9) i kalendarzyk zdrowia (§7.8) — `prognozaZdrowia` składa się wyłącznie z
 * funkcji tego pliku, więc prognoza i żywe reguły nie mogą się rozjechać.
 *
 * ## Regeneracja Stopnia Zranienia (s. 32–33, D3, D4)
 *
 *   - Licznik Długich odpoczynków startuje z pierwszym Stopniem, +1 za każdy **ukończony** DO.
 *     Nic go nie zeruje poza sukcesem RO i wyleczeniem (Stopień 0 — licznik znika).
 *   - Licznik ≥ 3 → RO na Kondycję ST 15. Sukces: −1 Stopień, licznik od zera. Porażka: licznik
 *     stoi, RO po każdym następnym DO.
 *   - Pomoc medyczna zamiast ciała (D4): wybór przed rzutem, −1 Stopień bez testu. Dzień z
 *     medykiem liczy się do licznika jak każdy DO — chyba że tego dnia należał się RO: wtedy
 *     licznik stoi, RO czeka na następny DO.
 *
 * ## Zdejmowanie Wyczerpania (U10, U14, D5)
 *
 * Źródło schodzi zwykłym DO (−1 poziom), chyba że RAW mówi inaczej (§1, pkt 2). Uporczywe nie
 * schodzi DO, dopóki nie spełni warunku. Dodatkowe wyjścia zdejmują **wszystkie** poziomy źródła
 * naraz. Który poziom zdejmuje DO, RAW nie mówi — bierzemy kolejność, która nigdy nie szkodzi
 * graczowi: najpierw poziomy bez innego wyjścia, potem te z dodatkowym wyjściem; w grupie
 * najstarszy.
 *
 * Warstwy: NOE (RAW), RAI (orzeczenie autora — zejście z Krytycznego zdejmuje Wyczerpanie ze
 * Zranienia), WKK (`wkk/config/rekonwalescencja-kobalt.mjs`, tylko przy `{ kobalt: true }`).
 */

import { ZRANIENIE_UPORCZYWE_KOBALT } from "../wkk/config/rekonwalescencja-kobalt.mjs";

/** Regeneracja: RO na Kondycję po tylu kolejnych DO, z tym ST (s. 33). */
export const REGENERACJA = Object.freeze({ dni: 3, cecha: "con", st: 15 });

/** Kara do Testów k20 za każdy poziom Wyczerpania (s. 35). */
export const KARA_ZA_WYCZERPANIE = 2;

/** Najwyższy Stopień Zranienia — Krytyczny (s. 32). */
export const KRYTYCZNY = 4;

/** Grupy kolejności zdejmowania zwykłym DO (U14). */
export const GRUPA_DO = Object.freeze({ bezWyjscia: 0, zWyjsciem: 1 });

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const _f = o => Object.freeze(o);

/**
 * Wiek poziomu Wyczerpania: `czas` — czas świata (sekundy, `game.time.worldTime`) w chwili nałożenia.
 * Wpis bez `czas` (sprzed 2026-10-07, kiedy zapisywano czas rzeczywisty jako `addedAt`) liczy się jako
 * starszy od każdego nowego; między sobą — w kolejności listy, czyli kolejności nakładania.
 */
const _czas = w => (Number.isFinite(w?.czas) ? w.czas : -Infinity);
const _starszyNajpierw = (a, b) => {
  const ca = _czas(a.wpis);
  const cb = _czas(b.wpis);
  return (ca === cb ? 0 : (ca < cb ? -1 : 1)) || (a.i - b.i);
};

/**
 * Reguły zdejmowania per źródło Wyczerpania — klucze jak `EXHAUSTION_SOURCES`
 * (`config/exhaustion.mjs`; domknięcie pilnuje test). Wiersz NOE; WKK nadpisuje w
 * `regulaZdejmowania`. `opis` — słowa gracza do dymka pipki (§7.9).
 */
export const REGULY_ZDEJMOWANIA = _f({
  bezsennosc: _f({ grupaDO: GRUPA_DO.bezWyjscia }),
  kac: _f({ grupaDO: GRUPA_DO.bezWyjscia }),
  forsowanie: _f({ grupaDO: GRUPA_DO.bezWyjscia }),
  ogolne: _f({ grupaDO: GRUPA_DO.bezWyjscia }),
  przemarznie: _f({
    grupaDO: GRUPA_DO.zWyjsciem,
    wyjscie: _f({ id: "cieplo", opis: "Wszystkie naraz: Długi odpoczynek w cieple", strona: "s. 258", warstwa: "NOE" })
  }),
  uduszenie: _f({
    grupaDO: GRUPA_DO.zWyjsciem,
    wyjscie: _f({ id: "oddech", opis: "Wszystkie naraz: złapanie oddechu", strona: "s. 259", warstwa: "NOE" })
  }),
  skazenie: _f({
    grupaDO: GRUPA_DO.zWyjsciem,
    wyjscie: _f({ id: "radoff", opis: "Wszystkie naraz: RadOff", strona: "s. 138", warstwa: "NOE" })
  }),
  zranienie: _f({
    grupaDO: GRUPA_DO.zWyjsciem,
    // Orzeczenie autora systemu, 2026-10-06 (D5) — RAI, więc w drzewie NOE i bez przełącznika.
    wyjscie: _f({ id: "zejscie-z-krytycznego", opis: "Zejdzie też z zejściem z Krytycznego Stopnia Zranienia", strona: "s. 32", warstwa: "RAI" })
  }),
  // RAW s. 258: „nie może zostać usunięte, dopóki istota nie wypije / nie spożyje swojego dziennego
  // zapotrzebowania” — po spełnieniu warunku schodzi zwykłym DO jak każde inne (`spelnione`).
  // `status` — znacznik, który trzyma warunek na aktorze (`actors/party-supplies.mjs`).
  odwodnienie: _f({
    uporczywe: _f({ dopoki: "woda", status: "dehydration", opis: "Uporczywe — nie zejdzie, dopóki nie wypijesz dziennej porcji wody", spelniony: "dzienna porcja wody wypita", strona: "s. 258" })
  }),
  niedozywienie: _f({
    uporczywe: _f({ dopoki: "jedzenie", status: "malnutrition", opis: "Uporczywe — nie zejdzie, dopóki nie zjesz dziennej porcji jedzenia", spelniony: "dzienna porcja jedzenia zjedzona", strona: "s. 258" })
  }),
  // Bez zmian w M1 — schodzą wg własnych reguł (przebieg choroby, źródło Deadline'u).
  choroba: _f({ uporczywe: _f({ dopoki: "choroba", opis: "Uporczywe — zależy od przebiegu choroby" }) }),
  deadline: _f({ uporczywe: _f({ dopoki: "zrodlo", opis: "Uporczywe — zależy od źródła" }) })
});

/** Klucz źródła z wpisu `exhaustionSources` albo z gołego klucza. Nieznane → `ogolne`. */
function _klucz(zrodlo) {
  const key = typeof zrodlo === "string" ? zrodlo : zrodlo?.source;
  return key && key in REGULY_ZDEJMOWANIA ? key : "ogolne";
}

/**
 * Jak schodzi ten poziom Wyczerpania (U10). Jedna funkcja dla odpoczynku, widoku i kalendarzyka.
 *
 * `spelnione` — warunki uporczywości już spełnione (`dopoki`: `"woda"`, `"jedzenie"`,
 * `"zejscie-z-krytycznego"`). Podaje je warstwa Foundry z aktora; domyślnie żaden, czyli
 * ostrożnie — uporczywe zostaje uporczywe. Po spełnieniu poziom schodzi zwykłym DO, w grupie
 * bez innego wyjścia (warunek był jego jedynym wyjściem).
 * @param {string|{source: string}} zrodlo  Klucz źródła albo wpis z `exhaustionSources`.
 * @param {{kobalt?: boolean, spelnione?: Iterable<string>}} [opts]
 * @returns {{zrodlo: string, zwyklyDO: boolean, grupaDO: number|null,
 *   uporczywe: {dopoki: string, opis: string, status?: string, strona?: string}|null,
 *   spelniony: string|null,
 *   wyjscia: {id: string, opis: string, warstwa: string, strona?: string}[],
 *   warstwa: "NOE"|"WKK", opis: string}}
 */
export function regulaZdejmowania(zrodlo, { kobalt = false, spelnione = [] } = {}) {
  const key = _klucz(zrodlo);
  let row = REGULY_ZDEJMOWANIA[key];
  let warstwa = "NOE";
  if (kobalt && key === "zranienie") {
    // D5, WKK: uporczywe do zejścia z Krytycznego; wyjście RAI zostaje — to ono je wtedy zdejmuje.
    row = { ...row, grupaDO: null, uporczywe: ZRANIENIE_UPORCZYWE_KOBALT.uporczywe };
    warstwa = "WKK";
  }
  let uporczywe = row.uporczywe ?? null;
  let grupaDO = row.grupaDO ?? null;
  let spelniony = null;
  if (uporczywe && new Set(spelnione ?? []).has(uporczywe.dopoki)) {
    spelniony = uporczywe.spelniony ?? uporczywe.dopoki;
    uporczywe = null;
    grupaDO = GRUPA_DO.bezWyjscia;
  }
  const wyjscia = row.wyjscie ? [row.wyjscie] : [];
  const opis = uporczywe
    ? uporczywe.opis
    : ["Schodzi z Długim odpoczynkiem (jeden poziom na odpoczynek)", spelniony, ...wyjscia.map(w => w.opis)]
      .filter(Boolean).join(" · ");
  return _f({
    zrodlo: key,
    zwyklyDO: !uporczywe,
    grupaDO: uporczywe ? null : grupaDO,
    uporczywe,
    spelniony,
    wyjscia: _f(wyjscia),
    warstwa,
    opis
  });
}

/**
 * Kolejność, w jakiej zwykłe DO zdejmują poziomy (U14): pierwszy element schodzi przy najbliższym
 * DO. Uporczywych tu nie ma — nigdy nie schodzą zwykłym DO. W grupie: najstarszy (czas świata `czas`),
 * przy remisie — kolejność wpisów.
 * @param {Array<{source: string, czas?: number}|string>} zrodla
 * @param {{kobalt?: boolean, spelnione?: Iterable<string>}} [opts]
 * @returns {Array} te same wpisy, posortowane
 */
export function kolejnoscDO(zrodla = [], opts = {}) {
  return _wKolejce(zrodla, opts).map(x => x.wpis);
}

/** `kolejnoscDO` z indeksami wpisów — dla widoku, który musi odróżnić dwa jednakowe klucze. */
function _wKolejce(zrodla, opts) {
  return zrodla
    .map((wpis, i) => ({ wpis, i, regula: regulaZdejmowania(wpis, opts) }))
    .filter(x => x.regula.zwyklyDO)
    .sort((a, b) => (a.regula.grupaDO - b.regula.grupaDO) || _starszyNajpierw(a, b));
}

/**
 * Wyczerpanie po jednym zwykłym DO: bez pierwszego wpisu z `kolejnoscDO`.
 * @returns {Array} nowa tablica (wejście nietknięte)
 */
export function zrodlaPoDO(zrodla = [], opts = {}) {
  const [schodzi] = _wKolejce(zrodla, opts);
  if (schodzi === undefined) return [...zrodla];
  return zrodla.filter((_, i) => i !== schodzi.i);
}

/**
 * Wyczerpanie po dodatkowym wyjściu (U10): bez **wszystkich** poziomów źródeł, które to wyjście
 * mają — „Długi odpoczynek w cieple” (`cieplo`), złapanie oddechu (`oddech`), RadOff (`radoff`),
 * zejście z Krytycznego (`zejscie-z-krytycznego`, RAI). Wyjście nie zależy od warstwy: WKK zmienia
 * tylko to, czy poziom schodzi też zwykłym DO.
 * @param {Array} zrodla
 * @param {string} wyjscie  id wyjścia
 * @returns {Array} nowa tablica
 */
export function zrodlaPoWyjsciu(zrodla = [], wyjscie) {
  return zrodla.filter(z => REGULY_ZDEJMOWANIA[_klucz(z)].wyjscie?.id !== wyjscie);
}

/** Wyczerpanie po zejściu z Krytycznego (RAI): bez wszystkich poziomów ze Zranienia. */
export function zrodlaPoZejsciuZKrytycznego(zrodla = []) {
  return zrodlaPoWyjsciu(zrodla, "zejscie-z-krytycznego");
}

/**
 * Lista źródeł dopasowana do poziomu (F15). Poziom jest prawdą mechaniki — dnd5e czyta tylko
 * jego; lista to wyjaśnienie. Rozjazd zostawił stary błąd `addExhaustion` (dwa wywołania pod rząd
 * czytały spóźniony poziom pochodny: lista rosła, poziom nie). Nadmiar — odcinamy najnowsze
 * wpisy (to ich poziomy zgubił wyścig); brak — dopełniamy wpisem bez źródła, który liczy się jak
 * Ogólne. Każdy zapis przez `config/exhaustion.mjs` naprawia więc dane przy okazji.
 * @param {Array} zrodla
 * @param {number} poziom
 * @returns {Array} nowa tablica długości `poziom`
 */
export function normalizujZrodla(zrodla = [], poziom = zrodla?.length ?? 0) {
  const n = Math.max(0, Math.trunc(_num(poziom)));
  const lista = (Array.isArray(zrodla) ? zrodla : []).slice(0, n);
  while (lista.length < n) lista.push({ source: "ogolne", label: "Ogólne (źródło nieznane)", nieznane: true });
  return lista;
}

const _PORZADKOWE = ["następnym", "drugim", "trzecim", "czwartym", "piątym", "szóstym"];

/**
 * Pipki Wyczerpania w kolejności toru (§7.9, D10): uporczywe z lewej (najstarsze pierwsze), potem
 * przejściowe od schodzącego najpóźniej do schodzącego najwcześniej — **skrajna prawa schodzi przy
 * następnym DO**, tor „opróżnia się od prawej”. `linie` — dymek pipki słowami gracza.
 * @param {Array} zrodla
 * @param {{kobalt?: boolean, spelnione?: Iterable<string>}} [opts]
 * @returns {{wpis: *, zrodlo: string, uporczywe: boolean, kolejka: number|null, linie: string[]}[]}
 */
export function widokWyczerpania(zrodla = [], opts = {}) {
  const kolejka = _wKolejce(zrodla, opts);
  const wKolejce = new Set(kolejka.map(x => x.i));
  const uporczywe = zrodla
    .map((wpis, i) => ({ wpis, i, regula: regulaZdejmowania(wpis, opts) }))
    .filter(x => !wKolejce.has(x.i))
    .sort(_starszyNajpierw);

  const pipka = (x, k) => {
    const r = x.regula;
    // Wyjście, które jest zarazem warunkiem uporczywości (WKK Zranienie), opis już mówi.
    const wyjscia = r.wyjscia.filter(w => w.id !== r.uporczywe?.dopoki).map(w => w.opis);
    const linie = r.uporczywe
      ? [r.uporczywe.opis, ...wyjscia]
      : [`Zejdzie przy ${_PORZADKOWE[k - 1] ?? `${k}.`} Długim odpoczynku`, r.spelniony && `Warunek spełniony: ${r.spelniony}`, ...wyjscia];
    return { wpis: x.wpis, zrodlo: r.zrodlo, uporczywe: Boolean(r.uporczywe), kolejka: r.uporczywe ? null : k, linie: linie.filter(Boolean) };
  };
  return [
    ...uporczywe.map(x => pipka(x, null)),
    ...kolejka.map((x, j) => pipka(x, j + 1)).reverse()
  ];
}

/**
 * Licznik Regeneracji po ukończonym DO (D3, D4).
 * @param {{licznik: number, droga: "cialo"|"medyk"}} p
 * @returns {{licznik: number, rzutNalezny: boolean, wstrzymany: boolean}}
 *   `wstrzymany` — dzień z medykiem, w który należał się RO: licznik stoi, RO czeka.
 */
export function regeneracjaPoDO({ licznik = 0, droga = "cialo" } = {}) {
  const n = Math.max(0, _num(licznik));
  const nalezny = n + 1 >= REGENERACJA.dni;
  if (droga === "medyk") {
    return nalezny
      ? { licznik: n, rzutNalezny: false, wstrzymany: true }
      : { licznik: n + 1, rzutNalezny: false, wstrzymany: false };
  }
  return { licznik: n + 1, rzutNalezny: nalezny, wstrzymany: false };
}

/**
 * Licznik po RO Regeneracji (D3): sukces — od zera (RAW: powtórka „następnego dnia” zapisana tylko
 * dla porażki); porażka — bez zmian, RO po każdym następnym DO.
 * @param {{licznik: number, sukces: boolean}} p
 * @returns {{licznik: number}}
 */
export function regeneracjaPoRzucie({ licznik = 0, sukces = false } = {}) {
  return { licznik: sukces ? 0 : Math.max(0, _num(licznik)) };
}

/**
 * Szansa na zdany Rzut Obronny: k20 + premia − 2 × Wyczerpanie ≥ ST. **Bez** automatycznej 20 i 1
 * (s. 16: tylko w Teście Ataku) — szansa bywa 0 albo 1.
 * @param {{premia?: number, tryb?: number, wyczerpanie?: number, st?: number}} p
 *   `tryb`: 1 Ułatwienie, −1 Utrudnienie, 0 zwykły (jak `ADV_MODE` dnd5e).
 * @returns {number} 0–1
 */
export function szansaRO({ premia = 0, tryb = 0, wyczerpanie = 0, st = REGENERACJA.st } = {}) {
  const potrzeba = _num(st) - _num(premia) + KARA_ZA_WYCZERPANIE * Math.max(0, _num(wyczerpanie));
  const p = Math.min(1, Math.max(0, (21 - potrzeba) / 20));
  if (_num(tryb) > 0) return 1 - (1 - p) ** 2;
  if (_num(tryb) < 0) return p ** 2;
  return p;
}

/** Poziom Wyczerpania, który zabija (s. 35) — w prognozie poziomy dokłada tylko choroba. */
export const SMIERC_Z_WYCZERPANIA = 6;

/** Stan prognozy jako klucz mapy: Stopień, licznik, choroba (chory, bez korzyści), źródła. */
const _stanKlucz = (s, l, c, b, z) => `${s}|${l}|${c}${b}|${z.join(",")}`;

/**
 * Kalendarzyk zdrowia (§7.8): dokładny rozkład, DO po DO — programowanie dynamiczne po stanach
 * Stopień × licznik × Wyczerpanie (× choroba), bez Monte Carlo. Założenia (pokazywane w oknie):
 * codzienny DO, bez Fuksów, ta sama droga co DO, uporczywe Wyczerpanie z warunkiem zewnętrznym nie
 * ustępuje, choroba bez leku.
 *
 * Kolejność w obrębie DO (§7.4): Wyczerpanie −1 (U14), potem RO — rzut widzi Wyczerpanie już po
 * odpoczynku. Zejście z Krytycznego zdejmuje Wyczerpanie ze Zranienia (RAI).
 *
 * **Choroba z dziennym RO** (Choroba popromienna, Szczurza gorączka — s. 111): doba to DO, potem RO
 * choroby „na koniec dnia”. Oblany RO: poziom Wyczerpania ze źródła `choroba` (uporczywy) i następny DO
 * bez korzyści — bez −1 Wyczerpania; neutralizacja Stopnia działa (to nie „korzyść” z listy s. 45,
 * decyzja MG 2026-10-07). Zdany RO kończy dni bez korzyści (wyleczenie albo choroba przewlekła — dalszy
 * jej przebieg poza prognozą). Szósty poziom Wyczerpania to śmierć — liczona osobno (`smierc`).
 *
 * @param {object} p
 * @param {number} p.stopien                  0–4
 * @param {number} [p.licznik=0]              licznik Regeneracji (D3)
 * @param {Array<{source: string, czas?: number}|string>} [p.zrodlaWyczerpania=[]]
 * @param {{premia?: number, tryb?: number, st?: number}} [p.szansa]  RO na Kondycję z karty aktora
 * @param {boolean} [p.kobalt=false]
 * @param {Iterable<string>} [p.spelnione]   warunki uporczywości już spełnione (`regulaZdejmowania`)
 * @param {"cialo"|"medyk"} [p.droga="cialo"]  „Gojenie” albo „Z pomocą medyczną co DO”
 * @param {{st: number, premia?: number, tryb?: number, bezKorzysci?: boolean}|null} [p.choroba]
 *   choroba z dziennym RO; `bezKorzysci` — najbliższy DO już bez korzyści (oblany ostatni RO)
 * @param {number} [p.maxDO=120]
 * @returns {{
 *   dni: {do: number, zdrowy: number, smierc: number, stopien: number[]}[],
 *   progi: {najszybciej: number|null, zwykle: number|null, prawiePewnie: number|null},
 *   stopnie: {stopien: number, najszybciej: number|null, zwykle: number|null, prawiePewnie: number|null}[],
 *   zalezyOd: {zrodlo: string, opis: string}[],
 *   samoSieNieZagoi: boolean,
 *   ryzykoSmierci: number
 * }}
 *   `dni[d].stopien[k]` — szansa, że po d-tym DO postać żyje i ma Stopień ≤ k; `zdrowy` — żyje,
 *   Stopień 0, zero Wyczerpania, które schodzi odpoczynkiem, i bez choroby; `smierc` — umarła do
 *   d-tego DO. `stopnie` — progi zejścia na każdy niższy Stopień.
 */
export function prognozaZdrowia({
  stopien, licznik = 0, zrodlaWyczerpania = [], szansa = {}, kobalt = false, spelnione = [], droga = "cialo",
  choroba = null, maxDO = 120
} = {}) {
  const s0 = Math.min(KRYTYCZNY, Math.max(0, Math.trunc(_num(stopien))));
  const { premia = 0, tryb = 0, st = REGENERACJA.st } = szansa ?? {};
  const opts = { kobalt, spelnione: [...(spelnione ?? [])] };

  // Wpisy po wieku, potem tylko klucze: wiek = pozycja (kolejnoscDO bierze najstarszy w grupie).
  const start = [...zrodlaWyczerpania]
    .map((wpis, i) => ({ wpis, i }))
    .sort(_starszyNajpierw)
    .map(x => _klucz(x.wpis));

  const zalezyOd = [...new Set(start)]
    .map(k => regulaZdejmowania(k, opts))
    .filter(r => r.uporczywe && !(kobalt && r.zrodlo === "zranienie"))
    .map(r => ({ zrodlo: r.zrodlo, opis: r.uporczywe.opis }));

  const przejsciowe = zrodla => zrodla.some(k => regulaZdejmowania(k, opts).zwyklyDO);
  const zdrowyStan = (s, c, zrodla) => s === 0 && !c && !przejsciowe(zrodla);
  // Licznik ≥ dni działa tak samo jak dni — przycinamy, żeby stanów było mało.
  const przytnij = n => Math.min(REGENERACJA.dni, n);

  let stany = new Map();
  let martwy = 0;
  const dodaj = (mapa, s, l, c, b, z, p) => {
    if (!(p > 0)) return;
    if (s === 0) l = 0; // Stopień 0 — licznik znika (D3)
    const k = _stanKlucz(s, l, c, b, z);
    const e = mapa.get(k);
    if (e) e.p += p;
    else mapa.set(k, { s, l, c, b, z, p });
  };
  dodaj(stany, s0, przytnij(Math.max(0, _num(licznik))), choroba ? 1 : 0, choroba?.bezKorzysci ? 1 : 0, start, 1);

  const podsumuj = mapa => {
    let zdrowy = 0;
    const stopienLe = Array(KRYTYCZNY + 1).fill(0);
    for (const { s, c, z, p } of mapa.values()) {
      if (zdrowyStan(s, c, z)) zdrowy += p;
      for (let k = s; k <= KRYTYCZNY; k++) stopienLe[k] += p;
    }
    return { zdrowy, smierc: martwy, stopien: stopienLe };
  };

  /** Jeden DO dla stanu: lista `[Stopień, licznik, źródła, względne p]`. */
  const poDO = (s, l, b, z) => {
    const z1 = b ? [...z] : zrodlaPoDO(z, opts); // dzień bez korzyści — bez −1 Wyczerpania
    if (s === 0) return [[0, 0, z1, 1]];
    const zejdz = zz => (s === KRYTYCZNY ? zrodlaPoZejsciuZKrytycznego(zz) : zz);
    if (droga === "medyk") return [[s - 1, przytnij(regeneracjaPoDO({ licznik: l, droga }).licznik), zejdz(z1), 1]];
    const { licznik: l1, rzutNalezny } = regeneracjaPoDO({ licznik: l, droga: "cialo" });
    if (!rzutNalezny) return [[s, przytnij(l1), z1, 1]];
    const q = szansaRO({ premia, tryb, st, wyczerpanie: z1.length });
    return [
      [s - 1, regeneracjaPoRzucie({ licznik: l1, sukces: true }).licznik, zejdz(z1), q],
      [s, przytnij(regeneracjaPoRzucie({ licznik: l1, sukces: false }).licznik), z1, 1 - q]
    ];
  };

  const dni = [{ do: 0, ...podsumuj(stany) }];
  for (let d = 1; d <= Math.max(0, _num(maxDO)); d++) {
    const nast = new Map();
    for (const { s, l, c, b, z, p } of stany.values()) {
      for (const [s2, l2, z2, q] of poDO(s, l, b, z)) {
        if (!c) { dodaj(nast, s2, l2, 0, 0, z2, p * q); continue; }
        // Koniec dnia: RO choroby (s. 111) — widzi Wyczerpanie po tym DO.
        const pz = szansaRO({ premia: choroba.premia ?? 0, tryb: choroba.tryb ?? 0, st: choroba.st, wyczerpanie: z2.length });
        dodaj(nast, s2, l2, 0, 0, z2, p * q * pz);
        const z3 = [...z2, "choroba"];
        if (z3.length >= SMIERC_Z_WYCZERPANIA) martwy += p * q * (1 - pz);
        else dodaj(nast, s2, l2, 1, 1, z3, p * q * (1 - pz));
      }
    }
    stany = nast;
    dni.push({ do: d, ...podsumuj(stany) });
  }

  const EPS = 1e-9;
  const prog = (wartosc, granica) => dni.find(x => wartosc(x) >= granica - EPS)?.do ?? null;
  const progi = wartosc => ({
    najszybciej: dni.find(x => wartosc(x) > EPS)?.do ?? null,
    zwykle: prog(wartosc, 0.5),
    prawiePewnie: prog(wartosc, 0.9)
  });

  const stopnie = [];
  for (let k = s0 - 1; k >= 0; k--) stopnie.push({ stopien: k, ...progi(x => x.stopien[k]) });
  const glowne = progi(x => x.zdrowy);

  return {
    dni,
    progi: glowne,
    stopnie,
    zalezyOd,
    samoSieNieZagoi: glowne.najszybciej === null,
    ryzykoSmierci: dni.at(-1).smierc
  };
}

export const __testing = Object.freeze({
  regulaZdejmowania, kolejnoscDO, zrodlaPoDO, zrodlaPoWyjsciu, zrodlaPoZejsciuZKrytycznego, normalizujZrodla, widokWyczerpania,
  regeneracjaPoDO, regeneracjaPoRzucie, szansaRO, prognozaZdrowia
});
