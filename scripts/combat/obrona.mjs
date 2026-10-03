/**
 * Neuroshima 5e — okno „Reakcje celu” na karcie ataku (PLAN_tt.md §4.8–4.10, E3–E5).
 *
 * Zasady (katalog reakcji, stany przycisków) są w `config/defense-rules.mjs`; werdykt i stempel
 * karty — w `combat/trafienie.mjs`. Tutaj:
 *
 *   - **Sekcja „Reakcje celu”** pod Testem Ataku, renderowana per widz (`dnd5e.renderChatMessage`):
 *     widzą wszyscy (D9), przyciski aktywne dla właściciela celu i MG. Reakcja „na ten atak”
 *     wyszarzona, gdy nawet najwyższy wynik nie zmieni trafienia w pudło; trwała (do początku
 *     tury) — aktywna, gdy są ładunki (D11). Nic nie blokuje „Obrażeń” (D10).
 *   - **Wykonawca jest jeden: aktywny MG.** Gracz rzuca swoje kości u siebie (Dice So Nice) i kładzie
 *     prośbę na **własnym** aktorze (`flags.<mod>.obronaProsba`, idiom `items/kolczatka.mjs`);
 *     `updateActor` u MG sprawdza, czy reakcja nadal pasuje, i dopiero wtedy zużywa ładunek, zakłada
 *     efekt i pisze kartę. Odstępstwo od §4.8.5 (tam efekty zakładał klient gracza przed sprawdzeniem):
 *     odrzucona prośba nie może już zostawić zużytego ładunku. Bez aktywnego MG przyciski są
 *     wyszarzone („potrzebny MG”), więc nic nie przepada.
 *   - **Efekty** (§4.5): Inteligentna obrona i Koci odskok — `ac.bonus` do początku tury właściciela;
 *     Parowanie tarczą — znacznik `ttVsAttacker` (TT +5 wobec tego atakującego, tylko wręcz).
 *     Czas trwania i sprzątanie: `actors/tt.mjs`.
 *   - **⏳** przy „Obrażeniach” na karcie użycia, dopóki reakcja może jeszcze zmienić wynik.
 *   - **„Ustaw cel”** (MG) — cel zadeklarowany słownie albo źle wycelowany (§4.8.6).
 *   - **Krytyczna ochrona hełmu** (D12, E4): krytyk → zwykłe trafienie, hełm zdejmowany; Kobalt
 *     zostawia „Dziurawy hełm” (D12a, `wkk/config/dziurawy-helm.mjs`). Rzut obrażeń z tej karty
 *     wychodzi wtedy bez krytyka (P9: bez Stopnia Zranienia i wytrzymałości z krytyka).
 *   - **BN-cele** (D13, E5): reakcje TT z Bestiariusza (`flags.<mod>.ttReaction`) jako przyciski MG,
 *     inne cechy z Reakcją — przypomnienie bez automatyki.
 */

import {
  DEFENSE_REACTIONS, reactionState, hasPendingReaction, isHitVerdict, isDiceBonus, bonusMax, npcReactionRow
} from "../config/defense-rules.mjs";
import {
  obronaOf, OBRONA_FLAG, verdictOfEntry, buildTargetEntry, buildObrona, attackMessageFor, TT_VS_ATTACKER_FLAG
} from "./trafienie.mjs";
import { coverAcBonus } from "./cover.mjs";
import { getResolvedAbility } from "../actors/abilities.mjs";
import { heldItems, familyOf } from "../actors/doll.mjs";
import { isProficientIn } from "../actors/armor-rules.mjs";
import { TT_EFFECT_FLAG } from "../actors/tt.mjs";
import { CHANGE_TYPE, change } from "../config/effect-changes.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { dziurawyHelmData } from "../wkk/config/dziurawy-helm.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const PROSBA_FLAG = "obronaProsba";
/** Flaga cechy BN z Bestiariusza: `{ bonus, melee, scope }` (`dev/bestiary/gen_bestiary.py`, E5). */
export const NPC_TT_REACTION_FLAG = "ttReaction";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Przedmioty, z których reakcje biorą ładunki: id zdolności klasowej + klucz mostu. */
const CHARGE_SOURCES = Object.freeze({
  inteligentnaObrona: { abilityId: "inteligentna-obrona", key: "inteligentnaObrona" },
  kociOdskok: { abilityId: "kocie-kosci", key: null }
});

