/**
 * Neuroshima 5e — magazynki: akcje, aktywności, UI karty broni i fasada dla resztu modułu.
 *
 * Model danych i reguły siedzą w `weapons/magazine-model.mjs` — ten plik ich używa i dokłada
 * wszystko, co dotyka gracza: przyciski, dialogi, dźwięki, karty czatu i ekonomię akcji.
 * Projekt całości: PLAN_magazynki.md.
 *
 * ## Fasada — celowo niezmieniona
 *
 * `getMag()`, `setMag()`, `spendRound()`, `spendRounds()`, `getChamber()`, `setChamber()`
 * zachowują kontrakt z systemu kwantowego, mimo że pod spodem zmieniło się wszystko.
 * Dzięki temu `weapons/fire-modes.mjs`, `weapons/jams.mjs`, `wkk/items/pistolet-na-race.mjs`,
 * `game.neuroshima.magazynki` i istniejące paczki Quench **nie wymagały zmian**. Jeśli któryś
 * z ich testów zacznie padać, to znaczy, że fasada została złamana — i to jest sygnał do
 * naprawy fasady, nie do poprawiania tamtych testów.
 *
 * Storage się zmienił, API nie:
 * ```
 * getMag(weapon) → { current, max, ammoType }
 *   current  = (komora ? 1 : 0) + liczba naboi w źródle
 *   max      = pojemność AKTUALNEGO źródła + (komora ? 1 : 0)
 *   ammoType = kaliber naboju, który poleci NASTĘPNY (komora → głowa kolejki → nominalny)
 * ```
 *
 * ## Czego tu już nie ma
 *
 * Magazynki kwantowe: flaga `ready`, kolumna „Gotowych", `_restoreQuantumMagazines*`, hooki
 * `deleteCombat`/`deleteCombatant` i ciąganie naboi z luźnej puli przy wymianie magazynka
 * w walce. To ostatnie było bugiem, nie regułą: kod sprawdzał gotowy magazynek, ale i tak
 * odejmował naboje od `ammoItem.system.quantity`, więc `ready` był licznikiem pozwoleń,
 * nie źródłem amunicji.
 */

import { ABILITY_KEYS, buildAbilityRuleChangeNotice, hasAbility } from "../actors/abilities.mjs";
import { isJamImmune } from "./jams.mjs";
import {
  WeaponSound,
  playShotSound,
  playUtilitySound,
} from "./sounds.mjs";
import { seqScrollText } from "./sequencer.mjs";
import { tracerFire } from "./tracer-vfx.mjs";
import { AMMO_CALIBER_MAP, familyCalibers } from "../config/ammo-data.mjs";
import { addAmmoToActor } from "../actors/ammo-inventory.mjs";
import { isAtHand, provenanceBadge, clearBelt, registerHandyFamily } from "../actors/handy-items.mjs";
import { REMOVABLE_SOURCES } from "../config/weapons-data.mjs";
import { isDocumentLive } from "../doc-liveness.mjs";
import {
  readState, weaponEntry, weaponIdOf, weaponMagwell, weaponHasChamber,
  loadedMagazine, chamberedCaliber, internalRounds, consumeRounds,
  applyState, projectMagazineState, projectionPaths,
  isMagazineItem, magazineDefOf, magazineRounds, describeRounds, magazineHost,
  compatibleMagazines, acceptedCalibers, freeSpace, loadRounds, unloadAll,
  swapMagazineItem, loadSingleRound, pourSpeedloader, inMagazineSystem
} from "./magazine-model.mjs";
const MODULE_ID = "neuroshima-2026-overrides";
const MAGAZINE_TYPES = Object.freeze({
  INTERNAL: "wmag",
  CYLINDER: "beb",
  REMOVABLE: "wymienny"
});
const RELOAD_STATE_FLAG = "reloadState";
const CHAMBER_STATE_FLAG = "chamber";
const RELOAD_ACTIVITY_TYPE = "neuroReload";
const LOAD_ONE_ACTIVITY_TYPE = "neuroLoadOne";
const MAG_SWAP_ACTIVITY_TYPE = "neuroMagSwap";
const CUSTOM_ACTIVITY_TYPES = new Set(["neuroKs", "neuroDs", "neuroMs", "neuroOz", "neuroDublet", RELOAD_ACTIVITY_TYPE, LOAD_ONE_ACTIVITY_TYPE, MAG_SWAP_ACTIVITY_TYPE]);
const processedSingleShotActivities = new WeakSet();
const syncingManagedActivities = new Set();
const MANAGED_ACTIVITY_FLAGS = Object.freeze({
  MANAGED: "managedActivity",
  KIND: "magazineAction"
});

/* -------------------------------------------- */
/*  Public API                                    */
/* -------------------------------------------- */

/**
 * Stan magazynka broni — **liczony z kolejki**, nigdy odczytany z projekcji.
 *
 * Zwraca `null`, gdy broń jest poza systemem: nierozpoznany model (§3, gałąź `null`), brak
 * wpisu `mag` w tabeli (LAW — właściwość `jednorazowa`) albo aktor, którego symulacja nie
 * dotyczy (`inMagazineSystem`). `null` nie jest błędem — znaczy „nie liczymy tu amunicji".
 *
 * @param {Item5e} item
 * @returns {{ current: number, max: number, ammoType: string }|null}
 */
export function getMag(item) {
  if (!item || item.type !== "weapon") return null;
  if (item.actor && !inMagazineSystem(item.actor)) return null;

  const state = readState(item);
  if (!state.entry?.mag) return null;

  return {
    current: state.rounds.length + (state.chamber ? 1 : 0),
    max: state.capacity + (state.hasChamber ? 1 : 0),
    ammoType: state.chamber ?? state.rounds[0] ?? state.nominalCaliber ?? ""
  };
}

/**
 * Komora: `{ caliberId, loaded }`.
 *
 * `loaded` jest polem **wyprowadzonym**, trzymanym dla zgodności — `caliberId` niesie tę samą
 * informację (`null` = pusta) i dodatkowo typ naboju, który tam siedzi. Bez tego „dum-dum
 * w komorze przy samoróbkach w magazynku" nie da się wyrazić.
 */
export function getChamber(item) {
  const caliberId = weaponHasChamber(item) ? chamberedCaliber(item) : null;
  return { caliberId, loaded: caliberId != null };
}

/**
 * Ustawia liczbę naboi — **wyłącznie dla ścieżek autorskich** (karta przedmiotu w trybie
 * edycji, makra MG, `game.neuroshima.magazynki`). Zwykły przepływ gry nigdy tu nie trafia:
 * strzał idzie przez `consumeRounds()`, ładowanie przez okno ładowania.
 *
 * Kolejka jest uporządkowana, więc „ustaw na N" musi wybrać, KTÓRE naboje zniknęły albo się
 * dołożyły. Wybieramy najmniej zaskakująco: ubytek zdejmuje z **głowy** kolejki (czyli te,
 * które poleciałyby najbliżej), a nadmiar dokłada na **koniec** naboju typu `ammoType`.
 * To jedyne miejsce w module, gdzie liczba naboi jest wejściem, a nie wynikiem.
 */
export async function setMag(item, data) {
  const state = readState(item);
  if (!state.entry?.mag) return;

  if (data?.ammoType && !state.source) {
    /* Broń bez wpiętego źródła nie ma gdzie trzymać kalibru — zmiana typu naboju to czynność
       na magazynku, nie na broni. Milczące zignorowanie byłoby gorsze niż ostrzeżenie. */
    ui.notifications.warn(`${item.name}: brak wpiętego magazynka — kaliber ustawia się na magazynku.`);
    return;
  }

  if (data?.current == null) return;

  const max = state.capacity + (state.hasChamber ? 1 : 0);
  const target = Math.max(0, Math.min(Number(data.current), max));
  const caliber = data.ammoType ?? state.chamber ?? state.rounds[0] ?? state.nominalCaliber;

  /* Jedna płaska lista „komora + kolejka", przycinana/dopełniana, potem rozdzielana z powrotem.
     Ręczne żonglowanie dwoma polami naraz było tu źródłem błędów off-by-one. */
  let flat = [...(state.chamber ? [state.chamber] : []), ...state.rounds];
  if (target < flat.length) flat = flat.slice(flat.length - target);
  else while (flat.length < target) flat.push(caliber);

  if (state.hasChamber) {
    state.chamber = flat.length ? flat[0] : null;
    state.rounds = flat.slice(1);
  } else {
    state.chamber = null;
    state.rounds = flat;
  }

  await applyState(item, state);
}

/**
 * Ustawia komorę. Przyjmuje i nowy kształt (`{ caliberId }`), i stary (`{ loaded: bool }`) —
 * `wkk/items/pistolet-na-race.mjs` woła tę drugą formę i **nie ma wymagać zmiany** (kontrakt
 * fasady). `loaded: true` bez podanego kalibru bierze nominalny kaliber broni.
 */
export async function setChamber(item, data) {
  if (!weaponHasChamber(item)) return;
  const state = readState(item);
  if (!state.entry?.mag) return;

  if (data && ("caliberId" in data)) state.chamber = data.caliberId ?? null;
  else if (data?.loaded === true) state.chamber = state.chamber ?? state.nominalCaliber ?? null;
  else if (data?.loaded === false) state.chamber = null;
  else return;

  await applyState(item, state);
}

/**
 * Rodzaj zasilania: `wmag` / `beb` / `wymienny`.
 *
 * Czyta **właściwości instancji**, nie katalog, bo od tego zależy, co gracz może teraz zrobić,
 * a właściwości potrafią się na egzemplarzu rozjechać z tabelą (patrz `auditWeapons()`).
 * Kołczan i taśma są „wymienne" — wypina się je tak samo jak magazynek.
 */
export function getMagazineType(item) {
  if (_hasProperty(item, MAGAZINE_TYPES.INTERNAL)) return MAGAZINE_TYPES.INTERNAL;
  if (_hasProperty(item, MAGAZINE_TYPES.CYLINDER)) return MAGAZINE_TYPES.CYLINDER;
  return MAGAZINE_TYPES.REMOVABLE;
}

/** Czy broń bierze odpinany pojemnik (magazynek / taśma / kołczan). */
function _hasRemovableSource(item) {
  return REMOVABLE_SOURCES.includes(weaponEntry(item)?.mag?.kind);
}

/**
 * Gotowość bojowa broni — jednym słowem, na potrzeby oznaczeń w ekwipunku.
 *
 * Rozróżnia trzy rzeczy, które kolumna „Ładunki" myli, bo wszystkie pokazuje jako liczby:
 *
 * * `"missing"` — broń bierze **odpinany** pojemnik i żadnego nie ma. Desert Eagle bez
 *   magazynka projektuje `0/1` (sama komora), a z magazynkiem `0/9`. Dwie podobne liczby
 *   w tej samej kolumnie, a różnica jest fundamentalna: w pierwszym wypadku brakuje
 *   **przedmiotu**, w drugim — naboi.
 * * `"empty"` — źródło jest (magazynek albo broń z własnym magazynkiem/bębenkiem), ale puste.
 * * `"ready"` — jest czym strzelać.
 *
 * `null` znaczy „to pytanie nie dotyczy tej broni": broń biała, NPC i Zbrojownia (poza
 * systemem magazynków), broń nierozpoznana. **`null` to nie to samo co `"missing"`** —
 * rewolwer i obrzyn mają `loadedMag === null` w stanie całkowicie normalnym, bo naboje
 * siedzą w samej broni. Gdyby oznaczenie szło po `loadedMag`, świeciłoby na nich na stałe.
 *
 * @param {Item5e} item
 * @returns {"missing"|"empty"|"ready"|null}
 */
export function magazineReadiness(item) {
  const mag = getMag(item);
  if (mag === null) return null;                       // poza systemem albo bez magazynka w ogóle
  if (_hasRemovableSource(item) && !loadedMagazine(item)) return "missing";
  return mag.current > 0 ? "ready" : "empty";
}

/**
 * Deduct one round from the magazine.
 * @param {Item5e} item
 * @returns {boolean} false if magazine was already empty
 */
export async function spendRound(item) {
  return spendRounds(item, 1);
}

/**
 * Spend multiple rounds (for burst fire modes).
 * @param {Item5e} item
 * @param {number} count
 * @returns {boolean} false if not enough rounds
 */
export async function spendRounds(item, count) {
  const mag = getMag(item);
  if (!mag) return true;                          // broń poza systemem — strzelanie dozwolone

  const fired = await consumeRounds(item, count);
  if (fired) return true;

  /* Niedobór. `consumeRounds` nie zapisało niczego, więc broń jest w stanie sprzed próby. */
  if (count === 1) {
    ui.notifications.warn(`${item.name}: ${_sourceNoun(item)} pusty!`);
    playUtilitySound("click", item, WeaponSound.EMPTY_CLICK, {
      caliberId: mag.ammoType, token: item.actor,
    });
    seqScrollText("PUSTE!", item.actor, { color: "#e67e22", fontSize: 30, duration: 1800 });
  } else {
    ui.notifications.warn(`${item.name}: za mało naboi! (${mag.current}/${count})`);
  }
  return false;
}

