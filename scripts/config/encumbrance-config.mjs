/**
 * Neuroshima 5e — Udźwig: CONFIG.DND5E overrides matching RAW.
 *
 * Podręcznik ("Zasady szczegółowe → Udźwig", `Podrecznik/NOE/`, s. 257)
 * gives a flat per-size multiplier table:
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
  registerMetricUnits();
}

/** dnd5e's unit switches; every one defaults to imperial (`false`) in a fresh world. */
const METRIC_SETTINGS = ["metricWeightUnits", "metricLengthUnits", "metricVolumeUnits"];

/**
 * Neuroshima is metric: RAW gives kilograms and metres, and the overrides above change only
 * dnd5e's `.metric` constants. A fresh dnd5e world starts imperial, so on a new install Udźwig came
 * out in pounds — Użytkowy equal to the imperial "heavily encumbered" line, labelled as kg. Caught
 * 2026-10-05 by the release gate (module installed from the zip into a fresh world: 8 Udźwig tests
 * red; the campaign world had metric set by hand). GM decision: the module switches it on itself.
 *
 * Once, on the active GM's `ready`, with a notice. dnd5e registers these settings without
 * `onChange`, so encumbrance stays computed in the old units until the actor is prepared again —
 * every client re-prepares its actors when one of them is created or changed.
 */
function registerMetricUnits() {
  Hooks.once("ready", async () => {
    if (!game.users.activeGM?.isSelf) return;
    const off = METRIC_SETTINGS.filter(key => !game.settings.get("dnd5e", key));
    if (!off.length) return;
    for (const key of off) await game.settings.set("dnd5e", key, true);
    ui.notifications.info("Neuroshima: włączono jednostki metryczne (kg, m, l) — Udźwig i odległości "
      + "w podręczniku są metryczne. Ustawienia systemu dnd5e → Jednostki.", { permanent: true });
  });
  const onUnitsChanged = setting => {
    if (!METRIC_SETTINGS.some(key => setting.key === `dnd5e.${key}`)) return;
    for (const actor of game.actors ?? []) actor.reset();
    for (const token of canvas?.tokens?.placeables ?? []) if (!token.document.actorLink) token.actor?.reset();
  };
  Hooks.on("createSetting", onUnitsChanged);
  Hooks.on("updateSetting", onUnitsChanged);
}
