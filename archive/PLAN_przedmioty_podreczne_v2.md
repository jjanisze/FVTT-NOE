# PLAN — Przedmioty podręczne v2: the belt as a first-class sheet element

> **Status (2026-09-25): v2.0 implemented** — `actors/handy-items.mjs` (model),
> `actors/handy-belt.mjs` (header strip). What shipped and what is left: §13. The sections below
> are the design as reviewed; where the GM decided differently from a recommendation, §13 says so.

## 0. What exists today (v1)

`actors/handy-items.mjs`. Mechanically complete as of 2026-09-24:

- Limit **3** (RAW, *Tworzenie postaci*), shared by magazines, grenades and Leki.
- Counted in **pieces**: the item flag `atHand` is the number of pieces of that stack on the belt
  (7× Relanium can be 2 on the belt + 5 in the pack). A magazine is always quantity 1.
- Consumption comes off the belt first (`preUpdateItem`); chat cards say "podręczny" /
  "z plecaka" (RAW: from the pack "zazwyczaj jedna akcja" — flagged, never blocked).
- The only UI: a ✋ button (+ count) in each Zasoby row, and a `2/3` counter in the magazine
  panel's header. **You cannot see what is on the belt without reading three panels.** That is
  the problem v2 solves.

## 1. Goals (GM, 2026-09-24)

1. The belt is a **first-level** element of the sheet, possibly **always visible** (like HP).
2. It is **immediately obvious** what is on the belt — no scanning the inventory.
3. Adding/removing by **dragging into and out of** a belt slot.
4. **Kamizelka taktyczna** (WKK now, possibly official later): +1 slot, light armour only.
5. Favourites are the closest existing paradigm — reuse them, or replace them?

## 2. Where it lives — the measurement that decides this

The dnd5e sidebar is **not** a fixed column. It scrolls together with `.main-content` (the
only scroller, 712 px visible in an 885 px window). At the top of the scroll:

| Block | y (px from window top) |
|---|---|
| portrait | 180–480 |
| stats (AC, HP at 589) | 480–692 |
| death tray | 620–710 |
| Stan panel (ours) | 722–843 |
| Ulubione | **868** — already below the fold |

So "always visible like HP" is not a property the sidebar has: **HP itself scrolls away** the
moment the player scrolls the inventory, and anything placed after Stan starts off-screen. A
belt in the sidebar would be the least visible thing on the sheet.

**The header does not scroll.** It is 798 × 170 px on every tab, and under the name/class line
(left column, x 49–495) there is a free strip about **446 × 40 px** (y 128–170).

**Recommendation: the belt is a strip of slot tiles in the header**, under "PIEKARZ / BRUTAL 3".
Visible on every tab, at any scroll position, with the sidebar collapsed or not. It is also a
drag target that is always on screen — dragging from the Zasoby tab to a sidebar panel that has
scrolled away would not work at all.

Alternatives considered:

- *Sidebar panel above Stan, and make the sidebar sticky.* Changes the whole sheet's scroll
  model (a 300 px portrait pinned in place); the 800 px minimum height cannot hold portrait +
  stats + belt + Stan without an inner scrollbar anyway. Rejected unless the GM wants the
  sidebar reworked for other reasons.
- *Sidebar panel, not sticky, right under HP.* Cheapest; visible only while scrolled to the top.
  That is the "favourites" level of visibility, which is exactly what the GM called
  insufficient.
- *A sticky bar at the top of the right-hand column.* Always visible too, but it sits between
  the tab strip and the content and pushes every tab down by ~40 px; the header strip costs no
  space because it is empty today.

## 3. Favourites: reuse, replace, or neither?

**Neither the data nor the component — only the visual language.** Reasons:

- *Different semantics.* Favourites are an unbounded, ordered list of **anything** (items,
  activities, effects, skills, tools, spell slots). The belt is a **bounded set of slots** for
  three item families, counted in pieces. The limit is the whole point of the rule, and a list
  cannot show a limit; boxes can (three boxes, one empty — no counter to read).
- *Favourites still have a job.* Piekarz's only favourite today is the Obrzyn — i.e. players
  use favourites for **weapons and abilities**, which the belt does not cover. Replacing them
  would take that away.
- *dnd5e owns favourites end to end* (`system.favorites`, `_prepareFavorites`, `_onDrop` routed
  on `.favorites`, `addFavorite`/`_onSortFavorites`). Hijacking that storage for pieces-on-belt
  would fight the system on every dnd5e update. Our own data (the `atHand` count) already works.

