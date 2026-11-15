/**
 * Neuroshima 5e — ekonomia tury M8: czysty model ledgera (PLAN_m8_ruch_i_ekonomia_akcji §4–§6, E1–E2, E4).
 *
 * Jeden zapis kosztów walczącego: wspólne pule A/B/R/I, granty, wydatki ruchu, korekty. Ten plik **nie zna Foundry**:
 * dostaje ledger (zwykły obiekt z flagi kombatanta), chwilę walki i dane aktora, a zwraca nowy ledger albo projekcję.
 * Zapis, wykonawca i haki są w `combat/ekonomia.mjs`; fasada API to dalej `game.neuroshima.actions` (M7).
 *
 * Pojęcia:
 *   - **cykl** — runda ostatniej rozpoczętej własnej tury (0 — przed pierwszą). Instancja tury to (walka, kombatant,
 *     runda): zmiana kolejności i cofnięcie tury w tej samej rundzie wracają do tej samej instancji, nie dają nowych
 *     grantów (§5.3). Reakcja odnawia się z nowym cyklem (s. 37).
 *   - **wlasna** — trwa własna tura. Zwykły ruch i A/B/I należą do niej (s. 26, 37; D18).
 *   - **reakcja** — id wykonania reakcji (§4.3). Ruch w reakcji korzysta wyłącznie z grantów tej reakcji (D30).
 *
 * Liczniki są pomocnicze (§1 zasada 3): wydatek ponad pulę zapisuje się z ostrzeżeniem, nic nie jest blokowane.
 * Nieznana narracja nie jest dowodem (§6.5): pusty ledger to „nic nie zarejestrowano”, nie „nic się nie stało”.
 *
 * Testy: `tests/ekonomia.test.mjs` (warstwa 1 — wektory T01–T13, T21–T24 z §11).
 */

import { RUCH_KOBALT, konwencjeRuchu } from "../wkk/config/ruch-kobalt.mjs";
import { opisJednostek } from "./teren-data.mjs";

export const LEDGER_WERSJA = 1;
/** Konwencje ruchu WKK (D14, D17, D30, D31) — domyślnie włączone; bez Kobaltu `konwencjeRuchu(false)`. */
export const KONWENCJE_DOMYSLNE = konwencjeRuchu(true);

/** Rodzaje akcji (s. 21): Akcja, Akcja Bonusowa, Reakcja, Darmowa interakcja. */
export const RODZAJE = Object.freeze(["A", "B", "R", "I"]);
export const NAZWY = Object.freeze({ A: "Akcja", B: "Akcja Bonusowa", R: "Reakcja", I: "Darmowa interakcja" });
export const DOPELNIACZ = Object.freeze({ A: "Akcji", B: "Akcji Bonusowej", R: "Reakcji", I: "Darmowej interakcji" });

/** Ile cykli wstecz trzymamy wpisy (cofnięcie inicjatywy, Undo ruchu, archiwum — §5.1 „skończony rozmiar”). */
export const ARCHIWUM_CYKLI = 2;
/** Ile ostatnich identyfikatorów żądań pamiętamy do deduplikacji. */
export const PAMIEC_ZADAN = 60;

/**
 * Tryby ruchu, które zawsze liczą się z bazy chodu (czołganie i skok to część chodu, s. 26, 37, 256; ciągnięcie
 * pochwyconego — chód z dopłatą, s. 35, tryb `drag` z `scenes/teren-preset.mjs`).
 */
const Z_CHODU = new Set(["walk", "crawl", "jump", "drag"]);
/** Tryby, które bez własnej Szybkości korzystają z chodu z dopłatą (s. 255, 257) — dopłatę liczy natywny koszt. */
const Z_CHODU_GDY_BRAK = new Set(["swim", "climb"]);

const _zaokr = n => Math.round((Number(n) || 0) * 100) / 100;
const _suma = (lista, fn) => _zaokr(lista.reduce((s, x) => s + (Number(fn(x)) || 0), 0));

/* -------------------------------------------- */
/*  Ledger i chwila                              */
/* -------------------------------------------- */

/**
 * @typedef {object} Ledger
 * @property {number} v
 * @property {string} walka            id walki
 * @property {number} rev              rewizja (rośnie z każdym zapisem)
 * @property {{runda: number}[]} tury  rozpoczęte własne tury
 * @property {object[]} ops            operacje (wydatki, korekty, deklaracje)
 * @property {object[]} granty
 * @property {object[]} ruchy          zarejestrowane przemieszczenia (id natywnego ruchu)
 * @property {object[]} zakazy         czasowe zakazy akcji (zmęczenie po Berserku)
 * @property {object[]} reakcje        wykonania reakcji `{id, cykl, zrodlo, koniec}` (§4.3)
 * @property {object[]} przygotowania  Wyczekanie (§6.4): `{id, cykl, op, opis, akcja, wykonana}` — A zapłacona, R przy wykonaniu
 * @property {object[]} ataki          instancje Atakowania (§7.1): `{id, cykl, op, sloty, uzyte}` — jedna A, kilka ataków
 * @property {string[]} zadania        ostatnie przetworzone id żądań (deduplikacja)
 */

/** Pusty ledger dla walki. */
export function pustyLedger(walka) {
  return { v: LEDGER_WERSJA, walka: String(walka ?? ""), rev: 0, tury: [], ops: [], granty: [], ruchy: [], zakazy: [], reakcje: [], przygotowania: [], ataki: [], zadania: [] };
}

/** Ledger z flagi albo pusty — inny `walka` lub nieznana wersja to nowy ledger (stary zapis nie przechodzi do innej walki). */
export function ledgerZ(zapis, walka) {
  if (!zapis || typeof zapis !== "object" || zapis.v !== LEDGER_WERSJA || zapis.walka !== String(walka ?? "")) return pustyLedger(walka);
  const l = pustyLedger(walka);
  for (const k of Object.keys(l)) if (Array.isArray(l[k]) && Array.isArray(zapis[k])) l[k] = zapis[k].map(x => (x && typeof x === "object" ? { ...x } : x));
  l.rev = Number(zapis.rev) || 0;
  return l;
}

/**
 * @typedef {object} Chwila
 * @property {number} runda
 * @property {number} cykl          runda ostatniej rozpoczętej własnej tury; 0 — przed pierwszą
 * @property {boolean} wlasna       trwa własna tura
 * @property {string|null} reakcja  id trwającego wykonania reakcji
 */

/**
 * Chwila walki z punktu widzenia kombatanta. Rozpoczęcie własnej tury w tej rundzie: trwa teraz, jest zapisane w
 * ledgerze albo (gdy nikt jeszcze nie zapisał — brak MG) kombatant stoi przed bieżącym w kolejności.
 * @param {Ledger|null} ledger
 * @param {{runda: number, biezacyId: string|null, id: string, kolejnosc?: string[], indeks?: number, reakcja?: string|null}} w
 * @returns {Chwila}
 */
export function chwilaKombatanta(ledger, { runda, biezacyId, id, kolejnosc = [], indeks = 0, reakcja = null }) {
  const r = Math.max(0, Number(runda) || 0);
  const wlasna = !!id && biezacyId === id;
  let cykl;
  if (wlasna || (ledger?.tury ?? []).some(t => t.runda === r)) cykl = r;
  else {
    const i = kolejnosc.indexOf(id);
    cykl = i >= 0 && i < indeks ? r : r - 1;
  }
  return { runda: r, cykl: Math.max(0, cykl), wlasna, reakcja: reakcja ?? null };
}

/**
 * Trwające wykonanie reakcji tego cyklu (najnowsze niezakończone) albo null. Koniec reakcji jest zdarzeniem M8:
 * `postUseActivity` go nie dowodzi (§4.3); nowy cykl (własna tura) zamyka wszystko, co zostało otwarte.
 */
export function aktywnaReakcja(ledger, cykl) {
  return [...(ledger?.reakcje ?? [])].reverse().find(r => !r.koniec && r.cykl === cykl) ?? null;
}

