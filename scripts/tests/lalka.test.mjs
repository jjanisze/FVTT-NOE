/**
 * Neuroshima 5e — lalka (paper doll). Plan: `PLAN_paper_doll.md`, P1 „Done when".
 *
 * Dwie warstwy (TESTING.md §3):
 *   • warstwa 4 — czysty model `actors/doll-model.mjs`: zamiany, łańcuch wypierania, pytania
 *     (która ręka, upuść czy do plecaka, D27), utrata pojemności, kolizje, wielosłotowość,
 *     kolejność zużycia, koszty ruchów, chwyt. Bez dokumentów — tablice przypadków;
 *   • warstwa 5 — lejek na prawdziwym aktorze: `equipped` = aktywny, przekierowanie natywnego
 *     przełącznika, kopia bez slotów, spadek ilości, bramka użycia.
 *
 * Czego tu nie ma (TESTING.md §4): okien pytań (`DialogV2`), rysowania panelu, kart czatu. Z panelu
 * tylko czysta geometria: rozkład kolumn i kolejność punktów na manekinie.
 */

import { __testing as model, DOLL_FAMILIES, SLOT_GROUPS, HEAVY_ARMOR_BLOCKS_RAW } from "../actors/doll-model.mjs";
import {
  place, takeOff, equip, draw, dollState, dollItems, locationOf, inHand, heldItems, freeHands,
  familyOf, isDollActor, useGate, gripFor, slotsOf, SLOTS_FLAG, migrateDoll
} from "../actors/doll.mjs";
import { POWER_ARMOR_BLOCKS_KOBALT } from "../wkk/config/doll-kobalt.mjs";
import { __testing as gripTesting, firedOneHanded } from "../combat/grip.mjs";
import { ARMOR_MAP, buildArmorItemData } from "../config/armor-data.mjs";
import { WEAPON_MAP, buildWeaponItemData } from "../config/weapons-data.mjs";
import { __testing as ground } from "../actors/ground-items.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";
import { KOBALT_WEAPON_IDS } from "../wkk/config/weapons-data.mjs";
import { __testing as panel } from "../actors/doll-panel.mjs";
import { DOLL_ANCHORS } from "../config/doll-anchors.mjs";
import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, stub } from "./helpers.mjs";

const I = (id, family, slots = [], extra = {}) => ({ id, family, quantity: 1, slots, blocks: [], ...extra });
const moves = r => r.moves.map(m => `${m.itemId}:${m.from}>${m.to}`);
const grip = { onPreRollAttack: gripTesting.onPreRollAttack, zrodloJednaReka: gripTesting.zrodloJednaReka, firedOneHanded };

function weaponData(id) {
  const data = buildWeaponItemData(WEAPON_MAP[id]);
  return { ...data, name: `${SCRATCH_PREFIX} ${data.name}` };
}

function armorData(id) {
  const data = buildArmorItemData(ARMOR_MAP[id]);
  return { ...data, name: `${SCRATCH_PREFIX} ${data.name}` };
}

