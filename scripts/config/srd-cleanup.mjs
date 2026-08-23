/**
 * Neuroshima 5e — hide the dnd5e SRD fantasy content.
 *
 * Neuroshima replaces the dnd5e class layer wholesale: there are no clerics, no
 * spells, no elves. The SRD compendia that ship with the system are still present
 * and still show up in the compendium browser, in advancement item pickers, and in
 * search — which makes it far too easy to drop a Cleric onto a character sheet.
 *
 * This hides and locks them rather than deleting them:
 *   - deleting is not possible (they belong to the system, not the world)
 *   - the bestiary packs stay genuinely useful as stat-block references
 *   - a world setting lets the GM re-expose everything when converting content
 *
 * Monster support is unaffected: NPCs use `feat` items, which this never touches.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const SETTING = "hideSrdPacks";

/**
 * SRD packs with no place in Neuroshima. Bestiary/equipment packs are deliberately
 * absent — they remain available as conversion source material.
 */
const FANTASY_PACKS = [
  "dnd5e.classes",        // 12 fantasy classes incl. Cleric
  "dnd5e.classes24",
  "dnd5e.subclasses",
  "dnd5e.classfeatures",
  "dnd5e.spells",
  "dnd5e.spells24",
  "dnd5e.races",
  "dnd5e.origins24",
  "dnd5e.backgrounds",
  "dnd5e.feats24",
  "dnd5e.heroes"          // pre-made fantasy PCs
];

export function registerSrdCleanup() {
  game.settings.register(MODULE_ID, SETTING, {
    name: "Ukryj kompendia SRD (fantasy)",
    hint: "Ukrywa klasy, zaklęcia, rasy i pochodzenia D&D. Bestiariusze i ekwipunek pozostają "
        + "widoczne jako materiał źródłowy. Wymaga przeładowania świata.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => window.location.reload()
  });

  Hooks.once("ready", async () => {
    if (!game.settings.get(MODULE_ID, SETTING)) return;

    let hidden = 0;
    for (const key of FANTASY_PACKS) {
      const pack = game.packs.get(key);
      if (!pack) continue;
      // Lock so nothing can be dragged out and edited by accident.
      if (game.user.isGM && !pack.locked) {
        try { await pack.configure({ locked: true }); } catch { /* system packs may refuse */ }
      }
      pack.apps ??= [];
      hidden++;
    }

    // Hide the directory entries. The packs stay reachable via `game.packs.get()`
    // for anyone who needs them from code.
    Hooks.on("renderCompendiumDirectory", (_app, html) => {
      const root = html instanceof HTMLElement ? html : html?.[0];
      if (!root) return;
      for (const key of FANTASY_PACKS) {
        root.querySelector(`[data-pack="${key}"]`)?.classList.add("neuro-hidden-pack");
      }
    });

    console.log(`${MODULE_ID} | SRD fantasy packs hidden: ${hidden}`);
  });

  registerSheetRemnantCleanup();
}

/**
 * Hide leftover fantasy slots on the character sheet.
 *
 * "Add Species" has no Neuroshima equivalent — there are no races. dnd5e gives the
 * pill no stable selector or data-action, so it is matched by its localised label
 * and tagged with a class the stylesheet hides.
 *
 * "Add Background" is deliberately left in place — od v0.13.0 zajmują go Pochodzenia
 * (pack `pochodzenia`, 12 itemów typu `background`).
 */
function registerSheetRemnantCleanup() {
  const SPECIES_LABELS = ["add species", "dodaj gatunek", "dodaj rasę", "species", "gatunek"];

  const clean = (app, html) => {
    const actor = app.document ?? app.actor;
    if (actor?.type !== "character") return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    for (const pill of root.querySelectorAll(".pill-lg")) {
      const label = pill.textContent.trim().toLowerCase();
      if (SPECIES_LABELS.some(l => label === l)) {
        pill.classList.add("neuro-hidden-sheet-slot");
      }
    }
  };

  for (const hook of ["renderCharacterActorSheet", "renderActorSheet"]) Hooks.on(hook, clean);
}
