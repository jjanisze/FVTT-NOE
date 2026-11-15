/**
 * Neuroshima 5e — Pomaganie (NOE s. 30; PLAN_m8_ruch_i_ekonomia_akcji.md §6.3, E5, D9/W11).
 *
 * Dwie drukowane gałęzie i pomoc słowna, każda za Akcję pomagającego (poza własną turą — wykonanie w Reakcji, §6.4):
 *   - **test** (umiejętność albo narzędzie) — jedna biegłość pomagającego i sojusznik; pomagający robi test ST 10.
 *     Sukces: Ułatwienie w następnym zgodnym teście sojusznika (ta sama umiejętność/narzędzie), najpóźniej do początku
 *     następnej tury pomagającego. Porażka: A wydana, Ułatwienia nie ma. MG ocenia, czy pomoc w ogóle jest możliwa;
 *   - **atak** — wróg do 1,5 m od pomagającego (cel z `game.user.targets`) i sojusznik, bez testu. Ułatwienie w następnym
 *     ataku tego sojusznika na tego wroga — bez wymyślonego terminu (D9/W11; sprząta je dopiero koniec walki);
 *   - **słownie** — sama A; rozstrzyga stół (§2.2: bez analizy prozy, bez kary wymyślonej przez moduł).
 *
 * Pomoc leży na sojuszniku (`flags.<mod>.pomoc`): pisze właściciel sojusznika albo przekaźnik MG. Zużywa ją faktyczny
 * zgodny rzut sojusznika — po rzucie, także gdy inne Utrudnienie znosi Ułatwienie; otwarcie i anulowanie okna niczego
 * nie zużywa, Fuks jest tą samą próbą (pomoc już zdjęta). Niepowiązany rzut albo inny wróg — pomoc zostaje.
 */

import { akcja } from "../actors/actions.mjs";
import { kombatant, ledger, chwila } from "./ekonomia.mjs";
import { zarejestrujUlatwienieTestu } from "./ulatwienia-testow.mjs";
import { zarejestrujZrodloOkolicznosci } from "./okolicznosci.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_POMOC = "pomoc";
const PROSBA = "m8.pomoc";
/** ST testu pomagającego (s. 30). */
export const ST_POMOCY = 10;
/** Wróg do 1,5 m od pomagającego (s. 30). */
const OBOK_M = 1.5;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Wpisy pomocy                                 */
/* -------------------------------------------- */

/**
 * Czy pomoc jeszcze działa. Pomoc w teście z walki kończy się z początkiem następnej tury pomagającego (jego ledger
 * zapisał turę późniejszą niż ta, w której pomógł) albo z końcem tej walki. Pomoc w ataku i pomoc spoza walki — do
 * użycia (bez wymyślonego terminu).
 */
export function pomocAktualna(w) {
  if (!w || w.rodzaj !== "test" || !w.walka) return true;
  const combat = game.combats?.get(w.walka);
  if (!combat) return false;
  const c = combat.combatants.get(w.kombatant);
  if (!c) return true;
  return !ledger(c).tury.some(t => t.runda > (Number(w.cykl) || 0));
}

/** Aktualne wpisy pomocy na aktorze. */
export function pomoce(actor) {
  return (actor?.getFlag?.(MODULE_ID, FLAGA_POMOC) ?? []).filter(pomocAktualna);
}

/** Klucz testu: `skill:atl`, `tool:hakera`. */
const _kluczTestu = ({ skill = null, tool = null } = {}) => (skill ? `skill:${skill}` : tool ? `tool:${tool}` : null);

/** Pomoc pasująca do testu sojusznika (ta sama umiejętność/narzędzie) albo `null`. */
export function pomocTestu(actor, { skill = null, tool = null } = {}) {
  const k = _kluczTestu({ skill, tool });
  return k ? pomoce(actor).find(w => w.rodzaj === "test" && w.klucz === k) ?? null : null;
}

/** Pomoc w ataku sojusznika na tego wroga (UUID tokenu) albo `null`. */
export function pomocAtaku(actor, celUuid) {
  return celUuid ? pomoce(actor).find(w => w.rodzaj === "atak" && w.cel === celUuid) ?? null : null;
}

/** Zapis listy pomocy na sojuszniku (u właściciela albo MG): bez wygasłych. */
async function _zapisz(sojusznik, fn) {
  const teraz = (sojusznik.getFlag(MODULE_ID, FLAGA_POMOC) ?? []).filter(pomocAktualna);
  const nowe = fn(teraz);
  if (JSON.stringify(nowe) === JSON.stringify(sojusznik.getFlag(MODULE_ID, FLAGA_POMOC) ?? [])) return;
  await sojusznik.setFlag(MODULE_ID, FLAGA_POMOC, nowe);
}

