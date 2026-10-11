# Painted artwork briefs — M5 and carried requests

The GM generates these images in DALL-E and hand-edits the sources. An agent only packages approved source pixels. Specs: [MISSING](../../icons/MISSING.md) §G/§H and [PLAN_m5_postoj.md](../../../PLAN_m5_postoj.md) §7.23, D42–D45; token proportions: [tokens/PROMPT.md](../../../tokens/PROMPT.md). Older §B and §E requests follow the M5 queue. No source or final artwork has been delivered yet.

Display sizes below are composition targets, not a claim about unfinished UI code. Every prompt includes the shared §G style block and can be pasted on its own. Generate one image per prompt; do not put painted art into a nine-cell icon atlas.

For banners, a 1792×1024 source loses about 213 px above and below in the centered 3:1 crop (central 1792×597 band). For portraits, a 1024×1792 source loses about 213 px above and below in the centered 3:4 crop (central 1024×1365 band). The packer uses the same centered ratios for edited sources of any size. Arrange every important object inside these bands before hand-editing.

The medical crosses in the queue become unlabelled medicine props, subway graffiti becomes abstract paint, and the giant wreck's crater stays a separate scene effect. These choices preserve the required no-logos/no-lettering rule and transparent, ground-free token format.

## handlarze/obwozny

**Purpose:** Exchange table, beside the goods list and barter controls. One side portrait, approximately 160–240 × 213–320 CSS px at a 3:4 ratio; these are composition targets pending the M5 layout. The goods and values remain outside the picture.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A generic travelling barter seller behind a tarpaulin display attached to a battered wagon, a dog-sized mutated pack animal hitched beside it, provisions and practical wares, one warm lantern. The seller's face is partly in shadow.

Vertical 1024×1792 composition for a centered 3:4 crop. Keep the head, hands, counter and defining wares inside the middle 1024×1365 band. The seller is an anonymous archetype, face in half-shadow, with no recognizable identity. No border.
```

**Generation and crop:** Generate **1024×1792** portrait. Keep face, hands and identifying goods inside the central **3:4 band**, approximately y=213–1579. The packer center-crops to 3:4 and resizes.

**Final spec and name:** **`ui/handlarze/obwozny.webp`** — **600×800 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/handlarze/obwozny.png` — the GM's edited source; `dev/` is not shipped.

## handlarze/barman

**Purpose:** Exchange table, beside the goods list and barter controls. One side portrait, approximately 160–240 × 213–320 CSS px at a 3:4 ratio; these are composition targets pending the M5 layout. The goods and values remain outside the picture.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A generic barkeeper behind a counter made from barrels, unlabelled bottles, a cracked mirror repaired with broad strips of duct tape, one warm lamp. Face partly in shadow; no readable bottle labels.

Vertical 1024×1792 composition for a centered 3:4 crop. Keep the head, hands, counter and defining wares inside the middle 1024×1365 band. The seller is an anonymous archetype, face in half-shadow, with no recognizable identity. No border.
```

**Generation and crop:** Generate **1024×1792** portrait. Keep face, hands and identifying goods inside the central **3:4 band**, approximately y=213–1579. The packer center-crops to 3:4 and resizes.

**Final spec and name:** **`ui/handlarze/barman.webp`** — **600×800 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/handlarze/barman.png` — the GM's edited source; `dev/` is not shipped.

## handlarze/stragan

**Purpose:** Exchange table, beside the goods list and barter controls. One side portrait, approximately 160–240 × 213–320 CSS px at a 3:4 ratio; these are composition targets pending the M5 layout. The goods and values remain outside the picture.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A generic farmer behind a market stall with vegetable crates, a few strips of dried meat and a plain balance scale, under a salvaged canopy and warm lantern. Face partly in shadow; ordinary food, no gore.

Vertical 1024×1792 composition for a centered 3:4 crop. Keep the head, hands, counter and defining wares inside the middle 1024×1365 band. The seller is an anonymous archetype, face in half-shadow, with no recognizable identity. No border.
```

**Generation and crop:** Generate **1024×1792** portrait. Keep face, hands and identifying goods inside the central **3:4 band**, approximately y=213–1579. The packer center-crops to 3:4 and resizes.

**Final spec and name:** **`ui/handlarze/stragan.webp`** — **600×800 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/handlarze/stragan.png` — the GM's edited source; `dev/` is not shipped.

