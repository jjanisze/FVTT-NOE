# Neuroshima Override Plan: Shooting VFX

Visual fidelity for firearms. Fleshes out **Phase 4** of [PLAN_sequencer.md](./PLAN_sequencer.md)
into a concrete, per-fire-mode design. Sequencer is the engine (already a soft/optional
dependency via `scripts/weapons/sequencer.mjs`).

> Status (updated 2026-07-29): **superseded by a custom PIXI tracer/muzzle-flash engine**
> (`scripts/weapons/tracer-vfx.mjs`) — the Sequencer `.effect()` + webm/JB2A approach below
> (§5/§6) was abandoned because it doesn't scale to a Minigun Miażdżąca seria. Baked textures
> replace `TEMP_*` assets; `CALIBER_VFX`/`WEAPON_VFX` replace `VFX_ASSETS`/`FIRE_VFX`. Single
> shot, KS, DS and MS (§8 Slices 0-3, part of 4) are **live in production** — DS/MS spray VFX
> now fire via `tracerFireArea()` (`_playAreaBurstVfx()` in `fire-modes.mjs`), always as
> terminal impacts across the sampled template (no per-token hit/miss visual — RAW-consistent,
> every round in the burst lands somewhere). OZ intentionally has no tracer VFX (out of scope,
> §2). Screen-shake (part of Slice 3/4) is still **not implemented**. Impact spark/blood +
> token-flash (§3) were dropped, not deferred. See `IMPLEMENTATION.md` §1.21 for the current,
> authoritative status; treat the rest of this file as historical design rationale, not a live
> checklist.

---

## 1. Design principles (locked)

1. **Ground-truth kinetic realism, not Hollywood.** Effects are short and dissipate
   immediately. No lingering fireballs, no smoke clouds hanging in the air. High-velocity,
   snappy, physically plausible. *This governs the transient per-shot choreography only —
   it is a feedback-speed rule, not a no-marks-left-behind rule. Persistent battlefield
   residue (blood, and later oil/rubble/scorch) is a deliberate, separate layer; see §10.*
2. **Kinetic impact juicing.** Prioritize *instant, weighty feedback* over smooth
   interpolation. A hit should feel like a hit within a few frames. Total budget per shot
   is measured in **hundreds of milliseconds**, not seconds.
3. **A miss puts NOTHING on the target.** No blood, no impact, no token flash, no damage
   (damage is already handled by mechanics). A miss is a muzzle flash + a tracer that veers
   off and fades. Misses are intentionally unsatisfying.
4. **VFX is a reward for correct play.** The *hidden purpose* of this system is to train
   players to use Foundry's targeting. The full downrange payoff (tracer + impact) only
   fires when a target exists. Fire without a target ⇒ muzzle flash only. This is positive
   reinforcement, not a punishment.
5. **Soft dependency, always.** Every effect is gated behind the existing `_getSequencer()`
   guard. No Sequencer ⇒ silent no-op, mechanics unaffected.
6. **v1 is one generic firearm look.** Pistol/rifle/shotgun/SMG differentiation is a later
   phase (a second data axis, see §7).

---

## 2. Mode taxonomy → two targeting families

The four in-scope modes split by *how* they target, which drives the visual structure.

| Mode | PL name | Mechanic | Targeting | "Hit/miss" | Trigger site |
|------|---------|----------|-----------|------------|--------------|
| Single | Strzał | attack roll vs AC | 1 token | roll ≥ AC | `magazine.mjs` `neuroRollAttack` |
| KS | Krótka seria | 1 attack roll vs AC | 1 token | roll ≥ AC | `fire-modes.mjs` KS `rollAttack` (~L150) |
| DS | Długa seria | Dex save, line 1.5×36 m | N tokens in line | per-target save | `fire-modes.mjs` DS resolver (~L333) |
| MS | Miażdżąca | Dex save, line 3×150 m | N tokens in line | per-target save | `fire-modes.mjs` MS resolver |

- **Beam family (Single, KS):** shooter → single target. One tracer, one impact.
  Uses `targets[0]` when several are selected.
- **Spray family (DS, MS):** shooter → line template. Fanned tracer stream across the
  template; per-token impact only on tokens that **failed** their save. Tokens that saved
  get nothing on them (the stream passes by). Escalating screen shake.

OZ (Ogień zaporowy / suppressive) is **out of scope** for this iteration.

---

## 3. Effect layers (the vocabulary)

Every shot is composed from a small set of reusable layers:

| Layer | Where | Orientation | Notes |
|-------|-------|-------------|-------|
| **Muzzle flash** | at shooter's barrel | `rotateTowards(target/template)` | Always plays (needs no target). Attached to shooter token. |
| **Tracer** | shooter → target | `stretchTo(target)` (`.missed()` on miss) | Thin, fast, tileable streak. |
| **Impact** | on target | `atLocation(target)` | HIT ONLY. Blood on creature, spark on object. |
| **Token flash** | on target | tint pulse (no asset) | HIT ONLY. Quick white pulse via filter/tint. |
| **Screen shake** | camera | local canvas jitter | DS/MS only, short. |

Miss = **muzzle flash + tracer only**. Hit = **all five layers**.

> The `impactBlood` webm above is the *transient* flash cue only (reads "it landed"). The
> *persistent* stain — the one that's still there next round, next scene, next session — is
> a separate layer handled entirely by the Splatter module, not by this pipeline. See §10.

---

## 4. Per-mode choreography

Timings are targets, tuned in-game. All durations favor *snappy*. Grid assumption: use
`gridUnits` where possible so it is scene-agnostic (Neuroshima grid ≈ 1.5 m).

### 4.1 Single shot — HIT (~250 ms total)
```
t+0    muzzle_flash  @shooter, rotateTowards(target), ~100ms, scale ~0.4 grid
t+20   tracer        @shooter, stretchTo(target), ~60ms
t+80   impact        @target (blood|spark), ~150ms
t+80   token flash   @target, ~120ms white pulse
```

### 4.2 Single shot — MISS (~180 ms total)
```
t+0    muzzle_flash  @shooter, rotateTowards(target), ~100ms
t+20   tracer        @shooter, stretchTo(target).missed(), ~60ms  ← veers off, just fades
       (no impact, no token flash)
```

### 4.3 KS 3-round burst — HIT (~400 ms)
```
muzzle_flash  .repeats(3, 40, 70)  @shooter, rotateTowards(target)
tracer        .repeats(3)          stretchTo(target) + small randomOffset each
impact        @target (single, slightly larger) + token flash
```

### 4.4 KS 3-round burst — MISS (~350 ms)
```
muzzle_flash  .repeats(3, 40, 70)
tracer        .repeats(3)  stretchTo(target).missed()
       (no impact)
```

### 4.5 DS automatic — line template (~600 ms + 0.4 s shake)
```
muzzle_flash  .repeats(~8-12 over ~600ms)  @shooter, rotateTowards(templateDirection)
tracer stream fanned across the template line (stretchTo points along line, randomOffset)
for each token in template:
    failed save (HIT) → impact + blood + token flash
    saved (MISS)      → nothing on that token
screen shake: light, 0.4 s
```

### 4.6 MS magdump — long line (~1.2 s + 1.5 s shake)
```
muzzle_flash  .repeats(~20 over ~1.2s)  @shooter, larger scale
dense tracer stream across the long line
for each token in template:
    failed save (HIT) → heavier impact (spark+blood, bigger) + token flash
    saved (MISS)      → nothing
screen shake: heavy, 1.5 s
```

---

## 5. Asset spec (TEMP placeholders → replace later)

All assets: **WebM with straight alpha** (VP9/VP8), transparent background, sRGB.
Live in `modules/neuroshima-2026-overrides/vfx/`. Placeholder names are **prefixed
`TEMP_`** and MUST be swapped before release.

| Key | File (TEMP) | Size (px) | Duration | Anchor | Notes |
|-----|-------------|-----------|----------|--------|-------|
| `muzzleFlash` | `TEMP_muzzle_flash.webm` | 256×256 | ~100 ms | barrel/center | yellow-white star burst, 3–4 "frames" of read |
| `tracer` | `TEMP_tracer.webm` | 256×32 | ~60–80 ms | left-center | tileable horizontal streak; stretched via `stretchTo` |
| `impactSpark` | `TEMP_impact_spark.webm` | 128×128 | ~120 ms | center | hard-surface / object hit |
| `impactBlood` | `TEMP_impact_blood.webm` | 192×192 | ~200 ms | center | creature hit, fast dissipation |

Token flash = **no asset** (tint/glow filter pulse). Screen shake = **no asset** (canvas
jitter). Total TEMP asset count for v1: **4 webm files**.

**Placeholder sourcing (current):** the free **JB2A_DnD5e** pack is already installed and
provides real transparent-alpha webms, now referenced directly by `VFX_ASSETS` in
`sequencer.mjs` (flagged `⚠ TEMPORARY`). No download needed. Current mapping:

