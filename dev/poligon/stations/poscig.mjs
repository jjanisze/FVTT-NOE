/**
 * Pościg (§5.6, P3; PLAN_m4_pojazdy §6.2, P6): plansza pościgu na złożonej drodze.
 *
 *  - **Plansza** — fixture e2e `poscig` (12 torów, sześć pojazdów na środkach torów, dwie kontrole): grafika,
 *    kołysanie, wydajność.
 *  - **Złożona droga** — pojazdy z katalogu w prawdziwej skali: Osobówka graczy (Gracz 1 za kierownicą, Gracz 2
 *    strzelcem z Minimi i granatami), Hammer bandytów i Autobus bandytów (dłuższy niż tor) z jadącymi. Sondy
 *    D21–D31 (część 1b i 2).
 *  - **Start–meta** — pościg od startu do mety (P5, sondy D34–D41): Osobówka uciekinierów (Gracz 3 za kierownicą,
 *    Rajdowiec; pasażer do „Za kierowcą”), Hammer i Motocykl bandytów z pasażerem do wypadania, meta na znaczniku 10,
 *    walka przygotowana, nierozpoczęta.
 *  - **Parking** (mapa 1,5 m) — Buggy z kierowcą do Ctrl+X / Ctrl+V na planszę i na mapę regionu (E11).
 *  - **Mapa regionu** (1 km na kratkę) — pojazd jako znacznik (D21).
 */

import { MOD, p, manekin } from "./_wspolne.mjs";

