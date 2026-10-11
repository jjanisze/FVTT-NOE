/**
 * Neuroshima 5e — bebeszenie i autodestrukcja: czyste zasady (PLAN_m5_postoj.md E0, §8 „bebeszenie-zasady”).
 *
 * Warstwa 1: tabele s. 269 co do komórki, wiersze WKK D36, wybór tabeli dla każdej istoty Bestiariusza,
 * szanse autodestrukcji 8 maszyn z danych statblocków (plan liczył 9 — Mina zbliżeniowa Mobsprzętu to atak, nie cecha).
 * Warstwa 4: powtórka rekurencyjna (suma ≤ 100%), jeden surowiec, czas ÷ osoby, pula po wybuchu, jednostki
 * modułu, odliczanie.
 *
 * Bez dokumentów — paczka nie dotyka świata.
 */

import { MODULE_ID } from "./helpers.mjs";
import {
  BESTIE, MASZYNY, tabelaDla, wierszBebeszenia, pulaBebeszenia, wynikBebeszenia, czasBebeszenia, naJednostki, pulaPusta
} from "../config/bebeszenie-data.mjs";
import {
  czyWybucha, odliczanie, zniszczoneSurowce, rozmiarWraku, szansaZNazwy, tikOdliczania
} from "../config/autodestrukcja-rules.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";

const _suma = o => Object.values(o).reduce((a, b) => a + b, 0);

