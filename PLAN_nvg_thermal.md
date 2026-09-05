# PLAN — Noktowizja / Termowizja goggles (NVG & thermal)

Status: **DRAFT** — architecture proposed, no code yet. Unlike `PLAN_kobalt.md`, there is no
`docs/*.md` RAW rule this patches: `neuroshima_5e_modifications.md` has no NVG/thermal mechanics
at all. The only prior art in this repo is two inert stubs:

- `scripts/config/addons-data.mjs` — `noktowizor`/`termowizor` **weapon addons** (SM-rail scope
  attachments, `applyMode: ["flag-only"]`, `grantProperties: []`) — the flag exists, nothing
  reads it. `ARCHITECTURE.md` §"Addon catalog" already lists both as `vision hook` TBD.
- `icons/items/loot/{noktowizor,termowizor}_gogle.png/svg` — icon art for **standalone goggles**,
  generated in the batch-38 icon pass, with no backing item.

**Decision (locked from GM):** build goggles first — headworn, always-on while equipped, drives
general exploration/tactical vision. The weapon-mounted scope addon (only useful while aiming
that specific gun) is explicitly out of scope for this pass; §7 notes how it plugs into the same
plumbing later without a rewrite.

## 1. How other systems do this (survey)

Every tactical-ish system that bothers with NVG/thermal at all converges on the same split, and
it maps cleanly onto Foundry's own primitives:

- **Light amplification (NVG)**: passive, needs *some* ambient photons to amplify — useless in
  absolute pitch dark, which is the one weakness parties learn to exploit (a truly lightless room
  still blinds an NVG wearer). Visually: monochrome green, high gain/bloom on any strong light
  source. *(Alien RPG, Twilight 2000, most modern-military modules.)*
- **Thermal**: active-independent of light entirely — works in total darkness, defeated by
  climate control/insulation rather than by darkness or camouflage, sees *through* smoke/foliage
  a bit, sees *through* strict visual concealment. Visually: false-color or monochrome heat map,
  flat/undifferentiated background, living targets stand out.
- Neither is ever modeled as a flat "+2 to Perception" — they're modeled as **a different way of
  seeing**, i.e. a distinct vision/detection layer layered on top of (or replacing) normal sight,
  exactly the split Foundry's engine already has as first-class concepts (see §2). This project's
  own `detection-termowizja.mjs` already picked this modeling for monsters — goggles should reuse
  it verbatim rather than invent a parallel "thermal for PCs" concept.

## 2. The engine already ships 90% of this — key finding

Foundry core (`client/config.mjs`) ships `CONFIG.Canvas.visionModes.lightAmplification` —
literally built for NVG: green tint (`[0.38, 0.8, 0.38]`), exposure boost, and it remaps lighting
levels (`DIM→BRIGHT`, `BRIGHT→BRIGHTEST`) while requiring *some* background light to be present
(`LIGHTING_VISIBILITY.REQUIRED`) — i.e. it already refuses to do anything in a zero-light room,
which is the exact "weakness" survey systems all give NVG. **No new shader code needed for
Noktowizor** — just assign this existing mode.

There is no built-in `thermal` VisionMode, but this repo already built the other half:
`scripts/config/detection-termowizja.mjs`'s `DetectionModeTermowizja` (id `neuroshimaTermowizja`)
— blocked by walls, ignores the Niewidoczność status, goes dark if the sensor is blinded, and
renders a hot-orange outline (`OutlineOverlayFilter`) on anything it spots. That's a
**DetectionMode**, currently wired only onto Bestiariusz creatures' `prototypeToken`. Termowizor
goggles are the same mode, added to a *player's* token instead of a monster's — no new detection
logic, just a second place that adds the same mode id to a token's `detectionModes` array.

Foundry keeps these as two independent, stackable layers:

| Layer | Question it answers | Existing primitive |
|---|---|---|
| **VisionMode** (`token.sight.visionMode`) | "What does the whole canvas look like from this token's POV?" (tint, exposure, which lighting tiers count as visible) | `lightAmplification` (core, ready-made) for Noktowizor |
| **DetectionMode** (`token.detectionModes[]`) | "Can THIS token see THAT specific target?" (independent of general vision — sees through walls? through invisibility?) | `neuroshimaTermowizja` (this repo, already built) for Termowizor |

