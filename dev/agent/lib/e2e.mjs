/**
 * Layer 6 — sandbox end-to-end runner (PLAN_agentic_improvements.md §5 D), on fvtt's own CDP
 * layer (no Playwright, decision 2026-10-05).
 *
 * A run: fresh sandbox world `agent-e2e-<date>` → GM and player clients, each logged in in its own
 * isolated browser context → per suite: fixture reseeded, console buffers cleared, steps run →
 * `logs/e2e/<run>/report.json` + screenshots. Green runs delete the world; red ones keep it
 * (and the logged-in tabs) for a human or agent to inspect.
 *
 * Suites live in `dev/e2e/suites/<name>.mjs`:
 *   export default { name, clients: ["gm", "Gracz 1"], async run(t) { … } }
 * `t.client(name).eval(fn, ...args)` runs `fn` in that browser (serialised — no closures),
 * `t.step(label, fn)`, `t.assert(cond, msg, details)`, `t.waitFor(client, fn, opts)`,
 * `t.screenshot(client, label)` — screenshots are evidence for the agent to look at, never
 * pixel-diffed.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MODULE_ID } from "./config.mjs";
import { browserSession, waitGameReady } from "./cdp.mjs";
import { loginInContext, namedContext, resolveUser, foundryPages } from "./browser.mjs";
import { CliError, note, sleep } from "./output.mjs";
import { FoundryClient } from "./foundry-http.mjs";
import { createWorld, deleteWorld, listWorlds, shutdownWorldAndWait, DEFAULT_MODULES } from "./worlds.mjs";
import { disposeContexts } from "./browser.mjs";
import { startServer } from "./server.mjs";
import { agentWorldId } from "./guards.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(HERE, "../../..");
export const SUITES_DIR = path.join(MODULE_ROOT, "dev", "e2e", "suites");
const LOGS = path.join(MODULE_ROOT, "logs", "e2e");

export function suiteNames() {
  try {
    return fs.readdirSync(SUITES_DIR).filter(f => f.endsWith(".mjs") && !f.startsWith("_")).map(f => f.slice(0, -4)).sort();
  } catch {
    return [];
  }
}

export class AssertionError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}

/** One logged-in browser tab with a persistent flat CDP session: eval, console capture, screenshots. */
export class Client {
  constructor(browser, { name, user, targetId }) {
    Object.assign(this, { browser, name, user, targetId, errors: [] });
  }

  async attach() {
    const { sessionId } = await this.browser.send("Target.attachToTarget", { targetId: this.targetId, flatten: true });
    this.sessionId = sessionId;
    this.browser.listeners.add(msg => {
      if (msg.sessionId !== this.sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params.exceptionDetails;
        this.errors.push({ kind: "exception", text: (d.exception?.description ?? d.text ?? "").slice(0, 1500) });
      } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        const text = msg.params.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 1500);
        this.errors.push({ kind: "console.error", text });
      }
    });
    await this.send("Runtime.enable");
    await this.send("Page.enable");
  }

  send(method, params = {}, opts = {}) {
    return this.browser.send(method, params, { ...opts, sessionId: this.sessionId });
  }

  /** Run `fn` (a function; serialised, so no closures) with JSON arguments in this browser. */
  async eval(fn, ...args) {
    // A Document (e.g. what combat.nextTurn() resolves to) cannot cross by value — "Object reference
    // chain is too long" — so documents come back as their identity.
    const expression = `(async () => {
      const v = await (${typeof fn === "function" ? fn.toString() : fn})(...${JSON.stringify(args)});
      return v && typeof v === "object" && v.documentName ? { documentName: v.documentName, id: v.id, uuid: v.uuid } : v;
    })()`;
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true, timeout: 120_000 }, { timeoutMs: 130_000 });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`[${this.name}] ${(d.exception?.description ?? d.text ?? "").split("\n").slice(0, 4).join(" | ")}`);
    }
    return r.result.value;
  }

  async screenshot(file) {
    await this.send("Page.bringToFront").catch(() => {});
    await sleep(300);
    const { data } = await this.send("Page.captureScreenshot", { format: "jpeg", quality: 70 }, { timeoutMs: 20_000 });
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    return file;
  }

  /**
   * A real left click on the canvas at a scene point: pan there, convert to client pixels, and
   * dispatch genuine mouse input through CDP — what pickers listening for `pointerdown` on the
   * canvas view need (a synthetic DOM event would not carry the right target/coordinates).
   */
  async clickCanvas(point) {
    await this.send("Page.bringToFront").catch(() => {});
    const at = await this.eval(p => {
      canvas.pan({ x: p.x, y: p.y });
      const c = canvas.clientCoordinatesFromCanvas(p);
      return { x: Math.round(c.x), y: Math.round(c.y), topIsCanvas: document.elementFromPoint(c.x, c.y) === canvas.app.view };
    }, point);
    if (!at.topIsCanvas) throw new AssertionError(`Something covers the canvas at ${JSON.stringify(point)} in ${this.name}'s view.`, at);
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await this.send("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
    }
    return at;
  }

  async reload() {
    await this.send("Runtime.evaluate", { expression: "window.__fvttStale = true" });
    await this.send("Page.reload", { ignoreCache: true });
    await waitGameReady(this.browser, this.targetId, { extra: "!!g.neuroshima" });
  }

  drainErrors() {
    return this.errors.splice(0);
  }
}

