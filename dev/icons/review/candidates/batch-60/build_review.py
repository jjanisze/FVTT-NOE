from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REVIEW = ROOT.parent.parent
MANIFEST = REVIEW / "manifest.json"
FEEDBACK = REVIEW / "feedback.json"

REVISIONS = {
    "batch59-aktywny-system-obrony": ("aktywny_system_obrony_revision_b", "powered armor moves itself", "The servo frame visibly yanks its wearer into an awkward optimal defensive pose."),
    "batch59-ruch": ("ruch_revision_b", "organic Megator crushes a car", "Armadillo-like organic scales and a crushed car establish the creature's immense size."),
    "batch59-atak-mobsprzet": ("atak_mobsprzet_revision_b", "simplified turret robot", "One conventional crude tracked robot fires from a clean boxy turret."),
    "batch59-wrazliwosc-na-swiatlo": ("wrazliwosc_na_swiatlo_revision_b", "vicious rat turns from broad light", "The ugly rat turns its whole body away from a dominant wide flashlight cone."),
    "batch59-karabin-laserowy": ("karabin_laserowy_revision_b", "weapon-only laser rifle", "Only the crude industrial laser rifle remains, with no wielder or target."),
    "batch59-dmuchawka": ("dmuchawka_revision_b", "biological uncanny-valley blowgun", "A short fleshy tube grows from an almost-human face and launches one dart."),
}


def item(item_id: str, name: str, tier: str, context: str, request: str, atlas: str, slug: str, label: str):
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
            "label": f"Atlas {atlas.upper()} · {label}",
            "src": f"candidates/batch-60/{slug}.png",
            "note": request,
        }],
    }


