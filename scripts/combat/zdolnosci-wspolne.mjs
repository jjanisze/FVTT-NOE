/**
 * Neuroshima 5e — pomocniki wspólne dla automatyki zdolności M7 (`combat/zdolnosci-po-rzucie.mjs`,
 * `combat/zdolnosci-wsparcie.mjs`): przedmiot zdolności i jego licznik, kto „gra” postacią, odległość i sojusznicy,
 * efekt na cudzym aktorze przez przekaźnik MG, wygląd kart.
 */

import { odlegloscKrawedzi } from "./okolicznosci.mjs";
import { creatureKindOf } from "../config/defense-rules.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
/** „1d6” → „1k6” (polskie oznaczenie kości w etykietach). */
export const k = formula => String(formula).replace(/d/gi, "k");

/* -------------------------------------------- */
/*  Przedmiot zdolności                          */
/* -------------------------------------------- */

/** Przedmiot zdolności klasy/profesji (`abilityId`) albo Pochodzenia (`originAbilityId`). */
export function przedmiotZdolnosci(actor, { abilityId, originAbilityId }) {
  return actor?.items?.find(i => (abilityId && i.getFlag(MODULE_ID, "abilityId") === abilityId)
    || (originAbilityId && i.getFlag(MODULE_ID, "originAbilityId") === originAbilityId)) ?? null;
}

/** Pozostałe użycia albo `null` (przedmiot bez licznika). */
export function pozostalo(item) {
  const u = item?.system?.uses;
  if (!u?.max) return null;
  const v = Number(u.value);
  return Number.isFinite(v) ? v : Math.max(0, Number(u.max) - (Number(u.spent) || 0));
}

export async function zuzyj(item, n = 1) {
  const u = item?.system?.uses;
  if (!u?.max) return;
  await item.update({ "system.uses.spent": (Number(u.spent) || 0) + n });
}

/** Kość ze skali klasy (`@scale.cwaniak.motywacja` → "1d6"). */
export function koscSkali(actor, sciezka, zapas) {
  const s = foundry.utils.getProperty(actor?.getRollData?.() ?? {}, `scale.${sciezka}`);
  const f = s?.formula ?? (s ? String(s) : "");
  return /\d*d\d+/i.test(f) ? f : zapas;
}

/* -------------------------------------------- */
/*  Kto, gdzie, z kim                            */
/* -------------------------------------------- */

/** Czy ten widz „gra” tą postacią: gracz — swoją; MG — gdy żaden aktywny gracz jej nie posiada. */
export function gra(actor) {
  if (!actor?.isOwner) return false;
  if (!game.user.isGM) return true;
  return !game.users.some(u => !u.isGM && u.active && actor.testUserPermission(u, "OWNER"));
}

export function zeton(actor) {
  return actor?.token?.object ?? actor?.getActiveTokens?.()[0] ?? null;
}

/** Metry od krawędzi żetonów albo `null`, gdy któregoś nie ma na oglądanej scenie. */
export function dystans(a, b) {
  const ta = a?.document ? a : zeton(a);
  const tb = b?.document ? b : zeton(b);
  return ta && tb ? odlegloscKrawedzi(ta, tb) : null;
}

function _dyspozycja(x) {
  return (x?.document ?? zeton(x)?.document)?.disposition ?? x?.prototypeToken?.disposition ?? null;
}

/** Sojusznicy: ta sama dyspozycja żetonów (nie tajna); bez żetonów — dwie postacie graczy. */
export function sojusznicy(a, b) {
  const da = _dyspozycja(a), db = _dyspozycja(b);
  const actorA = a?.actor ?? a, actorB = b?.actor ?? b;
  if (da === null || db === null) return actorA?.type === "character" && actorB?.type === "character";
  return da === db && da !== CONST.TOKEN_DISPOSITIONS.SECRET;
}

