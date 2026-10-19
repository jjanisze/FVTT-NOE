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
import { kosztPrzesiadki } from "../pojazdy/jadacy.mjs";
import {
  kratkaPojazdu, metryJednostki, rozmiarMiejsca, skalaPojazdu, trybSceny, wymiaryZetonu
} from "../pojazdy/stan.mjs";
import { skretyNaDrodze } from "../pojazdy/jazda.mjs";

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

    describe("Przesiadka (D15, §4.10)", function () {
      const ms = ukladMiejsc(KATALOG_POJAZDOW.osobowka.obrys, KATALOG_POJAZDOW.osobowka.strefy);
      const [kier, pas, tylL] = [ms[0], ms[1], ms[2]];

      it("sąsiednie miejsca ≈ 3 m ostrożnie (odległość ×2), 1,5 m z testem", function () {
        const k = kosztPrzesiadki(kier, pas, { jedzie: true });
        expect(k.metry).to.equal(1.5);
        expect(k.ostroznie).to.equal(3);
        expect(k.szybko).to.equal(1.5);
        expect(k.wymagaTestu, "ten sam rząd").to.be.false;
      });

      it("WKK: zmiana rzędu w jadącym pojeździe zawsze z testem; w stojącym nigdy", function () {
        expect(kosztPrzesiadki(kier, tylL, { jedzie: true }).wymagaTestu).to.be.true;
        expect(kosztPrzesiadki(kier, tylL, { jedzie: false }).wymagaTestu).to.be.false;
      });
    });

    describe("Skala sceny (§4.14, D21)", function () {
      // Scena jako dane: tylko to, co czytają funkcje skali (siatka i flaga planszy pościgu).
      const scena = (size, distance, units = "m", poscig = false) => ({
        grid: { size, distance, units },
        getFlag: (m, k) => (m === MODULE_ID && k === "poscig" && poscig ? { tory: 12 } : undefined)
      });
      const osobowka = { type: "vehicle", flags: { [MODULE_ID]: { pojazd: { podwozie: "osobowka" } } } };

      it("mapy kampanii 1,5 m (64 i 70 px): kratka pojazdu = kratka sceny, obrys bez zmian", function () {
        for (const px of [64, 70]) {
          const s = scena(px, 1.5);
          expect(kratkaPojazdu(s)).to.equal(px);
          expect(skalaPojazdu(s)).to.equal(1);
          expect(trybSceny(s)).to.equal("taktyczna");
          expect(wymiaryZetonu(osobowka, s, 0)).to.deep.equal({ w: 1.5, h: 3 });
        }
      });

      it("siatka 3 m: pojazd ma połowę kratek, miejsce ćwierć kratki — ta sama wielkość w metrach", function () {
        const s = scena(70, 3);
        expect(kratkaPojazdu(s)).to.equal(35);
        expect(wymiaryZetonu(osobowka, s, 0)).to.deep.equal({ w: 0.75, h: 1.5 });
        expect(wymiaryZetonu(osobowka, s, 90), "bokiem").to.deep.equal({ w: 1.5, h: 0.75 });
        expect(rozmiarMiejsca(s)).to.equal(0.25);
        expect(trybSceny(s)).to.equal("taktyczna");
      });

      it("mapy w km (1, 5, 140 km na kratkę): znacznik, nie kilometrowy samochód", function () {
        for (const km of [1, 5, 140]) expect(trybSceny(scena(70, km, "km")), `${km} km`).to.equal("znacznik");
        expect(blisko(kratkaPojazdu(scena(70, 1, "km")), 0.105)).to.be.true;
        expect(metryJednostki(scena(70, 1, "km"))).to.equal(1000);
      });

      it("dzisiejsza plansza pościgu (200 px = 36 m) to znacznik — M4 nie rusza pionków do P1", function () {
        expect(trybSceny(scena(200, 36, "m", true))).to.equal("znacznik");
      });

      it("plansza złożonej drogi (280 px = 6 m) to tryb planszy w prawdziwej skali (70 px na 1,5 m)", function () {
        const s = scena(280, 6, "m", true);
        expect(kratkaPojazdu(s)).to.equal(70);
        expect(trybSceny(s)).to.equal("plansza");
        expect(trybSceny(scena(280, 6, "m", false)), "bez flagi pościgu").to.equal("taktyczna");
      });

      it("nieznana jednostka liczy się jak metry; brak siatki — znacznik", function () {
        expect(metryJednostki(scena(70, 1.5, "kroki"))).to.equal(1);
        expect(trybSceny(null)).to.equal("znacznik");
        expect(trybSceny({ grid: { size: 70, distance: 0, units: "m" }, getFlag: () => undefined })).to.equal("znacznik");
      });

      it("koszt przesiadki liczy w kratkach pojazdu (1,5 m), niezależnie od siatki sceny", function () {
        const ms = ukladMiejsc(KATALOG_POJAZDOW.osobowka.obrys, KATALOG_POJAZDOW.osobowka.strefy);
        expect(kosztPrzesiadki(ms[0], ms[1]).metry).to.equal(1.5);
      });
    });

    describe("Skręty z ruchu (D10)", function () {
      it("prosto: brak skrętów; ruszenie w bok od postoju to skręt", function () {
        // Pojazd stoi przodem w dół (0°) i jedzie w dół: nic.
        expect(skretyNaDrodze(0, [{ x: 0, y: 0 }, { x: 0, y: 300 }])).to.have.length(0);
        // Stoi przodem w dół, rusza w prawo (obrót 270°): skręt 90°.
        const s = skretyNaDrodze(0, [{ x: 0, y: 0 }, { x: 300, y: 0 }]);
        expect(s).to.have.length(1);
        expect(s[0].rodzaj).to.equal("skret");
      });

      it("zawrócenie to obrót 180° (ST 20), łagodny łuk < 67,5° — nic", function () {
        expect(skretyNaDrodze(0, [{ x: 0, y: 0 }, { x: 0, y: 300 }, { x: 0, y: 0 }]).map(s => s.rodzaj)).to.deep.equal(["obrot"]);
        expect(skretyNaDrodze(0, [{ x: 0, y: 0 }, { x: 0, y: 300 }, { x: 100, y: 500 }])).to.have.length(0);
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
          expect(a.system.attributes.movement.speeds.walk, `${a.name} Szybkość (dnd5e 6: speeds.walk)`).to.equal(p.szybkosc ?? 0);
          expect(a.system.traits.size, `${a.name} rozmiar`).to.equal(rozmiarPojazdu(id));
          expect([a.prototypeToken.width, a.prototypeToken.height], `${a.name} obrys`).to.deep.equal([k.obrys.w, k.obrys.h]);
          expect(a.prototypeToken.lockRotation).to.be.false;
          expect(a.items.size, `${a.name} cechy`).to.equal(k.cechy.length);
        }
      });
    });
  });
}
