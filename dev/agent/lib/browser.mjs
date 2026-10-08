/**
 * Browser sessions (D8): log any page or isolated browser context into a world as any user,
 * and put every Foundry tab back where it was after a restart.
 *
 * The admin password never reaches the browser: fvtt authenticates as admin over HTTP,
 * `loginAs` turns that HTTP session into a logged-in session of the target user, and the
 * session id is handed to Chrome as the `session` cookie. Foundry sessions are in-memory and
 * die with the server (and after 24 h), so this is also the cure for "landed on /join".
 */

import { FILES, readJson, writeJson } from "./config.mjs";
import { FoundryClient } from "./foundry-http.mjs";
import {
  browserSession, pages, isFoundryPage, describePage, evaluate, setSessionCookie,
  createContext, contextExists, openPage, navigate, hardReload, waitGameReady
} from "./cdp.mjs";
import { CliError, note } from "./output.mjs";

const GM_ROLE = 3; // CONST.USER_ROLES.ASSISTANT — User#isGM threshold

export async function defaultContextIds(browser) {
  const { browserContextIds } = await browser.send("Target.getBrowserContexts");
  return new Set(browserContextIds); // the default context is the one NOT in this list
}

/** This profile's Foundry pages, each with who is logged in there (null on /join). */
export async function foundryPages(ctx, browser) {
  const nonDefault = await defaultContextIds(browser);
  const out = [];
  for (const t of (await pages(browser)).filter(t => isFoundryPage(t, ctx.profile))) {
    let who = null;
    try {
      who = await evaluate(browser, t.targetId,
        "({route: location.pathname, userId: globalThis.game?.user?.id ?? null, userName: globalThis.game?.user?.name ?? null, ready: !!globalThis.game?.ready})",
        { timeoutMs: 5000 });
    } catch { /* page busy or crashed: report without a user */ }
    out.push({ ...describePage(t), url: t.url, isDefaultContext: !nonDefault.has(t.browserContextId), ...who });
  }
  return out;
}

/**
 * Users logged in from more than one ready page of a profile. Foundry treats each page as a client
 * of that user, so "active GM only" automation runs once per page — the silent double-run of the
 * 2026-10-05 and 2026-10-07 field tests.
 */
export function duplicateSessions(list) {
  const byUser = new Map();
  for (const p of list.filter(x => x.ready && x.userId)) {
    const e = byUser.get(p.userId) ?? { userId: p.userId, userName: p.userName, pages: [] };
    e.pages.push({ targetId: p.targetId, context: p.context, isDefaultContext: p.isDefaultContext });
    byUser.set(p.userId, e);
  }
  return [...byUser.values()].filter(e => e.pages.length > 1);
}

/** Snapshot before a restart: one entry per browser context that had a logged-in Foundry page. */
export async function rememberSessions(ctx) {
  let browser;
  try {
    browser = await browserSession(ctx.cdp);
  } catch {
    return { cdp: false, contexts: [] };
  }
  try {
    const byContext = new Map();
    for (const p of await foundryPages(ctx, browser)) {
      const entry = byContext.get(p.context) ?? { context: p.context, isDefaultContext: p.isDefaultContext, userId: null, userName: null, pages: [] };
      entry.pages.push({ targetId: p.targetId, url: p.url });
      if (p.userId) Object.assign(entry, { userId: p.userId, userName: p.userName });
      byContext.set(p.context, entry);
    }
    return { cdp: true, contexts: [...byContext.values()].filter(c => c.userId) };
  } finally {
    browser.close();
  }
}

/** After a restart: log each remembered context back in as its user and reopen /game. */
export async function restoreSessions(ctx, remembered) {
  if (!remembered?.contexts?.length) return [];
  const browser = await browserSession(ctx.cdp);
  const results = [];
  try {
    for (const c of remembered.contexts) {
      try {
        const res = await loginInContext(ctx, browser, {
          userId: c.userId, browserContextId: c.isDefaultContext ? null : c.context,
          targetIds: c.pages.map(p => p.targetId), urls: c.pages.map(p => p.url)
        });
        results.push({ user: c.userName, ok: true, pages: res.pages.length });
      } catch (err) {
        results.push({ user: c.userName, ok: false, error: err.message });
      }
    }
  } finally {
    browser.close();
  }
  return results;
}

