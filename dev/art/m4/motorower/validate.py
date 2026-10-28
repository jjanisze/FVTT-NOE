"""Check shipped moped dimensions, transparent margins and painted crew anchor."""
import json
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
with Image.open(ROOT/'tokens/pojazdy/motorower.webp') as token:
    assert token.format=='WEBP' and token.mode=='RGBA' and token.size==(180,468)
    alpha=token.getchannel('A')
    bounds=alpha.point(lambda a:255 if a>8 else 0).getbbox()
    assert bounds and min(bounds[0],bounds[1],180-bounds[2],468-bounds[3])>=1
    assert alpha.getpixel((90,168))>=250,'driver anchor is transparent'
    assert alpha.getpixel((90,235))>=250,'step-through front is missing'
    assert alpha.getpixel((90,54))>=250,'rear crate floor is missing'
with Image.open(ROOT/'tokens/portraits/pojazd-motorower.webp') as portrait:
    assert portrait.format=='WEBP' and portrait.mode=='RGB' and portrait.size==(1024,1024)
report={'vehicle':'motorower','frame':[180,468],'footprintSquares':[.6,1.56],
 'frameMetres':[.9,2.34],'sizeAdjustment':1.2,'visibleBounds':bounds,
 'visibleMetres':[(bounds[2]-bounds[0])*.005,(bounds[3]-bounds[1])*.005],
 'driverAnchor':[.5,.36],'driverAnchorPixel':[90,168.48],'anchorAlpha':alpha.getpixel((90,168)),
 'exhaust':[.25,.18],'presentation':{'widocznosc':'otwarta','warstwa':'nad'},
 'portrait':'approved-2026-10-27','tokenAndIntegration':'approved-2026-10-28'}
(HERE/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
