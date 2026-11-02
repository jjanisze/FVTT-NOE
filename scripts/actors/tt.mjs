/**
 * Neuroshima 5e — Trudność Trafienia postaci na karcie (PLAN_tt.md, Część A, E1).
 *
 * Zasady liczy czysty silnik `config/tt-rules.mjs`; tutaj jest wszystko, co dotyka Foundry:
 *
 *   - **Migawka** postaci dla silnika — pancerz z natywnego wyboru dnd5e, hełm i ręce z lalki
 *     (`actors/doll.mjs`), stany (Berserk, Unikanie), zdolności przez most `hasAbility()`.
 *   - **Dane pochodne.** Owinięcie `prepareDerivedData` aktora (wzorzec `armor-rules.mjs`,
 *     DEV_GUIDE §10c.3). Każda postać dostaje `ac.neuroshima` = wynik silnika i `ac.value` =
 *     metoda + premie + `ac.bonus` (Efekty Aktywne: ochraniacze, Inteligentna obrona, Koci odskok)
 *     + osłona. Tarcza sama TT nie podnosi (katalog), więc `ac.shield` z importu idzie do „nie liczy się”.
 *     Zero zapisów do bazy: Obłęd i Zasłona nie są już Efektami Aktywnymi (P2).
 *   - **Bez ręcznej TT (D17).** Postać nie ma furtki „Stała” / „Naturalna” / „Własna formuła”:
 *     zasady TT są kompletne, a wpisana liczba po cichu wyłączałaby silnik. Strażnik
 *     `preCreateActor` / `preUpdateActor` nie zapisuje ręcznych ustawień, MG przy starcie świata
 *     czyści stare (`oczyscRecznaTT`), okno TT postaci pokazuje rozkład zamiast formularza.
 *     BN, pojazdy i obiekty dalej mają natywne okno dnd5e (TT ze statblocku).
 *   - **Nie założona osłona (D17).** Postać, która ma pancerz, hełm albo ochraniacze, a nie nosi
 *     żadnego z tej rodziny, choć założenie podniosłoby TT (hełm: nie obniżyłoby), ma pomarańczową
 *     tarczę TT z przyciskiem „Napraw” (zakłada przez lalkę), wiersz w dymku i wpis w
 *     `game.neuroshima.tt.audit()`; MG dostaje listę szeptem przy starcie świata.
 *   - **Dymek TT** — owinięcie `Actor5e#_prepareArmorClassAttribution`: tabela w klasach
 *     natywnego `property-attribution` plus sekcja „nie liczy się” z powodem w linii.
 *   - **Okno TT** — „Domyślna” → „NOE (automatycznie)”, metody 5e (Mag, Smocza, Mnich,
 *     Barbarzyńca, Bard) usunięte (D6); zostają dla BN.
 *   - **Efekty do początku następnej tury** (Unikanie; w E3 reakcje) — §4.5, z poprawką: rdzeń
 *     v14 wygasza efekt `turnStart` na początku tury kombatanta zapisanego w `start.combatant`,
 *     a to jest ten, czyja tura trwała przy tworzeniu (`ActiveEffect.getEffectStart`). Reakcja
 *     w turze atakującego wygasałaby więc na początku tury **atakującego**. Dlatego przy
 *     tworzeniu przestawiamy `start.combatant` na właściciela, a czas liczymy w turach
 *     (`turns: 1`) — w rundach efekt właściciela działającego później w tej samej rundzie
 *     dotrwałby o cały obieg za długo. Kasowanie wygasłego jest nasze (DEV_GUIDE §10e.2).
 */

import { computeTT, TT_ABILITY_KEYS, permanentlyLosingMethods, _signed } from "../config/tt-rules.mjs";
import { hasAbility, ABILITY_KEYS } from "./abilities.mjs";
import { heldItems, familyOf, place } from "./doll.mjs";
import { equippedArmor, isProficientIn, registerStealthExemption } from "./armor-rules.mjs";
import { isZaslonaWeapon } from "./samuraj.mjs";
import { weaponIdOf } from "../weapons/magazine-model.mjs";
import { zarejestrujEfektTuryWlasciciela } from "../combat/czas-efektu.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga Efektu Aktywnego TT trwającego do początku tury właściciela (§4.5): `{ source }`. */
export const TT_EFFECT_FLAG = "tt";

