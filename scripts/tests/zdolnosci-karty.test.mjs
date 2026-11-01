/**
 * Neuroshima 5e — PLAN_m7 E7: karty MG (R9) i krytyki, śmierć (R10).
 *
 * Czyste: ST reanimacji Łapiducha z czasu, ST pułapki Kłusownika, progi Bez tajemnic, nowe mutanty w zasięgu Coś mi tu
 * śmierdzi, kość Krwawego anioła, werdykt Nie do zdarcia. Na dokumentach (aktorzy testowi, bez sceny): Zawzięty
 * sukinkot poza walką, reanimacja, wiedza Bez tajemnic z karty istoty. Karty i kliknięcia — e2e.
 */

import {
  stReanimacji, REANIMACJA_PRZYCZYNY, stPulapki, progiBezTajemnic, nowiWZasiegu, SMROD_ZASIEG, SMROD_ST
} from "../config/zdolnosci-karty-rules.mjs";
import { PRZYCZYNY_SMIERCI } from "../config/umieranie-rules.mjs";
import { koscLeczeniaMedyka } from "../config/toolkits-data.mjs";
import { verdictOfEntry, krytykZdjety, bezKrytykaDla } from "../combat/trafienie.mjs";
import { __testing as obrona } from "../combat/obrona.mjs";
import { zacisnijZeby, stan } from "../combat/umieranie.mjs";
import { reanimuj, wiedzaBezTajemnic } from "../combat/zdolnosci-karty.mjs";
import { featureStatus } from "../config/class-features-coverage.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, waitFor } from "./helpers.mjs";

const wpis = (o = {}) => ({ tt: 12, cover: 0, used: [], critDowngraded: false, autoKrytyk: null, bezKrytyka: null, ...o });

