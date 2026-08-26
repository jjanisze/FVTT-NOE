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

import { WEAPONS, WEAPON_MAP, WEAPON_ICONS, WEAPON_NAME_ALIASES, buildWeaponItemData } from "../config/weapons-data.mjs";
import { AMMO_CALIBERS, AMMO_CALIBER_MAP, GRENADE_TYPES } from "../config/ammo-data.mjs";
import { ARMORS, ARMOR_MAP, buildArmorItemData } from "../config/armor-data.mjs";
import { ADDON_DEFS, ADDON_LIST, SIGHT_ADDON_IDS } from "../config/addons-data.mjs";
import { TOOLKITS, buildToolkitItemData } from "../config/toolkits-data.mjs";
import { MODULE_ID } from "./helpers.mjs";

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
    const { describe, it, expect } = context;

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
  }, { displayName: "Neuroshima: Ekwipunek — integralność tabel" });
}
