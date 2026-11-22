/** Freeze M9 cleanup subjects before generating candidates; never write shipped icons. */
import fs from "node:fs";
import path from "node:path";
import { abs, sha256File } from "../../finish/lib/profile.mjs";

export const SUBJECTS = [
  ["helm", "Hełm", "icons/armor/helm.svg", "ONE complete modern military helmet in side view, with one simple chin strap and one broad ear-protection cut. No floating fragments above it."],
  ["ochraniacze-nog", "Ochraniacze nóg (para)", "icons/armor/ochraniacze-nog.svg", "A PAIR of complete leg guards, each with a broad knee cup and a long shin plate. Two broad functional sections per guard, clearly legs rather than arms. No feet, straps floating above, rivets or fine seams."],
  ["ochraniacze-rak", "Ochraniacze rąk (para)", "icons/armor/ochraniacze-rak.svg", "A PAIR of complete compact forearm-and-elbow guards. Broad elbow cap and tapered short forearm shell, without hands. Clearly shorter and wider than the leg guards. No floating pieces."],
  ["pancerz-stalowej-policji", "Pancerz wspomagany Stalowej Policji", "icons/armor/pancerz-stalowej-policji.svg", "ONE complete sealed human-proportioned powered police armour suit, standing front-three-quarter view. Helmet with one broad black visor, angular chest shell, two strong shoulder plates, separate hands and feet. Restrained visible powered joints. Slimmer and more human-proportioned than the hydraulic suit in cell 6. No weapons, insignia or ornament."],
  ["pelna-zbroja-smieciowa", "Pełna zbroja śmieciowa", "icons/armor/pelna-zbroja-smieciowa.svg", "ONE complete standing suit of improvised SCRAP armour: mismatched broad salvaged sheet-metal plates over torso, arms and legs, a simple rough protective head shell. Uneven silhouette and only a few bold black separation cuts. Clearly improvised plates, NOT a powered robot or medieval knight. No spikes, bolts, tiny lines or weapons."],
  ["wojskowy-pancerz-hydrauliczny", "Wojskowy pancerz hydrauliczny", "icons/armor/wojskowy-pancerz-hydrauliczny.svg", "ONE complete very heavy MILITARY HYDRAULIC armour suit, a stocky industrial colossus with a small closed helmet, huge broad shoulders, thick arm shells and wide feet. One stout simple hydraulic piston visible beside each lower leg. Clearly bulkier than cell 4. Four or five broad black joint gaps, no fine machinery, weapons, gears or spikes."],
  ["alkohol_markowy", "Alkohol markowy", "icons/items/drugs/alkohol_markowy.svg", "TWO premium liquor bottles: a broad square decanter with a short stopper and a tall round-shouldered glass bottle with a small cap. Each has at most ONE broad plain black label cutout. Elegant but sober physical objects. No diamonds, words, ornamental facets, border or frame."],
  ["alkohol_tani", "Alkohol tani", "icons/items/drugs/alkohol_tani.svg", "ONE cheap squat reused plastic liquor bottle with a simple screw cap, broad shoulders and only TWO broad horizontal rib cuts. A little uneven and utilitarian; no fancy stopper, text or fine texture."],
  ["anestix", "Anestix", "icons/items/drugs/anestix.svg", "ONE compact rugged medical AUTOINJECTOR beside ONE small capped ampoule, both complete and clearly separated. Thick functional silhouettes and two broad black window cuts. No tick marks, measuring scale, tiny needle, words or medical cross."],
  ["cygaro", "Cygaro", "icons/items/drugs/cygaro.svg", "ONE complete stout cigar, gently diagonal, with one broad plain band represented by a black gap and one blunt end. No smoke, burning particles, leaf veins, wrapper texture or small lines."],
  ["narkotyki_latwe", "Narkotyki łatwe w produkcji", "icons/items/drugs/narkotyki_latwe.svg", "ONE loosely rolled local herbal drug bundle: a short stout rough cigarette with a clearly twisted end and one simple broad wrapper fold. Actual physical object; do NOT add a leaf emblem, fine crinkling, veins, sparks or smoke."],
  ["narkotyki_przedwojenne", "Narkotyki przedwojenne", "icons/items/drugs/narkotyki_przedwojenne.svg", "ONE complete sealed square pharmaceutical sachet, slightly tilted, with one broad black inset window and a stout simple top seal. Plain anonymous pre-war packaging; no lettering, zipper teeth, fine parallel seal lines, powder or floating dots."],
  ["neodrugs", "Neodrugs", "icons/items/drugs/neodrugs.svg", "ONE complete compact synthetic-drug inhaler dispenser with a tall rectangular cartridge and a short projecting mouthpiece at the bottom. ONE large black cartridge window. Strong simple L-shaped physical object; no text, graduations, texture or medicine cross."],
  ["tornado", "Tornado", "icons/items/drugs/tornado.svg", "A small cluster of exactly THREE chunky irregular synthetic-drug crystal pieces, each with ONE broad black facet cut. A compact sober pile of rough material; not cut gemstones, jewellery, diamonds or tiny fragments."],
  ["beretta_b92", "Beretta B92", "icons/weapons/beretta_b92.svg", "ONE complete Beretta-92-style service PISTOL in clean side profile, muzzle pointing LEFT: long low open-top slide, rounded trigger guard with a broad empty opening, angled grip and short exposed hammer. At most THREE broad black structural cuts. No bullets, floating specks, weapon diagram, exploded parts, lettering or engraving."],
  ["k_22_revolver", "Rewolwer .22", "icons/weapons/k_22_revolver.svg", "ONE complete small .22-calibre REVOLVER in clean side profile, muzzle pointing LEFT: slim moderate barrel, unmistakable round cylinder, short hammer, a broad empty trigger-guard opening and gently curved grip. At most THREE broad black cuts. No bullets, specks, engraving, fine cylinder grooves, lettering or exploded parts."]
];

