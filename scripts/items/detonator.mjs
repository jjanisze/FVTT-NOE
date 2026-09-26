/**
 * Neuroshima 5e — Detonator radiowy i zapalniki (RAW, *Sprzęt* → Elektronika).
 *
 * > DETONATOR RADIOWY. Pilot, baterie i 10 zapalników radiowych, pozwalających na detonację
 * > ładunku na odległość do 200 metrów. — 50 gb, 1 kg, 10%.
 * > ZAPALNIK ELEKTRYCZNY. Wytwarza iskrę wysokiego napięcia, wystarczającą do zdetonowania C4
 * > i podobnych materiałów wybuchowych. Składa się z elektrody i 10 metrów kabla, do którego należy
 * > podpiąć np. baterię lub ręczny detonator, aby odpalić ładunek. — 5 gb, 0,5 kg, 20%.
 *
 * **Zestaw radiowy to dwa przedmioty** (decyzja MG 2026-09-25): pilot + stos „Zapalnik radiowy"
 * ×10. Dzięki temu „A składa, B podkłada" działa bez przedmiotu „ładunek z zapalnikiem": A oddaje
 * B jeden zapalnik (przez MG — gracze nie mają praw do cudzej karty), B podkłada, pilot zostaje
 * u A. Pilot i zapalniki łączy `kitId` — pilot odpala tylko ładunki z zapalnikami swojego zestawu.
 *
 * Zakup daje oba: pilot z paczki ma flagę `kitNew`; kiedy trafia na kartę aktora, dostaje własny
 * `kitId` (`preCreateItem`), a klient, który go utworzył, dokłada 10 zapalników z tym samym
 * `kitId` i zdejmuje `kitNew` (`createItem`). Pilot przeniesiony z karty na kartę `kitNew` już nie
 * ma — zapalników nie przybywa.
 *
 * Podział ceny i wagi zestawu (RAW podaje tylko całość): pilot 50 gb / 0,8 kg, zapalniki 0 gb /
 * 0,02 kg (10 szt. = 0,2 kg). Osobno zapalników radiowych RAW nie sprzedaje.
 *
 * Sam pilot ma jedną aktywność — „Detonuj" — przechwytywaną w `actors/placed-charges.mjs`
 * (lista ładunków do odpalenia). Pilot jest przedmiotem podręcznym (flaga `handy`): odpala się go
 * w walce.
 */

const MODULE_ID = "neuroshima-2026-overrides";

export const DETONATOR = Object.freeze({
  name: "Detonator radiowy",
  price: 50, weight: 0.8, avail: 10,
  fuzes: 10, fuzeName: "Zapalnik radiowy", fuzeWeight: 0.02
});

export const ELECTRIC_FUZE = Object.freeze({
  name: "Zapalnik elektryczny",
  price: 5, weight: 0.5, avail: 20
});

/** Stałe id aktywności pilota — to samo w paczce i na kopiach. Dokładnie 16 znaków (wymóg Foundry). */
export const DETONATOR_ACTIVITY_ID = "detonatorDetonuj";
export const DETONATOR_ACTIVITY_IDENTIFIER = "detonator-detonuj";

// Ikony tymczasowe — własne w kolejce dev/icons/MISSING.md (A).
const PILOT_IMG = `modules/${MODULE_ID}/icons/items/loot/krotkofalowka_alt.svg`;
const FUZE_IMG = `modules/${MODULE_ID}/icons/items/loot/czesci_elektroniczne.svg`;

const f = (item, key) => item?.getFlag?.(MODULE_ID, key) ?? item?.flags?.[MODULE_ID]?.[key];

export const isDetonator = item => f(item, "detonator") === true;
export const isRadioFuze = item => f(item, "radioFuze") === true;
export const isElectricFuze = item => f(item, "electricFuze") === true;
export const kitIdOf = item => f(item, "kitId") ?? null;

/** Krótki, czytelny znacznik zestawu — odróżnia dwa stosy zapalników na jednej karcie. */
export function kitTag(kitId) {
  return String(kitId ?? "").slice(0, 4).toUpperCase();
}

const _qty = item => Number(item?.system?.quantity ?? 0);

/** Stosy zapalników radiowych z czymś w środku, pogrupowane po zestawie. */
export function radioFuzeStacks(actor) {
  return (actor?.items ?? []).filter(i => isRadioFuze(i) && _qty(i) > 0);
}

export function electricFuzeStacks(actor) {
  return (actor?.items ?? []).filter(i => isElectricFuze(i) && _qty(i) > 0);
}

/** `kitId` każdego pilota przy aktorze. */
export function pilotKitIds(actor) {
  return (actor?.items ?? []).filter(isDetonator).map(kitIdOf).filter(Boolean);
}

/** Ile zapalników każdego rodzaju — wejście dla `availableMethods()` z `charge-rules.mjs`. */
export function fuzeCounts(actor) {
  const sum = list => list.reduce((n, i) => n + _qty(i), 0);
  return { radioFuze: sum(radioFuzeStacks(actor)), electricFuze: sum(electricFuzeStacks(actor)) };
}

const PILOT_DESCRIPTION = `<p>Pilot radiowy z bateriami. W zestawie ${DETONATOR.fuzes} zapalników radiowych `
  + `(osobny stos na karcie) — detonacja ładunku na odległość do 200 m.</p>`
  + `<p><strong>Detonuj</strong> — lista podłożonych ładunków z zapalnikami tego zestawu.</p>`
  + `<p><em>Przedmiot podręczny — można go nosić przy pasie.</em></p>`;

