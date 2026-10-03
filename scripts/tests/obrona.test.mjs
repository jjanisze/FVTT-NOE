/**
 * Neuroshima 5e — trafienie, obrażenia i reakcje obronne: warstwa Foundry (PLAN_tt.md E2–E3).
 *
 * Czyste zasady (`resolveHit`, `reactionState`) testuje paczka `tt-zasady`. Tutaj:
 *   • budowniczy obrażeń strzału pojedynczego (kości naboju, `fixedDamage`, bez modyfikatora,
 *     właściwości naboju) i podmiana części bazowej w natywnej aktywności ataku,
 *   • osłona z okna ataku i werdykt ze stempla karty (`combat/trafienie.mjs`),
 *   • TT wobec konkretnego atakującego (znaczniki Parowania tarczą),
 *   • brak auto-obrażeń po Teście Ataku (D8).
 *
 * Bez kart czatu i bez `activity.use()` (TESTING §4) — aktorzy testowi, sprzątani w `after`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, waitFor } from "./helpers.mjs";
import { buildCaliberDamageRoll, caliberDamageProperties, isCaliberWeapon } from "../weapons/ammo.mjs";
import { coverAcBonus } from "../combat/cover.mjs";
import { ttAgainst, verdictOfEntry, buildObrona, entryFor, TT_VS_ATTACKER_FLAG } from "../combat/trafienie.mjs";

const ATTACK_ID = "neuroTestAtak000";

/** Broń z natywną aktywnością ataku (tryb P). */
function weapon(name, { type = "palnaKrotka", base = { number: 1, denomination: 4, types: ["piercing"] },
  properties = ["tryb_p"], caliber = null, fixedDamage = false, range = "ranged" } = {}) {
  const flags = {};
  if (caliber) flags.mag = { ammoType: caliber };
  if (fixedDamage) flags.fixedDamage = true;
  return {
    name: `${SCRATCH_PREFIX} ${name}`, type: "weapon",
    system: {
      type: { value: type }, properties, damage: { base },
      activities: {
        [ATTACK_ID]: {
          _id: ATTACK_ID, type: "attack",
          attack: { type: { value: range, classification: "weapon" } },
          damage: { includeBase: true, parts: [] }
        }
      }
    },
    flags: { [MODULE_ID]: flags }
  };
}

const attackOf = item => item.actor.items.get(item.id)?.system.activities.get(ATTACK_ID);

