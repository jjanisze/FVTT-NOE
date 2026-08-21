> **This is the original planning document (pre-implementation).** For current, verified
> implementation status — what's actually live, what's checked off, changelog by version —
> use `IMPLEMENTATION.md` instead. This file is kept as the initial override-scope reasoning,
> not as a source of live truth, and it has at least one known factual error inherited by
> nothing else: **§16.2 gives Skażenie radioaktywne save DCs as 5/10/15/20**, which does not
> match the rulebook's own POZIOM SKAŻENIA RADIOAKTYWNEGO table (10/15/20/25). The shipped code
> (`scripts/config/levelled-conditions-data.mjs`) follows the rulebook, not this file — see
> `IMPLEMENTATION.md` §1.5b for the note. Treat any other numeric claim here as unverified until
> cross-checked against the rulebook or `IMPLEMENTATION.md`.

This file lists the required override plan for running Neuroshima on top of the dnd5e system in Foundry.

## Core Assumption

This cannot be treated as a light skin over dnd5e. The rulebook keeps the d20, abilities, proficiency bonus, levels, and advantage/disadvantage framework, but replaces or heavily rewrites the following layers:

- skills and proficiencies
- combat consequences
- ranged weapon workflow
- inventory and ammunition handling
- conditions and long-term afflictions
- class progression content
- item catalog and bestiary content

The practical goal is therefore: keep the dnd5e chassis where it still matches Neuroshima, and override every layer where the book introduces its own terminology, data, or automation.

## Baseline Product Assumptions

- the character sheet and all player-facing UI should be in Polish
- internal code identifiers may stay English, but visible labels, tabs, action names, chat cards, hints, and effect names should be Polish-first
- the character sheet should not assume any Kolor Neuroshimy by default
- colors should be treated as optional, late-stage rule profiles layered on top of the base system

## What Can Stay From dnd5e

- six base abilities and their modifiers
- d20 tests, saves, attacks, advantage/disadvantage, rerolls
- proficiency bonus progression by total level
- actor, item, effect, combat, and compendium document types
- base rolling engine, chat cards, and effect framework

These pieces are close enough to Neuroshima that reusing them reduces maintenance cost.

## What Must Be Overridden

## 1. Terminology And Presentation Layer

The default dnd5e language is wrong for the setting even where the math is similar.

Required overrides:

- rename AC presentation to TT (Trudność Trafienia)
- rename HP presentation to PW (Punkty Wytrzymałości)
- rename hit dice presentation to KW (Kość Wytrzymałości) where exposed
- ensure the entire player sheet is localized to Polish instead of mixing Polish mechanics with English dnd5e labels
- remove or hide spellcasting, magic schools, spell slots, concentration, spellbooks, pact magic, ritual UI, and every fantasy-first label that leaks into the sheet
- replace fantasy-first labels and help text with Neuroshima terminology
- apply a dedicated Neuroshima sheet layout instead of relying on stock dnd5e tabs

Technical note:

- this should be done with custom actor and item sheet classes plus localized labels, not CSS-only masking

## 2. Actor Data Model And Character Sheet

The printed Neuroshima sheet already tells us what data dnd5e does not expose by default.

Required actor fields:

- Stopień Zranienia with four levels and derived penalties
- Wyczerpanie as both level and type tracking
- Fuksy with a hard cap of 3
- Choroba: selected disease, medicine name, current disease stage, doses owned, notes
- Fobia: selected phobia and aktywne efekty
- ammunition pools by ammo type
- magazine state per weapon: ammo type, current rounds, capacity
- carried load: current, utility, maximum, sum of weapon weight, sum of armor weight
- backpack and vehicle cargo sections
- key campaign notes mirrored from the printed sheet: znajomi, nowy obszar, pierwsze spotkanie

Sheet structure to add:

- page for combat essentials: TT, PW, Zranienie, Wyczerpanie, aktywne stany
- page for ranged weapons with attack bonus, damage, range, ammo type, rounds loaded, capacity, fire modes
- page for inventory with gamble value and weight
- page for disease and phobia tracking
- page for class abilities and sztuczki with current/max uses and refresh timing

Implementation note:

- because this is a module layered on dnd5e, custom Neuroshima-only data should live under module flags or a dedicated module data namespace prepared into sheet data

## 3. Skills, Tooling, And Proficiencies

The Neuroshima skill list differs from stock dnd5e and must replace it at config level, not just visually.

Required skill overrides:

- replace the skill list with the Neuroshima list: Akrobatyka, Atletyka, Historia, Intuicja, Medycyna, Oszustwo, Percepcja, Perswazja, Pojazdy, Przyroda, Skradanie się, Survival, Śledztwo, Technika, Tresura, Występy, Zastraszanie, Zwinne dłonie
- preserve correct ability pairings, especially Medycyna = INT, Pojazdy = MDR, Technika = INT
- support checks using an alternate ability when the GM changes the governing ability

Required proficiency overrides:

- replace weapon categories with Neuroshima weapon groups
- add all 22 Neuroshima tool sets: małego aptekarza (INT), małego charakteryzatora (ZRC), małego chemika (INT), małego elektronika (ZRC), małego fałszerza (ZRC), małego gorzelnika (MDR), małego hakera (INT), małego jubilera (INT), małego kartografa (MDR), małego kłusownika (ZRC), małego kowala (SIŁ), małego krawca (ZRC), małego kucharza (MDR), małego mechanika (ZRC), małego medyka (INT), małego rusznikarza (ZRC), małego rzeźnika (MDR), małego stolarza (ZRC), małego szulera (MDR), małego szklarza (INT), małego ślusarza (ZRC), małego tatuażysty (ZRC)
- support specialization where proficiency bonus is doubled for selected skills or tools

## 3.5 Forsowanie (Pushing A Test)

Forsowanie is a core test mechanic entirely absent from dnd5e. It must be hooked into the roll pipeline at the engine level.

Rule summary:

- available only on failed Testy Cech (ability checks); explicitly not available on Testy Ataku or Rzuty Obronne
- when forsowanie is declared, the roll formula changes from `k20 + modifier + PB` to `k20 + full raw Cecha Bazowa value` (e.g. STR 18 → add 18, not +4; proficiency bonus is dropped entirely)
- the actor always gains 1 level of Wyczerpanie when forsowanie is used, regardless of success or failure
- forsowanie is declared after the original test fails but before the scene moves on; it is a reaction to the failed result, not a separate turn action
- the rulebook marks this rule as optional (opcjonalne); the GM world setting should include a toggle to enable or disable it globally

