"""Prepare six saved revisions and three verified missing fuel-grade glyphs."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
saved = json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]
requests = [
    ("batch62-bebeszenie", "bebeszenie_revision_f", "Redesign the entire composition into TWO balanced, uncrossed groups separated by a small central vertical lightning-bolt divider. LEFT: one upright butcher's knife beside a LARGE simple ribcage outline; RIGHT: one stack of two broad printed circuit boards beside one smaller intact pair of pliers. Knife, ribcage, PCB stack and pliers are separate non-touching silhouettes with generous black gaps. Ribcage is comparable in height to the tools, never tiny decoration above them. No crossed tools, skull, hands or gore. Keep the pliers' two straight symmetric handles below one pivot. The modest central lightning bolt divides organic butchery from electronic salvage; no text."),
    ("batch65-pan-plaster", "pan-plaster_revision_c", "Keep BOTH medic hands, their exact positions/gestures, the dressing and the first-aid pouch UNCHANGED. Rotate ONLY the patient's forearm/hand 90 degrees counterclockwise LEFT around the dressing contact area: it must now run toward upper-left rather than upper-right, the opposite diagonal. The patient's whole wrist, palm, thumb and four fingers remain connected and visible. Do not rotate, move, mirror or redraw either medic hand. Exactly three complete hands, no new tool, injury or blood."),
    ("batch65-pierwotny-instynkt", "pierwotny-instynkt_revision_c", "Keep the same rugged adult expression, alert head turn, raised ready forearm and three broad disturbance arcs. SIMPLIFY the face: retain only one broad brow/eye cut, a clear nose contour and a single plain mouth line; retain one solid beard silhouette if needed. Remove cheek creases, wrinkle lines, individual stubble hairs, tiny hatch marks and fine forehead detail. Preserve the alert stern expression, no anime styling or younger replacement face."),
    ("batch66-szybki-bill", "szybki-bill_revision_b", "Keep the exact running survivor's pose, two arms, two legs and all body proportions. Add THREE broad short horizontal SPEED STROKES to the LEFT of the runner, behind the back and trailing leg, with clear black space separating them from the body. The lines indicate rapid movement toward the right. No arrowheads, duplicate body, extra limb or lettering."),
    ("batch66-ucz-sie-ucz", "ucz-sie-ucz_revision_b", "Keep the two studying hands and open manual with its simple right-page diagram. REMOVE the wrench completely and leave that lower area blank. Add four short broad abstract parallel line marks to the LEFT page, suggesting paragraphs without any readable letters, words or numbers. Preserve the book outline, page turn and hand positions. No new tool or text."),
    ("batch66-ukryty-cel", "ukryty-cel_revision_b", "Spread the scene horizontally: shooter on the LEFT, one broad cover slab at CENTER, target figure on the RIGHT with an obvious black gap separating target from the slab. Leave generous space between shooter and slab too. Show one clear horizontal shot path from the rifle muzzle THROUGH a small hole in the slab and ending at the target's torso, with one restrained impact mark. Full target head and shoulders visible, two anatomically coherent figures and one gun. The shot penetrates cover rather than going around its edge. No blood, wound detail, death depiction, labels or extra shots.")
]
assert {item["id"] for item in saved} == {row[0] for row in requests}, "Incoming open set changed"
assert all(item["decision"] == "revise" for item in saved), "Unexpected incoming decision"
revisions = [{"itemId": item_id, "key": key, "atlas": "a", "request": request,
              "freshComposition": item_id == "batch62-bebeszenie"} for item_id, key, request in requests]
audit = json.loads((ROOT / "dev" / "icons" / "catalog-icons-2026-10-12.json").read_text(encoding="utf-8"))
by_ref = {item["ref"]: item for item in audit["items"]}
fuel = [
    ("paliwo-dobre", "paliwo_dobre", "One clean sturdy METAL fuel jerrycan with a broad squared rectangular body, a neat triple bridge handle, securely latched corner cap and one large diamond-shaped pressed reinforcing panel. Upright practical five-litre can, intact manufactured silhouette. No letters, brand, numerals, stars, medals, gradients or texture."),
    ("paliwo-przecietne", "paliwo_przecietne", "One ordinary utilitarian METAL fuel can with a slightly rounded tall body, ONE simple carrying loop, ordinary screw cap and a broad X-shaped pressed reinforcement panel. A small broad dent in one shoulder conveys a used but serviceable container. Clearly distinguish its rounded body/single loop/X panel from the clean square triple-handle good-fuel can. No rust specks, fine wear, lettering, logo or number."),
    ("paliwo-chrzczone", "paliwo_chrzczone", "One reused squat PLASTIC fuel jug with a large molded side handle, broad screw cap and one thick plain repair-tape band around its middle. A simple broad side inspection window shows two separated liquid layers as two large white masses divided by one thick black horizontal gap, implying adulteration. Distinct squat plastic jug silhouette, no text, hazard label, droplets floating outside it, tiny scratches or brand.")
]
fresh = []
for id, stem, request in fuel:
    entry = by_ref[f"raw:{id}"]
    target = f"icons/items/loot/{stem}.svg"
    assert entry["artGap"] and not entry["existingAlternative"], id
    assert not (ROOT / target).exists() and not (ROOT / target.replace(".svg", ".webp")).exists(), id
    fresh.append({"key": stem, "catalogKey": f"raw:{id}", "name": entry["label"], "request": request,
                  "context": "Canonical trade/production catalog fuel grade; inventory row, barter list and chat card. Five-litre container, distinct grade silhouette.",
                  "kind": "fuel", "atlas": "a", "target": target, "itemId": f"batch67-{id}",
                  "currentSrc": entry["img"]})
(HERE / "batch.json").write_text(json.dumps({"batch": 67, "date": "2026-10-12", "revisions": revisions, "fresh": fresh},
                                            ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Prepared Batch 67: six saved revisions and three missing fuel grades")
