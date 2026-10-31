/**
 * Neuroshima 5e — wsparcie sojusznika (PLAN_m7 E2, rodzina R7): efekt na innym aktorze.
 *
 * | Zdolność | Działanie | Czas |
 * |---|---|---|
 * | Dobra rada (Spec 1, s. 78) [B] | wybrany sojusznik: znacznik „+mod. INT dającego” — **przycisk po rzucie** pod jego Testem k20, jedno użycie (D11) | do początku następnej tury dającego |
 * | Łaska boża (Kaznodzieja, s. 75) [B] | do poziom-Cwaniaka sojuszników ≤ 18 m: +1k4 do ataków i RO (reguły dnd5e 6, U13) | j.w. |
 * | Let's rock (Gwiazda, s. 74) [A] | Test Występów albo instrumentu → premia z tabeli do ataków **i** RO (D12) wszystkich sojuszników ≤ 27 m | j.w.; kończy się przy Nieprzytomności, Obezwładnieniu, Ogłuchnięciu wykonawcy |
 * | Odważny (Ganger, s. 69) | sojusznicy ≤ 9 m: +1k4 do RO przeciw Przerażeniu — sam przy znanym źródle RO, inaczej przycisk po rzucie przy RO na MDR | — |
 * | Kolejka (Cwaniak 2) | w oknie Krótkiego odpoczynku „Piję Kolejkę”: każda Kość Wytrzymałości + kość Kolejki (U15) | ten odpoczynek |
 * | Kakofonia (Gwiazda, s. 74) [A] | słyszący ≤ 9 m: RO KON ST 8 + CHA + PB, porażka — Obezwładnienie; sojusznicy z Ułatwieniem | do początku następnej tury wykonawcy |
 * | Rzuć broń i gleba (Sędzia, s. 100) [B] | człowiek ≤ 9 m: RO MDR ST 8 + CHA + PB, porażka — upuszcza broń, Powalenie, Przerażenie | Przerażenie do końca następnej tury Sędziego |
 *
 * Czas „do początku / do końca twojej następnej tury” — pseudo-wygasanie dnd5e 6 (`sourceStart` / `sourceEnd`, źródło z
 * `system.origin.actor`; spike E0 c), sprzątanie — flaga `usunPoWygasnieciu` (`combat/czas-efektu.mjs`). Efekt na
 * cudzym aktorze zakłada przekaźnik MG (`combat/zdolnosci-wspolne.mjs`). RO cudzych istot (Kakofonia, Rzuć broń i
 * gleba) rzuca MG przyciskiem karty — jak karty RO właściwości broni; przerzut i dodatek po rzucie przeliczają skutek.
 */

import {
  esc, k, przedmiotZdolnosci, pozostalo, zuzyj, koscSkali, gra, zeton, dystans, sojusznicy, kategoria, zetonyWZasiegu,
  nalozEfekt, usunEfekty, flavorKarty, stylPrzycisku, STYL_SZARY
} from "./zdolnosci-wspolne.mjs";
import { zarejestrujZrodloPoRzucie, rzutZDodatkiem } from "./po-rzucie.mjs";
import { TESTY_K20, przejscie } from "../config/po-rzucie-rules.mjs";
import { zarejestrujUlatwienieTestu } from "./ulatwienia-testow.mjs";
import { zeZrodla } from "../config/ulatwienia-testow.mjs";
import { INSTRUMENTS } from "../config/toolkits-data.mjs";
import { isDollActor, heldItems, drop } from "../actors/doll.mjs";
import { cardButtonHost } from "../config/chat-card-dom.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG_RO = "m7RO";

/** Tabela Let's rock (s. 74): wynik testu → premia. */
export const LETS_ROCK_PROGI = Object.freeze([[25, 5], [20, 4], [15, 3], [10, 2], [5, 1]]);
export function premiaLetsRock(wynik) {
  return LETS_ROCK_PROGI.find(([p]) => Number(wynik) >= p)?.[1] ?? 0;
}