/** „magazynek" / „bębenek" / „kołczan" — do komunikatów. */
function _sourceNoun(item) {
  const kind = weaponEntry(item)?.mag?.kind;
  if (kind === "beb") return "bębenek";
  if (kind === "quiver") return "kołczan";
  if (kind === "belt") return "taśma";
  return "magazynek";
}

/**
 * Wymiana magazynka — punkt wejścia dla makr i paska szybkiego dostępu.
 *
 * Cała logika siedzi tutaj, a nie w treści makra, z tego samego powodu co przy makrach
 * Sztuczek (`actors/ability-hotbar.mjs`): makro raz położone na pasku nigdy nie musi być
 * odtwarzane, gdy zmienią się zasady. Bez argumentów sam znajduje postać i broń.
 *
 * @param {object} [options]
 * @param {Actor5e} [options.actor]         Domyślnie postać gracza albo zaznaczony token.
 * @param {Item5e|string} [options.weapon]  Broń, jej id albo nazwa. Przy jednej pasującej
 *                                          broni pytanie się nie pojawia.
 */
export async function swapMagazine({ actor, weapon } = {}) {
  const subject = actor
    ?? game.user.character
    ?? canvas.tokens?.controlled?.[0]?.actor
    ?? null;
  if (!subject) {
    ui.notifications.warn("Nie wiem, kim grasz — zaznacz token albo przypisz postać do użytkownika.");
    return;
  }
  if (!inMagazineSystem(subject)) {
    ui.notifications.warn(`${subject.name}: ten aktor jest poza systemem magazynków (tylko postacie graczy).`);
    return;
  }

  const candidates = subject.items.filter(i =>
    i.type === "weapon" && _hasRemovableSource(i) && getMag(i) !== null);
  if (!candidates.length) {
    ui.notifications.warn(`${subject.name} nie ma broni z wymiennym magazynkiem.`);
    return;
  }

  if (weapon) {
    const wanted = typeof weapon === "string"
      ? (candidates.find(i => i.id === weapon) ?? candidates.find(i => i.name === weapon))
      : weapon;
    if (!wanted) {
      ui.notifications.warn(`${subject.name}: nie znalazłem broni "${weapon}".`);
      return;
    }
    return _onClickSwapMagazine(_getLiveItem(wanted));
  }

  if (candidates.length === 1) return _onClickSwapMagazine(_getLiveItem(candidates[0]));

  const chosen = await foundry.applications.api.DialogV2.wait({
    window: { title: "W której broni wymieniasz magazynek?" },
    content: "<p>Wybierz broń.</p>",
    buttons: candidates.map(i => {
      const mag = getMag(i);
      return { action: i.id, label: `${i.name} — ${mag?.current ?? 0}/${mag?.max ?? 0}` };
    }),
    rejectClose: false
  });
  if (!chosen) return;
  const picked = candidates.find(i => i.id === chosen);
  if (picked) return _onClickSwapMagazine(_getLiveItem(picked));
}

/**
 * Wpina podany magazynek (klik w kafelek paska podręcznego). Broń wybierana spośród tych, do
 * których pasuje; przy jednej — bez pytania. Szybkoładowarka idzie ścieżką przelewania.
 */
export async function insertMagazineFromBelt(mag) {
  const actor = mag?.actor;
  if (!actor) return false;
  const weapons = actor.items.filter(i => i.type === "weapon" && _hasRemovableSource(i) && getMag(i) !== null
    && compatibleMagazines(actor, i).some(m => m.id === mag.id));
  if (!weapons.length) {
    ui.notifications.warn(`${mag.name}: nie pasuje do żadnej broni ${actor.name}.`);
    return false;
  }
  let weapon = weapons[0];
  if (weapons.length > 1) {
    const chosen = await foundry.applications.api.DialogV2.wait({
      window: { title: `${mag.name} — do której broni?` },
      content: "<p>Magazynek pasuje do kilku broni.</p>",
      buttons: weapons.map(w => ({ action: w.id, label: `${w.name} — ${getMag(w)?.current ?? 0}/${getMag(w)?.max ?? 0}` })),
      rejectClose: false
    });
    if (!chosen) return false;
    weapon = weapons.find(w => w.id === chosen) ?? weapon;
  }
  if (magazineDefOf(mag)?.kind === "speedloader") return _onClickPourSpeedloader(_getLiveItem(weapon));
  return _onClickSwapMagazine(_getLiveItem(weapon), { target: mag });
}

/* -------------------------------------------- */
/*  Registration                                  */
/* -------------------------------------------- */

export function registerMagazines() {
  // Pasek przedmiotów podręcznych: klik w kafelek = wepnij ten magazynek (pytanie o broń, gdy
  // pasuje do kilku); podpis = naboje; magazynek wpięty w broń nie leży przy pasie.
  registerHandyFamily("magazine", {
    use: mag => insertMagazineFromBelt(mag),
    caption: mag => {
      const def = magazineDefOf(mag);
      return def ? `${magazineRounds(mag).length}/${def.capacity}` : "";
    },
    refuse: mag => {
      const host = magazineHost(mag);
      return host ? `wpięty w ${host.name} — magazynek w broni nie leży przy pasie.` : null;
    }
  });
  registerReloadActivityType();
  registerLoadOneActivityType();
  registerMagSwapActivityType();
  registerAttackReloadGuard();

  Hooks.on("renderItemSheet5e", onRenderItemSheet);

  /* Projekcja (`flags.mag` + `system.uses`) przelicza się po każdej zmianie kolejki. Jest
     deterministyczna i idempotentna, więc może ją liczyć każdy klient — w odróżnieniu od
     tworzenia aktywności niżej, które musi być GM-only. */
  Hooks.on("updateItem", onUpdateItemReproject);

  /* Zapamiętanie kalibru, którym oddano ten strzał, na karcie ataku.
     Bez tego przycisk „Obrażenia" czyta stan broni w momencie RENDERU, czyli już po zużyciu
     naboju — i przy mieszanym magazynku pokazywałby nabój NASTĘPNY, nie ten, który poleciał.
     Po przeładowaniu strony byłoby jeszcze gorzej: kaliber sprzed pół godziny. */
  Hooks.on("preCreateChatMessage", onPreCreateStampShotCaliber);

  // GM-gated (2026-09-06 bugfix — see doc comment on `syncWeaponMagazineActivities`): this one
  // calls `item.createActivity(...)`, which is NOT idempotent across clients like the projection
  // above is — every connected client independently deciding "no managed activity yet, better
  // create one" is exactly how items ended up with two "Doładuj 1 nabój"/"Wymiana magazynka"
  // entries.
  Hooks.on("createItem", item => {
    if (game.user.isGM) void syncWeaponMagazineActivities(item);
  });
  Hooks.on("updateItem", item => {
    if (game.user.isGM) void syncWeaponMagazineActivities(item);
  });
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);

  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (mod) {
      mod.api ??= {};
      mod.api.magazines = {
        getMag,
        getChamber,
        setMag,
        setChamber,
        spendRound,
        spendRounds,
        getMagazineType,
        swapMagazine,
        openLoadWindow,
        unloadMagazineAction,
        /* Diagnostyka: co ta broń w ogóle jest i skąd bierze naboje. Pierwsze pytanie przy
           każdym zgłoszeniu „mam magazynek, a broń mówi, że nie mam". */
        describe: weapon => {
          const state = readState(weapon);
          return {
            weaponId: weaponIdOf(weapon),
            magwell: weaponMagwell(weapon),
            feed: state.feed,
            hasChamber: state.hasChamber,
            chamber: state.chamber,
            source: state.source
              ? { kind: state.source.kind, def: state.source.def?.id ?? null, capacity: state.capacity }
              : null,
            rounds: state.rounds,
            mag: getMag(weapon)
          };
        }
      };
      globalThis.game.neuroshima ??= {};
      game.neuroshima.magazynki = mod.api.magazines;
    }

    void reprojectAllMagazineState();
    if (game.user.isGM) void syncAllWeaponMagazineActivities(); // creates activities — GM-only, see above
  });

  console.log("Neuroshima 5e | Magazine system registered");
}

/**
 * Przelicza projekcje na wszystkich broniach w systemie — jednorazowo, przy starcie świata.
 *
 * Potrzebne, bo projekcja może się rozejść ze źródłem bez żadnej mutacji broni: skasowanie
 * wpiętego magazynka jako przedmiotu, edycja jego zawartości z karty przedmiotu, migracja.
 */
async function reprojectAllMagazineState() {
  for (const actor of game.actors ?? []) {
    if (!inMagazineSystem(actor)) continue;
    for (const item of actor.items ?? []) {
      if (item.type !== "weapon") continue;
      if (!weaponEntry(item)?.mag) continue;
      await projectMagazineState(item);
    }
  }
}

/**
 * Po zmianie kolejki naboi — na broni albo na wpiętym w nią magazynku — przelicz projekcję.
 *
 * Pętli się nie da: `projectMagazineState()` porównuje przed zapisem i wychodzi, gdy nic się nie
 * zmienia, a zmiany samej projekcji są tu jawnie ignorowane.
 */
async function onUpdateItemReproject(item, changes) {
  if (!item?.actor || !inMagazineSystem(item.actor)) return;

  const touched = path => foundry.utils.hasProperty(changes, path);
  const projectionOnly = projectionPaths.some(touched)
    && !touched(`flags.${MODULE_ID}.${FLAG_ROUNDS}`)
    && !touched(`flags.${MODULE_ID}.chamber`)
    && !touched(`flags.${MODULE_ID}.loadedMag`)
    && !touched(`flags.${MODULE_ID}.magazine`);
  if (projectionOnly) return;

  if (item.type === "weapon") {
    if (!weaponEntry(item)?.mag) return;
    await projectMagazineState(item);
    return;
  }

  /* Zmiana zawartości magazynka musi odświeżyć KAŻDĄ broń, w której on siedzi — a siedzieć
     może tylko w jednej, więc szukamy tej jednej. */
  if (isMagazineItem(item)) {
    for (const weapon of item.actor.items) {
      if (weapon.type !== "weapon") continue;
      if (weapon.getFlag(MODULE_ID, "loadedMag") !== item.id) continue;
      await projectMagazineState(weapon);
    }
  }
}

/** Nazwa flagi kolejki wewnętrznej — trzymana lokalnie, żeby nie importować całego FLAG. */
const FLAG_ROUNDS = "rounds";

/**
 * Stempluje na karcie ataku kaliber, którym oddano strzał.
 *
 * Wykonuje się w `preCreateChatMessage`, czyli ZANIM broń zużyje nabój (zużycie jest po rzucie,
 * w `_processSingleShotAttack`), więc głowa kolejki to dokładnie ten nabój, który leci.
 * `weapons/ammo.mjs` czyta tę flagę zamiast żywego stanu.
 */
function onPreCreateStampShotCaliber(message, data) {
  const flags = data?.flags?.dnd5e ?? message?.flags?.dnd5e;
  if (flags?.activity?.type !== "attack") return;
  const uuid = flags?.item?.uuid;
  if (!uuid) return;
  const item = fromUuidSync(uuid);
  if (!item || item.type !== "weapon") return;
  const caliberId = getMag(item)?.ammoType;
  if (!caliberId) return;
  message.updateSource({ [`flags.${MODULE_ID}.shotCaliber`]: caliberId });
}

/* -------------------------------------------- */
/*  Item sheet injection                          */
/* -------------------------------------------- */

/**
 * Inject magazine row into the Details tab of a weapon item sheet.
 */
/**
 * Sekcja „Magazynek" na karcie broni.
 *
 * Pokazuje trzy rzeczy, o które gracz pyta w trakcie walki: **co jest wpięte**, **co siedzi
 * w komorze** i **co poleci następne**. Liczba naboi jest tu wynikiem, nie polem do wpisania —
 * źródłem prawdy jest kolejka w magazynku. Pole liczbowe zostaje wyłącznie w trybie EDYCJI, dla
 * MG, który chce ustawić stan ręcznie (patrz `setMag()`).
 *
 * Wyboru kalibru już tu nie ma. Kaliber przestał być ustawieniem broni — jest właściwością
 * naboju w magazynku, a mieszany magazynek ma ich kilka naraz, więc jedno pole nie ma czego
 * pokazać. Zmiana amunicji to odtąd czynność na magazynku (okno ładowania), nie na broni.
 */
