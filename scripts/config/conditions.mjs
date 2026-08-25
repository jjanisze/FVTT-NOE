/**
 * Neuroshima 5e — Stany (conditions / status effects).
 *
 * dnd5e 5.3 ships ~40 status effects across three tables. Neuroshima has its own,
 * much shorter list. This file makes `CONFIG.DND5E.conditionTypes` /
 * `.statusEffects` say what the Neuroshima rulebook says and nothing else.
 *
 * ## Where the list comes from
 *
 * - **TABELA STANÓW** (rozdział *Walka*) — 14 stany, the canonical list. Every one
 *   of them maps 1:1 onto a status id dnd5e already has, so nothing is invented
 *   here; the entries are renamed to the rulebook's Polish nouns and given the
 *   rulebook's own effect text as their description.
 * - **ZAGROŻENIA** (rozdział *Zasady szczegółowe*) — Choroba, Fobia, Niedożywienie,
 *   Odwodnienie, Podpalenie, Przemarznięcie, Skażenie radioaktywne, Spadanie,
 *   Uduszenie. These are not "stany" in the table sense, but they are named game
 *   states the rules refer to, and several are already driven by module code.
 * - **Tura w pigułce** — Unikanie and Ukrywanie się are actions that leave a
 *   trackable state on the token, so their markers stay.
 *
 * ## Why the names are literal strings
 *
 * dnd5e registers `preLocalize("conditionTypes", { key: "name" })`, so every `name`
 * goes through `game.i18n.localize()`. A literal Polish string is returned
 * unchanged, which is exactly what `exhaustion.mjs` already relies on. Setting the
 * names here rather than in `lang/pl.json` keeps the rulebook wording next to the
 * rulebook text — and avoids the collision baked into the generic translations,
 * where `DND5E.ConDeafened` was "Ogłuszony" even though in Neuroshima **Ogłuszenie
 * is `stunned`** and `deafened` is **Ogłuchnięcie**.
 *
 * ## Timing
 *
 * dnd5e assembles `CONFIG.statusEffects` from these two tables in its own
 * `i18nInit` hook (`dnd5e.mjs` → `_configureStatusEffects`). Everything here must
 * therefore run at `init`, which is where `main.mjs` calls it.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** dnd5e keeps its status art here; the 14 canonical stany all reuse it. */
const SVG = "systems/dnd5e/icons/svg/statuses";
/** Icons this module ships (see `icons/statuses/ASSETS.md`). */
const OWN = `modules/${MODULE_ID}/icons/statuses`;

/* -------------------------------------------- */
/*  TABELA STANÓW — the canonical 14             */
/* -------------------------------------------- */

/**
 * The 14 stany from TABELA STANÓW, keyed by the dnd5e status id they map onto.
 * `description` quotes the rulebook; it surfaces in the effect the token HUD creates.
 * @type {Readonly<Record<string, {name: string, img: string, description: string, statuses?: string[], riders?: string[], special?: string}>>}
 */
