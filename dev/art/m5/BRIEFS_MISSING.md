# Missing artwork briefs — M5 and carried requests

24 undelivered catalog images, updated 2026-10-18: seven ruin interiors,
four wrecks, nine map objects and four animal companions.
Delivered briefs: [BRIEFS_DELIVERED.md](BRIEFS_DELIVERED.md).
The [asset queue](../../icons/MISSING.md) also lists outstanding bestiary tokens.

The GM generates the images in DALL-E and hand-edits the sources; an agent
only crops, resizes and converts approved pixels.

**Current art direction (GM feedback, 2026-10-18):** grounded American
post-apocalyptic survival art. Capture the material realism and desolation
that make survival-horror imagery effective through concrete visual details,
without using franchise names that import fantasy or Eastern European settings.
Architecture, vehicles, fittings and everyday props should read as North American.

**Lighting follows purpose:** camps can have a small, practical fire or lamp,
with most of the environment cold and exposed. Looting scenes are deserted,
uninviting search locations lit by cold daylight or neutral-white flashlights;
no amber ambience, camp furniture or cosy refuge. Tokens and map objects use
neutral upper-left lighting and retain their transparent backgrounds.
Every ready-to-paste prompt below includes the complete restrictions.

Specs: [MISSING](../../icons/MISSING.md) §G/§H and
[PLAN_m5_postoj.md](../../../PLAN_m5_postoj.md) §7.23, D42–D45; this later GM
feedback updates the earlier style direction. Token proportions:
[tokens/PROMPT.md](../../../tokens/PROMPT.md). Older §B and §E requests follow M5.

Display sizes are composition targets. Generate one image per prompt, not an atlas.
For 3:1 banners, keep all decisive objects inside the central 1792×597 band of a
1792×1024 source (approximately y=213–811). The packer center-crops and resizes.
Keep medical packaging unlabelled and wreck craters in separate scene effects.
Final filenames, sizes and alpha rules stay
as specified below.

## ruiny/apteka

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

The interior of a looted American strip-mall pharmacy: fallen metal retail shelving, a glass dispensing counter, empty storage cabinets, scattered unlabelled blister packs, beige vinyl floor tiles and broken fluorescent fixtures. Cold grey daylight enters a cracked storefront window; a narrow neutral-white flashlight picks out the fallen shelves. Modern disposable medicine packaging only, no apothecary jars, potion bottles, shop signs, crosses, emblems or readable packaging.

An unwelcoming, unoccupied scavenging site, not a resting place. Cold overcast daylight, subdued neutral ambient light and a narrow neutral-white flashlight beam where needed. Dust, damp, rust, faded plastic and stained concrete; readable midtones and hard practical shadows. No amber mood lighting, campfire, candles, lanterns, bedrolls, cosy shelter, potion displays, treasure chests or theatrical fantasy glow.

Landscape scene. Compose the decisive room features, debris and practical lighting inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/apteka.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/apteka.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/biuro

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

An abandoned modest American apartment used as a small office: damaged drywall, a cheap laminate desk, a knocked-over steel filing cabinet, dusty shelves, faded picture frames with indistinct scenery and vines through a broken rectangular window. Cold overcast daylight and a tight neutral-white flashlight beam expose dust and water damage. Ordinary mass-produced furniture, no ornate woodwork, cosy study or recognizable faces.

An unwelcoming, unoccupied scavenging site, not a resting place. Cold overcast daylight, subdued neutral ambient light and a narrow neutral-white flashlight beam where needed. Dust, damp, rust, faded plastic and stained concrete; readable midtones and hard practical shadows. No amber mood lighting, campfire, candles, lanterns, bedrolls, cosy shelter, potion displays, treasure chests or theatrical fantasy glow.

Landscape scene. Compose the decisive room features, debris and practical lighting inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/biuro.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/biuro.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/magazyn

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A small ruined American warehouse with a steel portal frame, corrugated roof, tall pallet racks, torn plain cardboard boxes, weathered wooden pallets and a forklift tipped on its side. Flat cold daylight falls through holes in the roof and loading-bay opening, with deep practical shadows between shelves. No readable shipping labels, ceremonial storage hall or treasure piles.

An unwelcoming, unoccupied scavenging site, not a resting place. Cold overcast daylight, subdued neutral ambient light and a narrow neutral-white flashlight beam where needed. Dust, damp, rust, faded plastic and stained concrete; readable midtones and hard practical shadows. No amber mood lighting, campfire, candles, lanterns, bedrolls, cosy shelter, potion displays, treasure chests or theatrical fantasy glow.

