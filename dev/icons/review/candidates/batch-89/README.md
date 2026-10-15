# Batch 89 — nine fresh subjects

Second of the two nine-cell atlases. All nine candidates require GM review;
native placeholders remain until a selected candidate is approved.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Wyjadacz — Twardziel | Veteran patch: armor vest and three chevrons |
| 2 | Wykształciuch | Graduation cap and practical toolbox |
| 3 | Z bara! | Shoulder shove between two plain adult torsos |
| 4 | Za garść gambli | Saxophone, busker hat and two coins |
| 5 | Zabójczy cios | Fist cracks a symbolic skull |
| 6 | Zawołajcie kolegów | Beckoning hand challenges two fists |
| 7 | Zawsze w siodle | Western saddle and rolled blanket |
| 8 | Zew areny | Hanging arena bell between raised fists |
| 9 | Znajomości | Three neutral silhouettes connected as a network |

`batch.json` records canonical mechanics, generic motifs and exact native
delivery targets/hashes. Every reference cell is style-only; source hashes
are in `style-reference.json`. The veteran patch shares its thick frame and
three-chevron layout with the scout counterpart, changing the upper emblem.
Varied objects and neutral silhouettes avoid repeated gruff portraits,
handshakes, books, anime and fine texture. The skull strike is symbolic and
non-graphic, without realistic injury or gore.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-89-atlas-a.png`. `prompts.json` archives the exact prompt and any
targeted corrections. PNG sources, contact sheets and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
After approval, delivery retains native SVG names and adds WEBP sidecars,
without runtime wiring. All nine production targets remain unchanged in review.

```sh
python dev/icons/placeholder-pass/process.py --batch=89 --check
node dev/icons/placeholder-pass/register.mjs --batch=89
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
No code, compendia or campaign-world documents change. Do not rerun historical
preparation.

Validation: nine exact masks pass. Whole-component assignment retains the
shoulder-shove glyph's 42 overhanging source pixels and the arena bell's 164
pixels without clipping or drawing. No ownership override or targeted
generation correction was needed. Contact sheets were inspected at
64/32/24/16 px. All 728 candidate pairs validate. The combined gallery has
18 pending cards, 45 options and no broken images, with new candidates selected.
Evidence: `../batch-88/raw/review-preview.png` and
`../../../placeholder-pass/progress-88-89.json`.
