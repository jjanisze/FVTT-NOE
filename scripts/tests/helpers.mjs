/**
 * Neuroshima 5e — narzędzia wspólne dla testów Quench.
 *
 * Dwie rzeczy, o które rozbija się pisanie testów w żywym świecie:
 *
 * 1. **Nie da się użyć dokumentów tymczasowych.** `new Actor({...})` konstruuje się bez
 *    wyjątku, ale `prepareData()` dnd5e 5.3 wywraca się na `HitDice` (`actor.classes`
 *    jest `undefined`, bo pole klasy `_lazy` inicjalizuje się dopiero po `_initialize()`).
 *    Skutek: `system.abilities.*.mod` i `attributes.prof` nie istnieją. Każdy test,
 *    który dotyka danych pochodnych, musi dostać prawdziwy dokument świata — i posprzątać po sobie.
 *
 * 2. **Nie wolno ruszać stanu świata.** Testy nie tworzą walk, nie aktywują scen i nie
 *    przestawiają zaznaczenia MG. Tam, gdzie kod pyta o `game.combat` albo `actor.inCombat`,
 *    podstawiamy atrapę przez `stub()` i cofamy ją w `afterEach`.
 */

export const MODULE_ID = "neuroshima-2026-overrides";

/** Prefiks nazw dokumentów testowych — gdyby sprzątanie kiedyś zawiodło, widać co usunąć. */
export const SCRATCH_PREFIX = "[Quench]";

/** @type {Set<Document>} */
const trash = new Set();

/**
 * Prawdziwy aktor świata, skasowany przez `scratchCleanup()`.
 * @param {object} [data]  Nadpisania danych aktora.
 * @returns {Promise<Actor>}
 */
export async function scratchActor(data = {}) {
  const base = {
    name: `${SCRATCH_PREFIX} postać testowa`,
    type: "character",
    system: {
      abilities: {
        str: { value: 10 }, dex: { value: 10 }, con: { value: 10 },
        int: { value: 10 }, wis: { value: 10 }, cha: { value: 10 }
      }
    }
  };
  const actor = await Actor.implementation.create(foundry.utils.mergeObject(base, data, { inplace: false }),
    { render: false });
  trash.add(actor);
  return actor;
}

/** Kasuje wszystko, co utworzyły helpery. Wołane w `after()` każdej paczki. */
export async function scratchCleanup() {
  for (const doc of Array.from(trash).reverse()) {
    try { await doc.delete(); }
    catch (err) { console.warn(`${MODULE_ID} | Quench: nie udało się usunąć ${doc?.uuid}`, err); }
  }
  trash.clear();
}

/**
 * Prawdziwy aktor-grupa (karta drużyny), skasowany przez `scratchCleanup()`. Zero członków —
 * `slowestWalker`/`terrainWaivers` w `party-travel.mjs` liczą to bezpiecznie jako "brak wpływu".
 * @param {object} [data]  Nadpisania danych aktora.
 * @returns {Promise<Actor>}
 */
export async function scratchGroupActor(data = {}) {
  const base = { name: `${SCRATCH_PREFIX} drużyna testowa`, type: "group" };
  const actor = await Actor.implementation.create(foundry.utils.mergeObject(base, data, { inplace: false }),
    { render: false });
  trash.add(actor);
  return actor;
}

/**
 * Sztuczka jako przedmiot `feat` z flagą z compendium.
 * @param {string} key    Klucz z `SZTUCZKI`.
 * @param {string} label  Nazwa przedmiotu.
 */
export function sztuczkaItem(key, label) {
  return { name: label, type: "feat", flags: { [MODULE_ID]: { sztuczka: key } } };
}

/** Sztuczka wpisana ręcznie: sama nazwa, bez flagi (postacie migrowane z Roll20). */
export function namedFeat(label) {
  return { name: label, type: "feat" };
}

/**
 * Podmienia własność (także getter z prototypu) na czas testu.
 * @returns {() => void} Funkcja przywracająca stan pierwotny.
 */
export function stub(target, key, value) {
  const own = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
  return () => {
    if (own) Object.defineProperty(target, key, own);
    else delete target[key];
  };
}

/**
 * Przechwytuje `ui.notifications.warn` — moduł komunikuje przez nie odmowy reguł.
 * @returns {{messages: string[], restore: () => void}}
 */
export function captureWarnings() {
  const messages = [];
  const restore = stub(ui.notifications, "warn", msg => { messages.push(String(msg)); return null; });
  return { messages, restore };
}

/**
 * Czeka na skutek uboczny haka (`createItem` -> `syncWeaponFireModes` leci `void`).
 * @param {() => any} probe  Zwraca wartość prawdziwą, gdy warunek jest spełniony.
 */
export async function waitFor(probe, { timeout = 4000, interval = 50, label = "warunek" } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = probe();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`waitFor: ${label} nie zaszedł w ${timeout} ms`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/** Aktywności danego typu na przedmiocie (świeżo odczytanym z aktora). */
export function activitiesOfType(item, type) {
  const live = item?.actor?.items?.get(item.id) ?? item;
  return Array.from(live?.system?.activities ?? []).filter(activity => activity.type === type);
}
