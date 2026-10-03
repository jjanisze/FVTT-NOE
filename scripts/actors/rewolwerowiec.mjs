/**
 * Neuroshima 5e — Rewolwerowiec (Kowboj, NOE s. 88) i jego wariant WKK Pistolero.
 *
 * Obie zdolności mają te same klauzule, różni je broń, której dotyczą: rewolwer albo pistolet.
 * Ten rodzaj deklarują same dane (`handgunKind` w `class-features-data.mjs`, wpis Pistolero
 * w `wkk/config/class-features-data.mjs`), więc tu nie ma listy zdolności — jest jedna tabela
 * zbudowana z `CLASS_FEATURES`.
 *
 * Klauzule:
 *   • Niezawodny        — `weapons/jams.mjs` pyta `handgunPerkFor()` przed testem zacięcia.
 *   • Dobywanie         — lalka (`actors/doll.mjs`, `costContext`) pokazuje dobycie/schowanie jako
 *                         darmowe na linii ruchu; Darmowych Interakcji nikt nie liczy (D7).
 *   • Jednoręki         — `combat/grip.mjs`: strzał jedną ręką bez Utrudnienia; rewolwer (pistolet)
 *                         liczy się jako lekki przy ataku drugą ręką.
 *   • Szybkoładowacz    — karta przelania szybkoładowarki zaznacza brak wolnej ręki (`magazine.mjs`).
 *   • Strzał z biodra, Powąchaj to — jeszcze nie.
 *
 * ## Co jest rewolwerem, a co pistoletem
 *
 * Czytamy **właściwości egzemplarza**, nie katalog — tak samo jak `getMagazineType()`:
 *   • rewolwer — broń palna krótka z właściwością `beb` (bębenek),
 *   • pistolet — broń palna krótka bez `beb` i bez `wmag`, czyli z wymiennym magazynkiem.
 * Obrzyn i Pistolet na race (`wmag`) nie są żadnym z nich.
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { hasAbility } from "./abilities.mjs";

function _hasProp(item, prop) {
  const props = item?.system?.properties;
  if (props instanceof Set) return props.has(prop);
  return Array.isArray(props) && props.includes(prop);
}

function _isShortFirearm(item) {
  return item?.type === "weapon" && item.system?.type?.value === "palnaKrotka";
}

export function isRevolver(item) {
  return _isShortFirearm(item) && _hasProp(item, "beb");
}

export function isPistol(item) {
  return _isShortFirearm(item) && !_hasProp(item, "beb") && !_hasProp(item, "wmag");
}

const KIND_TEST = { rewolwer: isRevolver, pistolet: isPistol };

/** `[{ abilityKey, test }]` — każda zdolność z `handgunKind`. */
const PERKS = Object.values(CLASS_FEATURES)
  .filter(f => f.handgunKind && f.legacyAbilityKey && KIND_TEST[f.handgunKind])
  .map(f => ({ abilityKey: f.legacyAbilityKey, test: KIND_TEST[f.handgunKind] }));

/**
 * Klucz zdolności, która obejmuje tę broń w rękach jej właściciela, albo `null`.
 * @param {Item5e} item
 * @returns {string|null}
 */
export function handgunPerkFor(item) {
  const actor = item?.actor;
  if (!actor) return null;
  return PERKS.find(p => p.test(item) && hasAbility(actor, p.abilityKey))?.abilityKey ?? null;
}
