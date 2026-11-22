/** Bind the GM-requested Batch 128 corrections; preserve all previous approval receipts. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { abs, loadManifest, saveManifest, sha256File } from "../../finish/lib/profile.mjs";

const base = "dev/icons/review/candidates/batch-128/";
const read = file => JSON.parse(fs.readFileSync(abs(file), "utf8"));
const installed = read(base + "installed.json");
const manifest = loadManifest();
const ids = new Set(installed.subjects.map(s => s.finishId));
assert.equal(ids.size, 3);

if (process.argv.includes("--prepare")) {
  // Authorized corrections need their new preview before the new hashes can be bound.
  for (const e of manifest.entries.filter(e => ids.has(e.id))) {
    assert.equal(e.review.approval, "dev/icons/m9-pass/finish-approval.json");
    e.review = { status: "correction-authorized", date: "2026-11-18", authorization: base + "normalization-authorization.json" };
  }
  saveManifest(manifest);
  console.log("Three subjects prepared for the authorized correction preview.");
} else {
  const original = read(base + "raw/finish-review-before.json");
  const rendered = read("dev/finish/preview/review.json");
  const oldById = new Map(original.entries.map(e => [e.id, e]));
  const newById = new Map(rendered.entries.map(e => [e.id, e]));
  const icons = manifest.entries.filter(e => e.kind === "icon");
  assert.equal(rendered.profileSha256, original.profileSha256);
  assert.equal(rendered.profileSha256, sha256File(abs("dev/icons/finish/style-profile.json")));
  assert.equal(icons.length, 782);
  assert.equal(newById.size, icons.length);
  assert.equal(rendered.entries.length, icons.length);
  for (const s of installed.subjects) for (const file of s.files) assert.equal(sha256File(abs(file.path)), file.sha256);
  const revised = [];
  for (const entry of icons) {
    const before = oldById.get(entry.id), after = newById.get(entry.id);
    assert.ok(before && after && !after.error, entry.id);
    assert.equal(after.output, before.output, entry.id);
    assert.equal(after.recipeSha256, before.recipeSha256, entry.id);
    assert.equal(after.sourceSha256, sha256File(abs(entry.source)), entry.id);
    assert.equal(after.sourceSha256, entry.sourceSha256, entry.id);
    const changed = before.sourceSha256 !== after.sourceSha256 || before.outputPixelSha256 !== after.outputPixelSha256;
    assert.equal(changed, ids.has(entry.id), `Unexpected change: ${entry.id}`);
    if (!changed) continue;
    entry.review = { status: "approved", date: "2026-11-18", approval: base + "finish-approval.json",
      profileSha256: rendered.profileSha256, sourceSha256: after.sourceSha256,
      recipeSha256: after.recipeSha256, outputPixelSha256: after.outputPixelSha256 };
    revised.push(after);
  }
  const receipt = { schema: "noe-finish-approval-revision/v1", date: "2026-11-18", profile: rendered.profile,
    profileSha256: rendered.profileSha256, authorization: base + "normalization-authorization.json",
    method: installed.method, previousSnapshot: base + "raw/finish-review-before.json",
    previousSnapshotSha256: sha256File(abs(base + "raw/finish-review-before.json")),
    earlierApprovalPreserved: "dev/icons/m9-pass/finish-approval.json", revisedSubjects: revised.length,
    unchangedSubjects: icons.length - revised.length, entries: revised };
  const file = base + "finish-approval.json";
  if (fs.existsSync(abs(file))) assert.deepEqual(read(file), receipt);
  else fs.writeFileSync(abs(file), JSON.stringify(receipt, null, 2) + "\n");
  saveManifest(manifest);
  console.log(JSON.stringify({ revised: revised.length, unchanged: icons.length - revised.length, subjects: icons.length }));
}
