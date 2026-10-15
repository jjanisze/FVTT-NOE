# Batch 75 — nine fresh subjects

Second of the next two nine-cell atlases. These are review candidates; native
placeholders remain until the GM approves a selected mask.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Let’s rock! | Electric guitar and broad sound arcs |
| 2 | Łapiduch | Correctly stacked hands performing CPR |
| 3 | Łaska boża | Blessing hands over three generic allies |
| 4 | Łeb jak sklep | Brain, wrench and simple tetrahedral die |
| 5 | Łyżeczka | Bare hand wielding a spoon |
| 6 | Maszyna do zabijania | Fist breaking a heavy chain |
| 7 | Matrix | Generic adult evades three projectiles |
| 8 | Mechanika | Engine block and practical wrench |
| 9 | Moja prawa ręka | Leader and loyal companion with backpack |

`batch.json` records canonical mechanics, generic motifs and all exact native
SVG delivery targets/hashes. OpenAI's built-in image tool generates one atlas
saved as `raw/batch-75-atlas-a.png`; the complete prompt set is in `prompts.json`.
Every reference cell is style-only. Their source hashes are archived in
`style-reference.json`. No recognizable characters or campaign art are used.

A targeted built-in edit removes one unintended isolated white wedge from
Łeb jak sklep while retaining its brain, wrench and tetrahedral die. The exact
edit prompt, opaque reference and raw output path are in `prompts.json`; its
source is saved as `raw/standalone-leb-jak-sklep.png`.

Final `<key>.png`, `.webp`, `.svg` files are 256×256 pure white masks with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
PNG sources and opaque previews are dev-only. Approved delivery uses the same
native SVG filenames and WEBP sidecars, without runtime wiring.

```sh
python dev/icons/placeholder-pass/process.py --batch=75 --check
node dev/icons/placeholder-pass/register.mjs --batch=75
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Do not rerun historical preparation. No code, packs or world documents change.

Final validation: all nine exact masks pass and the complete review collection
contains 602 valid PNG/SVG pairs. Contact sheets were inspected at 64/32/24/16 px.
The eighteen-card combined gallery has all new candidates selected and no broken
images. Evidence: `../../../placeholder-pass/progress-74-75.json` and
`../batch-74/raw/review-preview.png`.

GM review, 2026-10-15: four exact selections approved and installed. Four
revision requests and the rejected Łeb jak sklep concept carry into Batch 76.
All decisions, verbatim notes and delivered hashes are in `reviewed.json` /
`reviewed-installed.json`.
