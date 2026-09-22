/**
 * Neuroshima 5e — model danych magazynków symulacyjnych.
 *
 * Projekt: PLAN_magazynki.md. Ten plik jest warstwą PRZECHOWYWANIA I REGUŁ; `weapons/magazine.mjs`
 * siedzi na nim i dokłada UI, aktywności, dźwięki i karty czatu. Rozdzielenie jest po to, żeby
 * `consumeRounds()` — jedyne lejko, przez które naboje wychodzą z broni — dało się testować
 * bez dotykania dialogów.
 *
 * ## Gdzie co siedzi
 *
 * Na broni (`weapon`):
 * ```
 * flags[MOD].weaponId  = "ar"                    // model; tożsamość, nie stan
 * flags[MOD].loadedMag = "<itemId>" | null       // wpięty pojemnik (mag / belt / quiver)
 * flags[MOD].rounds    = ["762", …]              // kolejka WEWNĘTRZNA (wmag / beb)
 * flags[MOD].chamber   = { caliberId: "556_ap" | null }
 * ```
 * Na pojemniku (`consumable`):
 * ```
 * flags[MOD].magazine  = { id: "mag-ar", rounds: ["556_ap", "556", …] }
 * ```
 *
 * `magwell`, `caliber` i `capacity` **nie są** duplikowane na instancję — rozwiązują się
 * z `config/magazines-data.mjs` po `id`. Ten sam wzorzec co broń: pack stempluje id, runtime
 * dokłada resztę. Pojemnik o nierozpoznanym `id` jest inertny.
 *
 * ## Kolejność w kolejce to kolejność WYSTRZAŁU
 *
 * `rounds[0]` leci następny. Realnie magazynek jest stosem — ostatni włożony wychodzi pierwszy —
 * ale nikt tak nie myśli ani nie chce tak klikać, a kierunek fizycznego stosu to zero zysku
 * i gwarantowane pomyłki. Lista jest zawsze wyświetlana i edytowana w kolejności wystrzału.
 *
 * ## Dwie projekcje, zero cache'u decyzyjnego
 *
 * `flags[MOD].mag` (`{ current, max, ammoType }`) i `system.uses.max/spent` są **widokami** —
 * pisze je wyłącznie `projectMagazineState()`, po każdej mutacji źródła, żeby karta postaci
 * i `auditWeapons()` miały co czytać. **Żadna decyzja o obrażeniach ani o zużyciu amunicji nie
 * wolno się o nie oprzeć.** Obrażenia czytają to, co zwróciło `consumeRounds()`; stan czyta
 * `getMag()`, które liczy z kolejki. Projekcja, na której ktoś oprze regułę, natychmiast staje
 * się cache'em wymagającym unieważniania w każdym trybie ognia osobno — dokładnie tym, czego
 * PLAN_magazynki.md §8 zabrania.
 */

import {
  WEAPON_MAP, WEAPONS, REMOVABLE_SOURCES, magwellOf, hasChamber, onMagazineModel
} from "../config/weapons-data.mjs";
import {
  magazineDef, magazinesForMagwell, speedloadersFor, magazineWeight, MAG_SUBTYPES
} from "../config/magazines-data.mjs";
import { AMMO_CALIBER_MAP, familyCalibers } from "../config/ammo-data.mjs";
import { isDocumentLive } from "../doc-liveness.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export const FLAG = Object.freeze({
  WEAPON_ID: "weaponId",
  LOADED_MAG: "loadedMag",
  ROUNDS: "rounds",
  CHAMBER: "chamber",
  MAGAZINE: "magazine",
  PROJECTION: "mag"
});

/* -------------------------------------------- */
/*  Bramka: kto podlega symulacji                */
/* -------------------------------------------- */

/**
 * Symulacja magazynków dotyczy **pionków sterowanych przez graczy**, i tylko ich.
 *
 * RAW stawia tę granicę samo (*Notatnik Łowcy*, LICZENIE AMUNICJI: „Przeciwnicy […] mają jeden
 * pełny magazynek lub bębenek"), a decyzja MG doprecyzowała ją do reguły, która nie zależy od
 * intencji: **pionki graczy mają zabawę i złożoność, pionki MG są prostsze i szybsze w obsłudze.**
 * Dlatego to biała lista po `type === "character"`, a nie czarna po `"npc"` — pojazd z Browningiem
 * na trójnogu też jest pionkiem MG, mimo że nie jest NPC-em, i „wszystko poza npc" wpuściłoby go
 * do środka bez pytania.
 *
 * Towarzysz gracza (np. Evie) jest w systemie automatycznie, bo jest aktorem typu `character` —
 * żadnego wyjątku to nie wymaga.
 *
 * Zbrojownia jest wyłączona: to katalog-wystawka, nie postać. 74 magazynki na jednym aktorze to
 * śmieci, a `createWeapons()` i tak nadpisuje jej broń przy każdym buildzie.
 *
 * @param {Actor5e|null} actor
 * @returns {boolean}
 */
