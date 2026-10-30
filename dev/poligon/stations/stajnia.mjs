/**
 * Stajnia (PLAN_m4_pojazdy §6.3, W5): wierzchowce — dosiadanie, jeździec widoczny w siodle, kotwica tury (Inicjatywa
 * jeźdźca, tura konia pomijana), akcje wierzchowca w palecie, utrzymanie się w siodle, atak z grzbietu, Jeździec i Rodeo.
 * Sondy dla W-U1–W-U6, D39 i D43, do weta MG.
 */

import { MOD, p, manekin } from "./_wspolne.mjs";

export default {
  id: "stajnia", name: "Stajnia", prio: "P2", icon: "fa-solid fa-horse",
  opis: "Wybieg za warsztatem: trzy wyszkolone konie z Bestiariusza (zdrowy, skażony, teksańczyk) i dziki koń (niewyszkolony). "
    + "Gracz 1 — Kowboj z Tresurą, Rodeo i Zawsze w siodle, w siodle zdrowego konia; Gracz 2 — Medyk bez Tresury; Gracz 3 — Zwiadowca z Jeźdźcem. "
    + "Manekin do Odepchnięcia i do strzelania z grzbietu.",
  gracze: 3,
  async build(k) {
    const s = await k.scene("wybieg", { name: "Stajnia · Wybieg", w: 36, h: 24, color: "#5e5236", main: true });
    const P = game.neuroshima.pojazdy;
    const konie = {};
    for (const [key, id, name] of [["zdrowy", "kon-zdrowy", "Koń (zdrowy)"], ["skazony", "kon-skazony", "Koń (skażony)"],
      ["teksanczyk", "kon-teksanczyk", "Koń (teksańczyk)"], ["dziki", "kon-zdrowy", "Koń dziki (niewyszkolony)"]]) {
      const a = await k.fromPack(`kon-${key}`, "bestiariusz", id, { name, data: { prototypeToken: { actorLink: true, name } } });
      if (!a) continue;
      // Paczka starsza niż flaga z Bestiariusza (W2) — flaga na kopii; dziki koń: niewyszkolony (W-U4), do ujeżdżenia.
      if (key === "dziki") await a.setFlag(MOD, "wierzchowiec", { wyszkolony: false });
      else if (!a.getFlag(MOD, "wierzchowiec")) await a.setFlag(MOD, "wierzchowiec", { wyszkolony: true });
      konie[key] = a;
    }
    const kowboj = await k.persona("kowboj", "kowboj-zawsze-w-siodle", { owner: "Gracz 1", name: "Kowboj (Tresura, Rodeo)" });
    const medyczka = await k.persona("medyczka", "medyk-5", { owner: "Gracz 2", name: "Medyk (bez Tresury)" });
    const zwiadowca = await k.persona("zwiadowca", "zwiadowca-1", { owner: "Gracz 3", name: "Zwiadowca (Jeździec)" });
    if (kowboj) {
      await kowboj.update({ "system.skills.tre.value": 1 });
      await k.give(kowboj, [{ ref: "sztuczki:Rodeo" }]);
    }
    if (medyczka) await medyczka.update({ "system.skills.tre.value": 0 });
    if (zwiadowca) await k.give(zwiadowca, [{ ref: "zdolnosci-klasowe:{jezdziec}" }]);
    for (const [u, a] of [["Gracz 1", kowboj], ["Gracz 2", medyczka], ["Gracz 3", zwiadowca]]) if (a) await k.seat(u, a);
    const cel = await manekin(k, "manekin", { name: "Manekin (cel)" });
    const tokeny = await k.tokens(s, [
      [konie.zdrowy, 6, 6], [konie.skazony, 11, 6], [konie.teksanczyk, 16, 6], [konie.dziki, 24, 6],
      [kowboj, 6, 9], [medyczka, 11, 9], [zwiadowca, 16, 9], [cel, 26, 14]
    ]);
    const tok = a => tokeny.find(t => t.actorId === a?.id);
    try {
      if (tok(konie.zdrowy) && tok(kowboj)) await P.posadz(tok(konie.zdrowy), tok(kowboj), "siodlo-0-0");
    } catch (err) { k.miss(`siodło: ${err.message}`); }
    await k.labels(s, [
      [1, 0.5, "STAJNIA · wierzchowce (M4 §6.3)", { size: 32, w: 30 }],
      [1, 1.5, "HUD konia: Dosiądź, paleta jeźdźca, Szarpnięty (MG). HUD dzikiego konia z zaznaczonym Kowbojem: Ujeżdżaj (Rodeo).", { size: 18, w: 34 }]
    ]);
    return { konie: Object.values(konie).filter(Boolean).length, wSiodle: tok(kowboj) ? !!P.nosnikJadacego(tok(kowboj)) : false };
  },
  proby: [
    p("dosiadanie", "Dosiadanie (W2, D43)", "Koń 2 × 2 (rozmiar dnd5e, bez zamiany obrysu); dosiadanie za ½ Szybkości (Jeździec — 1,5 m); rozmiar, wyszkolenie i jedna wolna ręka oznaczone, nie blokowane",
      "Medyk dosiada skażonego konia z bronią w obu rękach — karta oznacza wodze; Zwiadowca (Jeździec) — bez oznaczenia, koszt 1,5 m."),
    p("jezdziec-widoczny", "Jeździec w siodle (S1, W-U1)", "Jeździec rysuje się tak duży jak obok konia, nad nim, bez kropki; pasażer za nim",
      "Kowboj w siodle zdrowego konia; dosiądź jako pasażer i porównaj z postacią obok. Przesuń i obróć konia."),
    p("kotwica", "Kotwica tury (D39, W-U6)", "Wyszkolony koń sortuje się tuż za jeźdźcem, z jego Inicjatywą; jego tura pomijana z kartą „jedzie z …”",
      "Walka z Kowbojem w siodle i manekinem; rzuć Inicjatywę, przejdź przez rundę."),
    p("niewyszkolony", "Niewyszkolony koń (W-U4)", "Jeździec jedzie, ale koń ma własną turę i rusza nim MG; gracz nie dostaje praw do konia",
      "Medyk dosiada dzikiego konia w walce; gracz próbuje go przesunąć."),
    p("paleta-konia", "Akcje wierzchowca (W3)", "Paleta jeźdźca: Bieganie (+2× Szybkości, Utrudnienia ataków), Przyspieszenie (+1×), Odstąpienie, Unikanie; budżet konia na karcie przy przekroczeniu",
      "W turze Kowboja: Bieganie z HUD-u konia i jazda; potem strzał w biegnącego konia z dystansu."),
    p("spadanie", "Utrzymanie się w siodle (W4)", "Powalenie konia albo jeźdźca, koń przy 0 PW albo Szarpnięty (MG) → karta RO ZRC ST 10; porażka — 1,5 m obok i Powalenie, obrażenia przyciskiem MG",
      "Powal konia (stan), potem HUD konia → Szarpnięty wbrew woli; zrób porażkę RO."),
    p("atak-z-grzbietu", "Atak z grzbietu (W4, s. 257)", "Z jadącego konia bez Tresury — Utrudnienie; z Tresurą bez; Jeździec i Ale jazda! znoszą dla strzelania",
      "Konie ruszają się w walce; Medyk, Kowboj i Zwiadowca strzelają do manekina z siodła."),
    p("jezdziec-tt", "Jeździec i Kawalerzysta (W5)", "TT konia + Premia Biegłości jeźdźca, póki siedzi w siodle; po zsiadaniu efekt znika",
      "Zwiadowca dosiada konia — porównaj TT na karcie konia przed i po; zsiądź."),
    p("rodeo", "Rodeo — Dżokej (W5)", "Ujeżdżanie z HUD-u istoty: Test MDR (Tresura) ST 10 + mod. SIŁ; sukces — koń słucha tylko tego jeźdźca (kotwica tury, paleta)",
      "Zaznacz Kowboja, otwórz HUD dzikiego konia → Ujeżdżaj (Rodeo); potem dosiądź go Kowbojem i Medykiem."),
    p("zawsze-w-siodle", "Zawsze w siodle (W5, s. 88)", "Po Długim odpoczynku Kowboja karta MG: los zsyła konia albo motocykl (fabularne — nic nie powstaje samo)",
      "Gracz 1: Długi odpoczynek na karcie Kowboja; MG patrzy na czat."),
    p("schowek-konia", "Koń między scenami (W-U5)", "Ctrl+X / Ctrl+V konia z jeźdźcem przenosi obsadę jak pojazd", "Wytnij zdrowego konia z Kowbojem i wklej na Garaż · Parking.")
  ]
};
