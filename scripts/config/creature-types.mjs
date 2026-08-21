/**
 * Neuroshima 5e — creature types (kategorie Bestiariusza).
 *
 * `CONFIG.DND5E.creatureTypes` ships the D&D fantasy taxonomy — Aberracja,
 * Demon, Smok, Żywiołak, Istota niebiańska. None of it exists in Podzielone
 * Stany. The Bestiariusz sorts all 52 entries into exactly five categories, and
 * those are what the NPC sheet's type selector should offer.
 *
 * ## Why this is mutated, not replaced
 *
 * Same reason as `weapons.mjs` and `conditions.mjs` (ARCHITECTURE.md §1): the
 * dnd5e sheet caches a reference to this object, so reassigning it leaves the
 * dropdown rendering the old list.
 *
 * ## Why the schema is left permissive
 *
 * 57 NPCs in the live world carry free-text `details.type.value` — "Potwór",
 * "Maszyna (Molocha)", "maszyna Molocha", "(człowiek)", "beast", `null`, and a
 * dozen more. `CreatureTypeField.value` is a plain `StringField` with no
 * `choices` (module/data/shared/creature-type-field.mjs:9), and it must stay
 * that way: restricting it would throw DataModelValidationError on world load
 * for every one of those actors. This file only changes what the UI *offers*.
 *
 * ## Splatter
 *
 * The blood tag lives in `details.type.custom`, not here — Splatter matches that
 * field by substring. See `Bestiariusz.md` for the tag legend and
 * `BLOOD_TYPES` below for the colours.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * The five Bestiariusz categories, keyed by the id `bestiary-data.mjs` emits.
 * @type {Readonly<Record<string, {label: string, plural: string, reference: string}>>}
 */
export const NEUROSHIMA_CREATURE_TYPES = Object.freeze({
  czlowiek: { label: "Człowiek", plural: "Ludzie" },
  maszyna: { label: "Maszyna", plural: "Maszyny" },
  mutant: { label: "Mutant", plural: "Mutanci" },
  potwor: { label: "Potwór", plural: "Potwory" },
  zwierze: { label: "Zwierzę", plural: "Zwierzęta" },
  // Not a Bestiariusz heading of its own — Rój Szczurów is filed under Zwierzęta
  // — but dnd5e models swarms through `details.type.swarm`, and a swarm needs a
  // base type to swarm *of*. Kept separate so the sheet can say what it is.
  rojZwierzat: { label: "Rój zwierząt", plural: "Roje" },
});

/**
 * Splatter blood tags, per the legend in `Podrecznik/Bestiariusz/Bestiariusz.md`.
 * Written into `details.type.custom` by the pack builder; Splatter reads it by
 * substring match, which is why the tags are single lowercase words.
 * @type {Readonly<Record<string, {color: string, label: string}>>}
 */
export const BLOOD_TYPES = Object.freeze({
  czerwona: { color: "#a51414d8", label: "Czerwona krew" },
  moloch: { color: "#2b1d12d8", label: "Smar/olej hydrauliczny" },
  smart: { color: "#c9848fd8", label: "Bio-posoka SMART-a" },
  owad: { color: "#1a7a6bd8", label: "Hemolimfa" },
  nieumarly: { color: "#440707d8", label: "Krew nosiciela, sczerniała" },
});

/**
 * Replace the fantasy taxonomy with the Neuroshima one.
 *
 * Must run at `init`: dnd5e calls `preLocalize("creatureTypes", ...)` and folds
 * the result into sheet context during `i18nInit`.
 */
export function registerCreatureTypes() {
  const types = CONFIG.DND5E?.creatureTypes;
  if (!types) {
    console.warn(`${MODULE_ID} | creatureTypes not found, skipping override`);
    return;
  }

  for (const key of Object.keys(types)) delete types[key];
  for (const [key, def] of Object.entries(NEUROSHIMA_CREATURE_TYPES)) {
    types[key] = { label: def.label, plural: def.plural };
  }

  console.log(`${MODULE_ID} | Creature types overridden `
    + `(${Object.keys(NEUROSHIMA_CREATURE_TYPES).length} kategorii Bestiariusza)`);
}
