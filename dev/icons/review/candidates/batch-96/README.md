# Batch 96 — Brutal with a Halligan bar, two choices

The GM selected the bare torso with its healed chest scar and asks to replace
the hammer with a Halligan bar. Both new choices retain that torso and show
the complete tool, with its fork, shaft, adze and pike. Option A puts the
adze/pike at the top; option B puts the fork at the top. Both have two main
elements and remain in the existing class card alongside every older choice.

Tool geometry was checked against the manufacturer's
[Pro-Bar reference](https://www.firehooksunlimited.net/probars.html).
That is a factual shape reference; no product photograph, logo or text is
copied into the generated glyphs. The exact source URL and purpose are
archived in `prompts.json`.

OpenAI's built-in image generator produces `raw/brutal-pair.png` from the
selected opaque torso reference and the established style contact sheet.
Every exact prompt is archived in `prompts.json`. `batch.json` and
`revision-feedback-before.json` preserve the verbatim saved correction and
selected-source hash.

The processor splits the two halves and converts to 256×256 pure-white masks
with alpha and 20 px safe margins. PNG, external lossless WEBP and SVG-embedded
WEBP match exactly. Options live in sibling `batch-96-a/` and `batch-96-b/`
folders with independent `validated.json` hash records. Raw PNGs stay dev-only.

```sh
python dev/icons/placeholder-pass/class_pair_batch.py check --batch=96
python dev/icons/placeholder-pass/class_pair_batch.py register --batch=96
```

Contact sheets are `raw/preview.png` and `raw/inventory-preview.png` at
64/32/24/16 px. Registration runs once and retains all older candidates.
Native files remain unchanged until a selected option is approved.

Validation: both exact masks pass and were inspected at 64/32/24/16 px.
All 794 candidate pairs validate. The gallery has nine pending cards and
36 options, with every new candidate selected, no broken images and no
browser errors. Ten new choices resolve through the existing approval helper.
All nine remaining native hashes, older candidates and unrelated decisions
are preserved. Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-96-97.json`.
