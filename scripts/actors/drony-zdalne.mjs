/**
 * Neuroshima 5e — tryb zdalnego sterowania dronem (PLAN_m3_towarzysze.md §7.10, D11, D12, D22, D24, D35, U17; E8a).
 *
 *   - **Sygnał (U17):** zasięg z kontrolera w ręce operatora (D32), mierzony od żetonu operatora do żetonu
 *     drona w linii prostej, z wysokością; ściana między nimi (test kolizji wzroku) albo scena „pod ziemią”
 *     (pole sceny, ustawia MG w konfiguracji sceny) → zasięg przez przeszkody. Na scenie pościgu odległość z
 *     torów (`|tor operatora − tor drona| × 36 m`). Pozycje z `_source` dokumentu — nie z animowanych pól
 *     żetonu, które w v14 są o ruch w tyle. Krzywa jakości — `sygnal()` w `config/towarzysze-rules.mjs`.
 *   - **Sesja (klient operatora):** wejście z `aktywuj` [A]/[B]/Przejmij (`drony-sterowanie.mjs`) po tym, jak
 *     przekaźnik MG ustawi operatora i własność. Klient zapamiętuje kontrolowane żetony, kontroluje tylko drona
 *     (rdzeń: gracz widzi wtedy wyłącznie przez kontrolowany żeton), kamera podąża za dronem. Ruch — rdzeń v14.
 *   - **Bramka wizji:** gracz widzi przez żeton drona tylko w swojej sesji zdalnej. Bez niej właściciel uchwytu
 *     patrzyłby przez drona, ilekroć nie kontroluje innego żetonu (rdzeń: „nic nie kontroluje → widzi przez
 *     wszystkie swoje”). MG — bez zmian.
 *   - **Wyjście** — kontrola i widok wracają, dron staje (D35): Esc; utrata sygnału (D24: FAILSAFE, po chwili
 *     cięcie); kontroler poza ręką albo u kogoś innego (D22); operator nieprzytomny; dron Wyłączony (obraz gaśnie
 *     w szum, po chwili wyjście); żeton drona
 *     zniknął albo klient zmienił scenę; przejęcie przez innego operatora (D12); w walce koniec tury operatora
 *     (D35 — aktywacja to jeden ciągły kawałek w jego turze). Klient prosi MG o odebranie nadanej własności.
 *   - **Własność operatora (D12):** nadaną przez moduł (`FLAG_NADANE`) odbiera aktywny MG — na prośbę przy
 *     wyjściu, przy przejęciu, złożeniu drona i rozłączeniu gracza; nadaną do Reakcji [R] — przy zmianie tury.
 *
 * Stan sesji jest w pamięci klienta: przeładowanie ją kończy, a rozłączenie zwalnia własność po stronie MG.
 * Obraz kamery i OSD (E8b, E8c) słuchają haka `neuroshima.dronZdalny`.
 */

import { KONTROLERY } from "../config/towarzysze-data.mjs";
import { sygnal } from "../config/towarzysze-rules.mjs";
import { FLAG, towarzysz } from "./towarzysze.mjs";
import {
  jestDronem, zetonyDrona, prosbaDoMG, zarejestrujAkcje, zmianyOdebrania, FLAG_NADANE, FLAG_STEROWANIE
} from "./drony.mjs";
import { rodzajKontrolera } from "../items/kontroler.mjs";
import { isDollActor, inHand } from "./doll.mjs";
import { isPoscigScene, xNaTor, dystansZnacznikow } from "../scenes/poscig.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Pole sceny „pod ziemią” (U17): zasięg kontrolera przez przeszkody na całej scenie. */
export const FLAG_POD_ZIEMIA = "podZiemia";
/** Hak dla obrazu i OSD: `({ stan: "wejscie" | "tik" | "wyjscie", sesja, powod? })`. */
export const HOOK_ZDALNY = "neuroshima.dronZdalny";

