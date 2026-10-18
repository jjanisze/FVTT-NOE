/** Curated reference only. Artwork is read from the local installation, never copied into the module. */
import fs from "node:fs";
import path from "node:path";
import { defaultProfileName, installPaths, loadConfig, profileDataPath } from "../../agent/lib/config.mjs";

const systemIcon = (folder, name) => `systems/dnd5e/icons/${folder}/${name}`;
const example = (id, name, source, note = "") => ({ id, name, source, note });

export const REFERENCE_GROUPS = [
  {
    id: "classes", title: "Class emblems", style: "Emblem over a colored ground",
    description: "Large light symbols, separated from colored illustrated backgrounds. The silhouette remains prominent when the background detail shrinks.",
    examples: [
      example("class-barbarian", "Barbarian", systemIcon("classes", "barbarian.webp")),
      example("class-fighter", "Fighter", systemIcon("classes", "fighter.webp")),
      example("class-cleric", "Cleric", systemIcon("classes", "cleric.webp")),
      example("class-rogue", "Rogue", systemIcon("classes", "rogue.webp"))
    ]
  },
  {
    id: "subclasses", title: "Subclass variations", style: "Parent emblem, different ground",
    description: "Compare these with the four classes above. These examples preserve their parent class symbol while changing the illustrative ground and colors.",
    examples: [
      example("subclass-berserker", "Path of the Berserker", systemIcon("classes", "berserker.webp"), "Barbarian family"),
      example("subclass-champion", "Champion", systemIcon("classes", "champion.webp"), "Fighter family"),
      example("subclass-life", "Life Domain", systemIcon("classes", "life.webp"), "Cleric family"),
      example("subclass-thief", "Thief", systemIcon("classes", "thief.webp"), "Rogue family")
    ]
  },
  {
    id: "backgrounds", title: "Background scenes", style: "Illustrated environment",
    description: "Places and atmosphere suggest a life or occupation. There is no large repeated class-style emblem in these installed background images.",
    examples: [
      example("background-soldier", "Soldier", systemIcon("backgrounds", "soldier.webp")),
      example("background-criminal", "Criminal", systemIcon("backgrounds", "criminal.webp")),
      example("background-sage", "Sage", systemIcon("backgrounds", "sage.webp")),
      example("background-acolyte", "Acolyte", systemIcon("backgrounds", "acolyte.webp"))
    ]
  },
  {
    id: "species", title: "Species portraits", style: "Illustrated person or creature",
    description: "Faces, figures and costume communicate identity. This is portrait art rather than a functional action symbol.",
    examples: [
      example("species-human", "Human", systemIcon("species", "human.webp")),
      example("species-dwarf", "Dwarf", systemIcon("species", "dwarf.webp")),
      example("species-orc", "Orc", systemIcon("species", "orc.webp")),
      example("species-dragonborn", "Dragonborn", systemIcon("species", "dragonborn.webp"))
    ]
  },
  {
    id: "features", title: "Class features", style: "Stock subject illustration",
    description: "All four belong to Fighter. Their green, orange, gray and blue images show that individual feature colors do not consistently encode the source class.",
    examples: [
      example("feature-second-wind", "Second Wind", "icons/magic/life/cross-worn-green.webp", "Fighter · recovery"),
      example("feature-action-surge", "Action Surge", "icons/magic/control/buff-strength-muscle-damage-orange.webp", "Fighter · exertion"),
      example("feature-extra-attack", "Extra Attack", "icons/skills/melee/strike-sword-gray.webp", "Fighter · weapon strike"),
      example("feature-fighting-style", "Fighting Style", "icons/skills/melee/hand-grip-staff-blue.webp", "Fighter · weapon grip")
    ]
  },
  {
    id: "feats", title: "General feats", style: "Stock subject illustration",
    description: "The same broad illustration library supplies eyes, wounds, magic and objects. These feats have no separate universal frame or class-color system in the sampled art.",
    examples: [
      example("feat-alert", "Alert", "icons/creatures/eyes/human-single-brown.webp"),
      example("feat-savage-attacker", "Savage Attacker", "icons/skills/wounds/bone-broken-knee-beam.webp"),
      example("feat-magic-initiate", "Magic Initiate", "icons/magic/symbols/chevron-elipse-circle-blue.webp"),
      example("feat-skilled", "Skilled", "icons/commodities/treasure/medal-ribbon-blue.webp")
    ]
  },
  {
    id: "spells", title: "Spell effects", style: "Stock subject illustration",
    description: "Colored light, motion and symbolic objects suggest the effect. This shares the illustrated vocabulary used by features and feats.",
    examples: [
      example("spell-fire-bolt", "Fire Bolt", "icons/magic/fire/projectile-fireball-orange-green.webp"),
      example("spell-cure-wounds", "Cure Wounds", "icons/magic/nature/leaf-drip-light-green.webp"),
      example("spell-shield", "Shield", "icons/equipment/shield/heater-crystal-blue.webp"),
      example("spell-magic-missile", "Magic Missile", "icons/magic/light/projectiles-pink-purple.webp")
    ]
  },
  {
    id: "equipment", title: "Equipment and consumables", style: "Stock object illustration",
    description: "Shaded objects use material colors and their own backgrounds. A common sheet-applied rim unifies weapon, armor, tool and potion images.",
    examples: [
      example("equipment-longsword", "Longsword", "icons/weapons/swords/greatsword-guard.webp", "Weapon"),
      example("equipment-chain-mail", "Chain Mail", "icons/equipment/chest/breastplate-metal-scaled-grey.webp", "Armor"),
      example("equipment-thieves-tools", "Thieves’ Tools", "icons/tools/hand/lockpicks-steel-grey.webp", "Tool"),
      example("equipment-healing-potion", "Potion of Healing", "icons/consumables/potions/potion-tube-corked-red.webp", "Consumable")
    ]
  },
  {
    id: "activities", title: "Activity symbols", style: "Theme-colored monochrome SVG",
    description: "Functional pictograms identify operations. Sheet previews inherit the native dark-theme gold or light-theme dark ink; the original SVG preview retains its own fallback fill.",
    examples: [
      example("activity-attack", "Attack", systemIcon("svg/activity", "attack.svg")),
      example("activity-damage", "Damage", systemIcon("svg/activity", "damage.svg")),
      example("activity-heal", "Heal", systemIcon("svg/activity", "heal.svg")),
      example("activity-utility", "Utility", systemIcon("svg/activity", "utility.svg"))
    ]
  },
  {
    id: "conditions", title: "Condition symbols", style: "Theme-colored monochrome SVG",
    description: "Compact symbols identify states. Here they are shown as sheet glyphs; token/canvas rendering and its state outlines are separate consumers.",
    examples: [
      example("condition-poisoned", "Poisoned", systemIcon("svg/statuses", "poisoned.svg")),
      example("condition-prone", "Prone", systemIcon("svg/statuses", "prone.svg")),
      example("condition-blinded", "Blinded", systemIcon("svg/statuses", "blinded.svg")),
      example("condition-stunned", "Stunned", systemIcon("svg/statuses", "stunned.svg"))
    ]
  },
  {
    id: "legacy", title: "Legacy class artwork", style: "Older stock illustration assignments",
    description: "These 2014 class assignments use the same subject library as equipment and features. Compare them with the modern class emblems at the top; both generations occur in dnd5e content.",
    examples: [
      example("legacy-barbarian", "Barbarian · 2014", "icons/skills/melee/hand-grip-sword-orange.webp"),
      example("legacy-fighter", "Fighter · 2014", "icons/skills/melee/hand-grip-sword-red.webp"),
      example("legacy-cleric", "Cleric · 2014", "icons/magic/life/ankh-gold-blue.webp"),
      example("legacy-rogue", "Rogue · 2014", "icons/skills/melee/strike-sword-stabbed-brown.webp")
    ]
  }
];

