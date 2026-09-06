/**
 * Neuroshima 5e — Toolkits ("Narzędzia małego X").
 *
 * Source of truth for stats/ST: `Tabele/Narzedzia.md`.
 *
 * Each toolkit is a dnd5e `tool` item with:
 *  - native ability + proficiency wiring via `system.type.baseItem` (= toolkit key),
 *  - a generic "Test narzędzi" Check activity (no DC) — the Test Cechy z narzędziem,
 *  - one Check activity per "Używanie" action with its flat ST (DC).
 *
 * Dual-ability kits store the FIRST-listed ability as `system.ability`; the player can
 * re-pick the ability in the roll dialog. `altAbility` is informational (description).
 *
 * Mały medyk is intentionally DEFERRED (skip:true) — needs a tiered heal table + a
 * 5-charge resource + refill flow (later batch).
 */

import { createGearPlaceholders, createRealGear } from "./gear-data.mjs";
import { createKolczatkaStock, isKolczatka } from "../items/kolczatka.mjs";
import { createArmors } from "./armor-data.mjs";
import { TOOLKIT_CHECK_ACTIVITY_TYPE } from "../items/toolkit-check-activity.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Armor items (created on the same actor via `createArmors`) that "zbroje śmieciowe" expands to. */
const ZBROJE_SMIECIOWE_NAMES = Object.freeze([
  "Kiepska zbroja śmieciowa", "Solidna zbroja śmieciowa", "Ciężka zbroja śmieciowa", "Pełna zbroja śmieciowa"
]);

/** Activity flag marking the medyk "Przywracanie PW" heal activity (read by toolkit-medyk.mjs). */
export const MEDYK_HEAL_FLAG = "medykHeal";
/** Item flag holding the medyk medicine supply (number of remaining heals). */
export const MEDYK_CHARGES_FLAG = "medyk-charges";
/** Default / full medicine supply. */
export const MEDYK_MAX_CHARGES = 5;

/** Abbrev. label for an ability key. */
const ABILITY_LABEL = { str: "Siła", dex: "Zręczność", con: "Kondycja", int: "Inteligencja", wis: "Mądrość", cha: "Charyzma" };

/**
 * @typedef {object} ToolkitAction
 * @property {string} name  Display name (the ST is appended automatically).
 * @property {number} dc    Suggested ST (flat DC).
 * @property {string} [gate]  Check-gate key (see `items/toolkit-check-activity.mjs`
 *   `registerCheckGate` / `items/toolkit-kowal.mjs`) — opts this action into a
 *   pre-roll picker dialog and an early "nothing eligible" block.
 */

/**
 * @typedef {object} Toolkit
 * @property {string} id            Key in CONFIG.DND5E.tools (and item baseItem).
 * @property {string} label         Item name.
 * @property {string} ability       Primary ability key (default for checks).
 * @property {string|null} altAbility  Alternate ability (informational).
 * @property {number} weight        kg.
 * @property {number} price         gb.
 * @property {number} avail         Base availability %.
 * @property {boolean} iconReady    True if a dedicated icon exists in icons/tools/.
 * @property {ToolkitAction[]} actions
 * @property {string} [produkcja]   Crafting outputs (description only).
 * @property {string} [special]     Special note (description only, HTML allowed).
 * @property {boolean} [skip]       Skip generation (deferred kit).
 */