/** FAILSAFE na OSD przed cięciem (D24). */
export const FAILSAFE_MS = 1500;
/** Odświeżanie sesji — sygnał, warunki wyjścia. */
const TIK_MS = 250;
/** Ile czekamy na przekaźnik MG (operator i własność). */
const CZEKAJ_MS = 4000;

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Komunikaty wyjścia. `null` — bez komunikatu. */
const POWODY = Object.freeze({
  esc: null,
  zmiana: null,
  kontrola: "Wyszedłeś z trybu zdalnego.",
  sygnal: "Utrata sygnału — dron staje, widok wraca do ciebie.",
  kontroler: "Kontroler nie jest w ręce — sterowanie przerwane.",
  operator: "Operator nie jest przytomny — sterowanie przerwane.",
  wylaczony: "Dron wyłączony — obraz zgasł.",
  zeton: "Żeton drona zniknął ze sceny — sterowanie przerwane.",
  przejecie: "Ktoś inny przejął sterowanie dronem.",
  tura: "Koniec tury — dron wraca pod twoje oko dopiero w kolejnej aktywacji."
});

/* -------------------------------------------- */
/*  Sygnał (U17)                                 */
/* -------------------------------------------- */

/** Żeton aktora na scenie (połączony albo syntetyczny) albo `null`. */
function _zetonNaScenie(actor, scene) {
  if (!actor || !scene) return null;
  return scene.tokens.find(t => t.actor === actor || (t.actorLink && t.actorId === actor.id)) ?? null;
}

/** Środek żetonu i wysokość z `_source` (cel ruchu, nie animacja). */
function _punkt(tokenDoc) {
  const s = tokenDoc._source;
  const c = tokenDoc.getCenterPoint(s);
  return { x: c.x, y: c.y, elevation: Number(s.elevation) || 0 };
}

/** Ściana blokująca wzrok między dwoma punktami na oglądanej scenie. */
function _sciana(a, b, scene, tokenDoc) {
  if (scene !== canvas?.scene) return false;
  const level = scene.levels?.get(tokenDoc._source.level) ?? canvas.level;
  try {
    return !!CONFIG.Canvas.polygonBackends.sight.testCollision(a, b, { type: "sight", mode: "any", level });
  } catch (err) {
    console.warn(`${MODULE_ID} | sygnał drona: test ściany`, err);
    return false;
  }
}

/** Kontroler operatora do sygnału: wskazany, jeśli nadal jego; inaczej pierwszy w ręce (BN bez lalki — dowolny). */
export function kontrolerOperatora(operator, wskazany = null) {
  const ok = i => !!rodzajKontrolera(i) && (!isDollActor(operator) || inHand(i));
  if (wskazany && wskazany.parent === operator && ok(wskazany)) return wskazany;
  return operator?.items?.find(ok) ?? null;
}

/**
 * Sygnał drona (U17): odległość i przeszkody z żetonów, zasięg z kontrolera w ręce operatora.
 * @param {Actor} dron
 * @param {{operator: Actor, kontroler?: Item, scene?: Scene}} o
 * @returns {{jakosc: number, utracony: boolean, zasieg: number, odleglosc: number|null, sciana: boolean,
 *   podZiemia: boolean, powod: string|null}}  `powod` utraty: `kontroler` | `operator` | `zeton` | `zasieg`
 */
export function sygnalDrona(dron, { operator, kontroler = null, scene = canvas?.scene } = {}) {
  const out = (powod, reszta = {}) => ({ jakosc: 0, utracony: true, zasieg: 0, odleglosc: null, sciana: false,
    podZiemia: false, powod, ...reszta });
  const k = kontrolerOperatora(operator, kontroler);
  if (!k) return out("kontroler");
  const zd = zetonyDrona(dron).find(t => t.parent === scene);
  if (!zd) return out("zeton");
  const zo = _zetonNaScenie(operator, scene);
  if (!zo) return out("operator");
  const a = _punkt(zo);
  const b = _punkt(zd);
  const podZiemia = !!scene.getFlag(MODULE_ID, FLAG_POD_ZIEMIA);
  let odleglosc;
  let sciana = false;
  if (isPoscigScene(scene)) {
    odleglosc = dystansZnacznikow(xNaTor(a.x), xNaTor(b.x));
  } else {
    const d = scene.dimensions;
    const plasko = (Math.hypot(b.x - a.x, b.y - a.y) / d.size) * d.distance;
    odleglosc = Math.hypot(plasko, b.elevation - a.elevation);
    sciana = _sciana(a, b, scene, zd);
  }
  const s = sygnal({ odleglosc, sciana, podZiemia, kontroler: KONTROLERY[rodzajKontrolera(k)] });
  return { ...s, odleglosc, sciana, podZiemia, powod: s.utracony ? "zasieg" : null };
}

