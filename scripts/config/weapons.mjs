/**
 * Neuroshima 5e — Weapon system overrides.
 *
 * - Replace dnd5e weapon types with Neuroshima categories
 * - Add full Neuroshima weapon properties from the rulebook
 * - Filter displayed properties per weapon category (melee / thrown / palna*)
 * - Clear item rarity, clear fantasy validProperties
 */

import { WEAPON_ICONS, WEAPON_NAME_ALIASES } from "./weapons-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Weapon types                                  */
/* -------------------------------------------- */

const NEURO_WEAPON_TYPES = {
  biala:        "Broń biała",
  miotana:      "Broń miotana",
  palnaKrotka:  "Broń palna krótka",
  palnaPosr:    "Broń palna pośrednia",
  palnaDluga:   "Broń palna długa",
  palnaCiezka:  "Broń palna ciężka",
  specjalna:    "Broń specjalna",
};

const NEURO_WEAPON_TYPE_MAP = {
  biala:        "melee",
  miotana:      "ranged",
  palnaKrotka:  "ranged",
  palnaPosr:    "ranged",
  palnaDluga:   "ranged",
  palnaCiezka:  "ranged",
  specjalna:    "ranged",
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

  // Broń Miotana — thrown / non-firearm ranged (axes, knives, bows, crossbows)
  miotana: new Set([
    "fin",            // Finezyjna
    "lgt",            // Lekka
    "thr",            // Rzucana
    "two",            // Dwuręczna (łuki, kusze, proca)
    "wmag",           // Magazynek wewnętrzny (kusze automatyczne)
    "burzaca", "cicha", "ladowanie", "obalajaca", "powracajaca",
    "przebijajaca", "przeladowanie", "sm", "unieruchamiajaca",
  ]),

  // Palna Krótka — pistols, pocket SMGs
  palnaKrotka: new Set([
    "amm", "wmag", "beb",
    "tryb_p", "tryb_ks", "tryb_oz",
    "cicha", "co", "dublet", "jednorazowa", "ladowanie",
    "obalajaca", "poreczna", "ppanc", "przeladowanie", "sm",
  ]),

  // Palna Pośrednia — rifles, shotguns, standard SMGs
  palnaPosr: new Set([
    "amm", "wmag", "beb",
    "tryb_p", "tryb_ks", "tryb_ds", "tryb_oz",
    "cicha", "co", "dluga", "dublet", "jednorazowa", "ladowanie",
    "obalajaca", "poreczna", "ppanc", "przeladowanie", "sm",
  ]),

  // Palna Długa — sniper rifles, designated marksman rifles
  palnaDluga: new Set([
    "amm", "wmag", "beb",
    "tryb_p", "tryb_ks", "tryb_ds", "tryb_oz",
    "cicha", "ciezka", "co", "dluga", "dublet", "jednorazowa", "ladowanie",
    "obalajaca", "ppanc", "przeladowanie", "sm",
  ]),

  // Palna Ciężka — machine guns, rocket launchers, heavy support weapons
  palnaCiezka: new Set([
    "amm", "wmag", "beb",
    "tryb_p", "tryb_ks", "tryb_ds", "tryb_ms", "tryb_oz",
    "burzaca", "cicha", "ciezka", "co", "dluga", "dublet", "jednorazowa", "ladowanie",
    "obalajaca", "ppanc", "przeladowanie", "sm",
  ]),

  // Broń specjalna — mortars, flamethrowers, etc.
  specjalna: new Set([
    "amm", "wmag", "beb", "tryb_p",
    "burzaca", "ciezka", "dluga", "ladowanie", "obalajaca", "ppanc", "przeladowanie", "sm", "zasilana", "spalinowa",
  ]),
};

/** Union of all per-type sets — master validProperties.weapon set. */
const ALL_WEAPON_PROPERTIES = new Set(
  Object.values(WEAPON_TYPE_PROPERTIES).flatMap(s => [...s])
);

/* -------------------------------------------- */
/*  Weapon → icon map                             */
/* -------------------------------------------- */

/**
 * Canonical name → icon filename (in icons/weapons/) for every Neuroshima weapon.
 * Derived from `weapons-data.mjs` so the pack, the Zbrojownia generator and this
 * hook can never disagree. Aliases cover items still stored under pre-unification
 * names ("Bejsbol", "Trzydziestka", "AK", …).
 */
const WEAPON_ICON_MAP = {
  ...WEAPON_ICONS,
  ...Object.fromEntries(
    Object.entries(WEAPON_NAME_ALIASES).map(([legacy, canonical]) => [legacy, WEAPON_ICONS[canonical]])
  ),
};

/** Default fallback icons per weapon type (when name is not in WEAPON_ICON_MAP). */
const WEAPON_TYPE_DEFAULT_ICONS = {
  biala:        "machete.svg",
  miotana:      "javelin.svg",
  palnaKrotka:  "semi_auto_pistol.svg",
  palnaPosr:    "submachinegun.svg",
  palnaDluga:   "bolt_action_rifle.svg",
  palnaCiezka:  "heavy_machine_gun.svg",
  specjalna:    "flamethrower.svg",
};

