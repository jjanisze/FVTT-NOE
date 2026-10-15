# Batch 85 — nine fresh subjects

Second of the two nine-cell atlases. All nine candidates require GM review;
native placeholders remain until a selected candidate is approved.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Szaleńcza szarża | Low charging adult, missed bullet streaks |
| 2 | Szary | Scavenger and crossed-out eye |
| 3 | Szczęście | Horseshoe and four-leaf clover |
| 4 | Szybka gadka | Speech bubble with fast motion strokes |
| 5 | Szybka produkcja | Wrench and stopwatch |
| 6 | Szybkie badanie | Magnifier examines robot sensor head |
| 7 | Szybkie nogi | Two boots in a fast evasive step |
| 8 | Szybkie ręce | Two hands operate separate toggles on one device |
| 9 | Szybkość kota | Grounded cat crouch, bullet passes above |

`batch.json` records canonical mechanics, generic motifs and exact native
delivery targets/hashes. Every reference cell is style-only; source hashes
are in `style-reference.json`. The grounded cat pose differs from the earlier
airborne leap. Speed concepts use actual actions and broad motion strokes,
without repeated gruff portraits, dice, anime or fine texture.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-85-atlas-a.png`. `prompts.json` archives the exact prompt and any
targeted corrections. PNG sources, contact sheets and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
After approval, delivery retains native SVG names and adds WEBP sidecars,
without runtime wiring. All nine production targets stay unchanged in review.

```sh
python dev/icons/placeholder-pass/process.py --batch=85 --check
node dev/icons/placeholder-pass/register.mjs --batch=85
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
No code, compendia or campaign-world documents change. Do not rerun the
historical preparation script.

Validation: nine exact masks pass; no overhang, ownership override or targeted
generation correction was needed. Contact sheets were inspected at
64/32/24/16 px. All 692 candidate pairs validate. The combined gallery has
18 pending cards, 45 options and no broken images, with all new candidates
selected. Evidence: `../batch-84/raw/review-preview.png` and
`../../../placeholder-pass/progress-84-85.json`.

Saved GM review: four approvals installed. Szaleńcza szarża, Szybkie badanie,
Szybkie nogi, Szybkie ręce and Szybkość kota carry exact notes into Batch 86.
`reviewed.json` preserves all decisions; `reviewed-installed.json` records
selected sources and delivered hashes.
