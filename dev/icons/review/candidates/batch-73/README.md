# Batch 73 — nine fresh subjects

Second of the next two nine-cell atlases. These are pending review candidates;
native placeholders remain until the GM approves a selected mask.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Jeden strzał | One cartridge inside a scope reticle |
| 2 | Jeden z nas | Handshake and generic law-enforcement badge |
| 3 | Jeden z nich | Bare arm bearing a generic skull tattoo |
| 4 | Jeździec | Horse and generic rider with hands off the reins |
| 5 | Kakofonia | Generic figure covers ears against harsh sound |
| 6 | Kamuflaż | Ghillie hood, broad leaves and rifle barrel |
| 7 | Kaskader | One car jumping a narrow gap |
| 8 | Kłusownik | Open leg-hold trap and short chain |
| 9 | Kocie kości | One coherent cube die with a cat-paw face |

`batch.json` holds canonical mechanics, generic motifs and exact native SVG
targets/hashes. OpenAI's built-in image tool generates one atlas saved as
`raw/batch-73-atlas-a.png`; `prompts.json` contains the complete exact prompt
set. Every reference cell is style-only. Their source paths and hashes are
recorded in `style-reference.json`.

Final `<key>.png`, `.webp`, `.svg` files are 256×256 pure white masks with 20 px
margins; lossless WEBP and the SVG's embedded WEBP match the PNG exactly.
PNGs and contact sheets are dev-only. After approval, delivery uses the same
native SVG filename and a WEBP sidecar, without runtime wiring.

```sh
python dev/icons/placeholder-pass/process.py --batch=73 --check
node dev/icons/placeholder-pass/register.mjs --batch=73
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Do not rerun historical preparation. No code, compendia or campaign-world
documents are modified by this batch.

Final validation: nine exact masks pass, the full candidate collection passes
with 584 PNG/SVG pairs, and the 18-card combined review page has no broken
images. The previews were inspected at 64/32/24/16 px; no standalone correction
was needed. Combined evidence is in `../../../placeholder-pass/progress-72-73.json`
and `../batch-72/raw/review-preview.png`.

GM review, 2026-10-15: seven exact selections approved and installed. Jeździec
and Kłusownik carry saved anatomy/hinge corrections into Batch 74. Exact
decisions and delivered hashes are in `reviewed.json` / `reviewed-installed.json`.
