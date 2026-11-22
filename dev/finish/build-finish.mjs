#!/usr/bin/env node
/**
 * Finish engine (PLAN_m9_style.md §7) — every finished NOE asset from approved sources + the profile.
 *
 *   npm run build:finish                         # everything that is due
 *   npm run build:finish -- --only=tokens,signs  # tokens | signs | status | icons | banners | textures
 *   npm run build:finish -- --only=lookup        # regenerate only the runtime index
 *   npm run build:finish -- --ids=feat/aramis    # named manifest entries, whatever their review status
 *   npm run build:finish -- --all                # icons: every assigned subject, not just pilot/approved
 *   npm run build:finish -- --dry-run            # say what would change, write nothing
 *   npm run build:finish -- --check              # stale, missing, orphaned or mismatched → exit 1
 *   npm run build:finish -- --preview            # dev/finish/preview/index.html, offline
 *
 * Inputs are read-only: the profile, white masters, art masters, state colours, the manifest's
 * assignments. Outputs go to existing top-level folders (styles/, icons/, ui/). Generation never
 * touches packs, worlds or sources — wiring the results into builders is a separate step (§7.5).
 *
 * Raster work is Python + Pillow (dev/finish/raster.py); SVG and CSS are plain Node. No npm deps.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { MODULE_ROOT, abs, loadManifest, loadProfile, recipeFor, rel, sameFileHash, sameText, sha256, sha256File, MANIFEST_PATH } from "./lib/profile.mjs";
import * as tokens from "./tokens.mjs";
import * as signs from "./signs.mjs";
import { buildPreview } from "./preview.mjs";
import { runtimeIndexes } from "./runtime-lookup.mjs";

const KINDS = ["tokens", "signs", "status", "icons", "banners", "textures", "lookup"];
const argv = process.argv.slice(2);
const flag = name => argv.includes(`--${name}`);
const value = name => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const ONLY = value("only")?.split(",").map(s => s.trim()).filter(Boolean) ?? KINDS;
const IDS = value("ids")?.split(",").map(s => s.trim()).filter(Boolean);
const CHECK = flag("check");
const DRY = flag("dry-run");
const PREVIEW = flag("preview");
const ALL = flag("all");
const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
/** Review states the engine exports without being asked by id. */
const EXPORTED = new Set(["pilot", "approved"]);

for (const kind of ONLY) if (!KINDS.includes(kind)) { console.error(`Nieznany rodzaj: ${kind}. Dostępne: ${KINDS.join(", ")}`); process.exit(2); }

const profile = loadProfile();
const manifest = loadManifest();
const problems = [];
const notes = [];
const changed = [];
const say = msg => console.log(msg);

/* -------------------------------------------- */
/*  Text outputs: tokens, signs                  */
/* -------------------------------------------- */

function textOutputs(planned, kind) {
  for (const item of planned) {
    const file = abs(item.path);
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    const same = current !== null && sameText(current, item.text);
    if (CHECK) {
      if (current === null) problems.push(`${item.path}: brak pliku`);
      else if (!same) problems.push(`${item.path}: nieaktualny (profil ${profile.id})`);
    } else if (!same) {
      changed.push(item.path);
      if (!DRY) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, item.text); }
    }
    if (kind === "signs") upsert({ id: `sign/${item.id}`, kind: "sign", source: "dev/icons/finish/style-profile.json", sourceSha256: sha256File(abs("dev/icons/finish/style-profile.json")), recipe: `${profile.id}#sign`, outputs: [{ path: item.path }], consumers: [{ type: "css", file: item.consumer ?? "styles/noe/components.css" }], outputSha256: sha256(item.text) });
  }
}

/** Orphans: files in an engine-owned folder that no planned output claims. */
function orphans(dir, expected, test = () => true) {
  if (!fs.existsSync(abs(dir))) return;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const file of walk(abs(dir)).map(rel)) if (test(file) && !expected.has(file)) problems.push(`${file}: osierocony plik — nie ma go w manifeście`);
}

const touched = new Map();
function upsert(entry) {
  touched.set(entry.id, entry);
}

/* -------------------------------------------- */
/*  Status numerals — the existing generator      */
/* -------------------------------------------- */

