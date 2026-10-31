/**
 * Neuroshima 5e — warstwa akcji: znaczniki „Reakcja zużyta” i „Akcja bonusowa zużyta” (PLAN_m7 §3.0.1, D5, D6, D10).
 *
 * Zasady — `config/actions-data.mjs`. Tutaj:
 *
 *   - **Jeden lejek** `zadeklaruj(actor, "R"|"B", { zrodlo })`: w trwającej walce zakłada znacznik (stan z
 *     `config/conditions.mjs`, efekt do początku tury właściciela — `combat/czas-efektu.mjs`) albo dopisuje do niego
 *     kolejne użycie; każde naruszenie (drugie użycie, Obezwładnienie, Stopień Zranienia) — `sygnalNaruszenia`.
 *     Poza walką nic: ekonomia akcji to rundy. Cudzy aktor — prośba przez przekaźnik MG (`postoj/przekaznik.mjs`).
 *   - **Natywne aktywności** z aktywacją `reaction` / `bonus` deklarują same (`dnd5e.postUseActivity`, klient
 *     używającego). Przepływy modułu, które anulują natywną aktywność (Berserk, Reakcje celu, przyciski M7), wołają
 *     lejek wprost.
 *   - Znacznik założony z HUD-u żetonu (MG) jest tym samym stanem — lejek go rozpoznaje.
 *
 * Oznacza, nie blokuje: nic tu nie zatrzymuje akcji. Handoff ruchu dołoży do tej warstwy ruch i deklaracje A/B.
 */

import { AKCJE, AKTYWACJA_DO_AKCJI, zadeklarujAkcje, dodatkowaAkcja, opisZnacznika } from "../config/actions-data.mjs";
import { sygnalNaruszenia } from "../combat/sygnal-naruszenia.mjs";
import { zarejestrujEfektTuryWlasciciela, kombatantWlasciciela } from "../combat/czas-efektu.mjs";
import { getZranienieLvl } from "../combat/zranienie.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** `flags.<mod>.akcjaZuzyta = { kind, uzycia: [{zrodlo}], limit }` na efekcie znacznika. */
export const FLAG_ZNACZNIK = "akcjaZuzyta";
const PROSBA = "akcje.deklaruj";

const STATUSY = new Set(Object.values(AKCJE).map(a => a.status));

/** Efekt-znacznik (nasz albo założony z HUD-u). */
function _jestZnacznikiem(effect) {
  return effect?.getFlag?.(MODULE_ID, FLAG_ZNACZNIK) != null || [...(effect?.statuses ?? [])].some(s => STATUSY.has(s));
}

/**
 * Znacznik danego rodzaju na aktorze albo `null`.
 * @param {Actor} actor
 * @param {"R"|"B"} kind
 * @returns {ActiveEffect|null}
 */
export function znacznik(actor, kind) {
  const def = AKCJE[kind];
  if (!actor || !def) return null;
  return actor.effects.find(e => e.getFlag(MODULE_ID, FLAG_ZNACZNIK)?.kind === kind || e.statuses?.has(def.status)) ?? null;
}

/** Zapis znacznika; założony z HUD-u nie ma flagi — liczy się jako jedno użycie „HUD”. */
function _zapis(effect, kind) {
  if (!effect) return null;
  return effect.getFlag(MODULE_ID, FLAG_ZNACZNIK) ?? { kind, uzycia: [{ zrodlo: "HUD" }], limit: 1 };
}

/* Deklaracje jednego aktora po kolei — dwa szybkie kliknięcia nie zakładają dwóch znaczników. */
const _kolejka = new Map();
function _poKolei(actor, fn) {
  const prev = _kolejka.get(actor.uuid) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  _kolejka.set(actor.uuid, next);
  next.finally(() => { if (_kolejka.get(actor.uuid) === next) _kolejka.delete(actor.uuid); });
  return next;
}

