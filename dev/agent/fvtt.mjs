#!/usr/bin/env node
/**
 * fvtt — the agent's handle on FoundryVTT (PLAN_agentic_improvements.md §5 A).
 *
 *   npm run fvtt -- <command> [--profile=campaign|sandbox] [--key=value] [--flag]
 *
 * Every command prints ONE JSON object on stdout ({ok, …}); progress goes to stderr.
 * Exit code: 0 ok · 1 failed · 2 refused by a guard · 3 usage. `hint` says what to do next.
 * `npm run fvtt -- help` lists the commands. Read dev/agent/README.md before extending it.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  FILES, MODULE_ID, PROFILES, STATE_DIR, cdpUrl, defaultFoundryDataPath, installPaths, loadConfig,
  readJson, readMode, resolveProfile, writeJson
} from "./lib/config.mjs";
import { CliError, EXIT, errorResult, note, poll, print, refuse } from "./lib/output.mjs";
import { checkMode, COMMAND_CLASS } from "./lib/guards.mjs";
import { hasSecret, verifyAgainstDataPath } from "./lib/secret.mjs";
import { serverState, startServer, stopServer } from "./lib/server.mjs";
import { holders, lockExclusive, lockShared } from "./lib/mutex.mjs";
import { readLog } from "./lib/logs.mjs";
import { FoundryClient } from "./lib/foundry-http.mjs";
import { killTree } from "./lib/proc.mjs";
import { initSandbox } from "./lib/sandbox.mjs";
import { createWorld, deleteWorld, launchWorld, listWorlds, DEFAULT_MODULES, DEFAULT_PLAYERS } from "./lib/worlds.mjs";
import { seedFixture } from "./lib/fixtures.mjs";
import { runSuites, suiteNames } from "./lib/e2e.mjs";
import { agentWorldId } from "./lib/guards.mjs";
import { browserSession, browserVersion, evaluate, hardReload, waitGameReady } from "./lib/cdp.mjs";
import {
  disposeContexts, foundryPages, loginInContext, namedContext, rememberSessions, resolveUser, restoreSessions
} from "./lib/browser.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* ------------------------------------------------------------------------------------ */
/*  Arguments and context                                                               */
/* ------------------------------------------------------------------------------------ */

function parseArgs(argv) {
  const opts = { _: [] };
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) opts[m[1]] = m[2] ?? true;
    else opts._.push(a);
  }
  return opts;
}

function context(opts, { needProfile = true } = {}) {
  const cfg = loadConfig();
  const ctx = { cfg, install: installPaths(cfg), cdp: cdpUrl(cfg), mode: readMode(), opts };
  if (needProfile) ctx.profile = resolveProfile(cfg, opts.profile ?? "campaign");
  return ctx;
}

const seconds = (v, dflt) => (v === undefined || v === true ? dflt : Number(v) * 1000);

function guard(ctx, command, extra) {
  checkMode(ctx.mode, command, { profile: ctx.profile?.name, ...extra });
}

/** The page a browser-side command acts on: --page=<targetId prefix>, else the ready GM page. */
async function pickPage(ctx, browser, { requireGM = false } = {}) {
  const list = await foundryPages(ctx, browser);
  if (ctx.opts.page) {
    const p = list.find(x => x.targetId.startsWith(String(ctx.opts.page)));
    if (!p) throw new CliError(`No ${ctx.profile.name} Foundry page ${ctx.opts.page}.`, { code: "no-page", details: { pages: list.map(strip) } });
    return p;
  }
  const ready = list.filter(p => p.ready && p.userId);
  const pick = ready.find(p => p.isDefaultContext) ?? ready[0] ?? list.find(p => p.route?.endsWith("/game"));
  if (!pick) {
    throw new CliError(`No logged-in ${ctx.profile.name} Foundry page in Chrome.`, {
      code: "no-page", hint: "`npm run fvtt -- login` opens one (as the GM unless --user is given).",
      details: { pages: list.map(strip) }
    });
  }
  if (requireGM) {
    const isGM = await evaluate(browser, pick.targetId, "!!globalThis.game?.user?.isGM", { timeoutMs: 5000 }).catch(() => null);
    if (isGM === false) throw new CliError(`Page ${pick.targetId} is logged in as a player (${pick.userName}).`, { code: "not-gm", hint: "Use --page=<a GM page> or `fvtt login`." });
  }
  return pick;
}

