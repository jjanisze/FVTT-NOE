/**
 * Neuroshima 5e — override konfiguracji ekwipunku ochronnego.
 *
 * Świadomie NIE zawężamy schematu DataModelu (ARCHITECTURE.md §2). Kategorie
 * pancerza zostają na natywnych kluczach dnd5e, bo `CONFIG.DND5E.armorTypes`
 * bramkuje liczenie TT w `data/actor/templates/attributes.mjs` — własne klucze
 * po prostu wypadłyby z mechaniki. Zmieniamy etykiety i chowamy z UI typy,
 * których w Neuroshimie nie ma.
 *
 * `equipmentTypes` to płaska kopia `{...miscEquipmentTypes, ...armorTypes}`
 * robiona raz przy ładowaniu systemu, więc mutujemy wszystkie trzy obiekty.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Kategorie pancerza — klucze natywne, etykiety nasze. */
const NEURO_ARMOR_TYPES = {
  light: "Pancerz lekki",
  medium: "Pancerz średni",
  heavy: "Pancerz ciężki",
  natural: "Pancerz naturalny",
  shield: "Tarcza",
};

/** Reszta ekwipunku noszonego. Fantasy (ring/rod/wand/wondrous/vehicle) wylatuje. */
const NEURO_MISC_EQUIPMENT_TYPES = {
  clothing: "Odzież",
  trinket: "Akcesorium",
};

/** Kategorie biegłości w pancerzu — klucze natywne, etykiety po polsku. */
const NEURO_ARMOR_PROFICIENCIES = {
  lgt: "Pancerz lekki",
  med: "Pancerz średni",
  hvy: "Pancerz ciężki",
  shl: "Tarcze",
};

/** Właściwości ekwipunku specyficzne dla Neuroshimy. */
const NEURO_ARMOR_PROPERTIES = {
  prog_obrazen: {
    label: "Próg obrażeń",
    abbreviation: "PO",
    isPhysical: false,
  },
  odpornosc_kinetyczna: {
    label: "Odporność kinetyczna",
    abbreviation: "OK",
    isPhysical: false,
  },
  szczelnosc: {
    label: "Szczelność",
    abbreviation: "SZ",
    isPhysical: false,
  },
};

const ARMOR_PROPERTY_TOOLTIPS = {
  stealthDisadvantage: "Utrudnienie do Testów Zręczności (Skradanie się) oraz do Testów "
    + "Siły (Atletyka) przy pływaniu. Moduł automatyzuje wyłącznie Skradanie się.",
  prog_obrazen: "Obrażenia cięte, kłute i obuchowe poniżej progu są całkowicie pochłaniane. "
    + "Inne typy obrażeń przechodzą normalnie.",
  odpornosc_kinetyczna: "Odporność na obrażenia cięte, kłute i obuchowe.",
  szczelnosc: "Akcją można uruchomić system uszczelniający. Zapas tlenu na 1 godzinę.",
};

/* -------------------------------------------- */

function patchArmorTypes() {
  // 1. Kategorie pancerza — tylko etykiety. Kluczy nie ruszamy, bo od nich
  //    zależy `EquipmentData#isArmor` i całe liczenie TT.
  Object.assign(CONFIG.DND5E.armorTypes, NEURO_ARMOR_TYPES);

  // 2. Pozostały ekwipunek noszony — tu podmieniamy komplet.
  for (const k of Object.keys(CONFIG.DND5E.miscEquipmentTypes)) {
    delete CONFIG.DND5E.miscEquipmentTypes[k];
  }
  Object.assign(CONFIG.DND5E.miscEquipmentTypes, NEURO_MISC_EQUIPMENT_TYPES);

  // 3. `equipmentTypes` to osobna, spłaszczona kopia — trzeba ją przebudować.
  for (const k of Object.keys(CONFIG.DND5E.equipmentTypes)) delete CONFIG.DND5E.equipmentTypes[k];
  Object.assign(CONFIG.DND5E.equipmentTypes, NEURO_MISC_EQUIPMENT_TYPES, NEURO_ARMOR_TYPES);

  // 4. Biegłości — etykiety po polsku. Mapa typ→biegłość zostaje natywna,
  //    bo klucze się nie zmieniły.
  Object.assign(CONFIG.DND5E.armorProficiencies, NEURO_ARMOR_PROFICIENCIES);

  // 5. Konkretne pancerze SRD (skórznia, kolczuga, płytówka…) nie istnieją
  //    w Neuroshimie — tak samo jak wcześniej `weaponIds`.
  for (const k of Object.keys(CONFIG.DND5E.armorIds)) delete CONFIG.DND5E.armorIds[k];
  for (const k of Object.keys(CONFIG.DND5E.shieldIds)) delete CONFIG.DND5E.shieldIds[k];
}

/* -------------------------------------------- */

/** Dopisuje podpowiedzi do checkboxów właściwości na karcie ekwipunku. */
function onRenderItemSheetArmorTooltips(app, html, _data) {
  if (app.document?.type !== "equipment") return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  for (const [key, tooltip] of Object.entries(ARMOR_PROPERTY_TOOLTIPS)) {
    const input = root.querySelector(`[name="system.properties"][value="${key}"]`);
    const label = input?.closest("label");
    if (!label) continue;
    label.dataset.tooltip = tooltip;
    label.dataset.tooltipDirection = "UP";
  }
}

/* -------------------------------------------- */

export function registerArmor() {
  patchArmorTypes();
  // Tłumaczenia (dnd5e-pl) i inne moduły potrafią nadpisać listy później.
  Hooks.once("setup", patchArmorTypes);
  Hooks.once("i18nInit", patchArmorTypes);

  // Właściwości Neuroshimy dokładamy, nie podmieniamy — istniejące itemy
  // odwołują się do kluczy dnd5e.
  Object.assign(CONFIG.DND5E.itemProperties, NEURO_ARMOR_PROPERTIES);
  Object.assign(CONFIG.DND5E.itemProperties.stealthDisadvantage, { label: "Utrudnia skradanie" });

  CONFIG.DND5E.validProperties.equipment = new Set([
    ...CONFIG.DND5E.validProperties.equipment,
    ...Object.keys(NEURO_ARMOR_PROPERTIES),
  ]);

  Hooks.on("renderItemSheet5e", onRenderItemSheetArmorTooltips);

  console.log("Neuroshima 5e | Armor config overrides applied");
}
