"""Register Batch 65 candidates, archive revision notes and preserve unrelated GM decisions."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
REVIEW = HERE.parents[1]
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
previous = {item["id"]: item for item in json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]}
manifest_path, feedback_path = REVIEW / "manifest.json", REVIEW / "feedback.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
feedback = json.loads(feedback_path.read_text(encoding="utf-8"))
revision_ids = {entry["itemId"] for entry in batch["revisions"]}
untouched_feedback = {key: json.dumps(value, sort_keys=True) for key, value in feedback["items"].items() if key not in revision_ids}
by_id = {item["id"]: item for item in manifest["items"]}
for entry in batch["revisions"]:
    item = by_id[entry["itemId"]]
    item.pop("status", None)
    item["request"] = entry["request"]
    candidate = {"id": "batch65-revision", "label": "Batch 65 revision", "src": f"candidates/batch-65/{entry['key']}.png", "note": entry["request"]}
    item["candidates"] = [candidate, *[old for old in item["candidates"] if old["id"] != candidate["id"]]]
    current = feedback["items"].get(item["id"], {})
    old = previous[item["id"]]
    if (current.get("decision"), current.get("candidateId"), current.get("notes", "")) == ("revise", old["candidateId"], old["notes"]):
        # Exact previous selection and notes remain in references.json and decisions.json.
        feedback["items"][item["id"]] = {"itemId": item["id"], "decision": "pending", "candidateId": candidate["id"], "notes": "", "updatedAt": "2026-10-12T00:00:00.000Z"}
for entry in batch["fresh"]:
    if entry["itemId"] in by_id:
        continue
    item = {"id": entry["itemId"], "name": entry["name"], "tier": f"Batch 65 · {entry['kind']} feature", "context": entry["context"], "request": entry["request"], "target": entry["target"], "catalogKey": entry["catalogKey"], "current": {"src": None, "emptyLabel": "No dedicated glyph", "note": "Confirmed absent at both canonical and proposed icon paths and absent from existing review cards."}, "candidates": [{"id": f"atlas-{entry['atlas']}", "label": f"Atlas {entry['atlas'].upper()} · {entry['name']}", "src": f"candidates/batch-65/{entry['key']}.png", "note": entry["request"]}]}
    manifest["items"].append(item)
    by_id[item["id"]] = item
active = [item for item in manifest["items"] if item.get("status") != "resolved"]
assert untouched_feedback == {key: json.dumps(value, sort_keys=True) for key, value in feedback["items"].items() if key not in revision_ids}, "Unrelated GM feedback changed"
manifest["title"] = f"Batch 65 · {len(active)} awaiting GM review"
manifest["updated"] = "2026-10-12"
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
feedback_path.write_text(json.dumps(feedback, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
(HERE / "manifest-items.json").write_text(json.dumps({"title": manifest["title"], "updated": manifest["updated"], "items": active}, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(f"Registered {len(active)} cards; exact revision history archived, approved decisions retained")
