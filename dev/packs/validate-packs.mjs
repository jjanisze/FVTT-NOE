/**
 * Neuroshima 5e — compendium pack regression check.
 *
 *   node dev/packs/validate-packs.mjs
 *
 * Reads the built LevelDB packs and asserts the invariants that have actually
 * broken during development. Exits non-zero on any failure so it can gate a build.
 *
 * Reads copies: opening a LevelDB rewrites its files, and a check must not churn `packs/`.
 */

import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classicLevel } from "../agent/lib/packs.mjs";

import {
  CLASSES, PROFESSIONS, SZTUCZKA, PROFESJA, PROFESJA_LUB_SZTUCZKA, POCHODZENIE
} from "../../scripts/config/classes-data.mjs";
import { CLASS_FEATURES, resolveGrant } from "../../scripts/config/class-features-data.mjs";
import { SZTUCZKI } from "../../scripts/config/sztuczki-data.mjs";
import { ORIGIN_ABILITIES, POCHODZENIA, attrBonus } from "../../scripts/config/pochodzenia-data.mjs";
import { STATBLOKI, RODZAJE } from "../../scripts/config/towarzysze-data.mjs";
import { bledyTabel } from "./tabele.mjs";

/** Advancement as a list — dnd5e 6.0 stores it as an object keyed by id (5.3: an array). */
const advOf = doc => Object.values(doc?.system?.advancement ?? {});

const MODULE_ID = "neuroshima-2026-overrides";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(HERE, "../..");
const FOUNDRY_APP = "C:/Program Files/Foundry Virtual Tabletop/resources/app";
// Foundry's copy locally; an npm-installed one on the Linux release runner (dev/agent/lib/packs.mjs).
const ClassicLevel = classicLevel(FOUNDRY_APP);

const failures = [];
const notes = [];
const fail = m => failures.push(m);

// `--out=<dir>` validates a build written with `build-packs.mjs --out=<dir>`.
const OUT = process.argv.slice(2).find(a => a.startsWith("--out="))?.slice("--out=".length);
const PACKS_ROOT = OUT ? path.resolve(OUT) : path.join(MODULE_ROOT, "packs");
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), "neuro-validate-"));
process.on("exit", () => fs.rmSync(SCRATCH, { recursive: true, force: true }));

async function load(name) {
  const copy = fs.mkdtempSync(path.join(SCRATCH, `${name}-`));
  // Files only (a repaired LevelDB keeps a `lost/` folder); no LOCK, so a running Foundry is no obstacle.
  for (const f of fs.readdirSync(path.join(PACKS_ROOT, name), { withFileTypes: true })) {
    if (f.isFile() && f.name !== "LOCK") fs.copyFileSync(path.join(PACKS_ROOT, name, f.name), path.join(copy, f.name));
  }
  const db = new ClassicLevel(copy, { keyEncoding: "utf8", valueEncoding: "json", createIfMissing: false });
  await db.open();
  const docs = [];
  for await (const [, v] of db.iterator()) docs.push(v);
  await db.close();
  return docs;
}

let [klasyWszystkie, profesje, features, sztuczki, pochodzenia, origins, towarzysze] = await Promise.all(
  ["klasy", "profesje", "zdolnosci-klasowe", "sztuczki", "zdolnosci-pochodzenia", "pochodzenia", "towarzysze"].map(load));

// Klasa „Towarzysz” (PLAN_m3 §7.8) leży w paczce klas, ale nie jest klasą BG — osobne sprawdzenia niżej.
// Paczka klas ma też rekord folderu (bez `system`) — liczą się tylko dokumenty klas.
klasyWszystkie = klasyWszystkie.filter(d => d.type === "class");
const klasy = klasyWszystkie.filter(d => d.system?.identifier !== "towarzysz");
const klasaTowarzysza = klasyWszystkie.find(d => d.system?.identifier === "towarzysz");

/* ---- counts ---- */
if (klasy.length !== Object.keys(CLASSES).length) fail(`klasy: ${klasy.length} docs, expected ${Object.keys(CLASSES).length}`);
if (profesje.length !== Object.keys(PROFESSIONS).length) fail(`profesje: ${profesje.length}, expected ${Object.keys(PROFESSIONS).length}`);
if (features.length !== Object.keys(CLASS_FEATURES).length) fail(`zdolnosci: ${features.length}, expected ${Object.keys(CLASS_FEATURES).length}`);
if (sztuczki.length !== Object.keys(SZTUCZKI).length) fail(`sztuczki: ${sztuczki.length}, expected ${Object.keys(SZTUCZKI).length}`);
if (pochodzenia.length !== Object.keys(ORIGIN_ABILITIES).length) fail(`pochodzenia: ${pochodzenia.length}, expected ${Object.keys(ORIGIN_ABILITIES).length}`);
if (origins.length !== Object.keys(POCHODZENIA).length) fail(`origins: ${origins.length}, expected ${Object.keys(POCHODZENIA).length}`);

