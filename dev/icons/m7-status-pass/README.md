# M7 status glyphs — approved and delivered

Prepared 2026-11-01 from the ten requests in [MISSING.md](../MISSING.md):
three action markers, six blood-bleed markers and one hydraulic-leak marker.
The GM approved Reaction, sniper position, Hemofilia, saw and dum-dum. Their exact
SVG/WEBP candidates are delivered, together with the original five-point-star design
explicitly requested as the primary-action glyph (`icons/statuses/akcja.svg`). That reuse
is authorized by the original revision note; no synthetic approval was written.
[Exact saved decisions and delivery hashes](reviewed-installed.json).

The GM approved all five revised subjects in Batch 123. Bonus Action uses option A,
the smaller four-point star with a check. The three revised blood bleeds use a common
drop with internal cut/vessel/loss marks; hydraulics shows a broken flexible hose.
All ten requested status icons and the separately authorized primary-action reuse
are delivered as eleven exact SVG/WEBP pairs. Every M7 card is resolved; all earlier
candidates and actual GM decisions remain available in the archive.

On the GM's explicit integration request, the ten status image paths are now wired in
`scripts/config/conditions.mjs`, `scripts/config/krwawienia-data.mjs` and
`scripts/wkk/combat/bleeding.mjs`. The primary-action star remains a reserved graphic,
without a new status or mechanic. No pack rebuild or campaign change was needed.
[Final delivery snapshot](final-delivery.json) records the earlier asset-only phase;
[runtime verification](runtime-verification.json) covers the subsequent integration.

`npm test` passes. Sandbox Quench passes 80/80: configuration 45, actions 12 and bleeds 23.
All ten configured statuses produce ActiveEffects with the approved image path, the served
SVG hashes match the delivery receipt, and all ten masks render visibly through Foundry's
PIXI renderer. [Renderer capture](live-render-preview.png). This read-only check writes no
world documents. Both Poligon clients were reloaded; the Lazaret `ikony` probe now includes
the new M7 glyphs, without resetting or reseeding the station.

## Sources

- [Batch 121](../review/candidates/batch-121/batch.json): three action markers and six blood bleeds.
- [Batch 122](../review/candidates/batch-122/batch.json): hydraulic leak; unused cells explicitly empty.
- [Batch 123](../review/candidates/batch-123/batch.json): six candidates for five revised subjects;
  cells 7–9 empty. `incoming.json` retains verbatim GM notes, selected sources and their hashes.
- Each batch retains its exact `prompts.json`, generated source atlas, style reference,
  normalized PNG/WEBP and theme-aware SVG mask, plus validation hashes.
- [Targeted corrections](../review/candidates/batch-121/correction-prompt.json):
  the original artery looked like a fountain and the saw-drop looked like an arrow.
  One additional generation replaces them with a sideways arterial jet and a rounded
  drop with teeth on one side. Original normalized variants remain under `raw/first-pass/`.
- [Review registration and source hashes](review-ready.json).

Three initial built-in OpenAI image-generation calls produced the first two atlases and
the targeted correction atlas. A fourth produces Batch 123 after GM review, using the old
primary star and approved drop as design references. The tool does not expose its model
identifier; no CLI/API fallback was used.
The existing atlas processor only separates components, frames glyphs, normalizes white masks
and encodes formats. No symbol was drawn or repaired by code.

## Validation and preparation

All approved PNG/WEBP/SVG masks match, have safe margins and pure-white visible pixels.
The existing validator passes for all 937 review PNG/SVG pairs. Visual inspection covered
64, 32, 24 and 16 px. The plain drop is distinguished by its unbroken silhouette; normalization
fits glyphs to the same safe frame. The GM approved the resulting semantic distinctions.

`accept.py --check` verifies all eleven delivered pairs; `round2.py prepare` intentionally
refuses an existing Batch 123. Revision processing and registration used:

```sh
python dev/icons/placeholder-pass/process.py --batch=123
python dev/icons/m7-status-pass/round2.py register
python dev/icons/review/validate_candidates.py
```

Do not rerun initial `register.py` or revision registration over later human feedback;
their frozen snapshots are preflight guards, not a request to reset the review state.

The [initial HTTP verification](http-validation.json) confirmed ten active cards and
matching candidate hashes before GM review. [Batch 123 verification](../review/candidates/batch-123/http-validation.json)
covered the five revision cards and six new candidates before their final approval.
[Final HTTP verification](final-http-validation.json) confirms all 22 delivered SVG/WEBP
files match the receipt and the review queue has zero active cards.
Initial automated Chrome navigation timed out; no browser-render pass is claimed
for that initial reviewer check and no browser was restarted. The later sandbox renderer
verification above succeeded through the existing `fvtt eval` command.

`prepare.py` freezes a fresh batch and intentionally refuses existing folders.
After copying generated files into the recorded raw paths, processing and registration use:

```sh
python dev/icons/m7-status-pass/process_corrections.py
python dev/icons/placeholder-pass/process.py --batch=121
python dev/icons/placeholder-pass/process.py --batch=122
python dev/icons/m7-status-pass/register.py
python dev/icons/review/validate_candidates.py
```

These operations prepare candidates and review metadata only. They do not install glyphs
or run Foundry builds or regression tests.

Final delivery used `python dev/icons/m7-status-pass/accept.py`, followed by `--check`.
It copies only approved SVG/WEBP bytes, resolves review cards and appends the five final
decisions to the existing receipt. The first-pass receipt is retained separately;
saved feedback is never rewritten. No generator, runtime, pack or world operation is involved.

For the later read-only sandbox renderer check:

```sh
python dev/icons/m7-status-pass/run_live_check.py
```

It passes the approved delivery metadata as structured arguments to `fvtt eval`, rather
than assuming development files are served by Foundry. It retains a PNG renderer capture
and the ten validation results, without retaining an encoded image in JSON.
