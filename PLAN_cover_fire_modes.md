# Neuroshima Override Plan: Minimal Cover -> Fire Modes

## Goal

Implement the smallest correct cover subsystem first, then build KS, DS, MS, and OZ on top of it without rewriting the same combat plumbing twice.

## Phase 0: Minimal Cover Foundation

### Scope

- Store current cover on the token, not the actor.
- Support 4 states: none, half, three-quarters, full.
- Expose one reusable helper that later fire-mode resolvers can call.
- Add a lightweight Token HUD switch for GM use.

### Why token-level

Cover is positional and scene-specific. The same actor can be in different cover states on different scenes or tokens, so Actor flags are the wrong data boundary.

### Data contract

- `TokenDocument.flags.neuroshima-2026-overrides.cover = "none" | "half" | "threeQuarters" | "full"`

### API contract

- `getTokenCover(token)` -> normalized cover level
- `getCoverData(token)` -> `{ level, label, acBonus, dexSaveBonus, blocksTargeting }`
- `getCoverContext({ targetToken, areaFire, requireCover })` -> compact helper result for attacks, DS/MS, and OZ
- `setTokenCover(token, level)` -> persists token flag

### Behavior

- Half cover: +2 TT, +2 Dex save
- Three-quarters cover: +5 TT, +5 Dex save
- Full cover: cannot be directly targeted; area-fire resolvers may treat it as blocked
- OZ eligibility check: target/area must contain creatures in cover

### Non-goals in this phase

- No ballistic penetration yet
- No material/thickness model yet
- No automatic geometry detection from walls/terrain yet
- No scene measurement heuristics yet

## Phase 1: KS

### Activity model

- Custom activity based on `AttackActivity`
- Added/removed automatically from weapon activities based on `tryb_ks`

### Rules

- Fixed ammo cost: 3
- Once per round
- One attack roll with disadvantage
- Damage: weapon die rolled 3 times, no damage modifier
- Critical still applies

### Required plumbing

- Magazine validation
- Ammo spend helper
- Round-level usage lock
- Chat summary in Polish

## Phase 2: DS

### Activity model

- Custom activity based on `SaveActivity`
- Synced from `tryb_ds`

### Rules

- Player chooses bullet threshold: 10 / 15 / 20 / 25 / 30
- Template: line 1.5 m x 36 m
- Dex save DC = `8 + PB + DEX mod shooter`
- Damage multipliers by threshold: x2 / x3 / x4 / x5 / x6 weapon dice
- No damage modifier
- Separate d20 jam roll before the burst resolves
- One-handed DS gives advantage on save to affected creatures

### Cover usage

- Use minimal cover helper to add Dex save bonus
- Full cover blocks damage entirely in the minimal implementation

## Phase 3: MS

### Activity model

- Custom activity based on `SaveActivity`
- Synced from `tryb_ms`

### Rules

- Player chooses threshold: 50 / 100 / 150 / 200
- Template: line 3 m x 150 m
- Dex save ST 15 for half damage
- Strength save ST 15 to avoid prone
- Damage multipliers: x5 / x10 / x15 / x20 weapon damage
- Separate d20 jam roll before the burst resolves

### Cover usage

- Same helper layer as DS

## Phase 4: OZ

### Activity model

- Custom activity based on `SaveActivity`, but with custom persistent zone handling
- Synced from `tryb_oz`

### Rules

- Fixed ammo cost: 6
- Once per turn
- Choose area shape:
  - cube 3 m
  - line 6 m x 1.5 m
- Jam roll before effect
- Wisdom save DC based on ammo damage die
- On failure: no Action and no Bonus Action until start of shooter's next turn
- Creatures entering the zone before that time must also save

### Cover usage

- OZ may only be used against creatures behind cover
- Minimal helper decides cover presence and save bonus

## Cross-cutting tasks

### Activity synchronization

- Build one sync service: checkbox/property -> activities
- Only manage module-owned activities
- Add backfill migration for existing firearms in world data

### Ammo and magazine

- Reuse current magazine flag model
- Add `spendRounds(item, count)` for burst thresholds
- Do not bury ammo logic inside individual activities

### Jam handling

- Standard firearm nat 1 remains global attack-pipeline behavior
- DS / MS / OZ also perform their own pre-resolution jam roll

### Validation strategy

- First validate the minimal cover module in isolation
- Then KS end-to-end
- Then DS resolver with template placement
- Then MS
- Then OZ zone persistence

## Delivery order

1. Minimal cover foundation
2. KS vertical slice
3. Activity sync service
4. DS vertical slice
5. MS vertical slice
6. OZ vertical slice
7. Migration/backfill for existing weapons
8. Penetrating cover and richer cover UX