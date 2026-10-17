/**
 * The safety model of PLAN_agentic_improvements.md §4, as pure functions over plain data,
 * so `node --test dev/agent/test` can prove every refusal without a server.
 */

import { refuse } from "./output.mjs";

/**
 * What each command is, for the mode guard.
 *  - read:      never changes anything
 *  - login:     changes who a browser is logged in as
 *  - testing:   runs code in a live world (Quench writes test documents), reloads clients
 *  - lifecycle: stops/starts servers, rewrites packs, creates/deletes worlds
 */
export const COMMAND_CLASS = {
  help: "read", init: "read", status: "read", doctor: "read", logs: "read", mode: "read", users: "read", "wait-ready": "read",
  "world:list": "read",
  login: "login",
  // eval runs arbitrary code in a live client — it can write, so it is testing, not read.
  quench: "testing", reload: "testing", e2e: "testing", eval: "testing",
  start: "lifecycle", stop: "lifecycle", restart: "lifecycle", kill: "lifecycle", packs: "lifecycle",
  backup: "lifecycle", "sandbox:init": "lifecycle", "sandbox:sync": "lifecycle", "system:install": "lifecycle",
  // Like `mode`: it only changes fvtt's own guard state. Lifted only on the GM's word (E11).
  freeze: "read",
  "world:create": "lifecycle", "world:launch": "lifecycle", "world:delete": "lifecycle", "world:seed": "testing",
  "release:check": "lifecycle",
  // The Poligon (PLAN_human_testing.md §6): findings are a read; a station reset or the persona build
  // writes into the GM's testing world (testing); init/start/stop move a server (lifecycle).
  "poligon:init": "lifecycle", "poligon:start": "lifecycle", "poligon:stop": "lifecycle",
  "poligon:reset": "testing", "poligon:obsada": "testing", "poligon:findings": "read", "poligon:clone": "lifecycle"
};

/**
 * Commands that create, switch or delete worlds, or run e2e: sandbox data paths only. The Poligon is
 * the GM's — an e2e run there would shut down the world under them (§3.1, option B's whole problem).
 */
const SANDBOX_ONLY = new Set(["world:create", "world:seed", "world:launch", "world:delete", "e2e"]);

export function checkSandboxOnly(command, profileName) {
  if (!SANDBOX_ONLY.has(command)) return;
  if (profileName === "poligon") {
    throw refuse(`\`${command}\` never runs on the Poligon (the GM's testing ground).`, "poligon",
      "Agent worlds and e2e runs live on the sandbox (`--profile=sandbox`, the default). The Poligon has `poligon:*`.");
  }
}

/**
 * Commands that bring the campaign world up or act inside it. While the campaign is frozen (the migration,
 * PLAN_migracja_dnd5e6.md D2) they are refused on the campaign profile; stopping it, reading it, backing it up
 * and cloning it onto the Poligon stay allowed.
 */
const FROZEN_CAMPAIGN = new Set(["start", "restart", "packs", "login", "reload", "eval", "quench", "world:launch", "system:install"]);

export function checkFreeze(freeze, command, profileName) {
  if (!freeze?.frozen || profileName !== "campaign" || !FROZEN_CAMPAIGN.has(command)) return;
  throw refuse(`The campaign is frozen until ${freeze.until ?? "the switch-over"} (${freeze.reason ?? "migration"}): no \`${command}\` on it.`, "frozen",
    command === "packs"
      ? "The committed packs/ (the campaign's copy is this working tree) build without a server: `npm run build:packs && npm run validate:packs`. Sandbox packs: drop --profile."
      : "Work in the sandbox — the default profile while frozen. Only the GM lifts the freeze (`npm run fvtt -- freeze off`).",
    { since: freeze.since ?? null, until: freeze.until ?? null });
}

/**
 * `system:install` replaces a profile's dnd5e: only on a quiet data path, and on the campaign only when asked for
 * by name (`--campaign`, the switch-over, E11) — the freeze above refuses it before that.
 */
