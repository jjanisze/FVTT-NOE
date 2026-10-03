/**
 * Neuroshima 5e — treść Koloru Kobaltu w puli awansu (ItemChoice).
 *
 * Paczki zawierają WKK zawsze (`scripts/wkk/README.md`), więc pula „Zdolność z profesji"
 * Kowboja zawiera też Pistolero. Przy wyłączonym Kobalcie chowamy z puli przedmioty z flagą
 * `kobalt`, zanim dnd5e zbuduje listę wyboru. Już wybranych nie ruszamy: dnd5e pokaże je jak
 * każdy przedmiot spoza puli, a przełącznik decyduje o tym, co da się wybrać, nie o tym,
 * co postać już ma.
 *
 * Jedyny punkt zaczepienia to `ItemChoiceFlow#_prepareContentContext`, które leniwie wypełnia
 * `this.pool ??= …` — podstawiamy przefiltrowaną pulę przed pierwszym wywołaniem.
 */

import { isKobaltEnabled } from "../config/settings.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export function isKobaltItem(item) {
  return item?.getFlag?.(MODULE_ID, "kobalt") === true;
}

/**
 * @param {Item5e[]} pool
 * @param {{ kobalt?: boolean }} [o]
 * @returns {Item5e[]}
 */
export function filterKobaltPool(pool, { kobalt = isKobaltEnabled() } = {}) {
  return kobalt ? pool : pool.filter(item => !isKobaltItem(item));
}

export function registerKobaltAdvancement() {
  const Flow = globalThis.dnd5e?.applications?.advancement?.ItemChoiceFlow;
  if (!Flow?.prototype?._prepareContentContext) {
    console.warn(`${MODULE_ID} | ItemChoiceFlow not found — Kolor Kobaltu content stays in level-up pools`);
    return;
  }

  const original = Flow.prototype._prepareContentContext;
  Flow.prototype._prepareContentContext = async function(context, options) {
    if (!this.pool) {
      const pool = await Promise.all(this.advancement.configuration.pool.map(i => fromUuid(i.uuid)));
      this.pool = filterKobaltPool(pool.filter(Boolean));
    }
    return original.call(this, context, options);
  };
}
