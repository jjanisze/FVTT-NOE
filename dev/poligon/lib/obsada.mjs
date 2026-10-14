/**
 * Obsada (PLAN_human_testing.md §3.4): personas built once through dnd5e's real advancement and kept
 * in the world compendium "Poligon · Obsada"; stations import copies.
 *
 * A persona is built on a scratch world actor — class dropped at level 1 (AdvancementManager), levelled
 * up through the manager (profession at the Subclass step), further classes the same way, Pochodzenie
 * dropped (its ASI and ability pick), the starting Sztuczka added — then imported into the pack and the
 * scratch actor deleted. Every step the manager showed is kept in the pack entry's flags, so a missing
 * pick or a changed step is visible in the build log, not guessed.
 *
 * `fast` (the e2e rot guard only, never the GM's Poligon): class at its level without the manager —
 * what the e2e suites do for setup. Clearly marked on the persona; the build log says "fast".
 */

import { MODULE_ID } from "./guard.mjs";
import { ROSTER, personaDef } from "../roster.mjs";
import { addWithAdvancement, levelUp } from "./advancement.mjs";
import { find, packDocs, forgetPack } from "./packs.mjs";

export const PACK_NAME = "poligon-obsada";
export const PACK_ID = `world.${PACK_NAME}`;

const flagOf = doc => doc?.flags?.[MODULE_ID]?.poligon ?? {};

async function obsadaPack() {
  let pack = game.packs.get(PACK_ID);
  if (pack) return pack;
  pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
    type: "Actor", label: "Poligon · Obsada", name: PACK_NAME, package: "world"
  });
  return pack;
}

/** Built personas in the pack: id → {doc stamp}. */
export async function builtPersonas() {
  const pack = game.packs.get(PACK_ID);
  if (!pack) return {};
  const index = await pack.getIndex({ fields: [`flags.${MODULE_ID}.poligon`] });
  const out = {};
  for (const e of index) {
    const f = e.flags?.[MODULE_ID]?.poligon;
    if (f?.persona) out[f.persona] = { id: e._id, name: e.name, builtAt: f.builtAt, commit: f.commit, fast: Boolean(f.fast), steps: f.steps?.length ?? 0 };
  }
  return out;
}

async function personaEntry(id) {
  const pack = game.packs.get(PACK_ID);
  if (!pack) return null;
  const docs = await pack.getDocuments();
  return docs.find(d => flagOf(d).persona === id) ?? null;
}

async function stampCommit() {
  try {
    const r = await fetch(foundry.utils.getRoute("agent-poligon-state/stamp.json"), { cache: "no-store" });
    return r.ok ? (await r.json()).commit ?? null : null;
  } catch {
    return null;
  }
}

/** Build one persona into the pack (replacing an older build). Returns the pack document. */
export async function buildPersona(def, { fast = false } = {}) {
  const pack = await obsadaPack();
  const t0 = Date.now();
  const steps = [];
  const scratch = await Actor.implementation.create({
    name: def.name, type: "character",
    system: { abilities: Object.fromEntries(Object.entries(def.cechy ?? {}).map(([k, v]) => [k, { value: v }])) },
    flags: { [MODULE_ID]: { poligon: { scratch: true } } }
  });
  try {
    const klasa = await find("klasy", { flag: def.klasa });
    if (!klasa) throw new Error(`no class ${def.klasa}`);
    const picks = def.picks ?? {};
    const profesja = def.profesja ? { Profesja: def.profesja } : {};

    if (fast) {
      const cls = game.items.fromCompendium(klasa);
      cls.system.levels = def.poziom;
      await scratch.createEmbeddedDocuments("Item", [cls]);
      steps.push(`fast:${def.klasa} ${def.poziom}`);
    } else {
      const cls = game.items.fromCompendium(klasa);
      cls.system.levels = 1;
      steps.push(...(await addWithAdvancement(scratch, cls, { picks: { ...picks, ...profesja } })).steps);
      if (def.poziom > 1) {
        const item = scratch.items.find(i => i.type === "class" && i.system.identifier === def.klasa);
        steps.push(...(await levelUp(scratch, item, def.poziom - 1, { picks: { ...picks, ...profesja } })).steps);
      }
      for (const m of def.multi ?? []) {
        const k2 = await find("klasy", { flag: m.klasa });
        const c2 = game.items.fromCompendium(k2);
        c2.system.levels = 1;
        steps.push(...(await addWithAdvancement(scratch, c2, { picks: m.picks ?? {} })).steps);
        if (m.poziom > 1) {
          const item = scratch.items.find(i => i.type === "class" && i.system.identifier === m.klasa);
          steps.push(...(await levelUp(scratch, item, m.poziom - 1, { picks: m.picks ?? {} })).steps);
        }
      }
    }
    if (def.pochodzenie) {
      const bg = await find("pochodzenia", def.pochodzenie);
      if (!bg) throw new Error(`no Pochodzenie ${def.pochodzenie}`);
      if (fast) await scratch.createEmbeddedDocuments("Item", [game.items.fromCompendium(bg)]);
      else steps.push(...(await addWithAdvancement(scratch, game.items.fromCompendium(bg), { picks })).steps);
    }
    if (def.sztuczka) {
      const sz = await find("sztuczki", def.sztuczka);
      if (sz) await scratch.createEmbeddedDocuments("Item", [game.items.fromCompendium(sz)]);
      else steps.push(`BRAK Sztuczki ${def.sztuczka}`);
    }
    await scratch.update({ "system.attributes.hp.value": scratch.system.attributes.hp.max });

    const old = await personaEntry(def.id);
    const data = scratch.toObject();
    delete data._id;
    data.folder = null;
    data.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
    data.flags[MODULE_ID].poligon = {
      persona: def.id, rola: def.rola, builtAt: new Date().toISOString(), commit: await stampCommit(),
      fast, steps, ms: Date.now() - t0
    };
    const [doc] = await Actor.implementation.createDocuments([data], { pack: PACK_ID });
    if (old) await old.delete();
    forgetPack(PACK_ID);
    return doc;
  } finally {
    // A refused step leaves its manager open on a deleted actor; never leave one behind.
    for (const app of [...foundry.applications.instances.values()].filter(a => a.constructor.name === "AdvancementManager" && a.rendered)) await app.close({ skipConfirmation: true });
    await scratch.delete();
  }
}