NEW_ITEMS = [
    item("batch60-wymagania", "Wymagania", "Batch 60 · shared animal trait", "Poor feed or contaminated water can turn a healthy horse or war dog into a contaminated animal.", "A healthy horse and dog face clean feed and water while one contaminated bucket is rejected.", "a", "wymagania", "proper feed and water"),
    item("batch60-paszcza", "Paszcza", "Batch 60 · Megator and Neogator action", "A hit from the colossal jaws grapples and restrains a Huge or smaller target.", "One enormous mutant alligator jaw clamps around a restrained adult torso without gore.", "a", "paszcza", "colossal restraining jaws"),
    item("batch60-tylko-zwarcie", "Tylko zwarcie", "Batch 60 · zombie overlay trait", "The zombie cannot make ranged attacks even if its original host possessed them.", "One decayed zombie abandons a snapped rifle and lunges forward with both clawed hands.", "a", "tylko_zwarcie", "melee-only zombie"),
    item("batch60-siodme-poty", "Siódme poty", "Batch 60 · Detroit origin feature", "The character gains vehicle proficiency and drives vehicles fifty percent faster.", "Two calloused hands grip a battered steering wheel with speed streaks and two large sweat drops.", "b", "siodme_poty", "hard-driving vehicle skill"),
    item("batch60-fart", "Fart", "Batch 60 · Vegas origin feature", "After rolling a natural one, the character may reroll it once per short rest.", "One battered twenty-sided die escapes a spike trap along one thick reroll arrow.", "b", "fart", "lucky reroll"),
    item("batch60-ja-juz-swoje-odchorowalem", "Ja już swoje odchorowałem", "Batch 60 · Miami origin feature", "The character has advantage on Constitution saving throws.", "A scarred survivor stands steady while disease particles break against a chest-shaped shield.", "b", "ja_juz_swoje_odchorowalem", "hardened constitution"),
    item("batch60-grad-olowiu", "Grad ołowiu", "Batch 60 · Sztuczka", "Short bursts become part of the Attack action, allowing as many short bursts as attacks in the turn.", "One crude rifle fires three clearly separated short burst clusters in one direction.", "b", "grad_olowiu", "repeated short bursts"),
    item("batch60-cos-mi-tu-smierdzi", "Coś mi tu śmierdzi", "Batch 60 · Missisipi origin feature", "The character automatically senses mutants within nine metres and can identify one with a Perception test.", "A wary survivor follows two scent trails toward a mutant partly hidden behind broken cover.", "b", "cos_mi_tu_smierdzi", "mutant detection"),
    item("batch60-czas-patriotow", "Czas patriotów", "Batch 60 · New York origin feature", "Once per long rest, the character gains +5 to any ability check or saving throw.", "A weathered survivor makes a decisive effort beneath one battered flag with a plain star patch.", "b", "czas_patriotow", "decisive patriotic effort"),
    item("batch60-cwiczenie-czyni-mistrza", "Ćwiczenie czyni mistrza", "Batch 60 · Sztuczka", "The feature permanently improves one or two base attributes and can be selected repeatedly.", "A rugged adult repeats a heavy barbell lift through three stages beside one upward progress arrow.", "b", "cwiczenie_czyni_mistrza", "repeated training"),
    item("batch60-doktor-quinn", "Doktor Quinn", "Batch 60 · Texas origin feature", "The character gains Medicine proficiency and advantage on Medicine checks.", "One rugged field doctor uses forceps and a bandage on a large wounded forearm.", "b", "doktor_quinn", "field medicine expertise"),
    item("batch60-jesli-ma-silnik-to-ruszy", "Jeśli ma silnik, to ruszy", "Batch 60 · Detroit origin feature", "The character has advantage when building or repairing vehicles and gains mechanic-tool proficiency.", "A greasy mechanic hand turns a large wrench on a battered exposed engine as it ignites.", "b", "jesli_ma_silnik_to_ruszy", "reviving an engine"),
    item("batch60-pakowanie", "Pakowanie", "Batch 60 · Sztuczka", "The character doubles carrying capacity and can retrieve any backpack item as a free interaction.", "A gloved hand instantly pulls a large wrench from one overfilled rugged backpack.", "c", "pakowanie", "fast overloaded backpack"),
    item("batch60-patriota", "Patriota", "Batch 60 · Sztuczka", "The character improves one attribute and gains another feature from their origin list.", "A weathered survivor presses one hand to a battered regional flag patch and receives one additional skill token.", "c", "patriota", "additional origin feature"),
    item("batch60-wierze", "Wierzę", "Batch 60 · Salt Lake City origin feature", "Once per long rest, the player invents one small inexpensive object that the GM introduces into play.", "A desperate survivor believes in one practical canteen appearing above an empty palm.", "c", "wierze", "believed-in useful object"),
    item("batch60-wychuchana-spluwa", "Wychuchana spluwa", "Batch 60 · Appalachia origin feature", "One chosen firearm never jams and can be changed after a long rest.", "Two careful hands meticulously clean the open action of one battered pistol.", "c", "wychuchana_spluwa", "meticulously maintained gun"),
    item("batch60-zawziety-sukinkot", "Zawzięty sukinkot", "Batch 60 · Southern Hegemony origin feature", "Once per long rest, after dropping to zero hit points the character rises with one hit point on the next turn.", "One badly wounded adult pushes up from the ground beneath one thick upward arrow.", "c", "zawziety_sukinkot", "defiant return from zero"),
    item("batch60-urodzony-morderca", "Urodzony morderca", "Batch 60 · Southern Hegemony origin feature", "When a damage die rolls one, the character may reroll that die once.", "One brutal knife strike accompanies a one-pip damage die caught by a reroll arrow.", "c", "urodzony_morderca", "damage reroll"),
    item("batch60-mlynek", "Młynek", "Batch 60 · Piekarz ability", "With at least three enemies nearby, the fighter may attack every one of them with a melee weapon as a bonus action.", "One rugged fighter swings a steel bar through one broad circular sweep against three attackers.", "c", "mlynek", "three-target melee sweep"),
    item("batch60-kuchenny-terror", "Kuchenny Terror", "Batch 60 · Kucharka Irena trait", "Irena has advantage on Intimidation checks in her kitchen while holding a kitchen tool.", "One severe older cook grips a heavy cleaver in a kitchen doorway while an intruder recoils.", "c", "kuchenny_terror", "intimidating kitchen defender"),
    item("batch60-logika-roznoboczna", "Logika Różnoboczna", "Batch 60 · Pitagoras trait", "Pitagoras deals extra weapon damage with advantage or while an active ally stands beside the target.", "A tactical fighter strikes from a scalene triangular barrier while one ally holds the opposite corner.", "c", "logika_roznoboczna", "triangular flanking attack"),
]


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    feedback = json.loads(FEEDBACK.read_text(encoding="utf-8"))
    by_id = {entry["id"]: entry for entry in manifest["items"]}

    for entry in manifest["items"]:
        saved = feedback["items"].get(entry["id"], {})
        if entry.get("status") != "resolved" and saved.get("decision") == "approve":
            entry["status"] = "resolved"

    for item_id, (slug, label, note) in REVISIONS.items():
        entry = by_id[item_id]
        entry.pop("status", None)
        candidate = {
            "id": "batch60-revision",
            "label": f"Revision B · {label}",
            "src": f"candidates/batch-60/{slug}.png",
            "note": note,
        }
        entry["candidates"] = [c for c in entry["candidates"] if c["id"] != candidate["id"]]
        entry["candidates"].append(candidate)

    new_ids = {entry["id"] for entry in NEW_ITEMS}
    manifest["items"] = [entry for entry in manifest["items"] if entry["id"] not in new_ids]
    manifest["items"].extend(NEW_ITEMS)
    manifest["title"] = "Batch 60 · 27 awaiting GM review"
    manifest["updated"] = "2026-10-10"

    active_ids = [*REVISIONS, *(entry["id"] for entry in NEW_ITEMS)]
    active_by_id = {entry["id"]: entry for entry in manifest["items"] if entry.get("status") != "resolved"}
    for item_id in active_ids:
        candidate_id = "batch60-revision" if item_id in REVISIONS else active_by_id[item_id]["candidates"][-1]["id"]
        feedback["items"][item_id] = {
            "itemId": item_id,
            "decision": "pending",
            "candidateId": candidate_id,
            "notes": "",
            "updatedAt": "2026-10-10T15:00:00.000Z",
        }

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    FEEDBACK.write_text(json.dumps(feedback, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    active = [entry for entry in manifest["items"] if entry.get("status") != "resolved"]
    (ROOT / "manifest-items.json").write_text(
        json.dumps({"title": manifest["title"], "updated": manifest["updated"], "items": active}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Prepared {len(active)} active review cards")


if __name__ == "__main__":
    main()
