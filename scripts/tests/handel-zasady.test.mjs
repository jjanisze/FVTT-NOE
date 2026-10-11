/**
 * Neuroshima 5e — handel: czyste zasady (PLAN_m5_postoj.md E0, §8 „handel-zasady”).
 *
 * Warstwa 1 (tabele): 11 × 7 cen regionalnych = s. 44, lokalizacje = s. 43, każda kategoria katalogu ma
 * kolumnę cen albo jawne „bez”, każda pozycja z cennika ma dostępność (U4), ulepszenia — rodzaj zgodny z
 * kolumną „Wymagania montażu” dla każdego wiersza RAW (D31), dostępność nasadek (D32).
 * Warstwa 4 (predykaty): przykład UZI z s. 43, cena regionalna, stan i skup NOE / WKK, Gambling we krwi,
 * ilości, godziny i RO, waluta lokalna, generator — to samo ziarno, udział kategorii głównych, przeróbki
 * poza listą, Osełka tylko pod Kobaltem, własność „szansa na liście ≤ dostępność tutaj < szansa zamówienia”
 * analitycznie (dla każdej pozycji katalogu) i w 10 000 losowań.
 *
 * Bez dokumentów — paczka nie dotyka świata.
 */

import { MODULE_ID } from "./helpers.mjs";
import {
  LOKALIZACJE, REGIONY, KATEGORIE_CEN, KATEGORIA_CENOWA, GRUPY_TOWARU, PODSTAWY, DOSTEPNOSC_NASADEK
} from "../config/handel-data.mjs";
import {
  kategoriaCenowa, cenaTutaj, dostepnoscTutaj, wynikZamowienia, szansaZamowienia, premieZamowienia, iloscRegula,
  godzinyGamblingu, potrzebaRO, wycenaOferty, wartoscWalutyLokalnej, generujTowar, szansaNaLiscie, towarHandlu,
  skupDomyslny, grupaTowaru, fachowiecDomyslny, fachowiecRobi, obrazHandlarza
} from "../config/handel-rules.mjs";
import { ADDON_DEFS, rodzajUlepszenia, dostepnoscNasadki } from "../config/addons-data.mjs";
import { KATALOG, KATEGORIE } from "../config/recipes-data.mjs";
import { dostepnosc } from "../config/dostepnosc.mjs";
import { rngZZiarna } from "../config/losowanie.mjs";

/** s. 44 — Tabela modyfikacji cen regionalnych, wiersz po wierszu (paliwo … usługi speców). */
const TABELA_S44 = {
  "detroit": [200, 100, 50, 200, 150, 100, 200],
  "appalachy": [100, 150, 200, 100, 150, 150, 100],
  "hegemonia": [150, 50, 100, 150, 200, 100, 150],
  "nowy-jork": [75, 150, 150, 100, 150, 200, 25],
  "miami": [100, 100, 100, 25, 150, 50, 100],
  "missisipi": [75, 100, 100, 150, 150, 150, 150],
  "posterunek": [200, 200, 150, 50, 200, 200, 25],
  "pustynia": [150, 25, 25, 50, 50, 100, 50],
  "teksas": [25, 50, 100, 25, 100, 25, 200],
  "vegas": [100, 150, 100, 25, 150, 150, 150],
  "salt-lake-city": [100, 100, 100, 50, 150, 25, 100]
};

/**
 * s. 128–129 — kolumna „Wymagania montażu” → oczekiwany rodzaj (D31): SM albo uchwyt bagnetu — nasadka,
 * każde inne wymaganie (i wszystkie ulepszenia broni białej) — przeróbka.
 */