export function inMagazineSystem(actor) {
  if (!actor) return false;
  if (actor.type !== "character") return false;
  if (actor.getFlag?.(MODULE_ID, "isZbrojownia")) return false;
  return true;
}

/* -------------------------------------------- */
/*  Tożsamość modelu broni — bez fuzzy matchingu */
/* -------------------------------------------- */

/** Nazwa kanoniczna → slug. Join na danych, które sami wygenerowaliśmy, nie na świecie. */
const NAME_TO_SLUG = new Map(WEAPONS.map(w => [w.name, w.id]));

/** Leniwie budowana mapa UUID przedmiotu w packu `bron` → slug. Patrz `_compendiumSlug()`. */
let _packSlugs = null;

/**
 * Warstwa 2 rozstrzygania modelu: `_stats.compendiumSource`.
 *
 * FVTT v14 stempluje UUID źródła na dokumencie przy KAŻDYM drag&dropie, zanim karta postaci
 * zobaczy dane (`ClientDocument.fromDropData()`, `client/documents/abstract/client-document.mjs`)
 * — bez naszego kodu. Mapa UUID → slug jest tu budowana z indeksu packa przez **dokładne**
 * dopasowanie nazwy, co nie jest zgadywaniem: pack został zbudowany z `WEAPONS`, więc jego nazwy
 * są kanoniczne z konstrukcji. To nie ma nic wspólnego z dopasowywaniem nazw ze świata, gdzie
 * siedzą „Trzydziestka", „AK" i „H&K G3" — tam zgadywanie jest zabronione.
 *
 * Warstwa jest **ubezpieczeniem, nie główną drogą**: przedmiot wyciągnięty z tego packa i tak
 * przychodzi z wystemplowanym `flags.weaponId` (patrz `buildWeaponItemData`). Przydaje się, gdy
 * flaga gdzieś po drodze zniknie.
 */
function _compendiumSlug(uuid) {
  if (!uuid) return null;
  if (_packSlugs === null) {
    _packSlugs = new Map();
    const pack = game?.packs?.get(`${MODULE_ID}.bron`);
    for (const entry of (pack?.index ?? [])) {
      const slug = NAME_TO_SLUG.get(entry.name);
      if (slug) _packSlugs.set(`Compendium.${MODULE_ID}.bron.Item.${entry._id}`, slug);
    }
  }
  return _packSlugs.get(uuid) ?? null;
}

/**
 * Slug modelu broni, albo `null`. **Żadnego dopasowania rozmytego, na żadnym poziomie.**
 *
 * Kolejność:
 *   1. `flags.<mod>.weaponId` — stemplowany przez pack i `createWeapons()`
 *   2. `_stats.compendiumSource` — darmowy backup z rdzenia FVTT
 *   3. `system.identifier` — **dokładny** klucz w `WEAPON_MAP`, nic więcej
 *   4. `null` ⇒ broń nie obsługuje wymiennych magazynków
 *
 * `null` nie jest błędem i nie jest awarią: ręcznie zrobiona broń w świecie („Winchester",
 * „Rewolwer .38") po prostu jest poza systemem magazynków. Klasy rozmiaru służą wtedy już tylko
 * do ikon i cen, i **nie są** fallbackiem kompatybilności — zgadywanie „to pistolet, więc weźmie
 * krótki magazynek" jest dokładnie tym, co ten plan wyrzucił.
 */
export function weaponIdOf(item) {
  if (!item || item.type !== "weapon") return null;

  const stamped = item.getFlag?.(MODULE_ID, FLAG.WEAPON_ID)
    ?? item.flags?.[MODULE_ID]?.[FLAG.WEAPON_ID];
  if (stamped && WEAPON_MAP[stamped]) return stamped;

  const fromPack = _compendiumSlug(item._stats?.compendiumSource);
  if (fromPack) return fromPack;

  const ident = item.system?.identifier;
  if (ident && WEAPON_MAP[ident]) return ident;

  return null;
}

