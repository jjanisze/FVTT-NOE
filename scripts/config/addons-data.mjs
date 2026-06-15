/**
 * Neuroshima 5e — Weapon addon definitions.
 *
 * Static data table for all addons from Tabele/Bronie/Ulepszenia.md.
 * Imported by addons.mjs (logic) and addons-inventory.mjs (UI).
 *
 * applyMode values (array):
 *   "direct"     — modifies system.attack.bonus / system.damage.base.bonus / system.range directly on install
 *   "property"   — modifies system.properties Set
 *   "conditional"— bonus injected at roll-time via dnd5e.preRollAttackV2
 *   "flag-only"  — flag set on weapon; other modules read it (jams, degradation, fire-modes)
 *   "activity"   — creates an embedded Activity on the weapon
 *   "range-x2"   — doubles both range values (special case for Wyważenie)
 */

/** @typedef {"direct"|"property"|"conditional"|"flag-only"|"activity"|"range-x2"} ApplyMode */

/**
 * @typedef {Object} AddonDef
 * @property {string}   id
 * @property {string}   label
 * @property {"biala"|"dystansowa"|"any"} category
 * @property {number}   price              cena w gb
 * @property {number}   weight             waga kg (szacunek)
 * @property {string[]} requiresProperties właściwości broni wymagane przy instalacji
 * @property {string[]} requiresWeaponTypes lista dozwolonych system.type.value; [] = wszystkie
 * @property {string[]} requiresAddons     inne addony muszące być zainstalowane
 * @property {string[]} exclusiveWith      wzajemnie wykluczające się ID
 * @property {boolean}  usesSMSlot         czy zajmuje slot Szyny (maks 3 per broń)
 * @property {ApplyMode[]} applyMode
 * @property {string[]} grantProperties    dla trybu "property" — dodaj te właściwości
 * @property {string[]} removeProperties   dla trybu "property" — usuń te właściwości
 * @property {number}   attackBonus        dla trybu "direct"
 * @property {number}   damageBonus        dla trybu "direct"
 * @property {number}   rangeNormalBonus   dla trybu "direct" (m)
 * @property {number}   rangeLongBonus     dla trybu "direct" (m)
 * @property {Object}   [conditionalBonus] dla trybu "conditional"
 * @property {string}   [conditionalBonus.type]  "range-zone" | "setup" | "no-sight"
 * @property {number}   [conditionalBonus.normalBonus]
 * @property {number}   [conditionalBonus.longBonus]
 * @property {string}   [conditionalBonus.setupKey]  klucz flagi setup (dla dwójnóg/trójnóg)
 * @property {number}   [conditionalBonus.setupBonus]
 */

