/** Apply the GM's full-library approval, conditional on the five requested Batch 127 fixes. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { abs, loadManifest, loadProfile, recipeFor, saveManifest, sha256, sha256File } from "../../finish/lib/profile.mjs";

const read = file => JSON.parse(fs.readFileSync(abs(file), "utf8"));
const originalFile = "dev/icons/m9-pass/finish-review-before-corrections.json";
const approvalFile = "dev/icons/m9-pass/finish-approval.json";
const original = read(originalFile), rendered = read("dev/finish/preview/review.json");
const installed = read("dev/icons/review/candidates/batch-127/installed.json");
const manifest = loadManifest(), profile = loadProfile();
const icons = manifest.entries.filter(e => e.kind === "icon");
const originalById = new Map(original.entries.map(e => [e.id, e]));
const renderedById = new Map(rendered.entries.map(e => [e.id, e]));
const corrected = new Set(installed.subjects.map(e => e.wrapper));
assert.equal(corrected.size, 5);
assert.equal(original.profileSha256, rendered.profileSha256);
assert.equal(rendered.profileSha256, sha256File(abs("dev/icons/finish/style-profile.json")));
assert.equal(rendered.profile, profile.id);
assert.equal(icons.length, original.entries.length);
assert.equal(rendered.entries.length, icons.length);
assert.equal(renderedById.size, icons.length);
for (const subject of installed.subjects) for (const file of subject.files) assert.equal(sha256File(abs(file.path)), file.sha256, file.path);

const changed = [], unchanged = [];
for (const entry of icons) {
  const before = originalById.get(entry.id), after = renderedById.get(entry.id);
  assert.ok(before && after && !after.error, entry.id);
  assert.equal(after.source, entry.source, entry.id);
  assert.equal(after.sourceSha256, entry.sourceSha256, entry.id);
  assert.equal(after.sourceSha256, sha256File(abs(entry.source)), entry.id);
  assert.equal(after.output, entry.outputs[0].path, entry.id);
  assert.equal(after.output, before.output, entry.id);
  const recipe = { ...recipeFor(profile, entry.family), radiusRatio: profile.geometry.groundCornerRadiusAtWorkingSize / profile.geometry.workingCssPixels };
  assert.equal(after.recipeSha256, sha256(JSON.stringify(recipe)), entry.id);
  assert.equal(after.recipeSha256, before.recipeSha256, entry.id);
  assert.match(after.outputPixelSha256, /^[a-f0-9]{64}$/);
  const differs = before.sourceSha256 !== after.sourceSha256 || before.outputPixelSha256 !== after.outputPixelSha256;
  assert.equal(differs, corrected.has(entry.wrapper), `Only the requested corrections may change: ${entry.id}`);
  (differs ? changed : unchanged).push(entry.id);
  entry.review = { status: "approved", date: "2026-11-17", approval: approvalFile,
    profileSha256: rendered.profileSha256, sourceSha256: after.sourceSha256,
    recipeSha256: after.recipeSha256, outputPixelSha256: after.outputPixelSha256 };
}
assert.equal(changed.length, 10);
const receipt = { schema: "noe-finish-approval/v1", date: "2026-11-17", status: "approved", profile: profile.id,
  profileSha256: rendered.profileSha256, authorization: "Can you fix neodrugs and all narkotyki and cygaro? If your image generator gets a fit, just trim 2px of border and resize the existing image. Otherwise approved.",
  reviewedSnapshot: originalFile, reviewedSnapshotSha256: sha256File(abs(originalFile)),
  corrections: "dev/icons/review/candidates/batch-127/installed.json", correctionMethod: "Successful OpenAI image cleanup; crop fallback was not needed.",
  subjectCount: icons.length, correctedVariants: changed, unchangedVariants: unchanged.length, entries: rendered.entries };
if (fs.existsSync(abs(approvalFile))) assert.deepEqual(read(approvalFile), receipt, "Approval receipt is immutable");
else fs.writeFileSync(abs(approvalFile), JSON.stringify(receipt, null, 2) + "\n");
saveManifest(manifest);
console.log(JSON.stringify({ approved: icons.length, corrected: changed.length, unchanged: unchanged.length, profile: profile.id }));
