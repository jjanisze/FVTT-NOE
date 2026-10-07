/**
 * Neuroshima 5e — okoliczności Testu Ataku: czysty silnik (PLAN_m1_walka.md E3–E4).
 *
 * Warstwa 1 (tabela): unikalne id, rodzaj, strona podręcznika.
 * Warstwa 4 (predykaty): zasięg (s. 28), atak dystansowy w zwarciu z filtrem U7, stany atakującego
 * i celu (s. 35 — w tym Sparaliżowanie bez Ułatwienia, inaczej niż w 5e), Pochwycenie z niepewnym
 * pochwytującym, Unikanie i Bieganie (s. 30), kilka celów, źródła z rejestru, tryb (znoszą się),
 * automatyczne TK i jego wejście do `resolveHit`.
 *
 * Bez dokumentów — paczka nie dotyka świata. Migawka z żywej sceny i plakietki: e2e `combat`.
 */

import {
  ZRODLA_OKOLICZNOSCI, rozstrzygnijOkolicznosci, trybRzutu, autoKrytyk, przeszkadzaWZwarciu
} from "../config/okolicznosci-ataku.mjs";
import { resolveHit } from "../config/defense-rules.mjs";
import { MODULE_ID } from "./helpers.mjs";

const U = (stany = [], o = {}) => ({ stany: new Set(stany), szybkosc0: false, nazwa: o.nazwa ?? null, ...o });

/** Migawka: dystansowy atak B 92 (18/39 m) na cel 10 m, bez nikogo obok. */
function m(o = {}) {
  return {
    atakujacy: o.atakujacy ?? U(),
    cel: "cel" in o ? o.cel : U(),
    liczbaCelow: o.liczbaCelow ?? (("cel" in o && !o.cel) ? 0 : 1),
    wrecz: o.wrecz ?? false,
    odleglosc: "odleglosc" in o ? o.odleglosc : 10,
    zasieg: o.zasieg ?? { normalny: 18, daleki: 39 },
    wrogowieObok: o.wrogowieObok ?? [],
    celPochwytuje: "celPochwytuje" in o ? o.celPochwytuje : null,
    turaCelu: o.turaCelu ?? false,
    zewnetrzne: o.zewnetrzne ?? []
  };
}

const ids = lista => lista.map(w => w.id);

