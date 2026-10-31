/**
 * Neuroshima 5e — warunkowe Ułatwienia w testach i RO (PLAN_m7 E0, §3.0.3).
 *
 * Warstwa 1: klucze rzutu, dopasowanie, rozstrzygnięcie (Ułatwienie, Utrudnienie, premia, propozycja „stół”, wyjątek
 * w warunku), źródło RO. Warstwa 4: wiersz testowy w prawdziwym RO — `kontekst` z konfiguracji dochodzi do haka,
 * tryb rzutu i rozkład na rzucie; rzut bez kontekstu — bez zmian.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup } from "./helpers.mjs";
import { kluczeRzutu, pasuje, rozstrzygnijTest, zeZrodla } from "../config/ulatwienia-testow.mjs";
import { zarejestrujUlatwienieTestu, wyrejestrujUlatwienieTestu, TESTY_OPT } from "../combat/ulatwienia-testow.mjs";

export function registerUlatwieniaTestowTests(quench) {
  quench.registerBatch(`${MODULE_ID}.ulatwienia-testow`, context => {
    const { describe, it, expect, after } = context;
    const start = Date.now();
    let aktywny = null;

    after(async () => {
      aktywny = null;
      wyrejestrujUlatwienieTestu("quench-arszenik");
      wyrejestrujUlatwienieTestu("quench-premia");
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Zasady (warstwa 1)", function () {
      it("klucze rzutu od najbardziej szczegółowego", function () {
        expect(kluczeRzutu({ typ: "save", ability: "dex" })).to.deep.equal(["save:dex", "save:*"]);
        expect(kluczeRzutu({ typ: "skill", ability: "wis", skill: "sur" })).to.deep.equal(["skill:sur", "skill:*", "check:wis", "check:*"]);
        expect(kluczeRzutu({ typ: "tool", ability: "int", tool: "mechanik" })).to.include.members(["tool:mechanik", "check:int"]);
        expect(kluczeRzutu({ typ: "check", ability: "str" })).to.deep.equal(["check:str", "check:*"]);
      });

      it("dopasowanie: RO na ZRC nie łapie testu ZRC (i odwrotnie)", function () {
        const ro = { rzut: ["save:dex"] };
        expect(pasuje(ro, kluczeRzutu({ typ: "save", ability: "dex" }))).to.equal(true);
        expect(pasuje(ro, kluczeRzutu({ typ: "check", ability: "dex" }))).to.equal(false);
        expect(pasuje({ rzut: ["check:int"] }, kluczeRzutu({ typ: "skill", ability: "int", skill: "tch" }))).to.equal(true);
      });

      it("rozstrzygnięcie: Ułatwienie, premia, propozycja „stół”; zepsuty warunek nie liczy się", function () {
        const rows = [
          { id: "rutyna", label: "Rutyna", rzut: ["save:dex", "save:wis"], rodzaj: "ulatwienie", gdy: c => c.walka },
          { id: "odwazny", label: "Odważny", rzut: ["save:*"], rodzaj: "premia", wartosc: "1d4", gdy: c => zeZrodla(c, "przerazenie") },
          { id: "slang", label: "Slang", rzut: ["skill:per", "skill:sle"], rodzaj: "ulatwienie", gdy: () => "stol" },
          { id: "zly", label: "Zły", rzut: ["save:*"], rodzaj: "ulatwienie", gdy: () => { throw new Error("x"); } }
        ];
        const ro = rozstrzygnijTest(rows, { typ: "save", ability: "dex", walka: true, kontekst: [] });
        expect(ro.ulatwienia.map(w => w.id)).to.deep.equal(["rutyna"]);
        expect(ro.premie).to.deep.equal([]);
        const strach = rozstrzygnijTest(rows, { typ: "save", ability: "wis", walka: false, kontekst: ["przerazenie"] });
        expect(strach.ulatwienia).to.deep.equal([]);
        expect(strach.premie).to.deep.equal([{ id: "odwazny", label: "Odważny", wartosc: "1d4" }]);
        const gadka = rozstrzygnijTest(rows, { typ: "skill", ability: "cha", skill: "per", kontekst: [] });
        expect(gadka.ulatwienia).to.deep.equal([]);
        expect(gadka.propozycje.map(w => w.id)).to.deep.equal(["slang"]);
      });
    });

    describe("W prawdziwym RO (warstwa 4)", function () {
      it("`neuroKontekst` z konfiguracji dochodzi do haka: Ułatwienie przeciw truciźnie, bez kontekstu — nic", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Arszenik` });
        aktywny = pc;
        zarejestrujUlatwienieTestu({
          id: "quench-arszenik", label: "Quench: przeciw truciznom", rzut: ["save:con"], rodzaj: "ulatwienie",
          ma: a => a === aktywny, gdy: c => zeZrodla(c, "trucizna")
        });
        const [z] = await pc.rollSavingThrow({ ability: "con", neuroKontekst: ["trucizna"] }, { configure: false }, { create: false });
        expect(z.options.advantageMode).to.equal(CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE);
        expect(z.options[TESTY_OPT].ulatwienia.map(w => w.id)).to.deep.equal(["quench-arszenik"]);
        const [bez] = await pc.rollSavingThrow({ ability: "con" }, { configure: false }, { create: false });
        expect(bez.options.advantageMode).to.equal(CONFIG.Dice.D20Roll.ADV_MODE.NORMAL);
        const [dex] = await pc.rollSavingThrow({ ability: "dex", neuroKontekst: ["trucizna"] }, { configure: false }, { create: false });
        expect(dex.options.advantageMode, "RO na ZRC nie łapie").to.equal(CONFIG.Dice.D20Roll.ADV_MODE.NORMAL);
      });

      it("premia z wiersza trafia do części testu umiejętności (budowanego po haku)", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Premia` });
        aktywny = pc;
        zarejestrujUlatwienieTestu({
          id: "quench-premia", label: "Quench +2", rzut: ["skill:prc"], rodzaj: "premia", wartosc: 2, ma: a => a === aktywny
        });
        const [r] = await pc.rollSkill({ skill: "prc" }, { configure: false }, { create: false });
        expect(r.formula).to.match(/\+ 2\b/);
        expect(r.options[TESTY_OPT].premie.map(p => p.id)).to.include("quench-premia");
      });
    });
  });
}
