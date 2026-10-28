"""Measure shipped bus frames, shared exterior RGBA pixels and all seat anchors."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

sys.dont_write_bytecode = True
from compose import HERE, ROOF, FRONT_EDIT, compose, rounded_mask

ROOT = HERE.parents[3]


def differences(a,b):
    maximum = Image.new("L",a.size)
    for channel in ImageChops.difference(a.convert("RGBA"),b.convert("RGBA")).split():
        maximum = ImageChops.lighter(maximum,channel)
    return maximum,maximum.point(lambda v:255 if v else 0).histogram()[255]


if __name__ == "__main__":
    paths = [HERE/name for name in ("roof-off-v1.png","roof-off-v2.png","roof-on-v1.png","roof-off-native.png","roof-on-native.png")]
    paths += [ROOT/name for name in ("tokens/pojazdy/autobus.webp","tokens/pojazdy/wnetrza/autobus.webp","tokens/portraits/pojazd-autobus.webp")]
    paths += [HERE/name for name in ("roof-on-windshield-v2.png","portrait-v1.png","portrait-v2.png")]
    rows = []
    for path in paths:
        with Image.open(path) as im:
            row = {"file":path.relative_to(ROOT).as_posix(),"size":list(im.size),"mode":im.mode,
                   "bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
            if "A" in im.getbands():
                a=im.getchannel("A");bounds=a.point(lambda v:255 if v>8 else 0).getbbox()
                row.update(alphaRange=list(a.getextrema()),bboxAlphaAbove8=bounds,
                           longSideFillPercent=round((bounds[3]-bounds[1])*100/im.height,2))
                row["borderAlphaMax"]=max(a.crop(box).getextrema()[1] for box in (
                    (0,0,im.width,1),(0,im.height-1,im.width,im.height),
                    (0,0,1,im.height),(im.width-1,0,im.width,im.height)))
                assert row["alphaRange"]==[0,255] and row["borderAlphaMax"]<=8
            rows.append(row)
    closed=Image.open(ROOT/'tokens/pojazdy/autobus.webp').convert('RGBA')
    opened=Image.open(ROOT/'tokens/pojazdy/wnetrza/autobus.webp').convert('RGBA')
    expected_open,expected_closed,mask=compose()
    assert closed.size==opened.size==(600,2400)
    diff,count=differences(closed,opened)
    outside=ImageChops.multiply(diff,mask.point(lambda v:0 if v else 255))
    alpha_diff=ImageChops.difference(closed.getchannel('A'),opened.getchannel('A'))
    checks={"encoding":"lossless WEBP with exact RGBA preservation","roofBoundsExclusive":ROOF,
            "sharedExteriorComparedPixels":mask.histogram()[0],
            "sharedExteriorDifferentPixels":outside.point(lambda v:255 if v else 0).histogram()[255],
            "alphaDifferentPixels":alpha_diff.point(lambda v:255 if v else 0).histogram()[255],
            "compositorToClosedDifferentPixels":differences(closed,expected_closed)[1],
            "compositorToOpenDifferentPixels":differences(opened,expected_open)[1],
            "pairDifferenceBounds":diff.getbbox(),"pairChangedPixels":count}
    for key in ('sharedExteriorDifferentPixels','alphaDifferentPixels','compositorToClosedDifferentPixels','compositorToOpenDifferentPixels'):
        assert checks[key]==0,(key,checks[key])
    before_closed=Image.open(HERE/'roof-on-before-windshield.png').convert('RGBA')
    before_open=Image.open(HERE/'roof-off-before-windshield.png').convert('RGBA')
    front_diff,_=differences(closed,before_closed)
    front_mask=rounded_mask(closed.size,FRONT_EDIT)
    outside_front=ImageChops.multiply(front_diff,front_mask.point(lambda v:0 if v else 255))
    checks['previousRoofDifferentPixelsOutsideFront']=outside_front.point(lambda v:255 if v else 0).histogram()[255]
    checks['previousInteriorDifferentPixels']=differences(opened,before_open)[1]
    assert checks['previousRoofDifferentPixelsOutsideFront']==0
    assert checks['previousInteriorDifferentPixels']==0
    glass_box=(90,2060,510,2225)
    glass=list(closed.crop(glass_box).convert('RGB').getdata())
    glass_fraction=sum(b>r+5 and g>r+4 and max(r,g,b)<190 for r,g,b in glass)/len(glass)
    assert glass_fraction>.55,('Windshield must be visibly dark blue-gray, not cream roof',glass_fraction)
    checks['windshieldInspectionBox']=glass_box
    checks['windshieldGlassFraction']=round(glass_fraction,4)
    checks['windshieldInspectionDepthMeters']=(glass_box[3]-glass_box[1])*12/2400
    model=json.loads((HERE/'model.json').read_text(encoding='utf-8'))
    seats=[model['finalDriver']]+[[x,y] for y in model['finalPassengerRowsFrontToRear'] for x in model['finalPassengerColumns']]
    assert len(seats)==21
    for x,y in seats:
        assert opened.getpixel((round(x*600),round(y*2400)))[3]>=250
    body=opened.getchannel('A').crop((0,1000,600,1450)).point(lambda v:255 if v>128 else 0).getbbox()
    visible=next(row for row in rows if row['file']=='tokens/pojazdy/wnetrza/autobus.webp')['bboxAlphaAbove8']
    physical={"frameMeters":[3,12],"allVisibleBoundsMeters":[round((visible[2]-visible[0])*3/600,3),round((visible[3]-visible[1])*12/2400,3)],
              "bodyWidthInMidsectionMeters":round((body[2]-body[0])*3/600,3),
              "seatCount":len(seats),"driver":model['finalDriver'],"passengerColumns":model['finalPassengerColumns'],
              "passengerRowsFrontToRear":model['finalPassengerRowsFrontToRear']}
    result={"files":rows,"pixelChecks":checks,"geometry":physical}
    (HERE/'validation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({"pixelChecks":checks,"geometry":physical},indent=2))