/* -------------------------------------------- */
/*  Migawka celu                                 */
/* -------------------------------------------- */

function _chargeItem(actor, reactionId) {
  const src = CHARGE_SOURCES[reactionId];
  if (!src) return null;
  const flagged = actor.items.find(i => i.getFlag(MODULE_ID, "abilityId") === src.abilityId);
  if (flagged) return flagged;
  if (reactionId === "kociOdskok") return actor.items.find(i => /kocie ko[sś]ci/i.test(i.name)) ?? null;
  return src.key ? getResolvedAbility(actor, src.key).item : null;
}

/** Pozostałe użycia albo `null` (przedmiot bez licznika — Roll20, bez limitu). */
function _usesLeft(item) {
  const u = item?.system?.uses;
  if (!u?.max) return null;
  return Number.isFinite(Number(u.value)) ? Number(u.value) : _num(u.max) - _num(u.spent);
}

/** Kość Kocich kości z tabeli Złodzieja (`@scale.zlodziej.kocieKosci`). */
function _catDie(actor) {
  const scale = actor.getRollData?.()?.scale?.zlodziej?.kocieKosci;
  const f = scale?.formula ?? (scale ? String(scale) : "");
  return /\d*d\d+/i.test(f) ? f : "1d6";
}

function _shieldOf(actor) {
  const shield = actor.items.find(i => i.type === "equipment" && i.system?.type?.value === "shield");
  if (!shield) return null;
  const req = _num(shield.system?.strength) || 13;
  const str = _num(actor.system?.abilities?.str?.value);
  return {
    item: shield,
    inHand: heldItems(actor).some(h => h.item?.id === shield.id),
    proficient: isProficientIn(actor, shield),
    strReq: req,
    strOk: str >= req
  };
}

/**
 * Snapshot celu dla `reactionState` (`config/defense-rules.mjs`).
 * @param {Actor5e} actor
 */
export function defenseSnapshot(actor) {
  const keys = DEFENSE_REACTIONS.map(r => r.ability).filter(Boolean);
  const abilities = actor.system?.abilities ?? {};
  return {
    owned: new Set(keys.filter(k => getResolvedAbility(actor, k).enabled)),
    mods: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map(k => [k, _num(abilities[k]?.mod)])),
    prof: _num(actor.system?.attributes?.prof),
    charges: Object.fromEntries(Object.keys(CHARGE_SOURCES).map(id => [id, _usesLeft(_chargeItem(actor, id))])),
    dice: { kociOdskok: _catDie(actor) },
    helmet: actor.items.some(i => i.system?.equipped && familyOf(i) === "helmet"),
    shield: _shieldOf(actor)
  };
}

/** Reakcje BN z Bestiariusza — przyciski MG (D13). */
function _npcRows(actor) {
  return actor.items
    .filter(i => i.flags?.[MODULE_ID]?.[NPC_TT_REACTION_FLAG])
    .map(i => npcReactionRow({ id: `npc-${i.id}`, label: i.name, ...i.flags[MODULE_ID][NPC_TT_REACTION_FLAG] }));
}

/** Wszystkie wiersze reakcji, które mogą dotyczyć tego celu. */
export function reactionRowsFor(actor) {
  return [...DEFENSE_REACTIONS, ..._npcRows(actor)];
}

/**
 * Cechy BN z Reakcją bez automatyki — przypomnienie dla MG (D13). Aktywność `reaction` albo flaga
 * Bestiariusza `reaction`; reakcje TT z Bestiariusza mają przycisk, więc ich tu nie ma.
 */
export function npcReactionReminders(actor) {
  if (!actor || actor.type === "character") return [];
  return actor.items.filter(i => {
    if (i.flags?.[MODULE_ID]?.[NPC_TT_REACTION_FLAG]) return false;
    if (i.flags?.[MODULE_ID]?.bestiaryReaction) return true;
    return [...(i.system?.activities ?? [])].some(a => a.activation?.type === "reaction");
  });
}

/* -------------------------------------------- */
/*  Kontekst ataku                               */
/* -------------------------------------------- */

