# Fallout 2 weapon sound ID — batch 1 (burst-capable symbols)

Fill in the "Your notes" column for each. A couple words is plenty — e.g.
"sharp pistol crack", "heavy SMG rattle, sounds automatic", "metallic energy
zap", "big boom, shotgun-ish", "doesn't sound like a gun at all". Feel free to
compare against the reference files at the bottom instead of describing from
scratch (e.g. "like UZI but higher pitched").

Each numbered pair = one Fallout 2 weapon's sound set (a `_single` fire sound
and a `_burst` fire sound, both from the same weapon). `06` only has a burst
sound — no single-shot variant exists for that one in the library.

## Batch 1 — burst-capable weapons

| # | File | Your notes |
|---|---|---|
| 01 | `01_hash_single.wav` | | UZI burst (medium caliber)
| 01 | `01_hash_burst.wav` | | Pulse rifle shot
| 02 | `02_dollar_single.wav` | | Some sort of melee swing, sword? axe?
| 02 | `02_dollar_burst.wav` | | Swing with some sort of heavy thing?
| 03 | `03_zero_single.wav` | | Swing with something light and futuristic? Ripper swing maybe?
| 03 | `03_zero_burst.wav` | | Like the above but "critical"
| 04 | `04_two_single.wav` | | A single punch being thrown, but no impact
| 04 | `04_two_burst.wav` | | A single punch being thrown, WITH impact
| 05 | `05_three_single.wav` | | A single punch being thrown, but no impact
| 05 | `05_three_burst.wav` | | Multiple punches being thrown, no impact
| 06 | `06_four_burst_ONLY.wav` | | Strong melee action - throw? Grapple? No impact
| 07 | `07_five_single.wav` | | Like a high kick
| 07 | `07_five_burst.wav` | | Like a short high kick, no impact
| 08 | `08_six_single.wav` | | Like a short throw punch, no impact - very similar to six_burst
| 08 | `08_six_burst.wav` | | Like a short throw punch, no impact - very similar to six_single
| 09 | `09_seven_single.wav` | | Like a short throw punch, no impact - very similar to six_burst
| 09 | `09_seven_burst.wav` | | Like a short throw punch, no impact - very similar to six_single
| 10 | `10_eight_single.wav` | | A slightly heavier punch throw, no impact.
| 10 | `10_eight_burst.wav` | | A slightly heavier punch throw, no impact.
| 11 | `11_nine_single.wav` | | Barely a rustle. Some super silent melee weapon.
| 11 | `11_nine_burst.wav` | | Barely a rustle.. Some super silent melee weapon.
| 12 | `12_at_single.wav` | | A single, powerful shot from a high caliber weapon. Wet. 
| 12 | `12_at_burst.wav` | | Four low fire rate shots from a powerful high caliber weapon. Almost wet. 
| 13 | `13_H_single.wav` | | A medium SMG burst. Approx 7 shots. 
| 13 | `13_H_burst.wav` | | A medium SMG single shot
| 14 | `14_R_single.wav` | | A single shotgun shell getting fired. 
| 14 | `14_R_burst.wav` | | Burst of three shotgun shells

## Reference anchors (already known — for comparison only, no notes needed)

- `PISTOL.wav` - Click upon insertion of a pistol magazine. 
- `RIFLE.wav` - Loading of a single round into a chambered rifle 
- `UZI.wav` - Uzi reload 
- `MINIGUN.wav`- a short click. Unsuitable even for minigun reload.
- `SHOTS.wav` / `SHOTS1.wav` - 4 distant shots. Background ambience. 

## Anything else worth flagging

- Any pair that clearly *doesn't* sound like the same weapon (single vs.
  burst mismatch)?
- Any file that sounds broken, silent, or like the wrong kind of sound
  entirely (e.g. not a gunshot)?

---

## Follow-up on batch 1's promising real-gun candidates

No need to re-listen to everything — just these specific questions:

- **`01`** (single = "UZI burst, medium caliber", burst = "pulse rifle shot"):
  does the *single* one sound like a genuinely light/small-caliber SMG spray
  (snappy, high-pitched), or something heavier? And the *burst* one — does it
  sound electronic/energy (hum, crackle, laser-ish), or just a heavy
  mechanical gun? Trying to tell "energy weapon" from "big automatic gun".
