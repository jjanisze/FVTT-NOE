/**
 * Neuroshima 5e — crafting-output placeholders ("Produkcja" links).
 *
 * Toolkit items (Narzędzia małego X) list what they can produce in their
 * description, matching 5e-2024's "Craft:" line on stock tool items (Smith's
 * Tools → Ball Bearings, Caltrops, Crowbar, …), which renders as a row of
 * `@UUID[]{}` content-links with icons.
 *
 * Most of Neuroshima's listed outputs (per `Tabele/Narzedzia.md`) have no real
 * Item yet — no weight/price/ST, because the crafting system itself (recipes,
 * materials, time) is not built. Rather than leave those as dead text forever,
 * this module creates minimal STUB Items — link targets only, visibly and
 * explicitly marked TODO — so the toolkit description can link to *something*
 * real (with its icon) today, without inventing crafting rules we don't have.
 *
 * TODO(crafting-window): once a real crafting UI exists, these stubs are the
 * items it should point at — fill in real stats/rules then, and drop the TODO
 * banner from `_gearDescription()` below. Until then these are placeholders,
 * not usable items — do not price or equip them as if they were real gear.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Core Foundry icon used to make "this is a stub" visually obvious at a glance. */
const TODO_ICON = "icons/svg/hazard.svg";

/**
 * @typedef {object} GearPlaceholder
 * @property {string} id     Key used to look this item up from toolkit produkcja links.
 * @property {string} label  Display name.
 */

/**
 * `icon` is set only once real art exists for that id (batch 35, 2026-08-29) —
 * everything else still falls back to `TODO_ICON` below. Not a statement that
 * the item itself is "finished"; see the file header — pricing/weight/ST for
 * these still don't exist, only the picture stopped being a TODO triangle.
 */
export const GEAR_PLACEHOLDERS = [
  { id: "belty", label: "Bełty", icon: "belty.svg" },
  { id: "igly", label: "Igły", icon: "igly.svg" },
  { id: "klodka", label: "Kłódka", icon: "klodka.svg" },
  { id: "kolczatki", label: "Kolczatki", icon: "kolczatki.svg" },
  { id: "lom", label: "Łom", icon: "lom.svg" },
  { id: "lopata", label: "Łopata", icon: "lopata.svg" },
  { id: "podkowy", label: "Podkowy", icon: "podkowy.svg" },
  { id: "plyty_pancerne", label: "Płyty pancerne", icon: "plyty_pancerne.svg" },
  { id: "sidla", label: "Sidła" },
  { id: "sprzet_wspinaczkowy", label: "Sprzęt do wspinaczki" },
  { id: "strzaly", label: "Strzały" },
  { id: "wozek", label: "Wózek" }
];

function _gearDescription(label) {
  return `<p><strong>⚠ TODO (crafting):</strong> „${label}" to tymczasowy placeholder — link docelowy dla `
    + `sekcji „Produkcja" narzędzi rzemieślniczych, dopóki nie powstanie właściwy system craftingu `
    + `(surowce, czas, ST) i wynikająca z niego cena/waga. Nie traktować jako gotowy, wyceniony przedmiot.</p>`;
}

/** Build the bare Item data for one gear placeholder. */
export function buildGearItemData(gear) {
  return {
    name: gear.label,
    type: "loot",
    img: gear.icon ? `modules/${MODULE_ID}/icons/items/loot/${gear.icon}` : TODO_ICON,
    system: {
      description: { value: _gearDescription(gear.label) },
      quantity: 1
    },
    flags: { [MODULE_ID]: { craftingPlaceholder: true, gearId: gear.id } }
  };
}

/**
 * Create (or refresh) the gear-placeholder stub items on the given actor (by
 * default the Zbrojownia master). Upserts by the `gearId` flag.
 * @param {Actor} [actor]
 * @returns {Promise<Map<string, Item>>} gearId → the resulting Item.
 */
export async function createGearPlaceholders(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if ( !actor ) {
    ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia).");
    return new Map();
  }

  const result = new Map();
  for ( const gear of GEAR_PLACEHOLDERS ) {
    const data = buildGearItemData(gear);
    let item = actor.items.find(i => i.getFlag(MODULE_ID, "gearId") === gear.id);
    if ( item ) await item.update(data);
    else [item] = await actor.createEmbeddedDocuments("Item", [data]);
    result.set(gear.id, item);
  }
  return result;
}
