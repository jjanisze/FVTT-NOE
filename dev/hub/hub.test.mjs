import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createHub } from "./server.mjs";
import { createReportStore, summarizeReport } from "./reports.mjs";
import { inside, permittedAsset } from "./files.mjs";
import { ensureHub, hubPipe } from "./runtime.mjs";
import { listenOnSafePort } from "../agent/lib/ports.mjs";

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "noe-hub-test-"));
  t.hubCleanup ??= [];
  t.after(async () => {
    for (const cleanup of (t.hubCleanup ?? []).reverse()) await cleanup();
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("noe-hub-test-"));
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  return dir;
}
function write(root, relative, value) {
  const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value)); return target;
}
async function fixture(t, options = {}) {
  const dir = temporary(t), root = path.join(dir, "module with spaces Ł"); fs.mkdirSync(root);
  const cfg = { installDir: path.join(dir, "install") };
  for (const name of ["campaign", "poligon", "sandbox", "release"]) { cfg[name] = { dataPath: path.join(dir, name), world: name === "campaign" ? "campaign-world" : name }; write(cfg[name].dataPath, "Config/options.json", { port: 12345, routePrefix: "fixture" }); }
  const registry = write(dir, "private/registry.json", { roots: { vault: "../vault" }, entries: [{ id: "private-preview", label: "Zażółć gęślą", root: "vault", path: "previews/hello space.html", kind: "gallery", group: "Private" }, { id: "private-doc", label: "Guide", root: "vault", path: "notes/guide.md", kind: "document" }] });
  write(dir, "vault/previews/hello space.html", "<!doctype html><title>Fixture</title>"); write(dir, "vault/notes/guide.md", "# Guide Ł"); write(dir, "vault/private.json", { secret: "not served" });
  write(root, "dev/visual/m9-components/index.html", "<title>Components</title>"); write(root, "icons/a.svg", "<svg/>"); write(root, "package.json", { private: true });
  write(root, "logs/e2e/2026-11-17T08-00-00/report.json", { run: "new", startedAt: "2026-11-17T08:00:00Z", finishedAt: "2026-11-17T08:01:00Z", ok: false, suites: [{ name: "boot", ok: false, consoleErrors: { gm: ["Fixture error"] }, screenshots: ["logs/e2e/2026-11-17T08-00-00/view.jpg", "../../private.json"] }] });
  write(root, "logs/e2e/2026-11-17T08-00-00/view.jpg", "image fixture");
  write(root, "logs/poligon/uwagi-20261117-0800.md", "# Saved findings\nFixture only.");
  const calls = [], services = { poligon: { reachable: true, active: true, world: "poligon", users: 0 }, chrome: { up: true }, ...options.services };
  const guardState = options.guardState ?? { mode: { mode: "development" }, freeze: { frozen: false } };
  const hub = await createHub({ moduleRoot: root, registryFile: registry, config: () => cfg, state: () => guardState, probe: async profile => services[profile.name] ?? { reachable: false, active: false }, run: async args => { calls.push(args); return options.run ? options.run(args) : { exitCode: 0, result: { ok: true } }; } });
  await listenOnSafePort(hub.server, "127.0.0.1");
  (t.hubCleanup ??= []).push(async () => { while (hub.jobs.busy()) await new Promise(r => setTimeout(r, 10)); await hub.close(); });
  const base = `http://127.0.0.1:${hub.server.address().port}`, token = (await (await fetch(base + "/api/session")).json()).token;
  const post = (action, params = {}, extra = {}) => fetch(base + "/api/jobs", { method: "POST", headers: { "content-type": "application/json", origin: base, "x-hub-token": token, ...extra }, body: JSON.stringify({ action, params }) });
  const finish = async response => { assert.equal(response.status, 202); let job = await response.json(); for (let i = 0; i < 100 && job.state === "running"; i++) { await new Promise(r => setTimeout(r, 5)); job = await (await fetch(base + `/api/jobs/${job.id}`)).json(); } assert.notEqual(job.state, "running"); return job; };
  return { dir, root, cfg, hub, base, token, post, finish, calls, services, guardState };
}

test("offline overview, curated Unicode destinations, saved reports and static assets do not start a world", async t => {
  const f = await fixture(t, { services: { chrome: { up: false }, poligon: { reachable: false, active: false } } });
  const overview = await (await fetch(f.base + "/api/overview")).json();
  assert.equal(overview.chrome.up, false); assert.equal(overview.profiles.campaign.reachable, false); assert.deepEqual(f.calls, []);
  assert.ok(overview.destinations.some(d => d.label === "Zażółć gęślą" && d.available));
  const entry = overview.destinations.find(d => d.id === "private-preview"); assert.equal((await fetch(f.base + entry.href)).status, 200);
  assert.match(await (await fetch(f.base + "/")).text(), /Project desk/);
  assert.equal((await fetch(f.base + "/modules/neuroshima-2026-overrides/icons/a.svg")).status, 200);
  assert.equal(overview.latest.e2e.state, "failed"); assert.ok(overview.latest.findings);
});

