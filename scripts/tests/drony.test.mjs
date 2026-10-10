/**
 * Neuroshima 5e — drony na prawdziwych dokumentach (PLAN_m3_towarzysze.md E7a).
 *
 * Warstwa 5 (dane pochodne): dron ze stemplem twórcy (D23) — PW i TT z mod. INT i PB twórcy w chwili
 * budowy, bez zapisu; zmiana twórcy po budowie niczego nie rusza.
 * Warstwa 3 (niezmienniki): uchwyt jest jeden (kopia odrzucona, „Duplikuj” wyłączone, ilość 1, kopia
 * aktora bez uchwytu), przeniesienie zabiera własność drona; stan uchwytu wynika z żetonów (U12) —
 * rozłożenie, złożenie, żeton skasowany ręcznie, scena skasowana; produkcja kończy się dronem.
 *
 * E7b: kontrolery (dwa przedmioty, D32; dostępność WKK, D33; bez przepisu standardowego pod Kobaltem, D37),
 * aktywacja z Kontrolera (kontroler do ręki przez lalkę — D22; operator i zatrzask — U20; druga aktywacja i
 * plakietka ataku — D35, D36), broń drona z formułą twórcy i operatora (U13), drony w symulacji magazynków (U14).
 *
 * Synchronizację uchwytu robi aktywny MG — paczka zakłada, że to ta karta (piaskownica albo kampania z
 * jednym MG). Scena, folder „Drony” (gdy go nie było) i wiadomości czatu znikają w `after()`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, captureWarnings, waitFor, stub } from "./helpers.mjs";
import {
  utworzDrona, rozloz, zloz, przeniesUchwyt, uchwyt, uchwytDrona, dronUchwytu, posiadaczDrona, dronyPosiadacza,
  zetonyDrona, jestDronem, rodzajZPrzepisu, daneUchwytu, liniaUruchomienia, FLAG_UCHWYT
} from "../actors/drony.mjs";
import { towarzysz, jestMaszyna, maStopnieZranienia, jestTowarzyszem } from "../actors/towarzysze.mjs";
import { robotaApi as ROBOTA } from "../production/robota.mjs";
import { buildSurowiecItemData } from "../actors/surowce-store.mjs";
import {
  buildKontrolerItemData, rodzajKontrolera, zasiegKontrolera, AKT_KOMENDA, AKT_STERUJ, AKT_REAGUJ, KONTROLER_REF
} from "../items/kontroler.mjs";
import { aktywuj, aktywacjaWRundzie, cechyDrona } from "../actors/drony-sterowanie.mjs";
import { premiaAtakuDrona } from "../actors/drony-bron.mjs";
import { familyOf, inHand } from "../actors/doll.mjs";
import { inMagazineSystem } from "../weapons/magazine-model.mjs";
import { dostepnosc } from "../config/dostepnosc.mjs";
import { wszystkiePrzepisy } from "../config/recipes-data.mjs";

const flagaUchwytu = item => item?.flags?.[MODULE_ID]?.[FLAG_UCHWYT];

async function scenaTestowa() {
  const levelId = foundry.documents.BaseScene.metadata.defaultLevelId;
  return Scene.implementation.create({
    name: `${SCRATCH_PREFIX} drony`, width: 1500, height: 1500, padding: 0, navigation: false,
    grid: { type: CONST.GRID_TYPES.SQUARE, size: 100, distance: 1.5, units: "m" },
    initialLevel: levelId,
    levels: [{ _id: levelId, name: "Podłoga", elevation: { bottom: 0, top: null } }]
  });
}

export function registerDronyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.drony`, context => {
    const { describe, it, expect, before, after, afterEach } = context;
    const start = Date.now();
    const folderBylo = !!game.folders.find(f => f.type === "Actor" && f.name === "Drony");
    const drony = [];
    let scena = null;

    after(async () => {
      for (const d of drony) if (game.actors.get(d.id)) await d.delete();
      if (scena && game.scenes.get(scena.id)) await scena.delete();
      await scratchCleanup();
      const folder = game.folders.find(f => f.type === "Actor" && f.name === "Drony");
      if (!folderBylo && folder && !folder.contents.length) await folder.delete();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    const nowyDron = async (holder, rodzaj, o = {}) => {
      const wynik = await utworzDrona(holder, rodzaj, { nazwa: `${SCRATCH_PREFIX} ${rodzaj}`, ...o });
      drony.push(wynik.dron);
      return wynik;
    };

    describe("Dron ze stemplem twórcy (D23, U11, U13)", function () {
      let haker, wynik;

      before(async () => {
        haker = await scratchActor({ name: `${SCRATCH_PREFIX} Haker`, system: { abilities: { int: { value: 16 } } } });
        wynik = await nowyDron(haker, "dron-kroczacy");
      });

      it("aktor-maszyna z flagą: twórca zamrożony, bez właściciela i operatora", function () {
        const t = towarzysz(wynik.dron);
        expect(jestDronem(wynik.dron)).to.equal(true);
        expect(jestMaszyna(wynik.dron)).to.equal(true);
        expect(jestTowarzyszem(wynik.dron), "bramki BG: bez Fuksów i PD").to.equal(true);
        expect(maStopnieZranienia(wynik.dron), "maszyna — bez Stopni (s. 214)").to.equal(false);
        expect(t.wlasciciel).to.equal(null);
        expect(t.operator).to.equal(null);
        expect(t.tworca).to.include({ uuid: haker.uuid, nazwa: haker.name, int: 3, prof: haker.system.attributes.prof });
        expect(t.tworca.zbudowano).to.equal(game.time.worldTime);
        expect(wynik.dron.folder?.name).to.equal("Drony");
        expect(wynik.dron.prototypeToken.actorLink, "żeton połączony").to.equal(true);
      });

      it("PW 10 × INT twórcy, TT 10 + INT + PB twórcy, pełne PW na start", function () {
        const prof = haker.system.attributes.prof;
        expect(wynik.dron.system.attributes.hp.max).to.equal(30);
        expect(wynik.dron.system.attributes.hp.value).to.equal(30);
        expect(wynik.dron.system.attributes.ac.value).to.equal(10 + 3 + prof);
      });

      it("zmiana twórcy po budowie nie rusza drona (stempel, nie żywa zależność)", async function () {
        await haker.update({ "system.abilities.int.value": 10 });
        await new Promise(r => setTimeout(r, 0));
        expect(wynik.dron.system.attributes.hp.max).to.equal(30);
        await haker.update({ "system.abilities.int.value": 16 });
      });

      it("uchwyt złożony: 25 kg, 70 gb, poza lalką, wskazuje drona", function () {
        const u = wynik.uchwyt;
        expect(u.parent).to.equal(haker);
        expect(u.system.weight.value).to.equal(25);
        expect(u.system.price.value).to.equal(70);
        expect(flagaUchwytu(u)).to.include({ aktor: wynik.dron.uuid, rodzaj: "dron-kroczacy", rozlozony: false });
        expect(u.flags[MODULE_ID].dollSlot).to.equal("none");
        expect(dronUchwytu(u)).to.equal(wynik.dron);
        expect(uchwytDrona(wynik.dron)).to.equal(u);
        expect(posiadaczDrona(wynik.dron)).to.equal(haker);
        expect(dronyPosiadacza(haker).map(d => d.dron)).to.deep.equal([wynik.dron]);
        expect(u.system.activities.size, "Rozłóż i Złóż").to.equal(2);
      });

      it("latający: PW 5 × INT, 4 kg, 90 gb", async function () {
        const l = await nowyDron(haker, "dron-latajacy");
        expect(l.dron.system.attributes.hp.max).to.equal(15);
        expect(l.uchwyt.system.weight.value).to.equal(4);
        expect(l.uchwyt.system.price.value).to.equal(90);
      });

      it("linia uruchomienia z kalendarza świata (D23)", function () {
        const linia = liniaUruchomienia(wynik.dron);
        if (linia === null) this.skip();
        expect(linia).to.match(/^System ruszył .+ roku\.$/);
      });
    });

    describe("Uchwyt bez klonów, własność za posiadaczem (U11)", function () {
      let a, b, wynik;

      before(async () => {
        a = await scratchActor({ name: `${SCRATCH_PREFIX} Posiadacz A` });
        b = await scratchActor({ name: `${SCRATCH_PREFIX} Posiadacz B` });
        wynik = await nowyDron(a, "dron-latajacy");
      });

      it("druga kopia uchwytu odrzucona; „Duplikuj” wyłączone", async function () {
        const w = captureWarnings();
        try {
          const created = await b.createEmbeddedDocuments("Item", [daneUchwytu(wynik.dron)]);
          expect(created.length).to.equal(0);
        } finally {
          w.restore();
        }
        expect(w.messages.some(m => /już uchwyt/.test(m))).to.equal(true);
        expect(wynik.uchwyt.canDuplicate).to.equal(false);
      });

      it("ilość uchwytu zostaje 1, reszta aktualizacji przechodzi", async function () {
        const w = captureWarnings();
        try {
          await wynik.uchwyt.update({ "system.quantity": 3, "system.description.value": "<p>x</p>" });
        } finally {
          w.restore();
        }
        expect(wynik.uchwyt.system.quantity).to.equal(1);
        expect(wynik.uchwyt.system.description.value).to.equal("<p>x</p>");
      });

      it("kopia aktora — bez uchwytu", async function () {
        const w = captureWarnings();
        let kopia;
        try {
          kopia = await Actor.implementation.create({ ...a.toObject(), _id: undefined, name: `${SCRATCH_PREFIX} kopia A` });
        } finally {
          w.restore();
        }
        try {
          expect(kopia.items.filter(i => uchwyt(i)).length).to.equal(0);
        } finally {
          await kopia.delete();
        }
      });

      it("przeniesienie: jeden egzemplarz u celu, własność drona za nowym posiadaczem", async function () {
        const gracz = game.users.find(u => !u.isGM);
        if (gracz) await b.update({ [`ownership.${gracz.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER });
        const nowy = await przeniesUchwyt(wynik.uchwyt, b);
        expect(nowy.parent).to.equal(b);
        expect(a.items.filter(i => uchwyt(i)).length).to.equal(0);
        expect(posiadaczDrona(wynik.dron)).to.equal(b);
        if (gracz) {
          await waitFor(() => wynik.dron.ownership[gracz.id] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER, { label: "własność drona" });
          await przeniesUchwyt(nowy, a);
          await waitFor(() => (wynik.dron.ownership[gracz.id] ?? 0) === CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, { label: "własność cofnięta" });
        }
      });
    });

    describe("Rozłóż / Złóż — stan uchwytu z żetonów (U12)", function () {
      let holder, wynik;
      const u = () => uchwytDrona(wynik.dron);

      before(async () => {
        scena = await scenaTestowa();
        holder = await scratchActor({ name: `${SCRATCH_PREFIX} Operator` });
        wynik = await nowyDron(holder, "dron-kroczacy");
      });

      it("Rozłóż: żeton na scenie, uchwyt rozłożony, 0 kg", async function () {
        await rozloz(u(), { pozycja: { x: 300, y: 400 }, scena });
        const [t] = zetonyDrona(wynik.dron);
        expect(t?.parent).to.equal(scena);
        expect(t.x).to.equal(300);
        expect(t.y).to.equal(400);
        await waitFor(() => flagaUchwytu(u())?.rozlozony === true, { label: "uchwyt rozłożony" });
        expect(u().system.weight.value).to.equal(0);
        expect(u().name).to.match(/\(rozłożony\)$/);
      });

      it("drugie Rozłóż nic nie robi", async function () {
        await rozloz(u(), { pozycja: { x: 600, y: 600 }, scena });
        expect(zetonyDrona(wynik.dron).length).to.equal(1);
      });

      it("Złóż: żetonu nie ma, uchwyt złożony, 25 kg", async function () {
        await zloz(u());
        expect(zetonyDrona(wynik.dron).length).to.equal(0);
        await waitFor(() => flagaUchwytu(u())?.rozlozony === false, { label: "uchwyt złożony" });
        expect(u().system.weight.value).to.equal(25);
        expect(u().name).to.equal(wynik.dron.name);
      });

      it("żeton postawiony i skasowany ręcznie przez MG — uchwyt idzie za nim", async function () {
        const doc = await wynik.dron.getTokenDocument({ x: 100, y: 100 });
        const [t] = await scena.createEmbeddedDocuments("Token", [doc.toObject()]);
        await waitFor(() => flagaUchwytu(u())?.rozlozony === true, { label: "ręczny żeton → rozłożony" });
        await t.delete();
        await waitFor(() => flagaUchwytu(u())?.rozlozony === false, { label: "skasowany żeton → złożony" });
      });

      it("zmiana nazwy drona — uchwyt też", async function () {
        await wynik.dron.update({ name: `${SCRATCH_PREFIX} Pajączek` });
        await waitFor(() => u().name === `${SCRATCH_PREFIX} Pajączek`, { label: "nazwa uchwytu" });
      });

      it("skasowana scena składa drona", async function () {
        await rozloz(u(), { pozycja: { x: 300, y: 300 }, scena });
        await waitFor(() => flagaUchwytu(u())?.rozlozony === true, { label: "rozłożony" });
        await scena.delete();
        scena = null;
        await waitFor(() => flagaUchwytu(u())?.rozlozony === false, { label: "scena skasowana → złożony" });
      });
    });

    describe("Kontrolery: dwa przedmioty (D32, D33, D37)", function () {
      it("fabryczny 300/50 m, domowy 100/20 m; tylko w ręce; Komenda [B], Steruj [A], Reaguj [R]", function () {
        for (const [rodzaj, z] of [["fabryczny", [300, 50]], ["domowy", [100, 20]]]) {
          const d = buildKontrolerItemData(rodzaj);
          expect(rodzajKontrolera(d)).to.equal(rodzaj);
          expect(Object.values(zasiegKontrolera(d))).to.deep.equal(z);
          expect(familyOf(d), "rodzina lalki").to.equal("handOnly");
          expect(d.system.weight.value).to.equal(2);
          expect(d.system.price.value).to.equal(40);
          const typy = [AKT_KOMENDA, AKT_STERUJ, AKT_REAGUJ].map(id => d.system.activities[id]?.activation?.type);
          expect(typy).to.deep.equal(["bonus", "action", "reaction"]);
        }
      });

      it("oba w paczce Sprzęt", async function () {
        const index = await game.packs.get(`${MODULE_ID}.sprzet`).getIndex({ fields: [`flags.${MODULE_ID}.kontroler`] });
        const rodzaje = index.map(e => e.flags?.[MODULE_ID]?.kontroler).filter(Boolean).sort();
        expect(rodzaje).to.deep.equal(["domowy", "fabryczny"]);
      });

      it("dostępność fabrycznego 30%, w WKK 10%; pod Kobaltem bez przepisu standardowego", function () {
        expect(dostepnosc(KONTROLER_REF.fabryczny)).to.equal(30);
        expect(dostepnosc(KONTROLER_REF.fabryczny, { kobalt: true })).to.equal(10);
        const std = k => wszystkiePrzepisy({ kobalt: k })
          .filter(p => p.id.startsWith("std/") && /kontroler/.test(p.wynik.ref)).map(p => p.wynik.ref).sort();
        expect(std(false)).to.deep.equal([KONTROLER_REF.fabryczny, KONTROLER_REF.domowy].sort());
        expect(std(true)).to.deep.equal([KONTROLER_REF.domowy]);
      });
    });

    describe("Aktywacja z Kontrolera (D22, D35, D36, U20)", function () {
      let operator, wynik, kontroler, restore = [];
      const kart = () => game.messages.contents.filter(m => m.getFlag(MODULE_ID, "dronAktywacjaKarta")?.dron === wynik.dron.uuid);
      const k = () => operator.items.get(kontroler.id);

      before(async () => {
        operator = await scratchActor({ name: `${SCRATCH_PREFIX} Operator`, system: { abilities: { dex: { value: 16 } } } });
        [kontroler] = await operator.createEmbeddedDocuments("Item", [buildKontrolerItemData("domowy")]);
        const haker = await scratchActor({ name: `${SCRATCH_PREFIX} Twórca`, system: { abilities: { int: { value: 16 } } } });
        wynik = await nowyDron(haker, "dron-kroczacy");
      });
      afterEach(() => { restore.forEach(r => r()); restore = []; });

      it("kontroler w plecaku: pytanie, [Weź do ręki], potem aktywacja (D22)", async function () {
        expect(inHand(k()), "na starcie w plecaku").to.equal(false);
        let pytano = 0;
        restore.push(stub(foundry.applications.api.DialogV2, "confirm", async () => (pytano++, true)));
        const d = await aktywuj(k(), "B", { dron: wynik.dron });
        expect(d).to.equal(wynik.dron);
        expect(pytano).to.equal(1);
        expect(inHand(k()), "w ręce").to.equal(true);
        await waitFor(() => towarzysz(wynik.dron).operator === operator.uuid, { label: "operator" });
        expect(wynik.dron.flags[MODULE_ID].dronAktywacja).to.include({ tryb: "B", operator: operator.uuid });
      });

      it("„Anuluj” niczego nie zmienia", async function () {
        await game.neuroshima.lalka.place(operator, k(), "pack");
        expect(inHand(k()), "z powrotem w plecaku").to.equal(false);
        restore.push(stub(foundry.applications.api.DialogV2, "confirm", async () => false));
        const przed = kart().length;
        expect(await aktywuj(k(), "A", { dron: wynik.dron })).to.equal(null);
        expect(kart().length).to.equal(przed);
      });

      it("w walce: druga aktywacja w tej samej rundzie ma plakietkę; reakcja to nie druga aktywacja (D35)", async function () {
        restore.push(stub(foundry.applications.api.DialogV2, "confirm", async () => true));
        restore.push(stub(game, "combat", { id: "quench-dron", round: 3, started: true, turns: [], combatant: null, getCombatantsByActor: () => [] }));
        await aktywuj(k(), "B", { dron: wynik.dron });
        await waitFor(() => aktywacjaWRundzie(wynik.dron)?.runda === 3, { label: "zatrzask rundy 3" });
        await aktywuj(k(), "R", { dron: wynik.dron });
        await aktywuj(k(), "A", { dron: wynik.dron });
        const [b, r, a] = kart().slice(-3).map(m => m.getFlag(MODULE_ID, "dronAktywacjaKarta"));
        expect([b.tryb, r.tryb, a.tryb]).to.deep.equal(["B", "R", "A"]);
        expect([b.druga, r.druga, a.druga]).to.deep.equal([false, false, true]);
      });

      it("plakietka ataku: bez Steruj [A] w tej rundzie — tak; po [A] — nie (D36)", async function () {
        restore.push(stub(game, "combat", { id: "quench-dron", round: 4, started: true, turns: [], combatant: null, getCombatantsByActor: () => [] }));
        const karta = () => ChatMessage.implementation.create({
          speaker: ChatMessage.getSpeaker({ actor: wynik.dron }), content: "<p>atak</p>",
          flags: { dnd5e: { activity: { type: "attack" } } }
        });
        const bez = await karta();
        expect(bez.getFlag(MODULE_ID, "dronPlakietki")?.[0]).to.match(/Steruj \[A\]/);
        restore.push(stub(foundry.applications.api.DialogV2, "confirm", async () => true));
        await aktywuj(k(), "A", { dron: wynik.dron });
        await waitFor(() => aktywacjaWRundzie(wynik.dron)?.tryb === "A", { label: "zatrzask [A]" });
        const po = await karta();
        expect(po.getFlag(MODULE_ID, "dronPlakietki")).to.equal(undefined);
      });

      it("BN-operator bez lalki — bez pytania o rękę", async function () {
        const bn = await scratchActor({ name: `${SCRATCH_PREFIX} BN operator`, type: "npc" });
        const [kb] = await bn.createEmbeddedDocuments("Item", [buildKontrolerItemData("fabryczny")]);
        let pytano = 0;
        restore.push(stub(foundry.applications.api.DialogV2, "confirm", async () => (pytano++, true)));
        expect(await aktywuj(kb, "B", { dron: wynik.dron })).to.equal(wynik.dron);
        expect(pytano).to.equal(0);
      });
    });

    describe("Broń drona: twórca i operator (U13, U14)", function () {
      let wynik, operator, bron;

      before(async () => {
        const haker = await scratchActor({ name: `${SCRATCH_PREFIX} Twórca broni`, system: { abilities: { int: { value: 16 } } } });
        operator = await scratchActor({ name: `${SCRATCH_PREFIX} Operator broni`, system: { abilities: { dex: { value: 16 } } } });
        wynik = await nowyDron(haker, "dron-kroczacy");
        await wynik.dron.update({ [`flags.${MODULE_ID}.towarzysz.operator`]: operator.uuid });
        const docs = await game.packs.get(`${MODULE_ID}.bron`).getDocuments();
        // Paczka trzyma broń bez aktywności — moduł dokłada je, gdy broń trafia do aktora.
        const sztylet = docs.find(d => d.name === "Sztylet") ?? docs.find(d => d.system?.type?.value === "biala");
        const [b] = await wynik.dron.createEmbeddedDocuments("Item", [game.items.fromCompendium(sztylet)]);
        bron = await waitFor(() => {
          const i = wynik.dron.items.get(b.id);
          return i?.system.activities.find(a => a.type === "attack") ? i : null;
        }, { label: "aktywność ataku sztyletu" });
      });

      it("Test Ataku: 2 + PB twórcy + ZRC operatora", async function () {
        const prof = towarzysz(wynik.dron).tworca.prof;
        expect(premiaAtakuDrona(wynik.dron)).to.equal(2 + prof + 3);
        const atak = bron.system.activities.find(a => a.type === "attack");
        const { parts, data } = atak.getAttackData();
        const roll = new Roll(parts.join(" + "), data);
        await roll.evaluate();
        expect(roll.total).to.equal(2 + prof + 3);
        expect(cechyDrona(wynik.dron)).to.include({ bron: true, wrecz: true, lata: false });
      });

      it("obrażenia: kość broni + INT twórcy (@mod), nie cecha drona", function () {
        const atak = bron.system.activities.find(a => a.type === "attack");
        expect(atak.getRollData().mod).to.equal(3);
        const cfg = atak.getDamageConfig({});
        const base = cfg.rolls.find(r => r.base) ?? cfg.rolls[0];
        expect(base.parts.join(" ")).to.match(/@mod/);
        expect(base.data.mod).to.equal(3);
      });

      it("ST obszarowe: @prof = PB twórcy, @abilities.dex.mod = ZRC operatora; dane drona nietknięte", function () {
        const atak = bron.system.activities.find(a => a.type === "attack");
        const rd = atak.getRollData();
        expect(Number(rd.prof)).to.equal(towarzysz(wynik.dron).tworca.prof);
        expect(rd.abilities.dex.mod).to.equal(3);
        expect(wynik.dron.system.abilities.dex.mod, "ZRC drona w danych").to.equal(2);
      });

      it("broń położona na dronie jest zamontowana i założona — da się jej użyć", function () {
        expect(bron.flags[MODULE_ID].zamontowane).to.equal(true);
        expect(bron.system.equipped).to.equal(true);
      });

      it("dron w symulacji magazynków, zwykły BN nie (U14)", function () {
        expect(inMagazineSystem(wynik.dron)).to.equal(true);
        expect(inMagazineSystem({ type: "npc", flags: {}, getFlag: () => null })).to.equal(false);
      });
    });

    describe("Produkcja: wiersz Hakerstwa kończy się dronem (§7.9)", function () {
      it("odwołanie wyniku → rodzaj drona", function () {
        expect(rodzajZPrzepisu("tabela:dron-kroczacy")).to.equal("dron-kroczacy");
        expect(rodzajZPrzepisu("tabela:dron-latajacy")).to.equal("dron-latajacy");
        expect(rodzajZPrzepisu("tabela:router")).to.equal(null);
      });

      it("ukończona Robota: dron ze stemplem kierownika i uchwyt u posiadacza", async function () {
        const haker = await scratchActor({ name: `${SCRATCH_PREFIX} Kierownik`, system: { abilities: { int: { value: 14 } } } });
        await haker.createEmbeddedDocuments("Item", Object.entries({ CE: 10, CH: 1, CZ: 29, MK: 5 })
          .map(([k, v]) => buildSurowiecItemData(k, v)));
        const robota = await ROBOTA.start(haker, "hakerstwo/tabela:dron-latajacy", { mimoBrakow: true, adHocMG: true });
        expect(robota, "Robota wystartowała").to.be.ok;
        await ROBOTA.zakoncz(robota, { zrodlo: "bez-testu" });
        const [d] = dronyPosiadacza(haker);
        expect(d, "uchwyt w ekwipunku").to.be.ok;
        drony.push(d.dron);
        expect(towarzysz(d.dron).rodzaj).to.equal("dron-latajacy");
        expect(towarzysz(d.dron).tworca).to.include({ uuid: haker.uuid, int: 2 });
        expect(d.dron.system.attributes.hp.max).to.equal(10);
        expect(d.uchwyt.system.weight.value).to.equal(4);
      });
    });
  });
}
