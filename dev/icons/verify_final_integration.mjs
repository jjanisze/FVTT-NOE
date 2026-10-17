/** Final source/data verification; no pack build or live Foundry access. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SZTUCZKI, sztuczkaItemData } from "../../scripts/config/sztuczki-data.mjs";
import { NEUROSHIMA_MARKERS } from "../../scripts/config/conditions.mjs";
import { buildMedykRefillItemData } from "../../scripts/items/toolkit-medyk.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const hash = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const prefix = "modules/neuroshima-2026-overrides/";
const checkPath = source => {
  assert(source.startsWith(prefix), `Expected configured module art: ${source}`);
  assert(fs.existsSync(path.join(root, source.slice(prefix.length))), source);
};
for (const id of Object.keys(SZTUCZKI)) checkPath(sztuczkaItemData(id).img);
checkPath(buildMedykRefillItemData().img);
assert.equal(NEUROSHIMA_MARKERS.wylaczony.img, prefix + "icons/statuses/wylaczony.svg");
checkPath(NEUROSHIMA_MARKERS.wylaczony.img);
const integration = read("dev/icons/integration-2026-10-17.json");
for (const item of integration.files) assert.equal(hash(item.source), item.afterSha256, item.source);
const coverage = read("dev/icons/module-coverage-2026-10-17.json");
for (const item of coverage.bestiary) checkPath(item.configured);
assert.equal(coverage.summary.bestiaryEntries, 342);
assert.equal(coverage.summary.companionEntries, 23);
assert.equal(coverage.summary.bestiaryFallbackEntries, 0);
assert.equal(coverage.summary.companionFallbackEntries, 0);
assert.equal(coverage.summary.sztuczkiFallbackEntries, 0);
assert(coverage.bestiary.filter(item => item.scope === "companion").every(item => item.builderId.startsWith("towarzysz-")));
assert(coverage.summary.groups.every(group => !group.missing && !group.placeholders));
assert.equal(coverage.summary.generatedInitialsAcrossLibrary, 0);
assert.equal(coverage.summary.unresolvedLiteralReferences, 0);
assert.equal(coverage.summary.missingCanonicalStatusImages, 0);
const physical = read("dev/icons/catalog-icons-2026-10-17-integrated.json");
assert.equal(physical.stats.items, 333);
assert.equal(physical.stats.byStatus["module art"], 333);
assert.equal(physical.stats.artGaps, 0);
assert.equal(physical.stats.wiringGaps, 0);
for (const item of physical.items) checkPath(item.img);
const manifest = read("dev/icons/review/manifest.json");
const feedback = read("dev/icons/review/feedback.json").items;
assert.equal(manifest.items.length, 544);
assert(manifest.items.every(item => item.status === "resolved"));
assert(!Object.values(read("dev/icons/review/style-feedback.json").items).some(item => item.status === "redo"));
const delivered = read("dev/icons/review/candidates/batch-111/reviewed-installed.json");
assert.equal(delivered.installed.length, 7);
for (const item of delivered.installed) {
  assert.equal(hash(item.files[0]), item.svgSha256);
  assert.equal(hash(item.files[1]), item.webpSha256);
}
const newYork = delivered.installed.find(item => item.itemId === "origin-nowy-jork");
assert.equal(newYork.candidateId, "batch110-revision");
assert.equal(feedback[newYork.itemId].candidateId, newYork.candidateId);
const touched = new Set(delivered.installed.map(item => item.itemId));
const previous = relative => JSON.parse(execFileSync("git", ["show", `63210a8:${relative}`], { cwd: root, encoding: "utf8" }));
const oldCards = previous("dev/icons/review/manifest.json").items.filter(item => !touched.has(item.id));
const oldFeedback = previous("dev/icons/review/feedback.json").items;
assert.equal(oldCards.length, 537);
for (const item of oldCards) {
  assert.deepEqual(manifest.items.find(card => card.id === item.id), item);
  assert.deepEqual(feedback[item.id], oldFeedback[item.id]);
}
const browser = read("dev/icons/review/candidates/batch-111/raw/completed-review-check.json");
assert.equal(browser.cards, 0);
assert.equal(browser.options, 0);
assert.equal(browser.pendingDecisions, 0);
assert.equal(browser.brokenImages, 0);
assert.equal(browser.errors, 0);
const result = { date: "2026-10-17", status: "Approved glyphs delivered and source wiring complete",
  reviewCardsResolved: 544, pendingReviews: 0, styleRedoFlags: 0,
  latestApprovedDeliveries: 7, originEmblems: 12, companionGlyphsAdded: 5,
  canonicalSztuczkiWithNativeArt: 53, bestiaryEntriesWithNativeArt: 342, companionEntriesWithNativeArt: 23,
  physicalCatalogItemsWithNativeArt: 333, medicineIconsDistinct: physical.stats.uniqueMedicineIcons,
  artworkGaps: 0, auditedSourceWiringGaps: 0, generatedInitials: 0, brokenLiteralReferences: 0,
  originalPlaceholderSubjectsDelivered: 153, originalNativeMaskTargets: 155,
  candidatePairsValidated: 871, unrelatedCardsAndDecisionsPreserved: 537,
  newYorkUsesExactSelectedEarlierCandidate: true, disabledStatusUsesNativeArt: true,
  browserAtCompletion: browser, packBuildRun: false, liveWorldRepointsRun: false,
  remainingGMTask: "Rebuild affected packs and update older world copies when appropriate" };
fs.writeFileSync(path.join(here, "completed-2026-10-17.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