function status() {
  const generator = abs("dev/icons/gen_status_numerals.mjs");
  if (!CHECK && !DRY) {
    const res = spawnSync(process.execPath, [generator, "--quiet"], { cwd: MODULE_ROOT, encoding: "utf8" });
    if (res.status !== 0) problems.push(`status: generator zakończył się błędem — ${res.stderr.trim().split("\n")[0]}`);
    return;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "noe-finish-status-"));
  try {
    const res = spawnSync(process.execPath, [generator, "--quiet", `--out=${tmp}`], { cwd: MODULE_ROOT, encoding: "utf8" });
    if (res.status !== 0) {
      // The numerals are copied from dnd5e's own icons; without a dnd5e checkout there is nothing to compare.
      if (/Nie znalazlem ikon dnd5e/.test(res.stderr)) notes.push("status: pominięto — brak ikon dnd5e w tym środowisku");
      else problems.push(`status: generator zakończył się błędem — ${res.stderr.trim().split("\n")[0]}`);
      return;
    }
    for (const name of fs.readdirSync(tmp)) {
      const target = abs(`icons/statuses/${name}`);
      const fresh = fs.readFileSync(path.join(tmp, name), "utf8");
      if (!fs.existsSync(target)) (CHECK ? problems : changed).push(`icons/statuses/${name}${CHECK ? ": brak pliku" : ""}`);
      else if (!sameText(fs.readFileSync(target, "utf8"), fresh)) (CHECK ? problems : changed).push(`icons/statuses/${name}${CHECK ? ": nieaktualny względem state-colors.mjs" : ""}`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* -------------------------------------------- */
/*  Raster: icons and banners                     */
/* -------------------------------------------- */

function rasterJobs() {
  const jobs = [];
  for (const entry of manifest.entries) {
    if (entry.kind === "icon" && ONLY.includes("icons")) {
      const wanted = IDS ? IDS.includes(entry.id) : ALL || EXPORTED.has(entry.review?.status);
      if (!wanted) continue;
      const recipe = recipeFor(profile, entry.family);
      if (!recipe) { problems.push(`${entry.id}: rodzina ${entry.family} nie istnieje w profilu ${profile.id}`); continue; }
      if (entry.recipe !== `${profile.id}#${recipe.name}`) problems.push(`${entry.id}: receptura ${entry.recipe} nie zgadza się z profilem (${profile.id}#${recipe.name})`);
      for (const output of entry.outputs) {
        jobs.push({
          id: entry.id, kind: "icon", source: entry.source, output: output.path, size: output.size,
          optical: entry.opticalCorrection ?? null,
          recipe: { ...recipe, radiusRatio: profile.geometry.groundCornerRadiusAtWorkingSize / profile.geometry.workingCssPixels }
        });
      }
    }
    if (entry.kind === "banner" && ONLY.includes("banners")) {
      if (IDS && !IDS.includes(entry.id)) continue;
      const job = { id: entry.id, kind: "banner", source: entry.source, output: entry.outputs[0].path, recipe: entry.banner };
      // Lossy output: re-encode only when the master or the recipe moved since the recorded export.
      if (entry.recipeSha256 === recipeSha(job) && sameFileHash(abs(entry.source), entry.sourceSha256)) job.currentPixels = entry.outputPixelSha256;
      jobs.push(job);
    }
  }
  return jobs;
}

function runRaster(jobs, mode) {
  if (!jobs.length) return { results: [] };
  const spec = path.join(os.tmpdir(), `noe-finish-${process.pid}.json`);
  fs.writeFileSync(spec, JSON.stringify({ root: MODULE_ROOT, mode, jobs }));
  try {
    const res = spawnSync(PYTHON, [abs("dev/finish/raster.py"), spec], { cwd: MODULE_ROOT, encoding: "utf8", maxBuffer: 512 << 20, env: { ...process.env, PYTHONUTF8: "1" }, windowsHide: true });
    if (res.status !== 0) throw new Error(`raster.py: ${(res.stderr || res.stdout).trim().split(/\r?\n/).slice(-6).join("\n")}`);
    return JSON.parse(res.stdout);
  } finally {
    fs.rmSync(spec, { force: true });
  }
}

function recipeSha(job) { return sha256(JSON.stringify(job.recipe)); }

function raster() {
  const jobs = rasterJobs();
  if (!jobs.length) return [];
  // Approval binds the source, profile and recipe before any output can be replaced.
  const profileFile = abs("dev/icons/finish/style-profile.json");
  for (const job of jobs.filter(j => j.kind === "icon")) {
    const entry = manifest.entries.find(e => e.id === job.id);
    if (!sameFileHash(abs(job.source), entry.sourceSha256)) problems.push(`${job.id}: stale source hash`);
    if (entry.review?.status === "approved") {
      const review = entry.review;
      if (!sameFileHash(profileFile, review.profileSha256) || review.sourceSha256 !== entry.sourceSha256 || review.recipeSha256 !== recipeSha(job) || !review.outputPixelSha256) problems.push(`${job.id}: stale finish approval`);
      job.approvedPixels = review.outputPixelSha256;
    }
  }
  if (problems.length) return jobs;
  const out = runRaster(jobs, CHECK || DRY ? "check" : "write");
  const tools = { pillow: out.pillow, libwebp: out.libwebp };
  const sameTools = !manifest.tools || (manifest.tools.pillow === tools.pillow && manifest.tools.libwebp === tools.libwebp);
  if (!sameTools) notes.push(`raster: Pillow ${tools.pillow} / libwebp ${tools.libwebp}, manifest zapisano przy ${manifest.tools.pillow} / ${manifest.tools.libwebp} — porównuję hashe źródeł i plików, bez ponownego renderu`);
  for (const [i, result] of out.results.entries()) {
    const job = jobs[i];
    const entry = manifest.entries.find(e => e.id === job.id);
    if (result.error) { problems.push(`${job.id}: ${result.error}`); continue; }
    if (job.approvedPixels && result.pixelSha256 !== job.approvedPixels) problems.push(`${job.id}: rendered pixels differ from the approved finish`);
    const checks = result.checks ?? {};
    if (job.kind === "icon") {
      if (checks.masterWhite === false) problems.push(`${job.id}: master ${job.source} nie jest biały — to nie jest zatwierdzony glif`);
      if (checks.margins?.empty) problems.push(`${job.id}: pusty master`);
      if (job.recipe.role === "character" && checks.contrast < profile.treatments.minimumSolidGroundContrast) problems.push(`${job.id}: kontrast glif/tło ${checks.contrast}:1 poniżej ${profile.treatments.minimumSolidGroundContrast}:1`);
      if (result.size && (result.size[0] !== job.size || result.size[1] !== job.size)) problems.push(`${job.id}: rozmiar ${result.size.join("×")} zamiast ${job.size}`);
      if (checks.clipped && job.recipe.role !== "character") notes.push(`${job.id}: glif dotyka krawędzi mastera (margines 0) — do oceny w podglądzie`);
    }
    if (!sameFileHash(abs(job.source), entry.sourceSha256)) problems.push(`${job.id}: źródło ${job.source} zmieniło się od wpisu w manifeście (hash) — wymaga ponownej akceptacji`);
    if (job.kind === "banner" && entry.recipeSha256 && entry.recipeSha256 !== recipeSha(job) && (CHECK || DRY)) problems.push(`${job.id}: receptura kadru zmieniona bez eksportu`);

    if (CHECK || DRY) {
      const line = CHECK ? problems : changed;
      if (!result.filePixelSha256) line.push(`${job.output}${CHECK ? ": brak pliku" : ""}`);
      else if (job.kind === "icon" && sameTools && result.pixelSha256 !== result.filePixelSha256) line.push(`${job.output}${CHECK ? ": nieaktualny względem mastera i profilu" : ""}`);
      else if (entry.outputPixelSha256 !== result.filePixelSha256) line.push(`${job.output}${CHECK ? ": piksele pliku różnią się od hasha w manifeście" : ""}`);
      continue;
    }
    if (result.written) changed.push(job.output);
    upsert({ ...entry, outputPixelSha256: result.pixelSha256, ...(job.kind === "banner" ? { recipeSha256: recipeSha(job), bytes: result.bytes, size: result.size } : {}) });
  }
  if (!CHECK && !DRY) manifest.tools = tools;
  return jobs;
}

/**
 * Config and lookup consumers (fire modes, reload, basic actions) name an icon in code, not in a
 * compendium record — the pack builder never sees them. They resolve through this generated map.
 * A canonical item provides an unambiguous default. Shared masters also have family and
 * script-consumer indexes, so an operation never inherits its equipment's tint by accident.
 */
function runtimeLookup() {
  const done = new Map([...touched].filter(([, e]) => e.kind === "icon"));
  const entries = manifest.entries
    .map(e => done.get(e.id) ?? e)
    .filter(e => e.kind === "icon" && EXPORTED.has(e.review?.status) && (e.outputPixelSha256 || fs.existsSync(abs(e.outputs[0].path))));
  const indexes = runtimeIndexes(entries);
  const text = [
    "/**",
    " * Wykończone ikony: jednoznaczne domyślne, jawna rodzina i kontekst konsumenta.",
    " * Generowane przez `npm run build:finish` z dev/finish/manifest.json — nie edytuj ręcznie.",
    " * Klucz: ścieżka białego mastera względem modułu; wartość: eksport z icons/finished/.",
    " * Odczyt: `finishedIcon()` w scripts/config/finished-icons.mjs.",
    " */",
    `export const FINISHED_ICONS = Object.freeze(${JSON.stringify(indexes.defaults, null, 2)});`,
    `export const FINISHED_ICONS_BY_FAMILY = Object.freeze(${JSON.stringify(indexes.families, null, 2)});`,
    `export const FINISHED_ICONS_BY_CONSUMER = Object.freeze(${JSON.stringify(indexes.consumers, null, 2)});`,
    ""
  ].join("\n");
  return { kind: "icons", id: "runtime-lookup", path: "scripts/config/finished-icons-data.mjs", text };
}

/* -------------------------------------------- */
/*  Run                                          */
/* -------------------------------------------- */

if (ONLY.includes("tokens")) textOutputs(tokens.plan({ profile }), "tokens");
let signPlan = [];
if (ONLY.includes("signs")) { signPlan = signs.plan({ profile }); textOutputs(signPlan, "signs"); }
if (ONLY.includes("status")) status();
const jobs = ONLY.includes("icons") || ONLY.includes("banners") ? raster() : [];
if ((ONLY.includes("icons") || ONLY.includes("lookup")) && !IDS) textOutputs([runtimeLookup()], "icons");
if (ONLY.includes("textures") && manifest.entries.some(e => e.kind === "texture")) problems.push("textures: receptura tekstur bez szwu nie jest jeszcze wdrożona (O3) — usuń wpisy albo dopisz etap");

if (CHECK) {
  // Structure of the manifest itself: doubled outputs or subjects, entries the profile cannot finish.
  const outputs = new Map();
  for (const entry of manifest.entries) for (const output of entry.outputs ?? []) {
    if (outputs.has(output.path)) problems.push(`${output.path}: dwa wpisy (${outputs.get(output.path)}, ${entry.id})`);
    outputs.set(output.path, entry.id);
  }
  const ids = new Set();
  for (const entry of manifest.entries) { if (ids.has(entry.id)) problems.push(`${entry.id}: podwójny wpis`); ids.add(entry.id); }
  if (manifest.profile !== profile.id) problems.push(`manifest powstał dla profilu ${manifest.profile}, obowiązuje ${profile.id}`);
  if (!IDS) {
    const exported = new Set(manifest.entries.filter(e => e.kind !== "icon" || EXPORTED.has(e.review?.status) || e.outputPixelSha256).flatMap(e => (e.outputs ?? []).map(o => o.path)));
    if (ONLY.includes("icons")) orphans("icons/finished", exported);
    if (ONLY.includes("banners")) orphans("ui/noe/banners", exported);
    if (ONLY.includes("signs")) orphans("ui/noe/signs", new Set(signPlan.map(s => s.path)));
    for (const entry of manifest.entries) if (entry.kind === "icon" && entry.outputPixelSha256 && !EXPORTED.has(entry.review?.status) && ONLY.includes("icons")) {
      if (!fs.existsSync(abs(entry.outputs[0].path))) problems.push(`${entry.id}: manifest ma hash wyniku, a pliku nie ma`);
    }
  }
}

if (!CHECK && !DRY && touched.size) {
  const byId = new Map(manifest.entries.map(e => [e.id, e]));
  for (const [id, entry] of touched) byId.set(id, entry);
  const order = { tokens: 0, sign: 1, status: 2, banner: 3, texture: 4, icon: 5 };
  manifest.entries = [...byId.values()].sort((a, b) => (order[a.kind] - order[b.kind]) || a.id.localeCompare(b.id));
  manifest.profile = profile.id;
  fs.writeFileSync(MANIFEST_PATH, `{\n  "schema": ${JSON.stringify(manifest.schema)},\n  "profile": ${JSON.stringify(manifest.profile)},\n  "tools": ${JSON.stringify(manifest.tools ?? null)},\n  "entries": [\n${manifest.entries.map(e => `    ${JSON.stringify(e)}`).join(",\n")}\n  ]\n}\n`);
}

if (PREVIEW && !CHECK) {
  const previewJobs = rasterJobs().filter(j => j.kind === "icon");
  const rendered = runRaster(previewJobs, "preview");
  const file = buildPreview({ profile, manifest: loadManifest(), jobs: previewJobs, results: rendered.results });
  say(`Podgląd: ${rel(file)}`);
}

for (const note of notes) say(`uwaga — ${note}`);
if (problems.length) {
  console.error(`build:finish — ${problems.length} problem(ów):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
if (CHECK) say(`build:finish --check OK (${ONLY.join(", ")}; ${jobs.length} rastrów, profil ${profile.id}).`);
else say(`${DRY ? "Do zmiany" : "Zapisano"}: ${changed.length ? changed.join(", ") : "nic — wszystko aktualne"}.`);
