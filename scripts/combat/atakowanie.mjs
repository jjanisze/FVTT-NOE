/**
 * Neuroshima 5e — Atakowanie w ledgerze M8 (PLAN_m8_ruch_i_ekonomia_akcji.md §7, E6).
 *
 *   - **Instancja Atakowania** kosztuje jedną A i ma tyle slotów, ile ataków daje zdolność: zwykle 1, Drugi atak 2,
 *     Trzeci atak 3 (s. 59 — nie sumują się; wygrywa wyższy). Kolejny atak we własnej turze kontynuuje otwartą
 *     instancję (D22: inna A w środku jej nie zamyka); po wyczerpaniu slotów — nowa A, także z ujemnym licznikiem.
 *   - **„Sposób ataku”** w istniejącym oknie Testu Ataku: kontynuacja, nowa A, posiadane źródła B pasujące do ataku (z
 *     weryfikacją i konkretnym ostrzeżeniem), R poza własną turą. Domyślny wybór — `domyslneZrodlo`, ten sam w pełnym
 *     oknie i w szybkim rzucie (§7.2). Brak posiadanej zdolności = brak opcji.
 *   - **Zapis kosztu po końcowej konfiguracji, przed oceną rzutu** (§7.5): wąskie opakowanie `D20Roll.buildEvaluate`
 *     dla rzutów ataku — oczekiwany punkt w potoku dnd5e bez kopiowania `rollAttack`. Pusta tablica rzutów (okno
 *     zamknięte, inny hak anulował) nie jest próbą i nic nie kosztuje. Koszt, źródło i ostrzeżenia (ponownie
 *     sprawdzone przy zatwierdzeniu) trafiają do flag wiadomości, zanim powstanie — plakietka na karcie ataku.
 *   - Przycelowanie wybrane w oknie bez wcześniejszego zamiaru dokłada B do tej samej próby (§7.4: A+B, 2B przy
 *     Nożowniku); opłacony wcześniej zamiar nie płaci drugi raz.
 * Fuks i przerzut to rewizja tej samej wiadomości (bez `buildEvaluate` ataku) — nowy wynik niczego nie wydaje.
 */

import * as E from "../config/ekonomia-data.mjs";
import { kombatant, ledger, chwila, zatwierdz, daneAktora } from "./ekonomia.mjs";
import { uzbrojona, uzbroj } from "../actors/actions.mjs";
import { sygnalNaruszenia } from "./sygnal-naruszenia.mjs";
import { isMeleeAttack } from "./trafienie.mjs";
import { PRZYCELOWANIE_OPT } from "../config/zdolnosci-walka.mjs";
import { cardPillList } from "../config/chat-card-dom.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga karty ataku: `{ opcja, label, koszt, ostrz, atak }`. */
export const FLAGA_ATAKU = "atakM8";
const OPT = "neuroAtak";
const POLE = "neuroSposobAtaku";
const DIALOG_PATCH = Symbol("neuro-atakowanie-dialog");
const EVAL_PATCH = Symbol("neuro-atakowanie-eval");
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Sloty i źródła B                             */
/* -------------------------------------------- */

const LICZBY = Object.freeze({ dwa: 2, dwukrotnie: 2, trzy: 3, trzykrotnie: 3, cztery: 4, "pięć": 5 });

/**
 * Ataki w jednej Akcji Atakowania. Postać: Trzeci atak 3, Drugi atak 2 (najwyższy wygrywa, s. 59), inaczej 1. BN z
 * Atakiem wielokrotnym — liczba z opisu („dwa ataki”), sekwencja istoty pozostaje opisem (§7.1); bez liczby — 1.
 * @param {Actor} actor
 */
export function slotyAtaku(actor) {
  const ma = id => actor?.items?.some(i => i.getFlag(MODULE_ID, "abilityId") === id);
  if (ma("trzeci-atak")) return 3;
  if (ma("drugi-atak")) return 2;
  if (actor?.type === "npc") {
    const w = actor.items?.find(i => /atak wielokrotny|wieloatak/i.test(i.name ?? ""));
    const tekst = String(w?.system?.description?.value ?? "").toLowerCase();
    const m = tekst.match(/(?:^|[^\p{L}])(dwa|dwukrotnie|trzy|trzykrotnie|cztery|pięć)(?=[^\p{L}]|$)/u);
    if (m) return LICZBY[m[1]];
    // „jeden atak pazurami i jeden psychiczny krzyk” — tyle ataków, ile wyliczonych „jeden/jedną”.
    const jedne = tekst.match(/(?:^|[^\p{L}])jed(?:en|ną|no)(?=[^\p{L}]|$)/gu)?.length ?? 0;
    if (jedne >= 2) return jedne;
  }
  return 1;
}

