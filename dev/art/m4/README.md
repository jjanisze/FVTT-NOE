# M4 vehicle art hand-off

**Poligon, 2026-10-28:** the Garage generator recreates fourteen vehicle-art previews and one wreck comparison, plus Parking (sixteen scenes).
Open its trial card for Parking and **Grafika: Osobówka / Hammer / Motocykl / Ciężarówka / Buggy / Autobus / Traktor / Wóz strażacki / Buldożer / M2 Bradley / M1A1 Abrams / Motorower / Rower / Deskorolka / Wraki — wszystkie pojazdy** buttons.
Fresh previews use catalog sizes and stock dnd5e figures at source scales. Main Parking also
uses delivered artwork. [Navigation and reset](../../poligon/README.md#grafika-pojazdów-w-garażu).
The earlier campaign-character comparisons below are delivery history, not required setup scripts.

Requests for `PLAN_m4_pojazdy.md` §8 now cover 14 top-down vehicle tokens, 14 individual vehicle wrecks,
14 portraits and 7 sounds. Sedan, Hammer, cargo-truck, bus, fire-pumper, Bradley and Abrams portraits with matched closed/interior tokens
are delivered, along with motorcycle, buggy, tractor, bulldozer, moped, bicycle and skateboard portraits/open tokens. All 14 vehicle sets and [14 individual wrecks](wraki/README.md) are on disk. The approved sedan wreck is unchanged; thirteen new wrecks await GM review. Seven sound requests remain. Review state, prompts and integration:
[Osobówka](OSOBOWKA.md), [Hammer](hammer/README.md), [Motocykl](motocykl/README.md), [Ciężarówka](ciezarowka/README.md), [Buggy](buggy/README.md), [Autobus](autobus/README.md), [Traktor](traktor/README.md), [Wóz strażacki](woz-strazacki/README.md), [Buldożer](buldozer/README.md), [M2 Bradley](bwp/README.md), [M1A1 Abrams](czolg/README.md), [Motorower](motorower/README.md), [Rower](rower/README.md), [Deskorolka](deskorolka/README.md).
Remaining prompts and rules: [BRIEFS_MISSING.md](BRIEFS_MISSING.md);
queue rows: [MISSING.md](../../icons/MISSING.md) §P.

`catalog.json` is generated — edit the table in `gen_catalog.py` (sizes, exhaust points, subjects)
and rerun it; the placeholder generator reads the same catalog. If delivered art moves an exhaust pipe, change
the point there **and** `rura` in `scripts/config/vehicles-data.mjs` (`KATALOG_POJAZDOW`) — the smoke reads the latter.

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
The Bradley also supplies lossless hull/turret layers with a measured bearing pivot. The upper
primary mesh follows hull movement/rotation/scale and engine vibration, and hides in X-ray.
The complete image remains the sheet/loading fallback. Independent aiming belongs to post-beta D33;
see [Bradley layers and pivot](bwp/README.md#integracja-i-sprawdzenie).
Abrams uses the same layer renderer, but has a 780×2100 art frame over a 780×1680 hull viewport.
Width fit and anchor 0.5/0.4 preserve the physical hull dimensions while letting the gun overhang
the footprint. The catalog has 53 delivered assets, including fourteen individual wrecks and both tanks' separate hull/turret layers.
Wrecks preserve each native canvas and texture transform; the runtime selects by chassis ID.
Their turrets are baked into the damaged sprite. Full texture backups restore fit, anchors, scale and tint.
Do not automatically migrate existing
world vehicles with custom artwork or seat layouts.

Local visual review: open [review.html](review.html). It compares ROOF_ON and the revised ROOF_OFF,
with a roof opacity slider and five optional passenger sprites at their normal half-square size.
The portrait is alongside; no server is required.
