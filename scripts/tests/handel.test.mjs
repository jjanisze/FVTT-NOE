/**
 * Neuroshima 5e — handel na prawdziwych dokumentach (PLAN_m5_postoj.md E1, warstwa 5).
 *
 * Miejsce postoju na aktorze drużyny (zapis, normalizacja, knajpa z rodzaju), miejsce postaci przez jej
 * drużynę i — bez drużyny — przez scenę, waluta lokalna (flaga, Żeton Luxor bez flagi), portfel (suma gb,
 * audyt bez karty), owinięcie nagrody w gb, rozpoznanie przedmiotu w katalogu dla Cennika.
 * Okno Cennika, karty i kliknięcia — warstwa 6 (`dev/e2e/suites/handel.mjs`).
 */

import { MODULE_ID, scratchActor, scratchGroupActor, scratchCleanup, stub } from "./helpers.mjs";
import { getMiejsce, setMiejsce, miejsceAktora, normalizujMiejsce, opisMiejsca, FLAGA_SCENY } from "../postoj/miejsce.mjs";
import { walutaLokalna, gbWPortfelu, audytPortfela } from "../postoj/portfel.mjs";
import { gamblingWeKrwi, wartoscCharyzmy } from "../postoj/zamowienie.mjs";
import { buildZetonLuxorItemData } from "../wkk/items/zeton-luxor.mjs";
import { refDlaPrzedmiotu } from "../production/wynik.mjs";