/* -------------------------------------------- */
/*  Sesja (klient)                               */
/* -------------------------------------------- */

/**
 * @typedef {object} SesjaZdalna
 * @property {string} dronUuid
 * @property {string} tokenId
 * @property {string} sceneId
 * @property {string} operatorUuid
 * @property {string} kontrolerUuid
 * @property {"A"|"B"|"Z"} tryb
 * @property {string} znacznik       prośba „steruj”, po której weszliśmy
 * @property {string[]} poprzednie   żetony kontrolowane przed wejściem
 * @property {number} start          `Date.now()` wejścia
 * @property {object|null} sygnal    ostatni `sygnalDrona`
 * @property {number|null} failsafeOd
 * @property {number|null} wylaczonyOd  dron Wyłączony — sam szum, po chwili wyjście
 */

/** @type {SesjaZdalna|null} */
let _sesja = null;
let _tik = null;

/** Bieżąca sesja zdalna tego klienta (kopia) albo `null`. */
export function sesjaZdalna() {
  return _sesja ? { ..._sesja } : null;
}

/** Czy ten klient steruje tym żetonem drona. */
export function wTrybieZdalnym(tokenDoc) {
  return !!_sesja && !!tokenDoc && _sesja.tokenId === tokenDoc.id && _sesja.sceneId === tokenDoc.parent?.id;
}

const _sleep = ms => new Promise(r => setTimeout(r, ms));

async function _czekaj(warunek, ms) {
  for (let t = 0; t < ms; t += 100) {
    if (warunek()) return true;
    await _sleep(100);
  }
  return warunek();
}

/** Sterowanie potwierdzone przez MG dla prośby `znacznik`: `{ znacznik, user, operator }` na dronie. */
function _sterowanie(dron) {
  return dron?.flags?.[MODULE_ID]?.[FLAG_STEROWANIE] ?? null;
}

/**
 * Wejście w tryb zdalny (D11). Czeka, aż przekaźnik MG wykona prośbę „steruj” `znacznik` (operator,
 * własność), potem przejmuje kontrolę. Ten sam dron w trwającej sesji — sesja trwa z nowym trybem.
 * Dron bez żetonu na oglądanej scenie — `false` bez komunikatu (makra i testy aktywują drony złożone).
 * @param {Actor} dron
 * @param {{operator: Actor, kontroler: Item, tryb: "A"|"B"|"Z", znacznik: string}} o
 * @returns {Promise<boolean>}
 */
export async function wejdz(dron, { operator, kontroler, tryb, znacznik }) {
  const tokenDoc = zetonyDrona(dron).find(t => t.parent === canvas?.scene);
  if (!tokenDoc) return false;
  const ta = _sesja?.dronUuid === dron.uuid && _sesja.operatorUuid === operator.uuid;
  // Inny dron: najpierw zwolnienie starego — prośby idą do MG po kolei, więc nie wyprzedzi nowej.
  if (_sesja && !ta) await wyjdz("zmiana");
  const gotowy = () => dron.isOwner && _sterowanie(dron)?.znacznik === znacznik;
  if (!(await _czekaj(gotowy, CZEKAJ_MS))) {
    ui.notifications.warn(`${dron.name}: MG nie potwierdził sterowania — spróbuj jeszcze raz.`);
    return false;
  }
  const token = tokenDoc.object;
  if (!token) return false;
  if (ta && _sesja) {
    Object.assign(_sesja, { tryb, znacznik, kontrolerUuid: kontroler.uuid });
    Hooks.callAll(HOOK_ZDALNY, { stan: "wejscie", sesja: sesjaZdalna() });
    return true;
  }
  _sesja = {
    dronUuid: dron.uuid, tokenId: tokenDoc.id, sceneId: tokenDoc.parent.id,
    operatorUuid: operator.uuid, kontrolerUuid: kontroler.uuid, tryb, znacznik,
    poprzednie: canvas.tokens.controlled.filter(t => t !== token).map(t => t.id),
    start: Date.now(), sygnal: null, failsafeOd: null, wylaczonyOd: null
  };
  token.control({ releaseOthers: true });
  _odswiezWizje(token);
  canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
  _pasek(dron);
  _tik = setInterval(_sprawdz, TIK_MS);
  _sprawdz();
  if (_sesja) Hooks.callAll(HOOK_ZDALNY, { stan: "wejscie", sesja: sesjaZdalna() });
  return !!_sesja;
}

