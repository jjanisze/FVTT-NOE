/** Freeze the GM-requested cleanup and the otherwise-approved full finish set. */
import fs from "node:fs";
import path from "node:path";
import { CHEMIA } from "../../../scripts/config/chemia-data.mjs";
import { abs, sha256File } from "../../finish/lib/profile.mjs";

const here = abs("dev/icons/review/candidates/batch-127");
if (fs.existsSync(here)) throw new Error("Batch 127 already exists; inspect its receipt rather than overwrite it");
const requested = Object.entries(CHEMIA).filter(([key, item]) => key === "cygaro" || item.subtype === "narkotyk");
if (requested.length !== 5) throw new Error("Unexpected scope for all narcotic items plus cigar");
const prefix = "modules/neuroshima-2026-overrides/";
const subjects = requested.map(([id, item], index) => {
  if (!item.img.startsWith(prefix)) throw new Error("Cleanup source must belong to this module");
  const target = item.img.slice(prefix.length), key = path.basename(target, ".svg");
  const variants = ["svg", "webp", "png"].map(ext => target.replace(/\.svg$/, `.${ext}`)).filter(file => fs.existsSync(abs(file)));
  return { id, key, name: item.label, target, cell: index + 1,
    deliveryTargets: variants.map(source => ({ source, sourceSha256: sha256File(abs(source)) })),
    master: variants.find(file => file.endsWith(".webp")) ?? variants.find(file => file.endsWith(".png")) ?? target };
});
fs.mkdirSync(path.join(here, "raw"), { recursive: true });
const prior = abs("dev/icons/m9-pass/finish-review-before-corrections.json");
if (fs.existsSync(prior)) throw new Error("An earlier pre-correction approval snapshot already exists");
fs.copyFileSync(abs("dev/icons/m9-pass/finish-review.json"), prior);
const atlas = `Use case: precise-object-edit. Asset: a five-icon cleanup atlas for a fictional post-apocalyptic tabletop game. The attached 3 by 3 image is the EDIT TARGET, not just an inspiration. Keep the same five existing white object silhouettes, their recognizable shapes and their cell positions. Remove only the thin stray rectangular atlas-frame edges around them and isolated border specks. Clean flat solid-white mask shapes on solid black; no new objects, no labels, no colour, shading, grain or texture. Preserve the existing broad internal black cutouts. Do not turn these into photographs or scenes of use. No real-world instructions or instructions for preparing or using substances are requested; this is cleanup of existing fictional game inventory artwork.
Exact row-major occupied cells:
${subjects.map(s => `Cell ${s.cell}: ${s.name} (${s.key}); preserve its pictured object.`).join("\n")}
All last four cells (6,7,8,9) must remain completely empty black. Return one square 3 by 3 image with equal cells and no visible grid or frames. Keep each complete glyph within its cell, with clean black separation. Match the input's visual weight; change only the frame contamination.`;
fs.writeFileSync(path.join(here, "batch.json"), JSON.stringify({ batch: 127, purpose: "GM-requested source cleanup", date: "2026-11-17", subjects,
  partialAtlas: true, emptyCells: [6, 7, 8, 9], fallback: { cropEachBorderPixels: 2, outputPixels: 256 },
  authorization: "GM requested Neodrugs, all narcotic icons and cigar to be fixed; if image generation fails, trim two pixels from each border and resize the existing image. Otherwise the full finish set is approved.",
  approvedSnapshot: "dev/icons/m9-pass/finish-review-before-corrections.json", approvedSnapshotSha256: sha256File(prior) }, null, 2) + "\n");
fs.writeFileSync(path.join(here, "prompts.json"), JSON.stringify({ tool: "OpenAI built-in image_gen", model: null, reference: "raw/cleanup-target.png", atlas,
  role: "edit target: existing five icon masks; remove thin frame contamination only" }, null, 2) + "\n");
console.log(JSON.stringify({ batch: 127, subjects: subjects.map(s => s.key), preservedSnapshot: true }));
