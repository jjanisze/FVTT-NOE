# Missing-asset queue

Checked against files on disk, 2026-10-31: **0 missing graphics in the current queue**.
**7 vehicle sound files remain absent**, including one optional siren.

All 23 portrait/token pairs (16 Bestiary entries, 3 horses, 4 companions) are approved
and delivered to final paths. The last delivery is Neobear p07/t01 and Mobsprzet p01/t05.
[Versions and exact delivery hashes](../art/creatures/installed.json),
[portrait/token handoff](../art/creatures/REFERENCJE.md).
The 12 instrument glyphs and 2 water-status glyphs are also approved and delivered as
exact SVG/WEBP pairs from Batches 119–120. [Delivery receipt](m6-pass/reviewed-installed.json).
The GM rejected the old static water overlay because the animated silhouette effect
already replaces it; no static replacement is requested.

Remaining instrument/status image wiring, pack builds and campaign updates are integration
work in [FINAL_HANDOFF.md](FINAL_HANDOFF.md), outside the current assets-only scope.
Only outstanding asset requests belong here; delivery history is kept in the handoff.

**Next batch number: 121** (Batches 119–120 are delivered).

<!-- class-placeholder-audit:start -->
<!-- class-placeholder-audit:end -->

<!-- icon-style-review:start -->
<!-- icon-style-review:end -->

## P. Pojazdy (M4) — 7 dźwięków

Requested for `PLAN_m4_pojazdy.md` §8. All 14 vehicle graphic sets and 14 individual
wreck images are delivered. Four generic machine/drone wrecks are also delivered.
Sound cues, durations and exhaust points:
[BRIEFS_MISSING.md](../art/m4/BRIEFS_MISSING.md).

Missing in `sounds/pojazdy/`:

| File | Purpose |
|---|---|
| `start-benzyna.ogg` | Petrol engine start |
| `start-diesel.ogg` | Diesel engine start |
| `start-motocykl.ogg` | Motorcycle engine start |
| `zgaszenie.ogg` | Engine shutdown |
| `nieudane-odpalenie.ogg` | Failed engine start |
| `alarm.ogg` | Vehicle alarm |
| `syrena.ogg` | Siren — optional |

Specification: mono 44.1 kHz Vorbis, CC0, M5 loudness rules.

## How an item gets added here

Add only a confirmed missing asset: final path, purpose, spec and prompt/brief link.
An existing correct image needing a repoint is a wiring task, kept in the handoff.
After delivery, validate the file, add its credit and remove the queue row.
For M5 catalog assets: `python dev/art/m5/pack.py`, then `--check`.
New white glyphs follow [Pipeline.md](Pipeline.md) and require GM review.
