/**
 * Sala prób (PLAN_m7 E8, P2): zdolności M7 w jednej sali — karty MG, przyciski po rzucie i pod trafieniem, śmierć i
 * reanimacja. Pięć miejsc z personami pokrycia M7 (`roster.mjs`, grupa „pokrycie M7”), mutant poza zasięgiem węchu,
 * manekin i pacjent do reanimacji. Gotowa walka (nierozpoczęta) — MG zaczyna, kiedy chce.
 */

import { p, manekin } from "./_wspolne.mjs";

export default {
  id: "sala-prob", name: "Sala prób", prio: "P2", icon: "fa-solid fa-person-chalkboard",
  opis: "Zdolności M7: Gladiator (Nie do zdarcia, Łyżeczka; Gracz 1), Medyk (Krwawy anioł, Łapiduch, Zawzięty sukinkot; Gracz 2), "
    + "Łowca mutantów (Bez tajemnic, Mój wróg: Mutanty, Sokole oko, Kłusownik, Sztuczka Przycelowanie, Coś mi tu śmierdzi; Gracz 3), "
    + "Kowboj (Zryw, Clint, Sztuczka Szybki Bill; Gracz 4), Ganger (Odważny czy głupi, Wierzę, Sztuczka Wrestler; Gracz 5). "
    + "Nocny ghul 15 m dalej, manekin, pacjent na łóżku.",
  gracze: 5,
  klucz: ["gladiator"],
  async build(k) {
    const s = await k.scene("sala", { name: "Sala prób · Zdolności", w: 30, h: 20, color: "#3d3b33", main: true });
    const gladiator = await k.persona("gladiator", "m7-nie-do-zdarcia", { owner: "Gracz 1", name: "Gladiator (Nie do zdarcia)" });
    if (gladiator) await k.give(gladiator, ["zdolnosci-klasowe:Łyżeczka"]);
    const medyk = await k.persona("medyk", "m7-krwawy-aniol", { owner: "Gracz 2", name: "Medyk (Krwawy anioł)", loadout: false });
    if (medyk) await k.give(medyk, [{ ref: "narzedzia:{medyka}" }, "zdolnosci-klasowe:Łapiduch"]);
    const lowca = await k.persona("lowca", "m7-bez-tajemnic", { owner: "Gracz 3", name: "Łowca (Bez tajemnic)" });
    if (lowca) await k.give(lowca, ["zdolnosci-pochodzenia:Coś mi tu śmierdzi"]);
    const kowboj = await k.persona("kowboj", "m7-clint", { owner: "Gracz 4", name: "Kowboj (Zryw)" });
    const ganger = await k.persona("ganger", "m7-odwazny-czy-glupi", { owner: "Gracz 5", name: "Ganger (Wierzę)" });
    const ghul = await k.fromPack("ghul", "bestiariusz", "generacja-i-nocny-ghul");
    const cel = await manekin(k, "manekin", { name: "Manekin (TT 10)" });
    const pacjent = await k.persona("pacjent", "cwaniak-1", { name: "Pacjent (do reanimacji)", loadout: false });

    // Kratka 1,5 m: Łowca w kolumnie 3, ghul w 13 — 15 m, poza 9 m węchu; MG przesuwa go bliżej.
    const gracze = [gladiator, medyk, lowca, kowboj, ganger];
    await k.tokens(s, [
      ...gracze.map((a, i) => [a, 3, 3 + i * 3]),
      [cel, 8, 9], [ghul, 13, 9, { disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE }], [pacjent, 8, 15]
    ]);
    for (const [i, a] of gracze.entries()) await k.seat(`Gracz ${i + 1}`, a);
    await k.party(gracze);
    await k.combat(s, [...gracze, ghul, cel]);
    return { gracze: gracze.filter(Boolean).map(a => a.name), ghul: ghul?.name ?? null, pacjent: pacjent?.name ?? null };
  },
  proby: [
    p("smrod", "Karty MG", "Coś mi tu śmierdzi: ghul wchodzi w 9 m — Gracz 3 dostaje szept bez nazwy, MG z nazwą; Percepcja ST 15 wskazuje i pinguje", "Przesuń ghula o 4 pola w lewo."),
    p("bez-tajemnic", "Karty MG", "Bez tajemnic: Test Przyrody wobec ghula, karta MG z progami 10 / 15 / 20 i „Powiedz graczowi”", "Gracz 3: cel na ghula → aktywność Bez tajemnic (Shift — bez okna)."),
    p("klusownik", "Karty MG", "Kłusownik: aktywność „Pułapka”, wybór testu, ST pułapki 8 + MDR + PB", "Gracz 3 → Kłusownik."),
    p("wierze", "Karty MG", "Wierzę: wpisany przedmiot, karta MG, „Do ekwipunku” dodaje go Gangerowi; okno zamknięte bez nazwy oddaje użycie", "Gracz 5 → Wierzę."),
    p("zryw", "Akcje", "Zryw tylko w swojej turze; Akcja Bonusowa podnosi limit znacznika — druga [B] bez sygnału", "Zacznij walkę, tura Kowboja: Zryw → Akcja Bonusowa, potem dwie [B]."),
    p("nie-do-zdarcia", "Śmierć i krytyki", "Nie do zdarcia: krytyk (naturalna 20) w Gladiatora jest zwykłym trafieniem — linia na karcie, obrażenia bez krytyka, bez Stopnia z krytyka", "Ghul atakuje Gladiatora; Fuks albo makro z naturalną 20."),
    p("sukinkot", "Śmierć i krytyki", "Zawzięty sukinkot: Medyk przy 0 PW — przycisk „wstanę” u gracza, na początku tury 1 PW i czysty tor", "Medyk → 0 PW; Gracz 2 klika; przewiń do tury Medyka."),
    p("lapiduch", "Śmierć i krytyki", "Łapiduch: śmierć Pacjenta (trzy porażki, MG potwierdza) → karta reanimacji, ST rośnie z zegarem (+1 min, +2 min…)", "Pacjent → 0 PW, trzy porażki z karty, [Potwierdź]; Gracz 2 → Reanimacja.", "RAI"),
    p("krwawy-aniol", "Leczenie", "Krwawy anioł: kość PW narzędzi małego medyka k6 (Spec 3) — opis na karcie leczenia", "Gracz 2 leczy Gladiatora narzędziami."),
    p("przycelowanie", "Atak", "Sztuczka Przycelowanie i Sokole oko u Łowcy: „Celuję w…”, +3 do ataku dystansowego, skutek pod trafieniem", "Gracz 3 strzela do manekina i do ghula."),
    p("lyzeczka", "Atak", "Łyżeczka: przedmiot z ręki techniką łyżeczki (tabela wagi, biegłość), naturalna 1 — karta pęknięcia", "Gracz 1: Weź do ręki dowolny przedmiot → Atak łyżeczką."),
    p("plakietki", "Dane", "Plakietki na zdolnościach person: pełne / częściowe / bez i „Nie automatyzujemy” — czy mówią prawdę?", "Otwórz kilka zdolności i Sztuczek na kartach.")
  ]
};
