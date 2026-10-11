/**
 * Neuroshima 5e — handel: czyste zasady (PLAN_m5_postoj.md §7.1, E0).
 *
 * Czysty: bez `game`, bez `CONFIG`, bez dokumentów. Warstwa Foundry (Cennik MG, stół wymiany, punkt
 * handlowy, zamówienie) czyta stąd liczby i rozkłady; dane — `config/handel-data.mjs`; WKK —
 * `wkk/config/handel-kobalt.mjs` (tylko przy `{ kobalt: true }`).
 *
 * ## Reguły
 *
 *   - **Cena tutaj** (U2): podręcznikowa → profil świata (Kolory, po becie) → region (kolumna wg D8, D31) →
 *     stan (zepsuty ½, s. 132) → skup (sprzedaż handlarzowi, D3) → korekta MG. Każdy etap zostawia linię w
 *     rozkładzie — dymek MG.
 *   - **Dostępność tutaj** (U2, s. 43): katalog (nasadki D32) → profil świata → lokalizacja → przycięcie
 *     0–100. Zamówienie dokłada CHA (odejmowaną od k100) i zdolności (+5 Gambling we krwi); generator listy —
 *     nie (D29). Dostępność 0 w katalogu znaczy „nie ma w handlu” i żaden rzut tego nie zmienia.
 *   - **Zamówienie specjalne** (s. 43, U44): k100 − CHA ≤ próg — ktoś ma; opis jawny dla gracza.
 *   - **Ilość** (s. 43, U5), **godziny gamblingu i RO** (s. 44, U6), **wycena oferty** (U9), **waluta
 *     lokalna** (U41, D39), **generator towaru** (D29) z własnością: szansa na liście ≤ dostępność tutaj <
 *     szansa zamówienia.
 */

import {
  LOKALIZACJE, REGIONY, KATEGORIE_CEN, KATEGORIA_CENOWA, KATEGORIA_CENOWA_SUROWCA, KATEGORIE_AMUNICJI, ILOSC,
  STAN, SKUP_NOE, GRUPY_TOWARU, PODSTAWY, UDZIAL_GLOWNYCH, GAMBLING_WE_KRWI, WALUTA_POZA_REGIONEM
} from "./handel-data.mjs";
import { ADDON_DEFS, rodzajUlepszenia, dostepnoscNasadki } from "./addons-data.mjs";
import { SKUP_KOBALT } from "../wkk/config/handel-kobalt.mjs";
import { DOSTEPNOSC_KOBALT } from "../wkk/config/dostepnosc-kobalt.mjs";
import { kosc, rzucKosci, wybierzBezZwracania } from "./losowanie.mjs";

const _r2 = v => Math.round(v * 100) / 100;
const _pct = m => `${Math.round(m * 100)}%`;

/** „12,5 gb” — polski przecinek, do dwóch miejsc. */
export function fmtGb(v) {
  return `${String(_r2(Number(v) || 0)).replace(".", ",")} gb`;
}

/* -------------------------------------------- */
/*  Kategorie                                    */
/* -------------------------------------------- */

/** Definicja ulepszenia dla wpisu `addon:<id>` albo `null`. */
function _ulepszenie(wpis) {
  const ref = String(wpis?.ref ?? "");
  return ref.startsWith("addon:") ? ADDON_DEFS[ref.slice("addon:".length)] ?? null : null;
}

/**
 * Kolumna cen regionalnych dla wpisu katalogu (D8, D31) albo `null` (bez mnożnika).
 * Wpis może też być surowcem (`{ surowiec: "CH" }`) albo przeróbką-usługą (`{ usluga: true }`).
 * @param {object} wpis  wpis `KATALOG` albo `{ kategoria, ref, tagi, surowiec }`
 * @param {{kobalt?: boolean}} [o]
 * @returns {keyof KATEGORIE_CEN|null}
 */
export function kategoriaCenowa(wpis, { kobalt = false } = {}) {
  if (!wpis) return null;
  if (wpis.surowiec) return KATEGORIA_CENOWA_SUROWCA[wpis.surowiec] ?? null;
  if (wpis.usluga) return "uslugi";
  if ((wpis.tagi ?? []).includes("paliwo")) return "paliwo";
  const def = _ulepszenie(wpis);
  if (def) {
    if (rodzajUlepszenia(def, { kobalt }) === "przerobka") return "uslugi";
    return ["optyka", "elektronika"].includes(wpis.kategoria) ? "elektronika" : "bron";
  }
  return KATEGORIA_CENOWA[wpis.kategoria] ?? null;
}

