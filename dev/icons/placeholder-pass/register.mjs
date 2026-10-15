/** Add one nine-icon batch to GM review, preserving every saved decision byte. */
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
if (validation.batch !== number || validation.validatedMasks !== 9 || batch.subjects.length !== 9) throw new Error("Unvalidated or incomplete batch");
const manifestFile = path.join(REVIEW, "manifest.json");
const feedbackFile = path.join(REVIEW, "feedback.json");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const feedback = fs.readFileSync(feedbackFile);
const ids = new Set(manifest.items.map(item => item.id));
const cards = [];
for (const subject of batch.subjects) {
  const source = `candidates/batch-${number}/${subject.key}.png`;
  if (createHash("sha256").update(fs.readFileSync(path.join(REVIEW, source))).digest("hex") !== validation.candidateHashes[subject.key]) throw new Error(`Candidate changed: ${subject.key}`);
  for (const target of subject.deliveryTargets) {
    const bytes = fs.readFileSync(path.join(ROOT, target.source));
    if (createHash("sha256").update(bytes).digest("hex") !== target.sourceSha256) throw new Error(`Production placeholder changed: ${target.source}`);
  }
  const card = { id: subject.itemId, name: subject.name, tier: `Batch ${number} · ${subject.ownerLabel}`,
    batch: number, placeholderKey: `${subject.kind}:${subject.key}`, target: subject.target,
    deliveryTargets: subject.deliveryTargets,
    context: `${subject.context} ${subject.ruleContext.slice(0, 500)} ${subject.note}`,
    request: subject.request, current: { src: "/" + subject.target, note: "Generated initials placeholder; all exact delivery filenames are recorded above." },
    candidates: [{ id: "atlas-a", label: `Batch ${number} · ${subject.name}`, src: source, note: subject.request }] };
  cards.push(card);
  if (!ids.has(card.id)) manifest.items.push(card);
  else if (JSON.stringify(manifest.items.find(item => item.id === card.id).candidates) !== JSON.stringify(card.candidates)) throw new Error("Existing review card differs; retain its history");
}
manifest.title = `Batch ${number} · ${manifest.items.filter(item => item.status !== "resolved").length} awaiting GM review`;
manifest.updated = batch.date;
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(path.join(directory, "manifest-items.json"), JSON.stringify({ title: manifest.title, updated: manifest.updated, items: cards }, null, 2) + "\n");
if (!fs.readFileSync(feedbackFile).equals(feedback)) throw new Error("GM feedback changed during registration");

const missingFile = path.join(ROOT, "dev/icons/MISSING.md");
let missing = fs.readFileSync(missingFile, "utf8").replaceAll("\r\n", "\n");
const next = Number(missing.match(/\*\*Next batch number: (\d+)\*\*/)?.[1]);
if (!next) throw new Error("Next free batch is missing");
missing = replaceQueueParagraph(missing, "**Next batch number:",
  `**Next batch number: ${Math.max(next, number + 1)}** (Batch ${number}: nine replacement candidates await GM review;\nno production placeholders are replaced before approval).`);
const begin = `<!-- placeholder-batch-${number}:start -->`, end = `<!-- placeholder-batch-${number}:end -->`;
const lines = [begin, `## Queue (A) — Batch ${number} — 9 awaiting GM review`, "",
  "One 3×3 atlas in the established white-glyph style; native initials badges remain",
  "until the GM approves a selected candidate. Exact sources/hashes, generic prompts",
  `and targets: \`review/candidates/batch-${number}/\`.`, "",
  "| Cell | Item | Exact SVG delivery targets (+ WEBP) |", "|---|---|---|"];
for (const subject of batch.subjects) lines.push(`| ${subject.cell} | ${subject.name} | ${subject.deliveryTargets.map(target => `\`${target.source}\``).join("; ")} |`);
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
console.log(`Registered nine Batch ${number} cards; all saved feedback bytes retained, no assets installed`);
