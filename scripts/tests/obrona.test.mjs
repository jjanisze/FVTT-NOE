/**
 * Neuroshima 5e — trafienie, obrażenia i reakcje obronne: warstwa Foundry (PLAN_tt.md E2–E3).
 *
 * Czyste zasady (`resolveHit`, `reactionState`) testuje paczka `tt-zasady`. Tutaj:
 *   • budowniczy obrażeń strzału pojedynczego (kości naboju, `fixedDamage`, bez modyfikatora,
 *     właściwości naboju) i podmiana części bazowej w natywnej aktywności ataku,
 *   • osłona z okna ataku i werdykt ze stempla karty (`combat/trafienie.mjs`),
 *   • TT wobec konkretnego atakującego (znaczniki Parowania tarczą),
 *   • brak auto-obrażeń po Teście Ataku (D8).
 *
 * Bez kart czatu i bez `activity.use()` (TESTING §4) — aktorzy testowi, sprzątani w `after`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, sztuczkaItem, stub, waitFor } from "./helpers.mjs";
import { buildCaliberDamageRoll, caliberDamageProperties, isCaliberWeapon } from "../weapons/ammo.mjs";
import { coverAcBonus } from "../combat/cover.mjs";
import { ttAgainst, verdictOfEntry, buildObrona, entryFor, isCriticalHitOn, TT_VS_ATTACKER_FLAG }
  from "../combat/trafienie.mjs";
import { getZranienieLvl } from "../combat/zranienie.mjs";
import { executeReaction, breakHelmet, useIntelligentDefence, npcReactionReminders, __testing as obrona }
  from "../combat/obrona.mjs";
import { isUnmarkedReaction } from "../migration/oznacz-reakcje-bn.mjs";
import { reactionState } from "../config/defense-rules.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";

const ATTACK_ID = "neuroTestAtak000";

/** Broń z natywną aktywnością ataku (tryb P). */
function weapon(name, { type = "palnaKrotka", base = { number: 1, denomination: 4, types: ["piercing"] },
  properties = ["tryb_p"], caliber = null, fixedDamage = false, range = "ranged" } = {}) {
  const flags = {};
  if (caliber) flags.mag = { ammoType: caliber };
  if (fixedDamage) flags.fixedDamage = true;
  return {
    name: `${SCRATCH_PREFIX} ${name}`, type: "weapon",
    system: {
      type: { value: type }, properties, damage: { base },
      activities: {
        [ATTACK_ID]: {
          _id: ATTACK_ID, type: "attack",
          attack: { type: { value: range, classification: "weapon" } },
          damage: { includeBase: true, parts: [] }
        }
      }
    },
    flags: { [MODULE_ID]: flags }
  };
}

const attackOf = item => item.actor.items.get(item.id)?.system.activities.get(ATTACK_ID);

/** Karta ataku w pamięci (niezapisana) — do ścieżek, które odrzucają, zanim cokolwiek zapiszą. */
function memoryCard(obronaData) {
  return new ChatMessage.implementation({ content: "", flags: { [MODULE_ID]: { obrona: obronaData } } });
}

/** Podmiana jednego ustawienia modułu na czas testu. */
function stubSetting(key, value) {
  const original = game.settings.get.bind(game.settings);
  return stub(game.settings, "get", (ns, k) => (ns === MODULE_ID && k === key) ? value : original(ns, k));
}

const INT_DEFENCE = { name: "Inteligentna obrona", type: "feat", flags: { [MODULE_ID]: { abilityId: "inteligentna-obrona" } },
  system: { uses: { max: "4", spent: 0, recovery: [{ period: "sr", type: "recoverAll" }] } } };
const HELMET = { name: `${SCRATCH_PREFIX} Hełm`, type: "equipment", system: { type: { value: "trinket" } },
  flags: { [MODULE_ID]: { armorId: "helm" } } };

