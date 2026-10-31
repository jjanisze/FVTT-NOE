"""Portrait -> token preparation, provenance, validation and approval-gated delivery. No model/API calls."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import shutil
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
MANIFEST = HERE / 'manifest.json'
FEEDBACK = HERE / 'review' / 'feedback.json'
BESTIARY = ['cywil','gangus-boss','generacja-ii-genotyp-gadzi','generacja-ii-genotyp-wilczy',
            'generacja-iii-szpieg','korzec','mobsprzet','pajak','roj-szczurow','szeryf','taran']
COMPANIONS = [
    ('towarzysz-psi-partner','Psi partner',400,.70,'sm',
     'Lean short-haired wasteland mongrel, rusty tan fur, dark saddle, cream chest and toes, one folded ear, plain worn collar and a short chain.'),
    ('towarzysz-zmutowany-owad','Zmutowany owad',400,.70,'sm',
     'Biological burrowing mutant with EIGHT limbs: six slender walking legs plus two strong digging forelegs, thick rust-brown chitin and broad mandibles. Match the approved portrait; no wings or machinery.'),
    ('towarzysz-zmutowany-ssak','Zmutowany ssak',800,.90,'lg',
     'Lean mutated coati/raccoon-like scavenging companion, dog-comparable threat, narrow flexible snout, gray-brown fur, long ringed tail and four dexterous paws. Inquisitive, no bear bulk, snarling or equipment.'),
    ('towarzysz-zmutowany-gad','Zmutowany gad',400,.90,'med',
     'Lean amphibious water-dragon/iguana-like lizard companion, dog-comparable threat, short blunt head, slender neck, fine olive-brown scales and long tapered swimming tail. Four splayed clawed feet; no crocodile armor or equipment.')
]
STYLE = ('Grounded hand-painted realistic game illustration. Muted natural colours, broad smooth light-to-shadow gradients, '
         'quiet large surfaces and selective material detail at important edges. Local damage only where explicitly described; '
         'do not turn the setting or subject condition into an all-over fine surface pattern. '
         'Neutral upper-left light, crisp silhouette. Match the existing module portrait/token examples. No text, logos, border, '
         'fantasy ornaments or magic. Reference anatomy/equipment must never leak from a style-only image.')

def read(p, default=None):
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else default

def write(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def rel(p):
    return p.resolve().relative_to(ROOT).as_posix()

def utc():
    return datetime.now(timezone.utc).isoformat()

def init():
    if MANIFEST.exists():
        return read(MANIFEST)
    entries=[]
    for key,title,px,fill,size,brief in COMPANIONS:
        entries.append(dict(id=key,title=title,group='companion',size=size,px=px,fill=fill,brief=brief))
    book=read(ROOT/'dev/bestiary/bestiary.json')
    for key in BESTIARY:
        creature=book[key];size=creature['size']
        px,fill={'tiny':(200,.60),'sm':(400,.70),'med':(400,.90),'lg':(800,.90),'huge':(1200,.92),'grg':(1600,.92)}[size]
        entries.append(dict(id=key,title=creature['name'].title(),group='bestiary',size=size,px=px,fill=fill,
                            brief=creature.get('lore',{}).get('wyglad',''),source=f'dev/bestiary/bestiary.json#{key}'))
    for entry in entries:
        entry.update(targets={'portrait':f'tokens/portraits/{entry["id"]}.webp','token':f'tokens/{entry["id"]}.webp'},
                     candidates={'portrait':[],'token':[]})
    data={'version':1,'entries':entries,'references':[{'id':key,'title':title,
           'portrait':f'tokens/portraits/{key}.webp','token':f'tokens/{key}.webp'}
           for key,title in [('pies-bojowy','Pies bojowy'),('kanibal','Kanibal'),('gangus-kapo','Gangus kapo'),('neokot','Neokot')]]}
    write(MANIFEST,data)
    return data

def entry_for(data, key):
    return next(e for e in data['entries'] if e['id']==key)

def require_approved_portrait(entry, portrait):
    if entry.get('stage')!='portrait-approval':return
    decision=read(FEEDBACK,{'items':{}})['items'].get(f'{entry["id"]}:portrait',{})
    if (decision.get('decision')!='approve' or decision.get('candidateId')!=portrait['id']
            or decision.get('sha256')!=portrait['sha256'] or sha(ROOT/portrait['src'])!=portrait['sha256']):
        raise ValueError('Approve this exact portrait before generating or importing its token')

def prompt(args):
    data=init();entry=entry_for(data,args.id)
    references=[{'path':'tokens/portraits/pies-bojowy.webp','role':'painting and portrait format only'}]
    if args.kind=='portrait':
        text=(f'{STYLE}\nSUBJECT: {entry["brief"]}\nFull-body creature portrait, all extremities visible, three-quarter front view '
              'at the creature\'s chest height. Portrait aspect about 4:5. Dark charcoal subtly mottled backdrop, no scenery, '
              'only restrained contact shading. Natural grounded pose, comfortable margins. Reference is STYLE ONLY; invent the specified subject.')
    else:
        if not args.portrait:
            raise ValueError('--portrait is required for a token')
        portrait=next(p for p in entry['candidates']['portrait'] if p['id']==args.portrait)
        require_approved_portrait(entry,portrait)
        machine=entry['id'] in ['mobsprzet','pajak']
        humanoid=entry['group']=='bestiary' and entry['id'] in ['cywil','gangus-boss','szeryf','generacja-iii-szpieg',
                                                              'generacja-ii-genotyp-gadzi','generacja-ii-genotyp-wilczy']
        style='tokens/obronca.webp' if machine else 'tokens/gangus-kapo.webp' if humanoid else 'tokens/pies-bojowy.webp'
        references=[{'path':portrait['src'],'role':'exact subject identity'},
                    {'path':style,'role':'camera, painting and token format only'}]
        text=(f'{STYLE}\nImage 1 is the exact SUBJECT. Preserve its anatomy, proportions, colours, markings, equipment and identity. '
              'Image 2 is CAMERA/STYLE ONLY: never copy its subject, anatomy or equipment.\n'
              'Create one near-overhead battle-map token: camera about 80 degrees above ground, visible crown and back, strong '
              'foreshortening. HEAD TOWARD THE BOTTOM (south), tail/rear toward the top; not a side-view or front portrait. '
              f'SUBJECT: {entry["brief"]}\nSquare, genuine transparent alpha, longest extent about {entry["fill"]*100:.0f}% of frame; '
              'all limbs and extremities inside clear margins. No ring, base, floor, scenery, painted checkerboard or long shadow. '
              'Neutral upper-left illumination, painterly defined edge and only a very short soft contact shadow. Readable at 70 screen pixels.')
    if entry['group']=='companion' and entry['id']!='towarzysz-psi-partner':
        text += ('\nThe style reference wears manufactured equipment. DO NOT COPY IT. The requested companion has '
                 'NO armor, harness, muzzle cage, metal plates, straps, collar, chain or clothing: biological anatomy only. '
                 'Take only brushwork, light and backdrop from a portrait-style reference.')
    out=HERE/'prompts'/args.id/f'{args.kind}-{args.candidate}.json'
    if out.exists():
        raise ValueError('Frozen prompt exists; use a new candidate id')
    record=dict(date=utc(),tool='OpenAI built-in image_gen',model=None,creatureId=args.id,asset=args.kind,
                candidateId=args.candidate,portraitId=args.portrait,references=references,prompt=text)
    write(out,record)
    return {'file':rel(out),**record}

def add(args):
    data=init();entry=entry_for(data,args.id)
    if any(c['id']==args.candidate for c in entry['candidates'][args.kind]):
        raise ValueError('Candidate id already exists; never overwrite a reviewed version')
    source=Path(args.source).resolve()
    with Image.open(source) as original:im=original.convert('RGBA')
    record=read(Path(args.prompt))
    if record['creatureId']!=args.id or record['asset']!=args.kind or record['candidateId']!=args.candidate:
        raise ValueError('Frozen prompt does not match this import')
    portrait=None
    if args.kind=='token':
        if record.get('portraitId')!=args.portrait:
            raise ValueError('Frozen token prompt refers to another portrait')
        portrait=next(c for c in entry['candidates']['portrait'] if c['id']==args.portrait)
        require_approved_portrait(entry,portrait)
        if record['references'][0]['path'] not in [portrait['src'],portrait['source']]:
            raise ValueError('Token subject reference is not the registered portrait')
        if sha(ROOT/portrait['src'])!=portrait['sha256']:
            raise ValueError('Source portrait changed')
        alpha=im.getchannel('A')
        if alpha.getextrema()[0]!=0 or sum(a==0 for a in alpha.getdata())/(im.width*im.height)<.15:
            raise ValueError('Token needs genuine transparent background; do not remove a painted background by code')
        bbox=alpha.point(lambda v:255 if v>8 else 0).getbbox()
        if not bbox:raise ValueError('Empty token')
        crop=im.crop(bbox);px=entry['px'];extent=round(px*entry['fill']);scale=extent/max(crop.size)
        crop=crop.resize(tuple(max(1,round(n*scale)) for n in crop.size),Image.Resampling.LANCZOS)
        normalized=Image.new('RGBA',(px,px))
        normalized.alpha_composite(crop,((px-crop.width)//2,(px-crop.height)//2))
    else:
        if im.getchannel('A').getextrema()[0]<255:
            raise ValueError('Portrait should have an opaque painted backdrop')
        normalized=im.convert('RGB');normalized.thumbnail((1000,1000),Image.Resampling.LANCZOS)
        bbox=None
    raw=HERE/'in'/args.id/f'{args.kind}-{args.candidate}.png';raw.parent.mkdir(parents=True,exist_ok=True)
    if raw.resolve()!=source:
        if raw.exists() and sha(raw)!=sha(source):raise ValueError('Raw source already exists and differs')
        shutil.copy2(source,raw)
    out=HERE/'candidates'/args.id/f'{args.kind}-{args.candidate}.webp';out.parent.mkdir(parents=True,exist_ok=True)
    normalized.save(out,format='WEBP',lossless=args.kind=='token',quality=93,method=6)
    item=dict(id=args.candidate,src=rel(out),sha256=sha(out),source=rel(raw),sourceSha256=sha(raw),
              prompt=rel(Path(args.prompt)),width=normalized.width,height=normalized.height,createdAt=utc(),tool=record['tool'],model=record.get('model'))
    if args.note:item['agentNotes']=args.note
    if portrait:
        item.update(portraitId=portrait['id'],portraitSha256=portrait['sha256'],sourceBox=list(bbox),fill=entry['fill'])
    entry['candidates'][args.kind].append(item);write(MANIFEST,data)
    return item

def validate():
    data=init();errors=[];count=0
    for entry in data['entries']:
        for kind,candidates in entry['candidates'].items():
            for candidate in candidates:
                count+=1;p=ROOT/candidate['src']
                if not p.exists() or sha(p)!=candidate['sha256']:
                    errors.append(f'{entry["id"]}/{kind}/{candidate["id"]}: image hash mismatch');continue
                with Image.open(p) as original:im=original.copy()
                prompt_file=ROOT/candidate['prompt']
                if not prompt_file.exists():errors.append(f'{entry["id"]}: missing frozen prompt')
                if kind=='token':
                    if im.mode!='RGBA':
                        errors.append(f'{entry["id"]}: invalid token format');continue
                    box=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
                    if im.size!=(entry['px'],entry['px']) or not box:
                        errors.append(f'{entry["id"]}: invalid token format');continue
                    fill=max(box[2]-box[0],box[3]-box[1])/entry['px']
                    if abs(fill-entry['fill'])>2/entry['px'] or min(box[0],box[1],im.width-box[2],im.height-box[3])<2:
                        errors.append(f'{entry["id"]}: token framing outside spec')
                    portrait=next((c for c in entry['candidates']['portrait'] if c['id']==candidate['portraitId']),None)
                    if not portrait or portrait['sha256']!=candidate['portraitSha256']:errors.append(f'{entry["id"]}: portrait provenance mismatch')
    return {'candidates':count,'plannedPairs':len(data['entries']),'errors':errors}

def install(args):
    data=init();entry=entry_for(data,args.id);feedback=read(FEEDBACK,{'items':{}})['items'];selected={}
    for kind in ['portrait','token']:
        decision=feedback.get(f'{args.id}:{kind}',{})
        if decision.get('decision')!='approve':raise ValueError(f'{kind} is not approved')
        candidate=next(c for c in entry['candidates'][kind] if c['id']==decision['candidateId'])
        if candidate['sha256']!=decision.get('sha256') or sha(ROOT/candidate['src'])!=candidate['sha256']:
            raise ValueError('Approval does not match current candidate bytes')
        selected[kind]=candidate
    if selected['token']['portraitId']!=selected['portrait']['id'] or selected['token']['portraitSha256']!=selected['portrait']['sha256']:
        raise ValueError('Selected token was generated from another portrait')
    installed=read(HERE/'installed.json',{'version':1,'entries':{}});result={}
    for kind,candidate in selected.items():
        target=ROOT/entry['targets'][kind];previous=sha(target) if target.exists() else None
        if previous and previous!=candidate['sha256']:
            backup=HERE/'in'/'previous-deliveries'/args.id/f'{kind}-{previous}.webp';backup.parent.mkdir(parents=True,exist_ok=True)
            if not backup.exists():shutil.copy2(target,backup)
        target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/candidate['src'],target)
        result[kind]=dict(path=entry['targets'][kind],sha256=sha(target),candidateId=candidate['id'],previousSha256=previous)
    installed['entries'][args.id]={'installedAt':utc(),**result};write(HERE/'installed.json',installed)
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
    sub.add_parser('init');sub.add_parser('validate')
    for command in ['prompt','add']:
        p=sub.add_parser(command);p.add_argument('--id',required=True);p.add_argument('--kind',choices=['portrait','token'],required=True)
        p.add_argument('--candidate',required=True);p.add_argument('--portrait')
        if command=='add':p.add_argument('--source',required=True);p.add_argument('--prompt',required=True);p.add_argument('--note')
    p=sub.add_parser('install');p.add_argument('--id',required=True)
    args=parser.parse_args()
    result={'init':lambda:{'plannedPairs':len(init()['entries'])},'validate':validate,'prompt':lambda:prompt(args),
            'add':lambda:add(args),'install':lambda:install(args)}[args.command]()
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if result.get('errors'):raise SystemExit(1)

if __name__=='__main__':main()