Required behavior:

- after any failed skill check or tool check, display a "Forsuj" prompt button in the chat card
- clicking the button re-rolls using the full Cecha Bazowa value, sends the result to chat, and automatically applies 1 Wyczerpanie to the rolling actor regardless of the new result
- the Forsuj button must not appear on attack rolls or saving throws
- if the GM has disabled forsowanie at world level, the button must not appear

Implementation note:

- the substitution of `modifier + PB` for `full Cecha value` requires access to the raw ability score, not just its computed modifier; ensure the sheet data model exposes raw scores as distinct values for use in roll formulas

## 4. Combat Engine Overrides

This is the largest rules delta from dnd5e and the most important gameplay layer.

### 4.1 Stopień Zranienia Instead Of Stock 5e Downed Workflow

Required behavior:

- when PW drop to 0, apply Stopień Zranienia instead of using stock Rzuty Przeciw Śmierci as the main Neuroshima loop
- Trafienia Krytyczne also inflict Stopień Zranienia
- cumulative Stopnie Zranienia apply their penalties: speed loss, no reactions, no bonus actions, then Wyczerpanie on Krytyczny Stopień Zranienia
- a further Stopień Zranienia on Krytyczny means death
- support recovery through regeneration after Długi odpoczynek and medical help with Medycyna + małego medyka
- heroes who accumulate three death save failures gain one final Ostatnia Akcja: they may perform a single arbitrary action (detonate a grenade, fire a burst, say a last word) before dying; this is narrative but the sheet should prompt it and the combat pipeline should not block the hero's token before it fires

Important clarification: Neuroshima does NOT remove Rzuty Przeciw Śmierci entirely. When PW drop to 0, the character falls Nieprzytomna and still makes death saves as in dnd5e (3 successes = stabilize, 3 failures = death, nat 1 = two failures, nat 20 = regain 1 PW). However, this also triggers a Stopień Zranienia simultaneously. The two systems coexist: death saves determine immediate survival, while Stopnie Zranienia impose lasting combat penalties.

Nokautowanie: when reducing a target to 0 PW with a melee attack, the attacker can choose to set them to 1 PW and inflict Nieprzytomność instead of killing. The target wakes after a Krótki odpoczynek or when healed.

This means dnd5e Nieprzytomność/Rzuty Przeciw Śmierci handling needs to be intercepted or extended in the character workflow.

### 4.2 Wyczerpanie

Stockowe Wyczerpanie z 5e is not the Neuroshima rule.

Required behavior:

- Wyczerpanie stacks from 1 to 6
- each level gives a flat -2 to every Test k20
- each level reduces speed by 1.5 m
- death at 6 levels
- track Wyczerpanie source type: bezsenność, kac, niedożywienie, odwodnienie, przemarznięcie, skażenie radioaktywne, stopień zranienia, uduszenie, ogólne

### 4.3 Osłona

Required behavior:

- pół osłony: +2 TT and +2 to RO na Zręczność
- trzy czwarte osłony: +5 TT and +5 to RO na Zręczność
- całkowita osłona: cannot be targeted directly
- Osłona must matter for area fire and Długa seria (DS) Rzuty Obronne

Recommended implementation:

- szybki przełącznik Osłony na tokenie albo selektor statusu dla aktualnej Osłony

### 4.3.1 Przebijanie Osłony Bronią Palną

The rulebook defines a mechanic for shooting through cover with firearms.

Required behavior:

- attacker can choose to ignore the target's Osłona TT bonus by firing through the cover material
- on hit, damage is reduced by a flat amount based on the cover material and thickness:
  - Level 1 (wood/plastic, 10 cm): reduce by 5
  - Level 2 (concrete/stone, 10 cm): reduce by 10
  - Level 3 (armored glass, 3 cm): reduce by 15
  - Level 4 (steel, 2 cm): reduce by 20
  - Level 5 (titanium/chrome, 1 cm): reduce by 40
- cannot penetrate living creatures or the target's own armor
- GM may adjust reduction based on actual material thickness

### 4.4 Tryby Ognia And Ranged Combat Activities

This cannot be modeled as plain dnd5e ranged attacks.

Required weapon activities:

- Ogień pojedynczy (P)
- Krótka seria (KS): 3 rounds, one Test Ataku with Utrudnienie, roll weapon damage three times, no damage modifier
- Długa seria (DS): area line attack, consumes 10–30 rounds (thresholds: 10, 15, 20, 25, 30 with separate damage multiplier table), targets make RO na Zręczność (ST = 8 + PB + ZRC mod of shooter) for half damage
- Miażdżąca seria (MS): heavy area line attack (szerokość 3 m, długość 150 m), higher ammo thresholds (50/100/150/200), targets make RO na Zręczność ST 15 for half damage AND RO na Siłę ST 15 to avoid knockdown
- Ogień zaporowy (OZ): consumes 6 rounds, targets in Osłona make RO na Mądrość (ST depends on ammo damage die: 1k4/1k6 → 10, 1k8/1k10 → 13, 2k6+ → 15, k20 → 20) or lose Akcja and Akcja Bonusowa until next turn

Additional required combat handling:

- Pechowa jedynka (natural 1) applies to every firearm Test Ataku, not only series: any natural 1 on a ranged attack jams the weapon; clearing requires Akcja + Test Zręczności (Zwinne dłonie) ST 10 or the weapon is damaged; this needs to be hooked into the attack roll pipeline universally
- melee weapons also degrade on natural 1: the damage die steps down one size (k12→k10→k8→k6→k4); degraded weapons must be repaired by a blacksmith or narzędzia małego kowala; the sheet needs to track the current damage die per weapon, not just the base die
- rzut k20 for zacięcie after each DS and MS (before any shots land, natural 1 = jam before firing)
- obsługa Trafienia Krytycznego for series where required by the rulebook
- kara za strzelanie jedną ręką przy Długiej serii (DS): targets get Ułatwienie to their RO na Zręczność
- kary za zasięg and strzelanie dystansowe w zwarciu
- Długa seria and Miażdżąca seria are mutually exclusive with Krótka seria in the same turn

### 4.5 Przeładowanie And Magazine Logic

Required behavior:

