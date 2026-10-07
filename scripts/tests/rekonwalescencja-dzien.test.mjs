/**
 * Neuroshima 5e — jeden Długi odpoczynek rannego na żywym aktorze (PLAN_m1_walka.md E6).
 *
 * Warstwa 3 (dokumenty): `dzienRekonwalescencji` — trzy drogi (ciało, Pomoc medyczna, samoleczenie),
 * licznik Regeneracji (D3, D4), ładunek i walidacja medyka w NOE i WKK (D4, D7, D8, U13), RAI przy
 * zejściu z Krytycznego, przerzut zmieniający werdykt, prognoza kalendarzyka z żywego aktora.
 * Rzuty podstawione (`stub`) — żadnych okien; karta czatu i odpoczynek z okna — e2e `rekonwalescencja`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, waitFor } from "./helpers.mjs";
import {
  stanRekonwalescencji, dzienRekonwalescencji, rzutRegeneracji, testSamoleczenia, ocenaMedyka, daneKalendarzyka
} from "../actors/rekonwalescencja.mjs";
import { restActivitiesApi } from "../actors/rest-activities.mjs";
import { getZranienieLvl, setZranienie } from "../combat/zranienie.mjs";
import { addExhaustion, zrodlaWyczerpania, poziomWyczerpania } from "../config/exhaustion.mjs";
import { sekundyDoby } from "../world-clock.mjs";
import { getChoroby, addDisease, sunsetCheck } from "../actors/health-panel.mjs";
import { createToolkits } from "../config/toolkits-data.mjs";
import { zapasyMedyka } from "../items/toolkit-medyk.mjs";

function kobalt(wlaczony) {
  const get = game.settings.get.bind(game.settings);
  return stub(game.settings, "get", (ns, key) => (ns === MODULE_ID && key === "kobaltEnabled") ? wlaczony : get(ns, key));
}

/** Podstawiony wynik rzutu — `rollSavingThrow` / `rollSkill` zwracają tablicę rzutów. */
const wynik = total => async () => [{ total }];

