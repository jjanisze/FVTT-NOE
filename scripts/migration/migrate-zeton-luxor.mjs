/**
 * Neuroshima 5e — consolidate every loose casino-chip placeholder into the real Żeton Luxor.
 *
 * Found live (2026-09-07), auditing Alan: the same physical prop existed under FOUR different
 * names, with three different prices (one non-zero, two at 0) and the stale "gp" currency key —
 * Alan "żeton kasyna 10g" (qty 5), Lorentz "Żetony Luxor" (qty 10, right name/wrong price),
 * Raynald "5 zetonów" (qty **1** — the "5" is a leading count baked into the NAME, not the real
 * quantity, same import artifact `inventory-audit.mjs`'s `_leadingCount` already exists to catch
 * for grenades/chemia), Piekarz "Żetony" (qty 9). See `items/zeton-luxor.mjs` for the canonical
 * item this converts everything into, and IMPLEMENTATION.md (17)/(18) for the session-12-
 * transcript research behind why Victor is deliberately NOT touched by this migration — the
 * transcript has him paid in a paper IOU instead of chips, not a chip count to normalize.
 *
 * Unlike this folder's other migrations, there is no type-boundary crossing here (every
 * placeholder is already `loot`, same as the real item) — a plain `update()` is safe and keeps
 * the original `_id`, no delete+create needed.
 *
 * Usage (console or macro), same shape as this folder's other migrations:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateZetonLuxor();                              // dry run, every actor
 *   await api.migrateZetonLuxor({ commit: true });
 *   await api.migrateZetonLuxor({ actors: ["Alan"], commit: true });
 */

import { isZetonLuxor, buildZetonLuxorItemData } from "../items/zeton-luxor.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Loose, deliberately forgiving — matches any of the four legacy names, but not the real
 * item once it exists (that one already carries the flag, excluded here). */
function _isLooseZetonPlaceholder(item) {
  if (item.type !== "loot") return false;
  if (isZetonLuxor(item)) return false;
  return /żeton|zeton/i.test(item.name ?? "");
}

/** A leading count baked into the name itself (e.g. "5 zetonów" -> 5), same idiom as
 * `inventory-audit.mjs`'s `_leadingCount` for grenades/chemia. Falls back to the item's own
 * `system.quantity` when the name has no leading digit — that's the common case here. */
function _resolveQuantity(item) {
  const m = String(item.name ?? "").match(/^(\d+)\s+/);
  if (m) return Number(m[1]);
  return item.system?.quantity ?? 1;
}

/** Czyste predykaty wystawione dla testów Quench — Warstwa 4 (TESTING.md). */
export const __testing = Object.freeze({
  isLooseZetonPlaceholder: _isLooseZetonPlaceholder,
  resolveQuantity: _resolveQuantity,
});

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.actors] Restrict to these actor names instead of every actor.
 */
export async function migrateZetonLuxor({ commit = false, actors = null } = {}) {
  const targetActors = actors
    ? actors.map(name => game.actors.find(a => a.name === name)).filter(Boolean)
    : game.actors.contents;

  const report = [];

  for (const actor of targetActors) {
    for (const item of actor.items.filter(_isLooseZetonPlaceholder)) {
      const quantity = _resolveQuantity(item);

      report.push({
        aktor: actor.name,
        przedmiot: item.name,
        id: item.id,
        ilość: quantity,
        status: commit ? "przekonwertowano" : "gotowe do konwersji",
      });

      if (!commit) continue;

      try {
        const data = buildZetonLuxorItemData({ quantity });
        delete data.type; // type unchanged (loot -> loot) — plain update, keep the original _id
        await item.update(data);
      } catch (e) {
        console.error(`${MODULE_ID} | migrateZetonLuxor: konwersja nie powiodła się na ${actor.name}`, e);
        report[report.length - 1].status = "BŁĄD — patrz konsola";
      }
    }
  }

  _printReport(report, commit);
  return report;
}

function _printReport(report, commit) {
  console.table(report);
  const done = report.length;
  const summary = commit
    ? `Żeton Luxor: przekonwertowano ${done} przedmiotów.`
    : `Żeton Luxor: ${done} przedmiotów gotowych. Uruchom z { commit: true }, aby zastosować.`;
  ui.notifications?.info(summary);
  console.log(`%c${summary}`, "font-weight:bold");
}

/* -------------------------------------------- */

export function registerZetonLuxorMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateZetonLuxor = migrateZetonLuxor;
  }
}
