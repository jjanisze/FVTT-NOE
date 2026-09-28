/**
 * Neuroshima 5e — Olejek trujący Truciciela (NOE s. 94, PLAN_produkcja D36).
 *
 * Truciciel w Długim odpoczynku, mając narzędzia małego chemika, robi jedną porcję trującego
 * olejku (10 ml). Jeden przedmiot „Olejek trujący” z **ST twórcy** (8 + mod. INT + PB) zapisanym
 * w chwili wytworzenia — nazwa niesie ST („Olejek trujący (ST 14)”), a stos łączy się tylko przy
 * tym samym ST, bo ST należy do trucizny, nie do tego, kto ją potem nakłada.
 *
 * Nałożenie (Akcja Bonusowa): na ostrze broni białej — jedno trafienie — albo na maksymalnie trzy
 * groty (łuk, kusza) — trzy trafienia; aktywny 1 minutę albo do zużycia. Trafienie zatrutą bronią
 * wystawia kartę: cel robi RO na Kondycję przeciw ST olejku, porażka — Zatrucie na 1 minutę,
 * cel powtarza RO na końcu swojej tury. **MG w pętli**: karta niczego nie nakłada sama, MG klika
 * przy zaznaczonym celu (wzorzec karty z `weapons/dozownik.mjs`).
 */

import { kartaProdukcji } from "./karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = "olejek";          // na przedmiocie-olejku: { st }
const FLAG_BRON = "olejekNaBroni"; // na broni: { st, wygasa (worldTime), ile }
const IMG = "icons/svg/poison.svg";
/** Stałe id aktywności „Nałóż na broń” (16 znaków — wymóg Foundry). */
const NALOZ_ID = "olejekNalozBron0";
const NALOZ_IDENT = "olejek-naloz";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** ST olejku: 8 + mod. Inteligencji + Premia Biegłości twórcy (s. 94). */
export function stOlejku(actor) {
  return 8 + (Number(actor?.system?.abilities?.int?.mod) || 0) + (Number(actor?.system?.attributes?.prof) || 0);
}

export function isOlejek(item) {
  return item?.flags?.[MODULE_ID]?.[FLAG] != null;
}

/** Dane przedmiotu-olejku. */
export function olejekItemData(st, { quantity = 1 } = {}) {
  return {
    name: `Olejek trujący (ST ${st})`,
    type: "consumable",
    img: IMG,
    system: {
      type: { value: "poison", subtype: "injury" },
      description: {
        value: `<p>Porcja trującego olejku (10 ml) — dzieło Truciciela. W Akcji Bonusowej nałóż na ostrze broni `
          + `albo na maksymalnie trzy groty; działa 1 minutę albo do użycia. Trafiony cel robi <strong>RO na Kondycję `
          + `ST ${st}</strong>, porażka — Zatrucie na 1 minutę (RO na końcu każdej jego tury).</p>`,
        chat: ""
      },
      quantity,
      weight: { value: 0.01, units: "kg" },
      price: { value: 0, denomination: "gb" },
      activities: {
        [NALOZ_ID]: {
          _id: NALOZ_ID,
          type: "utility",
          name: "Nałóż na broń",
          img: IMG,
          activation: { type: "bonus", value: 1 },
          visibility: { identifier: NALOZ_IDENT }
        }
      }
    },
    flags: { [MODULE_ID]: { [FLAG]: { st } } }
  };
}

/** Dokłada porcję olejku: do stosu z tym samym ST albo nowy przedmiot. */
export async function dodajOlejek(actor, st, ile = 1) {
  const stos = actor.items.find(i => i.flags?.[MODULE_ID]?.[FLAG]?.st === st);
  if (stos) {
    await stos.update({ "system.quantity": (Number(stos.system.quantity) || 0) + ile });
    return stos;
  }
  return (await actor.createEmbeddedDocuments("Item", [olejekItemData(st, { quantity: ile })]))[0];
}

/* -------------------------------------------- */
/*  Nałożenie na broń                           */
/* -------------------------------------------- */

function _ileTrafien(weapon) {
  // Łuki i kusze — groty (do trzech), wszystko inne — ostrze (jedno trafienie).
  return weapon.system?.type?.value === "miotana" && /luk|kusza/i.test(weapon.name ?? "") ? 3 : 1;
}

/** Aktywny olejek na broni (albo null, gdy wygasł lub zużyty). */
export function olejekNaBroni(weapon) {
  const f = weapon?.flags?.[MODULE_ID]?.[FLAG_BRON];
  if (!f || !(f.ile > 0)) return null;
  if (Number.isFinite(f.wygasa) && game.time.worldTime > f.wygasa) return null;
  return f;
}

