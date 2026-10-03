# Introduction
This file describes how to get more, appropriate icons for the Neuroshima Overrides module. 

# Pipeline
1. **Preparation**: Chrome MCP can be utilized to automate scraping, browsing Midjourney/DALL-E UI, or interacting with image generation endpoints via a web interface.
2. **Generation**: Supply Gemini Pro (or other image generation models) with prompt and reference files. Save output to `in/`.
3. **Validation & Normalization**: Run `normalize_icons.py` to automatically crop, resize, and convert the downloaded images to the standard format.
4. **Finalization**: Images end up in `out/` ready to be copied to the module's `icons` directory.

## Codex / built-in image generation

Use the built-in image generator for a single 3×3 atlas of the nine queued
subjects. Inspect the existing reference and shipped icons before generation.
Require explicit row-major order, equal cells, generous margins, and broad
negative-space details; review at inventory size before installing.

The atlas is the default for two practical reasons confirmed by the GM: one
generation call is proportionate to nine simple assets, and the smaller cell
budget naturally suppresses the fine detail that disappears in Foundry. Treat
that size pressure as part of the art direction, not merely an optimization.
Generate an item separately only for a targeted revision, an isolated replacement,
or a subject whose silhouette failed in the atlas. A separately generated icon
gets extra scrutiny at 16 px because large canvases encourage excess detail.

Copy the selected generated file into `in/` before running the pipeline.
Transparent alpha is preferred; a clean solid black background is also supported
by the normalization step. Reject speckled or distressed backgrounds.

Batch 41: `in/Batch_41.png` → `python dev/icons/process_grid_41.py`.
The batch script splits the atlas first, calls `normalize_icons.normalize_icon`
on each tile, and writes `out/batch_41/` plus the installed PNG + theme-aware SVG
masks in `icons/items/loot/`. Do not normalize the whole atlas as a single icon.
Exact prompt and provenance: `batch_41_prompt.md`.

Batch 42 was generated as nine individual candidates before the atlas rationale
was reaffirmed. Keep those candidates for the current review; do not repeat that
strategy for a full batch unless the GM's feedback calls for individual revisions.

Repoint item builders and existing items. When Foundry is running, use its live
document API; never replace its open LevelDB files. A pack build can be verified
separately with `build-packs.mjs --out=<staging directory>` and
`validate-packs.mjs --out=<same directory>`.

## GM review before integration

Generated replacements and future batches go through the local review queue:

```powershell
npm run review:icons
```

Open the address `npm run review:icons` prints. The page presents the item context, current
asset, every candidate, and 64/32/16 px views. The GM selects a candidate and
saves an approve/revise/reject decision with notes. Feedback is persisted in
`review/feedback.json` with a recovery copy. An approval is input to the next
pipeline step; the review server never changes a shipped asset.

Queue metadata is in `review/manifest.json`; exact prompts and raw candidates
stay beside their normalized candidates. See `review/README.md`.

# Prompt
Use the following structured prompt for generation:
- Reference Image Instructions: "I have attached `reference_weapon.svg`. Use this image strictly as a style and format reference. Notice that it is a flat, single-color silhouette with no gradients, shading, or complex internal details. Do not recreate the sword, just match its exact level of simplicity, style, and contrast for the new items."
- Output: Pure solid White silhouette on a **transparent** background (or solid black background, which we will later use as a luma mask to create transparency).
- Colors: **White only** (hex #ffffff). Absolutely no other colors, no shading, no gradients.
- Style: Minimalistic flat vector icon, exact same style as the DnD 5e interface icons.
  Serious, utilitarian post-apocalyptic motif; solid single-path look. Favor large
  functional silhouettes and restrained stencil-like technical marks.
- Tone guardrail (GM feedback, 2026-10-03): avoid oversized generic cogs, playful
  double-headed arrows, toy-like exploded stacks and other cartoon shorthand.
  Show the actual object or a sober functional diagram whenever it remains legible.
- Readability gate: inspect every candidate at 64, 32 and 16 px. Fine detail that
  only works in the source image does not count as successful icon detail.
- Contents: Input text, e.g. "Revolver", "Semi-automatic pistol", "Short Automatic Weapon", "Medium Automatic Weapon", "Long Automatic Weapon", "Support Weapon", "Scoped Long Weapon", "Special", "Shotgun", "Lever-action".

Prompt with reference file(s) should be executed, and raw results placed into `in/`.

# Normalization Script
The `normalize_icons.py` script performs:
- **Ratio Validation**: Checks if the image is square 1:1. If not, it crops to the center.
- **Image Size**: Resizes everything to a standard `256x256`.
- **Background Details**: Converts to RGBA to support transparency.
- **File Size**: Saves as an optimized PNG.
