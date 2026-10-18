/** Isolated filesystem/API tests: never write production icons or GM decisions. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalog, saveStyleFeedback, mergeStyleQueue } from "./catalog.mjs";
import { createReviewServer } from "./server.mjs";
import { isGeneratedPlaceholder } from "./placeholders.mjs";
import { replaceQueueParagraph } from "./queue-paragraph.mjs";
import { listenOnSafePort } from "../../agent/lib/ports.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = path.resolve(HERE, "audits");
const ORIGINAL_QUEUE = "# Missing assets\n\nManual request stays here.\n\n## How an item gets added here\n\nOther agent notes stay here.\n";

function fixture(t) {
  fs.mkdirSync(SCRATCH, { recursive: true });
  const root = fs.mkdtempSync(path.join(SCRATCH, "browser-test-"));
  const review = path.join(root, "dev/icons/review");
  function write(relative, text) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  write("icons/items/reminex.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="80" height="100" fill="white"/></svg>');
  write("icons/items/reminex.webp", "webp test variant");
  write("icons/items/reminex.png", "png test variant");
  write("icons/abilities/learning.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
  write("icons/weapons/odd name.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
  write("icons/README.md", "Not an image");
  write("dev/icons/MISSING.md", ORIGINAL_QUEUE);
  write("dev/icons/catalog-icons-2026-10-12.json", JSON.stringify({ items: [{ relative: "icons/items/reminex.svg", label: "Reminex" }] }));
  write("dev/icons/review/manifest.json", JSON.stringify({ title: "Existing review", items: [{ id: "older-approved", name: "Medicine", target: "icons/items/reminex.svg", status: "resolved", candidates: [{ id: "old", src: "old.png" }] }] }));
  write("dev/icons/review/feedback.json", JSON.stringify({ version: 1, items: { "older-approved": { itemId: "older-approved", decision: "approve", candidateId: "old", notes: "Existing GM decision" } } }));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), SCRATCH);
    assert.ok(path.basename(resolved).startsWith("browser-test-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return { root, review, write };
}

function payload(icon, status = "redo") {
  const variant = icon.variants[0];
  return { iconId: icon.id, source: variant.source, sourceSha256: variant.sha256,
           status, reasons: ["detail", "anime"], notes: "Fewer face lines; broad black gaps." };
}

test("queue paragraph updates preserve history with Windows line endings and reject unbounded matches", () => {
  const old = "Introduction.\r\n\r\n**Counter** first line\r\nsecond line\r\n\r\n## Old history\r\nPreserve every row.\r\n";
  const changed = replaceQueueParagraph(old, "**Counter**", "**Counter** updated");
  assert.equal(changed, "Introduction.\n\n**Counter** updated\n\n## Old history\nPreserve every row.\n");
  assert.throws(() => replaceQueueParagraph("**Counter** " + "x".repeat(1100) + "\n\nHistory", "**Counter**", "new"));
  assert.throws(() => replaceQueueParagraph("**Counter** no terminator", "**Counter**", "new"));
});

test("placeholder classification requires the exact generated badge signature", t => {
  const f = fixture(t);
  const badge = '<svg viewBox="0 0 64 64"><linearGradient id="g"><stop stop-color="#101012"/></linearGradient><text style="paint-order:stroke" stroke-width="0.8">ABC</text></svg>';
  assert.equal(isGeneratedPlaceholder(badge), true);
  assert.equal(isGeneratedPlaceholder('<svg><text>12</text></svg>'), false);
  assert.equal(isGeneratedPlaceholder('<svg><image href="data:image/webp;base64,abc"/></svg>'), false);
  f.write("icons/abilities/placeholder.svg", badge);
  const catalog = buildCatalog(f.root, f.review);
  assert.equal(catalog.icons.filter(icon => icon.placeholder).length, 1);
  const placeholder = catalog.icons.find(icon => icon.id === "abilities/placeholder");
  assert.equal(placeholder.variants[0].placeholder, true);
  saveStyleFeedback(f.root, f.review, { ...payload(placeholder), reasons: ["placeholder"] });
  assert.ok(fs.readFileSync(path.join(f.root, "dev/icons/MISSING.md"), "utf8").includes("Placeholder / initials"));
});

test("catalog groups format sidecars, keeps canonical labels and excludes non-images", t => {
  const f = fixture(t), catalog = buildCatalog(f.root, f.review);
  assert.equal(catalog.icons.length, 3);
  const icon = catalog.icons.find(item => item.id === "items/reminex");
  assert.equal(icon.name, "Reminex");
  assert.deepEqual(icon.aliases, ["Reminex", "Medicine"]);
  assert.deepEqual(icon.variants.map(item => item.format), ["SVG", "WEBP", "PNG"]);
  assert.equal(icon.preferred, "icons/items/reminex.svg");
  assert.equal(new Set(icon.variants.map(item => item.sha256)).size, 3);
});

test("style decisions persist, update only managed queue text, and preserve approvals and images", t => {
  const f = fixture(t), icon = buildCatalog(f.root, f.review).icons.find(item => item.id === "items/reminex");
  const oldFeedback = fs.readFileSync(path.join(f.review, "feedback.json"));
  const oldImage = fs.readFileSync(path.join(f.root, icon.preferred));
  const input = payload(icon); input.notes = "Less detail | no <labels>\nBroad cuts.";
  saveStyleFeedback(f.root, f.review, input);
  const reloaded = buildCatalog(f.root, f.review).icons.find(item => item.id === icon.id);
  assert.equal(reloaded.review.status, "redo");
  assert.deepEqual(reloaded.review.reasons, ["detail", "anime"]);
  const queue = fs.readFileSync(path.join(f.root, "dev/icons/MISSING.md"), "utf8");
  assert.ok(queue.includes("Manual request stays here.") && queue.includes("Other agent notes stay here."));
  assert.ok(queue.includes("Less detail \\| no &lt;labels&gt; Broad cuts."));
  assert.equal(queue.split("<!-- icon-style-review:start -->").length, 2);
  saveStyleFeedback(f.root, f.review, payload(icon, "keep"));
  assert.ok(fs.readFileSync(path.join(f.root, "dev/icons/MISSING.md"), "utf8").includes("No icons currently flagged for redo."));
  saveStyleFeedback(f.root, f.review, payload(icon, "unreviewed"));
  assert.equal(buildCatalog(f.root, f.review).icons.find(item => item.id === icon.id).review, null);
  assert.deepEqual(fs.readFileSync(path.join(f.review, "feedback.json")), oldFeedback);
  assert.deepEqual(fs.readFileSync(path.join(f.root, icon.preferred)), oldImage);
});

test("changed source files are marked stale and cannot receive an outdated decision", t => {
  const f = fixture(t), icon = buildCatalog(f.root, f.review).icons.find(item => item.id === "items/reminex");
  saveStyleFeedback(f.root, f.review, payload(icon));
  f.write(icon.preferred, '<svg xmlns="http://www.w3.org/2000/svg"><circle r="20"/></svg>');
  const changed = buildCatalog(f.root, f.review).icons.find(item => item.id === icon.id);
  assert.equal(changed.review.stale, true);
  assert.throws(() => saveStyleFeedback(f.root, f.review, payload(icon)), error => error.status === 409);
  saveStyleFeedback(f.root, f.review, payload(changed, "keep"));
  assert.equal(buildCatalog(f.root, f.review).icons.find(item => item.id === icon.id).review.stale, false);
});

test("invalid paths/reasons/empty flags and damaged queue markers do not discard existing data", t => {
  const f = fixture(t), icon = buildCatalog(f.root, f.review).icons[0];
  for (const patch of [{ iconId: "../outside" }, { source: "icons/../secret.svg" }, { reasons: ["bogus"] }, { reasons: [], notes: "" }]) {
    assert.throws(() => saveStyleFeedback(f.root, f.review, { ...payload(icon), ...patch }));
    assert.equal(fs.readFileSync(path.join(f.root, "dev/icons/MISSING.md"), "utf8"), ORIGINAL_QUEUE);
  }
  assert.throws(() => mergeStyleQueue(ORIGINAL_QUEUE + "<!-- icon-style-review:start -->", "replacement"));
});

test("HTTP routes save style flags independently and reject cross-origin or non-JSON writes", async t => {
  const f = fixture(t), server = createReviewServer({ moduleRoot: f.root, reviewRoot: f.review });
  await listenOnSafePort(server, "127.0.0.1");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const catalog = await (await fetch(base + "/api/catalog")).json();
  assert.equal(catalog.icons.length, 3);
  assert.equal((await fetch(base + "/icons/weapons/odd%20name.svg")).status, 200);
  const input = payload(catalog.icons[0]);
  const post = headers => fetch(base + "/api/style-feedback", { method: "POST", headers, body: JSON.stringify(input) });
  assert.equal((await post({ "content-type": "text/plain" })).status, 400);
  assert.equal((await post({ "content-type": "application/json", origin: "https://untrusted.invalid" })).status, 400);
  assert.equal((await post({ "content-type": "application/json", origin: base })).status, 200);
  const approved = (await (await fetch(base + "/api/feedback")).json()).items["older-approved"];
  assert.equal(approved.decision, "approve");
  const response = await fetch(base + "/api/feedback", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId: "older-approved", decision: "approve", candidateId: "old", notes: "Existing GM decision" }) });
  assert.equal(response.status, 200);
});
