/**
 * Neuroshima 5e — jeden rozstrzygacz trafienia na karcie ataku (PLAN_tt.md §4.6, E2).
 *
 * Zasady są w `config/defense-rules.mjs` (`resolveHit`); tutaj Foundry:
 *
 *   - **`ttAgainst(cel, { attacker, melee })`** — TT celu wobec tego atakującego: `ac.value`
 *     (silnik TT dla postaci, statblock dla BN, z Efektami Aktywnymi reakcji trwałych) plus znaczniki
 *     `ttVsAttacker` (Parowanie tarczą — ataki tego przeciwnika, E3).
 *   - **Stempel werdyktu.** W `preCreateChatMessage` karty Testu Ataku (klient atakującego — ten sam
 *     wzorzec, którym `weapons/magazine.mjs` stempluje `shotCaliber`) liczymy werdykt dla każdego
 *     celu i zapisujemy go w `flags.<mod>.obrona`. Po utworzeniu kartę pisze już tylko MG (E3).
 *   - **Natywna tacka celów** dnd5e dostaje nasze ikony trafił/pudło i TT z osłoną i reakcjami —
 *     dnd5e porównuje gołe `ac` z chwili rzutu i nie zna naszej osłony ani naturalnej 1/20 NOE.
 *   - **Odczyt dla reszty modułu**: dźwięki, smugacz, Dozownik, olejek pytają `verdictFor*` /
 *     `hitTargetsFor*` zamiast porównywać `total` z `ac.value` (Z4).
 *
 * Kształt flagi (§4.8.4, z poprawką): cele to **lista**, nie obiekt kluczowany UUID-em żetonu —
 * UUID ma kropki, a kropka w kluczu flagi rozwija się w zagnieżdżenie (ta sama pułapka co sloty
 * lalki, DEV_GUIDE §16).
 *
 * ```js
 * flags[MODULE_ID].obrona = {
 *   v: 1, attackerUuid, attackerKind, melee, natural, total, krytyk, fumble,
 *   targets: [{ tokenUuid, actorUuid, name, tt, cover, used: [], critDowngraded, verdict, decided }]
 * }
 * ```
 */

import { resolveHit, creatureKindOf, isHitVerdict } from "../config/defense-rules.mjs";
import { coverAcBonus } from "./cover.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const OBRONA_FLAG = "obrona";

/** Flaga znacznika TT wobec jednego atakującego (Efekt Aktywny bez zmian): `{attackerUuid, bonus, melee}`. */
export const TT_VS_ATTACKER_FLAG = "ttVsAttacker";

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  TT wobec atakującego                         */
/* -------------------------------------------- */

/**
 * @param {Actor5e} target
 * @param {object} [o]
 * @param {Actor5e|string|null} [o.attacker]  Aktor albo jego UUID.
 * @param {boolean} [o.melee]
 * @returns {number|null}
 */
export function ttAgainst(target, { attacker = null, melee = false } = {}) {
  const base = target?.system?.attributes?.ac?.value;
  if (!Number.isFinite(base)) return null;
  const attackerUuid = typeof attacker === "string" ? attacker : attacker?.uuid;
  let bonus = 0;
  if (attackerUuid) {
    for (const e of target.effects ?? []) {
      if (e.disabled) continue;
      const m = e.getFlag?.(MODULE_ID, TT_VS_ATTACKER_FLAG);
      if (!m || m.attackerUuid !== attackerUuid) continue;
      if (m.melee && !melee) continue;
      bonus += _num(m.bonus);
    }
  }
  return base + bonus;
}

/** Kategoria atakującego dla Uniku łowcy / Empiryka (P7). */
export function attackerKindOf(actor) {
  if (!actor) return null;
  return creatureKindOf(actor.system?.details?.type?.value);
}

/** Czy atak tej aktywności z tym trybem jest atakiem wręcz (rzut bronią białą to dystans). */
export function isMeleeAttack(activity, attackMode) {
  try {
    const t = activity?.getActionType?.(attackMode) ?? activity?.actionType;
    return t === "mwak" || t === "msak";
  } catch {
    return false;
  }
}

/* -------------------------------------------- */
/*  Werdykt                                      */
/* -------------------------------------------- */

/** Wynik naturalny k20 (po Ułatwieniu/Utrudnieniu — kość, która się liczy). */
export function naturalOf(roll) {
  const d = roll?.d20 ?? roll?.dice?.[0];
  const v = Number(d?.total);
  return Number.isFinite(v) ? v : null;
}

/** Suma premii z użytych reakcji na tym celu. */
export const reactionBonus = entry => (entry?.used ?? []).reduce((n, u) => n + _num(u.bonus), 0);

