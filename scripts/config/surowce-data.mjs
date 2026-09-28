/**
 * Neuroshima 5e — Surowce (raw crafting materials).
 *
 * Five tracked resource types that drive the crafting/production economy:
 *   CH  Chemia                  — explosives, medicines, ammo primers
 *   CE  Części elektroniczne    — electronics, drones, computers
 *   CZ  Części zapasowe         — mechanical parts, weapons, vehicles
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
 * @property {number} gbPerKg Value per kilogram (NOE s. 144, Tabela surowców): CH/CE/CZ
 *                            1 gb / 100 g, MK/MO 1 gb / 1 kg. Production counts in gamble,
 *                            the inventory in kilograms — this is the only bridge between them.
 */

/** @type {ReadonlyArray<SurowiecType>} */
export const SUROWCE_TYPES = Object.freeze([
  { code: "CH", id: "chemia",                 label: "Chemia",                  icon: "chemia.svg",                 accent: "#b5c24a", order: 1, gbPerKg: 10 },
  { code: "CE", id: "czesci_elektroniczne",   label: "Części elektroniczne",    icon: "czesci_elektroniczne.svg",   accent: "#5ab0c2", order: 2, gbPerKg: 10 },
  { code: "CZ", id: "czesci",                 label: "Części zapasowe",         icon: "czesci.svg",                 accent: "#c2925a", order: 3, gbPerKg: 10 },
  // MK/MO accents revised 2026-09-06: MK's plain grey (#9a9a9a) was nearly identical to the
  // Ekwipunek bar's "Reszta" grey (#8f8f8f), and MO's red (#c25a5a) nearly identical to that
  // same bar's "Broń" red (#b06a6a) — both real collisions once every category shares one bar
  // (`actors/encumbrance-breakdown.mjs`). Replaced with a muted violet (stone/concrete) and a
  // green (organic matter reads as green far more intuitively than red anyway).
  { code: "MK", id: "materialy_konstrukcyjne", label: "Materiały konstrukcyjne", icon: "materialy_konstrukcyjne.svg", accent: "#a179af", order: 4, gbPerKg: 1 },
  { code: "MO", id: "materialy_organiczne",   label: "Materiały organiczne",    icon: "materialy_organiczne.svg",   accent: "#5cb54a", order: 5, gbPerKg: 1 }
]);

/** Lookup by code (CH, CE, CZ, MK, MO). */
export const SUROWCE_BY_CODE = Object.freeze(Object.fromEntries(SUROWCE_TYPES.map(t => [t.code, t])));

/**
 * Kilograms in one canonical unit of a type — the unit worth exactly 1 gb (100 g or 1 kg).
 * Stacks the module creates itself (`actors/surowce-store.mjs`) always use it.
 */
export function surowiecUnitKg(code) {
  return 1 / SUROWCE_BY_CODE[code].gbPerKg;
}

/**
 * Module flags that make an item something specific, even though it wears a Surowce icon.
 * Kwas (fiolka) borrows `chemia.svg` until it gets its own art (`items/kwas.mjs`) — without
 * this it was pooled as Chemia (CH), hidden from the normal inventory and, once production
 * started consuming CH, would have been melted down as raw chemistry.
 */
const NOT_SUROWIEC_FLAGS = Object.freeze(["kwas", "chemiaKey", "bateria", "medykRefill"]);

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
  const own = item.flags?.[MODULE_ID];
  if (own?.surowiec && SUROWCE_BY_CODE[own.surowiec]) return SUROWCE_BY_CODE[own.surowiec];
  if (own && NOT_SUROWIEC_FLAGS.some(f => own[f])) return null;

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
