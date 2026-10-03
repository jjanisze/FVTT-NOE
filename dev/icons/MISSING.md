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

Icons get generated in batches of 9 (one generated grid image = 9 tiles, see
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

**Next batch number: 51** (batch 50 was generated as a 3×3 atlas on 2026-10-03
and is awaiting GM review; bump this whenever another batch is generated).

*Batch 40 (2026-09-25): Kamizelka taktyczna, .44 Mag dum-dum, Mięso suszone, Chleb, Owoce
i warzywa, MRE, Breneka, Zużyty LAW, Magazynek bębnowy — processed and wired; LAW and the drum
are stored for items that do not exist yet. IMPLEMENTATION.md, 2026-09-25.*

*Batch 41 (2026-10-03): all 9 queued sheet icons generated, normalized and wired. PNG + theme-aware SVG in `icons/items/loot/`; exact prompt in `batch_41_prompt.md`, pipeline `process_grid_41.py`, live updates and validation in IMPLEMENTATION.md. The active queue below is batch 42.*

*Batch 41 review correction (2026-10-03, approved and installed): the small
`schemat_notatka` now uses the single circuit note and medium
`schemat_instrukcja` uses the flat service manual. Both replace the rejected
oversized-cog designs at their existing PNG/SVG paths. Decisions remain in
`dev/icons/review/feedback.json`; candidates and prompts remain archived under
`dev/icons/review/candidates/batch-41/`.*

*All generated production targets through batch 46 are approved, installed and
represented by reusable `sprzet` prototypes.*

*(The conditional "IED radiowy" sheet icon is dropped: the GM chose "decide at placement"
(2026-09-25), so a radio IED only exists on the map — class B row 5 covers it.)*

## Completed (A) — batch 42 — approved and installed

All nine icons are installed. Agregat, Akumulator, Alternator and Defibrylator
also have reusable `sprzet` prototypes and no longer use the production
fallback. Maczuga and Kamienny nóż use the approved simplified atlas revisions.

| # | Item | Where | Current icon | Suggested prompt content |
|---|------|-------|---------------|---------------------------|
| 1 | Maczuga (WKK vendor trash, `wkk/config/weapons-data.mjs`, PLAN_paper_doll D36) → `icons/weapons/maczuga.svg` | dropped by Grubas, Kanibal at 0 PW (Kobalt on); pack `bron` | approved and installed | Crude wooden club, thick knotted head, a few nails driven through it. Must not look like the baseball bat or the pipe |
| 2 | Pałka policyjna (WKK, D36) → `icons/weapons/palka_policyjna.svg` | Konwojent | approved and installed | Police side-handle baton (tonfa-style short grip near one end). Must read as "police", not as a pipe |
| 3 | Kamienny nóż (WKK, D36) → `icons/weapons/kamienny_noz.svg` | Kanibal | approved and installed | Knapped flint blade lashed with cord to a short bone or wood handle — primitive, chipped edge |
| 4 | Sztylet (WKK, D36) → `icons/weapons/sztylet.svg` | Myślący szczur | approved and installed | Narrow double-edged homemade dagger, simple crossguard, rag-wrapped grip. Thinner than the combat knife |
| 5 | Młotek (WKK, D36) → `icons/weapons/mlotek.svg` | Żołnierz Posterunku | approved and installed | Ordinary claw hammer, wooden handle |
| 6 | Agregat → `icons/items/loot/agregat.svg` | Serwisowanie recipe; `sprzet` prototype | approved and installed | Rugged portable gasoline generator: engine, fuel tank and tubular carry frame; no lightning symbol |
| 7 | Akumulator → `icons/items/loot/akumulator.svg` | Serwisowanie recipe; drone power; `sprzet` prototype | approved and installed | Battered 24 V lead-acid vehicle battery with two terminals and carry handle |
| 8 | Alternator → `icons/items/loot/alternator.svg` | Serwisowanie recipe; `sprzet` prototype | approved and installed | Automotive alternator with grooved belt pulley and vented housing; no detached cog symbol |
| 9 | Defibrylator → `icons/items/loot/defibrylator.svg` | Serwisowanie recipe; `sprzet` prototype | approved and installed | Rugged portable defibrillator case with two clipped paddles and coiled leads; no cartoon heart/lightning shorthand |

## Batches 43–44 — 13 integrated, 4 revisions and 1 pending

Both batches were generated as one 3×3 atlas each, then split and normalized.
Thirteen approved icons and prototypes are installed. Laptop, Wytrychy
elektroniczne, Kompas and Trucizna received revision requests; Odtwarzacz CD has
no recorded decision and remains unchanged.

| Batch | Items |
|---|---|
| 43 | Detektor ruchu; Komputer osobisty; Komputer gamingowy; Laptop; Kontroler zdalnego sterowania; Miernik skażenia chemicznego; Odtwarzacz CD; Wykrywacz metalu; Wytrychy elektroniczne |
| 44 | Kompas; Palnik acetylenowo-tlenowy; Środek usypiający; Środki dezynfekujące; Trucizna; Paralotnia; Adapter wifi; Monitorek; Router |

## Batch 45 — 8 approved and installed, Laptop returned for revision

One 3×3 atlas contained four requested revisions, the final two known production
targets, and three verified live-world gaps. Eight approved results are
installed; Laptop received another revision request.

| # | Item | Source |
|---|---|---|
| 1 | Laptop revision | Batch 43 feedback: replace touchpad-like deck with a bold keyboard grid |
| 2 | Wytrychy elektroniczne revision | Batch 43 feedback: add clear screen, knob and controls |
| 3 | Kompas revision | Batch 44 feedback: use a real lensatic compass form |
| 4 | Trucizna revision | Batch 44 feedback: contemporary toxic-warning skull and crossbones |
| 5 | Turbina wiatrowa/wodna | Rulebook production output, missing art and prototype |
| 6 | Zegarek | Profession production output, missing art and prototype |
| 7 | Berdysz | Dante actor item uses `item-bag.svg`; no dedicated asset found |
| 8 | Scyzoryk | Motocyklista actor item uses its actor portrait; no dedicated asset found |
| 9 | Skalpel | Samantha Smith actor item uses her portrait; no dedicated asset found |

## Batch 46 — 6 approved and installed, 3 returned for revision

One 3×3 atlas contained the Laptop and CD-player revisions plus seven verified
world-item gaps. Laptop, CD player, Walther PPK, Ruger LCP II, hydraulic fist
and kitchen spatula are installed. Junk mace, broken bottle and wrench received
revision requests.

| # | Item | Source |
|---|---|---|
| 1 | Laptop revision C | Four staggered rows of dash-shaped keys; no grid or touchpad |
| 2 | Odtwarzacz CD revision | Open player with raised lid and visible disc |
| 3 | Buzdygan śmieciowy | Lily actor item uses her portrait |
| 4 | Walther PPK | Lily actor item uses her portrait |
| 5 | Ruger LCP II | Samantha Smith actor item uses her portrait; Ruger Mark IV is a different weapon |
| 6 | Tulipan | Motocyklista actor item uses his portrait |
| 7 | Pięść wspomagana hydraulicznie | Two Richard Craddock variants use their portrait |
| 8 | Klucz francuski | Pokrak actor item uses his portrait |
| 9 | Łopatka kuchenna | Kucharka Irena actor item uses her portrait |

## Queue (A) — batch 50 — generated, awaiting GM review

One complete 3×3 atlas contains the requested tray revision and eight verified
world/module item gaps. Sources and normalized candidates are under
`dev/icons/review/candidates/batch-50/`.

| # | Item | Source |
|---|---|---|
| 1 | Atak tacką revision B | Bowl, cup, liquid and food actively spill from the tray |
| 2 | Kieł jadowy | GMT400 item uses a colored potion vial |
| 3 | Paliwo | GMT400 fuel tank uses a colored potion flask |
| 4 | Uzupełnienie Narzędzi Małego Medyka | Physical refill uses the generic heal symbol |
| 5 | Metalowa walizka | Reinforced metal case uses a soft leather-bag icon |
| 6 | Komponenty Amunicji | Reloading parts use the generic chemistry icon |
| 7 | Części ciężkiego karabinu | Loose parts use the complete Browning M2 icon |
| 8 | Pogromca | Chemical-dart shotgun shares the ordinary pump-shotgun icon |
| 9 | Odnóże — KOŃ (SKAŻONY) | Synthetic horse attack needs actor-specific hoof art |

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

*Weapons on the ground (PLAN_paper_doll §9, added 2026-10-03): a dropped weapon's Tile uses
`vfx/<weapon id>.webp` (`weaponId` from `config/weapons-data.mjs`, e.g. `vfx/ar.webp`) when the file
exists, else the white sheet icon with a dark outline. Optional, per weapon, any time — not queued
as rows until the GM picks which weapons are worth it (long guns read worst as small white icons).*

*(Not queued, deliberately: Granat gazowy reuses the smoke canister in practice — a second
cylinder at 25 px would not be told apart; the frag grenade is `grenade-thrown.webp` already;
mines are drawn as a coloured square today, and whether armed mines should be visible to
players as objects at all is a GM call, not an art gap. Ask before adding them.)*

---

# C. Dźwięki produkcji (audio)

Nie grafika, ale ta sama zasada „każda prośba o asset ląduje tutaj” (MG, 2026-09-24). Źródło:
Freesound CC0 (przeglądarka → podpisany URL → ffmpeg → ogg), wpis w `CREDITS.md`. Wszystkie
sloty są w `scripts/production/oprawa.mjs` (`PRACA`, `ZDARZENIA`) — pusty slot (`null`) gra ciszę.
Część ma dziś tymczasowy zamiennik z plików, które już są w repo.

| # | Slot | Plik docelowy | Dziś | Czego szukać |
|---|------|---------------|------|--------------|
| 1 | praca: kucie (kowal) | `sounds/produkcja/kucie.ogg` | `melee/degrade_chip.ogg` | kilka uderzeń młotka o kowadło, 2–3 s |
| 2 | praca: warsztat (mechanik) | `sounds/produkcja/warsztat.ogg` | cisza | klucz grzechoczący, dokręcanie śruby |
| 3 | praca: lutowanie (elektronik, haker) | `sounds/produkcja/lutowanie.ogg` | cisza | syk lutownicy, klikanie klawiatury |
| 4 | praca: chemia (chemik, aptekarz, gorzelnik) | `sounds/produkcja/chemia.ogg` | `gadzety/dezynfekcja.ogg` | bulgotanie, brzęk szkła laboratoryjnego |
| 5 | praca: szycie (krawiec) | `sounds/produkcja/szycie.ogg` | cisza | nożyce, przeciąganie nici przez skórę |
| 6 | praca: drewno (stolarz) | `sounds/produkcja/drewno.ogg` | cisza | piłowanie, strugarka |
| 7 | ukończenie | `sounds/produkcja/gotowe.ogg` | cisza | krótki, satysfakcjonujący „klik-zatrzask” + metaliczny dźwięk |
| 8 | porażka / porzucenie | `sounds/produkcja/porazka.ogg` | cisza | coś pęka, sypie się na podłogę |
| 9 | Szybka produkcja („iskra”) | `sounds/produkcja/iskra.ogg` | `explosives/detonator_switch.ogg` | elektryczny trzask iskry, bardzo krótki |

---

# D. Doll UI art (`PLAN_paper_doll.md` §7a)

One-off panel art for the paper doll, not a batch: generate with an image model from the full
spec and prompt in `PLAN_paper_doll.md` §7a. No text, no lines in the image — the callout lines
and tiles are drawn by code, and the figure is used as a CSS mask coloured by the sheet's theme,
so only its shape matters. Drop the PNG source in `icons/doll/`; the implementing agent converts
it to WebP and measures the anchor points.

| # | File | What | Size |
|---|------|------|------|
| 1 | `icons/doll/mannequin.png` | Genderless full-body silhouette with range-target proportions, front view, A-pose, hands clear of the hips, feet visible. Solid flat black, crisp edges, no texture or wear, transparent background | 800 × 1600 |

**Done 2026-10-03:** the GM's `dev/icons/dolls/mannequin.fw.png` ships as `icons/doll/mannequin.webp`,
anchors re-measured in `scripts/config/doll-anchors.mjs`. The hand-drawn stand-in
`icons/doll/mannequin-placeholder.svg` stays as a fallback. New art later = convert to WebP, point
`MANNEQUIN_SRC` at it, re-measure the anchors.

