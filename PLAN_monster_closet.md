# Neuroshima Override Plan: Monster Closet (Token Scale Calibration Scene)

Status (2026-09-20): **implemented.** Step 1 of the §8 round-trip is live and verified;
step 2 (the GM's manual calibration pass) is the only thing outstanding.

Written after the 2026-09-20 bestiary build (51-actor `neuroshima-2026-overrides.bestiariusz`
compendium, 25 creatures with "own" purpose-made token art) surfaced that none of that art has
had per-creature scale reviewed — `prototypeToken.texture.scaleX/scaleY` is 1.0 for everything,
and the AI-generation pipeline that produced the art has no guarantee of consistent subject
framing/fill the way dnd5e's hand-drawn reference tokens do.

## 0. What shipped (2026-09-20)

| | |
|---|---|
| `scripts/dev/test-scenes.mjs` | §5's shared helper — flag/nuke/rebuild plumbing, disposable actor copies |
| `scripts/dev/monster-closet.mjs` | §6's populate function + layout; `game.neuroshima.monsterCloset.*` |
| `tokens/scale-overrides.json` | §7 option (b) — the single source of truth, all 51 seeded |
| `dev/icons/gen_scale_defaults.py` | `npm run seed:token-scales` — **§7's measurement pass, reinstated** (see below) |
| `dev/packs/build-packs.mjs` | reads the file in `buildNpc()`; reports creatures with no entry |
| `scripts/tests/skala-zetonow.test.mjs` | 12 `it` — the drift guard that makes option (b) safe |

API: `regenerate()` · `harvest()` · `suggest()` · `report()` · `remove()` · `scene()`.
Console-only, no GM button (§10 — GM and agent are the only users, and it is dev tooling,
not part of a session). Docs: `DEV_GUIDE.md` §11.7a/§11.7b, `tokens/README.md`
§"Skala żetonu".

### One plan decision reversed, with the GM's agreement

**§7's "no per-image bbox measurement pass".** The flat size-tier default assumes the art
fills its frame; measured, ours fills **64–98%**, so `scale = target fill` lands Średni/Duży
10–20% low and borrowed horse art 40% low. The effort argument §7 rested on did not hold —
the measurement is three lines of Pillow, already written. The seeder now computes
`target fill / measured fill`, so every creature **starts on its target** and the manual pass
handles only genuine art judgement. §7's intent (GM gets a sane starting point and corrects
by eye) is unchanged; only the arithmetic got better.

### Two layout calls the plan left open

- **Reference tokens are Tiles, and repeat in every row** rather than standing once at the
  top. The scene is 7500 px tall; a reference half a screen away is useless, because you
  compare by flicking your eyes, not from memory. Tiles rather than tokens because a tile
  needs no actor (six fewer junk copies per regeneration) and QuickScale only touches
  tokens — so the baseline cannot be accidentally rescaled mid-session. Renders identically:
  `TileDocument` has `texture.fit` too, and `contain` is exactly what a token does.
- **Category stays the outer axis** (bands), size the inner (rows) — the literal §6 reading.
  Size-outer would be far more compact (~3400×2500 vs 3900×7500) and put every same-size
  creature on one line, but reads less like the compendium. Confirmed with the GM.

## 1. Problem

There is no visual way to compare a creature's token art against anything else at correct
relative scale except placing it on a real scene. With 51 creatures (25 real art, 12 borrowed
dnd5e aliases, 12 generated placeholders — see the 2026-09-20 bestiary sweep for the exact
breakdown) and zero of them scale-reviewed, doing this one at a time in a real scene isn't
practical. There is also no existing "disposable calibration scene" concept anywhere in this
module to build on.

(Actual breakdown, measured during implementation: **25 own / 14 alias / 12 placeholder**.
The 12/12 split above was wrong — corrected in `tokens/README.md` and `DEV_GUIDE.md` §11.7,
which both still carried pre-2026-09-20 counts.)

## 2. Goal

A disposable, regeneratable scene ("Monster Closet") holding one token per Bestiariusz
compendium creature — all 51, including placeholder-art ones, since surfacing *which*
creatures are still on placeholder art is also useful — laid out on a grid, alongside a small
curated set of stock dnd5e reference tokens (one per size tier), so the GM can eyeball relative
scale directly and correct it with the **QuickScale** module (already installed).

## 3. Key architecture decision: live, not offline

**Must run inside a live Foundry session** (module script / macro / console API), not as an
offline `dev/` script against the world's LevelDB the way `build-packs.mjs` does for the
compendium pack.

