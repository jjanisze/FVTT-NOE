/**
 * Neuroshima 5e — OSD kamery drona (PLAN_m3_towarzysze.md §7.10, D34, D38, D39; E8c).
 *
 * Kontener ze znakami czcionki Betaflight (atlas `fonts/osd/betaflight-default.webp`, GPL-3 — czytany jak dane,
 * D39) w `canvas.stage`, przeliczany co klatkę na ekran. Siedzi więc pod filtrem kanału FPV (`drony-obraz.mjs`):
 * kontroler lotu wkleja OSD do sygnału, przy słabym sygnale trzęsie się i rwie razem z obrazem. Układ —
 * `config/osd.mjs` (czysty); tu stan z gry, sprite'y, miganie 2 Hz, RSSI odświeżane kilka razy na sekundę.
 * Ekran powitalny kontrolera przy wejściu: „System ruszył …” (D23). Tylko u operatora w trybie zdalnym.
 */

import { HOOK_ZDALNY } from "./drony-zdalne.mjs";
import { liniaUruchomienia } from "./drony.mjs";
import { towarzysz } from "./towarzysze.mjs";
import { atakiDrona, cechyDrona } from "./drony-sterowanie.mjs";
import { stanZasilania } from "./drony-stan.mjs";
import { RODZAJE } from "../config/towarzysze-data.mjs";
import { AWARIE, rssiOsd, zakresAktywacji } from "../config/towarzysze-rules.mjs";
import { ukladOsd, ostrzezeniaOsd } from "../config/osd.mjs";
import { weaponEntry, readState } from "../weapons/magazine-model.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const ATLAS_OSD = `modules/${MODULE_ID}/fonts/osd/betaflight-default.webp`;
const ZNAK_W = 12;
const ZNAK_H = 18;
/** Ekran powitalny kontrolera (D23). */
const POWITANIE_MS = 2500;
/** Wysokość znaku: tyle wierszy mieści ekran (analogowe OSD ma ich kilkanaście). */
const WIERSZE_EKRANU = 24;
/** Tempo szumu RSSI — „wolno płynący” (D34). */
const TEMPO_RSSI = 0.7;

let _atlas = null;
const _glify = new Map();

async function _wczytajAtlas() {
  if (_atlas) return _atlas;
  const tex = await foundry.canvas.loadTexture(ATLAS_OSD);
  if (!tex) throw new Error(`Brak atlasu OSD: ${ATLAS_OSD}`);
  tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
  _atlas = tex;
  return tex;
}

function _glif(kod) {
  let t = _glify.get(kod);
  if (!t) {
    t = new PIXI.Texture(_atlas.baseTexture, new PIXI.Rectangle((kod % 16) * ZNAK_W, Math.floor(kod / 16) * ZNAK_H, ZNAK_W, ZNAK_H));
    _glify.set(kod, t);
  }
  return t;
}

/* -------------------------------------------- */
/*  Stan                                         */
/* -------------------------------------------- */

/** Naboje w broni (magazynek + komora) albo `null`, gdy broń nie ma magazynka (np. sztylet). */
function _amunicja(bron) {
  if (!bron || !weaponEntry(bron)?.mag) return null;
  const s = readState(bron);
  return s.rounds.length + (s.chamber ? 1 : 0);
}

