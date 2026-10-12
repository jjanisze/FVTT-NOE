# Batch 67 — six revisions and three fuel grades

Nine review candidates in one 3×3 atlas: six saved action/feat revision requests
and the three missing canonical fuel-grade icons found by the broader item audit.
Good, average and adulterated fuel use distinct container structures; they are
existing catalog grades rather than new gasoline/diesel definitions.

`decisions.json` preserves the six saved selections and verbatim GM notes.
`references.json` archives all six source paths, with five supplied in the atlas
reference. Bebeszenie's old crossed-tool composition is deliberately omitted from
the generation reference; its new uncrossed organic/electronic layout is generated
in the blank first cell. `batch.json` records exact row-major order and final paths;
`prompts.json` archives the built-in OpenAI atlas and any correction prompts.

Pan Plaster required one isolated correction: the atlas moved its upper treating
hand to the right. The final candidate uses `raw/standalone-pan-plaster_revision_c.png`,
generated from the exact selected Batch 66 glyph with both treating hands still
entering from the left and only the patient arm on the opposite diagonal.
`prepare_corrections.py` produces opaque reference previews without altering
the archived selected glyph. The correction prompt is recorded in `prompts.json`.

The item audit inspected 333 canonical physical item results. All 23 medicines
have distinct existing configured icon paths, including Reminex; all 35 chemistry
entries have custom art. The only new art gaps found were the three fuel grades.
The medic-refill builder still points to a core heal icon even though dedicated
art exists. Full evidence and the GM wiring tasks are in
`dev/icons/CATALOG_COVERAGE.md` and `catalog-icons-2026-10-12.json`.

```sh
python dev/icons/review/candidates/batch-67/compose_reference.py
python dev/icons/review/candidates/batch-67/process_batch.py
python dev/icons/review/candidates/batch-67/validate_batch.py
python dev/icons/review/candidates/batch-67/register_review.py
npm run validate:icon-candidates
```

Inspect `raw/inventory-preview.png` at 64/32/24/16 px before registration.
Processing uses the established alpha-mask pipeline, 256×256 pure white glyphs,
20 px margins, lossless WEBP and SVG wrappers embedding WEBP masks. Tiny isolated
marks below twelve pixels are removed and recorded in `normalization.json`.
The five selected edit subjects retain unrequested parts; requested changes include
the patient's arm rotation, simpler face marks, speed strokes, abstract book page
lines/removal of the wrench, and a shot through cover with separated figures.

The registrar selects new revision candidates as pending only when their saved
decision/selection/notes still match the snapshot, preserving unrelated feedback
and previous candidates. It appends three fuel review cards. `manifest-items.json`
independently archives the registered batch while shared queue files remain dirty.
No production assets, code, packs or world state are changed by this batch.

Validation: all nine PNG/WEBP/embedded-WEBP SVG masks pass the batch checks;
the full review collection passes with 537 PNG/SVG pairs. The inventory preview
was inspected at 64/32/24/16 px. `progress.json` is the incoming snapshot;
`prepared-progress.json` records the expanded queue after registration.

Do not rerun `inspect_queue.mjs`: the incoming snapshot is historical.

GM review received 2026-10-13: seven approvals installed by
`accept_current_review.py`, preserving exact selected pixels and unchanged
feedback. `reviewed.json` archives all nine decisions, `reviewed-installed.json`
records source/output hashes and final paths, and `reviewed-remaining-items.json`
preserves the two requests for Pan Plaster and adulterated fuel. Validation checks
all seven WEBP/SVG pairs against the exact saved PNG sources. Only these two
subjects continue in Batch 68; origins are 36/36 and Sztuczki 52/53 delivered.
Good and average fuel still need their GM resolver mappings. Bebeszenie uses
the exact M5 action filename and needs no wiring.
