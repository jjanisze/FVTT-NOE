/**
 * Neuroshima 5e — obiekty: czyste tabele i zasady (NOE s. 253–254; PLAN_m6_drobne_zasady.md §5.4, D5, U9, U10).
 *
 * MG (D5, P8): zniszczalność dorzuca się arbitralnie, tylko wtedy, gdy gracze chcą coś zniszczyć — obiekt to licznik
 * PW i odporności bez grafiki, nałożony na coś, co już jest w świecie (drzwi, kafel, drzewo z tła). Warstwa Foundry:
 * `scenes/obiekty.mjs`.
 *
 *   - **TT** z materiału (s. 253) — 8 progów 11–23;
 *   - **PW** z rozmiaru × kruchości (s. 253) — stała albo kości;
 *   - **niewrażliwość** na trucizny i obrażenia psychiczne; **brak Cech** — automatyczna porażka każdego RO (s. 254);
 *   - opcjonalny **Próg obrażeń** (s. 254 — natywny `hp.dt` dnd5e 6);
 *   - `burząca` ×2 obiektom, `karczująca` ×2 (cięte) roślinom i drewnu (s. 117) — pojazd też jest obiektem (s. 254).
 */

const _f = Object.freeze;

/** Materiały i TT (s. 253, tabela „Trudność Trafienia obiektów”). */
export const MATERIALY = _f({
  papier: _f({ tt: 11, label: "Ubranie, papier, lina" }),
  szklo: _f({ tt: 13, label: "Szkło, lód, cienki plastik" }),
  drewno: _f({ tt: 15, label: "Drewno, gruby plastik", drewno: true }),
  cienkaBlacha: _f({ tt: 16, label: "Szkło pancerne, cienka blacha stalowa" }),
  kamien: _f({ tt: 17, label: "Kamień, beton" }),
  grubaBlacha: _f({ tt: 19, label: "Gruba blacha stalowa" }),
  tytan: _f({ tt: 21, label: "Tytan" }),
  chrom: _f({ tt: 23, label: "Chrom" })
});

/** Kruchość (kolumny tabeli PW). */
export const KRUCHOSC = _f({ kruchy: "Kruchy", wytrzymaly: "Wytrzymały", twardy: "Twardy" });
const KOLUMNA = _f({ kruchy: 0, wytrzymaly: 1, twardy: 2 });

/**
 * Rozmiary obiektów (s. 253, tabela „Punkty wytrzymałości obiektów”): PW `[stała, kości]` per kruchość, rozmiar
 * dnd5e (do kart) i bok żetonu w polach.
 */
export const ROZMIARY = _f({
  malutki: _f({ label: "Malutki (butelka, kłódka, kawałek łańcucha)", dnd5e: "tiny", pola: 0.5,
    pw: _f([_f([2, "1d4"]), _f([5, "2d4"]), _f([10, "4d4"])]) }),
  maly: _f({ label: "Mały (laptop, skrzynka, felga)", dnd5e: "sm", pola: 1,
    pw: _f([_f([3, "1d6"]), _f([10, "3d6"]), _f([27, "9d6"])]) }),
  sredni: _f({ label: "Średni (beczka, drzwi, sejf)", dnd5e: "med", pola: 1,
    pw: _f([_f([4, "1d8"]), _f([18, "4d8"]), _f([64, "16d8"])]) }),
  duzy: _f({ label: "Duży (okno, stół, stalowe dwuskrzydłowe drzwi)", dnd5e: "lg", pola: 2,
    pw: _f([_f([5, "1d10"]), _f([27, "5d10"]), _f([125, "25d10"])]) }),
  wielki: _f({ label: "Wielki (witryna, brama, gruby mur)", dnd5e: "huge", pola: 3,
    pw: _f([_f([6, "1d12"]), _f([36, "6d12"]), _f([216, "36d12"])]) })
});

/** Niewrażliwości każdego obiektu (s. 253). */
export const NIEWRAZLIWOSCI_OBIEKTU = _f(["poison", "psychic"]);

/**
 * Szablony (U10 — przegrody z eksportu; reszta — szybkie wybory w oknie). `klasa` — klasa przegrody eksportera
 * (`Maps/tools/wall_rules.py`), z której szablon jest domyślny.
 */