/** Werdykt jednego celu z zapisu na karcie (bez sięgania do żywych danych). */
export function verdictOfEntry(obrona, entry) {
  return resolveHit({
    total: obrona.total, critical: obrona.krytyk, fumble: obrona.fumble, tt: entry.tt, cover: entry.cover,
    bonuses: reactionBonus(entry), critDowngraded: entry.critDowngraded
  });
}

/**
 * Wpis celu na karcie ataku: TT wobec atakującego w chwili rzutu, osłona, werdykt.
 * @param {Token|TokenDocument} token
 */
export function buildTargetEntry(token, { obrona, attacker, cover = 0 }) {
  const doc = token?.document ?? token;
  const actor = doc?.actor;
  const tt = actor ? ttAgainst(actor, { attacker, melee: obrona.melee }) : null;
  const entry = {
    tokenUuid: doc?.uuid ?? null, actorUuid: actor?.uuid ?? null, name: doc?.name ?? actor?.name ?? "?",
    tt, cover: _num(cover), used: [], critDowngraded: false, verdict: null, decided: false
  };
  entry.verdict = verdictOfEntry(obrona, entry).verdict;
  return entry;
}

/** Szkielet `obrona` z rzutu i aktywności — bez celów. */
export function buildObrona(roll, activity) {
  const attacker = activity?.actor ?? null;
  return {
    v: 1,
    attackerUuid: attacker?.uuid ?? null,
    attackerKind: attackerKindOf(attacker),
    melee: isMeleeAttack(activity, roll?.options?.attackMode),
    natural: naturalOf(roll),
    total: _num(roll?.total),
    krytyk: !!roll?.isCritical,
    fumble: !!roll?.isFumble,
    targets: []
  };
}

/** `flags.<mod>.obrona` karty albo `null`. */
export function obronaOf(message) {
  return message?.flags?.[MODULE_ID]?.[OBRONA_FLAG] ?? null;
}

/**
 * Karta ataku powiązana z wiadomością: ona sama (Test Ataku), albo ostatni Test Ataku z karty
 * użycia, z której wyszła (rzut obrażeń, karta użycia).
 */
export function attackMessageFor(message) {
  if (!message) return null;
  if (obronaOf(message)) return message;
  const origin = message.getOriginatingMessage?.() ?? message;
  const attacks = origin?.getAssociatedRolls?.("attack") ?? [];
  return attacks.filter(m => obronaOf(m)).pop() ?? null;
}

/** Wpis celu dla żetonu albo aktora. */
export function entryFor(obrona, tokenOrActor) {
  if (!obrona) return null;
  const doc = tokenOrActor?.document ?? tokenOrActor;
  const uuid = doc?.uuid;
  return obrona.targets.find(t => t.tokenUuid === uuid)
    ?? obrona.targets.find(t => t.actorUuid === (doc?.actor?.uuid ?? uuid)) ?? null;
}

/**
 * Werdykt dla celu ze stempla karty, z której pochodzą rzuty (`roll.parent`, `dnd5e.postRollAttack`).
 * @returns {"pudło"|"trafienie"|"krytyk"|null}  `null` — brak stempla albo celu.
 */
export function verdictForRolls(rolls, token) {
  const obrona = obronaOf(rolls?.[0]?.parent);
  const entry = entryFor(obrona, token);
  return entry ? verdictOfEntry(obrona, entry).verdict : null;
}

/**
 * Czy trafiło — dla efektów (dźwięk, smugacz), które pytają w chwili rzutu. Ze stempla, a gdy go nie ma
 * (stara karta, brak aktywności) — z tego samego rozstrzygacza na żywych danych.
 */
export function isHitForRolls(rolls, token, activity = null) {
  const v = verdictForRolls(rolls, token);
  if (v) return isHitVerdict(v);
  const roll = rolls?.[0];
  if (!roll || !token) return false;
  const actor = token.actor ?? token.document?.actor;
  const melee = isMeleeAttack(activity, roll.options?.attackMode);
  return isHitVerdict(resolveHit({
    total: roll.total, critical: roll.isCritical, fumble: roll.isFumble,
    tt: actor ? ttAgainst(actor, { attacker: activity?.actor, melee }) : null,
    cover: coverAcBonus(roll.options?.neuroCover)
  }).verdict);
}

/**
 * Cele trafione atakiem, z którego wziął się ten rzut obrażeń (`dnd5e.rollDamage`). Bez karty ataku
 * (obrażenia rzucone z arkusza) — bieżące cele rzucającego: rzut obrażeń to deklaracja trafienia.
 * @returns {{tokens: TokenDocument[], fromAttack: boolean}}
 */
