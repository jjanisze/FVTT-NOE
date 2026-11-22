/**
 * Finish manifest · family rules (PLAN_m9_style.md §7.2).
 *
 * A family comes from data — pack, item type, subtype and the module's own flags — never from a
 * file name. A record no rule covers, or one that could go two ways, is reported as a gap; the
 * engine then leaves it on its white master. Nothing here guesses.
 *
 * Rules settled in the reviews:
 *  - the source is fixed: a Sztuczka wears the Generic ground whoever owns it; a profession and
 *    its features inherit the class;
 *  - passive, mixed and activated features share one recipe — the ground is identity, not activity;
 *  - a weapon operation stays an operation next to the equipment.
 */

import { FANTY, GRUPY_FANTOW, grupaFantu } from "../../scripts/config/fanty-data.mjs";

export const MODULE_ID = "neuroshima-2026-overrides";

/** Identity subjects are exported at 256 px (D15); everything else at 128 px. */
const IDENTITY = 256;
const CONTENT = 128;

const MEDICAL = new Set(["leczniczy", "antybiotyk", "popromienna", "przewlekla", "bojowy"]);
const CHEMICAL = new Set(["uzywka", "narkotyk"]);
const FANT_SURVIVAL = new Set(["jedzenie", "napoj"]);
const PRODUCTION_MEDICAL = new Set(["defibrylator", "srodki-dezynfekujace"]);
const PRODUCTION_CHEMICAL = new Set(["srodek-usypiajacy", "trucizna"]);
const EQUIPMENT_PACKS = new Set(["bron", "amunicja", "magazynki", "granaty", "pancerze", "narzedzia", "lekarstwa", "sprzet", "schematy"]);

/**
 * @param {{pack: string, doc: object, classOf: (uuid: string) => string[]}} ctx
 * @returns {{family: string, size: number, canonicalSource?: string} | {gap: string}}
 */
export function familyOf({ pack, doc, uuid, embedded, classOf, professions }) {
  const flags = doc.flags?.[MODULE_ID] ?? {};
  const type = doc.type;
  const subtype = doc.system?.type?.value ?? "";
  const subsubtype = doc.system?.type?.subtype ?? "";

  if (embedded) {
    if (pack === "bestiariusz" || pack === "towarzysze") return { family: "creature", size: CONTENT, canonicalSource: "generic" };
    if (pack === "pojazdy") return { gap: "Cechy i czynności pojazdów — profil nie definiuje rodziny" };
    return { gap: `Dokument osadzony w paczce ${pack} bez reguły` };
  }

  switch (pack) {
    case "klasy":
      if (type === "class" && flags.classId && !flags.towarzysz) return { family: flags.classId, size: IDENTITY, canonicalSource: flags.classId };
      return { gap: "Klasa techniczna (Towarzysz) — nie jest tożsamością gracza" };
    case "profesje":
      if (type === "subclass" && flags.klasa) return { family: flags.klasa, size: IDENTITY, canonicalSource: flags.klasa };
      break;
    case "zdolnosci-klasowe": {
      const owner = flags.owner;
      const direct = professions.get(owner) ?? owner;
      // An option ("wyjadacz-option") has no class of its own: follow who grants it.
      const classes = classOf(uuid);
      const candidates = new Set(classes.length ? classes : []);
      if (!candidates.size && direct) candidates.add(direct);
      if (candidates.size === 1) return { family: [...candidates][0], size: CONTENT, canonicalSource: [...candidates][0] };
      if (candidates.size > 1) return { family: "shared", size: CONTENT, canonicalSource: "generic" };
      break;
    }
    case "sztuczki":
      return { family: "feat", size: CONTENT, canonicalSource: "generic" };
    case "pochodzenia":
      if (type === "background") return { family: "origin", size: IDENTITY, canonicalSource: "origin" };
      break;
    case "zdolnosci-pochodzenia":
      return { family: "origin", size: CONTENT, canonicalSource: "origin" };
    case "bron":
      if (type === "weapon") return { family: "weapon", size: CONTENT };
      break;
    case "amunicja":
    case "magazynki":
      if (subtype === "ammo") return { family: "ammo", size: CONTENT };
      break;
    case "granaty":
      if (flags.grenade) return { family: "explosives", size: CONTENT };
      break;
    case "pancerze":
      if (flags.armorId) return { family: "armor", size: CONTENT };
      break;
    case "narzedzia":
      if (type === "tool") return { family: "tools", size: CONTENT };
      break;
    case "lekarstwa":
      if (subtype === "lekarstwo" && MEDICAL.has(subsubtype)) return { family: "medical", size: CONTENT };
      if (subtype === "lekarstwo" && CHEMICAL.has(subsubtype)) return { family: "chemicals", size: CONTENT };
      if (type === "loot" && flags.chemiaKey) return { family: "chemicals", size: CONTENT };
      break;
    case "sprzet":
      if (flags.fant) return { family: FANT_SURVIVAL.has(flags.fant.rodzaj) ? "survival" : "salvage", size: CONTENT };
      if (flags.staza || PRODUCTION_MEDICAL.has(flags.productionGearId)) return { family: "medical", size: CONTENT };
      if (flags.kwas || PRODUCTION_CHEMICAL.has(flags.productionGearId)) return { family: "chemicals", size: CONTENT };
      if (flags.detonator || flags.electricFuze || flags.radioFuze) return { family: "explosives", size: CONTENT };
      return { family: "devices", size: CONTENT };
    case "schematy":
      return { family: "documents", size: CONTENT };
  }
  return { gap: `Brak reguły dla paczki ${pack} / typu ${type}${subtype ? ` / ${subtype}` : ""}` };
}