export const NEUROSHIMA_STANY = Object.freeze({
  unconscious: {
    name: "Nieprzytomność",
    img: `${SVG}/unconscious.svg`,
    description: "<p><strong>Bezwładność.</strong> Otrzymujesz stany Obezwładnienie i Powalenie oraz upuszczasz wszystko, co trzymasz.<br>"
      + "<strong>Szybkość 0.</strong> Twoja Szybkość spada do 0 i nie może się zwiększyć.<br>"
      + "<strong>Testy Ataku z Ułatwieniem</strong> przeciw tobie.<br>"
      + "<strong>Rzuty Obronne.</strong> Automatycznie nie zdajesz RO na Siłę i Zręczność.<br>"
      + "<strong>Automatyczne TK</strong> z zasięgu 1,5 m.</p>",
    statuses: ["incapacitated"],
    riders: ["prone"]
  },
  invisible: {
    name: "Niewidoczność",
    img: `${SVG}/invisible.svg`,
    description: "<p><strong>Ukrycie.</strong> Nikt cię nie dostrzeże bez specjalnych zdolności.<br>"
      + "<strong>Testy Ataku</strong> przeciwko tobie mają Utrudnienie, a swoje ataki wykonujesz z Ułatwieniem.</p>"
  },
  incapacitated: {
    name: "Obezwładnienie",
    img: `${SVG}/incapacitated.svg`,
    description: "<p><strong>Oszołomienie.</strong> Nie możesz wykonywać żadnych akcji, Akcji Bonusowych ani Reakcji.<br>"
      + "<strong>Niemowa.</strong> Nie możesz mówić.<br>"
      + "<strong>Zamroczenie.</strong> Utrudnienie w rzutach na Inicjatywę.</p>",
    neverBlockMovement: true
  },
  deafened: {
    name: "Ogłuchnięcie",
    img: `${SVG}/deafened.svg`,
    description: "<p><strong>Głuchota.</strong> Nic nie słyszysz i automatycznie odnosisz porażki w Testach Cech wymagających słuchu.</p>"
  },
  stunned: {
    name: "Ogłuszenie",
    img: `${SVG}/stunned.svg`,
    description: "<p>Otrzymujesz stan Obezwładnienie. Testy Ataku przeciw tobie z Ułatwieniem. "
      + "Automatycznie nie zdajesz RO na Siłę i Zręczność.</p>",
    statuses: ["incapacitated"]
  },
  blinded: {
    name: "Oślepienie",
    img: `${SVG}/blinded.svg`,
    description: "<p><strong>Ślepota.</strong> Nic nie widzisz i automatycznie odnosisz porażkę w Testach Cech wymagających widzenia. "
      + "Testy Ataku przeciw tobie z Ułatwieniem, twoje z Utrudnieniem.</p>",
    special: "BLIND"
  },
  grappled: {
    name: "Pochwycenie",
    img: `${SVG}/grappled.svg`,
    description: "<p><strong>Szybkość 0.</strong> Szybkość spada do 0.<br>"
      + "<strong>Testy Ataku.</strong> Utrudnienie do Testów Ataku przeciw celom, które cię nie pochwyciły.<br>"
      + "<strong>Ciągnięcie.</strong> Istota, która cię pochwyciła, może się przemieszczać ciągnąc cię — każdy metr kosztuje ją "
      + "dodatkowy metr Szybkości (chyba że jest o dwa rozmiary większa).</p>"
  },
  prone: {
    name: "Powalenie",
    img: `${SVG}/prone.svg`,
    description: "<p><strong>Ograniczenie ruchu.</strong> Możesz się jedynie czołgać lub poświęcić połowę Szybkości na podniesienie się.<br>"
      + "<strong>Testy Ataku wręcz</strong> z Utrudnieniem. Testy Ataku przeciw tobie z Ułatwieniem (zasięg 1,5 m) "
      + "lub Utrudnieniem (większy dystans).</p>"
  },
  frightened: {
    name: "Przerażenie",
    img: `${SVG}/frightened.svg`,
    description: "<p><strong>Drżenie rąk.</strong> Utrudnienie w Testach Ataku i Testach Cech.<br>"
      + "<strong>Nogi z waty.</strong> Nie możesz z własnej woli zbliżyć się do źródła strachu.</p>"
  },
  paralyzed: {
    name: "Sparaliżowanie",
    img: `${SVG}/paralyzed.svg`,
    description: "<p>Otrzymujesz Obezwładnienie. Szybkość 0. Automatycznie nie zdajesz RO na Siłę i Zręczność. "
      + "Automatyczne TK z zasięgu 1,5 m.</p>",
    statuses: ["incapacitated"]
  },
  restrained: {
    name: "Unieruchomienie",
    img: `${SVG}/restrained.svg`,
    description: "<p><strong>Szybkość 0.</strong> Testy Ataku przeciw tobie z Ułatwieniem, twoje Testy Ataku z Utrudnieniem. "
      + "Utrudnienie w RO na Zręczność.</p>"
  },
  exhaustion: {
    name: "Wyczerpanie",
    // Nadpisane w `exhaustion.mjs` na wlasny komplet z niebieska cyfra — dnd5e wyprowadza
    // sciezke poziomu wlasnie z tego pola, wiec podmiana bazy przekierowuje caly zestaw.
    img: `${SVG}/exhaustion.svg`,
    description: "<p><strong>Kumuluje się.</strong> Każde nałożenie zwiększa poziom o 1. Umierasz na poziomie 6.<br>"
      + "<strong>Testy k20</strong> pomniejszone o 2 × poziom wyczerpania.<br>"
      + "<strong>Szybkość</strong> zmniejszona o 1,5 m × poziom wyczerpania.<br>"
      + "<strong>Usuwanie:</strong> Długi odpoczynek redukuje 1 poziom.</p>",
    levels: 6,
    // reduction.speed is set to 1.5 by `exhaustion.mjs`, which owns the rest of
    // Wyczerpanie (source tracking, rest interception, pip tooltips).
    reduction: { rolls: 2, speed: 1.5 }
  },
  poisoned: {
    name: "Zatrucie",
    img: `${SVG}/poisoned.svg`,
    description: "<p>Utrudnienie w Testach Ataku i Testach Cech.</p>"
  },
  charmed: {
    name: "Zauroczenie",
    img: `${SVG}/charmed.svg`,
    description: "<p><strong>Nie szkodzę.</strong> Nie możesz podjąć działania, które może uczynić krzywdę istocie, która cię zauroczyła.<br>"
      + "<strong>Premia społeczna.</strong> Ta istota ma Ułatwienie w Testach Cech opartych na Charyzmie wykonywanych przeciwko tobie.</p>"
  }
});

