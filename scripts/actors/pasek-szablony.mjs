/**
 * Neuroshima 5e — szablony paska walki (PLAN_m8_ruch_i_ekonomia_akcji §8.3, E7).
 *
 * „Ułóż pasek” (panel Stan) układa dziesięć slotów pierwszej strony z tego, co postać rzeczywiście ma — model i planer
 * w `config/pasek-data.mjs`. Najpierw podgląd: co dojdzie, co się przesunie, co zderza się z makrem użytkownika (to
 * makro zostaje, element idzie za dziesiątkę). Zapis jednym `update` paska: przesunięte makra zdolności zostają na
 * pasku, więc synchronizator zdolności nie bierze ich za usunięte. Ułożenie zdejmuje zdolności szablonu z listy
 * usuniętych (jawne odtworzenie) i zapisuje wersję szablonu na użytkowniku dla tej postaci.
 *
 * Wygląd slotów (ikony, plakietki kosztu) należy do M9 — tu istniejące ikony i liczniki.
 */

import { SKROTY, SLOTY_SZABLONU, SZABLONY, WERSJA_SZABLONU, decyzjeKlasowe, planPaska } from "../config/pasek-data.mjs";
import { heldItems, dollState, isDollActor } from "./doll.mjs";
import { makroZdolnosci, zdolnosciPaska, zdolnoscMakra, odblokujZdolnosci } from "./ability-hotbar.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga makra przedmiotu z szablonu: `{ id, uuid, aktywnosc }`. */
const FLAGA_MAKRA = "szablonM8";
/** Flaga użytkownika: `{ [actorId]: { wersja, klasa, at } }` — ostatnie ułożenie szablonu. */
export const FLAGA_SZABLONU = "pasekSzablon";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Kandydaci z karty                            */
/* -------------------------------------------- */

const _zAtakiem = i => i?.type === "weapon" && !!i.system.activities?.some(a => a.type === "attack");

/**
 * Bronie z atakiem: najpierw w rękach, potem rozmieszczone na lalce (kabura, plecy…) albo założone; gdy nic nie jest
 * pod ręką — posiadane (np. świeża postać bez rozmieszczenia).
 */
function _bronie(actor) {
  const wRekach = heldItems(actor).map(h => h.item).filter(_zAtakiem);
  const reszta = [];
  if (isDollActor(actor)) {
    for (const id of dollState(actor).layout.slots.values()) {
      const it = actor.items.get(id);
      if (_zAtakiem(it)) reszta.push(it);
    }
  } else reszta.push(...actor.items.filter(i => _zAtakiem(i) && i.system.equipped));
  const podReka = [...new Set([...wRekach, ...reszta])];
  return podReka.length ? podReka : actor.items.filter(_zAtakiem).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

function _wpisAktywnosci(klucz, item, activity, label = null) {
  return activity ? { klucz, id: `item:${item.uuid}:${activity.id}`, label: label ?? item.name, item, activity } : null;
}

/** Pierwszy przedmiot zużywalny z akcją lub akcją bonusową (medpak, granat) — ekwipunek pod ręką. */
function _ekwipunek(actor) {
  const ok = i => i.type === "consumable" && (Number(i.system.quantity) || 0) > 0
    && i.system.activities?.some(a => ["action", "bonus"].includes(a.activation?.type));
  const it = actor.items.filter(ok).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];
  return it ? _wpisAktywnosci("ekwipunek", it, it.system.activities.find(a => ["action", "bonus"].includes(a.activation?.type))) : null;
}

/** Identyfikator klasy szablonu: klasa postaci z najwyższym poziomem, która ma szablon. */
export function klasaSzablonu(actor) {
  const klasy = Object.entries(actor?.classes ?? {}).sort(([, a], [, b]) => (b.system?.levels ?? 0) - (a.system?.levels ?? 0));
  return klasy.map(([id]) => id).find(id => SZABLONY[id]) ?? null;
}

/**
 * Dziesięć pozycji szablonu dla postaci (`null` — nie ma czego postawić).
 * @param {Actor} actor
 */
