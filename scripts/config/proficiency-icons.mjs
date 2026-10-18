/** Native Trait display entries, without changing proficiency keys or string-label maps. */
import {
  ARMOR_PROFICIENCY_ICONS, WEAPON_PROFICIENCY_ICONS, TRAIT_CATEGORY_ICONS,
  MIXED_TRAIT_ICON, toolProficiencyIcon
} from "./proficiency-icons-data.mjs";

const patchedMetadata = new WeakSet();

export function applyProficiencyIcons() {
  const cfg = CONFIG.DND5E;
  const maps = {
    armor: ["armorProficiencies", ARMOR_PROFICIENCY_ICONS],
    weapon: ["weaponProficiencies", WEAPON_PROFICIENCY_ICONS],
    tool: ["toolProficiencies", Object.fromEntries(Object.keys(cfg.tools).map(key => [key, toolProficiencyIcon(key)]))]
  };
  for (const [trait, [source, icons]] of Object.entries(maps)) {
    const displayKey = `neuroshima${source[0].toUpperCase()}${source.slice(1)}`;
    cfg[displayKey] = Object.fromEntries(Object.entries(cfg[source]).map(([key, label]) => [key, {
      label, icon: icons[key] ?? TRAIT_CATEGORY_ICONS[trait]
    }]));
    Object.assign(cfg.traits[trait], { configKey: displayKey, labelKeyPath: "label" });
  }
  for (const [trait, icon] of Object.entries(TRAIT_CATEGORY_ICONS)) cfg.traits[trait].icon = icon;

  // A mixed Trait has no single category; dnd5e reads a fresh metadata object for its default image.
  const Trait = cfg.advancementTypes.Trait?.documentClass;
  if (!Trait || patchedMetadata.has(Trait)) return;
  const descriptor = Object.getOwnPropertyDescriptor(Trait, "metadata");
  if (!descriptor?.get || !descriptor.configurable) return;
  Object.defineProperty(Trait, "metadata", {
    ...descriptor,
    get() { return { ...descriptor.get.call(this), icon: MIXED_TRAIT_ICON }; }
  });
  patchedMetadata.add(Trait);
}

export function registerProficiencyIcons() {
  applyProficiencyIcons();
  // Armor/weapon labels are reapplied at these lifecycle stages; refresh their UI mirrors afterwards.
  Hooks.once("i18nInit", applyProficiencyIcons);
  Hooks.once("setup", applyProficiencyIcons);
}
