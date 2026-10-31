/**
 * Neuroshima 5e — kości i efekty po trafieniu (PLAN_m7 E5, rodzina R6).
 *
 * Przyciski pod kartą ataku, który trafił jedyny cel — spust wykrywa moduł z werdyktu (`combat/trafienie.mjs`),
 * trybu rzutu i sceny; decyduje gracz (przycisk), jak przy Wściekłym ciosie (`actors/class-resource-dice.mjs`).
 *
 * | Zdolność | Spust | Działanie |
 * |---|---|---|
 * | Bolesny atak (Złodziej 1, s. 91; U16) | raz na turę; broń z ZRC; Ułatwienie w rzucie albo przytomny sojusznik ≤ 1,5 m od celu i bez Utrudnienia | + kości ze skali — osobna karta obrażeń (krytyk podwaja) |
 * | Podstępny atak (Złodziej 3, s. 92; U17) | jak Bolesny atak, zamiast kości | Krwawienie (żywe), Spowolnienie, Oślepienie — wybór w oknie; takie same się nie kumulują |
 * | Mój bóg kule nosi (Kaznodzieja, s. 75) | raz na turę, trafienie bronią palną | + 1k10 |
 * | Skuteczny cios (Najemnik, s. 70) | trafienie wręcz; kość Wściekłego ciosu, jego limit raz w rundzie (RAI: to nadal Wściekły cios) | Odepchnięcie (odepchnij / przewróć), Wytrącenie, Zamaszysty — dodatkowy atak w drugą istotę obok |
 *
 * „Raz na turę” — bramka `tura` na przedmiocie zdolności (każda tura, także cudza — atak w Reakcji). Efekty na celu
 * idą przez przekaźnik MG; Spowolnienie i Oślepienie trwają do końca **następnej** tury atakującego (pseudo-wygasanie
 * dnd5e `sourceEnd` pomija turę nałożenia).
 */

import { obronaOf, verdictOfEntry } from "./trafienie.mjs";
import { zastapionaPrzez } from "./po-rzucie.mjs";
import { isFirearm } from "./grip.mjs";
import { odlegloscKrawedzi } from "./okolicznosci.mjs";
import { bramkaZajetaNa, zajmijBramke, FLAG_USUN_PO_WYGASNIECIU } from "./czas-efektu.mjs";
import { startBleeding } from "./bleeding.mjs";
import { resolveManeuver } from "./melee-maneuvers.mjs";
import { dodatkowyAtak } from "./zdolnosci-akcje.mjs";
import {
  esc, k, przedmiotZdolnosci, koscSkali, gra, sojusznicy, kategoria, nalozEfekt, usunEfekty, flavorKarty, stylPrzycisku, STYL_SZARY
} from "./zdolnosci-wspolne.mjs";
import { alreadyUsedThisRound, markUsedThisRound } from "../actors/class-resource-dice.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { isHitVerdict } from "../config/defense-rules.mjs";
import { STANY_BEZ_AKCJI } from "../config/actions-data.mjs";
import { rollTypeOf } from "../config/chat-message-data.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import {
  bolesnyDozwolony, PODSTEPNE_EFEKTY, spowolnienieMetry, MOJ_BOG_KOSC, zamaszystyDozwolony
} from "../config/zdolnosci-walka.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Efekt Podstępnego ataku na celu: klucz z `PODSTEPNE_EFEKTY` (bez kumulacji — nowy zastępuje stary). */
export const FLAG_PODSTEPNY = "podstepny";
const PROSBA_KRWAWIENIE = "m7.krwawienie";
const KOLOR = "#922b21";
/** Grupy przycisków użyte na tym kliencie: `${messageId}:${grupa}`. */
const _uzyte = new Set();

const _origin = (actor, item) => ({ actor: actor.uuid, ...(item ? { item: item.uuid } : {}) });

/* -------------------------------------------- */
/*  Kontekst trafienia                           */
/* -------------------------------------------- */

/**
 * Karta ataku, który trafił dokładnie jeden cel — `null`, gdy nie (kilka celów, pudło, karta zastąpiona przerzutem,
 * widz nie gra atakującym).
 * @param {ChatMessage} message
 */
