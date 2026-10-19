/**
 * Neuroshima 5e — efekty silnika: dym, drgania, dźwięk (PLAN_m4_pojazdy §4.5, D8, E4).
 *
 * Wszystko liczy każdy klient sam z flagi `silnik.wl` — nic nie zapisuje się w scenie.
 *
 *  - **Dym** — natywny `ParticleGenerator` rdzenia 14 w trybie efektu, ręczne odpalanie w `onTick`: punkt
 *    rury (`KATALOG_POJAZDOW[*].rura`, ułamki kadru grafiki) przeliczany co klatkę z obrotu i środka
 *    pojazdu, kłęby lecą do tyłu pojazdu. Tekstura z `dev/vfx/gen_dym.py` (darmowy JB2A nie ma spalin).
 *  - **Drgania** — jeden ticker modułu dla całej sceny dodaje to samo przesunięcie do siatki pojazdu i jego
 *    jadących (§4.1: drżą razem). Ustawienie klienta „Drgania pojazdów” (domyślnie wł.; ruch w grze nie
 *    patrzy na systemowe „ogranicz ruch” — decyzja MG z 2026-10).
 *  - **Dźwięk** — tylko uruchomienie i zgaszenie (D8), plus nieudane odpalenie i alarm z kart czatu. Brak
 *    pliku (zamówienie w MISSING §P) = cisza, nie błąd.
 */

import { MODULE_ID, danePojazdu, jadacyPojazdu, jestZetonemPojazdu, kratkaPojazdu, obrysDziala } from "./stan.mjs";
import { obroc } from "./geometria.mjs";
import { FLAGA_SILNIK, stanSilnika } from "./silnik.mjs";

const USTAWIENIE_DRGAN = "drganiaPojazdow";
const TEKSTURA = `modules/${MODULE_ID}/vfx/pojazdy/dym.webp`;

/** Zestawy efektów (D8). `amp` — px sceny przy kratce 100 px; `hz` — drgania na sekundę. */
export const ZESTAWY = {
  benzyna: { tint: 0xdedede, alpha: [0.32, 0.5], naSekunde: 6, zycie: [1200, 2000], skala: [0.26, 0.4], rosnie: 2.4, predkosc: [22, 40], amp: 0.6, hz: 26 },
  diesel: { tint: 0x2f2f2f, alpha: [0.4, 0.6], naSekunde: 9, zycie: [1400, 2400], skala: [0.32, 0.5], rosnie: 2.6, predkosc: [16, 30], amp: 1.3, hz: 13 },
  motocykl: { tint: 0xc2cad2, alpha: [0.26, 0.42], naSekunde: 7, zycie: [800, 1300], skala: [0.14, 0.24], rosnie: 1.9, predkosc: [26, 46], amp: 0.8, hz: 38 }
};

const DZWIEKI = {
  start: { benzyna: "start-benzyna", diesel: "start-diesel", motocykl: "start-motocykl" },
  stop: "zgaszenie", nieudane: "nieudane-odpalenie", alarm: "alarm", syrena: "syrena"
};

/** @type {Map<string, foundry.canvas.animation.ParticleGenerator>} id żetonu → generator dymu */
const generatory = new Map();
const _istnieje = new Map();

/** Zestaw efektów pojazdu (albo `null` — mięśniowy). */
export function zestawPojazdu(actor) {
  const k = danePojazdu(actor)?.katalog;
  return k?.silnik ? ZESTAWY[k.silnik] ?? null : null;
}

/** Punkt rury w scenie (piksele) i kierunek „do tyłu” pojazdu. */
export function punktRury(tokenDoc) {
  const dane = danePojazdu(tokenDoc.actor);
  const rura = dane?.katalog.rura;
  if (!rura) return null;
  const kratka = kratkaPojazdu(tokenDoc.parent);
  const { w, h } = dane.obrys;
  // Kadr grafiki przodem w dół: x od lewej, y od góry → układ pojazdu (+x lewa burta = prawo ekranu, +y przód = dół).
  const lok = { x: (rura[0] - 0.5) * w * kratka, y: (rura[1] - 0.5) * h * kratka };
  const c = tokenDoc.getCenterPoint();
  const p = obroc(lok, tokenDoc.rotation);
  return { x: c.x + p.x, y: c.y + p.y, tyl: obroc({ x: 0, y: -1 }, tokenDoc.rotation) };
}

