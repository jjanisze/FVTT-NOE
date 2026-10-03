/**
 * Neuroshima 5e — Samuraj (Sztuczka, `sztuczki-data.mjs`).
 *
 * RAW (NOE s. 107, "SAMURAJ"): +1 SIŁ lub ZRC; Osełka — +1 do Testów Ataku i obrażeń bronią
 * zadającą obrażenia cięte; Dobycie — finezyjna broń biała (cięte) bez darmowej interakcji;
 * Zasłona — TT +1, gdy dzierżysz finezyjną broń białą zadającą obrażenia cięte.
 *
 * Trzy z czterech klauzul mają kod:
 *   • +1 do Testu Ataku      — `dnd5e.preRollAttack` (tutaj)
 *   • +1 do obrażeń          — `dnd5e.preRollDamage` (tutaj)
 *   • Zasłona, TT +1         — silnik TT (`config/tt-rules.mjs`, wiersz `zaslona`) czyta
 *                              `isZaslonaWeapon()` z broni w rękach lalki. Do 2026-10 był to
 *                              Efekt Aktywny `neuroSamurajTT00` synchronizowany przy każdej
 *                              zmianie broni — zapis do bazy za każdym razem; sprząta go
 *                              `cleanupLegacyTTEffects()` (`actors/tt.mjs`, PLAN_tt P2).
 *
 * Czwarta (Dobycie) nie ma czego zaczepić: ten system nie
 * śledzi darmowych interakcji jako zasobu. Zadeklarowana w `manual`, nie udawana.
 *
 * ## Co znaczy "broń zadająca obrażenia cięte"
 *
 * Broń, której obrażenia zawierają typ `slashing`. Świadomie **nie** wymagamy, żeby był to
 * jedyny typ — Nóż taktyczny Victora zadaje "kłute+cięte" i wg literalnego brzmienia zasady
 * nadal się liczy. Czytamy zarówno `system.damage.base.types`, jak i typy z części
 * obrażeń aktywności, bo broń z katalogu wypełnia jedno albo drugie zależnie od tego, którą
 * fabryką powstała.
 *
 * ⚠️ `damage.parts[].types` to **Set**, nie tablica (`Object.values`/`JSON` na tym milcząco
 * zwracają `{}` — ta sama klasa pułapki co `system.activities` opisana w ARCHITECTURE.md §10).
 * Stąd `_types()` poniżej zamiast czytania wprost.
 */

import { ABILITY_KEYS, hasAbility } from "./abilities.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
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

/** Zasłona: finezyjna broń biała zadająca obrażenia cięte. */
export function isZaslonaWeapon(item) {
  return isSlashingWeapon(item)
    && item.system?.type?.value === "biala"
    && (item.system?.properties?.has?.("fin") ?? false);
}

function _hasSamuraj(actor) {
  return hasAbility(actor, ABILITY_KEYS.SAMURAJ);
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
  console.log(`${MODULE_ID} | Samuraj registered`);
}

/** Powierzchnia dla testów Quench — Warstwa 4/5 (TESTING.md). */
export const __testing = Object.freeze({
  isSlashingWeapon, isZaslonaWeapon, onPreRollAttack, onPreRollDamage, BONUS
});