test("mutations reject wrong origin, token, host and unrestricted command arguments", async t => {
  const f = await fixture(t);
  assert.equal((await f.post("doctor", {}, { origin: "https://untrusted.invalid" })).status, 403);
  assert.equal((await f.post("doctor", {}, { "x-hub-token": "wrong" })).status, 403);
  assert.equal((await f.post("doctor", {}, { origin: "" })).status, 403);
  const badHost = await new Promise((resolve, reject) => { http.get(f.base + "/api/session", { headers: { host: "untrusted.invalid" } }, response => { response.resume(); resolve(response.statusCode); }).on("error", reject); });
  assert.equal(badHost, 403);
  assert.equal((await f.post("eval", { command: "anything" })).status, 400);
  assert.equal((await f.post("doctor", { profile: "campaign", force: true })).status, 400);
  assert.equal((await f.post("poligon-open", { seat: "Gamemaster; anything" })).status, 400);
  assert.equal((await fetch(f.base + "/api/jobs", { method: "POST", headers: { origin: f.base, "x-hub-token": f.token, "content-type": "application/json" }, body: "null" })).status, 400);
  assert.deepEqual(f.calls, []);
});

test("gallery grants cannot be escaped by traversal, encoded separators or junctions", async t => {
  const f = await fixture(t);
  for (const route of ["/modules/neuroshima-2026-overrides/package.json", "/modules/neuroshima-2026-overrides/icons/../package.json", "/files/vault/previews/../private.json", "/files/vault/previews/%2e%2e/private.json", "/files/vault/previews/..%5cprivate.json", "/files/vault/private.json"]) assert.equal((await fetch(f.base + route)).status, 403, route);
  const outside = path.join(f.dir, "outside"); fs.mkdirSync(outside); write(outside, "private.json", { forbidden: true });
  fs.symlinkSync(outside, path.join(f.root, "icons/linked"), process.platform === "win32" ? "junction" : "dir");
  assert.equal((await fetch(f.base + "/modules/neuroshima-2026-overrides/icons/linked/private.json")).status, 403);
  const document = await (await fetch(f.base + "/api/documents/private-doc")).json(); assert.match(document.text, /Guide Ł/);
  assert.equal((await fetch(f.base + "/api/documents/private.json")).status, 404);
  assert.throws(() => inside(f.root, "../outside/private.json"));
  assert.throws(() => permittedAsset({ roots: { module: f.root } }, [], "module", "icons/../package.json"));
});

test("report details retain console failures and serve only artifacts named inside their run", async t => {
  const f = await fixture(t); const summary = f.hub.reports.list().find(r => r.kind === "e2e");
  const report = await (await fetch(f.base + `/api/reports/${summary.id}`)).json();
  assert.equal(report.state, "failed"); assert.equal(report.commit, null); assert.match(JSON.stringify(report.data.suites[0].consoleErrors), /Fixture error/);
  assert.equal(report.artifacts.length, 1); assert.equal((await fetch(f.base + report.artifacts[0].href)).status, 200);
  assert.equal((await fetch(f.base + `/api/reports/${summary.id}/artifacts/anything`)).status, 404);
  write(f.root, "logs/e2e/2026-11-18T08-00-00/report.json", "not JSON");
  assert.ok(f.hub.reports.list(true).some(r => r.state === "invalid"));
});

test("full gate, CI, partial and unfinished results have distinct semantics", () => {
  const steps = ["static", "generators", "zip", "packs", "versions", "sandbox"].map(name => ({ name, ok: true }));
  const full = { ok: true, at: "2026-11-17T08:00:00Z", steps, commit: "abc" };
  assert.equal(summarizeReport("logs/release/test.json", full).fullGate, true);
  assert.equal(summarizeReport("logs/release/test.json", { ...full, ci: true }).fullGate, false);
  assert.equal(summarizeReport("logs/release/test.json", { ...full, steps: steps.map(s => s.name === "sandbox" ? { ...s, skipped: "CI" } : s) }).fullGate, false);
  assert.equal(summarizeReport("logs/e2e/run/report.json", { running: true, suites: [] }).state, "unfinished");
});

test("missing Foundry configuration leaves saved evidence and destinations available", async t => {
  const root = temporary(t);
  write(root, "logs/e2e/2026-11-17T08-00-00/report.json", { run: "fixture", startedAt: "2026-11-17T08:00:00Z", finishedAt: "2026-11-17T08:01:00Z", ok: true, suites: [] });
  const hub = await createHub({ moduleRoot: root, config: () => { throw new Error("No config"); }, state: () => ({ mode: { mode: "development" }, freeze: { frozen: false } }), probe: async () => ({ up: false }) });
  t.hubCleanup.push(() => hub.close());
  const overview = await hub.overview();
  assert.equal(overview.profiles.campaign.configured, false); assert.equal(overview.latest.e2e.state, "passed"); assert.ok(overview.destinations.length);
});