## handlarze/wielobranzowy

**Purpose:** Exchange table, beside the goods list and barter controls. One side portrait, approximately 160–240 × 213–320 CSS px at a 3:4 ratio; these are composition targets pending the M5 layout. The goods and values remain outside the picture.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A generic general-store seller behind a cluttered counter, shelves of fuel cans, folded blankets and plain tins reaching overhead, a dead cash register used as an ornament, one warm lamp. Face partly in shadow; no currency or readable displays.

Vertical 1024×1792 composition for a centered 3:4 crop. Keep the head, hands, counter and defining wares inside the middle 1024×1365 band. The seller is an anonymous archetype, face in half-shadow, with no recognizable identity. No border.
```

**Generation and crop:** Generate **1024×1792** portrait. Keep face, hands and identifying goods inside the central **3:4 band**, approximately y=213–1579. The packer center-crops to 3:4 and resizes.

**Final spec and name:** **`ui/handlarze/wielobranzowy.webp`** — **600×800 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/handlarze/wielobranzowy.png` — the GM's edited source; `dev/` is not shipped.

## handlarze/bron

**Purpose:** Exchange table, beside the goods list and barter controls. One side portrait, approximately 160–240 × 213–320 CSS px at a 3:4 ratio; these are composition targets pending the M5 layout. The goods and values remain outside the picture.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A generic gunsmith behind a barred counter, practical rifles hung on the wall, a repair bench at the back and closed ammunition crates, warm work light. Face partly in shadow; no weapon brands or readable crate markings.

Vertical 1024×1792 composition for a centered 3:4 crop. Keep the head, hands, counter and defining wares inside the middle 1024×1365 band. The seller is an anonymous archetype, face in half-shadow, with no recognizable identity. No border.
```

**Generation and crop:** Generate **1024×1792** portrait. Keep face, hands and identifying goods inside the central **3:4 band**, approximately y=213–1579. The packer center-crops to 3:4 and resizes.

**Final spec and name:** **`ui/handlarze/bron.webp`** — **600×800 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/handlarze/bron.png` — the GM's edited source; `dev/` is not shipped.

## handlarze/apteka

**Purpose:** Exchange table, beside the goods list and barter controls. One side portrait, approximately 160–240 × 213–320 CSS px at a 3:4 ratio; these are composition targets pending the M5 layout. The goods and values remain outside the picture.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A generic medicine trader behind wire mesh, jars and unlabelled vials, a small apothecary balance and warm lamp. The medicine display suggests an improvised pharmacy through objects alone. Face partly in shadow; omit signs, emblems and crosses to keep the no-logos requirement.

Vertical 1024×1792 composition for a centered 3:4 crop. Keep the head, hands, counter and defining wares inside the middle 1024×1365 band. The seller is an anonymous archetype, face in half-shadow, with no recognizable identity. No border.
```

**Generation and crop:** Generate **1024×1792** portrait. Keep face, hands and identifying goods inside the central **3:4 band**, approximately y=213–1579. The packer center-crops to 3:4 and resizes.

**Final spec and name:** **`ui/handlarze/apteka.webp`** — **600×800 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/handlarze/apteka.png` — the GM's edited source; `dev/` is not shipped.

## handlarze/warsztat

**Purpose:** Exchange table, beside the goods list and barter controls. One side portrait, approximately 160–240 × 213–320 CSS px at a 3:4 ratio; these are composition targets pending the M5 layout. The goods and values remain outside the picture.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A generic scrap and electronics trader behind a repair bench, piles of useful parts, thick cables and one dismantled radio under a warm workshop lamp. Face partly in shadow; no readable dials or labels.

