/**
 * Neuroshima 5e — reguły pancerzy.
 *
 * Cztery reguły, których dnd5e 5.3 nie zna, plus kara Szybkości za zbyt niską
 * SIŁĘ. Co da się policzyć — liczymy tutaj. Czego nie — jest wypisane w polu
 * `manual` przedmiotu i w `game.neuroshima.pancerze.report()` (ARCHITECTURE.md §5).
 *
 * ┌ Automatyzujemy ────────────────────────────────────────────────────────────┐
 * │ Próg obrażeń        `dnd5e.calculateDamage` — sumujemy obrażenia cięte,    │
 * │                     kłute i obuchowe PO odpornościach; poniżej progu       │
 * │                     zerujemy tylko je, reszta typów przechodzi. Natywne    │
 * │                     `attributes.hp.dt` odpada: istnieje wyłącznie na NPC/  │
 * │                     obiektach (nie na postaciach) i dotyczy wszystkich     │
 * │                     typów obrażeń naraz.                                   │
 * │ Odporność kinet.    Efekt Aktywny przedmiotu → `system.traits.dr.value`.   │
 * │                     Reguła natywna, nic tu nie robimy.                     │
 * │ Brak wyszkolenia    Utrudnienie do Testów SIŁ/ZRC, RO i Testów Ataku.      │
 * │                     Testy i RO przez `AdvantageModeField` w derived data   │
 * │                     (dnd5e łączy je też do Umiejętności i Narzędzi),       │
 * │                     ataki przez `dnd5e.preRollAttack`.                     │
 * │ Kara Szybkości      SIŁA < wymaganej → Szybkość −4,5 m.                    │
 * │ Skradanie się       Właściwość `stealthDisadvantage` — przepięta na klucz   │
 * │                     `skr`. dnd5e ma na sztywno `skills.ste.roll.mode`,     │
 * │                     a `config/skills.mjs` dawno przemianował umiejętności, │
 * │                     więc natywna reguła pisała do nieistniejącego pola.     │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌ Nie automatyzujemy ────────────────────────────────────────────────────────┐
 * │ Szczelność, akcje tarczy, Krytyczna ochrona hełmu, wytrzymałość pancerzy,  │
 * │ odpoczynek w pancerzu, Utrudnienie do pływania, czas zakładania.           │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

import { ARMORS, ARMOR_GLOBAL_MANUAL, KINETIC_DAMAGE_TYPES, LOW_STRENGTH_SPEED_PENALTY }
  from "../config/armor-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Kategorie liczone jako „noszony pancerz" (bez tarczy i akcesoriów). */
const BODY_ARMOR_TYPES = new Set(["light", "medium", "heavy"]);

/** Ścieżki rzutów obejmowanych karą za brak wyszkolenia. */
const UNTRAINED_ROLL_PATHS = [
  "abilities.str.check.roll.mode",
  "abilities.str.save.roll.mode",
  "abilities.dex.check.roll.mode",
  "abilities.dex.save.roll.mode",
];

/** Klucz umiejętności Skradania się w tym świecie (`config/skills.mjs`). */
const STEALTH_SKILL = "skr";

/* -------------------------------------------- */
/*  Odczyt stanu                                  */
/* -------------------------------------------- */

/** Założony pancerz korpusu (dnd5e i tak liczy najwyżej jeden). */
export function equippedArmor(actor) {
  return actor?.items.find(i =>
    (i.type === "equipment") && i.system?.equipped && BODY_ARMOR_TYPES.has(i.system?.type?.value)
  ) ?? null;
}

/** Założona tarcza. */
export function equippedShield(actor) {
  return actor?.items.find(i =>
    (i.type === "equipment") && i.system?.equipped && (i.system?.type?.value === "shield")
  ) ?? null;
}