export default {
  id: "poscig", name: "Pościg", prio: "P3", icon: "fa-solid fa-truck-monster",
  opis: "Plansza z fixture e2e (12 torów, sześć pojazdów, kontrole: żeton między torami bez roli, strefa swobodna) i druga plansza "
    + "na złożonej drodze: Osobówka graczy (Gracz 1 za kierownicą, Gracz 2 z Minimi i granatami), Hammer i Autobus bandytów "
    + "z jadącymi. Trzecia plansza — Start–meta: pościg od startu do mety (Gracz 3 ucieka Osobówką przed Hammerem i Motocyklem "
    + "bandytów, meta na znaczniku 10). Parking z Buggy (Ctrl+X / Ctrl+V) i Mapa regionu w km.",
  gracze: 3,
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
    // Żeton nazwany jak kopia — dwa Hammery i dwie Osobówki na stanowisku, katalogowa nazwa żetonu by je myliła.
    const auto = (name, { owner = null, link = false } = {}) => ({ name, owner, data: { prototypeToken: { name, ...(link ? { actorLink: true } : {}) } } });
    const osob = await k.fromPack("osobowka", "pojazdy", "Osobówka", auto("Osobówka graczy", { owner: ["Gracz 1", "Gracz 2"], link: true }));
    const hammer = await k.fromPack("hammer", "pojazdy", "Hammer", auto("Hammer bandytów"));
    const autobus = await k.fromPack("autobus", "pojazdy", "Autobus", auto("Autobus bandytów"));
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
      // Kolejność z createEmbeddedDocuments nie jest stała — żeton do miejsca po aktorze, nie po pozycji.
      for (const [a, miejsce] of ludzie) {
        const z = zetony.find(d => d.actorId === a?.id);
        if (z) await P.posadz(t, z, miejsce ?? null);
      }
    };
    try {
      await posadz(droga, osob, [[kier, "kabina-0-0"], [strz, "kabina-1-0"]]);
      await posadz(droga, hammer, [[bandyci[0], null]]);
      await posadz(droga, autobus, [[bandyci[1], null], [bandyci[2], null]]);
      const o = tok(droga, osob);
      if (o) await P.utworzKluczyki(o);
    } catch (err) { k.miss(`obsada planszy: ${err.message}`); }

    // 3. Start–meta (P5, D34–D41): uciekinierzy na znaczniku 4, bandyci na 1, meta na 10; walka czeka na MG.
    const kierU = await k.persona("kierowca-ucieczki", "wojownik-autostrady-5", { owner: "Gracz 3", name: "Kierowca ucieczki (Rajdowiec)" });
    const pasU = await k.persona("pasazer-ucieczki", "zwiadowca-1", { owner: "Gracz 3", name: "Pasażer ucieczki" });
    await k.seat("Gracz 3", kierU);
    const osobU = await k.fromPack("osobowka-ucieczki", "pojazdy", "Osobówka", auto("Osobówka uciekinierów", { owner: "Gracz 3", link: true }));
    const hammerP = await k.fromPack("hammer-poscigu", "pojazdy", "Hammer", auto("Hammer pogoni"));
    const moto = await k.fromPack("motocykl-poscigu", "pojazdy", "Motocykl", auto("Motocykl pogoni"));
    const meta = await C.start({ nazwa: "Pościg · Start–meta", srodowisko: "ulice", aktywuj: false,
      scigani: [osobU?.id].filter(Boolean), scigajacy: [hammerP?.id, moto?.id].filter(Boolean) });
    if (meta) {
      await meta.update({ flags: k.flags({ key: "start-meta" }) });
      k.scenes["start-meta"] = meta;
      const pogon = [];
      for (const [key, name] of [["bandyta-hammer", "Kierowca Hammera"], ["bandyta-moto", "Motocyklista"], ["bandyta-plecak", "Pasażer motocykla"]]) {
        pogon.push(await manekin(k, key, { name, hp: 30, tt: 12 }));
      }
      try {
        await posadz(meta, osobU, [[kierU, "kabina-0-0"], [pasU, "kabina-1-0"]]);
        await posadz(meta, hammerP, [[pogon[0], null]]);
        await posadz(meta, moto, [[pogon[1], "siodlo-0-0"], [pogon[2], "siodlo-1-0"]]);
      } catch (err) { k.miss(`obsada Start–meta: ${err.message}`); }
      await C.tura.ustawMete(meta, 10);
      await k.combat(meta, [kierU, pasU, ...pogon]);
    }

    // 4. Parking (1,5 m) — Buggy z kierowcą do wycięcia na planszę albo na mapę regionu.
    const parking = await k.scene("parking", { name: "Pościg · Parking", w: 24, h: 16, color: "#55524a" });
    const buggy = await k.fromPack("buggy", "pojazdy", "Buggy", auto("Buggy zwiadowcy"));
    const zwiadowca = await manekin(k, "zwiadowca", { name: "Zwiadowca bandytów", hp: 30, tt: 12 });
    await k.tokens(parking, [[buggy, 6, 6, { rotation: 270 }]]);
    try { await posadz(parking, buggy, [[zwiadowca, "kabina-0-0"]]); } catch (err) { k.miss(`buggy: ${err.message}`); }

    // 5. Mapa regionu — 1 km na kratkę: pojazd jest tu znacznikiem (D21).
    await k.scene("region", { name: "Pościg · Mapa regionu", w: 30, h: 20, color: "#8a7a55", grid: { distance: 1, units: "km" } });

    return {
      plansza: summary?.scene?.name ?? null, droga: droga.name, tryb: P.trybSceny(droga),
      jadacy: [osob, hammer, autobus].reduce((n, a) => n + (tok(droga, a) ? P.jadacyPojazdu(tok(droga, a)).length : 0), 0),
      skala: Math.round(P.kratkaPojazdu(droga)), tor: g,
      startMeta: meta ? { meta: C.stan(meta)?.meta ?? null, pojazdy: meta.tokens.filter(t => P.jestPojazdem(t.actor)).length } : null
    };
  },
  proby: [
    p("czas-stop", "Grafika pościgu", "Czas stop zatrzymuje drogę, wszystkie plany dekoracji, śnieg, ślady opon i kołysanie pojazdów; wznowienie kontynuuje bez skoku trasy", "MG: tempo 2, naciśnij spację. Porównaj widok MG i gracza, przesuń kamerę i zmień powiększenie podczas pauzy. Wznów, powtórz w trzech motywach. Pauza nie zmienia tempa ani dokumentów pojazdów."),
    p("grafika-wznowienie", "Grafika pościgu", "Po uśpieniu komputera droga, niebo, dekoracje, śnieg, ślady opon i strefa swobodna wracają bez przeładowania; pojazdy i przebieg trasy pozostają na miejscu", "Otwórz Nuklearną zimę jako MG i gracz, tempo 2. Uśpij komputer, wznów; sprawdź wszystkie warstwy i numery torów. Powtórz z Ruinami Ameryki i Pustynią Nevary. Liczniki: game.neuroshima.poscig.tlo.stats(), graphicsContextRestores / whiteTextureRepairs."),
    p("zima-ruiny", "Nuklearna zima", "Krajobrazowe ruiny na pierwszym planie: samochody widoczne przez wybite okna i otwarte ramy; brak szerokiego gradientu na granicy pobocza", "Pościg · Plansza: wybierz motyw Nuklearna zima, tempo 2. Obejrzyj miasto, przedmieścia i fabryki; klikaj i przeciągaj pojazdy przez pełne fragmenty oraz otwory ruin."),
    p("zima-snieg", "Nuklearna zima", "Śnieg na trzech głębokościach nad pojazdami; pary śladów opon zostają w śniegu i jadą z nawierzchnią", "Jedź tempem 2, przesuń pojazd w poprzek drogi; zatrzymaj tło, zmień motyw i wróć. Strefa swobodna czysta, bez wiszących śladów i cząstek po zmianie motywu."),
    p("zima-tlo", "Nuklearna zima", "Całe sylwetki budynków bez zanikania na granicy modułów; wspólne niebo i śnieżny horyzont", "Tempo 2: obserwuj przejścia miasto / przedmieścia / fabryki. Budynki pozostają pełne i kryją się naturalnie za innymi sylwetkami."),
    p("zima-glebia", "Nuklearna zima", "Bliskie ruiny ciemniejsze, rozmyte i 2,9× szybsze od drogi; roślinność dalej, 1,45×; pojazdy ostre", "Porównaj trzy plany przy tempie 2 oraz po zatrzymaniu. Zmień powiększenie; otwory i kliknięcia przez dekoracje działają."),
    p("zima-rola", "Nuklearna zima", "Numer toru i ślady opon zgodne z rolą i środkiem pojazdu; nadanie roli włącza oba", "Kontrola Między torami bez roli nie ma numeru ani śladów. Nadaj rolę; sprawdź oba efekty. Pojazd częściowo nad strefą swobodną nadal zostawia ślady, dopóki środek jest na jezdni."),
    p("dekoracje-rzadkie", "Grafika pościgu", "Małe latarnie i znaki w zimie; duże ruiny tylko od czasu do czasu, na różnych wysokościach, bez wyjścia w strefę swobodną", "Tempo 2: porównaj trzy motywy. Duże budynki średnio co około 25 s w zimie, 30 s w ruinach i 43 s na pustyni; znaki i roślinność częściej. Obserwuj przez minutę lub dwie."),
    p("ruiny-tlo", "Grafika pościgu", "Ruiny Ameryki: całe sylwetki przedmieść, centrum handlowego, sklepów i wieżowców nad wspólnym niebem; bez zanikających fasad", "Obserwuj łączenia w każdym rejonie, zachowanie pobocza i kliknięcia przez rzadkie duże ruiny."),
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
    // Start–meta: mechanika pościgu (P5, §6.2.5)
    p("test-poscigu", "Start–meta (D35)", "Na początku tury kierowcy karta Testu Pościgu; rzut po kliknięciu, najpierw można zadeklarować manewr (Ostrożna jazda — Ułatwienie; Gazu! i Szósty bieg — ST +5); ST ze środowiska (ulice). Porażka — [Losuj komplikację], nat. 20 — [+1 znacznik], nat. 1 — dwie komplikacje, porażka o 6+ — także karta awarii k20",
      "Pościg · Start–meta: MG rzuca Inicjatywę i zaczyna walkę. W turze Gracza 3 zadeklaruj manewr z palety, potem rzuć z karty; powtórz kilka tur."),
    p("ruch-planszy", "Start–meta (D34)", "Budżet w znacznikach (36 m na tor): przekroczenie oznaczone, reszta metrów przechodzi na następną turę (najwyżej 35 m); [Cofnij o znacznik] na końcu tury tylko, gdy pojazd stał (Szybkość 0, Hample bez jazdy, brak kierowcy)",
      "Gracz 3 jedzie Osobówką o jeden tor mniej niż budżet, w następnej turze patrzy na zapas na karcie jazdy; MG kończy turę Hammera bez ruchu."),
    p("manewry", "Start–meta (D41)", "Paleta kierowcy na planszy: Gazu!, Hample, Obrót 180°, Ostrożna jazda, Stuknięcie, Zajechanie — karta i efekt do następnej tury kierowcy; Hample — karta wymienia pojazd za nim do testu zderzenia; koszt akcji oznaczony, nie pobrany",
      "MG z HUD-u Hammera: Hample, gdy Motocykl jedzie tuż za nim; Gracz 3: Zajechanie Hammerowi, Gazu! z dwoma torami ruchu."),
    p("komplikacje", "Start–meta (D36)", "Komplikacja k20 (s. 267): [Zastosuj] dla mierzalnych (znaczniki, obrażenia, Szybkość ½, trudny teren, stany; 1–3 → awaria k20), testy przyciskami, reszta tekstem; przepaść i przeszkody jako rysunki, które dryfują",
      "Po porażce Testu Pościgu: [Losuj komplikację] kilka razy; [Zastosuj] przy różnych wynikach."),
    p("atak-kierowca", "Start–meta (D36)", "Trafiony kierowca na planszy → karta Testu (Pojazdy) ST max(10, ½ obrażeń); porażka — [Cofnij o znacznik], o 5+ — [Przewrócenie] (awaria 8)",
      "MG zadaje obrażenia Kierowcy Hammera (karta obrażeń dnd5e); rzuć test z karty, zrób porażkę."),
    p("ro-pojazdu", "Start–meta (D36)", "Pojazd trafiony serią albo obszarem rzuca RO ZRC jak istota (ZRC z katalogu); Slalom kierowcy — Ułatwienie w Reakcji, zużyte; potem Próg obrażeń",
      "Granat albo seria w Osobówkę uciekinierów: przycisk Slalom na karcie, potem RO pojazdu."),
    p("wrecz-znacznik", "Start–meta (D37)", "Ten sam znacznik = zasięg wręcz bez względu na rząd; opuszczenie wspólnego znacznika bez ataków okazyjnych; zasięgi dystansowe i linijka dalej z metryki drogi",
      "Pasażer ucieczki atakuje wręcz Motocyklistę na tym samym torze w innym rzędzie; potem Osobówka odjeżdża."),
    p("dryf", "Start–meta (D38)", "Na początku rundy wszystko poza pojazdami i jadącymi (wypadnięci, przedmioty, przepaść) cofa się o 3 znaczniki; karta MG wymienia mijanych; zjazd z tyłu — „został w tyle”",
      "Wysadź Pasażera motocykla (Powalenie, znacznik za pojazdem); przejdź dwie rundy."),
    p("za-kierowca", "Start–meta (D39)", "HUD jadącego: „Za kierowcą” — tura pasażera tuż po kierowcy, raz na walkę; pasażer z Inicjatywą kierowcy",
      "Gracz 3, Pasażer ucieczki: HUD → Za kierowcą; sprawdź kolejkę walki."),
    p("koniec", "Start–meta (D40)", "Karta MG przy przewadze 7 znaczników, po 10 rundach (wygrywa najdalszy), przy wyeliminowaniu (wrak, Szybkość 0) i na mecie (znacznik 10, przeżywa przewijanie); [Zakończ pościg] wycisza karty tury i dryf. Rajdowiec działa na planszy zawsze",
      "Doprowadź Osobówkę na metę; potem nowa runda — karta końca; [Zakończ pościg]."),
    p("cala-gonitwa", "Start–meta (P5)", "Pościg od startu do mety bez notatek MG: wszystko, co trzeba policzyć, pokazują karty i przyciski",
      "Rozegraj gonitwę z graczem: od startu walki do karty końca. Zapisz każdą chwilę, w której trzeba było coś liczyć albo pamiętać.", "VETO"),
    // Pojazdy między scenami (część 1b)
    p("schowek", "Między scenami (D22)", "Ctrl+X / Ctrl+V z załogą: Buggy z kierowcą z Parkingu na planszę (prawdziwa skala, jadący na miejscu) i na Mapę regionu (sam pojazd, niepowiązany kierowca zostaje z ostrzeżeniem)", "MG: zaznacz Buggy na Parkingu, Ctrl+X, przejdź na planszę, Ctrl+V; potem to samo na Mapę regionu."),
    p("obsada", "Między scenami (D23)", "Pamięć obsady: Osobówka graczy postawiona na innej scenie → karta MG „Posadzić załogę?”, [Posadź] dostawia żetony postaci", "MG przeciąga Osobówkę graczy z paska aktorów na Parking."),
    p("znacznik", "Między scenami (D21)", "Mapa w km: pojazd to znacznik — bez obrysu, miejsc, dymu, świateł i kart jazdy; wsiadanie odmówione", "Osobówka graczy z paska na Mapę regionu; spróbuj wsiąść.")
  ]
};