export function registerObronaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.obrona`, context => {
    const { describe, it, expect, before, after } = context;
    after(() => scratchCleanup());

    describe("Obrażenia strzału pojedynczego (D8)", function () {
      this.timeout(15000);
      let actor, pistol, pompka, dumdum, katana;

      before(async function () {
        actor = await scratchActor({ name: `${SCRATCH_PREFIX} strzelec`, system: { abilities: { dex: { value: 16 } } } });
        const made = await actor.createEmbeddedDocuments("Item", [
          weapon("Pistolet 9mm", { caliber: "9mm" }),
          weapon("Pompka", { caliber: "12ga_s", fixedDamage: true, base: { number: 4, denomination: 4, types: ["piercing"] } }),
          weapon("Magnum dum-dum", { caliber: "44mag_dd", base: { number: 1, denomination: 10, types: ["piercing"] } }),
          weapon("Katana", { type: "biala", properties: ["fin"], range: "melee",
            base: { number: 1, denomination: 10, types: ["slashing"] } })
        ], { render: false });
        const by = n => made.find(i => i.name.includes(n));
        [pistol, pompka, dumdum, katana] = [by("Pistolet"), by("Pompka"), by("dum-dum"), by("Katana")];
        await waitFor(() => attackOf(pistol) && attackOf(katana), { label: "aktywności ataku" });
      });

      it("broń z kalibrem jest w systemie kalibrów, biała — nie", function () {
        expect(isCaliberWeapon(pistol)).to.equal(true);
        expect(isCaliberWeapon(katana)).to.equal(false);
      });

      it("kości naboju, bez modyfikatora z cechy", function () {
        const r = buildCaliberDamageRoll(pistol, {}, "9mm");
        expect(r.parts).to.deep.equal(["1d6"]);
        expect(r.parts.join(" ")).to.not.include("@mod");
        expect(r.options).to.include({ type: "piercing", neuroCaliber: "9mm" });
        expect(r.base).to.equal(true);
      });

      it("`fixedDamage`: kości broni biją domyślną formułę kalibru", function () {
        expect(buildCaliberDamageRoll(pompka, {}, "12ga_s").parts).to.deep.equal(["4d4"]);
      });

      it("właściwości naboju dochodzą do obrażeń; tryby ognia broni — nie", function () {
        const props = caliberDamageProperties(dumdum, "44mag_dd");
        expect(props).to.include.members(["rozrywajaca", "hollowpoint", "obalajaca"]);
        expect(props).to.not.include("tryb_p");
      });

      it("natywna aktywność: część bazowa z naboju z karty, bez `@mod`", function () {
        const rolls = attackOf(pistol).getDamageConfig({ neuroCaliber: "9mm" }).rolls;
        expect(rolls[0].parts).to.deep.equal(["1d6"]);
        expect(rolls[0].base).to.equal(true);
      });

      it("bez karty — kaliber z broni", function () {
        expect(attackOf(dumdum).getDamageConfig({}).rolls[0].parts).to.deep.equal(["1d10"]);
      });

      it("broń biała zostaje natywna (z modyfikatorem)", function () {
        const parts = attackOf(katana).getDamageConfig({}).rolls[0].parts;
        expect(parts.join(" ")).to.include("@mod");
      });

      it("żaden hak po Teście Ataku nie nakłada obrażeń (auto-obrażenia usunięte)", function () {
        const fns = (Hooks.events["dnd5e.postRollAttack"] ?? []).map(h => h.fn?.name ?? "");
        expect(fns.filter(n => /autoapply/i.test(n)), fns.join(", ")).to.deep.equal([]);
      });
    });

    describe("Rozstrzygacz na karcie ataku (§4.6)", function () {
      this.timeout(15000);

      it("osłona z okna ataku: ½ +2, ¾ +5, przez osłonę 0", function () {
        expect(coverAcBonus(undefined)).to.equal(0);
        expect(coverAcBonus({ selection: "half" })).to.equal(2);
        expect(coverAcBonus({ selection: "threeQuarters" })).to.equal(5);
        expect(coverAcBonus({ selection: "through", penetrationLevel: 2 })).to.equal(0);
      });

      it("werdykt ze stempla: TT + osłona + użyte reakcje, krytyk i jego zamiana", function () {
        const obrona = { total: 17, krytyk: false, fumble: false };
        const entry = { tt: 15, cover: 0, used: [], critDowngraded: false };
        expect(verdictOfEntry(obrona, entry).verdict).to.equal("trafienie");
        expect(verdictOfEntry(obrona, { ...entry, cover: 2 }).verdict).to.equal("trafienie");
        expect(verdictOfEntry(obrona, { ...entry, used: [{ id: "inteligentnaObrona", bonus: 4 }] }).verdict).to.equal("pudło");
        const crit = { total: 22, krytyk: true, fumble: false };
        expect(verdictOfEntry(crit, entry).verdict).to.equal("krytyk");
        expect(verdictOfEntry(crit, { ...entry, critDowngraded: true }).verdict).to.equal("trafienie");
      });

      it("szkielet `obrona` z rzutu: wynik, naturalna kość, krytyk/jedynka", function () {
        const roll = { total: 19, isCritical: false, isFumble: false, options: {}, dice: [{ total: 14 }] };
        expect(buildObrona(roll, null)).to.include({ total: 19, natural: 14, krytyk: false, fumble: false, melee: false });
      });

      it("wpis celu po UUID żetonu albo aktora", function () {
        const obrona = { targets: [{ tokenUuid: "Scene.a.Token.b", actorUuid: "Actor.c" }] };
        expect(entryFor(obrona, { uuid: "Scene.a.Token.b" })).to.equal(obrona.targets[0]);
        expect(entryFor(obrona, { uuid: "Actor.c" })).to.equal(obrona.targets[0]);
        expect(entryFor(obrona, { uuid: "Actor.x" })).to.equal(null);
      });

      it("TT wobec atakującego: znacznik Parowania tarczą tylko na jego ataki wręcz", async function () {
        const target = await scratchActor({ name: `${SCRATCH_PREFIX} z tarczą` });
        const base = target.system.attributes.ac.value;
        await target.createEmbeddedDocuments("ActiveEffect", [{
          name: `${SCRATCH_PREFIX} Parowanie tarczą`,
          flags: { [MODULE_ID]: { [TT_VS_ATTACKER_FLAG]: { attackerUuid: "Actor.wrogWrogWrog01", bonus: 5, melee: true } } }
        }], { render: false });
        expect(ttAgainst(target, { attacker: "Actor.wrogWrogWrog01", melee: true })).to.equal(base + 5);
        expect(ttAgainst(target, { attacker: "Actor.wrogWrogWrog01", melee: false }), "dystans").to.equal(base);
        expect(ttAgainst(target, { attacker: "Actor.innyInnyInny01", melee: true }), "inny wróg").to.equal(base);
        expect(target.system.attributes.ac.value, "TT na karcie bez zmian").to.equal(base);
      });
    });
  }, { displayName: "Neuroshima: Trafienie, obrażenia i reakcje celu" });
}
