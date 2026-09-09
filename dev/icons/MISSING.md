# Missing-icon queue

Icons get generated in batches of 9 (one Gemini grid image = 9 tiles, see
`Pipeline.md`) via `process_grid_N.py`. Generating one icon at a time wastes a
whole grid image on 8 unused tiles; *not* tracking gaps between sessions is
the opposite failure ("this keeps happening" — flagged 2026-09-07). This file
is the fix: log every item found sitting on a wrong/borrowed icon here as
it's found, generate a batch once the queue hits 9, then clear it.

**Out of scope for this queue: feat / Sztuczka icons.** Those get one big
future pass of their own, not a trickle into this queue (2026-09-07). Victor's
homebrew feats found the same session this file was created still lack icons —
see IMPLEMENTATION.md (19) — but belong to that future pass, not here.

Update, IMPLEMENTATION.md (21): three of the four feats named here originally
(Osełka/Dobycie/Zasłona) **no longer exist** — they turned out to be the three
clauses of the Sztuczka `Samuraj`, split up by the Roll20 import, and were
merged into one canonical item that already has a proper icon. What is left on
an actor-portrait icon across the whole party is just two homebrew feats:
Victor's `Siódme poty.` and Laffitte's `Mizoofobia`. Still that future pass,
still not this queue — but it is two items, not a pile.

**Next batch number: 40** (last used: `process_grid_39.py` — bump this
whenever a new batch actually gets processed).

## Queue (6/9)

| # | Item | Where | Current icon | Suggested prompt content |
|---|------|-------|---------------|---------------------------|
| 1 | Granat sygnalizacyjny (`grenade-signal`) | `ammo-data.mjs` `GRENADE_TYPES`, party-wide | shares `smoke_grenade.svg` (placeholder — see IMPLEMENTATION.md v0.14.16) | Signal flare grenade, visually distinct from a smoke grenade |
| 2 | .44 Mag (dum-dum) (`44mag_dd`) | `ammo-data.mjs` `AMMO_CALIBERS`, Lorentz | shares `ammo_44_mag.svg` with the plain round (placeholder — v0.14.24) | Hollow-point .44 Magnum cartridge, bullet tip visibly cross-cut/hollowed, otherwise same casing as the plain .44 Mag |
| 3 | Mięso suszone / jerky (`mieso_suszone`) | `prowiant-data.mjs` `PROWIANT_CATALOG` (v0.14.25) | shares `canned_food.svg` | Strips of dried cured meat / jerky, hanging or stacked — clearly not a tin |
| 4 | Chleb (`chleb`) | `prowiant-data.mjs` `PROWIANT_CATALOG` (v0.14.25) | shares `canned_food.svg` | Round rustic loaf of bread, post-war home-baked look |
| 5 | Owoce i warzywa (`owoce`) | `prowiant-data.mjs` `PROWIANT_CATALOG` (v0.14.25) | shares `canned_food.svg` | A small pile of root vegetables and fruit, wasteland-grown, slightly misshapen |
| 6 | Racja wojskowa MRE (`mre`) | `prowiant-data.mjs` `PROWIANT_CATALOG` (v0.14.25) | shares `menazka.svg` (a mess tin — related, but not the same object) | Sealed military MRE ration pouch with stencilled markings |

*(Rows 3–6: the Prowiant catalogue added in v0.14.25 has nine food entries and only
one real food icon, `canned_food.svg`. The four queued here are the ones a player is
most likely to actually carry AND the most visually distinct from a tin can — the
remaining five (Prowiant, Mięso, Ser, Ryby, Liofilizat) deliberately keep sharing the
generic tin as a "some food" glyph rather than each claiming a queue slot.)*

*(Row 1 was already a known, still-open gap noted in an earlier pass;
logged here rather than left to be rediscovered separately.)*

## How an item gets added here

Add a row any time a review finds an item on the actor's own portrait,
`icons/svg/mystery-man.svg`, or another clearly-wrong borrowed icon **with no
existing dedicated asset to just repoint it to** — *except* feat/Sztuczka
icons (see above, their own future pass). A same-file data-fix (item points
at the wrong file, but the right file already exists on disk) is not a queue
entry either — fix that immediately in place, the way every icon-sweep entry
in IMPLEMENTATION.md already does; only queue items that need genuinely
**new** art.

## How a batch actually gets processed (recap of `Pipeline.md`)

1. Take the 9 "Suggested prompt content" cells above, feed them into the
   structured prompt in `Pipeline.md` (`reference_weapon.svg` style-reference
   + the 9 content lines as the "Contents" list), generate, save results to
   `in/`.
2. Run `normalize_icons.py` (crop/resize/transparency).
3. Copy the 9 results into the module's real `icons/**` tree, name them
   properly, write a dated `IMPLEMENTATION.md` entry (same format as every
   other icon-sweep entry, e.g. v0.14.19/v0.14.18/v0.14.17), and repoint each
   affected item's `img` at the real file.
4. Clear this file's queue table back to empty and bump "Next batch number".
