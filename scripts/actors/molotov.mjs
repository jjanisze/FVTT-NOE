/**
 * Neuroshima 5e — Koktajl Mołotowa: podpalanie butelki, jej światło i 3-rundowy limit.
 *
 * RAW, *Sztuczki* → „Koktajl Mołotowa" (`8 SZTUCZKI/czesc-01.md`):
 *
 * > Podpalenie butelki z koktajlem wymaga wykonania akcji Używanie lub Akcji Bonusowej oraz
 * > źródła ognia. Koktajl Mołotowa może być zapalony przez maksymalnie 3 rundy, po czym butelka
 * > pęka i podpala trzymającego.
 *
 * Sam rzut, wybuch na końcu tury i karta RO/obrażeń to wspólna ścieżka wszystkich granatów
 * (`actors/grenade-inventory.mjs`). Ten plik wie tylko to, czego inne granaty nie mają:
 *
 *  - **Stan „zapalona"** — flaga na itemie ze stosu (jedna butelka ze stosu płonie w ręku).
 *    Rzut zużywa właśnie tę, zapaloną. Niezapalonej rzucić się nie da.
 *  - **Podpalenie i rzut to dwie osobne akcje, dwa kliknięcia** (decyzja MG 2026-09-24). Jeden
 *    przycisk w wierszu zmienia się ze stanem: niezapalona → „Podpal" (tylko podpala),
 *    zapalona → „Rzuć". Nigdy oba naraz — koszt w ekonomii akcji ma być widoczny, a gracz, który
 *    zapali i zapomni, ma za to zapłacić. Przy okazji żeton świeci między podpaleniem a rzutem,
 *    choćby przez kilka sekund prawdziwego czasu w tej samej turze.
 *  - **Światło — reguła WKK, tylko w Kolorze Kobaltu.** RAW nie daje zapalonej butelce żadnego
 *    światła, więc wartości siedzą w `wkk/config/molotov-light.mjs`, a `molotovLight()` zwraca je
 *    wyłącznie przy `isKobaltEnabled()` (bez Kobaltu: `null`, brak światła). Provider
 *    `items/light-sources.mjs`, więc nie walczy z latarką/pochodnią o `token.light` — wygrywa
 *    najjaśniejsze. Celowo **bez** `enforceSingleLightSource`: butelkę podpala się często właśnie
 *    od pochodni, a gaszenie pochodni przy zapaleniu koktajlu byłoby absurdem.
 *  - **Pęknięcie po 3 rundach — w całości automatyczne**, łącznie z Podpaleniem trzymającego.
 *    To **świadomy wyjątek** od doktryny modułu („automatyzujemy wykrywanie, nigdy zastosowanie";
 *    decyzja MG 2026-09-24). Doktryna chroni decyzję MG — dodatkowy RO, ułatwienie, pominięcie.
 *    Tu RAW żadnej nie zostawia: „pęka i podpala trzymającego", bez rzutu i bez obrażeń
 *    początkowych. Przycisk byłby czystą formalnością, a zapominalstwo ma trafić od razu. MG i tak
 *    może zdjąć stan z palety żetonu, jeśli fikcja tak każe.
 *  - **Nie da się zgasić** (decyzja MG): to koktajl, nie lampa — szmaty nie da się złapać bez
 *    podpalenia sobie ręki. Jedyne wyjścia z zapalonej butelki to rzut albo pęknięcie.
 *  - **Źródło ognia** — sprawdzane w ekwipunku i **oznaczane**, nie blokowane. Czy ognisko
 *    obok albo płonący wrak się liczą, rozstrzyga MG, nie lista nazw.
 */

import { registerLightProvider, syncActorLight } from "../items/light-sources.mjs";
import { igniteFor } from "../combat/podpalenie.mjs";
import { playExplosiveSoundForSubtype } from "../weapons/sounds.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { MOLOTOV_LIGHT_KOBALT } from "../wkk/config/molotov-light.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const MOLOTOV_SUBTYPE = "grenade-molotov";
const FLAG_LIT = "molotovLit"; // {worldTime, combatId, round, turn} — kiedy zapalono

/** RAW: „maksymalnie 3 rundy". */
export const MAX_LIT_ROUNDS = 3;
/** RAW: „Podpalenie na 1 minutę" — 10 rund po 6 s. */
export const MOLOTOV_BURN_ROUNDS = 10;
const ROUND_SECONDS = 6;

