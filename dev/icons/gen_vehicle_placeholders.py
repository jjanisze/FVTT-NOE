# -*- coding: utf-8 -*-
"""Generate obviously-fake top-down stand-ins for the 14 M4 vehicles.

Same contract as `gen_token_placeholders.py`: unmistakably temporary (hazard dashes, "?"),
yet useful for testing — the exact rectangular frame of the vehicle's footprint, the front
marked at the bottom (a black triangle and a windscreen band), and the exhaust point the
smoke is emitted from. Everything comes from `dev/art/m4/catalog.json`, so the stand-ins
cannot drift from the real-art brief.

    python dev/icons/gen_vehicle_placeholders.py
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CATALOG = os.path.join(ROOT, "dev", "art", "m4", "catalog.json")
OUT = os.path.join(ROOT, "tokens", "pojazdy", "_placeholder")

HAZARD_A = (250, 208, 46, 255)
HAZARD_B = (28, 28, 28, 255)
INK = (18, 18, 18, 255)
BODY = {"silnik": (104, 118, 132), "miesnie": (150, 120, 84)}


def font(px):
    for name in ("segoeuib.ttf", "arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default()


def dashed_rect(d, box, width, dash):
    x0, y0, x1, y1 = box
    edges = [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]
    i = 0
    for (ax, ay), (bx, by) in edges:
        length = max(abs(bx - ax), abs(by - ay))
        n = max(1, int(length // dash))
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            d.line([(ax + (bx - ax) * t0, ay + (by - ay) * t0), (ax + (bx - ax) * t1, ay + (by - ay) * t1)],
                   fill=HAZARD_A if i % 2 == 0 else HAZARD_B, width=width)
            i += 1


def build(spec):
    w, h = spec["size"]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = round(max(w, h) * 0.03)
    box = [m, m, w - 1 - m, h - 1 - m]
    colour = BODY["silnik" if spec.get("exhaust") else "miesnie"]
    edge = max(3, round(min(w, h) * 0.04))
    d.rounded_rectangle(box, radius=round(min(w, h) * 0.12), fill=colour + (230,), outline=INK, width=edge)
    dashed_rect(d, [b + edge for b in box[:2]] + [b - edge for b in box[2:]], edge, max(8, min(w, h) * 0.18))
    # Windscreen band toward the front (bottom), then the facing triangle.
    bw = (box[2] - box[0]) * 0.7
    cx = w / 2
    y_ws = box[3] - (box[3] - box[1]) * 0.22
    d.rectangle([cx - bw / 2, y_ws - (box[3] - box[1]) * 0.05, cx + bw / 2, y_ws], fill=(40, 52, 64, 235))
    a = min(w, h) * 0.22
    tip = box[3] - edge * 1.5
    d.polygon([(cx, tip), (cx - a / 2, tip - a * 0.7), (cx + a / 2, tip - a * 0.7)], fill=INK)
    if spec.get("exhaust"):
        ex, ey = spec["exhaust"]
        r = max(3, min(w, h) * 0.05)
        d.ellipse([ex * w - r, ey * h - r, ex * w + r, ey * h + r], fill=(60, 60, 60, 255), outline=HAZARD_A, width=2)
    code = spec["key"][:3].upper()
    d.text((cx, h * 0.45), code, font=font(max(8, int(min(w, h) * 0.28))), fill=INK, anchor="mm")
    d.text((cx, h * 0.45 - min(w, h) * 0.30), "?", font=font(max(6, int(min(w, h) * 0.2))),
           fill=(18, 18, 18, 150), anchor="mm")
    os.makedirs(OUT, exist_ok=True)
    img.save(os.path.join(OUT, f"{spec['key']}.webp"), "WEBP", lossless=True, method=4)


if __name__ == "__main__":
    specs = [a for a in json.load(open(CATALOG, encoding="utf-8"))["assets"] if a["set"] == "pojazdy"]
    for spec in specs:
        build(spec)
    print(f"{len(specs)} vehicle placeholders -> {OUT}")
