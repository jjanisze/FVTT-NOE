"""Publish validated origin and cleanup candidates, preserving all other reviews."""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from class_options_92 import validate_mask


def main():
    paths = [REVIEW / name for name in ("manifest.json", "feedback.json", "style-feedback.json")]
    missing_file = ROOT / "dev/icons/MISSING.md"
    originals = {p: p.read_bytes() for p in [*paths, missing_file]}
    manifest, feedback, style = (json.loads(originals[p]) for p in paths)
    cards = {c["id"]: c for c in manifest["items"]}
    old_cards = json.loads(originals[paths[0]])["items"]
    old_feedback = json.loads(originals[paths[1]])["items"]
    missing = originals[missing_file].decode("utf-8").replace("\r\n", "\n")
    newline = "\r\n" if b"\r\n" in originals[missing_file] else "\n"
    fragments, sections, touched, new_ids = {}, [], set(), set()
    core = Path(os.environ["ProgramFiles"]) / "Foundry Virtual Tabletop/resources/app/public/icons/svg/village.svg"
    assert core.is_file(), "Core comparison image is unavailable"
    timestamp = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    for number in (108, 109):
        here = REVIEW / f"candidates/batch-{number}"
        assert not (here / "registration.json").exists(), "Already registered; retain newer feedback"
        batch, validation, incoming = (read(here / name) for name in ("batch.json", "validated.json", "incoming.json"))
        assert validation["batch"] == number and validation["validatedMasks"] == len(batch["subjects"])
        if len(batch["subjects"]) < 9:
            assert batch["partialAtlas"] and batch["emptyCells"] == list(range(len(batch["subjects"]) + 1, 10))
        for item in incoming["productionFiles"]:
            assert sha(ROOT / item["source"]) == item["sha256"]
        for relative in incoming["expectedAbsent"]:
            assert not (ROOT / relative).exists(), "A missing target has appeared; inspect it first"
        fragments[number] = []
        for subject in batch["subjects"]:
            item_id, key = subject["itemId"], subject["key"]
            assert item_id not in touched
            touched.add(item_id)
            validate_mask(here, key)
            assert sha(here / f"{key}.png") == validation["candidateHashes"][key]
            if "styleFeedback" in subject:
                flag = subject["styleFeedback"]
                assert style["items"][flag["iconId"]] == flag
                assert sha(ROOT / flag["source"]) == flag["sourceSha256"]
            candidate = {"id": f"batch{number}-revision" if "revisionOf" in subject else "atlas-a",
                "label": f"Batch {number} · {subject['name']}", "src": f"candidates/batch-{number}/{key}.png", "note": subject["request"]}
            if "revisionOf" in subject:
                saved = subject["revisionOf"]
                card = cards[item_id]
                assert card.get("status") != "resolved" and feedback["items"][item_id] == saved["feedback"]
                assert read(here / "revision-feedback-before.json")[item_id] == saved["feedback"]
                assert sha(REVIEW / saved["selectedSource"]) == saved["sourceSha256"]
                assert next(c for c in card["candidates"] if c["id"] == saved["candidateId"])["src"] == saved["selectedSource"]
                assert not any(c["id"] == candidate["id"] for c in card["candidates"])
                card["candidates"].insert(0, candidate)
                card.update(batch=number, tier=f"Batch {number} · Style correction", request=subject["request"])
            else:
                assert item_id not in cards and item_id not in feedback["items"]
                new_ids.add(item_id)
                origin = subject["kind"] == "origin"
                current = {"src": f"candidates/batch-{number}/raw/core-origin-placeholder.svg" if origin else "/" + subject["target"],
                    "note": "Shared Foundry core village placeholder; dedicated origin art is missing." if origin else "Existing shipped art flagged for cleanup."}
                card = {"id": item_id, "name": subject["name"], "batch": number,
                    "tier": f"Batch {number} · " + ("Pochodzenie" if origin else "Style review"),
                    "target": subject["target"], "deliveryTargets": subject["deliveryTargets"],
                    "context": subject["context"], "request": subject["request"], "current": current, "candidates": [candidate]}
                if not origin:
                    card["styleReview"] = subject["styleFeedback"]
                manifest["items"].append(card)
                cards[item_id] = card
            feedback["items"][item_id] = {"itemId": item_id, "decision": "pending", "candidateId": candidate["id"], "notes": "", "updatedAt": timestamp}
            fragments[number].append(card)
        begin, end = f"<!-- style-batch-{number}:start -->", f"<!-- style-batch-{number}:end -->"
        assert begin not in missing
        lines = [begin, f"## Queue (A) — Batch {number} — {len(batch['subjects'])} origin / cleanup glyphs", "",
            "Broad white glyphs, 256×256, 20 px margins; SVG + lossless WEBP.",
            "Candidates await fresh GM approval. Current files and unrelated reviews remain unchanged.", "",
            "| Cell | Subject | Native SVG (+ WEBP) | Source / correction |", "|---|---|---|---|"]
        for s in batch["subjects"]:
            reason = "Missing main origin emblem; core village fallback" if s["kind"] == "origin" else (
                s["revisionOf"]["notes"] if "revisionOf" in s else ", ".join(s["styleFeedback"]["reasons"]) + ": " + s["styleFeedback"]["notes"])
            lines.append(f"| {s['cell']} | {s['name']} | `{s['target']}` | {reason.replace('|', '/')} |")
        lines += ["", f"Exact prompts, source/absence checks and feedback: `review/candidates/batch-{number}/`.", "", end, ""]
        sections.append("\n".join(lines))
    assert len(touched) == 16 and len(new_ids) == 15
    assert all(cards[c["id"]] == c for c in old_cards if c["id"] not in touched)
    assert all(feedback["items"][item_id] == saved for item_id, saved in old_feedback.items() if item_id not in touched)
    active = [c for c in manifest["items"] if c.get("status") != "resolved"]
    assert len(active) == 16
    manifest.update(title="Batches 108 + 109 · 12 origin emblems + 4 cleanup icons awaiting GM review", updated="2026-10-17")
    start = missing.index("**Next batch number:")
    finish = missing.index("\n\n", start)
    missing = missing[:start] + "**Next batch number: 110** (16 origin / cleanup glyphs await GM review;\nthe original 153-subject placeholder pass is complete)." + missing[finish:]
    anchor = missing.index("<!-- icon-style-review:start -->")
    missing = missing[:anchor] + "\n".join(sections) + "\n" + missing[anchor:]
    for p, original in originals.items():
        assert p.read_bytes() == original, "Review changed during preflight"
    for number in (108, 109):
        here = REVIEW / f"candidates/batch-{number}"
        (here / "raw/core-origin-placeholder.svg").write_bytes(core.read_bytes())
        write(here / "manifest-items.json", {"title": manifest["title"], "updated": manifest["updated"], "items": fragments[number]})
        write(here / "registration.json", {"date": manifest["updated"], "batch": number,
            "subjects": len(fragments[number]), "productionUnchanged": True,
            "coreComparison": {"source": "Foundry core icons/svg/village.svg", "sha256": sha(core), "devOnly": True},
            "unrelatedCardsAndDecisionsPreserved": len(old_cards) - 1})
    write(paths[0], manifest)
    write(paths[1], feedback)
    missing_file.write_text(missing, encoding="utf-8", newline=newline)
    assert paths[2].read_bytes() == originals[paths[2]]
    print("Registered 16 candidates: 12 origins, 3 new style cards, 1 saved revision; 523 unrelated cards and decisions unchanged.")


if __name__ == "__main__":
    main()
