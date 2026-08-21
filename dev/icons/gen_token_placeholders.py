# -*- coding: utf-8 -*-
"""Generate obviously-fake stand-in tokens for every Bestiariusz creature.

Real art is being produced elsewhere; this fills the gap so encounters can be
built and tested now. Two goals, in tension, and the tension is the design:

  1. **Unmistakably a placeholder.** Hazard-dashed ring, flat fill, a literal
     "?" — nothing here can be confused for finished art or quietly ship.
  2. **Actually useful for testing.** Correct canvas size for the creature's
     footprint, category colour so a dozen tokens on a map stay tellable apart,
     and a hard facing notch so token *rotation* is visible at a glance — which
     is the whole reason the Roll20 art was thrown out.

Everything is derived from `bestiary.json`, so this stays in sync for free.

    python dev/icons/gen_token_placeholders.py
"""
import io, json, os, math, collections
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
MODULE_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(MODULE_ROOT, "dev", "bestiary", "bestiary.json")
OUT = os.path.join(MODULE_ROOT, "tokens", "_placeholder")

# 400 px per grid square, matching systems/dnd5e/tokens.
SIZE_PX = {"tiny": 200, "sm": 400, "med": 400, "lg": 800, "huge": 1200, "grg": 1600}

# How much of the frame the body fills.
#
# Small and Medium share a 1x1 token box, so dnd5e distinguishes them purely by
# how big the creature is *drawn* inside an identical frame — measured on the
# shipped art at scaleX 1.0: Goblin (Small) 67%, Orc (Medium) 99%, Bandit 88%.
# Placeholders copy that, otherwise a Small creature would test as Medium-sized.
FILL = {"tiny": 0.62, "sm": 0.70, "med": 0.92, "lg": 0.92, "huge": 0.94, "grg": 0.95}

# Category colours. Chosen to stay distinct at 70 px and in both light and dark
# scenes; the blood tag would have been the obvious key but four of the five
# categories are "czerwona", which tells you nothing on a map.
CATEGORY = {
    "czlowiek":    ((196, 138,  74), "L"),   # tan
    "maszyna":     (( 96, 125, 150), "M"),   # steel blue
    "mutant":      ((124, 166,  74), "U"),   # sickly green
    "potwor":      ((150,  84, 158), "P"),   # violet
    "zwierze":     ((150, 106,  70), "Z"),   # brown
    "rojZwierzat": ((110,  84,  66), "R"),   # darker brown
}
FALLBACK = ((128, 128, 128), "?")

HAZARD_A = (250, 208, 46, 255)     # yellow
HAZARD_B = (28, 28, 28, 255)       # near-black
INK = (18, 18, 18, 255)


def load_font(px):
    for name in ("segoeuib.ttf", "arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default()


def short_code(cid, taken):
    """Compact, deterministic, unique-per-run label: 'bit-boys' -> 'BB'."""
    parts = [p for p in cid.split("-") if p]
    code = "".join(p[0] for p in parts).upper() if len(parts) > 1 else parts[0][:3].upper()
    code = code[:4]
    if code in taken:                      # extend until unique
        base, n = code, 2
        while code in taken:
            code = f"{base}{n}"[:5]
            n += 1
    taken.add(code)
    return code


def dashed_ring(d, box, width, segments=32):
    """Alternating hazard dashes — reads as 'temporary' at any zoom."""
    step = 360 / segments
    for i in range(segments):
        d.arc(box, i * step, (i + 1) * step,
              fill=HAZARD_A if i % 2 == 0 else HAZARD_B, width=width)


def build(cid, rec, code):
    size = rec.get("size") or "med"
    px = SIZE_PX.get(size, 400)
    colour, letter = CATEGORY.get(rec.get("creatureType"), FALLBACK)

    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = px / 2

    # Body diameter carries the creature's drawn size (see FILL).
    dia = px * FILL.get(size, 0.9)
    r = dia / 2
    box = [c - r, c - r, c + r, c + r]
    ring_w = max(3, int(dia / 40))

    # Body: flat disc.
    inner = [v + ring_w for v in box[:2]] + [v - ring_w for v in box[2:]]
    d.ellipse(inner, fill=colour + (225,), outline=INK, width=max(2, int(dia / 100)))

    # Hazard ring, on the body's edge.
    dashed_ring(d, box, ring_w)

    # Facing notch — points SOUTH, the dnd5e convention. Rotate the token and
    # this is what tells you the rotation actually took.
    a = dia * 0.15
    tip = c + r - ring_w * 1.2
    d.polygon([(c, tip), (c - a * 0.5, tip - a * 0.8), (c + a * 0.5, tip - a * 0.8)], fill=INK)

    # Category letter + short code, stacked, scaled to the body not the frame.
    f_big = load_font(max(8, int(dia * 0.32)))
    f_small = load_font(max(6, int(dia * 0.14)))
    d.text((c, c - dia * 0.07), letter, font=f_big, fill=INK, anchor="mm")
    d.text((c, c + dia * 0.17), code, font=f_small, fill=INK, anchor="mm")

    # "?" watermark so a screenshot can never be mistaken for finished art.
    f_q = load_font(max(6, int(dia * 0.15)))
    d.text((c, c - dia * 0.30), "?", font=f_q, fill=(18, 18, 18, 140), anchor="mm")

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{cid}.webp")
    img.save(path, "WEBP", lossless=True, method=4)
    return path, px


if __name__ == "__main__":
    data = json.load(io.open(SRC, encoding="utf-8"))
    taken = set()
    counts = collections.Counter()
    n = 0
    for cid, rec in sorted(data.items()):
        if rec.get("overlay"):
            continue                      # Zombie is a modifier, not a creature
        code = short_code(cid, taken)
        _, px = build(cid, rec, code)
        counts[px] += 1
        n += 1

    print(f"Bestiariusz — placeholder tokens\n")
    print(f"  generated     {n}")
    for px, k in sorted(counts.items()):
        print(f"  {px:>4}x{px:<4}    {k}")
    print(f"\nwrote {OUT}")
    print("\nHazard ring + '?' = placeholder. Kolor = kategoria. "
          "Trójkąt na dole = przód (obrót widać od razu).")
