/**
 * Neuroshima 5e — Fuksy v2 i Fanty na prawdziwych dokumentach (PLAN_m5_postoj.md E2, warstwa 5).
 *
 * Migracja liczby na listę (B2), przyznanie z terminem ze źródła, Gotowanie wygasa po 24 h, odmowa przy
 * komplecie (karta MG), zużycie najkrócej ważnego, zgodność starego licznika (`getFuksy`/`setFuksy`), Fanty z
 * danych jako prawdziwe przedmioty, Fant kilkuosobowy (dwóch uczestników, flaga `uzyli` i brak drugiego Fuksa
 * z tego samego egzemplarza), Fant zużywalny (każda sztuka to osobny Fant).
 * Okna, pipki i aktywność z prawdziwego kliknięcia — warstwa 6 (`postoj`).
 */

import { MODULE_ID, scratchActor, scratchCleanup } from "./helpers.mjs";
import { fuksy, liczbaFuksow, przyznajFuksa, zuzyjFuksa, migrujFuksy, zdejmijWygasle, mozeMiecFuksy } from "../actors/fuksy.mjs";
import { getFuksy, setFuksy } from "../combat/rerolls.mjs";
import { FANTY, fantItemData, idFantu, FANT_AKTYWNOSC } from "../config/fanty-data.mjs";
import { uzyjFantu, fantPrzedmiotu } from "../items/fanty.mjs";

const D = 86400;

/** Wiadomości M5 utworzone w trakcie testu — do sprzątnięcia. */
function _sprzatacz() {
  const przed = new Set(game.messages.map(m => m.id));
  return async () => {
    const nowe = game.messages.filter(m => !przed.has(m.id)).map(m => m.id);
    if (nowe.length) await ChatMessage.deleteDocuments(nowe);
  };
}

