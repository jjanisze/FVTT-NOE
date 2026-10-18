"""Freeze three saved revision requests, with two requested Intimidation alternatives."""
import sys
from pathlib import Path
from PIL import Image
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'placeholder-pass'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'style-pass'))
from prepare_70_71 import ROOT, REVIEW, GENERAL, read, write, sha
from snapshot import contact
from public_review import public_copy, feedback_hash

MOTIFS = [
    ('intuicja', 'intuicja', 'Intuicja — przeczucie',
     'A NEW GUT-INSTINCT concept, completely replacing the head with question mark. ONE generic adult shown waist-up in plain practical clothes, head turned slightly RIGHT, with ONE complete open hand resting over their UPPER ABDOMEN as if sensing something is wrong. Beside the torso at LEFT, ONE broad simple warning TRIANGLE with ONE large black exclamation-shaped cutout. The hand, sleeve and body remain anatomically coherent with broad simple folds only. Featureless generic adult head, natural proportions. A quiet hunch before conscious evidence; no question mark, eye symbol, magic, psychic glow, beard, hair detail or injury.'),
    ('zastraszanie', 'zastraszanie-twarz', 'Zastraszanie — groźna twarz',
     'FIRST REQUESTED ALTERNATIVE: ONE angry intimidating ADULT HUMAN FACE in a looming THREE-QUARTER VIEW, angled DOWN and slightly RIGHT toward someone below the frame. Broad heavy furrowed brow, narrowed ordinary eyes, firm downturned mouth and strong jaw; ONE plain cropped neck and shoulder silhouette. Convey menace through head angle and THREE broad black face cuts, not fine wrinkles. Sober rough adult human, realistic proportions. No other person or fist in this cell, no snarling monster, fangs, skull, gore, anime eyes, spiky hair, stipple, portrait texture or tiny scratches.'),
    ('zastraszanie', 'zastraszanie-kolnierz', 'Zastraszanie — chwyt za kołnierz',
     'SECOND REQUESTED ALTERNATIVE: TWO adult men shown from WAIST UP. A broad GRUFF MAN at LEFT grips the SHIRT COLLAR of a visibly SMALLER ADULT MAN at RIGHT with ONE hand, pulling that collar taut. His OTHER hand is raised as ONE clenched fist in a menacing threat. Exactly TWO complete arms and TWO hands belong to the larger man: collar-gripping hand and raised fist. The smaller adult recoils with shoulders drawn in and both hands lowered; an ordinary adult, NOT a child. One broad beard silhouette on the larger man, faces simplified to broad restrained cuts. Clear negative-space separation between heads, fist, forearms and torso. No contact from the fist, injury, blood, extra arms, hands, weapon, thin fingers, fine fabric texture or anime.'),
    ('zwinne-dlonie', 'zwinne-dlonie', 'Zwinne dłonie — poprawiona anatomia',
     'CORRECT Reference 2 while keeping its BARE HAND AND SINGLE COIN motif. Show ONE complete anatomically coherent RIGHT ADULT HAND from a clear BACK-OF-HAND THREE-QUARTER VIEW, wrist at lower-left and fingertips pointing upper-right. Exactly FOUR distinct fingers emerge in natural order from ONE palm, each with two coherent bends; ONE separate thumb emerges from the side of that same palm. Index and middle fingers slightly raised; ring and little fingers gently curled underneath with BOTH distinct rounded fingertips still visible. ONE plain coin rests across the index and middle KNUCKLES. Strong broad black separation between all visible digits. Keep the coin plain and round, generous negative space, broad clean shapes. No extra or fused fingers, branching finger, detached thumb, duplicated joint, impossible bend, glove, skin creases, currency text, nails or added coin.')
]


def main():
    here = REVIEW / 'candidates/batch-113'
    assert not here.exists(), 'Batch number already used'
    assert '**Next batch number: 113**' in (ROOT / 'dev/icons/MISSING.md').read_text(encoding='utf-8')
    prior = REVIEW / 'candidates/batch-112'
    batch = read(prior / 'batch.json')
    subjects = {s['key']: s for s in batch['subjects']}
    reviewed = {s['id']: s for s in read(prior / 'reviewed.json')['active']}
    feedback = read(REVIEW / 'feedback.json')['items']
    (here / 'raw').mkdir(parents=True)
    styles = read(prior / 'style-reference.json')['sources']
    assert all(sha(ROOT / s['source']) == s['sha256'] for s in styles)
    contact([s['source'] for s in styles], here / 'raw/style-reference.png')
    hand_source = REVIEW / reviewed['proficiency-zwinne-dlonie']['selectedSource']
    hand = Image.open(hand_source).convert('RGBA')
    hand_reference = Image.new('RGB', hand.size, 'black')
    hand_reference.paste(hand, (0, 0), hand)
    hand_reference.save(here / 'raw/hand-reference.png')
    frozen = []
    for original_key, key, name, request in MOTIFS:
        subject = dict(subjects[original_key])
        saved = reviewed[subject['itemId']]
        assert saved['decision'] == 'revise' and feedback_hash(feedback[subject['itemId']]) == saved['feedbackSha256']
        assert public_copy(feedback[subject['itemId']]) == saved['feedback']
        assert sha(REVIEW / saved['selectedSource']) == saved['sourceSha256']
        assert not (ROOT / subject['target']).exists()
        subject.update(key=key, name=name, request=request, revisionOf=saved, cell=len(frozen) + 1)
        frozen.append(subject)
    general = GENERAL.replace('exactly NINE separate equal cells', 'exactly FOUR active glyphs in NINE equal cells')
    role = ('Reference 1 is the approved broad WHITE-GLYPH STYLE ONLY. Reference 2 is the previously selected HAND AND COIN concept for CELL 4 ONLY: correct its anatomy as requested, not the other cells. Cells 2 and 3 are TWO DIFFERENT requested Intimidation choices. ')
    prompt = general + role + '\nROW-MAJOR CONTENTS:\n'
    prompt += '\n'.join(f"{s['cell']}. {s['name']}: {s['request']}" for s in frozen)
    prompt += '\nCELLS 5, 6, 7, 8 AND 9 MUST BE PURE BLACK AND COMPLETELY EMPTY. No marks, labels, symbols or decoration. There are only FOUR active glyphs.'
    write(here / 'batch.json', {'date': '2026-10-18', 'batch': 113, 'pass': 'proficiency-revisions',
        'partialAtlas': True, 'emptyCells': [5, 6, 7, 8, 9], 'subjects': frozen})
    write(here / 'prompts.json', {'date': '2026-10-18', 'generator': 'OpenAI built-in image generation',
        'reference': 'raw/style-reference.png', 'references': ['raw/style-reference.png', 'raw/hand-reference.png'],
        'role': role, 'atlas': prompt, 'targetedCorrections': []})
    write(here / 'style-reference.json', {'sources': styles, 'handReference': {'source': reviewed['proficiency-zwinne-dlonie']['selectedSource'], 'sha256': sha(hand_source)}})
    write(here / 'revision-feedback-before.json', {s['itemId']: s['revisionOf']['feedback'] for s in frozen})
    write(here / 'incoming.json', {'productionFiles': [f for e in read(prior / 'reviewed-installed.json')['installed'] for f in e['files']],
        'expectedAbsent': sorted({s['target'] for s in frozen})})
    print('Batch 113: three revision cards, four candidates; two requested Intimidation alternatives.')


if __name__ == '__main__':
    main()
