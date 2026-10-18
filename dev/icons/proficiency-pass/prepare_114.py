"""Freeze the GM's three coin-control variants and one different-concept backup."""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'placeholder-pass'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'style-pass'))
from prepare_70_71 import ROOT, REVIEW, GENERAL, read, write, sha
from snapshot import contact
from public_review import public_copy, feedback_hash

MOTIFS = [
    ('zwinne-dlonie-chwyt', 'Zwinne dłonie — precyzyjny chwyt',
     'COIN CONTROL VARIANT 1: ONE complete anatomically natural adult RIGHT HAND in three-quarter PALM view, precisely pinching ONE upright plain coin by its rim BETWEEN THE THUMB PAD AND INDEX FINGERTIP. Both pads visibly TOUCH opposite edges of the same coin; no gap, the coin is securely held. The middle, ring and little fingers curl gently toward the palm in three clearly distinct natural arcs, all three rounded fingertips still visible. Exactly four fingers plus one thumb, each growing from one coherent palm, stout wrist intact. Natural adult proportions, broad black separation, sparse cuts. No extra finger, missing finger, fused digit, dislocated joint, claw, flying coin, second coin, motion marks, text, currency mark, glove or nail detail.'),
    ('zwinne-dlonie-knykcie', 'Zwinne dłonie — przekładanie monety',
     'COIN CONTROL VARIANT 2: ONE complete anatomically natural adult RIGHT HAND viewed from the BACK at a shallow three-quarter angle, fingers loosely curled, FOUR distinct finger knuckles in a gentle descending row and ONE separate thumb at the side. ONE large plain coin is securely balanced ON AND IN CONTACT WITH the index and middle finger knuckles, tilted while being dexterously rolled from one knuckle to the next. The lower coin rim visibly touches BOTH supporting finger surfaces; no floating gap. Each of the four fingers follows a single coherent bend from its knuckle to its own visible rounded tip. One palm and one intact stout wrist. No extra digits, fused fingers, branching joint, pointed talon, airborne coin, second coin, arrow, speed line, texture, skin creases, nail detail or currency symbol.'),
    ('zwinne-dlonie-ukrycie', 'Zwinne dłonie — ukrycie w dłoni',
     'COIN CONTROL VARIANT 3: ONE complete adult RIGHT HAND in FRONT PALM view performing a controlled classic COIN PALM concealment. ONE plain coin lies FLAT AGAINST THE CENTER OF THE PALM; the gently bent RING AND LITTLE FINGERS overlap and hold its lower rim, visibly keeping it secure. The middle and index fingers extend loosely upward, thumb relaxed outward at the side. Exactly FOUR fingers and ONE thumb with natural bases and coherent joints, all five fingertip ends distinguishable. The coin is partially concealed by the fingers but its broad upper half remains visible; no airborne coin. One coherent palm, complete wrist, ordinary adult proportions. No fused or extra digits, twisted thumb, claw, skin texture, nail detail, duplicate coin, motion rays or text.'),
    ('zwinne-dlonie-rekaw', 'Zwinne dłonie — karta w rękawie (zapas)',
     'DIFFERENT-CONCEPT BACKUP, WITHOUT A VISIBLE HAND: ONE plain SHIRT SLEEVE CUFF, a compact folded fabric band seen at a three-quarter angle with ONE broad BLACK OPENING. ONE large PLAYING CARD is discreetly concealed inside the cuff, its upper half protruding diagonally from that opening. The card has ONE large BLACK SPADE cutout on its white face, no letter, numeral or tiny corner pip. A sober practical sleight-of-hand / cheating motif: an ace up the sleeve. Card is in firm contact with and visibly held inside the cuff, not falling or flying. Broad clear silhouettes, one fold cut only. No hand or arm beyond the short cuff, coin, face, ornament, magical aura, smoke, stars, logo or writing.')
]


def main():
    here = REVIEW / 'candidates/batch-114'
    assert not here.exists(), 'Batch already allocated'
    assert '**Next batch number: 114**' in (ROOT / 'dev/icons/MISSING.md').read_text(encoding='utf-8')
    prior = REVIEW / 'candidates/batch-113'
    original = next(s for s in read(prior / 'batch.json')['subjects'] if s['itemId'] == 'proficiency-zwinne-dlonie')
    saved = next(s for s in read(prior / 'reviewed.json')['active'] if s['id'] == original['itemId'])
    feedback = read(REVIEW / 'feedback.json')['items'][original['itemId']]
    assert saved['decision'] == 'revise' and feedback_hash(feedback) == saved['feedbackSha256']
    assert public_copy(feedback) == saved['feedback']
    assert sha(REVIEW / saved['selectedSource']) == saved['sourceSha256']
    assert not (ROOT / original['target']).exists()
    (here / 'raw').mkdir(parents=True)
    styles = read(prior / 'style-reference.json')['sources']
    assert all(sha(ROOT / s['source']) == s['sha256'] for s in styles)
    contact([s['source'] for s in styles], here / 'raw/style-reference.png')
    (here / 'raw/rejected-selected.png').write_bytes((REVIEW / saved['selectedSource']).read_bytes())
    subjects = [dict(original, key=key, name=name, request=request, revisionOf=saved, cell=i + 1)
                for i, (key, name, request) in enumerate(MOTIFS)]
    prompt = GENERAL.replace('exactly NINE separate equal cells', 'exactly FOUR active glyphs in NINE equal cells')
    role = ('Reference 1 supplies WHITE-GLYPH STYLE ONLY. These FOUR alternatives are for ONE Sleight of Hand skill: three different controlled coin-manipulation poses, and one sleeve-card backup. '
            'The previous open hand tossing a coin was rejected because it looks clumsy. DO NOT toss or drop any coin. Every coin must be physically HELD or TOUCHING a supporting finger or palm. '
            'Anatomy is central: each hand has exactly four fingers and one thumb with natural joints; do not hide anatomical mistakes behind extra strokes. ')
    prompt += role + '\nROW-MAJOR CONTENTS:\n' + '\n'.join(f"{s['cell']}. {s['name']}: {s['request']}" for s in subjects)
    prompt += '\nCELLS 5, 6, 7, 8 AND 9 MUST REMAIN PURE BLACK AND COMPLETELY EMPTY. Only FOUR active glyphs, no filler, labels or decoration.'
    write(here / 'batch.json', {'date': '2026-10-18', 'batch': 114, 'pass': 'sleight-of-hand-options',
        'partialAtlas': True, 'emptyCells': [5, 6, 7, 8, 9], 'subjects': subjects})
    write(here / 'prompts.json', {'date': '2026-10-18', 'generator': 'OpenAI built-in image generation',
        'reference': 'raw/style-reference.png', 'role': role, 'atlas': prompt, 'targetedCorrections': []})
    write(here / 'style-reference.json', {'sources': styles, 'rejectedSelected': {'source': saved['selectedSource'],
        'sha256': saved['sourceSha256'], 'role': 'Archived negative example; not supplied as a pose to copy'}})
    write(here / 'revision-feedback-before.json', {original['itemId']: saved['feedback']})
    receipts = [read(REVIEW / f'candidates/batch-{n}/reviewed-installed.json') for n in (112, 113)]
    write(here / 'incoming.json', {'productionFiles': [f for r in receipts for e in r['installed'] + r['keptCurrent'] for f in e['files']],
        'expectedAbsent': [original['target']]})
    print('Batch 114: three controlled coin-hand variants plus the requested different-concept backup; one review card.')


if __name__ == '__main__':
    main()
