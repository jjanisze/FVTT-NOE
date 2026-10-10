/**
 * Neuroshima 5e — towarzysze: rdzeń na prawdziwych aktorach (PLAN_m3_towarzysze.md E1).
 *
 * Warstwa 5 (dane pochodne): właściciel z klasą Zwiadowcy i jego towarzysz — awans i zmiana Mądrości
 * zmieniają PW, KW i TT towarzysza **bez zapisu** na nim; brak właściciela — wartości z szablonu; roll
 * data `@wlasciciel`; ludzki towarzysz: PW 5 × poziom, PB +2 z efektu U3, biegłości właściciela na żywo.
 * Warstwa 3 (niezmienniki): kto ma Stopnie Zranienia i wchodzi w maszynę umierania (s. 205, 214) — z
 * prawdziwym hakiem `updateActor` i krytykiem przez `applyDamage`; bramki BG (PD); udział w nagrodzie.
 *
 * Haki umierania wykonuje aktywny MG — paczka zakłada, że to ta karta (piaskownica albo kampania z
 * jednym MG). Wiadomości czatu, które stworzą, kasuje `after()`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchGroupActor, scratchCleanup, stub, waitFor } from "./helpers.mjs";
import {
  towarzysz, jestTowarzyszem, maStopnieZranienia, jestMaszyna, wartosciTowarzysza, daneTowarzysza,
  zapewnijEfektPB, towarzyszeWlasciciela, EFEKT_PB_ID
} from "../actors/towarzysze.mjs";
import { wMaszynie } from "../combat/umieranie.mjs";

const flaga = (wlasciciel, rodzaj, klasa = "zwiadowca") =>
  ({ [MODULE_ID]: { towarzysz: { wlasciciel: wlasciciel?.uuid ?? wlasciciel, rodzaj, klasa } } });

/** Przeliczenie zależnych idzie mikrozadaniem po haku — jedna tura pętli wystarcza. */
const tik = () => new Promise(r => setTimeout(r, 0));

async function klasaZwiadowcy(actor, levels) {
  const pack = game.packs.get(`${MODULE_ID}.klasy`);
  const docs = await pack.getDocuments();
  const zw = docs.find(d => d.type === "class" && d.system.identifier === "zwiadowca");
  const data = game.items.fromCompendium(zw);
  data.system.levels = levels;
  const [item] = await actor.createEmbeddedDocuments("Item", [data]);
  return item;
}