/**
 * Przygotowania Wyczekania aktywne w tej chwili (§6.4): z bieżącego cyklu, jeszcze niewykonane. Początek własnej tury
 * (nowy cykl) kończy niewykorzystane — bez zwrotu A. Kilka przygotowań to wybór odpowiedzi, ale jedna wspólna R.
 */
export function aktywnePrzygotowania(ledger, chwila) {
  return (ledger?.przygotowania ?? []).filter(p => !p.wykonana && p.cykl === chwila.cykl);
}

/** Trwająca reakcja otwarta bez akcji (przycisk Reaguj / wykonanie przygotowania) — następna deklaracja do niej należy. */
export function reakcjaBezAkcji(ledger, chwila) {
  const r = chwila?.reakcja ? (ledger?.reakcje ?? []).find(x => x.id === chwila.reakcja && !x.koniec) : null;
  if (!r) return null;
  return (ledger.ops ?? []).some(o => o.reakcja === r.id && o.deklaracja) ? null : r;
}

/* -------------------------------------------- */
/*  Zakazy (rany, Obezwładnienie, zmęczenie)     */
/* -------------------------------------------- */

/** Od którego Stopnia Zranienia akcja przepada (s. 32): 2 Znaczny — bez R, 3 Poważny — bez B (kumulują się). */
export const ZRANIENIE_ZAKAZ = Object.freeze({ R: 2, B: 3 });
const STOPNIE = Object.freeze({ 2: "Znaczny", 3: "Poważny", 4: "Krytyczny" });
/** Stany, które odbierają wszystkie akcje (s. 35). */
export const STANY_BEZ_AKCJI = Object.freeze({
  incapacitated: "Obezwładnienie", unconscious: "Nieprzytomność", stunned: "Ogłuszenie", paralyzed: "Sparaliżowanie"
});

/**
 * Czy zmęczenie po Berserku działa w tej chwili (D24, s. 67): od końca Berserku do końca następnej własnej tury.
 * `konczy` — runda tej następnej tury (cykl w chwili końca + 1).
 */
export function zmeczenieDziala(zakaz, chwila) {
  if (!zakaz || zakaz.rodzaj !== "zmeczenie") return false;
  const k = Number(zakaz.konczy) || 0;
  if (chwila.cykl < k) return true;
  return chwila.cykl === k && chwila.wlasna;
}

/**
 * Powód zakazu dla każdego rodzaju akcji albo null. Zakaz nie jest wydatkiem (§6.1): nie zmienia pul ani historii.
 * @param {Ledger} ledger
 * @param {Chwila} chwila
 * @param {{stany?: Iterable<string>, zranienie?: number}} aktor
 * @returns {{A: string|null, B: string|null, R: string|null, I: string|null}}
 */
export function zakazyAkcji(ledger, chwila, { stany = [], zranienie = 0 } = {}) {
  const out = { A: null, B: null, R: null, I: null };
  const zestaw = new Set(stany);
  const stan = Object.keys(STANY_BEZ_AKCJI).find(s => zestaw.has(s));
  if (stan) for (const k of RODZAJE) out[k] = `${STANY_BEZ_AKCJI[stan]} — bez akcji, Akcji Bonusowych i Reakcji (s. 35).`;
  const zm = (ledger?.zakazy ?? []).find(z => zmeczenieDziala(z, chwila));
  if (zm) for (const k of RODZAJE) out[k] ??= `Zmęczenie po Berserku — bez akcji do końca następnej tury (s. 67).`;
  const z = Number(zranienie) || 0;
  for (const k of ["R", "B"]) {
    if (z >= ZRANIENIE_ZAKAZ[k]) out[k] ??= `Stopień Zranienia ${STOPNIE[Math.min(z, 4)]} — bez ${DOPELNIACZ[k]} (s. 32).`;
  }
  return out;
}

/* -------------------------------------------- */
/*  Pule A/B/R/I                                 */
/* -------------------------------------------- */

/** Czy grant akcji obowiązuje w chwili: A/B/I tylko w cyklu, w którym go dano (granty tej tury, s. 87). */
function _grantAkcjiAktywny(g, chwila) {
  return g.cykl === chwila.cykl;
}

/**
 * Projekcja pul. A/B/I liczą się w cyklu (własnej turze tego cyklu i czasie do następnej), R — w cyklu.
 * `pojemnosc` to pula bez ograniczonych grantów; `ogr` — granty z ograniczeniem użycia (Szybkie ręce: Używanie).
 * @param {Ledger} ledger
 * @param {Chwila} chwila
 * @param {{stany?: Iterable<string>, zranienie?: number}} [aktor]
 */
export function pule(ledger, chwila, aktor = {}) {
  const zakazy = zakazyAkcji(ledger, chwila, aktor);
  const ops = (ledger?.ops ?? []).filter(o => o.cykl === chwila.cykl);
  const granty = (ledger?.granty ?? []).filter(g => RODZAJE.includes(g.typ) && _grantAkcjiAktywny(g, chwila));
  const out = {};
  for (const k of RODZAJE) {
    const zwykle = granty.filter(g => g.typ === k && !g.ogr);
    const pojemnosc = 1 + _suma(zwykle, g => g.ile);
    const wydane = _suma(ops.filter(o => !o.ogr), o => o.koszt?.[k]);
    const ogr = {};
    for (const g of granty.filter(x => x.typ === k && x.ogr)) {
      ogr[g.ogr] ??= { pojemnosc: 0, wydane: 0 };
      ogr[g.ogr].pojemnosc += Number(g.ile) || 0;
    }
    for (const o of ops.filter(x => x.ogr && x.koszt?.[k])) {
      ogr[o.ogr] ??= { pojemnosc: 0, wydane: 0 };
      ogr[o.ogr].wydane += Number(o.koszt[k]) || 0;
    }
    out[k] = { pojemnosc, wydane, pozostalo: _zaokr(pojemnosc - wydane), ogr, zakaz: zakazy[k] };
  }
  return out;
}

/**
 * Plan wydatku przed zapisem: z której puli (zwykła / ograniczona) i jakie ostrzeżenia zamrozić w operacji.
 * Ostrzeżenia nie blokują (D6, D15): przekroczenie daje wartość ujemną i powód.
 * @param {Ledger} ledger
 * @param {Chwila} chwila
 * @param {{A?: number, B?: number, R?: number, I?: number}} koszt
 * @param {{cel?: string|null, zrodlo?: string, aktor?: object, wlasnaWymagana?: boolean}} [o]
 * @returns {{ogr: string|null, ostrz: string[]}}
 */
export function planWydatku(ledger, chwila, koszt, { cel = null, zrodlo = "?", aktor = {} } = {}) {
  const p = pule(ledger, chwila, aktor);
  const ostrz = [];
  let ogr = null;
  for (const k of RODZAJE) {
    const n = Number(koszt?.[k]) || 0;
    if (n <= 0) continue;
    if (p[k].zakaz) ostrz.push(p[k].zakaz);
    // Ograniczony grant pasujący do celu (Szybkie ręce → Używanie) idzie pierwszy: po to go aktywowano (§6.2).
    const o = cel ? p[k].ogr[cel] : null;
    if (o && o.pojemnosc - o.wydane >= n) { ogr = cel; continue; }
    if (p[k].pozostalo - n < 0) {
      const wczesniej = (ledger?.ops ?? []).filter(x => x.cykl === chwila.cykl && !x.ogr && x.koszt?.[k] > 0).map(x => x.zrodlo);
      ostrz.push(`${NAZWY[k]} ponad pulę (${metry(p[k].pozostalo - n)}/${p[k].pojemnosc})`
        + (wczesniej.length ? ` — wcześniej: ${wczesniej.join(", ")}` : "") + ` — teraz: ${zrodlo}.`);
    }
    if (k !== "R" && !chwila.wlasna && !chwila.reakcja) ostrz.push(`${NAZWY[k]} poza własną turą (${zrodlo}).`);
  }
  return { ogr, ostrz };
}

/* -------------------------------------------- */
/*  Ruch                                         */
/* -------------------------------------------- */