export function wpisySzablonu(actor) {
  const [bron, zapas] = _bronie(actor);
  const atak = i => i?.system.activities.find(a => a.type === "attack");
  // Obsługa broni (`weapons/magazine.mjs`): wymiana magazynka, przeładowanie (właściwość), ładowanie po naboju.
  const przeladuj = ["neuroMagSwap", "neuroReload", "neuroLoadOne"]
    .map(t => bron?.system.activities.find(a => a.type === t)).find(Boolean) ?? null;
  const zdolnosci = zdolnosciPaska(actor);
  const posiadane = zdolnosci.map(e => ({ id: e.abilityId, action: e.feature.action ?? null, level: e.feature.level ?? null }));
  const [k1, k2] = decyzjeKlasowe(klasaSzablonu(actor), posiadane);
  const wpisZdolnosci = (klucz, id) => {
    const e = id ? zdolnosci.find(x => x.abilityId === id) : null;
    return e ? { klucz, id: `zdolnosc:${id}`, label: e.feature.label, zdolnosc: e } : null;
  };
  const skrot = (klucz, akcja) => ({ klucz, id: `skrot:${akcja}`, label: SKROTY[akcja].label, skrot: akcja });
  return [
    _wpisAktywnosci("bron", bron, atak(bron)),
    _wpisAktywnosci("zapas", zapas, atak(zapas)),
    _wpisAktywnosci("obsluga", bron, przeladuj, przeladuj ? `${bron.name}: ${przeladuj.name}` : null),
    wpisZdolnosci("klasa1", k1),
    wpisZdolnosci("klasa2", k2),
    _ekwipunek(actor),
    skrot("unik", "dodging"),
    skrot("odstap", "odstapienie"),
    skrot("ruch", "ruch"),
    skrot("wiecej", "wiecej")
  ];
}

/* -------------------------------------------- */
/*  Makra                                        */
/* -------------------------------------------- */

const _autorem = (m, user) => (m?.getFlag(MODULE_ID, "userId") ?? m?._source?.author) === user.id;

/** Tożsamość makra modułu (`item:…`, `zdolnosc:…`, `skrot:…`) albo `null` — makro użytkownika. */
export function tozsamoscMakra(macro, user = game.user) {
  if (!macro) return null;
  const z = zdolnoscMakra(macro, user);
  if (z) return `zdolnosc:${z}`;
  const s = macro.getFlag(MODULE_ID, "skrotM8");
  if (s && _autorem(macro, user)) return `skrot:${s === "powstan" ? "padnij" : s}`;
  const t = macro.getFlag(MODULE_ID, FLAGA_MAKRA)?.id;
  return t && _autorem(macro, user) ? t : null;
}

/** Makro skrótu panelu (jedno na akcję i użytkownika) — też dla przeciągnięcia przycisku na pasek. */
export async function makroSkrotu(akcja, user = game.user) {
  const def = SKROTY[akcja];
  if (!def) return null;
  const istniejace = game.macros.find(m => m.getFlag(MODULE_ID, "skrotM8") === akcja && _autorem(m, user) && m.isOwner);
  return istniejace ?? Macro.create({
    name: def.label, type: "script", img: def.img, scope: "global", author: user.id,
    command: `game.neuroshima.skroty.uzyj("${akcja}");`,
    flags: { [MODULE_ID]: { skrotM8: akcja, userId: user.id } }
  });
}

async function _makroAktywnosci(w, user) {
  const istniejace = game.macros.find(m => m.getFlag(MODULE_ID, FLAGA_MAKRA)?.id === w.id && _autorem(m, user) && m.isOwner);
  if (istniejace) return istniejace;
  return Macro.create({
    name: w.label, type: "script", img: w.activity.img ?? w.item.img, scope: "global", author: user.id,
    command: `game.neuroshima.pasek.uzyj("${w.item.uuid}", "${w.activity.id}");`,
    flags: { [MODULE_ID]: { [FLAGA_MAKRA]: { id: w.id, uuid: w.item.uuid, aktywnosc: w.activity.id }, userId: user.id } }
  });
}

async function _makro(w, actor, user) {
  if (w.skrot) return makroSkrotu(w.skrot, user);
  if (w.zdolnosc) return makroZdolnosci(actor, w.zdolnosc, user);
  return _makroAktywnosci(w, user);
}

/** Cel makra przedmiotu z szablonu: aktywność tego przedmiotu (broń, przeładowanie, ekwipunek). */
export async function uzyjPrzedmiotu(uuid, aktywnosc, event = null) {
  const item = fromUuidSync(uuid);
  if (!item) return ui.notifications.warn("Tego przedmiotu już nie ma — ułóż pasek od nowa („Ułóż pasek” w panelu Stan).");
  const a = item.system.activities?.get(aktywnosc) ?? item.system.activities?.find(x => x.type === "attack");
  if (!a) return ui.notifications.warn(`${item.name}: brak tej czynności.`);
  return a.use({ event });
}

/* -------------------------------------------- */
/*  Plan i ułożenie                              */
/* -------------------------------------------- */

/** Obecny pasek dla planera: slot → `{id, nasze, nazwa}`. */
function _pasek(user) {
  const out = {};
  for (const [slot, id] of Object.entries(user.hotbar ?? {})) {
    if (!id) continue;
    const m = game.macros.get(id);
    if (!m) continue;
    const t = tozsamoscMakra(m, user);
    out[Number(slot)] = { id: t, nasze: !!t, nazwa: m.name, macroId: id };
  }
  return out;
}

const OPIS = { jest: "już jest", dodaj: "dojdzie", przenies: "przesunie się tu", konflikt: "slot zajęty", brak: "— (nic do postawienia)" };

