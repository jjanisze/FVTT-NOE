/**
 * Release sandbox run (§5 E step 3): the module exactly as a user installs it — extracted from the
 * release zip into the `release` data path (own port, concurrent with campaign and dev sandbox),
 * dnd5e copied from the campaign install (the version the module claims to verify), then:
 *   - "bare" world: the module alone — every e2e suite;
 *   - "recommended" world: + Quench, Sequencer, Splatter — every e2e suite and the Quench batches.
 * Green worlds are deleted; a red one is kept with its server running, for inspection.
 */

import { cdpUrl, installPaths, loadConfig, MODULE_ID, profileDataPath, readMode, resolveProfile } from "./config.mjs";
import { checkMode } from "./guards.mjs";
import { lockExclusive } from "./mutex.mjs";
import { initSandbox } from "./sandbox.mjs";
import { serverState, stopServer } from "./server.mjs";
import { runE2E } from "./e2e.mjs";

export const RECOMMENDED = ["quench", "sequencer", "splatter"];

export async function runReleaseSandbox({ zipPath, moduleRoot }) {
  const cfg = loadConfig();
  const mode = readMode();
  checkMode(mode, "release:check");
  await lockExclusive("release", "release:check", 300_000);
  const base = { cfg, install: installPaths(cfg), cdp: cdpUrl(cfg), mode, opts: {} };

  // The module folder is about to be replaced and a running server holds its packs.
  let stoppedBefore = null;
  try {
    const ctx = { ...base, profile: resolveProfile(cfg, "release") };
    const s = await serverState(ctx);
    if (s.status.reachable || s.servers.length) stoppedBefore = (await stopServer(ctx)).steps;
  } catch { /* not initialised yet */ }

  const init = await initSandbox({
    campaignData: profileDataPath(cfg, "campaign"), sandboxData: profileDataPath(cfg, "release"),
    moduleRoot, moduleZip: zipPath, modules: RECOMMENDED
  });
  const ctx = { ...base, profile: resolveProfile(cfg, "release") };

  const bare = await runE2E(ctx, { slug: "release-bare", modules: [MODULE_ID] });
  const recommended = await runE2E(ctx, { slug: "release-recommended", modules: [MODULE_ID, ...RECOMMENDED], quench: true });
  const ok = bare.ok && recommended.ok;
  const stopped = ok ? (await stopServer(ctx)).steps : null;
  return {
    ok, dataPath: ctx.profile.dataPath, stoppedBefore, stoppedAfter: stopped,
    installed: { module: init.modules[MODULE_ID], dnd5e: init.system?.dnd5e },
    bare, recommended,
    ...(ok ? {} : { hint: "The failing world and its tabs are kept: `npm run fvtt -- world:list --profile=release`, the e2e report, screenshots." })
  };
}
