#!/usr/bin/env python
"""Atlas czcionki OSD z pliku `.mcm` (MAX7456) — PLAN_m3_towarzysze.md D39.

Wejście: `fonts/osd/default.mcm` — oryginał z konfiguratora Betaflight (GPL-3, nota w `fonts/osd/README.md`).
Wyjście: `fonts/osd/betaflight-default.webp` — 256 znaków 12 × 18 px w siatce 16 × 16 (192 × 288 px), bezstratnie:
biały znak, czarna obwódka, reszta przezroczysta. Kod OSD (`scripts/actors/drony-osd.mjs`) czyta atlas jak dane:
znak o kodzie `n` leży w kolumnie `n % 16`, wierszu `n // 16`.

Ten skrypt to w rozumieniu GPL-3 §1 „skrypt kompilacji” formy wykonywalnej (atlasu) z formy źródłowej (`.mcm`),
dlatego leży w repozytorium obok wyniku.

Format `.mcm`: pierwsza linia `MAX7456`, potem 256 znaków po 64 linie po 8 bitów. Pierwsze 54 bajty znaku to
216 pikseli (12 × 18, wierszami), 2 bity na piksel od najstarszych: `00` czarny, `10` biały, `x1` przezroczysty;
pozostałe 10 bajtów to wypełnienie.

    python dev/osd/gen_osd_font.py            # zapisuje atlas
    python dev/osd/gen_osd_font.py --check    # nic nie zapisuje; kod wyjścia 1, gdy atlas nie zgadza się ze źródłem
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

# Konsola Windows startuje w cp1252 — bez tego polskie komunikaty wywalają UnicodeEncodeError.
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

MODULE_ROOT = Path(__file__).resolve().parents[2]
SRC = MODULE_ROOT / "fonts" / "osd" / "default.mcm"
OUT = MODULE_ROOT / "fonts" / "osd" / "betaflight-default.webp"

W, H = 12, 18
COLS = 16
BYTES_PER_CHAR = 64
DATA_BYTES = W * H // 4  # 54

COLORS = {0b00: (0, 0, 0, 255), 0b10: (255, 255, 255, 255)}
CLEAR = (0, 0, 0, 0)


def parse_mcm(path: Path) -> list[list[tuple[int, int, int, int]]]:
    lines = [ln.strip() for ln in path.read_text(encoding="ascii").splitlines() if ln.strip()]
    if not lines or lines[0] != "MAX7456":
        raise SystemExit(f"{path}: nie MAX7456 (pierwsza linia: {lines[:1]})")
    bajty = lines[1:]
    if len(bajty) != 256 * BYTES_PER_CHAR:
        raise SystemExit(f"{path}: {len(bajty)} bajtów, oczekiwano {256 * BYTES_PER_CHAR}")
    znaki = []
    for c in range(256):
        chunk = bajty[c * BYTES_PER_CHAR: c * BYTES_PER_CHAR + DATA_BYTES]
        px = []
        for b in chunk:
            if len(b) != 8 or set(b) - {"0", "1"}:
                raise SystemExit(f"{path}: znak {c}: zły bajt {b!r}")
            v = int(b, 2)
            for shift in (6, 4, 2, 0):
                bits = (v >> shift) & 0b11
                px.append(CLEAR if bits & 0b01 else COLORS[bits])
        znaki.append(px)
    return znaki


def atlas(znaki) -> Image.Image:
    img = Image.new("RGBA", (COLS * W, (256 // COLS) * H), CLEAR)
    for c, px in enumerate(znaki):
        ox, oy = (c % COLS) * W, (c // COLS) * H
        for i, color in enumerate(px):
            img.putpixel((ox + i % W, oy + i // W), color)
    return img


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="tylko porównaj z istniejącym atlasem")
    args = ap.parse_args()
    img = atlas(parse_mcm(SRC))
    if args.check:
        if not OUT.exists():
            print(f"brak {OUT.relative_to(MODULE_ROOT)}")
            return 1
        same = Image.open(OUT).convert("RGBA").tobytes() == img.tobytes()
        print("atlas zgodny ze źródłem" if same else "atlas NIEZGODNY ze źródłem — uruchom bez --check")
        return 0 if same else 1
    img.save(OUT, "WEBP", lossless=True, quality=100, method=6)
    print(f"{OUT.relative_to(MODULE_ROOT)}: {img.size[0]}×{img.size[1]}, {OUT.stat().st_size} B")
    return 0


if __name__ == "__main__":
    sys.exit(main())