export function promptFor(subjects) {
  return `Use case: stylized-concept. Asset type: monochrome inventory glyph atlas for a serious post-apocalyptic tabletop game.
Create ONE square 3-by-3 atlas. Nine equal cells in EXACT row-major order, without visible grid, borders or labels. Each active cell contains its ONE requested composition, fully inside that cell, with generous black padding on all sides. Pure solid WHITE silhouettes on perfectly clean BLACK. Flat stencil-like shapes with broad black negative-space cuts; never outline drawings. No gray, colour, gradient, shading, fine engraving, texture, noise, grain, dither or drop shadows. Avoid hairline internal detail: details must remain legible at 16 pixels. Match the restraint, solid coverage and large cutouts of reference image 1. Reference image 1 supplies STYLE ONLY, never its instrument subjects. Reference image 2 supplies the legacy SUBJECTS ONLY: deliberately REMOVE its grid edges, stray pieces, fussy detail and clipping, and use the explicit subject descriptions below instead of tracing its defects. Do not add backgrounds, frames, UI, words, numbers or logos.
${subjects.map((s, i) => `CELL ${i + 1} (row ${Math.floor(i / 3) + 1}, column ${i % 3 + 1}): ${s.request}`).join("\n")}
${subjects.length < 9 ? `CELLS ${Array.from({ length: 9 - subjects.length }, (_, i) => i + subjects.length + 1).join(", ")} MUST BE COMPLETELY EMPTY BLACK. No filler icons.` : ""}
Keep the scale and visual weight consistent across cells. Make physical objects immediately recognizable with a handful of bold shapes. No cheerful cartoon styling, decorative fantasy equipment or fine technical illustration.`;
}

const prepare = process.argv.includes("--prepare");
if (prepare) {
  const audit = JSON.parse(fs.readFileSync(abs("dev/icons/m9-gap-audit.json"), "utf8"));
  const edge = new Set(audit.health.edgeTouching.map(e => e.wrapper));
  if (SUBJECTS.some(s => !edge.has(s[2]))) throw new Error("Cleanup target not in the inspected edge-contact audit");
  for (const batch of [124, 125]) if (fs.existsSync(abs(`dev/icons/review/candidates/batch-${batch}`))) throw new Error(`Batch ${batch} already exists`);
  for (const [index, batch] of [124, 125].entries()) {
    const here = abs(`dev/icons/review/candidates/batch-${batch}`);
    fs.mkdirSync(path.join(here, "raw"), { recursive: true });
    const subjects = SUBJECTS.slice(index * 9, index * 9 + 9).map(([key, name, target, request], cell) => {
      const base = target.replace(/\.[^.]+$/, "");
      const deliveryTargets = ["svg", "webp", "png"].map(ext => `${base}.${ext}`).filter(p => fs.existsSync(abs(p)))
        .map(source => ({ source, sourceSha256: sha256File(abs(source)), variant: path.extname(source).slice(1) }));
      return { key, name, target, request, cell: cell + 1, itemId: `m9-cleanup-${key}`, deliveryTargets,
        context: "M9 agent visual audit: legacy atlas fragments / grid-edge contamination or crowded internal detail; inspect physical subject at 64/32/16 px. A replacement candidate, not a saved GM redo decision." };
    });
    const frozen = { batch, date: "2026-11-17", purpose: "M9 legacy glyph cleanup", subjects,
      ...(subjects.length < 9 ? { partialAtlas: true, emptyCells: Array.from({ length: 9 - subjects.length }, (_, i) => i + subjects.length + 1) } : {}) };
    fs.writeFileSync(path.join(here, "batch.json"), JSON.stringify(frozen, null, 2) + "\n");
    fs.copyFileSync(abs("dev/icons/review/audits/m9-style-reference.png"), path.join(here, "raw/style-reference.png"));
    fs.copyFileSync(abs("dev/icons/review/audits/m9-edge-contact.png"), path.join(here, "raw/legacy-subject-reference.png"));
    const prompts = { tool: "OpenAI built-in image_gen", model: null, date: "2026-11-17", reference: "raw/style-reference.png",
      subjectReference: "raw/legacy-subject-reference.png", atlas: promptFor(subjects), targetedCorrections: [],
      referenceRoles: ["Style only: approved white silhouette glyphs, no subject transfer", "Legacy subject context only; defects must be removed"] };
    fs.writeFileSync(path.join(here, "prompts.json"), JSON.stringify(prompts, null, 2) + "\n");
    console.log(JSON.stringify({ batch, subjects: subjects.length, directory: `dev/icons/review/candidates/batch-${batch}` }));
  }
}