function onRenderItemSheet(app, html) {
  const item = app.document ?? app.item;
  if (!item || item.type !== "weapon") return;
  const isPlayMode = app._mode === app.constructor?.MODES?.PLAY;

  const mag = getMag(item);
  if (!mag) return;

  const state = readState(item);
  const removable = _hasRemovableSource(item);
  const magItem = removable ? loadedMagazine(item) : null;
  const inCombat = !!item.actor?.inCombat;

  const detailsSection = html.querySelector(".item-properties, .details-tab, [data-tab='details'] .form-group:last-of-type");
  if (!detailsSection) return;

  const magRow = document.createElement("div");
  magRow.classList.add("form-group", "neuro-mag-row");
  magRow.innerHTML = `
    <label>${_sourceLabel(item)}</label>
    <div class="form-fields neuro-mag-fields">
      <div class="neuro-mag-line">
        ${isPlayMode
          ? `<span class="neuro-mag-count">${mag.current}/${mag.max}</span>`
          : `<input type="number" class="neuro-mag-current" value="${mag.current}" min="0" max="${mag.max}"
                    data-dtype="Number" style="width:48px; text-align:center;">
             <span>/ ${mag.max}</span>`}
        ${removable ? `<span class="neuro-mag-loaded">${magItem
            ? `${magItem.name}${isAtHand(magItem) ? " · podręczny" : ""}`
            : `<em class="neuro-mag-empty">brak magazynka</em>`}</span>` : ""}
      </div>
      ${_sheetNotes(item, state, mag)}
    </div>
  `;
  detailsSection.after(magRow);

  if (!item.actor) return;

  const actions = document.createElement("div");
  actions.classList.add("form-group", "neuro-mag-actions-row");
  actions.innerHTML = `<label></label><div class="form-fields neuro-mag-actions"></div>`;
  const bar = actions.querySelector(".neuro-mag-actions");

  const addBtn = (cls, icon, label, tooltip, disabled = false) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `neuro-mag-btn ${cls}`;
    btn.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
    if (tooltip) btn.dataset.tooltip = tooltip;
    btn.disabled = disabled;
    bar.appendChild(btn);
    return btn;
  };

  const plan = _getReloadPlan(item, mag);

  if (removable) {
    addBtn("is-swap", "fa-repeat", magItem ? "Wymień" : "Wepnij", plan.hint)
      .addEventListener("click", ev => { ev.preventDefault(); void _onClickSwapMagazine(_getLiveItem(item)); });

    if (magItem) {
      addBtn("is-eject", "fa-eject", "Wypnij",
        "Zostawia broń z samym nabojem w komorze. W walce kosztuje tyle co wymiana.")
        .addEventListener("click", ev => {
          ev.preventDefault();
          void _onClickSwapMagazine(_getLiveItem(item), { target: null });
        });

      addBtn("is-load", "fa-boxes-stacked", "Załaduj magazynek",
        inCombat ? "Naboi nie wkłada się do magazynka w walce." : "Otwiera okno ładowania.", inCombat)
        .addEventListener("click", ev => { ev.preventDefault(); void openLoadWindow(magItem); });
    }
  } else {
    const full = mag.current >= mag.max;
    addBtn("is-load", "fa-boxes-stacked", "Uzupełnij z zapasu",
      inCombat ? "Uzupełnianie z zapasu jest niedostępne podczas walki." : "", inCombat || full)
      .addEventListener("click", ev => { ev.preventDefault(); void _onClickBulkReload(_getLiveItem(item)); });

    addBtn("is-one", "fa-plus", "+1 nabój", plan.hint, full)
      .addEventListener("click", ev => { ev.preventDefault(); void _performLoadOneAction(_getLiveItem(item)); });

    if (getMagazineType(item) === MAGAZINE_TYPES.CYLINDER) {
      addBtn("is-pour", "fa-circle-notch", "Szybkoładowarka",
        "Przelewa całą szybkoładowarkę do pustego bębenka.")
        .addEventListener("click", ev => { ev.preventDefault(); void _onClickPourSpeedloader(_getLiveItem(item)); });
    }
  }

  if (_canCycleReloadWithoutAmmo(item)) {
    addBtn("is-cycle", "fa-rotate", "Przeładuj", "Darmowa interakcja albo Akcja bonusowa.")
      .addEventListener("click", ev => {
        ev.preventDefault();
        void _performReloadAction(_getLiveItem(item), { chat: true, spendResource: true, source: "button" });
      });
  }

  magRow.after(actions);

  magRow.querySelector(".neuro-mag-current")?.addEventListener("change", async ev => {
    const value = Math.max(0, parseInt(ev.target.value, 10) || 0);
    await setMag(_getLiveItem(item), { current: value });
  });
}

/** „Magazynek" / „Bębenek" / „Wmag." / „Kołczan" / „Taśma" — etykieta pola na karcie. */
function _sourceLabel(item) {
  const kind = weaponEntry(item)?.mag?.kind;
  return { mag: "Magazynek", wmag: "Wmag.", beb: "Bębenek", belt: "Taśma", quiver: "Kołczan" }[kind]
    ?? "Magazynek";
}

/**
 * Notatki pod licznikiem: komora, następny nabój, stan przeładowania, uwaga o kalibrze.
 *
 * ## Kiedy pokazujemy komorę
 *
 * Gdy jest **akcjonowalna** albo gdy się **różni** (PLAN_magazynki.md §5):
 *   - `feed === "manual"` → zawsze; gracz musi wiedzieć, czy może w ogóle strzelić,
 *   - kaliber w komorze ≠ kaliber następnego naboju w źródle → zawsze (to jest dum-dum
 *     w komorze przy zwykłych nabojach w magazynku),
 *   - w pozostałych przypadkach → ukryj. U broni automatycznej komora jest pełna, dopóki są
 *     naboje, więc jej stan nigdy nie jest ciekawy i byłby tylko szumem na karcie.
 */
function _sheetNotes(item, state, mag) {
  const notes = [];
  const reloadState = _getReloadState(item);

  const nextInSource = state.rounds[0] ?? null;
  const chamberDiffers = state.chamber && nextInSource && (state.chamber !== nextInSource);
  if (state.hasChamber && ((state.feed === "manual") || chamberDiffers)) {
    notes.push(state.chamber
      ? `<span class="neuro-mag-chamber">Komora: <strong>${_caliberLabel(state.chamber)}</strong></span>`
      : `<span class="neuro-mag-chamber is-empty">Komora: pusta${state.rounds.length ? " (wymaga przeładowania)" : " (i pusty magazynek)"}</span>`);
  }

  if (mag.current > 0) {
    notes.push(`<span class="neuro-mag-next">Następny: <strong>${_caliberLabel(mag.ammoType)}</strong></span>`);
  }

  const queue = [...(state.chamber ? [state.chamber] : []), ...state.rounds];
  if (new Set(queue).size > 1) {
    notes.push(`<span class="neuro-mag-queue">${_queueChips(queue)}</span>`);
  }

  if (reloadState.required) {
    notes.push(`<span class="neuro-mag-warn">${_getReloadStateHint(item, reloadState)}</span>`);
  }

  const note = _getCaliberNote(mag.ammoType);
  if (note) notes.push(`<i class="neuro-mag-note">${note}</i>`);

  return notes.length ? `<div class="neuro-mag-notes">${notes.join("")}</div>` : "";
}

/**
 * Uzupełnienie magazynka WEWNĘTRZNEGO / bębenka z luźnej puli — spokojne przygotowanie przed
 * wyjściem, bez limitu naboi na akcję, więc twardo zablokowane w walce.
 *
 * Dla broni z **wymiennym** magazynkiem ta czynność przestała istnieć: nie uzupełnia się broni,
 * uzupełnia się magazynek (`openLoadWindow`). Przycisk na karcie broni prowadzi tam wprost.
 */
async function _onClickBulkReload(item) {
  const actor = item.actor;
  if (!actor) {
    ui.notifications.warn("Broń nie jest przypisana do aktora.");
    return;
  }

  if (_hasRemovableSource(item)) {
    const mag = loadedMagazine(item);
    if (!mag) {
      ui.notifications.warn(`${item.name}: brak wpiętego magazynka — najpierw wepnij jakiś.`);
      return;
    }
    return openLoadWindow(mag);
  }

  if (actor.inCombat) {
    ui.notifications.warn(`${item.name}: uzupełnianie z zapasu jest niedostępne podczas walki.`);
    return;
  }

  const mag = getMag(item);
  if (!mag) {
    ui.notifications.warn(`${item.name}: ta broń jest poza systemem magazynków.`);
    return;
  }

  const needed = Number(mag.max ?? 0) - Number(mag.current ?? 0);
  if (needed <= 0) {
    ui.notifications.info(`${item.name}: ${_sourceNoun(item)} jest już pełny.`);
    return;
  }

  const pick = await _chooseFamilyAmmo(actor, mag.ammoType);
  if (!pick) return;
  const { ammoItem, caliberId } = pick;

  const available = Number(ammoItem.system.quantity ?? 0);
  const toLoad = Math.min(needed, available);
  if (toLoad <= 0) {
    ui.notifications.warn(`${ammoItem.name}: wyczerpana amunicja.`);
    return;
  }

  /* Naboje wchodzą po jednym przez to samo lejko co ładowanie w walce, więc kolejność
     w kolejce jest taka sama jak przy ładowaniu ręcznym — nie ma drugiej ścieżki zapisu. */
  let loaded = 0;
  for (let i = 0; i < toLoad; i++) {
    if (!(await loadSingleRound(item, caliberId))) break;
    loaded += 1;
  }
  if (!loaded) {
    ui.notifications.info(`${item.name}: nie ma już miejsca.`);
    return;
  }

  const newQty = available - loaded;
  if (newQty <= 0) await ammoItem.delete();
  else await ammoItem.update({ "system.quantity": newQty });
  await _clearReloadState(item);

  await _playBulkReloadClicks(item, actor, caliberId, loaded);
  seqScrollText("UZUPEŁNIONO", actor, { color: "#f1c40f", fontSize: 26, duration: 1500 });

  const after = getMag(item);
  const justFull = (after.current === after.max) ? " do pełna" : "";
  const justAll = (newQty === 0) ? " wszystkie swoje" : "";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-mag-card">`
      + `<div class="neuro-mag-head"><strong>${actor.name}</strong> uzupełnia <em>${item.name}</em>${justFull}</div>`
      + `<div class="neuro-mag-body">Ładuje po kolei${justAll} ${loaded}× ${_caliberLabel(caliberId)}.</div>`
      + `<div class="neuro-mag-state">Stan broni: ${after.current}/${after.max}${_nextRoundNote(item)}</div></div>`
  });
}

/**
 * Rounds loaded "one by one" — plays the same single-insert click used by
 * `_onClickReload`'s per-round path, repeated with a short stagger. Capped well
 * below the actual count for large top-offs (e.g. 30 rounds into an Uzi's stick
 * mag) so it reads as "loading a bunch of rounds" rather than becoming a
 * multi-second sound-effect ordeal.
 */
async function _playBulkReloadClicks(item, actor, caliberId, count) {
  const clicks = Math.max(1, Math.min(count, 8));
  for (let i = 0; i < clicks; i++) {
    playUtilitySound("reload", item, WeaponSound.RELOAD_SINGLE, { caliberId, token: actor });
    if (i < clicks - 1) await new Promise(r => setTimeout(r, 180));
  }
}

/* -------------------------------------------- */
/*  Akcje: wymiana, wypięcie, szybkoładowarka     */
/* -------------------------------------------- */

/**
 * Wymiana magazynka — wpięcie innego pojemnika z ekwipunku albo wypięcie obecnego.
 *
 * ## Co się tu zmieniło i dlaczego
 *
 * Do 2026-09-22 ta funkcja robiła dwie rzeczy naraz: „wymień magazynek" i „wybierz, jakim
 * nabojem go ładujesz", ciągnąc naboje wprost z luźnej puli w ekwipunku. To był **bug ubrany
 * w regułę**: sprawdzała gotowy magazynek zapasowy, ale i tak odejmowała naboje od
 * `ammoItem.system.quantity`, więc flaga `ready` była licznikiem pozwoleń, nie źródłem
 * amunicji. Magazynki nie trzymały niczego, a amunicja materializowała się przy wymianie.
 *
 * Teraz magazynek jest fizycznym pojemnikiem: wymiana **tylko przekłada pojemniki**, a naboje
 * wkłada się do nich osobno, poza walką, przez okno ładowania (`openLoadWindow`). RAW nie zna
 * czynności „ładowanie naboi do wymiennego magazynka w walce" — przewiduje ładowanie po jednym
 * naboju wyłącznie dla `wmag` i `beb`. Zgodne z konsultacją z autorem: przeciętna walka trwa
 * poniżej minuty, więc nabijanie magazynka w jej środku fizycznie nie działa.
 *
 * Wypięcie jest wymianą z `null` jako celem — jedna ścieżka kodu, jeden koszt, zero przypadku
 * specjalnego. Broń zostaje wtedy na `1/max`, czyli jest ściśle gorsza ofensywnie, i to właśnie
 * domyka drogę do exploita: rozbicie wymiany na wypięcie + wpięcie kosztuje dwie akcje.
 *
 * @param {Item5e} item                   Broń.
 * @param {object} [options]
 * @param {Item5e|null} [options.target]  Pojemnik do wpięcia; `null` = wypięcie. Brak = zapytaj.
 */
