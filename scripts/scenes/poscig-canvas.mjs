/**
 * Neuroshima 5e — plansza pościgu: warstwa graficzna (przewijana pustynia + tory).
 *
 * Projekt: `PLAN_poscigi.md` §2.2–2.3. Dokument sceny i stan pościgu: `poscig.mjs`.
 *
 * ## Skąd ten wzorzec
 *
 * To jest ta sama konstrukcja, co `weapons/tracer-vfx.mjs`: własny `PIXI.Container`
 * doczepiony do `canvas.stage`, tekstury pieczone proceduralnie do offscreen canvas
 * i własny wpis w tickerze. Nie ma tu nowej technologii — jest sprawdzony wzorzec
 * z tego repo, przeniesiony na tło zamiast na pociski.
 *
 * ## Gdzie to wisi i dlaczego akurat tam
 *
 * `canvas.primary`, z `sortLayer` **pomiędzy** tłem sceny a tokenami.
 *
 * Pierwsze podejście — `canvas.stage.addChildAt(_layer, 0)`, czyli pod całą grupą
 * `rendered` — wyglądało poprawnie w każdej inspekcji (warstwa istniała, miała właściwe
 * wymiary, `worldVisible === true`) i **nie renderowało zupełnie nic**. Powód: scena bez
 * obrazu tła wcale nie zostawia pustego miejsca. `canvas.primary.background` to
 * `PrimarySpriteMesh`, który maluje `levels[0].background.color` jako pełny, nieprzezroczysty
 * prostokąt na cały obszar sceny — i robi to *po* naszej warstwie. Kolor tła to nie tylko
 * kolor czyszczenia renderera; jest malowany drugi raz, jako obiekt.
 *
 * Właściwe miejsce wynika wprost z `PrimaryCanvasGroup.SORT_LAYERS`
 * (`SCENE: 0, TILES: 500, DRAWINGS: 600, TOKENS: 700, WEATHER: 1000`): warstwa z
 * `sortLayer` między `SCENE` a `TILES` ląduje nad tłem sceny, a pod kaflami, rysunkami
 * i tokenami. `PrimaryCanvasGroup._compareObjects` porównuje kolejno `elevation`,
 * `sortLayer`, `sort`, `zIndex` — dlatego `elevation` musi być równe 0 (tyle ma tło),
 * inaczej porównanie kończy się na pierwszym kroku i `sortLayer` nigdy nie zadziała.
 *
 * ## Tory rysowane tutaj, a nie jako dokumenty Drawing
 *
 * Dwa powody. Przy recentrowaniu pola numery torów muszą się przenumerować natychmiast —
 * jako `Drawing` to kilkanaście zapisów dokumentów na każde przesunięcie, z replikacją
 * i migotaniem; tutaj wystarczy przebudować warstwę, bo etykiety czyta się z flagi sceny
 * (`offset`). Drugi powód jest dla MG: warstwa Rysunków zostaje **pusta i jego**, na
 * schematy wozu w strefie swobodnej. Nasze tory nie mieszają się z jego szkicami.
 *
 * ## Pułapki, na które ten plik uważa
 *
 *  - **`sprite.mask` w tym środowisku po cichu nie działa.** Nigdzie tu nie ma maski —
 *    warstwy są przycięte geometrią i pozycją, nie maskowaniem.
 *  - **Ticker.** `canvas.app.ticker` renderuje na priorytecie LOW, nasz update leci na
 *    domyślnym NORMAL, czyli przed renderem tej samej klatki — tak jak w `tracer-vfx.mjs`.
 *  - **Teardown.** Tekstury są nasze (upieczone), więc niszczymy je jawnie razem z warstwą.
 *    Bez tego każde wejście na planszę zostawiałoby po sobie kilka megabajtów w GPU.
 */

import {
  isPoscigScene, poscigFlag, torX, FLAG_POSCIG,
  LANE_W, MARGIN_X, FREEFORM_Y, PAS_GORA
} from "./poscig.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Strojenie wyglądu                            */
/* -------------------------------------------- */

/**
 * Podmiana proceduralnej pustyni na autorską grafikę: wpisz tu ścieżki do
 * poziomo kafelkujących się PNG-ów i tyle. `null` = upiecz proceduralnie.
 * Ten sam zamysł, co `tracer-vfx.mjs` („an authored PNG can be swapped in later”).
 */
