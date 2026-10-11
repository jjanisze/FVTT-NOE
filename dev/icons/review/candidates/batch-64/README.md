# Batch 64 — eight revisions and nineteen Sztuczki

Twenty-seven candidates in three 3×3 atlases. Atlas A has eight exact-selected
GM revisions plus Barbarka. Atlases B/C continue the canonical Sztuczka pass
with eighteen new glyphs. All contexts and prompts are generic.

Samuraj is redrawn using the latest instruction: one hand holding a katana, the
empty off hand in a martial guard. No scabbard/draw composition is carried forward.
The other revisions address the pistol trigger/proportions, pliers handles,
crowbar/lid, swimmer anatomy, clipped trader/butcher heads and cartoon glove.

`decisions.json` is the immutable incoming review snapshot. `references.json`
preserves exact selected candidates and old GM notes. `batch.json` records the
row-major order and each new Sztuczka's canonical camelCase key separately from
its proposed asset filename. `prompts.json` records all built-in OpenAI prompts.
Raw atlases and normalized preview images stay local under existing ignore rules.

The first atlas clipped the newly lengthened pistol muzzle and retained a cartoon
control hand. Their isolated corrections are in `raw/standalone-wychuchana.png`
and `raw/standalone-hi-tech.png`; exact prompts are recorded in `prompts.json`.
The processor uses those sources for the two affected cells and removes isolated
marks smaller than twelve pixels. `normalization.json` records source choices
and removed specks, while preserving the original atlas drafts.

```sh
python dev/icons/review/candidates/batch-64/compose_reference.py
python dev/icons/review/candidates/batch-64/prepare_corrections.py
python dev/icons/review/candidates/batch-64/process_batch.py
python dev/icons/review/candidates/batch-64/validate_batch.py
python dev/icons/review/candidates/batch-64/register_review.py
npm run validate:icon-candidates
```

Inspect `raw/inventory-preview.png` at 64/32/24/16 px. The registrar resolves only
installed exact approvals, selects the eight new revision candidates as pending,
archives their previous notes, and preserves all unrelated GM decisions. New
candidates require fresh approval before production installation.

The separate `install_approved.py` installed nineteen incoming Batch 63 approvals
as WEBP/SVG pairs, after checking unchanged saved selections and clean target
paths. `installed.json` records all explicit production files and source/output
hashes. This incoming snapshot and delivery report are kept separate from Batch 64's
subsequent review. Older repoints/rebuilds remain in MISSING's "Do podpięcia".

The GM reviewed Batch 64 on 2026-10-12: fifteen approved, eleven revision requests,
and Kuloodporność without a saved decision. `reviewed.json` archives the exact
selections, verbatim notes and feedback records. `accept_review.py` installs only
the exact approved selections, resolves their cards and leaves `feedback.json`
byte-for-byte unchanged. `reviewed-installed.json` records the fifteen new
WEBP/SVG deliveries and source/output hashes; `remaining-items.json` preserves
the open cards. The eleven revisions are queued in MISSING for the next batch.
No code, pack or world was changed.

Kuloodporność was approved after the initial snapshot. The separate
`reviewed-addendum.json` and `reviewed-addendum-installed.json` preserve that later
approval and its exact WEBP/SVG delivery without changing the first snapshot.
Batch 64 now has sixteen installed glyphs, eleven revision requests and no pending
cards. `remaining-items.json` reflects those eleven open revision cards.

```sh
python dev/icons/review/candidates/batch-64/accept_review.py --check
python dev/icons/review/candidates/batch-64/accept_review.py --check --snapshot reviewed-addendum.json --report reviewed-addendum-installed.json
```

This check verifies production pixels against the approved PNGs, hashes, margins,
pure white visible pixels, WEBP encoding and the embedded theme-aware SVG masks.
Running without `--check` uses the existing immutable `reviewed.json` snapshot;
it does not consume later feedback or allocate Batch 65.

Do not rerun `inspect_queue.mjs` after registering: the saved incoming decisions
belong to this batch's exact historical source references.