- **`12`** ("high caliber, wet"): mechanical (metal action cycling, a normal
  gunshot but bassy/thumpy) or organic/energy (sizzle, hum, something that
  sounds like it's not a normal firearm at all)?
- **`13`** (the real SMG, filename-reversed): does it sound closer to a
  small/light caliber (9mm-style, snappy) or a heavier one (.45-style,
  deeper thud)?

## Batch 2 — single-only symbols (no burst variant exists for these)

Given batch 1's melee contamination, these might have better odds of being
genuine single-shot firearms (pistols, rifles, shotguns) — but same deal,
just tag what you actually hear, `gun` or `melee/unarmed` or `something else`,
plus a couple words of detail if it's a gun (caliber-feel, energy vs.
mechanical, etc). No burst counterpart exists for any of these, so it's one
file per row this time.

| # | File | Your notes |
|---|---|---|
| b2_01 | `b2_01_bang_single.wav` | | Flamethrower critical? Whooshing and scorching.
| b2_02 | `b2_02_one_single.wav` | | Swing without impact. 
| b2_03 | `b2_03_A_single.wav` | | A fairly loud pistol
| b2_04 | `b2_04_C_single.wav` | | A laser pistol?
| b2_05 | `b2_05_D_single.wav` | | A single intermediate caliber shot
| b2_06 | `b2_06_E_single.wav` | | A single high caliber shot
| b2_07 | `b2_07_F_single.wav` | | A single plasma shot?
| b2_08 | `b2_08_G_single.wav` | | A single large caliber shot. Louder than A. 
| b2_09 | `b2_09_I_single.wav` | | Flamer flaming someone?
| b2_10 | `b2_10_J_single.wav` | | A laser pistol or alien blaster?
| b2_11 | `b2_11_K_single.wav` | | Plasma pistol shot 
| b2_12 | `b2_12_O_single.wav` | | Throwing star? Thrown weapon?

## Batch 3 — remaining single-only symbols

Same as batch 2: `gun` / `melee/unarmed` / `something else`, plus caliber-feel
detail if it's a gun.

| # | File | Your notes |
|---|---|---|
| b3_01 | `b3_01_B_single.wav` | | A large caliber rifle, revolver or shotgun
| b3_02 | `b3_02_L_single.wav` | | Minigun fire
| b3_03 | `b3_03_M_single.wav` | | Gattling laser fire 
| b3_04 | `b3_04_N_single.wav` | | Rocket launcher fire
| b3_05 | `b3_05_S_single.wav` | | Some energy weapon fire - laser pistol? Plasma pistol?
| b3_06 | `b3_06_U_single.wav` | | A short, soft thump. No idea.
| b3_07 | `b3_07_W_single.wav` | | Plasma rifle fire.
| b3_08 | `b3_08_X_single.wav` | | Pulse rifle fire.
| b3_09 | `b3_09_Y_single.wav` | | Energy weapon (some sort) fire
| b3_10 | `b3_10_Z_single.wav` | | Dart gun fire? Pneumatic weapon fire? Crossbow?

## Still open from batch 1 (would help finalize the mapping — no rush, but useful)

- **`01`** (single = "UZI burst, medium caliber", burst = "pulse rifle shot"):
  is the *single* one light/small-caliber (snappy, high-pitched) or heavier?
  Is the *burst* one electronic/energy (hum, crackle) or a heavy mechanical gun?
- **`12`** ("high caliber, wet"): mechanical/normal gunshot (bassy, metal
  action) or organic/energy (sizzle, hum, not a normal firearm)?
- **`13`** (the real SMG, filename-reversed): light caliber (9mm-ish, snappy)
  or heavier (.45-ish, deeper thud)?

## Batch 4 — the last unknowns, plus reloads to split ambiguous pistol/rifle tiers

Two different kinds of files here:

**New/never-sampled** (`b4_01`–`b4_06`): `P` and `Q` only ever had a *hit*
sound, no fire sound exists for them at all — worth knowing what they are.
The four "mystery" files don't follow the normal `W[AHOR][symbol][1/2]xxxN`
pattern at all, so no prediction going in — just describe what they are
(weapon-related? UI sound? something else entirely?).