/** Dodaj pomoc sojusznikowi — sam, gdy go piszesz; inaczej przez MG (przekaźnik). */
async function _dodaj(sojusznik, wpis, nosiciel) {
  if (sojusznik.isOwner) return _zapisz(sojusznik, lista => [...lista, wpis]);
  return doMG(PROSBA, { sojusznik: sojusznik.uuid, wpis }, { nosiciel });
}

async function _zdejmij(actor, id) {
  if (!actor?.isOwner) return;
  await _zapisz(actor, lista => lista.filter(w => w.id !== id));
}

/* -------------------------------------------- */
/*  Pomagaj                                      */
/* -------------------------------------------- */

/** Etykieta biegłości: umiejętność z dnd5e albo narzędzie. */
function _etykieta(klucz) {
  const [typ, id] = String(klucz ?? "").split(":");
  if (typ === "skill") return CONFIG.DND5E.skills?.[id]?.label ?? id;
  if (typ === "tool") return dnd5e.documents?.Trait?.keyLabel?.(id, { trait: "tool" }) ?? CONFIG.DND5E.tools?.[id]?.label ?? id;
  return id ?? "?";
}

/** Biegłości pomagającego, którymi może pomóc: umiejętności i narzędzia z biegłością. */
export function bieglosci(actor) {
  const out = [];
  for (const [id, s] of Object.entries(actor?.system?.skills ?? {})) if ((Number(s.value) || 0) >= 1) out.push(`skill:${id}`);
  for (const [id, t] of Object.entries(actor?.system?.tools ?? {})) if ((Number(t.value) || 0) >= 1) out.push(`tool:${id}`);
  return out.map(k => ({ klucz: k, label: _etykieta(k) })).sort((a, b) => a.label.localeCompare(b.label, "pl"));
}

/** Odległość między żetonami na siatce ich sceny (zajęte pola, środki) — sąsiednie pole = 1,5 m. Bez kanwy. */
function _odleglosc(a, b) {
  const grid = a.parent?.grid;
  if (!grid || grid.isGridless || a.parent !== b.parent) return null;
  const pa = a.getOccupiedGridSpaceOffsets().map(o => grid.getCenterPoint(o));
  const pb = b.getOccupiedGridSpaceOffsets().map(o => grid.getCenterPoint(o));
  let best = Infinity;
  for (const p of pa) for (const q of pb) best = Math.min(best, grid.measurePath([p, q]).distance);
  return Number.isFinite(best) ? Math.round(best * 100) / 100 : null;
}

/** Kontekst pomagającego: walka, kombatant i cykl (termin pomocy w teście). */
function _kontekst(actor) {
  const c = kombatant(actor);
  if (!c) return { walka: null, kombatant: null, cykl: null };
  return { walka: c.parent.id, kombatant: c.id, cykl: chwila(c).cykl };
}

async function _karta(pomagajacy, linie) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: pomagajacy }),
    content: `<div class="neuro-pomoc-karta"><p><strong>Pomaganie</strong> (s. 30)</p>${linie.map(l => `<p>${l}</p>`).join("")}</div>`
  });
}

/**
 * Pomaganie — wykonanie (API, okno i testy).
 * @param {Actor} pomagajacy
 * @param {object} o
 * @param {"test"|"atak"|"slownie"} o.galaz
 * @param {Actor} [o.sojusznik]
 * @param {string} [o.klucz]          test: `skill:atl` / `tool:…`
 * @param {TokenDocument} [o.wrog]    atak: token wroga
 * @param {number|null} [o.wynik]     test: gotowy wynik (testy, makro); bez niego pomagający rzuca
 * @returns {Promise<object|null>}  `null` — anulowano przed próbą (nic nie wydano)
 */