/**
 * Światło zapalonej butelki — albo `null`. RAW go nie zna; to reguła WKK, żywa tylko w Kolorze
 * Kobaltu (`wkk/config/molotov-light.mjs`). Jedyne miejsce, które o tym decyduje: korzysta z niego
 * i światło w ręku (provider niżej), i światło leżącej butelki (`grenade-inventory.mjs`).
 * @returns {object|null}  świeża kopia, do bezpiecznej modyfikacji przez wołającego
 */
export function molotovLight() {
  return isKobaltEnabled() ? foundry.utils.deepClone(MOLOTOV_LIGHT_KOBALT) : null;
}

/** Co w ekwipunku może podpalić szmatę. Luźne dopasowanie — to wykrywanie, nie blokada. */
const FIRE_SOURCE_RE = /zapalniczk|zapałk|zapalk|krzesiw|zippo|pochodni|palnik|flar/i;

export function isMolotov(item) {
  return item?.type === "consumable" && item.system?.type?.subtype === MOLOTOV_SUBTYPE;
}

/** @returns {{worldTime:number, combatId:string|null, round:number|null, turn:number|null}|null} */
export function litInfo(item) {
  return isMolotov(item) ? (item.getFlag(MODULE_ID, FLAG_LIT) ?? null) : null;
}

export function isLit(item) {
  return !!litInfo(item);
}

/**
 * Czy butelka zapalona w `lit` już pękła. W tej samej walce liczy się rundami — 3 pełne
 * rundy od tury zapalenia, co do tury. Poza nią (walka skończona, zapalona poza walką) —
 * czasem świata, 18 s.
 * @param {object|null} lit
 * @param {{id:string, started:boolean, round:number, turn:number}|null} combat
 * @param {number} worldTime
 */
export function burstDue(lit, combat, worldTime) {
  if (!lit) return false;
  if (lit.combatId && combat?.started && combat.id === lit.combatId) {
    const burstRound = lit.round + MAX_LIT_ROUNDS;
    return combat.round > burstRound || (combat.round === burstRound && combat.turn >= lit.turn);
  }
  return worldTime - lit.worldTime >= MAX_LIT_ROUNDS * ROUND_SECONDS;
}

/** Ile rund jeszcze wytrzyma (do etykiety w wierszu). */
export function roundsLeft(item) {
  const lit = litInfo(item);
  if (!lit) return null;
  const combat = game.combat;
  if (lit.combatId && combat?.started && combat.id === lit.combatId) {
    const elapsed = combat.round - lit.round - (combat.turn < lit.turn ? 1 : 0);
    return Math.max(0, MAX_LIT_ROUNDS - elapsed);
  }
  const elapsed = Math.floor((game.time.worldTime - lit.worldTime) / ROUND_SECONDS);
  return Math.max(0, MAX_LIT_ROUNDS - elapsed);
}

export function hasFireSource(actor) {
  return !!actor?.items?.some(i => FIRE_SOURCE_RE.test(i.name ?? ""));
}

/* -------------------------------------------- */
/*  Podpalanie / zużycie                          */
/* -------------------------------------------- */

function _combatStamp() {
  const combat = game.combat;
  const inCombat = !!combat?.started;
  return {
    worldTime: game.time.worldTime,
    combatId: inCombat ? combat.id : null,
    round: inCombat ? combat.round : null,
    turn: inCombat ? combat.turn : null
  };
}

/**
 * Podpal jedną butelkę ze stosu. Karta mówi, jaką akcję to kosztuje i czy w ekwipunku jest
 * czym podpalić — ale nie blokuje: brak zapalniczki na liście nie znaczy, że obok nie płonie ognisko.
 * @param {Item} item
 * @returns {Promise<boolean>} true = butelka płonie
 */
export async function lightMolotov(item) {
  const actor = item?.actor;
  if (!actor || !isMolotov(item)) return false;
  if (isLit(item)) {
    ui.notifications.info(`${item.name}: butelka już płonie.`);
    return true;
  }
  // Jedna zapalona butelka na raz — rzucić i tak da się jedną na turę.
  if (actor.items.some(i => i.id !== item.id && isLit(i))) {
    ui.notifications.warn(`${actor.name} już trzyma zapaloną butelkę — najpierw ją rzuć.`);
    return false;
  }
  if (Number(item.system.quantity ?? 0) <= 0) {
    ui.notifications.warn(`${item.name}: brak butelek.`);
    return false;
  }

  await item.setFlag(MODULE_ID, FLAG_LIT, _combatStamp());
  syncActorLight(actor);

  const source = hasFireSource(actor)
    ? ""
    : `<div class="neuro-molotov-warn"><i class="fa-solid fa-triangle-exclamation"></i> Brak źródła ognia w ekwipunku — MG decyduje, czy jest od czego podpalić.</div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-fire-card is-burning">
      <div class="neuro-fire-head"><i class="fa-solid fa-fire"></i> KOKTAJL PODPALONY</div>
      <div class="neuro-fire-body">${actor.name} podpala butelkę (Akcja Bonusowa lub Używanie).
        Rzut to osobna akcja. Pali się najwyżej ${MAX_LIT_ROUNDS} rundy — potem pęka i podpala trzymającego.</div>
      ${source}
    </div>`
  });
  return true;
}

