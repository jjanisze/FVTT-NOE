/**
 * Neuroshima 5e — postój: czyste zasady (PLAN_m5_postoj.md E0, §8 „postoj-zasady”).
 *
 * Warstwa 4: budżety doby (24 h, praca 10 h), sen NOE i WKK (wszystkie progi D20; odsypianie 12 h → 1,
 * 18 h → 2, 24 h → nadal 2), utrzymanie i woda (WKK D37), Praca (pasywna), Trening (300 h, Usługi speców),
 * plotki (10 → 1, 15 → 2, 24 → 3), hazard, koncert (przykład z s. 74: 15 na ulicy → 7 gb), rachunek,
 * WKK Bogaty (D38), przeskok (D19).
 *
 * Bez dokumentów — paczka nie dotyka świata.
 */

import { MODULE_ID } from "./helpers.mjs";
import {
  budzetDoby, skutkiSnu, kosztUtrzymania, pokrycieUtrzymania, wartoscPasywna, zarobekPracy, zarobekKoncertu,
  postepTreningu, postepBudowy, postepSzukania, liczbaInformacji, wynikHazardu, saldoRachunku, szansaBogaty, dzienBogaty,
  skutkiWody, najczystszaWoda, rozrywkaDajeFuksa, przeskok, UTRZYMANIE, MIEJSCA_KONCERTU, SEN_DOMYSLNY_H
} from "../config/postoj-rules.mjs";

const DZIEN = 86400;

