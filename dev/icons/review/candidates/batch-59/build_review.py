from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REVIEW = ROOT.parent.parent
MANIFEST = REVIEW / "manifest.json"
FEEDBACK = REVIEW / "feedback.json"

REVISIONS = {
    "batch55-zamarcie": {
        "id": "batch59-revision",
        "label": "Revision E · startled recognition",
        "src": "candidates/batch-59/zamarcie_revision_e.png",
        "note": "The cleaner adult face now shows sudden recognition without dithering or manga exaggeration.",
    },
    "batch57-palcozerca": {
        "id": "batch59-revision",
        "label": "Revision C · right hand, missing thumb",
        "src": "candidates/batch-59/palcozerca_revision_c.png",
        "note": "A right hand has one thumb stump on the left edge and exactly four intact fingers on the right.",
    },
    "batch58-odstapienie": {
        "id": "batch59-revision",
        "label": "Revision B · sweeping retreat path",
        "src": "candidates/batch-59/odstapienie_revision_b.png",
        "note": "One broad arrow replaces the gap bars and carries the harpy away from the shooter.",
    },
    "batch58-skakun": {
        "id": "batch59-revision",
        "label": "Revision B · airborne landing posture",
        "src": "candidates/batch-59/skakun_revision_b.png",
        "note": "The spider is fully airborne with its legs prepared for landing and simple trailing lines.",
    },
    "batch58-skok": {
        "id": "batch59-revision",
        "label": "Revision B · arrowed jump arc",
        "src": "candidates/batch-59/skok_revision_b.png",
        "note": "The broad Bit-Boy jump arc now ends in a large arrowhead.",
    },
    "batch58-wycofanie-sie": {
        "id": "batch59-revision",
        "label": "Revision B · armored burrowing retreat",
        "src": "candidates/batch-59/wycofanie_sie_revision_b.png",
        "note": "A headless armed Biodroid backs into a cracked burrow with a single retreat arrow.",
    },
    "batch58-zmysly": {
        "id": "batch59-revision",
        "label": "Revision B · signals toward senses",
        "src": "candidates/batch-59/zmysly_revision_b.png",
        "note": "Arrowheads direct the sound and scent signals inward toward the ear and nose.",
    },
}


def item(item_id: str, name: str, tier: str, context: str, request: str, atlas: str, slug: str, note: str):
    return {
        "id": item_id,
        "name": name,
        "tier": tier,
        "context": context,
        "request": request,
        "current": {
            "src": None,
            "emptyLabel": "Current live icon\nupgrade.svg or portrait",
            "note": "Current imagery is generic or actor-specific.",
        },
        "candidates": [{
            "id": f"atlas-{atlas}",
            "label": f"Atlas {atlas.upper()} · {note}",
            "src": f"candidates/batch-59/{slug}.png",
            "note": request,
        }],
    }


