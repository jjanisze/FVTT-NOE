/**
 * Neuroshima 5e — kontrakt nadpisań `CONFIG.DND5E`.
 *
 * Moduł przepisuje pół tablicy konfiguracyjnej dnd5e: stany, umiejętności, narzędzia,
 * typy obrażeń, typy stworzeń, właściwości broni. To jest warstwa o największym zasięgu
 * rażenia w całym module — jeden zły klucz nie rzuca wyjątku, tylko po cichu wyłącza
 * mechanikę systemu (patrz `stealthDisadvantage`, które było martwe, bo Skradanie się
 * nazywa się u nas `skr`, a dnd5e ma zaszyte `ste`).
 *
 * Testy tutaj sprawdzają stan `CONFIG` PO `init` — czyli to, co widzi reszta systemu,
 * a nie to, co deklarują pliki danych.
 */

import {
  NEUROSHIMA_STANY, NEUROSHIMA_ZAGROZENIA, NEUROSHIMA_MARKERS,
  REMOVED_CONDITIONS, REMOVED_STATUSES
} from "../config/conditions.mjs";
import { NEUROSHIMA_CREATURE_TYPES, BLOOD_TYPES } from "../config/creature-types.mjs";
import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { CLASSES, PROFESSIONS } from "../config/classes-data.mjs";
import { pwGainOnAdvancement } from "../actors/pw.mjs";
import { SZYBKOSC_STARTOWA_M, potrzebujeSzybkosci } from "../actors/character-defaults.mjs";
import { KOBALT_CLASS_FEATURES } from "../wkk/config/class-features-data.mjs";
import { filterKobaltPool } from "../actors/kobalt-advancement.mjs";
import { MODULE_ID } from "./helpers.mjs";

/** Sprawdza, że plik istnieje na serwerze — literówka w ścieżce ikony jest niewidoczna w UI. */
async function assetExists(path) {
  const response = await fetch(foundry.utils.getRoute(path), { method: "HEAD" });
  return response.ok;
}

