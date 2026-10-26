/** Matched roof/interior art. A custom token image or wreck must never inherit another body. */
import { MODULE_ID } from "./stan.mjs";

export function grafikaWnetrza(doc) {
  const art = doc?.actor?.flags?.[MODULE_ID]?.pojazd?.grafika;
  return art && art.nadwozie === doc?.texture?.src ? art.wnetrze ?? null : null;
}

