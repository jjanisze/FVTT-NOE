"""Validate shipped skateboard dimensions, clear alpha margins and central standing anchor."""
import json
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
with Image.open(ROOT/'tokens/pojazdy/deskorolka.webp') as token:
    assert token.format=='WEBP' and token.mode=='RGBA' and token.size==(180,216)
    alpha=token.getchannel('A')
    bounds=alpha.point(lambda a:255 if a>8 else 0).getbbox()
    assert bounds and min(bounds[0],bounds[1],180-bounds[2],216-bounds[3])>=1
    assert alpha.getpixel((90,108))>=250,'standing anchor is transparent'
with Image.open(ROOT/'tokens/portraits/pojazd-deskorolka.webp') as portrait:
    assert portrait.format=='WEBP' and portrait.mode=='RGB' and portrait.size==(1024,1024)
report={'vehicle':'deskorolka','frame':[180,216],'footprintSquares':[.6,.72],
 'frameMetres':[.9,1.08],'sizeAdjustment':1.2,'visibleBounds':bounds,
 'visibleMetres':[(bounds[2]-bounds[0])*.005,(bounds[3]-bounds[1])*.005],
 'riderAnchor':[.5,.5],'riderAnchorPixel':[90,108],'anchorAlpha':alpha.getpixel((90,108)),
 'standing':True,'engine':False,'presentation':{'widocznosc':'otwarta','warstwa':'nad'},
 'occupantSizeTuning':'deferred-by-gm-2026-10-28','review':'art-retained-2026-10-28; resized-to-120-percent-by-gm-request'}
(HERE/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
