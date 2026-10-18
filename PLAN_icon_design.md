# NOE icon design language and finishing pipeline

**Proposal, 2026-10-18.** Research and a visual study are complete. This document does not adopt a palette or change production assets, review decisions, item builders, packs, or world documents.

The recommendation is **enamel on steel**: the existing sober, broad silhouettes, colored with a small palette of muted inks and set into dark, restrained plates. Classes have recognizable accents; ordinary abilities use less color; equipment uses material families. Action costs, charges, and current conditions remain explicit interface information.

The important separation is **subject → source identity → current behavior/state**. One color, border, or baked image should not attempt to communicate all three.

## 1. What dnd5e actually does

The study used the local dnd5e **6.0.6** source and installed release artwork, with a comparison against **5.3.0**, the campaign's version before migration. The icon component and the relevant inventory image helper are unchanged in the inspected comparison; the shared gold-frame rule also survives. This is a study of the default system and supplied art, not every commercial content pack or third-party sheet.

The companion local reference board shows 34 examples at 80, 32, and 16 px. It distinguishes repository YAML defaults from installed release artwork: those are not always identical, particularly for identity illustrations. It is not a live sheet screenshot.

### Observations, with evidence

| Layer | Observed treatment | Implication |
| --- | --- | --- |
| Modern class and subclass identity | Installed class art combines a strong light emblem, shadow/separation, and a colored illustrative ground. The sampled Champion retains the Fighter emblem; Thief retains the Rogue emblem, with a different ground. | Identity can survive a change of context or specialization. A strong foreground symbol does most of the work at small sizes. |
| Backgrounds | Installed Soldier, Criminal, Sage, and Acolyte art uses scene illustrations. | The background image communicates a life/context rather than an action. It is evocative, but its smaller details become hard to distinguish at 16 px. |
| Species | Installed examples use character/creature illustrations. | A different subject vocabulary answers “what sort of person?” rather than “what can I press?” |
| Legacy classes | Source assignments use stock illustrated objects/actions: Barbarian and Fighter both use sword-grip images, in different variants. | The content library has several generations of art direction. There is no single uniform painting recipe to reproduce. |
| Individual class features | Fighter's Second Wind uses a green cross; Action Surge an orange muscle; Extra Attack a gray strike; Fighting Style a blue staff-grip; Studied Attacks a purple sword. | These assignments follow the depicted subject and available artwork. They do not consistently encode the parent class with color. |
| Feats, spells, equipment | Mostly subject illustrations from the shared core library in the inspected samples. Alert is an eye; a sword is a sword; spell imagery suggests the effect. | The picture is primarily a recognition aid. Its hue is not a trustworthy mechanical classifier. |
| Activities, document types, traits, conditions | Compact monochrome SVG symbols, alongside activity labels and other controls. | Interface symbols are a different layer from item art. They can be reused and colored by theme/context. |
| Framing | `.gold-icon` declares a 1 px gold border, 4 px corner radius, a small shadow, and a theme-dependent dark backing. Inventory image dimensions are 32×32 px. | Much of the perceived finish belongs to the sheet, not the image file. A gold border here is shared presentation, not proof of item rarity. |
| Interaction and state | Click actions, hover styles, activity labels, counts, controls, and groupings live in templates and prepared context. | Ability activation and current state should not be inferred from the artwork. |

There is an implementation caveat in the last two rows: `generateIcon` chooses `<dnd5e-icon>` for SVG and `<img>` for raster images. The custom SVG element has a closed shadow root and `display: contents`; it inherits `--icon-fill`, but does not have an ordinary host box. Consequently, a border declared on that host does not behave like a border around a raster `<img>`. The stylesheet's declared frame and the resulting appearance must be distinguished.

The character sheet groups a feature as passive when it has the `trait` property **or has no activities**. This is a rendering rule, not an art direction rule and not a complete model of NOE behavior.

### Principles to retain

These are **design inferences from the implementation and visible art**, not documented statements of the original artists' intent:

1. **Recognizable subject first.** An icon is a fast memory cue next to a name.
2. **Separate identity from operations.** A class emblem, an object image, and an attack control answer different questions.
3. **A quiet common frame unifies mixed content.** The surrounding interface supplies consistency even when the library artwork varies.
4. **Foreground/background separation matters more than texture.** A large emblem over a colored ground continues to read after the ground loses detail.
5. **Use the rest of the row.** Labels, grouping, costs, and counts carry precise information that a tiny painting cannot.