Vertical 1024×1792 composition for a centered 3:4 crop. Keep the head, hands, counter and defining wares inside the middle 1024×1365 band. The seller is an anonymous archetype, face in half-shadow, with no recognizable identity. No border.
```

**Generation and crop:** Generate **1024×1792** portrait. Keep face, hands and identifying goods inside the central **3:4 band**, approximately y=213–1579. The packer center-crops to 3:4 and resizes.

**Final spec and name:** **`ui/handlarze/warsztat.webp`** — **600×800 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/handlarze/warsztat.png` — the GM's edited source; `dev/` is not shipped.

## postoj/utrzymanie-nedzny

**Purpose:** Player Doba window when selecting upkeep, individual daily summary card, and narrative time-skip summary. One banner above the sleep, activities and barter account fields; never behind text. Compose for approximately 600–900 × 200–300 CSS px in a window and 300–360 × 100–120 px on a chat card; final responsive dimensions depend on the M5 layout.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A miserable sleeping corner in a ruined building: a rag bedding pile on bare concrete, an unlabelled tin warming over a tiny fire, water dripping through the broken roof. Warm firelight surrounded by cold, damp rubble. No foreground person.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/postoj/utrzymanie-nedzny.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/postoj/utrzymanie-nedzny.png` — the GM's edited source; `dev/` is not shipped.

## postoj/utrzymanie-normalny

**Purpose:** Player Doba window when selecting upkeep, individual daily summary card, and narrative time-skip summary. One banner above the sleep, activities and barter account fields; never behind text. Compose for approximately 600–900 × 200–300 CSS px in a window and 300–360 × 100–120 px on a chat card; final responsive dimensions depend on the M5 layout.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A modest, maintained room: a simple bunk, a rough table with a bowl of stew, a kerosene lamp and a boarded window. Warm lamp glow and practical shelter against a harsh ruined exterior. No foreground person.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/postoj/utrzymanie-normalny.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/postoj/utrzymanie-normalny.png` — the GM's edited source; `dev/` is not shipped.

## postoj/utrzymanie-bogaty

**Purpose:** Player Doba window when selecting upkeep, individual daily summary card, and narrative time-skip summary. One banner above the sleep, activities and barter account fields; never behind text. Compose for approximately 600–900 × 200–300 CSS px in a window and 300–360 × 100–120 px on a chat card; final responsive dimensions depend on the M5 layout.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A comfortable salvaged room: a proper bed with a thick blanket, an unlabelled bottle of prewar liquor, a gramophone and soft warm lamplight. Sparse recovered comforts still belong in a grim post-apocalyptic world. No foreground person.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/postoj/utrzymanie-bogaty.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/postoj/utrzymanie-bogaty.png` — the GM's edited source; `dev/` is not shipped.

## oboz/pustynia

**Purpose:** Player short-rest and long-rest windows, and Doba in the wilderness; the party travel biome selects the image. One banner above rest, supply and daily-plan controls, approximately 600–900 × 200–300 CSS px, or 300–360 × 100–120 px on a reused summary card. No rule information is encoded in the scenery.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A night campfire sheltered behind the wreck of a truck, sand dunes and a starry sky. Arrange the fire, truck silhouette and dune horizon inside the middle horizontal band; warm shelter in a cold empty desert.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/oboz/pustynia.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/oboz/pustynia.png` — the GM's edited source; `dev/` is not shipped.

## oboz/preria

**Purpose:** Player short-rest and long-rest windows, and Doba in the wilderness; the party travel biome selects the image. One banner above rest, supply and daily-plan controls, approximately 600–900 × 200–300 CSS px, or 300–360 × 100–120 px on a reused summary card. No rule information is encoded in the scenery.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A night campfire in tall prairie grass near a rusted windmill, a distant storm visible as dark clouds and faint lightning. The fire and shelter read clearly in the central strip.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/oboz/preria.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/oboz/preria.png` — the GM's edited source; `dev/` is not shipped.

## oboz/las

**Purpose:** Player short-rest and long-rest windows, and Doba in the wilderness; the party travel biome selects the image. One banner above rest, supply and daily-plan controls, approximately 600–900 × 200–300 CSS px, or 300–360 × 100–120 px on a reused summary card. No rule information is encoded in the scenery.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A night campfire between huge, sickly overgrown forest trees, plain hammocks strung nearby and low mist. Suitable for both forest and mutated jungle. Show the lower trunks, hammocks and fire in the central strip, with oppressive dark foliage beyond.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/oboz/las.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/oboz/las.png` — the GM's edited source; `dev/` is not shipped.

