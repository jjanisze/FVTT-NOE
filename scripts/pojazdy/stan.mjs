/**
 * Neuroshima 5e — stan pojazdu i jadących (PLAN_m4_pojazdy §4.1, §4.13).
 *
 * Jedno miejsce, które odpowiada na pytania „czy to prawdziwy pojazd”, „jaki ma obrys i miejsca”,
 * „kto w nim jedzie”. Wszystko inne w `scripts/pojazdy/` pyta tutaj, nie czyta flag samo.
 *
 * ## Gdzie co leży
 *
 *  - **Aktor pojazdu**, flaga `pojazd`: `{podwozie, obrys?, strefy?, id}` — `podwozie` to klucz
 *    `PODWOZIA`/`KATALOG_POJAZDOW` nadany przez katalog i migrację (E1); bez niego aktor typu
 *    `vehicle` jest pojemnikiem (Stos z bebeszenia, Miejsce z przenoszenia — §4.13) i każdy hak M4
 *    go pomija. `obrys`/`strefy` nadpisują katalog dla jednej sztuki (GMT400 to pickup na podwoziu
 *    Hammera). `id` — identyfikator kluczyków (§4.5), żyje w delcie żetonu niepowiązanego.
 *  - **Żeton jadącego**, flaga `jazda`: `{pojazd, miejsce, obrot, rozmiar: {w, h}, sort}` —
 *    `pojazd` = id żetonu pojazdu na tej samej scenie, `obrot` = własny obrót względem pojazdu,
 *    `rozmiar` = oryginalny rozmiar żetonu (przywracany przy wysiadce, D2).
 *  - **Aktor pojazdu**, flaga `obsada` (§4.15, D23): `[[uuid aktora, id miejsca], …]` — kto ostatnio
 *    siedział na którym miejscu, ponad scenami. Lista par, nie obiekt (delta żetonu niepowiązanego nie usuwa
 *    kluczy). Z niej idą `crew`/`passengers` i dostęp z obecności; flaga `jazda` mówi, kto siedzi **tutaj**.
 *
 * ## Skala sceny (§4.14, D21)
 *
 * Obrys, miejsca i rura są w **kratkach pojazdu** — 1,5 m, niezależnie od sceny. Na scenie liczą się w
 * pikselach przez `kratkaPojazdu` (px na 1,5 m), a rozmiar żetonu w kratkach sceny przez
 * `skalaPojazdu`. Na mapach 1,5 m obie równe zwykłej kratce, na siatce 3 m pojazd ma połowę kratek, a gdzie
 * 1,5 m wychodzi poniżej `PROG_ZNACZNIKA_PX` (mapy w km), pojazd jest **znacznikiem**: bez obrysu,
 * miejsc i jazdy — stan aktora działa dalej. Plansza pościgu ma własny tryb (`plansza`, PLAN §6.2).
 */

import { KATALOG_POJAZDOW, PODWOZIA } from "../config/vehicles-data.mjs";
import { ROZMIAR_MIEJSCA, obrysPrzyObrocie, ukladMiejsc } from "./geometria.mjs";

export const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_POJAZD = "pojazd";
export const FLAGA_JAZDA = "jazda";
export const FLAGA_OBSADA = "obsada";

/** Metry jednej kratki pojazdu — jednostka obrysu, miejsc i rury. */
export const METRY_KRATKI_POJAZDU = 1.5;

/** Poniżej tylu pikseli na 1,5 m pojazd na scenie jest znacznikiem. */
export const PROG_ZNACZNIKA_PX = 20;

const METRY_JEDNOSTKI = { m: 1, km: 1000, cm: 0.01, ft: 0.3048, mi: 1609.344 };

/** Metry na jednostkę odległości sceny (nieznana jednostka — metry, jak w reszcie świata). */
export function metryJednostki(scena) {
  const u = String(scena?.grid?.units ?? "m").trim().toLowerCase();
  return METRY_JEDNOSTKI[u] ?? 1;
}

/** Piksele na 1,5 m na scenie. */
export function kratkaPojazdu(scena) {
  const g = scena?.grid;
  if (!g?.size) return 0;
  const metryNaKratke = (Number(g.distance) || 0) * metryJednostki(scena);
  return metryNaKratke > 0 ? g.size * METRY_KRATKI_POJAZDU / metryNaKratke : 0;
}

/** Kratki sceny na jedną kratkę pojazdu (1 na mapach 1,5 m). */
export function skalaPojazdu(scena) {
  const g = scena?.grid;
  return g?.size ? kratkaPojazdu(scena) / g.size : 0;
}

/**
 * Tryb pojazdów na scenie: `taktyczna` (wszystko), `plansza` (pościg: bez wymuszonego obrotu i kart jazdy)
 * albo `znacznik` (skala za mała — pojazd to zwykły żeton).
 */
export function trybSceny(scena) {
  if (!scena || kratkaPojazdu(scena) < PROG_ZNACZNIKA_PX) return "znacznik";
  // Flaga planszy czytana wprost (jak `isPoscigScene`): plansza importuje ten plik, nie odwrotnie.
  return scena.getFlag?.(MODULE_ID, "poscig") ? "plansza" : "taktyczna";
}

