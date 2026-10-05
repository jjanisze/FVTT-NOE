/** Image-model Nevada art, viewed obliquely at about 45°. No scene/token documents are changed. */
import { FREEFORM_Y } from "./poscig.mjs";

const ROOT = "modules/neuroshima-2026-overrides/ui/poscig/themes/pustynia/";
const mod = (n, d) => ((n % d) + d) % d;

function container(name, sortLayer) {
  const c = new PIXI.Container();
  c.name = name; c.eventMode = "none"; c.interactiveChildren = false;
  c.elevation = 0; c.sortLayer = sortLayer; c.sort = 0; c.neuroshimaPoscig = true;
  return c;
}

function image(file) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`Cannot load chase artwork: ${file}`));
    im.src = ROOT + file;
  });
}

function texture(source, repeat = false) {
  // Own these textures; never destroy a Foundry/global cached texture used by another consumer.
  const base = new PIXI.BaseTexture(source, {
    mipmap: PIXI.MIPMAP_MODES.OFF, scaleMode: PIXI.SCALE_MODES.LINEAR,
    wrapMode: repeat ? PIXI.WRAP_MODES.REPEAT : PIXI.WRAP_MODES.CLAMP
  });
  return new PIXI.Texture(base);
}

function surface(w, h) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  return cv;
}

/** Composite existing bitmap pixels once: crossfade the loop seam and feather the terrain join. */
function loopTexture(im, fadeTop = false) {
  const overlap = Math.round(im.width * .14), period = im.width - overlap;
  const strip = surface(period, im.height), ctx = strip.getContext("2d");
  ctx.drawImage(im, 0, 0);
  const cap = surface(overlap, im.height), cc = cap.getContext("2d");
  cc.drawImage(im, period, 0, overlap, im.height, 0, 0, overlap, im.height);
  cc.globalCompositeOperation = "destination-in";
  const seam = cc.createLinearGradient(0, 0, overlap, 0);
  seam.addColorStop(0, "#fff"); seam.addColorStop(1, "#ffffff00");
  cc.fillStyle = seam; cc.fillRect(0, 0, overlap, im.height);
  ctx.drawImage(cap, 0, 0);
  const out = surface(2048, 1024), oc = out.getContext("2d");
  oc.drawImage(strip, 0, 0, out.width, out.height);
  if (fadeTop) {
    oc.globalCompositeOperation = "destination-in";
    const fade = oc.createLinearGradient(0, 0, 0, 150);
    fade.addColorStop(0, "#ffffff00"); fade.addColorStop(1, "#fff");
    oc.fillStyle = fade; oc.fillRect(0, 0, out.width, out.height);
  }
  // Drop staging pixel buffers after creating the final GPU resource.
  strip.width = cap.width = 1;
  return texture(out, true);
}

/** Crop the bitmap quad itself. Neither sprite.mask nor input/roof occlusion is involved. */
function clippedProp(base, frame, height, alpha = 1, crop = .78) {
  const [x, y, w, h] = frame, fh = Math.floor(h * crop);
  const rect = new PIXI.Rectangle(x, y, w, fh);
  const tex = new PIXI.Texture(base, rect);
  const sprite = new PIXI.Sprite(tex);
  sprite.eventMode = "none"; sprite.alpha = alpha;
  const scale = height / fh; sprite.scale.set(scale);
  sprite.y = FREEFORM_Y - height;
  return {sprite, tex, rect, x, y, w, fh, scale, width:w * scale};
}

function place(prop, left, sceneWidth) {
  const clippedLeft = Math.max(0, left), right = Math.min(sceneWidth, left + prop.width);
  prop.sprite.visible = right > clippedLeft;
  if (!prop.sprite.visible) return;
  const inset = (clippedLeft - left) / prop.scale, width = (right - clippedLeft) / prop.scale;
  if (prop.rect.x !== prop.x + inset || prop.rect.width !== width) {
    prop.rect.x = prop.x + inset; prop.rect.width = width; prop.tex.updateUvs();
  }
  prop.sprite.x = clippedLeft;
}

