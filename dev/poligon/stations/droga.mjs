/**
 * Droga (§5.5, P2): the party sheet, travel, supplies, rest activities, the clock — Drużyna Poligonu
 * with a vehicle, food and water of every quality, a day of travel through biomes. Judge: the party
 * sheet's density and clicks per travel day.
 */

import { p } from "./_wspolne.mjs";

export default {
  id: "droga", name: "Droga", prio: "P2", icon: "fa-solid fa-road",
  opis: "Drużyna Poligonu (Kowboj, Łowca, Medyk, Gwiazda — Gracz 1–4) z pojazdem, prowiantem i wodą (pitna, filtrowana, brudna). Dzień podróży przez biomy, polowanie, gotowanie, zajęcia odpoczynku, Zachód słońca.",
  gracze: 4,
  async build(k) {
    const s = await k.scene("droga", { name: "Droga · Obozowisko", w: 30, h: 20, color: "#6b5a3a", main: true });
    const { buildProwiantItemData } = await import("../../modules/neuroshima-2026-overrides/scripts/config/prowiant-data.mjs");
    const ids = [["kowboj", "kowboj-5"], ["lowca", "lowca-mutantow-5"], ["medyk", "medyk-5"], ["gwiazda", "gwiazda-5"]];
    const party = [];
    for (const [i, [key, id]] of ids.entries()) {
      const a = await k.persona(key, id, { owner: `Gracz ${i + 1}` });
      party.push(a);
      await k.seat(`Gracz ${i + 1}`, a);
    }
    const food = [["konserwa", 3], ["prowiant", 4], ["mieso_suszone", 2], ["woda_pitna", 6], ["woda_filtrowana", 3], ["woda_brudna", 4]];
    for (const a of party.filter(Boolean)) {
      await a.createEmbeddedDocuments("Item", food.map(([id, q]) => { try { return buildProwiantItemData(id, q); } catch { return null; } }).filter(Boolean));
    }
    await k.give(party[1], [{ ref: "narzedzia:{klusownika}" }, { ref: "narzedzia:{kucharza}" }]);
    const auto = await k.actor("pojazd", { name: "Pickup Poligonu", type: "vehicle", img: "icons/commodities/tech/wheel.webp" }, { owner: ["Gracz 1", "Gracz 2", "Gracz 3", "Gracz 4"] });
    const g = await k.party([...party, auto]);
    await k.tokens(s, [...party.map((a, i) => [a, 6 + i * 2, 9]), [auto, 14, 13]]);
    return { druzyna: g?.name ?? null, czlonkowie: party.filter(Boolean).length + 1 };
  },
  proby: [
    p("karta", "Drużyna", "Karta drużyny: gęstość, czytelność, kliknięcia na dzień podróży", "Drużyna Poligonu → karta; jeden dzień od początku do końca."),
    p("podroz", "Podróż", "Biomy, paliwo, podsumowanie podróży", "Karta drużyny → podróż; wybór biomów."),
    p("zapasy", "Zapasy", "Dzienne zapotrzebowanie, polowanie, gotowanie, jakość wody", "Karta drużyny → zapasy."),
    p("zajecia", "Odpoczynek", "Zajęcia odpoczynku i Zachód słońca", "DO z zajęciami; Czas → Zachód słońca."),
    p("kobalt", "NOE / WKK", "Sen i jakość wody (Kobalt: sen, woda)", "Wariant NOE / WKK.", "WKK")
  ]
};
