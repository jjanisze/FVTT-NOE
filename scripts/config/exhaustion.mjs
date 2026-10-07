/**
 * Neuroshima 5e — Wyczerpanie (Exhaustion) with source tracking.
 *
 * Neuroshima exhaustion rules:
 * - Stacks from 1 to 6 (same as dnd5e)
 * - Each level: -2 to every d20 test (dnd5e modern rules)
 * - Each level: -1.5 m speed (not -5 ft)
 * - Death at 6 levels
 * - Each level has a tracked SOURCE — you can't hydrate away a sleepless night.
 *
 * Data model (module flags on actor):
 *   flags.neuroshima-2026-overrides.exhaustionSources = [
 *     { source: "odwodnienie", label: "Odwodnienie", czas: worldTime },
 *     { source: "bezsennosc", label: "Bezsenność", czas: worldTime },
 *     ...
 *   ]
 *   Array length = actor's exhaustion level. Each entry = one level from a specific cause.
 *   `czas` — **czas świata** (`game.time.worldTime`, sekundy) w chwili nałożenia: zawsze czas gry,
 *   nigdy zegar komputera. Wpisy sprzed 2026-10-07 niosą `addedAt` w czasie rzeczywistym — nie
 *   pokazujemy go i nie liczymy z niego wieku (takie poziomy są po prostu najstarsze).
 *
 * Recovery: removing a level requires specifying which source is resolved.
 *   - Długi odpoczynek zdejmuje jeden poziom wg reguł zdejmowania (`config/rekonwalescencja-rules.mjs`,
 *     `regulaZdejmowania` / `kolejnoscDO` — PLAN_m1_walka U10, U14): uporczywe nigdy, najpierw
 *     poziomy bez innego wyjścia, w grupie najstarszy. Robi to przez `dnd5e.preRestCompleted` —
 *     podmieniamy liczbę w `result.updateData`, zamiast pisać poziom samemu; uzasadnienie przy
 *     `onPreRestCompleted`.
 *   - Dodatkowe wyjścia (ciepło, oddech, RadOff, zejście z Krytycznego) zdejmują wszystkie poziomy
 *     źródła naraz — `zdejmijWyjsciem`.
 *   - Other sources require explicit GM action or specific remedies.
 *
 * **Poziom czytamy z `_source`** (F15): tuż po zapisie pochodne `system.attributes.exhaustion` jest
 * o 1 w tyle (efekt Wyczerpania dnd5e synchronizuje się asynchronicznie), więc dwa wywołania pod
 * rząd gubiły poziom, a lista źródeł rosła ponad niego. Każdy zapis idzie przez `_zapiszZrodla`,
 * który pisze poziom = długość listy.
 */

const MODULE_ID = "neuroshima-2026-overrides";

import { seqScrollText } from "../weapons/sequencer.mjs";
import { STATE_COLORS } from "./state-colors.mjs";
import { isKobaltEnabled } from "./settings.mjs";
import { formatWorldTime } from "../world-clock.mjs";
import {
  REGULY_ZDEJMOWANIA, KRYTYCZNY, kolejnoscDO, normalizujZrodla, widokWyczerpania, zrodlaPoWyjsciu
} from "./rekonwalescencja-rules.mjs";

/**
 * Known exhaustion sources with Polish labels. Jak dany poziom schodzi — reguły zdejmowania
 * (`REGULY_ZDEJMOWANIA`, ta sama lista kluczy; domknięcie pilnuje test `rekonwalescencja`).
 * `color` tints that level's pip in the Stan panel, so a glance at the track shows what
 * the character is actually suffering from. Źródła, które są jednocześnie osobnymi stanami,
 * biorą barwę z palety — pipka Wyczerpania ma wtedy dokładnie ten kolor, co tor, z którego
 * ten poziom przyszedł.
 */
export const EXHAUSTION_SOURCES = {
  bezsennosc:   { label: "Bezsenność",            color: "#7f8cff" },
  kac:          { label: "Kac",                   color: "#d9a441" },
  niedozywienie:{ label: "Niedożywienie",         color: "#b07d3a" },
  odwodnienie:  { label: "Odwodnienie",           color: "#2196f3" },
  przemarznie:  { label: "Przemarznięcie",        color: "#9fe8ff" },
  skazenie:     { label: "Skażenie radioaktywne", color: STATE_COLORS.skazenie },
  choroba:      { label: "Choroba",               color: "#a569bd" },
  deadline:     { label: "Zejście z Deadline'u",  color: "#ff4d6d" },
  zranienie:    { label: "Stopień Zranienia",     color: STATE_COLORS.zranienie },
  uduszenie:    { label: "Uduszenie",             color: "#5d6d7e" },
  forsowanie:   { label: "Forsowanie",            color: "#ff8a3d" },
  ogolne:       { label: "Ogólne",                color: "#9aa0a6" }
};

