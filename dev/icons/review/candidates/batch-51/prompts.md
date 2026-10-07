# Batch 51 prompts

Generated on 2026-10-07 as three 3x3 atlases. Every cell requested a stark white,
low-detail pictogram on solid black, with a serious post-apocalyptic tone, strong
small-icon readability, safe padding, and no text or grid lines.

## Atlas A — revisions and equipment

1. Ammunition components: empty cases plus clearly separate bare lead projectiles.
2. Pogromca: complete centered custom pump shotgun with no cropped ends.
3. Generic hoof attack: neutral horse lower leg and hoof, with no mutation or weapon.
4. Battered diet-cola can.
5. Balanced ring-pommel throwing knife.
6. Twin-cam compound bow.
7. Compact magazine-fed pistol crossbow.
8. Full-size compound crossbow.
9. Suppressed 10 mm pistol.

## Atlas B — creature and machine abilities

1. Armored mutant tail strike.
2. Psychic attack from a fractured mind.
3. Rupturing machine core for shared self-destruct variants.
4. Exploding mutant boils.
5. Venomous reptilian fangs.
6. Barbed organic venom spike.
7. Heavy gnarled branch strike.
8. Grasping root around a boot.
9. Mutant bear paw strike.

## Atlas C — creature and machine abilities

1. Cluster of mutant tentacles.
2. Crossed industrial saw attacks.
3. Blood-sucking proboscis.
4. Acid spit striking metal.
5. Crossed improvised steel cudgels.
6. Colliding armored steel fists.
7. Biomechanical crushing jaws.
8. Scurrying rat legs.
9. Radioactive gas breath.

The raw generated sheets are retained in `raw/`. Review candidates were split,
normalized to 256x256, converted to white-on-alpha PNG, and paired with
theme-aware SVG wrappers by `prepare_candidate.py`.

## Clean revision

The first pass was rejected as universally too detailed and too heavily
textured for small icons. All 27 subjects were regenerated in three replacement
3x3 atlases with a stricter grammar:

- flat solid white shapes only;
- no grunge, distress, scratches, speckles, shading or surface texture;
- one dominant silhouette per cell;
- no more than a few large internal cutouts;
- no small decorative parts or realistic rendering;
- immediate recognition at 16x16 pixels as the design target.

The replacement raw sheets are `batch-51-atlas-d-clean.png`,
`batch-51-atlas-e-clean.png` and `batch-51-atlas-f-clean.png`. Their normalized
candidates use the `_clean` suffix and are selected by default in the review UI.

Review result: fourteen clean candidates were approved and installed. Twelve
received targeted revision notes; the pistol-crossbow family remains pending.
