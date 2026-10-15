"""Mark a delivered batch's own queue section without replacing shared history."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--batch", type=int, required=True)
parser.add_argument("--carry", type=int, required=True)
args = parser.parse_args()
here = ROOT / "dev/icons/review/candidates" / f"batch-{args.batch}"
snapshot = json.loads((here / "reviewed.json").read_text(encoding="utf-8"))
report = json.loads((here / "reviewed-installed.json").read_text(encoding="utf-8"))
batch = json.loads((here / "batch.json").read_text(encoding="utf-8"))
decisions = {item["id"]: item for item in snapshot["active"]}
approved = report["approvedSubjects"]
remaining = sum(item["decision"] != "approve" for item in snapshot["active"])
queue_file = ROOT / "dev/icons/MISSING.md"
queue = queue_file.read_text(encoding="utf-8")
begin = f"<!-- placeholder-batch-{args.batch}:start -->"
end = f"<!-- placeholder-batch-{args.batch}:end -->"
start, finish = queue.index(begin), queue.index(end)
assert finish > start
lines = [begin, f"## Reviewed (A) — Batch {args.batch} — {approved} delivered, {remaining} revisions", "",
         f"Saved GM review: {approved} subjects installed as exact approved SVG/WEBP pairs.",
         f"The {remaining} remaining requests carry their exact notes into Batch {args.carry}.",
         f"Evidence: `review/candidates/batch-{args.batch}/reviewed.json` and `reviewed-installed.json`.", "",
         "| Cell | Item | Exact SVG targets (+ WEBP) | Status |", "|---|---|---|---|"]
for subject in batch["subjects"]:
    decision = decisions[subject["itemId"]]
    status = "**done**" if decision["decision"] == "approve" else f"Revision in Batch {args.carry}"
    targets = "; ".join(f"`{item['source']}`" for item in subject["deliveryTargets"])
    lines.append(f"| {subject['cell']} | {subject['name']} | {targets} | {status} |")
lines.extend(["", end])
queue_file.write_text(queue[:start] + "\n".join(lines) + queue[finish + len(end):], encoding="utf-8")
print(f"Marked Batch {args.batch}: {approved} done, {remaining} carried; other queue sections retained")
