import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { loadConfig, resolveProfile, readMode, readFreeze, cdpUrl, installPaths, PROFILES } from "../agent/lib/config.mjs";
import { FoundryClient } from "../agent/lib/foundry-http.mjs";
import { browserVersion } from "../agent/lib/cdp.mjs";
import { checkMode, checkFreeze } from "../agent/lib/guards.mjs";
import { listenOnSafePort } from "../agent/lib/ports.mjs";
import { createReviewServer } from "../icons/review/server.mjs";
import { loadRegistry, destinations, assetUrl, permittedAsset, inside, sendFile, json, fail, bodyJson, MODULE_ID } from "./files.mjs";
import { createReportStore } from "./reports.mjs";
import { createJobs, runCli } from "./jobs.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../..");

export async function createHub({ moduleRoot = DEFAULT_ROOT, registryFile, config = loadConfig, state = () => ({ mode: readMode(), freeze: readFreeze() }), probe, run = args => runCli(moduleRoot, args), archiveDir } = {}) {
  const registry = loadRegistry(moduleRoot, registryFile), token = randomBytes(32).toString("hex");
  const reports = createReportStore(moduleRoot);
  let entries = destinations(registry), cachedOverview, overviewPromise, overviewAt = 0, graphics = null, graphicsPromise = null, diagnostic = null;
  let revision = null;
  const git = spawn("git", ["rev-parse", "HEAD"], { cwd: moduleRoot, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "ignore"] });
  const gitFinished = new Promise(resolve => { git.once("close", resolve); git.once("error", resolve); });
  let gitOutput = ""; git.stdout.on("data", c => { gitOutput += c; }); git.on("error", () => {}); git.on("close", code => { if (code === 0 && /^[a-f0-9]{40}\s*$/.test(gitOutput)) revision = gitOutput.trim(); });

  async function overview(force = false) {
    if (overviewPromise) return overviewPromise;
    if (!force && cachedOverview && Date.now() - overviewAt < 4000) return cachedOverview;
    overviewPromise = (async () => {
      let cfg = {}, configError = null;
      try { cfg = config(); } catch { configError = "Local fvtt configuration is unavailable. See the Foundry commands guide."; }
      const guardState = state();
      const profiles = {};
      await Promise.all(PROFILES.map(async name => {
        try {
          if (configError) throw fail(configError);
          const profile = resolveProfile(cfg, name);
          const status = probe ? await probe(profile) : await new FoundryClient(profile).status();
          profiles[name] = { ...status, configured: true, defaultWorld: profile.defaultWorld, href: status.reachable ? `${profile.baseUrl}/${status.active ? "game" : "join"}` : null };
        } catch (error) { profiles[name] = { configured: false, reachable: false, active: false, error: "Profile needs configuration", hint: error.hint ?? "See the Foundry commands guide." }; }
      }));
      let chrome = false;
      try { chrome = probe ? !!(await probe({ name: "chrome" })).up : !!(await browserVersion(cdpUrl(cfg))); } catch { /* Navigation and reports still work. */ }
      entries = destinations(registry);
      const reportList = reports.list();
      return cachedOverview = {
        title: registry.title ?? "Neuroshima · Project", subtitle: registry.subtitle ?? "Campaign, workshop and development",
        at: new Date().toISOString(), ...guardState, profiles, chrome: { up: chrome },
        graphics: graphics ? { available: true, href: graphics.url } : { available: false },
        diagnostics: diagnostic, revision, destinations: entries,
        reports: reportList, jobs: jobs.list(),
        latest: { e2e: reportList.find(r => r.kind === "e2e"), release: reportList.find(r => r.kind === "release" && r.fullGate), findings: reportList.find(r => r.kind === "findings") }
      };
    })().finally(() => { overviewAt = Date.now(); overviewPromise = null; });
    return overviewPromise;
  }

  async function startGraphics() {
    if (graphics) return { ok: true, href: graphics.url };
    if (graphicsPromise) return graphicsPromise;
    graphicsPromise = (async () => {
      let listener;
      if (registry.graphicsFactory) {
        const factory = await import(pathToFileURL(registry.graphicsFactory));
        listener = await factory.createPrivateGraphicsReview({ moduleRoot, workspaceRoot: path.dirname(registry.graphicsFactory) });
      } else listener = createReviewServer({ moduleRoot });
      await listenOnSafePort(listener, "127.0.0.1");
      graphics = { server: listener, url: `http://127.0.0.1:${listener.address().port}/` };
      overviewAt = 0;
      return { ok: true, href: graphics.url };
    })().finally(() => { graphicsPromise = null; });
    return graphicsPromise;
  }

  const jobs = createJobs({ moduleRoot, archiveDir, execute: async (action, params) => {
    if (action === "graphics-start") return startGraphics();
    if (action === "doctor") {
      const result = await run(["doctor"]);
      diagnostic = { at: new Date().toISOString(), exitCode: result.exitCode, data: result.result };
      overviewAt = 0;
      return result;
    }
    const fresh = await overview(true), cfg = config();
    if (action === "campaign-start") {
      checkMode(state().mode, "start", { profile: "campaign" }); checkFreeze(state().freeze, "start", "campaign");
      const profile = resolveProfile(cfg, "campaign");
      if (!profile.defaultWorld) throw fail("No campaign world is configured.");
      if (fresh.profiles.campaign.active) {
        if (fresh.profiles.campaign.world !== profile.defaultWorld) throw fail("A different campaign world is running. Use the existing Foundry controls to switch it.", 409);
        return { ok: true, href: fresh.profiles.campaign.href, already: true };
      }
      const outcome = await run(["start", "--profile=campaign", `--world=${profile.defaultWorld}`]);
      if (outcome.result.ok) outcome.result.href = `${profile.baseUrl}/game`;
      overviewAt = 0; return outcome;
    }
    if (!fresh.chrome.up) throw Object.assign(fail("Chrome debugging is unavailable."), { hint: "Open the existing Chrome debug launcher yourself. Reports and galleries remain available." });
    if (action === "poligon-findings") {
      const outcome = await run(["poligon:findings", "--profile=poligon", "--open", "--md"]);
      reports.list(true); overviewAt = 0; return outcome;
    }
    const seat = params.seat ?? "Gamemaster", p = fresh.profiles.poligon;
    if (p.active && p.world !== "poligon" && !params.switchWorld) throw Object.assign(fail("The Poligon server is running the campaign clone."), { hint: "Choose “Switch to Poligon” explicitly to return to the normal testing world." });
    const args = p.active && p.world === "poligon" ? ["login", "--profile=poligon", `--user=${seat}`] : ["poligon:start", "--profile=poligon", ...(seat === "Gamemaster" ? [] : ["--no-gm", `--seats=${seat}`])];
    checkMode(state().mode, args[0], { profile: "poligon", loginRole: seat === "Gamemaster" ? "gm" : "player" });
    // The CLI checks mode, human presence, mutex and database guards again at execution.
    const outcome = await run(args); overviewAt = 0; return outcome;
  } });
  const previousDoctor = jobs.list().find(job => job.action === "doctor" && job.finishedAt && job.result);
  if (previousDoctor) diagnostic = { at: previousDoctor.finishedAt, exitCode: previousDoctor.exitCode, data: previousDoctor.result };

  function checkHost(req) {
    const expected = `127.0.0.1:${req.socket.localPort}`;
    if (req.headers.host !== expected && req.headers.host !== `localhost:${req.socket.localPort}`) throw fail("Invalid host", 403);
    const origin = req.headers.origin;
    if ((origin && origin !== `http://${req.headers.host}`) || req.headers["sec-fetch-site"] === "cross-site") throw fail("Invalid request origin", 403);
  }

  const server = http.createServer(async (req, res) => {
    try {
      checkHost(req);
      res.setHeader("x-frame-options", "DENY"); res.setHeader("referrer-policy", "no-referrer");
      const url = new URL(req.url, `http://${req.headers.host}`);
      let route; try { route = decodeURIComponent(url.pathname); } catch { throw fail("Invalid URL encoding"); }
      if (req.method === "POST") {
        if (req.headers.origin !== `http://${req.headers.host}` || req.headers["x-hub-token"] !== token) throw fail("Invalid action token or origin", 403);
        const payload = await bodyJson(req);
        if (!payload || Array.isArray(payload) || typeof payload !== "object") throw fail("Expected an action object");
        if (route !== "/api/jobs") throw fail("Unknown operation", 404);
        if (Object.keys(payload).some(k => !["action", "params"].includes(k))) throw fail("Unknown request field");
        return json(res, 202, jobs.create(payload.action, payload.params));
      }
      if (!["GET", "HEAD"].includes(req.method)) throw fail("Method not allowed", 405);
      if (route === "/api/health") return json(res, 200, { kind: "neuroshima-project-hub", ok: true });
      if (route === "/api/session") return json(res, 200, { token });
      if (route === "/api/overview") return json(res, 200, { ...(await overview()), jobs: jobs.list(), diagnostics: diagnostic });
      if (route === "/api/reports") return json(res, 200, reports.list());
      let match;
      if ((match = /^\/api\/reports\/([\w-]+)$/.exec(route))) return json(res, 200, reports.detail(match[1]));
      if ((match = /^\/api\/reports\/([\w-]+)\/artifacts\/([\w-]+)$/.exec(route))) return sendFile(req, res, reports.artifact(match[1], match[2]));
      if ((match = /^\/api\/jobs\/([\w-]+)$/.exec(route))) { const job = jobs.get(match[1]); if (!job) throw fail("Unknown job", 404); return json(res, 200, job); }
      if ((match = /^\/api\/documents\/([\w.-]+)$/.exec(route))) {
        const entry = entries.find(e => e.id === match[1] && e.kind === "document");
        if (!entry) throw fail("Unknown document", 404);
        return json(res, 200, { label: entry.label, text: fs.readFileSync(inside(registry.roots[entry.root], entry.path), "utf8") });
      }
      if (route === "/" || route === "/index.html") return sendFile(req, res, path.join(HERE, "public/index.html"));
      if (["/app.mjs", "/style.css"].includes(route)) return sendFile(req, res, path.join(HERE, "public", route.slice(1)));
      for (const [prefix, mapping] of Object.entries(registry.assetAliases ?? {})) {
        if (route.startsWith(prefix)) {
          const relative = mapping.path + route.slice(prefix.length);
          return sendFile(req, res, permittedAsset(registry, entries, mapping.root, relative));
        }
      }
      if ((match = new RegExp(`^/modules/${MODULE_ID}/(.+)$`).exec(route))) return sendFile(req, res, permittedAsset(registry, entries, "module", match[1]));
      if ((match = /^\/files\/([a-z][a-z0-9-]*)\/(.+)$/.exec(route))) return sendFile(req, res, permittedAsset(registry, entries, match[1], match[2]));
      if ((match = /^\/(systems\/dnd5e\/fonts|fonts\/fontawesome)\/(.+)$/.exec(route))) {
        const cfg = config();
        const root = match[1].startsWith("systems/") ? path.join(resolveProfile(cfg, "campaign").data, "systems/dnd5e/fonts") : path.join(installPaths(cfg).app, "public/fonts/fontawesome");
        return sendFile(req, res, inside(root, match[2]));
      }
      throw fail("Not found", 404);
    } catch (error) { if (!res.headersSent) json(res, error.status ?? 500, { error: error.message }); else res.destroy(); }
  });
  server.requestTimeout = 15_000;
  return { server, jobs, reports, overview, async close() { if (jobs.busy()) throw fail("An operation is running; wait before closing the hub.", 409); await Promise.all([gitFinished, ...[server, graphics?.server].filter(s => s?.listening).map(s => new Promise(resolve => s.close(resolve)))]); } };
}