/** Czy postać ma biegłość w danej kategorii ekwipunku ochronnego. */
export function isProficientIn(actor, item) {
  const key = CONFIG.DND5E.armorProficienciesMap?.[item?.system?.type?.value];
  if (key === true) return true;          // odzież, akcesoria — biegłość zbędna
  if (!key) return true;                  // typ spoza mechaniki pancerza
  const owned = actor?.system?.traits?.armorProf?.value;
  return owned instanceof Set ? owned.has(key) : !!owned?.includes?.(key);
}

/**
 * Suma progów obrażeń założonego sprzętu. Tarcze i akcesoria progu nie mają,
 * więc realnie to zawsze próg jednego pancerza — sumujemy dla przyszłych
 * przedmiotów homebrew.
 */
export function armorDamageThreshold(actor) {
  let dt = 0;
  for (const item of actor?.items ?? []) {
    if ((item.type !== "equipment") || !item.system?.equipped) continue;
    dt += item.getFlag(MODULE_ID, "armorDT") ?? 0;
  }
  return dt;
}

/* -------------------------------------------- */
/*  Reguła: kara Szybkości i brak wyszkolenia     */
/* -------------------------------------------- */

/**
 * dnd5e liczy Szybkość i tryby rzutów w `prepareDerivedData` i nie daje po nim
 * żadnego haka, więc owijamy prototyp — tak samo jak `actors/pw.mjs` i
 * `actors/sp.mjs`. Owijki łączą się bezpiecznie.
 */
function patchPrepareDerivedData() {
  const ActorClass = CONFIG.Actor.documentClass;
  const original = ActorClass.prototype.prepareDerivedData;

  ActorClass.prototype.prepareDerivedData = function(...args) {
    original.apply(this, args);
    try {
      applyArmorPenalties(this);
    } catch (err) {
      console.error("Neuroshima 5e | Armor penalties failed", err);
    }
  };
}

/**
 * Nakłada karę Szybkości oraz Utrudnienie za brak wyszkolenia.
 * @param {Actor5e} actor
 */
export function applyArmorPenalties(actor) {
  if (!actor?.system?.abilities) return;

  const worn = [equippedArmor(actor), equippedShield(actor)].filter(Boolean);
  if (!worn.length) return;

  /* ── Kara Szybkości ──
     dnd5e ma pole `system.strength` w schemacie ekwipunku, ale w 5.3 nic z nim
     nie robi. Neuroshima: SIŁA niższa niż wymagana → Szybkość −4,5 m. */
  const str = actor.system.abilities.str?.value ?? 10;
  const tooWeak = worn.some(i => i.system?.strength && (str < i.system.strength));
  if (tooWeak) {
    const movement = actor.system.attributes?.movement;
    if (movement) {
      const penalty = movement.units === "ft" ? 15 : LOW_STRENGTH_SPEED_PENALTY;
      for (const key of ["walk", "swim", "climb", "fly", "burrow"]) {
        if (typeof movement[key] === "number") movement[key] = Math.max(0, movement[key] - penalty);
      }
    }
  }

  /* ── Brak wyszkolenia ──
     „Utrudnienie do każdego Testu k20 opartego na Sile lub Zręczności (w tym
     Testy Ataku i Rzuty Obronne)." Testy Umiejętności i Narzędzi łapią się same:
     `AdvantageModeField.combineFields` dokłada `abilities.<id>.check.roll.mode`
     do każdego z nich. Ataki obsługuje `onPreRollAttack` niżej. */
  if (worn.some(i => !isProficientIn(actor, i))) {
    // `setMode(model, keyPath)` bierze model, na którym leży pole — dla ścieżek
    // bez prefiksu "system." jest to `actor.system`, dokładnie jak w
    // `data/actor/templates/attributes.mjs` dnd5e.
    const { AdvantageModeField } = dnd5e.dataModels.fields;
    for (const path of UNTRAINED_ROLL_PATHS) AdvantageModeField.setMode(actor.system, path, -1);
  }

  /* ── Utrudnienie do Skradania się ──
     dnd5e liczy to samo w `prepareDerivedData`, ale pisze pod `skills.ste`,
     a `config/skills.mjs` przemianował Skradanie na `skr` — natywna reguła
     ląduje więc w polu, którego nikt nie czyta. Przepinamy na właściwy klucz.

     Wyjątki (np. Cichy krok) rozstrzygamy tutaj, a nie w haku rzutu:
     `dnd5e.postBuildSkillRollConfig` odpala się wyłącznie przez okno dialogowe,
     więc rzut z pominięciem dialogu przepuściłby Utrudnienie mimo zdolności. */
  const stealth = actor.system.skills?.[STEALTH_SKILL];
  const stealthArmor = worn.some(i => i.system?.properties?.has?.("stealthDisadvantage"));
  if (stealth && stealthArmor && !STEALTH_EXEMPTIONS.some(fn => fn(actor))) {
    dnd5e.dataModels.fields.AdvantageModeField.setMode(actor.system, `skills.${STEALTH_SKILL}.roll.mode`, -1);
  }
}

