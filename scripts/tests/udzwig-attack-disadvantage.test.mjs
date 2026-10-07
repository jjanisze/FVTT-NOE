/**
 * Neuroshima 5e — domyślne Utrudnienie do Ataku w Przeciążeniu/Unieruchomieniu
 * (`combat/udzwig-attack-disadvantage.mjs`).
 *
 * Od 2026-10-07 (PLAN_m1_walka D6) to źródło silnika okoliczności ataku (`combat/okolicznosci.mjs`):
 * tryb rzutu i plakietkę robi silnik, ten plik mówi tylko „czy i dlaczego”. Warstwa 5 — prawdziwy
 * aktor z ciężarem, funkcja źródła wołana wprost. Silnik — paczka `okolicznosci`; rzut i karta — e2e.
 */

import { __testing as udzwig } from "../combat/udzwig-attack-disadvantage.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, setCarriedWeight } from "./helpers.mjs";

export function registerUdzwigAttackDisadvantageTests(quench) {
  quench.registerBatch(`${MODULE_ID}.udzwig-atak`, context => {
    const { describe, it, after, expect } = context;

    after(async function () {
      await scratchCleanup();
    });

    describe("źródło okoliczności ataku", function () {
      it("Normalna → brak Utrudnienia", async function () {
        const actor = await scratchActor({ system: { abilities: { str: { value: 10 } } } });
        expect(udzwig.zrodloUdzwig({ actor })).to.deep.equal([]);
      });

      it("Przeciążenie → Utrudnienie z powodem", async function () {
        const actor = await scratchActor({ system: { abilities: { str: { value: 10 } } } });
        await setCarriedWeight(actor, 70); // Siła 10 → Użytkowy 50, Maksymalny 100
        const [w] = udzwig.zrodloUdzwig({ actor });
        expect(w?.rodzaj).to.equal("utrudnienie");
        expect(w?.label).to.include("Przeciążenia");
      });

      it("Unieruchomienie → Utrudnienie z innym powodem", async function () {
        const actor = await scratchActor({ system: { abilities: { str: { value: 10 } } } });
        await setCarriedWeight(actor, 130);
        expect(udzwig.zrodloUdzwig({ actor })[0]?.label).to.include("Unieruchomienia");
      });

      it("brak aktora → nie wybucha, nic nie zwraca", function () {
        expect(() => udzwig.zrodloUdzwig({ actor: null })).to.not.throw();
        expect(udzwig.zrodloUdzwig({ actor: null })).to.deep.equal([]);
      });
    });
  }, { displayName: "Neuroshima: Udźwig — domyślne Utrudnienie do Ataku" });
}
