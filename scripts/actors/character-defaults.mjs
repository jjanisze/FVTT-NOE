/**
 * Neuroshima 5e — wartości startowe postaci, które dnd5e bierze z gatunku.
 *
 * NOE nie ma gatunków: „Każdy bohater rozpoczyna grę z Szybkością wynoszącą 9 metrów"
 * (Tworzenie postaci). dnd5e 5.3 liczy Szybkość postaci z przedmiotu gatunku
 * (`CharacterData#prepareEmbeddedData`: bez gatunku `movement.walk ??= 0`), więc postać
 * założona od zera w Foundry miała Szybkość 0 — nie chodzi, a silnik okoliczności ataku
 * traktuje ją jak istotę nieporuszającą się. Postacie z importu Roll20 mają 9 m z gatunku
 * z importu, dlatego nikt tego nie zauważył przed czystą instalacją (B6, 2026-10-08).
 *
 * Wartość trafia do danych przy tworzeniu aktora (jak u importowanych), nie do danych
 * pochodnych: Konfiguracja ruchu pokazuje 9 i MG może ją zmienić. Jawna wartość z importu
 * lub duplikatu zostaje nietknięta.
 */

/** NOE, Tworzenie postaci — Szybkość startowa w metrach. */
export const SZYBKOSC_STARTOWA_M = 9;

/**
 * Czy dane nowego aktora potrzebują startowej Szybkości. Czysta funkcja.
 * @param {string} type        Typ aktora.
 * @param {object} data        Dane tworzenia (`preCreateActor`).
 * @returns {boolean}
 */
export function potrzebujeSzybkosci(type, data) {
  if (type !== "character") return false;
  const walk = foundry.utils.getProperty(data ?? {}, "system.attributes.movement.walk");
  return walk === undefined || walk === null || walk === "";
}

export function registerCharacterDefaults() {
  Hooks.on("preCreateActor", (actor, data) => {
    if (!potrzebujeSzybkosci(actor.type, data)) return;
    actor.updateSource({ "system.attributes.movement.walk": String(SZYBKOSC_STARTOWA_M) });
  });
  console.log("Neuroshima 5e | Character defaults registered (Szybkość 9 m)");
}