/** Kategoria istoty z karty (`details.type.value` to etykieta — „Człowiek”; postacie: „humanoid” → człowiek). */
export function kategoria(actor) {
  return creatureKindOf(actor?.system?.details?.type?.value) ?? (actor?.type === "character" ? "czlowiek" : null);
}

/** Żetony oglądanej sceny w promieniu `m` metrów od żetonu `zrodlo` (bez niego), z aktorem. */
export function zetonyWZasiegu(zrodlo, m) {
  const t0 = zrodlo?.document ? zrodlo : zeton(zrodlo);
  if (!t0) return [];
  return (canvas?.tokens?.placeables ?? []).filter(t => t !== t0 && t.actor && (odlegloscKrawedzi(t0, t) ?? Infinity) <= m);
}

/* -------------------------------------------- */
/*  Efekt na cudzym aktorze                      */
/* -------------------------------------------- */

const PROSBA_EFEKT = "m7.efekt";
const PROSBA_USUN = "m7.usunEfekty";

/**
 * Załóż efekt na aktorze: właściciel — od razu; inaczej przez przekaźnik MG (nosiciel prośby: `przez`, aktor klikającego).
 * @param {Actor} actor
 * @param {object} data    dane efektu (do serializacji)
 * @param {{przez?: Actor|null}} [o]
 */
export async function nalozEfekt(actor, data, { przez = null } = {}) {
  if (!actor) return null;
  if (actor.isOwner) return actor.createEmbeddedDocuments("ActiveEffect", [data]);
  return doMG(PROSBA_EFEKT, { actorUuid: actor.uuid, efekt: data }, { nosiciel: przez });
}

/**
 * Usuń efekty z flagą `flags.<mod>.<klucz> === wartosc` z aktorów (właściciel albo przez MG).
 * @param {Actor[]} aktorzy
 * @param {string} klucz
 * @param {any} wartosc
 * @param {{przez?: Actor|null}} [o]
 */
export async function usunEfekty(aktorzy, klucz, wartosc, { przez = null } = {}) {
  for (const actor of aktorzy) {
    const ids = actor.effects.filter(e => e.getFlag(MODULE_ID, klucz) === wartosc).map(e => e.id);
    if (!ids.length) continue;
    if (actor.isOwner) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    else await doMG(PROSBA_USUN, { actorUuid: actor.uuid, ids }, { nosiciel: przez });
  }
}

export function registerZdolnosciWspolne() {
  zarejestrujProsbe(PROSBA_EFEKT, async (_nosiciel, dane) => {
    const a = await fromUuid(dane.actorUuid);
    return a?.createEmbeddedDocuments("ActiveEffect", [dane.efekt]);
  });
  zarejestrujProsbe(PROSBA_USUN, async (_nosiciel, dane) => {
    const a = await fromUuid(dane.actorUuid);
    const ids = (dane.ids ?? []).filter(id => a?.effects.has(id));
    return ids.length ? a.deleteEmbeddedDocuments("ActiveEffect", ids) : null;
  });
}

/* -------------------------------------------- */
/*  Wygląd                                       */
/* -------------------------------------------- */

export function flavorKarty(kolor, tytul, linia) {
  return `<div style="border-left: 4px solid ${kolor}; background: color-mix(in srgb, ${kolor} 8%, transparent); padding: 6px 8px; border-radius: 0 4px 4px 0; margin-bottom: 4px;">`
    + `<div style="font-weight: bold; color: ${kolor}; font-size: 13px; margin-bottom: 2px;">${tytul}</div>`
    + `<div style="font-size: 11px; color: var(--color-text-secondary, #aaa);">${linia}</div></div>`;
}

export const stylPrzycisku = kolor => ({ background: `color-mix(in srgb, ${kolor} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${kolor} 45%, transparent)`, color: kolor, cursor: "pointer" });
export const STYL_SZARY = { background: "rgba(128, 128, 128, 0.08)", border: "1px solid rgba(128, 128, 128, 0.2)", color: "#666", cursor: "default", opacity: "0.5" };
