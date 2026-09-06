/**
 * Neuroshima 5e — most między Sztuczką a kodem, który jej szuka.
 *
 * Cztery moduły pytają „czy postać ma tę Sztuczkę?" na dwa różne sposoby:
 *   • `actors/abilities.mjs` — po flaga `sztuczka` z compendium, z awaryjnym dopasowaniem po nazwie,
 *   • `combat/melee-maneuvers.mjs` (Aramis) i `items/toolkit-medyk.mjs` (Pan Plaster,
 *     Aspiryna i Miętusy) — po własnym dopasowaniu po nazwie.
 *
 * Drugi sposób jest kruchy: zmiana etykiety w `sztuczki-data.mjs` wyłącza automatykę
 * bez jednego ostrzeżenia. Testy „kontraktu nazw" pilnują właśnie tego.
 */

import { SZTUCZKI } from "../config/sztuczki-data.mjs";
import { ABILITY_KEYS, ABILITY_DEFINITIONS, getResolvedAbility, hasAbility } from "../actors/abilities.mjs";
import { MANEUVERS, hasAramis, maneuverDC } from "../combat/melee-maneuvers.mjs";
import { __testing as bezDna } from "../actors/bez-dna.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, sztuczkaItem, namedFeat } from "./helpers.mjs";

/** Kopia normalizatora z `toolkit-medyk.mjs` — test kontraktu, więc celowo zduplikowana. */
const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function registerSztuczkiBridgeTests(quench) {
  quench.registerBatch(`${MODULE_ID}.sztuczki-most`, context => {
    const { describe, it, before, after, expect } = context;

    let actor;

    before(async function () {
      actor = await scratchActor({
        system: { abilities: { str: { value: 8 }, dex: { value: 18 } } }
      });
    });

    after(async function () {
      await scratchCleanup();
    });

    /** Wymienia przedmioty aktora na podany zestaw. */
    async function equip(...items) {
      const existing = actor.items.map(i => i.id);
      if (existing.length) await actor.deleteEmbeddedDocuments("Item", existing, { render: false });
      if (items.length) await actor.createEmbeddedDocuments("Item", items, { render: false });
    }

    describe("Rozpoznanie po flaga z compendium", function () {
      it("Szturmowiec z flagą `sztuczka` daje klucz SZTURMOWIEC ze źródłem `sztuczka`", async function () {
        await equip(sztuczkaItem("szturmowiec", SZTUCZKI.szturmowiec.label));
        const resolved = getResolvedAbility(actor, ABILITY_KEYS.SZTURMOWIEC);
        expect(resolved.enabled).to.be.true;
        expect(resolved.source).to.equal("sztuczka");
        expect(resolved.item?.name).to.equal(SZTUCZKI.szturmowiec.label);
      });

      it("Szybkie palce dają OBA klucze naraz", async function () {
        await equip(sztuczkaItem("szybkiePalce", SZTUCZKI.szybkiePalce.label));
        expect(hasAbility(actor, ABILITY_KEYS.SZYBKA_WYMIANA), "szybka wymiana").to.be.true;
        expect(hasAbility(actor, ABILITY_KEYS.SZYBKIE_PRZELADOWANIE), "szybkie przeładowanie").to.be.true;
      });

      it("Grad ołowiu nie przecieka na Ruchome gniazdo CKM", async function () {
        await equip(sztuczkaItem("gradOlowiu", SZTUCZKI.gradOlowiu.label));
        expect(hasAbility(actor, ABILITY_KEYS.GRAD_OLOWIU)).to.be.true;
        expect(hasAbility(actor, ABILITY_KEYS.RUCHOME_GNIAZDO_CKM)).to.be.false;
      });

      it("bez przedmiotu nie ma zdolności", async function () {
        await equip();
        for (const key of Object.values(ABILITY_KEYS)) {
          expect(hasAbility(actor, key), key).to.be.false;
        }
      });

      it("nieznany klucz zwraca źródło `unknown`, a nie wyjątek", function () {
        expect(getResolvedAbility(actor, "nieMaTakiej").source).to.equal("unknown");
      });
    });

    describe("Furtka dla postaci migrowanych z Roll20", function () {
      it("`feat` o pasującej nazwie, bez flagi, wciąż działa — ze źródłem `item`", async function () {
        await equip(namedFeat(SZTUCZKI.szturmowiec.label));
        const resolved = getResolvedAbility(actor, ABILITY_KEYS.SZTURMOWIEC);
        expect(resolved.enabled).to.be.true;
        expect(resolved.source).to.equal("item");
      });

      it("aliasy w `ABILITY_DEFINITIONS` pasują do etykiet z danych", function () {
        const bySztuczka = new Map();
        for (const [key, def] of Object.entries(SZTUCZKI)) {
          for (const legacy of def.legacyAbilityKeys ?? []) bySztuczka.set(legacy, def.label);
        }
        for (const [legacy, label] of bySztuczka) {
          const aliases = ABILITY_DEFINITIONS[legacy]?.aliases ?? [];
          const matches = aliases.some(alias => norm(label).includes(norm(alias)));
          expect(matches, `„${label}" nie pasuje do żadnego aliasu klucza ${legacy}`).to.be.true;
        }
      });
    });

    describe("Aramis (Wytrącenie)", function () {
      it("rozpoznany po flaga z compendium", async function () {
        await equip(sztuczkaItem("aramis", SZTUCZKI.aramis.label));
        expect(hasAramis(actor)).to.be.true;
      });

      it("rozpoznany po samej nazwie `feat`a", async function () {
        await equip(namedFeat(SZTUCZKI.aramis.label));
        expect(hasAramis(actor)).to.be.true;
      });

      it("inna Sztuczka go nie udaje", async function () {
        await equip(sztuczkaItem("szturmowiec", SZTUCZKI.szturmowiec.label));
        expect(hasAramis(actor)).to.be.false;
      });

      it("etykieta Sztuczki nadal pasuje do dopasowania po nazwie w module manewrów", function () {
        expect(SZTUCZKI.aramis.label.trim().toLowerCase()).to.equal("aramis");
      });
    });

    describe("Bez dna (klauzula Sztuczki „Pakowanie” — Udźwig ×2)", function () {
      it("rozpoznany po fladze `sztuczka:\"pakowanie\"` z compendium", async function () {
        await equip(sztuczkaItem("pakowanie", SZTUCZKI.pakowanie.label));
        expect(hasAbility(actor, ABILITY_KEYS.BEZ_DNA)).to.be.true;
      });

      it("rozpoznany po samej nazwie klauzuli — dokładnie kształt znaleziony żywcem na Raynaldzie", async function () {
        await equip(namedFeat("Bez Dna"));
        expect(hasAbility(actor, ABILITY_KEYS.BEZ_DNA), "„Bez Dna”").to.be.true;

        await equip(namedFeat("Bez dna"));
        expect(hasAbility(actor, ABILITY_KEYS.BEZ_DNA), "„Bez dna” (druga kapitalizacja)").to.be.true;
      });

      it("rozpoznany też po pełnej nazwie całej Sztuczki („Pakowanie”), nie tylko klauzuli", async function () {
        await equip(namedFeat("Pakowanie"));
        expect(hasAbility(actor, ABILITY_KEYS.BEZ_DNA)).to.be.true;
      });

      it("inna Sztuczka go nie udaje", async function () {
        await equip(sztuczkaItem("szturmowiec", SZTUCZKI.szturmowiec.label));
        expect(hasAbility(actor, ABILITY_KEYS.BEZ_DNA)).to.be.false;
      });

      describe("Active Effect (actors/bez-dna.mjs)", function () {
        it("syncBezDnaEffect tworzy efekt, który dokładnie podwaja Udźwig", async function () {
          await equip();
          const baselineMax = actor.system.attributes.encumbrance.max;

          await equip(namedFeat("Bez dna"));
          await bezDna.syncBezDnaEffect(actor);

          expect(actor.effects.get(bezDna.EFFECT_ID), "efekt utworzony").to.exist;
          expect(actor.system.attributes.encumbrance.max, "dokładnie ×2 względem stanu bez Sztuczki")
            .to.equal(baselineMax * 2);
        });

        it("usuwa efekt, gdy Sztuczka znika z aktora", async function () {
          await equip(namedFeat("Bez dna"));
          await bezDna.syncBezDnaEffect(actor);
          expect(actor.effects.get(bezDna.EFFECT_ID), "przed usunięciem Sztuczki").to.exist;

          await equip(); // usuwa wszystkie przedmioty, w tym Sztuczkę
          await bezDna.syncBezDnaEffect(actor);
          expect(actor.effects.get(bezDna.EFFECT_ID), "po usunięciu Sztuczki").to.be.undefined;
        });
      });

      describe("Blokada duplikatów — „Multiple instances... shouldn't be allowed” (2026-09-06)", function () {
        it("nie da się dodać drugiej kopii, gdy aktor już ma jedną", async function () {
          await equip(namedFeat("Bez dna"));
          const [dup] = await actor.createEmbeddedDocuments(
            "Item", [{ name: "Bez Dna", type: "feat" }], { render: false }
          );
          expect(dup, "druga kopia nie powinna zostać utworzona").to.be.undefined;
          expect(actor.items.filter(i => /bez\s*dna/i.test(i.name))).to.have.lengthOf(1);
        });

        it("pierwsza kopia na pustym aktorze nadal przechodzi", async function () {
          await equip();
          const [created] = await actor.createEmbeddedDocuments(
            "Item", [{ name: "Bez dna", type: "feat" }], { render: false }
          );
          expect(created, "pierwsza kopia powinna przejść").to.exist;
        });

        it("nie blokuje innych feat'ów o niepowiązanej nazwie", async function () {
          await equip(namedFeat("Bez dna"));
          const [other] = await actor.createEmbeddedDocuments(
            "Item", [{ name: "Szturmowiec", type: "feat" }], { render: false }
          );
          expect(other, "niepowiązany feat nie powinien zostać zablokowany").to.exist;
        });
      });
    });

    describe("ST manewru (§1.13)", function () {
      it("Pochwycenie liczy się z Siły, Wytrącenie z lepszej z Siły i Zręczności", function () {
        const prof = actor.system.attributes.prof;
        const str = actor.system.abilities.str.mod;
        const dex = actor.system.abilities.dex.mod;
        expect(str, "postać testowa ma mieć słabą Siłę").to.be.below(dex);

        expect(maneuverDC(actor, "pochwycenie")).to.equal(8 + prof + str);
        expect(maneuverDC(actor, "wytracenie")).to.equal(8 + prof + dex);
        expect(maneuverDC(actor, "wytracenie") - maneuverDC(actor, "pochwycenie")).to.equal(dex - str);
      });

      it("Wytrącenie nie ma limitu rozmiaru, chwyty mają", function () {
        expect(MANEUVERS.wytracenie.maxSizeDelta).to.be.null;
        expect(MANEUVERS.pochwycenie.maxSizeDelta).to.equal(1);
        expect(MANEUVERS.odepchniecie.maxSizeDelta).to.equal(1);
      });
    });

    describe("Kontrakt nazw dla zestawu małego medyka", function () {
      it("Pan Plaster wciąż zawiera słowo, którego szuka `toolkit-medyk.mjs`", function () {
        expect(norm(SZTUCZKI.panPlaster.label)).to.contain("plaster");
      });

      it("Aspiryna i Miętusy pasuje do obu słów kluczowych po zdjęciu ogonków", function () {
        const label = norm(SZTUCZKI.aspirynaIMietusy.label);
        expect(label).to.contain("aspiryna");
        expect(label, "Miętusy -> mietus po NFD").to.contain("mietus");
      });

      it("żadna inna Sztuczka nie łapie się przypadkiem na te słowa", function () {
        const keywords = ["plaster", "aspiryna", "mietus"];
        const collisions = Object.entries(SZTUCZKI)
          .filter(([key]) => !["panPlaster", "aspirynaIMietusy"].includes(key))
          .filter(([, def]) => keywords.some(word => norm(def.label).includes(word)))
          .map(([key]) => key);
        expect(collisions, `kolizje nazw: ${collisions.join(", ")}`).to.be.empty;
      });
    });
  }, { displayName: "Neuroshima: Sztuczki — most do kodu" });
}