const EXAMPLES = new Map(REFERENCE_GROUPS.flatMap(group => group.examples).map(entry => [entry.id, entry]));

/** Use the same local install/profile configuration as the existing agent tools. No server connection is needed. */
export function referenceRoots(moduleRoot) {
  let systemRoot = path.resolve(moduleRoot, "../../systems/dnd5e");
  let coreRoot = null;
  try {
    const config = loadConfig();
    const configuredSystem = path.join(profileDataPath(config, defaultProfileName()), "Data/systems/dnd5e");
    if (fs.existsSync(path.join(configuredSystem, "system.json"))) systemRoot = configuredSystem;
    if (config.installDir) coreRoot = path.join(installPaths(config).app, "public");
  } catch {
    // A standalone checkout can still show system artwork from its sibling Data/system installation.
  }
  return { systemRoot, coreRoot };
}

/** Only a curated identifier can resolve a file. URL paths never become filesystem paths. */
export function referenceAsset(id, roots) {
  const entry = EXAMPLES.get(id);
  if (!entry) return null;
  const system = entry.source.startsWith("systems/dnd5e/");
  const root = system ? roots.systemRoot : roots.coreRoot;
  if (!root) return null;
  const relative = system ? entry.source.slice("systems/dnd5e/".length) : entry.source;
  const file = path.resolve(root, relative);
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

export function buildReferenceCatalog(roots) {
  let systemVersion = null;
  try { systemVersion = JSON.parse(fs.readFileSync(path.join(roots.systemRoot, "system.json"), "utf8")).version ?? null; }
  catch { /* Missing local artwork is reported per example rather than hiding the entire reference. */ }
  return {
    systemVersion,
    groups: REFERENCE_GROUPS.map(group => ({ ...group, examples: group.examples.map(entry => ({ ...entry,
      src: `/reference-assets/${entry.id}`, vector: entry.source.endsWith(".svg"),
      available: Boolean(referenceAsset(entry.id, roots))
    })) }))
  };
}
