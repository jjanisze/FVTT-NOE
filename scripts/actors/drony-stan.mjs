/**
 * Neuroshima 5e — dron: zasilanie i upadek latającego (PLAN_m3_towarzysze.md §7.4, §7.9 U15, D29; E7c).
 *
 *   - **Zasilanie (U15, T4 na zegarze):** akumulator 24 V w gnieździe uchwytu — 1 h dla średniego drona, 4 h dla
 *     małego (s. 83); agregat zamontowany na dronie zasila najpierw, 0,5 l paliwa na godzinę. Stan na uchwycie
 *     (`flags.<mod>.dron.zasilanie = { procent, od }`): `od` to czas świata, od kiedy dron pracuje (rozłożony i
 *     nie Wyłączony), procent liczy się na żywo jak bateria Latarki (`items/power-source.mjs`). Aktywny MG
 *     rozlicza zużycie przy każdej zmianie stanu (rozłożenie, złożenie, Wyłączony) i sprawdza wyczerpanie przy
 *     ruchu zegara — wtedy Wyłączony z przyczyną „zasilanie”. Nowy dron ma pełny akumulator.
 *   - **Włóż akumulator [A]** — aktywność uchwytu: akumulator z ekwipunku posiadacza do gniazda, stary wraca
 *     do ekwipunku z tym, co w nim zostało („Akumulator (35%)”). Wyłączony z braku zasilania się włącza.
 *   - **Upadek (D29, s. 253):** latający dron Wyłączony, Sparaliżowany albo Nieprzytomny na wysokości > 0 —
 *     karta MG „Spada” z obrażeniami od upadku z wysokości żetonu (Spadanie, `combat/falling.mjs`) i żeton na
 *     ziemię (T2); Powalenie — opada pionowo bez obrażeń (T4).
 */

import { RODZAJE } from "../config/towarzysze-data.mjs";
import { zuzycieZasilania, upadekDrona, AKUMULATOR_GODZIN } from "../config/towarzysze-rules.mjs";
import { AGREGAT_L_NA_H } from "../config/towarzysze-data.mjs";
import { towarzysz } from "./towarzysze.mjs";
import { jestDronem, uchwyt, uchwytDrona, dronUchwytu, zetonyDrona, FLAG_UCHWYT, AKT_AKUMULATOR } from "./drony.mjs";
import { jestWylaczona, wylacz, wlacz } from "../combat/maszyny.mjs";
import { registerPowerSource, formatRemaining } from "../items/power-source.mjs";
import { fall } from "../combat/falling.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG_AKU_PROCENT = "akumulatorProcent";
const FLAG_SPADA = "dronSpada";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  Odczyt                                       */
/* -------------------------------------------- */

function _zasilanie(u) {
  const z = uchwyt(u)?.zasilanie;
  return { procent: Number.isFinite(z?.procent) ? z.procent : 100, od: Number.isFinite(z?.od) ? z.od : null };
}

/** Agregat zamontowany na dronie albo `null`. */
export function agregatDrona(dron) {
  return dron?.items?.find(i => i.flags?.[MODULE_ID]?.productionGearId === "agregat" && i.flags?.[MODULE_ID]?.zamontowane) ?? null;
}

function _paliwo(agregat) {
  return Math.max(0, _num(agregat?.flags?.[MODULE_ID]?.paliwoL));
}

/** Czy dron pracuje (pobiera prąd): rozłożony i nie Wyłączony (U15). */
export function pracuje(dron) {
  return zetonyDrona(dron).length > 0 && !jestWylaczona(dron);
}

/**
 * Zasilanie drona na żywo: `{ procent, paliwoL, minutyPozostale, pracuje, agregat }`.
 * @param {Actor} dron
 * @param {number} [teraz]  czas świata
 */