### Constraints we can improve in NOE

The shared stock library produces visually unrelated features within one class, and occasionally similar imagery for unrelated rules. Background scenes and portraits can be evocative but weak as tiny symbols. SVG and raster consumers also have different styling behavior. These are observable constraints; the study does not establish why each original asset was selected.

NOE can have a more coherent library because its own glyphs are already being produced to one brief. We can supply stable class-family accents, recognize equipment at inventory size, and make the same subject consistent across compendium, sheet, chat, and hotbar. We should preserve the useful identity/operation separation already present in dnd5e.

## 2. What already exists in our pipeline

There are multiple generations of normalization:

- `dev/icons/normalize_icons.py` removes near-black pixels, makes visible pixels white, crops a non-square canvas to its center square, and resizes to 256 px. It does **not** fit the foreground bounds or optically center the subject. Center-cropping can also cut a subject if its source canvas is poorly framed.
- The later `review/candidates/batch-62/process_batch.py::normalize`, reused by `placeholder-pass/process.py`, extracts the foreground mask, crops its bounds, contains it within **216×216 px**, and centers it on **256×256 px**. This supplies **20 px minimum margins**. The later pipeline also checks components, exact candidate pairs, and margins.
- Neither establishes perceptually equal weight or optical alignment. In a read-only measurement of **308 existing WEBP files**, Goła klata covers about **34.9%** of its canvas with alpha-weighted foreground; Brutal's emblem about **17.6%**. Both have a 216 px longest foreground extent. Brutal's alpha centroid lies about 7.3% of the canvas width left of center. That is a review flag, not proof that moving it right would look better.
- `gen_class_placeholders.mjs` already contains a six-class color palette and creates separate active variants. It preserves existing files unless forced. This is a precedent for class-family color, not evidence that its placeholder palette should be adopted unchanged.
- Existing approved SVGs commonly wrap a lossless WEBP mask and expose one fill through `var(--icon-fill, #fff)`. They support one-ink recoloring well. They contain no semantic separation of “hand,” “weapon,” and “clothing.”
- `state-colors.mjs` already gives the condition panel, HUD, and generated token graphics one shared palette. Preserve that contract.
- The character sheet currently has a whole-sheet `sepia(.15) contrast(1.05) brightness(.85)` filter. It alters final colors and contrast. A palette should be evaluated both with and without it; replacing that broad filter with surface-specific styling is a sensible later change.
- Existing tool-icon CSS includes local contrast and scale workarounds. The hotbar already supplies charge badges, depleted appearance, and an active outline/pulse. A finishing pipeline must integrate with these consumers, rather than adding a second competing treatment.

At the start of this study, `PROFICIENCY_COVERAGE.md` also recorded an adjacent wiring task: proficiency/advancement rows get art through trait/config lookups, not just item images. Its 51 colored rows and six header lookups are **not an additional art-generation requirement**. Another session is working on that area; inspect its latest implementation and decisions before following this plan. Do not duplicate its work, rewrite its queue, or presume an earlier suggested mapping is approved.

## 3. The proposed information language

Use one drawing language throughout: broad, functional silhouettes; generous negative space; restrained human detail; no speckling or distressed edges. Different categories receive different **treatments**, not unrelated drawing styles.

| Content | Glyph and ground | Source identity | Behavior/state |
| --- | --- | --- | --- |
| Class | Class-colored glyph over a dark, softly tinted plate; a subtle inner frame at larger sizes | Six stable class accents | No activation styling on the emblem itself |
| Profession | Same treatment as class, with its own approved emblem | Inherit the parent class accent; no 18-color palette | As for class |
| Origin | Ivory/sand glyph, dark field-stamp treatment; quiet lower rule at larger sizes | One common origin family; each region keeps its own emblem and name | Region is not a danger, rarity, or power code |
| Unique class/profession ability | Mostly ivory subject glyph, very low-chroma class ground/edge | Canonical source class; profession maps to its parent | Cost, trigger, uses, and current state in the surrounding UI |
| Ability shared by several classes | Same ability treatment, neutral source accent | Explicit source/provenance text; do not choose a class arbitrarily | Same behavior model as other abilities |
| Origin ability | Its own subject glyph in the common origin treatment | Origin name in the row/tooltip; larger selectors may also show the origin emblem | Same behavior model |
| Sztuczka / general feat | Own subject glyph; one restrained brass family accent | Class-neutral even when a class level grants the choice | Individual activities may be active; benefits may also be passive |
| Physical item | Material/family-colored glyph on a common dark equipment plate | Equipment function, never the owner's class | Equipped, ammunition, jam, charge, or depletion stays live |
| Attack / reload / other activity | Simple functional symbol; normally bare when nested under an item | Item name/association nearby | Cost and mode are explicit; actual executable controls receive interaction styling |
| Conditions and persistent effects | High-contrast condition glyph, with the established condition palette where one exists | Applied effect/source can be shown alongside it | Name, severity, duration and suppression are explicit; no class-colored warning frame |
| Proficiency, navigation, generic UI | Bare, theme-aware glyphs | Stable category symbol | Focus, selection and disabled state belong to the control |

