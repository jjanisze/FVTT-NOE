"""Register validated Batch 112 without modifying existing feedback or shipped artwork."""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'placeholder-pass'))
from prepare_70_71 import ROOT, REVIEW, read, write, sha


def main():
    here = REVIEW / 'candidates/batch-112'
    assert not (here / 'registration.json').exists(), 'Already registered; retain newer reviews'
    batch, validation = read(here / 'batch.json'), read(here / 'validated.json')
    assert batch['batch'] == validation['batch'] == 112 and validation['validatedMasks'] == 8
    assert batch['partialAtlas'] and batch['emptyCells'] == [9]
    files = [REVIEW / name for name in ('manifest.json', 'feedback.json', 'style-feedback.json')]
    missing_file = ROOT / 'dev/icons/MISSING.md'
    before = {file: file.read_bytes() for file in files + [missing_file]}
    manifest = read(files[0])
    feedback = read(files[1])
    ids = {card['id'] for card in manifest['items']} | set(feedback['items'])
    cards = []
    for subject in batch['subjects']:
        key = subject['key']
        assert subject['itemId'] not in ids
        assert sha(here / f'{key}.png') == validation['candidateHashes'][key]
        assert sha(ROOT / subject['fallback']) == subject['fallbackSha256']
        assert all(not (ROOT / subject['target']).with_suffix(ext).exists() for ext in ('.svg', '.webp', '.png'))
        cards.append({'id': subject['itemId'], 'name': subject['name'], 'batch': 112,
            'tier': 'Batch 112 · Proficiency UI', 'target': subject['target'],
            'deliveryTargets': subject['deliveryTargets'], 'wiringKey': subject['wiringKey'],
            'context': subject['context'], 'request': subject['request'],
            'current': {'src': '/' + subject['fallback'], 'note': 'Approved existing-art fallback, already wired; dedicated subject pending review.'},
            'candidates': [{'id': 'atlas-a', 'label': 'Batch 112 · ' + subject['name'],
                'src': f'candidates/batch-112/{key}.png', 'note': subject['request']}]})
    manifest['items'].extend(cards)
    active = [card for card in manifest['items'] if card.get('status') != 'resolved']
    assert len(active) == 8
    manifest.update(title='Batch 112 · 8 proficiency icons awaiting GM review', updated=batch['date'])
    missing = before[missing_file].decode('utf-8').replace('\r\n', '\n')
    assert '**Next batch number: 112**.' in missing
    missing = missing.replace('**Next batch number: 112**.', '**Next batch number: 113**. Batch 112: eight dedicated glyphs await GM review.')
    missing = missing.replace('**36 missing images** — 7 banners,', '**44 missing final images** — 8 proficiency glyphs awaiting review, 7 banners,')
    section = ['<!-- proficiency-batch-112:start -->', '## A. Proficiency UI glyphs — 8 awaiting review', '',
        'Batch 112 is generated and validated in the icon review browser. Existing approved',
        'glyphs are wired as temporary substitutes; these dedicated final files remain absent.',
        'Install only the GM-selected, approved candidates, then update',
        '`scripts/config/proficiency-icons-data.mjs` for the listed keys.', '',
        '| Subject | Missing SVG (+ WEBP) | Wiring |', '|---|---|---|']
    section += [f"| {s['name']} | `{s['target']}` | `{s['wiringKey']}` |" for s in batch['subjects']]
    section += ['', 'Prompts and exact targets: `review/candidates/batch-112/`.',
        'Candidate generation: OpenAI built-in image generation; no GM hand-edit claimed.', '',
        '<!-- proficiency-batch-112:end -->', '']
    anchor = '<!-- class-placeholder-audit:start -->'
    assert anchor in missing and '<!-- proficiency-batch-112:start -->' not in missing
    missing = missing.replace(anchor, '\n'.join(section) + '\n' + anchor, 1)
    for file, content in before.items():
        assert file.read_bytes() == content, 'Review changed during registration'
    write(files[0], manifest)
    missing_file.write_text(missing, encoding='utf-8')
    write(here / 'manifest-items.json', {'title': manifest['title'], 'updated': batch['date'], 'items': cards})
    write(here / 'registration.json', {'date': batch['date'], 'batch': 112, 'newSubjects': 8,
        'productionUnchanged': True, 'existingFeedbackSha256': sha(files[1])})
    assert all(file.read_bytes() == before[file] for file in files[1:])
    print('Registered eight new cards; all prior reviews and production assets preserved.')


if __name__ == '__main__':
    main()
