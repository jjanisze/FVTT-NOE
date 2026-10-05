/** Original, deterministic canvas artwork. Textures bake once; the ticker only scrolls them. */
export const TILE_W = 2048;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function surface(w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  return [cv, cv.getContext("2d")];
}

function texture(cv) {
  const tex = PIXI.Texture.from(cv);
  tex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
  tex.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
  return tex;
}

function wrapped(ctx, x, draw) {
  for (const offset of [-TILE_W, 0, TILE_W]) {
    ctx.save(); ctx.translate(x + offset, 0); draw(); ctx.restore();
  }
}

function wave(x, seed, amplitude) {
  const angle = x / TILE_W * Math.PI * 2;
  return Math.sin(angle * 3 + seed) * amplitude + Math.sin(angle * 7 + seed * 2) * amplitude * .28;
}

function gradient(ctx, y, h, colors) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
  return g;
}

export function bakeSky(theme) {
  const [cv, ctx] = surface(8, 512);
  ctx.fillStyle = gradient(ctx, 0, 512, theme.sky);
  ctx.fillRect(0, 0, 8, 512);
  return texture(cv);
}

/** Ruined house, seen across the road. Small windows and roof holes break the silhouette. */
function house(ctx, x, y, width, height, random, snowy = false) {
  wrapped(ctx, x, () => {
    ctx.fillStyle = "#222c2d";
    ctx.fillRect(-width / 2, y - height, width, height);
    ctx.fillStyle = snowy ? "#87929b" : "#5d574a";
    ctx.beginPath(); ctx.moveTo(-width * .6, y - height);
    ctx.lineTo(-width * .18, y - height - width * .24);
    ctx.lineTo(width * .04, y - height - width * .1);
    ctx.lineTo(width * .12, y - height - width * .22);
    ctx.lineTo(width * .6, y - height); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#747264";
    ctx.fillRect(-width / 2, y - height + 4, width * .12, height - 4);
    ctx.fillStyle = "#111b20";
    for (let i = 0; i < 3; i++) {
      const wx = -width * .33 + i * width * .28;
      ctx.fillRect(wx, y - height * .77, width * .15, height * .27);
      ctx.strokeStyle = "#859089"; ctx.lineWidth = 2;
      if (random() > .5) { ctx.beginPath(); ctx.moveTo(wx, y - height * .6); ctx.lineTo(wx + width * .15, y - height * .7); ctx.stroke(); }
    }
    ctx.fillStyle = "#182022"; ctx.fillRect(width * .1, y - height * .35, width * .22, height * .35);
    ctx.fillStyle = "#3c423d"; ctx.fillRect(-width * .57, y, width * 1.12, 8);
  });
}

