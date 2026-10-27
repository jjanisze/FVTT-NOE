/**
 * Neuroshima 5e — obiekty (PLAN_m6_drobne_zasady.md §5.4, E4).
 *
 * Warstwa 1: tabele NOE s. 253 (TT z materiału, PW z rozmiaru × kruchości), rozmiar z wagi (U9), szablony przegród
 * (U10), mnożniki `burząca`/`karczująca`. Warstwa 2 (aktor testowy): natywny Próg `hp.dt` po odporności, ×2 w
 * `calculateDamage`, automatyczna porażka RO, Próg Bestiariusza po odporności (poprawka kolejności, P7).
 */

import {
  MATERIALY, ROZMIARY, SZABLONY, ttObiektu, pwObiektu, rozmiarZWagi, mnoznikObiektu, szablonDlaKlasy, jestObiektem
} from "../config/obiekty-rules.mjs";
import { daneAktoraBazowego, domyslneDlaKotwicy } from "../scenes/obiekty.mjs";
import { MODULE_ID, scratchActor, scratchCleanup } from "./helpers.mjs";

export function registerObiektyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.obiekty`, context => {
    const { describe, it, after, expect } = context;

    describe("Tabele (s. 253)", function () {
      it("TT z materiału: 11 / 13 / 15 / 16 / 17 / 19 / 21 / 23", function () {
        expect(Object.values(MATERIALY).map(m => m.tt)).to.deep.equal([11, 13, 15, 16, 17, 19, 21, 23]);
        expect(ttObiektu("drewno")).to.equal(15);
        expect(ttObiektu("nieznany")).to.equal(null);
      });
      it("PW: stała z tabeli albo rzut kości", function () {
        expect(pwObiektu("sredni", "wytrzymaly")).to.deep.equal({ pw: 18, formula: "4d8" });
        expect(pwObiektu("wielki", "twardy")).to.deep.equal({ pw: 216, formula: "36d12" });
        expect(pwObiektu("malutki", "kruchy").pw).to.equal(2);
        expect(pwObiektu("maly", "twardy", { rzut: f => (f === "9d6" ? 31 : 0) }).pw).to.equal(31);
        expect(pwObiektu("x", "kruchy")).to.equal(null);
      });
      it("rozmiar z wagi przedmiotu (U9): ≤1 Malutki, ≤10 Mały, ≤100 Średni, więcej Duży", function () {
        expect([0.5, 1, 1.1, 10, 50, 100, 101].map(rozmiarZWagi))
          .to.deep.equal(["malutki", "malutki", "maly", "maly", "sredni", "sredni", "duzy"]);
      });
      it("szablony przegród z eksportu (U10)", function () {
        expect(szablonDlaKlasy("door")).to.equal("drzwi");
        expect(szablonDlaKlasy("window")).to.equal("okno");
        expect(szablonDlaKlasy("fence")).to.equal("plot");
        expect(szablonDlaKlasy("railing")).to.equal("balustrada");
        expect(SZABLONY.okno).to.include({ rozmiar: "duzy", material: "szklo", kruchosc: "kruchy" });
        expect(SZABLONY.drzwiStalowe).to.include({ rozmiar: "sredni", material: "cienkaBlacha", kruchosc: "twardy" });
        expect(domyslneDlaKotwicy({ typ: "przedmiot", waga: 30 }).rozmiar).to.equal("sredni");
      });
      it("rozmiary mają rozmiar dnd5e i bok żetonu", function () {
        for (const [k, r] of Object.entries(ROZMIARY)) {
          expect(CONFIG.DND5E.actorSizes, k).to.have.property(r.dnd5e);
          expect(r.pola, k).to.be.above(0);
        }
      });
      it("mnożnik: burząca ×2 całość, karczująca ×2 cięte tylko w drewno/rośliny", function () {
        expect(mnoznikObiektu({ burzaca: true })).to.deep.equal({ calosc: 2, ciete: 1 });
        expect(mnoznikObiektu({ karczujaca: true, drewno: true })).to.deep.equal({ calosc: 1, ciete: 2 });
        expect(mnoznikObiektu({ karczujaca: true, drewno: false })).to.deep.equal({ calosc: 1, ciete: 1 });
      });
    });

    describe("Obiekt w potoku dnd5e (warstwa 2)", function () {
      after(scratchCleanup);

      async function obiekt({ pw = 18, dt = null, drewno = false } = {}) {
        const dane = daneAktoraBazowego();
        foundry.utils.mergeObject(dane, {
          system: { attributes: { hp: { value: pw, max: pw, dt } } },
          flags: { [MODULE_ID]: { obiekt: { bazowy: false, drewno } } }
        });
        delete dane.prototypeToken;
        return scratchActor(dane);
      }

      it("aktor bazowy: obiekt, niewrażliwy na trucizny i psychiczne, TT stała", async function () {
        const a = await obiekt();
        expect(jestObiektem(a)).to.equal(true);
        expect([...a.system.traits.di.value].sort()).to.deep.equal(["poison", "psychic"]);
        expect([...a._source.system.attributes.ac.calcs]).to.deep.equal(["natural"]);
        expect(a.system.attributes.ac.value).to.equal(15);
      });

      it("Próg (natywne `hp.dt`): poniżej — 0, równo i powyżej — całość", async function () {
        const a = await obiekt({ dt: 5 });
        expect(a.calculateDamage([{ value: 4, type: "bludgeoning", properties: new Set() }], {}).amount).to.equal(0);
        expect(a.calculateDamage([{ value: 5, type: "bludgeoning", properties: new Set() }], {}).amount).to.equal(5);
      });

      it("burząca ×2 (z amunicji/broni na obrażeniach), karczująca ×2 cięte w drewno", async function () {
        const a = await obiekt();
        expect(a.calculateDamage([{ value: 6, type: "piercing", properties: new Set(["burzaca"]) }], {}).amount).to.equal(12);
        const d = await obiekt({ drewno: true });
        expect(d.calculateDamage([{ value: 6, type: "slashing", properties: new Set(["karczujaca"]) },
          { value: 3, type: "bludgeoning", properties: new Set(["karczujaca"]) }], {}).amount).to.equal(15);
      });

      it("żeton obiektu nie blokuje ruchu ani nie jest trudnym terenem (dnd5e liczy każdego `npc`)", async function () {
        const a = await obiekt();
        const npc = await scratchActor({ type: "npc" });
        for (const hak of ["dnd5e.determineOccupiedGridSpaceBlocking", "dnd5e.determineOccupiedGridSpaceDifficult"]) {
          const found = new Set([{ actor: a }, { actor: npc }]);
          Hooks.callAll(hak, { i: 0, j: 0, k: 0 }, null, { preview: false }, found);
          expect([...found].map(t => t.actor), hak).to.deep.equal([npc]);
        }
      });

      it("RO obiektu: automatyczna porażka (s. 254)", async function () {
        const a = await obiekt();
        const rolls = await a.rollSavingThrow({ ability: "dex", target: 5 }, { configure: false }, { create: false });
        expect(rolls?.[0]?.total).to.be.below(5);
      });

      it("Próg Bestiariusza liczy się po odporności (s. 254 — poprawka kolejności, P7)", async function () {
        const npc = await scratchActor({
          type: "npc", system: { traits: { dr: { value: ["slashing"] } }, attributes: { hp: { value: 30, max: 30 } } },
          flags: { [MODULE_ID]: { bestiary: { damageThreshold: 5 } } }
        });
        // 8 ciętych → odporność 4 → poniżej Progu 5 → 0 (wcześniej przechodziło jako 4).
        expect(npc.calculateDamage([{ value: 8, type: "slashing", properties: new Set() }], {}).amount).to.equal(0);
        expect(npc.calculateDamage([{ value: 10, type: "slashing", properties: new Set() }], {}).amount).to.equal(5);
      });
    });
  });
}
