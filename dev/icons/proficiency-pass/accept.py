"""Consume exact proficiency revision selections; shared-target alternatives install only once."""
import argparse
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'placeholder-pass'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'style-pass'))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from public_review import public_copy, feedback_hash


def check(number):
    receipt = read(REVIEW / f'candidates/batch-{number}/reviewed-installed.json')
    for entry in receipt['installed'] + receipt['keptCurrent']:
        for file in entry['files']:
            assert sha(ROOT / file['source']) == file['sha256'], file['source']
    print(f"Batch {number}: verified {len(receipt['installed'])} exact deliveries and {len(receipt['keptCurrent'])} retained glyphs.")


def consume(number):
    here = REVIEW / f'candidates/batch-{number}'
    assert not (here / 'reviewed-installed.json').exists(), 'Already consumed; use --check'
    paths = [REVIEW / name for name in ('manifest.json', 'feedback.json', 'style-feedback.json')]
    before = {p: p.read_bytes() for p in paths}
    manifest, feedback = read(paths[0]), read(paths[1])
    cards = {c['id']: c for c in manifest['items']}
    subjects = {}
    for subject in read(here / 'batch.json')['subjects']:
        if subject['itemId'] in subjects:
            assert subjects[subject['itemId']]['target'] == subject['target']
        subjects[subject['itemId']] = subject
    snapshots, deliveries, retained = [], [], []
    for item_id, subject in subjects.items():
        card, saved = cards[item_id], feedback['items'][item_id]
        assert card.get('status') != 'resolved' and saved['decision'] in ('approve', 'revise', 'reject')
        current = saved['candidateId'] == 'current'
        if current:
            source = card['current']['src']
            selected = ROOT / source.lstrip('/')
            assert source == '/' + subject['fallback'] and sha(selected) == subject['fallbackSha256']
        else:
            source = next(c['src'] for c in card['candidates'] if c['id'] == saved['candidateId'])
            selected = (REVIEW / source).resolve()
            assert selected.is_relative_to(REVIEW / 'candidates') and selected.suffix == '.png'
            assert sha(selected) == read(selected.parent / 'validated.json')['candidateHashes'][selected.stem]
        snapshots.append({'id': item_id, 'name': card['name'], 'decision': saved['decision'],
            'candidateId': saved['candidateId'], 'selectedSource': source, 'sourceSha256': sha(selected),
            'sourceKind': 'production' if current else 'candidate', 'target': subject['target'],
            'notes': saved.get('notes', ''), 'feedback': public_copy(saved), 'feedbackSha256': feedback_hash(saved)})
        if saved['decision'] != 'approve':
            continue
        if current:
            files = [{'source': selected.with_suffix(ext).relative_to(ROOT).as_posix(), 'sha256': sha(selected.with_suffix(ext))}
                     for ext in ('.svg', '.webp') if selected.with_suffix(ext).is_file()]
            retained.append({'itemId': item_id, 'files': files})
            card.update(requestedTarget=subject['target'], target=subject['fallback'], retainedCurrent=True,
                deliveryTargets=[{'source': subject['fallback'], 'sourceSha256': sha(selected), 'variant': 'retained'}])
        else:
            destination = ROOT / subject['target']
            assert destination.resolve().is_relative_to(ROOT / 'icons/proficiencies') and destination.suffix == '.svg'
            assert all(not destination.with_suffix(ext).exists() for ext in ('.svg', '.webp', '.png'))
            deliveries.append((item_id, selected, destination))
    for p, content in before.items():
        assert p.read_bytes() == content, 'Newer review arrived'
    installed = []
    for item_id, selected, destination in deliveries:
        destination.parent.mkdir(parents=True, exist_ok=True)
        files = []
        for ext in ('.svg', '.webp'):
            source, output = selected.with_suffix(ext), destination.with_suffix(ext)
            output.write_bytes(source.read_bytes())
            assert sha(output) == sha(source)
            files.append({'source': output.relative_to(ROOT).as_posix(), 'sha256': sha(output)})
        cards[item_id].update(status='resolved', current={'src': '/' + destination.relative_to(ROOT).as_posix(),
            'note': f'Exact GM-approved Batch {number} selection, installed as SVG/WEBP.'})
        installed.append({'itemId': item_id, 'candidateId': feedback['items'][item_id]['candidateId'],
            'source': selected.relative_to(REVIEW).as_posix(), 'sourceSha256': sha(selected), 'files': files})
    for entry in retained:
        cards[entry['itemId']]['status'] = 'resolved'
    remaining = sum(c.get('status') != 'resolved' for c in manifest['items'])
    manifest.update(title=f'Asset review · Batch {number} approved choices delivered; {remaining} awaiting revision', updated='2026-10-18')
    write(here / 'reviewed.json', {'date': '2026-10-18', 'batch': number, 'active': public_copy(snapshots)})
    write(here / 'reviewed-installed.json', {'date': '2026-10-18', 'batch': number, 'installed': installed,
        'keptCurrent': retained, 'approvedSubjects': len(installed) + len(retained), 'remainingSubjects': remaining})
    write(paths[0], manifest)
    assert all(p.read_bytes() == before[p] for p in paths[1:])
    check(number)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--batch', required=True, type=int)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    check(args.batch) if args.check else consume(args.batch)
