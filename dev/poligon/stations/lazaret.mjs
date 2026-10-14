/**
 * Lazaret (§5.4, P1): Stan tracks, status icons and HUD, umieranie cards, the DO window with
 * Rekonwalescencja, kalendarzyk, choroby, the Zagrożenia tool — and the outstanding E7 manual pass
 * (PLAN_m1_walka). Beds are persona copies preset through the module's own funnels.
 */

import { p } from "./_wspolne.mjs";

/** Run one funnel; a failure is a missing pick in the summary, not a broken reset. */
async function f(k, what, fn) {
  try {
    return await fn();
  } catch (err) {
    k.miss(`${what}: ${err.message}`);
    return null;
  }
}

export default {
  id: "lazaret", name: "Lazaret", prio: "P1", icon: "fa-solid fa-kit-medical",
  opis: "Łóżka: umierający (0 PW, porażki), stabilny, Zranienie Lekki→Krytyczny, Wyczerpanie z kilku źródeł, choroby (zwykła i przewlekła), fobia, Upojenie, Skażenie, Krwawienie, Podpalenie, wstrzymany oddech, Przemarznięcie. Medyk (Spec 5, Medyk) z narzędziami i Spec z Aspiryną i Miętusami (Gracz 1–2), Staza.",
  gracze: 2,
  klucz: ["umierajacy"],
  async build(k) {
    const s = await k.scene("sala", { name: "Lazaret · Sala", w: 34, h: 22, color: "#d8d4c8", main: true });
    const N = game.neuroshima;
    const { addExhaustion } = await import("../../modules/neuroshima-2026-overrides/scripts/config/exhaustion.mjs");
    const beds = [];
    const bed = async (key, persona, name, prep) => {
      const a = await k.persona(key, persona, { name, loadout: false });
      if (a) beds.push(a);
      return a;
    };

    const medyk = await k.persona("medyk", "medyk-5", { owner: "Gracz 1", loadout: false });
    await k.give(medyk, [{ ref: "narzedzia:{medyka}" }, { ref: "lekarstwa:Medpak", qty: 4 }, { ref: "lekarstwa:Painkiller (10 tabletek)" }, { ref: "lekarstwa:Antybiotyk (10 dawek)" }]);
    const aim = await k.persona("aspiryna", "spec-1", { owner: "Gracz 2", name: "Spec (Aspiryna i Miętusy)", loadout: false });
    await k.give(aim, [{ ref: "narzedzia:{medyka}" }]);
    await f(k, "Staza", () => N.staza.create({ actor: medyk, quantity: 2 }));
    await k.seat("Gracz 1", medyk);
    await k.seat("Gracz 2", aim);

    // Beds — tokens first (dying and conditions show on the token), states after.
    const umierajacy = await bed("umierajacy", "brutal-1", "Umierający (0 PW, 1 porażka)");
    const stabilny = await bed("stabilny", "cwaniak-1", "Stabilny (0 PW)");
    const zranieni = [];
    for (const [lvl, n] of [[1, "Lekki"], [2, "Średni"], [3, "Poważny"], [4, "Krytyczny"]]) zranieni.push(await bed(`zranienie-${lvl}`, "twardziel-1", `Zranienie: ${n}`));
    const wyczerpany = await bed("wyczerpany", "zwiadowca-1", "Wyczerpany (bezsenność, niedożywienie, odwodnienie)");
    const chory = await bed("chory", "zlodziej-1", "Chory (szczurza gorączka, osteoporoza, fobia)");
    const pijany = await bed("pijany", "brutal-1", "Upojenie i Skażenie");
    const krwawi = await bed("krwawi", "cwaniak-1", "Krwawi i płonie");
    const dusi = await bed("dusi", "spec-1", "Wstrzymany oddech, Przemarznięcie");

    await k.tokens(s, [[medyk, 2, 3], [aim, 2, 5], ...beds.map((a, i) => [a, 6 + (i % 6) * 4, 3 + Math.floor(i / 6) * 6])]);
    await k.stripes(s, beds.map((a, i) => [5.6 + (i % 6) * 4, 2.6 + Math.floor(i / 6) * 6, 1.8, 2.2, "#ffffff", 0.5]));

    const U = N.umieranie;
    await f(k, "umierający", async () => { await umierajacy.update({ "system.attributes.hp.value": 0 }); await U.dodajPorazki?.(umierajacy, 1); });
    await f(k, "stabilny", async () => { await stabilny.update({ "system.attributes.hp.value": 0 }); await U.stabilizuj?.(stabilny); });
    for (const [i, a] of zranieni.entries()) await f(k, `Zranienie ${i + 1}`, () => N.conditions.set(a, "zranienie", i + 1));
    for (const src of ["bezsennosc", "niedozywienie", "odwodnienie"]) await f(k, `Wyczerpanie ${src}`, () => addExhaustion(wyczerpany, src, { chat: false }));
    await f(k, "choroba", () => N.health.addDisease(chory, "szczurzaGoraczka"));
    await f(k, "choroba przewlekła", () => N.health.addDisease(chory, "osteoporoza"));
    await f(k, "fobia", () => N.health.addPhobia(chory, null, { name: "Strach przed ciemnością" }));
    await f(k, "Upojenie", () => N.conditions.set(pijany, "upojenie", 2));
    await f(k, "Skażenie", () => N.conditions.set(pijany, "skazenie", 2));
    await f(k, "Krwawienie", () => N.health.bleeding.startBleeding(krwawi));
    await f(k, "Podpalenie", () => N.podpalenie.ignite(krwawi));
    await f(k, "Uduszenie", () => N.zagrozenia.wstrzymajOddech(dusi));
    await f(k, "Przemarznięcie", () => addExhaustion(dusi, "przemarznie", { chat: false }));
    await k.party([medyk, aim, ...beds]);
    return { lozka: beds.length, stany: beds.map(a => `${a.name}: ${[...a.statuses].join(",") || "—"}`) };
  },
  narzedzia: [
    { label: "Zagrożenia (narzędzie MG)", icon: "fa-solid fa-temperature-low", run: () => game.neuroshima.zagrozenia.okno() }
  ],
  proby: [
    p("stan-2s", "Stan", "Panel Stan: czy MG odczyta stan pacjenta w dwie sekundy?", "Karty łóżek po kolei."),
    p("ikony", "Stan", "Ikony stanów na żetonach przy 50% i 100% zbliżenia; poziomowane ikony w HUD", "Zoom; prawy klik na żeton."),
    p("umieranie", "Umieranie", "Umieranie z miejsca gracza (karty rzutów przeciw śmierci) i potwierdzenie MG „Śmierć”", "Przypisz Umierającego Graczowi 2 (Widok gracza → przypisz zaznaczony)."),
    p("do-wariant", "Rekonwalescencja", "Okno DO z Rekonwalescencją — NOE, RAI i WKK obok siebie (Wyczerpanie z Krytycznego); kalendarzyk", "Zranienie: Krytyczny; Wariant NOE → DO; WKK → DO.", "RAI"),
    p("e7", "Zagrożenia", "Zaległy ręczny przebieg E7 narzędzia Zagrożenia (PLAN_m1_walka) — tutaj, nie w kampanii", "Narzędzie MG → Przemarznięcie, doba bez snu, Uduszenie na łóżkach."),
    p("czas", "Czas", "Czas: DO, Zachód słońca, stabilizacja 1k8 h — czy informacja zwrotna mówi, co się stało?", "Czas → +8 h, Zachód słońca, DO."),
    p("medyk", "Leczenie", "Medyk z narzędziami i Aspiryna i Miętusy — przyciski, karty, ładunki", "Gracz 1 i Gracz 2 leczą łóżka."),
    p("staza", "Leczenie", "Staza na umierającym z miejsca gracza", "Gracz 1 → Staza → Umierający.")
  ]
};
