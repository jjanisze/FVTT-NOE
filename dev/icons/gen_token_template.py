# -*- coding: utf-8 -*-
"""Generate sizing/alignment templates for Bestiariusz token art.

Calibrated against the 662 top-down tokens the **dnd5e system itself ships** in
`systems/dnd5e/tokens/` — that is the reference standard for this project, not a
guess. Measured conventions:

  - **400 px per grid square** (Small/Medium 400, Large 800, Huge 1200, Garg 1600).
  - **Facing south.** Every shipped token is drawn head-down; Foundry treats
    `rotation: 0` as the art's resting orientation and rotates from there.
  - **Baked drop shadow**, lower-right (light from upper-left).
  - Fill runs 85–99% of the frame; 330 of 331 shipped monsters have
    `lockRotation: false`, so the community simply accepts the shadow turning
    with the token.

The inscribed circle is still drawn as a guide: a square image rotating inside a
square cell sweeps its corners outside that cell, so art beyond the circle
overlaps neighbours at 45°. dnd5e's own art frequently ignores this. It is
offered as the strict option, not as a rule.

    python dev/icons/gen_token_template.py
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "tokens", "_template"))

# 400 px per grid square, matching systems/dnd5e/tokens.
SIZES = [
    ("malutki", 200, 0.5),
    ("maly-sredni", 400, 1),
    ("duzy", 800, 2),
    ("wielki", 1200, 3),
    ("ogromny", 1600, 4),
]

GUIDE = (255, 90, 0, 190)      # frame + arrow — hot orange, matches Termowizja
SAFE = (0, 200, 255, 150)      # rotation-safe inscribed circle
FILL = (0, 255, 120, 110)      # recommended 85% fill


def build(name, px, squares):
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = px / 2
    w = max(2, px // 128)

    # Full frame — the image bounds / one grid cell.
    d.rectangle([0, 0, px - 1, px - 1], outline=GUIDE, width=w)

    # Rotation-safe inscribed circle.
    d.ellipse([w, w, px - 1 - w, px - 1 - w], outline=SAFE, width=w)

    # Recommended fill (85%).
    m = px * 0.075
    d.ellipse([m, m, px - m, px - m], outline=FILL, width=w)

    # Centre cross.
    d.line([c, c - px * 0.04, c, c + px * 0.04], fill=GUIDE, width=w)
    d.line([c - px * 0.04, c, c + px * 0.04, c], fill=GUIDE, width=w)

    # South arrow — the creature faces DOWN, matching every token in
    # systems/dnd5e/tokens (Goblin, Bandit, DireWolf, Baboon all verified).
    a = px * 0.10
    b = px - a * 1.30
    d.polygon([(c, px - a * 0.45), (c - a * 0.42, b), (c + a * 0.42, b)], fill=GUIDE)

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"template-{name}-{px}.png")
    img.save(path, optimize=True)
    return path, squares


if __name__ == "__main__":
    print("Bestiariusz — token art templates\n")
    for name, px, squares in SIZES:
        path, sq = build(name, px, squares)
        print(f"  {name:14} {px:>4}x{px:<4} = {sq}x{sq} pól   {os.path.basename(path)}")
    print(f"\nwrote {OUT}")
    print("\nPomarańczowy = kadr. Niebieski = obszar bezpieczny przy obrocie.")
    print("Zielony = zalecane wypełnienie (85%). Strzałka = DÓŁ (południe) — jak w systems/dnd5e/tokens.")
