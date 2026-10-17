"""Verify untouched reviews, source hashes, new origin gaps and exact deliveries."""
import json
import subprocess
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from class_options_92 import validate_mask


def main():
    baseline = "6213fca"
    def committed(relative):
        return json.loads(subprocess.check_output(["git", "show", f"{baseline}:{relative}"], cwd=ROOT))
    original_cards = committed("dev/icons/review/manifest.json")["items"]
    original_feedback = committed("dev/icons/review/feedback.json")["items"]
    cards = {c["id"]: c for c in read(REVIEW / "manifest.json")["items"]}
    feedback = read(REVIEW / "feedback.json")["items"]
    touched, subjects, production, absent = set(), [], [], []
    for number in (108, 109):
        here = REVIEW / f"candidates/batch-{number}"
        batch, incoming = read(here / "batch.json"), read(here / "incoming.json")
        subjects += batch["subjects"]
        for subject in batch["subjects"]:
            touched.add(subject["itemId"])
            validate_mask(here, subject["key"])
            assert cards[subject["itemId"]]["target"] == subject["target"]
            assert feedback[subject["itemId"]]["decision"] in ("pending", "approve", "revise", "reject")
        for item in incoming["productionFiles"]:
            assert sha(ROOT / item["source"]) == item["sha256"]
            production.append(item)
        for relative in incoming["expectedAbsent"]:
            assert not (ROOT / relative).exists()
            absent.append(relative)
    unrelated = [c for c in original_cards if c["id"] not in touched]
    assert len(unrelated) == 523 and len(cards) == 539
    assert all(cards[c["id"]] == c for c in unrelated)
    assert all(feedback[item_id] == saved for item_id, saved in original_feedback.items() if item_id not in touched)
    for number in (106, 107):
        report = read(REVIEW / f"candidates/batch-{number}/reviewed-installed.json")
        for item in report["installed"]:
            assert sha(ROOT / item["files"][0]) == item["svgSha256"]
            assert sha(ROOT / item["files"][1]) == item["webpSha256"]
        for item in report.get("keptCurrent", []):
            assert all(sha(ROOT / f["source"]) == f["sha256"] for f in item["files"])
    physical = read(ROOT / "dev/icons/catalog-icons-2026-10-17.json")["stats"]
    origin = read(ROOT / "dev/icons/origin-icons-2026-10-17.json")["stats"]
    assert physical["items"] == 333 and physical["artGaps"] == 0 and physical["wiringGaps"] == 4
    assert origin["originBackgrounds"] == 12 and origin["backgroundArtGaps"] == 12 and origin["abilityArtGaps"] == 0
    browser = read(REVIEW / "candidates/batch-108/raw/browser-check.json")
    assert browser["cards"] == 16 and browser["options"] == 34 and not browser["brokenImages"] and not browser["errors"]
    report = {"date": "2026-10-17", "preparedBatches": [108, 109], "nextFreeBatch": 110,
        "newCandidates": len(subjects), "subjectsPerBatch": [9, 7], "newOriginEmblems": 12,
        "newStyleFlags": 3, "savedStyleRevisions": 1, "approvedReplacementsInstalledThisReview": 11,
        "keptCurrentSelections": 1, "originalStyleReplacementsDelivered": 27,
        "originalStyleSubjectsResolved": 28, "originalStyleSubjectsTotal": 29,
        "unchangedCleanupProductionVariants": len(production), "missingOriginVariantsPreserved": len(absent),
        "unrelatedCardsAndDecisionsPreserved": len(unrelated), "reviewCardsTotal": len(cards),
        "reviewCardsResolved": sum(c.get("status") == "resolved" for c in cards.values()),
        "candidateCollectionValidatedPairs": len(list((REVIEW / "candidates").glob("batch-*/*.png"))),
        "physicalCatalogItems": 333, "physicalItemArtGaps": 0, "physicalItemWiringGaps": 4,
        "originAbilityIconsPresent": 36, "originBackgroundArtGaps": 12,
        "newCandidatesInstalledBeforeApproval": 0, "browserAtPublication": browser}
    write(ROOT / "dev/icons/style-pass/progress-108-109.json", report)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