/** Wpis z `WEAPONS` dla tej broni, albo `null`. */
export function weaponEntry(item) {
  const id = weaponIdOf(item);
  return id ? WEAPON_MAP[id] : null;
}

/** Gniazdo magazynka tej broni, albo `null` (= brak wymiennego źródła). */
export function weaponMagwell(item) {
  return magwellOf(weaponEntry(item));
}

/**
 * Tryb podawania **czytany z instancji**, nie z katalogu.
 *
 * Właściwości potrafią się na egzemplarzu rozjechać z tabelą (patrz `auditWeapons()`), a od
 * `przeladowanie`/`ladowanie` zależy, czy gracz może w tej chwili strzelić — więc decyduje to,
 * co broń naprawdę ma, nie to, co powinna mieć.
 */
export function feedOf(item) {
  const props = item?.system?.properties;
  const has = k => (props instanceof Set ? props.has(k) : !!props?.[k]) || Array.isArray(props) && props.includes(k);
  return (has("przeladowanie") || has("ladowanie")) ? "manual" : "auto";
}

/** Czy ta broń ma komorę odrębną od źródła zasilania (czyli `+1` do pojemności). */
export function weaponHasChamber(item) {
  return hasChamber(weaponEntry(item));
}

/* -------------------------------------------- */
/*  Pojemniki jako przedmioty                    */
/* -------------------------------------------- */

/**
 * Czy item jest pojemnikiem na naboje (magazynek / taśma / kołczan / szybkoładowarka).
 *
 * Filtr po `system.type.subtype` zostaje z systemu kwantowego, żeby panel ekwipunku i stare
 * instancje dalej się łapały — ale podtyp jest odtąd wyłącznie **klasą rozmiaru** (ikona, cena,
 * waga), nie kluczem kompatybilności.
 */
export function isMagazineItem(item) {
  return !!item
    && (item.type === "consumable")
    && (item.system?.type?.value === "ammo")
    && MAG_SUBTYPES.includes(item.system?.type?.subtype);
}

/** Definicja z `magazines-data.mjs` dla tej instancji pojemnika, albo `null` (= inertny). */
export function magazineDefOf(item) {
  const id = item?.getFlag?.(MODULE_ID, FLAG.MAGAZINE)?.id
    ?? item?.flags?.[MODULE_ID]?.[FLAG.MAGAZINE]?.id;
  return magazineDef(id);
}

/** Kolejka naboi w pojemniku, w kolejności wystrzału. Zawsze świeża kopia. */
export function magazineRounds(item) {
  const raw = item?.getFlag?.(MODULE_ID, FLAG.MAGAZINE)?.rounds
    ?? item?.flags?.[MODULE_ID]?.[FLAG.MAGAZINE]?.rounds;
  return Array.isArray(raw) ? [...raw] : [];
}

/** Krótki opis zawartości: „12× AP, 6× smugowy" albo „—". */
export function describeRounds(rounds) {
  if (!rounds?.length) return "—";
  const counts = new Map();
  for (const id of rounds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, n]) => {
    const label = AMMO_CALIBER_MAP[id]?.label ?? id;
    return `${n}× ${label}`;
  }).join(", ");
}

/**
 * Wszystkie pojemniki w ekwipunku aktora, które pasują do tej broni.
 *
 * Magazynki, taśmy i kołczany dobierają się po **gnieździe** (`magwell`); szybkoładowarki po
 * **kalibrze i liczbie komór**, bo pierścień naboi pasuje do każdego bębenka tego kalibru —
 * to nie jest wyjątek w kodzie, tylko druga, jawnie zapisana reguła kompatybilności.
 *
 * Nie filtruje po tym, czy pojemnik jest pełny: pusty magazynek też wolno wpiąć (i bywa to
 * sensowne — zwalnia ręce, a broń zostaje z nabojem w komorze).
 */
export function compatibleMagazines(actor, weapon) {
  if (!actor || !weapon) return [];
  const entry = weaponEntry(weapon);
  if (!entry?.mag) return [];

  const well = magwellOf(entry);
  const wanted = new Set();

  if (well) for (const def of magazinesForMagwell(well)) wanted.add(def.id);
  if (entry.mag.kind === "beb") {
    for (const def of speedloadersFor(entry.caliber, entry.mag.max)) wanted.add(def.id);
  }
  if (!wanted.size) return [];

  return actor.items.filter(i => {
    if (!isMagazineItem(i)) return false;
    const def = magazineDefOf(i);
    return !!def && wanted.has(def.id);
  });
}

