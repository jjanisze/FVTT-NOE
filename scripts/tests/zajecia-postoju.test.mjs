/**
 * Neuroshima 5e — zajęcia postoju na prawdziwych dokumentach (PLAN_m5_postoj.md E6, warstwa 5).
 *
 * Rejestr widoków (doba / przeskok, nie okna dnd5e), rachunek doby z Pracy (pasywna z karty i od MG), Hazard
 * (wygrana = stawka na czysto), Trening do 300 h → cecha „Wyszkolenie: X” z działającym efektem (umiejętność,
 * narzędzia, broń), Budowa bazy (projekt drużyny, karta MG po ukończeniu), Rozrywka (Fuks tylko w miasteczku
 * i mieście), Plotki (karta MG z liczbą informacji), Koncert (+1 Wyczerpanie „Koncert”), Szukanie towarzysza
 * (24 h w dwóch dobach → karta MG z [Nowy towarzysz]). Okno doby i rzuty — warstwa 6 (`dev/e2e/suites/postoj.mjs`).
 */

import { MODULE_ID, scratchActor, scratchGroupActor, scratchCleanup } from "./helpers.mjs";
import { zajeciaWidoku, zastosujZajecia } from "../actors/rest-activities.mjs";
import { ZAJECIA_POSTOJU, treningi, projektyBazy, ustawProjektBazy, pasywnaDla } from "../postoj/zajecia.mjs";
import { rachunekDoby } from "../postoj/doba.mjs";
import { setMiejsce } from "../postoj/miejsce.mjs";
import { fuksy } from "../actors/fuksy.mjs";
import { zrodlaWyczerpania } from "../config/exhaustion.mjs";

const def = id => ZAJECIA_POSTOJU.find(d => d.id === id);

/** Szkic doby w kształcie `szkic()` — tylko pola, które czyta rachunek. */
const szkicZ = (zajecia, mg = {}) => ({
  sen: 8, zajecia, utrzymanie: null, towarzysze: {}, doloz: [], wCieple: false,
  mg: { korekta: 0, stSnu: null, pasywna: null, uwagi: "", domyslny: false, ...mg }
});

