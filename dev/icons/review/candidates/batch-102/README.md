# Batch 102 — 9 browser style revisions

Review outcome: **6 approved replacements installed; 3 revisions remain**.
Exact saved decisions and delivered SVG/WEBP hashes are in `reviewed.json`
and `reviewed-installed.json`. Remaining notes continue in Batches 106–107.

| Cell | Subject | Replacement motif |
|---|---|---|
| 1 | Logika Różnoboczna | One plain broad SHIELD at center flanked by TWO complete short combat KNIVES pointing inward from opposite sides. The two knives approach the defender from different directions, showing coordinated flanking. Thick black gaps keep all three objects distinct. No people, triangular wall, angles, diagram, runes or measurements. |
| 2 | Doktor Quinn | ONE complete bare adult HAND wraps ONE broad clean BANDAGE around ONE intact forearm. A short loose bandage roll remains visible beside the wrist. Natural anatomy, broad overlapping cloth strips with just TWO black dividing cuts. Medical care without a portrait, needles, blood, tiny fingers or fabric texture. |
| 3 | Fart | ONE ordinary FOUR-LEAF CLOVER with four broad clearly separate heart-shaped leaves attached to ONE short curved stem. Large black separations between the leaves. A grounded physical luck symbol. No dice, cards, game pieces, numerals, reroll arrows, mechanical counters, stars or extra objects. |
| 4 | Ja już swoje odchorowałem | ONE broad plain SHIELD with ONE simple medical PLUS cut out of its center; TWO large simple disease particles stop outside its outer edge. Each particle is one plain circle with four short broad prongs. Exactly shield and two particles, no person, face, scratches, fine rays or texture. |
| 5 | Kuchenny Terror | ONE complete heavy kitchen CLEAVER beside ONE plain tied COOK'S APRON. Broad rectangular blade with one clean edge, stout complete handle. Apron has a broad bib, simple waist ties and an uninterrupted hem. No cook, face, victim, writing, tiny pocket, stitching, blood or gore. |
| 6 | Młynek | ONE complete stout combat BATON with ONE broad clean curved SWEEP surrounding its tip and THREE small plain shield silhouettes spaced outside the sweep. Coherent compact sweeping attack motif. No arrows, numerals, faces, full crowd, impact debris or multiple thin trails. |
| 7 | Naprawianie | ONE sturdy simplified ROBOTIC ARM ending in a broad OPEN-END WRENCH that grips ONE large hexagonal NUT. Arm has only TWO thick linked segments and TWO large joints on one small base. Exactly actual repair equipment, no giant cog, tiny cables, panel screws, sparks or lettering. |
| 8 | Odporny | ONE natural HORSE HEAD and neck in simple side profile, muzzle lowered toward ONE small water bowl. One broad black mane separation and ONE small eye cut only. Two broad concentric water arcs in the bowl. No human, bridle fittings, hair strands, bubbles, mushrooms, textured fur or skull. |
| 9 | Patriota | ONE complete bare adult HAND presses flat over ONE large plain CLOTH PATCH attached to a simple shoulder-shaped panel. The patch is a broad blank rectangle with ONE large diagonal black stripe. Natural hand with grouped fingers and one separate thumb. No face, flag of any real nation, insignia, text, stitching or game token. |

OpenAI's built-in image tool generates `raw/batch-102-atlas-a.png`.
Reference 1 (`raw/style-reference.png`) supplies desired broad white glyph
style. Reference 2 (`raw/current-reference.png`) supplies existing subjects
and composition to simplify, without copying their fine detail or texture.
Exact prompt and roles: `prompts.json`. Verbatim saved flags and all source
variant hashes: `style-feedback-before.json` and `incoming.json`.

```sh
python dev/icons/placeholder-pass/process.py --batch=102
python dev/icons/placeholder-pass/process.py --batch=102 --check
```

The processor crops, resizes and converts only; it draws no semantic content.
Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Final dev PNG/WEBP/SVG masks are 256×256 with alpha and 20 px safe margins;
external lossless WEBP and embedded WEBP match the pure-white PNG pixels.
Existing production files remain until fresh GM approval. Current style
flags, earlier review cards and saved decisions are retained. No code wiring,
pack rebuild or world writes are part of this replacement.

Validation: 9 exact white PNG/WEBP/embedded-WEBP masks pass with safe
margins and were inspected at 64/32/24/16 px. All 828 candidate pairs validate.
The full style gallery has 29 pending cards and 58 options with no broken
images or browser errors. Existing production hashes, saved style flags and
all earlier reviews are preserved. Evidence: `../batch-102/raw/review-preview.png`
and `../../../style-pass/progress-102-105.json`.
