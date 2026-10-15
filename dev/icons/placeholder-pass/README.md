# Native placeholder replacement pass

The 2026-10-15 audit found 155 generated initials SVG files representing 153
class, profession and ability subjects. `roadmap.json` freezes their canonical
mechanics, exact filenames and incoming SHA-256 hashes in 17 groups of nine.
It includes the default/active Berserk pair and the unused legacy active
Kondycha filename, so every detected file is covered once.

Groups provisionally start at Batch 69. Later batch numbers are reservations
only: saved GM revisions take priority and may consume extra batch numbers.
Check MISSING.md and the review manifest before preparing each actual batch.
Do not regenerate the frozen roadmap or historical incoming snapshots after
delivery starts. `plan.mjs` reads an existing roadmap without overwriting it.

Use the established Pipeline.md workflow: one built-in OpenAI 3×3 atlas per
nine subjects, approved glyphs as style references, generic prompts, pure white
silhouettes and broad negative space. Inspect at 64/32/24/16 px. The GM reviews
before any production replacement. Painted art remains a separate GM queue.

```sh
node dev/icons/placeholder-pass/plan.mjs --batch=69
python -m unittest discover -s dev/icons/placeholder-pass -p test_process.py
python dev/icons/placeholder-pass/process.py --batch=69
node dev/icons/placeholder-pass/register.mjs --batch=69
npm run validate:icon-candidates
```

Each actual batch needs its own `batch.json`, exact `prompts.json`, raw atlas,
style-reference image and incoming review snapshot under
`dev/icons/review/candidates/batch-N/`. Preparation is intentionally batch-specific
because the motifs must follow the actual rules and any saved GM feedback.

The processor groups whole foreground components to avoid cutting off an arm
that crosses a cell boundary. It rejects ambiguous fused glyphs. For a visually
verified overhang containing disconnected fingers, record a tightly bounded
`ownershipRegions` box in source pixels in `batch.json`; it reassigns whole
components only. Review the resulting previews before registration. It does
not draw, repair anatomy, add details or change the generated composition.

Candidates are 256×256 white masks with 20 px margins, lossless WEBP and SVG
wrappers embedding that WEBP. PNG references/previews are dev-only. The
registrar verifies candidate and original target hashes, appends nine cards,
archives an independent manifest fragment and preserves saved feedback bytes.

After approval, install the exact selected pixels into every recorded
`deliveryTargets` filename, with WEBP sidecars. Base/active filenames can share
the approved glyph because the existing hotbar already draws an active pulse.
The legacy Kondycha active file is a compatibility target, not a new ability.
No runtime code, compendia or campaign-world changes are needed for this pass.
Only mark a placeholder delivered after the approved files exist and validate.

## Actual allocations

After Batch 69 review, five approved subjects were delivered (six files).
Batch 70 contains the four saved revisions plus five fresh subjects. Batch 71
contains the next nine fresh subjects. Together these consume the first 23
unique subjects of the frozen roadmap; fourteen are fresh in this request.

After Batch 70–71 review, eighteen subjects are delivered at nineteen native
SVG filenames with WEBP sidecars. Batch 72 contains five revisions and four
fresh subjects;
Batch 73 contains the next nine fresh subjects. The first 36 unique roadmap
subjects were allocated at that point.

After Batch 72–73 review, thirty subjects are delivered at thirty-one native
SVG filenames with WEBP sidecars. Batch 74 contains six revisions and three fresh subjects;
Batch 75 contains the next nine fresh subjects. The first 48 unique roadmap
subjects were allocated at that point.

After Batch 74–75 review, thirty-nine subjects are delivered at forty native
SVG filenames with WEBP sidecars. The current audit leaves 114 subjects / 115
placeholder files. Batch 76 contains nine reworks, including one rejected
concept; Batch 77 contains nine fresh subjects. The first 57 unique roadmap
subjects are now allocated; the next untouched subject is at zero-based index
57. Check the actual review manifest before allocating further subjects;
planned batch numbers no longer match these actual groups.

After Batch 76–77 review, fifty-four subjects are delivered at fifty-five native
SVG filenames with WEBP sidecars. The current audit leaves 99 subjects / 100
placeholder files. Batch 78 contains three saved revisions and six fresh
subjects; Batch 79 contains nine fresh subjects. The first 72 unique roadmap
subjects are allocated; the next untouched subject is Renoma at zero-based
index 72. The next free batch number is 80.

