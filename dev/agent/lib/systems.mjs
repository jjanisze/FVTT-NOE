/**
 * Packages of a data path (PLAN_migracja_dnd5e6.md E0 (2), D11).
 *
 * dnd5e: every data path — campaign, sandbox, release, Poligon — has its own folder. A new one used to be copied
 * from the campaign, so during the migration a fresh sandbox would have started on the campaign's old dnd5e; now
 * it comes from the source the local config names (`dnd5e.source`: a release zip or an unpacked release folder),
 * and `system:install` replaces the dnd5e of an existing data path from the same kind of source.
 *
 * Third-party modules live once, in the campaign's folders; the other data paths link to them (sandbox.mjs), so
 * `module:install` replaces the campaign's folder and re-links the others.
 *
 * A replaced folder is kept, renamed, under `<dataPath>/agent-state/<systems|modules>/` — outside `Data/`, so
 * Foundry never sees two packages with one id. Zips are unpacked by `archive.py` (streamed; JB2A is 1.6 GB).
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CliError } from "./output.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(["LOCK", ".git", "node_modules"]);
const MANIFEST = { systems: "system.json", modules: "module.json" };

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
 * A release, not a source checkout: the manifest names the package, and every compendium it declares is a built
 * LevelDB (a git checkout has JSON sources there and no CURRENT file).
 */
export function checkPackageFolder(dir, { type = "systems", id, label = dir }) {
  const manifest = path.join(dir, MANIFEST[type]);
  if (!fs.existsSync(manifest)) throw new CliError(`No ${MANIFEST[type]} in ${label}.`, { code: "bad-source" });
  const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
  if (id && m.id !== id) throw new CliError(`${label} holds the ${type === "systems" ? "system" : "module"} "${m.id}", not "${id}".`, { code: "bad-source" });
  const unbuilt = (m.packs ?? []).filter(p => !fs.existsSync(path.join(dir, p.path, "CURRENT"))).map(p => p.name);
  if (unbuilt.length) {
    throw new CliError(`${label} is not a built release: ${unbuilt.length} pack(s) without a LevelDB (${unbuilt.slice(0, 3).join(", ")}).`, {
      code: "bad-source", hint: "Use the release zip (GitHub release asset) or a folder unpacked from it, not a source checkout."
    });
  }
  return { id: m.id, version: m.version };
}

export const checkSystemFolder = (dir, id, label = dir) => checkPackageFolder(dir, { type: "systems", id, label }).version;

function copyFolder(src, dir) {
  fs.cpSync(src, dir, {
    recursive: true,
    filter: s => !SKIP.has(path.basename(s)) && !path.basename(s).endsWith(".lock")
  });
}

function extractZip(zipPath, dir) {
  const res = spawnSync("python", ["-I", path.join(HERE, "archive.py"), "extract", zipPath, dir], {
    encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: "1" }
  });
  if (res.status !== 0) throw new CliError(`Unpacking ${path.basename(zipPath)} failed: ${(res.stderr ?? "").trim().split(/\r?\n/).slice(-3).join(" | ")}`, { code: "bad-source" });
}

function countFiles(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) n += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1;
  return n;
}

/** What a source is: `{kind: "zip"|"folder", path}`; refuses anything else. */
export function resolveSource(source, what = "dnd5e") {
  if (!source) throw new CliError(`No ${what} source.`, { code: "usage", hint: "`npm run fvtt -- init --dnd5e-source=<release zip or unpacked folder>` (once), or --from=<…>." });
  const p = path.resolve(String(source));
  if (!fs.existsSync(p)) throw new CliError(`${what} source ${p} does not exist.`, { code: "bad-source" });
  if (fs.statSync(p).isDirectory()) return { kind: "folder", path: p };
  if (/\.zip$/i.test(p)) return { kind: "zip", path: p };
  throw new CliError(`${what} source ${p} is neither a folder nor a .zip.`, { code: "bad-source" });
}

/** The folder of an unpacked release that holds its manifest: the root, or its only subfolder that has one. */
function packageRoot(dir, type) {
  if (fs.existsSync(path.join(dir, MANIFEST[type]))) return dir;
  const subs = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(dir, e.name, MANIFEST[type])));
  return subs.length === 1 ? path.join(dir, subs[0].name) : null;
}

/**
 * Install a package into `dataPath/Data/<type>/<id>` from `source`. Unpacked under `agent-state/staging/` first,
 * checked, then swapped in; an existing folder moves to `agent-state/<type>/<id>-<version>-<stamp>`. The caller
 * has made sure no server uses the data path. `id` defaults to the manifest's; ids in `refuse` are never installed.
 * @returns {{id: string, version: string, previous: string|null, keptAt: string|null, source: object, files: number}}
 */
export function installPackage({ source, dataPath, type = "systems", id = null, lock = true, refuse = [] }) {
  const src = resolveSource(source, id ?? type);
  const state = path.join(dataPath, "agent-state");
  const staging = path.join(state, "staging", `${id ?? "package"}-${stamp()}`);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  let root;
  let found;
  try {
    if (src.kind === "zip") extractZip(src.path, staging);
    else copyFolder(src.path, staging);
    root = packageRoot(staging, type);
    if (!root) throw new CliError(`${path.basename(src.path)} has no ${MANIFEST[type]}.`, { code: "bad-source" });
    found = checkPackageFolder(root, { type, id, label: src.path });
    if (refuse.includes(found.id)) throw new CliError(`${found.id} is not installed this way.`, { code: "refused-package", refused: true });
  } catch (err) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw err;
  }
  const dst = path.join(dataPath, "Data", type, found.id);
  if (isLink(dst)) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw new CliError(`${dst} is a link; refusing to replace it.`, { code: "sandbox-layout" });
  }
  let previous = null;
  let keptAt = null;
  if (fs.existsSync(dst)) {
    previous = packageVersion(dst, MANIFEST[type]);
    keptAt = path.join(state, type, `${found.id}-${previous ?? "unknown"}-${stamp()}`);
    fs.mkdirSync(path.dirname(keptAt), { recursive: true });
    fs.renameSync(dst, keptAt);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(root, dst);
  fs.rmSync(staging, { recursive: true, force: true });
  if (lock) fs.writeFileSync(path.join(dst, `${found.id}.lock`), "🔒");
  return { id: found.id, version: found.version, previous, keptAt, source: { kind: src.kind, file: path.basename(src.path) }, files: countFiles(dst) };
}

/** dnd5e (or another system) of one data path, package-locked like every agent-managed package. */
export function installSystem({ source, dataPath, id = "dnd5e" }) {
  return installPackage({ source, dataPath, type: "systems", id, lock: true });
}