## oboz/gory

**Purpose:** Player short-rest and long-rest windows, and Doba in the wilderness; the party travel biome selects the image. One banner above rest, supply and daily-plan controls, approximately 600–900 × 200–300 CSS px, or 300–360 × 100–120 px on a reused summary card. No rule information is encoded in the scenery.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A night campfire under a rock overhang beside a snowdrift and an abandoned cable-car station. Keep sheltered fire, snow edge and the station silhouette together in the central strip.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/oboz/gory.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/oboz/gory.png` — the GM's edited source; `dev/` is not shipped.

## oboz/bagna

**Purpose:** Player short-rest and long-rest windows, and Doba in the wilderness; the party travel biome selects the image. One banner above rest, supply and daily-plan controls, approximately 600–900 × 200–300 CSS px, or 300–360 × 100–120 px on a reused summary card. No rule information is encoded in the scenery.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A night campfire safely contained on a rough plank jetty above black swamp water, a small moored boat and a few fireflies. The jetty, warm flame and boat stay in the middle strip; no glowing fantasy creatures.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/oboz/bagna.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/oboz/bagna.png` — the GM's edited source; `dev/` is not shipped.

## oboz/ruiny

**Purpose:** Player short-rest and long-rest windows, and Doba in the wilderness; the party travel biome selects the image. One banner above rest, supply and daily-plan controls, approximately 600–900 × 200–300 CSS px, or 300–360 × 100–120 px on a reused summary card. No rule information is encoded in the scenery.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A night fire burning in a barrel inside a ruined office lobby, broken columns and distant unmarked machine lights beyond shattered windows. Suitable for city ruins and machine territory. No recognizable machines or factions.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/oboz/ruiny.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/oboz/ruiny.png` — the GM's edited source; `dev/` is not shipped.

## oboz/podziemia

**Purpose:** Player short-rest and long-rest windows, and Doba in the wilderness; the party travel biome selects the image. One banner above rest, supply and daily-plan controls, approximately 600–900 × 200–300 CSS px, or 300–360 × 100–120 px on a reused summary card. No rule information is encoded in the scenery.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A night camp on an abandoned subway platform lit by a carbide lamp beside a small campfire. Dark tunnel mouth, cracked tiles and abstract paint stains on the walls. The stains must never resemble letters or readable graffiti.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/oboz/podziemia.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/oboz/podziemia.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/apteka

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

The interior of a looted pharmacy: fallen shelving, scattered unlabelled blister packs and empty cabinets, a flashlight's warm beam against cold daylight from a cracked window. No shop sign, glowing green cross, emblem or readable packaging.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/apteka.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/apteka.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/biuro

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

An abandoned apartment that can also suggest a small office: dusty shelves and desk, faded picture frames with indistinct scenery rather than identifiable faces, vines entering through a broken window. A warm flashlight beam crosses the room.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/biuro.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/biuro.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/magazyn

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A small ruined warehouse with tall storage racks, torn plain cardboard boxes and a forklift tipped on its side. Warm inspection light against dusty cool daylight; no readable shipping labels.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/magazyn.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/magazyn.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/piwnica

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A cramped abandoned cellar with jars on shelves, exposed pipes and a thin shaft of daylight from a tiny high window. A warm flashlight pool picks out the central shelves. No labels on jars.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/piwnica.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/piwnica.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/sklepik

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A ruined neighbourhood shop: smashed display window, low counter and overturned drinks refrigerator with plain unlabelled bottles. Warm flashlight beam and cold daylight; no advertising, price tags or logos.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/sklepik.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/sklepik.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/warsztat

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A ruined car repair workshop with an inspection pit, broad tools hung on a board and a car supported without wheels. Warm inspection lamp, dusty cool daylight; no number plate, badges or shop lettering.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/warsztat.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/warsztat.png` — the GM's edited source; `dev/` is not shipped.

