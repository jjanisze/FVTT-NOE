/**
 * Pościg (§5.6, P3): the `poscig` e2e fixture as a station (the campaign's `Pościg — test` is gone,
 * §8). The fixture builds the board; the station adopts what it made, so the kit's reset removes it.
 */

import { MOD, p } from "./_wspolne.mjs";

export default {
  id: "poscig", name: "Pościg", prio: "P3", icon: "fa-solid fa-truck-monster",
  opis: "Plansza pościgu z fixture e2e: 12 torów, sześć pojazdów na środkach torów i dwie kontrole (między torami, strefa swobodna). Pojazdy własnością wszystkich graczy.",
  gracze: 2,
  async build(k) {
    const fixture = await import(`${foundry.utils.getRoute("agent-e2e/fixtures/poscig.mjs")}?v=${Date.now()}`);
    const summary = await fixture.default({ moduleId: MOD });
    const mine = d => d.getFlag(MOD, "fixture") === "poscig";
    for (const scene of game.scenes.filter(mine)) {
      await scene.update({ name: "Pościg · Plansza", flags: k.flags({ key: "plansza" }) });
      k.scenes.plansza = scene;
      k.main = scene;
    }
    for (const a of game.actors.filter(mine)) await k.adopt(`pojazd-${a.id}`, a);
    return summary ?? { scena: k.main?.name };
  },
  proby: [
    p("plansza", "Pościg", "Plansza: przewijana pustynia, tory, pojazdy na środkach torów, kołysanie", "Start pościgu narzędziem MG w kontrolkach sceny."),
    p("ruch", "Pościg", "Ruch pojazdów i przyciąganie do torów; kontrole (między torami, strefa swobodna)", "Przeciągaj pojazdy; z miejsca gracza."),
    p("wydajnosc", "Wydajność", "Czas klatki z ruchomym tłem", "Liczniki → klatki.")
  ]
};
