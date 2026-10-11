"""Exercise crop geometry, source alpha rejection and WEBP output in temporary files."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
from PIL import Image
from pack import convert, prepare, specs, validate


class PackagingTests(unittest.TestCase):
    def test_catalog_has_all_requests_and_exact_public_paths(self):
        assets = specs()
        self.assertEqual(len(assets), 41)
        self.assertEqual(len({a["id"] for a in assets}), 41)
        self.assertEqual(len({a["output"] for a in assets}), 41)
        for asset in assets:
            self.assertTrue(asset["output"].startswith(("ui/", "tokens/", "vfx/")))
            self.assertTrue(asset["output"].endswith(".webp"))
            self.assertNotIn("..", asset["output"])

    def test_banner_crops_center_band(self):
        source = Image.new("RGB", (1792, 1024), "red")
        source.paste("green", (0, 212, 1792, 812))
        result = prepare(source, {"kind": "banner", "size": [1200, 400]})
        self.assertEqual(result.size, (1200, 400))
        self.assertEqual(result.getpixel((600, 200)), (0, 128, 0))
        edge = result.getpixel((600, 0))
        self.assertLess(edge[0], 8)
        self.assertGreater(edge[1], 120)

    def test_portrait_keeps_center_and_ratio(self):
        source = Image.new("RGB", (1024, 1792), "red")
        source.paste("blue", (0, 210, 1024, 1582))
        result = prepare(source, {"kind": "portrait", "size": [600, 800]})
        self.assertEqual(result.size, (600, 800))
        edge = result.getpixel((300, 0))
        self.assertLess(edge[0], 8)
        self.assertGreater(edge[2], 245)

    def test_ui_rejects_unflattened_alpha(self):
        with self.assertRaisesRegex(ValueError, "opaque"):
            prepare(Image.new("RGBA", (1200, 400), (255, 0, 0, 128)),
                    {"kind": "banner", "size": [1200, 400]})

    def test_tokens_preserve_small_frame_fill(self):
        source = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        source.paste((180, 110, 40, 255), (154, 154, 870, 870))
        result = prepare(source, {"kind": "token", "size": [400, 400]})
        box = result.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()
        self.assertAlmostEqual((box[2] - box[0]) / 400, .70, delta=.02)
        self.assertEqual(result.getpixel((0, 0))[3], 0)

    def test_tokens_reject_matte_and_clipped_frame(self):
        spec = {"kind": "token", "size": [400, 400]}
        with self.assertRaisesRegex(ValueError, "real transparency"):
            prepare(Image.new("RGB", (400, 400), "black"), spec)
        source = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
        source.paste((255, 255, 255, 255), (0, 50, 200, 350))
        with self.assertRaisesRegex(ValueError, "touches the frame"):
            prepare(source, spec)

    def test_objects_keep_native_aspect_and_alpha(self):
        source = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
        source.paste((200, 100, 40, 255), (20, 100, 380, 220))
        source.paste((200, 100, 40, 128), (20, 100, 40, 120))
        result = prepare(source, {"kind": "object", "size": [128]})
        self.assertEqual(result.size, (128, 43))
        self.assertLess(result.getpixel((0, 0))[3], 255)

    def test_final_ui_file_is_rgb_webp(self):
        spec = {"id": "postoj/example", "kind": "banner", "size": [1200, 400],
                "output": "ui/postoj/example.webp"}
        with tempfile.TemporaryDirectory() as temp:
            source, final = Path(temp) / "source.png", Path(temp) / "example.webp"
            Image.new("RGB", (1792, 1024), (180, 100, 40)).save(source)
            report = convert(source, final, spec)
            self.assertEqual(report["mode"], "RGB")
            self.assertEqual(validate(final, spec)["width"], 1200)


if __name__ == "__main__":
    unittest.main()
