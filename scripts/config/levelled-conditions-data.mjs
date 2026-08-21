/**
 * Neuroshima 5e — Upojenie i Skażenie radioaktywne: level tables.
 *
 * Same split as `diseases-data.mjs` / `disease-effects.mjs`: `text` quotes the
 * rulebook verbatim and must not drift, while `changes` / `statuses` / `manual`
 * encode the judgement calls about how that sentence maps onto dnd5e. The two are
 * kept in one file here only because there are two conditions and eight rows
 * between them — splitting that across four files would hide more than it reveals.
 *
 * Enforcement lives in `actors/levelled-conditions.mjs`.
 *
 * ## Sources
 * - **TABELA STOPNI UPOJENIA** — *Zasady szczegółowe*, "Stan upojenia".
 * - **POZIOM SKAŻENIA RADIOAKTYWNEGO** — *Zasady szczegółowe*, "Skażenie
 *   radioaktywne [ZAGROŻENIE]".
 */

// CONST.ACTIVE_EFFECT_MODES, spelled out — this module is imported by node syntax
// checks and the pack builder, where the Foundry globals do not exist.
const MULTIPLY = 1;
const ADD = 2;

/** Disadvantage (-1) / advantage (+1) on an ability's checks. */
const check = (abl, v = -1) => ({ key: `system.abilities.${abl}.check.roll.mode`, mode: ADD, value: String(v) });

const ALL_ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

/**
 * "Utrudnienie do wszystkich testów" — every ability check, which per
 * `AdvantageModeField.combineFields` also reaches every skill and tool test built
 * on those abilities. See the header of `config/disease-effects.mjs` for why one
 * change per ability is enough.
 */
const allChecks = (v = -1) => ALL_ABILITIES.map(a => check(a, v));

/** Szybkość spada o połowę. */
const speedHalf = { key: "system.attributes.movement.walk", mode: MULTIPLY, value: "0.5" };

/* -------------------------------------------- */
/*  Upojenie                                     */
/* -------------------------------------------- */

/**
 * Stopnie Upojenia 1–4.
 *
 * **Cumulative.** The rulebook says "Dalsze spożywanie alkoholu powoduje kumulatywne
 * efekty", so stopień 3 carries the effects of 1 and 2 as well. `changes` here are
 * per-row; `actors/levelled-conditions.mjs` accumulates rows 1..N.
 *
 * ### Judgement calls
 *
 * - **"Utrudnienie do wszystkich testów" (stopień 3)** is read as *Testy* — Testy
 *   Cech and Testy Ataku — but **not** Rzuty Obronne, which Neuroshima consistently
 *   names separately (stopnie 1 and 2 say "Testów Cech", and the Kac rule spells out
 *   "Rzut Obronny" when it means one). Attack disadvantage has no Active Effect
 *   field in dnd5e and is applied at roll time, same as diseases.
 * - **"Ułatwienie do RO przeciw Przerażeniu" (stopień 1)** has no home in dnd5e:
 *   saves are keyed by ability, not by the condition being resisted, and Neuroshima
 *   does not fix an ability for Przerażenie saves. Left to the GM.
 * - **"nie potrafisz przejść 3 m w linii prostej" (stopień 2)** is narrative — the
 *   same sentence is already listed as out-of-automation for diseases.
 *
 * @type {Readonly<Array<{level: number, text: string, changes?: object[], attack?: string, statuses?: string[], manual?: string}>>}
 */
export const UPOJENIE_LEVELS = Object.freeze([
  {
    level: 1,
    text: "Otrzymujesz Utrudnienie do Testów Cech opartych na Charyzmie i Inteligencji, "
      + "oraz Ułatwienie do RO przeciw Przerażeniu.",
    changes: [check("cha"), check("int")],
    manual: "Ułatwienie do RO przeciw Przerażeniu."
  },
  {
    level: 2,
    text: "Otrzymujesz Utrudnienie do Testów Cech opartych na Mądrości i nie potrafisz przejść 3 m w linii prostej.",
    changes: [check("wis")],
    manual: "Nie potrafisz przejść 3 m w linii prostej."
  },
  {
    level: 3,
    text: "Otrzymujesz Utrudnienie do wszystkich testów, a twoja Szybkość spada o połowę.",
    changes: [...allChecks(), speedHalf],
    attack: "all"
  },
  {
    level: 4,
    text: "Tracisz przytomność.",
    statuses: ["unconscious"]
  }
]);

/** RO na Kondycję when drinking a portion (100 ml mocnego / 500 ml słabego). */
export const UPOJENIE_DRINK_DC = 15;
/** RO na Kondycję when sobering one stopień; failure is a level of Wyczerpanie. */
export const UPOJENIE_SOBER_DC = 10;
/** Hours without alcohol that lower Upojenie by one stopień. */
export const UPOJENIE_SOBER_HOURS = 4;

/* -------------------------------------------- */
/*  Skażenie radioaktywne                        */
/* -------------------------------------------- */

/**
 * Poziomy skażenia radioaktywnego, rolled as k4 when tagging an area.
 *
 * Unlike Upojenie these levels impose **no direct penalty** — the level only sets
 * the ST of the hourly RO na Kondycję, and the damage arrives as Wyczerpanie for
 * failing it. So the rows carry no `changes`; the status is a marker that says
 * "this creature is standing in level-N contamination" and carries the DC.
 *
 * Three failed saves give choroba popromienna (see `diseases-data.mjs`), so the
 * failure count is tracked per actor rather than being left to memory.
 *
 * @type {Readonly<Array<{level: number, name: string, dc: number}>>}
 */
export const SKAZENIE_LEVELS = Object.freeze([
  { level: 1, name: "Niski",          dc: 10 },
  { level: 2, name: "Niebezpieczny",  dc: 15 },
  { level: 3, name: "Krytyczny",      dc: 20 },
  { level: 4, name: "Zabójczy",       dc: 25 }
]);

/** Failed saves that turn exposure into choroba popromienna. */
export const SKAZENIE_DISEASE_THRESHOLD = 3;

/**
 * Shared shape both conditions are driven through, so `levelled-conditions.mjs`
 * does not need a branch per condition.
 */
export const LEVELLED_CONDITIONS = Object.freeze({
  upojenie: {
    id: "upojenie",
    label: "Upojenie",
    max: 4,
    levels: UPOJENIE_LEVELS,
    /** Effects of levels 1..N all apply at level N. */
    cumulative: true,
    exhaustionSource: "kac"
  },
  skazenie: {
    id: "skazenie",
    label: "Skażenie radioaktywne",
    max: 4,
    levels: SKAZENIE_LEVELS,
    cumulative: false,
    exhaustionSource: "skazenie"
  }
});
