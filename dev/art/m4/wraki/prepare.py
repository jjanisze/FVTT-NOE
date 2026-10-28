"""Normalize generated canvas geometry to the accepted token frame; never paint or trim the subject."""
import json
from pathlib import Path
from PIL import Image, ImageDraw
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
jobs=json.loads((HERE/'batch.json').read_text(encoding='utf-8'))['jobs']
specs={s['vehicle']:s for s in json.loads((HERE.parent/'catalog.json').read_text(encoding='utf-8'))['assets'] if s['set']=='wraki'}
report=[]
for j in jobs:
    src=ROOT/j['source']
    if not src.exists():continue
    spec=specs['wozStrazacki' if j['slug']=='woz-strazacki' else j['slug']]
    image=Image.open(src).convert('RGBA')
    # Full-canvas resampling keeps the authored origin. The generator occasionally
    # returns a different aspect ratio (notably the bus); restore the native ratio.
    out=image.resize(tuple(spec['size']),Image.Resampling.LANCZOS)
    a=out.getchannel('A');bounds=a.point(lambda v:255 if v>8 else 0).getbbox()
    assert bounds and min(bounds[0],bounds[1],out.width-bounds[2],out.height-bounds[3])>=1,spec['id']
    drop=HERE.parent/'in'/spec['set']/(spec['key']+'.png')
    drop.parent.mkdir(parents=True,exist_ok=True)
    out.save(drop)
    report.append({'vehicle':spec['vehicle'],'source':j['source'],'generatedFrame':list(image.size),
                   'nativeFrame':list(out.size),'visibleBounds':bounds})
(HERE/'framing.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
