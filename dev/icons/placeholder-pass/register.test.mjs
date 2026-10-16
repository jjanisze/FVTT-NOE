import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = value => createHash("sha256").update(value).digest("hex");
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neuroshima-icon-register-"));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("neuroshima-icon-register-"));
    fs.rmSync(root, { recursive: true });
  });
  const review = path.join(root, "dev/icons/review");
  const here = path.join(root, "dev/icons/placeholder-pass");
  const batch = path.join(review, "candidates/batch-70");
  for (const directory of [here, batch, path.join(root, "icons/abilities")]) fs.mkdirSync(directory, { recursive: true });
  fs.copyFileSync(path.join(HERE, "register.mjs"), path.join(here, "register.mjs"));
  fs.copyFileSync(path.join(HERE, "../review/queue-paragraph.mjs"), path.join(review, "queue-paragraph.mjs"));
  const subjects = [], hashes = {}, decisions = { approved: { itemId: "approved", decision: "approve", candidateId: "keep", notes: "Keep this exact GM note." } };
  const items = [{ id: "approved", name: "Previously approved", batch: 68, status: "resolved", candidates: [{ id: "keep", src: "keep.png" }] }];
  for (let index = 0; index < 9; index++) {
    const key = `test-${index}`;
    const source = `icons/abilities/${key}.svg`;
    const original = `original badge ${index}`;
    fs.writeFileSync(path.join(root, source), original);
    fs.writeFileSync(path.join(batch, `${key}.png`), `candidate ${index}`);
    hashes[key] = sha(`candidate ${index}`);
    const subject = { key, name: key, kind: "feature", ownerLabel: "Generic", cell: index + 1,
      itemId: `batch70-${key}`, target: source, context: "Generic ability", ruleContext: "Generic rule", note: "No wiring", request: "Generic glyph",
      deliveryTargets: [{ source, sourceSha256: sha(original) }] };
    if (index < 4) {
      subject.itemId = `batch69-${key}`;
      const feedback = { itemId: subject.itemId, decision: "revise", candidateId: "atlas-a", notes: `Exact correction ${index}` };
      const selectedSource = `old-${index}.png`;
      fs.writeFileSync(path.join(review, selectedSource), `old candidate ${index}`);
      decisions[subject.itemId] = feedback;
      subject.revisionOf = { feedback, candidateId: "atlas-a", selectedSource, sourceSha256: sha(`old candidate ${index}`) };
      items.push({ id: subject.itemId, name: key, batch: 69, context: "Original context", current: { src: "/" + source },
        candidates: [{ id: "atlas-a", label: "Old candidate", src: selectedSource }] });
    }
    subjects.push(subject);
  }
  json(path.join(batch, "batch.json"), { date: "2026-10-15", batch: 70, subjects });
  json(path.join(batch, "validated.json"), { batch: 70, validatedMasks: 9, candidateHashes: hashes });
  json(path.join(review, "manifest.json"), { title: "Original", items });
  json(path.join(review, "feedback.json"), { version: 1, items: decisions });
  const queue = "**Next batch number: 70** (pending).\r\n\r\nHistorical sentinel.\r\n\r\n<!-- class-placeholder-audit:start -->\r\nNative backlog.\r\n<!-- class-placeholder-audit:end -->\r\n";
  fs.writeFileSync(path.join(root, "dev/icons/MISSING.md"), queue);
  const run = () => spawnSync(process.execPath, [path.join(here, "register.mjs"), "--batch=70"], { encoding: "utf8" });
  const read = name => JSON.parse(fs.readFileSync(path.join(review, name), "utf8"));
  return { root, review, batch, decisions, subjects, run, read };
}

test("four revisions retain exact history and five fresh cards preserve unrelated decisions", t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const manifest = f.read("manifest.json"), feedback = f.read("feedback.json");
  assert.equal(manifest.items.length, 10);
  assert.equal(manifest.items.filter(item => item.status !== "resolved").length, 9);
  assert.deepEqual(feedback.items.approved, f.decisions.approved);
  const archive = JSON.parse(fs.readFileSync(path.join(f.batch, "revision-feedback-before.json"), "utf8"));
  for (const subject of f.subjects.slice(0, 4)) {
    assert.deepEqual(archive[subject.itemId], f.decisions[subject.itemId]);
    assert.equal(feedback.items[subject.itemId].decision, "pending");
    assert.equal(feedback.items[subject.itemId].candidateId, "batch70-revision");
    const card = manifest.items.find(item => item.id === subject.itemId);
    assert.equal(card.batch, 70);
    assert.deepEqual(card.candidates.map(candidate => candidate.id), ["batch70-revision", "atlas-a"]);
  }
  assert.match(fs.readFileSync(path.join(f.root, "dev/icons/MISSING.md"), "utf8"), /Historical sentinel\./);
  const before = fs.readFileSync(path.join(f.review, "feedback.json"));
  assert.equal(f.run().status, 0, "Registration should be idempotent before a new GM decision");
  assert.deepEqual(fs.readFileSync(path.join(f.review, "feedback.json")), before);
});

test("a newer GM correction aborts before manifest, feedback or queue writes", t => {
  const f = fixture(t);
  const feedbackFile = path.join(f.review, "feedback.json");
  const feedback = f.read("feedback.json");
  feedback.items[f.subjects[3].itemId].notes = "Newer GM correction";
  json(feedbackFile, feedback);
  const files = [feedbackFile, path.join(f.review, "manifest.json"), path.join(f.root, "dev/icons/MISSING.md")];
  const before = files.map(file => fs.readFileSync(file));
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /GM revision feedback changed/);
  files.forEach((file, index) => assert.deepEqual(fs.readFileSync(file), before[index]));
});

test("an explicitly partial eight-subject atlas retains review history", t => {
  const f = fixture(t);
  const batchFile = path.join(f.batch, "batch.json"), validationFile = path.join(f.batch, "validated.json");
  const batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
  batch.subjects = batch.subjects.slice(0, 8);
  batch.partialAtlas = true;
  batch.emptyCells = [9];
  json(batchFile, batch);
  const validation = JSON.parse(fs.readFileSync(validationFile, "utf8"));
  validation.validatedMasks = 8;
  delete validation.candidateHashes["test-8"];
  json(validationFile, validation);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.read("manifest.json").items.filter(item => item.status !== "resolved").length, 8);
  assert.deepEqual(f.read("feedback.json").items.approved, f.decisions.approved);
  assert.match(fs.readFileSync(path.join(f.root, "dev/icons/MISSING.md"), "utf8"), /8 awaiting GM review/);
});

test("an undeclared short batch aborts without changing feedback or manifest", t => {
  const f = fixture(t);
  const batchFile = path.join(f.batch, "batch.json"), batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
  batch.subjects.pop();
  json(batchFile, batch);
  const files = [path.join(f.review, "manifest.json"), path.join(f.review, "feedback.json")];
  const before = files.map(file => fs.readFileSync(file));
  assert.notEqual(f.run().status, 0);
  files.forEach((file, index) => assert.deepEqual(fs.readFileSync(file), before[index]));
});
