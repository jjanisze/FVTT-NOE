/**
 * Neuroshima 5e — właściwości broni `długa`, `ciężka`, `jednorazowa` (PLAN_m6_drobne_zasady.md §5.3, E2).
 *
 * Reguły `długa` i `ciężka` to wiersze silnika okoliczności (`config/okolicznosci-ataku.mjs`); tu jest to, czego
 * silnik nie wie sam:
 *
 *   - **Stan broni** dla migawki ataku (`stanBroni`): właściwości (z broni, amunicji i ulepszeń — złożona kolba
 *     składana zdejmuje `długą` już w danych, `weapons/addons.mjs`), oparcie i SIŁ strzelca. Oparcie (s. 117 + U8):
 *     rozłożony dwójnóg albo trójnóg (przełącznik ulepszenia), stanowisko pojazdu (broń zamontowana, M4) albo ręczne
 *     „Oprzyj broń” z menu przedmiotu — murek, parapet, leżenie. Ręczne oparcie znika, gdy żeton strzelca się
 *     ruszy: oparcie jest w miejscu, nie w broni.
 *   - **Sygnał naruszenia (D11)** przy strzale ciężką bez oparcia — sam dźwięk; powód stoi już na plakietce ataku.
 *   - **`jednorazowa` (D8, U7):** po strzale wyrzutnia „znika, jej miejsce zajmuje złom” — po `dnd5e.postRollAttack`
 *     przedmiot broni idzie jak zużyta amunicja dnd5e: kopia do `system.deltas.deleted` karty ataku (przycisk
 *     „Obrażenia” i przerzuty dalej działają — `ChatMessage5e#getAssociatedItem` bierze ją, gdy przedmiotu już nie
 *     ma), potem kasacja i w tej samej ręce „Zużyta wyrzutnia” (`loot`, połowa wagi, bez ataku, do rozbiórki na
 *     surowce wg przepisu wyrzutni — `postoj/rozbiorka.mjs`). Atak nią — tylko jako broń improwizowana (M6 E3).
 */

import { hasAddon } from "../config/addons-data.mjs";
import { ciezkaBezOparcia } from "../config/okolicznosci-ataku.mjs";
import { handOf, isDollActor, SLOTS_FLAG } from "../actors/doll.mjs";
import { sygnalNaruszenia } from "../combat/sygnal-naruszenia.mjs";
import { activityRefOf } from "../config/chat-message-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga przełączników broni (`weapons/addons.mjs` `SETUP_FLAG`) — tam też leży stan rozłożenia dwójnogu. */
const SETUP_FLAG = "setup";
/** Klucz ręcznego oparcia w przełącznikach broni. */
export const OPARCIE = "oparcie";
/** Flaga „Zużytej wyrzutni”: `{ bron: id z katalogu, nazwa }`. */
export const FLAGA_ZUZYTEJ = "zuzytaWyrzutnia";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _setup = item => item?.flags?.[MODULE_ID]?.[SETUP_FLAG] ?? {};
const _wl = item => new Set(item?.system?.properties ?? []);

/* -------------------------------------------- */
/*  Stan broni (migawka ataku)                    */
/* -------------------------------------------- */

/**
 * @param {Item} item
 * @param {Actor} [actor]
 * @returns {import("../config/okolicznosci-ataku.mjs").StanBroni}
 */
export function stanBroni(item, actor = item?.actor) {
  const setup = _setup(item);
  const rozstawiona = (hasAddon(item, "dwojnog") && !!setup.dwojnog) || (hasAddon(item, "trojnog") && !!setup.trojnog);
  const naStanowisku = !!item?.flags?.[MODULE_ID]?.zamontowana;
  const sila = Number(actor?.system?.abilities?.str?.value);
  return {
    wlasciwosci: [..._wl(item)],
    oparta: rozstawiona || naStanowisku || !!setup[OPARCIE],
    sila: Number.isFinite(sila) ? sila : null
  };
}

/** Broń `ciężka` bez oparcia w tej chwili (RO przeciw jej serii z Ułatwieniem — `fire-modes.mjs`). */
export function bezOparcia(item) {
  return item?.type === "weapon" && ciezkaBezOparcia(stanBroni(item));
}

/* -------------------------------------------- */
/*  Oparcie ręczne (U8)                           */
/* -------------------------------------------- */

function _onGetItemContextOptions(item, options) {
  if (item?.type !== "weapon" || !_wl(item).has("ciezka")) return;
  const oparta = !!_setup(item)[OPARCIE];
  options.push({
    name: oparta ? "Zdejmij oparcie broni" : "Oprzyj broń (murek, parapet, leżenie)",
    icon: `<i class="fa-solid ${oparta ? "fa-arrow-up-from-bracket" : "fa-arrows-down-to-line"}"></i>`,
    condition: () => item.isOwner,
    callback: () => ustawOparcie(item, !oparta)
  });
}

