/**
 * The migration tooling of PLAN_migracja_dnd5e6.md E0, proven without a server: the campaign freeze, the dnd5e
 * source of a data path, `fvtt backup`, and what the e2e runner makes of the browser console.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fvtt-migration-test-"));
process.env.FVTT_AGENT_STATE_DIR = path.join(tmp, "state");

const { checkFreeze, checkMode, checkQuiet, checkSystemInstall, COMMAND_CLASS } = await import("../lib/guards.mjs");
const { defaultProfileName, readFreeze, FILES, MODULE_ID } = await import("../lib/config.mjs");
const { knownCoreError, parseCompatWarning, summariseCompat, frameOwner } = await import("../lib/compat.mjs");
const { installSystem, checkSystemFolder, olderThan, packageVersion } = await import("../lib/systems.mjs");
const { initSandbox, linkPackage, relinkPackage } = await import("../lib/sandbox.mjs");
const { installPackage } = await import("../lib/systems.mjs");
const { createZip } = await import("../../release/zip.mjs");

const hasPython = spawnSync("python", ["-c", "import sys, os; sys.exit(0 if sys.version_info >= (3, 12) else 1)"], { windowsHide: true }).status === 0;
const needsPython = !hasPython && "python ≥ 3.12 not on PATH";
const refusedWith = code => err => err.refused === true && err.code === `refused-${code}`;
const frozen = { frozen: true, since: "2026-10-17T00:00:00Z", until: "E11", reason: "migration" };

/* ---------------------------------------------------------------------------------- */
/*  Freeze                                                                             */
/* ---------------------------------------------------------------------------------- */

test("freeze: no file means not frozen, and the campaign is the default profile", () => {
  assert.equal(readFreeze().frozen, false);
  assert.equal(defaultProfileName(), "campaign");
  assert.equal(defaultProfileName(frozen), "sandbox");
  assert.ok(FILES.freeze.startsWith(tmp));
});

test("freeze: nothing brings the campaign up or acts inside it", () => {
  for (const cmd of ["start", "restart", "packs", "login", "reload", "eval", "quench", "world:launch", "system:install"]) {
    assert.throws(() => checkFreeze(frozen, cmd, "campaign"), refusedWith("frozen"), cmd);
    checkFreeze(frozen, cmd, "sandbox");
    checkFreeze(frozen, cmd, "poligon");
    checkFreeze({ frozen: false }, cmd, "campaign");
  }
});

test("freeze: stopping, reading, backing up and cloning the campaign stay allowed", () => {
  for (const cmd of ["stop", "kill", "status", "logs", "users", "doctor", "backup", "poligon:clone", "wait-ready"]) checkFreeze(frozen, cmd, "campaign");
});

test("freeze, backup and system:install are classified; freeze works in runtime mode like `mode`", () => {
  for (const cmd of ["freeze", "backup", "system:install"]) assert.ok(COMMAND_CLASS[cmd], cmd);
  checkMode({ mode: "runtime" }, "freeze");
  assert.throws(() => checkMode({ mode: "runtime" }, "system:install"), refusedWith("mode"));
  assert.throws(() => checkMode({ mode: "runtime" }, "backup"), refusedWith("mode"));
});

/* ---------------------------------------------------------------------------------- */
/*  Quiet data paths, system:install                                                   */
/* ---------------------------------------------------------------------------------- */

const quiet = { status: { reachable: false }, servers: [], held: [] };

test("quiet data path: a live port, a live process or a held database refuses", () => {
  checkQuiet(quiet, "x");
  assert.throws(() => checkQuiet({ ...quiet, status: { reachable: true, world: "w" } }, "x"), refusedWith("running"));
  assert.throws(() => checkQuiet({ ...quiet, servers: [{ pid: 1 }] }, "x"), refusedWith("running"));
  assert.throws(() => checkQuiet({ ...quiet, held: ["systems/dnd5e/packs/spells"] }, "x"), refusedWith("db-held"));
});

test("system:install: the campaign only with --campaign, and never while anything serves the data path", () => {
  checkSystemInstall({ profileName: "sandbox", ...quiet });
  assert.throws(() => checkSystemInstall({ profileName: "campaign", ...quiet }), refusedWith("campaign"));
  checkSystemInstall({ profileName: "campaign", campaignFlag: true, ...quiet });
  assert.throws(() => checkSystemInstall({ profileName: "release", ...quiet, servers: [{ pid: 9 }] }), refusedWith("running"));
});

