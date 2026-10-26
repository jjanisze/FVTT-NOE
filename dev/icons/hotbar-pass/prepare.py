"""Freeze three alternatives for five player-hotbar subjects; never install art."""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REVIEW = ROOT / "dev/icons/review"
HERE = Path(__file__).resolve().parent
DATE = "2026-10-24"

SUBJECTS = {
    "kafar": {
        "name": "Kafar — ręczne narzędzie kolejowe",
        "target": "icons/weapons/kafar_piledriver.svg",
        "current": "icons/weapons/kafar_piledriver.svg",
        "context": "Broń Kafar, 15 kg, dwuręczna; pierwszy pasek Brutala. NOE s. 116, tabela broni białej. Oceniany przedmiot ma być ręcznym narzędziem udarowym inspirowanym koleją.",
        "request": "Obecny rysunek wygląda jak wielki młot. Trzy interpretacje ręcznego kafara oparte na ciężarze udarowym i prowadzeniu osiowym, bez poprzecznej głowicy młota. Historyczne kompletne maszyny są odniesieniem mechanizmu, nie rozmiarem broni.",
        "variants": [
            ("a", "Prostokątna baba", "ONE detached hand-held DROP RAM inspired by an old railway pile driver's iron monkey weight: a long massive rectangular iron body with a flat blunt axial striking end, TWO stout loop handles mounted lengthwise on opposite sides of its upper half, and a short solid closed top. Show the complete heavy implement diagonally, three-quarter view with only one broad black plane cut. The rectangular body is the ram itself, not a transverse hammer head. A practical two-handed 15 kg hand tool, no crane or track vehicle, no slender stick, no sledgehammer or mallet silhouette."),
            ("b", "Rurowy kafar", "ONE complete heavy MANUAL POST / PILE DRIVER: a stout elongated closed-top STEEL TUBE with TWO large D-shaped loop handles attached along opposite sides. A broad black oval at the lower axial mouth makes its hollow sliding-over-a-post function legible. Upright three-quarter diagonal view, compact all-metal two-handed tool, heavy industrial proportions. No long wooden shaft, no transverse hammer head, no gun barrel or trigger, no surrounding post, railway car, derrick, person or scenery."),
            ("c", "Ciężar z profilu szyny", "ONE complete improvised RAIL-SECTION HAND RAM: a short massive length of old I-profile railway rail used as an axial blunt driving weight. Its length is about four times its wide end, with one broad black longitudinal web cut and TWO sturdy squared loop grips welded lengthwise near its upper half. Show the complete tool diagonally with its broad blunt rail-profile striking end clearly visible at lower left. Railway iron, practical 15 kg two-handed industrial implement. No perpendicular hammer head, wooden handle, sharp blade, spear, fantasy ornament or complete railway machine.")
        ],
    },
    "unikanie": {
        "name": "Unikanie — człowiek",
        "target": "icons/actions/unikanie.svg",
        "current": "icons/abilities/pelna-obrona.svg",
        "context": "Ogólna akcja gracza: Unikanie [A], NOE s. 30. Nowy glif dla człowieka; dotychczas pożyczona Pełna obrona zachowuje własne zastosowanie.",
        "request": "Człowiek unika ciosu ruchem ciała. Nie maszyna, potwór, pancerz ani atak. Sylwetka musi różnić się od sprintu oraz od ostrożnego odwrotu.",
        "variants": [
            ("a", "Odchylenie tułowia", "ONE ordinary adult human in side view DODGING a close incoming blow by bending the upper torso backward, feet firmly planted apart, arms held close in a protective guard. ONE short thick horizontal strike streak passes through the empty space in front of the face, visibly missing it; it never touches the person. Whole body, natural proportions, clear torso bend, ordinary trousers and boots. No running stride, shield, wings, machine parts or attacker body."),
            ("b", "Zejście pod ciosem", "ONE ordinary adult human in three-quarter view DUCKING LOW under a close blow: bent knees, lowered head and shoulders, forearms protecting the face, both feet planted. ONE broad short horizontal strike mark passes well ABOVE the head with a generous black gap. The compact evasive crouch is the subject; complete body, calm featureless face, natural limbs. No second person, running, diving into cover, gun, wings or machinery."),
            ("c", "Unik w bok", "ONE ordinary adult human making a compact SIDE-SLIP DODGE in place: head and shoulders shifted sharply sideways over one bent supporting leg, the other foot braced, both elbows tucked in a defensive guard. ONE short diagonal incoming-strike streak passes through the vacated space beside the shoulder, missing the body. Front three-quarter full-body pose, no sprinting or retreating, no shield, weapon held by the human, monster anatomy or wings.")
        ],
    },
    "odstapienie": {
        "name": "Odstąpienie — człowiek",
        "target": "icons/actions/odstapienie.svg",
        "current": "icons/abilities/odstapienie.svg",
        "context": "Ogólna akcja gracza: Odstąpienie [A], dla Złodzieja także [B]. NOE s. 30 i 91. Odrębny glif człowieka; rysunek odlatującej istoty zostaje przy swoim oryginalnym zastosowaniu.",
        "request": "Ostrożne wycofywanie się z walki, twarzą do zagrożenia, na nogach. Bez harpii, skrzydeł, ucieczki sprintem i trafienia przeciwnika.",
        "variants": [
            ("a", "Krok wstecz z gardą", "ONE ordinary adult human carefully DISENGAGING from melee: body and head FACING RIGHT toward the threat, BOTH open hands raised defensively to the RIGHT, while the trailing foot takes a deliberate step BACK TO THE LEFT. Clearly bent guarding arms and a short balanced backward step, not a running stride. One short blunt threat-stroke at far right stops before the hands with a wide black gap. Full body, natural proportions, no contact, no wings, no sprinting, no arrows."),
            ("b", "Dystans od przeciwnika", "TWO small ordinary adult human silhouettes in a sober melee DISENGAGE diagram, separated by a very broad clear black gap. The LEFT person steps BACK LEFT while still FACING RIGHT with forearms in guard. The RIGHT person's one extended empty arm reaches toward the retreating person but CANNOT REACH them. Neither attacks successfully, neither falls. Simple complete anatomically natural bodies, no weapons, no arrow, shield, wings, animal or running posture."),
            ("c", "Kontrolowany odwrót", "ONE ordinary adult human in side profile making a CONTROLLED BACKWARD STEP: face and chest oriented LEFT toward danger, forearms held in a compact boxing guard on the LEFT, weight over a bent rear leg stepping RIGHT away from danger. The person looks toward the threat instead of toward their direction of travel. Whole figure in plain shirt, trousers and boots; generous negative space between arms, torso and legs. No headlong sprint, arrows, weapon, bird, wings, insect or machine.")
        ],
    },
    "przyspieszenie": {
        "name": "Przyspieszenie — człowiek",
        "target": "icons/actions/przyspieszenie.svg",
        "current": "icons/abilities/przyspieszenie.svg",
        "context": "Ogólna akcja gracza: Przyspieszenie [A], dla Złodzieja także [B]. NOE s. 29 i 91. To nie Bieganie. Nowy glif ruchu człowieka zamiast odlatującego owada.",
        "request": "Czytelny ludzki ruch naprzód: dynamiczna pozycja na nogach. Bez owada, skrzydeł, lotu, zwierzęcia, pojazdu i szczegółowego portretu.",
        "variants": [
            ("a", "Długi krok", "ONE ordinary adult human RUNNING FORWARD in a long powerful side-profile stride, torso leaning forward, front knee raised, rear leg extended, arms pumping in opposite directions. Whole figure fully visible, natural adult proportions, ordinary close-fitting shirt, trousers and boots, featureless face. Broad clear negative spaces between limbs. No weapon, bird, bee, wings, arrow, dust cloud or environment."),
            ("b", "Wybicie do przodu", "ONE ordinary adult human PUSHING OFF INTO A RUN: low forward-leaning torso, front knee driven forward, rear foot pushing off, two distinct naturally bent arms driving the motion. Three-quarter full-body view, all limbs and feet complete. TWO short broad horizontal speed strokes BEHIND the person only. Sober practical athletic motion, no wing, insect, animal, flying or floating human, arrow, gun or cape."),
            ("c", "Szybki marsz do biegu", "ONE ordinary adult human accelerating in a broad FORWARD RUNNING STRIDE seen in crisp side profile, chest oriented forward with elbows bent about ninety degrees, one boot extending forward and the other boot lifting behind. Torso slightly more upright than a sprinter's starting lunge. One plain small hip pouch only if needed to suggest a survivor, no loose straps or clothing details. Natural proportions, strong readable silhouette, no wings, bee, animal, vehicle, arrow or weapon.")
        ],
    },
    "ukrywanie-sie": {
        "name": "Ukrywanie się — człowiek",
        "target": "icons/actions/ukrywanie-sie.svg",
        "current": "icons/abilities/ukryty-cel.svg",
        "context": "Ogólna akcja gracza: Ukrywanie się [A], dla Złodzieja także [B]. NOE s. 21 i 91. Glif ma pokazywać ukrywającą się osobę, nie ostrzał celu przez osłonę.",
        "request": "Jedna osoba skrywa się za przeszkodą, z niską lub częściowo zasłoniętą sylwetką. Żadnej broni, strzelca, linii strzału ani penetracji osłony.",
        "variants": [
            ("a", "Za niską skrzynią", "ONE ordinary adult human CROUCHING QUIETLY BEHIND ONE LOW SOLID CRATE. The crate occupies the lower-right foreground, and the person's small bent head and rounded shoulder peek just above its LEFT edge; one tucked bent knee remains visible at the left. Person is clearly mostly concealed by the crate and NOT attacking. Simple broad stencil silhouettes and one large separating cut. NO gun, rifle, pistol, shooter, projectile, shooting line, second person or bullet penetration."),
            ("b", "Za narożnikiem", "ONE ordinary adult human HIDING BEHIND A TALL VERTICAL WALL EDGE: one broad upright wall slab at the RIGHT conceals most of the body, with just a small featureless head, one shoulder and one bent knee cautiously visible around the slab's LEFT edge. A quiet compact concealed posture, no weapon in either hand. Large simple shapes, no brick texture, no window, no gun, shooting, attacker, target reticle, bullet or penetration line."),
            ("c", "Nisko za gruzem", "ONE ordinary adult human KNEELING LOW BEHIND ONE BROAD BROKEN CONCRETE BARRIER with a single irregular upper edge. Only the bowed head, curved upper back and one tucked elbow emerge slightly above the near side; the barrier conceals the rest of the figure. The human is staying out of sight, not firing over cover. Very sparse two-element composition, broad black negative-space separation. No gun, aiming, enemy, second figure, bullet, projectile, crosshair, shooting-through-cover diagram, hatching or rubble texture.")
        ],
    },
}