const strip = p => ({ targetId: p.targetId, route: p.route, user: p.userName ?? null, ready: !!p.ready, defaultContext: p.isDefaultContext });

function runNode(script, args) {
  const t0 = Date.now();
  note(`node ${script} ${args.join(" ")}`);
  const res = spawnSync(process.execPath, [path.join(MODULE_ROOT, script), ...args], {
    cwd: MODULE_ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024
  });
  const tail = s => (s ?? "").trim().split(/\r?\n/).slice(-25);
  return { script, ok: res.status === 0, exit: res.status, ms: Date.now() - t0, stdout: tail(res.stdout), stderr: tail(res.stderr) };
}

/** Where a profile's copy of this module lives (campaign = this working tree). */
function moduleDirOf(ctx) {
  return path.join(ctx.profile.data, "modules", MODULE_ID);
}

/* ------------------------------------------------------------------------------------ */
/*  Commands                                                                            */
/* ------------------------------------------------------------------------------------ */

const COMMANDS = {};
const HELP = {};
function command(name, help, fn) {
  if (!COMMAND_CLASS[name]) throw new Error(`fvtt: add ${name} to guards.COMMAND_CLASS`);
  COMMANDS[name] = fn;
  HELP[name] = help;
}

command("init", "Create the local config.json/mode.json. --mcp-json=<path> --install-dir=<path> --campaign-world=<id> [--force]", async opts => {
  const existing = readJson(FILES.config);
  if (existing && !opts.force) return { ok: true, created: false, file: FILES.config, config: existing, hint: "Already initialised; --force rewrites it." };
  const installDir = opts["install-dir"] ?? existing?.installDir ?? "C:/Program Files/Foundry Virtual Tabletop";
  if (!fs.existsSync(path.join(installDir, "Foundry Virtual Tabletop.exe"))) {
    throw new CliError(`No Foundry Virtual Tabletop.exe in ${installDir}.`, { code: "usage", hint: "Pass --install-dir=<folder of the desktop app>." });
  }
  const campaignData = defaultFoundryDataPath();
  const worlds = fs.readdirSync(path.join(campaignData, "Data", "worlds"), { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith("agent-")).map(d => d.name);
  const world = opts["campaign-world"] ?? existing?.campaign?.world ?? (worlds.length === 1 ? worlds[0] : null);
  if (!world) throw new CliError(`Several worlds (${worlds.join(", ")}); pass --campaign-world=<id>.`, { code: "usage" });
  const cfg = {
    installDir: installDir.replaceAll("\\", "/"),
    campaign: { world },
    sandbox: { dataPath: path.join(STATE_DIR, "..", "FoundryVTT-Agent").replaceAll("\\", "/") },
    protectedWorlds: [...new Set([world, ...(existing?.protectedWorlds ?? [])])],
    cdp: { mcpJson: (opts["mcp-json"] ?? existing?.cdp?.mcpJson ?? null)?.replaceAll("\\", "/") ?? null }
  };
  writeJson(FILES.config, cfg);
  if (!fs.existsSync(FILES.mode)) writeJson(FILES.mode, { mode: "development", since: new Date().toISOString(), by: "fvtt init" });
  return { ok: true, created: true, file: FILES.config, config: cfg, mode: readMode(), cdpConfigured: Boolean(cdpUrl(cfg)) };
});

command("status", "Server state of a profile: /api/status, processes, held LevelDBs.", async opts => {
  const ctx = context(opts);
  const s = await serverState(ctx);
  return {
    ok: true, profile: ctx.profile.name, dataPath: ctx.profile.dataPath, mode: ctx.mode.mode,
    reachable: s.status.reachable, active: Boolean(s.status.active), world: s.status.world ?? null,
    foundry: s.status.version ?? null, system: s.status.system ? `${s.status.system} ${s.status.systemVersion}` : null,
    connectedUsers: s.status.users ?? null,
    servers: s.servers, heldDbs: s.held.length, held: s.held.slice(0, 10), mutex: holders(ctx.profile.name)
  };
});

command("doctor", "Everything at once: config, mode, secret, servers, Chrome, mutex, python, dirty files. --since=<minutes|ISO>", async opts => {
  const problems = [];
  const hints = [];
  const out = { ok: true, stateDir: STATE_DIR };
  let ctx;
  try {
    ctx = context(opts, { needProfile: false });
  } catch (err) {
    return { ok: false, problems: [err.message], hints: [err.hint] };
  }
  out.mode = ctx.mode;
  out.install = { dir: ctx.install.dir, exe: fs.existsSync(ctx.install.exe), headless: fs.existsSync(ctx.install.mainJs) };
  if (!out.install.exe) problems.push("Foundry desktop app not found at installDir.");

  out.secret = { stored: hasSecret() };
  if (!out.secret.stored) {
    problems.push("No stored admin password: stop/restart/login/world commands cannot authenticate.");
    hints.push("GM: run dev/agent/Set-AgentSecret.ps1 in your own terminal.");
  }

  out.profiles = {};
  for (const name of PROFILES) {
    let profile;
    try {
      profile = resolveProfile(ctx.cfg, name);
    } catch (err) {
      out.profiles[name] = { configured: false, note: err.message, hint: err.hint };
      continue;
    }
    const pctx = { ...ctx, profile };
    const s = await serverState(pctx);
    const locks = {};
    for (const [type, id] of [["modules", MODULE_ID], ["systems", "dnd5e"]]) {
      locks[id] = fs.existsSync(path.join(profile.data, type, id, `${id}.lock`));
    }
    const p = out.profiles[name] = {
      dataPath: profile.dataPath, reachable: s.status.reachable, active: Boolean(s.status.active),
      world: s.status.world ?? null, foundry: s.status.version ?? null,
      system: s.status.system ? `${s.status.system} ${s.status.systemVersion}` : null,
      connectedUsers: s.status.users ?? null, servers: s.servers,
      heldDbs: s.held.length, packageLocks: locks, mutex: holders(name)
    };
    if (out.secret.stored) {
      try {
        p.adminPassword = await verifyAgainstDataPath(profile.dataPath, ctx.install.app);
      } catch (err) {
        p.adminPassword = `error: ${err.message}`;
      }
      if (p.adminPassword === "mismatch") problems.push(`Stored admin password does not match ${name}'s Config/admin.txt.`);
    }
    if (name === "campaign" && (!locks[MODULE_ID] || !locks.dnd5e)) problems.push("Campaign package locks missing (D7): Update-all could overwrite the working tree or move dnd5e.");
    if (s.status.reachable && !s.servers.length) problems.push(`${name}: something answers on the port but no Foundry process was found for this data path.`);
    if (!s.status.reachable && s.held.length) problems.push(`${name}: server down but ${s.held.length} LevelDB(s) held — ${s.suspects.map(x => `${x.what} pid ${x.pid}`).join(", ") || "unknown holder"}.`);
    if (s.held.length && s.suspects.length) p.levelDbSuspects = s.suspects;
  }

  const v = await browserVersion(ctx.cdp);
  out.chrome = { configured: Boolean(ctx.cdp), up: Boolean(v), browser: v?.Browser ?? null };
  if (!ctx.cdp) problems.push("No Chrome DevTools endpoint configured (init --mcp-json).");
  else if (!v) {
    problems.push("Chrome DevTools port not answering.");
    hints.push("Human: start Chrome with remote debugging (the campaign vault's chrome-debug launcher). If it answers but chrome-devtools MCP still fails, reconnect it with /mcp — no Chrome restart needed.");
  } else {
    const browser = await browserSession(ctx.cdp);
    try {
      out.chrome.foundryPages = {};
      for (const name of PROFILES) {
        if (!out.profiles[name]?.dataPath) continue;
        const list = await foundryPages({ ...ctx, profile: resolveProfile(ctx.cfg, name) }, browser);
        out.chrome.foundryPages[name] = list.map(strip);
        if (out.profiles[name].active && list.length && !list.some(p => p.ready)) {
          hints.push(`${name}: Foundry tab not logged in — \`npm run fvtt -- login${name === "campaign" ? "" : " --profile=" + name}\`.`);
        }
      }
    } finally {
      browser.close();
    }
  }

  out.python = pythonCheck();
  if (out.python.python3IsStoreStub) hints.push("`python3` is the Windows Store stub here — call `python` (the vault .venv is first on PATH).");

  out.repo = dirtyFiles(opts.since);
  out.problems = problems;
  out.hints = hints;
  out.ok = problems.length === 0;
  return out;
});

function pythonCheck() {
  const where = name => (spawnSync("where.exe", [name], { encoding: "utf8", windowsHide: true }).stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
  const py = where("python");
  const py3 = where("python3");
  const version = (spawnSync("python", ["--version"], { encoding: "utf8", windowsHide: true }).stdout ?? "").trim();
  return { python: py[0] ?? null, version: version || null, python3: py3[0] ?? null, python3IsStoreStub: /WindowsApps/i.test(py3[0] ?? "") };
}

/** Working-tree changes with mtimes — lets an agent see what it did not write itself (§5 G). */
function dirtyFiles(since) {
  const res = spawnSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: MODULE_ROOT, encoding: "utf8", windowsHide: true });
  if (res.status !== 0) return { error: (res.stderr ?? "").trim() };
  let from = null;
  if (since) from = /^\d+$/.test(String(since)) ? Date.now() - Number(since) * 60_000 : Date.parse(since);
  const rows = res.stdout.split(/\r?\n/).filter(Boolean).map(line => {
    const file = line.slice(3).replace(/^"|"$/g, "");
    let mtime = null;
    try { mtime = fs.statSync(path.join(MODULE_ROOT, file)).mtimeMs; } catch { /* deleted */ }
    return { state: line.slice(0, 2).trim(), file, mtime };
  }).filter(r => !from || (r.mtime ?? Infinity) >= from);
  const packs = rows.filter(r => r.file.startsWith("packs/"));
  const other = rows.filter(r => !r.file.startsWith("packs/")).sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0));
  return {
    since: from ? new Date(from).toISOString() : null,
    packFiles: packs.length,
    files: other.slice(0, 15).map(r => ({ ...r, mtime: r.mtime ? new Date(r.mtime).toISOString() : null })),
    more: Math.max(0, other.length - 15)
  };
}

