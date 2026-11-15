/**
 * Neuroshima 5e — warstwa akcji: fasada `game.neuroshima.actions` (PLAN_m7 §3.0.1; PLAN_m8 §5–§6, E1–E2, E4).
 *
 * Jeden zapis kosztów: ledger walczącego (`combat/ekonomia.mjs`, zasady `config/ekonomia-data.mjs`). Tutaj wejścia:
 *
 *   - **`zadeklaruj(actor, "A"|"B"|"R"|"I", { zrodlo })`** — zgodne z M7: wydatek w ledgerze, sygnał naruszenia przy
 *     przekroczeniu/zakazie (szept do MG i właścicieli, dźwięk). Poza walką nic.
 *   - **`dodatkowa(actor, kind)`** — grant jednej akcji w tej turze (Zryw, s. 87); sam grant niczego nie wydaje.
 *   - **`deklaruj(actor, "przyspieszenie"|"bieganie"|"unikanie"|"odstapienie"|"padnij"|"powstan")`** — akcja z kartą,
 *     paletą Ruch i makrem: koszt, grant ruchu z Szybkości w chwili wykonania (D14), stan raz przy wykonaniu. Poza
 *     własną turą — wykonanie w Reakcji z wyłącznie świeżym grantem (D30).
 *   - **`wyczekaj(actor, {opis})`** — Wyczekanie [A], przygotowanie; **`reaguj(actor, {przygotowanie|slowna})`** —
 *     wykonanie w R; **`uzbroj(actor)`** — następna operacja w R także we własnej turze (§6.4). Użycie przedmiotu [A]
 *     poza własną turą to wykonanie wyczekanej akcji: R zamiast A.
 *   - **`koryguj(actor, {...})`**, **`zakonczReakcje(actor)`** — normalne funkcje, nie edycja flag (§8.1).
 *   - **`stan(cel)`** — podgląd pul i ruchu bez zapisu.
 *   - **Natywne aktywności** z aktywacją `reaction` / `bonus` / `action` (bez ataków — instancje Atakowania, §7.1)
 *     deklarują same (`dnd5e.postUseActivity`). Przepływy modułu, które anulują natywną aktywność, wołają lejek wprost.
 *   - **Znaczniki R/B** (M7) są projekcją ledgera; założenie/zdjęcie ich z HUD-u to korekta (§1 zasada 6).
 *
 * Oznacza, nie blokuje: nic tu nie zatrzymuje akcji (§1 zasada 3).
 */

import { AKCJE, AKTYWACJA_DO_AKCJI, opisZnacznika } from "../config/actions-data.mjs";
import * as E from "../config/ekonomia-data.mjs";
import {
  OPCJA, chwila, daneAktora, kombatant, ledger, registerEkonomia, stan, wykonawca, zarejestrujProjekcje, zatwierdz,
  oczekujace, ponowOczekujace
} from "../combat/ekonomia.mjs";
import { sygnalNaruszenia } from "../combat/sygnal-naruszenia.mjs";
import { zarejestrujEfektTuryWlasciciela } from "../combat/czas-efektu.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** `flags.<mod>.akcjaZuzyta = { kind, uzycia: [{zrodlo}], limit, m8: true }` na efekcie znacznika. */
export const FLAG_ZNACZNIK = "akcjaZuzyta";

const STATUSY = new Set(Object.values(AKCJE).map(a => a.status));
const KIND_STATUSU = Object.fromEntries(Object.values(AKCJE).map(a => [a.status, a.kind]));

/** Efekt-znacznik (nasz albo założony z HUD-u). */
function _jestZnacznikiem(effect) {
  return effect?.getFlag?.(MODULE_ID, FLAG_ZNACZNIK) != null || [...(effect?.statuses ?? [])].some(s => STATUSY.has(s));
}

/**
 * Znacznik danego rodzaju na aktorze albo `null` (projekcja ledgera).
 * @param {Actor} actor
 * @param {"R"|"B"} kind
 * @returns {ActiveEffect|null}
 */
