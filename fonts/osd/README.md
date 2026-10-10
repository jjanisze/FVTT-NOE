# OSD font — Betaflight (GPL-3.0)

This folder is a **separate asset under the GNU General Public License v3.0** (full text: [LICENSE](LICENSE)).
The rest of the module stays MIT ([../../LICENSE](../../LICENSE)); see `PLAN_m3_towarzysze.md` D39 for the decision.

| | |
|---|---|
| Work | Betaflight OSD font, "default" (MAX7456 character set, font version 2) |
| Authors | The Betaflight project contributors |
| Source repository | <https://github.com/betaflight/betaflight-configurator> |
| Path in the repository | `resources/osd/2/default.mcm` |
| Tag | `2026.6.2` |
| SHA-256 of `default.mcm` | `d3b122c5da7fe83fc10f70ee49817b9d4f4251fc2529146b8294424782b442f6` |
| License | GPL-3.0 (the repository's `LICENSE`, copied here unchanged) |

## Files

- `default.mcm` — the original, unmodified: the preferred form for making modifications (GPL-3 §1, "source code").
- `betaflight-default.webp` — a lossless atlas generated from it: 256 characters, 12 × 18 px, in a 16 × 16 grid;
  white glyphs with a black outline on transparency.
- `LICENSE` — the full GPL-3.0 text.

The generator is part of this repository: [`dev/osd/gen_osd_font.py`](../../dev/osd/gen_osd_font.py) — the
"scripts used to control compilation" of the atlas (GPL-3 §1). Rebuild and check:

```
python dev/osd/gen_osd_font.py
python dev/osd/gen_osd_font.py --check
```

## How the module uses it

The drone camera's OSD (`scripts/actors/drony-osd.mjs`) loads the atlas as an image and draws characters from it
by character code — the font is read as data, like a sound or a picture, not linked as a library. Character codes
follow Betaflight's `src/main/drivers/osd_symbols.h` (antenna `0x01`, progress bar `0x8A`–`0x8E`, battery
`0x90`–`0x96`); the layout is `scripts/config/osd.mjs`.
