# Fallout 2 weapon sound library — decoded

> ### ⚠️ Corrections applied after this table was written
>
> Three problems were found while building the sound banks. The symbol table
> below is **left as originally written** (it records what was concluded at the
> time); these corrections override it.
>
> **1. `#` — the "UZI burst" note in `LISTENING_NOTES.md` is wrong. It IS an
> energy weapon, as this table originally said.**
> Line 17 of the notes describes `#`'s `_1` **fire** recording as *"UZI burst
> (medium caliber)"*, which briefly looked like the library's only SMG burst —
> the thing `9mm`/`45acp` KS+DS (Empepiątka, UZI, Tommy gun) have no source for.
> Auditioning the converted files settled it: **fire, click and reload are all an
> EMP/pulse rifle.** This table's original reading (from the `b4_09` reload) was
> right after all.
>
> `#` is still mixed, just differently than the notes implied: its 16 **hit**
> recordings are audibly a *different* weapon from its own fire/click/reload, and
> plausibly ballistic. Those survive as the impacts-only, wired-to-nothing bank
> `impact-unknown`; the energy parts sit in `energy-unused/`.
>
> **Consequence: there is no SMG burst anywhere in this library.** 9mm/45acp
> automatic fire falls back to the generic burst tiers until real audio is
> sourced.
>
> **2. `@` is most likely a heavy machine gun, not a heavy energy weapon.**
> Same failure mode: filed from its reload (`b4_10`, "large energy weapon"),
> while its two **fire** recordings are *"a single, powerful shot from a high
> caliber weapon"* and *"four low fire rate shots from a powerful high caliber
> weapon"* (lines 38–39) — a low-rate-of-fire HMG. `.50 BMG` (Browning, Light
> Fifty) had no candidate at all. Now bank `hmg`, flagged for audition.
>
> **3. All 22 `#` files were missing from `f2-decoded/`.**
> They are the only files whose raw names use a lowercase `w` prefix
> (`wA#1XXX1.wav`) and contain `#`, which fell outside the pattern the
> organizing pass matched — so they were silently dropped, and the 339→280 file
> count hid it. Recovered by `dev/audio/recover_hash_symbol.ps1`.
>
> **4. `O` (thrown weapon) has a usable fire sound but an unusable hit.**
> Its `hit` is a large explosion / car-crash impact, nothing like a thrown knife
> or star landing — confirmed by ear. Blacklisted in `build_sound_banks.ps1`
> rather than banked; the fire sound is kept.
>
> **5. Single and burst hit recordings are NOT interchangeable.**
> The `WH*2*` ("burst") hits are multi-hit strings — several rounds landing in
> sequence. Treating them as extra takes of the same impact makes single shots
> randomly sound like a whole burst landing. They are now separate slots
> (`impact-X` vs `impact-burst-X`), and only symbols `#` and `@` recorded burst
> hits at all.
>
> **Lesson for future decoding:** a reload sound is weak evidence of identity —
> but so is a single by-ear pass on an unnormalized file. Both `#` and `@` were
> mis-filed from their reloads, and `#`'s fire sound was then mis-called in the
> other direction. What actually settled it was **normalized audio, auditioned in
> context and A/B'd against neighbouring banks**. Do that before trusting any
> "medium"/"low" confidence row below.
>
> Current caliber→bank assignments, with per-assignment reasoning, live in
> `scripts/config/sound-banks.mjs`. Audition them in-game with
> `game.neuroshima.sounds.panel()`. All banked audio is now loudnorm'd to
> −18 LUFS (`build_sound_banks.ps1 -Normalize`), because raw F2 levels vary
> enough between prototypes that loudness dominated the judgement.

Source: `dev/audio/lib/f2/` (339 raw `.wav` files extracted from Fallout 2).
Decoded collaboratively by listening — see `listen/LISTENING_NOTES.md` for
the raw session notes this table was built from.

