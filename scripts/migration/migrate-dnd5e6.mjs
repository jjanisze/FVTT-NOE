/**
 * Neuroshima 5e — dane świata po przejściu na dnd5e 6.0 (PLAN_migracja_dnd5e6.md E11, §3.7, §3.12).
 *
 * dnd5e 6 migruje świat sam (`migrateWorld`), a trzech rzeczy nie zrobi:
 *
 *  1. **Klucze zmian efektów.** Stare (`system.bonuses.*`, `attributes.movement.<rodzaj>`, `attributes.senses.<zmysł>`,
 *     `*.bonuses.check|save`, `init.bonus`, …) działają tylko przez podkładkę `ActiveEffect5e.SHIM_FIELDS` — w 6.0.6
 *     cichą, więc żadna bramka ich nie pokaże, a następna wersja dnd5e może ją zdjąć. Przepisujemy je tym samym
 *     odwzorowaniem, którego używa dnd5e (`ActiveEffect5e#_applyChangeShim`) — bez własnej tabeli.
 *  2. **Palcożerca** („Odgryziony palec”). Do v0.20.0 dawał −1 do każdego testu cechy (`system.bonuses.abilities.check`);
 *     RAW: tylko testy oparte na ZRC. Efekty na ofiarach i opis automatyzacji na kopiach Palcożercy w świecie (z nich
 *     powstają następne efekty) dostają `system.abilities.dex.check.roll.bonus`. Podkładka zrobiłaby z nich
 *     `system.rolls.ability.check.bonus` — wciąż każdy test.
 *  3. **TT towarzyszy.** 5.3 `calc: "custom"` znaczyło sam wzór właściciela; 6.0 przy każdym wczytaniu robi z niego
 *     wzór obok domyślnych `calcs` (bez pancerza, z pancerzem) i bierze wyższy wynik. Towarzysze dostają `calcs: []`.
 *
 * Użycie (konsola albo makro, MG, po otwarciu świata na dnd5e 6.0.6 i jego migracji):
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateDnd5e6();                  // sucha próba: raport
 *   await api.migrateDnd5e6({ commit: true });  // zapis
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Palcożerca's rider: the RAW key for its −1 (only Dex-based ability checks). */
export const PALCOZERCA = Object.freeze({ rider: "palcozerca", oldKey: "system.bonuses.abilities.check", key: "system.abilities.dex.check.roll.bonus" });

/**
 * The change as dnd5e 6 would apply it, or `null` when its key is current. Palcożerca's rider is mapped to its RAW
 * key instead of the shim's.
 * @param {object} change   Source change (`system.changes[]` entry).
 * @param {{palcozerca?: boolean}} [context]
 * @returns {object|null}
 */
export function migratedChange(change, { palcozerca = false } = {}) {
  if (palcozerca && (change.key === PALCOZERCA.oldKey)) return { ...change, key: PALCOZERCA.key };
  const shimmed = CONFIG.ActiveEffect.documentClass.prototype._applyChangeShim.call(null, change);
  if (shimmed.key === change.key) return null;
  return { ...change, key: shimmed.key, type: shimmed.type, value: shimmed.value };
}

/** Each document in scope that can carry effects, with a label for the report. */
function* _effectHosts(actors, items) {
  for (const actor of actors) {
    yield [actor, `aktor: ${actor.name}`];
    for (const item of actor.items) yield [item, `aktor: ${actor.name} → ${item.name}`];
  }
  for (const item of items) yield [item, `przedmiot: ${item.name}`];
}

/** Effect updates for one host, and report rows. */
function _effectUpdates(host, where) {
  const updates = [];
  const rows = [];
  for (const effect of host.effects) {
    const palcozerca = effect.getFlag(MODULE_ID, "critRider") === PALCOZERCA.rider;
    const pairs = (effect.toObject().system?.changes ?? []).map(c => [c, migratedChange(c, { palcozerca })]);
    if (!pairs.some(([, m]) => m)) continue;
    updates.push({ _id: effect.id, "system.changes": pairs.map(([c, m]) => m ?? c) });
    rows.push({ gdzie: where, co: `efekt „${effect.name}”`, zmiany: pairs.filter(([, m]) => m).map(([c, m]) => `${c.key} → ${m.key}`).join("; ") });
  }
  return { updates, rows };
}

