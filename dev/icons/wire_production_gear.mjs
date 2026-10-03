/** Live migration for approved production-gear icons and prototypes. */
import {
  PRODUCTION_GEAR,
  buildProductionGearItemData,
  productionGearIdForRef
} from "../../scripts/items/production-gear.mjs?batch46-approved";

const MODULE_ID = "neuroshima-2026-overrides";
const ID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

async function idFor(kind, slug) {
  const bytes = new TextEncoder().encode(`${MODULE_ID}:${kind}:${slug}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
  let output = "";
  for (let index = 0; index < 16; index++) output += ID_CHARS[hash[index] % ID_CHARS.length];
  return output;
}

function patchesFor(items) {
  return [...items].flatMap(item => {
    const ref = item.flags?.[MODULE_ID]?.produktZastepczy;
    const id = productionGearIdForRef(ref);
    if (!id) return [];
    const img = buildProductionGearItemData(id).img;
    return item.img === img ? [] : [{ _id: item.id, name: item.name, ref, before: item.img, img }];
  });
}

export async function planProductionGear() {
  if (!game.user.isGM) throw new Error("Production-gear migration needs a GM");
  const plan = { version: 1, world: game.world.id, items: patchesFor(game.items), actors: [], packs: [], prototypes: [] };
  const actors = new Map([...game.actors].map(actor => [actor.uuid, actor]));
  for (const scene of game.scenes) for (const token of scene.tokens) {
    if (!token.actorLink && token.actor) actors.set(token.actor.uuid, token.actor);
  }
  for (const [uuid, actor] of actors) {
    const items = patchesFor(actor.items);
    if (items.length) plan.actors.push({ uuid, name: actor.name, items });
  }
  const equipment = game.packs.get(`${MODULE_ID}.sprzet`);
  if (!equipment) throw new Error("Missing sprzet pack");
  const packItems = patchesFor(await equipment.getDocuments());
  if (packItems.length) plan.packs.push({ collection: equipment.collection, locked: equipment.locked, items: packItems });
  for (const id of Object.keys(PRODUCTION_GEAR)) {
    const _id = await idFor("loot", id);
    plan.prototypes.push({ id, _id, exists: Boolean(await equipment.getDocument(_id)) });
  }
  return plan;
}

export async function applyProductionGear(plan) {
  if (!game.user.isGM || plan.version !== 1 || plan.world !== game.world.id) throw new Error("Invalid plan/world or no GM permission");
  const groups = [
    { items: plan.items, resolve: id => game.items.get(id) },
    ...plan.actors.map(actor => ({ items: actor.items, resolve: async id => (await fromUuid(actor.uuid))?.items.get(id) })),
    ...plan.packs.map(pack => ({ items: pack.items, resolve: id => game.packs.get(pack.collection).getDocument(id) }))
  ];
  for (const group of groups) for (const patch of group.items) {
    const item = await group.resolve(patch._id);
    if (!item || item.img !== patch.before) throw new Error(`Stale icon plan for ${patch.name}`);
  }
  const equipment = game.packs.get(`${MODULE_ID}.sprzet`);
  for (const prototype of plan.prototypes) {
    if (Boolean(await equipment.getDocument(prototype._id)) !== prototype.exists) throw new Error(`Stale prototype plan for ${prototype.id}`);
  }

  const updates = items => items.map(({ _id, img }) => ({ _id, img }));
  const summary = { items: 0, actors: 0, embedded: 0, packs: 0, packItems: 0, prototypesCreated: 0, prototypesUpdated: 0 };
  if (plan.items.length) {
    await Item.implementation.updateDocuments(updates(plan.items));
    summary.items = plan.items.length;
  }
  for (const group of plan.actors) {
    const actor = await fromUuid(group.uuid);
    await actor.updateEmbeddedDocuments("Item", updates(group.items));
    summary.actors++;
    summary.embedded += group.items.length;
  }
  for (const group of plan.packs) {
    const pack = game.packs.get(group.collection);
    const wasLocked = pack.locked;
    try {
      if (wasLocked) await pack.configure({ locked: false });
      await Item.implementation.updateDocuments(updates(group.items), { pack: pack.collection });
      summary.packs++;
      summary.packItems += group.items.length;
    } finally {
      if (pack.locked !== wasLocked) await pack.configure({ locked: wasLocked });
    }
  }

  const wasLocked = equipment.locked;
  try {
    if (wasLocked) await equipment.configure({ locked: false });
    for (const prototype of plan.prototypes) {
      const data = { ...buildProductionGearItemData(prototype.id), _id: prototype._id };
      if (prototype.exists) {
        await Item.implementation.updateDocuments([data], { pack: equipment.collection });
        summary.prototypesUpdated++;
      } else {
        await Item.implementation.createDocuments([data], { pack: equipment.collection, keepId: true });
        summary.prototypesCreated++;
      }
    }
  } finally {
    if (equipment.locked !== wasLocked) await equipment.configure({ locked: wasLocked });
  }
  return summary;
}
