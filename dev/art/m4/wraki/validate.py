"""Validate all fourteen native wrecks and make a before/after review sheet."""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
specs=[s for s in json.loads((HERE.parent/'catalog.json').read_text(encoding='utf-8'))['assets'] if s['set']=='wraki']
assert len(specs)==14 and len({s['output'] for s in specs})==14
sedan=ROOT/'tokens/wraki/pojazd-osobowy.webp'
assert hashlib.sha256(sedan.read_bytes()).hexdigest()=='640d00f755843826aa6b01a54aa27010a1e1033ef230de4e1301b49728c847b2','Approved sedan changed'
sheet=Image.new('RGB',(2400,3360),'#555c57')
draw=ImageDraw.Draw(sheet)
try:font=ImageFont.truetype('arial.ttf',26)
except OSError:font=ImageFont.load_default()
report=[]
for i,s in enumerate(specs):
    path=ROOT/s['output']
    slug='woz-strazacki' if s['vehicle']=='wozStrazacki' else s['vehicle']
    base=ROOT/f'tokens/pojazdy/{slug}.webp'
    with Image.open(path) as im:
        assert im.format=='WEBP' and im.mode=='RGBA' and list(im.size)==s['size'],s['id']
        a=im.getchannel('A');bounds=a.point(lambda v:255 if v>8 else 0).getbbox()
        assert bounds and min(bounds[0],bounds[1],im.width-bounds[2],im.height-bounds[3])>=1,s['id']
        assert Image.open(base).size==im.size
        row={'vehicle':s['vehicle'],'file':s['output'],'frame':s['size'],'visibleBounds':bounds,
             'bytes':path.stat().st_size,'front':'down','review':'approved' if s['vehicle']=='osobowka' else 'awaiting-gm-review'}
        report.append(row)
    x=(i%4)*600;y=(i//4)*840
    draw.text((x+15,y+10),slug,fill='white',font=font)
    draw.text((x+40,y+55),'Sprawny',fill='#ddd',font=font)
    draw.text((x+350,y+55),'Wrak',fill='#ddd',font=font)
    for n,p in enumerate([base,path]):
        im=Image.open(p).convert('RGBA');im.thumbnail((280,720),Image.Resampling.LANCZOS)
        sheet.paste(im,(x+n*300+(300-im.width)//2,y+100+(720-im.height)//2),im)
sheet.save(HERE/'review-contact.jpg',quality=92)
(HERE/'validation.json').write_text(json.dumps({'count':len(report),'assets':report},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'count':len(report),'bytes':sum(x['bytes'] for x in report),'assets':report}))
