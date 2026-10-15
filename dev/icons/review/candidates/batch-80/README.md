# Batch 80 — seven revisions and two fresh subjects

Eleven selections from the Batch 78–79 review are delivered. Seven saved
revisions take priority. All eighteen new candidates across Batches 80–81
require GM review before production delivery.

| Cell | Subject | Motif / saved correction |
|---|---|---|
| 1 | Mutant na śniadanie | Non-graphic mutant-head trophy, tongue and pinning knife |
| 2 | Nie do zdarcia | Burly adult calmly tucks abdominal bandages under shirt |
| 3 | Oswajanie zwierząt | Remove horn; broad rounded mutation bulges |
| 4 | Partner | Add the adult's second boot and trouser leg |
| 5 | Pirotechnika | Replace wrench with beaker and pipette |
| 6 | Pistolero | Correct the two crossed pistol shapes |
| 7 | Podstępny atak | Off hand draws cloak aside to uncover dagger hand |
| 8 | Renoma | Formal jacket, tie and pocket square |
| 9 | Reputacja | Trustworthy handshake above a coin |

`batch.json` preserves canonical mechanics, exact native filenames/hashes and
all seven verbatim saved decisions under `revisionOf`. Cells 1–7 in the
reference are the exact selected sources; cells 8–9 are style-only. Hashes are
in `style-reference.json`. Older review candidates remain available.

Nie do zdarcia uses a non-graphic alternative to the saved exposed-organ injury
concept: abdominal bandages tucked under an intact shirt. This adaptation is
explicit in its request and metadata. The mutant trophy is a flat stencil
without blood, neck tissue or realistic wounds. No repeated gruff portrait,
anime, shading or dithering.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-80-atlas-a.png`; the exact prompt and any targeted corrections are
in `prompts.json`. Raw PNGs and review candidates remain dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
After approval, native SVG names receive the selected pixels and WEBP sidecars.
All nine exact production targets remain unchanged during review.

```sh
python dev/icons/placeholder-pass/process.py --batch=80 --check
node dev/icons/placeholder-pass/register.mjs --batch=80
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Registration archives the seven previous decisions and retains all older
candidates; only those seven cards reset to pending with the new candidate
selected. Fresh subjects get two new cards. No code, packs or world state
changes. Do not rerun the historical preparation script.

Validation: nine exact masks pass, with no overhang, ownership override or
targeted correction. Contact sheets were inspected at 64/32/24/16 px. The full
collection has 656 valid PNG/SVG pairs. The gallery has 18 pending cards,
43 options, all new candidates selected and no broken images. Evidence:
`raw/review-preview.png` and `../../../placeholder-pass/progress-80-81.json`.
