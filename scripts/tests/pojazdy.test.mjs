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
  PODWOZIA, KATALOG_POJAZDOW, CECHY_POJAZDOW, cechyPojazdu, rozmiarPojazdu, ST_NA_KROTKO, SKALA_POJAZDOW, obrysWSkali
} from "../config/vehicles-data.mjs";
import {
  kwadrant, obrysPrzyObrocie, obrysZamieniony, obroc, ukladMiejsc, srodekMiejsca, naroznikDlaSrodka,
  punktWPojezdzie, roznicaKatow, normalizujKat, ROZMIAR_MIEJSCA
} from "../pojazdy/geometria.mjs";
import { kosztPrzesiadki, oznaczeniaDosiadania } from "../pojazdy/jadacy.mjs";
import { grafikaWiezy, kadrGrafikiMiejsc } from "../pojazdy/grafika.mjs";
import {
  kratkaPojazdu, metryJednostki, rozmiarMiejsca, skalaPojazdu, trybSceny, wymiaryZetonu,
  daneNosnika, jestPojazdem, miejscaNosnika, profilNosnika
} from "../pojazdy/stan.mjs";
import { skretyNaDrodze, utrudnienieZGrzbietu } from "../pojazdy/jazda.mjs";
import { OPCJA_SYNCHRONIZACJI } from "../pojazdy/historia.mjs";
import { otwarteMiejsce, prezentacjaMiejsca, rozpoznawalnyJadacy, sortJadacego } from "../pojazdy/prezentacja.mjs";
import { mnoznikGrafiki, przytnijSkale } from "../scenes/skala-istot.mjs";
import { POZYCJE as POZYCJE_PALETY, budzetPalety, fazaZCzasu, wygasniecie } from "../pojazdy/paleta.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const blisko = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