command("mode", "Show or set development/runtime (D2, D9). Set runtime only when the GM says so. --reason=<text>", async opts => {
  const want = opts._[0];
  if (!want) return { ok: true, ...readMode() };
  if (!["development", "runtime"].includes(want)) throw new CliError("mode is development or runtime.", { code: "usage" });
  const prev = readMode();
  const next = { mode: want, since: new Date().toISOString(), by: process.env.FVTT_AGENT ?? "fvtt mode", reason: opts.reason ?? null };
  writeJson(FILES.mode, next);
  return { ok: true, previous: prev.mode, ...next };
});

command("logs", "Server log tail. --since=<minutes|ISO> (default 60) --level=error|warn|info|debug --grep=<re> --limit=<n>", async opts => {
  const ctx = context(opts);
  const since = opts.since && !/^\d+$/.test(opts.since) ? new Date(opts.since) : new Date(Date.now() - Number(opts.since ?? 60) * 60_000);
  const entries = readLog(ctx.profile.logs, { since, level: opts.level ?? "info", grep: opts.grep, limit: Number(opts.limit ?? 200) });
  return { ok: true, profile: ctx.profile.name, since: since.toISOString(), count: entries.length, entries };
});

command("users", "Users of the running world (id, name, role) via the socket — no browser needed.", async opts => {
  const ctx = context(opts);
  return { ok: true, profile: ctx.profile.name, users: await new FoundryClient(ctx.profile).users() };
});

