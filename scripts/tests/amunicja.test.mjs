/**
 * Neuroshima 5e — amunicja: rodziny naboi, magazynki kwantowe, dum-dum.
 *
 * Trzy rzeczy, które ta paczka pilnuje, i każda z nich powstała po żywym błędzie:
 *
 * 1. **Rodziny naboi.** Zgodność kalibru była wcześniej testem prefiksu ciągu znaków
 *    (`ammoType.startsWith("12ga")`). Działało przypadkiem dla `.12 Ga`, ale `762` jest
 *    prefiksem `76239ak` — dwóch różnych, niewymiennych naboi. Test poniżej trzyma ten
 *    konkretny przypadek, bo to jedyna para w katalogu, która by na tym poległa.
 *
 * 2. **Magazynki kwantowe.** Kontrola zapasowego magazynka w walce szukała przedmiotu
 *    o `system.type.value === "magazine"`. Takiego przedmiotu nie tworzy nic w tym module
 *    (magazynki to `value: "ammo"` + `subtype: "magazine-*"` + `flags.ready`), więc na 1808
 *    przedmiotów w świecie pasowało zero i każde przeładowanie w walce było odrzucane.
 *    Błąd przeżył, bo komunikat brzmiał jak zasada gry. Testy trzymają teraz kształt danych,
 *    a nie samo zachowanie.
 *
 * 3. **Dum-dum.** Amunicja z dwiema cechami (Rozrywająca, Hollow-point) i własnym profilem
 *    Krwawienia. Sprawdzamy, że nie bije mocniej od zwykłego `.44 Mag` (cały zysk ma siedzieć
 *    w cechach) i że profil Hemofilii został nietknięty przy okazji dodawania drugiego.
 *
 * Zero walk, zero `activity.use()`, zero trwałych zmian w świecie — patrz `TESTING.md`.
 */

import {
  AMMO_CALIBERS, AMMO_CALIBER_MAP, familyCalibers, ammoFamily
} from "../config/ammo-data.mjs";
import { hasWeaponProperty } from "../config/weapons.mjs";
import { __testing as mag } from "../weapons/magazine.mjs";
import { __testing as saveProps } from "../combat/weapon-save-properties.mjs";
import { BLEED, BLEED_PROFILES, bleedProfile } from "../combat/bleeding.mjs";
import { MAG_LABELS, MAG_ICONS, MAG_PRICES, MAG_WEIGHTS, isMagazineItem, getMagTypeForWeapon }
  from "../actors/magazine-inventory.mjs";
import {
  MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, captureWarnings, waitFor
} from "./helpers.mjs";

/** Zapasowy magazynek w dokładnie tym kształcie, w jakim tworzy go sekcja ekwipunku. */
function spareMagData(subtype, { quantity = 2, ready = 2 } = {}) {
  return {
    name: `${SCRATCH_PREFIX} ${MAG_LABELS[subtype]}`,
    type: "consumable",
    img: MAG_ICONS[subtype],
    system: {
      type: { value: "ammo", subtype },
      quantity,
      weight: { value: MAG_WEIGHTS[subtype], units: "kg" },
      price: { value: MAG_PRICES[subtype], denomination: "gb" }
    },
    flags: { [MODULE_ID]: { ready } }
  };
}

function ammoStackData(caliberId, quantity) {
  const caliber = AMMO_CALIBER_MAP[caliberId];
  return {
    name: `${SCRATCH_PREFIX} ${caliber.label}`,
    type: "consumable",
    system: { type: { value: "ammo", subtype: caliberId }, quantity }
  };
}

function pistolData(name, ammoType) {
  return {
    name: `${SCRATCH_PREFIX} ${name}`,
    type: "weapon",
    system: {
      type: { value: "palnaKrotka" },
      properties: ["amm", "tryb_p"],
      damage: { base: { number: 1, denomination: 10, types: ["piercing"] } }
    },
    flags: { [MODULE_ID]: { mag: { ammoType, current: 8, max: 8 } } }
  };
}