export function znacznik(actor, kind) {
  const def = AKCJE[kind];
  if (!actor || !def) return null;
  return actor.effects.find(e => e.getFlag(MODULE_ID, FLAG_ZNACZNIK)?.kind === kind || e.statuses?.has(def.status)) ?? null;
}

/* -------------------------------------------- */
/*  Wydatki                                      */
/* -------------------------------------------- */

const _tytul = (actor, kind, zrodlo) => `${actor.name} — ${E.NAZWY[kind] ?? kind}: ${zrodlo}`;

async function _sygnal(actor, tytul, powody) {
  if (powody?.length) await sygnalNaruszenia(actor, { tytul, linie: powody });
}

/**
 * Zadeklaruj użycie akcji (zgodne z M7 dla R/B).
 * @param {Actor} actor
 * @param {"A"|"B"|"R"|"I"} kind
 * @param {{zrodlo?: string, id?: string, cel?: string|null, sygnal?: boolean}} [o]
 * @returns {Promise<{poza?: boolean, oczekuje?: boolean, duplikat?: boolean, naruszenie?: boolean, powody?: string[]}|null>}
 */
export async function zadeklaruj(actor, kind, { zrodlo = "?", id = null, cel = null, sygnal = true } = {}) {
  if (!actor || !E.RODZAJE.includes(kind)) return null;
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const r = await zatwierdz(c, { ...(id ? { id } : {}), zrodlo, cel, koszt: { [kind]: 1 } });
  if (r.oczekuje) return { oczekuje: true, naruszenie: false, powody: [] };
  if (r.odmowa) return { odmowa: true, naruszenie: false, powody: [] };
  if (r.duplikat) return { duplikat: true, naruszenie: false, powody: [] };
  const powody = r.ostrz ?? [];
  if (sygnal) await _sygnal(actor, _tytul(actor, kind, zrodlo), powody);
  return { naruszenie: powody.length > 0, powody };
}

/**
 * Akcja [A] z wejścia modułu albo natywnej aktywności (Używanie, Pomaganie): we własnej turze A, poza nią — albo przy
 * uzbrojonej Reakcji — wykonanie w R (§6.4, T41): dołącza do reakcji otwartej bez akcji, inaczej nowa R. Sygnał
 * naruszenia jak `zadeklaruj`.
 * @param {Actor} actor
 * @param {{zrodlo?: string, cel?: string|null, tresc?: string, id?: string}} [o]
 */
export async function akcja(actor, { zrodlo = "?", cel = null, tresc = "akcja", id = null, ile = 1 } = {}) {
  if (!actor) return null;
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const l = ledger(c);
  const ch = chwila(c, l);
  const uzbrojona = _zuzyjUzbrojenie(actor);
  const wR = !ch.wlasna || uzbrojona;
  const z = wR ? E.zadanieWReakcji(l, ch, { zrodlo: `${zrodlo} (w Reakcji)`, cel, tresc })
    : { rodzaj: "akcja", zrodlo, koszt: { A: Math.max(1, Number(ile) || 1) }, ...(cel ? { cel } : {}) };
  const r = await zatwierdz(c, { ...(id ? { id } : {}), ...z, chwila: ch });
  if (r?.oczekuje) return { oczekuje: true, naruszenie: false, powody: [], wR };
  if (r?.odmowa || r?.duplikat) return { ...r, wR };
  const powody = r?.ostrz ?? [];
  await _sygnal(actor, _tytul(actor, wR ? "R" : "A", z.zrodlo), powody);
  return { ...r, naruszenie: powody.length > 0, powody, wR };
}

/**
 * Darmowa interakcja [I] (s. 25, 31, 37): dobycie, schowanie, podniesienie. Gdy [I] tej tury już zużyta — kolejna
 * to Używanie [A] (zamiast drugiej darmowej I), które może pokryć ograniczony grant Szybkich rąk.
 * @param {Actor} actor
 * @param {{zrodlo?: string, id?: string}} [o]
 */
