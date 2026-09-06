/**
 * Neuroshima 5e — fix already-issued copies of the 5 gear-placeholder stubs that graduated
 * to real items in batch 39 (Sidła, Sprzęt do wspinaczki, Strzały, Wózek, Kolczatki).
 *
 * `gear-data.mjs`'s `createRealGear`/`kolczatka.mjs`'s `createKolczatkaStock` only refresh
 * whichever ONE actor they're called against (by design — same as every other create/stock
 * helper in this module, see `flara.mjs`'s `createFlaraStock` doc comment). Any OTHER actor
 * already holding one of the old unpriced `craftingPlaceholder:true` stubs — or, as found live on
 * Raynald (2026-09-06): a flagless, hand-typed "Kolczatka" (singular, `type: "loot"`, `flags:
 * null` — not a `GEAR_PLACEHOLDERS` stub at all, almost certainly a bulk-character-import stand-in)
 * whose `img` had silently defaulted to his own actor portrait, not a bug in the shared catalog —
 * is left stale until something goes and fixes it. This is that something, same shape as this
 * folder's other migrations (`migrate-pistolet-race.mjs`), extended (`_isStaleGearPlaceholder`
 * below) to catch both shapes.
 *
 * Four of the five (Sidła/Sprzęt do wspinaczki/Strzały/Wózek) stay `type: "loot"` throughout,
 * so a plain `.update()` is safe. Kolczatki crosses a type boundary (`loot` → `consumable`,
 * to carry its new "Rozłóż kolczatki" Activity) — `migrate-pistolet-race.mjs`'s own doc comment
 * already found and documented why that needs delete-then-create instead of `.update()`: a type
 * change silently no-ops the ENTIRE update call, not just the type field. Not re-verified here,
 * same as that file didn't re-verify it from Latarka/Pochodnia — three confirmations of the same
 * Foundry behaviour in one codebase is enough.
 *
 * Usage (console or macro), same shape as this folder's other migrations:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateGearGraduation();                              // dry run, every actor
 *   await api.migrateGearGraduation({ commit: true });
 *   await api.migrateGearGraduation({ actors: ["Raynald of Châtillon"], commit: true });
 */

import { REAL_GEAR, buildRealGearItemData } from "../config/gear-data.mjs";
import { createKolczatkaItem } from "../items/kolczatka.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const REAL_GEAR_IDS = new Set(REAL_GEAR.map(g => g.id));

/** "Wózek (dwukółka)" → "wozek"; strips parentheticals/diacritics-insensitive-enough for a name match. */
function _bareName(label) {
  return label.replace(/\(.*?\)/g, "").trim().toLowerCase();
}
const _REAL_GEAR_BARE_NAMES = new Map(REAL_GEAR.map(g => [_bareName(g.label), g.id]));

/**
 * An old, already-issued copy of one of the 5 graduated ids, in EITHER of the two shapes found
 * live in this world: (a) a proper `GEAR_PLACEHOLDERS` stub (`craftingPlaceholder`+`gearId`
 * flags — the "clean" case this migration was first written for), or (b) a flagless, hand-typed
 * loot line whose name matches — found live on Raynald: an item literally named "Kolczatka"
 * (singular, `type: "loot"`, `flags: null`), almost certainly a bulk-character-import stand-in
 * (this module's own git history has a "batch-imported cast" cleanup precedent for exactly this
 * shape of gap) whose `img` had silently defaulted to the ACTOR'S OWN PORTRAIT — not a bug in the
 * shared catalog at all, just an unflagged one-off nobody's builder function ever touched. Matched
 * by name (singular/plural-tolerant, parenthetical-stripped) only when `type` is `"loot"` and the
 * item carries none of this module's flags yet — narrow enough that a coincidentally-named
 * unrelated hand-typed item is very unlikely, but real enough to actually fix what's out there
 * instead of only the theoretical clean case.
 */
function _isStaleGearPlaceholder(item) {
  if (item.type !== "loot") return false;
  const moduleFlags = item.flags?.[MODULE_ID];

  if (moduleFlags?.craftingPlaceholder) {
    const gearId = moduleFlags.gearId;
    return REAL_GEAR_IDS.has(gearId) || gearId === "kolczatki";
  }

  if (moduleFlags) return false; // already flagged as something else — not ours to touch.

  const bare = _bareName(item.name ?? "");
  if (/^kolczatk/.test(bare)) return true; // Kolczatka/Kolczatki/kolczatek, singular or plural.
  return _REAL_GEAR_BARE_NAMES.has(bare);
}

/** Resolve which graduated id a matched item corresponds to (mirrors `_isStaleGearPlaceholder`'s two shapes). */
function _resolveGearId(item) {
  const flagged = item.getFlag(MODULE_ID, "gearId");
  if (flagged) return flagged;
  const bare = _bareName(item.name ?? "");
  if (/^kolczatk/.test(bare)) return "kolczatki";
  return _REAL_GEAR_BARE_NAMES.get(bare) ?? null;
}

/**
 * Czyste predykaty wystawione dla testów Quench (`scripts/tests/`) — Warstwa 4 (TESTING.md).
 * Żaden z nich pisze do dokumentu ani dotyka `game.actors` — działają na zwykłych obiektach
 * kształtem udających Item (`type`/`name`/`flags`/`getFlag()`), więc nie potrzebują `scratchActor`.
 */
export const __testing = Object.freeze({
  isStaleGearPlaceholder: _isStaleGearPlaceholder,
  resolveGearId: _resolveGearId,
  bareName: _bareName
});

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.actors] Restrict to these actor names instead of every actor.
 */
export async function migrateGearGraduation({ commit = false, actors = null } = {}) {
  const targetActors = actors
    ? actors.map(name => game.actors.find(a => a.name === name)).filter(Boolean)
    : game.actors.contents;

  const report = [];

  for (const actor of targetActors) {
    for (const item of actor.items.filter(_isStaleGearPlaceholder)) {
      const gearId = _resolveGearId(item);
      const quantity = item.system.quantity ?? 1;
      const isKolczatki = gearId === "kolczatki";

      report.push({
        aktor: actor.name,
        przedmiot: item.name,
        gearId,
        tryb: isKolczatki ? "delete+create (zmiana typu)" : "update",
        ilość: quantity,
        status: commit ? "przekonwertowano" : "gotowe do konwersji",
      });

      if (!commit) continue;

      try {
        if (isKolczatki) {
          await createKolczatkaItem({ actor, quantity });
          await item.delete();
        } else {
          const gear = REAL_GEAR.find(g => g.id === gearId);
          const data = buildRealGearItemData(gear);
          data.system.quantity = quantity;
          // See `gear-data.mjs`'s `createRealGear` for why this explicit deletion is needed —
          // `.update()` merges `flags` by default, it won't drop the old placeholder flag on its own.
          data[`flags.${MODULE_ID}.-=craftingPlaceholder`] = null;
          await item.update(data);
        }
      } catch (e) {
        console.error(`${MODULE_ID} | migrateGearGraduation: konwersja nie powiodła się na ${actor.name}`, e);
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
    ? `Gradacja gearu: przekonwertowano ${done} placeholderów.`
    : `Gradacja gearu: ${done} placeholderów gotowych. Uruchom z { commit: true }, aby zastosować.`;
  ui.notifications?.info(summary);
  console.log(`%c${summary}`, "font-weight:bold");
}

/* -------------------------------------------- */

export function registerGearGraduationMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateGearGraduation = migrateGearGraduation;
  }
}