export async function pomoz(pomagajacy, { galaz, sojusznik = null, klucz = null, wrog = null, wynik = null } = {}) {
  if (!pomagajacy) return null;
  if (galaz === "slownie") {
    const r = await akcja(pomagajacy, { zrodlo: "Pomaganie (słownie)", tresc: "pomaganie" });
    return { galaz, koszt: r };
  }
  if (!sojusznik) return ui.notifications.warn("Pomaganie: wybierz sojusznika."), null;
  const kto = { uuid: pomagajacy.uuid, nazwa: pomagajacy.name };
  const id = foundry.utils.randomID();

  if (galaz === "test") {
    if (!klucz) return ui.notifications.warn("Pomaganie: wybierz biegłość."), null;
    let total = Number.isFinite(wynik) ? wynik : null;
    if (total === null) {
      // Próba pomagającego: test tą biegłością ST 10. Zamknięcie okna — nic nie wydane (§5.2).
      const [typ, kl] = klucz.split(":");
      const rolls = typ === "skill" ? await pomagajacy.rollSkill({ skill: kl, target: ST_POMOCY })
        : await pomagajacy.rollToolCheck({ tool: kl, target: ST_POMOCY });
      const roll = Array.isArray(rolls) ? rolls[0] : rolls;
      if (!roll) return null;
      total = roll.total;
    }
    const sukces = total >= ST_POMOCY;
    const koszt = await akcja(pomagajacy, { zrodlo: `Pomaganie (${_etykieta(klucz)}) → ${sojusznik.name}`, tresc: "pomaganie" });
    if (sukces) await _dodaj(sojusznik, { id, rodzaj: "test", klucz, od: kto, t: Date.now(), ..._kontekst(pomagajacy) }, pomagajacy);
    await _karta(pomagajacy, [
      `${esc(pomagajacy.name)} pomaga <strong>${esc(sojusznik.name)}</strong>: ${esc(_etykieta(klucz))}, test ${total} vs ST ${ST_POMOCY}.`,
      sukces ? `Sukces — Ułatwienie w następnym teście ${esc(_etykieta(klucz))} (${esc(sojusznik.name)}), najpóźniej do początku `
        + `następnej tury ${esc(pomagajacy.name)}.` : "Porażka — Akcja wydana, bez Ułatwienia."
    ]);
    return { galaz, sukces, total, koszt, id: sukces ? id : null };
  }

  if (galaz === "atak") {
    if (!wrog) return ui.notifications.warn("Pomaganie w ataku: wyceluj we wroga."), null;
    const ostrz = [];
    const mojZeton = wrog.parent?.tokens?.find(t => t.actor === pomagajacy || (t.actorLink && t.actorId === pomagajacy.id)) ?? null;
    const d = mojZeton ? _odleglosc(mojZeton, wrog) : null;
    if (d !== null && d > OBOK_M + 1e-6) ostrz.push(`wróg ${String(d).replace(".", ",")} m od ciebie — Pomaganie w ataku wymaga ≤ 1,5 m (s. 30).`);
    const koszt = await akcja(pomagajacy, { zrodlo: `Pomaganie (atak na ${wrog.name}) → ${sojusznik.name}`, tresc: "pomaganie" });
    await _dodaj(sojusznik, { id, rodzaj: "atak", cel: wrog.uuid, celNazwa: wrog.name, od: kto, t: Date.now(), ..._kontekst(pomagajacy) }, pomagajacy);
    await _karta(pomagajacy, [
      `${esc(pomagajacy.name)} pomaga <strong>${esc(sojusznik.name)}</strong> w ataku na <strong>${esc(wrog.name)}</strong>:`
        + ` Ułatwienie w następnym ataku ${esc(sojusznik.name)} na ten cel.`,
      ...ostrz.map(o => `⚠ ${esc(o)}`)
    ]);
    return { galaz, koszt, id, ostrz };
  }
  return null;
}

/* -------------------------------------------- */
/*  Okno                                         */
/* -------------------------------------------- */

/** Klawisz celowania z ustawień (nie wpisany na sztywno). */
function _klawiszCelu() {
  const b = game.keybindings?.get?.("core", "target")?.[0];
  try { return b ? foundry.applications.sidebar.apps.ControlsConfig.humanizeBinding(b) : "T"; } catch (_e) { return "T"; }
}

/**
 * Okno Pomagania z karty: gałąź, sojusznik, biegłość; wróg — twój cel. Bez obowiązkowych pól poza tym, co drukowane.
 * @param {Actor} actor
 */
