"""Add validated style revisions to existing cards, preserving selected-current history."""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from prepare_106_107 import selected_path


def register(numbers):
    manifest_file, feedback_file, style_file = (REVIEW / name for name in ("manifest.json", "feedback.json", "style-feedback.json"))
    missing_file = ROOT / "dev/icons/MISSING.md"
    before = {f: f.read_bytes() for f in (manifest_file, feedback_file, style_file, missing_file)}
    manifest, feedback, style = (json.loads(before[f]) for f in (manifest_file, feedback_file, style_file))
    cards = {c["id"]: c for c in manifest["items"]}
    missing = before[missing_file].decode("utf-8").replace("\r\n", "\n")
    newline = "\r\n" if b"\r\n" in before[missing_file] else "\n"
    fragments, sections, total = {}, [], 0
    for number in numbers:
        here = REVIEW / f"candidates/batch-{number}"
        assert not (here / "registration.json").exists(), "Already registered; preserve newer feedback"
        batch, validation = read(here / "batch.json"), read(here / "validated.json")
        assert validation["batch"] == number and validation["validatedMasks"] == len(batch["subjects"])
        if len(batch["subjects"]) < 9:
            assert batch["partialAtlas"] and batch["emptyCells"] == list(range(len(batch["subjects"]) + 1, 10))
        for original in read(here / "incoming.json")["productionFiles"]:
            assert sha(ROOT / original["source"]) == original["sha256"], "Production changed"
        fragments[number] = []
        for subject in batch["subjects"]:
            card, saved, key = cards[subject["itemId"]], subject["revisionOf"], subject["key"]
            assert card.get("status") != "resolved" and feedback["items"][card["id"]] == saved["feedback"]
            assert style["items"][subject["styleFeedback"]["iconId"]] == subject["styleFeedback"]
            assert sha(selected_path(saved)) == saved["sourceSha256"]
            if saved["candidateId"] == "current":
                assert saved["sourceKind"] == "production" and card["current"]["src"] == saved["selectedSource"]
            else:
                assert next(c for c in card["candidates"] if c["id"] == saved["candidateId"])["src"] == saved["selectedSource"]
            assert read(here / "revision-feedback-before.json")[card["id"]] == saved["feedback"]
            assert sha(here / f"{key}.png") == validation["candidateHashes"][key]
            candidate_id = f"batch{number}-revision"
            assert not any(c["id"] == candidate_id for c in card["candidates"])
            card["candidates"].insert(0, {"id": candidate_id, "label": f"Batch {number} · revised {subject['name']}",
                "src": f"candidates/batch-{number}/{key}.png", "note": subject["request"]})
            card.update(batch=number, tier=f"Batch {number} · Style revision", request=subject["request"])
            feedback["items"][card["id"]] = {"itemId": card["id"], "decision": "pending", "candidateId": candidate_id, "notes": "",
                "updatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")}
            fragments[number].append(card)
            total += 1
        begin, end = f"<!-- style-batch-{number}:start -->", f"<!-- style-batch-{number}:end -->"
        assert begin not in missing and end not in missing
        lines = [begin, f"## Queue (A) — Batch {number} — {len(batch['subjects'])} saved style revisions", "",
            "Exact selected sources and verbatim notes are archived with the prompts.",
            "Older choices remain selectable; production requires fresh saved approval.", "",
            "| Cell | Subject | Requested correction | Native SVG (+ WEBP) |", "|---|---|---|---|"]
        lines += [f"| {s['cell']} | {s['name']} | {s['revisionOf']['notes'].replace('|', '/')} | `{s['target']}` |" for s in batch["subjects"]]
        lines += ["", f"Evidence and exact prompts: `review/candidates/batch-{number}/`.", "", end, ""]
        sections.append("\n".join(lines))
    active = [c for c in manifest["items"] if c.get("status") != "resolved"]
    manifest.update(title=f"Batches {' + '.join(map(str, numbers))} · {len(active)} style revisions awaiting GM review", updated="2026-10-17")
    start = missing.index("**Next batch number:")
    finish = missing.index("\n\n", start)
    missing = missing[:start] + f"**Next batch number: {max(numbers) + 1}** ({len(active)} style revisions await GM review;\nthe original 153-subject placeholder pass is complete)." + missing[finish:]
    anchor = missing.index("<!-- icon-style-review:start -->")
    missing = missing[:anchor] + "\n".join(sections) + "\n" + missing[anchor:]
    for file, original in before.items():
        assert file.read_bytes() == original, "Review changed during registration"
    write(manifest_file, manifest)
    write(feedback_file, feedback)
    missing_file.write_text(missing, encoding="utf-8", newline=newline)
    for number in numbers:
        here = REVIEW / f"candidates/batch-{number}"
        write(here / "manifest-items.json", {"title": manifest["title"], "updated": manifest["updated"], "items": fragments[number]})
        write(here / "registration.json", {"date": manifest["updated"], "batch": number, "revisionSubjects": len(fragments[number]), "productionUnchanged": True})
    assert style_file.read_bytes() == before[style_file]
    print(f"Registered {total} revisions on existing style cards; current-art selections, older choices and unrelated decisions retained.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batches", nargs="+", type=int, required=True)
    args = parser.parse_args()
    register(args.batches)
