# Batch 76 — nine reworks

The saved Batch 74–75 review approved nine subjects, including the older
Elektronik selection. This entire atlas is reserved for eight requested
revisions and the rejected Łeb jak sklep concept. Fresh GM approval is required.

| Cell | Subject | Requested rework |
|---|---|---|
| 1 | Jak dbasz, tak masz | Straight index finger on and extending over the guard |
| 2 | Jeździec | Generic cowboy/showman pose |
| 3 | Kłusownik | Two continuous left/right jaws, hinge and central plate |
| 4 | Kondycha | Just stood up, lowered head and determined eyes |
| 5 | Łapiduch | Patient head with X eyes; compressing hands rotated 90° |
| 6 | Łaska boża | One godly hand and manna falling from heaven |
| 7 | Łeb jak sklep | New concept: industrial bulb and brain filament |
| 8 | Maszyna do zabijania | Seven-skull tally: two crossed-out rows, one remaining skull |
| 9 | Mechanika | Recognizable car-engine silhouette |

`batch.json` retains each exact selected source/hash and the verbatim GM
decision under `revisionOf`; one original decision is `reject`, not approval.
All nine reference cells are those selections. The rejected concept and the
new skull tally are explicitly replaced rather than cosmetically revised.

OpenAI's built-in image tool generates `raw/batch-76-atlas-a.png` from the exact
prompt in `prompts.json`. References and source hashes are in
`style-reference.json`. Any targeted correction is archived before processing.

Final `<key>.png`, `.webp`, `.svg` files are 256×256 pure white masks with 20 px
margins. The lossless WEBP and embedded WEBP in the SVG match PNG pixels exactly.
PNGs, raw sources and previews stay dev-only. Approved production delivery
retains the native SVG filenames and adds WEBP sidecars, without code wiring.

Kondycha covers both `icons/abilities/kondycha.svg` and the unused legacy
`icons/abilities/kondycha_active.svg`; the same approved pixels will replace
both. Retaining that filename adds no toggle or mechanic. Nine candidates thus
cover ten exact SVG targets.

```sh
python dev/icons/placeholder-pass/process.py --batch=76 --check
node dev/icons/placeholder-pass/register.mjs --batch=76
npm run validate:icon-candidates
```

Registration retains the nine existing card IDs and all older candidates,
archives the old decisions in `revision-feedback-before.json`, then selects
the new pending candidates. Other GM decisions are preserved. Do not rerun
historical `prepare_76_77.py`. No code, packs or world state is modified.

Final validation: nine exact PNG/WEBP/embedded-WEBP masks pass, with no targeted
standalone correction needed. The full collection has 620 valid PNG/SVG pairs.
Contact sheets were inspected at 64/32/24/16 px, including the exact seven-skull
tally. The live gallery shows 18 pending cards, 48 options and no failed images.
Combined evidence: `../../../placeholder-pass/progress-76-77.json` and
`raw/review-preview.png`.

Saved GM review: seven approvals installed, including the older Batch 75
Mechanika selection. Kondycha and Maszyna do zabijania carry exact saved notes
into Batch 78. `reviewed.json` preserves all decisions; `reviewed-installed.json`
records the selected source and exact delivered SVG/WEBP hashes.
