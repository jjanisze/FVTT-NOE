#!/usr/bin/env node
/**
 * Release gate (PLAN_agentic_improvements.md §5 E) — the RELEASING.md prerequisite for a tag.
 *
 *   npm run release:check                 # everything, locally (needs Foundry + Chrome + the vault)
 *   npm run release:check -- --ci         # the subset the GitHub release job runs: Node + Python only
 *   npm run release:check -- --skip-sandbox
 *
 *  1. static      npm test, agent guard tests, validate:css, validate:recipes
 *  2. generators  regenerate everything that is generated and compare with what is committed
 *                 (bestiary + class features from the NOE vault, data modules from their JSON);
 *                 nothing in the tree is left modified
 *  3. zip         dev/release/build-zip.mjs — THE package, verified (files, references, pack counts)
 *  4. packs       fresh build-packs → validate-packs → same records as the zip's packs (local);
 *                 validate-packs on the checked-out packs (--ci)
 *  5. versions    module.json compatibility vs the Foundry/dnd5e actually tested
 *  6. sandbox     release sandbox with the module FROM THE ZIP: "bare" world (module only) and
 *                 "recommended" world (+ Quench, Sequencer, Splatter): every e2e suite in both,
 *                 the module's Quench batches in the recommended one
 *
 * Report: logs/release/<version>-<stamp>.json. Exit 0 only when every step that ran is green.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildZip } from "./build-zip.mjs";
import { readZip } from "./zip.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE_ID = "neuroshima-2026-overrides";
const CI = process.argv.includes("--ci");
const SKIP_SANDBOX = CI || process.argv.includes("--skip-sandbox");
const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const FOUNDRY_APP_DEFAULT = "C:/Program Files/Foundry Virtual Tabletop/resources/app";

const log = (...p) => process.stderr.write(`[release] ${p.join(" ")}\n`);
const rel = p => path.relative(MODULE_ROOT, p).replaceAll("\\", "/");

function run(cmd, args, { env } = {}) {
  const t0 = Date.now();
  // PYTHONUTF8: a Python printing Polish names into a Windows pipe dies in cp1252 (UnicodeEncodeError).
  const res = spawnSync(cmd, args, { cwd: MODULE_ROOT, encoding: "utf8", maxBuffer: 64 << 20, env: { ...process.env, PYTHONUTF8: "1", ...env }, windowsHide: true });
  const tail = s => (s ?? "").trim().split(/\r?\n/).slice(-15);
  return { cmd: [cmd, ...args.map(a => (a.includes(MODULE_ROOT) ? rel(a) : a))].join(" "), ok: res.status === 0, exit: res.status, ms: Date.now() - t0, stdout: tail(res.stdout), stderr: tail(res.stderr) };
}
const node = (...args) => run(process.execPath, args);

const steps = [];
async function step(name, fn) {
  const t0 = Date.now();
  log(`${name}…`);
  try {
    const r = await fn();
    steps.push({ name, ms: Date.now() - t0, ...r });
  } catch (err) {
    steps.push({ name, ms: Date.now() - t0, ok: false, error: err.message, code: err.code });
  }
  const s = steps.at(-1);
  log(`${name}: ${s.skipped ? `skipped (${s.skipped})` : s.ok ? "ok" : `FAILED ${s.error ?? ""}`}`);
  return s;
}

/* ------------------------------------------------------------------------------------ */

await step("static", async () => {
  const testFiles = fs.readdirSync(path.join(MODULE_ROOT, "dev", "agent", "test")).filter(f => f.endsWith(".test.mjs")).map(f => path.join("dev", "agent", "test", f));
  const runs = [
    node("dev/validate-tests.mjs"),
    node("--test", ...testFiles),
    node("dev/validate-css.mjs"),
    node("dev/validate-recipes.mjs")
  ];
  return { ok: runs.every(r => r.ok), runs };
});

await step("generators", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "release-gen-"));
  // Text compare with line endings normalised: generators write LF, a Windows checkout has CRLF.
  const text = p => fs.readFileSync(p, "utf8").replaceAll("\r\n", "\n");
  const same = (a, b) => fs.existsSync(a) && fs.existsSync(b) && text(a) === text(b);
  const checks = [];
  try {
    // From the vault (local only): NOE Markdown → JSON, written to temp and compared.
    if (CI) {
      checks.push({ name: "vault extractors", skipped: "--ci (the vault is private)" });
    } else {
      for (const [name, script, outArg, committed] of [
        ["bestiary.json", "dev/bestiary/extract_bestiary.py", f => `--out=${path.join(f, "bestiary.json")}`, "dev/bestiary/bestiary.json"],
        ["classes.json", "dev/classes/extract_classes.py", f => `--out=${f}`, "dev/classes/classes.json"],
        ["professions.json", "dev/classes/extract_professions.py", f => `--out=${f}`, "dev/classes/professions.json"]
      ]) {
        const r = run(PYTHON, [script, outArg(tmp)]);
        if (/parsing 0 profiles/.test(r.stdout.join(" ")) || (!r.ok && /No such file|not found|nie znaleziono|FileNotFoundError/i.test([...r.stderr, ...r.stdout].join(" ")))) {
          checks.push({ name, skipped: "NOE vault not found (set NOE_DIR)" });
          continue;
        }
        checks.push({ name, ok: r.ok && same(path.join(tmp, name), path.join(MODULE_ROOT, committed)), run: r, stale: r.ok && !same(path.join(tmp, name), path.join(MODULE_ROOT, committed)) });
      }
    }
    // JSON → data modules (fixed output paths): snapshot, regenerate, compare, restore.
    for (const [name, script, out] of [
      ["bestiary-data.mjs", "dev/bestiary/gen_bestiary.py", "scripts/config/bestiary-data.mjs"],
      ["class-features-data.mjs", "dev/classes/gen_features.py", "scripts/config/class-features-data.mjs"]
    ]) {
      const file = path.join(MODULE_ROOT, out);
      const before = fs.readFileSync(file);
      const r = run(PYTHON, [script]);
      const after = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
      fs.writeFileSync(file, before);
      const eq = after.toString("utf8").replaceAll("\r\n", "\n") === before.toString("utf8").replaceAll("\r\n", "\n");
      checks.push({ name, ok: r.ok && eq, stale: r.ok && !eq, run: r });
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const stale = checks.filter(c => c.stale).map(c => c.name);
  return { ok: checks.every(c => c.skipped || c.ok), stale, checks, ...(stale.length ? { hint: "Regenerate and commit (see the pipelines table in AGENTS.md / IMPLEMENTATION.md)." } : {}) };
});