/** Kontekst `reactionState` z zapisu na karcie. */
export function attackCtx(obrona, entry) {
  const r = verdictOfEntry(obrona, entry);
  return {
    total: obrona.total, natural: obrona.natural, verdict: r.verdict, need: r.need, target: r.target,
    autoHit: r.autoHit, melee: obrona.melee, attackerKind: obrona.attackerKind, used: entry.used,
    critDowngraded: entry.critDowngraded, gmActive: !!game.users.activeGM, decided: entry.decided
  };
}

/** Czy cel jeszcze może zmienić wynik reakcją (plakietka ⏳). */
export function isWaiting(obrona, entry) {
  const actor = fromUuidSync(entry.actorUuid);
  if (!actor) return false;
  return hasPendingReaction(reactionRowsFor(actor), defenseSnapshot(actor), attackCtx(obrona, entry));
}

/* -------------------------------------------- */
/*  Wykonanie (aktywny MG)                       */
/* -------------------------------------------- */

async function _spendCharge(actor, reactionId) {
  const item = _chargeItem(actor, reactionId);
  const u = item?.system?.uses;
  if (!u?.max) return;
  await item.update({ "system.uses.spent": _num(u.spent) + 1 });
}

/** Efekt TT do początku następnej tury właściciela (§4.5). */
async function _createTurnEffect(actor, row, bonus) {
  const item = _chargeItem(actor, row.id);
  return actor.createEmbeddedDocuments("ActiveEffect", [{
    name: `${row.label} (TT +${bonus})`,
    img: item?.img ?? "icons/svg/shield.svg",
    origin: item?.uuid ?? actor.uuid,
    duration: { value: 1, units: "turns", expiry: "turnStart" },
    system: { changes: [change("system.attributes.ac.bonus", CHANGE_TYPE.add, bonus)] },
    flags: { [MODULE_ID]: { [TT_EFFECT_FLAG]: { source: row.id } } }
  }]);
}

/** Parowanie tarczą: TT +5 wobec ataków wręcz tego przeciwnika, do początku następnej tury. */
async function _createAttackerMarker(actor, row, bonus, obrona) {
  const attacker = fromUuidSync(obrona.attackerUuid);
  const shield = _shieldOf(actor)?.item;
  return actor.createEmbeddedDocuments("ActiveEffect", [{
    name: `${row.label} (TT +${bonus} wobec: ${attacker?.name ?? "atakujący"})`,
    img: shield?.img ?? "icons/svg/shield.svg",
    origin: shield?.uuid ?? actor.uuid,
    duration: { value: 1, units: "turns", expiry: "turnStart" },
    flags: {
      [MODULE_ID]: {
        [TT_EFFECT_FLAG]: { source: row.id },
        [TT_VS_ATTACKER_FLAG]: { attackerUuid: obrona.attackerUuid, bonus, melee: !!row.melee }
      }
    }
  }]);
}

/**
 * Krytyczna ochrona (s. 115): hełm niszczeje. Z Kobaltem zostaje „Dziurawy hełm” w plecaku (D12a),
 * bez Kobaltu — nic (RAW). Usunięty przedmiot zwalnia slot głowy w lalce.
 */
export async function breakHelmet(actor) {
  const helmet = actor.items.find(i => i.system?.equipped && familyOf(i) === "helmet");
  if (!helmet) return null;
  if (isKobaltEnabled()) await actor.createEmbeddedDocuments("Item", [dziurawyHelmData(helmet)]);
  await helmet.delete();
  return helmet.name;
}

/** Zapis reakcji na karcie — jedyny pisarz po utworzeniu karty to MG (§4.8.4). */
async function _writeEntry(message, tokenUuid, mutate) {
  const obrona = foundry.utils.deepClone(obronaOf(message));
  const entry = obrona?.targets.find(t => t.tokenUuid === tokenUuid);
  if (!entry) return false;
  if (mutate(entry, obrona) === false) return false;
  entry.verdict = verdictOfEntry(obrona, entry).verdict;
  await message.update({ [`flags.${MODULE_ID}.${OBRONA_FLAG}.targets`]: obrona.targets });
  return true;
}