/**
 * Tryb Szybkości, z którego liczy się dany tryb ruchu (§4.1): czołganie i skok — z chodu; pływanie i wspinanie bez
 * własnej Szybkości — z chodu (dopłatę dodaje natywny koszt dnd5e). Inne bez Szybkości — niedostępne.
 * @param {string} tryb   natywna akcja ruchu (`walk`, `swim`, `climb`, `fly`, `burrow`, `crawl`, `jump`)
 * @param {Record<string, number>} szybkosci
 * @returns {string|null}
 */
export function trybBazowy(tryb, szybkosci = {}) {
  const t = tryb || "walk";
  if (Z_CHODU.has(t)) return "walk";
  if (Number(szybkosci[t]) > 0) return t;
  if (Z_CHODU_GDY_BRAK.has(t)) return "walk";
  return null;
}

/** Ruchy (niecofnięte) liczące się do kontekstu chwili: własna tura cyklu albo dana reakcja. */
function _ruchyKontekstu(ledger, chwila) {
  const ruchy = (ledger?.ruchy ?? []).filter(r => !r.cofniety);
  if (chwila.reakcja) return ruchy.filter(r => r.reakcja === chwila.reakcja);
  return ruchy.filter(r => r.cykl === chwila.cykl && r.wlasna && !r.reakcja);
}

/** Koszty bez przemieszczenia (Padnij, Powstań, wsiadanie) w kontekście chwili. */
function _kosztyBezDrogi(ledger, chwila) {
  const ops = (ledger?.ops ?? []).filter(o => Number(o.ruch) > 0);
  if (chwila.reakcja) return ops.filter(o => o.reakcja === chwila.reakcja);
  return ops.filter(o => o.cykl === chwila.cykl && o.wlasna && !o.reakcja);
}

/** Granty ruchu dostępne w chwili: własne tego cyklu poza reakcjami albo wyłącznie te z bieżącej reakcji (D30). */
export function grantyRuchu(ledger, chwila) {
  const g = (ledger?.granty ?? []).filter(x => x.typ === "ruch");
  if (chwila.reakcja) return g.filter(x => x.reakcja === chwila.reakcja);
  return g.filter(x => !x.reakcja && x.cykl === chwila.cykl);
}

/**
 * Sytuacje, w których wyłączona konwencja WKK zostawia rozstrzygnięcie stołowi (§2.2): zwraca opisy, nie liczby.
 * @returns {string[]}
 */
function _reczne(ledger, chwila, baza, szybkosci, wkk) {
  const out = [];
  for (const j of new Set(_ruchyKontekstu(ledger, chwila).filter(r => r.jednostki).map(r => r.jednostki))) out.push(opisJednostek(j));
  if (!wkk.d17 && _ruchyKontekstu(ledger, chwila).some(r => trybBazowy(r.tryb, szybkosci) !== baza && r.koszt > 0)) out.push(RUCH_KOBALT.d17);
  const granty = grantyRuchu(ledger, chwila);
  if (!wkk.d31 && granty.some(g => (g.tryb ?? "walk") !== baza)) out.push(RUCH_KOBALT.d31);
  if (!wkk.d14 && granty.some(g => g.szybkoscPrzy != null && _zaokr(Number(szybkosci[g.tryb ?? "walk"]) || 0) !== _zaokr(g.szybkoscPrzy))) {
    out.push(RUCH_KOBALT.d14);
  }
  if (!wkk.d30 && chwila.reakcja && (ledger?.granty ?? []).some(g => g.typ === "ruch" && !g.reakcja && g.cykl === chwila.cykl)) {
    out.push(RUCH_KOBALT.d30);
  }
  return out;
}

/**
 * Budżet ruchu (§4.1–§4.3):
 *   pojemnosc(tryb) = baza(tryb) + granty przypisane do tej Szybkości (D31) + korekty
 *   wydane          = wspólny koszt dróg i operacji bez drogi w tym kontekście (D17)
 *   pozostalo       = pojemnosc − wydane (ujemne — przekroczenie, D6)
 *
 * Baza to **bieżąca** efektywna Szybkość: zmiana Szybkości (rana, leczenie) przesuwa ją raz, granty zachowują
 * liczbę z chwili wykonania (D14). Poza własną turą i bez reakcji — brak dobrowolnego ruchu (D18). W reakcji — tylko
 * świeże granty tej reakcji, bez bazy (D30). Szybkość chodu 0 to blokada: żaden grant jej nie omija (§4.2).
 * @param {Ledger} ledger
 * @param {Chwila} chwila
 * Konwencje WKK (`wkk`): wyłączona konwencja nie zmienia liczb na inną interpretację — dopisuje `reczne` (opisy
 * sytuacji do rozstrzygnięcia przy stole), a UI nie potwierdza wtedy budżetu (§2.2).
 * @param {{szybkosci?: Record<string, number>, tryb?: string, wkk?: Record<string, boolean>}} o
 */
export function budzetRuchu(ledger, chwila, { szybkosci = {}, tryb = "walk", wkk = KONWENCJE_DOMYSLNE } = {}) {
  const baza = trybBazowy(tryb, szybkosci);
  // Ruch na scenie w innych jednostkach niż metry (§3.1) nie miesza się z metrami — zostaje do ręcznego rozliczenia.
  const wydane = _zaokr(_suma(_ruchyKontekstu(ledger, chwila).filter(r => !r.jednostki), r => r.koszt) + _suma(_kosztyBezDrogi(ledger, chwila), o => o.ruch));
  const korekty = _suma((ledger?.ops ?? []).filter(o => o.rodzaj === "korektaRuchu"
    && (chwila.reakcja ? o.reakcja === chwila.reakcja : o.cykl === chwila.cykl && !o.reakcja)), o => o.ileRuchu);
  const out = { tryb: tryb || "walk", baza, szybkosc: 0, granty: [], pojemnosc: 0, wydane, pozostalo: 0, dostepny: true, powod: null,
    reczne: baza ? _reczne(ledger, chwila, baza, szybkosci, wkk) : [] };
  if (!baza) return { ...out, dostepny: false, powod: `Brak Szybkości dla tego trybu ruchu.`, pozostalo: _zaokr(-wydane) };
  if (!chwila.wlasna && !chwila.reakcja) return { ...out, dostepny: false, powod: "Poza własną turą — zwykły ruch nie przechodzi do reakcji (s. 26).", pozostalo: 0 };
  const szybkosc = _zaokr(Number(szybkosci[baza]) || 0);
  const chod = _zaokr(Number(szybkosci.walk) || 0);
  if (chod <= 0 && baza === "walk") {
    return { ...out, szybkosc: 0, pozostalo: _zaokr(-wydane), dostepny: false, powod: "Szybkość 0 — brak dobrowolnego ruchu." };
  }
  // D31: grant liczy się tylko w swoim rodzaju Szybkości (bez Kobaltu — inne granty i tak nie wchodzą, są w `reczne`).
  const granty = grantyRuchu(ledger, chwila).filter(g => (g.tryb ?? "walk") === baza);
  const pojemnosc = _zaokr((chwila.reakcja ? 0 : szybkosc) + _suma(granty, g => g.ile) + korekty);
  return { ...out, szybkosc, granty, pojemnosc, pozostalo: _zaokr(pojemnosc - wydane) };
}

/**
 * Grant ruchu z deklaracji (Przyspieszenie: 1× Szybkość, Bieganie: 2×, s. 29–30) — liczba **z chwili wykonania**
 * (D14), przypisana do wybranej Szybkości (D31). Bieganie wymaga nóg: tylko chód (s. 30).
 * @param {"przyspieszenie"|"bieganie"} rodzaj
 * @param {Record<string, number>} szybkosci
 * @param {string} [tryb]
 * @returns {{ile: number, tryb: string}|null}
 */
export function grantDeklaracji(rodzaj, szybkosci, tryb = "walk") {
  const mnoz = { przyspieszenie: 1, bieganie: 2 }[rodzaj];
  if (!mnoz) return null;
  const baza = rodzaj === "bieganie" ? "walk" : trybBazowy(tryb, szybkosci);
  if (!baza) return null;
  return { ile: _zaokr(mnoz * (Number(szybkosci[baza]) || 0)), tryb: baza };
}

