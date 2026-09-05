/**
 * Neuroshima 5e — compendium pack builder.
 *
 * Builds four LevelDB packs from `scripts/config/classes-data.mjs` +
 * `class-features-data.mjs`. The data modules are the source of truth; the packs
 * are a build artifact and must never be hand-edited.
 *
 *   node dev/packs/build-packs.mjs
 *
 * Uses `classic-level` from the FoundryVTT install (no npm install needed).
 *
 * Schemas verified live against FVTT 14.364 / dnd5e 5.3.0:
 *   ItemGrant   { items: [{uuid, optional}], optional, spell }
 *   ItemChoice  { allowDrops, choices: {<lvl>:{count}}, pool: [{uuid}], restriction, type }
 *   ScaleValue  { identifier, type, scale: {<lvl>: <entry>} }   dice entry = {number, faces}
 *   Trait       { allowReplacements, choices: [{count, pool}], grants, mode }
 *   feat.system { type:{value,subtype}, requirements, uses:{max,spent,recovery[]}, activities{} }
 */

import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

import {
  CLASSES, PROFESSIONS, SZTUCZKA, PROFESJA, PROFESJA_LUB_SZTUCZKA, POCHODZENIE
} from "../../scripts/config/classes-data.mjs";
import {
  CLASS_FEATURES, CHOICE_POOLS, FEATURE_REPEATS, resolveGrant
} from "../../scripts/config/class-features-data.mjs";
import { CHEMIA, chemiaItemData } from "../../scripts/config/chemia-data.mjs";
import { SZTUCZKI, sztuczkaItemData } from "../../scripts/config/sztuczki-data.mjs";
import { ORIGIN_ABILITIES, originAbilityItemData, POCHODZENIA, pochodzenieItemData, abilitiesOf, attrBonus } from "../../scripts/config/pochodzenia-data.mjs";
import { AMMO_CALIBERS, GRENADE_TYPES } from "../../scripts/config/ammo-data.mjs";
import { WEAPONS, buildWeaponItemData } from "../../scripts/config/weapons-data.mjs";
import { POCHODNIA_VARIANTS, buildPochodniaItemData } from "../../scripts/weapons/pochodnia.mjs";
import { LATARKA_FORMS, buildLatarkaItemData } from "../../scripts/items/latarka.mjs";
import { buildBaterieItemData } from "../../scripts/items/baterie.mjs";
import { GOGLE_VARIANTS, buildGogleItemData } from "../../scripts/items/gogle.mjs";
import { ARMORS, buildArmorItemData } from "../../scripts/config/armor-data.mjs";
import { TOOLKITS, buildToolkitItemData } from "../../scripts/config/toolkits-data.mjs";
import { BESTIARY } from "../../scripts/config/bestiary-data.mjs";
import { BLOOD_TYPES, NEUROSHIMA_CREATURE_TYPES } from "../../scripts/config/creature-types.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(HERE, "../..");
const PACKS_ROOT = path.join(MODULE_ROOT, "packs");

const FOUNDRY_NM = "C:/Program Files/Foundry Virtual Tabletop/resources/app/node_modules";
const require = createRequire(import.meta.url);
const { ClassicLevel } = require(path.join(FOUNDRY_NM, "classic-level"));

const PACK = {
  klasy: "klasy",
  profesje: "profesje",
  features: "zdolnosci-klasowe",
  sztuczki: "sztuczki",
  pochodzenia: "zdolnosci-pochodzenia",
  origins: "pochodzenia",
  lekarstwa: "lekarstwa",
  amunicja: "amunicja",
  granaty: "granaty",
  narzedzia: "narzedzia",
  bestiariusz: "bestiariusz",
  bron: "bron",
  sprzet: "sprzet",
  pancerze: "pancerze"
};

/** Portrait art migrated from Roll20 lives here, one folder per character. */
const CHARACTER_ART = "C:/Users/archo/AppData/Local/FoundryVTT/Data/worlds/output/characters";
const CHARACTER_ART_REL = "worlds/output/characters";

/* -------------------------------------------- */
/*  Deterministic ids                            */
/* -------------------------------------------- */

const ID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Stable 16-char Foundry id derived from a slug, so rebuilds keep UUIDs valid. */
function idFor(kind, slug) {
  const h = createHash("sha1").update(`${MODULE_ID}:${kind}:${slug}`).digest();
  let out = "";
  for (let i = 0; i < 16; i++) out += ID_CHARS[h[i] % ID_CHARS.length];
  return out;
}

const featureUuid = id => `Compendium.${MODULE_ID}.${PACK.features}.Item.${idFor("feature", id)}`;
const professionUuid = id => `Compendium.${MODULE_ID}.${PACK.profesje}.Item.${idFor("profession", id)}`;
const sztuczkaUuid = id => `Compendium.${MODULE_ID}.${PACK.sztuczki}.Item.${idFor("sztuczka", id)}`;
const originAbilityUuid = id => `Compendium.${MODULE_ID}.${PACK.pochodzenia}.Item.${idFor("origin-ability", id)}`;

/** Every Sztuczka, as an ItemChoice pool. Requirements stay the player's problem: */
/* dnd5e cannot express "ZRC 15+" as an advancement restriction, so the pool offers */
/* all 53 and `system.requirements` prints the gate on the item itself. */
const SZTUCZKI_POOL = Object.keys(SZTUCZKI).map(id => ({ uuid: sztuczkaUuid(id) }));

/** Wszystkie 36 zdolności z Pochodzeń — pula dla Speca poz. 5 i Sztuczki `Patriota`. */
const ORIGIN_ABILITIES_POOL = Object.keys(ORIGIN_ABILITIES).map(id => ({ uuid: originAbilityUuid(id) }));

/* -------------------------------------------- */
/*  Helpers                                      */
/* -------------------------------------------- */

const ACTIVATION = { A: "action", B: "bonus", R: "reaction" };

function html(text) {
  return `<p>${String(text ?? "").trim()}</p>`;
}

function iconFor(kind, id) {
  const file = `modules/${MODULE_ID}/icons/${kind}/${id}.svg`;
  const abs = path.join(MODULE_ROOT, "icons", kind, `${id}.svg`);
  return fs.existsSync(abs) ? file : "icons/svg/upgrade.svg";
}

/** Emit a ScaleValue scale map, only where the value changes from the previous level. */
function scaleMap(type, values) {
  const scale = {};
  let prev;
  values.forEach((v, i) => {
    const lvl = i + 1;
    const key = JSON.stringify(v);
    if (key === prev) return;
    prev = key;
    if (v === null) return;          // level not yet reached — leave unset
    if (type === "dice") {
      const [n, faces] = String(v).split("d");
      scale[lvl] = { number: Number(n) || null, faces: Number(faces) };
    } else if (type === "number") {
      scale[lvl] = { value: Number(v) };
    } else {
      scale[lvl] = { value: String(v) };
    }
  });
  return scale;
}

function advancement(type, level, title, configuration, seed) {
  return {
    _id: idFor("adv", seed),
    type,
    configuration,
    value: {},
    level,
    title,
    icon: null
  };
}

/* -------------------------------------------- */
/*  Feature items                                */
/* -------------------------------------------- */

