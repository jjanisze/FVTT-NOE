from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REVIEW = ROOT.parent.parent
MANIFEST = REVIEW / "manifest.json"
FEEDBACK = REVIEW / "feedback.json"

REVISIONS = {
    "batch59-ruch": ("ruch_revision_c", "faster organic Megator", "Irregular scales, a crushed car and three bold speed streaks."),
    "batch59-karabin-laserowy": ("karabin_laserowy_revision_c", "simplified laser rifle", "Only the weapon remains, reduced to a clean industrial silhouette."),
    "batch60-cwiczenie-czyni-mistrza": ("cwiczenie_czyni_mistrza_revision_b", "two-stage training", "Only the preparation and completed lift remain beneath one progress arrow."),
    "batch60-grad-olowiu": ("grad_olowiu_revision_b", "single muzzle flash", "One muzzle flash launches a dense fan of bullets and long streaks."),
    "batch60-ja-juz-swoje-odchorowalem": ("ja_juz_swoje_odchorowalem_revision_b", "simplified disease resistance", "A shield blocks three disease particles from a scarred survivor."),
    "batch60-jesli-ma-silnik-to-ruszy": ("jesli_ma_silnik_to_ruszy_revision_b", "simplified engine repair", "One wrench, one engine block and one ignition spark."),
    "batch60-pakowanie": ("pakowanie_revision_b", "putting an item into the pack", "The hand and bold arrow clearly push the wrench inward."),
    "batch60-paszcza": ("paszcza_revision_b", "struggling inside the jaws", "The trapped adult visibly pushes against the enormous jaws."),
    "batch60-patriota": ("patriota_revision_b", "left-shoulder patch", "The flag patch sits on the left shoulder of a simplified uniformed torso."),
    "batch60-urodzony-morderca": ("urodzony_morderca_revision_b", "clean knife reroll", "Clean knife, one-pip die and a single reroll arrow with no dithering."),
    "batch60-wychuchana-spluwa": ("wychuchana_spluwa_revision_b", "two careful white gloves", "One gloved hand holds the pistol while the other wipes it with a cloth."),
    "batch60-zawziety-sukinkot": ("zawziety_sukinkot_revision_b", "grizzled man rising", "A wounded grizzled man forcefully rises beneath one arrow."),
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
            "src": f"candidates/batch-61/{slug}.png",
            "note": request,
        }],
    }