const _origin = (actor, item) => ({ actor: actor.uuid, ...(item ? { item: item.uuid } : {}) });
const _cele = actor => [...(game.user.targets ?? [])].filter(t => t.actor && t.actor !== actor);
const _st = actor => 8 + (Number(actor.system.abilities?.cha?.mod) || 0) + (Number(actor.system.attributes?.prof) || 0);

/* -------------------------------------------- */
/*  Dobra rada (D11)                             */
/* -------------------------------------------- */

function _dobraRadaCel(actor) {
  const cele = _cele(actor);
  if (cele.length !== 1) return { powod: "Dobra rada: wyceluj jednego sojusznika." };
  if (!sojusznicy(zeton(actor) ?? actor, cele[0])) return { powod: `Dobra rada: ${cele[0].name} nie jest sojusznikiem.` };
  return { cel: cele[0] };
}

/** @param {{actor: Actor, name: string}} [cel]  domyślnie — wycelowany żeton */
async function _dobraRada(actor, item, cel = _dobraRadaCel(actor).cel) {
  if (!cel) return;
  const bonus = Number(actor.system.abilities?.int?.mod) || 0;
  await nalozEfekt(cel.actor, {
    name: `Dobra rada (+${bonus}) — ${actor.name}`, img: item.img, origin: actor.uuid,
    duration: { expiry: "sourceStart" },
    system: { origin: _origin(actor, item) },
    description: `<p>Premia +${bonus} do jednego Testu Cechy, Ataku lub RO — przycisk pod rzutem, do początku następnej tury ${esc(actor.name)}.</p>`,
    flags: { [MODULE_ID]: { dobraRada: { bonus, dajacy: actor.name, dajacyUuid: actor.uuid }, usunPoWygasnieciu: true } }
  }, { przez: actor });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>📘 Dobra rada</strong> → <strong>${esc(cel.name)}</strong>: +${bonus} do jednego Testu Cechy, Ataku `
      + `lub RO — przycisk pod jego rzutem, do początku następnej tury ${esc(actor.name)}.</p>`
  });
}

const DOBRA_RADA = {
  id: "dobra-rada", label: "📘 Dobra rada", klasa: "neuro-po-rzucie-dobra-rada", kolejnosc: 25,
  typy: TESTY_K20, styl: stylPrzycisku("#16a085"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    if (!gra(ctx.actor)) return { stan: "ukryty" };
    const e = ctx.actor.effects.find(x => x.getFlag(MODULE_ID, "dobraRada") && !x.duration?.expired);
    if (!e) return { stan: "ukryty" };
    const r = e.getFlag(MODULE_ID, "dobraRada");
    return { stan: "aktywny", etykieta: `${this.label} +${r.bonus} (${r.dajacy})` };
  },
  async wykonaj(ctx) {
    const e = ctx.actor.effects.find(x => x.getFlag(MODULE_ID, "dobraRada") && !x.duration?.expired);
    if (!e) return null;
    const r = e.getFlag(MODULE_ID, "dobraRada");
    const roll = await rzutZDodatkiem(ctx.roll, String(r.bonus));
    return {
      roll, flavor: flavorKarty("#16a085", "📘 DOBRA RADA", `${esc(r.dajacy)}: +${r.bonus}`),
      poWiadomosci: () => e.delete()
    };
  }
};

/* -------------------------------------------- */
/*  Łaska boża i Let's rock — reguły dnd5e 6     */
/* -------------------------------------------- */

/** +X do Testów Ataku i RO (bez RPŚ — rzut przeciw śmierci nie zbiera reguł), do początku następnej tury dającego. */
function _efektPremii({ name, img, actor, item, wartosc, flaga }) {
  return {
    name, img, origin: actor.uuid,
    duration: { expiry: "sourceStart" },
    system: {
      origin: _origin(actor, item),
      changes: [
        { key: "attack", type: "dnd5e.bonus", value: String(wartosc) },
        { key: "save", type: "dnd5e.bonus", value: String(wartosc) }
      ]
    },
    flags: { [MODULE_ID]: { ...flaga, usunPoWygasnieciu: true } }
  };
}

function _laskaCele(actor) {
  const max = Number(actor.classes?.cwaniak?.system?.levels) || 0;
  const cele = _cele(actor).filter(t => sojusznicy(zeton(actor) ?? actor, t));
  if (!cele.length) return { powod: "Łaska boża: wyceluj sojuszników (do 18 m)." };
  const dalej = cele.filter(t => (dystans(actor, t) ?? 0) > 18);
  if (dalej.length) return { powod: `Łaska boża: poza 18 m — ${dalej.map(t => t.name).join(", ")}.` };
  if (max && cele.length > max) return { powod: `Łaska boża: najwyżej ${max} sojuszników (poziomy Cwaniaka).` };
  return { cele };
}

/** @param {{actor: Actor, name: string}[]} [cele]  domyślnie — wycelowane żetony */
async function _laskaBoza(actor, item, cele = _laskaCele(actor).cele) {
  if (!cele) return;
  for (const t of cele) {
    await usunEfekty([t.actor], "laskaBoza", actor.uuid, { przez: actor });
    await nalozEfekt(t.actor, _efektPremii({ name: `Łaska boża (+1k4) — ${actor.name}`, img: item.img, actor, item, wartosc: "1d4", flaga: { laskaBoza: actor.uuid } }), { przez: actor });
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>✝ Łaska boża</strong>: ${cele.map(t => esc(t.name)).join(", ")} — +1k4 do Testów Ataku i RO do początku `
      + `następnej tury ${esc(actor.name)}.</p>`
  });
}