**Organized, renamed copies live in `dev/audio/lib/f2-decoded/`** (280 files,
originals in `f2/` untouched as archival reference), sorted into
`firearms/`, `energy-unused/`, `weapon-adjacent/`, `melee-unarmed/`,
`unclassified/`. Filename shape:
`{identity}_sym{originalSymbol}_{type}[-single|-burst][-mat{F|M|S|W}]_v{take}.wav`
— the original Fallout 2 symbol is kept in the filename (`_symA`, `_symH`, …)
so you can always trace a renamed file back to `DECODED_SOUND_MAP.md`'s table
and the raw file in `f2/`.

**Discovered while organizing**: `hit` (`WH`) sounds are split by a 5th
filename character into 4 target-material variants per weapon (`F`/`M`/`S`/`W`)
— e.g. a bullet hitting flesh vs. metal has a different sound. Exact letter
meanings aren't confirmed (my best guess is flesh/metal/synth-or-stone/wood,
but treat that as a guess) — all four are preserved in `f2-decoded/` as
`-matF`/`-matM`/`-matS`/`-matW` rather than picking one, so nothing's lost;
resolve the exact mapping later if per-material hit sound ever matters.

## Naming convention (confirmed via falloutmods.fandom.com, corroborated by
## two independent search results)

`W[TYPE][SYMBOL][MODE]XXX[VARIANT].wav`

- `W` — weapon-related sound (also covers melee/unarmed — not gun-exclusive)
- `TYPE`: `A`=fire/attack, `H`=hit/impact, `O`=empty/dry-fire click, `R`=reload
- `SYMBOL`: one ASCII character (`0-9`, `A-Z`, `!@#$`) identifying which
  Fallout 2 weapon *prototype* this sound set belongs to. **Not directly
  meaningful on its own** — decoded by listening, see table below.
- `MODE`: `1`=single-shot recording, `2`=burst recording (does **not**
  reliably mean "this weapon fires single/burst" — several melee weapons
  have two variants too, and two pairs turned out reversed relative to their
  label — always verify by ear, not by number)
- `XXX` — fixed placeholder, no meaning
- `VARIANT` — alternate take number, for randomized playback variety (not a
  different sound)

Four files break this pattern entirely (`WF41XXX1`, `WFN1XXX1`, `WFO1XXX1`,
`WWHNXXX2`) — decoded individually, see bottom of table.

## Decoded symbol table

Confidence: **high** = directly recognized/confirmed by ear (e.g. "FN FAL",
"100% minigun"). **medium** = consistent, plausible read, not independently
confirmed. **low** = best guess, genuinely uncertain.

### Real firearms (usable for Neuroshima calibers)