/** @type {Map<string, {id: string, label: string, pasuje: (ctx: object) => boolean, weryfikuj: (ctx: object) => {ok: boolean, ostrz?: string[]},
 *   przyZatwierdzeniu?: (ctx: object) => Promise<void>}>} */
const _zrodlaB = new Map();

/**
 * Źródło B ataku (Nożownik, Promocja, Ulubiona broń…): `pasuje(ctx)` — posiadana zdolność i właściwy rodzaj ataku
 * (inaczej opcji nie ma), `weryfikuj(ctx)` — czy warunek spełniony; niespełniony daje wybieralną opcję z ostrzeżeniem.
 * `ctx` = `{actor, item, activity, wrecz, cel}` (`cel` — TokenDocument jedynego celu albo `null`). `przyZatwierdzeniu(ctx)`
 * — skutek wyboru tej próby przed oceną rzutu (Nożownik: krytyk przy trafieniu tego celu).
 */
export function zarejestrujZrodloAtakuB(def) {
  _zrodlaB.set(def.id, def);
}

function _kontekst(activity, attackMode = null) {
  const actor = activity?.actor ?? null;
  const cele = [...(game.user.targets ?? [])];
  return { actor, item: activity?.item ?? null, activity, wrecz: isMeleeAttack(activity, attackMode), cel: cele.length === 1 ? cele[0].document : null };
}

/** Źródła B dla tej próby: tylko pasujące; z wynikiem weryfikacji. */
function _zrodlaBDla(ctx) {
  const out = [];
  for (const d of _zrodlaB.values()) {
    let pasuje = false;
    try { pasuje = !!d.pasuje(ctx); } catch (_e) { pasuje = false; }
    if (!pasuje) continue;
    let w = { ok: false, ostrz: [] };
    try { w = d.weryfikuj?.(ctx) ?? { ok: true }; } catch (err) { w = { ok: false, ostrz: [String(err?.message ?? err)] }; }
    out.push({ id: d.id, label: d.label, zweryfikowane: !!w.ok, ostrz: w.ostrz ?? [] });
  }
  return out;
}

/**
 * Możliwości i domyślny wybór dla aktywności ataku (okno i szybki rzut liczą to samo).
 * @param {Activity} activity
 * @param {{attackMode?: string, jawne?: {opcja: string|null, oplacone?: string|null}|null, dodatkiB?: number}} [o]
 * @returns {{c: Combatant, l: object, ch: object, opcje: object[], domyslna: string, sloty: number, wReakcji: boolean}|null}
 */
export function mozliwosciAtaku(activity, { attackMode = null, jawne = null, dodatkiB = 0 } = {}) {
  const actor = activity?.actor;
  // Broń pojazdu albo drona to akcja strzelca/operatora (M4, M3), nie pula samego nośnika — bez zapisu tutaj.
  if (!["character", "npc"].includes(actor?.type)) return null;
  const c = kombatant(actor);
  if (!c) return null;
  const l = ledger(c);
  const ch = chwila(c, l);
  const sloty = slotyAtaku(actor);
  const wReakcji = uzbrojona(actor);
  const opcje = E.zrodlaAtaku(l, ch, { sloty, wReakcji, zrodlaB: _zrodlaBDla(_kontekst(activity, attackMode)),
    oplacone: jawne?.oplacone ? { label: jawne.oplacone } : null });
  const domyslna = E.domyslneZrodlo(opcje, { jawne: jawne?.opcja ?? null, pule: E.pule(l, ch, daneAktora(actor)), dodatkiB });
  return { c, l, ch, opcje, domyslna, sloty, wReakcji };
}

/** Nazwy dodatkowych ataków z kart użycia (`combat/zdolnosci-akcje.mjs`, `FLAG_DODATKOWY`). */
const NAZWY_DODATKOWYCH = Object.freeze({ "ulubiona-bron": "Ulubiona broń", promocja: "Promocja", nozownik: "Nożownik", zamaszysty: "Zamaszysty cios" });

