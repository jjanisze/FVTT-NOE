/**
 * Neuroshima 5e — Gadżety: przedmioty czysto smaczkowe, które da się kliknąć.
 *
 * Gumowa kaczuszka Lorentza, krótkofalówki, kanister Laffitte'a, długopis Alana. Żaden z nich
 * nie ma i nie ma mieć mechaniki — ustalenie MG (2026-09-08): *„baterie krótkofalówek śledzi
 * (lub nie) MG, funkcjonują czysto dla smaczku"*. Jedyne, co robią, to hałasują w konkretnym
 * miejscu na mapie, żeby stół to usłyszał.
 *
 * ## Dlaczego to musi być `consumable`, a nie `loot`
 *
 * dnd5e nie pozwala trzymać Aktywności na typie `loot` — `ActivitiesTemplate` jest wpięty tylko
 * w consumable/equipment/facility/feat/spell/tool/weapon (sprawdzone w źródle systemu 5.3).
 * Wszystkie pięć przedmiotów to dziś `loot` z zerem aktywności, więc bez zmiany typu nie ma
 * czego kliknąć. Ten sam ruch ma już precedens w `items/kolczatka.mjs`.
 *
 * ⚠️ **Zmiana typu przedmiotu NIE przechodzi przez `.update()`** — Foundry po cichu unieważnia
 * WTEDY CAŁE wywołanie, nie tylko pole `type`. Udokumentowane niezależnie trzy razy w tym
 * repozytorium (`migrate-pistolet-race.mjs`, `migrate-gear-graduation.mjs`, `kolczatka.mjs`).
 * Konwersja istniejących kopii idzie więc przez skasuj-i-odtwórz, w
 * `migration/migrate-gadzety.mjs`.
 *
 * ## Dźwięk
 *
 * Przez Sequencer, przestrzennie (`atLocation` + `panSound` + wygaszanie z odległością), z
 * własnym promieniem słyszalności na gadżet — kliknięcie długopisu niesie się parę metrów,
 * krótkofalówka wyraźnie dalej. Bez tego wszystko dziedziczyłoby domyślne 50 m z
 * `seqPlayAudio`, czyli zasięg wystrzału z karabinu.
 *
 * Pliki: `sounds/gadzety/*.ogg`, zbudowane `dev/audio/build_audio.mjs pipeline_gadzety.json`,
 * źródła i licencje (wszystko CC0) w `dev/audio/FREESOUND_GADZETY_SOURCES.md`.
 */

import { seqPlayAudio } from "../weapons/sequencer.mjs";
import { getDefaultVolume } from "../weapons/sounds.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga na przedmiocie i na aktywności: klucz z `GADZETY`. */
export const FLAG_GADZET = "gadzet";

const SOUND_DIR = `modules/${MODULE_ID}/sounds/gadzety`;

/**
 * @typedef {object} GadzetDef
 * @property {string}   label     Nazwa kanoniczna (do budowy nowych kopii).
 * @property {string}   use       Etykieta Aktywności — czasownik, nie „Użyj".
 * @property {string}   sound     Nazwa pliku w `sounds/gadzety/`.
 * @property {number}   radius    Promień słyszalności w jednostkach sceny (metrach).
 * @property {RegExp}   match     Rozpoznawanie już istniejących kopii po nazwie.
 * @property {string[]} flavour   Losowana linijka na czat; `{a}` = imię postaci.
 */

