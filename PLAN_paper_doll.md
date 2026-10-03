# PLAN — Paper doll: hands, holsters, body slots

> Status: **P1–P5 IMPLEMENTED** (2026-10-03), GM review round applied the same day — what shipped,
> the calls made at implementation, the review round and what is still open: §17. Player-facing
> name: **Oporządzenie** (code keeps `doll`/`lalka`). Migration D9 applied, player-client relay
> tested, packs rebuilt, mannequin art signed off by the GM. Left: the vendor-trash icons (batch 42)
> and the deliberate non-automations listed at the end of §17.
>
> Previous status (2026-10-02): ready for hand-off, P0 spikes done (§15).
>
> Predecessor: `PLAN_przedmioty_podreczne_v2.md` — the belt, the first slotted part of the
> character, already shipped. This plan generalises it.
>
> RAW = `Neuro 5e/Podrecznik/NOE/` (October printing). Page refs `s. N`. Public repo: RAW is
> paraphrased here, never quoted.

---

## 1. Why

NOE refers to a physical inventory model all the time — hands, holsters, a belt, one armour, a
helmet as a mounting point — and never writes it down as a system. Read together, the references
give it a clear shape. It's missing from the book because on paper it can only live in the
players' heads: nobody tracks hand occupancy on a paper sheet. In Foundry it can live in the
sheet. We are the automation.

dnd5e has one boolean, `system.equipped`, and leaves the rest to the GM. At this table that
means "equipped" stands for worn, held, holstered or merely owned; any number of guns are "in
hand"; three helmets stack; and every hand-dependent rule is either manual or dead (§8).

The system's author agrees with the method (2026-10-02): where RAW leaves the GM to think — rules
left out for sanity, because people aren't machines — an automated sheet may fill the blanks, as
long as it neither contradicts RAW nor changes balance. Every inferred rule here must pass that
test (§11).

## 2. Decisions (GM, 2026-10-02)

