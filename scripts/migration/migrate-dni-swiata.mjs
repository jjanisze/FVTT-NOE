/**
 * Neuroshima 5e — dni chorób i dawek z licznika „Zachodu słońca” na zegar świata (2026-10-07).
 *
 * Do tej pory „dziś” chorób, leków i dziennych limitów chemii liczył osobny licznik świata
 * (`dayCounter`, +1 przy każdym „Zachodzie słońca”), niezależny od zegara świata, którym liczą
 * kalendarzyk zdrowia, stabilizacja i znaczniki Wyczerpania. Decyzja MG: zawsze czas gry, jeden
 * zegar. Teraz „dziś” to dzień kalendarza świata (`dzienSwiata`), a blokada odpoczynku po oblanym
 * RO choroby to okno doby w czasie gry (`bezKorzysciDo`).
 *
 * Ta migracja przenosi to, co było „dziś” w starym liczniku, na „dziś” w nowym — i nic więcej:
 *   - `lastDoseDay` wpisu choroby: dawka wzięta dziś → dziś (dzień świata); starsza → bez dawki,
 *   - `noRestDay` (blokada na dziś) → `bezKorzysciDo` = teraz + doba; starsza → usunięta,
 *   - dzienne liczniki chemii (`chemiaDoses`): dzisiejsze → dzień świata; starsze zostają (nie pasują).
 *
 * Biegnie sama raz (aktywny MG, `ready`, ustawienie `dniSwiataMigracja`). Ręcznie, np. po
 * przywróceniu kopii świata:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateDniSwiata();                    // sucha próba
 *   await api.migrateDniSwiata({ commit: true });
 */

import { dzienSwiata, sekundyDoby } from "../world-clock.mjs";
import { NO_REST_FLAG, LEGACY_NO_REST_FLAG } from "../config/diseases-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const DOSES_FLAG = "chemiaDoses";
const ZROBIONE = "dniSwiataMigracja";

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]  Bez tego tylko raport, zero zapisów.
 * @returns {Promise<object[]>} Wiersze raportu.
 */
export async function migrateDniSwiata({ commit = false } = {}) {
  const stary = game.settings.get(MODULE_ID, "dayCounter");
  const dzis = dzienSwiata();
  const report = [];

  for (const actor of game.actors) {
    const zmiany = {};
    const opis = [];

    const choroby = actor.getFlag(MODULE_ID, "choroby");
    if (Array.isArray(choroby) && choroby.some(e => Number.isInteger(e?.lastDoseDay))) {
      zmiany[`flags.${MODULE_ID}.choroby`] = choroby.map(e => {
        if (!Number.isInteger(e?.lastDoseDay)) return e;
        opis.push(`${e.name ?? e.key}: dawka ${e.lastDoseDay === stary ? "dziś" : "dawna — kasowana"}`);
        return { ...e, lastDoseDay: e.lastDoseDay === stary ? dzis : null };
      });
    }

    const blokada = actor.getFlag(MODULE_ID, LEGACY_NO_REST_FLAG);
    if (blokada !== undefined) {
      zmiany[`flags.${MODULE_ID}.-=${LEGACY_NO_REST_FLAG}`] = null;
      if (blokada === stary) {
        zmiany[`flags.${MODULE_ID}.${NO_REST_FLAG}`] = game.time.worldTime + sekundyDoby();
        opis.push("odpoczynek bez korzyści: następna doba gry");
      } else {
        opis.push("dawna blokada odpoczynku — kasowana");
      }
    }

    const dawki = actor.getFlag(MODULE_ID, DOSES_FLAG);
    if (dawki && Object.values(dawki).some(r => r?.day === stary)) {
      zmiany[`flags.${MODULE_ID}.${DOSES_FLAG}`] = Object.fromEntries(Object.entries(dawki)
        .map(([k, r]) => [k, r?.day === stary ? { ...r, day: dzis } : r]));
      opis.push("dzisiejsze dawki chemii");
    }

    if (!opis.length) continue;
    report.push({ aktor: actor.name, zmiany: opis.join("; "), status: commit ? "zapisane" : "do zapisania" });
    if (commit) {
      try {
        await actor.update(zmiany, { render: false });
      } catch (err) {
        console.error(`${MODULE_ID} | dni świata: ${actor.name}`, err);
        report.at(-1).status = "BŁĄD — patrz konsola";
      }
    }
  }

  console.table(report);
  console.log(`${MODULE_ID} | Dni chorób na zegarze świata: stary licznik ${stary} → dzień świata ${dzis}; `
    + (commit ? `zapisano ${report.length}` : `${report.length} do zapisania (sucha próba)`));
  return report;
}

export function registerDniSwiataMigration() {
  game.settings.register(MODULE_ID, ZROBIONE, { scope: "world", config: false, type: Boolean, default: false });
  Hooks.once("ready", async () => {
    const mod = game.modules.get(MODULE_ID);
    if (mod) {
      mod.api ??= {};
      mod.api.migration ??= {};
      mod.api.migration.migrateDniSwiata = migrateDniSwiata;
    }
    if (!game.users.activeGM?.isSelf || game.settings.get(MODULE_ID, ZROBIONE)) return;
    await migrateDniSwiata({ commit: true });
    await game.settings.set(MODULE_ID, ZROBIONE, true);
  });
}
