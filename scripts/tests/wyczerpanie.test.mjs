/**
 * Neuroshima 5e — Wyczerpanie na żywym aktorze (PLAN_m1_walka.md E5).
 *
 * Warstwa 3 (dokumenty): lejek zapisu `config/exhaustion.mjs` — poziom z `_source` (F15), lista
 * źródeł = poziom; Długi odpoczynek zdejmuje wg `kolejnoscDO` (U14), uporczywe trzyma znacznik
 * warunku (Odwodnienie, s. 258), warstwa WKK (Kobalt, D5); zejście z Krytycznego zdejmuje
 * Wyczerpanie ze Zranienia (RAI) każdą drogą; „w cieple” zdejmuje całe Przemarznięcie (s. 258).
 * Widok pipek (kolejność toru, ramka) — przez `pipkiWyczerpania`; DOM — e2e `rekonwalescencja`.
 */

import { MODULE_ID, scratchActor, scratchCleanup, stub } from "./helpers.mjs";
import {
  addExhaustion, poziomWyczerpania, zrodlaWyczerpania, pipkiWyczerpania, zdejmijWyjsciem, W_CIEPLE
} from "../config/exhaustion.mjs";
import { setZranienie } from "../combat/zranienie.mjs";

const klucze = actor => zrodlaWyczerpania(actor).map(s => s.source);

/** Długi odpoczynek bez okna, czatu i zegara — ścieżka `dnd5e.preRestCompleted` jak przy stole. */
async function dlugiOdpoczynek(actor, extra = {}) {
  return actor.longRest({ dialog: false, chat: false, advanceTime: false, newDay: false, ...extra });
}

/** Podmienia przełącznik Kobaltu na czas testu, resztę ustawień zostawia. */
function kobalt(wlaczony) {
  const get = game.settings.get.bind(game.settings);
  return stub(game.settings, "get", (ns, key) => (ns === MODULE_ID && key === "kobaltEnabled") ? wlaczony : get(ns, key));
}