/** Statusy, które znaczą Obezwładnienie (dnd5e dokłada `incapacitated` do cięższych stanów). */
const INCAPACITATED = ["incapacitated", "paralyzed", "stunned", "unconscious"];

/** Rodziny lalki ochraniaczy (`actors/doll-model.mjs`). */
const GUARD_FAMILIES = new Set(["armGuards", "legGuards"]);

/** Metody 5e bez odpowiednika w NOE (D6). */
const REMOVED_AC_METHODS = ["mage", "draconic", "unarmoredMonk", "unarmoredBarb", "unarmoredBard"];

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  Migawka                                      */
/* -------------------------------------------- */

/** Czy postać jest w Berserku (stan klasowy z `actors/class-state.mjs`). */
function _inBerserk(actor) {
  return actor.effects.some(e => !e.disabled && e.getFlag(MODULE_ID, "classState") === "neuro-berserk");
}

/** Pancerz korpusu dla silnika; `value` już po wytrzymałości (`production/naprawa.mjs`). */
function _armorOf(actor) {
  return _armorSnap(actor.system?.attributes?.ac?.equippedArmor ?? equippedArmor(actor));
}

function _armorSnap(item) {
  if (!item) return null;
  const value = _num(item.system?.armor?.value);
  const source = _num(item._source?.system?.armor?.value);
  const dex = item.system?.armor?.dex;
  return {
    name: item.name,
    type: item.system?.type?.value,
    value,
    lost: Math.max(0, source - value),
    dexCap: Number.isFinite(dex) ? dex : null
  };
}

/**
 * Migawka postaci dla `computeTT` (`config/tt-rules.mjs`).
 * @param {Actor5e} actor
 * @returns {import("../config/tt-rules.mjs").TTSnapshot}
 */
export function ttSnapshot(actor) {
  const abilities = actor.system?.abilities ?? {};
  const mods = Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"]
    .map(k => [k, _num(abilities[k]?.mod)]));
  const hands = heldItems(actor).filter(h => h.item).map(h => h.item);
  const statuses = actor.statuses ?? new Set();
  const walk = actor.system?.attributes?.movement?.speeds?.walk;
  return {
    mods,
    prof: _num(actor.system?.attributes?.prof),
    armor: _armorOf(actor),
    // Ochraniacze rąk i nóg to pancerz w warunkach zdolności (D4, autor systemu 2026-10-03).
    guards: actor.items.some(i => i.system?.equipped && GUARD_FAMILIES.has(familyOf(i))),
    helmet: actor.items.some(i => i.system?.equipped && familyOf(i) === "helmet"),
    shieldInHand: hands.some(i => i.system?.type?.value === "shield"),
    owned: new Set(TT_ABILITY_KEYS.filter(key => hasAbility(actor, key))),
    states: {
      berserk: _inBerserk(actor),
      dodging: statuses.has("dodging"),
      incapacitated: INCAPACITATED.some(s => statuses.has(s)),
      speed0: Number.isFinite(walk) && walk <= 0
    },
    held: {
      zaslona: hands.some(i => isZaslonaWeapon(i)),
      twoHatchets: hands.filter(i => weaponIdOf(i) === "siekierka").length >= 2
    }
  };
}

/** Wynik silnika: z danych pochodnych (metoda NOE) albo policzony na żądanie (furtka MG). */
export function ttFor(actor) {
  if (actor?.type !== "character") return null;
  return actor.system?.attributes?.ac?.neuroshima ?? computeTT(ttSnapshot(actor));
}

/**
 * Stan jednego źródła TT — do kart, które o nim mówią (Berserk: Obłęd).
 * @returns {{active: boolean, value: number, reason?: string}|null}
 */
export function ttSource(actor, id) {
  const tt = ttFor(actor);
  if (!tt) return null;
  const on = tt.method.id === id ? tt.method : tt.bonuses.find(b => b.id === id);
  if (on) return { active: true, value: on.value };
  const off = tt.rejected.find(r => r.id === id);
  return off ? { active: false, value: off.value ?? 0, reason: off.reason } : null;
}

/* -------------------------------------------- */
/*  Bez ręcznej TT (D17)                         */
/* -------------------------------------------- */

/** dnd5e 6.0's default AC setup (`attributes.ac.calcs` initial). */
const DEFAULT_AC_CALCS = ["unarmored", "armored"];