What we **do** reuse: the favourites' figure/icon treatment, the hover `×` "remove" control, and
the drop-zone affordance ("DROP FAVORITE" → "UPUŚĆ NA PAS").

A related RAW concept worth naming now, not building: *"Jednocześnie możesz mieć pod ręką
maksymalnie cztery egzemplarze broni białej"* / *"trzy egzemplarze broni dystansowej"*. That is
the same shape — a bounded "pod ręką" shelf — for weapons. Build the belt component generic
(capacity + candidate predicate + tile renderer) so a weapons shelf could reuse it later.

## 4. What the strip looks like

```
 PIEKARZ
 BRUTAL 3
 ┌PAS 3/3──────────────────────────────┐
 │ [💉] [💣] [💣]                        │     ← filled: item icon, caption underneath
 │ Relan. ×2  18/30                     │
 └─────────────────────────────────────┘
```

- **One tile per piece**, not per stack. Two Relanium on the belt are two tiles. The belt is
  three *things*; the picture should be three things.
- Tile ~34 px, dark translucent backing (the header sits on portrait art — contrast is a real
  risk; verify on the lightest portrait in the party).
- **Caption per tile carries the one number that matters in combat:** magazine → rounds
  (`18/30`); lit Molotov → rounds left before it bursts (flame badge, same as the Zasoby row);
  multi-dose Leki → doses left in the open package; otherwise nothing.
- **Empty slot:** dashed outline, `+` glyph; tooltip names the three families.
- Header label `PAS 2/3`; tooltip lists capacity sources (`3 — RAW`, `+1 — Kamizelka taktyczna`).
- Icons do the recognising — so every belt candidate needs a **distinct** icon. Grenades and
  Leki have them; **magazines mostly share per-type art** (`mag_assault_rifle.svg` for several
  models) → magazine tiles need the caption, and the tooltip must name the weapon.
- Name, full stats and provenance in the tooltip (the dnd5e item tooltip, `item-tooltip`).

## 5. Interactions

| Gesture | Effect |
|---|---|
| **Drag** a row from Zasoby/Ekwipunek **onto the strip** | +1 piece to the belt (refused with a toast naming the slots in use if full, or naming the three families if the item cannot be on a belt) |
| **Drag a tile off the strip**, anywhere else on the sheet | −1 piece back to the pack |
| Hover `×` on a tile | same as dragging it off (touchpads, precision) |
| **Click** a tile | the item's primary action: grenade → throw (Molotov → light, then throw — same state machine as the row); Leki → take; magazine → reload the weapon it fits (picker if more than one) |
| Shift+click | open the item sheet (same as the rows) |
| Right-click | small context menu: Użyj / Odłóż do plecaka / Otwórz |
| ✋ in the Zasoby rows | **kept** as the secondary path (click +1, right-click −1) — cheap, already shipped, and dragging is worse on a trackpad |

Drag implementation notes (verified in dnd5e source, not live yet):

- Our Zasoby rows are injected **after** dnd5e binds its `DragDrop` (`render*ActorSheet` fires
  after `_onRender`), so they are not draggable today. They need `draggable="true"` and a
  `dragstart` writing the standard `{type: "Item", uuid}` payload — then dnd5e's own targets
  (another actor, the item directory) keep working for free.
- Drops on the strip: listeners on the strip element itself that `preventDefault` +
  `stopPropagation`, so dnd5e's sheet-level `_onDrop` (which would treat a same-actor item drop
  as a *sort*) never sees them. Keeps the sheet subclass anaemic, as `PLAN_sheet_shell.md` §2
  decided.
- Drag-off: the tile's payload carries `neuroshima: {fromBelt: true}`; a capture-phase drop
  listener on the sheet root handles it before dnd5e and stops it. Dropping outside the sheet
  (canvas, sidebar) does **nothing** — `dragend`'s `dropEffect` is not reliable enough to treat
  "dropped nowhere" as "put away".
- Dropping an item from **another actor or a compendium** onto the strip: dnd5e creates it in
  the inventory as usual, then +1 on the belt. **Phase 3**, not needed for v2.0.

## 6. Capacity and the tactical vest

- `HANDY_LIMIT` (a constant) becomes `handyLimit(actor)` = `3 + bonus`. Every call site that
  reads the limit goes through it (the ✋ tooltip, the counter, `setBeltCount`).
