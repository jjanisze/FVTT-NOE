# M5 artwork hand-off

The GM generates and hand-edits the painted artwork. Ready-to-paste English prompts,
crop instructions, purposes and exact source/drop paths are split by delivery status:

- [BRIEFS_MISSING.md](BRIEFS_MISSING.md) — 24 undelivered catalog images.
- [BRIEFS_DELIVERED.md](BRIEFS_DELIVERED.md) — 17 delivered images, retained for reference.

All subjects are generic and suitable for this public repository. After a delivery,
move its full brief to BRIEFS_DELIVERED and remove its row from the asset queue.

Current order: ruins, then wrecks. Older object and companion
requests from MISSING sections B and E follow the M5 briefs. White glyphs use the
separate icon review pipeline; this folder does not generate pictures.

Save an edited PNG to `in/<set>/<key>.png`, using the exact name in its brief.
`catalog.json` records every final path, dimension and alpha requirement. Sources
stay under `dev/` and are not shipped. On 2026-10-12 the seven trader portraits
and three upkeep banners were supplied by the GM and packaged at their final paths.
Portraits are 600×800 RGB WEBP; upkeep banners are 1200×400 RGB WEBP.
`delivered-2026-10-12.json` records source/output hashes and validation results.
The three upkeep sources arrived under `in/handlarze/`; identical copies were placed
under their canonical `in/postoj/` drop paths, preserving the original drops.
Future upkeep edits should use the canonical drop paths recorded in the briefs.
Seven camp banners were packaged from new GM sources on 2026-10-18; hashes and
validation are in `delivered-2026-10-18.json`. The GM approved the subway source
with its existing graffiti retained.

Current prompt direction follows the GM's 2026-10-18 feedback: grounded American
post-apocalyptic survival art, without fantasy styling or Eastern European
visual shorthand. Camps use practical light; looting interiors use cold daylight
and neutral-white flashlights, with no camp staging or cosy amber ambience.
The full constraints are repeated in each missing brief.

```sh
python dev/art/m5/pack.py --list
python dev/art/m5/pack.py
python dev/art/m5/pack.py --asset handlarze/bron
python dev/art/m5/pack.py --check
python dev/art/m5/test_pack.py
python dev/art/m5/record_delivery.py
```

The default command processes only sources that exist; absent sources stay queued.
`--asset` requires its source, and `--check` validates existing final files without
writing. The packer only crops, resizes and converts. It cannot remove a background,
paint shadows, invent detail or fix content. UI pictures require opaque source
pixels; tokens and objects require genuine transparent PNGs. Token frame margins
are preserved, while small map objects are trimmed to their alpha bounds.

After packaging, inspect the finished picture at its intended display size, confirm
the crop and alpha, remove only that delivered row from MISSING, and add this credit
for the exact delivered path in `CREDITS.md`:

> `<final path>` — AI-generated with OpenAI DALL-E, hand-edited by the GM.

Do not credit prompts or undelivered pictures as finished artwork. M5 uses exact
filenames and needs no code repoint, pack rebuild or live world change. Older B/E
assets that need a compendium rebuild or live update go in the
[asset handoff](../../icons/FINAL_HANDOFF.md) for the GM.

`record_delivery.py` validates outputs with present edited sources, records their
provenance/hashes and produces a local `out/delivery-preview.png` contact sheet.
It does not alter source art or final images. Ruins, wrecks and older
object/companion images remain queued until usable edited sources arrive.
