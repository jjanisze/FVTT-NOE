/**
 * Neuroshima 5e — drony na prawdziwych dokumentach (PLAN_m3_towarzysze.md E7a).
 *
 * Warstwa 5 (dane pochodne): dron ze stemplem twórcy (D23) — PW i TT z mod. INT i PB twórcy w chwili
 * budowy, bez zapisu; zmiana twórcy po budowie niczego nie rusza.
 * Warstwa 3 (niezmienniki): uchwyt jest jeden (kopia odrzucona, „Duplikuj” wyłączone, ilość 1, kopia
 * aktora bez uchwytu), przeniesienie zabiera własność drona; stan uchwytu wynika z żetonów (U12) —
 * rozłożenie, złożenie, żeton skasowany ręcznie, scena skasowana; produkcja kończy się dronem.
 *
 * Synchronizację uchwytu robi aktywny MG — paczka zakłada, że to ta karta (piaskownica albo kampania z
 * jednym MG). Scena, folder „Drony” (gdy go nie było) i wiadomości czatu znikają w `after()`.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, captureWarnings, waitFor } from "./helpers.mjs";
import {
  utworzDrona, rozloz, zloz, przeniesUchwyt, uchwyt, uchwytDrona, dronUchwytu, posiadaczDrona, dronyPosiadacza,
  zetonyDrona, jestDronem, rodzajZPrzepisu, daneUchwytu, liniaUruchomienia, FLAG_UCHWYT
} from "../actors/drony.mjs";
import { towarzysz, jestMaszyna, maStopnieZranienia, jestTowarzyszem } from "../actors/towarzysze.mjs";
import { robotaApi as ROBOTA } from "../production/robota.mjs";
import { buildSurowiecItemData } from "../actors/surowce-store.mjs";

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
    const { describe, it, expect, before, after } = context;
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
