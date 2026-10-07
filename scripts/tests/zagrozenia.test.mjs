/**
 * Neuroshima 5e — zagrożenia środowiska na żywym aktorze (PLAN_m1_walka.md E7).
 *
 * Warstwa 3 (dokumenty): Przemarznięcie (ciepło ubrany, śpiwór, koc, ST z temperatury), doba bez
 * snu, Uduszenie (faza na statusie `suffocation`, koniec tury, obrażenia przy wstrzymanym oddechu,
 * złapanie oddechu zdejmuje wszystkie poziomy), przerzut porażki cofa jej skutek. Rzuty podstawione
 * (`stub`); okno MG i walka z prawdziwymi turami — e2e `zagrozenia`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, waitFor } from "./helpers.mjs";
import {
  przemarzniecie, dobaBezSnu, wstrzymajOddech, zlapOddech, stanOddechu, roOddechu, koniecTuryOddechu
} from "../actors/zagrozenia.mjs";
import { addExhaustion, zrodlaWyczerpania } from "../config/exhaustion.mjs";

const klucze = actor => zrodlaWyczerpania(actor).map(s => s.source);

/** Podstawiony RO: kolejne wyniki z listy; zapisuje konfigurację każdego wywołania. */
function rzuty(actor, wyniki) {
  const wywolania = [];
  const restore = stub(actor, "rollSavingThrow", async config => {
    wywolania.push(config);
    return [{ total: wyniki[wywolania.length - 1] ?? 1 }];
  });
  return { wywolania, restore };
}

export function registerZagrozeniaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.zagrozenia`, context => {
    const { describe, it, expect, after, afterEach } = context;
    const przywroc = [];

    afterEach(() => { while (przywroc.length) przywroc.pop()(); });
    after(async () => {
      const smieci = game.messages.filter(m => String(m.speaker?.alias ?? "").startsWith(SCRATCH_PREFIX)
        || /neuro-zagrozenie-card/.test(m.content ?? "") && /\[Quench\]/.test(m.content ?? "")).map(m => m.id);
      if (smieci.length) await ChatMessage.deleteDocuments(smieci);
      await scratchCleanup();
    });

    const postac = (extra = {}) => scratchActor(foundry.utils.mergeObject(
      { system: { attributes: { hp: { value: 10, max: 10 } } } }, extra));

    describe("Przemarznięcie (s. 258)", function () {
      it("RO co godzinę z ST z temperatury; porażka — poziom Przemarznięcia", async function () {
        const a = await postac();
        const r = rzuty(a, [20, 3, 9]);
        przywroc.push(r.restore);
        const [w] = await przemarzniecie([{ actor: a }], { tempC: -8, godziny: 3 });
        expect(r.wywolania.map(c => c.target)).to.deep.equal([13, 13, 13]);
        expect(w.porazki).to.equal(2);
        expect(klucze(a)).to.deep.equal(["przemarznie", "przemarznie"]);
      });

      it("ciepło ubrany — bez rzutu; śpiwór — bez rzutu, bez Wyczerpania; koc — Ułatwienie", async function () {
        const a = await postac();
        const b = await postac();
        const c = await postac();
        const ra = rzuty(a, []); const rb = rzuty(b, []); const rc = rzuty(c, [20]);
        przywroc.push(ra.restore, rb.restore, rc.restore);
        await przemarzniecie([{ actor: a, cieplo: true }, { actor: b, spiwor: true }, { actor: c, koc: true }], { tempC: -3, godziny: 1 });
        expect([ra.wywolania.length, rb.wywolania.length]).to.deep.equal([0, 0]);
        expect(klucze(b)).to.deep.equal([]);
        expect(rc.wywolania[0].advantage).to.equal(true);
      });
    });

    describe("Doba bez snu (s. 45)", function () {
      it("RO ST 20; porażka — Bezsenność, sukces — nic", async function () {
        const a = await postac();
        const b = await postac();
        const ra = rzuty(a, [19]); const rb = rzuty(b, [20]);
        przywroc.push(ra.restore, rb.restore);
        await dobaBezSnu([a, b]);
        expect(ra.wywolania[0].target).to.equal(20);
        expect(klucze(a)).to.deep.equal(["bezsennosc"]);
        expect(klucze(b)).to.deep.equal([]);
      });

      it("Fuks zamienia porażkę w sukces — poziom Bezsenności schodzi", async function () {
        const a = await postac();
        await addExhaustion(a, "bezsennosc", { chat: false });
        const msg = await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: a }),
          rolls: [await new Roll("12").evaluate()],
          flags: { [MODULE_ID]: { zagrozenieRzut: { rodzaj: "sen", zrodlo: "bezsennosc", actorUuid: a.uuid, st: 20 } } }
        });
        Hooks.callAll("neuroshima.rerolled", { message: msg, roll: { total: 21 }, kind: "fuks", actor: a });
        await waitFor(() => !klucze(a).length, { label: "Bezsenność cofnięta" });
      });
    });

    describe("Uduszenie (s. 194, 259)", function () {
      it("wstrzymanie oddechu: 1 + mod. KON minut w turach; „dusi się” od razu", async function () {
        const a = await postac({ system: { abilities: { con: { value: 14 } } } });
        await wstrzymajOddech(a);
        expect(stanOddechu(a)).to.include({ faza: "oddech", tury: 30 });
        expect(a.statuses.has("suffocation")).to.equal(true);
        await wstrzymajOddech(a, { dusi: true });
        expect(stanOddechu(a)).to.include({ faza: "dusi" });
        expect(a.effects.filter(e => e.statuses.has("suffocation"))).to.have.length(1);
      });

      it("złapanie oddechu zdejmuje wszystkie poziomy z duszenia, inne zostają", async function () {
        const a = await postac();
        await wstrzymajOddech(a, { dusi: true });
        for (const k of ["uduszenie", "kac", "uduszenie"]) await addExhaustion(a, k, { chat: false });
        await zlapOddech(a);
        await waitFor(() => klucze(a).length === 1, { label: "Uduszenie zdjęte" });
        expect(klucze(a)).to.deep.equal(["kac"]);
        expect(stanOddechu(a)).to.equal(null);
      });

      it("koniec tury w walce: odliczanie, potem +1 Wyczerpanie co turę", async function () {
        const a = await postac();
        await wstrzymajOddech(a);
        await a.effects.find(e => e.statuses.has("suffocation")).update({ [`flags.${MODULE_ID}.oddech.tury`]: 1 });
        await koniecTuryOddechu(a);
        expect(stanOddechu(a)?.faza).to.equal("dusi");
        expect(klucze(a), "pierwsza tura bez powietrza dopiero przed nami").to.deep.equal([]);
        await koniecTuryOddechu(a);
        expect(klucze(a)).to.deep.equal(["uduszenie"]);
      });

      it("obrażenia przy wstrzymanym oddechu: karta; oblany RO ST 10 — dusi się", async function () {
        const a = await postac();
        await wstrzymajOddech(a);
        await a.applyDamage([{ value: 2, type: "bludgeoning" }]);
        await waitFor(() => stanOddechu(a)?.karta, { label: "karta RO" });
        const r = rzuty(a, [9]);
        przywroc.push(r.restore);
        expect(await roOddechu(a)).to.deep.equal({ sukces: false });
        expect(r.wywolania[0].target).to.equal(10);
        expect(stanOddechu(a)).to.include({ faza: "dusi", karta: null });
      });
    });
  }, { displayName: "Neuroshima: Zagrożenia — mróz, sen, Uduszenie (M1 E7)" });
}