/**
 * Wyjście z trybu zdalnego (D24, D35): dron staje, kontrola i widok wracają, MG odbiera nadaną własność.
 * @param {keyof POWODY} [powod]
 * @param {{bezKanwy?: boolean}} [o]  kanwa właśnie się rozbiera — tylko stan i prośba do MG
 */
export async function wyjdz(powod = "esc", { bezKanwy = false } = {}) {
  const s = _sesja;
  if (!s) return;
  _sesja = null;
  clearInterval(_tik);
  _tik = null;
  if (!bezKanwy) _oddajKanwe(s);
  _pasek(null);
  const tekst = POWODY[powod];
  if (tekst) (powod === "sygnal" || powod === "wylaczony" ? ui.notifications.warn : ui.notifications.info).call(ui.notifications, tekst);
  Hooks.callAll(HOOK_ZDALNY, { stan: "wyjscie", sesja: s, powod });
  const operator = fromUuidSync(s.operatorUuid);
  if (!game.user.isGM && operator?.isOwner) {
    await prosbaDoMG(operator, { akcja: "zwolnij", dron: s.dronUuid }).catch(err => console.error(`${MODULE_ID} | zwolnij`, err));
  }
}

/** Dron staje, kontrola i widok wracają (D35). */
function _oddajKanwe(s) {
  const scene = game.scenes.get(s.sceneId);
  const tokenDoc = scene?.tokens.get(s.tokenId) ?? null;
  // D35: dron staje — ruch zaczęty przez tego użytkownika nie idzie dalej.
  try {
    if (tokenDoc?.movement?.user?.isSelf && !["completed", "stopped"].includes(tokenDoc.movement.state)) tokenDoc.stopMovement();
  } catch (err) { console.warn(`${MODULE_ID} | dron: zatrzymanie ruchu`, err); }
  const token = canvas?.scene === scene ? tokenDoc?.object : null;
  if (token?.controlled) token.release();
  if (token) _odswiezWizje(token);
  _przywrocKontrole(s);
}

function _przywrocKontrole(s) {
  if (!canvas?.ready) return;
  const wrocone = [];
  for (const id of s.poprzednie) {
    const t = canvas.tokens.get(id);
    if (t?.isOwner && t.control({ releaseOthers: false })) wrocone.push(t);
  }
  if (!wrocone.length) {
    const operator = fromUuidSync(s.operatorUuid);
    const zo = _zetonNaScenie(operator, canvas.scene)?.object;
    if (zo?.isOwner && zo.control({ releaseOthers: true })) wrocone.push(zo);
  }
  const t = wrocone[0];
  if (t) canvas.animatePan({ x: t.center.x, y: t.center.y, duration: 250 });
}

/** Żeton i percepcja po zmianie bramki wizji. */
function _odswiezWizje(token) {
  token.initializeVisionSource?.();
  canvas.perception.update({ initializeVision: true, refreshVision: true, refreshLighting: true });
}

