"""Measure framed artwork, transparency, visible size and inspected seat positions."""
import hashlib
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
model = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
rows = []
for path in [HERE / "token-v1.png",ROOT / "tokens/pojazdy/buldozer.webp",ROOT / "tokens/portraits/pojazd-buldozer.webp"]:
    with Image.open(path) as image:
        row = {"file":path.relative_to(ROOT).as_posix(),"size":list(image.size),"mode":image.mode,
               "bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
        if "A" in image.getbands():
            alpha = image.getchannel("A")
            row["alphaRange"] = list(alpha.getextrema())
            row["visibleBounds"] = alpha.point(lambda v:255 if v > 8 else 0).getbbox()
            row["borderAlphaMax"] = max(alpha.crop(b).getextrema()[1] for b in (
                (0,0,image.width,1),(0,image.height-1,image.width,image.height),
                (0,0,1,image.height),(image.width-1,0,image.width,image.height)))
        rows.append(row)
assert rows[1]["size"] == model["canvas"] and rows[1]["mode"] == "RGBA"
assert rows[1]["alphaRange"] == [0,255] and rows[1]["borderAlphaMax"] <= 8
assert rows[2]["size"] == [1024,1024] and rows[2]["mode"] == "RGB"
w,h = model["canvas"]
with Image.open(ROOT / "tokens/pojazdy/buldozer.webp") as token:
    for x,y in model["finalSeats"]:
        assert token.getpixel((round(x*w),round(y*h)))[3] >= 250
x0,y0,x1,y1 = rows[1]["visibleBounds"]
frame_meters = [v*1.5 for v in model["footprintSquares"]]
result = {"files":rows,"frameMeters":frame_meters,
          "visibleBoundsMeters":[round((x1-x0)/w*frame_meters[0],3),round((y1-y0)/h*frame_meters[1],3)],
          "finalSeats":model["finalSeats"],"finalExhaust":model["finalExhaust"],
          "visualReview":{"tracks":2,"frontBlade":True,"rearRipperTeeth":1,"openSeats":2,
                          "operator":"image-left","helper":"image-right","roof":False,"ridersInArt":False}}
(HERE / "validation.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
print(json.dumps(result,indent=2))
