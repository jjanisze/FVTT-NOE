/**
 * Neuroshima 5e — Emiter EMP (NOE s. 101; PLAN_m3_towarzysze.md §7.12, D27; E10).
 *
 * Broń z `bron` (`config/weapons-data.mjs`, kategoria specjalna), budowana przepisem zdolności jak Pogromca
 * (`config/recipes-data.mjs`). Tutaj to, czego dane nie wyrażą:
 *   - **Biegłość z samej zdolności** — „tylko Zabójca Maszyn jest biegły”: owinięcie `proficiencyMultiplier` broni
 *     dnd5e; biegłość w broni specjalnej jej nie daje. Ręczne ustawienie na karcie (`proficient`) wygrywa.
 *   - **TT celu-maszyny (D27)** — „ignoruje TT z opancerzenia maszyny”: cel z notą pancerza przy TT (Bestiariusz,
 *     `flags.bestiary.acNote`) → 10 + mod. ZRC, bez noty → pełna TT, nigdy więcej niż pełna (`ttCeluEmp`). Źródło
 *     TT wobec broni w rozstrzygaczu trafienia (`combat/trafienie.mjs`), aktywne tylko dla tej broni.
 *   - **Istoty żywe (T3)** — „nie działa na istoty żywe”: w tacce obrażeń dnd5e cel nie-maszyna dostaje domyślnie
 *     mnożnik ×0 z plakietką; ×1 przywraca obrażenia (urządzenia bez mikroprocesorów i wyjątki — MG).
 *   - **Porażenie** — właściwość `emp` w `combat/weapon-save-properties.mjs` (RO KON ST 15, Obezwładnienie do końca
 *     następnej tury atakującego, tylko maszyny).
 *   - **Naładuj (230 V)** — aktywność broni (T1): karta, a przycisk MG ładuje akumulator do 6 strzałów (`setMag`).
 */

import { ttCeluEmp } from "../config/towarzysze-rules.mjs";
import { jestMaszyna } from "../actors/towarzysze.mjs";
import { maZdolnosc } from "../production/wykonawca.mjs";
import { zarejestrujTTWobecBroni } from "../combat/trafienie.mjs";
import { weaponIdOf, weaponEntry } from "./magazine-model.mjs";
import { setMag } from "./magazine.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const EMITER_ID = "emiter-emp";
const ZDOLNOSC = "emiter-emp";
const NALADUJ = "emp-naladuj";
const FLAG_KARTA = "empLadowanie";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Czy przedmiot to Emiter EMP. */
export function jestEmiterem(item) {
  return item?.type === "weapon" && weaponIdOf(item) === EMITER_ID;
}

/* -------------------------------------------- */
/*  TT celu (D27)                                */
/* -------------------------------------------- */

/** TT maszyny wobec Emitera EMP albo `null` (nie maszyna — EMP i tak jej nie rusza). */
export function ttWobecEmitera(target, base) {
  if (!jestMaszyna(target)) return null;
  const nota = target.flags?.[MODULE_ID]?.bestiary?.acNote ?? null;
  return ttCeluEmp({ tt: base, opancerzenie: !!nota, modZrc: Number(target.system?.abilities?.dex?.mod) || 0 });
}

/* -------------------------------------------- */
/*  Biegłość                                     */
/* -------------------------------------------- */

function _owinBieglosc() {
  const cls = CONFIG.Item.dataModels?.weapon;
  if (!cls) return;
  let proto = cls.prototype;
  while (proto && !Object.getOwnPropertyDescriptor(proto, "proficiencyMultiplier")) proto = Object.getPrototypeOf(proto);
  const desc = proto && Object.getOwnPropertyDescriptor(proto, "proficiencyMultiplier");
  if (!desc?.get) return console.warn(`${MODULE_ID} | Emiter EMP: brak proficiencyMultiplier — biegłość bez zmian`);
  Object.defineProperty(proto, "proficiencyMultiplier", {
    configurable: true,
    get() {
      const item = this.parent;
      const actor = item?.actor;
      if (!jestEmiterem(item) || Number.isFinite(this.proficient) || !actor || actor.system?.isNPC) return desc.get.call(this);
      return maZdolnosc(actor, ZDOLNOSC) ? 1 : 0;
    }
  });
}

/* -------------------------------------------- */
/*  Tacka obrażeń: istoty żywe ×0 (T3)           */
/* -------------------------------------------- */

function _przedmiotWiadomosci(message) {
  const uuid = message?.getFlag?.("dnd5e", "item")?.uuid ?? message?.flags?.dnd5e?.item?.uuid;
  try { return uuid ? fromUuidSync(uuid) : null; } catch { return null; }
}

/** Ustawia ×0 dla celu nie-maszyny przy obrażeniach Emitera (raz — potem decyduje człowiek). */
function _domyslnieZero(el, uuid) {
  if (!jestEmiterem(_przedmiotWiadomosci(el.chatMessage))) return false;
  const doc = fromUuidSync(uuid);
  const actor = doc instanceof Actor ? doc : doc?.actor;
  if (!actor || jestMaszyna(actor)) return false;
  const o = el.getTargetOptions(uuid);
  if (!o.neuroEmp) {
    o.neuroEmp = true;
    o.multiplier = 0;
  }
  return true;
}

