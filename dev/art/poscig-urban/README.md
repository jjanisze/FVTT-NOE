# Ruins of America chase scenery

Original raster artwork generated with OpenAI's built-in image tool. `prompts.json` records
all prompts and reference roles. The palette is ash grey through charcoal, bone-white concrete,
and small bleached mint, pink and turquoise accents. Every layer uses the same approximately
45-degree downward camera and upper-left daylight.

The pool matches Nevada's scale: four road surfaces, four district plates, twenty foreground
cutouts, four ground overlays and four dust wisps across fifteen WEBPs. Districts alternate
between ruined subdivisions, abandoned malls, dead commercial strips and dense city ruins.
The catalogue and renderer can accept additional approved artwork without a code change.

`catalog.json` is the source of names, sprite regions, heights and selection groups. To rebuild
the manifest from canonical WEBPs, without another lossy encoding:

```sh
python dev/art/poscig-nevada/pack-variety.py --catalog dev/art/poscig-urban/catalog.json --dest ui/poscig/themes/przedmiescia
```

For new original image-model outputs, add `--source-dir <folder>` containing
`<asset-id>.png` or `.webp`, or supply individual `--<asset-id> <image>` arguments.
The packer only converts formats and records alpha bounds. Inspect gutters and native dimensions
before approving sheets. Preserve alpha; no colour-key background removal or vector scenery.

`scripts/scenes/poscig-bitmap.mjs` serves both bitmap themes. Road plates have authored alpha
silhouettes: rubble and weeds retain solid interiors, with transparency outside their contours.
The connector's coverage matte suppresses faint exterior noise and saturates interior coverage;
lower-coverage contour pixels retain antialiasing. This runs once when the theme loads.
Variants share the upper shoulder and connector pixels. Tile ownership uses an irregular
antialiased contour instead of a broad opacity gradient. Loaded source buffers are released.
Only visible resources plus lookahead are resident, with two concurrent loads and full teardown.
Foreground bases stay beyond the panel frame and all scenery excludes input hit testing.

The `urban-art` suite checks real GM/player clicks and drags through opaque and transparent
foreground, road-edge opacity, cropping and texture disposal. `urban-stream` collects three
minutes of route/cache telemetry and district screenshots. Preview is live; tests make no videos.