test("versions compare numerically, part by part", () => {
  assert.equal(olderThan("5.3.0", "6.0.6"), true);
  assert.equal(olderThan("6.0.6", "6.0.6"), false);
  assert.equal(olderThan("6.0.10", "6.0.6"), false);
  assert.equal(olderThan("14.364", "14.367"), true);
  assert.equal(olderThan("14.369", "14"), false);
});

/** A minimal built release of a system: manifest + one pack with a CURRENT file. */
function fakeSystem(version, { id = "dnd5e", built = true } = {}) {
  const manifest = { id, version, packs: [{ name: "spells", path: "packs/spells", type: "Item" }] };
  return [
    { name: "system.json", data: Buffer.from(JSON.stringify(manifest)) },
    { name: "dnd5e.mjs", data: Buffer.from("export {};") },
    ...(built ? [{ name: "packs/spells/CURRENT", data: Buffer.from("MANIFEST-000001\n") }] : [{ name: "packs/_source/spells/x.json", data: Buffer.from("{}") }])
  ];
}

function writeZip(file, entries) {
  fs.writeFileSync(file, createZip(entries));
  return file;
}

function writeFolder(dir, entries) {
  for (const e of entries) {
    fs.mkdirSync(path.dirname(path.join(dir, e.name)), { recursive: true });
    fs.writeFileSync(path.join(dir, e.name), e.data);
  }
  return dir;
}

test("system:install from a release zip; a second install keeps the first outside Data/", { skip: needsPython }, () => {
  const dataPath = path.join(tmp, "dp-zip");
  const zip = writeZip(path.join(tmp, "dnd5e-6.0.6.zip"), fakeSystem("6.0.6"));
  const first = installSystem({ source: zip, dataPath });
  assert.equal(first.version, "6.0.6");
  assert.equal(first.previous, null);
  const dst = path.join(dataPath, "Data", "systems", "dnd5e");
  assert.ok(fs.existsSync(path.join(dst, "dnd5e.lock")), "package-locked");
  const zip2 = writeZip(path.join(tmp, "dnd5e-6.0.7.zip"), fakeSystem("6.0.7").map(e => ({ ...e, name: `dnd5e/${e.name}` })));
  const second = installSystem({ source: zip2, dataPath });
  assert.equal(second.version, "6.0.7", "a zip with the release in a subfolder");
  assert.equal(second.previous, "6.0.6");
  assert.ok(second.keptAt.startsWith(path.join(dataPath, "agent-state")), "the old copy is outside Data/");
  assert.equal(packageVersion(second.keptAt), "6.0.6");
  assert.deepEqual(fs.readdirSync(path.join(dataPath, "Data", "systems")), ["dnd5e"], "Foundry sees one dnd5e");
});

test("system:install refuses a source checkout, another system, and leaves the installed one alone", { skip: needsPython }, () => {
  const dataPath = path.join(tmp, "dp-refuse");
  installSystem({ source: writeFolder(path.join(tmp, "rel-5.3.0"), fakeSystem("5.3.0")), dataPath });
  assert.throws(() => installSystem({ source: writeFolder(path.join(tmp, "checkout"), fakeSystem("6.0.6", { built: false })), dataPath }), /not a built release/);
  assert.throws(() => installSystem({ source: writeZip(path.join(tmp, "pf2e.zip"), fakeSystem("6.0.6", { id: "pf2e" })), dataPath }), /holds the system "pf2e"/);
  assert.throws(() => installSystem({ source: path.join(tmp, "nope.zip"), dataPath }), /does not exist/);
  assert.equal(packageVersion(path.join(dataPath, "Data", "systems", "dnd5e")), "5.3.0");
  assert.throws(() => checkSystemFolder(path.join(tmp, "checkout"), "dnd5e"), /not a built release/);
});

/** A campaign data path and a module folder, just enough for initSandbox. */
function fakeCampaign(name) {
  const campaign = path.join(tmp, name, "campaign");
  writeFolder(path.join(campaign, "Data", "systems", "dnd5e"), fakeSystem("5.3.0"));
  writeFolder(campaign, [{ name: "Config/options.json", data: Buffer.from(JSON.stringify({ port: 1, dataPath: campaign })) }]);
  const moduleRoot = writeFolder(path.join(tmp, name, "module"), [
    { name: "module.json", data: Buffer.from(JSON.stringify({ id: MODULE_ID, version: "0.0.1" })) },
    { name: "scripts/main.mjs", data: Buffer.from("") }
  ]);
  return { campaign, moduleRoot };
}

