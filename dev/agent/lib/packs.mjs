/**
 * Counting the records in a compendium pack on disk — shared by the e2e boot suite (does every
 * pack open with what was built?) and the release gate (does the zip carry what `packs/` has?).
 *
 * A pack a running server holds cannot be opened; it is copied (without its LOCK) to a temp
 * folder first. Opening a LevelDB rewrites its files (compaction), so even an idle pack is read
 * from a copy unless `inPlace` — the working tree's `packs/` must not churn from a count.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const COLLECTION = {
  Item: "items", Actor: "actors", JournalEntry: "journal", RollTable: "tables", Macro: "macros",
  Scene: "scenes", Adventure: "adventures", Cards: "cards", Playlist: "playlists"
};

function classicLevel(installApp) {
  const require = createRequire(import.meta.url);
  return require(path.join(installApp, "node_modules", "classic-level")).ClassicLevel;
}

/**
 * @param {string} dir        the pack's LevelDB folder
 * @param {string} type       the pack's document type (module.json `packs[].type`)
 * @param {string} installApp `<install>/resources/app` (classic-level comes from Foundry)
 * @returns {Promise<number|null>} top-level documents, or null when the folder is missing
 */
export async function countPackRecords(dir, type, installApp, { inPlace = false } = {}) {
  if (!fs.existsSync(dir)) return null;
  const prefix = `!${COLLECTION[type] ?? `${type.toLowerCase()}s`}!`;
  let target = dir;
  let tmp = null;
  if (!inPlace) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fvtt-pack-"));
    for (const f of fs.readdirSync(dir)) if (f !== "LOCK") fs.copyFileSync(path.join(dir, f), path.join(tmp, f));
    target = tmp;
  }
  const ClassicLevel = classicLevel(installApp);
  const db = new ClassicLevel(target, { keyEncoding: "utf8", valueEncoding: "json", createIfMissing: false });
  try {
    await db.open();
    let n = 0;
    for await (const key of db.keys({ gte: prefix, lt: `${prefix}￿` })) if (key.startsWith(prefix)) n++;
    return n;
  } finally {
    await db.close().catch(() => {});
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** `{name: count}` for every pack module.json declares, read from `packsRoot`. */
export async function countAllPacks(manifest, packsRoot, installApp) {
  const out = {};
  for (const p of manifest.packs ?? []) {
    out[p.name] = await countPackRecords(path.join(packsRoot, path.basename(p.path)), p.type, installApp);
  }
  return out;
}