- Bonus source: an item flag `handySlots: 1` on the vest, counted only when the vest is
  **equipped** and the armour condition holds (§10). A pure function
  `handyCapacity({ equipped, armorType })` → testable in layer 4.
- **Losing capacity never drops anything.** Taking the vest off with 4 pieces on the belt shows
  the 4th tile in red ("nadmiar — 4/3"), blocks adding, and leaves the call to the GM — the
  module's doctrine (flag, don't enforce).
- The vest itself is WKK (`scripts/wkk/`), so the icon is in `dev/icons/MISSING.md` class A.

## 7. Data model — unchanged

The `atHand` count on the item stays the single source of truth; the strip is a pure function
of it (`beltTiles(actor)` → `[{item, index}]`, one entry per piece, stable order: family, then
name). No actor-level slot array: slot *position* has no rule attached, and a second copy of
the truth would need syncing on every quantity change. Tile order is therefore not
player-arrangeable in v2.0 **[GM — do players need to arrange tiles?]**.

## 8. Fixes that ride along (found while planning)

1. **A magazine loaded into a gun still takes a belt slot.** `swapMagazine` never clears
   `atHand`, `handyCount` does not exclude a hosted magazine, and the weapon's own sheet labels
   its loaded magazine "· podręczny". In fiction the magazine left the belt when it went into
   the gun. Fix: inserting clears the belt count; an ejected magazine goes to the pack (or, if
   the GM prefers, back to the belt when a slot is free) **[GM]**. Verified by reading the code;
   no live case exists right now (no actor has a magazine on the belt).
2. **The reload picker labels belt magazines but does not sort them first.** It should — the
   belt is the fast path.

## 9. Later phases (not v2.0)

- **NPC sheet.** The NPC header is laid out differently; bestiary NPCs do carry grenades.
  Same component, placement to be measured.
- **Party sheet** (`PLAN_party_sheet.md`): every PC's belt as a row of icons — the GM sees the
  whole party's belts at a glance.
- **Token HUD / combat quick-use**: in combat the player acts from the token, not the sheet.
- Foreign drops (§5) and a weapons "pod ręką" shelf (§3).

## 10. Open questions for the GM

1. **Header strip** (recommended) vs sidebar vs sticky bar — §2.
2. **Vest and armour:** is Kamizelka taktyczna (a) its own light-armour item (occupies the armour
   slot, its own AC), (b) worn *together with* light armour or no armour, or (c) a property of
   armour — note RAW's **Plate carrier typ I/II** are light armour described as "kamizelka
   nośna", i.e. already a vest with pouches. With (c) they could simply carry the +1.
3. May the belt hold **more than the three RAW examples**? RAW says *"np. medpak, granat czy
   zapasowy magazynek"* — "np." makes the list illustrative, but v1 closed it on purpose. With
   drag-and-drop players *will* drag a flare, a kolczatka, a throwing knife. Recommendation:
   keep it closed, open item by item through an explicit catalog flag (`handy: true`), never
   "any small item".
4. Magazine ejected from a gun — pack or belt? (§8.1)
5. Player-arrangeable tile order? (§7)

## 11. Implementation phases

1. **Core, no UI** — `handyLimit`/`handyCapacity`, `beltTiles`, the magazine-insert fix, reload
   picker ordering. Tests: layer 4 (capacity with/without vest × armour types; tile expansion
   from stacks), layer 5 (a hosted magazine does not count).
2. **Header strip** — render, click/shift/right-click, `×`, tooltips, drag in/out, draggable
   Zasoby rows, CSS (`npm run validate:css`). Live verification at 800 px on at least two
   portraits (light and dark art), and with the sidebar collapsed.
3. **Vest** (WKK) once §10.2 is decided; icon from MISSING.md.
4. Later phases from §9.

## 12. Risks

- **Header contrast** on light portrait art (tiles need their own backing).
- **Long names/classes**: the strip sits under the class line; a two-line class label would
  collide. Measure on the longest PC name (Raynald of Châtillon).
- **dnd5e drop routing** changes between versions; the strip's listeners are the only coupling
  point, keep them in one function.
- Magazine icons are not distinct enough to recognise without the caption (§4).

## 13. Decisions (GM, 2026-09-25) and what shipped