const DEFAULT_DND5E_WEAPON_ICON = "systems/dnd5e/icons/svg/items/weapon.svg";

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
/*  Tooltips for weapon properties                */
/* -------------------------------------------- */

const WEAPON_PROPERTY_TOOLTIPS = {
  // Palna i wspólne
  co: "Broń jest fabrycznie wyposażona w celownik optyczny i posiada związane z nim właściwości.",
  cicha: "Pomaga ukryć pozycję. Atakując niewidocznym, nie tracisz Niewidoczności wobec celów dalej niż 18m.",
  ciezka: "Wymaga dwójnogu, trójnogu lub Siły 15+. Inaczej ataki z Utrudnieniem, a cele mają Ułatwienie do RO przeciw seriom.",
  dluga: "Posiada długą lufę. Strzelanie do istot w promieniu 3m to Utrudnienie do ataku (chyba że cel ma Szybkość 0).",
  dublet: "Pozwala wystrzelić dwa pociski naraz. Jeden Test Ataku, w przypadku trafienia podwójne kości obrażeń.",
  jednorazowa: "Z broni można wystrzelić tylko raz; nie da się do niej załadować ponownie amunicji.",
  ladowanie: "Wymaga załadowania po każdym strzale (kosztuje akcję Używanie lub Akcję Bonusową).",
  obalajaca: "Może posłużyć do powalenia celu (max średni). RO na Siłę o ST 10 (inaczej Powalenie).",
  poreczna: "Z broni można strzelać jedną ręką bez Utrudnienia do ataku.",
  przeladowanie: "Trzeba przeładować po strzale. Wymaga darmowej interakcji lub Akcji Bonusowej.",
  ppanc: "Przeciwpancerna. Ignoruje Odporności na obrażenia i Progi obrażeń.",
  sm: "Szyna montażowa. Do broni można zamontować ulepszenia.",
  wmag: "Magazynek wewnętrzny, niewymienny. Załadowanie pojedynczego naboju to akcja Używanie.",
  beb: "Bębenek. Przeładowanie całego bębenka lub jednego naboju to akcja Używanie.",
  tryb_p: "Podstawowy ogień pojedynczy. Możesz strzelać tyle razy, ile masz ataków w turze.",
  tryb_ks: "Krótka seria [Akcja]. 3 naboje. Test z Utrudnieniem. Obrażenia k. broni x3 (bez mod. z atrybutów/biegłości).",
  tryb_ds: "Długa seria [Akcja]. Min 10 naboi. Linia 1.5x36m. RO Zręczność. Połowa obrażeń przy sukcesie.",
  tryb_ms: "Miażdżąca seria [Akcja]. Linia 3x150m. RO Zręczność (połowa) i RO Siła (obalenie).",
  tryb_oz: "Ogień zaporowy [Akcja]. Min 6 naboi. RO Mądrość. Porażka: brak akcji i akcji bonusowych w nast. turze.",
  
  // Biała i Miotana
  burzaca: "Broń zadaje podwójne obrażenia obiektom.",
  two: "Dwuręczna. Wymaga dwóch rąk do ataku.",
  fin: "Finezyjna. Do Testu Ataku i obrażeń dodajesz Zręczność albo Siłę.",
  karczujaca: "Zadaje podwójne obrażenia (cięte) roślinom i przedmiotom wykonanym z drewna.",
  lgt: "Lekka. Pozwala na dodatkowy atak w drugiej ręce jako Akcja Bonusowa.",
  ver: "Oburęczna (Versatile). Trzymając dwiema rękami zadajesz zwiększone obrażenia.",
  porazajaca: "Trafiona istota musi zdać RO na Kondycję o ST 10, inaczej otrzymuje stan Powalenie.",
  powalajaca: "Cele max Duże przy obrażeniach obuchowych muszą zdać RO na Siłę (ST 8+Sił+PB) albo są Powalone.",
  przebijajaca: "Ignoruje odporność na obrażenia i Próg obrażeń.",
  powracajaca: "Wraca do rzucającego na końcu jego tury, można bezpiecznie złapać jedną wolną ręką.",
  thr: "Rzucana. Atak dystansowy korzystający z cechy ataku wręcz tej broni.",
  spalinowa: "Wymaga paliwa i akcji Używanie by ją włączyć. 0.5 litra starcza na 30min.",
  unieruchamiajaca: "Zamiast obrażeń narzuca (na Śr/Duży cel) RO na Zręczność. Porażka = Unieruchomienie (Escape DC ten sam).",
  rch: "Zasięgowa. Pozwala zaatakować w walce wręcz istoty odległe o 3 metry.",
  zasilana: "Wymaga prądu. Zwykła bateria pozwala na ~5 ataków.",
};

