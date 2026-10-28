"""Check the decoded shipped Bradley pair, its shared exterior and nine seat anchors."""
import json
from pathlib import Path
from PIL import Image,ImageChops
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
SEATS=[('driver',509,1009),('gunner',370,785),('commander',233,785),
       ('troop-0-right',507,548),('troop-0-left',211,548),
       ('troop-1-right',507,383),('troop-1-left',211,383),
       ('troop-2-right',507,220),('troop-2-left',211,220)]
opened=Image.open(ROOT/'tokens/pojazdy/wnetrza/bwp.webp').convert('RGBA')
closed=Image.open(ROOT/'tokens/pojazdy/bwp.webp').convert('RGBA')
mask=Image.open(HERE/'roof-mask.png').convert('L')
assert opened.size==closed.size==(720,1350)
alpha_diff=ImageChops.difference(opened.getchannel('A'),closed.getchannel('A'))
assert alpha_diff.getbbox() is None,'alpha mismatch'
diff=ImageChops.difference(opened,closed).convert('RGB')
outside=ImageChops.multiply(diff,Image.merge('RGB',(mask.point(lambda p:255 if p==0 else 0),)*3))
assert outside.getbbox() is None,'exterior changed outside roof mask'
for name,im in [('roof-off',opened),('roof-on',closed)]:
    native_diff=ImageChops.difference(im,Image.open(HERE/f'{name}-native.png').convert('RGBA'))
    assert not any(channel.getbbox() for channel in native_diff.split()),'decoded native mismatch'
    assert all(im.getpixel((x,y))[3]==255 for _,x,y in SEATS),'transparent seat'
bounds=opened.getchannel('A').point(lambda p:255 if p>8 else 0).getbbox()
assert bounds[0]>0 and bounds[1]>0 and bounds[2]<720 and bounds[3]<1350
hull=Image.open(ROOT/'tokens/pojazdy/kadluby/bwp.webp').convert('RGBA')
turret=Image.open(ROOT/'tokens/pojazdy/wieze/bwp.webp').convert('RGBA')
assert hull.size==(720,1350) and turret.size==(495,627)
layer=Image.new('RGBA',hull.size)
layer.paste(turret,(81,586))
reassembled=Image.alpha_composite(hull,layer)
assert not any(c.getbbox() for c in ImageChops.difference(reassembled,closed).split()),'layer reassembly mismatch'
assert turret.getpixel((219,204))[3]==255,'pivot is not in the turret'
assert all(turret.getchannel('A').crop(box).getextrema()[1]<=8 for box in
    [(0,0,495,1),(0,626,495,627),(0,0,1,627),(494,0,495,627)])
report={'identity':'M2A2 Bradley','size':[720,1350],'frameMetres':[3.6,6.75],
        'visibleBounds':bounds,'visibleMetres':[(bounds[2]-bounds[0])/200,(bounds[3]-bounds[1])/200],
        'sharedAlphaDifferences':0,'exteriorDifferencesOutsideRoofMask':0,
        'decodedNativeDifferences':0,'opaqueSeatAnchors':[{'name':name,'x':x,'y':y} for name,x,y in SEATS],
        'roofTurretTranslation':[-25,115],'review':'approved-2026-10-27',
        'separateTurret':{'crop':[81,586,495,627],'pivotInCrop':[219,204],'pivotInHull':[300,790],
                         'reassembledPixelDifferences':0,'review':'awaiting-layer-review'}}
(HERE/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
