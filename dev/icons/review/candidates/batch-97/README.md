# Batch 97 — eight saved revisions, no filler subject

Review outcome: seven selections were installed as exact approved SVG/WEBP
masks; `reviewed-installed.json` records their hashes. Ganger needs only its
lower-right wheel arc and spoke repaired. That exact note is archived in
`reviewed.json` and carried into Batch 99. Overall progress is 151/153 subjects
and 153/155 native SVG targets delivered.

| Cell | Subject | Saved correction |
|---|---|---|
| 1 | Zawołajcie kolegów | Raise index beside thumb, folding the wrong little finger |
| 2 | Chemik | Simplify pipette and align it on one straight axis |
| 3 | Ganger | Six spokes from one centered hub |
| 4 | Medyk | Box depth with coherent front, top and side planes |
| 5 | Najemnik | Smooth complete knife and dog-tag contours |
| 6 | Szczur | Human infiltrator in a beggar disguise, holding a tin cup |
| 7 | Wojownik Autostrady | Coherent shotgun breech, grip, guard and parallel barrels |
| 8 | Zabójca Maszyn | Symmetrical intact robot head, lightning moved beside it |
| 9 | Empty | Entire final cell stays black |

The Szczur concept follows the canonical `SZARY` ability in
`dev/classes/professions.json`: an infiltrator hides in plain sight by
appearing to be an ignored beggar or scavenger. The old literal rat and vial
are replaced with a generic hooded adult in a compact natural crouch. No
campaign persona, recognizable person, caricature or anime is used.

All eight reference cells are exact selected edit targets; cell 6 supplies
the failed concept to replace entirely. `batch.json` preserves verbatim
feedback and exact native targets. The batch explicitly declares a partial
atlas with one empty cell; no ninth candidate is added.

OpenAI's built-in image tool generates `raw/batch-97-atlas-a.png`.
Every exact prompt is in `prompts.json`, with source hashes in
`style-reference.json`. Normalization crops and converts only. PNG sources
and contact sheets stay dev-only. Final PNG/WEBP/SVG masks are 256×256 pure
white with alpha and 20 px safe margins; external and embedded lossless WEBP
match the PNG pixels exactly.

```sh
python dev/icons/placeholder-pass/process.py --batch=97 --check
node dev/icons/placeholder-pass/register.mjs --batch=97
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Only these eight cards reset to pending; every older choice and unrelated
decision is retained. Native files still require a saved approval.

Validation: eight exact masks pass and the ninth cell is empty. Contact
sheets were inspected at 64/32/24/16 px. All 794 candidate pairs validate.
The gallery has nine pending subjects and no broken images or browser errors.
The partial-atlas and registration safeguards pass five Python and four Node
tests, including rejection of a stray ninth glyph and newer GM feedback.
Evidence: `../batch-96/raw/review-preview.png` and
`../../../placeholder-pass/progress-96-97.json`.
