# Neuroshima Override Plan: Sequencer Integration

> Status (updated 2026-07-29): Phases 0/1/2/3 done (all fire modes — P/KS/DS/MS/OZ — now play
> positionally from the shooter's token and resolve the sound-bank system), Phase 4 superseded
> by a custom PIXI tracer engine — see `IMPLEMENTATION.md` §1.21/§1.22 for the authoritative
> status. Checkboxes below are left as originally written (historical design record), not
> re-ticked.

## Goal

Adopt the Sequencer module as the audio/VFX engine for `neuroshima-2026-overrides`, replacing the hand-rolled socket-broadcast system and enabling positional audio, stereo panning, scrolling combat text, and eventually token-level visual effects.

---

## Dependency Model

Sequencer is a **soft / optional** dependency. The module must continue to function without it — all Sequencer calls are gated behind:

```js
function _getSequencer() {
  return game.modules.get("sequencer")?.active ? window.Sequence : null;
}
```

If `_getSequencer()` returns null, fall back to the legacy `foundry.audio.AudioHelper.play()` + socket path.

`module.json` change: add to `relationships.optional`:

```json
{
  "id": "sequencer",
  "type": "module",
  "compatibility": { "minimum": "4.0.0" }
}
```

No `relationships.requires` — Sequencer is never a hard dependency.

---

## Phase 0: Setup

**Scope**: plumbing only, no behavior change.

- [ ] Add Sequencer to `module.json` `relationships.optional`
- [ ] Create `scripts/weapons/sequencer.mjs` with `_getSequencer()` helper and a `seqSound(soundKey, opts)` wrapper
- [ ] `seqSound` falls back to existing `foundry.audio.AudioHelper.play()` when Sequencer not available
- [ ] Add `seqScrollText(text, token, opts)` wrapper (no-op without Sequencer)
- [ ] Import `sequencer.mjs` in `main.mjs` (replaces no file, just new module)

---

## Phase 1: Audio Migration (Global Sounds)

**Scope**: replace custom socket broadcast with Sequencer, keeping identical behaviour (all players on same scene hear the sound at the same volume).

### What changes

| Before | After |
|--------|-------|
| `foundry.audio.AudioHelper.play({ src, volume })` locally | `.sound().file(src).volume(vol).globalSound()` |
| `game.socket.emit(SOCKET_EVENT, { type:"weaponSound", ... })` | removed — Sequencer handles broadcast internally |
| `game.socket.on(SOCKET_EVENT, ...)` listener | removed |
| Exponential volume scaling in `_playLocal` | moved into `seqSound`, unchanged |

### API contract

```js
// sequencer.mjs
export function seqSound(soundKey, { volume, token } = {}) {
  const seq = _getSequencer();
  if (!seq) return _legacyPlay(soundKey, volume);   // legacy fallback

  const src = SOUND_PATHS[soundKey];
  if (!src) return;
  const vol = Math.pow(volume ?? getDefaultVolume(), 2);

  let s = new seq().sound().file(src).volume(vol);

  if (token) {
    // Phase 2 path — positional
    s = s.atLocation(token).radius(40).distanceEasing(true)
         .panSound().alwaysForGMs();
  } else {
    // Phase 1 path — global
    s = s.globalSound();
  }

  s.play();
}
```

### Checklist

- [ ] `seqSound(soundKey)` replaces all `playWeaponSound(soundKey)` call sites in `sounds.mjs`
- [ ] `seqSound(soundKey, { token })` signature reserved for Phase 2 (currently ignored → falls through to globalSound)
- [ ] `_legacyPlay()` extracts existing `AudioHelper.play()` + socket logic (keeps backward compat)
- [ ] Remove `game.socket.on(SOCKET_EVENT, …)` socket listener from `registerWeaponSounds()`
- [ ] Remove `game.socket.emit(…)` from `playWeaponSound()`
- [ ] Keep `SOCKET_EVENT` constant and socket listener alive while legacy fallback is in use, then delete both when Phase 1 is validated

### Validation

With Sequencer enabled: fire a weapon in a multi-player session — all connected clients hear the sound without the custom socket. With Sequencer disabled: same as before.

---

## Phase 2: Positional Audio (Spatial Sounds)

**Scope**: weapon sounds originate from the **firing token**, not the center of the world. Volume falls off with distance; walls muffle sounds; stereo panning gives directional feedback.

### Rules

- Every `playWeaponSound` call that originates from an attack or reload should pass the attacking token.
- Sounds without a clear origin token (e.g., world-level jam notification, UI sounds) stay global.
- GM always hears at full volume regardless of token position (`.alwaysForGMs()`).
- Sounds are NOT constrained by walls by default — gunfire travels through thin walls. Muffling (lowpass filter) is applied instead.

### API contract additions

```js
// sounds.mjs — pass token everywhere
playWeaponSound(WeaponSound.SHOT_FIREARM, { token: firingToken });

// sequencer.mjs — spatial path
if (token) {
  new Sequence()
    .sound()
      .file(src)
      .volume(vol)
      .atLocation(token)
      .radius(60)              // feet; tune per sound type
      .distanceEasing(true)
      .panSound()
      .constrainedByWalls(false)
      .muffledEffect({ type: "lowpass", intensity: 5 })
      .alwaysForGMs()
    .play();
}
```

### Token resolution

Callers pass a `Token` placeable or `TokenDocument`. Helper:

```js
function _resolveToken(token) {
  if (!token) return null;
  if (token instanceof TokenDocument) return token.object ?? null;
  return token;   // already a Token placeable
}
```

### Per-sound radius defaults

| Sound category | radius (feet) | Notes |
|---|---|---|
| Single shot (pistol, rifle) | 50 | Up to 60 ft audible |
| Short/long burst | 70 | Louder sustained fire |
| Crushing burst / Suppressive | 90 | Maximum — fills the room |
| Explosion (small) | 80 | Grenades etc. |
| Explosion (large) | 120 | Bazookas, C4 |
| Reload, unjam, click | 10 | Close-range utility |
| Melee sounds | 20 | Short-range |

### Checklist

- [ ] All `playWeaponSound` call sites in `fire-modes.mjs`, `magazine.mjs`, `ammo.mjs`, `jams.mjs`, `sounds.mjs` hooks — audit and pass active token
- [ ] `_resolveToken(token)` helper in `sequencer.mjs`
- [ ] `seqSound(soundKey, { volume, token })` — spatial branch active
- [ ] Per-sound-key radius table in `sequencer.mjs`
- [ ] Test: two tokens far apart on a large scene — only nearby players hear the shot at full volume
- [ ] Test: shot behind a wall — muffled lowpass audible on the other side, not blocked

---

## Phase 3: Scrolling Combat Text

**Scope**: float short status strings above tokens after meaningful combat events. Zero new asset files required — Sequencer's built-in `.scrollingText()`.

### Events and text

| Event | Text | Color | Token |
|---|---|---|---|
| Weapon jam | `ZACIĘCIE!` | `#e74c3c` (red) | Firing token |
| Empty magazine click | `PUSTE!` | `#e67e22` (orange) | Firing token |
| Reload complete | `ZAŁADOWANO` | `#f1c40f` (yellow) | Firing token |
| Stopień Zranienia applied | `ZRANIONY!` | `#c0392b` (dark red) | Target token |
| Krytyczny Stopień Zranienia | `KRYTYCZNE ZRANIENIE!` | `#8e44ad` (purple) | Target token |
| Death (PW 0, 3rd wound) | `PADŁ!` | `#7f8c8d` (grey) | Target token |
| Wyczerpanie gained | `WYCZERPANIE` | `#3498db` (blue) | Actor's token |
| Fuks used | `FUKS!` | `#2ecc71` (green) | Rolling actor's token |

### API

```js
// sequencer.mjs
export function seqScrollText(text, token, { color = "#ffffff", fontSize = 28, duration = 1500 } = {}) {
  const seq = _getSequencer();
  if (!seq) return;  // silent no-op without Sequencer
  const t = _resolveToken(token);
  if (!t) return;

  new seq()
    .scrollingText()
      .atLocation(t)
      .text(text, { fill: color, fontSize, fontFamily: "Roboto Condensed", stroke: "#000000", strokeThickness: 4 })
      .duration(duration)
      .animateEntrance(200, { ease: "easeOutCubic" })
      .animateExit(400, { ease: "easeInCubic" })
    .play();
}
```

### Integration points

- `jams.mjs` → `seqScrollText("ZACIĘCIE!", token)` after jam is confirmed
- `magazine.mjs` → `seqScrollText("PUSTE!", token)` on empty click; `seqScrollText("ZAŁADOWANO", token)` on reload complete
- `zranienie.mjs` → `seqScrollText("ZRANIONY!", targetToken)` in `applyZranienie()`
- `rerolls.mjs` → `seqScrollText("FUKS!", actorToken)` after Fuks reroll

### Checklist

- [ ] `seqScrollText()` implemented in `sequencer.mjs`
- [ ] Token resolver available at each call site (most hooks already have actor → `actor.getActiveTokens()[0]`)
- [ ] Jams scrolling text wired
- [ ] Empty/reload scrolling text wired
- [ ] Zranienie scrolling text wired
- [ ] Wyczerpanie scrolling text wired (addExhaustion path)
- [ ] Fuks scrolling text wired
- [ ] All text verified in-game: readable, not overlapping HP bars badly, duration OK

---

## Phase 4: Visual Effects (VFX)

**Scope**: token-level visual effects. Requires custom post-apo webm/spritesheet assets — this phase cannot be done without source material.

> ⚠️ Free JB2A (Animated Assets) pack is fantasy-themed and NOT usable here. Assets must be sourced or created specifically.

### Required assets (to be sourced)

| Effect | File | Notes |
|---|---|---|
| Muzzle flash (light weapons) | `vfx/muzzle_flash_light.webm` | ~100 ms, transparent bg |
| Muzzle flash (heavy weapons) | `vfx/muzzle_flash_heavy.webm` | ~150 ms |
| Bullet tracer | `vfx/bullet_tracer.webm` | stretched between two points |
| Small explosion (grenade) | `vfx/explosion_small.webm` | loops once |
| Large explosion (bazooka, C4) | `vfx/explosion_large.webm` | loops once |
| Fire / Molotov | `vfx/fire_burst.webm` | short loop |
| Flashbang | `vfx/flashbang.webm` | white flash, screen-filling |
| Hit sparks (melee/firearm) | `vfx/hit_sparks.webm` | on target token |
| Blood splatter | `vfx/blood_splatter.webm` | on target token, at hit |

### Planned sequences

**Firearm shot** (when token fires single shot):
```js
new Sequence()
  .effect()
    .file("modules/neuroshima-2026-overrides/vfx/muzzle_flash_light.webm")
    .attachTo(firingToken)
    .size(0.5)
    .duration(150)
  .effect()
    .file("modules/neuroshima-2026-overrides/vfx/bullet_tracer.webm")
    .atLocation(firingToken)
    .stretchTo(targetToken)
    .duration(80)
  .play();
```

**Grenade explosion** (at template location):
```js
new Sequence()
  .sound().file(src).volume(vol).atLocation(template).radius(80).play()
  .effect()
    .file("modules/neuroshima-2026-overrides/vfx/explosion_small.webm")
    .atLocation(template)
    .size(3)
  .play();
```

**Scrolling text + VFX on crit**:
```js
new Sequence()
  .scrollingText().atLocation(targetToken).text("TRAFIENIE KRYTYCZNE!", {...}).duration(2000)
  .effect().file("vfx/hit_sparks.webm").attachTo(targetToken).duration(600)
  .play();
```

### Checklist

- [ ] Source or commission 3 priority assets: muzzle flash (light), small explosion, hit sparks
- [ ] Implement muzzle flash on single-shot firearm attack
- [ ] Implement explosion VFX on grenade/mine detonation (grenade-inventory.mjs detonation path)
- [ ] Implement hit sparks on successful melee hit
- [ ] Bullet tracer (optional — high visual impact, needs good asset)
- [ ] Flashbang full-screen effect (optional — very cinematic)
- [ ] Blood splatter (optional — depending on campaign tone preference)

---

## Non-goals

- No ambient background sounds via Sequencer (handled by FVTT Playlist system)
- No Sequencer Database registration (not needed for module-internal sounds)
- No JB2A dependency (fantasy VFX are wrong for this setting)
- No `.persist()` sounds (ambient token sounds can be done via Token's own ambient sound property)

---

## File layout

```
scripts/weapons/
  sequencer.mjs     ← new: Sequencer wrapper (audio + scrolling text + VFX helpers)
  sounds.mjs        ← unchanged API; internal calls route through sequencer.mjs
vfx/                ← new folder (Phase 4 assets only)
  muzzle_flash_light.webm
  explosion_small.webm
  ...
```

---

## Implementation order

```
Phase 0 (setup)         ← 30 min, zero risk
Phase 1 (audio swap)    ← 1–2h, low risk, immediate benefit (cleaner code, no socket)
Phase 3 (scrolling text)← 2–3h, low risk, immediate table impact
Phase 2 (spatial audio) ← 3–4h, medium complexity, high immersion payoff
Phase 4 (VFX)           ← asset-blocked; start when first assets are ready
```
