# WKK — "W Kolorze Kobaltu"

This folder is the exclusive home for content that is **not** in the *Neuroshima Ostatnia Era*
rulebook. Everything else in `scripts/` is NOE: a straight translation of the book, reusable by
any table running this module regardless of house rules.

## The classification rule

> If it's in the RAW textbook, it's NOE. If it's not, it's WKK — no exceptions, including for
> content that patches a broken engine default or is player-specific ephemera. If a RAW item's
> numbers were house-ruled for this campaign, it's an NOE item with a WKK override.

This was a hard binary, decided directly by the GM (2026-09). It grew a **third, narrow bucket**
in 2026-09-22 — see below. Two cases that might look like exceptions and aren't:

- **Content with no RAW equivalent is still 100% WKK**, even when it exists to work around a
  broken engine default rather than to add homebrew flavor. Pochodnia (`items/pochodnia.mjs`)
  replaces dnd5e's stock Torch, whose 40ft attack-template AOE is broken — but RAW states no
  torch stats, damage, range, fuel, or construction requirements at all, so there is nothing to
  fall back to. The "NOE equivalent" of Pochodnia without WKK is "GM, go make one up."
- **Player/character-specific ephemera is still WKK**, not some other tier. Lorentz's rubber
  duck, Alan's pen, Laffitte's cane, Raynald's sword, his personalized disease variant, the
  Żeton Luxor casino chip — none of these are in the rulebook, so by the rule above they're WKK,
  full stop. Other tables who enable WKK will see this table's in-jokes; that's an accepted cost
  of keeping the rule simple rather than inventing a fourth bucket for "campaign-specific but
  still mechanical" content.

## The third bucket: RAI — mechanics from the system's author, unpublished

Added 2026-09-22, when `PLAN_magazynki.md` produced the first case the binary above could not
classify: a mechanic that is **not in the rulebook, but comes from the author of the system**
(credited in the module README, in consultation). Calling that WKK would file the author's own intent as this
table's homebrew; calling it NOE without a marker would present it as something a reader can
look up in the book.

**Rule:** RAI content lives in the **NOE tree** — it is the author's intent, so it is useful to
other tables running this module — but every such fragment carries an explicit comment saying
where it came from. It is **not** gated behind the Kobalt toggle and it does **not** go in
`scripts/wkk/`.

Currently nine entries — two from the magazine rebuild, one grenade-range ruling, one erratum,
one crafting ruling, the paper doll (a whole inferred system, listed as one row with its parts),
two Trudność Trafienia rulings (`PLAN_tt.md`) and one recovery ruling (`PLAN_m1_walka.md`):

