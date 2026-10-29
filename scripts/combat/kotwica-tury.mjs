/**
 * Neuroshima 5e — kotwica tury (PLAN_m4_pojazdy D39, KT; z M3 `towarzysze-walka.mjs`).
 *
 * Jedno narzędzie dla trzech przypadków „działam tuż za kimś”:
 *
 *   - **wierzchowiec prowadzony** → jeździec (RAW s. 257: Inicjatywa wierzchowca wyrównuje się z jeźdźcem, rusza się w
 *     jego turze — własna tura pomijana),
 *   - **pasażer „Za kierowcą”** → kierowca (RAW s. 266: jednorazowo przesuwa turę za kierowcę; RAI także na mapie),
 *   - **towarzysz** → właściciel (M3: „zawsze po twojej turze”; wspólną inicjatywę trzyma jego `CombatantGroup`).
 *
 * Rejestr kotwic zastępuje drugie owinięcie `Combat#_sortCombatants`: jest **jedno** — tutaj. Wpis to funkcja
 * `fn(combatant) → Combatant|null` z priorytetem; pierwsza niepusta kotwica (najwyższy priorytet) wygrywa, więc koń,
 * który jest też towarzyszem, w siodle słucha jeźdźca (W-U6). Kotwice łańcuchują się (pies pasażera za pasażerem za
 * kierowcą) — porządek drzewa liczy `porownajUczestnikow`.
 *
 *   - **Kolejność**: uczestnik z kotwicą tuż za nią (porządek drzewa, `config/towarzysze-rules.mjs`).
 *   - **Inicjatywa** (`wyrownaj`): aktywny MG wpisuje uczestnikowi wartość korzenia łańcucha — tracker pokazuje spójną
 *     liczbę („wyrównuje się”). Po zdjęciu kotwicy wartość zostaje (zsiadający koń zachowuje Inicjatywę jeźdźca).
 *   - **Rzut**: za uczestnika z kotwicą rzuca jego korzeń, gdy jeszcze nie rzucał; inaczej rzutu nie ma.
 *   - **Pomijanie** (`pomin`): na początku tury takiego uczestnika aktywny MG — tylko krok naprzód, raz na turę — wysyła
 *     kartę i robi `nextTurn()` (wzór „bez komendy” towarzyszy).
 */

import { porownajUczestnikow } from "../config/towarzysze-rules.mjs";
import { krokNaprzod, tikRaz } from "./tiki.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Priorytety z D39: wierzchowiec prowadzony → pasażer „Za kierowcą” → towarzysz. */
export const PRIORYTET_KOTWICY = Object.freeze({ wierzchowiec: 30, zaKierowca: 20, towarzysz: 10 });

/**
 * @typedef {object} WpisKotwicy
 * @property {(c: Combatant) => Combatant|null} fn   bezpośrednia kotwica uczestnika w tej samej walce
 * @property {number} priorytet
 * @property {boolean} wyrownaj      inicjatywa = kotwicy (MG zapisuje)
 * @property {((c: Combatant, k: Combatant) => boolean)|null} pomin   tura pomijana, póki kotwica obowiązuje
 * @property {((c: Combatant, k: Combatant) => string)|null} karta    HTML linii karty pominięcia
 */

/** @type {Map<string, WpisKotwicy>} */
const _wpisy = new Map();
let _posortowane = [];

/**
 * Rejestruje rodzaj kotwicy.
 * @param {string} id
 * @param {(c: Combatant) => Combatant|null} fn
 * @param {{priorytet?: number, wyrownaj?: boolean, pomin?: Function|null, karta?: Function|null}} [o]
 */
export function zarejestrujKotwice(id, fn, { priorytet = 0, wyrownaj = false, pomin = null, karta = null } = {}) {
  _wpisy.set(id, { fn, priorytet, wyrownaj, pomin, karta });
  _posortowane = [..._wpisy.entries()].sort((a, b) => b[1].priorytet - a[1].priorytet);
}

/**
 * Pierwsza niepusta kotwica uczestnika: `{id, kotwica, wpis}` albo `null`. Kotwica musi być innym uczestnikiem tej
 * samej walki. Wołane bez `this` (rdzeń sortuje funkcją wolną).
 * @param {Combatant} combatant
 * @param {[string, WpisKotwicy][]} [wpisy]  posortowane wpisy (testy); domyślnie rejestr
 */
export function kotwicaWpisu(combatant, wpisy = _posortowane) {
  if (!combatant?.parent) return null;
  for (const [id, wpis] of wpisy) {
    let k = null;
    try { k = wpis.fn(combatant); } catch (err) { console.error(`${MODULE_ID} | kotwica „${id}”`, err); }
    if (k && k !== combatant && k.parent === combatant.parent) return { id, kotwica: k, wpis };
  }
  return null;
}

/** Bezpośrednia kotwica uczestnika albo `null`. */
export function kotwica(combatant) {
  return kotwicaWpisu(combatant)?.kotwica ?? null;
}

/** Korzeń łańcucha kotwic (sam uczestnik, gdy go nie kotwiczy nikt). Pętla urywa się na powtórzeniu. */
export function korzen(combatant) {
  let c = combatant;
  const byly = new Set([c?.id]);
  for (let k = kotwica(c); k && !byly.has(k.id); k = kotwica(k)) {
    byly.add(k.id);
    c = k;
  }
  return c;
}