/* -------------------------------------------- */
/*  Źródło zasilania                             */
/* -------------------------------------------- */

/**
 * Skąd ta broń bierze naboje, ujednolicone do jednego kształtu.
 *
 * ```
 * { kind, capacity, caliber, rounds, item, def }
 *   kind     "magazine" = wpięty pojemnik | "internal" = kolejka w samej broni
 *   item     dokument, na którym siedzi kolejka (pojemnik albo sama broń)
 *   def      wpis z magazines-data.mjs, gdy kind === "magazine"
 * ```
 *
 * `null` znaczy „nie ma z czego strzelać": broń bez wpiętego magazynka, broń poza systemem
 * (nierozpoznany model) albo broń bez żadnego zasilania (LAW — właściwość `jednorazowa`,
 * nigdy nie była w systemie magazynków).
 *
 * To ta funkcja sprawia, że `wmag`/`beb` nie są przypadkiem specjalnym w niczym powyżej:
 * rewolwer ma źródło o pojemności 6 i kolejkę we własnych flagach, a AR ma źródło o pojemności
 * z magazynka. Reszta kodu nie widzi różnicy.
 */
export function getSource(weapon) {
  const entry = weaponEntry(weapon);
  if (!entry?.mag) return null;

  if (REMOVABLE_SOURCES.includes(entry.mag.kind)) {
    const mag = loadedMagazine(weapon);
    if (!mag) return null;
    const def = magazineDefOf(mag);
    if (!def) return null;                       // inertny pojemnik — jakby go nie było
    return {
      kind: "magazine", item: mag, def,
      capacity: def.capacity, caliber: def.caliber,
      rounds: magazineRounds(mag)
    };
  }

  return {
    kind: "internal", item: weapon, def: null,
    capacity: entry.mag.max, caliber: entry.caliber,
    rounds: internalRounds(weapon)
  };
}

/** Wpięty pojemnik jako żywy dokument, albo `null`. */
export function loadedMagazine(weapon) {
  const id = weapon?.getFlag?.(MODULE_ID, FLAG.LOADED_MAG);
  if (!id) return null;
  return weapon.actor?.items?.get(id) ?? null;
}

/** Kolejka wewnętrzna broni (`wmag` / `beb`). Zawsze świeża kopia. */
export function internalRounds(weapon) {
  const raw = weapon?.getFlag?.(MODULE_ID, FLAG.ROUNDS);
  return Array.isArray(raw) ? [...raw] : [];
}

/** Kaliber w komorze, albo `null`. */
export function chamberedCaliber(weapon) {
  const ch = weapon?.getFlag?.(MODULE_ID, FLAG.CHAMBER);
  return ch?.caliberId ?? null;
}

/**
 * Pełny stan broni jako czysta struktura — wejście dla reguł i dla `getMag()`.
 * Nie dotyka bazy; `applyState()` jest jej odwrotnością.
 */
export function readState(weapon) {
  const entry = weaponEntry(weapon);
  const source = getSource(weapon);
  const chambered = weaponHasChamber(weapon);
  return {
    entry,
    source,
    hasChamber: chambered,
    feed: feedOf(weapon),
    chamber: chambered ? chamberedCaliber(weapon) : null,
    rounds: source ? [...source.rounds] : [],
    capacity: source?.capacity ?? 0,
    /** Nominalny kaliber broni — używany, gdy nie ma czym strzelać, żeby ikony i dźwięki miały klucz. */
    nominalCaliber: source?.caliber ?? entry?.caliber ?? ""
  };
}

/* -------------------------------------------- */
/*  Cykl strzału — jedyne lejko                  */
/* -------------------------------------------- */

/**
 * Wyjmuje jeden nabój ze stanu **w pamięci** i zwraca jego kaliber, albo `null`, gdy nie ma czym
 * strzelić. Mutuje przekazany `state`.
 *
 * Cykl jest jeden dla wszystkich broni (PLAN_magazynki.md §5):
 *   1. komora pusta → nie ma strzału
 *   2. strzał — **kaliber z komory** decyduje o obrażeniach
 *   3. komora pusta
 *   4. `auto` → natychmiast dociąga następny ze źródła; `manual` → zostaje pusta
 *
 * Broń bez komory (`beb` i osiem wpisów z `chamber: false`) strzela wprost ze źródła: komory
 * bębenka *są* pojemnością, a w Obrzynie „magazynek" to dwie lufy.
 */