export function registerPojazdyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.pojazdy`, context => {
    const { describe, it, expect } = context;

    describe("Osobna grafika wieży", function () {
      const native=()=>({texture:{src:'body.webp'},actor:{flags:{[MODULE_ID]:{pojazd:{grafika:{
        nadwozie:'body.webp',kadlub:'hull.webp',wieza:{src:'turret.webp',...KATALOG_POJAZDOW.bwp.wiezaGrafiki}
      }}}}}});
      it("dopuszcza zarejestrowany wycinek tylko nad odpowiadającym mu nadwoziem", function () {
        const doc=native();
        expect(grafikaWiezy(doc)?.os).to.deep.equal([300,790]);
        doc.texture.src='custom.webp';expect(grafikaWiezy(doc)).to.equal(null);
        doc.texture.src='wreck.webp';expect(grafikaWiezy(doc)).to.equal(null);
        expect(grafikaWiezy({})).to.equal(null);
      });
      it("odrzuca niepełną geometrię i oś poza wycinkiem zamiast rysować błędną warstwę", function () {
        for(const bad of [{os:[NaN,790]},{kadr:[0,1350]},{wycinek:[0,0,20,20]},{wycinek:[81,586,-1,627]}]){
          const doc=native();Object.assign(doc.actor.flags[MODULE_ID].pojazd.grafika.wieza,bad);
          expect(grafikaWiezy(doc)).to.equal(null);
        }
      });
      it("lufa Abramsa wystaje poza obrys, a okno Miejsc zachowuje skalę i początek kadłuba", function () {
        const doc=native();doc.texture={src:'body.webp',...KATALOG_POJAZDOW.czolg.teksturaGrafiki};
        doc.actor.flags[MODULE_ID].pojazd.grafika.wieza={src:'turret.webp',...KATALOG_POJAZDOW.czolg.wiezaGrafiki};
        expect(kadrGrafikiMiejsc(doc,260,560)).to.deep.equal({width:260,height:700,x:0,y:0});
        doc.texture.src='custom.webp';expect(kadrGrafikiMiejsc(doc,260,560)).to.deep.equal({width:260,height:560,x:0,y:0});
      });
    });

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

      it("ciężarówka ma trzy zakryte miejsca w kabinie i osiem otwartych na pace", function () {
        const k = KATALOG_POJAZDOW.ciezarowka;
        for (const strefy of [k.strefy, k.strefyGrafiki]) {
          const miejsca = ukladMiejsc(k.obrys, strefy), paka = miejsca.filter(m => m.strefa === "paka");
          expect(miejsca).to.have.length(11);
          expect(miejsca.filter(m => !otwarteMiejsce(m))).to.have.length(3);
          expect(paka).to.have.length(8);
          expect(paka.every(m => otwarteMiejsce(m) && m.stojace && m.oslona === "polowa"
            && prezentacjaMiejsca(m).warstwa === "nad")).to.equal(true);
        }
        const miejsca = ukladMiejsc(k.obrys, k.strefyGrafiki);
        expect(miejsca[0].kierowca).to.equal(true);
        // Geometry rounds to 0.001 square, so compare the normalized art anchor within that precision.
        expect(miejsca.slice(0, 3).every(m => blisko(0.5 + m.y / k.obrys.h, 0.709444, 0.0001))).to.equal(true);
      });

      it("Bradley: kierowca, dwóch w wieży i sześciu przy burtach, twarzami do środka", function () {
        const k = KATALOG_POJAZDOW.bwp, ms = ukladMiejsc(k.obrys,k.strefy);
        expect(ms).to.have.length(PODWOZIA.bwp.zaloga);
        expect(ms.filter(m=>m.kierowca)).to.have.length(1);
        expect(ms.filter(m=>m.strefa==='wieza')).to.have.length(2);
        const desant=ms.filter(m=>m.strefa==='desant');
        expect(desant).to.have.length(6);
        for(const m of desant){
          const facing=obroc({x:0,y:1},m.obrot);
          expect(facing.x*m.x).to.be.below(0);
          expect(Math.abs(facing.y)).to.be.below(1e-6);
        }
      });
      it("Abrams: kierowca pośrodku, dowódca za działonowym, ładowniczy po drugiej stronie", function () {
        const k=KATALOG_POJAZDOW.czolg,ms=ukladMiejsc(k.obrys,k.strefyGrafiki);
        expect(ms).to.have.length(4);
        const driver=ms.find(m=>m.kierowca),commander=ms.find(m=>m.id==='wieza-0-0'),loader=ms.find(m=>m.id==='wieza-1-0'),gunner=ms.find(m=>m.strefa==='dzialo');
        expect(driver.x).to.equal(0);expect(driver.y).to.be.above(gunner.y);
        expect(commander.x).to.be.below(0);expect(gunner.x).to.be.below(0);
        expect(commander.y).to.be.below(gunner.y);expect(loader.x).to.be.above(0);
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

      it("S1: na siodle przednie miejsce rysuje się nad tylnym, cała obsada między nośnikiem a następną liczbą", function () {
        const p = { warstwa: "nad" };
        const [kier, pas] = ukladMiejsc(KATALOG_POJAZDOW.motocykl.obrys, KATALOG_POJAZDOW.motocykl.strefy);
        expect(kier.y).to.be.above(pas.y);
        const sk = sortJadacego(101, 100, p, kier), sp = sortJadacego(101, 100, p, pas);
        expect(sk).to.be.above(sp);
        for (const s of [sk, sp]) expect(s).to.be.at.least(101).and.below(102);
        // Autobus: najdalszy przód i tył mieszczą się w ułamku.
        const bus = ukladMiejsc(KATALOG_POJAZDOW.autobus.obrys, KATALOG_POJAZDOW.autobus.strefy);
        for (const m of bus) expect(sortJadacego(101, 100, p, m)).to.be.at.least(101).and.below(102);
        expect(sortJadacego(99, 100, { warstwa: "pod" }, kier)).to.be.below(100);
      });
    });

    describe("Paleta kierowcy (D41, K1)", function () {
      it("Gaz do dechy: +2× Szybkości, ST +5, Utrudnienie ataków; w fazie 1 zostaje tylko ST (do końca następnej tury)", function () {
        const b = budzetPalety([{ id: "gazDoDechy", faza: 0 }]);
        expect(b.ruch).to.equal(2);
        expect(b.st).to.equal(5);
        expect(b.atak).to.equal("wszyscy");
        const f1 = budzetPalety([{ id: "gazDoDechy", faza: 1 }]);
        expect([f1.ruch, f1.st, f1.atak]).to.deep.equal([0, 5, null]);
        expect(budzetPalety([{ id: "szostyBieg" }]).atak).to.equal("kierowca");
      });

      it("bieg wsteczny: droga ×2 (½ Szybkości, s. 261); Cofanie autobusu ×4 z Utrudnieniem; bez cechy — bez Utrudnienia", function () {
        expect(budzetPalety([{ id: "wsteczny" }]).mnoznikDrogi).to.equal(2);
        expect(budzetPalety([{ id: "wsteczny" }]).utrudnienie).to.equal(false);
        const bus = budzetPalety([{ id: "wsteczny" }], { cofanie: true, cwierc: true });
        expect([bus.mnoznikDrogi, bus.utrudnienie, bus.wsteczny]).to.deep.equal([4, true, true]);
        expect(budzetPalety([{ id: "wsteczny" }], { cofanie: true }).mnoznikDrogi).to.equal(2);
        expect(budzetPalety([]).mnoznikDrogi).to.equal(1);
      });

      it("wygaśnięcie: początek następnej tury kierowcy → faza 1 albo usunięcie; ta sama tura — nic; koniec tury w fazie 1 → usunięcie", function () {
        const f = { walka: "w", runda: 2, tura: 3, faza: 0 };
        const start = (runda, tura) => ({ walka: "w", runda, tura, krawedz: "start" });
        expect(wygasniecie(f, start(2, 3), POZYCJE_PALETY.gazDoDechy)).to.equal("zostaw");
        expect(wygasniecie(f, start(3, 3), POZYCJE_PALETY.gazDoDechy)).to.equal("faza1");
        expect(wygasniecie(f, start(3, 3), POZYCJE_PALETY.syrena)).to.equal("usun");
        expect(wygasniecie(f, start(3, 3), POZYCJE_PALETY.uciag)).to.equal("zostaw");
        expect(wygasniecie({ ...f, faza: 1 }, { walka: "w", runda: 2, tura: 3, krawedz: "koniec" }, POZYCJE_PALETY.gazDoDechy)).to.equal("usun");
        expect(wygasniecie(f, { walka: "w", runda: 2, tura: 3, krawedz: "koniec" }, POZYCJE_PALETY.gazDoDechy)).to.equal("zostaw");
        expect(wygasniecie(f, start(3, 0), POZYCJE_PALETY.wsteczny)).to.equal("usun");
        expect(wygasniecie(f, { walka: "inna", runda: 9, tura: 0, krawedz: "start" }, POZYCJE_PALETY.gazDoDechy)).to.equal("zostaw");
      });

      it("poza walką zegar świata: runda = 6 s", function () {
        expect(fazaZCzasu({ czas: 100 }, 103)).to.equal(0);
        expect(fazaZCzasu({ czas: 100 }, 106)).to.equal(1);
        expect(fazaZCzasu({ czas: 100 }, 112)).to.equal(2);
        expect(fazaZCzasu({ czas: null, faza: 1 }, 999)).to.equal(1);
      });

      it("każda pozycja z cechą wskazuje istniejącą cechę katalogu, a każda cecha z czasem akcji ma pozycję w palecie", function () {
        for (const [id, p] of Object.entries(POZYCJE_PALETY)) {
          if (p.cecha) expect(CECHY_POJAZDOW[p.cecha], `${id} → ${p.cecha}`).to.exist;
          expect(p.skutek, id).to.be.a("string");
        }
        const zPalety = new Set(Object.values(POZYCJE_PALETY).map(p => p.cecha).filter(Boolean));
        for (const [id, c] of Object.entries(CECHY_POJAZDOW)) {
          if (c.czas && id !== "przerzutka") expect(zPalety.has(id), `cecha ${id} (${c.czas}) bez pozycji palety`).to.equal(true);
        }
      });
    });

    describe("Nośnik — wierzchowiec (§6.3, W1–W4)", function () {
      const MOD = MODULE_ID;
      const kon = (w = { wyszkolony: true }, extra = {}) => ({ type: "npc", flags: { [MOD]: { wierzchowiec: w } },
        prototypeToken: { width: 2, height: 2 }, system: { traits: { size: "lg" } }, ...extra });

      it("profil: pojazd z podwoziem, istota z flagą wierzchowca; pojemnik i zwykła istota — nic", function () {
        expect(profilNosnika(kon())).to.equal("wierzchowiec");
        expect(profilNosnika({ type: "vehicle", flags: { [MOD]: { pojazd: { podwozie: "osobowka" } } } })).to.equal("pojazd");
        expect(profilNosnika({ type: "vehicle", flags: {} })).to.equal(null);
        expect(profilNosnika({ type: "npc", flags: {} })).to.equal(null);
        // Stare nazwy zostają węższe: koń nie jest pojazdem (silnik, awarie, wrak go nie widzą).
        expect(jestPojazdem(kon())).to.equal(false);
      });

      it("obrys z rozmiaru (koń Duży 2 × 2), siodło na środku: jeździec z przodu, pasażer za nim, oba otwarte", function () {
        const d = daneNosnika(kon());
        expect(d.obrys).to.deep.equal({ w: 2, h: 2 });
        const [j, p] = miejscaNosnika(kon());
        expect(j.kierowca).to.equal(true);
        expect(j.x).to.equal(0);
        expect(p.x).to.equal(0);
        expect(j.y).to.be.above(p.y);
        expect(otwarteMiejsce(j) && otwarteMiejsce(p)).to.equal(true);
        // Własne strefy we fladze (muł z jednym siodłem — W-P2).
        const mul = kon({ wyszkolony: true, strefy: [{ id: "siodlo", nazwa: "Siodło", od: 0.5, do: 0.5, rzedy: [1], kolumny: [[0.5]] }] });
        expect(miejscaNosnika(mul)).to.have.length(1);
      });

      it("oznaczenia dosiadania: o rozmiar większy, wyszkolony albo ujeżdżony przez jeźdźca, jedna wolna ręka (D43)", function () {
        const jezdziec = { uuid: "Actor.a", system: { traits: { size: "med" } } };
        expect(oznaczeniaDosiadania(kon(), jezdziec, { wolneRece: 1 })).to.have.length(0);
        expect(oznaczeniaDosiadania(kon(), jezdziec, { wolneRece: 0 })).to.have.length(1);
        expect(oznaczeniaDosiadania(kon(), jezdziec, { wolneRece: 0, jezdziecZdolnosc: true })).to.have.length(0);
        expect(oznaczeniaDosiadania(kon({ wyszkolony: false }), jezdziec, { wolneRece: 2 })).to.have.length(1);
        expect(oznaczeniaDosiadania(kon({ wyszkolony: false, ujezdzony: ["Actor.a"] }), jezdziec, { wolneRece: 2 })).to.have.length(0);
        expect(oznaczeniaDosiadania({ ...kon(), system: { traits: { size: "med" } } }, jezdziec, { wolneRece: 2 })).to.have.length(1);
        // Pasażer: ani ręce, ani wyszkolenie.
        expect(oznaczeniaDosiadania(kon({ wyszkolony: false }), jezdziec, { kierujacy: false, wolneRece: 0 })).to.have.length(0);
      });

      it("atak z grzbietu jadącego wierzchowca: bez Tresury — Utrudnienie; Jeździec i Ale jazda! znoszą dla dystansowych", function () {
        const a = (tre = 0, items = []) => ({ system: { skills: { tre: { value: tre } } }, items });
        expect(utrudnienieZGrzbietu(a())).to.equal(true);
        expect(utrudnienieZGrzbietu(a(1))).to.equal(false);
        expect(utrudnienieZGrzbietu(a(), { jedzie: false })).to.equal(false);
        const jezdziec = a(0, [{ flags: { [MOD]: { abilityId: "jezdziec" } } }]);
        expect(utrudnienieZGrzbietu(jezdziec)).to.equal(false);
        expect(utrudnienieZGrzbietu(jezdziec, { wrecz: true })).to.equal(true);
        expect(utrudnienieZGrzbietu(a(0, [{ flags: { [MOD]: { originAbilityId: "ale-jazda" } } }]))).to.equal(false);
      });

      it("paleta wierzchowca: Bieganie +2×, Przyspieszenie +1×, Unikanie ze statusem; bez pozycji pojazdu", function () {
        expect(budzetPalety([{ id: "bieganie" }])).to.include({ ruch: 2, bieganie: true });
        expect(budzetPalety([{ id: "przyspieszenie" }]).ruch).to.equal(1);
        expect(POZYCJE_PALETY.unikanie.statusy).to.deep.equal(["dodging"]);
        const ids = Object.entries(POZYCJE_PALETY).filter(([, d]) => d.wierzchowiec).map(([id]) => id);
        expect(ids).to.deep.equal(["bieganie", "przyspieszenie", "odstapienie", "unikanie"]);
      });
    });

    describe("Skala grafiki istot (D42, S1)", function () {
      const z = (type, flags = {}) => ({ actor: { type, flags } });

      it("f dostają postacie i BN (także wierzchowce i maszyny); pojazdy, drużyny, obiekty i żetony bez aktora — 1", function () {
        expect(mnoznikGrafiki(z("character"), 0.7)).to.equal(0.7);
        expect(mnoznikGrafiki(z("npc"), 0.7)).to.equal(0.7);
        expect(mnoznikGrafiki(z("npc", { [MODULE_ID]: { wierzchowiec: { wyszkolony: true } } }), 0.7)).to.equal(0.7);
        expect(mnoznikGrafiki(z("vehicle"), 0.7)).to.equal(1);
        expect(mnoznikGrafiki(z("group"), 0.7)).to.equal(1);
        expect(mnoznikGrafiki(z("npc", { [MODULE_ID]: { obiekt: { bazowy: true } } }), 0.7)).to.equal(1);
        expect(mnoznikGrafiki({ actor: null }, 0.7)).to.equal(1);
        expect(mnoznikGrafiki(null, 0.7)).to.equal(1);
      });

      it("wartość przycięta do zakresu 0,5–1; śmieci i zero — bez zmian", function () {
        expect(przytnijSkale(0.6)).to.equal(0.6);
        expect(przytnijSkale(0.2)).to.equal(0.5);
        expect(przytnijSkale(1.4)).to.equal(1);
        for (const v of [0, -1, NaN, "x", null, undefined]) expect(przytnijSkale(v), String(v)).to.equal(1);
      });

      it("ustawienie świata zarejestrowane, domyślnie 0,8 — wybór MG po spike'u S0 (D42, D45)", function () {
        const s = game.settings.settings.get(`${MODULE_ID}.skalaGrafikiIstot`);
        expect(s?.scope).to.equal("world");
        expect(s?.default).to.equal(0.8);
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

      it("mapy kampanii 1,5 m (64 i 70 px): kratka pojazdu = kratka sceny, obrys katalogu ×1,1 (D45)", function () {
        for (const px of [64, 70]) {
          const s = scena(px, 1.5);
          expect(kratkaPojazdu(s)).to.equal(px);
          expect(skalaPojazdu(s)).to.equal(1);
          expect(trybSceny(s)).to.equal("taktyczna");
          expect(wymiaryZetonu(osobowka, s, 0)).to.deep.equal({ w: 1.65, h: 3.3 });
          expect(SKALA_POJAZDOW, "D45: mnożnik pojazdów").to.equal(1.1);
        }
      });

      it("siatka 3 m: pojazd ma połowę kratek, miejsce ćwierć kratki — ta sama wielkość w metrach", function () {
        const s = scena(70, 3);
        expect(kratkaPojazdu(s)).to.equal(35);
        expect(wymiaryZetonu(osobowka, s, 0)).to.deep.equal({ w: 0.825, h: 1.65 });
        expect(wymiaryZetonu(osobowka, s, 90), "bokiem").to.deep.equal({ w: 1.65, h: 0.825 });
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

      it("skręt rozbity przez rdzeń na kroki po kratkach (skos po 45°) to dalej jeden skręt o 90°", function () {
        // Jedzie w prawo (270°), potem skosem w prawo-w dół, potem w dół: dwa kroki po 45°.
        const s = skretyNaDrodze(270, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 200, y: 300 }]);
        expect(s.map(x => [x.rodzaj, x.kat])).to.deep.equal([["skret", 90]]);
        // Zygzak prosto (prawo, skos, prawo, skos) — żadnego skrętu.
        expect(skretyNaDrodze(270, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 100 }, { x: 300, y: 100 }, { x: 400, y: 200 }])).to.have.length(0);
      });
    });

    describe("Katalog M4 (§5) ↔ tabela s. 262", function () {
      it("każde podwozie ma wpis katalogu i odwrotnie", function () {
        expect(Object.keys(KATALOG_POJAZDOW).sort()).to.deep.equal(Object.keys(PODWOZIA).sort());
      });

      it("liczba miejsc = Załoga (Autobus: 20 + kierowca; paka ciężarówki ponad Załogą)", function () {
        for (const [id, kat] of Object.entries(KATALOG_POJAZDOW)) {
          const ms = ukladMiejsc(kat.obrys, kat.strefy);
          // Only the truck's extra cargo deck is outside the tabulated crew count.
          // A standing skateboard driver is still its one crew member.
          const bezPaki = id === "ciezarowka" ? ms.filter(m => m.strefa !== "paka").length : ms.length;
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
          expect([a.prototypeToken.width, a.prototypeToken.height], `${a.name} obrys`).to.deep.equal([obrysWSkali(k.obrys).w, obrysWSkali(k.obrys).h]);
          expect(a.prototypeToken.lockRotation).to.be.false;
          expect(a.items.size, `${a.name} cechy`).to.equal(k.cechy.length);
        }
      });
    });
  });
}