export async function interakcja(actor, { zrodlo = "?", id = null } = {}) {
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const l = ledger(c);
  const p = E.pule(l, chwila(c, l), daneAktora(c.actor)).I;
  if (p.pozostalo > 0 || p.zakaz) return zadeklaruj(actor, "I", { zrodlo, ...(id ? { id } : {}) });
  return akcja(actor, { zrodlo: `${zrodlo} — Używanie (Darmowa interakcja już wykorzystana)`, cel: "uzywanie", ...(id ? { id } : {}) });
}

/**
 * Dodatkowa akcja w tej turze (Zryw, s. 87): grant jednej A albo B. Sam grant nie wydaje akcji.
 * @param {Actor} actor
 * @param {"A"|"B"} kind
 * @param {{zrodlo?: string, id?: string, ogr?: string|null}} [o]  `ogr` — ograniczenie (Szybkie ręce: "uzywanie")
 */
export async function dodatkowa(actor, kind, { zrodlo = "Zryw", id = null, ogr = null } = {}) {
  if (!actor || !["A", "B"].includes(kind)) return null;
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const ch = chwila(c);
  const ostrz = ch.wlasna ? [] : [`${zrodlo}: tylko we własnej turze.`];
  return zatwierdz(c, { ...(id ? { id } : {}), rodzaj: "grant", zrodlo, koszt: {}, grant: { typ: kind, ile: 1, ...(ogr ? { ogr } : {}) }, ostrz });
}

/**
 * Korekta (§5.1): kogo/co poprawiono i dlaczego; nie kasuje dowodów innej operacji.
 * @param {Actor} actor
 * @param {{koszt?: object, ruch?: number, powod?: string, zrodlo?: string}} o
 *   `koszt` — delty A/B/R/I (ujemne zwalniają), `ruch` — dopisana (+) albo zwrócona (−) pojemność ruchu.
 */
export async function koryguj(actor, { koszt = {}, ruch = 0, powod = "korekta", zrodlo = "Korekta" } = {}) {
  const c = kombatant(actor);
  if (!c) return { poza: true };
  if (ruch) return zatwierdz(c, { rodzaj: "korektaRuchu", zrodlo, powod, ileRuchu: Number(ruch) || 0 });
  return zatwierdz(c, { rodzaj: "korekta", zrodlo, powod, koszt });
}

/**
 * Deklaracja akcji z palety/karty/makra. Wykonanie raz: koszt, grant i stan razem (§5.2).
 * @param {Actor} actor
 * @param {string} id  klucz `DEKLARACJE`
 * @param {{tryb?: string, koszt?: object|null, zrodlo?: string|null, bezPadnijPowstan?: boolean}} [o]
 */
export async function deklaruj(actor, id, o = {}) {
  const def = E.DEKLARACJE[id];
  if (!actor || !def) return null;
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const l = ledger(c);
  const ch = chwila(c, l);
  const aktor = daneAktora(c.actor);
  const tryb = o.tryb ?? c.token?.movementAction ?? "walk";
  const wReakcji = _zuzyjUzbrojenie(actor);
  const { zadanie } = E.zadanieDeklaracji(id, l, ch, aktor, { ...o, tryb, wReakcji });
  const r = await zatwierdz(c, { ...zadanie, chwila: ch });
  if (r.ok && !r.duplikat) {
    // Skutki raz, po zapisie kosztu: stan nakłada wykonujący (właściciel albo MG), nie projekcja.
    const a = c.actor;
    if (zadanie.status && !a.statuses.has(zadanie.status)) await a.toggleStatusEffect(zadanie.status, { active: true });
    if (zadanie.zdejmij && a.statuses.has(zadanie.zdejmij)) await a.toggleStatusEffect(zadanie.zdejmij, { active: false });
  }
  if (!r.duplikat) await _sygnal(actor, `${actor.name} — ${def.nazwa}`, r.ostrz ?? []);
  return r;
}

/**
 * Zmęczenie po Berserku (s. 67, D24): od rzeczywistego końca Berserku do końca następnej własnej tury — zakaz A/B/I/R,
 * który przetrwa odświeżenie pul. Ruchu nie odbiera. Id stałe na koniec — ponowienie nie daje drugiej kary.
 * @param {Actor} actor
 * @param {{id?: string, zrodlo?: string}} [o]
 */