function _ziarno(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

/**
 * Stan OSD z sesji i drona (wejście `ukladOsd`).
 * @param {object} sesja  `sesjaZdalna()`
 * @param {Actor} dron
 * @param {{czas: number, start: number, zaatakowal: boolean, rssi: object}} k  stan klienta
 */
export function stanOsd(sesja, dron, k) {
  const wpis = RODZAJE[towarzysz(dron)?.rodzaj] ?? {};
  const jakosc = Number(sesja?.sygnal?.jakosc ?? 1);
  const zas = stanZasilania(dron) ?? { procent: 100, minutyPozostale: null };
  const ataki = atakiDrona(dron);
  const walka = !!game.combat?.started;
  const tryb = sesja?.tryb === "A" || sesja?.tryb === "B" ? sesja.tryb : null;
  const awarie = dron.effects.map(e => AWARIE[e.flags?.[MODULE_ID]?.awaria]?.osd).filter(Boolean);
  return {
    nazwa: dron.name,
    rssi: k.rssi,
    tryb: wpis.lata ? "ACRO" : "WALK",
    aktywacja: tryb,
    ostrzezenia: ostrzezeniaOsd({ failsafe: !!sesja?.failsafeOd, jakosc, procent: zas.procent, awarie }),
    akcje: walka && tryb ? zakresAktywacji(tryb, cechyDrona(dron)).map(a => a.osd) : null,
    bron: ataki.length > 0,
    uzbrojony: ataki.length > 0 && sesja?.tryb !== "B" && !k.zaatakowal,
    amunicja: _amunicja(ataki.find(i => i.type === "weapon")),
    pw: [dron.system.attributes.hp.value, dron.system.attributes.hp.max],
    zasilanie: { procent: zas.procent, minuty: zas.minutyPozostale },
    powitanie: Date.now() - k.start < POWITANIE_MS ? liniaUruchomienia(dron) : null,
    czas: k.czas
  };
}

/* -------------------------------------------- */
/*  Rysowanie                                    */
/* -------------------------------------------- */

/** @type {{kontener: PIXI.Container, sesja: object, start: number, zaatakowal: boolean, rssi: object,
 *   rssiOd: number, tik: Function, uklad: object[], ukladOd: number}|null} */
let _osd = null;

/**
 * Siatka OSD w wolnej części kanwy: między kolumną narzędzi sceny a prawą kolumną (pasek boczny i karty czatu),
 * nad paskiem makr. Prawdziwe OSD leży w obrazie — tu obraz zasłania interfejs Foundry, więc OSD go omija.
 * Wysokość znaku z całego ekranu, żeby nie skakała, gdy interfejs się zwija.
 */
function _rozmiar() {
  const { width: w, height: h } = canvas.app.renderer.screen;
  const ch = Math.max(18, Math.min(64, h / WIERSZE_EKRANU));
  const skala = ch / ZNAK_H;
  const cw = ZNAK_W * skala;
  const rect = id => {
    const r = document.getElementById(id)?.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 ? r : null;
  };
  const x0 = Math.min(w / 3, rect("ui-left-column-1")?.right ?? 0);
  const x1 = Math.max((2 * w) / 3, rect("ui-right")?.left ?? w);
  const y1 = Math.max(h / 2, rect("hotbar")?.top ?? h);
  const kolumny = Math.floor((x1 - x0) / cw);
  const wiersze = Math.floor(y1 / ch);
  return { ch, cw, skala, kolumny, wiersze, ox: x0 + ((x1 - x0) - kolumny * cw) / 2, oy: (y1 - wiersze * ch) / 2 };
}

function _rysuj() {
  const o = _osd;
  if (!o || !canvas?.stage) return;
  const teraz = performance.now() / 1000;
  const dron = fromUuidSync(o.sesja.dronUuid);
  if (!dron) return;
  // Kontener w przestrzeni ekranu: lewy górny róg ekranu, skala odwrotna do sceny.
  const p = canvas.stage.toLocal(new PIXI.Point(0, 0));
  o.kontener.position.set(p.x, p.y);
  o.kontener.scale.set(1 / canvas.stage.scale.x, 1 / canvas.stage.scale.y);
  if (teraz - o.ukladOd >= 0.1 || !o.siatka) o.siatka = _rozmiar();
  const r = o.siatka;
  if (teraz - o.rssiOd >= 0.2) {
    o.rssi = rssiOsd(Number(o.sesja.sygnal?.jakosc ?? 1), { t: teraz * TEMPO_RSSI, ziarno: _ziarno(dron.id) });
    o.rssiOd = teraz;
  }
  if (teraz - o.ukladOd >= 0.1) {
    o.uklad = ukladOsd(stanOsd(o.sesja, dron, { czas: teraz, start: o.start, zaatakowal: o.zaatakowal, rssi: o.rssi }), r);
    o.ukladOd = teraz;
  }
  const pokaz = Math.floor(teraz * 2) % 2 === 0;
  const { ox, oy } = r;
  let i = 0;
  for (const el of o.uklad) {
    for (let j = 0; j < el.tekst.length; j++) {
      const kod = el.tekst.charCodeAt(j);
      if (kod === 0x20) continue;
      let s = o.kontener.children[i];
      if (!s) s = o.kontener.addChild(new PIXI.Sprite());
      s.texture = _glif(kod);
      s.position.set(ox + (el.x + j) * r.cw, oy + el.y * r.ch);
      s.scale.set(r.skala);
      s.visible = !el.miga || pokaz;
      i++;
    }
  }
  for (let j = i; j < o.kontener.children.length; j++) o.kontener.children[j].visible = false;
}

async function _zaloz(sesja) {
  if (_osd || !canvas?.stage) return;
  try {
    await _wczytajAtlas();
  } catch (err) {
    return console.error(`${MODULE_ID} | OSD drona`, err);
  }
  if (_osd || !canvas?.stage) return;
  const kontener = new PIXI.Container();
  kontener.eventMode = "none";
  kontener.name = "neuroDronOsd";
  kontener.zIndex = 1e9;
  canvas.stage.addChild(kontener);
  _osd = { kontener, sesja, start: Date.now(), zaatakowal: false, rssi: { wartosc: 99, kreski: 4 }, rssiOd: 0,
    tik: _rysuj, uklad: [], ukladOd: 0, siatka: null };
  canvas.app.ticker.add(_rysuj);
}

function _zdejmij() {
  const o = _osd;
  if (!o) return;
  _osd = null;
  canvas?.app?.ticker?.remove(o.tik);
  o.kontener.destroy({ children: true });
}

function _onZdalny({ stan, sesja }) {
  if (stan === "wyjscie") return _zdejmij();
  if (stan === "wejscie") {
    if (_osd) {
      // Nowa aktywacja tym samym dronem: znów atak do wykonania, znów ekran powitalny.
      Object.assign(_osd, { sesja, start: Date.now(), zaatakowal: false });
      return;
    }
    return void _zaloz(sesja);
  }
  if (_osd) _osd.sesja = sesja;
}

/** Atak drona w tym sterowaniu gasi ARMED (D34). */
function _onCreateChatMessage(message) {
  if (!_osd) return;
  const dron = fromUuidSync(_osd.sesja.dronUuid);
  if (!dron || ChatMessage.getSpeakerActor(message.speaker) !== dron) return;
  if (message.flags?.dnd5e?.roll?.type === "attack") _osd.zaatakowal = true;
}

/** OSD tego klienta (testy, diagnostyka): napisy z bieżącego układu. */
export function osdDrona() {
  if (!_osd) return null;
  return { elementy: _osd.uklad.map(e => ({ id: e.id, tekst: e.tekst, miga: !!e.miga })), zaatakowal: _osd.zaatakowal,
    naScenie: _osd.kontener.parent === canvas.stage };
}

export function registerDronyOsd() {
  Hooks.on(HOOK_ZDALNY, _onZdalny);
  Hooks.on("createChatMessage", _onCreateChatMessage);
  Hooks.on("canvasTearDown", _zdejmij);
}

export const dronyOsdApi = Object.freeze({ osdDrona, stanOsd });