test("a new data path gets dnd5e from the configured source, not the campaign's (E0 (2))", { skip: needsPython }, async () => {
  const { campaign, moduleRoot } = fakeCampaign("init-source");
  const zip = writeZip(path.join(tmp, "init-source", "dnd5e.zip"), fakeSystem("6.0.6"));
  const sandboxData = path.join(tmp, "init-source", "sandbox");
  const report = await initSandbox({ campaignData: campaign, sandboxData, moduleRoot, modules: [], dnd5eSource: zip });
  assert.deepEqual(report.system, { dnd5e: "6.0.6", from: "source" });
  const again = await initSandbox({ campaignData: campaign, sandboxData, moduleRoot, modules: [], dnd5eSource: zip });
  assert.deepEqual(again.system, { dnd5e: "6.0.6", from: "kept" }, "an existing dnd5e is never replaced by init");
});

test("without a configured source a new data path still copies the campaign's dnd5e", async () => {
  const { campaign, moduleRoot } = fakeCampaign("init-campaign");
  const report = await initSandbox({ campaignData: campaign, sandboxData: path.join(tmp, "init-campaign", "sandbox"), moduleRoot, modules: [] });
  assert.deepEqual(report.system, { dnd5e: "5.3.0", from: "campaign" });
});


test("module:install: a third-party module from a zip with a top folder, unlocked; this module never", { skip: needsPython }, () => {
  const dataPath = path.join(tmp, "dp-module");
  const mod = (version, id = "sequencer") => [
    { name: `${id}/module.json`, data: Buffer.from(JSON.stringify({ id, version, packs: [] })) },
    { name: `${id}/scripts/x.js`, data: Buffer.from(version) }
  ];
  const first = installPackage({ source: writeZip(path.join(tmp, "seq-1.zip"), mod("4.2.2")), dataPath, type: "modules", lock: false });
  assert.equal(first.id, "sequencer");
  const dst = path.join(dataPath, "Data", "modules", "sequencer");
  assert.ok(!fs.existsSync(path.join(dst, "sequencer.lock")), "third-party modules stay unlocked");
  const second = installPackage({ source: writeZip(path.join(tmp, "seq-2.zip"), mod("4.3.0")), dataPath, type: "modules", lock: false });
  assert.deepEqual([second.version, second.previous], ["4.3.0", "4.2.2"]);
  assert.equal(fs.readFileSync(path.join(dst, "scripts", "x.js"), "utf8"), "4.3.0");
  assert.throws(() => installPackage({ source: writeZip(path.join(tmp, "ours.zip"), mod("9", MODULE_ID)), dataPath, type: "modules", refuse: [MODULE_ID] }), refusedWith("package"));
  assert.ok(!fs.existsSync(path.join(dataPath, "Data", "modules", MODULE_ID)));
});

test("re-linking a package: links removed without touching their targets, dropped files gone, packs copied anew", () => {
  const src = writeFolder(path.join(tmp, "relink", "src"), [
    { name: "module.json", data: Buffer.from("{\"version\":\"1\"}") }, { name: "old.txt", data: Buffer.from("x") },
    { name: "scripts/a.js", data: Buffer.from("a") }, { name: "packs/p/CURRENT", data: Buffer.from("1") }
  ]);
  const dst = path.join(tmp, "relink", "dst");
  linkPackage(src, dst, { id: "m" });
  assert.ok(fs.existsSync(path.join(dst, "old.txt")));
  fs.rmSync(path.join(src, "old.txt"));
  fs.writeFileSync(path.join(src, "module.json"), "{\"version\":\"2\"}");
  fs.writeFileSync(path.join(src, "packs", "p", "CURRENT"), "2");
  relinkPackage(src, dst, { id: "m" });
  assert.ok(!fs.existsSync(path.join(dst, "old.txt")), "a file the new version dropped is gone");
  assert.equal(fs.readFileSync(path.join(dst, "module.json"), "utf8"), "{\"version\":\"2\"}");
  assert.equal(fs.readFileSync(path.join(dst, "packs", "p", "CURRENT"), "utf8"), "2");
  assert.equal(fs.readFileSync(path.join(src, "scripts", "a.js"), "utf8"), "a", "the link target survives");
  assert.equal(fs.readFileSync(path.join(dst, "scripts", "a.js"), "utf8"), "a");
  assert.ok(fs.existsSync(path.join(dst, "m.lock")));
});

/* ---------------------------------------------------------------------------------- */
/*  Backup                                                                             */
/* ---------------------------------------------------------------------------------- */


