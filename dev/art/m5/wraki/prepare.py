"""Author transparent frame fill only, then use the existing packer for WEBP conversion."""
import argparse,json
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
specs=[s for s in json.loads((HERE.parent/'catalog.json').read_text(encoding='utf-8'))['assets'] if s['set']=='wraki']
selection=json.loads((HERE/'selection.json').read_text(encoding='utf-8'))
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--asset',action='append',choices=list(selection))
args=parser.parse_args()
report=json.loads((HERE/'framing.json').read_text(encoding='utf-8')) if (HERE/'framing.json').exists() else []
for s in specs:
    if args.asset and s['key'] not in args.asset:continue
    source=HERE/selection[s['key']]['file']
    with Image.open(source) as im:
        im=im.convert('RGBA');a=im.getchannel('A')
        assert a.getextrema()[0]==0,'Missing alpha: '+s['key']
        bounds=a.point(lambda v:255 if v>8 else 0).getbbox()
        assert bounds,s['key']
        cut=im.crop(bounds)
        ratio=(max(s['size'])*s['fill']/100)/max(cut.size)
        fitted=cut.resize(tuple(max(1,round(v*ratio)) for v in cut.size),Image.Resampling.LANCZOS)
        out=Image.new('RGBA',tuple(s['size']))
        # Copy RGBA samples: do not multiply the semi-transparent cutout edges twice.
        out.paste(fitted,((out.width-fitted.width)//2,(out.height-fitted.height)//2))
        drop=HERE.parent/'in/wraki'/(s['key']+'.png')
        drop.parent.mkdir(parents=True,exist_ok=True)
        out.save(drop)
        report=[row for row in report if row['asset']!=s['id']]
        report.append({'asset':s['id'],'source':source.relative_to(ROOT).as_posix(),
                       'sourceFrame':list(im.size),'sourceBounds':bounds,'outputFrame':s['size'],
                       'targetFill':s['fill'],'resampleFactor':ratio,'drop':drop.relative_to(ROOT).as_posix()})
(HERE/'framing.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
