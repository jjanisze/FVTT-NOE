/**
 * Neuroshima 5e — terminology and ability label overrides.
 * Replaces dnd5e English labels with Neuroshima Polish terminology.
 * Removes honor/sanity abilities, cleans up spellcasting references.
 */
import { CHEMIA_TYPE, CHEMIA_SUBTYPES } from "./chemia-data.mjs";

export function registerTerminology() {
  const abilities = CONFIG.DND5E.abilities;

  // Override ability labels to Polish (direct strings, no i18n keys)
  abilities.str.label = "Siła";
  abilities.str.abbreviation = "SIŁ";
  abilities.str.fullKey = "sila";

  abilities.dex.label = "Zręczność";
  abilities.dex.abbreviation = "ZRC";
  abilities.dex.fullKey = "zrecznosc";

  abilities.con.label = "Kondycja";
  abilities.con.abbreviation = "KON";
  abilities.con.fullKey = "kondycja";

  abilities.int.label = "Inteligencja";
  abilities.int.abbreviation = "INT";
  abilities.int.fullKey = "inteligencja";

  abilities.wis.label = "Mądrość";
  abilities.wis.abbreviation = "MDR";
  abilities.wis.fullKey = "madrosc";

  abilities.cha.label = "Charyzma";
  abilities.cha.abbreviation = "CHA";
  abilities.cha.fullKey = "charyzma";

  // Remove honor and sanity — not used in Neuroshima
  delete abilities.hon;
  delete abilities.san;

  // Override currency to gamble
  CONFIG.DND5E.currencies = {
    gb: {
      label: "Gamble",
      abbreviation: "gb",
      conversion: 1
    }
  };

  // Movement units — keep ft/mi in CONFIG (actors store those values in DB
  // and dnd5e crashes on unknown units), but set metric as defaults.
  if (CONFIG.DND5E.defaultUnits) {
    CONFIG.DND5E.defaultUnits.length = { imperial: "m", metric: "m" };
  }
  // Add "pola" (tactical squares, 1.5 m each) if not present
  if (CONFIG.DND5E.movementUnits && !CONFIG.DND5E.movementUnits.sq) {
    CONFIG.DND5E.movementUnits.sq = {
      label: "pola",
      abbreviation: "pol.",
      conversion: 3 / 10,  // matching dnd5e simplified 1.5 m per square
      type: "metric"
    };
  }

  // Level cap: 12 instead of 20
  if (CONFIG.DND5E.maxLevel !== undefined) {
    CONFIG.DND5E.maxLevel = 12;
  }

  // Proficiency bonus stays the same math (d20 PB by level)
  // but maxAbilityScore stays 20
  CONFIG.DND5E.maxAbilityScore = 20;

  // Add Magazine consumable subtype
  if (CONFIG.DND5E.consumableTypes) {
    CONFIG.DND5E.consumableTypes.magazine = {
      label: "Magazynki i Kołczany",
      subtypes: {
         palnaKrotka: "Mag. do broni krótkiej",
         palnaPosr: "Mag. do broni pośredniej",
         palnaDluga: "Mag. do broni długiej",
         palnaCiezka: "Mag. do broni ciężkiej",
         miotana: "Kołczan / Ładownica"
      }
    };
    
    // Sort keys or adjust order? We want it near Amunicja.
    // DND5e sorts categories alphabetically typically, but we can't force index directly.

    // Lekarstwa — leki, chemia i narkotyki są konsumpcyjne, więc dziedziczą
    // natywny pipeline quantity/uses/activity (patrz config/chemia-data.mjs).
    CONFIG.DND5E.consumableTypes[CHEMIA_TYPE] = {
      label: "Lekarstwa",
      subtypes: { ...CHEMIA_SUBTYPES }
    };
  }

  console.log("Neuroshima 5e | Terminology overrides applied");
}
