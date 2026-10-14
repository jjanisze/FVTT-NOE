/**
 * Kuźnia (§5.5, P2): production and repair, never played at the table. Spec personas with schematics,
 * surowce and tools; jammed, damaged and degraded weapons — every state set through the module's own
 * jam/degradation funnels; a Robota under way; the Haker for drone production → rozłóż.
 */

import { p } from "./_wspolne.mjs";
import { packDocs } from "../lib/packs.mjs";

export default {
  id: "kuznia", name: "Kuźnia", prio: "P2", icon: "fa-solid fa-hammer",
  opis: "Warsztat (Spec 5 Monter, Gracz 1), Chemik (Gracz 2), Haker (Gracz 3) i Miejsce „Warsztat Poligonu” (kontener produkcji: zapasowe narzędzia i surowce masowe). Schematy, broń zacięta, uszkodzona i stępiona; Robota w toku. Produkcja drona → rozłóż.",
  gracze: 3,
  klucz: ["warsztat"],
  async build(k) {
    const s = await k.scene("warsztat", { name: "Kuźnia · Warsztat", w: 26, h: 18, color: "#4a3f36", main: true });
    await k.walls(s, k.room(2, 2, 22, 14, { door: { side: "s", at: 10 } }));
    await k.lights(s, [{ x: 8, y: 6, bright: 3, dim: 8, color: "#ffcf8a" }, { x: 18, y: 10, bright: 2, dim: 6, color: "#ff9a4a", animation: { type: "flame", speed: 2, intensity: 3 } }]);
    const w = await k.persona("warsztat", "warsztat", { owner: "Gracz 1" });
    const ch = await k.persona("chemik", "chemik-5", { owner: "Gracz 2", loadout: [{ ref: "bron:G17", place: "ranged", load: true }, { ref: "narzedzia:{chemika}" }] });
    const hk = await k.persona("haker", "haker", { owner: "Gracz 3" });
    for (const [u, a] of [["Gracz 1", w], ["Gracz 2", ch], ["Gracz 3", hk]]) await k.seat(u, a);
    // The workshop is a production Miejsce (a container nobody carries): spare kits and bulk materials live
    // there — on the smiths they immobilised them (MK and MO weigh 1 kg per gambel).
    const party = await k.party([w, ch, hk]);
    const P = game.neuroshima.produkcja;
    let miejsce = null;
    try {
      miejsce = await k.adopt("miejsce", await P.noweMiejsce({ nazwa: "Warsztat Poligonu", druzyna: party }));
    } catch (err) {
      k.miss(`Miejsce warsztatu: ${err.message}`);
    }
    if (miejsce) {
      await k.surowce(miejsce, { CH: 60, CE: 60, CZ: 60, MK: 200, MO: 100 });
      await k.give(miejsce, [{ ref: "narzedzia:{kowala}" }, { ref: "narzedzia:{elektronika}" }, { ref: "narzedzia:{stolarza}" }]);
    }
    for (const a of [w, ch, hk]) await k.surowce(a, { CH: 10, CE: 10, CZ: 10, MK: 5, MO: 3 });
    await k.give(ch, [{ ref: "lekarstwa:Proch strzelniczy (100 g)", qty: 5 }]);
    // Schematics: a handful from the pack (the Produkcja tab reads them from the inventory).
    const sch = (await packDocs("schematy")).slice(0, 8).map(d => game.items.fromCompendium(d));
    if (sch.length && w) await w.createEmbeddedDocuments("Item", sch);

    const jams = await import("../../modules/neuroshima-2026-overrides/scripts/weapons/jams.mjs");
    const deg = await import("../../modules/neuroshima-2026-overrides/scripts/weapons/melee-degradation.mjs");
    const [ak, g3, bat, maczeta] = await k.give(w, [{ ref: "bron:AK (Kałach)", load: true }, { ref: "bron:HK G3", load: true }, { ref: "bron:Bat" }, { ref: "bron:Maczeta" }]);
    try {
      if (ak) await jams.setJammed(ak, { reason: "Poligon: zacięta", chat: false });
      if (g3) await jams.setDamaged(g3, { reason: "Poligon: uszkodzona", chat: false });
      if (bat) await deg.degradeWeapon(bat, { chat: false });
      if (maczeta) { await deg.degradeWeapon(maczeta, { chat: false }); await deg.degradeWeapon(maczeta, { chat: false }); }
    } catch (err) {
      k.miss(`stany broni: ${err.message}`);
    }
    await k.give(w, [{ ref: "pancerze:Hełm" }, { ref: "pancerze:Kurtka ćwiekowana" }]);

    try {
      const dostep = P.przepisy(w).filter(x => x.zrodla.length);
      const pick = dostep.find(x => /amunic|nab/i.test(x.przepis.nazwa ?? x.przepis.id)) ?? dostep[0];
      const robota = pick ? await P.start(w, pick.przepis, { mimoBrakow: true }) : null;
      k.note(robota ? `Robota: ${robota.name}` : "BRAK Roboty startowej");
    } catch (err) {
      k.miss(`Robota: ${err.message}`);
    }
    await k.tokens(s, [[w, 6, 8], [ch, 9, 8], [hk, 12, 8], [miejsce, 18, 6]]);
    return { przepisy: P.przepisy(w).length, schematy: sch.length };
  },
  proby: [
    p("zakladka", "Produkcja", "Zakładka Produkcja: czytelność listy przepisów, braki, dostęp", "Karta Warsztatu → Produkcja."),
    p("robota", "Produkcja", "Robota w czasie (Czas → +1 h), Szybka produkcja, Test na końcu", "Czas: kilka skoków; Gracz 1 kończy."),
    p("naprawa", "Naprawa", "Ścieżki naprawy: zacięcie, uszkodzenie, stępienie; dźwięki oprawy", "Karta Warsztatu: AK, HK G3, Bat, Maczeta."),
    p("pancerz", "Naprawa", "Uszkodzony pancerz i [WKK] Dziurawy hełm", "Uszkodź Hełm w walce (Strzelnica) albo ręcznie; napraw tutaj.", "WKK"),
    p("dron", "Produkcja", "Produkcja drona → uchwyt → rozłóż", "Haker: przepis drona z Hakerstwa."),
    p("gracz", "Produkcja", "Produkcja z miejsca gracza — co gracz widzi, co robi MG", "Okno Gracza 1.")
  ]
};
