/**
 * Neuroshima 5e — M4 Pojazdy (PLAN_m4_pojazdy §7): czyste funkcje i dane katalogu.
 *
 * Warstwa 1 wg `TESTING.md`. Kanwa (jadący w animacji, kropki, prześwietlenie) — e2e `pojazd`.
 *
 * Czego pilnujemy i dlaczego:
 *  - **Obrys po obrocie.** Rdzeń liczy kratki z `width`/`height` bez obrotu; jeśli kwadrant albo
 *    zamiana się rozjadą, pojazd bokiem zajmuje kratki w pionie, a potrącenie liczy złe pola.
 *  - **Pozycja miejsca w układzie pojazdu.** Ta sama funkcja ustawia jadących w każdej klatce
 *    i w zapisie MG; znak osi albo kierunek obrotu pomylony o 180° wysadza kierowcę na tylną kanapę.
 *  - **Katalog ↔ tabela s. 262.** Liczba miejsc = Załoga (Autobus: 20 + kierowca, paka ciężarówki
 *    ponad załogą), kierowca w pierwszym rzędzie po lewej burcie, każda cecha ma opis.
 */

import {
  PODWOZIA, KATALOG_POJAZDOW, CECHY_POJAZDOW, cechyPojazdu, rozmiarPojazdu, ST_NA_KROTKO
} from "../config/vehicles-data.mjs";
import {
  kwadrant, obrysPrzyObrocie, obrysZamieniony, obroc, ukladMiejsc, srodekMiejsca, naroznikDlaSrodka,
  punktWPojezdzie, roznicaKatow, normalizujKat, ROZMIAR_MIEJSCA
} from "../pojazdy/geometria.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const blisko = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

