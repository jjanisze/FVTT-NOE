/**
 * Neuroshima 5e — Zdolność produkcyjna (ZP): skąd postać ma dostęp do przepisu (PLAN_produkcja §5.2).
 *
 * ZP = Schematy ∪ Wprawa ∪ Proste. Źródło dostępu tylko otwiera drzwi — ST, czas, surowce
 * i narzędzia należą do przepisu. Narzędzia nigdy nie otwierają dostępu (D16), a braku
 * dostępu nie da się przeklikać (D23 — to nadaje MG).
 *
 * | Źródło          | Skąd moduł wie                                              | Przepisy |
 * |-----------------|-------------------------------------------------------------|----------|
 * | Schemat         | przedmiot z `flags.<mod>.schemat = { przepisId, ref, snapshot? }` w ekwipunku | jeden (standardowy) |
 * | Wprawa profesji | zdolność `abilityId` ∈ profesje Speca                        | tabela: standardowe + (bez WKK) przepisy profesji (D24) |
 * | Wprawa od MG    | `flags.<mod>.wprawa.<klucz> = { przepisId, nota, od, kiedy, snapshot? }` na aktorze | jeden |
 * | Proste          | cena sztuki ≤ 10 gb (s. 146)                                 | wiele |
 */

import {
  PROFESJE, LISTA_PROFESJI, PRZEPISY_STANDARDOWE, wszystkiePrzepisy, przepis as przepisPoId
} from "../config/recipes-data.mjs";
import { wymagaSchematu } from "../config/production-rules.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { profesjeAktora, maZdolnosc } from "./wykonawca.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga przedmiotu-Schematu. */
export const SCHEMAT_FLAG = "schemat";
/** Flaga aktora z Wprawą od MG (słownik, klucz = id przepisu bez kropek — `kluczWprawy`). */
export const WPRAWA_FLAG = "wprawa";

/** Klucz Wprawy w słowniku flag — ścieżki flag dzielą się na kropkach, więc bez nich. */
export function kluczWprawy(przepisId) {
  return String(przepisId).replace(/[.]/g, "_");
}

/** Schematy w ekwipunku aktora. */
export function schematyAktora(actor) {
  return (actor?.items ?? []).filter(i => i.getFlag?.(MODULE_ID, SCHEMAT_FLAG));
}

/** Wprawa od MG: `[{ klucz, przepisId, nota, od, kiedy, snapshot }]`. */
export function wprawaMG(actor) {
  const raw = actor?.getFlag?.(MODULE_ID, WPRAWA_FLAG) ?? {};
  return Object.entries(raw).filter(([, v]) => v?.przepisId).map(([klucz, v]) => ({ klucz, ...v }));
}

/** Przepis ze snapshotu (Schemat / Wprawa ad hoc) albo z danych. */
function _przepisZeZrodla(entry) {
  return entry?.snapshot ?? przepisPoId(entry?.przepisId) ?? null;
}

/**
 * Źródła dostępu do przepisu.
 * @returns {{typ: "schemat"|"wprawa-profesji"|"wprawa-mg"|"proste", label: string, item?: Item, profesja?: string}[]}
 */
export function zrodlaDostepu(actor, przepis, { kobalt = isKobaltEnabled() } = {}) {
  const out = [];
  if (!wymagaSchematu(przepis.cena)) out.push({ typ: "proste", label: "Proste" });

  for (const item of schematyAktora(actor)) {
    const s = item.getFlag(MODULE_ID, SCHEMAT_FLAG);
    const id = s.snapshot?.id ?? s.przepisId;
    if (id === przepis.id) out.push({ typ: "schemat", label: item.name.startsWith("Schemat") ? item.name : `Schemat: ${item.name}`, item });
  }

  const profesje = profesjeAktora(actor);
  for (const prof of profesje) {
    const lista = LISTA_PROFESJI[prof];
    const zTabeli = przepis.profesja === prof && !kobalt;
    const standardZListy = przepis.id.startsWith("std/") && lista?.has(przepis.wynik.ref);
    if (zTabeli || standardZListy) out.push({ typ: "wprawa-profesji", label: `Wprawa: ${PROFESJE[prof].label}`, profesja: prof });
  }

  for (const w of wprawaMG(actor)) {
    const p = _przepisZeZrodla(w);
    if (p?.id === przepis.id) out.push({ typ: "wprawa-mg", label: `Wprawa: ${w.nota || "od MG"}`, nota: w.nota });
  }

  // Przepisy zdolności (Pogromca, D35) — dostęp daje sama zdolność.
  const zdolnosc = przepis.zrodlo?.zdolnosc;
  if (zdolnosc && maZdolnosc(actor, zdolnosc)) out.push({ typ: "wprawa-zdolnosci", label: `Zdolność: ${przepis.nazwa}` });
  return out;
}

/**
 * Wszystkie przepisy, do których aktor ma dostęp, z listą źródeł.
 * Obejmuje przepisy ad hoc ze snapshotów (Schemat „Utwórz schemat”, Wprawa od MG).
 * @returns {{przepis: object, zrodla: object[]}[]}
 */
export function przepisyDostepne(actor, { kobalt = isKobaltEnabled() } = {}) {
  const pula = new Map(wszystkiePrzepisy({ kobalt }).map(p => [p.id, p]));
  for (const item of schematyAktora(actor)) {
    const s = item.getFlag(MODULE_ID, SCHEMAT_FLAG);
    if (s.snapshot && !pula.has(s.snapshot.id)) pula.set(s.snapshot.id, s.snapshot);
  }
  for (const w of wprawaMG(actor)) {
    const p = _przepisZeZrodla(w);
    if (p && !pula.has(p.id)) pula.set(p.id, p);
  }
  const out = [];
  for (const p of pula.values()) {
    const zrodla = zrodlaDostepu(actor, p, { kobalt });
    if (zrodla.length) out.push({ przepis: p, zrodla });
  }
  return out;
}

/** Czy aktor ma jakikolwiek dostęp do przepisu. */
export function maDostep(actor, przepis, opts) {
  return zrodlaDostepu(actor, przepis, opts).length > 0;
}

/**
 * Nadaje Wprawę od MG (D13) — luźna nagroda fabularna z notatką.
 * @param {Actor} actor
 * @param {object} przepis  przepis z danych albo snapshot ad hoc
 * @param {{nota?: string}} [opts]
 */
export async function nadajWprawe(actor, przepis, { nota = "" } = {}) {
  if (!game.user.isGM) throw new Error("Wprawę nadaje MG.");
  const snapshot = PRZEPISY_STANDARDOWE.has(przepis.id) || przepisPoId(przepis.id) ? null : przepis;
  await actor.update({
    [`flags.${MODULE_ID}.${WPRAWA_FLAG}.${kluczWprawy(przepis.id)}`]: {
      przepisId: przepis.id, nota, od: game.user.name, kiedy: game.time.worldTime, snapshot
    }
  });
}

/** Odbiera Wprawę od MG. */
export async function odbierzWprawe(actor, przepisId) {
  if (!game.user.isGM) throw new Error("Wprawę odbiera MG.");
  await actor.update({ [`flags.${MODULE_ID}.${WPRAWA_FLAG}.-=${kluczWprawy(przepisId)}`]: null });
}