/**
 * Ręczne ustawienie TT w danych postaci: wartość na sztywno (`override` — 5.3-owe „Stała” migruje w nią), własne
 * formuły albo obliczenia inne niż domyślne dnd5e 6.0 (`calcs`: unarmored + armored; np. „Naturalna”). Patrzy tylko
 * na klucze, które są w `ac` — działa na źródle i na samych zmianach. Źródło, nie dane pochodne: efekty mogą
 * dokładać formuły przy przygotowaniu.
 * @param {object} ac  `system.attributes.ac` ze źródła albo ze zmian
 * @returns {{opis: string, zmiany: object}|null}  co znaleziono (do komunikatu) i czym to zastąpić
 */
export function recznaTT(ac) {
  if (!ac || typeof ac !== "object") return null;
  const opis = [];
  const zmiany = {};
  if (ac.override != null && ac.override !== "" && Number.isFinite(Number(ac.override))) {
    opis.push(`stała ${ac.override}`);
    zmiany.override = null;
  }
  const formulas = [...(ac.formulas ?? [])];
  if (formulas.length) {
    opis.push(`formuła ${formulas.map(f => f.formula ?? f).join(", ")}`);
    zmiany.formulas = [];
  }
  if (ac.calcs != null) {
    const calcs = new Set(ac.calcs);
    if (calcs.size !== DEFAULT_AC_CALCS.length || !DEFAULT_AC_CALCS.every(c => calcs.has(c))) {
      const label = c => game.i18n?.localize(CONFIG.DND5E?.armorClasses?.[c]?.label ?? c) ?? c;
      opis.push(calcs.size ? `obliczenia ${[...calcs].map(label).join(", ")}` : "bez obliczeń");
      zmiany.calcs = [...DEFAULT_AC_CALCS];
    }
  }
  return opis.length ? { opis: opis.join("; "), zmiany } : null;
}

/** Komunikat strażnika — raz na zapis, z tym, czego nie zapisano. */
function _odrzucona(actor, reczna) {
  ui.notifications?.warn(`${actor.name}: TT postaci liczy się z zasad NOE — ręcznego ustawienia nie zapisano (${reczna.opis}). `
    + "Zmieniasz ją Oporządzeniem i zdolnościami.");
}

function _onPreCreateActor(actor, _data, options) {
  if (actor.type !== "character") return;
  const reczna = recznaTT(actor._source.system?.attributes?.ac);
  if (!reczna) return;
  actor.updateSource({ system: { attributes: { ac: reczna.zmiany } } });
  if (!options.neuroQuiet) _odrzucona(actor, reczna);
}

function _onPreUpdateActor(actor, changes) {
  if (actor.type !== "character") return;
  const ac = changes.system?.attributes?.ac;
  const reczna = recznaTT(ac);
  if (!reczna) return;
  Object.assign(ac, reczna.zmiany);
  _odrzucona(actor, reczna);
}

/**
 * Czyści ręczną TT postaci świata i niepowiązanych żetonów (stare dane: furtka D6 sprzed D17, import z Roll20).
 * Idempotentne; MG przy starcie świata.
 * @param {object} [options]
 * @param {boolean} [options.commit]
 * @param {Actor5e[]} [options.actors]  domyślnie postacie świata i niepowiązanych żetonów
 * @returns {Promise<{actor: Actor5e, opis: string}[]>}
 */
export async function oczyscRecznaTT({ commit = true, actors = null } = {}) {
  if (!actors) {
    actors = game.actors.filter(a => a.type === "character");
    for (const scene of game.scenes) {
      for (const t of scene.tokens) if (!t.actorLink && t.actor?.type === "character") actors.push(t.actor);
    }
  }
  const out = [];
  for (const actor of actors) {
    const reczna = recznaTT(actor._source.system?.attributes?.ac);
    if (!reczna) continue;
    out.push({ actor, opis: reczna.opis });
    if (commit) await actor.update({ system: { attributes: { ac: reczna.zmiany } } });
  }
  return out;
}

/* -------------------------------------------- */
/*  Nie założona osłona (D17)                    */
/* -------------------------------------------- */

/** Rodziny lalki, które noszone podnoszą TT albo chronią głowę — w kolejności wierszy dymka. */
const OSLONY = ["bodyArmor", "helmet", "armGuards", "legGuards"];

