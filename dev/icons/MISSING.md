# Missing-asset queue

Two classes of art, two queues — they cannot share a generation grid, because each grid is
generated against one style reference:

- **A. Sheet icons** — white flat glyphs on transparent, shown in inventory rows, chat cards,
  item sheets. Pipeline: `Pipeline.md` + `normalize_icons.py`. Section *A* below.
- **B. In-world objects** — full-colour pictures of the physical thing, seen from above, used as
  map Tile textures (a thrown grenade lying on the floor, a placed charge). Different style,
  format and processing. Section *B* below. (Added 2026-09-24.)

Rule for both, from the GM (2026-09-24): **every art request goes into this file** — not into
a hand-off, a plan or an agent's working memory. If a feature needs art, the row lands here in
the same session the need is found.

---

# A. Sheet icons (white glyphs)

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

**Next batch number: 41** (last used: `process_grid_40.py`, 2026-09-25 — bump this
whenever a new batch actually gets processed).

*Batch 40 (2026-09-25): Kamizelka taktyczna, .44 Mag dum-dum, Mięso suszone, Chleb, Owoce
i warzywa, MRE, Breneka, Zużyty LAW, Magazynek bębnowy — processed and wired; LAW and the drum
are stored for items that do not exist yet. IMPLEMENTATION.md, 2026-09-25.*

## Queue (A) — 4/9

