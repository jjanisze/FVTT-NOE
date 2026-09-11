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
  torX, xNaTor, dystansZnacznikow, wymiary,
  LANE_W, MARGIN_X, FREEFORM_Y, FREEFORM_H, PAS_GORA, TORY_DOMYSLNIE
} from "../scenes/poscig.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export function registerPoscigTests(quench) {
  quench.registerBatch(`${MODULE_ID}.poscig`, context => {
    const { describe, it, expect } = context;

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
  }, { displayName: "Neuroshima: Pościgi i pojazdy" });
}
