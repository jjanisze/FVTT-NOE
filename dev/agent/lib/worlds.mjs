/**
 * Sandbox worlds (§5 C): `agent-<slug>-<yyyymmdd>`, a marker file naming the id, the §4 delete
 * guards. Bootstrap goes over HTTP and the socket only — no browser: `createWorld {launch:true}`
 * runs Foundry's firstLaunch, which logs the creating session in as the world's first user (the
 * default Gamemaster); that session then enables modules and creates the players through
 * `modifyDocument`, exactly what a client would send.
 */

import fs from "node:fs";
import path from "node:path";
import { FoundryClient, socketCall } from "./foundry-http.mjs";
import { agentWorldId, checkWorldDeletable } from "./guards.mjs";
import { heldDatabases } from "./leveldb.mjs";
import { MODULE_ID, protectedWorlds } from "./config.mjs";
import { CliError, note, poll, refuse } from "./output.mjs";

export const MARKER = ".agent-sandbox.json";
export const DEFAULT_MODULES = [MODULE_ID, "quench"];
export const DEFAULT_PLAYERS = ["Gracz 1", "Gracz 2", "Gracz 3"];

const worldsDir = ctx => path.join(ctx.profile.data, "worlds");

function readMarker(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, MARKER), "utf8"));
  } catch {
    return null;
  }
}

export function listWorlds(ctx) {
  const root = worldsDir(ctx);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
    const dir = path.join(root, d.name);
    let meta = {};
    try { meta = JSON.parse(fs.readFileSync(path.join(dir, "world.json"), "utf8")); } catch { /* not a world */ }
    const marker = readMarker(dir);
    return {
      id: d.name, title: meta.title ?? null, system: meta.system ?? null,
      agent: Boolean(marker && marker.id === d.name), created: marker?.created ?? null,
      fixture: marker?.fixture ?? null, locked: fs.existsSync(path.join(dir, `${d.name}.lock`))
    };
  }).filter(w => w.system);
}

/** The server must be on its setup screen: start it bare, or shut down whatever world runs. */
async function toSetupScreen(ctx, startServer, client) {
  const s = await client.status();
  if (!s.reachable) {
    await startServer(ctx, { world: null });
    return;
  }
  if (s.active) {
    if (ctx.profile.isCampaign) throw refuse("World management on the campaign server would stop the campaign world.", "campaign", "Use --profile=sandbox.");
    note(`shutting down sandbox world ${s.world}`);
    await client.shutdownWorld();
    await poll(async () => !(await client.status()).active, { timeoutMs: 30_000 });
  }
}

async function modify(client, request) {
  const r = await socketCall(client.base, client.session, "modifyDocument", request);
  if (r?.error) throw new CliError(`modifyDocument ${request.type}.${request.action}: ${r.error.message ?? JSON.stringify(r.error)}`);
  return r;
}

/**
 * Create, launch and bootstrap a sandbox world. Returns once it is active with the modules
 * enabled (one relaunch, so the server loads their packs) and the players created.
 */