export async function zmeczenie(actor, { id = null, zrodlo = "Koniec Berserku" } = {}) {
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const ch = chwila(c);
  return zatwierdz(c, { ...(id ? { id } : {}), rodzaj: "zakaz", zrodlo, koszt: {}, chwila: ch,
    zakaz: { rodzaj: "zmeczenie", konczy: ch.cykl + 1 } });
}

/* -------------------------------------------- */
/*  Wyczekanie i Reakcja (§6.4)                  */
/* -------------------------------------------- */

/**
 * Uzbrojone reakcje tego klienta (Reaguj → uzbrój): następna obsługiwana operacja aktora — użycie przedmiotu,
 * deklaracja — idzie w R także we własnej turze (wyzwalacz w twojej turze). Samo uzbrojenie niczego nie wydaje.
 * @type {Map<string, number>}
 */
const _uzbrojone = new Map();

/** Uzbrój (albo rozbrój) Reakcję aktora na tym kliencie. */
export function uzbroj(actor, wl = true) {
  if (!actor) return false;
  if (wl) _uzbrojone.set(actor.uuid, Date.now());
  else _uzbrojone.delete(actor.uuid);
  return !!wl;
}

/** Czy Reakcja aktora jest uzbrojona na tym kliencie. */
export const uzbrojona = actor => _uzbrojone.has(actor?.uuid);

function _zuzyjUzbrojenie(actor) {
  const jest = _uzbrojone.has(actor?.uuid);
  if (jest) _uzbrojone.delete(actor.uuid);
  return jest;
}

/**
 * Wyczekanie [A] (s. 30): przygotowanie z opcjonalną notatką i czynnością. Bez edytora warunku i bez akceptacji MG;
 * pominięta okazja niczego nie wydaje, początek twojej tury kończy przygotowanie bez zwrotu A.
 * @param {Actor} actor
 * @param {{opis?: string, akcja?: string|null, id?: string}} [o]
 */
export async function wyczekaj(actor, { opis = "", akcja = null, id = null } = {}) {
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const ch = chwila(c);
  const { zadanie } = E.zadanieWyczekania(ch, { opis, akcja });
  const r = await zatwierdz(c, { ...(id ? { id } : {}), ...zadanie, chwila: ch });
  if (!r.duplikat) await _sygnal(actor, `${actor.name} — Wyczekanie`, r.ostrz ?? []);
  return r;
}

/**
 * Reakcja (R): wykonanie przygotowania (otwiera kontekst reakcji: ruch tylko ze świeżych grantów, D30; następna
 * deklaracja do niego należy) albo reakcja zagrana słownie (od razu zamknięta).
 * @param {Actor} actor
 * @param {{przygotowanie?: string|null, slowna?: boolean, zrodlo?: string|null, id?: string}} [o]
 */
export async function reaguj(actor, { przygotowanie = null, slowna = false, zrodlo = null, id = null } = {}) {
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const l = ledger(c);
  const ch = chwila(c, l);
  const { zadanie } = E.zadanieReakcji(l, ch, { przygotowanie, slowna, zrodlo });
  const r = await zatwierdz(c, { ...(id ? { id } : {}), ...zadanie, chwila: ch });
  if (!r.duplikat) await _sygnal(actor, `${actor.name} — ${zadanie.zrodlo}`, r.ostrz ?? []);
  return r;
}

/** Zakończ trwającą reakcję (ruch przerwany/narracyjny — §4.3). */
export async function zakonczReakcje(actor) {
  const c = kombatant(actor);
  if (!c) return { poza: true };
  const l = ledger(c);
  const r = E.aktywnaReakcja(l, chwila(c, l).cykl);
  if (!r) return { ok: true, brak: true };
  return zatwierdz(c, { rodzaj: "reakcjaKoniec", zrodlo: r.zrodlo, koszt: {}, reakcjaKoniec: r.id });
}

/* -------------------------------------------- */
/*  Projekcja: znaczniki R/B                      */
/* -------------------------------------------- */

