# Delivered artwork briefs — M5 and carried requests

16 delivered images: seven trader portraits and three upkeep banners packaged
on 2026-10-12, plus six camp banners packaged on 2026-10-18. These historical
briefs are retained for reference; the GM's actual generation prompts may differ.
For new images and revisions, use the updated art direction in BRIEFS_MISSING.
Delivery evidence: [delivered-2026-10-12.json](delivered-2026-10-12.json) and
[delivered-2026-10-18.json](delivered-2026-10-18.json).
Outstanding catalog briefs: [BRIEFS_MISSING.md](BRIEFS_MISSING.md).

The GM generates these images in DALL-E and hand-edits the sources. An agent
only packages approved source pixels. Specs:
[PLAN_m5_postoj.md](../../../PLAN_m5_postoj.md) §7.23, D42–D45;
token proportions: [tokens/PROMPT.md](../../../tokens/PROMPT.md).

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
