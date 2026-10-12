"""Prepare eleven saved revisions and the next sixteen absent canonical Sztuczki."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
REVIEW = HERE.parents[1]


def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


revisions = [
    ("batch61-samuraj", "samuraj_revision_d", "a", "Keep the exact selected katana and sword hand. Change ONLY the empty off hand: palm faces upward, fingers slightly curled toward the viewer in a clear beckoning 'come here' gesture. Thumb stays distinct from four fingers; exactly two adult hands and one katana. No scabbard."),
    ("batch62-bebeszenie", "bebeszenie_revision_d", "a", "Completely REGENERATE this tool composition instead of copying the broken pliers. One normal pair of combination pliers crosses one broad butcher knife below a small clean rib-cage outline. Pliers have exactly two continuous straight handles, one central pivot and two short coherent jaws; the handles are thick straight bars, not hooks or zigzags. Knife has one solid blade and one straight handle. Keep the two tools separated by a broad black cutout at the crossing. No hand, gore or extra tools."),
    ("batch62-szabrowanie", "szabrowanie_revision_d", "a", "Keep the open crate and its full-size raised lid. Draw one complete crowbar leaning diagonally BESIDE the crate, with its flattened hooked tip fully visible and a continuous broad BLACK GAP between the entire crowbar and crate/lid. Do not show contact with the crate; distinct non-touching silhouettes are essential. Only one crate and one crowbar."),
    ("batch63-chodzmy-na-pewno-juz-utonal", "chodzmy-na-pewno-juz-utonal_revision_c", "a", "Keep the swimmer's improved pelvis and exactly two legs, head, waterline and one air bubble. Restore the missing hand: exactly two naturally connected arms, each ending in one complete adult hand, swimming forward. Separate the forward hands with broad negative space. No amputated wrist, additional arm, fused hands or fins."),
    ("batch63-zjadlem-wlasnego-psa", "zjadlem-wlasnego-psa_revision_c", "a", "Move a little closer to the butcher's face while showing his whole uncropped BALD head, heavy beard, stern expression, apron shoulders and raised axe hand. Replace the backwards hatchet head with a normal hatchet: straight short haft, solid eye seated on the haft, broad axe blade projects outward away from the man's head with the cutting edge facing outward. Keep the blade and hand complete. No hair, clipped skull or gore."),
    ("batch64-barbarka", "barbarka_revision_b", "a", "Make the headbutt visibly ASYMMETRIC. Left attacker bends forward and drives his forehead into the right victim's nose; right victim's head tilts back and recoils. Only the attacker delivers the blow. Different head angles and postures, one restrained impact burst at the victim's nose, two intact heads. No mirrored forehead-to-forehead pose, blood or gore."),
    ("batch64-benzyna-zamiast-krwi", "benzyna-zamiast-krwi_revision_b", "a", "Keep the driver gripping the steering wheel and the small protected car silhouette. Remove the seatbelt/diagonal torso strap completely. Change the driver's face to a wild menacing wide toothy grin with raised cheeks; a generic reckless wasteland driver, no recognizable game character or logo. Keep the head fully visible and the hands anatomically normal."),
    ("batch64-fachowiec", "fachowiec_revision_b", "a", "Keep the mechanic with wrench in one hand and pliers in the other above the workbench. Both upper arms descend naturally from their own shoulders, elbows bend outward and forearms connect to exactly two complete hands. Position both hands and tools ABOVE the bench with a broad black gap between the bench and each hand/tool. No hands growing out of the tabletop, disconnected arms or extra tools."),
    ("batch64-jest-zajebiscie", "jest-zajebiscie_revision_b", "a", "Preserve the speaker and two attentive allied head-and-shoulder silhouettes. Replace the raised open hand with one unambiguous THUMBS-UP: four fingers folded into a compact fist and one thumb pointing upward. Give the speaker a relaxed friendly smile and calm eyebrows. No pointing index finger, spread fingers, speech text or extra hand."),
    ("batch64-mistrz-walki-wrecz", "mistrz-walki-wrecz_revision_b", "b", "Rebuild the wrist grapple with correct anatomy: show exactly TWO opposing forearms and exactly TWO hands. One defender hand wraps its thumb and four fingers around the attacker's single wrist; the attacker's hand remains at the end of that forearm. Use a readable simple wrist control, with a broad black contour between gripping fingers and wrist. Omit other guard hands entirely. No extra hand pair, branching wrist or third forearm."),
    ("batch64-muzyk", "muzyk_revision_b", "b", "Keep the anonymous guitarist, plain acoustic guitar, left hand on the neck and right hand strumming. Replace ONLY the ambiguous lower-left blob with a clear audience member's head-and-shoulders silhouette, facing the musician and visibly separated by black space. Keep the other audience silhouette distinct. No extra musician leg, music notes, words or famous musician.")
]

fresh_prompts = [
    ("padnijPowstan", "One practical survivor rises from a low kneel into a ready stance, with one knee near the ground, the other foot planted and both hands clear. A single complete body conveys getting up quickly; no duplicate ghost figures or arrows."),
    ("pancerny", "One broad practical heavy armour breastplate and shoulder guards withstand one blunt incoming impact. Thick overlapping plates and a single small impact mark outside the armour. No person face, giant shield, logo or ornate fantasy armour."),
    ("panPlaster", "Two adult hands apply one broad adhesive medical dressing to a plain forearm beside a small open first-aid pouch. A practical medic gesture with one clear dressing and one pouch, no injury, blood, text or tiny medicine labels."),
    ("pewnaReka", "One steady adult shooter supports a practical rifle firmly with two hands, elbows braced on a low rest. Complete head and both hands, clear straight barrel and stock. Emphasize the stable shooting posture, no bullseye, floating crosshair or decorative badge."),
    ("pierwotnyInstynkt", "One alert survivor's head turns sharply toward a nearby simple disturbance contour, one ear and watchful eye visible in a spare profile. A broad raised forearm in a ready defensive gesture. No animal ears, extra eye, supernatural halo or tiny rays."),
    ("plugAndPlay", "One normal adult hand plugs a thick data cable into a rugged open laptop. A small tracked-machine silhouette appears on its otherwise blank screen, showing machine control. Exactly one cable connector and one hand, broad laptop keyboard shape, no letters or logo."),
    ("przydasie", "One adult hand selects a useful large bolt from a small open tray containing three distinct reusable scrap parts: bolt, metal bracket and wire coil. Real salvaged workshop pieces, one tray and one hand. No money symbols, giant cog or tiny clutter."),
    ("robinHood", "One generic wasteland archer aims a practical bow with exactly two hands, one on the grip and one drawing the string with a single nocked arrow. Complete head, bent bow limbs and clean string triangle. Plain clothing, no recognizable folklore or film character, feathered cap, target logo or text."),
    ("rodeo", "One ordinary rider stays seated on the back of a bucking horse, gripping a plain rein with one hand while the other steadies the posture. One complete horse and one rider with believable anatomy, broad bent legs, no cowboy franchise character or decorative lasso."),
    ("rozroba", "One rugged fighter swings one short melee club through a broad arc between THREE nearby opposing head-and-shoulder silhouettes. One attacker, one club, three opponents spaced clearly around him. No duplicate attacker arms, gore or tiny motion lines."),
    ("ruchomeGniazdoCkm", "One powerful survivor fires a heavy belt-fed machine gun from the hip, gripping the rear pistol grip and front support handle. Broad long barrel, solid receiver and short clearly linked ammunition belt; one restrained muzzle flash. Two hands, one gun, no turret vehicle or text."),
    ("siekierezada", "Two adult hands hold TWO practical matching hatchets in crossed combat positions. Each hatchet has one straight short handle and one broad coherent axe head with cutting edge facing away from its user's hand. Exactly two hands and two hatchets; no third blade, ornate axes or gore."),
    ("snajper", "One prone anonymous marksman aims a long practical scoped rifle resting on a low bipod. Broad body contour, two connected hands, one scope tube and one long barrel. Plain gear, no floating target/crosshair, badge or tiny camouflage marks."),
    ("szachista", "One broad chess king and one solid castle rook swap defensive positions behind a simple protective arc. Two sober recognizable chess silhouettes on a short base line; no checkerboard, letters, double-headed arrows or oversized cog."),
    ("szkolenieWBroni", "One learner's sturdy hands practice with a plain combat knife while an instructor's single guiding forearm points toward a solid training post. Clear knife blade, two learner hands and one instructor hand, no extra weapons, badges or text."),
    ("szkolenieWCiezkimPancerzu", "One practical trainee tightens a broad side strap on a heavy plate breastplate, with one hand drawing the strap and the other bracing a thick shoulder plate. Simple complete armour shape with massive plates, no face, fantasy ornament, logo or floating shield.")
]

catalog = json.loads((HERE / "catalog.json").read_text(encoding="utf-8"))["catalog"]
# Correct acronym boundaries (e.g. szkolenieWBroni -> szkolenie-w-broni) in the proposed path.
for item in catalog:
    stem = re.sub(r"([A-Z])([A-Z][a-z])", r"\1-\2", item["key"])
    stem = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", stem).replace("_", "-").lower()
    item["proposed"] = f"icons/abilities/{stem}.svg"
write("catalog.json", {"date": "2026-10-12", "catalog": catalog})
by_key = {item["key"]: item for item in catalog if item["kind"] == "feat"}
fresh = []
for index, (key, request) in enumerate(fresh_prompts):
    item = by_key[key]
    assert not item["represented"] and not item["existing"], key
    assert not (ROOT / item["proposed"]).exists(), key
    assert not (ROOT / "icons" / "abilities" / f"{key}.svg").exists(), key
    stem = Path(item["proposed"]).stem
    fresh.append({"key": stem, "catalogKey": key, "name": item["label"], "request": request,
                  "context": item["text"], "kind": "feat", "atlas": "b" if index < 7 else "c",
                  "target": item["proposed"], "itemId": f"batch65-{stem}"})
saved = json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]
assert {item["id"] for item in saved if item["decision"] == "revise"} == {item[0] for item in revisions}
write("batch.json", {"batch": 65, "date": "2026-10-12",
                     "revisions": [{"itemId": item_id, "key": key, "atlas": atlas, "request": request}
                                   for item_id, key, atlas, request in revisions], "fresh": fresh})
print("Prepared Batch 65: 11 exact-selected revisions and 16 verified new Sztuczki")
