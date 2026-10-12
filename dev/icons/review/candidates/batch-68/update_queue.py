"""Record the two prepared targeted revisions in the owned asset queue."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
queue_path = ROOT / "dev" / "icons" / "MISSING.md"
text = queue_path.read_text(encoding="utf-8")
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
text = re.sub(r"\*\*Next batch number: (?:68|69)\*\*.*?\n\n",
              "**Next batch number: 69** (Batch 68: two targeted revisions prepared and\nawaiting GM review; Batch 67's seven approved selections are installed).\n\n",
              text, count=1, flags=re.S)
section = ["## Queue (A) — Batch 68 — 2 awaiting GM review", "",
           "Only the two exact saved Batch 67 revision requests are carried forward.",
           "The pipeline permits standalone generation for targeted edits; no empty",
           "atlas cells or unrelated new subjects are generated. References, verbatim",
           "feedback, built-in OpenAI prompts and validation: `review/candidates/batch-68/`.",
           "Both candidates stay in dev until fresh GM approval.", "",
           "| Item | Final SVG (+ WEBP after approval) | Required change |", "|---|---|---|"]
for entry in batch["revisions"]:
    section.append(f"| {entry['name']} | `{entry['target']}` | {entry['request']} |")
section += ["", "Pan Plaster's two treating hands and pouch retain their positions; the patient",
            "arm reverses direction and stays visibly separate from the first-aid box.",
            "Adulterated fuel uses a cheap plastic juice-jug silhouette without a window.",
            "Good and average fuel are already delivered; resolver wiring remains for MG.", ""]
if "## Queue (A) — Batch 68" in text:
    start = text.index("## Queue (A) — Batch 68")
    end = text.index("## How an item gets added here", start)
    text = text[:start] + "\n".join(section) + "\n" + text[end:]
else:
    text = text.replace("## How an item gets added here", "\n".join(section) + "\n## How an item gets added here", 1)
queue_path.write_text(text, encoding="utf-8")
print("Recorded two pending targeted edits and advanced the next free batch to 69")
