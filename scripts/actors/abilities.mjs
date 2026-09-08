/**
 * Neuroshima 5e — most między starymi kluczami zdolności a realnymi przedmiotami.
 *
 * Trzy moduły broni pytają „czy ta postać ma zdolność X?": `weapons/jams.mjs`,
 * `weapons/fire-modes.mjs` i `weapons/magazine.mjs`. Pytają przez `hasAbility()`
 * i `ABILITY_KEYS` — nazwane klucze, które powstały, zanim w module istniały
 * jakiekolwiek packi ze zdolnościami.
 *
 * ## Co się zmieniło
 *
 * Wcześniej odpowiedź brała się z flag `flags.<mod>.abilities.<klucz>`,
 * ustawianych ręcznie w panelu prototypowym na karcie aktora (osobno dla aktora
 * i dla pionka). Panel został usunięty: wszystkie siedem zdolności ma dziś realne
 * przedmioty w compendiach, a przedmiot jest jedynym źródłem prawdy — widać go
 * na karcie, ma tekst z podręcznika i wchodzi przez awans postaci.
 *
 * | Klucz | Realny przedmiot | Pack |
 * |---|---|---|
 * | `jakDbaszTakMasz` | zdolność klasowa `Jak dbasz, tak masz` | `zdolnosci-klasowe` |
 * | `gradOlowiu` | Sztuczka `Grad ołowiu` | `sztuczki` |
 * | `ruchomeGniazdoCkm` | Sztuczka `Ruchome gniazdo CKM` | `sztuczki` |
 * | `szturmowiec` | Sztuczka `Szturmowiec` | `sztuczki` |
 * | `szybkaWymiana` + `szybkiePrzeladowanie` | Sztuczka `Szybkie palce` (obie naraz) | `sztuczki` |
 * | `wychuchanaSpluwa` | zdolność z Pochodzenia `Wychuchana spluwa` | `zdolnosci-pochodzenia` |
 * | `bezDna` | klauzula „Bez dna" Sztuczki `Pakowanie` | `sztuczki` |
 *
 * Mapowanie nie mieszka tutaj — deklarują je same dane (`legacyAbilityKey` /
 * `legacyAbilityKeys` w `class-features-data.mjs`, `sztuczki-data.mjs`,
 * `pochodzenia-data.mjs`), więc dopisanie zdolności do packa od razu ją wpina.
 *
 * ## Dopasowanie po nazwie
 *
 * Ostatnia furtka: przedmiot o pasującej nazwie, bez flagi z packa. Zostaje dla
 * postaci zmigrowanych z Roll20, którym MG wpisał zdolności ręcznie jako zwykłe
 * `feat`y (np. `Szturmowiec` u Góry). Nowe postacie powinny dostawać przedmioty
 * z compendium.
 */
import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { SZTUCZKI } from "../config/sztuczki-data.mjs";
import { ORIGIN_ABILITIES } from "../config/pochodzenia-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export const ABILITY_KEYS = {
  JAK_DBASZ_TAK_MASZ: "jakDbaszTakMasz",
  WYCHUCHANA_SPLUWA: "wychuchanaSpluwa",
  SZYBKA_WYMIANA: "szybkaWymiana",
  SZYBKIE_PRZELADOWANIE: "szybkiePrzeladowanie",
  GRAD_OLOWIU: "gradOlowiu",
  RUCHOME_GNIAZDO_CKM: "ruchomeGniazdoCkm",
  SZTURMOWIEC: "szturmowiec",
  BEZ_DNA: "bezDna",
  SAMURAJ: "samuraj"
};

/**
 * Etykieta i kolor paska w komunikatach „wyjątek reguły", plus nazwy, po których
 * rozpoznajemy ręcznie wpisane przedmioty.
 */
export const ABILITY_DEFINITIONS = {
  [ABILITY_KEYS.JAK_DBASZ_TAK_MASZ]: {
    label: "Jak dbasz, tak masz",
    aliases: ["jak dbasz, tak masz"],
    noticeColor: "#35566b"
  },
  [ABILITY_KEYS.WYCHUCHANA_SPLUWA]: {
    label: "Wychuchana spluwa",
    aliases: ["wychuchana spluwa"],
    noticeColor: "#7a5a00"
  },
  [ABILITY_KEYS.SZYBKA_WYMIANA]: {
    label: "Szybka wymiana",
    aliases: ["szybka wymiana", "szybkie palce"],
    noticeColor: "#556b2f"
  },
  [ABILITY_KEYS.SZYBKIE_PRZELADOWANIE]: {
    label: "Szybkie przeładowanie",
    aliases: ["szybkie przeładowanie", "szybkie palce"],
    noticeColor: "#556b2f"
  },
  [ABILITY_KEYS.GRAD_OLOWIU]: {
    label: "Grad ołowiu",
    aliases: ["grad ołowiu"],
    noticeColor: "#8b3d2f"
  },
  [ABILITY_KEYS.RUCHOME_GNIAZDO_CKM]: {
    label: "Ruchome gniazdo CKM",
    aliases: ["ruchome gniazdo ckm"],
    noticeColor: "#6b3f1f"
  },
  [ABILITY_KEYS.SZTURMOWIEC]: {
    label: "Szturmowiec",
    aliases: ["szturmowiec"],
    noticeColor: "#7a4b2f"
  },
  [ABILITY_KEYS.BEZ_DNA]: {
    label: "Bez dna",
    // "bez dna" covers Raynald's actual shape: TWO differently-capitalised bare-name feats
    // ("Bez Dna" AND "Bez dna") for just this one clause — `_normalizeName` lowercases before
    // matching, so one alias covers both. "pakowanie" covers the OTHER shape: a real compendium
    // item literally named after the whole Sztuczka ("Pakowanie"), which grants this clause too.
    aliases: ["bez dna", "pakowanie"],
    noticeColor: "#4a6b4a"
  },
  [ABILITY_KEYS.SAMURAJ]: {
    label: "Samuraj",
    // Victor's sheet carried this Sztuczka split into three separately-named clauses
    // (Osełka / Dobycie / Zasłona) — merged into one canonical item in IMPLEMENTATION.md (21).
    // The clause names stay as aliases so a re-import of that shape still resolves.
    aliases: ["samuraj", "osełka", "oselka", "zasłona", "zaslona"],
    noticeColor: "#6b4a4a"
  }
};

