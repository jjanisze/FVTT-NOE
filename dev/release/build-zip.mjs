#!/usr/bin/env node
/**
 * THE release package (PLAN_agentic_improvements.md §5 E): one include list, used by the local
 * release gate and by `.github/workflows/release.yml` alike — the list used to live only in the
 * workflow's YAML, which is how `*.log` (empty compendiums) and `vfx/` went wrong.
 *
 *   node dev/release/build-zip.mjs [--out=dist] [--ref=HEAD] [--allow-dirty] [--foundry=<resources/app>]
 *
 * Builds `<out>/module.zip` (+ module.json beside it) from a git ref (default HEAD) — exactly what a
 * checkout of the tag contains, whatever state the working tree is in. Foundry compacts `packs/` on
 * every world start, so the tree's pack files rarely match any commit: zipping the tree packaged 12
 * of 16 packs broken (2026-10-05). Uncommitted changes to shipped files are reported as a problem —
 * the zip would not contain what you are testing. Then verifies the zip:
 *   1. it holds exactly the ref's package files, byte for byte, and nothing else;
 *   2. every path module.json references (esmodules, scripts, styles, languages) is inside;
 *   3. every declared pack opens from the zip with the same record count as the tree's `packs/`.
 * Prints one JSON object; exit 0 only when every check passes.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createZip, readZip } from "./zip.mjs";
import { countPackRecords } from "../agent/lib/packs.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** What a running Foundry needs, plus README/LICENSE/CREDITS/docs for context (RELEASING.md). */
export const INCLUDE_FILES = ["module.json", "README.md", "LICENSE", "CREDITS.md"];
export const INCLUDE_DIRS = ["scripts", "styles", "templates", "lang", "icons", "sounds", "tokens", "ui", "vfx", "packs", "docs"];
/** LevelDB's LOCK only — never `*.log`: a fresh pack keeps all its records in 000NNN.log. */
export const EXCLUDE = [/(^|\/)LOCK$/];

