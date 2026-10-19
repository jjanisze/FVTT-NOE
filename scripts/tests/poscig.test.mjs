/**
 * Neuroshima 5e — pościgi i pojazdy: dane podwozi + geometria planszy.
 *
 * Warstwa 1 wg `TESTING.md` — czyste struktury i czyste funkcje, najwyższy zwrot z testu.
 * Świadomie **nie** testujemy tu `start()`, `konfiguruj()` ani warstwy PIXI: pierwsze dwa
 * tworzą i aktywują scenę (a zasada tej warstwy testowej brzmi „żadnego przełączania scen"),
 * trzecia potrzebuje żywego `canvas`. To, co zostaje, i tak niesie całą arytmetykę, na której
 * stoi plansza — a to ona po cichu skłamie, jeśli ktoś ruszy stałe.
 *
 * Czego pilnujemy i dlaczego akurat tego:
 *
 *  - **`torX` ↔ `xNaTor` muszą być odwracalne.** Numer toru jest jedyną prawdą o pozycji
 *    w pościgu (zasięgi liczymy z numerów, nie z linijki Foundry'ego — patrz `poscig.mjs`).
 *    Rozjazd o jeden tor to cicha zmiana odległości o 36 m i błędny warunek końca pościgu.
 *  - **`znacznikiZDystansu` to reguła z podręcznika, nie zaokrąglanie.** „Aby przesunąć się
 *    o 1 znacznik, kierowca musi przemieścić pojazd o co najmniej 36 m" — 71 m to wciąż
 *    jeden znacznik. Zamiana `floor` na `round` przeszłaby bez śladu w kodzie i zmieniła
 *    zasady przy stole.
 *  - **Tabela podwozi karmi generator pojazdów i kartę pojazdu naraz.** Rozmiar spoza
 *    `CONFIG.DND5E.actorSizes` nie rzuca wyjątku przy tworzeniu aktora — po prostu robi
 *    pojazd o złych wymiarach na mapie.
 *  - **`progAwarii === null` znaczy „pojazd niesilnikowy".** Rower i deskorolka nie mają
 *    Progu awarii, bo nie podlegają Tabeli Awarii Pojazdów Silnikowych. Gdyby ktoś wpisał
 *    tam liczbę, zaczęlibyśmy losować awarie silnika rowerowi.
 */