/* -------------------------------------------- */
/*  Zastosowanie operacji (u wykonawcy)          */
/* -------------------------------------------- */

/**
 * Rozpoczęcie własnej tury: zapis instancji, jeśli jej nie ma (powtórzone wejście w tę samą rundę niczego nie daje).
 * @returns {boolean} czy ledger się zmienił
 */
export function zapiszTure(ledger, runda) {
  if (ledger.tury.some(t => t.runda === runda)) return false;
  ledger.tury.push({ runda });
  ledger.tury.sort((a, b) => a.runda - b.runda);
  return true;
}

/** Usuń wpisy starsze niż archiwum (§5.1) i nadmiar pamięci żądań. */
export function przytnij(ledger, cykl) {
  const od = cykl - ARCHIWUM_CYKLI;
  for (const k of ["ops", "granty", "ruchy", "reakcje", "przygotowania", "ataki"]) ledger[k] = ledger[k].filter(x => (Number(x.cykl) || 0) >= od);
  ledger.tury = ledger.tury.filter(t => t.runda >= od - 1).slice(-(ARCHIWUM_CYKLI + 2));
  ledger.zakazy = ledger.zakazy.filter(z => (Number(z.konczy) || 0) >= cykl - 1);
  if (ledger.zadania.length > PAMIEC_ZADAN) ledger.zadania = ledger.zadania.slice(-PAMIEC_ZADAN);
  return ledger;
}

/** Czy żądanie o tym id już przetworzono (deduplikacja §5.1 — powtórne dostarczenie niczego nie wydaje). */
export function juzPrzetworzone(ledger, id) {
  return !!id && (ledger.zadania.includes(id) || ledger.ops.some(o => o.id === id));
}

/**
 * Zapis operacji akcji (wydatek, korekta, grant). Mutuje i zwraca `ledger`; wynik w `wynik`.
 * @param {Ledger} ledger
 * @param {Chwila} chwila
 * @param {object} z  żądanie: `{id, rodzaj, koszt?, grant?, zrodlo, cel?, kto?, t?, ruch?, ileRuchu?, ostrz?}`
 * @param {object} [aktor]  `{stany, zranienie, szybkosci}`
 * @returns {{ledger: Ledger, wynik: {duplikat?: boolean, op?: object, ostrz: string[]}}}
 */
export function zastosuj(ledger, chwila, z, aktor = {}) {
  if (juzPrzetworzone(ledger, z.id)) return { ledger, wynik: { duplikat: true, op: ledger.ops.find(o => o.id === z.id) ?? null, ostrz: [] } };
  // Operacja, która rozpoczyna wykonanie reakcji, już do niej należy (jej R, jej świeży grant — D30).
  if (z.reakcjaStart) chwila = { ...chwila, reakcja: z.reakcjaStart };
  const op = {
    id: z.id, rodzaj: z.rodzaj ?? "akcja", zrodlo: String(z.zrodlo ?? "?"), kto: z.kto ?? null, t: z.t ?? 0,
    cykl: chwila.cykl, wlasna: !!chwila.wlasna, reakcja: chwila.reakcja ?? null, koszt: {}, ostrz: []
  };
  for (const k of RODZAJE) {
    const n = Number(z.koszt?.[k]) || 0;
    if (n) op.koszt[k] = n;
  }
  const korekta = op.rodzaj === "korekta" || op.rodzaj === "korektaRuchu";
  if (!korekta) {
    const plan = planWydatku(ledger, chwila, op.koszt, { cel: z.cel ?? null, zrodlo: op.zrodlo, aktor });
    if (plan.ogr) op.ogr = plan.ogr;
    op.ostrz.push(...plan.ostrz);
  }
  if (z.cel) op.cel = z.cel;
  if (z.deklaracja) op.deklaracja = String(z.deklaracja);
  if (Number(z.ruch) > 0) op.ruch = _zaokr(z.ruch);
  if (op.rodzaj === "korektaRuchu") op.ileRuchu = _zaokr(z.ileRuchu);
  if (z.powod) op.powod = String(z.powod);
  if (Array.isArray(z.ostrz)) op.ostrz.push(...z.ostrz.map(String));
  ledger.ops.push(op);
  if (z.grant) {
    const g = { id: `${z.id}-g`, op: z.id, typ: z.grant.typ, ile: _zaokr(z.grant.ile), zrodlo: op.zrodlo,
      cykl: chwila.cykl, reakcja: chwila.reakcja ?? null };
    if (z.grant.tryb) g.tryb = z.grant.tryb;
    if (z.grant.ogr) g.ogr = z.grant.ogr;
    if (z.grant.deklaracja) g.deklaracja = z.grant.deklaracja;
    if (z.grant.szybkosc != null) g.szybkoscPrzy = _zaokr(z.grant.szybkosc);
    ledger.granty.push(g);
  }
  if (z.zakaz) ledger.zakazy.push({ id: z.id, ...z.zakaz });
  if (z.reakcjaStart) ledger.reakcje.push({ id: z.reakcjaStart, cykl: chwila.cykl, zrodlo: op.zrodlo, koniec: false });
  // Wyczekanie (§6.4): przygotowanie z opłaconą A; wykonanie w R oznacza je raz (pominięcie okazji niczego nie zmienia).
  if (z.przygotowanie) {
    ledger.przygotowania.push({ id: `${z.id}-p`, cykl: chwila.cykl, op: z.id, opis: String(z.przygotowanie.opis ?? ""),
      akcja: z.przygotowanie.akcja ?? null, wykonana: null });
  }
  if (z.wykonaj) {
    const p = ledger.przygotowania.find(x => x.id === z.wykonaj);
    if (p && !p.wykonana) p.wykonana = z.id;
  }
  // Atakowanie (§7.1): nowa A otwiera instancję z jej slotami; kontynuacja zajmuje następny slot tej samej A.
  if (z.atak?.nowa) {
    ledger.ataki.push({ id: `${z.id}-a`, cykl: chwila.cykl, op: z.id, sloty: Math.max(1, Number(z.atak.nowa) || 1), uzyte: 1 });
    op.atak = { instancja: `${z.id}-a`, slot: 1 };
  } else if (z.atak?.instancja) {
    const a = ledger.ataki.find(x => x.id === z.atak.instancja);
    if (a) {
      a.uzyte += 1;
      op.atak = { instancja: a.id, slot: a.uzyte };
      if (a.uzyte > a.sloty) op.ostrz.push(`Atakowanie: ${a.uzyte}. atak w Akcji z ${a.sloty} — potrzebna nowa Akcja.`);
    }
  } else if (z.atak?.zrodlo) op.atak = { zrodlo: String(z.atak.zrodlo) };
  else if (z.atak?.tryb) op.atak = { tryb: String(z.atak.tryb) };
  if (z.atakKorekta) _zastosujKorekteAtaku(ledger, op, z.atakKorekta, chwila.cykl);
  if (z.reakcjaKoniec) {
    const r = ledger.reakcje.find(x => x.id === z.reakcjaKoniec);
    if (r) r.koniec = true;
  }
  ledger.zadania.push(z.id);
  ledger.rev += 1;
  return { ledger, wynik: { op, ostrz: op.ostrz } };
}

/**
 * Zapis odcinka natywnego ruchu (`moveToken`): ten sam `ruchId` w kolejnych częściach (pauza, kontynuacja) dokłada
 * koszt przebytej części — nalicza się tylko to, co faktycznie przebyto, raz (§5.3).
 * @param {Ledger} ledger
 * @param {Chwila} chwila
 * @param {{ruchId: string, czesc: string, koszt: number, dyst: number, tryb: string, zt: string, niepelny?: boolean}} r
 *   `niepelny` — koszt policzony bez terenu (natywny koszt nieznany); readout pokazuje to tekstem
 * @param {{szybkosci?: Record<string, number>}} [aktor]
 * @returns {{ledger: Ledger, wynik: {duplikat?: boolean, przed: object, po: object, ostrz: string[]}}}
 */
