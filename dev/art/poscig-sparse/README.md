# Sparse foreground and intact urban backgrounds

Eight original images generated with OpenAI's built-in image tool on 2026-10-20.
`prompts.json` records every prompt and reference role; selected PNG sources are preserved
in `in/`. Final WEBPs and manifests live under `ui/poscig/themes/`:

- `zima/winter-street-props.webp`: streetlight, direction signs, traffic lights and damaged sign.
- `przedmiescia/skyline-{suburb,mall,commercial,city}-v3.webp`: complete district silhouettes.
- `przedmiescia/sky-ash-v3.webp`: empty common sky and terrain loop.
- `przedmiescia/large-ruins-v3.webp`: four hollow near-camera ruined building frames.
- `pustynia/desert-buildings-v3.webp`: garage, shack, gas canopy and motel facade.

The editable catalogs stay in `dev/art/poscig-{winter,urban,nevada}/catalog.json`.
`update_catalogs.py` records the metadata revision and is idempotent. Package selected
new sources with the existing packer; it only converts formats and records alpha bounds:

```sh
python dev/art/poscig-sparse/update_catalogs.py
python dev/art/poscig-nevada/pack-variety.py --catalog dev/art/poscig-winter/catalog.json --source-dir dev/art/poscig-sparse/in --dest ui/poscig/themes/zima
python dev/art/poscig-nevada/pack-variety.py --catalog dev/art/poscig-urban/catalog.json --source-dir dev/art/poscig-sparse/in --dest ui/poscig/themes/przedmiescia
python dev/art/poscig-nevada/pack-variety.py --catalog dev/art/poscig-nevada/catalog.json --source-dir dev/art/poscig-sparse/in --dest ui/poscig/themes/pustynia
```

Omit `--source-dir` for metadata-only rebuilds without another image encoding pass.

## Foreground density

Small objects and rare buildings use separate route streams. Winter's regular structure
stream now contains the four small oblique props; its eight existing large ruins move to
the rare-building stream. Vegetation remains on the farther foreground plane.

| Theme | Large-building stride | Road-speed multiplier | Eligible slots | Downward Y offset | Mean interval at tempo 2 |
|---|---:|---:|---:|---:|---:|
| Nuclear Winter | 24,000 | 2.9 | 65% | 160-480 px | 24.5 s |
| Ruins of America | 26,000 | 2.6 | 65% | 170-470 px | 29.6 s |
| Nevada | 36,000 | 2.5 | 65% | 160-430 px | 42.6 s |

Intervals describe a long route at tempo 2; individual gaps vary. Lower Y positions reduce
occlusion while preserving object scale. Bottom UVs are cropped at the panel border, so no
ruin extends into the free zone. Choices and depth offsets depend on scene and route slot,
and remain stable after recentering or a renderer rebuild. Sparse empty slots do not load
unneeded building textures. Darkening and blur still distinguish near scenery from vehicles.

## Urban background composition

Ruins of America now uses the same complete-alpha-silhouette method as winter, documented
in `../poscig-winter/BACKGROUNDS.md`. Roofs and outer walls never crossfade into nothing.
Only the empty shared sky/terrain base blends across its own wrap. Opaque rubble and weeds
retain the authored irregular road shoulder; no vertical gradient joins it to the background.
The four former rectangular district plates are replaced in the shipped catalog.

## Review and validation

`npm test` checks density, Y variety, stable route seeks, background metadata and cache limits.
The live `nevada-art`, `urban-art` and `winter-art` suites exercise real GM/player input through
opaque and transparent props, cropping and teardown. `sparse-scenery` loads actual rare-building
textures at four deterministic route positions per theme, checks their alpha and clipped bounds,
and saves one building example per theme. This accelerated check is separate from normal
playback and does not change spawn rates.

Poligon station `poscig`: probes `dekoracje-rzadkie` and `ruiny-tlo`, alongside the existing
winter probes. Reseed only at the GM's request. The work awaits visual review.

Final validation: `npm test`, packaging alpha/gutter checks and `git diff --check` pass.
Live boot, Nevada, urban, winter and sparse-building suites all pass without client console
errors in `logs/e2e/2026-10-20T19-48-04/report.json`. Three large-building examples:

