/**
 * Neuroshima 5e — wsparcie sojusznika (PLAN_m7 E2, R7).
 *
 * Warstwa 1: tabela Let's rock (s. 74). Warstwa 4: Dobra rada — efekt na sojuszniku, przycisk pod jego rzutem (+INT
 * dającego), jedno użycie (D11); Łaska boża — reguły dnd5e: +1k4 do RO i ataku, RPŚ bez; karty RO Kakofonii i
 * „Rzuć broń i gleba” — skutek porażki i cofnięcie po zmianie wyniku; Kolejka — pole w oknie KO i kość przy KW;
 * źródło RO z karty aktywności (Przerażenie z natywnego RO).
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup } from "./helpers.mjs";
import { __testing as W, premiaLetsRock } from "../combat/zdolnosci-wsparcie.mjs";
import { uzyjZrodla, kontekstRzutu } from "../combat/po-rzucie.mjs";

export function registerZdolnosciWsparcieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.zdolnosci-wsparcie`, context => {
    const { describe, it, expect, before, after } = context;
    const start = Date.now();
    let cechy;
    const cecha = async (actor, id) => (await actor.createEmbeddedDocuments("Item",
      [game.items.fromCompendium(cechy.find(i => i.getFlag(MODULE_ID, "abilityId") === id))]))[0];
    const ostatnia = () => game.messages.contents.at(-1);
    const czekaj = ms => new Promise(r => setTimeout(r, ms));

    before(async () => {
      cechy = await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`).getDocuments();
    });
    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Let's rock — tabela (warstwa 1)", function () {
      it("5–9 +1, 10–14 +2, 15–19 +3, 20–24 +4, 25+ +5; poniżej 5 nic", function () {
        expect([4, 5, 9, 10, 14, 15, 20, 24, 25, 31].map(premiaLetsRock)).to.deep.equal([0, 1, 1, 2, 2, 3, 4, 4, 5, 5]);
      });
    });

    describe("Na aktorach i kartach (warstwa 4)", function () {
      it("Dobra rada: efekt na sojuszniku z pseudo-wygasaniem; przycisk +INT pod jego RO, jedno użycie", async function () {
        const spec = await scratchActor({ name: `${SCRATCH_PREFIX} Spec doradca`, system: { abilities: { int: { value: 16 } } } });
        const ally = await scratchActor({ name: `${SCRATCH_PREFIX} Słuchający` });
        const item = await cecha(spec, "dobra-rada");
        await W._dobraRada(spec, item, { actor: ally, name: ally.name });
        const e = ally.effects.find(x => x.getFlag(MODULE_ID, "dobraRada"));
        expect(e, "efekt na sojuszniku").to.be.ok;
        expect(e.getFlag(MODULE_ID, "dobraRada").bonus).to.equal(3);
        expect(e._source.duration.expiry).to.equal("sourceStart");
        expect(e.getSourceActor()?.id, "źródło — dający").to.equal(spec.id);
        await ally.rollSavingThrow({ ability: "wis" }, { configure: false }, { create: true });
        const src = ostatnia();
        expect(W.DOBRA_RADA.ocen.call(W.DOBRA_RADA, kontekstRzutu(src)).stan).to.equal("aktywny");
        const nowa = await uzyjZrodla("dobra-rada", src);
        expect(nowa.rolls[0].total).to.equal(src.rolls[0].total + 3);
        await czekaj(200);
        expect(ally.effects.some(x => x.getFlag(MODULE_ID, "dobraRada")), "jedno użycie — efekt zdjęty").to.equal(false);
      });

      it("Łaska boża: reguły dnd5e — +1k4 do RO i Testu Ataku; Test Cechy bez", async function () {
        const kaz = await scratchActor({ name: `${SCRATCH_PREFIX} Kaznodzieja` });
        const ally = await scratchActor({ name: `${SCRATCH_PREFIX} Wierny` });
        const item = await cecha(kaz, "laska-boza");
        await W._laskaBoza(kaz, item, [{ actor: ally, name: ally.name }]);
        const [ro] = await ally.rollSavingThrow({ ability: "con" }, { configure: false }, { create: false });
        expect(ro.formula).to.include("1d4");
        const [test] = await ally.rollAbilityCheck({ ability: "str" }, { configure: false }, { create: false });
        expect(test.formula).to.not.include("1d4");
        await W._laskaBoza(kaz, item, [{ actor: ally, name: ally.name }]);
        expect(ally.effects.filter(x => x.getFlag(MODULE_ID, "laskaBoza")), "ponowne natchnienie zastępuje").to.have.length(1);
      });

      it("Rzuć broń i gleba: porażka — Powalenie i Przerażenie (do końca tury Sędziego); zmiana na zdany cofa", async function () {
        const sedzia = await scratchActor({ name: `${SCRATCH_PREFIX} Sędzia` });
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} Gangus`, type: "npc" });
        const f = { rodzaj: "rzuc-bron", st: 12, zrodloUuid: sedzia.uuid };
        await W._skutekPorazki(cel, f);
        expect(cel.statuses.has("prone")).to.equal(true);
        const strach = cel.effects.find(e => e.statuses.has("frightened"));
        expect(strach?._source.duration.expiry).to.equal("sourceEnd");
        const message = await ChatMessage.implementation.create({ content: "RO", flags: { [MODULE_ID]: { m7RO: f } } });
        Hooks.callAll("neuroshima.rollModified", { message, roll: { total: 15 }, przed: 8, actor: cel, kind: "test" });
        await czekaj(400);
        expect(cel.statuses.has("prone")).to.equal(false);
        expect(cel.statuses.has("frightened")).to.equal(false);
      });

      it("Kakofonia: porażka — Obezwładnienie do początku tury wykonawcy", async function () {
        const gw = await scratchActor({ name: `${SCRATCH_PREFIX} Gwiazda` });
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} Słuchacz`, type: "npc" });
        await W._skutekPorazki(cel, { rodzaj: "kakofonia", st: 13, zrodloUuid: gw.uuid });
        const e = cel.effects.find(x => x.statuses.has("incapacitated"));
        expect(e?._source.duration.expiry).to.equal("sourceStart");
        expect(e.getSourceActor()?.id).to.equal(gw.id);
      });

      it("Kolejka: pole w oknie Krótkiego odpoczynku, zaznaczone — kość Kolejki przy Kości Wytrzymałości", async function () {
        const cw = await scratchActor({ name: `${SCRATCH_PREFIX} Cwaniak z bimbrem` });
        await cecha(cw, "kolejka");
        const pije = await scratchActor({ name: `${SCRATCH_PREFIX} Pijący` });
        void pije.shortRest({ dialog: true }).catch(() => null);
        let okno = null;
        for (let i = 0; i < 40 && !okno; i++) {
          await czekaj(100);
          okno = [...foundry.applications.instances.values()].find(a => (a.actor ?? a.document) === pije && a.element?.querySelector('input[name="neuroKolejka"]'));
        }
        try {
          expect(okno, "pole „Piję Kolejkę” w oknie KO").to.be.ok;
          const cfg = () => ({ subject: pije, rolls: [{ parts: ["1d8"], options: {} }] });
          const bez = cfg();
          W._onPreRollHitDie(bez);
          expect(bez.rolls[0].parts).to.deep.equal(["1d8"]);
          okno.element.querySelector('input[name="neuroKolejka"]').checked = true;
          const z = cfg();
          W._onPreRollHitDie(z);
          expect(z.rolls[0].parts).to.have.length(2);
          expect(z.rolls[0].parts[1]).to.match(/d\d+/);
          expect(z.rolls[0].options.neuroKolejka).to.equal(cw.name);
        } finally {
          await okno?.close();
        }
      });
    });
  });
}
