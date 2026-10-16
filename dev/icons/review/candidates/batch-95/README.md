# Batch 95 — the last nine fresh placeholder subjects

| Cell | Profession | Motif |
|---|---|---|
| 1 | Medyk | Field medical bag and stethoscope |
| 2 | Monter | Wrench and engine piston |
| 3 | Najemnik | Blank dog tags and combat knife |
| 4 | Sędzia | Law badge and handcuffs |
| 5 | Szczur | Low crouching rat and chemical vial |
| 6 | Wojownik Autostrady | Steering wheel and sawed-off shotgun |
| 7 | Zabójca | Suppressed scoped rifle and reticle |
| 8 | Zabójca Maszyn | Robot head and electromagnetic lightning |
| 9 | Żołnierz | Field helmet and assault rifle |

All reference cells supply style only. Profession choices follow their
canonical proficiencies and abilities in `dev/classes/professions.json`;
names and the source hash are retained in batch metadata. No campaign
material is used. These complete first-generation coverage of all 153
original placeholder subjects; saved revisions may require later batches.

OpenAI's built-in image tool generates `raw/batch-95-atlas-a.png`.
Every exact prompt is in `prompts.json`. Final PNG/WEBP/SVG candidates are
256×256 white masks with alpha and 20 px safe margins; external and embedded
lossless WEBP match PNG pixels exactly. Raw sources and previews stay dev-only.

```sh
python dev/icons/placeholder-pass/process.py --batch=95 --check
node dev/icons/placeholder-pass/register.mjs --batch=95
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Nine new cards preserve existing decisions. No production file changes
before the GM approves a selected candidate.

Validation: nine exact masks pass, all from atlas pixels. Contact sheets
were inspected at 64/32/24/16 px. All 784 candidate pairs validate. The
gallery covers the last 22 placeholders with no broken images or browser
errors; none await their first generation. Evidence:
`../batch-93/raw/review-preview.png` and
`../../../placeholder-pass/progress-93-95.json`.
Whole-component splitting preserves 50 source pixels of the robot/lightning
overhang. Only tiny normalization fragments were removed (ten pixels from
Zabójca and two from Zabójca Maszyn); no ownership override was needed.
