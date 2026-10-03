/** Batch 42 live wiring. Use through Foundry; never open its LevelDB directly. */
import { PRODUCTION_GEAR, buildProductionGearItemData } from "../../scripts/items/production-gear.mjs?batch42-final";

const MODULE_ID = "neuroshima-2026-overrides";
const WEAPON_ROOT = `modules/${MODULE_ID}/icons/weapons/`;
const LOOT_ROOT = `modules/${MODULE_ID}/icons/items/loot/`;
const WEAPONS = Object.freeze({
  "Maczuga": { img: `${WEAPON_ROOT}maczuga.svg`, old: new Set([`${WEAPON_ROOT}iron_pipe_club.svg`]) },
  "Pałka policyjna": { img: `${WEAPON_ROOT}palka_policyjna.svg`, old: new Set([`${WEAPON_ROOT}iron_pipe_club.svg`]) },
  "Kamienny nóż": { img: `${WEAPON_ROOT}kamienny_noz.svg`, old: new Set([`${WEAPON_ROOT}combat_knife.svg`]) },
  "Sztylet": { img: `${WEAPON_ROOT}sztylet.svg`, old: new Set([`${WEAPON_ROOT}combat_knife.svg`]) },
  "Młotek": { img: `${WEAPON_ROOT}mlotek.svg`, old: new Set([`${WEAPON_ROOT}iron_pipe_club.svg`]) }
});
const RAW = Object.freeze({
  "raw:akumulator": `${LOOT_ROOT}akumulator.svg`,
  "raw:agregat": `${LOOT_ROOT}agregat.svg`,
  "raw:alternator": `${LOOT_ROOT}alternator.svg`,
  "raw:defibrylator": `${LOOT_ROOT}defibrylator.svg`
});
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
    const weapon = item.type === "weapon" ? WEAPONS[item.name] : null;
    if (weapon && item.img !== weapon.img && weapon.old.has(item.img)) {
      return [{ _id: item.id, name: item.name, before: item.img, img: weapon.img }];
    }
    const raw = item.flags?.[MODULE_ID]?.produktZastepczy;
    const img = RAW[raw];
    if (img && item.img !== img) return [{ _id: item.id, name: item.name, before: item.img, img }];
    return [];
  });
}

export async function planBatch42() {
  if (!game.user.isGM) throw new Error("Batch 42 wiring needs a GM");
  const plan = { batch: 42, world: game.world.id, items: patchesFor(game.items), actors: [], packs: [], prototypes: [] };
  const actors = new Map([...game.actors].map(actor => [actor.uuid, actor]));
  for (const scene of game.scenes) for (const token of scene.tokens) {
    if (!token.actorLink && token.actor) actors.set(token.actor.uuid, token.actor);
  }
  for (const [uuid, actor] of actors) {
    const items = patchesFor(actor.items);
    if (items.length) plan.actors.push({ uuid, name: actor.name, items });
  }
  for (const name of ["bron", "sprzet"]) {
    const pack = game.packs.get(`${MODULE_ID}.${name}`);
    if (!pack) throw new Error(`Missing pack ${name}`);
    const items = patchesFor(await pack.getDocuments());
    if (items.length) plan.packs.push({ collection: pack.collection, locked: pack.locked, items });
  }
  const equipment = game.packs.get(`${MODULE_ID}.sprzet`);
  for (const id of Object.keys(PRODUCTION_GEAR)) {
    const _id = await idFor("loot", id);
    plan.prototypes.push({ id, _id, name: PRODUCTION_GEAR[id].id, exists: Boolean(await equipment.getDocument(_id)) });
  }
  return plan;
}

export async function applyBatch42(plan) {
  if (!game.user.isGM || plan.batch !== 42 || plan.world !== game.world.id) {
    throw new Error("Invalid batch/world or no GM permission");
  }
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
    if (Boolean(await equipment.getDocument(prototype._id)) !== prototype.exists) {
      throw new Error(`Stale prototype plan for ${prototype.id}`);
    }
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
    try {
      if (pack.locked) await pack.configure({ locked: false });
      await Item.implementation.updateDocuments(updates(group.items), { pack: pack.collection });
      summary.packs++;
      summary.packItems += group.items.length;
    } finally {
      if (pack.locked !== group.locked) await pack.configure({ locked: group.locked });
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