/** @type {Readonly<Record<string, GadzetDef>>} */
export const GADZETY = Object.freeze({
  kaczuszka: {
    label: "Gumowa kaczuszka",
    use: "Ściśnij",
    sound: "kaczuszka.ogg",
    radius: 10,
    match: /kaczusz/i,
    flavour: [
      "{a} ściska kaczuszkę. Piszczy.",
      "{a} ściska kaczuszkę i nie tłumaczy się z tego nikomu.",
      "Piiisk. {a} patrzy w bok, jakby to nie on."
    ]
  },
  krotkofalowka: {
    label: "Krótkofalówka",
    use: "Nadaj",
    sound: "krotkofalowka.ogg",
    // Dalej niż reszta — to jedyny z tych przedmiotów, który ma hałasować celowo.
    radius: 20,
    match: /kr[oó]tkofal|walkie/i,
    flavour: [
      "{a} wciska nadawanie. Trzask, pisk, cisza.",
      "„Odbiór.” {a} czeka. Nikt nie odpowiada.",
      "{a} nadaje krótko i puszcza przycisk."
    ]
  },
  dezynfekcja: {
    label: "Przemysłowy środek do dezynfekcji",
    use: "Spryskaj",
    sound: "dezynfekcja.ogg",
    radius: 8,
    match: /dezynfek|odka[żz]aj/i,
    flavour: [
      "{a} psika środkiem odkażającym. Zapach chloru wypełnia okolicę.",
      "{a} spryskuje wszystko w zasięgu ręki. Na wszelki wypadek.",
      "Psss. {a} przeciera dłonie i wygląda na odrobinę spokojniejszego."
    ]
  },
  dlugopis: {
    label: "Długopis",
    use: "Kliknij",
    sound: "dlugopis.ogg",
    // Najciszej z całej czwórki — słychać to przez stół, nie przez halę.
    radius: 5,
    match: /d[lł]ugopis/i,
    flavour: [
      "Klik. Klik. {a} nawet nie zauważa, że to robi.",
      "{a} klika długopisem w rytm, którego nikt inny nie słyszy.",
      "Klik. Ktoś w pokoju właśnie zacisnął zęby."
    ]
  }
});

/* -------------------------------------------- */
/*  Rozpoznawanie                                */
/* -------------------------------------------- */

/**
 * Klucz gadżetu dla przedmiotu: najpierw flaga (pewna), potem nazwa (dla kopii sprzed migracji).
 * @param {Item5e|object} item
 * @returns {string|null}
 */
export function gadzetKeyFor(item) {
  if (!item) return null;
  const flagged = item.flags?.[MODULE_ID]?.[FLAG_GADZET] ?? item.getFlag?.(MODULE_ID, FLAG_GADZET);
  if (flagged && GADZETY[flagged]) return flagged;

  const name = item.name ?? "";
  if (!name) return null;
  for (const [key, def] of Object.entries(GADZETY)) {
    if (def.match.test(name)) return key;
  }
  return null;
}

/** Czy przedmiot jest już gotowym gadżetem (właściwy typ + aktywność). */
export function isReadyGadzet(item) {
  if (item?.type !== "consumable") return false;
  if (!gadzetKeyFor(item)) return false;
  return [...(item.system?.activities ?? [])].some(a => a.flags?.[MODULE_ID]?.[FLAG_GADZET]);
}

/* -------------------------------------------- */
/*  Budowa danych                                */
/* -------------------------------------------- */

/** Deterministyczne id aktywności — powtórna migracja nie dokłada drugiej kopii. */
function _activityId(key) {
  return `neuroGdzt${key}`.padEnd(16, "0").slice(0, 16);
}

/**
 * Dane przedmiotu-gadżetu. Zachowuje wszystko, co niesie oryginał (nazwę, ikonę, opis, cenę,
 * wagę, ilość) — migracja odtwarza tę samą rzecz, nie podmienia jej na katalogową.
 *
 * @param {string} key
 * @param {object} [source]  Istniejący przedmiot (albo jego `toObject()`), z którego dziedziczymy.
 */