/**
 * Wykonaj reakcję (tylko aktywny MG): sprawdzenie, ładunek, efekt, zapis na karcie.
 * @param {ChatMessage} message  Karta Testu Ataku.
 * @param {string} tokenUuid
 * @param {string} reactionId
 * @param {object} [o]
 * @param {number|null} [o.roll]  Wynik kości rzuconej przez gracza (sanityzowany do zakresu kości).
 * @param {string} [o.by]         Id użytkownika, który kliknął.
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function executeReaction(message, tokenUuid, reactionId, { roll = null, by = game.user.id } = {}) {
  const obrona = obronaOf(message);
  const entry = obrona?.targets.find(t => t.tokenUuid === tokenUuid);
  if (!entry) return { ok: false, reason: "karta albo cel już nie istnieje" };
  const actor = fromUuidSync(entry.actorUuid);
  const row = actor ? reactionRowsFor(actor).find(r => r.id === reactionId) : null;
  if (!row) return { ok: false, reason: "cel nie ma tej reakcji" };
  const s = defenseSnapshot(actor);
  const st = reactionState(row, s, attackCtx(obrona, entry));
  if (st.state !== "active") return { ok: false, reason: st.reason ?? "reakcja już nie pasuje" };

  let bonus = row.effect === "tt" ? row.bonus(s) : 0;
  let rolled = null;
  if (isDiceBonus(bonus)) {
    const max = bonusMax(bonus);
    if (Number.isFinite(Number(roll))) rolled = Math.min(max, Math.max(1, Math.round(Number(roll))));
    else rolled = (await _rollBonus(actor, row, bonus)).total;
    bonus = rolled;
  }
  bonus = _num(bonus);

  let broken = null;
  if (row.scope === "turn") {
    await _spendCharge(actor, row.id);
    await _createTurnEffect(actor, row, bonus);
  } else if (row.scope === "attacker") {
    await _createAttackerMarker(actor, row, bonus, obrona);
  }
  if (row.effect === "critDowngrade") broken = await breakHelmet(actor);

  const record = {
    id: row.id, label: row.label, bonus, roll: rolled, scope: row.scope, effect: row.effect, by,
    round: game.combat?.round ?? null, combatId: game.combat?.id ?? null, broken
  };
  await _writeEntry(message, tokenUuid, e => {
    if (e.used.some(u => u.id === record.id)) return false;
    e.used.push(record);
    if (record.effect === "critDowngrade") e.critDowngraded = true;
  });
  return { ok: true };
}

/** „Bez reakcji” — zdejmuje ⏳ z celu. */
export async function passReaction(message, tokenUuid) {
  return _writeEntry(message, tokenUuid, e => { e.decided = true; });
}

