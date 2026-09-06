/**
 * Neuroshima 5e — convert loose "Mały Medyk N/5" placeholders into the real toolkit item.
 *
 * Found live on Raynald (2026-09-06): a `loot`-typed item named "Mały Medyk 4/5" (`qty:1,
 * price:0, flags:null, description empty`) — the exact same class of pre-existing placeholder
 * bug already fixed once for Pistolet na Race (`migrate-pistolet-race.mjs`) and for Kolczatki/
 * Sidła/etc. (`migrate-gear-graduation.mjs`): a bulk-character-import stand-in that captured the
 * NAME and (sometimes) a rough icon/weight, but never wired real mechanics. "Narzędzia małego
 * medyka" is not a new item here — `toolkits-data.mjs`'s `medyka` entry and `items/toolkit-
 * medyk.mjs`'s whole heal flow were already fully built (that file's own doc comment used to
 * wrongly claim otherwise — fixed alongside this migration, not by it). This is the retrofit for
 * whatever placeholder copies already exist in the live world.
 *
 * The "N/5" in the placeholder's own name is preserved, not reset to full — `_parseCharges`
 * reads it generically (any "N/M" pattern), so this isn't hardcoded to Raynald's specific "4/5".
 *
 * ## Why a migration script and not a bare `item.update({type: "tool", ...})`
 *
 * Same reasoning `migrate-pistolet-race.mjs` already documented (not re-verified here — three
 * confirmations of the same Foundry behaviour in one codebase is enough, see `migrate-gear-
 * graduation.mjs`'s own note): a plain `item.update({type: "tool", ...})` on an item that is
 * currently a DIFFERENT type silently drops the type change and everything else in that same
 * update call. Crossing a type boundary needs delete-then-create instead, which loses the
 * placeholder's original `_id` — accepted cost, same as every other migration in this folder.
 *
 * This creates the replacement TOOL item first (via `createToolkits`, so it gets the exact same
 * activities/description/icon every other medyk kit gets — not a hand-rolled duplicate of that
 * logic) and only deletes the old placeholder once that succeeds.
 *
 * Usage (console or macro), same shape as this folder's other migrations:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateMedykGraduation();                              // dry run, every actor
 *   await api.migrateMedykGraduation({ commit: true });
 *   await api.migrateMedykGraduation({ actors: ["Raynald of Châtillon"], commit: true });
 */

import { createToolkits, MEDYK_MAX_CHARGES } from "../config/toolkits-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Loose, deliberately forgiving — matches "Mały Medyk 4/5", "mały medyk", etc., but not the
 * real tool item once it exists (that one is `type: "tool"`, excluded by the type check). */
function _isLooseMedykPlaceholder(item) {
  return item.type === "loot" && /ma.y\s*medyk/i.test(item.name ?? "");
}

/** Reads an "N/M" pair out of the placeholder's own name (e.g. "Mały Medyk 4/5" -> {current:4, max:5}). */
function _parseCharges(name) {
  const m = String(name ?? "").match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return { current: Number(m[1]), max: Number(m[2]) };
}

/** Czyste predykaty wystawione dla testów Quench — Warstwa 4 (TESTING.md). */
export const __testing = Object.freeze({
  isLooseMedykPlaceholder: _isLooseMedykPlaceholder,
  parseCharges: _parseCharges,
});

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.actors] Restrict to these actor names instead of every actor.
 */
export async function migrateMedykGraduation({ commit = false, actors = null } = {}) {
  const targetActors = actors
    ? actors.map(name => game.actors.find(a => a.name === name)).filter(Boolean)
    : game.actors.contents;

  const report = [];

  for (const actor of targetActors) {
    for (const item of actor.items.filter(_isLooseMedykPlaceholder)) {
      const charges = _parseCharges(item.name) ?? { current: MEDYK_MAX_CHARGES, max: MEDYK_MAX_CHARGES };

      report.push({
        aktor: actor.name,
        przedmiot: item.name,
        id: item.id,
        ładunki: `${charges.current}/${charges.max}`,
        status: commit ? "przekonwertowano" : "gotowe do konwersji",
      });

      if (!commit) continue;

      try {
        await createToolkits(actor, { only: ["medyka"] });
        const kit = actor.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
        if (kit) {
          const spent = Math.max(0, charges.max - charges.current);
          await kit.update({ "system.uses.max": String(charges.max), "system.uses.spent": spent });
        }
        await item.delete();
      } catch (e) {
        console.error(`${MODULE_ID} | migrateMedykGraduation: konwersja nie powiodła się na ${actor.name}`, e);
        report[report.length - 1].status = "BŁĄD — patrz konsola";
      }
    }
  }

  _printReport(report, commit);
  return report;
}

function _printReport(report, commit) {
  console.table(report);
  const done = report.filter(r => r.status === "przekonwertowano" || r.status === "gotowe do konwersji").length;
  const summary = commit
    ? `Mały medyk: przekonwertowano ${done} placeholderów.`
    : `Mały medyk: ${done} placeholderów gotowych. Uruchom z { commit: true }, aby zastosować.`;
  ui.notifications?.info(summary);
  console.log(`%c${summary}`, "font-weight:bold");
}

/* -------------------------------------------- */

export function registerMedykGraduationMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateMedykGraduation = migrateMedykGraduation;
  }
}
