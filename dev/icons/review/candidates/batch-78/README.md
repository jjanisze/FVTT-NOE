# Batch 78 — three revisions and six fresh subjects

Fifteen selections from the Batch 76–77 review are delivered. Three saved
revisions take priority in this atlas; all eighteen new candidates across
Batches 78–79 require GM review before production delivery.

| Cell | Subject | Motif / saved correction |
|---|---|---|
| 1 | Kondycha | Keep the figure and pose; upward arrow behind it |
| 2 | Maszyna do zabijania | Seven skulls; two continuous horizontal row strikes |
| 3 | Motywacja | Cheerful coach encourages an exhausted seated boxer |
| 4 | Mutant na śniadanie | Hunting knife guards against a nonhuman claw |
| 5 | Nie do zdarcia | Bare forearm deflects a flattened bullet |
| 6 | Nie klękam | Generic upright adult, protective arch |
| 7 | Obelga | Middle-finger gesture |
| 8 | Obsługa pancerza | Hand tightens an armor vest strap |
| 9 | Odważny czy głupi | Calm adult confronts a bestial claw |

`batch.json` retains canonical mechanics, every exact native filename/hash,
and verbatim saved decisions under `revisionOf`. Reference cells 1–3 are the
selected revision sources; cells 4–9 are style-only. Their source hashes are
in `style-reference.json`. The rejected megaphone concept is replaced with
the requested coach and boxer; no repeated gruff male portrait or anime.

OpenAI's built-in image tool generates one atlas, preserved as
`raw/batch-78-atlas-a.png`; `prompts.json` contains the exact prompt and any
targeted corrections. Raw PNGs and review candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
Production delivery retains native SVG names and adds WEBP sidecars, with no
runtime wiring. Kondycha also covers the unused legacy `kondycha_active.svg`;
these nine subjects cover ten exact SVG targets, without adding a mechanic.

```sh
python dev/icons/placeholder-pass/process.py --batch=78 --check
node dev/icons/placeholder-pass/register.mjs --batch=78
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Registration preserves the three existing cards and all older candidates,
archives their old decisions, and selects the new pending candidates.
Fresh subjects get six new cards. No code, packs or world state is modified.
Do not rerun the historical preparation script.

Validation: all nine exact masks pass. The claw in cell 4 slightly crosses its
source cell edge; whole-component assignment retains all 394 overhanging pixels
without clipping or adding art. No targeted correction or ownership override
was needed. Inventory contact sheets were inspected at 64/32/24/16 px.
The complete collection contains 638 valid PNG/SVG pairs. The live gallery has
18 pending cards, 41 options, all new candidates selected and no broken images.
Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-78-79.json`.
