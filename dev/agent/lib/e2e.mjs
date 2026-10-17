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
 * pixel-diffed. Inside the browser every client carries `window.__e2e` (lib/e2e-page.mjs): forced
 * d20 faces, roll-dialog and dialog clicks, chat-card clicks, bounded waits, `quiet()`.
 *
 * Between suites the harness waits for every client to go quiet and ends all combats before the
 * next fixture reseeds (a reseed racing the previous suite's last writes errored on the dead scene).
 * `traceWrites` records every document write with a short stack, per suite, next to the report.
 *
 * Console errors (PLAN_migracja_dnd5e6.md E0): every phase is drained into its own bucket — boot (clients
 * loading), late (after a suite ended, charged to that suite), seed (the fixture reseeding) and the suite
 * itself. Only the run-level allowlist (`KNOWN_CORE_ERRORS`, core teardown errors a reseed provokes) and a
 * suite's own `allowConsoleErrors` pass; any other error fails. Compatibility warnings (core and dnd5e
 * `logCompatibilityWarning`) are collected per phase with their caller — reported, not yet a failure (E10).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FILES, MODULE_ID, readJson } from "./config.mjs";
import { browserSession, cascadeWindows, waitGameReady } from "./cdp.mjs";
import { duplicateSessions, loginInContext, namedContext, resolveUser, foundryPages } from "./browser.mjs";
import { CliError, note, sleep } from "./output.mjs";
import { debugChrome } from "./proc.mjs";
import { FoundryClient } from "./foundry-http.mjs";
import { createWorld, deleteWorld, listWorlds, shutdownWorldAndWait, DEFAULT_MODULES } from "./worlds.mjs";
import { disposeContexts } from "./browser.mjs";
import { startServer } from "./server.mjs";
import { agentWorldId } from "./guards.mjs";
import { installE2E } from "./e2e-page.mjs";
import { DEEP_STACKS, knownCoreError, parseCompatWarning, stripOrigins, summariseCompat } from "./compat.mjs";

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
  constructor(browser, { name, user, targetId, trace = false, background = false }) {
    Object.assign(this, { browser, name, user, targetId, trace, background, errors: [], compat: [] });
  }

  /**
   * Make this window the one that takes input and renders. In the background (Chrome runs with the no-throttle
   * flags, `proc.mjs`) nothing moves: the page keeps rendering behind the GM's windows and believes it has focus
   * (`attach`), so a real mouse never reaches it. Otherwise the window comes to the front and its ticker restarts.
   * The settle wait stays in both modes: suites lean on it — two clicks on one spot without it fall inside core's
   * double-click window and open a sheet instead of selecting (nevada-art, 2026-10-17).
   */
  async front(settleMs = 150) {
    if (!this.background) await this.send("Page.bringToFront").catch(() => {});
    if (settleMs) await sleep(settleMs);
  }

  /** `window.__e2e` in this page (after every load — a reload drops it). */
  async install() {
    return this.eval(installE2E, { trace: this.trace });
  }

  /** Call one `window.__e2e` helper in this page: `client.helper("forceD20", [20])`. */
  helper(name, ...args) {
    return this.eval((n, a) => window.__e2e[n](...a), name, args);
  }

  async attach() {
    const { sessionId } = await this.browser.send("Target.attachToTarget", { targetId: this.targetId, flatten: true });
    this.sessionId = sessionId;
    // Origins (host:port) stripped from everything that lands in a report — paths are enough.
    const clean = s => stripOrigins(s).slice(0, 1500);
    this.browser.listeners.add(msg => {
      if (msg.sessionId !== this.sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params.exceptionDetails;
        this.errors.push({ kind: "exception", text: clean(d.exception?.description ?? d.text ?? "") });
      } else if (msg.method === "Runtime.consoleAPICalled") {
        // A compatibility warning is never a console error, even in core's ERROR compatibility mode.
        const compat = parseCompatWarning(msg.params.type, msg.params.args);
        if (compat) this.compat.push({ ...compat, client: this.name });
        else if (msg.params.type === "error") {
          this.errors.push({ kind: "console.error", text: clean(msg.params.args.map(a => a.value ?? a.description ?? "").join(" ")) });
        }
      }
    });
    await this.send("Runtime.enable");
    await this.send("Page.enable");
    // Deep enough stacks to name who read a deprecated getter through core's plumbing — from the next load on.
    await this.send("Page.addScriptToEvaluateOnNewDocument", { source: DEEP_STACKS }).catch(() => {});
    if (this.background) await this.send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
  }

  send(method, params = {}, opts = {}) {
    return this.browser.send(method, params, { ...opts, sessionId: this.sessionId });
  }

  /** Run `fn` (a function; serialised, so no closures) with JSON arguments in this browser. */
  async eval(fn, ...args) {
    // A Document (e.g. what combat.nextTurn() resolves to) or an Application (what sheet.close()
    // resolves to) cannot cross by value — "Object reference chain is too long" — so they come back
    // as their identity.
    const expression = `(async () => {
      const v = await (${typeof fn === "function" ? fn.toString() : fn})(...${JSON.stringify(args)});
      if (v && typeof v === "object" && v.documentName) return { documentName: v.documentName, id: v.id, uuid: v.uuid };
      if (v instanceof foundry.applications.api.ApplicationV2) return { application: v.constructor.name, id: v.id };
      return v;
    })()`;
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true, timeout: 120_000 }, { timeoutMs: 130_000 });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`[${this.name}] ${(d.exception?.description ?? d.text ?? "").split("\n").slice(0, 4).join(" | ")}`);
    }
    return r.result.value;
  }

  async screenshot(file) {
    await this.front(300);
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
    await this.front(); // a tab just made visible starts its ticker and resizes — let that land first
    const at = await this.eval(p => {
      canvas.pan({ x: p.x, y: p.y });
      // `pan` only moves the pivot; world transforms follow on the next render, which a hidden tab (every
      // isolated context but the front one) has not had — and the click arrives before one. Pickers read
      // `event.getLocalPosition(layer)`, i.e. the layer's cached transform: without this frame the click
      // landed where the view was before the pan (dnd5e's token placement put a drone one square off).
      canvas.app.render();
      const c = canvas.clientCoordinatesFromCanvas(p);
      return { x: Math.round(c.x), y: Math.round(c.y), topIsCanvas: document.elementFromPoint(c.x, c.y) === canvas.app.view };
    }, point);
    if (!at.topIsCanvas) throw new AssertionError(`Something covers the canvas at ${JSON.stringify(point)} in ${this.name}'s view.`, at);
    // `button` on a `mouseMoved` means "held during the move": "left" there made Chrome treat the press as
    // part of a drag (a `pointermove` with `buttons: 1`, no `pointerdown`) whenever the two were processed
    // together — the grenade picker then never heard the click.
    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x, y: at.y, button: "none", buttons: 0 });
    await sleep(30);
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x: at.x, y: at.y, button: "left", buttons: 1, clickCount: 1 });
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: at.x, y: at.y, button: "left", buttons: 0, clickCount: 1 });
    return at;
  }

  /**
   * A real key press through CDP — what core's keybindings hear. `code` as in `KeyboardEvent.code`: `Escape`,
   * `KeyW`/`KeyA`/`KeyS`/`KeyD` (v14 moves controlled tokens with WASD; the arrows only pan the canvas).
   * The page comes to the front first: a background tab's keydown would land, but its canvas would not render.
   */
  async pressKey(code) {
    const KEYS = {
      Escape: ["Escape", 27], ArrowLeft: ["ArrowLeft", 37], ArrowUp: ["ArrowUp", 38], ArrowRight: ["ArrowRight", 39],
      ArrowDown: ["ArrowDown", 40], KeyW: ["w", 87], KeyA: ["a", 65], KeyS: ["s", 83], KeyD: ["d", 68]
    };
    const [key, kc] = KEYS[code] ?? [code, 0];
    await this.front();
    // No `text`: a character would also be typed into whatever input has focus.
    const base = { key, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc };
    await this.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
    await sleep(60);
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  }

  async reload() {
    await this.send("Runtime.evaluate", { expression: "window.__fvttStale = true" });
    await this.send("Page.reload", { ignoreCache: true });
    await waitGameReady(this.browser, this.targetId, { extra: "!!g.neuroshima" });
    await this.install();
  }

  drainErrors() {
    return this.errors.splice(0);
  }

  drainCompat() {
    return this.compat.splice(0);
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

  /** Queue d20 faces in a client (`window.__e2e.forceD20`); undo with `client.helper("restoreDice")`. */
  d20(client, faces, opts = {}) {
    return client.helper("forceD20", faces, opts);
  }

  /** Every client (or the named ones) quiet: no socket request in flight, no canvas animation. */
  async quiet(names = [...this.clients.keys()], opts = {}) {
    return quietAll(names.map(n => this.client(n)), opts);
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

async function quietAll(clients, opts = {}) {
  const out = {};
  for (const c of clients) out[c.name] = await c.helper("quiet", opts).catch(err => ({ error: err.message }));
  return out;
}

/** Log every needed user in, each in its own isolated context, and attach a Client. */
async function openClients(ctx, browser, names, { trace = false } = {}) {
  const clients = new Map();
  // Background windows need Chrome's no-throttle flags; without them a client must come to the front to run.
  const chrome = (() => { try { return debugChrome(); } catch { return null; } })();
  const background = Boolean(chrome && !chrome.missing.length);
  note(background ? "clients run in the background (Chrome without throttling)"
    : `Chrome lacks ${chrome?.missing.join(" ") ?? "the no-throttle flags"} — clients come to the front for input and screenshots, and a covered one runs throttled (start Chrome with the vault's chrome-debug launcher)`);
  for (const name of names) {
    const user = name === "gm" ? await resolveUser(ctx, null) : await resolveUser(ctx, name);
    const { id } = await namedContext(browser, ctx.profile.name, contextName(name));
    const inCtx = (await foundryPages(ctx, browser)).filter(p => p.context === id);
    const res = await loginInContext(ctx, browser, { userId: user.id, browserContextId: id, targetIds: inCtx.map(p => p.targetId), urls: inCtx.map(p => p.url) });
    const client = new Client(browser, { name, user: user.name, targetId: res.pages[0], trace, background });
    await client.attach();
    // Runtime.enable replays the console of the document already loaded — the tab's earlier life, not this run.
    client.drainErrors();
    client.drainCompat();
    // The working tree's current code, not whatever ES modules the tab cached earlier.
    await client.reload();
    clients.set(name, client);
  }
  // No client window may sit fully covered by another — Chrome would throttle it as hidden (`cascadeWindows`).
  try {
    const first = clients.values().next().value;
    const area = await first.eval(() => ({ left: screen.availLeft ?? 0, top: screen.availTop ?? 0, width: screen.availWidth, height: screen.availHeight }));
    await cascadeWindows(browser, [...clients.values()].map(c => c.targetId), area);
  } catch (err) {
    note(`client windows left as they opened: ${err.message}`);
  }
  return clients;
}

/**
 * A user connected twice runs every "active GM only" automation twice (field test 2026-10-07: NPC
 * items dropped twice, ~10 min spent suspecting new code). Any other tab logged in as one of our
 * clients' users: fvtt's own stale contexts are disposed, anything else fails the run up front.
 */
async function evictDuplicates(ctx, browser, clients) {
  const ours = new Set([...clients.values()].map(c => c.targetId));
  const pagesNow = await foundryPages(ctx, browser);
  const users = new Set(pagesNow.filter(p => ours.has(p.targetId)).map(p => p.userId));
  const ourContexts = new Set(pagesNow.filter(p => ours.has(p.targetId)).map(p => p.context));
  const dups = duplicateSessions(pagesNow).filter(d => users.has(d.userId));
  const foreign = [];
  const registry = readJson(FILES.contexts) ?? {};
  const fvttContexts = new Map(Object.entries(registry).filter(([k]) => k.startsWith(`${ctx.profile.name}:`)).map(([k, v]) => [v.browserContextId, k]));
  for (const d of dups) {
    for (const p of d.pages.filter(x => !ours.has(x.targetId))) {
      if (ourContexts.has(p.context)) {
        note(`closing a second tab in one of the run's own contexts (${d.userName})`);
        await browser.send("Target.closeTarget", { targetId: p.targetId }).catch(() => {});
      } else if (fvttContexts.has(p.context)) {
        note(`closing stale context ${fvttContexts.get(p.context)} (also logged in as ${d.userName})`);
        await browser.send("Target.disposeBrowserContext", { browserContextId: p.context }).catch(() => {});
      } else {
        foreign.push({ user: d.userName, targetId: p.targetId, defaultContext: p.isDefaultContext });
      }
    }
  }
  if (foreign.length) {
    throw new CliError(`Another tab is logged in as ${[...new Set(foreign.map(f => f.user))].join(", ")} in this world — every active-GM automation would run twice.`, {
      code: "duplicate-session", hint: "Close those tabs (chrome-devtools close_page) and rerun.", details: { foreign }
    });
  }
}

/** Before a reseed: everything from the previous suite settled, no combat left running. */
async function settleBetweenSuites(clients) {
  const before = await quietAll(clients.values());
  await clients.get("gm").eval(async () => {
    for (const c of [...game.combats]) await c.delete();
  });
  const after = await quietAll(clients.values());
  return { before, after };
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

/** Every client's console errors since the last drain, by client name (clients with none left out). */
function drainAllErrors(clients) {
  return Object.fromEntries([...clients.values()].map(c => [c.name, c.drainErrors()]).filter(([, e]) => e.length));
}

function drainAllCompat(clients, phase) {
  return [...clients.values()].flatMap(c => c.drainCompat().map(w => ({ ...w, phase })));
}

/**
 * Split errors into those the run tolerates and the rest: the run-level allowlist of known core errors, then
 * the suite's own `allowConsoleErrors` patterns.
 * @returns {{unexpected: object[], allowed: Record<string, number>}}
 */
function sortErrors(byClient, suiteAllowed = []) {
  const unexpected = [];
  const allowed = {};
  for (const e of Object.values(byClient).flat()) {
    const known = knownCoreError(e.text) ?? (suiteAllowed.some(re => re.test(e.text)) ? "suite" : null);
    if (known) allowed[known] = (allowed[known] ?? 0) + 1;
    else unexpected.push(e);
  }
  return { unexpected, allowed };
}

/** `{client: errors}` → `{"<phase>:<client>": errors}`, so two phases can share one sort. */
const prefixed = (byClient, phase) => Object.fromEntries(Object.entries(byClient).map(([k, v]) => [`${phase}:${k}`, v]));

/**
 * What arrives after a suite ended (its last animations and broadcasts, the harness ending its combats) is that
 * suite's: recorded on its report entry, and an unexpected error turns it red.
 */
function chargeLate(entry, suite, errors, compat) {
  if (!entry) return;
  entry.lateConsoleErrors = errors;
  entry.compat = [...(entry.compat ?? []), ...compat];
  const { unexpected, allowed } = sortErrors(errors, suite?.allowConsoleErrors ?? []);
  entry.allowedConsoleErrors ??= {};
  for (const [k, n] of Object.entries(allowed)) entry.allowedConsoleErrors[k] = (entry.allowedConsoleErrors[k] ?? 0) + n;
  if (unexpected.length && suite?.failOnConsoleErrors !== false && entry.ok) {
    entry.ok = false;
    note(`FAIL ${entry.name}: ${unexpected.length} console error(s) after the suite ended`);
  }
}

/**
 * Run suites against the running sandbox world.
 * @returns {Promise<object>} the report (also written to logs/e2e/<run>/report.json)
 */
export async function runSuites(ctx, { suites, world, quench = false, logSince = null, traceWrites = false }) {
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
  const saveProgress = () => fs.writeFileSync(path.join(run.dir, "report.json"), JSON.stringify({ ...report, running: true }, null, 2));
  run.startedAt = logSince ?? new Date(); // server-log window: from world creation when there was one
  try {
    const clients = await openClients(ctx, browser, needed, { trace: traceWrites });
    await evictDuplicates(ctx, browser, clients);
    // The first fixture activates a scene and creates six walls immediately. With extra canvas
    // modules, their draw callbacks could run before Foundry initialized pendingRenderFlags.
    // Initialize an empty canvas for every client first; normal fixture reseeding removes it.
    const initialScene = await clients.get("gm").eval(async moduleId => {
      if (game.scenes.active) return game.scenes.active.id;
      const level = foundry.documents.BaseScene.metadata.defaultLevelId;
      const scene = await Scene.implementation.create({ name: "Agent · Start", width: 1000, height: 1000,
        initialLevel: level, levels: [{ _id: level, name: "Teren", elevation: { bottom: 0, top: null } }],
        flags: { [moduleId]: { fixture: "skirmish" } } });
      await scene.activate();
      return scene.id;
    }, MODULE_ID);
    for (const c of clients.values()) await c.eval(async id => {
      await window.__e2e.until(() => canvas.ready && canvas.scene?.id === id && canvas.pendingRenderFlags,
        { timeoutMs: 30_000, message: "the initial canvas render queues" });
    }, initialScene);
    report.clients = [...clients.values()].map(c => ({ name: c.name, user: c.user }));
    // Errors while the clients logged in, reloaded and drew the first canvas: the module's own start-up.
    {
      const consoleErrors = drainAllErrors(clients);
      const { unexpected, allowed } = sortErrors(consoleErrors);
      report.boot = { ok: unexpected.length === 0, consoleErrors, allowedConsoleErrors: allowed, compat: drainAllCompat(clients, "boot") };
      if (unexpected.length) note(`FAIL boot: ${unexpected.length} console error(s) while the clients loaded`);
    }
    for (const [i, suite] of loaded.entries()) {
      const t0 = Date.now();
      if (i > 0) {
        try {
          await settleBetweenSuites(clients);
        } catch (err) {
          // A client without `game` between suites: its page or the server went away. Record it and
          // stop — the clients are gone — but keep the report (release gate 2026-10-08: the sandbox
          // server was quit from outside mid-run and the run ended with no report at all).
          const st = await new FoundryClient(ctx.profile).status().catch(() => ({ reachable: false }));
          const why = st.reachable ? `a client lost its page: ${err.message}` : "the sandbox server stopped during the run (not by fvtt — was its window closed?)";
          report.suites.push({ name: suite.name, ok: false, ms: 0, error: { message: `harness: ${why}`, assertion: false }, steps: [], consoleErrors: {}, screenshots: [], notes: [] });
          note(`ABORT before ${suite.name}: ${why}`);
          break;
        }
      }
      if (i > 0) chargeLate(report.suites.at(-1), loaded[i - 1], drainAllErrors(clients), drainAllCompat(clients, "late"));
      if (traceWrites) for (const c of clients.values()) await c.eval(() => { window.__e2e.writes.length = 0; });
      const fixture = suite.fixture === null ? null : await seed(clients.get("gm"), suite.fixture ?? "skirmish");
      await sleep(500); // let the seed's broadcasts (character assignment, scene) reach every client
      for (const c of clients.values()) await settle(c);
      // The reseed tears down the previous scene, its animations included — its own bucket, not the suite's.
      const seedErrors = drainAllErrors(clients);
      const compat = drainAllCompat(clients, "seed");
      const t = new SuiteContext({ run, suite, clients, ctx, fixture });
      let error = null;
      try {
        await suite.run(t);
      } catch (err) {
        error = { message: err.message, details: err.details, assertion: err instanceof AssertionError };
        try { await t.screenshot("gm", "failure"); } catch { /* best effort */ }
      }
      const consoleErrors = drainAllErrors(clients);
      compat.push(...drainAllCompat(clients, "suite"));
      const sorted = sortErrors({ ...prefixed(seedErrors, "seed"), ...consoleErrors }, suite.allowConsoleErrors ?? []);
      const ok = !error && (suite.failOnConsoleErrors === false || sorted.unexpected.length === 0);
      let writes = null;
      if (traceWrites) {
        const all = {};
        for (const c of clients.values()) all[c.name] = await c.eval(() => window.__e2e?.writes ?? []).catch(() => []);
        const file = path.join(run.dir, `${suite.name}-writes.json`);
        fs.writeFileSync(file, JSON.stringify(all, null, 2));
        writes = path.relative(MODULE_ROOT, file).replaceAll("\\", "/");
      }
      report.suites.push({
        name: suite.name, ok, ms: Date.now() - t0, error, steps: t.steps,
        consoleErrors, seedConsoleErrors: seedErrors, allowedConsoleErrors: sorted.allowed, compat,
        screenshots: t.screenshots, notes: t.notes, ...(writes ? { writes } : {})
      });
      note(`${ok ? "PASS" : "FAIL"} ${suite.name} (${Date.now() - t0} ms)`);
      saveProgress();
    }
    // The last suite's tail, as every other suite's: once the clients are quiet.
    if (report.suites.length) {
      await quietAll(clients.values()).catch(() => null);
      chargeLate(report.suites.at(-1), loaded[report.suites.length - 1], drainAllErrors(clients), drainAllCompat(clients, "late"));
      saveProgress();
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
      // Quench provokes errors on purpose; its console is evidence, not a verdict.
      report.quench.consoleErrors = drainAllErrors(clients);
      report.quench.compat = drainAllCompat(clients, "quench");
      note(`${report.quench.ok ? "PASS" : "FAIL"} quench ${report.quench.passed ?? "?"}/${report.quench.total ?? "?"}`);
    }
  } finally {
    browser.close();
  }
  const compat = [...(report.boot?.compat ?? []), ...report.suites.flatMap(s => s.compat ?? []), ...(report.quench?.compat ?? [])];
  report.compat = summariseCompat(compat);
  report.ok = (report.boot?.ok ?? true) && report.suites.every(s => s.ok) && (report.quench?.ok ?? true);
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
export async function runE2E(ctx, { suites = suiteNames(), slug = "e2e", modules = DEFAULT_MODULES, keep = false, reuse = false, quench = false, traceWrites = false } = {}) {
  const id = agentWorldId(slug);
  const t0 = new Date();
  const client = new FoundryClient(ctx.profile);
  const st = await client.status();
  const exists = listWorlds(ctx).find(w => w.id === id);
  if (!(reuse && exists && st.active && st.world === id)) {
    if (exists?.agent) {
      if (st.active && st.world === id) await shutdownWorldAndWait(ctx, client);
      await deleteWorld(ctx, id);
    }
    // Every fvtt context on this profile is logged into a world that is about to go away; left
    // alive, one woke up in the next world as the same GM (field test 2026-10-07).
    await disposeContexts(ctx);
    await createWorld(ctx, { slug, modules, startServer });
  }
  const report = await runSuites(ctx, { suites, world: id, quench, logSince: t0, traceWrites });
  let cleanup = null;
  if (report.ok && !keep) {
    await shutdownWorldAndWait(ctx, client);
    cleanup = { world: (await deleteWorld(ctx, id)).deleted, contexts: await disposeContexts(ctx) };
  }
  const count = byClient => Object.fromEntries(Object.entries(byClient ?? {}).map(([k, v]) => [k, v.length]));
  const quenchSummary = report.quench ? { ...report.quench, consoleErrors: count(report.quench.consoleErrors), compat: report.quench.compat?.length ?? 0 } : null;
  return {
    ok: report.ok, world: id, kept: !cleanup, report: report.reportFile, quench: quenchSummary,
    boot: report.boot ? { ok: report.boot.ok, consoleErrors: count(report.boot.consoleErrors) } : null,
    compat: { total: report.compat.total, byCaller: report.compat.byCaller },
    suites: report.suites.map(x => ({
      name: x.name, ok: x.ok, ms: x.ms, failedStep: x.steps.find(y => !y.ok)?.label ?? null,
      error: x.error?.message ?? (x.ok ? null : "console errors — see the report"), consoleErrors: count(x.consoleErrors),
      ...(Object.keys(x.seedConsoleErrors ?? {}).length ? { seedConsoleErrors: count(x.seedConsoleErrors) } : {}),
      ...(Object.keys(x.lateConsoleErrors ?? {}).length ? { lateConsoleErrors: count(x.lateConsoleErrors) } : {}),
      ...(Object.keys(x.allowedConsoleErrors ?? {}).length ? { allowedConsoleErrors: x.allowedConsoleErrors } : {}),
      screenshots: x.screenshots.length
    }))
  };
}
