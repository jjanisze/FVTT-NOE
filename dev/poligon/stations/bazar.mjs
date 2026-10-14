/**
 * Bazar (M5, PLAN_m5_postoj.md §8 layer 7): trade and the stop-over — the GM price list, the trade
 * table with GM-only numbers, merchants, the day ledger (players propose, the GM commits), Fuksy v2
 * and Fanty. The party stands in a town (Miasteczko, Vegas); a weapon shop and a general store are
 * created through the module's own merchant funnel.
 */

import { p } from "./_wspolne.mjs";

export default {
  id: "bazar", name: "Bazar", prio: "P1", icon: "fa-solid fa-scale-balanced",
  opis: "Miasteczko „Bazar” (Vegas). Drużyna: Gwiazda, Mafiozo, Kurier (Gracz 1–3) z gotówką i rzeczami na wymianę; dwa punkty handlowe (broń + amunicja, różności); Fant do podziału; chroniczna choroba do dawki o Zachodzie.",
  gracze: 3,
  async build(k) {
    const s = await k.scene("bazar", { name: "Bazar · Rynek", w: 30, h: 20, color: "#7a6a4a", main: true });
    const ids = [["gwiazda", "gwiazda-5"], ["mafiozo", "mafiozo"], ["kurier", "kurier-5"]];
    const party = [];
    for (const [i, [key, id]] of ids.entries()) {
      const a = await k.persona(key, id, { owner: `Gracz ${i + 1}` });
      if (a) await a.update({ "system.currency.gp": 300 + i * 100 });
      party.push(a);
      await k.seat(`Gracz ${i + 1}`, a);
    }
    await k.give(party[0], [{ ref: "granaty:{grenade-frag}", qty: 2 }, { ref: "sprzet:Zegarek" }, { ref: "sprzet:Przedwojenna whisky" }]);
    const g = await k.party(party);
    const N = game.neuroshima;
    const miejsce = { nazwa: "Bazar", rodzaj: "miasteczko", region: "vegas" };
    try { await N.postoj.miejsce.set(g, miejsce); } catch (err) { k.miss(`miejsce postoju: ${err.message}`); }
    for (const [key, o] of [["sklep-bron", { nazwa: "Rusznikarz Poligonu", kategorie: ["bron", "amunicja"], ziarno: "poligon-bron" }], ["sklep-rozne", { nazwa: "Szczęki Poligonu", kategorie: ["rozne", "zywnosc", "leki"], ziarno: "poligon-rozne" }]]) {
      try {
        const sklep = await N.handel.punkty.nowy({ ...o, miejsce, generuj: true });
        await k.adopt(key, sklep);
      } catch (err) {
        k.miss(`punkt handlowy ${o.nazwa}: ${err.message}`);
      }
    }
    try { await N.fanty.daj(party[1], "gra-planszowa"); } catch (err) { k.miss(`Fant: ${err.message}`); }
    try { await N.health.addDisease(party[2], "osteoporoza"); } catch (err) { k.miss(`choroba: ${err.message}`); }
    await k.tokens(s, [...party.map((a, i) => [a, 5 + i * 2, 12]), [k.actors["sklep-bron"], 8, 4], [k.actors["sklep-rozne"], 16, 4]]);
    return { sklepy: ["sklep-bron", "sklep-rozne"].filter(x => k.actors[x]).length };
  },
  proby: [
    p("cennik", "Handel", "Cennik MG i ceny regionalne", "Narzędzia MG → cennik."),
    p("stol", "Handel", "Stół wymiany: gracz nie widzi cen kupca (D21), widzi swoją sumę; MG widzi wycenę, skup 50% pod Kobaltem", "Gracz 1 → Handel → Rusznikarz; MG ten sam stół.", "WKK"),
    p("zamowienie", "Handel", "Zamówienie specjalne: karta jawna i szept MG; drugi raz dziś odmowa; godziny gamblingu", "Gracz 2 → zamówienie."),
    p("doba", "Postój", "Doba: gracze proponują, MG zatwierdza — utrzymanie, sen, zajęcia, podsumowania", "Postój → [Otwórz dobę]."),
    p("fuksy", "Fuksy i Fanty", "Fuksy v2 ze źródłami i terminami; Fant dzielony", "Gracz 2 → Fant → Gracz 1."),
    p("przeskok", "Postój", "Przeskok czasu (np. 30 dni) z pracą i treningiem", "Postój → Przeskok.")
  ]
};