export function buildGadzetItemData(key, source = null) {
  const def = GADZETY[key];
  if (!def) throw new Error(`Unknown gadget "${key}"`);

  const src = source?.toObject?.() ?? source ?? {};
  const actId = _activityId(key);
  const img = src.img ?? `modules/${MODULE_ID}/icons/items/loot/${key}.svg`;

  return {
    name: src.name ?? def.label,
    type: "consumable",
    img,
    system: {
      description: src.system?.description ?? { value: "", chat: "" },
      // `trinket` to najbliższy neutralny podtyp — przedmiot nie jest ani lekiem, ani amunicją.
      type: { value: "trinket", subtype: "" },
      quantity: src.system?.quantity ?? 1,
      weight: src.system?.weight ?? { value: 0.1, units: "kg" },
      price: src.system?.price ?? { value: 0, denomination: "gb" },
      // Brak `uses` i brak konsumpcji w aktywności: kaczuszka nie znika po ściśnięciu.
      activities: {
        [actId]: {
          _id: actId,
          type: "utility",
          name: def.use,
          img,
          activation: { type: "", value: null, condition: "" },
          consumption: { targets: [], scaling: { allowed: false } },
          effects: [],
          flags: { [MODULE_ID]: { [FLAG_GADZET]: key } }
        }
      }
    },
    flags: {
      ...(src.flags ?? {}),
      [MODULE_ID]: { ...(src.flags?.[MODULE_ID] ?? {}), [FLAG_GADZET]: key }
    }
  };
}

/* -------------------------------------------- */
/*  Dźwięk                                       */
/* -------------------------------------------- */

/**
 * Zagraj dźwięk gadżetu w miejscu, gdzie stoi postać.
 * @param {string} key
 * @param {Actor5e} actor
 */
export function playGadzetSound(key, actor) {
  const def = GADZETY[key];
  if (!def) return false;
  const token = actor?.getActiveTokens?.()[0]?.document ?? actor ?? null;
  return seqPlayAudio(`${SOUND_DIR}/${def.sound}`, getDefaultVolume(), {
    token,
    radius: def.radius
  });
}

function _flavourLine(key, actor) {
  const lines = GADZETY[key]?.flavour ?? [];
  if (!lines.length) return "";
  const pick = lines[Math.floor(Math.random() * lines.length)];
  return pick.replace("{a}", actor?.name ?? "Ktoś");
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

/**
 * Zdejmij domyślną kartę użycia dnd5e.
 *
 * Ściśnięcie kaczuszki produkowało dwie wiadomości: systemową („Gumowa kaczuszka żółta /
 * Trinket / Niewyposażone" — z nietłumaczoną nazwą podtypu, bo `trinket` to techniczny slot,
 * a nie kategoria, którą ktokolwiek przy stole rozpoznaje) i naszą smaczkową. Przy przedmiocie,
 * którego CAŁYM celem jest jedna linijka koloru, dwie karty na jeden pisk to o jedną za dużo.
 * Ten sam ruch robi `items/chemia.mjs` ze swoimi lekami.
 */
function _onPreUseActivity(activity, _usageConfig, _dialogConfig, messageConfig) {
  const key = activity?.flags?.[MODULE_ID]?.[FLAG_GADZET];
  if (!key || !GADZETY[key]) return;
  messageConfig.create = false;
}

async function _onPostUseActivity(activity) {
  const key = activity?.flags?.[MODULE_ID]?.[FLAG_GADZET];
  if (!key || !GADZETY[key]) return;

  const actor = activity.actor ?? activity.item?.actor ?? null;
  playGadzetSound(key, actor);

  const line = _flavourLine(key, actor);
  if (!line) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-gadzet-card" style="border-left:3px solid #6b7a8f;padding-left:8px;font-style:italic;">${line}</div>`,
    flags: { [MODULE_ID]: { [FLAG_GADZET]: key } }
  });
}

export const gadzetyApi = { GADZETY, gadzetKeyFor, isReadyGadzet, buildGadzetItemData, playGadzetSound };

export function registerGadzety() {
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);

  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (mod) {
      mod.api ??= {};
      mod.api.gadzety = gadzetyApi;
    }
    globalThis.game.neuroshima ??= {};
    game.neuroshima.gadzety = gadzetyApi;
  });

  console.log("Neuroshima 5e | Gadżety (SFX) registered");
}