export function registerPojazdyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.pojazdy`, context => {
    const { describe, it, expect } = context;

    describe("Geometria — obrys w czterech kierunkach (§4.3)", function () {
      it("kwadrant: 0 w dół, 90 w lewo, 180 w górę, 270 w prawo; skosy do najbliższego", function () {
        expect([0, 90, 180, 270, 360, -90].map(kwadrant)).to.deep.equal([0, 1, 2, 3, 0, 3]);
        expect(kwadrant(44)).to.equal(0);
        expect(kwadrant(46)).to.equal(1);
        expect(kwadrant(179.7)).to.equal(2);
      });

      it("pojazd bokiem ma zamieniony obrys, przodem/tyłem — naturalny", function () {
        const nat = { w: 1.5, h: 3 };
        expect(obrysPrzyObrocie(nat, 0)).to.deep.equal({ w: 1.5, h: 3 });
        expect(obrysPrzyObrocie(nat, 90)).to.deep.equal({ w: 3, h: 1.5 });
        expect(obrysPrzyObrocie(nat, 180)).to.deep.equal({ w: 1.5, h: 3 });
        expect(obrysPrzyObrocie(nat, 270)).to.deep.equal({ w: 3, h: 1.5 });
        expect(obrysZamieniony(nat, 3, 1.5)).to.be.true;
        expect(obrysZamieniony(nat, 1.5, 3)).to.be.false;
        expect(obrysZamieniony({ w: 0.5, h: 0.5 }, 0.5, 0.5), "kwadrat nigdy").to.be.false;
      });

      it("obrót zgodny z ekranem: +90° przenosi przód (y+) w lewo (x−)", function () {
        const p = obroc({ x: 0, y: 1 }, 90);
        expect(blisko(p.x, -1)).to.be.true;
        expect(blisko(p.y, 0)).to.be.true;
      });

      it("kąty: normalizacja i najmniejsza różnica", function () {
        expect(normalizujKat(-90)).to.equal(270);
        expect(roznicaKatow(350, 10)).to.equal(20);
        expect(roznicaKatow(0, 180)).to.equal(180);
      });

      it("punkt w obróconym prostokącie pojazdu", function () {
        const c = { x: 500, y: 500 };
        // Osobówka bokiem (90°): rozciąga się w poziomie na 300 px.
        expect(punktWPojezdzie({ x: 640, y: 500 }, c, { w: 1.5, h: 3 }, 90, 100)).to.be.true;
        expect(punktWPojezdzie({ x: 500, y: 640 }, c, { w: 1.5, h: 3 }, 90, 100)).to.be.false;
        expect(punktWPojezdzie({ x: 500, y: 640 }, c, { w: 1.5, h: 3 }, 0, 100)).to.be.true;
      });
    });

    describe("Miejsca (§4.1, D3)", function () {
      const osobowka = KATALOG_POJAZDOW.osobowka;
      const miejsca = ukladMiejsc(osobowka.obrys, osobowka.strefy);

      it("kierowca: pierwszy rząd, lewa burta, przód", function () {
        const k = miejsca.filter(m => m.kierowca);
        expect(k).to.have.length(1);
        expect(k[0].id).to.equal("kabina-0-0");
        expect(k[0].x).to.be.above(0);
        expect(k[0].y).to.be.above(0);
      });

      it("wszystkie miejsca leżą w obrysie i mają unikalne id", function () {
        for (const [id, kat] of Object.entries(KATALOG_POJAZDOW)) {
          const ms = ukladMiejsc(kat.obrys, kat.strefy);
          expect(new Set(ms.map(m => m.id)).size, id).to.equal(ms.length);
          for (const m of ms) {
            expect(Math.abs(m.x), `${id} ${m.id} x`).to.be.at.most(kat.obrys.w / 2);
            expect(Math.abs(m.y), `${id} ${m.id} y`).to.be.at.most(kat.obrys.h / 2);
          }
        }
      });

      it("pozycja miejsca obraca się z pojazdem — kierowca po obrocie o 180° zostaje kierowcą", function () {
        const k = miejsca[0];
        const c = { x: 1000, y: 1000 };
        const s0 = srodekMiejsca(c, 0, k, 100);
        const s180 = srodekMiejsca(c, 180, k, 100);
        expect(blisko(s0.x - c.x, -(s180.x - c.x))).to.be.true;
        expect(blisko(s0.y - c.y, -(s180.y - c.y))).to.be.true;
        // Przodem w dół kierowca jest niżej środka; przodem w górę — wyżej.
        expect(s0.y).to.be.above(c.y);
        expect(s180.y).to.be.below(c.y);
      });

      it("narożnik żetonu jadącego dla środka miejsca", function () {
        expect(naroznikDlaSrodka({ x: 525, y: 525 }, ROZMIAR_MIEJSCA, ROZMIAR_MIEJSCA, 100)).to.deep.equal({ x: 500, y: 500 });
      });
    });

    describe("Katalog M4 (§5) ↔ tabela s. 262", function () {
      it("każde podwozie ma wpis katalogu i odwrotnie", function () {
        expect(Object.keys(KATALOG_POJAZDOW).sort()).to.deep.equal(Object.keys(PODWOZIA).sort());
      });

      it("liczba miejsc = Załoga (Autobus: 20 + kierowca; paka ciężarówki ponad Załogą)", function () {
        for (const [id, kat] of Object.entries(KATALOG_POJAZDOW)) {
          const ms = ukladMiejsc(kat.obrys, kat.strefy);
          const bezPaki = ms.filter(m => !m.stojace).length;
          const oczekiwane = id === "autobus" ? PODWOZIA[id].zaloga + 1 : PODWOZIA[id].zaloga;
          expect(bezPaki, id).to.equal(oczekiwane);
        }
      });

      it("silnik i wylot spalin mają dokładnie pojazdy silnikowe", function () {
        for (const [id, kat] of Object.entries(KATALOG_POJAZDOW)) {
          const silnikowy = PODWOZIA[id].silnikowy;
          expect(!!kat.silnik, id).to.equal(silnikowy);
          expect(!!kat.rura, id).to.equal(silnikowy);
          expect(["benzyna", "diesel", "motocykl", null]).to.include(kat.silnik);
        }
      });

      it("rozmiar znany dnd5e, klasa z ST na krótko, cechy z opisem", function () {
        const rozmiary = Object.keys(CONFIG.DND5E.actorSizes);
        for (const id of Object.keys(KATALOG_POJAZDOW)) {
          expect(rozmiary, id).to.include(rozmiarPojazdu(id));
          expect(ST_NA_KROTKO[KATALOG_POJAZDOW[id].klasa], id).to.be.a("number");
          for (const c of cechyPojazdu(id)) {
            const def = CECHY_POJAZDOW[c.id];
            expect(def, `${id}: ${c.id}`).to.exist;
            expect(def.opis(c), `${id}: ${c.id}`).to.be.a("string").and.not.match(/undefined/);
          }
        }
      });
    });

    describe("Paczka `pojazdy` (E1) ↔ dane", function () {
      it("14 prawdziwych pojazdów: flaga podwozia, progi, obrys żetonu, cechy", async function () {
        const pack = game.packs.get(`${MODULE_ID}.pojazdy`);
        expect(pack, "paczka zarejestrowana").to.exist;
        const docs = await pack.getDocuments();
        expect(docs).to.have.length(Object.keys(PODWOZIA).length);
        for (const a of docs) {
          const id = a.getFlag(MODULE_ID, "pojazd")?.podwozie;
          expect(PODWOZIA[id], `${a.name}: podwozie`).to.exist;
          const p = PODWOZIA[id], k = KATALOG_POJAZDOW[id];
          expect(a.type).to.equal("vehicle");
          expect(a.name).to.equal(p.nazwa);
          expect(a.system.attributes.hp.max, `${a.name} PW`).to.equal(p.pw);
          expect(a.system.attributes.hp.dt ?? null, `${a.name} Próg obrażeń`).to.equal(p.progObrazen);
          expect(a.system.attributes.hp.mt ?? null, `${a.name} Próg awarii`).to.equal(p.progAwarii);
          expect(a.system.attributes.ac.value, `${a.name} TT`).to.equal(p.tt);
          expect(a.system.traits.size, `${a.name} rozmiar`).to.equal(rozmiarPojazdu(id));
          expect([a.prototypeToken.width, a.prototypeToken.height], `${a.name} obrys`).to.deep.equal([k.obrys.w, k.obrys.h]);
          expect(a.prototypeToken.lockRotation).to.be.false;
          expect(a.items.size, `${a.name} cechy`).to.equal(k.cechy.length);
        }
      });
    });
  });
}
