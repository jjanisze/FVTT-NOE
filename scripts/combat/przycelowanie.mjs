/**
 * Neuroshima 5e — Przycelowanie (Twardziel 2, s. 87; Sztuczka, s. 106; PLAN_m7 E6, rodzina R8, U21).
 *
 * Akcja Bonusowa przed atakiem: wycelowanie w część ciała żywej istoty albo element maszyny. TT celu rośnie o premię
 * części, a trafienie nakłada skutek z tabeli (`config/zdolnosci-walka.mjs` — `PRZYCELOWANIE`, dane RAW).
 *
 * Trzy wejścia, jeden zapis:
 *   - **aktywność [B] Twardziela** (pasek skrótów) — okno wyboru części dla jedynego wycelowanego żetonu, zamiar na
 *     atakującym; Akcję Bonusową zaznacza warstwa akcji (`actors/actions.mjs`) przy użyciu aktywności;
 *   - **okno ataku** — pole „Celuję w…” (każdy z Przycelowaniem: Twardziel i Sztuczka), z zamiarem jako domyślnym;
 *     wybór bez wcześniejszego zamiaru zaznacza Akcję Bonusową przy rzucie;
 *   - **API** `game.neuroshima.przycelowanie.wyceluj(actor, czesc)` — makra i e2e (rzut bez okna bierze zamiar).
 * Zamiar dotyczy jednego żetonu i tej samej tury; pierwszy rzut ataku go zużywa.
 *
 * Rzut niesie `roll.options.neuroPrzycelowanie`; rozstrzygacz (`combat/trafienie.mjs`) zapisuje część na wpisie celu,
 * dolicza jej TT i przy „głowie” daje automatyczne Trafienie Krytyczne — krytyczne obrażenia (`combat/obrona.mjs`,
 * `shouldUpgradeCrit`) i Stopień Zranienia przy nakładaniu (`isCriticalHitOn`) idą już same. Pozostałe skutki — przycisk
 * pod kartą ataku, który trafił, jak kości po trafieniu E5 (werdykt może się jeszcze zmienić reakcją):
 *
 * | Część | Skutek | Jak |
 * |---|---|---|
 * | Kończyna górna | upuszczenie broni, tarczy, przedmiotu | ścieżka Wytrącenia bez RO (`wytracPrzedmiot`, lalka) |
 * | Kończyna dolna | Powalenie | stan `prone` (odporność na stan — bez skutku) |
 * | Opona/gąsienica | Szybkość o połowę do naprawy | Efekt Aktywny bez czasu trwania — zdejmuje go naprawa |
 * | Tętnica / układ hydrauliczny | −1k6 PW na początku tury | profil Krwawienia `tetnica` / `hydraulika` (`combat/bleeding.mjs`) |
 *
 * Skutek na cudzym celu wykonuje MG (przekaźnik). „Jednorazowy” znika po zastosowaniu — przycisk gaśnie, a karta
 * zapamiętuje to we fladze (U21).
 */

import { zadeklaruj } from "../actors/actions.mjs";
import { kontekstTrafienia } from "./zdolnosci-trafienie.mjs";
import { startBleeding } from "./bleeding.mjs";
import { wytracPrzedmiot } from "./melee-maneuvers.mjs";
import { esc, przedmiotZdolnosci, kategoria, flavorKarty, stylPrzycisku, STYL_SZARY } from "./zdolnosci-wspolne.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { cardPillList } from "../config/chat-card-dom.mjs";
import { rollTypeOf } from "../config/chat-message-data.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { jestObiektem } from "../config/obiekty-rules.mjs";
import {
  PRZYCELOWANIE, PRZYCELOWANIE_OPT, czesciPrzycelowania, rodzajCeluPrzycelowania
} from "../config/zdolnosci-walka.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Zamiar na atakującym: `{ czesc, tokenUuid, chwila }`. */
export const FLAG_ZAMIAR = "przycelowanie";
/** Flaga karty ataku: skutek Przycelowania już zastosowany. */
export const FLAG_ZASTOSOWANE = "przycelowanieZastosowane";
/** Efekt na celu: `"opona"` (uszkodzona opona/gąsienica). */
export const FLAG_EFEKT = "przycelowanie";
const PROSBA = "m7.przycelowanie";
const DIALOG_PATCH = Symbol("neuro-przycelowanie-dialog");
const KOLOR = "#7d3c98";
const POLE = "neuroPrzycelowanie";
const BRAK = "brak";
const SPEEDS = ["walk", "fly", "swim", "climb", "burrow"];
const SKUTEK_PRZYCISK = {
  upuszczenie: "🎯 Przycelowanie: wytrąć z ręki", powalenie: "🎯 Przycelowanie: powal",
  spowolnienie: "🎯 Przycelowanie: uszkodź", wyciek: "🎯 Przycelowanie: tętnica / hydraulika"
};
/** Karty, na których ten klient już zastosował skutek (zanim flaga dojdzie). */
const _zastosowane = new Set();

