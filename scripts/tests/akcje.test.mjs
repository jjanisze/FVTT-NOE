/**
 * Neuroshima 5e — warstwa akcji i bramki (PLAN_m7 E0, §3.0.1 i §3.0.4).
 *
 * Warstwa 1: deklaracja R/B na zapisie znacznika (drugie użycie, Obezwładnienie, Stopnie Zranienia s. 32, Zryw),
 * bramka tura/runda/walka. Warstwa 4: znacznik w prawdziwej walce — powstaje u właściciela, drugie użycie zgłasza
 * naruszenie, `start.combatant` na właścicielu (efekt z cudzej tury), poza walką nic.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, walkaTestowa } from "./helpers.mjs";
import { AKCJE, zadeklarujAkcje, dodatkowaAkcja, ZRANIENIE_BLOKUJE } from "../config/actions-data.mjs";
import { bramkaZajeta } from "../config/bramki.mjs";
import { zadeklaruj, znacznik, FLAG_ZNACZNIK } from "../actors/actions.mjs";
import { jestEfektemTuryWlasciciela } from "../combat/czas-efektu.mjs";

export function registerAkcjeTests(quench) {
  quench.registerBatch(`${MODULE_ID}.akcje`, context => {
    const { describe, it, expect, after } = context;
    const start = Date.now();

    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Deklaracja na zapisie znacznika (warstwa 1)", function () {
      it("pierwsze użycie — bez naruszenia; drugie — powód z poprzednim źródłem", function () {
        const a = zadeklarujAkcje(null, "R", "Motywacja");
        expect(a.powody).to.deep.equal([]);
        expect(a.znacznik).to.deep.equal({ uzycia: [{ zrodlo: "Motywacja" }], limit: 1 });
        const b = zadeklarujAkcje(a.znacznik, "R", "Inteligentna obrona");
        expect(b.powody).to.have.length(1);
        expect(b.powody[0]).to.include("Motywacja").and.include("Inteligentna obrona").and.include("w tej rundzie");
        expect(zadeklarujAkcje(null, "B", "x").znacznik.uzycia).to.have.length(1);
        expect(zadeklarujAkcje({ uzycia: [{ zrodlo: "Berserk" }] }, "B", "Kondycha").powody[0]).to.include("w tej turze");
      });

      it("Obezwładnienie (i stany, które je nadają) — naruszenie już przy pierwszym użyciu (s. 35)", function () {
        for (const s of ["incapacitated", "unconscious", "stunned", "paralyzed"]) {
          expect(zadeklarujAkcje(null, "B", "x", { stany: [s] }).powody, s).to.have.length(1);
        }
        expect(zadeklarujAkcje(null, "B", "x", { stany: ["prone"] }).powody).to.deep.equal([]);
      });

      it("Stopnie Zranienia (s. 32): Znaczny zabiera Reakcję, Poważny — Akcję Bonusową, kumulują się", function () {
        expect(ZRANIENIE_BLOKUJE).to.deep.equal({ R: 2, B: 3 });
        expect(zadeklarujAkcje(null, "R", "x", { zranienie: 1 }).powody).to.deep.equal([]);
        expect(zadeklarujAkcje(null, "R", "x", { zranienie: 2 }).powody[0]).to.include("Znaczny");
        expect(zadeklarujAkcje(null, "R", "x", { zranienie: 4 }).powody[0]).to.include("Krytyczny");
        expect(zadeklarujAkcje(null, "B", "x", { zranienie: 2 }).powody).to.deep.equal([]);
        expect(zadeklarujAkcje(null, "B", "x", { zranienie: 3 }).powody[0]).to.include("Poważny");
      });

      it("dodatkowa akcja (Zryw) — limit 2, drugie użycie bez naruszenia, trzecie z", function () {
        const z = dodatkowaAkcja(zadeklarujAkcje(null, "B", "Kondycha").znacznik);
        expect(z.limit).to.equal(2);
        const b = zadeklarujAkcje(z, "B", "Ulubiona broń");
        expect(b.powody).to.deep.equal([]);
        expect(zadeklarujAkcje(b.znacznik, "B", "Berserk").powody).to.have.length(1);
        expect(dodatkowaAkcja(null)).to.deep.equal({ uzycia: [], limit: 2 });
      });

      it("nieznany rodzaj akcji — wyjątek, nie cicha zgoda", function () {
        expect(() => zadeklarujAkcje(null, "A", "x")).to.throw();
      });
    });

    describe("Bramki raz na turę / rundę / walkę (warstwa 1)", function () {
      const z = { combatId: "c1", round: 2, turn: 1 };
      it("tura: ta sama runda i tura zajęta; następna tura wolna", function () {
        expect(bramkaZajeta(z, "tura", { combatId: "c1", round: 2, turn: 1 })).to.equal(true);
        expect(bramkaZajeta(z, "tura", { combatId: "c1", round: 2, turn: 2 })).to.equal(false);
      });
      it("runda: cała runda zajęta; następna wolna", function () {
        expect(bramkaZajeta(z, "runda", { combatId: "c1", round: 2, turn: 3 })).to.equal(true);
        expect(bramkaZajeta(z, "runda", { combatId: "c1", round: 3, turn: 1 })).to.equal(false);
      });
      it("walka: zajęta do końca tej walki; inna walka i brak walki — wolne", function () {
        expect(bramkaZajeta(z, "walka", { combatId: "c1", round: 9, turn: 0 })).to.equal(true);
        expect(bramkaZajeta(z, "walka", { combatId: "c2", round: 1, turn: 0 })).to.equal(false);
        expect(bramkaZajeta(z, "runda", null)).to.equal(false);
        expect(bramkaZajeta(null, "walka", { combatId: "c1", round: 1, turn: 0 })).to.equal(false);
      });
    });

    describe("Znacznik w walce (warstwa 4)", function () {
      it("stan znacznika zarejestrowany w CONFIG i rozpoznawany przez wspólne haki czasu efektu", function () {
        for (const def of Object.values(AKCJE)) {
          expect(CONFIG.statusEffects.some(s => s.id === def.status), def.status).to.equal(true);
        }
        expect(jestEfektemTuryWlasciciela({ statuses: new Set(["reakcja"]), getFlag: () => null })).to.equal(true);
      });

      it("poza walką — nic", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Bez walki` });
        const r = stub(game, "combat", null);
        try {
          expect(await zadeklaruj(pc, "R", { zrodlo: "test" })).to.deep.equal({ poza: true });
          expect(znacznik(pc, "R")).to.equal(null);
        } finally { r(); }
      });

      it("Reakcja w cudzej turze: znacznik u właściciela, początek na jego kombatancie; drugie użycie — naruszenie", async function () {
        const atakujacy = await scratchActor({ name: `${SCRATCH_PREFIX} Atakujący` });
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} Reagujący` });
        const w = await walkaTestowa([atakujacy, cel], { kto: atakujacy, nazwa: "akcje" });
        const r = stub(game, "combat", w.combat);
        try {
          const a = await zadeklaruj(cel, "R", { zrodlo: "Inteligentna obrona" });
          expect(a.naruszenie).to.equal(false);
          const e = znacznik(cel, "R");
          expect(e, "znacznik powstał").to.be.ok;
          expect(e.statuses.has("reakcja")).to.equal(true);
          expect(e._source.duration).to.include({ value: 1, units: "turns", expiry: "turnStart" });
          const wlasny = w.combat.turns.find(c => c.actor === cel || c.actorId === cel.id);
          expect(e._source.start.combatant, "wygasa na początku tury reagującego, nie atakującego").to.equal(wlasny.id);

          const b = await zadeklaruj(cel, "R", { zrodlo: "Motywacja" });
          expect(b.naruszenie).to.equal(true);
          expect(cel.effects.filter(x => x.statuses.has("reakcja")), "jeden znacznik, nie dwa").to.have.length(1);
          expect(znacznik(cel, "R").getFlag(MODULE_ID, FLAG_ZNACZNIK).uzycia.map(u => u.zrodlo))
            .to.deep.equal(["Inteligentna obrona", "Motywacja"]);
          expect(znacznik(cel, "B"), "Reakcja nie zakłada znacznika Akcji Bonusowej").to.equal(null);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("dwie deklaracje naraz — jeden znacznik (kolejka na aktora)", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Szybkie klikanie` });
        const w = await walkaTestowa([pc], { kto: pc, nazwa: "akcje-kolejka" });
        const r = stub(game, "combat", w.combat);
        try {
          const [x, y] = await Promise.all([zadeklaruj(pc, "B", { zrodlo: "a" }), zadeklaruj(pc, "B", { zrodlo: "b" })]);
          expect([x.naruszenie, y.naruszenie].filter(Boolean)).to.have.length(1);
          expect(pc.effects.filter(e => e.statuses.has("akcjaBonusowa"))).to.have.length(1);
        } finally {
          r();
          await w.sprzatnij();
        }
      });
    });
  });
}