function onRenderItemSheetWeaponTooltips(app, html, data) {
  // W V12 dla ApplicationV2 html to HTMLElement, ale może być jQuery array.
  const el = html instanceof HTMLElement ? html : html[0];
  if (!el) return;

  const item = app.document ?? app.item;
  if (item?.type !== "weapon") return;

  // W V12 (ApplicationV2) używane są komponenty <dnd5e-checkbox> zamiast zwykłych <input>.
  // Dla kompatybilności wstecznej (V1) zostawiamy też zwykłe inputy.
  const propCheckboxes = el.querySelectorAll('dnd5e-checkbox[name^="system.properties."], input[type="checkbox"][name="system.properties"]');
  
  propCheckboxes.forEach(checkbox => {
    let propName = checkbox.value;
    if (checkbox.tagName.toLowerCase() === 'dnd5e-checkbox') {
      // name="system.properties.cicha" -> wyciągamy ostatni człon
      propName = checkbox.getAttribute('name').split('.').pop();
    }
    
    const tooltip = WEAPON_PROPERTY_TOOLTIPS[propName];
    if (tooltip) {
      // Przeważnie dnd5e-checkbox znajduje się wewnątrz <label class="checkbox">...
      const label = checkbox.closest('label');
      if (label) {
        label.setAttribute('data-tooltip', tooltip);
        label.setAttribute('data-tooltip-direction', 'UP');
      }
    }
  });
}

/* -------------------------------------------- */
/*  Public registration                           */
/* -------------------------------------------- */

export function registerWeapons() {
  const patchWeaponTypes = () => {
    // 1. Replace weapon types with Neuroshima categories.
    // We must mutate the existing objects because DataModels cache their references.
    for (const k of Object.keys(CONFIG.DND5E.weaponTypes)) delete CONFIG.DND5E.weaponTypes[k];
    Object.assign(CONFIG.DND5E.weaponTypes, NEURO_WEAPON_TYPES);

    for (const k of Object.keys(CONFIG.DND5E.weaponTypeMap)) delete CONFIG.DND5E.weaponTypeMap[k];
    Object.assign(CONFIG.DND5E.weaponTypeMap, NEURO_WEAPON_TYPE_MAP);

    // 1a. Replace weapon proficiency categories with Neuroshima weapon types.
    //     These appear in the character sheet's weapon proficiency picker.
    for (const k of Object.keys(CONFIG.DND5E.weaponProficiencies)) delete CONFIG.DND5E.weaponProficiencies[k];
    Object.assign(CONFIG.DND5E.weaponProficiencies, NEURO_WEAPON_TYPES);  // same labels

    // 1b. Each weapon type maps to its own proficiency category (1-to-1).
    for (const k of Object.keys(CONFIG.DND5E.weaponProficienciesMap)) delete CONFIG.DND5E.weaponProficienciesMap[k];
    for (const k of Object.keys(NEURO_WEAPON_TYPES)) CONFIG.DND5E.weaponProficienciesMap[k] = k;

    // 1c. Clear individual SRD weapon IDs — Neuroshima doesn't use compendium weapon subtypes.
    for (const k of Object.keys(CONFIG.DND5E.weaponIds)) delete CONFIG.DND5E.weaponIds[k];

    for (const k of Object.keys(CONFIG.DND5E.weaponClassificationMap)) delete CONFIG.DND5E.weaponClassificationMap[k];

    // 1b. Remove the blank option from the weapon type select.
    //     ItemTypeField defines type.value with blank:true (allows empty selection).
    //     In Neuroshima every weapon must have a type — blank is meaningless.
    //     We patch the schema field directly since it's the same object formField reads.
    const typeValueField = CONFIG.Item?.dataModels?.weapon?.schema?.fields?.type?.fields?.value;
    if (typeValueField) {
      typeValueField.blank = false;
    }
  };

  // Run on init
  patchWeaponTypes();
  // Run on later hooks just in case other modules (like dnd5e-pl translation) overwrite the lists later
  Hooks.once("setup", patchWeaponTypes);
  Hooks.once("i18nInit", patchWeaponTypes);

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
  Object.assign(CONFIG.DND5E.itemProperties.amm, { label: "Mag. (wymienny)" });

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
  Hooks.on("renderItemSheet5e", onRenderItemSheetWeaponTooltips);

  // 8. Auto-assign weapon icons on item creation.
  //    Intercepts new weapon items that still have the dnd5e default icon and
  //    replaces it with the canonical Neuroshima icon (by name, or type fallback).
  Hooks.on("preCreateItem", (item, _data, _options, _userId) => {
    if (item.type !== "weapon") return;
    if (item.img && item.img !== DEFAULT_DND5E_WEAPON_ICON) return; // already has a custom icon

    const named = WEAPON_ICON_MAP[item.name];
    const byType = WEAPON_TYPE_DEFAULT_ICONS[item.system?.type?.value];
    const file = named ?? byType;
    if (file) {
      item.updateSource({ img: `modules/${MODULE_ID}/icons/weapons/${file}` });
    }
  });

  console.log("Neuroshima 5e | Weapon config overrides applied");
}