**Do not color a general feat by the actor using it.** Aramis should remain recognizable in its compendium entry, on two differently classed characters, and in chat. Receiving it during a class advancement does not change its content identity.

For a unique class feature, use its canonical source. If `alsoOwnedBy` lists other classes, default to neutral styling unless a deliberately distinct rules entry already exists. Do not create one visual duplicate per possible multiclass acquisition path.

Origins should not require players to memorize twelve colors. A common stamp treatment makes them a recognizable family while their distinct emblems do the identification. In large origin-choice cards, a muted regional texture or authored secondary ink could be explored later; it is not required for the inventory-size pipeline.

### Activation is not one bit

Keep these concepts separate:

- **Passive benefit:** no executable operation, although it may depend on a condition.
- **Activated operation:** an actual activity with a cost such as A, B, R, or I; other time costs use their real label.
- **Triggered operation:** an optional or automatic response to an event; absence of an action letter does not imply passivity.
- **Mixed feature:** passive benefits plus one or more operations.
- **Current state:** on/off, available/unavailable, depleted, suppressed, or another rules-supported state.

Use NOE's existing **A / B / R / I** notation beside the relevant activity (NOE s. 37). A parent feature with multiple costs must not acquire one misleading action badge. Do not bake a `P` into passive artwork; use a text label/group where useful.

Two concrete cases constrain the implementation:

- **Aramis** combines permanent benefits with Wytrącenie [B] (NOE s. 102). Its feature image stays stable; its maneuver gets the B label.
- **Wściekły cios** has `action: null` but supplies an interactive, limited resource choice after a hit in our implementation. Classification must inspect the behavior/resource metadata, not equate null with passive.

Clickable descriptions also need opening affordances, but that does not make them executable combat actions. A raised/pressed button treatment should belong to the actual operation control. Flat item frames remain suitable for all content previews.

## 4. Color, border, bevel, and background

### Proposed palette

These values are candidates shown in the companion preview, not canonical tokens yet:

| Class | Accent | Rationale |
| --- | --- | --- |
| Brutal | `#bf8962` copper | Physical force and worn metal; lower saturation than a live injury warning |
| Cwaniak | `#c3ab6c` aged brass | Money, influence, showmanship |
| Spec | `#77b7b0` oxidized teal | Technical and medical work without reducing the class to either one |
| Twardziel | `#8aa7c4` steel blue | Armor, discipline, weapons |
| Złodziej | `#a99cbe` slate violet | Quiet, distinct accent without making the glyph dark |
| Zwiadowca | `#9fb082` field sage | Terrain and survival |

The old placeholder palette uses red/ochre/blue/olive/violet/green respectively. The proposal keeps the broad associations for most classes and deliberately tests Twardziel in steel blue instead of olive. Retaining its old olive is a valid palette alternative if the earlier association matters more to the table; choose that in the pilot before generating the full set.

The main plate is around `#20282d`, ordinary ability ink around `#ece7d9`. Keep bright warning colors out of permanent frames. Hue is a redundant recognition aid, not the only way to identify a class. Class accents may resemble a condition hue; their restrained saturation and fixed placement differ, while names/symbols carry the actual meaning.

### Equipment families

| Family | Proposed ink/ground direction | What still needs its own glyph or text |
| --- | --- | --- |
| Firearms and melee weapons | Steel / gunmetal | Weapon silhouette, model and actual attack modes |
| Ammunition and magazines | Brass / dark brown-gray | Caliber, load, special round and count |
| Armor, helmets and shields | Khaki / slate | Actual object and slot; do not make “blue” mean protective power |
| Tools, electronics and components | Muted technical teal | Tool specialty; components versus a complete kit |
| Medical equipment | Pale medical sage/teal | Treatment and uses; color is not a claim that every drug is beneficial |
| Drugs and chemicals | Restrained neutral/chemical accent with subject distinction | Substance, delivery and consequences; avoid a good/bad color shortcut |
| Explosives, fuel and incendiaries | Dull amber/copper | Actual object; live hazard warnings get a separate state indication |
| Food, water and survival supplies | Canvas / sand | Object, remaining amount and relevant condition |
| Salvage, valuables and general loot | Neutral weathered gray / brass when materially appropriate | Object identity and value in text |

