/**
 * Neuroshima 5e — dogrywka M7 (PLAN_beta §0 krok 8a, 2026-11-02).
 *
 * Czyste: ułamek dawki i lista pacjentów leku, zasięg rzutu ×2 (Miotacz, Siekierezada), Ukryty cel wobec Unikania
 * i osłony, Ciszej niż cień (kto się ukrywa), plakietki parasoli. Na dokumentach (aktorzy testowi): Próg obrażeń
 * Pancernego, Skradanie w pancerzu z Treningiem w zbroi, efekty z paczek (Pierwotny instynkt, Padnij/Powstań,
 * Człowiek-aligator, Człowiek-pająk), Pan Plaster przy „Weź dawkę” i podanie leku innej postaci (wykonanie u MG).
 * Okno pacjenta i odpowiedź przez gniazdo — e2e.
 */

import { pozostaleDawki, krokDawki, fmtDawki, slowoDawki, pacjenciLeku, dawkaNaRaz, POL_DAWKI_FLAG } from "../config/dawki-rules.mjs";
import { rozstrzygnijOkolicznosci, zasiegNormalny, zasiegDaleki, jestRzucana, RZUT_ZASIEG } from "../config/okolicznosci-ataku.mjs";
import { ktoSieUkrywa } from "../config/ulatwienia-testow.mjs";
import { coverAcBonus } from "../combat/cover.mjs";
import { armorDamageThreshold, PANCERNY_DT } from "../actors/armor-rules.mjs";
import { featureStatus } from "../config/class-features-coverage.mjs";
import { sztuczkaStatus } from "../config/sztuczki-data.mjs";
import { addDisease, getChoroby, takeDose, dosesRemaining, dosedToday } from "../actors/health-panel.mjs";
import { wykonajPodanie } from "../actors/podaj-dawke.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, sztuczkaItem } from "./helpers.mjs";

const U = (stany = []) => ({ stany: new Set(stany), szybkosc0: false, nazwa: null });
const m = o => ({
  atakujacy: U(), cel: U(), liczbaCelow: 1, wrecz: false, odleglosc: 10, zasieg: { normalny: 6, daleki: 18 },
  wrogowieObok: [], celPochwytuje: null, turaCelu: false, bron: null, zewnetrzne: [], ...o
});
const ids = l => l.map(w => w.id);

async function packDoc(pack, pred) {
  return (await game.packs.get(`${MODULE_ID}.${pack}`)?.getDocuments() ?? []).find(pred) ?? null;
}

/** Pancerz z paczki założony przez lalkę („Załóż”) — samo utworzenie kładzie go do plecaka. */
async function zaloz(actor, doc) {
  const [item] = await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(doc)]);
  await game.neuroshima.lalka.place(actor, item, "auto", { quiet: true });
  return actor.items.get(item.id);
}

