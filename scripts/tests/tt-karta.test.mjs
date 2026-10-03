/**
 * Neuroshima 5e — TT na karcie: silnik wpięty w dane pochodne (PLAN_tt.md E1, warstwa 5).
 *
 * Prawdziwi aktorzy (`scratchActor`), sprzęt zakładany przez lalkę (`place` / `equip`), zdolności
 * jako przedmioty z flagą paczki. Sprawdzamy to, co widzi gracz: `ac.value`, wygraną metodę
 * i powody w `ac.neuroshima.rejected` (dymek). Czyste przypadki brzegowe — paczka `tt-zasady`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, sztuczkaItem, namedFeat, stub, waitFor }
  from "./helpers.mjs";
import { equip, place } from "../actors/doll.mjs";
import { ttApi } from "../actors/tt.mjs";
import { resolveExclusiveGroups } from "../actors/class-rules.mjs";

/** Zdolność klasowa tak, jak leży na karcie po awansie (flaga paczki). */
const feature = (abilityId, name) => ({ name, type: "feat", flags: { [MODULE_ID]: { abilityId } } });

const armour = (name, type, value, dex = null) => ({
  name: `${SCRATCH_PREFIX} ${name}`, type: "equipment",
  system: { type: { value: type }, armor: { value, dex } }
});
const HELMET = { name: `${SCRATCH_PREFIX} Hełm`, type: "equipment", system: { type: { value: "trinket" } },
  flags: { [MODULE_ID]: { armorId: "helm" } } };
const hatchet = () => ({ name: `${SCRATCH_PREFIX} Siekierka`, type: "weapon",
  system: { identifier: "siekierka", type: { value: "biala" }, damage: { base: { number: 1, denomination: 6, types: ["slashing"] } } } });

/**
 * Postać z cechami (wartości, nie modyfikatory) i przedmiotami. Szybkość 9 m — postać testowa bez
 * Pochodzenia ma 0, a Szybkość 0 gasi Unikanie (i Roszadę) zgodnie z RAW.
 */
async function pc(name, abilities, items = [], system = {}) {
  const actor = await scratchActor({
    name: `${SCRATCH_PREFIX} ${name}`,
    system: foundry.utils.mergeObject({
      abilities: Object.fromEntries(Object.entries(abilities).map(([k, v]) => [k, { value: v }])),
      attributes: { movement: { walk: 9 } }
    }, system, { inplace: false })
  });
  const made = items.length ? await actor.createEmbeddedDocuments("Item", items, { render: false }) : [];
  return { actor, made };
}

/** Załóż przez lalkę i poczekaj, aż dnd5e przeliczy. */
async function wear(item) {
  await equip(item, { quiet: true });
  await waitFor(() => item.actor.items.get(item.id)?.system.equipped, { label: `${item.name} założony` });
}

const tt = actor => actor.system.attributes.ac.neuroshima;

/** Przedmiot po typie — `createEmbeddedDocuments` nie gwarantuje kolejności wyniku (pamięć projektu). */
const gear = (made, type = "equipment") => made.filter(i => i.type === type);
const reason = (actor, id) => tt(actor)?.rejected.find(r => r.id === id)?.reason;

async function berserk(actor) {
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: `${SCRATCH_PREFIX} Berserk`, img: "icons/svg/blood.svg",
    flags: { [MODULE_ID]: { classState: "neuro-berserk" } }
  }], { render: false });
}