function buildFeature(f) {
  const activities = {};
  // Anything with an action tag or limited uses gets a clickable utility activity,
  // so it can be rolled from the sheet and from the auto-managed hotbar macro.
  if (f.action || f.uses) {
    const aid = idFor("activity", f.id);
    activities[aid] = {
      _id: aid,
      type: "utility",
      name: f.label,
      activation: f.action ? { type: ACTIVATION[f.action], value: 1 } : { type: "special", value: null },
      consumption: f.uses
        ? { targets: [{ type: "itemUses", value: "1", target: "" }] }
        : { targets: [] },
      description: {}
    };
  }

  const owner = f.source === "klasa" ? CLASSES[f.owner] : PROFESSIONS[f.owner];
  const requirements = f.source === "klasa"
    ? `${owner?.label ?? f.owner} ${f.level ?? 1}`
    : (owner?.label ?? f.owner);

  return {
    _id: idFor("feature", f.id),
    name: f.label,
    type: "feat",
    img: iconFor("abilities", f.id),
    system: {
      description: { value: html(f.text), chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      type: { value: "class", subtype: "" },
      requirements,
      properties: [],
      prerequisites: {},
      uses: f.uses
        ? {
            max: String(f.uses.max),
            spent: 0,
            recovery: f.uses.period === "combat"
              ? []                                     // per-combat: handled by class-state.mjs
              : [{ period: f.uses.period, type: "recoverAll" }]
          }
        : { max: "", spent: 0, recovery: [] },
      activities
    },
    flags: {
      [MODULE_ID]: {
        abilityId: f.id,
        source: f.source,
        owner: f.owner,
        level: f.level ?? null,
        hotbar: f.hotbar === true,
        toggle: f.toggle ?? null,
        exclusiveGroup: f.exclusiveGroup ?? null,
        resource: f.resource ?? null,
        requiresState: f.requiresState ?? null,
        oncePerTurn: f.oncePerTurn === true,
        legacyAbilityKey: f.legacyAbilityKey ?? null
      }
    },
    _key: null   // filled by the writer
  };
}

/* -------------------------------------------- */
/*  Profession (subclass) items                  */
/* -------------------------------------------- */

function buildProfession(pid, p) {
  const parent = CLASSES[p.klasa];
  const advancements = [];

  // Ability choices at the parent class's profession levels.
  //
  // Levels marked "Zdolność z profesji / Sztuczka" are a single either/or pick, not
  // two grants. The subclass owns that choice; `buildClass` deliberately emits
  // nothing at those levels (see below). At those levels the pool is the profession's
  // own abilities PLUS every Sztuczka, which is exactly what the either/or means.
  for (const lvl of parent.professionLevels) {
    const entry = parent.levels[lvl] ?? [];
    const orSztuczka = entry.includes(PROFESJA_LUB_SZTUCZKA);

    advancements.push(advancement("ItemChoice", lvl,
      orSztuczka ? "Zdolność z profesji / Sztuczka" : "Zdolność z profesji", {
        allowDrops: orSztuczka,
        choices: { [lvl]: { count: 1 } },
        pool: orSztuczka
          ? [...p.abilities.map(a => ({ uuid: featureUuid(a) })), ...SZTUCZKI_POOL]
          : p.abilities.map(a => ({ uuid: featureUuid(a) })),
        restriction: orSztuczka ? { type: "feat" } : {},
        type: "feat"
      }, `${pid}-choice-${lvl}`));
  }

  return {
    _id: idFor("profession", pid),
    name: p.label,
    type: "subclass",
    img: iconFor("profesje", pid),
    system: {
      description: {
        value: html(`Profesja klasy ${parent.label}. Zdolności do wyboru na poziomach `
          + `${parent.professionLevels.join(", ")}.`),
        chat: ""
      },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      identifier: pid,
      classIdentifier: p.klasa,
      advancement: advancements,
      spellcasting: { progression: "none", ability: "" }
    },
    flags: { [MODULE_ID]: { professionId: pid, klasa: p.klasa } },
    _key: null
  };
}

/* -------------------------------------------- */
/*  Class items                                  */
/* -------------------------------------------- */

function buildClass(cid, c) {
  const adv = [];

  // Hit dice — PW itself is overridden in actors/pw.mjs, but HD drives KW spending.
  adv.push(advancement("HitPoints", 1, "Kość Wytrzymałości", {}, `${cid}-hp`));

  // Level 1 proficiencies.
  const grants = [
    ...c.saves.map(s => `saves:${s}`),
    ...c.weapons.map(w => `weapon:${w}`),
    ...c.armor.map(a => `armor:${a}`)
  ];
  if (c.tools?.fixed) grants.push(...c.tools.fixed.map(t => `tool:${t}`));

  const traitChoices = [{ count: c.skills.count, pool: c.skills.pool.map(s => `skills:${s}`) }];
  if (c.tools?.choice) {
    traitChoices.push({ count: c.tools.choice.count, pool: c.tools.choice.pool.map(t => `tool:${t}`) });
  }
  adv.push(advancement("Trait", 1, "Biegłości", {
    allowReplacements: false, grants, choices: traitChoices, mode: "default"
  }, `${cid}-traits`));

  // Scale values.
  for (const [key, sv] of Object.entries(c.scale ?? {})) {
    adv.push(advancement("ScaleValue", 1, sv.label, {
      identifier: key,
      type: sv.type,
      distance: { units: "" },
      scale: scaleMap(sv.type, sv.values)
    }, `${cid}-scale-${key}`));
  }

  // Subclass pick at the first profession level.
  adv.push(advancement("Subclass", c.professionLevels[0], "Profesja", {}, `${cid}-subclass`));

  // Per-level grants.
  for (const [lvlStr, ids] of Object.entries(c.levels)) {
    const level = Number(lvlStr);
    const fixed = [];

    for (const id of ids) {
      if (id === PROFESJA) continue;                // handled by the Subclass advancement

      // Spec poz. 5: druga zdolność z listy własnego Pochodzenia. Pula to wszystkie 36,
      // bo advancement nie umie jej zawęzić do backgroundu, który postać już nosi.
      if (id === POCHODZENIE) {
        adv.push(advancement("ItemChoice", level, "Zdolność z Twojego Pochodzenia", {
          allowDrops: true,
          choices: { [level]: { count: 1 } },
          pool: ORIGIN_ABILITIES_POOL,
          restriction: { type: "feat" },
          type: "feat"
        }, `${cid}-${level}-pochodzenie`));
        continue;
      }

      // "Zdolność z profesji / Sztuczka" is ONE either/or pick. The subclass owns it
      // (see buildProfession); emitting a class-side choice here too would hand the
      // player two grants at that level.
      if (id === PROFESJA_LUB_SZTUCZKA) continue;

      if (id === SZTUCZKA) {
        adv.push(advancement("ItemChoice", level, "Sztuczka", {
          allowDrops: true,
          choices: { [level]: { count: 1 } },
          pool: SZTUCZKI_POOL,
          restriction: { type: "feat" },
          type: "feat"
        }, `${cid}-${level}-sztuczka`));
        continue;
      }

      const g = resolveGrant(id);
      if (!g) throw new Error(`${cid} L${level}: unresolved grant "${id}"`);

      if (g.type === "feature") { fixed.push(id); continue; }

      if (g.type === "featureWithChoice") {
        fixed.push(id);
        adv.push(advancement("ItemChoice", level, `${g.feature.label} — wybierz jedną`, {
          allowDrops: false,
          choices: { [level]: { count: 1 } },
          pool: g.pool.map(o => ({ uuid: featureUuid(o) })),
          restriction: {}, type: "feat"
        }, `${cid}-${level}-${id}-choice`));
        continue;
      }

      if (g.type === "repeat") {
        if (g.kind === "upgrade") continue;                   // no item; base feature changes
        if (g.kind === "trait") {
          adv.push(advancement("Trait", level, "Specjalizacja", {
            allowReplacements: false, grants: [],
            choices: [{ count: 1, pool: CLASSES[cid].skills.pool.map(s => `skills:${s}`) }],
            mode: "expertise"
          }, `${cid}-${level}-${id}`));
          continue;
        }
        // "Wyjadacz (2)", "Mój wróg (3)" — the rulebook's own naming for a repeat pick.
        const baseLabel = CLASS_FEATURES[g.repeatOf]?.label ?? g.repeatOf;
        const ordinal = /-(\d+)$/.exec(id)?.[1];
        adv.push(advancement("ItemChoice", level,
          ordinal ? `${baseLabel} (${ordinal})` : baseLabel, {
            allowDrops: false,
            choices: { [level]: { count: 1 } },
            pool: (g.pool ?? []).map(o => ({ uuid: featureUuid(o) })),
            restriction: {}, type: "feat"
          }, `${cid}-${level}-${id}`));
        continue;
      }

      if (g.type === "choice") {
        adv.push(advancement("ItemChoice", level, id, {
          allowDrops: false,
          choices: { [level]: { count: 1 } },
          pool: g.pool.map(o => ({ uuid: featureUuid(o) })),
          restriction: {}, type: "feat"
        }, `${cid}-${level}-${id}`));
      }
    }

    if (fixed.length) {
      adv.push(advancement("ItemGrant", level, "Zdolności klasowe", {
        items: fixed.map(id => ({ uuid: featureUuid(id), optional: false })),
        optional: false,
        spell: null
      }, `${cid}-${level}-grant`));
    }
  }

  return {
    _id: idFor("class", cid),
    name: c.label,
    type: "class",
    img: iconFor("klasy", cid),
    system: {
      description: {
        value: html(`Klasa Neuroshimy. Ulubiona Cecha Bazowa: ${c.primaryAbility.toUpperCase()}. `
          + `Wymaganie wstępne: ${c.requirement.value}+.`),
        chat: ""
      },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      identifier: cid,
      levels: 1,
      hd: { denomination: c.pw.hd, spent: 0, additional: "" },
      primaryAbility: { value: [c.primaryAbility], all: false },
      advancement: adv,
      startingEquipment: [],
      spellcasting: { progression: "none", ability: "", preparation: {} },
      properties: []
    },
    flags: {
      [MODULE_ID]: {
        classId: cid,
        pw: c.pw,
        professionLevels: c.professionLevels,
        requirement: c.requirement,
        multiclass: c.multiclass,
        startingEquipment: c.startingEquipment
      }
    },
    _key: null
  };
}

/* -------------------------------------------- */
/*  Lekarstwa / chemia / narkotyki                */
/* -------------------------------------------- */

/**
 * Leki i używki są zwykłymi consumable'ami, więc dziedziczą cały natywny
 * pipeline przedmiotu. `chemia-data.mjs` trzyma treść; tutaj tylko stemplujemy
 * deterministyczne id. Materiały pirotechniczne wychodzą z tego samego katalogu
 * jako `loot`.
 *
 * Aktywność „Zażyj" i wszystkie Aktywne Efekty jadą razem z dokumentem — mapa
 * `activities` przechodzi poprawnie, o ile siedzi pod `system.activities`
 * (weryfikowane na żywo w dnd5e 5.3; na najwyższym poziomie dokumentu jest
 * cicho wyrzucana, bo nie jest polem schematu). Dzięki temu przedmiot z packa
 * działa od razu po przeciągnięciu, bez kroku „dobuduj aktywności".
 */
function buildChemia(key) {
  return { ...chemiaItemData(key, { _id: idFor("medicine", key) }), _key: null };
}

/* -------------------------------------------- */
/*  Sztuczki                                     */
/* -------------------------------------------- */

/**
 * Sztuczki to opisowe `feat`y: treść, wymagania i jawna informacja o tym, czy
 * system cokolwiek z nich egzekwuje (patrz `sztuczki-data.mjs`).
 */
function buildSztuczka(key) {
  return { ...sztuczkaItemData(key, { _id: idFor("sztuczka", key) }), _key: null };
}

/* -------------------------------------------- */
/*  Pochodzenia i ich zdolności                  */
/* -------------------------------------------- */

function buildOriginAbility(key) {
  const doc = originAbilityItemData(key, { _id: idFor("origin-ability", key) });
  return { ...doc, img: iconFor("abilities", key), _key: null };
}

/**
 * Pochodzenie jako natywny `background`.
 *
 * Reguły 2024 dają background dokładnie to, czego Neuroshima chce od Pochodzenia:
 * podbicie Cech (`AbilityScoreImprovement.fixed`, `points: 0` — gracz nie rozdziela
 * nic sam) i jedną zdolność z zamkniętej listy (`ItemChoice`). Poziom 0, bo dnd5e
 * ustawia `level: 1` tylko klasom i podklasom.
 *
 * `allowDrops: true`, bo tę samą pulę trzeba móc dobrać drugi raz — Spec na poz. 5
 * i Sztuczka `Patriota` dokładają kolejne zdolności z listy własnego Pochodzenia,
 * a advancement nie potrafi warunkować puli od tego, co postać już ma.
 */
function buildPochodzenie(key) {
  const doc = pochodzenieItemData(key, { _id: idFor("origin", key) });

  doc.system.advancement = [
    advancement("AbilityScoreImprovement", 0, "Premia do Cech Bazowych", {
      cap: 1, fixed: attrBonus(key), locked: [], points: 0
    }, `${key}-asi`),
    advancement("ItemChoice", 0, "Zdolność z Pochodzenia", {
      allowDrops: true,
      choices: { 0: { count: 1 } },
      pool: abilitiesOf(key).map(a => ({ uuid: originAbilityUuid(a.id) })),
      restriction: { type: "feat" },
      type: "feat"
    }, `${key}-ability`)
  ];

  const icon = iconFor("pochodzenia", key);
  return { ...doc, img: icon.includes(MODULE_ID) ? icon : doc.img, _key: null };
}

/* -------------------------------------------- */
/*  Amunicja / granaty / narzędzia               */
/* -------------------------------------------- */

/**
 * Amunicja — luźne naboje jako `consumable` typu `ammo`, po jednej sztuce.
 * `subtype` to id kalibru, czyli dokładnie ten sam klucz, którym magazynki i
 * broń dobierają amunicję (`flags.<mod>.mag.ammoType`), więc przedmiot z packa
 * jest natychmiast rozpoznawany przez `actors/ammo-inventory.mjs`.
 */
function buildAmmo(c) {
  const desc = [
    `<p><strong>Kategoria:</strong> ${c.category}</p>`,
    c.formula ? `<p><strong>Obrażenia:</strong> ${c.formula} (${c.type})</p>` : "",
    c.aoe ? `<p><strong>Obszar:</strong> ${c.aoe}</p>` : "",
    c.note ? `<p>${c.note}</p>` : ""
  ].join("");

  return {
    _id: idFor("ammo", c.id),
    name: c.label,
    type: "consumable",
    img: `modules/${MODULE_ID}/icons/ammo/${c.icon}`,
    system: {
      description: { value: desc, chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      type: { value: "ammo", subtype: c.id },
      quantity: 1,
      weight: { value: c.weight ?? 0.02, units: "kg" },
      price: { value: c.price, denomination: "gp" },
      properties: [],
      uses: { max: "", spent: 0, recovery: [], autoDestroy: false },
      activities: {}
    },
    flags: { [MODULE_ID]: { caliber: c.id, availability: c.avail } },
    _key: null
  };
}

/**
 * Granaty, miny i ładunki. Też `ammo`, bo `actors/grenade-inventory.mjs` szuka
 * ich po `system.type.subtype` w GRENADE_MAP i dokłada własny przycisk rzutu —
 * własny typ konsumpcyjny odciąłby je od tego panelu.
 */
function buildGrenade(g) {
  const desc = `<p><strong>Obszar:</strong> ${g.area ?? "—"}</p>`
    + `<p><strong>RO:</strong> ${g.save ?? "—"}</p>`
    + `<p>${g.effect ?? ""}</p>`;

  return {
    _id: idFor("grenade", g.id),
    name: g.label,
    type: "consumable",
    img: `modules/${MODULE_ID}/icons/weapons/${g.icon}`,
    system: {
      description: { value: desc, chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      type: { value: "ammo", subtype: g.id },
      quantity: 1,
      weight: { value: g.weight, units: "kg" },
      price: { value: g.price, denomination: "gp" },
      properties: [],
      uses: { max: "", spent: 0, recovery: [], autoDestroy: false },
      activities: {}
    },
    flags: { [MODULE_ID]: { grenade: g.id, availability: g.avail } },
    _key: null
  };
}

/**
 * Zestawy narzędzi. Kształt itemu pochodzi z `buildToolkitItemData`, żeby pack i
 * `createToolkits()` nie rozjechały się w opisach; tutaj dochodzą deterministyczne
 * id oraz aktywności typu `check` — po jednej na każde ST z tabeli użycia.
 */
function buildToolkit(kit) {
  const base = buildToolkitItemData(kit);
  const activities = {};

  const actions = kit.actions?.length ? kit.actions : [{ name: "Test narzędzi", dc: null }];
  for (const action of actions) {
    const aid = idFor("activity", `tool:${kit.id}:${action.name}`);
    activities[aid] = {
      _id: aid,
      type: "check",
      name: action.dc == null ? action.name : `${action.name} (ST ${action.dc})`,
      activation: { type: "action", value: 1, condition: "" },
      consumption: { targets: [], scaling: { allowed: false } },
      check: {
        ability: kit.ability,
        associated: [kit.id],
        dc: { calculation: "", formula: action.dc == null ? "" : String(action.dc) }
      }
    };
  }

  return {
    ...base,
    _id: idFor("toolkit", kit.id),
    system: { ...base.system, activities },
    _key: null
  };
}

/* -------------------------------------------- */
/*  Broń i pancerze                              */
/* -------------------------------------------- */

/**
 * Broń. Kształt itemu w całości pochodzi z `buildWeaponItemData`, tego samego,
 * którym `createWeapons()` zasila Zbrojownię — pack i aktor nie mogą się
 * rozjechać. Tutaj dochodzi wyłącznie deterministyczne id.
 *
 * `system.activities` zostaje puste celowo: tryby ognia buduje na żywo
 * `weapons/fire-modes.mjs` z właściwości broni, więc zapisanie ich do packa
 * zamroziłoby wynik i podwoiło aktywności po pierwszym przeliczeniu.
 */
function buildWeapon(w) {
  return { ...buildWeaponItemData(w), _id: idFor("weapon", w.id), _key: null };
}

/**
 * Pochodnia (torch) — not a `WEAPONS` catalog entry, so it doesn't flow through
 * `buildWeapon()` above. `buildPochodniaItemData` is the same shared builder
 * `weapons/pochodnia.mjs`'s own `createPochodniaItem` calls at runtime, so the
 * compendium copy and a freshly-scripted one can't drift apart. Activities are
 * empty here for the identical reason `buildWeapon()`'s comment gives for fire
 * modes — `ensurePochodniaActivities()` backfills Zapal/Zgaś the moment this is
 * dragged out of the compendium, via the same `createItem` hook fire-modes.mjs uses.
 */
function buildPochodnia(variantKey) {
  return { ...buildPochodniaItemData(variantKey), _id: idFor("weapon", `pochodnia-${variantKey}`), _key: null };
}

/**
 * Latarka (flashlight) forms and Baterie — same shared-builder discipline as Pochodnia above,
 * `buildLatarkaItemData`/`buildBaterieItemData` are the exact functions `items/latarka.mjs` and
 * `items/baterie.mjs` call at runtime. Live in the `sprzet` pack, not `bron`: a flashlight is
 * equipment first, weapon never — unlike Pochodnia, which stays in `bron` because it genuinely
 * is a weapon (1k4 obuchowe) that happens to also give light. `sprzet` is the general home for
 * utility gear that isn't a `narzedzia`-style skill-check toolkit either (2026-09-04).
 */
function buildLatarka(formKey) {
  return { ...buildLatarkaItemData(formKey), _id: idFor("equipment", `latarka-${formKey}`), _key: null };
}
function buildBaterie() {
  return { ...buildBaterieItemData({ quantity: 1 }), _id: idFor("loot", "baterie"), _key: null };
}

/**
 * Gogle (NVG/thermal goggles) — same shared-builder discipline, `buildGogleItemData` is the exact
 * function `items/gogle.mjs` calls at runtime. See `PLAN_nvg_thermal.md`; also lives in `sprzet`,
 * same "equipment first" reasoning as Latarka above.
 */
function buildGogle(variantKey) {
  return { ...buildGogleItemData(variantKey), _id: idFor("equipment", `gogle-${variantKey}`), _key: null };
}

/**
 * Pancerze. Jak wyżej — `buildArmorItemData` jest wspólne z `createArmors()`.
 * Efekty aktywne (bonus do KP z akcesoriów, odporność kinetyczna) przychodzą
 * stamtąd bez `_id`, bo tylko builder potrafi nadać im id stabilne między
 * przebudowami; `writePack` wymaga id na każdym efekcie.
 */
function buildArmor(a) {
  const base = buildArmorItemData(a);
  const effects = (base.effects ?? []).map((e, i) => ({
    ...e,
    _id: idFor("armor-effect", `${a.id}.${i}`)
  }));
  return { ...base, _id: idFor("armor", a.id), effects, _key: null };
}

/* -------------------------------------------- */
/*  Bestiariusz — NPC actors                     */
/* -------------------------------------------- */
/**
 * Token footprint per size. Neuroshima's six sizes map 1:1 onto dnd5e's.
 */
const TOKEN_SIZE = { tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 3, grg: 4 };

function abilityMod(score) {
  return Math.floor((Number(score ?? 10) - 10) / 2);
}

/**
 * Roll20 exported character folders with a hex-escaped, underscore-joined name
 * ("009_-__C5_BBo_C5_82nierz_Posterunku" -> "Żołnierz Posterunku"). Decode them
 * once so portraits can be matched to creatures by name.
 */
function decodeArtFolder(folder) {
  const name = folder.replace(/^\d+_-_/, "");
  const utf8 = new TextDecoder("utf8", { fatal: true });

  // The escape and the word separator are the same character, and hex digits
  // are letters, so "_CA" is ambiguous: byte 0xCA, or a space before "CA..."?
  // ("GANGUS_CAPO" is exactly this collision.) UTF-8 resolves it — Roll20 only
  // escaped non-ASCII bytes, so a genuine escape run must decode as valid
  // UTF-8. A lone 0xCA does not; "_C5_BB" ("Ż") does.
  const RUN = /^(?:_[0-9A-F]{2})+/;
  let out = "";
  for (let i = 0; i < name.length;) {
    const run = RUN.exec(name.slice(i))?.[0];
    if (run) {
      const bytes = Buffer.from(run.split("_").filter(Boolean).map(h => parseInt(h, 16)));
      try {
        out += utf8.decode(bytes);
        i += run.length;
        continue;
      } catch {
        // not an escape run after all — fall through and treat "_" as a space
      }
    }
    out += name[i] === "_" ? " " : name[i];
    i++;
  }
  return out;
}

function slugify(s) {
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "");
}

/** Skill -> governing ability, mirroring scripts/config/skills.mjs. */
const SKILL_ABILITY = {
  akr: "dex", atl: "str", his: "int", int: "wis", med: "int", osz: "cha",
  prc: "wis", per: "cha", poj: "wis", prz: "int", skr: "dex", sur: "wis",
  sle: "int", tch: "int", tre: "wis", wys: "cha", zas: "cha", zwi: "dex"
};

/**
 * Art folders whose name differs from the Bestiariusz name by more than
 * punctuation. Listed explicitly rather than fuzzy-matched: a wrong portrait is
 * worse than a missing one, and there are few enough to enumerate.
 * Keys are creature ids from bestiary-data.mjs.
 */
const PORTRAIT_ALIASES = {
  juggernaut: "Jaggernaut",                        // misspelled at migration
  kidnaper: "Kidnapper",
  "gangus-kapo": "GANGUS CAPO",                    // capo/kapo
  cywil: "Cywil 2",
  "generacja-i-nocny-ghul": "NOCNY GHUL",          // art predates the Generacja naming
  "generacja-ii-genotyp-wilczy": "WILKOLUD",
  mobsprzet: "Mobsprzęt Karabin",
};

/** Build slug -> "worlds/output/characters/<folder>" once. */
function buildArtIndex() {
  const index = new Map();
  if (!fs.existsSync(CHARACTER_ART)) return index;
  for (const folder of fs.readdirSync(CHARACTER_ART)) {
    // Roll20 exported portraits as either .png or .jpg.
    const file = ["avatar.png", "avatar.jpg", "avatar.jpeg", "avatar.webp"]
      .find(f => fs.existsSync(path.join(CHARACTER_ART, folder, f)));
    if (!file) continue;
    const key = slugify(decodeArtFolder(folder));
    if (!index.has(key)) index.set(key, `${CHARACTER_ART_REL}/${folder}/${file}`);
  }
  return index;
}

const ART_INDEX = buildArtIndex();
const artMisses = [];
const tokenSources = { own: [], alias: [], placeholder: [] };
const aliasMisses = [];

const FVTT_DATA = "C:/Users/archo/AppData/Local/FoundryVTT/Data";

/**
 * Optional map of creature id -> token image path, relative to the Foundry data
 * root. Lets a creature borrow art that already lives in the data directory
 * (e.g. `systems/dnd5e/tokens/beast/DireWolf.webp`) without copying the file.
 * Edit `tokens/aliases.json`; missing file is fine.
 */
const TOKEN_ALIASES = (() => {
  const p = path.join(MODULE_ROOT, "tokens", "aliases.json");
  if (!fs.existsSync(p)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    // Allow "//" comment keys so the file can document itself.
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("//")));
  } catch (err) {
    console.error(`  tokens/aliases.json is not valid JSON — ignoring (${err.message})`);
    return {};
  }
})();

