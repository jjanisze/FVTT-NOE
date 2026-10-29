/** Pod wodą: animated material on the rendered silhouette, never a rectangular token overlay.
 * A small filter per affected mesh shares one texture and one ticker. No document writes or CPU masks.
 * Coordinates come from the current render transform, so rotation, pan, zoom and texture fitting agree.
 */
import { POD_WODA } from "../config/woda-rules.mjs";

const MOD = "neuroshima-2026-overrides";
const ANIMACJA = "animacjaZanurzenia";
const SRC = `modules/${MOD}/vfx/water-surface.webp`;
export const PROFILE_WODY = Object.freeze({
  metna: { label: "Mętna", kolor: [0.29, 0.34, 0.22], jasny: [0.94, 0.95, 0.74], metnosc: 0.72 },
  sciekowa: { label: "Ścieki", kolor: [0.25, 0.21, 0.15], jasny: [0.95, 0.88, 0.72], metnosc: 0.94 },
  czysta: { label: "Czysta", kolor: [0.055, 0.43, 0.57], jasny: [0.76, 0.96, 1.0], metnosc: 0.22 }
});

const FRAGMENT = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D uWoda;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec2 uSrodek;
uniform float uWysokosc;
uniform float uCzas;
uniform float uSila;
uniform vec3 uKolor;
uniform vec3 uJasny;
uniform float uMetnosc;

