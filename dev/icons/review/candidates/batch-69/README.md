# Batch 69 — nine native placeholder replacements

First group from the newly audited 153-subject / 155-file class and profession
backlog. The prior 342 review cards are resolved. These nine new candidates
await GM review; no production placeholders have been replaced by this batch.

| Cell | Subject | Exact SVG target under `icons/abilities/` |
|---|---|---|
| 1 | A co mi tam! | `a-co-mi-tam.svg` |
| 2 | Amen | `amen.svg` |
| 3 | Berserk | `berserk.svg`, `berserk_active.svg` |
| 4 | Bez tajemnic | `bez-tajemnic.svg` |
| 5 | Bezlitosny przywódca | `bezlitosny-przywodca.svg` |
| 6 | Brutalny cios | `brutalny-cios.svg` |
| 7 | Bystrzacha | `bystrzacha.svg` |
| 8 | Cichy krok | `cichy-krok.svg` |
| 9 | Clint | `clint.svg` |

The exact built-in OpenAI prompt is archived in `prompts.json`. The approved
glyph contact sheet in `raw/style-reference.png` is a style reference only.
`style-reference.json` records its source files. The generated atlas is saved
as `raw/batch-69-atlas-a.png`; no standalone revisions were needed.

`batch.json` contains canonical rule context, generic motifs, target hashes and
one explicit extraction ownership region. The leader's pointing hand and
disconnected thumb cross the nominal boundary into cell 6. Whole-component
extraction retains those original pixels in cell 5 and removes their fragments
from cell 6. `normalization.json` records the recovered overhang. No generated
anatomy or composition is manually redrawn.

Final candidates are `<key>.png`, `<key>.webp` and `<key>.svg`, all 256×256 pure
white masks with 20 px margins. Lossless WEBP pixels match the PNG exactly;
SVG wrappers embed that WEBP. PNGs and raw images remain dev-only. Delivery
after approval ships WEBP/SVG pairs at the original filenames. Both Berserk
targets share approved pixels; the existing hotbar supplies the active pulse.

```sh
python dev/icons/placeholder-pass/process.py --batch=69 --check
node dev/icons/placeholder-pass/register.mjs --batch=69
npm run validate:icon-candidates
```

The candidates and `raw/preview.png` / `raw/inventory-preview.png` were inspected
at 64/32/24/16 px. All nine exact PNG/WEBP/embedded-WEBP masks pass the batch
checks; the complete review collection passes with 548 PNG/SVG pairs. Four
extraction regressions cover overhanging arms, detached fingers and ambiguous
fused or evenly split shapes. `incoming.json` and `references.json` preserve
the review state and all ten original target hashes. Do not rerun preparation.

The registrar appends nine pending cards and preserves all saved feedback.
Its independent archive is `manifest-items.json`. No code, pack rebuild, live
repoint or campaign-world write is part of this batch.

GM review, 2026-10-15: five subjects approved and delivered at six exact SVG
filenames with WEBP sidecars (Berserk base/active, Bezlitosny przywódca,
Brutalny cios, Bystrzacha, Cichy krok). Four revisions retain verbatim feedback
in `reviewed.json` and enter Batch 70. `reviewed-installed.json` records hashes;
verify with `python dev/icons/placeholder-pass/accept.py --batch=69 --check`.
The refreshed source audit finds 149 placeholder files / 148 remaining subjects.