/* -------------------------------------------- */
/*  ZAGROŻENIA + bookkeeping markers             */
/* -------------------------------------------- */

/**
 * States kept beyond TABELA STANÓW. Each is either a named [ZAGROŻENIE] from
 * *Zasady szczegółowe*, an action from *Tura w pigułce*, or a marker the engine
 * needs to function at all.
 *
 * `pseudo: true` matches how dnd5e flags conditions that have no SRD rules page —
 * it keeps them out of the "conditions" rules lookup while still listing them.
 */
export const NEUROSHIMA_ZAGROZENIA = Object.freeze({
  bleeding: {
    name: "Krwawienie",
    img: `${SVG}/bleeding.svg`,
    description: "<p>RO na Kondycję o ST 10 na koniec swojej tury. Porażka: 1k4 obrażeń. "
      + "Trzy sukcesy pod rząd kończą krwawienie.</p><p>Patrz Hemofilia — <em>Choroby przewlekłe</em>.</p>",
    pseudo: true
  },
  burning: {
    name: "Podpalenie",
    img: `${SVG}/burning.svg`,
    description: "<p>Otrzymujesz 1k4 obrażeń od ognia na początku każdej swojej tury. Używając akcji, możesz spróbować się ugasić, "
      + "przewracając się i turlając po ziemi (stan Powalenie). Ogień gaśnie także od gaśnicy, zanurzenia w wodzie "
      + "lub zduszenia płomieni.</p>",
    pseudo: true
  },
  suffocation: {
    name: "Uduszenie",
    img: `${SVG}/suffocation.svg`,
    description: "<p>Możesz wstrzymać oddech na 1 + modyfikator Kondycji minut (minimum 30 sekund). Kiedy skończy ci się powietrze, "
      + "otrzymujesz 1 poziom Wyczerpania na końcu każdej swojej tury. Ponowne oddychanie usuwa wszystkie poziomy "
      + "Wyczerpania z duszenia się.</p>",
    pseudo: true
  },
  malnutrition: {
    name: "Niedożywienie",
    img: `${SVG}/malnutrition.svg`,
    description: "<p>Istota jedząca mniej niż połowę dziennego zapotrzebowania zdaje RO na Kondycję o ST 10, inaczej otrzymuje "
      + "poziom Wyczerpania na koniec dnia. Tego Wyczerpania nie da się usunąć, dopóki nie zje pełnej dziennej porcji.</p>",
    pseudo: true
  },
  dehydration: {
    name: "Odwodnienie",
    img: `${SVG}/dehydration.svg`,
    description: "<p>Istota pijąca mniej niż połowę dziennego zapotrzebowania otrzymuje poziom Wyczerpania na koniec dnia. "
      + "Tego Wyczerpania nie da się usunąć, dopóki nie wypije pełnej dziennej porcji.</p>",
    pseudo: true
  },
  falling: {
    name: "Spadanie",
    img: `${SVG}/falling.svg`,
    description: "<p>1k6 obrażeń obuchowych za każde 1,5 m wysokości. Po uderzeniu o podłoże otrzymujesz stan Powalenie, "
      + "chyba że obrażenia wyniosły 0.</p>",
    pseudo: true
  },
  diseased: {
    name: "Choroba",
    img: `${SVG}/diseased.svg`,
    description: "<p>Choroby przewlekłe i popularne prowadzone są na zakładce Biografia. Ten znacznik służy wyłącznie do "
      + "oznaczenia pionka.</p>",
    pseudo: true
  },
  surprised: {
    name: "Zaskoczenie",
    img: `${SVG}/surprised.svg`,
    description: "<p>Zaskoczona istota rzuca na Inicjatywę z Utrudnieniem.</p>",
    pseudo: true
  },
  // Lustrzane odbicie Zaskoczenia i jedyny stan na tej liście, którego dnd5e nie zna.
  // Nakładany ręcznie, bo Niespodziewany atak nie wynika z mechaniki — to rozstrzygnięcie
  // MG o tym, kto w chwili wybuchu walki był gotów. Ikona po skasowanym `marked`.
  ambush: {
    name: "Niespodziewany atak",
    img: `${SVG}/marked.svg`,
    description: "<p>Kiedy niegroźna sytuacja nagle przeradza się w walkę, <strong>atakujący</strong> rzuca "
      + "na Inicjatywę z Ułatwieniem.</p><p>To samo dotyczy istot, które trzymają broń i są przygotowane "
      + "na agresję (np. ochroniarze) — one również rzucają z Ułatwieniem.</p>",
    pseudo: true
  }
});