/** TT z Efektów Aktywnych przedmiotu (ochraniacze: +1 na `ac.bonus`, działa, gdy założony). */
function _premiaPrzedmiotu(item) {
  let sum = 0;
  for (const e of item.effects ?? []) {
    for (const c of e.system?.changes ?? e.changes ?? []) {
      if (c.key === "system.attributes.ac.bonus") sum += _num(c.value);
    }
  }
  return sum;
}

/**
 * Osłona, którą postać ma, a nie nosi niczego z jej rodziny, choć powinna: pancerz i ochraniacze — założenie
 * podniosłoby TT; hełm — nie obniżyłby jej (daje Krytyczną ochronę; Goła klata gaśnie w hełmie, więc Brutalowi
 * hełmu nie podsuwamy). Tylko sprzęt, w którym postać jest wyszkolona. Z rodziny wybieramy najlepszy.
 * Postać, która nosi jakiś pancerz, a w plecaku ma lepszy, nie dostaje uwagi — to jej wybór.
 * @param {Actor5e} actor
 * @returns {{item: Item5e, family: string, teraz: number, z: number}[]}  `teraz` / `z` — TT na karcie bez i z
 *   przedmiotem (z efektami i osłoną, które dokładają się poza silnikiem)
 */
export function nieZalozone(actor) {
  // Zbrojownia to katalog sprzętu, nie postać — nosi wszystko naraz w plecaku.
  if (actor?.type !== "character" || actor.getFlag(MODULE_ID, "isZbrojownia")) return [];
  const own = actor.items.filter(i => OSLONY.includes(familyOf(i)));
  if (!own.length) return [];
  const snap = ttSnapshot(actor);
  const ac = actor.system?.attributes?.ac ?? {};
  const poza = _num(ac.bonus) + _num(ac.cover);
  const teraz = computeTT(snap).total + poza;
  const out = [];
  for (const family of OSLONY) {
    const rodzina = own.filter(i => familyOf(i) === family);
    if (!rodzina.length || rodzina.some(i => i.system?.equipped)) continue;
    let best = null;
    for (const item of rodzina) {
      if (!isProficientIn(actor, item)) continue;
      const s = { ...snap };
      if (family === "bodyArmor") s.armor = _armorSnap(item);
      else if (family === "helmet") s.helmet = true;
      else s.guards = true;
      const z = computeTT(s).total + _premiaPrzedmiotu(item) + poza;
      if (!best || z > best.z) best = { item, family, teraz, z };
    }
    if (best && (family === "helmet" ? best.z >= teraz : best.z > teraz)) out.push(best);
  }
  return out;
}

/** „Plate carrier typ I — nie założony; z nim TT 15”. */
function _uwagaTekst(u) {
  if (u.family === "helmet") return `${u.item.name} — nie założony; bez niego nie ma Krytycznej ochrony`;
  return `${u.item.name} — nie założony; z nim TT ${u.z}`;
}

/**
 * Uwagi MG o TT postaci: nie założona osłona i ręczne ustawienie w źródle (przed oczyszczeniem przy starcie).
 * @param {object} [options]
 * @param {Actor5e[]} [options.actors]  domyślnie postacie graczy
 * @returns {{actor: Actor5e, uwagi: string[]}[]}
 */
export function auditTT({ actors = null } = {}) {
  const lista = actors ?? game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
  const out = [];
  for (const actor of lista) {
    const uwagi = nieZalozone(actor).map(_uwagaTekst);
    const reczna = recznaTT(actor._source.system?.attributes?.ac);
    if (reczna) uwagi.unshift(`TT ustawiona ręcznie (${reczna.opis})`);
    if (uwagi.length) out.push({ actor, uwagi });
  }
  return out;
}

/** Szept do MG przy starcie świata: co oczyszczono i kto ma nie założoną osłonę. */
async function _raportStartowy() {
  const oczyszczone = await oczyscRecznaTT();
  const audyt = auditTT();
  if (!oczyszczone.length && !audyt.length) return;
  const li = (actor, tekst) => `<li>@UUID[${actor.uuid}]{${esc(actor.name)}}: ${esc(tekst)}</li>`;
  const sekcje = [];
  if (oczyszczone.length) {
    sekcje.push(`<p>Ręczna TT usunięta — liczą ją zasady NOE:</p><ul>${oczyszczone.map(o => li(o.actor,
      `${o.opis} → teraz ${o.actor.system.attributes.ac.value}`)).join("")}</ul>`);
  }
  if (audyt.length) {
    sekcje.push(`<p>Nie założona osłona (karta: pomarańczowa TT, „Napraw”):</p><ul>${audyt.map(r =>
      r.uwagi.map(u => li(r.actor, u)).join("")).join("")}</ul>`);
  }
  await ChatMessage.create({
    content: `<div class="neuro-tt-raport"><p><strong><i class="fa-solid fa-shield-halved"></i> TT postaci</strong></p>${sekcje.join("")}</div>`,
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    speaker: { alias: "Trudność Trafienia" }
  });
}

