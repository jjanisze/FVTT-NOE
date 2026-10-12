"""Register two targeted revisions while preserving unrelated GM feedback."""
import json
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REVIEW = HERE.parents[1]
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
previous = {item["id"]: item for item in json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]}
manifest_path, feedback_path = REVIEW / "manifest.json", REVIEW / "feedback.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
feedback = json.loads(feedback_path.read_text(encoding="utf-8"))
ids = set(previous)
untouched = {key: value for key, value in feedback["items"].items() if key not in ids}
by_id = {item["id"]: item for item in manifest["items"]}
# Preflight both saved decisions before replacing either review selection.
for entry in batch["revisions"]:
    old = previous[entry["itemId"]]
    current = feedback["items"][entry["itemId"]]
    assert current == old["feedback"], "GM feedback changed; retain the newer decision"
    selected = next(candidate for candidate in by_id[entry["itemId"]]["candidates"] if candidate["id"] == current["candidateId"])
    assert selected["src"] == old["selectedSource"]
    assert (HERE / f"{entry['key']}.png").is_file()
for entry in batch["revisions"]:
    item = by_id[entry["itemId"]]
    candidate = {"id": "batch68-revision", "label": "Batch 68 targeted revision",
                 "src": f"candidates/batch-68/{entry['key']}.png", "note": entry["request"]}
    item["candidates"] = [candidate, *[old for old in item["candidates"] if old["id"] != candidate["id"]]]
    item["request"] = entry["request"]
    item.pop("status", None)
    feedback["items"][item["id"]] = {"itemId": item["id"], "decision": "pending",
                                    "candidateId": candidate["id"], "notes": "",
                                    "updatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")}
assert untouched == {key: value for key, value in feedback["items"].items() if key not in ids}
active = [item for item in manifest["items"] if item.get("status") != "resolved"]
assert {item["id"] for item in active} == ids
manifest["title"] = "Batch 68 · 2 targeted revisions awaiting GM review"
manifest["updated"] = "2026-10-13"
for destination, value in [(manifest_path, manifest), (feedback_path, feedback),
                           (HERE / "manifest-items.json", {"title": manifest["title"], "updated": manifest["updated"], "items": active})]:
    destination.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Registered two pending revisions; all unrelated feedback and old candidates preserved")
