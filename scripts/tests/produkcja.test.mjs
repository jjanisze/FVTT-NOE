/**
 * Neuroshima 5e — produkcja (PLAN_produkcja §14).
 *
 * Warstwa 1: czyste reguły (`config/production-rules.mjs`), wyrażenia narzędzi
 * (`config/tool-expr.mjs`), dane przepisów (`config/recipes-data.mjs`) i plan zużycia surowców.
 * Przypadki z tabeli §5.1c są tu dosłownie — to one definiują cechę profesji z WKK.
 * Warstwa 2: lejek surowców na prawdziwym aktorze `[Quench]` (zużycie, reszta, zwrot).
 *
 * Tryb WKK podajemy wprost (`kobalt: true/false`), nigdy nie przełączamy ustawienia świata.
 */

import * as R from "../config/production-rules.mjs";
import {
  parseToolExpr, toolExprString, formatToolExpr, evalToolExpr, mandatoryToolKeys, TOOL_KEYS, ToolExprError
} from "../config/tool-expr.mjs";
import {
  KATALOG, KATEGORIE, PROFESJE, PRZEPISY_STANDARDOWE, PRZEPISY_PROFESJI, PRZEPISY_ELABORACJI,
  LISTA_PROFESJI, przepis, wszystkiePrzepisy, __testing as DANE
} from "../config/recipes-data.mjs";
import { SUROWCE_TYPES, getSurowiecType } from "../config/surowce-data.mjs";
import { __testing as STORE, gbOf, takeSurowce, giveSurowce, takeManySurowce, buildSurowiecItemData } from "../actors/surowce-store.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, captureWarnings } from "./helpers.mjs";
import { robotaApi as ROBOTA } from "../production/robota.mjs";
import { zrodlaDostepu } from "../production/zp.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { maSchemat, przepisySchematow, schematItemData } from "../config/schematy-data.mjs";
import { PRZEPISY_ZDOLNOSCI } from "../config/recipes-data.mjs";
import { stanNaprawy, przepisNaprawy, doNaprawy, rozpocznijNaprawe } from "../production/naprawa.mjs";
import { stanSzybkiej, dodajDoKoszyka, wyczyscKoszyk, ocenaKoszyka } from "../production/szybka.mjs";
import { przenies, audytRobot } from "../production/przenoszenie.mjs";
import { stOlejku, dodajOlejek } from "../production/olejek.mjs";
import { restActivitiesApi } from "../actors/rest-activities.mjs";
import { przygotujIkony, ikonaPrzepisu } from "../production/zakladka.mjs";
import { addLekToActor } from "../actors/leki-inventory.mjs";

