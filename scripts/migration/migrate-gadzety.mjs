/**
 * Neuroshima 5e — konwersja przedmiotów smaczkowych na klikalne gadżety z SFX.
 *
 * Kaczuszka, krótkofalówki, kanister z odkażaczem i długopis zostały zaimportowane jako
 * `type: "loot"` — a `loot` w dnd5e nie może nieść Aktywności, więc nie ma czego kliknąć.
 * `items/gadzety.mjs` opisuje docelowy kształt; ten plik przenosi na niego już wydane kopie.
 *
 * ⚠️ Konwersja idzie przez **skasuj-i-odtwórz**, nie `.update()`. Zmiana `type` przedmiotu po
 * cichu unieważnia CAŁE wywołanie update — udokumentowane niezależnie w
 * `migrate-pistolet-race.mjs`, `migrate-gear-graduation.mjs` i `items/kolczatka.mjs`. Nowy
 * przedmiot dziedziczy nazwę, ikonę, opis, cenę, wagę i ilość oryginału, więc na karcie nie
 * zmienia się nic poza tym, że pojawia się przycisk.
 *
 * Kolejność: najpierw `create`, potem `delete`. Gdyby coś padło pomiędzy, gracz zostaje z dwiema
 * kaczuszkami zamiast z zerem — a duplikat widać i da się skasować, w przeciwieństwie do
 * cicho utraconego przedmiotu.
 *
 * Użycie (konsola albo makro), ten sam kształt co reszta migracji w tym folderze:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateGadzety();                                   // sucha próba, wszyscy aktorzy
 *   await api.migrateGadzety({ commit: true });
 *   await api.migrateGadzety({ actors: ["Lorentz"], commit: true });
 */

import { GADZETY, gadzetKeyFor, isReadyGadzet, buildGadzetItemData } from "../items/gadzety.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Kopia sprzed migracji: nazwa pasuje do któregoś gadżetu, ale przedmiot nie jest jeszcze
 * gotowy (zły typ albo brak aktywności). Zawężone do `loot`/`consumable` — nie chcemy
 * przypadkiem złapać broni czy pancerza o zbieżnej nazwie.
 */
function _isStaleGadzet(item) {
  if (!["loot", "consumable"].includes(item.type)) return false;
  if (!gadzetKeyFor(item)) return false;
  return !isReadyGadzet(item);
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.actors]  Ogranicz do aktorów o tych nazwach.
 */
export async function migrateGadzety({ commit = false, actors = null } = {}) {
  const targetActors = actors
    ? actors.map(name => game.actors.find(a => a.name === name)).filter(Boolean)
    : game.actors.contents;

  const report = [];

  for (const actor of targetActors) {
    for (const item of actor.items.filter(_isStaleGadzet)) {
      const key = gadzetKeyFor(item);
      report.push({
        aktor: actor.name,
        przedmiot: item.name,
        gadzet: key,
        zTypu: item.type,
        dzwiek: GADZETY[key].sound,
        status: commit ? "przekonwertowano" : "gotowe do konwersji"
      });

      if (!commit) continue;

      try {
        const data = buildGadzetItemData(key, item);
        await actor.createEmbeddedDocuments("Item", [data], { render: false });
        await item.delete();
      } catch (e) {
        console.error(`${MODULE_ID} | migrateGadzety: konwersja nie powiodła się na ${actor.name}`, e);
        report[report.length - 1].status = "BŁĄD — patrz konsola";
      }
    }
  }

  console.table(report);
  const done = report.filter(r => r.status !== "BŁĄD — patrz konsola").length;
  console.log(`${MODULE_ID} | Gadżety: ${commit ? `przekonwertowano ${done}` : `${done} do konwersji (sucha próba)`}.`);
  return report;
}

export function registerGadzetyMigration() {
  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (!mod) return;
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateGadzety = migrateGadzety;
  });
}