/* -------------------------------------------- */
/*  Owinięcia — jedyne nad `_sortCombatants`     */
/* -------------------------------------------- */

function _owin() {
  const proto = CONFIG.Combat.documentClass.prototype;

  const sort = proto._sortCombatants;
  proto._sortCombatants = function (a, b) {
    return porownajUczestnikow(a, b, kotwica, (x, y) => sort.call(this, x, y));
  };

  const rollInitiative = proto.rollInitiative;
  proto.rollInitiative = async function (ids, options) {
    const lista = typeof ids === "string" ? [ids] : [...(ids ?? [])];
    const doRzutu = new Set();
    for (const id of lista) {
      const c = this.combatants.get(id);
      const k = c && kotwica(c) ? korzen(c) : null;
      if (!k || k === c) doRzutu.add(id);
      else if (k.initiative === null || k.initiative === undefined) doRzutu.add(k.id); // rzuca korzeń
    }
    const wynik = await rollInitiative.call(this, [...doRzutu], options);
    await uzgodnijInicjatywe(this);
    return wynik;
  };
}

/* -------------------------------------------- */
/*  Inicjatywa wyrównana — aktywny MG            */
/* -------------------------------------------- */

/**
 * Uczestnicy z kotwicą `wyrownaj` dostają inicjatywę korzenia łańcucha. Idempotentne; tylko aktywny MG.
 * @param {Combat} combat
 */
export async function uzgodnijInicjatywe(combat) {
  if (!combat || !game.users.activeGM?.isSelf) return;
  const zmiany = [];
  for (const c of combat.combatants) {
    const w = kotwicaWpisu(c);
    if (!w?.wpis.wyrownaj) continue;
    const ini = korzen(c).initiative;
    if (ini === null || ini === undefined || ini === c.initiative) continue;
    zmiany.push({ _id: c.id, initiative: ini });
  }
  if (zmiany.length) await combat.updateEmbeddedDocuments("Combatant", zmiany);
}

const _doUzgodnienia = new Set();
function _zaplanujUzgodnienie(combat) {
  if (!combat || !game.users.activeGM?.isSelf) return;
  if (_doUzgodnienia.has(combat.id)) return;
  _doUzgodnienia.add(combat.id);
  setTimeout(() => {
    _doUzgodnienia.delete(combat.id);
    if (game.combats.has(combat.id)) uzgodnijInicjatywe(combat).catch(err => console.error(`${MODULE_ID} | kotwica tury: inicjatywa`, err));
  }, 0);
}

/**
 * Po zmianie, która dodaje albo zdejmuje kotwicę (wsiadanie, „Za kierowcą”, zsiadanie): wyrównaj inicjatywę i
 * przelicz kolejność u wszystkich (tracker sortuje przy renderze).
 * @param {Combat} [combat]
 */
export function odswiezKotwice(combat = game.combat) {
  if (!combat) return;
  _zaplanujUzgodnienie(combat);
  combat.setupTurns?.();
  ui.combat?.render?.();
}

/* -------------------------------------------- */
/*  Pomijanie tury                               */
/* -------------------------------------------- */

async function _onTurnChange(combat, prior, current) {
  if (!game.users.activeGM?.isSelf || !krokNaprzod(prior, current)) return;
  const c = combat.combatants.get(current?.combatantId);
  const w = c ? kotwicaWpisu(c) : null;
  if (!w?.wpis.pomin?.(c, w.kotwica)) return;
  if (!c.actor || !await tikRaz(c.actor, `kotwica-${w.id}`, combat, { round: current.round, combatantId: c.id, krawedz: "start" })) return;
  const linia = w.wpis.karta?.(c, w.kotwica) ?? `<strong>${esc(c.name)}</strong> działa w turze ${esc(w.kotwica.name)}.`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: c.actor }),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="neuro-kotwica-tury"><p><i class="fa-solid fa-link"></i> ${linia} Tura pominięta.</p></div>`,
    flags: { [MODULE_ID]: { kotwicaTury: { combatId: combat.id, runda: current.round, combatantId: c.id, rodzaj: w.id } } }
  });
  // Ta tura się nie odbywa; jeśli MG już ją przestawił, nie przeskakujemy cudzej.
  if (combat.combatant?.id === c.id) await combat.nextTurn();
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

let _zarejestrowane = false;

/** Owinięcia i haki — raz, niezależnie od tego, kto pierwszy zawoła (towarzysze w `init`). */
export function registerKotwicaTury() {
  if (_zarejestrowane) return;
  _zarejestrowane = true;
  _owin();
  Hooks.on("combatTurnChange", (combat, prior, current) => {
    _onTurnChange(combat, prior, current).catch(err => console.error(`${MODULE_ID} | kotwica tury: pominięcie`, err));
  });
  Hooks.on("updateCombatant", (combatant, changes) => {
    if ("initiative" in changes) _zaplanujUzgodnienie(combatant.parent);
  });
  Hooks.on("createCombatant", combatant => _zaplanujUzgodnienie(combatant.parent));
}

export const kotwicaTuryApi = Object.freeze({ kotwica, korzen, kotwicaWpisu, uzgodnijInicjatywe, odswiezKotwice, PRIORYTET_KOTWICY });
