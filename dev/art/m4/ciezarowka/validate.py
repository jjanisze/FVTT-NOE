"""Measure decoded, shipped pixels of the truck pair and write validation.json."""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

sys.dont_write_bytecode = True
from compose import CAB, HERE, SEAT_SHIFT, SIZE, compose

ROOT = HERE.parents[3]


def changed_pixels(a, b):
    difference = ImageChops.difference(a.convert("RGBA"), b.convert("RGBA"))
    maximum = Image.new("L", a.size)
    for channel in difference.split():
        maximum = ImageChops.lighter(maximum, channel)
    return maximum, maximum.point(lambda value: 255 if value else 0).histogram()[255]


if __name__ == "__main__":
    paths = [HERE / name for name in (
        "roof-on.png", "roof-off.png", "roof-on-native-v1.png", "roof-off-native-v1.png",
        "roof-on-v2.png", "roof-off-v2.png")]
    paths += [ROOT / name for name in ("tokens/pojazdy/ciezarowka.webp",
              "tokens/pojazdy/wnetrza/ciezarowka.webp", "tokens/portraits/pojazd-ciezarowka.webp")]
    files = []
    for path in paths:
        with Image.open(path) as image:
            row = {"file": path.relative_to(ROOT).as_posix(), "size": list(image.size),
                   "mode": image.mode, "bytes": path.stat().st_size,
                   "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
            if "A" in image.getbands():
                alpha = image.getchannel("A")
                bounds = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
                row.update(alphaRange=list(alpha.getextrema()), bboxAlphaAbove8=bounds,
                           heightFillPercent=round((bounds[3]-bounds[1])*100/image.height,2))
                row["borderAlphaMax"] = max(alpha.crop(box).getextrema()[1] for box in (
                    (0,0,image.width,1), (0,image.height-1,image.width,image.height),
                    (0,0,1,image.height), (image.width-1,0,image.width,image.height)))
                assert row["alphaRange"] == [0,255] and row["borderAlphaMax"] <= 8
            files.append(row)

    expected_closed, expected_open = compose()
    closed = Image.open(ROOT / "tokens/pojazdy/ciezarowka.webp").convert("RGBA")
    opened = Image.open(ROOT / "tokens/pojazdy/wnetrza/ciezarowka.webp").convert("RGBA")
    original_open = Image.open(HERE / "roof-off-native-v1.png").convert("RGBA")
    assert closed.size == opened.size == SIZE
    mask, changed = changed_pixels(closed, opened)
    exterior = mask.copy()
    x0,y0,x1,y1 = CAB
    ImageDraw.Draw(exterior).rectangle((x0,y0,x1-1,y1-1), fill=0)
    results = {
        "cabBoundsExclusive": CAB,
        "cabContentsTranslationPx": [0, SEAT_SHIFT],
        "sharedExteriorComparedPixels": SIZE[0]*SIZE[1]-(x1-x0)*(y1-y0),
        "sharedExteriorDifferentPixels": exterior.point(lambda v: 255 if v else 0).histogram()[255],
        "cargoBedDifferentPixels": changed_pixels(closed.crop((0,0,600,1060)), opened.crop((0,0,600,1060)))[1],
        "acceptedClosedDifferentPixels": changed_pixels(closed, expected_closed)[1],
        "compositorToShippedDifferentPixels": changed_pixels(opened, expected_open)[1],
        "translatedSeatsAndWheelDifferentPixels": changed_pixels(
            original_open.crop((126,1160,477,1355)), opened.crop((126,1186,477,1381)))[1],
        "pairDifferenceBounds": mask.getbbox(),
        "pairChangedPixels": changed,
        "encoding": "lossless WEBP with exact RGBA preservation",
        "registrationBefore": {
            "leftSeatDy":25,"middleSeatDy":26,"steeringWheelDy":28,"dashboardDy":25,
            "method":"Vertical Sobel template cross-correlation on first shipped pair; glass changes shading."},
    }
    for key in ("sharedExteriorDifferentPixels", "cargoBedDifferentPixels", "acceptedClosedDifferentPixels",
                "compositorToShippedDifferentPixels", "translatedSeatsAndWheelDifferentPixels"):
        assert results[key] == 0, (key, results[key])
    (HERE / "validation.json").write_text(json.dumps({"files":files,"pixelChecks":results},indent=2)+"\n",encoding="utf-8")
    print(json.dumps(results,indent=2))
