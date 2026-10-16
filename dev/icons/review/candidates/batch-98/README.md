# Batch 98 — Brutal, ordinary catalog blunt weapons

Review outcome: option B, bare torso with an ordinary baseball bat, was
approved and installed as exact SVG/WEBP masks. `reviewed-installed.json`
records the source and delivered hashes. All six primary classes now have
approved replacement art. Overall progress is 152/153 subjects and 154/155
native SVG targets delivered; only Ganger remains.

Two options retain the selected bare torso and healed chest scar. Option A
uses a plain steel pipe; option B uses an ordinary baseball bat. Both are
forms of the canonical `Bejsbol/Rurka` entry in `scripts/config/weapons-data.mjs`.
The selected Halligan and the earlier fantasy hammer are replaced. Each
emblem still contains exactly two main elements.

OpenAI's built-in image tool edits the selected torso reference using the
existing pipe and bat icons as object references. Fine detail is simplified.
The exact prompt and reference roles are in `prompts.json`; selected-source
hashes and verbatim feedback are preserved in `batch.json` and
`revision-feedback-before.json`.

```sh
python dev/icons/placeholder-pass/class_pair_batch.py process --batch=98
python dev/icons/placeholder-pass/class_pair_batch.py check --batch=98
python dev/icons/placeholder-pass/class_pair_batch.py register --batch=98
```

Normalization only splits, crops, resizes and converts the generated bitmap.
The two 256×256 white alpha masks have 20 px safe margins and exact lossless
WEBP sidecars and SVG-embedded WEBP. They live in `../batch-98-a/` and
`../batch-98-b/`, each with its own validation hashes. Raw PNGs stay dev-only.
Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Every older choice remains selectable. Production requires saved GM approval.

Validation: both masks pass at 256×256, with exact PNG/WEBP/embedded-WEBP
equality. Contact sheets were inspected at 64/32/24/16 px. All 797 candidate
pairs validate. The review page has two pending cards, 15 total options, no
broken images and no browser errors. Both new selections are active and the
class card appears first. Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-98-99.json`.
