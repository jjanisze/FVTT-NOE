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
 *   • Efekty Aktywne przenoszone z danych (PLAN_m7 E3: `zdolnoscEfekt`, `sztuczkaEfekt`) — brak albo inne zmiany:
 *     efekty modułu na kopii kasowane i zakładane z paczki; efekty dopisane ręcznie zostają,
 *   • osierocone stany klasowe — efekt `classState` zdolności, która nie jest już przełącznikiem.
 * Nazwy, ikony i tekst zdolności zostają nietknięte. Awanse (ASI, `Trait`) też — nie uruchamiają się na istniejącej
 * postaci (PLAN_m7 R2, uwaga retro); braki biegłości to hand-off M6.
 *
 * Trzy rodzaje kopii (PLAN_m7 E8): zdolności klasowe i profesji, Sztuczki, zdolności Pochodzeń — `RODZAJE`.
 *
 * Uruchamiać **po** przebudowie paczek (inaczej porównuje ze starą paczką i nic nie znajdzie):
 *   await game.neuroshima.zdolnosci.resync();               // na sucho — raport w konsoli
 *   await game.neuroshima.zdolnosci.resync({ commit: true });
 *   await game.neuroshima.zdolnosci.resync({ actors: ["Lorentz"], commit: true });
 *   await game.neuroshima.zdolnosci.resync({ rodzaje: ["sztuczka"] });
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/**
 * Rodzaje kopii: paczka, flaga tożsamości, prefiks CSS plakietki (`coverage-ledger.mjs`), flaga efektów z danych i flagi
 * zachowania (reszta flag — `level`, `owner`, `origin`, `category` — to pochodzenie).
 */
export const RODZAJE = Object.freeze({
  zdolnosc: Object.freeze({
    pack: `${MODULE_ID}.zdolnosci-klasowe`, flaga: "abilityId", css: "neuro-zdolnosc", efekt: "zdolnoscEfekt",
    zachowanie: ["hotbar", "toggle", "exclusiveGroup", "resource", "requiresState", "oncePerTurn", "legacyAbilityKey", "coverage"]
  }),
  sztuczka: Object.freeze({
    pack: `${MODULE_ID}.sztuczki`, flaga: "sztuczka", css: "neuro-sztuczka", efekt: "sztuczkaEfekt", zachowanie: ["coverage"]
  }),
  pochodzenie: Object.freeze({
    pack: `${MODULE_ID}.zdolnosci-pochodzenia`, flaga: "originAbilityId", css: "neuro-pochodzenie", efekt: "zdolnoscEfekt",
    zachowanie: ["coverage"]
  })
});

/**
 * Plakietka z `coverage-ledger.mjs`: nagłówek, opcjonalna lista `auto`, opcjonalne „Nie
 * automatyzujemy”. ProseMirror potrafi wstawić między nie białe znaki, stąd `\s*`.
 */
const _badgeRe = css => new RegExp(
  `\\s*<p class="${css}-cover[^"]*">[\\s\\S]*?</p>`
  + `(?:\\s*<ul class="${css}-auto">[\\s\\S]*?</ul>)?`
  + `(?:\\s*<p class="${css}-manual">[\\s\\S]*?</p>)?`,
  "g"
);

/** Opis bez plakietki pokrycia. Czysta funkcja — testowana w `zdolnosci-dane`. */
export function stripCoverageBadge(html, css = RODZAJE.zdolnosc.css) {
  return String(html ?? "").replace(_badgeRe(css), "");
}

/** Sama plakietka z opisu (pusty napis, gdy jej nie ma). */
export function coverageBadgeOf(html, css = RODZAJE.zdolnosc.css) {
  return String(html ?? "").match(_badgeRe(css))?.map(s => s.trim()).join("") ?? "";
}

/**
 * Efekty z danych na kopii (flaga rodzaju) — porównywalny odcisk: nazwa, zmiany, warunki. Bez `_id` zmian: v14 nadaje
 * każdej zmianie własny przy tworzeniu, więc z nim odcisk nigdy by się nie zgodził.
 */
