/**
 * Neuroshima 5e — stany broni: zacięcie, uszkodzenie, konserwacja i ich plakietki.
 *
 * ## Podział względem paczki `magazynki`
 *
 * Tam siedzi to, co wynika z **magazynków** (gotowość bojowa, plakietki `mag-*`, kolejność
 * slotów łącznie z nimi). Tutaj — reszta osi stanu broni: mechanika zacięć i konserwacji
 * plus ich własne plakietki. Granica idzie po domenie, nie po pliku implementacji.
 *
 * ## Dlaczego kostka jest podmieniana, a nie losowana
 *
 * Testowana reguła brzmi „naturalna 1 powoduje zacięcie, a wyczyszczona broń przerzuca ten
 * wynik jednorazowo". Bez kontroli nad kostką trzeba by rzucać tysiące razy i wnioskować
 * statystycznie — a i tak nie dałoby się rozróżnić „przerzut zadziałał” od „nie wypadła 1”.
 * `CONFIG.Dice.randomUniform` podmieniamy przez `stub()`, więc wraca samo w `afterEach`.
 *
 * **Uwaga na mapowanie**: `0.999` daje 1, a `0.001` daje 20. Odwrotnie, niż podpowiada
 * intuicja — zmierzone na żywo, kosztowało jeden fałszywie zielony przebieg.
 *
 * ## Walki nie tworzymy
 *
 * Wygasanie bufora z końcem walki sprawdzamy przez `Hooks.callAll("deleteCombat", …)`
 * z atrapą. Prawdziwy `Combat` w żywym świecie rozjechałby tracker MG i pozostałym graczom,
 * a reguła u góry tego katalogu testów zabrania zmian stanu świata, które przetrwają test.
 * Sprawdzamy własny handler, nie to, czy Foundry odpala swój hook.
 */

import {
  MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, namedFeat
} from "./helpers.mjs";
import { WEAPON_MAP, buildWeaponItemData } from "../config/weapons-data.mjs";
import { __testing as pips } from "../actors/item-state-pips.mjs";

/** `1d20` zawsze na tę wartość. Patrz uwaga o mapowaniu w nagłówku. */
const ROLL = Object.freeze({ ONE: 0.999, HIGH: 0.1 });

function weaponData(id, name = null) {
  const data = buildWeaponItemData(WEAPON_MAP[id]);
  return { ...data, name: `${SCRATCH_PREFIX} ${name ?? data.name}` };
}

