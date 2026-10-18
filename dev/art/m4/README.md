# M4 vehicle art hand-off

Requests for `PLAN_m4_pojazdy.md` §8: 14 top-down vehicle tokens, 4 vehicle wrecks, 14 portraits and
7 sounds. Prompts and the vehicle-specific token rules: [BRIEFS_MISSING.md](BRIEFS_MISSING.md);
queue rows: [MISSING.md](../../icons/MISSING.md) §P.

`catalog.json` is generated — edit the table in `gen_catalog.py` (sizes, exhaust points, subjects)
and rerun it; the placeholder generator reads the same catalog.

```sh
python dev/art/m4/gen_catalog.py            # table -> catalog.json
python dev/icons/gen_vehicle_placeholders.py  # catalog -> tokens/pojazdy/_placeholder/
python dev/art/m4/pack.py --list            # drop paths -> final paths
python dev/art/m4/pack.py                   # package every present drop
python dev/art/m4/pack.py --check           # validate final files
```

`pack.py` is the M5 packer pointed at this folder (crop, resize, convert — it never paints). Drops are
GM-edited PNGs in `in/<set>/<key>.png` (`pojazdy`, `wraki`, `portrety`); tokens need real alpha,
portraits must be opaque. After a delivery: remove the row from MISSING §P, credit the exact path in
`CREDITS.md`, run `npm run fvtt -- packs --only=pojazdy` so the compendium picks the final file over
the placeholder. Sounds follow the M5 audio pipeline ([AUDIO.md](../m5/AUDIO.md)).