/** @type {Toolkit[]} */
export const TOOLKITS = [
  {
    id: "aptekarza", label: "Narzędzia małego aptekarza", ability: "int", altAbility: null,
    weight: 10, price: 40, avail: 20, iconReady: true,
    actions: [
      { name: "Identyfikacja rośliny lub grzyba", dc: 10 },
      { name: "Rozpoznanie choroby", dc: 15 }
    ],
    produkcja: "krem do rąk, painkillery, uzupełnienie zestawu małego medyka."
  },
  {
    id: "charakteryzatora", label: "Narzędzia małego charakteryzatora", ability: "dex", altAbility: null,
    weight: 5, price: 30, avail: 50, iconReady: true,
    actions: [
      { name: "Makijaż", dc: 10 }
    ],
    produkcja: "zmiana wyglądu, maskowanie twarzy, przebranie się.",
    special: "Umiejętne użycie (ST 10) daje <strong>Ułatwienie</strong> w Testach Cech opartych na Charyzmie lub w Testach Zręczności (Ukrywanie się)."
  },
  {
    id: "chemika", label: "Narzędzia małego chemika", ability: "int", altAbility: null,
    weight: 10, price: 50, avail: 30, iconReady: true,
    actions: [
      { name: "Identyfikacja substancji", dc: 15 },
      { name: "Rozpalenie ognia", dc: 10 },
      { name: "Odrdzewienie mechanizmu", dc: 15 }
    ],
    produkcja: "Koktajl Mołotowa, kwas, nafta, papier, proch, paliwo chrzczone, super klej, środki czyszczące i dezynfekujące, świeczka, uzdatnianie wody, zapałki."
  },
  {
    id: "elektronika", label: "Narzędzia małego elektronika", ability: "dex", altAbility: "int",
    weight: 10, price: 40, avail: 30, iconReady: true,
    actions: [
      { name: "Wyłączenie prądu w okolicy", dc: 10 },
      { name: "Znalezienie kabla z prądem", dc: 15 },
      { name: "Uruchomienie latarki", dc: 10 },
      { name: "Otwarcie zamka elektronicznego", dc: 15 }
    ],
    produkcja: "baterie, bezpiecznik, bebeszenie maszyn Molocha, latarka, naprawa sprzętu RTV i AGD."
  },
  {
    id: "falszerza", label: "Narzędzia małego fałszerza", ability: "dex", altAbility: null,
    weight: 10, price: 30, avail: 20, iconReady: true,
    actions: [
      { name: "Podrobienie podpisu lub pieczątki", dc: 15 },
      { name: "Napisanie oficjalnego rozkazu", dc: 15 },
      { name: "Stenotypowanie", dc: 10 }
    ],
    produkcja: "fałszywe papiery, kopiowanie dokumentacji, pieczątki, akty zgonu, ślubu, glejty."
  },
  {
    id: "gorzelnika", label: "Narzędzia małego gorzelnika", ability: "wis", altAbility: "int",
    weight: 25, price: 40, avail: 60, iconReady: true,
    actions: [
      { name: "Wykrycie zatrutego alkoholu", dc: 15 },
      { name: "Identyfikacja alkoholu", dc: 10 },
      { name: "Dezynfekcja powierzchni 1,5 × 1,5 m", dc: 10 }
    ],
    produkcja: "alkohol, środki dezynfekujące i czyszczące, woda filtrowana."
  },
  {
    id: "hakera", label: "Narzędzia małego hakera", ability: "int", altAbility: null,
    weight: 10, price: 50, avail: 20, iconReady: true,
    actions: [
      { name: "Otwarcie zamka elektronicznego", dc: 15 },
      { name: "Zakłócenie działania maszyny Molocha", dc: 20 },
      { name: "Złamanie hasła dostępu", dc: 20 }
    ],
    produkcja: "kopiowanie danych, proste gry, programy i wirusy."
  },
  {
    id: "jubilera", label: "Narzędzia małego jubilera", ability: "int", altAbility: "wis",
    weight: 5, price: 30, avail: 40, iconReady: true,
    actions: [
      { name: "Ocena wartości biżuterii", dc: 15 },
      { name: "Rozpoznanie metalu i kamienia", dc: 10 }
    ],
    produkcja: "elegancka lub modna biżuteria."
  },
  {
    id: "kartografa", label: "Narzędzia małego kartografa", ability: "int", altAbility: "dex",
    weight: 3, price: 50, avail: 20, iconReady: true,
    actions: [
      { name: "Narysowanie mapy małej lokalizacji", dc: 15 }
    ],
    produkcja: "mapy."
  },
  {
    id: "klusownika", label: "Narzędzia małego kłusownika", ability: "dex", altAbility: "wis",
    weight: 10, price: 10, avail: 90, iconReady: true,
    actions: [
      { name: "Rozbrojenie nieelektronicznej pułapki", dc: 15 },
      { name: "Zastawienie sideł", dc: 10 }
    ],
    produkcja: "lina, prowiant, sidła, sieć, wnyki."
  },
  {
    id: "kowala", label: "Narzędzia małego kowala", ability: "str", altAbility: "wis",
    weight: 30, price: 50, avail: 60, iconReady: true,
    // Vertical slice: native dnd5e "check" activity (stock chevron chat card, roll
    // buttons, dialog) instead of the module's whole-flow-cancelling short-circuit.
    // See scripts/items/toolkit-check-activity.mjs.
    nativeCheck: true,
    actions: [
      { name: "Wyważenie drzwi lub otwarcie skrzyni", dc: 20 },
      // `gate` wires these into toolkit-kowal.mjs's check gate: a weapon-picker
      // dialog before the roll, and an early block (no card, no roll) when there's
      // nothing eligible to act on — see _buildCheckActivity below.
      { name: "Naostrzenie broni", dc: 10, gate: "kowalaNaostrzenie" },
      { name: "Naprawa zdegradowanej broni białej", dc: 15, gate: "kowalaNaprawa" }
    ],
    produkcja: "bełty, broń biała, hełm, igły, kłódka, kolczatki, łom, łopata, naczynia metalowe, podkowy, płyty pancerne, sidła, sprzęt do wspinaczki, strzały, tarcze, wózek, zbroje śmieciowe.",
    // "Craft:"-style linked variant of the line above (5e-2024 tool parity — see
    // dnd5e.equipment24 Smith's Tools for the reference shape). `link` keys are
    // resolved at generation time via `_resolveProdukcjaLinks()`; entries without a
    // `link` are categories (not a single Item) and stay plain text; `linkGroup`
    // expands to several links (e.g. the 4 zbroja śmieciowa tiers) in one slot.
    produkcjaEntries: [
      { text: "bełty", link: "belty" },
      { text: "broń biała" },
      { text: "hełm", link: "helm" },
      { text: "igły", link: "igly" },
      { text: "kłódka", link: "klodka" },
      { text: "kolczatki", link: "kolczatki" },
      { text: "łom", link: "lom" },
      { text: "łopata", link: "lopata" },
      { text: "naczynia metalowe" },
      { text: "podkowy", link: "podkowy" },
      { text: "płyty pancerne", link: "plyty_pancerne" },
      { text: "sidła", link: "sidla" },
      { text: "sprzęt do wspinaczki", link: "sprzet_wspinaczkowy" },
      { text: "strzały", link: "strzaly" },
      { text: "tarcze", link: "tarcza_armor" },
      { text: "wózek", link: "wozek" },
      { text: "zbroje śmieciowe", linkGroup: "zbroje_smieciowe" }
    ],
    special: "<strong>Naprawa zdegradowanej broni białej:</strong> broń, której kość obrażeń spadła po naturalnej 1 (k12→k10→k8→k6→k4), można naprawić (test ST 15)."
  },
  {
    id: "krawca", label: "Narzędzia małego krawca", ability: "dex", altAbility: null,
    weight: 15, price: 30, avail: 60, iconReady: true,
    actions: [
      { name: "Zszycie rozdarcia lub dwóch kawałków materiału", dc: 10 },
      { name: "Haft", dc: 15 }
    ],
    produkcja: "bandaże, hamak, lekkie pancerze, lina, maska przeciwgazowa, namiot, skafander ochronny, śpiwór, ubrania."
  },
  {
    id: "kucharza", label: "Narzędzia małego kucharza", ability: "wis", altAbility: null,
    weight: 10, price: 20, avail: 70, iconReady: true,
    actions: [
      { name: "Poprawa smaku potrawy", dc: 10 },
      { name: "Wykrycie zatrutego lub nieświeżego jedzenia", dc: 10 },
      { name: "Zwabienie istoty zapachem jedzenia", dc: 15 }
    ],
    produkcja: "gotowanie w czasie postoju, prowiant, kanapki, środek przeczyszczający."
  },
  {
    id: "mechanika", label: "Narzędzia małego mechanika", ability: "dex", altAbility: "int",
    weight: 15, price: 50, avail: 50, iconReady: true,
    actions: [
      { name: "Otwarcie drzwi pojazdu", dc: 15 },
      { name: "Otwarcie zamkniętych drzwi", dc: 20 }
    ],
    produkcja: "bebeszenie maszyn Molocha, naprawianie pojazdów, wózek.",
    special: "<strong>Naprawa pojazdu (fachowa):</strong> wymaga kilkugodzinnego postoju, odpowiednich części i biegłości w narzędziach małego mechanika."
  },
  {
    id: "medyka", label: "Narzędzia małego medyka", ability: "int", altAbility: null,
    weight: 10, price: 50, avail: 40, iconReady: true, heal: true,
    actions: [
      { name: "Ustabilizowanie istoty", dc: 10 },
      { name: "Powstrzymanie krwawienia", dc: 10 }
    ],
    produkcja: "painkiller, bandaże.",
    special: "<strong>Przywracanie PW</strong> (akcja, biegłość wymagana): Test Inteligencji (narzędzia małego medyka) względem oznaczonego pacjenta — 5+: 1k4, 10+: 1k4+INT, 15+: 2k4+INT, 20+: 3k4+INT, 25+: 4k4+INT. Zapas na 5 leczeń (uzupełnienie 5 gb). Bez biegłości: tylko automatyczna stabilizacja sojusznika."
  },
  {
    id: "rusznikarza", label: "Narzędzia małego rusznikarza", ability: "dex", altAbility: "int",
    weight: 20, price: 50, avail: 40, iconReady: true,
    actions: [
      { name: "Flara świecąca przez 1 minutę", dc: 15 },
      { name: "Elaboracja amunicji", dc: 10 }
    ],
    produkcja: "broń typu samoróbka, elaboracja amunicji, ulepszanie broni palnej.",
    special: "<strong>Odblokowanie zaciętej broni</strong> obsługiwane przez system zacięć. <strong>Elaboracja amunicji:</strong> patrz tabela w podręczniku."
  },
  {
    id: "rzeznika", label: "Narzędzia małego rzeźnika", ability: "wis", altAbility: "str",
    weight: 10, price: 30, avail: 80, iconReady: true,
    actions: [
      { name: "Prezentacja narzędzi — zastraszanie", dc: 10 },
      { name: "Przecięcie liny", dc: 10 }
    ],
    produkcja: "bebeszenie potworów i zwierząt."
  },
  {
    id: "stolarza", label: "Narzędzia małego stolarza", ability: "dex", altAbility: "str",
    weight: 5, price: 20, avail: 30, iconReady: true,
    actions: [
      { name: "Otwarcie drzwi lub pojemnika", dc: 20 },
      { name: "Ocena wytrzymałości drewnianej konstrukcji", dc: 15 }
    ],
    produkcja: "bełty, bejsbol, dmuchawka, łuk, meble, narty, pochodnia, gwizdek, skrzynia, strzały, taran, tratwa."
  },
  {
    id: "szulera", label: "Narzędzia małego szulera", ability: "wis", altAbility: "cha",
    weight: 2, price: 20, avail: 10, iconReady: true,
    actions: [
      { name: "Zauważenie oszustwa w grze", dc: 10 },
      { name: "Wygranie gry w karty lub kości", dc: 20 }
    ],
    produkcja: "fałszowane kostki, znaczone karty."
  },
  {
    id: "szklarza", label: "Narzędzia małego szklarza", ability: "int", altAbility: "dex",
    weight: 20, price: 40, avail: 20, iconReady: true,
    actions: [
      { name: "Rozbicie szkła pancernego", dc: 15 },
      { name: "Wycięcie dziury w szybie", dc: 10 }
    ],
    produkcja: "szklane naczynia, szkło powiększające, luneta, lupa, lustro, żarówka."
  },
  {
    id: "slusarza", label: "Narzędzia małego ślusarza", ability: "dex", altAbility: null,
    weight: 5, price: 30, avail: 20, iconReady: true,
    actions: [
      { name: "Otwarcie zamka mechanicznego", dc: 15 },
      { name: "Otwarcie zamka elektronicznego", dc: 25 },
      { name: "Rozbrojenie pułapki", dc: 15 },
      { name: "Rozbrojenie miny", dc: 20 }
    ],
    produkcja: "dmuchawka, dorobienie klucza, potykacz, prosta pułapka."
  },
  {
    id: "tatuazysty", label: "Narzędzia małego tatuażysty", ability: "dex", altAbility: null,
    weight: 5, price: 40, avail: 30, iconReady: true,
    actions: [
      { name: "Oznakowanie istoty", dc: 15 }
    ],
    produkcja: "tatuowanie skóry."
  }
];

