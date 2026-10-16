"""Register validated style revisions without changing shipped art or style flags."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from snapshot import HERE, NUMBERS


def main():
    manifest_file, feedback_file, style_file = (REVIEW / name for name in ("manifest.json", "feedback.json", "style-feedback.json"))
    missing_file = ROOT / "dev/icons/MISSING.md"
    before = {file: file.read_bytes() for file in (manifest_file, feedback_file, style_file, missing_file)}
    manifest, feedback, style = (json.loads(before[file]) for file in (manifest_file, feedback_file, style_file))
    newline = "\r\n" if b"\r\n" in before[missing_file] else "\n"
    missing = before[missing_file].decode("utf-8").replace("\r\n", "\n")
    existing = {card["id"] for card in manifest["items"]}
    cards, fragments, sections = [], {}, []
    for number in NUMBERS:
        here = REVIEW / f"candidates/batch-{number}"
        assert not (here / "registration.json").exists(), "Already registered; preserve newer GM review"
        batch, validation = read(here / "batch.json"), read(here / "validated.json")
        assert validation["batch"] == number and validation["validatedMasks"] == len(batch["subjects"])
        for original in read(here / "incoming.json")["productionFiles"]:
            assert sha(ROOT / original["source"]) == original["sha256"], "Production variant changed"
        fragments[number] = []
        for subject in batch["subjects"]:
            flag, item_id, key = subject["styleFeedback"], subject["itemId"], subject["key"]
            assert style["items"][flag["iconId"]] == flag, "Newer style feedback; retain it"
            assert sha(ROOT / flag["source"]) == flag["sourceSha256"]
            assert item_id not in existing and item_id not in feedback["items"]
            assert sha(here / f"{key}.png") == validation["candidateHashes"][key], "Candidate changed"
            card = {"id": item_id, "name": subject["name"], "tier": f"Batch {number} · Style review", "batch": number,
                "target": subject["target"], "deliveryTargets": subject["deliveryTargets"], "context": subject["context"], "request": subject["request"],
                "styleReview": flag, "current": {"src": "/" + flag["source"], "note": "Existing shipped art flagged for style revision: " + ", ".join(flag["reasons"]) + (". " + flag["notes"] if flag["notes"] else "")},
                "candidates": [{"id": "atlas-a", "label": f"Batch {number} · {subject['name']}", "src": f"candidates/batch-{number}/{key}.png", "note": subject["request"]}]}
            cards.append(card)
            fragments[number].append(card)
            feedback["items"][item_id] = {"itemId": item_id, "decision": "pending", "candidateId": "atlas-a", "notes": "", "updatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")}
        begin, end = f"<!-- style-batch-{number}:start -->", f"<!-- style-batch-{number}:end -->"
        assert begin not in missing and end not in missing
        lines = [begin, f"## Queue (A) — Batch {number} — {len(batch['subjects'])} style revisions", "",
            "Broad white-glyph replacements for saved browser flags; existing art stays",
            "until fresh GM approval. Exact source and sidecar hashes, verbatim feedback",
            f"and prompts: `review/candidates/batch-{number}/`.", "",
            "| Cell | Subject | Exact SVG target (+ WEBP) |", "|---|---|---|"]
        lines += [f"| {s['cell']} | {s['name']} | `{s['target']}` |" for s in batch["subjects"]]
        lines += ["", "Browser style flags remain unchanged while candidates await approval.", "", end, ""]
        sections.append("\n".join(lines))
    assert len(cards) == 29 and len({card["id"] for card in cards}) == 29
    manifest["items"].extend(cards)
    manifest.update(title="Batches 102 + 103 + 104 + 105 · 29 style revisions awaiting GM review", updated="2026-10-17")
    start = missing.index("**Next batch number:")
    finish = missing.index("\n\n", start)
    missing = missing[:start] + "**Next batch number: 106** (29 style revisions await GM review;\nthe original 153-subject placeholder pass is complete)." + missing[finish:]
    anchor = missing.index("<!-- icon-style-review:start -->")
    missing = missing[:anchor] + "\n".join(sections) + "\n" + missing[anchor:]
    for file, original in before.items():
        assert file.read_bytes() == original, "Review or queue changed during registration"
    write(manifest_file, manifest)
    write(feedback_file, feedback)
    missing_file.write_text(missing, encoding="utf-8", newline=newline)
    for number in NUMBERS:
        here = REVIEW / f"candidates/batch-{number}"
        write(here / "manifest-items.json", {"title": manifest["title"], "updated": manifest["updated"], "items": fragments[number]})
        write(here / "registration.json", {"date": manifest["updated"], "batch": number, "newStyleCards": len(fragments[number]), "productionUnchanged": True})
    assert style_file.read_bytes() == before[style_file]
    print("Registered all 29 requested style replacements; shipped files, style flags and earlier reviews unchanged.")


if __name__ == "__main__":
    main()
