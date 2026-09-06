/**
 * Neuroshima 5e — rescale Chemia/Części elektroniczne/Części zamienne to 100 g units.
 *
 * Player-facing ask (2026-09-06, Ekwipunek readability pass): these three Surowce types
 * (`config/surowce-data.mjs`, codes CH/CE/CZ) were being tracked in coarse 1 kg units —
 * every existing item stack has `system.weight.value` around 1 (kg) per unit. GM's explicit
 * choice: a real data conversion, not just a display change (see `actors/encumbrance-
 * breakdown.mjs`'s own doc comment for the display-only fixes that shipped alongside this) —
 * MK and MO are deliberately NOT touched, they stay at whatever granularity they already have.
 *
 * ## The conversion is a pure 10x rescale, not a "fix items that are exactly 1kg" patch
 *
 * For every matching item: `quantity × 10`, `weight.value ÷ 10`. This is applied uniformly
 * regardless of an item's *current* per-unit weight (not gated on it being exactly 1) — the
 * ask was "the unit should be 100g, not 1kg" as a blanket statement about the type, not a
 * conditional fix for stacks that happen to already be at exactly 1kg/unit. Because it's a
 * pure ratio, the actual total carried weight (`weight.value * quantity`) is mathematically
 * unchanged — this is a granularity change, not a balance change. Every piece of code that
 * consumes/moves these resources by weight already works in raw kg totals, not "units", so
 * none of it needed touching:
 *   - `weapons/pochodnia.mjs`'s `_consumeKgOfSurowiec` (refuelling with CH) sums
 *     `perUnitKg * qty` across stacks and can already spend a fractional slice of a stack —
 *     finer-grained stacks after this migration make that math MORE precise, not different.
 *   - `actors/surowce-inventory.mjs`'s `_transferToVehicle` reads each item's own
 *     `_itemWeightKg(item)` directly, never assumes 1 kg.
 *   - Both files' weight formatters already render anything under 1 kg as grams, so a single
 *     post-migration 100 g unit displays correctly with zero changes.
 *
 * ## Idempotency
 *
 * Unlike this folder's other migrations (which converge on a fixed target value, so re-running
 * is naturally a no-op), "divide by 10" has no fixed target to check against — running it twice
 * would silently divide by 100 total. Each converted item is tagged
 * `flags.<module>.surowceRescaled100g` and skipped on any later run, including future ones that
 * pick up a brand new CH/CE/CZ item someone created after this shipped (still following the old
 * 1 kg convention) — that's intended, not a bug: this stays a "fix the unit, whenever a
 * not-yet-fixed item turns up" operation, not a strictly one-time script.
 *
 * ## The Zbrojownia catalog is already correct — never touch it
 *
 * Caught live by the first dry run, before anything was committed: the `isZbrojownia`-flagged
 * actor (the same reference/display actor `createWeapons()`, `createLatarkaStock()`,
 * `createFlaraStock()` etc. all target) already stocks "Chemia (CH) 100 g" / "Części zapasowe
 * (CZ) 100 g" / "Części elektroniczne (CE) 100 g" at `weight.value: 0.1` — someone had already
 * set the CATALOG up on the 100 g convention this migration exists to retrofit everywhere else.
 * A blind ×10/÷10 sweep would have "corrected" those already-correct reference items down to
 * 10 g/unit — exactly the kind of catalog-vs-issued-copy drift `project_catalog_drift_
 * distributed_copies` warns about, just running in the opposite direction from usual (the
 * catalog was right, the issued copies — Raynald's "Litry chemii", Victor's "pół kilo
 * elektroniki", both at a full 1 kg/unit despite that second name — had drifted). Fixed by
 * unconditionally excluding any `isZbrojownia`-flagged actor from this migration, even if named
 * explicitly in `actors` — there's never a legitimate reason to rescale the reference copy.
 *
 * Usage (console or macro), same shape as this folder's other migrations:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.rescaleSurowceUnits();                                  // dry run, everyone
 *   await api.rescaleSurowceUnits({ commit: true });
 *   await api.rescaleSurowceUnits({ actors: ["Raynald of Châtillon"], commit: true });
 */

import { getSurowiecType } from "../config/surowce-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const RESCALE_FLAG = "surowceRescaled100g";
const RESCALE_CODES = new Set(["CH", "CE", "CZ"]);
const FACTOR = 10;

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.actors] Restrict to these actor names (skips the world-items
 *   sweep too) instead of every actor plus ownerless world items.
 */
export async function rescaleSurowceUnits({ commit = false, actors = null } = {}) {
  const targetActors = (actors
    ? actors.map(name => game.actors.find(a => a.name === name)).filter(Boolean)
    : game.actors.contents
  ).filter(actor => !actor.getFlag(MODULE_ID, "isZbrojownia")); // see doc comment — never touch the reference catalog

  const scopes = targetActors.map(actor => ({ owner: actor.name, items: actor.items }));
  if (!actors) scopes.push({ owner: "(świat)", items: game.items });

  const report = [];

  for (const { owner, items } of scopes) {
    for (const item of items) {
      const type = getSurowiecType(item);
      if (!type || !RESCALE_CODES.has(type.code)) continue;
      if (item.getFlag(MODULE_ID, RESCALE_FLAG)) continue; // already converted

      const oldQty = Number(item.system.quantity ?? 0);
      const oldWeight = Number(item.system.weight?.value ?? 0);
      if (!oldQty || !oldWeight) continue; // nothing meaningful to rescale — never flagged either,
                                            // so a later real edit still gets caught next run.

      const newQty = oldQty * FACTOR;
      const newWeight = oldWeight / FACTOR;

      report.push({
        właściciel: owner,
        przedmiot: item.name,
        typ: `${type.label} (${type.code})`,
        ilość: `${oldQty} → ${newQty}`,
        "waga/szt.": `${oldWeight} → ${newWeight}`,
        "łącznie kg (bez zmian)": (oldQty * oldWeight).toFixed(3),
        status: commit ? "przeskalowano" : "gotowe do przeskalowania",
      });

      if (!commit) continue;

      await item.update({
        "system.quantity": newQty,
        "system.weight.value": newWeight,
        [`flags.${MODULE_ID}.${RESCALE_FLAG}`]: true,
      });
    }
  }

  _printReport(report, commit);
  return report;
}

function _printReport(report, commit) {
  console.table(report);
  const done = report.length;
  const summary = commit
    ? `Surowce (CH/CE/CZ): przeskalowano ${done} stosów do jednostek 100 g.`
    : `Surowce (CH/CE/CZ): ${done} stosów gotowych do przeskalowania. Uruchom z { commit: true }, aby zastosować.`;
  ui.notifications?.info(summary);
  console.log(`%c${summary}`, "font-weight:bold");
}

/* -------------------------------------------- */

export function registerRescaleSurowceMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.rescaleSurowceUnits = rescaleSurowceUnits;
  }
}