async function _onClickSwapMagazine(item, { target } = {}) {
  const actor = item.actor;
  if (!actor) {
    ui.notifications.warn("Broń nie jest przypisana do aktora.");
    return false;
  }
  if (!_hasRemovableSource(item)) {
    ui.notifications.warn(`${item.name}: ta broń nie ma wymiennego magazynka.`);
    return false;
  }

  const inCombat = !!actor.inCombat;
  const reloadPlan = _getReloadPlan(item, getMag(item));
  const current = loadedMagazine(item);

  let chosen = target;
  if (chosen === undefined) {
    chosen = await _chooseMagazine(actor, item, current);
    if (chosen === undefined) return false;       // anulowano (null = świadome wypięcie)
  }

  if (chosen && (chosen.id === current?.id)) {
    ui.notifications.info(`${item.name}: ten magazynek już jest wpięty.`);
    return false;
  }

  // Pochodzenie przed wpięciem: wpięty magazynek schodzi z pasa (jest w broni, nie przy pasie),
  // a wyjęty idzie prosto do plecaka (decyzja MG 2026-09-25 — bez modelowania zrzutni).
  const fromBelt = chosen ? isAtHand(chosen) : false;
  const result = await swapMagazineItem(item, chosen ?? null);
  if (!result) {
    ui.notifications.warn(`${item.name}: ten magazynek nie pasuje do tej broni.`);
    return false;
  }
  if (chosen) await clearBelt(actor.items.get(chosen.id) ?? chosen);

  await _clearReloadState(item);
  if (inCombat) await _spendCombatResource(actor, reloadPlan.actionType);

  playUtilitySound("reload", item, WeaponSound.RELOAD_MAG, {
    caliberId: getMag(item)?.ammoType, token: actor
  });
  seqScrollText(chosen ? "WYMIANA" : "WYPIĘTY", actor, {
    color: chosen ? "#f1c40f" : "#e67e22", fontSize: 26, duration: 1500
  });

  await _postSwapCard(item, actor, result, { reloadPlan, inCombat, fromBelt });
  return true;
}

/**
 * Dialog wyboru pojemnika. Zwraca item, `null` (wypięcie) albo `undefined` (anulowano) —
 * trzy różne odpowiedzi, bo „wypnij" i „nie rób nic" to nie to samo.
 */
async function _chooseMagazine(actor, weapon, current) {
  // Przy pasie najpierw — to szybka ścieżka (Darmowa Interakcja), reszta z plecaka.
  const options = compatibleMagazines(actor, weapon)
    .filter(m => m.id !== current?.id)
    .filter(m => magazineDefOf(m)?.kind !== "speedloader")
    .sort((a, b) => Number(isAtHand(b)) - Number(isAtHand(a)));

  if (!options.length && !current) {
    ui.notifications.warn(
      `${actor.name}: brak pasującego magazynka do ${weapon.name}. `
      + `Magazynki są per model broni — kup taki do tej sztuki.`
    );
    return undefined;
  }

  const buttons = options.map(m => {
    const def = magazineDefOf(m);
    const rounds = magazineRounds(m);
    const host = magazineHost(m);
    const tags = [
      isAtHand(m) ? "podręczny" : null,
      host ? `w: ${host.name}` : null
    ].filter(Boolean);
    return {
      action: m.id,
      label: `${m.name} — ${rounds.length}/${def.capacity}${tags.length ? ` [${tags.join(", ")}]` : ""}`
    };
  });
  if (current) buttons.push({ action: "__eject", label: "Wypnij magazynek (bez wkładania nowego)" });

  const chosen = await foundry.applications.api.DialogV2.wait({
    window: { title: `Wymiana magazynka — ${weapon.name}` },
    content: `<p>${_swapDialogHint(weapon, current, options)}</p>`,
    buttons,
    rejectClose: false
  });
  if (!chosen) return undefined;
  if (chosen === "__eject") return null;
  return options.find(m => m.id === chosen) ?? undefined;
}

function _swapDialogHint(weapon, current, options) {
  const lines = [];
  if (current) {
    const def = magazineDefOf(current);
    const rounds = magazineRounds(current);
    lines.push(`Wpięty: <strong>${current.name}</strong> — ${describeRounds(rounds)}`
      + ` (${rounds.length}/${def?.capacity ?? "?"}).`);
  } else {
    lines.push("Broń jest bez magazynka.");
  }
  const chambered = getChamber(weapon);
  if (chambered.caliberId) {
    lines.push(`W komorze zostaje <strong>${_caliberLabel(chambered.caliberId)}</strong>`
      + " — wymiana go nie rusza.");
  }
  if (!options.length) lines.push("<em>Nie masz innego pasującego magazynka.</em>");
  return lines.join("<br>");
}

/** Karta czatu wymiany/wypięcia, z pigułką „skąd wzięty" (przedmioty podręczne). */
async function _postSwapCard(weapon, actor, { ejected, inserted, takenFrom }, { reloadPlan, inCombat, fromBelt }) {
  const mag = getMag(weapon);
  const verb = inserted
    ? (ejected ? "wymienia magazynek w" : "wpina magazynek do")
    : "wypina magazynek z";

  const detail = [];
  if (inserted) {
    detail.push(`Wpięty: <strong>${inserted.name}</strong> — ${describeRounds(magazineRounds(inserted))}.`);
  }
  if (ejected) {
    detail.push(`Wyjęty: ${ejected.name} — ${describeRounds(magazineRounds(ejected))} (zostaje w ekwipunku).`);
  }
  if (takenFrom) {
    detail.push(`<strong>${takenFrom.name}</strong> zostaje bez magazynka — magazynek przeszedł stamtąd.`);
  }
  if (!inserted) detail.push("<em>Broń zostaje z samym nabojem w komorze.</em>");

  const provenance = inserted ? provenanceBadge(inserted, { atHand: fromBelt }) : "";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-mag-card">`
      + `<div class="neuro-mag-head"><strong>${actor.name}</strong> ${verb} <em>${weapon.name}</em>`
      + `${provenance ? ` ${provenance}` : ""}</div>`
      + `<div class="neuro-mag-body">${detail.join("<br>")}</div>`
      + `<div class="neuro-mag-state">Stan broni: ${mag?.current ?? 0}/${mag?.max ?? 0}`
      + `${_nextRoundNote(weapon)}</div>`
      + `${_getReloadRuleChangeNotice(reloadPlan, { inCombat })}</div>`
      + `<ul class="card-footer pills unlist"><li class="pill transparent">`
      + `<span class="label">${reloadPlan.actionLabel}${inCombat ? "" : " (poza walką)"}</span></li></ul>`
  });
}

/** „ — następny: .44 Mag (dum-dum)", gdy jest co powiedzieć. */
function _nextRoundNote(weapon) {
  const next = getMag(weapon)?.ammoType;
  if (!next) return "";
  return ` — następny: <strong>${_caliberLabel(next)}</strong>`;
}

function _caliberLabel(caliberId) {
  return AMMO_CALIBER_MAP[caliberId]?.label ?? caliberId ?? "—";
}

/**
 * Przelanie szybkoładowarki do bębenka — RAW: „albo całego bębenka szybkoładowarką",
 * akcja Używanie (Akcja bonusowa ze Sztuczką *Szybkie przeładowanie*).
 *
 * Wymaga pustego bębenka: pierścień naboi wchodzi w komory na raz albo wcale. Szybkoładowarka
 * zostaje pusta — nabija się ją poza walką, jak magazynek, i to jest cała jej ekonomia:
 * masz ją nabitą albo tracisz rundy na naboje po jednym.
 */
async function _onClickPourSpeedloader(item) {
  const actor = item.actor;
  if (!actor) return false;

  const loaders = compatibleMagazines(actor, item)
    .filter(m => magazineDefOf(m)?.kind === "speedloader")
    .filter(m => magazineRounds(m).length > 0);

  if (!loaders.length) {
    ui.notifications.warn(`${actor.name}: brak nabitej szybkoładowarki do ${item.name}.`);
    return false;
  }
  if (internalRounds(item).length) {
    ui.notifications.warn(`${item.name}: bębenek nie jest pusty — szybkoładowarka wchodzi tylko w pusty bębenek.`);
    return false;
  }

  let loader = loaders[0];
  if (loaders.length > 1) {
    const chosen = await foundry.applications.api.DialogV2.wait({
      window: { title: "Którą szybkoładowarką?" },
      content: "<p>Masz kilka nabitych szybkoładowarek pasujących do tej broni.</p>",
      buttons: loaders.map(m => ({ action: m.id, label: `${m.name} — ${describeRounds(magazineRounds(m))}` })),
      rejectClose: false
    });
    if (!chosen) return false;
    loader = loaders.find(m => m.id === chosen) ?? loader;
  }

  const contents = describeRounds(magazineRounds(loader));
  const n = await pourSpeedloader(item, loader);
  if (!n) {
    ui.notifications.warn(`${item.name}: szybkoładowarka nie pasuje do tego bębenka.`);
    return false;
  }

  await _clearReloadState(item);
  const reloadPlan = _getReloadPlan(item, getMag(item));
  const inCombat = !!actor.inCombat;
  if (inCombat) await _spendCombatResource(actor, reloadPlan.actionType);

  playUtilitySound("reload", item, WeaponSound.RELOAD_MAG, { caliberId: getMag(item)?.ammoType, token: actor });
  seqScrollText("BĘBENEK", actor, { color: "#f1c40f", fontSize: 26, duration: 1500 });

  const mag = getMag(item);
  const provenance = provenanceBadge(loader);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-mag-card">`
      + `<div class="neuro-mag-head"><strong>${actor.name}</strong> przelewa szybkoładowarkę do <em>${item.name}</em>`
      + `${provenance ? ` ${provenance}` : ""}</div>`
      + `<div class="neuro-mag-body">${contents} → bębenek. ${loader.name} zostaje pusta.</div>`
      + `<div class="neuro-mag-state">Stan broni: ${mag?.current ?? 0}/${mag?.max ?? 0}${_nextRoundNote(item)}</div>`
      + `${_getReloadRuleChangeNotice(reloadPlan, { inCombat })}</div>`
      + `<ul class="card-footer pills unlist"><li class="pill transparent">`
      + `<span class="label">${reloadPlan.actionLabel}${inCombat ? "" : " (poza walką)"}</span></li></ul>`
  });
  return true;
}

/**
 * Który nabój z rodziny wchodzi — pytamy tylko wtedy, gdy jest z czego wybierać.
 *
 * Zastąpiło zaszyty na sztywno dialog śrut/breneka bramkowany na `ammoType?.startsWith("12ga")`,
 * który był i nierozszerzalny, i subtelnie błędny jako reguła kompatybilności — patrz
 * `familyCalibers()` w `config/ammo-data.mjs`. Oferowane są tylko kalibry, które aktor
 * faktycznie nosi, a jedna opcja pomija dialog, więc typowy przypadek (broń z jednym rodzajem
 * amunicji) wygląda dokładnie jak wcześniej.
 *
 * @returns {{ammoItem: Item5e, caliberId: string}|null} null = brak amunicji albo anulowano
 */
async function _chooseFamilyAmmo(actor, currentCaliberId) {
  const options = [];
  for (const caliber of familyCalibers(currentCaliberId)) {
    const stock = _findAmmo(actor, caliber.id);
    if (stock) options.push({ caliber, ammoItem: stock });
  }

  if (!options.length) {
    ui.notifications.warn(`Brak amunicji (${_caliberLabel(currentCaliberId)}) w ekwipunku.`);
    return null;
  }
  if (options.length === 1) {
    return { ammoItem: options[0].ammoItem, caliberId: options[0].caliber.id };
  }

  const chosen = await foundry.applications.api.DialogV2.wait({
    window: { title: "Czym ładujesz?" },
    content: `<p>Masz kilka rodzajów naboju pasujących do tej broni. Który wchodzi?</p>`,
    buttons: options.map(o => ({
      action: o.caliber.id,
      label: `${o.caliber.label} — ${o.ammoItem.system.quantity ?? 0} szt.`
    })),
    rejectClose: false
  });
  if (!chosen) return null;

  const picked = options.find(o => o.caliber.id === chosen);
  return picked ? { ammoItem: picked.ammoItem, caliberId: picked.caliber.id } : null;
}

/* -------------------------------------------- */
/*  Okno ładowania magazynka                      */
/* -------------------------------------------- */