## ruiny/wrak

**Purpose:** Public player scavenging request card, above the search prompt and roll controls. One 3:1 banner at approximately 300–360 × 100–120 CSS px; it depicts only the type of ruin, without revealing loot, hazards or hidden occupants. Keep the decisive objects legible at chat-card size.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

The torn fuselage of a generic passenger aircraft resting in sand, rows of battered seats visible inside and cables hanging from the ceiling. Warm flashlight beam against cold daylight through the breach. No airline livery, logos, lettering or bodies.

Landscape scene. Compose the decisive subject, warm light and horizon inside the central horizontal 1792×597 band of a 1792×1024 image, leaving expendable scenery above and below. The final picture is a wide 3:1 banner. No border.
```

**Generation and crop:** Generate **1792×1024** landscape. Keep all essential objects in the central **3:1 band**, approximately y=213–811; the packer center-crops to 3:1 and resizes. Top and bottom are expendable.

**Final spec and name:** **`ui/ruiny/wrak.webp`** — **1200×400 WEBP**, RGB, opaque, no alpha.

**Drop point:** `dev/art/m5/in/ruiny/wrak.png` — the GM's edited source; `dev/` is not shipped.

## wraki/maly

**Purpose:** Replaces a Small machine token after self-destruction. A 1×1 grid token, roughly 70 screen px per square; the wreck occupies about 70% of its frame and may sit beside other combat tokens and an independently drawn explosion decal.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A torn small drone body: bent sheet metal, a few splayed cables and scorched panels, no intact rotors. A compact mechanical wreck, no living creature.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 70% of the square, preserving clear transparent margins and corners. The wreck's former front points down, toward the bottom of the frame. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Warm upper-left illumination on the subject itself, crisp readable painterly silhouette. No contact or cast shadow, no smoke cloud, no crater; any explosion decal is separate.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **70%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/wraki/maly.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/wraki/maly.png` — the GM's edited source; `dev/` is not shipped.

## wraki/sredni

**Purpose:** Replaces a Medium machine token after self-destruction. A 1×1 grid token, roughly 70 screen px per square; the wreck fills about 90% of the frame. It remains readable beside intact tokens and an independent explosion decal.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

The burnt skeleton of a human-sized machine, twisted mechanical limbs and charred joints. Scorching is painted on the metal; no smoke clouds or separate ground effects.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 90% of the square, preserving clear transparent margins and corners. The wreck's former front points down, toward the bottom of the frame. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Warm upper-left illumination on the subject itself, crisp readable painterly silhouette. No contact or cast shadow, no smoke cloud, no crater; any explosion decal is separate.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **90%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/wraki/sredni.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/wraki/sredni.png` — the GM's edited source; `dev/` is not shipped.

## wraki/duzy

**Purpose:** Replaces a Large machine token after self-destruction. A 2×2 grid token, roughly 140 × 140 screen px at a 70 px grid; the wreck fills about 90% of its frame and has no baked scene background.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

The opened wreck hull of a heavy machine, cracked armour plates and exposed servos, with a few bent supports lying close to the hull. Mechanically distinct from the human-sized skeleton.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 800×800 px. Center the subject; its longest visible extent fills about 90% of the square, preserving clear transparent margins and corners. The wreck's former front points down, toward the bottom of the frame. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Warm upper-left illumination on the subject itself, crisp readable painterly silhouette. No contact or cast shadow, no smoke cloud, no crater; any explosion decal is separate.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **90%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/wraki/duzy.webp`** — **800×800 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/wraki/duzy.png` — the GM's edited source; `dev/` is not shipped.

## wraki/gigantyczny

**Purpose:** Shared wreck artwork for the largest machine tokens; Foundry retains the original token footprint. At a 70 px grid a 4×4 footprint is about 280 × 280 screen px. Use a 1600 px master for the largest documented token class and about 92% frame fill.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

