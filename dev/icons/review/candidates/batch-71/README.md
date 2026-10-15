# Batch 71 — nine fresh subjects

Second of the two nine-cell atlases requested after Batch 69 review. These
assets are review candidates; native placeholders stay until GM approval.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Dwóch na jednego | Generic defensive figure between two fists |
| 2 | Dziewięć żyć | Agile leaping cat |
| 3 | Ekspert | Caliper, hand and hexagonal hardware |
| 4 | Elektronik | Open electronic padlock and screwdriver |
| 5 | Emiter EMP | Heavy emitter weapon and broad pulse arcs |
| 6 | Empiryk | Human palm anticipating a robotic claw |
| 7 | Farmacja | Mortar, pestle, capsule and leaf |
| 8 | Głowa do góry! | Microphone and encouraging raised hand |
| 9 | Goła klata | Plain headless torso and near-miss strokes |

Objects, gestures and a plain generic human figure replace the repeated gruff
survivor portrait motif. No anime faces, hair or exaggerated anatomy. Canonical
mechanics, generic requests and exact native SVG delivery targets/hashes are
in `batch.json`. `incoming.json` records the incoming review census.

OpenAI's built-in image tool generated one atlas saved as
`raw/batch-71-atlas-a.png`; `prompts.json` archives its exact prompt. All nine
reference cells were style-only. Their sources/hashes are in
`style-reference.json`; no placeholder was supplied as a style input.

Each `<key>.png`, `.webp`, `.svg` is a 256×256 pure white mask with 20 px margins.
The lossless WEBP pixels and the SVG's embedded WEBP match the PNG exactly.
PNG sources and previews stay dev-only. Delivery after approval uses the
unchanged native SVG filename and a WEBP sidecar, without code wiring.

```sh
python dev/icons/placeholder-pass/process.py --batch=71 --check
node dev/icons/placeholder-pass/register.mjs --batch=71
npm run validate:icon-candidates
```

All nine masks and the contact sheets `raw/preview.png` and
`raw/inventory-preview.png` were inspected at 64/32/24/16 px. No standalone
correction was needed. No code, compendia or campaign-world state is modified.

The full collection passes with 566 PNG/SVG pairs. The review page shows all
18 pending subjects from Batches 70–71 with the new candidates selected and
no broken images. Combined progress and history checks are archived in
`../../../placeholder-pass/progress-70-71.json`; the review screenshot is
`../batch-70/raw/review-preview.png`.
