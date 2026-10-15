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
