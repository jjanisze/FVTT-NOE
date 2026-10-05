# Nevada scenery

Original raster artwork generated with OpenAI's built-in image-generation tool on 2026-10-05.
The prompt set and targeted dust edit are in `prompts.json`. All scenery uses an approximately
45-degree downward camera, horizontal travel and upper-left sunlight. Vehicle art is outside
this pipeline.

The original revision supplied five WEBPs in `ui/poscig/themes/pustynia/`. Their manifest
records native dimensions and alpha sprite bounds. Ground/hills are 1774×887; plants/structures
1254×1254; dust 1774×887. Preserve generated alpha, including semitransparent edges.

To package new generated outputs:

```sh
python dev/art/poscig-nevada/pack.py --ground <image> --hills <image> --plants <image> --structures <image> --dust <image>
```

This performs format conversion and locates sprite bounds; it does not draw or repair scenery.
Use the image model for content changes. The runtime in `scripts/scenes/poscig-nevada.mjs`
composites bitmap pixels when loading a strip for loop seams and the terrain overlap, then moves sprites.
Foreground texture regions omit lower stems, and their quads end at the chase-panel frame.
Every decoration is excluded from pointer hit testing. Real opaque/transparent overlap checks
and a canvas motion recording live in the `nevada-art` end-to-end suite.

## Streamed variety catalog

The variety revision adds three road variants, three terrain plates, three four-prop sheets and
a four-overlay sheet. The complete pool has four road surfaces, four terrain plates, twenty
foreground silhouettes, four ground overlays and four dust wisps across fifteen WEBPs.
The new prompts and overlay edit are in `variety-prompts.json`.

`catalog.json` is the editable source of asset names, render roles, normalized sprite regions,
heights and selection groups. `pack-variety.py` generates the runtime manifest. Rebuild metadata
from the canonical WEBPs without re-encoding them:

```sh
python dev/art/poscig-nevada/pack-variety.py
```

To extend the pool, add approved WEBPs and their metadata to the catalog, add their IDs to the
appropriate selection groups, then run the packer. Alternatively supply a folder of approved
`<asset-id>.png` or `.webp` sources with `--source-dir <folder>`; the packer converts new sources
and validates all catalog references. Individual original outputs can be supplied with
`--<asset-id> <image>`. Adding assets requires no renderer changes. Keep the established camera,
sun direction, road geometry and connector edges; inspect alpha and sprite gutters before packing.

The renderer reads the lightweight catalog once, creates only visible sprite slots and loads
their textures plus spatial lookahead. It releases unused owned bases and decoded image/canvas
buffers. Two loads run concurrently. GPU residency depends on the viewport and working set,
not catalog length; it does not allocate a canvas containing the entire pool. Permutation bags
use a bounded metadata cache. Choices depend on scene ID and travel distance, so recentering or
a renderer rebuild does not reshuffle the route.

Terrain recipes change every 24,000 travel units (about 46 seconds at default tempo 2). Road
sections, ground overlays, dust and both foreground groups have separate spacing and depth rates.
The two foreground groups use eight plant and twelve structure choices with variable size and
placement. Heights vary uniformly; lighting is preserved. Foreground bases stay outside the
panel and all artwork remains excluded from input. Slow loading holds scenery at its previous
distance until the incoming visible set is ready, retaining the old textures in the meantime.

`node --test dev/e2e/nevada-stream.test.mjs` covers a thousand-asset working set and canceled loads.
The `nevada-stream` layer-6 suite records three minutes at tempo 2, checks all terrain recipes,
texture eviction and unchanged documents, and writes motion plus cache telemetry under `logs/e2e/`.
