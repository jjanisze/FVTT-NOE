/**
 * Neuroshima 5e — obraz z kamery drona (PLAN_m3_towarzysze.md §7.10, D11, D34, D38, U16; E8b).
 *
 *   - **Tryb wizji „Kamera drona”** (`KAMERA_ID`) — żeton drona ma go na stałe (U16): szablon w paczce, każdy nowy
 *     żeton (`preCreateToken`) i tryb bazowy w `items/vision-sources.mjs` (bez niego każde postawienie żetonu
 *     wracało do „basic”). Mechanika i kolor z rdzennego Widzenia w ciemności: zasięg `sight.range` (Noktowizja
 *     18 m z RAW), kolor w świetle, czerń i biel w ciemności (D38, s. 205 „w czerni i bieli”).
 *   - **Analogowy kanał FPV** — filtr ekranu na `canvas.stage`, tylko u operatora w trybie zdalnym (hak
 *     `neuroshima.dronZdalny` z `drony-zdalne.mjs`). Spike E0: shader tła trybu wizji maluje wyłącznie wnętrze
 *     wielokąta wizji, więc w oświetlonej scenie „gorsze oko” kończyłoby się na 18 m, a mgła, krawędzie i OSD
 *     nie rwałyby się z obrazem. Filtr ekranu łapie wszystko, także OSD (E8c) — kontroler lotu wkleja OSD do
 *     sygnału, więc trzęsie się razem z nim.
 *     Stały wygląd (D34): ograniczone pasmo — luminancja z wąskiego rozmycia poziomego, kolor z szerokiego (rozmyty
 *     kolor jest cechą analogu; pikselizacja byłaby cyfrowa), przeplot, lekki śnieg, winieta obiektywu.
 *     Degradacja z jakością sygnału w kolejności prawdziwego analogu: więcej śniegu → zanik koloru → rwanie i
 *     przesuwanie linii → toczenie się obrazu → sam szum. Sam szum także przy FAILSAFE (D24), dronie Wyłączonym i
 *     Oślepionym (awaria 8, „OPTYKA”). Krzywa śniegu łagodna w połowie zasięgu — strojenie z E0 („przy 0,5 OSD
 *     ledwo czytelne”).
 */

import { HOOK_ZDALNY } from "./drony-zdalne.mjs";
import { jestDronem } from "./drony.mjs";
import { registerBaseVisionMode } from "../items/vision-sources.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Id trybu wizji drona. Ten sam napis w `dev/packs/build-towarzysze.mjs` (szablony; Node bez Foundry). */
export const KAMERA_ID = "neuroshimaKameraDrona";

/* -------------------------------------------- */
/*  Cel obrazu (czyste)                          */
/* -------------------------------------------- */

/**
 * Do czego dąży obraz w tej chwili: jakość sygnału 0..1 i udział samego szumu 0..1.
 * @param {object|null} sesja  `sesjaZdalna()` (`sygnal`, `failsafeOd`, `wylaczonyOd`)
 * @param {{statuses?: Set<string>}|null} dron
 * @returns {{jakosc: number, szum: number}}
 */
export function celObrazu(sesja, dron) {
  if (!sesja) return { jakosc: 1, szum: 0 };
  const jakosc = Math.min(1, Math.max(0, Number(sesja.sygnal?.jakosc ?? 1)));
  const st = dron?.statuses;
  const szum = sesja.failsafeOd || sesja.wylaczonyOd || sesja.sygnal?.utracony || st?.has("blinded") || st?.has("wylaczony") ? 1 : 0;
  return { jakosc, szum };
}

/* -------------------------------------------- */
/*  Tryb wizji                                   */
/* -------------------------------------------- */

/** „Kamera drona”: kopia rdzennego Widzenia w ciemności pod własnym id (U16). Przy `init`, przed pierwszą sceną. */
export function registerKameraDronaVision() {
  try {
    const VisionMode = foundry.canvas.perception.VisionMode;
    const core = CONFIG.Canvas.visionModes.darkvision;
    CONFIG.Canvas.visionModes[KAMERA_ID] = new VisionMode({
      id: KAMERA_ID,
      label: "Kamera drona",
      canvas: { shader: core.canvas.shader, uniforms: { ...core.canvas.uniforms } },
      lighting: core.lighting,
      vision: { ...core.vision }
    });
  } catch (err) {
    console.error(`${MODULE_ID} | tryb wizji „Kamera drona”`, err);
  }
}