Landscape scene. Compose the decisive room features, debris and practical lighting inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/magazyn.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/magazyn.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/piwnica

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A cramped utility basement beneath an ordinary American house: poured-concrete walls, exposed pipes, timber ceiling joists, a dead water heater and cheap steel shelves holding dusty unlabelled preserving jars. A thin grey shaft from a small high window and a narrow neutral-white flashlight reveal damp stains and debris. No candles, torch sconces, medieval cellar masonry, alchemist equipment or labels.

An unwelcoming, unoccupied scavenging site, not a resting place. Cold overcast daylight, subdued neutral ambient light and a narrow neutral-white flashlight beam where needed. Dust, damp, rust, faded plastic and stained concrete; readable midtones and hard practical shadows. No amber mood lighting, campfire, candles, lanterns, bedrolls, cosy shelter, potion displays, treasure chests or theatrical fantasy glow.

Landscape scene. Compose the decisive room features, debris and practical lighting inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/piwnica.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/piwnica.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/sklepik

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A ruined American convenience store: smashed plate-glass storefront, low metal retail shelves, a laminate checkout counter and an overturned glass-door drinks refrigerator with plain unlabelled bottles. Cold daylight enters from the street; a narrow neutral-white flashlight catches dust and broken floor tiles. No advertising, price tags, logos, tavern bar or inviting display of supplies.

An unwelcoming, unoccupied scavenging site, not a resting place. Cold overcast daylight, subdued neutral ambient light and a narrow neutral-white flashlight beam where needed. Dust, damp, rust, faded plastic and stained concrete; readable midtones and hard practical shadows. No amber mood lighting, campfire, candles, lanterns, bedrolls, cosy shelter, potion displays, treasure chests or theatrical fantasy glow.

Landscape scene. Compose the decisive room features, debris and practical lighting inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/sklepik.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/sklepik.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/warsztat

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A derelict American roadside auto-repair garage: raised roll-up bay door, an inspection pit, a hydraulic floor jack, broad tools on pegboard and a battered pickup supported without wheels. Cracked concrete, dirty engine parts and corroded steel. Cold overcast light through the open bay and a neutral-white inspection flashlight; no licence plate, badges, shop lettering or blacksmith forge.

An unwelcoming, unoccupied scavenging site, not a resting place. Cold overcast daylight, subdued neutral ambient light and a narrow neutral-white flashlight beam where needed. Dust, damp, rust, faded plastic and stained concrete; readable midtones and hard practical shadows. No amber mood lighting, campfire, candles, lanterns, bedrolls, cosy shelter, potion displays, treasure chests or theatrical fantasy glow.

Landscape scene. Compose the decisive room features, debris and practical lighting inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/warsztat.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/warsztat.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/wrak

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

The torn fuselage of a generic American passenger aircraft resting in sand: battered rows of mass-produced seats, broken overhead panels, exposed aluminium ribs and hanging electrical cables. Cold diffuse daylight enters through a breach; a narrow neutral-white flashlight reaches the dark interior. Dry dust and corroded metal, no airline livery, logos, lettering, bodies, treasure or supernatural glow.

An unwelcoming, unoccupied scavenging site, not a resting place. Cold overcast daylight, subdued neutral ambient light and a narrow neutral-white flashlight beam where needed. Dust, damp, rust, faded plastic and stained concrete; readable midtones and hard practical shadows. No amber mood lighting, campfire, candles, lanterns, bedrolls, cosy shelter, potion displays, treasure chests or theatrical fantasy glow.

Landscape scene. Compose the decisive room features, debris and practical lighting inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/wrak.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/wrak.png` — the GM's edited source; `dev/` is not shipped.

## wraki/maly

**Purpose:** Replaces a Small machine token after self-destruction. A 1×1 grid token, roughly 70 screen px per square; the wreck occupies about 70% of its frame and may sit beside other combat tokens and an independently drawn explosion decal.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A torn small drone body: bent sheet metal, a few splayed cables and scorched panels, no intact rotors. A compact mechanical wreck, no living creature.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 70% of the square, preserving clear transparent margins and corners. The wreck's former front points down, toward the bottom of the frame. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Neutral upper-left illumination on the subject itself, crisp readable painterly silhouette. No contact or cast shadow, no smoke cloud, no crater; any explosion decal is separate.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **70%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/wraki/maly.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/wraki/maly.png` — the GM's edited source; `dev/` is not shipped.

## wraki/sredni

**Purpose:** Replaces a Medium machine token after self-destruction. A 1×1 grid token, roughly 70 screen px per square; the wreck fills about 90% of the frame. It remains readable beside intact tokens and an independent explosion decal.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

