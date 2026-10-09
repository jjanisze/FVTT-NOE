/**
 * Neuroshima 5e — towarzysze w paczkach (PLAN_m3_towarzysze.md §7.8, §7.13; E4).
 *
 *   - **Szablony zwierząt** — paczka `towarzysze` (Actor): statblocki z `config/towarzysze-data.mjs`
 *     przez builder Bestiariusza (`buildNpc` — Współpraca dostaje `packTactics` za darmo, F12), potem to, co
 *     u towarzysza liczy się z właściciela: TT jako formuła `custom`, premia ataku jako formuła `flat`
 *     (roll data `@wlasciciel`), żeton powiązany i przyjazny, flaga szablonu.
 *   - **Klasa „Towarzysz”** — paczka `klasy`, folder „Towarzysze”: awanse poziomu 1 ludzkiego towarzysza
 *     (2 RO, 2 umiejętności lub zestawy narzędzi, 1 Sztuczka); KW k6, bez awansu PW (liczy moduł, U5).
 *
 * Builder Bestiariusza i pomocnicze funkcje dostaje z `build-packs.mjs` jako argumenty — to skrypt, nie
 * biblioteka, a import w drugą stronę zrobiłby cykl.
 */

import { RODZAJE, STATBLOKI, ZRODLA } from "../../scripts/config/towarzysze-data.mjs";

/** Identyfikator klasy towarzysza (`system.identifier`). */
export const KLASA_TOWARZYSZA = "towarzysz";

/**
 * Szablony zwierząt: `{ entries, folders }` w kształcie `writeActorPack`.
 * @param {{buildNpc: Function, idFor: Function, MODULE_ID: string}} h
 */
export function szablonyTowarzyszy({ buildNpc, idFor, MODULE_ID }) {
  const entries = [];
  const zrodla = new Set();
  for (const [rodzaj, s] of Object.entries(STATBLOKI)) {
    const wpis = RODZAJE[rodzaj];
    zrodla.add(wpis.zrodlo);
    const c = {
      ...s,
      id: `towarzysz-${rodzaj}`,
      acNote: null, blood: "czerwona", conditionImmunities: [], damageThreshold: null, failureThreshold: null,
      gear: null, morale: null, overlay: false, pb: 2, randomized: false, resistances: [], senseQualifiers: null,
      sp: 0, tools: null, typeNote: null, usesZranienie: true, vulnerabilities: [],
      lore: {
        informacje: `Towarzysz ze zdolności ${ZRODLA[wpis.zrodlo].nazwa} (NOE ${wpis.strona}). TT, PW, KW i premię ataku `
          + "liczy moduł z bieżących wartości właściciela; liczby w szablonie to właściciel z PB +2 i MDR +2."
      }
    };
    const built = buildNpc(c);
    const a = built.actor;
    a._id = idFor("towarzysz", rodzaj);
    a.name = wpis.nazwa;
    a.folder = idFor("towarzysze-folder", wpis.zrodlo);
    a.sort = Object.keys(STATBLOKI).indexOf(rodzaj) * 1000;
    a.system.attributes.ac = { flat: s.ac, calc: "custom", formula: wpis.wzory.tt };
    a.prototypeToken.name = wpis.nazwa;
    a.prototypeToken.actorLink = true;
    a.prototypeToken.disposition = 1;
    a.flags[MODULE_ID].towarzyszSzablon = rodzaj;
    for (const item of built.items) {
      for (const act of Object.values(item.system?.activities ?? {})) {
        if (act.type === "attack" && wpis.wzory.atak) act.attack = { ...act.attack, bonus: wpis.wzory.atak, flat: true };
      }
    }
    entries.push(built);
  }
  const folders = [...zrodla].map((z, i) => ({
    _id: idFor("towarzysze-folder", z), name: ZRODLA[z].nazwa, type: "Actor", folder: null,
    sorting: "m", sort: i * 100000, color: null, flags: {}
  }));
  return { entries, folders };
}

/**
 * Klasa „Towarzysz” i jej folder w paczce `klasy`.
 * @param {{advancement: Function, idFor: Function, html: Function, SZTUCZKI_POOL: object[], MODULE_ID: string}} h
 */
export function klasaTowarzysza({ advancement, idFor, html, SZTUCZKI_POOL, MODULE_ID }) {
  const cid = KLASA_TOWARZYSZA;
  const folder = {
    _id: idFor("klasy-folder", "towarzysze"), name: "Towarzysze", type: "Item", folder: null,
    sorting: "a", sort: 900000, color: null, flags: {}, description: ""
  };
  const adv = [
    advancement("Trait", 1, "Rzuty obronne", {
      allowReplacements: false, grants: [],
      choices: [{ count: 2, pool: ["saves:*"] }], mode: "default"
    }, `${cid}-ro`),
    advancement("Trait", 1, "Umiejętności lub zestawy narzędzi", {
      allowReplacements: false, grants: [],
      choices: [{ count: 2, pool: ["skills:*", "tool:*"] }], mode: "default"
    }, `${cid}-umiejetnosci`),
    advancement("ItemChoice", 1, "Sztuczka (której wymagania spełnia)", {
      allowDrops: true,
      choices: { 1: { count: 1 } },
      pool: SZTUCZKI_POOL,
      restriction: { type: "feat" },
      type: "feat"
    }, `${cid}-sztuczka`)
  ];
  const doc = {
    _id: idFor("class", cid),
    name: "Towarzysz",
    type: "class",
    img: "icons/environment/people/group.webp",
    folder: folder._id,
    system: {
      description: {
        value: html("Ludzki partner (Partner, s. 101) albo Prawa ręka (Moja prawa ręka, s. 76). Poziomy idą za "
          + "właścicielem — tyle, ile ma poziomów klasy, z której jest zdolność. PW 5 × ten poziom, bez KON; KW k6; "
          + "PB +2 (nie rośnie). Tylko na karcie towarzysza — na postać gracza nie upuszczać."),
        chat: ""
      },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      identifier: cid,
      levels: 1,
      hd: { denomination: "d6", spent: 0, additional: "" },
      primaryAbility: { value: [], all: false },
      advancement: adv,
      startingEquipment: [],
      spellcasting: { progression: "none", ability: "", preparation: {} },
      properties: []
    },
    flags: { [MODULE_ID]: { classId: cid, towarzysz: true } }
  };
  return { doc, folder };
}
