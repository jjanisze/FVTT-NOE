"""Validate decoded Abrams assets, exact common exterior and layer registration."""
import json
from pathlib import Path
from PIL import Image, ImageChops
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
SIZE=(780,2100)
SEATS=[('driver',390,1310),('commander',285,770),('loader',517,875),('gunner',276,980)]
def same(a,b,message):
    assert a.size==b.size and not any(c.getbbox() for c in ImageChops.difference(a,b).split()),message
opened=Image.open(ROOT/'tokens/pojazdy/wnetrza/czolg.webp').convert('RGBA')
closed=Image.open(ROOT/'tokens/pojazdy/czolg.webp').convert('RGBA')
hull=Image.open(ROOT/'tokens/pojazdy/kadluby/czolg.webp').convert('RGBA')
turret=Image.open(ROOT/'tokens/pojazdy/wieze/czolg.webp').convert('RGBA')
assert opened.size==closed.size==hull.size==SIZE
assert turret.size==(638,1588)
for name,im in [('roof-off',opened),('roof-on',closed),('hull',hull),('turret',turret)]:
    same(im,Image.open(HERE/f'{name}-native.png').convert('RGBA'),'decoded native mismatch: '+name)
same(opened.getchannel('A'),hull.getchannel('A'),'cutaway changed hull silhouette')
mask=Image.open(HERE/'roof-mask.png').convert('L').point(lambda p:255 if p==0 else 0)
diff=ImageChops.difference(opened,closed)
assert all(ImageChops.multiply(c,mask).getbbox() is None for c in diff.split()),'exterior changed outside finite roof mask'
for _,x,y in SEATS:assert opened.getpixel((x,y))[3]==255,'transparent crew anchor'
layer=Image.new('RGBA',SIZE);layer.paste(turret,(70,458))
same(Image.alpha_composite(hull,layer),closed,'layer reassembly mismatch')
assert turret.getpixel((319,426))[3]==255,'pivot outside turret'
assert all(turret.getchannel('A').crop(box).getextrema()[1]==0 for box in [(0,0,638,8),(0,1580,638,1588),(0,0,8,1588),(630,0,638,1588)])
bounds=opened.getchannel('A').point(lambda p:255 if p>8 else 0).getbbox()
full_bounds=closed.getchannel('A').point(lambda p:255 if p>8 else 0).getbbox()
assert bounds==(25,72,755,1658),bounds
assert full_bounds[3]==2038,full_bounds
report={'identity':'M1A1 Abrams','size':SIZE,'hullViewport':[780,1680],
 'footprintSquares':[2.6,5.6],'footprintMetres':[3.9,8.4],
 'texture':{'fit':'width','anchorX':.5,'anchorY':.4},'visibleHullBounds':bounds,
 'visibleHullMetres':[3.65,7.93],'visibleOverallMetres':9.83,
 'commonExteriorDifferences':0,'decodedNativeDifferences':0,'hullSilhouetteDifferences':0,
 'opaqueSeatAnchors':[{'role':role,'x':x,'y':y} for role,x,y in SEATS],
 'separateTurret':{'crop':[70,458,638,1588],'pivotInCrop':[319,426],'pivotInSource':[389,884],'reassembledPixelDifferences':0},
 'review':'approved-2026-10-27'}
(HERE/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
