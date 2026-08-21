/**
 * Neuroshima 5e — compendium pack regression check.
 *
 *   node dev/packs/validate-packs.mjs
 *
 * Reads the built LevelDB packs and asserts the invariants that have actually
 * broken during development. Exits non-zero on any failure so it can gate a build.
 *
 * Requires FoundryVTT to be closed (it holds the LevelDB open).
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  CLASSES, PROFESSIONS, SZTUCZKA, PROFESJA, PROFESJA_LUB_SZTUCZKA, POCHODZENIE
} from "../../scripts/config/classes-data.mjs";
import { CLASS_FEATURES, resolveGrant } from "../../scripts/config/class-features-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(HERE, "../..");
const require = createRequire(import.meta.url);
const { ClassicLevel } = require(
  "C:/Program Files/Foundry Virtual Tabletop/resources/app/node_modules/classic-level");

const failures = [];
const notes = [];
const fail = m => failures.push(m);

async function load(name) {
  const db = new ClassicLevel(path.join(MODULE_ROOT, "packs", name),
    { keyEncoding: "utf8", valueEncoding: "json" });
  await db.open();
  const docs = [];
  for await (const [, v] of db.iterator()) docs.push(v);
  await db.close();
  return docs;
}

let klasy, profesje, features, sztuczki;
try {
  [klasy, profesje, features, sztuczki] = await Promise.all(
    ["klasy", "profesje", "zdolnosci-klasowe", "sztuczki"].map(load));
} catch (err) {
  if (err.code === "LEVEL_LOCKED" || /lock/i.test(err.message)) {
    console.error("FoundryVTT is running — close it before validating packs.");
    process.exit(2);
  }
  throw err;
}

/* ---- counts ---- */
if (klasy.length !== Object.keys(CLASSES).length) fail(`klasy: ${klasy.length} docs, expected ${Object.keys(CLASSES).length}`);
if (profesje.length !== Object.keys(PROFESSIONS).length) fail(`profesje: ${profesje.length}, expected ${Object.keys(PROFESSIONS).length}`);
if (features.length !== Object.keys(CLASS_FEATURES).length) fail(`zdolnosci: ${features.length}, expected ${Object.keys(CLASS_FEATURES).length}`);

const byId = new Set([...features, ...profesje].map(d => d._id));

/* ---- every advancement uuid resolves to a built document ---- */
for (const doc of [...klasy, ...profesje]) {
  for (const a of doc.system.advancement ?? []) {
    const uuids = [
      ...(a.configuration.items ?? []).map(i => i.uuid),
      ...(a.configuration.pool ?? []).map(i => i.uuid)
    ];
    for (const u of uuids) {
      if (!byId.has(u.split(".").pop())) fail(`${doc.name} L${a.level}: dangling uuid ${u}`);
    }
  }
}

/* ---- classes: structure ---- */
for (const doc of klasy) {
  const cid = doc.system.identifier;
  const def = CLASSES[cid];
  if (!def) { fail(`unknown class identifier in pack: ${cid}`); continue; }

  if (doc.system.hd.denomination !== def.pw.hd) fail(`${cid}: hd ${doc.system.hd.denomination} != ${def.pw.hd}`);
  if (doc.system.spellcasting?.progression !== "none") fail(`${cid}: spellcasting not disabled`);

  const types = doc.system.advancement.reduce((m, a) => (m[a.type] = (m[a.type] ?? 0) + 1, m), {});
  if (!types.HitPoints) fail(`${cid}: missing HitPoints advancement`);
  if (!types.Subclass) fail(`${cid}: missing Subclass advancement`);
  if (!types.Trait) fail(`${cid}: missing Trait advancement`);

  const sub = doc.system.advancement.find(a => a.type === "Subclass");
  if (sub && sub.level !== def.professionLevels[0]) {
    fail(`${cid}: Subclass at L${sub.level}, expected L${def.professionLevels[0]}`);
  }

  // scale values complete and monotonic in level keys
  for (const [key, sv] of Object.entries(def.scale ?? {})) {
    const a = doc.system.advancement.find(x => x.type === "ScaleValue" && x.configuration.identifier === key);
    if (!a) { fail(`${cid}: missing ScaleValue ${key}`); continue; }
    const levels = Object.keys(a.configuration.scale).map(Number).sort((x, y) => x - y);
    if (!levels.length) fail(`${cid}.${key}: empty scale`);
    const firstNonNull = sv.values.findIndex(v => v !== null) + 1;
    if (levels[0] !== firstNonNull) {
      fail(`${cid}.${key}: scale starts at L${levels[0]}, expected L${firstNonNull}`);
    }
  }
}