Termowizor needs *both*: a custom thermal VisionMode (background flattened/desaturated — no
built-in exists, ~20 lines modeled on `lightAmplification`'s shape, see §4) *and* the existing
`neuroshimaTermowizja` DetectionMode for the "sees through concealment" behavior and the shared
hot-orange outline. Noktowizor needs only the VisionMode — it's not a *detection* upgrade, just a
better-lit picture of what normal sight already sees.

## 3. Answering the specific questions

- **Does the player see an overlay?** No separate HTML/DOM overlay — it's a canvas-level
  colorization tied to whichever token is the current **vision source** (the controlled token).
  This is *already* per-viewer for free: in a multiplayer table, each player normally controls
  only their own PC, so the moment their token's `sight.visionMode` differs, only *their* screen
  tints — nobody else's. A GM selecting that token to check their view sees the same tint; nothing
  bespoke to build.
- **How does the tactical map differ with NVG/thermal on?** For NVG: dim areas render as if
  bright, bright as if brightest, everything green-tinted — same map, same walls, same tokens,
  just re-lit. For thermal: background goes flat/desaturated (scenery has no useful heat
  signature) while living tokens get the hot-orange outline regardless of actual light level or
  concealment. Neither changes wall/fog-of-war logic — vision range and LoS still come from the
  same `walls: true` sight computation everything else uses.
- **Do we render tokens differently?** Only for thermal, and only by reusing what already
  exists: `DetectionModeTermowizja.getDetectionFilter()`'s hot-orange `OutlineOverlayFilter`,
  already shipping for monster-vs-PC thermal detection. A PC wearing Termowizor goggles gets the
  same outline on whatever *they* spot — one filter, two directions.
- **Do we just patch visibility rules?** Yes, for the "sees through camouflage/invisibility"
  half — that's precisely what a DetectionMode *is* in Foundry, so "patch visibility rules" and
  "add a DetectionMode" are the same action here, not two different things to build.

## 4. Proposed architecture (mirrors `light-sources.mjs` / `latarka.mjs`)

New file `scripts/items/vision-sources.mjs` — same provider/registry shape as `light-sources.mjs`,
sibling concept, deliberately not merged into it (a light source radiates light other tokens can
see; a vision device only changes what its *own* wearer sees — different write targets on the
Token document, `light` vs `sight`/`detectionModes`, and no reason to force one active-source
slot to cover both — see the exclusivity note below).

- `registerVisionProvider(fn)` / `syncActorVision(actor)` — same "ask every provider, resolve to
  one outcome, push to every active token for that actor" shape as `syncActorLight`. Resolution
  is simpler than light's brightest-wins merge: at most one vision-device item should be
  active/equipped at a time (see below), so "the provider that returns non-null" wins; two
  simultaneous non-null providers is a data bug, logged and resolved by priority order.
- Writes `{ "sight.visionMode": "...", "sight.color": ..., "detectionModes": [...] }` onto the
  actor's placed `Token.document`s — same category of write `_syncCompanionLight` already does
  for light, same GM-mediation question to check (unlike light's `AmbientLight` write, `sight`
  and `detectionModes` are fields on the token's own document, which an owning player can already
  update — confirm live before assuming a GM-only path is needed here, may not be).
  When no device is active, restore `visionMode: "basic"` and strip the goggle's detection mode
  id (never touch `neuroshimaTermowizja` entries a *monster* actor may separately own — filter by
  id, not by clearing the array).

New file `scripts/items/gogle.mjs` (name TBD — matches `latarka.mjs`'s file-per-item-family
convention), one item family, two catalog variants (`noktowizor`/`termowizor`), same skeleton as
`latarka.mjs`:

- `_baseSystemData()` / `initializeGogle()` — same `uses: {max:"", spent:0, recovery:[]}` fix
  already applied to Latarka/Pochodnia, so this doesn't reintroduce the ładunki bug on day one.
- `turnOn()`/`turnOff()` activities (or a single `equipped` toggle, since goggles are worn, not
  switched — TBD, see open questions) call `syncActorVision(item.actor)`.
- `registerPowerSource({ test: isGogle, describe })` — reuse `power-source.mjs` verbatim: same
  quantity-lock-to-1, same on/off actor-sheet badge, same charge-percentage model `latarka.mjs`
  uses for its battery. No new power paradigm to design.
- `exclusiveWith` between the two variants (already declared this way for the weapon addons in
  `addons-data.mjs` — carries over unchanged: you wear one pair of goggles, not two).

`scripts/config/detection-termowizja.mjs` needs **no changes** — `TERMOWIZJA_ID` is already
exported and already registered at `init`; `gogle.mjs` just imports the id and adds it to the
token's `detectionModes` array with a goggle-appropriate range (a fresh number to pick — likely
shorter than a Bestiariusz apex predator's innate sense, see open questions).

New compendium entries land in the `sprzet` pack (just split out for Latarka/Baterie) — thematically
the same "utility, not weapon" bucket.

## 5. Custom Termowizor VisionMode (the one genuinely new bit of code)

No core equivalent exists, but the shape is a short `VisionMode` definition modeled directly on
`lightAmplification`'s (see `client/config.mjs:1250`), inverted where thermal's rules differ from
NVG's:

- **No `LIGHTING_VISIBILITY.REQUIRED`** on background — thermal must work in zero ambient light
  (`darkness: { adaptive: false }`, same as `monochromatic`/`blindness` use to opt out of the
  light-driven pipeline entirely).
- Desaturate hard (`saturation: -1` or close) so scenery goes flat — the "cold" backdrop thermal
  cameras show — leaving the hot-orange `OutlineOverlayFilter` on detected tokens (§2) as the only
  color information, matching real thermal-camera framing (monochrome scene, false-color subject).
- Registered the same way `registerTermowizja()` registers its DetectionMode: a `registerSettings`-
  adjacent `registerTermowizorVision()` called from `main.mjs` at `init`, guarded in a `try/catch`
  the same way (canvas perception classes aren't available before the client bundle evaluates).

## 6. Open questions (need a GM call before implementation)

1. **Toggle model**: an on/off Activity like Latarka's ("Włącz"/"Wyłącz"), or does simply
   *equipping* the item (dnd5e's native `equipped` flag) turn it on? Goggles aren't something you
   click a switch on mid-fight the way a flashlight is — equip/unequip may be the more natural
   trigger. Affects whether `gogle.mjs` needs its own Activities at all.
2. **Interaction with the "one active light source" rule** (`enforceSingleLightSource`,
   `light-sources.mjs`): NVG and a lit flashlight/torch in the same eyeline is a real bloom/
   whiteout hazard in reality. Recommend: goggles get their **own** independent slot (not folded
   into the light-source exclusivity — a passive sight aid isn't a light source), but *optionally*
   force-disable Noktowizor specifically if the wearer's actor has an active bright light source
   (self- or ally-sourced) — a Kobalt-style home-rule call, not an engine constraint. Termowizor
   has no such conflict (heat-blind, not light-blind).
3. **Range/price/weight/battery-drain numbers** — no RAW baseline exists to anchor these (unlike
   Kobalt's rules, which patch documented numbers). Proposing placeholders for GM sign-off once
   the above is locked, rather than guessing balance numbers unprompted.
4. **Detection range vs. Bestiariusz creatures' innate Termowizja** — should goggle-thermal have
   the same range ceiling apex predators get, or a shorter "man-portable optic" range? Affects
   whether `neuroshimaTermowizja`'s registration needs a per-token range override (already
   supported — `detectionModes: [{ id, enabled, range }]` takes range per-entry) or a second mode
   id entirely for a different filter/range profile.

## 7. Deliberately out of scope this pass

- The weapon-mounted scope addon hook (`addons-data.mjs`'s `noktowizor`/`termowizor`, "vision
  hook" in `ARCHITECTURE.md`) — same underlying `syncActorVision`/VisionMode/DetectionMode
  plumbing would drive it later (only while that weapon is wielded/aimed, not always-on), but
  it's a distinct trigger condition and UX from headworn goggles. Not a rewrite when it happens,
  just a second provider registered against a different condition.
- Squad-shared thermal feeds, a colorblind-alternate tint setting, and any UI settings menu —
  none requested, none implied by existing patterns.