export const SZABLONY = _f({
  drzwi: _f({ label: "Drzwi drewniane", rozmiar: "sredni", material: "drewno", kruchosc: "wytrzymaly", klasy: _f(["door", "door_locked", "secret_door"]) }),
  drzwiStalowe: _f({ label: "Drzwi stalowe", rozmiar: "sredni", material: "cienkaBlacha", kruchosc: "twardy", klasy: _f([]) }),
  okno: _f({ label: "Okno", rozmiar: "duzy", material: "szklo", kruchosc: "kruchy", klasy: _f(["window"]) }),
  plot: _f({ label: "Płot", rozmiar: "duzy", material: "cienkaBlacha", kruchosc: "wytrzymaly", klasy: _f(["fence"]) }),
  brama: _f({ label: "Brama", rozmiar: "wielki", material: "cienkaBlacha", kruchosc: "wytrzymaly", klasy: _f(["gate"]) }),
  balustrada: _f({ label: "Balustrada", rozmiar: "sredni", material: "drewno", kruchosc: "wytrzymaly", klasy: _f(["railing"]) }),
  mur: _f({ label: "Mur (fragment)", rozmiar: "wielki", material: "kamien", kruchosc: "twardy", prog: 10, klasy: _f(["wall"]) }),
  klodka: _f({ label: "Kłódka", rozmiar: "malutki", material: "grubaBlacha", kruchosc: "twardy", klasy: _f([]) }),
  beczka: _f({ label: "Beczka", rozmiar: "sredni", material: "cienkaBlacha", kruchosc: "wytrzymaly", klasy: _f([]) }),
  drzewo: _f({ label: "Drzewo", rozmiar: "duzy", material: "drewno", kruchosc: "twardy", roslina: true, klasy: _f([]) })
});

/** Szablon dla klasy przegrody z eksportu (U10) albo null. */
export function szablonDlaKlasy(klasa) {
  return Object.entries(SZABLONY).find(([, s]) => s.klasy.includes(klasa))?.[0] ?? null;
}

/** TT obiektu z materiału (s. 253). */
export function ttObiektu(material) {
  return MATERIALY[material]?.tt ?? null;
}

/**
 * PW obiektu (s. 253): wartość stała z tabeli albo wynik rzutu (`rzut(formula)` → liczba).
 * @param {string} rozmiar
 * @param {string} kruchosc
 * @param {{rzut?: (formula: string) => number}} [opts]
 * @returns {{pw: number, formula: string}|null}
 */
export function pwObiektu(rozmiar, kruchosc, { rzut = null } = {}) {
  const wiersz = ROZMIARY[rozmiar]?.pw?.[KOLUMNA[kruchosc]];
  if (!wiersz) return null;
  const [stala, formula] = wiersz;
  const pw = rzut ? Math.max(1, Math.floor(Number(rzut(formula)) || stala)) : stala;
  return { pw, formula };
}

/** U9 (MG): rozmiar obiektu z wagi przedmiotu na ziemi. */
export function rozmiarZWagi(kg) {
  const w = Math.max(0, Number(kg) || 0);
  if (w <= 1) return "malutki";
  if (w <= 10) return "maly";
  if (w <= 100) return "sredni";
  return "duzy";
}

/**
 * Mnożnik obrażeń przeciw obiektowi (s. 117): `burząca` ×2 wszystkim obrażeniom; `karczująca` ×2 obrażeniom ciętym, gdy
 * cel to roślina albo drewno. Zwraca `{calosc, ciete}` — dnd5e `options.multiplier` i mnożnik części ciętych.
 * @param {{burzaca?: boolean, karczujaca?: boolean, drewno?: boolean}} o
 */
export function mnoznikObiektu({ burzaca = false, karczujaca = false, drewno = false } = {}) {
  return { calosc: burzaca ? 2 : 1, ciete: karczujaca && drewno ? 2 : 1 };
}

/** RO obiektu: automatyczna porażka (s. 254) — część rzutu, która ją gwarantuje. */
export const AUTOMATYCZNA_PORAZKA = "-99";

/** Aktor jest obiektem (flaga aktora bazowego, dziedziczona przez deltę żetonu). */
export function jestObiektem(actor) {
  return !!actor?.flags?.["neuroshima-2026-overrides"]?.obiekt;
}

export const __testing = _f({ ttObiektu, pwObiektu, rozmiarZWagi, mnoznikObiektu, szablonDlaKlasy });
