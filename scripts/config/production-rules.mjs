/**
 * Neuroshima 5e — czyste reguły produkcji i naprawy (PLAN_produkcja §2–§4, etap E0).
 *
 * Tylko liczby i decyzje: zero `game`, zero dokumentów. Importuje to runtime (Robota, zakładka,
 * odpoczynki) i `dev/validate-recipes.mjs` w Node. Reguły WKK mają tu swój odpowiednik `_RAW`,
 * a wartości `_KOBALT` leżą w `wkk/config/production-kobalt.mjs`; wybór w jednym miejscu użycia
 * przez parametr `kobalt` (domyślnie `isKobaltEnabled()`), żeby testy mogły podać go wprost.
 *
 * Źródła (NOE, wydanie październikowe): produkcja s. 144–146, Postój s. 45–47, Szybka
 * produkcja s. 79, Fabrykator s. 103, Przydasie s. 106, wytrzymałość pancerzy s. 115.
 *
 * Jednostki: gamble (gb) dla wartości i surowców, **minuty** dla czasu (D29). Godziny istnieją
 * tylko na wejściu (wzór, tabele) i na wyjściu (`fmtGGMM`).
 */

import { isKobaltEnabled } from "./settings.mjs";
import { SUROWCE_BY_CODE } from "./surowce-data.mjs";
import {
  PORZUCENIE_KOBALT, WAGA_ROBOTY_KOBALT, SCHEMAT_GRAMY_NA_GODZINE_KOBALT, PROFESJA_KOBALT
} from "../wkk/config/production-kobalt.mjs";

const EPS = 1e-9;
const _kobalt = k => (k === undefined ? isKobaltEnabled() : !!k);

/* -------------------------------------------- */
/*  Stałe RAW                                   */
/* -------------------------------------------- */

/** s. 146 — „skomplikowany” to wszystko powyżej 10 gb; wymaga schematu. Liczone od ceny sztuki (L3). */
export const PROG_SCHEMATU_GB = 10;

/** s. 145 — maks. 10 h pracy na dobę; przekroczenie oznaczamy, nie blokujemy (L8). */
export const DOBA_LIMIT_MIN = 600;

/** s. 45 — Krótki odpoczynek: produkcja, naprawa, czyszczenie broni łącznie ≤ 1 h (L9). */
export const BUDZET_KO_MIN = 60;

/** s. 45 + s. 145 — Długi odpoczynek: doba, więc limit doby. */
export const BUDZET_DO_MIN = 600;

/** s. 103 — Fabrykator: „o 50% szybciej”, czytane jako czas × 0,5 (D3). */
export const FABRYKATOR_CZAS = 0.5;

/** s. 106 — Przydasie: surowce −50%, czas bez zmian. */
export const PRZYDASIE_SUROWCE = 0.5;

/** s. 79 — Szybka produkcja: 25 gb, od 11. poziomu 50 gb; 1 minuta × 1 gb. */
export const SZYBKA_PRODUKCJA_BUDZET = Object.freeze({ 1: 25, 2: 50 });
export const SZYBKA_PRODUKCJA_MIN_NA_GB = 1;

/** s. 145 — ST z wartości przedmiotu: górne granice przedziałów, powyżej 100 gb — 30. */
export const ST_PROGI = Object.freeze([[10, 5], [25, 10], [50, 15], [75, 20], [100, 25]]);
export const ST_POWYZEJ = 30;

/** s. 146 — Naprawianie przedmiotów. `koszt` = część ceny przedmiotu, czas to kości. */
export const NAPRAWA = Object.freeze({
  drobnostka: Object.freeze({ label: "Drobnostka", st: 10, koszt: 0.1, kosci: "1d4", jednostka: "min" }),
  troche: Object.freeze({ label: "Trochę roboty", st: 15, koszt: 0.3, kosci: "1d4", jednostka: "h" }),
  harowa: Object.freeze({ label: "Skomplikowana harówa", st: 20, koszt: 0.5, kosci: "2d4", jednostka: "h" })
});
export const NAPRAWA_KOLEJNOSC = Object.freeze(["drobnostka", "troche", "harowa"]);

