# Batch 41 — 2026-10-03

Generator: built-in Codex image_gen. Final atlas: `in/Batch_41.png`.
Pipeline: `python dev/icons/process_grid_41.py` (calls `normalize_icons.normalize_icon`
for each tile and the existing SVG-mask writer). Nine slots in row-major order.
Outputs: `out/batch_41/`, installed to `icons/items/loot/`.

The first transparent attempt was rejected during visual review: speckled background
and thin linework. The selected atlas uses the pipeline's permitted black luma background.

## Final prompt

Create one square atlas of NINE flat white inventory glyphs for a fictional post-apocalyptic tabletop role-playing game. Exactly 3 equally sized rows and 3 columns, pure uniform black background, NO cell dividers. Each icon occupies at most 65 percent of its own cell, centered with generous margins. Visual style: pure solid white silhouettes with very broad black cutouts, minimal DnD 5e / game-icons.net pictograms. No shading, no realism, no textures, no grunge, no speckling, no labels or typography, no fine outlines.
Read left to right, top to bottom:
1. A compact radio remote control for the game's detonator inventory item: square box, short antenna, single covered toggle switch. No speaker or keypad.
2. A corked acid vial inventory glyph with a simple broad droplet emblem and a droplet over an eroded short bar underneath.
3. The game's radio fuze inventory glyph: small receiver box with a stub antenna and two short leads ending in one small tube.
4. The game's electric fuze inventory glyph: simple coil of cable with a small tube on one end and two contacts on the other. No antenna or box.
5. One folded loose schematic note with a torn corner, a broad gear cutout and two simple arrows.
6. A thin spiral-bound schematic instruction booklet with a broad exploded-part symbol on its cover.
7. A bulky schematic documentation binder and two rolled blueprint sheets tied with string.
8. A tiny work-in-progress badge: bold crossed hammer and open-ended wrench, with a thick half-filled progress bar underneath. Must read at 12 px.
9. A broad horizontal portable broadcast radio with carrying handle, diagonal telescopic antenna, circular speaker with broad grille slots and one knob. Not a walkie-talkie.
All items are nonfunctional symbolic pictograms for game UI. Every visible shape must be pure white #ffffff or pure black #000000, with clean edges. White silhouettes, not line drawings. All nine complete symbols in their own cells, without overlap.
