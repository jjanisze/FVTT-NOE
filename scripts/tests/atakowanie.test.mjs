/**
 * Neuroshima 5e — Atakowanie w ledgerze M8 (PLAN_m8_ruch_i_ekonomia_akcji §7, E6; §11 T30–T34, T36, T37, T41).
 *
 * Warstwa 1: instancje Atakowania ze slotami (Drugi/Trzeci atak), D22, kolejność wyboru domyślnego, źródła B
 * (posiadane/zweryfikowane), łączny koszt z Przycelowaniem, R poza turą, koszt już zapłacony.
 * Warstwa 4: prawdziwy rzut ataku dnd5e w walce — koszt zapisany po konfiguracji i przed oceną (opakowanie
 * `buildEvaluate`), plakietka na karcie, kontynuacja przy Drugim ataku, anulowanie bez kosztu, sloty z kompendium.
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, walkaTestowa, waitFor } from "./helpers.mjs";
import * as E from "../config/ekonomia-data.mjs";
import { ledger, kombatant, stan } from "../combat/ekonomia.mjs";
import { slotyAtaku, FLAGA_ATAKU } from "../combat/atakowanie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const wl = r => ({ runda: r, cykl: r, wlasna: true, reakcja: null });
const po = r => ({ runda: r, cykl: r, wlasna: false, reakcja: null });
let _n = 0;
const id = () => `a${++_n}`;
const zCh = (l, ch) => ({ ...ch, reakcja: ch.reakcja ?? E.aktywnaReakcja(l, ch.cykl)?.id ?? null });
/** Jedna próba ataku z domyślnym wyborem; zwraca `{opcja, z, w}`. */
function atak(l, ch, { sloty = 1, zrodlaB = [], dodatkiB = 0, jawne = null, oplacone = null } = {}) {
  const c = zCh(l, ch);
  const opcje = E.zrodlaAtaku(l, c, { sloty, zrodlaB, oplacone });
  const opcja = E.domyslneZrodlo(opcje, { jawne, pule: E.pule(l, c), dodatkiB });
  const z = E.zadanieAtaku(l, c, { opcja, sloty, dodatkiB, label: opcje.find(o => o.id === opcja)?.label });
  const w = E.zastosuj(l, c, { id: id(), ...z }).wynik;
  return { opcja, z, w, opcje };
}
const NOZ = { id: "nozownik", label: "Nożownik", zweryfikowane: true };
const PROMOCJA = { id: "promocja", label: "Promocja", zweryfikowane: true };

