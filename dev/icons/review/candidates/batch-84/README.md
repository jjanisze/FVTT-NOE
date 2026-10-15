# Batch 84 — seven revisions and two fresh subjects

Eleven selections from the Batch 82–83 review are delivered. Seven saved
revisions take priority. All eighteen new candidates across Batches 84–85
require GM review before production delivery.

| Cell | Subject | Motif / saved correction |
|---|---|---|
| 1 | Rzeźnik | Knife in lower hand; threatened, angry expression |
| 2 | Serwisowanie | Another coherent radio with underside service hatch |
| 3 | Slang | Shared speech bubble with fictional skull and broken-link symbols |
| 4 | Sokole oko | Restore the lower beak |
| 5 | Solówa | Left figure points at opponent |
| 6 | Specjalizacja — Spec | Straight simplified caliper and screwdriver |
| 7 | Spieprzysz to! | Sneering mockery; no dice |
| 8 | Strzelec | Scoped rifle at a prepared sandbag-and-bipod position |
| 9 | Stylówa | Sunglasses and heavy necklace |

`batch.json` preserves canonical mechanics, exact native filenames/hashes and
all seven verbatim saved decisions under `revisionOf`. Reference cells 1–7
are those selected sources; cells 8–9 are style-only. Source hashes are in
`style-reference.json`. Earlier candidates remain available.

The knife threat stays before contact, without injury or gore. Street symbols
are fictional generic motifs without real gang insignia or readable text.
The mockery concept replaces the die entirely. Adults have natural proportions
and sparse expressions, with no repeated gruff portrait or anime styling.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-84-atlas-a.png`; exact prompts and any targeted corrections are in
`prompts.json`. PNG sources, contact sheets and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
After approval, native SVG names receive the selected pixels and WEBP sidecars.
All nine production targets remain unchanged during review.

```sh
python dev/icons/placeholder-pass/process.py --batch=84 --check
node dev/icons/placeholder-pass/register.mjs --batch=84
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Registration archives the seven old decisions and retains earlier candidates;
only those seven cards reset to pending with the new candidate selected.
Two fresh subjects get new cards. No code, packs or world state changes.
Do not rerun the historical preparation script.

Validation: nine exact masks pass; no overhang, ownership override or targeted
generation correction was needed. Contact sheets were inspected at
64/32/24/16 px. The complete collection has 692 valid PNG/SVG pairs. The gallery
has 18 pending cards, 45 options, all new candidates selected and no broken
images. Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-84-85.json`.

Saved GM review: five approvals installed. Rzeźnik, Serwisowanie, Spieprzysz
to! and Stylówa carry their exact saved notes into Batch 86. Serwisowanie's
selected source is the older Batch 81 candidate, retained with its own hash.
Decisions are in `reviewed.json`; deliveries are in `reviewed-installed.json`.
