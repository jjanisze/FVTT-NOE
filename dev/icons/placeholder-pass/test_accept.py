"""Ensure an older exact GM selection is delivered with its own provenance."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import accept


class SelectedSourceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="neuroshima-icon-selection-")
        self.addCleanup(self.temporary.cleanup)
        self.review = Path(self.temporary.name).resolve()
        self.folder = self.review / "candidates/batch-72"
        self.folder.mkdir(parents=True)
        self.source = self.folder / "elektronik.png"
        self.source.write_bytes(b"older exact selected pixels")
        self.digest = hashlib.sha256(self.source.read_bytes()).hexdigest()
        (self.folder / "validated.json").write_text(json.dumps({"batch": 72,
            "candidateHashes": {"elektronik": self.digest}}), encoding="utf-8")
        self.subject = {"key": "elektronik"}
        self.selected = {"src": "candidates/batch-72/elektronik.png"}

    def test_old_selection_uses_its_original_validation(self):
        with patch.object(accept, "REVIEW", self.review):
            self.assertEqual(accept.selected_source(self.subject, self.selected), self.source)

    def test_changed_old_candidate_is_rejected(self):
        self.source.write_bytes(b"changed after review")
        with patch.object(accept, "REVIEW", self.review), self.assertRaisesRegex(AssertionError, "Selected candidate changed"):
            accept.selected_source(self.subject, self.selected)

    def test_source_outside_candidate_tree_is_rejected(self):
        with patch.object(accept, "REVIEW", self.review), self.assertRaisesRegex(AssertionError, "escapes"):
            accept.selected_source(self.subject, {"src": "../outside.png"})


if __name__ == "__main__":
    unittest.main()