/* -------------------------------------------- */
/*  Filtr kanału FPV                             */
/* -------------------------------------------- */

const FRAGMENT = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform float uJakosc;
uniform float uSzum;
uniform float uCzas;

const vec3 W = vec3(0.299, 0.587, 0.114);

// Hash bez sinusa (Dave Hoskins) — prostszy wzór dawał na szumie powtarzalny wzór w jodełkę.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// s — piksele ekranu w ramce wyjścia.
vec3 probka(vec2 s) {
  vec2 uv = (s - outputFrame.xy) * inputSize.zw;
  vec2 maks = (outputFrame.zw - 1.0) * inputSize.zw;
  return texture2D(uSampler, clamp(uv, vec2(0.0), maks)).rgb;
}

void main() {
  vec2 s = vTextureCoord * inputSize.xy + outputFrame.xy;
  vec2 rozm = outputFrame.zw;
  float q = clamp(uJakosc, 0.0, 1.0);
  float zly = 1.0 - q;
  float t = uCzas;
  float klatka = floor(t * 24.0);

  // Toczenie się obrazu (najsłabszy sygnał): pionowy przesuw z czarnym paskiem synchronizacji.
  float toczenie = smoothstep(0.3, 0.08, q);
  float przesuw = fract(t * (0.15 + 0.45 * toczenie)) * rozm.y * toczenie;
  float wRamce = mod(s.y - outputFrame.y + przesuw, rozm.y);
  float y = wRamce + outputFrame.y;
  float pasek = toczenie * (1.0 - smoothstep(0.0, rozm.y * 0.035, wRamce));

  // Rwanie: falowanie linii i pojedyncze zerwane pasy.
  float rwanie = smoothstep(0.55, 0.2, q);
  float fala = sin(y * 0.015 + t * 5.0) * 6.0 * rwanie;
  float pas = step(1.0 - 0.07 * rwanie, hash(vec2(floor(y / 24.0), klatka)));
  float zerwanie = (hash(vec2(floor(y / 2.0), klatka)) - 0.5) * 80.0 * pas;
  vec2 p = vec2(s.x + fala + zerwanie, y);

  // Pasmo analogu: luminancja wąsko, kolor szeroko (D34 — „gorsze oko” to pasmo, nie piksele).
  vec3 c0 = probka(p);
  vec3 cL = probka(p - vec2(1.5, 0.0));
  vec3 cR = probka(p + vec2(1.5, 0.0));
  vec3 wL = probka(p - vec2(5.0, 0.0));
  vec3 wR = probka(p + vec2(5.0, 0.0));
  vec3 waski = c0 * 0.4 + (cL + cR) * 0.3;
  vec3 szeroki = (c0 + cL + cR + wL + wR) * 0.2;
  vec3 kolor = vec3(dot(waski, W)) + (szeroki - vec3(dot(szeroki, W))) * 0.9;

  // Zanik koloru przy słabym sygnale (D38), potem spłaszczenie kontrastu.
  kolor = mix(vec3(dot(kolor, W)), kolor, smoothstep(0.3, 0.65, q));
  kolor = mix(kolor, vec3(0.5), 0.25 * zly * zly);

  // Śnieg: lekki zawsze, gęstnieje kwadratowo — w połowie zasięgu obraz i OSD jeszcze czytelne.
  // Ziarno szersze niż wyższe — pasmo rozmazuje szum w poziomie jak obraz.
  float ziarno = hash(floor(vec2(s.x / 2.0, s.y)) + vec2(klatka * 7.13, klatka * 3.71));
  kolor = mix(kolor, vec3(ziarno), (0.05 + 0.85 * zly * zly) * 0.8);

  // Przeplot i pasek synchronizacji.
  kolor *= 1.0 - 0.07 * mod(floor(s.y), 2.0);
  kolor *= 1.0 - 0.85 * pasek;

  // Sam szum: utrata sygnału, dron Wyłączony albo Oślepiony.
  float szum = hash(floor(vec2(s.x / 3.0, s.y / 1.5)) + vec2(klatka * 11.7, klatka * 5.3));
  float smugi = hash(vec2(floor(s.y / 3.0), klatka));
  kolor = mix(kolor, vec3(szum * 0.8 + smugi * 0.15), clamp(uSzum, 0.0, 1.0));

  // Winieta obiektywu.
  vec2 u = (s - outputFrame.xy) / rozm - 0.5;
  kolor *= 1.0 - 0.35 * dot(u, u);

  gl_FragColor = vec4(clamp(kolor, 0.0, 1.0), 1.0);
}`;

/** @type {{filter: PIXI.Filter, cel: {jakosc: number, szum: number}, tik: Function, filterArea: any}|null} */
let _kanal = null;

function _zalozFiltr(sesja) {
  if (_kanal || !canvas?.stage) return;
  const filter = new PIXI.Filter(undefined, FRAGMENT, { uJakosc: 1, uSzum: 0, uCzas: 0 });
  filter.resolution = canvas.app.renderer.resolution;
  const cel = celObrazu(sesja, fromUuidSync(sesja.dronUuid));
  filter.uniforms.uJakosc = cel.jakosc;
  filter.uniforms.uSzum = cel.szum;
  const tik = () => {
    const dt = Math.min(0.1, canvas.app.ticker.deltaMS / 1000);
    const u = filter.uniforms;
    u.uCzas = (performance.now() / 1000) % 3600;
    u.uJakosc += (_kanal.cel.jakosc - u.uJakosc) * Math.min(1, dt * 4);
    u.uSzum += (_kanal.cel.szum - u.uSzum) * Math.min(1, dt * 10);
  };
  _kanal = { filter, cel, tik, filterArea: canvas.stage.filterArea };
  canvas.stage.filterArea = canvas.app.renderer.screen;
  canvas.stage.filters = [...(canvas.stage.filters ?? []), filter];
  canvas.app.ticker.add(tik);
}

function _zdejmijFiltr() {
  const k = _kanal;
  if (!k) return;
  _kanal = null;
  canvas?.app?.ticker?.remove(k.tik);
  if (canvas?.stage) {
    const reszta = (canvas.stage.filters ?? []).filter(f => f !== k.filter);
    canvas.stage.filters = reszta.length ? reszta : null;
    canvas.stage.filterArea = k.filterArea ?? null;
  }
  k.filter.destroy();
}

function _onZdalny({ stan, sesja }) {
  if (stan === "wyjscie") return _zdejmijFiltr();
  if (stan === "wejscie") _zalozFiltr(sesja);
  if (_kanal) _kanal.cel = celObrazu(sesja, fromUuidSync(sesja.dronUuid));
}

/** Stan kanału FPV tego klienta (testy, diagnostyka). */
export function kanalFpv() {
  if (!_kanal) return null;
  const u = _kanal.filter.uniforms;
  return { jakosc: u.uJakosc, szum: u.uSzum, cel: { ..._kanal.cel }, naScenie: !!canvas.stage.filters?.includes(_kanal.filter) };
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

/** Każdy żeton drona patrzy przez „Kamerę drona” (U16) — także postawiony przez MG z katalogu i drony sprzed E8b. */
function _onPreCreateToken(tokenDoc) {
  const actor = tokenDoc.actor ?? game.actors.get(tokenDoc.actorId);
  if (!jestDronem(actor)) return;
  tokenDoc.updateSource({ "sight.enabled": true, "sight.visionMode": KAMERA_ID });
}

export function registerDronyObraz() {
  registerBaseVisionMode(actor => jestDronem(actor) ? KAMERA_ID : null);
  Hooks.on("preCreateToken", _onPreCreateToken);
  Hooks.on(HOOK_ZDALNY, _onZdalny);
  Hooks.on("canvasTearDown", _zdejmijFiltr);
}

export const dronyObrazApi = Object.freeze({ KAMERA_ID, celObrazu, kanalFpv });
