/**
 * Neuroshima 5e — krwawienia jako osobne efekty (docs/Krwawienia.md; ustalenia MG 2026-10-31 i 2026-11-01).
 *
 * Warstwa 1: dane (`config/krwawienia-data.mjs`) — siedem rodzajów, sposoby zatrzymania, lek (WKK 43), przypomnienie.
 * Warstwa 4 (aktorzy testowi): ten sam się nie powtarza, różne naraz, maszyna nie krwawi; tyknięcie bez rodzaju (nie
 * uruchamia Hemofilii), przy 0 PW jedna porażka; RO Hemofilii; opatrzenie — ładunek za próbę, Dno torby z Utrudnieniem,
 * Kolory nie sam sobie, Wyciek — mały mechanik; jedna akcja — jedno krwawienie; lek; Kolory przy Stopniu Zranienia;
 * przypomnienie poza walką; migracja starej flagi; piła Juggernauta w danych Bestiariusza. Rzuty i ustawienia
 * podstawione — bez okien, świat zostaje, jak był. Przyciski i przekaźnik z drugiego klienta — e2e `zdolnosci-walka`.
 */

import {
  KRWAWIENIA, KRWAWIENIE_PO_STATUSIE, lekDziala, celPasuje, przypomnienie, PRZYPOMNIENIE_CO
} from "../config/krwawienia-data.mjs";
import {
  krwawienia, maKrwawienie, startBleeding, stopBleeding, tickBleed, opatrz, podajLek, przypomnijPozaWalka,
  migrujStareKrwawienia, FLAG, __testing as K
} from "../combat/bleeding.mjs";
import { applyZranienie, setZranienie } from "../combat/zranienie.mjs";
import { addDisease, dosesRemaining } from "../actors/health-panel.mjs";
import { createToolkits } from "../config/toolkits-data.mjs";
import { zapasyMedyka } from "../items/toolkit-medyk.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";
import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, waitFor } from "./helpers.mjs";