COMMON = """Use case: stylized-concept / style-transfer. Asset: tiny tabletop hotbar glyph candidates. Create ONE square atlas in NINE EQUAL cells, a strict 3x3 row-major grid, without drawn grid lines or cell labels. PURE SOLID WHITE #FFFFFF silhouettes on perfectly clean PURE BLACK #000000. Reference 1 supplies the approved WHITE-GLYPH STYLE ONLY; do not copy its subjects. Each icon must fit in the central 60 percent of its own cell, leaving at least 20 percent black margin on every side. No part may cross a cell boundary. All human heads, feet, hands and tool ends must remain complete. Broad sober stencil shapes, generous large negative spaces, minimal featureless faces and natural adult anatomy, readable at 64, 32 and 16 px. No gray, shading, gradients, texture, hatching, dithering, speckles, distressed edges, thin hair or fabric detail, labels, initials, numerals, border or watermark. No anime, heroic faces, chibi, giant generic cogs, playful arrows, gore or monsters. This is a PLAYER HUMAN action set: no harpies, birds, bees, wings or machine anatomy. The three variants of a subject must offer genuinely distinct readable concepts or poses, not three copies. No pictorial text anywhere.
"""


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    batches = {115: ["kafar", "unikanie", "odstapienie"], 116: ["przyspieszenie", "ukrywanie-sie"]}
    assert not any((REVIEW / f"candidates/batch-{n}").exists() for n in batches), "Batch already exists; preserve it"
    source = REVIEW / "candidates/batch-114/raw/style-reference.png"
    production = []
    for item in SUBJECTS.values():
        path = ROOT / item["current"]
        production.append({"source": item["current"], "sha256": sha(path)})
    frozen = {"date": DATE, "subjects": SUBJECTS, "productionFiles": production,
        "reviewHashes": {name: sha(REVIEW / name) for name in ["manifest.json", "feedback.json", "style-feedback.json"]},
        "references": [
            {"url": "https://collection.sciencemuseumgroup.org.uk/objects/co49923/model-steam-pile-driver-scale-1-6", "role": "Historical 1893 pile driver: guided axial falling monkey weight, not a handheld sledgehammer."},
            {"url": "https://www.archiwum.gddkia.gov.pl/pl/a/25320/Proste-urzadzenie-Kafar", "role": "Historical Polish pile-driving equipment and falling-weight / guide mechanism."},
            {"url": "https://tornadowire.com/pro-strain-i-post-/pro-strain-i-post-handheld-post-driver-cxfx000015", "role": "Modern primary manufacturer reference for a real manual steel driver with two side handles. Not evidence of historical railway use."}
        ],
        "interpretation": "The 15 kg handheld weapon form is a proposed adaptation of the referenced ram mechanisms. No source is claimed to prove one exact canonical NOE shape. Three form studies are submitted for GM selection."}
    write(HERE / "incoming.json", frozen)
    atlases = []
    for number, keys in batches.items():
        here = REVIEW / f"candidates/batch-{number}"
        (here / "raw").mkdir(parents=True)
        shutil.copyfile(source, here / "raw/style-reference.png")
        subjects = []
        for key in keys:
            item = SUBJECTS[key]
            for variant, label, request in item["variants"]:
                subjects.append({"cell": len(subjects) + 1, "key": f"{key}-{variant}", "variant": variant,
                    "itemId": f"hotbar-2026-{key}", "name": f"{item['name']} — {label}",
                    "target": item["target"], "current": item["current"], "context": item["context"],
                    "request": request, "deliveryTargets": [{"source": item["target"],
                        "sourceSha256": sha(ROOT / item["target"]) if (ROOT / item["target"]).exists() else None,
                        "variant": "default"}]})
        batch = {"date": DATE, "batch": number, "pass": "player-hotbar-subject-corrections",
            "subjects": subjects}
        if len(subjects) < 9:
            batch.update(partialAtlas=True, emptyCells=list(range(len(subjects) + 1, 10)))
        prompt = COMMON + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['request']}" for s in subjects)
        if len(subjects) < 9:
            prompt += "\nCELLS 7, 8 AND 9 MUST BE PURE BLACK, COMPLETELY EMPTY. No filler symbols or decoration."
        write(here / "batch.json", batch)
        write(here / "incoming.json", frozen)
        write(here / "prompts.json", {"reference": "raw/style-reference.png", "atlas": prompt, "targetedCorrections": []})
        atlases.append({"batch": number, "prompt": prompt, "reference": str(here / "raw/style-reference.png")})
    print(json.dumps({"atlases": atlases}, ensure_ascii=False))


if __name__ == "__main__":
    main()
