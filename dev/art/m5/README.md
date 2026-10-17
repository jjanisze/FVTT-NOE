# M5 artwork hand-off

The GM generates and hand-edits the painted artwork. Ready-to-paste English prompts,
crop diagrams in numbers, purposes and exact source/drop paths are in [BRIEFS.md](BRIEFS.md).
All subjects are generic and suitable for this public repository.

Order: traders and upkeep, camps, ruins, then wrecks. Older object and companion
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
It does not alter source art or final images. Camps, ruins, wrecks and the older
object/companion images remain queued until their edited sources arrive.