/** Czy na scenie pojazd ma obrys, miejsca i jadących (każdy tryb poza znacznikiem). */
export function obrysDziala(scena) {
  return trybSceny(scena) !== "znacznik";
}

/** Równość wymiarów żetonu z tolerancją na ułamki skali. */
export const bliskie = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 1e-3;

/** Liczba w kratkach sceny zaokrąglona tak, żeby ułamki skali nie zostawiały szumu. */
export const zaokrKratki = v => Math.round(v * 10000) / 10000;

/** Klucz podwozia prawdziwego pojazdu albo `null` (pojemnik, zwykły aktor). */
export function podwozieAktora(actor) {
  if (actor?.type !== "vehicle") return null;
  const id = actor.flags?.[MODULE_ID]?.[FLAGA_POJAZD]?.podwozie;
  return id && KATALOG_POJAZDOW[id] ? id : null;
}

/** Czy aktor to prawdziwy pojazd M4 (§4.13). */
export function jestPojazdem(actor) {
  return !!podwozieAktora(actor);
}

/** Czy dokument żetonu to żeton prawdziwego pojazdu. */
export function jestZetonemPojazdu(tokenDoc) {
  return jestPojazdem(tokenDoc?.actor);
}

/**
 * Dane geometryczne pojazdu: katalog + nadpisania sztuki.
 * @returns {{podwozie: string, obrys: {w: number, h: number}, strefy: object[], katalog: object, podstawa: object}|null}
 */
export function danePojazdu(actor) {
  const podwozie = podwozieAktora(actor);
  if (!podwozie) return null;
  const katalog = KATALOG_POJAZDOW[podwozie];
  const wlasne = actor.flags[MODULE_ID][FLAGA_POJAZD];
  return {
    podwozie, katalog, podstawa: PODWOZIA[podwozie],
    obrys: wlasne.obrys ?? katalog.obrys,
    strefy: wlasne.strefy ?? katalog.strefy
  };
}

const _cacheMiejsc = new WeakMap();

/** Miejsca pojazdu (pamiętane per obiekt danych aktora — liczy się raz na przygotowanie danych). */
export function miejscaPojazdu(actor) {
  const dane = danePojazdu(actor);
  if (!dane) return [];
  const klucz = actor.flags[MODULE_ID][FLAGA_POJAZD];
  let wpis = _cacheMiejsc.get(klucz);
  if (!wpis || wpis.obrys !== dane.obrys || wpis.strefy !== dane.strefy) {
    wpis = { obrys: dane.obrys, strefy: dane.strefy, miejsca: ukladMiejsc(dane.obrys, dane.strefy) };
    _cacheMiejsc.set(klucz, wpis);
  }
  return wpis.miejsca;
}

/** Wymiary żetonu pojazdu w kratkach sceny przy danym obrocie (§4.14) albo `null`. */
export function wymiaryZetonu(actor, scena, rotacja) {
  const dane = danePojazdu(actor);
  if (!dane) return null;
  const o = obrysPrzyObrocie(dane.obrys, rotacja);
  const s = skalaPojazdu(scena);
  return { w: zaokrKratki(o.w * s), h: zaokrKratki(o.h * s) };
}

/** Rozmiar żetonu jadącego na miejscu, w kratkach sceny. */
export function rozmiarMiejsca(scena) {
  return zaokrKratki(ROZMIAR_MIEJSCA * skalaPojazdu(scena));
}

/** Pamięć obsady pojazdu (§4.15): `[[uuid aktora, id miejsca], …]`, tylko poprawne pary. */
export function obsadaPojazdu(actor) {
  const o = actor?.flags?.[MODULE_ID]?.[FLAGA_OBSADA];
  return Array.isArray(o) ? o.filter(p => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "string") : [];
}

/** Flaga jazdy żetonu jadącego albo `null`. */
export function jazdaZetonu(tokenDoc) {
  const j = tokenDoc?.flags?.[MODULE_ID]?.[FLAGA_JAZDA];
  return j?.pojazd ? j : null;
}

/** Żeton pojazdu, w którym jedzie ten żeton (ta sama scena), albo `null`. */
export function pojazdJadacego(tokenDoc) {
  const j = jazdaZetonu(tokenDoc);
  if (!j) return null;
  const pojazd = tokenDoc.parent?.tokens.get(j.pojazd);
  return pojazd && jestZetonemPojazdu(pojazd) ? pojazd : null;
}

/** Żetony jadące w pojeździe (dokumenty, ta sama scena). */
export function jadacyPojazdu(pojazdDoc) {
  const scena = pojazdDoc?.parent;
  if (!scena) return [];
  return scena.tokens.filter(t => t.id !== pojazdDoc.id && jazdaZetonu(t)?.pojazd === pojazdDoc.id);
}

/** Miejsce o danym id w pojeździe. */
export function miejsceOId(pojazdActor, id) {
  return miejscaPojazdu(pojazdActor).find(m => m.id === id) ?? null;
}