/** Etykieta źródła — z tabeli, a gdy klucz nieznany, z wpisu. */
export function etykietaZrodla(wpis) {
  const key = typeof wpis === "string" ? wpis : wpis?.source;
  return EXHAUSTION_SOURCES[key]?.label ?? wpis?.label ?? EXHAUSTION_SOURCES.ogolne.label;
}

/**
 * Register exhaustion CONFIG overrides and rest interception hook.
 */
export function registerExhaustion() {
  const exhaustion = CONFIG.DND5E.conditionTypes?.exhaustion;
  if (!exhaustion) {
    console.warn("Neuroshima 5e | conditionTypes.exhaustion not found, skipping override");
    return;
  }

  // Override speed reduction: 1.5 m per level instead of 5 ft
  exhaustion.reduction ??= {};
  exhaustion.reduction.speed = 1.5;
  // rolls: 2 stays the same (already matches Neuroshima's -2 per level)

  // Polish label
  exhaustion.name = "Wyczerpanie";

  // Własny komplet ikon, żeby cyfra rzymska miała barwę toru (niebieską), a nie systemową
  // czerwień, którą nosi też Zranienie. Nie wymaga nadpisania niczego: dnd5e buduje ścieżkę
  // poziomu z tego właśnie pola (`ActiveEffect5e._getExhaustionImage`), więc dokleja `-N`
  // do naszego pliku i trafia w `wyczerpanie-N.svg`.
  exhaustion.img = `modules/${MODULE_ID}/icons/statuses/wyczerpanie.svg`;

  // Intercept long rest exhaustion recovery
  Hooks.on("dnd5e.preRestCompleted", onPreRestCompleted);
  Hooks.on("dnd5e.restCompleted", onRestCompleted);

  // Intercept manual exhaustion changes (sheet pip clicks) BEFORE they apply
  Hooks.on("preUpdateActor", onPreUpdateActor);

  // Source labels on the sheet are the Stan panel's job (actors/sheet-shell.mjs) — it reads
  // getExhaustionSources() directly. The native pips it used to annotate are now hidden.

  console.log("Neuroshima 5e | Exhaustion overrides applied (speed: -1.5 m/level, source tracking)");
}

/* -------------------------------------------- */
/*  Source-tracked API                           */
/* -------------------------------------------- */

/**
 * Get the current exhaustion sources array for an actor — surowa flaga (może rozjechać się z
 * poziomem, F15). Do decyzji — `zrodlaWyczerpania`.
 * @param {Actor} actor
 * @returns {Array<{source: string, label: string, czas?: number}>}
 */
export function getExhaustionSources(actor) {
  const raw = actor.getFlag(MODULE_ID, "exhaustionSources");
  return raw ? foundry.utils.deepClone(raw) : [];
}

/** Poziom Wyczerpania z danych źródłowych — pochodny bywa o 1 w tyle tuż po zapisie (F15). */
export function poziomWyczerpania(actor) {
  const src = foundry.utils.getProperty(actor?._source ?? {}, "system.attributes.exhaustion");
  return Number(src ?? actor?.system?.attributes?.exhaustion ?? 0) || 0;
}

/** Źródła dopasowane do poziomu — jeden wpis na poziom (`normalizujZrodla`). */
export function zrodlaWyczerpania(actor) {
  return normalizujZrodla(getExhaustionSources(actor), poziomWyczerpania(actor));
}

/**
 * Warunki uporczywości już spełnione na tym aktorze (`regulaZdejmowania`, `spelnione`):
 * woda / jedzenie — gdy aktor nie nosi znacznika Odwodnienia / Niedożywienia
 * (`actors/party-supplies.mjs` zdejmuje go pełną racją); zejście z Krytycznego — gdy Stopień
 * Zranienia nie jest Krytyczny.
 * @param {Actor} actor
 * @returns {string[]}
 */
