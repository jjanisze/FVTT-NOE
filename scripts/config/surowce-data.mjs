/**
 * Neuroshima 5e — Surowce (raw crafting materials).
 *
 * Five tracked resource types that drive the crafting/production economy:
 *   CH  Chemia                  — explosives, medicines, ammo primers
 *   CE  Części elektroniczne    — electronics, drones, computers
 *   CZ  Części zamienne         — mechanical parts, weapons, vehicles
 *   MK  Materiały konstrukcyjne — structural materials, armor
 *   MO  Materiały organiczne    — food, biological ingredients
 *
 * Surowce are stored as ordinary `consumable` (trinket) items. They carry no
 * distinguishing subtype, so they are identified by their loot icon filename
 * with a fallback to the "(CODE)" tag in their name.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Directory (relative to the module) that holds the surowce icons. */
export const SUROWCE_ICON_DIR = `modules/${MODULE_ID}/icons/items/loot`;

/**
 * @typedef {object} SurowiecType
 * @property {string} code    Short code shown to players (CH, CE, CZ, MK, MO).
 * @property {string} id      Stable identifier / icon basename (without extension).
 * @property {string} label   Full Polish label.
 * @property {string} icon    Icon filename inside {@link SUROWCE_ICON_DIR}.
 * @property {string} accent  Accent colour for the weight bar.
 * @property {number} order   Display order.
 */

/** @type {ReadonlyArray<SurowiecType>} */
export const SUROWCE_TYPES = Object.freeze([
  { code: "CH", id: "chemia",                 label: "Chemia",                  icon: "chemia.svg",                 accent: "#b5c24a", order: 1 },
  { code: "CE", id: "czesci_elektroniczne",   label: "Części elektroniczne",    icon: "czesci_elektroniczne.svg",   accent: "#5ab0c2", order: 2 },
  { code: "CZ", id: "czesci",                 label: "Części zamienne",         icon: "czesci.svg",                 accent: "#c2925a", order: 3 },
  { code: "MK", id: "materialy_konstrukcyjne", label: "Materiały konstrukcyjne", icon: "materialy_konstrukcyjne.svg", accent: "#9a9a9a", order: 4 },
  { code: "MO", id: "materialy_organiczne",   label: "Materiały organiczne",    icon: "materialy_organiczne.svg",   accent: "#c25a5a", order: 5 }
]);

/** Lookup of exact icon basename → type. */
const ICON_TO_TYPE = new Map(SUROWCE_TYPES.map(t => [t.icon.toLowerCase(), t]));

/**
 * Resolve the surowiec type for an item, or `null` if it is not a surowiec.
 * Matches first by exact loot-icon filename, then by the "(CODE)" name tag.
 * @param {Item} item
 * @returns {SurowiecType|null}
 */
export function getSurowiecType(item) {
  if (item?.type !== "consumable") return null;

  const base = (item.img || "").split("/").pop()?.toLowerCase();
  if (base && ICON_TO_TYPE.has(base)) return ICON_TO_TYPE.get(base);

  const name = item.name || "";
  for (const t of SUROWCE_TYPES) {
    if (new RegExp(`\\(${t.code}\\)`, "i").test(name)) return t;
  }
  return null;
}

/**
 * Whether the given item is a surowiec.
 * @param {Item} item
 * @returns {boolean}
 */
export function isSurowiec(item) {
  return getSurowiecType(item) !== null;
}
