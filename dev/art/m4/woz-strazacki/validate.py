"""Check decoded WEBPs, exact shared exterior/alpha and measured visible scale."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
model = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
width,height = model["canvas"]
paths = [ROOT / "tokens/pojazdy/woz-strazacki.webp",ROOT / "tokens/pojazdy/wnetrza/woz-strazacki.webp",
         ROOT / "tokens/portraits/pojazd-woz-strazacki.webp"]
rows = []
for path in paths:
    with Image.open(path) as image:
        row = {"path":path.relative_to(ROOT).as_posix(),"size":list(image.size),"mode":image.mode,
               "bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
        if "A" in image.getbands():
            alpha = image.getchannel("A")
            row["alphaRange"] = list(alpha.getextrema())
            row["visibleBounds"] = alpha.point(lambda v:255 if v > 8 else 0).getbbox()
            row["borderAlphaMax"] = max(alpha.crop(b).getextrema()[1] for b in (
                (0,0,width,1),(0,height-1,width,height),(0,0,1,height),(width-1,0,width,height)))
            assert row["alphaRange"] == [0,255] and row["borderAlphaMax"] <= 8
        rows.append(row)
on = np.asarray(Image.open(paths[0]).convert("RGBA"))
off = np.asarray(Image.open(paths[1]).convert("RGBA"))
mask = np.asarray(Image.open(HERE / "roof-mask.png"))
outside = (mask == 0) & (off[:,:,3] > 8)
exterior = int(np.any(on != off,axis=2)[outside].sum())
alpha_diff = int((on[:,:,3] != off[:,:,3]).sum())
recipe_diff = {name:int(np.any(np.asarray(Image.open(HERE / f"roof-{name}-native.png")) != pixels,axis=2).sum())
               for name,pixels in (("on",on),("off",off))}
assert on.shape == off.shape == (height,width,4)
assert rows[2]["size"] == [1024,1024] and rows[2]["mode"] == "RGB"
assert exterior == alpha_diff == 0 and all(v == 0 for v in recipe_diff.values())
previous_on = np.asarray(Image.open(HERE / "roof-on-before-front-fix.png"))
previous_off = np.asarray(Image.open(HERE / "roof-off-before-front-fix.png"))
front_mask = np.asarray(Image.open(HERE / "front-mask.png"))
unchanged_roof = int(np.any(on != previous_on,axis=2).sum())
unchanged_off_outside_front = int(np.any(off != previous_off,axis=2)[front_mask == 0].sum())
assert unchanged_roof == unchanged_off_outside_front == 0
for x,y in model["finalSeats"] + [model["finalDeckOperator"]]:
    assert off[round(y*height),round(x*width),3] >= 250
def span(y):
    x = np.where(off[y,:,3] > 8)[0]
    return [int(x.min()),int(x.max()+1)]
body = span(model["calibration"]["rearBodySampleY"])
waist = span(model["calibration"]["waistSampleY"])
tyres = [span(model["calibration"][key]) for key in ("rearTyreSampleY","frontTyreSampleY")]
waist_ratio = (waist[1]-waist[0])/(body[1]-body[0])
assert 0.7 < waist_ratio < 0.9
assert all(body[0]-a >= 35 and b-body[1] >= 35 for a,b in tyres)
x0,y0,x1,y1 = rows[0]["visibleBounds"]
result = {"files":rows,"sharedExteriorSamples":int(outside.sum()),"differentExteriorPixels":exterior,
          "differentAlphaPixels":alpha_diff,"differentRecipePixels":recipe_diff,
          "differentApprovedRoofPixels":unchanged_roof,"differentCutawayPixelsOutsideFront":unchanged_off_outside_front,
          "frameMeters":[v*1.5 for v in model["footprintSquares"]],"visibleBoundsMeters":[round((x1-x0)/200,3),round((y1-y0)/200,3)],
          "outlineSamples":{"body":body,"waist":waist,"tyres":tyres,"waistToBodyRatio":round(waist_ratio,3)},
          "anchors":model["finalSeats"]+[model["finalDeckOperator"]],
          "visualReview":{"tyres":4,"axles":2,"cabRows":[3,2],"openDeckStations":1,
                          "rakedWindshieldVisible":True,"ridersInArt":False}}
(HERE / "validation.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:v for k,v in result.items() if k != "files"},indent=2))