test("backup: archives, options.json, manifest, SHA256SUMS; links listed, not followed; never this module", { skip: needsPython }, async () => {
  const { runBackup, defaultWorlds } = await import("../lib/backup.mjs");
  const dataPath = path.join(tmp, "backup-dp");
  const data = path.join(dataPath, "Data");
  writeFolder(dataPath, [{ name: "Config/options.json", data: Buffer.from("{}") }, { name: "Config/admin.txt", data: Buffer.from("secret") }]);
  writeFolder(path.join(data, "worlds", "w1"), [{ name: "world.json", data: Buffer.from(JSON.stringify({ id: "w1", title: "W1", system: "dnd5e" })) }]);
  writeFolder(path.join(data, "systems", "dnd5e"), fakeSystem("5.3.0"));
  writeFolder(path.join(data, "modules", "other"), [{ name: "module.json", data: Buffer.from(JSON.stringify({ id: "other", version: "1.2.3" })) }]);
  writeFolder(path.join(data, "modules", MODULE_ID), [{ name: "module.json", data: Buffer.from(JSON.stringify({ id: MODULE_ID, version: "9" })) }]);
  const target = writeFolder(path.join(tmp, "link-target"), [{ name: "big.bin", data: Buffer.alloc(10) }]);
  fs.symlinkSync(target, path.join(data, "modules", "other", "linked"), "junction");
  const profile = { name: "sandbox", dataPath, data };
  assert.deepEqual(defaultWorlds(profile, {}), ["w1"]);
  const root = path.join(tmp, "backups");
  fs.mkdirSync(root, { recursive: true });
  const install = { app: path.join(tmp, "no-app") };
  fs.mkdirSync(install.app, { recursive: true });
  fs.writeFileSync(path.join(install.app, "package.json"), JSON.stringify({ release: { generation: 14, build: 369 } }));
  const res = await runBackup({ profile, install, root, worlds: ["w1"], reason: "Próba E0" });
  assert.equal(res.ok, true);
  assert.match(path.basename(res.dest), /^\d{4}-\d{2}-\d{2}_sandbox-proba-e0$/);
  const files = fs.readdirSync(res.dest).sort();
  assert.deepEqual(files, ["Config-options.json", "README.md", "SHA256SUMS", "manifest.json", "modules-third-party.zip", "system-dnd5e-5.3.0.zip", "world-w1.zip"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(res.dest, "manifest.json"), "utf8"));
  assert.equal(manifest.foundry, "14.369");
  assert.deepEqual(manifest.modules, { other: "1.2.3" }, "this module is in git, not in the backup");
  assert.deepEqual(manifest.parts.find(p => p.file === "modules-third-party.zip").links, ["modules/other/linked"]);
  assert.ok(manifest.parts.every(p => p.crc === "ok"));
  const sums = fs.readFileSync(path.join(res.dest, "SHA256SUMS"), "utf8").trim().split("\n");
  assert.equal(sums.length, files.length - 1);
  assert.ok(!files.some(f => /admin|license/i.test(f)));
  await assert.rejects(runBackup({ profile, install, root, worlds: ["w1"], reason: "Próba E0" }), refusedWith("exists"));
});

/* ---------------------------------------------------------------------------------- */
/*  Console: known core errors, compatibility warnings                                 */
/* ---------------------------------------------------------------------------------- */

test("known core errors: the reseed teardown family only, and never with a package frame in it", () => {
  assert.equal(knownCoreError("TypeError: Cannot set properties of null (setting 'hidden')\n    at #postNotification (/scripts/foundry.mjs:130086:20)"), "post-notification");
  assert.equal(knownCoreError("TypeError: Cannot read properties of null (reading 'off')\n    at PreciseText.destroy (/scripts/pixi.min.js:529:36451)\n    at PreciseText.destroy (/scripts/pixi.min.js:929:12997)\n    at InterfaceCanvasGroup.createScrollingText (/scripts/foundry.mjs:166143:10)"), "scrolling-text");
  assert.equal(knownCoreError("TypeError: Cannot read properties of null (reading 'position')\n    at set y (/scripts/pixi.min.js:529:25317)\n    at #updateAttribute (/scripts/foundry.mjs:108311:45)\n    at #animateFrame (/scripts/foundry.mjs:108286:69)"), "scrolling-text");
  assert.equal(knownCoreError("TypeError: Cannot set properties of null (setting 'hidden')\n    at #postNotification (/scripts/foundry.mjs:1:1)\n    at x (/modules/neuroshima-2026-overrides/scripts/a.mjs:1:1)"), null);
  assert.equal(knownCoreError("TypeError: Cannot read properties of undefined (reading 'get')"), null);
});

