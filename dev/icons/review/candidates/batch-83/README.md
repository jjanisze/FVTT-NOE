# Batch 83 — nine fresh subjects

Second of the two nine-cell atlases. All nine candidates require GM review;
native placeholders remain until a selected candidate is approved.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Slang | Casual street conversation, cigarette and speech strokes |
| 2 | Smakuje jak arszenik | Shield with chemical drop and skull symbol |
| 3 | Sokole oko | Natural falcon eye and crosshair |
| 4 | Solówa | One adult beckons a single opponent |
| 5 | Specjalizacja — Spec | Caliper and screwdriver |
| 6 | Specjalizacja — Złodziej | Three-tool lockpick roll |
| 7 | Spieprzysz to! | Finger flicks a die to force a reroll |
| 8 | Sportowiec | Generic adult vaults a low wall |
| 9 | Stalowy nadgarstek | One steady hand holds a compact submachine gun |

`batch.json` records canonical mechanics, generic motifs and exact native
delivery targets/hashes. Every reference cell is style-only; original hashes
are in `style-reference.json`. The two specialization subjects use distinct
practical tool emblems. Adults and hands have natural proportions, without
repeated gruff portraits, anime, fine texture or dithering.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-83-atlas-a.png`. `prompts.json` archives the exact prompt and any
targeted corrections. PNG sources, contact sheets and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
Delivery after approval retains native SVG names and adds WEBP sidecars,
without runtime wiring. All nine production targets stay unchanged in review.

```sh
python dev/icons/placeholder-pass/process.py --batch=83 --check
node dev/icons/placeholder-pass/register.mjs --batch=83
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
No code, compendia or campaign-world documents change. Do not rerun the
historical preparation script.

Validation: nine exact masks pass; no overhang, ownership override or targeted
generation correction was needed. Contact sheets were inspected at
64/32/24/16 px. All 674 candidate pairs validate. The combined gallery has
18 pending cards, 45 options and no broken images, with all new candidates
selected. Evidence: `../batch-82/raw/review-preview.png` and
`../../../placeholder-pass/progress-82-83.json`.