/* -------------------------------------------- */
/*  Kto, w co                                    */
/* -------------------------------------------- */

/**
 * Przycelowanie atakującego: przedmiot zdolności Twardziela albo Sztuczki; `pojazdy` — Sztuczka („element maszyny”,
 * także pojazd), Twardziel celuje tylko w maszyny Molocha.
 * @returns {{item: Item, pojazdy: boolean}|null}
 */
export function zrodloPrzycelowania(actor) {
  const twardziel = przedmiotZdolnosci(actor, { abilityId: "przycelowanie" });
  const sztuczka = actor?.items?.find(i => i.getFlag(MODULE_ID, "sztuczka") === "przycelowanie") ?? null;
  return twardziel || sztuczka ? { item: twardziel ?? sztuczka, pojazdy: !!sztuczka } : null;
}

/** Części, w które `actor` może wycelować u `celActor` (puste — nie ma Przycelowania albo nie ma w co celować). */
export function czesciDla(actor, celActor) {
  const z = zrodloPrzycelowania(actor);
  if (!z || !celActor) return [];
  return czesciPrzycelowania(rodzajCeluPrzycelowania({
    kategoria: kategoria(celActor), pojazd: celActor.type === "vehicle", obiekt: jestObiektem(celActor), pojazdy: z.pojazdy
  }));
}

function _jedynyCel() {
  const t = [...(game.user.targets ?? [])];
  return t.length === 1 ? t[0] : null;
}

/** Chwila walki zamiaru — w walce tura, poza nią `null`. */
function _chwila(combat = game.combat) {
  return combat?.started ? { combatId: combat.id, round: combat.round, turn: combat.turn } : null;
}

/** Zamiar wobec tego żetonu z tej samej chwili albo `null`. */
export function zamiar(actor, tokenUuid) {
  const z = actor?.getFlag?.(MODULE_ID, FLAG_ZAMIAR);
  if (!z?.czesc || !tokenUuid || z.tokenUuid !== tokenUuid) return null;
  return JSON.stringify(z.chwila ?? null) === JSON.stringify(_chwila()) ? z : null;
}

/**
 * Wyceluj przed atakiem: zamiar na atakującym dla jedynego wycelowanego żetonu.
 * @param {Actor} actor
 * @param {string} czesc        klucz `PRZYCELOWANIE`
 * @param {{cel?: Token|null, deklaruj?: boolean}} [o]  `deklaruj: false` — Akcję Bonusową zaznaczyła już aktywność
 * @returns {Promise<object|null>} wybrana część albo `null`
 */
export async function wyceluj(actor, czesc, { cel = _jedynyCel(), deklaruj = true } = {}) {
  const d = czesciDla(actor, cel?.actor).find(c => c.id === czesc);
  if (!cel || !d) {
    ui.notifications.warn(cel ? `Przycelowanie: ${cel.name} nie ma takiej części do wycelowania.` : "Przycelowanie: wyceluj (target) jedną istotę.");
    return null;
  }
  if (!actor.isOwner) return null;
  if (deklaruj) await zadeklaruj(actor, "B", { zrodlo: "Przycelowanie" });
  await actor.setFlag(MODULE_ID, FLAG_ZAMIAR, { czesc: d.id, tokenUuid: cel.document.uuid, chwila: _chwila() });
  return d;
}

/* -------------------------------------------- */
/*  Okno ataku                                   */
/* -------------------------------------------- */

function _kontekstOkna(activity) {
  const actor = activity?.actor;
  if (!actor || activity?.item?.type !== "weapon") return null;
  const cel = _jedynyCel();
  const czesci = czesciDla(actor, cel?.actor);
  return czesci.length ? { czesci, zamiar: zamiar(actor, cel.document.uuid) } : null;
}