export const DESERT_TEXTURES = { far: null, mid: null, near: null };

/** Szerokość pieczonego kafla. Musi być potęgą dwójki dla czystego kafelkowania. */
const TILE_W = 1024;

/** Bazowa prędkość przewijania warstwy środkowej, w pikselach na sekundę. */
const BASE_SPEED = 260;

/** Mnożniki paralaksy — im bliżej widza, tym szybciej. */
const PARALLAX = { far: 0.25, mid: 1.0, near: 2.0 };

/**
 * Warstwa sortowania w `canvas.primary`: nad tłem sceny (`SORT_LAYERS.SCENE === 0`),
 * pod kaflami (`TILES === 500`), a więc i pod rysunkami MG oraz tokenami.
 */
const SORT_LAYER_PUSTYNIA = 100;

/** Pasy poziome planszy (współrzędne sceny). */
const PASY = {
  niebo:  { y: 0,    h: 360 },
  far:    { y: 200,  h: 280 },
  mid:    { y: 400,  h: FREEFORM_Y - 400 },
  near:   { y: FREEFORM_Y - 130, h: 130 }
};

const KOLORY = {
  nieboGora:   "#c9d8e4",
  nieboDol:    "#e8d3a9",
  wydmyDaleko: "#c2a273",
  gruntBaza:   "#b98f5a",
  gruntCien:   "#a67c49",
  gruntSwiatlo:"#cba471",
  skala:       "#8c6a41",
  krzak:       "#6d5a37",
  torLinia:    0x3b2c1a,
  torWypelnA:  0x000000,
  torWypelnB:  0xffffff,
  swobodnaTlo: 0x241c12,
  swobodnaLin: 0x8c6a41
};

/* -------------------------------------------- */
/*  Deterministyczny szum                        */
/* -------------------------------------------- */

/**
 * Mulberry32 — mały, szybki PRNG z ziarnem. Ziarno jest stałe, żeby pustynia wyglądała
 * tak samo po każdym przeładowaniu. MG, który raz ustawił kamerę, nie chce zastać innej
 * planszy po F5.
 */
function _rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Suma sinusów o **całkowitych** harmonicznych względem szerokości kafla. Dzięki temu
 * wartość w x=0 i x=TILE_W jest identyczna, czyli kafel łączy się bezszwowo. To jest cały
 * sekret bezszwowości tej pustyni — nie ma tu żadnego blendowania krawędzi.
 */
function _fala(x, w, skladniki) {
  let y = 0;
  for (const [harmonia, amplituda, faza] of skladniki) {
    y += amplituda * Math.sin(((2 * Math.PI * harmonia * x) / w) + faza);
  }
  return y;
}

/**
 * O tyle pikseli kształty wychodzą poza kafel z każdej strony.
 *
 * Sam przebieg z `_fala()` jest okresowy, więc kafel łączy się co do piksela — ale ścieżka
 * kończąca się dokładnie na `x = 0` i `x = TILE_W` dostaje od canvasu antyaliasing na
 * krawędzi, czyli kolumnę pikseli o częściowej alfie. Po skafelkowaniu widać ją jako
 * cienką pionową kreskę przesuwającą się przez planszę — najwyraźniej tam, gdzie warstwa
 * graniczy z przezroczystością (dalekie wydmy na tle nieba). Rysowanie z zapasem poza
 * kafel przenosi tę krawędź poza obszar, który się kafelkuje.
 */
const OVERDRAW = 6;

/** Rysuje `fn` trzy razy (x, x−W, x+W), żeby kształt przy krawędzi wracał z drugiej strony. */
function _zZawijaniem(ctx, x, w, fn) {
  fn(x);
  if (x < w * 0.15) fn(x + w);
  if (x > w * 0.85) fn(x - w);
}

function _canvas(w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  return cv;
}

/* -------------------------------------------- */
/*  Pieczenie tekstur                            */
/* -------------------------------------------- */

/** Niebo: statyczny gradient, nie kafelkuje się i nie musi — nie przewija się. */
function _bakeNiebo(h) {
  const cv = _canvas(8, h);
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, KOLORY.nieboGora);
  g.addColorStop(1, KOLORY.nieboDol);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, h);
  return PIXI.Texture.from(cv);
}

