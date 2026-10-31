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

## A. Action markers (M7) — 3 status glyphs

Requested for `PLAN_m7_zdolnosci.md` §3.0.1 (GM decisions D5–D6) and E4 (Strzelec, U20). Shown on the token and in
the Token HUD; core placeholders until delivery (`icons/svg/lightning.svg`, `icons/svg/clockwork.svg`,
`icons/svg/target.svg`, set in `scripts/config/conditions.mjs`). Class A white glyphs — [Pipeline.md](Pipeline.md), GM review;
size and stroke as the other status glyphs ([ASSETS.md](../../icons/statuses/ASSETS.md)).

| Missing file | Status id | Meaning |
|---|---|---|
| `icons/statuses/reakcja.svg` + `.webp` | `reakcja` | Reaction used — back at the start of the owner's next turn; must not read as Unikanie |
| `icons/statuses/akcja-bonusowa.svg` + `.webp` | `akcjaBonusowa` | Bonus Action used this turn |
| `icons/statuses/stanowisko-snajperskie.svg` + `.webp` | `stanowiskoSnajperskie` | Strzelec's sniper nest after 5 rounds of aiming (range ×3); gone when the token moves — must not read as a crosshair "targeted" marker |

## K. Bleeds (M7) — 5 status glyphs

GM decision 2026-10-31 ([docs/Krwawienia.md](../../docs/Krwawienia.md)): the bleeds are separate effects with their own icons,
and one actor can carry several at once — so each needs a glyph that reads as "bleeding" yet tells the others apart at
token size. Today all share the core `bleeding` status. Class A white glyphs, same rules as section A.

| Missing file | Status id (planned) | Meaning |
|---|---|---|
| `icons/statuses/krwawienie-hemofilia.svg` + `.webp` | `krwawienieHemofilia` | Hemofilia bleed — the disease, not a wound (a drop with a blood-cell / clotting hint) |
| `icons/statuses/krwawienie-podstepny.svg` + `.webp` | `krwawieniePodstepny` | Podstępny atak — a cut wound, 1k8 per turn; the WKK dum-dum bleed reuses it unless the GM asks for its own |
| `icons/statuses/krwawienie-tetnica.svg` + `.webp` | `krwawienieTetnica` | Przycelowanie — severed artery, 1k6 per turn (a spurting drop) |
| `icons/statuses/krwawienie-kolory.svg` + `.webp` | `krwawienieKolory` | Kolory Rdza/Rtęć/Stal — the light bleed from each Stopień Zranienia, −1 PW per turn (a small single drop) |
| `icons/statuses/krwawienie-pila.svg` + `.webp` | `krwawieniePila` | Juggernaut's circular saw (Notatnik Łowcy, s. 217) — 1k4 per turn until dressed (a drop with a saw-tooth edge) |

## K. Bleeds (M7) — 7 status glyphs

GM decision 2026-10-31 ([docs/Krwawienia.md](../../docs/Krwawienia.md)): the bleeds are separate effects with their own icons,
and one actor can carry several at once — so each needs a glyph that reads as "bleeding" yet tells the others apart at
token size. Today all share the core `bleeding` status. Class A white glyphs, same rules as section A.

| Missing file | Status id (planned) | Meaning |
|---|---|---|
| `icons/statuses/krwawienie-hemofilia.svg` + `.webp` | `krwawienieHemofilia` | Hemofilia bleed — the disease, not a wound (a drop with a blood-cell / clotting hint) |
| `icons/statuses/krwawienie-podstepny.svg` + `.webp` | `krwawieniePodstepny` | Podstępny atak — a cut wound, 1k8 per turn |
| `icons/statuses/krwawienie-tetnica.svg` + `.webp` | `krwawienieTetnica` | Przycelowanie — severed artery, 1k6 per turn (a spurting drop) |
| `icons/statuses/krwawienie-kolory.svg` + `.webp` | `krwawienieKolory` | Kolory Rdza/Rtęć/Stal — the light bleed from each Stopień Zranienia, −1 PW per turn (a small single drop) |
| `icons/statuses/krwawienie-pila.svg` + `.webp` | `krwawieniePila` | Juggernaut's circular saw (Notatnik Łowcy, s. 217) — 1k4 per turn until dressed (a drop with a saw-tooth edge) |
| `icons/statuses/krwawienie-dumdum.svg` + `.webp` | `krwawienieDumdum` | WKK dum-dum round — same numbers as Podstępny atak but a separate effect that can sit next to it, so it must not look the same (a drop with a bullet hole) |
| `icons/statuses/wyciek.svg` + `.webp` | `wyciek` | Machine hydraulics hit by Przycelowanie — 1k6 per turn until repaired; not a wound (an oil drop, no blood red) |

## How an item gets added here

Add only a confirmed missing asset: final path, purpose, spec and prompt/brief link.
An existing correct image needing a repoint is a wiring task, kept in the handoff.
After delivery, validate the file, add its credit and remove the queue row.
For M5 catalog assets: `python dev/art/m5/pack.py`, then `--check`.
New white glyphs follow [Pipeline.md](Pipeline.md) and require GM review.