/** Pole „Celuję w…” w oknie Testu Ataku (wzorzec osłony, `combat/cover.mjs`). */
function _patchOknaAtaku() {
  const AttackDialog = dnd5e?.applications?.dice?.AttackRollConfigurationDialog;
  if (!AttackDialog || AttackDialog.prototype[DIALOG_PATCH]) return;
  AttackDialog.prototype[DIALOG_PATCH] = true;

  const prep = AttackDialog.prototype._prepareConfigurationContext;
  AttackDialog.prototype._prepareConfigurationContext = async function (context, options) {
    context = await prep.call(this, context, options);
    const k = _kontekstOkna(this.config?.subject);
    this._neuroPrzycelowanie = k;
    if (!k) return context;
    const opcje = [{ value: BRAK, label: "— nie celuję —" }, ...k.czesci.map(c => ({ value: c.id, label: `${c.label} (+${c.tt} TT) — ${c.opis}` }))];
    context.fields = [...context.fields, {
      field: new foundry.data.fields.StringField({ label: "Celuję w… (Przycelowanie, Akcja Bonusowa)", blank: false, required: true }),
      name: POLE, options: opcje, value: k.zamiar?.czesc ?? BRAK
    }];
    return context;
  };

  const build = AttackDialog.prototype._buildConfig;
  AttackDialog.prototype._buildConfig = function (config, formData, index) {
    config = build.call(this, config, formData, index);
    if (!this._neuroPrzycelowanie || !formData || index !== 0) return config;
    config.options ??= {};
    config.options[PRZYCELOWANIE_OPT] = { czesc: formData.get(POLE) ?? BRAK, zOkna: true };
    return config;
  };
}

/**
 * `dnd5e.postAttackRollConfiguration` — po oknie albo bez niego: wybór z okna, inaczej zamiar. Zapis w opcjach rzutu
 * dla rozstrzygacza, TT docelowa dnd5e podniesiona o premię części.
 */
function _onPostConfig(rolls, config) {
  const roll = rolls?.[0];
  const actor = config?.subject?.actor;
  if (!roll || !actor || config.subject.item?.type !== "weapon") return;
  const cel = _jedynyCel();
  const tokenUuid = cel?.document?.uuid ?? null;
  const z = zamiar(actor, tokenUuid);
  const zOkna = roll.options[PRZYCELOWANIE_OPT]?.zOkna ? roll.options[PRZYCELOWANIE_OPT].czesc : null;
  const wybor = zOkna ?? z?.czesc ?? null;
  const d = czesciDla(actor, cel?.actor).find(c => c.id === wybor);
  if (!d) {
    delete roll.options[PRZYCELOWANIE_OPT];
    return;
  }
  roll.options[PRZYCELOWANIE_OPT] = {
    // Zamiar z tej tury — Akcja Bonusowa już zaznaczona, także gdy w oknie zmieniono część.
    czesc: d.id, label: d.label, tt: d.tt, skutek: d.skutek, tokenUuid, deklarowane: !!z
  };
  if (Number.isFinite(roll.options.target)) roll.options.target += d.tt;
}

/** `dnd5e.rollAttack` — Akcja Bonusowa, jeśli nikt jej jeszcze nie zaznaczył; zamiar zużyty. */
async function _onRollAttack(rolls, { subject } = {}) {
  const actor = subject?.actor;
  if (!actor?.isOwner) return;
  const p = rolls?.[0]?.options?.[PRZYCELOWANIE_OPT];
  if (p?.czesc && !p.deklarowane) await zadeklaruj(actor, "B", { zrodlo: `Przycelowanie (${p.label})` });
  if (actor.getFlag(MODULE_ID, FLAG_ZAMIAR)) await actor.unsetFlag(MODULE_ID, FLAG_ZAMIAR);
}

/* -------------------------------------------- */
/*  Aktywność [B] Twardziela                     */
/* -------------------------------------------- */

const _toAktywnosc = activity => activity?.item?.getFlag?.(MODULE_ID, "abilityId") === "przycelowanie";

