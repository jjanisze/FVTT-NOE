/**
 * The game system of a data path (PLAN_migracja_dnd5e6.md E0 (2)). Every data path — campaign, sandbox, release,
 * Poligon — has its own dnd5e folder. A new one used to be copied from the campaign, so during the migration a
 * fresh sandbox would have started on the campaign's old dnd5e; now it comes from the source the local config
 * names (`dnd5e.source`: a release zip or an unpacked release folder), and `system:install` replaces the dnd5e of
 * an existing data path from the same kind of source.
 *
 * The replaced folder is kept, renamed, under `<dataPath>/agent-state/systems/` — outside `Data/`, so Foundry
 * never sees two packages with one id — and the new one is package-locked like every agent-managed package.
 */

import fs from "node:fs";
import path from "node:path";
import { CliError } from "./output.mjs";
import { readZip } from "../../release/zip.mjs";

const SKIP = new Set(["LOCK", ".git", "node_modules"]);

/** `version` from a package folder's manifest, or null. */
export function packageVersion(dir, manifest = "system.json") {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, manifest), "utf8")).version ?? null;
  } catch {
    return null;
  }
}

/** `a` < `b` for dotted versions ("14.364" < "14.369", "5.3.0" < "6.0.6"); a missing part counts as 0. */
export function olderThan(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

function isLink(p) {
  try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; }
}

const stamp = (d = new Date()) => d.toISOString().replace(/[:.]/g, "-").slice(0, 19);

/**
 * A release, not a source checkout: the manifest names the system, and every compendium it declares is a built
 * LevelDB (a git checkout has JSON sources there and no CURRENT file).
 */
export function checkSystemFolder(dir, id, label = dir) {
  const manifest = path.join(dir, "system.json");
  if (!fs.existsSync(manifest)) throw new CliError(`No system.json in ${label}.`, { code: "bad-source" });
  const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
  if (m.id !== id) throw new CliError(`${label} holds the system "${m.id}", not "${id}".`, { code: "bad-source" });
  const unbuilt = (m.packs ?? []).filter(p => !fs.existsSync(path.join(dir, p.path, "CURRENT"))).map(p => p.name);
  if (unbuilt.length) {
    throw new CliError(`${label} is not a built release: ${unbuilt.length} pack(s) without a LevelDB (${unbuilt.slice(0, 3).join(", ")}).`, {
      code: "bad-source", hint: "Use the release zip (GitHub release asset) or a folder unpacked from it, not a source checkout."
    });
  }
  return m.version;
}

/** Unpack a release zip into `dir`: the entries under the folder that holds `system.json` (often the zip root). */
function extractZip(zipPath, dir) {
  const entries = readZip(fs.readFileSync(zipPath));
  const manifest = [...entries.keys()].filter(n => n === "system.json" || n.endsWith("/system.json"))
    .sort((a, b) => a.split("/").length - b.split("/").length)[0];
  if (!manifest) throw new CliError(`${path.basename(zipPath)} has no system.json.`, { code: "bad-source" });
  const root = manifest.slice(0, -"system.json".length);
  let files = 0;
  for (const [name, data] of entries) {
    if (!name.startsWith(root) || name === root) continue;
    const rel = name.slice(root.length);
    const target = path.join(dir, ...rel.split("/"));
    if (!path.resolve(target).startsWith(`${path.resolve(dir)}${path.sep}`)) throw new CliError(`zip entry escapes the folder: ${name}`, { code: "bad-source" });
    if (rel.endsWith("/")) { fs.mkdirSync(target, { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    files++;
  }
  return files;
}

function copyFolder(src, dir) {
  let files = 0;
  fs.cpSync(src, dir, {
    recursive: true,
    filter: s => {
      const base = path.basename(s);
      if (SKIP.has(base) || base.endsWith(".lock")) return false;
      if (fs.statSync(s).isFile()) files++;
      return true;
    }
  });
  return files;
}

/** What a configured source is: `{kind: "zip"|"folder", path}`; refuses anything else. */
export function resolveSource(source) {
  if (!source) throw new CliError("No dnd5e source.", { code: "usage", hint: "`npm run fvtt -- init --dnd5e-source=<release zip or unpacked folder>` (once), or --from=<…>." });
  const p = path.resolve(String(source));
  if (!fs.existsSync(p)) throw new CliError(`dnd5e source ${p} does not exist.`, { code: "bad-source" });
  if (fs.statSync(p).isDirectory()) return { kind: "folder", path: p };
  if (/\.zip$/i.test(p)) return { kind: "zip", path: p };
  throw new CliError(`dnd5e source ${p} is neither a folder nor a .zip.`, { code: "bad-source" });
}

/**
 * Install `id` into `dataPath/Data/systems/<id>` from `source`. Staged under `agent-state/` first, checked, then
 * swapped in; an existing folder moves to `agent-state/systems/<id>-<version>-<stamp>`. The caller has made sure
 * no server uses the data path.
 * @returns {{id: string, version: string, previous: string|null, keptAt: string|null, source: object, files: number}}
 */
export function installSystem({ source, dataPath, id = "dnd5e" }) {
  const src = resolveSource(source);
  const state = path.join(dataPath, "agent-state");
  const staging = path.join(state, "staging", id);
  const dst = path.join(dataPath, "Data", "systems", id);
  if (isLink(dst)) throw new CliError(`${dst} is a link; refusing to replace it.`, { code: "sandbox-layout" });
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  const files = src.kind === "zip" ? extractZip(src.path, staging) : copyFolder(src.path, staging);
  let version;
  try {
    version = checkSystemFolder(staging, id, src.path);
  } catch (err) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw err;
  }
  let previous = null;
  let keptAt = null;
  if (fs.existsSync(dst)) {
    previous = packageVersion(dst);
    keptAt = path.join(state, "systems", `${id}-${previous ?? "unknown"}-${stamp()}`);
    fs.mkdirSync(path.dirname(keptAt), { recursive: true });
    fs.renameSync(dst, keptAt);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(staging, dst);
  fs.writeFileSync(path.join(dst, `${id}.lock`), "🔒");
  return { id, version, previous, keptAt, source: { kind: src.kind, file: path.basename(src.path) }, files };
}