export function warunkiSpelnione(actor) {
  const out = [];
  for (const r of Object.values(REGULY_ZDEJMOWANIA)) {
    const status = r.uporczywe?.status;
    if (status && !actor?.statuses?.has(status)) out.push(r.uporczywe.dopoki);
  }
  const stopien = actor?.getFlag?.(MODULE_ID, "zranienie")?.level ?? 0;
  if (stopien < KRYTYCZNY) out.push("zejscie-z-krytycznego");
  return out;
}

/** Opcje reguł zdejmowania dla tego aktora: warstwa (Kobalt) i spełnione warunki. */
export function opcjeZdejmowania(actor) {
  return { kobalt: isKobaltEnabled(), spelnione: warunkiSpelnione(actor) };
}

/**
 * Kiedy poziom nałożono — data i godzina świata albo null (wpis bez czasu gry).
 * @param {{czas?: number}} wpis
 * @returns {string|null}
 */
export function kiedyNalozony(wpis) {
  return Number.isFinite(wpis?.czas) ? formatWorldTime(wpis.czas) : null;
}

/**
 * Pipki toru Wyczerpania w kolejności widoku (§7.9): uporczywe z lewej, skrajna prawa schodzi
 * przy następnym DO. Wspólne dla panelu Stan i karty drużyny.
 * @param {Actor} actor
 * @returns {{wpis: object, zrodlo: string, label: string, color: string|null, uporczywe: boolean, linie: string[], od: string|null}[]}
 *   `od` — kiedy poziom nałożono, w czasie świata.
 */
export function pipkiWyczerpania(actor) {
  return widokWyczerpania(zrodlaWyczerpania(actor), opcjeZdejmowania(actor)).map(p => ({
    ...p,
    label: etykietaZrodla(p.wpis),
    color: EXHAUSTION_SOURCES[p.zrodlo]?.color ?? null,
    od: kiedyNalozony(p.wpis)
  }));
}

/**
 * Jedyny zapis listy źródeł: poziom = długość listy, flaga razem z nim (strażnik `_apiUpdate`
 * przepuszcza go przez `onPreUpdateActor`). Pusta lista — kluczem `-=`, bo `[]` bywa gubione
 * przez diff.
 * @param {Actor} actor
 * @param {Array} sources
 */
async function _zapiszZrodla(actor, sources) {
  const lista = sources.slice(0, 6);
  const updateData = { "system.attributes.exhaustion": lista.length };
  if (lista.length) updateData[`flags.${MODULE_ID}.exhaustionSources`] = lista;
  else updateData[`flags.${MODULE_ID}.-=exhaustionSources`] = null;
  _apiUpdate = true;
  try {
    await actor.update(updateData);
  } finally {
    _apiUpdate = false;
  }
}

/**
 * Uporczywe Odwodnienie / Niedożywienie trzyma warunek na znaczniku (`warunkiSpelnione`) —
 * nowy poziom z tego źródła znaczy, że aktor dziś nie wypił / nie zjadł.
 */
async function _znacznikWarunku(actor, sourceKey) {
  const status = REGULY_ZDEJMOWANIA[sourceKey]?.uporczywe?.status;
  if (status && !actor.statuses?.has(status)) await actor.toggleStatusEffect(status, { active: true });
}

/**
 * Add one level of exhaustion from a specific source.
 * Updates both the source array (flag) and the dnd5e exhaustion attribute.
 * @param {Actor} actor
 * @param {string} sourceKey - Key from EXHAUSTION_SOURCES
 * @param {object} [options]
 * @param {boolean} [options.chat=true] - Post a chat message
 * @returns {Promise<number>} New exhaustion level
 */
