# Batch 108 — 4 cleanup icons and 5 origin emblems

| Cell | Subject | Purpose |
|---|---|---|
| 1 | Bolesny atak | Simplify the detailed action icon |
| 2 | Czas patriotów | Replace portrait detail and dithering with fist and flag |
| 3 | Pajęcza wspinaczka | Clean spider and climbing surface; remove stray left fragment |
| 4 | Wierzę | Offering hand comes from the right toward the wishing person |
| 5 | Asgard | Bunker vault door |
| 6 | Człowiek Pustyni | Plain headscarf and water canteen |
| 7 | Detroit | Car tire and engine piston |
| 8 | Federacja Appalachów | Mining pick and mountain |
| 9 | Miami | Marsh skiff and palmetto |

OpenAI's built-in image tool generated one 3×3 atlas. Reference 1 supplies
the broad white-glyph style. Reference 2 supplies the exact four cleanup
subjects; its other cells are empty because the main origin emblems do not
exist yet. The generic prompt and verbatim Wierzę correction are archived
in `prompts.json`, `batch.json` and `revision-feedback-before.json`.

`incoming.json` freezes existing variants and explicitly absent origin
paths. Processing only splits, crops, resizes and converts the bitmap:

```sh
python dev/icons/placeholder-pass/process.py --batch=108 --check
```

All nine 256×256 masks have pure-white visible pixels, alpha and 20 px
margins. PNG, external lossless WEBP and SVG-embedded WEBP match exactly.
Previews were inspected at 64/32/24/16 px. All 857 candidate pairs validate.

The gallery has 16 pending cards with 34 options, no broken images or
browser errors, and all new candidates selected at publication. Older
Wierzę options and all 523 unrelated cards and decisions remain unchanged.
Local screenshot: `raw/review-preview.png`; counts: `raw/browser-check.json`.
Shared evidence: `../../../style-pass/progress-108-109.json`.

Fresh saved approval is required before delivery. New origin targets do
not have prior source hashes; verify `expectedAbsent` before creating them.
Style targets retain exact incoming hashes. New assets ship as SVG/WEBP;
PNGs remain under dev. Origin filenames are already supported by the pack
builder; the GM rebuilds `pochodzenia` after delivery. No runtime code,
pack database, campaign document or current production asset was changed
while preparing these candidates.

The core village comparison is read locally from Foundry into ignored
`raw/core-origin-placeholder.svg` for review only; it is not redistributed.
