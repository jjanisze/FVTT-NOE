/** Read-only HTTP smoke check of the real registry. Never opens a browser or runs a world action. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureHub } from "./runtime.mjs";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registryFile = process.argv.find(arg => arg.startsWith("--registry="))?.slice(11);
const hub = await ensureHub({ moduleRoot, registryFile });
const failures = [], optional = [], visited = new Set(), tools = [];
let galleries = 0, reports = 0, documents = 0;
try {
  const overview = await (await fetch(new URL("api/overview", hub.url))).json();
  async function check(relative, from = hub.url) {
    let url; try { url = new URL(relative.replaceAll("&amp;", "&"), from); } catch { return; }
    if (url.origin !== new URL(hub.url).origin || visited.has(url.href) || url.hash && !url.pathname.match(/\.(?:png|jpe?g|webp|svg)$/i)) return;
    visited.add(url.href);
    const response = await fetch(url);
    if (!response.ok) {
      const item = { path: url.pathname, status: response.status };
      // Installed core CSS declares this legacy face, but its font is not shipped; it is not used by the gallery.
      if (url.pathname === "/fonts/fontawesome/webfonts/fa-v4compatibility.woff2") optional.push(item); else failures.push(item);
      return;
    }
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("html") && !type.includes("css")) { await response.arrayBuffer(); return; }
    const source = await response.text(), references = [];
    const markup = type.includes("html") ? source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "") : source;
    if (type.includes("html")) {
      for (const match of markup.matchAll(/<(?:img|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) references.push(match[1]);
      for (const match of source.matchAll(/<script\b[^>]*?\bsrc=["']([^"']+)["']/gi)) references.push(match[1]);
    }
    for (const match of markup.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)) if (!match[1].startsWith("data:") && !match[1].startsWith("var(")) references.push(match[1]);
    for (const reference of references) await check(reference, url.href);
  }
  await check("/");
  for (const entry of overview.destinations.filter(e => e.kind === "gallery" && e.available)) { galleries++; await check(entry.href); }
  for (const entry of overview.destinations.filter(e => e.kind === "document" && e.available)) {
    const response = await fetch(new URL(`api/documents/${entry.id}`, hub.url)); await response.arrayBuffer();
    if (response.ok) documents++; else failures.push({ document: entry.id, status: response.status });
  }
  const selectedReports = [...new Map([overview.latest.e2e, overview.latest.release, overview.latest.findings, overview.reports.find(r => r.kind === "e2e" && r.id !== overview.latest.e2e?.id)].filter(Boolean).map(r => [r.id, r])).values()];
  for (const summary of selectedReports) {
    const response = await fetch(new URL(`api/reports/${summary.id}`, hub.url));
    if (!response.ok) failures.push({ report: summary.id, status: response.status });
    else { reports++; const detail = await response.json(); for (const artifact of detail.artifacts?.slice(0, 2) ?? []) if (artifact.available) await check(artifact.href); }
  }
  if (process.argv.includes("--tools")) {
    const session = await (await fetch(new URL("api/session", hub.url))).json();
    for (const action of ["doctor", "graphics-start"]) {
      let job = await (await fetch(new URL("api/jobs", hub.url), { method: "POST", headers: { origin: new URL(hub.url).origin, "content-type": "application/json", "x-hub-token": session.token }, body: JSON.stringify({ action }) })).json();
      while (job.state === "running") { await new Promise(resolve => setTimeout(resolve, 150)); job = await (await fetch(new URL(`api/jobs/${job.id}`, hub.url))).json(); }
      tools.push({ action, state: job.state, validResult: typeof job.result?.ok === "boolean" });
      if (action === "graphics-start" && job.result?.href) {
        for (const route of ["", "browser.html", "campaign/", "creatures/", "dnd5e.html", "audio/pojazdy/index.html", "overlays/water/preview.html", "api/catalog"]) {
          const response = await fetch(new URL(route, job.result.href)); await response.arrayBuffer();
          if (!response.ok) failures.push({ graphics: route, status: response.status });
        }
      } else if (action === "graphics-start") failures.push({ action, error: job.result?.error });
      if (action === "doctor" && !Array.isArray(job.result?.problems)) failures.push({ action, error: "Diagnostic result was not retained" });
    }
  }
  console.log(JSON.stringify({ ok: failures.length === 0, galleries, resources: visited.size, documents, reports, chromeDebugging: overview.chrome.up, tools, failures, optional }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally { if (!hub.reused) await ensureHub({ moduleRoot, registryFile, stop: true }); }