function _owinTacke() {
  const cls = customElements.get("damage-application");
  if (!cls) return console.warn(`${MODULE_ID} | Emiter EMP: brak elementu tacki obrażeń dnd5e`);
  const oryginal = cls.prototype.buildTargetListEntry;
  cls.prototype.buildTargetListEntry = function ({ uuid, name }) {
    const zero = _domyslnieZero(this, uuid);
    const li = oryginal.call(this, { uuid, name });
    if (li && zero) {
      const p = document.createElement("span");
      p.className = "neuro-emp-plakietka";
      p.dataset.tooltip = "Emiter EMP nie działa na istoty żywe (s. 101) — domyślnie ×0; ×1, jeśli MG uzna inaczej.";
      p.innerHTML = `<i class="fa-solid fa-bolt-lightning" inert></i> EMP nie działa na istoty żywe`;
      li.querySelector(".name-stacked")?.append(p);
    }
    return li;
  };
}

/* -------------------------------------------- */
/*  Naładuj (230 V)                              */
/* -------------------------------------------- */

function _aktywnoscLadowania(item) {
  return item.system.activities?.find(a => a.visibility?.identifier === NALADUJ) ?? null;
}

/** Aktywność „Naładuj (230 V)” na Emiterze (idempotentnie; tylko MG zapisuje). */
export async function zapewnijLadowanie(item) {
  if (!jestEmiterem(item) || _aktywnoscLadowania(item)) return;
  await item.createActivity("utility", {
    name: "Naładuj (230 V)",
    img: "icons/svg/lightning.svg",
    activation: { type: "special" },
    visibility: { identifier: NALADUJ },
    description: { chatFlavor: "Akumulator emitera z gniazdka 230 V — 6 strzałów." }
  }, { renderSheet: false });
}

/** Ile strzałów zostało w akumulatorze (symulacja magazynków) albo `null` — broń poza symulacją. */
export function ladunkiEmitera(item) {
  const flag = item?.flags?.[MODULE_ID]?.rounds;
  if (!weaponEntry(item)?.mag || !Array.isArray(flag)) return null;
  return flag.length;
}

/** Karta ładowania (T1): MG potwierdza, że jest prąd, i ładuje. */
async function _kartaLadowania(item) {
  const actor = item.actor;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-dron-karta">
      <header><img src="${esc(item.img)}" alt="" width="32" height="32">
        <div><strong>Naładuj (230 V)</strong><br><small>${esc(item.name)}</small></div></header>
      <p>Akumulator emitera ładuje się prądem 230 V i starcza na 6 wystrzałów (s. 101). Czy jest gniazdko i ile to
        trwa — decyduje MG.</p>
      <div class="neuro-dron-przyciski neuro-gm-only"><button type="button" data-action="neuroEmpNaladuj">
        <i class="fa-solid fa-plug-circle-bolt" inert></i> Naładuj do 6</button></div>
    </div>`,
    flags: { [MODULE_ID]: { [FLAG_KARTA]: { item: item.uuid } } }
  });
}

/** Ładuje Emiter do pełna (6). */
export async function naladuj(item) {
  if (!jestEmiterem(item)) return false;
  if (weaponEntry(item)?.mag) await setMag(item, { current: weaponEntry(item).mag.max });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: `<p><i class="fa-solid fa-plug-circle-bolt" inert></i> <strong>${esc(item.name)}</strong> naładowany: 6 strzałów.</p>`
  });
  return true;
}

function _onRenderChatMessage(message, html) {
  const f = message.getFlag(MODULE_ID, FLAG_KARTA);
  if (!f) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!game.user.isGM) return void root?.querySelectorAll(".neuro-gm-only").forEach(el => el.remove());
  const b = root?.querySelector('[data-action="neuroEmpNaladuj"]');
  b?.addEventListener("click", async ev => {
    ev.preventDefault();
    const item = await fromUuid(f.item);
    if (!item) return ui.notifications.warn("Tego emitera już nie ma.");
    b.disabled = true;
    await naladuj(item);
    b.innerHTML = `<i class="fa-solid fa-check" inert></i> Naładowany`;
  });
}

function _onPreUseActivity(activity) {
  if (activity?.visibility?.identifier !== NALADUJ) return;
  const item = activity.actor?.items.get(activity.item?.id) ?? activity.item;
  if (!jestEmiterem(item)) return;
  _kartaLadowania(item).catch(err => console.error(`${MODULE_ID} | Naładuj (230 V)`, err));
  return false;
}

async function _zapewnijWszystkie() {
  const items = [...game.items];
  for (const a of game.actors) items.push(...a.items);
  for (const i of items) if (jestEmiterem(i) && !_aktywnoscLadowania(i)) await zapewnijLadowanie(i);
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerEmiterEmp() {
  zarejestrujTTWobecBroni((target, { item, base }) => (jestEmiterem(item) ? ttWobecEmitera(target, base) : null));
  _owinBieglosc();
  _owinTacke();
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);
  Hooks.on("createItem", item => { if (game.user.isGM) zapewnijLadowanie(item); });
  Hooks.once("ready", () => { if (game.user.isActiveGM) _zapewnijWszystkie(); });
}

export const emiterEmpApi = Object.freeze({ jestEmiterem, ttWobecEmitera, naladuj, ladunkiEmitera, zapewnijLadowanie });
