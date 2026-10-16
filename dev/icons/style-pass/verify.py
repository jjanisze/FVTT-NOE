"""Audit the prepared style pass against its immutable review and art baseline."""
import json
import subprocess
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from accept import selected_source
from snapshot import HERE, NUMBERS


def old(path):
    return json.loads(subprocess.check_output(["git", "show", f"a46d09f:{path}"], cwd=ROOT))


manifest, feedback = read(REVIEW / "manifest.json"), read(REVIEW / "feedback.json")["items"]
baseline, decisions = old("dev/icons/review/manifest.json"), old("dev/icons/review/feedback.json")["items"]
cards = {c["id"]: c for c in manifest["items"]}
assert len(baseline["items"]) == 495 and len(cards) == 524
for card in baseline["items"]:
    assert cards[card["id"]] == card and feedback[card["id"]] == decisions[card["id"]], "Earlier review changed"
assert sum(c.get("status") == "resolved" for c in manifest["items"]) == 495
assert len([c for c in manifest["items"] if c.get("status") != "resolved"]) == 29
flags = read(HERE / "incoming-style-feedback.json")["items"]
current_flags = read(REVIEW / "style-feedback.json")["items"]
subjects, production = [], {}
for number in NUMBERS:
    here = REVIEW / f"candidates/batch-{number}"
    batch = read(here / "batch.json")
    assert read(here / "validated.json")["validatedMasks"] == len(batch["subjects"])
    assert len(batch["subjects"]) == (2 if number == 105 else 9)
    if number == 105:
        assert batch["partialAtlas"] and batch["emptyCells"] == list(range(3, 10))
    for file in read(here / "incoming.json")["productionFiles"]:
        assert sha(ROOT / file["source"]) == file["sha256"], "Shipped art changed before approval"
        production[file["source"]] = file["sha256"]
    for subject in batch["subjects"]:
        flag = subject["styleFeedback"]
        assert flag in flags and current_flags[flag["iconId"]] == flag
        assert read(here / "style-feedback-before.json")[flag["iconId"]] == flag
        assert sha(ROOT / flag["source"]) == flag["sourceSha256"]
        item_id = subject["itemId"]
        assert cards[item_id]["styleReview"] == flag
        assert cards[item_id]["current"]["src"] == "/" + flag["source"]
        assert feedback[item_id]["decision"] == "pending" and feedback[item_id]["candidateId"] == "atlas-a"
        assert selected_source(subject, cards[item_id]["candidates"][0]).is_file()
        subjects.append(subject)
assert len(subjects) == len(flags) == 29
assert {s["styleFeedback"]["iconId"] for s in subjects} == {f["iconId"] for f in flags}
assert len(list((REVIEW / "candidates").glob("batch-*/*.png"))) == 828
assert read(ROOT / "dev/icons/class-placeholder-audit.json")["stats"]["confirmedPlaceholderFiles"] == 0
browser = json.loads((REVIEW / "candidates/batch-102/raw/browser-check.json").read_text(encoding="utf-8-sig"))
selection = read(REVIEW / "candidates/batch-102/raw/browser-selections.json")
assert (browser["cards"], browser["options"], browser["broken"], browser["errors"]) == (29, 58, 0, 0)
assert selection == {"cards": 29, "newCandidatesSelected": 29, "pendingDecisions": 29}
write(HERE / "progress-102-105.json", {"date": "2026-10-17", "preparedBatches": list(NUMBERS), "nextFreeBatch": 106,
    "styleFlagsConsumed": 29, "styleCandidatesPrepared": 29, "subjectsPerBatch": [9, 9, 9, 2], "emptyCellsBatch105": list(range(3, 10)),
    "originalPlaceholderSubjectsDelivered": 153, "nativePlaceholderTargetsDelivered": 155, "remainingGeneratedPlaceholders": 0,
    "reviewCardsTotal": 524, "earlierResolvedCardsPreserved": 495, "verbatimStyleDecisionsArchived": 29,
    "unchangedProductionFilesVerified": len(production), "newCandidatesInstalledBeforeApproval": 0,
    "candidateCollectionValidatedPairs": 828, "approvalProvenanceOptionsVerified": 29,
    "additionalUnpreparedStyleFlags": len([v for v in current_flags.values() if v["status"] == "redo" and v["iconId"] not in {f["iconId"] for f in flags}]),
    "browser": {"cards": 29, "options": 58, "brokenImages": 0, "errors": 0, "newCandidatesSelected": 29, "pendingDecisions": 29,
        "screenshot": "../review/candidates/batch-102/raw/review-preview.png"}})
print(f"Verified all 29 style requests, {len(production)} unchanged production files, 495 retained reviews and all new pending selections.")
