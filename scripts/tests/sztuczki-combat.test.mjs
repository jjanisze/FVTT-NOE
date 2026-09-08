/**
 * Neuroshima 5e — Sztuczki, które faktycznie zmieniają regułę w walce.
 *
 * Cztery Sztuczki mają kod za sobą i wszystkie działają tak samo: podmieniają wynik
 * jednego predykatu w `weapons/fire-modes.mjs` albo `weapons/magazine.mjs`. Testujemy
 * predykaty, nie `activity.use()` — użycie aktywności ciągnie za sobą dialogi, karty
 * czatu, dźwięki i Sequencer, czyli wszystko to, czego test w żywym świecie ma nie robić.
 *
 * Stan walki jest podstawiany (`stub`), nie tworzony: żadnego `Combat.create()`,
 * żadnej zmiany aktywnej sceny, żadnego ruszania zaznaczenia MG.
 */

import { SZTUCZKI } from "../config/sztuczki-data.mjs";
import { ABILITY_KEYS } from "../actors/abilities.mjs";
import { __testing as fire } from "../weapons/fire-modes.mjs";
import { __testing as mag } from "../weapons/magazine.mjs";
import { __testing as samuraj } from "../actors/samuraj.mjs";
import {
  MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup,
  sztuczkaItem, stub, captureWarnings, waitFor, activitiesOfType
} from "./helpers.mjs";

const KS = "ks";

function weaponData(name, properties) {
  return {
    name: `${SCRATCH_PREFIX} ${name}`,
    type: "weapon",
    system: { type: { value: "palnaPosr" }, properties, damage: { base: { number: 1, denomination: 8 } } }
  };
}