function _podglad(actor, plan) {
  const slotTxt = s => (s === 10 ? "0" : String(s));
  const wiersze = plan.kroki.map(k => {
    let st = OPIS[k.akcja];
    if (k.akcja === "przenies" && k.z) st = `przesunie się ze slotu ${slotTxt(k.z)}`;
    if (k.akcja === "konflikt") st = `slot zajęty przez „${k.zajety}” — ${k.do ? `trafi do slotu ${k.do}` : "brak wolnego slotu"}`;
    return `<tr class="${k.akcja}"><th>${slotTxt(k.slot)}</th><td>${esc(SLOTY_SZABLONU[k.slot - 1].label)}</td><td>${esc(k.akcja === "brak" ? "" : k.label)}</td><td>${esc(st)}</td></tr>`;
  }).join("");
  const ods = plan.odsuniecia.map(o => `<li>${esc(o.nazwa)}: slot ${slotTxt(o.z)} → ${o.do ?? "brak miejsca (zostaje)"}</li>`).join("");
  return `<p>Szablon <strong>${esc(SZABLONY[klasaSzablonu(actor)]?.label ?? "ogólny")}</strong> dla ${esc(actor.name)} — sloty 1–0.
    Twoich makr nie ruszam: zajęty slot to konflikt.</p>
    <table class="neuro-pasek-podglad"><thead><tr><th>Slot</th><th>Pozycja</th><th>Co</th><th>Zmiana</th></tr></thead><tbody>${wiersze}</tbody></table>
    ${ods ? `<p>Makra modułu odsunięte za dziesiątkę:</p><ul>${ods}</ul>` : ""}`;
}

/**
 * Ułóż pasek z szablonu dla postaci (jawne żądanie, §8.3). Z podglądem — chyba że `podglad: false` (testy, makro).
 * @param {Actor} actor
 * @param {{user?: User, podglad?: boolean}} [o]
 * @returns {Promise<{plan: object, zapisane: boolean}|null>}
 */
export async function ulozPasek(actor, { user = game.user, podglad = true } = {}) {
  if (!actor || actor.type !== "character") return null;
  const wpisy = wpisySzablonu(actor);
  const obecny = _pasek(user);
  const plan = planPaska(wpisy, obecny);
  if (podglad) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Ułóż pasek — ${actor.name}` }, position: { width: 560 },
      content: _podglad(actor, plan), yes: { label: "Ułóż" }, no: { label: "Anuluj" }, rejectClose: false
    });
    if (!ok) return { plan, zapisane: false };
  }
  // Makra (tworzone przed zapisem paska) i końcowy układ — jeden zapis.
  const hotbar = { ...(user.hotbar ?? {}) };
  const przenoszone = new Set();
  for (const k of plan.kroki) if (k.akcja === "przenies" && k.z) przenoszone.add(k.z);
  // Odsunięcie bez wolnego slotu: makro zostaje tam, gdzie było, i nadpisze je krok tego slotu — nie znika „ręką”.
  for (const o of plan.odsuniecia) if (o.do) przenoszone.add(o.z);
  const stare = { ...hotbar };
  for (const s of przenoszone) delete hotbar[s];
  for (const o of plan.odsuniecia) if (o.do) hotbar[o.do] = stare[o.z];
  const zdolnosci = [];
  for (const k of plan.kroki) {
    if (k.akcja === "brak" || k.akcja === "jest" || !k.do) continue;
    const w = wpisy[k.slot - 1];
    if (k.akcja === "przenies" && k.z) hotbar[k.slot] = stare[k.z];
    else if (k.akcja === "konflikt" && k.z) { /* już na pasku: zostaje albo odsunięte wyżej */ }
    else {
      const m = await _makro(w, actor, user);
      if (!m) continue;
      hotbar[k.do] = m.id;
    }
    if (w.zdolnosc) zdolnosci.push(w.zdolnosc.abilityId);
  }
  // Konflikt bez wolnego slotu i wpisy „jest” nic nie zmieniają; zdolności szablonu wracają z listy usuniętych.
  if (zdolnosci.length) await odblokujZdolnosci(user, zdolnosci);
  await user.update({ hotbar }, { diff: false, recursive: false });
  await user.setFlag(MODULE_ID, FLAGA_SZABLONU, {
    ...(user.getFlag(MODULE_ID, FLAGA_SZABLONU) ?? {}),
    [actor.id]: { wersja: WERSJA_SZABLONU, klasa: klasaSzablonu(actor), at: Date.now() }
  });
  ui.hotbar?.render();
  return { plan, zapisane: true };
}

/** `game.neuroshima.pasek` — szablony paska. */
export const pasekApi = Object.freeze({
  uloz: ulozPasek, wpisy: wpisySzablonu, uzyj: uzyjPrzedmiotu, klasa: klasaSzablonu, tozsamosc: tozsamoscMakra, makroSkrotu
});
