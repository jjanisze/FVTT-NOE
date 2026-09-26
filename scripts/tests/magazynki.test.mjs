/**
 * Neuroshima 5e — magazynki symulacyjne.
 *
 * Projekt: PLAN_magazynki.md §14. Kolejność paczek odpowiada priorytetom stamtąd: najpierw
 * to, co przy złamaniu psuje się cicho i drogo, potem reguły, na końcu asercje na danych.
 *
 * Czego tu NIE ma i dlaczego (TESTING.md §4): `activity.use()`, dialogów wyboru magazynka,
 * okna ładowania i kart czatu. Wszystko, co warto sprawdzić, przechodzi przez `consumeRounds()`
 * albo przez czysty predykat wystawiony w `__testing`.
 */

import {
  WEAPONS, WEAPON_MAP, REMOVABLE_SOURCES, magwellOf, hasChamber, feedModeOf
} from "../config/weapons-data.mjs";
import {
  MAGAZINES, MAGAZINE_MAP, MAG_CLASSES, magwellGroups, standardMagazineFor,
  buildMagazineItemData, magazineWeight
} from "../config/magazines-data.mjs";
import { AMMO_CALIBER_MAP } from "../config/ammo-data.mjs";
import {
  consumeRounds, dominantCaliber, weaponIdOf, weaponMagwell, compatibleMagazines,
  loadRounds, unloadAll, swapMagazineItem, inMagazineSystem, magazineRounds,
  __testing as model
} from "../weapons/magazine-model.mjs";
import { getMag, magazineReadiness } from "../weapons/magazine.mjs";
import { __testing as pips } from "../actors/item-state-pips.mjs";
import { buildWeaponItemData } from "../config/weapons-data.mjs";
import {
  HANDY_LIMIT, handyFamilyOf, beltCount, handyCount, setBeltCount, toggleAtHand,
  handyLimit, beltSlots, addToBelt, moveBeltPiece, __testing as handy
} from "../actors/handy-items.mjs";
import { ARMOR_MAP, buildArmorItemData } from "../config/armor-data.mjs";
import { buildKwasItemData, KWAS_ACTIVITY_ID } from "../items/kwas.mjs";
import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, captureWarnings } from "./helpers.mjs";

/** Broń z tabel, w kształcie, w jakim tworzy ją pack — czyli z wystemplowanym `weaponId`. */
function weaponData(id, name = null) {
  const data = buildWeaponItemData(WEAPON_MAP[id]);
  return { ...data, name: `${SCRATCH_PREFIX} ${name ?? data.name}` };
}

function magData(defId, rounds = []) {
  const def = MAGAZINE_MAP[defId];
  const data = buildMagazineItemData(def, { rounds });
  return { ...data, name: `${SCRATCH_PREFIX} ${data.name}` };
}

/**
 * Wyciąga dokument po nazwie z wyniku `createEmbeddedDocuments`.
 *
 * **`createEmbeddedDocuments` NIE gwarantuje kolejności wyniku.** Zmierzone na żywo
 * 2026-09-22: dla tego samego wejścia `[AR, Trzydziestka, Winchester]` wynik wracał raz
 * w tej kolejności, raz jako `[Trzydziestka, AR, Winchester]`, raz `[Winchester, …]`.
 * Destrukturyzacja pozycyjna (`const [a, b, c] = created`) dawała więc **losowo** podmienione
 * dokumenty — test przechodził albo nie, zależnie od przebiegu, i wyglądało to na błąd
 * w kodzie modułu („`weaponIdOf` zwrócił null dla wystemplowanej broni"), a nie w teście.
 *
 * Porównanie jest dokładne, nie po fragmencie — „Desert Eagle" jest podciągiem
 * „Złoty Desert Eagle".
 */
function pick(created, name) {
  const full = `${SCRATCH_PREFIX} ${name}`;
  const found = created.find(d => d.name === full);
  if (!found) throw new Error(`Brak „${full}" wśród utworzonych: ${created.map(d => d.name).join(", ")}`);
  return found;
}

