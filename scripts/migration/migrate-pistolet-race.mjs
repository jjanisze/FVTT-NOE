/**
 * Neuroshima 5e — convert loose "Pistolet na Race" placeholders into the real catalog weapon.
 *
 * Found live on Raynald (2026-09-06): a `loot`-typed item named "Pistolet na Race"
 * (`qty:1, weight:1, price:0`, no mechanics at all) — the exact same class of pre-existing
 * placeholder bug already fixed once for Latarka/Pochodnia (`items/latarka.mjs`'s
 * `initializeLatarka` doc comment) before those mechanics existed. "Pistolet na Race" is now a
 * real catalog entry (`config/weapons-data.mjs`, id `pistolet-na-race`) — this is the retrofit
 * for whatever placeholder copies already exist in the live world.
 *
 * ## Why a migration script and not a bare `item.update({type: "weapon", ...})`
 *
 * Confirmed elsewhere in this exact codebase (`items/latarka.mjs`'s `initializeLatarka` doc
 * comment) and not re-verified here because there is no reason to doubt it: a plain
 * `item.update({type: "weapon", ...})` on an item that is currently a *different* type silently
 * drops the type change **and everything else in that same update call** — no error, just a
 * no-op. Crossing a type boundary needs delete-then-create instead, which loses the placeholder's
 * original `_id` — accepted cost, same as the Latarka/Pochodnia precedent.
 *
 * This creates the replacement WEAPON item first and only deletes the old placeholder once that
 * succeeds — the reverse order from the literal Latarka/Pochodnia precedent (which deletes first)
 * — because unlike converting a single known form, this runs unattended across every actor in the
 * world; if `createEmbeddedDocuments` ever throws mid-run, "old placeholder still there, no new
 * weapon" is a safer failure than "neither exists." Same end state either way when nothing errors.
 *
 * Usage (console or macro), same shape as this folder's other migrations:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migratePistoletRace();                              // dry run, every actor
 *   await api.migratePistoletRace({ commit: true });
 *   await api.migratePistoletRace({ actors: ["Raynald of Châtillon"], commit: true });
 */

import { WEAPON_MAP, buildWeaponItemData } from "../config/weapons-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const WEAPON_ID = "pistolet-na-race";

/** Loose, deliberately forgiving — same "loot placeholder, name says what it is" shape as the
 * Latarka/Pochodnia placeholders this mirrors. Matches "Pistolet na Race" and small variations
 * ("pistolet na race", "Pistolet Na Race") without matching the real weapon once it exists
 * (that one is `type: "weapon"`, excluded by the type check below). */
function _isLooseLootPlaceholder(item) {
  return item.type === "loot" && /pistolet\s*na\s*rac/i.test(item.name ?? "");
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.actors] Restrict to these actor names instead of every actor.
 */
export async function migratePistoletRace({ commit = false, actors = null } = {}) {
  const cat = WEAPON_MAP[WEAPON_ID];
  if (!cat) throw new Error(`migratePistoletRace: brak "${WEAPON_ID}" w WEAPON_MAP — katalog nie załadowany?`);

  const targetActors = actors
    ? actors.map(name => game.actors.find(a => a.name === name)).filter(Boolean)
    : game.actors.contents;

  const report = [];

  for (const actor of targetActors) {
    for (const item of actor.items.filter(_isLooseLootPlaceholder)) {
      const quantity = item.system.quantity ?? 1;
      const equipped = !!item.system.equipped;

      report.push({
        aktor: actor.name,
        przedmiot: item.name,
        id: item.id,
        ilość: quantity,
        equipped,
        status: commit ? "przekonwertowano" : "gotowe do konwersji",
      });

      if (!commit) continue;

      const data = buildWeaponItemData(cat);
      data.system.quantity = quantity;
      data.system.equipped = equipped;
      // `buildWeaponItemData` defaults a fresh weapon's mag to "topped up" (current = max) — the
      // right call for the Zbrojownia's own display stock, wrong here: the placeholder it's
      // replacing never tracked a chambered round, so defaulting to "loaded" would conjure a
      // free flare out of nowhere on top of whatever loose Race Pistoletowe the actor is given
      // separately. Starts empty; load it through the normal reload flow instead.
      data.flags[MODULE_ID].mag.current = 0;

      try {
        await actor.createEmbeddedDocuments("Item", [data]);
        await item.delete();
      } catch (e) {
        console.error(`${MODULE_ID} | migratePistoletRace: konwersja nie powiodła się na ${actor.name}`, e);
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
    ? `Pistolet na Race: przekonwertowano ${done} placeholderów.`
    : `Pistolet na Race: ${done} placeholderów gotowych. Uruchom z { commit: true }, aby zastosować.`;
  ui.notifications?.info(summary);
  console.log(`%c${summary}`, "font-weight:bold");
}

/* -------------------------------------------- */

export function registerPistoletRaceMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migratePistoletRace = migratePistoletRace;
  }
}
