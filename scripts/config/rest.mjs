/**
 * Neuroshima 5e — Rest duration overrides.
 * 
 * Neuroshima rest rules:
 * - Krótki odpoczynek (Short Rest): 4 hours (not 1h)
 * - Długi odpoczynek (Long Rest): 24 hours (not 8h)
 * - Long rest reduces exhaustion by 1 (kept from dnd5e)
 * - Interrupted long rest after 4+ hours → short rest benefits
 */
export function registerRestOverrides() {
  const restTypes = CONFIG.DND5E.restTypes;
  if (!restTypes) {
    console.warn("Neuroshima 5e | restTypes not found, skipping override");
    return;
  }

  // Short rest: 4 hours = 240 minutes
  if (restTypes.short?.duration) {
    restTypes.short.duration.normal = 240;
    restTypes.short.duration.gritty = 240;  // No gritty/epic variants in Neuroshima
    restTypes.short.duration.epic = 240;
  }

  // Long rest: 24 hours = 1440 minutes
  if (restTypes.long?.duration) {
    restTypes.long.duration.normal = 1440;
    restTypes.long.duration.gritty = 1440;
    restTypes.long.duration.epic = 1440;
  }

  // Polish labels (direct strings for CONFIG, bypass preLocalize)
  if (restTypes.short) restTypes.short.label = "Krótki odpoczynek";
  if (restTypes.long) restTypes.long.label = "Długi odpoczynek";

  console.log("Neuroshima 5e | Rest durations overridden (KO: 4h, DO: 24h)");
}