/**
 * A station's copy of a persona — built first when the pack does not have it yet (the first reset of
 * a station builds what it needs; later resets copy in seconds).
 */
export async function importPersona(id, { name = null, folder = null, ownership = null, flags = {}, fast = false } = {}) {
  const def = personaDef(id);
  if (!def) return null;
  let src = await personaEntry(id);
  if (!src || (src && flagOf(src).fast && !fast)) src = await buildPersona(def, { fast });
  const data = game.actors.fromCompendium(src);
  if (name) data.name = name;
  data.folder = folder;
  if (ownership) data.ownership = ownership;
  data.flags = foundry.utils.mergeObject(data.flags ?? {}, flags);
  data.prototypeToken = foundry.utils.mergeObject(data.prototypeToken ?? {}, { name: data.name, actorLink: true, sight: { enabled: true } });
  const actor = await Actor.implementation.create(data);
  return actor;
}

/** Build all (or `only`) personas; `rebuild` replaces existing ones. */
export async function buildAll({ rebuild = false, only = null, fast = false, onProgress = null } = {}) {
  const have = await builtPersonas();
  const todo = ROSTER.filter(p => (!only || only.includes(p.id)) && (rebuild || !have[p.id] || (have[p.id].fast && !fast)));
  const built = [];
  const failed = [];
  for (const [i, def] of todo.entries()) {
    onProgress?.(i, todo.length, def);
    try {
      const doc = await buildPersona(def, { fast });
      built.push({ id: def.id, name: doc.name, steps: flagOf(doc).steps.length, ms: flagOf(doc).ms });
    } catch (err) {
      console.error(`Poligon | persona ${def.id}`, err);
      failed.push({ id: def.id, error: err.message });
      for (const app of [...foundry.applications.instances.values()].filter(a => a.constructor.name === "AdvancementManager" && a.rendered)) await app.close({ skipConfirmation: true });
    }
  }
  return { built, failed, skipped: ROSTER.length - todo.length, total: ROSTER.length };
}

/**
 * The §3.4 invariant as a report: every automated Sztuczka, class/profession ability and Pochodzenie
 * ability (`coverage: auto | partial` on the pack items) sits on at least one built persona.
 */
export async function coverage() {
  const pack = game.packs.get(PACK_ID);
  const personas = pack ? await pack.getDocuments() : [];
  const carried = new Set();
  for (const p of personas) for (const i of p.items) {
    const f = i.flags?.[MODULE_ID] ?? {};
    for (const k of ["sztuczka", "abilityId", "originAbilityId"]) if (f[k]) carried.add(`${k}:${f[k]}`);
  }
  const ledgers = { sztuczki: "sztuczka", "zdolnosci-klasowe": "abilityId", "zdolnosci-pochodzenia": "originAbilityId" };
  const out = { personas: personas.length, missing: {}, covered: {}, total: {} };
  for (const [packName, key] of Object.entries(ledgers)) {
    const docs = await packDocs(packName);
    const automated = docs.filter(d => ["auto", "partial"].includes(d.flags?.[MODULE_ID]?.coverage));
    out.total[packName] = automated.length;
    out.missing[packName] = automated.filter(d => !carried.has(`${key}:${d.flags[MODULE_ID][key]}`)).map(d => d.name);
    out.covered[packName] = automated.length - out.missing[packName].length;
  }
  return out;
}
