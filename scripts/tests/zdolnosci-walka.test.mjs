/**
 * Neuroshima 5e — walka z kontekstem (PLAN_m7 E4, R4 + R5), warstwa 4 — na aktorach testowych.
 *
 * Mój wróg wobec kategorii celu; Rzeźnik z lalką (pusta druga ręka, druga broń); Zabójcza spluwa na rewolwerze;
 * Trajektoria pod Testem Ataku dystansowym (+INT, licznik); Celowanie — efekt tury właściciela, zużyty tylko przez
 * atak, w którym był jedynym Ułatwieniem; Strzelec w migawce ataku i deklaracja stanowiska (karta MG od razu poza
 * walką, po 5 rundach w walce; zatwierdzenie nakłada status); Ulubiona broń — model i lista; Słaby punkt —
 * efekt na maszynie, bez dubla, zdjęty po Długim odpoczynku. Po trafieniu (E5): Bolesny atak (spust, kości, krytyk),
 * Podstępny atak (Spowolnienie i Oślepienie bez kumulacji, Krwawienie z profilem, nie na maszynie), Skuteczny cios
 * (kość Wściekłego ciosu, limit rundy). Dziennik ataków (Dwóch na jednego), przyciski [B] i
 * dodatkowy atak — e2e `zdolnosci-walka`; okno D13 i reszta czystych reguł — `okolicznosci.test.mjs`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, walkaTestowa } from "./helpers.mjs";
import { __testing as W, mojWrogPrzeciw, premieObrazen, FLAG_CELOWANIE, FLAG_SLABY_PUNKT } from "../combat/zdolnosci-walka.mjs";
import {
  __testing as A, modelBroni, ulubionaDla, FLAG_ULUBIONE, sprawdzMierzenie, zatwierdzStanowisko
} from "../combat/zdolnosci-akcje.mjs";
import { __testing as P } from "../combat/zdolnosci-po-rzucie.mjs";
import { uzyjZrodla, kontekstRzutu } from "../combat/po-rzucie.mjs";
import { jestEfektemTuryWlasciciela } from "../combat/czas-efektu.mjs";
import { migawkaAtaku, STANOWISKO_SNAJPERSKIE } from "../combat/okolicznosci.mjs";
import { isRevolver } from "../actors/rewolwerowiec.mjs";
import * as mags from "../weapons/magazine-model.mjs";
import { bolesny, uzyjBolesnego, uzyjPodstepnego, skuteczny, FLAG_PODSTEPNY } from "../combat/zdolnosci-trafienie.mjs";
import { isBleeding, bleedProfile } from "../combat/bleeding.mjs";

export function registerZdolnosciWalkaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.zdolnosci-walka`, context => {
    const { describe, it, expect, before, after } = context;
    const start = Date.now();
    let cechy, bronie, magazynki;
    const cecha = async (actor, id) => (await actor.createEmbeddedDocuments("Item",
      [game.items.fromCompendium(cechy.find(i => i.getFlag(MODULE_ID, "abilityId") === id))]))[0];
    const bron = async (actor, test) => (await actor.createEmbeddedDocuments("Item",
      [game.items.fromCompendium(bronie.find(test))]))[0];
    const atak = item => item.system.activities.find(a => a.type === "attack");
    const npc = (name, typ) => scratchActor({ name: `${SCRATCH_PREFIX} ${name}`, type: "npc", system: { details: { type: { value: typ } } } });

    before(async () => {
      cechy = await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`).getDocuments();
      bronie = await game.packs.get(`${MODULE_ID}.bron`).getDocuments();
      magazynki = await game.packs.get(`${MODULE_ID}.magazynki`).getDocuments();
    });
    /** Pełny magazynek 9 mm wpięty w broń — jak fixture `skirmish` (pusta broń nie strzela). */
    const naladuj = async (actor, gun) => {
      const magwell = mags.weaponMagwell(gun);
      const [mag] = await actor.createEmbeddedDocuments("Item",
        [game.items.fromCompendium(magazynki.find(m => mags.magazineDefOf(m)?.magwell === magwell))]);
      await mags.loadRounds(mag, "9mm", mags.freeSpace(mag));
      await mags.swapMagazineItem(gun, mag);
    };
    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Premie liczbowe", function () {
      it("Mój wróg: Potwory — +1/1k6 przeciw Potworowi, nic przeciw Człowiekowi", async function () {
        const zw = await scratchActor({ name: `${SCRATCH_PREFIX} Zwiadowca` });
        await cecha(zw, "moj-wrog-potwory");
        const p = mojWrogPrzeciw(zw, await npc("Neodźwiedź", "Potwór"));
        expect(p).to.include({ atak: 1, obrazenia: "1d6" });
        expect(p.label).to.contain("Potwory");
        expect(mojWrogPrzeciw(zw, await npc("Gangus", "Człowiek"))).to.equal(null);
      });

      it("Rzeźnik: +3 z pustą drugą ręką; druga broń w drugiej ręce — bez premii", async function () {
        const tw = await scratchActor({ name: `${SCRATCH_PREFIX} Rzeźnik` });
        await cecha(tw, "rzeznik");
        const noz = await bron(tw, i => i.type === "weapon" && i.system.type?.value === "biala" && !i.system.properties?.has?.("two"));
        const lalka = game.neuroshima.lalka;
        await lalka.place(tw, noz, "hand");
        expect(premieObrazen(atak(noz)).map(p => p.id), "pusta druga ręka").to.include("rzeznik");
        const drugi = await bron(tw, i => i.type === "weapon" && i.system.type?.value === "biala" && i.name !== noz.name
          && !i.system.properties?.has?.("two"));
        await lalka.place(tw, drugi, "hand");
        expect(lalka.heldItems(tw).filter(h => h.item).length, "dwie bronie w rękach").to.equal(2);
        expect(premieObrazen(atak(noz)).map(p => p.id), "druga broń").to.not.include("rzeznik");
      });

      it("Zabójcza spluwa: rewolwer Clinta — jedna kość z formuły", async function () {
        const kow = await scratchActor({ name: `${SCRATCH_PREFIX} Kowboj` });
        await cecha(kow, "clint");
        const rew = await bron(kow, i => isRevolver(i));
        const p = premieObrazen(atak(rew), { formula: "1d8 + @mod" }).find(x => x.id === "zabojcza-spluwa");
        expect(p?.czesc).to.equal("1d8");
        const pistolet = await bron(kow, i => i.type === "weapon" && i.system.type?.value === "palnaKrotka" && !isRevolver(i));
        expect(premieObrazen(atak(pistolet), { formula: "1d8" }).map(x => x.id), "nie rewolwer").to.not.include("zabojcza-spluwa");
      });
    });

    describe("Trajektoria (po rzucie)", function () {
      it("pod Testem Ataku dystansowym: +INT, zużywa użycie; bez INT > 0 — ukryta", async function () {
        const spec = await scratchActor({ name: `${SCRATCH_PREFIX} Spec balistyk`, system: { abilities: { int: { value: 16 } } } });
        const item = await cecha(spec, "trajektoria");
        const pistolet = await bron(spec, i => i.getFlag(MODULE_ID, "weaponId") === "b92");
        await naladuj(spec, pistolet);
        await atak(pistolet).rollAttack({}, { configure: false }, { create: true });
        const src = game.messages.contents.at(-1);
        const ctx = kontekstRzutu(src);
        expect(P.TRAJEKTORIA.ocen.call(P.TRAJEKTORIA, ctx).stan).to.equal("aktywny");
        const nowa = await uzyjZrodla("trajektoria", src);
        expect(nowa.rolls[0].total).to.equal(src.rolls[0].total + 3);
        expect(Number(item.system.uses.spent)).to.equal(1);
        await spec.update({ "system.abilities.int.value": 10 });
        expect(P.TRAJEKTORIA.ocen.call(P.TRAJEKTORIA, kontekstRzutu(src)).stan, "mod. INT 0").to.equal("ukryty");
      });
    });

    describe("Celowanie i limity Ułatwień", function () {
      it("efekt tury właściciela; zużywa go atak, w którym był jedynym Ułatwieniem", async function () {
        const zab = await scratchActor({ name: `${SCRATCH_PREFIX} Zabójca` });
        const item = await cecha(zab, "jeden-strzal");
        expect(item.system.activities.find(a => a.name === "Celowanie")?.activation?.type, "aktywność [B]").to.equal("bonus");
        await A._celowanie(zab, item);
        const e = zab.effects.find(x => x.getFlag(MODULE_ID, FLAG_CELOWANIE));
        expect(e, "efekt Celowania").to.be.ok;
        expect(jestEfektemTuryWlasciciela(e), "do początku tury właściciela").to.equal(true);
        const ADV = CONFIG.Dice.D20Roll.ADV_MODE;
        const rzut = (ulatwienia, tryb = ADV.ADVANTAGE) => [{ options: { advantageMode: tryb, neuroOkolicznosci: { ulatwienia } } }];
        await W._onRollAttack(rzut([{ id: "celowanie" }, { id: "celPowalonyBlisko" }]), { subject: { actor: zab } });
        expect(zab.effects.some(x => x.getFlag(MODULE_ID, FLAG_CELOWANIE)), "inne Ułatwienie — zostaje").to.equal(true);
        await W._onRollAttack(rzut([{ id: "celowanie" }], ADV.NORMAL), { subject: { actor: zab } });
        expect(zab.effects.some(x => x.getFlag(MODULE_ID, FLAG_CELOWANIE)), "zniesione — zostaje").to.equal(true);
        await W._onRollAttack(rzut([{ id: "celowanie" }]), { subject: { actor: zab } });
        expect(zab.effects.some(x => x.getFlag(MODULE_ID, FLAG_CELOWANIE)), "zużyte").to.equal(false);
      });

      it("Promocja: aktywność [B] na Maszynie do zabijania; poza Berserkiem — blokada", async function () {
        const naj = await scratchActor({ name: `${SCRATCH_PREFIX} Najemnik` });
        const item = await cecha(naj, "maszyna-do-zabijania");
        const akt = item.system.activities.find(a => a.name === "Promocja");
        expect(akt?.activation?.type).to.equal("bonus");
        const warn = ui.notifications.warn;
        let ostrzezenie = null;
        ui.notifications.warn = msg => { ostrzezenie = msg; };
        try {
          expect(await akt.use({}, { configure: false }, { create: false })).to.equal(undefined);
        } finally {
          ui.notifications.warn = warn;
        }
        expect(ostrzezenie).to.contain("Berserku");
      });
    });

    describe("Strzelec w migawce ataku", function () {
      it("snajper tylko ze statusem, celownikiem optycznym i zdolnością", async function () {
        const zab = await scratchActor({ name: `${SCRATCH_PREFIX} Snajper` });
        const kar = await bron(zab, i => i.type === "weapon" && i.system.type?.value === "palnaDluga");
        const snajper = () => migawkaAtaku(atak(kar)).migawka.bron?.snajper;
        await zab.toggleStatusEffect(STANOWISKO_SNAJPERSKIE, { active: true });
        await kar.setFlag(MODULE_ID, "addons", [{ id: "celownik-optyczny", delta: {} }]);
        expect(snajper(), "bez zdolności").to.equal(false);
        await cecha(zab, "strzelec");
        expect(snajper(), "status + celownik + Strzelec").to.equal(true);
        await zab.toggleStatusEffect(STANOWISKO_SNAJPERSKIE, { active: false });
        expect(snajper(), "bez statusu").to.equal(false);
      });

      it("deklaracja gracza: aktywność; poza walką karta MG od razu, zatwierdzenie nakłada status (U20)", async function () {
        const zab = await scratchActor({ name: `${SCRATCH_PREFIX} Snajper deklaruje` });
        const item = await cecha(zab, "strzelec");
        expect(item.system.activities.find(a => a.name === "Stanowisko snajperskie")?.activation?.type).to.equal("special");
        const kar = await bron(zab, i => i.type === "weapon" && i.system.type?.value === "palnaDluga");
        expect(A._bronSnajperska(zab), "bez celownika").to.equal(null);
        await kar.setFlag(MODULE_ID, "addons", [{ id: "celownik-optyczny", delta: {} }]);
        await game.neuroshima.lalka.place(zab, kar, "hand");
        expect(A._bronSnajperska(zab)?.id, "celownik w ręce").to.equal(kar.id);
        const przed = game.messages.size;
        await A._mierzenie(zab);
        const karta = game.messages.contents.slice(przed).find(m => m.content.includes(`data-neuro-m7-stanowisko="${zab.uuid}"`));
        expect(karta, "karta z przyciskiem").to.be.ok;
        expect(karta.whisper.every(id => game.users.get(id)?.isGM), "tylko MG").to.equal(true);
        await zatwierdzStanowisko(zab);
        expect(zab.statuses.has(STANOWISKO_SNAJPERSKIE)).to.equal(true);
      });

      it("w walce: przycisk dopiero po 5 rundach mierzenia, raz", async function () {
        const zab = await scratchActor({ name: `${SCRATCH_PREFIX} Snajper w walce` });
        const walka = await walkaTestowa([zab], { nazwa: "strzelec" });
        try {
          const { combat } = walka;
          const efekt = round => zab.createEmbeddedDocuments("ActiveEffect", [{
            name: "Mierzenie (Strzelec)", img: "icons/svg/target.svg", type: "base",
            flags: { [MODULE_ID]: { [A.FLAG_MIERZENIE]: { combatId: combat.id, round, zgloszone: false } } }
          }]);
          const karty = () => game.messages.filter(m => m.content.includes(`data-neuro-m7-stanowisko="${zab.uuid}"`)).length;
          await efekt(combat.round - 4);
          await sprawdzMierzenie(combat);
          expect(karty(), "4 rundy — jeszcze nie").to.equal(0);
          await zab.deleteEmbeddedDocuments("ActiveEffect", zab.effects.map(e => e.id));
          await efekt(combat.round - 5);
          await sprawdzMierzenie(combat);
          await sprawdzMierzenie(combat);
          expect(karty(), "5 rund — jedna karta").to.equal(1);
        } finally {
          await walka.sprzatnij();
        }
      });
    });

    describe("Ulubiona broń — wybór", function () {
      it("model z katalogu; dowolny egzemplarz tego modelu (U11); inna broń — nie", async function () {
        const tw = await scratchActor({ name: `${SCRATCH_PREFIX} Twardziel` });
        const item = await cecha(tw, "ulubiona-bron-twardziel");
        const b1 = await bron(tw, i => i.getFlag(MODULE_ID, "weaponId") === "b92");
        const b2 = await bron(tw, i => i.getFlag(MODULE_ID, "weaponId") === "b92");
        const inna = await bron(tw, i => i.type === "weapon" && i.getFlag(MODULE_ID, "weaponId") !== "b92" && i.system.type?.value === "palnaKrotka");
        expect(modelBroni(b1)).to.equal("b92");
        expect(A._wolneMiejsce(tw)?.id, "wolne miejsce").to.equal(item.id);
        await item.setFlag(MODULE_ID, FLAG_ULUBIONE, [{ model: modelBroni(b1), nazwa: b1.name }]);
        expect(ulubionaDla(tw, b2)?.id, "drugi egzemplarz").to.equal(item.id);
        expect(ulubionaDla(tw, inna)).to.equal(null);
        expect(A._wolneMiejsce(tw), "Twardziel 1: jedna").to.equal(null);
      });
    });

    describe("Słaby punkt — efekt na maszynie", function () {
      it("efekt z uuid znalazcy, bez dubla; poza walką zdjęty po Długim odpoczynku (U18)", async function () {
        const zm = await scratchActor({ name: `${SCRATCH_PREFIX} Zabójca maszyn` });
        const item = await cecha(zm, "slaby-punkt");
        const maszyna = await npc("Tankietka", "Maszyna");
        await A._nalozSlabyPunkt(zm, item, maszyna);
        await A._nalozSlabyPunkt(zm, item, maszyna);
        expect(maszyna.effects.filter(e => e.getFlag(MODULE_ID, FLAG_SLABY_PUNKT) === zm.uuid)).to.have.length(1);
        await A._onRestCompleted(zm, { longRest: true }, { type: "long" });
        expect(maszyna.effects.some(e => e.getFlag(MODULE_ID, FLAG_SLABY_PUNKT)), "po Długim odpoczynku").to.equal(false);
      });
    });

    describe("Po trafieniu (E5)", function () {
      /** Kontekst trafienia jak z karty — bez sceny (sojusznik obok celu — e2e). */
      const ctxDla = async (actor, cel, { tryb = 1, krytyk = false, melee = false } = {}) => {
        const sztylet = await bron(actor, i => i.type === "weapon" && i.system.properties?.has?.("fin"));
        return { actor, bron: sztylet, activity: atak(sztylet), celDoc: null, celActor: cel, krytyk, tryb, obrona: { melee } };
      };

      it("Bolesny atak: Ułatwienie — kości ze skali; bez Ułatwienia i sojusznika — nic; krytyk podwaja", async function () {
        const zl = await scratchActor({ name: `${SCRATCH_PREFIX} Złodziej`, system: { abilities: { dex: { value: 16 } } } });
        await cecha(zl, "bolesny-atak");
        const cel = await npc("Gangus", "Człowiek");
        const ctx = await ctxDla(zl, cel);
        expect(bolesny(ctx)?.kosci, "kość (bez klasy — 1k6)").to.equal("1d6");
        expect(bolesny({ ...ctx, tryb: 0 }), "bez Ułatwienia, bez sojusznika").to.equal(null);
        expect(bolesny({ ...ctx, tryb: -1 }), "Utrudnienie").to.equal(null);
        const roll = await uzyjBolesnego({ ...ctx, krytyk: true });
        expect(roll.formula, "krytyk").to.match(/^2d6/);
      });

      it("Podstępny atak: Spowolnienie i Oślepienie do końca następnej tury, bez kumulacji; Krwawienie z profilem; nie na maszynie", async function () {
        const zl = await scratchActor({ name: `${SCRATCH_PREFIX} Złodziej podstępny`, system: { abilities: { dex: { value: 16 } } } });
        await cecha(zl, "bolesny-atak");
        await cecha(zl, "podstepny-atak");
        const cel = await npc("Gangus podstępny", "Człowiek");
        const ctx = await ctxDla(zl, cel);
        expect(bolesny(ctx)?.podstepny, "przycisk Podstępnego ataku").to.be.ok;
        await uzyjPodstepnego(ctx, "spowolnienie");
        await uzyjPodstepnego(ctx, "spowolnienie");
        const sp = cel.effects.filter(e => e.getFlag(MODULE_ID, FLAG_PODSTEPNY) === "spowolnienie");
        expect(sp, "bez kumulacji").to.have.length(1);
        expect(sp[0]._source.duration.expiry).to.equal("sourceEnd");
        expect(sp[0].getSourceActor()?.id, "źródło — Złodziej").to.equal(zl.id);
        expect(sp[0].system.changes.map(c => c.key)).to.include("system.attributes.movement.speeds.walk");
        await uzyjPodstepnego(ctx, "oslepienie");
        expect(cel.statuses.has("blinded")).to.equal(true);
        await uzyjPodstepnego(ctx, "krwawienie");
        expect(isBleeding(cel)).to.equal(true);
        expect(bleedProfile(cel).id).to.equal("podstepny");
        const maszyna = await npc("Dron", "Maszyna");
        const warn = ui.notifications.warn;
        ui.notifications.warn = () => {};
        try {
          expect(await uzyjPodstepnego({ ...ctx, celActor: maszyna }, "krwawienie"), "maszyna nie krwawi").to.equal(null);
        } finally {
          ui.notifications.warn = warn;
        }
      });

      it("Skuteczny cios: tylko wręcz i z kośćmi Wściekłego ciosu", async function () {
        const naj = await scratchActor({ name: `${SCRATCH_PREFIX} Najemnik skuteczny` });
        await cecha(naj, "skuteczny-cios");
        const cel = await npc("Gangus skuteczny", "Człowiek");
        const ctx = await ctxDla(naj, cel, { melee: true });
        expect(skuteczny(ctx), "bez Wściekłego ciosu").to.equal(null);
        const w = await cecha(naj, "wsciekly-cios");
        await w.update({ "system.uses.max": "2", "system.uses.spent": 2 });
        expect(skuteczny(ctx)?.powod).to.contain("brak kości");
        await w.update({ "system.uses.spent": 0 });
        expect(skuteczny(ctx)?.powod, "kość jest").to.equal(null);
        expect(skuteczny({ ...ctx, obrona: { melee: false } }), "dystans").to.equal(null);
      });
    });
  }, { displayName: "Neuroshima: Zdolności walki — Mój wróg, Rzeźnik, Ulubiona broń… (M7 E4)" });
}