/**
 * Predykaty zwalniające aktora z Utrudnienia do Skradania się za pancerz.
 * Zdolności rejestrują się same, żeby ten plik nie musiał ich znać.
 * @type {Array<(actor: Actor5e) => boolean>}
 */
const STEALTH_EXEMPTIONS = [];

/**
 * @param {(actor: Actor5e) => boolean} predicate Zwraca `true`, gdy pancerz nie
 *   ma nakładać Utrudnienia do Skradania się temu aktorowi.
 */
export function registerStealthExemption(predicate) {
  STEALTH_EXEMPTIONS.push(predicate);
}

/* -------------------------------------------- */
/*  Reguła: Utrudnienie do Testów Ataku           */
/* -------------------------------------------- */

/**
 * Hook: `dnd5e.preRollAttack`.
 * Ustawiamy `config.disadvantage`, a nie `postBuildAttackRollConfig`, bo ten
 * drugi odpala się wyłącznie przez okno konfiguracji rzutu — atak rzucony
 * z `configure: false` by go ominął.
 */
function onPreRollAttack(config, _dialog, _message) {
  const activity = config.subject;
  const actor = activity?.actor;
  if (!actor) return;

  const ability = activity.ability ?? activity.item?.system?.ability;
  if ((ability !== "str") && (ability !== "dex")) return;

  const worn = [equippedArmor(actor), equippedShield(actor)].filter(Boolean);
  const untrained = worn.filter(i => !isProficientIn(actor, i));
  if (!untrained.length) return;

  config.disadvantage = true;
  ui.notifications.info(
    `Utrudnienie do Testu Ataku — brak wyszkolenia: ${untrained.map(i => i.name).join(", ")}.`
  );
}

/* -------------------------------------------- */
/*  Reguła: próg obrażeń (tylko kinetyczne)       */
/* -------------------------------------------- */

/**
 * Hook: `dnd5e.calculateDamage`.
 * `damages` ma już naliczone odporności i mnożniki, a `damages.amount` jest sumą
 * końcową — odejmujemy od niej dokładnie te wpisy, które próg pochłonął.
 */
function onCalculateDamage(actor, damages, options = {}) {
  if ((options.ignore === true) || options.ignore?.threshold) return;

  const dt = armorDamageThreshold(actor);
  if (!dt) return;

  const kinetic = damages.filter(d => KINETIC_DAMAGE_TYPES.includes(d.type) && (d.value > 0));
  const sum = kinetic.reduce((s, d) => s + d.value, 0);
  if ((sum <= 0) || (sum >= dt)) return;

  for (const d of kinetic) {
    damages.amount -= d.value;
    d.value = 0;
    d.active.multiplier = 0;
    d.active.threshold = true;
  }
  damages.amount = Math.max(0, Math.trunc(damages.amount));

  const armor = equippedArmor(actor);
  ui.notifications.info(
    `${actor.name}: próg obrażeń ${dt} pochłonął ${sum} obrażeń kinetycznych`
    + `${armor ? ` (${armor.name})` : ""}.`
  );
}

