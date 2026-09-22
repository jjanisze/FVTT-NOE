/**
 * Neuroshima 5e — Active Effect `changes`: kształt wpisu i kolejność stosowania.
 *
 * Trzy rzeczy, które nie miały pokrycia, a każda z nich potrafiła zepsuć się po cichu:
 *
 * 1. **Kolejność modyfikatorów Szybkości** to decyzja o zasadach, nie detal techniczny
 *    — kara płaska ze Zranienia ma wejść PRZED połowieniem z Przeciążenia/Upojenia.
 *    Bez jawnych priorytetów Foundry sortuje remisy w kolejności dokumentów, której
 *    `createEmbeddedDocuments` nie gwarantuje, więc ten sam stół dawał różne wyniki.
 *    Patrz `config/effect-changes.mjs` §2.
 *
 * 2. **Zbieżność resynców.** `syncLevelledConditions`/`syncDiseaseEffects` miały pisać
 *    tylko przy realnej różnicy, ale porównywały świeżo zbudowane dane ze stanem
 *    odczytanym z bazy, który nigdy nie wygląda tak samo — więc przepisywały każdy swój
 *    efekt przy każdym wywołaniu. Test pilnuje, że drugi przebieg nie pisze już nic.
 *
 * 3. **Żaden wpis nie wraca do liczbowego `mode`.** Statyczny przegląd danych modułu,
 *    żeby nowa mechanika nie wniosła z powrotem kształtu usuwanego w FVTT 16.
 */

import { CHANGE_TYPE, CHANGE_PRIORITY, change, normalizeChanges } from "../config/effect-changes.mjs";
import { DISEASE_EFFECTS } from "../config/disease-effects.mjs";
import { UPOJENIE_LEVELS, SKAZENIE_LEVELS } from "../config/levelled-conditions-data.mjs";
import { syncLevelledConditions } from "../actors/levelled-conditions.mjs";
import { __testing as slowdown } from "../actors/udzwig-slowdown.mjs";
import { setZranienie } from "../combat/zranienie.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, setCarriedWeight } from "./helpers.mjs";

/** Każda tablica `changes` w danych modułu, spłaszczona do jednej listy. */
function allDataChanges() {
  const out = [];
  for (const stages of Object.values(DISEASE_EFFECTS)) {
    for (const spec of Object.values(stages)) {
      out.push(...(spec.changes ?? []), ...(spec.conditional?.changes ?? []));
    }
  }
  for (const row of [...UPOJENIE_LEVELS, ...SKAZENIE_LEVELS]) out.push(...(row.changes ?? []));
  return out;
}

export function registerEffectChangesTests(quench) {
  quench.registerBatch(`${MODULE_ID}.efekty-zmiany`, context => {
    const { describe, it, after, expect } = context;

    after(async function () {
      await scratchCleanup();
    });

    describe("kształt wpisu (dane modułu)", function () {
      it("żaden wpis nie używa już liczbowego `mode`", function () {
        const stale = allDataChanges().filter(c => "mode" in c);
        expect(stale.map(c => c.key)).to.deep.equal([]);
      });

      it("każdy wpis ma stringowy `type` i jawny `priority`", function () {
        for (const c of allDataChanges()) {
          expect(c.type, `type dla ${c.key}`).to.be.a("string");
          expect(c.priority, `priority dla ${c.key}`).to.be.a("number");
        }
      });

      it("`change()` odmawia nieznanego typu zamiast po cichu wstawić `add`", function () {
        expect(() => change("system.foo", "addd", 1)).to.throw(/addd/);
      });

      it("kary płaskie mają niższy priorytet niż połowienie", function () {
        expect(CHANGE_PRIORITY.add).to.be.below(CHANGE_PRIORITY.multiply);
        expect(CHANGE_PRIORITY.multiply).to.be.below(CHANGE_PRIORITY.override);
      });
    });

    describe("normalizeChanges", function () {
      it("zrównuje zapis z bazy ze świeżo zbudowanym (phase, liczba vs string)", function () {
        const fresh = [change("system.attributes.movement.walk", CHANGE_TYPE.multiply, 0.5)];
        const stored = [{
          key: "system.attributes.movement.walk", type: "multiply",
          value: "0.5", priority: CHANGE_PRIORITY.multiply, phase: "initial"
        }];
        expect(normalizeChanges(stored)).to.equal(normalizeChanges(fresh));
      });

      it("nadal widzi realną różnicę wartości", function () {
        const a = [change("system.attributes.ac.bonus", CHANGE_TYPE.add, 1)];
        const b = [change("system.attributes.ac.bonus", CHANGE_TYPE.add, 2)];
        expect(normalizeChanges(a)).to.not.equal(normalizeChanges(b));
      });
    });

    describe("kolejność na Szybkości (żywy aktor)", function () {
      async function walker(kg) {
        const actor = await scratchActor({
          system: { abilities: { str: { value: 10 } }, attributes: { movement: { walk: 9 } } }
        });
        await setCarriedWeight(actor, kg);
        return actor;
      }

      it("Zranienie + Przeciążenie → (9 − 4,5) × ½ = 2,25 m, nie 0", async function () {
        const actor = await walker(70);
        await slowdown.syncUdzwigSlowEffect(actor);
        await setZranienie(actor, 1);
        expect(actor.system.attributes.movement.walk).to.equal(2.25);
      });

      it("Unieruchomienie wygrywa ze wszystkim — Szybkość 0", async function () {
        const actor = await walker(130);
        await slowdown.syncUdzwigSlowEffect(actor);
        await setZranienie(actor, 1);
        expect(actor.system.attributes.movement.walk).to.equal(0);
      });
    });

    describe("zbieżność resynców", function () {
      it("drugi `syncLevelledConditions` nie przepisuje efektu", async function () {
        const actor = await scratchActor();
        // Flaga wprost, nie `setTrackLevel` — ta pisze na czat i odpala Sequencera.
        await actor.update({ [`flags.${MODULE_ID}.upojenie`]: 3 });
        await syncLevelledConditions(actor);

        const effect = actor.effects.find(e => e.getFlag(MODULE_ID, "levelledCondition")?.id === "upojenie");
        expect(effect, "efekt Upojenia istnieje").to.exist;
        const before = effect._stats.modifiedTime;

        await syncLevelledConditions(actor);
        expect(actor.effects.get(effect.id)._stats.modifiedTime).to.equal(before);
      });
    });
  });
}
