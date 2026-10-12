# Batch 65 — eleven revisions and sixteen new Sztuczki

Twenty-seven candidates in three 3×3 atlases. Atlas A contains nine saved
revision targets. Atlas B contains the final two revisions and seven new feats;
Atlas C contains nine further new feats. All prompts and contexts are generic.

`decisions.json` is the immutable incoming review snapshot. `references.json`
records the eleven exact selected candidates and their verbatim GM notes;
`raw/reference-a.png` and `raw/reference-b.png` preserve their atlas positions.
`batch.json` keeps canonical camelCase catalog keys separate from final file stems.
`prompts.json` archives all built-in OpenAI image generation prompts.

The revisions address the beckoning sword off-hand, failed pliers, fused crowbar,
missing swimmer hand, bald butcher/axe orientation, asymmetric headbutt, driver's
grin, mechanic arms, speaker's thumbs-up, wrist grapple and audience silhouette.

The first atlas retained the mechanic's disconnected hands and the butcher's
inward-facing axe; the musician also retained a leg-like shape beneath the guitar.
Three isolated corrections use their exact atlas candidates as references.
`prepare_corrections.py` makes those opaque previews; correction prompts are in
`prompts.json`, with outputs `raw/standalone-<candidate-key>.png`. The processor
uses those sources for the three affected cells and keeps the original drafts.

The new feats run from Padnij/Powstań through Szkolenie w ciężkim pancerzu.
`catalog.json` records checks against canonical names, proposed filenames and
existing review cards. `progress.json` is the pre-generation asset census:
305 of 316 reviewed items resolved, 34/36 origin abilities and 23/53 Sztuczki
with dedicated files. Eleven revisions plus twenty-three untouched canonical
gaps remain; sixteen of those gaps enter this batch. These counts describe the
known icon backlog, not painted artwork or sounds, and do not include pack or
live item repoints.

```sh
python dev/icons/review/candidates/batch-65/compose_reference.py
python dev/icons/review/candidates/batch-65/prepare_corrections.py
python dev/icons/review/candidates/batch-65/process_batch.py
python dev/icons/review/candidates/batch-65/validate_batch.py
python dev/icons/review/candidates/batch-65/register_review.py
npm run validate:icon-candidates
```

Inspect `raw/inventory-preview.png` at 64/32/24/16 px before registering.
The processor creates transparent 256×256 white masks with at least 20 px
margins, lossless WEBP and theme-aware SVG wrappers embedding WEBP. Isolated
marks below twelve pixels are removed as in Batch 64, with source choices in
`normalization.json`. Candidate PNGs and raw atlases remain local development
previews under existing ignore rules; production assets require fresh GM approval.

Registration selects the eleven new revision candidates as pending only when
the saved old selection/notes still match the incoming snapshot. Old notes stay
archived; all unrelated saved decisions are preserved. The sixteen new review
cards append without replacing prior cards. `manifest-items.json` independently
archives the registered batch because the shared queue files are already dirty.

Do not rerun `inspect_queue.mjs`: it refuses to overwrite the historical snapshot.
No production icons, code, packs or world state are changed by this batch.