export function registerWyczerpanieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.wyczerpanie`, context => {
    const { describe, it, expect, after, afterEach } = context;
    let przywroc = null;

    after(scratchCleanup);
    afterEach(() => { przywroc?.(); przywroc = null; });

    const ranny = () => scratchActor({ system: { attributes: { hp: { value: 10, max: 10 } } } });

    describe("Lejek zapisu (F15)", function () {
      it("trzy `addExhaustion` pod rząd — poziom 3, trzy źródła", async function () {
        const a = await ranny();
        await addExhaustion(a, "kac", { chat: false });
        await addExhaustion(a, "forsowanie", { chat: false });
        await addExhaustion(a, "ogolne", { chat: false });
        expect(poziomWyczerpania(a)).to.equal(3);
        expect(a.getFlag(MODULE_ID, "exhaustionSources")).to.have.length(3);
      });

      it("rozjazd danych naprawia pierwszy zapis: nadmiar źródeł odcięty", async function () {
        const a = await ranny();
        const smieci = ["kac", "forsowanie", "ogolne", "kac"].map((source, i) => ({ source, label: source, addedAt: i + 1 }));
        await a.update({ "system.attributes.exhaustion": 1, [`flags.${MODULE_ID}.exhaustionSources`]: smieci });
        expect(klucze(a), "widok normalizuje").to.deep.equal(["kac"]);
        await addExhaustion(a, "bezsennosc", { chat: false });
        expect(a.getFlag(MODULE_ID, "exhaustionSources").map(s => s.source)).to.deep.equal(["kac", "bezsennosc"]);
      });

      it("poziom niesie czas świata, nie zegar komputera", async function () {
        const a = await ranny();
        await addExhaustion(a, "kac", { chat: false });
        const [wpis] = a.getFlag(MODULE_ID, "exhaustionSources");
        expect(wpis.czas).to.equal(game.time.worldTime);
        expect(wpis).to.not.have.property("addedAt");
      });

      it("Odwodnienie zapala znacznik warunku", async function () {
        const a = await ranny();
        await addExhaustion(a, "odwodnienie", { chat: false });
        expect(a.statuses.has("dehydration")).to.equal(true);
      });
    });

    describe("Długi odpoczynek (U10, U14)", function () {
      it("schodzi poziom bez innego wyjścia, nie starsze Zranienie; uporczywe zostaje", async function () {
        przywroc = kobalt(false);
        const a = await ranny();
        await addExhaustion(a, "zranienie", { chat: false });
        await addExhaustion(a, "odwodnienie", { chat: false });
        await addExhaustion(a, "kac", { chat: false });
        await dlugiOdpoczynek(a);
        expect(klucze(a)).to.deep.equal(["zranienie", "odwodnienie"]);
        await dlugiOdpoczynek(a);
        expect(klucze(a), "NOE: Zranienie schodzi zwykłym DO").to.deep.equal(["odwodnienie"]);
        await dlugiOdpoczynek(a);
        expect(klucze(a), "Odwodnienie ze znacznikiem — nie schodzi").to.deep.equal(["odwodnienie"]);
      });

      it("po dziennej porcji wody (znacznik zdjęty) Odwodnienie schodzi z DO", async function () {
        przywroc = kobalt(false);
        const a = await ranny();
        await addExhaustion(a, "odwodnienie", { chat: false });
        expect(pipkiWyczerpania(a)[0].uporczywe).to.equal(true);
        await a.toggleStatusEffect("dehydration", { active: false });
        expect(pipkiWyczerpania(a)[0].uporczywe).to.equal(false);
        await dlugiOdpoczynek(a);
        expect(poziomWyczerpania(a)).to.equal(0);
      });

      it("WKK: Wyczerpanie z Krytycznego nie schodzi z DO (D5)", async function () {
        przywroc = kobalt(true);
        const a = await ranny();
        await setZranienie(a, 4);
        await addExhaustion(a, "zranienie", { chat: false });
        await dlugiOdpoczynek(a);
        expect(klucze(a)).to.deep.equal(["zranienie"]);
        expect(pipkiWyczerpania(a)[0].uporczywe).to.equal(true);
      });

      it("w cieple: całe Przemarznięcie, potem zwykłe −1 z reszty (s. 258)", async function () {
        przywroc = kobalt(false);
        const a = await ranny();
        for (const k of ["przemarznie", "przemarznie", "kac", "forsowanie"]) await addExhaustion(a, k, { chat: false });
        await dlugiOdpoczynek(a, { [W_CIEPLE]: true });
        expect(klucze(a)).to.deep.equal(["forsowanie"]);
      });
    });

    describe("Dodatkowe wyjścia", function () {
      it("zejście z Krytycznego zdejmuje Wyczerpanie ze Zranienia — pipką i w NOE, i w WKK (RAI)", async function () {
        for (const wl of [false, true]) {
          przywroc = kobalt(wl);
          const a = await ranny();
          await setZranienie(a, 4);
          await addExhaustion(a, "zranienie", { chat: false });
          await addExhaustion(a, "kac", { chat: false });
          await setZranienie(a, 3);
          expect(klucze(a), wl ? "WKK" : "NOE").to.deep.equal(["kac"]);
          przywroc(); przywroc = null;
        }
      });

      it("spadek, który nie zaczyna się od Krytycznego, nic nie zdejmuje", async function () {
        const a = await ranny();
        await setZranienie(a, 3);
        await addExhaustion(a, "zranienie", { chat: false });
        await setZranienie(a, 2);
        expect(klucze(a)).to.deep.equal(["zranienie"]);
      });

      it("złapanie oddechu zdejmuje całe Uduszenie jednym zapisem", async function () {
        const a = await ranny();
        for (const k of ["uduszenie", "kac", "uduszenie"]) await addExhaustion(a, k, { chat: false });
        expect(await zdejmijWyjsciem(a, "oddech", { chat: false })).to.equal(2);
        expect(klucze(a)).to.deep.equal(["kac"]);
      });
    });
  }, { displayName: "Neuroshima: Wyczerpanie — zdejmowanie i widok (M1 E5)" });
}
