/**
 * Neuroshima 5e — Kwas (fiolka), RAW, *Ekwipunek* → Różności.
 *
 * > KWAS. Fiolka (100 ml) silnie żrącej substancji. Kiedy wykonujesz akcję Atakowanie, możesz
 * > zastąpić jeden ze swoich ataków rzutem fiolką z kwasem w cel, który widzisz w zasięgu 6 m.
 * > Cel musi zdać RO na Zręczność (ST 8 plus twój modyfikator Zręczności i Premia Biegłości)
 * > lub otrzyma 4k6 obrażeń od kwasu.
 * Tabela Różności: 10 gb, 0,1 kg, 30%.
 *
 * Całość mieści się w natywnej aktywności dnd5e typu `save`: jeden cel w 6 m, RO na ZR z ST
 * liczonym jak w RAW (`dc.calculation: "dex"` = 8 + mod. ZR + Premia Biegłości), 4k6 od kwasu,
 * **sukces = brak obrażeń** (RAW nie daje połowy). Zużycie: `uses.max 1` + `autoDestroy`, jak leki.
 * Rzut RO i zastosowanie obrażeń zostają przy przyciskach karty czatu dnd5e — MG w pętli.
 *
 * „Zastępuje jeden atak w akcji Atakowanie" — dnd5e nie ma pojęcia ataku częściowego, więc
 * aktywacja to `action` z warunkiem opisanym słownie; przy Dodatkowym Ataku gracz liczy sam.
 *
 * Przedmiot podręczny (decyzja MG 2026-09-25: to, czego RAW każe używać w akcji) — flaga
 * `handy`, pas w nagłówku karty. Wcześniej jedyna fiolka w świecie była ręcznie zrobionym
 * „surowcem" bez aktywności (Raynald, ×10 — w oryginale z Roll20 jedna; poprawione).
 */

const MODULE_ID = "neuroshima-2026-overrides";

export const KWAS = Object.freeze({
  name: "Kwas (fiolka)",
  price: 10, weight: 0.1, avail: 30,
  range: 6, dice: 4, faces: 6
});

/** Stałe id aktywności — ta sama w paczce i na kopiach tworzonych w świecie. */
export const KWAS_ACTIVITY_ID = "kwasRzutFiolka00";

// Ikona tymczasowa: ogólna chemia. Własna — kolejka dev/icons/MISSING.md (A).
const KWAS_IMG = `modules/${MODULE_ID}/icons/items/loot/chemia.svg`;

const KWAS_DESCRIPTION = `<p>Fiolka (100 ml) silnie żrącej substancji.</p>`
  + `<p><strong>Rzut fiolką</strong> — zamiast jednego ataku w akcji Atakowanie: cel, którego widzisz, `
  + `w zasięgu ${KWAS.range} m. Cel wykonuje RO na Zręczność (ST 8 + twój mod. ZR + Premia Biegłości); `
  + `porażka — ${KWAS.dice}k${KWAS.faces} obrażeń od kwasu, sukces — bez obrażeń.</p>`
  + `<p><em>Przedmiot podręczny — można go nosić przy pasie.</em></p>`;

export function isKwas(item) {
  return item?.getFlag?.(MODULE_ID, "kwas") === true;
}

/** Dane itemu — wspólne dla paczki `sprzet` i `createKwas()`. */
export function buildKwasItemData({ quantity = 1 } = {}) {
  return {
    name: KWAS.name,
    type: "consumable",
    img: KWAS_IMG,
    system: {
      type: { value: "trinket", subtype: "" },
      description: { value: KWAS_DESCRIPTION, chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      identifier: "kwas",
      quantity,
      weight: { value: KWAS.weight, units: "kg" },
      price: { value: KWAS.price, denomination: "gb" },
      uses: { max: "1", spent: 0, recovery: [], autoDestroy: true },
      activities: {
        [KWAS_ACTIVITY_ID]: {
          _id: KWAS_ACTIVITY_ID,
          type: "save",
          name: "Rzuć fiolką",
          img: `modules/${MODULE_ID}/icons/activities/activity_throw.svg`,
          activation: { type: "action", value: 1, condition: "zamiast jednego ataku w akcji Atakowanie" },
          consumption: { targets: [{ type: "itemUses", value: "1", target: "" }], scaling: { allowed: false } },
          range: { override: true, value: String(KWAS.range), units: "m", special: "" },
          target: {
            override: true, prompt: true,
            affects: { count: "1", type: "creature", choice: false, special: "cel, którego widzisz" },
            template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "m" }
          },
          damage: {
            onSave: "none",
            parts: [{ number: KWAS.dice, denomination: KWAS.faces, bonus: "", types: ["acid"] }]
          },
          save: { ability: ["dex"], dc: { calculation: "dex", formula: "" } },
          visibility: { identifier: "kwas-rzut" }
        }
      }
    },
    flags: { [MODULE_ID]: { kwas: true, handy: true, availability: KWAS.avail } }
  };
}

/** Nowa fiolka kwasu — w świecie albo u aktora. */
export async function createKwas({ actor = null, quantity = 1 } = {}) {
  const data = buildKwasItemData({ quantity });
  return actor ? (await actor.createEmbeddedDocuments("Item", [data]))[0] : Item.implementation.create(data);
}

export const kwasApi = Object.freeze({ create: createKwas, build: buildKwasItemData, isKwas });
