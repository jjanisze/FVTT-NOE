"""Install exact approved M9 masks, archive legacy variants, and preserve GM decisions."""
import argparse
import copy
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
REVIEW = ROOT / "dev/icons/review"
BATCH = REVIEW / "candidates/batch-124"
RECEIPT = HERE / "reviewed-installed.json"
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "dev/icons/placeholder-pass"))
from class_options_92 import validate_mask


def read(file):
    return json.loads(file.read_text(encoding="utf-8"))


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def write(file, value):
    temporary = file.with_suffix(file.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(file)


def verify(receipt):
    manifest = read(REVIEW / "manifest.json")
    feedback = read(REVIEW / "feedback.json")
    cards = {card["id"]: card for card in manifest["items"]}
    assert len(receipt["installed"]) == 9
    for record in receipt["installed"]:
        assert cards[record["itemId"]]["status"] == "resolved"
        assert feedback["items"][record["itemId"]] == record["feedback"]
        source = REVIEW / record["source"]
        validate_mask(source.parent, source.stem)
        for file in record["files"]:
            destination = ROOT / file["path"]
            assert sha(destination) == file["sha256"] == sha(source.with_suffix(destination.suffix))
        for old in record["archived"]:
            assert sha(ROOT / old["archive"]) == old["sha256"]
            if old["source"].endswith(".png"):
                assert not (ROOT / old["source"]).exists()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    assert sum([args.preflight, args.check, args.apply]) == 1, "Choose --preflight, --apply or --check"
    if RECEIPT.exists():
        verify(read(RECEIPT))
        print("M9 delivery verified: nine exact approved SVG/WEBP pairs and archived legacy variants.")
        return
    assert not args.check, "Delivery has not been applied"
    protected = [REVIEW / name for name in ("manifest.json", "feedback.json", "style-feedback.json")]
    before = {file: file.read_bytes() for file in protected}
    manifest, feedback = read(protected[0]), read(protected[1])
    cards = {card["id"]: card for card in manifest["items"]}
    frozen, validated = read(BATCH / "batch.json"), read(BATCH / "validated.json")
    assert validated["validatedMasks"] == len(frozen["subjects"]) == 9
    plan = []
    production = []
    for subject in frozen["subjects"]:
        card, saved = cards[subject["itemId"]], feedback["items"][subject["itemId"]]
        assert card["status"] != "resolved" and saved["decision"] == "approve"
        selected = next(c for c in card["candidates"] if c["id"] == saved["candidateId"])
        source = (REVIEW / selected["src"]).resolve()
        assert source.parent == BATCH.resolve() and source.stem == subject["key"]
        assert sha(source) == validated["candidateHashes"][subject["key"]]
        validate_mask(source.parent, source.stem)
        destination = (ROOT / subject["target"]).resolve()
        assert destination.is_relative_to((ROOT / "icons").resolve()) and destination.suffix == ".svg"
        captured = {entry["source"]: entry for entry in subject["deliveryTargets"]}
        for extension in (".svg", ".webp", ".png"):
            target = destination.with_suffix(extension)
            relative = target.relative_to(ROOT).as_posix()
            production.append(relative)
            if target.exists():
                assert relative in captured and sha(target) == captured[relative]["sourceSha256"], f"Source changed: {relative}"
            else:
                assert relative not in captured, f"Source disappeared: {relative}"
        legacy = destination.with_suffix(".png")
        if legacy.exists():
            result = subprocess.run(["rg", "-l", "-a", "--fixed-strings", "--glob=!LOCK", "--glob=!*.lock",
                legacy.relative_to(ROOT).as_posix(), "scripts", "templates", "styles", "lang", "packs", "module.json"],
                cwd=ROOT, capture_output=True, text=True)
            assert result.returncode == 1, f"Legacy PNG has references or scan failed: {result.stdout} {result.stderr}"
        plan.append((subject, saved, selected, source, destination))
    status = subprocess.check_output(["git", "status", "--porcelain", "--", *production], cwd=ROOT, text=True)
    assert not status, "A production target has uncommitted changes"
    assert all(file.read_bytes() == old for file, old in before.items()), "Review changed during preflight"
    print("M9 preflight: nine approved replacements; source hashes and all three candidate formats match.")
    if args.preflight:
        return
    archive_root = BATCH / "raw/installed-before"
    assert not archive_root.exists(), "An earlier incomplete installation requires inspection"
    archive_root.mkdir(parents=True)
    (archive_root / "review-manifest.json").write_bytes(before[protected[0]])
    installed = []
    for subject, saved, selected, source, destination in plan:
        archived = []
        for extension in (".svg", ".webp", ".png"):
            old = destination.with_suffix(extension)
            if old.exists():
                archive = archive_root / old.name
                shutil.copyfile(old, archive)
                archived.append({"source": old.relative_to(ROOT).as_posix(), "sha256": sha(old), "archive": archive.relative_to(ROOT).as_posix()})
        files = []
        for extension in (".svg", ".webp"):
            target = destination.with_suffix(extension)
            shutil.copyfile(source.with_suffix(extension), target)
            files.append({"path": target.relative_to(ROOT).as_posix(), "sha256": sha(target)})
        legacy = destination.with_suffix(".png")
        if legacy.exists():
            assert legacy.resolve().is_relative_to((ROOT / "icons").resolve())
            legacy.unlink()
        cards[subject["itemId"]]["status"] = "resolved"
        installed.append({"itemId": subject["itemId"], "candidateId": selected["id"], "source": selected["src"],
            "feedback": copy.deepcopy(saved), "files": files, "archived": archived})
    assert protected[1].read_bytes() == before[protected[1]] and protected[2].read_bytes() == before[protected[2]]
    manifest.update(title="M9 · nine approved cleanup glyphs delivered", updated="2026-11-17")
    write(protected[0], manifest)
    receipt = {"installedOn": datetime.now(timezone.utc).isoformat(), "batch": 124, "installed": installed,
        "feedbackPreserved": True, "feedbackSha256": sha(protected[1]), "shippedFormat": "SVG with embedded lossless WEBP and WEBP sidecar"}
    write(RECEIPT, receipt)
    verify(receipt)
    print("Installed nine exact approved SVG/WEBP pairs; archived and retired nine legacy PNG sidecars.")


if __name__ == "__main__":
    main()