/** A compat warning as CDP reports it: core logs an Error through console.warn. */
const warn = (message, frames, type = "warning") => [type, [{ type: "object", subtype: "error", description: `Error: ${message}\n${frames.map(f => `    at ${f}`).join("\n")}` }]];
const HELPER = "logCompatibilityWarning (http://localhost:1/scripts/foundry.mjs:10:3)";

test("compat: a dnd5e shim used by this module is the module's", () => {
  const w = parseCompatWarning(...warn("movement.walk has moved to \"movement.speeds.walk\".\nDeprecated since Version DnD5e 6.0", [
    HELPER, "Object.set (http://localhost:1/systems/dnd5e/dnd5e.mjs:5:5)",
    `applyRunning (http://localhost:1/modules/${MODULE_ID}/scripts/combat/bieganie.mjs:40:7)`, "Hooks.callAll (http://localhost:1/scripts/foundry.mjs:9:9)"
  ]));
  assert.equal(w.caller, "module");
  assert.equal(w.involvesModule, true);
  assert.match(w.message, /^movement\.walk has moved/);
  assert.ok(!JSON.stringify(w).includes("localhost"), "no host or port in a report");
});

test("compat: dnd5e calling a deprecated core API is dnd5e's, even with this module further down the stack", () => {
  const w = parseCompatWarning(...warn("ActiveEffect#changes is deprecated\nDeprecated since Version 14", [
    HELPER, "get changes (/scripts/foundry.mjs:20:2)", "ActiveEffect5e.apply (/systems/dnd5e/dnd5e.mjs:7:7)",
    `wrapped (/modules/${MODULE_ID}/scripts/actors/pw.mjs:3:3)`
  ]));
  assert.equal(w.caller, "dnd5e");
  assert.equal(w.involvesModule, true);
});

test("compat: core plumbing between a shim and its reader (deepClone, native frames) is skipped to the real caller", () => {
  const w = parseCompatWarning(...warn("senses.darkvision has moved to \"senses.ranges.darkvision\".\nDeprecated since Version DnD5e 5.0", [
    HELPER, "Object.get [as darkvision] (/systems/dnd5e/dnd5e.mjs:25642:25)", "_deepClone (/scripts/foundry.mjs:1862:19)",
    "_deepClone (/scripts/foundry.mjs:1863:16)", "Array.map (<anonymous>)", `snapshot (/modules/${MODULE_ID}/scripts/items/gogle.mjs:12:3)`
  ]));
  assert.equal(w.caller, "module");
  assert.match(w.callerFrame, /gogle\.mjs/);
  assert.equal(parseCompatWarning(...warn("x\nDeprecated since Version 13", [HELPER, "get x (/scripts/foundry.mjs:1:1)", "<anonymous>:3:18"])).caller, "harness");
});

test("compat: core's ERROR mode is still a compatibility warning; ordinary warnings are not", () => {
  assert.equal(parseCompatWarning(...warn("old\nDeprecated since Version 13", [HELPER, "get x (/scripts/foundry.mjs:1:1)", "y (/scripts/foundry.mjs:2:2)"], "error")).caller, "core");
  assert.equal(parseCompatWarning("warning", [{ type: "string", value: "Sequencer | something" }]), null);
  assert.equal(parseCompatWarning("log", warn("x\nDeprecated since Version 1", [HELPER])[1]), null);
  assert.equal(frameOwner("f (/modules/sequencer/x.js:1:1)"), "other");
  assert.equal(frameOwner("f (/agent-e2e/fixtures/skirmish.mjs:1:1)"), "harness");
});

test("compat: repeats collapse to one entry per message and caller, counted", () => {
  const a = parseCompatWarning(...warn("m1\nDeprecated since Version 6", [HELPER, "d (/systems/dnd5e/dnd5e.mjs:1:1)", `c (/modules/${MODULE_ID}/scripts/a.mjs:1:1)`]));
  const b = parseCompatWarning(...warn("m1\nDeprecated since Version 6", [HELPER, "d (/systems/dnd5e/dnd5e.mjs:1:1)", "e (/systems/dnd5e/dnd5e.mjs:2:2)"]));
  const s = summariseCompat([a, a, b]);
  assert.equal(s.total, 3);
  assert.equal(s.unique.length, 2);
  assert.deepEqual(s.byCaller, { module: 2, dnd5e: 1 });
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
