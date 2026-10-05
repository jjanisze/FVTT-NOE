/** Chase scenery, bitmap foreground and UI guides. Render-only, without masks or documents. */
import { isPoscigScene, poscigFlag, torX, FLAG_POSCIG, LANE_W, MARGIN_X, FREEFORM_Y, PAS_GORA } from "./poscig.mjs";
import { motywPoscigu } from "./poscig-themes.mjs";
import { bakeSky, bakeFar, bakeMid, bakeNear, rng } from "./poscig-art.mjs";
import { createNevada } from "./poscig-nevada.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const BASE_SPEED = 260;
const PASY = { far: { y: 200, h: 280 }, mid: { y: 400, h: 900 }, near: { y: FREEFORM_Y - 130, h: 130 } };
let _layer = null, _sprites = null, _theme = null, _ticker = null;
let _textures = [], _particles = [], _scroll = 0;
let _cost = 0, _frames = 0, _maxCost = 0;
let _nevada = null, _labels = null, _generation = 0, _error = null;
let _distance = 0;
let _loadController = null;

function remember(texture) { _textures.push(texture); return texture; }

function lanes(scene, flag, theme) {
  const g = new PIXI.Graphics();
  for (let i = 1; i <= flag.tory; i++) {
    const x = MARGIN_X + (i - 1) * LANE_W;
    if (theme.id !== "pustynia") {
      g.beginFill(i % 2 ? theme.lanes.fillB : theme.lanes.fillA, i % 2 ? .025 : .04);
      g.drawRect(x, PAS_GORA, LANE_W, FREEFORM_Y - PAS_GORA); g.endFill();
    }
    g.lineStyle(theme.id === "pustynia" ? 1.25 : 2, theme.lanes.line, theme.id === "pustynia" ? .18 : theme.lanes.alpha);
    g.moveTo(x, PAS_GORA); g.lineTo(x, FREEFORM_Y);
  }
  g.moveTo(MARGIN_X + flag.tory * LANE_W, PAS_GORA); g.lineTo(MARGIN_X + flag.tory * LANE_W, FREEFORM_Y);
  g.beginFill(theme.free.background); g.drawRect(0, FREEFORM_Y, scene.width, scene.height - FREEFORM_Y); g.endFill();
  g.lineStyle(4, theme.free.line, .8); g.moveTo(0, FREEFORM_Y); g.lineTo(scene.width, FREEFORM_Y);
  return g;
}

function labels(scene, flag, theme) {
  const box = new PIXI.Container();
  const badges = new PIXI.Graphics();
  for (let i = 1; i <= flag.tory; i++) {
    if (theme.id !== "pustynia") {
      badges.beginFill(theme.labels.stroke, .65); badges.drawRoundedRect(torX(i) - 43, PAS_GORA - 87, 86, 67, 8); badges.endFill();
    }
  }
  box.addChild(badges);
  for (let i = 1; i <= flag.tory; i++) {
    const t = new PIXI.Text(String(i + (flag.offset ?? 0)), {
      fontFamily: theme.labels.font, fontSize: theme.id === "pustynia" ? 42 : 48, fontWeight: "700", fill: theme.labels.fill,
      stroke: theme.labels.stroke, strokeThickness: 3
    });
    t.anchor.set(.5, 1); t.position.set(torX(i), PAS_GORA - (theme.id === "pustynia" ? 60 : 27)); box.addChild(t);
  }
  const heading = new PIXI.Text(`${theme.nazwa.toLocaleUpperCase("pl")}    →`, {
    fontFamily: theme.labels.font, fontSize: theme.id === "pustynia" ? 24 : 32, fontWeight: "600", fill: theme.labels.fill,
    stroke: theme.labels.stroke, strokeThickness: 3, letterSpacing: 3
  });
  heading.position.set(MARGIN_X, 78); heading.alpha = .85; box.addChild(heading);
  const caption = new PIXI.Text("STREFA SWOBODNA — schematy, siedzenia, notatki MG", {
    fontFamily: theme.labels.font, fontSize: 32, fontWeight: "600", fill: theme.free.text
  });
  caption.anchor.set(.5, 0); caption.position.set(scene.width / 2, FREEFORM_Y + 30); caption.alpha = .7; box.addChild(caption);
  return box;
}

function particles(scene, theme) {
  if (!theme.ambient) return;
  const cv = document.createElement("canvas"); cv.width = cv.height = 8;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "white"; ctx.beginPath(); ctx.ellipse(4, 4, 2, 3, -.4, 0, Math.PI * 2); ctx.fill();
  const tex = remember(PIXI.Texture.from(cv));
  tex.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
  const random = rng(theme.seed ^ 0x777);
  for (let i = 0; i < theme.ambient.count; i++) {
    const sprite = new PIXI.Sprite(tex);
    sprite.anchor.set(.5); sprite.position.set(random() * scene.width, random() * FREEFORM_Y);
    sprite.scale.set(.35 + random() * .75); sprite.tint = theme.ambient.color;
    sprite.alpha = theme.ambient.alpha * (.5 + random() * .5);
    _particles.push({ sprite, vx: 24 + random() * 36, vy: 18 + random() * 30 });
    _layer.addChild(sprite);
  }
}