async function _rollBonus(actor, row, formula) {
  const roll = await new Roll(String(formula)).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${row.label} — TT +${formula}`,
    flags: { [MODULE_ID]: { obronaRzut: row.id } }
  });
  return roll;
}

/* -------------------------------------------- */
/*  Kliknięcia                                   */
/* -------------------------------------------- */

async function _onClick(event) {
  const btn = event.target?.closest?.("[data-neuro-obrona]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const message = game.messages.get(btn.closest("[data-message-id]")?.dataset.messageId);
  if (!message) return;
  const action = btn.dataset.neuroObrona;
  if (action === "set-targets") return setTargets(message);

  const tokenUuid = btn.dataset.token;
  const entry = obronaOf(message)?.targets.find(t => t.tokenUuid === tokenUuid);
  const actor = entry ? fromUuidSync(entry.actorUuid) : null;
  if (!actor) return;
  if (!game.user.isGM && !actor.isOwner) return ui.notifications.warn("Reakcję wybiera właściciel celu albo MG.");
  if (!game.users.activeGM) return ui.notifications.warn("Reakcje rozstrzyga MG — nie ma aktywnego MG.");
  // Karta przerysuje się po zapisie MG; gdyby prośbę odrzucono, przycisk wraca sam.
  btn.disabled = true;
  setTimeout(() => { if (btn.isConnected) btn.disabled = false; }, 5000);

  if (action === "pass") {
    if (game.user.isGM) return passReaction(message, tokenUuid);
    return actor.setFlag(MODULE_ID, PROSBA_FLAG, { messageId: message.id, tokenUuid, pass: true, nonce: foundry.utils.randomID() });
  }

  if (action === "react") {
    const reactionId = btn.dataset.reaction;
    if (game.user.isGM) {
      const res = await executeReaction(message, tokenUuid, reactionId);
      if (!res.ok) ui.notifications.warn(`Reakcja odrzucona: ${res.reason}.`);
      return;
    }
    // Gracz rzuca swoje kości u siebie (Dice So Nice), resztę wykonuje MG.
    const row = reactionRowsFor(actor).find(r => r.id === reactionId);
    let roll = null;
    if (row && row.effect === "tt") {
      const bonus = row.bonus(defenseSnapshot(actor));
      if (isDiceBonus(bonus)) roll = (await _rollBonus(actor, row, bonus)).total;
    }
    await actor.setFlag(MODULE_ID, PROSBA_FLAG, {
      messageId: message.id, tokenUuid, reactionId, roll, by: game.user.id, nonce: foundry.utils.randomID()
    });
  }
}

/**
 * Czy prośba gracza w ogóle dotyczy jego celu na żywej karcie. `null` — w porządku; reszta
 * (czy reakcja nadal pasuje) to już `executeReaction`.
 * @returns {string|null}  Powód odrzucenia.
 */
export function requestProblem(message, actor, req) {
  const entry = obronaOf(message)?.targets?.find(t => t.tokenUuid === req?.tokenUuid);
  if (!entry) return "karta albo cel już nie istnieje";
  if (entry.actorUuid !== actor?.uuid) return "to nie twój cel";
  return null;
}

/** Prośba gracza — u aktywnego MG. */
async function _onUpdateActor(actor, changes) {
  if (!game.users.activeGM?.isSelf) return;
  const req = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${PROSBA_FLAG}`);
  if (!req?.nonce) return;
  try {
    const message = game.messages.get(req.messageId);
    const problem = requestProblem(message, actor, req);
    let res;
    if (problem) res = { ok: false, reason: problem };
    else if (req.pass) res = { ok: await passReaction(message, req.tokenUuid) };
    else res = await executeReaction(message, req.tokenUuid, req.reactionId, { roll: req.roll, by: req.by });
    if (!res.ok && res.reason) {
      await ChatMessage.create({
        content: `<p><strong>Reakcja odrzucona</strong> (${esc(actor.name)}): ${esc(res.reason)}.</p>`,
        whisper: [req.by ?? game.user.id].filter(Boolean),
        speaker: { alias: "Reakcje celu" }
      });
    }
  } finally {
    await actor.unsetFlag(MODULE_ID, PROSBA_FLAG);
  }
}

/* -------------------------------------------- */
/*  Ustaw cel (§4.8.6)                           */
/* -------------------------------------------- */

/** MG: cele karty z bieżących celów MG (albo zaznaczonych żetonów). Podmienia źle wycelowane. */
export async function setTargets(message) {
  if (!game.user.isGM) return;
  const tokens = game.user.targets.size ? [...game.user.targets] : [...(canvas.tokens?.controlled ?? [])];
  if (!tokens.length) return ui.notifications.warn("Wyceluj albo zaznacz żeton celu, potem „Ustaw cel”.");
  const roll = message.rolls?.[0];
  const activity = fromUuidSync(message.flags?.dnd5e?.activity?.uuid ?? "");
  const obrona = foundry.utils.deepClone(obronaOf(message)) ?? buildObrona(roll, activity);
  const attacker = fromUuidSync(obrona.attackerUuid ?? "") ?? activity?.actor ?? null;
  const cover = tokens.length === 1 ? coverAcBonus(roll?.options?.neuroCover) : 0;
  obrona.targets = tokens.map(t => buildTargetEntry(t, { obrona, attacker, cover }));
  await message.update({ [`flags.${MODULE_ID}.${OBRONA_FLAG}`]: obrona });
}

/* -------------------------------------------- */
/*  Krytyczna ochrona → rzut obrażeń bez krytyka */
/* -------------------------------------------- */

/**
 * Czy rzut obrażeń z tej karty ma wyjść bez krytyka: krytyk, a każdy trafiony cel zamienił go
 * Krytyczną ochroną. Przy kilku celach z różnym wynikiem rzut zostaje krytyczny — karta mówi MG,
 * komu nałożyć zwykłe obrażenia (§4.9).
 */
