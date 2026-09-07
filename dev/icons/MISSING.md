# Missing-icon queue

Icons get generated in batches of 9 (one Gemini grid image = 9 tiles, see
`Pipeline.md`) via `process_grid_N.py`. Generating one icon at a time wastes a
whole grid image on 8 unused tiles; *not* tracking gaps between sessions is
the opposite failure ("this keeps happening" — flagged 2026-09-07, found
again mid-session with no record of the last few misses). This file is the
fix: log every item found sitting on a wrong/borrowed icon here as it's
found, generate a batch once the queue hits 9, then clear it.

**Next batch number: 40** (last used: `process_grid_39.py` — bump this
whenever a new batch actually gets processed).

## Queue (5/9)

| # | Item | Where | Current icon | Suggested prompt content |
|---|------|-------|---------------|---------------------------|
| 1 | Osełka (feat) | Victor von Blitz | actor's own portrait (never set) | Whetstone / sharpening stone |
| 2 | Dobycie (feat) | Victor von Blitz | actor's own portrait (never set) | Hand drawing a katana/sword from its sheath (quick-draw) |
| 3 | Zasłona (feat) | Victor von Blitz | actor's own portrait (never set) | Sword held in a raised guard / parry stance |
| 4 | Siódme poty. (feat) | Victor von Blitz | actor's own portrait (never set) | Steering wheel with speed lines / reckless driving |
| 5 | Granat sygnalizacyjny (`grenade-signal`) | `ammo-data.mjs` `GRENADE_TYPES`, party-wide | shares `smoke_grenade.svg` (placeholder — see IMPLEMENTATION.md v0.14.16) | Signal flare grenade, visually distinct from a smoke grenade |

*(Rows 1–4 found and logged 2026-09-07 while fixing Victor's inventory —
see IMPLEMENTATION.md for that pass. Row 5 was already a known, still-open
gap noted in an earlier pass; folded in here rather than left to be
rediscovered separately.)*

## How an item gets added here

Add a row any time a review finds an item on the actor's own portrait,
`icons/svg/mystery-man.svg`, or another clearly-wrong borrowed icon **with no
existing dedicated asset to just repoint it to**. A same-file data-fix (item
points at the wrong file, but the right file already exists on disk) is not
a queue entry — fix that immediately in place, the way every icon-sweep
entry in IMPLEMENTATION.md already does; only queue items that need genuinely
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