/** Flaga na przedmiocie -> etykieta źródła zwracana przez `getResolvedAbility()`. */
const ITEM_FLAGS = {
  abilityId: "feature",
  sztuczka: "sztuczka",
  originAbilityId: "pochodzenie"
};

export function registerActorAbilities() {
  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.abilities = {
      ABILITY_KEYS,
      ABILITY_DEFINITIONS,
      getAbilityDefinitions,
      getAbilityLabel,
      getResolvedAbility,
      hasAbility,
      buildAbilityRuleChangeNotice
    };
  }

  console.log("Neuroshima 5e | Ability bridge registered (item-based)");
}

export function getAbilityDefinitions() {
  return ABILITY_DEFINITIONS;
}

export function getAbilityLabel(abilityKey) {
  return ABILITY_DEFINITIONS[abilityKey]?.label ?? String(abilityKey ?? "Zdolność");
}

export function buildAbilityRuleChangeNotice(abilityKey, text, { standalone = false } = {}) {
  const label = getAbilityLabel(abilityKey);
  const color = ABILITY_DEFINITIONS[abilityKey]?.noticeColor ?? "#35566b";
  const prefix = `Wyjątek reguły - ${label}:`;
  if (standalone) {
    return `<div style="border-left:3px solid ${color};padding-left:8px"><strong>${prefix}</strong> ${text}</div>`;
  }
  return `<div style="margin-top:6px;font-size:12px;color:${color};"><strong>${prefix}</strong> ${text}</div>`;
}

/**
 * `legacyKey -> { <flaga przedmiotu>: Set<id> }`, zbudowane raz z trzech modułów danych.
 * @type {Map<string, Record<string, Set<string>>>|null}
 */
let _index = null;

function _getIndex() {
  if (_index) return _index;
  _index = new Map();

  const add = (legacyKey, flag, id) => {
    if (!legacyKey || !ABILITY_DEFINITIONS[legacyKey]) return;
    const entry = _index.get(legacyKey) ?? {};
    (entry[flag] ??= new Set()).add(id);
    _index.set(legacyKey, entry);
  };

  try {
    for (const f of Object.values(CLASS_FEATURES)) add(f.legacyAbilityKey, "abilityId", f.id);
    for (const [key, s] of Object.entries(SZTUCZKI)) {
      for (const legacy of s.legacyAbilityKeys ?? []) add(legacy, "sztuczka", key);
    }
    for (const [id, o] of Object.entries(ORIGIN_ABILITIES)) add(o.legacyAbilityKey, "originAbilityId", id);
  } catch (err) {
    console.warn(`${MODULE_ID} | ability index unavailable`, err);
  }
  return _index;
}

/**
 * Czy (i skąd) postać ma daną zdolność.
 *
 * @param {Actor} actor
 * @param {string} abilityKey  Klucz z `ABILITY_KEYS`.
 * @returns {{enabled: boolean, source: string, item: Item|null}}
 */
export function getResolvedAbility(actor, abilityKey) {
  if (!ABILITY_DEFINITIONS[abilityKey]) return { enabled: false, source: "unknown", item: null };

  const wanted = _getIndex().get(abilityKey);
  const items = Array.from(actor?.items ?? []);

  if (wanted) {
    for (const [flag, source] of Object.entries(ITEM_FLAGS)) {
      const ids = wanted[flag];
      if (!ids) continue;
      const item = items.find(i => ids.has(i.getFlag(MODULE_ID, flag)));
      if (item) return { enabled: true, source, item };
    }
  }

  const aliases = ABILITY_DEFINITIONS[abilityKey].aliases ?? [];
  const named = items.find(i => aliases.some(alias => _normalizeName(i.name).includes(alias)));
  if (named) return { enabled: true, source: "item", item: named };

  return { enabled: false, source: "none", item: null };
}

export function hasAbility(actor, abilityKey) {
  return getResolvedAbility(actor, abilityKey).enabled === true;
}

function _normalizeName(value) {
  return String(value ?? "").trim().toLowerCase();
}