/** Warunki wyjścia i sygnał (co `TIK_MS` i po ruchu żetonów). */
function _sprawdz() {
  const s = _sesja;
  if (!s) return;
  const dron = fromUuidSync(s.dronUuid);
  const tokenDoc = canvas?.scene?.id === s.sceneId ? canvas.scene.tokens.get(s.tokenId) : null;
  if (!dron || !tokenDoc?.object) return void wyjdz("zeton");
  // Przejęcie (D12): inny operator albo inny użytkownik potwierdzony przez MG, albo własność odebrana.
  const ster = _sterowanie(dron);
  if (!dron.isOwner || towarzysz(dron)?.operator !== s.operatorUuid || (ster && ster.user !== game.user.id)) {
    return void wyjdz("przejecie");
  }
  // Wyłączony: obraz gaśnie w szum, po chwili wyjście — jak FAILSAFE (D24).
  if (dron.statuses?.has("wylaczony")) {
    s.wylaczonyOd ??= Date.now();
    if (Date.now() - s.wylaczonyOd >= FAILSAFE_MS) return void wyjdz("wylaczony");
    return void Hooks.callAll(HOOK_ZDALNY, { stan: "tik", sesja: sesjaZdalna() });
  }
  s.wylaczonyOd = null;
  const operator = fromUuidSync(s.operatorUuid);
  if (!operator || operator.statuses?.has("unconscious") || operator.statuses?.has("dead")) return void wyjdz("operator");
  const kontroler = fromUuidSync(s.kontrolerUuid);
  if (!kontroler || kontroler.parent !== operator || (isDollActor(operator) && !inHand(kontroler))) return void wyjdz("kontroler");
  if (!tokenDoc.object.controlled) return void wyjdz("kontrola");
  s.sygnal = sygnalDrona(dron, { operator, kontroler, scene: canvas.scene });
  if (s.sygnal.utracony) {
    s.failsafeOd ??= Date.now();
    if (Date.now() - s.failsafeOd >= FAILSAFE_MS) return void wyjdz("sygnal");
  } else s.failsafeOd = null;
  Hooks.callAll(HOOK_ZDALNY, { stan: "tik", sesja: sesjaZdalna() });
}

/** Podpowiedź Foundry poza obrazem: który dron i jak wyjść (§7.10 — nie w OSD). */
function _pasek(dron) {
  let el = document.getElementById("neuro-dron-zdalny");
  if (!dron) return void el?.remove();
  if (!el) {
    el = document.createElement("div");
    el.id = "neuro-dron-zdalny";
    document.body.append(el);
  }
  el.innerHTML = `<i class="fa-solid fa-tower-broadcast" inert></i> ${esc(dron.name)} · <kbd>Esc</kbd> — wyjdź`;
}

/* -------------------------------------------- */
/*  Hooki klienta                                */
/* -------------------------------------------- */

/** Esc: wyjście, gdy nic innego nie czeka na zamknięcie (okna i menu zamyka najpierw rdzeń). */
function _onEsc() {
  if (!_sesja) return false;
  if (ui.context?.element) return false;
  const okna = Object.keys(ui.windows ?? {}).length
    || [...foundry.applications.instances.values()].some(a => a.hasFrame && a.rendered && !a.minimized);
  if (okna) return false;
  wyjdz("esc");
  return true;
}

/** Kamera podąża za dronem (cel ruchu), sygnał liczy się od razu po ruchu drona albo operatora. */
function _onMoveToken(tokenDoc, movement) {
  const s = _sesja;
  if (!s || tokenDoc.parent?.id !== s.sceneId) return;
  if (tokenDoc.id === s.tokenId) {
    const cel = movement?.destination ?? tokenDoc._source;
    const c = tokenDoc.getCenterPoint(cel);
    canvas.animatePan({ x: c.x, y: c.y, duration: 400 });
  }
  _sprawdz();
}

/** D35: w walce sesja kończy się z turą operatora. */
function _onUpdateCombat(combat, changes) {
  const s = _sesja;
  if (!s || !combat.started || !("turn" in changes || "round" in changes)) return;
  const operator = fromUuidSync(s.operatorUuid);
  if (!operator || !combat.getCombatantsByActor?.(operator)?.length) return;
  if (combat.combatant?.actor !== operator) wyjdz("tura");
}

