/**
 * Read compendium documents for the finish manifest (PLAN_m9_style.md §7.2).
 *
 * The manifest is derived from data, never from file names — so it reads what the pack builder
 * actually produces. Foundry holds `packs/` open while it runs, hence a staging build
 * (`build-packs.mjs --out=<dir>`) read with the `classic-level` that ships with Foundry.
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MODULE_ID = "neuroshima-2026-overrides";
export const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FOUNDRY_NM = process.env.FOUNDRY_NODE_MODULES ?? "C:/Program Files/Foundry Virtual Tabletop/resources/app/node_modules";

/** Build every pack into a throwaway directory and return its path. */
export function stagePacks(dir = fs.mkdtempSync(path.join(os.tmpdir(), "noe-finish-packs-"))) {
  const res = spawnSync(process.execPath, [path.join(MODULE_ROOT, "dev/packs/build-packs.mjs"), `--out=${dir}`], { cwd: MODULE_ROOT, encoding: "utf8", maxBuffer: 64 << 20, windowsHide: true });
  if (res.status !== 0) throw new Error(`build-packs --out failed:\n${(res.stderr || res.stdout).split(/\r?\n/).slice(-12).join("\n")}`);
  return dir;
}

/**
 * Every record of every staged pack: top-level documents and embedded ones (`!actors.items!…`).
 * @returns {Promise<{pack: string, key: string, doc: object}[]>}
 */
export async function readPacks(dir) {
  const require = createRequire(import.meta.url);
  const { ClassicLevel } = require(path.join(FOUNDRY_NM, "classic-level"));
  const out = [];
  for (const pack of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, pack);
    if (!fs.statSync(full).isDirectory()) continue;
    const db = new ClassicLevel(full, { valueEncoding: "utf8", createIfMissing: false });
    await db.open();
    for await (const [key, value] of db.iterator()) out.push({ pack, key, doc: JSON.parse(value) });
    await db.close();
  }
  return out;
}