command("login", "Log Chrome into the running world as a user (D8). --user=<name|id> (default: the only GM) [--context=<name> isolated] [--page=<targetId>]", async opts => {
  const ctx = context(opts);
  const user = await resolveUser(ctx, opts.user);
  guard(ctx, "login", { loginRole: user.gm ? "gm" : "player" });
  const browser = await browserSession(ctx.cdp);
  try {
    let browserContextId = null;
    let targetIds = [];
    let urls = [];
    let contextName = "default";
    if (opts.page) {
      const p = await pickPage(ctx, browser);
      browserContextId = p.isDefaultContext ? null : p.context;
      targetIds = [p.targetId];
      urls = [p.url];
      contextName = p.isDefaultContext ? "default" : p.context;
    } else if (opts.context && opts.context !== "default") {
      contextName = String(opts.context);
      browserContextId = (await namedContext(browser, ctx.profile.name, contextName)).id;
      const inCtx = (await foundryPages(ctx, browser)).filter(p => p.context === browserContextId);
      targetIds = inCtx.map(p => p.targetId);
      urls = inCtx.map(p => p.url);
    } else {
      const inDefault = (await foundryPages(ctx, browser)).filter(p => p.isDefaultContext);
      targetIds = inDefault.map(p => p.targetId);
      urls = inDefault.map(p => p.url);
    }
    const res = await loginInContext(ctx, browser, { userId: user.id, browserContextId, targetIds, urls });
    return {
      ok: true, profile: ctx.profile.name, user: { id: user.id, name: user.name, gm: user.gm }, context: contextName,
      pages: res.pages, world: res.ready.world,
      hint: "chrome-devtools MCP: list_pages, then select_page on the page titled with this world."
    };
  } finally {
    browser.close();
  }
});

