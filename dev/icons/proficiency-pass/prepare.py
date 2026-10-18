"""Freeze Batch 112: genuine proficiency UI gaps, with approved-art fallbacks."""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'placeholder-pass'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'style-pass'))
from prepare_70_71 import ROOT, REVIEW, GENERAL, read, write, sha
from snapshot import contact

SUBJECTS = [
    ('akrobatyka', 'Akrobatyka', 'skills.akr', 'icons/abilities/sportowiec.svg',
     'ONE complete generic adult in plain close-fitting practical clothes performing a compact CARTWHEEL. Both arms straight, ONE palm planted on the ground, other arm extended, both legs clearly separated overhead. Featureless head, natural adult proportions. A clean complete human acrobat silhouette, no animal, facial detail, hair strands, costume, motion trails or extra limbs.'),
    ('historia', 'Historia', 'skills.his', 'icons/abilities/przedwojenna-edukacja.svg',
     'ONE broad CLOSED HISTORY BOOK with a simple stout spine, paired with ONE large simple HOURGLASS in front at lower right. Hourglass has broad top and bottom and TWO triangular sand masses separated by a black gap. No lettering, page texture, medical cross, engineering diagram, magic symbol or ornate book decoration.'),
    ('intuicja', 'Intuicja', 'skills.int', 'icons/abilities/wyczulone-zmysly.svg',
     'ONE smooth generic adult HEAD IN PROFILE facing RIGHT, containing ONE large simple EYE and ONE broad question-mark-like curved black negative-space cut ABOVE the eye inside the head, suggesting a quiet hunch. Ordinary head and neck, no beard, hair texture, wrinkles, incoming bullets, psychic aura, glow, floating symbols or fantasy crystal.'),
    ('pojazdy', 'Pojazdy', 'skills.poj', 'icons/abilities/kaskader.svg',
     'ONE large complete utilitarian THREE-SPOKE STEERING WHEEL viewed straight on, gripped at left and right by TWO complete plain adult hands. Coherent fingers wrapped around rim, stout spokes and central hub. Vehicle driving skill, no car body, dashboard, logo, tiny controls, speed lines or machinery repair.'),
    ('zastraszanie', 'Zastraszanie', 'skills.zas', 'icons/abilities/poddaj-sie.svg',
     'ONE large adult CLENCHED FIST in foreground at LEFT, with a simple sleeve cuff, facing ONE smaller generic adult HEAD AND SHOULDERS at RIGHT recoiling slightly away. The smaller head has only ONE broad eye cut and no hair detail. Threatening posture without contact or injury. Broad coherent anatomy; no monster, devil, skull, fangs, weapon, blood, gruff male portrait or anime expression.'),
    ('zwinne-dlonie', 'Zwinne dłonie', 'skills.zwi', 'icons/items/loot/zetony.svg',
     'ONE complete bare adult HAND dexterously rolling ONE large plain COIN across the knuckles. Back of hand visible, fingers slightly bent and clearly separated with broad black gaps, thumb complete. The single coin is balanced above two knuckles, a simple white disc with one broad black rim cut. No currency symbols, digits, pistol, knife, extra hands, extra coins or tiny skin detail.'),
    ('umiejetnosci', 'Umiejętności / biegłości mieszane', 'traits.skills + mixed Trait', 'icons/abilities/ucz-sie-ucz.svg',
     'ONE broad OPEN PRACTICAL INSTRUCTION BOOK, viewed from the front with two white page blocks separated by ONE broad central black fold. ONE large white CHECKMARK overlaps its lower-right corner, separated from the page by a thick black outline gap. Only TWO broad black page lines. General learned skills and proficiency, no lettering, magic, medical cross, specific tool, ornate border or tiny marks.'),
    ('rzuty-obronne', 'Rzuty obronne — nagłówek', 'traits.saves', 'icons/abilities/kuloodporny.svg',
     'ONE broad plain utilitarian SHIELD in front view, with ONE large thick white CURVED DEFLECTION STROKE sweeping around its upper-right edge and ending in a stout simple arrowhead pointing away. Clear black gap between shield and stroke. General successful resistance / avoidance, a sober functional protective symbol. No person, bullets, sword, heraldry, cross, rivets, fantasy ornament or fine lines.')
]


def main():
    here = REVIEW / 'candidates/batch-112'
    assert not here.exists(), 'Batch already allocated'
    assert '**Next batch number: 112**' in (ROOT / 'dev/icons/MISSING.md').read_text(encoding='utf-8')
    (here / 'raw').mkdir(parents=True)
    styles = ['icons/items/drugs/medpak.svg', 'icons/weapons/klucz_francuski.svg',
              'icons/items/loot/kompas.svg', 'icons/abilities/wyczulone-zmysly.svg',
              'icons/abilities/cichy-krok.svg', 'icons/weapons/magnifying_glass.svg',
              'icons/abilities/sportowiec.svg', 'icons/abilities/ucz-sie-ucz.svg', 'icons/abilities/oswajanie-zwierzat.svg']
    contact(styles, here / 'raw/style-reference.png')
    subjects = []
    for index, (key, name, wiring, fallback, request) in enumerate(SUBJECTS):
        target = f'icons/proficiencies/{key}.svg'
        assert not (ROOT / target).exists()
        subjects.append({'cell': index + 1, 'kind': 'proficiency', 'key': key, 'name': name,
            'itemId': f'proficiency-{key}', 'target': target, 'wiringKey': wiring, 'fallback': fallback,
            'fallbackSha256': sha(ROOT / fallback), 'request': request,
            'context': f'Native character creation, advancement and trait UI: {name}; 16–64 px beside Polish labels. {wiring}.',
            'deliveryTargets': [{'source': target, 'sourceSha256': None, 'variant': 'default'}]})
    prompt = GENERAL.replace('exactly NINE separate equal cells', 'exactly EIGHT active glyphs in NINE equal cells')
    prompt = prompt.replace('No playful arrows,', 'No decorative arrows,')
    prompt += 'REFERENCE IMAGE supplies the broad white-glyph STYLE ONLY, not the subjects. Generate the following new subjects.\nROW-MAJOR CONTENTS:\n'
    prompt += '\n'.join(f"{s['cell']}. {s['name']}: {s['request']}" for s in subjects)
    prompt += '\nCELL 9 (bottom-right) MUST REMAIN PURE BLACK AND COMPLETELY EMPTY. No glyph, label or decoration.'
    write(here / 'batch.json', {'date': '2026-10-18', 'batch': 112, 'pass': 'proficiency-ui',
        'partialAtlas': True, 'emptyCells': [9], 'subjects': subjects})
    write(here / 'prompts.json', {'date': '2026-10-18', 'generator': 'OpenAI built-in image generation',
        'reference': 'raw/style-reference.png', 'atlas': prompt, 'targetedCorrections': []})
    write(here / 'style-reference.json', {'role': 'Style only; approved broad native glyphs',
        'sources': [{'source': source, 'sha256': sha(ROOT / source)} for source in styles]})
    print('Prepared eight proficiency subjects; cell 9 empty; approved fallbacks untouched.')


if __name__ == '__main__':
    main()
