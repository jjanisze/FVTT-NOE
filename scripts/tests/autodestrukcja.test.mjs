/**
 * Neuroshima 5e — autodestrukcja maszyn (PLAN_m5_postoj.md E9, warstwy 1 i 5).
 *
 * Dane z generatora dla wszystkich maszyn z cechą (U21), odczyt cechy maszyny spoza Bestiariusza, k100 w ukryciu
 * (bez wybuchu / odliczanie, poza walką — [Wybuch] u MG), odliczanie na początku rundy w prawdziwej walce (raz na
 * rundę, U22), wybuch: stan, `dead`, zniszczone surowce; wrak żetonu i przywrócenie (U23); awaria 20 → karta
 * „Śmierć” potwierdzona → wybuch. Ślad i karta wybuchu na mapie oglądanej przez MG — e2e `autodestrukcja`.
 */

import { MODULE_ID, scratchActor, scratchCleanup, walkaTestowa, waitFor } from "./helpers.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";
import { szansaZNazwy } from "../config/autodestrukcja-rules.mjs";
import {
  daneAutodestrukcji, stanAutodestrukcji, rzutAutodestrukcji, wybuch, wrak, przywrocZeton, detonacjaZAkcji
} from "../combat/autodestrukcja.mjs";
import { zaproponujSmierc, potwierdzSmierc } from "../combat/umieranie.mjs";

const maszyna = (id, dane = {}) => scratchActor(foundry.utils.mergeObject({
  name: `[Quench] ${id}`, type: "npc",
  system: { attributes: { hp: { value: 0, max: 30 } }, traits: { size: "med" } },
  flags: { [MODULE_ID]: { bestiary: { id } } }
}, dane, { inplace: false }));

