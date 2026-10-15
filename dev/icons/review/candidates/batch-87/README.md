# Batch 87 — nine fresh subjects

Second of the two nine-cell atlases. All nine candidates require GM review;
native placeholders remain until a selected candidate is approved.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Śmiertelna obelga | Insult hand and skull speech bubble |
| 2 | Tarcza wiary | Praying hands within a shield outline |
| 3 | Trajektoria | Bullet follows curved path to a target |
| 4 | Trening w zbroi | Armored adult does a push-up with anvil load |
| 5 | Truciciel | Poison vial, dagger and chemical drop |
| 6 | Trzeci atak | Three consecutive fists |
| 7 | Twardość | Intact heart and horseshoe |
| 8 | Ulubiona broń — Twardziel | Revolver with favorite badge |
| 9 | Ulubiona broń — Złodziej | Tactical knife with matching favorite badge |

`batch.json` records canonical mechanics, generic motifs and exact native
delivery targets/hashes. Reference cells are style-only; cell 1 also provides
the established Obelga gesture. Source hashes are in `style-reference.json`.
The favorite-weapon variants share one simple circular star badge, with the
weapon changed. A future Zwiadowca variant can retain this family treatment.
Three fists extend the existing two-punch family without numerals or dice.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-87-atlas-a.png`. `prompts.json` archives the exact prompt and any
targeted corrections. PNG sources, contact sheets and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
Delivery after approval retains native SVG names and adds WEBP sidecars,
without runtime wiring. All nine production targets stay unchanged in review.

```sh
python dev/icons/placeholder-pass/process.py --batch=87 --check
node dev/icons/placeholder-pass/register.mjs --batch=87
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
No code, compendia or campaign-world documents change. Do not rerun historical
preparation.

Validation: all nine exact masks pass; no overhang, ownership override or
targeted generation correction was needed. Contact sheets were inspected at
64/32/24/16 px, including the matching favorite-weapon badges. All 710 candidate
pairs validate. The combined gallery has 18 pending cards, 50 options and no
broken images, with all new candidates selected. Evidence:
`../batch-86/raw/review-preview.png` and
`../../../placeholder-pass/progress-86-87.json`.
