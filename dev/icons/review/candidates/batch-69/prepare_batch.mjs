/** Reserve nine new subjects; retain every exact source hash and approval history. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../../..");
const REVIEW = path.resolve(HERE, "../..");
const destination = path.join(HERE, "batch.json");
if (fs.existsSync(destination)) throw new Error("Historical preparation exists; do not overwrite it");
const roadmap = JSON.parse(fs.readFileSync(path.join(ROOT, "dev/icons/placeholder-pass/roadmap.json"), "utf8"));
const batch = roadmap.batches.find(item => item.batch === 69);
const manifest = JSON.parse(fs.readFileSync(path.join(REVIEW, "manifest.json"), "utf8"));
if (manifest.items.some(item => item.status !== "resolved")) throw new Error("Finish the active review before allocating a fresh batch");
const motifs = {
  "a-co-mi-tam": "A calm rugged adult survivor from the chest up, shrugging off a dangerous drink: one complete hand holds a small plain bottle near the shoulder, with one broad radiation trefoil behind the opposite shoulder. Untroubled expression, solid short hair and one simple mouth cut. Innate resistance to poison, disease and radiation; no gas mask or protective suit, no lettering.",
  "amen": "Two complete realistic adult hands pressed together in prayer above ONE simple six-sided die with three large pips. Broad plain sleeves, clear black gaps between folded thumbs and palms. A compact prayer-and-second-chance motif; no written words, cross, halo, recognizable religious figure, extra hands or tiny fingernails.",
  "berserk": "One powerful rugged adult survivor from bare chest upward, roaring with two clenched fists raised near the shoulders. Thick neck and broad chest, solid cropped hair, a single stern brow cut and simple open mouth. Two short broad angular adrenaline strokes outside the shoulders. Coherent realistic fists and arms; no anime hair, fine facial hatching, fangs, extra limbs or gore.",
  "bez-tajemnic": "One large practical magnifying glass examining a simple mutant's head in profile: one broad ear, one short blunt horn and a solid neck silhouette. In the lens, one simple crosshair cut marks a vulnerable point on the head. The lens and head overlap clearly with broad black gaps, not multiple heads; no gore, tiny teeth, laboratory labels or decorative symbols.",
  "bezlitosny-przywodca": "One stern adult gang leader shown from the chest up, one complete arm extended to point decisively toward the right. Two smaller subordinate shoulder-and-head silhouettes sit behind the leader, one on either side. Clear separation between all three people, serious practical clothing, no fine face detail, badge, lettering, crown or extra hands.",
  "brutalny-cios": "One heavy clenched fist entering from the upper left strikes the shoulder of a simple full human silhouette, which tilts backward and loses its footing toward the lower right. A single broad angular impact wedge at the shoulder conveys a powerful knockdown. Both legs and the head remain complete; no blood, wound detail, crushed face, extra fist or extra person.",
  "bystrzacha": "One robust practical folding multitool, opened with its pliers at the top and one broad screwdriver blade and one short utility knife folded out to the sides. A coherent single tool with intact handles and one visible hinge; broad functional silhouettes and generous black gaps. Versatile hands-on competence, no giant cog, brain, decorative stars, scattered toy parts, lettering or tiny serrations.",
  "cichy-krok": "One complete sturdy boot in three-quarter side view, making a careful quiet toe-step across two low flat rocks, heel raised. Two short broad air trails behind the heel suggest light silent movement. Broad boot shape with only a few practical seam cutouts; no tiny laces, texture, footprint trail, extra boot, labels or cartoon sound effect.",
  "clint": "One realistic adult gloved hand holding a classic six-shot revolver in clear side profile, barrel aimed toward the upper right. Large coherent cylinder and simple trigger guard, intact grip, thumb and fingers. Two short broad recoil or quick-draw strokes behind the hand. A generic skilled gunslinger motif, no celebrity portrait, recognizable character, extra gun, extra barrel, lettering or fine engraving."
};
const references = [];
const subjects = batch.subjects.map((subject, index) => {
  for (const target of subject.deliveryTargets) {
    const hash = createHash("sha256").update(fs.readFileSync(path.join(ROOT, target.source))).digest("hex");
    if (hash !== target.sourceSha256) throw new Error(`Placeholder changed: ${target.source}`);
    references.push({ key: subject.key, ...target });
  }
  return { ...subject, cell: index + 1, itemId: `batch69-${subject.key}`, request: motifs[subject.key] };
});
fs.mkdirSync(path.join(HERE, "raw"), { recursive: true });
const feedbackBytes = fs.readFileSync(path.join(REVIEW, "feedback.json"));
for (const [name, value] of Object.entries({
  "batch.json": { date: "2026-10-15", batch: 69, subjects },
  "references.json": { role: "Existing placeholders are recorded as delivery targets, not supplied as style references.", files: references },
  "incoming.json": { date: "2026-10-15", priorReviewItems: manifest.items.length,
    priorResolvedItems: manifest.items.filter(item => item.status === "resolved").length,
    feedbackSha256: createHash("sha256").update(feedbackBytes).digest("hex"),
    placeholderFilesAtStart: roadmap.placeholderFiles, placeholderSubjectsAtStart: roadmap.subjects }
})) fs.writeFileSync(path.join(HERE, name), JSON.stringify(value, null, 2) + "\n");
console.log(JSON.stringify({ batch: 69, cells: subjects.map(item => ({ cell: item.cell, name: item.name })), targets: references.length }));
