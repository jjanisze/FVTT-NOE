/** Add a validated full or explicitly partial atlas, retaining saved review history. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { replaceQueueParagraph } from "../review/queue-paragraph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const REVIEW = path.join(ROOT, "dev/icons/review");
const number = Number(process.argv.find(arg => arg.startsWith("--batch="))?.slice(8));
if (!Number.isInteger(number) || number < 69) throw new Error("Specify --batch=<number>, starting at 69");
const directory = path.join(REVIEW, "candidates", `batch-${number}`);
const batch = JSON.parse(fs.readFileSync(path.join(directory, "batch.json"), "utf8"));
const validation = JSON.parse(fs.readFileSync(path.join(directory, "validated.json"), "utf8"));
const subjectCount = batch.subjects.length;
const emptyCells = Array.from({ length: 9 - subjectCount }, (_, index) => subjectCount + index + 1);
if (subjectCount < 1 || subjectCount > 9 || validation.batch !== number || validation.validatedMasks !== subjectCount
    || (subjectCount < 9 && (batch.partialAtlas !== true || JSON.stringify(batch.emptyCells) !== JSON.stringify(emptyCells)))) throw new Error("Unvalidated or incomplete batch");
const manifestFile = path.join(REVIEW, "manifest.json");
const feedbackFile = path.join(REVIEW, "feedback.json");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const feedback = fs.readFileSync(feedbackFile);
const stored = JSON.parse(feedback);
const originalDecisions = structuredClone(stored.items);
const revisions = new Set();
const ids = new Set(manifest.items.map(item => item.id));
const cards = [];
for (const subject of batch.subjects) {
  const source = `candidates/batch-${number}/${subject.key}.png`;
  if (createHash("sha256").update(fs.readFileSync(path.join(REVIEW, source))).digest("hex") !== validation.candidateHashes[subject.key]) throw new Error(`Candidate changed: ${subject.key}`);
  for (const target of subject.deliveryTargets) {
    const bytes = fs.readFileSync(path.join(ROOT, target.source));
    if (createHash("sha256").update(bytes).digest("hex") !== target.sourceSha256) throw new Error(`Production placeholder changed: ${target.source}`);
  }
  let card = { id: subject.itemId, name: subject.name, tier: `Batch ${number} · ${subject.ownerLabel}`,
    batch: number, placeholderKey: `${subject.kind}:${subject.key}`, target: subject.target,
    deliveryTargets: subject.deliveryTargets,
    context: `${subject.context} ${subject.ruleContext.slice(0, 500)} ${subject.note}`,
    request: subject.request, current: { src: "/" + subject.target, note: "Generated initials placeholder; all exact delivery filenames are recorded above." },
    candidates: [{ id: "atlas-a", label: `Batch ${number} · ${subject.name}`, src: source, note: subject.request }] };
  if (subject.revisionOf) {
    const existing = manifest.items.find(item => item.id === subject.itemId);
    if (!existing || existing.status === "resolved") throw new Error("Revision card is missing or already delivered");
    const candidate = { ...card.candidates[0], id: `batch${number}-revision`, label: `Batch ${number} · revised ${subject.name}` };
    if (!existing.candidates.some(item => item.id === candidate.id)) {
      if (JSON.stringify(stored.items[subject.itemId]) !== JSON.stringify(subject.revisionOf.feedback)) throw new Error("GM revision feedback changed; retain the newer decision");
      const selected = existing.candidates.find(item => item.id === subject.revisionOf.candidateId);
      if (selected?.src !== subject.revisionOf.selectedSource || createHash("sha256").update(fs.readFileSync(path.join(REVIEW, selected.src))).digest("hex") !== subject.revisionOf.sourceSha256) throw new Error("Revision reference changed");
      existing.candidates.unshift(candidate);
      stored.items[subject.itemId] = { itemId: subject.itemId, decision: "pending", candidateId: candidate.id,
        notes: "", updatedAt: new Date().toISOString() };
      revisions.add(subject.itemId);
    } else if (JSON.stringify(existing.candidates.find(item => item.id === candidate.id)) !== JSON.stringify(candidate)) throw new Error("Existing revision candidate differs");
    Object.assign(existing, { tier: card.tier, batch: number, request: subject.request, context: card.context });
    card = existing;
  } else if (!ids.has(card.id)) {
    manifest.items.push(card);
    ids.add(card.id);
  } else if (JSON.stringify(manifest.items.find(item => item.id === card.id).candidates) !== JSON.stringify(card.candidates)) throw new Error("Existing review card differs; retain its history");
  cards.push(card);
}
const active = manifest.items.filter(item => item.status !== "resolved");
const batchNumbers = [...new Set(active.map(item => item.batch).filter(Boolean))].sort((a, b) => a - b);
manifest.title = `${batchNumbers.length > 1 ? "Batches" : "Batch"} ${batchNumbers.join(" + ")} · ${active.length} awaiting GM review`;
manifest.updated = batch.date;
if (!fs.readFileSync(feedbackFile).equals(feedback)) throw new Error("GM feedback changed during registration preflight");
for (const [id, value] of Object.entries(originalDecisions)) {
  if (!revisions.has(id) && JSON.stringify(stored.items[id]) !== JSON.stringify(value)) throw new Error("Unrelated GM decision changed");
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(path.join(directory, "manifest-items.json"), JSON.stringify({ title: manifest.title, updated: manifest.updated, items: cards }, null, 2) + "\n");
if (revisions.size) {
  fs.writeFileSync(path.join(directory, "revision-feedback-before.json"), JSON.stringify(Object.fromEntries([...revisions].map(id => [id, originalDecisions[id]])), null, 2) + "\n");
  fs.writeFileSync(feedbackFile, JSON.stringify(stored, null, 2) + "\n");
} else if (!fs.readFileSync(feedbackFile).equals(feedback)) throw new Error("GM feedback changed during registration");

const missingFile = path.join(ROOT, "dev/icons/MISSING.md");
let missing = fs.readFileSync(missingFile, "utf8").replaceAll("\r\n", "\n");
const next = Number(missing.match(/\*\*Next batch number: (\d+)\*\*/)?.[1]);
if (!next) throw new Error("Next free batch is missing");
missing = replaceQueueParagraph(missing, "**Next batch number:",
  `**Next batch number: ${Math.max(next, number + 1)}** (${active.length} candidates in ${batchNumbers.length} batches await GM review;\nproduction replacements require a saved approval).`);
