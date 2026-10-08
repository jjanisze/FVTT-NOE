/**
 * The §4 safety model, proven without a server: `npm run test:agent`.
 * Every refusal the plan promises has a test here; a guard change that loosens one fails.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fvtt-agent-test-"));
process.env.FVTT_AGENT_STATE_DIR = path.join(tmp, "state");

const { checkMode, checkWorldDeletable, checkStartable, agentWorldId, COMMAND_CLASS } = await import("../lib/guards.mjs");
const { isHeld, heldDatabases } = await import("../lib/leveldb.mjs");
const { lockExclusive, lockShared, holders, unlockAll } = await import("../lib/mutex.mjs");
const { dataPathArg, foundryServers } = await import("../lib/proc.mjs");
const { cdpUrl, resolveProfile, FILES } = await import("../lib/config.mjs");

const refusedWith = code => err => err.refused === true && err.code === `refused-${code}`;
const dev = { mode: "development" };
const runtime = { mode: "runtime", since: "2026-10-05T00:00:00Z" };

test("state dir is the test's, never the user's", () => {
  assert.ok(FILES.locks.startsWith(tmp));
});

test("development mode allows every classified command", () => {
  for (const cmd of Object.keys(COMMAND_CLASS)) checkMode(dev, cmd, { loginRole: "player" });
});

test("runtime mode refuses lifecycle and testing on every profile (D9)", () => {
  for (const [cmd, cls] of Object.entries(COMMAND_CLASS)) {
    if (cls !== "lifecycle" && cls !== "testing") continue;
    for (const profile of ["campaign", "sandbox"]) {
      assert.throws(() => checkMode(runtime, cmd, { profile }), refusedWith("mode"), `${cmd} on ${profile}`);
    }
  }
});

test("runtime mode still allows reads and GM logins, not player logins", () => {
  for (const cmd of ["status", "doctor", "logs", "users", "mode", "wait-ready", "world:list"]) checkMode(runtime, cmd);
  checkMode(runtime, "login", { loginRole: "gm" });
  assert.throws(() => checkMode(runtime, "login", { loginRole: "player" }), refusedWith("mode"));
});

test("an unclassified command is a programming error, not a silent allow", () => {
  assert.throws(() => checkMode(dev, "nuke"), /unclassified/);
});

test("agent world ids: agent-<slug>-<yyyymmdd>, Polish letters folded", () => {
  const d = new Date("2026-10-05T12:00:00Z");
  assert.equal(agentWorldId("Granat Gracza", d), "agent-granat-gracza-20261005");
  assert.equal(agentWorldId("Zranienie ŁĄCZKA", d), "agent-zranienie-laczka-20261005");
  assert.throws(() => agentWorldId("!!!", d), refusedWith("world-id"));
  // Local date, not UTC: just after local midnight is already the new day (field test 2026-10-07).
  assert.equal(agentWorldId("m1", new Date(2026, 9, 7, 0, 30)), "agent-m1-20261007");
});

const okWorld = {
  id: "agent-test-20261005", marker: { id: "agent-test-20261005" }, isLink: false,
  activeWorld: null, protectedIds: new Set(["output"]), locked: false, heldDbs: []
};

test("world delete: a properly marked, idle agent world passes", () => {
  checkWorldDeletable(okWorld);
});

test("world delete refuses the campaign world and anything without the agent- prefix", () => {
  assert.throws(() => checkWorldDeletable({ ...okWorld, id: "output", marker: { id: "output" } }), refusedWith("not-agent-world"));
  assert.throws(() => checkWorldDeletable({ ...okWorld, id: "agentx", marker: { id: "agentx" } }), refusedWith("not-agent-world"));
  assert.throws(() => checkWorldDeletable({ ...okWorld, id: "../output", marker: { id: "../output" } }), refusedWith("not-agent-world"));
});

test("world delete refuses a protected agent- id", () => {
  assert.throws(() => checkWorldDeletable({ ...okWorld, protectedIds: new Set([okWorld.id]) }), refusedWith("protected-world"));
});

test("world delete refuses without a marker, or with a marker naming another world", () => {
  assert.throws(() => checkWorldDeletable({ ...okWorld, marker: null }), refusedWith("no-marker"));
  assert.throws(() => checkWorldDeletable({ ...okWorld, marker: { id: "agent-other-20261005" } }), refusedWith("no-marker"));
});

test("world delete refuses links, the active world, locks and open databases", () => {
  assert.throws(() => checkWorldDeletable({ ...okWorld, isLink: true }), refusedWith("link"));
  assert.throws(() => checkWorldDeletable({ ...okWorld, activeWorld: okWorld.id }), refusedWith("active-world"));
  assert.throws(() => checkWorldDeletable({ ...okWorld, locked: true }), refusedWith("locked"));
  assert.throws(() => checkWorldDeletable({ ...okWorld, heldDbs: ["worlds/x/data/actors"] }), refusedWith("db-held"));
});

test("start interlock (D5): refuses a live port, a live process, a held LevelDB", () => {
  const quiet = { status: { reachable: false }, servers: [], held: [] };
  checkStartable(quiet);
  assert.throws(() => checkStartable({ ...quiet, status: { reachable: true, active: true, world: "output" } }), refusedWith("running"));
  assert.throws(() => checkStartable({ ...quiet, servers: [{ pid: 1 }] }), refusedWith("process"));
  assert.throws(() => checkStartable({ ...quiet, held: ["modules/x/packs/bron"] }), refusedWith("db-held"));
});

const FOUNDRY_NM = "C:/Program Files/Foundry Virtual Tabletop/resources/app/node_modules/classic-level";
test("LevelDB interlock sees a database another process holds open", { skip: !fs.existsSync(FOUNDRY_NM) && "no Foundry install" }, async () => {
  const root = path.join(tmp, "Data");
  const db = path.join(root, "modules", "m", "packs", "p");
  fs.mkdirSync(db, { recursive: true });
  const require = createRequire(import.meta.url);
  const { ClassicLevel } = require(FOUNDRY_NM);
  const created = new ClassicLevel(db);
  await created.open();
  await created.close();
  assert.equal(isHeld(path.join(db, "LOCK")), false);

  const holder = spawn(process.execPath, ["-e", `
    const { ClassicLevel } = require(${JSON.stringify(FOUNDRY_NM)});
    const d = new ClassicLevel(${JSON.stringify(db)});
    d.open().then(() => { console.log("open"); setInterval(() => {}, 1000); });`], { stdio: ["ignore", "pipe", "inherit"] });
  await new Promise(resolve => holder.stdout.once("data", resolve));
  try {
    assert.deepEqual(heldDatabases(root).held, ["modules/m/packs/p"]);
  } finally {
    holder.kill();
    await new Promise(resolve => holder.once("exit", resolve));
  }
  assert.equal(isHeld(path.join(db, "LOCK")), false);
});

test("mutex: exclusive blocks a second taker; a dead owner's lock is stale", async () => {
  fs.mkdirSync(FILES.locks, { recursive: true });
  // Another live process (our parent) holds it.
  fs.writeFileSync(path.join(FILES.locks, "campaign.json"), JSON.stringify({ pid: process.ppid, owner: "other", purpose: "packs" }));
  await assert.rejects(lockExclusive("campaign", "test"), refusedWith("busy"));
  await assert.rejects(lockShared("campaign", "test"), refusedWith("busy"));
  // A pid that cannot exist → stale → taken over.
  fs.writeFileSync(path.join(FILES.locks, "campaign.json"), JSON.stringify({ pid: 2 ** 22 + 7, owner: "dead", purpose: "packs" }));
  await lockExclusive("campaign", "test");
  assert.equal(holders("campaign").exclusive.pid, process.pid);
  unlockAll();
  assert.equal(holders("campaign").exclusive, null);
});

test("mutex: a live shared lock (Quench run) blocks an exclusive one", async () => {
  fs.writeFileSync(path.join(FILES.locks, `sandbox.shared.${process.ppid}.json`), JSON.stringify({ pid: process.ppid, owner: "quench" }));
  await assert.rejects(lockExclusive("sandbox", "packs"), refusedWith("busy"));
  await lockShared("sandbox", "another quench");
  unlockAll();
  fs.rmSync(path.join(FILES.locks, `sandbox.shared.${process.ppid}.json`));
  await lockExclusive("sandbox", "packs");
  unlockAll();
});

// Windows process tables and drive-letter paths (fvtt itself is Windows-only: PowerShell, taskkill,
// DPAPI). On the Linux release runner `path.resolve("C:\\…")` is relative, so the test cannot hold.
test("process filter: Foundry main processes only — never helpers, never Chrome", { skip: process.platform !== "win32" && "Windows paths" }, () => {
  const install = { exe: "C:\\Foundry\\Foundry Virtual Tabletop.exe", mainJs: "C:\\Foundry\\resources\\app\\main.js" };
  const procs = [
    { pid: 1, name: "Foundry Virtual Tabletop.exe", exe: install.exe, cmd: `"${install.exe}"` },
    { pid: 2, name: "Foundry Virtual Tabletop.exe", exe: install.exe, cmd: `"${install.exe}" --type=renderer` },
    { pid: 3, name: "Foundry Virtual Tabletop.exe", exe: install.exe, cmd: `"${install.exe}" --dataPath=D:/Sandbox` },
    { pid: 4, name: "node.exe", exe: "C:\\node\\node.exe", cmd: "node C:/Foundry/resources/app/main.js --dataPath=\"D:/Other Path\"" },
    { pid: 5, name: "chrome.exe", exe: "C:\\Chrome\\chrome.exe", cmd: "chrome --remote-debugging-port=1" },
    { pid: 6, name: "node.exe", exe: "C:\\node\\node.exe", cmd: "node somewhere/else/main.js" }
  ];
  const got = foundryServers(install, "C:/Default", procs);
  assert.deepEqual(got.map(s => s.pid), [1, 3, 4]);
  assert.equal(got[0].dataPath, path.resolve("C:/Default"));
  assert.equal(got[1].dataPath, path.resolve("D:/Sandbox"));
  assert.equal(got[2].dataPath, path.resolve("D:/Other Path"));
  assert.equal(dataPathArg("x --world=a"), null);
});

test("config: CDP endpoint comes from the MCP config; port and prefix from options.json", () => {
  const mcp = path.join(tmp, "mcp.json");
  fs.writeFileSync(mcp, JSON.stringify({ mcpServers: { "chrome-devtools": { args: ["-y", "x", "--browserUrl", "http://127.0.0.1:1234/"] } } }));
  assert.equal(cdpUrl({ cdp: { mcpJson: mcp } }), "http://127.0.0.1:1234");
  fs.writeFileSync(mcp, JSON.stringify({ mcpServers: { "chrome-devtools": { args: ["--browserUrl=http://127.0.0.1:99"] } } }));
  assert.equal(cdpUrl({ cdp: { mcpJson: mcp } }), "http://127.0.0.1:99");

  const data = path.join(tmp, "sbx");
  fs.mkdirSync(path.join(data, "Config"), { recursive: true });
  fs.writeFileSync(path.join(data, "Config", "options.json"), JSON.stringify({ port: 4321, routePrefix: "/vtt/" }));
  const p = resolveProfile({ sandbox: { dataPath: data } }, "sandbox");
  assert.equal(p.port, 4321);
  assert.equal(p.baseUrl, "http://localhost:4321/vtt");
  assert.deepEqual(p.launchArgs, [`--dataPath=${path.resolve(data)}`]);
  assert.throws(() => resolveProfile({}, "staging"), /Unknown profile/);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
