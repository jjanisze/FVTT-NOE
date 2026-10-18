/**
 * Neuroshima 5e — Active Effect `changes`: kształt wpisu i kolejność stosowania.
 *
 * Trzy rzeczy, które nie miały pokrycia, a każda z nich potrafiła zepsuć się po cichu:
 *
 * 1. **Kolejność modyfikatorów Szybkości** to decyzja o zasadach, nie detal techniczny
 *    — kara płaska ze Zranienia ma wejść PRZED połowieniem z Przeciążenia/Upojenia.
 *    Bez jawnych priorytetów Foundry sortuje remisy w kolejności dokumentów, której
 *    `createEmbeddedDocuments` nie gwarantuje, więc ten sam stół dawał różne wyniki.
 *    Patrz `config/effect-changes.mjs` §2.
 *
 * 2. **Zbieżność resynców.** `syncLevelledConditions`/`syncDiseaseEffects` miały pisać
 *    tylko przy realnej różnicy, ale porównywały świeżo zbudowane dane ze stanem
 *    odczytanym z bazy, który nigdy nie wygląda tak samo — więc przepisywały każdy swój
 *    efekt przy każdym wywołaniu. Test pilnuje, że drugi przebieg nie pisze już nic.
 *
 * 3. **Żaden wpis nie wraca do liczbowego `mode`.** Statyczny przegląd danych modułu,
 *    żeby nowa mechanika nie wniosła z powrotem kształtu usuwanego w FVTT 16.
 */

import { CHANGE_TYPE, CHANGE_PRIORITY, change, normalizeChanges } from "../config/effect-changes.mjs";
import { DISEASE_EFFECTS } from "../config/disease-effects.mjs";
import { UPOJENIE_LEVELS, SKAZENIE_LEVELS } from "../config/levelled-conditions-data.mjs";
import { syncLevelledConditions } from "../actors/levelled-conditions.mjs";
import { __testing as slowdown } from "../actors/udzwig-slowdown.mjs";
import { setZranienie } from "../combat/zranienie.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";
import { CHEMIA } from "../config/chemia-data.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, setCarriedWeight } from "./helpers.mjs";
import { migrateDnd5e6, PALCOZERCA } from "../migration/migrate-dnd5e6.mjs";

/** Każda tablica `changes` w danych modułu, spłaszczona do jednej listy. */
function allDataChanges() {
  const out = [];
  for (const stages of Object.values(DISEASE_EFFECTS)) {
    for (const spec of Object.values(stages)) {
      out.push(...(spec.changes ?? []), ...(spec.conditional?.changes ?? []));
    }
  }
  for (const row of [...UPOJENIE_LEVELS, ...SKAZENIE_LEVELS]) out.push(...(row.changes ?? []));
  return out;
}

/** Every `changes` entry anywhere in a data table (Bestiariusz riders and automation, Chemia), however deep. */
function nestedChanges(root) {
  const out = [];
  const walk = node => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (k === "changes" && Array.isArray(v)) out.push(...v.filter(c => c && typeof c.key === "string"));
      else walk(v);
    }
  };
  walk(root);
  return out;
}