| # | Decision |
|---|---|
| D1 | Every item has a **location**: pack, belt, holster, hand, worn — or the ground. Doll slots hold *instances* of inventory items, as the belt does today: placing an item never removes it from the inventory. Only the ground takes an item off the character (§9). Holding arbitrary non-weapons (a backpack in hand, CDDA-style) is not modelled. |
| D2 | **Grip superposition.** A held weapon *may* be gripped two-handed iff the other hand is empty; the grip is chosen at the moment of use, never stored. The empty hand shows a ghost of the weapon — that's the option. Drop a shield onto the ghost and the option is gone. Changing grip is free and unlimited, so a stored grip would be redundant state. (SS13's explicit toggle was learning curve, not appeal.) |
| D3 | **Holding ≠ wielding.** A dwuręczna weapon can be held in one hand; it just can't attack that way. Falls out of D2 with no extra rule. |
| D4 | **Hands: a vector in code, max 2 in UI and in support.** Three- or four-armed characters are explicitly unsupported. |
| D5 | **No refusals, no overflow.** Placing an item into an occupied slot swaps: the new item slides in (animated), the previous one slides out. A dedicated × frees a slot. "Holster in turn 1, draw in turn 2" and "one drag" are both valid. Over-capacity is an error state and is never allowed to persist. Alpha: breaking the shipped belt is fine. One exception: D27. |
| D6 | **Roll consequences are defaults**: the module pre-sets, the player/GM overrides, the full context is shown. Applied with judgement — where GMs really do tweak rolls (§5 tiers). |
| D7 | **Action economy is never counted or blocked.** Players don't cheat on it and don't need auditing. Visibility comes from the chat log (separate TODO, IMPLEMENTATION.md Phase 5). |
| D8 | **Equipping is sticky, and you only attack from a hand.** In the pack: Equip (to a hand, or explicitly *Do pochwy / Do kabury*). In a holster: **Dobądź** — no attack. In a hand: attack. Same from the doll, the inventory row or the hotbar. |
| D9 | **Migration: clearing equipped state is acceptable.** The campaign is mid-move from Roll20 with an alpha purge; players re-equip. |
| D10 | **NPCs are exempt from the doll.** GM-controlled actors are simplified; monsters run from human to nowhere near human and no cut-off is wanted. Possible opt-in for NPC-type companions. Storage actors (Zbrojownia) and group/vehicle actors are out by type. NPCs still *drop* things — a short-circuited `drop()` that puts a weapon on the ground with no slots, no guard-rails, no exclusion logic. Mechanical depth on the surface is enough. (Evie is already a `character` actor in this world, so she gets the doll by type.) |
| D11 | **Pod ręką works like the belt.** Every character, even naked, has 4 melee + 3 ranged holster slots (RAW s. 53–54); WKK items can add more. A weapon is in a holster **or** in a hand, never both. A displaced weapon goes to a free holster first; with none free, the player picks **Upuść** or **Do plecaka**. |
| D12 | **Head = Hełm + two accessory slots, Głowa and Twarz**, independent of each other and of the helmet. Accessories have straps; no helmet required. (JA2.) |
| D13 | **One genderless mannequin for everyone**, with range-target proportions, drawn in the sheet's own design language — no paper, no typewriter, no wear (§7). For players it's a genuine new dimension of the sheet, not an absurdity detector. |
| D14 | **NOE / RAI / WKK**: the author's fill-the-blanks principle (§1) puts the inferred system in the RAI bucket (§11). |
| D15 | **The doll is a panel docked to the sheet, not a tab** — items are dragged onto it from Ekwipunek and Zasoby, which are tabs (§7). |
| D16 | **The inventory row's binary equip toggle becomes a location indicator**, one state per location (§7). |
| D17 | **Dropping costs a Darmowa Interakcja** (or Używanie once the [I] is spent) — RAW, in line with SRD 5.2, confirmed by the system's author 2026-10-02. Reason given: a jam must hurt; firearm specialists (Twardziel, Pulp Fiction, poręczna) handle it, everyone else improvises. It cuts both ways — enemy gunners are slowed by it too. **The pack costs an action both ways**: taking out is RAW, putting in is RAI by symmetry. |
| D18 | **A dropped item lands on the scene**, visibly, where it fell — its own minimal prototype (§9). |
| D19 | **WKK option "Darmowe upuszczanie", default off, shown only with Kobalt on:** a voluntary drop of a weapon becomes free, at the price of 1k6 — on 1–2 the weapon takes damage under the existing rules: blade → wyszczerbienie, firearm → uszkodzenie (a gun is a more complex device than an axe). Weapons only; involuntary drops never roll. The system author's playtest rule. |
| D20 | **Strój slot** (outfit) — clothes, Kostium, Skafander ochronny; Skafander may be worn with armour. Diving gear and skis go here too, later (D24). |
| D21 | **Feet: an anchor reserved on the mannequin, probably never a slot.** No footwear mechanics planned (no boots of speed). |
| D22 | **Ramię slot** — clip-on devices: a shoulder-strapped Latarka (so thermals + flashlight is a valid loadout), and devices that must be carried to work (Miernik promieniowania…). A device either takes the Ramię or a hand — a real trade-off, not a junk drawer. |
| D23 | **Power armour:** NOE — it is heavy armour, so it excludes Ochraniacze (s. 115); a helmet is allowed. WKK — also excludes Hełm, Głowa, Twarz and Strój: *szczelność* does a gas mask's job, and the best armour in the game should cost your old goodies. A flashlight on the Ramię is fine. |
| D24 | **Kits are provisions, not v1.** Sprzęt do nurkowania → Strój (RAW: no penalty; WKK: halves walking speed). Narty i kijki → Strój, active only with both hands free (the poles). |
| D25 | **Held weapons don't count toward the 4 + 3** — hands are extra. |
| D26 | **Visibility modifiers don't stack:** one lit light source and one active vision device at a time, across all slots and weapon addons. A light + a vision device is fine (flashlight + thermals). No light multiplication. Already true at runtime — `enforceSingleLightSource` / `enforceSingleVisionSource` — so wearing two flashlights is allowed, lighting the second puts out the first. |
| D27 | **The one confirmation:** a swap that would take off body armour (D5's "placed item wins" on a multi-slot conflict — a helmet onto WKK power armour, knee pads onto heavy armour) asks first. Armour swaps are rare; a misconfigured character is worse. |
| D28 | **Pragmatism at implementation.** Where planning meets code, take what the code lends itself to — e.g. a grapple as a hand occupant if the maneuver code supports it cheaply. |
| D29 | **Nieprzytomność does not empty a PC's hands.** RAW says you drop what you hold, but slings and retention clips exist, and by the time you wake up picking the gun up is admin, not tactics. Left to the GM. |
| D30 | **Oszczep is a melee weapon** — it's in the Tabela Broni Białej. World copies typed `miotana` get fixed before P1. |
| D31 | **Asking:** make the sensible, obvious move when there is one; ask when there isn't; never ask when the choice changes nothing; don't make the algorithm clever. |
| D32 | **The mannequin is seen from the front** — the convention in every game. *Lewa ręka* sits on the viewer's right. |
| D33 | **Ground items are Tiles** (§9) — chosen on the spike results (§15), not on paper. |
| D34 | **NPCs drop for real**, often: a downed NPC dropping a gun that a player picks up is cinematic and a tactical option a VTT normally can't offer. A player within 1.5 m picks it up (with a chat line); the GM proxying it is acceptable. |
| D35 | *Idea only, not planned:* involuntary drops rolling for damage, for a harsher future WKK profile (Rdza, Rtęć). |
| D36 | **Bestiary "vendor trash" becomes WKK weapons** — Maczuga, Pałka policyjna, Kamienny nóż, Sztylet, Młotek: low-grade, stats made up by the implementing agent, icons queued in `dev/icons/MISSING.md`. Without Kobalt those attacks drop nothing. |
| D37 | **A dropped bestiary gun holds 1 round or more, never more than half its capacity** — random in `[1, max(1, ⌊capacity / 2⌋)]`, the catalog's default ammunition. A capacity-1 weapon holds its 1. Real items on hand-made NPCs keep their own state. |
| D38 | **NPC drops at 0 PW are a world setting**, on by default. |

## 3. Slot map (v1 — 20 slots + one reserved anchor)

The count drives the mannequin's layout and art, so it has to be right before P3. Sweep of every
wearable or holdable item in Ekwipunek (Pancerze, Broń, Sprzęt) below.

| Slot | PL | Count | Accepts | Source |
|---|---|---|---|---|
| `hand` | Lewa / prawa ręka | 2 | weapons, Tarcza, hand-held light (Latarka, Pochodnia WKK), any device — incl. hand-only ones (Lornetka, Detektor ruchu) | s. 115, 117–119 |
| `belt` | Podręczne | 3 + WKK | shipped families (`actors/handy-items.mjs`) | s. 53 |
| `melee` | Pochwy | 4 + WKK | broń biała | s. 53 |
| `ranged` | Kabury / pasy nośne | 3 + WKK | broń palna, miotana | s. 54 |
| `body` | Pancerz | 1 | light / medium / heavy (+ Kamizelka taktyczna, WKK) | s. 113 |
| `outfit` | Strój | 1 | Ubrania podróżne, Ubrania porządne, Kostium, Skafander ochronny, Nomex | s. 140–143 |
| `head` | Hełm | 1 | Hełm | s. 114 |
| `headGear` | Głowa | 1 | Noktowizor, Termowizor, Latarka (czołowa) | Sprzęt |
| `faceGear` | Twarz | 1 | Maska przeciwgazowa | s. 141 |
| `shoulder` | Ramię | 1 | Latarka (przypinana do ramienia), clip-on devices: Miernik promieniowania, Miernik skażenia chemicznego, Krótkofalówka | s. 140; Sprzęt, Elektronika |
| `arms` | Ochraniacze rąk (nałokietniki) | 1 | Ochraniacze rąk | s. 115 |
| `legs` | Ochraniacze nóg (nakolanniki) | 1 | Ochraniacze nóg | s. 115 |
| *(feet)* | *Stopy* | 0 | reserved anchor only (D21) | — |

**Why `outfit`.** Four RAW items have worn effects — Ubranie podróżne (heat/cold saves),
Kostium (disguise), Skafander ochronny (chemical immunity, radiation saves, DEX/Percepcja
penalty), Ubranie porządne (access). One outfit at a time stops them stacking, and the mannequin
wears clothes anyway. The trade-off: in one slot a Skafander replaces travel clothes instead of
going over them — accepted, it's one choice per character.

**Why not "kieszeń" for the shoulder.** RAW defines Przedmioty podręczne as what you carry "at
the belt or in a pocket" — a slot called *kieszeń* would read as a fourth belt slot. *Ramię* is
the RAW Latarka's own word for this form.

**Latarka has four RAW forms** (s. 140): hand, head (czołowa), weapon-mounted, shoulder. Three
are doll slots for the same item; the weapon-mounted one is the separate `latarka` addon
(`config/addons-data.mjs`), unaffected.

**Considered, not in v1:**

| Candidate | Why not |
|---|---|
| Buty / stopy | No RAW footwear item; feet only appear inside kits (raki, płetwy, narty). Anchor reserved (D21). |
| Rękawice | No RAW item; Ochraniacze rąk cover the forearms. |
| Plecak | Abstract in RAW (*Tworzenie postaci*, Plecak). Off the doll = in the pack. |
| Fanty / luxury goods | Cwaniak counts luxury goods *worn*, per 50 gb, unlimited → escape hatch (native `equipped`), summed by the ability. |

**Devices.** Where the module has a mechanic for a device, it works only while *active* — in a
hand or on the Ramię. Devices with no mechanic yet still take the slot, for the picture and the
trade-off. Hand-only devices (Lornetka, Detektor ruchu) don't fit the Ramię.

**Multi-slot items.** An item's extra occupancy is *derived* from its data and blocks those slots;
only the primary slot is stored.

| Item | Primary | Also blocks | Layer |
|---|---|---|---|
| Ciężki pancerz (incl. power armour) | `body` | `arms`, `legs` | NOE (s. 115) |
| Pancerz wspomagany / hydrauliczny | `body` | + `head`, `headGear`, `faceGear`, `outfit` | WKK (D23) |
| Sprzęt do nurkowania | `outfit` | `faceGear` (it has a mask) | provision (D24) |
| Narty i kijki | `outfit` | — (needs both hands free to be *active*) | provision (D24) |

**Conflicts**, resolved by displacement (D5) — the item being placed wins:
- a multi-slot item ⟂ everything in the slots it blocks — whichever was placed last stays,
  except that taking off body armour this way asks first (D27);
- the same piece in a `hand` and a holster.

**Escape hatch.** Items with no slot family keep dnd5e's native `equipped` toggle, untouched.
The doll never has to classify the whole catalogue before it ships; an unknown item is never
guessed into a slot.

**Visibility (D26).** `items/gogle.mjs`, `items/latarka.mjs` and `wkk/items/pochodnia.mjs`
already allow one lit light source and one active vision device per actor. The doll doesn't
duplicate that: two flashlights may be worn (hand + Ramię), only one is lit. `headGear` holds one
vision device anyway.

## 4. Model

- **Three tiers of location:** *pack* → *stowed* (belt, holster) → *active* (hand, worn). Plus
  the ground (§9).
- **`system.equipped` = active**, not "on the doll". dnd5e suppresses an item's Active Effects
  whenever `equipped === false` (`Item5e#areEffectsSuppressed`), and every module consumer that
  reads `equipped` already means *active*: goggle and flashlight providers, Nomex, Samuraj, the
  Wytrącenie item list, armour rules. With `equipped` = active they all become exact with no code
  change — a holstered gun stops counting as "in hand" for free.
- **One flag per item:** `flags.<mod>.slots` = per-piece list of slot ids — `["hand.0"]`,
  `["ranged.0", "ranged.1"]` (two throwing knives from one stack), `["belt.2"]`. Pieces not listed
  are in the pack. The belt's `atHand` migrates into it as `belt.N` — one source of truth for
  every slot.
- **Rules read predicates**, never the flag: `locationOf`, `inHand`, `heldItems`, `freeHands`,
  `isStowed`.
- **One write funnel:** `place(actor, item, target)`, `takeOff(actor, item)`, `drop(actor, item)`.
  All call a pure `resolve(layout, item, target, capacity)` → list of moves `{itemId, from, to}`,
  each with its `moveCost` (§6), applied as one `updateEmbeddedDocuments` batch. Pure → Quench
  layer 1.
- **Nothing bypasses the funnel:**
  - `preUpdateItem` reroutes native `system.equipped` writes — dnd5e's row toggle and context
    menu, and module code: `weapons/thrown.mjs`, `combat/melee-maneuvers.mjs`,
    `production/przenoszenie.mjs`, `actors/zbrojownia-sync.mjs`, `actors/surowce-store.mjs`;
  - `preCreateItem` strips `slots` — dnd5e **copies** items between actors by default (and
    Duplicate copies too); the copy would arrive "in hand";
  - item use is intercepted twice (verified, §15): a wrapper on `Item5e#use` catches the sheet's
    item click and item macros **before** dnd5e's activity picker; `dnd5e.preUseActivity`
    catches what bypasses `Item#use` — activity macros, the expanded row's activity list. Either
    alone leaves a hole. The module already wraps `Item#use` in `config/validation.mjs`.
- **Quantity drops** (thrown, consumed): the hinted piece first (clicked tile, the hand that
  threw); otherwise the most accessible piece — hand, belt, holster, then pack. Matches the
  shipped belt ("consumption comes off the belt first").
- **Capacity sources:** §3 base + active items with flags (`handySlots` exists; add
  `meleeSlots` / `rangedSlots` for WKK holsters and slings). Losing a source displaces its
  contents to the pack — the pouches leave with the vest.

**Auto placement** (the Equip click — confirmed):
1. armour, strój, helmet, głowa, twarz, ochraniacze → their slot, swapping if occupied;
2. Latarka and clip-on devices → Ramię → a free hand (players avoid spending hands); a Latarka
   goes to Głowa only when dragged there;
3. weapon / shield → a free hand → else a free compatible holster → else swap into a hand.

The item menu also offers the explicit targets — *Do ręki*, *Do pochwy / Do kabury*, *Na pas*.

**Displacement chain** (confirmed): a displaced weapon → a free compatible holster → otherwise
**Upuść** ([I], §9) or **Do plecaka** (Akcja) — a dialog in combat, straight to the pack out of
combat. Worn items skip the holster step.

**Dobądź with both hands full** (D31):
1. a hand is free → it goes there, nothing moves;
2. exactly one held item fits a free holster (counting the slot being vacated) → that item is
   holstered, the drawn one takes its hand;
3. otherwise one dialog: which hand gives way, with each hand's destination on its button
   ("Lewa: AK → kabura", "Prawa: Tarcza → plecak") — never two dialogs in a row.

## 5. Grip and roll consequences

`gripOptions(actor, item)` for a held item: `{1, 2}` if the other hand is empty, `{1}` otherwise
(D2). The roll defaults to the best available grip; the player may pick the worse one (D6).

| Weapon | Other hand empty | Other hand occupied |
|---|---|---|
| Oburęczna | dnd5e's grip select offers both, default two-handed (bigger die) | one-handed only |
| Dwuręczna | normal | warning badge "druga ręka zajęta: …" — still rollable; RAW says it can't attack, GM decides |
| Firearm | normal | Utrudnienie by default, unless exempt: poręczna; Jednoręki (Rewolwerowiec — revolvers; Pistolero WKK — pistols); Stalowy nadgarstek (Twardziel, Zwiadowca — short firearms + SMGs); Pulp Fiction (Sztuczka) — Jednoręki |
| Lekka, extra attack | — | offhand mode offered iff the other hand holds a light weapon too (s. 117 *allows*, never requires) |

**The superposition covers belt items too.** A rifle held "two-handed" never blocks a grenade
throw or a Medpak: the hand that was potentially on the stock does it. Only two *occupied* hands
raise a note.

**Worked example — the jam** (the author's case, 2026-10-02). Two attacks, pistol in the right
hand, left hand free. First shot jams. *Dobądź* on the second pistol ([I]) puts it in the free
left hand — nothing moves (§4, rule 1). No [I] left to drop the jammed one, so it stays in the
right hand. Second shot: other hand occupied → one-handed → Utrudnienie, unless Pulp Fiction,
poręczna or Stalowy nadgarstek. The doll shows exactly that picture with no special case. (A held
rifle with a `bagnet` addon can still fight in melee — nothing for the doll to do.)

**Hands held by something other than an item:** RAW Pochwycenie is one grapple *per hand*, so a
grappling character has one hand occupied by a creature — their pistol in the other hand fires
one-handed. Cyrkowiec implies a motorcycle rider keeps a hand on the handlebars. The hand model
accepts a non-item occupant ("trzyma: <token>", "kierownica") from v1; whether the grapple
actually fills it in v1 depends on what `combat/melee-maneuvers.mjs` lends itself to (D28) —
today it marks the target as grappled but doesn't record who holds it. Handlebars come with the
vehicles milestone.

Tiers, by where a GM actually overrides (D6):

| Tier | Consequence | RAW |
|---|---|---|
| **Dialog default** — overridable, badge on the chat card (`combat/udzwig-attack-disadvantage.mjs` pattern: `dnd5e.preRollAttack` + `roll.options`) | One-handed firearm Utrudnienie (table above) | s. 118–119 |
| | Oburęczna grip pre-selected | s. 117 |
| | Długa seria fired one-handed → targets get Ułatwienie on their RO | Broń, Długa seria |
| | Wytrącenie against a PC who could grip two-handed → the existing Ułatwienie checkbox pre-filled | Zasady szczegółowe |
| **Warning badge** | Dwuręczna attacking with one hand | s. 117 |
| **Note on the card** | A free hand at the moment of use: Pochwycenie, Szybkoładowacz, Powracająca catch, belt items when both hands are occupied; Medyk when either hand is occupied (needs both); Alpinista | various |
| **Silent derivation** | Tarcza TT only in a hand; Samuraj TT +1 only with the blade in a hand; goggles, flashlight, clothing and Nomex effects only when active (AE suppression, §4) | — |

Nobody fudges TT per attack; everybody occasionally waives an Utrudnienie. Hence the split.

**Events that empty hands** (RAW leaves no choice, so they are automatic):
- **Wytrącenie** — the chosen held item falls at the target's feet (an NPC target too, through
  the short-circuited `drop()`, D10);
- **Szeryf's "Poddaj się!"** — a PC who fails the save drops the weapon;
- **Thrown weapon** — the piece lands at the target (§9); Powracająca comes back to a free hand.

Not automated: **Nieprzytomność** keeps a PC's hands as they were (D29).

## 6. Use flow and action costs

| Item is… | Click — inventory row, hotbar, doll tile |
|---|---|
| in the pack | **Equip** → auto placement (§4). Menu: *Do ręki*, *Do pochwy / Do kabury*, *Na pas*. |
| holstered | **Dobądź** → into a hand (§4, rules 1–3). No attack from a holster. |
| in a hand | **Attack.** |
| on the ground | **Podnieś** (adjacent only). |

Hotbar macros go through `item.use()`, so they follow the same table — a holstered weapon's macro
draws on the first click and attacks on the second. Dragging a doll tile onto the hotbar creates
dnd5e's item macro (same `{type: "Item", uuid}` payload) — players can build their hotbars
straight from the doll.

**Costs** — shown on the combat line, never counted, never blocked (D7). Pure
`moveCost(actor, move) → {cost, why}`:

| Move | Cost | Source |
|---|---|---|
| holster → hand (dobycie) | [I] | *Walka*, Dobywanie i chowanie broni |
| hand → holster (schowanie) | [I] | same |
| ground → hand (podniesienie) | [I] | same — RAW counts picking up from the ground as drawing |
| hand → ground (upuszczenie) | [I] (Używanie if the [I] is spent) — free with the WKK option (D19) | same — RAW counts dropping as stowing; author confirmed |
| pack → anywhere (incl. the belt) | Akcja | *Tworzenie postaci*, Plecak ("zazwyczaj") |
| anywhere → pack (incl. from the belt) | Akcja | RAI, symmetry (D17) |
| body armour on/off | 1 / 2 / 4 Akcje | s. 113 |
| Hełm, Ochraniacze, Tarcza on/off | 1 Akcja | s. 113 (Akcesoria) |
| Głowa, Twarz, Ramię, Strój on/off | 1 Akcja | RAI — like Akcesoria (s. 113) |
| hand ↔ hand, change of grip | free | — |
| belt → use | [I] to pull + Używanie | s. 53 (shipped) |
| involuntary drop (Wytrącenie, "Poddaj się!") | none — not the character's action | — |

Modifiers named on the line: Rewolwerowiec *Dobywanie* (one or two revolvers from holsters, no
[I]); Samuraj *Dobycie* (finesse slashing, no [I]); *Podwójne dobycie* (two hatchets per [I]);
*Mam pod ręką* (pack → [I]).

## 7. UI — the doll

**A panel docked to the sheet (D15).** Its own ApplicationV2, frameless, docked to the left edge
of the character sheet (right edge if there's no room), same top, same height — the arrangement
in theripper93's Paper Doll. Opened from a "Lalka" button in the sheet header; open state
remembered per user.

- Docking lives in our sheet subclass (`actors/sheet-shell.mjs` owns `NeuroshimaCharacterSheet`).
  Verified (§15): the sheet's `position` event moves and resizes the panel; `close` closes it.
  Core's `bringToFront` **returns early for frameless apps**, so z-order is ours: the subclass's
  `bringToFront` sets the panel's z-index to the sheet's, and a pointerdown on the panel raises
  the sheet. Minimise needs its own override (it doesn't go through `setPosition`).
- The frameless element is appended to `<body>` with no window CSS — it needs its own
  `position: fixed`.
- Why not a drawer inside the sheet's DOM: it may be clipped by the window frame, it shares
  dnd5e's drop routing, and it dies with every part re-render. A separate app re-renders only on
  its own data, so its animations survive the sheet's re-renders.
- Width ≈ 340 px → sheet + panel ≈ 1140 px. On narrow screens the panel overlaps the canvas.

**Style — an extension of the sheet, not a new theme** (GM, 2026-10-02). The panel must read as
another part of the current dnd5e 5.x sheet, which stays the design language through the coming
sheet style pass:
- the sheet's own surfaces, borders, fonts and colours, through dnd5e's CSS variables
  (`--dnd5e-color-*`) and the module's existing ones — no hard-coded palette, so the panel
  follows the light/dark theme and moves with the style pass for free;
- the module's existing components, not new ones: group headings as the Stan panel's
  fieldset-style legend (`.neuro-stan-panel > h3`), slots as the belt's tiles (`.neuro-belt` —
  dashed empty slot, gold hover and drop highlight, `--dnd5e-color-gold`);
- callout lines thin and quiet, in the sheet's border colour;
- **no** paper texture, typewriter font, ink, stains or wear. The 1.5 sheet gives the layout, not
  the look.

```
 [Hełm]      ──╮        ╭── [Głowa]
 [Twarz]     ──┤   ●    ├── [Ramię]
 [Strój]     ──┤  ╱█╲   ├── [Pancerz]
 [Ochr. rąk] ──┤   █    ├── [Ochr. nóg]
 [P. ręka]   ──╯  ╱ ╲   ╰── [L. ręka]     ← front view; an empty hand shows the grip ghost
                 (stopy — anchor only)
 PAS     [ ][ ][ ] (+1)
 POCHWY  [ ][ ][ ][ ]
 KABURY  [ ][ ][ ]
```

- **Mannequin (D13):** one genderless figure for everyone — a generated asset, spec in §7a.
  **Layout reference: the GM's Neuroshima 1.5 Roll20 sheet** — a silhouette with leader lines
  from body parts to labelled boxes in two side columns. Adopt that callout layout (only the
  layout — see *Style*): tiles in side columns, a line from each tile to its body part, drawn by
  us over the image. No tile sits on the figure, which keeps a 340 px panel readable and lets the
  art change without moving tiles.
- **Grip ghost (D2):** an empty hand shows the other hand's weapon, faint — the two-handed
  option. Drop anything on it and the option is gone.
- **Tiles:** the belt's tile component (icon, caption, dnd5e item tooltip).
- **Gestures:** drag a row (Ekwipunek, Zasoby) onto a slot — swap if occupied; drag tile → tile
  (move/swap); drag a tile off the panel or × → take off (displacement chain, §4); drag a tile
  onto the hotbar → item macro; click → primary action (§6); right-click → explicit targets;
  Shift+click → item sheet. Drops onto the sheet are caught in the capture phase, as the belt
  does today, so dnd5e never treats them as a sort.
- **Animation:** FLIP inside the panel — capture tile rects before the write, animate from them
  after the render. The displaced item slides out as a ghost clone.
- **Header belt strip stays** — a second view of the same state.
- **Combat lines:** one compact chat line per move while `inCombat`, with its cost (§6); nothing
  out of combat. A source for the chat turn-summary TODO (D7).

**Inventory row indicator (D16).** Replaces dnd5e's equip toggle on doll-governed items;
escape-hatch items keep the native toggle.

| Location | Indicator | Click |
|---|---|---|
| pack | none (faint outline on hover) | Equip (auto placement) |
| belt | pouch | take off → pack |
| holster | holster | take off → pack |
| hand | hand + L / P | take off → displacement chain |
| worn | shirt / armour | take off → pack |
| ground | arrow down | Podnieś |

A stack spread over several locations shows the most active one plus a count. Right-click lists
explicit targets: Lewa ręka, Prawa ręka, Pochwa / Kabura, Pas, Upuść, Do plecaka. The belt's row
icon today is `fa-hand` — it has to change, since ✋ will mean "in hand".

### 7a. Mannequin art — spec for an image model

Generated with a dedicated image model, not drawn in SVG by hand. The callout lines, tiles and
labels are ours (HTML/SVG over the image), so the image carries no text and no lines.

**How it's used:** as a CSS **mask** (`mask-image`) over a fill taken from the sheet's variables.
The image contributes only its shape; the colour comes from the theme, so the figure follows
light/dark mode and the future style pass without new art.

**Deliverable** → `icons/doll/mannequin.png` (source; shipped as WebP): the figure alone, flat
solid black on a transparent background (if the model can't do alpha: flat pure white
background, cut out afterwards), 800 × 1600, portrait 1:2.

**Figure:**
- full-body human silhouette, standing, symmetric, seen square-on;
- genderless — neutral shoulders and hips, no hair, no face, no clothing details;
- average, slightly sturdy build with the proportions of a police / IPSC range-target figure —
  the "target" read comes from the shape, not from printing;
- A-pose: arms about 20° off the torso, open hands clearly separated from the hips; legs
  slightly apart; feet visible (the reserved anchor);
- one flat colour, crisp clean edges — no texture, gradient, wear, scoring zones or bullet holes;
- no text, numbers, labels, lines, frames, shadows or props;
- centred, head-to-feet ≈ 92 % of the canvas height.

**Prompt draft:**
> Front view full-body silhouette of a gender-neutral human figure with the proportions of a
> police shooting-range target, solid flat black, crisp clean edges, no texture, no gradient,
> A-pose with arms slightly away from the body, open hands separated from the hips, legs slightly
> apart, feet visible, no face, no hair, no clothing, no text, no lines, centered, transparent
> background, portrait 1:2.

**Anchors** — measured after generation, never asked of the model. `config/doll-anchors.mjs`
holds normalised (0–1) image coordinates for each line endpoint: Hełm (crown), Głowa (forehead),
Twarz (mouth), Ramię (shoulder), Pancerz (chest), Strój (abdomen), Ochraniacze rąk (elbow),
Ochraniacze nóg (knee), Lewa / Prawa ręka (palms), Pas (waist), Pochwy and Kabury (hips), Stopy
(feet, reserved). New art = re-measure these points, nothing else.

**Left and right (D32).** Seen from the front, the character's left hand is on the viewer's
right: the *Lewa ręka* tile sits in the right column. (The 1.5 sheet ignored this.)

## 8. What it unblocks

| Rule | Today | With the doll |
|---|---|---|
| One-handed firearm Utrudnienie (s. 119) | not applied | dialog default |
| `poreczna` | 🚫 — `PLAN_weapon_properties.md` §1 (nothing to cancel) | exemption |
| Jednoręki — Rewolwerowiec, Pistolero | "jeszcze nie" (`actors/rewolwerowiec.mjs`) | exemption |
| Stalowy nadgarstek, Pulp Fiction (Sztuczka) | no effect | exemption |
| Oburęczna die | free choice in the dialog | pre-selected from grip |
| Dwuręczna | nothing | warning badge |
| Tarcza | TT from any equipped shield; free hand "nie jest sprawdzany" (`config/armor-data.mjs`) | takes a hand, TT only in hand |
| Samuraj TT +1 "w ręku" | approximated by `equipped` | real hand |
| Wytrącenie | picks among equipped weapons; Ułatwienie by hand (`combat/melee-maneuvers.mjs`) | PC target: picks from hands, Ułatwienie pre-filled. NPC target: today's dialog. Either way the item lands at the target's feet |
| Długa seria one-handed | not applied | targets' RO default |
| Ochraniacze ⟂ heavy armour | "Moduł tego nie blokuje" | displacement, with confirmation (D27) |
| N armours, N helmets, N head devices, N outfits | allowed, effects stack | one slot each |
| Two lit lights, two active vision devices | already prevented at runtime | unchanged (D26) |
| Nieprzytomność drops what you hold | manual | still manual — GM's call (D29) |
| Szeryf's "Poddaj się!" | manual | failed save drops the weapon |
| Thrown weapon, last piece | `weapons/thrown.mjs` unequips | lands at the target |
| Picking up from the ground | — | Podnieś, [I] |
| Medyk / Szybkoładowacz / Pochwycenie / Alpinista / Powracająca | manual | note on the card |
| Dobywanie (Rewolwerowiec), Dobycie (Samuraj), Podwójne dobycie, Mam pod ręką | manual | named on the move line — informational, not counted (D7) |

## 9. Items on the ground — Tiles (D33)

The doll needs two calls: `drop(actor, item, {at})` and `pickUp(actor, tile)`. Callers: Upuść,
the displacement choice, Wytrącenie, "Poddaj się!", thrown weapons, and NPC drops (D34).

**A dropped item is a Tile** carrying the item's full data in `flags.<mod>.groundItem`
(`{itemData, from, droppedAt}` — 2.3 KB for a pistol). Verified live (§15). Native Tiles give,
for free: persistence, rendering under fog and vision, scene levels, and the GM's ordinary tile
tools to move or clear them. The item **leaves** the character — so there's nothing to hide from
Udźwig or the inventory lists, and an unlinked NPC token can be deleted without losing what it
dropped. (Option A — keeping the item on its owner — is dropped for exactly those reasons.)

- **Who writes:** players can't create Tiles (`TileDocument` create is ASSISTANT+), so use the
  module's **existing GM-relay idiom** — `items/kolczatka.mjs`, `actors/grenade-inventory.mjs`,
  `wkk/items/flara.mjs`: the player's client writes a plain request flag on its **own** actor;
  every client's `updateActor` hook sees it; only `game.user.isActiveGM` performs the privileged
  `createEmbeddedDocuments("Tile")` / item create / tile delete, then clears the flag. No new
  socket channel. No active GM → the request is refused with a message.
- **Where it lands:** *beside* the token, not under it — tokens draw above tiles, so an item at
  your feet is invisible (verified). A free spot in the ring around the token; the target's ring
  for throws and Wytrącenie. Random small rotation. `sort` above the scene's existing tiles (map
  art is often tiles); `levels` from the token's level.
- **Look:** `vfx/<item id>.webp` (class B top-down art, `dev/icons/MISSING.md` §B) when it
  exists, else the item's own sheet icon. Module icons render white on the canvas (the SVGs'
  `var(--icon-fill, #fff)` fallback) — readable on dark floors; on light floors an outline
  filter applied at draw time (`drawTile` hook). Re-colouring through a blob URL failed
  (`loadTexture` rejected it) — don't go there.