export function zapiszRuch(ledger, chwila, r, aktor = {}) {
  const klucz = `${r.ruchId}:${r.czesc}`;
  const opcje = { szybkosci: aktor.szybkosci, tryb: r.tryb, ...(aktor.wkk ? { wkk: aktor.wkk } : {}) };
  const przed = budzetRuchu(ledger, chwila, opcje);
  if (ledger.zadania.includes(klucz)) return { ledger, wynik: { duplikat: true, przed, po: przed, ostrz: [] } };
  let wpis = ledger.ruchy.find(x => x.id === r.ruchId && !x.cofniety);
  if (!wpis) {
    wpis = { id: r.ruchId, cykl: chwila.cykl, wlasna: !!chwila.wlasna, reakcja: chwila.reakcja ?? null, koszt: 0, dyst: 0,
      tryb: r.tryb || "walk", zt: r.zt ?? null, ostrz: [] };
    ledger.ruchy.push(wpis);
  }
  wpis.koszt = _zaokr(wpis.koszt + (Number(r.koszt) || 0));
  wpis.dyst = _zaokr(wpis.dyst + (Number(r.dyst) || 0));
  if (r.niepelny) wpis.niepelny = true;
  if (r.jednostki) wpis.jednostki = String(r.jednostki);
  const po = budzetRuchu(ledger, chwila, opcje);
  const ostrz = [];
  if (!po.dostepny && po.powod) ostrz.push(po.powod);
  else if (po.reczne.length) ostrz.push(`Budżet do rozstrzygnięcia przy stole: ${po.reczne.join("; ")}.`);
  else if (po.pozostalo < -0.001 && przed.pozostalo >= -0.001) ostrz.push(`Ruch ponad pulę: ${metry(po.pozostalo)}/${metry(po.pojemnosc)} m.`);
  else if (po.pozostalo < przed.pozostalo && po.pozostalo < -0.001) ostrz.push(`Dalszy ruch ponad pulę: ${metry(po.pozostalo)}/${metry(po.pojemnosc)} m.`);
  // Uwagi wołającego (np. skok ponad zasięg NOE) — tak samo trwałe jak przekroczenie puli.
  for (const u of r.uwagi ?? []) if (typeof u === "string" && u) ostrz.push(u);
  for (const o of ostrz) if (!wpis.ostrz.includes(o)) wpis.ostrz.push(o);
  ledger.zadania.push(klucz);
  ledger.rev += 1;
  return { ledger, wynik: { przed, po, ostrz } };
}

/**
 * Natywne Undo ruchu (§5.3): ruchy z tej zmiany tury (`zt`), których id nie ma już w historii tokenu, są cofnięte —
 * w swoim pierwotnym kontekście. Ruchy z wcześniejszych tur (historia wyczyszczona przez rdzeń) zostają.
 * @param {Ledger} ledger
 * @param {Set<string>|string[]} wHistorii  id ruchów obecnych w historii po Undo
 * @param {string} zt  klucz bieżącej zmiany tury walki
 * @returns {string[]} id cofniętych ruchów
 */
export function cofnijRuchy(ledger, wHistorii, zt) {
  const zostaje = new Set(wHistorii);
  const cofniete = [];
  for (const r of ledger.ruchy) {
    if (r.cofniety || r.zt !== zt || zostaje.has(r.id)) continue;
    r.cofniety = true;
    cofniete.push(r.id);
  }
  if (cofniete.length) ledger.rev += 1;
  return cofniete;
}

/* -------------------------------------------- */
/*  Opisy                                        */
/* -------------------------------------------- */

/** „1/1”, „0/1”, „−1/1” — pozostałe/pojemność (D6). */
export function licznik(p) {
  const n = _zaokr(p.pozostalo);
  return `${n < 0 ? "−" + Math.abs(n) : n}/${p.pojemnosc}`;
}

/** Metry po polsku: „4,5”. */
export function metry(n) {
  const v = _zaokr(n);
  return `${v < 0 ? "−" : ""}${String(Math.abs(v)).replace(".", ",")}`;
}

/* -------------------------------------------- */
/*  Deklaracje akcji (paleta Ruch, karta, makro) */
/* -------------------------------------------- */

/**
 * Akcje z deklaracją (s. 26, 29–30, 37). `koszt` — zwykły wariant (we własnej turze; poza nią wykonanie wyczekanej
 * akcji idzie w R — §6.4). `grant` — rodzaj grantu ruchu z `grantDeklaracji`. `status` — stan nakładany raz przy
 * wykonaniu (skutek, nie projekcja: MG może go potem zdjąć). `ruch` — koszt bez przemieszczenia.
 */
export const DEKLARACJE = Object.freeze({
  przyspieszenie: Object.freeze({ id: "przyspieszenie", nazwa: "Przyspieszenie", koszt: { A: 1 }, grant: "przyspieszenie", strona: "s. 29", bezPowalenia: true }),
  bieganie: Object.freeze({ id: "bieganie", nazwa: "Bieganie", koszt: { A: 1 }, grant: "bieganie", status: "bieganie", strona: "s. 30", bezPowalenia: true }),
  unikanie: Object.freeze({ id: "unikanie", nazwa: "Unikanie", koszt: { A: 1 }, status: "dodging", strona: "s. 30" }),
  odstapienie: Object.freeze({ id: "odstapienie", nazwa: "Odstąpienie", koszt: { A: 1 }, strona: "s. 30" }),
  padnij: Object.freeze({ id: "padnij", nazwa: "Padnij", koszt: {}, ruch: "reszta", status: "prone", strona: "s. 26", tylkoWlasna: true }),
  powstan: Object.freeze({ id: "powstan", nazwa: "Powstań", koszt: {}, ruch: "polowa", zdejmij: "prone", strona: "s. 37" })
});

/**
 * Żądanie zapisu deklaracji — czysto, z budżetu i Szybkości w chwili wykonania (D14). Poza własną turą: wykonanie
 * w Reakcji (R zamiast A, nowe wykonanie reakcji z wyłącznie świeżym grantem — D30, §6.4).
 * @param {string} id  klucz `DEKLARACJE`
 * @param {object} l   ledger
 * @param {Chwila} ch
 * @param {{szybkosci: Record<string, number>, stany?: Iterable<string>}} aktor
 * @param {{tryb?: string, koszt?: object|null, zrodlo?: string|null, bezPadnijPowstan?: boolean, wReakcji?: boolean}} [o]
 * @returns {{zadanie: object, ostrz: string[]}|null}
 */
export function zadanieDeklaracji(id, l, ch, aktor, { tryb = "walk", koszt = null, zrodlo = null, bezPadnijPowstan = false, wReakcji = false } = {}) {
  const def = DEKLARACJE[id];
  if (!def) return null;
  const stany = new Set(aktor.stany ?? []);
  const ostrz = [];
  // Poza własną turą albo uzbrojona Reakcja we własnej (wyzwalacz w twojej turze, §6.4) — wykonanie w R.
  const wR = (!ch.wlasna || wReakcji) && Object.keys(def.koszt).length > 0;
  // Reakcja już otwarta (Reaguj → wykonanie przygotowania) bez akcji: ta deklaracja jest jej treścią — bez drugiej R.
  const trwa = wR ? reakcjaBezAkcji(l, ch) : null;
  const z = { rodzaj: "akcja", zrodlo: zrodlo ?? def.nazwa, koszt: wR ? (trwa ? {} : { R: 1 }) : { ...(koszt ?? def.koszt) }, deklaracja: id };
  if (wR && !trwa) {
    z.reakcjaStart = `r-${Math.random().toString(36).slice(2, 10)}`;
    // Wyczekana akcja wykonana tym przyciskiem: przygotowanie zużyte (jedna R na wykonanie, §6.4).
    const p = aktywnePrzygotowania(l, ch)[0];
    if (p) z.wykonaj = p.id;
  }
  if (def.bezPowalenia && stany.has("prone")) ostrz.push(`${def.nazwa}: nie przy Powaleniu (${def.strona}).`);
  if (def.grant) {
    const g = grantDeklaracji(def.grant, aktor.szybkosci, tryb);
    if (g) z.grant = { typ: "ruch", ile: g.ile, tryb: g.tryb, deklaracja: id, szybkosc: Number(aktor.szybkosci?.[g.tryb]) || 0 };
    else ostrz.push(`${def.nazwa}: brak Szybkości dla wybranego trybu.`);
  }
  if (def.ruch === "reszta") {
    if (!ch.wlasna) ostrz.push(`${def.nazwa}: tylko we własnej turze (${def.strona}).`);
    const b = budzetRuchu(l, ch, { szybkosci: aktor.szybkosci, tryb: "walk" });
    if ((Number(aktor.szybkosci?.walk) || 0) <= 0) ostrz.push(`${def.nazwa}: nie przy Szybkości 0 (${def.strona}).`);
    z.ruch = Math.max(0, b.pozostalo);
  } else if (def.ruch === "polowa") {
    z.ruch = bezPadnijPowstan ? 0 : _zaokr((Number(aktor.szybkosci?.walk) || 0) / 2);
  }
  if (def.status) z.status = def.status;
  if (def.zdejmij) z.zdejmij = def.zdejmij;
  z.ostrz = ostrz;
  return { zadanie: z, ostrz };
}