export async function createWorld(ctx, { slug, modules = DEFAULT_MODULES, players = DEFAULT_PLAYERS, fixture = null, startServer }) {
  if (ctx.profile.isCampaign) throw refuse("Agent worlds live in the sandbox data path, never the campaign's.", "campaign", "Use --profile=sandbox.");
  const id = agentWorldId(slug);
  if (fs.existsSync(path.join(worldsDir(ctx), id))) throw refuse(`World ${id} already exists.`, "exists", "Pick another slug, or `world:delete` it first.");
  const missing = modules.filter(m => !fs.existsSync(path.join(ctx.profile.data, "modules", m, "module.json")));
  if (missing.length) throw new CliError(`Modules not in the sandbox: ${missing.join(", ")}.`, { code: "usage", hint: "`fvtt sandbox:init` links them from the campaign install." });

  const client = new FoundryClient(ctx.profile);
  await toSetupScreen(ctx, startServer, client);
  await client.adminAuth();
  note(`creating ${id}`);
  await client.createWorld({ id, title: `Agent · ${slug}`, system: "dnd5e", description: "Sandbox world created by fvtt (PLAN_agentic_improvements.md). Safe to delete.", launch: true });
  // Marker first thing: from here on, only fvtt's own guards decide whether this can go.
  fs.writeFileSync(path.join(worldsDir(ctx), id, MARKER), JSON.stringify({
    id, created: new Date().toISOString(), by: process.env.FVTT_AGENT ?? "fvtt", fixture, modules, players
  }, null, 2));
  const up = await poll(async () => { const s = await client.status(); return s.active && s.world === id ? s : null; }, { timeoutMs: 180_000, intervalMs: 1000 });
  if (!up) throw new CliError(`World ${id} did not come up after creation.`, { code: "not-ready", hint: "`fvtt logs --profile=sandbox --level=warn`." });

  // The creating session is now the first user (Gamemaster) — a GM socket for the bootstrap.
  // firstLaunch already wrote an empty core.moduleConfiguration; a second document with the
  // same key is ignored (Foundry reads the first), so update it rather than create (2026-10-05).
  const moduleConfiguration = JSON.stringify(Object.fromEntries(modules.map(m => [m, true])));
  const got = await modify(client, { type: "Setting", action: "get", operation: { query: { key: "core.moduleConfiguration" } } });
  const existing = (got?.result ?? []).find(s => s.key === "core.moduleConfiguration");
  await modify(client, existing
    ? { type: "Setting", action: "update", operation: { updates: [{ _id: existing._id, value: moduleConfiguration }], modifiedTime: Date.now() } }
    : { type: "Setting", action: "create", operation: { data: [{ key: "core.moduleConfiguration", value: moduleConfiguration }], modifiedTime: Date.now() } });
  await modify(client, { type: "User", action: "create", operation: { data: players.map(name => ({ name, role: 1 })), modifiedTime: Date.now() } });

  note("relaunching with modules enabled");
  await client.shutdownWorld();
  await poll(async () => !(await client.status()).active, { timeoutMs: 30_000 });
  await client.launchWorld(id);
  const again = await poll(async () => { const s = await client.status(); return s.active && s.world === id ? s : null; }, { timeoutMs: 180_000, intervalMs: 1000 });
  if (!again) throw new CliError(`World ${id} did not relaunch.`, { code: "not-ready" });
  return { id, modules, users: await new FoundryClient(ctx.profile).users() };
}

export async function launchWorld(ctx, id, { startServer }) {
  if (!listWorlds(ctx).some(w => w.id === id)) throw refuse(`No world ${id} here.`, "no-world");
  const client = new FoundryClient(ctx.profile);
  const s = await client.status();
  if (s.active && s.world === id) return { id, already: true };
  if (!s.reachable) return startServer(ctx, { world: id });
  await toSetupScreen(ctx, startServer, client);
  await client.launchWorld(id);
  const up = await poll(async () => { const t = await client.status(); return t.active && t.world === id ? t : null; }, { timeoutMs: 180_000, intervalMs: 1000 });
  if (!up) throw new CliError(`World ${id} did not come up.`, { code: "not-ready" });
  return { id, launched: true };
}

/** §4: every guard in checkWorldDeletable, then Foundry's own uninstall (type world only). */
export async function deleteWorld(ctx, id) {
  const dir = path.join(worldsDir(ctx), id);
  const client = new FoundryClient(ctx.profile);
  const status = await client.status();
  let isLink = false;
  try { isLink = fs.lstatSync(dir).isSymbolicLink(); } catch { throw refuse(`No world folder ${id}.`, "no-world"); }
  const heldDbs = heldDatabases(ctx.profile.data).held.filter(h => h.startsWith(`worlds/${id}/`));
  checkWorldDeletable({
    id, marker: readMarker(dir), isLink, activeWorld: status.active ? status.world : null,
    protectedIds: protectedWorlds(ctx.cfg), locked: fs.existsSync(path.join(dir, `${id}.lock`)), heldDbs
  });
  if (status.reachable && !status.active) {
    // The only setup action fvtt ever sends with a package id — and the type is fixed.
    await client.setup("uninstallPackage", { type: "world", id });
  } else {
    fs.rmSync(dir, { recursive: true, force: false });
  }
  if (fs.existsSync(dir)) throw new CliError(`worlds/${id} still exists after uninstall.`, { code: "delete-failed" });
  return { id, deleted: true, via: status.reachable && !status.active ? "uninstallPackage" : "rm" };
}