export function registerZdolnosciKartyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.zdolnosci-karty`, context => {
    const { describe, it, after, expect } = context;
    after(scratchCleanup);

    describe("Czyste zasady R9", function () {
      it("Łapiduch: ST z czasu od śmierci — do 1, 2, 4, 8 minut; później za późno", function () {
        expect([0, 60, 61, 120, 121, 240, 241, 480].map(stReanimacji)).to.deep.equal([15, 15, 20, 20, 25, 25, 30, 30]);
        expect(stReanimacji(481)).to.equal(null);
      });

      it("Łapiduch: przyczyny reanimacji to przyczyny śmierci, bez Olbrzymich obrażeń", function () {
        for (const p of REANIMACJA_PRZYCZYNY) expect(PRZYCZYNY_SMIERCI, p).to.have.property(p);
        expect(REANIMACJA_PRZYCZYNY).to.not.include("olbrzymie");
      });

      it("Kłusownik: ST pułapki 8 + MDR + PB", function () {
        expect(stPulapki({ mdr: 2, pb: 2 })).to.equal(12);
        expect(stPulapki({ mdr: -1, pb: 3 })).to.equal(10);
      });

      it("Bez tajemnic: progi 10 / 15 / 20", function () {
        expect(progiBezTajemnic(9)).to.deep.equal([]);
        expect(progiBezTajemnic(10)).to.deep.equal(["nazwa"]);
        expect(progiBezTajemnic(17)).to.deep.equal(["nazwa", "slabe"]);
        expect(progiBezTajemnic(24)).to.deep.equal(["nazwa", "slabe", "wspolczynniki"]);
      });

      it("Coś mi tu śmierdzi: 9 m, ST 15, sygnał tylko o nowych", function () {
        expect([SMROD_ZASIEG, SMROD_ST]).to.deep.equal([9, 15]);
        expect(nowiWZasiegu(["a"], ["a", "b"])).to.deep.equal(["b"]);
        expect(nowiWZasiegu(["a", "b"], ["a"])).to.deep.equal([]);
        expect(nowiWZasiegu(null, ["c"])).to.deep.equal(["c"]);
      });

      it("Krwawy anioł: k4 → k6 (3.), k8 (6.), k10 (9.), k12 (12.)", function () {
        expect([1, 3, 5, 6, 9, 12, 20].map(p => koscLeczeniaMedyka(p, true))).to.deep.equal([4, 6, 6, 8, 10, 12, 12]);
        expect(koscLeczeniaMedyka(12, false)).to.equal(4);
      });
    });

    describe("Nie do zdarcia (R10, U22)", function () {
      const nat20 = { total: 25, krytyk: true, fumble: false };
      const zwykly = { total: 15, krytyk: false, fumble: false };

      it("krytyk z kości → zwykłe trafienie; pudło zostaje pudłem", function () {
        expect(verdictOfEntry(nat20, wpis()).verdict).to.equal("krytyk");
        expect(verdictOfEntry(nat20, wpis({ bezKrytyka: "Nie do zdarcia" })).verdict).to.equal("trafienie");
        expect(verdictOfEntry({ total: 5, krytyk: false, fumble: false }, wpis({ bezKrytyka: "Nie do zdarcia" })).verdict).to.equal("pudło");
      });

      it("automatyczne TK (Nieprzytomny, Przycelowanie w głowę) też zwykłe", function () {
        expect(verdictOfEntry(zwykly, wpis({ autoKrytyk: "Nieprzytomny" })).verdict).to.equal("krytyk");
        expect(verdictOfEntry(zwykly, wpis({ autoKrytyk: "Nieprzytomny", bezKrytyka: "Nie do zdarcia" })).verdict).to.equal("trafienie");
      });

      it("rzut obrażeń bez krytyka, gdy każdy trafiony cel ma Nie do zdarcia; mieszane — krytyk zostaje", function () {
        expect(krytykZdjety(wpis({ bezKrytyka: "Nie do zdarcia" }))).to.equal(true);
        const t = v => ({ ...wpis(v), verdict: "trafienie" });
        expect(obrona.shouldDowngradeCrit({ krytyk: true, targets: [t({ bezKrytyka: "Nie do zdarcia" })] })).to.equal(true);
        expect(obrona.shouldDowngradeCrit({ krytyk: true, targets: [t({ bezKrytyka: "Nie do zdarcia" }), t()] })).to.equal(false);
      });

      it("rozpoznanie po przedmiocie zdolności", async function () {
        const a = await scratchActor();
        expect(bezKrytykaDla(a)).to.equal(null);
        await a.createEmbeddedDocuments("Item", [{ name: "Nie do zdarcia", type: "feat", flags: { [MODULE_ID]: { abilityId: "nie-do-zdarcia" } } }]);
        expect(bezKrytykaDla(a)).to.equal("Nie do zdarcia");
      });
    });

    describe("Na dokumentach", function () {
      it("Zawzięty sukinkot poza walką: 1 PW, czysty tor, zużyte użycie, koniec umierania", async function () {
        if (!game.user.isGM) this.skip();
        const a = await scratchActor({ system: { attributes: { hp: { value: 8, max: 8 } } } });
        await a.createEmbeddedDocuments("Item", [{
          name: "Zawzięty sukinkot", type: "feat",
          system: { uses: { max: "1", spent: 0, recovery: [{ period: "lr", type: "recoverAll" }] } },
          flags: { [MODULE_ID]: { originAbilityId: "zawziety-sukinkot" } }
        }]);
        await a.update({ "system.attributes.hp.value": 0 });
        await waitFor(() => stan(a) === "umierajacy", { label: "umierający" });
        await a.update({ "system.attributes.death.failure": 2 });
        const r = await zacisnijZeby(a);
        expect(r?.wstal, "poza walką — od razu").to.equal(true);
        await waitFor(() => stan(a) === "przytomny", { label: "przytomny" });
        expect(a.system.attributes.hp.value).to.equal(1);
        expect(a.system.attributes.death.failure).to.equal(0);
        expect(a.items.find(i => i.getFlag(MODULE_ID, "originAbilityId") === "zawziety-sukinkot").system.uses.value).to.equal(0);
        expect(await zacisnijZeby(a), "drugi raz — nie umiera, brak użycia").to.equal(null);
      });

      it("Łapiduch — reanimacja: martwy → umierający przy 0 PW", async function () {
        if (!game.user.isGM) this.skip();
        const a = await scratchActor({ system: { attributes: { hp: { value: 0, max: 8 } } } });
        await a.toggleStatusEffect("dead", { active: true });
        expect(await reanimuj(a, { kto: "Medyk" })).to.equal(true);
        await waitFor(() => stan(a) === "umierajacy", { label: "umierający" });
        expect(a.statuses.has("dead")).to.equal(false);
        expect(a.statuses.has("unconscious")).to.equal(true);
        expect(await reanimuj(a), "żywego się nie reanimuje").to.equal(false);
      });

      it("Bez tajemnic: nazwa, podatności, TT/PW/Szybkość z karty istoty", async function () {
        const a = await scratchActor({
          name: "Mutant testowy", type: "npc",
          system: { attributes: { hp: { value: 20, max: 20 } }, traits: { dv: { value: ["fire"] } } }
        });
        const w = wiedzaBezTajemnic(a);
        expect(w.nazwa).to.equal("Mutant testowy");
        expect(w.slabe).to.match(/podatności: /);
        expect(w.wspolczynniki).to.match(/^TT \d+, PW 20, Szybkość/);
      });
    });

    describe("Plakietki E7", function () {
      it("Nie do zdarcia i Krwawy anioł — pełne; Łapiduch, Zryw, Kłusownik, Bez tajemnic, Łyżeczka — częściowe", function () {
        expect(["nie-do-zdarcia", "krwawy-aniol"].map(featureStatus)).to.deep.equal(["auto", "auto"]);
        expect(["lapiduch", "zryw", "klusownik", "bez-tajemnic", "lyzeczka"].map(featureStatus))
          .to.deep.equal(["partial", "partial", "partial", "partial", "partial"]);
      });
    });
  }, { displayName: "Neuroshima: zdolności — karty MG i śmierć (M7 E7)" });
}