| # | Item | Where | Current icon | Suggested prompt content |
|---|------|-------|---------------|---------------------------|
| 1 | Detonator radiowy — the remote (`items/detonator.mjs`, RAW *Elektronika*) → `icons/items/loot/detonator_radiowy.svg` | pack `sprzet`; belt item | borrows `icons/items/loot/krotkofalowka_alt.svg` (walkie-talkie — exactly what it must not look like) | Handheld radio remote detonator: small box with a toggle switch under a flip-up safety cover and a short whip antenna. Must not read as a walkie-talkie |
| 2 | Kwas (fiolka) (`items/kwas.mjs`, RAW Różności) → `icons/items/loot/kwas.svg` | party: Raynald; pack `sprzet` | borrows `icons/items/loot/chemia.svg` (generic chemistry) | Small corked glass vial with a hazard/corrosive drip symbol, a droplet eating into the surface below it. Must read as "acid", distinct from the generic chemistry flask |
| 3 | Zapalnik radiowy (`items/detonator.mjs`, the 10 fuzes of the kit) → `icons/items/loot/zapalnik_radiowy.svg` | created with every Detonator radiowy | borrows `icons/items/loot/czesci_elektroniczne.svg` | Small radio receiver fuze: a thumb-sized box with a stub antenna and two short wire leads ending in a blasting-cap tube. Must pair visually with the remote (#1) |
| 4 | Zapalnik elektryczny (`items/detonator.mjs`, RAW *Elektronika*: electrode + 10 m cable) → `icons/items/loot/zapalnik_elektryczny.svg` | pack `sprzet`; C4 needs it (RAW) | borrows `icons/items/loot/czesci_elektroniczne.svg` | Coil of two-strand wire with a blasting-cap electrode on one end and bare contacts on the other. No box, no antenna — must not look like #3 |

*(The conditional "IED radiowy" sheet icon is dropped: the GM chose "decide at placement"
(2026-09-25), so a radio IED only exists on the map — class B row 5 covers it.)*

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

---

# B. In-world objects (colour, top-down, map Tiles)

Pictures of the physical item as it lies on the map — what `vfx/grenade-thrown.webp` already
is for a thrown grenade. Everything that differs from class A:

| | Class A (sheet icon) | Class B (in-world object) |
|---|---|---|
| Style reference | `reference_weapon.svg` | **`vfx/grenade-thrown.webp`** |
| Look | white flat silhouette | full colour, realistic, painted/photographic |
| View | icon convention | **from directly above**, the object lying on the ground |
| Background | transparent (or black luma mask) | transparent — if the generator will not do that, a **flat pure `#00FF00`** background to key out. Never black: dark metal would key out with it |
| Shadow / ground | n/a | **none** — no floor, no cast shadow; Foundry draws it on the map |
| Aspect | forced 1:1 | **native** — never squared (the spike strip is 3:1; squaring it broke the tile) |
| Size / format | 256×256 PNG | **long side 128 px, WEBP** with alpha (see memory "WEBP, not PNG") |
| Processing | `normalize_icons.py` | **`normalize_world_assets.py`** (trim to content, keep aspect, resize, WEBP; `--key 00ff00` for a green background) |
| Destination | `icons/**` | `vfx/<item id>.webp` |

Readability: on the map these are drawn several times larger than life (a grenade at ~4×) and
still end up ~20–30 px on screen. Strong silhouette and contrast beat detail.

**Naming is the wiring.** A thrown/placed explosive's Tile uses `vfx/<subtype>.webp` when that
file exists (e.g. `vfx/grenade-molotov.webp`) and falls back otherwise — a thrown grenade to
`vfx/grenade-thrown.webp`, a placed charge (mine, C4, IED) to its own white sheet icon, since a
grenade photo would pretend to be a mine. A radio-fuzed charge looks for
`vfx/<subtype>-radio.webp` first. The tile's proportions come from the image itself. So a
finished file dropped in under the right name needs no code change (`_pendingTileTexture()` /
`_placedTexture()` in `actors/grenade-inventory.mjs`).

Batching: same 9-per-grid rule as class A, separate grid.

## Queue (B) — 9/9, gotowy do wygenerowania

Ordered by how long the object stays on the map. Thrown grenades lie there until the end of the
turn; placed charges can lie there for hours of game time.

| # | File | Item / where it shows up | Suggested prompt content |
|---|------|--------------------------|---------------------------|
| 1 | `grenade-molotov.webp` | Koktajl Mołotowa, thrown, lies until end of turn — and it is lit (emits light under WKK). Hand-off §2 asked for this first | Glass bottle lying on its side, seen from above, cloth rag stuffed in the neck and **burning** — small bright flame at the rag. Brownish liquid visible through the glass |
| 2 | `grenade-dynamite.webp` | Dynamit (laska), lit before throwing (hand-off §2.3) | Single red stick of dynamite lying on the ground, seen from above, short fuse at one end with a **sparking** tip |
| 3 | `grenade-c4-remote.webp` | Plastik C4, placed charge (hand-off §2.3) | Off-white/grey block of plastic explosive in olive wrapping, an electric blasting cap pushed into it, two thin wires trailing off |
| 4 | `grenade-ied.webp` | IED — timed (clock/fuse) variant (hand-off §2.3) | Short steel pipe bomb with end caps, a small wind-up alarm clock taped to it with wires — improvised, dirty, duct tape |
| 5 | `grenade-ied-radio.webp` | IED planted with a radio fuze — the Tile picks `vfx/<subtype>-radio.webp` for radio charges (`_placedTexture()` in `grenade-inventory.mjs`); a radio C4 would use `grenade-c4-remote-radio.webp` the same way, not queued | Same pipe bomb, with a small radio receiver box and a whip antenna instead of the clock |
| 6 | `grenade-smoke.webp` | Granat dymny, thrown | Cylindrical smoke grenade canister lying on its side, pull ring, wisp of grey smoke at the top |
| 7 | `grenade-flashbang.webp` | Granat hukowy, thrown | Flashbang: perforated cylindrical body lying on its side, spoon lever and pin ring |
| 8 | `grenade-incendiary.webp` | Granat zapalający, thrown | Incendiary grenade canister, red band markings, lying on its side |
| 9 | `grenade-improvised.webp` | Granat improwizowany, thrown | Improvised grenade: tin can packed with nails and bolts, taped shut, short fuse |

*(Not queued, deliberately: Granat gazowy reuses the smoke canister in practice — a second
cylinder at 25 px would not be told apart; the frag grenade is `grenade-thrown.webp` already;
mines are drawn as a coloured square today, and whether armed mines should be visible to
players as objects at all is a GM call, not an art gap. Ask before adding them.)*
