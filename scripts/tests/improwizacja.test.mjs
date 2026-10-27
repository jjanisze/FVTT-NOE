/**
 * Neuroshima 5e — broń improwizowana (PLAN_m6_drobne_zasady.md §5.2, §5.2.1, E3).
 *
 * Warstwa 1: liczby bliźniaka (`config/improwizacja-rules.mjs`) — RAW 1k4 i 3/9 m, chwyt od 2 kg (U3), typ obrażeń
 * (U5), tabela Łyżeczki, maks. waga = SIŁ, połowy; Kobalt (`wkk/config/lyzeczka-kobalt.mjs`) — rzut 6/18, przerzut
 * jedynek, właściwość z rodzaju. Warstwa 4: lalka — rodzina `wRece`, przedmiot podręczny w ręce, `equipped` nietknięty.
 * Warstwa 2: dane bliźniaka na aktorze testowym (biegłość Łyżeczki, „działa jak…”), ukrycie w karcie.
 */

import {
  improwizacjaZ, wierszLyzeczki, typyObrazen, polowaWagi, jestBlizniakiem, LYZECZKA_ZASIEG, IMPROWIZOWANA
} from "../config/improwizacja-rules.mjs";
import {
  LYZECZKA_ZASIEG_KOBALT, koscLyzeczkiKobalt, wlasciwoscDozwolona, WLASCIWOSCI_LYZECZKI
} from "../wkk/config/lyzeczka-kobalt.mjs";
import { classifyItem, governsEquipped, accepts, resolve } from "../actors/doll-model.mjs";
import { daneBlizniaka, doReki, AKTYWNOSC_ATAKU } from "../actors/improwizacja.mjs";
import { MODULE_ID, scratchActor, scratchCleanup } from "./helpers.mjs";

