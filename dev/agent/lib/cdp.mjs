/**
 * Chrome DevTools Protocol, just enough for fvtt: find Foundry pages, evaluate in them,
 * give a page (or an isolated browser context) a Foundry session cookie, open pages.
 *
 * It attaches to the user's already-running Chrome — the same endpoint chrome-devtools MCP
 * uses (config.cdpUrl). It never launches, closes or restarts Chrome (§4).
 */

import { CliError, sleep } from "./output.mjs";

async function getJson(url, timeoutMs = 4000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** `/json/version` or null when Chrome's debugging port is not answering. */
export async function browserVersion(cdp) {
  if (!cdp) return null;
  try {
    return await getJson(`${cdp}/json/version`);
  } catch {
    return null;
  }
}

export function requireCdp(cdp) {
  if (!cdp) {
    throw new CliError("No Chrome DevTools endpoint configured.", {
      code: "no-cdp", hint: "Run `npm run fvtt -- init --mcp-json=<path>` so fvtt reads the chrome-devtools browserUrl."
    });
  }
  return cdp;
}

export class CdpSession {
  static async open(wsUrl) {
    const s = new CdpSession(wsUrl);
    await s.ready;
    return s;
  }

  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.ws = new WebSocket(wsUrl);
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = e => reject(new CliError(`CDP connection failed: ${e.message ?? "error"}`, { code: "cdp-down" }));
    });
    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(String(data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new CliError(`CDP ${msg.error.message}`, { code: "cdp-error", details: msg.error }));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    };
    this.ws.onclose = () => {
      for (const { reject } of this.pending.values()) reject(new CliError("CDP connection closed.", { code: "cdp-down" }));
      this.pending.clear();
    };
  }

  send(method, params = {}, { timeoutMs = 30_000, sessionId } = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CliError(`CDP ${method} timed out after ${timeoutMs} ms.`, { code: "cdp-timeout" }));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: v => { clearTimeout(timer); resolve(v); },
        reject: e => { clearTimeout(timer); reject(e); }
      });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  close() {
    try { this.ws.close(); } catch { /* already closed */ }
  }
}

export async function browserSession(cdp) {
  const v = await browserVersion(requireCdp(cdp));
  if (!v) {
    throw new CliError("Chrome's DevTools port is not answering.", {
      code: "cdp-down",
      hint: "Chrome must be started by the human with remote debugging (the launcher in the campaign vault, chrome-debug)."
    });
  }
  return CdpSession.open(v.webSocketDebuggerUrl);
}

/** All page targets, with their browser context (default context = isDefault). */
export async function pages(browser) {
  const { targetInfos } = await browser.send("Target.getTargets");
  return targetInfos.filter(t => t.type === "page");
}

/** Pages served by this profile's Foundry server (matched on port, and route prefix if any). */
export function isFoundryPage(target, profile) {
  try {
    const u = new URL(target.url);
    return ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
      && Number(u.port) === profile.port
      && u.pathname.startsWith(`${profile.routePrefix}/`);
  } catch {
    return false;
  }
}

/** A path-only view of a page for printing: never the host/port (feedback_no_network_specifics). */
export function describePage(t) {
  let route = "";
  try { route = new URL(t.url).pathname; } catch { /* about:blank etc. */ }
  return { targetId: t.targetId, title: t.title, route, context: t.browserContextId };
}

/** Run `fn` with a flat CDP session attached to one page target. */
export async function withPage(browser, targetId, fn) {
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  try {
    return await fn({
      send: (method, params, opts) => browser.send(method, params, { ...opts, sessionId }),
      sessionId
    });
  } finally {
    await browser.send("Target.detachFromTarget", { sessionId }).catch(() => {});
  }
}

/** Evaluate an expression (awaiting promises) in a page; returns the JSON value. */
export async function evaluate(browser, targetId, expression, { timeoutMs = 60_000 } = {}) {
  return withPage(browser, targetId, async page => {
    const r = await page.send("Runtime.evaluate", {
      expression, awaitPromise: true, returnByValue: true, userGesture: true, timeout: timeoutMs
    }, { timeoutMs: timeoutMs + 5000 });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new CliError(`Page threw: ${d.exception?.description ?? d.text}`.slice(0, 2000), { code: "page-exception" });
    }
    return r.result.value;
  });
}