export function registerRekonwalescencjaDzienTests(quench) {
  quench.registerBatch(`${MODULE_ID}.rekonwalescencja-dzien`, context => {
    const { describe, it, expect, after, afterEach } = context;
    const przywroc = [];

    afterEach(() => { while (przywroc.length) przywroc.pop()(); });
    after(async () => {
      const smieci = game.messages.filter(m => String(m.speaker?.alias ?? "").startsWith(SCRATCH_PREFIX)).map(m => m.id);
      if (smieci.length) await ChatMessage.deleteDocuments(smieci);
      await scratchCleanup();
    });

    const ranny = async (stopien, extra = {}) => {
      const a = await scratchActor(foundry.utils.mergeObject({ system: { attributes: { hp: { value: 10, max: 10 } } } }, extra));
      await setZranienie(a, stopien);
      return a;
    };
    const medyk = async ({ biegly = true, ladunki = 5 } = {}) => {
      const m = await scratchActor({
        name: `${SCRATCH_PREFIX} medyk`,
        system: { attributes: { hp: { value: 10, max: 10 } }, skills: { med: { value: biegly ? 1 : 0 } } }
      });
      await createToolkits(m, { only: ["medyka"] });
      const kit = m.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
      await kit.update({ "system.uses.max": "5", "system.uses.spent": 5 - ladunki });
      return m;
    };

    describe("Gojenie (D3)", function () {
      it("licznik +1 na DO; trzeci DO — karta RO; sukces −1 Stopień i licznik od zera", async function () {
        const a = await ranny(2);
        await dzienRekonwalescencji(a, { droga: "cialo" });
        await dzienRekonwalescencji(a, { droga: "cialo" });
        expect(stanRekonwalescencji(a)).to.include({ licznik: 2, karta: null });
        await dzienRekonwalescencji(a, { droga: "cialo" });
        const stan = stanRekonwalescencji(a);
        expect(stan.licznik).to.equal(3);
        expect(game.messages.get(stan.karta)?.getFlag(MODULE_ID, "rekonwalescencjaKarta")?.rodzaj).to.equal("ro");
        przywroc.push(stub(a, "rollSavingThrow", wynik(15)));
        expect(await rzutRegeneracji(a)).to.deep.equal({ sukces: true });
        expect(getZranienieLvl(a)).to.equal(1);
        expect(stanRekonwalescencji(a)).to.include({ licznik: 0, karta: null });
      });

      it("porażka — licznik stoi, RO po następnym DO", async function () {
        const a = await ranny(1);
        await a.setFlag(MODULE_ID, "rekonwalescencja", { licznik: 2 });
        await dzienRekonwalescencji(a, { droga: "cialo" });
        przywroc.push(stub(a, "rollSavingThrow", wynik(14)));
        expect(await rzutRegeneracji(a)).to.deep.equal({ sukces: false });
        expect(getZranienieLvl(a)).to.equal(1);
        expect(stanRekonwalescencji(a)).to.include({ licznik: 3, wynik: "porazka" });
        await dzienRekonwalescencji(a, { droga: "cialo" });
        expect(stanRekonwalescencji(a).karta, "kolejny DO — kolejna karta RO").to.be.a("string");
      });

      it("Fuks, który zamienia porażkę w sukces, leczy raz", async function () {
        const a = await ranny(3);
        const msg = await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: a }), content: "rzut",
          flags: { [MODULE_ID]: { rekonwalescencjaRzut: { token: "t", rodzaj: "ro", actorUuid: a.uuid } } }
        });
        await a.setFlag(MODULE_ID, "rekonwalescencja", { licznik: 3, ostatniRzut: msg.id, wynik: "porazka", stopienPrzed: 3 });
        Hooks.callAll("neuroshima.rerolled", { message: msg, roll: { total: 17 }, kind: "fuks", actor: a });
        await waitFor(() => getZranienieLvl(a) === 2, { label: "Stopień po przerzucie" });
        Hooks.callAll("neuroshima.rerolled", { message: msg, roll: { total: 19 }, kind: "fuks", actor: a });
        await new Promise(r => setTimeout(r, 300));
        expect(getZranienieLvl(a), "drugi przerzut nic nie zmienia").to.equal(2);
        expect(stanRekonwalescencji(a)).to.include({ licznik: 0, wynik: "sukces-przerzut" });
      });
    });

    describe("Pomoc medyczna (D4, U13)", function () {
      it("BN: −1 Stopień bez testu, licznik +1", async function () {
        const a = await ranny(3);
        await dzienRekonwalescencji(a, { droga: "medyk", medyk: "bn" });
        expect(getZranienieLvl(a)).to.equal(2);
        expect(stanRekonwalescencji(a)).to.include({ licznik: 1, droga: "medyk", medyk: "bn" });
      });

      it("w dzień należnego RO licznik stoi", async function () {
        const a = await ranny(2);
        await a.setFlag(MODULE_ID, "rekonwalescencja", { licznik: 2 });
        await dzienRekonwalescencji(a, { droga: "medyk", medyk: "bn" });
        expect(getZranienieLvl(a)).to.equal(1);
        expect(stanRekonwalescencji(a).licznik).to.equal(2);
      });

      it("NOE: medyk drużyny nie zużywa ładunku", async function () {
        przywroc.push(kobalt(false));
        const m = await medyk({ ladunki: 2 });
        const a = await ranny(2);
        await dzienRekonwalescencji(a, { droga: "medyk", medyk: m.uuid });
        expect(getZranienieLvl(a)).to.equal(1);
        expect(zapasyMedyka(m)[0].remaining).to.equal(2);
      });

      it("WKK: ładunek schodzi; pusta torba — medyk niedostępny, ciało leczy się samo", async function () {
        przywroc.push(kobalt(true));
        const m = await medyk({ ladunki: 1 });
        const a = await ranny(2);
        await dzienRekonwalescencji(a, { droga: "medyk", medyk: m.uuid });
        expect(getZranienieLvl(a)).to.equal(1);
        expect(zapasyMedyka(m)[0].remaining).to.equal(0);
        expect(ocenaMedyka(m, a, { kobalt: true }).ok).to.equal(false);
        await dzienRekonwalescencji(a, { droga: "medyk", medyk: m.uuid });
        expect(getZranienieLvl(a), "bez ładunku — dzień ciała").to.equal(1);
        expect(stanRekonwalescencji(a).droga, "plan zapamiętany mimo to").to.equal("medyk");
      });

      it("medyk bez biegłości w Medycynie — niedostępny", async function () {
        const m = await medyk({ biegly: false });
        const a = await ranny(1);
        expect(ocenaMedyka(m, a, { kobalt: false }).ok).to.equal(false);
      });

      it("WKK: Pomoc medyczna zajmuje cały DO pacjenta i medyka (D7)", async function () {
        przywroc.push(kobalt(true));
        const m = await medyk();
        const a = await ranny(2);
        await a.setFlag(MODULE_ID, "rekonwalescencja", { droga: "medyk", medyk: m.uuid });
        expect(restActivitiesApi.blokada(a, "long", {})?.powod).to.match(/Pomoc medyczna zajmuje cały/);
        expect(restActivitiesApi.blokada(m, "long", {})?.powod).to.match(/Opieka medyczna nad/);
        przywroc.pop()();
        przywroc.push(kobalt(false));
        expect(restActivitiesApi.blokada(a, "long", {}), "NOE — bez blokady").to.equal(null);
      });

      it("Krytyczny → Poważny z medykiem zdejmuje Wyczerpanie ze Zranienia (RAI)", async function () {
        przywroc.push(kobalt(true));
        const a = await ranny(4);
        await addExhaustion(a, "zranienie", { chat: false });
        await dzienRekonwalescencji(a, { droga: "medyk", medyk: "bn" });
        expect(getZranienieLvl(a)).to.equal(3);
        expect(zrodlaWyczerpania(a)).to.have.length(0);
      });

      it("ostatni Stopień — licznik znika", async function () {
        const a = await ranny(1);
        await dzienRekonwalescencji(a, { droga: "medyk", medyk: "bn" });
        expect(getZranienieLvl(a)).to.equal(0);
        expect(a.getFlag(MODULE_ID, "rekonwalescencja")).to.equal(undefined);
      });
    });

    describe("Samoleczenie (WKK, D8)", function () {
      it("NOE — samoleczenia nie ma: dzień ciała", async function () {
        przywroc.push(kobalt(false));
        const a = await medyk();
        await setZranienie(a, 2);
        await dzienRekonwalescencji(a, { droga: "sam" });
        expect(stanRekonwalescencji(a)).to.include({ licznik: 1, karta: null });
      });

      it("WKK: ładunek schodzi przed testem; porażka +1 Stopień, sukces −1", async function () {
        przywroc.push(kobalt(true));
        const a = await medyk({ ladunki: 3 });
        await setZranienie(a, 2);
        await dzienRekonwalescencji(a, { droga: "sam" });
        expect(zapasyMedyka(a)[0].remaining).to.equal(2);
        expect(game.messages.get(stanRekonwalescencji(a).karta)?.getFlag(MODULE_ID, "rekonwalescencjaKarta")?.rodzaj).to.equal("samoleczenie");
        przywroc.push(stub(a, "rollSkill", wynik(19)));
        expect(await testSamoleczenia(a)).to.deep.equal({ sukces: false });
        expect(getZranienieLvl(a)).to.equal(3);
        przywroc.pop()();
        przywroc.push(stub(a, "rollSkill", wynik(20)));
        expect(await testSamoleczenia(a)).to.deep.equal({ sukces: true });
        expect(getZranienieLvl(a)).to.equal(2);
      });
    });

    describe("Choroba z dziennym RO (s. 111) — dzień bez korzyści, Zachód słońca", function () {
      const dlugi = a => a.longRest({ dialog: false, chat: false, advanceTime: false, newDay: false });

      it("DO w dzień bez korzyści się odbywa: bez PW i −1 Wyczerpania, ale licznik Regeneracji rośnie", async function () {
        const chory = await ranny(2, { system: { attributes: { hp: { value: 4, max: 10 } } } });
        const zdrowy = await ranny(2, { system: { attributes: { hp: { value: 4, max: 10 } } } });
        for (const a of [chory, zdrowy]) await addExhaustion(a, "kac", { chat: false });
        await chory.setFlag(MODULE_ID, "bezKorzysciDo", game.time.worldTime + sekundyDoby());
        await dlugi(chory);
        await dlugi(zdrowy);
        await waitFor(() => stanRekonwalescencji(chory).licznik === 1, { label: "licznik chorego" });
        expect(chory.system.attributes.hp.value, "PW").to.equal(4);
        expect(zrodlaWyczerpania(chory).map(x => x.source), "Kac zostaje").to.deep.equal(["kac"]);
        expect([zdrowy.system.attributes.hp.value, poziomWyczerpania(zdrowy)], "kontrola: zwykły DO").to.deep.equal([10, 0]);
      });

      it("Krótki odpoczynek w dzień bez korzyści — odwołany", async function () {
        const a = await ranny(0);
        await a.setFlag(MODULE_ID, "bezKorzysciDo", game.time.worldTime + sekundyDoby());
        expect(await a.shortRest({ dialog: false, chat: false, advanceTime: false })).to.equal(undefined);
      });

      it("Zachód słońca: RO z karą −2 za poziom Wyczerpania, porażka blokuje odpoczynki na dobę gry", async function () {
        const a = await ranny(0);
        await addDisease(a, "szczurzaGoraczka");
        for (const k of ["kac", "kac"]) await addExhaustion(a, k, { chat: false });
        const przed = game.settings.get(MODULE_ID, "ostatniZachod");
        const orig = CONFIG.Dice.randomUniform;
        const start = game.messages.size;
        // k20 = 16: bez kary 16 ≥ ST 15 (wyleczenie); z karą 16 − 4 = 12 — porażka.
        CONFIG.Dice.randomUniform = () => (20.5 - 16) / 20;
        try {
          await sunsetCheck({ actors: [a] });
        } finally {
          CONFIG.Dice.randomUniform = orig;
          await game.settings.set(MODULE_ID, "ostatniZachod", przed);
          const nowe = game.messages.contents.slice(start).filter(m => /neuro-sunset-card/.test(m.content ?? "")).map(m => m.id);
          if (nowe.length) await ChatMessage.deleteDocuments(nowe);
        }
        expect(getChoroby(a), "nie wyleczony").to.have.length(1);
        expect(poziomWyczerpania(a)).to.equal(3);
        expect(a.getFlag(MODULE_ID, "bezKorzysciDo")).to.be.closeTo(game.time.worldTime + sekundyDoby(), 1);
      });

      it("migracja dni: dzisiejsza blokada ze starego licznika → doba gry (sucha próba nic nie pisze)", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} migracja dni` });
        const stary = game.settings.get(MODULE_ID, "dayCounter");
        await a.setFlag(MODULE_ID, "noRestDay", stary);
        const raport = await game.modules.get(MODULE_ID).api.migration.migrateDniSwiata();
        expect(raport.find(r => r.aktor === a.name)?.zmiany).to.match(/następna doba gry/);
        expect(a.getFlag(MODULE_ID, "noRestDay")).to.equal(stary);
      });
    });

    describe("Kalendarzyk z żywego aktora (§7.8)", function () {
      it("medyk co DO: tyle DO, ile Stopni; ciało — premia z karty", async function () {
        przywroc.push(kobalt(false));
        const a = await ranny(3, { system: { abilities: { con: { value: 14 } } } });
        const k = daneKalendarzyka(a);
        expect(k.szansa.premia).to.equal(2);
        expect(k.medyk.progi.zwykle).to.equal(3);
        expect(k.cialo.progi.najszybciej).to.equal(9);
      });

      it("choroba z dziennym RO wchodzi do prognozy (ta sama premia, blokada z flagi)", async function () {
        const a = await ranny(2);
        await addDisease(a, "popromienna");
        await a.setFlag(MODULE_ID, "bezKorzysciDo", game.time.worldTime + sekundyDoby());
        const k = daneKalendarzyka(a);
        expect(k.choroba).to.include({ st: 20, premia: 0, bezKorzysci: true });
        expect(k.cialo.ryzykoSmierci, "ST 20 przy +0, bez leku").to.be.above(0.9);
      });
    });
  }, { displayName: "Neuroshima: Rekonwalescencja — Długi odpoczynek rannego (M1 E6)" });
}