/**
 * Find the migrated portrait for a creature.
 *
 * Only the portrait is harvested. The sibling `token.png` is deliberately
 * ignored everywhere: those are circular crops of the portrait made for Roll20,
 * where tokens never rotate. FoundryVTT rotates tokens on movement, which
 * leaves them upside down and unreadable.
 */
function portraitFor(c) {
  const candidates = [
    PORTRAIT_ALIASES[c.id],
    c.name,
    c.name.replace(/\(.*?\)/g, ""),               // "TECHMORWA (MALUTKA)" -> "TECHMORWA"
    c.id.replace(/-/g, " ")
  ].filter(Boolean);

  for (const cand of candidates) {
    const key = slugify(cand);
    if (!key) continue;
    if (ART_INDEX.has(key)) return ART_INDEX.get(key);
    // "BIT-BOYS" vs folder "BIT-BOY" — tolerate a trailing plural.
    if (key.endsWith("s") && ART_INDEX.has(key.slice(0, -1))) return ART_INDEX.get(key.slice(0, -1));
  }
  artMisses.push(c.name);
  return null;
}

/**
 * Purpose-made top-down token art, dropped in by hand at `tokens/<id>.webp`.
 *
 * Its presence flips the token from the portrait stopgap to the real thing:
 * rotation is unlocked (top-down art is *meant* to rotate — that is the whole
 * reason the Roll20 circular crops were discarded) and the dynamic ring comes
 * off, since proper token art carries its own silhouette.
 *
 * @returns {string|null} path relative to the Foundry data root
 */