/** Skoki, które oferujemy jako gotowe przyciski. Obcinane do tego, co realnie wchodzi. */
const LOAD_STEPS = Object.freeze([1, 5, 10, 50]);

/**
 * Okno ładowania pojemnika — **wyłącznie poza walką**.
 *
 * ## Wiersz na typ amunicji, nie kolumna
 *
 * Kolumny skończyłyby się przy piątym typie naboju, a rodzin będzie przybywać z każdym
 * dodatkiem. Wiersze skalują się bez końca i mieszczą opis efektu, po którym gracz wybiera —
 * „2k6 kłute • przebijająca" jest tu ważniejsze niż nazwa kalibru.
 *
 * ## Clamping z dwóch stron
 *
 * Każdy przycisk jest obcięty i o wolne miejsce w magazynku, i o zapas w ekwipunku, i pokazuje
 * realną liczbę albo jest wyszarzony. Gracz nigdy nie klika czegoś, co zrobi mniej, niż mówi.
 *
 * ## „Do pełna" jest per wiersz
 *
 * Globalne „do pełna" przy mieszance nie ma sensownej odpowiedzi — nie ma dobrej heurystyki na
 * „którym z trzech typów dopełnić". Ta sama zasada, z której wynika brak automatycznego
 * uzupełniania w całym systemie: ładowanie jest jawną decyzją gracza.
 */
export async function openLoadWindow(magItem) {
  const actor = magItem?.actor;
  const def = magazineDefOf(magItem);
  if (!def) {
    ui.notifications.warn(`${magItem?.name ?? "Pojemnik"}: nierozpoznany magazynek — nie wiem, co do niego wchodzi.`);
    return;
  }
  if (!actor) {
    ui.notifications.warn("Magazynek nie leży w ekwipunku postaci.");
    return;
  }
  if (actor.inCombat) {
    ui.notifications.warn(
      `${magItem.name}: naboi nie wkłada się do magazynka w walce — `
      + `wymień magazynek na inny albo zrób to po walce.`
    );
    return;
  }

  let root = null;

  const refresh = () => {
    if (!root) return;
    const live = actor.items.get(magItem.id);
    if (!live) return;
    root.innerHTML = _loadWindowHtml(live, def);
    _bindLoadWindow(root, live, def, refresh);
  };

  await foundry.applications.api.DialogV2.wait({
    window: { title: `Ładowanie — ${magItem.name}`, resizable: true },
    position: { width: 520 },
    content: `<div class="neuro-load-window">${_loadWindowHtml(magItem, def)}</div>`,
    render: (_event, dialog) => {
      root = (dialog.element ?? dialog).querySelector(".neuro-load-window");
      if (root) _bindLoadWindow(root, actor.items.get(magItem.id) ?? magItem, def, refresh);
    },
    buttons: [{ action: "close", icon: "fa-solid fa-check", label: "Gotowe", default: true }],
    rejectClose: false
  });
}

function _loadWindowHtml(magItem, def) {
  const rounds = magazineRounds(magItem);
  const free = Math.max(0, def.capacity - rounds.length);
  const actor = magItem.actor;

  /* Posiadane typy u góry, zgodne ale nieposiadane wyszarzone na dole — żeby gracz widział,
     czego ma szukać, zamiast zgadywać, czym jeszcze wolno nabić ten magazynek. */
  const entries = acceptedCalibers(def).map(caliber => {
    const stock = _findAmmo(actor, caliber.id);
    return { caliber, stock, have: Number(stock?.system?.quantity ?? 0) };
  });
  entries.sort((a, b) => (b.have > 0 ? 1 : 0) - (a.have > 0 ? 1 : 0));

  const header = `<div class="neuro-load-head">
      <span class="neuro-load-title">${magItem.name}</span>
      <span class="neuro-load-count">${rounds.length}/${def.capacity}</span>
      <button type="button" class="neuro-load-unload" ${rounds.length ? "" : "disabled"}>
        <i class="fa-solid fa-arrow-up-from-bracket" inert></i> Rozładuj wszystko
      </button>
    </div>`;

  const rows = entries.map(e => _loadRowHtml(e, free)).join("");

  const queue = rounds.length
    ? `<div class="neuro-load-queue"><span class="neuro-load-queue-label">Kolejność wystrzału:</span> `
      + `${_queueChips(rounds)}</div>`
    : `<div class="neuro-load-queue is-empty">Magazynek jest pusty.</div>`;

  return header + `<div class="neuro-load-rows">${rows || "<p><em>Brak zgodnych kalibrów w katalogu.</em></p>"}</div>` + queue;
}

/**
 * Jeden wiersz = jeden typ naboju.
 *
 * Ikona bierze się z `AMMO_CALIBERS[].icon`. Dwie rodziny (`12ga_s`/`12ga_b` i `44mag`/`44mag_dd`)
 * dzielą dziś jeden plik SVG, więc rozróżnia je **etykieta i opis efektu**, nie grafika —
 * dedykowane ikony są w produkcji i podmiana ich nie wymaga zmiany tego kodu
 * (`dev/icons/MISSING.md`, batch 40).
 */
function _loadRowHtml({ caliber, have }, free) {
  const max = Math.min(free, have);
  const effect = [
    caliber.formula ? `${caliber.formula} ${_damageTypeLabel(caliber.type)}` : "",
    ...(caliber.props ?? []).map(_propLabel)
  ].filter(Boolean).join(" • ");

  const steps = LOAD_STEPS.filter(n => n < max).map(n =>
    `<button type="button" class="neuro-load-add" data-caliber="${caliber.id}" data-n="${n}">+${n}</button>`);

  if (max > 0) {
    const label = (have <= free) ? `+${max} = wszystko` : "do pełna";
    steps.push(`<button type="button" class="neuro-load-add is-fill" data-caliber="${caliber.id}" data-n="${max}">${label}</button>`);
  }

  const why = have <= 0 ? "brak w ekwipunku" : (free <= 0 ? "magazynek pełny" : "");

  return `<div class="neuro-load-row ${have > 0 ? "" : "is-missing"}">
      <img class="neuro-load-icon" src="modules/${MODULE_ID}/icons/ammo/${caliber.icon}" alt="">
      <div class="neuro-load-info">
        <div class="neuro-load-name">${caliber.label}</div>
        <div class="neuro-load-effect">${effect || "—"}</div>
      </div>
      <div class="neuro-load-stock">zapas: <strong>${have}</strong></div>
      <div class="neuro-load-actions">${steps.join("") || `<span class="neuro-load-why">${why}</span>`}</div>
    </div>`;
}

/** Zawartość jako ciąg grup, w kolejności wystrzału — pierwszy chip leci pierwszy. */
function _queueChips(rounds) {
  const groups = [];
  for (const id of rounds) {
    const last = groups[groups.length - 1];
    if (last && last.id === id) last.n += 1;
    else groups.push({ id, n: 1 });
  }
  return groups.map(g =>
    `<span class="neuro-load-chip">▸ ${g.n}× ${_caliberLabel(g.id)}</span>`).join(" ");
}

function _bindLoadWindow(root, magItem, def, refresh) {
  root.querySelectorAll(".neuro-load-add").forEach(btn => {
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      const caliberId = btn.dataset.caliber;
      const want = Number(btn.dataset.n) || 0;
      await _loadFromStock(magItem, caliberId, want);
      refresh();
    });
  });

  root.querySelector(".neuro-load-unload")?.addEventListener("click", async ev => {
    ev.preventDefault();
    await unloadMagazineAction(magItem);
    refresh();
  });
}

/**
 * Przenosi `want` naboi z luźnej puli do pojemnika. Obcina do tego, co jest i co wchodzi —
 * przycisk już to pokazał, ale stan mógł się zmienić między renderem a kliknięciem.
 */
async function _loadFromStock(magItem, caliberId, want) {
  const actor = magItem.actor;
  const stock = _findAmmo(actor, caliberId);
  const have = Number(stock?.system?.quantity ?? 0);
  const n = Math.min(want, have, freeSpace(magItem));
  if (n <= 0) return 0;

  const loaded = await loadRounds(magItem, caliberId, n);
  if (!loaded) return 0;

  if (have - loaded <= 0) await stock.delete();
  else await stock.update({ "system.quantity": have - loaded });

  playUtilitySound("reload", magItem, WeaponSound.RELOAD_SINGLE, { caliberId, token: actor });
  return loaded;
}

/**
 * Rozładowanie **wyłącznie w całości**.
 *
 * Częściowe natychmiast rodzi pytanie „które trzy naboje", a przy pełnym nie rodzi żadnego.
 * Naboje wracają do luźnej puli, każdy typ do swojego stosu.
 */
export async function unloadMagazineAction(magItem) {
  const actor = magItem?.actor;
  if (!actor) return false;
  if (actor.inCombat) {
    ui.notifications.warn(`${magItem.name}: rozładowywanie magazynka nie jest czynnością bojową.`);
    return false;
  }

  const tally = await unloadAll(magItem);
  const entries = Object.entries(tally);
  if (!entries.length) {
    ui.notifications.info(`${magItem.name}: już jest pusty.`);
    return false;
  }

  for (const [caliberId, n] of entries) {
    await addAmmoToActor(actor, caliberId, n, { notify: false });
  }

  playUtilitySound("reload", magItem, WeaponSound.RELOAD_OTHER, {
    caliberId: entries[0][0], token: actor
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-mag-card">`
      + `<div class="neuro-mag-head"><strong>${actor.name}</strong> rozładowuje <em>${magItem.name}</em></div>`
      + `<div class="neuro-mag-body">Do zapasu wraca: `
      + `${entries.map(([id, n]) => `${n}× ${_caliberLabel(id)}`).join(", ")}.</div></div>`
  });
  return true;
}

function _damageTypeLabel(type) {
  return CONFIG.DND5E?.damageTypes?.[type]?.label ?? type ?? "";
}

function _propLabel(prop) {
  return CONFIG.DND5E?.itemProperties?.[prop]?.label ?? prop;
}

function _getReloadPlan(item, mag, { magazineType = getMagazineType(item) } = {}) {
  const canQuickSwap = hasAbility(item.actor, ABILITY_KEYS.SZYBKA_WYMIANA);
  const canQuickReload = hasAbility(item.actor, ABILITY_KEYS.SZYBKIE_PRZELADOWANIE);

  if (magazineType === MAGAZINE_TYPES.INTERNAL) {
    const actionType = canQuickReload ? "bonus" : "action";
    return {
      roundsPerAction: 1,
      dialogTitle: canQuickReload ? "Doładowanie magazynka wewnętrznego (Akcja bonusowa)" : "Doładowanie magazynka wewnętrznego",
      containerAccusative: "magazynek wewnętrzny",
      fullAdjective: "pełny",
      chatVerb: "doładowuje",
      actionType,
      actionLabel: actionType === "bonus" ? "Akcja bonusowa" : "Akcja",
      actionLabelAccusative: actionType === "bonus" ? "Akcję bonusową" : "Akcję",
      ruleChangeAbilityKey: canQuickReload ? ABILITY_KEYS.SZYBKIE_PRZELADOWANIE : null,
      ruleChangeText: canQuickReload ? "ta czynność została wykonana jako Akcja bonusowa zamiast Akcji." : "",
      confirmationText: (weapon, currentMag, toLoad, actionCost) => `Załadować <strong>${toLoad}</strong> nabój ${currentMag.ammoType} do magazynka wewnętrznego broni <strong>${weapon.name}</strong>${actionCost}?`,
    };
  }

  if (magazineType === MAGAZINE_TYPES.CYLINDER) {
    const actionType = canQuickReload ? "bonus" : "action";
    return {
      roundsPerAction: 1,
      dialogTitle: canQuickReload ? "Doładowanie bębenka (Akcja bonusowa)" : "Doładowanie bębenka",
      containerAccusative: "bębenek",
      fullAdjective: "pełny",
      chatVerb: "doładowuje bębenek w",
      actionType,
      actionLabel: actionType === "bonus" ? "Akcja bonusowa" : "Akcja",
      actionLabelAccusative: actionType === "bonus" ? "Akcję bonusową" : "Akcję",
      ruleChangeAbilityKey: canQuickReload ? ABILITY_KEYS.SZYBKIE_PRZELADOWANIE : null,
      ruleChangeText: canQuickReload ? "ta czynność została wykonana jako Akcja bonusowa zamiast Akcji." : "",
      confirmationText: (weapon, currentMag, toLoad, actionCost) => `Załadować <strong>${toLoad}</strong> nabój ${currentMag.ammoType} do bębenka broni <strong>${weapon.name}</strong>${actionCost}?`,
    };
  }

  const actionType = canQuickSwap ? "bonus" : "action";
  return {
    roundsPerAction: Number.isFinite(mag?.max) ? Math.max(Number(mag.max), 1) : 999,
    dialogTitle: canQuickSwap ? "Zmiana magazynka (Akcja bonusowa)" : "Zmiana magazynka",
    containerAccusative: "magazynek",
    fullAdjective: "pełny",
    chatVerb: "wsadza zapasowy magazynek w",
    actionType,
    actionLabel: actionType === "bonus" ? "Akcja bonusowa" : "Akcja",
    actionLabelAccusative: actionType === "bonus" ? "Akcję bonusową" : "Akcję",
    ruleChangeAbilityKey: canQuickSwap ? ABILITY_KEYS.SZYBKA_WYMIANA : null,
    ruleChangeText: canQuickSwap ? "wymiana całego magazynka została wykonana jako Akcja bonusowa zamiast Akcji." : "",
    confirmationText: (weapon, currentMag, toLoad, actionCost) => `Podmiana magazynka w <strong>${weapon.name}</strong>, na taki z <strong>${toLoad}</strong> ${_formatRoundWord(toLoad)} ${currentMag.ammoType} ${actionCost}?`,
  };
}

