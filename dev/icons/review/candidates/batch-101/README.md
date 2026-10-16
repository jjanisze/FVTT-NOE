# Batch 101 — Ganger, pointed bat spikes

The saved GM correction changes only the three blunt bat studs into pointed
nail-like spikes. The empty biker vest, bat, their layout and broad white
glyph style are retained. The exact selected edit target is
`raw/reference-ganger.png`; the editable generated source is
`raw/standalone-ganger.png`.

OpenAI's built-in image tool performs the edit. The exact prompt is in
`prompts.json`; `batch.json` and `revision-feedback-before.json` preserve the
verbatim saved note, selected source hash and original native filename/hash.

```sh
python dev/icons/placeholder-pass/prepare_101.py --compose
python dev/icons/placeholder-pass/process.py --batch=101
python dev/icons/placeholder-pass/process.py --batch=101 --check
node dev/icons/placeholder-pass/register.mjs --batch=101
```

The compatibility canvas pastes the generated bitmap unchanged into cell 1
with eight empty cells. Normalization only crops, resizes and converts;
it draws no glyph details. The dev candidate `ganger.png` is 256×256 white
with alpha and 20 px margins. External lossless WEBP and SVG-embedded WEBP
match its pixels exactly. PNGs remain dev-only. Inspect `raw/preview.png`
and `raw/inventory-preview.png` at 64/32/24/16 px. Every older option remains
selectable; the final placeholder still needs saved approval before delivery.

Validation: the candidate passes exact PNG/WEBP/embedded-WEBP equality and
safe margins. The pointed spikes were inspected at full size and
64/32/24/16 px. All 799 candidate pairs validate. The gallery has one pending
card, seven options, the new correction selected, no broken images and no
browser errors. Original production hash, all older choices and unrelated
decisions are preserved. Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-101.json`.