export function registerSztuczkiCombatTests(quench) {
  quench.registerBatch(`${MODULE_ID}.sztuczki-walka`, context => {
    const { describe, it, before, after, beforeEach, afterEach, expect } = context;

    let actor;
    let seria;      // tryb_p + KS + DS
    let wmag;       // magazynek wewnętrzny
    let przeladuj;  // właściwość „przeładowanie"
    const restores = [];

    before(async function () {
      actor = await scratchActor();
      const created = await actor.createEmbeddedDocuments("Item", [
        weaponData("Karabinek serii", ["tryb_p", "tryb_ks", "tryb_ds"]),
        weaponData("Karabin z wmagiem", ["tryb_p", "wmag"]),
        weaponData("Karabin z przeładowaniem", ["tryb_p", "przeladowanie"])
      ], { render: false });
      // Po nazwie, nie po pozycji — kolejność zwrotki `createEmbeddedDocuments` nie jest
      // gwarantowana, a przy zamianie broni miejscami testy padają w sposób mylący:
      // wygląda to na błąd w regule przeładowania, a nie na pomyloną fixture'ę.
      const byName = name => {
        const item = created.find(i => i.name.includes(name));
        if (!item) throw new Error(`Fixture: brak broni "${name}" wśród ${created.map(i => i.name)}`);
        return item;
      };
      seria = byName("serii");
      wmag = byName("wmagiem");
      przeladuj = byName("przeładowaniem");
    });

    after(async function () {
      await scratchCleanup();
    });

    afterEach(async function () {
      while (restores.length) restores.pop()();
      const featIds = actor.items.filter(i => i.type === "feat").map(i => i.id);
      if (featIds.length) await actor.deleteEmbeddedDocuments("Item", featIds, { render: false });
    });

    /** Nadaje aktorowi Sztuczkę na czas jednego testu. */
    async function grant(key) {
      await actor.createEmbeddedDocuments("Item", [sztuczkaItem(key, SZTUCZKI[key].label)], { render: false });
    }

    /** Udaje trwającą walkę w rundzie `round`, bez tworzenia dokumentu Combat. */
    function fakeCombat(round = 3) {
      const combat = { id: "quench-fake-combat", started: true, round };
      restores.push(stub(game, "combat", combat));
      restores.push(stub(actor, "inCombat", true));
      return combat;
    }

    /** Zapisuje na broni, że w tej rundzie poszła już krótka seria. */
    async function markKsUsed(item, combat) {
      await item.setFlag(MODULE_ID, fire.BURST_STATE_FLAG,
        { combatId: combat.id, round: combat.round, mode: KS, bullets: fire.KS_BULLET_COST, uses: 1 });
    }

    describe("Grad ołowiu — zdjęcie blokady „jedna KS na rundę\"", function () {
      it("poza walką limit rundy w ogóle nie obowiązuje", function () {
        restores.push(stub(game, "combat", null));
        expect(fire.canUseBurstMode(seria, KS, fire.KS_BULLET_COST)).to.be.true;
      });

      it("bez Sztuczki druga KS w tej samej rundzie jest odrzucana z ostrzeżeniem", async function () {
        const combat = fakeCombat();
        await markKsUsed(seria, combat);
        const warnings = captureWarnings();
        restores.push(warnings.restore);

        expect(fire.hasLeadHail(seria), "postać nie ma jeszcze Sztuczki").to.be.false;
        expect(fire.canUseBurstMode(seria, KS, fire.KS_BULLET_COST)).to.be.false;
        expect(warnings.messages.join(" ")).to.match(/krótk[aą] seri/i);
      });

      it("z Gradem ołowiu ta sama sytuacja przechodzi, bez ostrzeżenia", async function () {
        const combat = fakeCombat();
        await markKsUsed(seria, combat);
        await grant("gradOlowiu");
        const warnings = captureWarnings();
        restores.push(warnings.restore);

        expect(fire.hasLeadHail(seria)).to.be.true;
        expect(fire.canUseBurstMode(seria, KS, fire.KS_BULLET_COST)).to.be.true;
        expect(warnings.messages).to.be.empty;
      });

      it("Grad ołowiu nie odblokowuje długiej serii — wyjątek dotyczy tylko KS", async function () {
        const combat = fakeCombat();
        await markKsUsed(seria, combat);
        await grant("gradOlowiu");
        const warnings = captureWarnings();
        restores.push(warnings.restore);

        expect(fire.canUseBurstMode(seria, "ds", fire.DS_THRESHOLDS[0].bullets)).to.be.false;
        expect(warnings.messages.join(" ")).to.match(/seri/i);
      });

      it("nowa runda kasuje blokadę także bez Sztuczki", async function () {
        const combat = fakeCombat(3);
        await markKsUsed(seria, combat);
        while (restores.length) restores.pop()();
        fakeCombat(4);
        expect(fire.canUseBurstMode(seria, KS, fire.KS_BULLET_COST)).to.be.true;
      });
    });

    describe("Szturmowiec — krótka seria bez Utrudnienia", function () {
      it("predykat reaguje na Sztuczkę", async function () {
        expect(fire.hasAssaulter(seria)).to.be.false;
        await grant("szturmowiec");
        expect(fire.hasAssaulter(seria)).to.be.true;
      });

      it("podpowiedź aktywności KS zapowiada wyjątek Gradu ołowiu", function () {
        const hint = CONFIG.DND5E.activityTypes.neuroKs?.documentClass?.metadata?.hint ?? "";
        expect(hint).to.contain("Grad ołowiu");
      });
    });

    describe("Ruchome gniazdo CKM — Chmura ołowiu", function () {
      it("bez Sztuczki próg DS zostaje taki, jak w tabeli", function () {
        const base = fire.DS_THRESHOLDS[0];
        expect(fire.longBurstSelection(seria, base)).to.deep.equal({
          bullets: base.bullets, multiplier: base.multiplier
        });
      });

      it("ze Sztuczką podwaja i naboje, i kości obrażeń — na każdym progu", async function () {
        await grant("ruchomeGniazdoCkm");
        for (const option of fire.DS_THRESHOLDS) {
          const selection = fire.longBurstSelection(seria, option);
          expect(selection.bullets, `${option.bullets} naboi`).to.equal(option.bullets * 2);
          expect(selection.multiplier, `${option.bullets} naboi`).to.equal(option.multiplier * 2);
          expect(selection.abilityKey).to.equal(ABILITY_KEYS.RUCHOME_GNIAZDO_CKM);
        }
      });

      it("etykieta w oknie wyboru mówi, skąd wzięło się podwojenie", async function () {
        await grant("ruchomeGniazdoCkm");
        expect(fire.longBurstOptionLabel(seria, fire.DS_THRESHOLDS[0])).to.contain("Chmura ołowiu");
      });
    });

    describe("Szybkie palce — Szybka wymiana i Szybkie przeładowanie", function () {
      const magState = { current: 0, max: 30, ammoType: "kal9" };

      it("fixture'y mają magazynki, o których mówią ich nazwy", function () {
        // Bez tego zamiana broni miejscami objawia się jako „zła Sztuczka w planie
        // przeładowania” — czyli wygląda na błąd reguły, którym nie jest.
        expect(mag.reloadPlan(seria, magState).containerAccusative, "seria").to.equal("magazynek");
        expect(mag.reloadPlan(wmag, magState).containerAccusative, "wmag").to.equal("magazynek wewnętrzny");
      });

      it("wymiana magazynka to Akcja, dopóki nie ma Sztuczki", function () {
        const plan = mag.reloadPlan(seria, magState);
        expect(plan.actionType).to.equal("action");
        expect(plan.ruleChangeAbilityKey).to.be.null;
      });

      it("ze Sztuczką wymiana magazynka schodzi do Akcji bonusowej", async function () {
        await grant("szybkiePalce");
        const plan = mag.reloadPlan(seria, magState);
        expect(plan.actionType).to.equal("bonus");
        expect(plan.ruleChangeAbilityKey).to.equal(ABILITY_KEYS.SZYBKA_WYMIANA);
        expect(plan.dialogTitle).to.contain("Akcja bonusowa");
      });

      it("doładowanie magazynka wewnętrznego też schodzi do Akcji bonusowej", async function () {
        expect(mag.reloadPlan(wmag, { current: 0, max: 5, ammoType: "kal762" }).actionType).to.equal("action");
        await grant("szybkiePalce");
        const plan = mag.reloadPlan(wmag, { current: 0, max: 5, ammoType: "kal762" });
        expect(plan.actionType).to.equal("bonus");
        expect(plan.ruleChangeAbilityKey).to.equal(ABILITY_KEYS.SZYBKIE_PRZELADOWANIE);
      });

      it("właściwość „przeładowanie\" przestaje blokować kolejny strzał", async function () {
        expect(mag.manualReloadMode(przeladuj)).to.equal("przeladowanie");
        expect(mag.requiresManualReloadBeforeUse(przeladuj), "bez Sztuczki broń wymaga przeładowania").to.be.true;
        await grant("szybkiePalce");
        expect(mag.ignoresManualReloadMode(przeladuj)).to.be.true;
        expect(mag.requiresManualReloadBeforeUse(przeladuj)).to.be.false;
      });

      it("„ładowanie\" (osobna właściwość) nie jest omijane przez Szybkie palce", async function () {
        await grant("szybkiePalce");
        expect(mag.ignoresManualReloadMode(wmag, "ladowanie")).to.be.false;
      });
    });

    describe("Aktywności trybów ognia — cykl życia", function () {
      it("wszystkie cztery typy aktywności są zarejestrowane w CONFIG.DND5E", function () {
        for (const type of ["neuroKs", "neuroDs", "neuroMs", "neuroOz"]) {
          expect(CONFIG.DND5E.activityTypes, type).to.have.property(type);
        }
      });

      it("broń z tryb_ks i tryb_ds dostaje aktywności z haka `createItem`", async function () {
        await waitFor(() => activitiesOfType(seria, "neuroKs").length === 1, { label: "aktywność KS" });
        await waitFor(() => activitiesOfType(seria, "neuroDs").length === 1, { label: "aktywność DS" });
        expect(activitiesOfType(seria, "neuroMs")).to.be.empty;
      });

      it("zdjęcie właściwości kasuje aktywność", async function () {
        const item = actor.items.get(seria.id);
        await item.update({ "system.properties": ["tryb_p", "tryb_ds"] }, { render: false });
        await waitFor(() => activitiesOfType(seria, "neuroKs").length === 0, { label: "usunięcie KS" });
        await item.update({ "system.properties": ["tryb_p", "tryb_ks", "tryb_ds"] }, { render: false });
        await waitFor(() => activitiesOfType(seria, "neuroKs").length === 1, { label: "powrót KS" });
      });
    });

    /* ------------------------------------------------------------------ */
    /*  Samuraj — IMPLEMENTATION.md (21)                                   */
    /* ------------------------------------------------------------------ */

    describe("Samuraj", function () {
      let sam;            // aktor z Sztuczką
      let katana;         // sieczna
      let palna;          // niesieczna — kontrola
      let mieszana;       // kłute+cięte, ma się liczyć jako sieczna

      const meleeData = (name, types) => ({
        name: `${SCRATCH_PREFIX} ${name}`,
        type: "weapon",
        system: {
          type: { value: "biala" }, equipped: true,
          damage: { base: { number: 1, denomination: 8, types } }
        }
      });

      // Hooki czyta się przez `Hooks.callAll`, a nie przez `activity.use()` — z tego samego
      // powodu co reszta tej paczki (dialogi, karty czatu, Sequencer).
      const rollConfig = item => ({ subject: { actor: sam, item }, rolls: [{ parts: [] }] });

      before(async function () {
        sam = await scratchActor({ name: `${SCRATCH_PREFIX} samuraj` });
        const made = await sam.createEmbeddedDocuments("Item", [
          meleeData("Katana testowa", ["slashing"]),
          meleeData("Pałka testowa", ["bludgeoning"]),
          meleeData("Nóż testowy", ["piercing", "slashing"]),
          sztuczkaItem("samuraj", `${SCRATCH_PREFIX} Samuraj`)
        ], { render: false });
        katana   = made.find(i => i.name.includes("Katana"));
        palna    = made.find(i => i.name.includes("Pałka"));
        mieszana = made.find(i => i.name.includes("Nóż"));
      });

      it("rozpoznaje broń sieczną, także o mieszanym typie obrażeń", function () {
        expect(samuraj.isSlashingWeapon(katana), "katana").to.be.true;
        expect(samuraj.isSlashingWeapon(mieszana), "kłute+cięte").to.be.true;
        expect(samuraj.isSlashingWeapon(palna), "obuchowa").to.be.false;
      });

      it("dokłada +1 do Testu Ataku bronią sieczną", function () {
        const cfg = rollConfig(katana);
        Hooks.callAll("dnd5e.preRollAttack", cfg, {}, {});
        expect(cfg.rolls[0].parts).to.deep.equal(["1"]);
      });

      it("nie rusza ataku bronią niesieczną", function () {
        const cfg = rollConfig(palna);
        Hooks.callAll("dnd5e.preRollAttack", cfg, {}, {});
        expect(cfg.rolls[0].parts).to.be.empty;
      });

      it("dokłada +1 do obrażeń bronią sieczną, i tylko raz", function () {
        const cfg = rollConfig(katana);
        cfg.rolls.push({ parts: [] });          // druga część obrażeń
        Hooks.callAll("dnd5e.preRollDamage", cfg, {}, {});
        expect(cfg.rolls[0].parts, "pierwszy rzut").to.deep.equal(["1"]);
        expect(cfg.rolls[1].parts, "drugi rzut").to.be.empty;
      });

      it("nie działa dla postaci bez Sztuczki", async function () {
        const bez = await scratchActor({ name: `${SCRATCH_PREFIX} bez sztuczki` });
        const [k] = await bez.createEmbeddedDocuments("Item", [meleeData("Katana", ["slashing"])],
          { render: false });
        const cfg = { subject: { actor: bez, item: k }, rolls: [{ parts: [] }] };
        Hooks.callAll("dnd5e.preRollAttack", cfg, {}, {});
        expect(cfg.rolls[0].parts).to.be.empty;
      });

      it("TT +1 pojawia się i znika razem z bronią w ręku", async function () {
        await waitFor(() => sam.effects.some(e => e.getFlag(MODULE_ID, "samurajEffect")),
          { label: "efekt TT +1" });
        const withWeapon = sam.system.attributes.ac.bonus;

        const slashing = sam.items.filter(i => samuraj.isSlashingWeapon(i) && i.system.equipped);
        await sam.updateEmbeddedDocuments("Item",
          slashing.map(i => ({ _id: i.id, "system.equipped": false })), { render: false });
        await waitFor(() => !sam.effects.some(e => e.getFlag(MODULE_ID, "samurajEffect")),
          { label: "zdjęcie efektu" });
        expect(sam.system.attributes.ac.bonus).to.equal(withWeapon - 1);

        await sam.updateEmbeddedDocuments("Item",
          slashing.map(i => ({ _id: i.id, "system.equipped": true })), { render: false });
        await waitFor(() => sam.effects.some(e => e.getFlag(MODULE_ID, "samurajEffect")),
          { label: "powrót efektu" });
        expect(sam.system.attributes.ac.bonus).to.equal(withWeapon);
      });

      it("rejestr automatyki mówi `partial`, bo klauzula o dobywaniu zostaje MG", function () {
        expect(SZTUCZKI.samuraj.auto).to.have.lengthOf(3);
        expect(SZTUCZKI.samuraj.manual).to.be.a("string").and.not.be.empty;
      });
    });
  }, { displayName: "Neuroshima: Sztuczki — reguły walki" });
}
