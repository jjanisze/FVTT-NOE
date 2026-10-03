/**
 * Neuroshima 5e — Zdolności klasowe: rejestr pokrycia, Kondycha, kości zasobów, dosyłanie.
 *
 * Paczka bez efektów ubocznych w świecie: czyta dane, pack i tworzy przedmioty tylko w pamięci.
 * Pilnuje rzeczy, które psują się po cichu:
 *   • rejestr (`auto` / `manual`, PLAN_beta B5) wskazuje pliki, które naprawdę istnieją,
 *   • plakietka trafia do opisu w paczce `zdolnosci-klasowe` (przebudowa paczek offline),
 *   • karta kości obrażeń łapie tylko zdolności z `resource.damage` — do 2026-10 przechwytywała
 *     też Motywację, Łeb jak sklep, Twardość i Kocie kości,
 *   • Kondycha leczy (aktywność heal), a nie włącza pustego stanu,
 *   • `resyncClassFeatures` dosyła mechanikę do starych kopii i nie rusza zgodnych.
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { featureStatus, featuresCoverage, featureCoverageHtml } from "../config/class-features-coverage.mjs";
import { isDamageDiceFeature } from "../actors/class-resource-dice.mjs";
import {
  stripCoverageBadge, coverageBadgeOf, staleActivityIds, planFeatureResync
} from "../migration/resync-class-features.mjs";
import { MODULE_ID } from "./helpers.mjs";

const IDS = Object.keys(CLASS_FEATURES);
const PACK_ID = `${MODULE_ID}.zdolnosci-klasowe`;

export function registerZdolnosciDataTests(quench) {
  quench.registerBatch(`${MODULE_ID}.zdolnosci-dane`, context => {
    const { describe, it, before, expect } = context;

    describe("Rejestr pokrycia (B5)", function () {
      it("każda zdolność deklaruje tablicę `auto` o poprawnym kształcie", function () {
        for (const [id, f] of Object.entries(CLASS_FEATURES)) {
          expect(f.auto, `${id}.auto`).to.be.an("array");
          for (const entry of f.auto) {
            expect(entry.what, `${id}.auto[].what`).to.be.a("string").and.not.be.empty;
            expect(entry.where, `${id}.auto[].where`).to.match(/^[\w-]+(\/[\w-]+)*\/[\w-]+\.mjs$/);
          }
        }
      });

      it("status wynika z `auto` i `manual`", function () {
        for (const [id, f] of Object.entries(CLASS_FEATURES)) {
          const expected = !f.auto.length ? "none" : (f.manual ? "partial" : "auto");
          expect(featureStatus(id), id).to.equal(expected);
        }
      });

      it("kubełki dzielą zbiór zdolności bez reszty", function () {
        const { auto, partial, none } = featuresCoverage();
        expect(auto.length + partial.length + none.length).to.equal(IDS.length);
        expect(new Set([...auto, ...partial, ...none]).size).to.equal(IDS.length);
      });

      it("„Nie automatyzujemy” dociera do plakietki niezależnie od statusu", function () {
        for (const id of IDS.filter(k => CLASS_FEATURES[k].manual)) {
          expect(featureCoverageHtml(id), id).to.contain("Nie automatyzujemy");
        }
      });

      it("każdy plik z `auto[].where` istnieje na serwerze", async function () {
        const wanted = new Set(IDS.flatMap(id => CLASS_FEATURES[id].auto.map(a => a.where)));
        const missing = [];
        for (const where of wanted) {
          const response = await fetch(foundry.utils.getRoute(`modules/${MODULE_ID}/scripts/${where}`), { method: "HEAD" });
          if (!response.ok) missing.push(where);
        }
        expect(missing, `nieistniejące moduły: ${missing.join(", ")}`).to.be.empty;
      });
    });

    describe("Kości zasobów", function () {
      it("kartę kości obrażeń dostaje tylko Wściekły cios", function () {
        const damage = IDS.filter(id => isDamageDiceFeature(CLASS_FEATURES[id]));
        expect(damage).to.deep.equal(["wsciekly-cios"]);
      });

      it("Motywacja, Łeb jak sklep, Twardość i Kocie kości zostają przy natywnej aktywności", function () {
        for (const id of ["motywacja", "leb-jak-sklep", "twardosc", "kocie-kosci"]) {
          expect(CLASS_FEATURES[id].resource?.die, `${id} ma kość`).to.be.a("string");
          expect(isDamageDiceFeature(CLASS_FEATURES[id]), id).to.equal(false);
        }
      });

      it("Wściekły cios: najwyżej 3 kości do jednego ataku", function () {
        expect(CLASS_FEATURES["wsciekly-cios"].resource.perAttack).to.equal(3);
      });
    });

    describe("Kondycha", function () {
      it("dane: leczenie 1k8 + poziom Twardziela, bez przełącznika", function () {
        const f = CLASS_FEATURES.kondycha;
        expect(f.heal).to.deep.equal({ number: 1, denomination: 8, bonus: "@classes.twardziel.levels" });
        expect(f.toggle, "Kondycha nie jest stanem").to.equal(undefined);
        expect(f.action).to.equal("B");
      });
    });

    describe("Kompendium `zdolnosci-klasowe`", function () {
      let docs = null;
      before(async function () {
        docs = await game.packs.get(PACK_ID)?.getDocuments() ?? null;
      });

      it("każdy dokument niesie plakietkę i flagę `coverage` zgodne z danymi", function () {
        if (!docs) this.skip();
        for (const doc of docs) {
          const id = doc.getFlag(MODULE_ID, "abilityId");
          expect(doc.system.description.value, id).to.contain(featureCoverageHtml(id));
          expect(doc.getFlag(MODULE_ID, "coverage"), id).to.equal(featureStatus(id));
        }
      });

      it("Kondycha: aktywność leczenia w Akcji Bonusowej, zużywa użycie", function () {
        if (!docs) this.skip();
        const doc = docs.find(d => d.getFlag(MODULE_ID, "abilityId") === "kondycha");
        const [activity] = doc.system.activities;
        expect(activity.type).to.equal("heal");
        expect(activity.activation.type).to.equal("bonus");
        expect(activity.healing.formula).to.contain("1d8");
        expect(activity.consumption.targets[0]?.type).to.equal("itemUses");
        expect(doc.getFlag(MODULE_ID, "toggle")).to.equal(null);
      });
    });

    describe("Dosyłanie zmian do kopii na kartach", function () {
      const body = "<p>Tekst zdolności.</p><p>Dopisek MG.</p>";

      it("wycięcie plakietki zostawia tekst, także dopisany przez MG", function () {
        for (const id of ["berserk", "samouk", "cichy-krok"]) {
          const badge = featureCoverageHtml(id);
          expect(stripCoverageBadge(body + badge), id).to.equal(body);
          expect(coverageBadgeOf(body + badge), id).to.equal(badge);
        }
        expect(coverageBadgeOf(body)).to.equal("");
      });

      it("aktywność do wymiany: brak albo inny typ; ręcznie dodane zostają", function () {
        const wanted = { a1: { type: "heal" } };
        expect(staleActivityIds({ a1: { type: "utility" } }, wanted)).to.deep.equal(["a1"]);
        expect(staleActivityIds({}, wanted)).to.deep.equal(["a1"]);
        expect(staleActivityIds({ a1: { type: "heal" }, mine: { type: "utility" } }, wanted)).to.deep.equal([]);
      });

      it("stara Kondycha (przełącznik) dostaje leczenie i plakietkę; zgodna kopia — nic", async function () {
        const doc = (await game.packs.get(PACK_ID)?.getDocuments() ?? [])
          .find(d => d.getFlag(MODULE_ID, "abilityId") === "kondycha");
        if (doc?.system.activities.contents[0]?.type !== "heal") this.skip(); // paczka sprzed przebudowy
        const want = doc.toObject();

        const old = foundry.utils.deepClone(want);
        const [aid] = Object.keys(old.system.activities);
        old.system.activities[aid] = { ...old.system.activities[aid], type: "utility" };
        delete old.system.activities[aid].healing;
        old.flags[MODULE_ID].toggle = { effect: "neuro-kondycha", duration: { rounds: null } };
        old.system.description.value = stripCoverageBadge(old.system.description.value);
        old.system.uses.spent = 1;

        const plan = planFeatureResync(new Item.implementation(old), want);
        expect(plan.stale).to.deep.equal([aid]);
        expect(plan.update[`flags.${MODULE_ID}.toggle`]).to.equal(null);
        expect(plan.update["system.description.value"]).to.contain(featureCoverageHtml("kondycha"));
        expect(plan.update, "zużyte użycia zostają").to.not.have.property("system.uses.spent");

        expect(planFeatureResync(new Item.implementation(want), want)).to.equal(null);
      });
    });
  });
}
