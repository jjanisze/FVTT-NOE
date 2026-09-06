/**
 * Neuroshima 5e — integralność tabel ekwipunku.
 *
 * `weapons-data.mjs`, `ammo-data.mjs`, `armor-data.mjs`, `addons-data.mjs`,
 * `toolkits-data.mjs` i `gear-data.mjs` karmią jednocześnie kompendia, generatory na
 * Zbrojowni i UI karty postaci. Rozjazd między nimi nie rzuca wyjątku — kończy się
 * przedmiotem bez ikony, kalibrem, którego nie ma w słowniku, albo właściwością,
 * której dnd5e nie zna i po cichu wycina przy zapisie.
 *
 * Każda tabela dostaje ten sam zestaw pytań: unikalne identyfikatory, odwołania
 * prowadzące do istniejących wpisów, pliki ikon na dysku i — najważniejsze —
 * czy wynik `build*ItemData()` w ogóle przechodzi walidację DataModelu dnd5e.
 *
 * Dwa dodatki spoza czystych tabel danych (batch 39, 2026-09-06), tym samym wzorcem
 * co „Pochodnia"/„Ulepszenia broni — instalacja/usunięcie" już w tym pliku — regresja
 * złapana żywcem, nie wymyślona na zapas:
 *   - **Kolczatki** (`items/kolczatka.mjs`) — jedyny gearowy przedmiot z prawdziwą
 *     Aktywnością (reszta REAL_GEAR/GEAR_PLACEHOLDERS to inertny `loot`);
 *   - **Migracja gradacji gearu** (`migration/migrate-gear-graduation.mjs`) —
 *     dopasowanie starych kopii testowane przez `__testing`, bo złapało żywy błąd
 *     (flagless "Kolczatka" na Raynaldzie) i osobno żywy błąd scalania flag
 *     (`.update()` nie kasuje starego `craftingPlaceholder`).
 * Parsowanie tekstu granatów (`actors/grenade-inventory.mjs`) i tabela assetów VFX
 * wybuchów (`config/explosion-vfx.mjs`) też tu mieszkają — patrz ich własne `describe`.
 *
 * Batch 40 (2026-09-06): Mały medyk — ten sam wzorzec (placeholder znaleziony żywcem na
 * Raynaldzie, migracja + nowa treść, zob. `items/toolkit-medyk.mjs` i `migration/migrate-
 * medyk-graduation.mjs`). Toolkit sam w sobie okazał się już gotowy (błędny komentarz w
 * `toolkits-data.mjs` twierdził inaczej) — jedyna naprawdę nowa treść to uzupełnienie zapasu.
 */

