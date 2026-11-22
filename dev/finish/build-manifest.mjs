#!/usr/bin/env node
/**
 * Finish manifest builder (PLAN_m9_style.md §7.2, E1b).
 *
 *   node dev/finish/build-manifest.mjs              # stage the packs, derive, write manifest + report
 *   node dev/finish/build-manifest.mjs --packs=DIR  # reuse an existing `build-packs --out=DIR`
 *   node dev/finish/build-manifest.mjs --check      # derive and compare; exit 1 when the manifest is stale
 *
 * One entry per subject: a white master worn by one family. Families come from the data the pack
 * builder emits (dev/finish/families.mjs); consumers are the pack documents and the scripts that
 * name the icon. Whatever cannot be assigned lands in dev/finish/REPORT.md, not in a guess.
 *
 * Human fields survive a rebuild: `review`, `opticalCorrection`, `outputPixelSha256`, and every
 * entry that is not an icon (banners, signs, status).
 */
import fs from "node:fs";
import path from "node:path";
import { MODULE_ID, MODULE_ROOT, abs, loadManifest, loadProfile, recipeFor, saveManifest, sha256File, MANIFEST_PATH } from "./lib/profile.mjs";
import { readPacks, stagePacks } from "./lib/packs.mjs";
import { PILOT, familyOf, activityFamily, scriptSubjects, configExclusion } from "./families.mjs";

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const PACKS = args.find(a => a.startsWith("--packs="))?.slice(8);
const REPORT_PATH = abs("dev/finish/REPORT.md");
const ICON_PREFIX = `modules/${MODULE_ID}/`;

function walk(dir, test, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, out);
    else if (test(full)) out.push(full);
  }
  return out;
}

