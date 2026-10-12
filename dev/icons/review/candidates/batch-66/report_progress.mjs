/** Record the post-install asset census, without touching catalog data or Foundry. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../..");
const manifest = JSON.parse(fs.readFileSync(path.resolve(here, "../../manifest.json"), "utf8"));
const { catalog } = JSON.parse(fs.readFileSync(path.join(here, "catalog.json"), "utf8"));
const normalize = label => label.toLocaleLowerCase("pl").replace(/[^\p{L}\p{N}]/gu, "");
const updated = catalog.map(item => {
  const cards = manifest.items.filter(card => card.catalogKey === item.key || normalize(card.name) === normalize(item.label));
  const paths = [...new Set([item.proposed, `icons/abilities/${item.key}.svg`, ...cards.map(card => card.target).filter(Boolean)])];
  return {kind: item.kind, existing: paths.some(file => fs.existsSync(path.join(root, file))),
    represented: cards.length > 0, resolved: cards.some(card => card.status === "resolved")};
});
const canonical = Object.fromEntries(["origin", "feat"].map(kind => {
  const items = updated.filter(item => item.kind === kind);
  return [kind, {total: items.length, dedicatedFiles: items.filter(item => item.existing).length,
    unresolvedReview: items.filter(item => item.represented && !item.resolved).length,
    unqueuedGaps: items.filter(item => !item.represented && !item.existing).length}];
}));
const resolved = manifest.items.filter(item => item.status === "resolved").length;
const unqueued = updated.filter(item => !item.represented && !item.existing).length;
const report = {date: "2026-10-12", phase: "after Batch 65 installations, before Batch 66 registration",
  resolvedReviewItems: resolved, activeReviewItems: manifest.items.length - resolved,
  unqueuedCanonicalGaps: unqueued, knownIconBacklog: manifest.items.length + unqueued,
  approximateCompletedPercent: Math.round(100 * resolved / (manifest.items.length + unqueued)), canonical};
const destination = path.join(here, "progress-after-install.json");
if (fs.existsSync(destination)) throw new Error("Post-install snapshot exists; do not overwrite it");
fs.writeFileSync(destination, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
