/**
 * Neuroshima 5e — Żeton Luxor (Luxor casino chip).
 *
 * GM-established price (2026-09-07, following up on catalog drift caught across the whole
 * party): 10 gb per chip. No RAW entry — this is a campaign-specific prop from the "W kolorze
 * Kobaltu" / "Za garść gambli" setting (Vegas, the Luxor casino run by Grand Holdings).
 *
 * Before this fix the same physical prop existed under four different names, four different
 * prices (one non-zero, three at 0) and the stale "gp" currency key, across Alan/Lorentz/
 * Raynald/Piekarz — see `migration/migrate-zeton-luxor.mjs` for the one-time cleanup and
 * IMPLEMENTATION.md (17)/(18) for the session-12-transcript research behind who keeps what.
 */

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAG_IS_ZETON = "zetonLuxor";

export const ZETON_LUXOR_ITEM = {
  label: "Żeton Luxor",
  price: 10,
  weight: 0.01,
  img: `modules/${MODULE_ID}/icons/items/loot/zetony.svg`,
  description: "<p>Plastikowy żeton kasyna Luxor (Citadel Grand, Vegas) — wart <strong>10 gb</strong> "
    + "przy dowolnym stole czy okienku kasjera należącym do Grand Holdings. Wartość poza Vegas jest "
    + "przedmiotem targu, nie pewnikiem.</p>"
};

/** @param {Item5e} item */
export function isZetonLuxor(item) {
  return !!item?.getFlag?.(MODULE_ID, FLAG_IS_ZETON);
}

/** Pure data, same split as `baterie.mjs`/`pochodnia.mjs`. */
export function buildZetonLuxorItemData({ quantity = 1 } = {}) {
  return {
    name: ZETON_LUXOR_ITEM.label,
    type: "loot",
    img: ZETON_LUXOR_ITEM.img,
    system: {
      description: { value: ZETON_LUXOR_ITEM.description, chat: "" },
      weight: { value: ZETON_LUXOR_ITEM.weight, units: "kg" },
      price: { value: ZETON_LUXOR_ITEM.price, denomination: "gb" },
      quantity,
      identified: true
    },
    flags: { [MODULE_ID]: { [FLAG_IS_ZETON]: true } }
  };
}

export async function createZetonLuxorItem({ actor, quantity = 1 } = {}) {
  const data = buildZetonLuxorItemData({ quantity });
  const created = actor
    ? (await actor.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.create(data);
  if (!created) throw new Error("Żeton Luxor: createEmbeddedDocuments/Item.create returned nothing");
  return created;
}

export function registerZetonLuxor() {
  console.log("Neuroshima 5e | Żeton Luxor registered");
}

/** Public API, exposed on `game.neuroshima.zetonLuxor` from main.mjs. */
export const zetonLuxorApi = { item: ZETON_LUXOR_ITEM, isZetonLuxor, create: createZetonLuxorItem };
