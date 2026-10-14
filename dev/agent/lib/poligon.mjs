/**
 * The Poligon (PLAN_human_testing.md): the GM's own testing ground — a third data path with its own
 * server and port, beside the campaign and the agents' sandbox (D1), set up by the same machinery as
 * the sandbox (`initSandbox`: module linked to the working tree, packs built from it, every package
 * locked), and one persistent world `poligon` that no fvtt command deletes.
 *
 * The Poligon's own code is not in the module. It lives in `dev/poligon/` and reaches the browser at
 * `/agent-poligon/…` through a Data-root junction that exists only on non-campaign data paths; the
 * world pulls it in with a small loader file listed in the world's own `esmodules` (core loads a
 * world's esmodules last, `dist/server/views/view.mjs`). The campaign has neither the junction nor the
 * loader, so Poligon code cannot run there by construction; the entry point checks the world id too.
 *
 * Browser seats are always isolated contexts. Foundry's `session` cookie is scoped to the host name,
 * not the port, so a Poligon login in Chrome's default context would replace the campaign tab's
 * session — the campaign would land on /join at its next reload.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { FILES, MODULE_ID, POLIGON_WORLD, readJson } from "./config.mjs";
import { CliError, note, refuse } from "./output.mjs";
import { checkNoHumans } from "./guards.mjs";
import { FoundryClient } from "./foundry-http.mjs";
import { browserSession, evaluate } from "./cdp.mjs";
import { foundryPages, loginInContext, namedContext, resolveUser } from "./browser.mjs";

export const POLIGON_MARKER = ".poligon.json";
export const LOADER = "poligon-loader.mjs";
/** H-D10: five players, the table's size. */
export const POLIGON_PLAYERS = ["Gracz 1", "Gracz 2", "Gracz 3", "Gracz 4", "Gracz 5"];
export const POLIGON_GM = "Gamemaster";
/** The campaign's active set on 2026-10-12, used when no campaign page can be asked. */
export const FALLBACK_MODULES = [MODULE_ID, "quench", "sequencer", "splatter", "dice-so-nice", "quickscale", "JB2A_DnD5e"];
/** Seat contexts belong to the person at the keyboard; every other fvtt context on the Poligon is an agent's. */
export const SEAT_PREFIX = "seat-";

const worldDir = ctx => path.join(ctx.profile.data, "worlds", POLIGON_WORLD);

export function poligonExists(ctx) {
  return fs.existsSync(path.join(worldDir(ctx), "world.json"));
}

export function readPoligonMarker(ctx) {
  return readJson(path.join(worldDir(ctx), POLIGON_MARKER));
}