export function registerHandelTests(quench) {
  quench.registerBatch(`${MODULE_ID}.handel`, context => {
    const { describe, it, expect, after, afterEach } = context;
    const przywroc = [];
    afterEach(() => { while (przywroc.length) przywroc.pop()(); });
    after(() => scratchCleanup());

    describe("Miejsce postoju (U1)", function () {
      it("zapis na drużynie; knajpa domyślnie od wioski; opis dla graczy bez mnożników", async function () {
        const g = await scratchGroupActor();
        expect(getMiejsce(g).rodzaj).to.equal(null);
        await setMiejsce(g, { nazwa: "Las Vegas", rodzaj: "miasto", region: "vegas" });
        const m = getMiejsce(g);
        expect(m).to.include({ nazwa: "Las Vegas", rodzaj: "miasto", region: "vegas", knajpa: true });
        expect(opisMiejsca(m)).to.equal("Las Vegas (Miasto · Vegas)");
        expect(normalizujMiejsce({ rodzaj: "dzicz" }).knajpa).to.equal(false);
        expect(normalizujMiejsce({ rodzaj: "zle", region: "nibylandia" })).to.include({ rodzaj: null, region: null });
      });

      it("postać stoi tam, gdzie jej drużyna; bez drużyny — miejsce domyślne aktywnej sceny", async function () {
        const a = await scratchActor();
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        await setMiejsce(g, { rodzaj: "wioska", region: "teksas" });
        const r = miejsceAktora(a);
        expect(r.zrodlo).to.equal("druzyna");
        expect(r.miejsce).to.include({ rodzaj: "wioska", region: "teksas" });
        const samotny = await scratchActor({ name: "[Quench] samotnik" });
        const scena = { getFlag: (mod, k) => (mod === MODULE_ID && k === FLAGA_SCENY ? { rodzaj: "dzicz", region: "pustynia" } : null) };
        przywroc.push(stub(game.scenes, "active", scena));
        const s = miejsceAktora(samotny);
        expect(s.zrodlo).to.equal("scena");
        expect(s.miejsce).to.include({ rodzaj: "dzicz", region: "pustynia" });
      });
    });

    describe("Waluty lokalne i portfel (U41, U43)", function () {
      it("waluta lokalna z flagi; Żeton Luxor to waluta Vegas także bez flagi", async function () {
        const a = await scratchActor();
        const utworzone = await a.createEmbeddedDocuments("Item", [
          buildZetonLuxorItemData({ quantity: 3 }),
          { name: "Kapsel", type: "loot" },
          { name: "Dolar NY", type: "loot", flags: { [MODULE_ID]: { walutaLokalna: { region: "nowy-jork" } } } }
        ]);
        // Kolejność wyniku `createEmbeddedDocuments` nie jest stała — po nazwie, nie po pozycji.
        const zwykly = utworzone.find(i => i.name === "Kapsel");
        const zFlaga = utworzone.find(i => i.name === "Dolar NY");
        const zeton = utworzone.find(i => i !== zwykly && i !== zFlaga);
        expect(walutaLokalna(zeton)).to.deep.equal({ region: "vegas" });
        expect(walutaLokalna(zwykly)).to.equal(null);
        expect(walutaLokalna(zFlaga)).to.deep.equal({ region: "nowy-jork" });
      });

      it("portfel: suma gb i audyt (bez karty) wskazują aktora z gamblami", async function () {
        const a = await scratchActor({ name: "[Quench] bogacz", system: { currency: { gb: 25 } } });
        expect(gbWPortfelu(a)).to.equal(25);
        const lista = await audytPortfela({ karta: false });
        expect(lista.find(x => x.aktor === a)?.gb).to.equal(25);
      });

      it("nagroda w gb przechodzi (ostrzeżenie, nie blokada) — owinięcie jest na miejscu", function () {
        expect(dnd5e.applications.Award.awardCurrency.neuroPortfel).to.equal(true);
      });
    });

    describe("Wymiana bez klonów (U8) i przeróbki (D31)", function () {
      const sprzatnij = [];
      afterEach(async () => {
        while (sprzatnij.length) await sprzatnij.pop()();
      });
      const _wiadomosci = () => {
        const przed = new Set(game.messages.map(m => m.id));
        sprzatnij.push(async () => {
          const nowe = game.messages.filter(m => !przed.has(m.id)).map(m => m.id);
          if (nowe.length) await ChatMessage.deleteDocuments(nowe);
        });
      };

      it("przerwanie po utworzeniu u celu zostawia dwa egzemplarze, nigdy zero", async function () {
        _wiadomosci();
        const { otworzWymiane, dodajDaje, dodajDostaje, zatwierdzWymiane } = await import("../postoj/wymiana.mjs");
        const gracz = await scratchActor({ name: "[Quench] kupiec" });
        const handlarz = await scratchActor({ name: "[Quench] handlarz", type: "npc", flags: { [MODULE_ID]: { handlarz: { miejsce: { rodzaj: "miasteczko" } } } } });
        const [moj] = await gracz.createEmbeddedDocuments("Item", [{ name: "Kłódka testowa", type: "loot", system: { price: { value: 10 } } }]);
        const [jego] = await handlarz.createEmbeddedDocuments("Item", [{ name: "Lina testowa", type: "loot", system: { price: { value: 10 } } }]);
        await otworzWymiane(gracz, handlarz);
        await dodajDaje(gracz, moj);
        await dodajDostaje(gracz, { typ: "towar", uuid: jego.uuid, nazwa: jego.name, ilosc: 1 });
        // Źródło nie daje się usunąć — wymiana pada po utworzeniu kopii u handlarza.
        przywroc.push(stub(moj, "delete", async () => { throw new Error("przerwane"); }));
        let blad = null;
        try { await zatwierdzWymiane(gracz); } catch (e) { blad = e; }
        expect(blad?.message).to.equal("przerwane");
        const wszystkie = [...gracz.items, ...handlarz.items];
        expect(wszystkie.filter(i => i.name === "Kłódka testowa").length, "kłódka u obu").to.equal(2);
        expect(wszystkie.filter(i => i.name === "Lina testowa").length, "lina u obu").to.equal(2);
      });

      it("pełna wymiana: przedmioty zmieniają właściciela, bez duplikatu; stos dzieli się wg ilości", async function () {
        _wiadomosci();
        const { otworzWymiane, dodajDaje, dodajDostaje, zatwierdzWymiane, wymiana } = await import("../postoj/wymiana.mjs");
        const gracz = await scratchActor({ name: "[Quench] kupiec 2" });
        const handlarz = await scratchActor({ name: "[Quench] handlarz 2", type: "npc", flags: { [MODULE_ID]: { handlarz: { miejsce: { rodzaj: "miasteczko" } } } } });
        const [moj] = await gracz.createEmbeddedDocuments("Item", [{ name: "Zapałki testowe", type: "consumable", system: { quantity: 5, price: { value: 1 } } }]);
        const [jego] = await handlarz.createEmbeddedDocuments("Item", [{ name: "Naboje testowe", type: "consumable", system: { quantity: 30, price: { value: 1 } } }]);
        await otworzWymiane(gracz, handlarz);
        await dodajDaje(gracz, moj, 2);
        await dodajDostaje(gracz, { typ: "towar", uuid: jego.uuid, nazwa: jego.name, ilosc: 12, max: 30 });
        await zatwierdzWymiane(gracz);
        expect(wymiana(gracz)).to.equal(null);
        expect(gracz.items.getName("Zapałki testowe").system.quantity).to.equal(3);
        expect(handlarz.items.getName("Zapałki testowe").system.quantity).to.equal(2);
        expect(gracz.items.getName("Naboje testowe").system.quantity).to.equal(12);
        expect(handlarz.items.getName("Naboje testowe").system.quantity).to.equal(18);
      });

      it("przeróbka niezgodna z bronią: bez montażu, ulepszenie trafia do ekwipunku (ostrzeżenie, nie blokada)", async function () {
        _wiadomosci();
        const { otworzWymiane, dodajPrzerobke, zatwierdzWymiane } = await import("../postoj/wymiana.mjs");
        const gracz = await scratchActor({ name: "[Quench] z maczetą" });
        const pack = game.packs.get(`${MODULE_ID}.bron`);
        const idx = await pack.getIndex();
        const maczeta = await pack.getDocument(idx.find(e => e.name === "Maczeta")._id);
        const [bron] = await gracz.createEmbeddedDocuments("Item", [game.items.fromCompendium(maczeta)]);
        await otworzWymiane(gracz, null, { zamowienie: true });
        przywroc.push(stub(ui.notifications, "warn", () => {}));
        await dodajPrzerobke(gracz, "tlumik", bron.uuid);
        const w = await zatwierdzWymiane(gracz);
        expect((bron.getFlag(MODULE_ID, "addons") ?? []).map(a => a.id)).to.not.include("tlumik");
        expect(gracz.items.some(i => i.getFlag(MODULE_ID, "ulepszenie") === "tlumik"), "tłumik w ekwipunku").to.equal(true);
        expect(w.uwagi.some(u => /nie zamontowano/.test(u))).to.equal(true);
      });
    });

    describe("Zamówienie: dane postaci (s. 43, 63)", function () {
      it("wartość Charyzmy (nie modyfikator) i Gambling we krwi z flagi zdolności albo nazwy", async function () {
        const a = await scratchActor({ system: { abilities: { cha: { value: 13 } } } });
        expect(wartoscCharyzmy(a)).to.equal(13);
        expect(gamblingWeKrwi(a)).to.equal(false);
        await a.createEmbeddedDocuments("Item", [{ name: "Coś", type: "feat", flags: { [MODULE_ID]: { originAbilityId: "gambling-we-krwi" } } }]);
        expect(gamblingWeKrwi(a)).to.equal(true);
      });

      it("Cennik rozpoznaje przedmiot z kompendium modułu w katalogu", async function () {
        const pack = game.packs.get(`${MODULE_ID}.bron`);
        const idx = await pack.getIndex();
        const uzi = idx.find(e => e.name === "UZI");
        const doc = await pack.getDocument(uzi._id);
        expect(await refDlaPrzedmiotu(doc)).to.equal("weapon:uzi");
      });
    });
  }, { displayName: "Neuroshima: Handel — miejsce, portfel, waluty (M5)" });
}