export function kontekstTrafienia(message) {
  if (rollTypeOf(message) !== "attack") return null;
  const obrona = obronaOf(message);
  if (obrona?.targets?.length !== 1) return null;
  const wpis = obrona.targets[0];
  const verdict = verdictOfEntry(obrona, wpis).verdict;
  if (!isHitVerdict(verdict)) return null;
  const actor = message.getAssociatedActor?.();
  const bron = message.getAssociatedItem?.();
  if (!actor || bron?.type !== "weapon" || !gra(actor) || zastapionaPrzez(message)) return null;
  const celDoc = wpis.tokenUuid ? fromUuidSync(wpis.tokenUuid) : null;
  const celActor = celDoc?.actor ?? (wpis.actorUuid ? fromUuidSync(wpis.actorUuid) : null);
  if (!celActor) return null;
  return {
    message, obrona, actor, bron, activity: message.getAssociatedActivity?.() ?? null, celDoc, celActor,
    krytyk: verdict === "krytyk", tryb: Number(message.rolls?.[0]?.options?.advantageMode) || 0
  };
}

/** Atak z ZRC: aktywność liczy go z ZRC albo broń finezyjna, a ZRC nie jest słabsza od SIŁ. */
function _zZrc(ctx) {
  const ab = ctx.activity?.ability ?? ctx.bron.system?.ability;
  if (ab === "dex") return true;
  const a = ctx.actor.system.abilities ?? {};
  return !!ctx.bron.system?.properties?.has?.("fin") && (Number(a.dex?.mod) || 0) >= (Number(a.str?.mod) || 0);
}

/** RAW: „nie jest pod wpływem stanu Obezwładnienie” — sam stan (i stany, które go dają), nie liczba PW. */
const _obezwladniony = actor => Object.keys(STANY_BEZ_AKCJI).some(s => actor?.statuses?.has(s)) || !!actor?.statuses?.has("dead");

/** Przytomny sojusznik atakującego ≤ 1,5 m od celu (s. 91) — nazwa albo `null`. */
function _sojusznikObokCelu(ctx) {
  const cel = ctx.celDoc?.object;
  const ja = ctx.actor.getActiveTokens?.()[0];
  if (!cel || !ja) return null;
  const t = (canvas?.tokens?.placeables ?? []).find(x => x !== ja && x !== cel && x.actor && x.actor !== ctx.actor
    && !x.document.hidden && sojusznicy(x, ja) && !_obezwladniony(x.actor) && (odlegloscKrawedzi(x, cel) ?? Infinity) <= 1.5);
  return t?.name ?? null;
}

/** Typ obrażeń broni (pierwszy z części ataku albo bazy) — dla osobnej karty kości. */
function _typObrazen(ctx) {
  const typy = p => (p?.types ? Array.from(p.types) : []);
  return typy(ctx.activity?.damage?.parts?.[0])[0] ?? typy(ctx.bron.system?.damage?.base)[0] ?? "piercing";
}

/* -------------------------------------------- */
/*  Spusty                                       */
/* -------------------------------------------- */

/** Bolesny atak: `{ item, kosci, powod, podstepny }` albo `null`; `powod` — szary przycisk. */
export function bolesny(ctx) {
  const item = przedmiotZdolnosci(ctx.actor, { abilityId: "bolesny-atak" });
  if (!item || !_zZrc(ctx)) return null;
  const obok = ctx.tryb === 1 ? null : _sojusznikObokCelu(ctx);
  if (!bolesnyDozwolony({ tryb: ctx.tryb, sojusznikObok: !!obok })) return null;
  return {
    item, kosci: koscSkali(ctx.actor, "zlodziej.bolesnyAtak", "1d6"), obok,
    podstepny: przedmiotZdolnosci(ctx.actor, { abilityId: "podstepny-atak" }),
    powod: bramkaZajetaNa(item, "bolesny-atak", "tura") ? "już w tej turze" : null
  };
}

export function mojBog(ctx) {
  const item = przedmiotZdolnosci(ctx.actor, { abilityId: "moj-bog-kule-nosi" });
  if (!item || !isFirearm(ctx.bron)) return null;
  return { item, powod: bramkaZajetaNa(item, "moj-bog-kule-nosi", "tura") ? "już w tej turze" : null };
}

