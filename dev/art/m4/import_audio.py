"""Use the existing M5 peak/RMS pipeline with the M4 vehicle declarations."""
import importlib.util
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
spec = importlib.util.spec_from_file_location("m5_audio_pipeline", ROOT/"dev/art/m5/import_audio.py")
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)
pipeline.HERE = HERE
pipeline.ROOT = ROOT

if __name__ == "__main__":
    pipeline.main()
    originals = HERE/"audio-originals.json"
    if originals.exists():
        data = json.loads(originals.read_text(encoding="utf-8"))
        data["checked"] = json.loads((HERE/"audio-sources.json").read_text(encoding="utf-8"))["checked"]
        originals.write_text(json.dumps(data, indent=2)+"\n", encoding="utf-8")
