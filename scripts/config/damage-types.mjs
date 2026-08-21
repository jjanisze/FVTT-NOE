/**
 * Neuroshima 5e — damage type overrides.
 * Replaces dnd5e damage types with 12 Neuroshima types.
 * Removes: force, necrotic, thunder (no Neuroshima equivalent).
 * Adds: explosive (wybuchowe), light (od światła).
 * Remaps: radiant → radioaktywne, lightning → elektryczne.
 *
 * `light` exists because the Bestiariusz gives Biodroid a laser rifle dealing
 * "od światła". It cannot fold into `radiant`, which this module renamed to
 * "Radioaktywne" — a laser reported as radioactive damage reads wrong. Safe to
 * add: dnd5e stores damage types in a plain `SetField(StringField())` with no
 * `choices` restriction (module/data/shared/damage-field.mjs:33), so a new key
 * cannot trigger the DataModelValidationError described in ARCHITECTURE.md §2.
 */
export function registerDamageTypes() {
  CONFIG.DND5E.damageTypes = {
    slashing: {
      label: "Sieczne",
      icon: "systems/dnd5e/icons/svg/damage/slashing.svg",
      isPhysical: true,
      color: new Color(0x8B0000)
    },
    piercing: {
      label: "Kłute",
      icon: "systems/dnd5e/icons/svg/damage/piercing.svg",
      isPhysical: true,
      color: new Color(0xC0C0C0)
    },
    bludgeoning: {
      label: "Obuchowe",
      icon: "systems/dnd5e/icons/svg/damage/bludgeoning.svg",
      isPhysical: true,
      color: new Color(0x0000A0)
    },
    fire: {
      label: "Od ognia",
      icon: "systems/dnd5e/icons/svg/damage/fire.svg",
      color: new Color(0xFF4500)
    },
    light: {
      label: "Od światła",
      icon: "systems/dnd5e/icons/svg/damage/radiant.svg",
      color: new Color(0x00E5FF)
    },
    lightning: {
      label: "Elektryczne",
      icon: "systems/dnd5e/icons/svg/damage/lightning.svg",
      color: new Color(0x1E90FF)
    },
    acid: {
      label: "Od kwasu",
      icon: "systems/dnd5e/icons/svg/damage/acid.svg",
      color: new Color(0x839D50)
    },
    explosive: {
      label: "Wybuchowe",
      icon: "systems/dnd5e/icons/svg/damage/thunder.svg",
      color: new Color(0xFF8C00)
    },
    psychic: {
      label: "Psychiczne",
      icon: "systems/dnd5e/icons/svg/damage/psychic.svg",
      color: new Color(0xFF1493)
    },
    poison: {
      label: "Od trucizny",
      icon: "systems/dnd5e/icons/svg/damage/poison.svg",
      color: new Color(0x8A2BE2)
    },
    radiant: {
      label: "Radioaktywne",
      icon: "systems/dnd5e/icons/svg/damage/radiant.svg",
      color: new Color(0xBFFF00)
    },
    cold: {
      label: "Od zimna",
      icon: "systems/dnd5e/icons/svg/damage/cold.svg",
      color: new Color(0xADD8E6)
    }
  };

  // Healing types remain the same mechanically
  CONFIG.DND5E.healingTypes = {
    healing: {
      label: "Leczenie",
      color: new Color(0x46C252)
    },
    temphp: {
      label: "Tymczasowe PW",
      color: new Color(0x4B8DC2)
    }
  };

  console.log("Neuroshima 5e | Damage types overridden (12 Neuroshima types)");
}