After Batch 78–79 review, sixty-five subjects are delivered at sixty-seven native
SVG filenames with WEBP sidecars. The current audit leaves 88 subjects / 88
placeholder files; both legacy active targets have been delivered. Batch 80
contains seven saved revisions and two fresh subjects; Batch 81 contains nine
fresh subjects. The first 83 unique roadmap subjects are allocated; Skuteczny
cios is next at zero-based index 83. The next free batch number is 82.

After Batch 80–81 review, seventy-five subjects are delivered at seventy-seven
native SVG filenames with WEBP sidecars. The current audit leaves 78 subjects /
78 placeholder files. Batch 82 contains eight saved revisions and one fresh
subject; Batch 83 contains nine fresh subjects. The first 93 unique roadmap
subjects are allocated; Strzelec is next at zero-based index 93. The next free
batch number is 84.

After Batch 82–83 review, eighty-six subjects are delivered at eighty-eight
native SVG filenames with WEBP sidecars. The current audit leaves 67 subjects /
67 placeholder files. Batch 84 contains seven saved revisions and two fresh
subjects; Batch 85 contains nine fresh subjects. The first 104 unique roadmap
subjects are allocated; Śmiertelna obelga is next at zero-based index 104.
The next free batch number is 86.

The GM's durable direction is to avoid repeated gruff male survivor portraits:
prefer the actual objects, hands, actions and generic adults, with no anime.
That instruction is also recorded in Pipeline.md.

- [Batch 70 candidates](../review/candidates/batch-70/README.md) and
  [exact prompts](../review/candidates/batch-70/prompts.json).
- [Batch 71 candidates](../review/candidates/batch-71/README.md) and
  [exact prompts](../review/candidates/batch-71/prompts.json).
- [Batch 72 candidates](../review/candidates/batch-72/README.md) and
  [exact prompts](../review/candidates/batch-72/prompts.json).
- [Batch 73 candidates](../review/candidates/batch-73/README.md) and
  [exact prompts](../review/candidates/batch-73/prompts.json).
- [Batch 74 candidates](../review/candidates/batch-74/README.md) and
  [exact prompts](../review/candidates/batch-74/prompts.json).
- [Batch 75 candidates](../review/candidates/batch-75/README.md) and
  [exact prompts](../review/candidates/batch-75/prompts.json).
- [Batch 76 candidates](../review/candidates/batch-76/README.md) and
  [exact prompts](../review/candidates/batch-76/prompts.json).
- [Batch 77 candidates](../review/candidates/batch-77/README.md) and
  [exact prompts](../review/candidates/batch-77/prompts.json).
- [Batch 78 candidates](../review/candidates/batch-78/README.md) and
  [exact prompts](../review/candidates/batch-78/prompts.json).
- [Batch 79 candidates](../review/candidates/batch-79/README.md) and
  [exact prompts](../review/candidates/batch-79/prompts.json).
- [Batch 80 candidates](../review/candidates/batch-80/README.md) and
  [exact prompts](../review/candidates/batch-80/prompts.json).
- [Batch 81 candidates](../review/candidates/batch-81/README.md) and
  [exact prompts](../review/candidates/batch-81/prompts.json).
- [Batch 82 candidates](../review/candidates/batch-82/README.md) and
  [exact prompts](../review/candidates/batch-82/prompts.json).
- [Batch 83 candidates](../review/candidates/batch-83/README.md) and
  [exact prompts](../review/candidates/batch-83/prompts.json).
- [Batch 84 candidates](../review/candidates/batch-84/README.md) and
  [exact prompts](../review/candidates/batch-84/prompts.json).
- [Batch 85 candidates](../review/candidates/batch-85/README.md) and
  [exact prompts](../review/candidates/batch-85/prompts.json).

The numbered `prepare_*.py` files freeze their actual
allocations and
incoming decisions; do not rerun them. `compose_reference.py` only rebuilds
their recorded contact sheets.
`register.test.mjs` checks revision history, unrelated feedback preservation,
idempotence and refusal of a newer GM correction in isolated fixtures.