export function registerZajeciaPostojuTests(quench) {
  quench.registerBatch(`${MODULE_ID}.postoj-zajecia`, context => {
    const { describe, it, expect, after, afterEach } = context;
    const wiadomosci = [];
    let hook = null;
    const lapWiadomosci = () => { hook = Hooks.on("createChatMessage", m => wiadomosci.push(m)); };
    afterEach(async () => {
      if (hook !== null) Hooks.off("createChatMessage", hook);
      hook = null;
      for (const m of wiadomosci.splice(0)) if (game.messages.get(m.id)) await m.delete();
    });
    after(() => scratchCleanup());

    describe("Rejestr (D26)", function () {
      it("osiem zajęć w dobie, Praca/Trening/Budowa także w przeskoku, żadne w oknach dnd5e", function () {
        const doba = zajeciaWidoku("doba").map(d => d.id);
        for (const id of ["praca", "trening", "budowa", "koncert", "rozrywka", "plotki", "hazard", "szukanie"]) expect(doba).to.include(id);
        expect(zajeciaWidoku("przeskok").map(d => d.id)).to.include.members(["praca", "trening", "budowa"]);
        const okna = [...zajeciaWidoku("long"), ...zajeciaWidoku("short")].map(d => d.id);
        for (const d of ZAJECIA_POSTOJU) expect(okna).to.not.include(d.id);
      });
    });

    describe("Rachunek doby", function () {
      it("Praca: 1 gb × pasywna za 10 h, w dół za mniej; pasywna MG nadpisuje kartę (U30)", async function () {
        const a = await scratchActor({ system: { abilities: { int: { value: 14 } }, skills: { tch: { value: 1 } } } });
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        await setMiejsce(g, { rodzaj: "miasteczko" });
        const pas = pasywnaDla(a, "skill:tch");
        expect(pas).to.equal(a.system.skills.tch.passive);
        let r = await rachunekDoby(a, szkicZ({ praca: { klucz: "skill:tch", godziny: 10 } }), { grupa: g });
        expect(r.linie.find(l => l.opis.startsWith("Praca"))).to.include({ rodzaj: "zarobek", kwota: pas });
        r = await rachunekDoby(a, szkicZ({ praca: { klucz: "skill:tch", godziny: 5 } }, { pasywna: 25 }), { grupa: g });
        expect(r.linie.find(l => l.opis.startsWith("Praca")).kwota).to.equal(12);
        expect(def("praca").godziny({ godziny: 14 })).to.equal(10);
      });

      it("Hazard: stawka to koszt, wygrana oddaje dwie stawki (na czysto +stawka), porażka — nic (U36)", function () {
        const h = def("hazard");
        const wygrana = h.rachunek({ wlacz: true, gra: "karty", stawka: 10, wynik: "20" });
        expect(wygrana.map(l => [l.rodzaj, l.kwota])).to.deep.equal([["koszt", 10], ["zarobek", 20]]);
        expect(h.rachunek({ wlacz: true, gra: "karty", stawka: 10, wynik: "19" }).map(l => l.rodzaj)).to.deep.equal(["koszt"]);
        expect(h.rachunek({ wlacz: false, stawka: 10 })).to.deep.equal([]);
        expect(h.godziny({ wlacz: true })).to.equal(1);
      });

      it("Trening kosztuje 1 gb/h × Usługi speców; Budowa 1 gb/h; Rozrywka i Plotki — kwota z formularza", function () {
        const ctx = { miejsce: { region: null }, szkic: szkicZ({}) };
        expect(def("trening").rachunek({ cel: "skill:tch", godziny: 10 }, ctx)[0].kwota).to.equal(10);
        expect(def("trening").rachunek({ cel: "", godziny: 10 }, ctx)).to.deep.equal([]);
        expect(def("budowa").rachunek({ projekt: "Wieża", godziny: 4 })[0].kwota).to.equal(4);
        expect(def("rozrywka").rachunek({ wlacz: true, kwota: 60 })[0].kwota).to.equal(60);
        expect(def("plotki").rachunek({ wlacz: true, kwota: 2 })[0].kwota).to.equal(5);
      });
    });

    describe("Skutki (apply)", function () {
      it("Trening: 300 h → „Wyszkolenie: X” z efektem — umiejętność, narzędzia, broń; drugi raz nie dubluje", async function () {
        const narz = Object.keys(CONFIG.DND5E.tools)[0];
        const a = await scratchActor({
          flags: { [MODULE_ID]: { trening: { "skill:tch": { godziny: 295 }, [`tool:${narz}`]: { godziny: 290 }, "weapon:mar": { godziny: 299 } } } }
        });
        const t = def("trening");
        const r = await t.apply(a, { cel: "skill:tch", godziny: 10, trener: "" });
        expect(r.linie.join(" ")).to.match(/Bez trenera/);
        expect(treningi(a)["skill:tch"].godziny).to.equal(300);
        await t.apply(a, { cel: `tool:${narz}`, godziny: 10, trener: "Stary Joe" });
        await t.apply(a, { cel: "weapon:mar", godziny: 1, trener: "Stary Joe" });
        const cechy = a.items.filter(i => i.getFlag(MODULE_ID, "wyszkolenie"));
        expect(cechy.map(i => i.getFlag(MODULE_ID, "wyszkolenie")).sort()).to.deep.equal(["skill:tch", `tool:${narz}`, "weapon:mar"].sort());
        expect(a.system.skills.tch.value).to.be.at.least(1);
        expect(a.system.tools[narz]?.value).to.be.at.least(1);
        expect([...a.system.traits.weaponProf.value]).to.include("mar");
        await t.apply(a, { cel: "skill:tch", godziny: 10, trener: "x" });
        expect(a.items.filter(i => i.getFlag(MODULE_ID, "wyszkolenie") === "skill:tch").length).to.equal(1);
      });

      it("Budowa: godziny na projekcie drużyny; po wymaganych — karta MG raz (U32)", async function () {
        lapWiadomosci();
        const a = await scratchActor();
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        await ustawProjektBazy(g, { nazwa: "Ogrodzenie", wymagane: 12, efekt: "+2 do Percepcji wart" });
        const b = def("budowa");
        await b.apply(a, { projekt: "ogrodzenie", godziny: 10 });
        expect(projektyBazy(g)[0]).to.include({ nazwa: "Ogrodzenie", godziny: 10, wymagane: 12 });
        expect(wiadomosci.length).to.equal(0);
        await b.apply(a, { projekt: "Ogrodzenie", godziny: 10 });
        expect(projektyBazy(g)[0].godziny).to.equal(12);
        expect(wiadomosci.filter(m => m.content.includes("Ogrodzenie ukończona")).length).to.equal(1);
        expect(wiadomosci[0].whisper.length).to.be.greaterThan(0);
        await b.apply(a, { projekt: "Ogrodzenie", godziny: 5 });
        expect(wiadomosci.filter(m => m.content.includes("ukończona")).length).to.equal(1);
        await b.apply(a, { projekt: "Studnia", godziny: 3 });
        expect(projektyBazy(g).map(p => p.nazwa)).to.include("Studnia");
      });

      it("Rozrywka: Fuks w miasteczku przy ≥ 50 gb; w wiosce i za 40 gb — nie (U34)", async function () {
        const a = await scratchActor();
        const r = def("rozrywka");
        await r.apply(a, { wlacz: true, kwota: 40 }, { config: { neuroMiejsce: { rodzaj: "miasteczko" } } });
        await r.apply(a, { wlacz: true, kwota: 50 }, { config: { neuroMiejsce: { rodzaj: "wioska" } } });
        expect(fuksy(a).length).to.equal(0);
        await r.apply(a, { wlacz: true, kwota: 50 }, { config: { neuroMiejsce: { rodzaj: "miasteczko" } } });
        expect(fuksy(a).map(f => f.zrodlo)).to.deep.equal(["rozrywka"]);
      });

      it("Plotki: karta tylko dla MG z liczbą informacji (U35); Koncert: +1 Wyczerpanie „Koncert” (U37)", async function () {
        lapWiadomosci();
        const a = await scratchActor();
        await def("plotki").apply(a, { wlacz: true, godziny: 1, kwota: 5, wynik: "21" });
        const karta = wiadomosci.find(m => m.content.includes("Plotki"));
        expect(karta.whisper.length).to.be.greaterThan(0);
        expect(karta.content).to.include("<strong>3 informacje</strong>");
        await def("koncert").apply(a, { wlacz: true, miejsce: "ulica", wynik: "15" });
        expect(zrodlaWyczerpania(a).map(z => z.source)).to.include("koncert");
        expect(def("koncert").rachunek({ wlacz: true, miejsce: "ulica", wynik: "15" })[0].kwota).to.equal(7);
      });

      it("Szukanie: 12 h + 12 h → karta MG z [Nowy towarzysz], licznik od zera; bez zdolności — niedostępne (U38)", async function () {
        lapWiadomosci();
        const a = await scratchActor({ items: [{ name: "Partner", type: "feat", flags: { [MODULE_ID]: { abilityId: "partner" } } }] });
        const s = def("szukanie");
        expect(s.dostepne(a)).to.equal(true);
        expect(s.dostepne(await scratchActor())).to.be.a("string");
        await s.apply(a, { zrodlo: "partner", godziny: 12 });
        expect(a.getFlag(MODULE_ID, "szukanieTowarzysza").partner).to.equal(12);
        expect(wiadomosci.length).to.equal(0);
        await s.apply(a, { zrodlo: "partner", godziny: 12 });
        expect(a.getFlag(MODULE_ID, "szukanieTowarzysza").partner).to.equal(0);
        const karta = wiadomosci.find(m => m.content.includes("nowyTowarzyszZSzukania"));
        expect(karta, "karta MG").to.exist;
        expect(karta.content).to.include(`data-zrodlo="partner"`);
      });

      it("zastosujZajecia w widoku doby: praca, rozrywka i plotki w jednym przebiegu, z miejscem z konfiguracji", async function () {
        lapWiadomosci();
        const a = await scratchActor();
        const linie = await zastosujZajecia(a, {
          praca: { klucz: "skill:tch", godziny: 4 },
          rozrywka: { wlacz: true, kwota: 50 },
          plotki: { wlacz: false }
        }, { typ: "long", widok: "doba", karta: false, config: { neuroMiejsce: { rodzaj: "miasto" } } });
        expect(linie.some(l => l.startsWith("Praca"))).to.equal(true);
        expect(linie.some(l => l.includes("Fuks na 7 dni"))).to.equal(true);
        expect(linie.some(l => l.startsWith("Plotki"))).to.equal(false);
      });
    });
  });
}
