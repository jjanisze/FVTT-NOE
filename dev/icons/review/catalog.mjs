/** On-disk icon inventory and independent, persistent style-review decisions. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const EXTENSIONS = new Map([[".svg", 0], [".webp", 1], [".png", 2], [".jpg", 3], [".jpeg", 4], [".avif", 5], [".gif", 6]]);
const START = "<!-- icon-style-review:start -->";
const END = "<!-- icon-style-review:end -->";
const hashes = new Map();
export const REASONS = [
  { id: "detail", label: "Too detailed" },
  { id: "dither", label: "Dithered / speckled" },
  { id: "anime", label: "Anime / cartoon" },
  { id: "subject", label: "Wrong subject" },
  { id: "other", label: "Other" }
];

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

function hashFile(file, stat) {
  const signature = `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
  const cached = hashes.get(file);
  if (cached?.signature === signature) return cached.hash;
  const hash = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  hashes.set(file, { signature, hash });
  return hash;
}

function humanize(value) {
  const words = value.replace(/[_-]+/g, " ");
  return words.charAt(0).toLocaleUpperCase("pl") + words.slice(1);
}

export function readStyleFeedback(reviewRoot) {
  return readJson(path.join(reviewRoot, "style-feedback.json"), { version: 1, items: {} });
}

export function buildCatalog(moduleRoot, reviewRoot) {
  const iconRoot = path.join(moduleRoot, "icons");
  const labels = new Map();
  const addLabel = (file, label) => {
    if (!file || !label) return;
    const relative = file.replace(/^modules\/[^/]+\//, "").replace(/^\//, "");
    if (!relative.startsWith("icons/")) return;
    const id = relative.slice(6).replace(/\.[^.]+$/, "");
    const values = labels.get(id) ?? new Set();
    values.add(label);
    labels.set(id, values);
  };
  for (const item of readJson(path.join(moduleRoot, "dev/icons/catalog-icons-2026-10-12.json"), { items: [] }).items) {
    addLabel(item.relative, item.label);
  }
  for (const item of readJson(path.join(reviewRoot, "manifest.json"), { items: [] }).items) {
    addLabel(item.target, item.name);
  }
  const groups = new Map();
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      const extension = path.extname(entry.name).toLowerCase();
      if (!entry.isFile() || !EXTENSIONS.has(extension)) continue;
      const relative = path.relative(iconRoot, file).split(path.sep).join("/");
      const id = relative.slice(0, -extension.length);
      const stat = fs.statSync(file);
      const variant = { source: `icons/${relative}`, format: extension.slice(1).toUpperCase(),
                        bytes: stat.size, sha256: hashFile(file, stat) };
      const group = groups.get(id) ?? { id, name: [...(labels.get(id) ?? [humanize(path.basename(id))])][0],
                                      aliases: [...(labels.get(id) ?? [])],
                                      category: path.posix.dirname(id) === "." ? "Other" : path.posix.dirname(id), variants: [] };
      group.variants.push(variant);
      groups.set(id, group);
    }
  }
  walk(iconRoot);
  const stored = readStyleFeedback(reviewRoot);
  const icons = [...groups.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, "pl"));
  for (const icon of icons) {
    icon.variants.sort((a, b) => EXTENSIONS.get(path.extname(a.source).toLowerCase()) - EXTENSIONS.get(path.extname(b.source).toLowerCase()));
    icon.preferred = icon.variants[0].source;
    icon.review = stored.items[icon.id] ?? null;
    if (icon.review) {
      const selected = icon.variants.find(variant => variant.source === icon.review.source);
      icon.review = { ...icon.review, stale: selected?.sha256 !== icon.review.sourceSha256 };
    }
  }
  return { icons, categories: [...new Set(icons.map(icon => icon.category))].sort(), reasonOptions: REASONS };
}

function atomicWrite(file, text) {
  const temporary = file + ".tmp";
  const backup = file + ".bak";
  fs.writeFileSync(temporary, text, "utf8");
  if (fs.existsSync(file)) fs.copyFileSync(file, backup);
  try { fs.renameSync(temporary, file); }
  catch (error) { fs.rmSync(temporary, { force: true }); throw error; }
}

const markdown = value => String(value).replace(/[\r\n]+/g, " ").replace(/\|/g, "\\|").replace(/`/g, "\\`").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderStyleQueue(feedback) {
  const flagged = Object.values(feedback.items).filter(entry => entry.status === "redo").sort((a, b) => a.iconId.localeCompare(b.iconId));
  const lines = [START, "## Style review — icons flagged for redo", "",
    "Saved in the icon browser. Generate replacements from the exact selected source;",
    "keep the final target name and require fresh GM approval before installation.", ""];
  if (flagged.length) {
    lines.push("| Icon / selected source | Reasons | Requested change |", "|---|---|---|");
    for (const entry of flagged) {
      const reasons = entry.reasons.map(id => REASONS.find(reason => reason.id === id).label).join(", ");
      lines.push(`| ${markdown(entry.source)} | ${markdown(reasons)} | ${markdown(entry.notes)} |`);
    }
  } else lines.push("No icons currently flagged for redo.");
  lines.push("", "Exact source hashes and saved decisions: `review/style-feedback.json` (local).", END);
  return lines.join("\n");
}

export function mergeStyleQueue(text, section) {
  const start = text.indexOf(START), end = text.indexOf(END);
  if ((start >= 0) !== (end >= 0) || (start >= 0 && end < start)) throw new Error("Style queue markers need repair; existing queue retained");
  if (start >= 0) return text.slice(0, start) + section + text.slice(end + END.length);
  const anchor = "## How an item gets added here";
  const index = text.indexOf(anchor);
  if (index >= 0) return text.slice(0, index) + section + "\n\n" + text.slice(index);
  return text.trimEnd() + "\n\n" + section + "\n";
}

export function saveStyleFeedback(moduleRoot, reviewRoot, input) {
  const catalog = buildCatalog(moduleRoot, reviewRoot);
  const icon = catalog.icons.find(item => item.id === input.iconId);
  if (!icon) throw new Error("Unknown icon");
  if (!["keep", "redo", "unreviewed"].includes(input.status)) throw new Error("Invalid style decision");
  const variant = icon.variants.find(item => item.source === input.source);
  if (!variant) throw new Error("Unknown icon variant");
  if (input.sourceSha256 !== variant.sha256) {
    const error = new Error("Icon changed while you were reviewing. Reload the library.");
    error.status = 409;
    throw error;
  }
  if (!Array.isArray(input.reasons) || input.reasons.some(id => !REASONS.some(reason => reason.id === id))) throw new Error("Invalid style reason");
  const reasons = input.status === "redo" ? [...new Set(input.reasons)] : [];
  const notes = input.status === "unreviewed" ? "" : String(input.notes ?? "").trim().slice(0, 10000);
  if (input.status === "redo" && !reasons.length && !notes) throw new Error("Choose a reason or add a note.");
  const entry = { iconId: icon.id, status: input.status, source: variant.source,
                  sourceSha256: variant.sha256, reasons, notes, updatedAt: new Date().toISOString() };
  const feedback = readStyleFeedback(reviewRoot);
  if (entry.status === "unreviewed") delete feedback.items[icon.id];
  else feedback.items[icon.id] = entry;
  const missing = path.join(moduleRoot, "dev/icons/MISSING.md");
  const queue = fs.readFileSync(missing, "utf8");
  const updated = mergeStyleQueue(queue, renderStyleQueue(feedback));
  atomicWrite(missing, updated);
  atomicWrite(path.join(reviewRoot, "style-feedback.json"), JSON.stringify(feedback, null, 2) + "\n");
  return { ...entry, stale: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reviewRoot = path.dirname(fileURLToPath(import.meta.url));
  const catalog = buildCatalog(path.resolve(reviewRoot, "../../.."), reviewRoot);
  console.log(JSON.stringify({ icons: catalog.icons.length,
    files: catalog.icons.reduce((count, icon) => count + icon.variants.length, 0),
    categories: catalog.categories.length }, null, 2));
}