export function registerDogrywkaM7Tests(quench) {
  quench.registerBatch(`${MODULE_ID}.dogrywka-m7`, context => {
    const { describe, it, after, expect } = context;
    after(scratchCleanup);

    describe("Ułamek dawki (Pan Plaster, D18)", function () {
      it("zostaje całe dawki minus napoczęta połowa", function () {
        expect(pozostaleDawki({ quantity: 3, max: 1, spent: 0 })).to.equal(3);
        expect(pozostaleDawki({ quantity: 3, max: 1, spent: 0, polowa: true })).to.equal(2.5);
        expect(pozostaleDawki({ quantity: 1, max: 10, spent: 4, polowa: true })).to.equal(5.5);
        expect(pozostaleDawki({ quantity: 2, polowa: true })).to.equal(1.5); // stary łup bez użyć: ilość = dawki
        expect(pozostaleDawki({ quantity: 0, max: 1, spent: 1, polowa: true })).to.equal(0);
      });

      it("pół z nienapoczętej — bez zużycia; pół z napoczętej — jedno użycie; całość — użycie, połówka czeka", function () {
        expect(krokDawki(true, false)).to.deep.equal({ zuzyjUzycie: false, flaga: true });
        expect(krokDawki(true, true)).to.deep.equal({ zuzyjUzycie: true, flaga: false });
        expect(krokDawki(false, true)).to.deep.equal({ zuzyjUzycie: true, flaga: true });
        expect(krokDawki(false, false)).to.deep.equal({ zuzyjUzycie: true, flaga: false });
        expect([dawkaNaRaz(true), dawkaNaRaz(false)]).to.deep.equal([0.5, 1]);
      });

      it("po polsku: 2,5 dawki, 1 dawka, 3 dawki, 5 dawek", function () {
        expect(`${fmtDawki(2.5)} ${slowoDawki(2.5)}`).to.equal("2,5 dawki");
        expect([1, 3, 5, 12, 22].map(slowoDawki)).to.deep.equal(["dawka", "dawki", "dawek", "dawek", "dawki"]);
        expect(fmtDawki(3)).to.equal("3");
      });

      it("pacjenci leku: tylko choroby, które lek leczy; dawca sam bierze z panelu chorób", function () {
        const kandydaci = [
          { id: "iris", nazwa: "Iris", choroby: [{ id: "a", key: "niewydolnoscKrazenia", name: "N", dzis: false }] },
          { id: "carson", nazwa: "Carson", choroby: [{ id: "b", key: "niewydolnoscKrazenia", name: "N", dzis: true },
            { id: "c", key: "osteoporoza", name: "O", dzis: false }] }
        ];
        const lista = pacjenciLeku(kandydaci, ["niewydolnoscKrazenia"], "iris");
        expect(lista).to.deep.equal([{ aktorId: "carson", nazwa: "Carson", wpisId: "b", choroba: "N", dzis: true }]);
      });
    });

    describe("Silnik okoliczności: rzut ×2, Ukryty cel", function () {
      it("broń rzucana: rzut bronią białą albo miotana z `thr`; łuk i kusza — nie", function () {
        expect(jestRzucana({ rzut: true, typ: "biala", wlasciwosci: [] })).to.equal(true);
        expect(jestRzucana({ rzut: false, typ: "miotana", wlasciwosci: ["thr", "fin"] })).to.equal(true);
        expect(jestRzucana({ rzut: false, typ: "miotana", wlasciwosci: ["amm"] })).to.equal(false);
        expect(jestRzucana({ rzut: false, typ: "biala", wlasciwosci: ["thr"] })).to.equal(false); // wręcz, nie rzut
      });

      it("rzutX2: zasięgi ×2 — 8 m bez Utrudnienia, 30 m w zasięgu dalekim", function () {
        const bron = { wlasciwosci: ["thr"], typ: "biala", rzut: true, rzutX2: true };
        expect(RZUT_ZASIEG).to.equal(2);
        expect([zasiegNormalny(m({ bron })), zasiegDaleki(m({ bron }))]).to.deep.equal([12, 36]);
        expect(ids(rozstrzygnijOkolicznosci(m({ odleglosc: 8, bron })).utrudnienia)).to.not.include("zasiegDaleki");
        expect(ids(rozstrzygnijOkolicznosci(m({ odleglosc: 8, bron: { ...bron, rzutX2: false } })).utrudnienia)).to.include("zasiegDaleki");
        expect(ids(rozstrzygnijOkolicznosci(m({ odleglosc: 30, bron })).uwagi)).to.not.include("pozaZasiegiem");
        expect(ids(rozstrzygnijOkolicznosci(m({ odleglosc: 30, bron: { ...bron, rzutX2: false } })).uwagi)).to.include("pozaZasiegiem");
      });

      it("Ukryty cel: bez Utrudnienia z Unikania celu", function () {
        const cel = U(["dodging"]);
        expect(ids(rozstrzygnijOkolicznosci(m({ cel, bron: { wlasciwosci: [] } })).utrudnienia)).to.include("celUnika");
        expect(ids(rozstrzygnijOkolicznosci(m({ cel, bron: { wlasciwosci: [], ukrytyCel: true } })).utrudnienia)).to.not.include("celUnika");
      });

      it("Ukryty cel: osłona ½ i ¾ bez premii do TT, pełna i przebijanie bez zmian", function () {
        expect(coverAcBonus({ selection: "half" })).to.equal(2);
        expect(coverAcBonus({ selection: "half", ukrytyCel: true })).to.equal(0);
        expect(coverAcBonus({ selection: "threeQuarters", ukrytyCel: true })).to.equal(0);
        expect(coverAcBonus({ selection: "full", ukrytyCel: true })).to.equal(999);
        expect(coverAcBonus({ selection: "through", ukrytyCel: true })).to.equal(0);
      });
    });

    describe("Ciszej niż cień", function () {
      const z = (o = {}) => ({ actorId: "k", nazwa: "Kluczyk", ciszejNizCien: true, stany: ["hiding"], ...o });
      it("podpowiedź tylko, gdy postać z tą Sztuczką się ukrywa albo jest niewidoczna — i to nie szukający", function () {
        expect(ktoSieUkrywa([z()], "ghul")).to.equal("Kluczyk");
        expect(ktoSieUkrywa([z({ stany: ["invisible"] })], "ghul")).to.equal("Kluczyk");
        expect(ktoSieUkrywa([z({ stany: [] })], "ghul")).to.equal(null);
        expect(ktoSieUkrywa([z({ ciszejNizCien: false })], "ghul")).to.equal(null);
        expect(ktoSieUkrywa([z()], "k")).to.equal(null);
      });
    });

    describe("Plakietki", function () {
      it("parasole: Wyjadacz pełny (wybór i warianty), Mój wróg częściowy jak jego opcje", function () {
        expect(featureStatus("wyjadacz")).to.equal("auto");
        expect(featureStatus("wyjadacz-zwiadowca")).to.equal("auto");
        expect(featureStatus("moj-wrog")).to.equal("partial");
        expect(featureStatus("trening-w-zbroi")).to.equal("auto");
      });
      it("Sztuczki dogrywki", function () {
        for (const k of ["miotacz", "ukrytyCel", "pancerny", "pierwotnyInstynkt", "siekierezada", "panPlaster"]) {
          expect(sztuczkaStatus(k), k).to.equal("auto");
        }
        expect(sztuczkaStatus("padnijPowstan")).to.equal("partial");
        expect(sztuczkaStatus("ciszejNizCien")).to.equal("partial");
      });
    });

    describe("Na dokumentach", function () {
      it("Pancerny: +10 do Progu obrażeń tylko w ciężkim pancerzu", async function () {
        const ciezki = await packDoc("pancerze", d => d.system.type?.value === "heavy");
        const sredni = await packDoc("pancerze", d => d.system.type?.value === "medium");
        if (!ciezki || !sredni) this.skip();
        const a = await scratchActor({ system: { abilities: { str: { value: 18 } } } });
        const zbroja = await zaloz(a, ciezki);
        expect(zbroja.system.equipped, "założony").to.equal(true);
        const bez = armorDamageThreshold(a);
        await a.createEmbeddedDocuments("Item", [sztuczkaItem("pancerny", "Pancerny")]);
        expect(armorDamageThreshold(a)).to.equal(bez + PANCERNY_DT);
        await zbroja.delete();
        await zaloz(a, sredni);
        expect(armorDamageThreshold(a)).to.equal(sredni.getFlag(MODULE_ID, "armorDT") ?? 0);
      });

      it("Trening w zbroi: pancerz bez Utrudnienia do Skradania się", async function () {
        const pancerz = await packDoc("pancerze", d => d.system.properties?.has?.("stealthDisadvantage") && d.system.type?.value === "light");
        if (!pancerz) this.skip();
        const a = await scratchActor({ system: { abilities: { str: { value: 15 } } } });
        expect((await zaloz(a, pancerz)).system.equipped, "założony").to.equal(true);
        expect(a.system.skills.skr.roll.mode, "bez zdolności").to.equal(-1);
        await a.createEmbeddedDocuments("Item", [{ name: "Trening w zbroi", type: "feat", flags: { [MODULE_ID]: { abilityId: "trening-w-zbroi" } } }]);
        expect(a.system.skills.skr.roll.mode, "z Treningiem w zbroi").to.not.equal(-1);
      });

      it("efekty z paczek: Pierwotny instynkt, Padnij/Powstań, Człowiek-pająk, Człowiek-aligator", async function () {
        const sz = key => packDoc("sztuczki", d => d.getFlag(MODULE_ID, "sztuczka") === key);
        const [pi, pp, cp] = await Promise.all([sz("pierwotnyInstynkt"), sz("padnijPowstan"), sz("czlowiekPajak")]);
        const al = await packDoc("zdolnosci-pochodzenia", d => d.getFlag(MODULE_ID, "originAbilityId") === "czlowiek-aligator");
        if (![pi, pp, cp, al].every(d => d?.effects?.size)) this.skip(); // paczki sprzed przebudowy
        const a = await scratchActor();
        const init = a.system.attributes.init.total;
        const pasywna = a.system.skills.prc.passive;
        await a.createEmbeddedDocuments("Item", [pi, pp, cp, al].map(d => game.items.fromCompendium(d)));
        const s = a.system.attributes.movement.speeds;
        expect(a.system.attributes.init.total - init, "Inicjatywa").to.equal(5);
        expect(a.system.skills.prc.passive - pasywna, "bierna Percepcja").to.equal(5);
        expect([s.walk, s.climb, s.swim]).to.deep.equal([12, 12, 12]);
      });

      it("Pan Plaster: „Weź dawkę” — pół dawki, druga połowa zużywa opakowanie", async function () {
        const lek = await packDoc("lekarstwa", d => d.getFlag(MODULE_ID, "chemiaKey") === "aspirynaK");
        if (!lek) this.skip();
        const a = await scratchActor();
        await addDisease(a, "niewydolnoscKrazenia");
        const [item] = await a.createEmbeddedDocuments("Item", [{ ...game.items.fromCompendium(lek), system: { ...lek.toObject().system, quantity: 2 } }]);
        await a.createEmbeddedDocuments("Item", [sztuczkaItem("panPlaster", "Pan Plaster")]);
        const wpis = getChoroby(a)[0];
        await takeDose(a, wpis.id);
        expect(dosesRemaining(a.items.get(item.id))).to.equal(1.5);
        expect(a.items.get(item.id).getFlag(MODULE_ID, POL_DAWKI_FLAG)).to.equal(true);
        expect(dosedToday(getChoroby(a)[0])).to.equal(true);
        await takeDose(a, wpis.id);
        expect(dosesRemaining(a.items.get(item.id))).to.equal(1);
        expect(a.items.get(item.id).getFlag(MODULE_ID, POL_DAWKI_FLAG) ?? false).to.equal(false);
      });

      it("podanie leku (u MG): dawca z Panem Plastrem — pół dawki; bez — cała; pacjent ma dzisiejszą dawkę", async function () {
        const lek = await packDoc("lekarstwa", d => d.getFlag(MODULE_ID, "chemiaKey") === "aspirynaK");
        if (!lek) this.skip();
        const dawca = await scratchActor({ name: "[Quench] dawca" });
        const [item] = await dawca.createEmbeddedDocuments("Item", [{ ...game.items.fromCompendium(lek), system: { ...lek.toObject().system, quantity: 2 } }]);
        const p1 = await scratchActor({ name: "[Quench] pacjent 1" });
        const p2 = await scratchActor({ name: "[Quench] pacjent 2" });
        await addDisease(p1, "niewydolnoscKrazenia");
        await addDisease(p2, "niewydolnoscKrazenia");
        const dane = p => ({ dawcaUuid: dawca.uuid, itemId: item.id, pacjentUuid: p.uuid, wpisId: getChoroby(p)[0].id, od: game.user.id });

        expect(await wykonajPodanie(null, dane(p1), game.user)).to.equal(true);
        expect(dosesRemaining(dawca.items.get(item.id)), "bez Pana Plastra — cała").to.equal(1);
        expect(dosedToday(getChoroby(p1)[0])).to.equal(true);
        expect(await wykonajPodanie(null, dane(p1), game.user), "drugi raz tego dnia").to.equal(false);

        await dawca.createEmbeddedDocuments("Item", [sztuczkaItem("panPlaster", "Pan Plaster")]);
        expect(await wykonajPodanie(null, dane(p2), game.user)).to.equal(true);
        expect(dosesRemaining(dawca.items.get(item.id)), "Pan Plaster — pół").to.equal(0.5);
        expect(dosedToday(getChoroby(p2)[0])).to.equal(true);
      });
    });
  });
}
