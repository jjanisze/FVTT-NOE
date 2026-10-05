/**
 * Cross-agent mutex for anything that stops a Foundry server or rewrites its packs (§5 G).
 *
 * One exclusive lock per profile (`locks/<profile>.json`) plus any number of shared locks
 * (`locks/<profile>.shared.<pid>.json`, taken by Quench runs so a rebuild waits for them).
 * A lock belongs to the CLI process that took it; it is stale as soon as that pid is gone,
 * so a crashed or killed command never wedges the next agent.
 */

import fs from "node:fs";
import path from "node:path";
import { FILES } from "./config.mjs";
import { isAlive } from "./proc.mjs";
import { refuse, sleep } from "./output.mjs";

const exclusiveFile = profile => path.join(FILES.locks, `${profile}.json`);
const sharedPrefix = profile => `${profile}.shared.`;

function owner(purpose) {
  return {
    pid: process.pid,
    owner: process.env.FVTT_AGENT || process.env.CLAUDE_CODE_SESSION_ID || `pid:${process.pid}`,
    purpose,
    since: new Date().toISOString(),
    cwd: process.cwd()
  };
}

function readLock(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function removeIfStale(file) {
  const lock = readLock(file);
  if (lock && isAlive(lock.pid)) return lock;
  fs.rmSync(file, { force: true });
  return null;
}

/** Live holders of a profile's locks. */
export function holders(profile) {
  fs.mkdirSync(FILES.locks, { recursive: true });
  const exclusive = fs.existsSync(exclusiveFile(profile)) ? removeIfStale(exclusiveFile(profile)) : null;
  const shared = fs.readdirSync(FILES.locks)
    .filter(f => f.startsWith(sharedPrefix(profile)))
    .map(f => removeIfStale(path.join(FILES.locks, f)))
    .filter(Boolean);
  return { exclusive, shared };
}

const held = new Set();
function releaseAll() {
  for (const file of held) fs.rmSync(file, { force: true });
  held.clear();
}
process.on("exit", releaseAll);

async function acquire(profile, purpose, { shared, waitMs }) {
  fs.mkdirSync(FILES.locks, { recursive: true });
  const end = Date.now() + waitMs;
  for (;;) {
    const h = holders(profile);
    const blocker = shared ? h.exclusive : (h.exclusive ?? h.shared[0]);
    if (blocker?.pid === process.pid) return; // re-entrant within one command
    if (!blocker) {
      const file = shared
        ? path.join(FILES.locks, `${sharedPrefix(profile)}${process.pid}.json`)
        : exclusiveFile(profile);
      try {
        fs.writeFileSync(file, JSON.stringify(owner(purpose), null, 2), { flag: "wx" });
        held.add(file);
        // A shared lock may race an exclusive one taken between our check and write.
        if (shared && holders(profile).exclusive) {
          fs.rmSync(file, { force: true });
          held.delete(file);
        } else {
          return;
        }
      } catch (err) {
        if (err.code !== "EEXIST") throw err;
      }
    }
    if (Date.now() >= end) {
      throw refuse(`The ${profile} server is busy: ${blocker?.purpose ?? "another command"} (owner ${blocker?.owner}, pid ${blocker?.pid}, since ${blocker?.since}).`,
        "busy", "Wait for it to finish (or pass --wait=<seconds>); `fvtt doctor` shows the holder.", { blocker });
    }
    await sleep(1000);
  }
}

export const lockExclusive = (profile, purpose, waitMs = 0) => acquire(profile, purpose, { shared: false, waitMs });
export const lockShared = (profile, purpose, waitMs = 0) => acquire(profile, purpose, { shared: true, waitMs });
export const unlockAll = releaseAll;
