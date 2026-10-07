/**
 * Neuroshima 5e — powrót do zdrowia: czyste zasady (PLAN_m1_walka.md E0).
 *
 * Warstwa 1 (tabele): reguły zdejmowania pokrywają dokładnie źródła Wyczerpania
 * (`EXHAUSTION_SOURCES`), każde wyjście i każde uporczywe ma opis gracza.
 * Warstwa 4 (predykaty): U10/U14 (kolejność DO, uporczywość NOE/WKK), D3/D4 (licznik
 * Regeneracji, dzień z medykiem), szansa RO bez naturalnej 20 i 1 (s. 16) oraz
 * `prognozaZdrowia` — **tabela §7.8 planu jako wynik oczekiwany**.
 *
 * Bez dokumentów — paczka nie dotyka świata.
 */

import {
  REGULY_ZDEJMOWANIA, REGENERACJA, regulaZdejmowania, kolejnoscDO, zrodlaPoDO, zrodlaPoZejsciuZKrytycznego,
  zrodlaPoWyjsciu, normalizujZrodla, widokWyczerpania,
  regeneracjaPoDO, regeneracjaPoRzucie, szansaRO, prognozaZdrowia
} from "../config/rekonwalescencja-rules.mjs";
import { EXHAUSTION_SOURCES } from "../config/exhaustion.mjs";
import { MODULE_ID } from "./helpers.mjs";

const wpis = (source, czas) => ({ source, czas });
const zrodla = lista => lista.map(w => w.source);

