/**
 * Neuroshima 5e — Fuksy v2: czyste zasady (PLAN_m5_postoj.md E0, §8 „fuksy-zasady”).
 *
 * Warstwa 4: przyznanie z terminem ze źródła, odmowa przy 3 (s. 17), zamiana najkrócej ważnego, zużycie
 * najwcześniej wygasającego (trwałe na końcu), wygasanie na zegarze, koniec sesji, migracja z liczby (B2),
 * normalizacja śmieci, dymek.
 *
 * Bez dokumentów — paczka nie dotyka świata.
 */

import { MODULE_ID } from "./helpers.mjs";
import {
  MAX_FUKSY, ZRODLA_FUKSOW, nowyFuks, przyznaj, zamienNajkrocejWazny, zuzyj, wygasle, koniecSesji, migruj, normalizuj,
  jestTrwaly, opisFuksa
} from "../config/fuksy-rules.mjs";

const H = 3600, D = 86400;

export function registerFuksyZasadyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.fuksy-zasady`, context => {
    const { describe, it, expect } = context;

    describe("Źródła i przyznanie", function () {
      it("terminy z RAW: Fant i Nagroda publiczności trwałe, Gotowanie i Pieśń 24 h, Rozrywka i WKK Bogaty 7 dni", function () {
        expect(ZRODLA_FUKSOW.fant.termin).to.equal(null);
        expect(ZRODLA_FUKSOW.publicznosc.termin).to.equal(null);
        expect(ZRODLA_FUKSOW.gotowanie.termin).to.equal(24 * H);
        expect(ZRODLA_FUKSOW.piesn.termin).to.equal(24 * H);
        expect(ZRODLA_FUKSOW.rozrywka.termin).to.equal(7 * D);
        expect(ZRODLA_FUKSOW.bogaty.termin).to.equal(7 * D);
        expect(ZRODLA_FUKSOW.bogaty.wkk).to.equal(true);
        expect(MAX_FUKSY).to.equal(3);
      });

      it("przyznanie ustawia termin od teraz; trwały nie wygasa", function () {
        const { lista, fuks, odmowa } = przyznaj([], "rozrywka", 1000);
        expect(odmowa).to.equal(null);
        expect(fuks).to.include({ zrodlo: "rozrywka", wygasa: 1000 + 7 * D, nadano: 1000 });
        expect(lista).to.have.length(1);
        expect(jestTrwaly(nowyFuks("fant", 0))).to.equal(true);
        expect(jestTrwaly(fuks)).to.equal(false);
        expect(nowyFuks("mg", 0, { termin: 2 * H }).wygasa, "MG wybiera termin").to.equal(2 * H);
      });

      it("przy komplecie — odmowa (RAW), lista bez zmian; zamiana wypycha najkrócej ważny", function () {
        let l = [];
        for (const z of ["fant", "rozrywka", "gotowanie"]) l = przyznaj(l, z, 0).lista;
        const r = przyznaj(l, "piesn", 0);
        expect(r.odmowa).to.equal("komplet");
        expect(r.lista).to.have.length(3);
        const z = zamienNajkrocejWazny(l, "piesn", 10);
        expect(z.usuniety.zrodlo, "Gotowanie wygasa najwcześniej").to.equal("gotowanie");
        expect(z.lista.map(f => f.zrodlo)).to.have.members(["fant", "rozrywka", "piesn"]);
      });
    });

    describe("Zużycie, wygasanie, migracja", function () {
      it("zużycie: najpierw najwcześniej wygasający, trwały na końcu, remis — starszy", function () {
        const l = [nowyFuks("fant", 0, { id: "a" }), nowyFuks("rozrywka", 0, { id: "b" }), nowyFuks("gotowanie", 5, { id: "c" })];
        const r1 = zuzyj(l);
        expect(r1.zuzyty.id).to.equal("c");
        const r2 = zuzyj(r1.lista);
        expect(r2.zuzyty.id).to.equal("b");
        const r3 = zuzyj(r2.lista);
        expect(r3.zuzyty.id).to.equal("a");
        expect(zuzyj(r3.lista).zuzyty).to.equal(null);
        const remis = [nowyFuks("gotowanie", 100, { id: "nowszy" }), { ...nowyFuks("gotowanie", 50, { id: "starszy" }), wygasa: 100 + D }];
        expect(zuzyj(remis).zuzyty.id).to.equal("starszy");
      });

      it("wygasanie na zegarze: termin ≤ teraz; trwałe zostają", function () {
        const l = [nowyFuks("fant", 0, { id: "t" }), nowyFuks("gotowanie", 0, { id: "g" }), nowyFuks("rozrywka", 0, { id: "r" })];
        expect(wygasle(l, D - 1).wygasle).to.deep.equal([]);
        const po = wygasle(l, D);
        expect(po.wygasle.map(f => f.id)).to.deep.equal(["g"]);
        expect(wygasle(l, 30 * D).zostaja.map(f => f.id)).to.deep.equal(["t"]);
      });

      it("koniec sesji (Kolory, po becie) zdejmuje tylko „do końca sesji”", function () {
        const l = [nowyFuks("sesja", 0, { id: "s" }), nowyFuks("fant", 0, { id: "f" })];
        expect(koniecSesji(l).wygasle.map(f => f.id)).to.deep.equal(["s"]);
      });

      it("migracja: liczba N → N trwałych „sprzed M5”, najwyżej 3; flaga liczbowa normalizuje się tak samo", function () {
        expect(migruj(2).map(f => f.zrodlo)).to.deep.equal(["przedM5", "przedM5"]);
        expect(migruj(2).every(jestTrwaly)).to.equal(true);
        expect(migruj(7)).to.have.length(3);
        expect(migruj(0)).to.deep.equal([]);
        expect(normalizuj(2)).to.have.length(2);
        expect(normalizuj(undefined)).to.deep.equal([]);
        expect(normalizuj([null, 5, { zrodlo: "fant", wygasa: null }])).to.have.length(1);
      });

      it("dymek z pochodzeniem i terminem (D15)", function () {
        expect(opisFuksa(nowyFuks("fant", 0, { etykieta: "Fuks od wypicia Neuro-Coli" }))).to.equal("Fuks: Fuks od wypicia Neuro-Coli — bezterminowy");
        expect(opisFuksa(nowyFuks("rozrywka", 0), s => `${s / D} d`)).to.equal("Fuks: Rozrywka — do 7 d");
      });
    });
  }, { displayName: "Neuroshima: Fuksy — czyste zasady (M5)" });
}