/** s. 115 — Wytrzymałość pancerzy (opcjonalne): MK 10% ceny × utracona TT; godziny na punkt TT. */
export const PANCERZ_NAPRAWA = Object.freeze({
  kosztNaPunkt: 0.1,
  godzinNaPunkt: Object.freeze({ light: 1, medium: 5, heavy: 10 })
});

/* -------------------------------------------- */
/*  Wartość, czas, ST                           */
/* -------------------------------------------- */

/** Surowce do przedmiotu: połowa ceny, w dół (s. 144). */
export function budzetSurowcow(wartosc) {
  return Math.floor((Number(wartosc) || 0) / 2 + EPS);
}

/**
 * Najmniejsza partia, z której wzór daje choć 1 gb surowców (D37). Przedmiot za 1 gb robi się
 * po 2 sztuki: ⌊1 / 2⌋ = 0 i pojedynczy papieros powstawałby z niczego (§1.5). Czas i ST liczą
 * się od wartości partii, jak w tabeli elaboracji (L3) — 2 papierosy: 1 gb, 1 h, ST 5.
 */
export function partiaMinimalna(cena) {
  const c = Number(cena) || 0;
  if (c <= 0) return 1;
  return Math.max(1, Math.ceil(2 / c - EPS));
}

/**
 * Czas standardowy w minutach (s. 145, D29): wielorazowe cena × 1 h, jednorazowe cena × 0,5 h,
 * „nieparzysta” cena w górę — czyli ⌈cena / 2⌉ h. Minimum 1 minuta.
 */
export function standardoweMinuty(wartosc, jednorazowy) {
  const cena = Math.max(0, Number(wartosc) || 0);
  const godziny = jednorazowy ? Math.ceil(cena / 2 - EPS) : Math.ceil(cena - EPS);
  return Math.max(1, godziny * 60);
}

/** ST z wartości (s. 145). */
export function stZWartosci(wartosc) {
  const v = Number(wartosc) || 0;
  for (const [granica, st] of ST_PROGI) if (v <= granica + EPS) return st;
  return ST_POWYZEJ;
}

/** Czy przedmiot o tej cenie sztuki wymaga schematu (s. 146, D16 — zawsze, niezależnie od narzędzi). */
export function wymagaSchematu(cenaSztuki) {
  return (Number(cenaSztuki) || 0) > PROG_SCHEMATU_GB + EPS;
}

/* -------------------------------------------- */
/*  Mnożniki wykonawcy (D3, D26–D29, D32)       */
/* -------------------------------------------- */

/**
 * Iloczyn mnożników czasu wykonawcy.
 * @param {object} o
 * @param {boolean} [o.fabrykator]
 * @param {null|"czesc"|"pelny"} [o.profesja]  cecha profesji — liczy się tylko z WKK (D26)
 * @param {boolean} [o.kobalt]
 */
export function mnoznikCzasu({ fabrykator = false, profesja = null, kobalt } = {}) {
  let m = fabrykator ? FABRYKATOR_CZAS : 1;
  if (_kobalt(kobalt)) {
    if (profesja === "pelny") m *= PROFESJA_KOBALT.pelny;
    else if (profesja === "czesc") m *= PROFESJA_KOBALT.czesc;
    m = Math.max(m, PROFESJA_KOBALT.podloga); // D28
  }
  return m;
}

/** Czas dla wykonawcy: minuty bazowe × mnożnik, w dół do pełnej minuty, minimum 1 (D29). */
export function czasWykonawcy(minutyBazowe, mnoznik = 1) {
  if (minutyBazowe <= 0) return 0;
  return Math.max(1, Math.floor(minutyBazowe * mnoznik + EPS));
}

/**
 * Postęp (minuty bazowe) z `minuty` realnej pracy. Minuta pracy daje `1 / mnożnik` postępu.
 * Gdy praca pokrywa cały wyświetlony czas do końca, dopełnia do `pozostalo` — zaokrąglenie
 * w dół z D29 nie może zostawić Roboty minutę przed metą.
 */
