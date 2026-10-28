"""Measure the delivered art's visible dimensions and record the inspected seat anchors."""
import hashlib
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
model = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
rows = []
for path in [HERE / "token-v1.png", ROOT / "tokens/pojazdy/traktor.webp",
             ROOT / "tokens/portraits/pojazd-traktor.webp"]:
    with Image.open(path) as image:
        row = {"file":path.relative_to(ROOT).as_posix(), "size":list(image.size),
               "mode":image.mode, "bytes":path.stat().st_size,
               "sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
        if "A" in image.getbands():
            alpha = image.getchannel("A")
            bounds = alpha.point(lambda value:255 if value > 8 else 0).getbbox()
            row.update(alphaRange=list(alpha.getextrema()), bboxAlphaAbove8=bounds,
                       heightFillPercent=round((bounds[3]-bounds[1])*100/image.height,2))
            row["borderAlphaMax"] = max(alpha.crop(box).getextrema()[1] for box in (
                (0,0,image.width,1),(0,image.height-1,image.width,image.height),
                (0,0,1,image.height),(image.width-1,0,image.width,image.height)))
            assert row["alphaRange"] == [0,255] and row["borderAlphaMax"] <= 8
        rows.append(row)
assert rows[1]["size"] == model["canvas"] and rows[1]["mode"] == "RGBA"
assert rows[2]["size"] == [1024,1024] and rows[2]["mode"] == "RGB"
width,height = rows[1]["size"]
x0,y0,x1,y1 = rows[1]["bboxAlphaAbove8"]
frame_meters = [v*1.5 for v in model["footprintSquares"]]
with Image.open(ROOT / "tokens/pojazdy/traktor.webp") as token:
    for x,y in model["finalSeats"]:
        assert token.getpixel((round(x*width),round(y*height)))[3] >= 250
result = {"files":rows,"finalSeats":model["finalSeats"],"finalExhaust":model["finalExhaust"],
          "frameMeters":frame_meters,
          "visibleBoundsMeters":[round((x1-x0)/width*frame_meters[0],3),round((y1-y0)/height*frame_meters[1],3)],
          "visualReview":{"tyrePositions":4,"axles":2,"front":"down",
                          "driver":"central seat","passenger":"image-right mudguard cushion",
                          "roof":False,"ridersInArt":False}}
(HERE / "validation.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
print(json.dumps(result,indent=2))
