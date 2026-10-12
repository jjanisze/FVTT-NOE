"""Archive the two remaining exact selections and prepare opaque edit references."""
import hashlib
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
REVIEW = HERE.parents[1]
snapshot_path = HERE / "decisions.json"
if snapshot_path.exists():
    raise SystemExit("Historical snapshot exists; do not rerun preparation")
manifest = json.loads((REVIEW / "manifest.json").read_text(encoding="utf-8"))
feedback_bytes = (REVIEW / "feedback.json").read_bytes()
feedback = json.loads(feedback_bytes)["items"]
active = [item for item in manifest["items"] if item.get("status") != "resolved"]
expected = {"batch65-pan-plaster", "batch67-paliwo-chrzczone"}
assert {item["id"] for item in active} == expected
entries, saved, references = [], [], []
(HERE / "raw").mkdir(exist_ok=True)
requests = {
    "batch65-pan-plaster": (
        "pan-plaster_revision_d",
        "Rotate ONLY the complete patient's forearm, wrist and open hand another 180 degrees "
        "around the dressing contact area. The patient's proximal arm now enters from UPPER LEFT "
        "and its fingers point LOWER RIGHT. Keep the two treating hands entering from LEFT, "
        "their cuffs, gestures and positions, and the open first-aid pouch unchanged. "
        "Leave an obvious black gap between every part of the patient arm/hand and the pouch: "
        "the arm belongs to a patient outside the frame and must never originate in the box. "
        "Exactly three complete hands, connected wrists and no extra tool, injury or blood."
    ),
    "batch67-paliwo-chrzczone": (
        "paliwo_chrzczone_revision_b",
        "Replace the industrial windowed container with one CHEAP PLASTIC ORANGE-JUICE JUG "
        "repurposed for adulterated fuel. A broad lightweight squat jug body with rounded "
        "shoulders, a small ordinary screw cap and a simple thin molded grip conveys cheap "
        "beverage packaging. REMOVE the inspection window and its liquid layers completely. "
        "Plain opaque body: no side window, label panel, tape band, pressed metal X, "
        "diamond reinforcement, lettering, logo, numerals, fruit symbol or visible liquid. "
        "Keep the white-only glyph style: orange juice describes the container, not its color."
    ),
}
for item in active:
    decision = feedback[item["id"]]
    assert decision["decision"] == "revise"
    selected = next(candidate for candidate in item["candidates"] if candidate["id"] == decision["candidateId"])
    key, request = requests[item["id"]]
    source = REVIEW / selected["src"]
    reference_name = f"raw/reference-{key}.png"
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        canvas = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
        canvas.alpha_composite(rgba)
        canvas.convert("RGB").save(HERE / reference_name)
    saved.append({"id": item["id"], "name": item["name"], "tier": item["tier"],
                  "target": item["target"], "catalogKey": item.get("catalogKey"),
                  "decision": decision["decision"], "candidateId": decision["candidateId"],
                  "selectedSource": selected["src"], "notes": decision["notes"],
                  "feedback": decision, "context": item["context"]})
    references.append({"itemId": item["id"], "candidateId": decision["candidateId"],
                       "source": selected["src"], "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                       "feedback": decision["notes"], "reference": reference_name})
    entries.append({"itemId": item["id"], "name": item["name"], "key": key,
                    "target": item["target"], "request": request, "reference": reference_name,
                    "output": f"raw/standalone-{key}.png"})
for name, value in {
    "decisions.json": {"date": "2026-10-13", "batch": 68,
                       "feedbackBeforeSha256": hashlib.sha256(feedback_bytes).hexdigest(), "active": saved},
    "references.json": references,
    "batch.json": {"date": "2026-10-13", "batch": 68, "revisions": entries},
}.items():
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
assert (REVIEW / "feedback.json").read_bytes() == feedback_bytes
print("Archived two exact selections and prepared two unaltered black-backed edit references")
