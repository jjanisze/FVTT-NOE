/**
 * Neuroshima 5e — bebeszenie i rozbiórka na prawdziwych dokumentach (PLAN_m5_postoj.md E10, warstwa 5).
 *
 * Kategoria trupa (Bestiariusz, etykieta typu), pula z tabeli (po wybuchu maszyny — tylko metal), rozliczenie przez
 * przekaźnik (MG od razu): sukces — cała pula do wykonawcy (surowce i mięso), porażka — 10% teraz, 40% zostaje na
 * kolejną próbę; naturalna 1 przy maszynie bez autodestrukcji — CE/CH/CZ przepadają, z autodestrukcją — karta k100.
 * Rozbiórka: połowa surowców przepisu, zepsucie z zacięcia, zatwierdzenie MG. Okno i HUD — e2e.
 */

import { MODULE_ID, scratchActor, scratchCleanup } from "./helpers.mjs";
import { kategoriaIstoty, stanTrupa, jestTrupem } from "../postoj/bebeszenie.mjs";
import { propozycjaRozbiorki, rozbierz, zepsuty } from "../postoj/rozbiorka.mjs";
import { doMG } from "../postoj/przekaznik.mjs";
import { gbOf } from "../actors/surowce-store.mjs";
import { stanAutodestrukcji } from "../combat/autodestrukcja.mjs";
import { utworzWynik } from "../production/wynik.mjs";

const trup = (dane = {}) => scratchActor(foundry.utils.mergeObject({
  name: "[Quench] trup", type: "npc", system: { attributes: { hp: { value: 0, max: 20 } }, traits: { size: "med" } }
}, dane, { inplace: false }));