/** Instrumenty, którymi postać umie grać (biegłość), dla wyboru testu Let's rock. */
function _instrumenty(actor) {
  return INSTRUMENTS.filter(i => Number(actor.system.tools?.[i.id]?.value ?? actor.system.tools?.[i.id]?.prof?.multiplier) >= 1);
}

async function _letsRock(actor, item) {
  const instr = _instrumenty(actor);
  let wybor = "wys";
  if (instr.length) {
    wybor = await foundry.applications.api.DialogV2.wait({
      window: { title: "Let's rock — test" },
      content: `<p>Test Występów albo instrumentu muzycznego (s. 74).</p>`,
      buttons: [{ action: "wys", label: "Występy", default: true }, ...instr.map(i => ({ action: i.id, label: i.label }))],
      rejectClose: false
    }) ?? null;
    if (!wybor) return;
  }
  const [roll] = (wybor === "wys"
    ? await actor.rollSkill({ skill: "wys" }, {}, {})
    : await actor.rollToolCheck({ tool: wybor }, {}, {})) ?? [];
  if (!roll) return;
  const premia = premiaLetsRock(roll.total);
  const sojusz = zetonyWZasiegu(actor, 27).filter(t => sojusznicy(zeton(actor) ?? actor, t) && !t.actor.statuses.has("deafened"));
  await usunEfekty(sojusz.map(t => t.actor), "letsRock", actor.uuid, { przez: actor });
  if (premia > 0) {
    for (const t of sojusz) {
      await nalozEfekt(t.actor, _efektPremii({ name: `Let's rock (+${premia}) — ${actor.name}`, img: item.img, actor, item, wartosc: premia, flaga: { letsRock: actor.uuid } }), { przez: actor });
    }
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>🎸 Let's rock</strong> — wynik ${roll.total}: ${premia > 0
      ? `+${premia} do Testów Ataku i RO (D12) do początku następnej tury ${esc(actor.name)}: ${sojusz.map(t => esc(t.name)).join(", ") || "nikt w zasięgu 27 m"}.`
      : "za słabo (poniżej 5) — bez premii."}</p>`
  });
}

/** Wykonawca Let's rock traci przytomność, zostaje Obezwładniony albo ogłuchnie — premia natychmiast się kończy. */
async function _przerwijLetsRock(effect) {
  if (!game.users.activeGM?.isSelf) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor) || !["unconscious", "incapacitated", "deafened"].some(s => effect.statuses?.has(s))) return;
  const aktorzy = (canvas?.tokens?.placeables ?? []).map(t => t.actor).filter(Boolean);
  await usunEfekty(aktorzy, "letsRock", actor.uuid);
}

/* -------------------------------------------- */
/*  Odważny (Ganger)                             */
/* -------------------------------------------- */

/** Ganger z Odważnym ≤ 9 m od aktora (sojusznik, nie on sam). */
function _odwaznyObok(actor) {
  return game.actors.find(a => a.id !== actor.id && przedmiotZdolnosci(a, { abilityId: "odwazny-czy-glupi" })
    && sojusznicy(zeton(a) ?? a, zeton(actor) ?? actor) && (dystans(a, actor) ?? Infinity) <= 9) ?? null;
}

const ODWAZNY = {
  id: "odwazny", label: "🦁 Odważny +1k4", klasa: "neuro-po-rzucie-odwazny", kolejnosc: 115,
  typy: ["save"], styl: stylPrzycisku("#b9770e"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    // Znane źródło RO dostało premię już w oknie (rejestr §3.0.3); przycisk — dla RO na MDR bez źródła.
    if (ctx.info.ability !== "wis" || !gra(ctx.actor)) return { stan: "ukryty" };
    if (ctx.roll.options?.neuroTesty?.premie?.some(p => p.id === "odwazny")) return { stan: "ukryty" };
    const g = _odwaznyObok(ctx.actor);
    return g ? { stan: "aktywny", etykieta: `${this.label} (${g.name})`, powod: "tylko RO przeciw Przerażeniu" } : { stan: "ukryty" };
  },
  async wykonaj(ctx) {
    const g = _odwaznyObok(ctx.actor);
    if (!g) return null;
    const roll = await rzutZDodatkiem(ctx.roll, "1d4");
    return { roll, flavor: flavorKarty("#b9770e", "🦁 ODWAŻNY", `${esc(g.name)}: +1k4 przeciw Przerażeniu`) };
  }
};

/* -------------------------------------------- */
/*  Kolejka (Cwaniak 2) — okno Krótkiego odpoczynku */
/* -------------------------------------------- */

const KOLEJKA_POLE = "neuroKolejka";

/** Cwaniak z Kolejką w drużynie (postacie graczy), z najmocniejszą kością. */
function _kolejkaCwaniak() {
  const z = game.actors.filter(a => a.type === "character" && przedmiotZdolnosci(a, { abilityId: "kolejka" }));
  return z.map(a => ({ actor: a, kosc: koscSkali(a, "cwaniak.kolejka", "1d4") }))
    .sort((a, b) => Number(b.kosc.split("d")[1]) - Number(a.kosc.split("d")[1]))[0] ?? null;
}

/** Krótki odpoczynek: pole „Piję Kolejkę” (pod dnd5e `restTypes.short.dialogClass`, jak „W cieple” w DO). */
export function buildShortRestDialog(Base) {
  return class NeuroshimaShortRestDialog extends Base {
    /** @inheritDoc */
    async _onRender(context, options) {
      await super._onRender(context, options);
      const body = this.element.querySelector(".window-content");
      const actor = this.actor ?? this.document;
      if (!body || this.isPartyGroup || !actor || body.querySelector(".neuro-rest-kolejka")) return;
      const c = _kolejkaCwaniak();
      if (!c) return;
      const div = document.createElement("div");
      div.className = "form-group neuro-rest-kolejka";
      div.innerHTML = `<label class="checkbox"><input type="checkbox" name="${KOLEJKA_POLE}">
        Piję Kolejkę (${esc(c.actor.name)}) — każda Kość Wytrzymałości +${k(c.kosc)} PW</label>`;
      const footer = body.querySelector(".form-footer");
      if (footer) footer.before(div);
      else body.append(div);
    }
  };
}

/** Kość Wytrzymałości w otwartym oknie KO z zaznaczoną Kolejką: + kość Kolejki (`dnd5e.preRollHitDieV2`). */
function _onPreRollHitDie(config) {
  const actor = config?.subject;
  if (!(actor instanceof Actor)) return;
  const okno = [...foundry.applications.instances.values()].find(a => (a.actor ?? a.document) === actor
    && a.element?.querySelector(`input[name="${KOLEJKA_POLE}"]`));
  if (!okno?.element.querySelector(`input[name="${KOLEJKA_POLE}"]`)?.checked) return;
  const c = _kolejkaCwaniak();
  const r0 = config.rolls?.[0];
  if (!c || !r0) return;
  r0.parts = [...(r0.parts ?? []), c.kosc];
  r0.options ??= {};
  r0.options.neuroKolejka = c.actor.name;
}

/* -------------------------------------------- */
/*  Kakofonia i Rzuć broń i gleba — karty RO     */
/* -------------------------------------------- */

async function _kartaRO({ actor, item, rodzaj, ability, st, cele, tytul, opis }) {
  const lista = cele.map(t => `<li>${esc(t.name)}${t.sojusznik ? " <em>(sojusznik: Ułatwienie)</em>" : ""}</li>`).join("");
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-m7-ro"><p><strong>${tytul}</strong> — RO na ${CONFIG.DND5E.abilities[ability]?.label ?? ability} `
      + `ST ${st}. ${opis}</p><ul>${lista || "<li>nikt w zasięgu</li>"}</ul></div>`,
    flags: { [MODULE_ID]: { m7Karta: { rodzaj, ability, st, zrodloUuid: actor.uuid, itemUuid: item?.uuid ?? null,
      cele: cele.map(t => ({ tokenUuid: t.document.uuid, name: t.name, sojusznik: !!t.sojusznik })) } } }
  });
}

