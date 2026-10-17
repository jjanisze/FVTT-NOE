/** Capture the open review without navigation, reload or changing form state. */
import fs from "node:fs";
import { cdpUrl, loadConfig } from "../../agent/lib/config.mjs";
const output = process.argv.find(a => a.startsWith("--output="))?.slice(9);
if (!output) throw new Error("Expected --output=<development screenshot.png>");
const endpoint = cdpUrl(loadConfig());
const pages = await (await fetch(`${endpoint}/json/list`)).json();
const page = pages.find(p => p.type === "page" && p.title === "Neuroshima icon review");
if (!page) throw new Error("Open the review page first");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let next = 0;
const pending = new Map();
ws.addEventListener("message", event => {
  const reply = JSON.parse(event.data);
  if (!reply.id) return;
  const job = pending.get(reply.id);
  pending.delete(reply.id);
  reply.error ? job.reject(new Error(JSON.stringify(reply.error))) : job.resolve(reply.result);
});
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++next;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
try {
  const inspected = await call("Runtime.evaluate", {
    expression: `(() => { const cards = [...document.querySelectorAll('.card')]; return {
      title: document.title, cards: cards.length, options: document.querySelectorAll('.option').length,
      brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).length,
      errors: document.querySelectorAll('.error').length,
      pendingDecisions: cards.filter(c => c.querySelector('.decision')?.value === 'pending').length
    }; })()`, returnByValue: true
  });
  const manifest = await (await fetch(new URL("/api/manifest", page.url))).json();
  const active = manifest.items.filter(item => item.status !== "resolved");
  const metrics = await call("Page.getLayoutMetrics");
  const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: Math.min(2800, Math.ceil(metrics.cssContentSize.width)),
      height: Math.min(2800, Math.ceil(metrics.cssContentSize.height)), scale: 1 } });
  fs.writeFileSync(output, Buffer.from(shot.data, "base64"));
  const result = inspected.result.value;
  fs.writeFileSync(output.replace(/\.png$/, "-check.json"), JSON.stringify({ ...result, screenshot: output }, null, 2) + "\n");
  console.log(JSON.stringify(result));
  if (result.cards !== active.length || result.options !== active.reduce((n, item) => n + 1 + item.candidates.length, 0)
      || result.brokenImages || result.errors) process.exitCode = 1;
} finally {
  ws.close();
}
