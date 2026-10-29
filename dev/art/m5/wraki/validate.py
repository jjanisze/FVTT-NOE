"""Validate packaged machine wrecks and record hashes, frame fill and native-scale review."""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
specs=[s for s in json.loads((HERE.parent/'catalog.json').read_text(encoding='utf-8'))['assets'] if s['set']=='wraki']
selection=json.loads((HERE/'selection.json').read_text(encoding='utf-8'))
report=[]
preview=Image.new('RGB',(1800,1250),'#555c57');draw=ImageDraw.Draw(preview)
try:font=ImageFont.truetype('arial.ttf',24)
except OSError:font=ImageFont.load_default()
cells={'maly':1,'sredni':1,'duzy':2,'gigantyczny':3}
names={'maly':'Mały','sredni':'Średni','duzy':'Duży','gigantyczny':'Gigantyczny'}
for i,s in enumerate(specs):
    chosen=selection[s['key']]
    path=ROOT/s['output'];source=HERE/chosen['file'];drop=HERE.parent/'in/wraki'/(s['key']+'.png')
    output_hash=hashlib.sha256(path.read_bytes()).hexdigest()
    if chosen.get('preserveOutputSha256'):assert output_hash==chosen['preserveOutputSha256'],s['key']+' accepted artwork changed'
    with Image.open(path) as im:
        assert im.format=='WEBP' and im.mode=='RGBA' and list(im.size)==s['size'],s['id']
        alpha=im.getchannel('A')
        assert alpha.getextrema()==(0,255),s['id']
        bounds=alpha.point(lambda v:255 if v>8 else 0).getbbox()
        assert bounds and min(bounds[0],bounds[1],im.width-bounds[2],im.height-bounds[3])>=1,s['id']
        fill=max(bounds[2]-bounds[0],bounds[3]-bounds[1])/max(im.size)*100
        assert abs(fill-s['fill'])<2,(s['id'],fill)
        report.append({'id':s['id'],'output':s['output'],'size':s['size'],'visibleBounds':bounds,
          'fillPercent':round(fill,2),'sampleFootprintCells':cells[s['key']],
          'visibleMetresAtTextureScale1':round(cells[s['key']]*1.5*fill/100,3),'bytes':path.stat().st_size,
          'outputSha256':output_hash,
          'source':source.relative_to(ROOT).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
          'drop':drop.relative_to(ROOT).as_posix(),'dropSha256':hashlib.sha256(drop.read_bytes()).hexdigest(),
          'review':chosen['review']})
        thumb=im.copy();thumb.thumbnail((420,470),Image.Resampling.LANCZOS)
        preview.paste(thumb,(i*450+(450-thumb.width)//2,75+(470-thumb.height)//2),thumb)
        draw.text((i*450+15,20),names[s['key']],font=font,fill='white')
        draw.text((i*450+15,565),str(s['size'][0])+' px / '+str(round(fill))+'%',font=font,fill='white')
draw.text((30,650),'Wspólna skala: 1 kratka = 1,5 m. Przykłady 1×1, 1×1, 2×2 i 3×3.',font=font,fill='white')
for x in range(0,1801,150):draw.line((x,700,x,1250),fill='#48524c')
for y in range(700,1251,150):draw.line((0,y,1800,y),fill='#48524c')
for i,s in enumerate(specs):
    edge=150*cells[s['key']];im=Image.open(ROOT/s['output']).convert('RGBA').resize((edge,edge),Image.Resampling.LANCZOS)
    cx=[160,500,920,1450][i]
    preview.paste(im,(cx-edge//2,950-edge//2),im)
    draw.text((cx-65,1200),names[s['key']],font=font,fill='white')
preview.save(HERE/'review-contact.jpg',quality=92)
data={'date':'2026-10-29','tool':'built-in image_gen','model':'not exposed by tool',
      'processing':'Frame fill, centering and scale only; existing M5 packer WEBP conversion',
      'assets':report}
(HERE/'validation.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'count':len(report),'totalBytes':sum(x['bytes'] for x in report),'assets':report},ensure_ascii=False))
