"""Append the four requested Sleight of Hand alternatives without replacing older candidates."""
import sys
from datetime import datetime, timezone
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'placeholder-pass'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'style-pass'))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from public_review import public_copy, feedback_hash


def main():
    here = REVIEW / 'candidates/batch-114'
    assert not (here / 'registration.json').exists(), 'Already registered; preserve newer feedback'
    batch, validation, incoming = (read(here / n) for n in ('batch.json', 'validated.json', 'incoming.json'))
    assert batch['batch'] == validation['batch'] == 114 and validation['validatedMasks'] == 4
    assert batch['partialAtlas'] and batch['emptyCells'] == [5, 6, 7, 8, 9]
    assert all(sha(ROOT / f['source']) == f['sha256'] for f in incoming['productionFiles'])
    assert all(not (ROOT / p).with_suffix(ext).exists() for p in incoming['expectedAbsent'] for ext in ('.svg', '.webp', '.png'))
    paths = [REVIEW / n for n in ('manifest.json', 'feedback.json', 'style-feedback.json')]
    missing_file = ROOT / 'dev/icons/MISSING.md'
    before = {p: p.read_bytes() for p in paths + [missing_file]}
    manifest, feedback = read(paths[0]), read(paths[1])
    item_id = 'proficiency-zwinne-dlonie'
    card = next(c for c in manifest['items'] if c['id'] == item_id)
    assert card.get('status') != 'resolved'
    for subject in batch['subjects']:
        assert subject['itemId'] == item_id and subject['target'] == card['target']
        assert sha(here / f"{subject['key']}.png") == validation['candidateHashes'][subject['key']]
        saved = subject['revisionOf']
        assert feedback_hash(feedback['items'][item_id]) == saved['feedbackSha256']
        assert public_copy(feedback['items'][item_id]) == saved['feedback']
        assert sha(REVIEW / saved['selectedSource']) == saved['sourceSha256']
    candidates = [{'id': 'batch114-' + s['key'], 'label': 'Batch 114 · ' + s['name'],
        'src': f"candidates/batch-114/{s['key']}.png", 'note': s['request']} for s in batch['subjects']]
    assert not ({c['id'] for c in card['candidates']} & {c['id'] for c in candidates})
    card['candidates'] = candidates + card['candidates']
    card.update(batch=114, tier='Batch 114 · Sleight of Hand alternatives',
        request='Three dexterous coin-control poses with the coin securely touching the hand, plus a different sleeve-card backup. Keep anatomy coherent and avoid an airborne/dropped coin. Earlier options remain available.')
    feedback['items'][item_id] = {'itemId': item_id, 'decision': 'pending', 'candidateId': candidates[0]['id'],
        'notes': '', 'updatedAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')}
    assert sum(c.get('status') != 'resolved' for c in manifest['items']) == 1
    manifest.update(title='Batch 114 · Sleight of Hand: three coin variants + one backup awaiting GM review', updated='2026-10-18')
    queue = before[missing_file].decode('utf-8').replace('\r\n', '\n')
    begin, end = '<!-- proficiency-batch-113:start -->', '<!-- proficiency-batch-113:end -->'
    start, finish = queue.index(begin), queue.index(end) + len(end)
    section = '\n'.join(['<!-- proficiency-batch-114:start -->', '## A. Proficiency UI glyph — 1 awaiting revision review', '',
        'Batch 114: three controlled coin-hand poses plus one different-concept',
        'sleeve-card backup, together on the remaining review card. The existing',
        'approved substitute stays wired until the GM selects and approves a design.', '',
        '| Subject | Missing SVG (+ WEBP) | Wiring |', '|---|---|---|',
        '| Zwinne dłonie | `icons/proficiencies/zwinne-dlonie.svg` | `skills.zwi` |', '',
        'Generic prompts, exact selected-source hash and saved revision notes:',
        '`review/candidates/batch-114/`. Earlier candidates remain selectable.', '', '<!-- proficiency-batch-114:end -->'])
    queue = queue[:start] + section + queue[finish:]
    queue = queue.replace('**39 missing final images**', '**37 missing final images**').replace('3 proficiency glyphs awaiting revision review', '1 proficiency glyph awaiting revision review')
    queue = queue.replace('**Next batch number: 114**. Batch 113: three subjects / four candidates await GM review.',
        '**Next batch number: 115**. Batch 114: four candidates for the last proficiency glyph await GM review.')
    for p, content in before.items():
        assert p.read_bytes() == content, 'Newer review arrived during registration'
    write(paths[0], manifest)
    write(paths[1], feedback)
    missing_file.write_text(queue, encoding='utf-8')
    write(here / 'manifest-items.json', {'title': manifest['title'], 'updated': '2026-10-18', 'items': [card]})
    write(here / 'registration.json', {'date': '2026-10-18', 'batch': 114, 'revisionSubjects': 1, 'newCandidates': 4,
        'productionUnchanged': True, 'unrelatedDecisionsPreserved': True})
    assert paths[2].read_bytes() == before[paths[2]]
    print('Registered four alternatives on the last card; 551 resolved cards and all unrelated decisions preserved.')


if __name__ == '__main__':
    main()
