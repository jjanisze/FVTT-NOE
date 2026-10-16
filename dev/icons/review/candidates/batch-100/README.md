# Batch 100 — Ganger, biker vest and studded bat

Review outcome: the GM keeps the composition and requests sharper, nail-like
studs on the bat. That exact note is archived in `reviewed.json` and carried
into Batch 101. This candidate has not been installed.

The GM requests a different concept without the wheel alignment problem.
This replacement pairs an empty sleeveless biker vest with a separate
studded baseball bat. It follows Ganger's canonical gang membership and
group melee traits in `dev/classes/professions.json`. Both complete objects
sit side by side with a broad black gap; no wheel or portrait is included.

OpenAI's built-in image tool generates one isolated replacement using the
approved contact sheet for style only. Exact prompt and rationale:
`prompts.json`. The prior selected source, original native hash and verbatim
saved feedback remain in `batch.json` and `revision-feedback-before.json`.

Editable generated source: `raw/standalone-ganger.png`. Normalization only
crops, resizes and converts the bitmap. A compatibility canvas pastes that
source unchanged into cell 1, leaving eight cells empty; it draws no art.

```sh
python dev/icons/placeholder-pass/prepare_100.py --compose
python dev/icons/placeholder-pass/process.py --batch=100
python dev/icons/placeholder-pass/process.py --batch=100 --check
node dev/icons/placeholder-pass/register.mjs --batch=100
```

The final dev candidate is `ganger.png`: a 256×256 pure-white alpha mask
with 20 px safe margins and exact matching lossless WEBP and SVG-embedded
WEBP. PNGs remain dev-only. Inspect `raw/preview.png` and
`raw/inventory-preview.png` at 64/32/24/16 px. All older options remain
selectable, and the shipped placeholder requires saved GM approval.

Validation: the exact PNG/WEBP/embedded-WEBP mask and 20 px margins pass.
The composition was inspected at full size and 64/32/24/16 px. All 798
candidate pairs validate. The gallery has one pending card with six options,
the new concept selected, no broken images and no browser errors. Its
previous choices, unrelated decisions and original native hash are retained.
Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-100.json`.
