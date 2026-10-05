/**
 * The dev sandbox data path (§5 C): a second Foundry data folder, served by a second server on
 * its own port, concurrently with the campaign server (D1). It never touches the campaign.
 *
 * Packages are "linked", not copied: a real package folder whose top-level directories are
 * junctions to the campaign install, files copied — EXCEPT `packs/`, which is always the
 * sandbox's own copy. A running world holds the LevelDB of every active package's packs, so
 * two servers sharing one `packs/` would lock each other out. For this module the packs are
 * not copied but built from the working tree (`build-packs --out=`), which is also why a
 * sandbox pack rebuild never needs the campaign server stopped.
 *
 * Every sandbox package carries a Foundry package lock: "Update all" in the sandbox's setup
 * screen must never write through a junction into the working tree or the campaign install.
 */

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";
import { CliError, note } from "./output.mjs";
import { readZip } from "../../release/zip.mjs";

/** Never junctioned into the sandbox copy of this module. */
const MODULE_SKIP = new Set([".git", ".github", ".vscode", "node_modules", "dev", "dist", "logs", "packs"]);
const DEFAULT_MODULES = ["quench", "sequencer", "splatter", "dice-so-nice", "quickscale", "JB2A_DnD5e"];

export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function isLink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function lockPackage(dir, id) {
  const lock = path.join(dir, `${id}.lock`);
  if (!fs.existsSync(lock)) fs.writeFileSync(lock, "🔒");
}

/** Copy a LevelDB folder without its LOCK (held while the source server runs). */
function copyDb(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src, { withFileTypes: true })) {
    if (!f.isFile() || f.name === "LOCK") continue; // files only — a repaired LevelDB keeps a `lost/` folder
    fs.copyFileSync(path.join(src, f.name), path.join(dst, f.name));
  }
}

/**
 * Real folder at `dst`; each directory of `src` a junction (except `skip`), each file copied,
 * `packs/*` copied as databases unless `ownPacks` (then left for the caller to build).
 */
export function linkPackage(src, dst, { id, skip = new Set(), ownPacks = false, onlyFiles = null } = {}) {
  if (isLink(dst)) throw new CliError(`${dst} is itself a link; refusing to work inside it.`, { code: "sandbox-layout" });
  fs.mkdirSync(dst, { recursive: true });
  const made = { junctions: 0, files: 0, packs: 0 };
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.name === `${id}.lock`) continue;
    if (entry.isDirectory() && entry.name === "packs") {
      if (ownPacks) continue;
      for (const pack of fs.readdirSync(from, { withFileTypes: true }).filter(d => d.isDirectory())) {
        const target = path.join(to, pack.name);
        if (!fs.existsSync(target)) { copyDb(path.join(from, pack.name), target); made.packs++; }
      }
      continue;
    }
    if (skip.has(entry.name)) continue;
    if (entry.isDirectory()) {
      if (!fs.existsSync(to)) { fs.symlinkSync(from, to, "junction"); made.junctions++; }
    } else if (entry.isFile() && (!onlyFiles || onlyFiles.includes(entry.name))) {
      fs.copyFileSync(from, to);
      made.files++;
    }
  }
  lockPackage(dst, id);
  return made;
}

/** Copy a whole package (systems: the sandbox's dnd5e is its own, upgradeable first, §5 C). */
function copyPackage(src, dst, id) {
  if (!fs.existsSync(dst)) {
    fs.cpSync(src, dst, { recursive: true, filter: s => path.basename(s) !== "LOCK" && path.basename(s) !== `${id}.lock` });
  }
  lockPackage(dst, id);
}

/**
 * Create or refresh the sandbox data path. Idempotent: existing config, worlds and copies are
 * kept; links and module.json are refreshed.
 * @param {{campaignData: string, sandboxData: string, moduleRoot: string, modules?: string[]}} p
 */
