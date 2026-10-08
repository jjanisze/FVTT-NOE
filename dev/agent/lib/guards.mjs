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
  backup: "lifecycle", "sandbox:init": "lifecycle", "sandbox:sync": "lifecycle",
  "world:create": "lifecycle", "world:launch": "lifecycle", "world:delete": "lifecycle", "world:seed": "testing",
  "release:check": "lifecycle"
};

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
