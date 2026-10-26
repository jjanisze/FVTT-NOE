# Repeating backgrounds without dissolving buildings

A rectangular district painting combines sky, foreground terrain and buildings in one layer.
Crossfading two such paintings cuts through whichever building happens to sit on the join.
Changing the width or shape of that fade cannot preserve an architectural silhouette.

The winter catalog instead assembles two kinds of generated assets:

1. One opaque, empty sky and snowy-horizon base, with no architecture, trees or poles.
   Its own left/right overlap forms a repeatable 1,792-pixel loop. The last 256 pixels of the
   source supply the start of the loop, and a short fade introduces the source's first pixels.
   There are no solid objects in this layer for that transition to erase.
2. Complete district silhouettes on genuine alpha. Every outer building and roof must terminate
   naturally before the left/right image edges. Keep dark interiors and snow fully opaque;
   remove the sky and external terrain. Retain a low, irregular rubble/snow base. The source
   requests clear side gutters and complete framing rather than a cropped landscape painting.

The runtime places overlapping silhouette modules above the common base and below the authored
road shoulder. It resizes and normalizes the coverage matte once, preserving antialiasing at the
object contour. It neither clips the left edge of a module nor multiplies it by an opacity ramp.
An outer building can be occluded by the next opaque silhouette, exactly as buildings occlude
one another within the same painting. Its exposed facade never becomes a translucent ghost.

`catalog.json` uses `landscapeMode: "opaque-cutouts"`, a `backdrop` asset, and `cutout: true` on
each skyline. The shared packer rejects missing alpha and nonempty architectural gutters. The
low snow/rubble base may reach a tile edge because the solid road overlaps that part of the
scene; buildings in the upper 85 percent may not. No color-key extraction is used.

Review at several route positions and across all district transitions. Check roofs, chimneys,
window bays and outermost walls at the join, then verify that the lower edge stays behind the
solid shoulder. The `winter-art` sandbox suite inspects the actual loaded alpha cores and
architectural gutters and saves a live review screenshot. New sets should follow this asset
separation instead of trying to repair rectangular building paintings with wider gradients.
