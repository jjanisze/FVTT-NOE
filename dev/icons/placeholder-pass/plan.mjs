/** Freeze nine-subject batches covering every currently generated initials badge. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { CLASSES, PROFESSIONS } from "../../../scripts/config/classes-data.mjs";
import { CLASS_FEATURES } from "../../../scripts/config/class-features-data.mjs";
import { isGeneratedPlaceholder } from "../review/placeholders.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const destination = path.join(HERE, "roadmap.json");
if (!fs.existsSync(destination)) {
  const audit = JSON.parse(fs.readFileSync(path.join(ROOT, "dev/icons/class-placeholder-audit.json"), "utf8"));
  const hashes = new Map(audit.placeholders.map(item => [item.source, item.sourceSha256]));
  const subjects = audit.subjects.map(subject => {
    const record = subject.kind === "feature" ? CLASS_FEATURES[subject.id] : subject.kind === "class" ? CLASSES[subject.id] : PROFESSIONS[subject.id];
    if (!record) throw new Error(`Canonical subject no longer exists: ${subject.id}`);
    const targets = subject.files.map(file => ({ source: file.source, variant: file.variant, sourceSha256: hashes.get(file.source) }));
    // Replace the existing unused active badge too, without introducing any mechanic.
    for (const legacy of audit.placeholders.filter(item => !item.referenced && item.source === `icons/abilities/${subject.id}_active.svg`)) {
      targets.push({ source: legacy.source, variant: "legacy-active", sourceSha256: legacy.sourceSha256 });
    }
    for (const target of targets) {
      const data = fs.readFileSync(path.join(ROOT, target.source));
      if (!isGeneratedPlaceholder(data.toString("utf8")) || createHash("sha256").update(data).digest("hex") !== target.sourceSha256) throw new Error(`Source changed: ${target.source}`);
    }
    const ownerLabel = CLASSES[subject.owner]?.label ?? PROFESSIONS[subject.owner]?.label ?? subject.owner;
    return { kind: subject.kind, key: subject.id, name: subject.label, owner: subject.owner, ownerLabel,
      target: targets[0].source, deliveryTargets: targets,
      ruleContext: record.text ?? record.description ?? "",
      context: `${subject.kind === "feature" ? "Class/profession ability" : subject.kind}: ${subject.label}; owner ${ownerLabel}. Character sheet, inventory row, hotbar/macro and chat-card icon, typically 16–64 px.`,
      note: targets.length > 1 ? "The approved glyph is shared by these exact base/active filenames. Existing hotbar code supplies the active pulsing frame; no mechanics or styling code changes." : "Replace the exact existing SVG name with the approved glyph and a WEBP sidecar; no code wiring." };
  });
  const batches = [];
  for (let index = 0; index < subjects.length; index += 9) batches.push({ batch: 69 + batches.length, subjects: subjects.slice(index, index + 9) });
  const covered = batches.flatMap(batch => batch.subjects.flatMap(subject => subject.deliveryTargets.map(target => target.source)));
  if (new Set(covered).size !== audit.placeholders.length) throw new Error("Roadmap does not cover every detected placeholder exactly once");
  if (batches.some(batch => batch.subjects.length !== 9)) throw new Error("Expected complete nine-subject batches");
  fs.writeFileSync(destination, JSON.stringify({ date: "2026-10-15", subjects: subjects.length,
    placeholderFiles: covered.length, batches }, null, 2) + "\n");
}
const roadmap = JSON.parse(fs.readFileSync(destination, "utf8"));
const requested = Number(process.argv.find(arg => arg.startsWith("--batch="))?.slice(8) ?? 69);
const batch = roadmap.batches.find(item => item.batch === requested);
if (!batch) throw new Error("Unknown planned batch");
console.log(JSON.stringify({ plannedBatches: roadmap.batches.length, subjectCount: roadmap.subjects,
  placeholderFiles: roadmap.placeholderFiles, ...batch }, null, 2));
