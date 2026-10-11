"""Append Batch 62 cards while preserving every other batch and all GM decisions."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE.parents[1] / "manifest.json"


def main():
    additions = json.loads((HERE / "manifest-items.json").read_text(encoding="utf-8"))["items"]
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    existing = {item["id"] for item in manifest["items"]}
    fresh = [item for item in additions if item["id"] not in existing]
    manifest["items"].extend(fresh)
    active = sum(item.get("status") != "resolved" for item in manifest["items"])
    manifest["title"] = f"Icon review · {active} pending cards · includes Batch 62"
    manifest["updated"] = "2026-10-11"
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Added {len(fresh)} cards; all existing cards and feedback preserved")


if __name__ == "__main__":
    main()
