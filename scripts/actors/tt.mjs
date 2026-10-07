/**
 * Neuroshima 5e — Trudność Trafienia postaci na karcie (PLAN_tt.md, Część A, E1).
 *
 * Zasady liczy czysty silnik `config/tt-rules.mjs`; tutaj jest wszystko, co dotyka Foundry:
 *
 *   - **Migawka** postaci dla silnika — pancerz z natywnego wyboru dnd5e, hełm i ręce z lalki
 *     (`actors/doll.mjs`), stany (Berserk, Unikanie), zdolności przez most `hasAbility()`.
 *   - **Dane pochodne.** Owinięcie `prepareDerivedData` aktora (wzorzec `armor-rules.mjs`,
 *     DEV_GUIDE §10c.3). Postać z metodą „NOE (automatycznie)” (dnd5e: `default`) dostaje
 *     `ac.neuroshima` = wynik silnika i `ac.value` = metoda + premie + tarcza + `ac.bonus`
 *     (Efekty Aktywne: ochraniacze, Inteligentna obrona, Koci odskok) + osłona. Inna metoda
 *     („Stała”, „Naturalna”, „Własna formuła”) to furtka MG — silnik nie rusza niczego (D6).
 *     Zero zapisów do bazy: Obłęd i Zasłona nie są już Efektami Aktywnymi (P2).
 *   - **Dymek TT** — owinięcie `Actor5e#_prepareArmorClassAttribution`: tabela w klasach
 *     natywnego `property-attribution` plus sekcja „nie liczy się” z powodem w linii.
 *   - **Okno TT** — „Domyślna” → „NOE (automatycznie)”, metody 5e (Mag, Smocza, Mnich,
 *     Barbarzyńca, Bard) usunięte (D6). Raport przed usunięciem (2026-10-03): żaden aktor ich
 *     nie używał; gdyby, dnd5e i tak przestawia nieznaną metodę na „Stała” z bieżącą wartością.
 *   - **Efekty do początku następnej tury** (Unikanie; w E3 reakcje) — §4.5, z poprawką: rdzeń
 *     v14 wygasza efekt `turnStart` na początku tury kombatanta zapisanego w `start.combatant`,
 *     a to jest ten, czyja tura trwała przy tworzeniu (`ActiveEffect.getEffectStart`). Reakcja
 *     w turze atakującego wygasałaby więc na początku tury **atakującego**. Dlatego przy
 *     tworzeniu przestawiamy `start.combatant` na właściciela, a czas liczymy w turach
 *     (`turns: 1`) — w rundach efekt właściciela działającego później w tej samej rundzie
 *     dotrwałby o cały obieg za długo. Kasowanie wygasłego jest nasze (DEV_GUIDE §10e.2).
 */

import { computeTT, TT_ABILITY_KEYS, permanentlyLosingMethods, _signed } from "../config/tt-rules.mjs";
import { hasAbility } from "./abilities.mjs";
import { heldItems, familyOf } from "./doll.mjs";
import { equippedArmor } from "./armor-rules.mjs";
import { isZaslonaWeapon } from "./samuraj.mjs";
import { weaponIdOf } from "../weapons/magazine-model.mjs";

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
  const item = actor.system?.attributes?.ac?.equippedArmor ?? equippedArmor(actor);
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
  const walk = actor.system?.attributes?.movement?.walk;
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
 * @returns {{active: boolean, value: number, reason?: string, manual: boolean}|null}
 *   `manual` — postać ma TT ustawioną ręcznie, więc źródło trzeba doliczyć samemu.
 */
export function ttSource(actor, id) {
  const tt = ttFor(actor);
  if (!tt) return null;
  const manual = !actor.system?.attributes?.ac?.neuroshima;
  const on = tt.method.id === id ? tt.method : tt.bonuses.find(b => b.id === id);
  if (on) return { active: true, value: on.value, manual };
  const off = tt.rejected.find(r => r.id === id);
  return off ? { active: false, value: off.value ?? 0, reason: off.reason, manual } : null;
}

/* -------------------------------------------- */
/*  Dane pochodne                                */
/* -------------------------------------------- */

function _applyTT(actor) {
  if (actor.type !== "character") return;
  const ac = actor.system?.attributes?.ac;
  if (!ac) return;
  if (ac.calc !== "default") { ac.neuroshima = null; return; }
  const tt = computeTT(ttSnapshot(actor));
  ac.neuroshima = tt;
  ac.base = tt.method.value;
  ac.value = Math.max(_num(ac.min), tt.total + _num(ac.shield) + _num(ac.bonus) + _num(ac.cover));
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
      const html = await original.call(this, options);
      if (this.type !== "character" || !html) return html;
      const note = `<tr class="neuro-tt-sep"><td colspan="2">TT ustawiona ręcznie — reguły NOE wyłączone</td></tr>`;
      return html.includes("</table>") ? html.replace(/<\/table>(?![\s\S]*<\/table>)/, `${note}</table>`) : html;
    } catch (err) {
      console.error(`${MODULE_ID} | TT: dymek`, err);
      return original.call(this, options);
    }
  };
}

/* -------------------------------------------- */
/*  Okno TT (D6)                                 */
/* -------------------------------------------- */

function _configureArmorClasses() {
  const classes = CONFIG.DND5E?.armorClasses;
  if (!classes?.default) return;
  classes.default.label = "NOE (automatycznie)";
  for (const key of REMOVED_AC_METHODS) delete classes[key];
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

/** Kombatant właściciela w bieżącej, rozpoczętej walce. */
function _ownerCombatant(actor, combat = game.combat) {
  if (!combat?.started || !actor) return null;
  return combat.getCombatantsByActor(actor)[0] ?? null;
}

function _onPreCreateEffect(effect) {
  if (!isTurnLongTTEffect(effect)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  const owner = _ownerCombatant(actor);
  if (!owner) return;
  effect.updateSource({ "start.combatant": owner.id });
}

/** Rdzeń oznaczył wygaśnięcie (`expiryAction: "update"`) — kasujemy, inaczej ikona zostaje. */
async function _onUpdateEffect(effect, changes) {
  if (!game.users.activeGM?.isSelf) return;
  if (foundry.utils.getProperty(changes, "duration.expired") !== true) return;
  if (!isTurnLongTTEffect(effect)) return;
  await effect.delete({ neuroTTExpired: true });
}

async function _purgeTurnLongEffects(actor) {
  const ids = actor?.effects?.filter(isTurnLongTTEffect).map(e => e.id) ?? [];
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

async function _onDeleteCombat(combat) {
  if (!game.users.activeGM?.isSelf) return;
  for (const c of combat.combatants) await _purgeTurnLongEffects(c.actor);
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

  Hooks.on("preCreateActiveEffect", _onPreCreateEffect);
  Hooks.on("updateActiveEffect", _onUpdateEffect);
  Hooks.on("deleteCombat", _onDeleteCombat);
  // Odpoczynek kończy wszystko, co trwało „do początku następnej tury” (jak stany klasowe).
  Hooks.on("dnd5e.restCompleted", actor => { void _purgeTurnLongEffects(actor); });

  Hooks.once("ready", () => {
    if (game.users.activeGM?.isSelf) void cleanupLegacyTTEffects();
  });

  console.log(`${MODULE_ID} | TT (NOE) registered`);
}

export const ttApi = Object.freeze({
  snapshot: ttSnapshot, compute: actor => computeTT(ttSnapshot(actor)), for: ttFor, source: ttSource,
  permanentlyLosing: actor => permanentlyLosingMethods(ttSnapshot(actor)), cleanupLegacy: cleanupLegacyTTEffects
});