export function registerBebeszenieZasadyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.bebeszenie-zasady`, context => {
    const { describe, it, expect } = context;

    describe("Tabele (s. 269, D36)", function () {
      it("bestie i maszyny co do komórki", function () {
        expect(BESTIE.sm).to.deep.equal({ minuty: 30, st: 5, kg: { MO: 10, mieso: 20 } });
        expect(BESTIE.grg).to.deep.equal({ minuty: 1440, st: 20, kg: { MO: 1000, mieso: 10000 } });
        expect(MASZYNY.tiny).to.deep.equal({ minuty: 60, st: 5, kg: { CH: 0.5, MK: 5, CE: 0.5, CZ: 1 } });
        expect(MASZYNY.huge).to.deep.equal({ minuty: 1920, st: 25, kg: { CH: 50, MK: 3000, CE: 50, CZ: 100 } });
        expect(Object.keys(BESTIE), "bez Malutkiej").to.not.include("tiny");
        expect(Object.keys(MASZYNY), "bez Ogromnej").to.not.include("grg");
      });

      it("WKK D36: Malutka bestia i Ogromna maszyna tylko pod Kobaltem", function () {
        expect(wierszBebeszenia("bestie", "tiny")).to.equal(null);
        expect(wierszBebeszenia("bestie", "tiny", { kobalt: true })).to.deep.include({ minuty: 15, st: 5, wkk: true });
        expect(wierszBebeszenia("bestie", "tiny", { kobalt: true }).kg).to.deep.equal({ MO: 2, mieso: 5 });
        expect(wierszBebeszenia("maszyny", "grg")).to.equal(null);
        const o = wierszBebeszenia("maszyny", "grg", { kobalt: true });
        expect(o.minuty).to.equal(64 * 60);
        expect(o.st, "bez wzrostu ponad 25").to.equal(25);
        expect(o.kg).to.deep.equal({ CH: 100, MK: 6000, CE: 100, CZ: 200 });
      });

      it("każda istota Bestiariusza ma tabelę; maszyny → maszyny; ludzie i mutanci — wiadomość jawna (D10)", function () {
        for (const [id, c] of Object.entries(BESTIARY)) {
          if (c.overlay) continue;
          const t = tabelaDla({ id, kategoria: c.creatureType });
          expect(t.tabela, id).to.equal(c.creatureType === "maszyna" ? "maszyny" : "bestie");
          expect(t.jawne, id).to.equal(["czlowiek", "mutant"].includes(c.creatureType));
          const w = wierszBebeszenia(t.tabela, c.size, { kobalt: true });
          expect(w, `${id} (${c.size}) bez wiersza nawet z WKK`).to.not.equal(null);
        }
        expect(tabelaDla({ id: "biodroid", kategoria: "maszyna" }).hybryda).to.equal(true);
      });

      it("autodestrukcja: 8 maszyn z cechą (Notatnik łowcy), szanse z nazw statblocku", function () {
        const z = Object.values(BESTIARY).flatMap(c => (c.features ?? []).map(f => ({ id: c.id, s: szansaZNazwy(f.name) }))).filter(x => x.s !== null);
        expect(z.length, z.map(x => `${x.id} ${x.s}%`).join(", ")).to.equal(8);
        for (const x of z) {
          expect(BESTIARY[x.id].creatureType, x.id).to.equal("maszyna");
          expect(x.s).to.be.within(1, 100);
        }
        expect(z.find(x => x.id === "gladiator").s).to.equal(80);
      });
    });

    describe("Wynik, powtórka, czas", function () {
      it("porażka: 10% teraz, 50% przepada, 40% zostaje; powtórka rekurencyjna — suma ≤ 100%", function () {
        const pula = pulaBebeszenia("bestie", "med");
        const r1 = wynikBebeszenia({ pula, sukces: false });
        expect(r1.zysk).to.deep.equal({ MO: 2, mieso: 4 });
        expect(r1.reszta).to.deep.equal({ MO: 8, mieso: 16 });
        const r2 = wynikBebeszenia({ pula: r1.reszta, sukces: false });
        const r3 = wynikBebeszenia({ pula: r2.reszta, sukces: true });
        const razem = _suma(r1.zysk) + _suma(r2.zysk) + _suma(r3.zysk) + _suma(r1.strata) + _suma(r2.strata);
        expect(razem, "nic się nie mnoży ani nie znika").to.be.closeTo(_suma(pula), 1e-9);
        expect(pulaPusta(r3.reszta)).to.equal(true);
      });

      it("jeden surowiec: reszta nietknięta; czas ÷ rodzaje (U18) i ÷ osoby (D12), proporcjonalnie do puli (U17)", function () {
        const pula = pulaBebeszenia("maszyny", "med");
        const r = wynikBebeszenia({ pula, sukces: true, zakres: "CE" });
        expect(r.zysk).to.deep.equal({ CE: 5 });
        expect(r.reszta.MK).to.equal(50);
        const w = wierszBebeszenia("maszyny", "med");
        expect(czasBebeszenia({ wiersz: w })).to.equal(480);
        expect(czasBebeszenia({ wiersz: w, pomocnicy: 1 })).to.equal(240);
        expect(czasBebeszenia({ wiersz: w, zakres: "CE" })).to.equal(120);
        const reszta = wynikBebeszenia({ pula, sukces: false }).reszta;
        expect(czasBebeszenia({ wiersz: w, pula: reszta })).to.equal(192);
      });

      it("maszyna po wybuchu: tylko MK; jednostki modułu: CH/CE/CZ ×10 na kg, MK/MO ×1, mięso w kg", function () {
        expect(pulaBebeszenia("maszyny", "med", { autodestrukcja: "wybuch" })).to.deep.equal({ CH: 0, MK: 50, CE: 0, CZ: 0 });
        expect(naJednostki(pulaBebeszenia("maszyny", "tiny"))).to.deep.equal({ surowce: { CH: 5, MK: 5, CE: 5, CZ: 10 }, mieso: 0 });
        expect(naJednostki({ MO: 2.5, mieso: 4.9 })).to.deep.equal({ surowce: { MO: 2 }, mieso: 4 });
        expect(zniszczoneSurowce()).to.deep.equal(["CE", "CH", "CZ"]);
      });

      it("autodestrukcja: k100 ≤ szansa, odliczanie 1k4 na tikach, rozmiar wraku", function () {
        expect(czyWybucha(80, 80)).to.equal(true);
        expect(czyWybucha(81, 80)).to.equal(false);
        expect(odliczanie(3)).to.equal(3);
        let f = { stan: "odlicza", rundy: 2 };
        f = tikOdliczania(f);
        expect(f).to.deep.equal({ stan: "odlicza", rundy: 1, wybuch: false });
        expect(tikOdliczania(f)).to.deep.equal({ stan: "wybuch", rundy: 0, wybuch: true });
        expect(tikOdliczania({ stan: "czeka", rundy: 0 }).wybuch).to.equal(false);
        expect(["tiny", "sm", "med", "lg", "huge", "grg"].map(rozmiarWraku)).to.deep.equal(["maly", "maly", "sredni", "duzy", "gigantyczny", "gigantyczny"]);
      });
    });
  }, { displayName: "Neuroshima: Bebeszenie i autodestrukcja — czyste zasady (M5)" });
}