const _odcisk = (efekty, flaga) => JSON.stringify((efekty ?? [])
  .filter(e => e.flags?.[MODULE_ID]?.[flaga] != null)
  .map(e => [e.name, (e.system?.changes ?? e.changes ?? []).map(({ _id, ...c }) => c), e.system?.conditions ?? null])
  .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));

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
export function planFeatureResync(item, packDoc, rodzaj = "zdolnosc") {
  const R = RODZAJE[rodzaj];
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
  for (const key of R.zachowanie) {
    if (JSON.stringify(mineFlags[key] ?? null) === JSON.stringify(wantFlags[key] ?? null)) continue;
    update[`flags.${MODULE_ID}.${key}`] = wantFlags[key] ?? null;
    what.push(`flaga ${key}`);
  }

  const description = src.system.description?.value ?? "";
  const badge = coverageBadgeOf(want.system.description?.value, R.css);
  const nextDescription = stripCoverageBadge(description, R.css).trimEnd() + badge;
  if (badge && nextDescription !== description) {
    update["system.description.value"] = nextDescription;
    what.push("plakietka pokrycia");
  }

  // Efekty z danych (E3): odcisk kopii ≠ odcisk paczki → kasowane i zakładane od nowa.
  let efekty = null;
  if (_odcisk(src.effects, R.efekt) !== _odcisk(want.effects, R.efekt)) {
    efekty = (want.effects ?? []).filter(e => e.flags?.[MODULE_ID]?.[R.efekt] != null).map(({ _id, ...e }) => e);
    what.push(`efekty z danych: ${efekty.map(e => e.name).join(", ") || "usunięte"}`);
  }

  if (!what.length) return null;
  return { update, stale, activities: Object.fromEntries(stale.map(id => [id, want.system.activities[id]])), efekty, what };
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
 * @param {string[]} [options.rodzaje]      klucze `RODZAJE`; domyślnie wszystkie trzy
 * @returns {Promise<{actor: string, item: string, what: string[]}[]>}
 */
export async function resyncClassFeatures({ commit = false, actors = null, rodzaje = Object.keys(RODZAJE) } = {}) {
  if (commit && !game.user.isGM) {
    ui.notifications?.warn("Zdolności: dosyłać zmiany może tylko MG.");
    return [];
  }
  /** `${rodzaj}:${klucz}` → dokument paczki. */
  const wzorce = new Map();
  for (const rodzaj of rodzaje) {
    const R = RODZAJE[rodzaj];
    const pack = R ? game.packs.get(R.pack) : null;
    if (!pack) {
      ui.notifications?.error(`Brak paczki ${R?.pack ?? rodzaj}.`);
      return [];
    }
    for (const doc of await pack.getDocuments()) {
      const id = doc.getFlag(MODULE_ID, R.flaga);
      if (id) wzorce.set(`${rodzaj}:${id}`, doc.toObject());
    }
  }
  const rodzajKopii = item => rodzaje.find(r => item.getFlag(MODULE_ID, RODZAJE[r].flaga) != null) ?? null;

  const wanted = actors ? new Set(actors) : null;
  const report = [];
  for (const actor of game.actors) {
    if (wanted && !wanted.has(actor.name) && !wanted.has(actor.id)) continue;

    for (const item of actor.items) {
      const rodzaj = rodzajKopii(item);
      const packDoc = rodzaj ? wzorce.get(`${rodzaj}:${item.getFlag(MODULE_ID, RODZAJE[rodzaj].flaga)}`) : null;
      if (!packDoc) continue;
      const plan = planFeatureResync(item, packDoc, rodzaj);
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
      if (plan.efekty) {
        const flaga = RODZAJE[rodzaj].efekt;
        const stare = item.effects.filter(e => e.getFlag(MODULE_ID, flaga) != null).map(e => e.id);
        if (stare.length) await item.deleteEmbeddedDocuments("ActiveEffect", stare);
        if (plan.efekty.length) await item.createEmbeddedDocuments("ActiveEffect", plan.efekty);
      }
    }

    const orphans = _orphanStates(actor);
    if (orphans.length) {
      report.push({ actor: actor.name, item: orphans.map(e => e.name).join(", "), what: ["osierocony stan klasowy — usunięty"] });
      if (commit) await actor.deleteEmbeddedDocuments("ActiveEffect", orphans.map(e => e.id));
    }
  }

  console.group(`Neuroshima 5e | Zdolności, Sztuczki, Pochodzenia — ${commit ? "dosłane" : "na sucho"} (${report.length})`);
  for (const r of report) console.log(`${r.actor} — ${r.item}: ${r.what.join("; ")}`);
  console.groupEnd();
  if (commit && report.length) ui.notifications?.info(`Zdolności: dosłano zmiany do ${report.length} kopii.`);
  return report;
}
