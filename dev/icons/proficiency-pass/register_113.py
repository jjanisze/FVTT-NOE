"""Append four revision candidates to three cards, retaining all older choices and decisions."""
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'placeholder-pass'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'style-pass'))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from public_review import public_copy, feedback_hash


def main():
    here = REVIEW / 'candidates/batch-113'
    assert not (here / 'registration.json').exists(), 'Already registered; preserve later GM feedback'
    batch, validation, incoming = (read(here / name) for name in ('batch.json', 'validated.json', 'incoming.json'))
    assert batch['batch'] == validation['batch'] == 113 and validation['validatedMasks'] == 4
    assert batch['partialAtlas'] and batch['emptyCells'] == [5, 6, 7, 8, 9]
    assert all(sha(ROOT / f['source']) == f['sha256'] for f in incoming['productionFiles'])
    assert all(not (ROOT / p).exists() for p in incoming['expectedAbsent'])
    paths = [REVIEW / name for name in ('manifest.json', 'feedback.json', 'style-feedback.json')]
    missing_file = ROOT / 'dev/icons/MISSING.md'
    before = {p: p.read_bytes() for p in paths + [missing_file]}
    manifest, feedback = read(paths[0]), read(paths[1])
    cards = {c['id']: c for c in manifest['items']}
    groups = defaultdict(list)
    for subject in batch['subjects']:
        groups[subject['itemId']].append(subject)
        assert sha(here / f"{subject['key']}.png") == validation['candidateHashes'][subject['key']]
        saved = subject['revisionOf']
        assert feedback_hash(feedback['items'][subject['itemId']]) == saved['feedbackSha256']
        assert public_copy(feedback['items'][subject['itemId']]) == saved['feedback']
        assert sha(REVIEW / saved['selectedSource']) == saved['sourceSha256']
    assert len(groups) == 3
    corrected_requests = {'zwinne-dlonie': 'Retain the bare hand / single coin motif. Correct the malformed claw with a coherent open five-digit hand deftly tossing one coin; all fingertips visible and separated. Exact targeted correction prompt is archived with the batch.'}
    timestamp = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    for item_id, subjects in groups.items():
        card = cards[item_id]
        assert card.get('status') != 'resolved'
        candidates = [{'id': 'batch113-' + s['key'], 'label': 'Batch 113 · ' + s['name'],
            'src': f"candidates/batch-113/{s['key']}.png", 'note': corrected_requests.get(s['key'], s['request'])} for s in subjects]
        assert not ({c['id'] for c in card['candidates']} & {c['id'] for c in candidates})
        card['candidates'] = candidates + card['candidates']
        card.update(batch=113, tier='Batch 113 · Proficiency revisions', request='\n\n'.join(corrected_requests.get(s['key'], s['request']) for s in subjects))
        feedback['items'][item_id] = {'itemId': item_id, 'decision': 'pending', 'candidateId': candidates[0]['id'], 'notes': '', 'updatedAt': timestamp}
    manifest.update(title='Batch 113 · three subjects / four candidates awaiting GM review', updated='2026-10-18')
    queue = before[missing_file].decode('utf-8').replace('\r\n', '\n')
    begin, end = '<!-- proficiency-batch-112:start -->', '<!-- proficiency-batch-112:end -->'
    start, finish = queue.index(begin), queue.index(end) + len(end)
    lines = ['<!-- proficiency-batch-113:start -->', '## A. Proficiency UI glyphs — 3 awaiting revision review', '',
        'Batch 113: four new candidates for three remaining subjects. Intimidation has',
        'two requested alternatives: a looming face and a collar-grab scene. Existing',
        'approved glyphs remain wired until the GM approves the replacements.', '',
        '| Subject | Missing SVG (+ WEBP) | Wiring |', '|---|---|---|']
    lines += [f"| {cards[item_id]['name']} | `{subjects[0]['target']}` | `{subjects[0]['wiringKey']}` |" for item_id, subjects in groups.items()]
    lines += ['', 'Generic prompts, exact selected sources and saved revision notes:',
        '`review/candidates/batch-113/`. Earlier candidates remain selectable.', '', '<!-- proficiency-batch-113:end -->']
    queue = queue[:start] + '\n'.join(lines) + queue[finish:]
    queue = queue.replace('**44 missing final images**', '**39 missing final images**').replace('8 proficiency glyphs awaiting review', '3 proficiency glyphs awaiting revision review')
    queue = queue.replace('**Next batch number: 113**. Batch 112: eight dedicated glyphs await GM review.',
        '**Next batch number: 114**. Batch 113: three subjects / four candidates await GM review.')
    for p, content in before.items():
        assert p.read_bytes() == content, 'Newer review arrived during registration'
    write(paths[0], manifest)
    write(paths[1], feedback)
    missing_file.write_text(queue, encoding='utf-8')
    write(here / 'manifest-items.json', {'title': manifest['title'], 'updated': '2026-10-18', 'items': [cards[k] for k in groups]})
    write(here / 'registration.json', {'date': '2026-10-18', 'batch': 113, 'revisionSubjects': 3, 'newCandidates': 4,
        'productionUnchanged': True, 'unrelatedDecisionsPreserved': True})
    assert paths[2].read_bytes() == before[paths[2]]
    print('Registered three revision cards / four candidates; older choices, five completed decisions and unrelated feedback preserved.')


if __name__ == '__main__':
    main()