function _fireOne(state) {
  if (!state.hasChamber) {
    if (!state.rounds.length) return null;
    return state.rounds.shift();
  }

  if (!state.chamber) return null;
  const fired = state.chamber;
  state.chamber = null;
  if ((state.feed === "auto") && state.rounds.length) state.chamber = state.rounds.shift();
  return fired;
}

/**
 * **Jedyna droga wyjęcia naboi z broni.** Zwraca tablicę kalibrów w kolejności wystrzału,
 * albo `null`, gdy naboi jest mniej niż `count` — wtedy nie zapisuje niczego.
 *
 * Wszystko, co przesuwa kolejkę, przechodzi tędy: strzał pojedynczy, serie KS/DS/MS, dublet,
 * ogień zaporowy, przelew do bębenka. Dzięki temu reguła dominującego naboju i odświeżenie
 * właściwości dzieją się **w jednym miejscu, dla wszystkich trybów ognia naraz** — nowy tryb
 * ognia dodany za rok dostaje to gratis. Konfigurację rzutu buduje się z tego, co ta funkcja
 * zwróciła, nigdy z osobnego odczytu stanu.
 *
 * @param {Item5e} weapon
 * @param {number} count
 * @returns {Promise<string[]|null>}
 */
export async function consumeRounds(weapon, count = 1) {
  const state = readState(weapon);
  if (!state.source) return null;

  const fired = [];
  for (let i = 0; i < count; i++) {
    const one = _fireOne(state);
    if (one === null) return null;               // niedobór — nic nie zapisujemy
    fired.push(one);
  }

  await applyState(weapon, state);
  _lastConsumed.set(weapon.uuid, fired);
  return fired;
}

/**
 * Naboje wyjęte ostatnim `consumeRounds()` na tej broni.
 *
 * Potrzebne, bo serie rozjeżdżają zużycie amunicji z rzutem na obrażenia w czasie: KS/DS/MS
 * zdejmują naboje w `use()`/`_triggerSubsequentActions()`, a MG klika „Obrażenia" na karcie
 * czatu później. Bez tego rzut obrażeń musiałby sam odczytać stan broni — czyli już po
 * zużyciu — i zobaczyłby nabój, który poleci NASTĘPNY, nie ten, który właśnie poleciał.
 *
 * Ten sam wzorzec i to samo ograniczenie co `_burstSelectionCache` w `fire-modes.mjs`: pamięć
 * procesu, jeden wpis na broń, więc dwie serie z tej samej broni „na raz" nadpisują się.
 * Przy stole strzela się po kolei, a cena alternatywy (zapis do bazy przy każdym strzale)
 * to dokładnie ten clobber `syncWeaponFireModes`, którego §8 unika.
 */
const _lastConsumed = new Map();

export function lastConsumedRounds(weapon) {
  return weapon?.uuid ? (_lastConsumed.get(weapon.uuid) ?? null) : null;
}

/**
 * Nabój, który decyduje o obrażeniach serii: **dominujący**, nie pierwszy wystrzelony.
 *
 * Zliczamy pociski per kaliber, sortujemy malejąco po liczebności i bierzemy pierwszy.
 * Remis rozstrzyga nabój, który poszedł **wcześniej** (niższy indeks w kolejce) —
 * deterministycznie i zgodnie z intuicją „co poleciało najpierw".
 *
 * Przykład: KS (3 naboje) z magazynka `[AP, smugowy, AP, …]` → 2× AP, 1× smugowy → jak AP.
 */
export function dominantCaliber(rounds) {
  if (!rounds?.length) return null;
  const counts = new Map();
  const firstIndex = new Map();
  rounds.forEach((id, i) => {
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (!firstIndex.has(id)) firstIndex.set(id, i);
  });
  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || (firstIndex.get(a[0]) - firstIndex.get(b[0])))[0][0];
}

/* -------------------------------------------- */
/*  Zapis stanu                                  */
/* -------------------------------------------- */

/** Klucze flag, przy których NIE chcemy budzić kaskady synchronizacji. Patrz `magazine.mjs`. */
export const projectionPaths = Object.freeze([
  `flags.${MODULE_ID}.${FLAG.PROJECTION}`,
  "system.uses.max",
  "system.uses.spent"
]);

/**
 * Zapisuje stan wyliczony przez reguły: kolejkę (do pojemnika albo do broni), komorę i obie
 * projekcje. Jeden `update()` na dokument, żeby nie mnożyć hooków `updateItem`.
 */