/** Bestiary items in the world whose Palcożerca rider still writes the old key. */
function _riderUpdates(actor) {
  const updates = [];
  const rows = [];
  for (const item of actor.items) {
    const bestiary = item.getFlag(MODULE_ID, "bestiary");
    const auto = bestiary?.automation;
    if ((auto?.kind !== "critRider") || (auto.rider !== PALCOZERCA.rider)) continue;
    const changes = auto.effect?.changes ?? [];
    if (!changes.some(c => c.key === PALCOZERCA.oldKey)) continue;
    const next = changes.map(c => (c.key === PALCOZERCA.oldKey ? { ...c, key: PALCOZERCA.key } : c));
    updates.push({ _id: item.id, [`flags.${MODULE_ID}.bestiary.automation.effect.changes`]: next });
    rows.push({ gdzie: `aktor: ${actor.name} → ${item.name}`, co: "automatyzacja Palcożercy", zmiany: `${PALCOZERCA.oldKey} → ${PALCOZERCA.key}` });
  }
  return { updates, rows };
}

/**
 * A companion's AC update (its formula alone), or `null` when it is already right or has no formula. `_source` is
 * already migrated in memory (`_migrateArmorClass`: 5.3's `calc: "custom"` + `formula` → `formulas`, default
 * `calcs`), and that runs on every load from the stored 5.3 keys — so only `calcs` is written; the formula keeps
 * coming from the stored one.
 */
export function companionAcUpdate(actor) {
  if (!actor.getFlag(MODULE_ID, "towarzysz")) return null;
  const ac = actor._source.system?.attributes?.ac ?? {};
  if (!ac.formulas?.length || (Array.isArray(ac.calcs) && !ac.calcs.length)) return null;
  return { "system.attributes.ac.calcs": [] };
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]  Without it, only the report — no writes.
 * @param {Iterable<Actor>} [options.actors]  Scope (default: every world actor); tests pass their own.
 * @param {Iterable<Item>} [options.items]    Scope (default: every world item).
 * @returns {Promise<object[]>} Report rows.
 */
export async function migrateDnd5e6({ commit = false, actors = game.actors, items = game.items } = {}) {
  if (commit && !game.user.isGM) throw new Error("migrateDnd5e6: tylko MG");
  const report = [];
  const status = commit ? "zapisane" : "do zapisania";
  const write = async (where, fn) => {
    if (!commit) return;
    try {
      await fn();
    } catch (err) {
      console.error(`${MODULE_ID} | migracja dnd5e 6: ${where}`, err);
      for (const row of report.filter(r => r.gdzie === where)) row.status = "BŁĄD — patrz konsola";
    }
  };

  for (const [host, where] of _effectHosts(actors, items)) {
    const { updates, rows } = _effectUpdates(host, where);
    report.push(...rows.map(r => ({ ...r, status })));
    if (updates.length) await write(where, () => host.updateEmbeddedDocuments("ActiveEffect", updates, { render: false }));
  }

  for (const actor of actors) {
    const riders = _riderUpdates(actor);
    report.push(...riders.rows.map(r => ({ ...r, status })));
    if (riders.updates.length) await write(riders.rows[0].gdzie, () => actor.updateEmbeddedDocuments("Item", riders.updates, { render: false }));

    const ac = companionAcUpdate(actor);
    if (!ac) continue;
    const where = `aktor: ${actor.name}`;
    const wzory = actor._source.system.attributes.ac.formulas.map(f => f.formula).join(", ");
    report.push({ gdzie: where, co: "TT towarzysza", zmiany: `sam wzór: ${wzory} (bez ${[...actor._source.system.attributes.ac.calcs].join(", ")})`, status });
    await write(where, () => actor.update(ac, { render: false }));
  }

  console.table(report);
  console.log(`${MODULE_ID} | Migracja dnd5e 6: ` + (commit ? `zapisano ${report.length}` : `${report.length} do zapisania (sucha próba)`));
  return report;
}

export function registerDnd5e6Migration() {
  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (!mod) return;
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateDnd5e6 = migrateDnd5e6;
  });
}
