# Batch 92 — two choices for every primary class

The GM asks for TWO distinct elements within each emblem and TWO candidate
designs per class. One generated comparison image per class supplies twelve
new candidates for the existing six review cards. All older candidates remain
available. No candidate is installed before the GM selects and approves it.

| Class | Option A | Option B | Role covered |
|---|---|---|---|
| Brutal | Bare fist and sledgehammer | Bare torso and tactical knife | Physical force, unarmored toughness and melee |
| Cwaniak | Die and microphone | Playing card and megaphone | Luck and influence over people |
| Spec | Crossed wrench and syringe | Wrench and syringe side by side | Engineering and medicine |
| Twardziel | Aligned armor vest and shotgun | Aligned plate carrier and submachine gun | Defense and firepower |
| Złodziej | Open padlock and tactical dagger | Crowbar and throwing knife | Infiltration and precise attacks |
| Zwiadowca | Compass and scoped rifle | Binoculars and survival knife | Wilderness navigation, observation and hunting |

Research uses the canonical class descriptions, equipment and abilities in
`dev/classes/classes.json`. `references.json` records its exact hash;
`batch.json` records each rationale and its canonical ability names. No
campaign material is used. The existing Twardziel image supplies its approved
concept; both new armor layouts require one continuous aligned vest.

`revision-feedback-before.json` preserves all six verbatim saved decisions.
Cwaniak's approval also asks for a better two-element concept. The explicit
request for two new options reopens that review alongside the other five
classes. All unrelated saved decisions remain unchanged.

OpenAI's built-in image generator produces the six comparison images at
`raw/<class>-pair.png`. Every exact prompt and reference path is archived in
`prompts.json`; `style-reference.json` records reference source hashes.
The first reference supplies style only. Twardziel has a second reference
showing the old concept and the armor offset to correct.

The processor splits the two equal halves, rejects a foreground crossing of
the center gutter, then crops, normalizes and converts. It does not draw or
alter the generated motifs. Every candidate is 256×256 pure white with alpha
and 20 px safe margins. Lossless WEBP and SVG-embedded WEBP match PNG pixels
exactly. PNG references, sources and previews remain dev-only.

Option files are in the sibling folders `batch-92-a/<class>.png` and
`batch-92-b/<class>.png`, with WEBP/SVG counterparts and independent
`validated.json` hash records. The existing approval helper can verify a
selected option's own provenance and deliver the exact native class filename.

```sh
python dev/icons/placeholder-pass/class_options_92.py process
python dev/icons/placeholder-pass/class_options_92.py register
python dev/icons/placeholder-pass/class_options_92.py check
npm run validate:icon-candidates
```

Preparation and registration each run once; neither should be rerun over
newer GM feedback. Inspect `raw/preview.png` and
`raw/inventory-preview.png` at 64/32/24/16 px before registration. Production
SVG/WEBP delivery still requires an explicit saved approval. The other
Batch 90–91 subjects keep their current review state.

Batch 92 supplements the six existing cards; it allocates no new subjects.
The original Batch 90–91 review groups are still awaiting delivery. Once the
class choices are saved, consume those original groups with `accept.py
--batch=90` and `--batch=91`, which resolve selected options through their own
`validated.json` files. Do not deliver Batch 92 as a second overlapping
approval pass. Keep each original group's review and installation record.

Validation: all twelve masks pass exact PNG/WEBP/embedded-WEBP equivalence
and safe-margin checks. Both candidates for every class were inspected at
64/32/24/16 px. All 758 candidate pairs validate, and the existing approval
provenance resolver accepts every new option without production writes
(`delivery-compatibility.json`). No generated correction was needed.

The six class cards appear first, each with A, B and its older candidate.
The gallery has 18 cards and 57 options, with no broken images or browser
errors. Six class decisions are pending; eight unrelated approvals and four
revision requests remain exactly as saved. All 32 native placeholder hashes
are unchanged. Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-92.json`.