/**
 * Non-condition markers from `CONFIG.DND5E.statusEffects` that stay. These never
 * appear in TABELA STANÓW because they are not stany — they are actions, or state
 * the engine itself needs.
 */
export const NEUROSHIMA_MARKERS = Object.freeze({
  dead: {
    name: "Martwy",
    img: `${SVG}/dead.svg`,
    special: "DEFEATED",
    order: 1,
    neverBlockMovement: true
  },
  stable: {
    name: "Ustabilizowany",
    img: `${SVG}/stable.svg`,
    description: "<p>Istota na 0 PW, która przestała rzucać Rzuty Przeciw Śmierci.</p>"
  },
  dodging: {
    name: "Unikanie",
    img: `${SVG}/dodging.svg`,
    description: "<p>Akcja Unikanie — widziani przeciwnicy mają Utrudnienie do Testów Ataku przeciwko tobie.</p>"
  },
  hiding: {
    name: "Ukrywanie się",
    img: `${SVG}/hiding.svg`,
    description: "<p>Akcja Ukrywanie się — Test Zręczności (Skradanie się) w celu zyskania stanu Niewidoczność.</p>"
  },
  sleeping: {
    name: "Sen",
    img: `${SVG}/sleeping.svg`,
    statuses: ["incapacitated", "unconscious"]
  }
});

/* -------------------------------------------- */
/*  Removals                                     */
/* -------------------------------------------- */

/**
 * dnd5e conditions with no Neuroshima counterpart. All of these are fantasy or
 * magic constructs; none are referenced anywhere in the rulebook.
 */
export const REMOVED_CONDITIONS = Object.freeze([
  "petrified",    // Skamienienie — nothing turns to stone in Podzielone Stany
  "cursed",       // klątwa — magic
  "transformed",  // przemiana — magic
  "silenced"      // uciszenie — magic
]);

/**
 * dnd5e extra status effects with no Neuroshima counterpart.
 *
 * The cover markers go because Osłona is resolved **per attack** in a dialog
 * (`combat/cover.mjs`) and never read off the token — leaving them would put three
 * decorative toggles in the HUD that change nothing.
 */
export const REMOVED_STATUSES = Object.freeze([
  "concentrating",       // spellcasting is removed wholesale (`spellcasting.mjs`)
  "ethereal",            // magic
  "flying",              // no flight in Neuroshima
  "hovering",            // no flight in Neuroshima
  "burrowing",           // no burrow speed in Neuroshima
  "marked",              // a 5e class-feature marker
  "coverHalf",           // Osłona jest rozstrzygana per atak — patrz `combat/cover.mjs`
  "coverThreeQuarters",
  "coverTotal"
]);

/* -------------------------------------------- */
/*  conditionEffects — Neuroshima divergences    */
/* -------------------------------------------- */