command("wait-ready", "Wait until a Foundry page has game.ready (+ module API). [--page=<targetId>] [--timeout=<s>]", async opts => {
  const ctx = context(opts);
  const browser = await browserSession(ctx.cdp);
  try {
    const p = await pickPage(ctx, browser);
    const ready = await waitGameReady(browser, p.targetId, { timeoutMs: seconds(opts.timeout, 120_000), extra: "!!g.neuroshima" });
    return { ok: true, profile: ctx.profile.name, targetId: p.targetId, ...ready };
  } finally {
    browser.close();
  }
});

command("reload", "Hard-reload a Foundry page (bypasses the ES module cache) and wait for ready. [--page=<targetId>]", async opts => {
  const ctx = context(opts);
  guard(ctx, "reload");
  const browser = await browserSession(ctx.cdp);
  try {
    const p = await pickPage(ctx, browser);
    await hardReload(browser, p.targetId);
    const ready = await waitGameReady(browser, p.targetId, { extra: "!!g.neuroshima" });
    return { ok: true, profile: ctx.profile.name, targetId: p.targetId, ...ready };
  } finally {
    browser.close();
  }
});

command("quench", "Run the module's Quench batches in a GM page. [--filter=<key part>] [--page=<targetId>] [--reload] [--timeout=<s>]", async opts => {
  const ctx = context(opts);
  guard(ctx, "quench");
  await lockShared(ctx.profile.name, "quench", seconds(opts.wait, 120_000));
  const browser = await browserSession(ctx.cdp);
  try {
    const p = await pickPage(ctx, browser, { requireGM: true });
    const extra = "!!(g.neuroshima?.tests && globalThis.quench)";
    const run = async () => {
      await waitGameReady(browser, p.targetId, { extra });
      return evaluate(browser, p.targetId, `game.neuroshima.tests.run(${JSON.stringify(String(opts.filter ?? ""))})`,
        { timeoutMs: seconds(opts.timeout, 15 * 60_000) });
    };
    if (opts.reload) await hardReload(browser, p.targetId);
    let summary;
    let reloaded = Boolean(opts.reload);
    try {
      summary = await run();
    } catch (err) {
      // A crashed previous run leaves mocha busy until F5 (scripts/tests/runner.mjs); one reload, once.
      if (reloaded || !/Mocha|zajęta/i.test(err.message)) throw err;
      note("mocha busy — hard reload and retry once");
      await hardReload(browser, p.targetId);
      reloaded = true;
      summary = await run();
    }
    return { ok: summary.failed === 0, profile: ctx.profile.name, targetId: p.targetId, reloaded, ...summary };
  } finally {
    browser.close();
  }
});

command("stop", "Stop a profile's server: world shutdown → /quit → kill only if stuck. [--force] (kill without a stored password)", async opts => {
  const ctx = context(opts);
  guard(ctx, "stop");
  await lockExclusive(ctx.profile.name, "stop", seconds(opts.wait, 0));
  return { ok: true, profile: ctx.profile.name, ...(await stopServer(ctx, { force: Boolean(opts.force) })) };
});