/** Deterministyczne `_id` stanu z `CONFIG.statusEffects` — po nim rdzeń (`toggleStatusEffect`, HUD) znajduje efekt. */
const _idStanu = status => CONFIG.statusEffects.find(s => s.id === status)?._id ?? null;

function _danyEfektu(def, zapis) {
  const id = _idStanu(def.status);
  return {
    ...(id ? { _id: id } : {}),
    name: def.nazwa === "Reakcja" ? "Reakcja zużyta" : "Akcja bonusowa zużyta",
    img: CONFIG.statusEffects.find(s => s.id === def.status)?.img ?? "icons/svg/clockwork.svg",
    statuses: [def.status],
    duration: { value: 1, units: "turns", expiry: "turnStart" },
    description: `<p>${foundry.utils.escapeHTML(opisZnacznika(def.kind, zapis))}</p>`,
    flags: { [MODULE_ID]: { [FLAG_ZNACZNIK]: { kind: def.kind, ...zapis, m8: true } } }
  };
}

/** Zapis znacznika z ledgera: źródła wydatków danego rodzaju w cyklu i pojemność. */
function _zapisZLedgera(l, ch, kind) {
  const uzycia = l.ops.filter(o => o.cykl === ch.cykl && !o.ogr && (o.koszt?.[kind] ?? 0) > 0).map(o => ({ zrodlo: o.zrodlo }));
  const p = E.pule(l, ch)[kind];
  return { uzycia, limit: p.pojemnosc, wydane: p.wydane };
}

/** Znacznik iff wydano w cyklu (R) / turze (B). Stare znaczniki M7 (bez `m8`) wchodzą do ledgera jako korekta. */
async function _projekcjaZnacznikow(c, l) {
  const actor = c.actor;
  if (!actor) return;
  const ch = chwila(c, l);
  for (const def of Object.values(AKCJE)) {
    const efekt = znacznik(actor, def.kind);
    const zapis = _zapisZLedgera(l, ch, def.kind);
    if (efekt && !efekt.getFlag(MODULE_ID, FLAG_ZNACZNIK)?.m8 && zapis.wydane <= 0) {
      // Znacznik sprzed M8 albo z HUD-u bez zapisu: zachowaj jako korektę, nie kasuj cudzego stanu (§9 migracja).
      // Projekcja biegnie w kolejce zapisu tego ledgera: import idzie osobnym zapisem, po bieżącym (bez zakleszczenia).
      const stary = efekt.getFlag(MODULE_ID, FLAG_ZNACZNIK);
      const n = Math.max(1, stary?.uzycia?.length ?? 1);
      const z = { id: `import-${efekt.id}-${ch.cykl}`, rodzaj: "korekta", zrodlo: stary?.uzycia?.map(u => u.zrodlo).join(", ") || "HUD",
        powod: "znacznik sprzed ledgera", koszt: { [def.kind]: n }, chwila: ch };
      setTimeout(() => { void zatwierdz(c, z); }, 0);
      continue;
    }
    const wszystkie = actor.effects.filter(e => e.getFlag(MODULE_ID, FLAG_ZNACZNIK)?.kind === def.kind || e.statuses?.has(def.status));
    if (zapis.wydane > 0) {
      const opis = `<p>${foundry.utils.escapeHTML(opisZnacznika(def.kind, zapis))}</p>`;
      const id = _idStanu(def.status);
      // Jeden znacznik pod `_id` stanu; stare (losowe id, sprzed M8) i duplikaty — precz, żeby HUD je widział.
      const wlasciwy = wszystkie.find(e => !id || e.id === id) ?? null;
      const zbedne = wszystkie.filter(e => e !== wlasciwy).map(e => e.id);
      if (zbedne.length) await actor.deleteEmbeddedDocuments("ActiveEffect", zbedne, { [OPCJA]: true });
      if (!wlasciwy) await actor.createEmbeddedDocuments("ActiveEffect", [_danyEfektu(def, zapis)], { [OPCJA]: true, keepId: true });
      else {
        const f = wlasciwy.getFlag(MODULE_ID, FLAG_ZNACZNIK) ?? {};
        if (!f.m8 || JSON.stringify(f.uzycia) !== JSON.stringify(zapis.uzycia) || f.limit !== zapis.limit) {
          await wlasciwy.update({ description: opis, [`flags.${MODULE_ID}.${FLAG_ZNACZNIK}`]: { kind: def.kind, ...zapis, m8: true } }, { [OPCJA]: true });
        }
      }
    } else if (wszystkie.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", wszystkie.map(e => e.id), { [OPCJA]: true });
    }
  }
}

