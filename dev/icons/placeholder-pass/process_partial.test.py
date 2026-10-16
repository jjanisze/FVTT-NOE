"""Protect final partial atlases from dropped subjects or an unexpected ninth glyph."""
import unittest
from PIL import Image, ImageDraw
from process import split_components, subject_count


def atlas(count):
    image = Image.new('RGB', (96, 96), 'black')
    draw = ImageDraw.Draw(image)
    for index in range(count):
        x, y = (index % 3) * 32 + 10, (index // 3) * 32 + 10
        draw.rectangle((x, y, x + 10, y + 10), fill='white')
    return image


class PartialAtlasTests(unittest.TestCase):
    def test_full_atlas_still_requires_nine_subjects(self):
        cells, _ = split_components(atlas(9))
        self.assertEqual(len(cells), 9)
        with self.assertRaisesRegex(ValueError, 'Empty atlas cell'):
            split_components(atlas(8))

    def test_eight_subjects_with_empty_ninth_cell(self):
        cells, overhangs = split_components(atlas(8), expected_cells=8)
        self.assertEqual(len(cells), 8)
        self.assertEqual(len(overhangs), 8)
        self.assertTrue(all(c.getchannel('A').getbbox() for c in cells))

    def test_extra_ninth_glyph_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Unexpected foreground'):
            split_components(atlas(9), expected_cells=8)

    def test_missing_active_subject_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Empty atlas cell'):
            split_components(atlas(7), expected_cells=8)

    def test_partial_metadata_must_declare_empty_cells(self):
        batch = {'subjects': [{'key': str(i)} for i in range(8)]}
        with self.assertRaisesRegex(AssertionError, 'Declare every unused'):
            subject_count(batch)
        batch.update(partialAtlas=True, emptyCells=[9])
        self.assertEqual(subject_count(batch), 8)


if __name__ == '__main__':
    unittest.main()
