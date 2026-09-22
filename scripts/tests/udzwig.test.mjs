/**
 * Neuroshima 5e — Udźwig: strefy Normalna/Przeciążenie/Unieruchomienie.
 *
 * Three layers: pure-function tests for `udzwigStatus`/`udzwigScale` (no actor needed —
 * these are the same helpers `encumbrance-breakdown.mjs` uses to draw the bar), a
 * live-actor layer confirming `encumbrance-config.mjs`'s CONFIG overrides actually
 * produce RAW's Siła×5/×10 (Średni) once dnd5e's own derived-data pipeline runs (the
 * two config constants alone don't prove the wiring holds end to end), and the
 * `udzwig-slowdown.mjs` Active Effect that turns crossing those same thresholds into an
 * actual Speed penalty.
 */

import { udzwigStatus, udzwigScale } from "../actors/encumbrance-breakdown.mjs";
import { __testing as slowdown } from "../actors/udzwig-slowdown.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, setCarriedWeight } from "./helpers.mjs";

export function registerUdzwigTests(quench) {
  quench.registerBatch(`${MODULE_ID}.udzwig`, context => {
    const { describe, it, after, expect } = context;

    after(async function () {
      await scratchCleanup();
    });

    describe("udzwigStatus (funkcja czysta)", function () {
      it("poniżej Użytkowego → Normalna, z odległością do Przeciążenia", function () {
        const status = udzwigStatus(30, 50, 100);
        expect(status.zone).to.equal("normalna");
        expect(status.hintLabel).to.equal("Do Przeciążenia");
        expect(status.hintKg).to.equal(20);
      });

      it("dokładnie na Użytkowym liczy się jako Normalna (RAW: kara dopiero PO przekroczeniu)", function () {
        expect(udzwigStatus(50, 50, 100).zone).to.equal("normalna");
      });

      it("między Użytkowym a Maksymalnym → Przeciążenie, z odległością do Unieruchomienia", function () {
        const status = udzwigStatus(70, 50, 100);
        expect(status.zone).to.equal("przeciazenie");
        expect(status.hintLabel).to.equal("Do Unieruchomienia");
        expect(status.hintKg).to.equal(30);
      });

      it("powyżej Maksymalnego → Unieruchomienie, z nadwyżką ponad limit", function () {
        const status = udzwigStatus(130, 50, 100);
        expect(status.zone).to.equal("nieruchomienie");
        expect(status.hintLabel).to.equal("Ponad limit");
        expect(status.hintKg).to.equal(30);
      });

      it("zwraca null, gdy progi nie są policzalne (np. aktor bez ukończonego prepareData)", function () {
        expect(udzwigStatus(10, NaN, 100)).to.be.null;
        expect(udzwigStatus(10, 50, 0)).to.be.null;
      });
    });

    describe("udzwigScale (skala paska z zapasem na przeciążenie)", function () {
      it("w spoczynku (wartość poniżej maksimum) Maksymalny siedzi na 80% szerokości", function () {
        const scale = udzwigScale(30, 100);
        expect(scale).to.equal(125);
        expect((100 / scale) * 100).to.equal(80);
      });

      it("po przekroczeniu maksimum skala rośnie, żeby wartość nie dotknęła 100%", function () {
        const scale = udzwigScale(200, 100);
        expect(scale).to.be.closeTo(220, 1e-9); // 200 * 1.1 — zaokrąglenie zmiennoprzecinkowe
        expect((200 / scale) * 100).to.be.closeTo(90.9, 0.1);
      });
    });

    describe("Konfiguracja CONFIG.DND5E → realny aktor (Średni)", function () {
      it("Siła 10 → Użytkowy 50 kg, Maksymalny 100 kg", async function () {
        const actor = await scratchActor({ system: { abilities: { str: { value: 10 } } } });
        const enc = actor.system.attributes.encumbrance;
        expect(enc.thresholds.heavilyEncumbered).to.equal(50);
        expect(enc.thresholds.maximum).to.equal(100);
      });

      it("Siła 16 → Użytkowy 80 kg, Maksymalny 160 kg (skaluje się liniowo z Siłą)", async function () {
        const actor = await scratchActor({ system: { abilities: { str: { value: 16 } } } });
        const enc = actor.system.attributes.encumbrance;
        expect(enc.thresholds.heavilyEncumbered).to.equal(80);
        expect(enc.thresholds.maximum).to.equal(160);
      });
    });

    describe("Konfiguracja CONFIG.DND5E → realny aktor (rozmiar inny niż Średni)", function () {
      it("Malutki, Siła 10 → ×0.2/×0.2: Użytkowy 10 kg, Maksymalny 20 kg", async function () {
        const actor = await scratchActor({
          system: { abilities: { str: { value: 10 } }, traits: { size: "tiny" } }
        });
        const enc = actor.system.attributes.encumbrance;
        expect(enc.thresholds.heavilyEncumbered).to.equal(10);
        expect(enc.thresholds.maximum).to.equal(20);
      });

      it("Duży, Siła 10 → ×2: Użytkowy 100 kg, Maksymalny 200 kg", async function () {
        const actor = await scratchActor({
          system: { abilities: { str: { value: 10 } }, traits: { size: "lg" } }
        });
        const enc = actor.system.attributes.encumbrance;
        expect(enc.thresholds.heavilyEncumbered).to.equal(100);
        expect(enc.thresholds.maximum).to.equal(200);
      });
    });

    describe("Spowolnienie od Udźwigu (actors/udzwig-slowdown.mjs)", function () {
      // Siła 10 (Średni): Użytkowy 50 kg, Maksymalny 100 kg. Bazowa Szybkość ustawiona
      // jawnie (9 m), żeby ×0.5/=0 dawały jednoznaczne, nie-zerowe-przez-przypadek wyniki.
      async function heavyActor(kg) {
        const actor = await scratchActor({
          system: {
            abilities: { str: { value: 10 } },
            attributes: { movement: { walk: 9 } }
          }
        });
        await setCarriedWeight(actor, kg);
        return actor;
      }

      it("Normalna (poniżej 50 kg) → brak efektu, Szybkość niezmieniona", async function () {
        const actor = await heavyActor(30);
        await slowdown.syncUdzwigSlowEffect(actor);
        expect(actor.effects.get(slowdown.EFFECT_ID)).to.be.undefined;
        expect(actor.system.attributes.movement.walk).to.equal(9);
      });

      it("Przeciążenie (50–100 kg) → efekt ×0.5 na Szybkości", async function () {
        const actor = await heavyActor(70);
        await slowdown.syncUdzwigSlowEffect(actor);
        const effect = actor.effects.get(slowdown.EFFECT_ID);
        expect(effect, "efekt utworzony").to.exist;
        expect(effect.getFlag(MODULE_ID, slowdown.EFFECT_FLAG)).to.equal("przeciazenie");
        expect(effect.system.changes[0]).to.include({
          key: "system.attributes.movement.walk",
          type: "multiply",
          value: 0.5
        });
        expect(actor.system.attributes.movement.walk).to.equal(4.5);
      });

      it("Unieruchomienie (powyżej 100 kg) → Szybkość nadpisana na 0, nie tylko zmniejszona", async function () {
        const actor = await heavyActor(130);
        await slowdown.syncUdzwigSlowEffect(actor);
        const effect = actor.effects.get(slowdown.EFFECT_ID);
        expect(effect.getFlag(MODULE_ID, slowdown.EFFECT_FLAG)).to.equal("nieruchomienie");
        expect(effect.system.changes[0]).to.include({
          key: "system.attributes.movement.walk",
          type: "override",
          value: 0
        });
        expect(actor.system.attributes.movement.walk).to.equal(0);
      });

      it("przejście Przeciążenie → Unieruchomienie AKTUALIZUJE istniejący efekt, nie dokłada drugiego", async function () {
        const actor = await heavyActor(70);
        await slowdown.syncUdzwigSlowEffect(actor);
        expect(actor.effects.get(slowdown.EFFECT_ID).getFlag(MODULE_ID, slowdown.EFFECT_FLAG))
          .to.equal("przeciazenie");

        await setCarriedWeight(actor, 130);
        await slowdown.syncUdzwigSlowEffect(actor);

        expect(actor.effects.size, "wciąż jeden efekt, nie dwa").to.equal(1);
        expect(actor.effects.get(slowdown.EFFECT_ID).getFlag(MODULE_ID, slowdown.EFFECT_FLAG))
          .to.equal("nieruchomienie");
        expect(actor.system.attributes.movement.walk).to.equal(0);
      });

      it("powrót do Normalnej USUWA efekt — Szybkość wraca do bazowej", async function () {
        const actor = await heavyActor(70);
        await slowdown.syncUdzwigSlowEffect(actor);
        expect(actor.effects.get(slowdown.EFFECT_ID)).to.exist;

        await setCarriedWeight(actor, 10);
        await slowdown.syncUdzwigSlowEffect(actor);

        expect(actor.effects.get(slowdown.EFFECT_ID)).to.be.undefined;
        expect(actor.system.attributes.movement.walk).to.equal(9);
      });
    });
  }, { displayName: "Neuroshima: Udźwig — strefy i progi RAW" });
}
