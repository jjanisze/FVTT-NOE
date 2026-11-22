import fs from "node:fs";
import path from "node:path";
import { fail, inside, readJson, webPath } from "./files.mjs";

const idFor = relative => Buffer.from(relative).toString("base64url");
const timestamp = value => Number.isFinite(Date.parse(value)) ? value : null;
const gateSteps = ["static", "generators", "zip", "packs", "versions", "sandbox"];

export function summarizeReport(relative, report) {
  const kind = relative.startsWith("logs/release/") ? "release" : "e2e";
  if (!report || typeof report !== "object" || (kind === "e2e" && !Array.isArray(report.suites)) || (kind === "release" && !Array.isArray(report.steps))) throw new Error("Unrecognized report format");
  const completed = kind === "release" || !!timestamp(report.finishedAt);
  const state = !completed ? "unfinished" : report.ok === true ? "passed" : report.ok === false ? "failed" : "unknown";
  return {
    id: idFor(relative), kind, label: kind === "release" ? `Release ${report.version ?? "check"}` : report.run ?? path.basename(path.dirname(relative)),
    at: timestamp(report.startedAt ?? report.at), finishedAt: timestamp(report.finishedAt), state,
    scope: (kind === "e2e" ? report.suites : report.steps).map(s => s.name),
    passed: (kind === "e2e" ? report.suites : report.steps).filter(s => s.ok === true && !s.skipped).length,
    total: (kind === "e2e" ? report.suites : report.steps).length,
    commit: typeof report.commit === "string" ? report.commit : null,
    fullGate: kind === "release" && report.ci !== true && gateSteps.every(name => report.steps.some(s => s.name === name && !s.skipped)),
    ci: !!report.ci, source: relative
  };
}

export function createReportStore(moduleRoot) {
  let cached = null, cachedAt = 0;
  function list(refresh = false) {
    if (!refresh && cached && Date.now() - cachedAt < 8000) return cached;
    const files = [];
    const e2e = path.join(moduleRoot, "logs/e2e"), release = path.join(moduleRoot, "logs/release"), findings = path.join(moduleRoot, "logs/poligon");
    if (fs.existsSync(e2e)) for (const name of fs.readdirSync(e2e).filter(n => /^\d{4}-\d{2}-\d{2}T[\d-]+$/.test(n)).sort().reverse().slice(0, 120)) if (fs.existsSync(path.join(e2e, name, "report.json"))) files.push(`logs/e2e/${name}/report.json`);
    if (fs.existsSync(release)) for (const name of fs.readdirSync(release).filter(n => /-\d{4}-\d{2}-\d{2}T[\d-]+(?:-ci)?\.json$/.test(n))) files.push(`logs/release/${name}`);
    const reports = files.map(relative => {
      try { return summarizeReport(relative, readJson(inside(moduleRoot, relative))); }
      catch (error) { return { id: idFor(relative), kind: relative.includes("/release/") ? "release" : "e2e", label: path.basename(path.dirname(relative)), at: null, state: "invalid", error: error.message, source: relative, scope: [] }; }
    });
    if (fs.existsSync(findings)) for (const name of fs.readdirSync(findings).filter(n => /^uwagi-[\w-]+\.md$/.test(n)).sort().reverse().slice(0, 30)) {
      const relative = `logs/poligon/${name}`;
      reports.push({ id: idFor(relative), kind: "findings", label: name.replace(/\.md$/, ""), at: fs.statSync(path.join(findings, name)).mtime.toISOString(), state: "export", source: relative, scope: [] });
    }
    cached = reports.sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
    cachedAt = Date.now();
    return cached;
  }
  function detail(id) {
    const summary = list().find(r => r.id === id);
    if (!summary) throw fail("Unknown report", 404);
    if (summary.state === "invalid") return { ...summary, data: null, artifacts: [] };
    const file = inside(moduleRoot, summary.source);
    if (summary.kind === "findings") return { ...summary, text: fs.readFileSync(file, "utf8"), artifacts: [] };
    const data = readJson(file), artifacts = [];
    const runDir = webPath(path.dirname(summary.source)) + "/";
    function add(source) {
      if (typeof source !== "string") return;
      let relative = source.replaceAll("\\", "/");
      if (!relative.startsWith("logs/")) relative = runDir + relative;
      if (!relative.startsWith(runDir)) return;
      try {
        const file = inside(moduleRoot, relative);
        relative = webPath(path.relative(moduleRoot, file));
        if (!relative.startsWith(runDir)) return;
        inside(path.join(moduleRoot, runDir), relative.slice(runDir.length));
      } catch { return; }
      if (!/\.(?:png|jpg|jpeg|webp|json)$/i.test(relative) || artifacts.some(a => a.source === relative)) return;
      artifacts.push({ id: idFor(relative), source: relative, label: path.basename(relative), available: fs.existsSync(inside(moduleRoot, relative)), href: `/api/reports/${id}/artifacts/${idFor(relative)}` });
    }
    for (const suite of data.suites ?? []) { for (const screenshot of suite.screenshots ?? []) add(screenshot); if (suite.writes) add(typeof suite.writes === "string" ? suite.writes : suite.writes.file); }
    return { ...summary, data, artifacts };
  }
  function artifact(reportId, artifactId) {
    const artifact = detail(reportId).artifacts.find(a => a.id === artifactId);
    if (!artifact) throw fail("Unknown report artifact", 404);
    return inside(moduleRoot, artifact.source);
  }
  return { list, detail, artifact };
}