/**
 * Jawny zamiar z karty, z której rzucono: przycisk B pod kartą ataku → karta użycia z flagą dodatkowego ataku (B przy
 * zapisie ataku, §5.2), aktywność [B] albo zdolność, która już zapłaciła (`dodatkowyOplacony`) — bez drugiego kosztu.
 * @returns {{opcja: string|null, oplacone: string|null}|null}
 */
function _jawneZKarty(config) {
  const id = config?.event?.target?.closest?.("[data-message-id]")?.dataset?.messageId;
  const m = id ? game.messages.get(id) : null;
  const zrodlo = [m, m?.getOriginatingMessage?.()].find(x => x?.getFlag?.(MODULE_ID, "dodatkowyAtak"));
  if (!zrodlo) return config?.[OPT]?.jawne ? { opcja: config[OPT].jawne, oplacone: null } : null;
  const rodzaj = zrodlo.getFlag(MODULE_ID, "dodatkowyAtak");
  if (zrodlo.getFlag(MODULE_ID, "dodatkowyOplacony")) return { opcja: "oplacone", oplacone: NAZWY_DODATKOWYCH[rodzaj] ?? rodzaj };
  return { opcja: `B:${rodzaj}`, oplacone: null };
}

/* -------------------------------------------- */
/*  Okno ataku: pole „Sposób ataku”              */
/* -------------------------------------------- */

function _patchOkna() {
  const AttackDialog = dnd5e?.applications?.dice?.AttackRollConfigurationDialog;
  if (!AttackDialog || AttackDialog.prototype[DIALOG_PATCH]) return;
  AttackDialog.prototype[DIALOG_PATCH] = true;

  const prep = AttackDialog.prototype._prepareConfigurationContext;
  AttackDialog.prototype._prepareConfigurationContext = async function (context, options) {
    context = await prep.call(this, context, options);
    const activity = this.config?.subject;
    const m = activity?.type === "attack" ? mozliwosciAtaku(activity, { attackMode: this.config?.attackMode, jawne: _jawneZKarty(this.config) }) : null;
    this._neuroAtak = m;
    if (!m) return context;
    const opcje = m.opcje.map(o => ({ value: o.id, label: `${o.label}${o.zweryfikowane ? "" : " — ⚠ " + o.ostrz.join("; ")}` }));
    context.fields = [...context.fields, {
      field: new foundry.data.fields.StringField({ label: "Sposób ataku", blank: false, required: true }),
      name: POLE, options: opcje, value: this._neuroAtakWybor ?? m.domyslna
    }];
    return context;
  };

  const build = AttackDialog.prototype._buildConfig;
  AttackDialog.prototype._buildConfig = function (config, formData, index) {
    config = build.call(this, config, formData, index);
    if (!this._neuroAtak || !formData || index !== 0) return config;
    const wybor = formData.get(POLE);
    if (wybor) this._neuroAtakWybor = wybor;
    config.options ??= {};
    config.options[OPT] = { opcja: wybor ?? this._neuroAtak.domyslna, zOkna: true };
    return config;
  };
}

/* -------------------------------------------- */
/*  Zatwierdzenie: po konfiguracji, przed oceną  */
/* -------------------------------------------- */