export function registerAtakowanieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.atakowanie`, context => {
    const { describe, it, expect, before, after } = context;
    const start = Date.now();

    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Instancje i wybór (warstwa 1)", function () {
      it("T30: Drugi atak — atak, ruch, atak to jedna A i dwa sloty; trzecia próba nową A z ostrzeżeniem", function () {
        const l = E.pustyLedger("w");
        const a1 = atak(l, wl(1), { sloty: 2 });
        expect([a1.opcja, a1.z.koszt]).to.deep.equal(["nowaA", { A: 1 }]);
        const a2 = atak(l, wl(1), { sloty: 2 });
        expect([a2.opcja, a2.z.koszt]).to.deep.equal(["kontynuacja", {}]);
        expect(l.ataki[0]).to.include({ sloty: 2, uzyte: 2 });
        const a3 = atak(l, wl(1), { sloty: 2 });
        expect(a3.opcja).to.equal("nowaA");
        expect(a3.w.ostrz.join(" ")).to.match(/Akcja ponad pulę/);
        expect(E.pule(l, wl(1)).A.pozostalo).to.equal(-1);
      });

      it("T31/D22: atak 1/2 → inna opłacona A → atak 2/2 kontynuuje; Zryw A — cztery ataki to dwie A", function () {
        const l = E.pustyLedger("w");
        atak(l, wl(1), { sloty: 2 });
        E.zastosuj(l, wl(1), { id: id(), zrodlo: "Pomaganie", koszt: { A: 1 } });
        const a2 = atak(l, wl(1), { sloty: 2 });
        expect(a2.opcja, "instancja nie zamknięta przez inną A").to.equal("kontynuacja");
        const l2 = E.pustyLedger("w");
        E.zastosuj(l2, wl(1), { id: id(), rodzaj: "grant", zrodlo: "Zryw", koszt: {}, grant: { typ: "A", ile: 1 } });
        const opcje = [1, 2, 3, 4].map(() => atak(l2, wl(1), { sloty: 2 }).opcja);
        expect(opcje).to.deep.equal(["nowaA", "kontynuacja", "nowaA", "kontynuacja"]);
        expect(E.pule(l2, wl(1)).A).to.include({ pozostalo: 0, pojemnosc: 2 });
      });

      it("T32: A 0/1, ale slot został — kontynuacja; bez A i slotów — zweryfikowane B; bez B — nowa A z ostrzeżeniem", function () {
        const l = E.pustyLedger("w");
        atak(l, wl(1), { sloty: 2 });
        expect(atak(l, wl(1), { sloty: 2, zrodlaB: [NOZ] }).opcja, "slot przed B").to.equal("kontynuacja");
        expect(atak(l, wl(1), { sloty: 2, zrodlaB: [NOZ] }).opcja, "brak A i slotów → zweryfikowany Nożownik").to.equal("B:nozownik");
        const b2 = atak(l, wl(1), { sloty: 2, zrodlaB: [NOZ] });
        expect(b2.opcja, "B już wydane → nowa A, nie niedozwolone B").to.equal("nowaA");
        // Ograniczona A (Szybkie ręce) nie udaje zwykłej: Atakowanie płaci zwykłą A.
        const l2 = E.pustyLedger("w");
        E.zastosuj(l2, wl(1), { id: id(), rodzaj: "grant", zrodlo: "Szybkie ręce", koszt: {}, grant: { typ: "A", ile: 1, ogr: "uzywanie" } });
        atak(l2, wl(1));
        const a = atak(l2, wl(1));
        expect(a.w.ostrz.join(" "), "ograniczona A nie finansuje ataku").to.match(/Akcja ponad pulę/);
        expect(E.pule(l2, wl(1)).A.ogr.uzywanie).to.deep.equal({ pojemnosc: 1, wydane: 0 });
      });

      it("T33/T34: nieposiadane źródło — brak opcji; niezweryfikowane — wybieralne, nie domyślne; Nożownik przed Promocją", function () {
        const l = E.pustyLedger("w");
        expect(E.zrodlaAtaku(l, wl(1), {}).map(o => o.id), "bez zdolności").to.deep.equal(["nowaA"]);
        atak(l, wl(1));
        const niezw = { ...PROMOCJA, zweryfikowane: false, ostrz: ["Promocja — tylko w Berserku (s. 70)."] };
        const r = atak(l, wl(1), { zrodlaB: [niezw] });
        expect(r.opcja, "niezweryfikowana Promocja nie jest domyślna").to.equal("nowaA");
        expect(r.opcje.find(o => o.id === "B:promocja").ostrz[0]).to.match(/Berserku/);
        const l2 = E.pustyLedger("w");
        atak(l2, wl(1));
        expect(atak(l2, wl(1), { zrodlaB: [PROMOCJA, NOZ] }).opcja, "D13: Nożownik wśród zweryfikowanych").to.equal("B:nozownik");
      });

      it("T36: łączny koszt — nowa A + Przycelowanie = A+B; kontynuacja + Przycelowanie = B; Nożownik + Przycelowanie = 2B", function () {
        const l = E.pustyLedger("w");
        expect(atak(l, wl(1), { sloty: 2, dodatkiB: 1 }).z.koszt).to.deep.equal({ A: 1, B: 1 });
        expect(atak(l, wl(1), { sloty: 2, dodatkiB: 1 }).z.koszt).to.deep.equal({ B: 1 });
        const l2 = E.pustyLedger("w");
        const z = E.zadanieAtaku(l2, wl(1), { opcja: "B:nozownik", label: "Nożownik", dodatkiB: 1 });
        expect(z.koszt).to.deep.equal({ B: 2 });
        expect(E.domyslneZrodlo(E.zrodlaAtaku(l2, wl(1), { zrodlaB: [NOZ] }), { pule: { A: { pozostalo: 0 }, B: { pozostalo: 1 } }, dodatkiB: 1 }),
          "2B przy jednej B — nie podstawia B, by ukryć przekroczenie").to.equal("nowaA");
      });

      it("T41: atak poza turą — R (bez slotów tury); w otwartej reakcji bez akcji — bez drugiej R; koszt już zapłacony — 0", function () {
        const l = E.pustyLedger("w");
        const r = atak(l, po(1), { sloty: 2 });
        expect([r.opcja, r.z.koszt]).to.deep.equal(["R", { R: 1 }]);
        expect(l.ataki, "R nie otwiera instancji Atakowania").to.deep.equal([]);
        const l2 = E.pustyLedger("w");
        E.zastosuj(l2, po(1), { id: id(), ...E.zadanieReakcji(l2, po(1), {}).zadanie });
        expect(atak(l2, po(1)).z.koszt, "otwarta reakcja").to.deep.equal({});
        const l3 = E.pustyLedger("w");
        const o = atak(l3, wl(1), { oplacone: { label: "Zamaszysty cios" } });
        expect([o.opcja, o.z.koszt]).to.deep.equal(["oplacone", {}]);
      });
    });

    describe("Prawdziwy rzut ataku (warstwa 4)", function () {
      this.timeout(30000);
      let cechy, bronie;
      before(async () => {
        cechy = await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`).getDocuments();
        bronie = await game.packs.get(`${MODULE_ID}.bron`).getDocuments();
      });
      const cecha = async (actor, aid) => (await actor.createEmbeddedDocuments("Item",
        [game.items.fromCompendium(cechy.find(i => i.getFlag(MODULE_ID, "abilityId") === aid))]))[0];
      const noz = async actor => (await actor.createEmbeddedDocuments("Item",
        [game.items.fromCompendium(bronie.find(i => i.getFlag(MODULE_ID, "weaponId") === "sztylet"))]))[0];
      const aktywnosc = item => item.system.activities.find(a => a.type === "attack");

      it("Drugi atak z kompendium: 2 sloty; atak → nowa A (plakietka), atak → kontynuacja; anulowanie w haku — bez kosztu", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Atakujący M8` });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Cel ataku M8` });
        await cecha(pc, "drugi-atak");
        expect(slotyAtaku(pc)).to.equal(2);
        const sztylet = await noz(pc);
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-atak" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          const c = kombatant(tok);
          await waitFor(() => ledger(c).tury.length > 0, { label: "tura" });
          // Anulowanie przez końcowy hak konfiguracji: pusta tablica rzutów — nie próba, bez kosztu (§7.5).
          Hooks.once("dnd5e.postAttackRollConfiguration", () => false);
          await aktywnosc(sztylet).rollAttack({}, { configure: false }, { create: true });
          expect(ledger(c).ops.length, "anulowany rzut nic nie kosztuje").to.equal(0);
          const przed = game.messages.size;
          await aktywnosc(sztylet).rollAttack({}, { configure: false }, { create: true });
          const m1 = await waitFor(() => game.messages.contents.slice(przed).find(m => m.getFlag(MODULE_ID, FLAGA_ATAKU)), { label: "karta ataku z kosztem" });
          expect(m1.getFlag(MODULE_ID, FLAGA_ATAKU)).to.deep.include({ opcja: "nowaA", koszt: { A: 1 } });
          expect(stan(tok).pule.A.wydane).to.equal(1);
          const przed2 = game.messages.size;
          await aktywnosc(sztylet).rollAttack({}, { configure: false }, { create: true });
          const m2 = await waitFor(() => game.messages.contents.slice(przed2).find(m => m.getFlag(MODULE_ID, FLAGA_ATAKU)), { label: "druga karta" });
          expect(m2.getFlag(MODULE_ID, FLAGA_ATAKU)).to.deep.include({ opcja: "kontynuacja", koszt: {} });
          expect(m2.getFlag(MODULE_ID, FLAGA_ATAKU).atak).to.include({ slot: 2 });
          expect(stan(tok).pule.A.wydane, "dwa ataki — jedna A").to.equal(1);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("E4/T26: lalka w walce — dobycie z kabury [I]; druga interakcja to Używanie [A]; z plecaka — Akcja", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Lalka M8` });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Obok lalki M8` });
        const [gun] = await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(bronie.find(i => i.getFlag(MODULE_ID, "weaponId") === "b92"))]);
        const lalka = game.neuroshima.lalka;
        expect(await lalka.place(pc, gun, "ranged.0", { quiet: true }), "kabura przed walką").to.equal(true);
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-lalka" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          await waitFor(() => ledger(kombatant(tok)).tury.length > 0, { label: "tura" });
          await lalka.place(pc, pc.items.get(gun.id), "hand.0");
          await waitFor(() => stan(tok).pule.I.wydane === 1, { label: "dobycie = [I]" });
          expect(stan(tok).pule.A.wydane).to.equal(0);
          await lalka.place(pc, pc.items.get(gun.id), "ranged.0");
          await waitFor(() => stan(tok).pule.A.wydane === 1, { label: "druga interakcja = Używanie" });
          expect(stan(tok).ledger.ops.at(-1).zrodlo).to.match(/Używanie/);
          const [noz] = await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(bronie.find(i => i.getFlag(MODULE_ID, "weaponId") === "sztylet"))]);
          await lalka.place(pc, pc.items.get(noz.id), "pack", { quiet: true });
          const przed = stan(tok).pule.A.wydane;
          await lalka.place(pc, pc.items.get(noz.id), "hand.1");
          await waitFor(() => stan(tok).pule.A.wydane === przed + 1, { label: "z plecaka = Akcja" });
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("T41: atak poza własną turą idzie w R; karta mówi „W Reakcji”", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Okazyjny M8` });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Na turze atak M8` });
        const sztylet = await noz(pc);
        const w = await walkaTestowa([inny, pc], { kto: inny, nazwa: "m8-atak-r" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          const przed = game.messages.size;
          await aktywnosc(sztylet).rollAttack({}, { configure: false }, { create: true });
          const m = await waitFor(() => game.messages.contents.slice(przed).find(x => x.getFlag(MODULE_ID, FLAGA_ATAKU)), { label: "karta" });
          expect(m.getFlag(MODULE_ID, FLAGA_ATAKU)).to.deep.include({ opcja: "R", koszt: { R: 1 } });
          expect(stan(tok).pule.A.wydane, "bez A poza turą").to.equal(0);
        } finally {
          r();
          await w.sprzatnij();
        }
      });
    });
  });
}
