/**
 * Neuroshima 5e — Przeciwpancerna (`ppanc`) i Przebijająca (`przebijajaca`).
 *
 * > **Przebijająca:** Ta broń ignoruje odporność na obrażenia i Próg obrażeń. (NOE s. 117)
 * > **Przeciwpancerna (ppanc):** Odporności na obrażenia i Progi obrażeń nie dotyczą tej broni,
 * > tzn. taka broń je po prostu ignoruje. (NOE s. 118)
 *
 * Dwie nazwy, jeden skutek. Do 2026-10 sprawdzał je tylko Próg obrażeń Bestiariusza, i to wyłącznie
 * `ppanc` z broni; pancerz BG (próg i odporność kinetyczna) i odporności istot nie wiedziały o nich
 * nic (PLAN_beta M1, PLAN_weapon_properties §3.2).
 *
 * Skąd właściwość:
 *   • broń — `system.properties` przedmiotu aktywności, z której wyszła wiadomość obrażeń,
 *   • amunicja — `weapons/ammo.mjs` kładzie właściwości naboju na samych obrażeniach
 *     (`damages[].properties`); ta ścieżka nie ma wiadomości źródłowej.
 *
 * Jak: w `dnd5e.preCalculateDamage` dopisujemy natywne `options.ignore.resistance` i
 * `options.ignore.threshold` — dnd5e pomija wtedy odporności, a próg pancerza BG
 * (`actors/armor-rules.mjs`) i Próg obrażeń Bestiariusza (`combat/bestiary-thresholds.mjs`) czytają
 * tę samą flagę. Niewrażliwość (immunity) zostaje — RAW mówi o odpornościach.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Właściwości broni i amunicji, które przebijają odporności i progi. */
export const ARMOUR_PIERCING_PROPS = Object.freeze(["ppanc", "przebijajaca"]);

const _piercing = props => ARMOUR_PIERCING_PROPS.some(p => props?.has?.(p) || (Array.isArray(props) && props.includes(p)));

/**
 * Czy to trafienie przebija odporności i progi?
 * @param {Array<{properties?: Set<string>}>} damages  wpisy z `calculateDamage`
 * @param {object} [options]                           opcje `calculateDamage`
 * @returns {boolean}
 */
export function isArmourPiercing(damages, options = {}) {
  if ((damages ?? []).some(d => _piercing(d?.properties))) return true;
  const uuid = options?.originatingMessage?.flags?.dnd5e?.activity?.uuid;
  if (!uuid) return false;
  try {
    return _piercing(fromUuidSync(uuid)?.item?.system?.properties);
  } catch {
    return false;
  }
}

function onPreCalculateDamage(_actor, damages, options) {
  if (!options || options.ignore === true) return;
  if (!isArmourPiercing(damages, options)) return;
  options.ignore = { ...(options.ignore ?? {}), resistance: true, threshold: true };
}

export function registerArmourPiercing() {
  Hooks.on("dnd5e.preCalculateDamage", onPreCalculateDamage);
  console.log(`${MODULE_ID} | Armour piercing (ppanc / przebijająca) registered`);
}
