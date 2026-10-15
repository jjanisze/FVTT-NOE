"""Meaningful regression checks for glyph limbs crossing atlas-cell boundaries."""
import unittest
from PIL import Image, ImageDraw
from process import split_components


class AtlasExtractionTests(unittest.TestCase):
    def atlas(self):
        image = Image.new("RGB", (300, 300), "black")
        draw = ImageDraw.Draw(image)
        for index in range(9):
            row, column = divmod(index, 3)
            draw.rectangle((column * 100 + 30, row * 100 + 30,
                            column * 100 + 70, row * 100 + 70), fill="white")
        return image

    def test_overhanging_hand_stays_with_its_owner(self):
        image = self.atlas()
        draw = ImageDraw.Draw(image)
        # A connected pointing arm crosses from centre cell into the right cell.
        draw.rectangle((165, 150, 220, 160), fill="white")
        cells, recovered = split_components(image)
        self.assertEqual(cells[4].getchannel("A").getpixel((215, 155)), 255)
        self.assertEqual(cells[5].getchannel("A").getpixel((215, 155)), 0)
        self.assertEqual(cells[5].getchannel("A").getpixel((250, 150)), 255)
        self.assertGreater(recovered[4], 0)
        # Every input foreground pixel appears once, never in two review glyphs.
        expected = sum(pixel > 0 for pixel in image.convert("L").getdata())
        actual = sum(sum(pixel > 0 for pixel in cell.getchannel("A").getdata()) for cell in cells)
        self.assertEqual(actual, expected)

    def test_two_fused_neighbours_are_rejected(self):
        image = self.atlas()
        ImageDraw.Draw(image).rectangle((160, 145, 240, 155), fill="white")
        with self.assertRaisesRegex(ValueError, "Fused/ambiguous"):
            split_components(image)

    def test_explicit_hand_region_keeps_disconnected_fingers_together(self):
        image = self.atlas()
        # This detached hand has 60% of its area inside the centre cell.
        ImageDraw.Draw(image).rectangle((188, 180, 207, 189), fill="white")
        ImageDraw.Draw(image).rectangle((204, 192, 207, 195), fill="white")
        cells, recovered = split_components(image, [{"cell": 5, "box": [185, 175, 210, 198]}])
        self.assertEqual(recovered[4], 96)
        self.assertEqual(cells[4].getchannel("A").getpixel((205, 185)), 255)
        self.assertEqual(cells[5].getchannel("A").getpixel((205, 185)), 0)
        self.assertEqual(cells[4].getchannel("A").getpixel((205, 193)), 255)
        self.assertEqual(cells[5].getchannel("A").getpixel((205, 193)), 0)

    def test_evenly_split_detached_fragment_is_rejected(self):
        image = self.atlas()
        ImageDraw.Draw(image).rectangle((190, 180, 209, 189), fill="white")
        with self.assertRaisesRegex(ValueError, "Fused/ambiguous"):
            split_components(image)


if __name__ == "__main__":
    unittest.main()
