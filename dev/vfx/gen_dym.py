"""Exhaust puff texture for vehicle smoke (PLAN_m4_pojazdy §4.5): a soft, lumpy white blob, tinted at runtime.

    python dev/vfx/gen_dym.py   ->  vfx/pojazdy/dym.webp
"""
import math, os, random
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "vfx", "pojazdy", "dym.webp")
N = 128
random.seed(4)
img = Image.new("L", (N, N), 0)
px = img.load()
# A few overlapping soft lobes make the puff read as smoke, not a disc.
lobes = [(N / 2 + random.uniform(-14, 14), N / 2 + random.uniform(-14, 14), random.uniform(22, 34)) for _ in range(6)]
for y in range(N):
    for x in range(N):
        a = 0.0
        for cx, cy, r in lobes:
            d = math.hypot(x - cx, y - cy) / r
            a = max(a, max(0.0, 1 - d) ** 1.6)
        px[x, y] = int(min(1.0, a) * 235)
img = img.filter(ImageFilter.GaussianBlur(3))
rgba = Image.merge("RGBA", (Image.new("L", (N, N), 255),) * 3 + (img,))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
rgba.save(OUT, "WEBP", lossless=True, method=6)
print(OUT)
