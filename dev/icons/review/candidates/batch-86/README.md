# Batch 86 — nine revisions

Nine approvals from the Batch 84–85 review are delivered. This entire atlas
contains the nine saved revisions. All eighteen new candidates across
Batches 86–87 require GM review before delivery.

| Cell | Subject | Saved correction / concept |
|---|---|---|
| 1 | Rzeźnik | Lower knife hand; blade aims toward underarm before contact |
| 2 | Serwisowanie | New concept: CRT television with back removed |
| 3 | Spieprzysz to! | Keep mockery, use natural adult face instead of anime styling |
| 4 | Stylówa | Lower chain to neck level; add baseball cap |
| 5 | Szaleńcza szarża | New concept: charging bull, without running human |
| 6 | Szybkie badanie | Generic detective sprints while inspecting ground through magnifier |
| 7 | Szybkie nogi | Same boots in moonwalk slide stance |
| 8 | Szybkie ręce | Fast-motion strokes and partial contour echoes |
| 9 | Szybkość kota | Broad curved evasion lines around the same cat |

`batch.json` preserves canonical mechanics, exact native filenames/hashes and
all nine verbatim saved decisions under `revisionOf`. Every reference cell is
the exact selected revision source. Serwisowanie references the older Batch 81
selection, as saved by the GM; the new subject replaces it with a television.
Source hashes are in `style-reference.json`. All earlier candidates remain.

The detective uses a generic cap-and-cape archetype; the moonwalk shows boots
and lower legs only. There is no actor or performer likeness. Knife threat
stays before contact, with no wound or gore. Motion uses broad white strokes,
preserving the mask style rather than grey blur or additional complete hands.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-86-atlas-a.png`; exact prompts and any targeted corrections are in
`prompts.json`. PNG sources, contact sheets and candidates remain dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
Delivery after approval retains the native SVG names and adds WEBP sidecars.
All nine production targets remain unchanged during review.

```sh
python dev/icons/placeholder-pass/process.py --batch=86 --check
node dev/icons/placeholder-pass/register.mjs --batch=86
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Registration archives the nine old decisions and retains earlier candidates;
only these nine cards reset to pending with new candidates selected.
No code, packs or world state changes. Do not rerun historical preparation.

Validation: all nine exact masks pass. Two focused generated edits correct
the atlas's missed knife-hand placement and necklace spacing. Their complete
prompts, unchanged opaque references and `raw/standalone-*.png` output paths
are archived in `prompts.json`; normalization records these two sources.
The other seven subjects retain atlas pixels. No overhang or ownership override
was needed. Contact sheets were inspected at 64/32/24/16 px, including both
standalone edits. All 710 candidate pairs validate. The gallery has 18 pending
cards, 50 options, all new candidates selected and no broken images. Evidence:
`raw/review-preview.png` and `../../../placeholder-pass/progress-86-87.json`.

Saved GM review: six approvals installed, including the focused Stylówa
correction. Rzeźnik, Szybkie nogi and Szybkość kota carry exact saved notes
into Batch 88. Decisions are in `reviewed.json`; exact delivered sources and
hashes are in `reviewed-installed.json`.