export function registerAutodestrukcjaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.autodestrukcja`, context => {
    const { describe, it, expect, after, afterEach } = context;
    const wiadomosci = [];
    let hook = null;
    const lap = () => { hook = Hooks.on("createChatMessage", m => wiadomosci.push(m)); };
    const sprzatanie = [];
    afterEach(async () => {
      if (hook !== null) Hooks.off("createChatMessage", hook);
      hook = null;
      for (const m of wiadomosci.splice(0)) if (game.messages.get(m.id)) await m.delete();
      while (sprzatanie.length) await sprzatanie.pop()();
    });
    after(() => scratchCleanup());

    describe("Dane (U21)", function () {
      it("każda maszyna z cechą „Autodestrukcja (N%)” ma strukturę z generatora zgodną z nazwą", function () {
        const z = Object.values(BESTIARY).filter(c => !c.homebrew)
          .flatMap(c => c.features.filter(f => szansaZNazwy(f.name) !== null).map(f => ({ c, f })));
        expect(z.length, "osiem maszyn (RAW)").to.equal(8);
        for (const { c, f } of z) {
          const a = f.automation;
          expect(a?.kind, c.id).to.equal("autodestrukcja");
          expect(a.szansa, c.id).to.equal(szansaZNazwy(f.name));
          expect(a.rzut).to.deep.equal({ cecha: "dex", st: 15 });
          expect(a.promien, c.id).to.be.oneOf([1.5, 3, 6, 9]);
          expect(a.obrazenia[0].wzor, c.id).to.match(/^\d+d6$/);
          expect(a.stany).to.deep.equal(["prone", "deafened"]);
        }
        expect(BESTIARY.juggernaut.features.find(f => f.automation?.kind === "autodestrukcja").automation).to.include({ szansa: 100, promien: 9 });
      });

      it("Kurczak wybuchowy (własny MG): Autodestrukcja 100% z jego statblocku; akcja Detonacja wysadza od razu", async function () {
        const k = BESTIARY["kurczak-wybuchowy"];
        expect(k?.homebrew, "z Podrecznik/Bestiariusz/Własne").to.be.true;
        expect(k.features.find(f => f.automation?.kind === "autodestrukcja").automation)
          .to.include({ szansa: 100, promien: 3 }).and.deep.include({ rzut: { cecha: "dex", st: 13 } });
        const det = k.features.find(f => f.automation?.kind === "detonacja");
        expect(det?.section).to.equal("actions");
        const actor = await maszyna("kurczak-wybuchowy", { system: { attributes: { hp: { value: 12, max: 12 } } } });
        lap();
        const item = { flags: { [MODULE_ID]: { bestiary: { automation: det.automation } } } };
        await detonacjaZAkcji({ item, actor });
        expect(stanAutodestrukcji(actor)?.stan, "bez k100 i odliczania").to.equal("wybuch");
        expect(await detonacjaZAkcji({ item: { flags: {} }, actor }), "inna akcja — nic").to.equal(null);
      });

      it("maszyna z Bestiariusza po id; maszyna MG — z nazwy i opisu cechy; bez cechy — null", async function () {
        expect(daneAutodestrukcji(await maszyna("gladiator"))).to.include({ szansa: 80, promien: 3 });
        const wlasna = await scratchActor({ name: "[Quench] Złom", type: "npc", items: [{
          name: "Autodestrukcja (40%)", type: "feat",
          system: { description: { value: "<p>RO na Zręczność o ST 13, w promieniu 6 m. Porażka: 21 (6k6) obrażeń wybuchowych. Sukces: połowa obrażeń.</p>" } }
        }] });
        const d = daneAutodestrukcji(wlasna);
        expect(d).to.include({ szansa: 40, promien: 6, polowa: true });
        expect(d.rzut).to.deep.equal({ cecha: "dex", st: 13 });
        expect(d.obrazenia[0].wzor).to.equal("6d6");
        expect(daneAutodestrukcji(await maszyna("bit-boys"))).to.equal(null);
      });
    });

    describe("Przebieg", function () {
      it("k100 w ukryciu: ponad szansą — bez wybuchu; w szansie poza walką — odliczanie i [Wybuch] u MG; szepty bez rzutów", async function () {
        lap();
        const a = await maszyna("gladiator");
        expect((await rzutAutodestrukcji(a, { k100: 81 })).wybuch).to.equal(false);
        expect(stanAutodestrukcji(a)).to.include({ stan: "bez", wynik: 81 });
        const b = await maszyna("gladiator");
        const r = await rzutAutodestrukcji(b, { k100: 80, k4: 3 });
        expect(r).to.include({ wybuch: true, rundy: 3 });
        expect(stanAutodestrukcji(b)).to.include({ stan: "odlicza", rundy: 3, poza: true });
        const szept = wiadomosci.find(m => m.whisper.length && /autodestrukcja!/.test(m.content));
        expect(szept.content).to.include("autodestrukcjaWybuch");
        expect(wiadomosci.filter(m => m.whisper.length).every(m => !m.rolls.length), "szepty MG bez rzutów").to.equal(true);
        expect(wiadomosci.some(m => !m.whisper.length && /6 s wybuch/.test(m.content)), "linia dla stołu").to.equal(true);
      });

      it("w walce: tik na początku każdej rundy, raz (cofnięcie i ponowne „naprzód” nie tyka); 0 — wybuch", async function () {
        this.timeout(20000);
        lap();
        const pc = await scratchActor();
        const g = await maszyna("gladiator");
        const w = await walkaTestowa([pc, g], { nazwa: "autodestrukcja" });
        sprzatanie.push(w.sprzatnij);
        const ogladana = canvas.scene;
        const naOgladanej = () => (ogladana?.regions.size ?? 0) + (ogladana?.drawings.size ?? 0);
        const przedOgladana = naOgladanej();
        await rzutAutodestrukcji(g, { k100: 5, k4: 2 });
        expect(stanAutodestrukcji(g)).to.include({ stan: "odlicza", rundy: 2, poza: false });
        await w.combat.nextRound();
        await waitFor(() => stanAutodestrukcji(g).rundy === 1, { label: "tik rundy 2" });
        await w.combat.previousRound();
        await w.combat.nextRound();
        await new Promise(r => setTimeout(r, 400));
        expect(stanAutodestrukcji(g).rundy, "ta sama runda nie tyka drugi raz").to.equal(1);
        await w.combat.nextRound();
        await waitFor(() => stanAutodestrukcji(g).stan === "wybuch", { label: "wybuch" });
        await waitFor(() => w.scena.tokens.contents.some(t => /\(wrak\)$/.test(t.name)), { label: "wrak" });
        expect(stanAutodestrukcji(g).zniszczone).to.deep.equal(["CE", "CH", "CZ"]);
        // `wybuch` nadaje „martwy” dopiero po zapisie wraku — nazwa wraku bywa widoczna przed stanem (ze Splatterem częściej).
        await waitFor(() => g.statuses.has("dead"), { label: "martwy po wybuchu" });
        expect(wiadomosci.some(m => m.content.includes("neuro-explosive-card")), "karta wybuchu").to.equal(true);
        await waitFor(() => w.scena.drawings.filter(d => d.flags?.[MODULE_ID]?.explosive).length === 1, { label: "ślad wybuchu" });
        await new Promise(r => setTimeout(r, 500));
        expect(w.scena.drawings.filter(d => d.flags?.[MODULE_ID]?.explosive).length, "jeden ślad, na scenie maszyny").to.equal(1);
        expect(naOgladanej(), "nic na scenie, którą MG ogląda (zdjęcie flagi aktora syntetycznego)").to.equal(przedOgladana);
        const zeton = w.zetony.find(t => t.actorId === g.id);
        expect(w.scena.tokens.get(zeton.id).name).to.match(/\(wrak\)$/);
      });

      it("wrak (U23): nazwa i obraz/odcień żetonu, oryginał w fladze; [Przywróć] czyści", async function () {
        const g = await maszyna("lowca");
        const w = await walkaTestowa([g], { nazwa: "wrak" });
        sprzatanie.push(w.sprzatnij);
        const t = w.zetony[0];
        const src = t.texture.src;
        await wrak(t, "sm");
        expect(t.name).to.match(/\(wrak\)$/);
        expect(t.getFlag(MODULE_ID, "wrak").src).to.equal(src);
        expect(t.texture.src !== src || t.texture.tint?.toString?.() !== "#ffffff", "obraz wraku albo przyciemnienie").to.equal(true);
        expect(await przywrocZeton(t)).to.equal(true);
        expect(t.texture.src).to.equal(src);
        expect(t.name).to.not.match(/wrak/);
        expect(t.getFlag(MODULE_ID, "wrak")).to.equal(undefined);
      });

      it("awaria 20: karta „Śmierć — autodestrukcja” potwierdzona przez MG → wybuch od razu, bez k100", async function () {
        this.timeout(10000);
        lap();
        const g = await maszyna("mobsprzet");
        const karta = await zaproponujSmierc(g, "autodestrukcja", { pozycja: 20 });
        await potwierdzSmierc(karta);
        await new Promise(r => setTimeout(r, 300));
        expect(stanAutodestrukcji(g)?.stan).to.equal("wybuch");
        expect(wiadomosci.some(m => m.whisper.length && /Wybuch: \[Quench\] mobsprzet/.test(m.content))).to.equal(true);
        await wybuch(g);
        expect(wiadomosci.filter(m => /Wybuch: \[Quench\] mobsprzet/.test(m.content)).length, "drugi wybuch nic nie robi").to.equal(1);
      });
    });
  });
}