function tokenArtFor(c) {
  // 1. Purpose-made art, dropped into tokens/<id>.webp. Deliberately the
  //    HIGHEST priority: the asset pipeline can drop files in and they take
  //    effect on the next build with no cleanup. If aliases outranked it, a
  //    freshly delivered token would be silently ignored.
  for (const ext of ["webp", "png"]) {
    const rel = `tokens/${c.id}.${ext}`;
    if (fs.existsSync(path.join(MODULE_ROOT, rel))) {
      return { src: `modules/${MODULE_ID}/${rel}`, source: "own" };
    }
  }

  // 2. Borrowed art already present in the Foundry data dir. The dnd5e system
  //    ships 662 Forgotten Adventures tokens whose licence permits use inside
  //    Foundry but forbids redistribution — referencing the path is legitimate
  //    where copying the file would not be.
  const alias = TOKEN_ALIASES[c.id];
  if (alias) {
    if (fs.existsSync(path.join(FVTT_DATA, alias))) return { src: alias, source: "alias" };
    aliasMisses.push(`${c.id} -> ${alias}`);
  }

  // 3. Generated stand-in (dev/icons/gen_token_placeholders.py). Obviously fake,
  //    but correctly sized and with a visible facing notch, so encounters can be
  //    built and rotation tested before the real assets land.
  const ph = `tokens/_placeholder/${c.id}.webp`;
  if (fs.existsSync(path.join(MODULE_ROOT, ph))) {
    return { src: `modules/${MODULE_ID}/${ph}`, source: "placeholder" };
  }

  return null;
}