NEW_ITEMS = [
    item("batch61-na-symulatorach-to-dzialalo", "Na symulatorach to działało", "Batch 61 · Posterunek origin feature", "The character gains two proficiencies chosen from vehicles, technology, mechanic tools and electronic tools.", "Two hands work a battered steering wheel while a small simulator screen repeats the wheel silhouette.", "b", "na_symulatorach_to_dzialalo", "vehicle simulator training"),
    item("batch61-telepata", "Telepata", "Batch 61 · Vegas origin feature", "The character gains Insight proficiency and advantage on Insight checks.", "One wary profile reads another person's expression through one bold eye and a short mental signal.", "b", "telepata", "reading another person"),
    item("batch61-przycelowanie", "Przycelowanie", "Batch 61 · Sztuczka", "The character can target a specific body part or component at increased hit difficulty for a special effect.", "One rifle sight crosshair locks onto the knee of a running human silhouette.", "b", "przycelowanie", "deliberate called shot"),
    item("batch61-samuraj", "Samuraj", "Batch 61 · Sztuczka", "The character improves bladed attacks, draws a finesse slashing weapon freely and gains protection while wielding it.", "Two hands rapidly draw one slim blade from its scabbard in a strong diagonal sweep.", "b", "samuraj", "rapid blade draw"),
    item("batch61-nowka-sztuka", "Nówka sztuka", "Batch 61 · Asgard origin feature", "The character leaves the bunker with one chosen item worth at most 100 gamble.", "One pristine new pistol rises from an opened sealed bunker equipment crate.", "b", "nowka_sztuka", "pristine bunker equipment"),
    item("batch61-przedwojenna-edukacja", "Przedwojenna edukacja", "Batch 61 · Asgard origin feature", "The character has advantage on Intelligence checks about the prewar world and gains one tool proficiency.", "One intact open technical manual shows a bridge diagram with one solid wrench across the other page.", "b", "przedwojenna_edukacja", "prewar technical education"),
    item("batch61-nano-tech", "Nano-Tech", "Batch 61 · Asgard origin feature", "The character has advantage when building or repairing electronics and gains electronic-tool proficiency.", "A large circuit board is repaired by a precision probe and soldering tip with only a few thick traces.", "c", "nano_tech", "precision electronics repair"),
    item("batch61-dieta-cud", "Dieta cud", "Batch 61 · Człowiek Pustyni origin feature", "The character needs fewer daily supplies, receives twice as much healing and gains cook-tool proficiency.", "A small ration and canteen restore a sturdy torso marked by one plain medical cross.", "c", "dieta_cud", "efficient desert diet"),
    item("batch61-duch-pustyni", "Duch pustyni", "Batch 61 · Człowiek Pustyni origin feature", "The character has advantage on Stealth and Survival checks in deserts and sandy terrain.", "One hooded scout crouches behind a dune and partly blends into its contour.", "c", "duch_pustyni", "desert stealth"),
    item("batch61-polegam-tylko-na-sobie", "Polegam tylko na sobie", "Batch 61 · Człowiek Pustyni origin feature", "The character gains smith-tool proficiency and improves attacks made with self-crafted melee or thrown weapons.", "One hand forges a practical knife on an anvil with one hammer and three sparks.", "c", "polegam_tylko_na_sobie", "self-forged weapon"),
    item("batch61-ale-jazda", "Ale jazda!", "Batch 61 · Detroit origin feature", "The character ignores attack disadvantage while shooting from a moving vehicle, mount or during a fall.", "One survivor fires a compact firearm from a speeding rugged motorcycle.", "c", "ale_jazda", "shooting from a moving vehicle"),
    item("batch61-gornik-z-dziada-pradziada", "Górnik z dziada pradziada", "Batch 61 · Appalachia origin feature", "The character has advantage on Strength Athletics checks and doubles carrying capacity.", "One powerful miner carries a huge ore sack and grips one pickaxe.", "c", "gornik_z_dziada_pradziada", "powerful miner"),
    item("batch61-szlachetne-urodzenie", "Szlachetne urodzenie", "Batch 61 · Appalachia origin feature", "The character gains two social or historical proficiencies.", "One composed survivor in a battered formal coat raises a signet-ring hand.", "c", "szlachetne_urodzenie", "restrained inherited authority"),
    item("batch61-czlowiek-aligator", "Człowiek-aligator", "Batch 61 · Miami origin feature", "The character gains a swimming speed equal to their normal speed.", "One powerful human swimmer makes a crawl stroke beside a blunt alligator tail and one wake.", "c", "czlowiek_aligator", "powerful swimmer"),
    item("batch61-wloczykij", "Włóczykij", "Batch 61 · Miami origin feature", "Wetlands and broad sands are no longer difficult terrain, and the character gains cartographer-tool proficiency.", "One rugged boot strides from reed marsh into a sand dune with a rolled map strapped above it.", "c", "wloczykij", "traveller across marsh and sand"),
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
            "id": "batch61-revision",
            "label": f"Batch 61 revision · {label}",
            "src": f"candidates/batch-61/{slug}.png",
            "note": note,
        }
        entry["candidates"] = [candidate, *[c for c in entry["candidates"] if c["id"] != candidate["id"]]]

    new_ids = {entry["id"] for entry in NEW_ITEMS}
    manifest["items"] = [entry for entry in manifest["items"] if entry["id"] not in new_ids]
    manifest["items"].extend(NEW_ITEMS)

    active_ids = [*REVISIONS, *(entry["id"] for entry in NEW_ITEMS)]
    current = {entry["id"]: entry for entry in manifest["items"]}
    inactive = [entry for entry in manifest["items"] if entry["id"] not in active_ids]
    manifest["items"] = [*inactive, *(current[item_id] for item_id in active_ids)]
    manifest["title"] = "Batch 61 · 27 awaiting GM review"
    manifest["updated"] = "2026-10-11"

    for item_id in active_ids:
        candidate_id = "batch61-revision" if item_id in REVISIONS else current[item_id]["candidates"][0]["id"]
        feedback["items"][item_id] = {
            "itemId": item_id,
            "decision": "pending",
            "candidateId": candidate_id,
            "notes": "",
            "updatedAt": "2026-10-11T00:00:00.000Z",
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
