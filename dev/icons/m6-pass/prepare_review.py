"""Freeze and assemble M6 art review cards; never install assets or change saved decisions."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[3]
REVIEW = ROOT / 'dev/icons/review'
HERE = Path(__file__).resolve().parent
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = json.loads((REVIEW / 'manifest.json').read_text(encoding='utf-8'))
feedback = (REVIEW / 'feedback.json').read_bytes()
cards = []
targets = []
for number in (119,120):
    folder = REVIEW / 'candidates' / f'batch-{number}'
    batch = json.loads((folder / 'batch.json').read_text(encoding='utf-8'))
    validation = json.loads((folder / 'validated.json').read_text(encoding='utf-8'))
    assert validation['validatedMasks'] == len(batch['subjects'])
    for s in batch['subjects']:
        candidate = folder / (s['key'] + '.png')
        assert sha(candidate) == validation['candidateHashes'][s['key']]
        targets.extend([s['target'], s['target'].removesuffix('.svg') + '.webp'])
        cards.append(dict(id=s['itemId'], name=s['name'], tier=f'Batch {number} · M6',
            batch=number, target=s['target'], deliveryTargets=s['deliveryTargets'],
            context=s['context'], request=s['request'],
            current=dict(emptyLabel='Brak osobnego glifu',note='Obecna grafika zastępcza: '+s['fallback']),
            candidates=[dict(id=f'batch{number}-{s["key"]}',label='Biały glif · '+s['name'],
                src=f'candidates/batch-{number}/{s["key"]}.png', note='Kandydat w dotychczasowym stylu; oceń także przy 16 px.')]))
    fragment=dict(date='2026-10-29', expectedAbsent=[t for s in batch['subjects'] for t in (s['target'],s['target'].removesuffix('.svg')+'.webp')],
        sourceCode={p:sha(ROOT/p) for p in ('scripts/config/toolkits-data.mjs','scripts/config/conditions.mjs')},
        reference=dict(path='raw/style-reference.png',sha256=sha(folder/'raw/style-reference.png')))
    incoming=folder/'incoming.json'
    if not incoming.exists():incoming.write_text(json.dumps(fragment,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    else:assert json.loads(incoming.read_text(encoding='utf-8'))==fragment,'Incoming sources changed'

overlay='tokens/nakladki/zanurzony.webp'
targets.append(overlay)
cards.append(dict(id='water-submerged-overlay',name='Nakładka zanurzenia',tier='M6 · grafika kolorowa z przezroczystością',
    assetKind='overlay',target=overlay,deliveryTargets=[dict(source=overlay,sourceSha256=None,variant='default')],
    context='Nakładka na dolną połowę żetonu: turkusowa tafla. Podgląd na istniejących żetonach: zakładka Zanurzenie.',
    request='Oceń kolor, fale i czytelność sylwetki. Suwak w podglądzie dobiera intensywność; ta karta zapisuje decyzję o samej grafice.',
    current=dict(emptyLabel='Brak nakładki',note='Nowy efekt graficzny przewidziany w PLAN_m6_drobne_zasady.md §5.6.'),
    candidates=[dict(id='water-overlay-v1',label='Turkusowa tafla · RGBA',src='overlays/water/zanurzony.webp',
        note='Źródło ma własną przezroczystość. Zalecana początkowa intensywność rysowania: 60%. Podgląd pokazuje taflę na żetonach.')]))
assert len(cards)==15 and len({c['id'] for c in cards})==15
assert all(not(ROOT/t).exists() for t in targets),'Production asset appeared; review registration must be reconciled'
snapshot=dict(date='2026-10-29',expectedAbsent=targets,
    sourceCode={p:sha(ROOT/p) for p in ('scripts/config/toolkits-data.mjs','scripts/config/conditions.mjs')},
    previousCards=[dict(id=c['id'],sha256=hashlib.sha256(json.dumps(c,ensure_ascii=False,sort_keys=True).encode()).hexdigest()) for c in manifest['items'] if c['id'] not in {n['id'] for n in cards}],
    feedbackSha256=hashlib.sha256(feedback).hexdigest())
before=HERE/'incoming.json'
if not before.exists():before.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
else:
    frozen=json.loads(before.read_text(encoding='utf-8'))
    # Human decisions may arrive after registration; never reset or rewrite them.
    assert all(frozen[k]==snapshot[k] for k in ('expectedAbsent','sourceCode','previousCards')),'Existing cards or source state changed'
(REVIEW/'m6-manifest-items.json').write_text(json.dumps(dict(title='M6 · 14 ikon + nakładka zanurzenia · 15 do oceny',
    updated='2026-10-29',items=cards),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert (REVIEW/'feedback.json').read_bytes()==feedback
print('Prepared 15 review cards; production and feedback unchanged.')
