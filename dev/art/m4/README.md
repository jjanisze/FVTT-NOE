# M4 vehicle art hand-off

Requests for `PLAN_m4_pojazdy.md` §8 originally covered 14 top-down vehicle tokens, 4 vehicle wrecks,
14 portraits and 7 sounds. Sedan and Hammer portraits with matched closed/interior tokens are delivered,
along with the motorcycle portrait and open token. Review state, prompts and integration:
[Osobówka](OSOBOWKA.md), [Hammer](hammer/README.md), [Motocykl](motocykl/README.md).
Remaining prompts and rules: [BRIEFS_MISSING.md](BRIEFS_MISSING.md);
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
PNG sources in `in/<set>/<key>.png` (`pojazdy`, `wnetrza`, `wraki`, `portrety`); tokens need real alpha,
portraits must be opaque. After a delivery: remove the row from MISSING §P, credit the exact path in
`CREDITS.md`, run `npm run fvtt -- packs --only=pojazdy` so the compendium picks the final file over
the placeholder. Sounds follow the M5 audio pipeline ([AUDIO.md](../m5/AUDIO.md)).

Roof-hidden variants use `tokens/pojazdy/wnetrza/<key>.webp` with exactly the same canvas as the
closed token. Establish an SVG layout first, render the open interior using the portrait for identity,
then add a roof over that established interior. Inspect wheel count and furniture/hatch registration. The builder records a matched pair only when the interior exists; X-ray swaps the
texture locally and the seat selector uses the interior for authorised viewers. Add art-specific seat
positions to `strefyGrafiki` in the vehicle config when needed. The builder applies those positions
when a native vehicle token exists, including open vehicles without a separate interior.
Open motorcycle seats show full rider tokens above the art and do not trigger hover fading.
Do not automatically migrate existing
world vehicles with custom artwork or seat layouts.

Local visual review: open [review.html](review.html). It compares ROOF_ON and the revised ROOF_OFF,
with a roof opacity slider and five optional passenger sprites at their normal half-square size.
The portrait is alongside; no server is required.