const WYMAGANIA_MONTAZU = {
  "bagnet": ["uchwyt bagnetu", "nasadka"], "celownik-optyczny": ["SM", "nasadka"], "chwyt-przedni": ["SM", "nasadka"],
  "celownik-trytowy": ["BPK", "przerobka"], "dwojnog": ["SM", "nasadka"], "granatnik": ["SM, BPP, BPD, BPC", "nasadka"],
  "kolimator": ["SM", "nasadka"], "kolba-dostawna": ["BPK, BPP", "przerobka"], "kolba-skladana": ["BPD", "przerobka"],
  "konwersja": ["broń palna", "przerobka"], "latarka": ["SM", "nasadka"], "laserowy-wskaznik": ["SM", "nasadka"],
  "noktowizor": ["SM", "nasadka"], "okladziny": ["brak", "przerobka"], "powiekszalnik": ["SM", "nasadka"],
  "szyna": ["broń palna", "przerobka"], "srutowka-podlufowa": ["SM, BPP, BPD, BPC", "nasadka"], "termowizor": ["SM", "nasadka"],
  "tlumik": ["pistolet, karabinek, karabin", "przerobka"], "trojnog": ["SM", "nasadka"], "uchwyt-bagnetu": ["BPD i BPP", "przerobka"],
  "zestaw-sprezyn": ["broń palna", "przerobka"],
  "dociazone": ["broń obuchowa", "przerobka"], "dozownik": ["broń kłuta", "przerobka"], "naostrzenie": ["broń sieczna i kłuta", "przerobka"],
  "przekucie": ["broń jednoręczna", "przerobka"], "szoker": ["brak", "przerobka"], "utwardzenie": ["brak", "przerobka"],
  "wywazone": ["broń rzucana", "przerobka"]
};

const KAT = () => [...KATALOG.values()];

