/**
 * Server lifecycle for one profile: state, stop, start — with the §4 guards applied here,
 * not left to the caller.
 */

import fs from "node:fs";
import path from "node:path";
import { FoundryClient } from "./foundry-http.mjs";
import { foundryServers, levelDbSuspects, listProcesses, isAlive, killTree, launch } from "./proc.mjs";
import { heldDatabases } from "./leveldb.mjs";
import { hasSecret } from "./secret.mjs";
import { checkStartable } from "./guards.mjs";
import { defaultFoundryDataPath } from "./config.mjs";
import { readLog } from "./logs.mjs";
import { CliError, refuse, note, poll } from "./output.mjs";

const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/** Everything known about a profile's server without touching it. */
export async function serverState(ctx) {
  const client = new FoundryClient(ctx.profile);
  const processes = listProcesses();
  const status = await client.status();
  const servers = foundryServers(ctx.install, defaultFoundryDataPath(), processes)
    .filter(s => same(s.dataPath, ctx.profile.dataPath));
  const { held, checked } = heldDatabases(ctx.profile.data);
  return { status, servers, held, checkedDbs: checked, suspects: levelDbSuspects(processes) };
}

/**
 * Graceful stop: world shutdown → /quit → wait for the process to exit and every LevelDB
 * to be released. A process that will not exit is killed (D5: allowed in development
 * mode, Foundry's executable only). Without a stored password only `force` may kill.
 */
export async function stopServer(ctx, { force = false, timeoutMs = 45_000 } = {}) {
  const t0 = Date.now();
  const client = new FoundryClient(ctx.profile);
  const before = await serverState(ctx);
  const steps = [];
  if (!before.status.reachable && !before.servers.length) {
    return { stopped: true, already: true, steps, ms: 0 };
  }
  if (before.status.reachable) {
    if (!hasSecret() && !force) {
      throw new CliError("No stored admin password, so no graceful stop.", {
        code: "no-secret",
        hint: "Ask the GM to run dev/agent/Set-AgentSecret.ps1, or pass --force to kill the Foundry process."
      });
    }
    if (hasSecret()) {
      try {
        if (before.status.active) {
          note(`shutting down world ${before.status.world}`);
          await client.shutdownWorld();
          steps.push("world-shutdown");
          await poll(async () => !(await client.status()).active, { timeoutMs: 30_000 });
        }
        note("quitting the application");
        await client.quit();
        steps.push("quit");
      } catch (err) {
        if (err.code === "auth-failed") throw err;
        steps.push(`graceful-failed: ${err.message}`);
      }
    }
  }
  let gone = await poll(() => before.servers.every(s => !isAlive(s.pid)), { timeoutMs: hasSecret() ? timeoutMs : 0 });
  if (!gone) {
    for (const s of before.servers.filter(s => isAlive(s.pid))) {
      note(`killing Foundry pid ${s.pid}`);
      steps.push({ kill: killTree(s.pid, ctx.install) });
    }
    gone = await poll(() => before.servers.every(s => !isAlive(s.pid)), { timeoutMs: 15_000 });
  }
  const portFree = await poll(async () => !(await client.status()).reachable, { timeoutMs: 15_000 });
  if (!portFree) {
    throw new CliError("Something still answers on this profile's port after the Foundry process exited.", {
      code: "port-busy", hint: "Not a Foundry process fvtt knows about — check `fvtt status`; a human should look.", details: { steps }
    });
  }
  const released = await poll(() => heldDatabases(ctx.profile.data).held.length === 0, { timeoutMs: 20_000 });
  return {
    stopped: true, world: before.status.world ?? null, steps,
    dbsReleased: Boolean(released), ...(released ? {} : { held: heldDatabases(ctx.profile.data).held }),
    ms: Date.now() - t0
  };
}

export function worldExists(ctx, world) {
  return fs.existsSync(path.join(ctx.profile.data, "worlds", world, "world.json"));
}

/** Launch behind the interlock and wait until the world (or the setup screen) is up. */
export async function startServer(ctx, { world, headless = false, timeoutMs = 180_000 } = {}) {
  const t0 = new Date();
  checkStartable(await serverState(ctx));
  if (world && !worldExists(ctx, world)) {
    throw refuse(`No world "${world}" in this profile's data path.`, "no-world", "`fvtt world:list --profile …` lists them.");
  }
  if (world && fs.existsSync(path.join(ctx.profile.data, "worlds", world, `${world}.lock`))) {
    throw refuse(`World "${world}" carries a package lock; locked worlds cannot be launched.`, "locked");
  }
  const args = [...ctx.profile.launchArgs, ...(world ? [`--world=${world}`] : [])];
  const proc = launch(ctx.install, { headless, args });
  note(`launched ${proc.kind} pid ${proc.pid}${world ? `, world ${world}` : ""}; waiting`);
  const client = new FoundryClient(ctx.profile);
  const status = await poll(async () => {
    const s = await client.status();
    if (!s.reachable) return null;
    return world ? (s.active && s.world === world ? s : null) : s;
  }, { timeoutMs, intervalMs: 1000 });
  if (!status) {
    throw new CliError(`Server did not become ready${world ? ` with world ${world}` : ""} within ${timeoutMs / 1000} s.`, {
      code: "not-ready", hint: "`fvtt logs --level=warn` shows what the server said.",
      details: { pid: proc.pid, log: readLog(ctx.profile.logs, { since: t0, level: "warn", limit: 20 }) }
    });
  }
  return { started: true, pid: proc.pid, kind: proc.kind, world: status.world ?? null, ms: Date.now() - t0.getTime() };
}