/** Dalekie wydmy: sylwetka na przezroczystym tle, niski kontrast. */
function _bakeFar(h) {
  const cv = _canvas(TILE_W, h);
  const ctx = cv.getContext("2d");
  const grzbiety = [
    { skl: [[1, 26, 0.4], [2, 13, 1.9], [3, 6, 3.1]], y: h * 0.55, kolor: KOLORY.wydmyDaleko, alpha: 0.55 },
    { skl: [[1, 18, 2.2], [3, 9, 0.7], [5, 4, 2.6]], y: h * 0.75, kolor: KOLORY.wydmyDaleko, alpha: 0.85 }
  ];
  for (const g of grzbiety) {
    ctx.globalAlpha = g.alpha;
    ctx.fillStyle = g.kolor;
    ctx.beginPath();
    ctx.moveTo(-OVERDRAW, h);
    for (let x = -OVERDRAW; x <= TILE_W + OVERDRAW; x += 4) {
      ctx.lineTo(x, g.y + _fala(x, TILE_W, g.skl));
    }
    ctx.lineTo(TILE_W + OVERDRAW, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return PIXI.Texture.from(cv);
}

/** Grunt: baza + pasma tonalne + drobiny + kamienie. Główna faktura planszy. */
function _bakeMid(h) {
  const cv = _canvas(TILE_W, h);
  const ctx = cv.getContext("2d");
  const rnd = _rng(0x5EED_1);

  ctx.fillStyle = KOLORY.gruntBaza;
  ctx.fillRect(0, 0, TILE_W, h);

  // Pasma jasne i ciemne — sugerują koleiny i wywiany piach.
  for (let i = 0; i < 14; i++) {
    const y = rnd() * h;
    const gr = 26 + rnd() * 60;
    ctx.globalAlpha = 0.10 + rnd() * 0.14;
    ctx.fillStyle = rnd() > 0.5 ? KOLORY.gruntSwiatlo : KOLORY.gruntCien;
    ctx.beginPath();
    const skl = [[1 + Math.floor(rnd() * 3), 8 + rnd() * 14, rnd() * 6.283]];
    ctx.moveTo(-OVERDRAW, y);
    for (let x = -OVERDRAW; x <= TILE_W + OVERDRAW; x += 8) {
      ctx.lineTo(x, y + _fala(x, TILE_W, skl));
    }
    ctx.lineTo(TILE_W + OVERDRAW, y + gr);
    for (let x = TILE_W + OVERDRAW; x >= -OVERDRAW; x -= 8) {
      ctx.lineTo(x, y + gr + _fala(x, TILE_W, skl));
    }
    ctx.closePath();
    ctx.fill();
  }

  // Drobiny żwiru.
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * TILE_W;
    const y = rnd() * h;
    const r = 0.6 + rnd() * 1.9;
    ctx.fillStyle = rnd() > 0.45 ? KOLORY.gruntCien : KOLORY.gruntSwiatlo;
    _zZawijaniem(ctx, x, TILE_W, px => {
      ctx.beginPath(); ctx.arc(px, y, r, 0, 6.283); ctx.fill();
    });
  }

  // Kamienie z cieniem — dają oku punkt zaczepienia, po którym widać ruch.
  for (let i = 0; i < 34; i++) {
    const x = rnd() * TILE_W;
    const y = rnd() * h;
    const r = 3 + rnd() * 9;
    _zZawijaniem(ctx, x, TILE_W, px => {
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = "#000000";
      ctx.beginPath(); ctx.ellipse(px + r * 0.4, y + r * 0.4, r, r * 0.62, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = KOLORY.skala;
      ctx.beginPath(); ctx.ellipse(px, y, r, r * 0.66, rnd() * 3.14, 0, 6.283); ctx.fill();
    });
  }

  ctx.globalAlpha = 1;
  return PIXI.Texture.from(cv);
}

/** Bliskie krzaki: rozmyte ciemne plamy, przezroczyste tło, duża prędkość paralaksy. */
function _bakeNear(h) {
  const cv = _canvas(TILE_W, h);
  const ctx = cv.getContext("2d");
  const rnd = _rng(0x5EED_2);
  ctx.filter = "blur(3px)";
  for (let i = 0; i < 60; i++) {
    const x = rnd() * TILE_W;
    const y = h * (0.25 + rnd() * 0.7);
    const r = 6 + rnd() * 22;
    ctx.globalAlpha = 0.25 + rnd() * 0.4;
    ctx.fillStyle = KOLORY.krzak;
    _zZawijaniem(ctx, x, TILE_W, px => {
      ctx.beginPath(); ctx.ellipse(px, y, r, r * (0.4 + rnd() * 0.4), 0, 0, 6.283); ctx.fill();
    });
  }
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  return PIXI.Texture.from(cv);
}

/* -------------------------------------------- */
/*  Warstwa                                      */
/* -------------------------------------------- */

let _layer = null;
let _sprites = null;          // {far, mid, near}
let _tekstury = [];           // upieczone przez nas — do jawnego zniszczenia
let _tickerBound = false;

/** Rysuje tory i strefę swobodną. Wołane przy budowie i przy zmianie liczby torów. */
function _rysujTory(scene, flaga) {
  const g = new PIXI.Graphics();
  const tory = flaga.tory;
  const dolPasa = FREEFORM_Y;

  for (let i = 1; i <= tory; i++) {
    const x = MARGIN_X + (i - 1) * LANE_W;
    // Naprzemienne wypełnienie — czytelne, nawet gdy tło akurat jest jednolite.
    g.beginFill(i % 2 ? KOLORY.torWypelnB : KOLORY.torWypelnA, i % 2 ? 0.045 : 0.07);
    g.drawRect(x, PAS_GORA, LANE_W, dolPasa - PAS_GORA);
    g.endFill();
    g.lineStyle(2, KOLORY.torLinia, 0.35);
    g.moveTo(x, PAS_GORA);
    g.lineTo(x, dolPasa);
  }
  // Domknięcie prawej krawędzi ostatniego toru.
  const xKoniec = MARGIN_X + tory * LANE_W;
  g.lineStyle(2, KOLORY.torLinia, 0.35);
  g.moveTo(xKoniec, PAS_GORA);
  g.lineTo(xKoniec, dolPasa);

  // Strefa swobodna: wyraźnie inny, „nie-drogowy” materiał.
  g.beginFill(KOLORY.swobodnaTlo, 0.92);
  g.drawRect(0, FREEFORM_Y, scene.width, scene.height - FREEFORM_Y);
  g.endFill();
  g.lineStyle(4, KOLORY.swobodnaLin, 0.8);
  g.moveTo(0, FREEFORM_Y);
  g.lineTo(scene.width, FREEFORM_Y);

  return g;
}

function _etykietaToru(n) {
  return new PIXI.Text(String(n), {
    fontFamily: "Signika, sans-serif",
    fontSize: 64,
    fontWeight: "700",
    fill: 0xf3e2c0,
    stroke: 0x2b1f12,
    strokeThickness: 8
  });
}

function _rysujEtykiety(flaga) {
  const box = new PIXI.Container();
  for (let i = 1; i <= flaga.tory; i++) {
    const t = _etykietaToru(i + (flaga.offset ?? 0));
    t.anchor.set(0.5, 1);
    t.position.set(torX(i), PAS_GORA - 12);
    box.addChild(t);
  }
  return box;
}

function _podpisStrefy(scene) {
  const t = new PIXI.Text("STREFA SWOBODNA — schematy, siedzenia, notatki MG", {
    fontFamily: "Signika, sans-serif",
    fontSize: 40,
    fontWeight: "600",
    fill: 0x9c8a6a,
    stroke: 0x140f08,
    strokeThickness: 6
  });
  t.anchor.set(0.5, 0);
  t.position.set(scene.width / 2, FREEFORM_Y + 24);
  t.alpha = 0.75;
  return t;
}

function _buduj() {
  _zniszcz();
  const scene = canvas.scene;
  const flaga = poscigFlag(scene);
  if (!flaga) return;

  _layer = new PIXI.Container();
  _layer.eventMode = "none";
  _layer.sortableChildren = false;
  // Musi być 0 — tyle ma tło sceny. Inna wartość i `_compareObjects` rozstrzygnie
  // kolejność już na `elevation`, zanim w ogóle spojrzy na `sortLayer`.
  _layer.elevation = 0;
  _layer.sortLayer = SORT_LAYER_PUSTYNIA;
  _layer.sort = 0;

  // — niebo (statyczne)
  const niebo = new PIXI.Sprite(_zapamietaj(_bakeNiebo(PASY.niebo.h)));
  niebo.position.set(0, PASY.niebo.y);
  niebo.width = scene.width;
  niebo.height = PASY.niebo.h;
  _layer.addChild(niebo);

  // — trzy warstwy paralaksy
  const mk = (klucz, pas, texFn) => {
    const tex = DESERT_TEXTURES[klucz]
      ? PIXI.Texture.from(DESERT_TEXTURES[klucz])
      : _zapamietaj(texFn(pas.h));
    // Bez tego kafelkowanie zostaje na domyślnym CLAMP i skrajna kolumna pikseli wylewa
    // się na sąsiedni kafel — widać to jako cienką pionową kreskę wędrującą przez planszę,
    // najwyraźniej tam, gdzie warstwa jest przezroczysta. Wysokości pasów nie są potęgami
    // dwójki, więc na tym wprost zależy, czy sterownik w ogóle włączy powtarzanie.
    tex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    const s = new PIXI.TilingSprite(tex, scene.width, pas.h);
    s.position.set(0, pas.y);
    _layer.addChild(s);
    return s;
  };
  _sprites = {
    far: mk("far", PASY.far, _bakeFar),
    mid: mk("mid", PASY.mid, _bakeMid),
    near: mk("near", PASY.near, _bakeNear)
  };

  // — tory, etykiety, strefa swobodna
  _layer.addChild(_rysujTory(scene, flaga));
  _layer.addChild(_rysujEtykiety(flaga));
  _layer.addChild(_podpisStrefy(scene));

  canvas.primary.addChild(_layer);
  canvas.primary.sortChildren();
}

function _zapamietaj(tex) {
  _tekstury.push(tex);
  return tex;
}

function _zniszcz() {
  // Warstwa siedzi w `canvas.primary`, a ta bywa zniszczona przed nami przy zmianie sceny —
  // wtedy PIXI zabrał już nasze dzieci i drugie `destroy()` rzuciłoby wyjątkiem.
  if (_layer && !_layer.destroyed) _layer.destroy({ children: true });
  _layer = null;
  // Tekstury pieczone przez nas nie znikają z `destroy({children:true})` — bazowa tekstura
  // jest współdzielona przez cache PIXI i trzeba ją zwolnić jawnie.
  for (const t of _tekstury) t.destroy(true);
  _tekstury = [];
  _sprites = null;
}

/* -------------------------------------------- */
/*  Animacja                                     */
/* -------------------------------------------- */

function _tick() {
  if (!_sprites) return;
  const flaga = poscigFlag();
  if (!flaga) return;

  const dt = Math.min(canvas.app.ticker.deltaMS, 50) / 1000;   // przycięcie dużych przerw
  const v = BASE_SPEED * (flaga.tempoTla ?? 1);

  // Ujemny kierunek: świat płynie w lewo, czyli jedziemy w prawo.
  _sprites.far.tilePosition.x -= v * PARALLAX.far * dt;
  _sprites.mid.tilePosition.x -= v * PARALLAX.mid * dt;
  _sprites.near.tilePosition.x -= v * PARALLAX.near * dt;
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

function _odswiez() {
  if (canvas?.ready && isPoscigScene()) _buduj();
  else _zniszcz();
}

export function registerPoscigCanvas() {
  Hooks.on("canvasReady", _odswiez);
  Hooks.on("canvasTearDown", _zniszcz);

  // Zmiana liczby torów albo tempa tła przebudowuje warstwę.
  Hooks.on("updateScene", (scene, changes) => {
    if (scene.id !== canvas.scene?.id) return;
    if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${FLAG_POSCIG}`)) _odswiez();
  });

  if (!_tickerBound) {
    canvas.app.ticker.add(_tick);
    _tickerBound = true;
  }

  _odswiez();
  console.log("Neuroshima 5e | Warstwa planszy pościgu zarejestrowana");
}

export const poscigCanvasApi = { odswiez: _odswiez };