export function shouldDowngradeCrit(obrona) {
  if (!obrona?.krytyk) return false;
  const hits = (obrona.targets ?? []).filter(t => t.verdict !== "pudło");
  return hits.length > 0 && hits.every(t => t.critDowngraded);
}

/** `dnd5e.preRollDamage`: rzut z karty, której trafiony cel zamienił krytyk (P9). */
function _onPreRollDamage(config, dialog) {
  const messageId = config?.event?.target?.closest?.("[data-message-id]")?.dataset?.messageId;
  const obrona = obronaOf(attackMessageFor(messageId ? game.messages.get(messageId) : null));
  if (!shouldDowngradeCrit(obrona)) return;
  config.isCritical = false;
  for (const r of config.rolls ?? []) { r.options ??= {}; r.options.isCritical = false; }
  dialog.options ??= {};
  dialog.options.defaultButton = "normal";
}

/* -------------------------------------------- */
/*  Render                                       */
/* -------------------------------------------- */

const VERDICT_LABEL = { "pudło": "pudło", "trafienie": "trafienie", "krytyk": "trafienie krytyczne" };

function _bonusText(row, s) {
  if (row.effect !== "tt") return "";
  const b = row.bonus(s);
  return Number.isFinite(Number(b)) ? ` +${b}` : ` +${String(b).replace(/d/i, "k")}`;
}

/** Reakcje celu użyte w tej rundzie na innych kartach (P8 — tylko informacja). */
function _usedThisRound(tokenUuid, exceptId) {
  const combat = game.combat;
  if (!combat?.started) return [];
  const out = [];
  for (const m of game.messages.contents.slice(-80)) {
    if (m.id === exceptId) continue;
    const e = obronaOf(m)?.targets?.find(t => t.tokenUuid === tokenUuid);
    for (const u of e?.used ?? []) if (u.combatId === combat.id && u.round === combat.round) out.push(u.label);
  }
  return out;
}

function _targetBlock(message, obrona, entry, visibility) {
  const actor = fromUuidSync(entry.actorUuid);
  const gm = game.user.isGM;
  const owner = !!actor?.isOwner && !gm;
  const canAct = gm || owner;
  const seeVerdict = gm || owner || visibility !== "none";
  const seeNumbers = gm || owner || visibility === "all";
  const isPC = actor?.type === "character" || !!actor?.hasPlayerOwner;
  const ctx = attackCtx(obrona, entry);

  const div = document.createElement("div");
  div.className = "neuro-obrona-target";
  div.dataset.token = entry.tokenUuid;

  const after = entry.used.length && ctx.verdict === "pudło" ? " po reakcji" : "";
  const numbers = seeNumbers && Number.isFinite(ctx.target) ? ` (${obrona.total} vs TT ${ctx.target})` : "";
  const verdict = seeVerdict
    ? `<span class="neuro-obrona-verdict is-${ctx.verdict === "pudło" ? "miss" : "hit"}">${VERDICT_LABEL[ctx.verdict]}${after}${numbers}</span>`
    : "";
  div.innerHTML = `<div class="neuro-obrona-head"><strong>${esc(entry.name)}</strong>${verdict ? ` — ${verdict}` : ""}</div>`;

  for (const u of entry.used) {
    const line = document.createElement("div");
    line.className = "neuro-obrona-used";
    const val = u.effect === "critDowngrade"
      ? ` — zwykłe obrażenia zamiast krytycznych${u.broken ? `; ${esc(u.broken)} zniszczony` : ""}`
      : ` +${u.bonus}${u.roll != null ? ` (rzut)` : ""}`;
    line.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${esc(u.label)}${val}`;
    div.append(line);
  }

  // Reakcje BN poznają gracze tylko z tego, co już użyte — dostępne zna MG.
  if (!actor || (!gm && !isPC)) return div;

  const s = defenseSnapshot(actor);
  const buttons = document.createElement("div");
  buttons.className = "neuro-obrona-buttons";
  let anyActive = false;
  for (const row of reactionRowsFor(actor)) {
    const st = reactionState(row, s, ctx);
    if (st.state === "hidden" || st.state === "used") continue;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "neuro-obrona-btn";
    b.dataset.neuroObrona = "react";
    b.dataset.token = entry.tokenUuid;
    b.dataset.reaction = row.id;
    b.innerHTML = `<i class="fa-solid ${row.effect === "critDowngrade" ? "fa-helmet-safety" : "fa-shield"}"></i> ${esc(row.label)}${esc(_bonusText(row, s))}`;
    const reason = st.state === "disabled" ? st.reason : (!canAct ? "tylko właściciel celu albo MG" : st.note);
    if (st.state !== "active" || !canAct) b.disabled = true;
    if (reason) b.dataset.tooltip = reason;
    if (st.state === "active") anyActive = true;
    buttons.append(b);
  }
  if (canAct && anyActive && !entry.decided) {
    const pass = document.createElement("button");
    pass.type = "button";
    pass.className = "neuro-obrona-btn is-pass";
    pass.dataset.neuroObrona = "pass";
    pass.dataset.token = entry.tokenUuid;
    pass.innerHTML = `<i class="fa-solid fa-forward"></i> Bez reakcji`;
    buttons.append(pass);
  }
  if (buttons.childElementCount) div.append(buttons);

  if (gm) {
    const reminders = npcReactionReminders(actor);
    if (reminders.length) {
      const r = document.createElement("div");
      r.className = "neuro-obrona-note";
      r.innerHTML = `Reakcja BN (bez automatyki): ` + reminders.map(i =>
        `<span class="neuro-obrona-reminder" data-tooltip="${esc(
          (i.system?.description?.value ?? "").replace(/<[^>]+>/g, " ").trim().slice(0, 400))}">${esc(i.name)}</span>`).join(", ");
      div.append(r);
    }
  }

  const earlier = _usedThisRound(entry.tokenUuid, message.id);
  if (earlier.length) {
    const n = document.createElement("div");
    n.className = "neuro-obrona-note";
    n.textContent = `Reakcja w tej rundzie już użyta: ${earlier.join(", ")}.`;
    div.append(n);
  }
  return div;
}

