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

Copy the selected generated file into `in/` before running the pipeline.
Transparent alpha is preferred; a clean solid black background is also supported
by the normalization step. Reject speckled or distressed backgrounds.

Batch 41: `in/Batch_41.png` → `python dev/icons/process_grid_41.py`.
The batch script splits the atlas first, calls `normalize_icons.normalize_icon`
on each tile, and writes `out/batch_41/` plus the installed PNG + theme-aware SVG
masks in `icons/items/loot/`. Do not normalize the whole atlas as a single icon.
Exact prompt and provenance: `batch_41_prompt.md`.

Repoint item builders and existing items. When Foundry is running, use its live
document API; never replace its open LevelDB files. A pack build can be verified
separately with `build-packs.mjs --out=<staging directory>` and
`validate-packs.mjs --out=<same directory>`.

# Prompt
Use the following structured prompt for generation:
- Reference Image Instructions: "I have attached `reference_weapon.svg`. Use this image strictly as a style and format reference. Notice that it is a flat, single-color silhouette with no gradients, shading, or complex internal details. Do not recreate the sword, just match its exact level of simplicity, style, and contrast for the new items."
- Output: Pure solid White silhouette on a **transparent** background (or solid black background, which we will later use as a luma mask to create transparency).
- Colors: **White only** (hex #ffffff). Absolutely no other colors, no shading, no gradients.
- Style: Minimalistic flat vector icon, exact same style as the DnD 5e interface icons. Post-apocalyptic motif, solid single-path look.
- Contents: Input text, e.g. "Revolver", "Semi-automatic pistol", "Short Automatic Weapon", "Medium Automatic Weapon", "Long Automatic Weapon", "Support Weapon", "Scoped Long Weapon", "Special", "Shotgun", "Lever-action".

Prompt with reference file(s) should be executed, and raw results placed into `in/`.

# Normalization Script
The `normalize_icons.py` script performs:
- **Ratio Validation**: Checks if the image is square 1:1. If not, it crops to the center.
- **Image Size**: Resizes everything to a standard `256x256`.
- **Background Details**: Converts to RGBA to support transparency.
- **File Size**: Saves as an optimized PNG.
