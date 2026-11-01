"""Register validated M7 glyphs without installing them or changing GM feedback."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
REVIEW = ROOT/"dev/icons/review"

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

def main():
    incoming = read(HERE/"incoming.json")
    assert all(sha(ROOT/p) == value for p, value in incoming["sourceCode"].items()), "Runtime source changed"
    assert all(not (ROOT/p).exists() for p in incoming["expectedAbsent"]), "A target appeared; reconcile before registration"
    feedback = (REVIEW/"feedback.json").read_bytes()
    manifest = read(REVIEW/"manifest.json")
    original = {c["id"]: c for c in incoming["previousCards"]}
    assert all(next(c for c in manifest["items"] if c["id"] == key) == value for key, value in original.items())
    cards, hashes = [], {}
    for number in (121, 122):
        folder = REVIEW/f"candidates/batch-{number}"
        batch, valid = read(folder/"batch.json"), read(folder/"validated.json")
        assert valid["batch"] == number and valid["validatedMasks"] == len(batch["subjects"])
        for s in batch["subjects"]:
            assert sha(folder/(s["key"]+".png")) == valid["candidateHashes"][s["key"]]
            cards.append(dict(id=s["itemId"], name=s["name"], batch=number, tier=f"Batch {number} · M7 · stany",
                target=s["target"], deliveryTargets=s["deliveryTargets"], context=s["context"], request=s["request"],
                current=dict(emptyLabel="Tymczasowy glif systemowy", note="Obecna ścieżka: "+s["fallback"]),
                candidates=[dict(id=f"batch{number}-{s['key']}", label=s["name"]+" · biały glif",
                    src=f"candidates/batch-{number}/{s['key']}.png",
                    note="Oceń rozpoznawalność i różnice przy 16–32 px. Zestaw stanów może występować obok siebie.")]))
        for file in folder.rglob("*"):
            if file.is_file():
                hashes[file.relative_to(ROOT).as_posix()] = sha(file)
    assert len(cards) == 10 and len({c["id"] for c in cards}) == 10
    fragment = HERE/"manifest-items.json"
    write(fragment, dict(title="M7 · 10 nowych ikon stanów do oceny", updated="2026-11-01", items=cards))
    subprocess.run(["node", "dev/icons/review/merge_batch_manifest.mjs", str(fragment.relative_to(ROOT))],
        cwd=ROOT, check=True)
    after = read(REVIEW/"manifest.json")
    assert all(next(c for c in after["items"] if c["id"] == key) == value for key, value in original.items())
    assert (REVIEW/"feedback.json").read_bytes() == feedback, "Feedback changed during registration; inspect without resetting it"
    write(HERE/"review-ready.json", dict(date="2026-11-01", newCards=10, previousCardsPreserved=len(original),
        feedbackSha256=sha(REVIEW/"feedback.json"), runtimeSourcesUnchanged=incoming["sourceCode"],
        productionTargetsAbsent=incoming["expectedAbsent"], candidateAndSourceHashes=hashes,
        builtInGenerations=3, model=None, promptFiles=[
            "dev/icons/review/candidates/batch-121/prompts.json",
            "dev/icons/review/candidates/batch-121/correction-prompt.json",
            "dev/icons/review/candidates/batch-122/prompts.json"]))
    print(f"Registered 10 M7 cards. Preserved {len(original)} previous cards and all feedback. Runtime code and production art unchanged.")

if __name__ == "__main__":
    main()
