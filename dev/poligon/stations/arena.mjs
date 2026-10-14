/**
 * Arena (§5.5, P2): combat at table scale — Drużyna Poligonu (five, a dog, a drone, Prawa ręka) against
 * ten from the Bestiariusz (armed humans with reactions, a machine, a swarm, something big). The combat
 * is prepared, not started: the GM rolls initiative as at the table.
 */

import { p } from "./_wspolne.mjs";

export default {
  id: "arena", name: "Arena", prio: "P2", icon: "fa-solid fa-khanda",
  opis: "Średnia mapa z osłonami. Drużyna (Najemnik, Kaznodzieja, Medyk, Żołnierz, Szczur — Gracz 1–5) z psem, dronem i Prawą ręką kontra 10 z Bestiariusza (Gangusy, Cyngle, Kanibale, Spawacz, Rój szczurów, Gigamut). Walka przygotowana, nierozpoczęta.",
  gracze: 5,
  async build(k) {
    const s = await k.scene("arena", { name: "Arena", w: 44, h: 32, color: "#5b5039", main: true });
    await k.walls(s, [
      ...k.room(16, 10, 6, 4, { door: { side: "w", at: 1 }, windows: [{ side: "e", at: 2 }] }),
      [8, 6, 12, 6], [8, 24, 12, 24], [28, 4, 28, 9], [30, 20, 34, 20], [24, 26, 24, 30],
      [12, 15, 12, 18, "window"], [32, 12, 34, 12, "window"]
    ]);
    const ids = [["najemnik", "najemnik-5"], ["kaznodzieja", "kaznodzieja-nowej-ery-5"], ["medyk", "medyk-5"], ["zolnierz", "zolnierz-5"], ["szczur", "szczur-5"]];
    const party = [];
    for (const [i, [key, id]] of ids.entries()) {
      const a = await k.persona(key, id, { owner: `Gracz ${i + 1}` });
      party.push(a);
      await k.seat(`Gracz ${i + 1}`, a);
    }
    await k.party(party);
    const T = game.neuroshima.towarzysze;
    await k.adopt("pies", await T.utworz(party[3], { rodzaj: "psi-partner", nazwa: "Reks", zrodlo: "partner" }));
    await k.adopt("prawa-reka", await T.utworz(party[1], { rodzaj: "prawa-reka", nazwa: "Brat Tomasz", zrodlo: "moja-prawa-reka" }));
    const dron = await game.neuroshima.drony.utworzDrona(party[2], "dron-kroczacy", { tworca: party[2], nazwa: "Sanitariusz" });
    await k.adopt("dron", dron?.dron);

    const foes = [];
    for (const [i, id] of ["gangus-zolnierz", "gangus-zolnierz", "gangus-zolnierz", "cyngiel", "cyngiel", "kanibal", "kanibal", "spawacz", "roj-szczurow", "gigamut"].entries()) {
      foes.push(await k.fromPack(`wrog-${i}`, "bestiariusz", id));
    }
    await k.tokens(s, [
      ...party.map((a, i) => [a, 3, 8 + i * 3]), [k.actors.pies, 5, 17], [k.actors["prawa-reka"], 5, 11],
      ...foes.map((a, i) => [a, 34 + (i % 3) * 3, 4 + Math.floor(i / 3) * 7])
    ]);
    if (dron?.uchwyt) await game.neuroshima.drony.rozloz(dron.uchwyt, { pozycja: { x: 500, y: 1400 }, scena: s });
    await k.combat(s, [...party, ...foes]);
    return { druzyna: party.filter(Boolean).length, wrogowie: foes.filter(Boolean).length };
  },
  proby: [
    p("runda", "Skala", "Czas zegarowy i liczba kliknięć na rundę; tracker z grupami inicjatywy", "Stoper; Liczniki → Zeruj przed rundą."),
    p("czat", "Skala", "Czat po trzech rundach: da się czytać? co jest zbędne?", "Trzy rundy, potem przewiń czat."),
    p("reakcje", "BN", "Reakcje BN, upuszczona broń i przedmioty na ziemi, „BN pada”", "Walka do upadku kilku Gangusów."),
    p("klatki", "Wydajność", "Czas klatki przy 15 żetonach w walce", "Liczniki → klatki wł."),
    p("towarzysze", "Towarzysze", "Pies, dron i Prawa ręka w walce drużyny — tylko w skali stołu; szczegóły w Hangarze", "Komendy w turach właścicieli.")
  ]
};