/**
 * Grupa towaru punktu handlowego (`GRUPY_TOWARU`) dla wpisu; ulepszenia zawsze w `ulepszenia`.
 * @returns {string|null}
 */
export function grupaTowaru(wpis) {
  if (!wpis) return null;
  if (String(wpis.ref ?? "").startsWith("addon:")) return "ulepszenia";
  for (const [id, g] of Object.entries(GRUPY_TOWARU)) if (g.kat.includes(wpis.kategoria)) return id;
  return null;
}

/* -------------------------------------------- */
/*  Cena                                         */
/* -------------------------------------------- */

/**
 * Mnożnik regionu dla kolumny. Region nieznany albo „—” — 1.
 * @returns {number}
 */
export function mnoznikRegionu(region, kolumna) {
  const r = REGIONY[region];
  if (!r || !kolumna) return 1;
  return r[kolumna] / 100;
}

/** Skup domyślny warstwy: NOE 100%, WKK 50% (D3). */
export function skupDomyslny({ kobalt = false } = {}) {
  return kobalt ? SKUP_KOBALT : SKUP_NOE;
}

/**
 * Cena tutaj (U2). Bez `skup` — cena, po której handlarz sprzedaje; ze `skup` — po której kupuje od gracza.
 * @param {object} wpis  wpis katalogu albo `{ cena, kategoria, ref, tagi, surowiec }`
 * @param {object} [o]
 * @param {string} [o.region]               klucz `REGIONY`
 * @param {"sprawny"|"zepsuty"} [o.stan]
 * @param {number|null} [o.skup]            mnożnik skupu (0–…); `null` — sprzedaż handlarza
 * @param {{cena?: number}} [o.profil]      profil świata (Kolory, po becie)
 * @param {number} [o.korekta]              mnożnik MG (Wpływanie, zniżka)
 * @param {boolean} [o.kobalt]
 * @param {number} [o.cena]                 cena bazowa zamiast `wpis.cena` (przedmiot spoza katalogu)
 * @returns {{cena: number, bazowa: number, kolumna: string|null, rozklad: {etap: string, opis: string, mnoznik: number, wartosc: number}[]}}
 */
export function cenaTutaj(wpis, { region = null, stan = "sprawny", skup = null, profil = null, korekta = 1, kobalt = false, cena } = {}) {
  const bazowa = Number(cena ?? wpis?.cena) || 0;
  const rozklad = [{ etap: "podrecznik", opis: "cena podręcznikowa", mnoznik: 1, wartosc: _r2(bazowa) }];
  let v = bazowa;
  const krok = (etap, opis, m) => {
    if (m === 1) return;
    v *= m;
    rozklad.push({ etap, opis, mnoznik: m, wartosc: _r2(v) });
  };
  krok("profil", "profil świata", Number(profil?.cena ?? 1));
  const kolumna = kategoriaCenowa(wpis, { kobalt });
  if (region && REGIONY[region]) {
    krok("region", `${REGIONY[region].label} — ${kolumna ? KATEGORIE_CEN[kolumna] : "bez kategorii"} ${_pct(mnoznikRegionu(region, kolumna))}`, mnoznikRegionu(region, kolumna));
  }
  krok("stan", STAN[stan]?.label ?? stan, STAN[stan]?.mnoznik ?? 1);
  if (skup !== null && skup !== undefined) krok("skup", `skup ${_pct(skup)}`, Number(skup));
  krok("korekta", "korekta MG", Number(korekta) || 1);
  return { cena: _r2(v), bazowa: _r2(bazowa), kolumna, rozklad };
}

/* -------------------------------------------- */
/*  Dostępność                                   */
/* -------------------------------------------- */

/**
 * Dostępność bazowa wpisu (procent) albo `null` — z powodem (usługa, tylko produkcja, brak w RAW).
 * Kobalt: tabela WKK (`DOSTEPNOSC_KOBALT`) i nasadki WKK (Osełka, D41).
 * @returns {{dostepnosc: number|null, powod: string|null}}
 */