export function registerOkolicznosciTests(quench) {
  quench.registerBatch(`${MODULE_ID}.okolicznosci`, context => {
    const { describe, it, expect } = context;

    describe("Tabela", function () {
      it("unikalne id, znany rodzaj, strona podręcznika", function () {
        const lista = ids(ZRODLA_OKOLICZNOSCI);
        expect(new Set(lista).size, lista.join(", ")).to.equal(lista.length);
        for (const z of ZRODLA_OKOLICZNOSCI) {
          expect(["ulatwienie", "utrudnienie", "uwaga"], z.id).to.include(z.rodzaj);
          expect(z.strona, z.id).to.match(/^s\. \d/);
        }
      });

      it("bez okoliczności — zwykły rzut, puste listy", function () {
        const w = rozstrzygnijOkolicznosci(m());
        expect([w.ulatwienia.length, w.utrudnienia.length, w.uwagi.length, w.tryb]).to.deep.equal([0, 0, 0, 0]);
        expect(w.autoKrytyk).to.equal(null);
      });

      it("Ułatwienie i Utrudnienie znoszą się, liczba się nie liczy (reguła 5e)", function () {
        expect(trybRzutu([1], [])).to.equal(1);
        expect(trybRzutu([], [1, 2])).to.equal(-1);
        expect(trybRzutu([1], [1, 2, 3])).to.equal(0);
      });
    });

    describe("Zasięg i zwarcie (s. 28)", function () {
      it("zasięg daleki — Utrudnienie; normalny — nic", function () {
        expect(ids(rozstrzygnijOkolicznosci(m({ odleglosc: 25 })).utrudnienia)).to.deep.equal(["zasiegDaleki"]);
        expect(rozstrzygnijOkolicznosci(m({ odleglosc: 18 })).utrudnienia).to.deep.equal([]);
      });

      it("poza dalekim — uwaga „chybia”, nie Utrudnienie", function () {
        const w = rozstrzygnijOkolicznosci(m({ odleglosc: 40 }));
        expect(ids(w.uwagi)).to.deep.equal(["pozaZasiegiem"]);
        expect(w.utrudnienia).to.deep.equal([]);
      });

      it("wręcz i nieznana odległość — bez zasięgu", function () {
        expect(rozstrzygnijOkolicznosci(m({ wrecz: true, odleglosc: 25 })).utrudnienia).to.deep.equal([]);
        expect(rozstrzygnijOkolicznosci(m({ odleglosc: null })).utrudnienia).to.deep.equal([]);
      });

      it("dystansowy w zwarciu: przeciwnik obok, który widzi i może działać", function () {
        const w = rozstrzygnijOkolicznosci(m({ wrogowieObok: [U([], { nazwa: "Gangus" })] }));
        expect(ids(w.utrudnienia)).to.deep.equal(["dystansowyWZwarciu"]);
        expect(w.utrudnienia[0].label, "nazwa przeciwnika w dymku").to.include("Gangus");
      });

      it("U7: Nieprzytomny, Oślepiony, Pochwycony, Sparaliżowany, Unieruchomiony, Szybkość 0 — nie przeszkadzają", function () {
        for (const stan of ["unconscious", "blinded", "grappled", "paralyzed", "restrained", "dead"]) {
          expect(przeszkadzaWZwarciu(U([stan]), U()), stan).to.equal(false);
        }
        expect(przeszkadzaWZwarciu(U([], { szybkosc0: true }), U()), "Szybkość 0").to.equal(false);
      });

      it("niewidzialnego atakującego przeciwnik nie widzi; atak wręcz nie liczy zwarcia", function () {
        expect(przeszkadzaWZwarciu(U(), U(["invisible"]))).to.equal(false);
        expect(rozstrzygnijOkolicznosci(m({ wrecz: true, wrogowieObok: [U()] })).utrudnienia).to.deep.equal([]);
      });
    });

    describe("Stany atakującego (s. 35)", function () {
      it("Oślepienie, Przerażenie, Zatrucie, Unieruchomienie — Utrudnienie", function () {
        const w = rozstrzygnijOkolicznosci(m({ atakujacy: U(["blinded", "frightened", "poisoned", "restrained"]) }));
        expect(ids(w.utrudnienia)).to.deep.equal(["oslepienie", "przerazenie", "zatrucie", "unieruchomienie"]);
      });

      it("Powalenie: Utrudnienie tylko wręcz", function () {
        expect(ids(rozstrzygnijOkolicznosci(m({ wrecz: true, odleglosc: 1.5, atakujacy: U(["prone"]) })).utrudnienia)).to.deep.equal(["powalenieWrecz"]);
        expect(rozstrzygnijOkolicznosci(m({ atakujacy: U(["prone"]) })).utrudnienia).to.deep.equal([]);
      });

      it("Niewidoczność — Ułatwienie; Bieganie — Utrudnienie", function () {
        expect(ids(rozstrzygnijOkolicznosci(m({ atakujacy: U(["invisible"]) })).ulatwienia)).to.deep.equal(["niewidocznosc"]);
        expect(ids(rozstrzygnijOkolicznosci(m({ atakujacy: U(["bieganie"]) })).utrudnienia)).to.deep.equal(["bieganie"]);
      });

      it("Pochwycenie: cel nie trzyma — Utrudnienie; trzyma — nic; nie wiadomo — dalej niż 1,5 m Utrudnienie, bliżej uwaga", function () {
        const g = U(["grappled"]);
        expect(ids(rozstrzygnijOkolicznosci(m({ atakujacy: g, celPochwytuje: false })).utrudnienia)).to.deep.equal(["pochwycenie"]);
        expect(rozstrzygnijOkolicznosci(m({ atakujacy: g, celPochwytuje: true })).utrudnienia).to.deep.equal([]);
        expect(ids(rozstrzygnijOkolicznosci(m({ atakujacy: g, odleglosc: 6 })).utrudnienia)).to.deep.equal(["pochwycenie"]);
        const blisko = rozstrzygnijOkolicznosci(m({ atakujacy: g, odleglosc: 1.5, wrecz: true }));
        expect(blisko.utrudnienia).to.deep.equal([]);
        expect(ids(blisko.uwagi)).to.deep.equal(["pochwycenieNiepewne"]);
      });
    });

    describe("Stany celu (s. 35)", function () {
      it("Nieprzytomność, Ogłuszenie, Oślepienie, Unieruchomienie — Ułatwienie", function () {
        for (const [stan, id] of [["unconscious", "celNieprzytomny"], ["stunned", "celOgluszony"], ["blinded", "celOslepiony"], ["restrained", "celUnieruchomiony"]]) {
          expect(ids(rozstrzygnijOkolicznosci(m({ cel: U([stan]), odleglosc: 6 })).ulatwienia), stan).to.include(id);
        }
      });

      it("Sparaliżowanie: w NOE bez Ułatwienia — tylko automatyczne TK", function () {
        const w = rozstrzygnijOkolicznosci(m({ cel: U(["paralyzed", "incapacitated"]), odleglosc: 1.5, wrecz: true }));
        expect(w.ulatwienia).to.deep.equal([]);
        expect(w.autoKrytyk?.strona).to.equal("s. 35");
      });

      it("Powalenie: ≤ 1,5 m Ułatwienie, dalej Utrudnienie", function () {
        expect(ids(rozstrzygnijOkolicznosci(m({ cel: U(["prone"]), odleglosc: 1.5, wrecz: true })).ulatwienia)).to.deep.equal(["celPowalonyBlisko"]);
        expect(ids(rozstrzygnijOkolicznosci(m({ cel: U(["prone"]), odleglosc: 9 })).utrudnienia)).to.deep.equal(["celPowalonyDaleko"]);
      });

      it("Niewidoczny cel — Utrudnienie", function () {
        expect(ids(rozstrzygnijOkolicznosci(m({ cel: U(["invisible"]) })).utrudnienia)).to.deep.equal(["celNiewidoczny"]);
      });

      it("kilka celów — stany i zasięg poza trybem, uwaga zamiast", function () {
        const w = rozstrzygnijOkolicznosci(m({ cel: null, liczbaCelow: 2, odleglosc: 30 }));
        expect([w.ulatwienia.length, w.utrudnienia.length]).to.deep.equal([0, 0]);
        expect(ids(w.uwagi)).to.deep.equal(["kilkaCelow"]);
      });
    });

    describe("Akcje: Unikanie, Bieganie (s. 30)", function () {
      it("Unikanie celu — Utrudnienie, jeśli widzi napastnika i może działać", function () {
        expect(ids(rozstrzygnijOkolicznosci(m({ cel: U(["dodging"]) })).utrudnienia)).to.deep.equal(["celUnika"]);
        for (const [opis, o] of [
          ["cel Oślepiony", { cel: U(["dodging", "blinded"]) }],
          ["cel Obezwładniony", { cel: U(["dodging", "incapacitated"]) }],
          ["cel z Szybkością 0", { cel: U(["dodging"], { szybkosc0: true }) }],
          ["napastnik Niewidoczny", { cel: U(["dodging"]), atakujacy: U(["invisible"]) }]
        ]) {
          expect(ids(rozstrzygnijOkolicznosci(m(o)).utrudnienia), opis).to.not.include("celUnika");
        }
      });

      it("biegnący cel: Utrudnienie dla ataków dystansowych tylko w jego turze (U8)", function () {
        expect(ids(rozstrzygnijOkolicznosci(m({ cel: U(["bieganie"]), turaCelu: true })).utrudnienia)).to.deep.equal(["celBiegnie"]);
        expect(rozstrzygnijOkolicznosci(m({ cel: U(["bieganie"]), turaCelu: false })).utrudnienia).to.deep.equal([]);
        expect(rozstrzygnijOkolicznosci(m({ cel: U(["bieganie"]), turaCelu: true, wrecz: true, odleglosc: 1.5 })).utrudnienia).to.deep.equal([]);
      });
    });

    describe("Automatyczne Trafienie Krytyczne (s. 35)", function () {
      it("Nieprzytomny albo Sparaliżowany ≤ 1,5 m; dalej — nie", function () {
        expect(autoKrytyk(U(["unconscious"]), 1.5)).to.not.equal(null);
        expect(autoKrytyk(U(["paralyzed"]), 0)).to.not.equal(null);
        expect(autoKrytyk(U(["unconscious"]), 3)).to.equal(null);
        expect(autoKrytyk(U(["prone"]), 1.5)).to.equal(null);
        expect(autoKrytyk(U(["unconscious"]), null), "nieznana odległość").to.equal(null);
      });

      it("w rozstrzygaczu: trafienie → krytyk; pudło i jedynka zostają; krytyczna ochrona zamienia", function () {
        const base = { total: 15, tt: 12, autoCrit: true };
        expect(resolveHit(base).verdict).to.equal("krytyk");
        expect(resolveHit({ ...base, total: 8 }).verdict).to.equal("pudło");
        expect(resolveHit({ ...base, fumble: true }).verdict).to.equal("pudło");
        expect(resolveHit({ ...base, critDowngraded: true }).verdict).to.equal("trafienie");
        expect(resolveHit({ total: 15, tt: 12 }).verdict, "bez auto-TK").to.equal("trafienie");
      });
    });

    describe("Źródła z rejestru", function () {
      it("dopisane do list i do trybu", function () {
        const w = rozstrzygnijOkolicznosci(m({
          atakujacy: U(["invisible"]),
          zewnetrzne: [{ id: "udzwig", rodzaj: "utrudnienie", label: "Przeciążenie (Udźwig)" }]
        }));
        expect(ids(w.ulatwienia)).to.deep.equal(["niewidocznosc"]);
        expect(ids(w.utrudnienia)).to.deep.equal(["udzwig"]);
        expect(w.tryb).to.equal(0);
      });
    });
  }, { displayName: "Neuroshima: Okoliczności ataku — czysty silnik (M1)" });
}
