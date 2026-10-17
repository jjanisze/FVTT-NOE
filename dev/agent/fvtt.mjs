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
  FILES, MODULE_ID, POLIGON_WORLD, PROFILES, STATE_DIR, cdpUrl, defaultFoundryDataPath, defaultProfileName, installPaths, loadConfig,
  profileDataPath, readFreeze, readJson, readMode, readServerOptions, resolveProfile, writeJson
} from "./lib/config.mjs";
import { CliError, EXIT, errorResult, note, print, refuse } from "./lib/output.mjs";
import { checkCloneTarget, checkFreeze, checkMode, checkQuiet, checkSandboxOnly, checkSystemInstall, COMMAND_CLASS } from "./lib/guards.mjs";
import { defaultWorlds, runBackup } from "./lib/backup.mjs";
import { checkSystemFolder, installPackage, installSystem, olderThan, packageVersion, resolveSource } from "./lib/systems.mjs";
import { hasSecret, verifyAgainstDataPath } from "./lib/secret.mjs";
import { serverState, startServer, stopServer } from "./lib/server.mjs";
import { holders, lockExclusive, lockShared } from "./lib/mutex.mjs";
import { readLog } from "./lib/logs.mjs";
import { FoundryClient } from "./lib/foundry-http.mjs";
import { debugChrome, killTree } from "./lib/proc.mjs";
import { heldDatabases } from "./lib/leveldb.mjs";
import { initSandbox, relinkPackage } from "./lib/sandbox.mjs";
import { bootstrapWorld, createWorld, deleteWorld, launchWorld, listWorlds, shutdownWorldAndWait, DEFAULT_MODULES, DEFAULT_PLAYERS } from "./lib/worlds.mjs";
import {
  callPoligon, campaignModules, cloneCampaign, guardHumans, mirrorCampaignSettings, openSeat, readCloneMarker, poligonExists, poligonGmPage, presence, readPoligonMarker,
  requireRunningPoligon, writeLoader, writeStamp, POLIGON_GM, POLIGON_MARKER, POLIGON_PLAYERS, seatName
} from "./lib/poligon.mjs";
import { seedFixture } from "./lib/fixtures.mjs";
import { runE2E, suiteNames } from "./lib/e2e.mjs";
import { browserSession, browserVersion, evaluate, hardReload, waitGameReady, withConsole } from "./lib/cdp.mjs";
import { DEEP_STACKS, parseCompatWarning, summariseCompat } from "./lib/compat.mjs";
import {
  disposeContexts, duplicateSessions, foundryPages, loginInContext, namedContext, rememberSessions, resolveUser, restoreSessions
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
  const freeze = readFreeze();
  const ctx = { cfg, install: installPaths(cfg), cdp: cdpUrl(cfg), mode: readMode(), freeze, opts };
  if (needProfile) {
    if (!opts.profile && freeze.frozen) note(`campaign frozen until ${freeze.until ?? "the switch-over"} — this addresses the sandbox (--profile=… for another)`);
    ctx.profile = resolveProfile(cfg, opts.profile ?? defaultProfileName(freeze));
  }
  return ctx;
}

const seconds = (v, dflt) => (v === undefined || v === true ? dflt : Number(v) * 1000);

function guard(ctx, command, extra) {
  checkMode(ctx.mode, command, { profile: ctx.profile?.name, ...extra });
  checkFreeze(ctx.freeze, command, ctx.profile?.name);
  checkSandboxOnly(command, ctx.profile?.name);
}

/**
 * The page a browser-side command acts on: --page=<targetId prefix>, else a ready page — logged in
 * as `user` when given, a GM page when `requireGM` (with player contexts open, the first ready page
 * used to be a player's and quench refused; Codex field test 2026-10-05) — default context first.
 */
async function pickPage(ctx, browser, { requireGM = false, user = null } = {}) {
  const list = await foundryPages(ctx, browser);
  if (ctx.opts.page) {
    const p = list.find(x => x.targetId.startsWith(String(ctx.opts.page)));
    if (!p) throw new CliError(`No ${ctx.profile.name} Foundry page ${ctx.opts.page}.`, { code: "no-page", details: { pages: list.map(strip) } });
    return p;
  }
  let candidates = list.filter(p => p.ready && p.userId);
  if (user) {
    const w = String(user).toLowerCase();
    candidates = candidates.filter(p => p.userId === user || p.userName?.toLowerCase() === w);
    if (!candidates.length) {
      throw new CliError(`No ready ${ctx.profile.name} page logged in as ${user}.`, {
        code: "no-page", hint: `\`npm run fvtt -- login --user="${user}" --context=<name>\` opens one.`, details: { pages: list.map(strip) }
      });
    }
  }
  if (requireGM && candidates.length) {
    const gm = [];
    for (const p of candidates) {
      if (await evaluate(browser, p.targetId, "!!globalThis.game?.user?.isGM", { timeoutMs: 5000 }).catch(() => false)) gm.push(p);
    }
    if (!gm.length) {
      throw new CliError(`Every logged-in ${ctx.profile.name} page is a player (${candidates.map(p => p.userName).join(", ")}).`, {
        code: "not-gm", hint: "Use --page=<a GM page> or `fvtt login`."
      });
    }
    candidates = gm;
  }
  const pick = candidates.find(p => p.isDefaultContext) ?? candidates[0] ?? (user ? null : list.find(p => p.route?.endsWith("/game")));
  if (!pick) {
    throw new CliError(`No logged-in ${ctx.profile.name} Foundry page in Chrome.`, {
      code: "no-page", hint: "`npm run fvtt -- login` opens one (as the GM unless --user is given).",
      details: { pages: list.map(strip) }
    });
  }
  return pick;
}