export function dostepnoscBazowa(wpis, { kobalt = false } = {}) {
  if (!wpis) return { dostepnosc: null, powod: "brak wpisu" };
  if (kobalt && Number.isFinite(DOSTEPNOSC_KOBALT[wpis.ref])) return { dostepnosc: DOSTEPNOSC_KOBALT[wpis.ref], powod: null };
  const def = _ulepszenie(wpis);
  if (def) {
    const d = dostepnoscNasadki(def, { kobalt });
    return d === null ? { dostepnosc: null, powod: "przeróbka — usługa fachowca" } : { dostepnosc: d, powod: null };
  }
  if (wpis.dostepnosc !== null && wpis.dostepnosc !== undefined && Number.isFinite(Number(wpis.dostepnosc))) {
    return { dostepnosc: Number(wpis.dostepnosc), powod: null };
  }
  if (wpis.kategoria === "uslugi" || wpis.wynik === "usluga") return { dostepnosc: null, powod: "usługa" };
  if (wpis.pochodzenie === "tabela") return { dostepnosc: null, powod: "tylko produkcja" };
  if (wpis.bezDostepnosci) return { dostepnosc: null, powod: wpis.bezDostepnosci };
  return { dostepnosc: null, powod: "wg MG" };
}

/**
 * Dostępność tutaj (U2): katalog → profil świata (×) → lokalizacja (+) → przycięcie 0–100 → premie
 * (zamówienie: Gambling we krwi). `prog: null` — wpisu nie ma w handlu (usługa, produkcja, wg MG).
 * @param {object} wpis
 * @param {object} [o]
 * @param {string} [o.rodzaj]               klucz `LOKALIZACJE`
 * @param {{wartosc: number, opis: string}[]} [o.premie]
 * @param {{dostepnosc?: number}} [o.profil]
 * @param {boolean} [o.kobalt]
 * @returns {{prog: number|null, bazowa: number|null, powod: string|null, rozklad: {etap: string, opis: string, wartosc: number}[]}}
 */
export function dostepnoscTutaj(wpis, { rodzaj = null, premie = [], profil = null, kobalt = false } = {}) {
  const { dostepnosc, powod } = dostepnoscBazowa(wpis, { kobalt });
  if (dostepnosc === null) return { prog: null, bazowa: null, powod, rozklad: [] };
  const rozklad = [{ etap: "katalog", opis: "dostępność z tabeli", wartosc: dostepnosc }];
  // 0% w tabeli: przedmiotu nie ma w handlu (amunicja Pogromcy) — ani lokalizacja, ani CHA tego nie zmienia.
  if (dostepnosc <= 0) return { prog: 0, bazowa: 0, powod: "nie ma w handlu", rozklad, nigdy: true };
  let v = dostepnosc;
  const m = Number(profil?.dostepnosc ?? 1);
  if (m !== 1) { v *= m; rozklad.push({ etap: "profil", opis: `profil świata ×${m}`, wartosc: Math.round(v) }); }
  const lok = LOKALIZACJE[rodzaj];
  if (lok && lok.modyfikator) {
    v += lok.modyfikator;
    rozklad.push({ etap: "lokalizacja", opis: `${lok.label} ${lok.modyfikator > 0 ? "+" : ""}${lok.modyfikator}`, wartosc: Math.round(v) });
  }
  const przyciete = Math.max(0, Math.min(100, Math.round(v)));
  if (przyciete !== Math.round(v)) rozklad.push({ etap: "przyciecie", opis: "przycięcie do 0–100", wartosc: przyciete });
  v = przyciete;
  for (const p of premie ?? []) {
    if (!p?.wartosc) continue;
    v += p.wartosc;
    rozklad.push({ etap: "premia", opis: p.opis, wartosc: v });
  }
  return { prog: v, bazowa: dostepnosc, powod: null, rozklad };
}

/** Premie zamówienia ze zdolności postaci (s. 63): Gambling we krwi +5. */
export function premieZamowienia({ gamblingWeKrwi = false } = {}) {
  return gamblingWeKrwi ? [{ wartosc: GAMBLING_WE_KRWI.premia, opis: `Gambling we krwi +${GAMBLING_WE_KRWI.premia}` }] : [];
}

/* -------------------------------------------- */
/*  Zamówienie specjalne                         */
/* -------------------------------------------- */

/**
 * Zamówienie (s. 43, U44): k100 minus **wartość** Charyzmy; wynik ≤ próg — ktoś ma.
 * @param {{k100: number, cha: number, prog: number|null, nigdy?: boolean, nazwa?: string, rozklad?: object[]}} o
 * @returns {{wynik: number, jest: boolean, opis: string}}
 */
