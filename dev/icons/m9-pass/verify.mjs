/** Initial handoff verification; later human review decisions intentionally invalidate its baseline. */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { abs, sha256File } from "../../finish/lib/profile.mjs";
if (fs.existsSync(abs("dev/icons/m9-pass/reviewed-installed.json"))) {
  const python = process.env.PYTHON ?? abs(path.join(".venv", "Scripts", "python.exe"));
  const result = spawnSync(python, [abs("dev/icons/m9-pass/accept.py"), "--check"], { encoding: "utf8", windowsHide: true });
  process.stdout.write(result.stdout ?? ""); process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}
const read = p => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const assert = (v, why) => { if (!v) throw new Error(why); };
const before = read("dev/icons/m9-pass/review-manifest-before.json.bak");
const current = read("dev/icons/review/manifest.json");
for (const old of before.items) assert(JSON.stringify(current.items.find(e => e.id === old.id)) === JSON.stringify(old), `Older review changed: ${old.id}`);
const oldIds = new Set(before.items.map(e => e.id));
const added = current.items.filter(e => !oldIds.has(e.id));
assert(added.length === 9 && added.every(e => e.id.startsWith("m9-cleanup-") && e.status === "pending"), "Expected nine new pending cards");
let targets = 0;
for (const s of read("dev/icons/review/candidates/batch-124/batch.json").subjects) for (const t of s.deliveryTargets) {
  assert(sha256File(abs(t.source)) === t.sourceSha256, `Shipped source changed: ${t.source}`); targets++;
}
const decisions = {
  "dev/icons/review/feedback.json": "68792a1b023d78efb13e227b5c6013f28961e29c5496eb0eb5508258d08530a9",
  "dev/icons/review/style-feedback.json": "f779b69589ec11c0d415a4d141ba7428763f7ded8a4f66f80ddbaab1499b964a"
};
for (const [p, sha] of Object.entries(decisions)) assert(sha256File(abs(p)) === sha, `Saved GM decisions changed: ${p}`);
const url = process.argv.find(a => a.startsWith("--url="))?.slice(6);
const routes = ["/", "/browser.html", "/m9-audit.html", "/m9-gap-audit.md", ...added.flatMap(e => [e.current.src, ...e.candidates.map(c => `/${c.src}`)])];
if (url) for (const route of routes) {
  const response = await fetch(new URL(route, url)); assert(response.ok, `HTTP asset failed: ${route}`);
  if (route === "/m9-audit.html") {
    const html = await response.text();
    new vm.Script(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
    JSON.parse(html.match(/<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  } else await response.arrayBuffer();
}
const pending = read("dev/icons/review/candidates/batch-125/batch.json").subjects.map(e => ({ key: e.key, target: e.target }));
const output = { date: "2026-11-17", generator: "OpenAI built-in image_gen", model: null, candidates: added.length,
  preservedCards: before.items.length, unchangedSourceVariants: targets, unchangedDecisionFiles: decisions,
  validation: read("dev/icons/review/candidates/batch-124/validated.json"), pendingAfterServiceRejection: pending,
  rejectedBatches: [125, 126], servedRoutes: url ? routes : [],
  visualInspection: "Candidate inventory sheet inspected at 64/32/24/16 px. Chrome unavailable; HTTP and script syntax checks do not establish browser rendering." };
fs.writeFileSync(abs("dev/icons/m9-pass/progress.json"), JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ candidates: added.length, preservedCards: before.items.length, unchangedSourceVariants: targets, served: url ? routes.length : 0, pending: pending.length }));
