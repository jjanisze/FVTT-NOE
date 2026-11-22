/**
 * M9 · odświeżenie ścieżek ikon w dokumentach Poligonu — część wykonywana w stronie MG.
 *
 * Wołana przez `dev/poligon/ikony-m9.mjs` (Node) przez `fvtt eval`: funkcja jest serializowana razem
 * z danymi, więc nie może sięgać do niczego spoza siebie. Zmienia **wyłącznie** pola `img` przedmiotów
 * i `system.activities.<id>.img` ich czynności — identyfikatory, UUID, mechanika, własność, sceny i
 * pozycje żetonów zostają nietknięte.
 *
 * Kolejność rozstrzygania jednego pola:
 *   1. Wiązanie z manifestu (pack + pole konsumenta + id dokumentu/rodzica/czynności) — to samo, które
 *      `build-packs` stosuje do paczek (`dev/finish/lib/apply.mjs`). Pochodzenie: `_stats.compendiumSource`
 *      przedmiotu, a dla przedmiotów osadzonych w aktorze z paczki — źródło aktora + id przedmiotu.
 *      Wiązanie stosuje się tylko, gdy obecny obraz to biały master **tego** tematu (albo jego starsze
 *      wykończenie); inny obraz to grafika własna — zostaje i trafia do raportu.
 *   2. Reguła runtime modułu dla nowych przedmiotów (`finishedItemUpdates`): jednoznaczne domyślne
 *      wykończenia i jawne rodziny z flag (Fanty). Niejednoznaczny master nie jest zgadywany.
 *   3. Inaczej: pole bez zmian, w raporcie „nierozstrzygnięte” z przykładami.
 *
 * Tryby: `plan` (nic nie zapisuje), `apply`, `undo` (przywraca `from` z dziennika zmian).
 */