/** Bramka wizji: gracz patrzy przez drona tylko w swojej sesji zdalnej. */
function _owinWizje() {
  const proto = foundry.canvas.placeables.Token.prototype;
  const oryginal = proto._isVisionSource;
  proto._isVisionSource = function () {
    const wynik = oryginal.call(this);
    if (!wynik || game.user.isGM || !jestDronem(this.actor)) return wynik;
    return wTrybieZdalnym(this.document);
  };
}

/* -------------------------------------------- */
/*  Własność operatora — strona MG (D12)         */
/* -------------------------------------------- */

/** Przekaźnik „zwolnij”: gracz wyszedł z trybu zdalnego. */
async function _zwolnij(_actor, { dron: uuid, user }) {
  const dron = fromUuidSync(uuid);
  if (!dron || !jestDronem(dron)) return;
  // Nadanie do Reakcji zostaje do zmiany tury — wyjście z sesji go nie dotyczy.
  if (dron.flags?.[MODULE_ID]?.[FLAG_NADANE]?.[user] !== "zdalny") return;
  const zmiany = zmianyOdebrania(dron, [user]);
  if (zmiany) await dron.update(zmiany);
}

async function _odbierzWszystkim(filtr, opcje = {}) {
  for (const a of game.actors) {
    if (!jestDronem(a)) continue;
    const zmiany = zmianyOdebrania(a, filtr, opcje);
    if (zmiany) await a.update(zmiany);
  }
}

const _jakoMG = fn => (...args) => {
  if (!game.user.isActiveGM) return;
  Promise.resolve(fn(...args)).catch(err => console.error(`${MODULE_ID} | drony-zdalne`, err));
};

/* -------------------------------------------- */
/*  Pole sceny „pod ziemią” (U17)                */
/* -------------------------------------------- */

function _onRenderSceneConfig(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const tab = root?.querySelector('.tab[data-tab="misc"]');
  if (!tab || tab.querySelector(".neuro-pod-ziemia")) return;
  const scene = app.document;
  const name = `flags.${MODULE_ID}.${FLAG_POD_ZIEMIA}`;
  const fs = document.createElement("fieldset");
  fs.className = "neuro-pod-ziemia";
  fs.innerHTML = `<legend>Neuroshima</legend>
    <div class="form-group">
      <label for="${app.id}-podZiemia">Pod ziemią</label>
      <div class="form-fields"><input type="checkbox" id="${app.id}-podZiemia" name="${name}" ${scene.getFlag(MODULE_ID, FLAG_POD_ZIEMIA) ? "checked" : ""}></div>
      <p class="hint">Kontrolery dronów mają tu zasięg jak przez ściany (300 → 50 m, 100 → 20 m).</p>
    </div>`;
  tab.append(fs);
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerDronyZdalne() {
  zarejestrujAkcje("zwolnij", _zwolnij);
  game.keybindings.register(MODULE_ID, "dronWyjdz", {
    name: "Dron: wyjdź z trybu zdalnego",
    hint: "Kontrola i widok wracają na twój żeton; dron staje.",
    editable: [{ key: "Escape" }],
    onDown: _onEsc,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
  Hooks.on("moveToken", _onMoveToken);
  Hooks.on("updateCombat", _onUpdateCombat);
  Hooks.on("canvasTearDown", () => { if (_sesja) wyjdz("zeton", { bezKanwy: true }); });
  Hooks.on("renderSceneConfig", _onRenderSceneConfig);
  // MG: nadania do Reakcji kończą się ze zmianą tury i z końcem walki; rozłączony gracz traci wszystkie.
  Hooks.on("updateCombat", _jakoMG((combat, changes) => {
    if ("turn" in changes || "round" in changes) return _odbierzWszystkim(null, { rodzaj: "reakcja" });
  }));
  Hooks.on("deleteCombat", _jakoMG(() => _odbierzWszystkim(null, { rodzaj: "reakcja" })));
  Hooks.on("userConnected", _jakoMG((user, polaczony) => { if (!polaczony) return _odbierzWszystkim([user.id]); }));
  Hooks.once("setup", _owinWizje);
}

export const dronyZdalneApi = Object.freeze({ sygnalDrona, kontrolerOperatora, sesjaZdalna, wejdz, wyjdz, wTrybieZdalnym });
