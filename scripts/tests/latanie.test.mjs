/**
 * Neuroshima 5e — latanie (PLAN_m6_drobne_zasady.md §5.5, E5, U13).
 *
 * Warstwa 1: reguła `spadanieLotnika` — Nieprzytomność i Szybkość 0 strącają z obrażeniami, Powalenie opuszcza bez,
 * samo Obezwładnienie nie strąca. Warstwa 2 (aktor testowy): lotnik rozpoznany mimo lotu wyzerowanego przez stany,
 * także z lotem z efektu. Ruch żetonu i karta — e2e `latanie`.
 */

import { spadanieLotnika, stanLotnika } from "../actors/latanie.mjs";
import { CHANGE_TYPE, change } from "../config/effect-changes.mjs";
import { MODULE_ID, scratchActor, scratchCleanup } from "./helpers.mjs";

export function registerLatanieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.latanie`, context => {
    const { describe, it, after, expect } = context;

    describe("Reguła (s. 253)", function () {
      const s = (statusy, extra = {}) => spadanieLotnika({ lotBazowy: 9, lot: 9, statusy: new Set(statusy), ...extra });
      it("nie lotnik — reguła się nie wtrąca (dnd5e)", function () {
        expect(spadanieLotnika({ lotBazowy: 0, statusy: new Set(["prone"]) })).to.deep.equal({ lotnik: false, powod: null });
      });
      it("w powietrzu: bez stanów, samo Obezwładnienie, Ogłuszenie", function () {
        expect(s([]).powod).to.equal(null);
        expect(s(["incapacitated"]).powod).to.equal(null);
        expect(s(["stunned", "incapacitated"]).powod).to.equal(null);
      });
      it("Nieprzytomność (z Powaleniem) i śmierć — spada z obrażeniami", function () {
        expect(s(["unconscious", "incapacitated", "prone"], { lot: 0, bezRuchu: true }).powod).to.equal("nieprzytomny");
        expect(s(["dead"]).powod).to.equal("nieprzytomny");
      });
      it("Szybkość 0: warunek `noMovement` albo lot zbity karami do 0", function () {
        expect(s(["grappled"], { lot: 0, bezRuchu: true }).powod).to.equal("szybkosc0");
        expect(s(["grappled", "prone"], { lot: 0, bezRuchu: true }).powod, "Pochwycony i Powalony — z obrażeniami").to.equal("szybkosc0");
        expect(s([], { lot: 0 }).powod).to.equal("szybkosc0");
      });
      it("samo Powalenie — opada bez obrażeń (U13)", function () {
        expect(s(["prone"], { lot: 0 }).powod).to.equal("powalony");
      });
    });

    describe("Aktor (warstwa 2)", function () {
      after(scratchCleanup);

      it("lotnik ze źródła: Powalenie zeruje pochodny lot, a stan wciąż go rozpoznaje", async function () {
        const a = await scratchActor({ type: "npc", system: { attributes: { movement: { speeds: { walk: 0, fly: 18 } } } } });
        expect(stanLotnika(a)).to.deep.equal({ lotnik: true, powod: null });
        await a.toggleStatusEffect("prone", { active: true });
        expect(Number(a.system.attributes.movement.speeds.fly), "dnd5e: crawl zeruje lot").to.equal(0);
        expect(stanLotnika(a).powod).to.equal("powalony");
        await a.toggleStatusEffect("grappled", { active: true });
        expect(stanLotnika(a).powod).to.equal("szybkosc0");
      });

      it("Obezwładnienie nie strąca; Nieprzytomność tak", async function () {
        const a = await scratchActor({ type: "npc", system: { attributes: { movement: { speeds: { walk: 9, fly: 18 } } } } });
        await a.toggleStatusEffect("incapacitated", { active: true });
        expect(stanLotnika(a).powod).to.equal(null);
        await a.toggleStatusEffect("unconscious", { active: true });
        expect(stanLotnika(a).powod).to.equal("nieprzytomny");
      });

      it("lot z efektu (plecak odrzutowy) też czyni lotnikiem", async function () {
        const a = await scratchActor({ type: "character", system: { attributes: { movement: { speeds: { walk: 9, fly: 0 } } } } });
        expect(stanLotnika(a).lotnik).to.equal(false);
        await a.createEmbeddedDocuments("ActiveEffect", [{
          name: "[Quench] plecak", system: { changes: [change("system.attributes.movement.speeds.fly", CHANGE_TYPE.override, "12")] }
        }]);
        await a.toggleStatusEffect("prone", { active: true });
        expect(stanLotnika(a)).to.deep.equal({ lotnik: true, powod: "powalony" });
      });
    });
  });
}
