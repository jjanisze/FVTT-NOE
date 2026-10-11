/**
 * Neuroshima 5e — losowanie: ziarno, kości i wybór ważony (PLAN_m5_postoj.md §7.1, E0).
 *
 * Czysty: bez `game`, bez `CONFIG`. Wspólne narzędzia dla generatora towaru (D29), szabrowania i Tabeli
 * losowych przedmiotów (U13), bebeszenia i Fantów. Każda funkcja przyjmuje `rng` — funkcję zwracającą
 * liczbę z [0, 1) — więc ten sam kod chodzi na `Math.random`, na ziarnie (ten sam towar dla tego samego
 * ziarna, D29) i na kościach podstawionych w testach.
 */

/* -------------------------------------------- */
/*  Ziarno                                       */
/* -------------------------------------------- */

/** Skrót tekstu do 32 bitów (xmur3) — ziarno z dowolnego napisu MG („Bazar Vegas”). */
function _xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Generator mulberry32 — szybki, 32-bitowy, wystarczający do losowania towaru. */
function _mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generator liczb z ziarna tekstowego albo liczbowego. Bez ziarna — `Math.random`.
 * @param {string|number|null} [ziarno]
 * @returns {() => number}
 */
export function rngZZiarna(ziarno) {
  if (ziarno === null || ziarno === undefined || ziarno === "") return Math.random;
  const n = typeof ziarno === "number" ? (ziarno >>> 0) : _xmur3(String(ziarno));
  return _mulberry32(n);
}

/* -------------------------------------------- */
/*  Kości                                        */
/* -------------------------------------------- */

/** Jedna kość `k` ścianek (1…k). */
export function kosc(k, rng = Math.random) {
  return 1 + Math.floor(rng() * k);
}

/**
 * Prosty zapis kości: „3d20”, „2k4”, „1k10”, „k6”, „4”, „2d6+1”. Polskie „k” i angielskie „d”.
 * @returns {{n: number, k: number, plus: number}|null} `k = 0` — stała
 */
export function parseKosci(zapis) {
  const s = String(zapis ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (/^\d+$/.test(s)) return { n: 0, k: 0, plus: Number(s) };
  const m = /^(\d*)[kd](\d+)([+-]\d+)?$/.exec(s);
  if (!m) return null;
  return { n: m[1] === "" ? 1 : Number(m[1]), k: Number(m[2]), plus: Number(m[3] ?? 0) };
}

/** Rzut zapisu kości; rzuca przy złym zapisie. Zwraca sumę i pojedyncze wyniki. */
export function rzucKosci(zapis, rng = Math.random) {
  const p = parseKosci(zapis);
  if (!p) throw new Error(`losowanie: nieznany zapis kości „${zapis}”`);
  const wyniki = [];
  for (let i = 0; i < p.n; i++) wyniki.push(kosc(p.k, rng));
  return { suma: wyniki.reduce((a, b) => a + b, 0) + p.plus, wyniki };
}

/** Średnia zapisu kości — przeskok narracyjny liczy wartości oczekiwane (D19). */
export function sredniaKosci(zapis) {
  const p = parseKosci(zapis);
  if (!p) throw new Error(`losowanie: nieznany zapis kości „${zapis}”`);
  return p.n * (p.k + 1) / 2 + p.plus;
}

/** Zapis kości w notacji Foundry (`Roll`): „2k4” → „2d4”. */
export function doRoll(zapis) {
  const p = parseKosci(zapis);
  if (!p) return String(zapis);
  if (p.k === 0) return String(p.plus);
  return `${p.n}d${p.k}${p.plus ? (p.plus > 0 ? `+${p.plus}` : `${p.plus}`) : ""}`;
}

/* -------------------------------------------- */
/*  Tabele k100 i wybór ważony                   */
/* -------------------------------------------- */

/**
 * Wiersz tabeli dla wyniku kości. Wiersze `{ od, do, … }` (włącznie).
 * @returns {object|null}
 */
export function wierszTabeli(wiersze, wynik) {
  return wiersze.find(w => wynik >= w.od && wynik <= w.do) ?? null;
}

/**
 * Domknięcie tabeli: wiersze pokrywają 1…`sciany` bez dziur i bez nakładania.
 * @returns {string[]} opisy błędów (pusta lista = domknięta)
 */
export function bledyDomkniecia(wiersze, sciany = 100) {
  const bledy = [];
  const pokrycie = new Array(sciany + 1).fill(0);
  for (const w of wiersze) {
    if (!(w.od >= 1 && w.do <= sciany && w.od <= w.do)) { bledy.push(`zły zakres ${w.od}–${w.do} (${w.nazwa ?? "?"})`); continue; }
    for (let i = w.od; i <= w.do; i++) pokrycie[i]++;
  }
  for (let i = 1; i <= sciany; i++) {
    if (pokrycie[i] === 0) bledy.push(`brak wyniku ${i}`);
    else if (pokrycie[i] > 1) bledy.push(`wynik ${i} w ${pokrycie[i]} wierszach`);
  }
  return bledy;
}

/**
 * Wybór ważony (D9: rzadsze rzadziej). Elementy z wagą ≤ 0 nigdy nie wypadają.
 * @template T
 * @param {T[]} elementy
 * @param {(e: T) => number} waga
 * @returns {T|null}
 */
export function wybierzWazony(elementy, waga, rng = Math.random) {
  const wagi = elementy.map(e => Math.max(0, Number(waga(e)) || 0));
  const suma = wagi.reduce((a, b) => a + b, 0);
  if (suma <= 0) return null;
  let r = rng() * suma;
  for (let i = 0; i < elementy.length; i++) {
    r -= wagi[i];
    if (r < 0) return elementy[i];
  }
  return elementy[elementy.length - 1];
}

/**
 * Losowanie bez zwracania: `n` elementów z listy (Fisher–Yates na kopii).
 * @template T
 * @returns {T[]}
 */
export function wybierzBezZwracania(elementy, n, rng = Math.random) {
  const kopia = [...elementy];
  const ile = Math.max(0, Math.min(n, kopia.length));
  for (let i = 0; i < ile; i++) {
    const j = i + Math.floor(rng() * (kopia.length - i));
    [kopia[i], kopia[j]] = [kopia[j], kopia[i]];
  }
  return kopia.slice(0, ile);
}

/**
 * Kolejka wyników kości do testów: `rngZKosci([58], 100)` zwraca u, które daje 58 na k100
 * w `kosc()` (1 + floor(u·k)). Po wyczerpaniu kolejki — 0,5.
 */
export function rngZKosci(wyniki, sciany) {
  const q = [...wyniki];
  return () => (q.length ? (q.shift() - 0.5) / sciany : 0.5);
}

export const __testing = Object.freeze({ _xmur3, _mulberry32 });
