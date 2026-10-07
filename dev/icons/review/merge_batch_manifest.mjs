import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [batchPath] = process.argv.slice(2);
if (!batchPath) throw new Error("Usage: node merge_batch_manifest.mjs <batch-manifest.json>");

const reviewRoot = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(reviewRoot, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));

for (const incoming of batch.items) {
  const existing = manifest.items.find(item => item.id === incoming.id);
  if (!existing) {
    manifest.items.push(incoming);
    continue;
  }
  const candidates = [...(existing.candidates ?? [])];
  for (const candidate of incoming.candidates ?? []) {
    const index = candidates.findIndex(current => current.id === candidate.id);
    if (index >= 0) candidates[index] = candidate;
    else candidates.push(candidate);
  }
  Object.assign(existing, incoming, { candidates });
}

if (batch.title) manifest.title = batch.title;
if (batch.updated) manifest.updated = batch.updated;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
