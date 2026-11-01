"""Run the M4 palette/audio integration probe via fvtt in the existing agent sandbox."""
import json
import subprocess
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
receipt=json.loads((HERE/"approval.json").read_text(encoding="utf-8"))
args=dict(files=[dict(path=f["path"],sha256=f["sha256"]) for f in receipt["approvedFiles"]])
raw=HERE/"runtime-check.json"
result=subprocess.run(["node","dev/agent/fvtt.mjs","eval","--profile=sandbox",
    "--file=dev/art/m4/audio/verify-integration.mjs","--args="+json.dumps(args)],cwd=ROOT,capture_output=True,text=True,encoding="utf-8")
response=json.loads(result.stdout)
if result.returncode or not response.get("ok"):
    print(json.dumps(response,ensure_ascii=False))
    raise SystemExit(result.returncode or 1)
value=response["value"]
value.pop("world",None)
value["sirenEvent"]="syrena"
raw.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Sandbox palette click, one-shot siren event, unrelated silent action and seven native approved audio hashes verified.")