export function registerBebeszenieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.bebeszenie`, context => {
    const { describe, it, expect, after, afterEach } = context;
    const wiadomosci = [];
    let hook = null;
    const lap = () => { hook = Hooks.on("createChatMessage", m => wiadomosci.push(m)); };
    afterEach(async () => {
      if (hook !== null) Hooks.off("createChatMessage", hook);
      hook = null;
      for (const m of wiadomosci.splice(0)) if (game.messages.get(m.id)) await m.delete();
    });
    after(() => scratchCleanup());

    describe("Trup i pula", function () {
      it("kategoria: Bestiariusz po id, inaczej etykieta typu z karty; trup — 0 PW albo `dead`", async function () {
        expect(kategoriaIstoty(await trup({ flags: { [MODULE_ID]: { bestiary: { id: "gladiator" } } } }))).to.equal("maszyna");
        expect(kategoriaIstoty(await trup({ system: { details: { type: { value: "Potwór" } } } }))).to.equal("potwor");
        expect(jestTrupem(await trup())).to.equal(true);
        expect(jestTrupem(await trup({ system: { attributes: { hp: { value: 5 } } } }))).to.equal(false);
      });

      it("pula z tabeli (s. 269); maszyna po wybuchu autodestrukcji — tylko metal", async function () {
        expect(stanTrupa(await trup()).pula).to.deep.equal({ MO: 20, mieso: 40 });
        const m = await trup({ flags: { [MODULE_ID]: { bestiary: { id: "gladiator" }, autodestrukcja: { stan: "wybuch" } } } });
        expect(stanTrupa(m).pula).to.deep.equal({ CH: 0, MK: 50, CE: 0, CZ: 0 });
      });
    });

    describe("Rozliczenie (MG)", function () {
      it("sukces: cała pula — surowce i mięso do wykonawcy, trup pusty", async function () {
        lap();
        const t = await trup();
        const wyk = await scratchActor();
        await doMG("bebeszenieWynik", { trup: t.uuid, wykonawca: wyk.uuid, tabela: "bestie", total: 14, st: 10, nat1: false, zakres: null, cel: "wykonawca", minuty: 60, pomocnicy: 0 });
        expect(gbOf(wyk, "MO")).to.equal(20);
        expect(wyk.items.find(i => i.flags?.[MODULE_ID]?.prowiantId === "mieso")?.system.quantity).to.equal(40);
        expect(Object.values(t.getFlag(MODULE_ID, "bebeszenie").pula).every(v => v === 0)).to.equal(true);
        expect(wiadomosci.some(m => /sukces/.test(m.content) && /bebeszenieCzas/.test(m.content))).to.equal(true);
      });

      it("porażka: 10% teraz, 40% zostaje; kolejna próba działa na reszcie (U17)", async function () {
        const t = await trup();
        const wyk = await scratchActor();
        await doMG("bebeszenieWynik", { trup: t.uuid, wykonawca: wyk.uuid, tabela: "bestie", total: 3, st: 10, nat1: false, zakres: null, cel: "wykonawca", minuty: 60, pomocnicy: 0 });
        expect(gbOf(wyk, "MO")).to.equal(2);
        expect(t.getFlag(MODULE_ID, "bebeszenie").pula).to.deep.equal({ MO: 8, mieso: 16 });
        await doMG("bebeszenieWynik", { trup: t.uuid, wykonawca: wyk.uuid, tabela: "bestie", total: 12, st: 10, nat1: false, zakres: "MO", cel: "wykonawca", minuty: 30, pomocnicy: 0 });
        expect(gbOf(wyk, "MO"), "2 + reszta 8").to.equal(10);
        expect(t.getFlag(MODULE_ID, "bebeszenie").pula).to.deep.equal({ MO: 0, mieso: 16 });
        expect(t.getFlag(MODULE_ID, "bebeszenie").proby.length).to.equal(2);
      });

      it("naturalna 1 przy maszynie: bez autodestrukcji — CE/CH/CZ przepadają; z nią — karta k100 (U19)", async function () {
        lap();
        const bez = await trup({ name: "[Quench] złom", system: { details: { type: { value: "maszyna" } } } });
        const wyk = await scratchActor();
        await doMG("bebeszenieWynik", { trup: bez.uuid, wykonawca: wyk.uuid, tabela: "maszyny", total: 1, st: 15, nat1: true, zakres: null, cel: "wykonawca", minuty: 480, pomocnicy: 0 });
        const p = bez.getFlag(MODULE_ID, "bebeszenie").pula;
        expect([p.CE, p.CH, p.CZ]).to.deep.equal([0, 0, 0]);
        expect(p.MK, "metal: 40% po porażce").to.equal(20);
        const g = await trup({ name: "[Quench] gladiator", flags: { [MODULE_ID]: { bestiary: { id: "gladiator" } } } });
        await doMG("bebeszenieWynik", { trup: g.uuid, wykonawca: wyk.uuid, tabela: "maszyny", total: 1, st: 15, nat1: true, zakres: null, cel: "wykonawca", minuty: 480, pomocnicy: 0 });
        expect(stanAutodestrukcji(g)?.stan).to.equal("czeka");
        expect(wiadomosci.some(m => m.whisper.length && /autodestrukcjaK100/.test(m.content))).to.equal(true);
      });
    });

    describe("Rozbiórka (D22, U52)", function () {
      it("połowa surowców przepisu w dół; zepsucie z zacięcia; MG rozbiera — surowce do właściciela, przedmiot znika", async function () {
        lap();
        const a = await scratchActor();
        const [bat] = await utworzWynik(a, { ref: "weapon:bat", ilosc: 1 });
        const p = await propozycjaRozbiorki(bat);
        expect(p.surowce, "Bat: 6 MO, 1 MK → 3 MO").to.deep.equal({ MO: 3 });
        expect(p.narzedzia).to.equal("krawca");
        expect(zepsuty(bat)).to.equal(false);
        await rozbierz(bat);
        expect(gbOf(a, "MO")).to.equal(3);
        expect(a.items.get(bat.id)).to.equal(undefined);
        expect(wiadomosci.some(m => /Rozbiórka: Bat/.test(m.content))).to.equal(true);
      });
    });
  });
}