export function registerRekonwalescencjaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.rekonwalescencja`, context => {
    const { describe, it, expect } = context;

    describe("Tabele", function () {
      it("reguła zdejmowania dla każdego źródła Wyczerpania — i tylko dla nich", function () {
        expect(Object.keys(REGULY_ZDEJMOWANIA).sort()).to.deep.equal(Object.keys(EXHAUSTION_SOURCES).sort());
      });

      it("każde uporczywe i każde wyjście mają opis gracza; strony podręcznika poprawnego kształtu", function () {
        for (const [id, r] of Object.entries(REGULY_ZDEJMOWANIA)) {
          for (const x of [r.uporczywe, r.wyjscie].filter(Boolean)) {
            expect(x.opis, id).to.be.a("string").and.not.empty;
            if (x.strona) expect(x.strona, id).to.match(/^s\. \d/);
          }
          expect(Boolean(r.uporczywe) !== Number.isInteger(r.grupaDO), `${id}: albo uporczywe, albo grupa DO`).to.equal(true);
        }
      });
    });

    describe("Reguły zdejmowania (U10)", function () {
      it("zwykły DO: Bezsenność, Kac, Forsowanie, Ogólne, Przemarznięcie, Uduszenie, Skażenie, Zranienie (NOE)", function () {
        for (const k of ["bezsennosc", "kac", "forsowanie", "ogolne", "przemarznie", "uduszenie", "skazenie", "zranienie"]) {
          expect(regulaZdejmowania(k).zwyklyDO, k).to.equal(true);
        }
      });

      it("uporczywe: Odwodnienie, Niedożywienie; bez zmian w M1: Choroba, Deadline", function () {
        for (const k of ["odwodnienie", "niedozywienie", "choroba", "deadline"]) {
          expect(regulaZdejmowania(k).uporczywe, k).to.not.equal(null);
          expect(regulaZdejmowania(k).zwyklyDO, k).to.equal(false);
        }
      });

      it("Zranienie: NOE zwykłe z wyjściem RAI; WKK uporczywe do zejścia z Krytycznego (D5)", function () {
        const noe = regulaZdejmowania("zranienie");
        expect(noe.warstwa).to.equal("NOE");
        expect(noe.wyjscia.map(w => w.warstwa)).to.deep.equal(["RAI"]);
        const wkk = regulaZdejmowania("zranienie", { kobalt: true });
        expect(wkk.warstwa).to.equal("WKK");
        expect(wkk.zwyklyDO).to.equal(false);
        expect(wkk.uporczywe.dopoki).to.equal("zejscie-z-krytycznego");
        expect(wkk.wyjscia.map(w => w.id), "RAI zdejmuje je przy zejściu").to.deep.equal(["zejscie-z-krytycznego"]);
      });

      it("Kobalt nie zmienia innych źródeł", function () {
        for (const k of Object.keys(REGULY_ZDEJMOWANIA).filter(k => k !== "zranienie")) {
          expect(regulaZdejmowania(k, { kobalt: true }), k).to.deep.equal(regulaZdejmowania(k));
        }
      });

      it("nieznane źródło liczy się jak Ogólne; wpis i goły klucz dają to samo", function () {
        expect(regulaZdejmowania("cos-nowego").zrodlo).to.equal("ogolne");
        expect(regulaZdejmowania({ source: "kac", addedAt: 3 })).to.deep.equal(regulaZdejmowania("kac"));
      });
    });

    describe("Kolejność zwykłego DO (U14)", function () {
      it("najpierw bez innego wyjścia, potem z wyjściem; w grupie najstarszy; uporczywe nigdy", function () {
        const lista = [wpis("zranienie", 1), wpis("odwodnienie", 2), wpis("przemarznie", 3), wpis("kac", 5), wpis("forsowanie", 4)];
        expect(zrodla(kolejnoscDO(lista))).to.deep.equal(["forsowanie", "kac", "zranienie", "przemarznie"]);
        expect(zrodla(kolejnoscDO(lista, { kobalt: true })), "WKK: Zranienie uporczywe").to.deep.equal(["forsowanie", "kac", "przemarznie"]);
      });

      it("DO zdejmuje pierwszy z kolejki; przy samych uporczywych — nic", function () {
        const lista = [wpis("zranienie", 1), wpis("kac", 2)];
        expect(zrodla(zrodlaPoDO(lista))).to.deep.equal(["zranienie"]);
        expect(zrodla(zrodlaPoDO([wpis("odwodnienie", 1)]))).to.deep.equal(["odwodnienie"]);
        expect(zrodla(zrodlaPoDO([wpis("zranienie", 1)], { kobalt: true }))).to.deep.equal(["zranienie"]);
        expect(zrodla(lista), "wejście nietknięte").to.deep.equal(["zranienie", "kac"]);
      });

      it("zejście z Krytycznego zdejmuje Wyczerpanie ze Zranienia (RAI), resztę zostawia", function () {
        expect(zrodla(zrodlaPoZejsciuZKrytycznego([wpis("zranienie", 1), wpis("kac", 2)]))).to.deep.equal(["kac"]);
      });
    });

    describe("Warunek uporczywości, wyjścia, normalizacja (E5)", function () {
      it("Odwodnienie po dziennej porcji wody schodzi zwykłym DO, w grupie bez wyjścia (s. 258)", function () {
        const przed = regulaZdejmowania("odwodnienie");
        expect(przed.uporczywe.status).to.equal("dehydration");
        const po = regulaZdejmowania("odwodnienie", { spelnione: ["woda"] });
        expect([po.zwyklyDO, po.grupaDO, po.spelniony]).to.deep.equal([true, 0, "dzienna porcja wody wypita"]);
        expect(regulaZdejmowania("niedozywienie", { spelnione: ["woda"] }).zwyklyDO, "nie ten warunek").to.equal(false);
      });

      it("WKK Zranienie poza Krytycznym — zwykłe (warunek spełniony)", function () {
        const r = regulaZdejmowania("zranienie", { kobalt: true, spelnione: ["zejscie-z-krytycznego"] });
        expect([r.zwyklyDO, r.grupaDO, r.warstwa]).to.deep.equal([true, 0, "WKK"]);
      });

      it("spełnione warunki wchodzą do kolejki DO po wieku", function () {
        const lista = [wpis("zranienie", 1), wpis("odwodnienie", 2), wpis("kac", 3)];
        expect(zrodla(kolejnoscDO(lista, { spelnione: ["woda"] }))).to.deep.equal(["odwodnienie", "kac", "zranienie"]);
        expect(zrodla(zrodlaPoDO(lista, { spelnione: ["woda"] }))).to.deep.equal(["zranienie", "kac"]);
      });

      it("dodatkowe wyjście zdejmuje wszystkie poziomy swojego źródła i nic więcej", function () {
        const lista = [wpis("przemarznie", 1), wpis("kac", 2), wpis("przemarznie", 3), wpis("uduszenie", 4), wpis("skazenie", 5)];
        expect(zrodla(zrodlaPoWyjsciu(lista, "cieplo"))).to.deep.equal(["kac", "uduszenie", "skazenie"]);
        expect(zrodla(zrodlaPoWyjsciu(lista, "oddech"))).to.deep.equal(["przemarznie", "kac", "przemarznie", "skazenie"]);
        expect(zrodla(zrodlaPoWyjsciu(lista, "radoff"))).to.deep.equal(["przemarznie", "kac", "przemarznie", "uduszenie"]);
        expect(zrodlaPoWyjsciu(lista, "nic-takiego")).to.have.length(5);
      });

      it("normalizacja (F15): nadmiar — odcina najnowsze; brak — dopełnia Ogólnym", function () {
        const lista = [wpis("kac", 1), wpis("odwodnienie", 2), wpis("forsowanie", 3)];
        expect(zrodla(normalizujZrodla(lista, 2))).to.deep.equal(["kac", "odwodnienie"]);
        const dopelnione = normalizujZrodla([wpis("kac", 1)], 3);
        expect(zrodla(dopelnione)).to.deep.equal(["kac", "ogolne", "ogolne"]);
        expect(dopelnione[1].nieznane).to.equal(true);
        expect(normalizujZrodla(lista, 0)).to.deep.equal([]);
        expect(normalizujZrodla(null, 1)).to.have.length(1);
      });
    });

    describe("Widok Wyczerpania (§7.9, D10)", function () {
      const lista = [wpis("zranienie", 1), wpis("odwodnienie", 2), wpis("kac", 3), wpis("forsowanie", 4)];

      it("uporczywe z lewej; skrajna prawa schodzi przy następnym DO (NOE)", function () {
        const w = widokWyczerpania(lista);
        expect(w.map(p => p.zrodlo)).to.deep.equal(["odwodnienie", "zranienie", "forsowanie", "kac"]);
        expect(w.map(p => p.uporczywe)).to.deep.equal([true, false, false, false]);
        expect(w.map(p => p.kolejka)).to.deep.equal([null, 3, 2, 1]);
        expect(w[3].linie[0]).to.equal("Zejdzie przy następnym Długim odpoczynku");
        expect(w[1].linie, "Zranienie: kolejka i wyjście RAI").to.deep.equal([
          "Zejdzie przy trzecim Długim odpoczynku", "Zejdzie też z zejściem z Krytycznego Stopnia Zranienia"
        ]);
        expect(w[0].linie[0]).to.match(/^Uporczywe — nie zejdzie, dopóki nie wypijesz/);
      });

      it("WKK: Zranienie uporczywe, bez powtórzonego wyjścia; po wieku przed Odwodnieniem", function () {
        const w = widokWyczerpania(lista, { kobalt: true });
        expect(w.map(p => p.zrodlo)).to.deep.equal(["zranienie", "odwodnienie", "forsowanie", "kac"]);
        expect(w[0].linie).to.deep.equal(["Uporczywe (WKK) — póki Stopień Zranienia jest Krytyczny"]);
      });

      it("warunek spełniony — pipka przejściowa z dopiskiem; liczba pipek = liczba poziomów", function () {
        const w = widokWyczerpania(lista, { spelnione: ["woda"] });
        expect(w).to.have.length(lista.length);
        expect(w.every(p => !p.uporczywe)).to.equal(true);
        expect(w.at(-1).zrodlo, "Odwodnienie najstarsze w grupie bez wyjścia").to.equal("odwodnienie");
        expect(w.at(-1).linie).to.include("Warunek spełniony: dzienna porcja wody wypita");
      });

      it("dwa jednakowe klucze to dwie pipki", function () {
        const w = widokWyczerpania([wpis("kac", 1), wpis("kac", 2)]);
        expect(w.map(p => p.wpis.czas)).to.deep.equal([2, 1]);
      });

      it("wiek to czas świata; wpisy bez niego (stary zapis czasu rzeczywistego) są najstarsze, w kolejności listy", function () {
        const stary = (source, addedAt) => ({ source, addedAt });
        const lista = [wpis("kac", 50), stary("forsowanie", 1791390497810), stary("ogolne", 1791390497999)];
        expect(zrodla(kolejnoscDO(lista))).to.deep.equal(["forsowanie", "ogolne", "kac"]);
      });
    });

    describe("Licznik Regeneracji (D3, D4)", function () {
      it("ciało: +1 za DO; RO należny od trzeciego", function () {
        expect(regeneracjaPoDO({ licznik: 0 })).to.deep.equal({ licznik: 1, rzutNalezny: false, wstrzymany: false });
        expect(regeneracjaPoDO({ licznik: 2 })).to.deep.equal({ licznik: 3, rzutNalezny: true, wstrzymany: false });
        expect(regeneracjaPoDO({ licznik: 3 }).rzutNalezny, "po porażce — RO po każdym DO").to.equal(true);
      });

      it("medyk: +1 jak każdy DO; w dzień należnego RO licznik stoi", function () {
        expect(regeneracjaPoDO({ licznik: 1, droga: "medyk" })).to.deep.equal({ licznik: 2, rzutNalezny: false, wstrzymany: false });
        expect(regeneracjaPoDO({ licznik: 2, droga: "medyk" })).to.deep.equal({ licznik: 2, rzutNalezny: false, wstrzymany: true });
        expect(regeneracjaPoDO({ licznik: 4, droga: "medyk" }).licznik).to.equal(4);
      });

      it("RO: sukces — od zera; porażka — bez zmian", function () {
        expect(regeneracjaPoRzucie({ licznik: 3, sukces: true })).to.deep.equal({ licznik: 0 });
        expect(regeneracjaPoRzucie({ licznik: 5, sukces: false })).to.deep.equal({ licznik: 5 });
      });

      it("RO Regeneracji: Kondycja, ST 15, po trzech DO (s. 33)", function () {
        expect(REGENERACJA).to.deep.equal({ dni: 3, cecha: "con", st: 15 });
      });
    });

    describe("Szansa RO — bez naturalnej 20 i 1 (s. 16)", function () {
      it("ST 15, +0: 30%; każdy poziom Wyczerpania −2", function () {
        expect(szansaRO({ premia: 0 })).to.be.closeTo(0.30, 1e-12);
        expect(szansaRO({ premia: 0, wyczerpanie: 1 })).to.be.closeTo(0.20, 1e-12);
      });

      it("szansa może wynosić 0 i 100%", function () {
        expect(szansaRO({ premia: -10 })).to.equal(0);
        expect(szansaRO({ premia: 14 })).to.equal(1);
      });

      it("Ułatwienie i Utrudnienie", function () {
        expect(szansaRO({ premia: 0, tryb: 1 })).to.be.closeTo(1 - 0.7 ** 2, 1e-12);
        expect(szansaRO({ premia: 0, tryb: -1 })).to.be.closeTo(0.09, 1e-12);
      });
    });

    describe("Kalendarzyk zdrowia — tabela §7.8", function () {
      // Z Krytycznego, bez medyka: najszybciej / zwykle / 9 na 10, w DO.
      const TABELA = [
        { premia: 5, noe: [12, 15, 19], wkk: [12, 15, 19] },
        { premia: 2, noe: [12, 17, 23], wkk: [12, 18, 25] },
        { premia: 0, noe: [12, 20, 29], wkk: [12, 22, 32] },
        { premia: -1, noe: [12, 23, 33], wkk: [12, 25, 38] }
      ];
      const progi = (premia, kobalt, extra = []) => {
        const { progi: p } = prognozaZdrowia({
          stopien: 4, licznik: 0, zrodlaWyczerpania: [wpis("zranienie", 1), ...extra], szansa: { premia }, kobalt
        });
        return [p.najszybciej, p.zwykle, p.prawiePewnie];
      };

      for (const w of TABELA) {
        it(`RO na Kondycję ${w.premia >= 0 ? "+" : "−"}${Math.abs(w.premia)}: NOE ${w.noe.join(" / ")}, WKK ${w.wkk.join(" / ")}`, function () {
          expect(progi(w.premia, false), "NOE").to.deep.equal(w.noe);
          expect(progi(w.premia, true), "WKK").to.deep.equal(w.wkk);
        });
      }

      it("z medykiem co DO: 4 DO", function () {
        const p = prognozaZdrowia({ stopien: 4, zrodlaWyczerpania: [wpis("zranienie", 1)], droga: "medyk" }).progi;
        expect([p.najszybciej, p.zwykle, p.prawiePewnie]).to.deep.equal([4, 4, 4]);
      });

      it("dwa inne poziomy Wyczerpania nic nie zmieniają — znikają przed pierwszym rzutem", function () {
        const extra = [wpis("forsowanie", 2), wpis("kac", 3)];
        for (const kobalt of [false, true]) {
          expect(progi(0, kobalt, extra), kobalt ? "WKK" : "NOE").to.deep.equal(progi(0, kobalt));
        }
      });

      it("99 na 100 mieści się w 23–53 DO dla premii z tabeli", function () {
        const p99 = [];
        for (const { premia } of TABELA) {
          for (const kobalt of [false, true]) {
            const r = prognozaZdrowia({ stopien: 4, zrodlaWyczerpania: [wpis("zranienie", 1)], szansa: { premia }, kobalt });
            p99.push(r.dni.find(x => x.zdrowy >= 0.99).do);
          }
        }
        expect(Math.min(...p99)).to.equal(23);
        expect(Math.max(...p99)).to.equal(53);
      });

      it("szansa 0% — samo się nie zagoi; progi zejścia na niższe Stopnie też puste", function () {
        const r = prognozaZdrowia({ stopien: 2, szansa: { premia: -10 }, maxDO: 30 });
        expect(r.samoSieNieZagoi).to.equal(true);
        expect(r.progi).to.deep.equal({ najszybciej: null, zwykle: null, prawiePewnie: null });
        expect(r.stopnie.map(s => s.zwykle)).to.deep.equal([null, null]);
      });

      it("uporczywe z warunkiem zewnętrznym nie blokuje „zdrowy”, ale trafia do „zależy od…”", function () {
        const r = prognozaZdrowia({ stopien: 1, licznik: 2, zrodlaWyczerpania: [wpis("odwodnienie", 1)], szansa: { premia: 14 } });
        expect(r.zalezyOd.map(z => z.zrodlo)).to.deep.equal(["odwodnienie"]);
        expect(r.progi.najszybciej, "licznik 2: RO już na pierwszym DO, mimo −2 za Odwodnienie").to.equal(1);
      });

      it("progi zejścia na każdy niższy Stopień rosną; licznik startowy skraca drogę", function () {
        const r = prognozaZdrowia({ stopien: 3, szansa: { premia: 2 } });
        const zwykle = r.stopnie.map(s => s.zwykle);
        expect(r.stopnie.map(s => s.stopien)).to.deep.equal([2, 1, 0]);
        expect(zwykle[0] < zwykle[1] && zwykle[1] < zwykle[2], zwykle.join(", ")).to.equal(true);
        const zLicznikiem = prognozaZdrowia({ stopien: 3, licznik: 2, szansa: { premia: 2 } });
        expect(zLicznikiem.stopnie[0].najszybciej).to.equal(1);
      });

      it("choroba: dzień bez korzyści przesuwa zejście Wyczerpania o jeden DO", function () {
        const bez = prognozaZdrowia({ stopien: 0, zrodlaWyczerpania: [wpis("kac", 1)], maxDO: 3 });
        const z = prognozaZdrowia({ stopien: 0, zrodlaWyczerpania: [wpis("kac", 1)], choroba: { st: 15, premia: 30, bezKorzysci: true }, maxDO: 3 });
        expect(bez.progi.najszybciej).to.equal(1);
        expect(z.progi.najszybciej, "pierwszy DO bez −1, potem RO choroby zdany").to.equal(2);
      });

      it("choroba: Regeneracja liczy dzień bez korzyści (neutralizacja to nie „korzyść”, s. 45)", function () {
        const r = prognozaZdrowia({ stopien: 1, licznik: 2, szansa: { premia: 30 }, choroba: { st: 15, premia: 30, bezKorzysci: true }, maxDO: 2 });
        expect(r.dni[1].stopien[0]).to.be.closeTo(1, 1e-12);
      });

      it("choroba nie do zdania: poziom co dzień, śmierć przy szóstym", function () {
        const r = prognozaZdrowia({ stopien: 0, choroba: { st: 15, premia: -30 }, maxDO: 8 });
        expect(r.dni.map(d => d.smierc)).to.deep.equal([0, 0, 0, 0, 0, 0, 1, 1, 1]);
        expect(r.samoSieNieZagoi).to.equal(true);
        expect(r.ryzykoSmierci).to.equal(1);
      });

      it("choroba: żywi + martwi = 1 każdego dnia; bez choroby śmierci nie ma", function () {
        const r = prognozaZdrowia({ stopien: 4, zrodlaWyczerpania: [wpis("zranienie", 1), wpis("kac", 2)], szansa: { premia: 1 }, choroba: { st: 15, premia: 1 }, maxDO: 40 });
        for (const d of r.dni) expect(d.stopien[4] + d.smierc, `DO ${d.do}`).to.be.closeTo(1, 1e-9);
        expect(r.ryzykoSmierci).to.be.within(0.01, 0.99);
        expect(prognozaZdrowia({ stopien: 2, maxDO: 30 }).ryzykoSmierci).to.equal(0);
      });

      it("rozkład sumuje się do 1 każdego dnia", function () {
        const r = prognozaZdrowia({ stopien: 4, zrodlaWyczerpania: [wpis("zranienie", 1), wpis("kac", 2)], szansa: { premia: 1, tryb: 1 }, maxDO: 40 });
        for (const d of r.dni) expect(d.stopien[4], `DO ${d.do}`).to.be.closeTo(1, 1e-9);
      });
    });
  }, { displayName: "Neuroshima: Powrót do zdrowia — czyste zasady (M1)" });
}
