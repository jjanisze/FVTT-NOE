"""Check bicycle asset dimensions, clear margins, saddle and basket transparency."""
import json
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
with Image.open(ROOT/'tokens/pojazdy/rower.webp') as token:
    assert token.format=='WEBP' and token.mode=='RGBA' and token.size==(180,450)
    alpha=token.getchannel('A')
    bounds=alpha.point(lambda a:255 if a>8 else 0).getbbox()
    assert bounds and min(bounds[0],bounds[1],180-bounds[2],450-bounds[3])>=1
    assert alpha.getpixel((90,140))>=250,'saddle anchor is transparent'
    basket=alpha.crop((66,32,114,90))
    open_pixels=sum(a<16 for a in basket.getdata())
    assert open_pixels>50,'wire basket lost its transparent openings'
with Image.open(ROOT/'tokens/portraits/pojazd-rower.webp') as portrait:
    assert portrait.format=='WEBP' and portrait.mode=='RGB' and portrait.size==(1024,1024)
report={'vehicle':'rower','frame':[180,450],'footprintSquares':[.6,1.5],
 'frameMetres':[.9,2.25],'visibleBounds':bounds,
 'visibleMetres':[(bounds[2]-bounds[0])*.005,(bounds[3]-bounds[1])*.005],
 'riderAnchor':[.5,.31],'riderAnchorPixel':[90,139.5],'anchorAlpha':alpha.getpixel((90,140)),
 'basketTransparentPixels':open_pixels,'engine':False,
 'presentation':{'widocznosc':'otwarta','warstwa':'nad'},'review':'art-retained-2026-10-28; rider-size-adjustment-deferred-by-gm'}
(HERE/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