| Mechanic | Where |
|---|---|
| Magazines split per weapon MODEL, not per weapon category | `config/magazines-data.mjs`, `magwellOf()` in `config/weapons-data.mjs` |
| No loading rounds into a removable magazine during combat | `weapons/magazine.mjs`, `_performLoadOneAction()` |
| Grenade throw range floor is 18 m — "minimum 9" applies to the modifier term, resolving the rulebook's own rule-vs-example contradiction | `actors/grenade-inventory.mjs`, `_throwRangeMeters()` (+ its copy in `wkk/items/flara.mjs`) |
| Cywil's Widły deal piercing damage — the October printing dropped the type (March had it) | `dev/bestiary/gen_bestiary.py`, `AUTOMATION["cywil.widly-tylko-farmer"]` |
| Spec profession recipe tables (NOE s. 80–84) apply **only to that profession** and stand **beside** the standard formula recipe, not instead of it; their tool requirement is the profession kit **and** the item's usual requirement (PLAN_produkcja D22, confirmed 2026-09-27) | `config/recipes-data.mjs`, `_zbudujPrzepisy()` |
| **Lalka** (`PLAN_paper_doll.md`, author's fill-the-blanks principle, 2026-10-02): slot geometry; hand ⟂ holster; Głowa / Twarz / Ramię / Strój and their 1-Akcja cost; devices needing a slot; auto placement and displacement; grip superposition (two-handed iff the other hand is empty); an Akcja to put something into the pack; free-hand notes for belt items; the ground as the destination of drops; power armour allowing a helmet; visibility modifiers not stacking; NPCs dropping weapons at 0 PW; the NOE rows of the `dropsAs` table; rounds in a dropped catalog gun (D37). Conscious deviation, cost-neutral: Noktowizor/Termowizor strapped on the head (RAW lists helmet mounting) | `actors/doll-model.mjs`, `actors/doll.mjs`, `combat/grip.mjs`, `actors/ground-items.mjs`, `dev/bestiary/gen_bestiary.py` (`AUTOMATION`, `dropsAs`) |
| **TT: one method, bonuses on top** (PLAN_tt D1/D2, 2026-10-03). "Only one way of computing TT" (s. 59) is read as: TT *methods* compete and the highest wins — 10 + ZRC, armour, Goła klata, Tarcza wiary (both "similar" clauses name other methods); fixed bonuses — Obłęd Berserkera, Kuloodporność, Obsługa pancerza, Zasłona, Tańczący z siekierkami, Roszada — stack with whichever method wins. So Obłęd stands beside Goła klata, and Tarcza wiary + Obłęd + Kuloodporność is legal | `config/tt-rules.mjs` (`TT_METHODS`, `TT_BONUSES`, `computeTT`) |
| **Ochraniacze are armour** in ability conditions (author, 2026-10-03, PLAN_tt D4): "they give a TT bonus and sit in the Pancerze table" — so they switch off Goła klata, Tarcza wiary, Obłęd and Kuloodporność and switch on Obsługa pancerza. A helmet or shield blocks an ability only where the ability names it ("Goła klata forbids the helmet because its text says so") | `config/tt-rules.mjs` (`_wearing`), `actors/tt.mjs` (`guards` in the snapshot) |
| **Leaving Krytyczny removes the Zranienie exhaustion** (author, 2026-10-06, PLAN_m1_walka D5): when the Stopień Zranienia drops from Krytyczny to Poważny by any path (Regeneracja, Pomoc medyczna, pips, token HUD, a deleted effect), every exhaustion level that came from the Krytyczny wound goes, if still there. NOE otherwise treats that level like any other (a Długi odpoczynek removes it); the WKK rule below makes it persistent until this exit | `combat/zranienie.mjs` (`setZranienie` → `_poZejsciu`), `config/rekonwalescencja-rules.mjs` (`REGULY_ZDEJMOWANIA.zranienie.wyjscie`, `warstwa: "RAI"`) |

### GM readings of RAW gaps (M3)

Not from the author, not homebrew numbers: the GM's reading of what the rulebook leaves unsaid, decided in
`PLAN_m3_towarzysze.md` (§6.1). They live in the NOE tree like the author's RAI — they fill a silence, they do not
change a printed value — and are listed here so a reader can tell what is not in the book. (The author's own
ruling from M3, D31 — a dead owner's companion becomes the player's spare character — has no code; it is in
`docs/Towarzysze-i-drony.md`.)

| Reading | Where |
|---|---|
| A drone at 0 PW is **Wyłączony** until repaired, not dead; Olbrzymie obrażenia destroy it (D7) | `combat/umieranie.mjs`, `combat/maszyny.mjs` |
| Deploying and folding a drone is an **Akcja** (D13) | `actors/drony.mjs` (handle activities) |
| A folded drone weighs 25 / 4 kg and costs 70 / 90 gb (walking / flying; price from production time, s. 145 — D21) | `config/towarzysze-data.mjs` (`zlozony`), `actors/drony.mjs` |
| Komenda and Steruj need the **controller in hand**; NPC operators are exempt (D22) | `actors/drony-sterowanie.mjs` |
| The creator is **frozen at build time** — PB, INT and name stamped on the drone (D23) | `actors/drony.mjs` (`stempelTworcy`), roll data `@tworca` |
| Emiter EMP and armour: a target with an armour note beside its TT defends with 10 + DEX, otherwise full TT (D27) | `weapons/emiter-emp.mjs`, `config/towarzysze-rules.mjs` (`ttCeluEmp`) |
| "½ poziomu" rounds down, minimum 1; "24 punkty" means the point-buy table | `config/towarzysze-rules.mjs` (`wartosciPochodne`, `kupowanieCech`) |
| A drone activation: **[B] — move, dodge, disengage, item; [A] — everything** (D36) | `config/towarzysze-rules.mjs` (`zakresAktywacji`), `actors/drony-sterowanie.mjs` |
| The homemade controller reaches 20 m through walls / underground (D32) | `config/towarzysze-data.mjs` (`KONTROLERY`) |

### GM readings of RAW gaps (M5)

Trade, the stop-over and expeditions (`PLAN_m5_postoj.md`). Same status as the M3 table: they fill a silence in the
book and stay in the NOE tree; the questions for the author are in `docs/Pytania-do-autora.md`.

| Reading | Where |
|---|---|
| One transaction = one approved exchange or one special order; trading hours = ⌈transactions ÷ PB⌉, a save per extra hour; a second search for the same item the same day is refused (D2, U6) | `postoj/handel.mjs`, `config/handel-rules.mjs` (`godzinyGamblingu`, `potrzebaRO`) |
| A trading post's stock: 2–3 goods groups chosen by the GM, each catalogue entry rolls its availability, plus staples (D29) | `config/handel-rules.mjs` (`generujTowar`), `config/handel-data.mjs` (`GRUPY_TOWARU`, `PODSTAWY`) |
| Price columns for armour, ammo, tool kits and raw materials (D8); attachments vs. gunsmith work-overs (D31) | `config/handel-data.mjs` (`KATEGORIA_CENOWA`, `KATEGORIA_CENOWA_SUROWCA`), `config/handel-rules.mjs` |
| Attachment availability: the gear-table twin, otherwise a price threshold (D32) | `config/handel-data.mjs` (`DOSTEPNOSC_NASADEK`), `config/addons-data.mjs` |
| Tables without a d100 column roll weighted by availability (D9) | `config/szabrowanie-data.mjs` (`losujPrzedmiot`), `dev/packs/tabele.mjs` |
| Fant table: the print skips 85 — read as 81–85 (U25) | `config/fanty-data.mjs` |
| Sleep: 4–5 h gives short-rest benefits, 1 h counts as no sleep (D20) | `config/postoj-rules.mjs` (`skutkiSnu`) |
| Work ≤ 10 h a day, the passive value pays 1 gb per point per 10 h (U30, U48) | `config/postoj-rules.mjs` (`zarobekPracy`, `budzetDoby`) |
| Normal and Rich upkeep cover the chronic-disease dose at sunset (D13) | `actors/health-panel.mjs` (`sunsetCheck` with `dawkaZUtrzymania`), `postoj/doba.mjs` |
| Several searchers / helpers divide the time; scavenging splits the resource types (D12) | `config/szabrowanie-data.mjs` (`czasSzabrowania`, `podzialRodzajow`), `config/bebeszenie-data.mjs` (`czasBebeszenia`) |
| One resource only: time × 1 / number of types (U18); a failed butchering leaves 40% for the next try, recursively (U17) | `config/bebeszenie-data.mjs` (`czasBebeszenia`, `wynikBebeszenia`) |
| Dismantling gives half the recipe's materials, rounded down (D22) | `postoj/rozbiorka.mjs` |
| Self-destruct countdown ticks at the start of each combat round (a dead machine leaves the turn order) | `combat/autodestrukcja.mjs` |

**Credit lives on the front page.** The author is thanked once, for all past and future rulings,
in the module README (*Podziękowania*, decided by the GM 2026-10-03). Code comments say "author of
the system" / RAI and state the mechanic and its reasoning — they do not repeat the name.

What stays WKK because it does **not** come from the author: the per-round ammunition queue,
the chamber as a separate slot with its own caliber, and the dominant-round rule for bursts.
Also WKK: pushing a single round into a removable-magazine weapon against a Zwinne dłonie
check (author's idea, this table's numbers — `wkk/config/pojedynczy-naboj.mjs`).

## What's actually in here

| File | What it holds |
|---|---|
| `wkk/items/pochodnia.mjs` | Both torch variants + fuel/refuel/ignition mechanics |
| `wkk/items/flara.mjs` | Handheld flare |
| `wkk/items/pistolet-na-race.mjs` | Flare pistol + its "Wystrzel flarę" activity |
| `wkk/items/zeton-luxor.mjs` | Żeton Luxor prop |
| `wkk/items/gadzety.mjs` | The 4 flavor click-items |
| `wkk/config/ammo-data.mjs` | `44mag_dd`, `race` ammo entries; `grenade-signal` (Granat sygnałowy) |
| `wkk/config/weapons-data.mjs` | `pistolet-na-race`, `laska`, `miecz`, `zloty-desert-eagle` weapon entries; the five bestiary "vendor trash" weapons (`maczuga`, `palka-policyjna`, `kamienny-noz`, `sztylet`, `mlotek` — PLAN_paper_doll D36) and `KOBALT_WEAPON_IDS` (the Kobalt gate for bestiary drops) |
| `wkk/config/doll-kobalt.mjs` | Paper doll: power armour also excludes Hełm, Głowa, Twarz, Strój (D23). Host: `actors/doll.mjs` / `doll-model.mjs` (`HEAVY_ARMOR_BLOCKS_RAW`). The other WKK doll rule, „Darmowe upuszczanie" (D19), is a world setting registered in `actors/ground-items.mjs`, read only with Kobalt on |
| `wkk/config/diseases-data.mjs` | Schizofrenia paranoidalna + its stable id |
| `wkk/config/phobias-data.mjs` | Mizoofobia |
| `wkk/config/armor-data.mjs` | Kamizelka taktyczna (light armour, +1 handy slot) |
| `wkk/config/class-features-data.mjs` | Pistolero (Kowboj ability, pistol twin of Rewolwerowiec) + its `hasAbility()` entry. Host: `config/class-features-data.mjs` (the generator emits the splice) and the Kowboj pool in `config/classes-data.mjs`. Flagged `kobalt` in the pack and hidden from level-up pools when Kobalt is off (`actors/kobalt-advancement.mjs`) |
| `wkk/config/latarka-overrides.mjs` | `LIGHT_KOBALT` — see the override pattern below |
| `wkk/config/molotov-light.mjs` | `MOLOTOV_LIGHT_KOBALT` — a lit Molotov's light; RAW gives it none (see below) |
| `wkk/config/production-kobalt.mjs` | Crafting (PLAN_produkcja): abandoning a Robota and its refund (D14), Robota weight interpolation (D4), schematic weight (D15), the Spec profession as an executor trait — ×0,75 / ×0,5 with the full kit, ×0,25 floor, no ST 30 (D26–D28, D32; D30 falls out of D26); `BEZ_PRZEPISU_STANDARDOWEGO_KOBALT` — the factory remote controller has no standard formula recipe, only the Haker's homemade one stays (PLAN_m3 D37). Host: `config/production-rules.mjs` / `config/recipes-data.mjs`, each with its `..._RAW` twin |
| `wkk/config/dziurawy-helm.mjs` | „Dziurawy hełm" — what a helmet leaves after Krytyczna ochrona (junk, 2 gb, its weight; PLAN_tt D12a). Host: `combat/obrona.mjs` (`breakHelmet`); without Kobalt the helmet simply disappears (RAW) |
| `wkk/config/rekonwalescencja-kobalt.mjs` | Recovery (PLAN_m1_walka D5, D7, D8): the Krytyczny wound's exhaustion is persistent until leaving Krytyczny; Pomoc medyczna costs one medic-kit charge (not with Aspiryna i Miętusy), takes the whole Długi odpoczynek of both and one patient per medic; self-treatment — Test Inteligencji (Medycyna) ST 20, a failure adds a Stopień, the charge goes either way. Hosts: `config/rekonwalescencja-rules.mjs` (`regulaZdejmowania` with `{ kobalt }`), `actors/rekonwalescencja.mjs` |
| `wkk/config/naprawa-awarii-kobalt.mjs` | Drone failure repairs (PLAN_m3_towarzysze D25, D28): per Tabela awarii entry the repair degree and the **specific parts** — each listed material at a fraction of the drone recipe (Drobnostka ⅕, Trochę roboty ½, Skomplikowana harówa ¾, rounded up, min. 1; Chemia fixed 2 / 3 / 4), one degree up at half PW or less; 5, 10, 12 pass on their own, 20 is a wreck. Host: `config/towarzysze-rules.mjs` (`naprawaAwarii` with `{ kobalt }`), used by `actors/drony-naprawa.mjs`; without Kobalt the GM decides (a card, NOE) |
| `wkk/config/dostepnosc-kobalt.mjs` | Availability overrides: the factory remote controller 10% instead of 30% (PLAN_m3 D33). Host: `config/dostepnosc.mjs` (`dostepnosc(ref, { kobalt })`) |
| `wkk/config/pojedynczy-naboj.mjs` | A round pushed into the inserted removable magazine in combat: Zwinne dłonie, ST by caliber category (12 / 14 / 15, .50 BMG 18); failure drops the round on the ground, a natural 1 jams the weapon (jam-immune weapons: plain failure). Host: `weapons/magazine.mjs` (`_performPushRoundAction`), only with Kobalt on; RAW refusal stays for Kobalt off |
| `wkk/config/handel-kobalt.mjs` | Trade (PLAN_m5_postoj D3, D41): traders buy at 50% of the regional price (`SKUP_KOBALT`, NOE 100%); the whetstone (Naostrzenie) is a trade good, not only a smith's work-over (`NASADKI_KOBALT`). Hosts: `config/handel-rules.mjs` (`skupDomyslny`, `generujTowar`), `config/addons-data.mjs` |
| `wkk/config/sen-kobalt.mjs` | Sleep (D20, D35): a CON save for 4–5 h (ST 10) and 2–3 h (ST 15) of sleep, failure — Bezsenność; Bezsenność is persistent and comes off by sleeping it off (12 h — one level, 18 h — two). Hosts: `config/postoj-rules.mjs` (`skutkiSnu`), `config/rekonwalescencja-rules.mjs` (`regulaZdejmowania` with `senKobalt`); sub-setting `kobaltSen` |
| `wkk/config/utrzymanie-kobalt.mjs` | Rich upkeep (D38): a Fuks chance of 1 / (11 − n) per day without one, certain on day 10, 7-day Fuks. Host: `config/postoj-rules.mjs` (`szansaBogaty`, `dzienBogaty`, `przeskok`) |
| `wkk/config/woda-kobalt.mjs` | Water quality (D37 — a rule from the system's test version, dropped from print): dirty ST 10 → infectious disease, radioactive ST 15 → exhaustion, chemical ST 15 → 1d6 acid and exhaustion; qualities, cleanest first. Hosts: `config/postoj-rules.mjs` (`skutkiWody`), `actors/party-supplies.mjs`, `postoj/doba.mjs`; sub-setting `kobaltWoda` |
| `wkk/config/bebeszenie-kobalt.mjs` | Butchering rows the book lacks (D36): Tiny beast, Gargantuan machine. Host: `config/bebeszenie-data.mjs` (`wierszBebeszenia`) |
| `wkk/combat/weapon-save-properties.mjs` | `rozrywajaca` |
| `wkk/combat/bleeding.mjs` | `dumdum` bleed profile |
| `wkk/registry.mjs` | Every WKK export in one place — see its own header comment |

Every file above has a matching "host" file at the equivalent path one level up (e.g.
`wkk/config/ammo-data.mjs` ↔ `config/ammo-data.mjs`) that imports it and splices it into an
otherwise-RAW array/object, at the exact position the entry used to live inline. The host
file's public exports (name, shape, behavior) are unchanged by this — only *where the WKK piece
is defined* moved. `disease-effects.mjs` is the one exception: its WKK-driven entry
(`schizofreniaParanoidalna`) is mechanically identical to the RAW `paranoja` entry it sits next
to (same disease, different in-fiction name), so rather than relocate a duplicate, that file now
shares one local constant between both keys — see its own comment.

## The override pattern (NOE item + WKK numbers)

Latarka's light radius (`items/latarka.mjs`) was the first case; crafting
(`config/production-rules.mjs` ↔ `wkk/config/production-kobalt.mjs`) is the largest — pure rule
functions take `kobalt` as a parameter (default `isKobaltEnabled()`), so tests pass both modes
explicitly instead of flipping the world setting. The shape to copy for the next one:

- The RAW value stays in the host file, named `..._RAW`.
- The WKK value moves to its `wkk/` counterpart, named `..._KOBALT`, with a doc comment
  explaining what changed and why.
- The host file keeps the live branch (`isKobaltEnabled() ? X_KOBALT : X_RAW`) at the single
  point of use — no forked files, no strategy pattern, per `PLAN_kobalt.md`'s original decision.

**Variant — no RAW value at all.** Koktajl Mołotowa's light (`actors/molotov.mjs`, 2026-09-24):
RAW gives a lit bottle no light, so the "RAW side" of the branch is `null`, not a number. Same
shape otherwise — the value lives in `wkk/config/molotov-light.mjs` as `..._KOBALT`, and the host
file's single accessor (`molotovLight()`) returns `isKobaltEnabled() ? copy : null`. Every consumer
(the in-hand light provider, the light of a bottle lying on the ground) goes through that accessor,
never the constant. Small mechanical impact, but light changes what tokens can see, so it's a rule,
not presentation — explosion VFX and scorch marks stay NOE; light does not.

## What this pass did *not* change

This reorganization does not change what the live module ships or how the `kobaltEnabled`
world setting behaves — every `registerX()` call `main.mjs` fires today still fires
unconditionally, and `dev/packs/build-packs.mjs` still produces exactly one compendium set, the
same as before this folder existed. What it buys is a mechanical starting point for an actual
RAW-only build variant later: `wkk/registry.mjs` is the one file that would need consulting to
know everything such a build should leave out.