export function postepZPracy(minuty, mnoznik = 1, pozostalo = Infinity) {
  if (minuty <= 0) return 0;
  if (Number.isFinite(pozostalo) && minuty >= czasWykonawcy(pozostalo, mnoznik)) return pozostalo;
  return Math.min(pozostalo, Math.floor(minuty / mnoznik + EPS));
}

/** ST dla wykonawcy: z WKK cecha profesji zdejmuje stopień 30 (D26, wariant C). */
export function stWykonawcy(st, { cechaProfesji = false, kobalt } = {}) {
  if (cechaProfesji && _kobalt(kobalt)) return Math.min(st, PROFESJA_KOBALT.stMaks);
  return st;
}

/* -------------------------------------------- */
/*  Surowce: zapis, podział, alokacja           */
/* -------------------------------------------- */

/**
 * „19 CH, 1 MK/MO” → `[{typy:["CH"], gb:19}, {typy:["MK","MO"], gb:1}]`.
 * Przecinki i białe znaki tolerowane (tabele mają „1MK”, „CH/ MO”).
 * @throws {Error} na nieznanym kodzie albo liczbie
 */
export function parseSurowce(str) {
  if (!str || !String(str).trim()) return [];
  return String(str).split(",").map(part => {
    const m = part.trim().match(/^(\d+)\s*([A-Za-z]{2}(?:\s*\/\s*[A-Za-z]{2})*)$/);
    if (!m) throw new Error(`nie rozumiem surowców „${part.trim()}” w „${str}”`);
    const typy = m[2].split("/").map(s => s.trim().toUpperCase());
    for (const t of typy) if (!SUROWCE_BY_CODE[t]) throw new Error(`nieznany surowiec „${t}” w „${str}”`);
    return { typy, gb: Number(m[1]) };
  });
}

/** Odwrotność `parseSurowce`. */
export function surowceString(lines) {
  return (lines ?? []).filter(l => l.gb > 0).map(l => `${l.gb} ${l.typy.join("/")}`).join(", ");
}

/** Suma gambli w liniach. */
export function sumaGb(lines) {
  return (lines ?? []).reduce((s, l) => s + (Number(l.gb) || 0), 0);
}

/**
 * Rozkład liczby całkowitej `total` na wagi — metoda największych reszt.
 * Każda dodatnia waga dostaje co najmniej 1, jeśli `total` na to pozwala (RAW: podział
 * „logiczny”, więc 1 MK metalu w naboju nie może zniknąć przez zaokrąglenie).
 */