command("start", "Start a profile's server (desktop app, D3) behind the LevelDB interlock. [--world=<id>] [--headless] [--timeout=<s>]", async opts => {
  const ctx = context(opts);
  guard(ctx, "start");
  await lockExclusive(ctx.profile.name, "start", seconds(opts.wait, 0));
  const world = opts.world === true ? null : (opts.world ?? ctx.profile.defaultWorld);
  const res = await startServer(ctx, { world, headless: Boolean(opts.headless), timeoutMs: seconds(opts.timeout, 180_000) });
  return { ok: true, profile: ctx.profile.name, ...res, hint: "Browser tabs are logged out by any restart — `npm run fvtt -- login`." };
});

command("restart", "Stop and start the same world, then log every Foundry tab back in as its previous user (D8).", async opts => {
  const ctx = context(opts);
  guard(ctx, "restart");
  await lockExclusive(ctx.profile.name, "restart", seconds(opts.wait, 120_000));
  const before = await serverState(ctx);
  const world = opts.world ?? before.status.world ?? ctx.profile.defaultWorld;
  const remembered = await rememberSessions(ctx);
  const stop = await stopServer(ctx, { force: Boolean(opts.force) });
  const start = await startServer(ctx, { world, headless: Boolean(opts.headless) });
  const sessions = await restoreSessions(ctx, remembered);
  return { ok: sessions.every(s => s.ok), profile: ctx.profile.name, world, stop, start, sessions };
});

command("kill", "Kill a profile's Foundry process(es) — Foundry's executable only, never Chrome.", async opts => {
  const ctx = context(opts);
  guard(ctx, "kill");
  await lockExclusive(ctx.profile.name, "kill", seconds(opts.wait, 0));
  const s = await serverState(ctx);
  if (!s.servers.length) return { ok: true, profile: ctx.profile.name, killed: [], note: "No Foundry process for this data path." };
  return { ok: true, profile: ctx.profile.name, killed: s.servers.map(x => killTree(x.pid, ctx.install)) };
});

command("packs", "Rebuild compendium packs and come back: stop → build:packs → validate:packs → start same world → re-login tabs. [--only=a,b] [--skip-validate] [--start]", async opts => {
  const ctx = context(opts);
  guard(ctx, "packs");
  await lockExclusive(ctx.profile.name, "packs", seconds(opts.wait, 600_000));
  const t0 = Date.now();
  const before = await serverState(ctx);
  const wasRunning = before.status.reachable || before.servers.length > 0;
  const world = opts.world ?? before.status.world ?? ctx.profile.defaultWorld;
  const remembered = before.status.active ? await rememberSessions(ctx) : { contexts: [] };
  const stop = wasRunning ? await stopServer(ctx, { force: Boolean(opts.force) }) : null;

  const outArgs = ctx.profile.isCampaign ? [] : [`--out=${path.join(moduleDirOf(ctx), "packs")}`];
  const onlyArgs = opts.only && opts.only !== true ? [`--only=${opts.only}`] : [];
  const build = runNode("dev/packs/build-packs.mjs", [...onlyArgs, ...outArgs]);
  const validate = build.ok && !opts["skip-validate"] ? runNode("dev/packs/validate-packs.mjs", outArgs) : null;

  let start = null;
  let sessions = [];
  let startError = null;
  if (wasRunning || opts.start) {
    try {
      start = await startServer(ctx, { world });
      sessions = await restoreSessions(ctx, remembered);
    } catch (err) {
      startError = errorResult(err).result;
    }
  }
  const ok = build.ok && (validate?.ok ?? true) && !startError && sessions.every(s => s.ok);
  return {
    ok, profile: ctx.profile.name, world, ms: Date.now() - t0, stop, build, validate, start, startError, sessions,
    ...(ok ? {} : { hint: !build.ok ? "Build failed — packs may be partial; read build.stderr." : startError ? "Server did not come back — `fvtt logs --level=warn`." : undefined })
  };
});