if (process.argv.includes("--prepare-safe-subset")) {
  const here = abs("dev/icons/review/candidates/batch-126");
  if (fs.existsSync(here)) throw new Error("Batch 126 already exists");
  const original = JSON.parse(fs.readFileSync(abs("dev/icons/review/candidates/batch-125/batch.json"), "utf8"));
  const subjects = original.subjects.filter(s => ["cygaro", "beretta_b92", "k_22_revolver"].includes(s.key)).map((s, i) => ({ ...s, cell: i + 1 }));
  if (subjects.length !== 3) throw new Error("Unexpected safe-subset subject count");
  fs.mkdirSync(path.join(here, "raw"), { recursive: true });
  fs.copyFileSync(abs("dev/icons/review/audits/m9-style-reference.png"), path.join(here, "raw/style-reference.png"));
  const atlas = promptFor(subjects).replace(/Reference image 2 supplies[\s\S]*?tracing its defects\. /, "");
  fs.writeFileSync(path.join(here, "batch.json"), JSON.stringify({ batch: 126, date: "2026-11-17", subjects, partialAtlas: true, emptyCells: [4, 5, 6, 7, 8, 9],
    purpose: "Allowed narrower scope: cigar and two weapon silhouettes only; excludes all four drug subjects from blocked Batch 125" }, null, 2) + "\n");
  fs.writeFileSync(path.join(here, "prompts.json"), JSON.stringify({ tool: "OpenAI built-in image_gen", model: null, date: "2026-11-17", reference: "raw/style-reference.png",
    atlas, targetedCorrections: [], referenceRoles: ["Approved glyph style only; no drug subjects or reference imagery"] }, null, 2) + "\n");
  console.log(JSON.stringify({ batch: 126, subjects: subjects.length }));
}

if (process.argv.includes("--register")) {
  const incoming = [];
  const batches = (process.argv.find(a => a.startsWith("--batches="))?.slice(10) ?? "124").split(",").map(Number);
  if (batches.some(b => ![124, 125, 126].includes(b))) throw new Error("Unexpected M9 batch");
  for (const batch of batches) {
    const base = `dev/icons/review/candidates/batch-${batch}`;
    const frozen = JSON.parse(fs.readFileSync(abs(`${base}/batch.json`), "utf8"));
    const validated = JSON.parse(fs.readFileSync(abs(`${base}/validated.json`), "utf8"));
    if (validated.validatedMasks !== frozen.subjects.length) throw new Error(`Batch ${batch}: validation count differs`);
    for (const subject of frozen.subjects) {
      for (const target of subject.deliveryTargets) if (sha256File(abs(target.source)) !== target.sourceSha256) throw new Error(`Current source changed: ${target.source}`);
      if (sha256File(abs(`${base}/${subject.key}.png`)) !== validated.candidateHashes[subject.key]) throw new Error(`Candidate changed: ${subject.key}`);
      incoming.push({ id: subject.itemId, name: subject.name, tier: `M9 · cleanup · Batch ${batch}`, batch, target: subject.target,
        deliveryTargets: subject.deliveryTargets, context: subject.context, request: subject.request, status: "pending",
        current: { src: `/${subject.target}`, note: "Existing master; inspected legacy artefacts. Candidate generation does not replace it." },
        candidates: [{ id: `batch${batch}-${subject.key}`, label: `M9 · Batch ${batch} · A`,
          src: `candidates/batch-${batch}/${subject.key}.png`, note: "New clean silhouette; inspect shape and spacing at 64/32/16 px." }] });
    }
  }
  const manifestPath = abs("dev/icons/review/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const item of incoming) {
    if (manifest.items.some(e => e.id === item.id)) throw new Error(`Refusing to overwrite an existing review: ${item.id}`);
  }
  fs.copyFileSync(manifestPath, abs("dev/icons/m9-pass/review-manifest-before.json.bak"));
  manifest.items.push(...incoming);
  manifest.title = `M9 · ${incoming.length} legacy glyph cleanups for review`;
  manifest.updated = "2026-11-17";
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ added: incoming.length, preserved: manifest.items.length - incoming.length, shipped: 0, decisionsChanged: 0 }));
}
