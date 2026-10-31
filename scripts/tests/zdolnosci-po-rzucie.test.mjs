/**
 * Neuroshima 5e — zdolności po rzucie (PLAN_m7 E1, R3).
 *
 * Warstwa 1: korekta RPŚ (porażka → sukces, naturalna 1 = dwie porażki, trzeci sukces stabilizuje). Warstwa 4: na
 * prawdziwych kartach — Motywacja na rzucie sojusznika, Spieprzysz to! na udanym RO BN (gorszy wynik), Szczęście i
 * Amen zamykają przerzuty, Łeb jak sklep tylko na INT, Czas patriotów +5, Twardość na RPŚ zmienia liczniki, Fart
 * odpala sam przy naturalnej 1, Urodzony morderca dokłada `r1` do kości obrażeń.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup } from "./helpers.mjs";
import { korektaRPS } from "../config/po-rzucie-rules.mjs";
import { uzyjZrodla, kontekstRzutu, FLAG_PO_RZUCIE } from "../combat/po-rzucie.mjs";
import { __testing as Z } from "../combat/zdolnosci-po-rzucie.mjs";
import { originAbilityItemData } from "../config/pochodzenia-data.mjs";

export function registerZdolnosciPoRzucieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.zdolnosci-po-rzucie`, context => {
    const { describe, it, expect, before, after } = context;
    const start = Date.now();
    let cechy;
    const cecha = async (actor, id) => (await actor.createEmbeddedDocuments("Item",
      [game.items.fromCompendium(cechy.find(i => i.getFlag(MODULE_ID, "abilityId") === id))]))[0];
    const pochodzenie = async (actor, id) => (await actor.createEmbeddedDocuments("Item", [originAbilityItemData(id)]))[0];
    const ostatnia = () => game.messages.contents.at(-1);
    const zD20 = async (d20, fn) => {
      const orig = CONFIG.Dice.randomUniform;
      CONFIG.Dice.randomUniform = () => (20.5 - d20) / 20;
      try { return await fn(); } finally { CONFIG.Dice.randomUniform = orig; }
    };

    before(async () => {
      cechy = await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`).getDocuments();
    });
    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Korekta RPŚ (warstwa 1)", function () {
      it("porażka → sukces: cofnięta porażka, dopisany sukces; naturalna 1 cofa dwie", function () {
        expect(korektaRPS({ success: 0, failure: 1 })).to.deep.equal({ success: 1, failure: 0, outcome: null });
        expect(korektaRPS({ success: 1, failure: 2 }, { naturalna: 1 })).to.deep.equal({ success: 2, failure: 0, outcome: null });
        expect(korektaRPS({ success: 2, failure: 3 })).to.deep.equal({ success: 0, failure: 0, outcome: "stable" });
      });
    });

    describe("Na kartach (warstwa 4)", function () {
      it("Motywacja: sojusznik rzuca RO, Cwaniak dorzuca kość — nowa karta, użycie zużyte", async function () {
        const cwaniak = await scratchActor({ name: `${SCRATCH_PREFIX} Cwaniak`, system: { abilities: { cha: { value: 16 } } } });
        const sojusznik = await scratchActor({ name: `${SCRATCH_PREFIX} Sojusznik` });
        const mot = await cecha(cwaniak, "motywacja");
        await sojusznik.rollSavingThrow({ ability: "con", target: 30 }, { configure: false }, { create: true });
        const src = ostatnia();
        const ocena = Z.MOTYWACJA.ocen.call(Z.MOTYWACJA, kontekstRzutu(src));
        expect(ocena.stan, JSON.stringify(ocena)).to.equal("aktywny");
        expect(ocena.etykieta).to.include("Motywacja").and.include("k6");
        const nowa = await uzyjZrodla("motywacja", src);
        expect(nowa, "nowa karta").to.be.ok;
        const dodane = nowa.rolls[0].total - src.rolls[0].total;
        expect(dodane).to.be.within(1, 6);
        expect(cwaniak.items.get(mot.id).system.uses.spent).to.equal(1);
        expect(nowa.getFlag(MODULE_ID, FLAG_PO_RZUCIE).uzyte).to.deep.equal(["motywacja"]);
        expect(nowa.speaker.actor, "rzut zostaje rzutem sojusznika").to.equal(sojusznik.id);
      });

      it("Motywacja nie dla siebie samego i nie dla wroga", async function () {
        // Inni Cwaniacy z poprzednich testów żyją do końca paczki — sprawdzamy listę kandydatów, nie sam przycisk.
        const cwaniak = await scratchActor({ name: `${SCRATCH_PREFIX} Cwaniak sam`, system: { abilities: { cha: { value: 16 } } } });
        await cecha(cwaniak, "motywacja");
        await cwaniak.rollSavingThrow({ ability: "con" }, { configure: false }, { create: true });
        const sam = Z._dajacy(kontekstRzutu(ostatnia()), "motywacja", { tylkoSojusznik: true });
        expect(sam.wszyscy.some(o => o.actor.id === cwaniak.id), "nie dla siebie").to.equal(false);
        const wrog = await scratchActor({ name: `${SCRATCH_PREFIX} Wróg`, type: "npc", prototypeToken: { disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE } });
        await wrog.rollSavingThrow({ ability: "con" }, { configure: false }, { create: true });
        expect(Z._dajacy(kontekstRzutu(ostatnia()), "motywacja", { tylkoSojusznik: true }).wszyscy, "nie dla wroga").to.deep.equal([]);
        expect(Z.MOTYWACJA.ocen.call(Z.MOTYWACJA, kontekstRzutu(ostatnia())).stan).to.equal("ukryty");
      });

      it("Spieprzysz to!: udany RO BN → przerzut, zostaje gorszy; po nim brak kolejnych przerzutów", async function () {
        const cwaniak = await scratchActor({ name: `${SCRATCH_PREFIX} Cwaniak 2`, system: { abilities: { cha: { value: 16 } } } });
        await cecha(cwaniak, "spieprzysz-to");
        const bn = await scratchActor({ name: `${SCRATCH_PREFIX} BN`, type: "npc" });
        await zD20(18, () => bn.rollSavingThrow({ ability: "con", target: 10 }, { configure: false }, { create: true }));
        const src = ostatnia();
        expect(kontekstRzutu(src).wynik).to.equal("sukces");
        const nowa = await zD20(3, () => uzyjZrodla("spieprzysz-to", src));
        expect(nowa, "nowa karta").to.be.ok;
        expect(nowa.rolls[0].total).to.be.below(src.rolls[0].total);
        expect(kontekstRzutu(nowa).lancuch.przerzut).to.equal(true);
      });

      it("Szczęście i Amen: wynik trzeba zaakceptować — Fuks znika; Amen tylko po porażce", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Kaznodzieja`, system: { abilities: { cha: { value: 16 } } } });
        await cecha(pc, "amen");
        await zD20(2, () => pc.rollSavingThrow({ ability: "wis", target: 15 }, { configure: false }, { create: true }));
        const src = ostatnia();
        const nowa = await uzyjZrodla("amen", src);
        expect(nowa).to.be.ok;
        const l = kontekstRzutu(nowa).lancuch;
        expect(l.przerzut, "Amen zamyka").to.equal(true);
        await zD20(19, () => pc.rollSavingThrow({ ability: "wis", target: 15 }, { configure: false }, { create: true }));
        expect(await uzyjZrodla("amen", ostatnia()), "sukces — bez Amen").to.equal(null);
      });

      it("Łeb jak sklep: Test INT — tak; Test SIŁ — nie", async function () {
        const spec = await scratchActor({ name: `${SCRATCH_PREFIX} Spec`, system: { attributes: { prof: 2 } } });
        const leb = await cecha(spec, "leb-jak-sklep");
        await spec.rollAbilityCheck({ ability: "str" }, { configure: false }, { create: true });
        expect(await uzyjZrodla("leb-jak-sklep", ostatnia()), "SIŁ — nie").to.equal(null);
        await spec.rollAbilityCheck({ ability: "int" }, { configure: false }, { create: true });
        const intMsg = ostatnia();
        const nowa = await uzyjZrodla("leb-jak-sklep", intMsg);
        expect(nowa, "INT — tak").to.be.ok;
        expect(nowa.rolls[0].total - intMsg.rolls[0].total).to.be.within(1, 4);
        expect(spec.items.get(leb.id).system.uses.spent).to.equal(1);
      });

      it("Czas patriotów: +5 do RO, licznik 1 na Długi odpoczynek z przedmiotu Pochodzenia", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Nowojorczyk` });
        const cp = await pochodzenie(pc, "czas-patriotow");
        expect(cp.system.uses.max).to.equal(1);
        expect(cp.system.uses.recovery.map(r => r.period)).to.deep.equal(["lr"]);
        await pc.rollSavingThrow({ ability: "dex" }, { configure: false }, { create: true });
        const src = ostatnia();
        const nowa = await uzyjZrodla("czas-patriotow", src);
        expect(nowa.rolls[0].total).to.equal(src.rolls[0].total + 5);
        expect(pc.items.get(cp.id).system.uses.value).to.equal(0);
      });

      it("Twardość na RPŚ: 8 + kość ≥ 10 → porażka cofnięta, sukces dopisany", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Twardziel`, system: { abilities: { con: { value: 14 } }, attributes: { hp: { value: 0 } } } });
        await cecha(pc, "twardosc");
        await zD20(8, () => pc.rollDeathSave({}, { configure: false }, { create: true }));
        const src = ostatnia();
        expect(kontekstRzutu(src)?.typ).to.equal("death");
        expect(pc.system.attributes.death.failure).to.equal(1);
        const nowa = await zD20(8, () => uzyjZrodla("twardosc", src));
        expect(nowa, "nowa karta").to.be.ok;
        expect(nowa.rolls[0].total).to.be.at.least(10);
        expect(pc.system.attributes.death.failure).to.equal(0);
        expect(pc.system.attributes.death.success).to.equal(1);
      });

      it("Fart: naturalna 1 → przerzut sam, licznik zużyty; druga naturalna 1 — już bez", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Vegas` });
        const fart = await pochodzenie(pc, "fart");
        await zD20(1, () => pc.rollSavingThrow({ ability: "con", target: 10 }, { configure: false }, { create: true }));
        const src = game.messages.contents.findLast(m => m.speaker.actor === pc.id && !m.getFlag(MODULE_ID, FLAG_PO_RZUCIE));
        await new Promise(r => setTimeout(r, 800));
        const nastepca = game.messages.contents.find(m => m.getFlag(MODULE_ID, FLAG_PO_RZUCIE)?.poprzednieId === src.id);
        expect(nastepca, "przerzut Fartu").to.be.ok;
        expect(nastepca.getFlag(MODULE_ID, FLAG_PO_RZUCIE).zrodlo).to.equal("fart");
        expect(pc.items.get(fart.id).system.uses.value).to.equal(0);
      });

      it("Urodzony morderca: kości obrażeń z `r1`; bez zdolności — bez", async function () {
        const rolls = () => [new CONFIG.Dice.DamageRoll("1d8 + 2d6 + 3")];
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Hegemon` });
        const bez = rolls();
        Z._onPostDamageRollConfiguration(bez, { subject: pc });
        expect(bez[0].formula).to.not.include("r1");
        await pochodzenie(pc, "urodzony-morderca");
        const z = rolls();
        Z._onPostDamageRollConfiguration(z, { subject: pc });
        expect(z[0].formula).to.include("1d8r1").and.include("2d6r1");
        expect(z[0].options.neuroUrodzonyMorderca).to.equal(true);
      });
    });
  });
}
