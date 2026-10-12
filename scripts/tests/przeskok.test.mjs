/**
 * Neuroshima 5e — przeskok narracyjny: plan i podgląd na prawdziwych dokumentach (PLAN_m5_postoj.md E7, warstwa 5).
 *
 * Bez zatwierdzenia: `wykonajPrzeskok` przesuwa zegar świata, więc w kampanii go nie wołamy — robi to e2e `postoj`
 * w piaskownicy. Tu: normalizacja planu, plan z ostatniej doby, zejście Wyczerpania przez N DO (z odsypianiem WKK),
 * podgląd — rachunek bez dób po ukończonym Treningu, jedzenie przed odpoczynkiem (Niedożywienie schodzi tylko
 * najedzonemu), Zranienie z kalendarzyka.
 */

import { MODULE_ID, scratchActor, scratchGroupActor, scratchCleanup } from "./helpers.mjs";
import { normalizujPlan, planDomyslny, zejscieWyczerpania, podgladPostaci } from "../postoj/przeskok.mjs";
import { setMiejsce } from "../postoj/miejsce.mjs";
import { FLAGA_KONTA, dolaPrawejReki, zarobkiZPracy } from "../postoj/doba.mjs";
import { addExhaustion } from "../config/exhaustion.mjs";
import { setZranienie } from "../combat/zranienie.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";

const wpis = (source, czas) => ({ source, czas });