/** Bez jedynego celu z częściami do wycelowania aktywność nie rusza — Akcja Bonusowa nie przepada (synchronicznie). */
function _onPreUseActivity(activity) {
  if (!_toAktywnosc(activity)) return;
  const cel = _jedynyCel();
  if (czesciDla(activity.actor, cel?.actor).length) return;
  ui.notifications.warn(cel ? `Przycelowanie: w ${cel.name} nie ma w co celować.` : "Przycelowanie: wyceluj (target) jedną istotę.");
  return false;
}

async function _onPostUseActivity(activity) {
  if (!_toAktywnosc(activity) || !activity.actor?.isOwner) return;
  const cel = _jedynyCel();
  const czesci = czesciDla(activity.actor, cel?.actor);
  if (!czesci.length) return;
  const czesc = await foundry.applications.api.DialogV2.wait({
    window: { title: `Przycelowanie — ${cel.name}` },
    content: `<p>${czesci.map(c => `<strong>${esc(c.label)}</strong> +${c.tt} TT — ${esc(c.opis)} (${esc(c.trwa)})`).join("<br>")}</p>`,
    buttons: czesci.map(c => ({ action: c.id, label: `${c.label} (+${c.tt})` })),
    rejectClose: false
  });
  if (czesc) await wyceluj(activity.actor, czesc, { cel, deklaruj: false });
}

/* -------------------------------------------- */
/*  Skutek trafienia                             */
/* -------------------------------------------- */

/** Wpis Przycelowania na trafionym celu karty z kontekstu (`kontekstTrafienia`) albo `null`. */
const _wpis = ctx => ctx?.obrona?.targets?.[0]?.przycelowanie ?? null;

export function juzZastosowane(message) {
  return !!message?.getFlag?.(MODULE_ID, FLAG_ZASTOSOWANE) || _zastosowane.has(message?.id);
}

/**
 * Nałóż skutek Przycelowania z karty, która trafiła: właściciel celu od razu, inaczej MG. „Głowa” nie ma przycisku —
 * krytyk siedzi już w werdykcie.
 * @param {object} ctx  `kontekstTrafienia`
 * @returns {Promise<string|null>} skutek albo `null`
 */
export async function zastosujPrzycelowanie(ctx) {
  const p = _wpis(ctx);
  if (!p || p.skutek === "krytyk" || juzZastosowane(ctx.message)) return null;
  _zastosowane.add(ctx.message.id);
  const dane = {
    skutek: p.skutek, label: p.label, kto: ctx.actor.name, actorUuid: ctx.celActor.uuid,
    tokenUuid: ctx.celDoc?.uuid ?? null, zrodlo: zrodloPrzycelowania(ctx.actor)?.item?.uuid ?? null
  };
  if (ctx.celActor.isOwner) await _wykonaj(dane);
  else await doMG(PROSBA, dane, { nosiciel: ctx.actor });
  if (ctx.message.isOwner) await ctx.message.setFlag(MODULE_ID, FLAG_ZASTOSOWANE, p.skutek);
  return p.skutek;
}

const _odporny = (actor, status) => {
  const ci = actor?.system?.traits?.ci?.value;
  return ci instanceof Set ? ci.has(status) : Array.isArray(ci) ? ci.includes(status) : false;
};