The burnt skeleton of a human-sized machine, twisted mechanical limbs and charred joints. Scorching is painted on the metal; no smoke clouds or separate ground effects.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 90% of the square, preserving clear transparent margins and corners. The wreck's former front points down, toward the bottom of the frame. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Neutral upper-left illumination on the subject itself, crisp readable painterly silhouette. No contact or cast shadow, no smoke cloud, no crater; any explosion decal is separate.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **90%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/wraki/sredni.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/wraki/sredni.png` — the GM's edited source; `dev/` is not shipped.

## wraki/duzy

**Purpose:** Replaces a Large machine token after self-destruction. A 2×2 grid token, roughly 140 × 140 screen px at a 70 px grid; the wreck fills about 90% of its frame and has no baked scene background.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

The opened wreck hull of a heavy machine, cracked armour plates and exposed servos, with a few bent supports lying close to the hull. Mechanically distinct from the human-sized skeleton.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 800×800 px. Center the subject; its longest visible extent fills about 90% of the square, preserving clear transparent margins and corners. The wreck's former front points down, toward the bottom of the frame. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Neutral upper-left illumination on the subject itself, crisp readable painterly silhouette. No contact or cast shadow, no smoke cloud, no crater; any explosion decal is separate.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **90%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/wraki/duzy.webp`** — **800×800 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/wraki/duzy.png` — the GM's edited source; `dev/` is not shipped.

## wraki/gigantyczny

**Purpose:** Shared wreck artwork for the largest machine tokens; Foundry retains the original token footprint. At a 70 px grid a 4×4 footprint is about 280 × 280 screen px. Use a 1600 px master for the largest documented token class and about 92% frame fill.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

The immense burned hull of a generic war machine with broken tracks and collapsed mechanical legs spread close to its body. Suggest the violent collapse with torn metal alone; no ground, crater, rubble terrain or recognisable franchise robot.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 1600×1600 px. Center the subject; its longest visible extent fills about 92% of the square, preserving clear transparent margins and corners. The wreck's former front points down, toward the bottom of the frame. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Neutral upper-left illumination on the subject itself, crisp readable painterly silhouette. No contact or cast shadow, no smoke cloud, no crater; any explosion decal is separate.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **92%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins. For the large final master, the GM should save an edited square source at least 1600 px wide; conversion from 1024 px necessarily upscales and cannot add detail.

**Final spec and name:** **`tokens/wraki/gigantyczny.webp`** — **1600×1600 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/wraki/gigantyczny.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-molotov

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A brown-tinted glass bottle lying on its side, viewed directly from above, with a cloth rag stuffed into its neck and a small bright flame burning at the rag. Liquid visible in the bottle. No label.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-molotov.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-molotov.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-dynamite

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

One red dynamite stick lying flat, directly overhead, a short fuse at one end with a small bright sparking tip. No printed warning or label.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-dynamite.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-dynamite.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-c4-remote

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

An off-white plastic explosive block in olive wrapping, lying flat, an electric cap pushed into it and two short wires trailing from it. No markings.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-c4-remote.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-c4-remote.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-ied

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A short steel pipe bomb with end caps and a small wind-up alarm clock taped to it with thick wires. Directly overhead, practical battered metal and duct tape; clock face has hands but no numerals.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-ied.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-ied.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-ied-radio

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

The same compact steel pipe bomb form with a small radio receiver box and a short whip antenna replacing the clock. Directly overhead; no labels, readouts or lettering.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-ied-radio.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-ied-radio.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-smoke

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A cylindrical smoke grenade lying on its side, directly overhead, with a pull ring and a very small pale wisp at its opening. Preserve readable metal body edges and real alpha around the wisp.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-smoke.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-smoke.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-flashbang

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A flashbang lying on its side, directly overhead, a perforated cylindrical body, spoon lever and pin ring. Broad clean holes; no markings.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-flashbang.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-flashbang.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-incendiary

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

An incendiary grenade canister lying on its side, directly overhead, one plain red identification band without lettering.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-incendiary.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-incendiary.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-improvised

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

