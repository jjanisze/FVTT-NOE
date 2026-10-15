/** Audit real initials placeholders against canonical class/profession definitions. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLASSES, PROFESSIONS } from "../../scripts/config/classes-data.mjs";
import { CLASS_FEATURES } from "../../scripts/config/class-features-data.mjs";
import { buildCatalog } from "./review/catalog.mjs";
import { replaceQueueParagraph } from "./review/queue-paragraph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const expected = new Map();
const add = (source, item) => expected.set(source, { ...item, source });
for (const [id, item] of Object.entries(CLASSES)) add(`icons/klasy/${id}.svg`, { kind: "class", id, label: item.label, owner: id, variant: "default" });
for (const [id, item] of Object.entries(PROFESSIONS)) add(`icons/profesje/${id}.svg`, { kind: "profession", id, label: item.label, owner: item.klasa, variant: "default" });
for (const item of Object.values(CLASS_FEATURES)) {
  const entry = { kind: "feature", id: item.id, label: item.label, owner: item.owner, variant: "default" };
  add(`icons/abilities/${item.id}.svg`, entry);
  if (item.toggle) add(`icons/abilities/${item.id}_active.svg`, { ...entry, variant: "active" });
}
const catalog = buildCatalog(ROOT, path.join(HERE, "review"));
const placeholders = catalog.icons.flatMap(icon => icon.variants.filter(variant => variant.placeholder).map(variant => ({
  ...(expected.get(variant.source) ?? { kind: "unmapped", id: icon.id, label: icon.name, variant: "unknown" }),
  source: variant.source, sourceSha256: variant.sha256, referenced: expected.has(variant.source)
})));
const missing = [...expected.values()].filter(item => !fs.existsSync(path.join(ROOT, item.source)));
const subjects = new Map();
for (const item of [...placeholders.filter(item => item.referenced), ...missing]) {
  const key = `${item.kind}:${item.id}`;
  const subject = subjects.get(key) ?? { kind: item.kind, id: item.id, label: item.label, owner: item.owner, files: [] };
  subject.files.push({ source: item.source, variant: item.variant, status: item.sourceSha256 ? "generated placeholder" : "missing file" });
  subjects.set(key, subject);
}
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const byKind = Object.fromEntries(["class", "profession", "feature"].map(kind => [kind, placeholders.filter(item => item.kind === kind).length]));
const report = { stats: { date, confirmedPlaceholderFiles: placeholders.length,
  referencedPlaceholderFiles: placeholders.filter(item => item.referenced).length,
  unmappedPlaceholderFiles: placeholders.filter(item => !item.referenced).length,
  activeVariants: placeholders.filter(item => item.source.endsWith("_active.svg")).length,
  referencedActiveVariants: placeholders.filter(item => item.variant === "active").length,
  abilityPlaceholderFiles: placeholders.filter(item => item.source.startsWith("icons/abilities/")).length,
  missingExpectedFiles: missing.length, artSubjects: subjects.size, byKind,
  scope: "Exact generator signature plus canonical class/profession definitions; no world or pack reads" },
  placeholders, missing, subjects: [...subjects.values()] };
fs.writeFileSync(path.join(HERE, "class-placeholder-audit.json"), JSON.stringify(report, null, 2) + "\n");

const begin = "<!-- class-placeholder-audit:start -->", end = "<!-- class-placeholder-audit:end -->";
const clean = value => String(value).replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
const lines = [begin, "## Class/profession placeholder backlog — confirmed from source", "",
  `Audit ${date}: **${placeholders.length} generated initials SVGs**, including ${byKind.class} classes,`,
  `${byKind.profession} professions and ${report.stats.abilityPlaceholderFiles} ability files. ${report.stats.activeVariants} ability files are active-state`,
  `variants. Canonically referenced art requests below represent **${subjects.size} subjects**;`,
  "base/active variants share a subject and must keep their existing exact filenames.",
  "These were outside the previous 342-card generation queue. File existence was not",
  "evidence of finished artwork. Native badges were confirmed against the exact",
  "`gen_class_placeholders.mjs` SVG signature, not inferred from arbitrary SVG text.", "",
  "Evidence: `class-placeholder-audit.json`; reproduce with `node dev/icons/audit-class-placeholders.mjs`.",
  "This is an art backlog, not a pack/world migration. Generic white-glyph prompts",
  "must use the corresponding class/profession/feature definition. Use Pipeline.md",
  "and the next free batch; fresh GM approval is required before replacement.", "",
  "| Kind | Subject | Owner | Exact SVG targets (+ WEBP after approval) | Status |",
  "|---|---|---|---|---|"];
for (const subject of subjects.values()) {
  lines.push(`| ${subject.kind} | ${clean(subject.label)} | ${clean(subject.owner)} | ${subject.files.map(file => `\`${file.source}\``).join("; ")} | Needs art |`);
}
if (report.stats.unmappedPlaceholderFiles) lines.push("", `${report.stats.unmappedPlaceholderFiles} additional old badges have no canonical match; listed in the audit, not assumed to need new art.`);
lines.push("", end);
const section = lines.join("\n");
const queueFile = path.join(HERE, "MISSING.md");
let queue = fs.readFileSync(queueFile, "utf8").replaceAll("\r\n", "\n");
const startIndex = queue.indexOf(begin), endIndex = queue.indexOf(end);
if ((startIndex >= 0) !== (endIndex >= 0) || (startIndex >= 0 && endIndex < startIndex)) throw new Error("Class-placeholder queue markers need repair");
if (startIndex >= 0) queue = queue.slice(0, startIndex) + section + queue.slice(endIndex + end.length);
else {
  const anchor = queue.indexOf("## How an item gets added here");
  if (anchor < 0) throw new Error("Expected asset-queue anchor not found");
  queue = queue.slice(0, anchor) + section + "\n\n" + queue.slice(anchor);
}
const nextBatch = queue.match(/\*\*Next batch number: (\d+)\*\*/)?.[1];
if (!nextBatch) throw new Error("Next asset batch number not found");
queue = replaceQueueParagraph(queue, "**Next batch number:",
  `**Next batch number: ${nextBatch}** (the previous 342-card queue is resolved; the newly\naudited class/profession placeholder backlog remains and is listed below).\n\n`);
queue = replaceQueueParagraph(queue, "**Icon coverage",
  `**Icon coverage correction, ${date}:** the previous 342 review cards are resolved,\nbut that queue omitted class/profession artwork. The source audit confirms\n${placeholders.length} generated initials badges (${subjects.size} canonically referenced art subjects).\nOrigins, Sztuczki, M5 actions and fuel-grade deliveries from the earlier pass\nremain delivered; these counts do not cover all module icons. See the class\nplaceholder backlog and \`class-placeholder-audit.json\`. GM wiring and painted\nart remain separate.\n\n`);
fs.writeFileSync(queueFile, queue);
console.log(JSON.stringify(report.stats, null, 2));