export function registerFuksyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.fuksy`, context => {
    const { describe, it, expect, after, beforeEach, afterEach } = context;
    let sprzatnij = null;
    beforeEach(() => { sprzatnij = _sprzatacz(); });
    afterEach(async () => { await sprzatnij?.(); });
    after(() => scratchCleanup());

    describe("Fuksy v2 (U24)", function () {
      it("migracja: liczba 2 → dwa trwałe „sprzed M5”; odczyt rozumie oba kształty", async function () {
        const a = await scratchActor({ flags: { [MODULE_ID]: { fuksy: 2 } } });
        expect(liczbaFuksow(a), "liczba czytana jak lista").to.equal(2);
        const zm = await migrujFuksy({ cicho: true });
        expect(zm.some(z => z.startsWith(a.name))).to.equal(true);
        const surowa = a.getFlag(MODULE_ID, "fuksy");
        expect(Array.isArray(surowa)).to.equal(true);
        expect(surowa.map(f => [f.zrodlo, f.wygasa])).to.deep.equal([["przedM5", null], ["przedM5", null]]);
      });

      it("Gotowanie: termin 24 h od teraz; po zegarze +24 h zdjęty, trwały zostaje", async function () {
        const a = await scratchActor();
        const t = game.time.worldTime;
        await przyznajFuksa(a, "fant", { karta: false });
        const { fuks } = await przyznajFuksa(a, "gotowanie", { karta: false });
        expect(fuks.wygasa).to.equal(t + D);
        expect(await zdejmijWygasle(a, t + D - 1, { karta: false })).to.deep.equal([]);
        const zdjete = await zdejmijWygasle(a, t + D, { karta: false });
        expect(zdjete.map(f => f.zrodlo)).to.deep.equal(["gotowanie"]);
        expect(fuksy(a).map(f => f.zrodlo)).to.deep.equal(["fant"]);
      });

      it("komplet: czwarty — odmowa (RAW) i karta MG z zamianą", async function () {
        const a = await scratchActor();
        for (const z of ["fant", "rozrywka", "gotowanie"]) await przyznajFuksa(a, z, { karta: false });
        const r = await przyznajFuksa(a, "piesn", { karta: false });
        expect(r.odmowa).to.equal("komplet");
        expect(liczbaFuksow(a)).to.equal(3);
        const karta = game.messages.contents.at(-1);
        expect(karta.content).to.include("data-neuro-postoj=\"fuksZamien\"");
        expect(karta.whisper.length, "szept MG").to.be.above(0);
      });

      it("zużycie: najpierw najkrócej ważny, trwały na końcu", async function () {
        const a = await scratchActor();
        await przyznajFuksa(a, "fant", { karta: false });
        await przyznajFuksa(a, "rozrywka", { karta: false });
        await przyznajFuksa(a, "gotowanie", { karta: false });
        expect((await zuzyjFuksa(a)).zrodlo).to.equal("gotowanie");
        expect((await zuzyjFuksa(a)).zrodlo).to.equal("rozrywka");
        expect((await zuzyjFuksa(a)).zrodlo).to.equal("fant");
        expect(await zuzyjFuksa(a)).to.equal(null);
      });

      it("stary licznik (Przerzut, pipki sprzed M5) działa na liście", async function () {
        const a = await scratchActor();
        await setFuksy(a, 2);
        expect(getFuksy(a)).to.equal(2);
        await setFuksy(a, 1);
        expect(getFuksy(a)).to.equal(1);
        expect(fuksy(a)[0].zrodlo).to.equal("mg");
      });

      it("BG ma Fuksy, BN nie", async function () {
        expect(mozeMiecFuksy(await scratchActor())).to.equal(true);
        expect(mozeMiecFuksy(await scratchActor({ name: "[Quench] bn", type: "npc" }))).to.equal(false);
      });
    });

    describe("Fanty (U25)", function () {
      it("każdy Fant z tabeli tworzy się jako przedmiot z aktywnością i flagą", async function () {
        const a = await scratchActor();
        const items = await a.createEmbeddedDocuments("Item", FANTY.map(f => fantItemData(f)));
        expect(items).to.have.length(FANTY.length);
        for (const it of items) {
          expect(it.system.activities.get(FANT_AKTYWNOSC), it.name).to.exist;
          expect(fantPrzedmiotu(it)?.id, it.name).to.be.a("string");
        }
      });

      it("kilkuosobowy: dwóch uczestników dostaje Fuksa; drugie użycie tego egzemplarza — już nie", async function () {
        const a = await scratchActor({ name: "[Quench] gracz A" });
        const b = await scratchActor({ name: "[Quench] gracz B" });
        const f = FANTY.find(x => idFantu(x) === "gra-planszowa");
        const [item] = await a.createEmbeddedDocuments("Item", [fantItemData(f)]);
        await uzyjFantu(a, { nazwa: item.name, fant: fantPrzedmiotu(item), item }, { uczestnicy: [a, b] });
        expect(liczbaFuksow(a)).to.equal(1);
        expect(liczbaFuksow(b)).to.equal(1);
        expect(fuksy(a)[0]).to.include({ zrodlo: "fant", wygasa: null });
        expect(fantPrzedmiotu(item).uzyli).to.have.members([a.id, b.id]);
        await uzyjFantu(a, { nazwa: item.name, fant: fantPrzedmiotu(item), item }, { uczestnicy: [a, b] });
        expect(liczbaFuksow(a), "ten sam egzemplarz").to.equal(1);
      });

      it("zużywalny: każda sztuka to osobny Fant (bez pamięci `uzyli`)", async function () {
        const a = await scratchActor();
        const f = FANTY.find(x => idFantu(x) === "batonik-twinki");
        const [item] = await a.createEmbeddedDocuments("Item", [fantItemData(f, { quantity: 2 })]);
        await uzyjFantu(a, { nazwa: item.name, fant: fantPrzedmiotu(item), item }, { uczestnicy: [a] });
        await uzyjFantu(a, { nazwa: item.name, fant: fantPrzedmiotu(item), item }, { uczestnicy: [a] });
        expect(liczbaFuksow(a)).to.equal(2);
      });
    });
  }, { displayName: "Neuroshima: Fuksy v2 i Fanty (M5)" });
}