export function registerProdukcjaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.produkcja`, context => {
    const { describe, it, after, expect } = context;

    after(async function () {
      await scratchCleanup();
    });

    /* ------------------------------------------------------------ */
    describe("Wzór RAW: surowce, czas, ST (s. 144–146)", function () {
      it("surowce to ⌊cena / 2⌋", function () {
        expect(R.budzetSurowcow(10)).to.equal(5);
        expect(R.budzetSurowcow(15)).to.equal(7);
        expect(R.budzetSurowcow(1)).to.equal(0);
        expect(R.budzetSurowcow(140)).to.equal(70);
      });

      it("partia minimalna: przedmiot za 1 gb robi się po 2 sztuki, nie z niczego (D37)", function () {
        expect(R.partiaMinimalna(1)).to.equal(2);
        expect(R.partiaMinimalna(0.5)).to.equal(4);
        expect(R.partiaMinimalna(2)).to.equal(1);
        expect(R.partiaMinimalna(0), "bez ceny — bez partii").to.equal(1);
        const p = przepis("std/chemia:papieros");
        expect(p.wynik.ilosc).to.equal(2);
        expect(R.sumaGb(p.surowce)).to.equal(1);
        expect(p.minuty).to.equal(60);
        expect(p.st).to.equal(5);
      });

      it("czas: wielorazowe cena × 1 h, jednorazowe ⌈cena / 2⌉ h, w minutach", function () {
        expect(R.standardoweMinuty(10, false)).to.equal(600);
        expect(R.standardoweMinuty(10, true), ".50 BMG — 5 h").to.equal(300);
        expect(R.standardoweMinuty(2, true), "9 mm — 1 h").to.equal(60);
        expect(R.standardoweMinuty(5, true), "nieparzysta w górę").to.equal(180);
        expect(R.standardoweMinuty(0.5, true), "minimum ≥ 1 min").to.be.at.least(1);
      });

      it("ST na granicach 10 / 25 / 50 / 75 / 100", function () {
        const cases = [[10, 5], [11, 10], [25, 10], [26, 15], [50, 15], [51, 20], [75, 20], [76, 25], [100, 25], [101, 30], [1000, 30]];
        for (const [v, st] of cases) expect(R.stZWartosci(v), `wartość ${v}`).to.equal(st);
      });

      it("próg schematu liczony od ceny sztuki — 10 gb nie wymaga, 11 wymaga", function () {
        expect(R.wymagaSchematu(10)).to.be.false;
        expect(R.wymagaSchematu(11)).to.be.true;
        expect(R.wymagaSchematu(2), "9 mm za sztukę").to.be.false;
      });

      it("ST elaboracji liczone od partii: 10 × 9 mm ≈ 20 gb → ST 10 (L3)", function () {
        const p = przepis("elaboracja/ammo:9mm");
        expect(p.cena).to.equal(2);
        expect(p.wartosc).to.equal(20);
        expect(p.st).to.equal(10);
        expect(R.wymagaSchematu(p.cena)).to.be.false;
      });
    });

    /* ------------------------------------------------------------ */
    describe("Mnożniki wykonawcy (D3, D26–D29, D32, D33)", function () {
      it("bez WKK działa tylko Fabrykator (×0,5), profesja nic nie zmienia", function () {
        expect(R.mnoznikCzasu({ kobalt: false })).to.equal(1);
        expect(R.mnoznikCzasu({ fabrykator: true, kobalt: false })).to.equal(0.5);
        expect(R.mnoznikCzasu({ profesja: "pelny", kobalt: false })).to.equal(1);
      });

      it("§5.1c: Koktajl Mołotowa (5:00) — 3:45 / 2:30 / 1:15 z WKK", function () {
        const base = PRZEPISY_STANDARDOWE.get("std/grenade:grenade-molotov").minuty;
        expect(R.fmtGGMM(base)).to.equal("5:00");
        const t = o => R.fmtGGMM(R.czasWykonawcy(base, R.mnoznikCzasu({ kobalt: true, ...o })));
        expect(t({})).to.equal("5:00");
        expect(t({ profesja: "czesc" })).to.equal("3:45");
        expect(t({ profesja: "pelny" })).to.equal("2:30");
        expect(t({ profesja: "pelny", fabrykator: true })).to.equal("1:15");
      });

      it("§5.1c: Laptop wojskowy 140:00 ST 30 → Haker 70:00 ST 25", function () {
        const p = PRZEPISY_STANDARDOWE.get("std/gear:laptop_wojskowy");
        expect(R.fmtGGMM(p.minuty)).to.equal("140:00");
        expect(p.st).to.equal(30);
        expect(R.fmtGGMM(R.czasWykonawcy(p.minuty, R.mnoznikCzasu({ profesja: "pelny", kobalt: true })))).to.equal("70:00");
        expect(R.stWykonawcy(p.st, { cechaProfesji: true, kobalt: true })).to.equal(25);
        expect(R.stWykonawcy(p.st, { cechaProfesji: true, kobalt: false }), "bez WKK bez zmian").to.equal(30);
      });

      it("§5.1c: Paralotnia 100 gb — 75:00 / 50:00", function () {
        const p = PRZEPISY_STANDARDOWE.get("std/tabela:paralotnia");
        expect(p.cena).to.equal(100);
        expect(R.fmtGGMM(R.czasWykonawcy(p.minuty, R.mnoznikCzasu({ profesja: "czesc", kobalt: true })))).to.equal("75:00");
        expect(R.fmtGGMM(R.czasWykonawcy(p.minuty, R.mnoznikCzasu({ profesja: "pelny", kobalt: true })))).to.equal("50:00");
      });

      it("§5.1c: Traktor — Mechanik z pełnym zestawem i Fabrykatorem 250:00, ST 25 zamiast 30", function () {
        const p = PRZEPISY_STANDARDOWE.get("std/pojazd:traktor");
        expect(R.fmtGGMM(R.czasWykonawcy(p.minuty, R.mnoznikCzasu({ profesja: "pelny", fabrykator: true, kobalt: true })))).to.equal("250:00");
        expect(p.st).to.equal(30);
        expect(R.stWykonawcy(p.st, { cechaProfesji: true, kobalt: true })).to.equal(25);
      });

      it("podłoga ×0,25 (D28) — iloczyn nigdy niżej", function () {
        for (const profesja of [null, "czesc", "pelny"]) {
          for (const fabrykator of [false, true]) {
            expect(R.mnoznikCzasu({ profesja, fabrykator, kobalt: true }), `${profesja}/${fabrykator}`).to.be.at.least(0.25);
          }
        }
      });

      it("drabina ST z cechą profesji nie zna 30, poniżej 76 gb bez zmian", function () {
        for (const v of [5, 25, 50, 75]) expect(R.stWykonawcy(R.stZWartosci(v), { cechaProfesji: true, kobalt: true })).to.equal(R.stZWartosci(v));
        for (const v of [76, 101, 1000]) expect(R.stWykonawcy(R.stZWartosci(v), { cechaProfesji: true, kobalt: true })).to.equal(25);
      });

      it("minuty w dół, minimum 1 (D29)", function () {
        expect(R.czasWykonawcy(101, 0.75)).to.equal(75);
        expect(R.czasWykonawcy(1, 0.25)).to.equal(1);
      });

      it("praca kończy Robotę mimo zaokrąglenia w dół — nie zostaje minuta do mety", function () {
        const pozostalo = 101;
        const czas = R.czasWykonawcy(pozostalo, 0.75); // 75
        expect(R.postepZPracy(czas, 0.75, pozostalo)).to.equal(101);
        expect(R.postepZPracy(30, 0.5, 1000), "budżety liczą pracę, nie postęp").to.equal(60);
      });

      it("Szybka produkcja: 25 / 50 gb, 1 min × 1 gb, Fabrykator ×0,5", function () {
        expect(R.budzetSzybkiejProdukcji()).to.equal(25);
        expect(R.budzetSzybkiejProdukcji({ poziom2: true })).to.equal(50);
        expect(R.czasSzybkiejProdukcji(20)).to.equal(20);
        expect(R.czasSzybkiejProdukcji(25, { fabrykator: true })).to.equal(12);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Surowce: podział, Przydasie, alokacja alternatyw (L11, L12)", function () {
      it("podział budżetu zachowuje proporcje tabeli (granat 30/4/1 z 35 gb)", function () {
        const lines = R.podzielBudzet(35, R.profilZLinii(R.parseSurowce("30 CH, 4 CZ, 1 MK")));
        expect(R.surowceString(lines)).to.equal("30 CH, 4 CZ, 1 MK");
      });

      it("podział nie gubi drobnej pozycji, gdy budżet na to pozwala (.50 BMG: 5 gb)", function () {
        const lines = R.podzielBudzet(5, R.profilZLinii(R.parseSurowce("9 CH, 1 MK")));
        expect(R.sumaGb(lines)).to.equal(5);
        expect(lines.find(l => l.typy[0] === "MK")?.gb).to.equal(1);
      });

      it("podział zawsze sumuje się do budżetu", function () {
        for (const k of Object.values(KATEGORIE)) {
          const profil = R.profilZLinii(R.parseSurowce(k.profil));
          for (const gb of [0, 1, 2, 7, 35, 100, 499]) {
            expect(R.sumaGb(R.podzielBudzet(gb, profil)), `${k.label} × ${gb}`).to.equal(gb);
          }
        }
      });

      it("Przydasie tnie o połowę, w górę", function () {
        expect(R.sumaGb(R.surowceWykonawcy(R.parseSurowce("30 CH, 4 CZ, 1 MK"), { przydasie: true }))).to.equal(18);
        expect(R.sumaGb(R.surowceWykonawcy(R.parseSurowce("30 CH, 4 CZ, 1 MK")))).to.equal(35);
      });

      it("Fabrykator × Przydasie są niezależne: czas × 0,5 i surowce × 0,5", function () {
        const p = PRZEPISY_STANDARDOWE.get("std/grenade:grenade-frag");
        expect(R.czasWykonawcy(p.minuty, R.mnoznikCzasu({ fabrykator: true, kobalt: false }))).to.equal(p.minuty / 2);
        expect(R.sumaGb(R.surowceWykonawcy(p.surowce, { przydasie: true }))).to.equal(Math.ceil(R.sumaGb(p.surowce) / 2));
      });

      it("alternatywa CH/MO bierze najpierw z typu, którego masz więcej", function () {
        const r = R.alokujSurowce(R.parseSurowce("20 CH/MO"), { CH: 5, MO: 30 });
        expect(r.ok).to.be.true;
        expect(r.przydzial).to.deep.equal({ MO: 20 });
        const r2 = R.alokujSurowce(R.parseSurowce("20 CH/MO"), { CH: 12, MO: 10 });
        expect(r2.przydzial).to.deep.equal({ CH: 12, MO: 8 });
      });

      it("alokacja najpierw rozlicza linie jednotypowe, potem alternatywy", function () {
        // Odwrotna kolejność wzięłaby 5 MK na alternatywę (MK jest więcej) i zabrakłoby 3 MK.
        const r = R.alokujSurowce(R.parseSurowce("5 MO/MK, 3 MK"), { MK: 5, MO: 3 });
        expect(r.ok).to.be.true;
        expect(r.przydzial).to.deep.equal({ MK: 5, MO: 3 });
      });

      it("niedobór jest zgłaszany per typ", function () {
        const r = R.alokujSurowce(R.parseSurowce("10 CE, 2 CZ"), { CE: 4, CZ: 5 });
        expect(r.ok).to.be.false;
        expect(r.brak).to.deep.equal({ CE: 6 });
      });

      it("zapis surowców: tolerancja „1MK”, „CH/ MO”; błąd na nieznanym kodzie", function () {
        expect(R.parseSurowce("9 CZ, 1MK")).to.deep.equal([{ typy: ["CZ"], gb: 9 }, { typy: ["MK"], gb: 1 }]);
        expect(R.parseSurowce("10 CH/ MO")[0].typy).to.deep.equal(["CH", "MO"]);
        expect(() => R.parseSurowce("5 XX")).to.throw();
      });
    });

    /* ------------------------------------------------------------ */
    describe("Robota: porzucenie (D14), waga (D4 / D25), schemat (D15)", function () {
      it("bez WKK porzucenia nie ma", function () {
        expect(R.porzucenieDostepne({ kobalt: false })).to.be.false;
        expect(R.zwrotPorzucenia({ CH: 30 }, 0, 100, { kobalt: false })).to.be.null;
      });

      it("z WKK: ≤ 10% → 100%, powyżej → 50% (w dół)", function () {
        expect(R.zwrotPorzucenia({ CH: 30, MK: 1 }, 10, 100, { kobalt: true })).to.deep.equal({ CH: 30, MK: 1 });
        const pol = R.zwrotPorzucenia({ CH: 30, CZ: 4, MK: 1 }, 11, 100, { kobalt: true });
        expect(Object.values(pol).reduce((s, x) => s + x, 0)).to.equal(17);
      });

      it("waga Roboty: WKK interpoluje, bez WKK stała waga wejścia", function () {
        const a = { wejscie: 3.5, wynik: 0.5, wymagane: 100 };
        expect(R.wagaRoboty({ ...a, postep: 0, kobalt: true })).to.equal(3.5);
        expect(R.wagaRoboty({ ...a, postep: 50, kobalt: true })).to.equal(2);
        expect(R.wagaRoboty({ ...a, postep: 100, kobalt: true })).to.equal(0.5);
        expect(R.wagaRoboty({ ...a, postep: 50, kobalt: false })).to.equal(3.5);
      });

      it("waga surowców: 1 gb CH = 100 g, 1 gb MK = 1 kg", function () {
        expect(R.wagaSurowcowKg({ CH: 30, CZ: 4, MK: 1 })).to.be.closeTo(4.4, 1e-9);
      });

      it("schemat: 1 g/h z WKK, 0 bez; trzy rozmiary", function () {
        expect(R.wagaSchematuKg(1000 * 60, { kobalt: true })).to.equal(1);
        expect(R.wagaSchematuKg(35 * 60, { kobalt: true })).to.equal(0.035);
        expect(R.wagaSchematuKg(1000 * 60, { kobalt: false })).to.equal(0);
        expect(R.rozmiarSchematu(35 * 60).id).to.equal("notatka");
        expect(R.rozmiarSchematu(140 * 60).id).to.equal("instrukcja");
        expect(R.rozmiarSchematu(1000 * 60).id).to.equal("dokumentacja");
      });
    });

    /* ------------------------------------------------------------ */
    describe("Naprawa (D17, s. 115, s. 146)", function () {
      it("broń biała: 1 / 2 / 3+ kroki kości → ST 10 / 15 / 20", function () {
        expect(R.NAPRAWA[R.stopienNaprawyBroniBialej(1)].st).to.equal(10);
        expect(R.NAPRAWA[R.stopienNaprawyBroniBialej(2)].st).to.equal(15);
        expect(R.NAPRAWA[R.stopienNaprawyBroniBialej(3)].st).to.equal(20);
        expect(R.NAPRAWA[R.stopienNaprawyBroniBialej(5)].st).to.equal(20);
      });

      it("koszt naprawy: procent ceny, w górę, nigdy zero", function () {
        expect(R.kosztNaprawy("troche", 60)).to.equal(18);
        expect(R.kosztNaprawy("drobnostka", 5)).to.equal(1);
      });

      it("pancerz: MK 10% ceny × utracona TT; 1 / 5 / 10 h na punkt", function () {
        expect(R.naprawaPancerza(90, 2, "light")).to.deep.equal({ surowce: { MK: 18 }, minuty: 120 });
        expect(R.naprawaPancerza(90, 1, "heavy").minuty).to.equal(600);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Czas i korekta — wejście gracza", function () {
      it("GG:MM", function () {
        expect(R.fmtGGMM(2100)).to.equal("35:00");
        expect(R.fmtGGMM(75)).to.equal("1:15");
      });

      it("czas pracy: „4”, „2:30”, „1,5”, „90m”", function () {
        expect(R.parseCzasPracy("4")).to.equal(240);
        expect(R.parseCzasPracy("2:30")).to.equal(150);
        expect(R.parseCzasPracy("1,5")).to.equal(90);
        expect(R.parseCzasPracy("90m")).to.equal(90);
        expect(R.parseCzasPracy("abc")).to.be.null;
      });

      it("korekta: +5, -3, +10%, =50% — wynik w [0, wymagane]", function () {
        expect(R.zastosujKorekte(100, 2100, R.parseKorekta("+5"))).to.equal(400);
        expect(R.zastosujKorekte(100, 2100, R.parseKorekta("-3"))).to.equal(0);
        expect(R.zastosujKorekte(0, 2100, R.parseKorekta("+10%"))).to.equal(210);
        expect(R.zastosujKorekte(0, 2100, R.parseKorekta("=50%"))).to.equal(1050);
        expect(R.zastosujKorekte(2000, 2100, R.parseKorekta("+5"))).to.equal(2100);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Wyrażenia narzędzi (§5.1a)", function () {
      it("TOOL_KEYS pokrywa CONFIG.DND5E.tools w obie strony", function () {
        expect(Object.keys(TOOL_KEYS).sort()).to.deep.equal(Object.keys(CONFIG.DND5E.tools).sort());
      });

      it("parser: I / LUB / nawiasy, słowa i znaki, polskie litery", function () {
        expect(toolExprString(parseToolExpr("chemika & rusznikarza"))).to.equal("chemika & rusznikarza");
        expect(toolExprString(parseToolExpr("kowala lub stolarza"))).to.equal("kowala | stolarza");
        expect(toolExprString(parseToolExpr("(chemika | aptekarza) i elektronika"))).to.equal("(chemika | aptekarza) & elektronika");
        expect(toolExprString(parseToolExpr("Ślusarza"))).to.equal("slusarza");
        expect(parseToolExpr("")).to.be.null;
      });

      it("parser: błędy składni i nieznany klucz", function () {
        for (const bad of ["chemika &", "(chemika", "chemika )", "chemika, kowala", "kucharka"]) {
          expect(() => parseToolExpr(bad), bad).to.throw(ToolExprError);
        }
      });

      it("normalizacja: duplikaty i pochłanianie", function () {
        expect(toolExprString(parseToolExpr("chemika & rusznikarza & chemika"))).to.equal("chemika & rusznikarza");
        expect(toolExprString(parseToolExpr("elektronika & (szklarza | elektronika)"))).to.equal("elektronika");
      });

      it("opis po polsku", function () {
        expect(formatToolExpr(parseToolExpr("(chemika | aptekarza) & elektronika"))).to.equal("(Chemika lub Aptekarza) i Elektronika");
        expect(formatToolExpr(null)).to.equal("bez narzędzi");
      });

      it("klucze obowiązkowe — część wspólna gałęzi „lub”", function () {
        expect([...mandatoryToolKeys(parseToolExpr("hakera & elektronika"))].sort()).to.deep.equal(["elektronika", "hakera"]);
        expect([...mandatoryToolKeys(parseToolExpr("kowala | stolarza"))]).to.deep.equal([]);
        expect([...mandatoryToolKeys(parseToolExpr("(kowala & krawca) | (kowala & stolarza)"))]).to.deep.equal(["kowala"]);
      });

      it("ocena: „lub” wybiera gałąź z najwyższą premią (L5), braki opisane", function () {
        const tree = parseToolExpr("kowala | stolarza");
        const r = evalToolExpr(tree, k => ({ status: "ok", bonus: k === "stolarza" ? 4 : 2 }));
        expect(r.ok).to.be.true;
        expect(r.wybor).to.deep.equal(["stolarza"]);

        const miss = evalToolExpr(parseToolExpr("(chemika | aptekarza) & elektronika"),
          k => ({ status: k === "elektronika" ? "ok" : "brak-bieglosci", bonus: 0 }));
        expect(miss.ok).to.be.false;
        expect(miss.poziom).to.equal("brak");
        expect(formatToolExpr(miss.brakuje)).to.equal("Chemika lub Aptekarza");
      });

      it("ocena: zestaw w puli to poziom 🚚, nie ⛔", function () {
        const r = evalToolExpr(parseToolExpr("chemika & rusznikarza"),
          k => ({ status: k === "rusznikarza" ? "pula" : "ok", bonus: 0 }));
        expect(r.poziom).to.equal("pula");
        expect(r.braki).to.deep.equal([{ key: "rusznikarza", status: "pula" }]);
      });

      it("każdy przepis ma parsowalny wymóg z kluczami z CONFIG", function () {
        for (const p of [...PRZEPISY_STANDARDOWE.values(), ...PRZEPISY_PROFESJI.values(), ...PRZEPISY_ELABORACJI.values()]) {
          const tree = parseToolExpr(p.narzedzia);
          const walk = n => { if (!n) return; if (n.key) expect(CONFIG.DND5E.tools[n.key], `${p.id}: ${n.key}`).to.exist; else (n.i ?? n.lub).forEach(walk); };
          walk(tree);
        }
      });
    });

    /* ------------------------------------------------------------ */
    describe("Dane przepisów (§5.1, D22, D24, D31)", function () {
      it("każdy wiersz tabel wskazuje istniejący wpis katalogu", function () {
        for (const [t, rows] of Object.entries(DANE.TABELE)) {
          for (const r of rows) expect(KATALOG.has(r.ref), `${t}: ${r.nazwa} → ${r.ref}`).to.be.true;
        }
        for (const r of DANE.ELABORACJA) expect(KATALOG.has(r.ref), r.ref).to.be.true;
      });

      it("żaden przepis nie robi przedmiotu z niczego (D37)", function () {
        for (const kobalt of [true, false]) {
          for (const p of wszystkiePrzepisy({ kobalt })) {
            expect(R.sumaGb(p.surowce), `${p.id} (kobalt: ${kobalt})`).to.be.above(0);
          }
        }
      });

      it("każdy wpis katalogu ma nazwę i cenę (pole z pliku danych mogło się nazywać inaczej)", function () {
        for (const k of KATALOG.values()) {
          expect(k.nazwa, k.ref).to.be.a("string").and.not.empty;
          expect(Number.isFinite(k.cena), k.ref).to.be.true;
        }
      });

      it("każde nadpisanie trafia w istniejący wpis (literówka wyłącza je po cichu)", function () {
        for (const ref of Object.keys(DANE.NADPISANIA)) expect(KATALOG.has(ref), ref).to.be.true;
      });

      it("przepis profesji = zestaw profesji & zwykły wymóg (D22)", function () {
        expect(przepis("pirotechnika/grenade:grenade-molotov").narzedzia).to.equal("chemika & rusznikarza");
        expect(przepis("std/grenade:grenade-molotov").narzedzia).to.equal("chemika");
        expect(przepis("mechanika/pojazd:traktor").narzedzia).to.equal("mechanika & kowala");
      });

      it("Mołotow z tabeli: 1 minuta dosłownie (D30 — bez WKK)", function () {
        expect(przepis("pirotechnika/grenade:grenade-molotov").minuty).to.equal(1);
      });

      it("errata D31: Wózek 9 MK, Celownik optyczny 40 h", function () {
        expect(R.surowceString(przepis("mechanika/gear:wozek").surowce)).to.equal("1 CZ, 9 MK");
        expect(przepis("serwisowanie/addon:celownik-optyczny").minuty).to.equal(40 * 60);
      });

      it("podział standardu bierze proporcje z tabeli profesji (D22)", function () {
        expect(R.surowceString(przepis("std/grenade:grenade-frag").surowce)).to.equal("30 CH, 4 CZ, 1 MK");
        expect(R.surowceString(przepis("std/pojazd:traktor").surowce)).to.equal("100 CZ, 400 MK");
      });

      it("Rusznikarstwo: kategorie rozwinięte na bronie, ciężka „koszt × 2 h” (LAW 600 h)", function () {
        expect(przepis("rusznikarstwo/weapon:ak-kalach")?.st).to.equal(20);
        expect(przepis("rusznikarstwo/weapon:law").minuty).to.equal(600 * 60);
        expect(przepis("std/weapon:law").minuty, "LAW jednorazowy — standard 150 h").to.equal(150 * 60);
      });

      it("listy profesji (D24) niepuste i bez gości spoza katalogu", function () {
        for (const [prof, refs] of Object.entries(LISTA_PROFESJI)) {
          expect(refs.size, prof).to.be.greaterThan(0);
          for (const ref of refs) expect(KATALOG.has(ref), `${prof}: ${ref}`).to.be.true;
        }
        expect(Object.keys(LISTA_PROFESJI).sort()).to.deep.equal(Object.keys(PROFESJE).sort());
      });

      it("przedmiot z tabeli bez ceny RAW: cena = 2 × surowce wiersza, czas zgodny ze wzorem", function () {
        const k = KATALOG.get("tabela:zegarek");
        expect(k.cena).to.equal(20);
        expect(przepis("std/tabela:zegarek").minuty).to.equal(przepis("serwisowanie/tabela:zegarek").minuty);
      });

      it("żaden przepis nie tworzy przedmiotu wartego ≥ 2 gb z niczego", function () {
        for (const p of [...PRZEPISY_STANDARDOWE.values(), ...PRZEPISY_PROFESJI.values(), ...PRZEPISY_ELABORACJI.values()]) {
          if (p.wartosc >= 2) expect(R.sumaGb(p.surowce), p.id).to.be.greaterThan(0);
        }
      });

      it("tabele RAW zgodne ze wzorem poza wierszami z audytu (§5.1b)", function () {
        // Granaty, miny i dodatki do broni — „równe standardowi co do liczby” (docs/Errata-produkcja.md).
        for (const id of ["pirotechnika/grenade:grenade-frag", "pirotechnika/grenade:grenade-smoke", "rusznikarstwo/addon:tlumik", "hakerstwo/gear:laptop_wojskowy"]) {
          const p = przepis(id);
          expect(p.minuty, id).to.equal(R.standardoweMinuty(p.wartosc, p.jednorazowy));
          expect(R.sumaGb(p.surowce), id).to.equal(R.budzetSurowcow(p.wartosc));
        }
      });
    });

    /* ------------------------------------------------------------ */
    describe("Surowce: rozpoznanie i plan zużycia", function () {
      it("Kwas (fiolka) z ikoną chemii nie jest surowcem", function () {
        const kwas = { type: "consumable", img: "modules/x/icons/items/loot/chemia.svg", name: "Kwas (fiolka)", flags: { [MODULE_ID]: { kwas: true } } };
        expect(getSurowiecType(kwas)).to.be.null;
        const ch = { type: "consumable", img: "modules/x/icons/items/loot/chemia.svg", name: "Litry chemii", flags: {} };
        expect(getSurowiecType(ch)?.code).to.equal("CH");
      });

      it("gbPerKg z tabeli surowców: CH/CE/CZ 10, MK/MO 1", function () {
        expect(Object.fromEntries(SUROWCE_TYPES.map(t => [t.code, t.gbPerKg]))).to.deep.equal({ CH: 10, CE: 10, CZ: 10, MK: 1, MO: 1 });
      });

      it("plan: stosy kanoniczne najpierw, reszta oddana w jednostkach kanonicznych", function () {
        const plan = STORE.planTake([{ id: "big", unitKg: 20, qty: 1 }, { id: "canon", unitKg: 1, qty: 3 }], 5, 1);
        expect(plan.ok).to.be.true;
        expect(plan.updates.find(u => u.id === "canon").qty).to.equal(0);
        expect(plan.changeGb).to.equal(18); // 3 × 1 kg + 20 kg − 5 gb
      });

      it("plan: za mało → nic nie rusza", function () {
        const plan = STORE.planTake([{ id: "a", unitKg: 0.1, qty: 5 }], 10, 10); // 5 × 100 g = 5 gb
        expect(plan.ok).to.be.false;
        expect(plan.updates).to.deep.equal([]);
      });

      it("plan: stos 50 g na sztukę (Komponenty Amunicji) liczony wagą", function () {
        const plan = STORE.planTake([{ id: "k", unitKg: 0.05, qty: 27 }], 13, 10);
        expect(plan.ok).to.be.true;
        expect(plan.updates[0].units).to.equal(26);
        expect(plan.changeGb).to.equal(0);
      });
    });

    describe("Lejek surowców na prawdziwym aktorze", function () {
      it("zużycie, reszta ze stosu 20 kg MK i zwrot", async function () {
        const actor = await scratchActor();
        const mk = buildSurowiecItemData("MK", 1);
        mk.name = "Materiały konstrukcyjne";
        mk.system.weight.value = 20;
        delete mk.flags;
        await actor.createEmbeddedDocuments("Item", [buildSurowiecItemData("CH", 12), mk]);
        expect(gbOf(actor, "CH")).to.equal(12);
        expect(gbOf(actor, "MK")).to.equal(20);

        const r = await takeManySurowce(actor, { CH: 5, MK: 3 });
        expect(r.ok).to.be.true;
        expect(gbOf(actor, "CH")).to.equal(7);
        expect(gbOf(actor, "MK"), "reszta z 20 kg").to.equal(17);

        const short = await takeManySurowce(actor, { CH: 100, MK: 1 });
        expect(short.ok).to.be.false;
        expect(short.brak).to.deep.equal({ CH: 93 });
        expect(gbOf(actor, "MK"), "nic nie ruszone przy niedoborze").to.equal(17);

        await giveSurowce(actor, "CH", 3);
        expect(gbOf(actor, "CH")).to.equal(10);
        for (const i of actor.items) expect(Number.isInteger(i.system.quantity), i.name).to.be.true;
      });

      it("równoległe zużycie nie wydaje tego samego dwa razy", async function () {
        const actor = await scratchActor();
        await actor.createEmbeddedDocuments("Item", [buildSurowiecItemData("CE", 10)]);
        const [a, b] = await Promise.all([takeSurowce(actor, "CE", 7), takeSurowce(actor, "CE", 7)]);
        expect([a.ok, b.ok].filter(Boolean).length).to.equal(1);
        expect(gbOf(actor, "CE")).to.equal(3);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Robota na prawdziwym aktorze (lejek E1)", function () {
      const nowyWykonawca = async (surowce = { CH: 20, MK: 5 }) => {
        const actor = await scratchActor({ system: { tools: { chemika: { value: 1, ability: "int" } } } });
        await actor.createEmbeddedDocuments("Item", Object.entries(surowce).map(([k, v]) => buildSurowiecItemData(k, v)));
        return actor;
      };

      it("Proste daje dostęp bez Schematu; brak dostępu do skomplikowanego", async function () {
        const actor = await nowyWykonawca();
        expect(zrodlaDostepu(actor, przepis("std/grenade:grenade-molotov")).map(z => z.typ)).to.include("proste");
        expect(zrodlaDostepu(actor, przepis("std/grenade:grenade-frag"))).to.deep.equal([]);
      });

      it("start: surowce schodzą, Robota nosi snapshot, braki narzędzi zapisane (D23)", async function () {
        const actor = await nowyWykonawca();
        const warn = captureWarnings();
        const bezZgody = await ROBOTA.start(actor, "std/grenade:grenade-molotov");
        warn.restore();
        expect(bezZgody, "bez zestawu i bez `mimoBrakow` — nie startuje").to.be.null;

        const item = await ROBOTA.start(actor, "std/grenade:grenade-molotov", { mimoBrakow: true });
        expect(item).to.exist;
        const r = ROBOTA.daneRoboty(item);
        expect(r.przepis.id).to.equal("std/grenade:grenade-molotov");
        expect(r.surowce).to.deep.equal({ CH: 4, MK: 1 });
        expect(r.braki.map(b => b.key)).to.deep.equal(["chemika"]);
        expect(gbOf(actor, "CH")).to.equal(16);
        expect(gbOf(actor, "MK")).to.equal(4);
        expect(item.system.quantity).to.equal(1);
      });

      it("praca: postęp w minutach bazowych, stan „test” po 100%", async function () {
        const actor = await nowyWykonawca();
        const item = await ROBOTA.start(actor, "std/grenade:grenade-molotov", { mimoBrakow: true });
        const w = await ROBOTA.pracuj(item, 120, { odlozTest: true, cicho: true });
        expect(w.delta).to.equal(120);
        expect(ROBOTA.daneRoboty(item).stan).to.equal("praca");
        await ROBOTA.pracuj(item, 600, { odlozTest: true, cicho: true });
        const r = ROBOTA.daneRoboty(item);
        expect(r.postep).to.equal(r.wymagane);
        expect(r.stan).to.equal("test");
      });

      it("porażka Testu: od nowa, surowce zostają (D2); przerzut ≥ ST kończy Robotę", async function () {
        // Dwie karty czatu + pierwszy (zimny) odczyt kompendium granatów — w pełnym przebiegu
        // potrafi przekroczyć domyślne 2 s Mochy.
        this.timeout(10000);
        const actor = await nowyWykonawca();
        const item = await ROBOTA.start(actor, "std/grenade:grenade-molotov", { mimoBrakow: true });
        await ROBOTA.pracuj(item, 600, { odlozTest: true, cicho: true });
        await ROBOTA.rozstrzygnij(item, { total: 1, st: 5, zrodlo: "test" });
        const r = ROBOTA.daneRoboty(item);
        expect(r.postep).to.equal(0);
        expect(r.podejscia).to.equal(1);
        expect(r.surowce).to.deep.equal({ CH: 4, MK: 1 });

        const wynik = await ROBOTA.rozstrzygnij(item, { total: 12, st: 5, zrodlo: "fuks" });
        expect(wynik).to.equal("sukces");
        expect(actor.items.get(item.id), "Robota znika").to.not.exist;
        expect(actor.items.find(i => i.name === "Koktajl Mołotowa"), "wynik z kompendium").to.exist;
      });

      it("porzucenie z WKK: ≤ 10% zwraca wszystko", async function () {
        if (!isKobaltEnabled()) this.skip();
        const actor = await nowyWykonawca();
        const item = await ROBOTA.start(actor, "std/grenade:grenade-molotov", { mimoBrakow: true });
        const zwrot = await ROBOTA.porzuc(item, { potwierdz: false });
        expect(zwrot).to.deep.equal({ CH: 4, MK: 1 });
        expect(gbOf(actor, "CH")).to.equal(20);
        expect(gbOf(actor, "MK")).to.equal(5);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Schematy (E3, D15)", function () {
      it("Schemat tylko dla przepisu standardowego powyżej 10 gb", function () {
        expect(maSchemat(przepis("std/grenade:grenade-frag"))).to.be.true;
        expect(maSchemat(przepis("std/grenade:grenade-molotov")), "10 gb — Proste").to.be.false;
        expect(maSchemat(przepis("pirotechnika/grenade:grenade-frag")), "przepis profesji").to.be.false;
        expect(przepisySchematow().every(p => p.id.startsWith("std/"))).to.be.true;
      });

      it("Schemat: cena przedmiotu, dostępność o połowę, rozmiar wg godzin", function () {
        const d = schematItemData(przepis("std/grenade:grenade-frag"));
        expect(d.system.price.value).to.equal(70);
        expect(d.flags[MODULE_ID].schemat.rozmiar).to.equal("notatka");
        const avail = KATALOG.get("grenade:grenade-frag").dostepnosc;
        if (Number.isFinite(avail)) expect(d.flags[MODULE_ID].availability).to.equal(Math.floor(avail / 2));
        expect(schematItemData(przepis("std/pojazd:traktor")).flags[MODULE_ID].schemat.rozmiar).to.equal("dokumentacja");
      });

      it("waga Schematu liczona w danych pochodnych wg WKK (paczka ma 0)", async function () {
        const actor = await scratchActor();
        const [it] = await actor.createEmbeddedDocuments("Item", [schematItemData(przepis("std/grenade:grenade-frag"))]);
        expect(it._source.system.weight.value).to.equal(0);
        expect(it.system.weight.value).to.equal(isKobaltEnabled() ? 0.035 : 0);
      });

      it("Schemat daje dostęp do przepisu standardowego", async function () {
        const actor = await scratchActor();
        await actor.createEmbeddedDocuments("Item", [schematItemData(przepis("std/weapon:katana"))]);
        expect(zrodlaDostepu(actor, przepis("std/weapon:katana")).map(z => z.typ)).to.include("schemat");
      });
    });

    describe("Przepisy zdolności (D35)", function () {
      it("Pogromca: 100 h, 10 MK · 10 CE · 80 CZ, bez Testu, tylko ze zdolnością", async function () {
        const p = PRZEPISY_ZDOLNOSCI.get("zdolnosc/weapon:pogromca");
        expect(p.minuty).to.equal(6000);
        expect(R.surowceString(p.surowce)).to.equal("10 MK, 10 CE, 80 CZ");
        expect(p.bezTestu).to.be.true;
        const actor = await scratchActor();
        expect(zrodlaDostepu(actor, p)).to.deep.equal([]);
      });

      it("Pogromca, jego naboje i .22 LR nie mają przepisów standardowych", function () {
        for (const ref of ["weapon:pogromca", "ammo:pogromca-trucizna", "ammo:pogromca-kwas", "ammo:pogromca-ogien", "ammo:22lr"]) {
          expect(PRZEPISY_STANDARDOWE.has(`std/${ref}`), ref).to.be.false;
        }
      });
    });

    /* ------------------------------------------------------------ */
    describe("Naprawa (E7)", function () {
      it("przepis naprawy: ST i koszt z tabeli", async function () {
        const actor = await scratchActor();
        const [noz] = await actor.createEmbeddedDocuments("Item", [{ name: "Nóż taktyczny", type: "weapon", system: { price: { value: 10 }, type: { value: "biala" } } }]);
        for (const [stopien, st, koszt] of [["drobnostka", 10, 1], ["troche", 15, 3], ["harowa", 20, 5]]) {
          const p = await przepisNaprawy(noz, stopien, { minuty: 60, narzedzia: "kowala" });
          expect(p.st, stopien).to.equal(st);
          expect(R.sumaGb(p.surowce), stopien).to.equal(koszt);
          expect(p.zrodlo.naprawa).to.equal(stopien);
        }
      });

      it("naprawa nie wymaga Schematu — dostęp z samego rodzaju przepisu", async function () {
        const actor = await scratchActor();
        const [it] = await actor.createEmbeddedDocuments("Item", [{ name: "Katana", type: "weapon", system: { price: { value: 40 }, type: { value: "biala" } } }]);
        const p = await przepisNaprawy(it, "troche", { minuty: 60, narzedzia: "kowala" });
        expect(ROBOTA.ocenaStartu(actor, p).zrodla.map(z => z.typ)).to.deep.equal(["naprawa"]);
      });

      it("przedmiot bez uszkodzeń: stopień domyślny „Trochę roboty”, naprawa niepotrzebna", async function () {
        const actor = await scratchActor();
        const [it] = await actor.createEmbeddedDocuments("Item", [{ name: "Łopata", type: "loot", system: { price: { value: 5 } } }]);
        const s = stanNaprawy(it);
        expect(s.potrzebna).to.be.false;
        expect(s.stopien).to.equal("troche");
      });

      it("„Do naprawy” wymienia uszkodzony pancerz; druga naprawa tego samego przedmiotu odrzucona", async function () {
        const actor = await scratchActor();
        await actor.createEmbeddedDocuments("Item", [buildSurowiecItemData("MK", 20)]);
        const [pancerz] = await actor.createEmbeddedDocuments("Item", [{
          name: "Kurtka", type: "equipment",
          system: { type: { value: "light" }, armor: { value: 12 }, price: { value: 30 } },
          flags: { [MODULE_ID]: { wytrzymalosc: { utracone: 1 } } }
        }]);
        expect(doNaprawy(actor).map(x => x.item.id)).to.deep.equal([pancerz.id]);
        const r1 = await rozpocznijNaprawe(actor, pancerz, { mimoBrakow: true });
        expect(r1, "pierwsza naprawa").to.be.ok;
        expect(doNaprawy(actor), "w naprawie — znika z listy").to.deep.equal([]);
        const warn = captureWarnings();
        const r2 = await rozpocznijNaprawe(actor, pancerz, { mimoBrakow: true });
        warn.restore();
        expect(r2, "druga naprawa").to.be.null;
        expect(actor.items.filter(i => ROBOTA.isRobota(i)).length).to.equal(1);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Zakaz klonowania Roboty (D21)", function () {
      it("kopia z tym samym robota.id jest odrzucana, przeniesienie zostawia jeden egzemplarz", async function () {
        const a = await scratchActor();
        const b = await scratchActor();
        await a.createEmbeddedDocuments("Item", [buildSurowiecItemData("CH", 20), buildSurowiecItemData("MK", 5)]);
        const item = await ROBOTA.start(a, "std/grenade:grenade-molotov", { mimoBrakow: true });
        const warn = captureWarnings();
        const kopia = await b.createEmbeddedDocuments("Item", [item.toObject()]);
        warn.restore();
        expect(kopia.length, "kopia odrzucona").to.equal(0);
        expect(item.canDuplicate).to.be.false;
        const przeniesiona = await przenies(item, b, { cicho: true });
        expect(przeniesiona.parent.id).to.equal(b.id);
        expect(a.items.filter(i => ROBOTA.isRobota(i)).length).to.equal(0);
        expect(ROBOTA.daneRoboty(przeniesiona).kierownikId, "przejęcie przez postać").to.equal(b.id);
        expect(audytRobot({ konsola: false }).duplikaty.length).to.equal(0);
      });

      it("ilość Roboty zostaje 1", async function () {
        const a = await scratchActor();
        await a.createEmbeddedDocuments("Item", [buildSurowiecItemData("CH", 20), buildSurowiecItemData("MK", 5)]);
        const item = await ROBOTA.start(a, "std/grenade:grenade-molotov", { mimoBrakow: true });
        const warn = captureWarnings();
        await item.update({ "system.quantity": 3 });
        warn.restore();
        expect(item.system.quantity).to.equal(1);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Szybka produkcja (E6)", function () {
      it("bez zdolności — brak stanu; budżet 25 gb, koszyk nie przekracza budżetu", async function () {
        const actor = await scratchActor();
        expect(stanSzybkiej(actor)).to.be.null;
        await actor.createEmbeddedDocuments("Item", [{
          name: "Szybka produkcja", type: "feat",
          system: { uses: { max: "1", spent: 0, recovery: [{ period: "sr", type: "recoverAll" }] } },
          flags: { [MODULE_ID]: { abilityId: "szybka-produkcja" } }
        }]);
        const s = stanSzybkiej(actor);
        expect(s.budzet).to.equal(25);
        expect(s.ladunki).to.equal(1);
        dodajDoKoszyka(actor, przepis("std/grenade:grenade-molotov"), 2);
        const warn = captureWarnings();
        dodajDoKoszyka(actor, przepis("std/grenade:grenade-molotov"));
        warn.restore();
        expect(stanSzybkiej(actor).wartosc, "trzeci Mołotow nie wszedł").to.equal(20);
        expect(ocenaKoszyka(actor).minuty).to.equal(20);
        wyczyscKoszyk(actor);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Zakładka Produkcja (E2)", function () {
      it("ikony wierszy biorą się z paczek, nie z worka zastępczego", async function () {
        this.timeout(10000);
        await przygotujIkony();
        expect(ikonaPrzepisu(przepis("std/chemia:papieros"))).to.include("papieros.svg");
        expect(ikonaPrzepisu(przepis("std/grenade:grenade-molotov"))).to.not.equal("icons/svg/item-bag.svg");
      });
    });

    /* ------------------------------------------------------------ */
    describe("Zasoby: gracz dodaje sam (spójność paneli)", function () {
      it("pusta postać widzi wszystkie panele Zasobów, każdy z przyciskiem DODAJ", async function () {
        this.timeout(10000);
        const actor = await scratchActor();
        await actor.sheet.render({ force: true });
        try {
          const root = actor.sheet.element.querySelector(".neuro-zasoby-root");
          for (const panel of ["ammo", "magazine", "grenade", "leki", "prowiant", "surowce"]) {
            const el = root?.querySelector(`.neuro-${panel}-wrapper`);
            expect(el, `panel ${panel} przy pustym ekwipunku`).to.exist;
            const dodaj = [...el.querySelectorAll("button")].some(b => /DODAJ/.test(b.textContent));
            expect(dodaj, `panel ${panel}: przycisk DODAJ`).to.be.true;
          }
        } finally {
          await actor.sheet.close();
        }
      });

      it("lek dodany dwa razy trafia do jednego stosu", async function () {
        const actor = await scratchActor();
        const info = ui.notifications.info;
        ui.notifications.info = () => {};
        try {
          await addLekToActor(actor, "papieros", 3);
          await addLekToActor(actor, "papieros", 2);
        } finally { ui.notifications.info = info; }
        const stosy = actor.items.filter(i => i.getFlag(MODULE_ID, "chemiaKey") === "papieros");
        expect(stosy.length).to.equal(1);
        expect(stosy[0].system.quantity).to.equal(5);
      });
    });

    /* ------------------------------------------------------------ */
    describe("Zajęcia na odpoczynku (E5)", function () {
      it("rejestr zna produkcję, czyszczenie broni, Truciciela i Pogromcę", function () {
        const ids = restActivitiesApi.lista().map(d => d.id);
        for (const id of ["produkcja", "czyszczenie", "truciciel", "pogromca"]) expect(ids, id).to.include(id);
        const czysc = restActivitiesApi.lista().find(d => d.id === "czyszczenie");
        expect(czysc.budzet("short"), "KO: wspólna godzina").to.equal("praca");
        expect(czysc.budzet("long")).to.be.null;
        expect(restActivitiesApi.budzet("short")).to.equal(60);
        expect(restActivitiesApi.budzet("long")).to.equal(600);
      });

      it("olejek Truciciela: ST 8 + INT + PB; stos tylko przy tym samym ST", async function () {
        const actor = await scratchActor({ system: { abilities: { int: { value: 14 } } } });
        const st = stOlejku(actor);
        expect(st).to.equal(8 + actor.system.abilities.int.mod + actor.system.attributes.prof);
        await dodajOlejek(actor, st);
        await dodajOlejek(actor, st);
        await dodajOlejek(actor, st + 2);
        const stosy = actor.items.filter(i => i.name.startsWith("Olejek trujący"));
        expect(stosy.length).to.equal(2);
        expect(stosy.find(i => i.name.includes(`ST ${st})`)).system.quantity).to.equal(2);
      });
    });
  }, { displayName: "Neuroshima: Produkcja — reguły, przepisy, surowce" });
}
