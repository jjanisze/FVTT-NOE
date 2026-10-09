/**
 * Neuroshima 5e — towarzysze i drony: czyste zasady (PLAN_m3_towarzysze.md §7.1, E0).
 *
 * Czysty: bez `game`, bez `CONFIG`, bez dokumentów. Warstwa Foundry to `actors/towarzysze.mjs`
 * (wartości pochodne, przeliczanie), walka, karty i drony; tu tylko liczby i rozstrzygnięcia, które
 * one czytają. Dane rodzajów — `config/towarzysze-data.mjs`; tabela napraw WKK —
 * `wkk/config/naprawa-awarii-kobalt.mjs` (tylko przy `{ kobalt: true }`).
 *
 * ## Reguły
 *
 *   - **Statystyki pochodne** (§3.2) z bieżących wartości właściciela (towarzysze), ze stempla twórcy
 *     (dron, D23) i z operatora na żywo (dron). „½ poziomu” w dół, min. 1 (U6, RAI). PW min. 1 —
 *     maks. PW 0 to śmierć (s. 34), a wzór z ujemnym modyfikatorem nie jest przyczyną śmierci.
 *   - **Cechy ludzkiego towarzysza** (s. 76, 101): zestaw 14,14,12,12,10,8 albo 24 pkt z tabeli
 *     Kupowania cech (s. 48) — RAI (U5). Zestaw kosztuje dokładnie 24 pkt.
 *   - **Kolejność w walce** (U7): towarzysz porównywany jak właściciel; w parze właściciel pierwszy.
 *   - **Tura** (§3.3, D2, U8): Partner i zwierzę — tura z zatrzaskiem Komendy, bez niego Unikanie;
 *     Prawa ręka — zawsze tura; dron — bez własnej tury (D35).
 *   - **Aktywacja drona** (D36): [B] — ruch, unik, odwrót, przedmiot; [A] — wszystko; [R] — reakcja.
 *   - **Stopnie Zranienia** (s. 205, 214; U10): kto je ma, ten umiera jak BG; maszyny nigdy.
 *   - **Tabela awarii maszyn** (s. 214, D10): pozycja niepasująca → kolejna.
 *   - **Naprawa** (s. 83, D9): PW 2k6 + mod. INT; awarie — NOE: MG, WKK: tabela §7.11.
 *   - **Sygnał** (D32, U17), **RSSI na OSD** (D34), **upadek drona latającego** (s. 253, D29),
 *     **zasilanie** (s. 83, U15), **TT celu Emitera EMP** (s. 101, D27).
 */

import { RODZAJE, TURY, KONTROLERY, AGREGAT_L_NA_H } from "./towarzysze-data.mjs";
import { NAPRAWA, NAPRAWA_KOLEJNOSC, parseSurowce } from "./production-rules.mjs";
import {
  ULAMKI_NAPRAWY_KOBALT, CHEMIA_NAPRAWY_KOBALT, NAPRAWA_AWARII_KOBALT
} from "../wkk/config/naprawa-awarii-kobalt.mjs";

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const EPS = 1e-9;

/* -------------------------------------------- */
/*  Wzory — ścisła gramatyka roll data           */
/* -------------------------------------------- */

/** Konteksty, do których wzór towarzysza może się odwołać (U2). */
export const KONTEKSTY_WZOROW = Object.freeze(["wlasciciel", "tworca", "operator"]);

const _FUNKCJE = Object.freeze({ floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max });

