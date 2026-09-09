/**
 * Neuroshima 5e — konwersja sprzętu zastępującego zestawy narzędzi.
 *
 * Dotyczy pozycji `REAL_GEAR` z polem `substitutes` (dziś: Laptop wojskowy → Narzędzia małego
 * hakera). Były wydane jako bezczynny `loot`, więc zapis z podręcznika „może zastąpić Narzędzia
 * małego hakera" nie robił nic: nie dało się z nich rzucić żadnego testu, a karta Testu narzędzi
 * twierdziła „✘ brak zestawu w ekwipunku" nawet postaci, która sprzęt trzymała.
 *
 * ⚠️ Konwersja idzie przez **skasuj-i-odtwórz**, bo `loot` → `tool` przekracza granicę typu, a
 * `.update({type})` po cichu unieważnia całe wywołanie. Piąte potwierdzenie tej pułapki w tym
 * repozytorium (`migrate-pistolet-race.mjs`, `migrate-gear-graduation.mjs`, `items/kolczatka.mjs`,
 * `items/gadzety.mjs`) — nie jest już odkryciem, tylko rutyną.
 *
 * Nowy przedmiot bierze opis, cenę i wagę z katalogu (bo właśnie one się zmieniły), ale
 * zachowuje ilość i — jeśli aktor go sobie przemianował albo podmienił ikonę — nazwę i grafikę.
 *
 * Użycie (konsola albo makro):
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateToolSubstitutes();                                  // sucha próba
 *   await api.migrateToolSubstitutes({ commit: true });
 *   await api.migrateToolSubstitutes({ actors: ["Raynald of Châtillon"], commit: true });
 */

import { REAL_GEAR, buildRealGearItemData, syncSubstituteActivities } from "../config/gear-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Pozycje katalogu, które w ogóle zastępują jakiś zestaw. */
const SUBSTITUTE_GEAR = REAL_GEAR.filter(g => g.substitutes);

/** Katalogowy wpis dla przedmiotu — po fladze `gearId`, a dla starych kopii po nazwie. */
function _gearFor(item) {
  const byFlag = item.getFlag(MODULE_ID, "gearId");
  if (byFlag) return SUBSTITUTE_GEAR.find(g => g.id === byFlag) ?? null;
  const name = (item.name ?? "").toLowerCase().trim();
  return SUBSTITUTE_GEAR.find(g => g.label.toLowerCase() === name) ?? null;
}

/** Kopia wymagająca konwersji: zły typ albo brak aktywności Testu. */
function _needsWork(item) {
  if (!["loot", "tool"].includes(item.type)) return false;
  const gear = _gearFor(item);
  if (!gear) return false;
  if (item.type !== "tool") return true;
  if (item.getFlag(MODULE_ID, "substitutes") !== gear.substitutes.toolkit) return true;
  return [...(item.system.activities ?? [])].length === 0;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.actors]
 */
export async function migrateToolSubstitutes({ commit = false, actors = null } = {}) {
  const targetActors = actors
    ? actors.map(name => game.actors.find(a => a.name === name)).filter(Boolean)
    : game.actors.contents;

  const report = [];

  for (const actor of targetActors) {
    for (const item of actor.items.filter(_needsWork)) {
      const gear = _gearFor(item);
      const zmianaTypu = item.type !== "tool";
      report.push({
        aktor: actor.name,
        przedmiot: item.name,
        zastepuje: gear.substitutes.toolkit,
        tryb: zmianaTypu ? "delete+create (zmiana typu)" : "odbudowa aktywności",
        status: commit ? "gotowe" : "do zrobienia"
      });

      if (!commit) continue;

      try {
        let live = item;
        if (zmianaTypu) {
          const data = buildRealGearItemData(gear);
          // Cena, waga i opis mają się odświeżyć z katalogu; nazwa i ikona zostają takie,
          // jakie aktor ma dziś — mogły zostać świadomie zmienione przy stole.
          data.name = item.name;
          data.img = item.img;
          data.system.quantity = item.system.quantity ?? 1;
          const [recreated] = await actor.createEmbeddedDocuments("Item", [data], { render: false });
          await item.delete();
          live = recreated;
        }
        await syncSubstituteActivities(live, gear);
      } catch (e) {
        console.error(`${MODULE_ID} | migrateToolSubstitutes: ${actor.name}/${item.name}`, e);
        report[report.length - 1].status = "BŁĄD — patrz konsola";
      }
    }
  }

  console.table(report);
  const done = report.filter(r => r.status !== "BŁĄD — patrz konsola").length;
  console.log(`${MODULE_ID} | Zastępniki narzędzi: ${commit ? `przerobiono ${done}` : `${done} do przerobienia (sucha próba)`}.`);
  return report;
}

export function registerToolSubstitutesMigration() {
  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (!mod) return;
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateToolSubstitutes = migrateToolSubstitutes;
  });
}
