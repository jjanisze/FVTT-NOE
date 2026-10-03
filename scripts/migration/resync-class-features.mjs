/**
 * Neuroshima 5e — dosyłanie zmian zdolności klasowych do kopii na kartach postaci.
 *
 * Paczka `zdolnosci-klasowe` jest źródłem prawdy, ale zdolność przyznana awansem to **kopia** —
 * zmiana w danych nie dociera do kart, które już ją mają (ta sama pułapka co z bronią:
 * `auditWeapons()` / `repairWeapons()`). Pierwszy klient: Kondycha, która do 2026-10 była
 * przełącznikiem bez efektu, a jest leczeniem; drugi: plakietki pokrycia (PLAN_beta B5).
 *
 * Porównuje każdą kopię z dokumentem paczki i dosyła wyłącznie mechanikę:
 *   • aktywności — gdy na kopii brakuje aktywności z paczki albo ma inny typ (utility → heal);
 *     ta jedna aktywność jest kasowana i zakładana od nowa, bo zmiana typu nie znosi scalania
 *     pól. Aktywności dodane ręcznie na karcie zostają.
 *   • `uses.max` i `uses.recovery` — `uses.spent` zostaje,
 *   • flagi modułu opisujące zachowanie (`toggle`, `resource`, `coverage`, …),
 *   • plakietkę pokrycia w opisie — starą wycina po klasie CSS, resztę tekstu zostawia, bo MG
 *     bywa, że coś dopisał,
 *   • osierocone stany klasowe — efekt `classState` zdolności, która nie jest już przełącznikiem.
 * Nazwy, ikony i tekst zdolności zostają nietknięte.
 *
 * Uruchamiać **po** przebudowie paczek (inaczej porównuje ze starą paczką i nic nie znajdzie):
 *   await game.neuroshima.zdolnosci.resync();               // na sucho — raport w konsoli
 *   await game.neuroshima.zdolnosci.resync({ commit: true });
 *   await game.neuroshima.zdolnosci.resync({ actors: ["Lorentz"], commit: true });
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const PACK_ID = `${MODULE_ID}.zdolnosci-klasowe`;

/** Flagi modułu, które opisują zachowanie zdolności — reszta (`level`, `owner`) to pochodzenie. */
const BEHAVIOUR_FLAGS = [
  "hotbar", "toggle", "exclusiveGroup", "resource", "requiresState",
  "oncePerTurn", "legacyAbilityKey", "coverage"
];

/**
 * Plakietka z `coverage-ledger.mjs`: nagłówek, opcjonalna lista `auto`, opcjonalne „Nie
 * automatyzujemy”. ProseMirror potrafi wstawić między nie białe znaki, stąd `\s*`.
 */
const BADGE_RE = new RegExp(
  "\\s*<p class=\"neuro-zdolnosc-cover[^\"]*\">[\\s\\S]*?</p>"
  + "(?:\\s*<ul class=\"neuro-zdolnosc-auto\">[\\s\\S]*?</ul>)?"
  + "(?:\\s*<p class=\"neuro-zdolnosc-manual\">[\\s\\S]*?</p>)?",
  "g"
);

/** Opis bez plakietki pokrycia. Czysta funkcja — testowana w `zdolnosci-dane`. */
export function stripCoverageBadge(html) {
  return String(html ?? "").replace(BADGE_RE, "");
}

/** Sama plakietka z opisu (pusty napis, gdy jej nie ma). */
export function coverageBadgeOf(html) {
  return String(html ?? "").match(BADGE_RE)?.map(s => s.trim()).join("") ?? "";
}

/**
 * Które aktywności paczki trzeba założyć na kopii od nowa: brak albo inny typ.
 * @param {Record<string, object>} mine    `item.toObject().system.activities`
 * @param {Record<string, object>} wanted  ten sam fragment dokumentu paczki
 * @returns {string[]} identyfikatory aktywności
 */
export function staleActivityIds(mine, wanted) {
  return Object.entries(wanted ?? {})
    .filter(([id, a]) => mine?.[id]?.type !== a.type)
    .map(([id]) => id);
}

/**
 * Plan zmian dla jednej kopii — bez zapisu. Zwraca `null`, gdy kopia jest zgodna z paczką.
 * @param {Item} item
 * @param {object} packDoc  `toObject()` dokumentu z paczki
 */