/** Core fallback icon for kits without a dedicated icon yet. */
const FALLBACK_ICON = "icons/svg/item-bag.svg";

/** Resolve the item image for a toolkit. */
function _toolkitImg(kit) {
  return kit.iconReady
    ? `modules/${MODULE_ID}/icons/tools/${kit.id}.svg`
    : FALLBACK_ICON;
}

/**
 * Resolve `produkcjaEntries` → `@UUID[]{}` content-links, 5e-2024 "Craft:" style.
 * Link targets are catalog items and always live on the Zbrojownia master — a
 * toolkit item being created/refreshed on some OTHER actor (e.g. Piekarz's own
 * copy) links to the same catalog UUIDs, it doesn't get its own private copies of
 * the gear stubs/armors.
 * @returns {Promise<Map<string, Item|Item[]>>}
 */
async function _resolveProdukcjaLinks() {
  const zbrojownia = game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if ( !zbrojownia ) return new Map();

  const gear = await createGearPlaceholders(zbrojownia);
  // Batch 39: Sidła/Sprzęt do wspinaczki/Strzały/Wózek graduated out of the
  // placeholder stub array into real, priced items (`gear-data.mjs`'s own doc
  // comment, "REAL_GEAR") — merged in here so the kowal's "Produkcja" list
  // keeps linking to them by the same `gearId`s, now landing on real items.
  const realGear = await createRealGear(zbrojownia);
  // Kolczatki graduated even further out — a real Activity means it needed its own file
  // (`items/kolczatka.mjs`), so it's not in `REAL_GEAR` either. `createKolczatkaStock` only
  // returns created/updated counts (matching `createFlaraStock`'s own shape), not the item
  // itself — found separately here so its "kolczatki" produkcja link keeps resolving too.
  await createKolczatkaStock(zbrojownia);
  const kolczatkaItem = zbrojownia.items.find(isKolczatka);
  await createArmors(zbrojownia);
  const byName = name => zbrojownia.items.find(i => i.type === "equipment" && i.name === name);

  const links = new Map([...gear, ...realGear]);
  if ( kolczatkaItem ) links.set("kolczatki", kolczatkaItem);
  links.set("helm", byName("Hełm"));
  links.set("tarcza_armor", byName("Tarcza"));
  links.set("zbroje_smieciowe", ZBROJE_SMIECIOWE_NAMES.map(byName).filter(Boolean));
  return links;
}

