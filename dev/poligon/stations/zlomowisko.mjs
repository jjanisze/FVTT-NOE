/**
 * Złomowisko (M5, PLAN_m5_postoj.md §8 layer 7): scavenging, butchering and dismantling,
 * autodestruction — ruins with corpses (a beast and a human), a machine with a self-destruct chance,
 * the party at "Magazyn przy torach" for Szabrowanie, a butcher's kit, a metal detector, a jammed Bat
 * for Rozbierz na surowce.
 */

import { p, zabij } from "./_wspolne.mjs";

export default {
  id: "zlomowisko", name: "Złomowisko", prio: "P1", icon: "fa-solid fa-recycle",
  opis: "Ruiny przy torach: trup Psa mutka i Cywila (bebeszenie), Gladiator (autodestrukcja 80%) do zbicia, drużyna w miejscu „Magazyn przy torach” (szabrowanie). Szczur (Gracz 1, Sztuczka Złomiarz) z narzędziami rzeźnika, wykrywaczem metalu i zaciętym Batem; Łowca (Gracz 2).",
  gracze: 2,
  async build(k) {
    const s = await k.scene("zlom", { name: "Złomowisko · Tory", w: 36, h: 24, color: "#57524a", main: true });
    await k.walls(s, [...k.room(20, 3, 12, 8, { door: { side: "w", at: 3 } }), [4, 18, 30, 18, "window"]]);
    await k.labels(s, [[20, 1.6, "Magazyn przy torach (szabrowanie)", { size: 22 }]]);
    const g1 = await k.persona("szczur", "szczur-5", { owner: "Gracz 1" });
    const g2 = await k.persona("lowca", "lowca-mutantow-5", { owner: "Gracz 2" });
    await k.seat("Gracz 1", g1);
    await k.seat("Gracz 2", g2);
    await k.give(g1, [{ ref: "narzedzia:{rzeznika}" }, { ref: "sprzet:Wykrywacz metalu" }]);
    const [bat] = await k.give(g1, [{ ref: "bron:Bat" }]);
    if (bat) {
      const jams = await import("../../modules/neuroshima-2026-overrides/scripts/weapons/jams.mjs");
      try { await jams.setJammed(bat, { chat: false }); } catch { await bat.setFlag("neuroshima-2026-overrides", "jam", { jammed: true }); }
    }
    const g = await k.party([g1, g2]);
    try { await game.neuroshima.postoj.miejsce.set(g, { nazwa: "Magazyn przy torach", rodzaj: "miasteczko", region: "vegas" }); } catch (err) { k.miss(`miejsce: ${err.message}`); }
    const pies = await k.fromPack("pies", "bestiariusz", "pies-mutek");
    const cywil = await k.fromPack("cywil", "bestiariusz", "cywil");
    const gladiator = await k.fromPack("gladiator", "bestiariusz", "gladiator");
    await k.tokens(s, [[g1, 4, 8], [g2, 4, 10], [pies, 9, 7], [cywil, 9, 11], [gladiator, 14, 14]]);
    await zabij(s, pies);
    await zabij(s, cywil);
    return { trupy: 2, autodestrukcja: game.neuroshima.postoj.autodestrukcja?.dane?.(s.tokens.find(t => t.actorId === gladiator?.id)?.actor) ?? null };
  },
  proby: [
    p("szabrowanie", "Szabrowanie", "Szabrowanie: okno MG, komplikacja tylko dla MG, karta prośby dla poszukiwaczy, czas; Złomiarz Szczura — Ułatwienie do Percepcji i Śledztwa, Łowca bez", "Postój → [Szabrowanie] → Niewielki magazyn."),
    p("bebeszenie", "Bebeszenie", "Bebeszenie celu (zwierzę) z menu narzędzi rzeźnika; człowiek przez HUD — komunikat publiczny przed rzutem", "Gracz 1 celuje w Psa; MG → HUD Cywila."),
    p("rozbiorka", "Rozbiórka", "Rozbierz na surowce: propozycja do MG → [Zatwierdź…] → surowce", "Gracz 1: Bat → Rozbierz."),
    p("autodestrukcja", "Autodestrukcja", "Gladiator do 0 PW → „BN pada”, szept MG [Rzuć k100], wybuch w następnej rundzie, wrak", "Walka z Gladiatorem; Kości ustaw na MG.")
  ]
};
