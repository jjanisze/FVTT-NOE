/**
 * Neuroshima 5e — umieranie: czyste zasady (PLAN_m1_walka.md E0).
 *
 * Warstwa 1 (tabele): przyczyny śmierci ze stroną podręcznika.
 * Warstwa 4 (predykaty): porażki przy 0 PW (wręcz: dwie), Olbrzymie obrażenia (przykład z
 * podręcznika), maks. PW = 0, Rzut Przeciw Śmierci (1, 20, trzy sukcesy, trzy porażki), stan
 * maszyny, zagrożenia (oddech, mróz, sen).
 *
 * Bez dokumentów — paczka nie dotyka świata. Haki i karty: e2e `umieranie` (warstwa 6).
 */

import {
  PRZYCZYNY_SMIERCI, RZUT_PRZECIW_SMIERCI, porazkiZaObrazenia, olbrzymieObrazenia, smiercZMaksPW,
  stabilnyGodziny, poRzucie, stanUmierania, oddechTur, stMrozu, stSnu, poTurzeOddechu, planMrozu
} from "../config/umieranie-rules.mjs";
import { MODULE_ID } from "./helpers.mjs";

export function registerUmieranieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.umieranie`, context => {
    const { describe, it, expect } = context;

    describe("Tabele", function () {
      it("każda przyczyna śmierci ma etykietę i stronę podręcznika", function () {
        for (const [id, p] of Object.entries(PRZYCZYNY_SMIERCI)) {
          expect(p.label, id).to.be.a("string").and.not.empty;
          expect(p.strona, id).to.match(/^s\. \d/);
        }
      });

      it("Ostatnia akcja tylko przy trzech porażkach (s. 34)", function () {
        const z = Object.entries(PRZYCZYNY_SMIERCI).filter(([, p]) => p.ostatniaAkcja).map(([id]) => id);
        expect(z).to.deep.equal(["rzuty"]);
      });

      it("Rzut Przeciw Śmierci: ST 10, tor trzech", function () {
        expect(RZUT_PRZECIW_SMIERCI).to.deep.equal({ st: 10, tor: 3 });
      });
    });

    describe("Obrażenia przy 0 PW (s. 34)", function () {
      it("jedna porażka; atak wręcz — dwie", function () {
        expect(porazkiZaObrazenia({ pwPrzed: 0, obrazenia: 3 })).to.equal(1);
        expect(porazkiZaObrazenia({ pwPrzed: 0, obrazenia: 3, wrecz: true })).to.equal(2);
      });

      it("cios, który dopiero zbija do 0, nie daje porażki", function () {
        expect(porazkiZaObrazenia({ pwPrzed: 4, obrazenia: 9, wrecz: true })).to.equal(0);
      });

      it("zero obrażeń i leczenie nie dają porażki", function () {
        expect(porazkiZaObrazenia({ pwPrzed: 0, obrazenia: 0 })).to.equal(0);
        expect(porazkiZaObrazenia({ pwPrzed: 0, obrazenia: -5 })).to.equal(0);
      });
    });

    describe("Natychmiastowa śmierć (s. 34)", function () {
      it("przykład z podręcznika: maks. 20 PW, 40 obrażeń naraz — śmierć; 39 — nie", function () {
        expect(olbrzymieObrazenia({ obrazenia: 40, maksPW: 20 })).to.equal(true);
        expect(olbrzymieObrazenia({ obrazenia: 39, maksPW: 20 })).to.equal(false);
      });

      it("maks. PW 0 to osobna przyczyna, nie Olbrzymie obrażenia", function () {
        expect(olbrzymieObrazenia({ obrazenia: 5, maksPW: 0 })).to.equal(false);
        expect(smiercZMaksPW(0)).to.equal(true);
        expect(smiercZMaksPW(-3)).to.equal(true);
        expect(smiercZMaksPW(1)).to.equal(false);
        expect(smiercZMaksPW(undefined), "brak danych to nie śmierć").to.equal(false);
      });

      it("stabilny odzyskuje 1 PW po 1k8 h (NOE, nie 1k4 z 5e)", function () {
        expect(stabilnyGodziny()).to.equal("1d8");
      });
    });

    describe("Rzut Przeciw Śmierci — czysta k20 (s. 34)", function () {
      it("10+ to sukces, 9 to porażka", function () {
        expect(poRzucie({ wynik: 10 })).to.deep.equal({ sukcesy: 1, porazki: 0, zdarzenie: null });
        expect(poRzucie({ wynik: 9 })).to.deep.equal({ sukcesy: 0, porazki: 1, zdarzenie: null });
      });

      it("1 — dwie porażki; 20 — 1 PW i czysty tor", function () {
        expect(poRzucie({ wynik: 1, porazki: 0 }).porazki).to.equal(2);
        expect(poRzucie({ wynik: 20, sukcesy: 1, porazki: 2 })).to.deep.equal({ sukcesy: 0, porazki: 0, zdarzenie: "pw1" });
      });

      it("trzeci sukces — stabilny i tor od zera; trzecia porażka — śmierć", function () {
        expect(poRzucie({ wynik: 15, sukcesy: 2, porazki: 2 })).to.deep.equal({ sukcesy: 0, porazki: 0, zdarzenie: "stabilny" });
        expect(poRzucie({ wynik: 5, sukcesy: 2, porazki: 2 })).to.deep.equal({ sukcesy: 2, porazki: 3, zdarzenie: "smierc" });
        expect(poRzucie({ wynik: 1, porazki: 2 }).porazki, "tor nie wychodzi poza 3").to.equal(3);
      });
    });

    describe("Stan maszyny umierania (§7.2)", function () {
      it("martwy wygrywa; PW > 0 to przytomność; 0 PW — umierający albo stabilny", function () {
        expect(stanUmierania({ pw: 5, martwy: true })).to.equal("martwy");
        expect(stanUmierania({ pw: 1 })).to.equal("przytomny");
        expect(stanUmierania({ pw: 1, stabilny: true }), "stabilny z PW to już przytomny").to.equal("przytomny");
        expect(stanUmierania({ pw: 0 })).to.equal("umierajacy");
        expect(stanUmierania({ pw: 0, stabilny: true })).to.equal("stabilny");
      });
    });

    describe("Zagrożenia (s. 45, 258–259)", function () {
      it("oddech: 1 + mod. KON minut w turach po 6 s, minimum 30 s", function () {
        expect(oddechTur(0)).to.equal(10);
        expect(oddechTur(2)).to.equal(30);
        expect(oddechTur(-1), "0 minut → minimum 30 s").to.equal(5);
        expect(oddechTur(-4)).to.equal(5);
      });

      it("mróz: ST 5 + 1 za każdy °C poniżej zera; bez mrozu — bez rzutu", function () {
        expect(stMrozu(-1)).to.equal(6);
        expect(stMrozu(-12)).to.equal(17);
        expect(stMrozu(0)).to.equal(null);
        expect(stMrozu(15)).to.equal(null);
      });

      it("doba bez snu: ST 20", function () {
        expect(stSnu()).to.equal(20);
      });

      it("uduszenie po turze: odliczanie; koniec powietrza — od następnej tury +1 Wyczerpanie co turę", function () {
        expect(poTurzeOddechu({ faza: "oddech", tury: 3 })).to.deep.equal({ faza: "oddech", tury: 2, wyczerpanie: false });
        expect(poTurzeOddechu({ faza: "oddech", tury: 1 })).to.deep.equal({ faza: "dusi", tury: 0, wyczerpanie: false });
        expect(poTurzeOddechu({ faza: "dusi" })).to.deep.equal({ faza: "dusi", tury: 0, wyczerpanie: true });
      });

      it("mróz: ciepło ubrany i dodatnia temperatura — nic; śpiwór — automatycznie; koc — Ułatwienie", function () {
        expect(planMrozu({ tempC: -8, godziny: 3 })).to.deep.equal({ st: 13, rzuty: 3, automatycznie: false, tryb: 0 });
        expect(planMrozu({ tempC: -8, godziny: 3, cieplo: true }).rzuty).to.equal(0);
        expect(planMrozu({ tempC: 4, godziny: 3 }).rzuty).to.equal(0);
        expect(planMrozu({ tempC: -8, godziny: 2, spiwor: true, koc: true })).to.deep.equal({ st: 13, rzuty: 2, automatycznie: true, tryb: 0 });
        expect(planMrozu({ tempC: -8, godziny: 2, koc: true }).tryb).to.equal(1);
      });
    });
  }, { displayName: "Neuroshima: Umieranie — czyste zasady (M1)" });
}