export async function createNevada(scene, distance = 0) {
  const manifest = await fetch(ROOT + "manifest.json").then(r => {
    if (!r.ok) throw new Error("Cannot load Nevada artwork manifest");
    return r.json();
  });
  const loaded = await Promise.all(Object.entries(manifest.images).map(async ([key, asset]) => [key, await image(asset.file)]));
  const images = Object.fromEntries(loaded), owned = [];
  const keep = tex => { owned.push(tex); return tex; };
  const ground = container("poscig-nevada-ground", 100);
  const front = container("poscig-nevada-foreground", 750);
  const a = container("poscig-front-a", 750), b = container("poscig-front-b", 800);
  front.addChild(a, b);
  const hills = new PIXI.TilingSprite(keep(loopTexture(images.hills)), scene.width, 540);
  hills.tileScale.set(.65); ground.addChild(hills);
  const road = new PIXI.TilingSprite(keep(loopTexture(images.ground, true)), scene.width, 1000);
  road.y = 300; road.tileScale.y = 1000 / 1024; ground.addChild(road);
  // Atlas textures retain genuine generated alpha; no colour-key removal or drawn replacement props.
  const plants = keep(texture(images.plants)), structures = keep(texture(images.structures));
  const dustTex = keep(texture(images.dust));
  const props = [], dust = [];
  const period = scene.width + 2200;
  const add = (group, atlas, key, name, height, start, rate) => {
    const p = clippedProp(atlas.baseTexture, manifest.images[key].frames[name], height);
    p.sprite.name = name; p.start = start; p.rate = rate;
    group.addChild(p.sprite); props.push(p);
  };
  add(a, plants, "plants", "joshua", 285, 310, 1.28);
  add(a, plants, "plants", "cholla", 195, 2150, 1.28);
  add(a, plants, "plants", "dead-tree", 290, 3820, 1.28);
  add(b, structures, "structures", "sign", 330, 1370, 1.72);
  add(b, structures, "structures", "roof", 255, 3230, 1.72);
  add(b, structures, "structures", "pole", 310, 4810, 1.72);
  for (let i = 0; i < 4; i++) {
    const p = clippedProp(dustTex.baseTexture, manifest.images.dust.frames[`dust-${i + 1}`], 60 + i * 8, .10, 1);
    p.sprite.y = 550 + i * 175; p.start = 150 + i * 850; p.rate = .92 + i * .05;
    ground.addChild(p.sprite); dust.push(p);
  }
  let hillPhase = 0, roadPhase = 0, nearA = 0, nearB = 0;
  const dustPhases = new Float64Array(4);
  const tick = delta => {
    hillPhase = mod(hillPhase + delta * .28, 2048 * .65);
    roadPhase = mod(roadPhase + delta, 2048);
    nearA = mod(nearA + delta * 1.28, period);
    nearB = mod(nearB + delta * 1.72, period);
    hills.tilePosition.x = -hillPhase; road.tilePosition.x = -roadPhase;
    for (const p of props) place(p, mod(p.start - (p.rate === 1.28 ? nearA : nearB), period) - 500, scene.width);
    for (let i = 0; i < dust.length; i++) {
      const p = dust[i]; dustPhases[i] = mod(dustPhases[i] + delta * p.rate, period);
      place(p, mod(p.start - dustPhases[i], period) - 300, scene.width);
    }
  };
  tick(distance);
  return {
    ground, front, tick,
    stats: () => ({cameraDegrees:45, foregroundLayers:2, foregroundProps:props.length, bitmapTextures:owned.length}),
    destroy() {
      ground.destroy({children:true}); front.destroy({children:true});
      for (const p of [...props, ...dust]) p.tex.destroy(false);
      for (const tex of owned) {
        const source = tex.baseTexture.resource.source;
        tex.destroy(true);
        if (source instanceof HTMLCanvasElement) source.width = source.height = 1;
      }
    }
  };
}
