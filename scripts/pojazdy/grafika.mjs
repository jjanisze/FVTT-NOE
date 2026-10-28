/** Matched roof/interior art. A custom token image or wreck must never inherit another body. */
import { MODULE_ID } from "./stan.mjs";

export function grafikaWnetrza(doc) {
  const art = doc?.actor?.flags?.[MODULE_ID]?.pojazd?.grafika;
  return art && art.nadwozie === doc?.texture?.src ? art.wnetrze ?? null : null;
}

/** Optional separated artwork. Coordinates are source pixels, never scene pixels. */
export function grafikaWiezy(doc) {
  const art = doc?.actor?.flags?.[MODULE_ID]?.pojazd?.grafika, w = art?.wieza;
  if (art?.nadwozie !== doc?.texture?.src || typeof art?.kadlub !== 'string' || typeof w?.src !== 'string') return null;
  if (!Array.isArray(w.kadr) || w.kadr.length !== 2 || !w.kadr.every(v=>Number.isFinite(v)&&v>0)
    || !Array.isArray(w.os) || w.os.length !== 2 || !w.os.every(Number.isFinite)
    || !Array.isArray(w.wycinek) || w.wycinek.length !== 4 || !w.wycinek.every(Number.isFinite)) return null;
  const [x,y,width,height]=w.wycinek;
  if (x<0||y<0||width<=0||height<=0||x+width>w.kadr[0]||y+height>w.kadr[1]
    || w.os[0]<x||w.os[0]>x+width||w.os[1]<y||w.os[1]>y+height) return null;
  return { kadlub: art.kadlub, ...w };
}

/** Seat-window image viewport, including native artwork which overhangs the hull footprint. */
export function kadrGrafikiMiejsc(doc,width,height) {
  const art=grafikaWiezy(doc);
  if(!art||doc.texture.fit!=="width")return{width,height,x:0,y:0};
  const imageHeight=width*art.kadr[1]/art.kadr[0];
  return{width,height:imageHeight,x:width*(0.5-(doc.texture.anchorX??0.5)),
    y:height/2-imageHeight*(doc.texture.anchorY??0.5)};
}

