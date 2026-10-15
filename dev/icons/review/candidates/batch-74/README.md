# Batch 74 — six revisions and three fresh subjects

First of the next two nine-cell atlases. Twelve Batch 72–73 approvals are
installed. These candidates require a fresh saved GM approval before delivery.

| Cell | Subject | Work |
|---|---|---|
| 1 | Bez tajemnic | Coherent head, neck and shoulders entirely inside the lens |
| 2 | Elektronik | Shackle swings fully outward to the left |
| 3 | Inteligentna obrona | Brain and prediction sequence, composed defender |
| 4 | Jak dbasz, tak masz | Holding index finger outside the trigger opening |
| 5 | Jeździec | Natural seated rider anatomy and relaxed hands |
| 6 | Kłusownik | Functional trap with central axle and pivot hinges |
| 7 | Kolejka | Shared bottle and tin mugs |
| 8 | Kondycha | Generic adult taking a restorative breath |
| 9 | Krwawy anioł | Syringe and broad simplified wings |

`batch.json` preserves canonical rules, exact native targets/hashes and six
verbatim GM decisions with their selected-source hashes under `revisionOf`.
Reference cells 1–6 are those exact selections; 7–9 are style-only examples.
The existing mutant face is retained while its entire bust is composed within
one lens to remove the incompatible separate body below it.

The shackle request is a full outward quarter-turn, with its arch left of the
body and one end engaged. Inteligentna obrona uses a broad prediction sequence
instead of unreadable formula text or an acrobatic dodge. The gun hand keeps
its trigger-guard opening clear. The trap needs a common axle/pivot mechanism.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-74-atlas-a.png`. Exact prompts are in `prompts.json`, reference hashes
in `style-reference.json`; any targeted correction is archived in that prompt
set before normalization. Every motif is generic and public-repo safe.

Final `<key>.png`, `.webp`, `.svg` files are 256×256 pure white masks with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
PNG sources and previews are dev-only. After approval, delivery uses the
existing native SVG filenames and WEBP sidecars without code wiring.

Kondycha has two exact targets: `icons/abilities/kondycha.svg` and the unused
legacy `icons/abilities/kondycha_active.svg`. Both will receive the same approved
pixels. The legacy name is retained for compatibility; it adds no new toggle,
mechanic or runtime wiring. Thus nine candidates cover ten SVG targets.

```sh
python dev/icons/placeholder-pass/process.py --batch=74 --check
node dev/icons/placeholder-pass/register.mjs --batch=74
npm run validate:icon-candidates
```

Registration keeps all old candidates and archives the six old decisions in
`revision-feedback-before.json`, then selects the new pending revisions. Other
saved decisions remain unchanged. Do not rerun historical `prepare_74_75.py`.
No code, compendia or campaign-world state is modified.

Final validation: nine exact masks pass, including both prospective Kondycha
targets; the full review collection has 602 valid PNG/SVG pairs. Contact sheets
were inspected at 64/32/24/16 px. The live gallery shows 18 pending cards, 45
options, all new candidates selected and no broken images. Two isolated
revision-registration tests pass. Combined evidence:
`../../../placeholder-pass/progress-74-75.json` and `raw/review-preview.png`.

GM review, 2026-10-15: five exact selections approved and installed. Elektronik
uses the explicitly selected older Batch 72 glyph, validated against its own
archived source hash. Four requests carry into Batch 76. Decisions and hashes
are in `reviewed.json` / `reviewed-installed.json`.