const zipStep = await step("zip", async () => {
  const foundryApp = fs.existsSync(FOUNDRY_APP_DEFAULT) ? FOUNDRY_APP_DEFAULT : null;
  const res = await buildZip({ outDir: path.join(MODULE_ROOT, "dist"), foundryApp });
  return { ...res, zipPath: path.join(MODULE_ROOT, "dist", "module.zip") };
});

await step("packs", async () => {
  if (CI) {
    const v = node("dev/packs/validate-packs.mjs");
    return { ok: v.ok, validate: v };
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "release-packs-"));
  try {
    const out = `--out=${path.join(tmp, "fresh")}`;
    const build = node("dev/packs/build-packs.mjs", out);
    const validate = build.ok ? node("dev/packs/validate-packs.mjs", out) : null;
    // The zip's packs (what ships) against the fresh build (what the sources say).
    const zipped = path.join(tmp, "zipped");
    for (const [name, data] of readZip(fs.readFileSync(zipStep.zipPath ?? path.join(MODULE_ROOT, "dist", "module.zip")))) {
      if (!name.startsWith("packs/") || name.endsWith("/")) continue;
      const target = path.join(zipped, name.slice("packs/".length));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data);
    }
    const diff = build.ok ? node("dev/packs/diff-packs.mjs", path.join(tmp, "fresh"), zipped) : null;
    return {
      ok: build.ok && validate?.ok && diff?.ok, build, validate, diff,
      ...(diff && !diff.ok ? { hint: "The committed packs differ from a fresh build: `npm run fvtt -- packs`, then commit packs/." } : {})
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

await step("versions", async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(MODULE_ROOT, "module.json"), "utf8").replace(/^\uFEFF/, ""));
  const dnd = manifest.relationships?.systems?.find(s => s.id === "dnd5e")?.compatibility ?? {};
  const problems = [];
  if (dnd.minimum !== dnd.verified) problems.push(`dnd5e minimum ${dnd.minimum} ≠ verified ${dnd.verified}: claim only what the release sandbox tests (§5 E)`);
  const tested = {};
  if (!CI && fs.existsSync(FOUNDRY_APP_DEFAULT)) {
    const release = JSON.parse(fs.readFileSync(path.join(FOUNDRY_APP_DEFAULT, "package.json"), "utf8")).release;
    tested.foundry = `${release.generation}.${release.build}`;
    if (String(manifest.compatibility?.verified) !== String(release.generation) && String(manifest.compatibility?.verified) !== tested.foundry) {
      problems.push(`module.json verified ${manifest.compatibility?.verified} ≠ installed Foundry ${tested.foundry}`);
    }
  }
  return { ok: problems.length === 0, module: manifest.version, compatibility: manifest.compatibility, dnd5e: dnd, tested, problems };
});

await step("sandbox", async () => {
  if (SKIP_SANDBOX) return { ok: true, skipped: CI ? "--ci (no Foundry on the runner)" : "--skip-sandbox" };
  if (!zipStep.ok) return { ok: false, error: "zip step failed — nothing trustworthy to install" };
  const { runReleaseSandbox } = await import("../agent/lib/release-sandbox.mjs");
  return runReleaseSandbox({ zipPath: zipStep.zipPath, moduleRoot: MODULE_ROOT });
});

/* ------------------------------------------------------------------------------------ */

const manifest = JSON.parse(fs.readFileSync(path.join(MODULE_ROOT, "module.json"), "utf8").replace(/^\uFEFF/, ""));
const report = {
  ok: steps.every(s => s.ok || s.skipped),
  version: manifest.version, ci: CI, at: new Date().toISOString(),
  commit: zipStep.commit ?? null, zipSha256: zipStep.sha256 ?? null,
  steps
};
const dir = path.join(MODULE_ROOT, "logs", "release");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${manifest.version}-${report.at.replace(/[:.]/g, "-").slice(0, 19)}${CI ? "-ci" : ""}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify({
  ok: report.ok, version: report.version, commit: report.commit, report: rel(file),
  steps: steps.map(s => ({ name: s.name, ok: s.ok, skipped: s.skipped ?? undefined, ms: s.ms, error: s.error ?? undefined, problems: s.problems?.length ? s.problems : undefined, stale: s.stale?.length ? s.stale : undefined, hint: s.hint }))
}, null, 2)}\n`);
process.exitCode = report.ok ? 0 : 1;