/** Give a browser context (default when omitted) a Foundry session cookie for `pageUrl`'s origin. */
export async function setSessionCookie(browser, { pageUrl, routePrefix, sessionId, browserContextId }) {
  const u = new URL(pageUrl);
  await browser.send("Storage.setCookies", {
    ...(browserContextId ? { browserContextId } : {}),
    cookies: [{
      name: "session", value: sessionId, domain: u.hostname, path: routePrefix || "/",
      httpOnly: true, sameSite: "Strict", secure: u.protocol === "https:",
      expires: Math.floor(Date.now() / 1000) + 86_400
    }]
  });
}

/**
 * A browser context that survives this CLI process (`disposeOnDetach: false`), so the page
 * we open in it stays usable by chrome-devtools MCP after fvtt exits.
 */
export async function createContext(browser) {
  const { browserContextId } = await browser.send("Target.createBrowserContext", { disposeOnDetach: false });
  return browserContextId;
}

export async function contextExists(browser, browserContextId) {
  const { browserContextIds } = await browser.send("Target.getBrowserContexts");
  return browserContextIds.includes(browserContextId);
}

export async function openPage(browser, url, browserContextId) {
  const { targetId } = await browser.send("Target.createTarget", {
    url, ...(browserContextId ? { browserContextId } : {})
  });
  return targetId;
}

/**
 * Right after a reload or navigation the OLD document can still answer `game.ready === true`;
 * a caller that trusted it went on while the page was booting, and the next socket broadcasts
 * blew up in core's handlers (found by e2e, 2026-10-05). So every reload/navigation first marks
 * the current document stale, and waitGameReady only accepts a document without the mark.
 */
const STALE = "__fvttStale";
async function markStale(page) {
  await page.send("Runtime.evaluate", { expression: `window.${STALE} = true` }).catch(() => {});
}

export async function navigate(browser, targetId, url) {
  return withPage(browser, targetId, async page => {
    await markStale(page);
    return page.send("Page.navigate", { url });
  });
}

/** Reload bypassing the cache — ES modules included, which is what a code change needs. */
export async function hardReload(browser, targetId) {
  return withPage(browser, targetId, async page => {
    await markStale(page);
    return page.send("Page.reload", { ignoreCache: true });
  });
}

/**
 * Wait until a page has a ready `game` (optionally also `extra` truthy), then return a
 * snapshot. Re-attaches each poll: a reload or navigation drops the previous attachment.
 */
export async function waitGameReady(browser, targetId, { timeoutMs = 120_000, extra = "true" } = {}) {
  const probe = `(() => {
    const g = globalThis.game;
    const ready = !window.${STALE} && !!(g && g.ready && (${extra}));
    return { route: location.pathname, ready,
      user: ready ? { id: g.user.id, name: g.user.name, isGM: g.user.isGM } : null,
      world: ready ? g.world.id : null,
      system: ready ? g.system.version : null,
      module: ready ? g.modules.get("neuroshima-2026-overrides")?.version ?? null : null };
  })()`;
  const start = Date.now();
  const end = start + timeoutMs;
  let last = null;
  while (Date.now() < end) {
    try {
      last = await evaluate(browser, targetId, probe, { timeoutMs: 5000 });
      if (last?.ready) return last;
      // Right after a navigation the old document may still answer; only a page that
      // stays on /join is really logged out.
      if (Date.now() - start > 5000 && (last?.route?.endsWith("/join") || last?.route?.endsWith("/auth"))) {
        throw new CliError(`Page is on ${last.route} — not logged in.`, {
          code: "not-logged-in", hint: "Run `npm run fvtt -- login` (add --user to pick who)."
        });
      }
    } catch (err) {
      if (err.code === "not-logged-in") throw err;
      last = { error: err.message };
    }
    await sleep(1000);
  }
  throw new CliError("Timed out waiting for game.ready.", { code: "not-ready", details: last });
}