/** `seat-gm`, `seat-gracz-1` … — stable names for a user's seat context. */
export function seatName(userName) {
  const slug = String(userName).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${SEAT_PREFIX}${slug || "user"}`;
}

/**
 * The campaign's active modules, asked from a ready campaign page (read-only), so VFX and sound are
 * judged with what the table runs (§3.1). Without one: the local config's `poligon.modules`, else the
 * fallback list.
 */
export async function campaignModules(baseCtx, campaignProfile) {
  const configured = baseCtx.cfg.poligon?.modules;
  if (Array.isArray(configured) && configured.length) return { modules: [...new Set([MODULE_ID, ...configured])], from: "config" };
  if (!baseCtx.cdp) return { modules: FALLBACK_MODULES, from: "fallback (no Chrome configured)" };
  let browser;
  try {
    browser = await browserSession(baseCtx.cdp);
  } catch {
    return { modules: FALLBACK_MODULES, from: "fallback (Chrome not answering)" };
  }
  try {
    const page = (await foundryPages({ ...baseCtx, profile: campaignProfile }, browser)).find(p => p.ready);
    if (!page) return { modules: FALLBACK_MODULES, from: "fallback (no ready campaign page)" };
    const ids = await evaluate(browser, page.targetId, "game.modules.filter(m => m.active).map(m => m.id)", { timeoutMs: 5000 });
    return { modules: [...new Set([MODULE_ID, ...ids])], from: "campaign" };
  } catch {
    return { modules: FALLBACK_MODULES, from: "fallback (campaign page did not answer)" };
  } finally {
    browser.close();
  }
}

/**
 * The world's loader and its `esmodules` entry. The loader is a real file inside the world (core
 * requires package assets to exist); it marks the page as the Poligon's and imports the entry point.
 * Rewritten on every init. Returns whether `world.json` changed — then the server must reread it
 * (core caches package manifests; `World.launch` uses the cached one).
 */
export function writeLoader(worldPath, { world = POLIGON_WORLD, kind = "poligon" } = {}) {
  const loader = [
    "// Written by `fvtt poligon:init` (PLAN_human_testing.md §3.5) — regenerated on every init, do not edit.",
    "// Marks this page as the Poligon's and pulls in its code, served only on non-campaign data paths.",
    `globalThis.__poligon = Object.freeze({ world: ${JSON.stringify(world)}, kind: ${JSON.stringify(kind)} });`,
    "import \"../../agent-poligon/poligon.mjs\";",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(worldPath, LOADER), loader);
  const manifestFile = path.join(worldPath, "world.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const esmodules = new Set(manifest.esmodules ?? []);
  if (esmodules.has(LOADER)) return { changed: false };
  esmodules.add(LOADER);
  manifest.esmodules = [...esmodules];
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return { changed: true };
}

/**
 * The table's rules, copied once per init (read-only on the campaign side): dnd5e's rules version,
 * metric units and calendar, and every world setting the module shows in its configuration (Kobalt and
 * its switches …). Bookkeeping (last-seen maps, migration flags, the clock) stays the Poligon's own.
 * After this the Poligon's Wariant section owns those switches.
 */
const MIRRORED_DND5E = ["rulesVersion", "metricLengthUnits", "metricVolumeUnits", "metricWeightUnits", "calendarConfig"];

export async function mirrorCampaignSettings(baseCtx, campaignProfile, poligonCtx) {
  if (!baseCtx.cdp) return { skipped: "no Chrome" };
  let browser;
  try {
    browser = await browserSession(baseCtx.cdp);
  } catch {
    return { skipped: "Chrome not answering" };
  }
  try {
    const page = (await foundryPages({ ...baseCtx, profile: campaignProfile }, browser)).find(p => p.ready);
    if (!page) return { skipped: "no ready campaign page" };
    const read = `JSON.stringify([...game.settings.settings.values()]
      .filter(s => s.scope === "world" && ((s.namespace === "dnd5e" && ${JSON.stringify(MIRRORED_DND5E)}.includes(s.key)) || (s.namespace === ${JSON.stringify(MODULE_ID)} && s.config)))
      .map(s => [s.namespace, s.key, game.settings.get(s.namespace, s.key)]))`;
    const values = JSON.parse(await evaluate(browser, page.targetId, read, { timeoutMs: 10_000 }));
    const gm = await poligonGmPage(poligonCtx, browser);
    const write = `(async () => { const out = []; for (const [ns, key, v] of ${JSON.stringify(values)}) {
      if (!game.settings.settings.has(ns + "." + key)) continue;
      if (JSON.stringify(game.settings.get(ns, key)) === JSON.stringify(v)) continue;
      await game.settings.set(ns, key, v); out.push(ns + "." + key); } return out; })()`;
    return { changed: await evaluate(browser, gm, write, { timeoutMs: 30_000 }), read: values.length };
  } catch (err) {
    return { error: err.message };
  } finally {
    browser.close();
  }
}

/* ------------------------------------------------------------------------------------ */
/*  Klon kampanii (H5, §3.6)                                                            */
/* ------------------------------------------------------------------------------------ */

export const CLONE_MARKER = ".poligon-clone.json";

export function readCloneMarker(ctx, id) {
  return readJson(path.join(ctx.profile.data, "worlds", id, CLONE_MARKER));
}

function isLinkPath(p) {
  try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; }
}

/**
 * One-way copy of the campaign world onto the Poligon's data path under the **same id**, so every
 * `worlds/<id>/…` asset path keeps resolving. Everything is copied, nothing junctioned (H-D3: an upload
 * in a junctioned clone would land in the campaign's folders; 0.7 GB copies in seconds). LevelDB is
 * copied without its `LOCK` — the foundry-mcp snapshot method — so the campaign may keep running; the
 * world's package lock is left out (a locked world cannot launch). The Data-root `assets/` the campaign
 * uses are copied when missing. Then the marker, the `[KLON]` title and the loader (`kind: "klon"`: red
 * banner, "KLON — NIE KAMPANIA"). Nothing ever flows back.
 *
 * @param {object} p
 * @param {object} p.campaign   resolved campaign profile
 * @param {object} p.poligon    resolved Poligon profile
 * @param {string} p.id         the campaign world id
 */
export function cloneCampaign({ campaign, poligon, id, guard }) {
  const t0 = Date.now();
  const src = path.join(campaign.data, "worlds", id);
  const dst = path.join(poligon.data, "worlds", id);
  if (!fs.existsSync(path.join(src, "world.json"))) throw new CliError(`No campaign world ${id} at the campaign data path.`, { code: "no-world" });
  guard({ dir: dst, exists: fs.existsSync(dst), isLink: isLinkPath(dst), marker: readJson(path.join(dst, CLONE_MARKER)) });

  if (fs.existsSync(dst)) {
    for (const entry of fs.readdirSync(dst)) if (isLinkPath(path.join(dst, entry))) fs.rmSync(path.join(dst, entry)); // never recurse through a link
    fs.rmSync(dst, { recursive: true, force: true });
  }
  let files = 0;
  let bytes = 0;
  fs.cpSync(src, dst, {
    recursive: true,
    filter: s => {
      const base = path.basename(s);
      if (base === "LOCK" || base === `${id}.lock` || base === CLONE_MARKER) return false;
      try {
        const st = fs.statSync(s);
        if (st.isFile()) { files++; bytes += st.size; }
      } catch { /* vanished mid-copy (a LevelDB compaction) — skip */ return false; }
      return true;
    }
  });

  const assets = { copied: 0 };
  const srcAssets = path.join(campaign.data, "assets");
  if (fs.existsSync(srcAssets)) {
    const dstAssets = path.join(poligon.data, "assets");
    fs.mkdirSync(dstAssets, { recursive: true });
    for (const f of fs.readdirSync(srcAssets, { withFileTypes: true })) {
      if (f.isFile() && !fs.existsSync(path.join(dstAssets, f.name))) { fs.copyFileSync(path.join(srcAssets, f.name), path.join(dstAssets, f.name)); assets.copied++; }
    }
  }

  const manifestFile = path.join(dst, "world.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  manifest.title = `[KLON] ${String(manifest.title ?? id).replace(/^\[KLON\] /, "")}`;
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  writeLoader(dst, { world: id, kind: "klon" });
  fs.writeFileSync(path.join(dst, CLONE_MARKER), `${JSON.stringify({ id, kind: "klon", created: new Date().toISOString(), by: process.env.FVTT_AGENT ?? "fvtt", files }, null, 2)}\n`);
  return { id, files, mb: Math.round(bytes / 1048576), assets, ms: Date.now() - t0 };
}

/* ------------------------------------------------------------------------------------ */
/*  Freshness stamp (§3.5 Świeżość)                                                     */
/* ------------------------------------------------------------------------------------ */

function newestMtime(dir, filter = () => true) {
  let newest = 0;
  let file = null;
  const walk = d => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!e.isSymbolicLink()) walk(p); continue; }
      if (!filter(p)) continue;
      const m = fs.statSync(p).mtimeMs;
      if (m > newest) { newest = m; file = p; }
    }
  };
  walk(dir);
  return { mtime: newest || null, file };
}

/**
 * What the panel cannot learn in the browser: the commit and dirty count of the working tree the
 * page's code comes from, and whether packs and class data are newer than what the Poligon holds.
 * Written to `Data/agent-poligon-state/stamp.json` of the Poligon data path (never into the repo).
 */
export function writeStamp(ctx, moduleRoot) {
  const git = args => spawnSync("git", args, { cwd: moduleRoot, encoding: "utf8", windowsHide: true });
  const head = git(["rev-parse", "--short", "HEAD"]).stdout?.trim() || null;
  const subject = git(["log", "-1", "--format=%s"]).stdout?.trim() || null;
  const porcelain = (git(["status", "--porcelain"]).stdout ?? "").split(/\r?\n/).filter(Boolean);
  const dirtyCode = porcelain.filter(l => !l.slice(3).startsWith("packs/")).length;
  const rel = f => (f ? path.relative(moduleRoot, f).replaceAll("\\", "/") : null);

  const packsDir = path.join(ctx.profile.data, "modules", MODULE_ID, "packs");
  const packs = newestMtime(packsDir, f => !f.endsWith(`${path.sep}LOCK`) && !f.endsWith(`${path.sep}LOG`) && !f.endsWith(".old"));
  const packSources = newestMtime(path.join(moduleRoot, "scripts", "config"), f => f.endsWith(".mjs"));
  const builder = newestMtime(path.join(moduleRoot, "dev", "packs"), f => f.endsWith(".mjs"));
  const sources = (builder.mtime ?? 0) > (packSources.mtime ?? 0) ? builder : packSources;
  const classData = [
    path.join(moduleRoot, "scripts", "config", "class-features-data.mjs"),
    path.join(moduleRoot, "scripts", "config", "towarzysze-data.mjs"),
    path.join(moduleRoot, "dev", "classes")
  ].map(p => (fs.existsSync(p) && fs.statSync(p).isDirectory() ? newestMtime(p) : { mtime: fs.existsSync(p) ? fs.statSync(p).mtimeMs : null, file: p }))
    .reduce((a, b) => ((b.mtime ?? 0) > (a.mtime ?? 0) ? b : a), { mtime: null, file: null });

  const iso = ms => (ms ? new Date(ms).toISOString() : null);
  const stamp = {
    at: new Date().toISOString(),
    commit: head, subject, dirty: dirtyCode,
    packs: {
      builtAt: iso(packs.mtime), sourcesAt: iso(sources.mtime), newestSource: rel(sources.file),
      stale: Boolean(packs.mtime && sources.mtime && sources.mtime > packs.mtime + 1000)
    },
    classData: { changedAt: iso(classData.mtime), newest: rel(classData.file) }
  };
  const dir = path.join(ctx.profile.data, "agent-poligon-state");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "stamp.json"), `${JSON.stringify(stamp, null, 2)}\n`);
  return stamp;
}

/* ------------------------------------------------------------------------------------ */
/*  Seats and the "human present" guard (§3.2, H-D9)                                     */
/* ------------------------------------------------------------------------------------ */

/** fvtt's browser contexts on this profile, split into the person's seats and the agents' own. */
function fvttContexts(profileName) {
  const all = readJson(FILES.contexts) ?? {};
  const seats = new Set();
  const agents = new Set();
  for (const [key, { browserContextId }] of Object.entries(all)) {
    if (!key.startsWith(`${profileName}:`)) continue;
    (key.slice(profileName.length + 1).startsWith(SEAT_PREFIX) ? seats : agents).add(browserContextId);
  }
  return { seats, agents };
}

/** Users the server counts as connected, and how many of them sit in agent-only contexts. */
export async function presence(ctx) {
  const status = await new FoundryClient(ctx.profile).status();
  const out = { reachable: status.reachable, active: Boolean(status.active), world: status.world ?? null, connected: status.users ?? 0, agentUsers: 0, seats: [] };
  if (!status.active || !ctx.cdp) return out;
  let browser;
  try {
    browser = await browserSession(ctx.cdp);
  } catch {
    return out;
  }
  try {
    const { seats, agents } = fvttContexts(ctx.profile.name);
    const list = await foundryPages(ctx, browser);
    out.agentUsers = new Set(list.filter(p => p.ready && p.userId && agents.has(p.context)).map(p => p.userId)).size;
    out.seats = list.filter(p => seats.has(p.context)).map(p => ({ user: p.userName ?? null, ready: Boolean(p.ready), targetId: p.targetId }));
  } finally {
    browser.close();
  }
  return out;
}

/** Lifecycle on the Poligon while someone is in it: refused unless `--force` (the GM said so). */
export async function guardHumans(ctx, { force = false } = {}) {
  if (ctx.profile.name !== "poligon") return null;
  const p = await presence(ctx);
  if (p.active) checkNoHumans({ connected: p.connected, agentUsers: p.agentUsers, force });
  return p;
}

/**
 * Log `userName` into its own seat context (created once, kept until Chrome closes or the seat is
 * reused). Re-uses the seat's tab when there is one.
 */
export async function openSeat(ctx, browser, userName) {
  const user = await resolveUser(ctx, userName);
  const name = seatName(user.name);
  const { id } = await namedContext(browser, ctx.profile.name, name);
  const inCtx = (await foundryPages(ctx, browser)).filter(p => p.context === id);
  const res = await loginInContext(ctx, browser, { userId: user.id, browserContextId: id, targetIds: inCtx.map(p => p.targetId), urls: inCtx.map(p => p.url) });
  return { user: user.name, gm: user.gm, context: name, page: res.pages[0] };
}

/** A ready GM page of the running Poligon: an open one, else a fresh GM seat. */
export async function poligonGmPage(ctx, browser) {
  for (const p of (await foundryPages(ctx, browser)).filter(x => x.ready)) {
    if (await evaluate(browser, p.targetId, "!!game.user.isGM", { timeoutMs: 5000 }).catch(() => false)) return p.targetId;
  }
  return (await openSeat(ctx, browser, POLIGON_GM)).page;
}

/** The world must be the Poligon and running; anything else is refused before a page is touched. */
export async function requireRunningPoligon(ctx) {
  const status = await new FoundryClient(ctx.profile).status();
  if (!status.active || status.world !== POLIGON_WORLD) {
    throw refuse(`The Poligon world is not running${status.active ? ` (the server runs ${status.world})` : ""}.`, "not-running",
      "`npm run fvtt -- poligon:start`.");
  }
  return status;
}

/** `game.poligon` in a GM page, waiting for the entry point to have installed it. */
export async function callPoligon(ctx, browser, page, expression, { timeoutMs = 600_000 } = {}) {
  const ready = await evaluate(browser, page, "!!globalThis.game?.poligon?.ready", { timeoutMs: 10_000 }).catch(() => false);
  if (!ready) {
    throw new CliError("This page has no `game.poligon` — the Poligon's code did not load.", {
      code: "no-poligon-code", hint: "`fvtt poligon:init` rewrites the loader and the /agent-poligon/ junction; then `fvtt reload --profile=poligon --page=…`."
    });
  }
  note(`poligon: ${expression.slice(0, 80)}`);
  return evaluate(browser, page, expression, { timeoutMs });
}