/**
 * `CONFIG.DND5E.conditionEffects` is dnd5e's table of "which condition causes which
 * blanket mechanical effect". Two groups of entries are wrong for Neuroshima:
 *
 * **Wyczerpanie.** dnd5e's 2024 exhaustion is a ladder — disadvantage on checks at
 * 1, half movement at 2, disadvantage on saves and attacks at 3, half max HP at 4,
 * no movement at 5. Neuroshima's is a flat **−2 to every k20 test and −1,5 m
 * Szybkości per level**, and nothing else. Left alone, an actor at Wyczerpanie 2
 * would take the module's −3 m *and* dnd5e's ×0.5, and at 4 would silently lose
 * half their maximum PW. Every `exhaustion-N` entry is therefore dropped; the real
 * penalties come from `reduction` (see `exhaustion.mjs`).
 *
 * **Przerażenie.** In 5e, frightened only imposes disadvantage while the source is
 * in sight, so dnd5e leaves it out of this table and expects manual adjudication.
 * The Neuroshima entry is unconditional — "Utrudnienie w Testach Ataku i Testach
 * Cech" with no line-of-sight clause — so it is added here.
 *
 * `initiativeAdvantage` loses `invisible` — TABELA STANÓW says nothing about
 * Niewidoczność affecting Inicjatywa — and gains `ambush`, the Neuroshima-only state
 * behind „Niespodziewany atak" (see NEUROSHIMA_ZAGROZENIA).
 */
function buildConditionEffects() {
  return {
    noMovement: new Set(["grappled", "paralyzed", "restrained", "unconscious"]),
    halfMovement: new Set(),
    crawl: new Set(["prone", "exceedingCarryingCapacity"]),
    petrification: new Set(),
    halfHealth: new Set(),
    dehydrated: new Set(["dehydration"]),
    malnourished: new Set(["malnutrition"]),
    abilityCheckDisadvantage: new Set(["poisoned", "frightened"]),
    abilitySaveDisadvantage: new Set(),
    attackDisadvantage: new Set(["poisoned", "frightened"]),
    dexteritySaveDisadvantage: new Set(["restrained"]),
    initiativeAdvantage: new Set(["ambush"]),
    initiativeDisadvantage: new Set(["incapacitated", "surprised"])
  };
}

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

/**
 * Rebuild `CONFIG.DND5E.conditionTypes` and `.statusEffects` as the Neuroshima list.
 *
 * Mutates the existing objects rather than replacing them, for the same reason
 * `weapons.mjs` does: other config already holds references to these tables, and
 * swapping the object out from under them is how you get a DataModelValidationError
 * three hooks later.
 *
 * Must run at `init` — dnd5e freezes this into `CONFIG.statusEffects` at `i18nInit`.
 */
export function registerConditions() {
  const conditions = CONFIG.DND5E?.conditionTypes;
  const statuses = CONFIG.DND5E?.statusEffects;
  if (!conditions || !statuses) {
    console.warn(`${MODULE_ID} | conditionTypes/statusEffects not found, skipping condition overrides`);
    return;
  }

  // 1. Drop everything Neuroshima has no concept of.
  for (const key of REMOVED_CONDITIONS) delete conditions[key];
  for (const key of REMOVED_STATUSES) delete statuses[key];

  // Anything dnd5e ships that we neither kept nor explicitly removed is a new
  // condition from a system update. Warn rather than guess — silently keeping it
  // would let 5e rules leak back in, silently dropping it could break the engine.
  const known = new Set([
    ...Object.keys(NEUROSHIMA_STANY),
    ...Object.keys(NEUROSHIMA_ZAGROZENIA),
    ...REMOVED_CONDITIONS
  ]);
  for (const key of Object.keys(conditions)) {
    if (!known.has(key)) {
      console.warn(`${MODULE_ID} | Nieznany stan dnd5e "${key}" — zostawiam bez zmian. `
        + "Dopisz go do NEUROSHIMA_ZAGROZENIA lub REMOVED_CONDITIONS w conditions.mjs.");
    }
  }

  // 2. Rewrite the survivors in Neuroshima's terms.
  //    `reference` is stripped: it points at SRD rules pages describing the *D&D*
  //    version of the condition, which is exactly the wrong thing to show a player
  //    who clicked "Powalenie". The rulebook text in `description` replaces it.
  const apply = (table, defs) => {
    for (const [key, def] of Object.entries(defs)) {
      const entry = table[key] ??= {};
      delete entry.reference;
      Object.assign(entry, def);
    }
  };
  apply(conditions, NEUROSHIMA_STANY);
  apply(conditions, NEUROSHIMA_ZAGROZENIA);
  apply(statuses, NEUROSHIMA_MARKERS);

  // 3. Neuroshima-only levelled conditions (Upojenie, Skażenie radioaktywne).
  registerLevelledConditionConfig(conditions);

  // 4. Fix the blanket-effect table (see buildConditionEffects for why).
  CONFIG.DND5E.conditionEffects = buildConditionEffects();

  // 5. Zakrwawiony is dnd5e's ≤50% PW marker. Neuroshima tracks injury through
  //    Stopień Zranienia instead, and two competing "how hurt am I" readouts on one
  //    token is worse than either alone.
  if (CONFIG.DND5E.bloodied) CONFIG.DND5E.bloodied.threshold = 0;

  const total = Object.keys(conditions).length + Object.keys(statuses).length;
  console.log(`${MODULE_ID} | Stany: ${Object.keys(NEUROSHIMA_STANY).length} z TABELI STANÓW, `
    + `${Object.keys(NEUROSHIMA_ZAGROZENIA).length} zagrożeń, ${Object.keys(NEUROSHIMA_MARKERS).length} znaczników, `
    + `+3 stopniowane (Upojenie, Skażenie, Zranienie) — ${total} łącznie`);
}