/* -------------------------------------------- */
/*  Dym                                          */
/* -------------------------------------------- */

function _zatrzymajDym(id) {
  const g = generatory.get(id);
  if (!g) return;
  generatory.delete(id);
  try { g.stop?.(); g.destroy?.(); } catch { /* scena już zniknęła */ }
}

function _uruchomDym(token) {
  const doc = token.document;
  const z = zestawPojazdu(doc.actor);
  if (!z || generatory.has(doc.id) || !obrysDziala(doc.parent)) return;
  const PG = foundry.canvas.animation?.ParticleGenerator;
  if (!PG) return;
  const k = kratkaPojazdu(doc.parent) / 100;
  let budzet = 0;
  let tyl = { x: 0, y: -1 };
  const gen = new PG({
    mode: "effect", manual: true, textures: [TEKSTURA], count: 80,
    elevation: doc.elevation ?? 0,
    lifetime: z.zycie, fade: { in: 0.1, out: 0.55 },
    alpha: z.alpha, tint: z.tint,
    scale: { min: z.skala[0] * k, max: z.skala[1] * k * z.rosnie, curve: [{ time: 0, value: 0.45 }, { time: 1, value: 1 }] },
    rotation: { speed: [-30, 30] },
    // Kierunek „do tyłu” w chwili wylotu: kłąb leci tam, gdzie była rura, nie skręca z pojazdem.
    velocity: {
      fn: (p, _dt, out) => {
        if (p.time === 0 || p.neuroVx === undefined) {
          const v = (z.predkosc[0] + Math.random() * (z.predkosc[1] - z.predkosc[0])) * k;
          const bok = (Math.random() - 0.5) * 0.5;
          p.neuroVx = (tyl.x - tyl.y * bok) * v;
          p.neuroVy = (tyl.y + tyl.x * bok) * v;
        }
        out.x = p.neuroVx;
        out.y = p.neuroVy;
      }
    },
    blend: PIXI.BLEND_MODES.NORMAL,
    onTick: (dt, g) => {
      const t = canvas.tokens?.get(doc.id);
      if (!t || t.destroyed || !t.visible || !stanSilnika(t.document.actor).wl) return;
      const r = punktRury(t.document);
      if (!r) return;
      budzet += z.naSekunde * dt * 0.001;
      const n = Math.min(Math.floor(budzet), g.adjustedMaxParticles - g.particles.length);
      if (n <= 0) return;
      budzet -= n;
      tyl = r.tyl;
      for (let i = 0; i < n; i++) {
        g.spawnParticle({ position: { x: r.x + (Math.random() - 0.5) * 4 * k, y: r.y + (Math.random() - 0.5) * 4 * k } });
      }
    }
  });
  gen.start();
  generatory.set(doc.id, gen);
}

/** Dym zgodny ze stanem wszystkich pojazdów na kanwie. */
export function odswiezDym() {
  if (!canvas.ready) return;
  const zywe = new Set();
  for (const t of canvas.tokens.placeables) {
    if (!jestZetonemPojazdu(t.document) || !zestawPojazdu(t.document.actor)) continue;
    if (stanSilnika(t.document.actor).wl) {
      zywe.add(t.document.id);
      _uruchomDym(t);
    }
  }
  for (const id of [...generatory.keys()]) if (!zywe.has(id)) _zatrzymajDym(id);
}

/* -------------------------------------------- */
/*  Drgania                                      */
/* -------------------------------------------- */

let _drgajace = new Set();

