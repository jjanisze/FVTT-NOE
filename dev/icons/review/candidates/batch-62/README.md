# Batch 62 — M5 action and Fanty glyphs

Seventeen candidates in two generated 3×3 atlases; Atlas B's last cell is blank.
The first atlas prioritises Handel and Doba, the other three M5 actions, the
machine-off status, the carried EMP emitter, and two Fanty groups. Atlas B
completes the eight remaining Fanty groups. All prompts are generic.

Exact built-in OpenAI image-generation prompts: `prompts.json`. Raw images and
normalized candidates stay locally under this folder, following the review
queue's existing gitignore rules. Production destinations are in `glyphs.json`.
No candidates are approved or installed by this batch.

```sh
python dev/icons/review/candidates/batch-62/process_batch.py
python dev/icons/review/candidates/batch-62/build_review.py
npm run validate:icon-candidates
npm run review:icons
```

Review `raw/inventory-preview.png` at 64/32/24/16 px, then save GM decisions in
the usual review page. The importer appends new cards and leaves every existing
batch and all feedback untouched. Re-running it does not reset decisions.

PNG files are development review previews. If approved, install the theme-aware
SVG and WEBP pair at the exact requested stem; the SVG embeds a WEBP mask, so no
new shipped PNG raster is needed. M5 actions/Fanty need no code repoint. The EMP
and machine-off status remain "Do podpięcia" for the GM if a pack rebuild or live
repoint is necessary. Do not run live icon migrations in this shared session.