The immense burned hull of a generic war machine with broken tracks and collapsed mechanical legs spread close to its body. Suggest the violent collapse with torn metal alone; no ground, crater, rubble terrain or recognisable franchise robot.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 1600×1600 px. Center the subject; its longest visible extent fills about 92% of the square, preserving clear transparent margins and corners. The wreck's former front points down, toward the bottom of the frame. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Warm upper-left illumination on the subject itself, crisp readable painterly silhouette. No contact or cast shadow, no smoke cloud, no crater; any explosion decal is separate.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **92%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins. For the large final master, the GM should save an edited square source at least 1600 px wide; conversion from 1024 px necessarily upscales and cannot add detail.

**Final spec and name:** **`tokens/wraki/gigantyczny.webp`** — **1600×1600 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/wraki/gigantyczny.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-molotov

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A brown-tinted glass bottle lying on its side, viewed directly from above, with a cloth rag stuffed into its neck and a small bright flame burning at the rag. Liquid visible in the bottle. No label.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-molotov.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-molotov.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-dynamite

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

One red dynamite stick lying flat, directly overhead, a short fuse at one end with a small bright sparking tip. No printed warning or label.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-dynamite.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-dynamite.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-c4-remote

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

An off-white plastic explosive block in olive wrapping, lying flat, an electric cap pushed into it and two short wires trailing from it. No markings.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-c4-remote.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-c4-remote.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-ied

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A short steel pipe bomb with end caps and a small wind-up alarm clock taped to it with thick wires. Directly overhead, practical battered metal and duct tape; clock face has hands but no numerals.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-ied.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-ied.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-ied-radio

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

The same compact steel pipe bomb form with a small radio receiver box and a short whip antenna replacing the clock. Directly overhead; no labels, readouts or lettering.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-ied-radio.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-ied-radio.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-smoke

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A cylindrical smoke grenade lying on its side, directly overhead, with a pull ring and a very small pale wisp at its opening. Preserve readable metal body edges and real alpha around the wisp.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-smoke.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-smoke.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-flashbang

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A flashbang lying on its side, directly overhead, a perforated cylindrical body, spoon lever and pin ring. Broad clean holes; no markings.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-flashbang.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-flashbang.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-incendiary

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

An incendiary grenade canister lying on its side, directly overhead, one plain red identification band without lettering.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-incendiary.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-incendiary.png` — the GM's edited source; `dev/` is not shipped.

## objekty/grenade-improvised

**Purpose:** Older section B request: physical explosive lying on the map as a Tile, usually only 20–30 screen px. It appears beside token art and a separately rendered fuze/area marker, so the object silhouette dominates. These are object pictures, not white inventory glyphs.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

An improvised tin-can grenade lying on its side, directly overhead, broad nails and bolts visible at an opening, duct tape and a short fuse. No food brand or label.

Directly overhead view of the physical object lying flat, with no horizon or perspective tilt. Fully transparent background, no floor, ground, cast shadow, border, ring or base. Warm light on weathered materials; broad clear silhouette readable at 20–30 px. Keep the complete object and any fuse, flame or antenna inside a central square.
```

**Generation and crop:** Generate **1792×1024** landscape, placing the complete object within the central square; a 1024×1792 source is also usable. During editing remove all matte background and baked shadows, preserving genuine alpha around flames/wisps. The packer trims to alpha bounds, keeps the native aspect, then sets the long side to 128 px; it never squares this object.

**Final spec and name:** **`vfx/grenade-improvised.webp`** — native aspect ratio, **128 px long side**, WEBP **RGBA with real alpha**, no baked ground or shadow.

**Drop point:** `dev/art/m5/in/objekty/grenade-improvised.png` — the GM's edited source; `dev/` is not shipped.

## towarzysze/towarzysz-psi-partner

**Purpose:** Older section E request: Psi partner, Small companion token on a 1×1 grid beside the party's tokens. About 70 px per grid square, with the body filling 70% of the frame; this must be a usable overhead token, not a portrait.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A scruffy short-haired wasteland mongrel dog, a simple collar with a short piece of chain, crouched forward, head toward the bottom of the frame, legs splayed enough to read from overhead.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 70% of the square, preserving clear transparent margins and corners. Head toward the bottom of the frame; limbs splay outward. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Warm upper-left illumination on the subject itself, crisp readable painterly silhouette. Only a very short soft contact shadow lower-right, on alpha and close to the body, following tokens/PROMPT.md; no long cast shadow.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **70%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/towarzysz-psi-partner.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/towarzysze/towarzysz-psi-partner.png` — the GM's edited source; `dev/` is not shipped.