test("doctor keeps nonzero JSON findings, archives results and restores diagnostic history", async t => {
  const f = await fixture(t, { run: async () => ({ exitCode: 1, result: { ok: false, problems: ["Fixture finding"], hints: ["Fixture hint"], url: "http://fixture.invalid/runtime" } }) });
  const job = await f.finish(await f.post("doctor")); assert.equal(job.state, "failed");
  const overview = await (await fetch(f.base + "/api/overview")).json(); assert.deepEqual(overview.diagnostics.data.problems, ["Fixture finding"]);
  const archive = fs.readdirSync(path.join(f.root, "logs/hub"))[0]; const saved = fs.readFileSync(path.join(f.root, "logs/hub", archive), "utf8"); assert.doesNotMatch(saved, /fixture\.invalid/);
  const restored = await createHub({ moduleRoot: f.root, config: () => f.cfg, probe: async () => ({ reachable: false }), state: () => f.guardState }); t.hubCleanup.push(() => restored.close());
  assert.equal((await restored.overview()).diagnostics.data.problems[0], "Fixture finding");
});

test("normal Poligon opens isolated seats through login and starting a player seat is explicit", async t => {
  const f = await fixture(t);
  assert.equal((await f.finish(await f.post("poligon-open", { seat: "Gracz 2" }))).state, "passed");
  assert.deepEqual(f.calls[0], ["login", "--profile=poligon", "--user=Gracz 2"]);
  f.services.poligon = { reachable: false, active: false };
  await f.finish(await f.post("poligon-open", { seat: "Gracz 1" }));
  assert.deepEqual(f.calls[1], ["poligon:start", "--profile=poligon", "--no-gm", "--seats=Gracz 1"]);
});

test("clone switches require explicit intent and preserve CLI human guards without force", async t => {
  const f = await fixture(t, { services: { poligon: { active: true, reachable: true, world: "campaign-world" } }, run: async () => ({ exitCode: 2, result: { ok: false, code: "refused-humans", hint: "A person is connected." } }) });
  assert.equal((await f.finish(await f.post("poligon-open"))).state, "failed"); assert.equal(f.calls.length, 0);
  const job = await f.finish(await f.post("poligon-open", { switchWorld: true })); assert.equal(job.state, "refused"); assert.equal(job.result.code, "refused-humans");
  assert.deepEqual(f.calls[0], ["poligon:start", "--profile=poligon"]);
});

test("runtime and freeze guards block starts while allowing GM login to a running Poligon", async t => {
  const f = await fixture(t, { guardState: { mode: { mode: "runtime" }, freeze: { frozen: false } } });
  assert.equal((await f.finish(await f.post("campaign-start"))).state, "refused");
  assert.equal((await f.finish(await f.post("poligon-open", { seat: "Gamemaster" }))).state, "passed");
  assert.equal((await f.finish(await f.post("poligon-open", { seat: "Gracz 1" }))).state, "refused");
  f.guardState.mode.mode = "development"; f.guardState.freeze.frozen = true;
  assert.equal((await f.finish(await f.post("campaign-start"))).state, "refused");
  assert.deepEqual(f.calls, [["login", "--profile=poligon", "--user=Gamemaster"]]);
});

test("campaign startup names the configured world; unavailable Chrome blocks seat commands", async t => {
  const f = await fixture(t, { services: { chrome: { up: false } } });
  const started = await f.finish(await f.post("campaign-start")); assert.equal(started.state, "passed"); assert.match(started.result.href, /\/fixture\/game$/);
  assert.deepEqual(f.calls[0], ["start", "--profile=campaign", "--world=campaign-world"]);
  assert.equal((await f.finish(await f.post("poligon-open"))).state, "failed"); assert.equal(f.calls.length, 1);
});

test("concurrent requests reuse a matching operation and reject a different one", async t => {
  let complete;
  const f = await fixture(t, { run: () => new Promise(resolve => { complete = resolve; }) });
  const first = await (await f.post("doctor")).json();
  assert.equal((await (await f.post("doctor")).json()).id, first.id);
  assert.equal((await f.post("campaign-start")).status, 409);
  await assert.rejects(() => f.hub.close());
  complete({ exitCode: 0, result: { ok: true } });
  while (f.hub.jobs.busy()) await new Promise(r => setTimeout(r, 5));
});

test("launcher IPC reuses an instance with spaces/Unicode and stops only its owned hub", async t => {
  const dir = temporary(t), root = path.join(dir, "module Ł with spaces"); fs.mkdirSync(root);
  const registry = write(dir, "private registry.json", {});
  if (process.platform === "win32") assert.equal(hubPipe(root, registry), hubPipe(root.toUpperCase(), registry.toUpperCase()));
  const first = await ensureHub({ moduleRoot: root, registryFile: registry });
  t.hubCleanup.push(async () => { await ensureHub({ moduleRoot: root, registryFile: registry, stop: true }); await new Promise(r => setTimeout(r, 100)); });
  assert.equal(first.ok, true);
  const second = await ensureHub({ moduleRoot: root, registryFile: registry }); assert.equal(second.reused, true); assert.equal(second.pid, first.pid); assert.equal(second.url, first.url);
  assert.equal((await (await fetch(first.url + "api/health")).json()).kind, "neuroshima-project-hub");
  const stopped = await ensureHub({ moduleRoot: root, registryFile: registry, stop: true }); assert.equal(stopped.stopped, true);
  await new Promise(r => setTimeout(r, 150));
});
