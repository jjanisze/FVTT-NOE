"""Record the GM's approval of exact vehicle audio bytes and verify existing integration."""
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REVIEW = ROOT/"dev/icons/review/audio/pojazdy"

def read(p):
    return json.loads(p.read_text(encoding="utf-8"))

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    report = read(HERE.parent/"audio-report.json")
    browser = read(HERE/"browser-validation.json")
    runtime_file = ROOT/"scripts/pojazdy/efekty-silnika.mjs"
    runtime = runtime_file.read_text(encoding="utf-8")
    block = re.search(r"const DZWIEKI = \{[\s\S]*?\n\};", runtime).group()
    expected = {"benzyna":"start-benzyna", "diesel":"start-diesel", "motocykl":"start-motocykl",
        "stop":"zgaszenie", "nieudane":"nieudane-odpalenie", "alarm":"alarm", "syrena":"syrena"}
    for key, value in expected.items():
        assert re.search(r"\b"+key+r':\s*"'+value+r'"', block), f"Runtime mapping differs: {key}"
    assert ("sounds/pojazdy/" + "$" + "{nazwa}.ogg") in runtime
    palette_file = ROOT/"scripts/pojazdy/paleta.mjs"
    palette = palette_file.read_text(encoding="utf-8")
    assert 'flagi: id === "syrena" ? { pojazdDzwiek: { pojazd: pojazdDoc.uuid, rodzaj: "syrena" } } : {}' in palette
    release = (ROOT/"dev/release/build-zip.mjs").read_text(encoding="utf-8")
    assert re.search(r'INCLUDE_DIRS\s*=\s*\[[^\]]*"sounds"', release)
    assert len(report) == browser["loaded"] == 7 and browser["allHashesAndDurationsMatch"]
    files = []
    for r in report:
        file = ROOT/r["file"]
        assert file.resolve().is_relative_to((ROOT/"sounds/pojazdy").resolve())
        seen = next(b for b in browser["tracks"] if b["file"] == file.name)
        assert sha(file) == sha(REVIEW/file.name) == r["outputSha256"] == seen["sha256"]
        files.append(dict(path=r["file"],sha256=r["outputSha256"],duration=r["duration"],
            source=r["source"],sourceSha256=r["sourceSha256"]))
    approval = dict(date="2026-11-01",decision="approve",basis="Direct GM message",
        statement="All audio is approved. Integrate, if integration steps are required.",
        approvedFiles=files,
        integration=dict(complete=True,newRuntimeMappingsRequired=False,packRebuildRequired=False,
            runtimeFile="scripts/pojazdy/efekty-silnika.mjs",runtimeSha256=sha(runtime_file),
            sirenDispatchFile="scripts/pojazdy/paleta.mjs",sirenDispatchSha256=sha(palette_file),
            sirenPaletteDispatchAdded=True,
            existingBindings=expected,releaseIncludesSounds=True),
        notes="Exact normalized audio retained. Siren palette action now emits the existing vehicle sound event; no mechanics or compendium changes.")
    destination=HERE/"approval.json"
    if destination.exists():
        previous=read(destination)
        assert previous["approvedFiles"] == files, "Approval must not silently follow changed audio."
    destination.write_text(json.dumps(approval,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Recorded GM approval of seven exact audio files; existing event bindings and release inclusion verified.")

if __name__ == "__main__":
    main()
