/**
 * Neuroshima 5e — localization runtime injection (safety fallback).
 * 
 * Primary translations come from lang/pl.json, loaded natively by FVTT
 * (registered for both "en" and "pl" in module.json).
 * 
 * This function runs at i18nInit as a safety net — it verifies the
 * translations loaded correctly by checking a sentinel key.
 * If the lang file didn't load (e.g., unexpected client language),
 * it fetches and merges the translations manually.
 */
export async function injectLocalization() {
  // Check if the lang file was loaded natively
  const sentinel = game.i18n.translations?.DND5E?.Skills;
  if (sentinel === "Umiejętności") {
    console.log("Neuroshima 5e | Translations loaded natively from lang/pl.json");
    return;
  }

  // Fallback: load manually
  console.warn("Neuroshima 5e | Native lang file not detected, loading manually...");
  try {
    const resp = await fetch("modules/neuroshima-2026-overrides/lang/pl.json");
    const translations = await resp.json();
    foundry.utils.mergeObject(game.i18n.translations, translations);
    console.log("Neuroshima 5e | Translations injected manually (fallback)");
  } catch (err) {
    console.error("Neuroshima 5e | Failed to load translations:", err);
  }
}
