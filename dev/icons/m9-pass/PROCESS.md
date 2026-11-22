# Processing graphics changes

Run the commands below from the module repository. Artwork approval, source installation,
finish review and pack integration are distinct stages; each stage has a concrete output.

**Completed 2026-11-18:** 17 white-master corrections installed, all 782 finishes approved and
exported, sandbox and campaign compendia rebuilt and validated. [Final verification](rollout-verification.json).

1. **Select artwork in the icon reviewer.** Its saved approve decision identifies the exact
   candidate. This is complete for all nine Batch 124 replacements.
2. **Install the approved white masters.** Run `python dev/icons/m9-pass/accept.py --preflight`,
   then `--apply`, then `--check`. The installer validates all three candidate formats,
   verifies the old source hashes, archives the old variants, installs exact SVG/WEBP bytes,
   retires unreferenced legacy PNG sidecars and resolves only the delivered review cards.
   Saved GM decisions remain unchanged. **Complete:** [delivery receipt](reviewed-installed.json).
3. **Rebuild the semantic manifest.** Run `node dev/finish/build-manifest.mjs`.
   The manifest now identifies the new WEBP masters and their hashes. **Complete.**
4. **Choose the missing-family treatments.** Open `m9-process.html` in the graphics reviewer.
   The original proposal is preserved at [style-profile.proposed.json](style-profile.proposed.json).
   The selected treatments are active in approved profile v2. Families:
   creature → generic ground; shared abilities → shared; general devices → tools tint;
   documents → salvage tint. Specific medical/chemical/explosive items retain those roles.
   **Complete:** the GM selected the proposal; profile `noe-m9-r07-v2` is active, and the
   manifest has zero assignment gaps. [Family-choice receipt](family-approval.json).
5. **Review actual finished pixels.** In a shell with the module's Python environment, run
   `npm run build:finish -- --only=icons --all --dry-run --preview`.
   This builds `dev/finish/preview/index.html` for all assigned subjects while leaving planned
   exports uninstalled. **Prepared for all 782 subjects across 22 families**, available under
   **M9 — wykończenia** (`m9-finishes.html`) in the icon browser.
   Judge the whole treatment at 44 px, with 32/24/16 px and grayscale as supporting views.
   The approved white silhouette and the approved finish are separate records.
   **Complete:** the GM approved the set conditional on five requested corrections. Batch 127
   successfully cleaned Neodrugs, Tornado, both Narkotyki glyphs and Cygaro. No crop fallback
   was needed. [Final source/profile/pixel approval](finish-approval.json).
6. **Export the selected finishes.** Record finish selections against source/profile/output
   hashes; `npm run build:finish -- --preview` exports pilot/approved entries.
   `npm run build:finish -- --check` must pass. **Complete:** all 782 approved icon files match
   the approved pixels; the complete finish check covers 787 rasters including five banners.
   `--only=lookup` refreshes just the generated runtime index without raster export.
7. **Rebuild and validate packs.** Use `npm run fvtt -- packs --profile=sandbox` for the sandbox.
   The CLI handles stop/build/validate/start and database locks. Inspect the result in the
   sandbox. Apply the release/campaign build as the rollout step, respecting the current mode.
   Existing world-item path migration is a separate explicit operation with a backup.
   **Complete:** sandbox and campaign builds passed. Live sandbox verification covered all
   1,287 manifest pack bindings and browser decoding of all 782 exports. Creating the five
   corrected items from raw source paths selects chemical item icons and neutral activity
   icons. Custom resource panels now render WEBP with the shared 44 px image component;
   Foundry's `dnd5e-icon` remains for SVG sources. Scratch actors were removed.

Use `.venv/Scripts/python.exe` or set the current shell's `PYTHON` to it when invoking the
finish engine. It has Pillow 12.2.0 / libwebp 1.6.0, matching the existing M9 exports.
Do not re-encode an accepted mask merely to switch formats: install the validated candidate bytes.

Batch 128 closes the poison dot and both remaining firearm cleanup requests. After the image
service rejected its atlas, the GM explicitly approved deterministic speck cleanup. The poison
bottle retains every object pixel and its placement; only the detached 25-pixel speck changed.
The pistol's detached 99-pixel artifact was removed and firearm masks received the existing
safe-margin normalization. [Three-subject approval revision](../review/candidates/batch-128/finish-approval.json)
preserves the original approval and verifies the other 779 subjects are unchanged.
No confirmed M9 artwork requests remain open; no blanket icon regeneration is required.
The authoritative assignment report is generated at `dev/finish/REPORT.md`.

Coding continuation: [HANDOFF_m9_graphics_to_code.md](../../../HANDOFF_m9_graphics_to_code.md).
First apply the current style, packs and existing-document image paths to the Poligon,
without resetting stations. The broader M9 UI rollout/acceptance is still open.

Validation: 12 finish/routing tests, 20 graphics-browser tests and the static suite passed.
The M9 Quench UI suite reports 13/14 tests passing; its PC-sheet test encounters a browser
`ResizeObserver loop completed with undelivered notifications` error and a secondary duplicate
completion error. The separate sandbox check successfully rendered the five corrected
chemical images at 44 × 44 px; its screenshot was attached in the conversation.