function onPreUseActivity(activity) {
  const liveItem = _getLiveItem(activity?.item);
  if (!_isTrackedRangedWeapon(liveItem) || _isCustomActivity(activity)) return;

  if (_requiresManualReloadBeforeUse(liveItem)) {
    ui.notifications.warn(_getReloadRequiredWarning(liveItem));
    return false;
  }
}

/**
 * Return an optional rules-note paragraph for the current caliber (from ammo-data).
 * Shown below the magazine row in the item sheet.
 * @param {string} caliberId
 * @returns {string} HTML string (may be empty)
 */
function _getCaliberNote(caliberId) {
  if (!caliberId) return "";
  const caliber = AMMO_CALIBER_MAP[caliberId];
  return caliber?.note || "";
}

async function onPostUseActivity(activity) {
  const liveItem = _getLiveItem(activity?.item);
  if (!_isTrackedRangedWeapon(liveItem) || _isCustomActivity(activity)) return;
  if (!_isSingleShotActivity(activity)) return;
}

/**
 * Polska odmiana rzeczownika "nabój" przez liczbę: 1 nabój, 2-4 naboje, 5+ naboi.
 *
 * Wcześniej były tylko dwie formy (1 / reszta), co dawało "8 naboje" wszędzie poza jedynką.
 * Nie rzucało błędu, ale wychodziło na karty czatu przy każdym przeładowaniu, a te czyta
 * cały stół. Wyjątek dla nastek jest realny: "12 naboi", nie "12 naboje".
 */
function _formatRoundWord(count) {
  const n = Math.abs(Number(count) ?? 0);
  if (n === 1) return "nabój";
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return "naboje";
  return "naboi";
}

function _hasProperty(item, property) {
  const properties = item?.system?.properties;
  if (!properties) return false;
  if (typeof properties.has === "function") return properties.has(property);
  if (Array.isArray(properties)) return properties.includes(property);
  return false;
}

/**
 * Find the best ammo item for a weapon in the actor's inventory.
 * Matches by ammoType string (case-insensitive) if set, otherwise any ammo.
 * @param {Actor5e} actor
 * @param {string} ammoType
 * @returns {Item5e|null}
 */
function _findAmmo(actor, ammoType) {
  const ammos = actor.itemTypes.consumable.filter(
    i => i.system.type?.value === "ammo" && (i.system.quantity ?? 0) > 0
  );
  if (!ammos.length) return null;

  if (ammoType) {
    const lower = ammoType.toLowerCase();
    const exact = ammos.find(
      i => (i.system.type?.subtype ?? "").toLowerCase() === lower
        || i.name.toLowerCase().includes(lower)
    );
    return exact || null;
  }
  return null;
}

/**
 * Mark the actor's action as spent in the current combat round.
 * dnd5e doesn't track this natively — we post a reminder chat message.
 * TODO: hook into activity cost system when dnd5e exposes it.
 * @param {Actor5e} actor
 */
async function _spendCombatAction(actor) {
  // For now: just set a flag so macros/automation can read it.
  // Future: integrate with action economy tracker.
  await actor.setFlag(MODULE_ID, "usedActionThisTurn", true);
}

async function _spendCombatResource(actor, actionType = "action") {
  if (actionType === "bonus") {
    await actor.setFlag(MODULE_ID, "usedBonusActionThisTurn", true);
    return;
  }

  await _spendCombatAction(actor);
}

function registerReloadActivityType() {
  if (CONFIG.DND5E.activityTypes[RELOAD_ACTIVITY_TYPE]) return;
  const BaseUtilityActivity = CONFIG.DND5E.activityTypes.utility?.documentClass;
  if (!BaseUtilityActivity) {
    console.warn("Neuroshima 5e | Could not register reload activity: missing base utility activity");
    return;
  }

  class NeuroReloadActivity extends BaseUtilityActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: RELOAD_ACTIVITY_TYPE,
      title: "Przeładowanie",
      img: "modules/neuroshima-2026-overrides/icons/activities/activity_reload.svg",
      hint: "Neuroshima: ręczne przeładowanie komory po strzale albo demonstracyjne przeładowanie z wyrzuceniem naboju."
    }, { inplace: false }));

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      if (!_isTrackedRangedWeapon(liveItem)) return false;
      return _performReloadAction(liveItem, {
        chat: true,
        spendResource: true,
        source: "activity"
      });
    }
  }

  CONFIG.DND5E.activityTypes[RELOAD_ACTIVITY_TYPE] = {
    documentClass: NeuroReloadActivity
  };
}

function registerLoadOneActivityType() {
  if (CONFIG.DND5E.activityTypes[LOAD_ONE_ACTIVITY_TYPE]) return;
  const BaseUtilityActivity = CONFIG.DND5E.activityTypes.utility?.documentClass;
  if (!BaseUtilityActivity) {
    console.warn("Neuroshima 5e | Could not register load-one activity: missing base utility activity");
    return;
  }

  class NeuroLoadOneActivity extends BaseUtilityActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: LOAD_ONE_ACTIVITY_TYPE,
      title: "Doładuj 1 nabój",
      img: "modules/neuroshima-2026-overrides/icons/activities/activity_load_one.svg",
      hint: "Neuroshima: doładowanie pojedynczego naboju do magazynka wewnętrznego albo bębenka."
    }, { inplace: false }));

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      if (!_isTrackedRangedWeapon(liveItem)) return false;
      return _performLoadOneAction(liveItem, {
        chat: true,
        spendResource: true,
        source: "activity"
      });
    }
  }

  CONFIG.DND5E.activityTypes[LOAD_ONE_ACTIVITY_TYPE] = {
    documentClass: NeuroLoadOneActivity
  };
}

function registerMagSwapActivityType() {
  if (CONFIG.DND5E.activityTypes[MAG_SWAP_ACTIVITY_TYPE]) return;
  const BaseUtilityActivity = CONFIG.DND5E.activityTypes.utility?.documentClass;
  if (!BaseUtilityActivity) {
    console.warn("Neuroshima 5e | Could not register mag-swap activity: missing base utility activity");
    return;
  }

  class NeuroMagSwapActivity extends BaseUtilityActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: MAG_SWAP_ACTIVITY_TYPE,
      title: "Wymiana magazynka",
      img: "modules/neuroshima-2026-overrides/icons/activities/activity_mag_swap.svg",
      hint: "Neuroshima: wymień magazynek na zapasowy z ekwipunku i wybierz, jakim nabojem go ładujesz. W walce wymaga gotowego magazynka zapasowego."
    }, { inplace: false }));

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      return _onClickSwapMagazine(liveItem);
    }
  }

  CONFIG.DND5E.activityTypes[MAG_SWAP_ACTIVITY_TYPE] = {
    documentClass: NeuroMagSwapActivity
  };
}

async function syncAllWeaponMagazineActivities() {
  const items = [
    ...Array.from(game.items ?? []),
    ...Array.from(game.actors ?? []).flatMap(actor => Array.from(actor.items ?? []))
  ];

  for (const item of items) {
    await syncWeaponMagazineActivities(item);
  }
}

/**
 * Ensures reload/loadOne/magSwap activities exist and are up to date on `item`, upserting by
 * the `managedActivity`/`magazineAction` flags (`_findManagedMagazineActivity`).
 *
 * ## Bugfix (2026-09-06): why this must only ever run on the GM's client
 *
 * Player-reported: Raynald's Pistolet na Race had TWO identical "Doładuj 1 nabój" activities.
 * Found the same duplication on three world weapon items too (AK/Light Fifty/UZI, both with
 * doubled "Wymiana magazynka"). Root cause: this function's own callers (the `createItem`/
 * `updateItem` hooks and the `ready`-time backfill sweep, all in `registerMagazines()`) used to
 * run on EVERY connected client with no GM gate at all — unlike every other "ensure this
 * activity/item exists" hook in this module (Flara/Latarka/Pochodnia/Pistolet na Race's own
 * launch activity), which all check `game.user.isGM` first. `_findManagedMagazineActivity`
 * correctly finds nothing on a brand-new item and decides to create one — but if TWO clients
 * (the GM's and a player's, both legitimately allowed to write their own actor's embedded items)
 * make that same "nothing yet, create one" decision before either sees the other's write, both
 * `item.createActivity(...)` calls succeed independently. That's a real race between separate
 * browser processes, not something a same-client guard (`syncingManagedActivities`, still needed
 * for the unrelated case of two hooks firing on one client in the same tick) can catch. Now
 * gated to `game.user.isGM` at every call site — see `registerMagazines()`.
 */
async function syncWeaponMagazineActivities(item) {
  if (!_shouldManageMagazineActivities(item)) return;
  if (syncingManagedActivities.has(item.uuid)) return;

  syncingManagedActivities.add(item.uuid);
  try {
    /* Sprawdzenie między krokami — patrz bliźniacza pętla w `fire-modes.mjs` i uzasadnienie
       w `scripts/doc-liveness.mjs`. */
    for (const step of [syncReloadActivity, syncLoadOneActivity, syncMagSwapActivity]) {
      if (!isDocumentLive(item)) return;
      await step(item);
    }
  } finally {
    syncingManagedActivities.delete(item.uuid);
  }
}

async function syncReloadActivity(item) {
  const managed = _findManagedMagazineActivity(item, "reload");
  const shouldHave = _hasProperty(item, "przeladowanie");

  if (!shouldHave) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildReloadActivityData(item);
  if (!managed) {
    await item.createActivity(RELOAD_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    description: data.description,
    roll: data.roll,
    flags: data.flags
  });
}

async function syncLoadOneActivity(item) {
  const managed = _findManagedMagazineActivity(item, "loadOne");
  const magazineType = getMagazineType(item);
  const shouldHave = [MAGAZINE_TYPES.INTERNAL, MAGAZINE_TYPES.CYLINDER].includes(magazineType);

  if (!shouldHave) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildLoadOneActivityData(item, magazineType);
  if (!managed) {
    await item.createActivity(LOAD_ONE_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    description: data.description,
    roll: data.roll,
    flags: data.flags
  });
}

async function syncMagSwapActivity(item) {
  const managed = _findManagedMagazineActivity(item, "magSwap");
  const shouldHave = getMag(item) !== null && getMagazineType(item) === MAGAZINE_TYPES.REMOVABLE;

  if (!shouldHave) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildMagSwapActivityData(item);
  if (!managed) {
    await item.createActivity(MAG_SWAP_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    description: data.description,
    flags: data.flags
  });
}

function _buildMagSwapActivityData(item) {
  const canQuickSwap = item.actor ? hasAbility(item.actor, ABILITY_KEYS.SZYBKA_WYMIANA) : false;
  return {
    name: canQuickSwap ? "Wymiana magazynka (AB)" : "Wymiana magazynka",
    activation: {
      type: canQuickSwap ? "bonus" : "action",
      value: 1
    },
    description: {
      chat: "",
      value: "<p>Wymie\u0144 aktualny magazynek na zapasowy z ekwipunku. Je\u015bli masz kilka rodzaj\u00f3w naboju pasuj\u0105cych do tej broni, wybierzesz, kt\u00f3ry \u0142adujesz \u2014 naboje poprzedniego typu wracaj\u0105 do zapasu. W walce wymaga gotowego zapasowego magazynka.</p>"
    },
    flags: {
      [MODULE_ID]: {
        [MANAGED_ACTIVITY_FLAGS.MANAGED]: true,
        [MANAGED_ACTIVITY_FLAGS.KIND]: "magSwap"
      }
    }
  };
}

function _buildReloadActivityData(item) {
  return {
    name: "Przeładowanie",
    activation: {
      type: "bonus",
      value: 1,
      condition: "Neuroshima: zwykle Akcja Bonusowa; alternatywnie można potraktować jako darmową interakcję, jeśli MG tak prowadzi scenę."
    },
    description: {
      chat: "",
      value: "<p>Przeładowuje broń po strzale. Jeżeli w komorze był już żywy nabój, czynność wyrzuca go z broni i może załadować kolejny, jeśli w magazynku pozostała amunicja.</p>"
    },
    roll: {
      formula: "",
      name: "",
      prompt: false,
      visible: false
    },
    flags: {
      [MODULE_ID]: {
        [MANAGED_ACTIVITY_FLAGS.MANAGED]: true,
        [MANAGED_ACTIVITY_FLAGS.KIND]: "reload"
      }
    }
  };
}

