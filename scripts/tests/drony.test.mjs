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
 * E7c: Wyłączony z kilku przyczyn naraz, dron na 0 PW i z Olbrzymimi obrażeniami (§7.4), Tabela awarii z
 * pominięciami i [Zastosuj] (D10), zasilanie na zegarze z akumulatorem i agregatem (U15), upadek latającego (D29).
 *
 * E8a: sygnał z żetonów (U17: odległość z wysokością, „pod ziemią”, tory pościgu, brak żetonu operatora, kontroler
 * poza ręką), własność operatora przez prawdziwy przekaźnik (D12: nadanie, przejęcie, zwolnienie, Reakcja do zmiany
 * tury, właściciel uchwytu nietknięty, złożenie), Przejmij sterowanie poza walką, Esc. Sesję na kliencie gracza
 * (kontrola, bramka wizji, utrata sygnału, wyjścia) sprawdza e2e `dron`.
 *
 * E8b: cel obrazu kanału FPV (jakość z sygnału; FAILSAFE, Wyłączony, Oślepiony — sam szum), tryb wizji „Kamera drona”
 * w szablonach, na nowym żetonie i po synchronizacji wizji (tryb bazowy). Obraz na ekranie — zrzuty e2e `dron`.
 *
 * E8c: OSD — tekst bez polskich liter (D38), RSSI z ikoną i kreskami, bateria z czasem, ostrzeżenia, układ (pole
 * trybu miga ostrzeżeniami, lista akcji tylko w walce, ARMED i licznik, ekran powitalny, granice siatki), stan OSD
 * z prawdziwego drona, zasób czcionki GPL-3 (D39) serwowany z modułu.
 *
 * E9: awarie trwałe i ich zdejmowanie (19 — przyczyna Wyłączenia), plan naprawy NOE/WKK z częściami wg tabeli §7.11
 * (stopień wyżej przy PW ≤ ½), Napraw PW (2k6 + INT, narzędzia — ⚠ i przeklikanie, karta z czasem dla MG), Robota
 * naprawy awarii pod Kobaltem do końca (części schodzą, awaria znika), karta MG pod NOE, wrak (U11), aktywności
 * naprawy dokładane do starych uchwytów.
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
  buildKontrolerItemData, rodzajKontrolera, zasiegKontrolera, AKT_KOMENDA, AKT_STERUJ, AKT_REAGUJ, AKT_PRZEJMIJ,
  KONTROLER_REF, TRYB_AKTYWNOSCI
} from "../items/kontroler.mjs";
import { sygnalDrona, FLAG_POD_ZIEMIA } from "../actors/drony-zdalne.mjs";
import { zmianyOdebrania, FLAG_NADANE, FLAG_STEROWANIE } from "../actors/drony.mjs";
import { KAMERA_ID, celObrazu } from "../actors/drony-obraz.mjs";
import { tekstOsd, liniaRssi, liniaZasilania, ostrzezeniaOsd, ukladOsd, ZNAK } from "../config/osd.mjs";
import { stanOsd, ATLAS_OSD } from "../actors/drony-osd.mjs";
import { naprawPWDrona, naprawAwarieDrona, planNaprawyAwarii } from "../actors/drony-naprawa.mjs";
import { AKT_NAPRAW_PW, AKT_NAPRAW_AWARIE, jestWrakiem } from "../actors/drony.mjs";
import { aktywneAwarie, naprawAwarie } from "../combat/maszyny.mjs";
import { syncActorVision } from "../items/vision-sources.mjs";
import { aktywuj, aktywacjaWRundzie, cechyDrona } from "../actors/drony-sterowanie.mjs";
import { premiaAtakuDrona } from "../actors/drony-bron.mjs";
import { familyOf, inHand } from "../actors/doll.mjs";
import { inMagazineSystem } from "../weapons/magazine-model.mjs";
import { dostepnosc } from "../config/dostepnosc.mjs";
import { wszystkiePrzepisy } from "../config/recipes-data.mjs";
import { wylacz, wlacz, jestWylaczona, przyczynyWylaczenia, cechyMaszyny, zastosujAwarie, awariaMaszyny } from "../combat/maszyny.mjs";
import { stanZasilania, synchronizujZasilanie, wlozAkumulator, zatankuj, spada } from "../actors/drony-stan.mjs";
import { buildProductionGearItemData } from "../items/production-gear.mjs";

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
        expect(u.system.activities.size, "Rozłóż, Złóż, Włóż akumulator, Napraw PW, Napraw awarię").to.equal(5);
        expect(flagaUchwytu(u).zasilanie, "pełny akumulator").to.deep.equal({ procent: 100, od: null });
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

    describe("Maszyny: Wyłączony, 0 PW, Olbrzymie obrażenia (§7.4)", function () {
      let wynik;

      before(async () => {
        const haker = await scratchActor({ name: `${SCRATCH_PREFIX} Twórca maszyny`, system: { abilities: { int: { value: 14 } } } });
        wynik = await nowyDron(haker, "dron-kroczacy");
      });

      it("jeden efekt, kilka przyczyn — znika dopiero bez żadnej", async function () {
        // (Nie „zasilanie”: dron z pełnym akumulatorem tę przyczynę od razu traci — rozlicza to MG.)
        await wylacz(wynik.dron, "awaria");
        await wylacz(wynik.dron, "pw0");
        expect(wynik.dron.effects.filter(e => e.statuses.has("wylaczony")).length).to.equal(1);
        expect(przyczynyWylaczenia(wynik.dron).sort()).to.deep.equal(["awaria", "pw0"]);
        expect(await wlacz(wynik.dron, "awaria")).to.equal(false);
        expect(jestWylaczona(wynik.dron)).to.equal(true);
        expect(await wlacz(wynik.dron, "pw0")).to.equal(true);
        expect(jestWylaczona(wynik.dron)).to.equal(false);
      });

      it("0 PW → Wyłączony, nie martwy; naprawa ponad 0 → działa (T4)", async function () {
        await wynik.dron.update({ "system.attributes.hp.value": 0 });
        await waitFor(() => jestWylaczona(wynik.dron), { label: "Wyłączony" });
        expect(wynik.dron.statuses.has("dead")).to.equal(false);
        expect(przyczynyWylaczenia(wynik.dron)).to.deep.equal(["pw0"]);
        await wynik.dron.update({ "system.attributes.hp.value": 5 });
        await waitFor(() => !jestWylaczona(wynik.dron), { label: "włączony" });
      });

      it("Olbrzymie obrażenia → karta „Śmierć”: zniszczony (T2, potwierdza MG)", async function () {
        const max = wynik.dron.system.attributes.hp.max;
        await wynik.dron.applyDamage(2 * max + 5);
        const karta = await waitFor(() => game.messages.contents.findLast(m =>
          m.getFlag(MODULE_ID, "umieranieSmierc")?.actorUuid === wynik.dron.uuid), { label: "karta Śmierć" });
        expect(karta.getFlag(MODULE_ID, "umieranieSmierc").przyczyna).to.equal("zniszczony");
        expect(wynik.dron.statuses.has("dead"), "bez potwierdzenia nie martwy").to.equal(false);
      });
    });

    describe("Tabela awarii: pominięcia i [Zastosuj] (D10)", function () {
      let wynik;

      before(async () => {
        const haker = await scratchActor({ name: `${SCRATCH_PREFIX} Twórca awarii`, system: { abilities: { int: { value: 16 } } } });
        wynik = await nowyDron(haker, "dron-kroczacy");
      });

      it("dron bez broni: 1 → 2; 14 → 17 (bez ataków), 15–16 pominięte", function () {
        expect(cechyMaszyny(wynik.dron)).to.include({ bron: false, ataki: false });
        expect(awariaMaszyny(wynik.dron, 1)).to.include({ pozycja: 2 });
        const a = awariaMaszyny(wynik.dron, 14);
        expect(a.pozycja).to.equal(17);
        expect(a.pominiete).to.deep.equal([14, 15, 16]);
      });

      it("2 — Szybkość ½; 13 — TT −2; 5 — Sparaliżowanie; 11 — Podpalenie; 19 — Wyłączony do naprawy", async function () {
        const szybkosc = wynik.dron.system.attributes.movement.walk;
        const tt = wynik.dron.system.attributes.ac.value;
        await zastosujAwarie(wynik.dron, 2);
        expect(wynik.dron.system.attributes.movement.walk).to.equal(szybkosc / 2);
        await zastosujAwarie(wynik.dron, 13);
        expect(wynik.dron.system.attributes.ac.value).to.equal(tt - 2);
        await zastosujAwarie(wynik.dron, 5);
        await zastosujAwarie(wynik.dron, 11);
        await zastosujAwarie(wynik.dron, 19);
        expect(wynik.dron.system.attributes.movement.walk, "Sparaliżowanie i Wyłączony — Szybkość 0").to.equal(0);
        expect(wynik.dron.statuses.has("paralyzed")).to.equal(true);
        expect(wynik.dron.statuses.has("burning")).to.equal(true);
        expect(przyczynyWylaczenia(wynik.dron)).to.include("awaria");
        const trwale = wynik.dron.effects.filter(e => e.getFlag(MODULE_ID, "awaria"));
        expect(trwale.map(e => e.getFlag(MODULE_ID, "awaria")).sort((x, y) => x - y)).to.deep.equal([2, 5, 13]);
      });

      it("3 — kara −2 wchodzi do ataku drona (premie aktora zostają)", async function () {
        const operator = await scratchActor({ name: `${SCRATCH_PREFIX} Operator awarii`, system: { abilities: { dex: { value: 12 } } } });
        await wynik.dron.update({ [`flags.${MODULE_ID}.towarzysz.operator`]: operator.uuid });
        const docs = await game.packs.get(`${MODULE_ID}.bron`).getDocuments();
        const [b] = await wynik.dron.createEmbeddedDocuments("Item", [game.items.fromCompendium(docs.find(d => d.name === "Sztylet"))]);
        const bron = await waitFor(() => wynik.dron.items.get(b.id)?.system.activities.find(a => a.type === "attack") ? wynik.dron.items.get(b.id) : null,
          { label: "aktywność ataku" });
        const atak = () => {
          const { parts, data } = bron.system.activities.find(a => a.type === "attack").getAttackData();
          return new Roll(parts.join(" + "), data).evaluateSync({ strict: false }).total;
        };
        const przed = atak();
        await zastosujAwarie(wynik.dron, 3);
        expect(atak()).to.equal(przed - 2);
      });
    });

    describe("Zasilanie: akumulator i agregat na zegarze (U15)", function () {
      let holder, wynik, scenaZ;
      const u = () => uchwytDrona(wynik.dron);

      before(async () => {
        scenaZ = await scenaTestowa();
        holder = await scratchActor({ name: `${SCRATCH_PREFIX} Posiadacz zasilania` });
        wynik = await nowyDron(holder, "dron-kroczacy");
      });
      after(async () => { if (game.scenes.get(scenaZ.id)) await scenaZ.delete(); });

      it("złożony nie pracuje; rozłożony pracuje — 1 h akumulatora średniego drona", async function () {
        expect(stanZasilania(wynik.dron)).to.include({ procent: 100, pracuje: false });
        await rozloz(u(), { pozycja: { x: 200, y: 200 }, scena: scenaZ });
        await waitFor(() => stanZasilania(wynik.dron)?.pracuje, { label: "pracuje" });
        const od = flagaUchwytu(u()).zasilanie.od;
        expect(od).to.equal(game.time.worldTime);
        expect(Math.round(stanZasilania(wynik.dron, od + 1800).procent)).to.equal(50);
        expect(stanZasilania(wynik.dron, od + 3600).procent).to.equal(0);
      });

      it("wyczerpany → Wyłączony (zasilanie); Włóż akumulator → 100%, stary wraca, dron działa", async function () {
        await u().update({ [`flags.${MODULE_ID}.dron.zasilanie`]: { procent: 0, od: null } });
        await synchronizujZasilanie(wynik.dron);
        await waitFor(() => przyczynyWylaczenia(wynik.dron).includes("zasilanie"), { label: "Wyłączony z braku prądu" });
        await holder.createEmbeddedDocuments("Item", [buildProductionGearItemData("akumulator")]);
        await wlozAkumulator(u());
        expect(flagaUchwytu(u()).zasilanie.procent).to.equal(100);
        const stary = holder.items.find(i => i.name === "Akumulator (0%)");
        expect(stary?.flags[MODULE_ID].akumulatorProcent).to.equal(0);
        expect(holder.items.filter(i => i.flags?.[MODULE_ID]?.productionGearId === "akumulator").length, "tylko stary").to.equal(1);
        await waitFor(() => !jestWylaczona(wynik.dron), { label: "dron działa" });
      });

      it("agregat zamontowany zasila pierwszy: 0,5 l na godzinę", async function () {
        const [ag] = await wynik.dron.createEmbeddedDocuments("Item", [buildProductionGearItemData("agregat")]);
        expect(wynik.dron.items.get(ag.id).flags[MODULE_ID].zamontowane).to.equal(true);
        await zatankuj(wynik.dron, 1);
        const s0 = stanZasilania(wynik.dron);
        const od = flagaUchwytu(u()).zasilanie.od;
        const s1 = stanZasilania(wynik.dron, od + 3600);
        expect(s1.paliwoL).to.be.closeTo(s0.paliwoL - 0.5, 0.01);
        expect(s1.procent).to.be.closeTo(s0.procent, 0.01);
      });
    });

    describe("Upadek drona latającego (D29)", function () {
      let wynik, scenaU;
      // Prawdziwy rzut obrażeń od upadku i karta — na granicy domyślnych 2 s mocha.
      this.timeout(8000);

      before(async () => {
        scenaU = await scenaTestowa();
        const holder = await scratchActor({ name: `${SCRATCH_PREFIX} Pilot` });
        wynik = await nowyDron(holder, "dron-latajacy");
        await rozloz(uchwytDrona(wynik.dron), { pozycja: { x: 300, y: 300, elevation: 6 }, scena: scenaU });
        await waitFor(() => zetonyDrona(wynik.dron).length, { label: "żeton" });
      });
      after(async () => { if (game.scenes.get(scenaU.id)) await scenaU.delete(); });

      it("Powalenie w powietrzu — opada bez obrażeń (T4)", async function () {
        const [t] = zetonyDrona(wynik.dron);
        expect(t.elevation).to.equal(6);
        const pw = wynik.dron.system.attributes.hp.value;
        await wynik.dron.toggleStatusEffect("prone", { active: true });
        await waitFor(() => zetonyDrona(wynik.dron)[0].elevation === 0, { label: "na ziemi" });
        expect(wynik.dron.system.attributes.hp.value).to.equal(pw);
        await wynik.dron.toggleStatusEffect("prone", { active: false });
      });

      it("Wyłączony w powietrzu — karta „Spada”, [Spada] kładzie żeton i zadaje obrażenia od upadku (T2)", async function () {
        const [t] = zetonyDrona(wynik.dron);
        await t.update({ elevation: 6 });
        await wylacz(wynik.dron, "awaria");
        const karta = await waitFor(() => game.messages.contents.findLast(m => m.getFlag(MODULE_ID, "dronSpada")?.token === t.uuid),
          { label: "karta Spada" });
        expect(karta.getFlag(MODULE_ID, "dronSpada").wysokosc).to.equal(6);
        expect(zetonyDrona(wynik.dron)[0].elevation, "przed kliknięciem w powietrzu").to.equal(6);
        const pw = wynik.dron.system.attributes.hp.value;
        await spada(karta, t.uuid);
        expect(zetonyDrona(wynik.dron)[0].elevation).to.equal(0);
        expect(wynik.dron.system.attributes.hp.value).to.be.below(pw);
      });
    });

    describe("Sygnał drona z żetonów (U17)", function () {
      let scenaS, operator, wynik, kontroler;
      const zd = () => zetonyDrona(wynik.dron)[0];
      const sg = () => sygnalDrona(wynik.dron, { operator, kontroler: operator.items.get(kontroler.id), scene: scenaS });

      before(async () => {
        scenaS = await scenaTestowa();
        operator = await scratchActor({ name: `${SCRATCH_PREFIX} Operator sygnału`, type: "npc" });
        [kontroler] = await operator.createEmbeddedDocuments("Item", [buildKontrolerItemData("domowy")]);
        wynik = await nowyDron(operator, "dron-latajacy");
        const doc = await operator.getTokenDocument({ x: 100, y: 100, actorLink: true });
        await scenaS.createEmbeddedDocuments("Token", [doc.toObject()]);
        await rozloz(uchwytDrona(wynik.dron), { pozycja: { x: 100, y: 100 }, scena: scenaS });
        await waitFor(() => zd(), { label: "żeton drona" });
      });
      after(async () => { if (game.scenes.get(scenaS.id)) await scenaS.delete(); });

      it("odległość w linii prostej z wysokością: ¼ zasięgu czysto, ½ — 0,5, krawędź — 0, dalej utrata", async function () {
        const na = async m => { await zd().update({ elevation: m }); return sg(); };
        expect((await na(0)).jakosc, "tuż obok").to.equal(1);
        expect((await na(20)).jakosc, "20 m z 100 m").to.equal(1);
        const pol = await na(50);
        expect(pol.jakosc).to.be.closeTo(0.5, 0.01);
        expect(pol).to.include({ zasieg: 100, utracony: false, sciana: false, podZiemia: false });
        expect(pol.odleglosc).to.be.closeTo(50, 0.01);
        expect(await na(100)).to.include({ jakosc: 0, utracony: false });
        expect(await na(101)).to.include({ utracony: true, powod: "zasieg" });
      });

      it("scena „pod ziemią” — zasięg przez przeszkody (100 → 20 m)", async function () {
        await scenaS.setFlag(MODULE_ID, FLAG_POD_ZIEMIA, true);
        try {
          await zd().update({ elevation: 10 });
          const s = sg();
          expect(s).to.include({ zasieg: 20, podZiemia: true, utracony: false });
          expect(s.jakosc).to.be.closeTo(0.5, 0.01);
        } finally {
          await scenaS.unsetFlag(MODULE_ID, FLAG_POD_ZIEMIA);
        }
      });

      it("scena pościgu: odległość z torów (3 tory = 108 m), nie linijką", async function () {
        const [fab] = await operator.createEmbeddedDocuments("Item", [buildKontrolerItemData("fabryczny")]);
        const zo = scenaS.tokens.find(t => t.actorId === operator.id);
        await scenaS.setFlag(MODULE_ID, "poscig", { test: true });
        try {
          await zo.update({ x: 250, y: 100 });           // środek 300 → tor 1
          await zd().update({ x: 850, y: 700, elevation: 30 }); // środek 900 → tor 4; pion i wysokość nie liczą się
          const dom = sg();
          expect(dom).to.include({ odleglosc: 108, utracony: true, powod: "zasieg" });
          const s = sygnalDrona(wynik.dron, { operator, kontroler: fab, scene: scenaS });
          expect(s).to.include({ odleglosc: 108, zasieg: 300, utracony: false });
          expect(s.jakosc).to.be.closeTo(20 * Math.log10(300 / 108) / 12, 0.001);
        } finally {
          await scenaS.unsetFlag(MODULE_ID, "poscig");
          await fab.delete();
          await zo.update({ x: 100, y: 100 });
          await zd().update({ x: 100, y: 100, elevation: 0 });
        }
      });

      it("bez żetonu operatora na scenie — utrata (operator)", async function () {
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Operator bez żetonu`, type: "npc" });
        const [k] = await inny.createEmbeddedDocuments("Item", [buildKontrolerItemData("fabryczny")]);
        expect(sygnalDrona(wynik.dron, { operator: inny, kontroler: k, scene: scenaS })).to.include({ utracony: true, powod: "operator" });
      });

      it("postać z lalką: kontroler w plecaku nie nadaje (D22)", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Operator z plecakiem` });
        const [k] = await pc.createEmbeddedDocuments("Item", [buildKontrolerItemData("fabryczny")]);
        expect(inHand(pc.items.get(k.id))).to.equal(false);
        expect(sygnalDrona(wynik.dron, { operator: pc, kontroler: k, scene: scenaS })).to.include({ utracony: true, powod: "kontroler" });
      });
    });

    describe("Własność operatora przez przekaźnik (D12): nadanie, przejęcie, zwolnienie", function () {
      let operator, wynik, g1, g2, scenaW;
      const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      const nadane = () => wynik.dron.flags[MODULE_ID]?.[FLAG_NADANE] ?? {};
      const poziom = u => wynik.dron.ownership[u.id] ?? 0;
      /** Prośba gracza dokładnie tą drogą, którą idzie z jego klienta: flaga na aktorze, wykonuje aktywny MG. */
      const prosba = async (dane, user) => {
        const nonce = foundry.utils.randomID(12);
        await operator.update({ [`flags.${MODULE_ID}.dronProsby.${nonce}`]: { ...dane, user: user.id } });
        await waitFor(() => !operator.flags?.[MODULE_ID]?.dronProsby?.[nonce], { label: `prośba ${dane.akcja}` });
      };
      const steruj = (user, tryb = "A") => prosba({ akcja: "steruj", dron: wynik.dron.uuid, tryb, operator: operator.uuid,
        znacznik: foundry.utils.randomID(12), combatId: null, runda: null }, user);
      const zwolnij = user => prosba({ akcja: "zwolnij", dron: wynik.dron.uuid }, user);

      before(async function () {
        [g1, g2] = game.users.filter(u => !u.isGM);
        if (!g2) this.skip();
        operator = await scratchActor({ name: `${SCRATCH_PREFIX} Posiadacz (nikt z graczy)` });
        wynik = await nowyDron(operator, "dron-kroczacy");
      });

      it("Steruj gracza: OWNER nadany i zapamiętany, potwierdzenie ze znacznikiem", async function () {
        expect(poziom(g1)).to.equal(0);
        await steruj(g1);
        expect(poziom(g1)).to.equal(OWNER);
        expect(nadane()[g1.id]).to.equal("zdalny");
        expect(wynik.dron.flags[MODULE_ID][FLAG_STEROWANIE]).to.include({ user: g1.id, operator: operator.uuid });
      });

      it("drugi gracz przejmuje: pierwszy traci nadaną własność", async function () {
        await steruj(g2);
        expect(poziom(g2)).to.equal(OWNER);
        expect(poziom(g1), "poprzedni operator").to.equal(0);
        expect(Object.keys(nadane())).to.deep.equal([g2.id]);
        expect(wynik.dron.flags[MODULE_ID][FLAG_STEROWANIE].user).to.equal(g2.id);
      });

      it("zwolnienie przy wyjściu z trybu zdalnego odbiera nadaną własność", async function () {
        await zwolnij(g2);
        expect(poziom(g2)).to.equal(0);
        expect(nadane()).to.deep.equal({});
      });

      it("Reakcja [R]: własność do zmiany tury — wyjście z sesji jej nie odbiera", async function () {
        await steruj(g1, "R");
        expect(nadane()[g1.id]).to.equal("reakcja");
        await zwolnij(g1);
        expect(poziom(g1), "zostaje po zwolnieniu").to.equal(OWNER);
        await wynik.dron.update(zmianyOdebrania(wynik.dron, null, { rodzaj: "reakcja" }));
        expect(poziom(g1), "zmiana tury").to.equal(0);
      });

      it("właściciel uchwytu nie dostaje nadania i nie traci własności przy zwolnieniu", async function () {
        // Tak, jak zostawia ją przeniesienie uchwytu (`_wlasnoscZa`): gracz-właściciel posiadacza — właścicielem drona.
        await operator.update({ [`ownership.${g1.id}`]: OWNER });
        await wynik.dron.update({ [`ownership.${g1.id}`]: OWNER });
        try {
          await steruj(g1);
          expect(nadane()[g1.id], "bez nadania").to.equal(undefined);
          await zwolnij(g1);
          expect(poziom(g1)).to.equal(OWNER);
        } finally {
          await operator.update({ [`ownership.${g1.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE });
          await wynik.dron.update({ [`ownership.${g1.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE });
        }
      });

      it("złożenie drona odbiera nadania i potwierdzenie sterowania", async function () {
        scenaW = await scenaTestowa();
        try {
          await rozloz(uchwytDrona(wynik.dron), { pozycja: { x: 200, y: 200 }, scena: scenaW });
          await steruj(g2);
          expect(poziom(g2)).to.equal(OWNER);
          await zloz(uchwytDrona(wynik.dron));
          expect(poziom(g2)).to.equal(0);
          expect(wynik.dron.flags[MODULE_ID][FLAG_STEROWANIE]).to.equal(undefined);
        } finally {
          if (game.scenes.get(scenaW.id)) await scenaW.delete();
        }
      });
    });

    describe("Przejmij sterowanie i Esc (§7.10)", function () {
      it("czwarta aktywność kontrolera: tryb zdalny poza walką", function () {
        const k = buildKontrolerItemData("fabryczny");
        expect(Object.keys(k.system.activities)).to.include(AKT_PRZEJMIJ);
        expect(AKT_PRZEJMIJ).to.have.length(16);
        expect(TRYB_AKTYWNOSCI[AKT_PRZEJMIJ]).to.equal("Z");
      });

      it("w walce Przejmij odmawia — bez karty i bez prośby", async function () {
        const op = await scratchActor({ name: `${SCRATCH_PREFIX} Operator w walce`, type: "npc" });
        const [k] = await op.createEmbeddedDocuments("Item", [buildKontrolerItemData("fabryczny")]);
        const r = stub(game, "combat", { id: "quench-z", round: 1, started: true, turns: [], combatant: null, getCombatantsByActor: () => [] });
        const w = captureWarnings();
        const przed = game.messages.size;
        try {
          expect(await aktywuj(k, "Z")).to.equal(null);
        } finally {
          r();
          w.restore();
        }
        expect(w.messages.some(m => /Komend|Steruj/.test(m))).to.equal(true);
        expect(game.messages.size).to.equal(przed);
      });

      it("Esc wyjścia zarejestrowany przed „Zamknij” rdzenia", function () {
        const a = game.keybindings.actions.get(`${MODULE_ID}.dronWyjdz`);
        expect(a, "akcja klawisza").to.be.ok;
        expect(a.precedence).to.be.below(CONST.KEYBINDING_PRECEDENCE.DEFERRED);
        expect(a.editable.map(b => b.key)).to.include("Escape");
      });
    });

    describe("Obraz kamery drona (E8b: D34, D38, U16)", function () {
      it("cel obrazu: jakość z sygnału; FAILSAFE, Wyłączony, Oślepiony — sam szum", function () {
        const st = (...x) => ({ statuses: new Set(x) });
        expect(celObrazu(null, null)).to.deep.equal({ jakosc: 1, szum: 0 });
        expect(celObrazu({ sygnal: { jakosc: 0.42, utracony: false } }, st())).to.deep.equal({ jakosc: 0.42, szum: 0 });
        expect(celObrazu({ sygnal: { jakosc: 0, utracony: true }, failsafeOd: 1 }, st()).szum).to.equal(1);
        expect(celObrazu({ sygnal: { jakosc: 1 }, wylaczonyOd: 1 }, st("wylaczony")).szum).to.equal(1);
        expect(celObrazu({ sygnal: { jakosc: 1 } }, st("blinded")), "awaria 8 — optyka").to.deep.equal({ jakosc: 1, szum: 1 });
      });

      it("tryb „Kamera drona” zarejestrowany jak Widzenie w ciemności (kolor w świetle, czerń i biel w ciemności)", function () {
        const m = CONFIG.Canvas.visionModes[KAMERA_ID];
        expect(m, "tryb wizji").to.be.ok;
        expect(m.label).to.equal("Kamera drona");
        expect(m.vision.defaults.saturation).to.equal(CONFIG.Canvas.visionModes.darkvision.vision.defaults.saturation);
      });

      it("szablony dronów w paczce patrzą przez kamerę; zwierzęta — nie", async function () {
        const docs = await game.packs.get(`${MODULE_ID}.towarzysze`).getDocuments();
        const tryb = n => docs.find(d => d.getFlag(MODULE_ID, "towarzyszSzablon") === n)?.prototypeToken.sight.visionMode;
        expect(tryb("dron-kroczacy")).to.equal(KAMERA_ID);
        expect(tryb("dron-latajacy")).to.equal(KAMERA_ID);
        expect(tryb("psi-partner")).to.not.equal(KAMERA_ID);
      });

      it("nowy żeton drona dostaje kamerę, a synchronizacja wizji jej nie zdejmuje (tryb bazowy)", async function () {
        const scenaK = await scenaTestowa();
        try {
          const holder = await scratchActor({ name: `${SCRATCH_PREFIX} Posiadacz kamery` });
          const wynik = await nowyDron(holder, "dron-kroczacy");
          // Dron sprzed E8b: prototyp z „basic” — żeton i tak dostaje kamerę.
          await wynik.dron.update({ "prototypeToken.sight.visionMode": "basic" });
          await rozloz(uchwytDrona(wynik.dron), { pozycja: { x: 200, y: 200 }, scena: scenaK });
          const t = () => zetonyDrona(wynik.dron)[0];
          await waitFor(() => t(), { label: "żeton" });
          expect(t().sight.visionMode).to.equal(KAMERA_ID);
          await syncActorVision(wynik.dron);
          expect(t().sight.visionMode, "po synchronizacji").to.equal(KAMERA_ID);
        } finally {
          await scenaK.delete();
        }
      });
    });

    describe("OSD kamery drona (E8c: D34, D38, D39)", function () {
      const kody = t => [...t].map(c => c.charCodeAt(0));
      const STAN = {
        nazwa: "Dron kroczący", rssi: { wartosc: 87, kreski: 4 }, tryb: "WALK", aktywacja: "A", ostrzezenia: [],
        akcje: ["RUCH", "UNIK", "ATAK"], bron: true, uzbrojony: true, amunicja: 12, pw: [8, 10],
        zasilanie: { procent: 50, minuty: 65 }, powitanie: null, czas: 0
      };
      const el = (u, id) => u.find(e => e.id === id);

      it("tekst OSD: wielkie litery ASCII, bez polskich znaków (D38)", function () {
        expect(tekstOsd("Dron kroczący")).to.equal("DRON KROCZACY");
        expect(tekstOsd("Łódź, żółć")).to.equal("LODZ, ZOLC");
        expect(tekstOsd("a€b")).to.equal("A B");
      });

      it("RSSI: ikona anteny, dwie cyfry, cztery kreski; zasilanie: bateria i G:MM", function () {
        expect(kody(liniaRssi({ wartosc: 7, kreski: 3 }))).to.deep.equal([ZNAK.RSSI, 0x30, 0x37,
          ZNAK.PASEK_START, ZNAK.PASEK_PELNY, ZNAK.PASEK_PELNY, ZNAK.PASEK_PELNY, ZNAK.PASEK_PUSTY, ZNAK.PASEK_KONIEC]);
        expect(kody(liniaZasilania({ procent: 100, minuty: 65 }))).to.deep.equal([0x90, ...kody("1:05")]);
        expect(liniaZasilania({ procent: 0, minuty: 0 }).charCodeAt(0)).to.equal(0x96);
        expect(liniaZasilania({ procent: 50, minuty: null }).slice(1)).to.equal("-:--");
      });

      it("ostrzeżenia: FAILSAFE zamiast RSSI LOW, BAT LOW, skróty awarii", function () {
        expect(ostrzezeniaOsd({ jakosc: 1, procent: 100 })).to.deep.equal([]);
        expect(ostrzezeniaOsd({ jakosc: 0.2, procent: 100 })).to.deep.equal(["RSSI LOW"]);
        expect(ostrzezeniaOsd({ failsafe: true, jakosc: 0, procent: 10, awarie: ["OPTYKA"] }))
          .to.deep.equal(["FAILSAFE", "BAT LOW", "OPTYKA"]);
      });

      it("układ: tryb i aktywacja; ostrzeżenia migają w tym samym polu i krążą co sekundę", function () {
        expect(el(ukladOsd(STAN), "tryb")).to.include({ tekst: "WALK AKCJA", miga: false });
        const u0 = ukladOsd({ ...STAN, ostrzezenia: ["RSSI LOW", "BAT LOW"], czas: 0 });
        const u1 = ukladOsd({ ...STAN, ostrzezenia: ["RSSI LOW", "BAT LOW"], czas: 1.2 });
        expect(el(u0, "tryb")).to.include({ tekst: "RSSI LOW", miga: true });
        expect(el(u1, "tryb").tekst).to.equal("BAT LOW");
        expect(el(ukladOsd({ ...STAN, tryb: "ACRO", aktywacja: null }), "tryb").tekst).to.equal("ACRO");
      });

      it("lista akcji: dwie linie przewijane co sekundę; poza walką jej nie ma", function () {
        const u = ukladOsd({ ...STAN, czas: 1 });
        expect([el(u, "akcja1").tekst, el(u, "akcja2").tekst]).to.deep.equal(["UNIK", "ATAK"]);
        const poza = ukladOsd({ ...STAN, akcje: null });
        expect(el(poza, "akcja1")).to.equal(undefined);
      });

      it("ARMED miga do ataku, potem gaśnie; licznik 0 miga; bez broni nie ma elementu", function () {
        expect(el(ukladOsd(STAN), "armed")).to.include({ tekst: "ARMED", miga: true });
        expect(el(ukladOsd(STAN), "amunicja")).to.include({ tekst: "12", miga: false });
        expect(el(ukladOsd({ ...STAN, uzbrojony: false }), "armed")).to.equal(undefined);
        expect(el(ukladOsd({ ...STAN, amunicja: 0 }), "amunicja")).to.include({ tekst: "0", miga: true });
        const bez = ukladOsd({ ...STAN, bron: false });
        expect(el(bez, "armed") ?? el(bez, "amunicja")).to.equal(undefined);
        expect(el(ukladOsd({ ...STAN, amunicja: null }), "amunicja"), "broń bez magazynka").to.equal(undefined);
      });

      it("ekran powitalny „System ruszył …” i wszystko w granicach siatki", function () {
        const siatka = { kolumny: 24, wiersze: 12 };
        const u = ukladOsd({ ...STAN, powitanie: "System ruszył 4 sierpnia 2051 roku.", ostrzezenia: ["FAILSAFE"] }, siatka);
        const pow = u.filter(e => e.id.startsWith("powitanie")).map(e => e.tekst).join(" ");
        expect(pow).to.equal("SYSTEM RUSZYL 4 SIERPNIA 2051 ROKU.");
        for (const e of u) {
          expect(e.x, e.id).to.be.at.least(0);
          expect(e.x + e.tekst.length, e.id).to.be.at.most(siatka.kolumny);
          expect(e.y, e.id).to.be.within(0, siatka.wiersze - 1);
        }
      });

      it("stan OSD z prawdziwego drona: ACRO, RSSI LOW, awaria, broń bez magazynka, ARMED tylko poza [B]", async function () {
        const holder = await scratchActor({ name: `${SCRATCH_PREFIX} Pilot OSD` });
        const wynik = await nowyDron(holder, "dron-latajacy");
        const k = { czas: 0, start: 0, zaatakowal: false, rssi: { wartosc: 20, kreski: 1 } };
        const sesja = { dronUuid: wynik.dron.uuid, tryb: "A", sygnal: { jakosc: 0.2 }, failsafeOd: null };
        let st = stanOsd(sesja, wynik.dron, k);
        expect(st).to.include({ tryb: "ACRO", aktywacja: "A", bron: false, akcje: null });
        expect(st.ostrzezenia).to.include("RSSI LOW");
        await zastosujAwarie(wynik.dron, 8);
        const docs = await game.packs.get(`${MODULE_ID}.bron`).getDocuments();
        await wynik.dron.createEmbeddedDocuments("Item", [game.items.fromCompendium(docs.find(i => i.name === "Sztylet"))]);
        await waitFor(() => wynik.dron.items.find(i => i.system.activities?.some(a => a.type === "attack")), { label: "atak sztyletu" });
        st = stanOsd(sesja, wynik.dron, k);
        expect(st.ostrzezenia).to.include("OPTYKA");
        expect(st).to.include({ bron: true, uzbrojony: true, amunicja: null });
        expect(stanOsd({ ...sesja, tryb: "B" }, wynik.dron, k).uzbrojony, "[B] nie atakuje").to.equal(false);
        expect(stanOsd(sesja, wynik.dron, { ...k, zaatakowal: true }).uzbrojony, "po ataku").to.equal(false);
      });

      it("czcionka Betaflight jako osobny zasób GPL-3 w module (D39)", async function () {
        const tex = await foundry.canvas.loadTexture(ATLAS_OSD);
        expect([tex.width, tex.height]).to.deep.equal([192, 288]);
        const lic = await (await fetch(`modules/${MODULE_ID}/fonts/osd/LICENSE`)).text();
        expect(lic).to.match(/GNU GENERAL PUBLIC LICENSE\s+Version 3/);
        const nota = await (await fetch(`modules/${MODULE_ID}/fonts/osd/README.md`)).text();
        expect(nota).to.include("resources/osd/2/default.mcm").and.include("2026.6.2");
      });
    });

    describe("Naprawa drona i wrak (E9: D9, D25, D28, U11)", function () {
      this.timeout(10000);
      const kobalt = wlaczony => {
        const get = game.settings.get.bind(game.settings);
        return stub(game.settings, "get", (ns, k) => (ns === MODULE_ID && k === "kobaltEnabled") ? wlaczony : get(ns, k));
      };
      let haker;
      before(async () => {
        haker = await scratchActor({ name: `${SCRATCH_PREFIX} Mechanik`, system: { abilities: { int: { value: 16 } } } });
      });

      it("awarie trwałe: efekty bez przemijających i 19 jako przyczyna Wyłączenia; naprawa je zdejmuje", async function () {
        const { dron } = await nowyDron(haker, "dron-kroczacy");
        const tt = dron.system.attributes.ac.value;
        for (const n of [13, 8, 19, 5]) await zastosujAwarie(dron, n);
        expect(aktywneAwarie(dron).map(a => a.pozycja)).to.deep.equal([8, 13, 19]);
        await naprawAwarie(dron, 13);
        expect(dron.system.attributes.ac.value, "TT wraca").to.equal(tt);
        await naprawAwarie(dron, 19);
        expect(przyczynyWylaczenia(dron)).to.not.include("awaria");
        expect(aktywneAwarie(dron).map(a => a.pozycja)).to.deep.equal([8]);
      });

      it("plan naprawy: NOE — decyduje MG; WKK — części z tabeli §7.11, stopień wyżej przy PW ≤ ½", async function () {
        const { dron } = await nowyDron(haker, "dron-kroczacy");
        await zastosujAwarie(dron, 13);
        expect(planNaprawyAwarii(dron, { kobalt: false })[0].naprawa).to.deep.equal({ warstwa: "noe", decyduje: "mg" });
        const wkk = planNaprawyAwarii(dron, { kobalt: true })[0].naprawa;
        expect(wkk).to.include({ stopien: "troche", st: 15 });
        expect(wkk.surowce, "kroczący, pancerz: 5 MK, 5 CZ").to.deep.equal({ MK: 5, CZ: 5 });
        await dron.update({ "system.attributes.hp.value": Math.floor(dron.system.attributes.hp.max / 2) });
        expect(planNaprawyAwarii(dron, { kobalt: true })[0].naprawa).to.include({ stopien: "harowa", st: 20 });
      });

      it("Napraw PW (1 h): 2k6 + INT, brak narzędzi — pytanie; karta z przyciskiem czasu dla MG", async function () {
        const { dron, uchwyt: u } = await nowyDron(haker, "dron-kroczacy");
        expect(u.system.activities.get(AKT_NAPRAW_PW), "aktywność uchwytu").to.be.ok;
        await dron.update({ "system.attributes.hp.value": 1 });
        let pytano = 0;
        const r = stub(foundry.applications.api.DialogV2, "confirm", async () => (pytano++, true));
        let przyrost;
        try {
          przyrost = await naprawPWDrona(haker.items.get(u.id));
        } finally {
          r();
        }
        expect(pytano, "bez narzędzi hakera i elektronika").to.equal(1);
        expect(przyrost).to.be.within(5, dron.system.attributes.hp.max - 1); // 2k6 + 3, najwyżej do maks.
        expect(dron.system.attributes.hp.value).to.equal(1 + przyrost);
        const karta = game.messages.contents.findLast(m => m.getFlag(MODULE_ID, "dronNaprawaPW")?.dron === dron.uuid);
        expect(karta?.content).to.include('data-neuro-robota="czas"');
      });

      it("WKK: Robota naprawy awarii z częściami — do końca, części schodzą, awaria znika", async function () {
        const r = kobalt(true);
        try {
          const mech = await scratchActor({ name: `${SCRATCH_PREFIX} Mechanik WKK`, system: { abilities: { int: { value: 14 } } } });
          const { dron, uchwyt: u } = await nowyDron(mech, "dron-kroczacy");
          await mech.createEmbeddedDocuments("Item", [buildSurowiecItemData("MK", 6), buildSurowiecItemData("CZ", 6)]);
          await zastosujAwarie(dron, 13);
          const w = stub(foundry.applications.api.DialogV2, "wait", async () => ({ pozycja: 13, mimoBrakow: true }));
          let robota;
          try {
            robota = await naprawAwarieDrona(mech.items.get(u.id));
          } finally {
            w();
          }
          expect(robota, "Robota naprawy").to.be.ok;
          const dane = robota.flags[MODULE_ID].robota;
          expect(dane.rodzaj).to.equal("naprawa");
          expect(dane.przepis.zrodlo).to.include({ awaria: 13, naprawa: "troche" });
          expect(dane.przepis.surowce.map(l => `${l.gb} ${l.typy[0]}`).sort()).to.deep.equal(["5 CZ", "5 MK"]);
          await ROBOTA.zakoncz(robota, { zrodlo: "bez-testu" });
          await waitFor(() => !aktywneAwarie(dron).length, { label: "awaria zdjęta" });
        } finally {
          r();
        }
      });

      it("NOE: karta MG z [Naprawione] i stopniami naprawy", async function () {
        const r = kobalt(false);
        try {
          const { dron, uchwyt: u } = await nowyDron(haker, "dron-latajacy");
          await zastosujAwarie(dron, 8);
          await naprawAwarieDrona(haker.items.get(u.id));
          const karta = game.messages.contents.findLast(m => m.getFlag(MODULE_ID, "dronNaprawaKarta")?.uchwyt === haker.items.get(u.id).uuid);
          expect(karta, "karta MG").to.be.ok;
          expect(karta.content).to.include('data-action="neuroDronNaprawione"').and.include('data-stopien="harowa"');
        } finally {
          r();
        }
      });

      it("wrak (U11): dron „martwy” — uchwyt „Wrak drona”, bez napraw i rozłożenia", async function () {
        const { dron, uchwyt: u } = await nowyDron(haker, "dron-kroczacy");
        await dron.toggleStatusEffect("dead", { active: true });
        const uu = () => haker.items.get(u.id);
        await waitFor(() => uu().flags[MODULE_ID].dron.wrak === true, { label: "uchwyt wrakiem" });
        expect(jestWrakiem(dron)).to.equal(true);
        expect(uu().name).to.equal(`Wrak drona (${dron.name})`);
        const w = captureWarnings();
        try {
          expect(await naprawPWDrona(uu())).to.equal(null);
        } finally {
          w.restore();
        }
        expect(w.messages.some(m => /wrak/i.test(m))).to.equal(true);
        await dron.toggleStatusEffect("dead", { active: false });
        await waitFor(() => uu().flags[MODULE_ID].dron.wrak === false, { label: "już nie wrak" });
      });

      it("uchwyt sprzed E9 dostaje aktywności naprawy przy synchronizacji", async function () {
        const { dron, uchwyt: u } = await nowyDron(haker, "dron-latajacy");
        await haker.items.get(u.id).update({ [`system.activities.-=${AKT_NAPRAW_AWARIE}`]: null });
        expect(haker.items.get(u.id).system.activities.get(AKT_NAPRAW_AWARIE)).to.not.be.ok;
        await dron.update({ name: `${dron.name} II` });
        await waitFor(() => haker.items.get(u.id).system.activities.get(AKT_NAPRAW_AWARIE), { label: "aktywność wróciła" });
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
