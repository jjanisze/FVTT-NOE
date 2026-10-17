"""Verify the expanded coverage queue without touching other agents' work."""
import json
import subprocess
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from class_options_92 import validate_mask
from public_review import public_copy


def main():
    here = REVIEW / "candidates/batch-111"
    batch, incoming = read(here / "batch.json"), read(here / "incoming.json")
    cards = {c["id"]: c for c in read(REVIEW / "manifest.json")["items"]}
    feedback = read(REVIEW / "feedback.json")["items"]
    def committed(relative):
        return json.loads(subprocess.check_output(["git", "show", f"43f071b:{relative}"], cwd=ROOT))
    old_cards = committed("dev/icons/review/manifest.json")["items"]
    old_feedback = committed("dev/icons/review/feedback.json")["items"]
    touched = {s["itemId"] for s in batch["subjects"]}
    assert len(touched) == 7 and len(cards) == 544
    unrelated = [c for c in old_cards if c["id"] not in touched]
    assert len(unrelated) == 537
    assert all(cards[c["id"]] == c and feedback[c["id"]] == old_feedback[c["id"]] for c in unrelated)
    for subject in batch["subjects"]:
        validate_mask(here, subject["key"])
        assert cards[subject["itemId"]]["target"] == subject["target"]
        if "revisionOf" in subject:
            saved = subject["revisionOf"]
            assert sha(REVIEW / saved["selectedSource"]) == saved["sourceSha256"]
            assert next(c for c in cards[subject["itemId"]]["candidates"] if c["id"] == saved["candidateId"])["src"] == saved["selectedSource"]
    for file in incoming["productionFiles"]:
        assert sha(ROOT / file["source"]) == file["sha256"]
    assert all(not (ROOT / relative).exists() for relative in incoming["expectedAbsent"])
    assert all(public_copy(read(file)) == read(file) for file in here.glob("*.json"))
    coverage = read(ROOT / "dev/icons/module-coverage-2026-10-17.json")["summary"]
    assert coverage["newCompanionArtSubjects"] == 5 and coverage["unresolvedBestiaryArtEntries"] == 7
    assert all(g["missing"] == 0 and g["placeholders"] == 0 for g in coverage["groups"] if g["kind"] != "origin")
    assert coverage["sztuczkiWithExistingArt"] == coverage["sztuczki"] == 53
    assert coverage["generatedInitialsAcrossLibrary"] == coverage["unresolvedLiteralReferences"] == coverage["missingCanonicalStatusImages"] == 0
    physical = read(ROOT / "dev/icons/catalog-icons-2026-10-17-final-audit.json")["stats"]
    assert physical["items"] == 333 and physical["artGaps"] == 0 and physical["wiringGaps"] == 4
    browser = read(here / "raw/browser-check.json")
    assert browser["cards"] == 7 and browser["options"] == 18 and browser["newCandidatesSelected"] == 7
    assert not browser["brokenImages"] and not browser["errors"]
    report = {"date": "2026-10-17", "preparedBatch": 111, "nextFreeBatch": 112,
        "approvedOriginEmblemsDeliveredThisReview": 5, "originEmblemsDeliveredTotal": 10,
        "originRevisionsPrepared": 2, "newCompanionArtSubjects": 5, "companionEntriesCoveredByNewArt": 7,
        "newCandidatesInstalledBeforeApproval": 0, "approvedVariantsUnchanged": len(incoming["productionFiles"]),
        "unrelatedCardsAndDecisionsPreserved": len(unrelated), "reviewCardsTotal": len(cards),
        "reviewCardsResolved": sum(c.get("status") == "resolved" for c in cards.values()),
        "candidateCollectionValidatedPairs": len(list((REVIEW / "candidates").glob("batch-*/*.png"))),
        "physicalItemArtGaps": 0, "physicalItemWiringGaps": 4, "sztuczkiWithExistingArt": 53,
        "bestiaryEntriesWithArtReadyForWiring": 80, "companionFallbackEntries": 11,
        "generatedInitialsRemaining": 0, "brokenLiteralIconReferences": 0,
        "browserAtPublication": browser}
    write(ROOT / "dev/icons/style-pass/progress-111.json", report)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
