/**
 * Neuroshima 5e — dociągnięcie istniejących Active Effectów do jawnych priorytetów.
 *
 * Efekty modułu, które już leżą na aktorach i przedmiotach, mają priorytety z czasów,
 * gdy nikt ich świadomie nie ustalał: część niesie `20` niezależnie od typu, część nie
 * ma ich wcale. FVTT traktuje brak priorytetu jako `0` i sortuje remisy w kolejności
 * dokumentów, której `createEmbeddedDocuments` nie gwarantuje — więc kolejność
 * stosowania była przypadkowa i potrafiła się różnić między klientami.
 *
 * Skutek widoczny przy stole: przeciążona postać ze Zranieniem miała Szybkość 0 zamiast
 * 2,25 m, bo połowienie wchodziło przed karą płaską. Reguła i sama tabela priorytetów —
 * `config/effect-changes.mjs` §2.
 *
 * ## Czego ten skrypt NIE robi
 *
 * Nie tyka `type` ani `value`. Przeniesienie liczbowego `mode` na stringowy `type`
 * i `changes` → `system.changes` rdzeń robi sam, przy każdym odczycie źródła
 * (`BaseActiveEffect.migrateData`) — własna migracja mogłaby tam tylko zepsuć coś, co
 * działa. Jedyne, czego rdzeń nie zrobi, to nasza domowa kolejność, bo to nie jest
 * kształt danych, tylko decyzja o zasadach.
 *
 * Synchronizatory (`udzwig-slowdown`, `bez-dna`, `cichy-krok`, `samuraj`) same tego nie
 * naprawią: przepisują efekt dopiero przy zmianie stanu, a stan przeciążonej postaci
 * się nie zmienił.
 *
 * Użycie (konsola albo makro):
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateEffectPriorities();                    // sucha próba
 *   await api.migrateEffectPriorities({ commit: true });
 */

import { CHANGE_PRIORITY } from "../config/effect-changes.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Zmiany efektu z domknięciem priorytetów, albo `null` gdy wszystko już się zgadza.
 * @param {ActiveEffect} effect
 * @returns {object[]|null}
 */
function _repricedChanges(effect) {
  const changes = effect.toObject().system?.changes ?? [];
  let dirty = false;
  const next = changes.map(c => {
    const want = CHANGE_PRIORITY[c.type] ?? 0;
    if (c.priority !== want) dirty = true;
    return { ...c, priority: want };
  });
  return dirty ? next : null;
}

/** Każdy dokument świata, który może nieść nasze efekty. */
function* _effectHosts() {
  for (const actor of game.actors) {
    yield [actor, `aktor: ${actor.name}`];
    for (const item of actor.items) yield [item, `aktor: ${actor.name} → ${item.name}`];
  }
  for (const item of game.items) yield [item, `przedmiot: ${item.name}`];
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]  Bez tego tylko raport, zero zapisów.
 * @returns {Promise<object[]>} Wiersze raportu.
 */
export async function migrateEffectPriorities({ commit = false } = {}) {
  const report = [];

  for (const [host, where] of _effectHosts()) {
    const updates = [];
    for (const effect of host.effects) {
      if (!effect.flags?.[MODULE_ID]) continue;
      const changes = _repricedChanges(effect);
      if (!changes) continue;
      updates.push({ _id: effect.id, system: { changes } });
      report.push({
        gdzie: where,
        efekt: effect.name,
        wpisy: changes.length,
        priorytety: changes.map(c => `${c.type}:${c.priority}`).join(" "),
        status: commit ? "zapisane" : "do zapisania"
      });
    }
    if (commit && updates.length) {
      try {
        await host.updateEmbeddedDocuments("ActiveEffect", updates, { render: false });
      } catch (err) {
        console.error(`${MODULE_ID} | priorytety efektów: ${where}`, err);
        for (const row of report.filter(r => r.gdzie === where)) row.status = "BŁĄD — patrz konsola";
      }
    }
  }

  console.table(report);
  console.log(`${MODULE_ID} | Priorytety efektów: `
    + (commit ? `poprawiono ${report.length}` : `${report.length} do poprawienia (sucha próba)`));
  return report;
}

export function registerEffectPrioritiesMigration() {
  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (!mod) return;
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateEffectPriorities = migrateEffectPriorities;
  });
}
