# M6 art review — instruments and water

Requested 2026-10-29. Scope confirmed by the GM: **14 monochrome icons and one water overlay**.
The four companion tokens and eleven bestiary tokens remain a separate painted-token task.

**After GM review:** the static water candidate is superseded by the animated silhouette filter,
`scripts/scenes/woda-efekty.mjs`. After the low-contrast first proposal, `vfx/water-surface.webp`
reuses the original RGBA painting unchanged, with stronger contrast and motion in the shader.
Default strength is 80%, default water muddy. Review the implementation in **Poligon → Arena →
Karta prób → Grafika: Zanurzenie**. [Usage and validation](../../../HANDOFF_m6_zanurzenie.md).
The original review cards, files and saved decisions remain intact; glyph installation is separate.

## Review

Use the existing icon-review server (`npm run review:icons`).
The queue has 15 new cards: 12 instruments, Pod wodą, Tonie and Nakładka zanurzenia.
The **Zanurzenie** tab opens `overlays/water/preview.html`: existing module tokens
with the overlay, a strength slider, 70/140/256 px sizes and light/dark surfaces.
Full-sheet water and water clipped to the creature silhouette are compared as historical design previews;
the animated Foundry implementation uses only the silhouette.

The previous 557 review cards and saved feedback are retained.
Runtime icons, `iconReady`, compendia and campaign/Poligon documents are unchanged.
Candidates remain queued until the GM saves review decisions; a later installation
must use the exact selected masks and set instrument/status image wiring.

## Sources and processing

- [Batch 119](../review/candidates/batch-119/batch.json): nine instruments.
- [Batch 120](../review/candidates/batch-120/batch.json): three instruments and two water statuses;
  cells 6–9 explicitly empty.
- Each batch has a frozen subject order, exact `prompts.json`, source atlas, style-reference
  image, candidate PNG/WEBP/SVG and validation hashes.
- [Kontrabas correction](../review/candidates/batch-119/kontrabas-revision-prompt.json):
  the first thin frame became too faint at 16 px. A targeted built-in edit broadens
  the body and neck. Its original candidate/reference is retained under `raw/references/`.
- [Overlay prompt](../review/overlays/water/prompts.json), [RGBA validation](../review/overlays/water/validation.json).
  Preserve full square framing; 512×512 lossless WEBP. The image has its own variable alpha.
  Suggested render strength is 60%; the preview exposes this choice.
- Overlay examples copy only the module's existing own token files, Bit-Boys and Pies bojowy,
  for this development preview; no external dnd5e token artwork is redistributed.

All new painting came from OpenAI's built-in image tool; the model identifier is not exposed.
No CLI/API fallback was used. Existing `placeholder-pass/process.py` performs the
normal glyph split, white-mask normalization, safe framing and theme-aware SVG wrapping;
no glyph shapes were drawn or repaired by code.

## Reproduce candidate preparation

```sh
python dev/icons/placeholder-pass/process.py --batch=119
python dev/icons/placeholder-pass/process.py --batch=120
python dev/icons/m6-pass/prepare_review.py
node dev/icons/review/merge_batch_manifest.mjs dev/icons/review/m6-manifest-items.json
npm run validate:icon-candidates
```

`prepare_review.py` verifies validated source hashes and the absence of production targets.
Its incoming snapshot records existing review cards, saved-feedback hash and current source-code hashes.
It does not install assets or change saved feedback.

## Validation

[Review-ready evidence](review-ready.json): all 14 new white masks validate
as matching 256×256 PNG/WEBP/SVG candidates with safe margins; the full queue has
921 valid PNG/SVG pairs. Chrome loaded all 60 candidate image previews without
broken images. The water preview renders six canvases; zero strength matches
the original token, its two overlay variants differ, and the 70 px control works.
All 557 earlier review cards are unchanged. Current source-code hashes match
the incoming snapshot and all production delivery paths remain absent.
The GM has already saved some new approvals; those decisions are retained.