export async function addExhaustion(actor, sourceKey, { chat = true } = {}) {
  const currentLevel = poziomWyczerpania(actor);
  if (currentLevel >= 6) return currentLevel; // already dead

  const sourceDef = EXHAUSTION_SOURCES[sourceKey] ?? EXHAUSTION_SOURCES.ogolne;
  const label = sourceDef.label;

  const sources = normalizujZrodla(getExhaustionSources(actor), currentLevel);
  sources.push({
    source: sourceKey,
    label,
    czas: game.time.worldTime
  });

  const newLevel = sources.length;
  await _zapiszZrodla(actor, sources);
  await _znacznikWarunku(actor, sourceKey);

  if (chat) {
    const deathWarning = newLevel >= 6 ? " — <strong>ŚMIERĆ!</strong>" : "";
    await ChatMessage.create({
      content: `<strong>${actor.name}</strong> otrzymuje 1 poziom Wyczerpania z powodu: <em>${label}</em> (${newLevel}/6).${deathWarning}`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }

  seqScrollText("WYCZERPANIE", actor, { color: "#3498db", fontSize: 26, duration: 1800 });
  return newLevel;
}

/**
 * Remove one level of exhaustion from a specific source.
 * @param {Actor} actor
 * @param {string} sourceKey - Which source to remove (removes oldest matching entry)
 * @param {object} [options]
 * @param {boolean} [options.chat=true] - Post a chat message
 * @returns {Promise<number>} New exhaustion level
 */
export async function removeExhaustion(actor, sourceKey, { chat = true } = {}) {
  const currentLevel = poziomWyczerpania(actor);
  if (currentLevel <= 0) return 0;

  const sources = zrodlaWyczerpania(actor);
  const idx = sources.findIndex(s => s.source === sourceKey);
  if (idx === -1) {
    if (chat) {
      ui.notifications.warn(`${actor.name} nie ma Wyczerpania ze źródła: ${EXHAUSTION_SOURCES[sourceKey]?.label ?? sourceKey}`);
    }
    return currentLevel;
  }

  const removed = sources.splice(idx, 1)[0];
  await _zapiszZrodla(actor, sources);

  if (chat) {
    await ChatMessage.create({
      content: `<strong>${actor.name}</strong> traci 1 poziom Wyczerpania — usunięto: <em>${etykietaZrodla(removed)}</em> (${sources.length}/6).`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }

  return sources.length;
}

/**
 * Dodatkowe wyjście (U10): zdejmuje **wszystkie** poziomy źródeł, które to wyjście mają, jednym
 * zapisem — Długi odpoczynek w cieple (`cieplo`), złapanie oddechu (`oddech`), RadOff (`radoff`),
 * zejście z Krytycznego (`zejscie-z-krytycznego`, RAI).
 * @param {Actor} actor
 * @param {string} wyjscie
 * @param {{powod?: string, chat?: boolean}} [opts]
 * @returns {Promise<number>} ile poziomów zeszło
 */
export async function zdejmijWyjsciem(actor, wyjscie, { powod = "", chat = true } = {}) {
  const sources = zrodlaWyczerpania(actor);
  return _zdejmij(actor, sources, zrodlaPoWyjsciu(sources, wyjscie), { powod, chat });
}

/**
 * Wszystkie poziomy jednego źródła, jednym zapisem (dawka, która „usuwa skutki”).
 * @returns {Promise<number>} ile poziomów zeszło
 */
export async function zdejmijZrodlo(actor, sourceKey, { powod = "", chat = true } = {}) {
  const sources = zrodlaWyczerpania(actor);
  return _zdejmij(actor, sources, sources.filter(s => s.source !== sourceKey), { powod, chat });
}

async function _zdejmij(actor, sources, po, { powod, chat }) {
  const ile = sources.length - po.length;
  if (!ile) return 0;
  await _zapiszZrodla(actor, po);
  if (chat) {
    const label = etykietaZrodla(sources.find(s => !po.includes(s)));
    await ChatMessage.create({
      content: `<strong>${actor.name}</strong> — ${powod ? `${powod}: ` : ""}schodzi Wyczerpanie `
        + `<em>${label}</em> ×${ile} (${po.length}/6).`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }
  return ile;
}

/**
 * Get a formatted summary of an actor's exhaustion sources.
 * @param {Actor} actor
 * @returns {string} e.g. "Forsowanie ×2, Odwodnienie ×1"
 */
export function formatExhaustionSources(actor) {
  const sources = zrodlaWyczerpania(actor);
  if (!sources.length) return "Brak";

  // Count occurrences
  const counts = {};
  for (const s of sources) {
    const label = etykietaZrodla(s);
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, count]) => count > 1 ? `${label} ×${count}` : label)
    .join(", ");
}

/* -------------------------------------------- */
/*  Rest Recovery Interception                   */
/* -------------------------------------------- */

/** Pole okna Długiego odpoczynku „w cieple” (E7) — trafia do konfiguracji odpoczynku. */
export const W_CIEPLE = "neuroWCieple";

/**
 * Klucz konfiguracji odpoczynku z `actors/disease-effects.mjs` (`BEZ_KORZYSCI`) — powtórzony tu
 * zamiast importu, bo tamten plik ciągnie panel zdrowia, a ten musi zostać lekki.
 */
const BEZ_KORZYSCI_ODPOCZYNKU = "neuroBezKorzysci";

/**
 * Intercept dnd5e's long-rest exhaustion recovery and make it source-aware.
 *
 * **Dlaczego hak, a nie własna mechanika.** Można by wyzerować
 * `restTypes.long.exhaustionDelta` i pisać poziom samemu, ale wtedy tracimy cały
 * szkielet: `_rest` zbiera wszystko w jedno `actor.update(result.updateData,
 * {isRest: true})`, kartę odpoczynku buduje z tego samego `updateData`
 * (`ActorDeltasField.getDeltas`), a `_onUpdateExhaustion` z tego zapisu synchronizuje
 * natywny Active Effect Wyczerpania. Podmieniamy więc jedną liczbę tuż przed zapisem
 * zamiast dublować trzy mechanizmy.
 *
 * **Dlaczego `config`, nie `result`.** `exhaustionDelta` siedzi wyłącznie w konfiguracji
 * odpoczynku (`actor.mjs:2170` przepisuje je z `restTypes`); `result` go nie niesie.
 * Czytanie `result.exhaustionDelta` dawało zawsze `undefined` — hak był martwy od
 * pierwszego commita i nikt tego nie zauważył, bo przy zerowym Wyczerpaniu skutek
 * jest nieodróżnialny od poprawnego.
 *
 * **Dlaczego omijamy bramkę `malnourished`/`dehydrated`.** dnd5e przy tych stanach nie
 * redukuje Wyczerpania **wcale**; Neuroshima blokuje tylko ten poziom, który z nich
 * pochodzi (uporczywy do spełnienia warunku), a Forsowanie czy Kac mają ustąpić normalnie.
 * Nasz model jest drobniejszy, więc rozstrzyga.
 *
 * **Który poziom** — pierwszy z `kolejnoscDO` (U14): najpierw bez innego wyjścia, w grupie
 * najstarszy, uporczywe nigdy. Przy „w cieple” (s. 258) najpierw schodzą wszystkie poziomy
 * Przemarznięcia, potem zwykłe −1 z reszty — oba skutki tego samego DO, kolejność najkorzystniejsza
 * dla gracza.
 *
 * **Dlaczego zawsze piszemy `exhaustionSources` razem z poziomem.** `onPreUpdateActor`
 * niżej blokuje surowy zapis Wyczerpania bez tej flagi, a `false` z `preUpdateActor`
 * kasuje **cały** dokumentowy update — czyli razem z Wyczerpaniem wyleciałyby PW,
 * Kości Wytrzymałości i reszta odpoczynku.
 */
function onPreRestCompleted(actor, result, config) {
  if (!(config?.exhaustionDelta < 0)) return;

  const path = "system.attributes.exhaustion";
  const przed = zrodlaWyczerpania(actor);
  result.updateData[path] = przed.length;
  if (!przed.length) return;

  let sources = przed;
  const linie = [];
  // Choroba (s. 111): bez korzyści z listy s. 45, więc bez −1. Zostaje dodatkowe wyjście („w cieple”).
  const bezKorzysci = Boolean(config?.[BEZ_KORZYSCI_ODPOCZYNKU]);
  if (config?.[W_CIEPLE]) {
    const po = zrodlaPoWyjsciu(sources, "cieplo");
    if (po.length < sources.length) linie.push(`w cieple schodzi całe Przemarznięcie (×${sources.length - po.length})`);
    sources = po;
  }
  const [schodzi] = bezKorzysci ? [] : kolejnoscDO(sources, opcjeZdejmowania(actor));
  if (bezKorzysci) linie.push("choroba — bez −1 Wyczerpania (s. 111)");
  if (schodzi) {
    linie.push(`schodzi <em>${etykietaZrodla(schodzi)}</em>`);
    sources = sources.filter(s => s !== schodzi);
  }

  if (sources.length !== przed.length) {
    result.updateData[path] = sources.length;
    // Ta sama składnia co w `_zapiszZrodla`: pusta tablica bywa gubiona przez diff,
    // więc ostatnie źródło kasujemy kluczem `-=`, a nie zapisem `[]`.
    if (sources.length) result.updateData[`flags.${MODULE_ID}.exhaustionSources`] = sources;
    else result.updateData[`flags.${MODULE_ID}.-=exhaustionSources`] = null;
  }

  const zostaje = sources.length
    ? widokWyczerpania(sources, opcjeZdejmowania(actor)).map(p => etykietaZrodla(p.wpis) + (p.uporczywe ? " (uporczywe)" : "")).join(", ")
    : "brak";
  result.neuroExhaustionNote = linie.length
    ? `<strong>${actor.name}</strong> — Długi odpoczynek: ${linie.join("; ")}.<br>Wyczerpanie: ${sources.length}/6 — ${zostaje}.`
    : `<strong>${actor.name}</strong> — Długi odpoczynek nie zdejmuje Wyczerpania: wszystkie poziomy są uporczywe.`
      + `<br>${widokWyczerpania(sources, opcjeZdejmowania(actor)).map(p => `${etykietaZrodla(p.wpis)} — ${p.linie[0]}`).join("<br>")}`;
}

/**
 * `preRestCompleted` jest synchroniczny, a `result` to ten sam obiekt w obu hakach —
 * notatka czeka na moment, w którym odpoczynek naprawdę się odbył.
 */
function onRestCompleted(actor, result) {
  if (!result.neuroExhaustionNote) return;
  ChatMessage.create({
    content: result.neuroExhaustionNote,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}

/* -------------------------------------------- */
/*  Manual Change Interception (Sheet Clicks)    */
/* -------------------------------------------- */

// Guard flag — when true, our API is driving the update, don't intercept
let _apiUpdate = false;

/**
 * Intercept exhaustion changes BEFORE they apply.
 * If the change didn't come from our API, BLOCK it and show a dialog.
 * The dialog then uses the API to apply the change with proper source tracking.
 *
 * Returning false from preUpdateActor prevents the update entirely — **cały** dokument,
 * nie samo Wyczerpanie (`client/data/client-backend.mjs:240` robi `continue`). Dlatego
 * każdy kod modułu, który pisze poziom w cudzym `updateData` (odpoczynek), musi dołożyć
 * `exhaustionSources` w tym samym zapisie — inaczej odbierze aktorowi też PW i Kości.
 */
function onPreUpdateActor(actor, changes, options, userId) {
  if (_apiUpdate) return true; // allow API-driven updates through
  if (game.userId !== userId) return true;

  const newExhaustion = foundry.utils.getProperty(changes, "system.attributes.exhaustion");
  if (newExhaustion === undefined) return true;

  // If our flags are also in the update, it came from our API (addExhaustion/removeExhaustion)
  // or from the rest interception. Both spellings count — `removeExhaustion` clears the last
  // source with the `-=` deletion key, which `getProperty` would never see under the plain name.
  const flagUpdate = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.exhaustionSources`);
  const flagDelete = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.-=exhaustionSources`);
  if ((flagUpdate !== undefined) || (flagDelete !== undefined)) return true;

  const currentLevel = poziomWyczerpania(actor);
  if (newExhaustion === currentLevel) return true; // no real change

  if (newExhaustion > currentLevel) {
    const levelsToAdd = newExhaustion - currentLevel;
    promptExhaustionSource(actor, levelsToAdd);
  } else {
    const levelsToRemove = currentLevel - newExhaustion;
    promptExhaustionRemoval(actor, levelsToRemove);
  }

  return false; // BLOCK the raw update — dialog will handle it via API
}

/**
 * Show dialog asking the GM/player to pick what caused the exhaustion.
 * The raw update was already blocked — dialog applies the change via API on confirm.
 * @param {Actor} actor
 * @param {number} count - How many levels to add
 */
async function promptExhaustionSource(actor, count) {
  const sourceOptions = Object.entries(EXHAUSTION_SOURCES)
    .map(([key, { label }]) => `<option value="${key}">${label}</option>`)
    .join("");

  const content = `
    <p><strong>${actor.name}</strong> — dodać ${count} ${count === 1 ? "poziom" : "poziomy"} Wyczerpania.</p>
    <p>Wybierz źródło dla każdego poziomu:</p>
    ${Array.from({ length: count }, (_, i) => `
      <div style="margin-bottom: 4px;">
        <label>Poziom ${i + 1}:</label>
        <select name="source-${i}" style="width: 100%;">${sourceOptions}</select>
      </div>
    `).join("")}
  `;

  new Dialog({
    title: "Źródło Wyczerpania",
    content,
    buttons: {
      confirm: {
        icon: '<i class="fas fa-check"></i>',
        label: "Zatwierdź",
        callback: async (html) => {
          // Collect all sources and apply in a single batched update
          // to avoid race conditions with sequential actor.update() calls
          const keys = [];
          for (let i = 0; i < count; i++) {
            keys.push(html.find(`[name="source-${i}"]`).val());
          }

          const currentLevel = poziomWyczerpania(actor);
          const sources = zrodlaWyczerpania(actor);

          for (const key of keys) {
            const sourceDef = EXHAUSTION_SOURCES[key] ?? EXHAUSTION_SOURCES.ogolne;
            sources.push({ source: key, label: sourceDef.label, czas: game.time.worldTime });
          }

          await _zapiszZrodla(actor, sources);
          for (const key of new Set(keys)) await _znacznikWarunku(actor, key);

          // Chat messages
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const sourceDef = EXHAUSTION_SOURCES[key] ?? EXHAUSTION_SOURCES.ogolne;
            const lvl = currentLevel + i + 1;
            const deathWarning = lvl >= 6 ? " — <strong>ŚMIERĆ!</strong>" : "";
            await ChatMessage.create({
              content: `<strong>${actor.name}</strong> otrzymuje 1 poziom Wyczerpania z powodu: <em>${sourceDef.label}</em> (${lvl}/6).${deathWarning}`,
              speaker: ChatMessage.getSpeaker({ actor })
            });
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Anuluj"
        // Do nothing — the raw update was already blocked
      }
    },
    default: "confirm"
  }).render(true);
}

/**
 * Show dialog asking which exhaustion source was resolved.
 * The raw update was already blocked — dialog applies the change via API on confirm.
 * @param {Actor} actor
 * @param {number} count - How many levels to remove
 */
async function promptExhaustionRemoval(actor, count) {
  const sources = zrodlaWyczerpania(actor);
  if (!sources.length) return;

  // Wiersze w kolejności toru (§7.9) — od prawej, czyli od poziomu, który i tak zszedłby najwcześniej;
  // te są zaznaczone domyślnie. Uporczywe z dopiskiem, żeby MG widział, co zdejmuje wbrew regule.
  const widok = widokWyczerpania(sources, opcjeZdejmowania(actor)).reverse();
  const sourceRows = widok.map((p, j) => {
    const i = sources.indexOf(p.wpis);
    const date = kiedyNalozony(p.wpis) ?? "czas nieznany";
    return `
    <div style="margin-bottom: 2px;">
      <label>
        <input type="checkbox" name="remove" value="${i}" ${j < count ? "checked" : ""}>
        ${etykietaZrodla(p.wpis)} <small style="color: #888;">(${date}${p.uporczywe ? " · uporczywe" : ""})</small>
      </label>
    </div>`;
  }).join("");

  const content = `
    <p><strong>${actor.name}</strong> — usunąć ${count} ${count === 1 ? "poziom" : "poziomy"} Wyczerpania.</p>
    <p>Które źródła zostały rozwiązane? (zaznacz ${count}):</p>
    ${sourceRows}
  `;

  new Dialog({
    title: "Usunięcie Wyczerpania",
    content,
    buttons: {
      confirm: {
        icon: '<i class="fas fa-check"></i>',
        label: "Zatwierdź",
        callback: async (html) => {
          const checked = html.find('[name="remove"]:checked')
            .map((_, el) => Number(el.value))
            .get()
            .sort((a, b) => b - a); // reverse order so splice indices stay valid

          if (!checked.length) return;

          // Batch: remove all selected sources in one update
          const removedLabels = [];
          for (const idx of checked) {
            if (sources[idx]) {
              removedLabels.push(etykietaZrodla(sources[idx]));
              sources.splice(idx, 1);
            }
          }

          const currentLevel = poziomWyczerpania(actor);
          await _zapiszZrodla(actor, sources);

          // Chat messages
          for (const label of removedLabels) {
            await ChatMessage.create({
              content: `<strong>${actor.name}</strong> traci 1 poziom Wyczerpania — usunięto: <em>${label}</em> (${Math.max(0, currentLevel - removedLabels.indexOf(label) - 1)}/6).`,
              speaker: ChatMessage.getSpeaker({ actor })
            });
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Anuluj"
        // Do nothing — the raw update was already blocked
      }
    },
    default: "confirm"
  }).render(true);
}
