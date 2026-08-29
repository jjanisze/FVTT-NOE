/**
 * Neuroshima 5e — Prowiant (food & water stock).
 *
 * RAW thresholds, `Tabele/Zywnosc.md` § Zasady Odżywiania:
 *   - eat at least 0.5 kg/day or gain a level of Wyczerpanie (Niedożywienie)
 *   - drink at least 2 L/day or gain a level of Wyczerpanie (Odwodnienie)
 *
 * This is deliberately NOT a full k100 food table matched item-by-item like
 * Surowce's five materials — a live scan of the whole party found exactly two
 * recurring item names ("Konserwa", "Litr Wody") covering nearly every
 * character's actual stock, so matching is done by loose category regex
 * instead of an enumerated catalog. `weight` is never guessed: the panel sums
 * whatever `system.weight × system.quantity` the item itself already carries,
 * on the theory that 1 L water ≈ 1 kg (true for every "Litr Wody" instance
 * seen live), so both pools can share one weight-based unit.
 *
 * Display-only, by design (2026-08-29 decision) — no automatic Wyczerpanie
 * application. This just answers "how many days of food/water do we have,"
 * matching the project's standing rule that detection is automated but
 * penalties stay a GM call.
 */

/** @typedef {{id:string, label:string, unit:string, dailyThreshold:number, accent:string, match:RegExp}} ProwiantCategory */

/** @type {ReadonlyArray<ProwiantCategory>} */
export const PROWIANT_CATEGORIES = Object.freeze([
  {
    id: "jedzenie",
    label: "Jedzenie",
    unit: "kg",
    dailyThreshold: 0.5,
    accent: "#c2925a",
    match: /konserw|prowiant\b|racj[ae]|mre\b|chleb|mi[ęe]so|\bser\b|ryb[ay]?\b|owoc|warzyw|mleko|kasz[ae]|ry[żz]u?\b|jajk|kawa|herbat/i
  },
  {
    id: "woda",
    label: "Woda",
    unit: "l",
    dailyThreshold: 2,
    accent: "#5ab0c2",
    match: /\bwod[ayę]\b|\bwody\b/i
  }
]);

/**
 * Resolve the Prowiant category for an item, or `null`.
 * `loot` and plain `consumable` both qualify — unlike Surowce/Chemia, food/water
 * stock on real sheets is almost always still typed `loot`, and forcing a retype
 * would fight the audit tool for no functional gain (nothing reads this item's
 * `type` anywhere else).
 * @param {Item} item
 * @returns {ProwiantCategory|null}
 */
export function getProwiantCategory(item) {
  if (item?.type !== "loot" && item?.type !== "consumable") return null;
  // Never double-count something the Chemia/Surowce systems already own.
  if (item.getFlag?.("neuroshima-2026-overrides", "chemiaKey")) return null;
  const name = item.name ?? "";
  for (const cat of PROWIANT_CATEGORIES) {
    if (cat.match.test(name)) return cat;
  }
  return null;
}
