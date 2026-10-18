"""Install Batch 112 approvals exactly, including the explicit keep-current selection."""
import argparse
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'placeholder-pass'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'style-pass'))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from public_review import public_copy, feedback_hash


def check():
    receipt = read(REVIEW / 'candidates/batch-112/reviewed-installed.json')
    for entry in receipt['installed'] + receipt['keptCurrent']:
        for file in entry['files']:
            assert sha(ROOT / file['source']) == file['sha256'], file['source']
    print('Verified four exact SVG/WEBP deliveries and the unchanged approved Acrobatics glyph.')


def consume():
    here = REVIEW / 'candidates/batch-112'
    assert not (here / 'reviewed-installed.json').exists(), 'Already consumed; use --check'
    paths = [REVIEW / name for name in ('manifest.json', 'feedback.json', 'style-feedback.json')]
    before = {p: p.read_bytes() for p in paths}
    manifest, feedback = read(paths[0]), read(paths[1])
    cards = {c['id']: c for c in manifest['items']}
    batch, validated = read(here / 'batch.json'), read(here / 'validated.json')
    snapshots, deliveries, retained = [], [], []
    for subject in batch['subjects']:
        card, saved = cards[subject['itemId']], feedback['items'][subject['itemId']]
        assert card.get('status') != 'resolved'
        assert saved['decision'] in ('approve', 'revise', 'reject')
        if saved['candidateId'] == 'current':
            selected = ROOT / subject['fallback']
            assert card['current']['src'] == '/' + subject['fallback']
            assert sha(selected) == subject['fallbackSha256']
            source = '/' + subject['fallback']
        else:
            candidate = next(c for c in card['candidates'] if c['id'] == saved['candidateId'])
            source = candidate['src']
            selected = REVIEW / source
            assert selected == here / f"{subject['key']}.png"
            assert sha(selected) == validated['candidateHashes'][subject['key']]
        snapshot = {'id': card['id'], 'name': card['name'], 'decision': saved['decision'],
            'candidateId': saved['candidateId'], 'selectedSource': source, 'sourceSha256': sha(selected),
            'sourceKind': 'production' if saved['candidateId'] == 'current' else 'candidate',
            'notes': saved.get('notes', ''), 'feedback': public_copy(saved), 'feedbackSha256': feedback_hash(saved)}
        snapshots.append(snapshot)
        if saved['decision'] != 'approve':
            continue
        if saved['candidateId'] == 'current':
            retained.append({'itemId': card['id'], 'files': [{'source': subject['fallback'], 'sha256': sha(selected)}]})
            card.update(requestedTarget=subject['target'], target=subject['fallback'], retainedCurrent=True,
                deliveryTargets=[{'source': subject['fallback'], 'sourceSha256': sha(selected), 'variant': 'retained'}])
        else:
            destination = ROOT / subject['target']
            assert destination.resolve().is_relative_to(ROOT / 'icons/proficiencies')
            assert all(not destination.with_suffix(ext).exists() for ext in ('.svg', '.webp', '.png'))
            deliveries.append((subject, selected, destination))
    assert len(deliveries) == 4 and len(retained) == 1
    for p, content in before.items():
        assert p.read_bytes() == content, 'Newer GM review arrived'
    installed = []
    for subject, selected, destination in deliveries:
        destination.parent.mkdir(parents=True, exist_ok=True)
        files = []
        for ext in ('.svg', '.webp'):
            source = selected.with_suffix(ext)
            output = destination.with_suffix(ext)
            output.write_bytes(source.read_bytes())
            assert sha(output) == sha(source)
            files.append({'source': output.relative_to(ROOT).as_posix(), 'sha256': sha(output)})
        card = cards[subject['itemId']]
        card.update(status='resolved', current={'src': '/' + subject['target'], 'note': 'Exact GM-approved Batch 112 glyph, installed as SVG/WEBP.'})
        installed.append({'itemId': subject['itemId'], 'candidateId': 'atlas-a', 'source': selected.relative_to(REVIEW).as_posix(),
            'sourceSha256': sha(selected), 'files': files})
    for entry in retained:
        cards[entry['itemId']]['status'] = 'resolved'
    manifest.update(title='Asset review · five Batch 112 choices delivered/retained; three subjects awaiting revision', updated='2026-10-18')
    write(here / 'reviewed.json', {'date': '2026-10-18', 'batch': 112, 'active': public_copy(snapshots)})
    write(here / 'reviewed-installed.json', {'date': '2026-10-18', 'batch': 112, 'installed': installed, 'keptCurrent': retained,
        'approvedSubjects': 5, 'remainingSubjects': 3})
    write(paths[0], manifest)
    assert all(p.read_bytes() == before[p] for p in paths[1:])
    check()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    check() if args.check else consume()