export function bakeFar(theme, h = 280) {
  const [cv, ctx] = surface(TILE_W, 512);
  const random = rng(theme.seed);
  for (let band = 0; band < 3; band++) {
    const base = 85 + band * 62;
    ctx.fillStyle = gradient(ctx, base - 80, h, [theme.far.colors[band], theme.mid.colors[0]]);
    ctx.beginPath(); ctx.moveTo(-8, h + 8);
    for (let x = -8; x <= TILE_W + 8; x += 4) {
      const ridge = wave(x, band * 2.7 + 1, 34 - band * 7);
      ctx.lineTo(x, base + ridge + (theme.id === "pustynia" ? Math.abs(wave(x, 4 + band, 16)) : 0));
    }
    ctx.lineTo(TILE_W + 8, h + 8); ctx.closePath(); ctx.fill();
  }
  if (theme.id === "pustynia") {
    ctx.strokeStyle = "#756f5a"; ctx.lineWidth = 2; ctx.globalAlpha = .6;
    for (let x = -8; x < TILE_W + 8; x += 256) {
      ctx.beginPath(); ctx.moveTo(x, h - 6); ctx.lineTo(x, h - 85);
      ctx.moveTo(x - 15, h - 69); ctx.lineTo(x + 15, h - 69); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, h - 69); ctx.quadraticCurveTo(x + 128, h - 42, x + 256, h - 69); ctx.stroke();
    }
  } else {
    for (let x = 30; x < TILE_W; x += 120 + random() * 110) {
      const y = h - 28 - random() * 30;
      house(ctx, x, y, 70 + random() * 74, 40 + random() * 65, random, theme.id === "zima");
    }
    if (theme.id === "zima") {
      ctx.strokeStyle = "#35424e"; ctx.lineWidth = 5;
      for (let x = 100; x < TILE_W; x += 430) {
        ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 3, h - 105);
        ctx.moveTo(x + 2, h - 58); ctx.lineTo(x - 29, h - 83);
        ctx.moveTo(x + 2, h - 72); ctx.lineTo(x + 28, h - 99); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = .24;
  ctx.fillStyle = gradient(ctx, 90, h - 90, [theme.sky[2], theme.mid.colors[0]]);
  ctx.fillRect(0, 100, TILE_W, h - 100);
  return texture(cv);
}

function wreck(ctx, x, y, angle, snowy) {
  wrapped(ctx, x, () => {
    ctx.translate(0, y); ctx.rotate(angle);
    ctx.fillStyle = "#252c2c"; ctx.fillRect(-39, -17, 84, 37);
    ctx.fillStyle = snowy ? "#a1a8a8" : "#725242";
    ctx.fillRect(-36, -20, 76, 29);
    ctx.fillStyle = "#293b42"; ctx.fillRect(-12, -16, 25, 21);
    ctx.strokeStyle = "#b5a68b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-33, 3); ctx.lineTo(30, -13); ctx.stroke();
    ctx.fillStyle = "#131c20"; ctx.fillRect(-30, 13, 13, 9); ctx.fillRect(22, 13, 13, 9);
  });
}

export function bakeMid(theme, h = 900) {
  const [cv, ctx] = surface(TILE_W, 1024);
  const random = rng(theme.seed ^ 0x55a);
  const winter = theme.id === "zima";
  ctx.fillStyle = gradient(ctx, 0, h, [theme.mid.colors[0], theme.mid.colors[1], theme.mid.colors[0]]);
  ctx.fillRect(0, 0, TILE_W, h);
  // Broad road, shoulders and horizontal tire tracks leave vertical chase markers readable.
  const roadTop = 118, roadBottom = h - 120;
  ctx.fillStyle = gradient(ctx, roadTop, roadBottom - roadTop,
    winter ? ["#a6afb6", "#929da5", "#a9b1b5"] : ["#66635a", "#777064", "#5c5d56"]);
  ctx.fillRect(0, roadTop, TILE_W, roadBottom - roadTop);
  ctx.globalAlpha = .13;
  for (let i = 0; i < 11000; i++) {
    ctx.fillStyle = random() > .5 ? "#fff4de" : "#17252c";
    ctx.fillRect(random() * TILE_W, random() * h, 1 + random() * 3, 1 + random() * 1.8);
  }
  ctx.globalAlpha = 1;
  for (const y of [roadTop, roadBottom]) {
    ctx.fillStyle = winter ? "#d6dadb" : "#b4a88b";
    ctx.fillRect(0, y, TILE_W, 4);
    ctx.fillStyle = "#3c4039"; ctx.globalAlpha = .27; ctx.fillRect(0, y + 5, TILE_W, 7); ctx.globalAlpha = 1;
  }
  // Worn dashed markings and long, soft ruts make travel direction visible.
  for (const y of [310, 530]) {
    ctx.globalAlpha = winter ? .22 : .38; ctx.fillStyle = winter ? "#d6dadd" : "#cfbf8d";
    for (let x = 0; x < TILE_W; x += 256) ctx.fillRect(x + 40, y, 119, 5);
    ctx.globalAlpha = .10; ctx.fillStyle = "#26313a";
    for (const dy of [-52, 42]) ctx.fillRect(0, y + dy, TILE_W, 12);
  }
  // Cracks wrap at the tile boundary; no per-frame shapes or filters.
  ctx.globalAlpha = winter ? .18 : .32; ctx.strokeStyle = "#1b2427";
  for (let i = 0; i < 48; i++) {
    const x = random() * TILE_W, y = roadTop + random() * (roadBottom - roadTop);
    const points = Array.from({length: 6}, (_, j) => [j * 11 - 28, (random() - .5) * 26]);
    wrapped(ctx, x, () => {
      ctx.lineWidth = 1.1; ctx.beginPath();
      points.forEach(([px, py], j) => j ? ctx.lineTo(px, y + py) : ctx.moveTo(px, y + py)); ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;
  // Loose stones, drifts and windblown sand sit on the road shoulders.
  for (let i = 0; i < 80; i++) {
    const x = random() * TILE_W;
    const y = random() > .5 ? random() * 100 : roadBottom + 25 + random() * 85;
    const r = 3 + random() * 14;
    wrapped(ctx, x, () => {
      ctx.globalAlpha = .2; ctx.fillStyle = "#263039";
      ctx.beginPath(); ctx.ellipse(6, y + 5, r * 1.5, r * .45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .8; ctx.fillStyle = winter ? "#e1e3e1" : theme.mid.colors[2];
      ctx.beginPath(); ctx.ellipse(0, y, r, r * .55, 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  if (theme.id !== "pustynia") {
    for (let i = 0; i < 9; i++) wreck(ctx, 80 + i * 225, i % 2 ? 65 : h - 66, (random() - .5) * .7, winter);
    ctx.strokeStyle = winter ? "#747f87" : "#8c8a79"; ctx.lineWidth = 3;
    for (let x = 0; x < TILE_W; x += 128) {
      ctx.beginPath(); ctx.moveTo(x, 90); ctx.lineTo(x + 115, 90); ctx.stroke();
    }
  }
  if (winter) {
    ctx.globalAlpha = .2; ctx.fillStyle = "#e2e6e8";
    for (let i = 0; i < 80; i++) {
      const x = random() * TILE_W, y = random() * h;
      wrapped(ctx, x, () => { ctx.beginPath(); ctx.ellipse(0, y, 18 + random() * 55, 2 + random() * 5, -.06, 0, Math.PI * 2); ctx.fill(); });
    }
  }
  return texture(cv);
}

export function bakeNear(theme, h = 130) {
  const [cv, ctx] = surface(TILE_W, 256);
  const random = rng(theme.seed ^ 0x123);
  for (let i = 0; i < 38; i++) {
    const x = random() * TILE_W, y = 45 + random() * 80, r = 9 + random() * 23;
    wrapped(ctx, x, () => {
      ctx.globalAlpha = .3; ctx.fillStyle = "#182a30";
      ctx.beginPath(); ctx.ellipse(7, y + 8, r * 1.8, r * .4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .85; ctx.fillStyle = theme.near.colors[i % 2];
      if (theme.id === "przedmiescia") {
        ctx.fillRect(-r, y - 12, r * 1.7, 14); ctx.fillRect(-r * .7, y - 24, r, 12);
        ctx.strokeStyle = "#9d8970"; ctx.strokeRect(-r * .7, y - 24, r, 12);
      } else {
        ctx.beginPath();
        for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, y + Math.sin(a) * r * .4); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = theme.id === "zima" ? "#d3d9dd" : "#ad9b6b";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r * .5, y - 6); ctx.lineTo(2, y - 13); ctx.lineTo(r * .5, y - 4); ctx.stroke();
      }
    });
  }
  return texture(cv);
}