async function _kakofonia(actor, item) {
  const ja = zeton(actor);
  const cele = zetonyWZasiegu(actor, 9).filter(t => !t.actor.statuses.has("deafened"))
    .map(t => ({ document: t.document, name: t.name, sojusznik: ja ? sojusznicy(ja, t) : false }));
  await _kartaRO({ actor, item, rodzaj: "kakofonia", ability: "con", st: _st(actor), cele, tytul: "🎤 Kakofonia",
    opis: "Porażka — Obezwładnienie do początku następnej tury wykonawcy; sojusznicy z Ułatwieniem (s. 74)." });
}

function _rzucBronCel(actor) {
  const cele = _cele(actor);
  if (cele.length !== 1) return { powod: "Rzuć broń i gleba: wyceluj jednego człowieka (do 9 m)." };
  const t = cele[0];
  if (kategoria(t.actor) !== "czlowiek") return { powod: `Rzuć broń i gleba: ${t.name} nie jest człowiekiem.` };
  if ((dystans(actor, t) ?? 0) > 9) return { powod: `Rzuć broń i gleba: ${t.name} jest dalej niż 9 m.` };
  return { cel: t };
}

async function _rzucBron(actor, item) {
  const { cel } = _rzucBronCel(actor);
  if (!cel) return;
  await _kartaRO({ actor, item, rodzaj: "rzuc-bron", ability: "wis", st: _st(actor), cele: [cel], tytul: "👮 Rzuć broń i gleba!",
    opis: "Porażka — upuszcza broń, kładzie się (Powalenie) i jest Przerażony do końca następnej tury Sędziego." });
}

