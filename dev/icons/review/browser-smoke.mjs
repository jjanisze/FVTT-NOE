/** Exercise browser saves in an isolated fixture; inspect the real library read-only. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { cdpUrl, loadConfig } from "../../agent/lib/config.mjs";
import { listenOnSafePort } from "../../agent/lib/ports.mjs";
import { createReviewServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cdp = process.argv.find(arg => arg.startsWith("--cdp="))?.slice(6) ?? cdpUrl(loadConfig());
if (!cdp) throw new Error("Open the local icon browser in the configured Chrome debug session first.");
const scratch = path.join(HERE, "audits");
fs.mkdirSync(scratch, { recursive: true });
const fixture = fs.mkdtempSync(path.join(scratch, "browser-ui-"));
const review = path.join(fixture, "dev/icons/review");
fs.mkdirSync(review, { recursive: true });
fs.mkdirSync(path.join(fixture, "icons/abilities"), { recursive: true });
for (const file of ["browser.html", "browser.mjs", "browser.css", "review.css"]) fs.copyFileSync(path.join(HERE, file), path.join(review, file));
for (const name of ["one", "two"]) fs.writeFileSync(path.join(fixture, `icons/abilities/${name}.svg`), '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect x="48" y="33" width="160" height="190" fill="white"/></svg>');
fs.writeFileSync(path.join(fixture, "icons/abilities/two.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g"><stop stop-color="#101012"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="16" y="40" fill="white" style="paint-order:stroke" stroke-width="0.8">T</text></svg>');
const approved = JSON.stringify({ version: 1, items: { sentinel: { decision: "approve", notes: "Existing decision" } } });
fs.writeFileSync(path.join(review, "feedback.json"), approved);
fs.writeFileSync(path.join(review, "manifest.json"), JSON.stringify({ items: [] }));
fs.writeFileSync(path.join(fixture, "dev/icons/MISSING.md"), "# Queue\n\nManual request.\n\n## How an item gets added here\n\nPreserved notes.\n");
const server = createReviewServer({ moduleRoot: fixture, reviewRoot: review });
await listenOnSafePort(server, "127.0.0.1");
const fixtureOrigin = `http://127.0.0.1:${server.address().port}`;
let target, fixtureSocket, realSocket;

async function connect(url) {
  const socket = new WebSocket(url);
  let next = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data), job = pending.get(message.id);
    if (!job) return;
    pending.delete(message.id); clearTimeout(job.timeout);
    if (message.error) job.reject(new Error(JSON.stringify(message.error)));
    else job.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return { close: () => socket.close(), call: (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  }) };
}

async function evaluate(connection, fn) {
  const result = await connection.call("Runtime.evaluate", { expression: `(${fn.toString()})()`, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "Browser check failed");
  return result.result.value;
}

const ready = async () => {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (document.querySelectorAll(".library-card").length === 2 && [...document.images].every(image => image.complete && image.naturalWidth)) return true;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Fixture library did not load");
};

try {
  target = await (await fetch(`${cdp}/json/new?${encodeURIComponent(fixtureOrigin + "/browser.html")}`, { method: "PUT" })).json();
  fixtureSocket = await connect(target.webSocketDebuggerUrl);
  await evaluate(fixtureSocket, ready);
  const saved = await evaluate(fixtureSocket, async () => {
    document.querySelector(".library-card button").click();
    document.querySelector('#reasons input[value="detail"]').checked = true;
    document.querySelector("#style-notes").value = "Broad silhouettes for the fixture.";
    document.querySelector("#redo-next").click();
    for (let attempt = 0; attempt < 100; attempt++) {
      if (document.querySelector("#dialog-title").textContent === "Two" && document.querySelector("#summary").textContent.includes("1 flagged")) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error("Flag and next did not save/advance");
  });
  assert.equal(saved, true);
  const persisted = JSON.parse(fs.readFileSync(path.join(review, "style-feedback.json"), "utf8"));
  assert.equal(persisted.items["abilities/one"].status, "redo");
  assert.ok(fs.readFileSync(path.join(fixture, "dev/icons/MISSING.md"), "utf8").includes("Broad silhouettes for the fixture."));
  await fixtureSocket.call("Page.reload", { ignoreCache: true });
  await evaluate(fixtureSocket, ready);
  assert.equal(await evaluate(fixtureSocket, () => {
    document.querySelector(".library-card button").click();
    return document.querySelector('#reasons input[value="detail"]').checked
      && document.querySelector("#style-notes").value === "Broad silhouettes for the fixture.";
  }), true);
  assert.equal(await evaluate(fixtureSocket, async () => {
    document.querySelector("#close-dialog").click();
    const filter = document.querySelector("#status"); filter.value = "redo"; filter.dispatchEvent(new Event("change"));
    if (document.querySelectorAll(".library-card").length !== 1) throw new Error("Flagged filter mismatch");
    document.querySelector(".library-card button").click(); document.querySelector("#clear-decision").click();
    for (let attempt = 0; attempt < 100; attempt++) {
      if (!document.querySelector("#icon-dialog").open && document.querySelectorAll(".library-card").length === 0) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error("Clear decision did not remove the flagged result");
  }), true);
  assert.equal(fs.readFileSync(path.join(review, "feedback.json"), "utf8"), approved);
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(path.join(review, "style-feedback.json"), "utf8")).items).length, 0);
  await fixtureSocket.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const mobile = await evaluate(fixtureSocket, () => {
    document.querySelector("#clear-filters").click(); document.querySelector(".library-card button").click();
    const dialog = document.querySelector("#icon-dialog");
    return { overflow: document.documentElement.scrollWidth > innerWidth,
      dialogOverflow: dialog.scrollWidth > dialog.clientWidth };
  });
  assert.equal(mobile.overflow, false); assert.equal(mobile.dialogOverflow, false);
  await fixtureSocket.call("Emulation.clearDeviceMetricsOverride");
  assert.equal(await evaluate(fixtureSocket, () => {
    document.querySelector("#close-dialog").click();
    const filter = document.querySelector("#artwork"); filter.value = "placeholder"; filter.dispatchEvent(new Event("change"));
    return document.querySelectorAll(".library-card").length === 1
      && document.querySelector(".library-card").dataset.iconId === "abilities/two"
      && !!document.querySelector(".badge-placeholder");
  }), true);
  await fixtureSocket.call("Page.reload", { ignoreCache: true });
  assert.equal(await evaluate(fixtureSocket, async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (document.querySelectorAll(".library-card").length === 1 && document.querySelector("#artwork").value === "placeholder") return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error("Placeholder filter was not restored after reload");
  }), true);

  const pages = await (await fetch(`${cdp}/json/list`)).json();
  const real = pages.find(page => page.type === "page" && new URL(page.url).pathname === "/browser.html" && !page.url.startsWith(fixtureOrigin));
  if (!real) throw new Error("Open the module icon browser before running the smoke check");
  realSocket = await connect(real.webSocketDebuggerUrl);
  const inspected = await evaluate(realSocket, async () => {
    await Promise.all([...document.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
      image.addEventListener("load", resolve, { once: true }); image.addEventListener("error", resolve, { once: true });
    })));
    return { cards: document.querySelectorAll(".library-card").length,
      broken: [...document.images].filter(image => !image.naturalWidth).length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      summary: document.querySelector("#summary").textContent };
  });
  assert.ok(inspected.cards > 0); assert.equal(inspected.broken, 0); assert.equal(inspected.overflow, false);
  const shot = await realSocket.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(HERE, "browser-preview.png"), Buffer.from(shot.data, "base64"));
  console.log(JSON.stringify({ ...inspected, fixtureSaveReloadClearPassed: true, mobileLayoutPassed: true, placeholderFilterPassed: true,
    screenshot: "dev/icons/review/browser-preview.png" }));
} finally {
  fixtureSocket?.close(); realSocket?.close();
  if (target) {
    const pages = await (await fetch(`${cdp}/json/list`)).json();
    if (pages.some(page => page.id === target.id && page.url.startsWith(fixtureOrigin))) await fetch(`${cdp}/json/close/${target.id}`);
  }
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  assert.equal(path.dirname(path.resolve(fixture)), path.resolve(scratch));
  assert.ok(path.basename(fixture).startsWith("browser-ui-"));
  fs.rmSync(fixture, { recursive: true, force: true });
}