- `sparse-scenery-01-gm-zima_rare_building.jpg`
- `sparse-scenery-02-gm-przedmiescia_rare_building.jpg`
- `sparse-scenery-03-gm-pustynia_rare_building.jpg`

Screenshots share that report folder. The sandbox contains three review scenes named
`Pościg · Nuklearna zima — przegląd`, `Pościg · Ruiny Ameryki — przegląd`, and
`Pościg · Pustynia Nevady — przegląd`. Every on-road vehicle in these review scenes has a
chase role; the former roleless control is **Pojazd 7**, lane 11. Winter is left open at tempo 2.

## Texture lifetime and sleep recovery (2026-10-21)

Live GM and player inspection after sleep found a recreated WebGL context and valid texture
dimensions, but empty Canvas2D pixels in the road, sky, blurred props, tread and snowflake
sources. Newly streamed skyline canvases and decoded image sources still had pixels.
PIXI's shared `Texture.WHITE` canvas was also empty, hiding Graphics fills and badges.
This was a source-pixel loss, with no scene or vehicle document loss or unbounded cache growth.

`scripts/scenes/poscig-texture-source.mjs` captures generated textures into premultiplied
RGBA `BufferResource` arrays and releases their temporary canvases. PIXI can upload those
bytes again after context restoration. Original image resources retain their decoded sources.
The existing working-set cache owns buffer lifetimes and destroys them on eviction/teardown;
`residentBufferBytes` reports retained CPU pixels separately from estimated GPU texture bytes.
No whole-catalog preload or per-frame pixel readback is used. Procedural fallback scenery and
snow effects use the same durable source path.

While a chase is open, context-restoration, visibility and resume checks repair only the known
solid-white shared PIXI source if it was erased. Canvas2D restoration is handled separately
because it can arrive after WebGL restoration. Event handlers are removed on teardown.
`graphicsContextRestores` and `whiteTextureRepairs` expose recovery diagnostics. Recovery
keeps the route, existing tyre marks, cached assets and all scene/vehicle documents intact.

Layer-6 suite `texture-resume` forces real `WEBGL_lose_context` resets on GM and player views
for all three themes, also erases the white Canvas2D source, compares rendered texture hashes
before/after, checks late Canvas2D restoration and confirms CPU buffers release on theme change.
An actual OS sleep/wake remains a manual check: Poligon `poscig`, probe `grafika-wznowienie`.
The station definition was updated; the live Poligon was not reseeded.

Validation: `npm test` (seven scenery tests), `npm run test:agent` (51 tests) and all six
layer-6 suites passed, without client console errors:
`logs/e2e/2026-10-21T18-52-52/report.json`. The extended late-restoration/disposal regression
also passed: `logs/e2e/2026-10-21T18-55-18/report.json`, with six recovery screenshots.
The original review world was reopened on winter in both clients with the new code; vehicle
IDs, names, positions and rotations match the pre-repair snapshot. Local diagnostic snapshots
are in `logs/e2e/sleep-recovery-2026-10-21/{before,after}.json`.

## Global game pause (2026-10-21)

The scenery and sway tickers now honor `game.paused`. Czas stop freezes travel distance,
foreground/background motion, snowflakes, existing tyre marks, tread emission and each
vehicle's last applied sway pose and phase. Camera cropping and texture recovery still run.
Resume advances by the next frame's delta; elapsed pause time is not added to the route.
Teardown and sway-setting changes explicitly restore meshes even while paused.

Layer-6 `poscig-pause` exercises pause/resume on GM and player clients in all three themes,
compares scene nodes and vehicle meshes with the exact pause-event snapshot, pans/zooms
while paused, checks the first resumed frame and confirms stable scene documents and tempo.
Manual Poligon probe: `poscig / czas-stop` (definition updated, live station not reseeded).
Validation: `npm test` and live `poscig-pause`, `winter-art`, `texture-resume` all pass with
no client console errors: `logs/e2e/2026-10-21T19-21-36/report.json`. Pause screenshots for
both clients in each theme are saved alongside the report.