command("sandbox:init", "Create/refresh the sandbox data path: own Config (free port), dnd5e copy, linked modules, packs built from the working tree. [--skip-packs]", async opts => {
  const cfg = loadConfig();
  const ctx = { cfg, install: installPaths(cfg), cdp: cdpUrl(cfg), mode: readMode(), opts };
  checkMode(ctx.mode, "sandbox:init");
  if (!cfg.sandbox?.dataPath) throw new CliError("config.json has no sandbox.dataPath.", { code: "usage", hint: "Re-run `fvtt init --force`." });
  await lockExclusive("sandbox", "sandbox:init", seconds(opts.wait, 0));
  const report = await initSandbox({
    campaignData: resolveProfile(cfg, "campaign").dataPath, sandboxData: path.resolve(cfg.sandbox.dataPath), moduleRoot: MODULE_ROOT,
    modules: cfg.sandbox.modules
  });
  ctx.profile = resolveProfile(cfg, "sandbox");
  let build = null;
  if (!opts["skip-packs"]) {
    const s = await serverState(ctx);
    if (s.status.reachable || s.servers.length) {
      build = { skipped: "sandbox server running — `fvtt packs --profile=sandbox` rebuilds with a restart" };
    } else {
      const out = [`--out=${path.join(moduleDirOf(ctx), "packs")}`];
      build = runNode("dev/packs/build-packs.mjs", out);
      if (build.ok) build.validate = runNode("dev/packs/validate-packs.mjs", out);
    }
  }
  return { ok: build?.ok !== false && build?.validate?.ok !== false, ...report, build };
});

const list = v => (v && v !== true ? String(v).split(",").map(s => s.trim()).filter(Boolean) : null);

command("world:list", "Worlds of a profile; agent=true marks fvtt-created sandbox worlds.", async opts => {
  const ctx = context({ profile: "sandbox", ...opts });
  const status = await new FoundryClient(ctx.profile).status();
  return { ok: true, profile: ctx.profile.name, active: status.active ? status.world : null, worlds: listWorlds(ctx) };
});

command("world:create", "Create + bootstrap a sandbox world agent-<slug>-<date>: modules on, players created. <slug> [--modules=a,b] [--players=a,b] [--fixture=<name>]", async opts => {
  const ctx = context({ profile: "sandbox", ...opts });
  guard(ctx, "world:create");
  const slug = opts._[0];
  if (!slug) throw new CliError("world:create needs a slug.", { code: "usage", hint: "e.g. `fvtt world:create granat`" });
  await lockExclusive(ctx.profile.name, "world:create", seconds(opts.wait, 120_000));
  const res = await createWorld(ctx, {
    slug, modules: list(opts.modules) ?? DEFAULT_MODULES, players: list(opts.players) ?? DEFAULT_PLAYERS,
    fixture: opts.fixture ?? null, startServer
  });
  const seeded = opts.fixture ? await seedFixture(ctx, { fixture: String(opts.fixture) }) : null;
  return { ok: true, profile: ctx.profile.name, ...res, seeded, hint: "`fvtt login --profile=sandbox --user=Gamemaster --context=gm`, then --user=\"Gracz 1\" --context=gracz1." };
});

command("world:seed", "Run a fixture (dev/e2e/fixtures/<name>.mjs) in a GM page of the running sandbox world. --fixture=<name>", async opts => {
  const ctx = context({ profile: "sandbox", ...opts });
  guard(ctx, "world:seed");
  if (!opts.fixture || opts.fixture === true) throw new CliError("--fixture=<name> is required.", { code: "usage" });
  return { ok: true, profile: ctx.profile.name, ...(await seedFixture(ctx, { fixture: String(opts.fixture) })) };
});

command("world:launch", "Launch a world on a profile's server (shuts down the current sandbox world). <id>", async opts => {
  const ctx = context({ profile: "sandbox", ...opts });
  guard(ctx, "world:launch");
  if (!opts._[0]) throw new CliError("world:launch needs a world id.", { code: "usage" });
  if (ctx.profile.isCampaign) throw refuse("Switching worlds on the campaign server is not a sandbox action.", "campaign", "Use `fvtt restart --world=<id>` deliberately.");
  await lockExclusive(ctx.profile.name, "world:launch", seconds(opts.wait, 120_000));
  return { ok: true, profile: ctx.profile.name, ...(await launchWorld(ctx, String(opts._[0]), { startServer })) };
});