/**
 * Koszt ruchu bez przemieszczenia zgłoszony przez inny moduł (§4.4: wsiadanie, zsiadanie, przesiadka M4) — pobierany
 * raz, w kontekście chwili, bez powtórnego liczenia przesadzenia żetonu (to `displace`). `reszta` — „zużywasz resztę
 * swojej Szybkości” (kierowca, s. 260): koszt to co najmniej `ile`, a gdy zostało więcej — cała reszta.
 * @param {object} l
 * @param {Chwila} ch
 * @param {{szybkosci?: Record<string, number>, wkk?: object}} aktor
 * @param {{ile?: number, reszta?: boolean, zrodlo?: string, ostrz?: string[]}} [o]
 * @returns {{zadanie: object, ostrz: string[]}}
 */
export function zadanieKosztuRuchu(l, ch, aktor = {}, { ile = 0, reszta = false, zrodlo = "Ruch", ostrz = [] } = {}) {
  const n = Math.max(0, _zaokr(ile));
  const b = budzetRuchu(l, ch, { szybkosci: aktor.szybkosci, tryb: "walk", ...(aktor.wkk ? { wkk: aktor.wkk } : {}) });
  const zostalo = Math.max(0, b.pozostalo);
  const ruch = reszta ? Math.max(n, zostalo) : n;
  const o = [...ostrz];
  if (b.dostepny && !b.reczne.length && ruch > zostalo + 0.001) o.push(`${zrodlo}: ${metry(ruch)} m przy ${metry(b.pozostalo)} m pozostałego ruchu.`);
  return { zadanie: { rodzaj: "ruch", zrodlo, koszt: {}, ruch, ostrz: o }, ostrz: o };
}

/* -------------------------------------------- */
/*  Wyczekanie i Reakcja (§6.4)                  */
/* -------------------------------------------- */

/**
 * Wyczekanie [A] (s. 30): przygotowanie z opcjonalną notatką i preferowaną czynnością — bez edytora warunku i bez
 * zatwierdzania przez MG (D21). Zaprogramowana akcja nie wykonuje się teraz.
 * @param {Chwila} ch
 * @param {{opis?: string, akcja?: string|null}} [o]
 */
export function zadanieWyczekania(ch, { opis = "", akcja = null } = {}) {
  const ostrz = ch.wlasna ? [] : ["Wyczekanie przygotowuje się we własnej turze (s. 30)."];
  return { zadanie: { rodzaj: "akcja", zrodlo: "Wyczekanie", koszt: { A: 1 }, przygotowanie: { opis, akcja }, ostrz }, ostrz };
}

/**
 * Reakcja (R): wykonanie przygotowania albo reakcja zagrana słownie. Wykonanie otwiera kontekst reakcji (ruch w nim —
 * tylko świeże granty, D30); słowna od razu się kończy. Samo „uzbrojenie” nie jest zapisem (klient, bez kosztu).
 * @param {object} l
 * @param {Chwila} ch
 * @param {{przygotowanie?: string|null, slowna?: boolean, zrodlo?: string|null}} [o]
 */
export function zadanieReakcji(l, ch, { przygotowanie = null, slowna = false, zrodlo = null } = {}) {
  const id = `r-${Math.random().toString(36).slice(2, 10)}`;
  const p = przygotowanie ? (l?.przygotowania ?? []).find(x => x.id === przygotowanie) : null;
  const z = { rodzaj: "akcja", koszt: { R: 1 }, reakcjaStart: id,
    zrodlo: zrodlo ?? (slowna ? "Reakcja (słownie)" : p ? `Wyczekanie — wykonanie${p.opis ? `: ${p.opis}` : ""}` : "Reakcja") };
  if (p) z.wykonaj = p.id;
  if (slowna) z.reakcjaKoniec = id;
  const ostrz = [];
  if (p && p.wykonana) ostrz.push("To przygotowanie już wykonano.");
  if (p && p.cykl !== ch.cykl) ostrz.push("Przygotowanie wygasło z początkiem twojej tury (s. 30).");
  z.ostrz = ostrz;
  return { zadanie: z, ostrz };
}

/**
 * Operacja wykonana w Reakcji (użycie przedmiotu, atak, Pomaganie poza własną turą — §6.4: R zamiast następnej A).
 * Reakcja otwarta bez akcji (Reaguj → wykonanie przygotowania) — dołącz do niej bez drugiej R; inaczej nowa R z nowym
 * wykonaniem reakcji i, gdy jest, zużyciem przygotowania Wyczekania.
 * @param {object} l
 * @param {Chwila} ch
 * @param {{zrodlo: string, cel?: string|null, tresc?: string}} o  `tresc` — co wykonano (znacznik „reakcja ma akcję”)
 */
export function zadanieWReakcji(l, ch, { zrodlo, cel = null, tresc = "akcja" } = {}) {
  const trwa = reakcjaBezAkcji(l, ch);
  const z = { rodzaj: "akcja", zrodlo, deklaracja: tresc, koszt: trwa ? {} : { R: 1 } };
  if (cel) z.cel = cel;
  if (!trwa) {
    z.reakcjaStart = `r-${Math.random().toString(36).slice(2, 10)}`;
    const p = aktywnePrzygotowania(l, ch)[0];
    if (p) z.wykonaj = p.id;
  }
  return z;
}

/* -------------------------------------------- */
/*  Atakowanie: instancje, źródła, domyślny wybór (§7.1–§7.2) */
/* -------------------------------------------- */

/**
 * Typy aktywności z Testem Ataku, których koszt zapisuje się przy rzucie (opakowanie `buildEvaluate`), nie przy
 * `postUseActivity`: zwykły atak, Dublet (jeden Test Ataku za dwa pociski, s. 118 — zwykły atak w slocie) i krótka
 * seria (osobna [A] albo, z Gradem ołowiu, atak w slocie Atakowania). DS/MS/OZ to rzuty obronne celów — [A] przy użyciu.
 */
export const AKTYWNOSCI_ATAKU = Object.freeze(["attack", "neuroKs", "neuroDublet"]);

/**
 * Otwarta instancja Atakowania we własnej turze tego cyklu z wolnym slotem — najnowsza (D22: inna opłacona A w środku
 * nie zamyka instancji). Reakcja nie kontynuuje Atakowania z tury (Drugi atak tylko we własnej turze, §6.4).
 */
export function otwartaInstancja(ledger, chwila) {
  if (!chwila?.wlasna || chwila.reakcja) return null;
  return [...(ledger?.ataki ?? [])].reverse().find(a => a.cykl === chwila.cykl && a.uzyte < a.sloty) ?? null;
}