| Slot | JB2A file (TEMP) |
|------|------------------|
| `muzzleFlash` | `Generic/Muzzle_Flash/MuzzleFlashSingle01_01_Regular_Yellow_600x300.webm` |
| `tracer` | `Generic/Weapon_Attacks/Ranged/Bullet_01_Regular_Orange_30ft_1600x400.webm` |
| `impactHit` | `Generic/Impact/Impact_08_Regular_Orange_400x400.webm` (tinted `#8a0303`) |

JB2A is fantasy-toned and only stands in until bespoke post-apo assets are made and dropped
into `vfx/`. Final assets must match the ground-truth tone (§1), specced separately once the
pipeline is proven.

---

## 6. Code architecture

Extend the existing `scripts/weapons/sequencer.mjs` (mirrors `seqPlayAudio` / `seqScrollText`).
Combine a **thin API layer (A)** with a **data-driven registry (B)**.

### 6.1 Public API
```js
// sequencer.mjs
export function seqFireEffect({ mode, shooter, target, targets, hit, template } = {}) {
  const Seq = _getSequencer();
  if (!Seq) return;                       // soft-dependency no-op
  const shooterTok = _resolveToken(shooter);
  if (!shooterTok) return;                // need at least the origin
  const profile = FIRE_VFX[mode];
  if (!profile) return;
  // build sequence from profile: muzzle (always) → tracer (if target) → impact (if hit)
  // spray modes iterate `targets` and use per-token `hit` flags
  // ...
}
```

### 6.2 Data-driven registry (tuning = config, not code)
```js
const VFX_ASSETS = {
  muzzleFlash: `modules/${MODULE_ID}/vfx/TEMP_muzzle_flash.webm`,
  tracer:      `modules/${MODULE_ID}/vfx/TEMP_tracer.webm`,
  impactSpark: `modules/${MODULE_ID}/vfx/TEMP_impact_spark.webm`,
  impactBlood: `modules/${MODULE_ID}/vfx/TEMP_impact_blood.webm`,
};

const FIRE_VFX = {
  single: { family: "beam",  muzzleRepeats: 1,  shake: null,              muzzleScale: 0.4 },
  ks:     { family: "beam",  muzzleRepeats: 3,  shake: null,              muzzleScale: 0.4 },
  ds:     { family: "spray", muzzleRepeats: 10, shake: { ms: 400,  amp: 4 }, muzzleScale: 0.4 },
  ms:     { family: "spray", muzzleRepeats: 20, shake: { ms: 1500, amp: 8 }, muzzleScale: 0.6 },
};
```

### 6.3 Screen shake helper
Sequencer's `canvasPan` is for smooth pans, not shake. Add a small local jitter:
```js
function _screenShake({ ms = 400, amp = 4 } = {}) {
  // jitter canvas.stage.pivot / position over `ms`, decaying to zero, then restore
}
```
v1: local to the acting client (+ GM). Broadcasting to all clients (via a Sequencer
`.macro()` section or socket) is a later nicety.

### 6.4 Hit/miss resolution helper
Beam modes reuse the AC-comparison pattern already used for melee-miss in `sounds.mjs`:
```js
function _isHit(roll, target) {
  const ac = target?.actor?.system?.attributes?.ac?.value;
  return ac != null && (roll?.total ?? 0) >= ac;   // crit/fumble handled by caller
}
```
Spray modes read the per-target save outcome from the DS/MS resolvers (failed save = hit).

### 6.5 Trigger wiring (VFX shares the sound trigger points)
| Mode | File | Call site |
|------|------|-----------|
| single | `magazine.mjs` | after `originalRollAttack` in `neuroRollAttack`, beside `playWeaponSound(getShotSoundKey(...))` |
| KS | `fire-modes.mjs` | beside `playWeaponSound(WeaponSound.BURST_SHORT)` (~L150) |
| DS | `fire-modes.mjs` | beside `playWeaponSound(WeaponSound.BURST_LONG)` (~L333), after saves resolve |
| MS | `fire-modes.mjs` | beside `playWeaponSound(WeaponSound.BURST_CRUSHING)`, after saves resolve |

---

## 7. Deferred (not in v1)

- **Per-weapon-type variants** (pistol/rifle/shotgun/SMG muzzle size, tracer count): a second
  registry axis `WEAPON_VFX[type]` layered onto `FIRE_VFX[mode]`.
