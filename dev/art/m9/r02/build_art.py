"""Requested crop/filter/composition of authentic sources. No generative edits to linework."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
SIZE = (2172, 724)
BASE = (25, 30, 35)
RESAMPLE = Image.Resampling.LANCZOS
manifest_path = ROOT / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def ramp_mask(size, left, right):
    line = Image.new('L', (size[0], 1))
    line.putdata([round(255 * (left + (right-left) * max(0, min(1, (x/size[0]-.28)/.62)))) for x in range(size[0])])
    return line.resize(size)

for item in manifest['candidates']:
    target = ROOT / item['file']
    if item['id'] != 'workshop':
        source = ROOT / item['master']
        image = Image.open(source).convert('RGB')
        if item['kind'] == 'generated-material':
            result = image
            item['treatment'] = 'WEBP encoding only; source composition unchanged.'
        elif item['id'] == 'patent':
            # Original figure 9, with the original circuit and labels intact.
            ink = ImageOps.invert(ImageOps.grayscale(image.crop(item['crop'])))
            recipe = item['composition']
            ratio = recipe['width'] / ink.width
            ink = ink.resize((recipe['width'], round(ink.height*ratio)), RESAMPLE)
            ink = ink.point(lambda value: round(value * recipe['strength']))
            result = Image.open(ROOT / '../workshop-v1.webp').convert('RGB')
            result.paste(Image.new('RGB', ink.size, recipe['color']), (recipe['x'], recipe['y']), ink)
            item['treatment'] = 'Extract original PDF scan; figure 9 crop, uniform scaling, invert ink to alpha, steel tint over retained Workshop. No linework or labels redrawn.'
        else:
            gray = ImageOps.grayscale(image.crop(item['crop']))
            gray = ImageOps.fit(gray, SIZE, method=RESAMPLE)
            if item['kind'] == 'authentic-map-composition':
                gray = ImageOps.invert(gray)
            recipe = item['composition']
            tone = ImageOps.colorize(gray, BASE, recipe['color'])
            result = Image.new('RGB', SIZE, BASE)
            result.paste(tone, (0, 0), ramp_mask(SIZE, recipe['strengthLeft'], recipe['strengthRight']))
            item['treatment'] = 'Source crop, uniform cover scale, grayscale/tint and horizontal contrast ramp; original geometry preserved.'
        result.save(target, 'WEBP', quality=90, method=6)
        item['sourceSha256'] = sha(source)
    item['outputSha256'] = sha(target)
    with Image.open(target) as image:
        item['size'] = list(image.size)
    item['bytes'] = target.stat().st_size
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({item['id']: item['bytes'] for item in manifest['candidates']}))