- weapon stores current rounds and max capacity
- support internal magazines (Wmag.), revolver cylinders (Bęb.), and replaceable magazines
- support properties such as przeładowanie, ładowanie, Wmag., Bęb.
- support zdolności Szybkie przeładowanie and Szybka wymiana magazynka
- komunikaty w czacie, gdy broń jest pusta albo się zacina
- weapon cleaning mechanic: during any Krótki or Długi odpoczynek a player may spend 1 hour cleaning a firearm; that weapon gets one free reroll on the next natural 1 jam roll during the following combat; the sheet should track the "cleaned" flag per weapon and clear it after use

## 5. Item Model Overrides

The standard dnd5e item taxonomy is insufficient without Neuroshima-specific fields.

### Weapons

Required weapon fields:

- ammo type
- current magazine and capacity
- fire modes
- range in meters and tactical squares
- Neuroshima properties such as obalająca, burząca, finezyjna, cicha, dwuręczna, lekka, przeładowanie, ładowanie, powracająca, unieruchamiająca
- optional attachments and upgrades

### Armor

Required armor behavior:

- light/medium/heavy handling must follow Neuroshima TT logic and dex cap logic
- scrap armor and improvised post-apo equipment need dedicated catalog entries
- powered armor requires its own handling, including the "self-bearing" concept instead of standard fantasy armor assumptions

### Consumables And Special Gear

Required item families:

- medicines and disease treatments
- ammunition as tracked inventory, not just abstract consumption
- medpaks and trauma tools
- Fanty generating Fuksy
- traps, explosives, tools, fuel, electronics, mechanics parts, chemicals, food, and barter goods

### Economy And Weight

Required behavior:

- every meaningful item should expose gamble value
- weight handling should support utility and maximum carry thresholds (Użytkowe = Siła × 5 kg, Maksymalne = Siła × 10 kg)
- inventory UI should make scarcity visible without becoming bookkeeping hell
- Przedmioty podręczne: the sheet must enforce a hard limit of 3 quick-access slots (items worn at belt or in pocket); drawing from this slot costs a Darmowa Interakcja; items outside this slot cost an Akcja to retrieve from a plecak or juki

### Raw Materials (Surowce)

Crafting and production in Neuroshima depend on five tracked resource types that form the backbone of the economy. These must be first-class items, not free-text notes.

Required surowce types:

- Chemia (CH): explosives, medicines, ammunition primers
- Części elektroniczne (CE): electronics, drones, computers
- Części zamienne (CZ): mechanical parts, weapons, vehicles
- Materiały konstrukcyjne (MK): structural materials, armor
- Materiały organiczne (MO): food, biological ingredients, organic chemistry

Required behavior:

- surowce are tracked by weight (grams and kilograms) rather than unit count
- the inventory panel must show current stock of all five types at a glance
- surowce should be gainable from szabrowanie (scavenging), bebeszenie (gutting creatures and machines), and direct purchase
- each crafting schema lists required quantities per type; the crafting UI should validate whether the actor has enough before allowing production to start

## 6. Conditions, Diseases, Phobias, And Long-Term State

This is a distinct Neuroshima subsystem and should not be reduced to free-text notes.

### 6.0 Upojenie (Intoxication)

The rulebook defines a separate, stackable intoxication track that is entirely absent from the standard dnd5e condition list.

Required behavior:

- four discrete levels of Upojenie, each adding negative effects: level 1 gives Utrudnienie to CHA and INT tests plus Ułatwienie to Przerażenie saves; level 2 adds Utrudnienie to MDR tests and disables straight walking; level 3 gives Utrudnienie to all tests and halves Szybkość; level 4 causes Nieprzytomność
- each 100 ml of strong alcohol or 500 ml of weak alcohol triggers a RO na Kondycję ST 15; failure advances the level by one
- Kac: every 4 hours of sobriety reduces Upojenie by 1; each reduction step requires RO na Kondycję ST 10 or a level of Wyczerpanie is gained
- the Upojenie level must be visible on the primary sheet tab next to Wyczerpanie
- add a "Wypij" quick action that triggers the save

Required disease support:

- chronic disease selection during character creation or later assignment
- current disease stage: przewlekły, ostry, krytyczny
- linked medicine and dose count
- daily save/check workflow when medicine is missing
- disease-specific aktywne efekty
- support for common diseases such as choroba popromienna and infectious disease handling

Required phobia support:

- phobia selection and storage on actor
- trigger reminder with RO na Mądrość vs trigger of fear or fobia
- failure consequences tracked as aktywne efekty or prompted nałożenie stanu

## 7. Character Creation, Classes, And Progression

Neuroshima classes are not dnd5e classes with renamed flavor text.

### 7.0 Pochodzenia (Origins)

Origins replace dnd5e backgrounds and are a required part of character creation.

Required behavior:

- twelve distinct origins: Asgard, Człowiek Pustyni, Detroit, Federacja Appalachów, Miami, Missisipi, Nowy Jork, Południowa Hegemonia, Posterunek, Salt Lake City, Teksas, Vegas
- each origin provides fixed bonuses to two Cechy Bazowe (+1 each) applied at character creation
- each origin has a list of 3 abilities (usually paired options on a 1–2/3–4/5–6 die table); the player picks one at creation
- at level 5 the Spec class gives a second ability from the same origin list; other classes may access a second ability via the Patriota Sztuczka
- origins are content compendium items, not hardcoded; the origin selector on the sheet should show the attribute bonuses and let the player choose their starting ability
- the random behavior table per origin is flavor only and needs no mechanical implementation

Required content work:

- create Neuroshima classes and their level progressions as dedicated class items
- create professions or subclass equivalents where the rulebook defines them (Brutal: Gladiator/Koczownik/Inwestor; Cwaniak: Gwiazda/Kaznodzieja Nowej Ery/Mafiozo; Spec: Chemik/Medyk/Monter; Twardziel: Kowboj/Wojownik Autostrady/Żołnierz; Złodziej and Zwiadowca per rulebook)
- create sztuczki as feat-like advancement items
- implement Neuroshima starting gear packages
- implement save proficiencies, class skill choices, weapon proficiencies, armor training, and KW values per class
- support multiclassing according to Neuroshima rules: TT bonuses from different classes do not stack (pick the highest); Drugi Atak does not stack
- the Spec/Monter subclass can build drones (Dron krączący, Dron latający); drones need their own actor type or a dedicated NPC stat block template with fields for mod. INT twórcy, operator’s mod. ZRC, and PB of builder; drone TT and attack bonus are derived from the builder’s stats at build time