export function registerLalkaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.lalka`, context => {
    const { describe, it, expect, before, after, afterEach } = context;

    /* ================================================================== */
    /*  Warstwa 4 — czysty model                                           */
    /* ================================================================== */

    describe("Taksonomia slotów (§3)", function () {
      it("liczności z RAW: 2 ręce, 3 przy pasie, 4 pochwy, 3 kabury, po jednym reszta", function () {
        const base = Object.fromEntries(Object.entries(SLOT_GROUPS).map(([g, d]) => [g, d.base]));
        expect(base).to.deep.equal({
          hand: 2, belt: 3, melee: 4, ranged: 3, body: 1, outfit: 1, head: 1, headGear: 1,
          faceGear: 1, shoulder: 1, arms: 1, legs: 1
        });
      });

      it("każda rodzina wskazuje tylko istniejące grupy, a `auto` jest podzbiorem `groups`", function () {
        for (const [id, f] of Object.entries(DOLL_FAMILIES)) {
          for (const g of f.groups) expect(SLOT_GROUPS[g], `${id} → ${g}`).to.exist;
          for (const g of f.auto) expect(f.groups, `${id}.auto → ${g}`).to.include(g);
        }
      });

      it("pas, pochwy i kabury to „schowane”; ręce i noszone — aktywne (`equipped`)", function () {
        expect(model.parseSlot("hand.1")).to.deep.equal({ group: "hand", index: 1 });
        expect(model.parseSlot("plecak")).to.equal(null);
        for (const s of ["belt.0", "melee.3", "ranged.2"]) expect(model.SLOT_GROUPS[model.parseSlot(s).group].tier).to.equal("stowed");
      });

      it("pancerz wspomagany: NOE blokuje ochraniacze, WKK dokłada Hełm, Głowę, Twarz, Strój (D23)", function () {
        expect(HEAVY_ARMOR_BLOCKS_RAW).to.deep.equal(["arms", "legs"]);
        const pa = { type: "equipment", img: "x/icons/armor/pancerz-stalowej-policji.svg", system: { type: { value: "heavy" } } };
        expect(model.blocksOf(pa, "bodyArmor")).to.deep.equal(["arms", "legs"]);
        expect(model.blocksOf(pa, "bodyArmor", { powerArmorKobalt: POWER_ARMOR_BLOCKS_KOBALT }))
          .to.have.members(["arms", "legs", "head", "headGear", "faceGear", "outfit"]);
        const heavy = { ...pa, img: "x/icons/armor/pelna-zbroja-smieciowa.svg" };
        expect(model.blocksOf(heavy, "bodyArmor", { powerArmorKobalt: POWER_ARMOR_BLOCKS_KOBALT }), "zwykły ciężki")
          .to.deep.equal(["arms", "legs"]);
      });
    });

    describe("Klasyfikacja — nieznane nigdy nie jest zgadywane", function () {
      const c = item => model.classifyItem(item);
      const flags = f => ({ [MODULE_ID]: f });

      it("broń po typie modułu; atak bez broni i zaślepki dnd5e — poza lalką", function () {
        expect(c({ type: "weapon", name: "Katana", system: { type: { value: "biala" } } })).to.equal("meleeWeapon");
        expect(c({ type: "weapon", name: "Oszczep", system: { type: { value: "biala" } } }), "D30").to.equal("meleeWeapon");
        for (const t of ["miotana", "palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka", "specjalna"]) {
          expect(c({ type: "weapon", name: "x", system: { type: { value: t } } }), t).to.equal("rangedWeapon");
        }
        expect(c({ type: "weapon", name: "Bez Broni", system: { type: { value: "biala" } } })).to.equal(null);
        expect(c({ type: "weapon", name: "Atak głową", system: { type: { value: "biala" } } })).to.equal(null);
        expect(c({ type: "weapon", name: "Pazury", system: { type: { value: "natural" } } })).to.equal(null);
        expect(c({ type: "weapon", name: "Maczuga", system: { type: { value: "simpleM" } } })).to.equal(null);
      });

      it("pochodnia i tarcza tylko w ręce", function () {
        expect(c({ type: "weapon", name: "Pochodnia", flags: flags({ pochodniaVariant: "smolowa" }), system: { type: { value: "biala" } } }))
          .to.equal("handOnly");
        expect(c({ type: "equipment", system: { type: { value: "shield" } } })).to.equal("handOnly");
      });

      it("pancerze, akcesoria po id katalogu, latarki, gogle, Nomex", function () {
        expect(c({ type: "equipment", system: { type: { value: "medium" } } })).to.equal("bodyArmor");
        expect(c({ type: "equipment", flags: flags({ armorId: "helm" }), system: { type: { value: "trinket" } } })).to.equal("helmet");
        expect(c({ type: "equipment", img: "m/icons/armor/ochraniacze-nog.svg", system: { type: { value: "trinket" } } })).to.equal("legGuards");
        expect(c({ type: "equipment", img: "m/icons/armor/ochraniacze-rak.svg", system: { type: { value: "trinket" } } })).to.equal("armGuards");
        expect(c({ type: "equipment", flags: flags({ latarkaForm: "reczna" }), system: { type: { value: "trinket" } } })).to.equal("light");
        expect(c({ type: "equipment", flags: flags({ latarkaForm: "czolowa" }), system: { type: { value: "trinket" } } })).to.equal("headLight");
        expect(c({ type: "equipment", flags: flags({ gogleWariant: "termowizor" }), system: { type: { value: "trinket" } } })).to.equal("vision");
        expect(c({ type: "equipment", flags: flags({ nomex: true }), system: { type: { value: "trinket" } } })).to.equal("outfit");
      });

      it("jawna flaga `dollSlot` wygrywa; `none` wyłącza; nieznany sprzęt — furtka", function () {
        expect(c({ type: "loot", flags: flags({ dollSlot: "face" }) })).to.equal("face");
        expect(c({ type: "weapon", name: "Katana", flags: flags({ dollSlot: "none" }), system: { type: { value: "biala" } } })).to.equal(null);
        expect(c({ type: "equipment", name: "Kominiarka", system: { type: { value: "trinket" } } })).to.equal(null);
        expect(c({ type: "loot", name: "lornetka" })).to.equal(null);
      });

      it("przedmioty podręczne idą do rodziny pasa", function () {
        expect(model.classifyItem({ type: "tool" }, { handyFamily: () => "tool" })).to.equal("belt");
      });
    });

    describe("Rozstrzyganie ruchu (§4)", function () {
      it("Załóż: broń do wolnej ręki, potem do wolnej kabury, dopiero potem zamiana", function () {
        expect(moves(model.resolve([I("p", "rangedWeapon")], { itemId: "p", to: "auto" }))).to.deep.equal(["p:pack>hand.0"]);
        const full = [I("k", "meleeWeapon", ["hand.0"]), I("s", "handOnly", ["hand.1"]), I("p", "rangedWeapon")];
        expect(moves(model.resolve(full, { itemId: "p", to: "auto" })), "obie ręce zajęte").to.deep.equal(["p:pack>ranged.0"]);
      });

      it("zacięcie (przykład autora): dobycie drugiego pistoletu do wolnej ręki niczego nie rusza", function () {
        const items = [I("p1", "rangedWeapon", ["hand.0"]), I("p2", "rangedWeapon", ["ranged.0"])];
        expect(moves(model.resolve(items, { itemId: "p2", to: "hand" }))).to.deep.equal(["p2:ranged.0>hand.1"]);
      });

      it("Dobądź z pełnymi rękami: dokładnie jeden mieści się w kaburze → on ustępuje", function () {
        const items = [I("k", "meleeWeapon", ["hand.0"]), I("s", "handOnly", ["hand.1"]), I("p", "rangedWeapon", ["ranged.0"])];
        expect(moves(model.resolve(items, { itemId: "p", to: "hand" }))).to.deep.equal(["p:ranged.0>hand.0", "k:hand.0>melee.0"]);
      });

      it("…licząc zwalniany slot: pistolet za pistolet, kabury pełne", function () {
        const items = [I("a", "rangedWeapon", ["hand.0"]), I("s", "handOnly", ["hand.1"]),
          I("b", "rangedWeapon", ["ranged.0"]), I("c", "rangedWeapon", ["ranged.1"]), I("d", "rangedWeapon", ["ranged.2"])];
        expect(moves(model.resolve(items, { itemId: "b", to: "hand" }))).to.deep.equal(["b:ranged.0>hand.0", "a:hand.0>ranged.0"]);
      });

      it("…inaczej jedno pytanie z celem na przycisku; w walce osobno „upuść” i „do plecaka”", function () {
        const items = [I("s1", "handOnly", ["hand.0"]), I("s2", "handOnly", ["hand.1"]), I("p", "rangedWeapon", ["ranged.0"])];
        const peace = model.resolve(items, { itemId: "p", to: "hand" });
        expect(peace.questions[0].kind).to.equal("whichHand");
        expect(peace.questions[0].options.map(o => o.dest)).to.deep.equal(["pack", "pack"]);
        const war = model.resolve(items, { itemId: "p", to: "hand" }, { inCombat: true });
        expect(war.questions[0].options).to.have.lengthOf(4);
        const answered = model.resolve(items, { itemId: "p", to: "hand" },
          { inCombat: true, answers: { hand: { slot: "hand.1", dest: "ground" } } });
        expect(moves(answered)).to.deep.equal(["p:ranged.0>hand.1", "s2:hand.1>ground"]);
      });

      it("wypchnięta broń z ręki: wolna pochwa; bez niej poza walką plecak, w walce pytanie", function () {
        const items = [I("k", "meleeWeapon", ["hand.0"]), I("p", "rangedWeapon")];
        expect(moves(model.resolve(items, { itemId: "p", to: "hand.0" }))).to.deep.equal(["p:pack>hand.0", "k:hand.0>melee.0"]);
        const holsters = ["melee.0", "melee.1", "melee.2", "melee.3"].map((s, n) => I(`m${n}`, "meleeWeapon", [s]));
        const tight = [...items, ...holsters];
        expect(moves(model.resolve(tight, { itemId: "p", to: "hand.0" }))).to.deep.equal(["p:pack>hand.0", "k:hand.0>pack"]);
        const q = model.resolve(tight, { itemId: "p", to: "hand.0" }, { inCombat: true });
        expect(q.questions[0]).to.include({ kind: "displace", itemId: "k" });
      });

      it("zamiana miejscami: ręka ↔ ręka, pas ↔ pas", function () {
        const hands = [I("k", "meleeWeapon", ["hand.0"]), I("p", "rangedWeapon", ["hand.1"])];
        expect(moves(model.resolve(hands, { itemId: "k", from: "hand.0", to: "hand.1" }))).to.deep.equal(["k:hand.0>hand.1", "p:hand.1>hand.0"]);
        const belt = [I("a", "belt", ["belt.0"]), I("b", "belt", ["belt.2"])];
        expect(moves(model.resolve(belt, { itemId: "b", from: "belt.2", to: "belt.0" }))).to.deep.equal(["b:belt.2>belt.0", "a:belt.0>belt.2"]);
      });

      it("D5: położenie na zajęty slot pasa — nowy wjeżdża, stary na wolny slot", function () {
        const items = [I("a", "belt", ["belt.0"]), I("b", "belt")];
        expect(moves(model.resolve(items, { itemId: "b", to: "belt.0" }))).to.deep.equal(["b:pack>belt.0", "a:belt.0>belt.1"]);
      });

      it("ciężki pancerz zrzuca ochraniacze do plecaka bez pytania", function () {
        const items = [I("a", "bodyArmor", [], { blocks: ["arms", "legs"] }), I("o", "armGuards", ["arms.0"]), I("n", "legGuards", ["legs.0"])];
        expect(moves(model.resolve(items, { itemId: "a", to: "auto" }))).to.deep.equal(["a:pack>body.0", "o:arms.0>pack", "n:legs.0>pack"]);
      });

      it("D27: ochraniacze na ciężki pancerz pytają o zdjęcie pancerza — jedyne potwierdzenie", function () {
        const items = [I("a", "bodyArmor", ["body.0"], { blocks: ["arms", "legs"] }), I("o", "armGuards")];
        const r = model.resolve(items, { itemId: "o", to: "auto" });
        expect(r.moves).to.be.empty;
        expect(r.questions[0]).to.include({ kind: "confirmArmor", itemId: "a" });
        const ok = model.resolve(items, { itemId: "o", to: "auto" }, { answers: { confirm: true } });
        expect(moves(ok)).to.deep.equal(["o:pack>arms.0", "a:body.0>pack"]);
      });

      it("utrata pojemności: zdjęta kamizelka wysypuje nadmiar pasa do plecaka (od najwyższego)", function () {
        const vest = I("v", "bodyArmor", ["body.0"], { capacity: { belt: 1 } });
        const g = I("g", "belt", ["belt.0", "belt.1", "belt.2", "belt.3"], { quantity: 6 });
        expect(moves(model.resolve([vest, g], { itemId: "v", to: "pack" }))).to.deep.equal(["v:body.0>pack", "g:belt.3>pack"]);
      });

      it("latarka: Ramię, potem wolna ręka; czołówka od razu na Głowę", function () {
        expect(moves(model.resolve([I("l", "light")], { itemId: "l", to: "auto" }))).to.deep.equal(["l:pack>shoulder.0"]);
        expect(moves(model.resolve([I("x", "light", ["shoulder.0"]), I("l", "light")], { itemId: "l", to: "auto" })))
          .to.deep.equal(["l:pack>hand.0"]);
        expect(moves(model.resolve([I("c", "headLight")], { itemId: "c", to: "auto" }))).to.deep.equal(["c:pack>headGear.0"]);
      });

      it("odmowy tylko za zły cel, nigdy za zajęty slot", function () {
        expect(model.resolve([I("k", "meleeWeapon")], { itemId: "k", to: "ranged.0" }).refusal).to.be.a("string");
        expect(model.resolve([I("k", "meleeWeapon")], { itemId: "k", to: "melee.9" }).refusal).to.be.a("string");
        expect(model.resolve([I("k", "meleeWeapon", ["hand.0"])], { itemId: "k", to: "auto" }).refusal, "już w ręce").to.be.a("string");
      });

      it("lokator ręki (pochwycenie) blokuje tę rękę", function () {
        const r = model.resolve([I("p", "rangedWeapon")], { itemId: "p", to: "auto" }, { occupants: { "hand.0": { label: "trzyma: X" } } });
        expect(moves(r)).to.deep.equal(["p:pack>hand.1"]);
        expect(model.resolve([I("p", "rangedWeapon")], { itemId: "p", to: "hand.0" }, { occupants: { "hand.0": { label: "X" } } }).refusal)
          .to.be.a("string");
      });

      it("sztuki stosu: rzutki rozchodzą się po kaburach, jedna do ręki", function () {
        const knives = I("n", "rangedWeapon", ["ranged.0", "ranged.1"], { quantity: 10 });
        expect(moves(model.resolve([knives], { itemId: "n", to: "hand" }))).to.deep.equal(["n:ranged.0>hand.0"]);
        expect(moves(model.resolve([knives], { itemId: "n", to: "ranged" }))).to.deep.equal(["n:pack>ranged.2"]);
      });
    });

    describe("Stan błędu i zużycie", function () {
      it("kolizje, slot ponad pojemność, zła grupa i blokada lądują w `conflicts`", function () {
        const lay = model.layoutOf([
          I("a", "belt", ["belt.0", "belt.5"], { quantity: 2 }), I("b", "belt", ["belt.0"]),
          I("k", "meleeWeapon", ["ranged.0"]),
          I("h", "bodyArmor", ["body.0"], { blocks: ["arms"] }), I("o", "armGuards", ["arms.0"])
        ]);
        expect(lay.conflicts.map(c => `${c.itemId}@${c.slot}`)).to.have.members(["a@belt.5", "b@belt.0", "k@ranged.0", "o@arms.0"]);
        expect(model.normalizeMoves([I("b", "belt", ["belt.0"]), I("c", "belt", ["belt.0"])]).map(m => m.itemId)).to.deep.equal(["c"]);
      });

      it("zużycie: podpowiedź, potem ręka, pas, kabury; w grupie od najwyższego", function () {
        const f = model.slotsAfterSpend;
        expect(f(["belt.0", "belt.2"], 5, 4)).to.deep.equal(["belt.0"]);
        expect(f(["belt.0", "belt.2"], 5, 4, "belt.0")).to.deep.equal(["belt.2"]);
        expect(f(["ranged.0", "hand.0", "ranged.1"], 5, 4), "rzucony z ręki").to.deep.equal(["ranged.0", "ranged.1"]);
        expect(f(["belt.0", "belt.2"], 2, 0, "belt.2")).to.deep.equal([]);
        expect(f(["belt.0", "belt.2"], 5, 7), "przybytek do plecaka").to.deep.equal(["belt.0", "belt.2"]);
      });

      it("lokalizacja stosu: najbardziej aktywna sztuka plus licznik", function () {
        expect(model.locationOf(I("n", "rangedWeapon", ["ranged.0", "hand.1"], { quantity: 5 })))
          .to.deep.equal({ kind: "hand", slots: ["hand.1"], count: 2 });
        expect(model.locationOf(I("n", "rangedWeapon")).kind).to.equal("pack");
      });
    });

    describe("Chwyt (D2)", function () {
      it("oburącz można wtedy i tylko wtedy, gdy druga ręka jest pusta", function () {
        expect(model.gripOf([I("r", "rangedWeapon", ["hand.0"])], "r").grips).to.deep.equal([1, 2]);
        expect(model.gripOf([I("r", "rangedWeapon", ["hand.0"]), I("s", "handOnly", ["hand.1"])], "r").grips).to.deep.equal([1]);
        expect(model.gripOf([I("r", "rangedWeapon", ["hand.0"])], "r", { occupants: { "hand.1": { label: "X" } } }).grips).to.deep.equal([1]);
        expect(model.gripOf([I("r", "rangedWeapon", ["ranged.0"])], "r").held).to.equal(false);
      });
    });

    describe("Koszt ruchu (§6) — pokazywany, nigdy liczony", function () {
      const k = (from, to, ctx) => model.moveCost({ from, to }, ctx).label;
      it("dobycie i schowanie [I], plecak Akcja, ręka ↔ ręka darmo", function () {
        expect(k("ranged.0", "hand.0")).to.equal("[I]");
        expect(k("hand.0", "melee.2")).to.equal("[I]");
        expect(k("pack", "hand.0")).to.equal("Akcja");
        expect(k("belt.1", "pack")).to.equal("Akcja");
        expect(k("hand.0", "hand.1")).to.equal("darmo");
        expect(k("hand.0", "ground")).to.equal("[I]");
        expect(k("ground", "hand.0")).to.equal("[I]");
      });
      it("pancerz 1/2/4 Akcje, akcesoria i Głowa/Twarz/Ramię/Strój po 1", function () {
        expect(k("pack", "body.0", { donTime: 4 })).to.equal("4 Akcje");
        expect(k("body.0", "pack", { donTime: 2 })).to.equal("2 Akcje");
        expect(k("pack", "head.0")).to.equal("Akcja");
        expect(k("hand.0", "shoulder.0")).to.equal("Akcja");
      });
      it("wyjątki: zdolności dobywania, mimowolne, WKK Darmowe upuszczanie", function () {
        expect(k("ranged.0", "hand.0", { freeDraw: ["Dobywanie (Rewolwerowiec)"] })).to.equal("darmo");
        expect(k("hand.0", "ground", { involuntary: true })).to.equal("bez kosztu");
        expect(k("hand.0", "ground", { freeDrop: true, family: "rangedWeapon" })).to.equal("darmo");
        expect(k("pack", "hand.0", { mamPodReka: true })).to.equal("[I]");
      });
    });

    describe("Panel Oporządzenia — geometria kolumn (bez krzyżowania linii)", function () {
      it("każda kolumna: punkty z góry na dół i ze swojej połowy manekina", function () {
        const key = s => (s.startsWith("hand") ? s : s.split(".")[0]);
        for (const [col, half] of [[panel.LEFT, x => x <= 0.5], [panel.RIGHT, x => x >= 0.5]]) {
          const pts = col.map(s => DOLL_ANCHORS[key(s)]);
          expect(pts.every(Boolean), "każdy slot kolumny ma punkt").to.equal(true);
          expect(pts.every(p => half(p.x)), "punkt po stronie kolumny").to.equal(true);
          for (let i = 1; i < pts.length; i++) expect(pts[i].y).to.be.greaterThan(pts[i - 1].y);
        }
      });

      it("spreadCells: komórki tam, gdzie chcą, gdy jest miejsce", function () {
        expect(panel.spreadCells([0, 100, 200], [50, 50, 50], 4, 0, 400)).to.deep.equal([0, 100, 200]);
      });

      it("spreadCells: bez nakładania, kolejność zostaje, całość w kolumnie", function () {
        const sizes = [56, 56, 56, 62, 56];
        const tops = panel.spreadCells([-7, 15, 90, 140, 163], sizes, 4, 0, 360);
        tops.forEach((t, i) => {
          expect(t).to.be.at.least(0);
          expect(t + sizes[i]).to.be.at.most(360);
          if (i) expect(t).to.be.at.least(tops[i - 1] + sizes[i - 1] + 4);
        });
      });

      it("spreadCells: tłok przy dnie wypycha w górę, skupisko centruje", function () {
        expect(panel.spreadCells([300, 310, 320], [50, 50, 50], 4, 0, 400).map(Math.round)).to.deep.equal([242, 296, 350]);
        expect(panel.spreadCells([100, 100, 100], [50, 50, 50], 4, 0, 400).map(Math.round)).to.deep.equal([46, 100, 154]);
      });
    });

    describe("Ziemia (§9) — paczki, BN przy 0 PW", function () {
      it("D37: w upuszczonej broni z katalogu 1…max(1, ⌊pojemność/2⌋) naboi", function () {
        const f = ground.droppedRounds;
        expect(f(30, () => 0)).to.equal(1);
        expect(f(30, () => 0.9999)).to.equal(15);
        expect(f(1, () => 0.9999), "pojemność 1 — jej jeden nabój").to.equal(1);
        expect(f(5, () => 0.9999)).to.equal(2);
        for (let i = 0; i < 50; i++) {
          const n = f(6);
          expect(n).to.be.within(1, 3);
        }
      });

      it("broń z wymiennym magazynkiem spada razem z magazynkiem (paczka z linkiem)", function () {
        const b = ground.catalogBundle("ar", { random: () => 0.9999 });
        expect(b.items.map(i => i.ref)).to.deep.equal(["main", "mag"]);
        expect(b.links).to.deep.equal([{ ref: "main", flag: "loadedMag", to: "mag" }]);
        const rounds = b.items[1].data.flags[MODULE_ID].magazine.rounds;
        expect(rounds.length).to.equal(15);
        expect(b.items[0].data.flags[MODULE_ID].mag.current).to.equal(15);
      });

      it("rewolwer (bębenek) — naboje w samej broni, bez magazynka", function () {
        const b = ground.catalogBundle("peacemaker", { random: () => 0 });
        expect(b.items).to.have.lengthOf(1);
        expect(b.items[0].data.flags[MODULE_ID].mag.current).to.equal(1);
      });

      it("broń biała nie ma czego ładować; nieznane id → nic", function () {
        expect(ground.catalogBundle("katana").items).to.have.lengthOf(1);
        expect(ground.catalogBundle("nie-ma-takiej")).to.equal(null);
      });

      it("dropsAs: z tabeli Bestiariusza po stworze i wpisie; Grubas upuszcza jeden oszczep", function () {
        const feat = (creature, entryId) => ({ type: "feat", name: entryId, flags: { [MODULE_ID]: { bestiary: { creature, entryId } } } });
        expect(ground.dropsAsOf(feat("szeryf", "44-magnum"))).to.equal("magnum-44");
        expect(ground.dropsAsOf(feat("gangus-boss", "utwardzony-crash"))).to.deep.equal({ id: "crash", addons: ["utwardzenie"] });
        expect(ground.dropsAsOf(feat("korzec", "konar")), "żadnego zgadywania po nazwie").to.equal(null);
        const grubas = { items: [feat("generacja-iii-grubas", "oszczep-wrecz"), feat("generacja-iii-grubas", "oszczep-dystans"),
          feat("generacja-iii-grubas", "maczuga")] };
        const list = ground.npcDroppables(grubas, { kobalt: true }).map(d => d.weaponId);
        expect(list).to.deep.equal(["oszczep", "maczuga"]);
        expect(ground.npcDroppables(grubas, { kobalt: false }).map(d => d.weaponId), "bez Kobaltu — bez śmieci WKK")
          .to.deep.equal(["oszczep"]);
      });

      it("każdy cel `dropsAs` w tabeli Bestiariusza istnieje w katalogu broni", function () {
        for (const [cid, c] of Object.entries(BESTIARY)) {
          for (const a of c.attacks ?? []) {
            if (!a.dropsAs) continue;
            const id = typeof a.dropsAs === "string" ? a.dropsAs : a.dropsAs.id;
            expect(WEAPON_MAP[id], `${cid}.${a.id} → ${id}`).to.exist;
          }
        }
      });

      it("śmieci sprzedawcy (D36) są WKK, bronią białą i słabsze od kuzynów z RAW", function () {
        for (const id of ["maczuga", "palka-policyjna", "kamienny-noz", "sztylet", "mlotek"]) {
          expect(KOBALT_WEAPON_IDS, id).to.include(id);
          expect(WEAPON_MAP[id].type, id).to.equal("biala");
          expect(WEAPON_MAP[id].damage.denomination, id).to.be.at.most(6);
        }
      });
    });

    /* ================================================================== */
    /*  Warstwa 5 — lejek na prawdziwym aktorze                            */
    /* ================================================================== */

    describe("Lejek na postaci", function () {
      let actor;
      const live = doc => actor.items.get(doc.id);
      const restores = [];

      before(async function () {
        actor = await scratchActor({ name: `${SCRATCH_PREFIX} lalka` });
      });
      afterEach(function () {
        while (restores.length) restores.pop()();
      });
      after(async function () {
        await scratchCleanup();
      });

      async function make(data) {
        const [doc] = await actor.createEmbeddedDocuments("Item", [data], { render: false });
        return doc;
      }

      it("postać ma lalkę, Zbrojownia i BN-y nie (D10)", function () {
        expect(isDollActor(actor)).to.equal(true);
        expect(isDollActor({ documentName: "Actor", type: "npc", getFlag: () => undefined })).to.equal(false);
        expect(isDollActor({ documentName: "Actor", type: "character", getFlag: (_m, k) => k === "isZbrojownia" })).to.equal(false);
      });

      it("nowa sztuka ląduje w plecaku, nawet skopiowana jako założona z cudzymi slotami", async function () {
        const data = weaponData("b92");
        data.system.equipped = true;
        data.flags[MODULE_ID][SLOTS_FLAG] = ["hand.0"];
        const gun = await make(data);
        expect(gun.system.equipped).to.equal(false);
        expect(gun.getFlag(MODULE_ID, SLOTS_FLAG)).to.equal(undefined);
        expect(locationOf(gun).kind).to.equal("pack");
        await gun.delete();
      });

      it("migracja D9: stare `equipped` bez slotów → plecak; położone przez lejek zostaje; drugi raz nic", async function () {
        const old = await make(weaponData("b92"));
        await live(old).update({ "system.equipped": true }, { neuroDoll: true }); // stan sprzed lalki
        const held = await make(weaponData("b92"));
        expect(await place(actor, held, "hand.1", { quiet: true })).to.equal(true);
        const report = await migrateDoll({ commit: true, actors: [actor] });
        expect(live(old).system.equipped).to.equal(false);
        expect(slotsOf(live(held))).to.deep.equal(["hand.1"]);
        expect(live(held).system.equipped).to.equal(true);
        expect(report.flatMap(r => r.changes)).to.have.length(1);
        expect(await migrateDoll({ commit: true, actors: [actor] })).to.deep.equal([]);
        await live(old).delete();
        await live(held).delete();
      });

      it("`equipped` = aktywny: ręka i noszone tak, kabura nie", async function () {
        const gun = await make(weaponData("b92"));
        expect(await place(actor, gun, "ranged.0", { quiet: true })).to.equal(true);
        expect(live(gun).system.equipped, "w kaburze").to.equal(false);
        expect(await draw(live(gun), { quiet: true })).to.equal(true);
        expect(live(gun).system.equipped, "w ręce").to.equal(true);
        expect(inHand(live(gun))).to.equal(true);
        expect(freeHands(actor)).to.equal(1);
        await live(gun).delete();
      });

      it("natywny przełącznik dnd5e idzie przez lejek (Załóż / Zdejmij)", async function () {
        const helm = await make(armorData("helm"));
        await live(helm).update({ "system.equipped": true });
        expect(slotsOf(live(helm))).to.deep.equal(["head.0"]);
        expect(live(helm).system.equipped).to.equal(true);
        await live(helm).update({ "system.equipped": false });
        expect(slotsOf(live(helm))).to.deep.equal([]);
        expect(live(helm).system.equipped).to.equal(false);
        await live(helm).delete();
      });

      it("partia natywnych zapisów `equipped` nie obsadza dwa razy tej samej ręki", async function () {
        const a = await make(weaponData("b92"));
        const b = await make(weaponData("katana"));
        await actor.updateEmbeddedDocuments("Item",
          [{ _id: a.id, "system.equipped": true }, { _id: b.id, "system.equipped": true }], { render: false });
        expect([...slotsOf(live(a)), ...slotsOf(live(b))]).to.have.members(["hand.0", "hand.1"]);
        expect(dollState(actor).layout.conflicts).to.be.empty;
        await actor.deleteEmbeddedDocuments("Item", [a.id, b.id], { render: false });
      });

      it("trzy hełmy nie stoją jeden na drugim — drugi zamienia pierwszy", async function () {
        const a = await make(armorData("helm"));
        const b = await make(armorData("helm"));
        await equip(live(a), { quiet: true });
        await place(actor, live(b), "head.0", { quiet: true });
        expect(live(a).system.equipped, "pierwszy zdjęty").to.equal(false);
        expect(live(b).system.equipped, "drugi założony").to.equal(true);
        await actor.deleteEmbeddedDocuments("Item", [a.id, b.id], { render: false });
      });

      it("spadek ilości zdejmuje sztukę z ręki przed kaburą", async function () {
        const data = weaponData("noz-do-rzucania");
        data.system.quantity = 5;
        const knives = await make(data);
        await place(actor, knives, "ranged", { quiet: true });
        await draw(live(knives), { quiet: true });
        expect(slotsOf(live(knives))).to.have.members(["hand.0"]);
        await place(actor, live(knives), "ranged", { quiet: true });
        expect(slotsOf(live(knives))).to.have.lengthOf(2);
        await live(knives).update({ "system.quantity": 4 });
        expect(slotsOf(live(knives)), "rzucony z ręki").to.not.include("hand.0");
        expect(live(knives).system.equipped).to.equal(false);
        await live(knives).delete();
      });

      it("bramka użycia (D8): plecak → załóż, kabura → dobądź, ręka → atak", async function () {
        const gun = await make(weaponData("b92"));
        expect(useGate(live(gun))).to.equal("equip");
        await place(actor, live(gun), "ranged.0", { quiet: true });
        expect(useGate(live(gun))).to.equal("draw");
        await draw(live(gun), { quiet: true });
        expect(useGate(live(gun))).to.equal("proceed");
        await live(gun).delete();
      });

      it("Zdejmij z ręki poza walką: wolna kabura, a gdy jej brak — plecak", async function () {
        restores.push(stub(actor, "inCombat", false));
        const gun = await make(weaponData("b92"));
        await equip(gun, { quiet: true });
        await takeOff(actor, live(gun), { quiet: true });
        expect(locationOf(live(gun)).kind).to.equal("holster");
        await live(gun).delete();
      });

      it("ciężki pancerz i ochraniacze: założenie pancerza zdejmuje ochraniacze", async function () {
        const guards = await make(armorData("ochraniacze-rak"));
        const heavy = await make(armorData("pelna-zbroja-smieciowa"));
        await equip(live(guards), { quiet: true });
        expect(live(guards).system.equipped).to.equal(true);
        await equip(live(heavy), { quiet: true });
        expect(live(heavy).system.equipped).to.equal(true);
        expect(live(guards).system.equipped, "ochraniacze do plecaka").to.equal(false);
        await actor.deleteEmbeddedDocuments("Item", [guards.id, heavy.id], { render: false });
      });

      it("rodziny realnych przedmiotów katalogu", function () {
        expect(familyOf(weaponData("katana"))).to.equal("meleeWeapon");
        expect(familyOf(weaponData("ar"))).to.equal("rangedWeapon");
        expect(familyOf(armorData("tarcza"))).to.equal("handOnly");
        expect(familyOf(armorData("helm"))).to.equal("helmet");
        expect(familyOf(armorData("kamizelka-taktyczna"))).to.equal("bodyArmor");
      });

      describe("Chwyt na ataku (§5)", function () {
        const attack = (item, attackModeOptions = item.system.attackModes) => {
          const cfg = { subject: { item, actor }, rolls: [{ options: {} }], attackMode: undefined };
          const dialog = { options: { attackModeOptions: [...attackModeOptions] } };
          grip.onPreRollAttack(cfg, dialog);
          return { cfg, dialog, notes: cfg.rolls[0].options.neuroGrip?.notes ?? [] };
        };
        let ar, katana, kafar, pistol;

        before(async function () {
          ar = await make(weaponData("ar"));
          katana = await make(weaponData("katana"));
          kafar = await make(weaponData("kafar"));
          const p = weaponData("b92");
          p.system.properties = [...(p.system.properties ?? []), "poreczna"];
          pistol = await make(p);
        });
        after(async function () {
          await actor.deleteEmbeddedDocuments("Item", [ar.id, katana.id, kafar.id, pistol.id], { render: false });
        });

        it("karabin z wolną drugą ręką — bez Utrudnienia; z zajętą — Utrudnienie (źródło silnika okoliczności)", async function () {
          await place(actor, live(ar), "hand.0", { quiet: true });
          expect(grip.zrodloJednaReka({ item: live(ar) })).to.deep.equal([]);
          await place(actor, live(katana), "hand.1", { quiet: true });
          const [w] = grip.zrodloJednaReka({ item: live(ar) });
          expect(w?.rodzaj).to.equal("utrudnienie");
          expect(w?.label).to.match(/jedną ręką/);
          expect(attack(live(ar)).cfg.disadvantage, "tryb rzutu ustawia silnik, nie chwyt").to.not.equal(true);
        });

        it("poręczna zwalnia z Utrudnienia jedną ręką", async function () {
          await place(actor, live(pistol), "hand.0", { quiet: true });
          const r = attack(live(pistol));
          expect(grip.zrodloJednaReka({ item: live(pistol) })).to.deep.equal([]);
          expect(r.notes[0].text).to.match(/poręczna/);
        });

        it("oburęczna: oburącz przy wolnej ręce, jednorącz i bez opcji oburącz przy zajętej", async function () {
          await place(actor, live(katana), "hand.1", { quiet: true });
          await place(actor, live(pistol), "pack", { quiet: true });
          await place(actor, live(ar), "pack", { quiet: true });
          expect(attack(live(katana)).cfg.attackMode).to.equal("twoHanded");
          await place(actor, live(pistol), "hand.0", { quiet: true });
          const r = attack(live(katana));
          expect(r.cfg.attackMode).to.equal("oneHanded");
          expect(r.dialog.options.attackModeOptions.map(o => o.value)).to.not.include("twoHanded");
        });

        it("dwuręczna z zajętą drugą ręką — ostrzeżenie, nie blokada (D3)", async function () {
          await place(actor, live(kafar), "hand.1", { quiet: true });
          const r = attack(live(kafar));
          expect(r.notes.some(n => n.level === "warn" && /Dwuręczna/.test(n.text))).to.equal(true);
        });

        it("długa seria jedną ręką — cele dostają Ułatwienie (bez względu na poręczną)", async function () {
          expect(grip.firedOneHanded(live(pistol)), "pistolet + kafar w rękach").to.equal(true);
          await place(actor, live(kafar), "pack", { quiet: true });
          expect(grip.firedOneHanded(live(pistol))).to.equal(false);
        });
      });

      it("ręce i chwyt czytane z lalki", async function () {
        const gun = await make(weaponData("ar"));
        await equip(gun, { quiet: true });
        const held = heldItems(actor);
        expect(held.map(h => h.item?.id ?? null)).to.deep.equal([gun.id, null]);
        expect(gripFor(live(gun)).grips).to.deep.equal([1, 2]);
        expect(dollState(actor).layout.slots.get("hand.0")).to.equal(gun.id);
        await live(gun).delete();
        expect(dollItems(actor).some(d => d.id === gun.id)).to.equal(false);
      });
    });
  }, { displayName: "Neuroshima: Lalka — ręce, kabury, pas, noszone" });
}
