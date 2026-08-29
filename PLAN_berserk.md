# PLAN — Berserk vs. stock Rage (2026-08-28, updated same day after live verification)

Comparison of the D&D 5e (2024) Barbarian's **Rage** against the Brutal's
**Berserk**, what got fixed to close the automation gap, and a catalogue of
every feature that reads, grants, or otherwise depends on Berserk state.

**Update, same day:** §1 and §2 below were originally written from reading
`rage.yml` alone — accurate on the mechanics (the AE `changes`), but nothing
in it had been checked against what Rage's chat card *actually renders*, or
against Berserk's own card actually firing in a live world. Both have since
been verified directly in a running Foundry session (`chrome-devtools` MCP,
throwaway/reverted test data only) — see §2 for what that changed. Two
concrete things were wrong before verification: (1) my first live run of
Berserk's own toggle produced **zero** chat message, because the running
client was still executing pre-edit code — Foundry doesn't hot-reload ES
modules, a page reload was required before "I edited the file" and "this
works" could both be true; (2) stock Rage does not auto-apply its own
ActiveEffect on use — see §2 for what it actually does.

Source for stock Rage: `classes24/barbarian/class-features/rage.yml`
(`C:\Git\fvtt-dnd5e`). Source for Berserk: `berserk` in
`scripts/config/class-features-data.mjs` (id `berserk`, owner `brutal`,
level 1) — **generated, do not hand-edit**; its automation lives separately
in `scripts/actors/class-state.mjs`.

## 1. Mechanical comparison