/* -------------------------------------------- */
/*  Dane pochodne                                */
/* -------------------------------------------- */

function _applyTT(actor) {
  if (actor.type !== "character") return;
  const ac = actor.system?.attributes?.ac;
  if (!ac) return;
  const tt = computeTT(ttSnapshot(actor));
  if (_num(ac.shield)) {
    tt.rejected.push({ id: "tarczaTT", kind: "bonus", label: ac.equippedShield?.name ?? "Tarcza", value: _num(ac.shield),
      reason: "tarcza sama nie podnosi TT" });
    ac.shield = 0;
  }
  ac.neuroshima = tt;
  ac.base = tt.method.value;
  ac.value = Math.max(_num(ac.min), tt.total + _num(ac.bonus) + _num(ac.cover));
}

function _patchPrepareDerivedData() {
  const proto = CONFIG.Actor.documentClass.prototype;
  const original = proto.prepareDerivedData;
  proto.prepareDerivedData = function (...args) {
    original.apply(this, args);
    try { _applyTT(this); }
    catch (err) { console.error(`${MODULE_ID} | TT: silnik nie policzył ${this.name}`, err); }
  };
}

/* -------------------------------------------- */
/*  Dymek                                        */
/* -------------------------------------------- */

/** „10 + ZRC 2 + KON 3”, „Kurtka ćwiekowana 11 + ZRC −1”; zerowe składniki poza pierwszym pomijamy. */
function _partsText(parts) {
  return parts
    .filter((p, i) => i === 0 || _num(p.value) !== 0)
    .map(p => (p.label === String(p.value) ? p.label : `${p.label} ${_signed(p.value).replace(/^\+/, "")}`))
    .join(" + ");
}

function _methodLabel(tt) {
  const m = tt.method;
  const notes = m.parts.map(p => p.note).filter(Boolean);
  for (const c of tt.caps ?? []) notes.push(`limit ZRC +${c.value}: ${c.label}`);
  const parts = _partsText(m.parts);
  const text = m.id === "pancerz" ? parts : `${m.label} (${parts})`;
  return notes.length ? `${text} (${notes.join("; ")})` : text;
}

const _row = (value, label, { mode = 5, negative = false, cls = "" } = {}) => `
  <tr${cls ? ` class="${cls}"` : ""}>
    <td class="attribution-value mode-${mode}${negative ? " negative" : ""}">${value}</td>
    <td class="attribution-label">${label}</td>
  </tr>`;

const _add = (value, label, opts = {}) => _row(Math.abs(_num(value)), label, { mode: 2, negative: _num(value) < 0, ...opts });

/** Tabela dymka dla metody NOE — ten sam kształt co `PropertyAttribution` dnd5e. */
function _ttTooltip(actor, title) {
  const ac = actor.system.attributes.ac;
  const tt = ac.neuroshima;
  const rows = [_row(tt.method.value, esc(_methodLabel(tt)))];
  for (const b of tt.bonuses) rows.push(_add(b.value, esc(b.label)));
  if (_num(ac.shield)) rows.push(_add(ac.shield, esc(ac.equippedShield?.name ?? "Tarcza")));
  if (_num(ac.bonus)) {
    for (const a of actor._prepareActiveEffectAttributions("system.attributes.ac.bonus")) rows.push(_add(a.value, esc(a.label)));
  }
  if (_num(ac.cover)) rows.push(_add(ac.cover, "Osłona"));
  rows.push(`<tr class="total"><td class="attribution-value">${ac.value}</td><td class="attribution-label">Razem</td></tr>`);
  if (tt.rejected.length) {
    rows.push(`<tr class="neuro-tt-sep"><td colspan="2">nie liczy się</td></tr>`);
    for (const r of tt.rejected) {
      const label = `<s>${esc(r.label)}</s> — ${esc(r.reason)}`;
      const value = r.value ?? "";
      rows.push(r.kind === "method" || value === ""
        ? _row(value, label, { cls: "neuro-tt-off" })
        : _add(value, label, { cls: "neuro-tt-off" }));
    }
  }
  const uwagi = nieZalozone(actor);
  if (uwagi.length) {
    rows.push(`<tr class="neuro-tt-sep neuro-tt-uwaga"><td colspan="2">nie założone</td></tr>`);
    for (const u of uwagi) {
      rows.push(_row(u.family === "helmet" ? "" : u.z, esc(_uwagaTekst(u)), { cls: "neuro-tt-uwaga" }));
    }
  }
  const caption = title ? `<caption>${esc(game.i18n.localize(title))}</caption>` : "";
  return `<table class="neuro-tt-tooltip">${caption}${rows.join("")}</table>`;
}