/** Wykonanie u właściciela celu albo u MG. */
async function _wykonaj({ skutek, label, kto, actorUuid, tokenUuid, zrodlo }) {
  const actor = await fromUuid(actorUuid);
  if (!actor) return null;
  const token = tokenUuid ? await fromUuid(tokenUuid) : null;
  const say = linia => ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: flavorKarty(KOLOR, `🎯 Przycelowanie — ${esc(label)}`, linia)
  });
  const kogo = esc(token?.name ?? actor.name);

  if (skutek === "powalenie") {
    if (_odporny(actor, "prone")) return say(`${kogo}: odporność na Powalenie — bez skutku.`);
    await actor.toggleStatusEffect("prone", { active: true });
    return say(`${kogo} — <strong>Powalenie</strong> (${esc(kto)}).`);
  }
  if (skutek === "upuszczenie") {
    const { dropped, reason, where } = await wytracPrzedmiot(actor, token?.object ?? token, { powod: "Przycelowanie" });
    return say(dropped
      ? `${kogo} upuszcza <strong>${esc(dropped.name)}</strong>${where === "ground" ? "" : " (bez MG na sesji — do plecaka)"}.`
      : `Przedmiot wypada z ręki — ${esc(reason)}.`);
  }
  if (skutek === "spowolnienie") {
    const stare = actor.effects.filter(e => e.getFlag(MODULE_ID, FLAG_EFEKT) === "opona").map(e => e.id);
    if (stare.length) await actor.deleteEmbeddedDocuments("ActiveEffect", stare);
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: `${label}: Szybkość o połowę`, img: "icons/svg/downgrade.svg", ...(zrodlo ? { origin: zrodlo } : {}),
      description: `<p>Przycelowanie (${esc(kto)}): uszkodzenie trwa do naprawy — usuń ten efekt po naprawie.</p>`,
      system: { changes: SPEEDS.map(t => change(`system.attributes.movement.speeds.${t}`, CHANGE_TYPE.multiply, 0.5)) },
      flags: { [MODULE_ID]: { [FLAG_EFEKT]: "opona" } }
    }]);
    return say(`${kogo}: <strong>Szybkość o połowę</strong> do naprawy uszkodzenia (${esc(kto)}).`);
  }
  if (skutek === "wyciek") {
    const profile = kategoria(actor) === "maszyna" || actor.type === "vehicle" ? "hydraulika" : "tetnica";
    return startBleeding(actor, { reason: `Przycelowanie — ${kto}`, profile });
  }
  return null;
}

/* -------------------------------------------- */
/*  Karta                                        */
/* -------------------------------------------- */

function _onRenderChatMessage(message, html) {
  if (rollTypeOf(message) !== "attack" || html.querySelector(".neuro-m7-przycelowanie")) return;
  const p = message.flags?.[MODULE_ID]?.obrona?.targets?.[0]?.przycelowanie;
  if (!p) return;
  const pills = cardPillList(html);
  if (pills) {
    const pill = document.createElement("li");
    pill.className = "pill neuro-m7-przycelowanie-pill";
    pill.innerHTML = `<i class="fa-solid fa-crosshairs" inert></i> <span class="label">Przycelowanie: ${esc(p.label)} (+${p.tt} TT)</span>`;
    pills.appendChild(pill);
  }
  const ctx = kontekstTrafienia(message);
  if (!ctx || p.skutek === "krytyk") return;
  const uzyte = juzZastosowane(message);
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.neuroM7Przycelowanie = "1";
  b.textContent = SKUTEK_PRZYCISK[p.skutek] ?? "🎯 Przycelowanie";
  b.dataset.tooltip = uzyte ? "już zastosowane" : `${p.label}: ${PRZYCELOWANIE[p.czesc]?.opis ?? ""}`;
  b.disabled = uzyte;
  Object.assign(b.style, uzyte ? STYL_SZARY : stylPrzycisku(KOLOR), { flex: "1 1 auto", fontSize: "12px" });
  const div = document.createElement("div");
  div.className = "neuro-m7-przycelowanie";
  div.style.cssText = "display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;";
  div.appendChild(b);
  (html.querySelector(".message-content") ?? html).appendChild(div);
}

async function _onClick(event) {
  const btn = event.target.closest?.("[data-neuro-m7-przycelowanie]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const message = game.messages.get(btn.closest("[data-message-id]")?.dataset.messageId);
  const ctx = message ? kontekstTrafienia(message) : null;
  if (!ctx || !(await zastosujPrzycelowanie(ctx))) return;
  btn.disabled = true;
  Object.assign(btn.style, STYL_SZARY);
}

/* -------------------------------------------- */

export const przycelowanieApi = Object.freeze({ wyceluj, zamiar, czesciDla, zastosujPrzycelowanie, juzZastosowane });

export function registerPrzycelowanie() {
  _patchOknaAtaku();
  zarejestrujProsbe(PROSBA, async (_nosiciel, dane) => _wykonaj(dane));
  Hooks.on("dnd5e.postAttackRollConfiguration", _onPostConfig);
  Hooks.on("dnd5e.rollAttack", (rolls, data) => { void _onRollAttack(rolls, data); });
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", (activity) => { void _onPostUseActivity(activity); });
  Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
  document.addEventListener("click", _onClick, { capture: true });
  console.log(`${MODULE_ID} | Przycelowanie (M7 E6) registered`);
}
