# Batch 99 — Ganger, local wheel repair

Review outcome: the GM requests a different concept whose composition does
not depend on a symmetrical wheel. The exact saved note is archived in
`reviewed.json` and carried into Batch 100. This repair was not installed.

The saved note requests only a lower-right rim and spoke correction. OpenAI's
built-in image tool edits that quadrant of the exact selected Ganger image,
retaining the six-spoke wheel, centered hub, tire and diagonal studded bat.
The upper-right arc supplies the intended circle and rim thickness.

The first edit still left the lower-right crescent solid. A second, tighter
edit restores the black circular channel behind the bat and the exposed
spoke fragment. Both exact prompts and the unsuccessful first output are
retained; only the tighter correction is offered as the new candidate.

Exact prompt: `prompts.json`. Selected-source hashes and verbatim feedback:
`batch.json` and `revision-feedback-before.json`.

Editable generated source: `raw/standalone-ganger.png`. The previous selected
source is `../batch-97/ganger.png`; its opaque copy is `raw/reference-ganger.png`.
For a manual finish, edit the new raw source, then run the commands below.
The standalone source is the actual normalization input. A compatibility
canvas pastes it unchanged into cell 1, leaving all other cells black; no
extra glyphs are generated. Cropping, resizing and format conversion draw
no icon details.

```sh
python dev/icons/placeholder-pass/prepare_98_99.py --compose-ganger
python dev/icons/placeholder-pass/process.py --batch=99
python dev/icons/placeholder-pass/process.py --batch=99 --check
```

The final dev candidate is `ganger.png`: 256×256 pure white with alpha and
20 px safe margins. Its external lossless WEBP and SVG-embedded WEBP match
the PNG pixels. Inspect `raw/preview.png` and `raw/inventory-preview.png` at
64/32/24/16 px. All older choices remain available. Production requires
saved GM approval; no runtime wiring or world writes are needed.

Validation: the mask passes exact PNG/WEBP/embedded-WEBP equality and safe
margins. The corrected circle was inspected at full size and 64/32/24/16 px.
All 797 candidate pairs validate; the review page has no broken images or
browser errors. Evidence: `../batch-98/raw/review-preview.png` and
`../../../placeholder-pass/progress-98-99.json`.