function _rozloz(total, wagi) {
  const n = wagi.length;
  const suma = wagi.reduce((s, w) => s + w, 0);
  if (n === 0 || total <= 0 || suma <= 0) return wagi.map(() => 0);
  // Najpierw czysta proporcja (30/4/1 z budżetu 35 zostaje 30/4/1), dopiero potem minimum:
  // pusta pozycja dostaje 1 z największej. Odwrotna kolejność przekrzywiała każdy profil.
  const exact = wagi.map(w => (w > 0 ? (total * w) / suma : 0));
  const out = exact.map(e => Math.floor(e + EPS));
  let brak = total - out.reduce((s, x) => s + x, 0);
  const order = exact.map((e, i) => [e - Math.floor(e + EPS), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; brak > 0 && k < order.length; k++) {
    if (wagi[order[k][1]] > 0) { out[order[k][1]]++; brak--; }
  }
  const dodatnie = wagi.filter(w => w > 0).length;
  if (total >= dodatnie) {
    for (let i = 0; i < n; i++) {
      if (wagi[i] <= 0 || out[i] > 0) continue;
      const max = out.indexOf(Math.max(...out));
      out[max]--;
      out[i]++;
    }
  }
  return out;
}

/**
 * Podział budżetu na linie wg profilu `[{typy, waga}]` — przepis standardowy (L11).
 * @returns {{typy: string[], gb: number}[]}
 */
export function podzielBudzet(gb, profil) {
  const parts = _rozloz(Math.max(0, Math.floor(gb + EPS)), profil.map(p => p.waga));
  return profil.map((p, i) => ({ typy: [...p.typy], gb: parts[i] })).filter(l => l.gb > 0);
}

/** Profil podziału z linii istniejącego przepisu (D22: tabela profesji → domyślny podział standardu). */
export function profilZLinii(lines) {
  return lines.map(l => ({ typy: [...l.typy], waga: l.gb }));
}

/**
 * Przeskalowanie surowców (Przydasie, zwrot 50%): cel `⌈suma × factor⌉` (albo `⌊⌋` przy
 * `wDol`), rozłożony proporcjonalnie na te same linie. Bez minimum 1 na linię — oszczędność
 * może wyzerować drobną pozycję.
 */
export function skalujSurowce(lines, factor, { wDol = false } = {}) {
  const suma = sumaGb(lines);
  const cel = wDol ? Math.floor(suma * factor + EPS) : Math.ceil(suma * factor - EPS);
  const wagi = lines.map(l => l.gb);
  const n = wagi.length;
  const exact = wagi.map(w => (suma > 0 ? (cel * w) / suma : 0));
  const out = exact.map(e => Math.floor(e + EPS));
  let brak = cel - out.reduce((s, x) => s + x, 0);
  const order = exact.map((e, i) => [e - Math.floor(e + EPS), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; brak > 0 && k < n; k++) { out[order[k][1]]++; brak--; }
  return lines.map((l, i) => ({ typy: [...l.typy], gb: out[i] })).filter(l => l.gb > 0);
}

/** Surowce przepisu dla wykonawcy: Przydasie tnie o połowę (s. 106), w górę do pełnego gambla. */
export function surowceWykonawcy(lines, { przydasie = false } = {}) {
  return przydasie ? skalujSurowce(lines, PRZYDASIE_SUROWCE) : lines.map(l => ({ typy: [...l.typy], gb: l.gb }));
}

/**
 * Alokacja linii na konkretne typy wobec zapasu (L12). Najpierw linie jednotypowe, potem
 * alternatywy — z typu, którego zostało więcej. Niedobór alternatywy trafia na typ, który
 * byłby brany jako pierwszy.
 *
 * @param {{typy: string[], gb: number}[]} lines
 * @param {Record<string, number>} zapas  gamble per typ
 * @param {Record<number, Record<string, number>>} [reczna]  ręczna alokacja linii (indeks → typ → gb)
 * @returns {{ ok: boolean, przydzial: Record<string, number>, brak: Record<string, number> }}
 */
export function alokujSurowce(lines, zapas = {}, reczna = {}) {
  const left = { ...zapas };
  const przydzial = {};
  const brak = {};
  const add = (obj, k, v) => { if (v > 0) obj[k] = (obj[k] ?? 0) + v; };
  const take = (typ, gb) => {
    const have = Math.max(0, left[typ] ?? 0);
    const t = Math.min(have, gb);
    left[typ] = have - t;
    add(przydzial, typ, gb);
    return gb - t; // niedobór
  };

  const order = lines.map((l, i) => i).sort((a, b) => lines[a].typy.length - lines[b].typy.length || a - b);
  for (const i of order) {
    const l = lines[i];
    if (reczna[i]) {
      for (const [typ, gb] of Object.entries(reczna[i])) add(brak, typ, take(typ, gb));
      continue;
    }
    if (l.typy.length === 1) { add(brak, l.typy[0], take(l.typy[0], l.gb)); continue; }
    const pref = [...l.typy].sort((a, b) => (left[b] ?? 0) - (left[a] ?? 0));
    let need = l.gb;
    for (const typ of pref) {
      if (need <= 0) break;
      const t = Math.min(Math.max(0, left[typ] ?? 0), need);
      if (t > 0) { take(typ, t); need -= t; }
    }
    if (need > 0) { add(przydzial, pref[0], need); add(brak, pref[0], need); }
  }
  return { ok: Object.keys(brak).length === 0, przydzial, brak };
}

/** Waga surowców w kg (1 gb CH = 100 g, 1 gb MK = 1 kg). */
export function wagaSurowcowKg(przydzial) {
  return Object.entries(przydzial ?? {})
    .reduce((s, [typ, gb]) => s + (Number(gb) || 0) / (SUROWCE_BY_CODE[typ]?.gbPerKg ?? 1), 0);
}

/* -------------------------------------------- */
/*  Robota: porzucenie, waga                    */
/* -------------------------------------------- */

/** D14 bez WKK: RAW nie zna porzucenia — przycisku nie ma. */
export const PORZUCENIE_RAW = null;

/** Czy porzucenie w ogóle istnieje (WKK). */
export function porzucenieDostepne({ kobalt } = {}) {
  return (_kobalt(kobalt) ? PORZUCENIE_KOBALT : PORZUCENIE_RAW) !== null;
}

/**
 * Zwrot surowców przy porzuceniu (D14): postęp ≤ 10% → wszystko, później połowa (w dół).
 * @returns {Record<string, number>|null}  null = porzucenie nie istnieje (bez WKK)
 */
export function zwrotPorzucenia(zamrozone, postep, wymagane, { kobalt } = {}) {
  const reg = _kobalt(kobalt) ? PORZUCENIE_KOBALT : PORZUCENIE_RAW;
  if (!reg) return null;
  const ulamek = wymagane > 0 ? postep / wymagane : 0;
  const lines = Object.entries(zamrozone ?? {}).map(([typ, gb]) => ({ typy: [typ], gb }));
  const factor = ulamek <= reg.progPelnegoZwrotu + EPS ? 1 : reg.zwrotPozniej;
  const out = factor === 1 ? lines : skalujSurowce(lines, factor, { wDol: true });
  return Object.fromEntries(out.map(l => [l.typy[0], l.gb]));
}

/** D25 bez WKK: przez całą pracę waga surowców, które weszły do Roboty. */
export const WAGA_ROBOTY_RAW = Object.freeze({ interpolacja: false });

/** Waga Roboty w kg (D4 z WKK — interpolacja wejście → wynik; D25 bez WKK — stała). */
export function wagaRoboty({ wejscie, wynik, postep, wymagane, kobalt } = {}) {
  const reg = _kobalt(kobalt) ? WAGA_ROBOTY_KOBALT : WAGA_ROBOTY_RAW;
  if (!reg.interpolacja) return wejscie;
  const u = wymagane > 0 ? Math.min(1, Math.max(0, postep / wymagane)) : 0;
  return Math.round((wejscie + (wynik - wejscie) * u) * 1000) / 1000;
}

/* -------------------------------------------- */
/*  Schematy (D15)                              */
/* -------------------------------------------- */

/** D15 bez WKK: RAW nie podaje wagi schematu. */
export const SCHEMAT_GRAMY_NA_GODZINE_RAW = 0;

/** Waga Schematu w kg: 1 g na godzinę przepisu standardowego (WKK), inaczej 0. */
export function wagaSchematuKg(minutyStandardowe, { kobalt } = {}) {
  const g = _kobalt(kobalt) ? SCHEMAT_GRAMY_NA_GODZINE_KOBALT : SCHEMAT_GRAMY_NA_GODZINE_RAW;
  return Math.round((minutyStandardowe / 60) * g) / 1000;
}

/** Trzy rozmiary Schematu wg godzin przepisu standardowego (prezentacja — obie wersje). */
export const ROZMIARY_SCHEMATU = Object.freeze([
  Object.freeze({ id: "notatka", label: "Notatka", doGodzin: 40 }),
  Object.freeze({ id: "instrukcja", label: "Instrukcja", doGodzin: 250 }),
  Object.freeze({ id: "dokumentacja", label: "Dokumentacja", doGodzin: Infinity })
]);

export function rozmiarSchematu(minutyStandardowe) {
  const h = minutyStandardowe / 60;
  return ROZMIARY_SCHEMATU.find(r => h <= r.doGodzin + EPS);
}

/* -------------------------------------------- */
/*  Szybka produkcja (D10, D33, L10)            */
/* -------------------------------------------- */

export function budzetSzybkiejProdukcji({ poziom2 = false } = {}) {
  return SZYBKA_PRODUKCJA_BUDZET[poziom2 ? 2 : 1];
}

/** Czas Szybkiej produkcji: Σ gb × 1 min, Fabrykator × 0,5 — cecha profesji nie działa (D33). */
export function czasSzybkiejProdukcji(wartoscGb, { fabrykator = false } = {}) {
  return czasWykonawcy(wartoscGb * SZYBKA_PRODUKCJA_MIN_NA_GB, fabrykator ? FABRYKATOR_CZAS : 1);
}

/* -------------------------------------------- */
/*  Naprawa (D17, L15)                          */
/* -------------------------------------------- */

/** D17: liczba kroków kości od oryginału broni białej → stopień naprawy (3+ = maks.). */
export function stopienNaprawyBroniBialej(kroki) {
  if (kroki <= 1) return "drobnostka";
  if (kroki === 2) return "troche";
  return "harowa";
}

/** Koszt naprawy w gamblach: procent ceny przedmiotu, w górę (żeby naprawa nigdy nie była darmowa). */
export function kosztNaprawy(stopien, cena) {
  const t = NAPRAWA[stopien];
  return t ? Math.max(1, Math.ceil((Number(cena) || 0) * t.koszt - EPS)) : 0;
}

/** Naprawa pancerza (s. 115): MK = 10% ceny × utracona TT (w górę), godziny na punkt wg kategorii. */
export function naprawaPancerza(cena, utraconaTT, kategoria) {
  const mk = Math.max(1, Math.ceil((Number(cena) || 0) * PANCERZ_NAPRAWA.kosztNaPunkt * utraconaTT - EPS));
  const h = (PANCERZ_NAPRAWA.godzinNaPunkt[kategoria] ?? PANCERZ_NAPRAWA.godzinNaPunkt.light) * utraconaTT;
  return { surowce: { MK: mk }, minuty: h * 60 };
}

/* -------------------------------------------- */
/*  Format i wejście                            */
/* -------------------------------------------- */

/** 2100 → „35:00”. */
export function fmtGGMM(minuty) {
  const m = Math.max(0, Math.round(Number(minuty) || 0));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Czas pracy wpisany przez gracza → minuty: „4” (godziny), „2:30”, „1,5”, „90m”.
 * @returns {number|null}
 */
export function parseCzasPracy(str) {
  const s = String(str ?? "").trim().replace(",", ".");
  let m;
  if ((m = s.match(/^(\d+):([0-5]\d)$/))) return Number(m[1]) * 60 + Number(m[2]);
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|min)$/i))) return Math.round(Number(m[1]));
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*h?$/i))) return Math.round(Number(m[1]) * 60);
  return null;
}

