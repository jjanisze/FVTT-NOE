/**
 * Neuroshima 5e — Sztuczki: dane i kompendium.
 *
 * Paczka bez żadnych efektów ubocznych: czyta `sztuczki-data.mjs`, rejestr zdolności
 * i zbudowany pack. Pilnuje trzech rzeczy, które psują się po cichu:
 *   • rejestr automatyki (`auto` / `manual`) opisuje pliki, które naprawdę istnieją,
 *   • `legacyAbilityKeys` wskazują na klucze, które moduł zna,
 *   • pack `sztuczki` jest zgodny z danymi (build packów robi się offline — patrz ARCHITECTURE §4).
 */

import {
  SZTUCZKI, SZTUCZKI_CATEGORIES, sztuczkaStatus, sztuczkiCoverage,
  sztuczkaItemData, sztuczkaCoverageHtml
} from "../config/sztuczki-data.mjs";
import { ABILITY_DEFINITIONS } from "../actors/abilities.mjs";
import { MODULE_ID } from "./helpers.mjs";

const KEYS = Object.keys(SZTUCZKI);
const PACK_ID = `${MODULE_ID}.sztuczki`;

export function registerSztuczkiDataTests(quench) {
  quench.registerBatch(`${MODULE_ID}.sztuczki-dane`, context => {
    const { describe, it, before, assert, expect } = context;

    describe("Kształt wpisu", function () {
      it("każda Sztuczka ma etykietę, wymagania, treść i kategorię z listy", function () {
        for (const [key, def] of Object.entries(SZTUCZKI)) {
          expect(def.label, `${key}.label`).to.be.a("string").and.not.be.empty;
          expect(def.req, `${key}.req`).to.be.a("string").and.not.be.empty;
          expect(def.text, `${key}.text`).to.be.a("string").and.not.be.empty;
          expect(SZTUCZKI_CATEGORIES, `${key}.category`).to.have.property(def.category);
        }
      });

      it("etykiety są unikalne — moduł medyka rozpoznaje Sztuczki po nazwie", function () {
        const labels = KEYS.map(key => SZTUCZKI[key].label);
        expect(new Set(labels).size).to.equal(labels.length);
      });

      it("każdy wpis deklaruje tablicę `auto` (pusta = brak automatyki)", function () {
        for (const [key, def] of Object.entries(SZTUCZKI)) {
          expect(def.auto, `${key}.auto`).to.be.an("array");
          for (const entry of def.auto) {
            expect(entry.what, `${key}.auto[].what`).to.be.a("string").and.not.be.empty;
            expect(entry.where, `${key}.auto[].where`).to.match(/^[\w-]+\/[\w-]+\.mjs$/);
          }
        }
      });
    });

    describe("Rejestr automatyki", function () {
      it("status wynika z `auto` i `manual`", function () {
        for (const [key, def] of Object.entries(SZTUCZKI)) {
          const expected = !def.auto.length ? "none" : (def.manual ? "partial" : "auto");
          expect(sztuczkaStatus(key), key).to.equal(expected);
        }
      });

      it("kubełki pokrycia dzielą zbiór Sztuczek bez reszty", function () {
        const { auto, partial, none } = sztuczkiCoverage();
        expect(auto.length + partial.length + none.length).to.equal(KEYS.length);
        expect(new Set([...auto, ...partial, ...none]).size).to.equal(KEYS.length);
      });

      it("uzasadnienie `manual` dociera do opisu niezależnie od statusu", function () {
        // Wcześniej gałąź `none` zwracała samo „brak automatyki” i wyjaśnienie
        // ginęło w kodzie — wpis wyglądał na przeoczony, choć był świadomą decyzją.
        for (const key of KEYS.filter(k => SZTUCZKI[k].manual)) {
          expect(sztuczkaCoverageHtml(key), `${key}: uzasadnienie w badge'u`)
            .to.contain("Nie automatyzujemy");
        }
      });

      it("każdy plik z `auto[].where` istnieje na serwerze", async function () {
        const wanted = new Set(KEYS.flatMap(key => SZTUCZKI[key].auto.map(a => a.where)));
        const missing = [];
        for (const where of wanted) {
          const url = foundry.utils.getRoute(`modules/${MODULE_ID}/scripts/${where}`);
          const response = await fetch(url, { method: "HEAD" });
          if (!response.ok) missing.push(where);
        }
        expect(missing, `nieistniejące moduły: ${missing.join(", ")}`).to.be.empty;
      });

      it("`legacyAbilityKeys` wskazują na klucze znane mostkowi zdolności", function () {
        for (const [key, def] of Object.entries(SZTUCZKI)) {
          for (const legacy of def.legacyAbilityKeys ?? []) {
            expect(ABILITY_DEFINITIONS, `${key} -> ${legacy}`).to.have.property(legacy);
          }
        }
      });
    });

    describe("Dane przedmiotu", function () {
      it("`sztuczkaItemData` przechodzi walidację DataModelu dnd5e", function () {
        for (const key of KEYS) {
          expect(() => new Item.implementation(sztuczkaItemData(key)), key).to.not.throw();
        }
      });

      it("odznaka pokrycia trafia do opisu", function () {
        for (const key of KEYS) {
          const html = sztuczkaCoverageHtml(key);
          expect(html, key).to.contain(`is-${sztuczkaStatus(key)}`);
          expect(sztuczkaItemData(key).system.description.value, key).to.contain(html);
        }
      });

      it("wymaganie `Brak` nie przecieka do pola `requirements`", function () {
        for (const key of KEYS) {
          if (SZTUCZKI[key].req !== "Brak") continue;
          expect(sztuczkaItemData(key).system.requirements, key).to.equal("");
        }
      });
    });

    describe("Kompendium `sztuczki`", function () {
      let docs = null;

      before(async function () {
        const pack = game.packs.get(PACK_ID);
        if (!pack) return;
        docs = await pack.getDocuments();
      });

      it("pack jest zarejestrowany", function () {
        assert.ok(game.packs.get(PACK_ID), `brak packa ${PACK_ID}`);
      });

      it("zawiera dokładnie tyle wpisów, ile jest Sztuczek", function () {
        if (!docs) this.skip();
        expect(docs.length).to.equal(KEYS.length);
      });

      it("każdy przedmiot niesie flagę `sztuczka` i zgadza się nazwą z danymi", function () {
        if (!docs) this.skip();
        for (const doc of docs) {
          const key = doc.getFlag(MODULE_ID, "sztuczka");
          expect(SZTUCZKI, `${doc.name}: flaga "${key}"`).to.have.property(key);
          expect(doc.name, key).to.equal(SZTUCZKI[key].label);
        }
      });

      it("flaga `coverage` w packu nie rozjechała się z rejestrem", function () {
        if (!docs) this.skip();
        const stale = docs
          .filter(doc => doc.getFlag(MODULE_ID, "coverage") !== sztuczkaStatus(doc.getFlag(MODULE_ID, "sztuczka")))
          .map(doc => doc.name);
        expect(stale, `wymaga \`npm run build:packs\`: ${stale.join(", ")}`).to.be.empty;
      });
    });
  }, { displayName: "Neuroshima: Sztuczki — dane i pack" });
}
