/**
 * Neuroshima 5e — integralność tabel ekwipunku.
 *
 * `weapons-data.mjs`, `ammo-data.mjs`, `armor-data.mjs`, `addons-data.mjs` i
 * `toolkits-data.mjs` karmią jednocześnie kompendia, generatory na Zbrojowni i UI
 * karty postaci. Rozjazd między nimi nie rzuca wyjątku — kończy się przedmiotem
 * bez ikony, kalibrem, którego nie ma w słowniku, albo właściwością, której dnd5e
 * nie zna i po cichu wycina przy zapisie.
 *
 * Każda tabela dostaje ten sam zestaw pytań: unikalne identyfikatory, odwołania
 * prowadzące do istniejących wpisów, pliki ikon na dysku i — najważniejsze —
 * czy wynik `build*ItemData()` w ogóle przechodzi walidację DataModelu dnd5e.
 */

import {
  WEAPONS, WEAPON_MAP, WEAPON_ICONS, WEAPON_NAME_ALIASES, buildWeaponItemData,
  diffWeaponItem, buildWeaponRepairDelta
} from "../config/weapons-data.mjs";
import { AMMO_CALIBERS, AMMO_CALIBER_MAP, GRENADE_TYPES } from "../config/ammo-data.mjs";
import { ARMORS, ARMOR_MAP, buildArmorItemData } from "../config/armor-data.mjs";
import { ADDON_DEFS, ADDON_LIST, SIGHT_ADDON_IDS } from "../config/addons-data.mjs";
import { installAddonById, removeAddon } from "../weapons/addons.mjs";
import { TOOLKITS, buildToolkitItemData } from "../config/toolkits-data.mjs";
import { CHEMIA, CHEMIA_TYPE, CHEMIA_SUBTYPES, chemiaKeyByName, chemiaItemData } from "../config/chemia-data.mjs";
import { ALL_DISEASES } from "../config/diseases-data.mjs";
import { MODULE_ID, scratchActor, scratchCleanup } from "./helpers.mjs";

/** Jedno zapytanie HEAD na plik; wyniki cache'owane, bo ikony się powtarzają. */
const assetCache = new Map();
async function assetExists(path) {
  if (!assetCache.has(path)) {
    assetCache.set(path, fetch(foundry.utils.getRoute(path), { method: "HEAD" }).then(r => r.ok, () => false));
  }
  return assetCache.get(path);
}

/** Konstruuje przedmiot bez zapisu — DataModel waliduje się w konstruktorze. */
function buildsCleanly(data) {
  try {
    new Item.implementation(data);
    return null;
  } catch (err) {
    return err.message;
  }
}