/** Skutek porażki RO z karty M7. */
async function _skutekPorazki(actor, f) {
  const zrodlo = await fromUuid(f.zrodloUuid);
  if (f.rodzaj === "kakofonia") {
    const fx = (await ActiveEffect.implementation.fromStatusEffect("incapacitated")).toObject();
    delete fx._id;
    // Stan z `fromStatusEffect` to typ „condition” bez `system.origin` — źródło pseudo-wygasania z rdzeniowego `origin`.
    Object.assign(fx, { origin: zrodlo?.uuid ?? null, duration: { expiry: "sourceStart" }, system: { ...(fx.system ?? {}), origin: _origin(zrodlo) } });
    fx.flags = foundry.utils.mergeObject(fx.flags ?? {}, { [MODULE_ID]: { m7Skutek: `kakofonia:${f.zrodloUuid}`, usunPoWygasnieciu: true } });
    await actor.createEmbeddedDocuments("ActiveEffect", [fx]);
  } else if (f.rodzaj === "rzuc-bron") {
    if (isDollActor(actor)) {
      for (const h of heldItems(actor).filter(x => x.item?.type === "weapon")) {
        await drop(actor, h.item, { from: h.slot, involuntary: true, reason: "Rzuć broń i gleba!" });
      }
    }
    await actor.toggleStatusEffect("prone", { active: true });
    const fx = (await ActiveEffect.implementation.fromStatusEffect("frightened")).toObject();
    delete fx._id;
    Object.assign(fx, { origin: zrodlo?.uuid ?? null, duration: { expiry: "sourceEnd" }, system: { ...(fx.system ?? {}), origin: _origin(zrodlo) } });
    fx.flags = foundry.utils.mergeObject(fx.flags ?? {}, { [MODULE_ID]: { m7Skutek: `rzuc-bron:${f.zrodloUuid}`, usunPoWygasnieciu: true } });
    await actor.createEmbeddedDocuments("ActiveEffect", [fx]);
  }
}