export function registerKrwawieniaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.krwawienia`, context => {
    const { describe, it, expect, after, afterEach } = context;
    const start = Date.now();
    const przywroc = [];
    afterEach(() => { while (przywroc.length) przywroc.pop()(); });
    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    /** Podstawione ustawienia świata modułu (`kobaltEnabled`, `kolorNeuroshimy`). */
    const ustawienia = wartosci => {
      const get = game.settings.get.bind(game.settings);
      przywroc.push(stub(game.settings, "get", (ns, key) => (ns === MODULE_ID && key in wartosci) ? wartosci[key] : get(ns, key)));
    };
    /** Podstawiony rzut aktora; zapamiętuje konfiguracje. */
    const rzut = (actor, metoda, total) => {
      const wywolania = [];
      przywroc.push(stub(actor, metoda, async cfg => { wywolania.push(cfg); return [{ total }]; }));
      return wywolania;
    };
    const postac = (name, hp = 40) => scratchActor({ name: `${SCRATCH_PREFIX} ${name}`, system: { attributes: { hp: { value: hp, max: 40 } } } });
    const maszyna = name => scratchActor({ name: `${SCRATCH_PREFIX} ${name}`, type: "npc", system: { details: { type: { value: "Maszyna" } }, attributes: { hp: { value: 40, max: 40 } } } });
    const medyk = async (ladunki = 5, extra = []) => {
      const m = await postac("medyk");
      await createToolkits(m, { only: ["medyka", ...extra] });
      const kit = m.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
      await kit.update({ "system.uses.max": "5", "system.uses.spent": 5 - ladunki });
      return m;
    };
    const ladunki = m => zapasyMedyka(m)[0]?.remaining;
    const cicho = () => { const w = ui.notifications.warn; ui.notifications.warn = () => {}; przywroc.push(() => { ui.notifications.warn = w; }); };

    describe("Dane (warstwa 1)", function () {
      it("siedem rodzajów, każdy ze swoim stanem zarejestrowanym w Foundry; jednego „bleeding” już nie ma", function () {
        expect(Object.keys(KRWAWIENIA)).to.deep.equal(["hemofilia", "podstepny", "dumdum", "tetnica", "kolory", "pila", "wyciek"]);
        const statusy = Object.values(KRWAWIENIA).map(d => d.status);
        expect(new Set(statusy).size, "różne stany").to.equal(7);
        for (const s of statusy) expect(CONFIG.statusEffects.some(e => e.id === s), s).to.equal(true);
        expect(CONFIG.statusEffects.some(e => e.id === "bleeding"), "stary wspólny stan").to.equal(false);
        expect(KRWAWIENIE_PO_STATUSIE.krwawieniePila).to.equal("pila");
      });

      it("dum-dum: liczby Podstępnego ataku, ale osobny stan i nazwa", function () {
        const { podstepny: p, dumdum: d } = KRWAWIENIA;
        expect([d.when, d.damage, d.stop]).to.deep.equal([p.when, p.damage, p.stop]);
        expect(d.status).to.not.equal(p.status);
        expect(d.label).to.equal("Krwawienie (Dum-dum)");
      });

      it("zatrzymanie: Hemofilia Medycyna ST 15; opatrzenie — narzędzia ST 10 z ładunkiem; Kolory Pomaganie bez ładunku, nie sam; Wyciek — mechanik", function () {
        expect(KRWAWIENIA.hemofilia.stop).to.include({ test: "medycyna", dc: 15, ladunek: true, sam: true });
        for (const id of ["podstepny", "dumdum", "tetnica", "pila"]) {
          expect(KRWAWIENIA[id].stop, id).to.include({ test: "narzedzia", dc: 10, ladunek: true, sam: true });
        }
        expect(KRWAWIENIA.kolory.stop).to.include({ test: "pomaganie", dc: 10, ladunek: false, sam: false });
        expect(KRWAWIENIA.wyciek.stop).to.include({ test: "mechanik", dc: 10, ladunek: false, sam: false });
      });

      it("wszystkie tykają w turze krwawiącego — na początku, Hemofilia na końcu", function () {
        expect(Object.values(KRWAWIENIA).filter(d => d.when === "end").map(d => d.id)).to.deep.equal(["hemofilia"]);
      });

      it("lek na Hemofilię: Hemofilia zawsze, inne krwawienia tylko w WKK, Wyciek nigdy", function () {
        expect(lekDziala(KRWAWIENIA.hemofilia, { kobalt: false })).to.equal(true);
        expect(lekDziala(KRWAWIENIA.podstepny, { kobalt: false })).to.equal(false);
        expect(lekDziala(KRWAWIENIA.kolory, { kobalt: true })).to.equal(true);
        expect(lekDziala(KRWAWIENIA.wyciek, { kobalt: true })).to.equal(false);
      });

      it("cel: krwawienia — żywe, Wyciek — maszyny", function () {
        expect(celPasuje(KRWAWIENIA.pila, { maszyna: true })).to.equal(false);
        expect(celPasuje(KRWAWIENIA.wyciek, { maszyna: true })).to.equal(true);
        expect(celPasuje(KRWAWIENIA.wyciek, { maszyna: false })).to.equal(false);
      });

      it("przypomnienie co 10 minut: krótsze przesunięcia się sumują, cofnięcie zegara liczy od nowa", function () {
        expect(PRZYPOMNIENIE_CO).to.equal(600);
        expect(przypomnienie(1000, 1300)).to.deep.equal({ nalezne: false, ostatnio: 1000 });
        expect(przypomnienie(1000, 1600)).to.deep.equal({ nalezne: true, ostatnio: 1600 });
        expect(przypomnienie(1000, 500)).to.deep.equal({ nalezne: false, ostatnio: 500 });
        expect(przypomnienie(undefined, 500)).to.deep.equal({ nalezne: false, ostatnio: 500 });
      });
    });

    describe("Efekty", function () {
      it("ten sam się nie powtarza, różne mogą być naraz; maszyna nie krwawi, Wyciek tylko u maszyn", async function () {
        const a = await postac("krwawi");
        expect(await startBleeding(a, { rodzaj: "podstepny" })).to.be.ok;
        expect(await startBleeding(a, { rodzaj: "podstepny" }), "drugi Podstępny").to.equal(null);
        await startBleeding(a, { rodzaj: "dumdum" });
        await startBleeding(a, { rodzaj: "tetnica" });
        expect(krwawienia(a).map(k => k.def.id)).to.deep.equal(["podstepny", "dumdum", "tetnica"]);
        expect(a.effects.filter(e => e.statuses.has(KRWAWIENIA.podstepny.status))).to.have.length(1);
        expect(await startBleeding(a, { rodzaj: "wyciek" }), "żywy nie ma hydrauliki").to.equal(null);
        const m = await maszyna("Obrońca");
        expect(await startBleeding(m, { rodzaj: "pila" }), "maszyna nie krwawi").to.equal(null);
        expect(await startBleeding(m, { rodzaj: "wyciek" })).to.be.ok;
        expect(K._maszyna(m)).to.equal(true);
      });

      it("tyknięcie: obrażenia bez rodzaju — nie uruchamiają Hemofilii; cięte tak", async function () {
        const a = await postac("hemofilik");
        await addDisease(a, "hemofilia");
        await startBleeding(a, { rodzaj: "podstepny" });
        const r = await tickBleed(a, "podstepny");
        expect(r.obrazenia).to.be.within(1, 8);
        expect(a.system.attributes.hp.value).to.equal(40 - r.obrazenia);
        await new Promise(res => setTimeout(res, 150));
        expect(maKrwawienie(a, "hemofilia"), "tyknięcie bez rodzaju").to.equal(false);
        expect(K._efekt(a, "podstepny").getFlag(MODULE_ID, FLAG)?.ostatnio).to.equal(game.time.worldTime);
        await a.applyDamage([{ value: 2, type: "slashing" }]);
        await waitFor(() => maKrwawienie(a, "hemofilia"), { label: "Hemofilia po obrażeniach ciętych" });
      });

      it("przy 0 PW każde tyknięcie to jedna porażka w Rzucie Przeciw Śmierci — także sama utrata PW", async function () {
        const a = await postac("umiera", 0);
        await startBleeding(a, { rodzaj: "kolory" });
        await startBleeding(a, { rodzaj: "podstepny" });
        await tickBleed(a, "kolory");
        await waitFor(() => a.system.attributes.death.failure === 1, { label: "porażka za Kolory" });
        await tickBleed(a, "podstepny");
        await waitFor(() => a.system.attributes.death.failure === 2, { label: "druga za Podstępny — nie dwie naraz" });
      });

      it("Hemofilia: RO na Kondycję ST 10 przed obrażeniami; trzy zdane z rzędu kończą krwawienie", async function () {
        const a = await postac("RO");
        await startBleeding(a, { rodzaj: "hemofilia" });
        const rzuty = rzut(a, "rollSavingThrow", 12);
        expect((await tickBleed(a, "hemofilia")).seria).to.equal(1);
        await tickBleed(a, "hemofilia");
        expect((await tickBleed(a, "hemofilia")).koniec).to.equal(true);
        expect(rzuty[0]).to.include({ ability: "con", target: 10 });
        expect(maKrwawienie(a, "hemofilia")).to.equal(false);
        expect(a.system.attributes.hp.value, "bez obrażeń").to.equal(40);
      });

      it("martwy nie krwawi — tyknięcie zdejmuje jego krwawienia", async function () {
        const a = await postac("martwy");
        await startBleeding(a, { rodzaj: "pila" });
        await a.toggleStatusEffect("dead", { active: true });
        expect(await tickBleed(a, "pila")).to.equal(null);
        expect(krwawienia(a)).to.have.length(0);
      });
    });

    describe("Zatrzymanie", function () {
      it("opatrzenie: Test narzędzi ST 10, ładunek za każdą próbę; jedna akcja — jedno krwawienie", async function () {
        const a = await postac("ranny");
        await startBleeding(a, { rodzaj: "podstepny" });
        await startBleeding(a, { rodzaj: "tetnica" });
        const m = await medyk(3);
        let rzuty = rzut(m, "rollToolCheck", 7);
        expect(await opatrz(a, "podstepny", m)).to.equal(false);
        expect(rzuty[0]).to.include({ tool: "medyka", ability: "int", target: 10 });
        expect(ladunki(m), "nieudana próba też kosztuje").to.equal(2);
        przywroc.pop()();
        rzuty = rzut(m, "rollToolCheck", 10);
        expect(await opatrz(a, "podstepny", m)).to.equal(true);
        expect(ladunki(m)).to.equal(1);
        expect(krwawienia(a).map(k => k.def.id), "tętnica zostaje").to.deep.equal(["tetnica"]);
      });

      it("pusta torba: bez Dna torby — bez testu; z Dnem torby — z Utrudnieniem i bez ładunku", async function () {
        cicho();
        const a = await postac("ranny pusta torba");
        await startBleeding(a, { rodzaj: "pila" });
        const m = await medyk(0);
        const rzuty = rzut(m, "rollToolCheck", 15);
        expect(await opatrz(a, "pila", m)).to.equal(null);
        expect(rzuty).to.have.length(0);
        await m.createEmbeddedDocuments("Item", [{ name: "Aspiryna i Miętusy", type: "feat" }]);
        expect(await opatrz(a, "pila", m)).to.equal(true);
        expect(rzuty[0]?.disadvantage).to.equal(true);
        expect(ladunki(m)).to.equal(0);
      });

      it("Hemofilia: Test Medycyny ST 15 z narzędziami, ładunek", async function () {
        const a = await postac("hemofilik opatrywany");
        await startBleeding(a, { rodzaj: "hemofilia" });
        const m = await medyk(2);
        const rzuty = rzut(m, "rollSkill", 15);
        expect(await opatrz(a, "hemofilia", m)).to.equal(true);
        expect(rzuty[0]).to.include({ skill: "med", target: 15 });
        expect(ladunki(m)).to.equal(1);
      });

      it("Kolory: nie sam sobie; ktoś inny — Pomaganie, Medycyna ST 10 bez narzędzi i bez ładunku", async function () {
        cicho();
        const a = await postac("Kolory");
        await startBleeding(a, { rodzaj: "kolory" });
        expect(await opatrz(a, "kolory", a), "sam sobie").to.equal(null);
        const pomocnik = await postac("pomocnik bez narzędzi");
        const rzuty = rzut(pomocnik, "rollSkill", 10);
        expect(await opatrz(a, "kolory", pomocnik)).to.equal(true);
        expect(rzuty[0]).to.include({ skill: "med", ability: "int", target: 10 });
      });

      it("Wyciek: naprawa narzędziami małego mechanika ST 10; maszyna sama nie, bez narzędzi nie; leku nie ma", async function () {
        cicho();
        const m = await maszyna("Pająk");
        await startBleeding(m, { rodzaj: "wyciek" });
        expect(await opatrz(m, "wyciek", m), "sama").to.equal(null);
        const bez = await postac("bez mechanika");
        expect(await opatrz(m, "wyciek", bez), "bez narzędzi").to.equal(null);
        expect(await podajLek(m, "wyciek", bez)).to.equal(false);
        const mech = await medyk(5, ["mechanika"]);
        const rzuty = rzut(mech, "rollToolCheck", 11);
        expect(await opatrz(m, "wyciek", mech)).to.equal(true);
        expect(rzuty[0]).to.include({ tool: "mechanika", target: 10 });
        expect(ladunki(mech), "mechanik nie zużywa ładunku medyka").to.equal(5);
      });

      it("lek na Hemofilię: przy Hemofilii zawsze, przy innych tylko w WKK — jedna dawka, jedno krwawienie", async function () {
        cicho();
        const a = await postac("lek");
        await startBleeding(a, { rodzaj: "podstepny" });
        await startBleeding(a, { rodzaj: "hemofilia" });
        const m = await postac("z lekiem");
        await m.createEmbeddedDocuments("Item", [{
          name: `${SCRATCH_PREFIX} Desmopresyna`, type: "consumable", system: { quantity: 2 },
          flags: { [MODULE_ID]: { chemiaKey: "desmopresyna" } }
        }]);
        const dawki = () => m.items.filter(i => i.getFlag(MODULE_ID, "chemiaKey") === "desmopresyna").reduce((n, i) => n + dosesRemaining(i), 0);
        ustawienia({ kobaltEnabled: false });
        expect(await podajLek(a, "podstepny", m), "bez Kobaltu").to.equal(false);
        expect(await podajLek(a, "hemofilia", m)).to.equal(true);
        expect(dawki()).to.equal(1);
        przywroc.pop()();
        ustawienia({ kobaltEnabled: true });
        expect(await podajLek(a, "podstepny", m)).to.equal(true);
        expect(krwawienia(a)).to.have.length(0);
        expect(dawki()).to.equal(0);
      });

      it("stopBleeding bez rodzaju zdejmuje wszystkie", async function () {
        const a = await postac("wszystkie");
        await startBleeding(a, { rodzaj: "podstepny" });
        await startBleeding(a, { rodzaj: "pila" });
        expect(await stopBleeding(a)).to.equal(true);
        expect(krwawienia(a)).to.have.length(0);
      });
    });

    describe("Wyzwalacze i poza walką", function () {
      it("Kolory Rdza, Rtęć, Stal: każdy otrzymany Stopień Zranienia — krwawienie; Chrom, brak Koloru i ręczne ustawienie — nie", async function () {
        const a = await postac("Rtęć");
        ustawienia({ kolorNeuroshimy: "chrom" });
        await applyZranienie(a, "test");
        await new Promise(res => setTimeout(res, 150));
        expect(maKrwawienie(a, "kolory"), "Chrom").to.equal(false);
        przywroc.pop()();
        ustawienia({ kolorNeuroshimy: "rtec" });
        await setZranienie(a, 2);
        await new Promise(res => setTimeout(res, 150));
        expect(maKrwawienie(a, "kolory"), "ręcznie przez MG").to.equal(false);
        await applyZranienie(a, "test");
        await waitFor(() => maKrwawienie(a, "kolory"), { label: "krwawienie z Kolorów" });
      });

      it("poza walką: przypomnienie po 10 minutach zegara, raz; licznik na efekcie", async function () {
        const a = await postac("poza walką");
        await startBleeding(a, { rodzaj: "tetnica" });
        const teraz = game.time.worldTime;
        const efekt = K._efekt(a, "tetnica");
        await efekt.update({ [`flags.${MODULE_ID}.${FLAG}.ostatnio`]: teraz - 700 });
        const linie = (await przypomnijPozaWalka(teraz)).filter(l => l.actor === a.name);
        expect(linie).to.deep.equal([{ actor: a.name, rodzaj: "tetnica", minut: 11 }]);
        expect(K._efekt(a, "tetnica").getFlag(MODULE_ID, FLAG).ostatnio).to.equal(teraz);
        expect((await przypomnijPozaWalka(teraz + 300)).filter(l => l.actor === a.name), "5 minut później").to.have.length(0);
        expect((await przypomnijPozaWalka(teraz + 600)).filter(l => l.actor === a.name), "10 minut — sumuje się").to.have.length(1);
      });

      it("migracja: stara flaga i wspólny stan → efekt rodzaju z dawnego profilu", async function () {
        const a = await postac("stary zapis");
        await a.setFlag(MODULE_ID, "krwawienie", { active: true, streak: 0, profile: "dumdum" });
        await a.createEmbeddedDocuments("ActiveEffect", [{ name: "Krwawienie", statuses: ["bleeding"] }]);
        await migrujStareKrwawienia();
        expect(maKrwawienie(a, "dumdum")).to.equal(true);
        expect(a.effects.some(e => e.statuses.has("bleeding"))).to.equal(false);
        expect(a.getFlag(MODULE_ID, "krwawienie")).to.equal(undefined);
      });

      it("piła Juggernauta: krwawienie z trafienia w danych Bestiariusza", function () {
        const pila = BESTIARY.juggernaut.attacks.find(a => a.id === "pila-tarczowa");
        expect(pila.onHit).to.deep.equal({ krwawienie: "pila" });
        expect(K._krwawienieZBroni({ flags: { [MODULE_ID]: { bestiary: { onHit: pila.onHit } } } })).to.equal("pila");
        expect(K._krwawienieZBroni({ flags: { [MODULE_ID]: { bestiary: { onHit: { condition: "grappled" } } } } })).to.equal(null);
      });
    });
  }, { displayName: "Neuroshima: Krwawienia — osobne efekty, zatrzymanie, Kolory, poza walką" });
}
