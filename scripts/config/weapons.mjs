/**
 * Neuroshima 5e — Weapon system overrides.
 *
 * - Replace dnd5e weapon types with Neuroshima categories
 * - Add full Neuroshima weapon properties from the rulebook
 * - Filter displayed properties per weapon category (melee / thrown / palna*)
 * - Clear item rarity, clear fantasy validProperties
 */

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Weapon types                                  */
/* -------------------------------------------- */

const NEURO_WEAPON_TYPES = {
  biala:        "Broń Biała",
  miotana:      "Broń Miotana",
  palnaKrotka:  "Palna Krótka",
  palnaPosr:    "Palna Pośrednia",
  palnaDluga:   "Palna Długa",
  palnaCiezka:  "Palna Ciężka",
};

const NEURO_WEAPON_TYPE_MAP = {
  biala:        "melee",
  miotana:      "ranged",
  palnaKrotka:  "ranged",
  palnaPosr:    "ranged",
  palnaDluga:   "ranged",
  palnaCiezka:  "ranged",
};

/* -------------------------------------------- */
/*  Weapon properties — Neuroshima additions      */
/* -------------------------------------------- */

/**
 * New properties to add to CONFIG.DND5E.itemProperties.
 *
 * NEVER delete existing dnd5e keys — items in the DB store those keys and
 * the item sheet crashes looking up missing labels.
 * Fantasy properties (ada, mgc, etc.) are excluded from validProperties.weapon
 * so they never appear in the multi-checkbox UI.
 */
const NEURO_WEAPON_PROPERTIES = {
  // --- Melee -------------------------------------------------------
  karczujaca:        { label: "Karczująca" },       // double damage vs plants/wood
  porazajaca:        { label: "Porażająca" },        // con save ST10 or prone
  powalajaca:        { label: "Powalająca" },        // str save or knocked down (bludgeoning)
  przebijajaca:      { label: "Przebijająca" },      // ignores resistance and damage threshold
  spalinowa:         { label: "Spalinowa" },         // requires fuel (action to start)
  zasilana:          { label: "Zasilana" },          // requires electrical power
  unieruchamiajaca:  { label: "Unieruchamiająca" },  // restrains target on hit
  burzaca:           { label: "Burząca" },           // double damage vs objects

  // --- Shared (melee + thrown) ------------------------------------
  obalajaca:         { label: "Obalająca" },         // str save ST10 or knocked down

  // --- Thrown (miotana) -------------------------------------------
  powracajaca:       { label: "Powracająca" },       // weapon returns at end of turn

  // --- All ranged --------------------------------------------------
  cicha:             { label: "Cicha" },             // silent; doesn't break invisibility at 18m+
  ppanc:             { label: "Ppanc." },            // ignores resistance & damage threshold

  // --- Firearms (palna*) only ------------------------------------
  wmag:              { label: "Wmag." },             // internal magazine (non-removable)
  beb:               { label: "Bęb." },              // revolver cylinder
  tryb_p:            { label: "P" },                 // ogień pojedynczy
  tryb_ks:           { label: "KS" },                // krótka seria (3 rounds)
  tryb_ds:           { label: "DS" },                // długa seria (10–30 rounds)
  tryb_ms:           { label: "MS" },                // miażdżąca seria
  tryb_oz:           { label: "OZ" },                // ogień zaporowy
  co:                { label: "CO" },                // celownik optyczny (factory-fitted scope)
  ciezka:            { label: "Ciężka" },            // bipod/STR 15+ required
  dluga:             { label: "Długa" },             // disadvantage within 3m
  dublet:            { label: "Dublet" },            // fire 2 rounds simultaneously
  jednorazowa:       { label: "Jednorazowa" },       // single-shot, cannot reload
  ladowanie:         { label: "Ładowanie" },         // action to load each round
  poreczna:          { label: "Poręczna" },          // one-handed, no disadvantage
  przeladowanie:     { label: "Przeładowanie" },     // reload after each shot (bonus action)
  sm:                { label: "SM" },                // szyna montażowa — mounting rail

  // Kept in itemProperties for DB safety (items may have it stored),
  // but excluded from all validProperties sets so it never shows in UI.
  finezyjna:         { label: "Finezyjna (stare)" },
};

/* -------------------------------------------- */
/*  Per-type property filters                     */
/* -------------------------------------------- */

/**
 * Which properties are valid (visible in multi-checkbox) for each weapon category.
 * dnd5e property keys (fin, lgt, …) are included where they have mechanical meaning.
 */