| Symbol | Identity | Confidence | Sound types available | Suggested Neuroshima use |
|---|---|---|---|---|
| `A` | Semi-auto pistol (slide-rack reload confirms semi-auto, not revolver) | High | fire(×2 takes), hit, click, reload | `9mm` / `45acp`, P mode |
| `G` | AR-platform rifle (M4/M16 — charging-handle reload is the tell) | High | fire(×2 takes), click, reload | `556`, P mode (no burst recording in library — pair with another symbol's burst for KS/DS/MS) |
| `H` | **FN FAL** (directly recognized, single + burst) | High | fire-single, fire-burst, click, reload* | `762`, P/KS/DS/MS |
| `R` | Shotgun (pump-action reload + shell insert, confirmed both ends) | High | fire-single, fire-burst(×3-shell), hit, click, reload | `12ga_s` / `12ga_b`, P mode |
| `L` | **Minigun** (100% confirmed by ear) | High | fire, hit, reload* | Minigun (special, `762`/MS-only weapon) |
| `N` | Rocket launcher / mortar-compatible ("insertion of rocket into tube, or a mortar") | High | fire-single, fire-burst, hit, reload | `60mm` (Bazooka); plausibly `120mm` (Moździerz) too |
| `D` | Rifle, "medium" caliber-weight | Medium | fire, hit, click, reload | `76239ak` (AK-pattern), P/DS |
| `E` | Rifle, high-caliber | Medium | fire only — **no hit/click/reload exists in the library for this symbol** | `762`/`3006` alternate, or `3006` specifically (bolt-action tier) |
| `B` | Heavy caliber — rifle/revolver/shotgun-ambiguous | Low | fire(×3 takes) — **no hit/click/reload exists for this symbol** | Best remaining candidate for `44mag` or `50bmg`; needs a judgment call, not more listening (nothing left to check) |
| `U` | Pistol-ish, soft/weak report ("short soft thump"; reload read as "pistol or something") | Low | fire, hit, click, reload | Best candidate for `22lr`/`38spl` (the "weak" pistol tier `A` doesn't cover) |

\* `H` and `L`'s *reload* sounds are internally mismatched (shotgun-pump-style
for `H`, "machine pistol"-mild for `L`) despite their *fire* sounds being
unambiguous FN FAL / minigun. Read this as Fallout 2 itself reusing/misassigning
reload audio, not as a signal about the weapon's true identity — trust the fire
sound, treat the reload as unusable for these two specifically (fall back to
a different symbol's reload, or a generic one, when audio is actually authored).

### Energy weapons (no corresponding Neuroshima caliber — kept for reference, not wired to anything)

| Symbol | Identity | Confidence |
|---|---|---|
| `#` | Energy weapon (reload confirms; fire sound was a red herring — sounded SMG-like) | High |
| `@` | Heavy energy weapon (reload confirms; fire sound's "wet" quality was the tell) | High |
| `C` | Laser pistol | Medium |
| `F` | Plasma weapon | Medium |
| `J` | Laser / "alien blaster" | Medium |
| `K` | Plasma pistol | Medium |
| `M` | Gatling laser | Medium |
| `S` | Laser/plasma pistol (unclear which) | Low |
| `W` | Plasma rifle | Medium |
| `X` | Pulse rifle | Medium |
| `Y` | Energy weapon (type unclear) | Low |

Neuroshima's ruleset has no energy weapons at all (per `BronPalna.md`), so
none of these have a home in `CALIBER_VFX` today. Worth keeping the raw files
in case a future campaign element wants "weird tech" flavor.

### Weapon-adjacent, non-firearm

| Symbol | Identity | Confidence | Neuroshima use |
|---|---|---|---|
| `!`, `I` | Flamethrower (`I`'s reload explicitly "definitely flamethrower") | High | Miotacz ognia |
| `Z` | Crossbow / harpoon-style ratchet-and-pulley reload | High | Miotana `belt` (crossbow bolt) — Kusza-family weapons |
| `O` | Thrown weapon ("throwing star"-ish) | Medium | Miotana thrown weapons (Nóż do rzucania) |
| `WF41XXX1` | Thrown weapon (bola/net/rope/boomerang) | Medium | Miotana — Bolas, Bumerang |
| `P` | Explosion, large (hit-only — no fire sound exists for this symbol) | Medium | Grenade/rocket impact |
| `Q` | Explosion, EMP-flavored (hit-only — no fire sound exists) | Medium | Alternate explosion variant / flashbang-adjacent |
| `WFN1XXX1` | Rocket mid-flight whoosh (no launch, no impact) | Medium | Ambient "incoming" layer, separate from `N`'s launch sound |
| `WWHN` | A real gunshot, badly mastered ("needs normalization") | Medium | Unusable as-is; revisit after audio cleanup, category still unassigned |

### Melee / unarmed (discard for firearm purposes — but see note below)

Symbols `$`, `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, and `WFO1XXX1`
are all melee/unarmed sounds (punches, kicks, swings, a grapple) — not
firearms at all, despite the shared `WA`/`WH`/`WO`/`WR` naming scheme.

**Worth noting**: `sounds.mjs` already has `WeaponSound.MELEE_HIT_BLUNT` /
`MELEE_HIT_SLASHING` / `MELEE_HIT_HEAVY` / `MELEE_HIT_MASSIVE` / `MELEE_MISS`
with placeholder `.ogg` paths — these Fallout 2 melee sounds are a plausible
real-audio source for those slots, independent of the caliber-VFX work. Not
acted on here, just flagged as a nearby opportunity.

### Non-weapon false positives (excluded)

`T` (`WATER.wav`/`WATER1.wav`) and `V` (`WAVES.wav`/`WAVES1.wav`) matched the
`WA`-prefix filter mechanically but are ambient water sounds, not weapons.

### Named (non-symbol) files

Fifteen files in `f2/` carry descriptive names instead of the
`W[TYPE][SYMBOL][MODE]XXX[VARIANT]` scheme and were never part of the symbol
sweep. Five were covered as "reference anchors" in `LISTENING_NOTES.md`; note
that the three gun-named ones are all **reloads**, not fire sounds:

| File | Identity | Disposition |
|---|---|---|
| `RIFLE.wav` | "Loading of a single round into a chambered rifle" | → bank `bolt`; fills `.30-06`'s missing reload (symbol `E` recorded fire only) |
| `PISTOL.wav` | "Click upon insertion of a pistol magazine" | → second reload take in bank `pistol` |
| `UZI.wav` | "Uzi reload" | → second reload take in bank `smg` |
| `MINIGUN.wav` | "a short click. Unsuitable even for minigun reload" | `sounds/audition/` only |
| `SHOTS.wav` / `SHOTS1.wav` | "4 distant shots. Background ambience" | `sounds/audition/` only — ambience, not weapon FX |

The remaining ten appear in **neither** listening document and are genuinely
unidentified. Their filenames suggest candidates but a filename is not a
listening confirmation — this library has already produced two symbols whose
apparent identity was wrong. All are converted to `sounds/audition/` and wired
to nothing, pending a listening pass:

`HOWITZER.wav` (120 mm moździerz?), `MAGUNNLC.wav` + `magun2ao.wav`
("machine gun"? — would be valuable for DS/MS if so), `RLAUNCH.wav`
(rocket launch?), `FLAMETHR.wav`, `SPEAR.wav`, `KNIFE.wav`, `FLARE.wav`,
`WEPNBOX.wav` (UI sound?), plus `WWHNXXX2.wav` re-exported through `loudnorm`
to test whether normalization rescues it.

## Plan of use

1. **Firearms table rows with High/Medium confidence** (`A`, `G`, `H`, `R`,
   `L`, `N`, `D`, `E`) are ready to become real `WeaponSound` entries + real
   `SOUND_PATHS` files, then get referenced from specific `CALIBER_VFX[id].sound`
   overrides per the architecture already planned (see the main plan doc) —
   e.g. `CALIBER_VFX["762"].sound = { p: WeaponSound.SHOT_FNFAL, ks: ..., ds: ... }`.
2. **`B` and `U`** need a human judgment call (44mag-vs-50bmg, 22lr-vs-38spl)
   rather than more listening — nothing left in the library to disambiguate
   them further.
3. **Energy-weapon symbols** stay unused for now — no code changes reference
   them; kept in the decoded set purely as a reference in case a future
   reserved-for-something-unusual weapon wants them.
4. **Flamethrower/crossbow/thrown/explosion symbols** map cleanly to existing
   non-caliber sound needs (`Miotacz ognia`, Miotana crossbows/thrown weapons,
   grenade impacts) — usable independent of the `CALIBER_VFX` firearm work.
5. Actual `.ogg` conversion, normalization (especially `WWHN`), and file
   placement under `sounds/firearms/` / `sounds/ranged/` / `sounds/explosives/`
   is manual audio-production work for the human — out of scope for this pass.
