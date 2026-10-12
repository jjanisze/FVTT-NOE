# Batch 66 — nine returned icons and the final seven new Sztuczki

Sixteen review candidates: eight selected-reference edits, one completely fresh
isolated redraw of Bebeszenie, and the last seven untouched canonical Sztuczki.
Atlas A has the eight edits in cells 1–8, with cell 9 deliberately blank.
Atlas B has the seven new feats in cells 1–7, with cells 8–9 blank.
The isolated Bebeszenie replaces Atlas A's ninth slot in the processor.

The GM approved eighteen incoming Batch 65 glyphs. `install_approved.py` and
`accept_review.py` installed their exact selected pixels as lossless WEBP and
theme-aware SVG masks, after checking unchanged saved decisions and clean
targets. `installed.json` records every explicit production path and source/output
hash. The shared feedback was preserved byte-for-byte during installation.
Code, packs and world state remain untouched; older repoints are listed in
MISSING's "Do podpięcia".

`decisions.json` is the immutable incoming Batch 65 review snapshot. Eight items
requested revisions; Bebeszenie was rejected for the same bent-handle failure.
`references.json` preserves all nine exact selections and verbatim notes.
Only eight references are supplied in `raw/reference-a.png`. The rejected pliers
glyph is retained for diagnosis and is deliberately excluded from generation.
Its fresh prompt specifies one pair of real combination pliers, two straight
symmetric handles below one pivot, one separate butcher knife and a small rib
outline. There is no prior defective-image input to that generation.

The other edits correct forehead-to-nose contact height, a wrist seam, requested
down/up arrows, an angled armour ricochet, the patient's missing hand, anime-like
facial styling, crossed forearms rather than crossed hatchets, and an extra
supporting hand. `batch.json` records order, final paths and canonical keys;
`prompts.json` archives the built-in OpenAI atlas and isolated-generation prompts.

`catalog.json` and `progress.json` preserve the pre-install census.
`progress-after-install.json` records 323 resolved icons, sixteen known remaining
gaps/returns (roughly 95% of the known icon backlog), all 36 origin glyphs installed,
and 38/53 Sztuczki with dedicated files. After Batch 66 registration all canonical
origin and Sztuczka items have either dedicated files or a review candidate.
These are asset counts; they exclude painted artwork, sounds and pack/live repoints.

```sh
python dev/icons/review/candidates/batch-66/accept_review.py --check
python dev/icons/review/candidates/batch-66/compose_reference.py
python dev/icons/review/candidates/batch-66/process_batch.py
python dev/icons/review/candidates/batch-66/validate_batch.py
python dev/icons/review/candidates/batch-66/register_review.py
npm run validate:icon-candidates
```

Inspect `raw/inventory-preview.png` at 64/32/24/16 px. Processing retains the
existing mask pipeline: 256×256 white glyphs, at least 20 px margins, lossless
WEBP and SVG wrappers embedding WEBP. Tiny isolated marks below twelve pixels
are removed, with all source choices in `normalization.json`.

The registrar selects the nine returned items' new candidates as pending only
if their old decision, selection and notes still match, including the rejected
item. It preserves other feedback and appends the seven new cards.
`manifest-items.json` archives the registered batch separately from shared dirty
queue files. No Batch 66 candidate is installed before fresh GM approval.

Do not rerun `inspect_queue.mjs` or `report_progress.mjs`: their snapshots are
historical. Raw images and candidate previews remain local under existing ignores.
