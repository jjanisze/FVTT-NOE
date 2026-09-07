/**
 * Neuroshima 5e — Podpalenie.
 *
 * RAW (str. 402, PODPALENIE [ZAGROŻENIE]): podpalona istota otrzymuje 1k4 obrażeń od
 * ognia na początku każdej swojej tury i może akcją spróbować się ugasić, przewracając
 * się i turlając po ziemi. Ogień gaśnie też od gaśnicy, zanurzenia w wodzie albo
 * zduszenia płomieni.
 *
 * Podpalenie jest **zwykłym stanem**: zapala je i gasi klik w palecie Token HUD, tak samo
 * jak każdy inny status. Nie ma tu osobnego narzędzia MG i nie ma modyfikatorów klawiszy —
 * cała reszta pliku tylko reaguje na to, że efekt się pojawił, wisi albo zniknął.
 *
 * ## Co jest systemowe, a co nasze
 *
 * Czas trwania **nie** jest własnym licznikiem we fladze. Stan `burning` niesie
 * `duration: { value: 2, units: "rounds", expiry: "turnStart" }` (patrz `config/conditions.mjs`),
 * więc odliczaniem, przeliczaniem przy zmianie rundy i etykietą w karcie efektów zajmuje się
 * `ActiveEffect#updateDuration` z rdzenia. My tylko czytamy `remaining`.
 *
 * Kasowanie wygasłego efektu jest jednak nasze, i to jest świadome zastępstwo
 * (ARCHITECTURE.md §8). Rdzeń ma na to `ActiveEffect.registry`, ale jego reakcja zależy od
 * `CONFIG.ActiveEffect.expiryAction`, które domyślnie stoi na `"update"` — wygasły efekt
 * zostaje na aktorze, tylko z `duration.expired = true`. Płonący pionek płonąłby dalej.
 * Przełączenie tego na `"delete"` jest ustawieniem **globalnym**: skasowałoby po wygaśnięciu
 * każdy efekt w świecie, łącznie z tymi, które mają zostać widoczne jako wygasłe. Zamiast
 * zmieniać zachowanie całej gry dla jednego stanu, gasimy ogień u siebie.
 *
 * Poza walką `remaining` nie ma czym tykać i nikt tu nie zagląda — pionek płonie, dopóki
 * ktoś nie zdejmie stanu. To celowe: człowiek pochodnia jest sceną, nie błędem.
 */

import { seqEffect, seqEndEffect, seqEffectRunning, seqScrollText } from "../weapons/sequencer.mjs";
import { STATE_COLORS } from "../config/state-colors.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const STATUS = "burning";

/**
 * RAW nie podaje ST na ugaszenie się — mówi tylko „może spróbować”. Samo „spróbować”
 * wymaga jednak rzutu, więc dobieramy najbliższy: turlanie się po ziemi to Zręczność
 * (Akrobatyka), a ST 10 to w tym systemie próg czynności trudnej pod presją.
 */
export const PODPALENIE = Object.freeze({
  damage: "1d4",
  damageType: "fire",
  douseSkill: "akr",
  douseDC: 10
});

/** Ścieżki JB2A. Brak modułu = brak ognia, zasady działają dalej (patrz seqEffect). */
const FX = Object.freeze({
  ignite: "jb2a.flames.02.orange",
  flame:  "jb2a.flames.01.orange",
  water:  "jb2a.liquid.splash.blue",
  smoke:  "jb2a.smoke.puff.centered.grey"
});

/** Uchwyt do trwałego płomienia przypiętego do żetonu. */
const flameName = tokenId => `neuro-podpalenie-${tokenId}`;

/**
 * Jeden klient wykonuje skutki, inaczej dwóch graczy z otwartą sceną rzuciłoby dwa razy
 * po 1k4 i przypięło dwa płomienie. To ten sam test, którym rdzeń wybiera wykonawcę
 * wygaszania efektów.
 */
const isActingClient = () => game.users.activeGM?.isSelf === true;

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerPodpalenie() {
  Hooks.on("createActiveEffect", _onCreateEffect);
  Hooks.on("deleteActiveEffect", _onDeleteEffect);
  Hooks.on("updateCombat", _onUpdateCombat);
  Hooks.on("canvasReady", _syncFlames);
  console.log("Neuroshima 5e | Podpalenie registered");
}