export function stanZasilania(dron, teraz = game.time.worldTime) {
  const u = uchwytDrona(dron);
  const wpis = RODZAJE[towarzysz(dron)?.rodzaj];
  if (!u || !wpis) return null;
  const z = _zasilanie(u);
  const agregat = agregatDrona(dron);
  let procent = z.procent;
  let paliwoL = _paliwo(agregat);
  if (z.od !== null) {
    const minuty = Math.max(0, teraz - z.od) / 60;
    const zuz = zuzycieZasilania({ rozmiar: wpis.rozmiar, minuty, agregat: !!agregat, paliwoL });
    procent = Math.max(0, procent - zuz.procentAkumulatora);
    paliwoL = Math.max(0, paliwoL - zuz.paliwoL);
  }
  const pojemnosc = (AKUMULATOR_GODZIN[wpis.rozmiar] ?? 1) * 60;
  const minutyPozostale = (procent / 100) * pojemnosc + (agregat ? (paliwoL / AGREGAT_L_NA_H) * 60 : 0);
  return { procent, paliwoL, minutyPozostale, pracuje: z.od !== null, agregat: !!agregat };
}

/* -------------------------------------------- */
/*  Rozliczenie (aktywny MG)                     */
/* -------------------------------------------- */

const _wToku = new Map();

/** Rozlicza zużycie do teraz i ustawia `od` wg tego, czy dron ma pracować. Kolejka na drona. */
export function synchronizujZasilanie(dron) {
  if (!dron) return Promise.resolve();
  const poprz = _wToku.get(dron.id) ?? Promise.resolve();
  const nast = poprz.then(() => _synchronizuj(dron)).catch(err => console.error(`${MODULE_ID} | zasilanie drona`, err));
  _wToku.set(dron.id, nast);
  return nast;
}

async function _synchronizuj(dron) {
  if (!game.user.isActiveGM) return;
  const u = uchwytDrona(dron);
  if (!u) return;
  const teraz = game.time.worldTime;
  const s = stanZasilania(dron, teraz);
  const z = _zasilanie(u);
  const maPrad = s.procent > 0 || s.paliwoL > 0;
  const chce = pracuje(dron) && maPrad;
  const zmiany = {};
  if (z.od !== null) {
    zmiany[`flags.${MODULE_ID}.${FLAG_UCHWYT}.zasilanie`] = { procent: s.procent, od: chce ? teraz : null };
    const agregat = agregatDrona(dron);
    if (agregat && _paliwo(agregat) !== s.paliwoL) await agregat.setFlag(MODULE_ID, "paliwoL", s.paliwoL);
  } else if (chce) {
    zmiany[`flags.${MODULE_ID}.${FLAG_UCHWYT}.zasilanie`] = { procent: z.procent, od: teraz };
  }
  if (Object.keys(zmiany).length) await u.update(zmiany);
  // Wyczerpanie przy pracy → Wyłączony; prąd wrócił → zdejmujemy tę jedną przyczynę.
  if (!maPrad && zetonyDrona(dron).length) await wylacz(dron, "zasilanie");
  else if (maPrad) await wlacz(dron, "zasilanie");
}

/** Zegar świata: drony, którym prąd właśnie się skończył. */
async function _onUpdateWorldTime() {
  if (!game.user.isActiveGM) return;
  for (const a of game.actors) {
    if (!jestDronem(a)) continue;
    const s = stanZasilania(a);
    if (s?.pracuje && s.procent <= 0 && s.paliwoL <= 0) await synchronizujZasilanie(a);
  }
}

/* -------------------------------------------- */
/*  Włóż akumulator                              */
/* -------------------------------------------- */

const _jestAkumulatorem = i => i?.flags?.[MODULE_ID]?.productionGearId === "akumulator";

/**
 * Włóż akumulator [A]: akumulator z ekwipunku posiadacza do gniazda, stary wraca z resztą ładunku.
 * @param {Item} item  uchwyt
 */