/** Render one `produkcjaEntries` entry as plain text or an `@UUID[]{}` content-link (or several, for a group). */
function _produkcjaEntryHtml(entry, links) {
  if ( !entry.link && !entry.linkGroup ) return entry.text;

  if ( entry.linkGroup ) {
    const items = links?.get(entry.linkGroup) ?? [];
    if ( !items.length ) return entry.text;
    return items.map(i => `@UUID[${i.uuid}]{${i.name}}`).join(", ");
  }

  const item = links?.get(entry.link);
  return item ? `@UUID[${item.uuid}]{${entry.text}}` : entry.text;
}

/** Build the HTML description for a toolkit item. */
function _toolkitDescription(kit, links) {
  const abil = ABILITY_LABEL[kit.ability] ?? kit.ability;
  const abilLine = kit.altAbility
    ? `${abil} lub ${ABILITY_LABEL[kit.altAbility] ?? kit.altAbility}`
    : abil;
  const uses = kit.actions.map(a => `<li>${a.name} (ST ${a.dc})</li>`).join("");
  let html = `<p><strong>Cecha:</strong> ${abilLine} &nbsp;|&nbsp; <strong>Waga:</strong> ${kit.weight} kg</p>`;
  html += `<p><strong>Używanie:</strong></p><ul>${uses}</ul>`;
  if ( kit.produkcjaEntries ) {
    const line = kit.produkcjaEntries.map(e => _produkcjaEntryHtml(e, links)).join(", ");
    html += `<p><strong>Produkcja:</strong> ${line}.</p>`;
  } else if ( kit.produkcja ) {
    html += `<p><strong>Produkcja:</strong> ${kit.produkcja}</p>`;
  }
  if ( kit.special ) html += `<p>${kit.special}</p>`;
  return html;
}