export function registerConfigTests(quench) {
  quench.registerBatch(`${MODULE_ID}.konfiguracja`, context => {
    const { describe, it, expect } = context;

    /* ---------------------------------------------------------------- */

    describe("Stany — tożsamość i spójność", function () {
      const conditions = () => CONFIG.DND5E.conditionTypes;
      const statuses = () => CONFIG.DND5E.statusEffects;

      it("każdy stan z TABELI STANÓW trafił do `conditionTypes` pod swoją nazwą", function () {
        for (const [key, def] of Object.entries(NEUROSHIMA_STANY)) {
          expect(conditions(), key).to.have.property(key);
          expect(conditions()[key].name, key).to.equal(def.name);
        }
      });

      it("każde zagrożenie i każdy znacznik są zarejestrowane", function () {
        for (const key of Object.keys(NEUROSHIMA_ZAGROZENIA)) expect(conditions(), key).to.have.property(key);
        for (const key of Object.keys(NEUROSHIMA_MARKERS)) expect(statuses(), key).to.have.property(key);
      });

      it("nazwy stanów są unikalne", function () {
        // Regresja: generyczne tłumaczenia dnd5e miały „Ogłuszony" i dla `stunned`,
        // i dla `deafened`, przez co dwa różne stany były w HUD nie do odróżnienia.
        const names = [...Object.values(NEUROSHIMA_STANY), ...Object.values(NEUROSHIMA_ZAGROZENIA),
          ...Object.values(NEUROSHIMA_MARKERS)].map(def => def.name);
        const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
        expect(duplicates, `powtórzone nazwy: ${duplicates.join(", ")}`).to.be.empty;
      });

      it("stany usunięte naprawdę zniknęły z CONFIG", function () {
        for (const key of REMOVED_CONDITIONS) expect(conditions(), key).to.not.have.property(key);
        for (const key of REMOVED_STATUSES) expect(statuses(), key).to.not.have.property(key);
      });

      it("dnd5e nie dorzuciło stanu, którego nie rozpatrzyliśmy", function () {
        // Ten sam warunek, na którym `registerConditions` wypisuje ostrzeżenie do konsoli.
        // Po aktualizacji systemu to jest pierwszy test, który powinien zapalić się na czerwono.
        const known = new Set([
          ...Object.keys(NEUROSHIMA_STANY),
          ...Object.keys(NEUROSHIMA_ZAGROZENIA),
          ...REMOVED_CONDITIONS,
          "upojenie", "skazenie", "zranienie"
        ]);
        const unknown = Object.keys(conditions()).filter(key => !known.has(key));
        expect(unknown, `nierozpatrzone stany dnd5e: ${unknown.join(", ")} — dopisz je do `
          + "NEUROSHIMA_ZAGROZENIA albo REMOVED_CONDITIONS").to.be.empty;
      });

      it("odwołania w `statuses`/`riders` wskazują na istniejące stany", function () {
        const all = new Set([...Object.keys(conditions()), ...Object.keys(statuses())]);
        for (const [key, def] of Object.entries({ ...NEUROSHIMA_STANY, ...NEUROSHIMA_MARKERS })) {
          for (const ref of [...(def.statuses ?? []), ...(def.riders ?? [])]) {
            expect(all.has(ref), `${key} odwołuje się do nieistniejącego "${ref}"`).to.be.true;
          }
        }
      });

      it("`conditionEffects` nie zawiera drabiny Wyczerpania dnd5e", function () {
        // Neuroshima liczy Wyczerpanie płasko (−2 do k20, −1,5 m). Zostawiony `exhaustion-4`
        // z dnd5e po cichu obciąłby postaci połowę maksymalnych PW.
        const keys = Object.values(CONFIG.DND5E.conditionEffects).flatMap(set => Array.from(set));
        const ladder = keys.filter(key => /^exhaustion-\d+$/.test(key));
        expect(ladder, `drabina 5e wróciła: ${ladder.join(", ")}`).to.be.empty;
        expect(CONFIG.DND5E.conditionEffects.halfHealth).to.be.empty;
        expect(CONFIG.DND5E.conditionEffects.halfMovement).to.be.empty;
      });

      it("Zakrwawiony jest wyłączony na rzecz Stopnia Zranienia", function () {
        expect(CONFIG.DND5E.bloodied.threshold).to.equal(0);
      });

      it("stany stopniowane mają zadeklarowaną liczbę stopni", function () {
        for (const key of ["upojenie", "skazenie", "zranienie"]) {
          expect(conditions(), key).to.have.property(key);
          expect(conditions()[key].levels, `${key}.levels`).to.be.a("number").and.to.be.above(0);
        }
      });

      it("ikony własne modułu istnieją na dysku", async function () {
        const own = [...Object.values(NEUROSHIMA_STANY), ...Object.values(NEUROSHIMA_ZAGROZENIA),
          ...Object.values(NEUROSHIMA_MARKERS)]
          .map(def => def.img)
          .filter(img => img?.includes(MODULE_ID));
        for (const img of own) expect(await assetExists(img), img).to.be.true;
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Umiejętności i narzędzia", function () {
      it("każda umiejętność wskazuje na istniejącą Cechę", function () {
        for (const [key, def] of Object.entries(CONFIG.DND5E.skills)) {
          expect(CONFIG.DND5E.abilities, `${key}.ability = ${def.ability}`).to.have.property(def.ability);
        }
      });

      it("umiejętności zaszyte w kodzie dnd5e nadal istnieją albo są świadomie przekierowane", function () {
        // `ste` (Stealth) jest w dnd5e twardym literałem — pancerz czyta
        // `skills.ste.roll.mode`. Po zmianie nazwy na `skr` przekierowanie robi
        // `actors/armor-rules.mjs`; ten test pilnuje, żeby cel przekierowania istniał.
        expect(CONFIG.DND5E.skills, "brak Skradania się — sprawdź armor-rules.mjs").to.have.property("skr");
      });

      it("każde narzędzie ma puste `id` (inaczej `Trait.keyLabel` wywala się)", function () {
        // `getBaseItemUUID` robi `id.startsWith(...)`; brak pola = TypeError w dialogu rzutu.
        for (const [key, def] of Object.entries(CONFIG.DND5E.tools)) {
          expect(def, `tools.${key}.id`).to.have.property("id");
          expect(def.id, `tools.${key}.id`).to.be.a("string");
        }
      });

      it("`Trait.keyLabel` zwraca polską nazwę dla każdego narzędzia", function () {
        for (const key of Object.keys(CONFIG.DND5E.tools)) {
          const label = dnd5e.documents.Trait.keyLabel(key, { trait: "tool" });
          expect(label, `tools.${key}`).to.be.a("string").and.to.not.be.empty;
          expect(label, `tools.${key} pokazuje surowy klucz`).to.not.equal(key);
        }
      });

      it("etykiety biegłości narzędziowych są zsynchronizowane z `tools`", function () {
        for (const key of Object.keys(CONFIG.DND5E.tools)) {
          expect(CONFIG.DND5E.toolProficiencies, key).to.have.property(key);
        }
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Broń, obrażenia, stworzenia", function () {
      it("rzucanie czarów jest wyłączone", function () {
        expect(Object.keys(CONFIG.DND5E.spellcastingTypes)).to.be.empty;
      });

      it("`validProperties.weapon` zawiera wszystkie właściwości Neuroshimy", function () {
        const registered = CONFIG.DND5E.validProperties.weapon;
        for (const key of registered) {
          expect(CONFIG.DND5E.itemProperties, `właściwość "${key}" bez definicji`).to.have.property(key);
        }
      });

      it("każdy typ broni ma etykietę i wpis w mapie biegłości", function () {
        for (const key of Object.keys(CONFIG.DND5E.weaponTypes)) {
          expect(CONFIG.DND5E.weaponProficiencies, key).to.have.property(key);
          expect(CONFIG.DND5E.weaponProficienciesMap[key], key).to.equal(key);
        }
      });

      it("taksonomia fantasy została w całości wymieniona na kategorie Bestiariusza", function () {
        // `registerCreatureTypes` czyści obiekt w miejscu — gdyby ktoś go podmienił
        // przez przypisanie, karta NPC dalej pokazywałaby Smoki i Żywiołaki.
        expect(Object.keys(CONFIG.DND5E.creatureTypes).sort())
          .to.deep.equal(Object.keys(NEUROSHIMA_CREATURE_TYPES).sort());
      });

      it("tagi krwi Splattera są jednym małym słowem i mają kolor z alfą", function () {
        // Splatter dopasowuje tag przez `includes` na `details.type.custom`, więc
        // spacja albo wielka litera cicho rozbraja plamy krwi dla całej kategorii.
        for (const [key, def] of Object.entries(BLOOD_TYPES)) {
          expect(key, `tag "${key}"`).to.match(/^[a-z]+$/);
          expect(def.color, `${key}.color`).to.match(/^#[0-9a-f]{8}$/);
          expect(def.label, `${key}.label`).to.be.a("string").and.not.be.empty;
        }
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Udźwig — CONFIG.DND5E.encumbrance / actorSizes", function () {
      // RAW (NOE s. 257, UDŹWIG): Średni Siła×5/×10 kg. dnd5e's own
      // `heavilyEncumbered.metric` and lg/huge/grg `capacityMultiplier` already
      // coincidentally match this table — regression-guard them too, since a future
      // dnd5e update silently drifting one of them would desync the bar from RAW
      // without `encumbrance-config.mjs` (which only touches `maximum`/tiny/sm) noticing.
      it("Średni (bez rozmiaru): Użytkowy = Siła×5, Maksymalny = Siła×10", function () {
        expect(CONFIG.DND5E.encumbrance.threshold.heavilyEncumbered.metric).to.equal(5);
        expect(CONFIG.DND5E.encumbrance.threshold.maximum.metric).to.equal(10);
      });

      it("mnożniki rozmiaru odpowiadają tabeli Udźwigu (względem Średniego = ×1)", function () {
        expect(CONFIG.DND5E.actorSizes.tiny.capacityMultiplier, "Malutki").to.equal(0.2);
        expect(CONFIG.DND5E.actorSizes.sm.capacityMultiplier, "Mały").to.equal(0.4);
        expect(CONFIG.DND5E.actorSizes.lg.capacityMultiplier, "Duży (dnd5e już się zgadzał)").to.equal(2);
        expect(CONFIG.DND5E.actorSizes.huge.capacityMultiplier, "Wielki (dnd5e już się zgadzał)").to.equal(4);
        expect(CONFIG.DND5E.actorSizes.grg.capacityMultiplier, "Ogromny (dnd5e już się zgadzał)").to.equal(8);
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Zdolności klasowe Koloru Kobaltu", function () {
      it("wpisy WKK są w `CLASS_FEATURES`, oznaczone `kobalt`, i w puli swojej profesji", function () {
        for (const [id, f] of Object.entries(KOBALT_CLASS_FEATURES)) {
          expect(CLASS_FEATURES[id], id).to.equal(f);
          expect(f.kobalt, `${id}.kobalt`).to.be.true;
          expect(PROFESSIONS[f.owner]?.abilities, `${id} w puli ${f.owner}`).to.include(id);
        }
        expect(PROFESSIONS.kowboj.abilities).to.include("pistolero");
      });

      it("tylko wpisy z `scripts/wkk/` mają `kobalt` — generator podręcznika go nie emituje", function () {
        const flagged = Object.values(CLASS_FEATURES).filter(f => f.kobalt).map(f => f.id).sort();
        expect(flagged).to.deep.equal(Object.keys(KOBALT_CLASS_FEATURES).sort());
      });

      it("pula awansu bez Kobaltu gubi przedmioty z flagą `kobalt`, z Kobaltem zostawia wszystkie", function () {
        const item = kobalt => ({ getFlag: (scope, key) => (scope === MODULE_ID && key === "kobalt") ? kobalt : undefined });
        const pool = [item(undefined), item(true), item(undefined)];
        expect(filterKobaltPool(pool, { kobalt: true })).to.have.lengthOf(3);
        expect(filterKobaltPool(pool, { kobalt: false })).to.have.lengthOf(2);
      });

      it("`ItemChoiceFlow` dnd5e jest obudowany filtrem puli", function () {
        const Flow = dnd5e.applications.advancement.ItemChoiceFlow;
        expect(Flow.prototype._prepareContentContext.toString()).to.include("filterKobaltPool");
      });
    });

    /* ---------------------------------------------------------------- */

    describe("PW przy awansie (B6 — postać od zera)", function () {
      it("tabela PW: Brutal / Twardziel / Zwiadowca 16 + 4 na poziom (k8), reszta 12 + 3 (k6)", function () {
        for (const [id, c] of Object.entries(CLASSES)) {
          const want = ["brutal", "twardziel", "zwiadowca"].includes(id) ? [16, 4, "d8"] : [12, 3, "d6"];
          expect([c.pw.first, c.pw.perLevel, c.pw.hd], id).to.deep.equal(want);
        }
      });

      it("pierwszy poziom: PW obecne = maks., nie kość dnd5e (8/16 przed poprawką)", function () {
        expect(pwGainOnAdvancement({ valueBefore: 0, maxBefore: null, maxAfter: 16 })).to.equal(16);
      });

      it("kolejny poziom dokłada przyrost maksimum do obecnych, także rannej postaci", function () {
        expect(pwGainOnAdvancement({ valueBefore: 9, maxBefore: 20, maxAfter: 24 })).to.equal(13);
      });

      it("utrata poziomu zabiera tyle samo, nie schodzi poniżej 0", function () {
        expect(pwGainOnAdvancement({ valueBefore: 3, maxBefore: 24, maxAfter: 20 })).to.equal(0);
      });

      it("bez zmiany maksimum (np. samo Pochodzenie bez KON) — zostaje wartość dnd5e", function () {
        expect(pwGainOnAdvancement({ valueBefore: 16, maxBefore: 16, maxAfter: 16 })).to.equal(null);
        expect(pwGainOnAdvancement({ valueBefore: 0, maxBefore: null, maxAfter: null })).to.equal(null);
      });
    });

    describe("Szybkość startowa (B6 — postać od zera)", function () {
      it("NOE: 9 m dla każdego bohatera — dnd5e bez gatunku dawał 0", function () {
        expect(SZYBKOSC_STARTOWA_M).to.equal(9);
        expect(potrzebujeSzybkosci("character", {})).to.be.true;
        expect(potrzebujeSzybkosci("character", { system: { attributes: { movement: { walk: null } } } })).to.be.true;
      });

      it("jawna wartość (import, duplikat) i nie-postacie zostają nietknięte", function () {
        expect(potrzebujeSzybkosci("character", { system: { attributes: { movement: { walk: "6" } } } })).to.be.false;
        expect(potrzebujeSzybkosci("character", { system: { attributes: { movement: { walk: "0" } } } })).to.be.false;
        expect(potrzebujeSzybkosci("npc", {})).to.be.false;
      });
    });

    /* ---------------------------------------------------------------- */

    describe("API modułu", function () {
      it("moduł wystawia `game.neuroshima` i `api` w rejestrze pakietów", function () {
        expect(game.neuroshima, "game.neuroshima").to.be.an("object");
        expect(game.modules.get(MODULE_ID).api, "modules.get().api").to.be.an("object");
      });

      it("każdy klucz `api` jest obiektem albo funkcją", function () {
        for (const [key, value] of Object.entries(game.modules.get(MODULE_ID).api)) {
          expect(["object", "function"], `api.${key} = ${typeof value}`).to.include(typeof value);
        }
      });
    });
  }, { displayName: "Neuroshima: Konfiguracja — nadpisania CONFIG.DND5E" });
}
