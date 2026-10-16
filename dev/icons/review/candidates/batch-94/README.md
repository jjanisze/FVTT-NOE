# Batch 94 — four revisions and five fresh professions

| Cell | Subject | Revision or motif |
|---|---|---|
| 1 | Zawołajcie kolegów | Restore hooked beckoning index, keeping palm forward |
| 2 | Zryw | Physical extra-action burst: fist, lightning and afterimage strokes |
| 3 | Chemik | Sharp pipette tip, with rounded blob removed |
| 4 | Ganger | Coherent centered wheel spokes behind the retained bat |
| 5 | Kaznodzieja Nowej Ery | Prayer book and lever-action rifle |
| 6 | Kowboj | Western hat and revolver |
| 7 | Kurier | Complete motorcycle carrying a sealed parcel |
| 8 | Łowca Mutantów | Mutant animal head and chemical syringe dart |
| 9 | Mafiozo | Suit lapels, tie and compact pistol |

Reference cells 1–4 are exact selected revision sources; cells 5–9 supply
style only. `batch.json` retains verbatim feedback, canonical profession
ability names and exact native target hashes. `style-reference.json` records
source hashes. All older choices and unrelated decisions remain available.

One atlas is generated with OpenAI's built-in image tool and saved as
`raw/batch-94-atlas-a.png`. Exact prompts and the focused Chemik correction
are archived in `prompts.json`. That generated edit removes the remaining
rounded tip and replaces it with a clean sharp taper, preserving the flask.

Final PNG/WEBP/SVG candidates are 256×256 pure white with alpha and 20 px
safe margins. Lossless external and embedded WEBP match PNG pixels exactly.
Sources and previews remain dev-only. Inspect `raw/preview.png` and
`raw/inventory-preview.png` at 64/32/24/16 px before registration.

```sh
python dev/icons/placeholder-pass/process.py --batch=94 --check
node dev/icons/placeholder-pass/register.mjs --batch=94
```

Four saved decisions are archived and reset only on their existing cards;
five fresh professions receive new cards. Native files require approval.

Validation: nine exact masks pass; the focused pipette edit supplies Chemik
and the other eight subjects retain atlas pixels. Contact sheets were
inspected at 64/32/24/16 px. All 784 candidate pairs validate; the gallery
shows all 22 remaining subjects with no broken images or browser errors.
All older choices and unrelated decisions are preserved. Evidence:
`../batch-93/raw/review-preview.png` and
`../../../placeholder-pass/progress-93-95.json`.
Whole-component splitting preserves 635 source pixels of the motorcycle's
overhang; its complete wheels and controls were inspected in the preview.
No explicit ownership override was needed.

Saved GM review: six approvals installed. Zawołajcie kolegów, Chemik and
Ganger carry exact finger, pipette and six-spoke requests into Batch 97.
`reviewed.json` and `reviewed-installed.json` preserve every selection.
