/**
 * Neuroshima 5e — Karta drużyny: blokada łupu i tempo podróży.
 *
 * Obie mechaniki żyją na aktorze typu `group`, stąd jeden plik. Sesję łupu w praktyce
 * wyzwalają hooki na `createItem`/`deleteItem`/`updateActor` (`party-loot-lock.mjs`), ale
 * testujemy wyłącznie eksportowaną, deterministyczną powierzchnię: `game.togglePause` i
 * prawdziwe okno `DialogV2.confirm` podstawiamy przez `stub()`, żeby test nie zapauzował
 * żywego stołu ani nie wyskoczył z dialogiem. Tam, gdzie flaga `lootSession` zamyka
 * WSZYSTKICH wymaganych graczy naraz, `_onSessionFlagChanged` sam odpala sprzątanie
 * (fire-and-forget) — dlatego sceanria z jednym wymaganym userem unikamy poza dedykowanym
 * testem `forceEndLootSession`, żeby nie ścigać się z asynchronicznym `_endSession`.
 */

import { isLootLocked, lootLockContext, confirmLootClose, forceEndLootSession } from "../actors/party-loot-lock.mjs";
import { buildTravelContext, setPodroz, postTravelSummary } from "../actors/party-travel.mjs";
import { MODULE_ID, scratchGroupActor, scratchCleanup, stub } from "./helpers.mjs";

