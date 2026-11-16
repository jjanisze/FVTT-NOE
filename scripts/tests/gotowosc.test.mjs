/**
 * Neuroshima 5e — panel gotowości do tury M8 (PLAN_m8_ruch_i_ekonomia_akcji §8.4, E8; §11 T44, T45).
 *
 * Warstwa 1: pozycja w widocznej kolejności (ukryci nie liczą się i nie zdradzają, pominięci pokonani), sygnały raz na
 * instancję tury (pierwsza obserwacja bez fałszywego startu, w pauzie bez świeżych, po wznowieniu najwyżej aktualny),
 * zegar minus pauzy, format i progi 30/60 s.
 * Warstwa 4: rdzeniowe „nextUp”/„yourTurn” wyciszone przy włączonym panelu; panel dla przypisanej postaci w prawdziwej
 * walce (za X → następny → twoja tura), zegar stoi w pauzie.
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, walkaTestowa } from "./helpers.mjs";
import * as G from "../config/gotowosc-data.mjs";
import { odswiez, gotowoscApi, __testing as T } from "../combat/gotowosc.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const k = (id, widoczny = true, pokonany = false) => ({ id, widoczny, pokonany });

export function registerGotowoscTests(quench) {
  quench.registerBatch(`${MODULE_ID}.gotowosc`, context => {
    const { describe, it, expect, after } = context;

    after(async () => {
      await scratchCleanup();
      T.reset();
      odswiez();
    });

    describe("Model (warstwa 1)", function () {
      it("T45: „za X” liczy widocznych przed tobą; ukryty nie liczy się; pokonany pominięty przy skipDefeated", function () {
        const kol = [k("a"), k("ukryty", false), k("b"), k("ja"), k("c")];
        expect(G.stanGotowosci(kol, 0, ["ja"])).to.include({ stan: "oczekiwanie", za: 2 });
        expect(G.stanGotowosci(kol, 2, ["ja"])).to.include({ stan: "nastepny", za: 1 });
        expect(G.stanGotowosci(kol, 3, ["ja"])).to.include({ stan: "tura", za: 0 });
        // Na turze ukrytego: następny jest „b”, ja — za 2 (ukrytego nie zdradzamy).
        expect(G.stanGotowosci(kol, 1, ["ja"])).to.include({ stan: "oczekiwanie", za: 2 });
        const pok = [k("a"), k("trup", true, true), k("ja")];
        expect(G.stanGotowosci(pok, 0, ["ja"], { skipDefeated: true }).stan).to.equal("nastepny");
        expect(G.stanGotowosci(pok, 0, ["ja"]).za).to.equal(2);
        expect(G.stanGotowosci(kol, 4, ["ja"]), "przez koniec rundy").to.include({ za: 3 });
        expect(G.stanGotowosci(kol, 0, []).stan, "bez podmiotu — nic").to.equal(null);
      });

      it("E8: kotwice M3/M4 — tura pominięta (koń w turze jeźdźca) nie liczy się i nie daje sygnału; pasażer z własną turą — liczy się", function () {
        const kol = [k("a"), k("jezdziec"), { ...k("kon"), pominiety: true }, k("pasazer"), k("ja")];
        expect(G.stanGotowosci(kol, 0, ["ja"]), "jeździec i pasażer — koń nie").to.include({ stan: "oczekiwanie", za: 3 });
        expect(G.stanGotowosci(kol, 1, ["ja"])).to.include({ stan: "oczekiwanie", za: 2 });
        expect(G.stanGotowosci(kol, 0, ["kon"]).stan, "własny koń z pominiętą turą — bez sygnału").to.equal(null);
      });

      it("T44: sygnał raz na instancję tury; pierwsza obserwacja bez startu; pauza — bez świeżych, po wznowieniu ten jeden", function () {
        const z = new Set();
        expect(G.sygnalDoZagrania({ stan: "tura", klucz: "w:1:ja" }, { zagrane: z, pierwsza: true }), "wejście w środku tury").to.equal(null);
        expect(G.sygnalDoZagrania({ stan: "tura", klucz: "w:1:ja" }, { zagrane: z })).to.equal(null);
        expect(G.sygnalDoZagrania({ stan: "nastepny", klucz: "w:2:b" }, { zagrane: z })).to.equal("nastepny");
        expect(G.sygnalDoZagrania({ stan: "nastepny", klucz: "w:2:b" }, { zagrane: z }), "rerender").to.equal(null);
        expect(G.sygnalDoZagrania({ stan: "tura", klucz: "w:2:ja" }, { zagrane: z, pauza: true }), "w pauzie").to.equal(null);
        expect(G.sygnalDoZagrania({ stan: "tura", klucz: "w:2:ja" }, { zagrane: z })).to.equal("start");
        expect(G.sygnalDoZagrania({ stan: "oczekiwanie", klucz: "w:3:a" }, { zagrane: z })).to.equal(null);
      });

      it("T44: zegar — czas minus pauzy (zakończone i trwająca), format m:ss.cc, progi 30 i 60 s", function () {
        expect(G.czasTury({ start: 1000, pauzaMs: 2000, pauzaOd: null }, 13_000)).to.equal(10_000);
        expect(G.czasTury({ start: 1000, pauzaMs: 2000, pauzaOd: 10_000 }, 13_000), "trwająca pauza").to.equal(7_000);
        expect(G.formatCzasu(65_432)).to.equal("1:05.43");
        expect(G.formatCzasu(0)).to.equal("0:00.00");
        expect([29_999, 30_000, 60_000].map(G.fazaCzasu)).to.deep.equal(["spokoj", "zolty", "czerwony"]);
        expect(G.tekstGotowosci({ stan: "oczekiwanie", za: 3 })).to.equal("Twoja tura za 3");
      });
    });

    describe("Klient (warstwa 4)", function () {
      this.timeout(20000);

      it("T45: rdzeniowe nextUp/yourTurn wyciszone przy włączonym panelu; startEncounter — bez zmian", async function () {
        const grane = [];
        const r = stub(game.audio, "play", src => { grane.push(src); return null; });
        const combat = new (CONFIG.Combat.documentClass)({ name: "x" });
        try {
          combat._playCombatSound("yourTurn");
          combat._playCombatSound("nextUp");
          expect(grane, "M8 jest jedynym właścicielem tych dwóch").to.deep.equal([]);
          expect(combat._playCombatSound.neuroM8).to.equal(true);
        } finally { r(); }
      });

      it("T44/T45: panel dla przypisanej postaci — za X → następny → twoja tura z zegarem; pauza zatrzymuje zegar", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Pierwszy M8` });
        const b = await scratchActor({ name: `${SCRATCH_PREFIX} Drugi M8` });
        const ja = await scratchActor({ name: `${SCRATCH_PREFIX} Gracz M8` });
        const w = await walkaTestowa([a, b, ja], { kto: a, nazwa: "m8-gotowosc" });
        const rc = stub(game, "combat", w.combat);
        const postac = game.user._source.character ?? null;
        await game.user.update({ character: ja.id });
        const rp = stub(game.audio, "play", () => null);
        try {
          T.reset();
          expect(odswiez()).to.include({ stan: "oczekiwanie", za: 2 });
          expect(document.querySelector("#neuro-gotowosc .tekst")?.textContent).to.equal("Twoja tura za 2");
          await w.combat.nextTurn();
          expect(odswiez()).to.include({ stan: "nastepny" });
          expect(document.querySelector("#neuro-gotowosc .tekst")?.textContent).to.equal("Gotuj się, jesteś następny");
          await w.combat.nextTurn();
          expect(odswiez().stan).to.equal("tura");
          expect(gotowoscApi.stan().zegar.czesciowy, "przejście obserwowane — pełny zegar").to.equal(false);
          await new Promise(res => setTimeout(res, 120));
          expect(document.querySelector("#neuro-gotowosc .zegar")?.textContent).to.match(/^0:00\.\d\d$/);
          // Pauza: zegar stoi, pilność bez animacji; po wznowieniu pauza odliczona.
          const rpa = stub(game, "paused", true);
          try {
            T.pauza(true);
            const m1 = gotowoscApi.stan().zegar.ms;
            await new Promise(res => setTimeout(res, 150));
            expect(gotowoscApi.stan().zegar.ms, "zegar stoi w pauzie").to.equal(m1);
            expect(document.getElementById("neuro-gotowosc").classList.contains("pauza")).to.equal(true);
          } finally { rpa(); }
          T.pauza(false);
          expect(gotowoscApi.stan().zegar.pauzaMs).to.be.at.least(100);
        } finally {
          rp(); rc();
          await game.user.update({ character: postac });
          await w.sprzatnij();
          T.reset();
          odswiez();
        }
        expect(document.getElementById("neuro-gotowosc"), "bez walki — bez panelu").to.equal(null);
      });

      it("E8: prawdziwy koń z jeźdźcem w siodle (kotwica M4) — „za X” go nie liczy", async function () {
        const kon = await game.packs.get(`${MODULE_ID}.bestiariusz`)?.getDocuments().then(d => d.find(x => x.getFlag(MODULE_ID, "bestiary")?.id === "kon-zdrowy"));
        if (!kon || !game.neuroshima.pojazdy?.posadz) this.skip();
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Na turze E8` });
        const jezdziec = await scratchActor({ name: `${SCRATCH_PREFIX} Jeździec E8` });
        const kd = game.actors.fromCompendium(kon);
        const konA = await scratchActor({ ...kd, name: `${SCRATCH_PREFIX} Koń E8`, flags: { ...(kd.flags ?? {}), [MODULE_ID]: { ...(kd.flags?.[MODULE_ID] ?? {}), wierzchowiec: { wyszkolony: true } } } });
        const ja = await scratchActor({ name: `${SCRATCH_PREFIX} Czekający E8` });
        const w = await walkaTestowa([a, jezdziec, konA, ja], { kto: a, nazwa: "m8-gotowosc-kon" });
        const rc = stub(game, "combat", w.combat);
        const postac = game.user._source.character ?? null;
        await game.user.update({ character: ja.id });
        const rp = stub(game.audio, "play", () => null);
        try {
          T.reset();
          expect(odswiez(), "przed dosiadaniem: jeździec i koń przed tobą").to.include({ stan: "oczekiwanie", za: 3 });
          const tKon = w.zetony.find(t => t.actorId === konA.id);
          const tJ = w.zetony.find(t => t.actorId === jezdziec.id);
          await game.neuroshima.pojazdy.posadz(tKon, tJ, "siodlo-0-0");
          const { kotwicaWpisu } = await import("../combat/kotwica-tury.mjs");
          const cKon = w.combat.combatants.find(c => c.tokenId === tKon.id);
          const wpis = kotwicaWpisu(cKon);
          if (!wpis) this.skip(); // M4 nie zakotwiczył (np. scena bez obrysu) — nic do sprawdzenia
          expect(wpis.id).to.equal("wierzchowiec");
          expect(odswiez(), "koń w turze jeźdźca — nie liczy się").to.include({ stan: "oczekiwanie", za: 2 });
        } finally {
          rp(); rc();
          await game.user.update({ character: postac });
          await w.sprzatnij();
          T.reset();
          odswiez();
        }
      });
    });
  });
}