function loreHtml(c) {
  const p = [];
  const add = (label, text) => { if (text) p.push(`<p><strong>${label}.</strong> ${text}</p>`); };
  add("Występowanie", c.lore.wystepowanie);
  add("Wygląd", c.lore.wyglad);
  add("Informacje", c.lore.informacje);
  add("Taktyka", c.lore.taktyka);
  return p.join("\n");
}

/**
 * Attack activity for a Bestiariusz action.
 *
 * The rulebook prints an explicit to-hit ("+4"), not an ability + proficiency
 * expression, so `attack.flat = true` — otherwise dnd5e would add the creature's
 * ability modifier on top and every monster would hit harder than written.
 */
function attackActivity(c, atk) {
  const aid = idFor("activity", `${c.id}.${atk.id}`);
  const melee = atk.kind === "mwak";
  const dmg = atk.damage ?? {};
  const parts = [];

  if (dmg.formula) {
    const m = /^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/.exec(dmg.formula.trim());
    if (m) {
      parts.push({
        number: Number(m[1]), denomination: Number(m[2]),
        bonus: m[3] ?? "", types: dmg.type ? [dmg.type] : [],
        custom: { enabled: false, formula: "" },
        scaling: { mode: "", number: null, formula: "" }
      });
    } else {
      // multi-die riders like "2d8 + 2d6 + 4" — keep the literal formula
      parts.push({
        number: null, denomination: null, bonus: "",
        types: dmg.type ? [dmg.type] : [],
        custom: { enabled: true, formula: dmg.formula },
        scaling: { mode: "", number: null, formula: "" }
      });
    }
  } else if (dmg.avg) {
    // flat damage, no dice ("Obrażenia: 4 kłute")
    parts.push({
      number: null, denomination: null, bonus: "",
      types: dmg.type ? [dmg.type] : [],
      custom: { enabled: true, formula: String(dmg.avg) },
      scaling: { mode: "", number: null, formula: "" }
    });
  }

  return {
    _id: aid,
    type: "attack",
    name: atk.name,
    activation: { type: atk.section === "legendary" ? "legendary" : "action", value: 1, condition: "", override: false },
    consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: false },
    description: { chatFlavor: "" },
    duration: { concentration: false, value: "", units: "", special: "", override: false },
    effects: [],
    range: {
      value: atk.range != null ? String(atk.reach) : (atk.reach != null ? String(atk.reach) : ""),
      long: atk.range != null ? String(atk.range) : "",
      units: "m", special: "", override: true
    },
    target: {
      template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "" },
      affects: { count: "1", type: "creature", choice: false, special: "" },
      prompt: true, override: false
    },
    uses: { spent: 0, max: "", recovery: [] },
    attack: {
      ability: "", bonus: String(atk.bonus), critical: { threshold: null },
      flat: true,
      type: { value: melee ? "melee" : "ranged", classification: "natural" }
    },
    damage: { critical: { bonus: "" }, includeBase: false, parts },
    sort: 0
  };
}

