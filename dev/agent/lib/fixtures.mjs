/**
 * Fixtures (§5 C): `dev/e2e/fixtures/<name>.mjs`, default export `async (ctx) => summary`, run
 * inside a GM page of a sandbox world. Code, not data, so every run starts identical and uses the
 * real APIs (compendium imports, token creation) the module itself relies on.
 *
 * Non-campaign data paths carry a `Data/agent-e2e` junction to `dev/e2e` (sandbox.mjs linkE2E), so a
 * fixture is served at `/agent-e2e/fixtures/<name>.mjs` and can import its helpers with ordinary
 * relative paths. The campaign never sees fixtures.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_ID } from "./config.mjs";
import { browserSession, evaluate, waitGameReady } from "./cdp.mjs";
import { foundryPages, loginInContext, namedContext, resolveUser } from "./browser.mjs";
import { CliError, refuse } from "./output.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../e2e/fixtures");

export function fixtureNames() {
  try {
    return fs.readdirSync(FIXTURES).filter(f => f.endsWith(".mjs") && !f.startsWith("_")).map(f => f.slice(0, -4));
  } catch {
    return [];
  }
}

/** A ready GM page in the profile's running world: an existing one, else a fresh "gm" context. */
export async function gmPage(ctx, browser) {
  const list = await foundryPages(ctx, browser);
  for (const p of list.filter(x => x.ready)) {
    if (await evaluate(browser, p.targetId, "!!game.user.isGM", { timeoutMs: 5000 }).catch(() => false)) return p.targetId;
  }
  const gm = await resolveUser(ctx, null);
  const { id } = await namedContext(browser, ctx.profile.name, "gm");
  const inCtx = list.filter(p => p.context === id);
  const res = await loginInContext(ctx, browser, { userId: gm.id, browserContextId: id, targetIds: inCtx.map(p => p.targetId), urls: inCtx.map(p => p.url) });
  return res.pages[0];
}

export async function seedFixture(ctx, { fixture }) {
  if (ctx.profile.isCampaign) throw refuse("Fixtures run in sandbox worlds only.", "campaign");
  if (!fixtureNames().includes(fixture)) {
    throw new CliError(`No fixture "${fixture}".`, { code: "usage", details: { available: fixtureNames() } });
  }
  const browser = await browserSession(ctx.cdp);
  try {
    const page = await gmPage(ctx, browser);
    await waitGameReady(browser, page, { extra: "!!g.neuroshima" });
    const url = `${ctx.profile.routePrefix}/agent-e2e/fixtures/${fixture}.mjs?v=${Date.now()}`;
    const summary = await evaluate(browser, page,
      `import(${JSON.stringify(url)}).then(m => m.default({ moduleId: ${JSON.stringify(MODULE_ID)} }))`, { timeoutMs: 300_000 });
    return { fixture, page, summary };
  } finally {
    browser.close();
  }
}