export async function wlozAkumulator(item) {
  const dron = dronUchwytu(item);
  const holder = item?.parent;
  if (!dron || !holder) return null;
  const nowy = holder.items.find(i => _jestAkumulatorem(i) && i.id !== item.id);
  if (!nowy) return ui.notifications.warn(`${holder.name} nie ma akumulatora w ekwipunku.`), null;
  const s = stanZasilania(dron);
  const naladowanie = Number.isFinite(nowy.flags[MODULE_ID]?.[FLAG_AKU_PROCENT]) ? nowy.flags[MODULE_ID][FLAG_AKU_PROCENT] : 100;
  const stary = Math.round(s.procent);
  const pracujeTeraz = pracuje(dron) || (jestWylaczona(dron) && zetonyDrona(dron).length > 0);
  await item.update({ [`flags.${MODULE_ID}.${FLAG_UCHWYT}.zasilanie`]: { procent: naladowanie, od: pracujeTeraz && !jestWylaczona(dron) ? game.time.worldTime : null } });
  if (Number(nowy.system.quantity) > 1) await nowy.update({ "system.quantity": Number(nowy.system.quantity) - 1 });
  else await nowy.delete();
  const dane = nowy.toObject();
  delete dane._id;
  dane.system.quantity = 1;
  dane.name = `Akumulator (${stary}%)`;
  foundry.utils.setProperty(dane, `flags.${MODULE_ID}.${FLAG_AKU_PROCENT}`, stary);
  await holder.createEmbeddedDocuments("Item", [dane]);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: holder }),
    content: `<p><i class="fa-solid fa-car-battery" inert></i> <strong>${esc(holder.name)}</strong> wkłada akumulator do drona `
      + `@UUID[${dron.uuid}]{${esc(dron.name)}} (${Math.round(naladowanie)}%); stary — ${stary}% — wraca do ekwipunku.</p>`
  });
  return true;
}

/* -------------------------------------------- */
/*  Upadek latającego (D29)                      */
/* -------------------------------------------- */

function _stany(dron) {
  return [...(dron.statuses ?? [])];
}

/** Aktywny MG: dron latający w powietrzu ze stanem upadku — karta albo opadnięcie. */
async function _sprawdzUpadek(dron) {
  if (!game.user.isActiveGM || !RODZAJE[towarzysz(dron)?.rodzaj]?.lata) return;
  for (const t of zetonyDrona(dron)) {
    const wysokosc = _num(t.elevation);
    const u = upadekDrona({ stany: _stany(dron), wysokosc, lata: true });
    if (!u.spada) continue;
    if (!u.obrazenia) {
      await t.update({ elevation: 0 });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: dron }),
        content: `<p><strong>${esc(dron.name)}</strong> — Powalenie w powietrzu: opada pionowo z ${wysokosc} m, bez obrażeń (s. 253).</p>`
      });
      continue;
    }
    const otwarta = game.messages.contents.findLast(m => m.getFlag(MODULE_ID, FLAG_SPADA)?.token === t.uuid && !m.getFlag(MODULE_ID, FLAG_SPADA)?.zrobione);
    if (otwarta) continue;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: dron }),
      whisper: game.users.filter(x => x.isGM).map(x => x.id),
      content: `<div class="neuro-dron-karta"><p><i class="fa-solid fa-person-falling" inert></i> <strong>${esc(dron.name)}</strong> `
        + `przestaje lecieć na wysokości ${wysokosc} m — spada i otrzymuje obrażenia od upadku (s. 253, 259).</p>`
        + `<div class="neuro-dron-przyciski"><button type="button" data-action="neuroDronSpada" data-token="${esc(t.uuid)}">`
        + `<i class="fa-solid fa-person-falling" inert></i> Spada (${wysokosc} m)</button></div></div>`,
      flags: { [MODULE_ID]: { [FLAG_SPADA]: { token: t.uuid, wysokosc } } }
    });
  }
}

/** [Spada] z karty: żeton na ziemię i obrażenia od upadku z jego wysokości (MG). */
export async function spada(message, tokenUuid) {
  if (!game.user.isGM) return ui.notifications.warn("Upadek stosuje MG.");
  const t = fromUuidSync(tokenUuid);
  const dron = t?.actor;
  if (!t || !dron) return;
  const wysokosc = _num(t.elevation);
  await t.update({ elevation: 0 });
  if (wysokosc > 0) await fall(dron, { metres: wysokosc });
  await message.setFlag(MODULE_ID, FLAG_SPADA, { ...message.getFlag(MODULE_ID, FLAG_SPADA), zrobione: true });
}