/**
 * Short blurb for `system.description.chat` — dnd5e's chat-card body prefers this over
 * the full `description.value` (see `ItemDataModel#getCardData`: `description.chat ||
 * description.value`), and it is NOT per-activity (stock tools don't vary card body text
 * by which activity fired — only the button/subtitle do). Without this, every action's
 * card falls back to the full reference description (Cecha/Używanie list/Produkcja
 * links/special note) — correct on the item sheet, way too much to repeat on every roll.
 * Which action was actually used is instead carried by the per-activity `chatFlavor`
 * (→ card subtitle, see `_buildCheckActivity`) and the roll button's own DC label.
 */
function _toolkitChatDescription(kit) {
  const abil = ABILITY_LABEL[kit.ability] ?? kit.ability;
  const abilLine = kit.altAbility ? `${abil} lub ${ABILITY_LABEL[kit.altAbility] ?? kit.altAbility}` : abil;
  return `<p><strong>Cecha:</strong> ${abilLine}</p>`;
}

/**
 * Build the bare `tool` item data for a toolkit (WITHOUT activities — those are created
 * afterwards via `item.createActivity`, per dnd5e 5.3 quirk).
 * @param {Toolkit} kit
 * @param {Map<string, Item|Item[]>} [links]  Resolved `produkcjaEntries` link targets (see `_resolveProdukcjaLinks`).
 * @returns {object}
 */