**Decided:**
- Header strip — yes ("if I don't like it, we'll move it"). Podręczne rank above Ulubione:
  a mechanic beats a sheet convenience, and a bounded list goes before an unbounded one.
- "Always visible" meant *prominent, no significant scrolling* — scrolling it away is fine.
- Favourites: inspired by, not reused.
- **Vest = a WKK variant of light armour with pouches**, pricier and heavier — not a separate
  garment. Shipped as `kamizelka-taktyczna` (`wkk/config/armor-data.mjs`): Plate carrier typ I
  base, TT 12, 6 kg, 90 gb, 30 %, `handySlots: 1`. Icon queued in MISSING.md (class A, row 1).
- **Eligible items: anything RAW expects to be used in combat** — the description references
  Akcja, Akcja Bonusowa or Używanie. Tools count ("a fancy toolbelt" abstraction).
- **Ejected magazine → straight into the pack.**
- **Players reorder tiles** — first-level UI, used before every fight; it has to feel good.

**Shipped (v2.0):**
- Data: `atHand` is now a list of slot positions per item (§7 revised — order had to become
  player-controlled, and positions on the item keep one source of truth). v1 counts/`true`
  read as unplaced pieces.
- Strip in the header of the character sheet: one tile per piece, captions (magazine rounds,
  lit-Molotov rounds left, doses in an open package), `+N` = reserve left in the pack, dnd5e
  item card on hover, overflow in red when capacity drops.
- Gestures: drag a row (Zasoby panels and native Ekwipunek rows) onto a slot; drag a tile onto
  another slot to reorder (occupied → swap); drag a tile anywhere else on the sheet or `×` → pack;
  click → the item's primary action (grenade: light/throw, Leki: take, magazine: insert into the
  weapon it fits — speedloader: pour, tools/gear: the item's activities); Shift+click → sheet;
  right-click → menu; Enter/Space on a focused tile → use.
- Consumption from a clicked tile removes *that* slot (`withConsumeHint`).
- Families from the RAW scan: magazines, grenades, Leki, **all `tool` items**, and gear the
  module can identify (Kolczatki, Flara, Sprzęt do wspinaczki) + opt-in flag `handy: true`.
- Fixes from §8: inserting a magazine takes it off the belt; a magazine loaded in a gun cannot be
  put on the belt; the reload picker lists belt magazines first; the swap card's provenance is
  captured before the swap.
- Tests: layout, hinted consumption, capacity, swap, vest on a real actor (474/474).
- Verified live on Piekarz/Carson at 800 px, play and edit mode: every gesture above, the item
  card tooltip, a Medpak used from a tile (slot emptied, "podręczny" on the card).

**RAW scan (Ekwipunek chapter), for the record.** Qualify: all explosives, magazines and
Szybkoładowarka, all Leki, every toolkit/instrument (each has "Używanie:"), and from Różności:
Gwizdek, Kolczatki, Koc gaśniczy, Kwas, Kulki stalowe, Lina, Łańcuch, Nafta, Palnik, Sieć,
Sprzęt do wspinaczki, Środek usypiający, Środki czyszczące, Staza, Trucizna. Do not qualify:
Kompas and Wykrywacz metalu ("używanie" = usage, not the action), Latarka (no action),
armour/shields/helmets/weapon mods (worn or mounted), weapons (RAW "pod ręką" limits).

**Resolved after v2.0 (2026-09-25):**
- Old Roll20 vests (Buźka, Kluczyk) — gone with the Jazda Próbna alpha purge (those six
  pre-gens used NOE public-alpha items; GM: purge them). Backup:
  `Neuro 5e/Integracje/backups/jazda-probna-alpha-items-2026-09-25.json`.
- Kwas — real RAW item now (`items/kwas.mjs`): native dnd5e save activity (1 target within 6 m,
  DEX save DC 8 + DEX + prof, 4d6 acid, nothing on success), `handy: true`. Raynald's ten
  hand-made "Fiolka Kwasu" surowce replaced by one (the original Roll20 world had one).
- **Latarka: not a belt item** (GM). You strap it to your head or hold it; a precious slot
  should not go to it, and RAW gives it no action anyway.

**Open:**
- Most Różności from the scan do not exist as module items; they need catalog entries with
  `handy: true` when they are made.
- No UI to set `handy: true` on an arbitrary item yet (console only).
- Later phases (§9): NPC sheet, party sheet, token HUD, drops from other actors/compendia.