function duplicates(values) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function registerEquipmentDataTests(quench) {
  quench.registerBatch(`${MODULE_ID}.dane-ekwipunku`, context => {
    const { describe, it, before, after, expect } = context;

    /* ---------------------------------------------------------------- */

    describe("Broń", function () {
      it("identyfikatory i nazwy są unikalne", function () {
        expect(duplicates(WEAPONS.map(w => w.id)), "powtórzone id").to.be.empty;
        expect(duplicates(WEAPONS.map(w => w.name)), "powtórzone nazwy").to.be.empty;
        expect(Object.keys(WEAPON_MAP)).to.have.lengthOf(WEAPONS.length);
      });

      it("typ broni jest zarejestrowany w `CONFIG.DND5E.weaponTypes`", function () {
        for (const weapon of WEAPONS) {
          expect(CONFIG.DND5E.weaponTypes, `${weapon.name} → ${weapon.type}`).to.have.property(weapon.type);
        }
      });

      it("każda właściwość jest dozwolona dla broni", function () {
        const valid = CONFIG.DND5E.validProperties.weapon;
        for (const weapon of WEAPONS) {
          for (const prop of weapon.props) {
            expect(valid.has(prop), `${weapon.name}: nieznana właściwość "${prop}"`).to.be.true;
          }
        }
      });

      it("typ obrażeń istnieje w `CONFIG.DND5E.damageTypes`", function () {
        for (const weapon of WEAPONS) {
          for (const type of weapon.damage.types) {
            expect(CONFIG.DND5E.damageTypes, `${weapon.name} → ${type}`).to.have.property(type);
          }
        }
      });

      it("kaliber wskazuje na istniejący nabój", function () {
        for (const weapon of WEAPONS.filter(w => w.caliber)) {
          expect(AMMO_CALIBER_MAP, `${weapon.name} → ${weapon.caliber}`).to.have.property(weapon.caliber);
        }
      });

      it("broń z magazynkiem ma kaliber, a broń z kalibrem — sensowny magazynek", function () {
        for (const weapon of WEAPONS.filter(w => w.mag)) {
          expect(weapon.mag.max, `${weapon.name}: pojemność`).to.be.a("number").and.to.be.above(0);
          expect(["mag", "wmag", "beb", "belt"], `${weapon.name}: rodzaj zasilania`).to.include(weapon.mag.kind);
        }
      });

      it("tryby ognia nie są zapisane jako aktywności", function () {
        // `weapons/fire-modes.mjs` generuje je przy każdym zapisie przedmiotu; wpis
        // w danych oznaczałby dwie konkurujące ze sobą kopie tej samej aktywności.
        for (const weapon of WEAPONS) {
          expect(Object.keys(buildWeaponItemData(weapon).system.activities), weapon.name).to.be.empty;
        }
      });

      it("aliasy nazw prowadzą do istniejącej broni", function () {
        for (const [legacy, canonical] of Object.entries(WEAPON_NAME_ALIASES)) {
          expect(WEAPON_ICONS, `alias "${legacy}" → "${canonical}"`).to.have.property(canonical);
        }
      });

      it("dane przedmiotu przechodzą walidację dnd5e", function () {
        for (const weapon of WEAPONS) {
          expect(buildsCleanly(buildWeaponItemData(weapon)), weapon.name).to.be.null;
        }
      });

      it("pliki ikon istnieją", async function () {
        for (const weapon of WEAPONS) {
          const path = `modules/${MODULE_ID}/icons/weapons/${weapon.icon}`;
          expect(await assetExists(path), `${weapon.name}: ${path}`).to.be.true;
        }
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Audyt dystrybuowanych kopii (diffWeaponItem/buildWeaponRepairDelta)", function () {
      // `auditWeapons()`/`repairWeapons()` same w sobie skanują i PISZĄ do KAŻDEGO
      // aktora w świecie — nie do przetestowania bez złamania reguły "żadnych zmian w
      // stanie świata, które przetrwają test" u góry tego pliku. Testujemy więc
      // bezpośrednio ich rdzeń (jeden przedmiot na jednym aktorze-brudnopisie), a nie
      // orkiestrację, która po nim skanuje cały `game.actors`.
      let actor;
      const cat = WEAPONS.find(w => w.name === "Obrzyn"); // ma i magazynek, i zasięg, i właściwości

      before(async function () {
        actor = await scratchActor();
      });

      after(async function () {
        await scratchCleanup();
      });

      /** Kopia katalogowa `cat` na aktorze testowym, z ręczną mutacją symulującą dryf. */
      async function driftedCopy(mutate) {
        const data = foundry.utils.deepClone(buildWeaponItemData(cat));
        mutate(data);
        const [item] = await actor.createEmbeddedDocuments("Item", [data], { render: false });
        return item;
      }

      it("wykrywa brak magazynka, zasięgu i właściwości", async function () {
        const item = await driftedCopy(data => {
          data.system.properties = [];
          data.system.range = { value: null, long: null, units: "" };
          delete data.flags[MODULE_ID].mag;
        });

        const labels = diffWeaponItem(item, cat).map(f => f.label);
        expect(labels).to.include("Zasięg — normalny");
        expect(labels).to.include("Zasięg — daleki");
        expect(labels).to.include("Właściwości (brakujące)");
        expect(labels).to.include("Magazynek — pojemność");
        expect(labels).to.include("Magazynek — kaliber");
        expect(labels).to.include("Magazynek — stan naboi (current)");
      });

      it("naprawia dryf, nigdy nie rusza ilości ani wyekwipowania", async function () {
        const item = await driftedCopy(data => {
          data.system.properties = [];
          data.system.quantity = 5;
          data.system.equipped = true;
          delete data.flags[MODULE_ID].mag;
        });

        const delta = buildWeaponRepairDelta(item, cat);
        expect(foundry.utils.getProperty(delta, `flags.${MODULE_ID}.mag`)).to.deep.equal({
          ammoType: cat.caliber, max: cat.mag.max, current: cat.mag.max
        });
        expect(foundry.utils.hasProperty(delta, "system.quantity"), "ilość").to.be.false;
        expect(foundry.utils.hasProperty(delta, "system.equipped"), "wyekwipowanie").to.be.false;
      });

      it("magazynek z realnym stanem naboi: poprawia tylko pojemność, current zostaje", async function () {
        const item = await driftedCopy(data => {
          data.flags[MODULE_ID].mag = { ammoType: cat.caliber, max: 1, current: 1 };
        });

        const delta = buildWeaponRepairDelta(item, cat);
        // `setProperty` zawsze tworzy pośrednie obiekty przy zapisie zagnieżdżonej
        // ścieżki, więc `hasProperty(delta, ".mag")` samo w sobie nic nie mówi o tym,
        // czy to punktowa łatka czy świeży blok — liczy się TYLKO które liście istnieją.
        expect(foundry.utils.getProperty(delta, `flags.${MODULE_ID}.mag.max`)).to.equal(cat.mag.max);
        expect(foundry.utils.hasProperty(delta, `flags.${MODULE_ID}.mag.current`), "current nietknięty").to.be.false;
        expect(foundry.utils.hasProperty(delta, `flags.${MODULE_ID}.mag.ammoType`), "ammoType już poprawny, bez zapisu").to.be.false;
      });

      it("właściwości: dodaje brakujące, nigdy nie usuwa dopisanej ręcznie", async function () {
        const item = await driftedCopy(data => { data.system.properties = ["cicha"]; });

        const delta = buildWeaponRepairDelta(item, cat);
        const props = new Set(foundry.utils.getProperty(delta, "system.properties"));
        for (const p of cat.props) expect(props.has(p), p).to.be.true;
        expect(props.has("cicha"), "obca właściwość przeżywa naprawę").to.be.true;
      });

      it("bonus obrażeń jest zgłaszany, ale nigdy nie nadpisywany (autoFix: false)", async function () {
        const item = await driftedCopy(data => { data.system.damage.base.bonus = "@abilities.dex.mod"; });

        expect(diffWeaponItem(item, cat).map(f => f.label)).to.include("Obrażenia — bonus");
        expect(foundry.utils.hasProperty(buildWeaponRepairDelta(item, cat), "system.damage.base.bonus"),
          "bonus nienadpisany mimo zgłoszonego dryfu").to.be.false;
      });

      it("broń biała wyszczerbiona (flaga degradation) nie jest zgłaszana ani przywracana do pełnej kości", async function () {
        // Regresja: żywy przypadek Piekarza po `repairWeapons()` — kość obrażeń
        // wyszczerbionej broni (k10 -> k6) wróciła po naprawie do katalogowego k10,
        // mimo że flaga degradacji (i czerwona plakietka na karcie) dalej poprawnie
        // pokazywały stan "uszkodzona". Kość obrażeń to stan gry na czas degradacji,
        // nie dryf katalogowy — patrz `_hasActiveMeleeDegradation()`.
        const meleeCat = WEAPONS.find(w => w.name === "Katana");
        const item = await driftedCopy(data => {
          data.type = "weapon";
          data.system.type.value = "biala";
          data.system.damage.base.number = 1;
          data.system.damage.base.denomination = 6; // wyszczerbiona z k10 do k6
          data.flags[MODULE_ID].degradation = { originalDenomination: 10, currentDenomination: 6 };
        });

        const labels = diffWeaponItem(item, meleeCat).map(f => f.label);
        expect(labels).to.not.include("Obrażenia — kość (denominacja)");
        expect(labels).to.not.include("Obrażenia — kość (liczba)");

        const delta = buildWeaponRepairDelta(item, meleeCat);
        expect(foundry.utils.hasProperty(delta, "system.damage.base.denomination"),
          "denominacja nietknięta mimo degradacji").to.be.false;
        expect(foundry.utils.hasProperty(delta, "system.damage.base.number"),
          "liczba kości nietknięta mimo degradacji").to.be.false;
      });

      it("strzelba nabita alternatywnym kalibrem (Breneka) nie jest zgłaszana ani cofana do domyślnej amunicji", async function () {
        // Regresja: żywy przypadek Piekarza tuż po doładowaniu Breneki (12ga_b) do
        // Obrzyna (domyślnie 12ga_s) — weapons/ammo.mjs poprawnie zmienia obrażenia na
        // 2k6 obuchowe za każdym razem, gdy flags.mag.ammoType się zmienia; to żywy stan
        // gry, nie dryf katalogowy. Bez `_hasAlternateAmmoLoaded()` `repairWeapons()`
        // cofnąłby broń do domyślnego 2k4 kłute przy pierwszym audycie po przeładowaniu.
        const item = await driftedCopy(data => {
          data.flags[MODULE_ID].mag.ammoType = "12ga_b";
          data.system.damage.base.denomination = 6; // 2k6 obuchowe — profil Breneki
          data.system.damage.base.types = ["bludgeoning"];
        });

        const labels = diffWeaponItem(item, cat).map(f => f.label);
        expect(labels).to.not.include("Obrażenia — kość (denominacja)");
        expect(labels).to.not.include("Typ obrażeń");
        expect(labels).to.not.include("Magazynek — kaliber");

        const delta = buildWeaponRepairDelta(item, cat);
        expect(foundry.utils.hasProperty(delta, "system.damage.base.denomination"),
          "denominacja nietknięta mimo innego kalibru").to.be.false;
        expect(foundry.utils.hasProperty(delta, "system.damage.base.types"),
          "typ obrażeń nietknięty mimo innego kalibru").to.be.false;
        expect(foundry.utils.hasProperty(delta, `flags.${MODULE_ID}.mag.ammoType`),
          "kaliber magazynka nietknięty mimo innego kalibru").to.be.false;
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Amunicja", function () {
      it("identyfikatory kalibrów są unikalne", function () {
        expect(duplicates(AMMO_CALIBERS.map(c => c.id))).to.be.empty;
        expect(duplicates(GRENADE_TYPES.map(g => g.id))).to.be.empty;
      });

      it("typ obrażeń i właściwości naboju są znane systemowi", function () {
        const valid = CONFIG.DND5E.validProperties.weapon;
        for (const caliber of [...AMMO_CALIBERS, ...GRENADE_TYPES]) {
          if (caliber.type) expect(CONFIG.DND5E.damageTypes, `${caliber.id} → ${caliber.type}`).to.have.property(caliber.type);
          for (const prop of caliber.props ?? []) {
            expect(valid.has(prop), `${caliber.id}: nieznana właściwość "${prop}"`).to.be.true;
          }
        }
      });

      it("formuła obrażeń daje się sparsować", function () {
        for (const caliber of [...AMMO_CALIBERS, ...GRENADE_TYPES].filter(c => c.formula)) {
          expect(Roll.validate(caliber.formula), `${caliber.id}: "${caliber.formula}"`).to.be.true;
        }
      });

      it("pliki ikon istnieją", async function () {
        for (const caliber of AMMO_CALIBERS) {
          const path = `modules/${MODULE_ID}/icons/ammo/${caliber.icon}`;
          expect(await assetExists(path), `${caliber.id}: ${path}`).to.be.true;
        }
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Pancerze", function () {
      it("identyfikatory i nazwy są unikalne", function () {
        expect(duplicates(ARMORS.map(a => a.id))).to.be.empty;
        expect(duplicates(ARMORS.map(a => a.name))).to.be.empty;
        expect(Object.keys(ARMOR_MAP)).to.have.lengthOf(ARMORS.length);
      });

      it("typ ekwipunku jest zarejestrowany w `CONFIG.DND5E.equipmentTypes`", function () {
        // Hełmy i tarcze siedzą w tej samej tablicy co pancerze, ale ich `armorType`
        // (`trinket`, `shield`) żyje poza `armorTypes` — nieznany typ to przedmiot,
        // którego dnd5e nie policzy do KP i nikt tego nie zgłosi.
        for (const armor of ARMORS) {
          expect(CONFIG.DND5E.equipmentTypes, `${armor.name} → ${armor.armorType}`)
            .to.have.property(armor.armorType);
        }
      });

      it("pancerz z bazowym KP ma typ z `CONFIG.DND5E.armorTypes`", function () {
        for (const armor of ARMORS.filter(a => a.ac != null && a.armorType !== "shield")) {
          expect(CONFIG.DND5E.armorTypes, `${armor.name} → ${armor.armorType}`)
            .to.have.property(armor.armorType);
        }
      });

      it("modyfikator Skradania się używa słownika udokumentowanego w armor-data", function () {
        for (const armor of ARMORS.filter(a => a.stealth)) {
          expect(["dis", "none"], `${armor.name}: stealth = ${armor.stealth}`).to.include(armor.stealth);
        }
      });

      it("`stealth: \"none\"` niesie flagę, na której stoi blokada skradania", function () {
        // Samo `stealthDisadvantage` dnd5e obsłuży, ale „Niemożliwe” to już nasza
        // reguła — czyta ją flaga, nie właściwość systemowa.
        for (const armor of ARMORS.filter(a => a.stealth === "none")) {
          const flags = buildArmorItemData(armor).flags?.[MODULE_ID];
          expect(flags?.stealthImpossible, `${armor.name}`).to.equal(true);
        }
      });

      it("dane przedmiotu przechodzą walidację dnd5e", function () {
        for (const armor of ARMORS) {
          expect(buildsCleanly(buildArmorItemData(armor)), armor.name).to.be.null;
        }
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Ulepszenia broni", function () {
      it("klucz mapy zgadza się z polem `id`", function () {
        for (const [key, addon] of Object.entries(ADDON_DEFS)) {
          expect(addon.id, `ADDON_DEFS.${key}.id`).to.equal(key);
        }
      });

      it("odwołania do innych ulepszeń istnieją", function () {
        for (const addon of ADDON_LIST) {
          for (const ref of [...(addon.requiresAddons ?? []), ...(addon.exclusiveWith ?? [])]) {
            expect(ADDON_DEFS, `${addon.id} → ${ref}`).to.have.property(ref);
          }
        }
      });

      it("wykluczenia są wzajemne", function () {
        for (const addon of ADDON_LIST) {
          for (const ref of addon.exclusiveWith ?? []) {
            expect(ADDON_DEFS[ref].exclusiveWith ?? [], `${ref} nie wyklucza z powrotem ${addon.id}`)
              .to.include(addon.id);
          }
        }
      });

      it("wymagane typy broni i właściwości są znane systemowi", function () {
        const valid = CONFIG.DND5E.validProperties.weapon;
        for (const addon of ADDON_LIST) {
          for (const type of addon.requiresWeaponTypes ?? []) {
            expect(CONFIG.DND5E.weaponTypes, `${addon.id} → ${type}`).to.have.property(type);
          }
          for (const prop of [...(addon.requiresProperties ?? []), ...(addon.grantProperties ?? []),
            ...(addon.removeProperties ?? [])]) {
            expect(valid.has(prop), `${addon.id}: nieznana właściwość "${prop}"`).to.be.true;
          }
        }
      });

      it("celowniki z `SIGHT_ADDON_IDS` istnieją", function () {
        for (const id of SIGHT_ADDON_IDS) expect(ADDON_DEFS, id).to.have.property(id);
      });
    });

    describe("Ulepszenia broni — instalacja/usunięcie (preservacja bonusu obrażeń)", function () {
      // Regresja: instalacja Osełki (naostrzenie) na Nadziaku Piekarza nadpisała
      // ręcznie wpisany "@abilities.str.mod" (formuła, nie liczba) samą wartością
      // delty ("1") — `parseInt("@abilities.str.mod")` daje NaN → 0, więc stary kod
      // liczył `0 + 1` i tracił bonus z cechy bezpowrotnie. `_composeBonus`/
      // `_decomposeBonus` w addons.mjs mają to teraz dokładać/odejmować jako osobny
      // człon formuły, nigdy nie parsować jej jako liczbę.
      let actor;
      const cat = WEAPONS.find(w => w.name === "Katana"); // broń biała sieczna — kwalifikuje się do Osełki

      before(async function () { actor = await scratchActor(); });
      after(async function () { await scratchCleanup(); });

      async function driftedWeapon(bonus) {
        const data = foundry.utils.deepClone(buildWeaponItemData(cat));
        data.system.quantity = 1; // isAddonCompatible odmawia dla stosu > 1
        data.system.damage.base.bonus = bonus;
        const [item] = await actor.createEmbeddedDocuments("Item", [data], { render: false });
        return item;
      }

      it("instalacja dokłada bonus jako osobny człon, nie nadpisuje formuły cechy", async function () {
        const item = await driftedWeapon("@abilities.str.mod");
        await installAddonById(item, "naostrzenie");
        const live = actor.items.get(item.id);
        expect(live.system.damage.base.bonus).to.equal("@abilities.str.mod + 1");
      });

      it("usunięcie odejmuje dokładnie ten człon, przywracając formułę cechy", async function () {
        const item = await driftedWeapon("@abilities.dex.mod");
        await installAddonById(item, "naostrzenie");
        await removeAddon(item, "naostrzenie", { refund: false });
        const live = actor.items.get(item.id);
        expect(live.system.damage.base.bonus).to.equal("@abilities.dex.mod");
      });

      it("na liczbowym bonusie zachowuje się jak zwykła arytmetyka", async function () {
        const item = await driftedWeapon("2");
        await installAddonById(item, "naostrzenie");
        expect(actor.items.get(item.id).system.damage.base.bonus).to.equal("3");
        await removeAddon(item, "naostrzenie", { refund: false });
        expect(actor.items.get(item.id).system.damage.base.bonus).to.equal("2");
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Zestawy narzędziowe", function () {
      it("identyfikatory są unikalne i zarejestrowane w `CONFIG.DND5E.tools`", function () {
        expect(duplicates(TOOLKITS.map(k => k.id))).to.be.empty;
        for (const kit of TOOLKITS) {
          expect(CONFIG.DND5E.tools, `${kit.label} → ${kit.id}`).to.have.property(kit.id);
        }
      });

      it("Cecha zestawu istnieje", function () {
        for (const kit of TOOLKITS) {
          expect(CONFIG.DND5E.abilities, `${kit.id}.ability`).to.have.property(kit.ability);
          if (kit.altAbility) expect(CONFIG.DND5E.abilities, `${kit.id}.altAbility`).to.have.property(kit.altAbility);
        }
      });

      it("każda akcja ma nazwę i liczbowe ST", function () {
        for (const kit of TOOLKITS) {
          for (const action of kit.actions ?? []) {
            expect(action.name, `${kit.id}`).to.be.a("string").and.to.not.be.empty;
            expect(action.dc, `${kit.id} → ${action.name}`).to.be.a("number");
          }
        }
      });

      it("dane przedmiotu przechodzą walidację, celowo bez aktywności", function () {
        // Aktywności powstają dopiero przez `item.createActivity` w `createToolkits`
        // (quirk dnd5e 5.3) — gdyby ktoś wstawił je inline, walidacja przeszłaby,
        // a karta pokazałaby duplikaty po pierwszym przebudowaniu.
        for (const kit of TOOLKITS) {
          const data = buildToolkitItemData(kit);
          expect(buildsCleanly(data), kit.label).to.be.null;
          expect(Object.keys(data.system.activities ?? {}), `${kit.label}: activities`).to.be.empty;
        }
      });

      it("każde ST z tabeli trafia do opisu przedmiotu", function () {
        // Opis to jedyne miejsce, w którym gracz widzi listę ST — literówka w
        // `actions` znika bezszelestnie, bo aktywności budują się z tej samej tablicy.
        for (const kit of TOOLKITS) {
          const html = buildToolkitItemData(kit).system.description.value;
          for (const action of kit.actions ?? []) {
            expect(html, `${kit.label} → ${action.name}`).to.contain(action.name);
          }
        }
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Chemia (leki, narkotyki, używki)", function () {
      // 2026-08-29: 28 z 35 pozycji tego katalogu renderowały się na generycznych
      // ikonach rdzenia Foundry przez długi czas mimo, że dedykowana grafika już
      // istniała na dysku — `def.img` po prostu nigdy nie wskazał na nią, i nic w
      // warstwie testów tego nie łapało. Ten `describe` istnieje żeby ta klasa
      // regresji (poprawna etykieta/dawka/ikona, ale zapomniana w jednym polu)
      // rzucała czerwonym testem, nie cichym literałem "icons/svg/pill.svg".
      it("etykiety są unikalne", function () {
        expect(duplicates(Object.values(CHEMIA).map(d => d.label))).to.be.empty;
      });

      it("subtype jest zarejestrowany w CHEMIA_SUBTYPES", function () {
        for (const [key, def] of Object.entries(CHEMIA)) {
          expect(CHEMIA_SUBTYPES, `${key} → ${def.subtype}`).to.have.property(def.subtype);
        }
      });

      it("`treats` wskazuje na istniejącą chorobę", function () {
        for (const [key, def] of Object.entries(CHEMIA)) {
          for (const diseaseKey of def.treats ?? []) {
            expect(ALL_DISEASES, `${key} → treats → ${diseaseKey}`).to.have.property(diseaseKey);
          }
        }
      });

      it("doses jest liczbą dodatnią", function () {
        for (const [key, def] of Object.entries(CHEMIA)) {
          expect(def.doses, key).to.be.a("number").and.to.be.above(0);
        }
      });

      it("każda pozycja ma własną ikonę — nie generyczny fallback rdzenia dnd5e/Foundry", function () {
        // Nie zabrania KAŻDEJ ikony core (np. `icons/svg/hazard.svg` — jawny TODO
        // placeholder byłby tu dopuszczalny), tylko blokuje powrót do konkretnych
        // generycznych ikon, którymi cichcem stał cały katalog przed 2026-08-29.
        const genericFallbacks = new Set([
          "icons/svg/pill.svg", "icons/svg/stoned.svg", "icons/svg/tankard.svg",
          "icons/svg/aura.svg", "icons/svg/heal.svg", "icons/svg/blood.svg",
          "icons/svg/radiation.svg", "icons/svg/barrel.svg", "icons/svg/poison.svg",
          "icons/svg/regen.svg", "icons/svg/explosion.svg"
        ]);
        for (const [key, def] of Object.entries(CHEMIA)) {
          expect(def.img, key).to.be.a("string").and.to.not.be.empty;
          expect(genericFallbacks.has(def.img), `${key} → ${def.img}`).to.be.false;
        }
      });

      it("pliki ikon istnieją", async function () {
        for (const [key, def] of Object.entries(CHEMIA)) {
          const path = def.img.startsWith("modules/") ? def.img : `modules/${MODULE_ID}/${def.img}`;
          expect(await assetExists(path), `${key}: ${path}`).to.be.true;
        }
      });

      it("chemiaKeyByName rozpoznaje własną etykietę każdej pozycji", function () {
        for (const [key, def] of Object.entries(CHEMIA)) {
          expect(chemiaKeyByName(def.label), def.label).to.equal(key);
        }
      });

      it("dane przedmiotu przechodzą walidację dnd5e", function () {
        for (const key of Object.keys(CHEMIA)) {
          expect(buildsCleanly(chemiaItemData(key)), key).to.be.null;
        }
      });

      it("consumable (nie loot) ma system.type.value = CHEMIA_TYPE", function () {
        for (const [key, def] of Object.entries(CHEMIA)) {
          if (def.itemType === "loot") continue;
          expect(chemiaItemData(key).system.type.value, key).to.equal(CHEMIA_TYPE);
        }
      });
    });
  }, { displayName: "Neuroshima: Ekwipunek — integralność tabel" });
}