/* -------------------------------------------- */
/*  Upojenie / Skażenie — config half            */
/* -------------------------------------------- */

/**
 * Register the two levelled Neuroshima conditions in `conditionTypes`.
 *
 * They live in `conditionTypes` (not `statusEffects`) so they show up in the same
 * HUD group as Wyczerpanie, which is what they behave like. The **enforcement** —
 * Active Effects, level cycling, saves — is in `actors/levelled-conditions.mjs`;
 * dnd5e's own levelled-condition machinery cannot be reused, because it is keyed
 * to the literal id `exhaustion` and to `system.attributes.exhaustion`
 * (`active-effect.mjs` → `_prepareExhaustionLevel` / `_manageExhaustion`).
 *
 * @param {object} conditions  `CONFIG.DND5E.conditionTypes`, mutated in place.
 */
function registerLevelledConditionConfig(conditions) {
  conditions.upojenie = {
    name: "Upojenie",
    img: `${OWN}/upojenie.svg`,
    description: "<p>Za każde 100 ml mocnego lub 500 ml słabego alkoholu: RO na Kondycję o ST 15. "
      + "Porażka to jeden stopień Upojenia. Efekty kumulują się.</p>"
      + "<p><strong>Kac.</strong> Cztery godziny bez alkoholu obniżają stopień o 1; przy każdym obniżeniu "
      + "RO na Kondycję o ST 10, inaczej stan Wyczerpanie.</p>",
    levels: 4,
    pseudo: true
  };

  // Stopień Zranienia is owned by `combat/zranienie.mjs` — it predates this file and
  // keeps its own store, penalties and pips. Registering it here only adds a third
  // *view* (the token icon), derived from the same flag the pips read; see the
  // "single store" note in that file's header.
  //
  // The icon is dnd5e's Zakrwawiony art, which this module frees up by zeroing
  // `bloodied.threshold`: Neuroshima measures injury with Stopień Zranienia instead,
  // so the icon lands on the mechanic that replaced it. Reusing `bleeding.svg` — as
  // `zranienie.mjs` did before conditions existed — would now be indistinguishable
  // from Krwawienie on the token.
  conditions.zranienie = {
    name: "Stopień Zranienia",
    img: `${SVG}/bloodied.svg`,
    description: "<p>Kumulatywne stopnie 1–4: Lekki, Znaczny, Poważny, Krytyczny.</p>"
      + "<p><strong>Szybkość</strong> −4,5 m (od 1). <strong>Brak Reakcji</strong> (od 2). "
      + "<strong>Brak Akcji Bonusowej</strong> (od 3). <strong>+1 Wyczerpanie</strong> (na 4).</p>"
      + "<p>Kolejny stopień ponad Krytyczny oznacza śmierć.</p>",
    levels: 4,
    pseudo: true
  };

  conditions.skazenie = {
    name: "Skażenie radioaktywne",
    img: `${OWN}/skazenie.svg`,
    description: "<p>W obszarze skażonym radioaktywnie: RO na Kondycję o ST zależnym od poziomu skażenia, "
      + "inaczej stan Wyczerpanie. Test powtarzany co godzinę do momentu przyjęcia środka RadOff.</p>"
      + "<p>Trzy oblane RO oznaczają chorobę popromienną.</p>",
    levels: 4,
    pseudo: true
  };
}