Why: dropping a compendium actor onto a scene runs through `Actor.create({fromCompendium:
true})` and full document-schema defaulting (verified live in
`client/canvas/layers/tokens.mjs:962-996`) — machinery that only exists inside a running game.
`build-packs.mjs` only ever writes to an *isolated* compendium pack with hand-built documents;
there is no precedent anywhere in this project for hand-constructing valid Scene/Token/Actor
documents against *world* LevelDB directly, and doing so would mean re-implementing large
parts of Foundry's own document construction and validation by hand, with real risk of
corrupting live world data for no good reason — the live API already does this correctly for
free.

Consequence: expose this as `game.neuroshima.monsterCloset.*` (mirroring the existing
`game.neuroshima.maps.update(...)` pattern for the Maps pipeline), callable from the dev
console, a GM-facing macro, or an agent via `evaluate_script`.

## 4. Identifying "the closet" scene reliably

Scene names aren't unique-enforced — don't match by name. Tag the scene itself with
`flags.neuroshima-2026-overrides.testScene = "monster-closet"` at creation. The regenerator
looks for a scene carrying that flag; if found, wipes its tokens and reuses it; if not found,
creates one fresh.

**As built:** the scene's flag is the object `{ id: "monster-closet" }`, not the bare string,
so it has the same shape as the token/tile/drawing/actor flags below — one `owned()` predicate
covers every document type, and a second test scene can be filtered on `testScene.id` without
a special case for the scene itself.

Also tag every closet-placed **token** directly with
`flags.neuroshima-2026-overrides.testScene.creatureId = "<bestiary id>"` at placement time —
not backtracked through the actor afterward. This is what makes the harvest step (§8) trivial
and robust, independent of whether the disposable per-drop actor copy (§9) still carries
anything useful.

## 5. Generalizing for future test scenes (shooting range etc.)

Checked `PLAN_shooting_vfx.md` — no existing test-scene concept there; a future shooting range
would be an *independent instance of the same underlying need* (disposable, flag-tagged,
regeneratable calibration scene), not something that naturally grows out of VFX code.

Recommendation: factor the flag-tag + nuke + rebuild plumbing into one small shared helper
(e.g. `scripts/dev/test-scenes.mjs` exposing something like
`regenerateTestScene(testSceneId, populateFn)`), so "monster closet" and any future "shooting
range" are both thin populate functions on top of one mechanism instead of two copies of the
same nuke/rebuild boilerplate. Worth building this way from the start even though only one
consumer exists yet — the second consumer is explicitly anticipated, not speculative.

## 6. Populate step — what goes in the closet

- All 51 non-overlay `neuroshima-2026-overrides.bestiariusz` actors (`pack.getDocuments()`),
  including placeholder-art ones.
- A small reference row of stock dnd5e tokens, one per size tier. `tokens/README.md` already
  documents measured picks up to Medium (Goblin = Small/67% fill, Bandit = Medium/88%, Orc =
  Medium/99%); still need one each for Large/Huge/Gargantuan, not in that table yet — low-stakes
  choice, leave to whoever implements this.
- Layout: grid, grouped by the same 6 Bestiariusz categories the compendium already folders by
  (Ludzie/Maszyny/Mutanci/Potwory/Zwierzęta/Roje), reference row set apart and labeled.

## 7. Scale defaults

Confirmed with GM: auto-populate `scaleX/scaleY` from creature **size tier alone** (a flat
lookup), reusing the fill-% figures already measured and documented in `tokens/README.md`'s
size table:

| Size | Target fill |
|---|---|
| Malutki | 60% |
| Mały | 70% |
| Średni | 90% |
| Duży | 90% |
| Wielki | 92% |
| Ogromny | 92% |

No per-image bbox measurement pass — deliberately not worth the engineering effort given a
subjective manual pass is happening regardless.

**Caveat to flag, not re-litigate:** this assumes roughly consistent subject-framing across our
AI-generated art, the way dnd5e's hand-drawn 662-token reference set is consistent. Our token
pipeline is acknowledged to produce inconsistent framing per image (see the 2026-09-20 sweep's
camera-angle note) — a flat size-tier default will be a real starting guess needing real
correction, not just fine-tuning. That's an accepted tradeoff (zero-budget hobby project), not
something to solve here.

**Open implementation choice**, not mandated by this doc:
- **(a)** Size-tier lookup lives directly in `build-packs.mjs`'s `buildNpc()`, applied unless
  `tokens/scale-overrides.json` has an entry for that creature (override wins).
- **(b)** Bake the size-tier default straight into `tokens/scale-overrides.json` for all 51 in
  one initial pass, then every future edit is a plain per-creature value in one file — no
  lookup-vs-override branching to maintain.