function _patchAttribution() {
  const proto = CONFIG.Actor.documentClass.prototype;
  const original = proto._prepareArmorClassAttribution;
  if (typeof original !== "function") {
    console.warn(`${MODULE_ID} | TT: brak _prepareArmorClassAttribution w dnd5e — dymek natywny`);
    return;
  }
  proto._prepareArmorClassAttribution = async function (options = {}) {
    try {
      if (this.type === "character" && this.system.attributes?.ac?.neuroshima) return _ttTooltip(this, options.title);
    } catch (err) {
      console.error(`${MODULE_ID} | TT: dymek`, err);
    }
    return original.call(this, options);
  };
}

/* -------------------------------------------- */
/*  Okno TT (D6, D17)                            */
/* -------------------------------------------- */

function _configureArmorClasses() {
  const classes = CONFIG.DND5E?.armorClasses;
  if (!classes) return;
  // dnd5e 6.0 has no `default` entry (the default is the unarmored + armored pair, `DEFAULT_AC_CALCS`); 5.3 had one.
  if (classes.default) classes.default.label = "NOE (automatycznie)";
  for (const key of REMOVED_AC_METHODS) delete classes[key];
}

/** Okno TT postaci: rozkład silnika zamiast formularza dnd5e — nie ma czego ustawiać (D17). */
function _onRenderArmorClassConfig(app, element) {
  const actor = app.document;
  if (actor?.type !== "character" || !actor.system.attributes?.ac?.neuroshima) return;
  const root = element.querySelector(".window-content") ?? element;
  root.innerHTML = `<div class="neuro-tt-okno">
    <p>Trudność Trafienia postaci liczy się z zasad NOE: pancerz, hełm, ochraniacze i tarcza z Oporządzenia,
      zdolności, stany i reakcje. Ręcznie się jej nie ustawia — zmieniasz ją sprzętem i zdolnościami.</p>
    ${_ttTooltip(actor, "DND5E.ArmorClass")}</div>`;
}

/* -------------------------------------------- */
/*  Tarcza TT na karcie (D17)                    */
/* -------------------------------------------- */

/** Pomarańczowa tarcza TT i „Napraw” pod nią, gdy postać ma nie założoną osłonę. */
function _onRenderCharacterSheet(app, element) {
  const actor = app.document;
  const badge = element.querySelector(".ac-badge");
  if (!badge || actor?.type !== "character") return;
  element.querySelector(".neuro-tt-napraw")?.remove();
  const uwagi = nieZalozone(actor);
  badge.classList.toggle("neuro-tt-uwaga", uwagi.length > 0);
  if (!uwagi.length || !actor.isOwner) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "neuro-tt-napraw";
  btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation" inert></i> Napraw`;
  btn.dataset.tooltip = uwagi.map(u => esc(_uwagaTekst(u))).join("<br>");
  btn.addEventListener("click", ev => {
    ev.preventDefault();
    ev.stopPropagation();
    void napraw(actor);
  });
  badge.append(btn);
}

/**
 * „Napraw”: jedna rzecz — zakłada ją przez lalkę (koszty i pytania jak przy „Załóż”); kilka — okno z wyborem,
 * po jednej na kliknięcie (każde zakładanie to osobny ruch w Oporządzeniu).
 */