export async function applyState(weapon, state) {
  const weaponUpdate = {};

  if (state.hasChamber) {
    weaponUpdate[`flags.${MODULE_ID}.${FLAG.CHAMBER}`] = { caliberId: state.chamber ?? null };
  }

  if (state.source?.kind === "magazine") {
    await _writeMagazineRounds(state.source.item, state.rounds);
  } else if (state.source?.kind === "internal") {
    weaponUpdate[`flags.${MODULE_ID}.${FLAG.ROUNDS}`] = [...state.rounds];
  }

  Object.assign(weaponUpdate, _projectionUpdate(state));
  await weapon.update(weaponUpdate);
}

/** Kolejka + przeliczona waga pojemnika. Pełny i pusty magazynek nie mogą ważyć tyle samo. */
async function _writeMagazineRounds(magItem, rounds) {
  const def = magazineDefOf(magItem);
  await magItem.update({
    [`flags.${MODULE_ID}.${FLAG.MAGAZINE}.rounds`]: [...rounds],
    "system.weight.value": magazineWeight(def, rounds)
  });
}

/**
 * Projekcje: `flags.mag` (legacy czytelnicy, `auditWeapons()`) i `system.uses` (karta dnd5e).
 *
 * `system.uses` jest tu **widokiem tylko dlatego, że nic go nie konsumuje**: aktywności tej
 * broni mają `consumption.targets: []`, więc dnd5e nigdy samo nie dekrementuje `uses.spent`.
 * Gdyby kiedyś zaczęło — np. przez dodanie `itemUses` do jakiejś aktywności — mielibyśmy
 * podwójne odjęcie naboju albo pętlę zapisów. Test `magazynki.test.mjs` pilnuje tego wprost,
 * bo to najdroższy możliwy regres tej przebudowy.
 */
function _projectionUpdate(state) {
  const capacity = state.capacity ?? 0;
  const max = capacity + (state.hasChamber ? 1 : 0);
  const current = state.rounds.length + (state.chamber ? 1 : 0);
  return {
    [`flags.${MODULE_ID}.${FLAG.PROJECTION}`]: {
      current,
      max: state.entry?.mag ? max : null,
      ammoType: state.chamber ?? state.rounds[0] ?? state.nominalCaliber ?? ""
    },
    "system.uses.max": max,
    "system.uses.spent": Math.max(max - current, 0)
  };
}

/** Przelicza i zapisuje same projekcje, bez ruszania kolejek. */
export async function projectMagazineState(weapon) {
  const state = readState(weapon);
  if (!state.entry?.mag) return false;
  /* Broń bez flag nowego modelu niesie jeszcze stan sprzed przebudowy w `flags.mag` —
     i to jest jedyne wejście migracji. Przeliczenie projekcji skasowałoby je bezpowrotnie
     (złapane na żywo 2026-09-22: sweep przy `ready` wyzerował sześć broni, zanim migracja
     ruszyła). Pełne uzasadnienie przy `onMagazineModel()` w `config/weapons-data.mjs`. */
  if (!onMagazineModel(weapon)) return false;
  /* Projekcję wołają hooki `updateItem`, często już po tym, jak broń poszła do kasacji.
     Zapis trafiłby wtedy do nieistniejącego dokumentu — patrz `scripts/doc-liveness.mjs`. */
  if (!isDocumentLive(weapon)) return false;
  const update = _projectionUpdate(state);
  const cur = weapon.getFlag(MODULE_ID, FLAG.PROJECTION) ?? {};
  const wantMag = update[`flags.${MODULE_ID}.${FLAG.PROJECTION}`];
  const same = (cur.current === wantMag.current)
    && (cur.max === wantMag.max)
    && ((cur.ammoType ?? "") === wantMag.ammoType)
    && (Number(weapon.system.uses?.max ?? 0) === update["system.uses.max"])
    && (Number(weapon.system.uses?.spent ?? 0) === update["system.uses.spent"]);
  if (same) return false;
  await weapon.update(update);
  return true;
}

/* -------------------------------------------- */
/*  Ładowanie i rozładowywanie pojemnika         */
/* -------------------------------------------- */

/** Kalibry, które wolno wsadzić do tego pojemnika — rodzina jego kalibru. */
export function acceptedCalibers(def) {
  if (!def) return [];
  const family = familyCalibers(def.caliber);
  return family.length ? family : [AMMO_CALIBER_MAP[def.caliber]].filter(Boolean);
}