/** Zdany po zmianie wyniku: zdejmij skutek (broni z ziemi moduł nie podnosi — to robi gracz). */
async function _cofnijSkutek(actor, f) {
  const ids = actor.effects.filter(e => e.getFlag(MODULE_ID, "m7Skutek") === `${f.rodzaj}:${f.zrodloUuid}`).map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  if (f.rodzaj === "rzuc-bron") await actor.toggleStatusEffect("prone", { active: false });
}

/** MG: RO wszystkich celów karty. */
async function _rzucRO(message) {
  const k0 = message.flags?.[MODULE_ID]?.m7Karta;
  if (!k0 || !game.user.isGM) return;
  const wyniki = [];
  for (const c of k0.cele) {
    const tok = fromUuidSync(c.tokenUuid);
    const actor = tok?.actor;
    if (!actor) continue;
    const kontekst = k0.rodzaj === "rzuc-bron" ? ["przerazenie"] : [];
    const [roll] = (await actor.rollSavingThrow(
      { ability: k0.ability, target: k0.st, advantage: !!c.sojusznik, neuroKontekst: kontekst },
      { configure: false },
      { create: true, data: { speaker: ChatMessage.getSpeaker({ actor, token: tok }), flags: { [MODULE_ID]: { [FLAG_RO]: { rodzaj: k0.rodzaj, st: k0.st, zrodloUuid: k0.zrodloUuid } } } } }
    )) ?? [];
    if (!roll) continue;
    const zdany = roll.total >= k0.st;
    if (!zdany) await _skutekPorazki(actor, k0);
    wyniki.push(`${esc(c.name)}: ${roll.total} — ${zdany ? "zdany" : "oblany"}`);
  }
  await message.update({ [`flags.${MODULE_ID}.m7Karta.rzucone`]: true });
  if (wyniki.length) await ChatMessage.create({ content: `<p>${wyniki.join("<br>")}</p>`, speaker: message.speaker });
}