These are a handful of compositing recipes, not another huge color taxonomy. Closely related small items may share one recipe. Never use color alone to distinguish ammunition compatibility, damage type, safety, or availability. Do not import fantasy/MMO rarity tiers; the inspected `.gold-icon` frame is not such a tier either.

### Material rules

1. **Small border: yes.** One quiet rim, approximately 1 CSS px at the main 32 px display size. It separates the plate from both sheet themes.
2. **Shallow bevel: selective.** At most a restrained top highlight and lower shadow. Stronger inner framing is for large identity emblems. At 16 px, omit decorative bevel detail. A flat-frame alternative is in the preview.
3. **Glyph colorization: yes.** One flat ink per glyph is the first reliable pipeline. Class emblems and material-colored objects receive more color; ordinary abilities retain ivory contrast.
4. **Background: yes.** A dark, low-chroma inlay, optionally a smooth very subtle tonal change. No stock painting, noisy rust texture, per-icon wallpaper, or distress inside tiny negative spaces.
5. **Multiple object colors: later, authored.** A single white mask cannot reliably separate skin, steel, cloth and medicine. Two-ink artwork requires explicit secondary masks and review. A whole-icon gradient is not material recognition.

The preview compares ivory-over-color, colored-glyph-over-neutral, and colored-glyph-plus-inlay. The recommended use is the third for identities, the second for equipment, and the first with a quiet source edge for abilities.

## 5. Normalization and the finishing pipeline

Keep the current generation brief. It creates useful master masks and keeps the other icon-generation session independent of this finishing decision. Adopt a separate, deterministic finishing stage after the glyph is approved.

```text
Raw generation + provenance
    → existing split / extraction / glyph approval
    → canonical foreground mask + normalization metrics
    → optional optical correction, reviewed independently
    → semantic style recipe
    → deterministic color / plate / rim composition
    → WEBP export + bare glyph reference
    → real-size and surface review
    → approved builder/config wiring
```

### Normalize the subject, then compose its housing

- Prefer real source alpha. For black-ground generations, use controlled luminance-to-alpha extraction that preserves useful edge coverage. Do not accidentally treat a transparent image's hidden RGB or a finished colored background as subject data.
- Split the atlas before fitting. Preserve disconnected meaningful components such as fingers or separate props; tiny-component removal needs the existing validation/review context.
- Preserve aspect ratio and fit into the current 216 px maximum foreground box on a 256 px canvas. This is a **maximum extent**, not a target percentage of white area. Long weapons must not be inflated until their area matches a vest.
- Record bounds, minimum margins, centroid and alpha-weighted area. Use these as flags for review by shape family, not an automatic pass/fail judgment of visual quality.
- Start with geometric centering. Offer explicit `opticalOffset` and `scale` overrides only where visual review justifies them; directional diagrams must keep their direction. A proposed offset must remain inside the safe area, reducing scale first if necessary.
- Keep gaps/strokes readable at 32 px and inspect at 16 px. A 1.5 px essential gap at 32 px corresponds to about 12 source pixels on a 256 px master; this is a useful inspection heuristic, not a universal morphology operation.
- Do not change existing approved geometry automatically. A changed crop or offset is a new derivative candidate with the original available for comparison.
- Add backgrounds and rims **after** measuring the foreground, or every icon will appear to have identical full-canvas occupancy.

### Classification and recipes

Use stable content identifiers and canonical metadata. `Item.type === "feat"` is insufficient: class features, origin abilities, Sztuczki and other rules can all be feats. Likewise, folder names or the actor's primary class are not a sufficient source of truth.

Existing useful inputs include `CLASS_FEATURES.source`, `owner`, `alsoOwnedBy`, `action`, `passive`, `resource`, `toggle`, and the profession's `klasa`; item flags and the origin/Sztuczka data supply stable identities for other families. Verify them in each builder before choosing a runtime lookup.

A proposed build-time manifest entry could look like:

```json
{
  "id": "berserk",
  "glyph": "icons/abilities/berserk.svg",
  "role": "class-ability",
  "owner": "brutal",
  "recipe": "ability-inlay-v1",
  "sourceHash": "<approved-source-sha256>",
  "normalization": { "opticalOffset": [0, 0], "scale": 1 }
}
```

This is a proposed asset recipe, not a new rules flag or data-model requirement. Do not include live charges or active state. Unknown classifications get a neutral treatment and an audit entry; they must not quietly become a random class. WKK/NOE provenance stays metadata/text rather than an additional palette.

### Export and rendering contract

Preserve the existing approved bare glyph paths and provenance. Initially generate finished candidates under a separate derived namespace, such as `icons/styled/…`, after review; never overwrite the white source with its colored derivative.

Use a **self-contained lossless WEBP tile** as the first broadly compatible finished item image. Its dark plate provides stable contrast in either sheet theme, and the file works as an ordinary image in compendia, chat, macros and canvas consumers. Continue to use the original bare SVG for compact interface symbols. SVG or dynamic theme-specific variants are optional only when their consuming surfaces are known.

The CSS study suppresses decorative inner framing at small sizes. A single baked image cannot change its internal decoration according to display size. The first export pilot therefore needs a finish that survives all three target sizes as one image; if separate 16/32 px variants prove necessary, route them only in surfaces we control and retain a compatible general-purpose image elsewhere. Compare the exported files with the CSS study before treating them as visually equivalent.

This deliberately addresses the `<dnd5e-icon>` host-box issue: a finished raster already has a static ground. Where the sheet adds its own gold border/background, suppress or coordinate that presentation only for the finished namespace so it does not produce two frames. A live state/focus outline remains a separate wrapper/control concern.

Do not expect `--icon-fill` on an external SVG in `<img>`, hotbar, or PIXI to resolve against the sheet's CSS. `state-colors.mjs` already documents this constraint for token textures. Export real color values for those consumers. The same composition recipe and source hash should produce every required raster size; inspect actual downscaled output rather than assuming it matches the CSS study.

`_active.svg` and other existing variants must remain valid until every relevant consumer is migrated. Coordinate `ability-hotbar.mjs` and its live badge/outline logic, rather than adding new static “active” artwork on top. The future design should show ON, counts and unavailable reasons explicitly; do not erase the item's identity with heavy desaturation. Avoid perpetual pulse as the only active-state cue and respect reduced-motion preferences.

Cache derivatives by source hash, recipe version and normalization override. Record output hashes and provenance. Palette-only changes then require recomposition, not new image generation. Add the new generator to release freshness checks only after the recipe and installation layout are adopted.

## 6. Verification before rollout

The W3C guidance supports two useful design gates: color cannot be the sole carrier of information, and essential graphical/control cues need at least **3:1** contrast against adjacent colors. Ordinary text should meet the applicable **4.5:1** target. Check actual composited surfaces, not just palette swatches. These are acceptance targets; this study does not claim full WCAG conformance for the sheet.

| Surface | What must be checked |
| --- | --- |
| Character and NPC lists | 32 px readability, costs and counts, passive/mixed labels, selected/hover/focus states, no doubled rim |
| Class/origin/profession selectors and advancement | Larger art and 24/32 px rows; trait/config lookup paths as well as item builders |
| Compendium and sidebar | Recognizable standalone item image, stable names, small-size contrast |
| Item header and chat | 48/64 px appearance, raster/SVG difference, native background and border |
| Hotbar | Identity, ownership-safe synchronization, ON, uses, depletion; existing active variant compatibility |
| Token HUD / canvas conditions | Real colored exported textures, severity and names; no reliance on theme variables |
| Light, dark and sci-fi themes | Label contrast and plate separation; also the current sheet-wide filter |
| Grayscale and color-vision simulations | Silhouette, text and state marks carry meaning when class colors converge |
| Scale | 64 / 32 / 24 / 16 CSS px, 100% browser zoom at DPR 1 and 2; recheck with normal user scaling |

Start with 24 subjects: six classes; two professions from different parents; two origins; two origin abilities; three Sztuczki including Aramis; three class abilities including Berserk, Goła klata and Wściekły cios; four equipment families (weapon, ammunition, tool, medical); and two distinct weapon activities. Show state and severity examples separately using existing condition art.

Review the pilot as mixed rows and an actual-sized library, as well as isolated large icons. Short comparison tasks should ask players to find a weapon, find a bonus action, distinguish an origin ability from a Sztuczka, and recognize an unavailable operation. Compare against today's icons without asserting a measured speed improvement before observing one. A treatment that wins at 256 px but weakens the 32 px list fails.

