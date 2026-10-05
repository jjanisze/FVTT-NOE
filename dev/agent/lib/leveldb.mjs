/**
 * LevelDB interlock (§4, D5): is any world or pack database under a data path held open?
 *
 * LevelDB on Windows keeps `<db>/LOCK` open with a byte-range lock and no write sharing for
 * as long as the database is open. Opening that file for read+write from here therefore
 * fails with EBUSY/EPERM while anyone holds it, and succeeds (without creating anything:
 * "r+" never creates) once it is released. That is the whole test — no LevelDB library,
 * no risk of opening the database ourselves.
 */

import fs from "node:fs";
import path from "node:path";

function children(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() || d.isSymbolicLink());
  } catch {
    return [];
  }
}

/** Every LevelDB `LOCK` file Foundry may open under `<dataPath>/Data`. */
export function lockFiles(dataRoot) {
  const out = [];
  const addDbs = (dir, label) => {
    for (const db of children(dir)) {
      const lock = path.join(dir, db.name, "LOCK");
      if (fs.existsSync(lock)) out.push({ db: `${label}/${db.name}`, lock });
    }
  };
  for (const w of children(path.join(dataRoot, "worlds"))) {
    addDbs(path.join(dataRoot, "worlds", w.name, "data"), `worlds/${w.name}/data`);
    addDbs(path.join(dataRoot, "worlds", w.name, "packs"), `worlds/${w.name}/packs`);
  }
  for (const type of ["modules", "systems"]) {
    for (const p of children(path.join(dataRoot, type))) {
      addDbs(path.join(dataRoot, type, p.name, "packs"), `${type}/${p.name}/packs`);
    }
  }
  return out;
}

export function isHeld(lockFile) {
  let fd;
  try {
    fd = fs.openSync(lockFile, "r+");
    return false;
  } catch (err) {
    if (err.code === "ENOENT") return false;
    if (err.code === "EBUSY" || err.code === "EPERM" || err.code === "EACCES") return true;
    throw err;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/** `{checked, held: [db labels]}` for one data path. */
export function heldDatabases(dataRoot) {
  const files = lockFiles(dataRoot);
  return { checked: files.length, held: files.filter(f => isHeld(f.lock)).map(f => f.db) };
}
