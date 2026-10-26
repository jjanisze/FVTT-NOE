/**
 * Neuroshima 5e — biegłości profesji, klas i instrumentów (PLAN_m6_drobne_zasady.md §5.1, E1).
 *
 * Pilnuje tego, co psuje się po cichu:
 *   • każdy klucz w danych profesji istnieje w konfiguracji (literówka = awans, który niczego nie nadaje),
 *   • narzędzia mają przedmioty bazowe, więc dnd5e grupuje je w „Zestawy narzędzi” i „Instrumenty muzyczne”,
 *   • paczki niosą awanse z danych (profesja, druga klasa, Muzyk),
 *   • kontrakt dnd5e, na którym stoi D1: `upgrade` podnosi 1 → 2, a przy 2 nie wybiera nic — i to wtedy ostrzegamy.
 */

import { PROFESSIONS, CLASSES, KATEGORIE_BRONI } from "../config/classes-data.mjs";
import { TOOL_DEFS, INSTRUMENT_KEYS, TOOLKIT_KEYS, toolBaseItemUuid } from "../config/tools.mjs";
import { wnioskiZTraitu, STARE_KLUCZE_UMIEJETNOSCI } from "../actors/bieglosci.mjs";
import { MODULE_ID, scratchActor, scratchCleanup } from "./helpers.mjs";

const kluczeGrupy = g => [...(g.nadania ?? []), ...(g.wybory ?? []).flatMap(w => w.pula)];

/** Istnieje w CONFIG: konkretny klucz albo wieloznacznik kategorii. */
function istnieje(k) {
  const [trait, a, b] = k.split(":");
  const D = CONFIG.DND5E;
  if (trait === "skills") return a === "*" || a in D.skills;
  if (trait === "tool") return b === "*" ? a in D.toolProficiencies : a in D.tools;
  if (trait === "weapon") return a in D.weaponProficiencies;
  if (trait === "armor") return a in D.armorProficiencies;
  return false;
}