function _renderReactions(message, html, obrona) {
  const root = html.querySelector(".message-content");
  if (!root) return;
  const section = document.createElement("section");
  section.className = "neuro-obrona";

  if (message.flags?.[MODULE_ID]?.rerolled) {
    section.innerHTML = `<div class="neuro-obrona-note">Zastąpione przerzutem — reakcje na karcie przerzutu.</div>`;
    root.append(section);
    return;
  }
  if (!obrona.targets.length && !game.user.isGM) return;

  section.innerHTML = `<div class="neuro-obrona-title"><i class="fa-solid fa-shield-halved"></i> Reakcje celu</div>`;
  const visibility = game.settings.get("dnd5e", "attackRollVisibility");
  for (const entry of obrona.targets) section.append(_targetBlock(message, obrona, entry, visibility));

  if (game.user.isGM) {
    const set = document.createElement("button");
    set.type = "button";
    set.className = "neuro-obrona-btn is-gm";
    set.dataset.neuroObrona = "set-targets";
    set.dataset.tooltip = "Cele karty z twoich bieżących celów (albo zaznaczonych żetonów)";
    set.innerHTML = `<i class="fa-solid fa-crosshairs"></i> ${obrona.targets.length ? "Podmień cel" : "Ustaw cel"}`;
    section.append(set);
  }
  root.append(section);
}

/** ⏳ przy „Obrażeniach” na karcie użycia (§4.8.8) — informacja, nie blokada. */
function _renderHourglass(message, html) {
  const button = html.querySelector('button[data-action="rollDamage"]');
  if (!button) return;
  const attack = attackMessageFor(message);
  const obrona = obronaOf(attack);
  if (!obrona?.targets?.length) return;
  const visibility = game.settings.get("dnd5e", "attackRollVisibility");
  const names = obrona.targets.filter(t => {
    const actor = fromUuidSync(t.actorUuid);
    const visible = game.user.isGM || actor?.isOwner || visibility !== "none";
    return visible && isWaiting(obrona, t);
  }).map(t => t.name);
  if (!names.length) return;
  const badge = document.createElement("span");
  badge.className = "neuro-obrona-wait";
  badge.dataset.tooltip = "Obrażenia możesz rzucić od razu — reakcja celu może jeszcze zmienić wynik (nic nie jest blokowane).";
  badge.textContent = `⏳ ${names.join(", ")} może zareagować`;
  button.after(badge);
}

