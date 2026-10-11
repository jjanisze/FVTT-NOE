/**
 * Neuroshima 5e — Fuksy v2: czyste zasady (PLAN_m5_postoj.md §7.1, U24, E0).
 *
 * Czysty: bez `game`. Warstwa Foundry (`actors/fuksy.mjs`, pipki, Przerzut) trzyma listę w
 * `flags.<mod>.fuksy` i woła tutejsze funkcje; one nigdy nie piszą.
 *
 * ## Reguły (NOE s. 16–17, 46–47, 57, 105; D15, D24, D38)
 *
 *   - Najwyżej **trzy** Fuksy naraz; nie można ich przekazać (s. 17). Przyznanie przy komplecie — odmowa (RAW),
 *     karta MG może zamienić najkrócej ważny.
 *   - **Trwałe**: z Fantów i z Nagrody publiczności (s. 17, 57, D24) — przechodzą na następne sesje.
 *     **Ulotne** — termin z RAW: Gotowanie 24 h (s. 46), Pieśń otuchy 24 h (s. 105), Rozrywka 7 dni (s. 47);
 *     WKK Bogaty 7 dni (D38); MG — termin z wyboru; Kolory — do końca sesji (po becie).
 *   - Zużycie — najpierw ten, który wygasa najwcześniej (trwały na końcu); remis — starszy.
 *   - Migracja (B2): liczba N z modelu sprzed M5 → N trwałych „sprzed M5”.
 */

export const MAX_FUKSY = 3;

const H = 3600;
const DZIEN = 24 * H;

/**
 * Źródła Fuksów. `termin` — sekundy czasu świata albo `null` (trwały); `kolor` — lekki kolor pipki (D15).
 * `wkk` — źródło tylko pod Kobaltem.
 */
export const ZRODLA_FUKSOW = Object.freeze({
  fant: Object.freeze({ label: "Fant", termin: null, kolor: "#d9a441", s: 17 }),
  publicznosc: Object.freeze({ label: "Nagroda publiczności", termin: null, kolor: "#c96bd1", s: 57 }),
  gotowanie: Object.freeze({ label: "Gotowanie", termin: DZIEN, kolor: "#e07a3f", s: 46 }),
  piesn: Object.freeze({ label: "Pieśń otuchy", termin: DZIEN, kolor: "#5fa8d3", s: 105 }),
  rozrywka: Object.freeze({ label: "Rozrywka", termin: 7 * DZIEN, kolor: "#d45d79", s: 47 }),
  bogaty: Object.freeze({ label: "Bogate życie", termin: 7 * DZIEN, kolor: "#e6c35c", wkk: true }),
  mg: Object.freeze({ label: "Od MG", termin: null, kolor: "#9aa5b1", wybor: true }),
  sesja: Object.freeze({ label: "Do końca sesji", termin: null, kolor: "#7fb069", doKoncaSesji: true }),
  przedM5: Object.freeze({ label: "Sprzed M5", termin: null, kolor: "#b0a58f" })
});