export function registerHandelZasadyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.handel-zasady`, context => {
    const { describe, it, expect } = context;

    describe("Dane (warstwa 1)", function () {
      it("ceny regionalne to s. 44 co do komórki (11 × 7)", function () {
        expect(Object.keys(REGIONY), "regiony").to.have.members(Object.keys(TABELA_S44));
        const kol = Object.keys(KATEGORIE_CEN);
        expect(kol, "kolumny w kolejności druku").to.deep.equal(["paliwo", "elektronika", "mechanika", "prochy", "bron", "zywnosc", "uslugi"]);
        for (const [r, wiersz] of Object.entries(TABELA_S44)) {
          kol.forEach((k, i) => expect(REGIONY[r][k], `${r} / ${k}`).to.equal(wiersz[i]));
        }
      });

      it("lokalizacje to s. 43: Dzicz −50, Wioska −30, Miasteczko 0, Miasto +10", function () {
        expect(Object.fromEntries(Object.entries(LOKALIZACJE).map(([k, v]) => [k, v.modyfikator])))
          .to.deep.equal({ dzicz: -50, wioska: -30, miasteczko: 0, miasto: 10 });
        expect([6, 10, 15, 25], "miejsca handlarza D29").to.deep.equal(Object.values(LOKALIZACJE).map(l => l.miejsca));
      });

      it("każda kategoria katalogu ma kolumnę cen albo jawne „bez” (D8)", function () {
        for (const kat of Object.keys(KATEGORIE)) {
          expect(Object.prototype.hasOwnProperty.call(KATEGORIA_CENOWA, kat), `kategoria ${kat} bez decyzji w KATEGORIA_CENOWA`).to.equal(true);
          const v = KATEGORIA_CENOWA[kat];
          if (v !== null) expect(KATEGORIE_CEN, `${kat} → ${v}`).to.have.property(v);
        }
      });

      it("każda grupa towaru wskazuje istniejące kategorie, Podstawy — istniejące pozycje z dostępnością", function () {
        for (const [id, g] of Object.entries(GRUPY_TOWARU)) for (const k of g.kat) expect(KATEGORIE, `${id} → ${k}`).to.have.property(k);
        for (const ref of PODSTAWY) {
          expect(KATALOG.has(ref), `Podstawy: ${ref}`).to.equal(true);
          expect(towarHandlu(KATALOG.get(ref)), `Podstawy: ${ref} nie jest towarem`).to.equal(true);
        }
      });

      it("każdy przedmiot z cennika ma dostępność 0–100 albo jawny powód braku (U4)", function () {
        for (const k of KATALOG.values()) {
          const swiadomie = k.pochodzenie === "tabela" || k.zaslepka || k.wynik !== "item" || k.kategoria === "uslugi" || k.bezDostepnosci;
          if (swiadomie) continue;
          expect(k.dostepnosc, `${k.ref} (${k.nazwa})`).to.be.a("number").within(0, 100);
        }
      });

      it("dostępność uzupełniona z NOE: Kompas 30, Laptop 10, Komputer osobisty 30, Kłódka 50, Kwas 30, Kolczatki 40, Noktowizor 15", function () {
        const oczek = { "raw:kompas": 30, "raw:laptop": 10, "raw:komputer-osobisty": 30, "raw:klodka": 50, "item:kwas": 30, "item:kolczatka": 40, "item:gogle-noktowizor": 15 };
        for (const [ref, d] of Object.entries(oczek)) expect(dostepnosc(ref), ref).to.equal(d);
      });
    });

    describe("Ulepszenia: nasadka czy przeróbka (D31, D32, D41)", function () {
      it("rodzaj zgodny z kolumną „Wymagania montażu” dla każdego wiersza RAW", function () {
        expect(Object.keys(ADDON_DEFS), "każde ulepszenie ma wiersz w tabeli testu").to.have.members(Object.keys(WYMAGANIA_MONTAZU));
        for (const [id, [wym, rodzaj]] of Object.entries(WYMAGANIA_MONTAZU)) {
          expect(rodzajUlepszenia(ADDON_DEFS[id]), `${id} (wymagania: ${wym})`).to.equal(rodzaj);
        }
      });

      it("dostępność nasadek: bliźniaki ze Sprzętu, reszta z progu ceny; przeróbka — brak", function () {
        expect(dostepnoscNasadki(ADDON_DEFS.noktowizor)).to.equal(15);
        expect(dostepnoscNasadki(ADDON_DEFS.termowizor)).to.equal(5);
        expect(dostepnoscNasadki(ADDON_DEFS.latarka)).to.equal(60);
        expect(dostepnoscNasadki(ADDON_DEFS["chwyt-przedni"]), "20 gb").to.equal(50);
        expect(dostepnoscNasadki(ADDON_DEFS.dwojnog), "30 gb").to.equal(30);
        expect(dostepnoscNasadki(ADDON_DEFS.kolimator), "50 gb").to.equal(30);
        expect(dostepnoscNasadki(ADDON_DEFS.powiekszalnik), "60 gb").to.equal(15);
        expect(dostepnoscNasadki(ADDON_DEFS.tlumik), "przeróbka").to.equal(null);
        for (const p of DOSTEPNOSC_NASADEK.progi.slice(0, -1)) expect(p.doCeny).to.be.a("number");
      });

      it("Osełka: przeróbka w NOE, towar pod Kobaltem (20 gb → 50%, kolumna Broń)", function () {
        const osełka = KATALOG.get("addon:naostrzenie");
        expect(rodzajUlepszenia(ADDON_DEFS.naostrzenie)).to.equal("przerobka");
        expect(rodzajUlepszenia(ADDON_DEFS.naostrzenie, { kobalt: true })).to.equal("nasadka");
        expect(towarHandlu(osełka), "NOE").to.equal(false);
        expect(towarHandlu(osełka, { kobalt: true }), "WKK").to.equal(true);
        expect(dostepnosc("addon:naostrzenie"), "NOE").to.equal(null);
        expect(dostepnosc("addon:naostrzenie", { kobalt: true }), "WKK").to.equal(50);
        expect(kategoriaCenowa(osełka), "NOE: usługa").to.equal("uslugi");
        expect(kategoriaCenowa(osełka, { kobalt: true }), "WKK: towar").to.equal("bron");
      });

      it("kolumna cen ulepszeń: nasadka — Broń, optyka i elektronika — Elektronika, przeróbka — Usługi speców", function () {
        expect(kategoriaCenowa(KATALOG.get("addon:dwojnog"))).to.equal("bron");
        expect(kategoriaCenowa(KATALOG.get("addon:celownik-optyczny"))).to.equal("elektronika");
        expect(kategoriaCenowa(KATALOG.get("addon:noktowizor"))).to.equal("elektronika");
        expect(kategoriaCenowa(KATALOG.get("addon:tlumik"))).to.equal("uslugi");
      });

      it("fachowiec (D33): rusznikarz u Broni w miasteczku i mieście; kto robi którą przeróbkę", function () {
        expect(fachowiecDomyslny({ rodzaj: "miasto", kategorie: ["bron"] })).to.equal("rusznikarz");
        expect(fachowiecDomyslny({ rodzaj: "wioska", kategorie: ["bron"] })).to.equal(null);
        expect(fachowiecDomyslny({ rodzaj: "miasto", kategorie: ["leki"] })).to.equal(null);
        expect(fachowiecRobi("rusznikarz", ADDON_DEFS.tlumik)).to.equal(true);
        expect(fachowiecRobi("rusznikarz", ADDON_DEFS.przekucie)).to.equal(false);
        expect(fachowiecRobi("kowal", ADDON_DEFS.przekucie)).to.equal(true);
        expect(fachowiecRobi("kowal", ADDON_DEFS.szoker)).to.equal(false);
        expect(fachowiecRobi("elektronik", ADDON_DEFS.szoker)).to.equal(true);
      });
    });

    describe("Cena i dostępność tutaj (U2)", function () {
      it("przykład z s. 43: k100 58, CHA 12 → 46 ≤ 50 — ktoś ma; w Hegemonii broń za 200%", function () {
        const z = wynikZamowienia({ k100: 58, cha: 12, prog: 50, nazwa: "UZI" });
        expect(z.wynik).to.equal(46);
        expect(z.jest).to.equal(true);
        expect(z.opis).to.equal("UZI: k100 58 − CHA 12 = 46 ≤ 50 — ktoś ma");
        const uzi = KATALOG.get("weapon:uzi");
        expect(cenaTutaj(uzi, { region: "hegemonia" }).cena, "podwójna cena UZI").to.equal(uzi.cena * 2);
        expect(wynikZamowienia({ k100: 63, cha: 12, prog: 50 }).jest, "51 > 50").to.equal(false);
      });

      it("dostępność tutaj: lokalizacja, przycięcie 0–100, Gambling we krwi +5 tylko w zamówieniu", function () {
        const uzi = KATALOG.get("weapon:uzi"); // tabela s. 122: 60% (przykład z s. 43 podaje 50%)
        expect(dostepnoscTutaj(uzi, { rodzaj: "miasteczko" }).prog).to.equal(60);
        expect(dostepnoscTutaj(uzi, { rodzaj: "miasto" }).prog).to.equal(70);
        expect(dostepnoscTutaj(uzi, { rodzaj: "wioska" }).prog).to.equal(30);
        expect(dostepnoscTutaj(uzi, { rodzaj: "dzicz" }).prog).to.equal(10);
        const koc = { ref: "x", kategoria: "sprzet", dostepnosc: 100, wynik: "item" };
        expect(dostepnoscTutaj(koc, { rodzaj: "miasto" }).prog, "przycięte do 100").to.equal(100);
        const rzadki = { ref: "y", kategoria: "sprzet", dostepnosc: 5, wynik: "item" };
        expect(dostepnoscTutaj(rzadki, { rodzaj: "dzicz" }).prog, "przycięte do 0").to.equal(0);
        const zPremia = dostepnoscTutaj(uzi, { rodzaj: "miasteczko", premie: premieZamowienia({ gamblingWeKrwi: true }) });
        expect(zPremia.prog).to.equal(65);
        expect(zPremia.rozklad.map(r => r.etap)).to.include("premia");
      });

      it("dostępność 0 w tabeli: nie ma w handlu — ani CHA, ani lokalizacja tego nie zmienia", function () {
        const p = dostepnoscTutaj(KATALOG.get("ammo:pogromca-kwas"), { rodzaj: "miasto" });
        expect(p.nigdy).to.equal(true);
        expect(wynikZamowienia({ k100: 1, cha: 20, prog: p.prog, nigdy: p.nigdy }).jest).to.equal(false);
        expect(towarHandlu(KATALOG.get("ammo:pogromca-kwas"))).to.equal(false);
      });

      it("stan i skup: zepsuty za ½, skup NOE 100%, WKK 50%; rozkład ma linię na etap", function () {
        const uzi = KATALOG.get("weapon:uzi");
        expect(skupDomyslny()).to.equal(1);
        expect(skupDomyslny({ kobalt: true })).to.equal(0.5);
        const noe = cenaTutaj(uzi, { region: "vegas", skup: skupDomyslny() });
        expect(noe.cena, "Vegas broń 150%, skup 100%").to.equal(75);
        const wkk = cenaTutaj(uzi, { region: "vegas", skup: skupDomyslny({ kobalt: true }), stan: "zepsuty" });
        expect(wkk.cena, "×1,5 ×½ ×½").to.equal(18.75);
        expect(wkk.rozklad.map(r => r.etap)).to.deep.equal(["podrecznik", "region", "stan", "skup"]);
      });

      it("kolumny: paliwo z tagu, surowce wg D8, sprzęt bez mnożnika", function () {
        expect(kategoriaCenowa(KATALOG.get("raw:paliwo-dobre"))).to.equal("paliwo");
        expect(cenaTutaj(KATALOG.get("raw:paliwo-dobre"), { region: "teksas" }).cena, "Teksas paliwo 25%").to.equal(18.75);
        expect(kategoriaCenowa({ surowiec: "CH" })).to.equal("prochy");
        expect(kategoriaCenowa({ surowiec: "MK" })).to.equal("mechanika");
        expect(kategoriaCenowa({ surowiec: "MO" })).to.equal("zywnosc");
        expect(kategoriaCenowa(KATALOG.get("raw:lopata"))).to.equal(null);
        expect(cenaTutaj(KATALOG.get("raw:lopata"), { region: "posterunek" }).cena).to.equal(5);
      });

      it("ilość u handlarza (s. 43): wielorazowy 1, jednorazowy 2k4, amunicja 3k20", function () {
        expect(iloscRegula(KATALOG.get("weapon:uzi"))).to.equal("1");
        expect(iloscRegula(KATALOG.get("chemia:medpak"))).to.equal("2d4");
        expect(iloscRegula(KATALOG.get("ammo:9mm"))).to.equal("3d20");
        expect(iloscRegula(KATALOG.get("ammo:strzala"))).to.equal("3d20");
      });

      it("limit transakcji (s. 44): ⌈transakcje ÷ PB⌉ godzin, RO za każdą po pierwszej, Gambling we krwi bez RO", function () {
        expect(godzinyGamblingu({ transakcje: 0, pb: 2 })).to.equal(0);
        expect(godzinyGamblingu({ transakcje: 2, pb: 2 })).to.equal(1);
        expect(godzinyGamblingu({ transakcje: 3, pb: 2 })).to.equal(2);
        expect(potrzebaRO({ transakcje: 2, pb: 2 })).to.equal(0);
        expect(potrzebaRO({ transakcje: 3, pb: 2 })).to.equal(1);
        expect(potrzebaRO({ transakcje: 5, pb: 2, juzRzucone: 1 })).to.equal(1);
        expect(potrzebaRO({ transakcje: 9, pb: 2, gamblingWeKrwi: true })).to.equal(0);
      });

      it("wycena oferty: suma podręcznikowa dla gracza i lokalna dla MG; waluta lokalna poza regionem — 0 albo pole MG", function () {
        const w = wycenaOferty([
          { wpis: KATALOG.get("weapon:uzi"), ilosc: 1 },
          { wpis: KATALOG.get("ammo:9mm"), ilosc: 20 },
          { nazwa: "Żeton Luxor", cena: 10, ilosc: 3, walutaLokalna: { region: "vegas" } }
        ], { region: "hegemonia", skup: 1 });
        expect(w.podrecznikowa).to.equal(50 + 40 + 30);
        expect(w.lokalna, "UZI 100 + 9 mm 80 + żetony 0").to.equal(180);
        expect(w.linie[2].poza).to.equal(true);
        expect(wartoscWalutyLokalnej({ cena: 10, walutaLokalna: { region: "vegas" } }, "vegas")).to.deep.equal({ wartosc: 10, poza: false });
        expect(wartoscWalutyLokalnej({ cena: 10, walutaLokalna: { region: "vegas" } }, "teksas", { wartoscPoza: 2 })).to.deep.equal({ wartosc: 2, poza: true });
      });
    });

    describe("Generator towaru (D29)", function () {
      it("to samo ziarno — ten sam towar; inne ziarno — inny", function () {
        const a = generujTowar({ katalog: KAT(), rodzaj: "miasteczko", kategorie: ["bron", "amunicja"], podstawy: true, rng: rngZZiarna("Bazar") });
        const b = generujTowar({ katalog: KAT(), rodzaj: "miasteczko", kategorie: ["bron", "amunicja"], podstawy: true, rng: rngZZiarna("Bazar") });
        const c = generujTowar({ katalog: KAT(), rodzaj: "miasteczko", kategorie: ["bron", "amunicja"], podstawy: true, rng: rngZZiarna("Inny") });
        expect(a).to.deep.equal(b);
        expect(a).to.not.deep.equal(c);
      });

      it("liczba miejsc z rodzaju miejsca; ok. 80% z kategorii głównych; przeróbek ani Osełki (NOE) nie ma", function () {
        for (const rodzaj of ["dzicz", "wioska", "miasteczko", "miasto"]) {
          const g = generujTowar({ katalog: KAT(), rodzaj, kategorie: ["bron"], rng: rngZZiarna(`x-${rodzaj}`) });
          expect(g.towar.length, rodzaj).to.be.at.most(LOKALIZACJE[rodzaj].miejsca);
        }
        const g = generujTowar({ katalog: KAT(), rodzaj: "miasto", kategorie: ["bron", "pancerze"], rng: rngZZiarna("udzial") });
        expect(g.towar.length).to.equal(25);
        const glowne = g.towar.filter(t => ["bron", "pancerze"].includes(t.grupa)).length;
        expect(glowne, "20 z 25").to.equal(20);
        for (let i = 0; i < 50; i++) {
          const x = generujTowar({ katalog: KAT(), rodzaj: "miasto", kategorie: ["ulepszenia"], rng: rngZZiarna(i) });
          for (const t of x.towar.filter(t => t.ref.startsWith("addon:"))) {
            expect(rodzajUlepszenia(ADDON_DEFS[t.ref.slice(6)]), `${t.ref} na liście`).to.equal("nasadka");
          }
        }
      });

      it("pod Kobaltem Osełka bywa na liście; w NOE nigdy", function () {
        let wkk = 0, noe = 0;
        for (let i = 0; i < 200; i++) {
          if (generujTowar({ katalog: KAT(), rodzaj: "miasto", kategorie: ["ulepszenia"], kobalt: true, rng: rngZZiarna(i) }).towar.some(t => t.ref === "addon:naostrzenie")) wkk++;
          if (generujTowar({ katalog: KAT(), rodzaj: "miasto", kategorie: ["ulepszenia"], rng: rngZZiarna(i) }).towar.some(t => t.ref === "addon:naostrzenie")) noe++;
        }
        expect(noe).to.equal(0);
        expect(wkk).to.be.above(0);
      });

      it("ilości wg s. 43: wielorazowe 1, jednorazowe 2–8, amunicja 3–60", function () {
        for (let i = 0; i < 30; i++) {
          for (const t of generujTowar({ katalog: KAT(), rodzaj: "miasto", kategorie: ["amunicja", "leki"], rng: rngZZiarna(`il-${i}`) }).towar) {
            const r = iloscRegula(KATALOG.get(t.ref));
            const [lo, hi] = r === "3d20" ? [3, 60] : r === "2d4" ? [2, 8] : [1, 1];
            expect(t.ilosc, `${t.ref} ${r}`).to.be.within(lo, hi);
          }
        }
      });

      it("analitycznie, dla każdej pozycji katalogu: szansa na liście ≤ dostępność tutaj < szansa zamówienia", function () {
        const katalog = KAT();
        for (const rodzaj of ["dzicz", "miasteczko", "miasto"]) {
          for (const w of katalog) {
            if (!towarHandlu(w)) continue;
            const d = dostepnoscTutaj(w, { rodzaj });
            const s = szansaNaLiscie(w, { katalog, rodzaj, kategorie: [grupaTowaru(w)] });
            expect(s.gorna, `${w.ref} ${rodzaj}`).to.be.at.most(d.prog / 100);
            expect(s.szacunek, `${w.ref} ${rodzaj}`).to.be.at.most(s.gorna);
            if (d.prog < 100) expect(szansaZamowienia(d.prog, 1), `${w.ref} ${rodzaj}, CHA 1`).to.be.above(s.gorna);
          }
        }
      });

      it("w 10 000 losowań: UZI na liście sklepu z bronią rzadziej niż jego dostępność, a dużo rzadziej w wielobranżowym", function () {
        this.timeout(120000);
        const katalog = KAT();
        let bron = 0, wielo = 0;
        const N = 10000;
        for (let i = 0; i < N; i++) {
          if (generujTowar({ katalog, rodzaj: "miasteczko", kategorie: ["bron"], rng: rngZZiarna(`b${i}`) }).towar.some(t => t.ref === "weapon:uzi")) bron++;
          if (i % 5 === 0 && generujTowar({ katalog, rodzaj: "miasteczko", kategorie: ["zywnosc", "rozne", "narzedzia"], rng: rngZZiarna(`w${i}`) }).towar.some(t => t.ref === "weapon:uzi")) wielo++;
        }
        const pBron = bron / N;
        const pWielo = wielo / (N / 5);
        const d = dostepnoscTutaj(KATALOG.get("weapon:uzi"), { rodzaj: "miasteczko" }).prog / 100;
        expect(pBron, "sklep z bronią").to.be.below(d);
        expect(pBron, "sklep z bronią < zamówienie przy CHA 1").to.be.below(szansaZamowienia(d * 100, 1));
        expect(pWielo, "wielobranżowy").to.be.below(pBron / 3);
        const s = szansaNaLiscie(KATALOG.get("weapon:uzi"), { katalog, rodzaj: "miasteczko", kategorie: ["bron"] });
        expect(Math.abs(pBron - s.szacunek), `szacunek ${s.szacunek.toFixed(3)} vs ${pBron.toFixed(3)}`).to.be.below(0.05);
      });

      it("obraz handlarza (§7.23): dzicz — obwoźny, wioska — barman, dalej z kategorii głównej", function () {
        expect(obrazHandlarza({ rodzaj: "dzicz", kategorie: ["bron"] })).to.equal("obwozny");
        expect(obrazHandlarza({ rodzaj: "wioska", kategorie: ["bron"] })).to.equal("barman");
        expect(obrazHandlarza({ rodzaj: "miasto", kategorie: ["leki"] })).to.equal("apteka");
        expect(obrazHandlarza({ rodzaj: "miasto", kategorie: [] })).to.equal("wielobranzowy");
      });
    });
  }, { displayName: "Neuroshima: Handel — czyste zasady (M5)" });
}
