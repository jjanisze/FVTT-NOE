/**
 * Neuroshima 5e — panel gotowości do tury (PLAN_m8_ruch_i_ekonomia_akcji.md §8.4, E8). Tylko na tym kliencie.
 *
 * Mały pasek u góry ekranu dla gracza (podmiot: przypisana postać; inni własni bohaterowie — opcja):
 *   - „Twoja tura za X” — pozycje w widocznej kolejności (ukrytych nie liczymy i nie zdradzamy);
 *   - „Gotuj się, jesteś następny” — jeden krótki dźwięk i puls przy przejściu;
 *   - „Twoja tura” — dźwięk startu i puls, mały zegar `m:ss.cc`; po 30 s żółty, po 60 s czerwony; bez syreny;
 *   - pauza Foundry — zegar stoi, pilność bez animacji, bez świeżych sygnałów (po wznowieniu najwyżej aktualny).
 * Zegar liczy rzeczywisty niepauzowany czas tury — decyzje, reakcje, szukanie reguły przez MG. Nie karze, nie kończy
 * tury, nie wysyła niczego na czat ani serwer. Po przeładowaniu w tej samej turze wraca z pamięci sesji karty; wejście
 * w środku tury pokazuje czas „od wejścia”, bez fałszywego startu.
 *
 * Dźwięki z motywu walki rdzenia (`core.combatTheme`: nextUp/yourTurn) przez `game.audio.interface` — M8 jest ich
 * jedynym właścicielem: rdzeniowe odtwarzanie tych dwóch zapowiedzi jest wyciszone (MG z wszystkimi BN nie dostaje
 * sygnału przy każdym z nich). Motyw „brak” — tylko obraz. Głośność, wyciszenie i animacja — ustawienia klienta.
 */

import * as G from "../config/gotowosc-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const US = Object.freeze({
  wl: "m8Gotowosc", dzwiek: "m8GotowoscDzwiek", glosnosc: "m8GotowoscGlosnosc", animacja: "m8GotowoscAnimacja", inni: "m8GotowoscInni"
});
const SESJA = "neuro-m8-zegar";
const ID = "neuro-gotowosc";
const OKRES_MS = 50;

/** Klucze sygnałów już obsłużonych na tym kliencie. */
const _zagrane = new Set();
let _pierwsza = true;
/** @type {{klucz: string, start: number, pauzaMs: number, pauzaOd: number|null, czesciowy: boolean}|null} */
let _zegar = null;
let _stan = { stan: null, za: null, kto: null, klucz: null };
let _interval = null;

const _ust = (k, dom) => { try { return game.settings.get(MODULE_ID, US[k]); } catch (_e) { return dom; } };

/* -------------------------------------------- */
/*  Podmiot i stan                               */
/* -------------------------------------------- */

/** Kombatanci podmiotu: przypisana postać; opcjonalnie inni własni bohaterowie (gracz). Wierzchowiec/nośnik — nie. */
function _moje(combat) {
  const postac = game.user.character;
  const inni = !game.user.isGM && _ust("inni", false);
  return combat.combatants.filter(c => c.actor && ((postac && c.actor === postac)
    || (inni && c.isOwner && c.actor.type === "character"))).map(c => c.id);
}

function _obecny() {
  const combat = game.combat;
  if (!combat?.started || !_ust("wl", true)) return { stan: null, za: null, kto: null, klucz: null };
  const kolejnosc = combat.turns.map(c => ({ id: c.id, widoczny: !!c.visible, pokonany: !!c.isDefeated }));
  const s = G.stanGotowosci(kolejnosc, combat.turn ?? 0, _moje(combat), { skipDefeated: !!combat.settings?.skipDefeated });
  return { ...s, klucz: s.stan ? `${combat.id}:${combat.round}:${combat.combatant?.id ?? "?"}` : null };
}

/* -------------------------------------------- */
/*  Zegar (pamięć sesji karty)                   */
/* -------------------------------------------- */

function _zapiszZegar() {
  try { sessionStorage.setItem(SESJA, JSON.stringify(_zegar)); } catch (_e) { /* tryb prywatny itp. */ }
}

function _zegarDla(klucz, swiezy) {
  if (_zegar?.klucz === klucz) return _zegar;
  let z = null;
  try { z = JSON.parse(sessionStorage.getItem(SESJA) ?? "null"); } catch (_e) { z = null; }
  if (z?.klucz !== klucz) {
    const teraz = Date.now();
    z = { klucz, start: teraz, pauzaMs: 0, pauzaOd: game.paused ? teraz : null, czesciowy: !swiezy };
  }
  _zegar = z;
  _zapiszZegar();
  return z;
}

function _onPause(paused) {
  if (!_zegar) return;
  const teraz = Date.now();
  if (paused && _zegar.pauzaOd == null) _zegar.pauzaOd = teraz;
  else if (!paused && _zegar.pauzaOd != null) { _zegar.pauzaMs += teraz - _zegar.pauzaOd; _zegar.pauzaOd = null; }
  _zapiszZegar();
  odswiez();
}

/* -------------------------------------------- */
/*  Sygnały                                      */
/* -------------------------------------------- */

function _zagraj(rodzaj) {
  if (!_ust("dzwiek", true)) return;
  const theme = CONFIG.Combat?.sounds?.[game.settings.get("core", "combatTheme")];
  const lista = theme?.[rodzaj === "start" ? "yourTurn" : "nextUp"];
  if (!lista?.length) return;
  const src = lista[Math.floor(Math.random() * lista.length)];
  try { game.audio.play(src, { context: game.audio.interface, volume: Number(_ust("glosnosc", 0.8)) }); } catch (_e) { /* bez dźwięku */ }
}

/* -------------------------------------------- */
/*  Panel                                        */
/* -------------------------------------------- */

