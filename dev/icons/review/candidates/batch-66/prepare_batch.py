"""Prepare eight revisions, one isolated fresh redraw and the last seven canonical feats."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
saved = json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]
catalog = json.loads((HERE / "catalog.json").read_text(encoding="utf-8"))["catalog"]

requests = [
    ("batch64-barbarka", "barbarka_revision_c", "Raise the LEFT attacker's head relative to the right victim by about one-third of a head height, until the center of the attacker's FOREHEAD just above his eyebrows contacts the RIGHT victim's NOSE bridge/tip. Forehead-to-nose is the ONLY contact point, never jaw, chin or forehead-to-forehead. Keep the left attacker leaning forward, right victim recoiling, two asymmetric complete head profiles and one small impact mark at the victim's nose. No gore."),
    ("batch64-mistrz-walki-wrecz", "mistrz-walki-wrecz_revision_c", "Keep the exact two-forearm, two-hand wrist-grapple pose. Remove ONLY the unnecessary BLACK LINE across the lower gripping hand's wrist, so that hand joins its own forearm in ONE CONTINUOUS WHITE silhouette. Retain the useful separation of the opponent's wrist from the gripping fingers. No severed wrist, bracelet/seam at that wrist, extra hand or altered grip."),
    ("batch65-padnij-powstan", "padnij-powstan_revision_b", "Keep the rising survivor's kneeling-to-standing pose and whole body. ADD two simple broad directional arrows: a DOWNWARD arrow beside the left shoulder toward the ground indicates dropping prone, and an UPWARD arrow beside the right shoulder indicates immediately getting up. Each arrow has one clear arrowhead and one short shaft, separated from the person. These arrows are explicitly requested; no duplicate ghost bodies, labels or decorative symbols."),
    ("batch65-pancerny", "pancerny_revision_b", "Keep the broad heavy armour breastplate and shoulder guards. Replace the straight impact marks with ONE round projectile ricocheting off the outer plate. Show an incoming diagonal path from upper-right toward the armour, then an outgoing path toward lower-right away from the SAME contact point: a clearly angled V/corner bounce, no straight I-shaped trajectory through the armour. Put the round ball on the outgoing path, one small contact burst on the plate, no penetration, shield, blood or text."),
    ("batch65-pan-plaster", "pan-plaster_revision_b", "Redraw from a slightly elevated three-quarter perspective so the PATIENT'S complete forearm, wrist and HAND remain visible. The forearm lies diagonally across the center; the patient's open hand with all five fingers is fully visible toward upper-right, naturally connected to the wrist. Two separate medic hands approach from lower-left and apply one broad dressing to the forearm. Keep a small open first-aid pouch below. Exactly three hands total, no amputated wrist, missing patient hand, merged glove, injury or blood."),
    ("batch65-pierwotny-instynkt", "pierwotny-instynkt_revision_b", "Keep the alert head turn, ready forearm and broad disturbance arcs. Replace the anime-like young face and spiky hair with a rugged MIDDLE-AGED adult survivor in a sober western utilitarian stencil style: close-cropped hair, realistic small watchful eye, firm brow, square natural jaw and restrained stubble. No manga/anime eyes, glossy hair spikes, cute youthful face, supernatural halo or exaggerated cartoon features."),
    ("batch65-siekierezada", "siekierezada_revision_b", "Cross the TWO FOREARMS/WRISTS into an X at the lower center, while the TWO HATCHETS remain separate and UPRIGHT at upper-left and upper-right. The forearm from lower-left reaches the hand at upper-right; the forearm from lower-right reaches the hand at upper-left. Exactly two complete hands each grip one hatchet. Both straight axe handles stay nearly vertical, never crossing each other; blades face outward. Broad black overlap contour at the crossed arms, no extra limb, crossed axe heads or gore."),
    ("batch65-szkolenie-w-broni", "szkolenie-w-broni_revision_b", "Remove ONLY the LOWEST supporting hand and its forearm from the selected knife-training icon. Keep the upper learner hand that firmly grips the knife, the upper instructor hand pointing toward the training post, and the complete solid post. Exactly TWO hands remain: one grips the knife, one points. No lower supporting wrist/stump, additional blade or other change.")
]
revisions = [{"itemId": item_id, "key": key, "atlas": "a", "request": request}
             for item_id, key, request in requests]
revisions.append({"itemId": "batch62-bebeszenie", "key": "bebeszenie_revision_e", "atlas": "a",
                  "isolated": True, "request": "Completely regenerate as an ISOLATED glyph with no defective prior image supplied. One intact real pair of combination pliers crosses one butcher knife below a simple rib outline. Both pliers handles must be fully visible, straight, continuous and symmetric below the pivot, pointing down at a small angle; neither handle may bend 90 degrees or join the knife. Two coherent jaws above one pivot. No animal skull, additional tool, hand or gore."})
returned = {item["id"] for item in saved if item["decision"] in ("revise", "reject")}
assert returned == {item["itemId"] for item in revisions}, "Saved returned set changed"

fresh_requests = [
    ("szkolenieWSrednimPancerzu", "One ordinary trainee secures a broad strap on a practical medium armour vest, with one hand pulling the strap and the other steadying it. Modest torso plates with flexible gaps and bare sleeve shoulders distinguish it from a massive heavy breastplate. Complete head-and-shoulder silhouette, two plausible hands, no ornate fantasy armour or floating shield."),
    ("szturmowiec", "One practical adult rifleman fires a controlled short burst while advancing in a compact standing stance. Two hands hold one ordinary assault rifle firmly, one small muzzle flash and two short restrained shot streaks. Complete head, arms and legs, no belt-fed heavy gun, cartoon soldier or tiny camouflage texture."),
    ("szybkiBill", "One generic athletic wasteland survivor takes a long, fast running stride, one leg extended forward and the other trailing, arms pumping naturally. Exactly one complete human body with two arms, two legs and sturdy boots. Ordinary clothes, no recognizable western or film character, giant arrows or cape."),
    ("uczSieUcz", "Two adult hands study an open practical manual on a simple desk beside one plain training tool. One hand holds a page, the other follows a broad blank diagram mark. Complete book, two hands and one small wrench; no readable writing, numbers, graduation cap, floating brain or giant cog."),
    ("ukrytyCel", "One anonymous rifleman aims past the edge of a broad broken cover slab toward one partially exposed opposing head-and-shoulder silhouette. The barrel clears the slab's edge; the target's head and one shoulder emerge beyond it. Two separate coherent figures, one rifle and one cover block, no crosshair overlay, transparency, labels or gore."),
    ("wrestler", "Two ordinary adult fighters in one anatomically coherent standing wrestling hold: one firmly controls the opponent's upper body from behind, two visible forearms wrap around the torso without covering the neck. The opponent bends forward and braces with two hands. Two complete heads and believable connected limbs; no extra hand, duplicated torso, ring ropes, franchise character or gore."),
    ("zlomiarz", "One practical salvager crouches beside a small tray of metal scrap and examines one useful alternator-like component with two hands. Clear head, two hands, one large useful part and three broad scrap shapes. Plain worn work clothes, no giant generic cog, unreadable clutter, value labels or coins.")
]
by_key = {item["key"]: item for item in catalog if item["kind"] == "feat"}
fresh = []
for key, request in fresh_requests:
    item = by_key[key]
    assert not item["represented"] and not item["existing"], key
    assert not (ROOT / item["proposed"]).exists(), key
    assert not (ROOT / "icons" / "abilities" / f"{key}.svg").exists(), key
    stem = Path(item["proposed"]).stem
    fresh.append({"key": stem, "catalogKey": key, "name": item["label"], "request": request,
                  "context": item["text"], "kind": "feat", "atlas": "b",
                  "target": item["proposed"], "itemId": f"batch66-{stem}"})
batch = {"batch": 66, "date": "2026-10-12", "revisions": revisions, "fresh": fresh}
(HERE / "batch.json").write_text(json.dumps(batch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Prepared Batch 66: eight reference edits, one isolated fresh redraw, seven final new Sztuczki")