export function registerObronaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.obrona`, context => {
    const { describe, it, expect, before, after, afterEach } = context;
    after(() => scratchCleanup());

    describe("Obrażenia strzału pojedynczego (D8)", function () {
      this.timeout(15000);
      let actor, pistol, pompka, dumdum, katana;

      before(async function () {
        actor = await scratchActor({ name: `${SCRATCH_PREFIX} strzelec`, system: { abilities: { dex: { value: 16 } } } });
        const made = await actor.createEmbeddedDocuments("Item", [
          weapon("Pistolet 9mm", { caliber: "9mm" }),
          weapon("Pompka", { caliber: "12ga_s", fixedDamage: true, base: { number: 4, denomination: 4, types: ["piercing"] } }),
          weapon("Magnum dum-dum", { caliber: "44mag_dd", base: { number: 1, denomination: 10, types: ["piercing"] } }),
          weapon("Katana", { type: "biala", properties: ["fin"], range: "melee",
            base: { number: 1, denomination: 10, types: ["slashing"] } })
        ], { render: false });
        const by = n => made.find(i => i.name.includes(n));
        [pistol, pompka, dumdum, katana] = [by("Pistolet"), by("Pompka"), by("dum-dum"), by("Katana")];
        await waitFor(() => attackOf(pistol) && attackOf(katana), { label: "aktywności ataku" });
      });

      it("broń z kalibrem jest w systemie kalibrów, biała — nie", function () {
        expect(isCaliberWeapon(pistol)).to.equal(true);
        expect(isCaliberWeapon(katana)).to.equal(false);
      });

      it("kości naboju, bez modyfikatora z cechy", function () {
        const r = buildCaliberDamageRoll(pistol, {}, "9mm");
        expect(r.parts).to.deep.equal(["1d6"]);
        expect(r.parts.join(" ")).to.not.include("@mod");
        expect(r.options).to.include({ type: "piercing", neuroCaliber: "9mm" });
        expect(r.base).to.equal(true);
      });

      it("`fixedDamage`: kości broni biją domyślną formułę kalibru", function () {
        expect(buildCaliberDamageRoll(pompka, {}, "12ga_s").parts).to.deep.equal(["4d4"]);
      });

      it("właściwości naboju dochodzą do obrażeń; tryby ognia broni — nie", function () {
        const props = caliberDamageProperties(dumdum, "44mag_dd");
        expect(props).to.include.members(["rozrywajaca", "hollowpoint", "obalajaca"]);
        expect(props).to.not.include("tryb_p");
      });

      it("natywna aktywność: część bazowa z naboju z karty, bez `@mod`", function () {
        const rolls = attackOf(pistol).getDamageConfig({ neuroCaliber: "9mm" }).rolls;
        expect(rolls[0].parts).to.deep.equal(["1d6"]);
        expect(rolls[0].base).to.equal(true);
      });

      it("bez karty — kaliber z broni", function () {
        expect(attackOf(dumdum).getDamageConfig({}).rolls[0].parts).to.deep.equal(["1d10"]);
      });

      it("broń biała zostaje natywna (z modyfikatorem)", function () {
        const parts = attackOf(katana).getDamageConfig({}).rolls[0].parts;
        expect(parts.join(" ")).to.include("@mod");
      });

      it("żaden hak po Teście Ataku nie nakłada obrażeń (auto-obrażenia usunięte)", function () {
        const fns = (Hooks.events["dnd5e.postRollAttack"] ?? []).map(h => h.fn?.name ?? "");
        expect(fns.filter(n => /autoapply/i.test(n)), fns.join(", ")).to.deep.equal([]);
      });
    });

    describe("Rozstrzygacz na karcie ataku (§4.6)", function () {
      this.timeout(15000);

      it("osłona z okna ataku: ½ +2, ¾ +5, przez osłonę 0", function () {
        expect(coverAcBonus(undefined)).to.equal(0);
        expect(coverAcBonus({ selection: "half" })).to.equal(2);
        expect(coverAcBonus({ selection: "threeQuarters" })).to.equal(5);
        expect(coverAcBonus({ selection: "through", penetrationLevel: 2 })).to.equal(0);
      });

      it("werdykt ze stempla: TT + osłona + użyte reakcje, krytyk i jego zamiana", function () {
        const obrona = { total: 17, krytyk: false, fumble: false };
        const entry = { tt: 15, cover: 0, used: [], critDowngraded: false };
        expect(verdictOfEntry(obrona, entry).verdict).to.equal("trafienie");
        expect(verdictOfEntry(obrona, { ...entry, cover: 2 }).verdict).to.equal("trafienie");
        expect(verdictOfEntry(obrona, { ...entry, used: [{ id: "inteligentnaObrona", bonus: 4 }] }).verdict).to.equal("pudło");
        const crit = { total: 22, krytyk: true, fumble: false };
        expect(verdictOfEntry(crit, entry).verdict).to.equal("krytyk");
        expect(verdictOfEntry(crit, { ...entry, critDowngraded: true }).verdict).to.equal("trafienie");
      });

      it("szkielet `obrona` z rzutu: wynik, naturalna kość, krytyk/jedynka", function () {
        const roll = { total: 19, isCritical: false, isFumble: false, options: {}, dice: [{ total: 14 }] };
        expect(buildObrona(roll, null)).to.include({ total: 19, natural: 14, krytyk: false, fumble: false, melee: false });
      });

      it("wpis celu po UUID żetonu albo aktora", function () {
        const obrona = { targets: [{ tokenUuid: "Scene.a.Token.b", actorUuid: "Actor.c" }] };
        expect(entryFor(obrona, { uuid: "Scene.a.Token.b" })).to.equal(obrona.targets[0]);
        expect(entryFor(obrona, { uuid: "Actor.c" })).to.equal(obrona.targets[0]);
        expect(entryFor(obrona, { uuid: "Actor.x" })).to.equal(null);
      });

      it("TT wobec atakującego: znacznik Parowania tarczą tylko na jego ataki wręcz", async function () {
        const target = await scratchActor({ name: `${SCRATCH_PREFIX} z tarczą` });
        const base = target.system.attributes.ac.value;
        await target.createEmbeddedDocuments("ActiveEffect", [{
          name: `${SCRATCH_PREFIX} Parowanie tarczą`,
          flags: { [MODULE_ID]: { [TT_VS_ATTACKER_FLAG]: { attackerUuid: "Actor.wrogWrogWrog01", bonus: 5, melee: true } } }
        }], { render: false });
        expect(ttAgainst(target, { attacker: "Actor.wrogWrogWrog01", melee: true })).to.equal(base + 5);
        expect(ttAgainst(target, { attacker: "Actor.wrogWrogWrog01", melee: false }), "dystans").to.equal(base);
        expect(ttAgainst(target, { attacker: "Actor.innyInnyInny01", melee: true }), "inny wróg").to.equal(base);
        expect(target.system.attributes.ac.value, "TT na karcie bez zmian").to.equal(base);
      });
    });

    describe("Reakcje celu — prośba gracza i wykonanie u MG (E3)", function () {
      this.timeout(15000);
      let actor;
      before(async function () {
        actor = await scratchActor({ name: `${SCRATCH_PREFIX} obrońca`, system: { abilities: { int: { value: 18 } } } });
        await actor.createEmbeddedDocuments("Item", [INT_DEFENCE, sztuczkaItem("neo", "Neo")], { render: false });
      });

      const card = (o = {}) => memoryCard({
        v: 1, attackerUuid: "Actor.atakujacyTest01", attackerKind: null, melee: false, natural: 12, total: 13,
        krytyk: false, fumble: false,
        targets: [{ tokenUuid: "Scene.a.Token.b", actorUuid: actor.uuid, name: "cel", tt: 10, cover: 0, used: [],
          critDowngraded: false, verdict: "trafienie", decided: false }],
        ...o
      });

      it("migawka celu: posiadane reakcje i ładunki z przedmiotu", function () {
        const s = obrona.defenseSnapshot(actor);
        expect([...s.owned]).to.include.members(["inteligentnaObrona", "neo"]);
        expect(s.charges.inteligentnaObrona).to.equal(4);
        expect(s.mods.int).to.equal(4);
      });

      it("prośba: brak karty albo celu, cudzy aktor, w porządku", async function () {
        const other = await scratchActor({ name: `${SCRATCH_PREFIX} ktoś inny` });
        const req = { tokenUuid: "Scene.a.Token.b" };
        expect(obrona.requestProblem(undefined, actor, req)).to.equal("karta albo cel już nie istnieje");
        expect(obrona.requestProblem(card(), actor, { tokenUuid: "Scene.x.Token.y" })).to.equal("karta albo cel już nie istnieje");
        expect(obrona.requestProblem(card(), other, req)).to.equal("to nie twój cel");
        expect(obrona.requestProblem(card(), actor, req)).to.equal(null);
      });

      it("reakcja, która już nie pasuje, jest odrzucana przed jakimkolwiek zapisem", async function () {
        const crit = card({ natural: 20, total: 25, krytyk: true });
        const res = await executeReaction(crit, "Scene.a.Token.b", "bulletTime");
        expect(res).to.deep.equal({ ok: false, reason: "naturalna 20 — trafia zawsze" });
        expect(actor.items.find(i => i.name === "Inteligentna obrona").system.uses.value, "ładunki nietknięte").to.equal(4);
        expect((await executeReaction(card(), "Scene.x.Token.y", "bulletTime")).ok).to.equal(false);
      });

      it("rzut obrażeń bez krytyka tylko, gdy każdy trafiony cel zamienił krytyk", function () {
        const t = (critDowngraded, verdict = "trafienie") => ({ verdict, critDowngraded });
        expect(obrona.shouldDowngradeCrit({ krytyk: true, targets: [t(true)] })).to.equal(true);
        expect(obrona.shouldDowngradeCrit({ krytyk: true, targets: [t(true), t(false, "krytyk")] })).to.equal(false);
        expect(obrona.shouldDowngradeCrit({ krytyk: true, targets: [t(true), t(false, "pudło")] })).to.equal(true);
        expect(obrona.shouldDowngradeCrit({ krytyk: false, targets: [t(true)] })).to.equal(false);
      });
    });

    describe("Efekty do początku następnej tury (§4.5)", function () {
      this.timeout(15000);
      let actor;
      const ttEffect = () => actor.effects.find(e => e.getFlag(MODULE_ID, "tt")?.source === "inteligentnaObrona");

      before(async function () {
        actor = await scratchActor({ name: `${SCRATCH_PREFIX} spec`, system: { abilities: { int: { value: 16 } } } });
        await actor.createEmbeddedDocuments("Item", [INT_DEFENCE], { render: false });
      });

      it("Inteligentna obrona z paska: zużywa użycie, TT + INT do początku tury (Z9)", async function () {
        const tt = actor.system.attributes.ac.value;
        await useIntelligentDefence(actor, { card: false });
        expect(actor.items.find(i => i.name === "Inteligentna obrona").system.uses.value).to.equal(3);
        expect(ttEffect()?._source.duration).to.include({ value: 1, units: "turns", expiry: "turnStart" });
        expect(actor.system.attributes.ac.value).to.equal(tt + 3);
      });

      it("rdzeń oznaczył wygaśnięcie → efekt znika", async function () {
        await ttEffect().update({ "duration.expired": true });
        await waitFor(() => !ttEffect(), { label: "skasowanie wygasłego efektu" });
      });

      it("odpoczynek sprząta resztki", async function () {
        await useIntelligentDefence(actor, { card: false });
        expect(ttEffect()).to.exist;
        Hooks.callAll("dnd5e.restCompleted", actor, {}, {});
        await waitFor(() => !ttEffect(), { label: "sprzątanie po odpoczynku" });
      });
    });

    describe("Krytyczna ochrona hełmu (E4, D12)", function () {
      this.timeout(15000);
      let restore = null;
      afterEach(() => { restore?.(); restore = null; });

      async function helmeted(name) {
        const actor = await scratchActor({ name: `${SCRATCH_PREFIX} ${name}` });
        const [helmet] = await actor.createEmbeddedDocuments("Item", [HELMET], { render: false });
        await game.neuroshima.lalka.equip(actor.items.get(helmet.id), { quiet: true });
        await waitFor(() => actor.items.get(helmet.id)?.system.equipped, { label: "hełm na głowie" });
        return actor;
      }

      it("z Kobaltem: hełm zdjęty, w plecaku „Dziurawy hełm” (D12a)", async function () {
        restore = stubSetting("kobaltEnabled", true);
        const actor = await helmeted("w hełmie, Kobalt");
        expect(await breakHelmet(actor)).to.equal(`${SCRATCH_PREFIX} Hełm`);
        expect(actor.items.some(i => i.name === `${SCRATCH_PREFIX} Hełm`)).to.equal(false);
        const junk = actor.items.find(i => i.getFlag(MODULE_ID, "dziurawyHelm"));
        expect(junk?.type).to.equal("loot");
        expect(junk?.system.type.value).to.equal("junk");
        expect(junk?.system.equipped ?? false, "w plecaku").to.equal(false);
      });

      it("bez Kobaltu: hełm po prostu znika (RAW)", async function () {
        restore = stubSetting("kobaltEnabled", false);
        const actor = await helmeted("w hełmie, RAW");
        await breakHelmet(actor);
        expect(actor.items.size).to.equal(0);
      });

      it("bez hełmu na głowie nie ma czego niszczyć", async function () {
        const actor = await scratchActor({ name: `${SCRATCH_PREFIX} bez hełmu` });
        expect(await breakHelmet(actor)).to.equal(null);
      });
    });

    describe("BN-cele (E5, D13)", function () {
      /** BN w pamięci — BN nie ma lalki, nic tu nie pisze do świata. */
      const npc = items => new Actor.implementation({ name: `${SCRATCH_PREFIX} BN`, type: "npc", items });
      const bestiaryFeat = (name, section, automation = null) => ({
        name, type: "feat", flags: { [MODULE_ID]: { bestiary: { creature: "x", entryId: "y", section, automation } } }
      });

      it("Bestiariusz: Gladiator — Parowanie jako reakcja TT +3 wręcz", function () {
        const feat = BESTIARY.gladiator?.features?.find(f => f.id === "parowanie");
        expect(feat?.automation).to.deep.equal({ kind: "ttReaction", bonus: 3, melee: true, scope: "attack" });
      });

      it("reakcja TT z Bestiariusza staje się przyciskiem MG", function () {
        const actor = npc([bestiaryFeat("Parowanie", "reaction", { kind: "ttReaction", bonus: 3, melee: true, scope: "attack" })]);
        const rows = obrona.reactionRowsFor(actor).filter(r => r.npc);
        expect(rows.map(r => [r.label, r.bonus()])).to.deep.equal([["Parowanie", 3]]);
        const ctx = { total: 17, natural: 12, verdict: "trafienie", need: 3, target: 15, autoHit: false,
          melee: true, used: [], gmActive: true };
        expect(reactionState(rows[0], obrona.defenseSnapshot(actor), ctx).state).to.equal("active");
      });

      it("inne Reakcje BN — przypomnienie bez automatyki; reakcja TT nie dubluje się", function () {
        const actor = npc([
          bestiaryFeat("Tylko draśnięcie", "reaction"),
          bestiaryFeat("Ofiara", "traits", { kind: "descriptive", reaction: true }),
          bestiaryFeat("Parowanie", "reaction", { kind: "ttReaction", bonus: 3, melee: true, scope: "attack" }),
          bestiaryFeat("Pierwsze spotkanie", "traits")
        ]);
        expect(npcReactionReminders(actor).map(i => i.name)).to.have.members(["Tylko draśnięcie", "Ofiara"]);
      });

      it("skrypt oznaczania: cecha ręcznego BN-a o Reakcji, bez aktywności", function () {
        const feat = data => new Item.implementation({ type: "feat", ...data });
        expect(isUnmarkedReaction(feat({ name: "Ofiara", system: { description: { value: "<p>może użyć Reakcji</p>" } } }))).to.equal(true);
        expect(isUnmarkedReaction(feat({ name: "Szarża", system: { description: { value: "<p>atak</p>" } } }))).to.equal(false);
        expect(isUnmarkedReaction(feat({ name: "Ofiara", flags: { [MODULE_ID]: { bestiary: { section: "traits" } } },
          system: { description: { value: "Reakcja" } } })), "z paczki").to.equal(false);
      });
    });

    describe("Skutki krytyka przy nakładaniu obrażeń (Stopień Zranienia, W6)", function () {
      this.timeout(20000);
      const speakers = new Set();
      after(async () => {
        const ids = game.messages.filter(m => speakers.has(m.speaker?.actor)).map(m => m.id);
        if (ids.length) await ChatMessage.deleteDocuments(ids);
      });

      async function wounded(name, hp = 10) {
        const actor = await scratchActor({ name: `${SCRATCH_PREFIX} ${name}`,
          system: { attributes: { hp: { value: hp, max: 20 } } } });
        speakers.add(actor.id);
        return actor;
      }
      const attackCard = (actor, o = {}) => memoryCard({
        v: 1, total: 22, natural: 20, krytyk: true, fumble: false, melee: true, attackerUuid: null,
        targets: [{ tokenUuid: "Scene.a.Token.b", actorUuid: actor.uuid, name: "cel", tt: 12, cover: 0,
          used: [], critDowngraded: false, verdict: "krytyk", decided: false, ...o }]
      });
      async function damageCard(isCritical) {
        const roll = await new CONFIG.Dice.DamageRoll("1d6", {}, { type: "slashing", isCritical }).evaluate();
        return new ChatMessage.implementation({ content: "", rolls: [roll.toJSON()] });
      }

      it("krytyk z karty ataku; Krytyczna ochrona go gasi; bez karty ataku — z rzutu obrażeń", async function () {
        const actor = await wounded("cel krytyka");
        expect(isCriticalHitOn(actor, { isCritical: true })).to.equal(true);
        expect(isCriticalHitOn(actor, { origin: attackCard(actor) })).to.equal(true);
        expect(isCriticalHitOn(actor, { origin: attackCard(actor, { critDowngraded: true }) }), "Krytyczna ochrona")
          .to.equal(false);
        expect(isCriticalHitOn(actor, { origin: await damageCard(true) })).to.equal(true);
        expect(isCriticalHitOn(actor, { origin: await damageCard(false) })).to.equal(false);
        expect(isCriticalHitOn(actor, {}), "podgląd tacki — bez karty").to.equal(false);
      });

      it("nałożone obrażenia z krytyka nadają Stopień Zranienia", async function () {
        const actor = await wounded("krytyk");
        await actor.applyDamage([{ value: 3, type: "slashing" }], { isCritical: true });
        await waitFor(() => getZranienieLvl(actor) === 1, { label: "Stopień z krytyka" });
      });

      it("zwykłe trafienie nie rani; zamieniony krytyk nie rani", async function () {
        const actor = await wounded("bez krytyka");
        await actor.applyDamage([{ value: 3, type: "slashing" }], {});
        await actor.applyDamage([{ value: 3, type: "slashing" }], { origin: attackCard(actor, { critDowngraded: true }) });
        await new Promise(r => setTimeout(r, 400));
        expect(getZranienieLvl(actor)).to.equal(0);
      });

      it("krytyk, który zbija PW do 0, daje jeden Stopień, nie dwa (s. 32: „albo”)", async function () {
        const actor = await wounded("krytyk do zera", 4);
        await actor.applyDamage([{ value: 10, type: "slashing" }], { isCritical: true });
        await waitFor(() => getZranienieLvl(actor) >= 1, { label: "Stopień za PW 0" });
        await new Promise(r => setTimeout(r, 600));
        expect(getZranienieLvl(actor)).to.equal(1);
      });
    });
  }, { displayName: "Neuroshima: Trafienie, obrażenia i reakcje celu" });
}