export function registerTowarzyszeTests(quench) {
  quench.registerBatch(`${MODULE_ID}.towarzysze`, context => {
    const { describe, it, expect, before, after, afterEach } = context;
    const start = Date.now();
    let restore = [];

    after(async () => {
      const ids = new Set(game.actors.filter(a => a.name.startsWith(SCRATCH_PREFIX)).map(a => a.id));
      const msgs = game.messages.filter(m => m.timestamp >= start && ids.has(m.speaker?.actor)).map(m => m.id);
      await scratchCleanup();
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });
    afterEach(() => { restore.forEach(r => r()); restore = []; });

    describe("Zwierzę: wartości z właściciela na żywo (§7.3, U2, U6)", function () {
      let wl, pies, klasa;

      before(async () => {
        wl = await scratchActor({ name: `${SCRATCH_PREFIX} Victor`, system: { abilities: { wis: { value: 14 } } } });
        klasa = await klasaZwiadowcy(wl, 3);
        pies = await scratchActor({
          name: `${SCRATCH_PREFIX} Burek`, type: "npc",
          system: { attributes: { hp: { value: 30, max: 22, formula: "4d6" }, ac: { calc: "custom", formula: "12 + @wlasciciel.prof" } } },
          flags: flaga(wl, "psi-partner")
        });
      });

      it("PW 10 + 10 × MDR, KW k6 × poziom Zwiadowcy, TT 12 + PB właściciela", function () {
        expect(wl.system.attributes.prof, "PB Victora na 3. poziomie").to.equal(2);
        expect(pies.system.attributes.hp.max, "PW psa").to.equal(30);
        expect(pies.system.attributes.hd.max, "KW psa").to.equal(3);
        expect(pies.system.attributes.hd.denomination).to.equal(6);
        expect(pies.system.attributes.ac.value, "TT z formuły custom przez @wlasciciel").to.equal(14);
      });

      it("roll data towarzysza ma migawkę właściciela, a formuła ataku ją widzi", async function () {
        const rd = pies.getRollData();
        expect(rd.wlasciciel?.prof).to.equal(2);
        expect(rd.wlasciciel?.abilities?.wis?.mod).to.equal(2);
        expect(rd.wlasciciel?.poziomKlasy).to.equal(3);
        const roll = await new Roll("2 + @wlasciciel.prof", rd).evaluate();
        expect(roll.total).to.equal(4);
      });

      it("zmiana Mądrości właściciela przelicza PW psa bez zapisu na psie", async function () {
        const zrodloPrzed = foundry.utils.deepClone(pies._source.system.attributes.hp);
        await wl.update({ "system.abilities.wis.value": 16 });
        await tik();
        expect(pies.system.attributes.hp.max).to.equal(40);
        expect(pies._source.system.attributes.hp, "źródło psa nietknięte").to.deep.equal(zrodloPrzed);
        expect(pies.system.attributes.hp.value, "bieżące PW ze źródła, nie leczone").to.equal(30);
      });

      it("awans właściciela: KW rosną, PB 3 na 5. poziomie podnosi TT", async function () {
        await klasa.update({ "system.levels": 5 });
        await tik();
        expect(wl.system.attributes.prof).to.equal(3);
        expect(pies.system.attributes.hd.max).to.equal(5);
        expect(pies.system.attributes.ac.value).to.equal(15);
      });

      it("bez właściciela — wartości z szablonu i znacznik braku", async function () {
        const sierota = await scratchActor({
          name: `${SCRATCH_PREFIX} Sierota`, type: "npc",
          system: { attributes: { hp: { value: 9, max: 22, formula: "4d6" } } },
          flags: flaga("Actor.nieistnieje000000", "psi-partner")
        });
        expect(sierota.system.attributes.hp.max).to.equal(22);
        expect(sierota.system.attributes.hd.max, "KW z formuły szablonu").to.equal(4);
        expect(daneTowarzysza(sierota)?.brak).to.include("wlasciciel");
      });

      it("odwrotny indeks: właściciel zna swojego towarzysza", function () {
        expect(towarzyszeWlasciciela(wl).map(a => a.id)).to.include(pies.id);
        expect(towarzysz(pies)?.rodzaj).to.equal("psi-partner");
        expect(wartosciTowarzysza(pies)?.pwMaks).to.equal(40);
      });
    });

    describe("Ludzki towarzysz (U3, U4, U5)", function () {
      let wl, evie;

      before(async () => {
        wl = await scratchActor({
          name: `${SCRATCH_PREFIX} Sędzia`,
          system: { traits: { weaponProf: { value: ["palnaPosr"] }, armorProf: { value: ["lgt"] } } }
        });
        await klasaZwiadowcy(wl, 3);
        evie = await scratchActor({ name: `${SCRATCH_PREFIX} Evie`, flags: flaga(wl, "ludzki-partner") });
      });

      it("PW = 5 × poziom Zwiadowcy właściciela, bez KON", function () {
        expect(evie.system.attributes.hp.max).to.equal(15);
      });

      it("PB +2 tylko z efektu U3 — bez niego postać bez klasy ma u dnd5e +1", async function () {
        expect(evie.system.attributes.prof, "przed efektem").to.equal(1);
        expect(await zapewnijEfektPB(evie)).to.equal(true);
        expect(evie.effects.get(EFEKT_PB_ID), "efekt o stałym id").to.exist;
        expect(evie.system.attributes.prof).to.equal(2);
        expect(await zapewnijEfektPB(evie), "drugi raz nic nie pisze").to.equal(false);
      });

      it("biegłości w broni i pancerzu właściciela — na żywo, bez zapisu", async function () {
        expect(evie.system.traits.weaponProf.value.has("palnaPosr")).to.equal(true);
        expect(evie.system.traits.armorProf.value.has("lgt")).to.equal(true);
        expect(evie._source.system.traits.weaponProf.value, "źródło puste").to.not.include("palnaPosr");
        await wl.update({ "system.traits.weaponProf.value": [] });
        await tik();
        expect(evie.system.traits.weaponProf.value.has("palnaPosr"), "właściciel stracił — towarzysz też").to.equal(false);
      });

      it("ręcznie wpisane maks. PW w oknie dnd5e wygrywa (jak w pw.mjs)", async function () {
        await evie.update({ "system.attributes.hp.max": 20 });
        expect(evie.system.attributes.hp.max).to.equal(20);
        await evie.update({ "system.attributes.hp.max": null });
        expect(evie.system.attributes.hp.max).to.equal(15);
      });
    });

    describe("Stopnie Zranienia i maszyna umierania (s. 205, 214; U10)", function () {
      let bestia, maszyna, zwykly, wl, pies, dron;

      before(async () => {
        const npc = (name, flags = {}, type = "") => scratchActor({
          name: `${SCRATCH_PREFIX} ${name}`, type: "npc",
          system: { attributes: { hp: { value: 10, max: 10 } }, details: { type: { value: type } } },
          flags
        });
        bestia = await npc("Bestia ze Stopniem", { [MODULE_ID]: { bestiary: { usesZranienie: true } } }, "Mutant");
        maszyna = await npc("Juggernaut", { [MODULE_ID]: { bestiary: { usesZranienie: true } } }, "Maszyna (Molocha)");
        zwykly = await npc("Gangus", {}, "Człowiek");
        wl = await scratchActor({ name: `${SCRATCH_PREFIX} Właściciel` });
        pies = await npc("Pies", flaga(wl, "psi-partner"), "Zwierzę");
        dron = await npc("Dron", flaga(wl, "dron-kroczacy", "spec"));
      });

      it("predykat: BG, Bestiariusz ze Stopniem, towarzysz-istota — tak; zwykły BN, maszyna, dron — nie", function () {
        expect(maStopnieZranienia(wl), "BG").to.equal(true);
        expect(maStopnieZranienia(bestia), "s. 205").to.equal(true);
        expect(maStopnieZranienia(pies), "Psi bohater").to.equal(true);
        expect(maStopnieZranienia(zwykly)).to.equal(false);
        expect(maStopnieZranienia(maszyna), "s. 214 wygrywa ze statblockiem").to.equal(false);
        expect(maStopnieZranienia(dron)).to.equal(false);
        expect(jestMaszyna(maszyna) && jestMaszyna(dron) && !jestMaszyna(bestia)).to.equal(true);
        for (const a of [wl, bestia, pies, zwykly, maszyna, dron]) expect(wMaszynie(a), a.name).to.equal(maStopnieZranienia(a));
      });

      it("Bestiariusz ze Stopniem przy 0 PW: Stopień i umieranie zamiast śmierci (F1)", async function () {
        await bestia.update({ "system.attributes.hp.value": 0 });
        await waitFor(() => bestia.statuses.has("unconscious"), { label: "Nieprzytomność" });
        expect(bestia.statuses.has("dead"), "nie martwy").to.equal(false);
        expect(bestia.getFlag(MODULE_ID, "zranienie")?.level, "Stopień za 0 PW").to.equal(1);
      });

      it("maszyna przy 0 PW pada jak zwykły BN, bez Stopnia", async function () {
        await maszyna.update({ "system.attributes.hp.value": 0 });
        await waitFor(() => maszyna.statuses.has("dead"), { label: "martwy" });
        expect(maszyna.getFlag(MODULE_ID, "zranienie")?.level ?? 0).to.equal(0);
      });

      it("krytyk: Stopień dla psa, nie dla drona (F2)", async function () {
        // `waitFor` czeka do 4 s, a pod obciążeniem pełnego przebiegu hak MG potrafi się spóźnić.
        this.timeout(6000);
        // Brak zapisu sprawdza się tylko po czasie: hak MG jest asynchroniczny. Dron pierwszy, pies jako
        // świadek, że hak w ogóle działa, potem jeszcze chwila na ewentualny zapis drona.
        await dron.applyDamage(2, { isCritical: true });
        await pies.applyDamage(2, { isCritical: true });
        await waitFor(() => (pies.getFlag(MODULE_ID, "zranienie")?.level ?? 0) === 1, { label: "Stopień psa" });
        await new Promise(r => setTimeout(r, 500));
        expect(dron.getFlag(MODULE_ID, "zranienie")?.level ?? 0, "maszyna bez Stopnia").to.equal(0);
      });
    });

    describe("Bramki BG (D5, U22)", function () {
      it("Stopień towarzysza w walce nie daje PD; BG dostaje", async function () {
        const pd = game.modules.get(MODULE_ID)?.api?.pd;
        expect(pd, "api PD").to.exist;
        const bg = await scratchActor({ name: `${SCRATCH_PREFIX} BG do PD` });
        const evie = await scratchActor({ name: `${SCRATCH_PREFIX} Towarzysz do PD`, flags: flaga(bg, "ludzki-partner") });
        restore.push(stub(game, "combat", { id: "quench", round: 1, turns: [] }));
        await bg.setFlag(MODULE_ID, "zranienie", { level: 1 });
        await evie.setFlag(MODULE_ID, "zranienie", { level: 1 });
        await waitFor(() => pd.getPD(bg)?.total > 0, { label: "PD BG" });
        await tik();
        expect(pd.getPD(evie)?.total ?? 0, "towarzysz bez PD").to.equal(0);
        expect(jestTowarzyszem(evie) && !jestTowarzyszem(bg)).to.equal(true);
      });

      it("okno nagrody drużyny nie dzieli łupu na towarzyszy", async function () {
        const bg = await scratchActor({ name: `${SCRATCH_PREFIX} BG w drużynie` });
        const comp = await scratchActor({ name: `${SCRATCH_PREFIX} Towarzysz w drużynie`, flags: flaga(bg, "ludzki-partner") });
        const grupa = await scratchGroupActor({ name: `${SCRATCH_PREFIX} Drużyna` });
        await grupa.update({ "system.members": [{ actor: bg.id }, { actor: comp.id }] });
        const okno = new dnd5e.applications.Award({ origin: grupa });
        const cele = okno.transferDestinations.map(d => d.id);
        expect(cele).to.include(bg.id);
        expect(cele).to.not.include(comp.id);
      });
    });
  }, { displayName: "Neuroshima: Towarzysze — rdzeń na prawdziwych aktorach" });
}
