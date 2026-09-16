/**
 * Neuroshima 5e — Udźwig: CONFIG.DND5E overrides matching RAW.
 *
 * Podręcznik ("Zasady szczegółowe → Udźwig", verified against the correctly-OCR'd
 * `Podrecznik/source_japierdole.txt:18641-18649` — the cleaned `agent-md` copy garbles
 * this exact table, don't trust it) gives a flat per-size multiplier table:
 *
 *   ROZMIAR   UŻYTKOWY      MAKSYMALNY     (relative to Średni/Medium = ×1)
 *   Malutki   Siła × 1 kg   Siła × 2 kg    → ×0.2
 *   Mały      Siła × 2 kg   Siła × 4 kg    → ×0.4
 *   Średni    Siła × 5 kg   Siła × 10 kg   → ×1      (every PC in this campaign)
 *   Duży      Siła × 10 kg  Siła × 20 kg   → ×2
 *   Wielki    Siła × 20 kg  Siła × 40 kg   → ×4
 *   Ogromny   Siła × 40 kg  Siła × 80 kg   → ×8
 *
 * dnd5e core (`data/actor/templates/attributes.mjs#prepareEncumbrance`) already computes
 * a structurally similar multi-tier system, and two of its constants already coincide
 * with this table by pure accident: `threshold.heavilyEncumbered.metric = 5` (dnd5e's own
 * SRD "heavily encumbered" line, in kg) IS RAW's Medium Udźwig użytkowy multiplier, and
 * `actorSizes.{lg,huge,grg}.capacityMultiplier` (2/4/8) already match Duży/Wielki/Ogromny.
 * Nobody put those there on purpose — dnd5e's own scale simply happens to line up above
 * Medium. Below Medium it does NOT line up (dnd5e: tiny=0.5, sm=1 (unset→default); RAW:
 * 0.2/0.4), and dnd5e's top ("maximum") tier is its own SRD value (Siła × 7.5, i.e. the
 * imperial 15 lb/STR halved for metric) — completely unrelated to RAW's × 10.
 *
 * Until this override, the character sheet showed ONLY that stray dnd5e `maximum` number
 * as "Udźwig", with no separate Użytkowy figure surfaced anywhere — and because 7.5 is
 * exactly the arithmetic mean of RAW's 5 and 10, it read as a suspiciously plausible, but
 * wrong, single value (verified live: Alan STR 10 showed 75 kg; RAW is 50/100).
 *
 * `threshold.encumbered` (dnd5e's own ×2.5 middle tier) has no RAW equivalent. Left
 * untouched but unused — `actors/encumbrance-breakdown.mjs` never reads it.
 */
export function registerEncumbranceConfig() {
  CONFIG.DND5E.encumbrance.threshold.maximum.metric = 10; // was 7.5

  // "sm" ships with neither `capacityMultiplier` nor `token`, so it silently defaulted
  // to the same ×1 as Medium (see `sizeConfig?.capacityMultiplier ?? sizeConfig?.token ?? 1`
  // in dnd5e's prepareEncumbrance) — RAW gives it half of Medium's, not the same.
  CONFIG.DND5E.actorSizes.tiny.capacityMultiplier = 0.2; // was 0.5
  CONFIG.DND5E.actorSizes.sm.capacityMultiplier = 0.4; // was unset (→ 1, i.e. same as Medium)
}