/**
 * Korekta postępu [±]: „+5” / „-3” (godziny), „+1:30”, „+10%”, „=50%” (ustaw) — D9.
 * @returns {{tryb: "delta"|"ustaw", minuty?: number, procent?: number}|null}
 */
export function parseKorekta(str) {
  const s = String(str ?? "").trim().replace(",", ".");
  const m = s.match(/^([+\-=]?)\s*(.+?)\s*(%?)$/);
  if (!m) return null;
  const [, znak, liczba, proc] = m;
  if (proc) {
    const v = Number(liczba);
    if (!Number.isFinite(v)) return null;
    if (znak === "=") return { tryb: "ustaw", procent: v };
    return { tryb: "delta", procent: znak === "-" ? -v : v };
  }
  const min = parseCzasPracy(liczba);
  if (min == null) return null;
  if (znak === "=") return { tryb: "ustaw", minuty: min };
  return { tryb: "delta", minuty: znak === "-" ? -min : min };
}

/** Zastosowanie korekty do postępu: wynik w [0, wymagane]. */
export function zastosujKorekte(postep, wymagane, korekta) {
  if (!korekta) return postep;
  let v = postep;
  if (korekta.tryb === "ustaw") {
    v = korekta.procent != null ? Math.round((wymagane * korekta.procent) / 100) : korekta.minuty;
  } else {
    v += korekta.procent != null ? Math.round((wymagane * korekta.procent) / 100) : korekta.minuty;
  }
  return Math.min(wymagane, Math.max(0, v));
}

export const __testing = Object.freeze({ rozloz: _rozloz });