export async function oknoPomocy(actor) {
  const scena = canvas?.scene;
  const ja = actor.getActiveTokens?.(false, true)?.[0] ?? null;
  const cele = [...(game.user.targets ?? [])].map(t => t.document);
  const wrog = cele.length === 1 ? cele[0] : null;
  const kandydaci = (scena?.tokens ?? []).filter(t => t.actor && t.actor !== actor && t.id !== ja?.id && t.id !== wrog?.id && !t.hidden);
  const sojusznicy = [...new Map(kandydaci.map(t => [t.actor.uuid, t])).values()];
  const domyslny = sojusznicy.find(t => t.disposition === ja?.disposition) ?? sojusznicy[0] ?? null;
  const opcjeSoj = sojusznicy.map(t => `<option value="${esc(t.actor.uuid)}"${t === domyslny ? " selected" : ""}>${esc(t.name)}</option>`).join("");
  const bieg = bieglosci(actor).map(b => `<option value="${esc(b.klucz)}">${esc(b.label)}</option>`).join("");
  const dane = await foundry.applications.api.DialogV2.input({
    window: { title: `Pomaganie — ${actor.name}`, icon: "fa-solid fa-handshake-angle" },
    position: { width: 440 },
    content: `<p class="hint">Akcja (s. 30). MG ocenia, czy pomoc jest możliwa.</p>`
      + `<div class="form-group"><label>Jak</label><select name="galaz">`
      + `<option value="test">Test — Ułatwienie w następnym teście sojusznika (twój test ST ${ST_POMOCY})</option>`
      + `<option value="atak"${wrog ? " selected" : ""}>Atak — Ułatwienie w jego następnym ataku na twój cel</option>`
      + `<option value="slownie">Słownie — sama Akcja, rozstrzyga stół</option></select></div>`
      + `<div class="form-group"><label>Sojusznik</label><select name="sojusznik">${opcjeSoj || "<option value=\"\">— brak na scenie —</option>"}</select></div>`
      + `<div class="form-group"><label>Biegłość (test)</label><select name="klucz">${bieg || "<option value=\"\">— brak biegłości —</option>"}</select></div>`
      + `<p class="hint">Wróg (atak): ${wrog ? `<strong>${esc(wrog.name)}</strong>` : `wyceluj w jednego wroga (klawisz ${esc(_klawiszCelu())})`}.</p>`,
    ok: { label: "Pomóż", icon: "fa-solid fa-handshake-angle" },
    rejectClose: false
  });
  if (!dane) return null;
  const sojusznik = dane.sojusznik ? await fromUuid(dane.sojusznik) : null;
  return pomoz(actor, { galaz: dane.galaz, sojusznik, klucz: dane.klucz || null, wrog });
}

/* -------------------------------------------- */
/*  Haki: Ułatwienie i zużycie                   */
/* -------------------------------------------- */

function _poTescie(data, typ) {
  const actor = data?.subject;
  if (!(actor instanceof Actor) || !actor.isOwner) return;
  const w = pomocTestu(actor, typ === "skill" ? { skill: data.skill } : { tool: data.tool });
  if (w) void _zdejmij(actor, w.id);
}

export function registerPomaganie() {
  zarejestrujProsbe(PROSBA, async (_nosiciel, { sojusznik, wpis } = {}) => {
    const a = sojusznik ? await fromUuid(sojusznik) : null;
    if (a && wpis?.id) await _zapisz(a, lista => [...lista.filter(w => w.id !== wpis.id), wpis]);
  });
  // Test sojusznika: Ułatwienie domyślne w oknie (ten sam rejestr co zdolności — gracz i MG mogą zmienić).
  zarejestrujUlatwienieTestu({
    id: "pomaganie", label: "Pomaganie", rzut: ["skill:*", "tool:*"], rodzaj: "ulatwienie",
    gdy: ctx => !!pomocTestu(ctx.actor, { skill: ctx.typ === "skill" ? ctx.skill : null, tool: ctx.typ === "tool" ? ctx.tool : null }),
    ma: actor => pomoce(actor).some(w => w.rodzaj === "test")
  });
  // Atak sojusznika na tego wroga: Ułatwienie w silniku okoliczności ataku.
  zarejestrujZrodloOkolicznosci("pomaganie", ctx => {
    const cel = ctx.targets?.length === 1 ? ctx.targets[0].document?.uuid : null;
    const w = pomocAtaku(ctx.actor, cel);
    return w ? [{ rodzaj: "ulatwienie", label: `Pomaganie (${w.od?.nazwa ?? "?"})`, strona: "s. 30" }] : null;
  });
  // Zużycie po faktycznym rzucie (nie przy otwarciu okna).
  Hooks.on("dnd5e.rollSkill", (_rolls, data) => _poTescie(data, "skill"));
  Hooks.on("dnd5e.rollToolCheck", (_rolls, data) => _poTescie(data, "tool"));
  Hooks.on("dnd5e.rollAttack", (_rolls, { subject } = {}) => {
    const actor = subject?.actor;
    const cele = [...(game.user.targets ?? [])];
    if (!actor?.isOwner || cele.length !== 1) return;
    const w = pomocAtaku(actor, cele[0].document.uuid);
    if (w) void _zdejmij(actor, w.id);
  });
  // Koniec walki — pomoc z tej walki znika (sprzątanie, jak zapowiedzi ataku).
  Hooks.on("deleteCombat", combat => {
    if (!game.users.activeGM?.isSelf) return;
    for (const c of combat.combatants) {
      const a = c.actor;
      const lista = a?.getFlag(MODULE_ID, FLAGA_POMOC);
      if (lista?.some(w => w.walka === combat.id)) void a.setFlag(MODULE_ID, FLAGA_POMOC, lista.filter(w => w.walka !== combat.id));
    }
  });
}

export const pomaganieApi = Object.freeze({ pomoz, okno: oknoPomocy, pomoce, pomocTestu, pomocAtaku, bieglosci });