import {
  PODWOZIA, SRODOWISKA, SRODOWISKO_DOMYSLNE, ttBezruchu, znacznikiZDystansu,
  METRY_NA_ZNACZNIK, START_SCIGANI, START_SCIGAJACY, PRZEWAGA_KONCZACA, RUND_MAKS
} from "../config/vehicles-data.mjs";
import {
  daneSceny, torX, xNaTor, dystansZnacznikow, wymiary, wymiaryPionka, yWTorze,
  LANE_W, MARGIN_X, FREEFORM_Y, FREEFORM_H, PAS_GORA, TORY_DOMYSLNIE, METRY_TORU_NA_OBRAZIE, WERSJA_PLANSZY
} from "../scenes/poscig.mjs";
import { kratkaPojazdu, trybSceny } from "../pojazdy/stan.mjs";
import {
  torCiagly, wyspaPunktuCzysta, naDrodzeCzyste, odlegloscWspolrzednych, podepnijSiatke
} from "../scenes/droga.mjs";
import { snapDoToru, deltaRecentrowania, rozstawMiesciSie } from "../scenes/poscig-snap.mjs";
import { MOTYWY, MOTYW_DOMYSLNY, motywPoscigu } from "../scenes/poscig-themes.mjs";
import { przyciagnietyDoToru, wPasiePoscigu, rotationNaPrawo, ziarnoPionka, kolysanie, rytmKolysania, kolysanieZegara } from "../scenes/poscig-motion-model.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export function registerPoscigTests(quench) {
  quench.registerBatch(`${MODULE_ID}.poscig`, context => {
    const { describe, it, expect } = context;

    describe("Motywy planszy i animacja pojazdów", function () {
      const centered = { poscig: true, x: torX(4) - 100, y: 700, width: 1, height: 1, gridSize: 200, tory: 12 };

      it("stare plansze i nieznany motyw używają pustyni Nevady", function () {
        expect(MOTYWY).to.have.property(MOTYW_DOMYSLNY);
        expect(motywPoscigu({})).to.equal(MOTYWY.pustynia);
        expect(motywPoscigu({ motyw: "nieznany" })).to.equal(MOTYWY.pustynia);
      });

      it("każdy motyw definiuje wszystkie elementy i polską nazwę", function () {
        expect(Object.keys(MOTYWY)).to.have.length(3);
        for (const [id, theme] of Object.entries(MOTYWY)) {
          expect(theme.id).to.equal(id);
          expect(theme.nazwa).to.be.a("string").with.length.above(8);
          expect(theme).to.have.all.keys("id", "nazwa", "seed", "bitmap", "sky", "far", "mid", "near", "lanes", "labels", "free", "ambient");
          expect(theme.bitmap).to.be.a("boolean");
          for (const part of ["far", "mid", "near"]) {
            expect(theme[part].colors.length).to.be.at.least(2);
            expect(theme[part].parallax).to.be.above(0);
          }
          expect(theme.sky).to.have.length(3);
          expect(theme.labels.fill).to.be.a("number");
          expect(theme.lanes.line).to.be.a("number");
        }
      });

      it("wybór motywu nie zmienia środowiska ani ST", function () {
        for (const motyw of Object.keys(MOTYWY)) {
          const flag = daneSceny({nazwa: "T", tory: 12, srodowisko: "ciasno", motyw}).flags[MODULE_ID].poscig;
          expect(flag.motyw).to.equal(motyw); expect(flag.st).to.equal(15);
        }
      });

      it("środek na torze i tolerancja jednego piksela włączają kołysanie", function () {
        expect(przyciagnietyDoToru(centered)).to.be.true;
        expect(przyciagnietyDoToru({...centered, x: centered.x + .9})).to.be.true;
      });

      it("Shift między torami, swobodna strefa i inna scena wyłączają kołysanie", function () {
        expect(przyciagnietyDoToru({...centered, x: centered.x + 55})).to.be.false;
        expect(przyciagnietyDoToru({...centered, y: FREEFORM_Y - 100})).to.be.false;
        expect(przyciagnietyDoToru({...centered, poscig: false})).to.be.false;
      });

      it("tory poza planszą nie są miejscem kołysania", function () {
        for (const lane of [0, 13]) expect(przyciagnietyDoToru({...centered, x: torX(lane) - 100})).to.be.false;
      });

      it("granica strefy bierze środek tokenu, także większego", function () {
        expect(wPasiePoscigu({...centered, y: 1199})).to.be.true;
        expect(wPasiePoscigu({...centered, y: 1200})).to.be.false;
        expect(wPasiePoscigu({...centered, y: 1100, height: 2})).to.be.false;
      });

      it("różne natywne kierunki grafiki dostają właściwy obrót dokumentu", function () {
        expect(rotationNaPrawo()).to.equal(270);
        expect(rotationNaPrawo(90)).to.equal(0);
        expect(rotationNaPrawo(180)).to.equal(90);
        expect(rotationNaPrawo(-90)).to.equal(180);
        expect(rotationNaPrawo(450)).to.equal(0);
      });

      it("kołysanie jest deterministyczne i każdy pionek ma własną fazę", function () {
        const seed = ziarnoPionka("pojazd-a");
        expect(ziarnoPionka("pojazd-a")).to.equal(seed);
        expect(kolysanie(seed, 3)).to.deep.equal(kolysanie(seed, 3));
        expect(kolysanie(seed, 3)).to.not.deep.equal(kolysanie(ziarnoPionka("pojazd-b"), 3));
      });

      it("amplituda pozostaje delikatna i środek nigdy nie opuszcza toru", function () {
        for (let seed = 0; seed < 8; seed++) for (let t = 0; t < 60; t += .17) {
          const s = kolysanie(ziarnoPionka(String(seed)), t, 4);
          expect(Math.abs(s.x)).to.be.below(1.2);
          expect(Math.abs(s.y)).to.be.below(6);
          expect(Math.abs(s.rotation)).to.be.below(.04);
          expect(xNaTor(torX(4) + s.x)).to.equal(4);
        }
      });

      it("zatrzymana droga i wyłączone ustawienie zerują wszystkie składowe", function () {
        for (const [tempo, enabled] of [[0,true],[1,false],[-1,true]]) {
          expect(kolysanie(5, 1, tempo, enabled)).to.deep.equal({x: 0, y: 0, rotation: 0});
        }
      });

      it("wynik może być używany ponownie bez alokacji na klatkę", function () {
        const out = {};
        expect(kolysanie(5, 2, 1, true, out)).to.equal(out);
        expect(kolysanie(5, 3, 0, true, out)).to.equal(out);
        expect(out).to.deep.equal({x: 0, y: 0, rotation: 0});
      });

      it("pojazd długości jednego toru zachowuje dostrojone kołysanie", function () {
        const seed = ziarnoPionka("pojazd-a");
        for (const t of [0, 1.3, 17, 600]) expect(kolysanie(seed, t, 2, true, {}, 1)).to.deep.equal(kolysanie(seed, t, 2));
        expect(kolysanieZegara(seed, 5 * rytmKolysania(2), 2)).to.deep.equal(kolysanie(seed, 5, 2));
      });

      it("większy pojazd kołysze się szerzej i wolniej, mniejszy ciaśniej i szybciej", function () {
        const peaks = size => {
          const p = {x: 0, y: 0, rotation: 0};
          for (let t = 0; t < 120; t += .01) {
            const s = kolysanie(ziarnoPionka("pojazd-a"), t, 2, true, {}, size);
            for (const k in p) p[k] = Math.max(p[k], Math.abs(s[k]));
          }
          return p;
        };
        const motocykl = peaks(.5), auto = peaks(1), autobus = peaks(3);
        expect(rytmKolysania(2, .5)).to.be.above(rytmKolysania(2, 1));
        expect(rytmKolysania(2, 4)).to.be.closeTo(rytmKolysania(2, 1) / 2, 1e-12);
        expect(autobus.y).to.be.above(auto.y * 2.5);
        expect(auto.y).to.be.above(motocykl.y * 1.6);
        expect(autobus.x).to.be.above(auto.x).and.below(auto.x * 2);
        // Large hulls yaw through a smaller angle — their ends still sweep further.
        expect(autobus.rotation).to.be.below(auto.rotation);
        expect(autobus.rotation * 3).to.be.above(auto.rotation);
      });

      it("skrajności QuickScale są ograniczone, a środek nadal nie opuszcza toru", function () {
        const seed = ziarnoPionka("pojazd-a");
        expect(kolysanie(seed, 7, 2, true, {}, 10)).to.deep.equal(kolysanie(seed, 7, 2, true, {}, 6));
        expect(kolysanie(seed, 7, 2, true, {}, .1)).to.deep.equal(kolysanie(seed, 7, 2, true, {}, .25));
        for (let t = 0; t < 60; t += .17) {
          const s = kolysanie(seed, t, 4, true, {}, 10);
          expect(xNaTor(torX(4) + s.x)).to.equal(4);
        }
      });
    });

    /* -------------------------------------------- */

    describe("Podwozia — tabela s. 262", function () {

      it("klucz obiektu zgadza się z polem `id`", function () {
        for (const [klucz, p] of Object.entries(PODWOZIA)) {
          expect(p.id, `podwozie "${klucz}"`).to.equal(klucz);
        }
      });

      it("nazwy są unikalne", function () {
        const nazwy = Object.values(PODWOZIA).map(p => p.nazwa);
        expect(nazwy.length).to.equal(new Set(nazwy).size);
      });

      it("każde podwozie ma komplet liczb, których wymaga karta pojazdu", function () {
        for (const p of Object.values(PODWOZIA)) {
          for (const pole of ["zaloga", "ladownosc", "tt", "pw", "progObrazen", "cena", "dostepnosc"]) {
            expect(p[pole], `${p.nazwa}.${pole}`).to.be.a("number");
            expect(Number.isFinite(p[pole]), `${p.nazwa}.${pole} skończone`).to.be.true;
            expect(p[pole], `${p.nazwa}.${pole} nieujemne`).to.be.at.least(0);
          }
        }
      });

      it("`rozmiar` — jeśli podany — jest kluczem znanym dnd5e", function () {
        const znane = Object.keys(CONFIG.DND5E.actorSizes);
        for (const p of Object.values(PODWOZIA)) {
          if (p.rozmiar === null) continue;
          expect(znane, `${p.nazwa} → "${p.rozmiar}"`).to.include(p.rozmiar);
        }
      });

      it("Próg awarii mają dokładnie pojazdy silnikowe", function () {
        for (const p of Object.values(PODWOZIA)) {
          if (p.silnikowy) expect(p.progAwarii, `${p.nazwa}`).to.be.a("number");
          else expect(p.progAwarii, `${p.nazwa} (niesilnikowy)`).to.be.null;
        }
      });

      it("pojazd bez własnej Szybkości musi tłumaczyć, skąd ją bierze", function () {
        for (const p of Object.values(PODWOZIA)) {
          if (p.szybkosc === null) expect(p.szybkoscOpis, `${p.nazwa}`).to.be.a("string");
          else expect(p.szybkosc, `${p.nazwa}`).to.be.above(0);
        }
      });

      it("cofanie nigdy nie jest szybsze niż jazda do przodu", function () {
        for (const p of Object.values(PODWOZIA)) {
          if (p.cofanie === null || p.szybkosc === null) continue;
          expect(p.cofanie, `${p.nazwa}`).to.be.at.most(p.szybkosc);
        }
      });

      it("Hammer — podwozie GMT400 drużyny — zgadza się z tabelą co do liczby", function () {
        // Ten wpis jest sprawdzany osobno, bo to z niego zbudowano oba pojazdy w świecie
        // (GMT400 i Hammer Posterunku). Cicha literówka tutaj przepisuje im statystyki.
        expect(PODWOZIA.hammer).to.include({
          szybkosc: 36, cofanie: 18, zaloga: 5, ladownosc: 1000,
          tt: 17, pw: 100, progObrazen: 10, progAwarii: 25,
          cena: 1600, dostepnosc: 10, rozmiar: "huge", silnikowy: true
        });
      });

      it("Szybkość Hammera to równo jeden znacznik na turę", function () {
        // Nie kosmetyka: cała plansza stoi na tym, że 36 m = jeden tor.
        expect(znacznikiZDystansu(PODWOZIA.hammer.szybkosc)).to.equal(1);
      });
    });

    /* -------------------------------------------- */

    describe("TT w bezruchu", function () {

      it("zwraca wartość z podręcznika, gdy podręcznik ją podaje", function () {
        const w = ttBezruchu(PODWOZIA.osobowka);
        expect(w).to.deep.equal({ wartosc: 10, zrodlo: "podrecznik" });
      });

      it("dla podwozi bez statbloku ekstrapoluje −5 i mówi o tym wprost", function () {
        const w = ttBezruchu(PODWOZIA.hammer);
        expect(w.wartosc).to.equal(PODWOZIA.hammer.tt - 5);
        expect(w.zrodlo).to.equal("ekstrapolacja");
      });

      it("każde podwozie z własnym statblokiem trzyma się wzorca −5", function () {
        for (const p of Object.values(PODWOZIA)) {
          if (p.ttBezruchu === null) continue;
          expect(p.ttBezruchu, `${p.nazwa}`).to.equal(p.tt - 5);
        }
      });
    });

    /* -------------------------------------------- */

    describe("Środowiska pościgu — tabela s. 266", function () {

      it("ST-y są dokładnie te z podręcznika", function () {
        expect(SRODOWISKA.otwarte.st).to.equal(5);
        expect(SRODOWISKA.ulice.st).to.equal(10);
        expect(SRODOWISKA.ciasno.st).to.equal(15);
      });

      it("klucz zgadza się z polem `id`, a domyślne środowisko istnieje", function () {
        for (const [klucz, s] of Object.entries(SRODOWISKA)) expect(s.id).to.equal(klucz);
        expect(SRODOWISKA).to.have.property(SRODOWISKO_DOMYSLNE);
      });
    });

    /* -------------------------------------------- */

    describe("Stałe zasad pościgu", function () {

      it("odpowiadają podręcznikowi", function () {
        expect(METRY_NA_ZNACZNIK, "36 m na znacznik").to.equal(36);
        expect(START_SCIGANI, "ścigani na znaczniku 4").to.equal(4);
        expect(START_SCIGAJACY, "ścigający na znaczniku 1").to.equal(1);
        expect(PRZEWAGA_KONCZACA, "7 znaczników przewagi kończy pościg").to.equal(7);
        expect(RUND_MAKS, "10 rund").to.equal(10);
      });

      it("domyślna plansza mieści start plus pełną przewagę kończącą", function () {
        // 4 (start ściganego) + 7 (przewaga) = 11 torów musi się zmieścić, inaczej pościg
        // nie może się skończyć w sposób, który przewiduje podręcznik.
        expect(TORY_DOMYSLNIE).to.be.at.least(START_SCIGANI + PRZEWAGA_KONCZACA);
      });
    });

    /* -------------------------------------------- */

    describe("Znaczniki z przebytego dystansu", function () {

      it("liczy pełne 36-metrowe odcinki, nie zaokrągla", function () {
        expect(znacznikiZDystansu(0), "0 m").to.equal(0);
        expect(znacznikiZDystansu(35), "35 m — za mało").to.equal(0);
        expect(znacznikiZDystansu(36), "36 m — równo jeden").to.equal(1);
        expect(znacznikiZDystansu(71), "71 m — wciąż jeden, nie dwa").to.equal(1);
        expect(znacznikiZDystansu(72), "72 m — Gazu! na Hammerze").to.equal(2);
        expect(znacznikiZDystansu(108), "108 m — Gaz do dechy").to.equal(3);
      });

      it("znosi śmieci zamiast liczby", function () {
        for (const zle of [undefined, null, NaN, "abc"]) {
          expect(znacznikiZDystansu(zle), String(zle)).to.equal(0);
        }
      });
    });

    /* -------------------------------------------- */

    describe("Geometria planszy", function () {

      it("`torX` trafia w środek toru", function () {
        expect(torX(1)).to.equal(MARGIN_X + (LANE_W / 2));
        expect(torX(2)).to.equal(MARGIN_X + LANE_W + (LANE_W / 2));
      });

      it("`xNaTor` odwraca `torX` dla każdego toru domyślnej planszy", function () {
        for (let tor = 1; tor <= TORY_DOMYSLNIE; tor++) {
          expect(xNaTor(torX(tor)), `tor ${tor}`).to.equal(tor);
        }
      });

      it("`xNaTor` jest stabilne na całej szerokości toru, także na jego krawędziach", function () {
        const lewa = MARGIN_X + (4 * LANE_W);              // lewa krawędź toru 5
        expect(xNaTor(lewa), "lewa krawędź").to.equal(5);
        expect(xNaTor(lewa + LANE_W - 1), "tuż przed prawą").to.equal(5);
        expect(xNaTor(lewa + LANE_W), "prawa krawędź to już następny").to.equal(6);
      });

      it("`xNaTor` zwraca tory spoza planszy, zamiast je przycinać", function () {
        // Wyjście poza krawędź jest właśnie sygnałem do recentrowania pola (PLAN §2.5) —
        // przycięcie tutaj zjadłoby ten sygnał po cichu.
        expect(xNaTor(MARGIN_X - 1), "na lewo od toru 1").to.be.below(1);
        expect(xNaTor(torX(TORY_DOMYSLNIE) + LANE_W), "za ostatnim torem")
          .to.be.above(TORY_DOMYSLNIE);
      });

      it("dystans między torami liczy się w znacznikach po 36 m", function () {
        expect(dystansZnacznikow(1, 1)).to.equal(0);
        expect(dystansZnacznikow(1, 4), "start pościgu").to.equal(3 * METRY_NA_ZNACZNIK);
        expect(dystansZnacznikow(4, 1), "symetrycznie").to.equal(3 * METRY_NA_ZNACZNIK);
      });

      it("`wymiary` rosną o dokładnie jeden tor na tor", function () {
        const a = wymiary(12);
        const b = wymiary(13);
        expect(a.width).to.equal((12 * LANE_W) + (2 * MARGIN_X));
        expect(b.width - a.width).to.equal(LANE_W);
        expect(a.height, "wysokość nie zależy od liczby torów").to.equal(b.height);
      });

      it("wysokość planszy to pas pościgu plus strefa swobodna", function () {
        expect(wymiary(12).height).to.equal(FREEFORM_Y + FREEFORM_H);
      });

      it("pionki mieszczą się między górą pasa a strefą swobodną", function () {
        // Gdyby PAS_GORA zjechało pod FREEFORM_Y, pionki startowałyby w strefie swobodnej,
        // czyli poza mechaniką pościgu — i nikt by tego nie zauważył poza dziwnym obrazkiem.
        expect(PAS_GORA).to.be.below(FREEFORM_Y);
        expect(PAS_GORA).to.be.at.least(0);
      });
    });

    /* -------------------------------------------- */

    describe("Konfiguracja generowanej sceny", function () {

      it("plansza NIE jest gridless — inaczej nic się nie przyciąga", function () {
        // Regresja złapana na żywo 2026-09-12: pierwsza wersja generowała scenę GRIDLESS,
        // „bo wtedy Foundry nic nie przyciąga i dołożymy własne przyciąganie". Jest odwrotnie —
        // na gridless Foundry wyłącza przyciąganie na twardo (`Token#_updateDragDestination`:
        // `if (canvas.grid.isGridless) snap = false;`), więc `getSnappedPosition` nie jest
        // w ogóle wołane i nadpisanie go nie robi nic. Pionki nie przyciągały się wcale.
        const dane = daneSceny({ nazwa: "T", tory: 12, srodowisko: "otwarte" });
        expect(dane.grid.type).to.not.equal(CONST.GRID_TYPES.GRIDLESS);
        expect(dane.grid.type).to.equal(CONST.GRID_TYPES.SQUARE);
      });

      it("kolumna siatki pokrywa się z torem, a siatka jest niewidoczna", function () {
        const dane = daneSceny({ nazwa: "T", tory: 12, srodowisko: "otwarte" });
        expect(dane.grid.size, "bok siatki = szerokość toru").to.equal(LANE_W);
        expect(dane.grid.alpha, "siatki nie widać — tory rysuje warstwa PIXI").to.equal(0);
      });

      it("złożona droga (D24): tor rysowany jako 6 m — pojazdy w prawdziwej skali, mierzony jako znacznik 36 m", function () {
        // Pomiar między pojazdami robi metryka drogi (36 m na tor); `grid.distance` to skala rysunku, 70 px na 1,5 m
        // jak mapy kampanii. Gdyby wróciło 36 m, pojazd w skali miałby 8 px i M4 uznałby planszę za znacznik.
        const dane = daneSceny({ nazwa: "T", tory: 12, srodowisko: "otwarte" });
        const scena = { grid: dane.grid, getFlag: (m, k) => dane.flags[m]?.[k] };
        expect(dane.grid.distance).to.equal(METRY_TORU_NA_OBRAZIE);
        expect(METRY_NA_ZNACZNIK, "znacznik RAW").to.equal(36);
        expect(kratkaPojazdu(scena)).to.equal(70);
        expect(trybSceny(scena)).to.equal("plansza");
        expect(dane.flags[MODULE_ID].poscig.wersja).to.equal(WERSJA_PLANSZY);
      });

      it("pionek w prawdziwej skali, przodem w prawo: GMT400 leży poziomo (0,875 × 0,375 toru)", function () {
        const dane = daneSceny({ nazwa: "T", tory: 12, srodowisko: "otwarte" });
        const scena = { grid: dane.grid, getFlag: (m, k) => dane.flags[m]?.[k] };
        const gmt = { type: "vehicle", getFlag: () => undefined,
          flags: { [MODULE_ID]: { pojazd: { podwozie: "hammer", obrys: { w: 1.5, h: 3.5 } } } } };
        expect(wymiaryPionka(gmt, scena)).to.deep.equal({ w: 0.875, h: 0.375 });
        // Pojazd spoza katalogu: prototyp w kratkach 1,5 m przeliczony na skalę planszy.
        const inny = { type: "vehicle", flags: {}, getFlag: () => undefined, prototypeToken: { width: 2, height: 1 } };
        expect(wymiaryPionka(inny, scena)).to.deep.equal({ w: 0.5, h: 0.25 });
      });

      it("rzędy jezdni (D25): następny pojazd w torze staje pod poprzednim, za pasem — od góry", function () {
        const h = 105;
        const pierwszy = yWTorze(3, h);
        const drugi = yWTorze(3, h, [{ tor: 3, y: pierwszy, h }]);
        expect(drugi).to.be.above(pierwszy + h);
        expect(yWTorze(4, h, [{ tor: 3, y: pierwszy, h }]), "inny tor nie przeszkadza").to.equal(pierwszy);
        const pelny = [{ tor: 3, y: PAS_GORA, h: FREEFORM_Y - PAS_GORA - 10 }];
        expect(yWTorze(3, h, pelny), "pas pełny").to.equal(pierwszy);
      });

      it("wymiary i ST wynikają z parametrów", function () {
        const dane = daneSceny({ nazwa: "T", tory: 9, srodowisko: "ciasno" });
        expect(dane.width).to.equal(wymiary(9).width);
        expect(dane.height).to.equal(wymiary(9).height);
        const flaga = dane.flags[MODULE_ID].poscig;
        expect(flaga.tory).to.equal(9);
        expect(flaga.st).to.equal(SRODOWISKA.ciasno.st);
        expect(flaga.offset).to.equal(0);
      });

      it("poziom ma id, którego domyślnie szukają tokeny", function () {
        const dane = daneSceny({ nazwa: "T", tory: 12, srodowisko: "otwarte" });
        expect(dane.levels[0]._id).to.equal(foundry.documents.BaseScene.metadata.defaultLevelId);
      });
    });

    /* -------------------------------------------- */

    describe("Metryka drogi (D24, D27, PLAN_m4_pojazdy §6.2.2)", function () {
      const k = 70 / 1.5;                         // px na metr rysunku
      const busW = 8 * 70, busH = 2 * 70;         // autobus przodem w prawo: 12 m × 3 m
      const wyspa = (id, tor, y) => ({ id, x: torX(tor) - busW / 2, y, w: busW, h: busH });
      const A = wyspa("A", 1, 500), B = wyspa("B", 2, 500 + 4.5 * k);

      it("tor ciągły: środek toru n = n, krawędź = n ± 0,5", function () {
        expect(torCiagly(torX(4))).to.equal(4);
        expect(torCiagly(torX(4) + LANE_W / 2)).to.equal(4.5);
      });

      it("przykład MG: przód autobusu A strzela w tył autobusu B o znacznik dalej — ok. 27,4 m do przodu", function () {
        // Strzelec 4,5 m przed środkiem A, cel 4,5 m za środkiem B; rzędy 4,5 m od siebie. Na obrazie cel jest
        // ZA strzelcem (smuga do tyłu, D31) — w pomiarze 36 − 9 = 27 m wzdłuż i 4,5 m w poprzek.
        const strzelec = { x: torX(1) + 4.5 * k, y: A.y + busH / 2 };
        const cel = { x: torX(2) - 4.5 * k, y: B.y + busH / 2 };
        expect(cel.x, "na obrazie cel za strzelcem").to.be.below(strzelec.x);
        const S = p => naDrodzeCzyste(p, wyspaPunktuCzysta(p, [A, B]), k);
        const d = odlegloscWspolrzednych(S(strzelec), S(cel));
        expect(Math.abs(d - Math.hypot(27, 4.5))).to.be.below(1e-6);
        expect(S(cel).s - S(strzelec).s, "cel z przodu").to.be.above(0);
      });

      it("w jednym pojeździe — prawdziwe metry: przód i tył autobusu są 9 m od siebie", function () {
        const przod = { x: torX(1) + 4.5 * k, y: A.y + busH / 2 }, tyl = { x: torX(1) - 4.5 * k, y: A.y + busH / 2 };
        const S = p => naDrodzeCzyste(p, wyspaPunktuCzysta(p, [A, B]), k);
        expect(Math.abs(odlegloscWspolrzednych(S(przod), S(tyl)) - 9)).to.be.below(1e-6);
      });

      it("goła droga: tor = 36 m wzdłuż, w poprzek prawdziwe metry", function () {
        const a = naDrodzeCzyste({ x: torX(3), y: 600 }, null, k), b = naDrodzeCzyste({ x: torX(5), y: 600 + 3 * k }, null, k);
        expect(Math.abs(odlegloscWspolrzednych(a, b) - Math.hypot(72, 3))).to.be.below(1e-6);
      });

      it("jadący należy do swojego pojazdu, nawet gdy obrysy na obrazie się nakładają", function () {
        const nakladka = { id: "C", x: A.x + 100, y: A.y, w: busW, h: busH };
        const p = { x: A.x + 360, y: A.y + 20 };     // 80 px od środka A, 20 px od środka C
        expect(wyspaPunktuCzysta(p, [A, nakladka], [{ x: p.x, y: p.y, pojazd: "A" }]).id).to.equal("A");
        expect(wyspaPunktuCzysta(p, [A, nakladka]).id, "bez jadącego — najbliższy środkiem").to.equal("C");
      });

      it("siatka planszy: linijka i zasięgi po drodze, ruch żetonu gołą drogą (36 m na tor)", function () {
        const grid = new foundry.grid.SquareGrid({ size: LANE_W, distance: METRY_TORU_NA_OBRAZIE, units: "m" });
        const zeton = (id, w) => ({ id, flags: {}, actor: null, _source: { x: w.x, y: w.y, width: w.w / LANE_W, height: w.h / LANE_W },
          getFlag: (m, kl) => (kl === "poscigRola" ? "scigany" : undefined), getCenterPoint: s => ({ x: s.x + w.w / 2, y: s.y + w.h / 2 }) });
        const scena = { grid, tokens: [zeton("A", A), zeton("B", B)],
          getFlag: (m, kl) => (m === MODULE_ID && kl === "poscig" ? { wersja: WERSJA_PLANSZY, tory: 12 } : undefined) };
        podepnijSiatke(scena);
        const strzelec = { x: torX(1) + 4.5 * k, y: A.y + busH / 2 }, cel = { x: torX(2) - 4.5 * k, y: B.y + busH / 2 };
        expect(Math.abs(grid.measurePath([strzelec, cel]).distance - Math.hypot(27, 4.5))).to.be.below(1e-3);
        const ruch = grid.measurePath([{ x: torX(1), y: 400 }, { x: torX(3), y: 400 }], { cost: () => 1 });
        expect(Math.abs(ruch.distance - 72)).to.be.below(1e-3);
      });
    });

    describe("Przyciąganie do torów", function () {

      it("stawia token środkiem na środku toru, niezależnie od jego szerokości", function () {
        for (const szer of [LANE_W, LANE_W * 2, LANE_W / 2]) {
          const { x, tor } = snapDoToru(torX(5) - (szer / 2) + 13, szer);
          expect(tor, `szerokość ${szer}`).to.equal(5);
          expect(x + (szer / 2), `środek przy szerokości ${szer}`).to.equal(torX(5));
        }
      });

      it("jest idempotentne — token już przyciągnięty nie drgnie", function () {
        const szer = LANE_W;
        const raz = snapDoToru(torX(7) - (szer / 2), szer);
        const dwa = snapDoToru(raz.x, szer);
        expect(dwa).to.deep.equal(raz);
      });

      it("wybiera tor, w którym leży środek tokenu, a nie jego lewa krawędź", function () {
        // Token szeroki na dwa tory, lewą krawędzią w torze 3 — środek jest w torze 4.
        const szer = LANE_W * 2;
        const lewa = MARGIN_X + (2 * LANE_W);
        expect(snapDoToru(lewa, szer).tor).to.equal(4);
      });

      it("pojazd o nieparzystej szerokości dostaje całe piksele (GMT400: 245 px)", function () {
        const { x } = snapDoToru(torX(5) - 100, 245);
        expect(Number.isInteger(x)).to.be.true;
        expect(Math.abs(x + 122.5 - torX(5))).to.be.at.most(0.5);
      });

      it("przyciąga też poza planszę — to sygnał do recentrowania, nie błąd", function () {
        const szer = LANE_W;
        expect(snapDoToru(torX(1) - (szer / 2) - (3 * LANE_W), szer).tor).to.equal(-2);
      });
    });

    /* -------------------------------------------- */

    describe("Recentrowanie pola", function () {

      it("nie rusza pola, które mieści się na planszy", function () {
        expect(deltaRecentrowania(12, [1, 4])).to.equal(0);
        expect(deltaRecentrowania(12, [1, 12])).to.equal(0);
      });

      it("nie rusza pustej planszy", function () {
        expect(deltaRecentrowania(12, [])).to.equal(0);
      });

      it("cofa pole, gdy lider wyjechał za ostatni tor", function () {
        expect(deltaRecentrowania(12, [10, 13])).to.equal(-1);
        expect(deltaRecentrowania(12, [8, 17])).to.equal(-5);
      });

      it("przesuwa pole w prawo, gdy ktoś spadł przed pierwszy tor", function () {
        expect(deltaRecentrowania(12, [0, 5])).to.equal(1);
        expect(deltaRecentrowania(12, [-3, 2])).to.equal(4);
      });

      it("po przesunięciu skrajny pionek ląduje dokładnie na krawędzi planszy", function () {
        const tory = 12;
        for (const zajete of [[10, 13], [8, 17], [0, 5], [-3, 2]]) {
          const d = deltaRecentrowania(tory, zajete);
          const po = zajete.map(t => t + d);
          expect(Math.max(...po) <= tory && Math.min(...po) >= 1
            || po.includes(tory) || po.includes(1), `zajete ${zajete}`).to.be.true;
        }
      });

      it("odmawia, gdy rozstaw jest szerszy niż plansza", function () {
        // Złapane na żywo, zanim ruszyło: „dosuń lidera do krawędzi" wypycha wtedy ogon za
        // przeciwną krawędź, następne wywołanie przesuwa pole z powrotem — i pionki dygoczą
        // w nieskończoność, bo każde przesunięcie odpala hook `updateToken`.
        expect(rozstawMiesciSie(12, [1, 16])).to.be.false;
        expect(deltaRecentrowania(12, [1, 16])).to.equal(0);
        expect(deltaRecentrowania(12, [1, 13])).to.equal(0);
      });

      it("jest jednokrokowe dla KAŻDEGO rozstawu — inaczej plansza chodzi w kółko", function () {
        // Własność, nie przykład: to ona pilnuje, żeby hook `updateToken` nie zapętlił stołu.
        const tory = 12;
        for (let min = -6; min <= 18; min++) {
          for (let rozpietosc = 0; rozpietosc <= 16; rozpietosc++) {
            const zajete = [min, min + rozpietosc];
            const d = deltaRecentrowania(tory, zajete);
            const po = zajete.map(t => t + d);
            expect(deltaRecentrowania(tory, po),
              `zajete [${zajete}] → delta ${d} → [${po}]`).to.equal(0);
          }
        }
      });

      it("po przesunięciu wszystko mieści się na planszy, o ile w ogóle mogło", function () {
        const tory = 12;
        for (let min = -6; min <= 18; min++) {
          for (let rozpietosc = 0; rozpietosc < tory; rozpietosc++) {
            const zajete = [min, min + rozpietosc];
            const po = zajete.map(t => t + deltaRecentrowania(tory, zajete));
            expect(Math.min(...po), `zajete [${zajete}]`).to.be.at.least(1);
            expect(Math.max(...po), `zajete [${zajete}]`).to.be.at.most(tory);
          }
        }
      });
    });
  }, { displayName: "Neuroshima: Pościgi i pojazdy" });
}