/* -------------------------------------------- */
/*  Głośne ostrzeżenie przy zakładaniu            */
/* -------------------------------------------- */

function onUpdateItemArmorWarning(item, changes, _options, userId) {
  if (game.user.id !== userId) return;
  if ((item.type !== "equipment") || (changes.system?.equipped !== true)) return;

  const actor = item.actor;
  if (!actor) return;

  const messages = [];
  if (!isProficientIn(actor, item)) {
    messages.push("brak wyszkolenia → Utrudnienie do Testów SIŁ/ZRC, RO i Testów Ataku");
  }
  const req = item.system?.strength;
  if (req && ((actor.system?.abilities?.str?.value ?? 10) < req)) {
    messages.push(`SIŁA poniżej ${req} → Szybkość −${LOW_STRENGTH_SPEED_PENALTY} m`);
  }
  if (item.getFlag(MODULE_ID, "stealthImpossible")) {
    messages.push("Skradanie się niemożliwe — moduł nakłada tylko Utrudnienie, resztę rozstrzyga MG");
  }
  if (item.getFlag(MODULE_ID, "sealed")) {
    messages.push("Szczelność: uruchamiana akcją, tlen na 1 h — obsługa ręczna");
  }

  if (messages.length) ui.notifications.warn(`${item.name}: ${messages.join("; ")}.`);
}

/* -------------------------------------------- */
/*  Raport auto / manual                          */
/* -------------------------------------------- */

const AUTOMATED_RULES = [
  ["Próg obrażeń", "Hak `dnd5e.calculateDamage`; sumuje obrażenia cięte, kłute i obuchowe po odpornościach."],
  ["Odporność kinetyczna", "Efekt Aktywny przedmiotu → `system.traits.dr.value`."],
  ["Brak wyszkolenia — Testy i RO", "Tryb Utrudnienia na `abilities.str|dex.check|save.roll.mode`; obejmuje też Umiejętności i Narzędzia."],
  ["Brak wyszkolenia — Testy Ataku", "Hak `dnd5e.preRollAttack` dla ataków opartych na SIŁ i ZRC."],
  ["Kara Szybkości", `SIŁA poniżej wymaganej → −${LOW_STRENGTH_SPEED_PENALTY} m do wszystkich prędkości.`],
  ["Skradanie się", "Właściwość `stealthDisadvantage` przepięta z natywnego `skills.ste` na neuroshimowe `skills.skr`."],
];

/** Wypisuje na czacie, co moduł liczy sam, a czego nie tyka. */
export function report() {
  const auto = AUTOMATED_RULES
    .map(([name, how]) => `<li><strong>${name}</strong> — ${how}</li>`).join("");

  const perItem = ARMORS
    .filter(a => a.manual?.length)
    .map(a => `<li><strong>${a.name}</strong><ul>${a.manual.map(m => `<li>${m}</li>`).join("")}</ul></li>`)
    .join("");

  const global = ARMOR_GLOBAL_MANUAL.map(m => `<li>${m}</li>`).join("");

  const content = `
    <h3>Pancerze — co liczy moduł</h3>
    <ul>${auto}</ul>
    <h3>Nie automatyzujemy — reguły ogólne</h3>
    <ul>${global}</ul>
    <h3>Nie automatyzujemy — konkretne przedmioty</h3>
    <ul>${perItem}</ul>
  `;

  ChatMessage.create({ content, whisper: [game.user.id] });
  return { automated: AUTOMATED_RULES.length, manual: ARMOR_GLOBAL_MANUAL.length };
}

/* -------------------------------------------- */

export function registerArmorRules() {
  patchPrepareDerivedData();
  Hooks.on("dnd5e.preRollAttack", onPreRollAttack);
  Hooks.on("dnd5e.calculateDamage", onCalculateDamage);
  Hooks.on("updateItem", onUpdateItemArmorWarning);

  console.log("Neuroshima 5e | Armor rules registered");
}
