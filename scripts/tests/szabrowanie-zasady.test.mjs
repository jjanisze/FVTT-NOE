/**
 * Neuroshima 5e — szabrowanie, losowe przedmioty, Fanty: czyste zasady (PLAN_m5_postoj.md E0, §8).
 *
 * Warstwa 1: domknięcia k100 (losowe przedmioty, kolumny k100 tabel sprzętu, Fanty z erratum 85), k12 i k10;
 * odwołania do katalogu i Bestiariusza; ruiny = s. 271.
 * Warstwa 4: czas ÷ N, podział rodzajów, ≥ 20 i nat. 20, komplikacja w ukryciu, rekurencja „rzuć dwa razy”,
 * ważenie dostępnością (rozkład w 10 000 losowań), Zdobyczna apteczka.
 *
 * Bez dokumentów — paczka nie dotyka świata.
 */

import { MODULE_ID } from "./helpers.mjs";
import {
  RUINY, KOMPLIKACJE, LOSOWE_PRZEDMIOTY, TABELE_K100, TABELE_K12, czasSzabrowania, podzialRodzajow, zdobycz,
  rzucKomplikacje, losujPrzedmiot, pozycjeKategorii, zdobycznaApteczka
} from "../config/szabrowanie-data.mjs";
import { FANTY, fantDla, idFantu, losujFanty, KILKUOSOBOWE } from "../config/fanty-data.mjs";
import { bledyDomkniecia, rngZZiarna, rngZKosci } from "../config/losowanie.mjs";
import { KATALOG } from "../config/recipes-data.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";

const KAT = () => [...KATALOG.values()];

export function registerSzabrowanieZasadyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.szabrowanie-zasady`, context => {
    const { describe, it, expect } = context;

    describe("Tabele (warstwa 1)", function () {
      it("Tabela losowych przedmiotów (s. 271) domyka k100", function () {
        expect(bledyDomkniecia(LOSOWE_PRZEDMIOTY)).to.deep.equal([]);
      });

      it("każda kolumna k100 (s. 130–144) domyka k100, k12 domyka k12; odwołania istnieją w katalogu", function () {
        for (const [id, t] of Object.entries(TABELE_K100)) {
          expect(bledyDomkniecia(t.wiersze), id).to.deep.equal([]);
          for (const w of t.wiersze) if (w.ref) expect(KATALOG.has(w.ref), `${id}: ${w.nazwa} → ${w.ref}`).to.equal(true);
          for (const w of t.wiersze) if (!w.ref && !w.rzucDwa) expect(w.cena, `${id}: ${w.nazwa} bez ceny`).to.be.a("number");
        }
        for (const [id, t] of Object.entries(TABELE_K12)) {
          expect(bledyDomkniecia(t.wiersze, 12), id).to.deep.equal([]);
          for (const w of t.wiersze) if (w.istota) expect(BESTIARY, `${id}: ${w.nazwa}`).to.have.property(w.istota);
        }
      });

      it("Tabela Fantów domyka k100 z erratum 81–85 (druk nie ma 85) i wynikiem 100 — rzuć dwa razy", function () {
        expect(bledyDomkniecia([...FANTY, { od: 100, do: 100, nazwa: "rzuć dwa razy" }])).to.deep.equal([]);
        expect(fantDla(85).nazwa).to.equal("CD z muzyką rozrywkową");
        expect(fantDla(85).erratum).to.be.a("string");
        expect(fantDla(100)).to.equal(null);
        expect(new Set(FANTY.map(idFantu)).size, "id unikalne").to.equal(FANTY.length);
        expect(KILKUOSOBOWE, "gry, nagrania, przedwojenny alkohol").to.include.members(["gra-planszowa", "kaseta-vhs-film-akcji", "przedwojenna-wodka"]);
      });

      it("Tabela komplikacji (s. 270): k10 domknięte, mieszkańcy k4 → istniejące wpisy Bestiariusza", function () {
        expect(KOMPLIKACJE.map(k => k.k10)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        for (const k of KOMPLIKACJE.filter(k => k.mieszkancy)) {
          expect(k.mieszkancy.map(m => m.k4), k.label).to.deep.equal([1, 2, 3, 4]);
          for (const m of k.mieszkancy) expect(BESTIARY, `${k.label} k4=${m.k4}`).to.have.property(m.istota);
        }
      });

      it("ruiny (s. 271): siedem rodzajów, czasy i szanse komplikacji z druku", function () {
        const oczek = { apteka: [30, 20], biuro: [15, 10], magazyn: [120, 60], piwnica: [30, 30], sklepik: [60, 40], warsztat: [60, 50], wrak: [60, 60] };
        expect(Object.keys(RUINY)).to.have.members(Object.keys(oczek));
        for (const [id, [min, k]] of Object.entries(oczek)) expect([RUINY[id].minuty, RUINY[id].komplikacje], id).to.deep.equal([min, k]);
        expect(RUINY.wrak.surowce).to.deep.equal({ CH: "4d8", MK: "6d20", CE: "3d6", CZ: "4d10" });
      });
    });

    describe("Szabrowanie (warstwa 4)", function () {
      it("czas ÷ liczba szukających (D12); podział rodzajów po kolei", function () {
        expect(czasSzabrowania(RUINY.magazyn, 1)).to.equal(120);
        expect(czasSzabrowania(RUINY.magazyn, 3)).to.equal(40);
        expect(podzialRodzajow(["a"])).to.deep.equal({ a: ["CZ", "CH", "CE", "MK"] });
        expect(podzialRodzajow(["a", "b"])).to.deep.equal({ a: ["CZ", "CE"], b: ["CH", "MK"] });
        expect(Object.values(podzialRodzajow(["a", "b", "c", "d", "e"])).flat()).to.have.length(4);
      });

      it("zdobycz: porażka nic, sukces kości, ≥ 20 podwójnie i przedmiot, nat. 20 — Fant", function () {
        expect(zdobycz({ ruina: RUINY.warsztat, rodzaje: ["CZ"], wynik: 9, rzuty: { CZ: 20 } }).sukces).to.equal(false);
        expect(zdobycz({ ruina: RUINY.warsztat, rodzaje: ["CZ", "CE"], wynik: 12, rzuty: { CZ: 20, CE: 7 } }))
          .to.deep.equal({ sukces: true, surowce: { CZ: 20, CE: 7 }, przedmiot: false, fant: false, mnoznik: 1 });
        expect(zdobycz({ ruina: RUINY.warsztat, rodzaje: ["CZ"], wynik: 20, rzuty: { CZ: 20 } }))
          .to.deep.equal({ sukces: true, surowce: { CZ: 40 }, przedmiot: true, fant: false, mnoznik: 2 });
        expect(zdobycz({ ruina: RUINY.warsztat, rodzaje: ["CZ"], wynik: 25, nat20: true, rzuty: { CZ: 20 } }).fant).to.equal(true);
      });

      it("komplikacja w ukryciu: k100 > szansa — nic; wymuszona sieć — bez mieszkańców; mieszkańcy z k4 i liczbą", function () {
        expect(rzucKomplikacje(RUINY.biuro, rngZKosci([11], 100)).jest).to.equal(false);
        expect(rzucKomplikacje(RUINY.biuro, rngZKosci([10], 100)).jest).to.equal(true);
        const siec = rzucKomplikacje(RUINY.warsztat, rngZZiarna(1), { wymus: 6 });
        expect(siec.komplikacja.id).to.equal("pulapka-siec");
        expect(siec.mieszkancy).to.equal(null);
        for (let i = 0; i < 50; i++) {
          const m = rzucKomplikacje(RUINY.magazyn, rngZZiarna(i), { wymus: 10 });
          expect(BESTIARY).to.have.property(m.mieszkancy.istota);
          expect(m.mieszkancy.liczba).to.be.within(1, 8);
        }
        expect(rzucKomplikacje(RUINY.magazyn, rngZZiarna(3), { wymus: 9 }).poziom).to.be.within(1, 4);
      });
    });

    describe("Losowe przedmioty (U13)", function () {
      it("każda kategoria bez kolumny k100 ma pozycje w katalogu", function () {
        for (const k of LOSOWE_PRZEDMIOTY.filter(k => k.katalog)) {
          expect(pozycjeKategorii(k, KAT()).filter(p => p.dostepnosc > 0).length, k.nazwa).to.be.above(0);
        }
      });

      it("wynik ma nazwę i ilość; rekurencja „rzuć dwa razy” daje dwa wyniki", function () {
        for (let i = 0; i < 300; i++) {
          for (const p of losujPrzedmiot({ katalog: KAT(), rng: rngZZiarna(i) })) {
            expect(p.nazwa, `ziarno ${i}`).to.be.a("string");
            expect(p.ilosc).to.be.at.least(1);
            if (p.ref) expect(KATALOG.has(p.ref), p.ref).to.equal(true);
          }
        }
        const dwa = losujPrzedmiot({ katalog: KAT(), k100: 100, rng: rngZZiarna(7) });
        expect(dwa.length).to.be.at.least(2);
        expect(losujPrzedmiot({ katalog: KAT(), k100: 93 })[0].schemat).to.equal("armor:pancerz-stalowej-policji");
        expect(losujPrzedmiot({ katalog: KAT(), k100: 95 })[0].pojazd).to.equal(true);
        expect(losujPrzedmiot({ katalog: KAT(), k100: 82, rng: rngZZiarna(1) })[0].aktor).to.equal(true);
      });

      it("ważenie dostępnością (D9): w 10 000 losowań broni krótkiej częstość ∝ dostępności", function () {
        this.timeout(60000);
        const kat = KAT();
        const zliczenia = new Map();
        const rng = rngZZiarna("D9");
        for (let i = 0; i < 10000; i++) {
          const [p] = losujPrzedmiot({ katalog: kat, k100: 61, rng });
          zliczenia.set(p.ref, (zliczenia.get(p.ref) ?? 0) + 1);
        }
        const kategoria = LOSOWE_PRZEDMIOTY.find(k => k.od === 61);
        const pozycje = pozycjeKategorii(kategoria, kat).filter(p => p.dostepnosc > 0);
        const suma = pozycje.reduce((a, p) => a + p.dostepnosc, 0);
        for (const p of pozycje) {
          const oczek = p.dostepnosc / suma;
          const zaobs = (zliczenia.get(p.ref) ?? 0) / 10000;
          expect(Math.abs(zaobs - oczek), `${p.nazwa}: ${zaobs.toFixed(3)} vs ${oczek.toFixed(3)}`).to.be.below(0.02);
        }
      });

      it("Zdobyczna apteczka (s. 132): dwa leki po 2k10 dawek; Fanty z rzutu dwa razy", function () {
        for (let i = 0; i < 30; i++) {
          const a = zdobycznaApteczka(rngZZiarna(i));
          expect(a).to.have.length(2);
          for (const l of a) { expect(KATALOG.has(l.ref)).to.equal(true); expect(l.ilosc).to.be.within(2, 20); }
        }
        expect(losujFanty(rngZKosci([100, 5, 8], 100)).map(f => f.nazwa)).to.deep.equal(["Chipsy Stars", "Cukierek"]);
      });
    });
  }, { displayName: "Neuroshima: Szabrowanie, losowanie, Fanty — czyste zasady (M5)" });
}
