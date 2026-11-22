#!/usr/bin/env node
/** Read-only M9 artwork/assignment audit. Uses staged packs and the icon browser's catalog. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { buildCatalog } from "./review/catalog.mjs";
import { MODULE_ROOT, abs, loadManifest, loadProfile, sha256File } from "../finish/lib/profile.mjs";
import { readPacks, stagePacks } from "../finish/lib/packs.mjs";
import { configSubjects, configExclusion, activityFamily, familyOf, MODULE_ID } from "../finish/families.mjs";
import { buildM9AuditPreview } from "./m9-audit-preview.mjs";

const prefix = `modules/${MODULE_ID}/`;
const profile = loadProfile();
const finish = loadManifest();
const catalog = buildCatalog(MODULE_ROOT, abs("dev/icons/review"));
const read = file => JSON.parse(fs.readFileSync(abs(file), "utf8"));
const review = read("dev/icons/review/manifest.json");
const feedback = read("dev/icons/review/feedback.json");
const count = (items, key) => items.reduce((out, item) => (out[key(item)] = (out[key(item)] ?? 0) + 1, out), {});
const stem = value => value.replace(/\.[^.]+$/, "");
const nonGlyph = new Map([
  ["icons/doll/mannequin.webp", "Anatomical equipment mannequin; preserve the illustration rather than apply a content glyph recipe."],
  ["icons/obiekty/ramka.svg", "Native vector scene target frame; its existing two-colour canvas treatment is intentional."]
]);
const masterOf = wrapper => {
  for (const ext of ["webp", "png"]) {
    const file = `${stem(wrapper)}.${ext}`;
    if (fs.existsSync(abs(file))) return file;
  }
  if (fs.existsSync(abs(wrapper)) && wrapper.endsWith(".svg") && /<mask[\s\S]*data:image\//.test(fs.readFileSync(abs(wrapper), "utf8"))) return wrapper;
  return null;
};
const byStem = new Map(catalog.icons.map(icon => [`icons/${icon.id}`, icon]));
const byOutput = new Map(finish.entries.filter(e => e.kind === "icon").flatMap(e => e.outputs.map(o => [o.path, e.wrapper])));
const moduleIcon = img => {
  if (typeof img !== "string" || !img.startsWith(`${prefix}icons/`)) return null;
  const relative = img.slice(prefix.length);
  return relative.startsWith("icons/finished/") ? byOutput.get(relative) ?? relative : relative;
};

const staged = stagePacks();
let records;
try { records = await readPacks(staged); }
finally {
  // stagePacks owns this newly created temporary directory, never a live Foundry database.
  const resolved = path.resolve(staged);
  if (!path.basename(resolved).startsWith("noe-finish-packs-")) throw new Error("Unexpected staging directory");
  fs.rmSync(resolved, { recursive: true, force: true });
}
const byUuid = new Map(), professions = new Map(), grantedBy = new Map();
for (const { pack, key, doc } of records) {
  if (!key.startsWith("!items!")) continue;
  const uuid = `Compendium.${MODULE_ID}.${pack}.Item.${doc._id}`;
  byUuid.set(uuid, { pack, doc });
  const flags = doc.flags?.[MODULE_ID] ?? {};
  if (pack === "profesje" && flags.professionId) professions.set(flags.professionId, flags.klasa);
  const adv = doc.system?.advancement ?? [];
  for (const entry of Array.isArray(adv) ? adv : Object.values(adv)) {
    for (const ref of [...(entry.configuration?.items ?? []), ...(entry.configuration?.pool ?? [])]) {
      if (ref.uuid) (grantedBy.get(ref.uuid) ?? grantedBy.set(ref.uuid, new Set()).get(ref.uuid)).add(uuid);
    }
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
    else for (const cls of classOf(parent, seen)) out.add(cls);
  }
  return [...out];
}

const refs = new Map();
function add(wrapper, verdict, context) {
  if (!wrapper) return;
  const item = refs.get(wrapper) ?? refs.set(wrapper, { wrapper, families: new Set(), gaps: new Set(), contexts: [] }).get(wrapper);
  if (verdict.family) item.families.add(verdict.family);
  if (verdict.gap) item.gaps.add(verdict.gap);
  item.contexts.push(context);
}
for (const { pack, key, doc } of records) {
  const embedded = key.startsWith("!actors.items!");
  if (!key.startsWith("!items!") && !embedded) continue;
  const uuid = `Compendium.${MODULE_ID}.${pack}.Item.${doc._id}`;
  const verdict = familyOf({ pack, doc, uuid, embedded, classOf, professions });
  const flags = doc.flags?.[MODULE_ID] ?? {};
  const evidence = Object.fromEntries(["classId", "professionId", "klasa", "abilityId", "source", "owner", "productionGearId", "fant", "detonator", "electricFuze", "bateria", "latarka", "gogle", "staza", "chemiaKey", "grenade"]
    .filter(key => flags[key] !== undefined).map(key => [key, flags[key]]));
  const context = { type: "pack", pack, name: doc.name, id: doc._id, embedded,
    itemType: doc.type, flags: evidence, classes: pack === "zdolnosci-klasowe" ? classOf(uuid).sort() : undefined };
  add(moduleIcon(doc.img), verdict, context);
  for (const [id, activity] of Object.entries(doc.system?.activities ?? {})) {
    const wrapper = moduleIcon(activity.img);
    if (!wrapper) continue;
    add(wrapper, activityFamily({ pack, wrapper, verdict }), { ...context, activity: activity.name ?? activity.type, activityId: id });
  }
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
const missingLiteralScriptRefs = [];
for (const file of walk(abs("scripts")).filter(f => f.endsWith(".mjs") && !f.includes(`${path.sep}tests${path.sep}`) && !f.endsWith(`${path.sep}finished-icons-data.mjs`))) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(MODULE_ROOT, file).replaceAll("\\", "/");
  for (const wrapper of new Set([...source.matchAll(/icons\/[\w/.-]+\.(?:svg|webp|png)/g)].map(m => m[0]))) {
    if (wrapper.startsWith("icons/finished/")) continue;
    if (!fs.existsSync(abs(wrapper))) {
      // Bare core icon paths are valid too. Only an explicit module path proves a broken reference.
      if (source.includes(`${prefix}${wrapper}`)) missingLiteralScriptRefs.push({ wrapper, file: relative });
      continue;
    }
    if (wrapper.startsWith("icons/statuses/")) continue;
    const explicit = configSubjects({ wrapper, file: relative });
    const excluded = configExclusion({ wrapper, file: relative });
    const existing = refs.get(wrapper);
    const verdicts = excluded ? [{}] : explicit.length ? explicit : [existing?.families.size ? {} : { gap: "Ikona wskazana tylko w kodzie (lookup, pasek, HUD) — rodzina wymaga wpisu w CONFIG_SUBJECTS" }];
    for (const verdict of verdicts) add(wrapper, verdict, { type: "script", file: relative, exclusion: excluded?.why });
  }
}

const entries = [...refs.values()].sort((a, b) => a.wrapper.localeCompare(b.wrapper)).map(item => {
  const icon = byStem.get(stem(item.wrapper));
  const master = masterOf(item.wrapper);
  return { ...item, families: [...item.families].sort(), gaps: [...item.gaps].sort(),
    exists: fs.existsSync(abs(item.wrapper)), master, masterSha256: master ? sha256File(abs(master)) : null,
    nonGlyph: nonGlyph.get(item.wrapper) ?? null,
    placeholder: icon?.placeholder ?? false, style: icon?.review ?? null,
    contexts: [...new Map(item.contexts.map(c => [JSON.stringify(c), c])).values()] };
});
const gaps = entries.filter(e => e.gaps.length);
const unresolvedReviews = review.items.filter(item => feedback.items[item.id]?.decision !== "approve")
  .map(item => ({ id: item.id, target: item.target, status: item.status, resolutionNote: item.resolutionNote,
    decision: feedback.items[item.id] ?? null, request: item.request, context: item.context }));
const consumed = new Set(entries.map(e => stem(e.wrapper)));
const unconsumed = catalog.icons.filter(icon => !icon.id.startsWith("statuses/") && !icon.id.startsWith("finished/") && !consumed.has(`icons/${icon.id}`)).map(icon => `icons/${icon.id}`);
const gapGroups = Object.fromEntries([...new Set(gaps.flatMap(e => e.gaps))].map(reason => [reason, gaps.filter(e => e.gaps.includes(reason)).map(e => e.wrapper)]));
const missingFiles = entries.filter(e => !e.exists).map(e => e.wrapper);
const missingMasters = entries.filter(e => !e.master && !e.nonGlyph).map(e => e.wrapper);
const placeholders = catalog.icons.filter(e => e.placeholder).map(e => `icons/${e.id}`);
const redo = catalog.icons.filter(e => e.review?.status === "redo").map(e => ({ wrapper: `icons/${e.id}`, review: e.review }));
const staleStyle = catalog.icons.filter(e => e.review?.stale).map(e => ({ wrapper: `icons/${e.id}`, review: e.review }));
const icons = finish.entries.filter(e => e.kind === "icon");
const specDir = fs.mkdtempSync(path.join(os.tmpdir(), "noe-m9-icon-audit-"));
let health;
try {
  const spec = path.join(specDir, "spec.json");
  const jobs = entries.filter(e => e.master && !e.nonGlyph).map(e => ({ id: e.wrapper, kind: "icon", source: e.master,
    output: "dev/icons/review/audits/m9-mask-check-not-written.webp", size: 128,
    recipe: { role: "operation", glyph: "#ffffff" } }));
  fs.writeFileSync(spec, JSON.stringify({ root: MODULE_ROOT, mode: "check", jobs }));
  const result = spawnSync(process.env.PYTHON ?? "python", [abs("dev/finish/raster.py"), spec],
    { cwd: MODULE_ROOT, encoding: "utf8", maxBuffer: 32 << 20, windowsHide: true, env: { ...process.env, PYTHONUTF8: "1" } });
  if (result.status !== 0) throw new Error(result.stderr || "Mask validation failed");
  const parsed = JSON.parse(result.stdout);
  health = { pillow: parsed.pillow, libwebp: parsed.libwebp, checked: jobs.length,
    failures: parsed.results.filter(r => r.error || r.checks?.masterWhite === false || r.checks?.margins?.empty),
    edgeTouching: parsed.results.filter(r => r.checks?.clipped).map(r => ({ wrapper: r.id, margins: r.checks.margins })) };
} finally {
  const resolved = path.resolve(specDir);
  if (!path.basename(resolved).startsWith("noe-m9-icon-audit-")) throw new Error("Unexpected audit temporary directory");
  fs.rmSync(resolved, { recursive: true, force: true });
}
const output = {
  schema: "noe-m9-icon-audit/v1", date: new Date().toISOString().slice(0, 10), profile: profile.id,
  scope: "Fresh staged module packs, literal script paths, icon browser catalog and saved reviews. Campaign/world-only references and dynamic paths are not covered.",
  stats: { library: catalog.icons.length, variants: catalog.icons.flatMap(e => e.variants).length,
    referencedWrappers: entries.length, assignmentGapWrappers: gaps.length,
    assignmentGapOccurrences: Object.values(gapGroups).reduce((n, rows) => n + rows.length, 0),
    gapGroups: Object.fromEntries(Object.entries(gapGroups).map(([reason, rows]) => [reason, rows.length])),
    missingReferencedFiles: missingFiles.length, missingMasters: missingMasters.length,
    generatedPlaceholders: placeholders.length, flaggedForRedo: redo.length, changedSinceStyleReview: staleStyle.length,
    generationReviews: count(review.items, item => feedback.items[item.id]?.decision ?? "pending"),
    activeGenerationReviews: review.items.filter(e => e.status !== "resolved").length,
    finishReviews: count(icons, e => e.review.status),
    finishedFiles: icons.filter(e => e.outputs.every(o => fs.existsSync(abs(o.path)))).length,
    nonGlyphExceptions: entries.filter(e => e.nonGlyph).length, actionableAssignmentGapWrappers: gaps.filter(e => !e.nonGlyph).length,
    maskValidationFailures: health.failures.length, edgeTouchingMasters: health.edgeTouching.length,
    unconsumed: unconsumed.length },
  missingFiles, missingMasters, missingLiteralScriptRefs, placeholders, redo, staleStyle, unresolvedReviews, health,
  gapGroups, entries, unconsumed
};
const destination = "dev/icons/m9-gap-audit.json";
fs.writeFileSync(abs(destination), `${JSON.stringify(output, null, 2)}\n`);
const preview = buildM9AuditPreview(output, finish, profile, catalog);
console.log(JSON.stringify({ report: destination, preview, stats: output.stats, missingFiles, missingMasters, missingLiteralScriptRefs,
  maskFailures: health.failures, edgeTouching: health.edgeTouching.map(e => e.wrapper), unresolvedReviews }, null, 2));
if (missingFiles.length || missingMasters.length || missingLiteralScriptRefs.length || health.failures.length) process.exitCode = 1;
