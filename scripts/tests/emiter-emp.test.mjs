/**
 * Neuroshima 5e — Emiter EMP (NOE s. 101; PLAN_m3_towarzysze.md §7.12, D27; E10).
 *
 * Warstwa 1 (dane): broń w katalogu (8k6 elektryczne, 9/15 m, pojedynczy, Ładowanie, akumulator 6), przepis
 * zdolności (100 h, 20 MK / 40 CE / 40 CZ, bez testu, dostęp tylko ze zdolnością).
 * Warstwa 3 (prawdziwe dokumenty): TT celu-maszyny wg noty pancerza (D27) — w rozstrzygaczu trafienia tylko dla tej
 * broni; biegłość z samej zdolności; Porażenie — tylko maszyny, Obezwładnienie do końca następnej tury atakującego;
 * Naładuj (230 V). Tacka obrażeń (×0 na istoty żywe) i przycisk MG — e2e `combat`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, walkaTestowa } from "./helpers.mjs";
import { WEAPON_MAP } from "../config/weapons-data.mjs";
import { przepis } from "../config/recipes-data.mjs";
import { jestEmiterem, ttWobecEmitera, naladuj, ladunkiEmitera, zapewnijLadowanie } from "../weapons/emiter-emp.mjs";
import { ttAgainst } from "../combat/trafienie.mjs";
import { __testing as SAVE, FLAG_DO_KONCA_TURY, obezwladnienieDoKoncaTury } from "../combat/weapon-save-properties.mjs";

export function registerEmiterEmpTests(quench) {
  quench.registerBatch(`${MODULE_ID}.emiter-emp`, context => {
    const { describe, it, expect, before, after } = context;
    const start = Date.now();
    let bron, best;
    const pakietBroni = () => bron.find(i => i.name === "Emiter EMP");
    const potwor = id => best.find(a => a.getFlag(MODULE_ID, "bestiary.id") === id);
    const kopia = async (actor, item) => (await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(item)]))[0];
    const naScene = async src => Actor.implementation.create({ ...game.actors.fromCompendium(src), name: `${SCRATCH_PREFIX} ${src.name}` });
    const tymczasowi = [];

    before(async () => {
      bron = await game.packs.get(`${MODULE_ID}.bron`).getDocuments();
      best = await game.packs.get(`${MODULE_ID}.bestiariusz`).getDocuments();
    });
    after(async () => {
      for (const a of tymczasowi) if (game.actors.get(a.id)) await a.delete();
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Dane: broń i przepis zdolności", function () {
      it("8k6 elektryczne, 9/15 m, pojedynczy, Ładowanie, akumulator 6, Impuls EMP", function () {
        const w = WEAPON_MAP["emiter-emp"];
        expect(w).to.include({ type: "specjalna", avail: 0, chamber: false });
        expect(w.damage).to.deep.equal({ number: 8, denomination: 6, types: ["lightning"] });
        expect(w.range).to.deep.equal({ value: 9, long: 15 });
        expect(w.mag).to.deep.equal({ kind: "wmag", max: 6 });
        expect(w.props).to.include.members(["tryb_p", "ladowanie", "emp"]);
        expect(pakietBroni(), "w paczce Broń").to.be.ok;
      });

      it("przepis zdolności: 100 h, 20 MK / 40 CE / 40 CZ, bez testu; dostęp ze zdolności Emiter EMP", function () {
        const p = przepis("zdolnosc/weapon:emiter-emp");
        expect(p).to.include({ minuty: 6000, bezTestu: true });
        expect(p.surowce.map(l => `${l.gb} ${l.typy[0]}`).sort()).to.deep.equal(["20 MK", "40 CE", "40 CZ"]);
        expect(p.zrodlo).to.include({ zdolnosc: "emiter-emp" });
      });
    });

    describe("TT celu-maszyny (D27)", function () {
      it("nota pancerza → 10 + ZRC; bez noty — pełna TT; istota żywa — bez zmian", function () {
        const jug = potwor("juggernaut");
        expect(jug.flags[MODULE_ID].bestiary.acNote).to.equal("tytanowy pancerz");
        expect(ttWobecEmitera(jug, 22)).to.equal(10 + jug.system.abilities.dex.mod);
        const glad = potwor("gladiator");
        expect(ttWobecEmitera(glad, glad.system.attributes.ac.value), "Gladiator 18 bez noty").to.equal(glad.system.attributes.ac.value);
        const zywy = best.find(a => !/maszyn/i.test(a.system.details.type.value ?? ""));
        expect(ttWobecEmitera(zywy, 15)).to.equal(null);
      });

      it("rozstrzygacz trafienia: TT wobec Emitera tylko dla tej broni", async function () {
        const ob = await naScene(potwor("obronca"));
        tymczasowi.push(ob);
        const strzelec = await scratchActor({ name: `${SCRATCH_PREFIX} Zabójca` });
        const emp = await kopia(strzelec, pakietBroni());
        const inna = await kopia(strzelec, bron.find(i => i.name === "Sztylet"));
        const pelna = ob.system.attributes.ac.value;
        expect(ttAgainst(ob, { attacker: strzelec, item: emp })).to.equal(10 + ob.system.abilities.dex.mod);
        expect(ttAgainst(ob, { attacker: strzelec, item: inna }), "inna broń").to.equal(pelna);
        expect(ttAgainst(ob, { attacker: strzelec }), "bez broni").to.equal(pelna);
      });
    });

    describe("Bestiariusz: PB z podręcznika w rzutach (actors/sp.mjs)", function () {
      it("rzut obronny maszyny z biegłym RO: `save` zostaje obiektem, rzut idzie z PB podręcznika", async function () {
        const ob = await naScene(potwor("obronca"));
        tymczasowi.push(ob);
        const pb = ob.getFlag(MODULE_ID, "bestiary.pb");
        expect(ob.system.attributes.prof, "PB z podręcznika").to.equal(pb);
        const con = ob.system.abilities.con;
        expect(con.proficient, "Obrońca ma biegły RO na KON").to.be.above(0);
        expect(typeof con.save, "nie napis „[object Object]-6”").to.equal("object");
        expect(con.save.prof.flat).to.equal(Math.floor(pb * con.proficient));
        expect(con.save.value).to.equal(con.mod + con.save.bonus + con.save.prof.flat);
        const rolls = await ob.rollSavingThrow({ ability: "con" }, { configure: false }, { create: false });
        const roll = Array.isArray(rolls) ? rolls[0] : rolls;
        expect(roll?.formula, "rzut przeszedł").to.include(String(con.save.prof.flat));
      });
    });

    describe("Biegłość, Porażenie, ładowanie", function () {
      it("biegłość tylko ze zdolności Emiter EMP — nie z broni specjalnej", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Bez zdolności`, system: { traits: { weaponProf: { value: ["sim", "mar"] } } } });
        const emp = await kopia(pc, pakietBroni());
        expect(jestEmiterem(emp)).to.equal(true);
        expect(emp.system.proficiencyMultiplier, "bez zdolności").to.equal(0);
        await pc.createEmbeddedDocuments("Item", [{ name: "Emiter EMP", type: "feat", flags: { [MODULE_ID]: { abilityId: "emiter-emp" } } }]);
        expect(pc.items.get(emp.id).system.proficiencyMultiplier, "ze zdolnością").to.equal(1);
      });

      it("Porażenie: istota żywa — bez RO; maszyna oblewa — Obezwładnienie do końca tury atakującego", async function () {
        const cfg = SAVE.SAVE_PROPERTIES.emp;
        expect(cfg).to.include({ ability: "con", status: "incapacitated", tylkoMaszyny: true });
        expect(cfg.dc).to.deep.equal({ mode: "fixed", value: 15 });
        const zywy = await scratchActor({ name: `${SCRATCH_PREFIX} Żywy cel`, type: "npc" });
        let rzuty = 0;
        const r1 = stub(zywy, "rollSavingThrow", async () => (rzuty++, [{ total: 1 }]));
        try {
          await SAVE.resolveTarget({ actor: zywy, name: zywy.name }, cfg, 15);
        } finally {
          r1();
        }
        expect(rzuty, "istota żywa nie rzuca").to.equal(0);
        expect(zywy.statuses.has("incapacitated")).to.equal(false);

        const maszyna = await naScene(potwor("pajak"));
        tymczasowi.push(maszyna);
        const r2 = stub(maszyna, "rollSavingThrow", async () => [{ total: 3 }]);
        try {
          await SAVE.resolveTarget({ actor: maszyna, name: maszyna.name }, cfg, 15, { attacker: zywy });
        } finally {
          r2();
        }
        const e = maszyna.effects.find(x => x.getFlag(MODULE_ID, FLAG_DO_KONCA_TURY));
        expect(e, "efekt Porażenia").to.be.ok;
        expect(maszyna.statuses.has("incapacitated")).to.equal(true);
      });

      it("w walce: Obezwładnienie powstaje i trwa rundę tur od tury atakującego (pełne `start`, v14)", async function () {
        const strzelec = await scratchActor({ name: `${SCRATCH_PREFIX} Strzelec w walce` });
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} Cel w walce`, type: "npc" });
        const w = await walkaTestowa([strzelec, cel], { kto: strzelec, nazwa: "EMP" });
        // `game.combat` to walka oglądanej sceny — przy stole ta sama, tu scena testowa jest gdzie indziej.
        const r = stub(game, "combat", w.combat);
        try {
          await obezwladnienieDoKoncaTury(cel, strzelec);
          const e = cel.effects.find(x => x.getFlag(MODULE_ID, FLAG_DO_KONCA_TURY));
          expect(e, "efekt powstał (wcześniej częściowe `start` — po cichu nic)").to.be.ok;
          // `_source`: przygotowany czas v14 liczy względem walki oglądanej sceny, a ta jest gdzie indziej.
          expect(e._source.duration).to.include({ value: w.combat.turns.length, units: "turns", expiry: "turnEnd" });
          expect(e._source.start.combatant).to.equal(w.combat.turns.find(c => c.actor === strzelec || c.actorId === strzelec.id).id);
          expect(cel.statuses.has("incapacitated")).to.equal(true);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("Naładuj (230 V): aktywność na broni i akumulator do 6", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Ładujący` });
        const emp = await kopia(pc, pakietBroni());
        await zapewnijLadowanie(pc.items.get(emp.id));
        expect(pc.items.get(emp.id).system.activities.some(a => a.visibility?.identifier === "emp-naladuj")).to.equal(true);
        await pc.items.get(emp.id).setFlag(MODULE_ID, "rounds", ["emp"]);
        expect(ladunkiEmitera(pc.items.get(emp.id))).to.equal(1);
        await naladuj(pc.items.get(emp.id));
        expect(ladunkiEmitera(pc.items.get(emp.id))).to.equal(6);
      });
    });
  });
}