### 7.1 Experience Points (Punkty Doświadczenia)

The Neuroshima XP system mixes GM-assigned group PD with individually tracked personal PD. The sheet must support this.

Required PD sources and tracking:

- personal PD categories that each player self-tracks on the sheet:
  - Pierwsze Spotkanie: 5 PD per new enemy type that forced an RO na Mądrość via its Pierwsze Spotkanie ability; record enemy name in the dedicated sheet field
  - Nowy obszar: 5 PD per named significant location visited; record in the dedicated sheet field
  - Stopień Zranienia: 5 PD per injury received in combat
- group PD assigned by GM: 10–50 PD per session for mission progress, or flat 10 PD per hour of play
- Nagroda publiczności: voted by fellow players; winner gets a Fuks, 10 PD, or an item worth up to 20 gb
- Przechwałki: each unique boast earns 10 PD (max 30 PD per session), assigned by GM
- milestone alternative: GM can skip PD entirely and award level-ups per completed story milestone
- the sheet needs a running PD total, a level progress indicator (next level threshold), and a log area for Pierwsze Spotkanie and Nowy obszar entries

Important note:

- any remaining dnd5e spellcasting scaffolding on classes should be fully removed from the sheet and from compendium content

## 8. NPC And Enemy Support

Bestiary support is a core requirement, not an optional extra.

Required NPC/monster support:

- enemy sheets using Neuroshima TT, PW, injuries, and ranged combat rules
- support for enemies that use Długa seria (DS), Ogień zaporowy (OZ), armor, custom diseases, toxins, or area attacks
- compendium population from the rulebook bestiary and campaign-specific Foundry data

Important practical rule:

- even if lightweight enemies can simplify ammo bookkeeping, the sheet model should still support the same combat primitives as BGs so elite enemies can use full rules

## 9. Compendia To Build

Minimum compendium set:

- classes
- professions or subclass equivalents
- sztuczki
- origins (12 Pochodzenia with attribute bonuses and ability options)
- weapons
- armor and armor accessories (hełmy, ochraniacze, tarcze)
- ammunition (all calibers from the ammo table, including elaboration notes)
- surowce (the 5 raw material types as item entries)
- crafting schematics (pirotechniczne, rusznikarskie, mechaniczne, hakerskie, elektroniczne, farmaceutyczne — each as a schema item with required surowce, ST, and production time)
- medicines
- tools (all 22 sets: małego aptekarza, charakteryzatora, chemika, elektronika, fałszerza, gorzelnika, hakera, jubilera, kartografa, kłusownika, kowala, krawca, kucharza, mechanika, medyka, rusznikarza, rzeźnika, stolarza, szulera, szklarza, ślusarza, tatuażysty; each with governing Cecha)
- consumables and barter goods
- diseases
- phobias
- generic stany/efekty
- grenades and explosives
- vehicles (as actor templates or items)
- drony (Dron krączący, Dron latający)
- enemies and archetypal NPCs

## 10. UI And Quality-Of-Life Overrides

These are not cosmetic extras. They reduce friction in the heaviest Neuroshima workflows.

Recommended additions:

- quick buttons on weapon rows: Ogień pojedynczy (P), KS, DS, OZ, przeładuj
- visible ammo pools and loaded magazine counters
- per-weapon "cleaned" flag indicator and toggle (links to the cleaning rest mechanic)
- per-weapon current damage die display (links to the degradation mechanic for melee weapons)
- tracker Stopnia Zranienia i Wyczerpania always visible on the primary sheet tab
- Upojenie level tracker adjacent to Wyczerpanie
- szybki selektor Osłony on token HUD or combat HUD
- compact disease/phobia panel with active stage and medicine stock
- Przedmioty podręczne panel: exactly three labeled quick-slot rows
- surowce panel: five labeled resource pools visible on the inventory tab
- production queue panel: active crafting schema name, progress bar (time remaining), and required surowce
- XP panel: current PD, next level threshold, and log fields for Pierwsze Spotkanie and Nowy obszar entries
- post-apo visual redesign aligned with the printed sheet rather than stock dnd5e fantasy parchment

## 11. Color Profile Support

Colors should be implemented as rules profiles layered on top of the common Neuroshima chassis, not as scattered special cases.

Implementation direction:

- the base karta aktora and core mechanics should be color-agnostic
- colors should be implemented at the very end as optional rules presets
- color selection should be a global world-level setting controlled by the GM, not a per-character or per-sheet assumption
- the color system should be able to apply world-wide modifiers to economy, rest rules, zakres Trafienia Krytycznego, starting conditions, and recovery rules without requiring a separate sheet layout

Design constraint:

- even though colors are deferred, the current roadmap should remain aware that some systems may later receive color-based modifiers, especially Stopnie Zranienia, bleeding, Fuks, Przerażenie, economy, rest timing, and onboarding to diseases or phobias

## 12. Crafting And Production System

The rulebook has an extensive, class-linked production system driven by raw materials and schematics. It is not optional in a post-apo setting where economy runs on barter and scavenged resources.

### 12.1 Schema Categories

Six schema families, each linked to specific tool sets:

- Pirotechniczne (Chemik): explosives, dynamit, granaty, IED, miny, prochy — tool requirements: narzędzia małego chemika + małego rusznikarza
- Rusznikarskie (Chemik): firearms, attachments, silencers, grenade launchers, magazine expansions — tool requirements: narzędzia małego kowala + małego rusznikarza
- Mechaniczne (Monter): vehicles, mech armor, bikes, powered exo-suits — tool requirements: narzędzia małego mechanika + małego kowala
- Hakerskie (Monter): drones, computers, remote controllers, hacking gear — tool requirements: narzędzia małego hakera + małego elektronika
- Elektroniczne (Monter): radios, night-vision, sensors, batteries, aggregates — tool requirements: narzędzia małego elektronika + małego chemika
- Farmaceutyczne (Medyk): medicines, drugs, stimulants, poisons, uzupełnienia zestawu medyka — tool requirements: narzędzia małego chemika + małego aptekarza

### 12.2 Production Workflow

Required behavior:

- player selects a schema item; the system checks for required tools and sufficient surowce stock
- production runs in real or abstracted time; each schema specifies hours of work required
- Spec's Szybka produkcja zdolność reduces this by running a mini-batch at 1 gamba value per minute, capped at 25 gb per short/long rest (50 gb at level 11)
- the Fabrykator Sztuczka halves all production times
- the Przydasie Sztuczka halves required surowce amounts
- failed production test still consumes 10 % of materials; partial failures return 40 %
- a natural 1 on a hacking schema test triggers a self-destruct event

### 12.3 Szabrowanie And Bebeszenie

Scavenging and gutting are active gameplay loops that feed the resource economy.

Szabrowanie (scavenging ruins):

- each ruin type has a defined scan time, complication chance (%), and expected yields per surowce type
- player makes Test Mądrości (Percepcja or Śledztwo) ST 10; success yields table amounts; result ≥ 20 doubles yield and adds a random item; natural 20 adds a Fant
- a hidden GM k100 roll first checks for a complication (encounter, trap, radiation, gas — table driven)
- each ruin can only be looted once (per resource type)

Bebeszenie (gutting):

- two variants: Bebeszenie Bestii (Materiały organiczne + Mięso) and Bebeszenie Maszyn (CE + CZ + MK + CH)
- requires appropriate tool set; test on tools or Survival/Technika
- each creature size defines yield amounts and time required
- natural 1 on a machine gut check triggers autodestrukcja

## 13. Vehicle System

Vehicles are a major Neuroshima gameplay element. The plan must account for them explicitly.

### 13.1 Vehicle As Actor

Required actor fields for a vehicle:

- TT, current PW, maximum PW
- Szybkość (combat units and max km/h)
- Rozmiar (determines space on map and ramming interactions)
- Osłona tier provided to passengers
- Próg obrażeń (if applicable to the vehicle)
- Próg awarii (damage threshold that triggers breakdown roll)
- cargo capacity (kg)
- fuel type and current fuel level
- fuel consumption rate (liters per 100 km)
- attached weapons and their ammo states
- armor tier (jeśli zamontowany)
- vehicle Cechy Bazowe: SIŁ, ZRC, KON (from the vehicle stat blocks; INT/MDR/CHA are not applicable)

Vehicle reference data (14 vehicles in the rulebook):

- Autobus, Bojowy wóz piechoty, Buggy, Buldożer, Ciężarówka, Czołg, Deskorolka, Hammer, Motorower, Motocykl, Osobówka, Rower, Traktor, Wóz strażacki
- each has: Szybkość, Załoga, Ładowność, TT, PW, Próg obrażeń, Próg awarii, Cena, Dostępność

### 13.2 Vehicle Combat Rules

Required behavior:

- passengers inside a vehicle with any Osłona level receive that Osłona bonus to TT and Zręczność RO
- atakowanie kierowcy: a hit driver makes Test Mądrości (Pojazdy), ST = max(10, half damage received); failure sets back the chase marker by 1; failure by 5+ triggers Przewrócenie
- atakowanie w jadącym pojeździe: shooter makes Akrobatyka ST 10 before their attack roll or gets Utrudnienie
- wypadanie z pojazdu: 9 (3k6) obuchowych damage + Powalenie
- taranowanie: vehicle attacks deal damage by size table; driver must use Manewr: Stuknięcie or Zajechanie

### 13.2.1 Awarie Pojazdów Silnikowych

The rulebook defines a detailed k20 vehicle breakdown table that triggers when a vehicle takes damage ≥ its Próg awarii or the driver fails a Pojazdy test by more than 5.

Required behavior:

- k20 breakdown table with 20 distinct results: Pożar, Guma, Awaria sprzęgła, Uszkodzenie kierowania, Dym, Zacięte drzwi, Uszkodzenie osi, Przewrócenie, Wyciek paliwa, Zaklinowanie kierownicy, Awaria gazu, Uszkodzenie błotnika, Wyciek chłodnicy, Uszkodzenie hamulców, Awaria silnika, Zacięta maska, Uszkodzenie elektryki, Uszkodzenie pancerza, Zranienie pasażera, Uszkodzenie broni
- each breakdown has a repair ST (some repairable during driving, others only during postój)
- naprawa tymczasowa (during driving): fixes the issue for 1 minute, then it recurs
- naprawa fachowa (postój): requires narzędzia małego mechanika and appropriate parts
- the system should support rolling on this table and applying the result as a tracked vehicle state

### 13.3 Chase System

The rulebook has a chase system based on linear progress markers.

Required behavior:

- at least 10 progress markers (each = 36 m gap); ścigany starts at marker 4, ścigający at marker 1
- initiative is rolled; vehicles share the driver's initiative unless passengers push ahead
- each turn: driver tests Pojazdy (ST by terrain: open road 5, city streets 10, narrow alleys 15); success = no complication; failure = complication from k20 table
- a natural 20 means +1 bonus marker advance; natural 1 = two complications
- if the pursued reaches a 7-marker lead or 10 rounds pass, the chase ends
- driver maneuvers: Gazu! (additional move action), Hample (emergency brake, backs up 2 markers), Obrót 180° (needs ST 20 Pojazdy or crashes), Ostrożna jazda (half speed, Ułatwienie on Pojazdy), Stuknięcie, Zajechanie
- the system should support the chase as a combat-adjacent scene, not require a separate subsystem

## 14. Rest Activities And Downtime Mechanics

The rulebook defines numerous structured activities during Krótki and Długi odpoczynek that need mechanical hooks.

### 14.0 Rest Durations And Base Rules

Required rest parameters (differ from stock dnd5e):

- Krótki odpoczynek: 4 hours; requires at least 1 PW to start; interrupted by initiative, damage, travel >15 min, or gambling/production >1 hour
- Długi odpoczynek: 24 hours (not 8 as in dnd5e); requires at least 1 PW to start; must include 6 hours sleep; interrupted by initiative, damage, or travel >1 hour
- Długi odpoczynek restores: all PW, all KW, all special abilities, -1 Wyczerpanie, Cechy Bazowe restored if reduced
- Krótki odpoczynek restores: spend KW to regain PW, refresh short-rest abilities
- if Długi odpoczynek is interrupted after 4+ hours, player gets Krótki odpoczynek benefits instead
- sleep deprivation: any creature that skips 6 hours of sleep must pass RO na Kondycję ST 20 or gain 1 Wyczerpanie