function _buildLoadOneActivityData(item, magazineType = getMagazineType(item)) {
  const label = magazineType === MAGAZINE_TYPES.CYLINDER ? "bębenka" : "magazynka wewnętrznego";
  return {
    name: "Doładuj 1 nabój",
    activation: {
      type: "action",
      value: 1,
      condition: "Neuroshima: standardowo Akcja; przy Szybkim przeładowaniu może zejść do Akcji Bonusowej."
    },
    description: {
      chat: "",
      value: `<p>Doładowuje pojedynczy nabój do ${label}. Czynność zużywa amunicję z ekwipunku i respektuje ekonomię akcji.</p>`
    },
    roll: {
      formula: "",
      name: "",
      prompt: false,
      visible: false
    },
    flags: {
      [MODULE_ID]: {
        [MANAGED_ACTIVITY_FLAGS.MANAGED]: true,
        [MANAGED_ACTIVITY_FLAGS.KIND]: "loadOne"
      }
    }
  };
}

function _findManagedMagazineActivity(item, kind) {
  for (const activity of item.system.activities ?? []) {
    if (_getActivityModuleFlag(activity, MANAGED_ACTIVITY_FLAGS.MANAGED) !== true) continue;
    if (_getActivityModuleFlag(activity, MANAGED_ACTIVITY_FLAGS.KIND) === kind) return activity;
  }
  return null;
}

function _getActivityModuleFlag(activity, key) {
  return activity?.flags?.[MODULE_ID]?.[key];
}

function _shouldManageMagazineActivities(item) {
  if (!item || item.type !== "weapon" || item.pack) return false;
  const isFirearm = item.system.type?.value?.startsWith?.("palna") ?? false;
  return isFirearm
    || !!_findManagedMagazineActivity(item, "reload")
    || !!_findManagedMagazineActivity(item, "loadOne")
    || !!_findManagedMagazineActivity(item, "magSwap");
}

function registerAttackReloadGuard() {
  const BaseAttackActivity = CONFIG.DND5E.activityTypes?.attack?.documentClass;
  if (!BaseAttackActivity || BaseAttackActivity.prototype._neuroReloadWrapped) return;

  const originalRollAttack = BaseAttackActivity.prototype.rollAttack;
  BaseAttackActivity.prototype.rollAttack = async function neuroRollAttack(config = {}, dialog = {}, message = {}) {
    const liveItem = _getLiveItem(this.item);
    if (!_isTrackedRangedWeapon(liveItem) || _isCustomActivity(this)) {
      const result = await originalRollAttack.call(this, config, dialog, message);
      // Untracked firearms (e.g. jednorazowa) still get a shot sound
      const isUntrackedFirearm = !_isTrackedRangedWeapon(liveItem) && !_isCustomActivity(this)
        && liveItem?.system?.type?.value?.startsWith("palna");
      if (isUntrackedFirearm) {
        const cancelled = (result === false) || (result == null) || (Array.isArray(result) && result.length === 0);
        if (!cancelled) {
          playShotSound(liveItem, {
            caliberId: getMag(liveItem)?.ammoType, token: liveItem.actor,
          });
          _playSingleShotVfx(liveItem, result);
        }
      }
      return result;
    }

    if (_requiresManualReloadBeforeUse(liveItem)) {
      ui.notifications.warn(_getReloadRequiredWarning(liveItem));
      return false;
    }

    const mag = getMag(liveItem);
    if (mag && mag.current <= 0 && !_getManualReloadMode(liveItem)) {
      playUtilitySound("click", liveItem, WeaponSound.EMPTY_CLICK, {
        caliberId: mag.ammoType, token: liveItem.actor,
      });
      seqScrollText("PUSTE!", liveItem.actor, { color: "#e67e22", fontSize: 30, duration: 1800 });
      await _announceEmptyMagazine(liveItem);
      return false;
    }

    const snapshot = _snapshotShotState(liveItem);

    const result = await originalRollAttack.call(this, config, dialog, message);
    if ((result === false) || (result == null)) return result;
    if (Array.isArray(result) && (result.length === 0)) return result;

    if (Array.isArray(result) && result.some(roll => roll?.isFumble) && !isJamImmune(liveItem)) {
      await _restoreAbortedShotState(liveItem, snapshot);
      return result;
    }

    await _processSingleShotAttack(this, liveItem, snapshot);
    playShotSound(liveItem, {
      caliberId: getMag(liveItem)?.ammoType, token: liveItem.actor,
    });
    _playSingleShotVfx(liveItem, result);
    return result;
  };

  BaseAttackActivity.prototype._neuroReloadWrapped = true;
}

/**
 * Fire the single-shot VFX (muzzle flash + tracer + hit impact) via Sequencer.
 * Hit/miss is derived from the first attack roll vs the current target's AC.
 * A full downrange payoff (tracer + impact) only shows when a target is selected —
 * this is intentional, to reward using Foundry's targeting (PLAN_shooting_vfx.md §1).
 *
 * @param {Item5e} item             The firearm that was fired.
 * @param {Array|boolean} result    Roll array returned by rollAttack.
 */
function _playSingleShotVfx(item, result) {
  const shooter = item?.actor;
  if (!shooter) return;
  const targetToken = game.user?.targets?.first() ?? null;
  const roll = Array.isArray(result) ? result[0] : null;
  const hit = _isAttackHit(roll, targetToken);
  tracerFire({
    shooter, target: targetToken, hit, rounds: 1,
    caliber: getMag(item)?.ammoType, weaponId: item.system?.identifier
  });
}

/**
 * Determine whether an attack roll hit a target token, by comparing the roll
 * total to the target's AC. Critical hits always hit; fumbles always miss.
 *
 * @param {object|null} roll         A dnd5e D20Roll (or null).
 * @param {Token|null} targetToken   The targeted canvas token (or null).
 * @returns {boolean}
 */
function _isAttackHit(roll, targetToken) {
  if (!roll || !targetToken) return false;
  if (roll.isCritical) return true;
  if (roll.isFumble) return false;
  const ac = targetToken.actor?.system?.attributes?.ac?.value;
  if (typeof ac !== "number") return false;
  return (roll.total ?? 0) >= ac;
}

function _getReloadState(item) {
  return item?.getFlag(MODULE_ID, RELOAD_STATE_FLAG) ?? {};
}

/**
 * Stan komory w starym kształcie (`{ loaded }`) — używany przez reguły `przeladowanie`/`ladowanie`
 * w tym pliku. Nowy kształt (`{ caliberId }`) wystawia `getChamber()`.
 */
function _getChamberState(item, mag = getMag(item)) {
  /* Broń bez komory (`beb` i osiem wpisów z `chamber: false`) zawsze zgłasza się jako gotowa,
     gdy ma czym strzelać — jej „komora" JEST źródłem, więc osobny stan nie istnieje. */
  if (!weaponHasChamber(item)) return { loaded: Number(mag?.current ?? 0) > 0 };
  return { loaded: chamberedCaliber(item) != null };
}

async function _setReloadState(item, state) {
  const normalized = Object.fromEntries(Object.entries(state ?? {}).filter(([, value]) => value !== false && value != null && value !== ""));
  if (Object.keys(normalized).length > 0) return item.setFlag(MODULE_ID, RELOAD_STATE_FLAG, normalized);
  return item.unsetFlag(MODULE_ID, RELOAD_STATE_FLAG);
}

/**
 * Zapis stanu komory w starym kształcie. Przechodzi przez `setChamber()`, żeby istniała
 * dokładnie jedna droga zapisu i żeby projekcja przeliczyła się razem z nim.
 */
async function _setChamberState(item, state) {
  return setChamber(item, { loaded: state?.loaded === true });
}

async function _clearReloadState(item) {
  return _setReloadState(item, {});
}

function _isTrackedRangedWeapon(item) {
  return !!item && (item.type === "weapon") && (getMag(item) !== null);
}

function _isCustomActivity(activity) {
  return CUSTOM_ACTIVITY_TYPES.has(activity?.type);
}

function _isSingleShotActivity(activity) {
  return ["attack"].includes(activity?.type);
}

function _getLiveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

function _getManualReloadMode(item) {
  if (_hasProperty(item, "ladowanie")) return "ladowanie";
  if (_hasProperty(item, "przeladowanie")) return "przeladowanie";
  return null;
}

function _ignoresManualReloadMode(item, mode = _getManualReloadMode(item)) {
  if (mode !== "przeladowanie") return false;
  return hasAbility(item?.actor, ABILITY_KEYS.SZYBKIE_PRZELADOWANIE);
}

function _requiresManualReloadBeforeUse(item) {
  const mode = _getManualReloadMode(item);
  if (!mode) return false;
  if (_ignoresManualReloadMode(item, mode)) return false;
  if (_getReloadState(item).required === true) return true;
  return _getChamberState(item).loaded !== true;
}

function _getReloadRequiredWarning(item) {
  const mode = _getReloadState(item).mode ?? _getManualReloadMode(item);
  const mag = getMag(item);
  if (mode === "przeladowanie") {
    if (Number(mag?.current ?? 0) <= 0) {
      return `${item.name}: komora jest pusta, a magazynek wewnętrzny także jest pusty.`;
    }
    return `${item.name}: po poprzednim strzale trzeba przeładować broń (darmowa interakcja lub Akcja Bonusowa).`;
  }

  return `${item.name}: po każdym strzale trzeba załadować nową sztukę amunicji.`;
}

