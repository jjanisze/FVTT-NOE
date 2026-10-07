# Batch 42 generation provenance

Generated with the Codex built-in image generator on 2026-10-03. Each asset was
generated independently with `transparent_background: true` and the accepted
`dev/icons/out/machete.png` as the style reference. Raw outputs are preserved in
`raw/`; `prepare_candidate.py` produced the review PNG and theme-aware SVG files.

This batch is an exception to the preferred 3×3-atlas workflow. GM feedback after
generation reaffirmed that an atlas is both more efficient and useful as a
low-detail constraint. Future full batches use one atlas; individual calls are
reserved for revisions and isolated replacements.

Shared constraints: one centered object, pure-white flat silhouette, transparent
background, broad readable details, safe margins, serious utilitarian
post-apocalyptic tone, readable at 16–32 px, and no text, frame, scenery, cast
shadow, gray, gradients, or color.

| Asset | Subject-specific prompt | Raw generator output |
|---|---|---|
| `maczuga` | Crude wooden club with a thick knotted head and three or four short nails; clearly different from a baseball bat and metal pipe. | `exec-ce9c1fd7-2c84-46cf-a956-e2fa91630c69.png` |
| `palka_policyjna` | Compact police side-handle baton with one perpendicular grip; must read as duty equipment rather than pipe, club, cross, or sword. | `exec-cad822a5-0a77-4bbf-b0a9-c659a8ddd4bd.png` |
| `kamienny_noz` | Broad chipped knapped-flint blade lashed to a short bone or wood handle; primitive rather than a modern combat knife. | `exec-90dfb9e5-71cb-4b3d-bc7b-f05e1cbe49b4.png` |
| `sztylet` | Narrow homemade double-edged spear-point dagger, small straight crossguard, rag-wrapped grip; thinner than a combat knife. | `exec-651bad10-5bc1-4122-ab28-31eab31bab47.png` |
| `mlotek` | Ordinary worn carpenter's claw hammer with realistic tool proportions; not a warhammer. | `exec-709a7c1e-6f1e-48fc-9b9f-52477278e095.png` |
| `agregat` | Rugged portable gasoline generator with exposed engine, tubular carry frame, top fuel tank, pull-start housing, and outlet panel; no lightning symbol. | `exec-77da413a-2d11-4308-9fda-30a9693af6cb.png` |
| `akumulator` | Salvaged 24-volt lead-acid vehicle battery, low rectangular case, two terminals, carry handle, battered corners; no lightning symbol. | `exec-c5072c35-ff3f-465e-ae41-c85610794f29.png` |
| `alternator` | Automotive alternator with grooved belt pulley, ribbed and vented cylindrical housing, mounting lugs, and terminal; no detached cog symbol. | `exec-4424bdbd-5893-4b0e-b904-6feea68c20a0.png` |
| `defibrylator` | Rugged portable manual defibrillator case with handle, two clipped paddles, and coiled leads; no cartoon heart or oversized lightning bolt. | `exec-ab9d5760-2b89-4a1e-88d2-1fdcebbc8d04.png` |

## Revision atlas B

Generated after GM review as one 2×2 atlas, row-major: Maczuga, Kamienny nóż,
Akumulator, Defibrylator. The prompt explicitly removed fine contour work and
textures, limited each subject to its differentiating shapes, and required
readability at 16–32 px. Raw atlas:
`raw/revision-b-atlas.png`; exact split cells remain under
`raw/revision-b-cells/`. Generator output:
`exec-bd5ef3d7-86a6-452d-96ad-792bd8f2907d.png`.