An improvised tin-can grenade lying on its side, directly overhead, broad nails and bolts visible at an opening, duct tape and a short fuse. No food brand or label.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Neutral upper-left light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-improvised.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-improvised.png` — the GM's edited source; `dev/` is not shipped.

## towarzysze/towarzysz-psi-partner

**Purpose:** Older section E request: Psi partner, Small companion token on a 1×1 grid beside the party's tokens. About 70 px per grid square, with the body filling 70% of the frame; this must be a usable overhead token, not a portrait.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A scruffy short-haired wasteland mongrel dog, a simple collar with a short piece of chain, crouched forward, head toward the bottom of the frame, legs splayed enough to read from overhead. Mutation is biological: plausible bones, skin, chitin and joints, with no magical aura, glowing eyes, fantasy mount equipment or ornamental armour.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 70% of the square, preserving clear transparent margins and corners. Head toward the bottom of the frame; limbs splay outward. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Neutral upper-left illumination on the subject itself, crisp readable painterly silhouette. Only a very short soft contact shadow lower-right, on alpha and close to the body, following tokens/PROMPT.md; no long cast shadow.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **70%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/towarzysz-psi-partner.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/towarzysze/towarzysz-psi-partner.png` — the GM's edited source; `dev/` is not shipped.

## towarzysze/towarzysz-zmutowany-owad

**Purpose:** Older section E request: mutated insect, Small companion token on a 1×1 grid, body filling about 70% of the frame; silhouette must distinguish it from the dog at roughly 70 screen px.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A dog-sized mutated burrowing insect, thick chitin armour, strong digging forelegs, side legs and broad mandibles. Head toward the bottom of the frame. No wings or upright humanoid pose. Mutation is biological: plausible bones, skin, chitin and joints, with no magical aura, glowing eyes, fantasy mount equipment or ornamental armour.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 70% of the square, preserving clear transparent margins and corners. Head toward the bottom of the frame; limbs splay outward. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Neutral upper-left illumination on the subject itself, crisp readable painterly silhouette. Only a very short soft contact shadow lower-right, on alpha and close to the body, following tokens/PROMPT.md; no long cast shadow.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **70%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/towarzysz-zmutowany-owad.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/towarzysze/towarzysz-zmutowany-owad.png` — the GM's edited source; `dev/` is not shipped.

## towarzysze/towarzysz-zmutowany-ssak

**Purpose:** Older section E request: mutated mammal, Large companion token on a 2×2 grid, roughly 140 × 140 screen px; body occupies about 90% of the frame beside humanoid party tokens.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A powerful Large mutated predator with a bear-like body, canine muzzle and sparse bare skin patches among coarse fur. Hunched forward, head toward the bottom of the frame, limbs splayed; no wounds or gore. Mutation is biological: plausible bones, skin, chitin and joints, with no magical aura, glowing eyes, fantasy mount equipment or ornamental armour.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 800×800 px. Center the subject; its longest visible extent fills about 90% of the square, preserving clear transparent margins and corners. Head toward the bottom of the frame; limbs splay outward. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Neutral upper-left illumination on the subject itself, crisp readable painterly silhouette. Only a very short soft contact shadow lower-right, on alpha and close to the body, following tokens/PROMPT.md; no long cast shadow.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **90%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/towarzysz-zmutowany-ssak.webp`** — **800×800 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/towarzysze/towarzysz-zmutowany-ssak.png` — the GM's edited source; `dev/` is not shipped.

## towarzysze/towarzysz-zmutowany-gad

**Purpose:** Older section E request: mutated reptile, Medium companion token on a 1×1 grid, roughly 70 × 70 screen px; body fills about 90% of the frame, visibly larger than the Small dog and insect.

**Prompt:**

```text
Grounded, painterly post-apocalyptic survival concept art set in the United States. Realistic proportions, believable construction, worn industrial materials, muted natural colours and clear shapes readable at small size. Use late-20th-century North American equipment and built environments. No medieval architecture, fantasy armour, magic, runes, glowing anomalies, luminous vegetation, steampunk ornament or heroic RPG styling. No Soviet insignia, Soviet uniforms or Eastern European landmark architecture. Entirely generic and reusable, no recognizable characters, text, lettering, numbers, labels, logos, watermarks or gore.

A Medium amphibious mutated lizard, mud-coloured scales, broad paddled tail and splayed clawed feet. Hunched forward with its head toward the bottom of the frame; recognisable as a lizard from near-overhead. Mutation is biological: plausible bones, skin, chitin and joints, with no magical aura, glowing eyes, fantasy mount equipment or ornamental armour.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 90% of the square, preserving clear transparent margins and corners. Head toward the bottom of the frame; limbs splay outward. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Neutral upper-left illumination on the subject itself, crisp readable painterly silhouette. Only a very short soft contact shadow lower-right, on alpha and close to the body, following tokens/PROMPT.md; no long cast shadow.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **90%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/towarzysz-zmutowany-gad.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/towarzysze/towarzysz-zmutowany-gad.png` — the GM's edited source; `dev/` is not shipped.