/**
 * Możliwości „Sposób ataku” dla tej próby — tylko właściwe (§7.2): kontynuacja otwartej A, nowa A, posiadane źródła B
 * pasujące do rodzaju ataku (z wynikiem weryfikacji), R poza własną turą albo przy uzbrojonej Reakcji.
 * @param {object} l
 * @param {Chwila} ch
 * @param {{sloty?: number, wReakcji?: boolean, zrodlaB?: {id: string, label: string, zweryfikowane: boolean, ostrz?: string[]}[],
 *   oplacone?: {label: string}|null, calaAkcja?: string|null}} o  `oplacone` — atak, którego koszt zapłaciła już
 *   aktywność [B] albo zdolność; `calaAkcja` — tryb całej akcji (krótka seria bez Gradu ołowiu, §7.1 pkt 3): osobna A poza
 *   slotami Atakowania, bez kontynuacji i bez źródeł B
 * @returns {{id: string, rodzaj: "oplacone"|"kontynuacja"|"nowaA"|"calaA"|"B"|"R", label: string, zweryfikowane: boolean, ostrz: string[]}[]}
 */
export function zrodlaAtaku(l, ch, { sloty = 1, wReakcji = false, zrodlaB = [], oplacone = null, calaAkcja = null } = {}) {
  const out = [];
  if (oplacone) out.push({ id: "oplacone", rodzaj: "oplacone", label: `${oplacone.label} — koszt już zapłacony`, zweryfikowane: true, ostrz: [] });
  const r = wReakcji || !ch.wlasna;
  if (r) out.push({ id: "R", rodzaj: "R", label: "W Reakcji [R]", zweryfikowane: true, ostrz: [] });
  if (calaAkcja) {
    if (!r) out.push({ id: "calaA", rodzaj: "calaA", label: `${calaAkcja} [A] — osobna Akcja`, zweryfikowane: true, ostrz: [] });
    return out;
  }
  const inst = r ? null : otwartaInstancja(l, ch);
  if (inst) {
    out.push({ id: "kontynuacja", rodzaj: "kontynuacja", label: `Atakowanie — atak ${inst.uzyte + 1}/${inst.sloty} (ta sama Akcja)`,
      zweryfikowane: true, ostrz: [] });
  }
  out.push({ id: "nowaA", rodzaj: "nowaA", label: `Nowe Atakowanie [A]${sloty > 1 ? ` — ${sloty} ataki` : ""}`, zweryfikowane: true, ostrz: [] });
  for (const b of zrodlaB) {
    out.push({ id: `B:${b.id}`, rodzaj: "B", label: `${b.label} [B]`, zweryfikowane: !!b.zweryfikowane, ostrz: [...(b.ostrz ?? [])] });
  }
  return out;
}

/** Kolejność preferencji zweryfikowanych źródeł B przy wyborze domyślnym (§7.2 pkt 4, D13): Nożownik przed resztą. */
const PREFEROWANE_B = ["B:nozownik"];

/**
 * Domyślny sposób ataku — ten sam w pełnym oknie i w szybkim rzucie (§7.2):
 *   1. jawny zamiar skrótu (przycisk B pod kartą) albo kontekst R;
 *   2. kontynuacja otwartej A z wolnym slotem — także gdy licznik A pokazuje 0/1;
 *   3. nowa nieograniczona A, gdy jest;
 *   4. zweryfikowane B mieszczące cały koszt (z dodatkami, np. Przycelowaniem) — Nożownik przed innymi;
 *   5. inaczej nowa A z ostrzeżeniem (nie podstawiamy niedozwolonego B, żeby ukryć przekroczenie).
 * @param {object[]} opcje  z `zrodlaAtaku`
 * @param {{jawne?: string|null, pule: object, dodatkiB?: number}} o
 */
export function domyslneZrodlo(opcje, { jawne = null, pule: p, dodatkiB = 0 } = {}) {
  const ma = id => opcje.find(o => o.id === id);
  if (jawne && ma(jawne)) return jawne;
  if (ma("oplacone")) return "oplacone";
  if (ma("R")) return "R";
  if (ma("calaA")) return "calaA";
  if (ma("kontynuacja")) return "kontynuacja";
  if ((p?.A?.pozostalo ?? 1) > 0 && !p?.A?.zakaz) return "nowaA";
  const b = opcje.filter(o => o.rodzaj === "B" && o.zweryfikowane);
  b.sort((x, y) => (PREFEROWANE_B.includes(y.id) ? 1 : 0) - (PREFEROWANE_B.includes(x.id) ? 1 : 0));
  if (b.length && (p?.B?.pozostalo ?? 1) >= 1 + dodatkiB && !p?.B?.zakaz) return b[0].id;
  return "nowaA";
}

/**
 * Żądanie zapisu próby ataku z wybranym sposobem (§7.4: źródło i dodatki to niezależne składowe, łączny koszt).
 * @param {object} l
 * @param {Chwila} ch
 * @param {{opcja: string, sloty?: number, label?: string, dodatkiB?: number, bron?: string}} o
 *   `dodatkiB` — nowe dodatki płatne B w tej samej próbie (Przycelowanie wybrane w oknie)
 */
export function zadanieAtaku(l, ch, { opcja, sloty = 1, label = null, dodatkiB = 0, bron = "" } = {}) {
  const co = bron ? ` (${bron})` : "";
  const plusB = n => (n > 0 ? { B: n } : {});
  if (opcja === "R") {
    const z = zadanieWReakcji(l, ch, { zrodlo: `Atak${co} (w Reakcji)`, tresc: "atak" });
    if (dodatkiB > 0) z.koszt = { ...z.koszt, B: dodatkiB };
    z.atak = { zrodlo: "R" };
    return z;
  }
  if (opcja === "oplacone") return { rodzaj: "akcja", zrodlo: `${label ?? "Atak"}${co}`, koszt: plusB(dodatkiB), atak: { zrodlo: "oplacone" } };
  if (opcja === "kontynuacja") {
    const inst = otwartaInstancja(l, ch);
    if (inst) return { rodzaj: "akcja", zrodlo: `Atakowanie${co} — atak ${inst.uzyte + 1}/${inst.sloty}`, koszt: plusB(dodatkiB), atak: { instancja: inst.id } };
  }
  if (String(opcja).startsWith("B:")) {
    return { rodzaj: "akcja", zrodlo: `${label ?? opcja.slice(2)}${co}`, koszt: { B: 1 + dodatkiB }, atak: { zrodlo: opcja } };
  }
  // Tryb całej akcji: A poza slotami, otwarta instancja Atakowania zostaje otwarta (D22).
  if (opcja === "calaA") return { rodzaj: "akcja", zrodlo: `${label ?? "Seria"}${co}`, koszt: { A: 1, ...plusB(dodatkiB) }, atak: { tryb: label ?? "seria" } };
  return { rodzaj: "akcja", zrodlo: `Atakowanie${co}`, koszt: { A: 1, ...plusB(dodatkiB) }, atak: { nowa: sloty } };
}

/* -------------------------------------------- */
/*  Korekta próby ataku po fakcie (§7.1)         */
/* -------------------------------------------- */

/** Bazowy koszt przydziału próby (bez dodatków, np. Przycelowania): A za otwarcie instancji / tryb całej akcji, B za źródło B. */
function _bazaPrzydzialu(ledger, o) {
  const a = o?.atak ?? {};
  if (a.instancja) return ledger.ataki.find(x => x.id === a.instancja)?.op === (a.korekta ?? o.id) && a.slot === 1 ? { A: 1 } : {};
  if (a.tryb) return { A: 1 };
  if (String(a.zrodlo ?? "").startsWith("B:")) return { B: 1 };
  if (a.zrodlo === "R") return { R: Number(o.koszt?.R) || 0 };
  return {};
}

/**
 * Możliwe przydziały próby ataku przy korekcie: kontynuacja najnowszej otwartej instancji tego cyklu (nie tej, którą
 * otworzyła sama próba), nowe Atakowanie, posiadane źródła B, „bez kosztu”. Obecny przydział jest oznaczony.
 * @param {object} l
 * @param {string} opId  operacja próby (id żądania z karty ataku)
 * @param {{sloty?: number, zrodlaB?: {id: string, label: string}[]}} [o]
 * @returns {{ok: boolean, powod?: string, opcje?: {id: string, label: string, obecna: boolean}[]}}
 */