export function registerPartyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.druzyna`, context => {
    const { describe, it, before, after, afterEach, expect } = context;

    let group;
    const restores = [];

    before(async function () {
      group = await scratchGroupActor();
    });

    after(async function () {
      await scratchCleanup();
    });

    afterEach(async function () {
      while (restores.length) restores.pop()();
      if (group.getFlag(MODULE_ID, "lootSession")) await group.unsetFlag(MODULE_ID, "lootSession");
      if (group.getFlag(MODULE_ID, "podroz")) await group.unsetFlag(MODULE_ID, "podroz");
      const ids = group.items.map(i => i.id);
      if (ids.length) await group.deleteEmbeddedDocuments("Item", ids, { render: false });
    });

    describe("Blokada łupu drużynowego", function () {
      it("bez sesji: `isLootLocked` fałsz, `lootLockContext` null", function () {
        expect(isLootLocked(group)).to.be.false;
        expect(lootLockContext(group)).to.be.null;
      });

      it("z aktywną, niedomkniętą sesją: kontekst liczy przedmioty i zamknięcia", async function () {
        await group.createEmbeddedDocuments("Item", [{ name: "[Quench] łup", type: "loot" }], { render: false });
        await group.setFlag(MODULE_ID, "lootSession",
          { active: true, requiredUserIds: [game.user.id, "quench-ktos-inny"], closedBy: { [game.user.id]: true } });

        expect(isLootLocked(group)).to.be.true;
        const ctx = lootLockContext(group);
        expect(ctx.itemCount).to.equal(1);
        expect(ctx.closedCount).to.equal(1);
        expect(ctx.totalCount).to.equal(2);
      });

      it("`confirmLootClose` przepuszcza bez pytania, gdy sesja nieaktywna albo gracz jej nie dotyczy", async function () {
        expect(await confirmLootClose(group), "brak sesji").to.be.true;

        await group.setFlag(MODULE_ID, "lootSession",
          { active: true, requiredUserIds: ["quench-ktos-inny"], closedBy: {} });
        expect(await confirmLootClose(group), "ten user nie jest wymagany").to.be.true;
      });

      it("`confirmLootClose` pyta i po potwierdzeniu zapisuje TYLKO własny klucz `closedBy`", async function () {
        // Drugi wymagany user, który nigdy nie zamyka — inaczej `_onSessionFlagChanged` uzna
        // sesję za w pełni zamkniętą i sam ją posprząta (real ChatMessage, race z asercją).
        await group.setFlag(MODULE_ID, "lootSession",
          { active: true, requiredUserIds: [game.user.id, "quench-ktos-inny"], closedBy: {} });
        let asked = false;
        restores.push(stub(foundry.applications.api.DialogV2, "confirm", async () => { asked = true; return true; }));

        const result = await confirmLootClose(group);

        expect(asked, "powinien był zapytać").to.be.true;
        expect(result).to.be.true;
        expect(group.getFlag(MODULE_ID, "lootSession").closedBy).to.deep.equal({ [game.user.id]: true });
      });

      it("`confirmLootClose` nic nie zapisuje, gdy gracz anuluje", async function () {
        await group.setFlag(MODULE_ID, "lootSession",
          { active: true, requiredUserIds: [game.user.id], closedBy: {} });
        restores.push(stub(foundry.applications.api.DialogV2, "confirm", async () => false));

        const result = await confirmLootClose(group);

        expect(result).to.be.false;
        expect(group.getFlag(MODULE_ID, "lootSession").closedBy).to.deep.equal({});
      });

      it("`forceEndLootSession` po potwierdzeniu kasuje resztę worka i zdejmuje flagę", async function () {
        await group.createEmbeddedDocuments("Item", [{ name: "[Quench] resztki", type: "loot" }], { render: false });
        await group.setFlag(MODULE_ID, "lootSession",
          { active: true, requiredUserIds: [game.user.id], closedBy: {} });
        restores.push(stub(foundry.applications.api.DialogV2, "confirm", async () => true));
        restores.push(stub(ChatMessage, "create", async () => null)); // nie zaśmiecamy czatu w teście

        await forceEndLootSession(group);

        expect(group.items.size).to.equal(0);
        expect(group.getFlag(MODULE_ID, "lootSession")).to.be.undefined;
      });

      it("`forceEndLootSession` nic nie kasuje, gdy MG anuluje", async function () {
        await group.createEmbeddedDocuments("Item", [{ name: "[Quench] ocalałe", type: "loot" }], { render: false });
        await group.setFlag(MODULE_ID, "lootSession",
          { active: true, requiredUserIds: [game.user.id], closedBy: {} });
        restores.push(stub(foundry.applications.api.DialogV2, "confirm", async () => false));

        await forceEndLootSession(group);

        expect(group.items.size).to.equal(1);
        expect(group.getFlag(MODULE_ID, "lootSession")?.active).to.be.true;
      });
    });

    describe("Podróż — trudny teren wymusza Powolne (regresja 2026-08-26)", function () {
      it("bez trudnego terenu: Normalne dostępne i wybrane; sufit transportu tnie Szybkie", async function () {
        await setPodroz(group, { transport: "pieszo", tempo: "normalne", trudnyTeren: false, biom: null });
        const ctx = buildTravelContext(group);
        const byId = Object.fromEntries(ctx.tempa.map(t => [t.id, t]));

        expect(ctx.tempo.id).to.equal("normalne");
        expect(byId.normalne).to.deep.include({ niedostepne: false, wybrany: true });
        expect(byId.szybkie.niedostepne, "pieszo nie jedzie szybciej niż Normalne").to.be.true;
      });

      it("z trudnym terenem: TYLKO Powolne dostępne, niezależnie od ustawionego tempa", async function () {
        await setPodroz(group, { transport: "pieszo", tempo: "normalne", trudnyTeren: true, biom: null });
        const ctx = buildTravelContext(group);
        const byId = Object.fromEntries(ctx.tempa.map(t => [t.id, t]));

        expect(ctx.tempo.id, "efektywne tempo musi być Powolne").to.equal("powolne");
        expect(ctx.dystans.godzina).to.equal(3);
        expect(byId.powolne).to.deep.include({ niedostepne: false, wybrany: true });
        for (const id of ["normalne", "szybkie", "bardzoSzybkie"]) {
          expect(byId[id].niedostepne, `${id} powinno być niedostępne`).to.be.true;
          expect(byId[id].wybrany, `${id} nie powinno wyglądać na wybrane`).to.be.false;
        }
      });

      it("`postTravelSummary` odmawia wyruszenia, dopóki łup nie jest podzielony", async function () {
        await setPodroz(group, { transport: "pieszo", tempo: "normalne", trudnyTeren: false, biom: null, trasa: 5 });
        await group.setFlag(MODULE_ID, "lootSession", { active: true, requiredUserIds: [game.user.id], closedBy: {} });
        let warned = null;
        restores.push(stub(ui.notifications, "warn", msg => { warned = String(msg); return null; }));
        restores.push(stub(ChatMessage, "create", async () => null));

        await postTravelSummary(group, "trasa");

        expect(warned, "powinien ostrzec zamiast wyruszyć").to.be.a("string");
        expect(group.getFlag(MODULE_ID, "podroz").aktywna, "podróż nie mogła wystartować").to.not.be.true;
      });

      it("blokuje wyruszenie graczowi, gdy gra zapauzowana z dowolnego innego powodu", async function () {
        await setPodroz(group, { transport: "pieszo", tempo: "normalne", trudnyTeren: false, biom: null, trasa: 5 });
        restores.push(stub(game, "paused", true));
        restores.push(stub(game.user, "isGM", false));
        let warned = null;
        restores.push(stub(ui.notifications, "warn", msg => { warned = String(msg); return null; }));
        let created = false;
        restores.push(stub(ChatMessage, "create", async () => { created = true; return null; }));

        await postTravelSummary(group, "trasa");

        expect(warned, "powinien ostrzec zamiast wyruszyć").to.be.a("string");
        expect(created, "nie powinien było wysłać podsumowania").to.be.false;
      });

      it("MG może wyruszyć mimo pauzy, a karta czatu dostaje guzik zatwierdzenia czasu", async function () {
        await setPodroz(group, { transport: "pieszo", tempo: "normalne", trudnyTeren: false, biom: null, trasa: 5 });
        restores.push(stub(game, "paused", true)); // game.user.isGM zostaje prawdziwe — test biegnie jako MG
        let created = null;
        restores.push(stub(ChatMessage, "create", async data => { created = data; return null; }));

        await postTravelSummary(group, "trasa");

        expect(created, "MG powinien móc wysłać podsumowanie mimo pauzy").to.not.be.null;
        expect(created.content).to.include("neuro-czas-uplynelo");
        // 5 km / 6 km/h = 0,8(3) h = 3000 s — dokładnie tyle ma przesunąć `game.time.advance`.
        expect(created.content).to.include('data-sekundy="3000"');
      });
    });
  });
}