Leaning (b): one file, one mechanism, exact match for the existing `tokens/aliases.json`
precedent. Flagged as open rather than decided for the implementing agent.

## 8. The round-trip

1. **Regenerate** (live) — nuke + repopulate the closet from the *current* compendium build,
   size-tier scale already baked in per §7.
2. **Calibrate** (manual, GM) — eyeball against the reference row, adjust with QuickScale's
   plain scale-up/down on individual tokens. **Do not use QuickScale's "save to prototype"
   keybind** — see §9, it's a dead end here.
3. **Harvest** (agent-mediated) — live-query `scene.tokens` for the closet scene, filter to
   ones carrying the `testScene.creatureId` flag, read each token's own
   `texture.scaleX/scaleY`, merge into `tokens/scale-overrides.json` (merge, not overwrite — a
   creature absent from a given harvest, e.g. a partially-populated closet, must not lose a
   previously-recorded value). This is a live query result handed to a normal filesystem
   write — no bespoke export/import tooling needs building for this step, an agent just does it.
4. **Close FVTT.**
5. `npm run build:bestiary` (extract → gen → pack; picks up `tokens/scale-overrides.json`
   inside `buildNpc()`).
6. **Launch FVTT, regenerate the closet again** — the verification pass. Confirms the
   freshly-rebuilt compendium's baked-in defaults actually look right using clean fresh drops,
   since fresh drops are the only thing real play ever uses.

## 9. Why this doesn't accidentally write back to the compendium (verified 2026-09-20)

Documented because it's exactly the trap this design avoids: dragging a compendium actor onto
*any* scene always creates a brand-new, one-off World actor copy
(`client/canvas/layers/tokens.mjs:962-996`; no dedup — drop the same creature twice, get two
independent copies). QuickScale's "save to prototype" keybind, if used, writes to that
disposable copy's `prototypeToken` — not the compendium, and not any future drop of the same
creature (which spawns yet another fresh copy starting from the compendium's current defaults
again). This is exactly why §8's harvest step reads straight off placed **tokens**, never off
actors — it sidesteps the disposable-copy problem instead of working around it.

## 10. Open items — resolved 2026-09-20

- [x] **Grid dimensions / canvas size.** Computed, not fixed: the layout packs rows and the
      scene is trimmed to the longest row that actually got built (**3900 × 7500** at 100 px/grid
      for the current 51). 2-grid gaps between 1×1 cells, because `displayName: ALWAYS` plus a
      100 px pitch runs "KONWOJENT (STRAŻNIK)" into its neighbour.
- [x] **Large/Huge/Gargantuan reference picks.** Picked from data, not judgement: everything in
      `dnd5e.monsters` with `texture.scaleX === 1` **and** a footprint matching its book size —
      Ogre (lg, 99%), Frost Giant (huge, 92%), Tarrasque (grg, 96%), plus Rat (tiny, 45%) for
      the tier the old table also lacked. Hill Giant (`scaleX 1.66`) and Ancient Red Dragon
      (`width 13`, `scaleX 3`) fail that filter — the obvious picks were the wrong ones.
      All six now in `tokens/README.md`'s size table.
- [x] **§7 (a) vs (b).** Went with **(b)**, as the plan leaned. The builder reads
      `tokens/scale-overrides.json` and nothing else — no tier lookup underneath to fall back
      on, because a default hiding behind an override is a second place to look when a token
      comes out wrong. The cost of (b) is that a new creature ships at 1.0 silently; that is
      bought off by `scripts/tests/skala-zetonow.test.mjs`, which fails when any creature has
      no entry, when the file has entries for creatures that don't exist, and when the pack
      disagrees with the file. (b) without that test would be convenient, not safe.
      **But see §0: the seeded *value* is measured, not the flat tier figure.**
- [x] **Shared helper.** Built generalized now, per §5's recommendation.
      `scripts/dev/test-scenes.mjs` owns find/create/resize, the nuke, the disposable-actor
      folder, and `regenerateTestScene(id, {name, folderName, plan})`; the closet is a `plan()`
      returning `{width, height, gridSize, backgroundColor, tiles, drawings, tokens}`.
      Notably, **the helper applies the flag itself** rather than trusting the populate
      function to — otherwise a shooting range could produce documents that the next
      regeneration silently fails to clean up.
- [x] **Console-only.** No GM button. It is dev tooling and the toolbar is session surface;
      `game.neuroshima.monsterCloset.*` is reachable from the console, a macro, or
      `evaluate_script`, which covers both expected users.

## 11. Still outstanding

