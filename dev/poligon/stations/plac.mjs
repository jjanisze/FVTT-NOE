/**
 * Plac (§5.6, shipped in H1) — an empty scene for free combination. Drag anything from the Magazyn and
 * any persona from the Obsada tab; a reset wipes it all.
 */

import { p } from "./_wspolne.mjs";

export default {
  id: "plac", name: "Plac", prio: "P1", icon: "fa-solid fa-square",
  opis: "Pusta scena do wolnych kombinacji: przeciągaj z Magazynu, dokładaj osoby z Obsady (panel → Obsada → Weź). Reset czyści wszystko.",
  gracze: 0,
  async build(k) {
    const scene = await k.scene("plac", { name: "Plac", w: 40, h: 30, color: "#4d4a40", main: true });
    await k.labels(scene, [[1, 1, "PLAC — wolna amerykanka. Reset Placu czyści tę scenę i wszystko, co na niej leży.", { size: 26, fill: "#000000" }]]);
    return { scene: scene.name };
  },
  proby: [
    p("dowolna", "Wolne", "Złóż to, czego żadne stanowisko nie składa", "Magazyn → przeciągnij na osoby; Obsada → Weź. Każda dziwna kombinacja, która się sypie, to Uwaga.")
  ]
};
