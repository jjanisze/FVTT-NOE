/**
 * Neuroshima 5e — Sekrety MG (przedmioty niejawne przed graczem).
 *
 * Foundry nie ma natywnego sposobu, żeby ukryć JEDEN wbudowany przedmiot przed graczem,
 * który poza tym widzi (i ma prawo widzieć) całą resztę karty — `ownership` na Item jest,
 * ale lista Ekwipunku na karcie po prostu czyta `actor.items` w całości i nigdy nie sprawdza
 * uprawnień pojedynczego przedmiotu (potwierdzone w źródle dnd5e: `_prepareItems`/
 * `_filterChildren` filtrują po typie/nazwie/szufladce, nie po `testUserPermission`).
 * Właściciel karty zobaczyłby więc znacznik „niejawny" i tak.
 *
 * Rozwiązanie: flaga `flags.<module>.gmSecret = true` na przedmiocie + usunięcie jego
 * wiersza z DOM po renderze, ale TYLKO u klienta, który nie jest MG. Dokument jest cały
 * czas w pełni obecny (waga liczy się do udźwigu, MG go widzi i może nim operować) — to
 * czysto kosmetyczne odjęcie jednego wiersza, jak karta trzymana zakryta.
 *
 * Pierwszy użytek (2026-09-07): Alanowy „identyfikator" — plakietka z cudzym zdjęciem
 * i chipem RFID, którą Alan niesie, ale o której jego gracz nie ma jeszcze wiedzieć.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = "gmSecret";

/** @param {Item5e} item */
export function isGmSecret(item) {
  return item?.getFlag?.(MODULE_ID, FLAG) === true;
}

/**
 * @this never bound — plain hook callback.
 * @param {ApplicationV2} app
 * @param {HTMLElement|JQuery} html
 */
function _onRenderCharacterSheet(app, html) {
  if (game.user.isGM) return; // MG widzi wszystko zawsze — to ukrywanie dotyczy tylko gracza
  const actor = app.document ?? app.actor;
  if (!actor) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  for (const item of actor.items) {
    if (!isGmSecret(item)) continue;
    root.querySelector(`[data-item-id="${item.id}"]`)?.remove();
  }
}

export function registerGmSecretItems() {
  Hooks.on("renderCharacterActorSheet", _onRenderCharacterSheet);
  console.log("Neuroshima 5e | Sekrety MG (ukryte przedmioty) registered");
}

export const __testing = Object.freeze({ onRenderCharacterSheet: _onRenderCharacterSheet, FLAG });