function _tokeny(wzor) {
  const src = String(wzor ?? "");
  const re = /\s*(?:(\d+(?:\.\d+)?)|(@[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)|([A-Za-z_]\w*)|([-+*/(),]))/y;
  const out = [];
  let i = 0;
  while (i < src.length) {
    if (/^\s+$/.test(src.slice(i))) break;
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new Error(`nieznany znak we wzorze „${src}” na pozycji ${i}`);
    if (m[1] !== undefined) out.push({ t: "num", v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ t: "ref", v: m[2].slice(1) });
    else if (m[3] !== undefined) out.push({ t: "fn", v: m[3] });
    else out.push({ t: "op", v: m[4] });
    i = re.lastIndex;
  }
  return out;
}

/**
 * Parsuje i liczy wzór. Rzuca przy błędzie składni (nieznana fraza = błąd, jak w generatorze).
 * @returns {{wartosc: number|null, brak: string[], sciezki: string[]}} `wartosc` null, gdy wzór
 *   sięga do kontekstu, którego nie ma (`brak` — jego nazwy); `sciezki` — wszystkie odwołania.
 */
function _ocen(wzor, dane) {
  const tok = _tokeny(wzor);
  let p = 0;
  const brak = new Set();
  const sciezki = [];
  const peek = () => tok[p];
  const eat = (v) => {
    const t = tok[p];
    if (!t || t.v !== v) throw new Error(`oczekiwano „${v}” we wzorze „${wzor}”`);
    p++;
  };
  const ref = (sciezka) => {
    sciezki.push(sciezka);
    const [ctx] = sciezka.split(".");
    if (!KONTEKSTY_WZOROW.includes(ctx)) throw new Error(`nieznany kontekst „@${ctx}” we wzorze „${wzor}”`);
    if (dane == null) return NaN;
    let v = dane;
    for (const k of sciezka.split(".")) {
      if (v == null) break;
      v = v[k];
    }
    if (v == null || !Number.isFinite(Number(v))) {
      brak.add(dane[ctx] == null ? ctx : sciezka);
      return NaN;
    }
    return Number(v);
  };
  function wyrazenie() {
    let v = skladnik();
    while (peek()?.t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = tok[p++].v;
      const r = skladnik();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function skladnik() {
    let v = czynnik();
    while (peek()?.t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = tok[p++].v;
      const r = czynnik();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function czynnik() {
    const t = tok[p++];
    if (!t) throw new Error(`niepełny wzór „${wzor}”`);
    if (t.t === "num") return t.v;
    if (t.t === "ref") return ref(t.v);
    if (t.t === "op" && t.v === "-") return -czynnik();
    if (t.t === "op" && t.v === "(") {
      const v = wyrazenie();
      eat(")");
      return v;
    }
    if (t.t === "fn") {
      const fn = _FUNKCJE[t.v];
      if (!fn) throw new Error(`nieznana funkcja „${t.v}” we wzorze „${wzor}”`);
      eat("(");
      const args = [wyrazenie()];
      while (peek()?.v === ",") { p++; args.push(wyrazenie()); }
      eat(")");
      return fn(...args);
    }
    throw new Error(`nieoczekiwane „${t.v}” we wzorze „${wzor}”`);
  }
  const v = wyrazenie();
  if (p < tok.length) throw new Error(`nadmiarowe „${tok[p].v}” we wzorze „${wzor}”`);
  return { wartosc: brak.size || !Number.isFinite(v) ? null : v, brak: [...brak], sciezki };
}

/** Liczy wzór na danych `{ wlasciciel, tworca, operator }`; `null`, gdy brakuje kontekstu. */
export function ocenWzor(wzor, dane) {
  return _ocen(wzor, dane).wartosc;
}

/** Sprawdza składnię wzoru bez liczenia (generator, warstwa 1). Rzuca przy błędzie. */
export function sciezkiWzoru(wzor) {
  return _ocen(wzor, null).sciezki;
}

/* -------------------------------------------- */
/*  Migawki i statystyki pochodne                */
/* -------------------------------------------- */

const ABILITIES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);

/**
 * Zwarta migawka aktora do roll data (U2) — bez cykli, tania. Warstwa Foundry podaje surowe
 * liczby z aktora; tu tylko kształt, który czytają wzory.
 * @param {{prof?: number, mody?: Record<string, number>, poziomy?: Record<string, number>, klasa?: string|null, nazwa?: string}} p
 *   `poziomy` — poziomy klas po identyfikatorze; `klasa` — klasa, od której liczy się `poziomKlasy`.
 */
export function migawka({ prof = 0, mody = {}, poziomy = {}, klasa = null, nazwa = "" } = {}) {
  const abilities = {};
  for (const id of ABILITIES) abilities[id] = { mod: _num(mody[id]) };
  const poziom = Object.values(poziomy ?? {}).reduce((s, n) => s + _num(n), 0);
  return {
    nazwa,
    prof: _num(prof),
    abilities,
    poziom,
    poziomKlasy: klasa ? _num(poziomy?.[klasa]) : poziom
  };
}

/** Kości Wytrzymałości: „k6 × ½ poziomu Zwiadowcy” — w dół, min. 1 (U6, RAI). */
export function iloscKW(poziomKlasy, mnoznik = 1) {
  return Math.max(1, Math.floor(_num(poziomKlasy) * _num(mnoznik) + EPS));
}

/**
 * Statystyki pochodne rodzaju z kontekstów (§7.1). Pole `null` — wzoru nie ma albo brakuje
 * kontekstu (`brak`); warstwa Foundry zostawia wtedy wartość z szablonu i pokazuje plakietkę.
 * @param {string|object} rodzaj  klucz `RODZAJE` albo wpis
 * @param {{wlasciciel?: object|null, tworca?: object|null, operator?: object|null}} konteksty  migawki
 * @returns {{tt: number|null, pwMaks: number|null, kw: {kosc: number, ile: number}|null, pb: number|null,
 *   atak: number|null, obrazeniaPremia: number|null, stObszarowe: number|null, brak: string[]}|null}
 */
export function wartosciPochodne(rodzaj, { wlasciciel = null, tworca = null, operator = null } = {}) {
  const wpis = typeof rodzaj === "string" ? RODZAJE[rodzaj] : rodzaj;
  if (!wpis) return null;
  const dane = { wlasciciel, tworca, operator };
  const brak = new Set();
  const licz = (wzor) => {
    if (!wzor) return null;
    const r = _ocen(wzor, dane);
    for (const b of r.brak) brak.add(b);
    return r.wartosc;
  };
  const w = wpis.wzory ?? {};
  const pw = licz(w.pwMaks);
  let kw = null;
  if (wpis.kw) {
    if (wlasciciel) kw = { kosc: wpis.kw.kosc, ile: iloscKW(wlasciciel.poziomKlasy, wpis.kw.mnoznik) };
    else brak.add("wlasciciel");
  }
  return {
    tt: licz(w.tt),
    pwMaks: pw === null ? null : Math.max(1, Math.trunc(pw)),
    kw,
    pb: wpis.pb ?? null,
    atak: licz(w.atak),
    obrazeniaPremia: licz(w.obrazeniaPremia),
    stObszarowe: licz(w.stObszarowe),
    brak: [...brak]
  };
}

/* -------------------------------------------- */
/*  Cechy ludzkiego towarzysza (s. 48, 76, 101)  */
/* -------------------------------------------- */

/** Zestaw Cech Bazowych towarzysza. */
export const ZESTAW_CECH = Object.freeze([14, 14, 12, 12, 10, 8]);

/** Tabela Kupowania cech (s. 48) — koszt wartości 8–15, jak w 5e. */
export const KOSZT_CECHY = Object.freeze({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });

/** Czy rozkład (6 wartości, dowolna kolejność) to zestaw 14,14,12,12,10,8. */
export function jestZestawemCech(rozklad) {
  const a = (rozklad ?? []).map(_num).sort((x, y) => y - x);
  return a.length === ZESTAW_CECH.length && a.every((v, i) => v === ZESTAW_CECH[i]);
}

/**
 * Kupowanie cech z budżetem (RAI: „24 punkty do dowolnego rozdzielenia” = tabela kupowania, U5).
 * @param {number[]|Record<string, number>} rozklad  sześć wartości (tablica albo `{str: 8, …}`)
 * @returns {{poprawny: boolean, wydane: number, budzet: number, bledy: string[]}}
 */
export function kupowanieCech(rozklad, budzet = 24) {
  const wartosci = Array.isArray(rozklad) ? rozklad : ABILITIES.map(id => rozklad?.[id]);
  const bledy = [];
  if (wartosci.length !== 6) bledy.push(`potrzeba 6 wartości, jest ${wartosci.length}`);
  let wydane = 0;
  for (const v of wartosci) {
    const k = KOSZT_CECHY[_num(v)];
    if (k === undefined) bledy.push(`wartość ${v} poza tabelą kupowania (8–15)`);
    else wydane += k;
  }
  if (wydane > budzet) bledy.push(`wydane ${wydane} > budżet ${budzet}`);
  return { poprawny: !bledy.length, wydane, budzet, bledy };
}

/* -------------------------------------------- */
/*  Walka — kolejność i tura                     */
/* -------------------------------------------- */

/**
 * Porównanie domyślne (gdy towarzyszy nie ma w grze): inicjatywa malejąco, potem nazwa, potem id.
 * W Foundry jego miejsce zajmuje oryginalne `Combat#_sortCombatants` dnd5e.
 * @param {{id: string, inicjatywa?: number|null, nazwa?: string}} a
 */
export function porownajBazowo(a, b) {
  const ia = Number.isFinite(a?.inicjatywa) ? a.inicjatywa : -Infinity;
  const ib = Number.isFinite(b?.inicjatywa) ? b.inicjatywa : -Infinity;
  if (ia !== ib) return ib - ia;
  return String(a?.nazwa ?? "").localeCompare(String(b?.nazwa ?? ""))
    || String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

/**
 * Kolejność w walce (U7): towarzysz porównywany jak jego kotwica (uczestnik właściciela w tej samej
 * walce); w parze właściciel pierwszy, towarzysze jednego właściciela — po nazwie.
 * @param {{id: string}} a
 * @param {{id: string}} b
 * @param {(c: object) => object|null} kotwica  uczestnik właściciela albo `null` (sam sobie kotwicą)
 * @param {(a: object, b: object) => number} [bazowy]  porównanie kotwic
 */
export function porownajUczestnikow(a, b, kotwica = () => null, bazowy = porownajBazowo) {
  const A = kotwica(a) ?? a;
  const B = kotwica(b) ?? b;
  if (A.id !== B.id) return bazowy(A, B);
  if (a.id === b.id) return 0;
  if (a.id === A.id) return -1;
  if (b.id === B.id) return 1;
  return String(a.nazwa ?? "").localeCompare(String(b.nazwa ?? "")) || String(a.id).localeCompare(String(b.id));
}

/** Zatrzask Komendy obowiązuje w tej walce i tej rundzie (U8). */
export function zatrzaskWazny(zatrzask, { combatId, runda } = {}) {
  return !!zatrzask && !!combatId && zatrzask.combatId === combatId && _num(zatrzask.runda) === _num(runda);
}

/**
 * Początek tury towarzysza (§3.3, D2, U8).
 * @returns {"tura"|"unikanie"|null}  `null` — rodzaj bez własnej tury (dron, D35) albo nieznany.
 */
export function decyzjaTury(rodzaj, { zatrzask = null, combatId = null, runda = null } = {}) {
  const wpis = typeof rodzaj === "string" ? RODZAJE[rodzaj] : rodzaj;
  if (!wpis || wpis.tura === TURY.operator) return null;
  if (wpis.tura === TURY.pelna) return "tura";
  return zatrzaskWazny(zatrzask, { combatId, runda }) ? "tura" : "unikanie";
}

/* -------------------------------------------- */
/*  Aktywacja drona (D35, D36)                   */
/* -------------------------------------------- */

/**
 * Akcje drona. `tryby` — w których aktywacjach wolno; `wymaga` — cecha drona (`kroczy`, `manipulator`,
 * `bron`, `wrecz`, `urzadzenia`). `osd` — etykieta na OSD (bez polskich liter, D38).
 * [B] to lista RAW z Akcji Bonusowej (s. 83) w akcjach NOE: bez rzutu i niewymierzone w nikogo.
 */
export const AKCJE_DRONA = Object.freeze([
  Object.freeze({ id: "ruch", osd: "RUCH", tryby: ["B", "A"] }),
  Object.freeze({ id: "unikanie", osd: "UNIK", tryby: ["B", "A"] }),
  Object.freeze({ id: "odstapienie", osd: "ODSTAPIENIE", tryby: ["B", "A"] }),
  Object.freeze({ id: "przyspieszenie", osd: "PRZYSPIESZENIE", tryby: ["B", "A"] }),
  Object.freeze({ id: "bieganie", osd: "BIEG", tryby: ["B", "A"], wymaga: "kroczy" }),
  Object.freeze({ id: "podnies", osd: "PODNIES", tryby: ["B", "A"], wymaga: "manipulator" }),
  Object.freeze({ id: "upusc", osd: "UPUSC", tryby: ["B", "A"], wymaga: "manipulator" }),
  Object.freeze({ id: "zostan", osd: "ZOSTAN", tryby: ["B", "A"] }),
  Object.freeze({ id: "atak", osd: "ATAK", tryby: ["A"], wymaga: "bron" }),
  Object.freeze({ id: "pochwycenie", osd: "POCHWYCENIE", tryby: ["A"], wymaga: "manipulator" }),
  Object.freeze({ id: "odepchniecie", osd: "ODEPCHNIECIE", tryby: ["A"] }),
  Object.freeze({ id: "wytracenie", osd: "WYTRACENIE", tryby: ["A"], wymaga: "manipulator" }),
  Object.freeze({ id: "pomaganie", osd: "POMOC", tryby: ["A"] }),
  Object.freeze({ id: "wyczekanie", osd: "WYCZEKANIE", tryby: ["A"] }),
  Object.freeze({ id: "ukrywanie", osd: "UKRYCIE", tryby: ["A"] }),
  Object.freeze({ id: "szukanie", osd: "SZUKANIE", tryby: ["A"] }),
  Object.freeze({ id: "uzywanie", osd: "UZYCIE", tryby: ["A"], wymaga: "urzadzenia" }),
  Object.freeze({ id: "okazyjny", osd: "OKAZYJNY", tryby: ["R"], wymaga: "wrecz" }),
  Object.freeze({ id: "wyczekana", osd: "WYCZEKANA", tryby: ["R"] })
]);

/**
 * Akcje dozwolone w aktywacji (D36), przycięte do drona — źródło listy na OSD i plakietek.
 * @param {"A"|"B"|"R"} tryb
 * @param {{lata?: boolean, manipulator?: boolean, bron?: boolean, wrecz?: boolean, urzadzenia?: boolean}} dron
 * @returns {{id: string, osd: string}[]}
 */
export function zakresAktywacji(tryb, dron = {}) {
  const ma = {
    kroczy: !dron.lata,
    manipulator: !!dron.manipulator,
    bron: !!dron.bron,
    wrecz: !!dron.wrecz,
    urzadzenia: !!dron.urzadzenia
  };
  return AKCJE_DRONA
    .filter(a => a.tryby.includes(tryb) && (!a.wymaga || ma[a.wymaga]))
    .map(a => ({ id: a.id, osd: a.osd }));
}

/* -------------------------------------------- */
/*  Stopnie Zranienia (s. 205, 214; U10)         */
/* -------------------------------------------- */

/**
 * Czy istota ma Stopnie Zranienia — „traktowana jak BG” (s. 205): kary za krytyk i Rzuty Przeciw Śmierci.
 * Maszyny nigdy (s. 214). Kolejność: maszyna przegrywa ze wszystkim.
 * @param {{typ?: string, towarzysz?: string|null, maszyna?: boolean, usesZranienie?: boolean, bn?: boolean}} opis
 *   `typ` — typ aktora dnd5e; `towarzysz` — rodzaj z flagi U1; `usesZranienie` — statblock Bestiariusza
 *   ze STOPNIEM ZRANIENIA; `bn` — BN wprowadzony kartą „BN pada” (D2 M1).
 */
export function stopnieZranienia({ typ = null, towarzysz = null, maszyna = false, usesZranienie = false, bn = false } = {}) {
  if (maszyna) return false;
  if (towarzysz) return RODZAJE[towarzysz]?.stopnieZranienia ?? true;
  return typ === "character" || !!usesZranienie || !!bn;
}

/* -------------------------------------------- */
/*  Tabela awarii maszyn (s. 214, D10)           */
/* -------------------------------------------- */

const _K = "koniec-nastepnej-tury";

/**
 * Pozycje k20 w kształcie do zastosowania (D10). Tekst RAW: `combat/bestiary-thresholds.mjs`
 * `MACHINE_FAILURES`. `wymaga` — cecha maszyny, bez której pozycja „nie dotyczy” (s. 214: wybierz
 * kolejną): `bron`, `amunicja`, `ataki`, `wrecz`. `trwala` — „do czasu naprawy” (efekt z flagą `awaria`).
 * `osd` — skrót na OSD drona.
 */
export const AWARIE = Object.freeze({
  1: Object.freeze({ osd: "BRON", wymaga: "bron", trwala: true, skutek: Object.freeze({ znacznik: "bron-zniszczona" }) }),
  2: Object.freeze({ osd: "NAPED", trwala: true, skutek: Object.freeze({ szybkosc: 0.5 }) }),
  3: Object.freeze({ osd: "CEL -2", wymaga: "ataki", trwala: true, skutek: Object.freeze({ atak: -2 }) }),
  4: Object.freeze({ osd: "CPU", trwala: true, skutek: Object.freeze({ znacznik: "brak-ab" }) }),
  5: Object.freeze({ osd: "ZASIL", trwala: false, skutek: Object.freeze({ status: "paralyzed", czas: _K }) }),
  6: Object.freeze({ osd: "AMMO", wymaga: "amunicja", trwala: true, skutek: Object.freeze({ obrazenia: 50, amunicja: 0 }) }),
  7: Object.freeze({ osd: "MANIP", wymaga: "ataki", trwala: true, skutek: Object.freeze({ znacznik: "atak-mniej" }) }),
  8: Object.freeze({ osd: "OPTYKA", trwala: true, skutek: Object.freeze({ status: "blinded" }) }),
  9: Object.freeze({ osd: "WYCIEK", trwala: true, skutek: Object.freeze({ znacznik: "brak-reakcji" }) }),
  10: Object.freeze({ osd: "RESET", trwala: false, skutek: Object.freeze({ status: "incapacitated", czas: _K }) }),
  11: Object.freeze({ osd: "POZAR", trwala: true, skutek: Object.freeze({ podpalenie: true }) }),
  12: Object.freeze({ osd: "ZYRO", trwala: false, skutek: Object.freeze({ status: "prone", czas: _K }) }),
  13: Object.freeze({ osd: "PANCERZ", trwala: true, skutek: Object.freeze({ tt: -2 }) }),
  14: Object.freeze({ osd: "CEL -4", wymaga: "ataki", trwala: true, skutek: Object.freeze({ atak: -4 }) }),
  15: Object.freeze({ osd: "SILOWN", wymaga: "wrecz", trwala: true, skutek: Object.freeze({ znacznik: "wrecz-polowa" }) }),
  16: Object.freeze({ osd: "SILOWN X", wymaga: "wrecz", trwala: true, skutek: Object.freeze({ znacznik: "brak-wrecz" }) }),
  17: Object.freeze({ osd: "RTH", trwala: true, skutek: Object.freeze({ znacznik: "powrot" }) }),
  18: Object.freeze({ osd: "MEM ERR", wymaga: "ataki", trwala: true, skutek: Object.freeze({ znacznik: "sterowanie-mg" }) }),
  19: Object.freeze({ osd: "OFF", trwala: true, skutek: Object.freeze({ status: "wylaczony" }) }),
  20: Object.freeze({ osd: "SELF DESTRUCT", trwala: true, skutek: Object.freeze({ zniszczony: true }) })
});

/**
 * Pozycja Tabeli awarii po pominięciu niepasujących (s. 214: „wybierz kolejną pozycję”). Po 20 —
 * od 1; 20 (autodestrukcja) dotyczy każdej maszyny, więc pętla zawsze się kończy.
 * @param {number} k20
 * @param {{bron?: boolean, amunicja?: boolean, ataki?: boolean, wrecz?: boolean}} maszyna
 * @returns {{k20: number, pozycja: number, pominiete: number[], osd: string, trwala: boolean, skutek: object}}
 */
export function awaria(k20, maszyna = {}) {
  const start = Math.min(20, Math.max(1, Math.trunc(_num(k20)) || 1));
  const pominiete = [];
  let n = start;
  for (let i = 0; i < 20; i++) {
    const a = AWARIE[n];
    if (!a.wymaga || maszyna[a.wymaga]) {
      return { k20: start, pozycja: n, pominiete, osd: a.osd, trwala: a.trwala, skutek: a.skutek };
    }
    pominiete.push(n);
    n = n >= 20 ? 1 : n + 1;
  }
  throw new Error("Tabela awarii: żadna pozycja nie pasuje"); // nieosiągalne — 20 nie ma `wymaga`
}

/* -------------------------------------------- */
/*  Naprawa (s. 83, D9, §7.11)                   */
/* -------------------------------------------- */

/** Naprawa PW maszyny: godzina pracy, 2k6 + mod. INT naprawiającego (s. 83). */
export const NAPRAWA_PW = Object.freeze({ formula: "2d6", minut: 60 });

/** PW przywrócone naprawą; nigdy ujemne. */
export function naprawaPW(k2k6, modInt) {
  return Math.max(0, _num(k2k6) + _num(modInt));
}

function _surowceMapa(surowce) {
  if (!surowce) return {};
  if (typeof surowce === "string" || Array.isArray(surowce)) {
    const lines = typeof surowce === "string" ? parseSurowce(surowce) : surowce;
    const out = {};
    for (const l of lines) out[l.typy[0]] = (out[l.typy[0]] ?? 0) + _num(l.gb);
    return out;
  }
  return { ...surowce };
}

/**
 * Naprawa awarii (D9). NOE — rozstrzyga MG (karta T1). WKK — tabela §7.11: stopień naprawy M2 i konkretne
 * części w ułamku ilości z przepisu drona (D25, D28); dron z PW ≤ ½ maks. podnosi stopień o jeden,
 * harówa podniesiona zostaje harówą, ale bierze pełne ilości.
 * @param {number} pozycja  pozycja Tabeli awarii (po pominięciach)
 * @param {{surowce?: string|object, polowaPW?: boolean, kobalt?: boolean}} p  `surowce` — przepis drona
 * @returns {object}
 */
export function naprawaAwarii(pozycja, { surowce = null, polowaPW = false, kobalt = false } = {}) {
  if (!kobalt) return { warstwa: "noe", decyduje: "mg" };
  const wpis = NAPRAWA_AWARII_KOBALT[pozycja];
  if (!wpis) return null;
  if (wpis.przemijajaca) return { warstwa: "wkk", przemijajaca: true, opis: wpis.opis };
  if (wpis.wrak) return { warstwa: "wkk", wrak: true, opis: wpis.opis };
  const kroki = [...NAPRAWA_KOLEJNOSC, "pelna"];
  const ilosci = kroki[Math.min(kroki.length - 1, kroki.indexOf(wpis.stopien) + (polowaPW ? 1 : 0))];
  const stopien = ilosci === "pelna" ? "harowa" : ilosci;
  const przepis = _surowceMapa(surowce);
  const czesci = {};
  for (const kod of wpis.surowce) {
    czesci[kod] = kod === "CH"
      ? CHEMIA_NAPRAWY_KOBALT[ilosci]
      : Math.max(1, Math.ceil(_num(przepis[kod]) * ULAMKI_NAPRAWY_KOBALT[ilosci] - EPS));
  }
  return {
    warstwa: "wkk", stopien, ilosci, st: NAPRAWA[stopien].st, kosci: NAPRAWA[stopien].kosci,
    jednostka: NAPRAWA[stopien].jednostka, surowce: czesci, wymiana: !!wpis.wymiana, opis: wpis.opis
  };
}

/* -------------------------------------------- */
/*  Sygnał i OSD (D32, D34, U17)                 */
/* -------------------------------------------- */

/**
 * Zapas sygnału w dB, przy którym obraz jest czysty. Tłumienie w wolnej przestrzeni rośnie o 20 dB na
 * dekadę odległości, więc 12 dB = czterokrotność: do ¼ zasięgu czysto, w ½ zasięgu jakość 0,5,
 * na krawędzi sam szum.
 */
export const SYGNAL_ZAPAS_DB = 12;

/**
 * Jakość sygnału drona (U17). Zasięg z kontrolera w ręce operatora; ściana między żetonami albo scena
 * „pod ziemią” — zasięg przez przeszkody (D32).
 * @param {{odleglosc: number, sciana?: boolean, podZiemia?: boolean, kontroler: string|{zasieg: number, zasiegPrzeszkody: number}}} p
 *   `odleglosc` w metrach
 * @returns {{jakosc: number, utracony: boolean, zasieg: number}}
 */
export function sygnal({ odleglosc, sciana = false, podZiemia = false, kontroler } = {}) {
  const k = typeof kontroler === "string" ? KONTROLERY[kontroler] : kontroler;
  if (!k) return { jakosc: 0, utracony: true, zasieg: 0 };
  const zasieg = (sciana || podZiemia) ? _num(k.zasiegPrzeszkody) : _num(k.zasieg);
  const d = Math.max(0, _num(odleglosc));
  if (!(zasieg > 0) || d > zasieg) return { jakosc: 0, utracony: true, zasieg };
  if (d <= EPS) return { jakosc: 1, utracony: false, zasieg };
  const zapas = 20 * Math.log10(zasieg / d);
  return { jakosc: Math.min(1, Math.max(0, zapas / SYGNAL_ZAPAS_DB)), utracony: false, zasieg };
}

function _hash(i, ziarno) {
  let h = Math.imul((i | 0) ^ Math.imul(ziarno | 0, 0x9E3779B1), 0x85EBCA6B);
  h ^= h >>> 13;
  h = Math.imul(h, 0xC2B2AE35);
  h ^= h >>> 16;
  return ((h >>> 0) / 0xFFFFFFFF) * 2 - 1;
}

/** Wolny szum wartości w [-1, 1] — gładki w czasie, deterministyczny dla `(t, ziarno)`. */
export function szum(t, ziarno = 0) {
  const x = _num(t);
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return _hash(i, ziarno) * (1 - s) + _hash(i + 1, ziarno) * s;
}

/**
 * RSSI na OSD (D34): prawdziwa jakość plus wolno płynący szum — ±5 przy pełnym sygnale, do ±15 na
 * krawędzi zasięgu. Utrata sygnału liczy się wyłącznie z prawdziwej jakości, nigdy stąd.
 * @param {number} jakosc  0..1 z `sygnal()`
 * @param {{t?: number, ziarno?: number}} stan  czas (s × tempo) i ziarno — jawne, żeby test był deterministyczny
 * @returns {{wartosc: number, kreski: number, stan: {t: number, ziarno: number}}}
 */
export function rssiOsd(jakosc, { t = 0, ziarno = 0 } = {}) {
  const q = Math.min(1, Math.max(0, _num(jakosc)));
  const amp = 5 + 10 * (1 - q);
  const wartosc = Math.min(99, Math.max(0, Math.round(99 * q + amp * szum(t, ziarno))));
  const kreski = wartosc <= 0 ? 0 : Math.min(4, Math.ceil(wartosc / 25));
  return { wartosc, kreski, stan: { t: _num(t), ziarno: _num(ziarno) } };
}

/* -------------------------------------------- */
/*  Upadek drona latającego (s. 253, D29)        */
/* -------------------------------------------- */

/** Stany, w których latający spada z obrażeniami (Nieprzytomność, Szybkość 0 — s. 253). */
export const STANY_UPADKU = Object.freeze(["wylaczony", "paralyzed", "unconscious", "brak-zasilania", "szybkosc-0"]);

/**
 * Czy dron latający spada i czy z obrażeniami (D29). Powalenie — opada pionowo bez obrażeń;
 * gdy razem z którymś ze `STANY_UPADKU` — wygrywa upadek z obrażeniami.
 * @param {{stany?: string[], wysokosc?: number, lata?: boolean}} p
 */
export function upadekDrona({ stany = [], wysokosc = 0, lata = true } = {}) {
  if (!lata || !(_num(wysokosc) > 0)) return { spada: false, obrazenia: false };
  const s = new Set(stany ?? []);
  if (STANY_UPADKU.some(id => s.has(id))) return { spada: true, obrazenia: true };
  if (s.has("prone")) return { spada: true, obrazenia: false };
  return { spada: false, obrazenia: false };
}

/* -------------------------------------------- */
/*  Zasilanie (s. 83, U15)                       */
/* -------------------------------------------- */

/** Akumulator 24 V: godziny pracy wg rozmiaru drona (s. 83). */
export const AKUMULATOR_GODZIN = Object.freeze({ sm: 4, med: 1 });

/**
 * Zużycie zasilania za `minuty` pracy (U15). Agregat z paliwem zasila pierwszy, resztę bierze akumulator.
 * @param {{rozmiar: "sm"|"med", minuty: number, agregat?: boolean, paliwoL?: number}} p
 * @returns {{paliwoL: number, minutyAkumulatora: number, procentAkumulatora: number}}  zużycie, nie stan
 */
export function zuzycieZasilania({ rozmiar, minuty, agregat = false, paliwoL = 0 } = {}) {
  const m = Math.max(0, _num(minuty));
  const minutyPaliwa = agregat ? (Math.max(0, _num(paliwoL)) / AGREGAT_L_NA_H) * 60 : 0;
  const zPaliwa = Math.min(m, minutyPaliwa);
  const reszta = m - zPaliwa;
  const pojemnosc = (AKUMULATOR_GODZIN[rozmiar] ?? AKUMULATOR_GODZIN.med) * 60;
  return {
    paliwoL: (zPaliwa / 60) * AGREGAT_L_NA_H,
    minutyAkumulatora: reszta,
    procentAkumulatora: (reszta / pojemnosc) * 100
  };
}

/* -------------------------------------------- */
/*  Emiter EMP — TT celu (s. 101, D27)           */
/* -------------------------------------------- */

/**
 * TT maszyny dla ataku Emiterem EMP, który „ignoruje TT z opancerzenia maszyny” (D27, RAI): statblock z
 * notą pancerza przy TT — 10 + mod. ZRC; bez noty — pełna TT; nigdy więcej niż pełna TT.
 * @param {{tt: number, opancerzenie?: boolean, modZrc?: number}} p
 */
export function ttCeluEmp({ tt, opancerzenie = false, modZrc = 0 } = {}) {
  const pelna = _num(tt);
  return opancerzenie ? Math.min(pelna, 10 + _num(modZrc)) : pelna;
}

export const __testing = Object.freeze({
  ocenWzor, sciezkiWzoru, migawka, iloscKW, wartosciPochodne, jestZestawemCech, kupowanieCech,
  porownajBazowo, porownajUczestnikow, zatrzaskWazny, decyzjaTury, zakresAktywacji, stopnieZranienia,
  awaria, naprawaPW, naprawaAwarii, sygnal, szum, rssiOsd, upadekDrona, zuzycieZasilania, ttCeluEmp
});