export function registerMagazynkiTests(quench) {
  quench.registerBatch(`${MODULE_ID}.magazynki`, context => {
    const { describe, it, before, after, beforeEach, expect } = context;

    let actor;

    before(async function () {
      actor = await scratchActor();
    });

    after(async function () {
      await scratchCleanup();
    });

    /* ================================================================== */
    /*  Priorytet 1 — `system.uses` jest WIDOKIEM                          */
    /* ================================================================== */

    describe("system.uses jako widok, nie źródło prawdy", function () {
      let ar, magazine;

      before(async function () {
        const created = await actor.createEmbeddedDocuments("Item", [
          weaponData("ar"), magData("mag-ar", Array(30).fill("556"))
        ], { render: false });
        ar = created.find(i => i.type === "weapon");
        magazine = created.find(i => i.type === "consumable");
        await swapMagazineItem(actor.items.get(ar.id), actor.items.get(magazine.id));
      });

      after(async function () {
        await actor.deleteEmbeddedDocuments("Item", [ar.id, magazine.id], { render: false });
      });

      /**
       * Najdroższy możliwy regres całej przebudowy. `uses` jest bezpiecznym widokiem WYŁĄCZNIE
       * dlatego, że nic go nie konsumuje: aktywności tej broni mają `consumption.targets: []`.
       * Gdyby któraś dostała `itemUses`, dnd5e zaczęłoby dekrementować `uses.spent` równolegle
       * do naszej kolejki — podwójne odjęcie naboju albo pętla zapisów, oba bez komunikatu.
       */
      it("żadna aktywność broni nie konsumuje uses — inaczej nabój odjąłby się dwa razy", function () {
        const live = actor.items.get(ar.id);
        for (const activity of live.system.activities ?? []) {
          const targets = activity.consumption?.targets ?? [];
          const offenders = targets.filter(t => ["itemUses", "activityUses"].includes(t.type));
          expect(offenders, `${activity.name} konsumuje uses`).to.have.length(0);
        }
      });

      it("jeden strzał zabiera dokładnie jeden nabój — nie dwa, nie zero", async function () {
        const live = actor.items.get(ar.id);
        const before = getMag(live).current;
        await consumeRounds(live, 1);
        expect(getMag(actor.items.get(ar.id)).current).to.equal(before - 1);
      });

      it("uses.max i uses.spent zgadzają się z kolejką po każdej operacji", async function () {
        const live = actor.items.get(ar.id);
        const state = getMag(live);
        expect(Number(live.system.uses.max)).to.equal(state.max);
        expect(Number(live.system.uses.spent)).to.equal(state.max - state.current);
      });

      it("max to pojemność AKTUALNEGO źródła plus komora, nie nominał z tabeli", async function () {
        const live = actor.items.get(ar.id);
        expect(getMag(live).max).to.equal(31);      // magazynek 30 + komora
        await swapMagazineItem(live, null);         // wypięcie
        expect(getMag(actor.items.get(ar.id)).max).to.equal(1);
        await swapMagazineItem(actor.items.get(ar.id), actor.items.get(magazine.id));
      });
    });

    /* ================================================================== */
    /*  Priorytet 2 — kolejka i niezmiennik z §8                           */
    /* ================================================================== */

    describe("Kolejka naboi", function () {
      let gun, magazine;

      /* .44 Mag + dum-dum to JEDYNA prawdziwa rodzina mieszana w tabelach (obok .12 Ga
         śrut/breneka), więc mieszany magazynek testujemy na niej, a nie na wymyślonym
         kalibrze „AP". To zarazem realny przypadek z kampanii: Złoty Desert Eagle Lorentza. */
      beforeEach(async function () {
        if (gun) await actor.deleteEmbeddedDocuments("Item", [gun.id, magazine.id], { render: false });
        const created = await actor.createEmbeddedDocuments("Item", [
          weaponData("desert-eagle"),
          magData("mag-desert-eagle", ["44mag_dd", "44mag_dd", "44mag_dd", "44mag", "44mag", "44mag"])
        ], { render: false });
        gun = created.find(i => i.type === "weapon");
        magazine = created.find(i => i.type === "consumable");
        await swapMagazineItem(actor.items.get(gun.id), actor.items.get(magazine.id));
      });

      after(async function () {
        if (gun) await actor.deleteEmbeddedDocuments("Item", [gun.id, magazine.id], { render: false });
        gun = null;
      });

      it("zwraca naboje w kolejności wystrzału i skraca kolejkę o n", async function () {
        const live = actor.items.get(gun.id);
        const before = getMag(live).current;
        const fired = await consumeRounds(live, 3);
        expect(fired).to.have.length(3);
        expect(getMag(actor.items.get(gun.id)).current).to.equal(before - 3);
      });

      it("przy niedoborze nie zapisuje NICZEGO i zwraca null", async function () {
        const live = actor.items.get(gun.id);
        const before = getMag(live).current;
        const fired = await consumeRounds(live, before + 5);
        expect(fired).to.equal(null);
        expect(getMag(actor.items.get(gun.id)).current).to.equal(before);
      });

      /* Magazynek jest nabity trzema dum-dum, a pod nimi trzema zwykłymi. Dwie kolejne serie
         muszą więc zwrócić DWA RÓŻNE zestawy — gdyby kaliber był gdziekolwiek cache'owany,
         druga seria oddałaby to samo, co pierwsza. Asercja jest na konkretne sekwencje, nie
         na samą nierówność: nierówność przechodzi przypadkiem przy wielu układach naboi. */
      it("kolejka nie jest cache'owana — dwie serie z różnych części magazynka dają różne naboje", async function () {
        const first = await consumeRounds(actor.items.get(gun.id), 2);
        const second = await consumeRounds(actor.items.get(gun.id), 2);
        expect(first).to.deep.equal(["44mag_dd", "44mag_dd"]);
        expect(second).to.deep.equal(["44mag_dd", "44mag"]);
      });
    });

    describe("Reguła dominującego naboju (§8)", function () {
      it("decyduje liczebność, nie kolejność: [dum-dum, zwykły, dum-dum] → dum-dum", function () {
        expect(dominantCaliber(["44mag_dd", "44mag", "44mag_dd"])).to.equal("44mag_dd");
      });

      it("remis rozstrzyga nabój o niższym indeksie — ten, który poszedł wcześniej", function () {
        expect(dominantCaliber(["44mag", "44mag_dd"])).to.equal("44mag");
        expect(dominantCaliber(["44mag_dd", "44mag"])).to.equal("44mag_dd");
      });

      it("pusta seria nie ma naboju dominującego", function () {
        expect(dominantCaliber([])).to.equal(null);
      });
    });

    /**
     * Test na regresję „broń zmutowała, ale zapomniała o tym powiedzieć". Kaliber niesie nie
     * tylko kości, ale i właściwości — dum-dum dokłada `rozrywajaca` i `hollowpoint`, a te
     * napędzają Krwawienie i reguły osłon. Gdyby odświeżały się same obrażenia, dum-dum zadałby
     * swoje kości, ale nie wywołał Krwawienia.
     */
    describe("Właściwości idą razem z obrażeniami", function () {
      it("dum-dum niesie Rozrywającą i Hollow-point ponad zwykły .44 Mag", function () {
        const plain = AMMO_CALIBER_MAP["44mag"];
        const dd = AMMO_CALIBER_MAP["44mag_dd"];
        expect(dd, "brak kalibru 44mag_dd").to.exist;
        expect(dd.props).to.include("rozrywajaca");
        expect(dd.props).to.include("hollowpoint");
        expect(plain.props).to.not.include("rozrywajaca");
      });

      it("oba warianty biją tak samo — różnią się wyłącznie właściwościami", function () {
        expect(AMMO_CALIBER_MAP["44mag_dd"].formula).to.equal(AMMO_CALIBER_MAP["44mag"].formula);
      });
    });

    /* ================================================================== */
    /*  Priorytet 3 — reguły                                               */
    /* ================================================================== */

    describe("Komora (+1)", function () {
      let pump;

      before(async function () {
        const created = await actor.createEmbeddedDocuments("Item",
          [weaponData("pompka")], { render: false });
        pump = created[0];
      });

      after(async function () {
        await actor.deleteEmbeddedDocuments("Item", [pump.id], { render: false });
      });

      it("Pompka: tabela mówi 6, więc broń mieści 7, a z packa przychodzi 6/7", function () {
        const live = actor.items.get(pump.id);
        expect(getMag(live)).to.include({ current: 6, max: 7 });
      });

      it("rewolwer nie ma komory — komory bębenka SĄ pojemnością", function () {
        expect(hasChamber(WEAPON_MAP["k-22"])).to.equal(false);
        expect(buildWeaponItemData(WEAPON_MAP["k-22"]).flags[MODULE_ID].mag.max).to.equal(6);
      });

      it("siedem broni, w których „magazynek” to same komory, ma jawne chamber: false", function () {
        const expected = ["obrzyn", "dwururka", "samorobka", "strzelba-palmera",
          "thumper", "bazooka", "mozdzierz"];
        for (const id of expected) {
          expect(hasChamber(WEAPON_MAP[id]), id).to.equal(false);
        }
      });

      it("M1 US Rifle (wmag, bez właściwości) dostaje +1, a Obrzyn (wmag, bez właściwości) nie", function () {
        expect(hasChamber(WEAPON_MAP["m1-us-rifle"])).to.equal(true);
        expect(hasChamber(WEAPON_MAP["obrzyn"])).to.equal(false);
      });
    });

    describe("Tryb podawania (feed)", function () {
      it("manual dla przeladowanie i ladowanie", function () {
        expect(feedModeOf(WEAPON_MAP["pompka"])).to.equal("manual");
        expect(feedModeOf(WEAPON_MAP["samorobka"])).to.equal("manual");
      });

      /* MGL1S ma `przeladowanie` + `beb` (bez `wmag`), a kusza Cobra `przeladowanie` + `wmag` —
         każda wersja reguły wiążąca komorę z `wmag` miałaby dziurę od pierwszego dnia. */
      it("MGL1S jest manual mimo bębenka, a Cobra mimo magazynka wewnętrznego", function () {
        expect(feedModeOf(WEAPON_MAP["mgl1s"])).to.equal("manual");
        expect(feedModeOf(WEAPON_MAP["kusza-automatyczna-cobra"])).to.equal("manual");
      });

      it("auto dla reszty", function () {
        expect(feedModeOf(WEAPON_MAP["ar"])).to.equal("auto");
        expect(feedModeOf(WEAPON_MAP["desert-eagle"])).to.equal("auto");
      });
    });

    describe("Cykl strzału", function () {
      const base = () => ({
        hasChamber: true, feed: "auto", chamber: "44mag",
        rounds: ["44mag_dd", "44mag"], capacity: 8
      });

      /* Dum-dum w komorze przy zwykłych nabojach w magazynku — dokładnie ten przypadek, dla
         którego komora musi nieść KALIBER, a nie samo „pusta/pełna". */
      it("auto dociąga następny nabój do komory zaraz po strzale", function () {
        const state = base();
        expect(model.fireOne(state)).to.equal("44mag");
        expect(state.chamber).to.equal("44mag_dd");
        expect(state.rounds).to.have.length(1);
      });

      it("manual zostawia komorę pustą — to jest cała definicja tego trybu", function () {
        const state = { ...base(), feed: "manual" };
        expect(model.fireOne(state)).to.equal("44mag");
        expect(state.chamber).to.equal(null);
        expect(state.rounds).to.have.length(2);
      });

      it("pusta komora przy manual = nie ma strzału, mimo naboi w magazynku", function () {
        const state = { ...base(), feed: "manual", chamber: null };
        expect(model.fireOne(state)).to.equal(null);
      });

      it("broń bez komory strzela wprost ze źródła", function () {
        const state = { hasChamber: false, feed: "auto", chamber: null, rounds: ["38spl", "38spl"] };
        expect(model.fireOne(state)).to.equal("38spl");
        expect(state.rounds).to.have.length(1);
      });
    });

    describe("Magwell — co pasuje do czego", function () {
      it("Złoty Desert Eagle bierze zwykłe magazynki do Desert Eagle", function () {
        expect(magwellOf(WEAPON_MAP["zloty-desert-eagle"])).to.equal("desert-eagle");
        expect(magwellOf(WEAPON_MAP["desert-eagle"])).to.equal("desert-eagle");
      });

      it("magazynek do AR nie pasuje do Scara — oba 30, ale inne gniazda", function () {
        expect(magwellOf(WEAPON_MAP["ar"])).to.not.equal(magwellOf(WEAPON_MAP["scar"]));
      });

      it("Scar i HK G3 mają ten sam kaliber i pojemność, a mimo to osobne magazynki", function () {
        expect(WEAPON_MAP["scar"].caliber).to.equal(WEAPON_MAP["hk-g3"].caliber);
        expect(WEAPON_MAP["scar"].mag.max).to.equal(WEAPON_MAP["hk-g3"].mag.max);
        expect(magwellOf(WEAPON_MAP["scar"])).to.not.equal(magwellOf(WEAPON_MAP["hk-g3"]));
      });

      it("wszystkie łuki dzielą jedno gniazdo, wszystkie kusze niepowtarzalne drugie", function () {
        expect(magwellOf(WEAPON_MAP["luk-tradycyjny"])).to.equal("luk");
        expect(magwellOf(WEAPON_MAP["luk-bloczkowy"])).to.equal("luk");
        expect(magwellOf(WEAPON_MAP["kusza-bloczkowa"])).to.equal("kusza");
      });

      it("wmag i beb nie mają gniazda — nie ma czego wypinać", function () {
        expect(magwellOf(WEAPON_MAP["pompka"])).to.equal(null);
        expect(magwellOf(WEAPON_MAP["k-22"])).to.equal(null);
      });
    });

    /* Jeden magazynek, jedna broń. To jest zarazem zagrywka, którą §6 uznaje za pożądaną:
       postać z dwiema broniami o wspólnym magwellu może ściągnąć magazynek z jednej do drugiej,
       kosztem unieruchomienia tamtej na jednym naboju w komorze. */
    describe("Magazynek siedzi w dokładnie jednej broni", function () {
      let de, gold, magazine;

      before(async function () {
        const created = await actor.createEmbeddedDocuments("Item", [
          weaponData("desert-eagle"), weaponData("zloty-desert-eagle"),
          magData("mag-desert-eagle", Array(8).fill("44mag"))
        ], { render: false });
        de = pick(created, "Desert Eagle");
        gold = pick(created, "Złoty Desert Eagle");
        magazine = pick(created, "Magazynek do Desert Eagle");
      });

      after(async function () {
        await actor.deleteEmbeddedDocuments("Item", [de.id, gold.id, magazine.id], { render: false });
      });

      it("wspólny magwell pozwala przełożyć ten sam magazynek między bronią", async function () {
        const r1 = await swapMagazineItem(actor.items.get(de.id), actor.items.get(magazine.id));
        expect(r1, "magazynek nie wszedł do Desert Eagle").to.not.equal(false);

        const r2 = await swapMagazineItem(actor.items.get(gold.id), actor.items.get(magazine.id));
        expect(r2, "magazynek nie wszedł do Złotego").to.not.equal(false);
        expect(r2.takenFrom?.id, "nie odnotowano, skąd magazynek przyszedł").to.equal(de.id);
      });

      it("pierwsza broń zostaje bez magazynka, a nie z tą samą kolejką", function () {
        expect(actor.items.get(de.id).getFlag(MODULE_ID, "loadedMag")).to.equal(null);
        expect(getMag(actor.items.get(de.id)).max).to.equal(1);   // sama komora
        expect(getMag(actor.items.get(gold.id)).max).to.equal(9); // 8 + komora
      });
    });

    describe("Tożsamość modelu — bez fuzzy matchingu", function () {
      let stamped, renamed, foreign;

      before(async function () {
        const created = await actor.createEmbeddedDocuments("Item", [
          weaponData("ar"),
          { ...weaponData("ar", "Trzydziestka"), flags: {} },
          {
            name: `${SCRATCH_PREFIX} Winchester`, type: "weapon",
            system: { type: { value: "palnaDluga" }, identifier: "winchester", properties: ["amm", "tryb_p"] }
          }
        ], { render: false });
        stamped = pick(created, "AR");
        renamed = pick(created, "Trzydziestka");
        foreign = pick(created, "Winchester");
      });

      after(async function () {
        await actor.deleteEmbeddedDocuments("Item",
          [stamped.id, renamed.id, foreign.id], { render: false });
      });

      it("stempel z packa rozstrzyga model niezależnie od nazwy", function () {
        expect(weaponIdOf(actor.items.get(stamped.id))).to.equal("ar");
      });

      it("broń bez stempla i bez znanego identyfikatora jest poza systemem — nie zgadujemy", function () {
        expect(weaponIdOf(actor.items.get(foreign.id))).to.equal(null);
        expect(getMag(actor.items.get(foreign.id))).to.equal(null);
      });

      it("nierozpoznany model = brak wymiennych magazynków, a nie magazynek „jakiś pasujący”", function () {
        expect(weaponMagwell(actor.items.get(foreign.id))).to.equal(null);
        expect(compatibleMagazines(actor, actor.items.get(foreign.id))).to.have.length(0);
      });
    });

    describe("Bramka aktorów", function () {
      it("postać gracza podlega symulacji", function () {
        expect(inMagazineSystem(actor)).to.equal(true);
      });

      it("NPC nie — RAW daje im jeden magazynek na walkę, bez liczenia", async function () {
        const npc = await scratchActor({ name: `${SCRATCH_PREFIX} NPC`, type: "npc" });
        expect(inMagazineSystem(npc)).to.equal(false);
      });

      it("Zbrojownia nie — to katalog-wystawka, nie postać", async function () {
        const armory = await scratchActor({
          name: `${SCRATCH_PREFIX} Zbrojownia`,
          flags: { [MODULE_ID]: { isZbrojownia: true } }
        });
        expect(inMagazineSystem(armory)).to.equal(false);
      });

      it("brak aktora nie jest błędem — przedmiot w katalogu świata po prostu nie liczy naboi", function () {
        expect(inMagazineSystem(null)).to.equal(false);
      });
    });

    describe("Ładowanie i rozładowywanie", function () {
      let magazine;

      beforeEach(async function () {
        if (magazine) await actor.deleteEmbeddedDocuments("Item", [magazine.id], { render: false });
        const created = await actor.createEmbeddedDocuments("Item", [magData("mag-ar")], { render: false });
        magazine = created[0];
      });

      after(async function () {
        if (magazine) await actor.deleteEmbeddedDocuments("Item", [magazine.id], { render: false });
        magazine = null;
      });

      it("dokłada na KONIEC kolejności wystrzału — to, co było, poleci pierwsze", async function () {
        const live = () => actor.items.get(magazine.id);
        await loadRounds(live(), "556", 2);
        await loadRounds(live(), "556", 2);
        expect(magazineRounds(live())).to.have.length(4);
        expect(magazineRounds(live()).every(r => r === "556")).to.equal(true);
      });

      it("obcina do pojemności — trzydziesty pierwszy nabój nie wchodzi", async function () {
        const loaded = await loadRounds(actor.items.get(magazine.id), "556", 50);
        expect(loaded).to.equal(30);
        expect(magazineRounds(actor.items.get(magazine.id))).to.have.length(30);
      });

      it("rozładowanie zwraca całość rozbitą na typy", async function () {
        await loadRounds(actor.items.get(magazine.id), "556", 3);
        const tally = await unloadAll(actor.items.get(magazine.id));
        expect(tally).to.deep.equal({ "556": 3 });
        expect(magazineRounds(actor.items.get(magazine.id))).to.have.length(0);
      });

      it("pełny i pusty magazynek nie ważą tyle samo", function () {
        const def = MAGAZINE_MAP["mag-ar"];
        expect(magazineWeight(def, Array(30).fill("556")))
          .to.be.greaterThan(magazineWeight(def, []));
      });
    });

    describe("Przedmioty podręczne", function () {
      it("RAW daje trzy sloty, wspólne dla wszystkich rodzin", function () {
        expect(HANDY_LIMIT).to.equal(3);
      });

      it("magazynek, granat i lek mogą zająć slot; luźne naboje nie", function () {
        const fake = (value, subtype) => ({ type: "consumable", system: { type: { value, subtype } } });
        expect(handyFamilyOf(fake("ammo", "magazine-short"))).to.equal("magazine");
        expect(handyFamilyOf(fake("ammo", "grenade-frag"))).to.equal("grenade");
        expect(handyFamilyOf(fake("lekarstwo", ""))).to.equal("medicine");
        expect(handyFamilyOf(fake("ammo", "556"))).to.equal(null);
      });

      it("zestawy narzędzi też (RAW: każdy ma „Używanie”); broń i pancerz nie", function () {
        expect(handyFamilyOf({ type: "tool", system: {} })).to.equal("tool");
        expect(handyFamilyOf({ type: "weapon", system: {} })).to.equal(null);
        expect(handyFamilyOf({ type: "equipment", system: { type: { value: "light" } } })).to.equal(null);
      });

      it("Kwas (RAW): RO na ZR z ST 8 + mod. ZR + PB, 4k6 od kwasu, sukces = nic; przy pasie", function () {
        const data = buildKwasItemData();
        const act = data.system.activities[KWAS_ACTIVITY_ID];
        expect(act.save.dc.calculation).to.equal("dex");
        expect(act.damage.onSave).to.equal("none");
        expect(act.damage.parts[0]).to.include({ number: 4, denomination: 6 });
        expect(act.range.value).to.equal("6");
        expect(handyFamilyOf({ ...data, getFlag: (s, k) => data.flags[s]?.[k] })).to.equal("gear");
      });

      it("rozkład slotów: pozycje zostają, dziury też; stara flaga zajmuje pierwsze wolne", function () {
        const e = (id, positions, legacy = 0, quantity = 9) => ({ id, positions, legacy, quantity });
        expect(handy.layoutSlots([e("a", [2]), e("b", [0])], 3)).to.deep.equal(["b", null, "a"]);
        expect(handy.layoutSlots([e("a", [1]), e("b", [], 2)], 3)).to.deep.equal(["b", "a", "b"]);
        expect(handy.layoutSlots([e("a", [0]), e("b", [0])], 3), "kolizja → pierwszy wolny").to.deep.equal(["a", "b", null]);
        expect(handy.layoutSlots([e("a", [0, 1, 2, 3])], 3), "nadmiar po utracie slotu").to.deep.equal(["a", "a", "a", "a"]);
        expect(handy.layoutSlots([e("a", [0, 1, 2], 0, 1)], 3), "przycięte do ilości").to.deep.equal(["a", null, null]);
      });

      it("zużycie z klikniętego kafelka zdejmuje TEN slot, inaczej najwyższy", function () {
        expect(handy.positionsAfterSpend([0, 2], 5, 4, 0)).to.deep.equal([2]);
        expect(handy.positionsAfterSpend([0, 2], 5, 4)).to.deep.equal([0]);
        expect(handy.positionsAfterSpend([0, 2], 2, 0, 2)).to.deep.equal([]);
        expect(handy.positionsAfterSpend([0, 2], 5, 7)).to.deep.equal([0, 2]);
      });

      it("pojemność: 3 z RAW + sloty z założonego ekwipunku, zdjęty nie liczy się", function () {
        expect(handy.handyCapacity([])).to.equal(3);
        expect(handy.handyCapacity([{ equipped: true, slots: 1 }])).to.equal(4);
        expect(handy.handyCapacity([{ equipped: false, slots: 1 }])).to.equal(3);
      });

      it("ubytek schodzi najpierw z pasa, przybytek idzie do plecaka", function () {
        const f = handy.beltAfterQuantityChange;
        expect(f(2, 7, 6)).to.equal(1);   // zużyta sztuka z pasa
        expect(f(2, 7, 4)).to.equal(0);   // pas pusty, reszta z plecaka
        expect(f(2, 7, 9)).to.equal(2);   // dokupione — do plecaka
        expect(f(3, 3, 0)).to.equal(0);
      });

      describe("liczone w sztukach, nie w stosach (decyzja MG)", function () {
        let stack;
        const live = () => actor.items.get(stack.id);

        beforeEach(async function () {
          if (stack) await actor.deleteEmbeddedDocuments("Item", [stack.id], { render: false });
          // Jeden dokument na wywołanie — kolejność wyniku `createEmbeddedDocuments` jest niestabilna.
          [stack] = await actor.createEmbeddedDocuments("Item", [{
            name: `${SCRATCH_PREFIX} granaty`, type: "consumable",
            system: { type: { value: "ammo", subtype: "grenade-frag" }, quantity: 5 }
          }], { render: false });
        });

        after(async function () {
          if (stack) await actor.deleteEmbeddedDocuments("Item", [stack.id], { render: false });
          stack = null;
        });

        it("trzy granaty z jednego stosu zajmują trzy sloty; czwarty nie wchodzi", async function () {
          expect(await setBeltCount(live(), 3)).to.equal(true);
          expect(handyCount(actor)).to.equal(3);
          const warn = captureWarnings();
          try {
            expect(await setBeltCount(live(), 4)).to.equal(false);
            expect(await toggleAtHand(live())).to.equal(true); // pełny pas: klik odkłada wszystko
          } finally { warn.restore(); }
          expect(beltCount(live())).to.equal(0);
        });

        it("rzut zdejmuje sztukę z pasa, zanim ruszy plecak", async function () {
          await setBeltCount(live(), 2);
          await live().update({ "system.quantity": 4 });
          expect(beltCount(live())).to.equal(1);
          await live().update({ "system.quantity": 2 });
          expect(beltCount(live())).to.equal(0);
          await live().update({ "system.quantity": 6 });
          expect(beltCount(live())).to.equal(0);
        });

        it("przeciąganie: sztuka na wskazany slot, przestawienie z zamianą miejsc", async function () {
          const [other] = await actor.createEmbeddedDocuments("Item", [{
            name: `${SCRATCH_PREFIX} lek`, type: "consumable",
            system: { type: { value: "lekarstwo" }, quantity: 1 }
          }], { render: false });
          try {
            expect(await addToBelt(live(), { slot: 2 })).to.equal(true);
            expect(await addToBelt(actor.items.get(other.id), { slot: 0 })).to.equal(true);
            const ids = () => beltSlots(actor).map(s => s.item?.id ?? null);
            expect(ids()).to.deep.equal([other.id, null, stack.id]);
            expect(await moveBeltPiece(actor, 2, 0)).to.equal(true);
            expect(ids()).to.deep.equal([stack.id, null, other.id]);
            expect(await moveBeltPiece(actor, 0, 1)).to.equal(true);
            expect(ids()).to.deep.equal([null, stack.id, other.id]);
          } finally {
            await actor.deleteEmbeddedDocuments("Item", [other.id], { render: false });
          }
        });

        it("Kamizelka taktyczna (WKK) założona: 4 sloty; zdjęta: 3, nadmiar zostaje", async function () {
          const vestData = buildArmorItemData(ARMOR_MAP["kamizelka-taktyczna"]);
          vestData.system.equipped = true;
          const [vest] = await actor.createEmbeddedDocuments("Item", [vestData], { render: false });
          try {
            expect(handyLimit(actor)).to.equal(4);
            expect(await setBeltCount(live(), 4)).to.equal(true);
            await actor.items.get(vest.id).update({ "system.equipped": false });
            expect(handyLimit(actor)).to.equal(3);
            expect(beltCount(live()), "nic nie spada z pasa").to.equal(4);
            expect(beltSlots(actor).filter(s => s.overflow).length).to.equal(1);
          } finally {
            await actor.deleteEmbeddedDocuments("Item", [vest.id], { render: false });
          }
        });

        it("stara flaga `true` liczy się jako jedna sztuka", async function () {
          await live().setFlag(MODULE_ID, "atHand", true);
          expect(beltCount(live())).to.equal(1);
          expect(handyCount(actor)).to.equal(1);
        });
      });
    });

    /* ================================================================== */
    /*  Oznaczenia w ekwipunku                                             */
    /* ================================================================== */

    describe("Gotowość bojowa i plakietki stanu", function () {
      let de, magFull, magEmpty, rewolwer, katana;

      before(async function () {
        const created = await actor.createEmbeddedDocuments("Item", [
          weaponData("desert-eagle"), weaponData("k-22"), weaponData("katana"),
          magData("mag-desert-eagle", Array(8).fill("44mag")),
          { ...magData("mag-desert-eagle", []), name: `${SCRATCH_PREFIX} Magazynek pusty` }
        ], { render: false });
        de = pick(created, "Desert Eagle");
        rewolwer = pick(created, "K-22");
        katana = pick(created, "Katana");
        magFull = pick(created, "Magazynek do Desert Eagle");
        magEmpty = pick(created, "Magazynek pusty");
      });

      after(async function () {
        await actor.deleteEmbeddedDocuments("Item",
          [de.id, rewolwer.id, katana.id, magFull.id, magEmpty.id], { render: false });
      });

      /** Wypina magazynek i opróżnia komorę — „broń zupełnie pusta, bez pojemnika”. */
      async function stripBare(weapon) {
        await swapMagazineItem(weapon, null);
        const live = actor.items.get(weapon.id);
        await live.setFlag(MODULE_ID, "chamber", { caliberId: null });
        return actor.items.get(weapon.id);
      }

      it("broń bez wpiętego magazynka to „missing”, a nie „empty”", async function () {
        await swapMagazineItem(actor.items.get(de.id), null);
        expect(magazineReadiness(actor.items.get(de.id))).to.equal("missing");
      });

      it("wpięty pusty magazynek to „empty” — pojemnik jest, naboi nie ma", async function () {
        await swapMagazineItem(actor.items.get(de.id), actor.items.get(magEmpty.id));
        expect(magazineReadiness(actor.items.get(de.id))).to.equal("empty");
      });

      it("wpięty pełny magazynek to „ready”", async function () {
        await swapMagazineItem(actor.items.get(de.id), actor.items.get(magFull.id));
        expect(magazineReadiness(actor.items.get(de.id))).to.equal("ready");
      });

      it("rewolwer z nabojami w bębenku jest gotowy, a NIE „bez magazynka”", function () {
        /* Regresja czekająca, żeby się wydarzyć: rewolwer i obrzyn mają `loadedMag === null`
           w stanie całkowicie normalnym, bo naboje siedzą w samej broni. Oznaczenie oparte
           na `loadedMag` świeciłoby na nich na stałe, przy pełnym bębenku. */
        expect(magazineReadiness(actor.items.get(rewolwer.id))).to.equal("ready");
      });

      it("broń biała jest poza pytaniem — `null`, nie „missing”", function () {
        expect(magazineReadiness(actor.items.get(katana.id))).to.equal(null);
      });

      /** Wiersz ekwipunku w kształcie, jakiego szuka `_decorateRow` — bez renderu arkusza. */
      function fakeRow(...classes) {
        const row = document.createElement("li");
        row.classList.add("item", ...classes);
        row.innerHTML = `<div class="item-name"><div class="name"></div></div>`;
        return row;
      }

      it("dwa niezależne stany dają DWIE plakietki — to jest cała racja bytu paska", function () {
        /* Przed przebudową wszystkie plakietki walczyły o `.item-name::after`, więc broń
           z dodatkami po zacięciu gubiła złoty klucz. Ten test pilnuje, żeby nie wróciło. */
        const row = fakeRow("neuro-weapon-jammed", "neuro-has-addons");
        pips._decorateRow(row, actor.items.get(katana.id));
        const kinds = [...row.querySelectorAll(".neuro-pip")]
          .map(p => [...p.classList].find(c => c.startsWith("neuro-pip--")));
        expect(kinds).to.deep.equal(["neuro-pip--jammed", "neuro-pip--addons"]);
      });

      it("kolejność slotów jest stała: stan → gotowość → konserwacja → zasilanie → konfiguracja", async function () {
        const bare = await stripBare(actor.items.get(de.id));
        const row = fakeRow("neuro-weapon-damaged", "neuro-weapon-cleaned",
          "neuro-power-on", "neuro-has-addons");
        pips._decorateRow(row, bare);
        const kinds = [...row.querySelectorAll(".neuro-pip")]
          .map(p => [...p.classList].find(c => c.startsWith("neuro-pip--")));
        expect(kinds).to.deep.equal([
          "neuro-pip--damaged", "neuro-pip--mag-missing", "neuro-pip--cleaned",
          "neuro-pip--power-on", "neuro-pip--addons"
        ]);
      });

      it("wyczyszczona broń NIE gaśnie — to bufor, nie usterka", function () {
        const row = fakeRow("neuro-weapon-cleaned");
        pips._decorateRow(row, actor.items.get(katana.id));
        expect(row.querySelectorAll(".neuro-pip")).to.have.length(1);
        expect(row.classList.contains("neuro-not-ready")).to.be.false;
      });

      it("przerysowanie arkusza nie mnoży plakietek", function () {
        const row = fakeRow("neuro-weapon-jammed");
        pips._decorateRow(row, actor.items.get(katana.id));
        pips._decorateRow(row, actor.items.get(katana.id));
        pips._decorateRow(row, actor.items.get(katana.id));
        expect(row.querySelectorAll(".neuro-pips")).to.have.length(1);
        expect(row.querySelectorAll(".neuro-pip")).to.have.length(1);
      });

      it("wyszczerbiona broń biała dostaje plakietkę, ale NIE gaśnie", function () {
        /* Przygaszenie odpowiada wyłącznie na „czy mogę TERAZ strzelić”. Wyszczerbioną
           maczetą dalej się bije, tylko słabszą kością — gaszenie jej rozmyłoby ten kanał. */
        const row = fakeRow("neuro-degraded", "neuro-degraded-1");
        pips._decorateRow(row, actor.items.get(katana.id));
        expect(row.querySelectorAll(".neuro-pip")).to.have.length(1);
        expect(row.classList.contains("neuro-not-ready"), "nie powinna gasnąć").to.be.false;
      });

      it("broń bez magazynka i bez naboju w komorze gaśnie", async function () {
        const bare = await stripBare(actor.items.get(de.id));
        const row = fakeRow();
        pips._decorateRow(row, bare);
        expect(row.classList.contains("neuro-not-ready"), "powinna zgasnąć").to.be.true;
      });

      it("nabój w komorze przy braku magazynka: plakietka jest, ale broń NIE gaśnie", async function () {
        /* Jeden strzał jeszcze zostanie, więc „nie wystrzelisz" byłoby po prostu nieprawdą.
           Plakietka dalej mówi „nie masz magazynka", bo to jest informacja do działania. */
        await swapMagazineItem(actor.items.get(de.id), null);
        await actor.items.get(de.id).setFlag(MODULE_ID, "chamber", { caliberId: "44mag" });
        const live = actor.items.get(de.id);

        expect(magazineReadiness(live), "dalej „brak magazynka”").to.equal("missing");

        const row = fakeRow();
        pips._decorateRow(row, live);
        const kinds = [...row.querySelectorAll(".neuro-pip")]
          .map(p => [...p.classList].find(c => c.startsWith("neuro-pip--")));
        expect(kinds).to.deep.equal(["neuro-pip--mag-missing"]);
        expect(row.classList.contains("neuro-not-ready"), "nie powinna gasnąć").to.be.false;
      });
    });

    /* ================================================================== */
    /*  Asercje na danych — nie na zachowaniu                              */
    /* ================================================================== */

    describe("Spójność katalogu magazynków", function () {
      it("id są unikalne", function () {
        const ids = MAGAZINES.map(m => m.id);
        expect(new Set(ids).size).to.equal(ids.length);
      });

      it("każdy magazynek wskazuje na istniejący kaliber", function () {
        for (const m of MAGAZINES) {
          expect(AMMO_CALIBER_MAP[m.caliber], `${m.id} → ${m.caliber}`).to.exist;
        }
      });

      it("każdy magazynek ma znaną klasę rozmiaru", function () {
        for (const m of MAGAZINES) {
          expect(MAG_CLASSES[m.cls], `${m.id} → ${m.cls}`).to.exist;
        }
      });

      /* Różna pojemność albo różny nabój przy wspólnym gnieździe znaczyłyby, że te bronie
         fizycznie nie mogą dzielić magazynka — czyli że `magwell` kłamie. */
      it("bronie dzielące magwell mają zgodny kaliber i tę samą pojemność", function () {
        for (const [well, group] of magwellGroups()) {
          const calibers = new Set(group.map(w => w.caliber));
          const sizes = new Set(group.map(w => w.mag.max));
          expect(calibers.size, `${well}: różne kalibry (${[...calibers]})`).to.equal(1);
          expect(sizes.size, `${well}: różne pojemności (${[...sizes]})`).to.equal(1);
        }
      });

      it("każde gniazdo ma co najmniej jeden pojemnik w katalogu", function () {
        for (const [well] of magwellGroups()) {
          expect(standardMagazineFor(well), `brak magazynka dla gniazda ${well}`).to.exist;
        }
      });

      it("ceny zgadzają się z RAW: 20/30/35/50/15 per kategoria", function () {
        expect(MAG_CLASSES.short.price).to.equal(20);
        expect(MAG_CLASSES.medium.price).to.equal(30);
        expect(MAG_CLASSES.long.price).to.equal(35);
        expect(MAG_CLASSES.heavy.price).to.equal(50);
        expect(MAG_CLASSES.quiver.price).to.equal(15);
      });

      /* `caliber: "belt"` to BEŁT (kusza), `mag.kind: "belt"` to TAŚMA. Ten sam string, dwa
         różne pola — generator filtrujący po kalibrze wyprodukowałby taśmę do kuszy. */
      it("nie ma taśmy do kuszy — pułapka nazewnicza belt/belt", function () {
        const bolts = MAGAZINES.filter(m => m.caliber === "belt");
        for (const m of bolts) expect(m.kind, m.id).to.equal("quiver");
      });

      it("standardowy magazynek ma dokładnie pojemność z tabeli broni", function () {
        for (const w of WEAPONS) {
          if (!REMOVABLE_SOURCES.includes(w.mag?.kind)) continue;
          const def = standardMagazineFor(magwellOf(w));
          expect(def?.capacity, `${w.id} → ${def?.id}`).to.equal(w.mag.max);
        }
      });

      it("generator nie wyprodukował magazynka do wariantu dzielącego gniazdo", function () {
        expect(MAGAZINE_MAP["mag-zloty-desert-eagle"]).to.equal(undefined);
      });

      /* Ręczne podawanie wyklucza serię: nie da się prowadzić ognia ciągłego bronią, którą
         trzeba przeładować po każdym strzale. Dziś to prawda w danych, ale nic tego nie pilnuje. */
      it("żadna broń nie ma naraz ręcznego podawania i trybu serii", function () {
        for (const w of WEAPONS) {
          const props = w.props ?? [];
          const manual = props.includes("przeladowanie") || props.includes("ladowanie");
          const burst = ["tryb_ks", "tryb_ds", "tryb_ms"].some(p => props.includes(p));
          expect(manual && burst, `${w.id}: ${props.join("+")}`).to.equal(false);
        }
      });
    });
  });
}