/** Znacznik założony/zdjęty ręcznie (HUD MG, karta) — korekta w ledgerze, nie nowa akcja. */
async function _onZnacznikRecznie(effect, options, zalozony) {
  if (options?.[OPCJA] || options?.neuroTTExpired) return;
  const kinds = [...(effect.statuses ?? [])].map(s => KIND_STATUSU[s]).filter(Boolean);
  if (!kinds.length) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  const c = kombatant(actor);
  if (!c || !wykonawca(c)?.isSelf) return;
  const l = ledger(c);
  const ch = chwila(c, l);
  for (const kind of kinds) {
    const p = E.pule(l, ch)[kind];
    if (zalozony && p.wydane <= 0) {
      await zatwierdz(c, { id: `hud-${effect.id}`, rodzaj: "korekta", zrodlo: "HUD", powod: "znacznik założony ręcznie", koszt: { [kind]: 1 }, chwila: ch });
    } else if (!zalozony && p.wydane > 0) {
      await zatwierdz(c, { rodzaj: "korekta", zrodlo: "HUD", powod: "znacznik zdjęty ręcznie", koszt: { [kind]: -p.wydane }, chwila: ch });
    }
  }
}

/* -------------------------------------------- */
/*  Natywne aktywności                           */
/* -------------------------------------------- */

function _onPostUseActivity(activity, usageConfig, results) {
  const kind = AKTYWACJA_DO_AKCJI[activity?.activation?.type];
  const actor = activity?.actor;
  if (!kind || !actor) return;
  // Atakowanie to instancja z kilkoma slotami (§7.1) — nie liczy się jako „jedna aktywność = jedna A”.
  if (kind === "A" && activity.type === "attack") return;
  const id = results?.message?.id ? `uzycie-${results.message.id}` : null;
  // Akcja przedmiotu (nie zdolności ani broni) to Używanie [A] (s. 31) — pierwsza w kolejce do grantu Szybkich rąk.
  const cel = kind === "A" && !["feat", "weapon", "spell"].includes(activity.item?.type) ? "uzywanie" : null;
  const zrodlo = activity.item?.name ?? activity.name ?? "?";
  // [A] poza własną turą (albo przy uzbrojonej Reakcji) to wykonanie wyczekanej akcji: R zamiast A (§6.4, T41).
  // B tak nie przechodzi — Wyczekanie nie zamienia zdolności wyłącznie B w dowolną R.
  if (kind === "A") void akcja(actor, { zrodlo, cel, ...(id ? { id } : {}) });
  else void zadeklaruj(actor, kind, { zrodlo, cel, ...(id ? { id } : {}) });
}

/* -------------------------------------------- */

export function registerActions() {
  registerEkonomia();
  zarejestrujEfektTuryWlasciciela(_jestZnacznikiem);
  zarejestrujProjekcje(_projekcjaZnacznikow);
  Hooks.on("createActiveEffect", (effect, options) => { void _onZnacznikRecznie(effect, options, true); });
  Hooks.on("deleteActiveEffect", (effect, options) => { void _onZnacznikRecznie(effect, options, false); });
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  console.log(`${MODULE_ID} | Warstwa akcji (ledger M8, znaczniki R/B) registered`);
}

/** `game.neuroshima.actions` — lejek deklaracji, podgląd ledgera i znaczników. */
export const actionsApi = Object.freeze({
  AKCJE, DEKLARACJE: E.DEKLARACJE, zadeklaruj, dodatkowa, deklaruj, koryguj, zakonczReakcje, zmeczenie, znacznik, stan,
  akcja, interakcja, wyczekaj, reaguj, uzbroj, uzbrojona, oczekujace, ponowOczekujace
});