// The original painting's RGB and variable alpha carry the wave detail.
// Tile an interior rectangle, not its old semicircular outside edge.
vec2 kafel(vec2 p) { return 1.0 - abs(mod(p, 2.0) - 1.0); }
void main() {
  vec4 src = texture2D(uSampler, vTextureCoord);
  if (src.a <= 0.0) { gl_FragColor = vec4(0.0); return; }
  vec3 obraz = src.rgb / src.a;
  vec2 s = vTextureCoord * inputSize.xy + outputFrame.xy;
  vec2 p = (s - uSrodek) / max(uWysokosc, 1.0);
  float t = uCzas;
  float pion = sin(t * 1.12);
  // Keep the previous lowest water level; the highest reaches another 15% of logical token height.
  float linia = -0.055 + sin(p.x * 7.0 + t * 1.7) * 0.023 + pion * 0.035 - (1.0 - pion) * 0.075;
  float zanurzenie = smoothstep(linia - 0.012, linia + 0.024, p.y);
  vec2 ruch = vec2(t * 0.09 + sin(t * 0.83) * 0.085, sin(t * 1.3) * 0.045);
  float x = 0.10 + kafel(vec2(p.x * 0.95 + 0.5 + ruch.x, 0.0)).x * 0.80;
  float y = clamp(0.47 + (p.y - linia) * 0.67 + ruch.y, 0.42, 0.84);
  vec4 material = texture2D(uWoda, vec2(x, y));
  vec3 farba = material.rgb / max(material.a, 0.001);
  float swiatlo = clamp(dot(farba, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
  // Preserve the painting's irregular crests and alpha fades, rather than drawing periodic stripes.
  vec3 barwiona = mix(uKolor * 0.30, uKolor * 1.70, smoothstep(0.15, 0.57, swiatlo));
  barwiona = mix(barwiona, uJasny, smoothstep(0.54, 0.86, swiatlo));
  vec3 czysta = clamp((farba - 0.38) * 1.65 + 0.38, 0.0, 1.0);
  vec3 woda = mix(czysta, barwiona, smoothstep(0.30, 0.60, uMetnosc));
  float jasnosc = dot(obraz, vec3(0.299, 0.587, 0.114));
  vec3 pod = mix(obraz, vec3(jasnosc), uMetnosc * 0.20 * uSila);
  float alfaFali = smoothstep(0.10, 0.90, material.a);
  float sila = uSila * zanurzenie * alfaFali;
  vec3 wynik = mix(pod, woda, sila);
  // Dry pixels remain unchanged; alpha belongs to the token, not to the water.
  wynik = mix(obraz, wynik, zanurzenie);
  gl_FragColor = vec4(wynik * src.a, src.a);
}`;

const aktywne = new Map();
const oczekujace = new Map();
let rozpoznajWode, tekstura, ticker = null, KlasaFiltra, zarejestrowano = false;

function animacja() { return game.settings.get(MOD, ANIMACJA); }

function klasaFiltra() {
  return KlasaFiltra ??= class FiltrZanurzenia extends PIXI.Filter {
    constructor(token, texture) {
      super(undefined, FRAGMENT, { uWoda: texture, uSrodek: new Float32Array(2), uWysokosc: 100,
        uCzas: 0, uSila: 0.8, uKolor: new Float32Array(3), uJasny: new Float32Array(3), uMetnosc: 0.72 });
      this.token = token;
      this.padding = 0;
    }

    apply(manager, input, output, clearMode) {
      const mesh = this.token.mesh;
      // These transforms are current at render time, including animated movement. Do not use rotated bounds.
      this.uniforms.uSrodek[0] = mesh.worldTransform.tx;
      this.uniforms.uSrodek[1] = mesh.worldTransform.ty;
      const m = mesh.parent.worldTransform;
      this.uniforms.uWysokosc = this.token.h * Math.hypot(m.c, m.d);
      super.apply(manager, input, output, clearMode);
    }
  };
}

function ustawProfil(token, entry) {
  const woda = rozpoznajWode(token.document);
  const id = Object.hasOwn(PROFILE_WODY, woda?.wyglad) ? woda.wyglad : "metna";
  const profil = PROFILE_WODY[id];
  entry.profil = id;
  for (const filtr of entry.warstwy.values()) {
    const u = filtr.uniforms;
    u.uSila = Math.max(0, Math.min(1, woda?.silaEfektu ?? 0.8));
    u.uKolor.set(profil.kolor);
    u.uJasny.set(profil.jasny);
    u.uMetnosc = profil.metnosc;
  }
}

/** Include secondary primary meshes (e.g. a turret) through their public owner, without vehicle dependencies. */
function odswiezWarstwy(token, entry) {
  const meshes = new Set([token.mesh, ...(canvas.primary?.objects ?? [])
    .filter(mesh => mesh.object === token && mesh.texture && !mesh.destroyed)]);
  for (const [mesh, filtr] of entry.warstwy) if (!meshes.has(mesh) || mesh.destroyed) {
    if (!mesh.destroyed && mesh.filters?.includes(filtr)) mesh.filters = mesh.filters.filter(f => f !== filtr);
    filtr.destroy();
    entry.warstwy.delete(mesh);
  }
  const Filtr = klasaFiltra();
  for (const mesh of meshes) if (!entry.warstwy.has(mesh) && !mesh.destroyed) {
    const filtr = new Filtr(token, entry.tekstura);
    // Each layer uses the main mesh's center and token height in apply(), so the water meets at its edges.
    mesh.filters = [filtr, ...(mesh.filters ?? [])];
    entry.warstwy.set(mesh, filtr);
  }
}

function klatka() {
  const czas = performance.now() / 1000;
  for (const [token, e] of aktywne) {
    if (token.destroyed || e.mesh.destroyed) { usun(token); continue; }
    for (const [mesh, filtr] of e.warstwy) if (mesh.visible && mesh.renderable && !mesh.destroyed)
      filtr.uniforms.uCzas = czas;
  }
}

function aktualizujTicker() {
  const appTicker = canvas?.app?.ticker;
  const potrzebny = aktywne.size > 0 && animacja() && appTicker;
  if (ticker && (!potrzebny || ticker !== appTicker)) {
    ticker.remove(klatka);
    ticker = null;
  }
  if (potrzebny && !ticker) {
    ticker = appTicker;
    ticker.add(klatka, undefined, PIXI.UPDATE_PRIORITY.LOW);
    klatka();
  }
  if (!potrzebny) for (const e of aktywne.values()) for (const f of e.warstwy.values()) f.uniforms.uCzas = 0;
}

function usun(token) {
  oczekujace.delete(token);
  const e = aktywne.get(token);
  if (!e) return;
  aktywne.delete(token);
  for (const [mesh, filtr] of e.warstwy) {
    if (!mesh.destroyed && mesh.filters?.includes(filtr)) mesh.filters = mesh.filters.filter(f => f !== filtr);
    filtr.destroy();
  }
  e.warstwy.clear();
  aktualizujTicker();
}

async function odswiezZeton(token) {
  const mesh = token?.mesh;
  if (token?.destroyed || !mesh || mesh.destroyed || !token.document.hasStatusEffect(POD_WODA)) {
    usun(token); return;
  }
  let e = aktywne.get(token);
  if (e?.mesh !== mesh) { usun(token); e = null; }
  if (e) { odswiezWarstwy(token, e); ustawProfil(token, e); return; }
  if (oczekujace.get(token) === mesh) return;
  oczekujace.set(token, mesh);
  try {
    tekstura ??= foundry.canvas.loadTexture(SRC).catch(err => { tekstura = null; throw err; });
    const texture = await tekstura;
    if (oczekujace.get(token) !== mesh || token.destroyed || mesh.destroyed || token.mesh !== mesh
      || !token.document.hasStatusEffect(POD_WODA)) return;
    e = { mesh, tekstura: texture, warstwy: new Map(), profil: "metna" };
    odswiezWarstwy(token, e);
    aktywne.set(token, e);
    ustawProfil(token, e);
    aktualizujTicker();
  } catch (err) {
    console.error(`${MOD} | efekt zanurzenia`, err);
  } finally {
    if (oczekujace.get(token) === mesh) oczekujace.delete(token);
  }
}

function odswiez() {
  for (const token of canvas?.tokens?.placeables ?? []) void odswiezZeton(token);
}

function odswiezAktora(actor) {
  for (const token of canvas?.tokens?.placeables ?? [])
    if (token.actor === actor) void odswiezZeton(token);
}

/** Read-only rendering diagnostics; also useful when investigating another module's filters. */
function diagnostyka() {
  return { aktywne: aktywne.size, oczekujace: oczekujace.size, ticker: !!ticker,
    zetony: [...aktywne].map(([t, e]) => {
      const filtr = e.warstwy.get(e.mesh), u = filtr.uniforms;
      return { id: t.id, profil: e.profil, sila: u.uSila, czas: u.uCzas, srodek: [...u.uSrodek],
        wysokosc: u.uWysokosc, podpiety: [...e.warstwy].every(([m, f]) => m.filters?.includes(f)),
        tekstura: u.uWoda.baseTexture.uid, warstwy: e.warstwy.size };
    }) };
}

export const efektyWodyApi = Object.freeze({ odswiez, diagnostyka });

export function registerEfektyWody(resolver) {
  if (zarejestrowano) return;
  zarejestrowano = true;
  rozpoznajWode = resolver;
  game.settings.register(MOD, ANIMACJA, {
    name: "Animacja zanurzenia", hint: "Ruch wody na zanurzonych pionkach. Wyłączenie pozostawia statyczny efekt na sylwetce.",
    scope: "user", config: true, type: Boolean, default: true, onChange: aktualizujTicker
  });
  Hooks.on("drawToken", odswiezZeton);
  Hooks.on("refreshToken", (t, flags) => {
    if (flags.refreshPosition || flags.refreshMesh || flags.refreshEffects || flags.refreshState) void odswiezZeton(t);
  });
  Hooks.on("updateToken", doc => { if (doc.object) void odswiezZeton(doc.object); });
  Hooks.on("updateActor", odswiezAktora);
  for (const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"])
    Hooks.on(hook, effect => { if (effect.parent instanceof Actor) odswiezAktora(effect.parent); });
  for (const hook of ["createRegion", "updateRegion", "deleteRegion", "createRegionBehavior", "updateRegionBehavior", "deleteRegionBehavior"])
    Hooks.on(hook, odswiez);
  Hooks.on("canvasReady", odswiez);
  Hooks.on("destroyToken", usun);
  Hooks.on("canvasTearDown", () => {
    oczekujace.clear();
    for (const token of aktywne.keys()) usun(token);
  });
}