/** Resolve `--user` (id or case-insensitive name) against the world's users. */
export async function resolveUser(ctx, wanted) {
  const users = await new FoundryClient(ctx.profile).users();
  if (!users.length) throw new CliError("No users — is a world running on this profile?", { code: "no-world" });
  // Default: the profile's `loginUser` from the local config (campaign: "MCP", 2026-10-05 —
  // agent work stays attributable, apart from the GM's own user), else the only full GM.
  wanted ??= ctx.cfg?.[ctx.profile.name]?.loginUser ?? null;
  if (!wanted) {
    const gms = users.filter(u => u.role >= 4);
    if (gms.length === 1) return gms[0];
    throw new CliError(`Pick a user with --user; GMs here: ${gms.map(u => u.name).join(", ") || "none"}.`, {
      code: "usage", details: { users: users.map(u => ({ name: u.name, role: u.role })) }
    });
  }
  const w = String(wanted).toLowerCase();
  const user = users.find(u => u.id === wanted) ?? users.find(u => u.name.toLowerCase() === w);
  if (!user) {
    throw new CliError(`No user "${wanted}".`, { code: "usage", details: { users: users.map(u => u.name) } });
  }
  return { ...user, gm: user.role >= GM_ROLE };
}

/**
 * Core of `login` and session restore: one HTTP loginAs, the cookie into the context for
 * every host its pages use, then those pages (or a new one) to /game, waiting for ready.
 */
export async function loginInContext(ctx, browser, { userId, browserContextId = null, targetIds = [], urls = [] }) {
  const sessionId = await new FoundryClient(ctx.profile).loginAs(userId);
  const base = new URL(ctx.profile.baseUrl);
  const hosts = new Map([[base.host, ctx.profile.baseUrl]]);
  for (const u of urls) {
    try { const x = new URL(u); hosts.set(x.host, `${x.protocol}//${x.host}${ctx.profile.routePrefix}`); } catch { /* skip */ }
  }
  for (const origin of hosts.values()) {
    await setSessionCookie(browser, { pageUrl: origin, routePrefix: ctx.profile.routePrefix, sessionId, browserContextId });
  }
  const live = new Set((await pages(browser)).map(t => t.targetId));
  const targets = targetIds.filter(id => live.has(id));
  if (!targets.length) {
    targets.push(await openPage(browser, `${ctx.profile.baseUrl}/game`, browserContextId ?? undefined));
  } else {
    for (const [i, id] of targets.entries()) {
      const origin = urls[i] ? new URL(urls[i]).origin + ctx.profile.routePrefix : ctx.profile.baseUrl;
      await navigate(browser, id, `${origin}/game`);
    }
  }
  let ready;
  try {
    ready = await waitGameReady(browser, targets[0], { timeoutMs: 90_000 });
  } catch (err) {
    // A tab restored right after a server restart sometimes sits black on /game and never boots
    // (sandbox `packs`, 2026-10-07). Reload THIS tab once — opening another one instead left two
    // clients of the same GM. A real logout (/join) is not retried: the cookie was just set.
    if (err.code !== "not-ready") throw err;
    note("tab did not become ready — hard reload, once");
    await hardReload(browser, targets[0]);
    ready = await waitGameReady(browser, targets[0], { timeoutMs: 90_000 });
  }
  return { pages: targets, ready };
}

/** Named isolated contexts survive between commands; the registry maps name → context id. */
export async function namedContext(browser, profileName, name) {
  const all = readJson(FILES.contexts) ?? {};
  const key = `${profileName}:${name}`;
  if (all[key] && await contextExists(browser, all[key].browserContextId)) return { id: all[key].browserContextId, created: false };
  const id = await createContext(browser);
  all[key] = { browserContextId: id, created: new Date().toISOString() };
  writeJson(FILES.contexts, all);
  note(`created isolated browser context "${name}"`);
  return { id, created: true };
}

/**
 * Dispose every isolated context fvtt created for a profile (closing their pages) and forget
 * them. Contexts the human or chrome-devtools MCP made are not in the registry and stay.
 */
export async function disposeContexts(ctx) {
  const all = readJson(FILES.contexts) ?? {};
  const prefix = `${ctx.profile.name}:`;
  const mine = Object.entries(all).filter(([k]) => k.startsWith(prefix));
  if (!mine.length) return [];
  let browser;
  try {
    browser = await browserSession(ctx.cdp);
  } catch {
    return [{ skipped: "Chrome DevTools port not answering; contexts left as they are" }];
  }
  const out = [];
  try {
    for (const [key, { browserContextId }] of mine) {
      if (await contextExists(browser, browserContextId)) {
        await browser.send("Target.disposeBrowserContext", { browserContextId });
      }
      delete all[key];
      out.push(key.slice(prefix.length));
    }
  } finally {
    browser.close();
  }
  writeJson(FILES.contexts, all);
  return out;
}