const FUZE_DESCRIPTION = `<p>Zapalnik radiowy z zestawu Detonatora radiowego. Odpala go tylko pilot `
  + `z tego samego zestawu. Zużywany przy podkładaniu ładunku (sposób detonacji: radiowy).</p>`;

const ELECTRIC_DESCRIPTION = `<p>Wytwarza iskrę wysokiego napięcia, wystarczającą do zdetonowania C4 `
  + `i podobnych materiałów wybuchowych. Elektroda i 10 m kabla, do którego podpina się np. baterię `
  + `lub ręczny detonator.</p>`
  + `<p>Zużywany przy podkładaniu ładunku (sposób detonacji: elektryczny). Odpala ten, kto trzyma `
  + `koniec kabla — podkładający, do 10 m od ładunku.</p>`;

function _trinket({ name, type, img, description, identifier, quantity, weight, price }) {
  return {
    name, type, img,
    system: {
      type: { value: "trinket", subtype: "" },
      description: { value: description, chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      identifier, quantity,
      weight: { value: weight, units: "kg" },
      price: { value: price, denomination: "gb" }
    }
  };
}

/** Pilot. `kitNew` = „nowy zestaw" — na karcie aktora dołoży sobie zapalniki. */
export function buildDetonatorItemData({ kitId = null, kitNew = true } = {}) {
  const data = _trinket({
    name: kitId ? `${DETONATOR.name} (zestaw ${kitTag(kitId)})` : DETONATOR.name,
    type: "equipment", img: PILOT_IMG, description: PILOT_DESCRIPTION,
    identifier: "detonator-radiowy", quantity: 1, weight: DETONATOR.weight, price: DETONATOR.price
  });
  data.system.activities = {
    [DETONATOR_ACTIVITY_ID]: {
      _id: DETONATOR_ACTIVITY_ID,
      type: "utility",
      name: "Detonuj",
      img: `modules/${MODULE_ID}/icons/weapons/c4_explosive.svg`,
      activation: { type: "action", value: 1, condition: "Używanie" },
      consumption: { targets: [], scaling: { allowed: false } },
      range: { override: true, value: "200", units: "m", special: "" },
      visibility: { identifier: DETONATOR_ACTIVITY_IDENTIFIER }
    }
  };
  data.flags = { [MODULE_ID]: { detonator: true, handy: true, availability: DETONATOR.avail, kitNew, ...(kitId ? { kitId } : {}) } };
  return data;
}

export function buildRadioFuzeItemData({ kitId, quantity = DETONATOR.fuzes } = {}) {
  const data = _trinket({
    name: kitId ? `${DETONATOR.fuzeName} (zestaw ${kitTag(kitId)})` : DETONATOR.fuzeName,
    type: "consumable", img: FUZE_IMG, description: FUZE_DESCRIPTION,
    identifier: "zapalnik-radiowy", quantity, weight: DETONATOR.fuzeWeight, price: 0
  });
  data.flags = { [MODULE_ID]: { radioFuze: true, ...(kitId ? { kitId } : {}) } };
  return data;
}

export function buildElectricFuzeItemData({ quantity = 1 } = {}) {
  const data = _trinket({
    name: ELECTRIC_FUZE.name, type: "consumable", img: FUZE_IMG, description: ELECTRIC_DESCRIPTION,
    identifier: "zapalnik-elektryczny", quantity, weight: ELECTRIC_FUZE.weight, price: ELECTRIC_FUZE.price
  });
  data.flags = { [MODULE_ID]: { electricFuze: true, availability: ELECTRIC_FUZE.avail } };
  return data;
}

/* -------------------------------------------- */
/*  Zakup daje oba: pilot + 10 zapalników         */
/* -------------------------------------------- */

function _onPreCreateItem(item) {
  if (!isDetonator(item) || !(item.parent instanceof Actor) || kitIdOf(item)) return;
  const kitId = foundry.utils.randomID(12);
  item.updateSource({
    name: `${DETONATOR.name} (zestaw ${kitTag(kitId)})`,
    [`flags.${MODULE_ID}.kitId`]: kitId
  });
}

async function _onCreateItem(item, _options, userId) {
  if (userId !== game.user.id) return;
  if (!isDetonator(item) || f(item, "kitNew") !== true) return;
  const actor = item.parent;
  const kitId = kitIdOf(item);
  if (!(actor instanceof Actor) || !kitId) return;
  try {
    await actor.createEmbeddedDocuments("Item", [buildRadioFuzeItemData({ kitId })]);
    await item.setFlag(MODULE_ID, "kitNew", false);
  } catch (e) {
    console.warn(`${MODULE_ID} | detonator: fuzes for a new kit were not created`, e);
  }
}

export function registerDetonator() {
  Hooks.on("preCreateItem", _onPreCreateItem);
  Hooks.on("createItem", _onCreateItem);
  console.log("Neuroshima 5e | Detonator radiowy registered");
}

/** Nowy zestaw (pilot + zapalniki) u aktora albo sam pilot w świecie. */
export async function createDetonator({ actor = null } = {}) {
  const data = buildDetonatorItemData();
  return actor ? (await actor.createEmbeddedDocuments("Item", [data]))[0] : Item.implementation.create(data);
}

export async function createElectricFuze({ actor = null, quantity = 1 } = {}) {
  const data = buildElectricFuzeItemData({ quantity });
  return actor ? (await actor.createEmbeddedDocuments("Item", [data]))[0] : Item.implementation.create(data);
}

export const detonatorApi = Object.freeze({
  create: createDetonator,
  createElectricFuze,
  build: buildDetonatorItemData,
  buildRadioFuze: buildRadioFuzeItemData,
  buildElectricFuze: buildElectricFuzeItemData
});
