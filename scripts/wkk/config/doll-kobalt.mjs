/**
 * Neuroshima 5e — Lalka (paper doll): wpisy WKK.
 *
 * Host: `actors/doll.mjs` (z modelem `actors/doll-model.mjs`). Plan: `PLAN_paper_doll.md`.
 * Kształt — wzorzec nadpisania z `scripts/wkk/README.md`: wartość RAW zostaje w hoście
 * (`HEAVY_ARMOR_BLOCKS_RAW`), tu leży tylko to, co dokłada Kobalt.
 */

/**
 * D23 — pancerz wspomagany (Stalowej Policji, wojskowy hydrauliczny). NOE: to ciężki pancerz,
 * więc wyklucza ochraniacze, a hełm wolno. WKK idzie dalej: wyklucza też **Hełm, Głowę, Twarz
 * i Strój**. Szczelność pancerza robi za maskę przeciwgazową, a najlepszy pancerz w grze ma
 * kosztować stare zabawki. Latarka na Ramieniu zostaje.
 */
export const POWER_ARMOR_BLOCKS_KOBALT = Object.freeze(["head", "headGear", "faceGear", "outfit"]);