/** Save activity, for abilities phrased as "RO na <Cecha> o ST N". */
function saveActivity(c, feat, auto) {
  const aid = idFor("activity", `${c.id}.${feat.id}`);
  return {
    _id: aid,
    type: "save",
    name: feat.name,
    activation: { type: auto.activation === "special" ? "special" : (auto.activation ?? "action"), value: null, condition: "", override: false },
    consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: false },
    description: { chatFlavor: "" },
    duration: { concentration: false, value: "", units: "", special: "", override: false },
    effects: [],
    range: { value: "", units: "", special: "", override: false },
    target: {
      template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "" },
      affects: { count: "", type: "creature", choice: false, special: "" },
      prompt: true, override: false
    },
    uses: { spent: 0, max: "", recovery: [] },
    save: { ability: auto.ability, dc: { calculation: "", formula: String(auto.dc) } },
    damage: { onSave: "none", parts: [] },
    sort: 0
  };
}

/** Polish condition names, mirroring scripts/config/conditions.mjs. */
const CONDITION_LABEL = {
  grappled: "Pochwycenie", restrained: "Unieruchomienie", prone: "Powalenie",
  blinded: "Oślepienie", frightened: "Przerażenie", poisoned: "Zatrucie",
  stunned: "Ogłuszenie", incapacitated: "Obezwładnienie", unconscious: "Nieprzytomność",
  deafened: "Ogłuchnięcie", paralyzed: "Sparaliżowanie", charmed: "Zauroczenie",
  invisible: "Niewidoczność"
};

/**
 * An ActiveEffect that applies a status, so the chat card offers it on the
 * target rather than the GM applying it from the token HUD by hand.
 *
 * dnd5e never applies these automatically — the damage/save card renders an
 * "apply effect" control and waits for a click. That is already the
 * GM-in-the-loop shape the house doctrine asks for, at no code cost.
 */
function conditionEffect(c, entry, spec, kind) {
  const label = CONDITION_LABEL[spec.condition] ?? spec.condition;
  const notes = [];
  if (spec.escapeDC) notes.push(`Wyzwolenie się: ST ${spec.escapeDC}.`);
  if (spec.maxSize) notes.push(`Tylko cel rozmiaru ${spec.maxSize === "med" ? "średniego" : spec.maxSize} lub mniejszego.`);

  return {
    _id: idFor("bestiary-effect", `${c.id}.${entry.id}.${spec.condition}`),
    name: label,
    img: `systems/dnd5e/icons/svg/statuses/${spec.condition}.svg`,
    changes: [],
    statuses: [spec.condition],
    disabled: false,
    transfer: false,          // applies to the target, not to the creature itself
    duration: {},
    description: notes.join(" "),
    flags: {
      [MODULE_ID]: {
        bestiary: { creature: c.id, entryId: entry.id, trigger: kind, ...spec }
      }
    }
  };
}

/**
 * Every Bestiariusz action becomes a `feat` carrying an activity, not a
 * `weapon`. Natural attacks are not manufactured weapons: routing claws and
 * bites through the weapon pipeline would subject them to jams.mjs,
 * magazine.mjs and melee-degradation.mjs, none of which apply to a claw. It
 * also sidesteps `weaponTypes`, which this module has restricted to the seven
 * manufactured Neuroshima categories with no "natural" among them.
 */
function buildBestiaryItem(c, entry, kind) {
  const isAttack = kind === "attack";
  const activities = {};
  const effects = [];

  if (isAttack) {
    const act = attackActivity(c, entry);
    if (entry.onHit?.condition) {
      const eff = conditionEffect(c, entry, entry.onHit, "onHit");
      effects.push(eff);
      act.effects = [{ _id: eff._id }];
    }
    activities[act._id] = act;
  } else if (entry.automation?.kind === "save") {
    const act = saveActivity(c, entry, entry.automation);
    if (entry.automation.onFail?.condition) {
      const eff = conditionEffect(c, entry, entry.automation.onFail, "onFail");
      effects.push(eff);
      act.effects = [{ _id: eff._id }];
    }
    activities[act._id] = act;
  }

  const sectionLabel = {
    traits: "Zdolność", actions: "Akcja", bonus: "Akcja bonusowa",
    reaction: "Reakcja", legendary: "Akcja legendarna"
  }[entry.section] ?? "Zdolność";

  const text = isAttack
    ? [entry.rider ? `<p>${entry.rider}</p>` : ""].join("")
    : `<p>${entry.text}</p>`;

  return {
    _id: idFor("bestiary-item", `${c.id}.${entry.id}`),
    name: entry.name,
    type: "feat",
    img: "icons/svg/upgrade.svg",
    system: {
      description: { value: text, chat: "" },
      source: { custom: "Neuroshima RPG — Bestiariusz", rules: "2024" },
      type: { value: "monster", subtype: "" },
      requirements: sectionLabel,
      properties: [],
      prerequisites: {},
      uses: { max: "", spent: 0, recovery: [] },
      activities
    },
    effects,
    flags: {
      [MODULE_ID]: {
        bestiary: {
          creature: c.id,
          entryId: entry.id,
          section: entry.section,
          automation: entry.automation ?? null,
          onHit: isAttack ? (entry.onHit ?? null) : null
        }
      }
    }
  };
}