export async function odswiezIkony(DATA) {
  const MOD = "neuroshima-2026-overrides";
  const P = `modules/${MOD}/`;
  if (game.world.id !== "poligon") throw new Error(`Odświeżenie ikon M9 działa tylko na Poligonie (świat: ${game.world.id}).`);
  if (!game.user.isGM) throw new Error("Wymaga strony MG.");
  const OPTS = { render: false, noeIkonyM9: true };

  /* ---- undo ---- */
  if (DATA.mode === "undo") {
    const byItem = new Map();
    for (const c of DATA.changes) (byItem.get(c.uuid) ?? byItem.set(c.uuid, {}).get(c.uuid))[c.field] = c.from;
    const unlocked = new Set();
    let restored = 0, missing = [];
    for (const [uuid, update] of byItem) {
      const item = await fromUuid(uuid);
      if (!item) { missing.push(uuid); continue; }
      const pack = item.pack ? game.packs.get(item.pack) : null;
      if (pack?.locked && !unlocked.has(pack)) { await pack.configure({ locked: false }); unlocked.add(pack); }
      await item.update(update, OPTS);
      restored += Object.keys(update).length;
    }
    for (const pack of unlocked) await pack.configure({ locked: true });
    return { mode: "undo", restored, items: byItem.size, missing };
  }

  /* ---- plan / apply ---- */
  const fi = await import(`${foundry.utils.getRoute(`${P}scripts/config/finished-icons.mjs`)}?v=${Date.now()}`);
  const { bindings, outputs } = DATA;
  const rel = s => (typeof s === "string" && s.startsWith(P) ? s.slice(P.length) : null);
  const srcOf = uuid => {
    const m = typeof uuid === "string" && uuid.match(/^Compendium\.neuroshima-2026-overrides\.([^.]+)\.(Item|Actor)\.([^.]+)$/);
    return m ? { pack: m[1], type: m[2], id: m[3] } : null;
  };

  const counts = { items: 0, fields: 0, changed: 0, byVia: { binding: 0, rule: 0 }, alreadyFinished: 0, notModuleArt: 0, customKept: 0, staleFinished: 0, unresolved: 0 };
  const custom = [], stale = [];
  const unresolved = new Map();
  const changes = [];

  function decide(current, keys, ruleTarget, where) {
    counts.fields++;
    const r = rel(current);
    if (!r || !r.startsWith("icons/")) { counts.notModuleArt++; return null; }
    const finished = r.startsWith("icons/finished/");
    const wrapper = finished ? outputs[r] : r;
    if (finished && !wrapper) { counts.staleFinished++; if (stale.length < 50) stale.push({ ...where, img: r }); return null; }
    for (const key of keys) {
      const out = bindings[key];
      if (!out) continue;
      if (outputs[out] !== wrapper) { counts.customKept++; if (custom.length < 50) custom.push({ ...where, img: r, bound: out, key }); return null; }
      if (out === r) { counts.alreadyFinished++; return null; }
      return { to: `${P}${out}`, via: "binding", key };
    }
    const rr = rel(ruleTarget);
    if (rr && rr !== r && outputs[rr] === wrapper) return { to: ruleTarget, via: "rule" };
    if (finished) { counts.alreadyFinished++; return null; }
    counts.unresolved++;
    const u = unresolved.get(r) ?? unresolved.set(r, { wrapper: r, n: 0, examples: [] }).get(r);
    u.n++;
    if (u.examples.length < 4) u.examples.push(`${where.parent ? `${where.parent} › ` : ""}${where.name}${where.field === "img" ? "" : ` (${where.field})`}`);
    return null;
  }

  /** Updates for one item; records the planned changes. */
  function planItem(item, { parentSrc = null, parent = null, kind } = {}) {
    counts.items++;
    const data = item.toObject();
    const rule = fi.finishedItemUpdates(data);
    const own = srcOf(item._stats?.compendiumSource);
    const keys = [];
    if (own?.type === "Item") keys.push(`${own.pack}:item.img:${own.id}`);
    if (parentSrc) keys.push(`${parentSrc.pack}:actor.items[].img:${parentSrc.id}.${item.id}`);
    const update = {};
    const record = (field, from, d) => {
      update[field] = d.to;
      counts.changed++; counts.byVia[d.via]++;
      changes.push({ uuid: item.uuid, kind, parent, name: item.name, field, from, to: d.to, via: d.via, key: d.key ?? null });
    };
    const d = decide(item.img, keys, rule.img, { kind, parent, name: item.name, field: "img" });
    if (d) record("img", item.img, d);
    for (const [aid, a] of Object.entries(data.system?.activities ?? {})) {
      const field = `system.activities.${aid}.img`;
      const akeys = own?.type === "Item" ? [`${own.pack}:item.system.activities[].img:${own.id}.${aid}`] : [];
      const da = decide(a.img, akeys, rule[field], { kind, parent, name: item.name, field: `czynność ${a.name ?? aid}` });
      if (da) record(field, a.img, da);
    }
    return Object.keys(update).length ? { _id: item.id, ...update } : null;
  }

  const work = [];   // { label, run }
  const apply = DATA.mode === "apply";

  // 1. World items.
  const worldUpdates = game.items.contents.map(i => planItem(i, { kind: "world-item" })).filter(Boolean);
  if (worldUpdates.length) work.push({ label: "przedmioty świata", run: () => Item.implementation.updateDocuments(worldUpdates, OPTS) });

  // 2. World actors' own items.
  for (const actor of game.actors) {
    const src = srcOf(actor._stats?.compendiumSource);
    const parentSrc = src?.type === "Actor" ? src : null;
    const ups = actor.items.contents.map(i => planItem(i, { parentSrc, parent: actor.name, kind: "actor-item" })).filter(Boolean);
    if (ups.length) work.push({ label: actor.name, run: () => actor.updateEmbeddedDocuments("Item", ups, OPTS) });
  }

  // 3. Unlinked tokens: only the items their delta overrides (the rest is the base actor's, done above).
  for (const scene of game.scenes) for (const token of scene.tokens) {
    if (token.actorLink || !token.delta?.items?.size || !token.actor) continue;
    const base = token.baseActor;
    const src = srcOf(base?._stats?.compendiumSource);
    const parentSrc = src?.type === "Actor" ? src : null;
    const ids = new Set(token.delta.items.map(i => i.id));
    const ups = token.actor.items.contents.filter(i => ids.has(i.id))
      .map(i => planItem(i, { parentSrc, parent: `${scene.name} › ${token.name}`, kind: "token-delta" })).filter(Boolean);
    if (!ups.length) continue;
    // A target equal to the base item's current image would be dropped (see the ordering note below):
    // hold the base item on the delta's old image for the one write, then put the base back.
    const swaps = [];
    for (const u of ups) {
      const baseItem = base?.items.get(u._id);
      if (!baseItem) continue;
      for (const [field, to] of Object.entries(u)) {
        if (field === "_id" || foundry.utils.getProperty(baseItem._source, field) !== to) continue;
        swaps.push({ baseItem, field, to, from: foundry.utils.getProperty(token.actor.items.get(u._id)._source, field) });
      }
    }
    work.push({
      label: `${scene.name} › ${token.name}`, delta: true,
      run: async () => {
        for (const s of swaps) await s.baseItem.update({ [s.field]: s.from }, OPTS);
        try { await token.actor.updateEmbeddedDocuments("Item", ups, OPTS); }
        finally { for (const s of swaps) await s.baseItem.update({ [s.field]: s.to }, OPTS); }
      }
    });
  }

  // 4. The world's own compendia (Poligon · Obsada: personas stations import copies from).
  const packWork = [];
  for (const pack of game.packs.filter(p => p.metadata.packageType === "world" && ["Actor", "Item"].includes(p.documentName))) {
    const docs = await pack.getDocuments();
    if (pack.documentName === "Item") {
      const ups = docs.map(i => planItem(i, { parent: pack.title, kind: "pack-item" })).filter(Boolean);
      if (ups.length) packWork.push({ pack, run: () => Item.implementation.updateDocuments(ups, { ...OPTS, pack: pack.collection }) });
    } else for (const actor of docs) {
      const src = srcOf(actor._stats?.compendiumSource);
      const parentSrc = src?.type === "Actor" ? src : null;
      const ups = actor.items.contents.map(i => planItem(i, { parentSrc, parent: `${pack.title} › ${actor.name}`, kind: "pack-actor-item" })).filter(Boolean);
      if (ups.length) packWork.push({ pack, run: () => actor.updateEmbeddedDocuments("Item", ups, OPTS) });
    }
  }

  // 5. Macros (hotbar): a macro copies its picture once, at creation. An ability macro follows the item
  // it fires on its actor (flags.actorId) — the item with the same master picture, if exactly one;
  // any other macro takes the runtime's unambiguous default. Only `img`.
  const macroUpdates = [];
  for (const macro of game.macros) {
    const r = rel(macro.img);
    if (!r?.startsWith("icons/")) continue;
    counts.macros = (counts.macros ?? 0) + 1;
    const wrapper = r.startsWith("icons/finished/") ? outputs[r] : r;
    const actor = game.actors.get(macro.getFlag(MOD, "actorId") ?? "");
    const fromItems = new Set((actor?.items ?? []).map(i => rel(i.img)).filter(x => x?.startsWith("icons/finished/") && outputs[x] === wrapper));
    const target = fromItems.size === 1 ? `${P}${[...fromItems][0]}` : fi.finishedIcon(macro.img);
    const d = decide(macro.img, [], target, { kind: "macro", parent: actor?.name ?? null, name: `makro ${macro.name}`, field: "img" });
    if (!d) continue;
    counts.changed++; counts.byVia[d.via]++;
    changes.push({ uuid: macro.uuid, kind: "macro", parent: actor?.name ?? null, name: macro.name, field: "img", from: macro.img, to: d.to, via: d.via, key: null });
    macroUpdates.push({ _id: macro.id, img: d.to });
  }
  if (macroUpdates.length) work.push({ label: "makra", run: () => Macro.implementation.updateDocuments(macroUpdates, OPTS) });

  let galeria = null;
  const station = game.poligon?.stations?.get?.("galeria");
  if (station?.odswiez) galeria = await station.odswiez({ dryRun: !apply });

  if (apply) {
    // Token deltas first: v14 silently drops a delta-item write whose value equals the base actor's
    // (the server returns just `_id`) and the delta keeps its stale value. Written while the base still
    // has the white master, the delta's finished path is a real difference and sticks.
    work.sort((a, b) => (b.delta ? 1 : 0) - (a.delta ? 1 : 0));
    for (const w of work) await w.run();
    const packs = new Set(packWork.map(w => w.pack));
    const relock = [];
    for (const pack of packs) if (pack.locked) { await pack.configure({ locked: false }); relock.push(pack); }
    try { for (const w of packWork) await w.run(); } finally { for (const pack of relock) await pack.configure({ locked: true }); }
  }

  return {
    mode: DATA.mode, world: game.world.id, user: game.user.name,
    counts, groups: work.length + packWork.length,
    unresolved: [...unresolved.values()].sort((a, b) => b.n - a.n),
    customKept: custom, staleFinished: stale,
    galeria, changes
  };
}
