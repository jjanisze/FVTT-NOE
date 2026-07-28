/**
 * Neuroshima 5e — tool proficiency overrides.
 * Replaces stock dnd5e tools with 22 Neuroshima tool sets (narzędzia małego X).
 * Each tool has a governing ability and a Polish label.
 */
export function registerTools() {
  CONFIG.DND5E.tools = {
    aptekarza: {
      ability: "int",
      label: "Narzędzia małego aptekarza"
    },
    charakteryzatora: {
      ability: "dex",
      label: "Narzędzia małego charakteryzatora"
    },
    chemika: {
      ability: "int",
      label: "Narzędzia małego chemika"
    },
    elektronika: {
      ability: "dex",
      label: "Narzędzia małego elektronika"
    },
    falszerza: {
      ability: "dex",
      label: "Narzędzia małego fałszerza"
    },
    gorzelnika: {
      ability: "wis",
      label: "Narzędzia małego gorzelnika"
    },
    hakera: {
      ability: "int",
      label: "Narzędzia małego hakera"
    },
    jubilera: {
      ability: "int",
      label: "Narzędzia małego jubilera"
    },
    kartografa: {
      ability: "int",
      label: "Narzędzia małego kartografa"
    },
    klusownika: {
      ability: "dex",
      label: "Narzędzia małego kłusownika"
    },
    kowala: {
      ability: "str",
      label: "Narzędzia małego kowala"
    },
    krawca: {
      ability: "dex",
      label: "Narzędzia małego krawca"
    },
    kucharza: {
      ability: "wis",
      label: "Narzędzia małego kucharza"
    },
    mechanika: {
      ability: "dex",
      label: "Narzędzia małego mechanika"
    },
    medyka: {
      ability: "int",
      label: "Narzędzia małego medyka"
    },
    rusznikarza: {
      ability: "dex",
      label: "Narzędzia małego rusznikarza"
    },
    rzeznika: {
      ability: "wis",
      label: "Narzędzia małego rzeźnika"
    },
    stolarza: {
      ability: "dex",
      label: "Narzędzia małego stolarza"
    },
    szulera: {
      ability: "wis",
      label: "Narzędzia małego szulera"
    },
    szklarza: {
      ability: "int",
      label: "Narzędzia małego szklarza"
    },
    slusarza: {
      ability: "dex",
      label: "Narzędzia małego ślusarza"
    },
    tatuazysty: {
      ability: "dex",
      label: "Narzędzia małego tatuażysty"
    }
  };

  // Remove stock dnd5e tool categories that don't apply
  CONFIG.DND5E.toolTypes = {
    tool: "Narzędzia"
  };

  // dnd5e's Trait.keyLabel() resolves a tool's display name via its base-item `id`
  // (CONFIG.DND5E.tools[key].id → compendium Item). Our tools are custom and have no
  // base item, so we set an empty `id`: this prevents getBaseItemUUID() from crashing on
  // `undefined.startsWith` and lets keyLabel() fall through to return our `label`.
  for ( const tool of Object.values(CONFIG.DND5E.tools) ) {
    if ( tool.id === undefined ) tool.id = "";
  }

  CONFIG.DND5E.toolProficiencies = {
    1: "Biegłość w narzędziach"
  };

  // keyLabel() reads the tool trait's `configKey` (= "toolProficiencies") as the label
  // source for the fallthrough. Mirror each tool's label there so chat-card tool-check
  // buttons and proficiency dialogs show "Narzędzia małego X" instead of the raw key.
  // NOTE: must run AFTER the toolProficiencies reassignment above.
  for ( const [key, cfg] of Object.entries(CONFIG.DND5E.tools) ) {
    CONFIG.DND5E.toolProficiencies[key] = cfg.label;
  }

  console.log("Neuroshima 5e | Tools overridden (22 Neuroshima tool sets)");
}