- **Shell-casing ejection, barrel smoke, persistent effects** — gold-plating, violates §1
  (immediate dissipation) unless very short.
- **Silenced weapons** — smaller/dimmer muzzle flash (already have `SHOT_SILENCED` audio).
- **OZ / suppressive zone** visuals.
- **Broadcast screen shake** to all clients.
- **Ricochet / environment impacts** on misses (currently: miss = nothing downrange).
- **Residue beyond blood** — oil/hydraulic-fluid stains for robots and constructs, rubble.
  Scorch/burn marks from **explosives** specifically are done (2026-09-06,
  `grenade-inventory.mjs`'s `_spawnScorchMark`) — a long-lived (~1 year of game time)
  Sequencer effect under the ring/fire sprite, not a Tile (TileDocument has no blend-mode
  field to darken an opaque-background decal with — checked directly). Heavy-weapon scorch
  and the other residue types (oil, rubble) remain unstarted.

---

## 8. Implementation order (vertical slices)

```
Slice 0  vfx/ folder + 4 TEMP assets + VFX_ASSETS/FIRE_VFX skeleton + seqFireEffect stub
Slice 1  Single shot HIT + MISS end-to-end  ← proves muzzle+tracer+impact+flash pipeline
Slice 2  KS 3-round (repeats choreography, reuses beam family)
Slice 3  Screen-shake helper + DS spray family (per-token impacts on failed saves, 0.4s shake)
Slice 4  MS magdump (dense spray, 1.5s shake)
Slice 5  Tuning pass in-game; lock timings; write real asset spec to replace TEMP_*
```

Each slice is independently testable and leaves mechanics untouched when Sequencer is absent.

---

## 9. Open tunables (decide during Slice 1 / in-game)

- Exact muzzle scale relative to token/barrel; whether to offset to the barrel tip vs token center.
- Tracer thickness & speed (readability vs realism).
- Whether "no target" on single/KS shows muzzle flash **only** (chosen) or also a short
  forward tracer into empty space.
- Impact scale on KS (one bigger impact vs three small).
- Screen-shake amplitude that reads as weighty without being nauseating.

---

## 10. Persistent Battlefield Residue (Splatter)

> Status: **live, zero custom code required.** Ambient — not part of `seqFireEffect`, a
> separate module reacting to HP loss on `updateActor`, independent of this pipeline's
> per-shot choreography.

This is a deliberate exception to §1's "no lingering effects," not a contradiction of it: §1
is about *feedback speed* for the transient shot layers (muzzle flash, tracer, impact flash),
not about whether damage leaves a permanent mark. Turning tactical maps into an accumulating
visual record of the fight — bodies bled out here, this room got hosed down, that corridor is
still caked in gore from three sessions ago — is the intended aesthetic. Cinematic, not
gratuitous: it's ground-truth realism applied to the *map*, the same instinct §1 applies to
the *shot*.

### 10.1 What's already working

- **Splatter** module (installed, v6.0.1) hooks `updateActor`, diffs HP, and paints a
  persistent tinted decal under a token once it crosses `bloodsplatterThreshold`% HP, scaled
  to the hit's severity. dnd5e's `attributes.hp.value/.max` are already the correct default
  data path for this system — **no integration code needed**, only settings tuning.
- Full settings/API/quirks reference: the `splatter` skill
  (`Neuro 5e/.github/skills/splatter.md`), not duplicated here.
- Recommended settings for this campaign's tone:
  - `wallsBlockBlood: true` — blood doesn't bleed through walls into the next room.
  - `bloodsplatterDelay` ≈ the total per-shot VFX duration (~150-300ms per §4) so the
    persistent stain lands right as the transient `impactBlood` flash (§3) fades — a clean
    handoff from "instant feedback" to "permanent record."
  - `useBloodsheet: true` — free color variance by creature type at zero cost: grey/oily
    `construct`/`elemental` already read as robot/cyborg fluid, green `plant` reads as
    mutant/vegetal. Named NPCs needing a specific look get a per-token `bloodColor`
    override instead of fighting the creature-type table.
- `CONFIG.Splatter.saveBloodToTile()` bakes current decals into permanent Scene Tiles — run
  at the end of a bloody scene/session so the record survives scene reloads and isn't
  silently thinned by `cleanup`.

### 10.2 Deferred: residue beyond blood

Splatter only ever produces blood decals. See §7 — extending "battlefield as record" to
oil/rubble/scorch marks is future scope, not started, not blocked on anything here.
