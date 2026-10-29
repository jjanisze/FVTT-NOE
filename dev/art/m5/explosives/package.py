"""Package selected generated sprites with the existing M5 framing/conversion pipeline."""
from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
spec = importlib.util.spec_from_file_location('m5_pack', HERE.parent / 'pack.py')
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)
selection = json.loads((HERE / 'selection.json').read_text(encoding='utf-8'))
catalog = {a['key']: a for a in pack.specs() if a['set'] == 'objekty'}
delivered = []
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for key, selected in selection.items():
    source = HERE / selected['source']
    drop = HERE.parent / 'in' / 'objekty' / (key + '.png')
    drop.parent.mkdir(parents=True, exist_ok=True)
    framing = None
    if threshold := selected.get('trimAlphaThreshold'):
        # Generated cutouts may have nearly invisible alpha noise far outside the object.
        # Crop around visible pixels; retain the authored alpha and all pixels inside.
        with Image.open(source) as im:
            im = im.convert('RGBA')
            bounds = im.getchannel('A').point(lambda a: 255 if a > threshold else 0).getbbox()
            if not bounds:
                raise ValueError(f'{key}: empty visible silhouette')
            bounds = (max(0,bounds[0]-2), max(0,bounds[1]-2),
                      min(im.width,bounds[2]+2), min(im.height,bounds[3]+2))
            im.crop(bounds).save(drop)
            framing = dict(alphaThreshold=threshold, crop=bounds)
    else:
        shutil.copyfile(source, drop)
    output = ROOT / catalog[key]['output']
    validation = pack.convert(drop, output, catalog[key])
    with Image.open(source) as im:
        source_size = im.size
    delivered.append(dict(id=catalog[key]['id'], source=source.relative_to(ROOT).as_posix(),
        drop=drop.relative_to(ROOT).as_posix(), output=catalog[key]['output'], prompt=selected['prompt'],
        sourceSize=source_size, framing=framing, sourceSha256=sha(source), outputSha256=sha(output), validation=validation))
report = dict(date='2026-10-29', tool='OpenAI built-in image_gen; model identifier not exposed',
    processing='Original alpha preserved; trim transparent bounds, resize, existing M5 WEBP conversion.',
    delivered=delivered)
(HERE / 'delivery.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
font = ImageFont.truetype('arial.ttf', 21)
sheet = Image.new('RGB', (1080, 320 * ((len(delivered)+2)//3)), '#53594f')
draw = ImageDraw.Draw(sheet)
for i,d in enumerate(delivered):
    x,y=(i%3)*360,(i//3)*320
    draw.text((x+14,y+8), d['id'].split('/')[-1].replace('grenade-',''), font=font, fill='white')
    image = Image.open(ROOT / d['output']).convert('RGBA')
    large = image.copy()
    large.thumbnail((190,190), Image.Resampling.LANCZOS)
    sheet.paste(large,(x+20+(190-large.width)//2,y+46+(190-large.height)//2),large)
    for j,bg in enumerate(['#b7bcae','#222b25']):
        draw.rectangle((x+226,y+52+j*105,x+346,y+150+j*105),fill=bg)
        for k,long in enumerate([30,50]):
            sample=image.copy()
            sample.thumbnail((long,long),Image.Resampling.LANCZOS)
            sheet.paste(sample,(x+232+k*57+(50-sample.width)//2,y+75+j*105+(50-sample.height)//2),sample)
    draw.text((x+227,y+264),'30 / 50 px',font=font,fill='white')
sheet.save(HERE / 'preview.png')
print(json.dumps(report, ensure_ascii=False, indent=2))

# Two GM-supplied sources predate this batch; validate the existing packed banners.
banners = []
for asset in pack.specs():
    if asset['id'] not in ('ruiny/magazyn', 'ruiny/wrak'):
        continue
    source = HERE.parent / 'in' / asset['set'] / (asset['key'] + '.png')
    output = ROOT / asset['output']
    with Image.open(source) as im:
        source_size = im.size
    banners.append(dict(id=asset['id'], source=source.relative_to(ROOT).as_posix(),
        output=asset['output'], sourceSize=source_size, sourceSha256=sha(source),
        outputSha256=sha(output), validation=pack.validate(output, asset),
        provenance='Existing GM-supplied PNG, present since 2026-10-20; generator metadata unknown'))
batch = dict(date='2026-10-29', banners=banners, explosiveArt='explosives/delivery.json')
(HERE.parent / 'delivered-2026-10-29.json').write_text(json.dumps(batch, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
banner_sheet = Image.new('RGB', (1020, 480), '#30332e')
draw = ImageDraw.Draw(banner_sheet)
for i,d in enumerate(banners):
    im = Image.open(ROOT / d['output'])
    banner_sheet.paste(im.resize((600,200),Image.Resampling.LANCZOS),(0,i*240+30))
    banner_sheet.paste(im.resize((360,120),Image.Resampling.LANCZOS),(640,i*240+30))
    draw.text((0,i*240+2),d['id']+' | 600x200 / 360x120',font=font,fill='white')
banner_sheet.save(HERE / 'ruiny-preview.png')