/** Ile jeszcze wejdzie do pojemnika. */
export function freeSpace(magItem) {
  const def = magazineDefOf(magItem);
  if (!def) return 0;
  return Math.max(0, def.capacity - magazineRounds(magItem).length);
}

/**
 * Dokłada `count` naboi kalibru `caliberId` **na koniec kolejności wystrzału**.
 *
 * Doklejanie na koniec, a nie na początek, jest tym, co czyni kolejkę czytelną: gracz dosypuje
 * amunicję „za" tym, co już jest, i to, co już było w magazynku, poleci pierwsze. Zwraca liczbę
 * naboi, które faktycznie weszły (obcięte o wolne miejsce).
 */
export async function loadRounds(magItem, caliberId, count) {
  const def = magazineDefOf(magItem);
  if (!def || count <= 0) return 0;
  const n = Math.min(count, freeSpace(magItem));
  if (n <= 0) return 0;
  const rounds = [...magazineRounds(magItem), ...Array(n).fill(caliberId)];
  await _writeMagazineRounds(magItem, rounds);
  return n;
}

/**
 * Wyjmuje **całą** zawartość pojemnika i zwraca ją jako mapę `caliberId → liczba`.
 *
 * Rozładowanie tylko w całości jest świadome: częściowe natychmiast rodzi pytanie „które trzy
 * naboje", a przy pełnym nie rodzi żadnego.
 */
export async function unloadAll(magItem) {
  const rounds = magazineRounds(magItem);
  if (!rounds.length) return {};
  const tally = {};
  for (const id of rounds) tally[id] = (tally[id] ?? 0) + 1;
  await _writeMagazineRounds(magItem, []);
  return tally;
}

/* -------------------------------------------- */
/*  Wpinanie / wypinanie                         */
/* -------------------------------------------- */

/**
 * Wpina pojemnik do broni, albo wypina obecny (`magItem === null`).
 *
 * **Wypięcie to wymiana z `null` jako celem** — jedna ścieżka kodu, jeden koszt, zero przypadku
 * specjalnego. Stary pojemnik zostaje w ekwipunku **ze swoją zawartością**; broń zostaje z samym
 * nabojem w komorze (`1/max`), co czyni wypięcie ściśle gorszym ofensywnie od wymiany i tym
 * samym zamyka drogę do exploita.
 *
 * Przy `feed === "auto"` wpięcie **dosyła nabój do pustej komory**. Fizycznie odpowiada to
 * przeciągnięciu zamka, które i tak jest częścią przeładowania; bez tego każdy gracz klikałby
 * dwa razy, żeby móc strzelić. Przy `feed === "manual"` komora zostaje pusta — przeładowanie
 * jest wtedy osobną, jawną czynnością i to jest cały sens tych właściwości.
 *
 * Nabój już w komorze nie jest nigdy ruszany: to on daje „podmiana przed opróżnieniem → 31/31".
 *
 * @returns {Promise<{ejected: Item5e|null, inserted: Item5e|null}|false>} false = niedozwolone
 */
export async function swapMagazineItem(weapon, magItem) {
  const entry = weaponEntry(weapon);
  if (!entry?.mag || !REMOVABLE_SOURCES.includes(entry.mag.kind)) return false;

  const ejected = loadedMagazine(weapon);
  if (magItem) {
    const def = magazineDefOf(magItem);
    if (!def || def.magwell !== magwellOf(entry)) return false;
  }

  /* Jeden magazynek może siedzieć w dokładnie jednej broni.
     Bez tego wepnięcie go do drugiej sztuki zostawiłoby PIERWSZĄ z tą samą flagą — obie
     czytałyby tę samą kolejkę, więc jeden nabój wystarczałby na dwa strzały z dwóch broni.
     Odpinamy więc wprost, zamiast liczyć na to, że gracz najpierw wypnie: to jest dokładnie
     ta zagrywka, którą §6 uznaje za pożądaną („ściągnięcie magazynka z własnej drugiej broni
     w środku walki"), tylko musi zostawiać tamtą broń pustą. */
  const takenFrom = magItem ? _detachFrom(weapon, magItem) : null;
  if (takenFrom) {
    await takenFrom.update({ [`flags.${MODULE_ID}.${FLAG.LOADED_MAG}`]: null });
    await projectMagazineState(takenFrom);
  }

  const update = {
    [`flags.${MODULE_ID}.${FLAG.LOADED_MAG}`]: magItem?.id ?? null
  };
  await weapon.update(update);

  /* Stan liczymy PO podmianie, żeby `readState` widziało już nowe źródło. */
  const state = readState(weapon);
  if (magItem && state.hasChamber && !state.chamber && (state.feed === "auto") && state.rounds.length) {
    state.chamber = state.rounds.shift();
    await applyState(weapon, state);
  } else {
    await projectMagazineState(weapon);
  }

  return { ejected: ejected ?? null, inserted: magItem ?? null, takenFrom: takenFrom ?? null };
}

