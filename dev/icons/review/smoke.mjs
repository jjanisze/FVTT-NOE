/** Capture and inspect an already-open review page through local Chrome CDP. */
import fs from "node:fs";
import { cdpUrl, loadConfig } from "../../agent/lib/config.mjs";
// The Chrome endpoint comes from fvtt's local config (never a port in this public repo);
// `--cdp=<url>` overrides it.
const cdp = process.argv.find(a => a.startsWith("--cdp="))?.slice(6) ?? cdpUrl(loadConfig());
if (!cdp) throw new Error("No Chrome DevTools endpoint: pass --cdp=<url> or run `npm run fvtt -- init`.");
const output = process.argv.find(a => a.startsWith("--output="))?.slice(9) ?? "dev/icons/review/review-preview.png";
const maxHeight = Number(process.argv.find(a => a.startsWith("--max-height="))?.slice(13) ?? 2200);
const manifest = await (await fetch("http://127.0.0.1:41741/api/manifest")).json();
const activeItems = manifest.items.filter(item => item.status !== "resolved");
const expectedOptions = activeItems.reduce((count, item) => count + 1 + item.candidates.length, 0);
const pages = await (await fetch(`${cdp}/json/list`)).json();
const page = pages.find(p => p.type === "page" && p.url.startsWith("http://127.0.0.1:41741/"));
if (!page) throw new Error("Open the review page before running this check");

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const job = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) job.reject(new Error(JSON.stringify(message.error)));
  else job.resolve(message.result);
});
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const callId = ++id;
  pending.set(callId, { resolve, reject });
  ws.send(JSON.stringify({ id: callId, method, params }));
});
await call("Page.enable");
await call("Page.reload", { ignoreCache: true });
await new Promise(resolve => setTimeout(resolve, 700));
const inspected = await call("Runtime.evaluate", {
  expression: `({
    title: document.title,
    cards: document.querySelectorAll(".card").length,
    options: document.querySelectorAll(".option").length,
    broken: [...document.images].filter(i => !i.complete || !i.naturalWidth).length,
    summary: document.querySelector("#summary")?.textContent,
    errors: document.querySelectorAll(".error").length
  })`,
  returnByValue: true
});
const metrics = await call("Page.getLayoutMetrics");
const width = Math.min(2800, Math.ceil(metrics.cssContentSize.width));
const height = Math.min(maxHeight, Math.ceil(metrics.cssContentSize.height));
const shot = await call("Page.captureScreenshot", {
  format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 }
});
fs.writeFileSync(output, Buffer.from(shot.data, "base64"));
ws.close();
console.log(JSON.stringify({ ...inspected.result.value, screenshot: output }));
if (inspected.result.value.cards !== activeItems.length || inspected.result.value.options !== expectedOptions
    || inspected.result.value.broken || inspected.result.value.errors) process.exitCode = 1;