/** The `t` object a suite's run() receives. */
class SuiteContext {
  constructor({ run, suite, clients, ctx, fixture }) {
    Object.assign(this, { run, suite, clients, ctx, profile: ctx.profile, fixture, moduleRoot: MODULE_ROOT, steps: [], screenshots: [], notes: [] });
  }

  client(name) {
    const c = this.clients.get(name);
    if (!c) throw new Error(`Suite ${this.suite.name} did not declare client "${name}" (clients: ${[...this.clients.keys()].join(", ")}).`);
    return c;
  }

  get gm() {
    return this.client("gm");
  }

  log(...parts) {
    this.notes.push(parts.join(" "));
    note(`  ${this.suite.name}: ${parts.join(" ")}`);
  }

  assert(cond, message, details) {
    if (!cond) throw new AssertionError(message, details);
  }

  equal(actual, expected, message) {
    if (actual !== expected) throw new AssertionError(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`, { actual, expected });
  }

  async waitFor(client, fn, { timeoutMs = 15_000, intervalMs = 250, args = [], message = "condition" } = {}) {
    const end = Date.now() + timeoutMs;
    let last;
    while (Date.now() < end) {
      last = await client.eval(fn, ...args);
      if (last) return last;
      await sleep(intervalMs);
    }
    throw new AssertionError(`Timed out after ${timeoutMs} ms waiting for ${message}.`, { last });
  }

  async screenshot(clientName, label) {
    const n = String(this.screenshots.length + 1).padStart(2, "0");
    const file = path.join(this.run.dir, `${this.suite.name}-${n}-${clientName.replace(/\W+/g, "_")}-${label.replace(/\W+/g, "_")}.jpg`);
    await this.client(clientName).screenshot(file);
    this.screenshots.push(path.relative(MODULE_ROOT, file).replaceAll("\\", "/"));
    return file;
  }

  async step(label, fn) {
    const t0 = Date.now();
    note(`  ${this.suite.name} › ${label}`);
    try {
      const value = await fn();
      this.steps.push({ label, ok: true, ms: Date.now() - t0 });
      return value;
    } catch (err) {
      this.steps.push({ label, ok: false, ms: Date.now() - t0, error: err.message, details: err.details });
      throw err;
    }
  }
}

const contextName = name => `e2e-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** Log every needed user in, each in its own isolated context, and attach a Client. */
async function openClients(ctx, browser, names) {
  const clients = new Map();
  for (const name of names) {
    const user = name === "gm" ? await resolveUser(ctx, null) : await resolveUser(ctx, name);
    const { id } = await namedContext(browser, ctx.profile.name, contextName(name));
    const inCtx = (await foundryPages(ctx, browser)).filter(p => p.context === id);
    const res = await loginInContext(ctx, browser, { userId: user.id, browserContextId: id, targetIds: inCtx.map(p => p.targetId), urls: inCtx.map(p => p.url) });
    const client = new Client(browser, { name, user: user.name, targetId: res.pages[0] });
    await client.attach();
    // The working tree's current code, not whatever ES modules the tab cached earlier.
    await client.reload();
    clients.set(name, client);
  }
  return clients;
}

/**
 * Close what a fresh login leaves floating: the User Configuration window Foundry opens for a
 * player who has no character yet (the fixture assigns one after login), the GM's welcome tour,
 * any other framed popup. Frameless UI (sidebar, hotbar, controls) stays. Without this a popup
 * sits over the canvas and real clicks land on it.
 */
async function settle(client) {
  await client.eval(async () => {
    foundry.nue?.Tour?.tourInProgress?.exit?.();
    for (const app of [...foundry.applications.instances.values()]) {
      if (app.hasFrame && app.rendered) await app.close({ animate: false });
    }
    for (const w of Object.values(ui.windows ?? {})) await w.close?.({ force: true });
  });
}

async function seed(gm, fixture) {
  const url = `/agent-e2e/fixtures/${fixture}.mjs?v=${Date.now()}`;
  return gm.eval(`(url, moduleId) => import(url).then(m => m.default({ moduleId }))`, url, MODULE_ID);
}

/**
 * Run suites against the running sandbox world.
 * @returns {Promise<object>} the report (also written to logs/e2e/<run>/report.json)
 */
export async function runSuites(ctx, { suites, world, quench = false, logSince = null }) {
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  const run = { id: runId, dir: path.join(LOGS, runId) };
  fs.mkdirSync(run.dir, { recursive: true });

  const loaded = [];
  for (const name of suites) {
    const file = path.join(SUITES_DIR, `${name}.mjs`);
    if (!fs.existsSync(file)) throw new CliError(`No suite "${name}".`, { code: "usage", details: { available: suiteNames() } });
    loaded.push((await import(`${pathToFileURL(file).href}?v=${Date.now()}`)).default);
  }
  const needed = [...new Set(["gm", ...loaded.flatMap(s => s.clients ?? [])])];

  const browser = await browserSession(ctx.cdp);
  const report = { run: runId, world, startedAt: new Date().toISOString(), suites: [] };
  run.startedAt = logSince ?? new Date(); // server-log window: from world creation when there was one
  try {
    const clients = await openClients(ctx, browser, needed);
    report.clients = [...clients.values()].map(c => ({ name: c.name, user: c.user }));
    for (const suite of loaded) {
      const t0 = Date.now();
      for (const c of clients.values()) c.drainErrors();
      const fixture = suite.fixture === null ? null : await seed(clients.get("gm"), suite.fixture ?? "skirmish");
      await sleep(500); // let the seed's broadcasts (character assignment, scene) reach every client
      for (const c of clients.values()) await settle(c);
      const t = new SuiteContext({ run, suite, clients, ctx, fixture });
      let error = null;
      try {
        await suite.run(t);
      } catch (err) {
        error = { message: err.message, details: err.details, assertion: err instanceof AssertionError };
        try { await t.screenshot("gm", "failure"); } catch { /* best effort */ }
      }
      const consoleErrors = Object.fromEntries([...clients.values()].map(c => [c.name, c.drainErrors()]).filter(([, e]) => e.length));
      const allowed = suite.allowConsoleErrors ?? [];
      const unexpected = Object.values(consoleErrors).flat().filter(e => !allowed.some(re => re.test(e.text)));
      const ok = !error && (suite.failOnConsoleErrors === false || unexpected.length === 0);
      report.suites.push({
        name: suite.name, ok, ms: Date.now() - t0, error, steps: t.steps,
        consoleErrors, screenshots: t.screenshots, notes: t.notes
      });
      note(`${ok ? "PASS" : "FAIL"} ${suite.name} (${Date.now() - t0} ms)`);
    }
    if (quench) {
      // The module's Quench batches inside this world (release gate: the "recommended" world).
      const t0 = Date.now();
      try {
        const r = await clients.get("gm").eval(() => game.neuroshima.tests.run());
        report.quench = { ok: r.failed === 0, total: r.total, passed: r.passed, failed: r.failed, failures: r.failures.slice(0, 20), ms: Date.now() - t0 };
      } catch (err) {
        report.quench = { ok: false, error: err.message, ms: Date.now() - t0 };
      }
      note(`${report.quench.ok ? "PASS" : "FAIL"} quench ${report.quench.passed ?? "?"}/${report.quench.total ?? "?"}`);
    }
  } finally {
    browser.close();
  }
  report.ok = report.suites.every(s => s.ok) && (report.quench?.ok ?? true);
  report.finishedAt = new Date().toISOString();
  report.reportFile = path.relative(MODULE_ROOT, path.join(run.dir, "report.json")).replaceAll("\\", "/");
  fs.writeFileSync(path.join(run.dir, "report.json"), JSON.stringify(report, null, 2));
  return report;
}

/**
 * The whole `fvtt e2e` flow, reusable by the release gate: a fresh `agent-<slug>-<date>` world with
 * `modules` enabled (unless `reuse` and it is already running), the suites (+ Quench if asked),
 * then — when green and not `keep` — world and browser contexts deleted.
 */
export async function runE2E(ctx, { suites = suiteNames(), slug = "e2e", modules = DEFAULT_MODULES, keep = false, reuse = false, quench = false } = {}) {
  const id = agentWorldId(slug);
  const t0 = new Date();
  const client = new FoundryClient(ctx.profile);
  const st = await client.status();
  const exists = listWorlds(ctx).find(w => w.id === id);
  if (!(reuse && exists && st.active && st.world === id)) {
    if (exists?.agent) {
      if (st.active && st.world === id) await shutdownWorldAndWait(ctx, client);
      await deleteWorld(ctx, id);
      await disposeContexts(ctx);
    }
    await createWorld(ctx, { slug, modules, startServer });
  }
  const report = await runSuites(ctx, { suites, world: id, quench, logSince: t0 });
  let cleanup = null;
  if (report.ok && !keep) {
    await shutdownWorldAndWait(ctx, client);
    cleanup = { world: (await deleteWorld(ctx, id)).deleted, contexts: await disposeContexts(ctx) };
  }
  return {
    ok: report.ok, world: id, kept: !cleanup, report: report.reportFile, quench: report.quench ?? null,
    suites: report.suites.map(x => ({
      name: x.name, ok: x.ok, ms: x.ms, failedStep: x.steps.find(y => !y.ok)?.label ?? null,
      error: x.error?.message ?? null, consoleErrors: Object.fromEntries(Object.entries(x.consoleErrors).map(([k, v]) => [k, v.length])),
      screenshots: x.screenshots.length
    }))
  };
}
