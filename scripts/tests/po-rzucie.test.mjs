/**
 * Neuroshima 5e — rejestr „po rzucie” (PLAN_m7 E0, §3.0.2).
 *
 * Warstwa 1: bramki źródła (rodzaj rzutu, raz na rzut, wynik przerzutu do zaakceptowania, po porażce / sukcesie,
 * naturalna 1), łańcuch, przejście wyniku. Warstwa 4: rzut z dodatkiem (ta sama k20 i klasa, kości ukryte dla Dice
 * So Nice), łańcuch na prawdziwych kartach (zastąpiona karta, `przed` w haku), konsumenci RO właściwości broni i
 * Obalającej cofają skutek, Fuks i Forsowanie w rejestrze.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup } from "./helpers.mjs";
import {
  TESTY_K20, TESTY_CECHY, LANCUCH_ZERO, wynikTestu, poUzyciu, bramkiZrodla, stanPrzycisku, przejscie
} from "../config/po-rzucie-rules.mjs";
import {
  zarejestrujZrodloPoRzucie, wyrejestrujZrodloPoRzucie, uzyjZrodla, zastapionaPrzez, kontekstRzutu, rzutZDodatkiem,
  FLAG_PO_RZUCIE, poRzucieApi
} from "../combat/po-rzucie.mjs";

export function registerPoRzucieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.po-rzucie`, context => {
    const { describe, it, expect, after } = context;
    const start = Date.now();

    after(async () => {
      wyrejestrujZrodloPoRzucie("quench-plus5");
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Bramki źródła (warstwa 1)", function () {
      const fuks = { id: "fuks", typy: TESTY_K20, przerzut: true, wynik: "porazka" };
      const amen = { id: "amen", typy: ["attack", "save", ...TESTY_CECHY], wynik: "porazka" };
      const spieprzysz = { id: "spieprzysz", typy: ["attack", "save"], przerzut: true, wynik: "sukces" };
      const fart = { id: "fart", typy: TESTY_K20, przerzut: true, wynik: "naturalna1" };

      it("Testy k20 (s. 17): ataki, RO, testy cech; RPŚ nie (s. 34)", function () {
        expect(TESTY_K20).to.include.members(["skill", "ability", "tool", "attack", "save"]);
        expect(TESTY_K20).to.not.include("death");
        expect(bramkiZrodla(fuks, { typ: "death" }).stan).to.equal("ukryty");
      });

      it("Przerzut tylko po porażce, gdy próg znany; bez progu zostaje (U4)", function () {
        expect(bramkiZrodla(fuks, { typ: "save", wynik: "porazka" }).stan).to.equal("aktywny");
        expect(bramkiZrodla(fuks, { typ: "save", wynik: "sukces" }).stan).to.equal("ukryty");
        expect(bramkiZrodla(fuks, { typ: "skill", wynik: null }).stan).to.equal("aktywny");
        expect(bramkiZrodla(spieprzysz, { typ: "attack", wynik: "porazka" }).stan).to.equal("ukryty");
        expect(bramkiZrodla(spieprzysz, { typ: "attack", wynik: "sukces" }).stan).to.equal("aktywny");
        expect(bramkiZrodla(fart, { typ: "save", naturalna: 2 }).stan).to.equal("ukryty");
        expect(bramkiZrodla(fart, { typ: "save", naturalna: 1 }).stan).to.equal("aktywny");
      });

      it("raz na rzut; po przerzucie wynik zaakceptowany — przerzuty znikają, dodatki zostają (U2)", function () {
        const poFuksie = poUzyciu(LANCUCH_ZERO, "fuks", { przerzut: true });
        expect(poFuksie).to.deep.equal({ uzyte: ["fuks"], przerzut: true });
        expect(bramkiZrodla(fuks, { typ: "save", lancuch: poFuksie }).stan).to.equal("ukryty");
        expect(bramkiZrodla(fart, { typ: "save", naturalna: 1, lancuch: poFuksie }).stan).to.equal("ukryty");
        expect(bramkiZrodla(amen, { typ: "save", lancuch: poFuksie }).stan, "dodatek po przerzucie").to.equal("aktywny");
        const poAmen = poUzyciu(LANCUCH_ZERO, "amen");
        expect(poAmen.przerzut).to.equal(false);
        expect(bramkiZrodla(amen, { typ: "save", lancuch: poAmen }).stan, "Amen raz na rzut").to.equal("ukryty");
        expect(bramkiZrodla(fuks, { typ: "save", lancuch: poAmen }).stan, "przerzut po dodatku wolno").to.equal("aktywny");
      });

      it("ocena źródła: szary z powodem; ukryty; aktywny z etykietą", function () {
        expect(stanPrzycisku(fuks, { typ: "save" }, { stan: "szary", powod: "Brak Fuksów" }))
          .to.deep.equal({ stan: "szary", powod: "Brak Fuksów" });
        expect(stanPrzycisku(fuks, { typ: "save" }, { stan: "ukryty" }).stan).to.equal("ukryty");
        expect(stanPrzycisku(fuks, { typ: "save" }, null).stan).to.equal("aktywny");
        expect(stanPrzycisku(fuks, { typ: "save", wynik: "sukces" }, { stan: "aktywny" }).stan, "bramka przed oceną").to.equal("ukryty");
      });

      it("wynik i przejście: próg nieznany — brak przejścia", function () {
        expect(wynikTestu(15, 15)).to.equal("sukces");
        expect(wynikTestu(14, 15)).to.equal("porazka");
        expect(wynikTestu(14, null)).to.equal(null);
        expect(wynikTestu(14, "")).to.equal(null);
        expect(przejscie(12, 16, 15)).to.equal("naSukces");
        expect(przejscie(16, 12, 15)).to.equal("naPorazke");
        expect(przejscie(16, 18, 15)).to.equal(null);
        expect(przejscie(12, 18, null)).to.equal(null);
      });
    });

    describe("Łańcuch na kartach (warstwa 4)", function () {
      it("rzut z dodatkiem: ta sama k20, ta sama klasa i opcje, suma; kości pierwotne ukryte dla Dice So Nice", async function () {
        const r = await new CONFIG.Dice.D20Roll("1d20 + 3", {}, { target: 15 }).evaluate();
        const n = await rzutZDodatkiem(r, "1d4");
        expect(n).to.be.instanceOf(CONFIG.Dice.D20Roll);
        expect(n.dice[0].results[0].result).to.equal(r.dice[0].results[0].result);
        expect(n.dice[0].results[0].hidden).to.equal(true);
        expect(n.dice[1].faces).to.equal(4);
        expect(n.total).to.equal(r.total + n.dice[1].total);
        expect(n.options.target).to.equal(15);
        expect(n.formula).to.include("1d4");
        const s = await rzutZDodatkiem(r, "5");
        expect(s.total).to.equal(r.total + 5);
      });

      it("źródło testowe +5: nowa karta łańcucha, stara zastąpiona, hak z `przed` i rzutem pierwotnym", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Łańcuch` });
        zarejestrujZrodloPoRzucie({
          id: "quench-plus5", label: "Quench +5", typy: TESTY_K20, kolejnosc: 999,
          ocen: () => ({ stan: "aktywny" }),
          wykonaj: async ctx => ({ roll: await rzutZDodatkiem(ctx.roll, "5"), flavor: "Quench +5" })
        });
        const [roll] = await pc.rollSavingThrow({ ability: "con", target: 30 }, { configure: false }, { create: true });
        const src = game.messages.contents.at(-1);
        expect(src.rolls[0].total).to.equal(roll.total);
        const ctx = kontekstRzutu(src);
        expect(ctx.typ).to.equal("save");
        expect(ctx.wynik).to.equal(roll.total >= 30 ? "sukces" : "porazka");

        let hak = null;
        const id = Hooks.on("neuroshima.rollModified", p => { hak = p; });
        let nowa;
        try { nowa = await uzyjZrodla("quench-plus5", src); } finally { Hooks.off("neuroshima.rollModified", id); }
        expect(nowa, "nowa karta").to.be.ok;
        const f = nowa.getFlag(MODULE_ID, FLAG_PO_RZUCIE);
        expect(f).to.include({ rootId: src.id, poprzednieId: src.id, zrodlo: "quench-plus5", przerzut: false, przed: roll.total });
        expect(f.uzyte).to.deep.equal(["quench-plus5"]);
        expect(nowa.rolls[0].total).to.equal(roll.total + 5);
        expect(zastapionaPrzez(src)?.id).to.equal(nowa.id);
        expect(hak?.message?.id, "hak dostaje rzut pierwotny").to.equal(src.id);
        expect(hak.przed).to.equal(roll.total);
        expect(hak.roll.total).to.equal(roll.total + 5);
        expect(kontekstRzutu(nowa).info.type, "rodzaj rzutu żyje na karcie łańcucha").to.equal("save");

        // Raz na rzut — drugi raz na nowej karcie ukryty; stara karta odmawia.
        expect(await uzyjZrodla("quench-plus5", src), "zastąpiona karta").to.equal(null);
        expect(await uzyjZrodla("quench-plus5", nowa), "raz na rzut").to.equal(null);
      });

      it("Fuks i Forsowanie siedzą w rejestrze (Forsowanie przed Fuksem, jak dawniej w pasku)", function () {
        const z = poRzucieApi.zrodla();
        expect(z).to.include.members(["forsowanie", "fuks"]);
        expect(z.indexOf("forsowanie")).to.be.below(z.indexOf("fuks"));
      });
    });

    describe("Konsumenci RO z kart (warstwa 4)", function () {
      it("Obalająca: oblany → zdany po rzucie zdejmuje Powalenie; zdany → oblany nakłada", async function () {
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} Obalany` });
        await cel.toggleStatusEffect("prone", { active: true });
        const message = await ChatMessage.implementation.create({
          content: "RO", flags: { [MODULE_ID]: { obalajacaRO: { st: 14 } } }
        });
        Hooks.callAll("neuroshima.rollModified", { message, roll: { total: 15 }, przed: 10, actor: cel, kind: "test" });
        await new Promise(r => setTimeout(r, 300));
        expect(cel.statuses.has("prone")).to.equal(false);
        Hooks.callAll("neuroshima.rollModified", { message, roll: { total: 9 }, przed: 15, actor: cel, kind: "test" });
        await new Promise(r => setTimeout(r, 300));
        expect(cel.statuses.has("prone")).to.equal(true);
        Hooks.callAll("neuroshima.rollModified", { message, roll: { total: 12 }, przed: 9, actor: cel, kind: "test" });
        await new Promise(r => setTimeout(r, 300));
        expect(cel.statuses.has("prone"), "porażka → porażka: bez zmiany").to.equal(true);
      });

      it("właściwość broni (Porażająca): przejście na sukces cofa Powalenie", async function () {
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} Porażony` });
        await cel.toggleStatusEffect("prone", { active: true });
        const message = await ChatMessage.implementation.create({
          content: "RO", flags: { [MODULE_ID]: { skutekRO: { wlasciwosc: "porazajaca", st: 10, attackerUuid: null } } }
        });
        Hooks.callAll("neuroshima.rollModified", { message, roll: { total: 11 }, przed: 7, actor: cel, kind: "test" });
        await new Promise(r => setTimeout(r, 400));
        expect(cel.statuses.has("prone")).to.equal(false);
      });
    });
  });
}