function _onRenderMessage(message, html) {
  const obrona = obronaOf(message);
  if (obrona) _renderReactions(message, html, obrona);
  // Karta użycia: w dnd5e 5.3 to podtyp wiadomości (`type: "usage"`), nie flaga.
  else if (message.type === "usage" || message.flags?.dnd5e?.messageType === "usage") _renderHourglass(message, html);
}

/** Karta ataku zmieniona przez MG → odśwież kartę użycia (⏳). */
function _onUpdateMessage(message, changes) {
  if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${OBRONA_FLAG}`)) return;
  const origin = message.getOriginatingMessage?.();
  if (origin && origin !== message) ui.chat?.updateMessage?.(origin);
}

/**
 * Nowa karta ataku: karta użycia (narysowana wcześniej, bez ⏳) rysuje się od nowa; właściciel
 * celu z aktywną reakcją dostaje powiadomienie (§4.8.3).
 */
function _onCreateMessage(message) {
  const obrona = obronaOf(message);
  if (!obrona) return;
  const origin = message.getOriginatingMessage?.();
  if (origin && origin !== message) ui.chat?.updateMessage?.(origin);
  if (game.user.isGM) return;
  if (!obrona.targets?.length || message.flags?.[MODULE_ID]?.rerollOf) return;
  for (const entry of obrona.targets) {
    const actor = fromUuidSync(entry.actorUuid);
    if (!actor?.isOwner) continue;
    const ctx = attackCtx(obrona, entry);
    const s = defenseSnapshot(actor);
    const active = reactionRowsFor(actor).filter(r => reactionState(r, s, ctx).state === "active");
    if (!active.length) continue;
    const who = message.speaker?.alias ?? "Atakujący";
    ui.notifications.info(`${who} → ${entry.name}: ${VERDICT_LABEL[ctx.verdict]}. Możesz zareagować `
      + `(karta ataku w czacie): ${active.map(r => r.label).join(", ")}.`);
  }
}

/* -------------------------------------------- */
/*  Inteligentna obrona z paska / karty postaci  */
/* -------------------------------------------- */

/**
 * Zdolność użyta poza oknem reakcji: zużywa użycie i zakłada ten sam efekt TT (bez karty ataku
 * nie ma czego przeliczać). Natywna aktywność drukowała tylko kartę bez skutku (Z9).
 */
export async function useIntelligentDefence(actor, { card = true } = {}) {
  const row = DEFENSE_REACTIONS.find(r => r.id === "inteligentnaObrona");
  const s = defenseSnapshot(actor);
  const left = s.charges.inteligentnaObrona;
  if (left !== null && left <= 0) return ui.notifications.warn(`${row.label}: brak użyć.`);
  const bonus = _num(row.bonus(s));
  await _spendCharge(actor, row.id);
  await _createTurnEffect(actor, row, bonus);
  if (!card) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-obrona-card"><strong>${esc(row.label)}</strong> — TT +${bonus} do początku twojej następnej tury.</div>`
  });
}

function _onPreUseActivity(activity) {
  const item = activity?.item;
  if (item?.getFlag(MODULE_ID, "abilityId") !== "inteligentna-obrona") return;
  const actor = item.actor;
  if (actor) void useIntelligentDefence(actor);
  return false;
}

/* -------------------------------------------- */

export function registerObrona() {
  Hooks.on("dnd5e.renderChatMessage", _onRenderMessage);
  Hooks.on("updateChatMessage", _onUpdateMessage);
  Hooks.on("createChatMessage", _onCreateMessage);
  Hooks.on("updateActor", _onUpdateActor);
  Hooks.on("dnd5e.preRollDamage", _onPreRollDamage);
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  // Faza capture na `document` — dnd5e łapie kliknięcia w kartach po swojemu (DEV_GUIDE).
  document.addEventListener("click", _onClick, { capture: true });
  console.log(`${MODULE_ID} | Reakcje celu registered`);
}

/** Powierzchnia dla testów Quench (TESTING.md, warstwy 4–5). */
export const __testing = Object.freeze({ requestProblem, shouldDowngradeCrit, attackCtx, defenseSnapshot, reactionRowsFor });

export const obronaApi = Object.freeze({
  snapshot: defenseSnapshot, execute: executeReaction, pass: passReaction, setTargets, breakHelmet,
  useIntelligentDefence
});
