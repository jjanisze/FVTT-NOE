"""Deliver exact approved masks and publish the guarded-disengage revision."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REVIEW = ROOT / "dev/icons/review"
HERE = Path(__file__).resolve().parent
DATE = "2026-10-25"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_section(text, start, end, replacement):
    first, last = text.index(start), text.index(end) + len(end)
    return text[:first] + replacement + text[last:]


def verify_deliveries(records):
    for item in records:
        assert sha(REVIEW / item["source"]) == item["sourceSha256"]
        for file in item["files"]:
            assert sha(ROOT / file["source"]) == file["sha256"], "Delivered asset changed"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    accepted_file = HERE / "reviewed-installed.json"
    accepted = read(accepted_file) if accepted_file.exists() else {"date": DATE, "installed": []}
    if args.check:
        verify_deliveries(accepted["installed"])
        print(f"Verified {len(accepted['installed'])} exact approved SVG/WEBP pairs.")
        return

    manifest_file, feedback_file = REVIEW / "manifest.json", REVIEW / "feedback.json"
    style_file, missing_file, credits_file = REVIEW / "style-feedback.json", ROOT / "dev/icons/MISSING.md", ROOT / "CREDITS.md"
    captured = {p: p.read_bytes() for p in [manifest_file, feedback_file, style_file, missing_file, credits_file]}
    manifest, feedback = read(manifest_file), read(feedback_file)
    cards = [c for c in manifest["items"] if c["id"].startswith("hotbar-2026-")]
    assert len(cards) == 5
    prior = {item["itemId"]: item for item in accepted["installed"]}
    pending = []
    for card in cards:
        saved = feedback["items"].get(card["id"], {})
        if saved.get("decision") != "approve":
            continue
        if card["id"] in prior:
            assert prior[card["id"]]["candidateId"] == saved["candidateId"], "Changed approval needs explicit reconciliation"
            continue
        candidate = next(c for c in card["candidates"] if c["id"] == saved["candidateId"])
        source = REVIEW / candidate["src"]
        validated = read(source.parent / "validated.json")
        assert sha(source) == validated["candidateHashes"][source.stem]
        target = (ROOT / card["target"]).resolve()
        assert target.is_relative_to(ROOT / "icons") and target.suffix == ".svg"
        expected = card["deliveryTargets"][0]["sourceSha256"]
        assert sha(target) == expected if expected else not target.exists(), "Production target changed"
        assert not target.with_suffix(".webp").exists(), "Unexpected existing sidecar"
        assert source.with_suffix(".svg").is_file() and source.with_suffix(".webp").is_file()
        pending.append((card, saved, source, target))

    revision_dir = REVIEW / "candidates/batch-117"
    revision = read(revision_dir / "batch.json")
    revision_incoming = read(revision_dir / "incoming.json")
    revision_valid = read(revision_dir / "validated.json")
    assert revision_valid["validatedMasks"] == 3
    disengage = next(c for c in cards if c["id"] == "hotbar-2026-odstapienie")
    already_registered = (revision_dir / "registration.json").exists()
    if not already_registered:
        assert feedback["items"][disengage["id"]] == revision_incoming["feedback"], "Newer Disengage feedback"
        for subject in revision["subjects"]:
            assert sha(revision_dir / f"{subject['key']}.png") == revision_valid["candidateHashes"][subject["key"]]
        assert sha(REVIEW / revision_incoming["selectedSource"]) == revision_incoming["selectedSha256"]
        for item in revision_incoming["productionFiles"]:
            assert sha(ROOT / item["source"]) == item["sha256"]
        assert all(not (ROOT / path).exists() for path in revision_incoming["expectedAbsent"])

    for path, content in captured.items():
        assert path.read_bytes() == content, "Shared review or documentation changed during preflight"
    for card, saved, source, target in pending:
        archived = []
        if target.exists():
            archive = HERE / "archive" / target.relative_to(ROOT)
            archive.parent.mkdir(parents=True, exist_ok=True)
            assert not archive.exists()
            archive.write_bytes(target.read_bytes())
            archived.append({"source": target.relative_to(ROOT).as_posix(), "archive": archive.relative_to(ROOT).as_posix(), "sha256": sha(archive)})
        target.parent.mkdir(parents=True, exist_ok=True)
        delivered = []
        for suffix in [".svg", ".webp"]:
            destination = target.with_suffix(suffix)
            destination.write_bytes(source.with_suffix(suffix).read_bytes())
            delivered.append({"source": destination.relative_to(ROOT).as_posix(), "sha256": sha(destination)})
        record = {"itemId": card["id"], "candidateId": saved["candidateId"], "installedOn": DATE, "source": candidate_source(source),
            "sourceSha256": sha(source), "feedback": saved, "files": delivered, "archived": archived}
        accepted["installed"].append(record)
        card["status"] = "resolved"
    for card in cards:
        if card["id"] in prior:
            card["status"] = "resolved"

    if not already_registered:
        captions = ["Krok wstecz bez odwracania się od przeciwnika; obie ręce utrzymują gardę.",
            "Odchodząca osoba kontroluje sięgającą rękę przeciwnika i robi krok wstecz.",
            "Dwie osoby i kontrolowany odwrót, z dodatkowym znakiem przekreślonego ciosu."]
        fresh = [{"id": f"batch117-{s['key']}", "label": f"Nowe {s['variant'].upper()} · {s['name'].split(' — ')[-1]}",
            "src": f"candidates/batch-117/{s['key']}.png", "note": captions[i]} for i, s in enumerate(revision["subjects"])]
        assert not any(c["id"].startswith("batch117-") for c in disengage["candidates"])
        disengage["candidates"] = fresh + disengage["candidates"]
        disengage.update(batch=117, tier="Batch 117 · Nowe A / B / C · kontrolowane odstąpienie",
            request="Trzy nowe wersje wybranego motywu: dwie osoby w zwarciu, jedna wycofuje się w sposób kontrolowany. Gardą, kontrolą ręki lub przekreślonym ciosem próbujemy pokazać brak okazji do darmowego ataku. Wcześniejsze warianty pozostają niżej do porównania.")
        write(revision_dir / "registration.json", {"date": DATE, "itemId": disengage["id"], "newCandidates": 3,
            "earlierCandidatesPreserved": 3, "selectedReference": revision_incoming["selectedSource"], "feedbackUnchanged": True})

    remaining = [c for c in cards if c.get("status") != "resolved"]
    manifest.update(title=f"Player hotbar · {len(accepted['installed'])} approved icons delivered; {len(remaining)} awaiting review", updated=DATE)
    accepted.update(approvedSubjects=len(accepted["installed"]), remainingSubjects=len(remaining), updated=DATE)
    verify_deliveries(accepted["installed"])

    missing = captured[missing_file].decode("utf-8").replace("\r\n", "\n")
    if not already_registered:
        assert "**Next batch number: 117**" in missing
        missing = missing.replace("**Next batch number: 117**", "**Next batch number: 118**", 1)
    start, end = "<!-- player-hotbar-revision:start -->", "<!-- player-hotbar-revision:end -->"
    if remaining:
        section = f"{start}\n## Player hotbar — Odstąpienie revisions, Batch 117\n\nFour approved subjects from Batches 115–116 are delivered. Odstąpienie has\nthree new controlled-withdrawal candidates based on the selected two-person\nconcept. Exact feedback, prompts and deliveries: `hotbar-pass/README.md`.\n\n| Subject | Prospective target |\n|---|---|\n| Odstąpienie — człowiek | `icons/actions/odstapienie.svg` |\n\nThe complete hotbar picture waits for the final selection.\n{end}"
    else:
        section = ""
    missing = replace_section(missing, start, end, section)

    credits = captured[credits_file].decode("utf-8").replace("\r\n", "\n")
    credit_start, credit_end = "<!-- player-hotbar-credits:start -->", "<!-- player-hotbar-credits:end -->"
    native = [item["files"][0]["source"] for item in accepted["installed"]]
    source_batches = ", ".join(str(number) for number in sorted({int(Path(item["source"]).parts[1].removeprefix("batch-")) for item in accepted["installed"]}))
    credit_section = credit_start + f"\n{len(native)} GM-approved player-hotbar glyphs from Batches {source_batches} were delivered\nin an approval pass completed on {DATE}, as exact SVG/WEBP masks generated\nwith OpenAI's built-in image tool. Approved artwork is not redrawn. Native SVGs: " + ", ".join(f"`{path}`" for path in native) + ".\nExact decisions, source and delivery hashes: `dev/icons/hotbar-pass/reviewed-installed.json`.\n" + credit_end
    if credit_start in credits:
        credits = replace_section(credits, credit_start, credit_end, credit_section)
    else:
        anchor = "## M5 trader and upkeep illustrations"
        assert anchor in credits
        credits = credits.replace(anchor, credit_section + "\n\n" + anchor, 1)

    assert feedback_file.read_bytes() == captured[feedback_file] and style_file.read_bytes() == captured[style_file]
    write(accepted_file, accepted)
    write(manifest_file, manifest)
    for file, text in [(missing_file, missing), (credits_file, credits)]:
        file.write_text(text, encoding="utf-8", newline="\r\n" if b"\r\n" in captured[file] else "\n")
    print(f"Delivered {len(pending)} new approved icons; {len(accepted['installed'])} total. {len(remaining)} subject awaits review. All saved feedback preserved.")


def candidate_source(path):
    return path.relative_to(REVIEW).as_posix()


if __name__ == "__main__":
    main()