/** Zgaś stan „zapalona" bez zużycia (zdjęcie flagi) — po rzucie zapaloną butelką. */
export async function clearLit(item) {
  if (!isLit(item)) return;
  await item.unsetFlag(MODULE_ID, FLAG_LIT);
  if (item.actor) syncActorLight(item.actor);
}

/* -------------------------------------------- */
/*  Pęknięcie po 3 rundach (aktywny MG)           */
/* -------------------------------------------- */

const _bursting = new Set();

/** Wszyscy aktorzy, którzy mogą trzymać butelkę — też niepołączone żetony na scenach. */
function _candidateActors() {
  const out = new Set(game.actors);
  for (const scene of game.scenes) {
    for (const token of scene.tokens) if (!token.actorLink && token.actor) out.add(token.actor);
  }
  return out;
}

async function _checkBursts() {
  if (!game.user.isActiveGM) return;
  const c = game.combat;
  const combat = c ? { id: c.id, started: c.started, round: c.round, turn: c.turn } : null;
  const now = game.time.worldTime;
  for (const actor of _candidateActors()) {
    let holdsLit = false;
    for (const item of actor.items) {
      const lit = litInfo(item);
      if (!lit) continue;
      holdsLit = true;
      if (!burstDue(lit, combat, now)) continue;
      await _burst(item).catch(e => console.warn(`${MODULE_ID} | molotov: burst failed`, e));
    }
    // Licznik „zostało N rund" w wierszu zmienia się z turą, nie z itemem — odśwież otwartą kartę.
    if (holdsLit && actor.sheet?.rendered) actor.sheet.render();
  }
}

/**
 * Butelka pęka w ręku: sztuka mniej, światło gaśnie, trzymający płonie przez minutę — wszystko
 * od razu, bez przycisku (patrz doc comment pliku: świadomy wyjątek od doktryny).
 */
async function _burst(item) {
  if (_bursting.has(item.uuid)) return;
  _bursting.add(item.uuid);
  try {
    const actor = item.actor;
    const qty = Number(item.system.quantity ?? 0);
    await item.update({
      "system.quantity": Math.max(0, qty - 1),
      [`flags.${MODULE_ID}.-=${FLAG_LIT}`]: null
    });
    if (actor) syncActorLight(actor);
    playExplosiveSoundForSubtype(MOLOTOV_SUBTYPE);
    if (actor) await igniteFor(actor, MOLOTOV_BURN_ROUNDS);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="neuro-fire-card is-burning">
        <div class="neuro-fire-head"><i class="fa-solid fa-wine-bottle"></i> BUTELKA PĘKA</div>
        <div class="neuro-fire-body">Koktajl Mołotowa płonął w ręku ${actor?.name ?? "?"} ${MAX_LIT_ROUNDS} rundy — butelka pęka
          i podpala trzymającego (Podpalenie na 1 minutę, bez RO).</div>
      </div>`
    });
  } finally {
    _bursting.delete(item.uuid);
  }
}

/* -------------------------------------------- */
/*  Światło                                       */
/* -------------------------------------------- */

function _molotovLightProvider(actor) {
  const lit = actor?.items?.some(i => isLit(i) && Number(i.system.quantity ?? 0) > 0);
  if (!lit) return null;
  return molotovLight();
}

/* -------------------------------------------- */
/*  Rejestracja                                   */
/* -------------------------------------------- */

export function registerMolotov() {
  registerLightProvider(_molotovLightProvider);
  const check = () => _checkBursts().catch(e => console.warn(`${MODULE_ID} | molotov: check failed`, e));
  Hooks.on("updateCombat", check);
  Hooks.on("deleteCombat", check);
  Hooks.on("updateWorldTime", check);
  console.log("Neuroshima 5e | Koktajl Mołotowa registered");
}

export const __testing = Object.freeze({ burstDue, molotovLight });
