/**
 * Neuroshima 5e — Baterie (batteries), the shared power cell.
 *
 * RAW (podręcznik, "BATERIE"): "nie są to przedwojenne baterie typu paluszki, lecz wytwory
 * inżynierii wstecznej — samoróbki, które, choć bywają zawodne, są bardzo drogie." One cell
 * powers a Latarka, radio, krótkofalówka, szoker or miernik promieniowania and lasts **2k4
 * godzin** of that device's actual runtime, rechargeable off any power source.
 *
 * ## Why this is a plain `loot` good, not a tracked resource of its own
 *
 * A battery *could* be modelled as a persistent object with its own remaining-charge flag
 * that gets swapped between devices — closer to `magazine.mjs`'s ammo model than to
 * `pochodnia.mjs`'s burn-to-ash fuel. That's real fidelity RAW doesn't ask for: nothing in the
 * text cares whether *this specific* half-used cell keeps its charge when pulled from a dead
 * flashlight and reinserted later. What players actually experience is "I load fresh
 * batteries" — a reload, not a resource with continuity of its own. So Baterie behaves like
 * ammunition: a stackable good, consumed one unit at a time the moment it's loaded into a
 * device, at which point *the device* rolls 2k4 hours and starts its own world-time burn-down
 * exactly the way `pochodnia.mjs` already does for fuel. See `latarka.mjs`'s "Włóż baterie"
 * activity for the consuming side of this.
 *
 * No activities live on the Baterie item itself — it's inert cargo until a device eats one.
 */

const MODULE_ID = "neuroshima-2026-overrides";

export const FLAG_IS_BATERIA = "bateria";

export const BATERIE_ITEM = {
  label: "Baterie",
  // No RAW sale price exists (only crafting cost: ST 10, 20h, 9 CH + 1 MK) — estimated in line
  // with the addon table's scale (Latarka+baterie rail addon prices at 35), same estimation
  // discipline `pochodnia.mjs`'s smołowa variant already uses for its own un-costed price.
  price: 5,
  weight: 0.1,
  img: `modules/${MODULE_ID}/icons/items/loot/bateria.svg`,
  description: "<p>Nie te przedwojenne „paluszki” — samoróbka, wytwór inżynierii wstecznej. "
    + "Zawodna, ale droga. Zasila latarkę, radio, krótkofalówkę, szoker czy miernik "
    + "promieniowania. Starcza na <strong>2k4 godzin</strong> działania urządzenia. Można ją "
    + "naładować, mając dołączoną ładowarkę i źródło prądu.</p>",
};

export function isBaterie(item) {
  return !!item?.getFlag?.(MODULE_ID, FLAG_IS_BATERIA);
}

/** Same split `pochodnia.mjs` uses: pure data, callable from a live client or a Node build script. */
export function buildBaterieItemData({ quantity = 1 } = {}) {
  return {
    name: BATERIE_ITEM.label,
    type: "loot",
    img: BATERIE_ITEM.img,
    system: {
      description: { value: BATERIE_ITEM.description, chat: "" },
      weight: { value: BATERIE_ITEM.weight, units: "kg" },
      price: { value: BATERIE_ITEM.price, denomination: "gp" },
      quantity,
      identified: true,
    },
    flags: { [MODULE_ID]: { [FLAG_IS_BATERIA]: true } },
  };
}

export async function createBaterieItem({ actor, quantity = 1 } = {}) {
  const data = buildBaterieItemData({ quantity });
  const created = actor
    ? (await actor.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.create(data);
  if (!created) throw new Error("Baterie: createEmbeddedDocuments/Item.create returned nothing");
  return created;
}

/**
 * Tops up the Zbrojownia's Baterie stock to at least `minQuantity` — a top-up, not an upsert:
 * unlike `createLatarkaStock`'s one-of-each catalog refresh, Baterie is a stackable good, so
 * this only ever adds, never overwrites or reduces whatever's already sitting there.
 */
export async function createBaterieStock(actor, { minQuantity = 20 } = {}) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if (!actor) { ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia)."); return null; }

  const existing = actor.items.find(i => isBaterie(i));
  if (existing) {
    const have = existing.system.quantity ?? 0;
    if (have >= minQuantity) {
      ui.notifications.info(`Zbrojownia: baterie już w zapasie (${have}).`);
      return { added: 0, total: have };
    }
    await existing.update({ "system.quantity": minQuantity });
    ui.notifications.info(`Zbrojownia: dołożono baterii, zapas: ${minQuantity}.`);
    return { added: minQuantity - have, total: minQuantity };
  }

  await createBaterieItem({ actor, quantity: minQuantity });
  ui.notifications.info(`Zbrojownia: nowy zapas baterii (${minQuantity}).`);
  return { added: minQuantity, total: minQuantity };
}

export function registerBaterie() {
  console.log(`${MODULE_ID} | Baterie registered`);
}

/** Public API, exposed on `game.neuroshima.baterie` from main.mjs. */
export const baterieApi = { item: BATERIE_ITEM, isBaterie, create: createBaterieItem, stock: createBaterieStock };