| Rage (2024, automated via 1 AE)                          | Berserk (RAW text)                                                    | Status before this pass | Status now |
|---|---|---|---|
| Bonus Action to enter, not while in Heavy armor           | Bonus Action to enter, no armor restriction on *entering*             | ✅ (Bonus Action toggle) | unchanged |
| Resistance to bludgeoning/piercing/slashing                | **Not granted** — no such clause in Berserk's text                    | — | **intentionally not added** (see §3) |
| Rage Damage: bonus die on Strength attacks (weapon/unarmed), scales by level | Obrażenia Berserkera: same, scales by Brutal level (`scale.brutal.obrazeniaBerserkera`, 1d6→1d12) | ❌ not automated | ✅ AE `system.bonuses.mwak.damage += @scale.brutal.obrazeniaBerserkera` |
| Strength Advantage: checks + saves                        | Siła Berserkera: "Ułatwienie w testach Siły i RO na Siłę"              | ❌ not automated | ✅ AE `abilities.str.check/save.roll.mode` |
| No Concentration/spells                                    | n/a — spellcasting removed campaign-wide                              | n/a | n/a |
| Duration: until end of next turn, **extends** on attack/forced-save/bonus action, cap 10 min | Fixed 10 rounds, no extension mechanic                        | ✅ (fixed duration) | unchanged (RAW has no extension clause) |
| Ends early: dons Heavy armor, or Incapacitated              | Ends early on Nieprzytomność / Obezwładnienie / Zauroczenie (RAW explicitly adds Zauroczenie, not in stock Rage) | ✅ `breaksOn` | unchanged |
| Extra class ability tied to Rage: Reckless Attack, etc. (separate features) | Szarża Berserkera [B] (Dash at a seen/heard foe), Obłęd Berserkera (+STR mod TT unarmored) | Szarża: n/a (no automation needed, it's just Dash). Obłęd: ✅ AC bonus AE | unchanged |
| Chat card on activation (native item-use card)              | Toggle on/off had scrollText only; off had **no** card and no announcement at all on manual/interrupted end | ❌ inconsistent | ✅ styled card on **every** transition (see §2) |

## 2. Chat bubble formatting — compared and aligned against the real Rage card

The first pass of this (below, "done") was designed by pattern-matching this
module's own Forsowanie/Fuks cards, without ever rendering stock Rage's
actual chat card to compare against — a real gap, called out directly by the
user and closed by triggering both live in a running Foundry session
(`chrome-devtools` MCP, on a throwaway actor for Rage and on a real Brutal
PC — Dante, `spendUse:false`, fully reverted after — for Berserk).

**What Rage's card actually contains**, confirmed by inspecting the live DOM
(not just the stored message, which is missing the client-injected part):
- A collapsible header (icon + name).
- The item description verbatim — mostly `<p>` paragraphs, with one `<ul><li>`
  list (only for the "3 ways to extend Rage" clause, not for the granted
  benefits themselves).
- A footer row of short `pills`, one of which **is** the duration
  ("10 minutes" for the 2024 item; the older 2014-rules `classfeatures.Rage`
  item, single disabled effect shown under the item sheet's Inactive Effects
  heading, is a "1 min" duration — this is where the "Rage Inactive, 1 minute"
  detail in the original question came from, on the older compendium item).
- An **"Efekty" (Effects) tray**, a `<effect-application>` custom element
  injected client-side (absent from the raw stored `content`, which is why it
  didn't show up when the previous pass only read the compendium source) —
  lists each granted effect with a name/duration and an "Apply to
  targeted/selected tokens" button.
- **Using the item does not itself flip the mechanical effect on.** Verified
  directly: triggering the activity consumed a use and posted the card, but
  the item's own `Rage` effect stayed `disabled: true` and the actor gained
  nothing until "Apply to targeted/selected tokens" is clicked — which
  defaults to whatever is currently targeted or selected, not necessarily the
  caster. Berserk's toggle is actually **more automated** than this: it
  applies immediately and unconditionally to the caster, no separate click,
  no targeting ambiguity.

**Berserk's card, aligned (not copied 1:1 — user's explicit choice: "content-matched,
module style" over reusing dnd5e's native card chrome):** kept this module's
existing red-bordered-div language (same family as Forsowanie/Fuks), but
restructured the "on" card's content to mirror what Rage's actually
communicates:
- A lead line ("Dante wpada w szał.").
- A bulleted breakdown of the four granted benefits (Siła Berserkera,
  Obrażenia Berserkera — with the actor's live damage die substituted in,
  Obłęd Berserkera — with the actor's live computed AC bonus (or an explicit
  "armored, inactive" note), Szarża Berserkera), rather than one run-on
  summary line.
- A pill-style footer row: `Akcja Bonusowa · 10 rund · Cel: Ty`.

No Effects-tray/apply-button equivalent was built — Berserk's effect is
self-only by construction (no target picker needed) and already applies
without a manual step, so that particular piece of Rage's UI would be solving
a problem Berserk doesn't have.

- **Off** (`chatOff`): gray (`#7f8c8d`), "Koniec Berserku" — fires from
  **all three** end paths (manual toggle-off, interrupted by a breaking
  condition, natural 10-round expiry), not just expiry as before this work.
- The existing "wychodzisz z Berserku, tracisz akcję" exhaustion notice
  (natural-expiry only, per `afterEnd: "noActionNextTurn"`) is now the same
  card style (red `#e74c3c`, "⚠ Zmęczenie po Berserku") instead of a bare
  `<p>` tag.

Kondycha (the other stateful ability) is untouched — it never declared
`chatOn`/`chatOff`, so it keeps its current scrollText-only behavior.

### 2a. Contrast bug found and fixed the same day

User report, from actually looking at the live card: "extremely low contrast
... low contrast on entire window." Root cause, confirmed by reading computed
styles in the live DOM: **this world's chat log carries its own
`theme-light` class independent of the rest of the (dark-themed) UI** — the
message background resolves to near-white (`rgb(241, 235, 232)`). Every text
colour in the card (and in Forsowanie/Fuks's cards, and likely several other
chat-facing strings in this codebase — see the `grep` list below) was a fixed
light gray (`#aaa`/`#ccc`/`#888`), chosen assuming a dark background — nearly
invisible on this light one (measured before the fix: `#ccc` list text on a
~`#f1ebe8` card background).

**Fix:** swapped the fixed hex values in `class-state.mjs`'s `CARD_STYLE` and
in `rerolls.mjs`'s two chat-card flavor strings for Foundry/dnd5e's own theme
tokens — `var(--color-text-primary, <original-hex>)` for the bullet list,
`var(--color-text-secondary, <original-hex>)` for lead/pill text — which flip
correctly with whichever theme a given chat log actually has (confirmed:
`--color-text-primary` is `#191813` under `theme-light`, `#efe6d8` under
`theme-dark`). Re-verified live after the fix: list-item colour is
`rgb(25, 24, 19)` (near-black, correct for this light log) against the same
near-white card background — legible. Pill chip background was also changed
from a white-tinted overlay (invisible on a light card) to a neutral
mid-gray-tinted one that shows up on either theme.

## 2b. Effects-tab discoverability, and canvas VFX/SFX (2026-08-28, follow-up)

**Why Rage shows under "Inactive Effects" and Berserk doesn't**, asked directly
and confirmed live on Piekarz (who had both items — the user's own comparison
setup): Rage's item ships a permanent, `disabled:true`, `transfer:true`
ActiveEffect baked into its data — owning the item is enough to have it listed,
always, whether or not it's ever been used. Berserk's item carries **zero**
embedded effects (`item.effects.size === 0`, checked on both Dante and
Piekarz); `class-state.mjs` creates a real ActiveEffect document straight on
the actor only at toggle-on, and deletes that document at toggle-off — nothing
exists to list while it's off. Confirmed both halves live: toggled Berserk on
Piekarz and watched it appear correctly under Temporary Effects, matching
Rage's own behaviour once active. **Decision: leave as-is** — a permanent
disabled placeholder purely for Effects-tab parity was considered and declined
(more moving parts, no functional gain; the ability is already visible via its
own item description, the hotbar macro, and the chat card).

**Canvas VFX**, requested directly ("text over the token... or vfx/sfx"). The
scrollText (`"BERSERK!"`/`"Koniec Berserku"`) already existed and was already
firing correctly — verified by direct testing, not assumption: called it with
an extended 6s duration and caught it on screen. It looked "missing" in
earlier testing for an identifiable reason: `seqScrollText` (and every other
Sequencer call) silently no-ops when the actor has no token on the currently
viewed scene, and **Dante has zero placed tokens on any real scene** (only a
leftover token in the `!!SZABLONY` templates scene) — every test run against
him necessarily produced nothing to see, correctly, not from a bug.

Tried and reverted, same session: a persistent, token-attached JB2A aura
(`jb2a.on_token_buff.001.001.purplered` — confirmed installed via
`Sequencer.Database.searchFor`, the free `JB2A_DnD5e` module's stock "ongoing
buff" effect, not Patreon-only) for the full duration of Berserk, via the
existing `seqEffect`/`seqEndEffect` helpers in `weapons/sequencer.mjs`. Wired
into the same two chokepoints as everything else — created alongside the
ActiveEffect in `toggleClassState`'s "on" branch, ended inside the shared
`_announceEnd()`, so cleanup was free across all three end paths — and
verified live on Piekarz via `Sequencer.EffectManager.getEffects({name})`
(exactly 1 running effect while active, 0 after toggling off). Built with
sign-off ("persistent aura for the duration" was the explicitly chosen
option), but rejected on sight once actually visible in play — the purple
stars/pulses read as too much. Removed cleanly (`vfx` config block, both call
sites, the now-unused `seqEffect`/`seqEndEffect` import) rather than left
disabled. **Current state: scrollText only, no persistent or one-shot canvas
VFX.** Worth remembering if VFX comes up again: the plumbing question (which
JB2A asset, wired through which two chokepoints) is already answered here —
what didn't work was this specific effect's look, not the mechanism.

**SFX: not added.** No roar/grunt/shout-type audio asset exists anywhere in
this module — everything under `sounds/` is weapon fire, reloads, and
explosions. Rather than reach for something off-theme, this was explicitly
deferred pending an actual sourced asset.

**Not fixed, flagged only:** the identical `#aaa`/`#ccc`/`#888` pattern also
appears in `knockout.mjs`, `exhaustion.mjs` (pip tooltip source-date text),
and `magazine.mjs` (a couple of chat-flavor spans) — same root cause, same
fix, not yet applied there. Out of scope for this pass; worth a small
dedicated sweep if it's actually visible in play, called out here rather than
silently left. (`ammo-inventory.mjs`/`grenade-inventory.mjs`/
`surowce-inventory.mjs`/`magazine-inventory.mjs`'s `#ccc` icon-button colours
are on the actor **sheet**, not chat — a different CSS context styled by this
module's own `neuroshima.css`, not confirmed to have the same bug, left
alone.)

## 3. Deliberately NOT changed

- **No damage resistance added.** Rage's biggest single benefit
  (bludgeoning/piercing/slashing resistance) has no counterpart anywhere in
  Berserk's RAW text. Adding it would be homebrew, not a parity fix — the
  rulebook clearly chose not to give Neuroshima's berserkers this. Left out.
- **No "ends on Heavy armor" rule added.** Not in Berserk's text either —
  Obłęd Berserkera's armor check only gates its own +STR AC bonus, not the
  whole state. Matches RAW as written.
- **No extension-by-attacking mechanic.** Berserk is a flat 10 rounds by
  RAW; Rage's "extend by attacking" clause has no Neuroshima equivalent.

## 4. Open question — resolved

Whether the exhaustion/no-action penalty ("Kiedy Berserk się zakończy...")
should fire on **every** end path (RAW reads that way — "when Berserk ends",
unqualified) instead of only on natural 10-round expiry. **Decision: leave
expiry-only.** Manual toggle-off and interruption-by-condition stay
penalty-free — a deliberate QoL exception to the literal RAW wording, not a
bug.

## 5. Every feature that reads/requires Berserk state

`requiresState: "neuro-berserk"` is declared on four items in
`class-features-data.mjs`, but **the flag is not read anywhere in code** —
no gating, no greying, no hotbar disable. All four remain fully manual
(GM/player-adjudicated), consistent with this codebase's existing pattern
for narrative profession abilities (see IMPLEMENTATION.md's `[—]` markers
for "poza automatyką" features):

| id | owner | action | Effect while Berserk is up | Automation status |
|---|---|---|---|---|
| `z-bara` | brutal (core, lvl 2) | Bonus Action | Forced Push/Prone on a same-or-smaller creature, STR/DEX save DC 8+STR+prof | Manual — hotbar-eligible but not gated; usable even when not berserking |
| `ja-i-moj-gang` | ganger profession | passive | Allies within 3m get Advantage vs. enemies you can see | Manual — no aura AE |
| `zew-areny` | gladiator profession | passive | Fear immunity, disadvantage on opportunity attacks against you, double jump distance | Manual — no AE/aura |
| `maszyna-do-zabijania` | najemnik profession | Bonus Action + passive | Extra melee Bonus Action attack ("Promocja"); once/turn Advantage on a STR melee attack ("Zwód") | Manual — no extra activity, no once/turn tracker |

**Decision: leave fully manual.** No code changes made for these four.

This isn't just "matches this codebase's convention" — it also matches
**stock dnd5e's own precedent** for the closest equivalent features,
checked directly against `C:\Git\fvtt-dnd5e` (Path of the Berserker, the
Barbarian subclass whose features are keyed off Rage the same way these are
keyed off Berserk):

- **Frenzy** (`classes24/barbarian/subclass-features/path-of-the-berserker/frenzy.yml`)
  — closest analogue to `maszyna-do-zabijania`: bonus Strength-based melee
  damage "if your Rage is active." Ships as a plain `damage` activity with
  **no activation-type check, no condition, nothing gating it on Rage being
  up** — the rulebook sentence is the only enforcement, same as Berserk's
  four features today.
- **Mindless Rage** (`.../mindless-rage.yml`) — closest analogue to
  `zew-areny`'s fear immunity: "Immunity to Charmed/Frightened while your
  Rage is active." This one *does* ship an ActiveEffect for the immunities
  — but `disabled: true`, and the item's own in-product note says outright:
  *"It is not applied automatically when you begin your Rage though."* Even
  the first-party module, having built the AE, didn't wire it to the Rage
  toggle.
- **Retaliation** (`.../retaliation.yml`) — a reaction attack in the same
  subclass, isn't even Rage-gated in its own text; no precondition logic
  either way.

Conclusion drawn from that evidence: the reference implementation's actual
convention for "only works while [Rage/Berserk] is active" is to automate
the *numeric effect* when it's cheap and self-contained (Berserk already
does this for Obrażenia Berserkera and Siła Berserkera), but leave the
*precondition check* itself to the table, even when a ready-made AE for the
effect exists. Berserk's four `requiresState` features fall on the
"leave it to the table" side of that line, same as their closest dnd5e
counterparts.

## 5a. Real bug found and fixed: the sheet's native "use" button silently burned a use for nothing

Reported as "nothing happens when I use Berserk on Piekarz" / "do I need to be
in turn mode?" — not a turn-order issue at all (`toggleClassState` has zero
combat/turn gating, confirmed by reading it). The actual cause, traced live:

Every feature with an action tag or limited uses gets an auto-generated
`"utility"` activity from `dev/packs/build-packs.mjs` (`buildFeature()`), so
it "can be rolled from the sheet and from the auto-managed hotbar macro." That
generator has no concept of `toggle` abilities — it built Berserk the same
generic, itemUses-consuming, plain-description-card activity as everything
else. The hotbar macro was never affected: `ability-hotbar.mjs`'s
`useAbility()` already special-cases `feature.toggle` to call
`toggleClassState` directly, bypassing `item.use()` entirely. But **the
ability's own native "use" control on the character sheet** — the single most
natural way to click it — goes straight through that generic activity: it
spends a real, Long-Rest-limited charge, posts a plain paragraph-description
card (no bullets, no styling, no scrollText), and applies **zero** mechanical
effect, because none of `class-state.mjs`'s logic is anywhere in that path.

Confirmed live, and it isn't hypothetical: Piekarz had **1 of 2 daily Berserks
already spent** the first time this was checked, days before this session
touched anything — almost certainly burned this exact way, in actual play,
for nothing. Reproduced deliberately (`berserkItem.use()`, the same call a
sheet click makes): use count went from 1→2, a bare `chat-card
activation-card` posted, no AE appeared. (Caught mid-repro, immediately
reverted the count back to 1 — the pre-existing value — so this session's own
diagnostic didn't compound the problem.)

**Fix**, `class-state.mjs` → `registerClassState()`: a `dnd5e.preUseActivity`
hook that checks whether the activity's item is flagged with a `toggle`
ability, and if so, cancels the native activity (`return false`, before any
consumption or card) and calls `toggleClassState(actor, abilityId)` instead —
the exact same function the hotbar macro already used. Every entry point now
converges on one mechanical path. Verified live end-to-end on Piekarz via the
real native call: single consumption (1→2, not 1→3), the proper styled
"🩸 BERSERK" card, the real AE applied; toggled off again the same way,
cleanly; final state reverted to the untouched 1/2.

This generalizes to Kondycha (the only other `toggle` ability) for free — the
hook gates on `feature.toggle` generically, not on Berserk specifically.

## 5b. Real bug found and fixed: rest didn't clear an active Berserk

Reported: "Long rest for some reason didn't clear berserk." Confirmed live —
toggled Berserk on Piekarz, rested him, the `Berserk` effect was still sitting
on him afterward, active, mechanically, indefinitely.

Root cause: the only code that ever deletes a toggle effect for running out of
time is the `updateCombat` hook (checks `duration.remaining <= 0` on
round/turn change). A rest — 4h or 24h in this ruleset, either one obviously
far past Berserk's 10 rounds — never fires `updateCombat` at all, so nothing
was watching for "this got left on across a rest." The effect would sit there
until either a combat round eventually ticked past its nominal duration, or
someone noticed and toggled it off by hand.

**Fix**, same `registerClassState()`: a `dnd5e.restCompleted` hook that
deletes any active `classState`-flagged effect on the resting actor and runs
it through the same `_announceEnd()` as every other end path (scrollText +
"Koniec Berserku" card — correctly *without* the "no action next turn"
exhaustion penalty, since that's only wired into the `updateCombat` branch,
and would be meaningless after a rest anyway). No `isGM` guard needed here —
unlike `updateCombat`, which fires on every connected client watching the
combat tracker, `dnd5e.restCompleted` fires once, client-side, only on
whoever actually triggered the rest.

Verified live end-to-end: toggled Berserk on Piekarz (`spendUse:false`),
called `actor.longRest()` directly, effect was gone immediately after, correct
"Koniec Berserku" card posted, uses correctly reset to 0/2 by the rest itself
(unrelated native recovery, unaffected). The actually-stuck effect from before
the fix was manually cleared first so it didn't leave stale state behind.

## 6. Known gap, flagged not fixed

**`Obłęd Berserkera` vs. the `unarmoredAc` exclusive group.**
`actors/class-rules.mjs`'s own docstring lists "Obłęd Berserkera (part of
Berserk)" as belonging to the `unarmoredAc` non-stacking family (alongside
Goła klata, Tarcza wiary) — but the `berserk` feature entry has no
`exclusiveGroup` tag, and structurally couldn't be resolved by
`resolveExclusiveGroups()` even if tagged: that function only scans passive
**Items**, while Obłęd Berserkera is a **conditional AE bonus** that only
exists while the Berserk toggle is up. Re-reading the RAW text, this is
arguably correct as-is: Goła klata *replaces* the AC formula, Obłęd
Berserkera *adds* to whatever AC formula is active — they aren't "podobnie
działające" in the sense the non-stacking clause means, so no fix may be
needed at all. Flagged rather than silently changed, since it only shows up
in the rare unarmored-multiclass case (Brutal + Kaznodziej, both current)
and touches a comment that may simply be stale. Revisit if it ever actually
comes up at the table.