export function hitTargetsForDamage(rolls) {
  const attack = attackMessageFor(rolls?.[0]?.parent);
  const obrona = obronaOf(attack);
  if (obrona?.targets?.length) {
    const tokens = obrona.targets
      .filter(t => isHitVerdict(verdictOfEntry(obrona, t).verdict))
      .map(t => fromUuidSync(t.tokenUuid))
      .filter(Boolean);
    return { tokens, fromAttack: true };
  }
  return { tokens: [...(game.user.targets ?? [])].map(t => t.document), fromAttack: false };
}

/* -------------------------------------------- */
/*  Stempel na karcie ataku                      */
/* -------------------------------------------- */

/**
 * Przerzut Fuksem (`combat/rerolls.mjs`): karta przerzutu przejmuje cele, osłonę i użyte reakcje
 * karty źródłowej z nowym wynikiem. Rzut przerzutu jest zwykłym `Roll` (nie `D20Roll`), więc krytyk
 * i jedynkę czytamy z naturalnej kości wobec progów rzutu źródłowego.
 */
function _stampReroll(message, sourceId) {
  const source = game.messages.get(sourceId);
  const old = obronaOf(source);
  const roll = message.rolls?.[0];
  if (!old || !roll) return;
  const natural = naturalOf(roll);
  const opts = source.rolls?.[0]?.options ?? {};
  const obrona = {
    ...foundry.utils.deepClone(old),
    natural, total: _num(roll.total),
    krytyk: Number.isFinite(natural) && natural >= (opts.criticalSuccess ?? 20),
    fumble: Number.isFinite(natural) && natural <= (opts.criticalFailure ?? 1)
  };
  for (const t of obrona.targets) {
    t.critDowngraded = false;
    t.decided = false;
    t.verdict = verdictOfEntry(obrona, t).verdict;
  }
  message.updateSource({ [`flags.${MODULE_ID}.${OBRONA_FLAG}`]: obrona });
}

function _onPreCreateMessage(message, data, _options, userId) {
  if (userId !== game.user.id) return;
  if (foundry.utils.getProperty(data, "flags.dnd5e.roll.type") !== "attack") return;
  const rerollOf = foundry.utils.getProperty(data, `flags.${MODULE_ID}.rerollOf`);
  if (rerollOf) return _stampReroll(message, rerollOf);
  const roll = message.rolls?.[0];
  if (!roll) return;
  const activityUuid = foundry.utils.getProperty(data, "flags.dnd5e.activity.uuid");
  const activity = activityUuid ? fromUuidSync(activityUuid) : null;
  const obrona = buildObrona(roll, activity);
  const tokens = [...(game.user.targets ?? [])];
  // Okno osłony pyta tylko przy jednym celu (`combat/cover.mjs`) — osłona należy do niego.
  const cover = tokens.length === 1 ? coverAcBonus(roll.options?.neuroCover) : 0;
  obrona.targets = tokens.map(t => buildTargetEntry(t, { obrona, attacker: activity?.actor, cover }));
  message.updateSource({ [`flags.${MODULE_ID}.${OBRONA_FLAG}`]: obrona });
}

/* -------------------------------------------- */
/*  Natywna tacka celów                          */
/* -------------------------------------------- */

/** Ikony trafił/pudło i TT w tacce celów dnd5e — z naszego werdyktu (§4.6). */
function _onRenderMessage(message, html) {
  const obrona = obronaOf(message);
  if (!obrona?.targets?.length) return;
  const visibility = game.settings.get("dnd5e", "attackRollVisibility");
  for (const row of html.querySelectorAll(".targets-tray li.target")) {
    const entry = obrona.targets.find(t => t.actorUuid === row.dataset.uuid);
    if (!entry) continue;
    const r = verdictOfEntry(obrona, entry);
    const miss = !isHitVerdict(r.verdict);
    row.classList.toggle("hit", !miss);
    row.classList.toggle("miss", miss);
    row.dataset.miss = String(miss);
    const icon = row.querySelector(":scope > i.fas");
    if (icon) {
      icon.classList.toggle("fa-check", !miss);
      icon.classList.toggle("fa-times", miss);
    }
    const canSeeAc = game.user.isGM || (visibility === "all")
      || !!fromUuidSync(entry.actorUuid)?.isOwner;
    const acSpan = row.querySelector(".ac span");
    if (acSpan && canSeeAc && Number.isFinite(r.target)) acSpan.textContent = String(r.target);
  }
}

/* -------------------------------------------- */

export function registerTrafienie() {
  Hooks.on("preCreateChatMessage", _onPreCreateMessage);
  Hooks.on("dnd5e.renderChatMessage", _onRenderMessage);
  console.log(`${MODULE_ID} | Hit resolver registered`);
}

/** Powierzchnia dla testów Quench (TESTING.md, warstwa 4). */
export const __testing = Object.freeze({ verdictOfEntry, reactionBonus, buildObrona, entryFor });