/* ---- exactly one choice per level, except explicit multi-grant levels ---- */
for (const doc of klasy) {
  const cid = doc.system.identifier;
  const def = CLASSES[cid];
  const subs = profesje.filter(p => p.system.classIdentifier === cid);
  if (subs.length !== 3) fail(`${cid}: ${subs.length} professions, expected 3`);

  for (let lvl = 1; lvl <= 12; lvl++) {
    const fromClass = doc.system.advancement.filter(a => a.level === lvl && a.type === "ItemChoice");
    const fromSub = subs[0].system.advancement.filter(a => a.level === lvl && a.type === "ItemChoice");
    const total = fromClass.length + fromSub.length;

    const entry = def.levels[lvl] ?? [];
    // How many independent ItemChoice picks the rulebook grants at this level:
    //   PROFESJA / PROFESJA_LUB_SZTUCZKA / SZTUCZKA each = 1
    //   plus featureWithChoice, plus repeats of kind "choice"
    // Repeats of kind "trait" (Złodziej's Specjalizacja (2)) become a Trait
    // advancement, and kind "upgrade" grants nothing — neither is an ItemChoice.
    let expected = 0;
    let expectedTraits = 0;
    for (const id of entry) {
      if (id === PROFESJA || id === PROFESJA_LUB_SZTUCZKA || id === SZTUCZKA) { expected++; continue; }
      if (id === POCHODZENIE) continue;
      const g = resolveGrant(id);
      if (!g) { fail(`${cid} L${lvl}: unresolved grant ${id}`); continue; }
      if (g.type === "featureWithChoice") expected++;
      else if (g.type === "repeat" && g.kind === "choice") expected++;
      else if (g.type === "repeat" && g.kind === "trait") expectedTraits++;
    }

    if (total !== expected) {
      fail(`${cid} L${lvl}: ${total} ItemChoice(s), rulebook grants ${expected} `
         + `[${[...fromClass, ...fromSub].map(a => a.title).join(" | ")}]`);
    }

    const traits = doc.system.advancement.filter(a => a.level === lvl && a.type === "Trait").length;
    if (expectedTraits && traits < expectedTraits) {
      fail(`${cid} L${lvl}: ${traits} Trait advancement(s), expected ${expectedTraits}`);
    }
  }
}

/* ---- professions ---- */
for (const doc of profesje) {
  const pid = doc.system.identifier;
  const def = PROFESSIONS[pid];
  if (!def) { fail(`unknown profession in pack: ${pid}`); continue; }
  if (doc.system.classIdentifier !== def.klasa) {
    fail(`${pid}: classIdentifier ${doc.system.classIdentifier} != ${def.klasa}`);
  }
  const levels = doc.system.advancement.map(a => a.level).sort((a, b) => a - b);
  const want = CLASSES[def.klasa].professionLevels;
  if (levels.join(",") !== want.join(",")) {
    fail(`${pid}: choices at ${levels.join("/")}, expected ${want.join("/")}`);
  }
  for (const a of doc.system.advancement) {
    if (a.configuration.pool.length !== def.abilities.length) {
      fail(`${pid} L${a.level}: pool ${a.configuration.pool.length}, expected ${def.abilities.length}`);
    }
  }
}

/* ---- features ---- */
let withUses = 0, withActivity = 0, withArt = 0;
for (const doc of features) {
  const id = doc.flags[MODULE_ID]?.abilityId;
  const def = CLASS_FEATURES[id];
  if (!def) { fail(`feature not in data module: ${doc.name}`); continue; }
  if (doc.name !== def.label) fail(`${id}: pack name "${doc.name}" != label "${def.label}"`);
  if (doc.system.uses.max) withUses++;
  if (Object.keys(doc.system.activities ?? {}).length) withActivity++;
  if (doc.img.includes(MODULE_ID)) withArt++;

  if (def.uses && !doc.system.uses.max) fail(`${id}: expected uses, none in pack`);
  if (def.uses?.period && def.uses.period !== "combat") {
    const rec = doc.system.uses.recovery?.[0];
    if (rec?.period !== def.uses.period) fail(`${id}: recovery ${rec?.period} != ${def.uses.period}`);
  }
}

notes.push(`features: ${features.length} (uses ${withUses}, activities ${withActivity}, art ${withArt})`);
notes.push(`sztuczki pack: ${sztuczki.length} docs (intentionally empty)`);
notes.push(`advancements: ${[...klasy, ...profesje].reduce((n, d) => n + d.system.advancement.length, 0)}`);

/* ---- report ---- */
console.log("Neuroshima 5e — pack validation\n");
for (const n of notes) console.log(`  ${n}`);
if (failures.length) {
  console.error(`\n${failures.length} FAILURE(S):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("\n  all checks passed");