export function registerWeaponStateTests(quench) {
  quench.registerBatch(`${MODULE_ID}.stany-broni`, context => {
    const { describe, it, before, after, beforeEach, afterEach, expect } = context;

    let actor;
    let jams;
    const undo = [];

    before(async function () {
      actor = await scratchActor();
      jams = game.modules.get(MODULE_ID).api.jams;
    });

    after(async function () {
      await scratchCleanup();
    });

    afterEach(function () {
      while (undo.length) undo.pop()();
    });

    /** Ustawia wynik(i) kolejnych `1d20`; ostatnia wartość powtarza się w nieskończoność. */
    function fixDice(...values) {
      let i = 0;
      undo.push(stub(CONFIG.Dice, "randomUniform", () => values[Math.min(i++, values.length - 1)]));
    }

    async function freshGun(name = "AR") {
      const [gun] = await actor.createEmbeddedDocuments("Item", [weaponData("ar", name)], { render: false });
      undo.push(() => void actor.deleteEmbeddedDocuments("Item", [gun.id], { render: false }));
      return gun;
    }

    /**
     * Daje postaci cechę „Wychuchana spluwa” na czas jednego testu.
     *
     * `isPamperedWeapon()` sprawdza DWIE rzeczy: flagę na broni **i** cechę na postaci
     * (`hasAbility`, rozpoznawana po nazwie itemu). Sama flaga to za mało — i słusznie,
     * bo bez cechy nie ma czym wychuchać spluwy. Pierwsza wersja tych testów ustawiała
     * tylko flagę i przez to sprawdzała nie to, co trzeba.
     */
    async function grantPamperAbility() {
      const [feat] = await actor.createEmbeddedDocuments("Item",
        [namedFeat("Wychuchana spluwa")], { render: false });
      undo.push(() => void actor.deleteEmbeddedDocuments("Item", [feat.id], { render: false }));
      return feat;
    }

    const live = gun => actor.items.get(gun.id);

    /* ================================================================== */
    /*  Kostka — fundament pozostałych testów                              */
    /* ================================================================== */

    describe("Podmiana kostki", function () {
      it("0.999 daje 1, 0.1 daje wysoko — mapowanie jest odwrotne do intuicji", async function () {
        /* Ten test istnieje wyłącznie po to, żeby reszta pliku nie kłamała po cichu.
           Gdyby Foundry zmieniło mapowanie, wszystkie testy niżej zrobiłyby się zielone
           z niewłaściwego powodu: „nie wypadła 1, więc nie ma zacięcia”. */
        fixDice(ROLL.ONE);
        expect((await new Roll("1d20").evaluate()).total).to.equal(1);
        while (undo.length) undo.pop()();

        fixDice(ROLL.HIGH);
        expect((await new Roll("1d20").evaluate()).total).to.be.above(1);
      });
    });

    /* ================================================================== */
    /*  Czyszczenie broni (Podręcznik, „Czyszczenie broni palnej”)         */
    /* ================================================================== */

    describe("Czyszczenie broni — przerzut zacięcia", function () {
      it("brudna broń: naturalna 1 to zacięcie, bez litości", async function () {
        const gun = await freshGun("Brudna");
        await gun.setFlag(MODULE_ID, "maintenance", { cleaned: false });
        fixDice(ROLL.ONE);

        const r = await jams.rollJamCheck(live(gun), { label: "Test", chat: false });
        expect(r.jammed, "powinna się zaciąć").to.be.true;
        expect(r.rerolled, "nie ma czym przerzucać").to.be.false;
      });

      it("wyczyszczona: naturalna 1 jest przerzucana i wysoki wynik ratuje broń", async function () {
        const gun = await freshGun("Czysta");
        await gun.setFlag(MODULE_ID, "maintenance", { cleaned: true });
        fixDice(ROLL.ONE, ROLL.HIGH);

        const r = await jams.rollJamCheck(live(gun), { label: "Test", chat: false });
        expect(r.rerolled, "przerzut powinien pójść").to.be.true;
        expect(r.jammed, "przerzut uratował broń").to.be.false;
        expect(jams.isCleaned(live(gun)), "bufor zużyty").to.be.false;
      });

      it("wyczyszczona: przerzut też może paść na 1 — wtedy zacięcie i tak jest", async function () {
        const gun = await freshGun("Pechowa");
        await gun.setFlag(MODULE_ID, "maintenance", { cleaned: true });
        fixDice(ROLL.ONE, ROLL.ONE);

        const r = await jams.rollJamCheck(live(gun), { label: "Test", chat: false });
        expect(r.rerolled).to.be.true;
        expect(r.jammed, "drugi rzut też 1 — zacięcie").to.be.true;
        expect(jams.isCleaned(live(gun)), "bufor zużyty mimo porażki").to.be.false;
      });

      it("bez naturalnej 1 bufor NIE schodzi — to była realna usterka", async function () {
        /* Regresja: przedtem flagę kasował `onPostUseActivity`, czyli pierwszy strzał
           z broni, bez żadnego związku z zacięciem. Godzina konserwacji przepadała
           na pierwszym pociągnięciu za spust, nic nie dając. */
        const gun = await freshGun("Spokojna");
        await gun.setFlag(MODULE_ID, "maintenance", { cleaned: true });
        fixDice(ROLL.HIGH);

        const r = await jams.rollJamCheck(live(gun), { label: "Test", chat: false });
        expect(r.jammed).to.be.false;
        expect(r.rerolled, "nie było czego przerzucać").to.be.false;
        expect(jams.isCleaned(live(gun)), "bufor musi przetrwać").to.be.true;
      });

      it("przerzut jest jednorazowy — druga naturalna 1 w tej samej walce już nie ratuje", async function () {
        const gun = await freshGun("Dwa razy");
        await gun.setFlag(MODULE_ID, "maintenance", { cleaned: true });
        fixDice(ROLL.ONE, ROLL.HIGH, ROLL.ONE);

        const first = await jams.rollJamCheck(live(gun), { label: "Test 1", chat: false });
        expect(first.jammed, "pierwsza uratowana").to.be.false;
        await jams.clearJam(live(gun), { chat: false });

        const second = await jams.rollJamCheck(live(gun), { label: "Test 2", chat: false });
        expect(second.rerolled, "bufor już zużyty").to.be.false;
        expect(second.jammed, "druga 1 zacina broń").to.be.true;
      });
    });

    /* ================================================================== */
    /*  Wychuchana spluwa — odporność, nie przerzut                        */
    /* ================================================================== */

    describe("Wychuchana spluwa", function () {
      it("sama flaga bez cechy postaci nic nie znaczy", async function () {
        /* Kolejność sprawdzeń w `isPamperedWeapon()` jest tu regułą, nie szczegółem:
           bez cechy „Wychuchana spluwa” nie ma czym wychuchać spluwy, więc flaga na broni
           zostaje martwa. Gdyby ktoś to odwrócił, każda broń z flagą stałaby się odporna. */
        const gun = await freshGun("Flaga bez cechy");
        await gun.setFlag(MODULE_ID, "maintenance", { pampered: true });
        fixDice(ROLL.ONE);

        expect(jams.isPamperedWeapon(live(gun)), "brak cechy = brak odporności").to.be.false;
        const r = await jams.rollJamCheck(live(gun), { label: "Test", chat: false });
        expect(r.jammed, "rzut idzie normalnie i broń się zacina").to.be.true;
      });

      it("odporna broń w ogóle nie rzuca — to nie jest przerzut", async function () {
        /* Różnica jest mechaniczna, nie kosmetyczna: odporność sprawdza się PRZED rzutem,
           więc `roll` wraca `null`. Gdyby kiedyś ktoś przepiął to na przerzut, ten test
           padnie i dobrze — przy stole to zupełnie inne odczucie. */
        await grantPamperAbility();
        const gun = await freshGun("Wychuchana");
        await gun.setFlag(MODULE_ID, "maintenance", { pampered: true });
        fixDice(ROLL.ONE);

        expect(jams.isPamperedWeapon(live(gun))).to.be.true;
        const r = await jams.rollJamCheck(live(gun), { label: "Test", chat: false });
        expect(r.jammed).to.be.false;
        expect(r.roll, "rzut nie powinien w ogóle paść").to.equal(null);
      });

      it("odporność nie zjada bufora czyszczenia", async function () {
        await grantPamperAbility();
        const gun = await freshGun("Wychuchana i czysta");
        await gun.setFlag(MODULE_ID, "maintenance", { pampered: true, cleaned: true });
        fixDice(ROLL.ONE);

        await jams.rollJamCheck(live(gun), { label: "Test", chat: false });
        expect(jams.isCleaned(live(gun)), "nie było rzutu, więc nie było czego przerzucać").to.be.true;
      });
    });

    /* ================================================================== */
    /*  Wygasanie bufora z końcem walki                                    */
    /* ================================================================== */

    describe("Koniec walki gasi konserwację", function () {
      it("uczestnikowi walki bufor przepada", async function () {
        const gun = await freshGun("Uczestnik");
        await gun.setFlag(MODULE_ID, "maintenance", { cleaned: true });

        Hooks.callAll("deleteCombat", { combatants: [{ actor }] });
        await new Promise(r => setTimeout(r, 400));

        expect(jams.isCleaned(live(gun)), "„najbliższa walka” minęła").to.be.false;
      });

      it("„wychuchana” przeżywa koniec walki — to stan trwały, nie bufor", async function () {
        await grantPamperAbility();
        const gun = await freshGun("Trwała");
        await gun.setFlag(MODULE_ID, "maintenance", { pampered: true });

        Hooks.callAll("deleteCombat", { combatants: [{ actor }] });
        await new Promise(r => setTimeout(r, 400));

        expect(jams.isPamperedWeapon(live(gun))).to.be.true;
      });

      it("broń kogoś, kogo w tej walce nie było, zachowuje bufor", async function () {
        /* RAW wiąże bufor z „najbliższą walką” — jeżeli postać w niej nie brała udziału,
           jej najbliższa walka dopiero nadejdzie. */
        const gun = await freshGun("Nieobecny");
        await gun.setFlag(MODULE_ID, "maintenance", { cleaned: true });

        Hooks.callAll("deleteCombat", { combatants: [] });
        await new Promise(r => setTimeout(r, 400));

        expect(jams.isCleaned(live(gun))).to.be.true;
      });
    });

    /* ================================================================== */
    /*  Plakietki konserwacji                                              */
    /* ================================================================== */

    describe("Plakietki konserwacji", function () {
      /* Broń BIAŁA, nie palna — celowo. Karabin bez wpiętego magazynka dokłada własną
         plakietkę gotowości (`mag-missing`), więc testy asercjujące „dokładnie te plakietki,
         które ustawiłem klasami" łapałyby ją jako nadmiarową. Maczeta nie ma magazynka
         w ogóle, więc slot gotowości milczy i widać wyłącznie to, co bada ten describe.
         Pierwsza wersja używała karabinu i wywracała się na tym w sześciu testach. */
      let anyItem;

      before(async function () {
        const data = buildWeaponItemData(WEAPON_MAP["katana"]);
        [anyItem] = await actor.createEmbeddedDocuments("Item",
          [{ ...data, name: `${SCRATCH_PREFIX} Do plakietek` }], { render: false });
      });

      after(async function () {
        await actor.deleteEmbeddedDocuments("Item", [anyItem.id], { render: false });
      });

      function fakeRow(...classes) {
        const row = document.createElement("li");
        row.classList.add("item", ...classes);
        row.innerHTML = `<div class="item-name"><div class="name"></div></div>`;
        return row;
      }

      const kindsIn = row => [...row.querySelectorAll(".neuro-pip")]
        .map(p => [...p.classList].find(c => c.startsWith("neuro-pip--")));

      it("wychuchana spluwa ma własną plakietkę", function () {
        const row = fakeRow("neuro-weapon-pampered");
        pips._decorateRow(row, anyItem);
        expect(kindsIn(row)).to.deep.equal(["neuro-pip--pampered"]);
      });

      it("wychuchana wygrywa z wyczyszczoną — jedna plakietka, nie dwie", function () {
        /* Odporność sprawdza się przed rzutem, więc przerzut z czyszczenia na takiej broni
           nigdy nie ma okazji zadziałać. Dwie plakietki sugerowałyby dwie warstwy
           zabezpieczenia tam, gdzie działa jedna. */
        const row = fakeRow("neuro-weapon-pampered", "neuro-weapon-cleaned");
        pips._decorateRow(row, anyItem);
        expect(kindsIn(row)).to.deep.equal(["neuro-pip--pampered"]);
      });

      it("żadna z nich nie gasi ikony — to nie są usterki", function () {
        for (const cls of ["neuro-weapon-pampered", "neuro-weapon-cleaned"]) {
          const row = fakeRow(cls);
          pips._decorateRow(row, anyItem);
          expect(row.classList.contains("neuro-not-ready"), cls).to.be.false;
        }
      });

      it("konserwacja współistnieje z uszkodzeniem i dodatkami", function () {
        /* Wyczyszczona broń wciąż może czekać na rusznikarza — to niezależne osie.
           Dokładnie ten przypadek ginął, gdy wszystko walczyło o `.item-name::after`. */
        const row = fakeRow("neuro-weapon-damaged", "neuro-weapon-pampered", "neuro-has-addons");
        pips._decorateRow(row, anyItem);
        expect(kindsIn(row)).to.deep.equal([
          "neuro-pip--damaged", "neuro-pip--pampered", "neuro-pip--addons"
        ]);
      });

      it("niezmieniony stan nie przebudowuje DOM-u", function () {
        /* Arkusz przerysowuje się przy byle czym. Podmiana elementu pod kursorem gubi dymek
           `data-tooltip`, a przy serii przerysowań pasek miga. */
        const row = fakeRow("neuro-weapon-pampered");
        pips._decorateRow(row, anyItem);
        const first = row.querySelector(".neuro-pips");
        pips._decorateRow(row, anyItem);
        expect(row.querySelector(".neuro-pips"), "ten sam węzeł").to.equal(first);
      });

      it("zmieniony stan przebudowuje pasek", function () {
        const row = fakeRow("neuro-weapon-cleaned");
        pips._decorateRow(row, anyItem);
        expect(kindsIn(row)).to.deep.equal(["neuro-pip--cleaned"]);

        row.classList.remove("neuro-weapon-cleaned");
        row.classList.add("neuro-weapon-pampered");
        pips._decorateRow(row, anyItem);
        expect(kindsIn(row)).to.deep.equal(["neuro-pip--pampered"]);
      });

      it("zejście wszystkich stanów zdejmuje pasek i przygaszenie", function () {
        const row = fakeRow("neuro-weapon-damaged");
        pips._decorateRow(row, anyItem);
        expect(row.querySelector(".neuro-pips")).to.not.equal(null);
        expect(row.classList.contains("neuro-not-ready")).to.be.true;

        row.classList.remove("neuro-weapon-damaged");
        pips._decorateRow(row, anyItem);
        expect(row.querySelector(".neuro-pips"), "pasek ma zniknąć").to.equal(null);
        expect(row.classList.contains("neuro-not-ready"), "przygaszenie ma zejść").to.be.false;
      });

      it("każda plakietka niesie podpowiedź — inaczej symbol jest zagadką", function () {
        const row = fakeRow("neuro-weapon-damaged", "neuro-weapon-pampered", "neuro-has-addons");
        pips._decorateRow(row, anyItem);
        for (const el of row.querySelectorAll(".neuro-pip")) {
          expect(el.dataset.tooltip, el.className).to.be.a("string").and.not.empty;
          expect(el.getAttribute("aria-label"), el.className).to.equal(el.dataset.tooltip);
        }
      });
    });
  });
}