/** Ręczne oparcie broni ciężkiej (U8). */
export async function ustawOparcie(item, wartosc) {
  await item.setFlag(MODULE_ID, SETUP_FLAG, { ..._setup(item), [OPARCIE]: !!wartosc });
  ui.notifications.info(`${item.name}: ${wartosc ? "oparta — bez Utrudnienia za ciężką" : "bez oparcia"}.`);
}

/** Oparcie jest w miejscu: ruch żetonu strzelca je zdejmuje (u tego, kto ruszył). */
function _onMoveToken(tokenDoc, _movement, _operation, user) {
  if (!user?.isSelf) return;
  const actor = tokenDoc.actor;
  const oparte = (actor?.items ?? []).filter(i => i.type === "weapon" && _setup(i)[OPARCIE]);
  if (!oparte.length) return;
  actor.updateEmbeddedDocuments("Item", oparte.map(i => ({ _id: i.id, [`flags.${MODULE_ID}.${SETUP_FLAG}.${OPARCIE}`]: false })));
}

/** D11: strzał ciężką bez oparcia — Utrudnienie stoi na plakietce, tu tylko dźwięk dla MG i właścicieli. */
function _onPreRollAttack(config) {
  const item = config?.subject?.item;
  if (!bezOparcia(item)) return;
  void sygnalNaruszenia(item.actor, { linie: [`${item.name}: broń ciężka bez oparcia`], karta: false });
}

/* -------------------------------------------- */
/*  Jednorazowa (D8)                             */
/* -------------------------------------------- */

/**
 * Dane „Zużytej wyrzutni” z przedmiotu broni (czyste): `loot`, połowa wagi (U7), ta sama ikona, bez ceny.
 * @param {object} bron   `item.toObject()`
 * @param {{slot?: string|null}} [opts]  slot ręki, w którym wyrzutnia była
 */
export function zuzytaWyrzutniaDane(bron, { slot = null } = {}) {
  const f = bron.flags?.[MODULE_ID] ?? {};
  const waga = Number(bron.system?.weight?.value) || 0;
  return {
    name: `Zużyta wyrzutnia (${bron.name})`,
    type: "loot",
    img: bron.img,
    system: {
      description: { value: `<p>Pusta rura po jednorazowym strzale (${esc(bron.name)}). Nie da się jej ponownie załadować `
        + "(s. 125). Nadaje się do rozbiórki na surowce albo jako broń improwizowana.</p>" },
      weight: { value: Math.round(waga * 50) / 100, units: bron.system?.weight?.units ?? "kg" },
      price: { value: 0, denomination: bron.system?.price?.denomination ?? "gb" },
      quantity: 1
    },
    flags: {
      [MODULE_ID]: {
        [FLAGA_ZUZYTEJ]: { bron: f.weaponId ?? null, nazwa: bron.name },
        // W ręce jak każdy przedmiot „tylko do ręki”; poza nią — plecak.
        dollSlot: "handOnly",
        ...(slot ? { [SLOTS_FLAG]: [slot] } : {})
      }
    }
  };
}

/** Karta ataku tej aktywności (najnowsza, mojego autorstwa). */
function _kartaAtaku(activity) {
  const uuid = activity?.uuid;
  return game.messages.contents.findLast(m => m.type === "attack" && m.isAuthor && activityRefOf(m)?.uuid === uuid) ?? null;
}

async function _zuzyj(item, activity) {
  const actor = item.actor;
  const slot = isDollActor(actor) ? handOf(item) : null;
  const dane = item.toObject();
  const karta = _kartaAtaku(activity);
  if (karta) {
    const deleted = [...(karta.system?.deltas?.deleted ?? []).map(d => d.toObject?.() ?? d), dane];
    await karta.update({ "system.deltas": { deleted } });
  }
  await actor.deleteEmbeddedDocuments("Item", [item.id]);
  await actor.createEmbeddedDocuments("Item", [zuzytaWyrzutniaDane(dane, { slot })], { neuroDoll: true });
  await ChatMessage.implementation.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div><strong>${esc(item.name)}</strong> — wyrzutnia jednorazowa: po strzale zostaje pusta rura (złom).</div>`
  });
}

function _onPostRollAttack(_rolls, { subject } = {}) {
  const item = subject?.item;
  if (item?.type !== "weapon" || !_wl(item).has("jednorazowa")) return;
  if (!item.actor?.isOwner || item.inCompendium || !item.actor.items.has(item.id)) return;
  // Ten, kto rzucił, robi zapis — hak odpala tylko u niego.
  _zuzyj(item, subject).catch(err => console.error(`${MODULE_ID} | jednorazowa`, err));
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerWlasciwosciBroni() {
  Hooks.on("dnd5e.getItemContextOptions", _onGetItemContextOptions);
  Hooks.on("moveToken", _onMoveToken);
  Hooks.on("dnd5e.preRollAttack", _onPreRollAttack);
  Hooks.on("dnd5e.postRollAttack", _onPostRollAttack);
}

/** `game.neuroshima.wlasciwosci` */
export const wlasciwosciApi = Object.freeze({ stanBroni, bezOparcia, ustawOparcie, zuzytaWyrzutniaDane });