export function skuteczny(ctx) {
  const item = przedmiotZdolnosci(ctx.actor, { abilityId: "skuteczny-cios" });
  const wsciekly = przedmiotZdolnosci(ctx.actor, { abilityId: "wsciekly-cios" });
  if (!item || !wsciekly || !ctx.obrona.melee) return null;
  const u = wsciekly.system.uses ?? {};
  const zostalo = Math.max(0, (Number(u.max) || 0) - (Number(u.spent) || 0));
  const powod = !zostalo ? "brak kości Wściekłego ciosu" : alreadyUsedThisRound(wsciekly) ? "Wściekły cios już w tej rundzie" : null;
  return { item, wsciekly, powod };
}

/* -------------------------------------------- */
/*  Działania                                    */
/* -------------------------------------------- */

async function _kartaObrazen(ctx, formula, tytul) {
  const typ = _typObrazen(ctx);
  const roll = new CONFIG.Dice.DamageRoll(formula, ctx.actor.getRollData(), { type: typ, isCritical: ctx.krytyk });
  await roll.evaluate();
  const etykieta = CONFIG.DND5E.damageTypes?.[typ]?.label ?? typ;
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: ctx.actor }),
    flavor: `${tytul} — ${k(formula)} ${etykieta}${ctx.krytyk ? " (krytyk)" : ""} → ${ctx.celDoc?.name ?? ctx.celActor.name}`,
    type: "damage"
  });
  return roll;
}

export async function uzyjBolesnego(ctx) {
  const b = bolesny(ctx);
  if (!b || b.powod) return null;
  await zajmijBramke(b.item, "bolesny-atak");
  return _kartaObrazen(ctx, b.kosci, "🗡 Bolesny atak");
}

export async function uzyjMojegoBoga(ctx) {
  const m = mojBog(ctx);
  if (!m || m.powod) return null;
  await zajmijBramke(m.item, "moj-bog-kule-nosi");
  return _kartaObrazen(ctx, MOJ_BOG_KOSC, "✝ Mój bóg kule nosi");
}

/**
 * Podstępny atak: efekt zamiast kości Bolesnego ataku (zużywa jego „raz na turę”).
 * @param {object} ctx       `kontekstTrafienia`
 * @param {"krwawienie"|"spowolnienie"|"oslepienie"} efekt
 */
export async function uzyjPodstepnego(ctx, efekt) {
  const b = bolesny(ctx);
  const def = PODSTEPNE_EFEKTY[efekt];
  if (!b?.podstepny || b.powod || !def) return null;
  const cel = ctx.celActor;
  if (def.zywe && kategoria(cel) === "maszyna") {
    ui.notifications.warn(`${def.label}: ${cel.name} nie jest żywą istotą.`);
    return null;
  }
  await zajmijBramke(b.item, "bolesny-atak");
  const zrodlo = b.podstepny;
  const powod = `Podstępny atak — ${ctx.actor.name}`;
  if (efekt === "krwawienie") {
    if (cel.isOwner) await startBleeding(cel, { reason: powod, profile: "podstepny" });
    else await doMG(PROSBA_KRWAWIENIE, { actorUuid: cel.uuid, reason: powod }, { nosiciel: ctx.actor });
  } else {
    await usunEfekty([cel], FLAG_PODSTEPNY, efekt, { przez: ctx.actor });
    let dane;
    if (efekt === "spowolnienie") {
      const r = await new Roll("1d6").evaluate();
      const m = spowolnienieMetry(r.total);
      await r.toMessage({ speaker: ChatMessage.getSpeaker({ actor: ctx.actor }), flavor: `🐌 Spowolnienie: ${r.total} × 1,5 m = ${m} m` });
      dane = {
        name: `Spowolnienie −${m} m (${ctx.actor.name})`, img: "icons/svg/net.svg",
        system: { origin: _origin(ctx.actor, zrodlo), changes: ["walk", "fly", "swim", "climb", "burrow"]
          .map(t => change(`system.attributes.movement.speeds.${t}`, CHANGE_TYPE.subtract, m)) }
      };
    } else {
      const fx = (await ActiveEffect.implementation.fromStatusEffect("blinded")).toObject();
      delete fx._id;
      // Stan z `fromStatusEffect` nie ma `system.origin` — źródło pseudo-wygasania z rdzeniowego `origin` (E2).
      dane = { ...fx, name: `${fx.name} (${ctx.actor.name})`, system: { ...(fx.system ?? {}), origin: _origin(ctx.actor, zrodlo) } };
    }
    await nalozEfekt(cel, {
      ...dane, origin: zrodlo.uuid, duration: { expiry: "sourceEnd" },
      description: `<p>Podstępny atak (${esc(ctx.actor.name)}): ${esc(def.opis)}.</p>`,
      flags: foundry.utils.mergeObject(dane.flags ?? {}, { [MODULE_ID]: { [FLAG_PODSTEPNY]: efekt, [FLAG_USUN_PO_WYGASNIECIU]: true } })
    }, { przez: ctx.actor });
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ctx.actor }),
    content: flavorKarty(KOLOR, `🩸 Podstępny atak — ${esc(def.label)}`, `${esc(ctx.celDoc?.name ?? cel.name)}: ${esc(def.opis)}.`)
  });
  return efekt;
}

