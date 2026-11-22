# M9: graphics closeout and coding continuation — 2026-11-18

The GM asked to close the remaining graphics work and hand M9 back to the coding agent.
**Apply the current M9 style and finished icon set to the Poligon first.** The finished icon
library is implemented; M9 as a whole still has rollout, UI coverage and acceptance work.

## Start here

Read `AGENTS.md`, `PLAN_m9_style.md` (§5.4, §7, §9–10), `AUDIT_m9_ui.md` and
`dev/poligon/README.md`. Run `npm run fvtt -- doctor` to rediscover live state.
The working branch is `m8-ruch-ekonomia`; the working tree contains substantial existing
M8/M9 work. Preserve it. No commit, merge or release was made during this graphics pass.

The public repository must not contain campaign content, personal paths, real hosts/ports
or secrets. All commands below run from the module repository. Lifecycle, reloads, login,
pack rebuilds and tests go through `fvtt`; never kill Chrome or hand-edit LevelDB.

## Finished graphics and runtime integration

- Approved profile: `dev/icons/finish/style-profile.json`, **`noe-m9-r07-v2`**. It keeps the
  existing palette and geometry. Creature/shared abilities use neutral identity grounds;
  devices reuse the tools tint and documents reuse salvage. Explicit medical, chemical and
  explosive roles remain separate; equipment activities use neutral utility glyphs.
- **782 subjects, 22 families, zero assignment gaps**, with the mannequin illustration and
  native scene target frame explicitly outside the glyph recipes. Subject identity is
  **wrapper × family**; the same picture can correctly have several finishes.
- All 782 WEBP finishes exported to `icons/finished/`. The complete finish check covers
  787 rasters including five banners, plus generated tokens/signs/status and runtime data.
- Sandbox and campaign module packs were rebuilt through `fvtt packs` and validated.
  A temporary build covered 19 packs / 1,835 records. Live sandbox verification matched
  **all 1,287 manifest pack bindings**, including embedded actor items/activities, and decoded
  all 782 exported images. No existing campaign-item image-path migration was performed.
- Batch 124 delivered nine approved armour/alcohol/Anestix masks. Batch 127 delivered
  Neodrugs, Tornado, both Narkotyki glyphs and Cygaro after the GM's explicit cleanup request.
  The original full-library approval is immutable at
  `dev/icons/m9-pass/finish-approval.json`; archived reviewed pixels are preserved beside it.
- Final artifact closeout: see `dev/icons/review/candidates/batch-128/`. The GM identified
  the lower-right dot in `chemicals/trucizna`; the other two targets are the already queued
  Beretta B92 and .22 revolver cleanup requests. The built-in image service rejected this
  atlas, returning no image. The GM then explicitly approved the existing Python normalizer.
  **All three are delivered:** the poison's detached 25-pixel dot and pistol's detached
  99-pixel artifact were removed; all other poison pixels/placement are exactly unchanged.
  Firearm masks received the existing safe-margin normalization without redrawing. The
  revised three finish hashes are in that batch's `finish-approval.json`; the other **779**
  subjects are unchanged from the preceding approved snapshot. There are **no remaining
  confirmed M9 artwork requests**. Do not infer approval from a candidate directory or
  manufacture browser feedback.
  `closeout-verification.json` records the final checks: both affected sandbox/campaign packs
  rebuilt, three live compendium images decoded at 128 px, poison-dot region alpha sum **0**,
  zero edge-touching masters and all 782 gallery cards approved. Before/after samples at
  64/44/32/16 px: `dev/icons/review/candidates/batch-128/raw/inventory-preview.webp`.
  Exact attempted prompt: `dev/icons/review/candidates/batch-128/prompts.json`. The built-in
  image tool returned no image; no CLI/API fallback was used. The installed results came
  from the explicitly authorized deterministic Python cleanup.