export const podpalenieApi = { isBurning, ignite, douse, promptDouse };

/* -------------------------------------------- */
/*  State                                        */
/* -------------------------------------------- */

/** @returns {ActiveEffect|null} */
function _burningEffect(actor) {
  return actor?.effects?.find(e => e.statuses?.has(STATUS)) ?? null;
}

export function isBurning(actor) {
  return !!_burningEffect(actor);
}

/** Zapal. Toggle statusu, bo Podpalenie to zwykły stan — HUD robi dokładnie to samo. */
export async function ignite(actor) {
  if (!actor || isBurning(actor)) return;
  await actor.toggleStatusEffect(STATUS, { active: true });
}

/**
 * Ugaś celowo — woda, gaśnica, koc, udany turlaniec.
 * @param {Actor} actor
 * @param {string} [how]  Czym, do karty na czacie.
 */
export async function douse(actor, how = "") {
  const effect = _burningEffect(actor);
  if (!effect) return;
  await effect.delete();
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-fire-card is-out">
      <div class="neuro-fire-head"><i class="fa-solid fa-fire-extinguisher"></i> OGIEŃ UGASZONY</div>
      <div class="neuro-fire-body">${actor.name}${how ? ` — ${how}` : ""}.</div>
    </div>`
  });
}

/* -------------------------------------------- */
/*  VFX                                          */
/* -------------------------------------------- */

function _startFlame(token) {
  if (seqEffectRunning(flameName(token.id))) return;
  seqEffect(FX.ignite, token, { scale: 2.2, opacity: 0.95, fadeOut: 500 });
  seqEffect(FX.flame, token, {
    scale: 1.9, opacity: 0.9, attach: true, persist: true,
    name: flameName(token.id), fadeIn: 400, fadeOut: 700
  });
}

/**
 * Zgaś płomień i dopowiedz czym.
 * @param {Token} token
 * @param {boolean} burnout  true = wypaliło się samo; wtedy zostaje sam dym, bez wody.
 */
function _stopFlame(token, burnout) {
  seqEndEffect(flameName(token.id));
  if (!burnout) seqEffect(FX.water, token, { scale: 1.2, fadeOut: 300 });
  seqEffect(FX.smoke, token, { scale: 1.1, opacity: 0.5, delay: burnout ? 0 : 350, fadeOut: 900 });
}

/** Płomień jest trwałym efektem Sequencera, więc wraca sam po F5 — to łata dryf, nie normalny start. */
function _syncFlames() {
  if (!isActingClient()) return;
  for (const token of canvas.tokens?.placeables ?? []) {
    const burning = isBurning(token.actor);
    const lit = seqEffectRunning(flameName(token.id));
    if (burning && !lit) _startFlame(token);
    else if (!burning && lit) seqEndEffect(flameName(token.id));
  }
}

/* -------------------------------------------- */
/*  Effect lifecycle                             */
/* -------------------------------------------- */

/** @returns {Actor|null} aktor, jeśli to efekt Podpalenia siedzący na aktorze */
function _burningActorOf(effect) {
  if (!effect?.statuses?.has(STATUS)) return null;
  const parent = effect.parent;
  return parent?.documentName === "Actor" ? parent : null;
}

function _onCreateEffect(effect) {
  const actor = _burningActorOf(effect);
  if (!actor || !isActingClient()) return;
  for (const token of actor.getActiveTokens()) _startFlame(token);
  seqScrollText("PŁONIE!", actor, { color: STATE_COLORS.podpalenie, fontSize: 32, duration: 2000 });
}

function _onDeleteEffect(effect, options) {
  const actor = _burningActorOf(effect);
  if (!actor || !isActingClient()) return;
  const burnout = options?.neuroBurnout === true;
  for (const token of actor.getActiveTokens()) _stopFlame(token, burnout);
}

/* -------------------------------------------- */
/*  Turn tick                                    */
/* -------------------------------------------- */

/**
 * Początek tury płonącego: albo ogień właśnie się wypalił, albo zabiera swoje 1k4.
 *
 * `updateDuration()` liczy `remaining` na bieżąco — to ta sama metoda, z której korzysta
 * rejestr efektów rdzenia, więc nasza arytmetyka nie może się rozjechać z tą w karcie efektu.
 */
async function _onUpdateCombat(combat, changed) {
  if (!isActingClient()) return;
  if (!("turn" in changed) && !("round" in changed)) return;

  const actor = combat.combatant?.actor;
  const effect = _burningEffect(actor);
  if (!effect) return;

  if (effect.updateDuration().remaining <= 0) {
    await _burnOut(actor, effect);
    return;
  }
  await _burnTick(actor);
}

async function _burnTick(actor) {
  const roll = await new Roll(PODPALENIE.damage).evaluate();
  // Bez `ignore` — odporność i podatność na ogień mają tu działać.
  await actor.applyDamage([{ value: roll.total, type: PODPALENIE.damageType }]);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: `<div class="neuro-fire-card is-burning">
      <div class="neuro-fire-head"><i class="fa-solid fa-fire"></i> PODPALENIE</div>
      <div class="neuro-fire-body">${actor.name} płonie — <strong>${roll.total}</strong> obrażeń od ognia.</div>
    </div>`
  });
}

/** Wypalenie się z upływu czasu. Nie jest gaszeniem, więc nie ma wody — zostaje dym. */
async function _burnOut(actor, effect) {
  await effect.delete({ neuroBurnout: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-fire-card is-out">
      <div class="neuro-fire-head"><i class="fa-solid fa-smog"></i> OGIEŃ WYGASA</div>
      <div class="neuro-fire-body">Płomienie na ${actor.name} dopalają się same.</div>
    </div>`
  });
}

