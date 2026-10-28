"""Register the accepted cab and copy the canonical exterior, without generation.

The GM requested pixel copying/blending after reviewing the generated pair.
Native v1 inputs are decoded snapshots of the first shipped WEBPs. Original
generator outputs remain in roof-on.png / roof-off.png for provenance.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

HERE = Path(__file__).resolve().parent
DROP = HERE.parent / "in"
SIZE = (600, 1800)
SEAT_SHIFT = 26
# Preserve the bed beam and bonnet; stretch only the empty rear cab floor and
# compress the bottom of the dashboard. Seats and the entire wheel translate
# together by 26 pixels, with no scaling or resampling in that band.
ROW_MAP = [(1060, 1060), (1160, 1186), (1355, 1381), (1405, 1405)]
CAB = (78, 1060, 532, 1410)


def compose() -> tuple[Image.Image, Image.Image]:
    closed = Image.open(HERE / "roof-on-native-v1.png").convert("RGBA")
    original = Image.open(HERE / "roof-off-native-v1.png").convert("RGBA")
    assert closed.size == original.size == SIZE
    registered = original.copy()
    for (src_top, dst_top), (src_bottom, dst_bottom) in zip(ROW_MAP, ROW_MAP[1:]):
        band = original.crop((0, src_top, SIZE[0], src_bottom))
        if band.height != dst_bottom - dst_top:
            band = band.resize((SIZE[0], dst_bottom - dst_top), Image.Resampling.LANCZOS)
        registered.paste(band, (0, dst_top))

    # A small inward feather has finite support: absolutely no exterior pixel
    # outside CAB can change. Blending stays on the cab/bed joint and body rails.
    mask = Image.new("L", SIZE)
    draw = ImageDraw.Draw(mask)
    x0, y0, x1, y1 = CAB
    feather = 6
    for inset in range(feather + 1):
        draw.rectangle((x0 + inset, y0 + inset, x1 - inset - 1, y1 - inset - 1),
                       fill=round(255 * inset / feather))
    opened = Image.composite(registered, closed, mask)
    return closed, opened


if __name__ == "__main__":
    closed, opened = compose()
    for name, image in (("roof-on-v2.png", closed), ("roof-off-v2.png", opened)):
        image.save(HERE / name)
    closed.save(DROP / "pojazdy/ciezarowka.png")
    opened.save(DROP / "wnetrza/ciezarowka.png")
    difference = ImageChops.difference(closed, opened)
    # Inspect every channel: getbbox on RGBA alone can hide RGB-only differences.
    print({"differenceBounds": [channel.getbbox() for channel in difference.split()],
           "seatShiftPx": SEAT_SHIFT, "cabBounds": CAB})
