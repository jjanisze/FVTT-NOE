"""Deliver the final exact GM-approved M7 SVG/WEBP masks; preserve all feedback."""
import argparse
import copy
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
REVIEW = ROOT/"dev/icons/review"
DATE = "2026-11-01"

def read(p):
    return json.loads(p.read_text(encoding="utf-8"))

def write(p, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def verify(receipt):
    assert len(receipt["installed"]) == 11
    assert len({r["itemId"] for r in receipt["installed"]}) == 11
    for record in receipt["installed"]:
        source = REVIEW/record["source"]
        assert sha(source) == record["sourceSha256"]
        for file in record["files"]:
            destination = ROOT/file["path"]
            assert sha(destination) == file["sha256"] == sha(source.with_suffix(destination.suffix))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    receipt_file = HERE/"reviewed-installed.json"
    receipt = read(receipt_file)
    if args.check:
        verify(receipt)
        print("Verified all eleven exact M7 SVG/WEBP pairs: ten approved statuses and one primary-action reuse.")
        return
    manifest_file, feedback_file = REVIEW/"manifest.json", REVIEW/"feedback.json"
    before = {p:p.read_bytes() for p in (manifest_file, feedback_file, receipt_file)}
    manifest, feedback = read(manifest_file), read(feedback_file)
    existing = {r["itemId"]:r for r in receipt["installed"]}
    cards = [c for c in manifest["items"] if c["id"].startswith("m7-status-") and c["id"] != "m7-status-akcja"]
    assert len(cards) == 10
    runtime = {p:sha(ROOT/p) for p in ("scripts/config/conditions.mjs",
        "scripts/config/krwawienia-data.mjs", "scripts/wkk/combat/bleeding.mjs")}
    plan = []
    for card in cards:
        saved = feedback["items"][card["id"]]
        assert saved["decision"] == "approve", card["id"]
        selected = next(c for c in card["candidates"] if c["id"] == saved["candidateId"])
        source = REVIEW/selected["src"]
        valid = read(source.parent/"validated.json")
        assert sha(source) == valid["candidateHashes"][source.stem]
        if card["id"] in existing:
            assert existing[card["id"]]["candidateId"] == saved["candidateId"]
            continue
        target = ROOT/card["target"]
        assert target.resolve().is_relative_to((ROOT/"icons/statuses").resolve())
        assert target.suffix == ".svg" and not target.exists() and not target.with_suffix(".webp").exists()
        plan.append((card, saved, selected, source, target))
    assert len(plan) in (0, 5)
    assert all(p.read_bytes() == b for p,b in before.items())
    archive = HERE/"reviewed-installed-first-pass.json"
    if plan and not archive.exists():
        archive.write_bytes(before[receipt_file])
    for card, saved, selected, source, target in plan:
        files = []
        for suffix in (".svg", ".webp"):
            destination = target.with_suffix(suffix)
            shutil.copyfile(source.with_suffix(suffix), destination)
            assert sha(destination) == sha(source.with_suffix(suffix))
            files.append(dict(path=destination.relative_to(ROOT).as_posix(), sha256=sha(destination)))
        receipt["installed"].append(dict(itemId=card["id"], candidateId=selected["id"], source=selected["src"],
            sourceSha256=sha(source), installedOn=DATE, approvalBasis="approve", feedback=copy.deepcopy(saved), files=files))
    for card in cards:
        card["status"] = "resolved"
    receipt.update(updated=DATE, approvedGlyphs=10, explicitlyRequestedReuse=1, remainingSubjects=0)
    verify(receipt)
    assert feedback_file.read_bytes() == before[feedback_file]
    assert all(sha(ROOT/p) == digest for p,digest in runtime.items())
    manifest.update(title="M7 · all ten approved status glyphs and primary-action reuse delivered", updated=DATE)
    write(receipt_file, receipt)
    write(manifest_file, manifest)
    write(HERE/"final-delivery.json", dict(date=DATE, deliveredPairs=11, newPairs=len(plan),
        approvedStatuses=10, primaryActionReuse=1, selectedBonus="batch123-akcja-bonusowa-a",
        remainingActiveCards=sum(c.get("status") != "resolved" for c in manifest["items"]),
        feedbackUnchanged=True, feedbackSha256=sha(feedback_file), runtimeSourcesUnchanged=runtime))
    print(f"Delivered {len(plan)} new pairs. All eleven M7 pairs verified; all original GM feedback preserved.")

if __name__ == "__main__":
    main()