- Final rollout evidence: `dev/icons/m9-pass/rollout-verification.json`; current instructions:
  `dev/icons/m9-pass/PROCESS.md`; current assignments: generated `dev/finish/REPORT.md`.

Runtime details worth preserving:

- `dev/finish/lib/apply.mjs` uses pack + consumer field + parent/id to bind exports. Embedded
  ids alone are not unique. Do not replace this with a basename or global-path substitution.
- `scripts/config/finished-icons.mjs` resolves unambiguous defaults, explicit families and
  consumer-scoped mappings from generated `finished-icons-data.mjs`. Unknown/custom artwork
  stays unchanged. `preCreateItem` styles new module-owned item/activity images only.
- Physical C4 and its Detonate activity, medyk tools and refill activity, and creature
  Naprawianie versus drone repair must retain their separate equipment/operation/identity roles.
- The two `cygaro` wrappers are distinct: chemical cigar and Fant artwork. Preserve stable
  output ids, including `utility/cygaro--fanty`.
- Foundry's `dnd5e-icon` is **SVG-only**. Custom resource panels now use `inventoryIcon()`
  from `scripts/ui/noe.mjs`: WEBP uses the shared image glyph, vectors keep the native SVG
  component. The five corrected chemical images were shown at **44 × 44 px** on a live
  character sheet; scratch actors were removed. Do not route raster exports back to that
  SVG component.
- The generated lookup file is excluded from source scanning in both manifest builder and
  audit, to prevent generated references feeding back into their own manifest.

## First coding task: bring M9 to the Poligon

The last doctor check found the Poligon stopped, with zero database holders, and its copied
`module.json` **stale**. Linked script/style folders alone do not refresh that manifest or
the Poligon's own packs. This pass did not refresh, launch, reset or reseed the Poligon.
The GM explicitly wants the style applied there.

1. Run `npm run fvtt -- doctor` again. Respect development/runtime mode and connected users;
   do not use `--force` to bypass a human guard.
2. Use `npm run fvtt -- poligon:init` to refresh the linked module, copied `module.json`,
   loader and **Poligon-specific packs**, with validation. `--skip-packs` alone is insufficient
   for this rollout. Inspect the command's settings summary: init also mirrors campaign
   switches into the Poligon. It preserves an existing Poligon world rather than recreating it.
3. Use `npm run fvtt -- poligon:start --seats=3` to open the GM and player seats. For an
   already current installation, `fvtt reload --profile=poligon` is the supported code reload;
   `fvtt packs --profile=poligon` rebuilds that profile's packs.
4. Verify that the new module stylesheet list and all five banner/font assets load. Check PC,
   NPC, item, vehicle and group sheets, resource panels, activity editor and chat in GM/player
   seats; verify dark scope even with the core interface set to light. The core sidebar/chat
   log/hotbar frame remains outside the M9 sheet scope.
5. **Existing Poligon documents retain old image paths.** Rebuilding packs or reloading CSS
   does not update embedded items, their activities or already generated gallery journal HTML.
   Implement a backed-up, dry-run-first, idempotent Poligon image-path refresh. Use original
   pack provenance + document/parent/activity ids and approved manifest bindings where
   available; use explicit semantic family rules otherwise. Preserve custom artwork,
   document/UUID ids, mechanics, ownership, scenes, token positions and saved findings.
   Ambiguous consumers should be reported for review, not guessed by item name.
6. Limit that document refresh to the **Poligon** requested here. Existing campaign document
   migration remains a separate explicit GM instruction. The older
   `dev/icons/apply_live_world_icon_repoints.mjs` is a precedent, not a general M9 migration:
   inspect its mappings before reuse; a global wrapper→output map loses family context.
7. Use existing station **Idź** and probes. Do not reset/reseed Garderoba, Galeria or other
   stations without a specific reset request. Refresh stale gallery content in place with
   a backup and stable journal/page identities rather than silently resetting the station.

