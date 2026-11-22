import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fail } from "./files.mjs";

export function runCli(moduleRoot, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(moduleRoot, "dev/agent/fvtt.mjs"), ...args], { cwd: moduleRoot, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    const bounded = (before, chunk) => (before + chunk.toString("utf8")).slice(-2_000_000);
    child.stdout.on("data", chunk => { stdout = bounded(stdout, chunk); });
    child.stderr.on("data", chunk => { stderr = bounded(stderr, chunk); });
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      let result;
      try { result = JSON.parse(stdout); } catch { result = { ok: false, error: "Command did not return valid JSON", output: stdout.slice(-12000) }; }
      resolve({ exitCode, signal, result, progress: stderr.slice(-12000) });
    });
  });
}

// Runtime service addresses must not become a second persistent configuration.
function archiveValue(value) {
  if (typeof value === "string") return value.replace(/https?:\/\/[^\s"'<>]+/g, "[service address]");
  if (Array.isArray(value)) return value.map(archiveValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["url", "href", "token"].includes(key)).map(([key, val]) => [key, archiveValue(val)]));
  return value;
}

export function createJobs({ moduleRoot, execute, archiveDir = path.join(moduleRoot, "logs/hub") }) {
  const jobs = new Map();
  // Archives preserve completed results; a stopped process never becomes a phantom running job.
  if (fs.existsSync(archiveDir)) for (const name of fs.readdirSync(archiveDir).filter(n => /^[\w-]+\.json$/.test(n)).sort().reverse().slice(0, 20)) {
    try { const saved = JSON.parse(fs.readFileSync(path.join(archiveDir, name), "utf8")); if (saved.id && saved.finishedAt) jobs.set(saved.id, saved); } catch { /* One corrupt archive does not hide other jobs. */ }
  }
  function create(action, params = {}) {
    if (typeof action !== "string" || !params || Array.isArray(params) || typeof params !== "object") throw fail("Invalid action");
    if (!["doctor", "campaign-start", "poligon-open", "poligon-findings", "graphics-start"].includes(action)) throw fail("Unknown action");
    const allowed = action === "poligon-open" ? ["seat", "switchWorld"] : [];
    if (Object.keys(params).some(key => !allowed.includes(key))) throw fail("Unknown action parameter");
    if (action === "poligon-open" && (!/^(?:Gamemaster|Gracz [1-5])$/.test(params.seat ?? "Gamemaster") || (params.switchWorld !== undefined && typeof params.switchWorld !== "boolean"))) throw fail("Invalid Poligon seat");
    const running = [...jobs.values()].find(job => job.state === "running");
    if (running) {
      if (running.action === action && JSON.stringify(running.params) === JSON.stringify(params)) return running;
      throw fail("Another operation is running. Wait for it to finish.", 409);
    }
    const job = { id: randomUUID(), action, params, state: "running", startedAt: new Date().toISOString() };
    jobs.set(job.id, job);
    Promise.resolve().then(() => execute(action, params)).then(value => {
      job.result = value.result ?? value;
      job.exitCode = value.exitCode ?? (job.result.ok === false ? 1 : 0);
      job.progress = value.progress ?? "";
      job.state = job.exitCode === 2 ? "refused" : job.exitCode !== 0 || job.result.ok === false ? "failed" : "passed";
    }).catch(error => { job.state = error.refused ? "refused" : "failed"; job.result = { ok: false, error: error.message, code: error.code, hint: error.hint }; }).finally(() => {
      job.finishedAt = new Date().toISOString();
      try { fs.mkdirSync(archiveDir, { recursive: true }); fs.writeFileSync(path.join(archiveDir, `${job.startedAt.replace(/[:.]/g, "-")}-${job.id}.json`), JSON.stringify(archiveValue(job), null, 2) + "\n"); }
      catch { job.archiveWarning = "Could not save this operation's history."; }
    });
    return job;
  }
  return { create, list: () => [...jobs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20), get: id => jobs.get(id), busy: () => [...jobs.values()].some(j => j.state === "running") };
}