async function _zatwierdz(rolls, config, message) {
  const activity = config?.subject;
  const actor = activity?.actor;
  if (activity?.type !== "attack" || !actor?.isOwner) return;
  const roll = rolls[0];
  roll.options ??= {};
  if (roll.options[OPT]?.id) return;   // ta sama próba drugi raz (np. ponowne wejście) — bez drugiego kosztu
  const p = roll.options[PRZYCELOWANIE_OPT];
  const dodatkiB = p?.czesc && !p.deklarowane ? 1 : 0;
  const m = mozliwosciAtaku(activity, { attackMode: roll.options.attackMode, jawne: _jawneZKarty(config), dodatkiB });
  if (!m) return;
  // Rewalidacja przy zatwierdzeniu (§7.5): wybór gracza zostaje, gdy nadal jest możliwy; inaczej domyślny + powód.
  const zOkna = roll.options[OPT]?.opcja ?? null;
  const ostrz = [];
  let opcja = zOkna && m.opcje.some(o => o.id === zOkna) ? zOkna : m.domyslna;
  if (zOkna && opcja !== zOkna) ostrz.push(`Wybór z okna („${zOkna}”) nieaktualny przy rzucie — policzono: ${m.opcje.find(o => o.id === opcja)?.label}.`);
  const wybrana = m.opcje.find(o => o.id === opcja);
  if (wybrana && !wybrana.zweryfikowane) ostrz.push(...wybrana.ostrz);
  if (opcja === "R" && m.wReakcji) uzbroj(actor, false);
  if (wybrana?.rodzaj === "B") {
    const def = _zrodlaB.get(opcja.slice(2));
    try { await def?.przyZatwierdzeniu?.(_kontekst(activity, roll.options.attackMode)); } catch (err) { console.warn(`${MODULE_ID} | M8: ${opcja}`, err); }
  }
  const z = E.zadanieAtaku(m.l, m.ch, { opcja, sloty: m.sloty, label: wybrana?.label?.replace(/ \[B\]$/, "").replace(/ — koszt już zapłacony$/, ""), dodatkiB,
    bron: activity.item?.name ?? "" });
  const id = `atak-${foundry.utils.randomID()}`;
  const r = await zatwierdz(m.c, { ...z, id, chwila: m.ch, ostrz: [...(z.ostrz ?? []), ...ostrz] });
  if (p && dodatkiB) p.deklarowane = true;
  const wszystkie = [...new Set([...(r?.ostrz ?? []), ...ostrz])];
  roll.options[OPT] = { id, opcja, zOkna: !!zOkna };
  const dane = { opcja, label: wybrana?.label ?? opcja, koszt: z.koszt, ostrz: wszystkie, atak: r?.op?.atak ?? null, oczekuje: !!r?.oczekuje };
  foundry.utils.setProperty(message, `data.flags.${MODULE_ID}.${FLAGA_ATAKU}`, dane);
  if (wszystkie.length) await sygnalNaruszenia(actor, { tytul: `${actor.name} — ${dane.label}`, linie: wszystkie });
}

function _patchEval() {
  const D20 = CONFIG.Dice?.D20Roll;
  if (!D20 || D20[EVAL_PATCH]) return;
  D20[EVAL_PATCH] = true;
  const orig = D20.buildEvaluate;
  D20.buildEvaluate = async function (rolls, config = {}, message = {}) {
    if (rolls?.length && (config?.hookNames ?? []).includes("attack")) {
      try { await _zatwierdz(rolls, config, message); } catch (err) { console.error(`${MODULE_ID} | M8: zapis ataku`, err); }
    }
    return orig.call(this, rolls, config, message);
  };
}

/* -------------------------------------------- */
/*  Karta ataku: plakietka kosztu                */
/* -------------------------------------------- */

function _koszt(k = {}) {
  const czesci = Object.entries(k).filter(([, n]) => n).map(([r, n]) => (n === 1 ? r : `${n}${r}`));
  return czesci.length ? czesci.join("+") : "bez nowej akcji";
}

function _onRender(message, html) {
  const d = message.getFlag(MODULE_ID, FLAGA_ATAKU);
  if (!d || html.querySelector?.(".neuro-atak-m8")) return;
  const pills = cardPillList(html);
  if (!pills) return;
  const li = document.createElement("li");
  li.className = `pill neuro-atak-m8${d.ostrz?.length ? " maroon" : ""}`;
  const slot = d.atak?.slot ? ` · atak ${d.atak.slot}` : "";
  li.innerHTML = `<i class="fa-solid fa-hand-fist" inert></i> <span class="label">${esc(d.label.replace(/ — .*$/, ""))}${slot} (${esc(_koszt(d.koszt))})</span>`;
  li.dataset.tooltip = [`Koszt tej próby: ${_koszt(d.koszt)}`, ...(d.ostrz ?? [])].map(esc).join("<br>");
  pills.appendChild(li);
}

export function registerAtakowanie() {
  _patchOkna();
  _patchEval();
  Hooks.on("dnd5e.renderChatMessage", _onRender);
}

export const atakowanieApi = Object.freeze({ slotyAtaku, mozliwosciAtaku, zarejestrujZrodloAtakuB });
export const __testing = Object.freeze({ zatwierdz: _zatwierdz, jawneZKarty: _jawneZKarty });