const byId = new Set([...features, ...profesje, ...sztuczki, ...pochodzenia].map(d => d._id));
const originAbilityById = new Set(pochodzenia.map(d => d._id));

/* ---- origins: bonus, ability pool, no leftovers ---- */
for (const doc of origins) {
  const key = doc.system.identifier;
  const def = POCHODZENIA[key];
  if (!def) { fail(`unknown origin identifier in pack: ${key}`); continue; }

  const asi = advOf(doc).find(a => a.type === "AbilityScoreImprovement");
  if (!asi) fail(`${key}: missing AbilityScoreImprovement`);
  else {
    const want = attrBonus(key);
    const got = asi.configuration.fixed ?? {};
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      fail(`${key}: fixed ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
    // points > 0 would let the player hand out extra increases on top of the origin.
    if (asi.configuration.points) fail(`${key}: ASI points ${asi.configuration.points}, expected 0`);
  }

  const choice = advOf(doc).find(a => a.type === "ItemChoice");
  if (!choice) { fail(`${key}: missing ItemChoice`); continue; }
  const pool = choice.configuration.pool ?? [];
  const expected = Object.values(ORIGIN_ABILITIES).filter(a => a.origin === key).length;
  if (pool.length !== expected) fail(`${key}: pool ${pool.length}, expected ${expected}`);
  for (const { uuid } of pool) {
    if (!originAbilityById.has(uuid.split(".").pop())) fail(`${key}: dangling uuid ${uuid}`);
  }
}

const orphanAbilities = Object.values(ORIGIN_ABILITIES).filter(a => !POCHODZENIA[a.origin]);
if (orphanAbilities.length) fail(`zdolności bez Pochodzenia: ${orphanAbilities.map(a => a.id).join(", ")}`);

/* ---- every advancement uuid resolves to a built document ---- */
for (const doc of [...klasy, ...profesje, ...(klasaTowarzysza ? [klasaTowarzysza] : [])]) {
  for (const a of advOf(doc) ?? []) {
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

  const types = advOf(doc).reduce((m, a) => (m[a.type] = (m[a.type] ?? 0) + 1, m), {});
  if (!types.HitPoints) fail(`${cid}: missing HitPoints advancement`);
  if (!types.Subclass) fail(`${cid}: missing Subclass advancement`);
  if (!types.Trait) fail(`${cid}: missing Trait advancement`);

  const sub = advOf(doc).find(a => a.type === "Subclass");
  if (sub && sub.level !== def.professionLevels[0]) {
    fail(`${cid}: Subclass at L${sub.level}, expected L${def.professionLevels[0]}`);
  }

  // scale values complete and monotonic in level keys
  for (const [key, sv] of Object.entries(def.scale ?? {})) {
    const a = advOf(doc).find(x => x.type === "ScaleValue" && x.configuration.identifier === key);
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
    const fromClass = advOf(doc).filter(a => a.level === lvl && a.type === "ItemChoice");
    const fromSub = advOf(subs[0]).filter(a => a.level === lvl && a.type === "ItemChoice");
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
      if (id === POCHODZENIE) { expected++; continue; }
      const g = resolveGrant(id);
      if (!g) { fail(`${cid} L${lvl}: unresolved grant ${id}`); continue; }
      if (g.type === "featureWithChoice") expected++;
      else if (g.type === "repeat" && g.kind === "choice") expected++;
      else if (g.type === "repeat" && g.kind === "trait") expectedTraits++;
    }

    if (total !== expected) {
      fail(`${cid} L${lvl}: ${total} ItemChoice(s), rulebook grants ${expected} `
         + `[${[...fromClass, ...fromSub].map(a => a.name ?? a.title).join(" | ")}]`);
    }

    const traits = advOf(doc).filter(a => a.level === lvl && a.type === "Trait").length;
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
  const levels = advOf(doc).map(a => a.level).sort((a, b) => a - b);
  const want = CLASSES[def.klasa].professionLevels;
  if (levels.join(",") !== want.join(",")) {
    fail(`${pid}: choices at ${levels.join("/")}, expected ${want.join("/")}`);
  }
  for (const a of advOf(doc)) {
    // "Zdolność z profesji / Sztuczka" is one either/or pick, so its pool is the
    // profession's own abilities plus every Sztuczka.
    const entry = CLASSES[def.klasa].levels[a.level] ?? [];
    const want = def.abilities.length
      + (entry.includes(PROFESJA_LUB_SZTUCZKA) ? Object.keys(SZTUCZKI).length : 0);
    if (a.configuration.pool.length !== want) {
      fail(`${pid} L${a.level}: pool ${a.configuration.pool.length}, expected ${want}`);
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

/* ---- towarzysze (PLAN_m3 §7.8) ---- */
if (!klasaTowarzysza) fail("klasy: brak klasy „Towarzysz”");
else {
  const adv = advOf(klasaTowarzysza);
  const ile = t => adv.filter(a => a.type === t && a.level === 1).length;
  if (klasaTowarzysza.system.hd?.denomination !== "d6") fail(`towarzysz: hd ${klasaTowarzysza.system.hd?.denomination} != d6`);
  if (adv.some(a => a.type === "HitPoints")) fail("towarzysz: HitPoints advancement — PW liczy moduł (U5)");
  if (ile("Trait") !== 2 || ile("ItemChoice") !== 1 || adv.length !== 3) fail("towarzysz: oczekiwane 2 × Trait i 1 × ItemChoice na poziomie 1");
  if (!klasaTowarzysza.folder) fail("towarzysz: poza folderem „Towarzysze” — wpadnie w wybór klasy BG");
}
const szablony = towarzysze.filter(d => d.prototypeToken);
if (szablony.length !== Object.keys(STATBLOKI).length) fail(`towarzysze: ${szablony.length} szablonów, oczekiwane ${Object.keys(STATBLOKI).length}`);
for (const a of szablony) {
  const rodzaj = a.flags?.[MODULE_ID]?.towarzyszSzablon;
  const wpis = RODZAJE[rodzaj];
  if (!wpis) { fail(`towarzysze: ${a.name} bez znanej flagi szablonu`); continue; }
  const ac = a.system.attributes.ac;
  if ((ac.calcs ?? []).length || ac.formulas?.length !== 1 || ac.formulas[0].formula !== wpis.wzory.tt) fail(`towarzysze: ${a.name} — TT nie z samej formuły właściciela`);
  if (!a.prototypeToken.actorLink) fail(`towarzysze: ${a.name} — żeton niepowiązany`);
  if (a.flags[MODULE_ID].bestiary?.usesZranienie !== !wpis.maszyna) fail(`towarzysze: ${a.name} — Stopnie Zranienia: istota tak (s. 205), maszyna nie (s. 214)`);
  if (wpis.maszyna) {
    if (a.flags[MODULE_ID].bestiary?.failureThreshold !== wpis.progi.awarii) fail(`towarzysze: ${a.name} — Próg awarii ${a.flags[MODULE_ID].bestiary?.failureThreshold} ≠ ${wpis.progi.awarii}`);
    continue; // broń drona to modyfikacja — szablon ataku nie ma
  }
  const ataki = towarzysze.filter(d => !d.prototypeToken && a.items?.includes(d._id))
    .flatMap(d => Object.values(d.system?.activities ?? {})).filter(x => x.type === "attack");
  if (!ataki.length || ataki.some(x => x.attack?.bonus !== wpis.wzory.atak)) fail(`towarzysze: ${a.name} — premia ataku nie z formuły właściciela`);
}
notes.push(`towarzysze: klasa ${klasaTowarzysza ? "jest" : "BRAK"}, ${szablony.length} szablonów (zwierzęta i drony)`);

notes.push(`features: ${features.length} (uses ${withUses}, activities ${withActivity}, art ${withArt})`);
notes.push(`sztuczki: ${sztuczki.length} docs; Pochodzenia: ${origins.length}, ich zdolności: ${pochodzenia.length}`);
notes.push(`advancements: ${[...klasy, ...profesje, ...origins].reduce((n, d) => n + advOf(d).length, 0)}`);

/* ---- tabele (PLAN_m5_postoj §7.17, U14): domknięcia zakresów i odnośniki do istniejących dokumentów ---- */
{
  const docs = await load("tabele");
  const wyniki = new Map(docs.filter(d => Array.isArray(d.range)).map(d => [d._id, d]));
  const tabele = docs.filter(d => typeof d.formula === "string").map(t => ({ ...t, results: t.results.map(id => wyniki.get(id)).filter(Boolean) }));
  for (const t of docs.filter(d => typeof d.formula === "string")) {
    if (t.results.some(id => !wyniki.has(id))) fail(`tabele: ${t.name} — wynik bez dokumentu`);
  }
  for (const b of bledyTabel(tabele)) fail(`tabele: ${b}`);
  const paczki = new Map();
  const idyPaczki = async name => {
    if (!paczki.has(name)) paczki.set(name, new Set((await load(name)).map(d => d._id)));
    return paczki.get(name);
  };
  let linki = 0;
  for (const r of wyniki.values()) {
    if (r.type !== "document") continue;
    const m = /^Compendium\.([^.]+)\.([^.]+)\.[A-Za-z]+\.([A-Za-z0-9]{16})$/.exec(r.documentUuid ?? "");
    if (!m || m[1] !== MODULE_ID) { fail(`tabele: ${r.name} — odnośnik ${r.documentUuid}`); continue; }
    if (!(await idyPaczki(m[2])).has(m[3])) fail(`tabele: ${r.name} — brak ${r.documentUuid}`);
    linki++;
  }
  notes.push(`tabele: ${tabele.length} tabel, ${wyniki.size} wyników, ${linki} odnośników`);
}

/* ---- images: only this module, dnd5e and core icons; never a world path (PLAN_human_testing §11) ---- */
{
  const IMG = /\.(webp|png|jpe?g|svg|gif|avif)$/i;
  const DATA_ROOT = path.resolve(MODULE_ROOT, "../..");
  // On disk where it can be checked: the working tree always, core and dnd5e only with a local install.
  const ROOTS = [
    { prefix: `modules/${MODULE_ID}/`, dir: MODULE_ROOT, n: 0 },
    { prefix: "systems/dnd5e/", dir: path.join(DATA_ROOT, "systems/dnd5e"), n: 0 },
    { prefix: "icons/", dir: path.join(FOUNDRY_APP, "public/icons"), n: 0 }
  ];
  const zle = new Map();
  const sprawdz = (src, pack, doc) => {
    const p = src.replace(/^\//, "");
    const root = ROOTS.find(r => p.startsWith(r.prefix));
    const powod = p.startsWith("worlds/") ? "ścieżka świata"
      : !root ? "poza modułem, dnd5e i rdzeniem"
        : fs.existsSync(root.dir) && !fs.existsSync(path.join(root.dir, p.slice(root.prefix.length))) ? "brak pliku"
          : null;
    if (root) root.n++;
    if (powod && !zle.has(p)) zle.set(p, `${pack}: ${doc} — ${p} (${powod})`);
  };
  const przejdz = (v, pack, doc) => {
    if (typeof v === "string") {
      if (IMG.test(v) && !/^(https?:|data:)/.test(v)) sprawdz(v, pack, doc);
      for (const m of v.matchAll(/src=["']([^"']+)["']/g)) if (!/^(https?:|data:)/.test(m[1])) sprawdz(m[1], pack, doc);
    } else if (Array.isArray(v)) for (const x of v) przejdz(x, pack, doc);
    else if (v && typeof v === "object") for (const x of Object.values(v)) przejdz(x, pack, doc);
  };
  const manifest = JSON.parse(fs.readFileSync(path.join(MODULE_ROOT, "module.json"), "utf8"));
  for (const { path: p } of manifest.packs) {
    const pack = path.basename(p);
    for (const d of await load(pack)) przejdz(d, pack, d.name ?? d._id);
  }
  for (const z of zle.values()) fail(`obrazy: ${z}`);
  const niesprawdzone = ROOTS.filter(r => !fs.existsSync(r.dir)).map(r => r.prefix);
  notes.push(`obrazy: ${ROOTS.map(r => `${r.prefix} ${r.n}`).join(", ")}`
    + (niesprawdzone.length ? ` (istnienie plików niesprawdzone: ${niesprawdzone.join(", ")})` : ""));
}

/* ---- report ---- */
console.log("Neuroshima 5e — pack validation\n");
for (const n of notes) console.log(`  ${n}`);
if (failures.length) {
  console.error(`\n${failures.length} FAILURE(S):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("\n  all checks passed");
