/**
 * Ciemnia (§5.3, P1) — judged from a player's seat: latarki, NVG / thermal, 220°, flary, pochodnia,
 * Mołotow light, darkness. A night ruin (darkness 1.0) with walls, doors and windows and a few
 * ambient lights; three personas (Gracz 1–3) with a torch-light, night vision and thermal goggles;
 * hidden creatures, warm (mutants) and cold (machines). The drone camera is the Hangar's.
 */

import { p } from "./_wspolne.mjs";

async function wlacz(k, actor, item, slot) {
  if (!item) return;
  if (slot) await k.place(actor, item, slot);
  const N = game.neuroshima;
  const api = item.flags?.["neuroshima-2026-overrides"]?.gogleWariant ? N.gogle : N.latarka;
  try {
    await api.insertBattery?.(item);
    await api.turnOn?.(item);
  } catch (err) {
    k.miss(`${item.name}: ${err.message}`);
  }
}

export default {
  id: "ciemnia", name: "Ciemnia", prio: "P1", icon: "fa-solid fa-moon",
  opis: "Nocne ruiny (ciemność 1,0), ściany, drzwi i okna, kilka lamp. Gracz 1: latarka ręczna i czołówka; Gracz 2: noktowizor; Gracz 3: termowizor, pochodnia, flary, pistolet na race, Mołotow. Ukryte BN: ciepłe (Pies mutek, Neokot) i zimne (Spawacz, Mobsprzęt).",
  gracze: 3,
  klucz: [],
  async build(k) {
    const s = await k.scene("ruiny", { name: "Ciemnia · Ruiny nocą", w: 44, h: 30, color: "#1f2226", darkness: 1, globalLight: false, vision: true, fog: true, main: true });
    await k.walls(s, [
      ...k.room(4, 4, 14, 10, { door: { side: "e", at: 4 }, windows: [{ side: "n", at: 3 }, { side: "n", at: 9 }, { side: "s", at: 6 }] }),
      ...k.room(24, 3, 16, 9, { door: { side: "s", at: 2 }, windows: [{ side: "w", at: 4 }] }),
      [24, 7, 32, 7], [32, 7, 32, 12, "door"],
      ...k.room(8, 18, 10, 8, { door: { side: "n", at: 5 } }),
      [26, 16, 38, 16], [38, 16, 38, 27], [30, 22, 38, 22, "window"]
    ]);
    await k.lights(s, [
      { x: 20, y: 15, bright: 2, dim: 6, color: "#ffb347", animation: { type: "torch", speed: 3, intensity: 3 } },
      { x: 36, y: 25, bright: 1, dim: 4, color: "#9ad1ff" },
      { x: 11, y: 22, bright: 0, dim: 3, color: "#ff6b3d", animation: { type: "flame", speed: 4, intensity: 4 } }
    ]);

    const g1 = await k.persona("latarka", "zwiadowca-1", { owner: "Gracz 1", name: "Z latarką" });
    const g2 = await k.persona("noktowizor", "zlodziej-1", { owner: "Gracz 2", name: "Z noktowizorem" });
    const g3 = await k.persona("termowizor", "twardziel-1", { owner: "Gracz 3", name: "Z termowizorem" });
    await k.give(g1, [{ ref: "sprzet:Baterie", qty: 6 }]);
    const [lr, lc] = await k.give(g1, [{ ref: "sprzet:Latarka ręczna" }, { ref: "sprzet:Latarka czołówka" }]);
    await wlacz(k, g1, lr, "hand.1");
    await wlacz(k, g1, lc, "headGear");
    await k.give(g2, [{ ref: "sprzet:Baterie", qty: 6 }]);
    const [nvg] = await k.give(g2, [{ ref: "sprzet:Gogle noktowizyjne" }]);
    await wlacz(k, g2, nvg, "faceGear");
    await k.give(g3, [{ ref: "sprzet:Baterie", qty: 6 }]);
    const [th] = await k.give(g3, [{ ref: "sprzet:Gogle termowizyjne" }]);
    await wlacz(k, g3, th, "faceGear");
    await k.give(g3, [{ ref: "bron:Pochodnia Smołowa" }, { ref: "bron:Pistolet na Race", load: true }, { ref: "amunicja:{race}", qty: 4 }, { ref: "granaty:{grenade-molotov}", qty: 2 }]);
    try { await game.neuroshima.flara?.create?.({ actor: g3, quantity: 3 }); } catch (err) { k.miss(`flary: ${err.message}`); }
    for (const [u, a] of [["Gracz 1", g1], ["Gracz 2", g2], ["Gracz 3", g3]]) await k.seat(u, a);

    const pies = await k.fromPack("pies", "bestiariusz", "pies-mutek");
    const kot = await k.fromPack("neokot", "bestiariusz", "neokot");
    const spaw = await k.fromPack("spawacz", "bestiariusz", "spawacz");
    const mob = await k.fromPack("mobsprzet", "bestiariusz", "mobsprzet");
    await k.tokens(s, [
      [g1, 2, 16], [g2, 2, 18], [g3, 2, 20],
      [pies, 12, 8, { hidden: true }], [kot, 30, 9, { hidden: true }], [spaw, 34, 24, { hidden: true }], [mob, 12, 22, { hidden: true }]
    ]);
    return { swiatla: s.lights.size, ukryte: 4 };
  },
  proby: [
    p("latarka", "Światło", "Dwa stożki latarki idą za ruchomym żetonem, nie krok z tyłu", "Gracz 1: ruch WASD z włączoną ręczną i czołówką."),
    p("nvg", "Widzenie", "Ziarno noktowizora i paleta termowizora: czytelne i nie męczą, na dwóch zbliżeniach; pole 220°", "Gracz 2 i Gracz 3 w swoich oknach; zoom."),
    p("ukryci", "Widzenie", "Ciepłe vs zimne cele w termowizorze; ukryte żetony", "MG odkrywa żetony po kolei."),
    p("flara", "Światło", "Łuk flary i jej światło; migotanie i paliwo pochodni; światło Mołotowa", "Gracz 3: flara, pochodnia, Mołotow."),
    p("klatki", "Wydajność", "Czas klatki przy dziesięciu źródłach światła", "Liczniki → klatki wł.; wszyscy ze światłem, flary w powietrzu."),
    p("kobalt", "NOE / WKK", "Promienie latarki (LIGHT_KOBALT), światło Mołotowa, pochodnia, flara", "Wariant NOE / WKK.", "WKK")
  ]
};
