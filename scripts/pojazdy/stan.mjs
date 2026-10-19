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
 */

import { KATALOG_POJAZDOW, PODWOZIA } from "../config/vehicles-data.mjs";
import { ukladMiejsc } from "./geometria.mjs";

export const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_POJAZD = "pojazd";
export const FLAGA_JAZDA = "jazda";

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
