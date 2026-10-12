# Batch 68 — two targeted revisions

The only remaining icon review subjects are Pan Plaster and adulterated fuel.
Seven Batch 67 approvals are already installed; 340/342 known review subjects
are resolved, origins 36/36 and Sztuczki 52/53 delivered. Painted-art deliveries
and GM resolver/pack/world repoints are counted separately.

`decisions.json` preserves both exact saved selections and verbatim GM feedback.
`references.json` records their source hashes. `prepare_batch.py` only composites
opaque black reference previews; it does not change the archived selected glyphs.
Do not rerun it: the incoming decision snapshot is historical.

Two standalone built-in OpenAI edits are proportionate to the two targeted
requests and permitted by Pipeline.md. `prompts.json` archives the full prompt
set and local reference/output paths. No painted art is generated here.

- Pan Plaster: another 180-degree rotation of the patient arm, which enters
  from upper-left with fingers toward lower-right; both treating hands stay
  on the left, and every part of the patient arm stays separate from the pouch.
- Adulterated fuel: cheap plastic orange-juice jug, no inspection window or
  liquid layers. Orange juice specifies packaging shape; the glyph is white.

Final review candidates:

- `pan-plaster_revision_d.png`, `.webp`, `.svg`
- `paliwo_chrzczone_revision_b.png`, `.webp`, `.svg`

Raw generator outputs remain in `raw/standalone-<key>.png`. After alpha-mask
normalization the candidates are 256×256 pure-white glyphs with 20 px margins,
lossless WEBP and theme-aware SVG wrappers embedding WEBP. The PNGs and raw
references are dev-only; approval delivery ships only WEBP/SVG pairs.

```sh
python dev/icons/review/candidates/batch-68/process_batch.py
python dev/icons/review/candidates/batch-68/validate_batch.py
python dev/icons/review/candidates/batch-68/register_review.py
python dev/icons/review/candidates/batch-68/update_queue.py
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
The registrar preflights both saved decisions before selecting the new pending
candidates, preserving all unrelated feedback and previous choices. Its independent
archive is `manifest-items.json`. These candidates require fresh GM approval.
No new production files, code, packs or world state are modified by Batch 68.

Validation: both PNG/WEBP/embedded-WEBP SVG masks pass the batch checks and
the full review collection passes with 539 PNG/SVG pairs. The previews were
inspected at 64/32/24/16 px, and the browser shows exactly two pending cards
with both Batch 68 revisions selected and no failed images. The delivery/review
census is archived in `prepared-progress.json`.