/**
 * Subjects consumed through a config or lookup rather than a compendium document.
 * `match` is tested against the white master's path; `consumer` names where it is wired.
 */
export const CONFIG_SUBJECTS = [
  { match: /^icons\/activities\//, family: "utility", size: CONTENT, runtimeGlobal: true, why: "czynność broni (tryby ognia, przeładowanie) — operacja przy sprzęcie" },
  { match: /^icons\/actions\//, family: "utility", size: CONTENT, runtimeGlobal: true, why: "współdzielona czynność podstawowa" },
  ...["bagnet", "granatnik", "srutowka-podlufowa"].map(id => ({ source: `icons/addons/${id}.svg`, file: "scripts/weapons/addons.mjs", family: "utility", size: CONTENT, why: "obraz aktywności ataku dodanej przez osprzęt broni" })),
  { source: "icons/abilities/naprawianie.svg", file: "scripts/actors/drony.mjs", family: "utility", size: CONTENT, why: "aktywność naprawy drona; osobna od cechy stworzenia o tym samym glifie" },
  { source: "icons/items/loot/robota_nakladka.svg", file: "scripts/production/zakladka.mjs", family: "utility", size: CONTENT, why: "znacznik trwającej pracy, nie przedmiot ekwipunku" },
  { source: "icons/weapons/c4_explosive.svg", file: "scripts/items/detonator.mjs", family: "utility", size: CONTENT, why: "obraz aktywności Detonuj; kostka C4 ma własną rodzinę sprzętu" },
  ...["detonator_radiowy", "zapalnik_elektryczny", "zapalnik_radiowy"].map(id => ({ source: `icons/items/loot/${id}.svg`, file: "scripts/items/detonator.mjs", family: "explosives", size: CONTENT, why: "prototyp detonatora lub zapalnika, nie obraz jego aktywności" })),
  { source: "icons/items/loot/uzupelnienie_medyka.svg", file: "scripts/items/toolkit-medyk.mjs", family: "medical", size: CONTENT, why: "prototyp uzupełnienia zapasu medycznego" },
  { source: "icons/tools/medyka.svg", file: "scripts/items/toolkit-medyk.mjs", family: "utility", size: CONTENT, why: "aktywność uzupełniania zapasu; narzędzia zachowują rodzinę tools" },
  { source: "icons/items/loot/zetony.svg", file: "scripts/wkk/items/zeton-luxor.mjs", family: "salvage", size: CONTENT, why: "prototyp fizycznego żetonu / kosztowności" },
  { source: "icons/weapons/raca_oswietleniowa.svg", file: "scripts/wkk/items/flara.mjs", family: "ammo", size: CONTENT, why: "jednorazowa amunicja sygnałowa" },
  ...[...new Map(FANTY.map(fant => {
    const source = GRUPY_FANTOW[grupaFantu(fant)].zapas;
    const family = FANT_SURVIVAL.has(fant.rodzaj) ? "survival" : "salvage";
    return [`${source}:${family}`, { source, family, size: CONTENT, file: "scripts/config/fanty-data.mjs", why: `zapasowa ikona Fantu, rodzaj z danych: ${fant.rodzaj}` }];
  })).values()]
];

/** These are deliberate canvas/illustration assets, not missing content-icon recipes. */
export const CONFIG_EXCLUSIONS = [
  { source: "icons/doll/mannequin.webp", file: "scripts/config/doll-anchors.mjs", why: "ilustracja manekina oporządzenia — bez receptury białego glifu" },
  { source: "icons/obiekty/ramka.svg", file: "scripts/scenes/obiekty.mjs", why: "dwukolorowa natywna ramka celu na scenie — osobny kontrakt canvas" }
];

export function configSubjects({ wrapper, file }) {
  return CONFIG_SUBJECTS.filter(rule => (!rule.file || rule.file === file) && (rule.source === wrapper || rule.match?.test(wrapper)));
}

export function configExclusion({ wrapper, file }) {
  return CONFIG_EXCLUSIONS.find(rule => rule.source === wrapper && rule.file === file);
}

/** Character features keep their source ground; an equipment activity is a neutral operation. */
export function activityFamily({ pack, wrapper, verdict }) {
  const generic = configSubjects({ wrapper }).find(rule => !rule.file);
  if (generic) return generic;
  if (EQUIPMENT_PACKS.has(pack)) return { family: "utility", size: CONTENT };
  return verdict;
}

/** A script's explicit consumer rule wins; otherwise follow canonical item consumers, not a filename. */
export function scriptSubjects({ wrapper, file, known }) {
  const explicit = configSubjects({ wrapper, file });
  if (explicit.length) return explicit;
  const items = known.filter(s => [...s.consumers.values()].some(c => c.type === "pack" && ["item.img", "actor.items[].img"].includes(c.via)));
  return (items.length ? items : known).map(s => ({ family: s.family, size: s.size, why: "rodzina z konsumenta dokumentu, który używa tego mastera" }));
}

/**
 * E2 pilot (§7.5): 24 subjects — 6 classes, 2 professions, 2 Pochodzenia, 2 origin abilities,
 * 3 Sztuczki, 3 class abilities, 4 equipment families, 2 weapon operations.
 */
export const PILOT = [
  "brutal/brutal", "cwaniak/cwaniak", "spec/spec", "twardziel/twardziel", "zlodziej/zlodziej", "zwiadowca/zwiadowca",
  "twardziel/zolnierz", "spec/medyk",
  "origin/asgard", "origin/nowy-jork",
  "origin/gambling-we-krwi", "origin/cholerny-kaznodzieja",
  "feat/aramis", "feat/wrestler", "feat/gunfight",
  "twardziel/kondycha", "spec/inteligentna-obrona", "brutal/wsciekly-cios",
  "weapon/ak_47", "ammo/ammo_9_mm", "armor/kamizelka-taktyczna", "medical/medpak",
  "utility/activity_single_fire", "utility/activity_reload"
];