async function _announceEmptyMagazine(item) {
  const mag = getMag(item);
  const magType = getMagazineType(item);
  const label = magType === MAGAZINE_TYPES.CYLINDER ? "bębenek" : "magazynek";
  const warningHtml = `<div class="neuro-chat-warning"><span class="neuro-chat-warning-icon">⚠</span><span><strong>${item.name}</strong> — ${label} pusty. Trzeba przeładować.</span></div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: warningHtml
  });
}

function _getReloadStateHint(item, reloadState = _getReloadState(item)) {
  const mag = getMag(item);
  if (reloadState.mode === "przeladowanie") {
    return _canCycleReloadWithoutAmmo(item, mag, reloadState)
      ? "Przeładuj po strzale (bez użycia amunicji)."
      : (Number(mag?.current ?? 0) > 0
        ? "Przeładuj po strzale."
        : "Przeładuj (ale brak amunicji).");
  }

  return "Załaduj nową po strzale.";
}

function _shouldAnnounceQuickReload(item, mode = _getManualReloadMode(item), mag = getMag(item)) {
  const actualMode = _getManualReloadMode(item);
  if (actualMode !== "przeladowanie") return false;
  if (mode && (mode !== actualMode)) return false;
  if (!_ignoresManualReloadMode(item, actualMode)) return false;
  return Number(mag?.current ?? 0) > 0;
}

async function _announceQuickReload(item, mag = getMag(item)) {
  if (!_shouldAnnounceQuickReload(item, undefined, mag)) return;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: `<div style="border-left:3px solid #6b7a40;padding-left:8px"><strong>${item.actor?.name ?? "Postać"}</strong> błyskawicznie przeładowuje <em>${item.name}</em>. Broń jest gotowa do następnego strzału. Łącznie załadowane: ${Number(mag?.current ?? 0)}/${Number(mag?.max ?? 0)}.${buildAbilityRuleChangeNotice(ABILITY_KEYS.SZYBKIE_PRZELADOWANIE, "właściwość Przeładowanie została zignorowana; broń nie wymaga osobnej czynności przeładowania po strzale.")}</div>`
  });
}

/**
 * „Przeładowanie" — przepchnięcie zamka/pompki po strzale. Nie zużywa amunicji z zapasu:
 * przenosi nabój ze źródła do komory.
 *
 * Jeśli w komorze siedział jeszcze ŻYWY nabój (gracz przeładowuje, nie strzelając), zostaje
 * on wyrzucony i przepada. Tak działa broń i tak działało to przed przebudową — teraz tylko
 * wiemy, jaki to był kaliber, więc karta czatu może to powiedzieć.
 */
async function _performReloadAction(item, { chat = true, spendResource = true, source = "button" } = {}) {
  const liveItem = _getLiveItem(item);
  const actor = liveItem?.actor;
  const mag = getMag(liveItem);
  if (!liveItem || !mag) return false;

  const state = readState(liveItem);
  const ejectedCaliber = state.hasChamber ? state.chamber : null;
  const ejectedLiveRound = ejectedCaliber != null;

  /* Wyrzucenie żywego naboju i dosłanie następnego to jedna czynność — jeden zapis. */
  if (state.hasChamber) {
    state.chamber = state.rounds.length ? state.rounds.shift() : null;
    await applyState(liveItem, state);
  }
  await _clearReloadState(liveItem);

  const after = getMag(liveItem);
  const chamberLoaded = getChamber(liveItem).loaded;

  if (actor?.inCombat && spendResource) {
    await _spendCombatResource(actor, "bonus");
  }

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: _getReloadActionChatContent(liveItem, {
        ejectedLiveRound,
        ejectedCaliber,
        chamberLoaded,
        current: Number(after?.current ?? 0),
        max: Number(after?.max ?? 0),
        source,
        spentBonus: !!actor?.inCombat && spendResource
      })
    });
  }

  const _isFirearm = liveItem.system.type?.value?.startsWith?.("palna") ?? false;
  playUtilitySound(
    "reload",
    liveItem,
    _isFirearm ? WeaponSound.RELOAD_SINGLE : WeaponSound.RELOAD_OTHER,
    { caliberId: after?.ammoType ?? mag.ammoType, token: liveItem.actor },
  );
  seqScrollText("ZAŁADOWANO", liveItem.actor, { color: "#f1c40f", fontSize: 26, duration: 1500 });
  return { ejectedLiveRound, chamberLoaded, current: Number(after?.current ?? 0) };
}

/**
 * Doładowanie pojedynczego naboju do magazynka wewnętrznego albo bębenka.
 *
 * RAW przewiduje tę czynność **wyłącznie** dla `wmag` i `beb` — dla broni z wymiennym
 * magazynkiem nie ma takiej czynności i nie wolno jej dorabiać (PLAN_magazynki.md §6,
 * „W walce — zabronione"). Nabój idzie z luźnej puli w ekwipunku, z wyborem typu, gdy
 * aktor nosi kilka kalibrów z tej samej rodziny.
 */
async function _performLoadOneAction(item, { chat = true, spendResource = true, source = "activity" } = {}) {
  const liveItem = _getLiveItem(item);
  const actor = liveItem?.actor;
  if (!liveItem || !actor) return false;

  const magazineType = getMagazineType(liveItem);
  const mag = getMag(liveItem);
  if (!mag) {
    ui.notifications.warn(`${liveItem.name}: ta broń jest poza systemem magazynków.`);
    return false;
  }
  if (_hasRemovableSource(liveItem)) {
    ui.notifications.warn(
      `${liveItem.name}: do wymiennego magazynka nie wkłada się naboi po jednym — `
      + `wymień magazynek albo załaduj go poza walką.`
    );
    return false;
  }
  if (![MAGAZINE_TYPES.INTERNAL, MAGAZINE_TYPES.CYLINDER].includes(magazineType)) {
    ui.notifications.warn(`${liveItem.name}: ta broń nie jest doładowywana po jednym naboju.`);
    return false;
  }

  const container = magazineType === MAGAZINE_TYPES.CYLINDER ? "bębenka" : "magazynka wewnętrznego";
  if (Number(mag.current ?? 0) >= Number(mag.max ?? 0)) {
    ui.notifications.info(`${liveItem.name}: ${container.replace("a", "")} jest pełny.`);
    return false;
  }

  const pick = await _chooseFamilyAmmo(actor, mag.ammoType);
  if (!pick) return false;
  const { ammoItem, caliberId } = pick;

  const available = Number(ammoItem.system.quantity ?? 0);
  if (available <= 0) {
    ui.notifications.warn(`${ammoItem.name}: wyczerpana.`);
    return false;
  }

  if (!(await loadSingleRound(liveItem, caliberId))) {
    ui.notifications.info(`${liveItem.name}: nie ma już miejsca.`);
    return false;
  }

  if (available <= 1) await ammoItem.delete();
  else await ammoItem.update({ "system.quantity": available - 1 });

  /* Nabój faktycznie wszedł, więc stan „trzeba przeładować" przestaje obowiązywać.
     Bugfix 2026-09-06 (Pistolet na Race): bez tego `_requiresManualReloadBeforeUse` blokowało
     każdą aktywność na już przeładowanej broni, bo flagi zostawały z ostatniego strzału. */
  await _clearReloadState(liveItem);

  const reloadPlan = _getReloadPlan(liveItem, mag, { magazineType });
  const inCombatSpent = !!(actor.inCombat && spendResource);
  if (inCombatSpent) await _spendCombatResource(actor, reloadPlan.actionType);

  if (chat) {
    const nextMag = getMag(liveItem);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="neuro-mag-card">`
        + `<div class="neuro-mag-head"><strong>${actor.name}</strong> doładowuje <em>${liveItem.name}</em>`
        + ` o 1 nabój (${_caliberLabel(caliberId)}) do ${container}.</div>`
        + `<div class="neuro-mag-state">Stan broni: ${Number(nextMag?.current ?? 0)}/${Number(nextMag?.max ?? 0)}`
        + `${_nextRoundNote(liveItem)}</div>`
        + `${_getReloadRuleChangeNotice(reloadPlan, { inCombat: inCombatSpent })}</div>`
        + `<ul class="card-footer pills unlist"><li class="pill transparent">`
        + `<span class="label">${reloadPlan.actionLabel}${inCombatSpent ? "" : " (poza walką)"}</span></li></ul>`
    });
  }

  playUtilitySound("reload", liveItem, WeaponSound.RELOAD_SINGLE, {
    caliberId: getMag(liveItem)?.ammoType, token: actor,
  });
  seqScrollText("ZAŁADOWANO", actor, { color: "#f1c40f", fontSize: 26, duration: 1500 });
  return true;
}

function _getReloadActionChatContent(item, { ejectedLiveRound, ejectedCaliber, chamberLoaded, current, max, spentBonus = false } = {}) {
  const actorName = item.actor?.name ?? "Postać";
  const pill = `<ul class="card-footer pills unlist"><li class="pill transparent">`
    + `<span class="label">Akcja bonusowa${spentBonus ? "" : " (poza walką)"}</span></li></ul>`;
  const wrap = body => `<div class="neuro-mag-card">${body}</div>${pill}`;
  const ejected = ejectedCaliber ? ` (${_caliberLabel(ejectedCaliber)})` : "";
  const source = _sourceNoun(item);

  if (ejectedLiveRound && chamberLoaded) {
    return wrap(`<div class="neuro-mag-head"><strong>${actorName}</strong> przeładowuje <em>${item.name}</em></div>`
      + `<div class="neuro-mag-body">Niezbity nabój${ejected} wylatuje z komory; następny wchodzi na jego miejsce.</div>`
      + `<div class="neuro-mag-state">Stan broni: ${current}/${max}${_nextRoundNote(item)}</div>`);
  }
  if (ejectedLiveRound) {
    return wrap(`<div class="neuro-mag-head"><strong>${actorName}</strong> przeładowuje <em>${item.name}</em></div>`
      + `<div class="neuro-mag-body">Niezbity nabój${ejected} wylatuje z komory — i nie ma czym go zastąpić.</div>`
      + `<div class="neuro-mag-state"><em>${_capitalize(source)} jest pusty.</em></div>`);
  }
  if (chamberLoaded) {
    return wrap(`<div class="neuro-mag-head"><strong>${actorName}</strong> przeładowuje <em>${item.name}</em> po strzale</div>`
      + `<div class="neuro-mag-body">Broń znów jest gotowa.</div>`
      + `<div class="neuro-mag-state">Stan broni: ${current}/${max}${_nextRoundNote(item)}</div>`);
  }
  return wrap(`<div class="neuro-mag-head"><strong>${actorName}</strong> przeładowuje <em>${item.name}</em></div>`
    + `<div class="neuro-mag-body">Mechanizm chodzi na sucho.</div>`
    + `<div class="neuro-mag-state"><em>${_capitalize(source)} jest pusty.</em></div>`);
}

function _capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function _getReloadRuleChangeNotice(reloadPlan, { inCombat = false } = {}) {
  if (!inCombat || !reloadPlan?.ruleChangeAbilityKey || !reloadPlan?.ruleChangeText) return "";
  return buildAbilityRuleChangeNotice(reloadPlan.ruleChangeAbilityKey, reloadPlan.ruleChangeText);
}

/**
 * Zużycie naboju po strzale pojedynczym — **wyłącznie** przez `consumeRounds()`.
 *
 * ## Dlaczego nie czytamy już delty `system.uses.spent`
 *
 * Poprzednia wersja sprawdzała, czy dnd5e samo zdekrementowało `uses.spent`, i dopiero gdy nie —
 * odejmowała nabój sama. Ta gałąź była martwa: aktywności tej broni mają `consumption.targets: []`,
 * więc dnd5e nigdy nie konsumuje `uses`. Gorzej — teraz `uses` jest PROJEKCJĄ liczoną z kolejki,
 * więc czytanie z niej ilości do odjęcia byłoby czytaniem własnego wyniku i przy pierwszej zmianie
 * po stronie dnd5e dałoby podwójne odjęcie naboju albo pętlę zapisów. Kierunek jest odtąd
 * jednostronny: kolejka → projekcja, nigdy odwrotnie.
 *
 * Komory nie trzeba tu zerować — `_fireOne()` przy `feed === "manual"` zostawia ją pustą sam,
 * bo to jest definicja tego trybu podawania.
 */
async function _consumeSingleShotAmmo(item, snapshot) {
  if (!getMag(item)) return false;
  const fired = await consumeRounds(item, 1);
  return Array.isArray(fired) && fired.length > 0;
}

/**
 * Pełny stan źródła i komory przed strzałem — do odtworzenia, gdy strzał się nie odbył.
 *
 * Siatka bezpieczeństwa, nie główna ścieżka: zużycie następuje po rzucie
 * (`_processSingleShotAttack`), więc przerwany rzut zwykle nie ma czego cofać. Zostaje na
 * wypadek, gdyby kiedyś coś zaczęło ruszać stan w trakcie `rollAttack`.
 */
function _snapshotShotState(item) {
  const state = readState(item);
  return {
    rounds: [...state.rounds],
    chamber: state.chamber,
    magId: state.source?.kind === "magazine" ? state.source.item.id : null
  };
}

async function _restoreAbortedShotState(item, snapshot) {
  if (!snapshot) return;
  const state = readState(item);
  if (!state.source) return;
  /* Magazynek podmieniony w trakcie? Wtedy odtwarzanie starej kolejki wpisałoby ją do nowego
     pojemnika — nie ruszamy niczego, bo gorzej byłoby zgadnąć. */
  if (snapshot.magId && (state.source.kind === "magazine") && (state.source.item.id !== snapshot.magId)) return;

  state.rounds = [...snapshot.rounds];
  state.chamber = snapshot.chamber;
  await applyState(item, state);
}

async function _processSingleShotAttack(activity, liveItem, snapshot) {
  processedSingleShotActivities.add(activity);
  await _consumeSingleShotAmmo(liveItem, snapshot);
  await _markManualReloadAfterShot(liveItem);
  await _announceQuickReload(liveItem);
}

async function _markManualReloadAfterShot(item) {
  const mode = _getManualReloadMode(item);
  if (!mode) return;
  if (_ignoresManualReloadMode(item, mode)) {
    await _setChamberState(item, { loaded: Number(getMag(item)?.current ?? 0) > 0 });
    await _clearReloadState(item);
    return;
  }

  await _setReloadState(item, {
    required: true,
    mode,
    requiredAt: Date.now()
  });
}

function _canCycleReloadWithoutAmmo(item, mag = getMag(item), reloadState = _getReloadState(item)) {
  if (!reloadState.required) return false;
  if ((reloadState.mode ?? _getManualReloadMode(item)) !== "przeladowanie") return false;
  if (_ignoresManualReloadMode(item, "przeladowanie")) return false;
  return _getChamberState(item, mag).loaded !== true;
}

/**
 * Predykaty reguł wystawione dla testów Quench (`scripts/tests/magazynki.test.mjs`).
 * Wyłącznie odczyt — pozwalają sprawdzić reguły bez przechodzenia przez dialogi.
 *
 * `findReadyMagazine` i `restoreQuantumMagazinesForActor` zniknęły razem z magazynkami
 * kwantowymi; testy, które ich używały, opisywały mechanikę, której już nie ma.
 */
export const __testing = Object.freeze({
  MAGAZINE_TYPES,
  reloadPlan: _getReloadPlan,
  manualReloadMode: _getManualReloadMode,
  ignoresManualReloadMode: _ignoresManualReloadMode,
  requiresManualReloadBeforeUse: _requiresManualReloadBeforeUse,
  chooseFamilyAmmo: _chooseFamilyAmmo,
  findAmmo: _findAmmo,
  hasRemovableSource: _hasRemovableSource,
  sourceNoun: _sourceNoun,
  sourceLabel: _sourceLabel,
  chamberState: _getChamberState,
  queueChips: _queueChips
});