**Reload sounds** (`b4_07`–`b4_15`): for our best current gun candidates.
The *point* of these: a revolver's cylinder click/spin sounds completely
different from a semi-auto's magazine-slap-in, which could finally tell us
whether `A`/`G` split cleanly into "semi-auto pistol" vs "revolver" (matching
Neuroshima's `9mm`/`45acp` vs `38spl`/`44mag` divide), and whether `D` sounds
bolt-action (single chambered round) vs. mag-fed (matching `76239ak`'s AK vs.
a bolt rifle). Same idea for `#`/`@`/`H` (SMG/heavy-caliber candidates) and
confirming `R`/`L`/`N` (shotgun pump, minigun belt/ammo-box, launcher reload)
just to sanity-check those are what we think.

`b4_16` is `WAB1XXX3.wav` — `B`'s third recorded variant, just to check
whether it's the same weapon (alt take, like most `_2`/`_3` files) or
secretly a different sound mixed in under the same symbol (like `01` turned
out to be).

| # | File | Your notes |
|---|---|---|
| b4_01 | `b4_01_P_hit.wav` | | A large explosion, like a brick of C4 or large rocket
| b4_02 | `b4_02_Q_hit.wav` | | EMP grenade explosion or large electromagnetic explosion
| b4_03 | `b4_03_mystery_WF4.wav` | | Throwing a bola, a net, or maybe a ropem perhaps a boomerang
| b4_04 | `b4_04_mystery_WFN.wav` | | Flyby of rocket / incoming whoosh of rocket, without launch or impact
| b4_05 | `b4_05_mystery_WFO.wav` | | A thrown punch
| b4_06 | `b4_06_mystery_WWHN.wav` | | A horribly loud gunshot. Quite unpleasant, needs normalization.
| b4_07 | `b4_07_reload_A_pistol.wav` | | A pistol slide being cocked back and let go
| b4_08 | `b4_08_reload_G_magnum-candidate.wav` | | Not a magnum. Sounds like the reload of an M4 or M16, distinct charging handle chaching
| b4_09 | `b4_09_reload_hash_SMG-candidate.wav` | | Sounds like the reload of some energy weapon 
| b4_10 | `b4_10_reload_at_50cal-candidate.wav` | | Reload of a large energy weapon
| b4_11 | `b4_11_reload_D_intermediate-rifle.wav` | | Reload of a medium rifle
| b4_12 | `b4_12_reload_H_SMG-candidate.wav` | | Distinct shotgun racking. Good for Przeladowane, but only on shotguns. 
| b4_13 | `b4_13_reload_R_shotgun.wav` | | Shotgun reload. Pump action retraction followed by shell insertion.
| b4_14 | `b4_14_reload_L_minigun.wav` | | A surprisingly mild reload sound for a minigun. Some medium machinery being operated. More like a machine pistol reload.
| b4_15 | `b4_15_reload_N_rocketlauncher.wav` | | Insertion of a rocket into a tube. Or a mortat.
| b4_16 | `b4_16_B_variant3.wav` | | A loud explosion, like a loud gunshot.

## Batch 5 — resolving the H/L conflict, plus U/Z/I reloads

**`H` re-listen** (`b5_01`/`b5_02`): earlier the fire sound read as "medium
SMG, ~7 rounds" but the reload was unambiguous shotgun pump-racking. Re-listen
with that specifically in mind — could this actually be a fast semi-auto
shotgun rather than an SMG? (Real ones can cycle quickly.)

**`L` re-listen** (`b5_03`): fire sound read as "minigun" but the reload read
as "mild... more like a machine pistol." Re-listen — does the *fire* sound
itself feel like a true heavy minigun (deep, sustained, mechanical), or could
it be a lighter automatic weapon that's just got a very fast rate of fire?

**Reloads for the still-unresolved single-fire symbols**: `U` ("short soft
thump, no idea"), `Z` ("dart gun/pneumatic/crossbow?"), `I` (flamethrower
candidate, alongside `!`). A crossbow's cocking/string-draw sound or a
flamethrower's fuel-tank sound would be pretty distinctive and could settle
these.

| # | File | Your notes |
|---|---|---|
| b5_01 | `b5_01_H_single_RELISTEN.wav` | | Confirmed to be the sound of Fallout 2's FN FAL single fire.
| b5_02 | `b5_02_H_burst_RELISTEN.wav` | | Confirmed to be the sound of Fallout 2's FN FAL burst fire.
| b5_03 | `b5_03_L_fire_RELISTEN.wav` | | Minigun. Definitely. 100%. Beyond all doubt. The classic sound. It's possible Fallout 2 simply had a poorly selected minigun reload sound.
| b5_04 | `b5_04_reload_U_softthump-candidate.wav` | | Reload of a pistol or something. 
| b5_05 | `b5_05_reload_Z_dart-crossbow-candidate.wav` | | Some sort of ratcheting mechanism. Crossbow? Harpoon gun? Something with pulleys and ratchets? Dunno.
| b5_06 | `b5_06_reload_I_flamethrower-candidate.wav` | | Definitely flamethrower 
