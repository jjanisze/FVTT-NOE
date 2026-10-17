"""Archive complete style reviews and install only exact approved SVG/WEBP pairs."""
import argparse
import importlib.util
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from class_options_92 import validate_mask
from public_review import public_copy, feedback_hash
spec = importlib.util.spec_from_file_location("placeholder_accept", ROOT / "dev/icons/placeholder-pass/accept.py")
approval = importlib.util.module_from_spec(spec)
spec.loader.exec_module(approval)


def consume(numbers, preflight_only=False):
    manifest_file, feedback_file, style_file = (REVIEW / name for name in ("manifest.json", "feedback.json", "style-feedback.json"))
    missing_file = ROOT / "dev/icons/MISSING.md"
    originals = {file: file.read_bytes() for file in (manifest_file, feedback_file, style_file, missing_file)}
    manifest, feedback, style = (json.loads(originals[file]) for file in (manifest_file, feedback_file, style_file))
    cards = {card["id"]: card for card in manifest["items"]}
    prepared, snapshots, batches, production_paths, kept = [], {}, {}, [], {}
    for number in numbers:
        here = REVIEW / f"candidates/batch-{number}"
        assert not (here / "reviewed-installed.json").exists(), "Review already consumed; use --check"
        batch = batches[number] = read(here / "batch.json")
        snapshots[number] = []
        kept[number] = []
        for original in read(here / "incoming.json")["productionFiles"]:
            assert sha(ROOT / original["source"]) == original["sha256"], "Production variant changed"
        for relative in read(here / "incoming.json").get("expectedAbsent", []):
            assert not (ROOT / relative).exists(), "An expected-absent target appeared"
        for subject in batch["subjects"]:
            card, saved = cards[subject["itemId"]], feedback["items"][subject["itemId"]]
            assert card.get("status") != "resolved" and saved["decision"] in ("approve", "revise", "reject")
            flag = subject.get("styleFeedback")
            if flag:
                assert style["items"][flag["iconId"]] == flag, "Newer browser style feedback"
            else:
                assert subject["kind"] in ("origin", "companion") and subject["deliveryTargets"][0]["sourceSha256"] is None
            if saved["candidateId"] == "current":
                assert flag, "A missing glyph cannot be approved as existing production art"
                selected_path = card["current"]["src"]
                source = (ROOT / selected_path.lstrip("/")).resolve()
                assert source == (ROOT / subject["target"]).resolve()
                assert sha(source) == flag["sourceSha256"]
                kind = "production"
            else:
                selected = next(c for c in card["candidates"] if c["id"] == saved["candidateId"])
                source = approval.selected_source(subject, selected)
                selected_path, kind = selected["src"], "candidate"
            snapshot = {"id": card["id"], "name": card["name"], "decision": saved["decision"], "candidateId": saved["candidateId"],
                "selectedSource": selected_path, "sourceKind": kind, "sourceSha256": sha(source), "deliveryTargets": subject["deliveryTargets"],
                "notes": saved.get("notes", ""), "feedback": saved, "feedbackSha256": feedback_hash(saved)}
            snapshots[number].append(public_copy(snapshot))
            if saved["decision"] != "approve":
                continue
            if kind == "production":
                files = [p for p in read(here / "incoming.json")["productionFiles"]
                         if Path(p["source"]).with_suffix(".svg").as_posix() == subject["target"]]
                assert files and any(p["source"] == subject["target"] for p in files)
                production_paths.extend(p["source"] for p in files)
                kept[number].append({"itemId": card["id"], "candidateId": "current",
                    "source": selected_path, "sourceSha256": sha(source), "files": files})
                continue
            validate_mask(source.parent, subject["key"])
            destination = (ROOT / subject["target"]).resolve()
            assert destination.is_relative_to(ROOT / "icons") and destination.suffix == ".svg"
            if flag:
                assert sha(destination) == flag["sourceSha256"]
            else:
                assert not destination.exists()
            bitmap = destination.with_suffix(".webp")
            legacy = destination.with_suffix(".png")
            captured = {p["source"] for p in read(here / "incoming.json")["productionFiles"]}
            if not flag:
                assert all(not destination.with_suffix(ext).exists() for ext in (".svg", ".webp", ".png"))
                assert destination.relative_to(ROOT).as_posix() in read(here / "incoming.json")["expectedAbsent"]
            elif not bitmap.exists():
                assert bitmap.relative_to(ROOT).as_posix() not in captured
                assert legacy.is_file() and legacy.relative_to(ROOT).as_posix() in captured, "Missing uncaptured raster"
            if legacy.is_file():
                assert legacy.resolve().is_relative_to(ROOT / "icons")
                assert not (here / f"raw/legacy/{subject['key']}.png").exists(), "Legacy archive already exists"
                references = subprocess.run(["rg", "-n", "-a", "--fixed-strings", legacy.relative_to(ROOT).as_posix(),
                    "scripts", "templates", "styles", "lang", "packs", "module.json"], cwd=ROOT, capture_output=True, text=True)
                assert references.returncode == 1, "Legacy PNG has references or could not be inspected; retain it for GM wiring"
                production_paths.append(legacy.relative_to(ROOT).as_posix())
            files = [destination.relative_to(ROOT).as_posix(), bitmap.relative_to(ROOT).as_posix()]
            production_paths.extend(files)
            prepared.append((number, subject, source, destination, bitmap, files, legacy if legacy.is_file() else None))
    assert len(production_paths) == len(set(production_paths)), "Duplicate production target"
    status = subprocess.check_output(["git", "status", "--porcelain", "--", *production_paths], cwd=ROOT, text=True) if production_paths else ""
    assert not status, "Dirty approved production target"
    for file, original in originals.items():
        assert file.read_bytes() == original, "Review changed during preflight"
    kept_count = sum(map(len, kept.values()))
    print(f"Preflight: {len(prepared)} replacements, {kept_count} kept current, {sum(len(v) for v in snapshots.values()) - len(prepared) - kept_count} revisions/rejections.")
    if preflight_only:
        return
    installed = {number: [] for number in numbers}
    timestamp = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    for number in numbers:
        here = REVIEW / f"candidates/batch-{number}"
        write(here / "raw/reviewed-private.json", {"feedback": {s["itemId"]: feedback["items"][s["itemId"]] for s in batches[number]["subjects"]}})
        write(here / "reviewed.json", {"date": "2026-10-17", "batch": number, "pass": batches[number]["pass"],
            "feedbackBeforeSha256": sha(feedback_file), "styleFeedbackBeforeSha256": sha(style_file),
            "localReferenceLocationsRedacted": True, "active": snapshots[number]})
    for number, subject, source, destination, bitmap, files, legacy in prepared:
        retired = None
        if legacy:
            archive = REVIEW / f"candidates/batch-{number}/raw/legacy/{subject['key']}.png"
            archive.parent.mkdir(parents=True, exist_ok=True)
            archive.write_bytes(legacy.read_bytes())
            retired = {"source": legacy.relative_to(ROOT).as_posix(), "sha256": sha(legacy), "archive": archive.relative_to(ROOT).as_posix()}
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(source.with_suffix(".svg").read_bytes())
        bitmap.write_bytes(source.with_suffix(".webp").read_bytes())
        if legacy:
            legacy.unlink()
        card = cards[subject["itemId"]]
        card["status"] = "resolved"
        if "styleFeedback" in subject:
            flag = style["items"][subject["styleFeedback"]["iconId"]]
            flag.update(status="keep", sourceSha256=sha(destination), reasons=[], updatedAt=timestamp)
        installed[number].append({"itemId": card["id"], "candidateId": feedback["items"][card["id"]]["candidateId"],
            "source": source.relative_to(REVIEW).as_posix(), "sourceSha256": sha(source), "files": files,
            "svgSha256": sha(destination), "webpSha256": sha(bitmap), "retiredLegacyPng": retired})
    for number in numbers:
        for item in kept[number]:
            card = cards[item["itemId"]]
            card["status"] = "resolved"
            flag = style["items"][card["styleReview"]["iconId"]]
            flag.update(status="keep", sourceSha256=item["sourceSha256"], reasons=[], updatedAt=timestamp)
    remaining = sum(card.get("status") != "resolved" for card in manifest["items"])
    manifest.update(title=f"Asset review · {len(prepared)} approved icons delivered, {kept_count} kept current; {remaining} awaiting revision", updated="2026-10-17")
    assert feedback_file.read_bytes() == originals[feedback_file] and style_file.read_bytes() == originals[style_file]
    write(manifest_file, manifest)
    write(style_file, style)
    queue = originals[missing_file].decode("utf-8").replace("\r\n", "\n")
    newline = "\r\n" if b"\r\n" in originals[missing_file] else "\n"
    for number in numbers:
        here = REVIEW / f"candidates/batch-{number}"
        write(here / "reviewed-installed.json", {"date": "2026-10-17", "batch": number, "pass": batches[number]["pass"],
            "approvedSubjects": len(installed[number]) + len(kept[number]), "remainingSubjects": remaining,
            "installed": installed[number], "keptCurrent": kept[number]})
        begin, end = f"<!-- style-batch-{number}:start -->", f"<!-- style-batch-{number}:end -->"
        start, finish = queue.index(begin), queue.index(end)
        lines = [begin, f"## Reviewed (A) — Batch {number} — {len(installed[number])} delivered", "",
            "Exact saved decisions and approved masks: `reviewed.json` and",
            f"`reviewed-installed.json` under `review/candidates/batch-{number}/`.", "",
            "| Subject | Native SVG (+ WEBP) | Result |", "|---|---|---|"]
        for subject, saved in zip(batches[number]["subjects"], snapshots[number]):
            result = ("Kept current — **done**" if saved["candidateId"] == "current" else "**done**") if saved["decision"] == "approve" else "Revision queued"
            lines.append(f"| {subject['name']} | `{subject['target']}` | {result} |")
        lines += ["", end]
        queue = queue[:start] + "\n".join(lines) + queue[finish + len(end):]
        check(number)
    missing_file.write_text(queue, encoding="utf-8", newline=newline)
    subprocess.run(["node", "dev/icons/style-pass/refresh-style-queue.mjs"], cwd=ROOT, check=True)
    assert feedback_file.read_bytes() == originals[feedback_file]


def check(number):
    here = REVIEW / f"candidates/batch-{number}"
    approval.check(here)
    for item in read(here / "reviewed-installed.json").get("keptCurrent", []):
        assert sha(ROOT / item["source"].lstrip("/")) == item["sourceSha256"]
        for file in item["files"]:
            assert sha(ROOT / file["source"]) == file["sha256"], "Kept-current variant changed"
    print(f"Verified {len(read(here / 'reviewed-installed.json').get('keptCurrent', []))} kept-current decisions without changing their files")
    for item in read(here / "reviewed-installed.json")["installed"]:
        retired = item.get("retiredLegacyPng")
        if retired:
            assert not (ROOT / retired["source"]).exists()
            assert sha(ROOT / retired["archive"]) == retired["sha256"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batches", nargs="+", type=int, required=True)
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        for number in args.batches:
            check(number)
    else:
        consume(args.batches, args.preflight)
