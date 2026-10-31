/**
 * Neuroshima 5e — czas efektów w walce (v14): początek na innym kombatancie, „do początku tury właściciela”, sprzątanie.
 *
 * Rdzeń v14 wygasza efekt na końcu/początku tury kombatanta zapisanego w `start.combatant`, a przy tworzeniu wpisuje
 * tam tego, czyja tura trwa (pamięć projektu: `actors/tt.mjs`). Skutki „do końca następnej tury [kogoś innego]”
 * trzeba więc przestawić. Pułapka: częściowe `start` w danych tworzenia (bez `time`) nie przechodzi walidacji
 * schematu i efekt **po cichu się nie tworzy** (`createEmbeddedDocuments` zwraca pustą listę, w konsoli
 * „start: time may not be undefined”). Dlatego pełny początek z `ActiveEffect.getEffectStart` i podmieniony kombatant.
 *
 * **Efekty do początku tury właściciela** (Unikanie, Bieganie, reakcje TT — PLAN_tt §4.5; znaczniki akcji —
 * PLAN_m7 §3.0.1): moduł rejestruje predykat, a tu są trzy haki wspólne dla wszystkich — `start.combatant` na
 * właściciela przy tworzeniu (efekt nałożony w cudzej turze wygasałby w turze tamtego), skasowanie, gdy rdzeń oznaczy
 * wygaśnięcie (`expiryAction: "update"` tylko oznacza), i porządki po skasowanej walce. Do 2026-10-31 żyły w
 * `actors/tt.mjs`.
 *
 * **`usunPoWygasnieciu`** — flaga efektu, który ma zniknąć, gdy rdzeń albo pseudo-wygasanie dnd5e (`sourceStart` itd.)
 * oznaczy go jako wygasły; bez własnego haka w każdym module (PLAN_m7 R7).
 */

import { bramkaZajeta } from "../config/bramki.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga: skasuj efekt, kiedy rdzeń oznaczy `duration.expired`. */
export const FLAG_USUN_PO_WYGASNIECIU = "usunPoWygasnieciu";

/**
 * Pełne `start` efektu z kombatantem `combatant` (bieżąca runda i tura walki).
 * @param {Combatant} combatant
 * @param {Combat} [combat]
 * @returns {object}
 */
export function startNaKombatanta(combatant, combat = game.combat) {
  return { ...ActiveEffect.implementation.getEffectStart(combat), combatant: combatant.id };
}

/* -------------------------------------------- */
/*  Efekty do początku tury właściciela          */
/* -------------------------------------------- */

/** @type {Set<(effect: ActiveEffect) => boolean>} */
const _turaWlasciciela = new Set();

/**
 * Rodzina efektów trwających do początku tury właściciela. Predykat dostaje efekt (także nowy, przed zapisem).
 * @param {(effect: ActiveEffect) => boolean} predykat
 */
export function zarejestrujEfektTuryWlasciciela(predykat) {
  _turaWlasciciela.add(predykat);
}

/** Czy efekt należy do którejś zarejestrowanej rodziny. */
export function jestEfektemTuryWlasciciela(effect) {
  for (const p of _turaWlasciciela) {
    try { if (p(effect)) return true; } catch (_e) { /* predykat zepsuty — nie nasz efekt */ }
  }
  return false;
}

/** Kombatant właściciela w bieżącej, rozpoczętej walce. */
export function kombatantWlasciciela(actor, combat = game.combat) {
  if (!combat?.started || !actor) return null;
  return combat.getCombatantsByActor(actor)[0] ?? null;
}

function _onPreCreateEffect(effect) {
  if (!jestEfektemTuryWlasciciela(effect)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  const owner = kombatantWlasciciela(actor);
  if (!owner) return;
  effect.updateSource({ "start.combatant": owner.id });
}

/** Rdzeń oznaczył wygaśnięcie (`expiryAction: "update"`) — kasujemy, inaczej ikona zostaje. */
async function _onUpdateEffect(effect, changes) {
  if (!game.users.activeGM?.isSelf) return;
  if (foundry.utils.getProperty(changes, "duration.expired") !== true) return;
  if (!jestEfektemTuryWlasciciela(effect) && !effect.getFlag(MODULE_ID, FLAG_USUN_PO_WYGASNIECIU)) return;
  await effect.delete({ neuroTTExpired: true });
}

async function _purge(actor) {
  const ids = actor?.effects?.filter(jestEfektemTuryWlasciciela).map(e => e.id) ?? [];
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

async function _onDeleteCombat(combat) {
  if (!game.users.activeGM?.isSelf) return;
  for (const c of combat.combatants) await _purge(c.actor);
}

/* -------------------------------------------- */
/*  Bramki raz na turę / rundę / walkę           */
/* -------------------------------------------- */

/** Chwila walki dla bramek (PLAN_m7 §3.0.4) — `null` poza rozpoczętą walką. */
export function chwilaWalki(combat = game.combat) {
  if (!combat?.started) return null;
  return { combatId: combat.id, round: combat.round, turn: combat.turn };
}

/**
 * Czy bramka `id` na dokumencie (zwykle przedmiot zdolności) jest zajęta w tej chwili walki.
 * @param {ClientDocument} doc
 * @param {string} id
 * @param {"tura"|"runda"|"walka"} zakres
 */
export function bramkaZajetaNa(doc, id, zakres) {
  return bramkaZajeta(doc?.getFlag?.(MODULE_ID, `bramki.${id}`) ?? null, zakres, chwilaWalki());
}

/** Zajmij bramkę `id` na dokumencie (poza walką — nic). */
export async function zajmijBramke(doc, id) {
  const teraz = chwilaWalki();
  if (teraz && doc?.isOwner) await doc.setFlag(MODULE_ID, `bramki.${id}`, teraz);
}

export function registerCzasEfektu() {
  Hooks.on("preCreateActiveEffect", _onPreCreateEffect);
  Hooks.on("updateActiveEffect", _onUpdateEffect);
  Hooks.on("deleteCombat", _onDeleteCombat);
  // Odpoczynek kończy wszystko, co trwało „do początku następnej tury” (jak stany klasowe).
  Hooks.on("dnd5e.restCompleted", actor => { void _purge(actor); });
}