const WEAPON_TYPE_PROPERTIES = {
  // Broń Biała — melee weapons
  biala: new Set([
    "fin",            // Finezyjna (dnd5e finesse — DEX for attack/damage)
    "lgt",            // Lekka (dnd5e light — dual-wield bonus action)
    "two",            // Dwuręczna (dnd5e two-handed)
    "ver",            // Oburęczna (dnd5e versatile damage die)
    "thr",            // Rzucana (dnd5e thrown — ranged attack with melee weapon)
    "rch",            // Zasięgowa (dnd5e reach — 3 m)
    "burzaca", "karczujaca", "porazajaca", "powalajaca",
    "przebijajaca", "spalinowa", "unieruchamiajaca", "zasilana",
  ]),

  // Broń Miotana — thrown / non-firearm ranged (axes, knives, grenades)
  miotana: new Set([
    "fin",            // Finezyjna
    "lgt",            // Lekka
    "thr",            // Rzucana
    "burzaca", "obalajaca", "powracajaca", "przebijajaca", "unieruchamiajaca",
  ]),

  // Palna Krótka — pistols, pocket SMGs
  palnaKrotka: new Set([
    "wmag", "beb",
    "tryb_p", "tryb_ks", "tryb_oz",
    "cicha", "co", "dublet", "jednorazowa", "ladowanie",
    "obalajaca", "poreczna", "ppanc", "przeladowanie", "sm",
  ]),

  // Palna Pośrednia — rifles, shotguns, standard SMGs
  palnaPosr: new Set([
    "wmag", "beb",
    "tryb_p", "tryb_ks", "tryb_ds", "tryb_oz",
    "cicha", "co", "dluga", "dublet", "jednorazowa", "ladowanie",
    "obalajaca", "poreczna", "ppanc", "przeladowanie", "sm",
  ]),

  // Palna Długa — sniper rifles, designated marksman rifles
  palnaDluga: new Set([
    "wmag", "beb",
    "tryb_p", "tryb_ks", "tryb_ds", "tryb_oz",
    "cicha", "ciezka", "co", "dluga", "jednorazowa", "ladowanie",
    "ppanc", "przeladowanie", "sm",
  ]),

  // Palna Ciężka — machine guns, rocket launchers, heavy support weapons
  palnaCiezka: new Set([
    "wmag", "beb",
    "tryb_p", "tryb_ks", "tryb_ds", "tryb_ms", "tryb_oz",
    "cicha", "ciezka", "co", "dluga", "dublet", "jednorazowa", "ladowanie",
    "obalajaca", "ppanc", "przeladowanie", "sm",
  ]),
};

/** Union of all per-type sets — master validProperties.weapon set. */
const ALL_WEAPON_PROPERTIES = new Set(
  Object.values(WEAPON_TYPE_PROPERTIES).flatMap(s => [...s])
);

/* -------------------------------------------- */
/*  Sheet context hook — filter per type          */
/* -------------------------------------------- */

/**
 * Filter context.properties.options before Handlebars renders the details tab.
 * Fires via dnd5e.prepareSheetContext (primary-sheet-mixin.mjs) for each sheet part.
 * Signature: (sheet, partId, context, options)
 *
 * This is safer than DOM manipulation because:
 *  - Fires synchronously before template render — no timing issues
 *  - context.properties.options is already populated from validProperties.weapon
 *  - Re-runs on every details re-render (e.g. when weapon type dropdown changes)
 */
function onPrepareSheetContext(sheet, partId, context, _options) {
  if (partId !== "details") return;

  const item = sheet.document ?? sheet.item;
  if (!item || item.type !== "weapon") return;

  const weaponType = item.system.type?.value ?? "";
  const validProps = WEAPON_TYPE_PROPERTIES[weaponType];
  if (!validProps) return;  // Unknown / blank type — show all (safe fallback)

  if (context.properties?.options) {
    context.properties.options = context.properties.options.filter(
      opt => validProps.has(opt.value)
    );
  }
}

/* -------------------------------------------- */
/*  Public registration                           */
/* -------------------------------------------- */

export function registerWeapons() {
  // 1. Replace weapon types with Neuroshima categories.
  CONFIG.DND5E.weaponTypes = NEURO_WEAPON_TYPES;
  CONFIG.DND5E.weaponTypeMap = NEURO_WEAPON_TYPE_MAP;
  CONFIG.DND5E.weaponProficienciesMap = {};
  CONFIG.DND5E.weaponClassificationMap = {};

  // 1b. Remove the blank option from the weapon type select.
  //     ItemTypeField defines type.value with blank:true (allows empty selection).
  //     In Neuroshima every weapon must have a type — blank is meaningless.
  //     We patch the schema field directly since it's the same object formField reads.
  const typeValueField = CONFIG.Item.dataModels.weapon?.schema?.fields?.type?.fields?.value;
  if (typeValueField) typeValueField.blank = false;

  // 2. Add Neuroshima properties to itemProperties.
  //    Do NOT delete existing dnd5e keys — DB items reference them.
  Object.assign(CONFIG.DND5E.itemProperties, NEURO_WEAPON_PROPERTIES);

  // 3. Relabel kept dnd5e properties to Polish.
  //    Labels are used directly (not as i18n keys) so plain strings work fine.
  Object.assign(CONFIG.DND5E.itemProperties.fin, { label: "Finezyjna" });
  Object.assign(CONFIG.DND5E.itemProperties.lgt, { label: "Lekka" });
  Object.assign(CONFIG.DND5E.itemProperties.two, { label: "Dwuręczna" });
  Object.assign(CONFIG.DND5E.itemProperties.ver, { label: "Oburęczna" });
  Object.assign(CONFIG.DND5E.itemProperties.thr, { label: "Rzucana" });
  Object.assign(CONFIG.DND5E.itemProperties.rch, { label: "Zasięgowa" });

  // 4. validProperties.weapon = union of all per-type sets.
  //    The render hook (below) then hides entries irrelevant to this weapon's type.
  CONFIG.DND5E.validProperties.weapon = ALL_WEAPON_PROPERTIES;

  // 5. Clear item rarity — not used in Neuroshima.
  CONFIG.DND5E.itemRarity = {};

  // 6. Add grams for small items / ammo.
  //    Do NOT delete lb/tn/ft/mi — items in the DB store those unit keys.
  CONFIG.DND5E.weightUnits.g = {
    label: "gram",
    abbreviation: "g",
    conversion: 0.001,
    type: "metric",
  };

  // 7. Filter properties per weapon type before Handlebars renders the details tab.
  Hooks.on("dnd5e.prepareSheetContext", onPrepareSheetContext);

  console.log("Neuroshima 5e | Weapon config overrides applied");
}
