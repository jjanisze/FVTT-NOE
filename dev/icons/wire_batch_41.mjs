/**
 * Batch 41: repoint legacy icons through the LIVE Foundry API, never LevelDB.
 * In a GM console: const art = await import("/modules/neuroshima-2026-overrides/dev/icons/wire_batch_41.mjs");
 * const plan = await art.planBatch41(); // back this up before applyBatch41(plan)
 * Only img fields change; flags, quantities, activities and effects are untouched.
 */
const MODULE_ID = "neuroshima-2026-overrides";
const ROOT = `modules/${MODULE_ID}/icons/items/loot/`;
const LEGACY = new Set([
  ROOT + "krotkofalowka_alt.svg", ROOT + "czesci_elektroniczne.svg", ROOT + "chemia.svg",
  "icons/sundries/documents/document-torn-diagram-tan.webp",
  "icons/sundries/documents/notepad-clipboard-spiral.webp",
  "icons/sundries/documents/blueprints-teal.webp", "icons/svg/lightning.svg"
]);

function iconFor(item) {
  const f = item.flags?.[MODULE_ID] ?? {};
  const id = item.system?.identifier;
  if (f.detonator || id === "detonator-radiowy") return ROOT + "detonator_radiowy.svg";
  if (f.radioFuze || id === "zapalnik-radiowy") return ROOT + "zapalnik_radiowy.svg";
  if (f.electricFuze || id === "zapalnik-elektryczny") return ROOT + "zapalnik_elektryczny.svg";
  if (f.kwas || id === "kwas") return ROOT + "kwas.svg";
  if (f.schemat && ["notatka", "instrukcja", "dokumentacja"].includes(f.schemat.rozmiar))
    return ROOT + `schemat_${f.schemat.rozmiar}.svg`;
  if (f.produktZastepczy === "raw:radio") return ROOT + "radio.svg";
  return null;
}

function patchesFor(items) {
  return [...items].flatMap(item => {
    const img = iconFor(item);
    return img && img !== item.img && LEGACY.has(item.img)
      ? [{ _id: item.id, name: item.name, before: item.img, img }] : [];
  });
}

export async function planBatch41() {
  if (!game.user.isGM) throw new Error("Batch 41 wiring needs a GM");
  const plan = { batch: 41, world: game.world.id, items: patchesFor(game.items), actors: [], packs: [] };
  const actors = new Map([...game.actors].map(a => [a.uuid, a]));
  for (const scene of game.scenes) for (const token of scene.tokens)
    if (!token.actorLink && token.actor) actors.set(token.actor.uuid, token.actor);
  for (const [uuid, actor] of actors) {
    const items = patchesFor(actor.items);
    if (items.length) plan.actors.push({ uuid, name: actor.name, items });
  }
  for (const name of ["sprzet", "schematy"]) {
    const pack = game.packs.get(`${MODULE_ID}.${name}`);
    if (!pack) throw new Error(`Missing pack ${name}`);
    const items = patchesFor(await pack.getDocuments());
    if (items.length) plan.packs.push({ collection: pack.collection, locked: pack.locked, items });
  }
  return plan;
}

export async function applyBatch41(plan) {
  if (!game.user.isGM || plan.batch !== 41 || plan.world !== game.world.id)
    throw new Error("Invalid batch/world or no GM permission");
  // Refuse stale plans before making any change.
  for (const group of [
    { items: plan.items, resolve: id => game.items.get(id) },
    ...plan.actors.map(a => ({ items: a.items, resolve: async id => (await fromUuid(a.uuid))?.items.get(id) })),
    ...plan.packs.map(p => ({ items: p.items, resolve: id => game.packs.get(p.collection).getDocument(id) }))
  ]) for (const patch of group.items) {
    const item = await group.resolve(patch._id);
    if (!item || item.img !== patch.before || iconFor(item) !== patch.img)
      throw new Error(`Stale icon plan for ${patch.name}`);
  }
  const updates = items => items.map(({ _id, img }) => ({ _id, img }));
  const summary = { items: 0, actors: 0, embedded: 0, packs: 0, packItems: 0 };
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
  return summary;
}
