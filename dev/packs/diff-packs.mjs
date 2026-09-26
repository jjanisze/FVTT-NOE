/**
 * Neuroshima 5e — compare two pack trees record by record.
 *
 *   node dev/packs/build-packs.mjs --out=<tmp>
 *   node dev/packs/diff-packs.mjs <tmp> [packs]
 *
 * B3 check (PLAN_beta.md): after Foundry has opened the world, the records must equal a
 * fresh build. File-level `git status packs/` noise is LevelDB compacting its log on open.
 * Each pack is copied (minus LOCK) to a temp dir first, so this runs while Foundry holds them.
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { ClassicLevel } = require("C:/Program Files/Foundry Virtual Tabletop/resources/app/node_modules/classic-level");

const [dirA, dirB = path.resolve(HERE, "../../packs")] = process.argv.slice(2);
if (!dirA) {
  console.error("usage: node dev/packs/diff-packs.mjs <packsA> [packsB]");
  process.exit(2);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "neuro-packs-"));

async function readPack(root, name, tag) {
  const src = path.join(root, name);
  const copy = path.join(scratch, tag, name);
  fs.mkdirSync(copy, { recursive: true });
  for (const f of fs.readdirSync(src)) if (f !== "LOCK") fs.copyFileSync(path.join(src, f), path.join(copy, f));
  const db = new ClassicLevel(copy, { valueEncoding: "utf8" });
  const records = new Map();
  for await (const [k, v] of db.iterator()) records.set(k, v);
  await db.close();
  return records;
}

function changedPaths(a, b, at = "", out = []) {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) changedPaths(a[k], b[k], `${at}.${k}`, out);
  } else out.push(at || "(root)");
  return out;
}

let total = 0;
const names = [...new Set([...fs.readdirSync(dirA), ...fs.readdirSync(dirB)])].sort();
for (const name of names) {
  if (!fs.existsSync(path.join(dirA, name)) || !fs.existsSync(path.join(dirB, name))) {
    console.log(`${name.padEnd(22)} only in ${fs.existsSync(path.join(dirA, name)) ? "A" : "B"}`);
    total++;
    continue;
  }
  const a = await readPack(dirA, name, "a");
  const b = await readPack(dirB, name, "b");
  const diffs = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    if (a.get(k) === b.get(k)) continue;
    if (!a.has(k) || !b.has(k)) diffs.push(`${a.has(k) ? "only A" : "only B"} ${k}`);
    else diffs.push(`${k}: ${changedPaths(JSON.parse(a.get(k)), JSON.parse(b.get(k))).slice(0, 6).join(", ")}`);
  }
  total += diffs.length;
  console.log(`${name.padEnd(22)} ${String(a.size).padStart(4)} records, ${diffs.length} differ`);
  for (const d of diffs.slice(0, 5)) console.log(`    ${d}`);
}

fs.rmSync(scratch, { recursive: true, force: true });
console.log(total ? `\n${total} differing records` : "\nidentical");
process.exit(total ? 1 : 0);
