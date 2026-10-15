# Batch 70 — four revisions and five fresh subjects

First of the two nine-cell atlases requested after Batch 69 review. Its five
approvals are already delivered at six exact SVG/WEBP filenames. These nine
candidates require a new saved GM approval before any production replacement.

| Cell | Subject | Work |
|---|---|---|
| 1 | A co mi tam! | Androgynous generic adult instead of a gruff male portrait |
| 2 | Amen | Coherent cubic die geometry |
| 3 | Bez tajemnic | Head, neck and torso facing the same direction |
| 4 | Clint | Bare hand instead of glove |
| 5 | Cwaniacki zwód | Full-body sidestep past an opponent |
| 6 | Dobra rada | Generic speaker and listener |
| 7 | Doktor Brain | Brain and serum syringe |
| 8 | Drugi atak | Two consecutive punches |
| 9 | Drzwi w drzwi | Two cars making side contact |

The four revisions reuse their existing review card IDs. `batch.json` preserves
the exact old selected-source hashes and verbatim feedback under `revisionOf`.
Registration retains the old candidates and archives those decisions again in
`revision-feedback-before.json`, then selects `batch70-revision` with a pending
decision. Every unrelated saved decision is retained.

OpenAI's built-in image tool generated `raw/batch-70-atlas-a.png` from the exact
prompt in `prompts.json`. Reference cells 1–4 are the selected glyphs to revise;
5–9 are style examples only. `style-reference.json` records every source/hash.
A targeted built-in edit further simplifies A co mi tam into an ordinary
androgynous hooded figure; its full prompt, reference and output are also in
`prompts.json`. The raw corrected source is `raw/standalone-a-co-mi-tam.png`.

The other new subjects use gestures, objects and plain human silhouettes in
response to the GM's direction. No new gruff male portrait is used. The white
glyph style, natural adult anatomy and no-anime restriction remain in force.

Each final `<key>.png`, `.webp`, `.svg` is a 256×256 pure white mask with 20 px
margins; the lossless WEBP and the embedded WEBP in the SVG match PNG pixels
exactly. PNG sources and opaque previews are dev-only. After approval, delivery
uses the unchanged native SVG filename and a WEBP sidecar, with no code wiring.

```sh
python dev/icons/placeholder-pass/process.py --batch=70 --check
node dev/icons/placeholder-pass/register.mjs --batch=70
npm run validate:icon-candidates
```

Do not rerun historical `prepare_70_71.py` or `prepare_correction.py`. Inspect
`raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px. There is no
pack rebuild, live repoint or campaign-world write in this batch.

Final validation: both nine-mask batches pass; the full collection contains
566 valid PNG/SVG pairs. The live review gallery shows 18 pending cards, 40
options, all new candidates selected and no failed images. Four extraction
regressions and two isolated revision-registration tests pass. The handoff
screenshot is `raw/review-preview.png`; combined counts and preserved-history
checks are archived in `../../../placeholder-pass/progress-70-71.json`.

GM review, 2026-10-15: eight exact selections approved and installed; Bez
tajemnic carries the requested mutant face and shoulder corrections into
Batch 72. Decisions and hashes are in `reviewed.json` / `reviewed-installed.json`.