/** Inna broń tego samego aktora, w której ten pojemnik siedzi w tej chwili. */
function _detachFrom(weapon, magItem) {
  for (const other of weapon.actor?.items ?? []) {
    if (other.id === weapon.id) continue;
    if (other.type !== "weapon") continue;
    if (other.getFlag(MODULE_ID, FLAG.LOADED_MAG) === magItem.id) return other;
  }
  return null;
}

/** Broń, w której ten pojemnik obecnie siedzi, albo `null`. Dla UI — czytelność, nie reguła. */
export function magazineHost(magItem) {
  for (const weapon of magItem?.actor?.items ?? []) {
    if (weapon.type !== "weapon") continue;
    if (weapon.getFlag(MODULE_ID, FLAG.LOADED_MAG) === magItem.id) return weapon;
  }
  return null;
}

/**
 * Dosyła jeden nabój ze źródła do pustej komory — RAW-owe „przeładowanie" bez zużycia amunicji.
 * Zwraca kaliber, który wszedł, albo `null`.
 */
export async function chamberNextRound(weapon) {
  const state = readState(weapon);
  if (!state.hasChamber || state.chamber || !state.rounds.length) return null;
  state.chamber = state.rounds.shift();
  await applyState(weapon, state);
  return state.chamber;
}

/**
 * Wkłada pojedynczy nabój wprost do broni (`wmag` / `beb`) — RAW dopuszcza to tylko dla
 * magazynka wewnętrznego i bębenka, nigdy dla wymiennego magazynka.
 *
 * Wchodzi **na koniec kolejki**, jak przy ładowaniu magazynka; przy pustej komorze i `auto`
 * broń od razu go dosyła, żeby jedna akcja dawała jeden gotowy strzał.
 *
 * @returns {Promise<boolean>} false = nie ma miejsca albo broń ma wymienne źródło
 */
export async function loadSingleRound(weapon, caliberId) {
  const state = readState(weapon);
  if (!state.source || (state.source.kind !== "internal")) return false;
  if (state.rounds.length + (state.chamber ? 1 : 0) >= state.capacity + (state.hasChamber ? 1 : 0)) return false;

  if (state.hasChamber && !state.chamber) state.chamber = caliberId;
  else state.rounds.push(caliberId);

  await applyState(weapon, state);
  return true;
}

/**
 * Przelewa całą zawartość szybkoładowarki do bębenka i zostawia ją pustą.
 *
 * Bębenek musi być pusty — pierścień naboi wchodzi w komory na raz albo wcale. Zwraca liczbę
 * naboi, które weszły, albo `0`.
 */
export async function pourSpeedloader(weapon, magItem) {
  const state = readState(weapon);
  const def = magazineDefOf(magItem);
  if (!def || def.kind !== "speedloader") return 0;
  if (!state.source || state.source.kind !== "internal") return 0;
  if (state.rounds.length) return 0;
  if (def.caliber !== state.source.caliber || def.capacity !== state.capacity) return 0;

  const rounds = magazineRounds(magItem);
  if (!rounds.length) return 0;

  state.rounds = rounds;
  await _writeMagazineRounds(magItem, []);
  await applyState(weapon, state);
  return rounds.length;
}

/* -------------------------------------------- */
/*  Testy                                        */
/* -------------------------------------------- */

/**
 * Czyste predykaty i reguły dla Quench (`scripts/tests/magazynki.test.mjs`). Wyłącznie rzeczy
 * bez efektów ubocznych — `_fireOne` operuje na przekazanym stanie, nigdy na dokumencie, i to
 * właśnie czyni cały cykl strzału testowalnym bez świata.
 */
export const __testing = Object.freeze({
  fireOne: _fireOne,
  projectionUpdate: _projectionUpdate,
  compendiumSlugMap: () => _packSlugs,
  lastConsumedMap: _lastConsumed
});