NEW_ITEMS = [
    item("batch59-aktywny-system-obrony", "Aktywny system obrony", "Batch 59 · Richard Craddock reaction", "As a reaction, Craddock turns his thickest armor toward a ranged attack and gains +3 TT before damage is known.", "One rugged armored adult twists one dominant shoulder plate into the path of an incoming bullet.", "a", "aktywny_system_obrony", "rotated armor plate"),
    item("batch59-aura-pogardy", "Aura pogardy", "Batch 59 · Richard Craddock trait", "Thinking enemies within fifteen metres must save or make their first-turn attacks with disadvantage.", "One severe commander stands rigid while three nearby armed enemies hesitate and lower their weapons.", "a", "aura_pogardy", "intimidating commander"),
    item("batch59-mistrz-taktyki", "Mistrz taktyki", "Batch 59 · Richard Craddock trait", "Craddock has unconditional advantage on initiative rolls.", "One gloved hand moves a dominant marker across a stripped-down battlefield diagram with three large route arrows.", "b", "mistrz_taktyki", "battlefield initiative"),
    item("batch59-zasloniecie-helmu", "Zasłonięcie hełmu", "Batch 59 · Richard Craddock trait", "An automatic helmet closes, providing TT 20, thermal vision and a sealed environment.", "One heavy automatic faceplate snaps shut over a rugged armored helmet.", "b", "zasloniecie_helmu", "closing faceplate"),
    item("batch59-ruch", "Ruch", "Batch 59 · Megator action", "Megator, an alligator the size of a submarine, moves up to its speed.", "One colossal armored mutant alligator surges forward with three bold speed streaks.", "b", "ruch", "colossal alligator movement"),
    item("batch59-atak-mobsprzet", "Atak", "Batch 59 · Mobsprzęt action", "A d6 randomly determines the welded machine's chassis and weapon for the attack.", "One asymmetrical junk combat machine combines a buggy wheel, track, crude gun, blade and antenna.", "b", "atak_mobsprzet", "random junk-machine attack"),
    item("batch59-wrazliwosc-na-swiatlo", "Wrażliwość na światło", "Batch 59 · Mrokoszczur trait", "Sunlight blinds the metre-long rat; a torch enrages it and a strong halogen light frightens it.", "One huge ugly rat with bulging eyes recoils from one strong flashlight beam.", "b", "wrazliwosc_na_swiatlo", "light-sensitive rat"),
    item("batch59-prog-awarii", "Próg awarii", "Batch 59 · shared machine trait", "Mobsprzęt, Spawacz and Tarantula suffer consequences after reaching their malfunction threshold.", "One heavy machine housing splits at the same moment a simple warning gauge reaches its limit.", "b", "prog_awarii", "machine failure threshold"),
    item("batch59-tryb-turbo", "Tryb Turbo", "Batch 59 · Tarantula trait", "Three times per day Tarantula doubles speed, gains +2 AC and attacks with advantage for three rounds, then cools for one round.", "One six-legged industrial Tarantula combat machine lunges forward with speed bars and one heat plume.", "b", "tryb_turbo", "six-legged turbo machine"),
    item("batch59-wielonozny", "Wielonożny", "Batch 59 · Tarantula trait", "The multi-legged Tarantula ignores difficult terrain.", "One six-legged industrial Tarantula machine strides across a large broken concrete barrier.", "b", "wielonozny", "multi-legged obstacle crossing"),
    item("batch59-rozkaz-likwidacji", "Rozkaz Likwidacji", "Batch 59 · Major Lansdale action", "Twice per fight Lansdale quietly orders an ally within eighteen metres to use a reaction for one weapon attack.", "One stern officer points at a target while one nearby armed ally immediately fires along the command line.", "b", "rozkaz_likwidacji", "execution order"),
    item("batch59-szara-eminencja", "Szara Eminencja", "Batch 59 · Major Lansdale trait", "Lansdale has advantage when hiding in crowds or beside someone more conspicuous.", "One plain-coated adult man disappears in the negative space between two larger crowd silhouettes.", "c", "szara_eminencja", "hidden in a crowd"),
    item("batch59-zimna-krew", "Zimna Krew", "Batch 59 · Major Lansdale trait", "Lansdale is immune to the frightened condition.", "One stern weathered officer remains unmoved before a looming clawed fear silhouette.", "c", "zimna_krew", "unmoved by fear"),
    item("batch59-zywa-tarcza", "Żywa Tarcza", "Batch 59 · Major Lansdale reaction", "When targeted, Lansdale swaps with a willing ally within 1.5 metres and that ally becomes the target.", "One commander pulls one willing armored ally sideways into the path of an incoming bullet, with one swap arrow.", "c", "zywa_tarcza", "ally becomes the target"),
    item("batch59-twierdzenie-kata-prostego", "Twierdzenie Kąta Prostego", "Batch 59 · Pitagoras reaction", "Pitagoras makes a melee attack when a creature moves within 1.5 metres; on a hit its speed becomes zero.", "One armed guard strikes a hostile silhouette stepping around a large right-angle corner.", "c", "twierdzenie_kata_prostego", "corner interception"),
    item("batch59-taca-i-w-nogi", "Tacą i w nogi", "Batch 59 · Kelner action", "The waiter attacks with a serving tray, then Dashes and Dodges.", "One grim adult waiter swings a large metal tray into an attacker while already sprinting away.", "c", "taca_i_w_nogi", "tray strike and escape"),
    item("batch59-tylko-jedno-w-glowie-mam", "Tylko jedno w głowie mam", "Batch 59 · Motocyklista trait", "After more than three hours without Biały Węgorz, addiction imposes disadvantage on mental saves.", "One exhausted adult rider stares obsessively at a small ampoule held before the eye.", "c", "tylko_jedno_w_glowie_mam", "obsessive withdrawal"),
    item("batch59-karabin-laserowy", "Karabin laserowy", "Batch 59 · Biodroid weapon", "The headless upright Biodroid carries machine guns and uses a laser rifle as a dedicated attack.", "One headless armored worm Biodroid braces a crude industrial laser rifle firing one straight beam.", "c", "karabin_laserowy", "Biodroid laser rifle"),
    item("batch59-dmuchawka", "Dmuchawka", "Batch 59 · Szpieg III Generacji weapon", "A hit forces a Constitution save or leaves the target unconscious for ten minutes.", "One plain-clothed human spy fires a long blowgun and one struck target collapses.", "c", "dmuchawka", "sleep dart blowgun"),
    item("batch59-dzialo-ppanc", "Działo ppanc", "Batch 59 · Juggernaut weapon", "The Juggernaut integrates a human torso and heavy weapons into a tank-track lower body.", "One tank-bodied Juggernaut fires an enormous integrated anti-tank cannon.", "c", "dzialo_ppanc", "integrated anti-tank cannon"),
]


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    feedback = json.loads(FEEDBACK.read_text(encoding="utf-8"))
    by_id = {entry["id"]: entry for entry in manifest["items"]}

    for item_id, candidate in REVISIONS.items():
        entry = by_id[item_id]
        entry.pop("status", None)
        entry["candidates"] = [c for c in entry["candidates"] if c["id"] != candidate["id"]]
        entry["candidates"].append(candidate)

    new_ids = {entry["id"] for entry in NEW_ITEMS}
    manifest["items"] = [entry for entry in manifest["items"] if entry["id"] not in new_ids]
    manifest["items"].extend(NEW_ITEMS)
    manifest["title"] = "Batch 59 · 27 awaiting GM review"
    manifest["updated"] = "2026-10-10"

    active_ids = [*REVISIONS, *(entry["id"] for entry in NEW_ITEMS)]
    for item_id in active_ids:
        candidate_id = "batch59-revision" if item_id in REVISIONS else by_candidate(manifest, item_id)
        feedback["items"][item_id] = {
            "itemId": item_id,
            "decision": "pending",
            "candidateId": candidate_id,
            "notes": "",
            "updatedAt": "2026-10-10T12:00:00.000Z",
        }

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    FEEDBACK.write_text(json.dumps(feedback, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    active = [entry for entry in manifest["items"] if entry.get("status") != "resolved"]
    (ROOT / "manifest-items.json").write_text(
        json.dumps({"title": manifest["title"], "updated": manifest["updated"], "items": active}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Prepared {len(active)} active review cards")


def by_candidate(manifest: dict, item_id: str) -> str:
    entry = next(entry for entry in manifest["items"] if entry["id"] == item_id)
    return entry["candidates"][-1]["id"]


if __name__ == "__main__":
    main()