function buildNpc(c) {
  const _id = idFor("bestiary", c.id);
  const dexMod = abilityMod(c.abilities?.dex);
  const pb = c.pb ?? 2;

  // --- abilities + saves -------------------------------------------------
  const abilities = {};
  for (const key of ["str", "dex", "con", "int", "wis", "cha"]) {
    const value = c.abilities?.[key] ?? 10;
    const entry = { value, proficient: 0, bonuses: { check: "", save: "" } };
    const printed = c.saves?.[key];
    if (printed != null) {
      entry.proficient = 1;
      // The rulebook prints a save total. Where it disagrees with
      // mod + PB, carry the difference as a bonus rather than silently
      // shipping a save that doesn't match the book.
      const delta = printed - (abilityMod(value) + pb);
      if (delta !== 0) entry.bonuses.save = String(delta);
    }
    abilities[key] = entry;
  }

  // --- skills ------------------------------------------------------------
  const skills = {};
  for (const [key, printed] of Object.entries(c.skills ?? {})) {
    const ability = SKILL_ABILITY[key] ?? "int";
    const mod = abilityMod(c.abilities?.[ability]);
    let value = 1;
    if (printed === mod + 2 * pb) value = 2;              // expertise
    else if (printed === mod) value = 0;
    const entry = { value, ability, bonuses: { check: "", passive: "" } };
    const delta = printed - (mod + value * pb);
    if (delta !== 0) entry.bonuses.check = String(delta);
    skills[key] = entry;
  }

  // --- senses ------------------------------------------------------------
  const senseNotes = [];
  if (c.senses?.termowizja) senseNotes.push(`Termowizja ${c.senses.termowizja} m`);
  for (const [k, q] of Object.entries(c.senseQualifiers ?? {})) senseNotes.push(`${k}: ${q}`);

  // Every trait and action becomes an item. Ones the automation layer didn't
  // claim still carry their rulebook text, so the sheet is complete even where
  // nothing is mechanised.
  const items = [
    ...c.attacks.map(a => buildBestiaryItem(c, a, "attack")),
    ...c.features.map(f => buildBestiaryItem(c, f, "feature"))
  ];

  const art = portraitFor(c);
  const token = tokenArtFor(c);
  const tokenArt = token?.src ?? null;
  const blood = BLOOD_TYPES[c.blood];
  if (token) tokenSources[token.source].push(c.id);

  const actor = {
    _id,
    name: c.name,
    type: "npc",
    img: art ?? "icons/svg/mystery-man.svg",
    system: {
      abilities,
      skills,
      attributes: {
        ac: { flat: c.ac ?? 10, calc: "flat", formula: "" },
        hp: { value: c.hp.avg, max: c.hp.avg, temp: 0, tempmax: 0, formula: c.hp.formula ?? "" },
        // dnd5e adds the Dex modifier itself; the book prints the total.
        init: { ability: "", bonus: String((c.initiative ?? 0) - dexMod), roll: { min: null, max: null, mode: 0 } },
        movement: {
          walk: c.speed?.walk ?? 0, climb: c.speed?.climb ?? 0, swim: c.speed?.swim ?? 0,
          fly: c.speed?.fly ?? 0, burrow: c.speed?.burrow ?? 0,
          units: "m", hover: false
        },
        // dnd5e 5.3 nests these under `ranges`; the flat keys on the shipped
        // 2014 monster packs are legacy data that gets migrated on load. Write
        // the canonical shape so nothing depends on that migration.
        senses: {
          ranges: {
            darkvision: c.senses?.darkvision ?? 0,
            blindsight: c.senses?.blindsight ?? 0,
            tremorsense: c.senses?.tremorsense ?? 0,
            truesight: 0
          },
          units: "m",
          special: senseNotes.join("; ")
        }
      },
      details: {
        biography: { value: loreHtml(c), public: "" },
        // Siła Przeciwnika lives here: it is the number the GM budgets
        // encounters with. The proficiency bonus dnd5e would derive from it is
        // overridden back to the rulebook value by actors/sp.mjs.
        cr: c.sp ?? 0,
        type: {
          value: NEUROSHIMA_CREATURE_TYPES[c.creatureType] ? c.creatureType : "",
          subtype: c.typeNote ?? "",
          swarm: c.creatureType === "rojZwierzat" ? (c.size ?? "") : "",
          custom: ""
        }
      },
      traits: {
        size: c.size ?? "med",
        dr: { value: c.resistances ?? [], bypasses: [], custom: "" },
        di: { value: c.immunities ?? [], bypasses: [], custom: "" },
        dv: { value: c.vulnerabilities ?? [], bypasses: [], custom: "" },
        ci: { value: c.conditionImmunities ?? [], custom: "" }
      },
      resources: {
        legact: { max: c.features.some(f => f.section === "legendary") ? 3 : 0, spent: 0 },
        legres: { max: 0, spent: 0 },
        lair: { value: false, initiative: null, inside: false }
      }
    },
    prototypeToken: {
      name: c.name,
      displayName: 20,
      actorLink: false,
      width: TOKEN_SIZE[c.size] ?? 1,
      height: TOKEN_SIZE[c.size] ?? 1,
      // Roll20 token art is a circular crop of the portrait, and FVTT rotates
      // tokens, so it is deliberately never used. With real top-down art the
      // token behaves normally; without it, the portrait stands in inside a
      // dynamic ring with rotation locked so it never renders upside down.
      lockRotation: !tokenArt,
      rotation: 0,
      disposition: -1,
      texture: {
        src: tokenArt ?? art ?? "icons/svg/mystery-man.svg",
        tint: "#ffffff", scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5,
        fit: "contain", alphaThreshold: 0.75
      },
      ring: {
        enabled: !tokenArt,
        colors: { ring: null, background: null },
        effects: 1,
        subject: { scale: 1, texture: null }
      },
      sight: {
        enabled: true, range: c.senses?.darkvision ?? 0, angle: 360,
        visionMode: "basic", color: null, attenuation: 0.1, saturation: 0, brightness: 0
      },
      // Termowizja has no slot in the dnd5e senses schema, so it lives on the
      // token as a real canvas detection mode (config/detection-termowizja.mjs).
      detectionModes: c.senses?.termowizja
        ? [{ id: "neuroshimaTermowizja", enabled: true, range: c.senses.termowizja }]
        : [],
      flags: blood ? { splatter: { bloodColor: blood.color } } : {}
    },
    items: items.map(i => i._id),
    effects: [],
    folder: idFor("bestiary-folder", c.creatureType ?? "inne"),
    sort: (c.sp ?? 0) * 1000,
    ownership: { default: 0 },
    flags: {
      [MODULE_ID]: {
        bestiary: {
          id: c.id,
          sp: c.sp,
          pb: c.pb,
          blood: c.blood,
          morale: c.morale ?? null,
          usesZranienie: c.usesZranienie,
          damageThreshold: c.damageThreshold ?? null,
          failureThreshold: c.failureThreshold ?? null,
          gear: c.gear ?? null,
          carry: c.carry ?? null,
          overlay: c.overlay,
          randomized: c.randomized,
          // Only purpose-made art counts as done. Borrowed and generated art
          // both still want replacing, and this is how you find them:
          //   game.actors.filter(a => a.getFlag(MODULE_ID,"bestiary.tokenArtPending"))
          tokenArtPending: token?.source !== "own",
          tokenArtSource: token?.source ?? "portrait"
        }
      }
    }
  };

  return { actor, items };
}

/* -------------------------------------------- */
/*  Writer                                       */
/* -------------------------------------------- */

/**
 * Write an Item pack.
 *
 * Active Effects do NOT ride inside the item document. `effects` is a
 * *hierarchical* field (`EmbeddedCollectionField.hierarchical === true`, see
 * `common/data/fields.mjs`), and Foundry gives every hierarchical field its own
 * key prefix — the same reason `writeActorPack` splits `!actors.items!` out of
 * the actor. An inline `effects: [{...}]` array is silently read back as empty,
 * which is exactly how the chemia items first shipped with no effects at all.
 *
 *   !items!<itemId>
 *   !items.effects!<itemId>.<effectId>
 *
 * and the item's own `effects` field holds ids, not documents.
 */
async function writePack(name, docs) {
  const dir = path.join(PACKS_ROOT, name);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EBUSY") {
      console.error(
        `\nCannot rewrite packs/${name} — FoundryVTT is running and holds the LevelDB open.`
        + `\nClose FoundryVTT (fully quit the server, not just the browser tab) and re-run.`
        + `\n\nFor content-only tweaks you can instead edit the live compendium from the`
        + `\nbrowser console, which writes to the same database:`
        + `\n  const p = game.packs.get("${MODULE_ID}.${name}"); await p.configure({locked:false});`);
      process.exit(2);
    }
    throw err;
  }
  fs.mkdirSync(dir, { recursive: true });

  const db = new ClassicLevel(dir, { keyEncoding: "utf8", valueEncoding: "json" });
  await db.open();
  const batch = db.batch();
  let effectCount = 0;
  for (const doc of docs) {
    const { _key, effects = [], ...rest } = doc;
    batch.put(`!items!${doc._id}`, { ...rest, effects: effects.map(e => e._id) });
    for (const eff of effects) {
      batch.put(`!items.effects!${doc._id}.${eff._id}`, eff);
      effectCount++;
    }
  }
  await batch.write();
  await db.close();
  console.log(`  ${name.padEnd(20)} ${String(docs.length).padStart(3)} documents`
    + (effectCount ? `, ${effectCount} effects` : ""));
}

/**
 * Actor packs are multi-level: the actor document does not embed its items.
 * Verified against the shipped dnd5e `monsters` pack, whose keys are
 *
 *   !actors!<actorId>
 *   !actors.items!<actorId>.<itemId>
 *   !actors.items.effects!<actorId>.<itemId>.<effectId>
 *   !folders!<folderId>
 *
 * and whose actor `items` field holds ids, not documents.
 */
