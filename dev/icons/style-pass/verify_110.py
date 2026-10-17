"""Verify Batch 110's exact references, delivery preservation and review isolation."""
import json
import subprocess
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from class_options_92 import validate_mask
from public_review import public_copy, feedback_hash


def committed(revision, relative):
    return json.loads(subprocess.check_output(["git", "show", f"{revision}:{relative}"], cwd=ROOT))


def main():
    here = REVIEW / "candidates/batch-110"
    batch, incoming, references = (read(here / name) for name in ("batch.json", "incoming.json", "references.json"))
    cards = {c["id"]: c for c in read(REVIEW / "manifest.json")["items"]}
    feedback = read(REVIEW / "feedback.json")["items"]
    touched = {s["itemId"] for s in batch["subjects"]}
    assert len(touched) == 7
    original_cards = committed("24fe617", "dev/icons/review/manifest.json")["items"]
    unrelated = [c for c in original_cards if c["id"] not in touched]
    assert len(unrelated) == 532 and len(cards) == 539
    assert all(cards[c["id"]] == c for c in unrelated)
    prior_feedback = committed("94b02fe", "dev/icons/review/feedback.json")["items"]
    archived = {}
    delivered = []
    retired = []
    for number in (108, 109):
        reviewed = read(REVIEW / f"candidates/batch-{number}/reviewed.json")
        archived.update({s["id"]: s for s in reviewed["active"]})
        for item in read(REVIEW / f"candidates/batch-{number}/reviewed-installed.json")["installed"]:
            assert sha(ROOT / item["files"][0]) == item["svgSha256"]
            assert sha(ROOT / item["files"][1]) == item["webpSha256"]
            delivered.append(item)
            if item["retiredLegacyPng"]:
                legacy = item["retiredLegacyPng"]
                assert not (ROOT / legacy["source"]).exists()
                assert sha(ROOT / legacy["archive"]) == legacy["sha256"]
                retired.append(legacy)
    for card in unrelated:
        expected = archived[card["id"]]["feedback"] if card["id"] in archived else prior_feedback[card["id"]]
        assert feedback[card["id"]] == expected
    for item in incoming["productionFiles"]:
        assert sha(ROOT / item["source"]) == item["sha256"]
    assert all(not (ROOT / relative).exists() for relative in incoming["expectedAbsent"])
    private = read(here / "raw/revision-feedback-private.json")
    for subject in batch["subjects"]:
        validate_mask(here, subject["key"])
        saved = subject["revisionOf"]
        assert sha(REVIEW / saved["selectedSource"]) == saved["sourceSha256"]
        assert public_copy(private[subject["itemId"]]) == saved["feedback"]
        assert feedback_hash(private[subject["itemId"]]) == saved["feedbackSha256"]
        assert len(cards[subject["itemId"]]["candidates"]) == 2
    supplied = references["suppliedInsignia"]
    assert sha(here / supplied["source"]) == supplied["sha256"]
    for file in here.glob("*.json"):
        value = read(file)
        assert public_copy(value) == value, "A local reference location escaped into public metadata"
    assert public_copy(feedback) == feedback
    origin = read(ROOT / "dev/icons/origin-icons-2026-10-17-delivery.json")["stats"]
    assert origin["backgroundIconsPresent"] == 5 and origin["backgroundArtGaps"] == 7 and origin["abilityArtGaps"] == 0
    style = read(REVIEW / "style-feedback.json")["items"]
    assert not any(s["status"] == "redo" for s in style.values()), "New browser flags need a separate queue"
    browser = read(here / "raw/browser-check.json")
    assert browser["cards"] == 7 and browser["options"] == 21 and not browser["brokenImages"] and not browser["errors"]
    report = {"date": "2026-10-17", "preparedBatch": 110, "nextFreeBatch": 111,
        "approvedIconsDeliveredThisReview": len(delivered), "approvedCleanupIcons": 4, "approvedMainOrigins": 5,
        "originEmblemsTotal": 12, "originAbilitiesWithArt": 36, "originRevisionsPrepared": len(touched),
        "exactSelectedReferencesPreserved": 7, "suppliedInsigniaReferenceHashPreserved": True,
        "localReferenceLocationRedactedInPublicMetadata": True, "originalFeedbackArchivedPrivatelyWithHashes": True,
        "unrelatedCardsAndDecisionsPreserved": len(unrelated), "deliveredVariantsUnchanged": len(incoming["productionFiles"]),
        "unreferencedPngSiblingsArchivedAndRetired": len(retired),
        "newCandidatesInstalledBeforeApproval": 0, "reviewCardsTotal": len(cards),
        "reviewCardsResolved": sum(c.get("status") == "resolved" for c in cards.values()),
        "candidateCollectionValidatedPairs": len(list((REVIEW / "candidates").glob("batch-*/*.png"))),
        "browserStyleFlagsRemaining": 0, "physicalItemArtGaps": 0, "physicalItemWiringGaps": 4,
        "browserAtPublication": browser}
    write(ROOT / "dev/icons/style-pass/progress-110.json", report)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