Poligon probes already in `dev/poligon/stations/garderoba.mjs`:
`m9-finish-routing`, `m9-karta`, `m9-wiersze`, `m9-wyczerpane`, `m9-ciemny`, `m9-czat`.
Extend the routing probe to include the final poison/firearm corrections. Galeria currently
samples **64/32/16 px**; add the M9 working size **44 px**, a family filter/coverage check,
and examples of the shared glyphs with different semantic finishes. Its old generated
journal does not refresh just because the source file changes.

## Remaining M9 work after the Poligon rollout

- The GM approved missing-family treatments and the full icon finishes. These decisions do
  **not** constitute acceptance of every K1–K18 component, meter palette, banner crop or all
  33 UI families. Do not reopen settled icon colours or regenerate the library wholesale.
- E3 visual acceptance still concerns the sheet's overall composition/art strength and the
  PW/KW meter colours/contrast. Capture the current code in the Poligon for that review.
  Publish `DESIGN.md` from the accepted design contract after the broader E3 acceptance.
- Finish E4 coverage for `PLAN_m9_style.md` §5.4 IDs 01–25 and 28; finish E5 chat/library/HUD
  coverage for IDs 26 and 29–33. The icon-library part of E5 is already delivered. Use the
  33-family audit as the coverage checklist, retaining existing mechanics and permissions.
- E6 still needs the §10 matrix, GM Poligon acceptance, player documentation, release gate
  and current screenshots. Do not label the entire M9 milestone complete because the icon
  pipeline is complete.
- No blanket new icon generation is required for the finished library. Add a new artwork
  request only for an actual new defect or a concrete unmet slot, with a source path and
  inventory-scale evidence. The optional texture family (O3) was unnecessary for the slice.
- Do not rerun the historical one-shot `approve-finish-set.mjs` after Batch 128: it deliberately
  asserts the earlier snapshot. The final three-source revision is applied by
  `approve-artifact-finishes.mjs`; current manifest review bindings point to the applicable
  original or revision receipt. Earlier receipts remain immutable.
- The older §9 progress table still contains historical “488 subjects”, “24 pilot” and
  missing-family/finish-review wording. Reconcile it with the receipts above; those are
  historical planning numbers, not current open graphics tasks.

## Verification and known limits

The graphics closeout passed `npm run test:finish` (12), `npm run test:graphics-review` (20),
`npm test`, `node dev/finish/build-manifest.mjs --check` and `npm run build:finish -- --check`.
The browser showed 782 approved cards with no broken images or horizontal overflow.

`fvtt quench --filter=styl-m9 --profile=sandbox` repeatedly reported **13/14** tests passing:
the PC-sheet/light-interface test receives `ResizeObserver loop completed with undelivered
notifications`, followed by a duplicate-completion error. The plan records this same failure
before the icon changes. Do not suppress it globally or call the whole UI suite green;
diagnose it and rerun in a clean sandbox. The separate live icon rendering check passed.
The earlier layer-6 `boot` run also needs repeating with a viewport at least 768 px high;
its recorded window was only 749 px high. Prior green UI/combat runs are historical evidence,
not substitutes for verifying the final rollout.

For finish commands use the module's Python environment (Pillow 12.2.0 / libwebp 1.6.0):

```powershell
$env:PYTHON = (Resolve-Path '.venv/Scripts/python.exe').Path
node dev/finish/build-manifest.mjs --check
npm run build:finish -- --check
npm run test:finish
```

Never hand-edit `icons/finished/`, generated CSS/SVG, runtime lookup data or pack databases.
Source/profile/recipe/pixel bindings protect the approved set. New source corrections need
a narrowly scoped approval revision and a fresh preview/export/check; preserve earlier
approval receipts instead of rewriting history. `--only=lookup` refreshes just the generated
runtime map. Current graphics browser navigation contains **M9 process**, **M9 finishes** and
the assignment audit; use the runtime-discovered viewer address rather than saving a port.