/** The raster the engine reads for a wrapper path: sibling WEBP/PNG, else the SVG's embedded mask. */
function masterOf(wrapper) {
  const base = wrapper.replace(/\.(svg|webp|png)$/, "");
  for (const ext of ["webp", "png"]) if (fs.existsSync(abs(`${base}.${ext}`))) return `${base}.${ext}`;
  if (fs.existsSync(abs(`${base}.svg`)) && /<mask[\s\S]*data:image\//.test(fs.readFileSync(abs(`${base}.svg`), "utf8"))) return `${base}.svg`;
  return null;
}

const staged = PACKS ? path.resolve(PACKS) : stagePacks();
const records = await readPacks(staged);
if (!PACKS) fs.rmSync(staged, { recursive: true, force: true });

/* ---- who grants what: class / profession → features ---- */

const byUuid = new Map();
const professions = new Map();
for (const { pack, key, doc } of records) {
  if (!key.startsWith("!items!")) continue;
  byUuid.set(`Compendium.${MODULE_ID}.${pack}.Item.${doc._id}`, { pack, doc });
  const flags = doc.flags?.[MODULE_ID] ?? {};
  if (pack === "profesje" && flags.professionId) professions.set(flags.professionId, flags.klasa);
}
const grantedBy = new Map();
for (const [uuid, { doc }] of byUuid) {
  const advancement = doc.system?.advancement;
  for (const adv of Array.isArray(advancement) ? advancement : Object.values(advancement ?? {})) {
    const refs = [...(adv.configuration?.items ?? []), ...(adv.configuration?.pool ?? [])].map(r => r.uuid).filter(Boolean);
    for (const ref of refs) (grantedBy.get(ref) ?? grantedBy.set(ref, new Set()).get(ref)).add(uuid);
  }
}
function classOf(uuid, seen = new Set()) {
  const out = new Set();
  for (const parent of grantedBy.get(uuid) ?? []) {
    if (seen.has(parent)) continue;
    seen.add(parent);
    const { pack, doc } = byUuid.get(parent) ?? {};
    const flags = doc?.flags?.[MODULE_ID] ?? {};
    if (pack === "klasy" && flags.classId && !flags.towarzysz) out.add(flags.classId);
    else if (pack === "profesje" && flags.klasa) out.add(flags.klasa);
    else for (const c of classOf(parent, seen)) out.add(c);
  }
  return [...out];
}

/* ---- subjects ---- */

const profile = loadProfile();
/** id → {family, size, canonicalSource, wrapper, consumers: Map} */
const subjects = new Map();
/** reason → Map(wrapper → Set(where)) */
const gaps = new Map();
const collisions = [];
const familiesOfWrapper = new Map();
const exclusions = [];

function consumer(subject, key, data) {
  const cur = subject.consumers.get(key);
  if (!cur) return void subject.consumers.set(key, { ...data, ids: data.ids ? [...data.ids] : undefined });
  if (data.ids) (cur.ids ??= []).push(...data.ids);
}

function assign(wrapper, verdict, where, consumerKey, consumerData) {
  if (verdict.gap) {
    const bucket = gaps.get(verdict.gap) ?? gaps.set(verdict.gap, new Map()).get(verdict.gap);
    (bucket.get(wrapper) ?? bucket.set(wrapper, new Set()).get(wrapper)).add(where);
    return;
  }
  if (!profile.contentFamilies[verdict.family]) throw new Error(`Reguła zwróciła rodzinę spoza profilu: ${verdict.family}`);
  const baseId = `${verdict.family}/${path.basename(wrapper).replace(/\.\w+$/, "")}`;
  const prior = previous.entries.find(e => e.kind === "icon" && e.wrapper === wrapper && e.family === verdict.family);
  let id = prior?.id ?? baseId;
  const reserved = previous.entries.find(e => e.id === id);
  if ((reserved && reserved.wrapper !== wrapper) || (subjects.has(id) && subjects.get(id).wrapper !== wrapper)) {
    // A basename is not a global identity: keep existing ids and qualify the other library path.
    id = `${baseId}--${wrapper.split("/").slice(1, -1).join("-")}`;
  }
  let subject = subjects.get(id);
  if (subject && subject.wrapper !== wrapper) {
    collisions.push(`${id}: ${subject.wrapper} i ${wrapper}`);
    return;
  }
  if (!subject) subjects.set(id, subject = { id, wrapper, family: verdict.family, size: verdict.size, canonicalSource: verdict.canonicalSource, consumers: new Map() });
  subject.size = Math.max(subject.size, verdict.size);
  consumer(subject, consumerKey, consumerData);
  (familiesOfWrapper.get(wrapper) ?? familiesOfWrapper.set(wrapper, new Set()).get(wrapper)).add(verdict.family);
}

/**
 * The wrapper a document names. Builders that already point at a finished export (§7.5) are
 * mapped back to the white-master wrapper through the previous manifest, so a rebuild is stable.
 */
const previous = loadManifest();
const wrapperOfOutput = new Map(previous.entries.filter(e => e.kind === "icon").flatMap(e => e.outputs.map(o => [o.path, e.wrapper])));
function moduleIcon(img) {
  if (typeof img !== "string" || !img.startsWith(`${ICON_PREFIX}icons/`)) return null;
  const relative = img.slice(ICON_PREFIX.length);
  return relative.startsWith("icons/finished/") ? wrapperOfOutput.get(relative) ?? null : relative;
}

for (const { pack, key, doc } of records) {
  const embedded = key.startsWith("!actors.items!");
  if (!key.startsWith("!items!") && !embedded) continue;
  const uuid = `Compendium.${MODULE_ID}.${pack}.Item.${doc._id}`;
  const verdict = familyOf({ pack, doc, uuid, embedded, classOf, professions });
  const itemRef = embedded ? key.slice("!actors.items!".length) : doc._id;
  const wrapper = moduleIcon(doc.img);
  if (wrapper) assign(wrapper, verdict, `${pack}: ${doc.name}`, `pack:${pack}:${embedded ? "embedded" : "item"}`, { type: "pack", pack, via: embedded ? "actor.items[].img" : "item.img", ids: [itemRef] });
  for (const [activityId, activity] of Object.entries(doc.system?.activities ?? {})) {
    const actWrapper = moduleIcon(activity.img);
    if (!actWrapper) continue;
    const actVerdict = activityFamily({ pack, wrapper: actWrapper, verdict });
    assign(actWrapper, actVerdict, `${pack}: ${doc.name} › ${activity.name ?? activity.type}`, `pack:${pack}:${embedded ? "embedded-activity" : "activity"}`, { type: "pack", pack, via: embedded ? "actor.items[].system.activities[].img" : "item.system.activities[].img", ids: [`${itemRef}.${activityId}`] });
  }
}

/* ---- config and lookup consumers: scripts that name an icon ---- */

const scriptRefs = new Map();
for (const file of walk(abs("scripts"), f => f.endsWith(".mjs") && !f.includes(`${path.sep}tests${path.sep}`) && !f.endsWith(`${path.sep}finished-icons-data.mjs`))) {
  const source = fs.readFileSync(file, "utf8");
  for (const m of source.matchAll(/icons\/[\w/.-]+\.(?:svg|webp|png)/g)) {
    if (!fs.existsSync(abs(m[0])) || m[0].startsWith("icons/finished/")) continue;
    const wrapper = m[0];
    (scriptRefs.get(wrapper) ?? scriptRefs.set(wrapper, new Set()).get(wrapper)).add(path.relative(MODULE_ROOT, file).replaceAll("\\", "/"));
  }
}
for (const [wrapper, files] of scriptRefs) {
  if (/^icons\/statuses\//.test(wrapper)) continue;
  for (const file of files) {
    const excluded = configExclusion({ wrapper, file });
    if (excluded) { exclusions.push({ wrapper, file, why: excluded.why }); continue; }
    const known = [...subjects.values()].filter(s => s.wrapper === wrapper);
    const verdicts = scriptSubjects({ wrapper, file, known });
    for (const verdict of verdicts) assign(wrapper, verdict, file, `script:${file}`, { type: "script", file, via: "config/lookup", why: verdict.why, runtimeGlobal: verdict.runtimeGlobal === true });
    if (!verdicts.length) {
      const reason = "Ikona wskazana tylko w kodzie (lookup, pasek, HUD) — rodzina wymaga wpisu w CONFIG_SUBJECTS";
      const bucket = gaps.get(reason) ?? gaps.set(reason, new Map()).get(reason);
      (bucket.get(wrapper) ?? bucket.set(wrapper, new Set()).get(wrapper)).add(file);
    }
  }
}

/* ---- entries ---- */

const prevById = new Map(previous.entries.map(e => [e.id, e]));
const today = new Date().toISOString().slice(0, 10);
const noMaster = [];
const entries = [];
for (const subject of [...subjects.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  const master = masterOf(subject.wrapper);
  if (!master) { noMaster.push(subject.wrapper); continue; }
  const recipe = recipeFor(profile, subject.family);
  const old = prevById.get(subject.id);
  const entry = {
    id: subject.id,
    kind: "icon",
    source: master,
    sourceSha256: sha256File(abs(master)),
    wrapper: subject.wrapper,
    family: subject.family,
    role: recipe.role,
    canonicalSource: recipe.role === "character" ? recipe.source : undefined,
    recipe: `${profile.id}#${recipe.name}`,
    opticalCorrection: old?.opticalCorrection,
    outputs: [{ path: `icons/finished/${subject.id}.webp`, size: subject.size }],
    consumers: [...subject.consumers.values()].map(c => (c.ids ? { ...c, ids: [...new Set(c.ids)].sort() } : c)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    review: old?.review ?? { status: PILOT.includes(subject.id) ? "pilot" : "planned", date: today, notes: "" },
    outputPixelSha256: old?.outputPixelSha256
  };
  entries.push(JSON.parse(JSON.stringify(entry)));
}
const missingPilot = PILOT.filter(id => !entries.some(e => e.id === id));
const kept = previous.entries.filter(e => e.kind !== "icon");
const manifest = { schema: "noe-finish-manifest/v1", profile: profile.id, tools: previous.tools, entries: [...kept, ...entries] };

/* ---- report ---- */

const count = (list, key) => list.reduce((acc, e) => ((acc[key(e)] = (acc[key(e)] ?? 0) + 1), acc), {});
const perFamily = count(entries, e => e.family);
const perStatus = count(entries, e => e.review.status);
const shared = [...familiesOfWrapper].filter(([, f]) => f.size > 1);
const consumed = new Set([...subjects.values()].map(s => s.wrapper.replace(/\.\w+$/, "")));
for (const bucket of gaps.values()) for (const wrapper of bucket.keys()) consumed.add(wrapper.replace(/\.\w+$/, ""));
for (const item of exclusions) consumed.add(item.wrapper.replace(/\.\w+$/, ""));
const library = new Set(walk(abs("icons"), f => /\.(svg|webp|png)$/.test(f) && !f.includes(`${path.sep}finished${path.sep}`)).map(f => path.relative(MODULE_ROOT, f).replaceAll("\\", "/").replace(/\.\w+$/, "")));
const unconsumed = [...library].filter(p => !consumed.has(p) && !p.startsWith("icons/statuses/")).sort();

const lines = [
  "# Manifest wykończeń — raport przypisań",
  "",
  "Generowane przez `node dev/finish/build-manifest.mjs` — nie edytuj ręcznie. Źródło reguł:",
  "[families.mjs](families.mjs). Rodzina pochodzi z danych (paczka, typ, flagi modułu), nigdy z nazwy pliku.",
  "",
  `Profil: \`${profile.id}\`. Tematów z rodziną: **${entries.length}** (biały master × rodzina). Stan przeglądu: ${Object.entries(perStatus).map(([k, v]) => `${k} ${v}`).join(", ")}.`,
  "",
  "| Rodzina | Rola | Tematów |",
  "| --- | --- | ---: |",
  ...Object.keys(profile.contentFamilies).map(f => `| ${f} | ${profile.contentFamilies[f].role} | ${perFamily[f] ?? 0} |`),
  "",
  "## Braki — bez przypisania",
  "",
  "Luka oznacza brak reguły z danych konsumenta. Nowe rodziny zatwierdzone w profilu v2:",
  "creature i shared — neutralne tło generic; devices — kolor tools; documents — kolor salvage.",
  ""
];
if (!gaps.size) lines.push("Brak.", "");
for (const [reason, bucket] of [...gaps].sort((a, b) => b[1].size - a[1].size)) {
  const names = [...bucket.keys()].sort();
  lines.push(`### ${reason}`, "", `${names.length} ikon. ${names.slice(0, 12).map(n => `\`${n}\``).join(", ")}${names.length > 12 ? ` … (+${names.length - 12})` : ""}`, "");
}
lines.push("## Jawne wyjątki — poza recepturami glifów", "",
  ...exclusions.map(e => `- \`${e.wrapper}\` — ${e.why} (\`${e.file}\`).`), "");
lines.push("## Ten sam master w kilku rodzinach", "",
  "Poprawne: tło mówi, skąd zdolność pochodzi, więc jeden glif dostaje osobny eksport na rodzinę.", "",
  shared.length ? shared.sort().map(([w, f]) => `- \`${w}\` → ${[...f].sort().join(", ")}`).join("\n") : "Brak.", "");
lines.push("## Kolizje identyfikatorów", "", collisions.length ? collisions.map(c => `- ${c}`).join("\n") : "Brak.", "");
lines.push("## Brak białego mastera", "", noMaster.length ? noMaster.map(c => `- \`${c}\``).join("\n") : "Brak.", "");
lines.push("## Pilot E2", "", missingPilot.length ? `Brakujące tematy pilota: ${missingPilot.join(", ")}` : `Komplet ${PILOT.length} tematów pilota ma wpis.`, "");
lines.push("## Pliki biblioteki bez konsumenta w paczkach i kodzie", "",
  `${unconsumed.length} ścieżek (bez rozszerzenia; stany pominięte — mają własny kontrakt kolorów). To kandydaci na ikony przypisywane dopiero w świecie`,
  "(embedded items aktorów, ręczne przedmioty) albo nieużywane warianty; rozstrzyga E5.", "",
  unconsumed.slice(0, 40).map(n => `\`${n}\``).join(", ") + (unconsumed.length > 40 ? ` … (+${unconsumed.length - 40})` : ""), "");
const report = `${lines.join("\n")}\n`;

const serialise = m => `{\n  "schema": ${JSON.stringify(m.schema)},\n  "profile": ${JSON.stringify(m.profile)},\n  "tools": ${JSON.stringify(m.tools ?? null)},\n  "entries": [\n${m.entries.map(e => `    ${JSON.stringify(e)}`).join(",\n")}\n  ]\n}\n`;

if (CHECK) {
  const problems = [];
  const norm = s => s.replaceAll("\r\n", "\n");
  const strip = m => serialise({ ...m, entries: m.entries.map(e => ({ ...e, review: e.review && { ...e.review, date: undefined } })) });
  if (strip(manifest) !== strip(previous)) problems.push("dev/finish/manifest.json nie odpowiada danym — uruchom node dev/finish/build-manifest.mjs");
  if (!fs.existsSync(REPORT_PATH) || norm(fs.readFileSync(REPORT_PATH, "utf8")) !== report) problems.push("dev/finish/REPORT.md jest nieaktualny");
  if (collisions.length) problems.push(`kolizje identyfikatorów: ${collisions.join("; ")}`);
  if (missingPilot.length) problems.push(`pilot bez wpisu: ${missingPilot.join(", ")}`);
  if (problems.length) { console.error(`Manifest wykończeń — ${problems.length} problem(ów):\n  ${problems.join("\n  ")}`); process.exit(1); }
  console.log(`Manifest wykończeń aktualny — ${entries.length} tematów, ${[...gaps.values()].reduce((a, b) => a + b.size, 0)} ikon w raporcie braków.`);
} else {
  fs.writeFileSync(MANIFEST_PATH, serialise(manifest));
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Manifest: ${entries.length} tematów (${Object.entries(perFamily).map(([k, v]) => `${k} ${v}`).join(", ")}).`);
  console.log(`Braki: ${[...gaps].map(([r, b]) => `${b.size} — ${r}`).join("\n       ")}`);
  if (collisions.length) console.log(`Kolizje: ${collisions.join("; ")}`);
  if (missingPilot.length) console.log(`Pilot bez wpisu: ${missingPilot.join(", ")}`);
}
void saveManifest;
