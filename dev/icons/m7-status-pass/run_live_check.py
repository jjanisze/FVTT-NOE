"""Run asset verification via fvtt's sandbox eval and save its renderer preview."""
import base64
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def main():
    batches = []
    for number in (121, 122):
        batch = read(ROOT/f"dev/icons/review/candidates/batch-{number}/batch.json")
        batches.append(dict(subjects=[{k:s[k] for k in ("statusId", "target", "itemId", "key")} for s in batch["subjects"]]))
    receipt = read(HERE/"reviewed-installed.json")
    data = dict(batches=batches, receipt=dict(installed=[dict(itemId=r["itemId"], files=r["files"]) for r in receipt["installed"]]))
    raw_file = HERE/"live-check-raw.json"
    with raw_file.open("wb") as output:
        result = subprocess.run(["node", "dev/agent/fvtt.mjs", "eval", "--profile=sandbox",
            "--file=dev/icons/m7-status-pass/verify-live.mjs", "--args="+json.dumps(data, ensure_ascii=False)],
            cwd=ROOT, stdout=output)
    response = read(raw_file)
    if result.returncode or not response.get("ok"):
        print(json.dumps(response, ensure_ascii=False))
        raise SystemExit(result.returncode or 1)
    def find(value):
        if isinstance(value, dict):
            if "previewDataUrl" in value:
                return value
            for child in value.values():
                found = find(child)
                if found is not None:
                    return found
        return None
    report = find(response)
    assert report is not None, "No renderer verification result"
    preview = report.pop("previewDataUrl")
    assert preview.startswith("data:image/png;base64,")
    (HERE/"live-render-preview.png").write_bytes(base64.b64decode(preview.split(",",1)[1]))
    report.update(date="2026-11-01", preview="live-render-preview.png")
    (HERE/"runtime-verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    raw_file.unlink()
    print(json.dumps(dict(configuredStatuses=report["configuredStatuses"], worldDocumentsWritten=report["worldDocumentsWritten"],
        preview=report["preview"]), ensure_ascii=False))

if __name__ == "__main__":
    main()
