/**
 * Neuroshima 5e — woda i wspinaczka (PLAN_m6_drobne_zasady.md §5.6, E6).
 *
 * Warstwa 1: `config/woda-rules.mjs` (ST nurtu, test na początku tury tylko w walce — U15, skutek testu, zacięcie,
 * połowa obrażeń, wspinaczka) i wiersze „pod wodą” silnika okoliczności (s. 255–256). Warstwa 2 (aktor testowy):
 * Tonie zeruje Szybkość, Pod wodą zaczyna i kończy wstrzymany oddech, nurkujący z własnej woli zostaje pod wodą.
 * Region, karty i połowa obrażeń z tacki — e2e `woda`.
 */

import {
  NURTY, POD_WODA, TONIE, stNurtu, testNaPoczatkuTury, poTescie, progZaciecia, polowaObrazen, testWspinaczki
} from "../config/woda-rules.mjs";
import { rozstrzygnijOkolicznosci } from "../config/okolicznosci-ataku.mjs";
import { uczestnik } from "../combat/okolicznosci.mjs";
import { zastosujTest, wynurz } from "../scenes/woda.mjs";
import { efektUduszenia } from "../actors/zagrozenia.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, waitFor } from "./helpers.mjs";

const u = (stany = [], extra = {}) => ({ stany: new Set(stany), szybkosc0: false, ...extra });

