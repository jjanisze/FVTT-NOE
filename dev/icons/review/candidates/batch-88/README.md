# Batch 88 — four revisions and five fresh subjects

Fourteen selections from the Batch 86–87 review are delivered. Four saved
revisions take priority. All eighteen new candidates across Batches 88–89
require GM review before delivery.

| Cell | Subject | Saved correction / motif |
|---|---|---|
| 1 | Rzeźnik | Knife below underarm at lower ribs; afraid expression |
| 2 | Szybkie nogi | Swap boots and cross lower legs in moonwalk stance |
| 3 | Szybkość kota | Ducking lines at head; remove rear motion arcs |
| 4 | Trajektoria | Apex bullet, solid approach, dashed descent, retained bullseye |
| 5 | Ulubiona broń — Zwiadowca | Scoped rifle with the established favorite badge |
| 6 | W czuły punkt | Training torso, target and blunt pointer |
| 7 | Wściekły cios | Fist splits a stone block |
| 8 | Wyczulone zmysły | Natural eye, ear and sensory waves |
| 9 | Wyjadacz — Zwiadowca | Veteran patch: compass and three chevrons |

`batch.json` preserves canonical mechanics, exact native filenames/hashes and
the four verbatim saved decisions under `revisionOf`. Reference cells 1–4
are their selected sources; cells 5–9 are style-only. Reference cell 5 gives
the approved favorite-badge family. Source hashes are in `style-reference.json`.
All older candidates remain available.

Knife threat stays before contact, with no wound or gore. The foot revision
uses only generic boots and lower legs. Cat motion belongs at the head and
shoulders, keeping the rear half clear. The trajectory is an unlabelled symbol,
without real measurements. Adults and sensory symbols have natural proportions.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-88-atlas-a.png`; exact prompts and any targeted corrections are in
`prompts.json`. PNG sources, contact sheets and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
After approval, native SVG names receive the selected pixels and WEBP sidecars.
All nine production targets remain unchanged in review.

```sh
python dev/icons/placeholder-pass/process.py --batch=88 --check
node dev/icons/placeholder-pass/register.mjs --batch=88
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Registration archives four old decisions and retains earlier candidates;
only these four cards reset to pending with the new candidate selected.
Five fresh subjects get new cards. No code, packs or world state changes.
Do not rerun historical preparation.

Validation: nine exact masks pass. One focused generated edit fixes the
atlas's crossed-boots orientation, with the flat boot on the right and both
toes facing right. Its full prompt, opaque reference and
`raw/standalone-szybkie-nogi.png` output are archived in `prompts.json`;
normalization records that source. The other eight subjects retain atlas
pixels. No overhang or ownership override was needed. Contact sheets were
inspected at 64/32/24/16 px. All 728 candidate pairs validate. The gallery has
18 pending cards, 45 options, all new candidates selected and no broken images.
Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-88-89.json`.

Saved GM review: seven approvals installed. Szybkie nogi and Trajektoria
carry exact motion-line and trajectory-endpoint requests into Batch 90.
`reviewed.json` preserves every decision; `reviewed-installed.json` records
selected sources and delivered hashes.
