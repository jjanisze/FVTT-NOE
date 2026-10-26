/** Local winter VFX: bounded, scrolling tyre impressions and three depths of windblown snow. */
import { FREEFORM_Y, PAS_GORA, FLAG_ROLA } from "./poscig.mjs";
import { rng } from "./poscig-art.mjs";
import { wPasiePoscigu } from "./poscig-motion-model.mjs";
import { durableCanvasBase } from "./poscig-texture-source.mjs";

const MOD = "neuroshima-2026-overrides";
const MAX_MARKS = 1536, STEP = 18;

function layer(name, sortLayer) {
  const c = new PIXI.Container();
  Object.assign(c, { name, elevation: 0, sortLayer, sort: 0, eventMode: "none", interactiveChildren: false, neuroshimaPoscig: true });
  return c;
}

function texture(w, h, paint) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  paint(cv.getContext("2d", { willReadFrequently: true }));
  return new PIXI.Texture(durableCanvasBase(cv));
}

export function createSnowEffects(scene, seed) {
  const tracks = layer("poscig-snow-tracks", 180), snow = layer("poscig-snowfall", 850);
  // One repeatable tread stamp, baked once. Its white shoulders sit above the compressed blue groove.
  const tread = texture(36, 20, ctx => {
    ctx.fillStyle = "#ecf1f4b0"; ctx.fillRect(0, 1, 36, 18);
    ctx.fillStyle = "#5062749c"; ctx.fillRect(0, 4, 36, 12);
    ctx.fillStyle = "#263e559c";
    for (let x = -6; x < 40; x += 9) {
      ctx.beginPath(); ctx.moveTo(x, 5); ctx.lineTo(x + 5, 5); ctx.lineTo(x + 10, 10);
      ctx.lineTo(x + 5, 15); ctx.lineTo(x, 15); ctx.lineTo(x + 5, 10); ctx.closePath(); ctx.fill();
    }
  });
  const flake = texture(24, 24, ctx => {
    const g = ctx.createRadialGradient(12, 12, 1, 12, 12, 10);
    g.addColorStop(0, "#ffffff"); g.addColorStop(.35, "#f2f6ffce"); g.addColorStop(1, "#edf5ff00");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 24, 24);
  });
  const random = rng(seed ^ 0x574e), flakes = [], marks = [], previous = new Map(), tyreCounts = new Map();
  let cursor = 0, clock = 0, distance = 0, emitted = 0, dead = false;
  for (let i = 0; i < Math.min(600, Math.ceil(scene.width / 10)); i++) {
    const depth = i % 3, sprite = snow.addChild(new PIXI.Sprite(flake));
    sprite.anchor.set(.5); sprite.position.set(random() * scene.width, 14 + random() * (FREEFORM_Y - 28));
    sprite.scale.set((.12 + depth * .15) * (.7 + random() * .6));
    sprite.alpha = .35 + depth * .14 + random() * .13;
    flakes.push({ sprite, depth, phase: random() * Math.PI * 2, vx: 32 + depth * 42 + random() * 35, vy: 20 + depth * 20 + random() * 24 });
  }

  function stamp(x, y, separation, width, angle) {
    let mark = marks[cursor];
    if (!mark) {
      const root = tracks.addChild(new PIXI.Container());
      const a = root.addChild(new PIXI.Sprite(tread)), b = root.addChild(new PIXI.Sprite(tread));
      a.anchor.set(.5); b.anchor.set(.5); mark = marks[cursor] = { root, a, b, age: 0 };
    }
    cursor = (cursor + 1) % MAX_MARKS;
    mark.root.position.set(x, y); mark.root.rotation = angle; mark.root.visible = true;
    mark.a.position.y = -separation / 2; mark.b.position.y = separation / 2;
    for (const s of [mark.a, mark.b]) { s.width = STEP + 2; s.height = width; }
    mark.age = 0; mark.root.alpha = .68; emitted++;
  }

  function tick(delta, dt, tempo) {
    if (dead) return;
    distance += delta; clock += dt;
    for (const mark of marks) {
      mark.root.x -= delta; mark.age += delta;
      mark.root.visible = mark.root.x > -40 && mark.age < scene.width + 300;
      mark.root.alpha = .68 * Math.max(0, 1 - mark.age / (scene.width + 300));
    }
    const present = new Set();
    for (const token of canvas.tokens.placeables) {
      const d = token.document, mesh = token.mesh;
      if (d.actor?.type !== "vehicle" || !d.getFlag(MOD, FLAG_ROLA) || !mesh || token.isPreview || token._original
        || !wPasiePoscigu({ poscig: true, y: d.y, height: d.height, gridSize: scene.grid.size })) continue;
      present.add(d.id);
      if (!tyreCounts.has(d.id)) tyreCounts.set(d.id, 0);
      const length = Math.abs(mesh.width), breadth = Math.abs(mesh.height);
      const x = token.center.x - length * .32, y = token.center.y;
      const worldX = x + distance, last = previous.get(d.id);
      if (last && delta > 0 && worldX >= last.x && worldX - last.x < 180 && Math.abs(y - last.y) < 100) {
        const dx = worldX - last.x, dy = y - last.y;
        const steps = Math.floor(Math.hypot(dx, dy) / STEP);
        for (let i = 1; i <= steps; i++) {
          const t = i * STEP / Math.hypot(dx, dy);
          const py = last.y + dy * t, separation = Math.max(12, breadth * .58), width = Math.max(4, Math.min(14, breadth * .065));
          if (py - separation / 2 - width / 2 >= PAS_GORA && py + separation / 2 + width / 2 < FREEFORM_Y) {
            stamp(last.x + dx * t - distance, py, separation, width, Math.atan2(dy, dx));
            tyreCounts.set(d.id, tyreCounts.get(d.id) + 1);
          }
        }
        // Keep the sub-stamp distance so slow movement still leaves a continuous trail.
        if (steps) {
          const t = steps * STEP / Math.hypot(dx, dy);
          previous.set(d.id, { x: last.x + dx * t, y: last.y + dy * t });
        }
      } else previous.set(d.id, { x: worldX, y });
    }
    for (const id of previous.keys()) if (!present.has(id)) { previous.delete(id); tyreCounts.delete(id); }
    for (const f of flakes) {
      const s = f.sprite, wind = .8 + tempo * .22;
      s.x = (s.x - (f.vx * wind + Math.sin(clock * .6 + f.phase) * 18) * dt + scene.width) % scene.width;
      s.y += f.vy * dt;
      if (s.y > FREEFORM_Y - 14) s.y = 14;
    }
  }

  return { tracks, snow, tick,
    stats: () => ({ snowParticles: flakes.length, snowDepths: 3, tyreStamps: marks.filter(m => m.root.visible).length,
      tyrePool: marks.length, tyreLimit: MAX_MARKS, tyreEmitted: emitted, tyreVehicles: Object.fromEntries(tyreCounts) }),
    destroy() {
      if (dead) return; dead = true;
      tracks.destroy({ children: true }); snow.destroy({ children: true });
      for (const tex of [tread, flake]) tex.destroy(true);
      previous.clear(); tyreCounts.clear(); marks.length = flakes.length = 0;
    }
  };
}