/* -------------------------------------------- */
/*  Gaszenie się akcją                           */
/* -------------------------------------------- */

/**
 * Akcja z RAW: przewracasz się i turlasz. Powalenie leci zawsze — to nie kara za porażkę,
 * tylko sposób, w jaki się gasi. Test decyduje wyłącznie o tym, czy ogień zszedł.
 *
 * Sukces gasi od razu — akcja jest jedna, więc i kliknięcie ma być jedno.
 * @param {Actor} actor
 */
/**
 * Nomeksowy kombinezon (GM homebrew, brak w RAW — zgłoszenie 2026-09-07): ognioodporny
 * kombinezon kierowcy. Jedyna dźwignia, jaką ten system w ogóle wystawia dla "obrony przed
 * podpaleniem" to właśnie ten rzut na ugaszenie się, więc stąd Ułatwienie — nie ma tu osobnego
 * rzutu na "czy się zapalasz". Wymaga założenia (equipment.equipped), nie samego posiadania.
 */
function _hasNomexEquipped(actor) {
  return actor?.items?.some(i =>
    i.type === "equipment" && i.system?.equipped && i.getFlag(MODULE_ID, "nomex") === true
  ) ?? false;
}

export async function promptDouse(actor) {
  if (!isBurning(actor)) return;

  await actor.toggleStatusEffect("prone", { active: true });

  const advantage = _hasNomexEquipped(actor);
  const rolls = await actor.rollSkill({ skill: PODPALENIE.douseSkill, target: PODPALENIE.douseDC, advantage });
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return;

  const ok = roll.total >= PODPALENIE.douseDC;
  const skill = CONFIG.DND5E.skills?.[PODPALENIE.douseSkill]?.label ?? "Akrobatyka";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-fire-card ${ok ? "is-out" : "is-burning"}">
      <div class="neuro-fire-head"><i class="fa-solid fa-person-falling"></i> TURLANIE PO ZIEMI</div>
      <div class="neuro-fire-body">${actor.name} pada na ziemię i turla się —
        Test Zręczności (${skill}) ST ${PODPALENIE.douseDC}${advantage ? " (Ułatwienie — nomeksowy kombinezon)" : ""}: <strong>${roll.total}</strong>.
        ${ok ? "Płomienie puszczają." : "Ogień trzyma się dalej."}</div>
    </div>`,
    flags: { [MODULE_ID]: { podpalenie: true } }
  });

  if (ok) await douse(actor, "zbite płomienie");
}