export function buildToolkitItemData(kit, links) {
  return {
    name: kit.label,
    type: "tool",
    img: _toolkitImg(kit),
    system: {
      type: { value: "tool", baseItem: kit.id },
      ability: kit.ability,
      proficient: null,
      description: {
        value: _toolkitDescription(kit, links),
        // Only kits on the native check activity actually get a chevron chat card per
        // use — the old preUseActivity-cancelling kits never reach getCardData() at all.
        ...(kit.nativeCheck ? { chat: _toolkitChatDescription(kit) } : {})
      },
      weight: { value: kit.weight, units: "kg" },
      price: { value: kit.price, denomination: "gp" },
      quantity: 1
    },
    flags: { [MODULE_ID]: { toolkit: kit.id } }
  };
}

/** Build the check-activity payload for one ST action (or the generic test). */
function _buildCheckActivity(kit, { name, dc, gate }) {
  return {
    name,
    // `chatFlavor` becomes the chat card's SUBTITLE (see ActivityMixin#_usageChatContext:
    // `this.description.chatFlavor || data.subtitle`) — without it every action's card
    // shows the same generic item-type subtitle ("Narzędzia"), giving no visual cue as to
    // which of the kit's several actions was actually rolled.
    description: { chatFlavor: dc == null ? name : `${name} (ST ${dc})` },
    check: {
      ability: kit.ability,
      associated: [kit.id],
      dc: { calculation: "", formula: dc == null ? "" : String(dc) }
    },
    // Opts into a registered check gate (see toolkit-check-activity.mjs) — a pre-roll
    // picker dialog and an early "nothing eligible" block. Only meaningful together
    // with `nativeCheck: true` (the gate lives on NeuroToolCheckActivity).
    ...(gate ? { flags: { [MODULE_ID]: { checkGate: gate } } } : {})
  };
}

/**
 * Create (or refresh) toolkit `tool` items on the given actor (by default the
 * Zbrojownia master). Upserts by `system.type.baseItem`; rebuilds activities on
 * every run.
 * @param {Actor} [actor]           Defaults to the flagged Zbrojownia actor.
 * @param {object} [options]
 * @param {string[]} [options.only] Restrict to these toolkit ids (default: all).
 * @returns {Promise<{created:number, updated:number}>}
 */