## towarzysze/towarzysz-zmutowany-owad

**Purpose:** Older section E request: mutated insect, Small companion token on a 1×1 grid, body filling about 70% of the frame; silhouette must distinguish it from the dog at roughly 70 screen px.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A dog-sized mutated burrowing insect, thick chitin armour, strong digging forelegs, side legs and broad mandibles. Head toward the bottom of the frame. No wings or upright humanoid pose.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 70% of the square, preserving clear transparent margins and corners. Head toward the bottom of the frame; limbs splay outward. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Warm upper-left illumination on the subject itself, crisp readable painterly silhouette. Only a very short soft contact shadow lower-right, on alpha and close to the body, following tokens/PROMPT.md; no long cast shadow.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **70%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/towarzysz-zmutowany-owad.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/towarzysze/towarzysz-zmutowany-owad.png` — the GM's edited source; `dev/` is not shipped.

## towarzysze/towarzysz-zmutowany-ssak

**Purpose:** Older section E request: mutated mammal, Large companion token on a 2×2 grid, roughly 140 × 140 screen px; body occupies about 90% of the frame beside humanoid party tokens.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A powerful Large mutated predator with a bear-like body, canine muzzle and sparse bare skin patches among coarse fur. Hunched forward, head toward the bottom of the frame, limbs splayed; no wounds or gore.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 800×800 px. Center the subject; its longest visible extent fills about 90% of the square, preserving clear transparent margins and corners. Head toward the bottom of the frame; limbs splay outward. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Warm upper-left illumination on the subject itself, crisp readable painterly silhouette. Only a very short soft contact shadow lower-right, on alpha and close to the body, following tokens/PROMPT.md; no long cast shadow.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **90%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/towarzysz-zmutowany-ssak.webp`** — **800×800 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/towarzysze/towarzysz-zmutowany-ssak.png` — the GM's edited source; `dev/` is not shipped.

## towarzysze/towarzysz-zmutowany-gad

**Purpose:** Older section E request: mutated reptile, Medium companion token on a 1×1 grid, roughly 70 × 70 screen px; body fills about 90% of the frame, visibly larger than the Small dog and insect.

**Prompt:**

```text
Painterly, hand-illustrated game art with the Baldur's Gate 3 camp-card feel: a warm light source against a grim post-apocalyptic wasteland, muted weathered materials and clear shapes. Entirely generic and reusable, no recognizable characters. No text, lettering, numbers, labels, logos, watermarks or gore.

A Medium amphibious mutated lizard, mud-coloured scales, broad paddled tail and splayed clawed feet. Hunched forward with its head toward the bottom of the frame; recognisable as a lizard from near-overhead.

Near-overhead battle-map token, no horizon, side view or three-quarter portrait. Square final frame: 400×400 px. Center the subject; its longest visible extent fills about 90% of the square, preserving clear transparent margins and corners. Head toward the bottom of the frame; limbs splay outward. Fully transparent background, no ring, base, pedestal, floor, ground or scene. Warm upper-left illumination on the subject itself, crisp readable painterly silhouette. Only a very short soft contact shadow lower-right, on alpha and close to the body, following tokens/PROMPT.md; no long cast shadow.
```

**Generation and crop:** Generate **1792×1024** landscape with the full subject inside the central **1024×1024 square**, x=384–1408, or use 1024×1792 with the central square y=384–1408. Preserve genuine alpha during hand-editing. Compose the longest subject extent at **90%** of that square, not of the original canvas. The packer center-crops and resizes without trimming these margins.

**Final spec and name:** **`tokens/towarzysz-zmutowany-gad.webp`** — **400×400 WEBP**, RGBA with genuine transparency; square frame and authored margins preserved.

**Drop point:** `dev/art/m5/in/towarzysze/towarzysz-zmutowany-gad.png` — the GM's edited source; `dev/` is not shipped.