export function registerAmmoTests(quench) {
  quench.registerBatch(`${MODULE_ID}.amunicja`, context => {
    const { describe, it, before, after, expect } = context;

    let actor;

    before(async function () {
      actor = await scratchActor();
    });

    after(async function () {
      await scratchCleanup();
    });

    /* ------------------------------------------------------------------ */

    describe("Rodziny naboi", function () {
      it("łączy .44 Mag ze zwykłym i dum-dum", function () {
        expect(familyCalibers("44mag").map(c => c.id)).to.have.members(["44mag", "44mag_dd"]);
        expect(familyCalibers("44mag_dd").map(c => c.id)).to.have.members(["44mag", "44mag_dd"]);
      });

      it("łączy oba warianty .12 Ga", function () {
        expect(familyCalibers("12ga_s").map(c => c.id)).to.have.members(["12ga_s", "12ga_b"]);
      });

      // To jest cały powód istnienia pola `family`: poprzednia reguła (prefiks ciągu) uznałaby
      // te dwa naboje za wymienne, bo "762" jest prefiksem "76239ak".
      it("NIE łączy 7,62 mm z 7,62x39 AK, mimo wspólnego prefiksu", function () {
        expect(familyCalibers("762").map(c => c.id)).to.deep.equal(["762"]);
        expect(familyCalibers("76239ak").map(c => c.id)).to.deep.equal(["76239ak"]);
      });

      it("kaliber bez rodziny jest rodziną sam dla siebie", function () {
        expect(ammoFamily("9mm")).to.equal("9mm");
        expect(familyCalibers("9mm").map(c => c.id)).to.deep.equal(["9mm"]);
      });

      // Rodzina nie musi być kaliberem (".44 Mag" jest, ".12 Ga" nie — nabój o id "12ga" nie
      // istnieje, są tylko dwa warianty). Sensowny niezmiennik jest inny: rodzina z jednym
      // członkiem to literówka, bo nie da niczego, czego nie daje sam kaliber.
      it("każda rodzina ma co najmniej dwóch członków", function () {
        const counts = {};
        for (const caliber of AMMO_CALIBERS) {
          if (!caliber.family) continue;
          counts[caliber.family] = (counts[caliber.family] ?? 0) + 1;
        }
        expect(Object.keys(counts)).to.have.length.above(0);
        for (const [family, count] of Object.entries(counts)) {
          expect(count, `rodzina "${family}"`).to.be.at.least(2);
        }
      });
    });

    /* ------------------------------------------------------------------ */

    describe("Dum-dum jako kaliber", function () {
      const dd = () => AMMO_CALIBER_MAP["44mag_dd"];

      it("bije dokładnie tyle samo, co zwykły .44 Mag", function () {
        expect(dd().formula).to.equal(AMMO_CALIBER_MAP["44mag"].formula);
        expect(dd().type).to.equal(AMMO_CALIBER_MAP["44mag"].type);
      });

      it("wnosi Rozrywającą i Hollow-point ponad to, co ma zwykły nabój", function () {
        expect(dd().props).to.include.members(["rozrywajaca", "hollowpoint"]);
        expect(AMMO_CALIBER_MAP["44mag"].props).to.not.include("rozrywajaca");
        expect(AMMO_CALIBER_MAP["44mag"].props).to.not.include("hollowpoint");
      });

      // Bez wpisu w `itemProperties` dnd5e nie ma etykiety i karta broni wywala się przy
      // renderowaniu listy właściwości — cicho, dopiero przy otwarciu karty.
      it("obie cechy są zarejestrowane w dnd5e i dozwolone na broni", function () {
        for (const key of ["rozrywajaca", "hollowpoint"]) {
          expect(CONFIG.DND5E.itemProperties[key], `itemProperties.${key}`).to.be.an("object");
          expect([...CONFIG.DND5E.validProperties.weapon], `validProperties.weapon`).to.include(key);
        }
      });
    });

    /* ------------------------------------------------------------------ */

    describe("Synchronizacja broni z kalibrem", function () {
      let gun;

      before(async function () {
        const [created] = await actor.createEmbeddedDocuments("Item", [pistolData("Pistolet dum-dum", "44mag")],
          { render: false });
        gun = created;
      });

      it("przełączenie na dum-dum dokłada obie cechy do broni", async function () {
        await gun.setFlag(MODULE_ID, "mag", { ...gun.getFlag(MODULE_ID, "mag"), ammoType: "44mag_dd" });
        await waitFor(() => hasWeaponProperty(actor.items.get(gun.id), "rozrywajaca"),
          { label: "synchronizacja cech dum-dum" });

        const live = actor.items.get(gun.id);
        expect(hasWeaponProperty(live, "hollowpoint")).to.equal(true);
        expect(live.system.damage.base.number).to.equal(1);
        expect(live.system.damage.base.denomination).to.equal(10);
      });

      it("powrót na zwykły .44 Mag zdejmuje obie cechy, ale zostawia Obalającą", async function () {
        await gun.setFlag(MODULE_ID, "mag", { ...gun.getFlag(MODULE_ID, "mag"), ammoType: "44mag" });
        await waitFor(() => !hasWeaponProperty(actor.items.get(gun.id), "rozrywajaca"),
          { label: "cofnięcie cech dum-dum" });

        const live = actor.items.get(gun.id);
        expect(hasWeaponProperty(live, "hollowpoint")).to.equal(false);
        expect(hasWeaponProperty(live, "obalajaca")).to.equal(true);
      });

      after(async function () {
        await actor.deleteEmbeddedDocuments("Item", [gun.id], { render: false });
      });
    });

    /* ------------------------------------------------------------------ */

    describe("Magazynki kwantowe", function () {
      let gun, spare;

      before(async function () {
        const created = await actor.createEmbeddedDocuments("Item", [
          pistolData("Pistolet magazynkowy", "44mag"),
          spareMagData("magazine-short")
        ], { render: false });
        gun = created.find(i => i.type === "weapon");
        spare = created.find(i => i.type === "consumable");
      });

      after(async function () {
        await actor.deleteEmbeddedDocuments("Item", [gun.id, spare.id], { render: false });
      });

      // Kształt danych, na którym poprzednia wersja się wykładała.
      it("magazynek zapasowy to consumable-ammo z podtypem magazine-*, nie type.value === magazine", function () {
        expect(isMagazineItem(spare)).to.equal(true);
        expect(spare.system.type.value).to.equal("ammo");
        expect(spare.system.type.value).to.not.equal("magazine");
      });

      it("broń palna krótka szuka krótkiego magazynka", function () {
        expect(getMagTypeForWeapon(gun)).to.equal("magazine-short");
      });

      it("znajduje gotowy magazynek pasujący do broni", function () {
        const found = mag.findReadyMagazine(actor, actor.items.get(gun.id));
        expect(found?.id).to.equal(spare.id);
      });

      it("nie znajduje żadnego, gdy licznik gotowych spadnie do zera", async function () {
        await spare.setFlag(MODULE_ID, "ready", 0);
        expect(mag.findReadyMagazine(actor, actor.items.get(gun.id))).to.equal(null);
      });

      it("po walce wszystkie magazynki wracają do stanu gotowości równego posiadanym", async function () {
        mag.restoreQuantumMagazinesForActor(actor);
        await waitFor(() => actor.items.get(spare.id).getFlag(MODULE_ID, "ready") === 2,
          { label: "odnowienie magazynków" });
        expect(actor.items.get(spare.id).getFlag(MODULE_ID, "ready")).to.equal(2);
      });

      it("magazynek nie niesie własnego kalibru — dostaje go dopiero przy wymianie", function () {
        expect(spare.system.type.subtype).to.equal("magazine-short");
        expect(AMMO_CALIBER_MAP[spare.system.type.subtype]).to.equal(undefined);
      });
    });

    /* ------------------------------------------------------------------ */

    describe("Wybór naboju z rodziny", function () {
      let stack;

      after(async function () {
        if (stack) await actor.deleteEmbeddedDocuments("Item", [stack.id], { render: false })
          .catch(() => {});
      });

      it("bez amunicji w ekwipunku ostrzega i nic nie wybiera", async function () {
        const warnings = captureWarnings();
        try {
          expect(await mag.chooseFamilyAmmo(actor, "44mag")).to.equal(null);
          expect(warnings.messages.join(" ")).to.match(/Brak amunicji/i);
        } finally { warnings.restore(); }
      });

      // Jedna opcja = brak dialogu. To jest ta ścieżka, którą chodzi każda broń w świecie
      // poza strzelbami i Złotym Desert Eagle, więc musi zostać bezpytaniowa.
      it("przy jednym rodzaju naboju wybiera go bez pytania", async function () {
        const [created] = await actor.createEmbeddedDocuments("Item", [ammoStackData("44mag", 8)],
          { render: false });
        stack = created;

        const pick = await mag.chooseFamilyAmmo(actor, "44mag");
        expect(pick?.caliberId).to.equal("44mag");
        expect(pick?.ammoItem?.id).to.equal(stack.id);
      });

      it("pusty stos jest niewidoczny dla wyszukiwania amunicji", async function () {
        await stack.update({ "system.quantity": 0 });
        expect(mag.findAmmo(actor, "44mag")).to.equal(null);
        await stack.update({ "system.quantity": 8 });
      });
    });

    /* ------------------------------------------------------------------ */

    describe("Profile Krwawienia", function () {
      it("dum-dum: 1k8 na początku tury, bez rzutu na przerwanie", function () {
        const p = BLEED_PROFILES.dumdum;
        expect(p.damage).to.equal("1d8");
        expect(p.when).to.equal("start");
        expect(p.save).to.equal(null);
        expect(p.dose).to.equal(false);
      });

      // Regresja: dodanie drugiego profilu nie miało prawa ruszyć RAW-owego pierwszego.
      it("hemofilia zachowuje wartości RAW", function () {
        const p = BLEED_PROFILES.hemofilia;
        expect(p.damage).to.equal("1d4");
        expect(p.when).to.equal("end");
        expect(p.save.dc).to.equal(BLEED.saveDC).and.to.equal(10);
        expect(p.save.ability).to.equal("con");
        expect(p.save.streakToStop).to.equal(3);
        expect(p.dose).to.equal(true);
      });

      it("dum-dum jest cięższy, więc nadpisuje trwające krwawienie z hemofilii", function () {
        expect(BLEED_PROFILES.dumdum.severity).to.be.above(BLEED_PROFILES.hemofilia.severity);
      });

      // Wpisy sprzed profili nie mają pola `profile`. Muszą dalej znaczyć „hemofilia",
      // inaczej stary zapis na karcie zmieniłby zasady po cichu.
      it("krwawienie zapisane bez profilu czyta się jako hemofilia", async function () {
        await actor.setFlag(MODULE_ID, "krwawienie", { active: true, streak: 1 });
        try {
          expect(bleedProfile(actor).id).to.equal("hemofilia");
        } finally {
          await actor.unsetFlag(MODULE_ID, "krwawienie");
        }
      });

      it("aktor bez krwawienia też dostaje sensowny profil zamiast undefined", function () {
        expect(bleedProfile(actor).id).to.equal("hemofilia");
      });
    });

    /* ------------------------------------------------------------------ */

    describe("Rozrywająca jako cecha broni", function () {
      const config = () => saveProps.SAVE_PROPERTIES.rozrywajaca;

      it("to RO na Kondycję o stałym ST 14", function () {
        expect(config().ability).to.equal("con");
        expect(config().dc).to.deep.equal({ mode: "fixed", value: 14 });
        expect(saveProps.computeDC({ actor: null }, config())).to.equal(14);
      });

      it("zamiast przełączać status, uruchamia własne krwawienie", function () {
        expect(config().onFail).to.be.a("function");
      });

      it("cel z odpornością na kłute jest wyłączony spod cechy", async function () {
        const armored = await scratchActor({ system: { traits: { dr: { value: ["piercing"] } } } });
        expect(saveProps.resistsDamageType(armored, "piercing")).to.equal(true);
        expect(saveProps.resistsDamageType(armored, "slashing")).to.equal(false);
      });

      it("cel bez żadnej odporności nie jest wyłączony", function () {
        expect(saveProps.resistsDamageType(actor, "piercing")).to.equal(false);
      });

      // Dwie rzeczy naraz, obie sprawdzone na żywych danych (2026-09-08):
      //  - typ istoty da się ustawić wyłącznie na NPC-u; dnd5e wymusza na postaci gracza
      //    "humanoid" niezależnie od tego, co się wpisze, więc cecha z natury dotyczy
      //    tylko bestiariusza,
      //  - świat trzyma tam ETYKIETĘ ("Maszyna"), nie klucz ("maszyna") — porównanie samego
      //    klucza nie trafiłoby ani razu i maszyny krwawiłyby jak ludzie.
      it("maszyna nie krwawi — czy typ zapisano kluczem, czy etykietą", async function () {
        const exempt = config().exemptCreatureTypes;
        for (const written of ["maszyna", "Maszyna", "MASZYNA"]) {
          const machine = await scratchActor({
            name: `${SCRATCH_PREFIX} maszyna ${written}`,
            type: "npc",
            system: { details: { type: { value: written } } }
          });
          expect(machine.system.details.type.value, "NPC utrzymuje ustawiony typ").to.equal(written);
          expect(saveProps.isExemptCreatureType(machine, exempt), `zapis "${written}"`).to.equal(true);
        }
      });

      it("człowiek, zwierzę i domyślny humanoid krwawią normalnie", async function () {
        const exempt = config().exemptCreatureTypes;
        expect(saveProps.isExemptCreatureType(actor, exempt), "postać gracza").to.equal(false);
        for (const written of ["Człowiek", "Zwierzę", "Potwór", "Mutant"]) {
          const beast = await scratchActor({
            name: `${SCRATCH_PREFIX} ${written}`,
            type: "npc",
            system: { details: { type: { value: written } } }
          });
          expect(saveProps.isExemptCreatureType(beast, exempt), written).to.equal(false);
        }
      });
    });

    /* ------------------------------------------------------------------ */

    describe("Odczyt właściwości broni", function () {
      // `system.properties` bywa Setem albo tablicą zależnie od ścieżki — ta sama pułapka
      // co `damage.parts[].types` (ARCHITECTURE.md §10).
      it("czyta zarówno Set, jak i tablicę", function () {
        expect(hasWeaponProperty({ system: { properties: new Set(["hollowpoint"]) } }, "hollowpoint")).to.equal(true);
        expect(hasWeaponProperty({ system: { properties: ["hollowpoint"] } }, "hollowpoint")).to.equal(true);
        expect(hasWeaponProperty({ system: { properties: ["obalajaca"] } }, "hollowpoint")).to.equal(false);
        expect(hasWeaponProperty({}, "hollowpoint")).to.equal(false);
        expect(hasWeaponProperty(null, "hollowpoint")).to.equal(false);
      });
    });
  });
}