export async function createToolkits(actor, { only } = {}) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if ( !actor ) {
    ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia).");
    return { created: 0, updated: 0 };
  }

  let created = 0;
  let updated = 0;

  // Resolve produkcja @UUID links once per run, only if a targeted kit needs them
  // (currently just kowala) — avoids provisioning gear stubs/armors for no reason.
  const kitsInRun = TOOLKITS.filter(k => !k.skip && (!only || only.includes(k.id)));
  const links = kitsInRun.some(k => k.produkcjaEntries) ? await _resolveProdukcjaLinks() : undefined;

  for ( const kit of kitsInRun ) {
    const activityType = kit.nativeCheck ? TOOLKIT_CHECK_ACTIVITY_TYPE : "check";
    const data = buildToolkitItemData(kit, links);
    let item = actor.items.find(i => i.type === "tool" && i.system.type?.baseItem === kit.id);

    if ( item ) {
      await item.update(data);
      updated++;
    } else {
      const [doc] = await actor.createEmbeddedDocuments("Item", [data]);
      item = doc;
      created++;
    }

    // Wipe ALL activities (incl. dnd5e's auto-created default "Check"), then rebuild.
    for ( const a of Array.from(item.system.activities) ) await item.deleteActivity(a.id);

    // Generic "Test narzędzi" (no DC) + one Check per ST action.
    await item.createActivity(activityType, _buildCheckActivity(kit, { name: "Test narzędzi", dc: null }), { renderSheet: false });
    for ( const action of kit.actions ) {
      await item.createActivity(activityType, _buildCheckActivity(kit, action), { renderSheet: false });
    }

    // Mały medyk: special "Przywracanie PW" utility activity (tiered heal handled by
    // toolkit-medyk.mjs via the dnd5e.postUseActivity hook) + initialise medicine supply.
    if ( kit.heal ) {
      await item.createActivity("utility", {
        name: "Przywracanie PW",
        img: `modules/${MODULE_ID}/icons/tools/${kit.id}.svg`
      }, { renderSheet: false });
      const healAct = Array.from(item.system.activities).find(a => a.name === "Przywracanie PW");
      if ( healAct ) {
        await item.updateActivity(healAct.id, { flags: { [MODULE_ID]: { [MEDYK_HEAL_FLAG]: true } } });
      }
      // Medicine supply = native item charges (editable in inventory / item sheet → restock).
      await item.update({ "system.uses.max": String(MEDYK_MAX_CHARGES), "system.uses.spent": 0 });
    }
  }

  ui.notifications.info(`✔ Narzędzia: ${created} nowych, ${updated} odświeżonych na „${actor.name}”.`);
  console.log(`Neuroshima 5e | Toolkits: created ${created}, updated ${updated}`);
  return { created, updated };
}

/**
 * Refresh one toolkit's item data (activity type, description, links, …) on EVERY
 * actor in the world that already carries a copy — not just the Zbrojownia master.
 * Toolkit items are given to actors as independent copies (see `zbrojownia-sync.mjs`),
 * so flipping a kit to `nativeCheck: true` or editing its TOOLKITS entry only reaches
 * the Zbrojownia master unless already-distributed copies are refreshed too.
 * `createToolkits()` already upserts by `baseItem`, so this is just "run it once per
 * actor that has a match."
 * @param {string} kitId  A `TOOLKITS[].id` (e.g. "kowala").
 * @returns {Promise<{actors:number, created:number, updated:number}>}
 */
export async function syncToolkitToAllHolders(kitId) {
  let actorsTouched = 0, created = 0, updated = 0;
  for ( const actor of game.actors ) {
    if ( !actor.items.some(i => i.type === "tool" && i.system.type?.baseItem === kitId) ) continue;
    const result = await createToolkits(actor, { only: [kitId] });
    actorsTouched++;
    created += result.created;
    updated += result.updated;
  }
  console.log(`Neuroshima 5e | Toolkit "${kitId}" synced to ${actorsTouched} actor(s) (${created} new, ${updated} refreshed).`);
  return { actors: actorsTouched, created, updated };
}