const begin = `<!-- placeholder-batch-${number}:start -->`, end = `<!-- placeholder-batch-${number}:end -->`;
const lines = [begin, `## Queue (A) — Batch ${number} — ${subjectCount} awaiting GM review`, "",
  "One 3×3 atlas in the established white-glyph style; native initials badges remain",
  "until the GM approves a selected candidate. Exact sources/hashes, generic prompts",
  `and targets: \`review/candidates/batch-${number}/\`.`, "",
  "| Cell | Item | Exact SVG delivery targets (+ WEBP) |", "|---|---|---|"];
for (const subject of batch.subjects) lines.push(`| ${subject.cell} | ${subject.name}${subject.revisionOf ? " (revision)" : ""} | ${subject.deliveryTargets.map(target => `\`${target.source}\``).join("; ")} |`);
if (batch.subjects.some(subject => subject.revisionOf)) lines.push("", "Saved revision notes and original selected-source hashes are retained in batch.json", "and revision-feedback-before.json. Old candidates remain available; only these", "revision cards are reset to pending with the new candidate selected.");
lines.push("", "The roadmap covers all 155 native badge files in 153 subjects (17 fresh groups of",
  "nine). Later batch numbers are provisional: saved revisions take priority and",
  "may add batches. Base/active files share approved pixels; the existing active",
  "hotbar pulse remains in the code. Old unused active filenames are compatibility",
  "targets, without new mechanics or wiring. Code, packs and world state are untouched.", "", end);
const section = lines.join("\n");
const start = missing.indexOf(begin), finish = missing.indexOf(end);
if ((start >= 0) !== (finish >= 0)) throw new Error("Incomplete batch queue markers");
if (start >= 0) missing = missing.slice(0, start) + section + missing.slice(finish + end.length);
else {
  const anchor = missing.indexOf("<!-- class-placeholder-audit:start -->");
  if (anchor < 0) throw new Error("Class-placeholder backlog anchor is missing");
  missing = missing.slice(0, anchor) + section + "\n\n" + missing.slice(anchor);
}
fs.writeFileSync(missingFile, missing);
console.log(`Registered ${subjectCount} Batch ${number} candidates; ${revisions.size} revision selections reset with exact feedback archived; unrelated decisions retained`);
