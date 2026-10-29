# Missing artwork briefs — M5 and carried requests

4 undelivered catalog images, updated 2026-10-29: four animal companions.
Delivered briefs: [BRIEFS_DELIVERED.md](BRIEFS_DELIVERED.md).
The [asset queue](../../icons/MISSING.md) also lists outstanding bestiary tokens.

All nine explosive map sprites are now delivered after further built-in generations.
Companion briefs remain below; the packer only crops, resizes and converts sources.

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

Specs: [MISSING](../../icons/MISSING.md) §E and
[PLAN_m5_postoj.md](../../../PLAN_m5_postoj.md) §7.23, D42–D45; this later GM
feedback updates the earlier style direction. Token proportions:
[tokens/PROMPT.md](../../../tokens/PROMPT.md). Older §B and §E requests follow M5.

Display sizes are composition targets. Generate one image per prompt, not an atlas.
For 3:1 banners, keep all decisive objects inside the central 1792×597 band of a
1792×1024 source (approximately y=213–811). The packer center-crops and resizes.
Keep medical packaging unlabelled and wreck craters in separate scene effects.
Final filenames, sizes and alpha rules stay
as specified below.

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