- **What the tile carries:** a *bundle*, not one item — a gun with a removable magazine drops
  with that magazine item (`loadedMag` in `weapons/magazine.mjs` points at a separate item).
  Pick-up recreates both and re-links `loadedMag` to the new magazine's id. Pieces of a stack
  drop one per tile.
- **Picking up:** the doll panel lists "Na ziemi obok" — ground tiles within 1.5 m of the
  character's token. Click → GM client creates the item on the character (slots stripped),
  deletes the tile, posts "X podnosi Y" ([I]). The GM can do the same from any character's
  panel (proxy). No canvas clicking needed — players can't interact with tiles anyway.
- **GM sweep:** an API call (and later a scene-control button) deleting every ground tile on a
  scene.

**NPC drops (D34, D38).** With the world setting on (default), an NPC token reaching 0 PW drops
every *droppable* weapon, once (a token flag guards repeats). Droppable means:
- a real weapon item of a module type (`biala`, `palna*`, `miotana`) — hand-made world NPCs carry
  these, with magazine flags. The item itself drops, magazine state and all, and leaves the
  token's actor;
- a bestiary attack **feat** with `flags.<mod>.dropsAs` — the bestiary's 51 actors attack with
  `feat/monster` amalgamations, not weapon items. `dropsAs` names a catalog weapon; the drop is a
  fresh catalog instance (its own stats, not the NPC's amalgamated ones) loaded per D37, and the
  feat is marked dropped. The table (below) lives in the bestiary generator — name matching at
  runtime is out (partial matching turned "Konar" into an AR, §15);
- never: natural weapons (`natural`), generic placeholders ("Broń", `simpleM`), machines and
  monsters.

**`dropsAs` table** (settled 2026-10-02):

| Bestiary attack (actor) | Drops as | Layer |
|---|---|---|
| 16 exact catalog names: Peacemaker, UZI, Tommy gun, Desert Eagle, .44 Magnum, Lewar M95, Trzydziestka ósemka, AR, Dmuchawka, Łuk tradycyjny, Oszczep (×3), Widły, Nóż taktyczny, Kastet | the same catalog weapon | NOE |
| Bejsbol (Gangus Żołnierz, Kapo), Rura stalowa (Cywil) | Bejsbol/Rurka | NOE |
| Utwardzony Crash (Gangus Boss) | Crash + the `utwardzenie` addon | NOE |
| Łuk (Myślący szczur) | Łuk tradycyjny | NOE |
| Maczuga (Grubas, Kanibal), Pałka policyjna (Konwojent), Kamienny nóż (Kanibal), Sztylet (Myślący szczur), Młotek (Żołnierz Posterunku) | new WKK "vendor trash" weapons (D36) | WKK — nothing without Kobalt |
| Machines (Kurczak, Juggernaut, Obrońca, Kidnaper), monsters, natural attacks, "Atak bez broni" | nothing | — |

**Drop damage (D19, WKK, Kobalt on, option on).** A voluntary drop is free and rolls 1k6; on 1–2
the damage is applied to the item before it becomes a tile: blade → one wyszczerbienie step
(`weapons/melee-degradation.mjs`); firearm → uszkodzenie (`weapons/jams.mjs`), not a zacięcie —
a dropped gun has usually jammed already, so a jam result would be a no-op.

## 10. Out of scope / later

- **NPC opt-in** for companions (M3 towarzysze): `flags.<mod>.doll = true`. Other NPCs only get
  `drop()` (§9).
- **Grapple and handlebars as hand occupants** (§5) — the hand model allows them from v1; filling
  them is D28's call.
- **Kits** (D24): Sprzęt do nurkowania, Narty i kijki.
- **WKK bandolier** for throwing knives — more than three pieces at hand. Low priority: 1k4 thrown
  damage makes the knife a clearly inferior weapon without poison or similar buffs.
- **Chat turn separators + per-turn action summary** — IMPLEMENTATION.md Phase 5.
- **Party sheet:** every PC's doll at a glance for the GM.
- More than two hands (D4). A backpack slot, clothing layers, per-body-part encumbrance (CDDA)
  — no. The token's right-click HUD — no (it has no attack action anyway).

## 11. NOE / RAI / WKK

The author's principle (§1) settles it: automation may fill blanks RAW left to the GM, as long as
it neither contradicts RAW nor changes balance.

- **NOE** — every count RAW states: 2 hands, 4 + 3 pod ręką, 3 belt, one armour, helmet, a pair
  of ochraniacze each, ochraniacze ⟂ heavy, shield takes a hand, don/doff times, picking up,
  drawing and dropping as [I] (Walka, Dobywanie i chowanie broni; author-confirmed reading), all
  grip consequences in §5.
- **RAI** — NOE tree, ungated; each fragment commented with the principle, and listed in the RAI
  table of `scripts/wkk/README.md` when P1 lands: the slot geometry, hand ⟂ holster, Głowa /
  Twarz / Ramię / Strój slots and their 1-Akcja cost, devices needing a slot, auto placement,
  displacement, grip superposition, an action to put something into the pack, free-hand notes
  for belt items, the ground as the destination of drops, power armour allowing a helmet,
  visibility modifiers not stacking, NPCs dropping weapons at 0 PW (Nieprzytomność's own rule,
  applied to NPCs), the NOE rows of the `dropsAs` table, rounds in a dropped gun (D37).
- **Conscious deviation from RAW text** — commented in code: Noktowizor and Termowizor strapped
  on (RAW lists helmet mounting among their forms). Cost-neutral.
- **RAW left to the GM** — Nieprzytomność dropping what a *PC* holds (D29). Not automated, not
  contradicted.
- **WKK** — items that add capacity (Kamizelka taktyczna, holsters, slings, the future
  bandolier); Darmowe upuszczanie (D19); power armour excluding Hełm, Głowa, Twarz and Strój
  (D23); diving gear halving walking speed (D24); the vendor-trash weapons (D36).

## 12. Open questions

None. Settled in the last pass: the vendor-trash weapons (D36), rounds in a dropped gun (D37), the
NPC-drop world setting (D38). The `dropsAs` proposals for Bejsbol, Rura stalowa, Utwardzony Crash
and Łuk drew no objection and stand (§9).

## 13. Phases

| Phase | Size | Content | Done when |
|---|---|---|---|
| P0 Spikes | S | **done 2026-10-02** — §15 | — |
| P1 Model | M | Oszczep data fix; slot taxonomy + classification, multi-slot occupancy, `resolve()`, funnel, intercepts, `atHand` → `slots`, `moveCost`, migration (clear all; dry-run report first) | layer-1 tests: swaps, displacement chain, D27 confirmation, capacity loss, conflicts, multi-slot, consumption order, derived `equipped` |
| P2 Rules | M | §5, §6; grapple occupant if cheap (D28); coverage ledger and `PLAN_weapon_properties.md` updated | each consequence tested; live check on two PCs |
| P3 Doll UI | L | panel, docking, tiles, gestures, row indicator, animation, grip ghost, placeholder mannequin | live on a 1920 and a 1366 px screen, play + edit mode |
| P4 Ground v0 | M | §9: tiles, GM relay, "Na ziemi obok", NPC drops + world setting, `dropsAs` table, vendor-trash WKK weapons, D37 loading, Darmowe upuszczanie | drop, pick-up (as a player), Wytrącenie, thrown weapons, NPC at 0 PW — live |
| P5 Art | S | wire the GM's art per §7a, measure anchors | GM sign-off |
| P6 Later | — | §10 | — |

## 14. Risks

- **Writers outside the funnel.** Anything that sets `system.equipped` directly must be caught
  by `preUpdateItem` (§4 list). New module code must use the funnel.
- **Item copy and Duplicate** carry flags — strip on create.
- **AE suppression** — `equipped` must mean *active*, or a holstered item's effects apply (§4).
- **Use interception** — needs both the `Item#use` wrapper and the `preUseActivity` backstop (§4).
- **Belt migration** — the shipped belt's tests move with `atHand` → `slots`.
- **Classification of world items** — weapon `type.value` (biała / palna* / miotana), armour id
  (`helm`, `ochraniacze-*` are `trinket`), gear flags. Unknown → escape hatch, never a guess.
- **Ground relay needs a GM client** — always true at this table; without one, drop and pick-up
  are refused with a message rather than half-done.
- **Light floors** — white icons need the outline filter (§9).
- **Screen width** — sheet + panel ≈ 1140 px.
- **Data drift that decides holsters** — Oszczep is in the Tabela Broni Białej, but world copies
  are typed `miotana`, so they'd land in the ranged rack. Fixed in P1 (D30).
- **RAW strictness on stacks** — "egzemplarze" means pieces: ten throwing knives fill the three
  ranged racks and the rest cost an Akcja from the pack. Correct, but a knife-thrower PC will feel
  it; a WKK bandolier is the pressure valve.

## 15. P0 spike results (2026-10-02, live world, FVTT 14.364 / dnd5e 5.3.0)

Run through Chrome DevTools on the live world with throwaway code; everything created was
removed afterwards (panel, style, test tile).

| Spike | Result |
|---|---|
| **Docked frameless panel** | Works. `window: {frame: false, positioned: true}` renders a bare element in `<body>`. Docked to the TESTER sheet: follows `setPosition` (move, resize) via the sheet's `position` event, closes on its `close` event. Core `bringToFront` returns early for frameless apps — z-order handled by overriding the sheet's `bringToFront` (verified: another window on top → both behind; sheet raised → panel raised with it). |
| **Drag sheet → panel** | Works with dnd5e's own payload: its rows drag from `[data-item-id] > .item-row` and write `{type: "Item", uuid}`; the panel's drop listener reads it with `TextEditor.getDragEventData`. No sheet code needed. |
| **Drag panel → sheet** | A capture-phase `drop` listener on the sheet element takes the panel's payload (`neuroshima.fromSlot`) before dnd5e; zero item updates fired — dnd5e's same-actor sort never ran. |
| **FLIP across re-render** | Works. Rects captured before `render()`, `element.animate()` from the old offset after it — the move animation ran from hand to rack; on a swap the new item scaled in and the displaced one slid out as a ghost clone. |
| **Use interception** | `Item5e#use` wrapper caught the sheet's item click and an item hotbar macro before any picker. An activity macro and a direct `activity.use()` bypass `Item#use`; `dnd5e.preUseActivity` returning `false` stopped both before any dialog. Some world weapons have **zero** activities (`TEST - Pistolet Mag. 9mm`) — `Item#use` would fall to `displayCard`; the wrapper covers it. |
| **Ground as a Tile** | Created a Tile with an NPC's pistol icon and `itemData` in flags: persisted, rendered, flags round-tripped, v14 `levels` set from the token. Invisible at first — it sat under the NPC's token (tokens draw above tiles); moved beside the token it showed as a clean white pistol. A blob-URL re-colour was rejected by `loadTexture`. Players lack TILE_CREATE → GM relay. |
| **NPC weapon data** | Hand-made world NPCs carry real weapon items with module types and magazine flags — droppable as they are. The bestiary pack's 51 actors attack only through `feat/monster` items: of ~26 human-weapon attacks, 16 match a catalog weapon by exact name; partial matching is unusable ("Konar", "Paralizator" → AR). Hence the explicit `dropsAs` table (§9). |

## 16. Hand-off — for the implementing agent

**Read first:** §2 (decisions are binding), §4 (model), §15 (what was verified live and how);
`scripts/wkk/README.md` (where code goes); `TESTING.md` and `DEV_GUIDE.md` §12 (Quench layers);
`PLAN_przedmioty_podreczne_v2.md` (the belt this generalises); `items/kolczatka.mjs` header (the
GM-relay idiom); `combat/udzwig-attack-disadvantage.mjs` header (roll defaults + chat badge).

**Work, in order:**

1. **P1 Model.**
   - Oszczep: world copies typed `miotana` → `biala` (dry-run report first; live world via CDP).
   - Pure, Node-importable modules first (no Foundry globals, so layer-1 tests stay cheap): the
     slot taxonomy (§3), item → family classification (unknown → none, never a guess),
     `resolve()`, `moveCost()`. Then the funnel: `place` / `takeOff` / `drop`, derived `equipped`
     (= active), the `preUpdateItem` / `preCreateItem` intercepts (§4 lists every writer).
   - Belt: `atHand` → `slots` (`belt.N`); the header strip and its tests keep working.
   - Migration: clear equipped state on doll-governed items of `character` actors (D9) —
     dry-run report, then the GM's go-ahead.
   - Quench batch registered in `scripts/tests/index.mjs`, key prefixed with the module id.
2. **P2 Rules.** Use interception (`Item#use` wrapper + `preUseActivity` backstop — §4, both);
   §5 consequences via `dnd5e.preRollAttack` with chat badges; exemptions through the existing
   ability lookups (`actors/rewolwerowiec.mjs`, `hasAbility`); Wytrącenie
   (`combat/melee-maneuvers.mjs`), thrown weapons (`weapons/thrown.mjs`), Tarcza, Samuraj
   (`actors/samuraj.mjs`); notes on cards. Update the coverage ledgers, `PLAN_weapon_properties.md`
   (poręczna 🚫 → ✅) and the IMPLEMENTATION.md matrix.
3. **P3 Doll UI.** Frameless docked panel per §7 and §15 (z-order and minimise are yours);
   "Lalka" header button; tiles, gestures, FLIP, grip ghost; the row indicator replacing dnd5e's
   equip toggle on governed items; the belt's row icon off `fa-hand`. A placeholder silhouette
   until the art lands. `npm run validate:css` after every CSS edit.
4. **P4 Ground.** Tiles via the request-flag relay (§9); "Na ziemi obok"; NPC drops + the world
   setting; `dropsAs` in `dev/bestiary/gen_bestiary.py` (`AUTOMATION`), rebuilt into the pack;
   the five vendor-trash weapons in `scripts/wkk/config/weapons-data.mjs` with their icon rows
   in `dev/icons/MISSING.md` §A; D37 loading through `weapons/magazine.mjs`; Darmowe upuszczanie
   (Kobalt-gated setting).
5. **P5 Art.** Wire `icons/doll/` (WebP), measure the anchors into `config/doll-anchors.mjs`.

**Rules of this repo that bite:**
- Public repo — no plot spoilers, no verbatim RAW, no plot NPC names; name the system's author
  only where the GM has confirmed it.
- Never write JSON the server parses (`module.json`, pack sources) through PowerShell — BOM.
- Pack rebuilds need Foundry **closed** — ask the GM. Ask before reloading the live world too
  (the GM login is password-gated).
- Every new art need gets a row in `dev/icons/MISSING.md` in the same session.
- RAI fragments get a row in the RAI table of `scripts/wkk/README.md`.
- Ask before committing or pushing.

**What the GM provides:**

| What | Where | When |
|---|---|---|
| Mannequin silhouette (spec §7a, queued in `dev/icons/MISSING.md` §D) | `icons/doll/mannequin.png` | before P5 — P3 runs on a placeholder |
| Icons for the five vendor-trash weapons | the agent queues them in MISSING §A (batch 42 — batch 41 is already full); the GM's generated grid goes to `dev/icons/in/` per `dev/icons/Pipeline.md` | after P4 creates the items |
| *Optional:* top-down ground art for weapons | `vfx/<item id>.webp` (MISSING §B) | any time — the sheet icon is the fallback |
| Foundry closed | — | each pack rebuild (P4) |
| A second browser logged in as a player | — | P4 live check of drop and pick-up through the relay |
| Go-ahead for the clear-equipped migration | — | P1, between sessions |
| *Optional:* a look at the vendor-trash stats | `scripts/wkk/config/weapons-data.mjs` | P4 |

## 17. Implementation (2026-10-03)

### What shipped

| Phase | Files | Verified |
|---|---|---|
| P1 Model | `actors/doll-model.mjs` (pure), `actors/doll.mjs` (funnel, intercepts, use gate, migration), `wkk/config/doll-kobalt.mjs`; belt ported onto `slots` (`actors/handy-items.mjs`); Oszczep world copies → `biala` (world item + Zbrojownia, D30) | Quench `lalka` — whole suite green except the `sztuczki` pack-coverage drift (needs the rebuild) |
| P2 Rules | `combat/grip.mjs`; `weapons/fire-modes.mjs` (DS one-handed), `combat/melee-maneuvers.mjs` (Wytrącenie, grapple occupant), `config/validation.mjs` (use gate), free-hand pills (belt, speedloader, Medyk); ability keys Stalowy nadgarstek, Pulp Fiction, Siekierezada, Mam pod ręką | layer-4/5 tests on a scratch actor; registry entries updated |
| P3 Doll UI | `actors/doll-panel.mjs`, `actors/doll-rows.mjs`, `config/doll-anchors.mjs`, `icons/doll/mannequin-placeholder.svg`, CSS; dock in `sheet-shell.mjs` via `dollSheetMixin` | live on TESTER: 2560 and 1366 px (emulated), play and edit mode, click-to-draw, tile→tile swap, remembered open state |
| P4 Ground | `actors/ground-items.mjs`, `weapons/thrown.mjs`, `combat/drop-on-fail.mjs`; `dropsAs` + „Poddaj się!" in `dev/bestiary/gen_bestiary.py` (data module regenerated); five vendor-trash weapons; settings `npcDropsAtZero`, `darmoweUpuszczanie` | live as GM: drop, „Na ziemi obok", pick-up to pack and to a free hand, Szeryf at 0 PW (three catalog guns, D37 rounds), thrown spear and a thrown knife stack (3 → 2) |
| P5 Art | `icons/doll/mannequin.webp` (from the GM's `dev/icons/dolls/mannequin.fw.png`, 800×1600, 43 KB), anchors in `config/doll-anchors.mjs` measured from the alpha mask (crown, shoulders, waist, crotch, knees, palms, feet rows) | live screenshot; GM sign-off 2026-10-03 |

### Calls made at implementation (D28, D31)

- **Czołówka goes to Głowa on Equip.** §4 sends a Latarka to the head only when dragged; a
  headlamp is a head strap by name, so that is its obvious slot. Hand and shoulder lights follow §4.
- **Pochodnia is hand-only** — no scabbard for a lit torch; unlit it is a stick in the pack.
- **A displaced belt or holster piece first takes a free slot of its own group**, then the pack —
  D5's "slides out" keeps it at hand instead of punishing the player with an Akcja.
- **Auto-adding to a full belt (the ✋ / sack button) still refuses** with the list of what is on
  it; there is no victim to pick. Dropping onto an occupied belt slot swaps (D5).
- **Belt items keep their own `equipped`.** Ammo, grenades, Leki and tools gain nothing from it.
- **The activity backstop only gates attacks and fire modes.** D8 is about attacking from a
  hand; reload, magazine swap, batteries, refuel and engine start work wherever the item is.
- **No leader lines for the racks.** Anchors for belt and hips exist; lines from the rows below
  the figure crossed the hand column.
- **Reach is 1.5 m from the token's edge** (2.25 m centre-to-centre for a medium token) — on
  gridless scenes the diagonal neighbour is already 2.1 m from the centre. Landing spots sit on a
  circle just outside the token.
- **Narrow screens:** when the panel fits on neither side, opening it nudges the sheet right once
  (never on drag, so it does not fight the player).
- **Picking up** goes to a free hand when the item is held in a hand, else to the pack.
- **`dropsAs` is resolved at runtime** from `config/bestiary-data.mjs` by the feat's
  `bestiary.creature`/`entryId`, so NPCs imported before the change drop too, and
  `build-packs.mjs` did not need touching. **Szabla (Cyngiel) added** — an exact catalog name
  the §9 count missed.
- **Thrown weapons** were decremented twice (dnd5e on the thrown attack roll, and the old
  `thrown.mjs` on use). Now `dnd5e.rollAttack` neutralises dnd5e's decrement and the piece lands
  at the target; without a GM or a token it falls back to dnd5e's own decrement.
- **„Poddaj się!"** gets a save activity from the generator (needs the pack rebuild); until then,
  and for NPCs imported earlier, `drop-on-fail.mjs` injects the save button on the feat's card.
- **Grapple as a hand occupant** was cheap (D28): a successful Pochwycenie fills a free hand of the
  attacker; removing the target's Grappled status (any client, the active GM writes) frees it; × on
  the doll releases it too.
- **Vendor-trash stats** (D36): 1k4–1k6, no or minimal properties, cheap — in
  `wkk/config/weapons-data.mjs` for the GM to review. Their ids equal the bestiary attack slugs.

### GM review round (2026-10-03)

- **Name.** Players see **Oporządzenie** (a soldier's load-bearing kit: belt, holsters, pouches),
  never "Lalka" — the panel legend, the toggle, notifications, item notes, Sztuczki coverage
  texts, `docs/Kobalt.md`. Code, files, the API (`game.neuroshima.lalka`) and the plan keep
  "doll"/"lalka".
- **Stack badge = what is left in the pack, with a backpack icon** (the header belt and the
  panel). "×2" read as "two on the belt" (the belt's earlier call), "+4" read as "there are 4"
  (a Molotov report that was no data bug). Throwing the piece that sits on the belt empties that
  slot — pieces are pieces (§14); the pre-doll belt clamped to `min(belt, quantity)`, i.e.
  silently refilled itself from the pack. Deliberate: refilling costs an Akcja.
- **No crossing lines.** Each column takes the body parts of its own half, top to bottom
  (left: Hełm, Twarz, Ochr. rąk, Prawa ręka, Strój; right: Głowa, Ramię, Pancerz, Lewa ręka,
  Ochr. nóg); `spreadCells` puts each cell as close to its anchor's height as the column allows
  (isotonic regression, no overlap); anchors re-measured on the mask, row by row. Hands are a
  size larger with a gold frame and label.
- **Drop hints.** Dragging an item of the character (inventory row, header belt, tile) lights the
  slots and racks of its family on that character's open panel and dims the rest. Cleanup is
  the point: `dragend`, any `drop`, the first pointer move / click / Esc after the drag (the
  browser sends no mouse events while dragging) and a 1.5 s watchdog without `drag`/`dragover`
  — `dragend` is lost when the source re-renders mid-drag. Listeners in every detached window too.
- **Sound.** `sounds/misc/equip.ogg` (Freesound #518850, CC0, `dev/audio/FREESOUND_MISC_SOURCES.md`)
  on every funnel move that lands on the body or in the pack, and on pick-up. Heard by the one
  who moves and by active player-owners of the character (GM moves a player's gear → the player
  hears it), nobody else; `interface` channel. Silent: normalisation, involuntary moves, Quench runs.
- **Open/close animation.** Slides out from under the sheet's edge and back; rolls up together
  with the sheet when the sheet closes (core's 0.25 s). No `prefers-reduced-motion` gate — core's
  window animations have none, and with Windows animation effects off the panel was the only
  thing that did not move. The infinite pulse of the drop hint does honour it.
- **Toggle.** A vertical tab "OPORZĄDZENIE" under dnd5e's tab strip, outside its frame — it is
  not a page of the sheet but a drawer next to it. The header button is gone.
- **Detached sheets (v14 "Detach Window").** The panel is the sheet's child (`renderChild`), so it
  follows the sheet into the popup and back. In the popup the window grows left by the panel's
  width and the sheet moves right by as much (stays put on screen); closing the panel gives the
  room back. Measuring, frames and observers use the panel's own window.
- **Migration D9 applied** (40 changes, 14 characters). It now skips items that already have
  slots — placements made through the funnel since the roll-out stay — so re-running it is a no-op.
- Not ours, seen while testing: dnd5e appends a second attunement counter (⚙ 0/3) to a sheet when
  it is detached (`_renderAttunement` appends on every `_onRender`, and core re-runs it on the move).

### Open

| What | Who |
|---|---|
| ~~Pack rebuild~~ — done 2026-10-03: `diff-packs` vs HEAD shows exactly `sztuczki` (Pulp Fiction / Siekierezada coverage, Oporządzenie texts), `bron` (+5 WKK weapons), `pancerze` (`armorId`), `bestiariusz` (Szeryf's „Poddaj się!" save + effect) from this plan | — |
| ~~Relay with a real player client~~ — done 2026-10-03 as Sonk (Raynald): equip from the row, drop from the panel menu → the GM's tile (gun + magazine), „Podnieś [I]” → back in hand with the magazine re-linked and its 14 + 1 rounds; the GM moving Raynald's gear plays the click on Sonk's client. A player's Wytrącenie on a target they don't own stops at „Rozstrzyga MG” before any roll (pre-existing for all three maneuvers), so the doll never needs a relay there | — |
| ~~Sign-off on the wired mannequin art~~ — signed off 2026-10-03 | — |
| Vendor-trash icons — `dev/icons/MISSING.md` §A batch 42 | next icon grid |
| Not automated, deliberately: Alpinista free-hand note (no climbing flow to hang it on), Siekierezada TT +1 with two hatchets, kits (D24), NPC opt-in UI (§10) | later |