export async function napraw(actor) {
  const uwagi = nieZalozone(actor);
  if (!uwagi.length) return false;
  let u = uwagi[0];
  if (uwagi.length > 1) {
    const id = await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name}: nie założone` },
      content: `<p>Co założyć? Każda rzecz to osobny ruch w Oporządzeniu.</p>`,
      buttons: uwagi.map((x, i) => ({ action: x.item.id, label: _uwagaTekst(x), default: i === 0 })),
      rejectClose: false
    });
    u = uwagi.find(x => x.item.id === id);
    if (!u) return false;
  }
  return place(actor, u.item, "auto");
}

/* -------------------------------------------- */
/*  Efekty do początku następnej tury (§4.5)     */
/* -------------------------------------------- */

/**
 * Efekt trwający do początku tury właściciela: Unikanie, Bieganie (PLAN_m1_walka U8) albo nasza flaga TT.
 */
export function isTurnLongTTEffect(effect) {
  return !!effect?.statuses?.has?.("dodging") || !!effect?.statuses?.has?.("bieganie")
    || effect?.getFlag?.(MODULE_ID, TT_EFFECT_FLAG) != null;
}

/* -------------------------------------------- */
/*  Porządki po starym wdrożeniu (§6)            */
/* -------------------------------------------- */

/**
 * Obłęd był zmianą `ac.bonus` w Efekcie Aktywnym Berserka, Zasłona — osobnym efektem
 * `neuroSamurajTT00`. Silnik liczy oba sam, więc stare zostawiłyby podwójne liczenie.
 * Idempotentne; aktorzy świata i niepowiązane żetony.
 */
export async function cleanupLegacyTTEffects({ commit = true } = {}) {
  const actors = [...game.actors];
  for (const scene of game.scenes) for (const t of scene.tokens) if (!t.actorLink && t.actor) actors.push(t.actor);
  const report = { berserk: [], samuraj: [] };
  for (const actor of actors) {
    const del = [];
    const upd = [];
    for (const e of actor.effects) {
      if (e.id === "neuroSamurajTT00" || e.getFlag(MODULE_ID, "samurajEffect")) { del.push(e.id); continue; }
      if (e.getFlag(MODULE_ID, "classState") !== "neuro-berserk") continue;
      const changes = e.system?.changes ?? [];
      const kept = changes.filter(c => c.key !== "system.attributes.ac.bonus");
      if (kept.length !== changes.length) upd.push({ _id: e.id, "system.changes": kept });
    }
    if (del.length) report.samuraj.push(actor.name);
    if (upd.length) report.berserk.push(actor.name);
    if (!commit) continue;
    if (upd.length) await actor.updateEmbeddedDocuments("ActiveEffect", upd);
    if (del.length) await actor.deleteEmbeddedDocuments("ActiveEffect", del);
  }
  if (report.berserk.length || report.samuraj.length) {
    console.log(`${MODULE_ID} | TT: stare efekty ${commit ? "usunięte" : "do usunięcia"}`, report);
  }
  return report;
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerTT() {
  _configureArmorClasses();
  _patchPrepareDerivedData();
  _patchAttribution();

  // Początek na właścicielu, skasowanie po wygaśnięciu, porządki po walce i odpoczynku — `combat/czas-efektu.mjs`.
  zarejestrujEfektTuryWlasciciela(isTurnLongTTEffect);
  // Trening w zbroi (Żołnierz, s. 89): drugi skutek obok limitu ZRC — pancerz nie nakłada Utrudnienia do Skradania się.
  registerStealthExemption(actor => hasAbility(actor, ABILITY_KEYS.TRENING_W_ZBROI));

  Hooks.on("preCreateActor", _onPreCreateActor);
  Hooks.on("preUpdateActor", _onPreUpdateActor);
  Hooks.on("renderArmorClassConfig", _onRenderArmorClassConfig);
  Hooks.on("renderCharacterActorSheet", _onRenderCharacterSheet);

  Hooks.once("ready", () => {
    if (!game.users.activeGM?.isSelf) return;
    void cleanupLegacyTTEffects();
    void _raportStartowy().catch(err => console.error(`${MODULE_ID} | TT: raport startowy`, err));
  });

  console.log(`${MODULE_ID} | TT (NOE) registered`);
}

export const ttApi = Object.freeze({
  snapshot: ttSnapshot, compute: actor => computeTT(ttSnapshot(actor)), for: ttFor, source: ttSource,
  permanentlyLosing: actor => permanentlyLosingMethods(ttSnapshot(actor)), cleanupLegacy: cleanupLegacyTTEffects,
  audit: auditTT, nieZalozone, napraw, oczyscReczna: oczyscRecznaTT
});