export function wynikZamowienia({ k100, cha, prog, nigdy = false, nazwa = "" }) {
  const wynik = Number(k100) - Number(cha);
  const jest = !nigdy && prog !== null && wynik <= prog;
  const relacja = prog === null ? "—" : (wynik <= prog ? "≤" : ">");
  const co = nazwa ? `${nazwa}: ` : "";
  const opis = prog === null
    ? `${co}nie ma w handlu`
    : `${co}k100 ${k100} − CHA ${cha} = ${wynik} ${relacja} ${prog}${nigdy ? " (nie ma w handlu)" : ""} — ${jest ? "ktoś ma" : "nikt nie ma"}`;
  return { wynik, jest, opis };
}

/** Szansa zamówienia: P(k100 − CHA ≤ próg) = min(100, próg + CHA) / 100. */
export function szansaZamowienia(prog, cha, { nigdy = false } = {}) {
  if (nigdy || prog === null) return 0;
  return Math.max(0, Math.min(100, prog + cha)) / 100;
}

/* -------------------------------------------- */
/*  Ilość i limit transakcji                     */
/* -------------------------------------------- */

/** Reguła ilości u handlarza (s. 43, U5): `"1"`, `"2d4"` albo `"3d20"`. */
export function iloscRegula(wpis) {
  if (KATEGORIE_AMUNICJI.includes(wpis?.kategoria)) return ILOSC.amunicja;
  return wpis?.jednorazowy ? ILOSC.jednorazowy : ILOSC.wielorazowy;
}

/** Godziny gamblingu tej doby = ⌈transakcje ÷ PB⌉ (s. 44, U6). */
export function godzinyGamblingu({ transakcje, pb }) {
  const t = Math.max(0, Number(transakcje) || 0);
  const b = Math.max(1, Number(pb) || 1);
  return Math.ceil(t / b);
}

/**
 * Ile RO za kolejne godziny jeszcze trzeba: każda godzina po pierwszej — jeden RO (s. 44). Gambling we
 * krwi — nigdy (s. 63).
 */
export function potrzebaRO({ transakcje, pb, juzRzucone = 0, gamblingWeKrwi = false }) {
  if (gamblingWeKrwi) return 0;
  return Math.max(0, godzinyGamblingu({ transakcje, pb }) - 1 - (Number(juzRzucone) || 0));
}

/* -------------------------------------------- */
/*  Waluty lokalne i wycena oferty               */
/* -------------------------------------------- */

/**
 * Wartość waluty lokalnej (U41, D39): w swoim regionie pełna, poza nim `wartoscPoza` (domyślnie 0, pole MG).
 * @param {{cena: number, walutaLokalna?: {region: string}|null}} przedmiot
 * @returns {{wartosc: number, poza: boolean}}
 */
export function wartoscWalutyLokalnej(przedmiot, region, { wartoscPoza = WALUTA_POZA_REGIONEM } = {}) {
  const wl = przedmiot?.walutaLokalna;
  const cena = Number(przedmiot?.cena) || 0;
  if (!wl?.region) return { wartosc: cena, poza: false };
  if (wl.region === region) return { wartosc: cena, poza: false };
  return { wartosc: Number(wartoscPoza) || 0, poza: true };
}

/**
 * Wycena oferty (U9): suma podręcznikowa (dla gracza) i lokalna (dla MG). Pozycja: `{ wpis | cena,
 * kategoria, ilosc, stan, walutaLokalna }`. `skup` — oferta sprzedawana handlarzowi; bez — kupowana od niego.
 * @returns {{podrecznikowa: number, lokalna: number, linie: object[]}}
 */