- [ ] **Step 2 of the §8 round-trip: the GM's manual calibration pass.** Every value in
      `tokens/scale-overrides.json` is measured, so nothing is wildly wrong, but no creature
      has been looked at by a human yet. Run `regenerate()`, eyeball each row against its
      reference tile, adjust with QuickScale, then `harvest()`.
- [ ] Nothing measures whether a *stored* value is still measured against the art a creature
      currently has. Swapping alias art for real art leaves the old number in place;
      `npm run seed:token-scales -- --check` surfaces the gap, but nothing runs it for you.

## 12. Second consumer: the Character Closet (added 2026-09-20)

§5 predicted the shared helper's second consumer would be a shooting range. It turned
out to be a second *closet*: the same calibration problem for **world actors** — the
party, NPCs, vehicles. `scripts/dev/character-closet.mjs`, on the same
`test-scenes.mjs` plumbing, with the layout engine factored out into
`scripts/dev/closet-layout.mjs` so the two scenes are not two copies of one loop.

### 12.1 Why a second scene rather than more bands in this one

Not layout — layout is identical and now lives in one file. **Where the result lands:**

| | Bestiariusz | World actors |
|---|---|---|
| source | `bestiariusz` compendium | `game.actors` |
| commit | `tokens/scale-overrides.json` → `npm run build:bestiary` → pack | straight onto `actor.prototypeToken` |
| steps | 6, Foundry must close | 2, live |
| QuickScale "save to prototype" | **trap** (disposable copy) | correct |

A world actor *is* the source of truth about its own scale. One canvas for both
would mean two incompatible commit mechanisms side by side and one `harvest()`
whose result has to be split by row.

### 12.2 List everything, band it by quality — GM's call, and the right one

The first proposal here was a curated list of the ~10 actors with real art. The GM
pushed back: since the scene is nuke-and-rebuild, listing **all** actors is simpler
*and* more robust — nothing to maintain, nothing silently missing, and the junk
becomes visible instead of hidden. The bands then do the audit's job, ordered worst-last:

    Drużyna → BN z grafiką → Pojazdy i grupy → Kadry z Roll20 (do wymiany)
    → Bez grafiki → Duplikaty Bestiariusza → dnd5e/JB2A (do usunięcia) → Testowe

`skala-zetonow` asserts the band counts sum to the actor count — without that, the
scene stops being an audit the moment a classifier gets a case wrong.

### 12.3 What the first audit found (89 actors)

| band | n | |
|---|---|---|
| Drużyna | 14 | 6 with purpose-made 2D art, 2 on Roll20 crops, 6 with no art at all |
| BN z grafiką żetonu | 2 | the only NPCs where scale is a real judgement call |
| Pojazdy i grupy | 3 | |
| Kadry z Roll20 | 33 | **to replace, not to scale** |
| Bez grafiki | 2 | |
| Duplikaty Bestiariusza | 8 | superseded by the pack — Cyngiel, Kitchin, Spawacz… |
| dnd5e / JB2A | 13 | SRD leftovers, several at `scaleX 2` |
| Testowe i narzędziowe | 14 | |

**Only 19 are calibratable at all.** Scaling a Roll20 circular crop is wasted work: the
crop fills its square by construction, so "scale" is not a decision there — those tokens
need new art, not a number.

Two data bugs surfaced that nothing else was reporting:
`GMT400` is `size: huge` with `prototypeToken.width: 1` (should be 3), and
`Tarantula (Recovered)` is `med` with `width: 2`. Also **54 actors carry a Roll20
circular crop with `lockRotation: false`** — they render upside down whenever a token
moves, which is exactly the failure `tokens/README.md` says the top-down rewrite exists
to prevent.

### 12.4 One hardening this forced

`clearTestScene()` used to delete **any** actor carrying `testScene.id`. That was safe
while only disposable copies were flagged, but this closet puts real campaign PCs on a
flag-nuked scene: one stray `createActors()` would have deleted Alan and Lorentz with no
prompt and no undo. Deletion is now gated on an explicit `disposable: true` that only
`createDisposableActors()` sets, and `clearTestScene()` reports a `spared` count.
Proven with a decoy actor rather than assumed.

### 12.5 Party reference band in the Monster Closet

The dnd5e stock tiles say what a correctly framed token looks like in general; the
question actually asked at the table is "is this Megator right **next to Alan**".
The Monster Closet now opens with a Drużyna band — the 6 PCs with real art, as locked
tiles at their current scale, so it shows the token that really goes on the map.
Tiles, so there is no second place to calibrate them and no junk actors.

It immediately showed something: every PC except Piekarz reads noticeably smaller than
the Bandit reference.