/** RO z karty M7 zmieniony po rzucie (Fuks, Twardość, Spieprzysz to!…) — skutek w obie strony. */
async function _onRollModified({ message, roll, przed, actor }) {
  const f = message?.flags?.[MODULE_ID]?.[FLAG_RO];
  if (!f || !roll || !actor?.isOwner) return;
  const zmiana = przejscie(przed ?? message.rolls?.[0]?.total ?? 0, roll.total, f.st);
  if (zmiana === "naSukces") await _cofnijSkutek(actor, f);
  else if (zmiana === "naPorazke") await _skutekPorazki(actor, f);
}

function _onRenderMessage(message, html) {
  const k0 = message.flags?.[MODULE_ID]?.m7Karta;
  if (!k0 || !game.user.isGM || k0.rzucone || html.querySelector(".neuro-m7-ro-btn")) return;
  const host = cardButtonHost(html);
  if (!host) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "neuro-m7-ro-btn";
  b.dataset.neuroM7Ro = message.id;
  b.innerHTML = `<i class="fa-solid fa-dice-d20"></i> MG: rzuć RO (${k0.cele.length})`;
  host.append(b);
}

async function _onClick(event) {
  const btn = event.target?.closest?.("[data-neuro-m7-ro]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  btn.disabled = true;
  const message = game.messages.get(btn.dataset.neuroM7Ro);
  if (message) await _rzucRO(message);
}

/* -------------------------------------------- */
/*  Aktywności                                   */
/* -------------------------------------------- */

const WALIDACJA = { "dobra-rada": _dobraRadaCel, "laska-boza": _laskaCele, "rzuc-bron-i-gleba": _rzucBronCel };
const DZIALANIE = {
  "dobra-rada": _dobraRada, "laska-boza": _laskaBoza, "lets-rock": _letsRock, "kakofonia": _kakofonia,
  "rzuc-bron-i-gleba": _rzucBron
};

function _onPreUseActivity(activity) {
  const id = activity?.item?.getFlag(MODULE_ID, "abilityId");
  const w = WALIDACJA[id];
  if (!w || !activity.actor) return;
  const r = w(activity.actor);
  if (r.powod) {
    ui.notifications.warn(r.powod);
    return false;
  }
}

function _onPostUseActivity(activity) {
  const id = activity?.item?.getFlag(MODULE_ID, "abilityId");
  const fn = DZIALANIE[id];
  if (fn && activity.actor) void fn(activity.actor, activity.item);
}

export function registerZdolnosciWsparcie() {
  zarejestrujZrodloPoRzucie(DOBRA_RADA);
  zarejestrujZrodloPoRzucie(ODWAZNY);
  zarejestrujUlatwienieTestu({
    id: "odwazny", label: "Odważny", rzut: ["save:*"], rodzaj: "premia", wartosc: "1d4",
    ma: actor => !!_odwaznyObok(actor), gdy: ctx => zeZrodla(ctx, "przerazenie")
  });
  const rest = CONFIG.DND5E?.restTypes?.short;
  if (rest?.dialogClass) rest.dialogClass = buildShortRestDialog(rest.dialogClass);
  Hooks.on("dnd5e.preRollHitDieV2", _onPreRollHitDie);
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("createActiveEffect", _przerwijLetsRock);
  Hooks.on("neuroshima.rollModified", _onRollModified);
  Hooks.on("dnd5e.renderChatMessage", _onRenderMessage);
  document.addEventListener("click", _onClick, { capture: true });
  console.log(`${MODULE_ID} | Wsparcie sojusznika (M7 E2) registered`);
}

/** Powierzchnia dla testów Quench. */
export const __testing = Object.freeze({ premiaLetsRock, _efektPremii, _dobraRada, _laskaBoza, _rzucRO, _skutekPorazki, _odwaznyObok, _onPreRollHitDie, DOBRA_RADA });