export function registerBieglosciTests(quench) {
  quench.registerBatch(`${MODULE_ID}.bieglosci`, context => {
    const { describe, it, after, expect } = context;

    describe("wnioskiZTraitu — co awans nadał mniej, niż obiecał (D1)", function () {
      it("pominięte nadanie `upgrade` = Specjalizacja już była", function () {
        expect(wnioskiZTraitu({ grants: ["skills:poj"], mode: "upgrade", chosen: [] }))
          .to.deep.equal([{ rodzaj: "maSpecjalizacje", klucz: "skills:poj" }]);
      });
      it("pominięte nadanie `default` = biegłość już była (broń, pancerz)", function () {
        expect(wnioskiZTraitu({ grants: ["weapon:palnaDluga", "armor:hvy"], mode: "default", chosen: ["armor:hvy"] }))
          .to.deep.equal([{ rodzaj: "maBieglosc", klucz: "weapon:palnaDluga" }]);
      });
      it("wybór bez pokrycia = nie było z czego wybrać", function () {
        expect(wnioskiZTraitu({ grants: ["skills:med"], choices: [{ count: 1 }], mode: "default", chosen: ["skills:med"] }))
          .to.deep.equal([{ rodzaj: "brakWyboru", ile: 1 }]);
      });
      it("mapa starych kluczy umiejętności wskazuje istniejące klucze NOE (audyt D4)", function () {
        for (const [stary, noe] of Object.entries(STARE_KLUCZE_UMIEJETNOSCI)) {
          if (noe) expect(CONFIG.DND5E.skills, `${stary} → ${noe}`).to.have.property(noe);
        }
      });
      it("wszystko nadane — cisza", function () {
        expect(wnioskiZTraitu({ grants: ["skills:tch"], choices: [{ count: 2 }], mode: "upgrade",
          chosen: ["skills:tch", "tool:kowala", "tool:hakera"] })).to.deep.equal([]);
      });
    });

    describe("Dane profesji", function () {
      it("każda z 18 profesji ma biegłości (dziura B6)", function () {
        for (const [pid, p] of Object.entries(PROFESSIONS)) expect(p.bieglosci, pid).to.be.an("array").that.is.not.empty;
      });
      it("każdy klucz grupy istnieje w konfiguracji", function () {
        for (const [pid, p] of Object.entries(PROFESSIONS)) {
          for (const g of p.bieglosci) for (const k of kluczeGrupy(g)) expect(istnieje(k), `${pid}: ${k}`).to.be.true;
        }
      });
      it("`upgrade` tylko na umiejętnościach i narzędziach (dnd5e nie podnosi broni)", function () {
        for (const [pid, p] of Object.entries(PROFESSIONS)) {
          for (const g of p.bieglosci.filter(x => x.tryb !== "default")) {
            for (const k of kluczeGrupy(g)) expect(["skills", "tool"], `${pid}: ${k}`).to.include(k.split(":")[0]);
          }
        }
      });
      it("siedem kategorii broni = biegłości w broni bez improwizowanej (U24)", function () {
        const bezImprowizowanej = Object.keys(CONFIG.DND5E.weaponProficiencies).filter(k => k !== "improwizowana");
        expect([...KATEGORIE_BRONI].sort()).to.deep.equal(bezImprowizowanej.sort());
        expect(CONFIG.DND5E.weaponProficiencies).to.have.property("improwizowana");
      });
      it("dane wieloklasowe wskazują istniejące klucze", function () {
        for (const [cid, c] of Object.entries(CLASSES)) {
          const m = c.multiclass ?? {};
          for (const w of Array.isArray(m.weapons) ? m.weapons : []) expect(CONFIG.DND5E.weaponProficiencies, `${cid}: ${w}`).to.have.property(w);
          for (const a of m.armor ?? []) expect(CONFIG.DND5E.armorProficiencies, `${cid}: ${a}`).to.have.property(a);
          for (const t of m.tools?.fixed ?? []) expect(CONFIG.DND5E.tools, `${cid}: ${t}`).to.have.property(t);
        }
      });
    });

    describe("Narzędzia i instrumenty — kategorie z przedmiotów bazowych", function () {
      it("22 zestawy i 12 instrumentów", function () {
        expect(TOOLKIT_KEYS).to.have.length(22);
        expect(INSTRUMENT_KEYS).to.have.length(12);
        expect(Object.keys(CONFIG.DND5E.tools).sort()).to.deep.equal(Object.keys(TOOL_DEFS).sort());
        expect(CONFIG.DND5E.toolProficiencies).to.have.keys(["tool", "music"]);
      });
      it("każde id wskazuje przedmiot `tool` w paczce `narzedzia`, z tym kluczem i kategorią", function () {
        for (const [k, def] of Object.entries(TOOL_DEFS)) {
          const idx = fromUuidSync(toolBaseItemUuid(k));
          expect(idx, k).to.exist;
          expect(idx.type, k).to.equal("tool");
        }
      });
      it("`Trait.categories` grupuje: zestawy w `tool`, instrumenty w `music`", async function () {
        const cat = await dnd5e.documents.Trait.categories("tool");
        expect(Object.keys(cat.tool?.children ?? {}).sort()).to.deep.equal([...TOOLKIT_KEYS].sort());
        expect(Object.keys(cat.music?.children ?? {}).sort()).to.deep.equal([...INSTRUMENT_KEYS].sort());
        // Bez lustra etykiet: żadne narzędzie nie wisi drugi raz na górnym poziomie.
        expect(Object.keys(cat).sort()).to.deep.equal(["music", "tool"]);
      });
      it("`Trait.keyLabel` zwraca polską nazwę z przedmiotu bazowego", function () {
        for (const [k, def] of Object.entries(TOOL_DEFS)) {
          expect(dnd5e.documents.Trait.keyLabel(`tool:${k}`), k).to.equal(def.label);
        }
      });
      it("instrumenty: cecha CHA (ZRC w oknie rzutu, s. 132)", function () {
        for (const k of INSTRUMENT_KEYS) expect(CONFIG.DND5E.tools[k].ability, k).to.equal("cha");
      });
    });

    describe("Paczki niosą awanse", function () {
      it("profesja: jeden `Trait` na grupę, na pierwszym poziomie profesji", async function () {
        const pack = game.packs.get(`${MODULE_ID}.profesje`);
        for (const doc of await pack.getDocuments()) {
          const pid = doc.system.identifier;
          const traits = Object.values(doc.toObject().system.advancement).filter(a => a.type === "Trait");
          expect(traits, pid).to.have.length(PROFESSIONS[pid].bieglosci.length);
          for (const a of traits) expect(a.level, pid).to.equal(CLASSES[PROFESSIONS[pid].klasa].professionLevels[0]);
        }
      });
      it("klasa: zestaw startowy `primary` i wieloklasowy `secondary` (s. 59)", async function () {
        const pack = game.packs.get(`${MODULE_ID}.klasy`);
        for (const doc of (await pack.getDocuments()).filter(d => d.type === "class" && CLASSES[d.system.identifier])) {
          const l1 = Object.values(doc.toObject().system.advancement).filter(a => a.type === "Trait" && a.level === 1);
          expect(l1.map(a => a.classRestriction).sort(), doc.name).to.deep.equal(["primary", "secondary"]);
        }
      });
      it("Sztuczka Muzyk: wybór dwóch instrumentów", async function () {
        const pack = game.packs.get(`${MODULE_ID}.sztuczki`);
        const muzyk = (await pack.getDocuments()).find(d => d.getFlag(MODULE_ID, "sztuczka") === "muzyk");
        const t = Object.values(muzyk.toObject().system.advancement).find(a => a.type === "Trait");
        expect(t?.configuration.choices?.[0]).to.deep.include({ count: 2 });
        expect(t.configuration.choices[0].pool).to.deep.equal(["tool:music:*"]);
      });
    });

    describe("Kontrakt dnd5e pod D1 (warstwa 2)", function () {
      after(scratchCleanup);

      async function gangerNa(poj) {
        const actor = await scratchActor({ type: "character", system: { skills: { poj: { value: poj } } } });
        const src = (await game.packs.get(`${MODULE_ID}.profesje`).getDocuments()).find(d => d.system.identifier === "ganger");
        const [item] = await actor.createEmbeddedDocuments("Item", [src.toObject()]);
        const adv = item.advancement.byType.Trait.find(a => a.configuration.grants.has("skills:poj"));
        return { actor, adv };
      }

      it("`upgrade`: biegłość → Specjalizacja", async function () {
        const { actor, adv } = await gangerNa(1);
        const data = await adv.automaticApplicationValue(3);
        expect(data.chosen).to.include("skills:poj");
        await adv.apply(3, data);
        expect(actor._source.system.skills.poj.value).to.equal(2);
      });
      it("`upgrade` przy Specjalizacji nic nie wybiera — i to jest ostrzeżenie", async function () {
        const { adv } = await gangerNa(2);
        const data = await adv.automaticApplicationValue(3);
        expect(data.chosen).to.not.include("skills:poj");
        expect(wnioskiZTraitu({ grants: adv.configuration.grants, choices: adv.configuration.choices,
          mode: adv.configuration.mode, chosen: data.chosen })).to.deep.equal([{ rodzaj: "maSpecjalizacje", klucz: "skills:poj" }]);
      });
    });
  });
}