import {
  WEAPONS, WEAPON_MAP, WEAPON_ICONS, WEAPON_NAME_ALIASES, buildWeaponItemData,
  diffWeaponItem, buildWeaponRepairDelta
} from "../config/weapons-data.mjs";
import { AMMO_CALIBERS, AMMO_CALIBER_MAP, GRENADE_TYPES } from "../config/ammo-data.mjs";
import { ARMORS, ARMOR_MAP, buildArmorItemData } from "../config/armor-data.mjs";
import { ADDON_DEFS, ADDON_LIST, SIGHT_ADDON_IDS } from "../config/addons-data.mjs";
import { installAddonById, removeAddon } from "../weapons/addons.mjs";
import { POCHODNIA_VARIANTS, buildPochodniaItemData, ensurePochodniaActivities, createPochodniaItem } from "../weapons/pochodnia.mjs";
import { TOOLKITS, buildToolkitItemData, createToolkits, MEDYK_MAX_CHARGES } from "../config/toolkits-data.mjs";
import { CHEMIA, CHEMIA_TYPE, CHEMIA_SUBTYPES, chemiaKeyByName, chemiaItemData } from "../config/chemia-data.mjs";
import { ALL_DISEASES } from "../config/diseases-data.mjs";
import {
  GEAR_PLACEHOLDERS, REAL_GEAR, buildGearItemData, buildRealGearItemData, createRealGear
} from "../config/gear-data.mjs";
import {
  isKolczatka, buildKolczatkaItemData, createKolczatkaItem, ensureKolczatkaActivities,
  TILE_SQUARES_LONG, TILE_SQUARES_WIDE
} from "../items/kolczatka.mjs";
import {
  EXPLOSION_RING_VARIANTS, EXPLOSION_FIRE, SCORCH_MARK, SCORCH_SIZE_FRACTION,
  SCORCH_MARK_LIFETIME_SECONDS, pickRingVariant
} from "../config/explosion-vfx.mjs";
import { __testing as grenadeParsing } from "../actors/grenade-inventory.mjs";
import { __testing as gearMigration } from "../migration/migrate-gear-graduation.mjs";
import { __testing as medykMigration } from "../migration/migrate-medyk-graduation.mjs";
import {
  isMedykRefill, buildMedykRefillItemData, createMedykRefillItem, ensureMedykRefillActivities,
  useMedykRefill
} from "../items/toolkit-medyk.mjs";
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

    describe("Granaty — parsowanie RO/obrażeń z tekstu wolnego (actors/grenade-inventory.mjs)", function () {
      // `_parseSaveSpec`/`_parseDamageSpec` czytają katalogowe `save`/`effect` — polski tekst
      // wolny, nie ustrukturyzowane pola — i budują z nich RO/formułę faktycznie rzucaną z karty
      // czatu (`_rollExplosiveSavesFromCard`/`_rollExplosiveDamageFromCard`). Literówka w treści
      // katalogu po cichu cofa się do RO/obrażeń domyślnych — nic tu nie rzuca wyjątkiem, więc bez
      // tego testu regresja jest niewidoczna aż do żywego rzutu granatem.
      it("parseSaveSpec rozpoznaje Cechę + ST i przepuszcza „—” bez awarii", function () {
        expect(grenadeParsing.parseSaveSpec("RO Zręczność ST 15"))
          .to.deep.equal({ ability: "dex", dc: 15, label: "RO Zręczność ST 15" });
        expect(grenadeParsing.parseSaveSpec("—")).to.deep.equal({ ability: null, dc: null, label: "—" });
      });

      it("parseDamageSpec sumuje wiele członów kości w jedną formułę i rozpoznaje typ", function () {
        const result = grenadeParsing.parseDamageSpec("Porażka: 4k6 wybuchowe + 4k6 cięte + Powalenie + Ogłuchnięcie.");
        expect(result.formula).to.equal("4d6 + 4d6");
        expect(result.type).to.equal("explosive");
        expect(Roll.validate(result.formula)).to.be.true;
      });

      it("parseDamageSpec bez kości w tekście daje pustą formułę, nie awarię", function () {
        expect(grenadeParsing.parseDamageSpec("Chmura dymu utrzymuje się 1 min.").formula).to.equal("");
      });

      it("cały katalog GRENADE_TYPES: kości w `effect` parsują się do poprawnej formuły", function () {
        // Warstwa 1 w duchu TESTING.md — zamyka pętlę między dwoma niezależnymi widokami tych
        // samych danych (tekst w katalogu / formuła faktycznie rzucana), nie próbką ręcznie
        // dobranych przykładów jak dwa testy wyżej.
        for (const grenade of GRENADE_TYPES) {
          const hasDice = /\d+\s*k\s*\d+/i.test(grenade.effect ?? "");
          const result = grenadeParsing.parseDamageSpec(grenade.effect);
          const label = `${grenade.label ?? grenade.id}: "${grenade.effect}"`;
          if (hasDice) {
            expect(result.formula, label).to.not.be.empty;
            expect(Roll.validate(result.formula), `${label} → "${result.formula}"`).to.be.true;
          } else {
            expect(result.formula, `${label} (brak kości w tekście, ale sparsowało formułę)`).to.be.empty;
          }
        }
      });

      it("cały katalog GRENADE_TYPES: RO w `save` parsuje się do znanej Cechy i liczbowego ST", function () {
        for (const grenade of GRENADE_TYPES.filter(g => g.save && g.save !== "—")) {
          const parsed = grenadeParsing.parseSaveSpec(grenade.save);
          const label = `${grenade.label ?? grenade.id}: "${grenade.save}"`;
          expect(parsed.ability, label).to.not.be.null;
          expect(parsed.dc, label).to.be.a("number");
        }
      });

      it("getThrowBandClass/-Color: 50% zasięgu to granica ok/warn, przekroczenie zasięgu to danger", function () {
        expect(grenadeParsing.getThrowBandClass(5, 10), "dokładnie 50%").to.equal("ok");
        expect(grenadeParsing.getThrowBandClass(5.1, 10)).to.equal("warn");
        expect(grenadeParsing.getThrowBandClass(10, 10), "dokładnie na granicy zasięgu").to.equal("warn");
        expect(grenadeParsing.getThrowBandClass(10.1, 10)).to.equal("danger");
        expect(grenadeParsing.getThrowBandColor("ok")).to.equal("#54c86a");
        expect(grenadeParsing.getThrowBandColor("danger")).to.equal("#e06666");
      });

      it("computeTargetSquares zamienia metry obszaru na kratki SCENY docelowej, z dolnym progiem 0,5", function () {
        const scene = { grid: { distance: 1.5 } }; // 1,5 m/kratkę — jak na prawdziwych scenach tego świata
        expect(grenadeParsing.computeTargetSquares(scene, { kind: "cube", side: 3 }), "sześcian 3 m").to.equal(2);
        expect(grenadeParsing.computeTargetSquares(scene, { kind: "circle", radius: 1.5 }), "koło, promień 1,5 m (średnica 3 m)").to.equal(2);
        expect(grenadeParsing.computeTargetSquares(scene, { kind: "cube", side: 0.1 }), "próg dolny").to.equal(0.5);
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

    describe("Pochodnia", function () {
      it("każdy wariant ma dodatnie paliwo, jasność i wagę", function () {
        for (const [key, variant] of Object.entries(POCHODNIA_VARIANTS)) {
          expect(variant.burnMinutes, `${key}.burnMinutes`).to.be.above(0);
          expect(variant.light.bright, `${key}.light.bright`).to.be.above(0);
          expect(variant.light.dim, `${key}.light.dim`).to.be.above(variant.light.bright);
          expect(variant.weight, `${key}.weight`).to.be.at.least(0);
        }
      });

      describe("provisioning aktywności bez wyścigu", function () {
        let actor;
        before(async function () { actor = await scratchActor(); });
        after(async function () { await scratchCleanup(); });

        it("równoczesne wywołania ensurePochodniaActivities nie duplikują Zapal/Zgaś", async function () {
          // Regresja: createPochodniaItem() jawnie czeka na to po utworzeniu
          // przedmiotu, ale createItem hook w registerPochodnia() TEŻ to wywołuje —
          // oba czytały system.activities, zanim zapis drugiego wylądował, oba
          // widziały brak Zapal/Zgaś i oba je tworzyły, dając dwa komplety. Złapane
          // żywcem przy tworzeniu pochodni dla Piekarza. Dorzucamy dwa kolejne
          // wywołania równolegle z tym, które i tak odpali hook z tego samego
          // tworzenia, żeby uderzyć w ten sam wyścig.
          const data = buildPochodniaItemData("improwizowana");
          const [item] = await actor.createEmbeddedDocuments("Item", [data], { render: false });
          await Promise.all([ensurePochodniaActivities(item), ensurePochodniaActivities(item)]);

          const names = Array.from(actor.items.get(item.id).system.activities ?? []).map(a => a.name);
          expect(names.filter(n => n === "Zapal pochodnię")).to.have.lengthOf(1);
          expect(names.filter(n => n === "Zgaś pochodnię")).to.have.lengthOf(1);
          // Kolor Kobaltu, rule 3 — same single-flight guard covers this third utility activity.
          expect(names.filter(n => n === "Dolej paliwo (1 kg CH)")).to.have.lengthOf(1);
        });

        it("createPochodniaItem zwraca przedmiot z dokładnie jednym kompletem aktywności", async function () {
          const item = await createPochodniaItem("smolowa", { actor });
          const names = Array.from(item.system.activities ?? []).map(a => a.name);
          expect(names.filter(n => n === "Atak")).to.have.lengthOf(1);
          expect(names.filter(n => n === "Zapal pochodnię")).to.have.lengthOf(1);
          expect(names.filter(n => n === "Zgaś pochodnię")).to.have.lengthOf(1);
          expect(names.filter(n => n === "Dolej paliwo (1 kg CH)")).to.have.lengthOf(1);
        });
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Kolczatki (items/kolczatka.mjs)", function () {
      it("rozmiar znacznika na mapie ma dodatnie wymiary", function () {
        expect(TILE_SQUARES_LONG).to.be.a("number").and.to.be.above(0);
        expect(TILE_SQUARES_WIDE).to.be.a("number").and.to.be.above(0);
      });

      it("dane przedmiotu przechodzą walidację dnd5e", function () {
        expect(buildsCleanly(buildKolczatkaItemData())).to.be.null;
      });

      it("isKolczatka rozpoznaje tylko oznaczony consumable, nie każdy loot o podobnej nazwie", function () {
        const data = buildKolczatkaItemData();
        const flagged = { type: "consumable", getFlag: (m, k) => data.flags[m]?.[k] };
        expect(isKolczatka(flagged)).to.be.true;
        expect(isKolczatka({ type: "loot", getFlag: () => true }), "zły typ (np. stary placeholder)").to.be.false;
        expect(isKolczatka({ type: "consumable", getFlag: () => undefined }), "brak flagi").to.be.false;
      });

      describe("provisioning aktywności (na prawdziwym aktorze)", function () {
        let actor;
        before(async function () { actor = await scratchActor(); });
        after(async function () { await scratchCleanup(); });

        it("createKolczatkaItem daje dokładnie jedną aktywność „Rozłóż kolczatki”", async function () {
          const item = await createKolczatkaItem({ actor });
          const names = Array.from(item.system.activities ?? []).map(a => a.name);
          expect(names.filter(n => n === "Rozłóż kolczatki")).to.have.lengthOf(1);
        });

        it("równoczesne wywołania ensureKolczatkaActivities nie duplikują aktywności", async function () {
          // Ten sam pojedynczy-lot strażnik co Pochodnia/Flara (`_ensuringActivities`) —
          // ten test sprawdza, że KOPIA tego wzorca w kolczatka.mjs faktycznie działa,
          // nie tylko że wygląda podobnie na pierwszy rzut oka.
          const data = buildKolczatkaItemData();
          const [item] = await actor.createEmbeddedDocuments("Item", [data], { render: false });
          await Promise.all([ensureKolczatkaActivities(item), ensureKolczatkaActivities(item)]);
          const names = Array.from(actor.items.get(item.id).system.activities ?? []).map(a => a.name);
          expect(names.filter(n => n === "Rozłóż kolczatki")).to.have.lengthOf(1);
        });
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Mały medyk — uzupełnienie zapasu (items/toolkit-medyk.mjs)", function () {
      // Batch 40 (2026-09-06): found live on Raynald — a hand-typed "Mały Medyk 4/5" loot
      // placeholder standing in for what was, underneath, already a fully-built toolkit
      // (tiered heal table, 5-charge resource — `toolkits-data.mjs`'s `medyka` entry). The one
      // genuinely NEW piece is this refill item; the toolkit itself is covered by the generic
      // "Zestawy narzędziowe" describe below (it's just one more entry in `TOOLKITS`).
      it("dane przedmiotu przechodzą walidację dnd5e", function () {
        expect(buildsCleanly(buildMedykRefillItemData())).to.be.null;
      });

      it("isMedykRefill rozpoznaje tylko oznaczony consumable", function () {
        const data = buildMedykRefillItemData();
        expect(isMedykRefill({ type: "consumable", getFlag: (m, k) => data.flags[m]?.[k] })).to.be.true;
        expect(isMedykRefill({ type: "loot", getFlag: () => true }), "zły typ").to.be.false;
        expect(isMedykRefill({ type: "consumable", getFlag: () => undefined }), "brak flagi").to.be.false;
      });

      describe("na prawdziwym aktorze (prowizja aktywności + pełny przebieg uzupełnienia)", function () {
        let actor;
        before(async function () { actor = await scratchActor(); });
        after(async function () { await scratchCleanup(); });

        it("createMedykRefillItem daje dokładnie jedną aktywność „Uzupełnij zapas”", async function () {
          const item = await createMedykRefillItem({ actor });
          const names = Array.from(item.system.activities ?? []).map(a => a.name);
          expect(names.filter(n => n === "Uzupełnij zapas")).to.have.lengthOf(1);
        });

        it("równoczesne wywołania ensureMedykRefillActivities nie duplikują aktywności", async function () {
          // Regresja na wyrost, złapana żywcem PODCZAS budowy tej funkcji (nie w tym pakiecie
          // testów): ręczne dwukrotne zaimportowanie tego modułu w konsoli (dwie NIEZALEŻNE
          // kopie `_ensuringRefillActivities`, każda nieświadoma drugiej) dało dwie identyczne
          // aktywności na jednym przedmiocie na Zbrojowni. W normalnej pracy modułu istnieje
          // tylko JEDNA kopia tego pliku, więc pojedynczy-lot strażnik faktycznie chroni — ten
          // test to sprawdza wprost, zamiast ufać mu na słowo.
          const data = buildMedykRefillItemData();
          const [item] = await actor.createEmbeddedDocuments("Item", [data], { render: false });
          await Promise.all([ensureMedykRefillActivities(item), ensureMedykRefillActivities(item)]);
          const names = Array.from(actor.items.get(item.id).system.activities ?? []).map(a => a.name);
          expect(names.filter(n => n === "Uzupełnij zapas")).to.have.lengthOf(1);
        });

        it("useMedykRefill uzupełnia sparowany zestaw do pełna i zużywa jedną sztukę", async function () {
          await createToolkits(actor, { only: ["medyka"] });
          const kit = actor.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
          await kit.update({ "system.uses.max": String(MEDYK_MAX_CHARGES), "system.uses.spent": 3 }); // 2/5 zostało

          const refill = await createMedykRefillItem({ actor, quantity: 2 });
          await useMedykRefill(refill);

          const kitAfter = actor.items.get(kit.id);
          expect(kitAfter.system.uses.spent, "spent po uzupełnieniu").to.equal(0);
          expect(actor.items.get(refill.id)?.system.quantity, "ilość uzupełnień po zużyciu jednej").to.equal(1);
        });

        it("useMedykRefill na PEŁNYM zestawie nie zużywa uzupełnienia", async function () {
          await createToolkits(actor, { only: ["medyka"] });
          const kit = actor.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
          await kit.update({ "system.uses.max": String(MEDYK_MAX_CHARGES), "system.uses.spent": 0 }); // już pełny

          const refill = await createMedykRefillItem({ actor, quantity: 1 });
          await useMedykRefill(refill);

          expect(actor.items.get(refill.id)?.system.quantity, "uzupełnienie nietknięte na pełnym zestawie").to.equal(1);
        });
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Migracja „Mały medyk” — dopasowanie starych kopii i parsowanie N/M (migration/migrate-medyk-graduation.mjs)", function () {
      it("rozpoznaje luźny, ręcznie wpisany placeholder — dokładnie to, co znaleziono na Raynaldzie", function () {
        expect(medykMigration.isLooseMedykPlaceholder({ type: "loot", name: "Mały Medyk 4/5" })).to.be.true;
        expect(medykMigration.isLooseMedykPlaceholder({ type: "loot", name: "mały medyk" })).to.be.true;
      });

      it("ignoruje przedmioty innego typu (np. już zmigrowany zestaw — teraz tool)", function () {
        expect(medykMigration.isLooseMedykPlaceholder({ type: "tool", name: "Mały Medyk 4/5" })).to.be.false;
      });

      it("nie łapie niepowiązanej nazwy", function () {
        expect(medykMigration.isLooseMedykPlaceholder({ type: "loot", name: "Nóż taktyczny" })).to.be.false;
      });

      it("parseCharges czyta dowolną parę „N/M” z nazwy, nie tylko \"4/5\"", function () {
        expect(medykMigration.parseCharges("Mały Medyk 4/5")).to.deep.equal({ current: 4, max: 5 });
        expect(medykMigration.parseCharges("Mały Medyk 0/5")).to.deep.equal({ current: 0, max: 5 });
        expect(medykMigration.parseCharges("Mały Medyk")).to.be.null;
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

    /* ---------------------------------------------------------------- */

    describe("Gear — zaślepki craftingowe i awansowany ekwipunek (config/gear-data.mjs)", function () {
      it("gearId jest unikalny w OBU tabelach naraz — dzielą jedną przestrzeń kluczy", function () {
        const ids = [...GEAR_PLACEHOLDERS.map(g => g.id), ...REAL_GEAR.map(g => g.id)];
        expect(duplicates(ids), "powtórzone gearId między placeholderami a REAL_GEAR").to.be.empty;
      });

      it("Kolczatki awansowały poza OBIE tabele — mają własny plik (items/kolczatka.mjs)", function () {
        // Regresja na wyrost: gdyby ktoś dopisał je tu z powrotem, `_resolveProdukcjaLinks`
        // (toolkits-data.mjs) scaliłby dwa sprzeczne źródła pod tym samym kluczem "kolczatki".
        expect(GEAR_PLACEHOLDERS.some(g => g.id === "kolczatki"), "GEAR_PLACEHOLDERS").to.be.false;
        expect(REAL_GEAR.some(g => g.id === "kolczatki"), "REAL_GEAR").to.be.false;
      });

      it("REAL_GEAR ma dodatnią cenę, nieujemną wagę i dostępność 0-100% — to już nie zaślepki", function () {
        for (const gear of REAL_GEAR) {
          expect(gear.price, `${gear.label}.price`).to.be.a("number").and.to.be.above(0);
          expect(gear.weight, `${gear.label}.weight`).to.be.a("number").and.to.be.at.least(0);
          expect(gear.avail, `${gear.label}.avail`).to.be.a("number").and.to.be.within(0, 100);
        }
      });

      it("pliki ikon istnieją — placeholdery (te, co już je mają) i cały REAL_GEAR", async function () {
        for (const gear of [...GEAR_PLACEHOLDERS.filter(g => g.icon), ...REAL_GEAR]) {
          const path = `modules/${MODULE_ID}/icons/items/loot/${gear.icon}`;
          expect(await assetExists(path), `${gear.label}: ${path}`).to.be.true;
        }
      });

      it("dane przedmiotu przechodzą walidację dnd5e — placeholdery i REAL_GEAR", function () {
        for (const gear of GEAR_PLACEHOLDERS) expect(buildsCleanly(buildGearItemData(gear)), gear.label).to.be.null;
        for (const gear of REAL_GEAR) expect(buildsCleanly(buildRealGearItemData(gear)), gear.label).to.be.null;
      });

      it("placeholder wciąż niesie baner TODO w opisie; REAL_GEAR — już nie", function () {
        for (const gear of GEAR_PLACEHOLDERS) {
          expect(buildGearItemData(gear).system.description.value, gear.label).to.contain("TODO");
        }
        for (const gear of REAL_GEAR) {
          expect(buildRealGearItemData(gear).system.description.value, gear.label).to.not.contain("TODO");
        }
      });

      describe("naprawa już-issued kopii po awansie (createRealGear czyści starą flagę)", function () {
        let actor;
        before(async function () { actor = await scratchActor(); });
        after(async function () { await scratchCleanup(); });

        it("stara flaga craftingPlaceholder znika po upsercie — nie tylko dokłada się gearId", async function () {
          // Regresja złapana NA ŻYWO (2026-09-06), nie w tym pakiecie testów: `.update()` w
          // Foundry SCALA `flags`, nie zastępuje ich — pierwsza wersja `createRealGear`
          // zostawiała `craftingPlaceholder:true` na już-zaktualizowanym, wycenionym przedmiocie.
          // Kod czytający tę flagę (np. przyszły filtr "pokaż tylko prawdziwe przedmioty")
          // dalej traktowałby go jak zaślepkę mimo realnej ceny/wagi/opisu.
          const gear = REAL_GEAR.find(g => g.id === "sidla");
          const staleData = {
            name: "Sidła", type: "loot",
            flags: { [MODULE_ID]: { craftingPlaceholder: true, gearId: "sidla" } }
          };
          const [stale] = await actor.createEmbeddedDocuments("Item", [staleData], { render: false });
          expect(stale.getFlag(MODULE_ID, "craftingPlaceholder"), "przed naprawą").to.equal(true);

          await createRealGear(actor);

          const fixed = actor.items.get(stale.id);
          expect(fixed.getFlag(MODULE_ID, "craftingPlaceholder"), "po naprawie — flaga ma zniknąć").to.be.undefined;
          expect(fixed.system.price.value, "cena po naprawie").to.equal(gear.price);
        });
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Migracja gradacji gearu — dopasowanie starych kopii (migration/migrate-gear-graduation.mjs)", function () {
      const mockItem = overrides => ({
        type: "loot", name: "", flags: {},
        getFlag(module, key) { return this.flags?.[module]?.[key]; },
        ...overrides
      });

      it("rozpoznaje właściwie oflagowany placeholder (kształt GEAR_PLACEHOLDERS/REAL_GEAR)", function () {
        const item = mockItem({ name: "Sidła", flags: { [MODULE_ID]: { craftingPlaceholder: true, gearId: "sidla" } } });
        expect(gearMigration.isStaleGearPlaceholder(item)).to.be.true;
        expect(gearMigration.resolveGearId(item)).to.equal("sidla");
      });

      it("rozpoznaje luźny, ręcznie wpisany wpis bez ŻADNYCH flag — dokładnie to, co znaleziono na Raynaldzie", function () {
        const item = mockItem({ name: "Kolczatka", flags: null });
        expect(gearMigration.isStaleGearPlaceholder(item)).to.be.true;
        expect(gearMigration.resolveGearId(item)).to.equal("kolczatki");
      });

      it("liczba mnoga i warianty z nawiasem też się dopasowują", function () {
        expect(gearMigration.isStaleGearPlaceholder(mockItem({ name: "Kolczatki", flags: null }))).to.be.true;
        expect(gearMigration.resolveGearId(mockItem({ name: "Wózek (dwukółka)", flags: null }))).to.equal("wozek");
        expect(gearMigration.resolveGearId(mockItem({ name: "wózek", flags: null }))).to.equal("wozek");
      });

      it("ignoruje przedmiot, który ma już INNE flagi modułu — nie nasz, nie ruszamy", function () {
        const item = mockItem({ name: "Kolczatka", flags: { [MODULE_ID]: { chemiaKey: "coś-innego" } } });
        expect(gearMigration.isStaleGearPlaceholder(item)).to.be.false;
      });

      it("ignoruje przedmioty innego typu niż loot (np. już zmigrowane Kolczatki — teraz consumable)", function () {
        const item = mockItem({ type: "consumable", name: "Kolczatki", flags: null });
        expect(gearMigration.isStaleGearPlaceholder(item)).to.be.false;
      });

      it("nie łapie niepowiązanej nazwy", function () {
        expect(gearMigration.isStaleGearPlaceholder(mockItem({ name: "Nóż taktyczny", flags: null }))).to.be.false;
      });
    });

    /* ---------------------------------------------------------------- */

    describe("VFX wybuchów — tabela assetów (config/explosion-vfx.mjs)", function () {
      it("pickRingVariant wybiera wariant o najbliższym rozmiarze, nigdy nie wywala się poza zakresem", function () {
        const byName = squares => EXPLOSION_RING_VARIANTS.find(v => v.squares === squares).file;
        expect(pickRingVariant(6).file).to.equal(byName(6));
        expect(pickRingVariant(3).file).to.equal(byName(3));
        expect(pickRingVariant(0).file, "poniżej najmniejszego -> najmniejszy, nie awaria").to.equal(byName(3));
        expect(pickRingVariant(100).file, "powyżej największego -> największy").to.equal(byName(6));
        expect(pickRingVariant(4.4).file, "bliżej 4 niż 5").to.equal(byName(4));
        expect(pickRingVariant(4.6).file, "bliżej 5 niż 4").to.equal(byName(5));
      });

      it("pliki assetów istnieją na dysku (vfx/, nie icons/)", async function () {
        const files = [...EXPLOSION_RING_VARIANTS.map(v => v.file), EXPLOSION_FIRE.file, SCORCH_MARK.file];
        for (const file of files) expect(await assetExists(file), file).to.be.true;
      });

      it("warianty pierścienia mają unikalny rozmiar w kratkach", function () {
        expect(duplicates(EXPLOSION_RING_VARIANTS.map(v => v.squares)), "powtórzony rozmiar wariantu").to.be.empty;
      });

      it("SCORCH_SIZE_FRACTION jest ułamkiem w (0, 1] — ślad zawsze mniejszy niż sam wybuch", function () {
        expect(SCORCH_SIZE_FRACTION).to.be.above(0).and.to.be.at.most(1);
      });

      it("SCORCH_MARK_LIFETIME_SECONDS liczy się w miesiącach/latach, nie w sekundach/minutach rundy", function () {
        // Nieporównywane bezpośrednio z `EXPLOSIVE_MARKER_LIFETIME_SECONDS` (60 s) —
        // ta stała nie jest eksportowana z grenade-inventory.mjs, i słusznie: to szczegół
        // implementacyjny znacznika wybuchu, nie coś, na czym scorch mark ma polegać (patrz
        // doc comment `_spawnScorchMark`). Sprawdzamy więc tylko rząd wielkości.
        expect(SCORCH_MARK_LIFETIME_SECONDS).to.be.above(60 * 60 * 24 * 30); // > miesiąc gry
      });
    });
  }, { displayName: "Neuroshima: Ekwipunek — integralność tabel" });
}