export function planFeatureResync(item, packDoc) {
  const src = item.toObject();
  const want = packDoc;
  const update = {};
  const what = [];

  const stale = staleActivityIds(src.system.activities, want.system.activities);
  if (stale.length) what.push(`aktywność → ${stale.map(id => want.system.activities[id].type).join(", ")}`);

  const usesMax = String(want.system.uses?.max ?? "");
  if (String(src.system.uses?.max ?? "") !== usesMax) {
    update["system.uses.max"] = usesMax;
    what.push(`użycia: ${src.system.uses?.max || "—"} → ${usesMax || "—"}`);
  }
  const recovery = want.system.uses?.recovery ?? [];
  if (JSON.stringify(src.system.uses?.recovery ?? []) !== JSON.stringify(recovery)) {
    update["system.uses.recovery"] = recovery;
    what.push("odnawianie użyć");
  }

  const mineFlags = src.flags?.[MODULE_ID] ?? {};
  const wantFlags = want.flags?.[MODULE_ID] ?? {};
  for (const key of BEHAVIOUR_FLAGS) {
    if (JSON.stringify(mineFlags[key] ?? null) === JSON.stringify(wantFlags[key] ?? null)) continue;
    update[`flags.${MODULE_ID}.${key}`] = wantFlags[key] ?? null;
    what.push(`flaga ${key}`);
  }

  const description = src.system.description?.value ?? "";
  const badge = coverageBadgeOf(want.system.description?.value);
  const nextDescription = stripCoverageBadge(description).trimEnd() + badge;
  if (badge && nextDescription !== description) {
    update["system.description.value"] = nextDescription;
    what.push("plakietka pokrycia");
  }

  if (!what.length) return null;
  return { update, stale, activities: Object.fromEntries(stale.map(id => [id, want.system.activities[id]])), what };
}

/** Efekty stanu klasowego, których zdolność nie jest już przełącznikiem (Kondycha). */
function _orphanStates(actor) {
  return actor.effects.filter(e => {
    if (!e.getFlag(MODULE_ID, "classState")) return false;
    const abilityId = e.getFlag(MODULE_ID, "abilityId");
    return !CLASS_FEATURES[abilityId]?.toggle;
  });
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]  false — tylko raport
 * @param {string[]} [options.actors]       nazwy albo id aktorów; domyślnie wszyscy w świecie
 * @returns {Promise<{actor: string, item: string, what: string[]}[]>}
 */
export async function resyncClassFeatures({ commit = false, actors = null } = {}) {
  if (commit && !game.user.isGM) {
    ui.notifications?.warn("Zdolności klasowe: dosyłać zmiany może tylko MG.");
    return [];
  }
  const pack = game.packs.get(PACK_ID);
  if (!pack) {
    ui.notifications?.error(`Brak paczki ${PACK_ID}.`);
    return [];
  }
  const byAbility = new Map();
  for (const doc of await pack.getDocuments()) {
    const id = doc.getFlag(MODULE_ID, "abilityId");
    if (id) byAbility.set(id, doc.toObject());
  }

  const wanted = actors ? new Set(actors) : null;
  const report = [];
  for (const actor of game.actors) {
    if (wanted && !wanted.has(actor.name) && !wanted.has(actor.id)) continue;

    for (const item of actor.items) {
      const abilityId = item.getFlag(MODULE_ID, "abilityId");
      const packDoc = abilityId ? byAbility.get(abilityId) : null;
      if (!packDoc) continue;
      const plan = planFeatureResync(item, packDoc);
      if (!plan) continue;
      report.push({ actor: actor.name, item: item.name, what: plan.what });
      if (!commit) continue;

      // Najpierw skasować przestarzałe aktywności, potem założyć — jak `Item5e#deleteActivity`
      // i `createActivity` w dnd5e: zmiana typu przez scalanie zostawiłaby pola starego typu.
      if (plan.stale.length) {
        await item.update(Object.fromEntries(plan.stale.map(id => [`system.activities.${id}`, _del])));
      }
      const update = { ...plan.update };
      for (const [id, data] of Object.entries(plan.activities)) update[`system.activities.${id}`] = data;
      if (Object.keys(update).length) await item.update(update);
    }

    const orphans = _orphanStates(actor);
    if (orphans.length) {
      report.push({ actor: actor.name, item: orphans.map(e => e.name).join(", "), what: ["osierocony stan klasowy — usunięty"] });
      if (commit) await actor.deleteEmbeddedDocuments("ActiveEffect", orphans.map(e => e.id));
    }
  }

  console.group(`Neuroshima 5e | Zdolności klasowe — ${commit ? "dosłane" : "na sucho"} (${report.length})`);
  for (const r of report) console.log(`${r.actor} — ${r.item}: ${r.what.join("; ")}`);
  console.groupEnd();
  if (commit && report.length) ui.notifications?.info(`Zdolności klasowe: dosłano zmiany do ${report.length} kopii.`);
  return report;
}
