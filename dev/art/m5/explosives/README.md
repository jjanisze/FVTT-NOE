# Grenade and explosive map art — 2026-10-29

All nine requested sprites are delivered for GM review.

| Key | Final file | Size |
|---|---|---|
| grenade-molotov | `vfx/grenade-molotov.webp` | 55×128 |
| grenade-dynamite | `vfx/grenade-dynamite.webp` | 73×128 |
| grenade-c4-remote | `vfx/grenade-c4-remote.webp` | 128×69 |
| grenade-ied | `vfx/grenade-ied.webp` | 127×128 |
| grenade-ied-radio | `vfx/grenade-ied-radio.webp` | 105×128 |
| grenade-improvised | `vfx/grenade-improvised.webp` | 82×128 |
| grenade-smoke | `vfx/grenade-smoke.webp` | 128×84 |
| grenade-flashbang | `vfx/grenade-flashbang.webp` | 128×84 |
| grenade-incendiary | `vfx/grenade-incendiary.webp` | 128×116 |

All have genuine alpha, a 128 px longest edge and native aspect ratio.
The existing Tile funnel uses them at 0.3 grid squares when thrown and 0.5 when placed.
A radio-specific image falls back to the subtype image before the inventory-icon fallback:
C4 retains its own image with radio control; IED selects the separate antenna variant.

The Molotov source is **unlit**. The existing renderer adds the animated flame when
`charge.lit` is true. The bottle's broader cloth and illustrated outline preserve
readability at tiny map sizes. C4 uses a simple sealed cream/olive wrapper;
the IED variants use closed squat cylinders with a clock face or an antenna.
These selected visual designs supersede the earlier planning briefs' detail choices.

Generated using OpenAI's built-in image tool; it does not expose a model identifier.
No API/CLI fallback was used. The first attempts delivered four sprites; continued
external-only game-art generations completed the other five after the GM requested persistence.
Earlier output-filter errors are retained in the corresponding results files.

Selected prompts:

- Original four: [initial set](prompts.json).
- IED, radio IED and improvised grenade: [v3 game-art prompts](game-art-v3-prompts.json).
- C4: [v5 prompt](game-art-v5-prompts.json); the earlier incendiary sprite used only as a material/painting reference.
- Molotov: [v6 illustrated prompt](game-art-v6-prompts.json).

[Selected original PNGs](selection.json); [source/output hashes, framing, alpha, dimensions and file sizes](delivery.json).
Sources remain unchanged. Only cropping, resampling and WEBP conversion were applied.
For the last five, framing uses alpha > 8/255 with a two-pixel source margin, avoiding
nearly invisible generated noise outside the visible silhouette while preserving the original alpha inside the crop.
The initial four outputs remain byte-for-byte unchanged.
Rebuild from the selected sources with:

```sh
python dev/art/m5/explosives/package.py
```

The packer creates canonical drops under `../in/objekty/` and uses the existing M5 converter.
`preview.png` shows enlarged art and actual 30/50 px sprites on two backgrounds.

## Poligon

**Strzelnica → Karta prób → Grafika: Granaty i ładunki**, probe `grafika-granaty`.
The gallery has nine enlarged paintings and 36 small samples on light/dark swatches.
Preview Tiles are inert; actual throwing and placement remain available through
Chemik on the main firing range.

The builder upgrades the earlier partial gallery in the same scene, adding the five
new groups and removing only its pending labels. Existing samples and hand placement
are preserved. It records the delivered keys, so subsequent adoption also preserves
manually deleted samples. No station reset is required.

## Existing scavenging sources

The GM's `in/ruiny/magazyn.png` and `wrak.png` were already present since
2026-10-20, both valid 1659×948 RGB. Only final conversion was missing;
the previous final-file audit overlooked those sources. They are now packaged at
1200×400 RGB WEBP without repainting. Source model metadata is unknown.
[Hashes and validation](../delivered-2026-10-29.json); small-size crop check:
`ruiny-preview.png`. Złomowisko's `ilustracje-ruin` probe covers all seven ruins.

## Verification

The `explosive-art` sandbox suite checks the actual trial-card tool and player canvas,
all nine native textures, actual thrown/placed Tile sizes and aspect ratios,
radio fallback and override, the separate Molotov flame with Sequencer/JB2A enabled,
gallery adoption and completion of the earlier four-image preview without replacing
its original samples, plus the two supplied banners in Szabrowanie and player request cards.
The handoff records the successful run and screenshots.
Current run: **6/6, no console errors**, `logs/e2e/2026-10-29T00-32-09/report.json`.
Three screenshots in that directory include the full player gallery, scavenging cards
and the gallery completed from a partial delivery. Sequencer and JB2A were enabled:

```sh
node dev/agent/fvtt.mjs e2e --suites=explosive-art --modules=neuroshima-2026-overrides,quench,sequencer,JB2A_DnD5e --keep
```

`npm test` and validation of all 37 delivered M5 catalog images pass.
[Poligon completion evidence](poligon-delivery.json): 25 samples added to the same scene,
all 20 earlier sample documents preserved exactly, all 37 other scenes and 424 tokens unchanged.
Both Poligon clients are refreshed; the gallery contains no armed charges.
