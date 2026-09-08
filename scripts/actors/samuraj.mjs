/**
 * Neuroshima 5e — Samuraj (Sztuczka, `sztuczki-data.mjs`).
 *
 * RAW (podręcznik, "SAMURAJ"): "+1 SIŁ lub ZRC; +1 do Testów Ataku i obrażeń bronią sieczną;
 * wyciągnięcie finezyjnej broni siecznej bez Darmowej Interakcji; TT +1 z taką bronią w ręku."
 *
 * Trzy z czterech klauzul mają tu kod:
 *   • +1 do Testu Ataku      — `dnd5e.preRollAttack`
 *   • +1 do obrażeń          — `dnd5e.preRollDamage`
 *   • TT +1 (czyli KP +1)    — Active Effect, dopinany zależnie od trzymanej broni
 *
 * Czwarta ("wyciągnięcie ... bez Darmowej Interakcji") nie ma czego zaczepić: ten system nie
 * śledzi darmowych interakcji jako zasobu. Zadeklarowana w `manual`, nie udawana.
 *
 * ## Co znaczy "broń sieczna"
 *
 * Broń, której obrażenia zawierają typ `slashing`. Świadomie **nie** wymagamy, żeby był to
 * jedyny typ — Nóż taktyczny Victora zadaje "kłute+cięte" i wg literalnego brzmienia zasady
 * nadal jest bronią sieczną. Czytamy zarówno `system.damage.base.types`, jak i typy z części
 * obrażeń aktywności, bo broń z katalogu wypełnia jedno albo drugie zależnie od tego, którą
 * fabryką powstała.
 *
 * ⚠️ `damage.parts[].types` to **Set**, nie tablica (`Object.values`/`JSON` na tym milcząco
 * zwracają `{}` — ta sama klasa pułapki co `system.activities` opisana w ARCHITECTURE.md §10).
 * Stąd `_types()` poniżej zamiast czytania wprost.
 *
 * ## Dlaczego AE, a nie stały bonus
 *
 * TT +1 przysługuje tylko "z taką bronią w ręku", więc efekt musi się pojawiać i znikać razem
 * z założeniem/zdjęciem broni. Kształt (debounce + serializacja per aktor + backfill na
 * `ready`) skopiowany z `bez-dna.mjs`, który rozwiązuje dokładnie ten sam problem dla Udźwigu.
 */

import { ABILITY_KEYS, hasAbility } from "./abilities.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const EFFECT_ID = "neuroSamurajTT00";
const EFFECT_FLAG = "samurajEffect";
const BONUS = 1;

/* -------------------------------------------- */
/*  Wykrywanie broni siecznej                     */
/* -------------------------------------------- */

/** `types` bywa Setem albo tablicą zależnie od ścieżki, którą powstała broń. */
function _types(t) {
  if (!t) return [];
  return Array.isArray(t) ? t : Array.from(t);
}

/** Czy ten przedmiot to broń zadająca obrażenia cięte. */
export function isSlashingWeapon(item) {
  if (item?.type !== "weapon") return false;
  if (_types(item.system?.damage?.base?.types).includes("slashing")) return true;
  for (const activity of item.system?.activities?.values?.() ?? []) {
    for (const part of activity.damage?.parts ?? []) {
      if (_types(part.types).includes("slashing")) return true;
    }
  }
  return false;
}

/** Broń sieczna aktualnie trzymana w ręku (założona). */
function equippedSlashing(actor) {
  return actor?.items?.find(i => i.system?.equipped && isSlashingWeapon(i)) ?? null;
}

function _hasSamuraj(actor) {
  return hasAbility(actor, ABILITY_KEYS.SAMURAJ);
}

/* -------------------------------------------- */
/*  Klauzula: TT +1 (Active Effect)               */
/* -------------------------------------------- */