/** Druga istota obok trafionej, w zasięgu twojego ataku wręcz — wycelowany żeton (Zamaszysty cios). */
function _celZamaszystego(ctx) {
  const t = [...(game.user.targets ?? [])];
  const cel = ctx.celDoc?.object;
  const ja = ctx.actor.getActiveTokens?.()[0];
  if (t.length !== 1 || !cel || !ja || t[0] === cel) return null;
  const zasieg = (ctx.bron.system?.properties?.has?.("rch") ? 3 : 1.5);
  return zamaszystyDozwolony({ odCelu: odlegloscKrawedzi(t[0], cel), odAtakujacego: odlegloscKrawedzi(ja, t[0]), zasieg }) ? t[0] : null;
}

/**
 * Skuteczny cios: kość Wściekłego ciosu → Odepchnięcie (odepchnij / przewróć), Wytrącenie albo Zamaszysty cios.
 * @param {object} ctx
 * @param {"odepchnij"|"przewroc"|"wytracenie"|"zamaszysty"} wybor
 */
export async function uzyjSkutecznego(ctx, wybor) {
  const s = skuteczny(ctx);
  if (!s || s.powod) return null;
  if (wybor === "zamaszysty" && !_celZamaszystego(ctx)) {
    ui.notifications.warn("Zamaszysty cios: wyceluj drugą istotę ≤ 1,5 m od trafionej, w zasięgu twojego ataku wręcz.");
    return null;
  }
  const cel = ctx.celDoc?.object;
  if (wybor !== "zamaszysty" && !cel) return null;
  await s.wsciekly.update({ "system.uses.spent": (Number(s.wsciekly.system.uses.spent) || 0) + 1 });
  await markUsedThisRound(s.wsciekly);
  if (wybor === "zamaszysty") {
    return dodatkowyAtak(ctx.actor, ctx.bron, { activity: ctx.activity, zrodlo: "Zamaszysty cios", rodzaj: "zamaszysty", deklaruj: false });
  }
  const ja = ctx.actor.getActiveTokens?.()[0] ?? null;
  await resolveManeuver(ctx.actor, wybor === "wytracenie" ? "wytracenie" : "odepchniecie", {
    targets: [cel], attackerToken: ja, ...(wybor === "odepchnij" ? { effect: "push" } : {})
  });
  return wybor;
}

/* -------------------------------------------- */
/*  Karta                                        */
/* -------------------------------------------- */

function _przycisk(grupa, akcja, label, powod, uzyte, tooltip = "") {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.neuroM7Traf = akcja;
  b.dataset.grupa = grupa;
  b.textContent = label;
  if (tooltip || powod) b.dataset.tooltip = powod ?? tooltip;
  b.disabled = !!powod || uzyte;
  Object.assign(b.style, powod || uzyte ? STYL_SZARY : stylPrzycisku(KOLOR), { flex: "1 1 auto", fontSize: "12px" });
  return b;
}