function build() {
  destroy();
  const generation = _generation;
  const scene = canvas.scene, flag = poscigFlag(scene);
  if (!flag) return;
  _theme = motywPoscigu(flag);
  _layer = new PIXI.Container(); _layer.eventMode = "none"; _layer.interactiveChildren = false;
  _layer.neuroshimaPoscig = true;
  // PrimaryCanvasGroup compares elevation before sortLayer; the scene background is at zero.
  _layer.elevation = 0; _layer.sortLayer = _theme.id === "pustynia" ? 110 : 100; _layer.sort = 0;
  if (_theme.id === "pustynia") {
    _labels = labels(scene, flag, _theme);
    _labels.eventMode = "none"; _labels.interactiveChildren = false; _labels.neuroshimaPoscig = true;
    _labels.elevation = 0; _labels.sortLayer = 900; _labels.sort = 0;
    canvas.primary.addChild(_labels);
    _loadController = new AbortController();
    createNevada(scene, _distance, _loadController.signal).then(art => {
      if (generation !== _generation) { art.destroy(); return; }
      _nevada = art;
      canvas.primary.addChild(art.ground, art.front); canvas.primary.sortChildren();
    }).catch(error => {
      if (generation !== _generation) return;
      _error = error.message; console.error("[Neuroshima] Nevada artwork failed to load", error);
      ui.notifications.error("Nie udało się załadować grafiki pustyni.");
    });
  } else {
    const sky = new PIXI.Sprite(remember(bakeSky(_theme)));
    sky.width = scene.width; sky.height = 400; _layer.addChild(sky);
    _sprites = {};
    for (const [key, bake] of [["far", bakeFar], ["mid", bakeMid], ["near", bakeNear]]) {
      const band = PASY[key], tex = remember(bake(_theme, band.h));
      const sprite = new PIXI.TilingSprite(tex, scene.width, band.h);
      sprite.position.set(0, band.y); sprite.tilePosition.x = -_scroll * _theme[key].parallax;
      _sprites[key] = sprite; _layer.addChild(sprite);
    }
  }
  _layer.addChild(lanes(scene, flag, _theme));
  particles(scene, _theme);
  if (_theme.id !== "pustynia") _layer.addChild(labels(scene, flag, _theme));
  canvas.primary.addChild(_layer); canvas.primary.sortChildren();
  _ticker = canvas.app.ticker;
  _ticker.add(tick, null, PIXI.UPDATE_PRIORITY.NORMAL);
}

function destroy() {
  _generation++; _error = null;
  _ticker?.remove(tick, null); _ticker = null;
  _nevada?.destroy(); _nevada = null;
  _loadController?.abort(); _loadController = null;
  _labels?.destroy({children:true}); _labels = null;
  if (_layer && !_layer.destroyed) _layer.destroy({ children: true });
  _layer = null;
  for (const tex of _textures) if (!tex.destroyed) tex.destroy(true);
  _textures = []; _sprites = null; _particles = []; _theme = null;
}

function tick() {
  if (!_sprites && !_nevada) return;
  const begin = performance.now(), flag = poscigFlag();
  const speed = Math.max(0, Number(flag?.tempoTla ?? 2) || 0);
  const dt = Math.min(canvas.app.ticker.deltaMS, 50) / 1000;
  const requested = BASE_SPEED * speed * dt;
  const delta = _nevada ? _nevada.tick(requested) : requested;
  _distance += delta;
  _scroll = (_scroll + delta) % 8192;
  if (_sprites) {
    _sprites.far.tilePosition.x = -_scroll * _theme.far.parallax;
    _sprites.mid.tilePosition.x = -_scroll * _theme.mid.parallax;
    _sprites.near.tilePosition.x = -_scroll * _theme.near.parallax;
  }
  for (let i = 0; i < _particles.length; i++) {
    const particle = _particles[i];
    const s = particle.sprite;
    s.x -= particle.vx * speed * dt; s.y += particle.vy * speed * dt;
    if (s.x < 0) s.x += canvas.scene.width;
    if (s.y > FREEFORM_Y - 8) s.y = 8;
  }
  const cost = performance.now() - begin;
  _cost += cost; _frames++; _maxCost = Math.max(_maxCost, cost);
}

function refresh() {
  if (canvas?.ready && isPoscigScene()) build();
  else destroy();
}

export function registerPoscigCanvas() {
  Hooks.on("canvasReady", () => { _scroll = _distance = 0; refresh(); });
  Hooks.on("canvasTearDown", destroy);
  Hooks.on("updateScene", (scene, changes) => {
    if (scene.id !== canvas.scene?.id) return;
    const flag = changes.flags?.[MODULE_ID]?.[FLAG_POSCIG];
    // Tempo and round do not change art: avoid baking textures on every slider change.
    if (flag && (!_layer || ["motyw", "-=motyw", "tory", "offset"].some(key => key in flag))) refresh();
    if (changes.flags?.[MODULE_ID]?.[`-=${FLAG_POSCIG}`] !== undefined) refresh();
  });
  refresh();
}

export const poscigCanvasApi = {
  odswiez: refresh,
  /** Test-only teardown, e.g. when measuring an archived renderer without stacking layers. */
  __destroy: destroy,
  stats(reset = false) {
    const stats = { theme: _theme?.id ?? null, ready:!!(_nevada || _sprites), error:_error,
      frames: _frames, averageMs: _frames ? _cost / _frames : 0, maxMs: _maxCost, ..._nevada?.stats() };
    if (reset) _cost = _frames = _maxCost = 0;
    return stats;
  }
};