export const ADDON_DEFS = {

  /* ========================================================================
   * BROŃ BIAŁA
   * ====================================================================== */

  naostrzenie: {
    id: "naostrzenie",
    label: "Naostrzenie",
    category: "biala",
    price: 20,
    weight: 0,
    requiresProperties: [],
    requiresWeaponTypes: ["biala"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["direct"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 1,
    damageBonus: 1,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  dociazone: {
    id: "dociazone",
    label: "Dociążenie",
    category: "biala",
    price: 20,
    weight: 0,
    requiresProperties: [],
    requiresDamageTypes: ["bludgeoning"], // broń obuchowa
    requiresWeaponTypes: ["biala"],
    requiresAddons: [],
    exclusiveWith: ["przekucie"],
    usesSMSlot: false,
    applyMode: ["property", "flag-only"],
    grantProperties: ["obalajaca"], // Utrudnienie w RO przeciwko Powaleniu
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  dozownik: {
    id: "dozownik",
    label: "Dozownik",
    category: "biala",
    price: 40,
    weight: 0.05,
    requiresProperties: [],
    requiresDamageTypes: ["piercing"],  // tylko broń kłuta
    requiresWeaponTypes: ["biala"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  przekucie: {
    id: "przekucie",
    label: "Przekucie",
    category: "biala",
    price: 40,
    weight: 0,
    requiresProperties: [],
    requiresWeaponTypes: ["biala"],
    requiresAddons: [],
    exclusiveWith: ["dociazone"],
    usesSMSlot: false,
    applyMode: ["property"],
    grantProperties: ["lgt"],
    removeProperties: ["two"], // usuń Dwuręczna jeśli obecna
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  szoker: {
    id: "szoker",
    label: "Szoker",
    category: "biala",
    price: 50,
    weight: 0.15,
    requiresProperties: [],
    requiresWeaponTypes: ["biala"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["property"],
    grantProperties: ["porazajaca"],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  utwardzenie: {
    id: "utwardzenie",
    label: "Utwardzenie",
    category: "biala",
    price: 30,
    weight: 0,
    requiresProperties: [],
    requiresWeaponTypes: ["biala"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  wywazone: {
    id: "wywazone",
    label: "Wyważenie",
    category: "biala",
    price: 20,
    weight: 0,
    requiresProperties: ["thr"], // broń rzucana
    requiresWeaponTypes: ["biala", "miotana"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["range-x2"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  /* ========================================================================
   * BROŃ DYSTANSOWA
   * ====================================================================== */

  szyna: {
    id: "szyna",
    label: "Szyna montażowa",
    category: "dystansowa",
    price: 30,
    weight: 0.15,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: ["szyna"], // tylko jedna szyna per broń
    usesSMSlot: false,        // szyna nie zajmuje własnego slotu SM
    applyMode: ["property"],
    grantProperties: ["sm"],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  "uchwyt-bagnetu": {
    id: "uchwyt-bagnetu",
    label: "Uchwyt bagnetu",
    category: "dystansowa",
    price: 10,
    weight: 0.05,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaPosr", "palnaDluga"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: true,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  bagnet: {
    id: "bagnet",
    label: "Bagnet",
    category: "dystansowa",
    price: 10,
    weight: 0.3,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaPosr", "palnaDluga"],
    requiresAddons: ["uchwyt-bagnetu"],
    exclusiveWith: [],
    usesSMSlot: false, // montowany na uchwycie bagnetu, nie na SM
    applyMode: ["activity"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  "celownik-optyczny": {
    id: "celownik-optyczny",
    label: "Celownik optyczny",
    category: "dystansowa",
    price: 40,
    weight: 0.3,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: ["kolimator"],
    usesSMSlot: true,
    applyMode: ["conditional"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
    conditionalBonus: {
      type: "range-zone",
      normalBonus: 0,
      longBonus: 2,
    },
  },

  kolimator: {
    id: "kolimator",
    label: "Kolimator + baterie",
    category: "dystansowa",
    price: 50,
    weight: 0.15,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: ["celownik-optyczny", "celownik-trytowy"],
    usesSMSlot: true,
    applyMode: ["conditional"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
    conditionalBonus: {
      type: "range-zone",
      normalBonus: 2,
      longBonus: 0,
    },
  },

  "celownik-trytowy": {
    id: "celownik-trytowy",
    label: "Celownik trytowy",
    category: "dystansowa",
    price: 20,
    weight: 0.05,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaKrotka"],
    requiresAddons: [],
    exclusiveWith: ["kolimator", "celownik-optyczny"],
    usesSMSlot: false,
    applyMode: ["conditional"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
    conditionalBonus: {
      type: "no-sight",  // +1 tylko gdy brak innych przyrządów celowniczych
      normalBonus: 1,
      longBonus: 1,
    },
  },

  "laserowy-wskaznik": {
    id: "laserowy-wskaznik",
    label: "Laserowy wskaźnik celu",
    category: "dystansowa",
    price: 60,
    weight: 0.1,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: true,
    applyMode: ["direct", "flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 1,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  dwojnog: {
    id: "dwojnog",
    label: "Dwójnóg",
    category: "dystansowa",
    price: 30,
    weight: 0.6,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: ["trojnog"],
    usesSMSlot: true,
    applyMode: ["conditional", "flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
    conditionalBonus: {
      type: "setup",
      setupKey: "dwojnog",
      setupBonus: 1,
    },
  },

  trojnog: {
    id: "trojnog",
    label: "Trójnóg",
    category: "dystansowa",
    price: 40,
    weight: 1.2,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaCiezka", "specjalna"],
    requiresAddons: [],
    exclusiveWith: ["dwojnog"],
    usesSMSlot: true,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
    // Trójnóg bonus (+2 ST DS) obsługiwany bezpośrednio w fire-modes.mjs
  },

  "chwyt-przedni": {
    id: "chwyt-przedni",
    label: "Chwyt przedni",
    category: "dystansowa",
    price: 20,
    weight: 0.15,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: true,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
    // Bonus (+1 ST DS) obsługiwany w fire-modes.mjs
  },

  "kolba-dostawna": {
    id: "kolba-dostawna",
    label: "Kolba dostawna",
    category: "dystansowa",
    price: 20,
    weight: 0.35,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["direct"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 9,
    rangeLongBonus: 18,
  },

  powiekszalnik: {
    id: "powiekszalnik",
    label: "Powiększalnik",
    category: "dystansowa",
    price: 60,
    weight: 0.2,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: true,
    applyMode: ["direct"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 18,
    rangeLongBonus: 36,
  },

  "kolba-skladana": {
    id: "kolba-skladana",
    label: "Kolba składana",
    category: "dystansowa",
    price: 30,
    weight: 0.2,
    requiresProperties: ["dluga"],
    requiresWeaponTypes: ["palnaDluga"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
    // Toggle state managed separately in addons.mjs via flags.setup.kolbaSkladana
  },

  tlumik: {
    id: "tlumik",
    label: "Tłumik",
    category: "dystansowa",
    price: 60,
    weight: 0.25,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["property"],
    grantProperties: ["cicha"],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  granatnik: {
    id: "granatnik",
    label: "Granatnik podwieszany",
    category: "dystansowa",
    price: 70,
    weight: 0.8,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: ["srutowka-podlufowa"],
    usesSMSlot: true,
    applyMode: ["activity"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  "srutowka-podlufowa": {
    id: "srutowka-podlufowa",
    label: "Śrutówka podlufowa",
    category: "dystansowa",
    price: 50,
    weight: 0.5,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: ["granatnik"],
    usesSMSlot: true,
    applyMode: ["activity"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  noktowizor: {
    id: "noktowizor",
    label: "Noktowizor",
    category: "dystansowa",
    price: 100,
    weight: 0.35,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: ["termowizor"],
    usesSMSlot: true,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  termowizor: {
    id: "termowizor",
    label: "Termowizor",
    category: "dystansowa",
    price: 200,
    weight: 0.4,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: ["noktowizor"],
    usesSMSlot: true,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  latarka: {
    id: "latarka",
    label: "Latarka + baterie",
    category: "dystansowa",
    price: 35,
    weight: 0.15,
    requiresProperties: ["sm"],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: true,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  okladziny: {
    id: "okladziny",
    label: "Okładziny uchwytu",
    category: "dystansowa",
    price: 20,
    weight: 0.05,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },

  konwersja: {
    id: "konwersja",
    label: "Konwersja komory i lufy",
    category: "dystansowa",
    price: 60,
    weight: 0.1,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
    // After install: opens ammo caliber change dialog immediately
    openCaliberChangeOnInstall: true,
  },

  "zestaw-sprezyn": {
    id: "zestaw-sprezyn",
    label: "Zestaw sprężyn",
    category: "dystansowa",
    price: 40,
    weight: 0.05,
    requiresProperties: [],
    requiresWeaponTypes: ["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"],
    requiresAddons: [],
    exclusiveWith: [],
    usesSMSlot: false,
    applyMode: ["flag-only"],
    grantProperties: [],
    removeProperties: [],
    attackBonus: 0,
    damageBonus: 0,
    rangeNormalBonus: 0,
    rangeLongBonus: 0,
  },
};

/** Flat array of all addon definitions. */
export const ADDON_LIST = Object.values(ADDON_DEFS);

/** Sight addons that are mutually exclusive — used by "no-sight" conditional. */
export const SIGHT_ADDON_IDS = new Set([
  "celownik-optyczny",
  "kolimator",
  "celownik-trytowy",
  "laserowy-wskaznik",
  "noktowizor",
  "termowizor",
]);

/**
 * Returns true if the weapon item has this addon installed.
 * @param {Item5e} weapon
 * @param {string} addonId
 */
export function hasAddon(weapon, addonId) {
  const addons = weapon?.getFlag("neuroshima-2026-overrides", "addons") ?? [];
  return addons.some(a => a.id === addonId);
}

/**
 * Returns the installed addon record, or undefined.
 * @param {Item5e} weapon
 * @param {string} addonId
 * @returns {{ id: string, delta: object }|undefined}
 */
export function getAddon(weapon, addonId) {
  const addons = weapon?.getFlag("neuroshima-2026-overrides", "addons") ?? [];
  return addons.find(a => a.id === addonId);
}

/**
 * Returns all installed addon records on a weapon.
 * @param {Item5e} weapon
 * @returns {Array<{ id: string, delta: object }>}
 */
export function getAddons(weapon) {
  return weapon?.getFlag("neuroshima-2026-overrides", "addons") ?? [];
}

/**
 * How many SM-slot-using addons are currently installed on the weapon.
 * @param {Item5e} weapon
 */
export function countSMSlots(weapon) {
  return getAddons(weapon).filter(a => ADDON_DEFS[a.id]?.usesSMSlot).length;
}
