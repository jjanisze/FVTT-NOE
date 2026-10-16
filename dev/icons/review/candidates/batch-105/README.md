# Batch 105 — 2 browser style revisions

Review outcome: **1 approved replacements installed; 1 revisions remain**.
Exact saved decisions and delivered SVG/WEBP hashes are in `reviewed.json`
and `reviewed-installed.json`. Remaining notes continue in Batches 106–107.

| Cell | Subject | Replacement motif |
|---|---|---|
| 1 | Zasłonięcie hełmu | ONE complete modern industrial HELMET in three-quarter SIDE PROFILE with ONE large CLOSED PROTECTIVE FACEPLATE. One thick side hinge and ONE broad black visor opening, with ONE broad curved motion stroke above the faceplate showing closure. No person, neck armor, skull, tiny screws, circuitry, gauge, text or fine reflections. |
| 2 | Zawzięty sukinkot | ONE complete generic adult rises from ONE knee: one boot planted, one knee still touching the ground, ONE palm braced on the ground and the other hand pressing the planted thigh. Smooth featureless head, natural ordinary build, broad simple clothing. A determined rising pose without an arrow. No beard portrait, injuries, blood, torn fine fabric, texture or extra limb. |

OpenAI's built-in image tool generates `raw/batch-105-atlas-a.png`.
Reference 1 (`raw/style-reference.png`) supplies desired broad white glyph
style. Reference 2 (`raw/current-reference.png`) supplies existing subjects
and composition to simplify, without copying their fine detail or texture.
Exact prompt and roles: `prompts.json`. Verbatim saved flags and all source
variant hashes: `style-feedback-before.json` and `incoming.json`.

```sh
python dev/icons/placeholder-pass/process.py --batch=105
python dev/icons/placeholder-pass/process.py --batch=105 --check
```

The processor crops, resizes and converts only; it draws no semantic content.
Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Final dev PNG/WEBP/SVG masks are 256×256 with alpha and 20 px safe margins;
external lossless WEBP and embedded WEBP match the pure-white PNG pixels.
Only cells 1–2 contain artwork; cells 3–9 stay empty black.
Existing production files remain until fresh GM approval. Current style
flags, earlier review cards and saved decisions are retained. No code wiring,
pack rebuild or world writes are part of this replacement.

Validation: 2 exact white PNG/WEBP/embedded-WEBP masks pass with safe
margins and were inspected at 64/32/24/16 px. All 828 candidate pairs validate.
The full style gallery has 29 pending cards and 58 options with no broken
images or browser errors. Existing production hashes, saved style flags and
all earlier reviews are preserved. Evidence: `../batch-102/raw/review-preview.png`
and `../../../style-pass/progress-102-105.json`.