function _onRenderChatMessage(message, html) {
  if (html.querySelector(".neuro-m7-trafienie")) return;
  const ctx = kontekstTrafienia(message);
  if (!ctx) return;
  const przyciski = [];
  const b = bolesny(ctx);
  if (b) {
    const uz = _uzyte.has(`${message.id}:bolesny`);
    const tip = b.obok ? `sojusznik przy celu: ${b.obok}` : "Ułatwienie w rzucie";
    przyciski.push(_przycisk("bolesny", "bolesny", `🗡 Bolesny atak +${k(b.kosci)}`, b.powod, uz, tip));
    if (b.podstepny) przyciski.push(_przycisk("bolesny", "podstepny", "🩸 Podstępny atak", b.powod, uz, "efekt zamiast kości"));
  }
  const m = mojBog(ctx);
  if (m) przyciski.push(_przycisk("bog", "bog", `✝ Mój bóg kule nosi +${k(MOJ_BOG_KOSC)}`, m.powod, _uzyte.has(`${message.id}:bog`)));
  const s = skuteczny(ctx);
  if (s) przyciski.push(_przycisk("skuteczny", "skuteczny", "💥 Skuteczny cios", s.powod, _uzyte.has(`${message.id}:skuteczny`), "kość Wściekłego ciosu"));
  if (!przyciski.length) return;
  const div = document.createElement("div");
  div.className = "neuro-m7-trafienie";
  div.style.cssText = "display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;";
  for (const p of przyciski) div.appendChild(p);
  (html.querySelector(".message-content") ?? html).appendChild(div);
}

async function _wybierz(tytul, opcje) {
  return foundry.applications.api.DialogV2.wait({
    window: { title: tytul },
    content: `<p>${opcje.map(o => `<strong>${esc(o.label)}</strong> — ${esc(o.opis)}`).join("<br>")}</p>`,
    buttons: opcje.map(o => ({ action: o.id, label: o.label })),
    rejectClose: false
  });
}

async function _onClick(event) {
  const btn = event.target.closest?.("[data-neuro-m7-traf]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const message = game.messages.get(btn.closest("[data-message-id]")?.dataset.messageId);
  const ctx = message ? kontekstTrafienia(message) : null;
  const klucz = `${message?.id}:${btn.dataset.grupa}`;
  if (!ctx || _uzyte.has(klucz)) return;
  const akcja = btn.dataset.neuroM7Traf;
  let wynik = null;
  if (akcja === "bolesny") wynik = await uzyjBolesnego(ctx);
  else if (akcja === "bog") wynik = await uzyjMojegoBoga(ctx);
  else if (akcja === "podstepny") {
    const zywa = kategoria(ctx.celActor) !== "maszyna";
    const efekt = await _wybierz("Podstępny atak", Object.entries(PODSTEPNE_EFEKTY)
      .filter(([, d]) => zywa || !d.zywe).map(([id, d]) => ({ id, label: d.label, opis: d.opis })));
    if (efekt) wynik = await uzyjPodstepnego(ctx, efekt);
  } else if (akcja === "skuteczny") {
    const wybor = await _wybierz("Skuteczny cios — kość Wściekłego ciosu", [
      { id: "odepchnij", label: "Potężny: odepchnij", opis: "Odepchnięcie o 1,5 m (RO celu)" },
      { id: "przewroc", label: "Potężny: przewróć", opis: "Odepchnięcie — Powalenie (RO celu)" },
      { id: "wytracenie", label: "Sprytny: Wytrącenie", opis: "przedmiot wypada celowi z ręki (RO celu)" },
      { id: "zamaszysty", label: "Zamaszysty", opis: "dodatkowy atak wręcz w wycelowaną drugą istotę obok trafionej" }
    ]);
    if (wybor) wynik = await uzyjSkutecznego(ctx, wybor);
  }
  if (!wynik) return;
  _uzyte.add(klucz);
  btn.closest(".neuro-m7-trafienie")?.querySelectorAll(`[data-grupa="${btn.dataset.grupa}"]`)
    .forEach(b => { b.disabled = true; Object.assign(b.style, STYL_SZARY); });
}

export function registerZdolnosciTrafienie() {
  zarejestrujProsbe(PROSBA_KRWAWIENIE, async (_nosiciel, dane) => {
    const a = await fromUuid(dane.actorUuid);
    return a ? startBleeding(a, { reason: dane.reason, profile: "podstepny" }) : null;
  });
  Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
  document.addEventListener("click", _onClick, { capture: true });
  console.log(`${MODULE_ID} | Kości po trafieniu (M7 E5) registered`);
}

/** Powierzchnia dla testów Quench. */
export const __testing = Object.freeze({ _zZrc, _sojusznikObokCelu, _typObrazen, _celZamaszystego });