export function registerPrzeskokTests(quench) {
  quench.registerBatch(`${MODULE_ID}.postoj-przeskok`, context => {
    const { describe, it, expect, after } = context;
    after(() => scratchCleanup());

    describe("Plan dnia typowego", function () {
      it("normalizacja: sen ≥ 6 h (DO co dobę), praca ≤ 10 h, Trening ≤ 10 h, puste cele, pasywna MG albo null", function () {
        const p = normalizujPlan({ sen: 3, utrzymanie: "zly", praca: { klucz: "skill:tch", godziny: 14, pasywna: "" }, trening: { godziny: 12 }, stopien: "" });
        expect(p).to.include({ sen: 6, utrzymanie: null, stopien: null, droga: "cialo" });
        expect(p.praca).to.include({ godziny: 10, pasywna: null });
        expect(p.trening).to.include({ cel: "", godziny: 10 });
        expect(normalizujPlan({ praca: { pasywna: "17" } }).praca.pasywna).to.equal(17);
      });

      it("plan z ostatniej zatwierdzonej doby: sen, utrzymanie, Praca, Trening, Roboty (h:mm → h)", async function () {
        const a = await scratchActor({ flags: { [MODULE_ID]: { [FLAGA_KONTA]: { ostatni: {
          sen: 9, utrzymanie: "bogaty",
          zajecia: { praca: { klucz: "skill:tch", godziny: 6 }, trening: { cel: "skill:atl", godziny: 4, trener: "Joe" }, produkcja: { abc: "1:30" } }
        } } } } });
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        await setMiejsce(g, { rodzaj: "miasto" });
        const p = planDomyslny(a, g);
        expect(p).to.include({ sen: 9, utrzymanie: "bogaty" });
        expect(p.praca).to.include({ klucz: "skill:tch", godziny: 6 });
        expect(p.trening).to.include({ cel: "skill:atl", godziny: 4, trener: "Joe" });
        expect(p.roboty).to.deep.equal({ abc: 1.5 });
        await setMiejsce(g, { rodzaj: "dzicz" });
        expect(planDomyslny(a, g).utrzymanie, "w dziczy bez utrzymania").to.equal(null);
      });
    });

    describe("Wyczerpanie przez N DO (U14, D35)", function () {
      const zrodla = [wpis("bezsennosc", 1), wpis("kac", 2), wpis("forsowanie", 3), wpis("bezsennosc", 4)];
      it("NOE: Bezsenność to zwykły poziom — N DO zdejmuje N poziomów", function () {
        const r = zejscieWyczerpania(zrodla, { kobalt: false, spelnione: [], senKobalt: false }, 3);
        expect(r.zdjete.length).to.equal(3);
        expect(r.zostaje.length).to.equal(1);
      });
      it("WKK „Sen”: Bezsenność nie schodzi z DO, tylko odsypianiem — poziom na dobę", function () {
        const opts = { kobalt: true, spelnione: [], senKobalt: true };
        const bez = zejscieWyczerpania(zrodla, opts, 3);
        expect(bez.zdjete.map(x => x.source).sort(), "bez odsypiania").to.deep.equal(["forsowanie", "kac"]);
        const z = zejscieWyczerpania(zrodla, opts, 3, { odsypianie: true });
        expect(z.zostaje).to.deep.equal([]);
        expect(zejscieWyczerpania(zrodla, opts, 1, { odsypianie: true }).zostaje.map(x => x.source), "1 doba: −1 zwykły, −1 Bezsenność")
          .to.have.members(["forsowanie", "bezsennosc"]);
      });
    });

    describe("Podgląd postaci", function () {
      it("rachunek: utrzymanie × N, Trening tylko do 300 h, Praca z pasywnej; nadwyżka z konta wchodzi do salda", async function () {
        const a = await scratchActor({
          system: { abilities: { int: { value: 14 } }, skills: { tch: { value: 1 } } },
          flags: { [MODULE_ID]: { trening: { "skill:atl": { godziny: 250 } }, [FLAGA_KONTA]: { nadwyzka: 7 } } }
        });
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        await setMiejsce(g, { rodzaj: "miasteczko" });
        const plan = normalizujPlan({ utrzymanie: "normalny", praca: { klucz: "skill:tch", godziny: 5 }, trening: { cel: "skill:atl", godziny: 10, trener: "Joe" } });
        const p = podgladPostaci(a, g, plan, 10);
        const pas = a.system.skills.tch.passive;
        expect(p.rachunek.koszty, "10 × 10 gb + 50 h Treningu").to.equal(150);
        expect(p.rachunek.zarobki).to.equal(Math.floor(pas * 5 / 10) * 10);
        expect(p.saldo).to.equal(p.rachunek.zarobki - 150 + 7);
        expect(p.trening).to.include({ godziny: 300, ukonczony: true, przed: 250 });
        expect(p.ostrzezenia.filter(o => /ponad 10 h/.test(o)).length, "5 + 10 h pracy — ponad 10 h").to.equal(1);
        expect(p.bogaty).to.equal(null);
      });

      it("jedzenie przed odpoczynkiem: Niedożywienie schodzi przy utrzymaniu, bez jedzenia — zostaje", async function () {
        const a = await scratchActor();
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        await setMiejsce(g, { rodzaj: "wioska" });
        await addExhaustion(a, "niedozywienie", { chat: false });
        await a.toggleStatusEffect("malnutrition", { active: true });
        const syty = podgladPostaci(a, g, normalizujPlan({ utrzymanie: "nedzny" }), 5);
        expect(syty.wyczerpanie.zdjete.map(x => x.source)).to.deep.equal(["niedozywienie"]);
        const glodny = podgladPostaci(a, g, normalizujPlan({ utrzymanie: null }), 5);
        expect(glodny.wyczerpanie.zdjete).to.deep.equal([]);
        expect(glodny.wyczerpanie.zostaje.map(x => x.source)).to.deep.equal(["niedozywienie"]);
        await a.toggleStatusEffect("malnutrition", { active: false });
      });

      it("Zranienie: Stopień „zwykle” z kalendarzyka, MG może wybrać inny; pomoc medyczna — szybciej", async function () {
        const a = await scratchActor({ system: { abilities: { con: { value: 14 } }, attributes: { hp: { value: 10, max: 10 } } } });
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        await setZranienie(a, 2);
        const p = podgladPostaci(a, g, normalizujPlan({}), 30);
        expect(p.zdrowie.stopien).to.equal(2);
        expect(p.zdrowie.zwykle).to.be.at.most(1);
        expect(p.zdrowie.cel).to.equal(p.zdrowie.zwykle);
        expect(podgladPostaci(a, g, normalizujPlan({ stopien: 2 }), 30).zdrowie.cel, "MG: bez zmiany").to.equal(2);
        const medyk = podgladPostaci(a, g, normalizujPlan({ droga: "medyk" }), 2);
        expect(medyk.zdrowie.zwykle, "2 DO z pomocą medyczną: −2").to.equal(0);
      });

      it("U39: dola Prawej ręki — 1/10 zarobków z pracy (bez nadwyżki i towaru), tylko gdy ręka jest", async function () {
        const szef = await scratchActor();
        expect(dolaPrawejReki(szef, 100), "bez Prawej ręki").to.equal(null);
        await scratchActor({ name: "[Quench] Prawa ręka", flags: { [MODULE_ID]: { towarzysz: { wlasciciel: szef.uuid, rodzaj: "prawa-reka", klasa: "cwaniak" } } } });
        expect(dolaPrawejReki(szef, 95)).to.match(/9,5 gb/);
        expect(dolaPrawejReki(szef, 0)).to.equal(null);
        const z = zarobkiZPracy([
          { rodzaj: "zarobek", kwota: 40 }, { rodzaj: "zarobek", kwota: 7, nadwyzka: true },
          { rodzaj: "zarobek", kwota: 30, towar: true }, { rodzaj: "koszt", kwota: 10 }, { rodzaj: "zarobek", kwota: 5, mg: true }
        ]);
        expect(z).to.equal(40);
      });

      it("WKK Bogaty: pewny Fuks co 10 dób w podglądzie (tylko pod Kobaltem)", async function () {
        const a = await scratchActor();
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        await setMiejsce(g, { rodzaj: "miasto" });
        const p = podgladPostaci(a, g, normalizujPlan({ utrzymanie: "bogaty" }), 25);
        if (isKobaltEnabled()) expect(p.bogaty).to.include({ fuksow: 2, zostaje: true });
        else expect(p.bogaty).to.equal(null);
      });
    });
  });
}