export function registerPostojZasadyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.postoj-zasady`, context => {
    const { describe, it, expect } = context;

    describe("Doba i sen", function () {
      it("doba sumuje się do 24 h, praca ≤ 10 h; przekroczenie to linia, nie blokada", function () {
        const ok = budzetDoby({ sen: 8, zajecia: [{ godziny: 10, budzet: "praca" }, { godziny: 6, budzet: "czas" }] });
        expect(ok).to.include({ suma: 24, praca: 10, wolne: 0 });
        expect(ok.przekroczenia).to.deep.equal([]);
        const zle = budzetDoby({ sen: 8, zajecia: [{ godziny: 8, budzet: "praca" }, { godziny: 4, budzet: "praca" }, { godziny: 6, budzet: "czas" }] });
        expect(zle.przekroczenia).to.deep.equal([{ rodzaj: "doba", ile: 2 }, { rodzaj: "praca", ile: 2 }]);
        expect(budzetDoby({}).sen, "domyślny sen").to.equal(SEN_DOMYSLNY_H);
      });

      it("sen NOE (D20): ≥ 6 h DO, 4–5 h KO, 2–3 h bez korzyści, 0–1 h RO KON ST 20", function () {
        for (const h of [6, 8, 11, 12, 18, 24]) expect(skutkiSnu(h), `${h} h`).to.deep.equal({ korzysci: "DO", ro: null, odsypianie: 0, warstwa: null });
        for (const h of [4, 5]) expect(skutkiSnu(h), `${h} h`).to.deep.equal({ korzysci: "KO", ro: null, odsypianie: 0, warstwa: null });
        for (const h of [2, 3]) expect(skutkiSnu(h), `${h} h`).to.deep.equal({ korzysci: "brak", ro: null, odsypianie: 0, warstwa: null });
        for (const h of [0, 1]) expect(skutkiSnu(h), `${h} h`).to.deep.equal({ korzysci: "brak", ro: 20, odsypianie: 0, warstwa: "NOE" });
      });

      it("sen WKK (D20, D35): 4–5 h RO 10, 2–3 h RO 15, 0–1 h RO 20; odsypianie 12 h → 1, 18 h → 2, 24 h → nadal 2", function () {
        const k = { kobalt: true };
        expect(skutkiSnu(5, k)).to.deep.equal({ korzysci: "KO", ro: 10, odsypianie: 0, warstwa: "WKK" });
        expect(skutkiSnu(4, k).ro).to.equal(10);
        expect(skutkiSnu(3, k)).to.deep.equal({ korzysci: "brak", ro: 15, odsypianie: 0, warstwa: "WKK" });
        expect(skutkiSnu(2, k).ro).to.equal(15);
        expect(skutkiSnu(1, k).ro).to.equal(20);
        expect(skutkiSnu(6, k).odsypianie).to.equal(0);
        expect(skutkiSnu(11, k).odsypianie).to.equal(0);
        expect(skutkiSnu(12, k).odsypianie).to.equal(1);
        expect(skutkiSnu(17, k).odsypianie).to.equal(1);
        expect(skutkiSnu(18, k).odsypianie).to.equal(2);
        expect(skutkiSnu(24, k).odsypianie).to.equal(2);
      });
    });

    describe("Utrzymanie, woda, Bogaty", function () {
      it("utrzymanie (s. 47): 5 / 10 / 20 gb; Nędzny bez leków i z brudną wodą; dzicz — nic", function () {
        expect([kosztUtrzymania("nedzny"), kosztUtrzymania("normalny"), kosztUtrzymania("bogaty"), kosztUtrzymania(null)]).to.deep.equal([5, 10, 20, 0]);
        expect(pokrycieUtrzymania("nedzny")).to.deep.equal({ jedzenie: true, woda: "brudna", leki: false });
        expect(pokrycieUtrzymania("normalny")).to.deep.equal({ jedzenie: true, woda: "pitna", leki: true });
        expect(pokrycieUtrzymania("bogaty")).to.deep.equal({ jedzenie: true, woda: "filtrowana", leki: true });
        for (const u of Object.values(UTRZYMANIE)) expect(u.obraz).to.match(/^utrzymanie-/);
      });

      it("woda WKK (D37): brudna RO 10 → biegunka (chory nie rzuca), skażona RO 15; NOE — nic", function () {
        expect(skutkiWody("brudna")).to.equal(null);
        expect(skutkiWody("brudna", { kobalt: true })).to.include({ st: 10, choroba: "zakazna" });
        expect(skutkiWody("brudna", { kobalt: true, juzChoruje: true })).to.equal(null);
        expect(skutkiWody("skazona-rad", { kobalt: true })).to.include({ st: 15, wyczerpanie: "skazenie" });
        expect(skutkiWody("skazona-chem", { kobalt: true })).to.include({ st: 15, obrazenia: "1d6" });
        expect(skutkiWody("pitna", { kobalt: true })).to.equal(null);
        expect(najczystszaWoda(["brudna", "filtrowana", "pitna"])).to.equal("filtrowana");
        expect(najczystszaWoda(["skazona-rad", "brudna"])).to.equal("brudna");
      });

      it("WKK Bogaty (D38): 1/10, 1/9 … dzień 10 pewny; sukces zeruje licznik; NOE — nigdy", function () {
        expect(szansaBogaty(1)).to.equal(0);
        expect(szansaBogaty(1, { kobalt: true })).to.be.closeTo(1 / 10, 1e-9);
        expect(szansaBogaty(2, { kobalt: true })).to.be.closeTo(1 / 9, 1e-9);
        expect(szansaBogaty(9, { kobalt: true })).to.be.closeTo(1 / 2, 1e-9);
        expect(szansaBogaty(10, { kobalt: true })).to.equal(1);
        expect(dzienBogaty({ n: 0, u: 0.05 }, { kobalt: true })).to.deep.equal({ fuks: true, n: 0 });
        expect(dzienBogaty({ n: 0, u: 0.5 }, { kobalt: true })).to.deep.equal({ fuks: false, n: 1 });
        expect(dzienBogaty({ n: 9, u: 0.999 }, { kobalt: true })).to.deep.equal({ fuks: true, n: 0 });
      });
    });

    describe("Zajęcia i rachunek", function () {
      it("Praca (s. 47): 1 gb × pasywna za 10 h, proporcjonalnie w dół; pasywna jak dnd5e", function () {
        expect(wartoscPasywna({ mod: 2, pb: 2, bieglosc: 1 })).to.equal(14);
        expect(wartoscPasywna({ mod: 2, pb: 2, bieglosc: 2, ulatwienie: true })).to.equal(21);
        expect(zarobekPracy({ pasywna: 14, godziny: 10 })).to.equal(14);
        expect(zarobekPracy({ pasywna: 14, godziny: 5 })).to.equal(7);
        expect(zarobekPracy({ pasywna: 13, godziny: 5 })).to.equal(6);
        expect(zarobekPracy({ pasywna: 14, godziny: 14 }), "ponad 10 h nie płaci").to.equal(14);
      });

      it("koncert (s. 74): 15 na ulicy → 7 gb; w drogim klubie sześć razy tyle", function () {
        expect(zarobekKoncertu({ wynik: 15, miejsce: "ulica" })).to.equal(7);
        expect(zarobekKoncertu({ wynik: 15, miejsce: "drogi-klub" })).to.equal(45);
        expect(Object.values(MIEJSCA_KONCERTU).map(m => m.mnoznik)).to.deep.equal([0.5, 1, 2, 3]);
      });

      it("Trening (s. 47): 300 h, 1 gb/h × Usługi speców (Nowy Jork 25%)", function () {
        expect(postepTreningu({ dotychczas: 290, godziny: 10 })).to.deep.equal({ godziny: 300, zostalo: 0, ukonczony: true, koszt: 10 });
        expect(postepTreningu({ dotychczas: 0, godziny: 10, region: "nowy-jork" }).koszt).to.equal(2.5);
        expect(postepTreningu({ dotychczas: 295, godziny: 10 }).godziny, "nie ponad 300").to.equal(300);
        expect(postepBudowy({ dotychczas: 90, godziny: 10, wymagane: 100 })).to.include({ godziny: 100, ukonczona: true, koszt: 10 });
        expect(postepSzukania({ dotychczas: 20, godziny: 10 })).to.include({ godziny: 24, ukonczone: true });
      });

      it("plotki (s. 47): 9 → 0, 10 → 1, 15 → 2, 24 → 3", function () {
        expect([9, 10, 14, 15, 24].map(liczbaInformacji)).to.deep.equal([0, 1, 1, 2, 3]);
      });

      it("hazard (s. 47): ST 20 — sukces podwaja (zarobek = stawka), porażka zabiera stawkę", function () {
        expect(wynikHazardu({ wynik: 20, stawka: 30 })).to.deep.equal({ wygrana: true, zarobek: 30, strata: 0 });
        expect(wynikHazardu({ wynik: 19, stawka: 30 })).to.deep.equal({ wygrana: false, zarobek: 0, strata: 30 });
      });

      it("rozrywka (s. 47): miasteczko i miasto, 10 h, ≥ 50 gb", function () {
        expect(rozrywkaDajeFuksa({ rodzaj: "miasto", godziny: 10, gb: 50 })).to.equal(true);
        expect(rozrywkaDajeFuksa({ rodzaj: "wioska", godziny: 10, gb: 50 })).to.equal(false);
        expect(rozrywkaDajeFuksa({ rodzaj: "miasto", godziny: 9, gb: 50 })).to.equal(false);
        expect(rozrywkaDajeFuksa({ rodzaj: "miasto", godziny: 10, gb: 49 })).to.equal(false);
      });

      it("rachunek (D18): saldo z kosztów i zarobków; ujemne oznaczone", function () {
        const s = saldoRachunku([
          { rodzaj: "koszt", kwota: 10, opis: "utrzymanie" },
          { rodzaj: "zarobek", kwota: 14, opis: "praca" },
          { rodzaj: "koszt", kwota: 5, opis: "plotki" }
        ]);
        expect(s).to.deep.equal({ koszty: 15, zarobki: 14, saldo: -1, ujemne: true });
        expect(saldoRachunku([]).saldo).to.equal(0);
      });
    });

    describe("Przeskok (D19)", function () {
      it("30 dób: rachunek × 30, Trening, Robota, Wyczerpanie, wygasające Fuksy", function () {
        const p = przeskok({
          dni: 30,
          plan: { utrzymanie: "normalny", praca: { godziny: 0, pasywna: 14 }, trening: { godziny: 10 }, robota: { godziny: 0 } },
          stan: { trening: { godziny: 0 }, wyczerpanie: { zwykle: 2, bezsennosc: 1 }, fuksy: [{ wygasa: 7 * DZIEN }, { wygasa: null }], teraz: 0, region: "nowy-jork" }
        });
        expect(p.rachunek.koszty, "(10 + 2,5) × 30").to.equal(375);
        expect(p.trening).to.include({ godziny: 300, ukonczony: true });
        expect(p.wyczerpanie.zwykleZdjete, "NOE: Bezsenność to zwykły poziom").to.equal(3);
        expect(p.fuksyWygasna).to.equal(1);
        expect(p.sekundy).to.equal(30 * DZIEN);
        const q = przeskok({
          dni: 30,
          plan: { utrzymanie: "normalny", trening: { godziny: 10 }, budowa: { godziny: 2 } },
          stan: { trening: { godziny: 200 }, budowa: { godziny: 0, wymagane: 10 }, region: "nowy-jork" }
        });
        expect(q.rachunek.koszty, "trening kończy się po 10 dobach, budowa po 5 — dalej nie kosztują").to.equal(10 * 30 + 2.5 * 10 + 10);
      });

      it("WKK: Bezsenność schodzi odsypianiem (poziom na dobę); Bogaty — Fuks co 10 dób, zostaje z ostatnich 7", function () {
        const p = przeskok({ dni: 25, plan: { utrzymanie: "bogaty" }, stan: { wyczerpanie: { zwykle: 1, bezsennosc: 2 }, bogatyN: 0 }, kobalt: true });
        expect(p.wyczerpanie).to.deep.equal({ zwykleZdjete: 1, bezsennoscZdjeta: 2, dobOdsypiania: 2 });
        expect(p.bogaty, "dzień 20 z 25 — w ostatnich 7").to.deep.equal({ fuksow: 2, nPo: 5, zostaje: true, dzienOstatniego: 20 });
        const q = przeskok({ dni: 28, plan: { utrzymanie: "bogaty" }, stan: { bogatyN: 0 }, kobalt: true });
        expect(q.bogaty.zostaje, "dzień 20 z 28 — wygasł").to.equal(false);
        expect(przeskok({ dni: 22, plan: { utrzymanie: "bogaty" }, stan: {} }).bogaty, "NOE").to.equal(null);
      });

      it("Robota: minuty pracy × doby; ukończona przy zerze", function () {
        const p = przeskok({ dni: 5, plan: { robota: { godziny: 4 } }, stan: { robota: { zostaloMinut: 1000 } } });
        expect(p.robota).to.deep.equal({ minuty: 1200, zostalo: 0, ukonczona: true });
      });
    });
  }, { displayName: "Neuroshima: Postój — czyste zasady (M5)" });
}
