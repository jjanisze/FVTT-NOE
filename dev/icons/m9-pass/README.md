# M9 — legacy glyph cleanup, 2026-11-17

All nine Batch 124 replacements were approved by the GM and installed on 2026-11-17.
They were generated with the built-in OpenAI image tool (the tool does not expose a model
identifier). Exact SVG/WEBP bytes, decisions and archived originals are recorded in the
[delivery receipt](reviewed-installed.json). [Processing guide and next choice](PROCESS.md).
[Delivery, finish checks and sandbox-render verification](delivery-verification.json).

The source audit found complete file coverage but visual inspection exposed real atlas
contamination: detached neighbouring pieces above three armour glyphs, grid-edge lines on
several chemical glyphs, small stray firearm pixels, and excessive internal detail.
The initial read-only source checks did not detect these visual defects. The inspection sheet
is local at `../review/audits/m9-edge-contact.png`.

| Batch | Subjects | Result |
| --- | --- | --- |
| 124 | Helmet, leg guards, arm guards, Steel Police powered armour, full scrap armour, military hydraulic armour, premium alcohol, cheap alcohol, Anestix | Nine GM-approved SVG/WEBP pairs installed; legacy variants archived |
| 125 | Cigar, four fictional drug items, Beretta B92, .22 revolver | Image service rejected the mixed atlas at output with category `illicit`; no file returned |
| 126 | Cigar, Beretta B92, .22 revolver only; all drug subjects excluded | Image service also rejected this narrower atlas at output with category `illicit`; no file returned |
| 127 | Neodrugs, Tornado, both Narkotyki glyphs, Cygaro | GM-requested targeted cleanup succeeded with the built-in OpenAI image edit tool; exact SVG/WEBP pairs installed |
| 128 | Poison bottle, Beretta B92, .22 revolver | Image tool rejected the output; GM explicitly approved detached-speck cleanup with the existing Python normalizer. Three validated pairs installed |

No confirmed M9 artwork requests remain open. Batch 128 removes the poison bottle's detached
25-pixel dot and the pistol's detached 99-pixel artifact. All other poison object pixels remain
exactly unchanged; firearm normalization restores standard safe margins without redrawing.
The GM explicitly approved this deterministic method after the service rejected Batch 128.
Next free batch: 129. This does not mean M9 UI rollout and Poligon acceptance are complete.

Exact inputs and prompts:

- [Batch 124 subjects and source hashes](../review/candidates/batch-124/batch.json),
  [exact image prompt and reference roles](../review/candidates/batch-124/prompts.json),
  [mask validation](../review/candidates/batch-124/validated.json).
- [Batch 125 frozen prompt](../review/candidates/batch-125/prompts.json),
  [service result](../review/candidates/batch-125/generation-status.json).
- [Batch 126 frozen prompt](../review/candidates/batch-126/prompts.json),
  [service result](../review/candidates/batch-126/generation-status.json).
- [Batch 127 exact edit prompt](../review/candidates/batch-127/prompts.json),
  [successful result](../review/candidates/batch-127/generation-status.json),
  [installation hashes and archived originals](../review/candidates/batch-127/installed.json).
- [Batch 128 exact attempted prompt](../review/candidates/batch-128/prompts.json),
  [explicit normalizer authorization](../review/candidates/batch-128/normalization-authorization.json),
  [measured pixel changes](../review/candidates/batch-128/cleanup.json),
  [installation](../review/candidates/batch-128/installed.json),
  [three-subject finish revision](../review/candidates/batch-128/finish-approval.json).

The successful raw atlas and normalized PNG/WEBP/SVG candidates are saved under
`dev/icons/review/candidates/batch-124/`. Source and style references are in each batch's
local `raw/` folder. Normalization used the existing pipeline, not hand-painted artwork:

```sh
python dev/icons/placeholder-pass/process.py --batch=124
python dev/icons/placeholder-pass/process.py --batch=124 --check
python dev/icons/review/validate_candidates.py
```

All nine masks have a 20 px minimum safe margin, pure-white visible pixels and identical
decoded PNG / lossless WEBP / SVG-embedded WEBP. Inventory-size inspection covered
64/32/24/16 px using the pipeline's contact sheet. The three suits have intentionally
different silhouettes: human-proportioned powered suit, irregular scrap plates, and a
stocky hydraulic colossus. Their appearance remains for the GM to judge.

Registration preserved all 583 older review cards and every saved decision. After the GM
approved all nine `m9-cleanup-*` cards, delivery resolved those nine cards and preserved the
exact saved decisions. Eighteen old SVG/PNG variants were archived locally; the nine PNG
sidecars had no runtime or pack references and were retired so the finish engine reads the
new approved WEBP master. `python dev/icons/m9-pass/accept.py --check` verifies delivery.

The initial audit found 250 semantic assignment gaps (248 after two deliberate canvas/UI
exceptions). The GM then chose the proposed treatments: [family approval](family-approval.json).
Profile `noe-m9-r07-v2` now covers 782 subjects across 22 families with **zero assignment gaps**.
The GM approved the full rendered library conditional on the five requested corrections.
All ten corrected variants and 772 unchanged variants are bound to exact source/profile/pixel
hashes in [finish-approval.json](finish-approval.json). The original reviewed snapshot is preserved
in [finish-review-before-corrections.json](finish-review-before-corrections.json).
The [current audit](../review/m9-gap-audit.md) distinguishes this from remaining visual cleanup
and library stems outside the static consumer scan.

**Completed 2026-11-18:** all 782 exports match the approved pixels; sandbox and campaign
compendia rebuilt and validated. Runtime creation and 44 px resource-panel rendering checked
in the sandbox. [Rollout verification and UI-test limitation](rollout-verification.json).
The icon browser's M9 process page now shows completion and the finish gallery shows 782
approved cards. Existing world-item image paths were not migrated.

Continue coding from [HANDOFF_m9_graphics_to_code.md](../../../HANDOFF_m9_graphics_to_code.md).
Poligon module/pack/document refresh is the first task; no blanket icon regeneration is needed.