command("world:delete", "Delete an fvtt-created sandbox world (§4 guards: agent- id, marker, not active, not protected, nothing held). <id> [--stop] (shut it down first if it is the running sandbox world)", async opts => {
  const ctx = context({ profile: "sandbox", ...opts });
  guard(ctx, "world:delete");
  const id = opts._[0] ? String(opts._[0]) : null;
  if (!id) throw new CliError("world:delete needs a world id.", { code: "usage" });
  await lockExclusive(ctx.profile.name, "world:delete", seconds(opts.wait, 120_000));
  const client = new FoundryClient(ctx.profile);
  const st = await client.status();
  let stopped = false;
  // Only ever shuts down the very world being deleted, only on a non-campaign profile, and only
  // when asked — the guards in deleteWorld still decide whether it may go.
  if (opts.stop && !ctx.profile.isCampaign && st.active && st.world === id && listWorlds(ctx).find(w => w.id === id)?.agent) {
    await client.shutdownWorld();
    await poll(async () => !(await client.status()).active, { timeoutMs: 30_000 });
    stopped = true;
  }
  const res = await deleteWorld(ctx, id);
  // Sessions die with the world; the isolated contexts fvtt opened for it are now dead tabs.
  const contextsClosed = ctx.profile.isCampaign ? [] : await disposeContexts(ctx);
  return { ok: true, profile: ctx.profile.name, stoppedFirst: stopped, ...res, contextsClosed };
});

command("e2e", "Layer 6: fresh sandbox world, GM + player clients, suites from dev/e2e/suites → logs/e2e/<run>/report.json. [--suites=a,b] [--keep] [--reuse]", async opts => {
  const ctx = context({ profile: "sandbox", ...opts });
  guard(ctx, "e2e");
  if (ctx.profile.isCampaign) throw refuse("e2e runs in the sandbox only.", "campaign");
  const suites = list(opts.suites) ?? suiteNames();
  if (!suites.length) throw new CliError("No suites in dev/e2e/suites.", { code: "usage" });
  await lockExclusive(ctx.profile.name, "e2e", seconds(opts.wait, 300_000));
  const id = agentWorldId("e2e");
  const client = new FoundryClient(ctx.profile);
  const st = await client.status();
  const exists = listWorlds(ctx).find(w => w.id === id);
  if (!(opts.reuse && exists && st.active && st.world === id)) {
    if (exists?.agent) {
      if (st.active && st.world === id) {
        await client.shutdownWorld();
        await poll(async () => !(await client.status()).active, { timeoutMs: 30_000 });
      }
      await deleteWorld(ctx, id);
      await disposeContexts(ctx);
    }
    await createWorld(ctx, { slug: "e2e", startServer });
  }
  const report = await runSuites(ctx, { suites, world: id });
  let cleanup = null;
  if (report.ok && !opts.keep) {
    await client.shutdownWorld();
    await poll(async () => !(await client.status()).active, { timeoutMs: 30_000 });
    cleanup = { world: (await deleteWorld(ctx, id)).deleted, contexts: await disposeContexts(ctx) };
  }
  return {
    ok: report.ok, world: id, kept: !cleanup, report: report.reportFile,
    suites: report.suites.map(s => ({
      name: s.name, ok: s.ok, ms: s.ms, failedStep: s.steps.find(x => !x.ok)?.label ?? null,
      error: s.error?.message ?? null, consoleErrors: Object.fromEntries(Object.entries(s.consoleErrors).map(([k, v]) => [k, v.length])),
      screenshots: s.screenshots.length
    })),
    ...(report.ok ? {} : { hint: "World and tabs kept for inspection; read the report, look at the screenshots. `fvtt e2e --reuse` reruns without recreating." })
  };
});

command("help", "This list.", async () => ({ ok: true, usage: "npm run fvtt -- <command> [--profile=campaign|sandbox] [--key=value]", commands: HELP }));

/* ------------------------------------------------------------------------------------ */

async function main() {
  const [name, ...rest] = process.argv.slice(2);
  const fn = COMMANDS[name ?? "help"];
  if (!fn) {
    print({ ok: false, error: `Unknown command "${name}".`, code: "usage", commands: Object.keys(COMMANDS) });
    process.exitCode = EXIT.usage;
    return;
  }
  try {
    const result = await fn(parseArgs(rest));
    print(result);
    process.exitCode = result.ok === false ? EXIT.failed : EXIT.ok;
  } catch (err) {
    const { result, exit } = errorResult(err);
    print(result);
    process.exitCode = exit;
  }
}

await main();
