/**
 * Neuroshima 5e — Przeciwpancerna (`ppanc`) i Przebijająca: odporności i progi (NOE s. 117–118).
 *
 * Aktorzy tylko w pamięci — `calculateDamage` niczego nie zapisuje, więc paczka nie zostawia śladu
 * w świecie. Pilnuje, że:
 *   • obie właściwości przebijają, z broni i z amunicji (`damages[].properties`, `weapons/ammo.mjs`),
 *   • próg pancerza BG (`actors/armor-rules.mjs`) i odporność (`system.traits.dr`) ustępują,
 *   • zwykły nabój dalej się na nich zatrzymuje.
 */

import { ARMOUR_PIERCING_PROPS, isArmourPiercing } from "../combat/armour-piercing.mjs";
import { MODULE_ID, SCRATCH_PREFIX } from "./helpers.mjs";

/** BN w pamięci; BN nie mają lalki, więc `equipped` zostaje takie, jakie podamy. */
function memoryNpc({ dt = 0, resist = [] } = {}) {
  const items = dt ? [{
    name: `${SCRATCH_PREFIX} pancerz`, type: "equipment",
    system: { type: { value: "heavy" }, equipped: true, armor: { value: 15 } },
    flags: { [MODULE_ID]: { armorDT: dt } }
  }] : [];
  return new Actor.implementation({
    name: `${SCRATCH_PREFIX} cel`, type: "npc",
    system: { traits: { dr: { value: resist } }, attributes: { hp: { value: 50, max: 50 } } },
    items
  });
}

const hit = (value, props = []) => [{ value, type: "piercing", properties: new Set(props) }];

export function registerPrzebicieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.przebicie`, context => {
    const { describe, it, expect } = context;

    describe("Rozpoznanie", function () {
      it("obie właściwości RAW, z obrażeń (amunicja); zwykły nabój — nie", function () {
        expect(ARMOUR_PIERCING_PROPS).to.have.members(["ppanc", "przebijajaca"]);
        expect(isArmourPiercing(hit(5, ["ppanc"]))).to.equal(true);
        expect(isArmourPiercing(hit(5, ["przebijajaca"]))).to.equal(true);
        expect(isArmourPiercing(hit(5, ["hollowpoint"]))).to.equal(false);
        expect(isArmourPiercing([{ value: 5, type: "piercing" }])).to.equal(false);
        expect(isArmourPiercing(null)).to.equal(false);
      });
    });

    describe("Próg obrażeń pancerza BG", function () {
      it("zwykły nabój poniżej progu — zero", function () {
        const out = memoryNpc({ dt: 5 }).calculateDamage(hit(3));
        expect(out.amount).to.equal(0);
      });

      it("ppanc i przebijająca przechodzą przez próg", function () {
        for (const prop of ARMOUR_PIERCING_PROPS) {
          const out = memoryNpc({ dt: 5 }).calculateDamage(hit(3, [prop]));
          expect(out.amount, prop).to.equal(3);
        }
      });
    });

    describe("Odporność na obrażenia", function () {
      it("zwykły nabój — połowa", function () {
        expect(memoryNpc({ resist: ["piercing"] }).calculateDamage(hit(10)).amount).to.equal(5);
      });

      it("ppanc i przebijająca ignorują odporność", function () {
        for (const prop of ARMOUR_PIERCING_PROPS) {
          expect(memoryNpc({ resist: ["piercing"] }).calculateDamage(hit(10, [prop])).amount, prop).to.equal(10);
        }
      });

      it("niewrażliwość zostaje — RAW mówi o odpornościach", function () {
        const npc = new Actor.implementation({
          name: `${SCRATCH_PREFIX} cel`, type: "npc", system: { traits: { di: { value: ["piercing"] } } }
        });
        expect(npc.calculateDamage(hit(10, ["ppanc"])).amount).to.equal(0);
      });
    });
  });
}