export function opcjeKorektyAtaku(l, opId, { sloty = 1, zrodlaB = [] } = {}) {
  const o = l?.ops?.find(x => x.id === opId);
  if (!o?.atak) return { ok: false, powod: "Tej próby nie ma już w zapisie tury (inna walka albo dawna runda)." };
  const wlasna = o.atak.instancja ? l.ataki.find(x => x.id === o.atak.instancja) : null;
  if (wlasna && wlasna.op === (o.atak.korekta ?? o.id) && o.atak.slot === 1 && wlasna.uzyte > 1) {
    return { ok: false, powod: "Ta próba otworzyła Atakowanie, które kontynuowały kolejne ataki — popraw najpierw je." };
  }
  const obecna = o.atak.instancja ? (_bazaPrzydzialu(l, o).A ? "nowaA" : "kontynuacja")
    : o.atak.tryb ? "calaA" : o.atak.zrodlo === "R" ? "R" : String(o.atak.zrodlo ?? "brak");
  const out = [];
  const inna = [...l.ataki].reverse().find(a => a.cykl === o.cykl && a.id !== wlasna?.id && a.uzyte < a.sloty);
  // `krotko` — opis na karcie po korekcie (plakietka), `label` — pełny opis w oknie wyboru.
  if (inna) {
    out.push({ id: `kontynuacja:${inna.id}`, label: `Kontynuacja Atakowania — atak ${inna.uzyte + 1}/${inna.sloty} (bez nowej A)`,
      krotko: "Atakowanie", obecna: false, slot: inna.uzyte + 1 });
  }
  if (obecna === "kontynuacja") {
    out.push({ id: "kontynuacja", label: "Kontynuacja Atakowania (bez zmian)", krotko: "Atakowanie", obecna: true, slot: o.atak.slot ?? null });
  }
  out.push({ id: "nowaA", label: `Nowe Atakowanie [A]${sloty > 1 ? ` — ${sloty} ataki` : ""}`, krotko: "Nowe Atakowanie [A]", obecna: obecna === "nowaA", slot: 1 });
  for (const b of zrodlaB) out.push({ id: `B:${b.id}`, label: `${b.label} [B]`, krotko: `${b.label} [B]`, obecna: obecna === `B:${b.id}`, slot: null });
  out.push({ id: "brak", label: "Bez kosztu (pomyłka, akcja słowna albo już opłacona)", krotko: "Bez kosztu", obecna: obecna === "brak" || obecna === "oplacone", slot: null });
  if (!out.some(x => x.obecna)) {
    out.unshift({ id: obecna, label: `Bez zmian (${obecna === "R" ? "W Reakcji [R]" : obecna === "calaA" ? "osobna Akcja" : obecna})`, obecna: true, slot: null });
  }
  return { ok: true, opcje: out };
}

/**
 * Żądanie korekty przydziału próby (§7.1: „tania korekta instancji/źródła”): różnica bazowego kosztu i przepięcie slotu.
 * Dodatki tej próby (Przycelowanie) zostają. Zwraca `null`, gdy nic się nie zmienia albo próby nie da się poprawić.
 * @param {object} l
 * @param {string} opId
 * @param {string} na  `kontynuacja:<instancja>` | `nowaA` | `B:<id>` | `brak`
 * @param {{sloty?: number, label?: string, kto?: string}} [o]
 */
export function zadanieKorektyAtaku(l, opId, na, { sloty = 1, label = null, kto = null } = {}) {
  const o = l?.ops?.find(x => x.id === opId);
  if (!o?.atak || !opcjeKorektyAtaku(l, opId).ok) return null;
  const stara = _bazaPrzydzialu(l, o);
  let przydzial;
  let nowa = {};
  if (String(na).startsWith("kontynuacja:")) przydzial = { instancja: na.slice("kontynuacja:".length) };
  else if (na === "nowaA") { przydzial = { nowa: sloty }; nowa = { A: 1 }; }
  else if (String(na).startsWith("B:")) { przydzial = { zrodlo: na }; nowa = { B: 1 }; }
  else if (na === "brak") przydzial = { brak: true };
  else return null;
  const koszt = {};
  for (const k of RODZAJE) {
    const d = (Number(nowa[k]) || 0) - (Number(stara[k]) || 0);
    if (d) koszt[k] = d;
  }
  return { rodzaj: "korekta", zrodlo: "Korekta ataku", powod: `${o.zrodlo} → ${label ?? na}`, koszt, kto, atakKorekta: { op: opId, przydzial } };
}

/** Zastosowanie `atakKorekta` w `zastosuj`: zwolnienie starego slotu, nowy przydział próby (instancja ma `op` korekty). */
function _zastosujKorekteAtaku(ledger, op, k, cykl) {
  const o = ledger.ops.find(x => x.id === k.op);
  if (!o?.atak) return;
  if (o.atak.instancja) {
    const a = ledger.ataki.find(x => x.id === o.atak.instancja);
    if (a) {
      a.uzyte = Math.max(0, a.uzyte - 1);
      if (a.uzyte === 0) ledger.ataki = ledger.ataki.filter(x => x !== a);
    }
  }
  const p = k.przydzial ?? {};
  if (p.nowa) {
    const id = `${op.id}-a`;
    ledger.ataki.push({ id, cykl: o.cykl ?? cykl, op: op.id, sloty: Math.max(1, Number(p.nowa) || 1), uzyte: 1 });
    o.atak = { instancja: id, slot: 1, korekta: op.id };
  } else if (p.instancja) {
    const a = ledger.ataki.find(x => x.id === p.instancja);
    if (a) {
      a.uzyte += 1;
      o.atak = { instancja: a.id, slot: a.uzyte, korekta: op.id };
    } else o.atak = { brak: true, korekta: op.id };
  } else if (p.zrodlo) o.atak = { zrodlo: String(p.zrodlo), korekta: op.id };
  else o.atak = { brak: true, korekta: op.id };
  op.atakKorekta = { op: o.id };
}

/* -------------------------------------------- */
/*  Serie: raz w rundzie (NOE s. 119–120, T39)   */
/* -------------------------------------------- */

const SERIE = Object.freeze({ ks: "krótka seria", ds: "długa seria", ms: "miażdżąca seria" });
/** Miejscownik — „po krótkiej serii”. */
const SERIE_PO = Object.freeze({ ks: "krótkiej serii", ds: "długiej serii", ms: "miażdżącej serii" });
const _wielka = s => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Serie tej rundy z zapisu: aktora `{combatId, round, tryby}` albo dawnego zapisu na broni `{combatId, round, mode, uses}`.
 * Inna walka albo runda — pusto.
 * @param {object|null|undefined} zapis
 * @param {{combatId: string|null, round: number|null}} stempel
 * @returns {Record<string, number>}
 */
export function historiaSerii(zapis, { combatId, round }) {
  if (!zapis || !combatId || zapis.combatId !== combatId || zapis.round !== round) return {};
  if (zapis.tryby) return { ...zapis.tryby };
  return zapis.mode ? { [zapis.mode]: Math.max(1, Number(zapis.uses) || 1) } : {};
}

/**
 * Naruszenie „raz w rundzie” dla serii `mode` przy dotychczasowych seriach rundy — ostrzeżenie, nie blokada (T39).
 * KS, DS i MS wzajemnie się wykluczają w rundzie; każda raz w rundzie; Grad ołowiu zdejmuje tylko limit KS po KS.
 * @param {Record<string, number>} tryby
 * @param {string} mode  `ks` | `ds` | `ms` (inne tryby nie mają limitu rundy)
 * @param {{grad?: boolean}} [o]
 * @returns {string|null}
 */
export function naruszenieSerii(tryby, mode, { grad = false } = {}) {
  if (!SERIE[mode]) return null;
  const inna = Object.keys(SERIE).find(k => k !== mode && (tryby?.[k] ?? 0) > 0);
  if (inna) return `${_wielka(SERIE[mode])} po ${SERIE_PO[inna]} w tej samej rundzie — w rundzie tylko jeden rodzaj serii (NOE s. 119–120).`;
  if ((tryby?.[mode] ?? 0) > 0 && !(mode === "ks" && grad)) return `${_wielka(SERIE[mode])} drugi raz w tej rundzie — raz w rundzie (NOE s. 119–120).`;
  return null;
}