/** Nałóż olejek na broń (Akcja Bonusowa — ekonomii akcji moduł nie liczy). */
export async function nalozOlejek(olejek, weapon = null) {
  const actor = olejek?.actor;
  if (!actor || !isOlejek(olejek)) return null;
  if (!weapon) {
    const bronie = actor.items.filter(i => i.type === "weapon" && (i.system?.type?.value === "biala" || i.system?.type?.value === "miotana"));
    if (!bronie.length) return ui.notifications.warn(`${actor.name}: nie ma broni białej ani miotanej, na którą da się nałożyć olejek.`);
    const id = await foundry.applications.api.DialogV2.wait({
      window: { title: `${olejek.name}: nałóż na…`, icon: "fa-solid fa-skull-crossbones" },
      content: `<label>Broń <select name="w">${bronie.map(b => `<option value="${b.id}">${esc(b.name)} (${_ileTrafien(b) === 3 ? "3 groty" : "ostrze"})</option>`).join("")}</select></label>`,
      buttons: [{ action: "ok", label: "Nałóż (Akcja Bonusowa)", default: true, callback: (e, b) => b.form.elements.w.value }]
    });
    weapon = id ? actor.items.get(id) : null;
    if (!weapon) return null;
  }
  const st = olejek.flags[MODULE_ID][FLAG].st;
  const ile = _ileTrafien(weapon);
  await weapon.setFlag(MODULE_ID, FLAG_BRON, { st, ile, wygasa: game.time.worldTime + 60 });
  const qty = Number(olejek.system.quantity) || 0;
  if (qty > 1) await olejek.update({ "system.quantity": qty - 1 });
  else await olejek.delete();
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: kartaProdukcji({
      ikona: IMG, tytul: `Olejek trujący (ST ${st})`, podtytul: "Nałożony", rodzaj: "info",
      linie: [`${esc(actor.name)} pokrywa ${ile === 3 ? "groty" : "ostrze"}: <strong>${esc(weapon.name)}</strong> — `
        + `${ile === 3 ? "trzy trafienia" : "jedno trafienie"}, najdłużej 1 minutę.`]
    })
  });
  return weapon;
}

/* -------------------------------------------- */
/*  Trafienie                                   */
/* -------------------------------------------- */

async function _onPostRollAttack(rolls, { subject } = {}) {
  const weapon = subject?.item;
  const f = olejekNaBroni(weapon);
  if (!f) return;
  const roll = rolls?.[0];
  if (!roll || roll.isFumble) return;
  const target = game.user.targets?.first?.() ?? null;
  const ac = target?.actor?.system?.attributes?.ac?.value;
  if (ac !== undefined && roll.total < ac) return;
  if (!weapon.isOwner) return;
  await weapon.setFlag(MODULE_ID, FLAG_BRON, { ...f, ile: f.ile - 1 });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: weapon.actor }),
    content: kartaProdukcji({
      ikona: IMG, tytul: `Zatruta broń: ${weapon.name}`, podtytul: "Trafienie", rodzaj: "braki",
      linie: [`${esc(target?.name ?? "Cel")} robi <strong>RO na Kondycję ST ${f.st}</strong> — porażka: Zatrucie na 1 minutę, `
        + `RO powtarzany na końcu każdej jego tury.`,
        `Olejku zostało: ${Math.max(0, f.ile - 1)} ${f.ile - 1 === 1 ? "trafienie" : "trafień"}.`],
      przyciski: [{ akcja: "olejek-ro", label: `RO zaznaczonego celu (ST ${f.st})`, gm: true, dane: { st: f.st }, ikona: "fa-solid fa-shield-virus" }]
    })
  });
}

async function _onClick(event) {
  const btn = event.target.closest?.('[data-neuro-robota="olejek-ro"]');
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const st = Number(btn.dataset.st) || 10;
  const target = canvas?.tokens?.controlled?.[0]?.actor ?? game.user.targets?.first?.()?.actor;
  if (!target) return ui.notifications.warn("Zaznacz żeton celu.");
  const rolls = await target.rollSavingThrow({ ability: "con", target: st }, {}, { data: { flavor: `RO na Kondycję — olejek trujący (ST ${st})` } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r) return;
  if (r.total < st) {
    await target.toggleStatusEffect("poisoned", { active: true });
    ui.notifications.info(`${target.name}: Zatrucie (RO ${r.total} < ${st}) — RO na końcu każdej tury, najdłużej minuta.`);
  }
}

/** „Nałóż na broń” z karty przedmiotu — własny przebieg zamiast natywnej karty użycia. */
function _onPreUseActivity(activity, usageConfig, dialogConfig, messageConfig) {
  if (activity?.visibility?.identifier !== NALOZ_IDENT) return;
  nalozOlejek(activity.item);
  return false;
}

export function registerOlejek() {
  Hooks.on("dnd5e.postRollAttack", _onPostRollAttack);
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  document.addEventListener("click", _onClick, { capture: true });
}

export const olejekApi = Object.freeze({ st: stOlejku, dodaj: dodajOlejek, naloz: nalozOlejek, naBroni: olejekNaBroni, isOlejek });