/** Warnings for a Quench/eval run in `page`: the same user in other tabs, another GM active. */
async function clientWarnings(ctx, browser, page) {
  const warnings = [];
  const dup = duplicateSessions(await foundryPages(ctx, browser)).find(d => d.userId === page.userId);
  if (dup) warnings.push(`${dup.userName} is logged in from ${dup.pages.length} tabs — every active-GM automation runs once per tab, so documents can be created twice.`);
  const gm = await evaluate(browser, page.targetId, "({ isGM: game.user.isGM, active: game.users.activeGM?.name ?? null, self: game.users.activeGM?.isSelf ?? false })", { timeoutMs: 5000 }).catch(() => null);
  if (gm?.isGM && !gm.self && gm.active) {
    warnings.push(`${gm.active} is the active GM, not this tab: hooks that run only on the active GM run in their browser, and batches that depend on them can go red for that reason alone. The sandbox (\`fvtt e2e --quench\`) is single-GM.`);
  }
  return warnings;
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

command("init", "Create the local config.json/mode.json. --mcp-json=<path> --install-dir=<path> --campaign-world=<id> [--force]; on an existing config, set one entry: --dnd5e-source=<release zip|unpacked folder> --backup-dir=<folder>", async opts => {
  const existing = readJson(FILES.config);
  // Single entries merge into an existing config; nothing else in it changes.
  const updates = {};
  if (typeof opts["dnd5e-source"] === "string") {
    const src = resolveSource(opts["dnd5e-source"]);
    if (src.kind === "folder") checkSystemFolder(src.path, "dnd5e");
    updates.dnd5e = { ...(existing?.dnd5e ?? {}), source: src.path.replaceAll("\\", "/") };
  }
  if (typeof opts["backup-dir"] === "string") {
    if (!fs.existsSync(opts["backup-dir"])) throw new CliError(`${opts["backup-dir"]} does not exist.`, { code: "usage", hint: "Create the folder (or connect the drive) first." });
    updates.backup = { ...(existing?.backup ?? {}), dir: path.resolve(opts["backup-dir"]).replaceAll("\\", "/") };
  }
  if (existing && !opts.force) {
    if (!Object.keys(updates).length) return { ok: true, created: false, file: FILES.config, config: existing, hint: "Already initialised; --force rewrites it." };
    const merged = { ...existing, ...updates };
    writeJson(FILES.config, merged);
    return { ok: true, created: false, updated: Object.keys(updates), file: FILES.config, config: merged };
  }
  const installDir = opts["install-dir"] ?? existing?.installDir ?? "C:/Program Files/Foundry Virtual Tabletop";
  if (!fs.existsSync(path.join(installDir, "Foundry Virtual Tabletop.exe"))) {
    throw new CliError(`No Foundry Virtual Tabletop.exe in ${installDir}.`, { code: "usage", hint: "Pass --install-dir=<folder of the desktop app>." });
  }
  const campaignData = defaultFoundryDataPath();
  const worlds = fs.readdirSync(path.join(campaignData, "Data", "worlds"), { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith("agent-")).map(d => d.name);
  const world = opts["campaign-world"] ?? existing?.campaign?.world ?? (worlds.length === 1 ? worlds[0] : null);
  if (!world) throw new CliError(`Several worlds (${worlds.join(", ")}); pass --campaign-world=<id>.`, { code: "usage" });
  // --force rewrites what init owns and keeps the rest (loginUser, other profiles' sections, sources).
  const cfg = {
    ...(existing ?? {}),
    installDir: installDir.replaceAll("\\", "/"),
    campaign: { ...(existing?.campaign ?? {}), world },
    sandbox: { ...(existing?.sandbox ?? {}), dataPath: existing?.sandbox?.dataPath ?? path.join(STATE_DIR, "..", "FoundryVTT-Agent").replaceAll("\\", "/") },
    protectedWorlds: [...new Set([world, ...(existing?.protectedWorlds ?? [])])],
    cdp: { ...(existing?.cdp ?? {}), mcpJson: (opts["mcp-json"] ?? existing?.cdp?.mcpJson ?? null)?.replaceAll("\\", "/") ?? null },
    ...updates
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
  out.freeze = ctx.freeze;
  const release = readJson(path.join(ctx.install.app, "package.json"))?.release ?? {};
  out.install = { dir: ctx.install.dir, exe: fs.existsSync(ctx.install.exe), headless: fs.existsSync(ctx.install.mainJs), foundry: release.build ? `${release.generation}.${release.build}` : null };
  if (!out.install.exe) problems.push("Foundry desktop app not found at installDir.");
  // What the working tree's module.json asks of every data path (the migration moves both, PLAN_migracja_dnd5e6.md).
  const wanted = requirements(readJson(path.join(MODULE_ROOT, "module.json")));
  out.moduleRequires = wanted;
  if (wanted.foundry.minimum && out.install.foundry && olderThan(out.install.foundry, wanted.foundry.minimum)) {
    problems.push(`Foundry ${out.install.foundry} is older than module.json's minimum ${wanted.foundry.minimum}.`);
  }

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
      // On disk, whether or not a server runs: what the next start of this data path gets.
      installed: { dnd5e: packageVersion(path.join(profile.data, "systems", "dnd5e")), module: packageVersion(path.join(profile.data, "modules", MODULE_ID), "module.json") },
      connectedUsers: s.status.users ?? null, servers: s.servers,
      heldDbs: s.held.length, packageLocks: locks, mutex: holders(name)
    };
    // Linked data paths carry a copy of module.json (sandbox:init / poligon:init write it); a stale copy loads the
    // module with yesterday's compatibility, packs and scripts.
    if (name === "sandbox" || name === "poligon") {
      const copy = path.join(profile.data, "modules", MODULE_ID, "module.json");
      const tree = path.join(MODULE_ROOT, "module.json");
      const same = fs.existsSync(copy) && fs.readFileSync(copy, "utf8").replace(/\r\n/g, "\n") === fs.readFileSync(tree, "utf8").replace(/\r\n/g, "\n");
      p.moduleJsonCurrent = same;
      if (!same) hints.push(`${name}: its copy of module.json differs from the working tree's — \`npm run fvtt -- ${name === "poligon" ? "poligon:init --skip-packs" : "sandbox:init --skip-packs"}\` refreshes it${name === "poligon" ? " (the GM's ground: with their OK while they are in it)" : ""}.`);
    }
    const frozenCampaign = name === "campaign" && ctx.freeze.frozen;
    if (frozenCampaign && s.status.reachable) problems.push(`campaign: a server runs during the freeze (until ${ctx.freeze.until ?? "the switch-over"}) — nobody should open the campaign before then.`);
    if (p.installed.dnd5e && wanted.dnd5e.minimum && olderThan(p.installed.dnd5e, wanted.dnd5e.minimum)) {
      const line = `${name}: dnd5e ${p.installed.dnd5e} is older than module.json's minimum ${wanted.dnd5e.minimum}`;
      if (frozenCampaign) p.note = `${line} — expected while frozen (switch-over in ${ctx.freeze.until ?? "E11"}).`;
      else {
        problems.push(`${line}.`);
        hints.push(`${name}: \`npm run fvtt -- system:install --profile=${name}\` (server stopped) installs the configured dnd5e source.`);
      }
    }
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
    // Suspects matter only when nobody serves the data path and something still holds a DB; while
    // the server runs, the held DBs are its own and every idle foundry-mcp is noise (field test).
    if (!s.status.reachable && s.held.length) {
      problems.push(`${name}: server down but ${s.held.length} LevelDB(s) held — ${s.suspects.map(x => `${x.what} pid ${x.pid}`).join(", ") || "unknown holder"}.`);
      p.levelDbSuspects = s.suspects;
    }
    out.dbProcesses ??= summariseDbProcesses(s.suspects);
  }

  const v = await browserVersion(ctx.cdp);
  out.chrome = { configured: Boolean(ctx.cdp), up: Boolean(v), browser: v?.Browser ?? null };
  if (!ctx.cdp) problems.push("No Chrome DevTools endpoint configured (init --mcp-json).");
  else if (!v) {
    problems.push("Chrome DevTools port not answering.");
    hints.push("Human: start Chrome with remote debugging (the campaign vault's chrome-debug launcher). If it answers but chrome-devtools MCP still fails, reconnect it with /mcp — no Chrome restart needed.");
  } else {
    const dc = (() => { try { return debugChrome(); } catch { return null; } })();
    out.chrome.noThrottle = dc ? dc.missing.length === 0 : null;
    if (dc?.missing.length) {
      problems.push(`Chrome runs without ${dc.missing.join(" ")} — agent test windows behind other windows are throttled as hidden (e2e steps 3–30× slower, spurious core errors).`);
      hints.push("Close Chrome and start it with the campaign vault's chrome-debug launcher, which adds the flags (TESTING.md, warstwa 6).");
    }
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
        for (const d of duplicateSessions(list)) {
          problems.push(`${name}: ${d.userName} is logged in from ${d.pages.length} tabs (${d.pages.map(x => x.targetId.slice(0, 8)).join(", ")}) — every active-GM automation runs once per tab.`);
          hints.push(`${name}: close all but one of ${d.userName}'s tabs (chrome-devtools close_page); world:create/e2e dispose fvtt's own contexts.`);
        }
        if (name === "campaign" && out.profiles.campaign?.active) {
          const page = list.find(p => p.ready);
          if (page) {
            const found = await evaluate(browser, page.targetId, CAMPAIGN_HYGIENE, { timeoutMs: 10_000 }).catch(err => ({ error: err.message }));
            out.campaignHygiene = Array.isArray(found) ? { testDocuments: found.length, found: found.slice(0, 20) } : found;
            if (Array.isArray(found) && found.length) {
              problems.push(`campaign: ${found.length} test-looking document(s) in the campaign world (${found.slice(0, 3).join("; ")}${found.length > 3 ? " …" : ""}) — testing happens on the Poligon.`);
              hints.push("Ask the GM before removing anything from the campaign; export first (PLAN_human_testing.md §8).");
            }
          }
        }
      }
    } finally {
      browser.close();
    }
  }

  out.poligon = poligonDoctor(ctx, out.profiles.poligon);
  if (out.poligon.packsStale) hints.push(`poligon: packs older than ${out.poligon.stamp.packs.newestSource} — \`npm run fvtt -- packs --profile=poligon\` (with the GM's OK while they are in it).`);

  out.python = pythonCheck();
  if (out.python.python3IsStoreStub) hints.push("`python3` is the Windows Store stub here — call `python` (the vault .venv is first on PATH).");

  out.repo = dirtyFiles(opts.since);
  out.problems = problems;
  out.hints = hints;
  out.ok = problems.length === 0;
  return out;
});

