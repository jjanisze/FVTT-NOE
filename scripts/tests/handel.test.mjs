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
        const [zeton, zwykly, zFlaga] = await a.createEmbeddedDocuments("Item", [
          buildZetonLuxorItemData({ quantity: 3 }),
          { name: "Kapsel", type: "loot" },
          { name: "Dolar NY", type: "loot", flags: { [MODULE_ID]: { walutaLokalna: { region: "nowy-jork" } } } }
        ]);
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
