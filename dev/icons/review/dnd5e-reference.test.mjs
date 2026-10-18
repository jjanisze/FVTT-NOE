/** The reference route may serve only curated artwork, never arbitrary installation files. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REFERENCE_GROUPS, buildReferenceCatalog } from "./dnd5e-reference.mjs";
import { createReviewServer } from "./server.mjs";
import { listenOnSafePort } from "../../agent/lib/ports.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "noe-style-reference-"));
  const roots = { systemRoot: path.join(root, "installed-system"), coreRoot: path.join(root, "installed-core") };
  const moduleRoot = path.join(root, "module");
  const reviewRoot = path.join(moduleRoot, "dev/icons/review");
  function write(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
  }
  write(path.join(roots.systemRoot, "system.json"), JSON.stringify({ version: "reference-fixture", private: "not an image" }));
  write(path.join(reviewRoot, "feedback.json"), '{"items":{"sentinel":{"decision":"approve"}}}\n');
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("noe-style-reference-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { roots, moduleRoot, reviewRoot, write };
}

test("reference groups each offer four distinct, locally resolved examples", t => {
  const { roots } = fixture(t);
  const catalog = buildReferenceCatalog(roots);
  const examples = catalog.groups.flatMap(group => group.examples);
  assert.equal(catalog.groups.length, 11);
  assert.ok(catalog.groups.every(group => group.examples.length === 4));
  assert.equal(new Set(examples.map(entry => entry.id)).size, 44);
  assert.ok(examples.every(entry => entry.src.startsWith("/reference-assets/") && !entry.available));
  assert.equal(catalog.systemVersion, "reference-fixture");
  assert.ok(!JSON.stringify(catalog).includes(roots.systemRoot));
});

test("server exposes allowlisted images from both installations and preserves review data", async t => {
  const { roots, moduleRoot, reviewRoot, write } = fixture(t);
  const classImage = path.join(roots.systemRoot, "icons/classes/fighter.webp");
  const coreImage = path.join(roots.coreRoot, "icons/magic/life/cross-worn-green.webp");
  write(classImage, "system image fixture");
  write(coreImage, "core image fixture");
  const feedback = fs.readFileSync(path.join(reviewRoot, "feedback.json"), "utf8");
  const server = createReviewServer({ moduleRoot, reviewRoot, dnd5eRoots: roots });
  await listenOnSafePort(server, "127.0.0.1");
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const catalog = await (await fetch(`${origin}/api/dnd5e-reference`)).json();
  assert.equal(catalog.groups.flatMap(group => group.examples).filter(entry => entry.available).length, 2);
  const systemResponse = await fetch(`${origin}/reference-assets/class-fighter`);
  assert.equal(systemResponse.headers.get("content-type"), "image/webp");
  assert.equal(await systemResponse.text(), "system image fixture");
  assert.equal(await (await fetch(`${origin}/reference-assets/feature-second-wind`)).text(), "core image fixture");
  for (const id of ["system.json", "..%2Fsystem.json", "icons%2Fclasses%2Ffighter.webp", "unknown", "class-cleric"]) {
    const response = await fetch(`${origin}/reference-assets/${id}`);
    assert.equal(response.status, 404, id);
    assert.ok(!(await response.text()).includes(roots.systemRoot));
  }
  assert.equal((await fetch(`${origin}/reference-assets/class-fighter`, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}"
  })).status, 405);
  assert.equal(fs.readFileSync(path.join(reviewRoot, "feedback.json"), "utf8"), feedback);
  assert.ok(!fs.existsSync(path.join(moduleRoot, "icons")));
});