async function _syncSamurajEffect(actor) {
  if (!actor?.effects) return;
  const existing = actor.effects.get(EFFECT_ID) ?? actor.effects.find(e => e.getFlag(MODULE_ID, EFFECT_FLAG));
  const weapon = _hasSamuraj(actor) ? equippedSlashing(actor) : null;

  if (!weapon) {
    if (existing) await existing.delete();
    return;
  }
  if (existing) return; // stan binarny — nie ma czego aktualizować

  try {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      _id: EFFECT_ID,
      name: "Samuraj — TT +1",
      img: "icons/svg/sword.svg",
      changes: [{
        key: "system.attributes.ac.bonus",
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: String(BONUS),
        priority: 20
      }],
      flags: { [MODULE_ID]: { [EFFECT_FLAG]: true } }
    }], { keepId: true });
  } catch (err) {
    // Równoległy resync zdążył pierwszy — z tego miejsca to nie jest błąd.
    if (actor.effects.get(EFFECT_ID)) return;
    throw err;
  }
}

/* Debounce + serializacja per aktor — patrz `bez-dna.mjs`, ten sam kształt. */
const _syncChain = new Map();
const _syncTimer = new Map();

function queueSamurajSync(actor) {
  if (!actor?.id) return;
  const prev = _syncChain.get(actor.id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => _syncSamurajEffect(actor));
  _syncChain.set(actor.id, next);
  next.finally(() => { if (_syncChain.get(actor.id) === next) _syncChain.delete(actor.id); });
  return next;
}

function syncSamurajEffect(actor) {
  if (!actor?.id) return;
  clearTimeout(_syncTimer.get(actor.id));
  _syncTimer.set(actor.id, setTimeout(() => {
    _syncTimer.delete(actor.id);
    queueSamurajSync(actor);
  }, 150));
}

/* -------------------------------------------- */
/*  Klauzule: +1 do ataku i obrażeń               */
/* -------------------------------------------- */

/**
 * Wspólny warunek obu haków: aktor ma Sztuczkę, a atak idzie bronią sieczną.
 * Bierzemy broń z samej aktywności, nie „jakąkolwiek założoną" — inaczej katana w plecaku
 * podbijałaby strzał z karabinu.
 */
function _samurajWeapon(config) {
  const activity = config?.subject;
  const actor = activity?.actor;
  const item = activity?.item;
  if (!actor || !item) return null;
  if (!isSlashingWeapon(item)) return null;
  if (!_hasSamuraj(actor)) return null;
  return item;
}

/** Hook: `dnd5e.preRollAttack`. */
function onPreRollAttack(config, _dialog, _message) {
  if (!_samurajWeapon(config)) return;
  for (const roll of config.rolls ?? []) {
    (roll.parts ??= []).push(String(BONUS));
  }
}

/** Hook: `dnd5e.preRollDamage`. */
function onPreRollDamage(config, _dialog, _message) {
  if (!_samurajWeapon(config)) return;
  // Tylko pierwszy rzut obrażeń — bonus jest jeden, nie „po jednym na każdą część".
  const first = config.rolls?.[0];
  if (!first) return;
  (first.parts ??= []).push(String(BONUS));
}

/* -------------------------------------------- */

export function registerSamuraj() {
  Hooks.on("dnd5e.preRollAttack", onPreRollAttack);
  Hooks.on("dnd5e.preRollDamage", onPreRollDamage);

  const resync = doc => {
    const actor = doc instanceof Actor ? doc : doc?.parent;
    if (actor instanceof Actor) syncSamurajEffect(actor);
  };
  Hooks.on("createItem", resync);
  Hooks.on("deleteItem", resync);
  // W przeciwieństwie do „Bez dna" liczy się też samo założenie/zdjęcie broni.
  Hooks.on("updateItem", (doc, changed) => {
    if (foundry.utils.hasProperty(changed, "system.equipped")) resync(doc);
  });

  Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) syncSamurajEffect(actor);
  });

  console.log(`${MODULE_ID} | Samuraj registered`);
}

/** Powierzchnia dla testów Quench — Warstwa 4/5 (TESTING.md). */
export const __testing = Object.freeze({
  isSlashingWeapon, equippedSlashing, onPreRollAttack, onPreRollDamage,
  syncSamurajEffect: _syncSamurajEffect, EFFECT_ID, BONUS
});
