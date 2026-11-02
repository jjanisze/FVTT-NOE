/**
 * Neuroshima 5e — dogrywka M7 (PLAN_beta §0 krok 8a, 2026-11-02).
 *
 * Czyste: ułamek dawki i lista pacjentów leku, zasięg rzutu ×2 (Miotacz, Siekierezada), Ukryty cel wobec Unikania
 * i osłony, Ciszej niż cień (kto się ukrywa), plakietki parasoli. Na dokumentach (aktorzy testowi): Próg obrażeń
 * Pancernego, Skradanie w pancerzu z Treningiem w zbroi, efekty z paczek (Pierwotny instynkt, Padnij/Powstań,
 * Człowiek-aligator, Człowiek-pająk), Pan Plaster przy „Weź dawkę” i podanie leku innej postaci (wykonanie u MG).
 * Okno pacjenta i odpowiedź przez gniazdo — e2e.
 *
 * Krok 8b — siedem Sztuczek z atakami i przyciskami: czyste zasady, aktywności z paczki (Karateka, Barbarka), zapowiedź
 * ataku (Nożownik, Celowanie), Zajebista gadka i jej zdjęcie po rzucie, Powalenie z Wyjaśnić ci? (u MG), Stalowe palce.
 *
 * Krok 8c — dogrywka Sztuczek: czyste zasady, plakietki, Immunitet (zarażenie, skażenie), Grenadier, Pewny strzał,
 * Wrestler (trzymany, Rzut na matę), Ławnik (bliźniak 3k4), Fechmistrz (kość, zajęcie odpoczynku RAW i WKK).
 * Młynek, Przygniecenie i krok Patrioty potrzebują sceny albo okna awansu — e2e i Poligon.
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
import { NOZE, LUKI_I_KUSZE, mozeObalic, stWyjasnicCi, oblalGadke, zapowiedzPasuje, grigorij } from "../config/sztuczki-ataki.mjs";
import { zapowiedz, zapowiedziDla, __testing as sa } from "../combat/sztuczki-ataki.mjs";
import { __testing as mag } from "../weapons/magazine.mjs";
import { szturmDziala, najwyzejDuzy, stZSily, jestCiezki, fechmistrzPostep, FECHMISTRZ_WKK_H } from "../config/sztuczki-walka.mjs";
import { __testing as sw } from "../combat/sztuczki-walka.mjs";
import { nowaChoroba } from "../actors/health-panel.mjs";
import { __testing as gi } from "../actors/grenade-inventory.mjs";
import { trzymaPochwyconego, rzutNaMate } from "../combat/melee-maneuvers.mjs";
import { daneBlizniaka } from "../actors/improwizacja.mjs";
import { premieObrazen } from "../combat/zdolnosci-walka.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, sztuczkaItem, stub } from "./helpers.mjs";

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

    describe("8b — Sztuczki z atakami i przyciskami", function () {
      it("czyste: noże (D19), łuki i kusze, rozmiar do obalenia, ST, sporny test, zapowiedź, Grigorij", function () {
        expect(NOZE).to.have.members(["noz-taktyczny", "kamienny-noz", "noz-do-rzucania", "sztylet"]);
        expect(LUKI_I_KUSZE).to.include.members(["luk-bloczkowy", "kusza-bloczkowa"]);
        expect([mozeObalic("med", "med"), mozeObalic("med", "sm"), mozeObalic("med", "lg"), mozeObalic("lg", "lg")]).to.deep.equal([true, true, false, true]);
        expect(stWyjasnicCi({ pb: 2, sila: 3 })).to.equal(13);
        expect([oblalGadke(10, 15), oblalGadke(15, 15), oblalGadke(16, 15)]).to.deep.equal([true, false, false]);
        expect(zapowiedzPasuje({ cel: "A", bronie: ["sztylet"] }, { celUuid: "A", bronId: "sztylet" })).to.equal(true);
        expect(zapowiedzPasuje({ cel: "A", bronie: ["sztylet"] }, { celUuid: "B", bronId: "sztylet" })).to.equal(false);
        expect(zapowiedzPasuje({ cel: "A", bronie: ["sztylet"] }, { celUuid: "A", bronId: "katana" })).to.equal(false);
        expect(zapowiedzPasuje({ cel: "A" }, { celUuid: "A", bronId: null })).to.equal(true);
        expect([grigorij(3), grigorij(-1)]).to.deep.equal([3, 0]);
      });

      it("Karateka: dwa ataki bez broni 1k6, SIŁ albo ZRC (wyższa), Szybki cios w Akcji Bonusowej", async function () {
        const sz = await packDoc("sztuczki", d => d.getFlag(MODULE_ID, "sztuczka") === "karateka");
        if (!sz?.system.activities?.size) this.skip();
        const a = await scratchActor({ system: { abilities: { str: { value: 10 }, dex: { value: 16 } } } });
        const [it] = await a.createEmbeddedDocuments("Item", [game.items.fromCompendium(sz)]);
        const ataki = it.system.activities.filter(x => x.type === "attack");
        expect(ataki.map(x => x.activation.type).sort()).to.deep.equal(["action", "bonus"]);
        for (const x of ataki) {
          expect([...x.attack.abilities].sort(), x.name).to.deep.equal(["dex", "str"]);
          expect(x.ability, "wyższa").to.equal("dex");
          expect(x.attack.type.classification).to.equal("unarmed");
          expect(x.damage.parts[0].denomination).to.equal(6);
        }
      });

      it("Barbarka: atak głową 1k4 z SIŁ; Z baśki w Akcji Bonusowej z automatycznym TK", async function () {
        const sz = await packDoc("sztuczki", d => d.getFlag(MODULE_ID, "sztuczka") === "barbarka");
        if (!sz?.system.activities?.size) this.skip();
        const ataki = sz.system.activities.contents;
        const zBaski = ataki.find(x => x.activation.type === "bonus");
        expect(ataki.every(x => x.getFlag?.(MODULE_ID, "atakGlowa") ?? x.flags?.[MODULE_ID]?.atakGlowa)).to.equal(true);
        expect(zBaski.flags[MODULE_ID].autoKrytyk).to.include("Z baśki");
        expect(ataki.every(x => x.damage.parts[0].denomination === 4)).to.equal(true);
      });

      it("zapowiedź ataku: ten cel i ta broń; inny cel albo broń — nic", async function () {
        const a = await scratchActor();
        const noz = await packDoc("bron", d => d.getFlag(MODULE_ID, "weaponId") === "sztylet");
        const katana = await packDoc("bron", d => d.getFlag(MODULE_ID, "weaponId") === "katana");
        if (!noz || !katana) this.skip();
        // Kolejność wyniku `createEmbeddedDocuments` nie jest stała — po id broni, nie po pozycji.
        const made = await a.createEmbeddedDocuments("Item", [game.items.fromCompendium(noz), game.items.fromCompendium(katana)]);
        const n = made.find(i => i.getFlag(MODULE_ID, "weaponId") === "sztylet");
        const k = made.find(i => i.getFlag(MODULE_ID, "weaponId") === "katana");
        await zapowiedz(a, { cel: "Scene.x.Token.cel", bronie: ["sztylet"], autoKrytyk: "Nożownik", zrodlo: "nozownik", tura: true });
        expect(zapowiedziDla(a, n, "Scene.x.Token.cel").map(w => w.autoKrytyk)).to.deep.equal(["Nożownik"]);
        expect(zapowiedziDla(a, k, "Scene.x.Token.cel")).to.deep.equal([]);
        expect(zapowiedziDla(a, n, "Scene.x.Token.inny")).to.deep.equal([]);
      });

      it("Zajebista gadka: niższa Intuicja — efekt, raz na kartę; pierwszy rzut go zdejmuje", async function () {
        this.timeout(10000);
        const m = await scratchActor({ name: "[Quench] słuchacz" });
        await sa.intuicja(m, 1000, "karta-1", { configure: false });
        expect(m.effects.some(e => e.getFlag(MODULE_ID, "zajebistaGadka")), "oblał — efekt").to.equal(true);
        await sa.intuicja(m, 1000, "karta-1", { configure: false });
        expect(m.effects.filter(e => e.getFlag(MODULE_ID, "zajebistaGadka")).length, "drugi raz — nic").to.equal(1);
        await m.rollAbilityCheck({ ability: "str" }, { configure: false }, { create: false });
        const end = Date.now() + 3000;
        while (m.effects.some(e => e.getFlag(MODULE_ID, "zajebistaGadka")) && Date.now() < end) await new Promise(r => setTimeout(r, 50));
        expect(m.effects.some(e => e.getFlag(MODULE_ID, "zajebistaGadka")), "zdjęty po rzucie").to.equal(false);
      });

      it("Wyjaśnić ci? (u MG): oblany RO na Siłę — Powalenie", async function () {
        const cel = await scratchActor({ name: "[Quench] cel", system: { abilities: { str: { value: 1 } } } });
        const wynik = await sa.powalenie(null, { celUuid: cel.uuid, st: 40, kto: "Barbarka" });
        expect(wynik).to.equal(true);
        expect(cel.statuses.has("prone")).to.equal(true);
      });

      it("Robin Hood, Stalowe palce: kusza z ładowaniem gotowa po strzale; bez Sztuczki — nie", async function () {
        const kusza = await packDoc("bron", d => d.getFlag(MODULE_ID, "weaponId") === "kusza-bloczkowa");
        if (!kusza) this.skip();
        const a = await scratchActor();
        const [k] = await a.createEmbeddedDocuments("Item", [game.items.fromCompendium(kusza)]);
        expect(mag.ignoresManualReloadMode(k, "ladowanie")).to.equal(false);
        await a.createEmbeddedDocuments("Item", [sztuczkaItem("robinHood", "Robin Hood")]);
        expect(mag.ignoresManualReloadMode(a.items.get(k.id), "ladowanie")).to.equal(true);
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

    describe("8c — dogrywka Sztuczek", function () {
      this.timeout(15000);

      it("czyste: zasięg Szturmowca, rozmiar, ST z SIŁ, ciężki przedmiot, trening Fechmistrza (RAW i WKK)", function () {
        expect([szturmDziala({}), szturmDziala({ odleglosc: 20, normalny: 20 }), szturmDziala({ odleglosc: 21, normalny: 20 })])
          .to.deep.equal([true, true, false]);
        expect([najwyzejDuzy("lg"), najwyzejDuzy("huge"), najwyzejDuzy(undefined)]).to.deep.equal([true, false, true]);
        expect(stZSily({ pb: 2, sila: 4 })).to.equal(14);
        expect([jestCiezki(10), jestCiezki(9.9)]).to.deep.equal([true, false]);
        expect(fechmistrzPostep({ godziny: 0 }).gotowe, "RAW — ten odpoczynek").to.equal(true);
        expect(fechmistrzPostep({ dotychczas: 20, godziny: 10, kobalt: true })).to.deep.equal({ gotowe: true, godziny: FECHMISTRZ_WKK_H });
        expect(fechmistrzPostep({ dotychczas: 10, godziny: 5, kobalt: true })).to.deep.equal({ gotowe: false, godziny: 15 });
      });

      it("plakietki po 8c: pełne i częściowe", function () {
        for (const k of ["szturmowiec", "lawnik", "rozroba", "patriota", "mistrzBroniBialej"]) expect(sztuczkaStatus(k), k).to.equal("auto");
        for (const k of ["immunitet", "grenadier", "pewnaReka", "wrestler"]) expect(sztuczkaStatus(k), k).to.equal("partial");
      });

      it("Immunitet: zarażenie nie wchodzi, choroba popromienna wchodzi (ostrzeżenie MG); bez Sztuczki — wchodzi", async function () {
        const a = await scratchActor();
        await a.createEmbeddedDocuments("Item", [sztuczkaItem("immunitet", "Immunitet")]);
        expect(await nowaChoroba(a, "zakazna", {}, { zrodlo: "zarazenie" })).to.equal(null);
        expect(getChoroby(a)).to.be.empty;
        await nowaChoroba(a, "popromienna", {}, { zrodlo: "skazenie" });
        expect(getChoroby(a).map(c => c.key)).to.deep.equal(["popromienna"]);
        const b = await scratchActor({ name: "[Quench] bez Immunitetu" });
        await nowaChoroba(b, "zakazna", {}, { zrodlo: "zarazenie" });
        expect(getChoroby(b).map(c => c.key)).to.deep.equal(["zakazna"]);
      });

      it("Grenadier: zasięg rzutu granatem ×2; mina bez zmian", async function () {
        const a = await scratchActor({ system: { abilities: { str: { value: 14 } } } });
        const bez = gi.computeThrowRange(a).max;
        await a.createEmbeddedDocuments("Item", [sztuczkaItem("grenadier", "Grenadier")]);
        expect(gi.computeThrowRange(a).max).to.equal(bez * 2);
        expect(gi.computeThrowRange(a, { rzut: false }).max).to.equal(bez);
      });

      it("Pewny strzał: Szybkość 0 do początku tury, Ułatwienie jeszcze nie zużyte", async function () {
        const a = await scratchActor({ system: { attributes: { movement: { walk: 9 } } } });
        await sw.pewnyStrzal(a, null);
        const e = a.effects.find(x => x.getFlag(MODULE_ID, "pewnyStrzal"));
        expect(e?.getFlag(MODULE_ID, "pewnyStrzal")).to.deep.equal({ uzyty: false });
        expect(Number(a.system.attributes.movement.speeds?.walk ?? a.system.attributes.movement.walk) || 0).to.equal(0);
      });

      it("Wrestler: kogo trzymasz; Rzut na matę wobec trzymanej istoty dużej albo mniejszej", async function () {
        const a = await scratchActor();
        const cel = await scratchActor({ name: "[Quench] trzymany" });
        const olbrzym = await scratchActor({ name: "[Quench] olbrzym", system: { traits: { size: "huge" } } });
        await a.createEmbeddedDocuments("Item", [sztuczkaItem("wrestler", "Wrestler")]);
        expect(trzymaPochwyconego(a, cel)).to.equal(false);
        await a.setFlag(MODULE_ID, "handOccupants", [
          { slot: "hand.1", label: "trzyma", actorUuid: cel.uuid, kind: "grapple" },
          { slot: "hand.0", label: "trzyma", actorUuid: olbrzym.uuid, kind: "grapple" }
        ]);
        expect(trzymaPochwyconego(a, cel)).to.equal(true);
        expect([rzutNaMate(a, cel), rzutNaMate(a, olbrzym)]).to.deep.equal([true, false]);
      });

      it("Ławnik: przedmiot 10 kg+ — 3k4 obuchowe; lżejszy — zwykłe 1k4", async function () {
        const a = await scratchActor();
        await a.createEmbeddedDocuments("Item", [sztuczkaItem("lawnik", "Ławnik")]);
        const made = await a.createEmbeddedDocuments("Item", [
          { name: "[Quench] beczka", type: "loot", system: { weight: { value: 30, units: "kg" } } },
          { name: "[Quench] kubek", type: "loot", system: { weight: { value: 0.3, units: "kg" } } }
        ]);
        const beczka = made.find(i => i.name.includes("beczka"));
        const kubek = made.find(i => i.name.includes("kubek"));
        const ciezki = daneBlizniaka(a, beczka, "hand.0");
        const b = ciezki.system.damage.base;
        expect([b.number, b.denomination, b.types, ciezki.flags[MODULE_ID].improwizacja.lawnik]).to.deep.equal([3, 4, ["bludgeoning"], true]);
        const lekki = daneBlizniaka(a, kubek, "hand.0");
        expect([lekki.system.damage.base.number, lekki.system.damage.base.denomination, lekki.flags[MODULE_ID].improwizacja.lawnik])
          .to.deep.equal([1, 4, false]);
      });

      it("Fechmistrz: wybrany model — kość obrażeń więcej; zmiana w odpoczynku: RAW od razu, WKK po 30 h", async function () {
        const katana = await packDoc("bron", d => d.getFlag(MODULE_ID, "weaponId") === "katana");
        const noz = await packDoc("bron", d => d.getFlag(MODULE_ID, "weaponId") === "noz-taktyczny");
        if (!katana || !noz) this.skip();
        const a = await scratchActor();
        const made = await a.createEmbeddedDocuments("Item", [sztuczkaItem("mistrzBroniBialej", "Mistrz broni białej"),
          game.items.fromCompendium(katana), game.items.fromCompendium(noz)]);
        const sz = made.find(i => i.type === "feat");
        const k = made.find(i => i.getFlag(MODULE_ID, "weaponId") === "katana");
        const n = made.find(i => i.getFlag(MODULE_ID, "weaponId") === "noz-taktyczny");
        const akt = w => w.system.activities.find(x => x.type === "attack");
        await sz.setFlag(MODULE_ID, "fechmistrz", { model: "katana", nazwa: "Katana" });
        expect(premieObrazen(akt(k), { formula: "1d10 + 3" }).map(p => [p.id, p.czesc])).to.deep.include(["fechmistrz", "1d10"]);
        expect(premieObrazen(akt(n), { formula: "1d4 + 3" }).map(p => p.id)).to.not.include("fechmistrz");

        const original = game.settings.get.bind(game.settings);
        const kobalt = on => stub(game.settings, "get", (ns, key) => ((ns === MODULE_ID && key === "kobaltEnabled") ? on : original(ns, key)));
        let restore = kobalt(true);
        try {
          await sw.FECHMISTRZ_ZAJECIE.apply(a, { model: "noz-taktyczny", godziny: 10 });
          expect(sz.getFlag(MODULE_ID, "fechmistrz")).to.deep.include({ model: "katana" });
          expect(sz.getFlag(MODULE_ID, "fechmistrz").trening).to.deep.include({ model: "noz-taktyczny", godziny: 10 });
          await sw.FECHMISTRZ_ZAJECIE.apply(a, { model: "noz-taktyczny", godziny: 10 });
          await sw.FECHMISTRZ_ZAJECIE.apply(a, { model: "noz-taktyczny", godziny: 10 });
          expect(sz.getFlag(MODULE_ID, "fechmistrz").model, "WKK — 30 h").to.equal("noz-taktyczny");
        } finally {
          restore();
        }
        restore = kobalt(false);
        try {
          await sw.FECHMISTRZ_ZAJECIE.apply(a, { model: "katana" });
          expect(sz.getFlag(MODULE_ID, "fechmistrz").model, "RAW — ten odpoczynek").to.equal("katana");
        } finally {
          restore();
        }
      });
    });
  });
}
