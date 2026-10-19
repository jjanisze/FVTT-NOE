/**
 * Pościg (§5.6, P3; PLAN_m4_pojazdy §6.2, P6): plansza pościgu na złożonej drodze.
 *
 *  - **Plansza** — fixture e2e `poscig` (12 torów, sześć pojazdów na środkach torów, dwie kontrole): grafika,
 *    kołysanie, wydajność.
 *  - **Złożona droga** — pojazdy z katalogu w prawdziwej skali: Osobówka graczy (Gracz 1 za kierownicą, Gracz 2
 *    strzelcem z Minimi i granatami), Hammer bandytów i Autobus bandytów (dłuższy niż tor) z jadącymi. Sondy
 *    D21–D31 (część 1b i 2).
 *  - **Parking** (mapa 1,5 m) — Buggy z kierowcą do Ctrl+X / Ctrl+V na planszę i na mapę regionu (E11).
 *  - **Mapa regionu** (1 km na kratkę) — pojazd jako znacznik (D21).
 */

import { MOD, p, manekin } from "./_wspolne.mjs";

export default {
  id: "poscig", name: "Pościg", prio: "P3", icon: "fa-solid fa-truck-monster",
  opis: "Plansza z fixture e2e (12 torów, sześć pojazdów, kontrole: żeton między torami bez roli, strefa swobodna) i druga plansza "
    + "na złożonej drodze: Osobówka graczy (Gracz 1 za kierownicą, Gracz 2 z Minimi i granatami), Hammer i Autobus bandytów "
    + "z jadącymi. Parking z Buggy (Ctrl+X / Ctrl+V) i Mapa regionu w km.",
  gracze: 2,
  async build(k) {
    const P = game.neuroshima.pojazdy, C = game.neuroshima.poscig;

    // 1. Plansza z fixture e2e — grafika, kołysanie, wydajność.
    const fixture = await import(`${foundry.utils.getRoute("agent-e2e/fixtures/poscig.mjs")}?v=${Date.now()}`);
    const summary = await fixture.default({ moduleId: MOD });
    const mine = d => d.getFlag(MOD, "fixture") === "poscig";
    for (const scene of game.scenes.filter(mine)) {
      await scene.update({ name: "Pościg · Plansza", flags: k.flags({ key: "plansza" }) });
      k.scenes.plansza = scene;
    }
    for (const a of game.actors.filter(mine)) await k.adopt(`pojazd-${a.id}`, a);

    // 2. Złożona droga — pojazdy z katalogu w prawdziwej skali, z jadącymi.
    const kier = await k.persona("kierowca", "wojownik-autostrady-5", { owner: "Gracz 1", name: "Kierowca pościgu" });
    const strz = await k.persona("strzelec", "kowboj-5", { owner: "Gracz 2", name: "Strzelec pościgu" });
    await k.give(strz, [{ ref: "bron:Minimi", load: true }, { ref: "amunicja:{556}", qty: 200 }, { ref: "granaty:{grenade-frag}", qty: 3 }]);
    for (const [u, a] of [["Gracz 1", kier], ["Gracz 2", strz]]) await k.seat(u, a);
    const linked = { prototypeToken: { actorLink: true } };
    const osob = await k.fromPack("osobowka", "pojazdy", "Osobówka", { name: "Osobówka graczy", owner: ["Gracz 1", "Gracz 2"], data: linked });
    const hammer = await k.fromPack("hammer", "pojazdy", "Hammer", { name: "Hammer bandytów" });
    const autobus = await k.fromPack("autobus", "pojazdy", "Autobus", { name: "Autobus bandytów" });
    const droga = await C.start({ nazwa: "Pościg · Złożona droga", aktywuj: false });
    await droga.update({ flags: k.flags({ key: "droga" }) });
    k.scenes.droga = droga;
    k.main = droga;
    const g = droga.grid.size;
    for (const [a, tor, rola] of [[osob, 3, "scigajacy"], [hammer, 6, "scigany"], [autobus, 8, "scigany"]]) {
      if (a) await C.dodajPojazd(droga, a.id, { tor, rola });
    }
    const tok = (scena, a) => scena.tokens.find(t => t.actorId === a?.id);
    // Rzędy: Osobówka i Hammer w jednym rzędzie, autobus rząd niżej — linia serii przez dwa wozy, skos do trzeciego.
    for (const [a, y] of [[osob, 520], [hammer, 520], [autobus, 700]]) {
      const t = tok(droga, a);
      if (t) await t.update({ y }, { animate: false });
    }
    const bandyci = [];
    for (const [key, name] of [["bandyta1", "Bandyta z Hammera"], ["bandyta2", "Bandyta z Autobusu"], ["bandyta3", "Drugi z Autobusu"]]) {
      bandyci.push(await manekin(k, key, { name, hp: 30, tt: 12 }));
    }
    const posadz = async (scena, auto, ludzie) => {
      const t = tok(scena, auto);
      if (!t) return;
      const zetony = await k.tokens(scena, ludzie.map(([a]) => [a, t.x / 100, t.y / 100]));
      for (const [i, z] of zetony.entries()) await P.posadz(t, z, ludzie[i][1] ?? null);
    };
    try {
      await posadz(droga, osob, [[kier, "kabina-0-0"], [strz, "kabina-1-0"]]);
      await posadz(droga, hammer, [[bandyci[0], null]]);
      await posadz(droga, autobus, [[bandyci[1], null], [bandyci[2], null]]);
      const o = tok(droga, osob);
      if (o) await P.utworzKluczyki(o);
    } catch (err) { k.miss(`obsada planszy: ${err.message}`); }

    // 3. Parking (1,5 m) — Buggy z kierowcą do wycięcia na planszę albo na mapę regionu.
    const parking = await k.scene("parking", { name: "Pościg · Parking", w: 24, h: 16, color: "#55524a" });
    const buggy = await k.fromPack("buggy", "pojazdy", "Buggy", { name: "Buggy zwiadowcy" });
    const zwiadowca = await manekin(k, "zwiadowca", { name: "Zwiadowca bandytów", hp: 30, tt: 12 });
    await k.tokens(parking, [[buggy, 6, 6, { rotation: 270 }]]);
    try { await posadz(parking, buggy, [[zwiadowca, "kabina-0-0"]]); } catch (err) { k.miss(`buggy: ${err.message}`); }

    // 4. Mapa regionu — 1 km na kratkę: pojazd jest tu znacznikiem (D21).
    await k.scene("region", { name: "Pościg · Mapa regionu", w: 30, h: 20, color: "#8a7a55", grid: { distance: 1, units: "km" } });

    return {
      plansza: summary?.scene?.name ?? null, droga: droga.name, tryb: P.trybSceny(droga),
      jadacy: [osob, hammer, autobus].reduce((n, a) => n + (tok(droga, a) ? P.jadacyPojazdu(tok(droga, a)).length : 0), 0),
      skala: Math.round(P.kratkaPojazdu(droga)), tor: g
    };
  },
  proby: [
    p("plansza", "Pościg", "Plansza: przewijana pustynia, tory, pojazdy na środkach torów, kołysanie", "Pościg · Plansza; start pościgu narzędziem MG w kontrolkach sceny."),
    p("ruch", "Pościg", "Ruch pojazdów i przyciąganie do torów; kontrole (żeton bez roli między torami, strefa swobodna)", "Pościg · Plansza: przeciągaj pojazdy; z miejsca gracza."),
    p("wydajnosc", "Wydajność", "Czas klatki z ruchomym tłem", "Liczniki → klatki."),
    // Złożona droga (PLAN_m4_pojazdy §6.2)
    p("skala", "Złożona droga (D24)", "Pojazdy w prawdziwej skali (70 px na 1,5 m, jak mapy kampanii); tor = znacznik 36 m; Autobus dłuższy niż tor zachodzi na sąsiedni, plakietka pokazuje jego znacznik", "Pościg · Złożona droga; porównaj Osobówkę z Parkingiem."),
    p("tory", "Złożona droga (D25)", "Twardo w torach: przeciąganie — także z Shiftem — zawsze na środek toru; to, co wyląduje obok (makro, cofnięcie), MG dociąga; rzędy jezdni wolne", "Gracz 1 przeciąga Osobówkę z Shiftem i bez."),
    p("jadacy", "Złożona droga (D26)", "Jadący na planszy: kropki u obcych, prześwietlenie u jadących, przesiadka zawsze jak w jadącym pojeździe", "Gracz 2 najeżdża na Osobówkę, przesiada się; MG patrzy na Hammera z zewnątrz."),
    p("zasieg", "Złożona droga (D27)", "Linijka i zasięgi po drodze: 36 m na tor między pojazdami, prawdziwe metry w poprzek i w pojeździe; okno ataku strzelca do bandyty", "Linijką od Strzelca do Bandyty z Hammera; atak z Minimi."),
    p("seria", "Złożona droga (D28)", "Seria celowana: Miażdżąca / Długa z Minimi — punkt zamiast linii, podgląd trafionych na żywo, karta MG z listą jadących i pojazdów, własny pojazd pominięty", "Gracz 2: Minimi → Miażdżąca seria → wskaż Hammera, potem Autobus po skosie.", "VETO"),
    p("obszar", "Złożona droga (D29, D31)", "Granat na Hammerze: karta trafionych (rysunek może zachodzić — obowiązuje lista); ogień zaporowy położony na Hammerze jedzie z nim", "Gracz 2 rzuca granat; Minimi → Ogień zaporowy na Hammerze; przesuń Hammera o tor."),
    p("rola", "Złożona droga (P3)", "Pojazd bez roli na planszy (wklejony, upuszczony z paska) → karta MG „Rola w pościgu?”", "Upuść dowolny pojazd z paska na Złożoną drogę."),
    // Pojazdy między scenami (część 1b)
    p("schowek", "Między scenami (D22)", "Ctrl+X / Ctrl+V z załogą: Buggy z kierowcą z Parkingu na planszę (prawdziwa skala, jadący na miejscu) i na Mapę regionu (sam pojazd, niepowiązany kierowca zostaje z ostrzeżeniem)", "MG: zaznacz Buggy na Parkingu, Ctrl+X, przejdź na planszę, Ctrl+V; potem to samo na Mapę regionu."),
    p("obsada", "Między scenami (D23)", "Pamięć obsady: Osobówka graczy postawiona na innej scenie → karta MG „Posadzić załogę?”, [Posadź] dostawia żetony postaci", "MG przeciąga Osobówkę graczy z paska aktorów na Parking."),
    p("znacznik", "Między scenami (D21)", "Mapa w km: pojazd to znacznik — bez obrysu, miejsc, dymu, świateł i kart jazdy; wsiadanie odmówione", "Osobówka graczy z paska na Mapę regionu; spróbuj wsiąść.")
  ]
};
