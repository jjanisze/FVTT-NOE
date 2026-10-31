/**
 * Neuroshima 5e — zdolności jako dane (PLAN_m7 E3: R1 i R2).
 *
 * Warstwa 4: przedmioty z paczek niosą Efekty Aktywne, które naprawdę działają na aktorze — reguły dnd5e 6 w RO i
 * testach (Ja już swoje odchorowałem, Telepata, Szary, Szósty zmysł z warunkiem stanów, Sokole oko), niewrażliwości
 * i odporności (Głupi, Zew areny tylko w Berserku, Smakuje jak arszenik), ruch i Udźwig; wiersze rejestru §3.0.3
 * (Rutyna w walce, Empiryk przy źródle „maszyna”, Slang jako propozycja); awanse `Trait` i ASI w paczkach.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, stub } from "./helpers.mjs";
import { TESTY_OPT } from "../combat/ulatwienia-testow.mjs";

export function registerZdolnosciEfektyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.zdolnosci-efekty`, context => {
    const { describe, it, expect, before, after } = context;
    let cechy, poch, szt;
    const ADV = () => CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
    const NORMAL = () => CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
    const daj = async (actor, docs, flag, id) => (await actor.createEmbeddedDocuments("Item",
      [game.items.fromCompendium(docs.find(i => i.getFlag(MODULE_ID, flag) === id))]))[0];
    const cecha = (a, id) => daj(a, cechy, "abilityId", id);
    const pochodzenie = (a, id) => daj(a, poch, "originAbilityId", id);
    const ro = async (a, ability, cfg = {}) => (await a.rollSavingThrow({ ability, ...cfg }, { configure: false }, { create: false }))[0];
    const umiej = async (a, skill) => (await a.rollSkill({ skill }, { configure: false }, { create: false }))[0];

    before(async () => {
      [cechy, poch, szt] = await Promise.all(["zdolnosci-klasowe", "zdolnosci-pochodzenia", "sztuczki"]
        .map(p => game.packs.get(`${MODULE_ID}.${p}`).getDocuments()));
    });
    after(scratchCleanup);

    describe("Efekty Aktywne ze zdolności (R1)", function () {
      it("Ja już swoje odchorowałem: Ułatwienie w RO na KON, nie na ZRC", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Miami` });
        await pochodzenie(a, "ja-juz-swoje-odchorowalem");
        expect((await ro(a, "con")).options.advantageMode).to.equal(ADV());
        expect((await ro(a, "dex")).options.advantageMode).to.equal(NORMAL());
      });

      it("Telepata: Ułatwienie w Intuicji (klucz `int`); Szary: + wyższy z INT/MDR do Skradania się", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Vegas`, system: { abilities: { int: { value: 14 }, wis: { value: 18 } } } });
        await pochodzenie(a, "telepata");
        await cecha(a, "szary");
        expect((await umiej(a, "int")).options.advantageMode).to.equal(ADV());
        const skr = await umiej(a, "skr");
        expect(skr.formula).to.match(/max|\+ 4\b/);
        expect(skr.total - skr.dice[0].total).to.be.at.least(4);
      });

      it("Szósty zmysł: Ułatwienie w RO na ZRC; Oślepienie je gasi (D14)", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Paranoik` });
        await cecha(a, "szosty-zmysl");
        expect((await ro(a, "dex")).options.advantageMode).to.equal(ADV());
        expect((await ro(a, "wis")).options.advantageMode).to.equal(NORMAL());
        await a.toggleStatusEffect("blinded", { active: true });
        expect((await ro(a, "dex")).options.advantageMode).to.equal(NORMAL());
      });

      it("Sokole oko: reguła +3 do ataku dystansowego na aktorze", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Strzelec` });
        await cecha(a, "sokole-oko");
        const rule = (a.appliedRules?.get("attack:bonus") ?? []).find(c => String(c.value) === "3");
        expect(rule, "reguła attack:bonus 3").to.be.ok;
        // Warunek to model filtra dnd5e (`FiltersField`) — sprawdzamy jego działanie, nie kształt.
        expect(rule.conditions.check({ roll: { attack: { type: "ranged" } } })).to.equal(true);
        expect(rule.conditions.check({ roll: { attack: { type: "melee" } } })).to.equal(false);
      });

      it("Głupi: niewrażliwość na Przerażenie; Zew areny — tylko w Berserku", async function () {
        const g = await scratchActor({ name: `${SCRATCH_PREFIX} Ganger` });
        await cecha(g, "odwazny-czy-glupi");
        expect(g.system.traits.ci.value.has("frightened")).to.equal(true);
        const gl = await scratchActor({ name: `${SCRATCH_PREFIX} Gladiator` });
        await cecha(gl, "zew-areny");
        expect(gl.system.traits.ci.value.has("frightened"), "bez Berserka").to.equal(false);
        await gl.createEmbeddedDocuments("ActiveEffect", [{ name: "Berserk (test)", statuses: ["berserk"] }]);
        expect(gl.system.traits.ci.value.has("frightened"), "w Berserku").to.equal(true);
      });

      it("Smakuje jak arszenik: odporność na kwas i truciznę; Zwinność szczura: wspinanie = Szybkość; Górnik: Udźwig ×2", async function () {
        const c = await scratchActor({ name: `${SCRATCH_PREFIX} Chemik` });
        await cecha(c, "smakuje-jak-arszenik");
        expect([...c.system.traits.dr.value]).to.include.members(["acid", "poison"]);
        const s = await scratchActor({ name: `${SCRATCH_PREFIX} Szczur` });
        await cecha(s, "zwinnosc-szczura");
        expect(s.system.attributes.movement.climb).to.equal(s.system.attributes.movement.walk);
        const g = await scratchActor({ name: `${SCRATCH_PREFIX} Górnik` });
        await pochodzenie(g, "gornik-z-dziada-pradziada");
        // Mnożnik Udźwigu to w dnd5e 6 pole formuły („1 * 2”), jak przy Bez dna.
        expect(Roll.safeEval(String(g.system.attributes.encumbrance.multipliers.overall))).to.equal(2);
        expect((await umiej(g, "atl")).options.advantageMode).to.equal(ADV());
      });
    });

    describe("Rejestr §3.0.3 ze zdolności", function () {
      it("Rutyna: Ułatwienie w RO na ZRC tylko w walce (U27)", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Żołnierz` });
        await cecha(a, "rutyna");
        expect((await ro(a, "dex")).options.advantageMode, "poza walką").to.equal(NORMAL());
        const r = stub(game, "combat", { id: "quench-rutyna", started: true, round: 1, turn: 0, turns: [], combatant: null, getCombatantsByActor: x => (x === a ? [{ id: "c1" }] : []) });
        try {
          const z = await ro(a, "dex");
          expect(z.options.advantageMode).to.equal(ADV());
          expect(z.options[TESTY_OPT].ulatwienia.map(w => w.id)).to.include("rutyna");
        } finally { r(); }
      });

      it("Empiryk: Ułatwienie w RO, gdy źródło to maszyna; Slang — propozycja przy Perswazji", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Łowca maszyn` });
        await cecha(a, "empiryk");
        await cecha(a, "slang");
        expect((await ro(a, "con", { neuroKontekst: ["maszyna"] })).options.advantageMode).to.equal(ADV());
        expect((await ro(a, "con")).options.advantageMode).to.equal(NORMAL());
        const p = await umiej(a, "per");
        expect(p.options.advantageMode, "stół nie zmienia trybu").to.equal(NORMAL());
        expect(p.options[TESTY_OPT].propozycje.map(w => w.id)).to.include("slang");
      });
    });

    describe("Awanse w paczkach (R2)", function () {
      const adv = d => Object.values(d.system.advancement?.contents ? Object.fromEntries(d.system.advancement.contents.map(x => [x.id, x])) : (d.system.advancement ?? {}));
      it("Telepata i Specjalizacja Złodzieja niosą Trait; Szybkie palce i Samuraj — ASI z RAW", function () {
        const telepata = poch.find(i => i.getFlag(MODULE_ID, "originAbilityId") === "telepata");
        expect(adv(telepata).some(a => a.type === "Trait")).to.equal(true);
        const spec = cechy.find(i => i.getFlag(MODULE_ID, "abilityId") === "specjalizacja-zlodziej");
        expect(adv(spec).filter(a => a.type === "Trait").map(a => a.level).sort()).to.deep.equal([1, 5]);
        const palce = szt.find(i => i.getFlag(MODULE_ID, "sztuczka") === "szybkiePalce");
        const asi = adv(palce).find(a => a.type === "AbilityScoreImprovement");
        expect(asi?.configuration?.fixed?.dex).to.equal(1);
        const samuraj = szt.find(i => i.getFlag(MODULE_ID, "sztuczka") === "samuraj");
        const asi2 = adv(samuraj).find(a => a.type === "AbilityScoreImprovement");
        expect(asi2.configuration.points).to.equal(1);
        expect([...asi2.configuration.locked]).to.have.members(["con", "int", "wis", "cha"]);
        const lawnik = szt.find(i => i.getFlag(MODULE_ID, "sztuczka") === "lawnik");
        // „+1 SIŁ lub KON” z tabeli kampanii usunięto z podręcznika — bez Rozwoju Cechy (MG, PLAN_m7 D15).
        expect(adv(lawnik).some(a => a.type === "AbilityScoreImprovement"), "Ławnik — bez Rozwoju Cechy").to.equal(false);
      });
    });
  });
}
