/**
 * Neuroshima 5e — szabrowanie na prawdziwych dokumentach (PLAN_m5_postoj.md E8, warstwa 5).
 *
 * Ruina własna, pamięć ruin (powtórki), Ułatwienia (U11), start bez komplikacji → karta prośby do szukających,
 * z komplikacją → najpierw szept MG z odnośnikiem do Bestiariusza i [Kontynuuj]; rozliczenie przez przekaźnik
 * (MG wykonuje od razu): ≥ 20 z naturalną 20 — podwójne surowce, losowy przedmiot, Fant; porażka — [Spróbuj: …]
 * dla innego szukającego; wszyscy po rzucie — karta MG z [Przesuń czas]. Okno i kliknięcia — e2e `szabrowanie`.
 */

import { MODULE_ID, scratchActor, scratchGroupActor, scratchCleanup } from "./helpers.mjs";
import { ruinaZ, pamiecRuin, powtorki, ulatwieniaSzabrowania, rozpocznijSzabrowanie, sprobujZaKogos } from "../postoj/szabrowanie.mjs";
import { doMG } from "../postoj/przekaznik.mjs";
import { gbOf } from "../actors/surowce-store.mjs";

export function registerSzabrowanieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.szabrowanie`, context => {
    const { describe, it, expect, after, afterEach } = context;
    const wiadomosci = [];
    let hook = null;
    const lap = () => { hook = Hooks.on("createChatMessage", m => wiadomosci.push(m)); };
    afterEach(async () => {
      if (hook !== null) Hooks.off("createChatMessage", hook);
      hook = null;
      for (const m of wiadomosci.splice(0)) if (game.messages.get(m.id)) await m.delete();
    });
    after(() => scratchCleanup());

    describe("Dane i pamięć", function () {
      it("ruina własna: pola MG, kości surowców, szansa w granicach 0–100", function () {
        const r = ruinaZ("wlasna", { label: "Bunkier", minuty: 90, komplikacje: 140, surowce: { CH: "2d8", MK: "" } });
        expect(r).to.include({ klucz: "wlasna", label: "Bunkier", minuty: 90, komplikacje: 100 });
        expect(r.surowce).to.deep.equal({ CZ: null, CH: "2d8", CE: null, MK: null });
        expect(ruinaZ("apteka").surowce.CH).to.equal("4d8");
      });

      it("Ułatwienia (U11): wykrywacz metalu — tylko Percepcja; Złomiarz — oba testy", async function () {
        const a = await scratchActor({ items: [{ name: "Wykrywacz metalu", type: "loot" }] });
        expect(ulatwieniaSzabrowania(a)).to.include({ prc: true, sle: false, wykrywacz: true, zlomiarz: false });
        const b = await scratchActor({ items: [{ name: "Śmieciarz", type: "feat" }] });
        expect(ulatwieniaSzabrowania(b), "„Śmieciarz” wpisany ręcznie — alias").to.include({ prc: true, sle: true, zlomiarz: true });
      });

      it("Ułatwienia (U11): Sztuczka Złomiarz z paczki — oba testy", async function () {
        const pack = game.packs.get(`${MODULE_ID}.sztuczki`);
        const doc = pack && (await pack.getDocuments()).find(d => d.getFlag(MODULE_ID, "sztuczka") === "zlomiarz");
        expect(doc, "Złomiarz w paczce sztuczki").to.exist;
        const a = await scratchActor({ items: [game.items.fromCompendium(doc)] });
        expect(ulatwieniaSzabrowania(a)).to.include({ prc: true, sle: true, wykrywacz: false, zlomiarz: true });
      });
    });

    describe("Przebieg", function () {
      it("bez komplikacji: karta prośby; ≥ 20 z nat. 20 — podwójnie, przedmiot, Fant; porażka — [Spróbuj]; koniec — karta MG", async function () {
        lap();
        const a = await scratchActor({ name: "[Quench] Szczur" });
        const b = await scratchActor({ name: "[Quench] Kret" });
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }, { actor: b.id }] } });
        const s = await rozpocznijSzabrowanie(g, { ruina: "magazyn", nazwa: "Magazyn testowy", przydzial: { [a.uuid]: ["CZ", "MK"], [b.uuid]: ["CH"] }, wymus: 0 });
        expect(s.minuty, "120 min ÷ 2").to.equal(60);
        const prosba = wiadomosci.find(m => m.type === "request" && m.system?.handler === "neuroSzabrowanie");
        expect(prosba, "karta prośby").to.exist;
        expect(prosba.system.targets.map(t => t.actor)).to.have.members([a.uuid, b.uuid]);

        const przedmiotyPrzed = a.items.size;
        await doMG("szabrowanieWynik", { grupa: g.uuid, sesja: s.id, aktor: a.uuid, total: 23, nat20: true });
        expect(gbOf(a, "CZ"), "4d10 × 2").to.be.at.least(8);
        expect(gbOf(a, "MK"), "4d20 × 2").to.be.at.least(8);
        expect(gbOf(a, "CH"), "nie jego rodzaj").to.equal(0);
        expect(a.items.some(i => i.getFlag(MODULE_ID, "fant")), "Fant za naturalną 20").to.equal(true);
        const kartaA = wiadomosci.find(m => m.speaker?.actor === a.id && /podwójnie/.test(m.content));
        expect(kartaA, "karta sukcesu").to.exist;
        expect(kartaA.rolls.length, "rzuty kości surowców na karcie").to.equal(2);
        const mg = wiadomosci.filter(m => m.whisper.length && /Szabrowanie: \[Quench\] Szczur/.test(m.content));
        expect(a.items.size - przedmiotyPrzed + mg.length, "losowy przedmiot albo karta MG (istota, pojazd)").to.be.at.least(2);

        await doMG("szabrowanieWynik", { grupa: g.uuid, sesja: s.id, aktor: b.uuid, total: 4, nat20: false });
        expect(gbOf(b, "CH")).to.equal(0);
        const porazka = wiadomosci.find(m => m.speaker?.actor === b.id && /nic/.test(m.content));
        expect(porazka.content, "inny szukający może spróbować CH").to.include(`data-aktor="${a.id}"`);
        expect(wiadomosci.some(m => m.whisper.length && /Szabrowanie zakończone/.test(m.content) && /szabrowanieCzas/.test(m.content))).to.equal(true);

        const r = pamiecRuin(g).find(x => x.nazwa === "Magazyn testowy");
        expect(r.proby.map(p => p.rodzaj).sort()).to.deep.equal(["CH", "CZ", "MK"]);
        expect(powtorki(g, "magazyn testowy", { [b.uuid]: ["CH"] }).length, "Kret już szukał tu chemikaliów").to.equal(1);
        expect(powtorki(g, "Magazyn testowy", { [b.uuid]: ["CE"] })).to.deep.equal([]);
        await doMG("szabrowanieWynik", { grupa: g.uuid, sesja: s.id, aktor: a.uuid, total: 23, nat20: false });
        expect(gbOf(a, "CH"), "drugi wynik tej samej osoby się nie liczy").to.equal(0);

        // [Spróbuj: Szczur] — chemikalia po porażce Kreta: nowa prośba tylko do niego i jego nowy wynik się liczy.
        const druga = await sprobujZaKogos(g, s.id, a.uuid, ["CH"]);
        expect(druga.system.targets.map(t => t.actor)).to.deep.equal([a.uuid]);
        await doMG("szabrowanieWynik", { grupa: g.uuid, sesja: s.id, aktor: a.uuid, total: 12, nat20: false });
        expect(gbOf(a, "CH"), "4d8 chemikaliów za Kreta").to.be.at.least(4);
        expect(wiadomosci.filter(m => /Szabrowanie zakończone/.test(m.content)).length, "jedna karta końca").to.equal(1);
      });

      it("z komplikacją: najpierw szept MG (bez rzutów) z odnośnikiem do Bestiariusza i [Kontynuuj]; prośba dopiero po nim", async function () {
        lap();
        const a = await scratchActor();
        const g = await scratchGroupActor({ system: { members: [{ actor: a.id }] } });
        const s = await rozpocznijSzabrowanie(g, { ruina: "piwnica", nazwa: "Piwnica", przydzial: { [a.uuid]: ["CZ"] }, wymus: 2 });
        expect(s.stan).to.equal("komplikacja");
        const szept = wiadomosci.find(m => /Komplikacja/.test(m.content));
        expect(szept.whisper.length).to.be.greaterThan(0);
        expect(szept.rolls.length, "szept MG bez rzutów").to.equal(0);
        expect(szept.content).to.match(/@UUID\[Compendium\.neuroshima-2026-overrides\.bestiariusz\.Actor\.[A-Za-z0-9]{16}\]/);
        expect(szept.content).to.include("szabrowanieKontynuuj");
        expect(wiadomosci.some(m => m.type === "request"), "prośba czeka na MG").to.equal(false);
        const uuid = /@UUID\[([^\]]+)\]/.exec(szept.content)[1];
        expect(await fromUuid(uuid), "aktor Bestiariusza istnieje").to.exist;
      });
    });
  });
}