export function wycenaOferty(pozycje, { region = null, skup = null, profil = null, korekta = 1, kobalt = false } = {}) {
  let podrecznikowa = 0;
  let lokalna = 0;
  const linie = [];
  for (const p of pozycje ?? []) {
    const ilosc = Math.max(0, Number(p.ilosc ?? 1));
    const wpis = p.wpis ?? p;
    const waluta = p.walutaLokalna ? wartoscWalutyLokalnej({ cena: p.cena ?? wpis.cena, walutaLokalna: p.walutaLokalna }, region, { wartoscPoza: p.wartoscPoza }) : null;
    const cena = waluta ? waluta.wartosc : Number(p.cena ?? wpis.cena) || 0;
    const tu = waluta
      ? { cena: waluta.wartosc, rozklad: [{ etap: "waluta", opis: waluta.poza ? "waluta lokalna poza regionem — wartość wg MG" : "waluta lokalna", mnoznik: 1, wartosc: waluta.wartosc }] }
      : cenaTutaj(wpis, { region, stan: p.stan ?? "sprawny", skup, profil, korekta, kobalt, cena });
    const pod = (Number(p.cena ?? wpis.cena) || 0) * ilosc;
    podrecznikowa += pod;
    lokalna += tu.cena * ilosc;
    linie.push({ nazwa: p.nazwa ?? wpis.nazwa, ilosc, podrecznikowa: _r2(pod), lokalna: _r2(tu.cena * ilosc), rozklad: tu.rozklad, poza: !!waluta?.poza });
  }
  return { podrecznikowa: _r2(podrecznikowa), lokalna: _r2(lokalna), linie };
}

/* -------------------------------------------- */
/*  Generator towaru (D29)                       */
/* -------------------------------------------- */

/**
 * Czy wpis katalogu może trafić na listę handlarza: przedmiot (nie aktor, nie usługa), z dostępnością, nie
 * zaślepka, a ulepszenie — tylko nasadka (D31; pod Kobaltem także Osełka, D41).
 */
export function towarHandlu(wpis, { kobalt = false } = {}) {
  if (!wpis || wpis.zaslepka || wpis.wynik !== "item" || wpis.kategoria === "uslugi") return false;
  const def = _ulepszenie(wpis);
  if (def && rodzajUlepszenia(def, { kobalt }) !== "nasadka") return false;
  const { dostepnosc } = dostepnoscBazowa(wpis, { kobalt });
  return dostepnosc !== null && dostepnosc > 0 && grupaTowaru(wpis) !== null;
}

/**
 * Towar punktu handlowego (D29):
 *  1. każda pozycja katalogu rzuca k100 ≤ dostępność tutaj (bez CHA) — zdane trafiają do puli;
 *  2. `miejsca` wypełnia los z puli bez zwracania: ok. `udzialGlownych` z grup głównych (i Podstaw), reszta
 *     z pozostałych; brak w jednej części oddaje miejsca drugiej;
 *  3. ilości wg s. 43 (U5).
 * To samo ziarno (`rng`) — ten sam towar (kolejność rzutów po `ref`).
 * @param {object} o
 * @param {Iterable<object>} o.katalog            wpisy `KATALOG`
 * @param {string} o.rodzaj                        klucz `LOKALIZACJE`
 * @param {string[]} [o.kategorie]                 grupy główne (`GRUPY_TOWARU`); puste — wielobranżowy
 * @param {number} [o.miejsca]                     domyślnie z rodzaju miejsca
 * @param {number} [o.udzialGlownych]
 * @param {boolean} [o.podstawy]                   „Podstawy” jako dodatkowa grupa główna
 * @param {() => number} [o.rng]
 * @param {object} [o.profil]
 * @param {boolean} [o.kobalt]
 * @returns {{towar: {ref: string, ilosc: number, grupa: string, prog: number}[], pula: number, glownych: number}}
 */
export function generujTowar({ katalog, rodzaj, kategorie = [], miejsca, udzialGlownych = UDZIAL_GLOWNYCH, podstawy = false, rng = Math.random, profil = null, kobalt = false }) {
  const wpisy = [...katalog].filter(w => towarHandlu(w, { kobalt })).sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
  const pula = [];
  for (const w of wpisy) {
    const { prog } = dostepnoscTutaj(w, { rodzaj, profil, kobalt });
    if (!(prog > 0)) continue;
    if (kosc(100, rng) <= prog) pula.push({ wpis: w, prog });
  }
  const glowne = new Set(kategorie ?? []);
  const wGlownych = p => glowne.has(grupaTowaru(p.wpis)) || (podstawy && PODSTAWY.includes(p.wpis.ref));
  const pulaGlowna = (glowne.size || podstawy) ? pula.filter(wGlownych) : pula;
  const pulaReszta = (glowne.size || podstawy) ? pula.filter(p => !wGlownych(p)) : [];
  const n = Math.max(0, Math.round(Number(miejsca ?? LOKALIZACJE[rodzaj]?.miejsca ?? 15)));
  let nGlowne = (glowne.size || podstawy) ? Math.round(n * udzialGlownych) : n;
  let nReszta = n - nGlowne;
  if (pulaGlowna.length < nGlowne) { nReszta += nGlowne - pulaGlowna.length; nGlowne = pulaGlowna.length; }
  if (pulaReszta.length < nReszta) { nGlowne = Math.min(pulaGlowna.length, nGlowne + nReszta - pulaReszta.length); nReszta = pulaReszta.length; }
  const wybrane = [...wybierzBezZwracania(pulaGlowna, nGlowne, rng), ...wybierzBezZwracania(pulaReszta, nReszta, rng)];
  const towar = wybrane.map(p => ({
    ref: p.wpis.ref,
    ilosc: Math.max(1, rzucKosci(iloscRegula(p.wpis), rng).suma),
    grupa: grupaTowaru(p.wpis),
    prog: p.prog
  })).sort((a, b) => (a.grupa === b.grupa ? (a.ref < b.ref ? -1 : 1) : (a.grupa < b.grupa ? -1 : 1)));
  return { towar, pula: pula.length, glownych: nGlowne };
}