export async function initSandbox({ campaignData, sandboxData, moduleRoot, modules = DEFAULT_MODULES, moduleZip = null }) {
  if (path.resolve(campaignData).toLowerCase() === path.resolve(sandboxData).toLowerCase()) {
    throw new CliError("The sandbox data path is the campaign data path.", { code: "sandbox-layout" });
  }
  const cfgDir = path.join(sandboxData, "Config");
  const data = path.join(sandboxData, "Data");
  for (const d of [cfgDir, path.join(data, "modules"), path.join(data, "systems"), path.join(data, "worlds"), path.join(sandboxData, "Logs")]) {
    fs.mkdirSync(d, { recursive: true });
  }
  const report = { dataPath: sandboxData, created: [], kept: [], modules: {} };

  const optionsFile = path.join(cfgDir, "options.json");
  if (!fs.existsSync(optionsFile)) {
    const campaign = JSON.parse(fs.readFileSync(path.join(campaignData, "Config", "options.json"), "utf8"));
    // Same salt as the campaign, so the copied admin.txt hash (same password) still verifies.
    const options = {
      ...campaign, dataPath: sandboxData, port: await freePort(), world: null, upnp: false,
      hostname: null, localHostname: null, proxyPort: null, proxySSL: false, routePrefix: null,
      sslCert: null, sslKey: null, fullscreen: false
    };
    fs.writeFileSync(optionsFile, JSON.stringify(options, null, 2));
    report.created.push("Config/options.json (free port)");
  } else {
    report.kept.push("Config/options.json");
  }
  for (const f of ["admin.txt", "license.json"]) {
    const src = path.join(campaignData, "Config", f);
    const dst = path.join(cfgDir, f);
    if (!fs.existsSync(dst) && fs.existsSync(src)) { fs.copyFileSync(src, dst); report.created.push(`Config/${f}`); }
  }

  const dnd5e = path.join(data, "systems", "dnd5e");
  if (!fs.existsSync(dnd5e)) note("copying dnd5e (once)");
  copyPackage(path.join(campaignData, "Data", "systems", "dnd5e"), dnd5e, "dnd5e");
  report.system = { dnd5e: JSON.parse(fs.readFileSync(path.join(dnd5e, "system.json"), "utf8")).version };

  report.modules[MODULE_ID] = moduleZip
    ? installFromZip(moduleZip, path.join(data, "modules", MODULE_ID), sandboxData)
    : linkPackage(moduleRoot, path.join(data, "modules", MODULE_ID), {
      id: MODULE_ID, skip: MODULE_SKIP, ownPacks: true, onlyFiles: ["module.json", "README.md", "LICENSE", "CREDITS.md"]
    });
  linkE2E(data, moduleRoot);

  for (const id of modules) {
    const src = path.join(campaignData, "Data", "modules", id);
    if (!fs.existsSync(src)) { report.modules[id] = "not installed in the campaign data path"; continue; }
    report.modules[id] = linkPackage(src, path.join(data, "modules", id), { id });
  }
  return report;
}

/**
 * Release sandbox (§5 E): this module exactly as a user installs it — the release zip extracted
 * into a clean folder (the previous copy removed first), then package-locked. Nothing links back
 * to the working tree, so what is tested is what ships.
 */
export function installFromZip(zipPath, dst, dataRoot) {
  const resolved = path.resolve(dst);
  if (!resolved.toLowerCase().startsWith(`${path.resolve(dataRoot).toLowerCase()}${path.sep}`)) {
    throw new CliError(`${dst} is outside the release data path.`, { code: "sandbox-layout" });
  }
  if (isLink(resolved)) throw new CliError(`${dst} is a link; refusing to replace it.`, { code: "sandbox-layout" });
  if (fs.existsSync(resolved)) {
    // A folder that once was a dev-sandbox copy holds junctions: unlink them, never recurse through them.
    for (const entry of fs.readdirSync(resolved)) {
      const p = path.join(resolved, entry);
      if (isLink(p)) fs.rmdirSync(p);
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  let files = 0;
  for (const [name, data] of readZip(fs.readFileSync(zipPath))) {
    const target = path.join(resolved, ...name.split("/"));
    if (!target.startsWith(`${resolved}${path.sep}`)) throw new CliError(`zip entry escapes the folder: ${name}`, { code: "sandbox-layout" });
    if (name.endsWith("/")) {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    files++;
  }
  lockPackage(resolved, MODULE_ID);
  return { fromZip: path.basename(zipPath), files };
}

/**
 * Fixtures and e2e helpers, served by Foundry's static Data route at `/agent-e2e/…` — outside any
 * package, so a release sandbox whose module comes from the zip serves them too, and the campaign
 * never does. (Until 2026-10-05 this was a junction inside the sandbox module; removed here.)
 */
export function linkE2E(dataRoot, moduleRoot) {
  const old = path.join(dataRoot, "modules", MODULE_ID, "e2e");
  if (isLink(old)) fs.rmdirSync(old); // removes the junction itself, never what it points to
  const src = path.join(moduleRoot, "dev", "e2e");
  const dst = path.join(dataRoot, "agent-e2e");
  if (fs.existsSync(src) && !fs.existsSync(dst)) fs.symlinkSync(src, dst, "junction");
}

export function sandboxModuleDir(sandboxData) {
  return path.join(sandboxData, "Data", "modules", MODULE_ID);
}