const arg = name => process.argv.slice(2).find(a => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

function git(args, opts = {}) {
  const res = spawnSync("git", args, { cwd: MODULE_ROOT, maxBuffer: 1 << 30, ...opts });
  if (res.status !== 0) throw new Error(`git ${args[0]} failed: ${String(res.stderr)}`);
  return res.stdout;
}

/** Files under the include list at `ref`, "/"-separated, sorted. */
export function packageFiles(ref = "HEAD") {
  return git(["ls-tree", "-r", "-z", "--name-only", ref, "--", ...INCLUDE_FILES, ...INCLUDE_DIRS], { encoding: "utf8" })
    .split("\0").filter(Boolean).filter(f => !EXCLUDE.some(re => re.test(f))).sort();
}

/** Blob contents at `ref`, in one `git cat-file --batch` round-trip. */
export function readBlobs(ref, files) {
  const out = git(["cat-file", "--batch"], { input: `${files.map(f => `${ref}:${f}`).join("\n")}\n` });
  const blobs = new Map();
  let p = 0;
  for (const f of files) {
    const nl = out.indexOf(0x0a, p);
    const [, type, size] = out.toString("utf8", p, nl).split(" ");
    if (type !== "blob") throw new Error(`${ref}:${f} is not a blob (${type})`);
    const start = nl + 1;
    blobs.set(f, out.subarray(start, start + Number(size)));
    p = start + Number(size) + 1;
  }
  return blobs;
}

/** Shipped files with uncommitted changes — `packs/` excluded (compaction churn, checked by records). */
export function dirtyShippedFiles() {
  const paths = [...INCLUDE_FILES, ...INCLUDE_DIRS.filter(d => d !== "packs")];
  return git(["status", "--porcelain", "-z", "--", ...paths], { encoding: "utf8" })
    .split("\0").filter(Boolean).map(l => l.slice(3));
}

function dirEntries(files) {
  const dirs = new Set();
  for (const f of files) {
    const parts = f.split("/");
    for (let i = 1; i < parts.length; i++) dirs.add(`${parts.slice(0, i).join("/")}/`);
  }
  return [...dirs];
}

export async function buildZip({ outDir = path.join(MODULE_ROOT, "dist"), foundryApp = null, ref = "HEAD", allowDirty = false } = {}) {
  const problems = [];
  const dirty = dirtyShippedFiles();
  if (dirty.length && !allowDirty) {
    problems.push(`uncommitted changes to shipped files (the zip is built from ${ref}): ${dirty.slice(0, 10).join(", ")}`);
  }
  const files = packageFiles(ref);
  const blobs = readBlobs(ref, files);

  const zip = createZip([
    ...dirEntries(files).map(name => ({ name })),
    ...files.map(name => ({ name, data: blobs.get(name) }))
  ]);
  fs.mkdirSync(outDir, { recursive: true });
  const zipPath = path.join(outDir, "module.zip");
  fs.writeFileSync(zipPath, zip);
  fs.writeFileSync(path.join(outDir, "module.json"), blobs.get("module.json"));

  // 1. exactly the package files, byte for byte
  const entries = readZip(fs.readFileSync(zipPath));
  const zipFiles = [...entries.keys()].filter(n => !n.endsWith("/")).sort();
  const extra = zipFiles.filter(f => !blobs.has(f));
  const absent = files.filter(f => !entries.has(f));
  const differ = files.filter(f => entries.has(f) && !entries.get(f).equals(blobs.get(f)));
  if (extra.length) problems.push(`unexpected in zip: ${extra.slice(0, 10).join(", ")}`);
  if (absent.length) problems.push(`missing from zip: ${absent.slice(0, 10).join(", ")}`);
  if (differ.length) problems.push(`content differs: ${differ.slice(0, 10).join(", ")}`);

  // 2. every path module.json references
  const manifest = JSON.parse(entries.get("module.json").toString("utf8").replace(/^\uFEFF/, ""));
  const referenced = [
    ...(manifest.esmodules ?? []), ...(manifest.scripts ?? []), ...(manifest.styles ?? []),
    ...(manifest.languages ?? []).map(l => l.path)
  ];
  const dangling = [...new Set(referenced)].filter(p => !entries.has(p));
  if (dangling.length) problems.push(`module.json references files not in the zip: ${dangling.join(", ")}`);

  // 3. packs: open each from the zip and count, against the tree's packs/
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fvtt-zip-packs-"));
  const packs = {};
  try {
    for (const p of manifest.packs ?? []) {
      const prefix = `${p.path.replace(/^\/+|\/+$/g, "")}/`;
      const names = [...entries.keys()].filter(n => n.startsWith(prefix) && !n.endsWith("/"));
      const dir = path.join(tmp, p.name);
      fs.mkdirSync(dir, { recursive: true });
      for (const n of names) fs.writeFileSync(path.join(dir, n.slice(prefix.length)), entries.get(n));
      const entry = packs[p.name] = { zip: null, tree: null };
      try {
        entry.zip = await countPackRecords(dir, p.type, foundryApp, { inPlace: true });
        entry.tree = await countPackRecords(path.join(MODULE_ROOT, p.path), p.type, foundryApp);
      } catch (err) {
        problems.push(`pack ${p.name}: ${err.message}`);
        continue;
      }
      if (!entry.zip) problems.push(`pack ${p.name}: no records in the zip`);
      else if (entry.zip !== entry.tree) problems.push(`pack ${p.name}: ${entry.zip} records in the zip, ${entry.tree} in packs/`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return {
    ok: problems.length === 0,
    version: manifest.version,
    ref, commit: git(["rev-parse", ref], { encoding: "utf8" }).trim(),
    zip: path.relative(MODULE_ROOT, zipPath).replaceAll("\\", "/"),
    bytes: zip.length,
    sha256: crypto.createHash("sha256").update(zip).digest("hex"),
    files: files.length,
    packs,
    problems
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const defaultFoundry = "C:/Program Files/Foundry Virtual Tabletop/resources/app";
  const res = await buildZip({
    outDir: arg("out") ? path.resolve(arg("out")) : undefined,
    ref: arg("ref") ?? "HEAD",
    allowDirty: process.argv.includes("--allow-dirty"),
    foundryApp: arg("foundry") ?? (fs.existsSync(defaultFoundry) ? defaultFoundry : null)
  });
  process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  process.exitCode = res.ok ? 0 : 1;
}