function _el() {
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement("div");
    el.id = ID;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = `<i class="fa-solid fa-hourglass-half" inert></i> <span class="tekst"></span> <span class="zegar"></span>`;
    document.body.append(el);
  }
  return el;
}

function _rysujZegar() {
  const el = document.getElementById(ID);
  if (!el || _stan.stan !== "tura" || !_zegar) return;
  const ms = G.czasTury(_zegar, Date.now());
  const z = el.querySelector(".zegar");
  const t = `${_zegar.czesciowy ? "od wejścia " : ""}${G.formatCzasu(ms)}`;
  if (z.textContent !== t) z.textContent = t;
  const faza = G.fazaCzasu(ms);
  if (el.dataset.faza !== faza) el.dataset.faza = faza;
}

/**
 * Przelicz stan i odśwież panel; zagraj sygnał przy przejściu (raz na instancję tury, nie w pauzie).
 */
export function odswiez() {
  const s = _obecny();
  const przejscie = s.klucz !== _stan.klucz || s.stan !== _stan.stan;
  _stan = s;
  const sygnal = G.sygnalDoZagrania(s, { zagrane: _zagrane, pauza: game.paused, pierwsza: _pierwsza });
  const pierwsza = _pierwsza;
  _pierwsza = false;
  if (!s.stan) {
    document.getElementById(ID)?.remove();
    if (_interval) { clearInterval(_interval); _interval = null; }
    return s;
  }
  const el = _el();
  el.dataset.stan = s.stan;
  el.classList.toggle("pauza", !!game.paused);
  el.classList.toggle("bez-animacji", !_ust("animacja", true));
  el.querySelector(".tekst").textContent = G.tekstGotowosci(s);
  el.querySelector("i").className = `fa-solid ${s.stan === "tura" ? "fa-play" : s.stan === "nastepny" ? "fa-bolt" : "fa-hourglass-half"}`;
  if (s.stan === "tura") {
    _zegarDla(s.klucz, !pierwsza);
    if (!_interval) _interval = setInterval(_rysujZegar, OKRES_MS);
    _rysujZegar();
  } else {
    el.querySelector(".zegar").textContent = "";
    delete el.dataset.faza;
    if (_interval) { clearInterval(_interval); _interval = null; }
  }
  if (sygnal) {
    _zagraj(sygnal);
    if (_ust("animacja", true) && przejscie) {
      el.classList.remove("puls");
      void el.offsetWidth;
      el.classList.add("puls");
    }
  }
  return s;
}

/* -------------------------------------------- */

function _ustawienia() {
  const reg = (key, name, hint, type, def, extra = {}) => game.settings.register(MODULE_ID, key, {
    name, hint, scope: "client", config: true, type, default: def, onChange: () => odswiez(), ...extra
  });
  reg(US.wl, "Panel gotowości do tury", "Pasek u góry: „Twoja tura za X”, „Gotuj się, jesteś następny”, zegar własnej tury (M8). Wyłączony — wracają zwykłe zapowiedzi walki rdzenia.", Boolean, true);
  reg(US.dzwiek, "Panel gotowości — dźwięki", "Dwa krótkie sygnały z motywu walki (następny, twoja tura). Wyłączone — tylko obraz.", Boolean, true);
  reg(US.glosnosc, "Panel gotowości — głośność", "Głośność sygnałów (0–1).", Number, 0.8, { range: { min: 0, max: 1, step: 0.05 } });
  reg(US.animacja, "Panel gotowości — animacja", "Puls przy przejściu i pulsowanie zegara po 30 s / 60 s. Wyłączone — sam kolor i tekst.", Boolean, true);
  reg(US.inni, "Panel gotowości — inni moi bohaterowie", "Licz też tury innych postaci, które prowadzisz (nie tylko przypisanej).", Boolean, false);
}

/** Rdzeń gra „nextUp”/„yourTurn” sam — przy włączonym panelu M8 jest ich jedynym właścicielem (bez podwójnego dźwięku). */
function _wyciszRdzen() {
  const proto = foundry.documents.Combat?.prototype ?? Combat.prototype;
  const orig = proto._playCombatSound;
  if (!orig || orig.neuroM8) return;
  const owinieta = function (announcement) {
    if ((announcement === "nextUp" || announcement === "yourTurn") && _ust("wl", true)) return;
    return orig.call(this, announcement);
  };
  owinieta.neuroM8 = true;
  proto._playCombatSound = owinieta;
}

export function registerGotowosc() {
  _ustawienia();
  _wyciszRdzen();
  const go = () => { odswiez(); };
  Hooks.once("ready", go);
  for (const h of ["combatStart", "combatTurnChange", "combatRound", "deleteCombat", "createCombatant", "deleteCombatant"]) {
    Hooks.on(h, () => setTimeout(go, 0));
  }
  Hooks.on("updateCombat", (_c, changes) => { if ("turn" in changes || "round" in changes || "active" in changes || "started" in changes) setTimeout(go, 0); });
  Hooks.on("updateCombatant", (_c, changes) => { if ("hidden" in changes || "defeated" in changes || "initiative" in changes) setTimeout(go, 0); });
  Hooks.on("updateUser", (user, changes) => { if (user.isSelf && "character" in changes) setTimeout(go, 0); });
  Hooks.on("pauseGame", paused => _onPause(paused));
}

export const gotowoscApi = Object.freeze({ odswiez, stan: () => ({ ..._stan, zegar: _zegar ? { ..._zegar, ms: G.czasTury(_zegar, Date.now()) } : null }) });
export const __testing = Object.freeze({ pauza: _onPause, reset: () => { _zagrane.clear(); _pierwsza = true; _zegar = null; _stan = { stan: null, za: null, kto: null, klucz: null }; } });