export function registerTTKartaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.tt-karta`, context => {
    const { describe, it, expect, after } = context;
    after(() => scratchCleanup());

    // ZRC 14 (+2), KON 16 (+3), SIŁ 16 (+3), CHA 12 (+1) — Goła klata 15.
    const BRUTAL = { str: 16, dex: 14, con: 16, int: 10, wis: 10, cha: 12 };

    describe("Brutal — Goła klata i Obłęd", function () {
      this.timeout(15000);
      it("bez niczego: Goła klata 10 + ZRC + KON", async function () {
        const { actor } = await pc("Brutal", BRUTAL, [feature("gola-klata", "Goła klata")]);
        expect(tt(actor).method.id).to.equal("golaKlata");
        expect(actor.system.attributes.ac.value).to.equal(15);
      });

      it("w hełmie: Goła klata gaśnie (powód w dymku), TT 10 + ZRC", async function () {
        const { actor, made } = await pc("Brutal w hełmie", BRUTAL, [feature("gola-klata", "Goła klata"), HELMET]);
        await wear(gear(made)[0]);
        expect(actor.system.attributes.ac.value).to.equal(12);
        expect(reason(actor, "golaKlata")).to.equal("nosisz hełm");
      });

      it("w Berserku: Obłęd dokłada SIŁ do Gołej klaty (D2), bez zmiany `ac.bonus`", async function () {
        const { actor } = await pc("Brutal w Berserku", BRUTAL,
          [feature("gola-klata", "Goła klata"), feature("berserk", "Berserk")]);
        expect(reason(actor, "obled")).to.equal("nie jesteś w Berserku");
        await berserk(actor);
        expect(actor.system.attributes.ac.value).to.equal(18);
        expect(Number(actor.system.attributes.ac.bonus) || 0, "Obłęd poza Efektem Aktywnym").to.equal(0);
      });

      it("w Berserku w pancerzu: Obłęd i Goła klata nie działają", async function () {
        const { actor, made } = await pc("Brutal w pancerzu", BRUTAL,
          [feature("gola-klata", "Goła klata"), feature("berserk", "Berserk"), armour("Kurtka", "light", 11)]);
        await berserk(actor);
        await wear(gear(made)[0]);
        expect(tt(actor).method.id).to.equal("pancerz");
        expect(actor.system.attributes.ac.value).to.equal(13);
        expect(reason(actor, "obled")).to.equal("nosisz pancerz");
        expect(reason(actor, "golaKlata")).to.equal("nosisz pancerz");
      });

      it("Brutal-Kaznodzieja: wygrywa wyższa metoda; zawsze słabsza wyszarzona (P10)", async function () {
        const { actor } = await pc("Brutal-Kaznodzieja", { ...BRUTAL, cha: 18 },
          [feature("gola-klata", "Goła klata"), feature("tarcza-wiary", "Tarcza wiary")]);
        expect(tt(actor).method.id).to.equal("tarczaWiary");
        expect(actor.system.attributes.ac.value).to.equal(16);
        expect(resolveExclusiveGroups(actor).unarmoredAc?.suppressed).to.deep.equal(["gola-klata"]);
      });

      it("Goła klata silniejsza od Tarczy wiary — żadna nie jest wyszarzona (w hełmie wygrywa Tarcza)", async function () {
        const { actor } = await pc("Brutal-Kaznodzieja 2", BRUTAL,
          [feature("gola-klata", "Goła klata"), feature("tarcza-wiary", "Tarcza wiary")]);
        expect(tt(actor).method.id).to.equal("golaKlata");
        expect(resolveExclusiveGroups(actor).unarmoredAc?.suppressed).to.deep.equal([]);
      });
    });

    describe("Twardziel i Żołnierz", function () {
      this.timeout(15000);
      it("Obsługa pancerza: +2 w pancerzu, raz mimo dwóch kopii (P5); bez pancerza — w dymku", async function () {
        const { actor, made } = await pc("Twardziel", BRUTAL, [
          feature("obsluga-pancerza", "Obsługa pancerza"), feature("obsluga-pancerza", "Obsługa pancerza"),
          armour("Kurtka", "light", 11)
        ]);
        expect(reason(actor, "obslugaPancerza")).to.equal("nie nosisz pancerza");
        await wear(gear(made)[0]);
        expect(actor.system.attributes.ac.value).to.equal(11 + 2 + 2);
      });

      it("Trening w zbroi: średni 2 → 3, ciężki 0 → 1", async function () {
        const dex = { ...BRUTAL, dex: 18 };
        const sredni = await pc("Żołnierz średni", dex,
          [feature("trening-w-zbroi", "Trening w zbroi"), armour("Plate carrier III", "medium", 14, 2)]);
        await wear(gear(sredni.made)[0]);
        expect(sredni.actor.system.attributes.ac.value).to.equal(17);

        const ciezki = await pc("Żołnierz ciężki", dex,
          [feature("trening-w-zbroi", "Trening w zbroi"), armour("Ciężka zbroja", "heavy", 16)]);
        await wear(gear(ciezki.made)[0]);
        expect(ciezki.actor.system.attributes.ac.value).to.equal(17);
      });

      it("pancerz uszkodzony (wytrzymałość): wartość zbita, w dymku „−1 uszkodzenie”", async function () {
        const original = game.settings.get.bind(game.settings);
        const restore = stub(game.settings, "get", (ns, key) =>
          (ns === MODULE_ID && key === "wytrzymaloscPancerzy") ? true : original(ns, key));
        try {
          const { actor, made } = await pc("Uszkodzony", BRUTAL, [armour("Kurtka", "light", 12)]);
          await wear(made[0]);   // jedyny przedmiot
          await actor.items.get(made[0].id).update({ [`flags.${MODULE_ID}.wytrzymalosc.utracone`]: 1 });
          expect(actor.system.attributes.ac.value).to.equal(13);
          expect(tt(actor).method.parts[0]).to.include({ value: 11, note: "−1 uszkodzenie" });
        } finally {
          restore();
        }
      });
    });

    describe("Sztuczki", function () {
      this.timeout(15000);
      it("Kuloodporność: + PB bez pancerza; hełm ją gasi", async function () {
        const { actor, made } = await pc("Kuloodporny", BRUTAL,
          [sztuczkaItem("kuloodpornosc", "Kuloodporność"), HELMET]);
        const prof = actor.system.attributes.prof;
        expect(actor.system.attributes.ac.value).to.equal(12 + prof);
        await wear(gear(made)[0]);
        expect(actor.system.attributes.ac.value).to.equal(12);
        expect(reason(actor, "kuloodpornosc")).to.equal("nosisz hełm");
      });

      it("Tańczący z siekierkami: +1 z siekierką w każdej ręce", async function () {
        const { actor, made } = await pc("Siekierezada", BRUTAL,
          [namedFeat("Siekierezada"), hatchet(), hatchet()]);
        const [left, right] = gear(made, "weapon");
        await place(actor, left, "hand.0", { quiet: true });
        expect(reason(actor, "siekierki")).to.equal("nie masz siekierki w obu rękach");
        await place(actor, actor.items.get(right.id), "hand.1", { quiet: true });
        await waitFor(() => tt(actor).bonuses.some(b => b.id === "siekierki"), { label: "dwie siekierki" });
        expect(actor.system.attributes.ac.value).to.equal(13);
      });

      it("Szachista: Roszada +3 przy Unikaniu, Unikanie ma czas trwania RAW", async function () {
        const { actor } = await pc("Szachista", BRUTAL, [sztuczkaItem("szachista", "Szachista")]);
        expect(reason(actor, "roszada")).to.equal("nie Unikasz");
        await actor.toggleStatusEffect("dodging", { active: true });
        expect(actor.system.attributes.ac.value).to.equal(15);
        const effect = actor.effects.find(e => e.statuses.has("dodging"));
        expect(effect?._source.duration).to.include({ value: 1, units: "turns", expiry: "turnStart" });
        await actor.toggleStatusEffect("dodging", { active: false });
        expect(actor.system.attributes.ac.value).to.equal(12);
      });
    });

    describe("Furtka MG i efekty trwające turę", function () {
      this.timeout(15000);
      it("metoda „Stała”: silnik nie rusza niczego", async function () {
        const { actor } = await pc("stała", BRUTAL, [feature("gola-klata", "Goła klata")],
          { attributes: { ac: { calc: "flat", flat: 17 } } });
        expect(actor.system.attributes.ac.value).to.equal(17);
        expect(actor.system.attributes.ac.neuroshima).to.equal(null);
        expect(ttApi.source(actor, "golaKlata")).to.include({ active: true, manual: true });
      });

      it("w walce efekt trwający do początku tury dostaje kombatanta właściciela, nie tego na ruchu", async function () {
        const { actor } = await pc("Unikający", BRUTAL);
        const ownerId = "neuroTTowner0000";
        const restore = stub(game, "combat", {
          started: true, turns: [], round: 2, turn: 0, combatants: new foundry.utils.Collection(),
          getCombatantsByActor: a => (a === actor ? [{ id: ownerId }] : [])
        });
        try {
          await actor.toggleStatusEffect("dodging", { active: true });
          const effect = actor.effects.find(e => e.statuses.has("dodging"));
          expect(effect?._source.start?.combatant).to.equal(ownerId);
        } finally {
          restore();
        }
      });
    });
  }, { displayName: "Neuroshima: TT na karcie (dane pochodne)" });
}