let _licznik = 0;
function _noweId() {
  _licznik = (_licznik + 1) % 1e6;
  return `f${Date.now().toString(36)}${_licznik.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Czy Fuks jest trwały (bez terminu i nie „do końca sesji”). */
export function jestTrwaly(f) {
  return (f?.wygasa === null || f?.wygasa === undefined) && !f?.doKoncaSesji;
}

/**
 * Lista z flagi — liczba sprzed M5 albo tablica; śmieci odpadają, nadmiar ponad 3 obcinany od najkrócej
 * ważnych (RAW: nie można mieć więcej niż trzy).
 * @param {number|object[]|null|undefined} flaga
 * @returns {object[]}
 */
export function normalizuj(flaga, teraz = 0) {
  if (typeof flaga === "number" || typeof flaga === "string") return migruj(Number(flaga), teraz);
  if (!Array.isArray(flaga)) return [];
  const ok = flaga.filter(f => f && typeof f === "object" && typeof f.zrodlo === "string");
  return _posortuj(ok).slice(-MAX_FUKSY);
}

/** Kolejność zużycia: najwcześniej wygasający pierwszy, „do końca sesji” po terminowych, trwałe na końcu. */
function _klucz(f) {
  if (f?.doKoncaSesji) return [1, 0];
  if (f?.wygasa === null || f?.wygasa === undefined) return [2, 0];
  return [0, Number(f.wygasa)];
}
function _posortuj(lista) {
  return [...lista].sort((a, b) => {
    const ka = _klucz(a), kb = _klucz(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || (Number(a.nadano) || 0) - (Number(b.nadano) || 0);
  });
}

/**
 * Nowy Fuks z rejestru źródeł.
 * @param {string} zrodlo  klucz `ZRODLA_FUKSOW`
 * @param {number} teraz   czas świata (s)
 * @param {{etykieta?: string, termin?: number|null, id?: string}} [o]  `termin` nadpisuje (MG)
 */
export function nowyFuks(zrodlo, teraz, { etykieta, termin, id } = {}) {
  const z = ZRODLA_FUKSOW[zrodlo];
  if (!z) throw new Error(`fuksy: nieznane źródło „${zrodlo}”`);
  const t = termin !== undefined ? termin : z.termin;
  return {
    id: id ?? _noweId(),
    zrodlo,
    etykieta: etykieta ?? z.label,
    wygasa: t === null || t === undefined ? null : Number(teraz) + Number(t),
    nadano: Number(teraz) || 0,
    ...(z.doKoncaSesji ? { doKoncaSesji: true } : {})
  };
}

/**
 * Przyznanie (s. 17): przy komplecie — odmowa, lista bez zmian.
 * @returns {{lista: object[], fuks: object|null, odmowa: "komplet"|null}}
 */
export function przyznaj(lista, zrodlo, teraz, opcje = {}) {
  const l = normalizuj(lista, teraz);
  if (l.length >= MAX_FUKSY) return { lista: l, fuks: null, odmowa: "komplet" };
  const fuks = nowyFuks(zrodlo, teraz, opcje);
  return { lista: _posortuj([...l, fuks]), fuks, odmowa: null };
}

/**
 * Zamiana najkrócej ważnego (karta MG przy komplecie): wypada pierwszy w kolejności zużycia.
 * @returns {{lista: object[], fuks: object, usuniety: object|null}}
 */
export function zamienNajkrocejWazny(lista, zrodlo, teraz, opcje = {}) {
  const l = _posortuj(normalizuj(lista, teraz));
  const usuniety = l.length >= MAX_FUKSY ? l.shift() : null;
  const fuks = nowyFuks(zrodlo, teraz, opcje);
  return { lista: _posortuj([...l, fuks]), fuks, usuniety };
}

/**
 * Zużycie jednego Fuksa: ten, który wygasa najwcześniej.
 * @returns {{lista: object[], zuzyty: object|null}}
 */
export function zuzyj(lista, teraz = 0) {
  const l = _posortuj(normalizuj(lista, teraz));
  const zuzyty = l.shift() ?? null;
  return { lista: l, zuzyty };
}

/**
 * Wygasłe na zegarze: termin ≤ teraz.
 * @returns {{zostaja: object[], wygasle: object[]}}
 */
export function wygasle(lista, teraz) {
  const l = normalizuj(lista, teraz);
  const t = Number(teraz);
  const wyg = l.filter(f => f.wygasa !== null && f.wygasa !== undefined && Number(f.wygasa) <= t);
  return { zostaja: l.filter(f => !wyg.includes(f)), wygasle: wyg };
}

/** Koniec sesji (Kolory, po becie): Fuksy „do końca sesji” znikają. */
export function koniecSesji(lista) {
  const l = normalizuj(lista);
  return { zostaja: l.filter(f => !f.doKoncaSesji), wygasle: l.filter(f => f.doKoncaSesji) };
}

/** Migracja z liczby (B2): N trwałych „sprzed M5”, najwyżej 3. */
export function migruj(liczba, teraz = 0) {
  const n = Math.max(0, Math.min(MAX_FUKSY, Math.floor(Number(liczba) || 0)));
  return Array.from({ length: n }, (_, i) => nowyFuks("przedM5", teraz, { id: `m5-${i}` }));
}

/**
 * Tekst dymka (D15): „Fuks od Rozrywki — do 14 maja, 18:00”; `fmt` formatuje czas świata.
 * @param {object} f
 * @param {(sekundy: number) => string} [fmt]
 */
export function opisFuksa(f, fmt = s => String(s)) {
  const z = ZRODLA_FUKSOW[f?.zrodlo];
  const skad = f?.etykieta ?? z?.label ?? "?";
  if (f?.doKoncaSesji) return `Fuks: ${skad} — do końca sesji`;
  if (f?.wygasa === null || f?.wygasa === undefined) return `Fuks: ${skad} — bezterminowy`;
  return `Fuks: ${skad} — do ${fmt(f.wygasa)}`;
}

export const __testing = Object.freeze({ _klucz, _posortuj });