async function writeActorPack(name, entries, folders = []) {
  const dir = path.join(PACKS_ROOT, name);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EBUSY") {
      console.error(
        `\nCannot rewrite packs/${name} — FoundryVTT is running and holds the LevelDB open.`
        + `\nClose FoundryVTT (fully quit the server, not just the browser tab) and re-run.`);
      process.exit(2);
    }
    throw err;
  }
  fs.mkdirSync(dir, { recursive: true });

  const db = new ClassicLevel(dir, { keyEncoding: "utf8", valueEncoding: "json" });
  await db.open();
  const batch = db.batch();

  for (const folder of folders) batch.put(`!folders!${folder._id}`, folder);

  let itemCount = 0;
  for (const { actor, items } of entries) {
    batch.put(`!actors!${actor._id}`, actor);
    for (const item of items) {
      const { effects = [], ...rest } = item;
      batch.put(`!actors.items!${actor._id}.${item._id}`, { ...rest, effects: effects.map(e => e._id) });
      for (const eff of effects) {
        batch.put(`!actors.items.effects!${actor._id}.${item._id}.${eff._id}`, eff);
      }
      itemCount++;
    }
  }

  await batch.write();
  await db.close();
  console.log(`  ${name.padEnd(20)} ${String(entries.length).padStart(3)} actors, ${itemCount} items, ${folders.length} folders`);
}

/* -------------------------------------------- */
/*  Main                                         */
/* -------------------------------------------- */

// `--only=bestiariusz` rebuilds a subset. A pack FoundryVTT has never seen (a
// brand new directory) can be written while the server is up, so this makes
// iterating on one pack possible without shutting the game down; rebuilding an
// existing pack still requires Foundry to be closed.
const ONLY = process.argv.slice(2)
  .find(a => a.startsWith("--only="))?.slice("--only=".length).split(",");
const wanted = name => !ONLY || ONLY.includes(name);

console.log("Neuroshima 5e — building compendium packs\n");

const featureDocs = Object.values(CLASS_FEATURES).map(buildFeature);
const professionDocs = Object.entries(PROFESSIONS).map(([pid, p]) => buildProfession(pid, p));
const classDocs = Object.entries(CLASSES).map(([cid, c]) => buildClass(cid, c));
const medicineDocs = Object.keys(CHEMIA).map(buildChemia);
const sztuczkaDocs = Object.keys(SZTUCZKI).map(buildSztuczka);
const originAbilityDocs = Object.keys(ORIGIN_ABILITIES).map(buildOriginAbility);
const originDocs = Object.keys(POCHODZENIA).map(buildPochodzenie);
const ammoDocs = AMMO_CALIBERS.map(buildAmmo);
const grenadeDocs = GRENADE_TYPES.map(buildGrenade);
const toolkitDocs = TOOLKITS.filter(k => !k.skip).map(buildToolkit);
const weaponDocs = [
  ...WEAPONS.map(buildWeapon),
  ...Object.keys(POCHODNIA_VARIANTS).map(buildPochodnia),
];
const sprzetDocs = [
  ...Object.keys(LATARKA_FORMS).map(buildLatarka),
  buildBaterie(),
  ...Object.keys(GOGLE_VARIANTS).map(buildGogle),
];
const armorDocs = ARMORS.map(buildArmor);

// sanity: every uuid referenced from an advancement must resolve to a built doc
const built = new Set([
  ...featureDocs.map(d => d._id),
  ...professionDocs.map(d => d._id),
  ...sztuczkaDocs.map(d => d._id),
  ...originAbilityDocs.map(d => d._id)
]);
const dangling = [];
for (const doc of [...classDocs, ...professionDocs, ...originDocs]) {
  for (const a of doc.system.advancement ?? []) {
    const uuids = [
      ...(a.configuration.items ?? []).map(i => i.uuid),
      ...(a.configuration.pool ?? []).map(i => i.uuid)
    ];
    for (const u of uuids) {
      const id = u.split(".").pop();
      if (!built.has(id)) dangling.push(`${doc.name} L${a.level} -> ${u}`);
    }
  }
}
if (dangling.length) {
  console.error("DANGLING UUID REFERENCES:\n" + dangling.join("\n"));
  process.exit(1);
}

// --- Bestiariusz ---------------------------------------------------------
// The Zombie overlay is not a creature: it is a modifier applied to a host
// ("bez zmian (jak u nosiciela)" for half its fields), so it has no place in an
// actor pack and is handled separately.
const bestiaryEntries = Object.values(BESTIARY)
  .filter(c => !c.overlay)
  .map(buildNpc);

const bestiaryFolders = Object.entries(NEUROSHIMA_CREATURE_TYPES)
  .filter(([key]) => bestiaryEntries.some(e => e.actor.folder === idFor("bestiary-folder", key)))
  .map(([key, def], i) => ({
    _id: idFor("bestiary-folder", key),
    name: def.plural,
    type: "Actor",
    folder: null,
    sorting: "m",
    sort: i * 100000,
    color: null,
    flags: {}
  }));

fs.mkdirSync(PACKS_ROOT, { recursive: true });
if (wanted(PACK.features)) await writePack(PACK.features, featureDocs);
if (wanted(PACK.profesje)) await writePack(PACK.profesje, professionDocs);
if (wanted(PACK.klasy)) await writePack(PACK.klasy, classDocs);
if (wanted(PACK.sztuczki)) await writePack(PACK.sztuczki, sztuczkaDocs);
if (wanted(PACK.pochodzenia)) await writePack(PACK.pochodzenia, originAbilityDocs);
if (wanted(PACK.origins)) await writePack(PACK.origins, originDocs);
if (wanted(PACK.lekarstwa)) await writePack(PACK.lekarstwa, medicineDocs);
if (wanted(PACK.amunicja)) await writePack(PACK.amunicja, ammoDocs);
if (wanted(PACK.granaty)) await writePack(PACK.granaty, grenadeDocs);
if (wanted(PACK.narzedzia)) await writePack(PACK.narzedzia, toolkitDocs);
if (wanted(PACK.bron)) await writePack(PACK.bron, weaponDocs);
if (wanted(PACK.sprzet)) await writePack(PACK.sprzet, sprzetDocs);
if (wanted(PACK.pancerze)) await writePack(PACK.pancerze, armorDocs);
if (wanted(PACK.bestiariusz)) await writeActorPack(PACK.bestiariusz, bestiaryEntries, bestiaryFolders);

if (wanted(PACK.bestiariusz)) {
  const n = bestiaryEntries.length;
  console.log(`\n  token art:`);
  console.log(`    własna        ${String(tokenSources.own.length).padStart(2)}/${n}`
    + (tokenSources.own.length ? `  ${tokenSources.own.join(", ")}` : ""));
  console.log(`    pożyczona     ${String(tokenSources.alias.length).padStart(2)}/${n}  (aliases.json)`);
  console.log(`    placeholder   ${String(tokenSources.placeholder.length).padStart(2)}/${n}  (do wymiany)`);
  if (aliasMisses.length) {
    console.log(`    aliasy wskazujące na brakujące pliki (${aliasMisses.length}): ${aliasMisses.join(", ")}`);
  }
  if (artMisses.length) {
    console.log(`  portrety nieznalezione (${artMisses.length}): ${artMisses.join(", ")}`);
  }
}

const advCount = classDocs.reduce((n, d) => n + d.system.advancement.length, 0)
  + professionDocs.reduce((n, d) => n + d.system.advancement.length, 0)
  + originDocs.reduce((n, d) => n + d.system.advancement.length, 0);
console.log(`\n  advancements built: ${advCount}`);
console.log("  dangling uuids    : none");
console.log("\nDone. Reload the world to see the packs.");