## 7. Implementation sequence after design review

1. **Inventory and classification.** Produce a read-only manifest across glyphs, builder outputs, relevant config/trait lookups, and consumers. Distinguish missing art from missing wiring. Preserve all work from the current generation/review sessions.
2. **Normalization audit.** Consolidate behavior around the later bounds-fitting helper. Generate diagnostics and proposed overrides; preserve source pixels. Review only real visual outliers.
3. **24-subject finishing pilot.** Implement recipes, deterministic colored candidates and the three material comparisons. Decide palette, edge strength and dark-plate behavior before processing the full library.
4. **Integrate review.** Reuse the existing queue's stable IDs, source hashes and approve/revise/reject behavior. Keep glyph approval, optical-geometry approval and finish approval distinct. Finished colored candidates need a separate validator/profile: the current pure-white validator should continue validating white masters.
5. **Wire a sandbox slice.** Touch `dev/packs/build-packs.mjs`, the applicable config builders and `ability-hotbar.mjs` only where needed. Coordinate tool-icon workarounds and `.gold-icon` framing in `styles/neuroshima.css`. Do not rebuild unrelated packs for a visual experiment.
6. **Validate the actual consumers.** Run targeted generator/asset checks and relevant pack validation. Because production UI changes will be involved at this stage, perform the module's required sandbox/layer-6 check with screenshots and add/update the relevant Poligon probes. Do not reseed Poligon or touch the campaign for this experiment.
7. **Roll out by family.** Identities → abilities/Sztuczki → equipment → interface/proficiency consumers. Repoint from builder/config sources and preserve IDs. Existing-world repoints are a separate, explicit migration step, not a side effect of approving an image.

The design study itself changes no Foundry code and requires no game lifecycle operation or pack rebuild. The prototype verifies material hierarchy using existing masks, not a completed export pipeline or player usability trial.

## Sources and implementation anchors

Primary local dnd5e source paths (relative to its checkout, inspected at `release-6.0.6`):

- `less/v2/apps.less`, `.gold-icon` around line 485: common frame.
- `less/v2/inventory.less`, `.item-image` around line 208: main 32 px inventory size.
- `less/variables/base.less`, `light.less`, `dark.less`: palette, background and icon-fill tokens.
- `module/applications/components/icon.mjs`: inherited SVG fill, closed shadow root, `display: contents`.
- `module/utils.mjs`, `generateIcon` around line 1103: SVG/raster rendering split.
- `templates/inventory/inventory.hbs` and `activity.hbs`: item images, labels and separate activities.
- `module/applications/actor/character-sheet.mjs`, `_prepareItemFeature` around line 850: origin and active/passive grouping.
- `packs/_source/classes`, `classes24`, `origins24`, `feats24`, `spells24`, `equipment24`: sampled content assignments. Installed `icons/classes`, `icons/backgrounds`, and `icons/species`: released identity artwork.
- [Official dnd5e repository](https://github.com/foundryvtt/dnd5e). Its README distinguishes software licensing from the varying terms for images/assets. Reference artwork was inspected locally; it is not part of a proposed NOE asset redistribution.

NOE implementation anchors:

- [Current pipeline](dev/icons/Pipeline.md), [later normalizer](dev/icons/review/candidates/batch-62/process_batch.py), [atlas processor](dev/icons/placeholder-pass/process.py), [review contract](dev/icons/review/README.md).
- [Placeholder palette](dev/icons/gen_class_placeholders.mjs), [feature metadata](scripts/config/class-features-data.mjs), [class/profession relationships](scripts/config/classes-data.mjs), [origins](scripts/config/pochodzenia-data.mjs), [Sztuczki](scripts/config/sztuczki-data.mjs).
- [Pack builders](dev/packs/build-packs.mjs), [hotbar state and images](scripts/actors/ability-hotbar.mjs), [canonical condition colors](scripts/config/state-colors.mjs), [existing styling](styles/neuroshima.css).
- [Adjacent proficiency audit](dev/icons/PROFICIENCY_COVERAGE.md).

Rules references: **NOE s. 37** (action notation), **s. 60–65** (origins), **s. 77–78** (Spec's technical and medical breadth), **s. 102** (Sztuczki and Aramis). Rulebook statements are paraphrased here; canonical prose remains in the vault.

Accessibility references: [W3C: use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [W3C: non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [W3C: text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
