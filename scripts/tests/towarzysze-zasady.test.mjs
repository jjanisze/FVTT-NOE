/**
 * Neuroshima 5e — towarzysze i drony: czyste zasady (PLAN_m3_towarzysze.md E0).
 *
 * Warstwa 1 (tabele): rodzaje i zdolności źródłowe domknięte, klasy istnieją, każdy wzór przechodzi
 * ścisłą gramatykę; tabela awarii kompletna.
 * Warstwa 4 (predykaty): statblocki §3.2 przy PB 2/3/4 i MDR +1…+4, wzory dronów przy INT +2…+5,
 * „½ poziomu” w dół z min. 1, kupowanie 24 pkt (Evie), kolejność z remisami trzech stron, decyzja tury
 * (U8), zakres aktywacji drona (D36), s. 205 i 214, Tabela awarii z pomijaniem, naprawy WKK (tabela §7.11
 * co do sztuki), krzywa sygnału, RSSI, upadek drona (D29), zasilanie, TT celu EMP (D27), kierunek kroku tury
 * dla tików (F17).
 *
 * Bez dokumentów — paczka nie dotyka świata.
 */

import {
  ocenWzor, sciezkiWzoru, rozpiszWzor, etykietaOdwolania, migawka, iloscKW, wartosciPochodne, ZESTAW_CECH, jestZestawemCech, kupowanieCech,
  porownajUczestnikow, decyzjaTury, zakresAktywacji, AKCJE_DRONA, stopnieZranienia, AWARIE, awaria,
  naprawaPW, naprawaAwarii, sygnal, rssiOsd, upadekDrona, zuzycieZasilania, ttCeluEmp, KONTEKSTY_WZOROW
} from "../config/towarzysze-rules.mjs";
import { RODZAJE, ZRODLA, KONTROLERY, TURY } from "../config/towarzysze-data.mjs";
import { CLASSES } from "../config/classes-data.mjs";
import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { MACHINE_FAILURES } from "../combat/bestiary-thresholds.mjs";
import { krokNaprzod, kluczTiku } from "../combat/tiki.mjs";
import { MODULE_ID } from "./helpers.mjs";

const PRZEPIS_KROCZACY = "15 CE, 1 CH, 10 CZ, 9 MK";
const PRZEPIS_LATAJACY = "10 CE, 1 CH, 29 CZ, 5 MK";

/** Tabela §7.11 planu — oczekiwane części WKK (kroczący, latający); `null` — pozycja pominięta. */
const TABELA_NAPRAW = {
  1: [{ MK: 2, CZ: 2 }, { MK: 1, CZ: 6 }],
  2: [{ CZ: 8, MK: 7, CH: 4 }, { CZ: 22, MK: 4, CH: 4 }],
  3: [{ CE: 8, CZ: 5 }, { CE: 5, CZ: 15 }],
  4: [{ CE: 12 }, { CE: 8 }],
  6: [{ MK: 5, CZ: 5 }, { MK: 3, CZ: 15 }],
  7: [{ CZ: 5, MK: 5 }, { CZ: 15, MK: 3 }],
  8: [{ CE: 8, CZ: 5 }, { CE: 5, CZ: 15 }],
  9: [{ CH: 2 }, { CH: 2 }],
  11: [{ CE: 3, CH: 2 }, { CE: 2, CH: 2 }],
  13: [{ MK: 5, CZ: 5 }, { MK: 3, CZ: 15 }],
  14: [{ CE: 12, CZ: 8 }, { CE: 8, CZ: 22 }],
  15: [{ CZ: 5, CH: 3 }, null],
  16: [{ CZ: 8, MK: 7, CH: 4 }, null],
  17: [{ CE: 3 }, { CE: 2 }],
  18: [{ CE: 8 }, { CE: 5 }],
  19: [{ CE: 8, CH: 3 }, { CE: 5, CH: 3 }]
};

const wl = (prof, mody = {}, poziom = 3, klasa = "zwiadowca") =>
  migawka({ prof, mody, poziomy: { [klasa]: poziom }, klasa });

export function registerTowarzyszeZasadyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.towarzysze-zasady`, context => {
    const { describe, it, expect } = context;

    describe("Dane rodzajów (warstwa 1)", function () {
      it("każdy rodzaj ma zdolność źródłową, która go wymienia, i istniejącą klasę", function () {
        for (const [id, r] of Object.entries(RODZAJE)) {
          const z = ZRODLA[r.zrodlo];
          expect(z, `${id} → ${r.zrodlo}`).to.exist;
          expect(z.rodzaje, `${r.zrodlo} nie wymienia ${id}`).to.include(id);
          expect(CLASSES[r.klasa], `${id} → klasa ${r.klasa}`).to.exist;
          expect(z.klasa, `${id}: klasa rodzaju a zdolności`).to.equal(r.klasa);
          expect(Object.values(TURY), `${id} → tura ${r.tura}`).to.include(r.tura);
          expect(r.strona, id).to.match(/^s\. \d/);
        }
      });

      it("każda zdolność źródłowa istnieje w danych zdolności klasowych i wskazuje znane rodzaje", function () {
        for (const [id, z] of Object.entries(ZRODLA)) {
          expect(CLASS_FEATURES[id], `zdolność ${id}`).to.exist;
          for (const r of z.rodzaje) expect(RODZAJE[r], `${id} → ${r}`).to.exist;
        }
      });

      it("każdy wzór przechodzi ścisłą gramatykę i sięga tylko do znanych kontekstów", function () {
        for (const [id, r] of Object.entries(RODZAJE)) {
          for (const [pole, wzor] of Object.entries(r.wzory ?? {})) {
            const sciezki = sciezkiWzoru(wzor);
            for (const s of sciezki) expect(KONTEKSTY_WZOROW, `${id}.${pole}: ${s}`).to.include(s.split(".")[0]);
            expect(Roll.validate(wzor.replace(/@[\w.]+/g, "1")), `${id}.${pole} w Roll`).to.equal(true);
          }
        }
      });

      it("zwierzęta i ludzie mają Stopnie Zranienia, drony nie (s. 205, 214)", function () {
        for (const [id, r] of Object.entries(RODZAJE)) {
          expect(r.stopnieZranienia, id).to.equal(!r.maszyna);
        }
      });

      it("Oswajanie losuje k6: 1–2 owad, 3–4 ssak, 5–6 gad (s. 99)", function () {
        const k6 = ZRODLA["oswajanie-zwierzat"].k6;
        expect([1, 2, 3, 4, 5, 6].map(n => k6[n])).to.deep.equal([
          "zmutowany-owad", "zmutowany-owad", "zmutowany-ssak", "zmutowany-ssak", "zmutowany-gad", "zmutowany-gad"
        ]);
      });

      it("kontrolery: fabryczny 300/50 m, domowy 100/20 m (D32)", function () {
        expect(KONTROLERY.fabryczny).to.include({ zasieg: 300, zasiegPrzeszkody: 50 });
        expect(KONTROLERY.domowy).to.include({ zasieg: 100, zasiegPrzeszkody: 20 });
      });
    });

    describe("Wzory — gramatyka", function () {
      it("liczy wzór na migawce i zwraca null przy brakującym kontekście", function () {
        expect(ocenWzor("12 + @wlasciciel.prof", { wlasciciel: { prof: 3 } })).to.equal(15);
        expect(ocenWzor("12 + @wlasciciel.prof", { wlasciciel: null })).to.equal(null);
        expect(ocenWzor("max(1, 5 * @tworca.abilities.int.mod)", { tworca: { abilities: { int: { mod: -1 } } } })).to.equal(1);
      });

      it("rozkład do dymka: etykiety po polsku, wartości, „×” zamiast „*”", function () {
        const dane = { wlasciciel: migawka({ prof: 2, mody: { wis: 3 }, poziomy: { zwiadowca: 3 }, klasa: "zwiadowca" }) };
        expect(rozpiszWzor("12 + @wlasciciel.prof", dane)).to.equal("12 + PB właściciela 2");
        expect(rozpiszWzor("10 + 10 * @wlasciciel.abilities.wis.mod", dane)).to.equal("10 + 10 × mod. MDR właściciela 3");
        expect(rozpiszWzor("5 * @wlasciciel.poziomKlasy", dane)).to.equal("5 × poziom klasy właściciela 3");
        expect(rozpiszWzor("2 + @tworca.prof + @operator.abilities.dex.mod", {}), "bez kontekstu — same etykiety")
          .to.equal("2 + PB twórcy + mod. ZRC operatora");
        expect(etykietaOdwolania("tworca.abilities.int.mod")).to.equal("mod. INT twórcy");
        expect(() => rozpiszWzor("2 + @wrog.prof", dane)).to.throw(/kontekst/);
      });

      it("nieznana fraza to błąd, nie zero", function () {
        expect(() => ocenWzor("2 + @wrog.prof", {})).to.throw(/kontekst/);
        expect(() => ocenWzor("sqrt(4)", {})).to.throw(/funkcja/);
        expect(() => ocenWzor("2 +", {})).to.throw();
        expect(() => ocenWzor("2 3", {})).to.throw(/nadmiarowe/);
        expect(() => ocenWzor("2 # 3", {})).to.throw(/znak/);
      });
    });

    describe("Statblocki zwierząt (§3.2, D4)", function () {
      const TABELA = {
        "zmutowany-owad": { tt: 14, pw: 3, atak: 4, kosc: 6, polowa: true },
        "zmutowany-ssak": { tt: 11, pw: 9, atak: 4, kosc: 10, polowa: true },
        "zmutowany-gad": { tt: 12, pw: 6, atak: 2, kosc: 8, polowa: true },
        "psi-partner": { tt: 12, pw: 10, atak: 2, kosc: 6, polowa: false }
      };

      it("TT i atak rosną z PB właściciela (2/3/4); PW z MDR (+1…+4)", function () {
        for (const [id, s] of Object.entries(TABELA)) {
          for (const pb of [2, 3, 4]) {
            for (const mdr of [1, 2, 3, 4]) {
              const w = wartosciPochodne(id, { wlasciciel: wl(pb, { wis: mdr }) });
              expect(w.tt, `${id} TT przy PB ${pb}`).to.equal(s.tt + pb);
              expect(w.atak, `${id} atak przy PB ${pb}`).to.equal(s.atak + pb);
              expect(w.pwMaks, `${id} PW przy MDR ${mdr}`).to.equal(s.pw + 10 * mdr);
              expect(w.pb, `${id}: PB z SP, nie z właściciela`).to.equal(null);
            }
          }
        }
      });

      it("KW: „× ½ poziomu Zwiadowcy” w dół, min. 1; pies — × poziom", function () {
        for (const [id, s] of Object.entries(TABELA)) {
          for (const [poz, polowa, cala] of [[1, 1, 1], [2, 1, 2], [3, 1, 3], [4, 2, 4], [7, 3, 7], [10, 5, 10]]) {
            const w = wartosciPochodne(id, { wlasciciel: wl(2, { wis: 2 }, poz) });
            expect(w.kw, `${id} poziom ${poz}`).to.deep.equal({ kosc: s.kosc, ile: s.polowa ? polowa : cala });
          }
        }
      });

      it("poziom liczy się z klasy z flagi, nie z sumy poziomów postaci", function () {
        const m = migawka({ prof: 3, mody: { wis: 2 }, poziomy: { zwiadowca: 3, brutal: 2 }, klasa: "zwiadowca" });
        expect(m.poziomKlasy).to.equal(3);
        expect(m.poziom).to.equal(5);
        expect(wartosciPochodne("psi-partner", { wlasciciel: m }).kw.ile).to.equal(3);
      });

      it("ujemny MDR nie zabija: PW min. 1", function () {
        expect(wartosciPochodne("zmutowany-owad", { wlasciciel: wl(2, { wis: -1 }) }).pwMaks).to.equal(1);
      });

      it("bez właściciela — wartości z szablonu (null) i znacznik braku", function () {
        const w = wartosciPochodne("psi-partner", {});
        expect(w.tt).to.equal(null);
        expect(w.pwMaks).to.equal(null);
        expect(w.kw).to.equal(null);
        expect(w.brak).to.include("wlasciciel");
      });

      it("iloscKW: ½ w dół, min. 1", function () {
        expect([1, 2, 3, 4, 5, 11].map(n => iloscKW(n, 0.5))).to.deep.equal([1, 1, 1, 2, 2, 5]);
        expect(iloscKW(0, 1), "brak poziomów → 1").to.equal(1);
      });
    });

    describe("Ludzki towarzysz (s. 76, 101; U3, U5)", function () {
      it("PW 5 × poziom klasy właściciela, KW k6 × poziom, PB +2 bez względu na właściciela", function () {
        for (const rodzaj of ["ludzki-partner", "prawa-reka"]) {
          const klasa = RODZAJE[rodzaj].klasa;
          for (const [poz, prof] of [[3, 2], [5, 3], [10, 4]]) {
            const w = wartosciPochodne(rodzaj, { wlasciciel: wl(prof, { con: 3 }, poz, klasa) });
            expect(w.pwMaks, `${rodzaj} poz. ${poz}`).to.equal(5 * poz);
            expect(w.kw, `${rodzaj} poz. ${poz}`).to.deep.equal({ kosc: 6, ile: poz });
            expect(w.pb, `${rodzaj}: PB nie rośnie`).to.equal(2);
            expect(w.tt, `${rodzaj}: TT z pancerza`).to.equal(null);
          }
        }
      });

      it("Evie: 8/15/12/8/15/10 to dokładnie 24 pkt", function () {
        expect(kupowanieCech([8, 15, 12, 8, 15, 10])).to.deep.equal({ poprawny: true, wydane: 24, budzet: 24, bledy: [] });
        expect(kupowanieCech({ str: 8, dex: 15, con: 12, int: 8, wis: 15, cha: 10 }).wydane).to.equal(24);
      });

      it("zestaw 14,14,12,12,10,8 kosztuje 24 pkt i jest rozpoznawany w dowolnej kolejności", function () {
        expect(kupowanieCech(ZESTAW_CECH).wydane).to.equal(24);
        expect(jestZestawemCech([8, 12, 14, 10, 14, 12])).to.equal(true);
        expect(jestZestawemCech([8, 15, 12, 8, 15, 10])).to.equal(false);
      });

      it("ponad budżet, poza tabelą albo nie sześć wartości — niepoprawne", function () {
        expect(kupowanieCech([15, 15, 15, 8, 8, 8]).poprawny, "27 pkt > 24").to.equal(false);
        expect(kupowanieCech([15, 15, 15, 8, 8, 8], 27).poprawny, "27 pkt przy budżecie BG").to.equal(true);
        expect(kupowanieCech([16, 8, 8, 8, 8, 8]).poprawny, "16 poza tabelą").to.equal(false);
        expect(kupowanieCech([10, 10, 10]).poprawny).to.equal(false);
      });
    });

    describe("Drony (s. 83–84, U13, D23)", function () {
      it("TT, PW, atak, obrażenia i ST obszarowe przy INT twórcy +2…+5", function () {
        for (const int of [2, 3, 4, 5]) {
          for (const pb of [2, 3]) {
            for (const zrcOp of [0, 2]) {
              const tworca = migawka({ prof: pb, mody: { int } });
              const operator = migawka({ prof: 2, mody: { dex: zrcOp } });
              const k = wartosciPochodne("dron-kroczacy", { tworca, operator });
              const l = wartosciPochodne("dron-latajacy", { tworca, operator });
              expect(k.tt, `TT INT ${int} PB ${pb}`).to.equal(10 + int + pb);
              expect(l.tt).to.equal(10 + int + pb);
              expect(k.pwMaks, `kroczący PW INT ${int}`).to.equal(10 * int);
              expect(l.pwMaks, `latający PW INT ${int}`).to.equal(5 * int);
              expect(k.atak).to.equal(2 + pb + zrcOp);
              expect(l.atak).to.equal(3 + pb + zrcOp);
              expect(k.obrazeniaPremia).to.equal(int);
              expect(k.stObszarowe).to.equal(8 + pb + zrcOp);
              expect(k.kw, "maszyna bez KW").to.equal(null);
            }
          }
        }
      });

      it("INT twórcy 0 albo ujemny — PW 1, nie śmierć z maks. PW 0", function () {
        expect(wartosciPochodne("dron-latajacy", { tworca: migawka({ mody: { int: 0 } }) }).pwMaks).to.equal(1);
        expect(wartosciPochodne("dron-kroczacy", { tworca: migawka({ mody: { int: -1 } }) }).pwMaks).to.equal(1);
      });

      it("bez operatora atak i ST obszarowe nieznane, stempel twórcy dalej liczy TT i PW", function () {
        const w = wartosciPochodne("dron-kroczacy", { tworca: migawka({ prof: 2, mody: { int: 3 } }) });
        expect(w.tt).to.equal(15);
        expect(w.pwMaks).to.equal(30);
        expect(w.atak).to.equal(null);
        expect(w.brak).to.deep.equal(["operator"]);
      });
    });

    describe("Kolejność w walce (U7)", function () {
      // Remis trzech stron przy tej samej inicjatywie: dnd5e sortuje alfabetycznie po aktorze
      // bazowym, więc „Evie” wyprzedzała „Victora” (F9).
      const u = (id, nazwa, inicjatywa, wlascicielId = null) => ({ id, nazwa, inicjatywa, wlascicielId });
      const sortuj = (lista) => {
        const po = new Map(lista.map(c => [c.id, c]));
        const kotwica = c => (c.wlascicielId ? po.get(c.wlascicielId) ?? null : null);
        return [...lista].sort((a, b) => porownajUczestnikow(a, b, kotwica)).map(c => c.nazwa);
      };

      it("towarzysz idzie tuż po właścicielu mimo nazwy wcześniej w alfabecie", function () {
        expect(sortuj([u("v", "Victor", 15), u("e", "Evie", 15, "v"), u("a", "Abel", 15)]))
          .to.deep.equal(["Abel", "Victor", "Evie"]);
      });

      it("dwóch właścicieli z towarzyszami przy remisie — pary nie mieszają się", function () {
        expect(sortuj([u("z", "Zenon", 12), u("b", "Burek", 12, "z"), u("v", "Victor", 12), u("e", "Evie", 12, "v")]))
          .to.deep.equal(["Victor", "Evie", "Zenon", "Burek"]);
      });

      it("towarzysz z własną, wyższą inicjatywą i tak idzie po właścicielu (RAW: „zawsze po twojej turze”)", function () {
        expect(sortuj([u("v", "Victor", 5), u("e", "Evie", 20, "v"), u("g", "Gangus", 10)]))
          .to.deep.equal(["Gangus", "Victor", "Evie"]);
      });

      it("dwóch towarzyszy jednego właściciela — po nazwie; właściciel spoza walki — towarzysz sam sobie kotwicą", function () {
        expect(sortuj([u("e", "Evie", 9, "v"), u("b", "Burek", 9, "v"), u("v", "Victor", 9)]))
          .to.deep.equal(["Victor", "Burek", "Evie"]);
        expect(sortuj([u("e", "Evie", 9, "nieobecny"), u("g", "Gangus", 12)])).to.deep.equal(["Gangus", "Evie"]);
      });
    });

    describe("Tura towarzysza (§3.3, D2, U8, D35)", function () {
      const tu = { combatId: "c1", runda: 3 };

      it("Partner i zwierzę: zatrzask z tej rundy — tura; bez niego albo z innej rundy — Unikanie", function () {
        for (const r of ["psi-partner", "ludzki-partner", "zmutowany-ssak"]) {
          expect(decyzjaTury(r, { ...tu, zatrzask: { combatId: "c1", runda: 3 } }), r).to.equal("tura");
          expect(decyzjaTury(r, { ...tu, zatrzask: null }), r).to.equal("unikanie");
          expect(decyzjaTury(r, { ...tu, zatrzask: { combatId: "c1", runda: 2 } }), `${r}: stara runda`).to.equal("unikanie");
          expect(decyzjaTury(r, { ...tu, zatrzask: { combatId: "c0", runda: 3 } }), `${r}: inna walka`).to.equal("unikanie");
        }
      });

      it("Prawa ręka — zawsze tura (pełna kontrola, bez AB); dron — bez własnej tury", function () {
        expect(decyzjaTury("prawa-reka", tu)).to.equal("tura");
        expect(decyzjaTury("dron-kroczacy", { ...tu, zatrzask: { combatId: "c1", runda: 3 } })).to.equal(null);
        expect(decyzjaTury("nieznany", tu)).to.equal(null);
      });
    });

    describe("Aktywacja drona (D36)", function () {
      const ids = (tryb, dron) => zakresAktywacji(tryb, dron).map(a => a.id);

      it("[B] latający bez manipulatora: ruch, unik, odwrót, przyspieszenie, zostań — bez Biegania i przedmiotów", function () {
        expect(ids("B", { lata: true })).to.deep.equal(["ruch", "unikanie", "odstapienie", "przyspieszenie", "zostan"]);
      });

      it("[B] kroczący z manipulatorem: dochodzi Bieganie i Interakcja z przedmiotem", function () {
        expect(ids("B", { lata: false, manipulator: true })).to.include.members(["bieganie", "podnies", "upusc"]);
      });

      it("[B] nigdy nie ma ataku ani akcji wymierzonej w kogoś", function () {
        const b = ids("B", { lata: false, manipulator: true, bron: true, wrecz: true, urzadzenia: true });
        for (const a of ["atak", "pochwycenie", "odepchniecie", "wytracenie", "pomaganie", "szukanie", "ukrywanie", "wyczekanie"]) {
          expect(b, a).to.not.include(a);
        }
      });

      it("[A] ⊇ [B] dla każdego drona; atak tylko z bronią, Używanie tylko z urządzeniami", function () {
        for (const dron of [{ lata: true }, { lata: false, manipulator: true, bron: true }, { lata: true, bron: true, urzadzenia: true }]) {
          const a = ids("A", dron);
          for (const x of ids("B", dron)) expect(a, `${JSON.stringify(dron)}: ${x}`).to.include(x);
          expect(a.includes("atak"), JSON.stringify(dron)).to.equal(!!dron.bron);
          expect(a.includes("uzywanie"), JSON.stringify(dron)).to.equal(!!dron.urzadzenia);
        }
      });

      it("[R]: atak okazyjny tylko z bronią do walki wręcz; wyczekana akcja zawsze", function () {
        expect(ids("R", { bron: true, wrecz: false })).to.deep.equal(["wyczekana"]);
        expect(ids("R", { bron: true, wrecz: true })).to.deep.equal(["okazyjny", "wyczekana"]);
      });

      it("etykiety OSD bez polskich liter (D38)", function () {
        for (const a of AKCJE_DRONA) expect(a.osd, a.id).to.match(/^[A-Z ]+$/);
      });
    });

    describe("Stopnie Zranienia (s. 205, 214; U10)", function () {
      it("BG, towarzysz-istota, Bestiariusz ze Stopniem i BN z karty „BN pada” — tak", function () {
        expect(stopnieZranienia({ typ: "character" })).to.equal(true);
        expect(stopnieZranienia({ typ: "character", towarzysz: "ludzki-partner" })).to.equal(true);
        expect(stopnieZranienia({ typ: "npc", towarzysz: "psi-partner" })).to.equal(true);
        expect(stopnieZranienia({ typ: "npc", usesZranienie: true }), "s. 205").to.equal(true);
        expect(stopnieZranienia({ typ: "npc", bn: true }), "D2 M1").to.equal(true);
      });

      it("zwykły BN, pojazd, maszyna i dron — nie; maszyna przegrywa ze wszystkim", function () {
        expect(stopnieZranienia({ typ: "npc" })).to.equal(false);
        expect(stopnieZranienia({ typ: "vehicle" })).to.equal(false);
        expect(stopnieZranienia({ typ: "npc", towarzysz: "dron-kroczacy" })).to.equal(false);
        expect(stopnieZranienia({ typ: "npc", maszyna: true, usesZranienie: true, bn: true }), "s. 214").to.equal(false);
      });
    });

    describe("Tabela awarii maszyn (s. 214, D10)", function () {
      it("dwadzieścia pozycji, każda z tekstem RAW i skrótem OSD", function () {
        for (let n = 1; n <= 20; n++) {
          expect(AWARIE[n], `pozycja ${n}`).to.exist;
          expect(MACHINE_FAILURES[n], `tekst ${n}`).to.be.a("string");
          expect(AWARIE[n].osd, `${n}`).to.match(/^[A-Z0-9 -]+$/);
        }
      });

      it("pozycja, która nie dotyczy maszyny, przechodzi na kolejną", function () {
        const bezBroni = {};
        expect(awaria(1, bezBroni)).to.include({ pozycja: 2 });
        expect(awaria(6, bezBroni).pozycja, "6 i 7 bez ataków").to.equal(8);
        expect(awaria(6, bezBroni).pominiete).to.deep.equal([6, 7]);
        expect(awaria(18, bezBroni).pozycja).to.equal(19);
        const latajacyZPalna = { bron: true, amunicja: true, ataki: true, wrecz: false };
        expect(awaria(15, latajacyZPalna).pozycja, "bez ataków wręcz: 15, 16 dalej").to.equal(17);
        expect(awaria(6, latajacyZPalna).pozycja).to.equal(6);
      });

      it("autodestrukcja dotyczy każdej maszyny; przemijające: 5, 10, 12", function () {
        expect(awaria(20, {}).pozycja).to.equal(20);
        expect(awaria(20, {}).skutek.zniszczony).to.equal(true);
        const przemijajace = Object.entries(AWARIE).filter(([, a]) => !a.trwala).map(([n]) => Number(n));
        expect(przemijajace).to.deep.equal([5, 10, 12]);
      });
    });

    describe("Naprawa (s. 83, D9, §7.11)", function () {
      it("PW: 2k6 + mod. INT naprawiającego, nigdy ujemne", function () {
        expect(naprawaPW(7, 3)).to.equal(10);
        expect(naprawaPW(2, -3)).to.equal(0);
      });

      it("NOE: naprawę awarii rozstrzyga MG", function () {
        expect(naprawaAwarii(3, { surowce: PRZEPIS_KROCZACY })).to.deep.equal({ warstwa: "noe", decyduje: "mg" });
      });

      it("WKK: części co do sztuki z tabeli §7.11 dla obu dronów", function () {
        for (const [n, [k, l]] of Object.entries(TABELA_NAPRAW)) {
          expect(naprawaAwarii(Number(n), { surowce: PRZEPIS_KROCZACY, kobalt: true }).surowce, `kroczący ${n}`).to.deep.equal(k);
          if (l) expect(naprawaAwarii(Number(n), { surowce: PRZEPIS_LATAJACY, kobalt: true }).surowce, `latający ${n}`).to.deep.equal(l);
        }
      });

      it("WKK: PW ≤ ½ maks. podnosi stopień; harówa podniesiona zostaje harówą z pełnymi ilościami", function () {
        const d = naprawaAwarii(9, { surowce: PRZEPIS_KROCZACY, kobalt: true, polowaPW: true });
        expect(d.stopien).to.equal("troche");
        expect(d.surowce).to.deep.equal({ CH: 3 });
        const h = naprawaAwarii(14, { surowce: PRZEPIS_KROCZACY, kobalt: true, polowaPW: true });
        expect(h).to.include({ stopien: "harowa", ilosci: "pelna", st: 20 });
        expect(h.surowce).to.deep.equal({ CE: 15, CZ: 10 });
      });

      it("WKK: przemijające bez naprawy, wymiana oznaczona, autodestrukcja — wrak", function () {
        for (const n of [5, 10, 12]) expect(naprawaAwarii(n, { kobalt: true }).przemijajaca, `${n}`).to.equal(true);
        expect(naprawaAwarii(1, { surowce: PRZEPIS_KROCZACY, kobalt: true }).wymiana).to.equal(true);
        expect(naprawaAwarii(16, { surowce: PRZEPIS_KROCZACY, kobalt: true }).wymiana).to.equal(true);
        expect(naprawaAwarii(20, { kobalt: true }).wrak).to.equal(true);
      });
    });

    describe("Sygnał i RSSI (D32, D34, U17)", function () {
      it("fabryczny na otwartej przestrzeni: czysto do ¼ zasięgu, ½ w połowie, utrata za 300 m", function () {
        expect(sygnal({ odleglosc: 75, kontroler: "fabryczny" }).jakosc).to.equal(1);
        expect(sygnal({ odleglosc: 150, kontroler: "fabryczny" }).jakosc).to.be.closeTo(0.5, 0.01);
        expect(sygnal({ odleglosc: 300, kontroler: "fabryczny" })).to.include({ jakosc: 0, utracony: false });
        expect(sygnal({ odleglosc: 301, kontroler: "fabryczny" }).utracony).to.equal(true);
      });

      it("ściana albo „pod ziemią” — zasięg przez przeszkody: 50 m / 20 m", function () {
        expect(sygnal({ odleglosc: 60, sciana: true, kontroler: "fabryczny" }).utracony).to.equal(true);
        expect(sygnal({ odleglosc: 45, podZiemia: true, kontroler: "fabryczny" }).utracony).to.equal(false);
        expect(sygnal({ odleglosc: 25, sciana: true, kontroler: "domowy" }).utracony).to.equal(true);
        expect(sygnal({ odleglosc: 15, podZiemia: true, kontroler: "domowy" }).zasieg).to.equal(20);
      });

      it("jakość nie rośnie z odległością; brak kontrolera — utrata", function () {
        let poprzednia = 1;
        for (let d = 0; d <= 100; d += 5) {
          const q = sygnal({ odleglosc: d, kontroler: "domowy" }).jakosc;
          expect(q, `${d} m`).to.be.at.most(poprzednia + 1e-12);
          poprzednia = q;
        }
        expect(sygnal({ odleglosc: 1, kontroler: null }).utracony).to.equal(true);
      });

      it("RSSI: deterministyczne, w marginesie ±5 przy pełnym sygnale i ±15 na krawędzi, 0–99, kreski 0–4", function () {
        expect(rssiOsd(0.6, { t: 3.3, ziarno: 9 })).to.deep.equal(rssiOsd(0.6, { t: 3.3, ziarno: 9 }));
        for (const q of [1, 0.5, 0]) {
          const amp = 5 + 10 * (1 - q);
          for (let t = 0; t < 40; t += 0.37) {
            const r = rssiOsd(q, { t, ziarno: 4 });
            expect(r.wartosc, `q ${q} t ${t}`).to.be.within(0, 99);
            expect(Math.abs(r.wartosc - 99 * q), `q ${q} t ${t}`).to.be.at.most(amp + 0.5);
            expect(r.kreski).to.be.within(0, 4);
          }
        }
      });
    });

    describe("Upadek drona latającego (s. 253, D29)", function () {
      it("Wyłączony, Sparaliżowanie, brak zasilania w powietrzu — spada z obrażeniami", function () {
        for (const s of ["wylaczony", "paralyzed", "brak-zasilania", "unconscious", "szybkosc-0"]) {
          expect(upadekDrona({ stany: [s], wysokosc: 6 }), s).to.deep.equal({ spada: true, obrazenia: true });
        }
      });

      it("Powalenie (awaria 12) — opada bez obrażeń; razem z ciężkim stanem — z obrażeniami", function () {
        expect(upadekDrona({ stany: ["prone"], wysokosc: 6 })).to.deep.equal({ spada: true, obrazenia: false });
        expect(upadekDrona({ stany: ["prone", "paralyzed"], wysokosc: 6 }).obrazenia).to.equal(true);
      });

      it("na ziemi albo kroczący — nie spada", function () {
        expect(upadekDrona({ stany: ["wylaczony"], wysokosc: 0 }).spada).to.equal(false);
        expect(upadekDrona({ stany: ["wylaczony"], wysokosc: 6, lata: false }).spada).to.equal(false);
      });
    });

    describe("Zasilanie (s. 83, U15)", function () {
      it("akumulator: 1 h średniego, 4 h małego", function () {
        expect(zuzycieZasilania({ rozmiar: "med", minuty: 60 }).procentAkumulatora).to.equal(100);
        expect(zuzycieZasilania({ rozmiar: "sm", minuty: 60 }).procentAkumulatora).to.equal(25);
      });

      it("agregat z paliwem zasila pierwszy, 0,5 l/h; resztę bierze akumulator", function () {
        expect(zuzycieZasilania({ rozmiar: "sm", minuty: 90, agregat: true, paliwoL: 0.25 }))
          .to.deep.equal({ paliwoL: 0.25, minutyAkumulatora: 60, procentAkumulatora: 25 });
        expect(zuzycieZasilania({ rozmiar: "med", minuty: 60, agregat: true, paliwoL: 5 }).procentAkumulatora).to.equal(0);
        expect(zuzycieZasilania({ rozmiar: "med", minuty: 60, agregat: false, paliwoL: 5 }).paliwoL, "bez agregatu paliwo nie schodzi").to.equal(0);
      });
    });

    describe("Tiki tury — tylko naprzód, raz na turę (F17)", function () {
      it("krok naprzód: dalsza tura albo dalsza runda; wstecz i w miejscu — nie", function () {
        expect(krokNaprzod({ round: 2, turn: 1 }, { round: 2, turn: 2 })).to.equal(true);
        expect(krokNaprzod({ round: 2, turn: 4 }, { round: 3, turn: 0 }), "nowa runda").to.equal(true);
        expect(krokNaprzod({ round: 0, turn: null }, { round: 1, turn: 0 }), "start walki").to.equal(true);
        expect(krokNaprzod({ round: 3, turn: 0 }, { round: 2, turn: 4 }), "cofnięcie przez rundę").to.equal(false);
        expect(krokNaprzod({ round: 2, turn: 2 }, { round: 2, turn: 1 }), "cofnięcie tury").to.equal(false);
        expect(krokNaprzod({ round: 2, turn: 2 }, { round: 2, turn: 2 })).to.equal(false);
        expect(krokNaprzod({ round: 2, turn: 2 }, null)).to.equal(false);
      });

      it("klucz pamięci rozróżnia walkę, rundę, uczestnika i krawędź", function () {
        const k = kluczTiku("c1", 3, "u1", "start");
        for (const inny of [kluczTiku("c2", 3, "u1", "start"), kluczTiku("c1", 4, "u1", "start"),
          kluczTiku("c1", 3, "u2", "start"), kluczTiku("c1", 3, "u1", "end")]) expect(inny).to.not.equal(k);
      });
    });

    describe("Emiter EMP — TT celu (s. 101, D27)", function () {
      it("nota pancerza — 10 + mod. ZRC; bez noty — pełna TT; nigdy ponad pełną", function () {
        expect(ttCeluEmp({ tt: 22, opancerzenie: true, modZrc: 0 }), "Juggernaut").to.equal(10);
        expect(ttCeluEmp({ tt: 15, opancerzenie: true, modZrc: 3 }), "Pająk").to.equal(13);
        expect(ttCeluEmp({ tt: 18, opancerzenie: false, modZrc: 2 }), "Gladiator").to.equal(18);
        expect(ttCeluEmp({ tt: 11, opancerzenie: true, modZrc: 4 })).to.equal(11);
      });
    });
  }, { displayName: "Neuroshima: Towarzysze i drony — czyste zasady" });
}