function _drgania() {
  if (!canvas.ready) return;
  const wl = game.settings.get(MODULE_ID, USTAWIENIE_DRGAN);
  const teraz = performance.now() / 1000;
  const zostaly = new Set();
  for (const id of generatory.keys()) {
    const t = canvas.tokens.get(id);
    if (!t || t.destroyed || !t.mesh) continue;
    const z = zestawPojazdu(t.document.actor);
    if (!z || !wl) continue;
    const k = kratkaPojazdu(t.document.parent) / 100;
    const faza = (id.charCodeAt(0) % 7) * 0.9;
    const dx = Math.sin(teraz * z.hz * 6.283 + faza) * z.amp * k;
    const dy = Math.sin(teraz * z.hz * 1.37 * 6.283 + faza * 2) * z.amp * 0.7 * k;
    const ruszaj = (tok) => {
      const c = tok.document.getCenterPoint();
      tok.mesh.position.set(c.x + dx, c.y + dy);
    };
    ruszaj(t);
    zostaly.add(id);
    for (const j of jadacyPojazdu(t.document)) if (j.object?.mesh) {
      ruszaj(j.object);
      zostaly.add(j.id);
    }
  }
  // Ci, którzy przestali drżeć, wracają na środek.
  for (const id of _drgajace) {
    if (zostaly.has(id)) continue;
    const t = canvas.tokens.get(id);
    if (t?.mesh && !t.destroyed) {
      const c = t.document.getCenterPoint();
      t.mesh.position.set(c.x, c.y);
    }
  }
  _drgajace = zostaly;
}

/* -------------------------------------------- */
/*  Dźwięk                                       */
/* -------------------------------------------- */

async function _graj(nazwa, tokenDoc) {
  if (!nazwa || tokenDoc?.parent !== canvas.scene) return;
  const src = `modules/${MODULE_ID}/sounds/pojazdy/${nazwa}.ogg`;
  if (!_istnieje.has(src)) _istnieje.set(src, await foundry.utils.srcExists(src).catch(() => false));
  if (!_istnieje.get(src)) return;
  foundry.audio.AudioHelper.play({ src, volume: 0.8, loop: false }, false);
}

/** Dźwięk zdarzenia pojazdu: „start”, „stop”, „nieudane”, „alarm”, „syrena”. */
export function zagraj(tokenDoc, rodzaj) {
  const k = danePojazdu(tokenDoc?.actor)?.katalog;
  const nazwa = rodzaj === "start" ? DZWIEKI.start[k?.silnik] : DZWIEKI[rodzaj];
  return _graj(nazwa, tokenDoc);
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerEfektySilnika() {
  game.settings.register(MODULE_ID, USTAWIENIE_DRGAN, {
    name: "Drgania pojazdów",
    hint: "Pracujący silnik trzęsie żetonem pojazdu i jadących. Wyłącz, jeśli przeszkadza — dym i dźwięk zostają.",
    scope: "client", config: true, type: Boolean, default: true
  });

  Hooks.on("canvasReady", () => {
    for (const id of [...generatory.keys()]) _zatrzymajDym(id);
    odswiezDym();
  });
  Hooks.on("canvasTearDown", () => {
    for (const id of [...generatory.keys()]) _zatrzymajDym(id);
  });
  Hooks.on("updateActor", (actor, changes) => {
    const s = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAGA_SILNIK}`);
    if (!s || !("wl" in s)) return;
    odswiezDym();
    const tok = actor.isToken ? actor.token : canvas.scene?.tokens.find(t => t.actorLink && t.actorId === actor.id);
    if (tok) zagraj(tok, s.wl ? "start" : "stop");
  });
  Hooks.on("createToken", () => odswiezDym());
  Hooks.on("deleteToken", doc => _zatrzymajDym(doc.id));
  Hooks.on("createChatMessage", message => {
    const d = message.flags?.[MODULE_ID]?.pojazdDzwiek;
    if (!d) return;
    const tok = fromUuidSync(d.pojazd);
    if (tok) zagraj(tok, d.rodzaj);
  });
  Hooks.once("ready", () => canvas.app?.ticker.add(_drgania, null, PIXI.UPDATE_PRIORITY.LOW));
}