export function registerEffectChangesTests(quench) {
  quench.registerBatch(`${MODULE_ID}.efekty-zmiany`, context => {
    const { describe, it, after, expect } = context;

    after(async function () {
      await scratchCleanup();
    });

    describe("kształt wpisu (dane modułu)", function () {
      it("żaden wpis nie używa już liczbowego `mode`", function () {
        const stale = allDataChanges().filter(c => "mode" in c);
        expect(stale.map(c => c.key)).to.deep.equal([]);
      });

      it("każdy wpis ma stringowy `type` i jawny `priority`", function () {
        for (const c of allDataChanges()) {
          expect(c.type, `type dla ${c.key}`).to.be.a("string");
          expect(c.priority, `priority dla ${c.key}`).to.be.a("number");
        }
      });

      // dnd5e 6.0 przekierowuje stare klucze (`ActiveEffect5e.SHIM_FIELDS` i wzorzec
      // `abilities|skills|tools.*.bonuses.check|save`) po cichu: w 6.0.6 żaden wpis nie ma `warning`, więc bramka
      // ostrzeżeń zgodności (E10) ich nie złapie — ten test tak. Dane piszą nowe klucze.
      it("żaden klucz zmiany w danych modułu nie jest starym kluczem dnd5e (podkładka 6.0)", function () {
        const shim = CONFIG.ActiveEffect.documentClass.SHIM_FIELDS ?? {};
        const keys = [...allDataChanges(), ...nestedChanges(BESTIARY), ...nestedChanges(CHEMIA)].map(c => c.key);
        expect(keys.length, "zmiany w danych").to.be.above(0);
        expect(keys.filter(k => k in shim || /\.bonuses\.(check|save)$/.test(k))).to.deep.equal([]);
      });

      it("`change()` odmawia nieznanego typu zamiast po cichu wstawić `add`", function () {
        expect(() => change("system.foo", "addd", 1)).to.throw(/addd/);
      });

      it("kary płaskie mają niższy priorytet niż połowienie", function () {
        expect(CHANGE_PRIORITY.add).to.be.below(CHANGE_PRIORITY.multiply);
        expect(CHANGE_PRIORITY.multiply).to.be.below(CHANGE_PRIORITY.override);
      });
    });

    // Bit-Boys, Palcożerca: „-1 wszystkich Testów Cech opartych na Zręczności”. Klucz 5.3 (`bonuses.abilities.check`)
    // dawał -1 każdemu testowi cechy; klucz 6.0 na cesze trafia też w umiejętności oparte na niej.
    describe("Palcożerca — tylko Testy cech na Zręczności", function () {
      it("-1 do testu ZRC i umiejętności z ZRC, nic do testu SIŁ", async function () {
        const rider = BESTIARY["bit-boys"]?.features?.find(f => f.automation?.rider === "palcozerca")?.automation;
        expect(rider?.effect?.changes, "dane jeźdźca z generatora").to.be.an("array").that.is.not.empty;
        const a = await scratchActor();
        await a.createEmbeddedDocuments("ActiveEffect", [{
          name: rider.effect.label,
          system: { changes: rider.effect.changes.map(c => change(c.key, CHANGE_TYPE[c.mode] ?? CHANGE_TYPE.add, c.value)) }
        }]);
        const wzor = async fn => (await fn())?.[0]?.formula ?? "";
        const zrc = await wzor(() => a.rollAbilityCheck({ ability: "dex" }, { configure: false }, { create: false }));
        const sil = await wzor(() => a.rollAbilityCheck({ ability: "str" }, { configure: false }, { create: false }));
        const skill = Object.entries(a.system.skills).find(([, s]) => s.ability === "dex")?.[0];
        const umiejetnosc = skill ? await wzor(() => a.rollSkill({ skill }, { configure: false }, { create: false })) : "";
        expect(zrc, "test ZRC").to.match(/- 1\b/);
        expect(sil, "test SIŁ").to.not.match(/- 1\b/);
        if (skill) expect(umiejetnosc, `umiejętność ${skill} (ZRC)`).to.match(/- 1\b/);
      });
    });

    describe("migracja świata na dnd5e 6 (E11, `migration/migrate-dnd5e6.mjs`)", function () {
      const zakres = actors => ({ actors, items: [] });

      it("stare klucze efektów → klucze 6.0 (odwzorowanie dnd5e), Palcożerca → tylko ZRC; sucha próba nic nie pisze", async function () {
        const a = await scratchActor();
        await a.createEmbeddedDocuments("ActiveEffect", [
          { name: "[Quench] stare klucze", system: { changes: [
            change("system.attributes.movement.walk", CHANGE_TYPE.add, "5"),
            change("system.abilities.dex.bonuses.save", CHANGE_TYPE.add, "1"),
            change("system.attributes.ac.bonus", CHANGE_TYPE.add, "1")
          ] } },
          { name: "[Quench] palec", flags: { [MODULE_ID]: { critRider: PALCOZERCA.rider } },
            system: { changes: [change(PALCOZERCA.oldKey, CHANGE_TYPE.add, "-1")] } }
        ]);
        // Kolejność wyniku createEmbeddedDocuments jest niestabilna — po nazwie.
        const klucze = name => a.effects.getName(name).toObject().system.changes.map(c => c.key);
        expect(await migrateDnd5e6(zakres([a])), "sucha próba").to.have.length(2);
        expect(klucze("[Quench] stare klucze"), "sucha próba nie pisze").to.include("system.attributes.movement.walk");
        await migrateDnd5e6({ commit: true, ...zakres([a]) });
        expect(klucze("[Quench] stare klucze")).to.deep.equal([
          "system.attributes.movement.speeds.walk", "system.abilities.dex.save.roll.bonus", "system.attributes.ac.bonus"
        ]);
        expect(klucze("[Quench] palec"), "RAW: tylko testy ZRC, nie podkładka `rolls.ability.check`").to.deep.equal([PALCOZERCA.key]);
        expect(await migrateDnd5e6(zakres([a])), "drugi przebieg").to.be.empty;
      });

      it("TT towarzysza: sam wzór właściciela, bez domyślnych obliczeń dnd5e", async function () {
        const t = await scratchActor({
          type: "npc", flags: { [MODULE_ID]: { towarzysz: { rodzaj: "quench" } } },
          system: { attributes: { ac: { calc: "custom", formula: "8" } } } // kształt z 5.3
        });
        expect(t._source.system.attributes.ac.calcs, "6.0 dokłada domyślne obliczenia").to.not.be.empty;
        await migrateDnd5e6({ commit: true, ...zakres([t]) });
        expect(t._source.system.attributes.ac.calcs).to.deep.equal([]);
        expect(t.system.attributes.ac.value, "TT = wzór").to.equal(8);
        expect(await migrateDnd5e6(zakres([t])), "drugi przebieg").to.be.empty;
      });
    });

    describe("normalizeChanges", function () {
      it("zrównuje zapis z bazy ze świeżo zbudowanym (phase, liczba vs string)", function () {
        const fresh = [change("system.attributes.movement.speeds.walk", CHANGE_TYPE.multiply, 0.5)];
        const stored = [{
          key: "system.attributes.movement.speeds.walk", type: "multiply",
          value: "0.5", priority: CHANGE_PRIORITY.multiply, phase: "initial"
        }];
        expect(normalizeChanges(stored)).to.equal(normalizeChanges(fresh));
      });

      it("nadal widzi realną różnicę wartości", function () {
        const a = [change("system.attributes.ac.bonus", CHANGE_TYPE.add, 1)];
        const b = [change("system.attributes.ac.bonus", CHANGE_TYPE.add, 2)];
        expect(normalizeChanges(a)).to.not.equal(normalizeChanges(b));
      });
    });

    describe("kolejność na Szybkości (żywy aktor)", function () {
      async function walker(kg) {
        const actor = await scratchActor({
          system: { abilities: { str: { value: 10 } }, attributes: { movement: { walk: 9 } } }
        });
        await setCarriedWeight(actor, kg);
        return actor;
      }

      it("Zranienie + Przeciążenie → (9 − 4,5) × ½ = 2,25 m, nie 0", async function () {
        const actor = await walker(70);
        await slowdown.syncUdzwigSlowEffect(actor);
        await setZranienie(actor, 1);
        expect(actor.system.attributes.movement.speeds.walk).to.equal(2.25);
      });

      it("Unieruchomienie wygrywa ze wszystkim — Szybkość 0", async function () {
        const actor = await walker(130);
        await slowdown.syncUdzwigSlowEffect(actor);
        await setZranienie(actor, 1);
        expect(actor.system.attributes.movement.speeds.walk).to.equal(0);
      });
    });

    describe("zbieżność resynców", function () {
      it("drugi `syncLevelledConditions` nie przepisuje efektu", async function () {
        const actor = await scratchActor();
        // Flaga wprost, nie `setTrackLevel` — ta pisze na czat i odpala Sequencera.
        await actor.update({ [`flags.${MODULE_ID}.upojenie`]: 3 });
        await syncLevelledConditions(actor);

        const effect = actor.effects.find(e => e.getFlag(MODULE_ID, "levelledCondition")?.id === "upojenie");
        expect(effect, "efekt Upojenia istnieje").to.exist;
        const before = effect._stats.modifiedTime;

        await syncLevelledConditions(actor);
        expect(actor.effects.get(effect.id)._stats.modifiedTime).to.equal(before);
      });
    });
  });
}
