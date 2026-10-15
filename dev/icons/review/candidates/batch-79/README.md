# Batch 79 — nine fresh subjects

Second of the two nine-cell atlases. All nine candidates require GM review;
native placeholders remain until the selected pixels are approved.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Oswajanie zwierząt | Hand pets a seated dog with one blunt horn |
| 2 | Pancerna fura | Compact armored SUV |
| 3 | Paranoja | Three vigilant natural eye symbols |
| 4 | Partner | Normal dog beside an adult boot |
| 5 | Pirotechnika | Generic explosive bundle and tool |
| 6 | Pistolero | Two crossed semiautomatic pistols |
| 7 | Podstępny atak | Hand conceals a dagger beside a cloak fold |
| 8 | Pogoń | Generic adult running in a long stride |
| 9 | Pogromca | Single-shot shotgun and syringe-like chemical shell |

`batch.json` records canonical mechanics, generic motifs and exact native
delivery targets/hashes. Reference cells are all style-only; hashes are in
`style-reference.json`. The petting hand and horn distinguish taming from the
ordinary loyal companion dog. Objects and generic adults avoid repeated gruff
portraits, detailed faces, anime and dithering.

OpenAI's built-in image tool generates one atlas, preserved as
`raw/batch-79-atlas-a.png`. `prompts.json` archives the exact prompt and any
targeted correction. PNG sources, previews and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
Delivery after approval uses the same native SVG names plus WEBP sidecars,
with no runtime wiring. All nine exact targets remain unchanged during review.

```sh
python dev/icons/placeholder-pass/process.py --batch=79 --check
node dev/icons/placeholder-pass/register.mjs --batch=79
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
No code, compendia or campaign-world documents change in this batch.
Do not rerun the historical preparation script.

Validation: all nine exact masks pass; no overhang, ownership override or
targeted correction was needed. Contact sheets were inspected at 64/32/24/16
px. The complete collection contains 638 valid PNG/SVG pairs. The combined
gallery has 18 pending cards, 41 options and no broken images, with all new
candidates selected. Evidence: `../batch-78/raw/review-preview.png` and
`../../../placeholder-pass/progress-78-79.json`.