/**
 * Górne ograniczenie szansy pozycji na liście (do testu własności D29): ≤ dostępność tutaj — pozycja musi
 * najpierw zdać rzut dostępności, a miejsc może nie starczyć. `szacunek` — z oczekiwanej wielkości puli.
 * @returns {{gorna: number, szacunek: number}}
 */
export function szansaNaLiscie(wpis, { katalog, rodzaj, kategorie = [], miejsca, udzialGlownych = UDZIAL_GLOWNYCH, podstawy = false, profil = null, kobalt = false }) {
  const { prog } = dostepnoscTutaj(wpis, { rodzaj, profil, kobalt });
  if (!towarHandlu(wpis, { kobalt }) || !(prog > 0)) return { gorna: 0, szacunek: 0 };
  const glowne = new Set(kategorie ?? []);
  const czyGlowna = w => glowne.has(grupaTowaru(w)) || (podstawy && PODSTAWY.includes(w.ref));
  const podzial = glowne.size || podstawy;
  const moja = !podzial || czyGlowna(wpis);
  let oczekiwana = 0;
  for (const w of katalog) {
    if (!towarHandlu(w, { kobalt })) continue;
    if (podzial && czyGlowna(w) !== moja) continue;
    const p = dostepnoscTutaj(w, { rodzaj, profil, kobalt }).prog;
    if (p > 0) oczekiwana += p / 100;
  }
  const n = Math.round(Number(miejsca ?? LOKALIZACJE[rodzaj]?.miejsca ?? 15));
  const sloty = podzial ? (moja ? Math.round(n * udzialGlownych) : n - Math.round(n * udzialGlownych)) : n;
  const gorna = prog / 100;
  return { gorna, szacunek: gorna * Math.min(1, sloty / Math.max(1, oczekiwana)) };
}

/**
 * Ilustracja handlarza (§7.23): dzicz — obwoźny, wioska — barman, dalej wg pierwszej kategorii głównej,
 * inaczej wielobranżowy.
 */
export function obrazHandlarza({ rodzaj, kategorie = [] }) {
  const zMiejsca = LOKALIZACJE[rodzaj]?.obraz;
  if (zMiejsca) return zMiejsca;
  for (const k of kategorie ?? []) if (GRUPY_TOWARU[k]?.obraz) return GRUPY_TOWARU[k].obraz;
  return "wielobranzowy";
}

/** Fachowiec domyślny (D33): rusznikarz u handlarza z Bronią w miasteczku i mieście, inaczej brak. */
export function fachowiecDomyslny({ rodzaj, kategorie = [] }) {
  if (!["miasteczko", "miasto"].includes(rodzaj)) return null;
  return (kategorie ?? []).includes("bron") ? "rusznikarz" : null;
}

/**
 * Czy fachowiec robi tę przeróbkę (D33): rusznikarz — broń dystansowa, kowal — biała, elektronik — Szoker.
 * @returns {boolean}
 */
export function fachowiecRobi(fachowiec, def) {
  if (!fachowiec || !def) return false;
  if (fachowiec === "elektronik") return def.id === "szoker";
  if (fachowiec === "kowal") return def.category === "biala" && def.id !== "szoker";
  if (fachowiec === "rusznikarz") return def.category === "dystansowa";
  return false;
}

export const __testing = Object.freeze({ _ulepszenie });
