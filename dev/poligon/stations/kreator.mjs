/**
 * Kreator (§5.5, P2): creation and level-up from the players' seats — empty characters per player,
 * level 1 → 3 (profession) → 5, multiclass, a Sztuczka, a Pochodzenie ability, the companion wizard,
 * with docs/Pierwsze-kroki.md open beside it. The kind of hole M6 "Biegłości profesji" was gets seen here.
 */

import { p } from "./_wspolne.mjs";

export default {
  id: "kreator", name: "Kreator", prio: "P2", icon: "fa-solid fa-user-plus",
  opis: "Puste postacie Gracza 1–3 (bez klasy, bez niczego) do zrobienia od zera z kompendiów; Sędzia (MG) z Partnerem do kreatora towarzysza; Mafiozo (Gracz 4) z Moją prawą ręką.",
  gracze: 4,
  async build(k) {
    const s = await k.scene("kreator", { name: "Kreator", w: 24, h: 14, color: "#3c4a46", main: true });
    const empty = [];
    for (let i = 1; i <= 3; i++) {
      const a = await k.actor(`nowa-${i}`, { name: `Nowa postać ${i}`, type: "character" }, { owner: `Gracz ${i}` });
      empty.push(a);
      await k.seat(`Gracz ${i}`, a);
    }
    const sedzia = await k.persona("sedzia", "sedzia");
    const maf = await k.persona("mafiozo", "mafiozo", { owner: "Gracz 4" });
    await k.seat("Gracz 4", maf);
    await k.tokens(s, [...empty.map((a, i) => [a, 3 + i * 3, 5]), [sedzia, 14, 5], [maf, 17, 5]]);
    return { puste: empty.length };
  },
  proby: [
    p("od-zera", "Tworzenie", "Postać od zera: klasa, Pochodzenie, Sztuczka z kompendiów na kartę — z Pierwszymi krokami obok", "Gracz 1: Kompendium → przeciągnij na kartę; docs/Pierwsze-kroki.md."),
    p("awans", "Awans", "Poziom 1 → 3 (profesja) → 5: wybory, zdolności, skale", "Gracz 2: przycisk awansu na karcie."),
    p("cichy-krok", "Awans", "Zwiadowca 3 dostaje jeden efekt Cichy krok bez błędów uprawnień przy podłączonych graczach", "MG awansuje Zwiadowcę, potem powtórz w oknie właściciela; sprawdź efekt i konsolę."),
    p("wieloklasowosc", "Awans", "Wieloklasowość: druga klasa, biegłości, PW", "Gracz 3: druga klasa po poziomie 3."),
    p("kobalt", "NOE / WKK", "Opcje tylko Kobaltu ukryte przy Kobalcie wył.", "Wariant NOE → ta sama ścieżka.", "WKK"),
    p("towarzysz", "Towarzysze", "Kreator towarzysza: Cechy → Pochodzenie → klasa w oknie gracza", "Pasek Mafiozo → [Nowy towarzysz] (MG); Gracz 4 przechodzi kreator.")
  ]
};
