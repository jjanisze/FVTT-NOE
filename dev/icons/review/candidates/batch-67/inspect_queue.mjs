/** Snapshot saved review decisions and count dedicated canonical assets; no Foundry writes. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ORIGIN_ABILITIES } from "../../../../../scripts/config/pochodzenia-data.mjs";
import { SZTUCZKI } from "../../../../../scripts/config/sztuczki-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../..");
const review = path.resolve(here, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(review, "manifest.json"), "utf8"));
const feedback = JSON.parse(fs.readFileSync(path.join(review, "feedback.json"), "utf8"));
const active = manifest.items.filter(item => item.status !== "resolved").map(item => {
  const decision = feedback.items[item.id] ?? {};
  const selected = item.candidates.find(candidate => candidate.id === decision.candidateId);
  return { id: item.id, name: item.name, tier: item.tier, decision: decision.decision ?? null,
    candidateId: decision.candidateId ?? null, selectedSource: selected?.src ?? null,
    target: item.target ?? null, catalogKey: item.catalogKey ?? null,
    notes: decision.notes ?? "", context: item.context, request: item.request };
});
const slug = key => key.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").replace(/([a-z0-9])([A-Z])/g, "$1-$2").replaceAll("_", "-").toLowerCase();
const normalize = label => label.toLocaleLowerCase("pl").replace(/[^\p{L}\p{N}]/gu, "");
const catalog = [
  ...Object.entries(ORIGIN_ABILITIES).map(([key, item]) => ({ kind: "origin", key, ...item })),
  ...Object.entries(SZTUCZKI).map(([key, item]) => ({ kind: "feat", key, ...item }))
].map(item => {
  const cards = manifest.items.filter(card => card.catalogKey === item.key || normalize(card.name) === normalize(item.label));
  const proposed = `icons/abilities/${slug(item.key)}.svg`;
  const possible = [`icons/abilities/${item.key}.svg`, proposed, ...cards.map(card => card.target).filter(Boolean)];
  const existing = [...new Set(possible)].filter(candidate => fs.existsSync(path.join(root, candidate)));
  return {kind: item.kind, key: item.key, label: item.label, text: item.text,
    origin: item.origin, proposed, represented: cards.length > 0, existing,
    resolved: cards.some(card => card.status === "resolved"), reviewIds: cards.map(card => card.id)};
});
const byKind = Object.fromEntries(["origin", "feat"].map(kind => {
  const entries = catalog.filter(item => item.kind === kind);
  return [kind, {total: entries.length, dedicatedFiles: entries.filter(item => item.existing.length).length,
    unresolvedReview: entries.filter(item => item.represented && !item.resolved).length,
    unqueuedGaps: entries.filter(item => !item.represented && !item.existing.length).length}];
}));
const stats = {date: "2026-10-12", reviewItems: manifest.items.length,
  resolvedReviewItems: manifest.items.filter(item => item.status === "resolved").length,
  activeReviewItems: active.length, canonical: byKind};
const decisionPath = path.join(here, "decisions.json");
if (fs.existsSync(decisionPath)) throw new Error("Historical snapshot already exists; do not overwrite it");
fs.writeFileSync(decisionPath, JSON.stringify({date: "2026-10-12", active}, null, 2) + "\n");
fs.writeFileSync(path.join(here, "catalog.json"), JSON.stringify({date: "2026-10-12", catalog}, null, 2) + "\n");
fs.writeFileSync(path.join(here, "progress.json"), JSON.stringify(stats, null, 2) + "\n");
console.log(JSON.stringify({stats, revisions: active, newGaps: catalog.filter(item => !item.represented && !item.existing.length)}, null, 2));