### 14.1 Krótki Odpoczynek Activities

- Czyszczenie broni palnej: 1 hour, cleans one firearm; the weapon gains a one-time reroll of the first natural 1 jam in the next combat (consumed on use); track as a per-weapon flag
- Gambling: can spend time gambling in addition to rest; gambling extended beyond PB transactions per hour triggers RO na Mądrość/Charyzmę ST 10 or 1 level Wyczerpanie
- Gotowanie (requires narzędzia małego kucharza + ingredients, 2 hours): Test narzędzi ST 10; success = all eaters get Ułatwienie on their next arbitrary RO; result ≥ 20 = each eater gets 1 Fuks valid for 24 hours

### 14.2 Długi Odpoczynek Activities

All Krótki activities plus:

- Polowanie (wilderness only, 1 hour): Test Mądrości (Survival) ST 15; success = food/water for 1 person for 1 day; failure by 5+ = 1 level Wyczerpanie
- Plotkowanie (town or city, requires knajpa and willing locals, 1 hour, costs 5 gb): Test Charyzmy (Śledztwo) ST 10; success = 1 rumor; +1 rumor per 5 above ST
- Hazard (requires venue): Test wybranej umiejętności/narzędzi ST 20; success = double stake; failure = lose everything
- Rozrywka (town or city, 10 hours, costs 50 gb minimum): gives 1 Fuks valid 7 days
- Produkcja (see section 12.2)

### 14.3 Długi Postój (Multi-Day Downtime)

When the party takes a break of several days or weeks, extended activities become available:

- training a new proficiency or language: requires a trainer, costs 1 gb/hour, takes 30 × 10 hours/day
- running an enterprise or caravan (income or faction standing changes)
- Praca (work): 10 hours/day, earns 1 gb × passive skill/tool value
- Budowa bazy (base building): 1 gb/hour, 10 hours/day, effects as agreed with GM
- crafting large schematics (vehicles, powered armor) — these require hundreds of hours; the system should support a persistent crafting queue that survives across sessions

Maintenance costs during Długi Postój:

- Nędzny (5 gb/day): outdoors, worst food/water, no medicines
- Normalny (10 gb/day): shelter, decent food, basic hygiene, can afford medicines
- Bogaty (20 gb/day): good food, filtered water, alcohol, clean bed, daily bath

The sheet should track daily cost and companion upkeep (animal companions need food/water but can drink dirty water).

## 15. Damage Types Full List

The rulebook defines 12 distinct damage types. Standard dnd5e covers fewer, so the module must register all of them.

Required types (Polish name / system key):

- Sieczne / slashing
- Kłute / piercing
- Obuchowe / bludgeoning
- Od ognia / fire
- Elektryczne / lightning (replaces standard dnd5e lightning with broader scope)
- Od kwasu / acid
- Wybuchowe / explosive (new — not a standard 5e type)
- Psychiczne / psychic
- Od trucizny / poison
- Radioaktywne / radiant (remapped — radioactive damage, not holy light)
- Od światła / radiant-alternate (weapons like laser need a separate label from radiation)
- Od zimna / cold

Note: radioaktywne and od światła both map to the dnd5e radiant slot. The module should store the Neuroshima subtype on the item and display the correct Polish label in chat cards, even if the engine resolves both as the same damage category under the hood.

## 16. Environmental Hazards And Automated States

Several Neuroshima hazards need automated tracking beyond standard dnd5e.

### 16.1 Podpalenie (On Fire)

- actor receives the Podpalenie condition when hit by fire and the attack triggers it
- at the start of each turn: 1k4 fire damage
- to extinguish: use an Akcja to perform the on-fire drop-and-roll action, which grants Powalenie but ends the state; or use appropriate consumable

### 16.2 Skażenie Radioaktywne (Radiation)

- four levels of contamination (ST 5, 10, 15, 20 for Kondycja saves)
- at the end of each day spent in a radiation zone: RO na Kondycję at the zone's ST; failure = 1 level Wyczerpanie
- long-term exposure can trigger choroba popromienna (see section 6)
- the GM should be able to tag a scene or zone with a radiation level; the system should automatically prompt saves for actors in that zone at end-of-day

### 16.3 Other Hazards

- Niedożywienie: below 0.5 kg food per day → Wyczerpanie at day end
- Odwodnienie: below 2 L water per day → Wyczerpanie at day end
- Uduszenie: hold breath = 1 + KON modifier minutes; losing breath = 1 Wyczerpanie at turn end per turn
- Spadanie: 1k6 per 1.5 m, max 20k6; landing on difficult terrain adds Powalenie
- these should be trackable as world-level hazard conditions, not hardcoded

## 16.4 Spadanie (Falling)

- 1k6 obrażeń per 1.5 m fallen, maximum 20k6
- landing on difficult terrain adds Powalenie
- falling while flying: Nieprzytomność or Szybkość 0 = immediate fall with full damage; Powalenie while flying = drop vertically but no falling damage (instinctive braking)

## 16.5 Niszczenie Obiektów (Object Destruction)

The rulebook defines separate TT and PW tables for objects by material and size. This needs mechanical support for environmental interaction.

Object TT by material:

- 11: Ubranie, papier, lina
- 13: Szkło, lód, cienki plastik
- 15: Drewno, gruby plastik
- 16: Szkło pancerne, cienka blacha stalowa
- 17: Kamień, beton
- 19: Gruba blacha stalowa
- 21: Tytan
- 23: Chrom

Object PW by size (Kruchy / Wytrzymały / Twardy):

- Malutki (butelka, kłódka): 2 / 5 / 10
- Mały (laptop, skrzynka): 3 / 10 / 27
- Średni (beczka, drzwi): 4 / 18 / 64
- Duży (okno, stół): 5 / 27 / 125
- Wielki (witryna, brama, mur): 6 / 36 / 216

Objects have no Cechy Bazowe, automatically fail all RO, and are immune to poison and psychic damage. Large objects with Próg obrażeń ignore damage below that threshold entirely.

## 16.6 Ruch pod wodą i pływanie

Required behavior:

- swimming costs double movement (each 1.5 m = 3 m Szybkość); ignored if creature has Szybkość pływania
- entering water in armor: Test Siły (Atletyka) ST 10 or Szybkość drops to 0; difficult water raises ST (15 river, 20 ocean, 25 whirlpool)
- broń palna pod wodą: max range 30 cm, Test Ataku with Utrudnienie, jam on 5 or less, half damage on hit
- broń miotana pod wodą: max range 1.5 m, Utrudnienie, half damage
- melee pod wodą: Utrudnienie unless creature has Szybkość pływania
- shooting from above water at submerged target: Utrudnienie; target at ≥10 cm gets Osłona ½ or ¾; target at >30 cm = automatic miss

## 17. Additional Combat Subsystems

### 17.1 Initiative Variants

The rulebook defines several initiative modifiers beyond stock dnd5e:

- Zaskoczenie (surprise): surprised creatures roll initiative with Utrudnienie
- Niespodziewany atak (unexpected attack): attacker gets Ułatwienie to initiative; guards/armed-and-ready NPCs also get Ułatwienie
- Atak ze znacznego dystansu: if attacker is Niewidoczny and ≥30 m from target, they get one free Test Ataku before initiative is rolled; if this attack reveals them, the target is not Zaskoczony

### 17.2 Special Melee Combat Actions

These are attack substitutions available to all combatants (not class features) and must be supported as action options:

- Odepchnięcie: target makes RO na Siłę or Zręczność (ST = 8 + attacker SIŁ mod + PB); failure = pushed 1.5 m or knocked Powalenie; only works on targets max one size larger
- Pochwycenie: target makes RO na Siłę or Zręczność (same ST); failure = stan Pochwycenie; requires one free hand; only works on targets max one size larger; captor can drag at half Szybkość
- Wytrącenie (disarm): replaces one melee attack; target makes RO na Siłę or Zręczność (ST = 8 + attacker mod + PB); failure = drops held item; two-handed grip gives Ułatwienie to the save

### 17.3 Broń Improwizowana

- no PB added to attack rolls
- deals 1k4 damage of appropriate type (GM decides)
- thrown range: 3/9 m
- GM may rule it functions as a similar real weapon (e.g. table leg = bejsbol)

### 17.4 Kierunek Widzenia (Facing)

The rulebook has explicit facing rules:

- creatures can only see what is roughly in front of and slightly to the side; everything behind is całkowicie przesłonięte
- melee attack from behind an unaware creature: Ułatwienie to Test Ataku (does NOT apply to ranged attacks)
- if not declared otherwise, a creature faces the last enemy it attacked
- this has tactical implications for flanking and stealth approaches

### 17.5 Atak bez broni (Unarmed Strike)

- Test Ataku = k20 + mod SIŁ + PB (all creatures are proficient)
- damage = 1 + mod SIŁ (obuchowe)
- alternative uses: Odepchnięcie, Pochwycenie (see 17.2)

### 17.6 Bieganie vs Przyspieszenie

Two distinct movement actions that the sheet and combat tracker should differentiate:

- Przyspieszenie [A]: gain additional movement equal to Szybkość; no penalties
- Bieganie [A]: gain additional movement equal to Szybkość × 2; Utrudnienie to all Testy Ataku until next turn; enemy ranged attacks against you have Utrudnienie until end of current turn; requires standing (no Powalenie)

## 18. Gambling And Barter Economy

The barter system is the backbone of the Neuroshima economy and requires dedicated UI support.

### 18.1 Core Gambling Mechanic

- to find a specific item: roll k100, subtract Charyzma value from result; if result ≤ item's availability %, the item is available
- multi-use items (weapons, armor) typically available in 1 unit; consumables in 2k4 units; ammo in 3k20 rounds
- transactions per hour limited to PB count; each additional hour requires RO na Mądrość or Charyzmę ST 10 or gain Wyczerpanie
- negotiation: successful Perswazja/Oszustwo/Zastraszanie ST 15 can improve offered terms

### 18.2 Availability Modifiers By Location

- Dzicz: −50
- Wioska: −30
- Miasteczko: 0
- Miasto: +10

### 18.3 Regional Price Modifiers

The rulebook defines price multipliers per region for: Paliwo, Elektronika, Mechanika, Prochy, Broń, Żywność, Usługi Speców. Regions: Detroit, Federacja Appalachów, Południowa Hegemonia, Nowy Jork, Miami, Missisipi, Posterunek, Pustynia, Teksas, Vegas, Salt Lake City.

This data should be stored as world-level configuration so the GM can set the current region and have prices auto-adjust.

### 18.4 Uproszczenie Gamblingu

Optional simplification: treat .22 LR ammo as base currency (1 round = 1 gb). The GM may enable this as a world setting to streamline barter into a pseudo-currency system.

## 19. Reference Data Tables

### 19.1 Level Progression

The game has a hard level cap of 12. PD thresholds:

| Level | Required PD |
|-------|------------|
| 1 | 0 |
| 2 | 50 |
| 3 | 150 |
| 4 | 300 |
| 5 | 500 |
| 6 | 800 |
| 7 | 1100 |
| 8 | 1400 |
| 9 | 1900 |
| 10 | 2400 |
| 11 | 2900 |
| 12 | 3400 |

### 19.2 PW And KW Per Class

| Class group | PW at level 1 | PW per level (2+) | KW |
|-------------|---------------|--------------------|----|
| Brutal, Zwiadowca, Twardziel | 16 + mod KON | 4 + mod KON | k8 |
| Cwaniak, Spec, Złodziej | 12 + mod KON | 3 + mod KON | k6 |

### 19.3 Proficiency Bonus Progression

| Total character level | PB | Enemy rank | PB |
|-----------------------|----|------------|-----|
| 1–4 | +2 | Słaby | +2 |
| 5–8 | +3 | Przeciętny | +3 |
| 9–12 | +4 | Wymagający | +4 to +6 |

### 19.4 Gameplay Tiers

- Szczebel 1 (Levels 1–3): learning survival, simple missions, small locations
- Szczebel 2 (Levels 4–6): team cohesion, extra attacks, base established, wider area
- Szczebel 3 (Levels 7–9): good gear, political influence, strong enemies
- Szczebel 4 (Levels 10–12): endgame content, toughest opponents, epic scenarios

### 19.5 Pasywna Percepcja