/**
 * §8 hygiene (H7): test-looking documents in the campaign world are a problem, target 0. Read-only;
 * runs in a ready campaign page. Names `TEST*`, `__*`, `[Quench]*`, `Agent ·*`, the `Testowe` folder,
 * and anything carrying the module's `testScene` / `fixture` / `poligon` flags.
 */
const CAMPAIGN_HYGIENE = `(() => {
  const MOD = ${JSON.stringify(MODULE_ID)};
  const named = n => /^(TEST|__|\\[Quench\\]|Agent ·|\\[POLIGON\\])/i.test(String(n ?? "")) || n === "Testowe";
  const flagged = d => { const f = d.flags?.[MOD] ?? {}; return Boolean(f.testScene || f.fixture || f.poligon); };
  const out = [];
  for (const [kind, coll] of [["Actor", game.actors], ["Item", game.items], ["Scene", game.scenes], ["JournalEntry", game.journal],
    ["Folder", game.folders], ["RollTable", game.tables], ["Macro", game.macros], ["Playlist", game.playlists]]) {
    for (const d of coll ?? []) if (named(d.name) || flagged(d)) out.push(kind + ": " + d.name);
  }
  return out;
})()`;

/** Foundry and dnd5e versions module.json declares. */
function requirements(manifest) {
  const sys = manifest?.relationships?.systems?.find(s => s.id === "dnd5e")?.compatibility ?? {};
  const core = manifest?.compatibility ?? {};
  return { foundry: { minimum: core.minimum ?? null, verified: core.verified ?? null }, dnd5e: { minimum: sys.minimum ?? null, verified: sys.verified ?? null } };
}

/** The Poligon's line in `doctor`: initialised? world, marker, the freshness stamp. */
function poligonDoctor(ctx, profileState) {
  if (!profileState?.dataPath) return { initialised: false, hint: "`npm run fvtt -- poligon:init` sets it up (PLAN_human_testing.md)." };
  const pctx = { ...ctx, profile: resolveProfile(ctx.cfg, "poligon") };
  const stamp = readJson(path.join(pctx.profile.data, "agent-poligon-state", "stamp.json"));
  return {
    initialised: poligonExists(pctx), marker: readPoligonMarker(pctx), running: profileState.active && profileState.world === POLIGON_WORLD,
    klon: readCloneMarker(pctx, ctx.cfg.campaign?.world) ?? null, klonRunning: Boolean(profileState.active && profileState.world === ctx.cfg.campaign?.world),
    connectedUsers: profileState.connectedUsers ?? null, stamp, packsStale: Boolean(stamp?.packs?.stale),
    loaderJunction: fs.existsSync(path.join(pctx.profile.data, "agent-poligon"))
  };
}