function _onRenderChatMessage(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  for (const b of root?.querySelectorAll?.('button[data-action="neuroDronSpada"]') ?? []) {
    if (message.getFlag(MODULE_ID, FLAG_SPADA)?.zrobione) b.disabled = true;
    b.addEventListener("click", ev => {
      ev.preventDefault();
      b.disabled = true;
      spada(message, b.dataset.token);
    });
  }
}

/* -------------------------------------------- */
/*  Haki                                         */
/* -------------------------------------------- */

function _poEfekcie(effect) {
  const dron = effect?.parent;
  if (!(dron instanceof Actor) || !jestDronem(dron) || !game.user.isActiveGM) return;
  synchronizujZasilanie(dron);
  _sprawdzUpadek(dron);
}

function _poZetonie(token) {
  if (!game.user.isActiveGM || !token.actorLink) return;
  const dron = game.actors.get(token.actorId);
  if (dron && jestDronem(dron)) synchronizujZasilanie(dron);
}

/** Agregat położony na dronie jest zamontowany (jak broń w `drony-bron.mjs`). */
function _preCreateItem(item) {
  const dron = item.parent;
  if (!jestDronem(dron) || item.flags?.[MODULE_ID]?.productionGearId !== "agregat") return;
  item.updateSource({ [`flags.${MODULE_ID}.zamontowane`]: true });
}

function _onPreUseActivity(activity) {
  if (activity?.id !== AKT_AKUMULATOR) return;
  const item = activity.actor?.items.get(activity.item?.id) ?? activity.item;
  if (!uchwyt(item)) return;
  wlozAkumulator(item).catch(err => console.error(`${MODULE_ID} | Włóż akumulator`, err));
  return false;
}

export function registerDronyStan() {
  Hooks.on("createActiveEffect", _poEfekcie);
  Hooks.on("deleteActiveEffect", _poEfekcie);
  Hooks.on("updateActiveEffect", _poEfekcie);
  Hooks.on("createToken", _poZetonie);
  Hooks.on("deleteToken", _poZetonie);
  Hooks.on("updateWorldTime", _onUpdateWorldTime);
  Hooks.on("preCreateItem", _preCreateItem);
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);
  Hooks.on("updateItem", item => {
    // Akumulator włożony przez gracza — MG włącza drona, któremu brakowało prądu.
    if (!game.user.isActiveGM || !uchwyt(item)) return;
    const dron = dronUchwytu(item);
    if (dron) synchronizujZasilanie(dron);
  });

  registerPowerSource({
    test: item => !!uchwyt(item),
    describe: item => {
      const dron = dronUchwytu(item);
      const s = dron ? stanZasilania(dron) : null;
      if (!s) return null;
      return {
        on: s.pracuje,
        unlimited: false,
        percent: s.procent,
        remainingMinutes: s.minutyPozostale,
        unitLabel: s.agregat ? `Akumulator · agregat ${s.paliwoL.toFixed(1)} l` : "Akumulator",
        flagPath: `flags.${MODULE_ID}.${FLAG_UCHWYT}.zasilanie.procent`,
        editable: !s.pracuje && item.isOwner,
        onNote: "pracuje",
        offHint: "albo Włóż akumulator — aktywność uchwytu"
      };
    }
  });
}

/** Tankowanie agregatu na dronie (MG; RAW nie podaje pojemności zbiornika). */
export async function zatankuj(dron, litry) {
  const agregat = agregatDrona(dron);
  if (!agregat) return ui.notifications.warn(`${dron?.name ?? "Dron"} nie ma zamontowanego agregatu.`), null;
  await synchronizujZasilanie(dron);
  await agregat.setFlag(MODULE_ID, "paliwoL", _paliwo(agregat) + Math.max(0, _num(litry)));
  await synchronizujZasilanie(dron);
  return _paliwo(agregat);
}

export const dronyStanApi = Object.freeze({ stanZasilania, synchronizujZasilanie, wlozAkumulator, zatankuj, agregatDrona, spada, formatRemaining });