Passive Perception = 10 + Mądrość (Percepcja) bonus. Used as the default ST for detecting hidden creatures. The sheet must display this value prominently, as it is referenced by hiding mechanics (Ukrywanie się ST = target's Passive Perception + 1).

### 19.6 Travel Pace

| Tempo | Per minute | Per hour | Per day |
|-------|-----------|---------|---------|
| Bardzo szybkie (vehicle ≥30 km/h) | 500 m | 30 km | 240 km |
| Szybkie (mount/slow vehicle) | 200 m | 12 km | 96 km |
| Normalne (on foot) | 100 m | 6 km | 48 km |
| Powolne (difficult terrain) | 50 m | 3 km | 24 km |

Bardzo szybkie: Utrudnienie to Percepcja/Survival, no hiding. Szybkie: Utrudnienie to Skradanie się. Powolne: Ułatwienie to Percepcja/Survival.

## 20. Color Profile Rule Details

Section 11 defers color implementation, but the rules each color changes must be documented so implementors know what to build.

Kolor Rdzy (Rust):

- choroba przewlekła is mandatory for all characters (roll at creation)
- diseases and medicines are a primary economy driver
- Fuks might be more tightly capped (confirm with MG house rules)

Kolor Rtęci (Mercury):

- fobia is mandatory for all characters (roll at creation)
- Przerażenie triggers are more frequent (fobia-relevant enemies are everywhere)
- recovery from phobias requires three consecutive successful saves and active roleplay

Kolor Stali (Steel):

- the default/balanced color; no mandatory modifications to base rules
- serves as the baseline from which other colors deviate
- all core mechanics apply as written without additional constraints or relaxations
- recommended for first-time groups and campaigns that want the full Neuroshima experience without color-specific distortions

Kolor Chromu (Chrome):

- ammo tracking is optional (or suspended)
- when not tracking ammo: DS and MS may only be used a limited number of times per encounter (1k6 check: 5–6 = can fire again; 1–4 = weapon overheated)
- brak amunicji rule: natural 1 on any firearm attack = empty magazine
- this color profile effectively disables the ammo economy

## Recommended Delivery Order

## Phase 1: Playable MVP

- terminology override
- Polish-first localization pass for the player sheet and komunikaty czatu
- custom character sheet shell
- Neuroshima skills (18 skills with correct ability pairings) and proficiencies
- all 22 tool sets registered
- TT/PW presentation
- tracking Stopnia Zranienia i Wyczerpania (with type tracking)
- Pasywna Percepcja display
- ammo and magazine tracking
- obsługa Ognia pojedynczego (P), KS, DS i OZ
- Pechowa jedynka automation (jam on nat 1 for firearms, degradation for melee)
- obsługa Osłony (including Przebijanie Osłony)
- Forsowanie (opcjonalne): "Forsuj" chat button on failed skill checks, Wyczerpanie auto-apply, world-level toggle
- initiative variants: Zaskoczenie (Utrudnienie), Niespodziewany atak (Ułatwienie)
- Bieganie vs Przyspieszenie as distinct actions
- special melee actions: Odepchnięcie, Pochwycenie, Wytrącenie
- rest durations: Krótki = 4h, Długi = 24h (override dnd5e defaults)
- level cap of 12 and PD progression table

## Phase 2: Full Equipment Layer

- weapon properties and attachments (all Neuroshima weapon flags: cicha, ciężka, długa, dublet, finezyjna, jednorazowa, obalająca, poręczna, powracająca, ppanc, przeładowanie, ładowanie, Wmag, spalinowa, zasilana, zasięgowa, SM)
- weapon damage die degradation tracking (current die vs base die per weapon item)
- weapon cleaned flag per weapon
- armor handling including powered armor (szczelność, odporność kinetyczna, Próg obrażeń pancerza)
- armor durability optional rule (TT degrades on TK)
- armor for animals (size-scaled pricing)
- barter values, weight, carry thresholds (Siła × 5 / × 10)
- Przedmioty podręczne panel (3 hard slots)
- surowce inventory (5 resource pools)
- medical items, Fanty, and consumables
- all 12 damage types registered in the system (note: Sieczne, not Cięte)
- gambling and barter economy UI (k100 availability, location modifiers, regional price table)
- object destruction system (TT by material, PW by size, Próg obrażeń for large objects)
- broń improwizowana support

## Phase 3: Progression Layer

- classes (all 6, with progression tables)
- professions (subclasses; including Monter drone-building rules)
- sztuczki
- origins (12 Pochodzenia with attribute bonuses and ability picker)
- multiclass rules (TT non-stacking, Drugi Atak non-stacking)
- startowe pakiety ekwipunku and advancement content
- XP panel and personal PD tracking (Pierwsze Spotkanie, Nowy obszar, Stopień Zranienia, przechwałki)

## Phase 4: Long-Term Survival Layer

- diseases (przewlekłe, ostre, krytyczne stages; daily save workflow; choroba popromienna; zakaźne; Death Breath)
- phobias (trigger check automation; Przełamanie workflow)
- Upojenie state and Kac mechanic
- environmental hazard automation (Podpalenie, Skażenie, Niedożywienie, Odwodnienie, Uduszenie)
- rest activities (cooking, hunting, gossip, cleaning, gambling, downtime production queue)
- vehicle actor type and vehicle combat rules (including Awarie pojazdów k20 table)
- chase system (marker-based pościg)
- underwater combat and swimming rules
- crafting system (schema items, production queue, surowce consumption, Szabrowanie and Bebeszenie workflows)
- drone actor templates (Dron kroczący, Dron latający) linked to builder's stats

## Phase 5: Content Population And Polish

- compendia population (all weapon tables, ammo, armor, all 22 tool sets, schematics, origins, classes, sztuczki, diseases, phobias, enemies, vehicles, drony)
- enemy sheets and imports from the bestiary
- color profile system as a global GM world setting (Stal, Rdza, Rtęć, Chrom rule toggling)
- regional price modifiers and availability tables as configurable world data
- UI polish and tactical HUD helpers (vehicle tracker, production progress bar, surowce panel)
- travel pace integration for overland journey tracking

## Dnd5e Breakpoint To Watch

If the module ends up replacing:

- most of the karty aktora
- death and rest workflow
- weapon activity workflow
- class progression content

then this is already very close to a dedicated system, not a thin override module. The current plan still starts module-first because dnd5e provides a strong d20 chassis, but the implementation should be reviewed after Phase 1. If Phase 1 already requires deep template replacement plus combat pipeline interception in many places, it may be cheaper long-term to fork into a dedicated Neuroshima system.