function pythonCheck() {
  const where = name => (spawnSync("where.exe", [name], { encoding: "utf8", windowsHide: true }).stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
  const py = where("python");
  const py3 = where("python3");
  const version = (spawnSync("python", ["--version"], { encoding: "utf8", windowsHide: true }).stdout ?? "").trim();
  return { python: py[0] ?? null, version: version || null, python3: py3[0] ?? null, python3IsStoreStub: /WindowsApps/i.test(py3[0] ?? "") };
}

/** foundry-mcp / build-packs processes, counted: one per ended agent session piles up, harmlessly. */
function summariseDbProcesses(suspects) {
  if (!suspects.length) return null;
  const count = {};
  for (const s of suspects) count[s.what] = (count[s.what] ?? 0) + 1;
  const oldest = suspects.map(s => s.created).filter(Boolean).sort()[0] ?? null;
  return { count, oldest, note: "Idle unless a server is down with DBs held (then they are listed as suspects there)." };
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
  // By folder first: 306 dirty files of one icon batch buried everything else (field test).
  const byDir = {};
  for (const r of other) {
    const dir = r.file.includes("/") ? r.file.split("/").slice(0, 2).join("/").replace(/\/[^/]*\.[^/]*$/, "") : ".";
    byDir[dir] = (byDir[dir] ?? 0) + 1;
  }
  return {
    since: from ? new Date(from).toISOString() : null,
    packFiles: packs.length,
    total: other.length,
    byDir: Object.fromEntries(Object.entries(byDir).sort((a, b) => b[1] - a[1])),
    newest: other.slice(0, 10).map(r => ({ ...r, mtime: r.mtime ? new Date(r.mtime).toISOString() : null }))
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

command("freeze", "Show, set or lift the campaign freeze (PLAN_migracja_dnd5e6.md D2): `on [--reason=<text>] [--until=<stage>]` | `off` — off only on the GM's word.", async opts => {
  const want = opts._[0];
  const prev = readFreeze();
  if (!want) return { ok: true, ...prev, defaultProfile: defaultProfileName(prev) };
  if (!["on", "off"].includes(want)) throw new CliError("freeze is `on` or `off`.", { code: "usage" });
  const next = want === "on"
    ? { frozen: true, since: new Date().toISOString(), by: process.env.FVTT_AGENT ?? "fvtt freeze", reason: opts.reason ?? prev.reason ?? null, until: opts.until ?? prev.until ?? null }
    : { frozen: false, since: new Date().toISOString(), by: process.env.FVTT_AGENT ?? "fvtt freeze", reason: opts.reason ?? null, previous: prev.frozen ? prev : null };
  writeJson(FILES.freeze, next);
  return {
    ok: true, ...next, defaultProfile: defaultProfileName(next),
    hint: next.frozen
      ? "The campaign world is not started by fvtt now; commands without --profile address the sandbox. The dnd5e package lock on the campaign path stops Foundry's Update all."
      : "The campaign is the default profile again."
  };
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
  // The Poligon's GM is "Gamemaster" (its world has no MCP user), and its logins never use Chrome's
  // default context: the session cookie is per host, not per port, so it would log the campaign tab out.
  if (ctx.profile.name === "poligon" && !opts.user) opts.user = POLIGON_GM;
  const user = await resolveUser(ctx, opts.user);
  guard(ctx, "login", { loginRole: user.gm ? "gm" : "player" });
  if (ctx.profile.name === "poligon" && !opts.page && (!opts.context || opts.context === "default")) {
    const browser = await browserSession(ctx.cdp);
    try {
      const seat = await openSeat(ctx, browser, user.name);
      return { ok: true, profile: ctx.profile.name, user: { id: user.id, name: user.name, gm: user.gm }, context: seat.context, pages: [seat.page],
        hint: "Poligon seats are isolated browser windows (own cookies), so the campaign tab stays logged in." };
    } finally {
      browser.close();
    }
  }
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
      const all = await foundryPages(ctx, browser);
      const inDefault = all.filter(p => p.isDefaultContext);
      // No default-context tab: re-use a tab that already shows this user, or a dead one in a context
      // fvtt made, before opening a new one — a fresh tab next to a stale isolated one became two
      // clients of the same GM once the stale one woke up (field test 2026-10-07).
      const reuse = inDefault.length ? null
        : all.find(p => p.userId === user.id) ?? all.find(p => !p.ready && !p.isDefaultContext);
      if (reuse) {
        browserContextId = reuse.isDefaultContext ? null : reuse.context;
        contextName = reuse.isDefaultContext ? "default" : `existing ${reuse.context.slice(0, 8)}`;
        targetIds = [reuse.targetId];
        urls = [reuse.url];
      } else {
        targetIds = inDefault.map(p => p.targetId);
        urls = inDefault.map(p => p.url);
      }
    }
    const res = await loginInContext(ctx, browser, { userId: user.id, browserContextId, targetIds, urls });
    const dup = duplicateSessions(await foundryPages(ctx, browser)).find(d => d.userId === user.id);
    return {
      ok: true, profile: ctx.profile.name, user: { id: user.id, name: user.name, gm: user.gm }, context: contextName,
      pages: res.pages, world: res.ready.world,
      ...(dup ? {
        warning: `${user.name} is now logged in from ${dup.pages.length} tabs: ${dup.pages.map(p => p.targetId.slice(0, 8)).join(", ")} — active-GM automation runs once per tab.`,
        hint: "Close the extra tab (chrome-devtools close_page), or log it in as another user."
      } : { hint: "chrome-devtools MCP: list_pages, then select_page on the page titled with this world." })
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

command("eval", "Run JavaScript in a Foundry page, print its JSON result. --expr=<expression> | --file=<path> (async function body: `return` the value, `args` = --args JSON) [--user=<name>] [--page=<targetId>] [--timeout=<s>]", async opts => {
  const ctx = context(opts);
  guard(ctx, "eval");
  let body;
  if (typeof opts.expr === "string") body = `return (${opts.expr});`;
  else if (typeof opts.file === "string") body = fs.readFileSync(path.resolve(opts.file), "utf8");
  else throw new CliError("eval needs --expr=<expression> or --file=<path>.", { code: "usage", hint: "e.g. `fvtt eval --profile=sandbox --user=\"Gracz 1\" --expr=\"game.user.character?.name\"`" });
  let args = null;
  if (typeof opts.args === "string") {
    try { args = JSON.parse(opts.args); } catch (err) { throw new CliError(`--args is not JSON: ${err.message}`, { code: "usage" }); }
  }
  const browser = await browserSession(ctx.cdp);
  try {
    const p = await pickPage(ctx, browser, { user: typeof opts.user === "string" ? opts.user : null });
    await waitGameReady(browser, p.targetId, { timeoutMs: 60_000 });
    const t0 = Date.now();
    // Documents and applications cannot cross by value ("Object reference chain is too long"):
    // their identity does.
    const expression = `(async () => {
      const v = await (async (args) => {\n${body}\n})(${JSON.stringify(args)});
      if (v && typeof v === "object" && v.documentName) return { documentName: v.documentName, id: v.id, uuid: v.uuid };
      if (v instanceof foundry.applications.api.ApplicationV2) return { application: v.constructor.name, id: v.id };
      return v;
    })()`;
    const value = await evaluate(browser, p.targetId, expression, { timeoutMs: seconds(opts.timeout, 60_000) });
    return { ok: true, profile: ctx.profile.name, targetId: p.targetId, user: p.userName ?? null, ms: Date.now() - t0, value: value ?? null };
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
    let warnings = [];
    const run = async () => {
      await waitGameReady(browser, p.targetId, { extra });
      warnings = await clientWarnings(ctx, browser, p);
      for (const w of warnings) note(`warning: ${w}`);
      return evaluate(browser, p.targetId, `game.neuroshima.tests.run(${JSON.stringify(String(opts.filter ?? ""))})`,
        { timeoutMs: seconds(opts.timeout, 15 * 60_000) });
    };
    if (opts.reload) await hardReload(browser, p.targetId);
    let summary;
    let reloaded = Boolean(opts.reload);
    // Compatibility warnings the page logs — from its load (replayed) and from the batches (E0, reported only).
    const compat = [];
    await withConsole(browser, p.targetId, m => { const w = parseCompatWarning(m.type, m.args); if (w) compat.push(w); }, async () => {
      await evaluate(browser, p.targetId, DEEP_STACKS).catch(() => {});
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
    });
    const c = summariseCompat(compat);
    return {
      ok: summary.failed === 0, profile: ctx.profile.name, targetId: p.targetId, reloaded, ...(warnings.length ? { warnings } : {}), ...summary,
      compat: { total: c.total, byCaller: c.byCaller, module: c.unique.filter(w => w.caller === "module").slice(0, 30) }
    };
  } finally {
    browser.close();
  }
});

command("stop", "Stop a profile's server: world shutdown → /quit → kill only if stuck. [--force] (kill without a stored password)", async opts => {
  const ctx = context(opts);
  guard(ctx, "stop");
  await guardHumans(ctx, { force: Boolean(opts.force) });
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
  await guardHumans(ctx, { force: Boolean(opts.force) });
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
  await guardHumans(ctx, { force: Boolean(opts.force) });
  await lockExclusive(ctx.profile.name, "kill", seconds(opts.wait, 0));
  const s = await serverState(ctx);
  if (!s.servers.length) return { ok: true, profile: ctx.profile.name, killed: [], note: "No Foundry process for this data path." };
  return { ok: true, profile: ctx.profile.name, killed: s.servers.map(x => killTree(x.pid, ctx.install)) };
});

command("packs", "Rebuild compendium packs and come back: stop → build:packs → validate:packs → start same world → re-login tabs. [--only=a,b] [--skip-validate] [--start]", async opts => {
  const ctx = context(opts);
  guard(ctx, "packs");
  await guardHumans(ctx, { force: Boolean(opts.force) });
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
  if (ctx.profile.name === "poligon") writeStamp(ctx, MODULE_ROOT); // the panel's Świeżość reads it
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
    modules: cfg.sandbox.modules, dnd5eSource: cfg.dnd5e?.source ?? null
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

command("backup", "Full backup of a stopped data path: world(s), dnd5e, third-party modules, Data/assets, options.json → <backup dir>/<date>_<profile>[-<reason>]/ with manifest, SHA256SUMS, restore check. --profile=<p> (required) [--world=a,b] [--reason=<word>] [--dest=<dir>] (default: config backup.dir) [--app] (also the Foundry install)", async opts => {
  if (!opts.profile || opts.profile === true) throw new CliError("backup needs an explicit --profile.", { code: "usage", hint: "e.g. `fvtt backup --profile=campaign --reason=przed-e11`." });
  const ctx = context(opts);
  guard(ctx, "backup");
  await lockExclusive(ctx.profile.name, "backup", seconds(opts.wait, 0));
  const s = await serverState(ctx);
  checkQuiet({ status: s.status, servers: s.servers, held: s.held }, "a backup needs every database closed");
  return {
    profile: ctx.profile.name,
    ...(await runBackup({
      profile: ctx.profile, install: ctx.install, root: typeof opts.dest === "string" ? opts.dest : ctx.cfg.backup?.dir,
      worlds: list(opts.world) ?? defaultWorlds(ctx.profile, ctx.cfg), reason: typeof opts.reason === "string" ? opts.reason : null, app: Boolean(opts.app)
    }))
  };
});

command("system:install","Replace a stopped profile's dnd5e from a release zip or unpacked folder (the old one is kept under agent-state/). --profile=<p> (required) [--from=<zip|folder>] (default: config dnd5e.source) [--campaign] (the switch-over, GM's word)", async opts => {
  if (!opts.profile || opts.profile === true) throw new CliError("system:install needs an explicit --profile.", { code: "usage", hint: "e.g. `fvtt system:install --profile=sandbox`." });
  const ctx = context(opts);
  guard(ctx, "system:install");
  const source = typeof opts.from === "string" ? opts.from : ctx.cfg.dnd5e?.source;
  resolveSource(source); // usage errors before any lock or server probe
  await lockExclusive(ctx.profile.name, "system:install", seconds(opts.wait, 0));
  const s = await serverState(ctx);
  checkSystemInstall({ profileName: ctx.profile.name, campaignFlag: Boolean(opts.campaign), status: s.status, servers: s.servers, held: s.held });
  const res = installSystem({ source, dataPath: ctx.profile.dataPath });
  return {
    ok: true, profile: ctx.profile.name, ...res, keptAt: res.keptAt ? path.relative(ctx.profile.dataPath, res.keptAt).replaceAll("\\", "/") : null,
    hint: "Worlds on this data path migrate to the new version the next time they open — `fvtt start` / `fvtt e2e` as usual."
  };
});

command("module:install", "Replace a third-party module from a release zip or unpacked folder: in the campaign's modules (every other data path links to them — D11), the old folder kept under the campaign's agent-state/, then the sandbox, release and Poligon copies re-linked. Every Foundry server must be stopped. --from=<zip|folder>", async opts => {
  const cfg = loadConfig();
  const base = { cfg, install: installPaths(cfg), cdp: cdpUrl(cfg), mode: readMode(), freeze: readFreeze(), opts };
  checkMode(base.mode, "module:install");
  if (typeof opts.from !== "string") throw new CliError("module:install needs --from=<zip|folder>.", { code: "usage" });
  const campaign = resolveProfile(cfg, "campaign");
  // Every server reads these folders (directly or through a link): all of them down, nothing held.
  const profiles = [];
  for (const name of PROFILES) {
    let profile;
    try { profile = resolveProfile(cfg, name); } catch { continue; }
    await lockExclusive(name, "module:install", seconds(opts.wait, 0));
    const s = await serverState({ ...base, profile });
    checkQuiet({ status: s.status, servers: s.servers, held: s.held }, `${name} uses the shared module folders`);
    profiles.push(profile);
  }
  const res = installPackage({ source: opts.from, dataPath: campaign.dataPath, type: "modules", lock: false, refuse: [MODULE_ID] });
  const relinked = {};
  for (const p of profiles.filter(x => !x.isCampaign)) {
    const dst = path.join(p.data, "modules", res.id);
    if (fs.existsSync(dst)) relinked[p.name] = relinkPackage(path.join(campaign.data, "modules", res.id), dst, { id: res.id });
  }
  return { ok: true, ...res, keptAt: res.keptAt ? path.relative(campaign.dataPath, res.keptAt).replaceAll("\\", "/") : null, relinked };
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
  // The current sandbox world goes down; tabs fvtt logged into it would wake up in the new one.
  const contextsClosed = await disposeContexts(ctx);
  const res = await createWorld(ctx, {
    slug, modules: list(opts.modules) ?? DEFAULT_MODULES, players: list(opts.players) ?? DEFAULT_PLAYERS,
    fixture: opts.fixture ?? null, startServer
  });
  const seeded = opts.fixture ? await seedFixture(ctx, { fixture: String(opts.fixture) }) : null;
  return {
    ok: true, profile: ctx.profile.name, ...res, seeded, contextsClosed,
    hint: seeded
      ? `The fixture ran in a GM tab that stays logged in (${seeded.page.slice(0, 8)}, context "gm") — use it via --page, do not log the GM in again. Players: \`fvtt login --profile=sandbox --user="Gracz 1" --context=gracz1\`.`
      : "`fvtt login --profile=sandbox --user=Gamemaster --context=gm`, then --user=\"Gracz 1\" --context=gracz1."
  };
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
  const st = await new FoundryClient(ctx.profile).status();
  const switching = st.active && st.world !== String(opts._[0]);
  const contextsClosed = switching ? await disposeContexts(ctx) : [];
  return { ok: true, profile: ctx.profile.name, ...(await launchWorld(ctx, String(opts._[0]), { startServer })), contextsClosed };
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
    await shutdownWorldAndWait(ctx, client);
    stopped = true;
  }
  const res = await deleteWorld(ctx, id);
  // Sessions die with the world; the isolated contexts fvtt opened for it are now dead tabs.
  const contextsClosed = ctx.profile.isCampaign ? [] : await disposeContexts(ctx);
  return { ok: true, profile: ctx.profile.name, stoppedFirst: stopped, ...res, contextsClosed };
});

command("e2e", "Layer 6: fresh sandbox world, GM + player clients, suites from dev/e2e/suites → logs/e2e/<run>/report.json. [--suites=a,b] [--modules=a,b] [--quench] [--keep] [--reuse] [--trace-writes] (every document write with a stack, per suite)", async opts => {
  const ctx = context({ profile: "sandbox", ...opts });
  guard(ctx, "e2e");
  if (ctx.profile.isCampaign) throw refuse("e2e runs in the sandbox only.", "campaign");
  const suites = list(opts.suites) ?? suiteNames();
  if (!suites.length) throw new CliError("No suites in dev/e2e/suites.", { code: "usage" });
  await lockExclusive(ctx.profile.name, "e2e", seconds(opts.wait, 300_000));
  const res = await runE2E(ctx, {
    suites, modules: list(opts.modules) ?? undefined, keep: Boolean(opts.keep), reuse: Boolean(opts.reuse), quench: Boolean(opts.quench),
    traceWrites: Boolean(opts["trace-writes"])
  });
  return { ...res, ...(res.ok ? {} : { hint: "World and tabs kept for inspection; read the report, look at the screenshots. `fvtt e2e --reuse` reruns without recreating." }) };
});

/* ------------------------------------------------------------------------------------ */
/*  Poligon — the GM's testing ground (PLAN_human_testing.md §6)                         */
/* ------------------------------------------------------------------------------------ */

function poligonContext(opts) {
  return context({ ...opts, profile: "poligon" });
}

const seatList = v => {
  if (v === undefined || v === false) return [];
  if (v === true) return POLIGON_PLAYERS.slice(0, 3);
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return POLIGON_PLAYERS.slice(0, Math.min(Number(s), POLIGON_PLAYERS.length));
  return s.split(",").map(x => x.trim()).filter(Boolean).map(x => (/^\d+$/.test(x) ? `Gracz ${x}` : x));
};

command("poligon:init", "Create/refresh the Poligon: own data path and port, modules as the campaign runs them, world `poligon` with Gamemaster + Gracz 1–5, its loader, packs from the working tree. Idempotent. [--skip-packs] [--force] (restart while someone is connected)", async opts => {
  const cfg = loadConfig();
  const base = { cfg, install: installPaths(cfg), cdp: cdpUrl(cfg), mode: readMode(), opts };
  checkMode(base.mode, "poligon:init");
  await lockExclusive("poligon", "poligon:init", seconds(opts.wait, 0));
  const t0 = Date.now();
  const campaign = resolveProfile(cfg, "campaign");
  const dataPath = profileDataPath(cfg, "poligon");
  const { modules, from } = await campaignModules(base, campaign);

  // A server already running on the Poligon goes down only with nobody in it.
  let ctx = null;
  try { ctx = { ...base, profile: resolveProfile(cfg, "poligon") }; } catch { /* first run: no options.json yet */ }
  const steps = [];
  if (ctx) {
    const s = await serverState(ctx);
    if (s.status.reachable || s.servers.length) {
      await guardHumans(ctx, { force: Boolean(opts.force) });
      await stopServer(ctx);
      steps.push("stopped the running Poligon server");
    }
  }

  const report = await initSandbox({
    campaignData: campaign.dataPath, sandboxData: dataPath, moduleRoot: MODULE_ROOT, modules: modules.filter(m => m !== MODULE_ID),
    dnd5eSource: cfg.dnd5e?.source ?? null
  });
  ctx = { ...base, profile: resolveProfile(cfg, "poligon") };

  let build = null;
  if (!opts["skip-packs"]) {
    const out = [`--out=${path.join(moduleDirOf(ctx), "packs")}`];
    build = runNode("dev/packs/build-packs.mjs", out);
    if (build.ok) build.validate = runNode("dev/packs/validate-packs.mjs", out);
    if (!build.ok) return { ok: false, ...report, build, hint: "Pack build failed — read build.stderr." };
  }

  let world = { id: POLIGON_WORLD, created: false };
  if (!poligonExists(ctx)) {
    const created = await bootstrapWorld(ctx, {
      id: POLIGON_WORLD, title: "Poligon",
      description: "Poligon — the GM's testing ground (PLAN_human_testing.md). Created by `fvtt poligon:init`; never deleted by fvtt.",
      marker: { file: POLIGON_MARKER, data: { kind: "poligon", modulesFrom: from } },
      modules, players: POLIGON_PLAYERS, startServer
    });
    world = { id: POLIGON_WORLD, created: true, users: created.users.map(u => u.name) };
    await stopServer(ctx);
    steps.push("created the world, stopped to add its loader");
  }
  const loader = writeLoader(path.join(ctx.profile.data, "worlds", POLIGON_WORLD));
  // Foundry's own default world for this data path, so a bare `fvtt start --profile=poligon` opens it.
  const optionsFile = path.join(ctx.profile.dataPath, "Config", "options.json");
  const options = readServerOptions(ctx.profile.dataPath);
  if (options.world !== POLIGON_WORLD) fs.writeFileSync(optionsFile, JSON.stringify({ ...options, world: POLIGON_WORLD }, null, 2));

  const start = await startServer(ctx, { world: POLIGON_WORLD });
  const stamp = writeStamp(ctx, MODULE_ROOT);
  const settings = await mirrorCampaignSettings(base, campaign, ctx);
  return {
    ok: true, dataPath, ms: Date.now() - t0, modules, modulesFrom: from, world, loader, steps, start, settings,
    created: report.created, build: build ? { ok: build.ok, validate: build.validate?.ok ?? null, ms: build.ms } : "skipped",
    stamp: { commit: stamp.commit, dirty: stamp.dirty },
    hint: "`npm run fvtt -- poligon:start --seats=3` opens the GM's seat and three player windows; the panel is the 'Poligon' button in the scene controls."
  };
});

command("poligon:start", "Start the Poligon world (or, --klon, the campaign clone) and open seats: the GM's window plus player windows. [--seats=3 | --seats=1,4 | --seats=\"Gracz 2\"] [--no-gm] [--klon] [--force] (switch worlds while someone is connected)", async opts => {
  const ctx = poligonContext(opts);
  guard(ctx, "poligon:start");
  if (!poligonExists(ctx)) throw refuse("No Poligon world yet.", "no-world", "`npm run fvtt -- poligon:init`.");
  const target = opts.klon ? ctx.cfg.campaign?.world : POLIGON_WORLD;
  if (opts.klon && !readCloneMarker(ctx, target)) throw refuse("No campaign clone on the Poligon.", "no-clone", "`npm run fvtt -- poligon:clone`.");
  await lockExclusive(ctx.profile.name, "poligon:start", seconds(opts.wait, 0));
  const status = await new FoundryClient(ctx.profile).status();
  let start = { already: true };
  if (status.active && status.world !== target) {
    // Switching worlds sends everyone in the other one back to /join — the human guard first. A running
    // server knows only the worlds it found at startup, so the switch is a restart (a fresh clone appears).
    await guardHumans(ctx, { force: Boolean(opts.force) });
    await stopServer(ctx);
    start = await startServer(ctx, { world: target });
  } else if (!status.active) {
    if (status.reachable) await stopServer(ctx); // setup screen: relaunch straight into the world
    start = await startServer(ctx, { world: target });
  }
  const stamp = writeStamp(ctx, MODULE_ROOT);
  const seats = [];
  const gmName = opts.klon ? await cloneGm(ctx) : POLIGON_GM;
  const wanted = [...(opts["no-gm"] ? [] : [gmName]), ...seatList(opts.seats)];
  if (wanted.length) {
    const browser = await browserSession(ctx.cdp);
    try {
      for (const name of wanted) {
        try {
          seats.push(await openSeat(ctx, browser, name));
        } catch (err) {
          seats.push({ user: name, error: err.message });
        }
      }
    } finally {
      browser.close();
    }
  }
  return {
    ok: seats.every(s => !s.error), profile: "poligon", world: target, klon: Boolean(opts.klon), start, seats,
    stamp: { commit: stamp.commit, dirty: stamp.dirty, packsStale: stamp.packs.stale },
    hint: opts.klon
      ? "The clone is a copy: nothing flows back to the campaign. Red banner KLON in every tab. `npm run fvtt -- poligon:start` switches back."
      : stamp.packs.stale
        ? `Packs are older than ${stamp.packs.newestSource} — \`npm run fvtt -- packs --profile=poligon\`.`
        : "Each seat is its own browser window (isolated cookies). Panel: the 'Poligon' button in the scene controls."
  };
});

/** The clone's GM seat: a full GM other than the agents' own login user (the campaign's `loginUser`). */
async function cloneGm(ctx) {
  const users = await new FoundryClient(ctx.profile).users();
  const gms = users.filter(u => u.role >= 4);
  const agent = String(ctx.cfg.campaign?.loginUser ?? "").toLowerCase();
  return (gms.find(u => u.name.toLowerCase() !== agent) ?? gms[0])?.name ?? null;
}

command("poligon:clone", "Copy the campaign world onto the Poligon's data path (same id, one-way, marker, [KLON] title, red banner). The campaign keeps running; nothing flows back. [--refresh] (replace an existing clone fvtt made)", async opts => {
  const ctx = poligonContext(opts);
  guard(ctx, "poligon:clone");
  if (!poligonExists(ctx)) throw refuse("No Poligon yet.", "no-world", "`npm run fvtt -- poligon:init`.");
  const id = ctx.cfg.campaign?.world;
  if (!id) throw new CliError("config.json names no campaign world.", { code: "usage" });
  await lockExclusive(ctx.profile.name, "poligon:clone", seconds(opts.wait, 0));
  const campaign = resolveProfile(ctx.cfg, "campaign");
  const st = await new FoundryClient(ctx.profile).status();
  const heldDbs = heldDatabases(ctx.profile.data).held.filter(h => h.startsWith(`worlds/${id}/`));
  const res = cloneCampaign({
    campaign, poligon: ctx.profile, id,
    guard: g => checkCloneTarget({
      ...g, id, worldsRoot: path.join(ctx.profile.data, "worlds"), campaignData: campaign.dataPath,
      refresh: Boolean(opts.refresh), active: Boolean(st.active && st.world === id), heldDbs
    })
  });
  return { ok: true, ...res, hint: "`npm run fvtt -- poligon:start --klon` opens it (the Poligon server restarts into the clone; `poligon:start` switches back)." };
});

command("poligon:stop", "Stop the Poligon server — refused while someone fvtt did not log in is connected. [--force] (the GM said so)", async opts => {
  const ctx = poligonContext(opts);
  guard(ctx, "poligon:stop");
  const who = await guardHumans(ctx, { force: Boolean(opts.force) });
  await lockExclusive(ctx.profile.name, "poligon:stop", seconds(opts.wait, 0));
  return { ok: true, profile: "poligon", presence: who, ...(await stopServer(ctx, { force: Boolean(opts.force) })) };
});

command("poligon:reset", "Rebuild Poligon stations in a GM page: <station…> | --all | --list. Only when the GM asks (H-D9).", async opts => {
  const ctx = poligonContext(opts);
  guard(ctx, "poligon:reset");
  await requireRunningPoligon(ctx);
  writeStamp(ctx, MODULE_ROOT);
  const browser = await browserSession(ctx.cdp);
  try {
    const page = await poligonGmPage(ctx, browser);
    if (opts.list) return { ok: true, stations: await callPoligon(ctx, browser, page, "game.poligon.stations.list()") };
    const ids = opts.all ? "all" : opts._.map(String);
    if (ids !== "all" && !ids.length) throw new CliError("Name a station, or --all.", { code: "usage", hint: "`fvtt poligon:reset --list` lists them." });
    const res = await callPoligon(ctx, browser, page, `game.poligon.stations.reset(${JSON.stringify(ids)}, { source: "fvtt" })`, { timeoutMs: seconds(opts.timeout, 900_000) });
    return { ok: res.every(r => r.ok), page, results: res };
  } finally {
    browser.close();
  }
});

command("poligon:obsada", "Build the persona compendium (Poligon · Obsada) through dnd5e's real advancement. [--rebuild] [--only=id,id]", async opts => {
  const ctx = poligonContext(opts);
  guard(ctx, "poligon:obsada");
  await requireRunningPoligon(ctx);
  const browser = await browserSession(ctx.cdp);
  try {
    const page = await poligonGmPage(ctx, browser);
    const only = typeof opts.only === "string" ? opts.only.split(",").map(s => s.trim()).filter(Boolean) : null;
    const res = await callPoligon(ctx, browser, page, `game.poligon.obsada.build(${JSON.stringify({ rebuild: Boolean(opts.rebuild), only })})`, { timeoutMs: seconds(opts.timeout, 1_800_000) });
    return { ok: !res.failed?.length, page, ...res };
  } finally {
    browser.close();
  }
});

command("poligon:findings", "Findings (Uwagi) from the Poligon journal → JSON; --md also writes logs/poligon/uwagi-<date>.md. [--since=<minutes|ISO>] [--open]", async opts => {
  const ctx = poligonContext(opts);
  guard(ctx, "poligon:findings");
  await requireRunningPoligon(ctx);
  let since = null;
  if (opts.since && opts.since !== true) since = /^\d+$/.test(String(opts.since)) ? new Date(Date.now() - Number(opts.since) * 60_000).toISOString() : new Date(opts.since).toISOString();
  const browser = await browserSession(ctx.cdp);
  try {
    const page = await poligonGmPage(ctx, browser);
    const res = await callPoligon(ctx, browser, page, `game.poligon.uwagi.export(${JSON.stringify({ since, open: Boolean(opts.open) })})`);
    let file = null;
    if (opts.md) {
      const dir = path.join(MODULE_ROOT, "logs", "poligon");
      fs.mkdirSync(dir, { recursive: true });
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
      file = path.join(dir, `uwagi-${stamp}.md`);
      fs.writeFileSync(file, res.markdown);
    }
    return { ok: true, count: res.findings.length, open: res.findings.filter(f => !f.status).length, findings: res.findings, ...(file ? { file: path.relative(MODULE_ROOT, file).replaceAll("\\", "/") } : {}) };
  } finally {
    browser.close();
  }
});

command("help", "This list.", async () => ({ ok: true, usage: "npm run fvtt -- <command> [--profile=campaign|sandbox|release|poligon] [--key=value]", commands: HELP }));

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