export function checkSystemInstall({ profileName, campaignFlag = false, status, servers = [], held = [] }) {
  if (profileName === "campaign" && !campaignFlag) {
    throw refuse("Replacing the campaign's dnd5e is the switch-over (E11), not a routine step.", "campaign",
      "Pass `--campaign` only on the GM's word, after a fresh `fvtt backup`.");
  }
  checkQuiet({ status, servers, held }, "its dnd5e cannot be replaced");
}

/**
 * Nothing serves the data path and nothing holds its databases — for operations that read or replace files a
 * running server keeps open (backup, system:install).
 */
export function checkQuiet({ status, servers = [], held = [] }, why) {
  if (status?.reachable || servers.length) {
    throw refuse(`A Foundry server runs on this data path${status?.world ? ` (world ${status.world})` : ""} — ${why}.`, "running",
      "Stop it first (`npm run fvtt -- stop --profile=…`).", { status, servers: servers.map(s => s.pid) });
  }
  if (held.length) {
    throw refuse(`LevelDB still held: ${held.slice(0, 5).join(", ")}${held.length > 5 ? ` (+${held.length - 5})` : ""} — ${why}.`, "db-held",
      "Wait for the holder to exit; `npm run fvtt -- doctor` names it.", { held });
  }
}

/**
 * H5 (§3.6): where a campaign clone may be written. The target must be a world folder on the Poligon's
 * data path and nowhere under the campaign's; an existing folder is replaced only when it carries the
 * clone marker naming it, is a real folder (no junction), nothing holds its databases, and `--refresh`
 * was asked for. The clone keeps the campaign world's id, so these checks are all that separates a
 * refresh from an overwrite of the wrong thing.
 */
export function checkCloneTarget({ dir, id, worldsRoot, campaignData, exists, isLink = false, marker = null, refresh = false, active = false, heldDbs = [] }) {
  const norm = p => String(p ?? "").replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
  const d = norm(dir);
  if (!d.startsWith(`${norm(worldsRoot)}/`) || d !== `${norm(worldsRoot)}/${String(id).toLowerCase()}`) {
    throw refuse(`Clone target ${dir} is not worlds/${id} of the Poligon.`, "clone-target");
  }
  if (campaignData && (d === norm(campaignData) || d.startsWith(`${norm(campaignData)}/`))) {
    throw refuse("The clone target lies on the campaign's data path.", "campaign");
  }
  if (!exists) return;
  if (isLink) throw refuse(`worlds/${id} on the Poligon is a link, not a clone folder.`, "link");
  if (!marker || marker.id !== id || marker.kind !== "klon") {
    throw refuse(`worlds/${id} on the Poligon has no clone marker naming it — not made by poligon:clone.`, "no-marker",
      "Ask the GM; fvtt replaces only clones it made.");
  }
  if (!refresh) throw refuse(`A clone of ${id} already exists.`, "exists", "`--refresh` replaces it with a fresh copy.");
  if (active) throw refuse(`The clone ${id} is running on the Poligon server.`, "active-world", "`npm run fvtt -- poligon:stop` (or start the Poligon world) first.");
  if (heldDbs.length) throw refuse(`The clone has open databases: ${heldDbs.slice(0, 3).join(", ")}.`, "db-held");
}

/**
 * H-D9 / §3.2: a Poligon server may only be stopped or restarted by an agent while no human is in it.
 * `connected` = users the server counts as connected; `agentUsers` = distinct users logged in from
 * pages in browser contexts fvtt made for itself (never the default context, never a player seat it
 * opened for the GM). Anything more is a person.
 */
export function checkNoHumans({ connected, agentUsers = 0, force = false }) {
  if (force) return;
  const humans = Math.max(0, Number(connected ?? 0) - agentUsers);
  if (humans > 0) {
    throw refuse(`${humans} user(s) connected to the Poligon that fvtt did not log in — the GM may be in the middle of a test.`, "human-present",
      "Ask the GM first; `--force` only when they said so.", { connected, agentUsers });
  }
}