function _danyEfektu(def, kind, zapis) {
  return {
    name: def.nazwa === "Reakcja" ? "Reakcja zużyta" : "Akcja bonusowa zużyta",
    img: CONFIG.statusEffects.find(s => s.id === def.status)?.img ?? "icons/svg/clockwork.svg",
    statuses: [def.status],
    duration: { value: 1, units: "turns", expiry: "turnStart" },
    description: `<p>${foundry.utils.escapeHTML(opisZnacznika(kind, zapis))}</p>`,
    flags: { [MODULE_ID]: { [FLAG_ZNACZNIK]: { kind, ...zapis } } }
  };
}

/**
 * Zadeklaruj użycie Reakcji albo Akcji Bonusowej.
 * @param {Actor} actor
 * @param {"R"|"B"} kind
 * @param {{zrodlo?: string}} [o]
 * @returns {Promise<{poza?: boolean, prosba?: boolean, naruszenie?: boolean, powody?: string[]}|null>}
 */
export async function zadeklaruj(actor, kind, { zrodlo = "?" } = {}) {
  const def = AKCJE[kind];
  if (!actor || !def) return null;
  if (!kombatantWlasciciela(actor)) return { poza: true };
  if (!actor.isOwner) {
    await doMG(PROSBA, { actorUuid: actor.uuid, kind, zrodlo });
    return { prosba: true };
  }
  return _poKolei(actor, async () => {
    const effect = znacznik(actor, kind);
    const { znacznik: zapis, powody } = zadeklarujAkcje(_zapis(effect, kind), kind, zrodlo, {
      stany: actor.statuses, zranienie: getZranienieLvl(actor)
    });
    if (effect) {
      await effect.update({
        description: `<p>${foundry.utils.escapeHTML(opisZnacznika(kind, zapis))}</p>`,
        [`flags.${MODULE_ID}.${FLAG_ZNACZNIK}`]: { kind, ...zapis }
      });
    } else {
      await actor.createEmbeddedDocuments("ActiveEffect", [_danyEfektu(def, kind, zapis)]);
    }
    if (powody.length) {
      await sygnalNaruszenia(actor, { tytul: `${actor.name} — ${def.nazwa}: ${zrodlo}`, linie: powody });
    }
    return { naruszenie: powody.length > 0, powody };
  });
}

/**
 * Dodatkowa akcja w tej turze (Zryw): limit znacznika +1. Bez znacznika zakłada pusty z limitem 2.
 * @param {Actor} actor
 * @param {"R"|"B"} kind
 */
export async function dodatkowa(actor, kind) {
  const def = AKCJE[kind];
  if (!actor?.isOwner || !def || !kombatantWlasciciela(actor)) return null;
  return _poKolei(actor, async () => {
    const effect = znacznik(actor, kind);
    const zapis = dodatkowaAkcja(effect ? _zapis(effect, kind) : { uzycia: [], limit: 1 });
    if (effect) return effect.setFlag(MODULE_ID, FLAG_ZNACZNIK, { kind, ...zapis });
    return actor.createEmbeddedDocuments("ActiveEffect", [_danyEfektu(def, kind, zapis)]);
  });
}

/* -------------------------------------------- */
/*  Natywne aktywności                           */
/* -------------------------------------------- */

function _onPostUseActivity(activity) {
  const kind = AKTYWACJA_DO_AKCJI[activity?.activation?.type];
  const actor = activity?.actor;
  if (!kind || !actor) return;
  void zadeklaruj(actor, kind, { zrodlo: activity.item?.name ?? activity.name ?? "?" });
}

/* -------------------------------------------- */

export function registerActions() {
  zarejestrujEfektTuryWlasciciela(_jestZnacznikiem);
  zarejestrujProsbe(PROSBA, async (_nosiciel, dane) => {
    const actor = await fromUuid(dane.actorUuid);
    return actor ? zadeklaruj(actor, dane.kind, { zrodlo: dane.zrodlo }) : null;
  });
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  console.log(`${MODULE_ID} | Warstwa akcji (znaczniki R/B) registered`);
}

/** `game.neuroshima.actions` — lejek deklaracji i podgląd znaczników. */
export const actionsApi = Object.freeze({ AKCJE, zadeklaruj, dodatkowa, znacznik });
