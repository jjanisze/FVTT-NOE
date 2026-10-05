# Nevada scenery

Original raster artwork generated with OpenAI's built-in image-generation tool on 2026-10-05.
The prompt set and targeted dust edit are in `prompts.json`. All scenery uses an approximately
45-degree downward camera, horizontal travel and upper-left sunlight. Vehicle art is outside
this pipeline.

The canonical shipped bitmaps are the five WEBPs in `ui/poscig/themes/pustynia/`. Their manifest
records native dimensions and alpha sprite bounds. Ground/hills are 1774×887; plants/structures
1254×1254; dust 1774×887. Preserve generated alpha, including semitransparent edges.

To package new generated outputs:

```sh
python dev/art/poscig-nevada/pack.py --ground <image> --hills <image> --plants <image> --structures <image> --dust <image>
```

This performs format conversion and locates sprite bounds; it does not draw or repair scenery.
Use the image model for content changes. The runtime in `scripts/scenes/poscig-nevada.mjs`
composites bitmap pixels once for loop seams and the terrain overlap, then only moves sprites.
Foreground texture regions omit lower stems, and their quads end at the chase-panel frame.
Every decoration is excluded from pointer hit testing. Real opaque/transparent overlap checks
and a canvas motion recording live in the `nevada-art` end-to-end suite.
