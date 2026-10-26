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
import { OPCJA_SYNCHRONIZACJI } from "../pojazdy/historia.mjs";
import { otwarteMiejsce, prezentacjaMiejsca, rozpoznawalnyJadacy, sortJadacego } from "../pojazdy/prezentacja.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const blisko = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

export function registerPojazdyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.pojazdy`, context => {
    const { describe, it, expect } = context;

    describe("Prezentacja miejsc — kabina, otwarty właz i motocykl", function () {
      it("domyślnie zakryta; stanowisko broni i osłona nie ujawniają jadącego", function () {
        expect(prezentacjaMiejsca(null)).to.deep.equal({ widocznosc: "zakryta", warstwa: "nad" });
        expect(otwarteMiejsce({ stanowisko: true, oslona: "trzyCzwarte" })).to.equal(false);
        expect(prezentacjaMiejsca({ prezentacja: { widocznosc: "otwarta", warstwa: "pod" } }))
          .to.deep.equal({ widocznosc: "otwarta", warstwa: "pod" });
      });

      it("Hammer ujawnia tylko właz w obu układach; zostawia cztery fotele i osłonę stanowiska", function () {
        const h = KATALOG_POJAZDOW.hammer;
        for (const strefy of [h.strefy, h.strefyGrafiki]) {
          const miejsca = ukladMiejsc(h.obrys, strefy);
          const otwarte = miejsca.filter(otwarteMiejsce);
          expect(miejsca).to.have.length(5);
          expect(otwarte.map(m => m.id)).to.deep.equal(["wiezyczka-0-0"]);
          expect(otwarte[0].oslona).to.equal("trzyCzwarte");
          expect(otwarte[0].stanowisko).to.equal(true);
          expect(prezentacjaMiejsca(otwarte[0]).warstwa).to.equal("nad");
        }
      });

      it("motocykl pokazuje kierowcę i pasażera nad siodłem, także bez wariantu wnętrza", function () {
        const k = KATALOG_POJAZDOW.motocykl;
        for (const strefy of [k.strefy, k.strefyGrafiki]) {
          const miejsca = ukladMiejsc(k.obrys, strefy);
          expect(miejsca).to.have.length(2);
          expect(miejsca.every(m => otwarteMiejsce(m) && prezentacjaMiejsca(m).warstwa === "nad")).to.equal(true);
        }
        const miejsca = ukladMiejsc(k.obrys, k.strefyGrafiki);
        expect(miejsca[0].kierowca).to.equal(true);
        expect(0.5 + miejsca[0].y / k.obrys.h).to.be.closeTo(0.46, 1e-6);
        expect(0.5 + miejsca[1].y / k.obrys.h).to.be.closeTo(0.265, 0.0004);
      });

      it("otwarte miejsce ujawnia tożsamość tylko widocznej postaci, bez dostępu do reszty kabiny", function () {
        const otwarte = { prezentacja: { widocznosc: "otwarta" } };
        const widoczny = { object: { isVisible: true } }, ukryty = { object: { isVisible: false } };
        expect(rozpoznawalnyJadacy(otwarte, widoczny, false)).to.equal(true);
        expect(rozpoznawalnyJadacy({}, widoczny, false)).to.equal(false);
        expect(rozpoznawalnyJadacy(otwarte, ukryty, false)).to.equal(false);
        expect(rozpoznawalnyJadacy(otwarte, {}, false)).to.equal(false);
        expect(rozpoznawalnyJadacy({}, ukryty, true)).to.equal(true);
        expect(rozpoznawalnyJadacy(otwarte, null, true)).to.equal(false);
      });

      it("kolejność grafiki pozostaje nad nośnikiem także po zmianie jego sortowania", function () {
        const p = { warstwa: "nad" };
        expect(sortJadacego(1, 0, p)).to.equal(1);
        expect(sortJadacego(1, 100, p)).to.equal(101);
        expect(sortJadacego(200, 100, p)).to.equal(200);
        expect(sortJadacego(200, 100, { warstwa: "pod" })).to.equal(99);
      });
    });

    describe("Undo — historia pojazdu i zapis po ruchu", function () {
      // Exercise the configured layer's real storeHistory without changing the user's history.
      function historia() {
        const layer = Object.create(canvas.tokens);
        layer.history = [];
        return layer;
      }

      it("synchronizacja miejsc i obrysu nie dokłada wpisu ani nie usuwa starszych", function () {
        const layer = historia();
        layer.storeHistory("update", [{ _id: "vehicle", rotation: 270 }], {});
        const original = layer.history[0];
        const data = [{ _id: "rider", x: 10, y: 20 }, { _id: "vehicle", width: 3, height: 1.5 }];
        layer.storeHistory("update", data, { [OPCJA_SYNCHRONIZACJI]: true });
        expect(layer.history).to.have.length(1);
        expect(layer.history[0]).to.equal(original);
        expect(data[0]).to.deep.equal({ _id: "rider", x: 10, y: 20 });
      });

      it("zwykły obrót zachowuje natywną historię (pojazd i zwykły żeton)", function () {
        const layer = historia();
        for (const id of ["vehicle", "ordinary"]) {
          layer.storeHistory("update", [{ _id: id, rotation: 45 }], {});
        }
        expect(layer.history.map(h => h.data)).to.deep.equal([
          [{ _id: "vehicle", rotation: 45 }], [{ _id: "ordinary", rotation: 45 }]
        ]);
      });

      it("ruch zachowuje pozycję, obrys i historię drogi sprzed ruchu w opcjach undo rdzenia", function () {
        const layer = historia();
        const origin = { x: 100, y: 200, elevation: 0, width: 3, height: 1.5, depth: 1, shape: 4, level: "default" };
        const waypoints = [{ ...origin, cost: 0 }];
        layer.storeHistory("update", [{ _id: "vehicle", x: 600, y: 500, rotation: 270 }], {
          _movement: { vehicle: { origin, passed: { waypoints: [{ ...origin, x: 700 }] },
            recorded: true, history: { recorded: { waypoints } } } }
        });
        const h = layer.history[0];
        expect(h.data).to.deep.equal([{ _id: "vehicle", rotation: 270, _movementHistory: waypoints }]);
        expect(h.options).to.deep.equal({
          movement: { vehicle: { waypoints: [{ ...origin, action: "displace" }], method: "undo" } },
          diff: false, animate: false
        });
      });

      it("tworzenie i usuwanie żetonów dalej zapisuje historię", function () {
        const layer = historia();
        for (const type of ["create", "delete"]) {
          layer.storeHistory(type, [{ _id: "vehicle" }], {});
        }
        expect(layer.history.map(h => h.type)).to.deep.equal(["create", "delete"]);
      });

      it("pochodne tworzenie, zmiana i usunięcie światła nie mają niezależnego undo", function () {
        const layer = Object.create(canvas.lighting);
        layer.history = [];
        for (const type of ["create", "update", "delete"]) {
          layer.storeHistory(type, [{ _id: "companion", x: 10 }], { [OPCJA_SYNCHRONIZACJI]: true });
        }
        expect(layer.history).to.have.length(0);
        layer.storeHistory("create", [{ _id: "manual" }], {});
        expect(layer.history).to.have.length(1);
      });
    });

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

      it("fotele dostarczonej Osobówki: przód na siedziskach, trzy miejsca na kanapie; zachowane po powiększeniu auta", function () {
        for (const skala of [1, 1.2]) {
          const obrys = { w: osobowka.obrys.w * skala, h: osobowka.obrys.h * skala };
          const ms = ukladMiejsc(obrys, osobowka.strefyGrafiki);
          expect(ms).to.have.length(5);
          const ulamki = ms.map(m => [0.5 + m.x / obrys.w, 0.5 + m.y / obrys.h]);
          const oczekiwane = [[0.63, 0.515], [0.37, 0.515], [0.67, 0.35], [0.5, 0.35], [0.33, 0.35]];
          for (let i = 0; i < ms.length; i++) {
            expect(ulamki[i][0]).to.be.closeTo(oczekiwane[i][0], 0.001);
            expect(ulamki[i][1]).to.be.closeTo(oczekiwane[i][1], 0.001);
          }
          expect(ms[0].kierowca).to.equal(true);
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