/**
 * D2 + D9: development mode allows everything; runtime mode (game night, co-GM work) is
 * read-only for every server — sandbox included — except logging in as a GM.
 * @param {{mode: string}} mode
 * @param {string} command
 * @param {{loginRole?: "gm"|"player", profile?: string}} [ctx]
 */
export function checkMode(mode, command, ctx = {}) {
  const cls = COMMAND_CLASS[command];
  if (!cls) throw new Error(`guards: unclassified command ${command}`);
  if (mode?.mode !== "runtime") return;
  if (cls === "read") return;
  if (cls === "login" && ctx.loginRole === "gm") return;
  const what = cls === "login" ? "logging in as a player (a live player may be on that user)" : `\`${command}\``;
  throw refuse(`Runtime mode (game night): ${what} is not allowed.`, "mode",
    "Only the GM switches back, by saying so; then `npm run fvtt -- mode development`.",
    { mode: mode.mode, since: mode.since, command });
}

export const AGENT_WORLD = /^agent-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `agent-<slug>-<yyyymmdd>` from a free-form slug; the LOCAL date (a world made at 00:30 is today's). */
export function agentWorldId(slug, date = new Date()) {
  const clean = String(slug).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!clean) throw refuse(`Slug "${slug}" has no usable characters.`, "world-id", "Use letters and digits.");
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const id = `agent-${clean}-${ymd}`;
  if (!AGENT_WORLD.test(id)) throw refuse(`"${id}" is not a valid agent world id.`, "world-id");
  return id;
}

/**
 * §4 "Delete a world" — every condition must hold:
 * agent- prefix, not protected, marker names this id, real directory (no junction), not the
 * active world, no package lock, no LevelDB held.
 */
export function checkWorldDeletable({ id, marker, isLink, activeWorld, protectedIds, locked, heldDbs = [] }) {
  if (!AGENT_WORLD.test(id ?? "")) throw refuse(`World "${id}" is not an agent sandbox (agent-… ids only).`, "not-agent-world");
  if (protectedIds.has(id)) throw refuse(`World "${id}" is protected.`, "protected-world");
  if (isLink) throw refuse(`worlds/${id} is a link, not a world folder.`, "link");
  if (!marker || marker.id !== id) {
    throw refuse(`worlds/${id} has no .agent-sandbox.json naming it — not created by fvtt.`, "no-marker",
      "Agents delete only worlds they created. Ask the GM to remove it by hand if it really is junk.");
  }
  if (activeWorld === id) throw refuse(`World "${id}" is running.`, "active-world", "Stop the server first (`fvtt stop --profile …`).");
  if (locked) throw refuse(`World "${id}" carries a package lock.`, "locked");
  if (heldDbs.length) throw refuse(`World "${id}" has open databases: ${heldDbs.join(", ")}.`, "db-held");
}

/** D5: only launch on a quiet data path — nothing answering, no server, no LevelDB held. */
export function checkStartable({ status, servers, held, suspects = [] }) {
  if (status?.reachable) {
    throw refuse(`A server already answers on this profile's port${status.active ? ` (world ${status.world})` : ""}.`, "running",
      "Use `restart`, or `stop` first.", { status });
  }
  if (servers.length) {
    throw refuse(`Foundry is still running for this data path (pid ${servers.map(s => s.pid).join(", ")}).`, "process",
      "It may be starting or dying; `fvtt status`, then `fvtt stop` or `fvtt kill`.");
  }
  if (held.length) {
    throw refuse(`LevelDB still held: ${held.slice(0, 5).join(", ")}${held.length > 5 ? ` (+${held.length - 5})` : ""}.`, "db-held",
      suspects.length ? `Possible holders: ${suspects.map(s => `${s.what} pid ${s.pid}`).join(", ")}.` : "Wait for the holder to exit; foundry-mcp and build-packs are the usual suspects.",
      { held, suspects });
  }
}