export function registerWodaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.woda`, context => {
    const { describe, it, after, expect } = context;

    describe("Zasady (s. 255–256)", function () {
      it("ST nurtu: 10 / 15 / 20 / 25, nieznany — spokojna", function () {
        expect(Object.values(NURTY).map(n => n.st)).to.deep.equal([10, 15, 20, 25]);
        expect(stNurtu("wir")).to.equal(25);
        expect(stNurtu("nic")).to.equal(10);
      });
      it("test na początku tury: głęboka woda, walka, bez Szybkości pływania (U15)", function () {
        expect(testNaPoczatkuTury({ glebokosc: "gleboka", walka: true, plywa: false })).to.equal(true);
        expect(testNaPoczatkuTury({ glebokosc: "gleboka", walka: false, plywa: false }), "poza walką — MG").to.equal(false);
        expect(testNaPoczatkuTury({ glebokosc: "plytka", walka: true, plywa: false })).to.equal(false);
        expect(testNaPoczatkuTury({ glebokosc: "gleboka", walka: true, plywa: true })).to.equal(false);
      });
      it("skutek testu: porażka — Tonie i pod wodę, sukces — Tonie schodzi, wypływa", function () {
        expect(poTescie(false)).to.deep.equal({ tonie: true, zanurza: true, wynurza: false });
        expect(poTescie(true)).to.deep.equal({ tonie: false, zanurza: false, wynurza: true });
      });
      it("zacięcie: zanurzona broń ≤ 5, inaczej pechowa 1; połowa obrażeń", function () {
        expect(progZaciecia(true)).to.equal(5);
        expect(progZaciecia(false)).to.equal(1);
        expect(polowaObrazen({ palna: true, atakujacyPodWoda: true })).to.equal(true);
        expect(polowaObrazen({ palna: true, celPodWoda: true }), "strzał znad wody — bez połowy (RAW)").to.equal(false);
        expect(polowaObrazen({ miotana: true, celPodWoda: true })).to.equal(true);
        expect(polowaObrazen({ miotana: true })).to.equal(false);
      });
      it("wspinaczka: ST 10, dwie wolne ręce, ciężki plecak — Utrudnienie", function () {
        expect(testWspinaczki({})).to.deep.equal({ st: 10, utrudnienie: false, rece: true });
        expect(testWspinaczki({ wolneRece: 1, ciezkiPlecak: true, st: 15 })).to.deep.equal({ st: 15, utrudnienie: true, rece: false });
      });
    });

    describe("Walka pod wodą — silnik okoliczności", function () {
      const r = s => rozstrzygnijOkolicznosci({ wrecz: false, odleglosc: 2, zasieg: { normalny: 30, daleki: 90 }, ...s });
      const ids = w => [...w.utrudnienia, ...w.uwagi].map(x => x.id);
      it("strzał spod wody: Utrudnienie i uwaga 30 cm", function () {
        const w = r({ atakujacy: u([POD_WODA]), cel: u(), bron: { typ: "palnaKrotka", wlasciwosci: [] } });
        expect(ids(w)).to.include("podWodaPalna").and.include("podWodaPalnaZasieg");
      });
      it("znad wody w zanurzony cel: Utrudnienie i uwaga o głębokości", function () {
        const w = r({ atakujacy: u(), cel: u([POD_WODA]), bron: { typ: "palnaDluga", wlasciwosci: [] } });
        expect(ids(w)).to.include("znadWodyPalna").and.include("znadWodyGleboko").and.not.include("podWodaPalna");
      });
      it("miotana i rzucana w zanurzony cel; rzucony nóż też", function () {
        expect(ids(r({ atakujacy: u(), cel: u([POD_WODA]), bron: { typ: "miotana", wlasciwosci: [] } }))).to.include("podWodaMiotana");
        expect(ids(r({ atakujacy: u(), cel: u([POD_WODA]), bron: { typ: "biala", rzut: true, wlasciwosci: [] } }))).to.include("podWodaMiotana");
      });
      it("wręcz w zanurzony cel: Utrudnienie, chyba że atakujący pływa", function () {
        const wr = s => rozstrzygnijOkolicznosci({ wrecz: true, odleglosc: 1, ...s });
        expect(wr({ atakujacy: u(), cel: u([POD_WODA]) }).utrudnienia.map(x => x.id)).to.include("podWodaWrecz");
        expect(wr({ atakujacy: u([], { plywa: true }), cel: u([POD_WODA]) }).utrudnienia.map(x => x.id)).to.not.include("podWodaWrecz");
      });
      it("bez wody — żaden wiersz", function () {
        const w = r({ atakujacy: u(), cel: u(), bron: { typ: "palnaKrotka", wlasciwosci: [] } });
        expect(ids(w).filter(id => /Wod|wod/.test(id))).to.deep.equal([]);
      });
    });

    describe("Statusy (warstwa 2)", function () {
      after(scratchCleanup);

      it("porażka testu: Tonie (Szybkość 0) i Pod wodą z wstrzymanym oddechem; sukces — wypływa i oddycha", async function () {
        const a = await scratchActor({ type: "character", system: { attributes: { movement: { speeds: { walk: 9 } } } } });
        await zastosujTest(a, false);
        expect(a.statuses.has(TONIE)).to.equal(true);
        expect(a.statuses.has(POD_WODA)).to.equal(true);
        expect(Number(a.system.attributes.movement.speeds.walk), "Tonie — `noMovement`").to.equal(0);
        expect(uczestnik(a).szybkosc0).to.equal(true);
        await waitFor(() => efektUduszenia(a), { label: "wstrzymany oddech" });
        await zastosujTest(a, true);
        expect(a.statuses.has(TONIE)).to.equal(false);
        expect(a.statuses.has(POD_WODA)).to.equal(false);
        await waitFor(() => !efektUduszenia(a), { label: "oddech wraca" });
      });

      it("nurkujący z własnej woli: zdany test go nie wynurza; wyjście z wody — tak", async function () {
        const a = await scratchActor({ type: "character" });
        await a.toggleStatusEffect(POD_WODA, { active: true });
        await waitFor(() => efektUduszenia(a), { label: "wstrzymany oddech" });
        await zastosujTest(a, true);
        expect(a.statuses.has(POD_WODA)).to.equal(true);
        await wynurz(a);
        expect(a.statuses.has(POD_WODA)).to.equal(false);
        await waitFor(() => !efektUduszenia(a), { label: "oddech wraca" });
      });

      it("Uduszenie spoza wody zostaje po wynurzeniu", async function () {
        const a = await scratchActor({ type: "character" });
        await game.neuroshima.zagrozenia.wstrzymajOddech(a);
        await a.toggleStatusEffect(POD_WODA, { active: true });
        await wynurz(a);
        await new Promise(r => setTimeout(r, 200));
        expect(efektUduszenia(a), "gaz, nie woda").to.not.equal(null);
      });

      it("uczestnik: Szybkość pływania", async function () {
        const a = await scratchActor({ type: "npc", system: { attributes: { movement: { speeds: { walk: 9, swim: 9 } } } } });
        expect(uczestnik(a).plywa).to.equal(true);
      });
    });
  });
}
