/**
 * Neuroshima 5e — Staza, RAW, *Ekwipunek* → Różności (s. 142).
 *
 * > STAZA. Wielorazowa opaska uciskowa, która zmniejsza krwawienie. W ramach akcji Używanie możesz
 * > założyć stazę na kończynę, żeby ustabilizować jedną umierającą istotę, znajdującą się obok ciebie.
 * Tabela Różności: 10 gb, 0,1 kg, 30%.
 *
 * Aktywność „Załóż stazę” (Używanie) → stabilizacja przez lejek umierania (`combat/umieranie.mjs`,
 * PLAN_m1_walka U11): bez testu, bez zużycia — „wielorazowa”. Pacjent jak przy małym medyku:
 * cel gracza, inaczej zaznaczony żeton. Ten sam ruch ma przycisk [Staza] na karcie „Umiera”.
 * Przedmiot podręczny (RAW każe go używać w akcji — decyzja MG 2026-09-25), flaga `handy`.
 */

const MODULE_ID = "neuroshima-2026-overrides";

export const STAZA = Object.freeze({ name: "Staza", price: 10, weight: 0.1, avail: 30 });

/** Stałe id aktywności — ta sama w paczce i na kopiach tworzonych w świecie. */
export const STAZA_ACTIVITY_ID = "stazaZalozenie00";

const STAZA_IMG = "modules/neuroshima-2026-overrides/icons/items/loot/staza.svg";

const STAZA_DESCRIPTION = `<p>Wielorazowa opaska uciskowa, która zmniejsza krwawienie.</p>`
  + `<p><strong>Załóż stazę</strong> (Używanie) — ustabilizuj jedną umierającą istotę, która jest obok `
  + `ciebie: bez testu, staza się nie zużywa. Wskaż pacjenta (cel albo zaznaczony żeton).</p>`
  + `<p><em>Przedmiot podręczny — można go nosić przy pasie.</em></p>`;

export function isStaza(item) {
  return item?.getFlag?.(MODULE_ID, "staza") === true;
}

/** Dane itemu — wspólne dla paczki `sprzet` i `createStaza()`. */
export function buildStazaItemData({ quantity = 1 } = {}) {
  return {
    name: STAZA.name,
    type: "consumable",
    img: STAZA_IMG,
    system: {
      type: { value: "trinket", subtype: "" },
      description: { value: STAZA_DESCRIPTION, chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      identifier: "staza",
      quantity,
      weight: { value: STAZA.weight, units: "kg" },
      price: { value: STAZA.price, denomination: "gb" },
      uses: { max: "", spent: 0, recovery: [], autoDestroy: false },
      activities: {
        [STAZA_ACTIVITY_ID]: {
          _id: STAZA_ACTIVITY_ID,
          type: "utility",
          name: "Załóż stazę",
          activation: { type: "action", value: 1, condition: "Używanie; umierająca istota obok ciebie" },
          consumption: { targets: [], scaling: { allowed: false } },
          range: { override: true, value: "1.5", units: "m", special: "" },
          target: {
            override: true, prompt: false,
            affects: { count: "1", type: "creature", choice: false, special: "umierająca istota obok ciebie" },
            template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "m" }
          },
          visibility: { identifier: "staza-zalozenie" }
        }
      }
    },
    flags: { [MODULE_ID]: { staza: true, handy: true, availability: STAZA.avail } }
  };
}

/** Nowa staza — w świecie albo u aktora. */
export async function createStaza({ actor = null, quantity = 1 } = {}) {
  const data = buildStazaItemData({ quantity });
  return actor ? (await actor.createEmbeddedDocuments("Item", [data]))[0] : Item.implementation.create(data);
}

/** Pacjent: cel użytkownika, inaczej zaznaczony żeton — nie zakładający. */
function _pacjent(medic) {
  const targets = Array.from(game.user.targets ?? []);
  if (targets.length) return targets[0].actor ?? null;
  return (canvas.tokens?.controlled ?? []).map(t => t.actor).find(a => a && a !== medic) ?? null;
}

function _onPreUseActivity(activity, _usage, _dialog, messageConfig) {
  if (activity?.id === STAZA_ACTIVITY_ID && isStaza(activity.item)) messageConfig.create = false;
}

async function _onPostUseActivity(activity) {
  if (activity?.id !== STAZA_ACTIVITY_ID || !isStaza(activity.item)) return;
  const medic = activity.actor;
  const patient = _pacjent(medic);
  if (!patient) {
    ui.notifications.warn("Wskaż umierającego — oznacz (target) albo zaznacz jego żeton.");
    return;
  }
  // Import w locie: `dev/packs/build-packs.mjs` czyta ten plik w Node — bez łańcucha walki.
  const { poprosOStabilizacje } = await import("../combat/umieranie.mjs");
  await poprosOStabilizacje(patient, { zrodlo: "staza", pomocnik: medic });
}

export function registerStaza() {
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
}

export const stazaApi = Object.freeze({ create: createStaza, build: buildStazaItemData, isStaza });