export function registerImprowizacjaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.improwizacja`, context => {
    const { describe, it, after, expect } = context;

    describe("Liczby bliźniaka (s. 253, U3, U5)", function () {
      it("RAW: 1k4, rzut 3/9 m, obuchowe", function () {
        const r = improwizacjaZ({ waga: 1 });
        expect(r.kosc).to.deep.equal({ number: 1, faces: 4 });
        expect(r.zasieg).to.deep.equal({ value: 3, long: 9 });
        expect(r.typy[0]).to.equal("bludgeoning");
      });
      it("chwyt: poniżej 2 kg jednoręczna, od 2 kg oburęczna (U3, MG)", function () {
        expect(improwizacjaZ({ waga: 1.9 }).chwyt).to.equal(1);
        expect(improwizacjaZ({ waga: 2 }).chwyt).to.equal(2);
        expect(improwizacjaZ({ waga: 0 }).chwyt).to.equal(1);
      });
      it("typ obrażeń przedmiotu na pierwszym miejscu, reszta do wyboru (U5)", function () {
        expect(typyObrazen("slashing")).to.deep.equal(["slashing", "bludgeoning", "piercing"]);
        expect(typyObrazen()).to.deep.equal(["bludgeoning", "slashing", "piercing"]);
        expect(typyObrazen("fire"), "spoza listy — obuchowe").to.deep.equal(["bludgeoning", "slashing", "piercing"]);
      });
      it("ponad SIŁ kg — oznaczone, nie zablokowane", function () {
        expect(improwizacjaZ({ waga: 13 }, { sila: 12 }).ponadSile).to.equal(true);
        expect(improwizacjaZ({ waga: 12 }, { sila: 12 }).ponadSile).to.equal(false);
        expect(improwizacjaZ({ waga: 13 }).ponadSile, "bez SIŁ — nie wiadomo").to.equal(false);
      });
    });

    describe("Łyżeczka (s. 70) i Kobalt (§5.2.1)", function () {
      it("tabela wagi: 1k6/1 ręka do 5 kg, 2k6, 3k6, 4k6 oburęcznie", function () {
        const k = w => improwizacjaZ({ waga: w }, { lyzeczka: true });
        expect([k(5).kosc, k(5).chwyt]).to.deep.equal([{ number: 1, faces: 6 }, 1]);
        expect([k(5.5).kosc, k(5.5).chwyt]).to.deep.equal([{ number: 2, faces: 6 }, 2]);
        expect(k(11).kosc.number).to.equal(2);
        expect(k(12).kosc.number).to.equal(3);
        expect(k(18).kosc.number).to.equal(4);
        expect(wierszLyzeczki(40), "ponad tabelę — ostatni wiersz").to.equal(3);
      });
      it("rzut: RAW 6 m bez dalekiego, Kobalt 6/18 m", function () {
        expect(improwizacjaZ({ waga: 1 }, { lyzeczka: true }).zasieg).to.deep.equal(LYZECZKA_ZASIEG);
        expect(improwizacjaZ({ waga: 1 }, { lyzeczka: true, zasiegLyzeczki: LYZECZKA_ZASIEG_KOBALT }).zasieg)
          .to.deep.equal({ value: 6, long: 18 });
      });
      it("naturalna 1: dwie równe części", function () {
        expect(polowaWagi(5)).to.equal(2.5);
        expect(polowaWagi(0.1)).to.equal(0.05);
      });
      it("Kobalt: przerzut jedynek raz (r1), właściwość tylko z listy wagi", function () {
        expect(koscLyzeczkiKobalt({ number: 3, faces: 6 })).to.equal("3d6r1");
        expect(wlasciwoscDozwolona(0, "lgt")).to.equal(true);
        expect(wlasciwoscDozwolona(2, "lgt"), "12–17 kg nie bywa Lekka").to.equal(false);
        expect(wlasciwoscDozwolona(3, "burzaca")).to.equal(true);
        for (const lista of WLASCIWOSCI_LYZECZKI) for (const k of lista) {
          expect(CONFIG.DND5E.itemProperties, k).to.have.property(k);
        }
      });
    });

    describe("Lalka: przedmiot do ręki (warstwa 4)", function () {
      const loot = { id: "a", type: "loot", name: "Łom", system: { weight: { value: 3 } }, flags: {} };
      it("rodzina `wRece` tylko z predykatu warstwy Foundry (nic nie jest zgadywane)", function () {
        expect(classifyItem(loot)).to.equal(null);
        expect(classifyItem(loot, { wRece: () => true })).to.equal("wRece");
        expect(classifyItem({ ...loot, flags: { [MODULE_ID]: { dollSlot: "none" } } }, { wRece: () => true })).to.equal(null);
      });
      it("„przedmiot w ręce” i pas nie rządzą `equipped`; pas przyjmuje rękę", function () {
        expect(governsEquipped("wRece")).to.equal(false);
        expect(governsEquipped("belt")).to.equal(false);
        expect(governsEquipped("meleeWeapon")).to.equal(true);
        expect(accepts("belt", "hand")).to.equal(true);
        expect(accepts("wRece", "hand")).to.equal(true);
        expect(accepts("wRece", "belt")).to.equal(false);
      });
      it("medpak z pasa do ręki: ruch belt → hand", function () {
        const items = [{ id: "m", family: "belt", quantity: 1, slots: ["belt.0"] }];
        const r = resolve(items, { itemId: "m", to: "hand" });
        expect(r.refusal).to.equal(null);
        expect(r.moves).to.deep.equal([{ itemId: "m", from: "belt.0", to: "hand.0" }]);
      });
      it("predykat `doReki`: przedmioty fizyczne, bez surowców i bliźniaków", function () {
        expect(doReki({ type: "loot", system: {}, flags: {} })).to.equal(true);
        expect(doReki({ type: "feat", system: {}, flags: {} })).to.equal(false);
        expect(doReki({ type: "consumable", name: "Metal (MK)", system: {}, flags: { [MODULE_ID]: { surowiec: "MK" } } })).to.equal(false);
        expect(doReki({ type: "weapon", system: {}, flags: { [MODULE_ID]: { improwizacja: { zrodlo: "x" } } } })).to.equal(false);
        expect(doReki({ type: "loot", system: { container: "abc" }, flags: {} }), "w pojemniku").to.equal(false);
      });
    });

    describe("Bliźniak na aktorze (warstwa 2)", function () {
      after(scratchCleanup);

      it("1k4 obuchowe z wyborem typu, rzut, ukryty w lalce; bez Łyżeczki — biegłość natywna", async function () {
        const actor = await scratchActor({ type: "character", system: { abilities: { str: { value: 12 } } } });
        const [lom] = await actor.createEmbeddedDocuments("Item", [{ name: "Łom", type: "loot", system: { weight: { value: 3 } } }]);
        const d = daneBlizniaka(actor, lom, "hand.0");
        expect(d.type).to.equal("weapon");
        expect(d.system.type.value).to.equal("improwizowana");
        expect(d.system.damage.base).to.deep.include({ number: 1, denomination: 4 });
        expect(d.system.damage.base.types).to.deep.equal(["bludgeoning", "slashing", "piercing"]);
        expect(d.system.properties).to.include("thr").and.include("two");
        expect(d.system.range).to.deep.include({ value: 3, long: 9 });
        expect(d.system.weight.value).to.equal(0);
        expect(d.system.proficient).to.equal(null);
        expect(d.flags[MODULE_ID].dollSlot).to.equal("none");
        expect(d.system.activities[AKTYWNOSC_ATAKU].type).to.equal("attack");
        expect(jestBlizniakiem(d)).to.equal(true);
      });

      it("Łyżeczka: tabela wagi i biegłość; „działa jak…” — kategoria i kość wzorca", async function () {
        const actor = await scratchActor({ type: "character", system: { abilities: { str: { value: 16 } } } });
        const lyzeczka = (await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`).getDocuments()).find(i => i.getFlag(MODULE_ID, "abilityId") === "lyzeczka");
        await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(lyzeczka)]);
        const [felga] = await actor.createEmbeddedDocuments("Item", [{ name: "Felga", type: "loot", system: { weight: { value: 8 } } }]);
        const d = daneBlizniaka(actor, felga, "hand.1");
        expect(d.system.damage.base).to.deep.include({ number: 2, denomination: 6 });
        expect(d.system.proficient).to.equal(1);
        await felga.setFlag(MODULE_ID, "improwizacjaZrodlo", { jak: "bejsbol-rurka" });
        const j = daneBlizniaka(actor, actor.items.get(felga.id), "hand.1");
        expect(j.system.type.value).to.equal("biala");
        expect(j.name).to.match(/jak /);
      });

      it("karta postaci nie pokazuje bliźniaka (`dnd5e.filterItem`)", async function () {
        const actor = await scratchActor({ type: "character" });
        const [twin] = await actor.createEmbeddedDocuments("Item", [{
          name: "Test (improwizowana)", type: "weapon",
          system: { type: { value: "improwizowana" } }, flags: { [MODULE_ID]: { improwizacja: { zrodlo: "x", reka: "hand.0" } } }
        }]);
        expect(Hooks.call("dnd5e.filterItem", actor.sheet, twin, new Set())).to.equal(false);
      });
    });
  });
}
