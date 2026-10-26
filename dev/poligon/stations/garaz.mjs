/**
 * Garaż (PLAN_m4_pojazdy §7, E8, P2): pojazdy poza pościgiem — wsiadanie i miejsca, jadący na mapie, kropki
 * i prześwietlenie, silnik (dym, drgania, dźwięk, światła, kluczyki), jazda w walce (skręty, potrącenia,
 * bezruch), awarie i naprawy, wrak, broń montowana, Wojownik autostrady. Sondy dla każdej decyzji D2–D18 i
 * każdej własnej cechy z §5, do weta MG (§10).
 */

import { p, manekin } from "./_wspolne.mjs";

export default {
  id: "garaz", name: "Garaż", prio: "P2", icon: "fa-solid fa-car-side",
  opis: "Parking za warsztatem: Osobówka (Gracz 1 za kierownicą — Wojownik autostrady z Kaskaderem, Gracz 2 i 3 na tylnej kanapie), Motocykl, Rower, "
    + "Ciężarówka z paką, Wóz strażacki, Hammer z Browningiem na wieżyczce, Czołg. Manekiny na drodze do potrąceń, gruzowisko (trudny teren). "
    + "Kluczyki do Osobówki w stacyjce; Ciężarówka bez kluczyków (na krótko). Mechanik z narzędziami i surowcami do napraw.",
  gracze: 3,
  async build(k) {
    const s = await k.scene("parking", { name: "Garaż · Parking", w: 48, h: 28, color: "#55524a", main: true });
    const P = game.neuroshima.pojazdy;

    // Gruzowisko — region trudnego terenu (koszt ruchu ×2).
    try {
      await s.createEmbeddedDocuments("Region", [{
        name: "Gruzowisko", color: "#8a6d3b",
        shapes: [{ type: "rectangle", x: 30 * 100, y: 4 * 100, width: 8 * 100, height: 8 * 100 }],
        behaviors: [{ type: "modifyMovementCost", name: "Trudny teren", system: { difficulties: { walk: 2, displace: 1 } } }]
      }]);
    } catch (err) { k.miss(`gruzowisko: ${err.message}`); }

    const kier = await k.persona("kierowca", "wojownik-autostrady-5", { owner: "Gracz 1", name: "Kierowca (Wojownik autostrady)" });
    const pas1 = await k.persona("pasazer1", "medyk-5", { owner: "Gracz 2", name: "Pasażerka" });
    const pas2 = await k.persona("pasazer2", "kowboj-5", { owner: "Gracz 3", name: "Strzelec" });
    const mech = await k.persona("mechanik", "monter-5", { name: "Mechanik" });
    await k.give(mech, [{ ref: "narzedzia:{mechanika}" }, { ref: "narzedzia:{rusznikarza}" }]);
    for (const [u, a] of [["Gracz 1", kier], ["Gracz 2", pas1], ["Gracz 3", pas2]]) await k.seat(u, a);

    const pojazdy = {};
    for (const [key, nazwa] of [["osobowka", "Osobówka"], ["motocykl", "Motocykl"], ["rower", "Rower"], ["ciezarowka", "Ciężarówka"],
      ["woz", "Wóz strażacki"], ["hammer", "Hammer"], ["czolg", "Czołg"]]) {
      pojazdy[key] = await k.fromPack(key, "pojazdy", nazwa, { owner: key === "osobowka" ? null : null });
    }
    const m1 = await manekin(k, "manekin1", { name: "Manekin (średni)" });
    const m2 = await manekin(k, "manekin2", { name: "Manekin (średni) 2" });
    const tokeny = await k.tokens(s, [
      [pojazdy.osobowka, 6, 6], [pojazdy.motocykl, 11, 6], [pojazdy.rower, 13, 6], [pojazdy.ciezarowka, 16, 4],
      [pojazdy.woz, 20, 4], [pojazdy.hammer, 25, 6], [pojazdy.czolg, 4, 16],
      [kier, 5, 11], [pas1, 6, 11], [pas2, 7, 11], [mech, 9, 12],
      [m1, 14, 18], [m2, 22, 18]
    ]);
    const tok = actor => tokeny.find(t => t.actorId === actor?.id);
    const osob = tok(pojazdy.osobowka), hammer = tok(pojazdy.hammer);
    try {
      if (osob) {
        await P.posadz(osob, tok(kier), "kabina-0-0");
        await P.posadz(osob, tok(pas1), "kabina-1-0");
        await P.posadz(osob, tok(pas2), "kabina-1-2");
        await P.utworzKluczyki(osob);
      }
      if (hammer) {
        const [b] = await k.give(hammer.actor, [{ ref: "bron:Browning" }]);
        if (b) await P.zamontujOdReki(hammer, b, "wiezyczka-0-0");
      }
    } catch (err) { k.miss(`obsada: ${err.message}`); }
    return { pojazdy: Object.values(pojazdy).filter(Boolean).length, jadacy: osob ? P.jadacyPojazdu(osob).length : 0 };
  },
  proby: [
    // D2–D4: jadący, widok, okno miejsc
    p("jadacy", "Jadący (D2)", "Jadący zmniejszeni do miejsca jadą z pojazdem: pozycja, obrót (kierowca dalej patrzy do przodu po zawróceniu), drgania", "Gracz 1 jedzie Osobówką po łuku i zawraca; MG patrzy z prześwietleniem."),
    p("undo", "Cofanie ruchu", "Jedno Ctrl+Z cofa ruch lub obrót pojazdu razem z obrysem i jadącymi; automatyczny zapis miejsc nie zajmuje historii MG", "MG: przesuń Osobówkę ze skrętem i naciśnij Ctrl+Z; powtórz z samym obrotem i dwoma ruchami cofanymi kolejno. Następnie Gracz 1 jedzie i cofa u siebie; MG sprawdza własną historię oraz zwykły żeton."),
    p("kropki", "Widok (D3)", "Kropki zamiast jadących u gracza spoza pojazdu; prześwietlenie (35%) u MG, właściciela i jadących", "Najedź na Osobówkę jako MG, jako Gracz 2 (w środku) i jako gracz bez postaci w środku."),
    p("grafika", "Grafika Osobówki", "Portret i dwa zgodne żetony: dach z bagażem oraz pusta kabina; wnętrze tylko z prawem prześwietlenia, miejsca na fotelach", "Nowa Osobówka z kompendium: najedź jako MG, kierowca i gracz z zewnątrz; odsuń kursor, obróć pojazd, otwórz Miejsca. Sprawdź też własną grafikę i pojazd bez wnętrza."),
    p("grafika-hammer", "Grafika Hammera", "Portret i zgodna para nadwozie/wnętrze: cztery koła, cztery fotele oraz centralne stanowisko pod włazem", "Scena Hammera: najedź na obsadzony pojazd, odsuń kursor i otwórz Miejsca. Porównaj z pustymi wersjami obok; sprawdź położenie włazu nad platformą i kotwice pięciu jadących przy skali auta 120% i pierwotnych skalach grafik postaci."),
    p("wlaz-widoczny", "Widoczny właz (D32)", "Strzelec włazu ma pełny żeton nad dachem, bez kropki; czterech pasażerów kabiny pozostaje zakrytych", "MG i obserwator: odsuń kursor, porównaj widok, wyceluj normalnie w strzelca. Najedź jako MG, obróć i przesuń pojazd. Przesiądź strzelca do kabiny i z powrotem; sprawdź okno Miejsca, ręczne ukrycie oraz wysiadkę. Grafiki bez zmian."),
    p("skala-grafiki", "Skala grafiki", "Cztery koła na dwóch osiach; przednie miejsca bliżej foteli. Skala grafiki postaci i rozmiar auta oceniane osobno", "Porównaj zwykłych ludzi dnd5e z własną grafiką postaci i Gangusem Kapo. Przód na 63%/37% szerokości, tył na 67%/50%/33%; sprawdź także obrys auta powiększony o 20%.", "VETO"),
    p("altklik", "Widok (D3)", "W prześwietleniu klik w jadącego zaznacza jadącego, Alt+klik — pojazd", "MG: najedź, kliknij jadącego, potem Alt+klik."),
    p("celowanie", "Widok (D14)", "Prawy klik w kropkę celuje w ukrytego jadącego; karta ataku podaje jego imię", "Gracz spoza pojazdu celuje w kropkę i strzela."),
    p("okno", "Miejsca (D4)", "Okno miejsc śledzi zaznaczony żeton postaci (MG: BG lub BN); koszty z RAW na karcie", "MG bez przypisanej postaci: HUD Osobówki → Miejsca, następnie zaznacz Mechanika na mapie i kliknij wolne miejsce. Powtórz dla BN, przesiądź się i wysiądź. Sprawdź zaznaczenie przed otwarciem, zmianę postaci w otwartym oknie, wiele zaznaczonych postaci i samo celowanie (nie wybiera pasażera)."),
    p("przesiadka", "Miejsca (D15)", "Przesiadka w jadącym pojeździe: ×2 bez testu albo ×1 z Akrobatyką; zmiana rzędu zawsze z testem (WKK)", "W walce po ruchu Osobówki: Gracz 2 przesiada się do przodu.", "WKK"),
    p("obrys", "Obrys (D13)", "Prostokątny obrys w czterech kierunkach: grafika się nie rozjeżdża, kratki i ramka pasują po skręcie", "Jedź w bok i z powrotem; porównaj ramkę zaznaczenia z grafiką.", "VETO"),
    p("grafika-motocykl", "Grafika i obsada motocykla", "Portret i żeton cruisera z dwoma miejscami na siodle; pełne żetony kierowcy i pasażera nad motocyklem, bez kropek", "Scena motocykla: porównaj pusty żeton, jednego i dwóch jadących oraz grafiki postaci obok. Najedź, odsuń kursor, przesuń i obróć motocykl; sprawdź obie kotwice, zwykłe celowanie i wysiadkę. Podgląd: motocykl 120%, grafiki postaci w pierwotnych skalach."),
    // D5–D9: silnik i jazda
    p("silnik", "Silnik (D7, D8)", "Uruchom/Zgaś, oznaczenia (ręce, kluczyki), blokady (awaria 15/17, pusty bak); dym, drgania, dźwięk dla trzech zestawów", "Osobówka (benzyna), Ciężarówka (diesel), Motocykl."),
    p("drgania", "Silnik (D8)", "Ustawienie klienta „Drgania pojazdów” wyłącza drgania, dym zostaje", "Ustawienia → moduł → Drgania pojazdów."),
    p("kluczyki", "Kluczyki (D12)", "Kluczyki pasują do jednego pojazdu; na krótko (narzędzia mechanika albo elektronika, ST wg klasy): sukces trwały, porażka — alarm, o 5+ — awaria 17", "Ciężarówka: Gracz 1 siada za kierownicą bez kluczyków.", "WKK"),
    p("swiatla", "Światła (D18)", "Stożek ok. 60° do przodu, obraca się z pojazdem, działa bez silnika; awaria 17 gasi", "Osobówka: Światła, potem jazda i obrót."),
    p("tura", "Jazda (D9)", "Pojazd poza trackerem; droga liczona w turze kierowcy, przekroczenie i ruch poza turą oznaczone", "Walka z Gracz 1–3 i manekinami; jedź Osobówką w turze i poza turą kierowcy."),
    p("skret", "Jazda (D10)", "Skręt ≥ 90° → karta z Testem (Pojazdy) ST 10; zawrócenie → ST 20 i awaria 8 przy porażce", "Jedź w prawo z miejsca, potem zawróć."),
    p("teren", "Jazda", "Gruzowisko: karta trudnego terenu; Hammer (Terenówka) ×½ bez testu; Czołg (Gąsienice) bez kary", "Przejedź przez Gruzowisko trzema pojazdami.", "RAI"),
    p("potracenie", "Potrącenie (§4.7)", "Manekin na drodze: karta MG z RO ZRC ST 15 i obrażeniami wg rozmiaru; większa istota — zderzenie", "Przejedź przez manekina Osobówką, Motocyklem i Czołgiem (Miażdżenie)."),
    p("atak", "Atak z pojazdu", "Utrudnienie w oknie ataku dla jadącego w jadącym pojeździe; Akrobatyka ST 10 z HUD-u je znosi; osłona jadącego domyślnie ½", "Strzelec (Gracz 3) strzela z jadącej Osobówki; cel strzela w niego."),
    p("bezruch", "Jazda", "Pojazd, który nie ruszył się w rundzie, ma TT w bezruchu (−5)", "Następna runda bez ruchu Ciężarówki — porównaj TT."),
    // D5, D17, D19: awarie i naprawy
    p("awarie", "Awarie (D5)", "Obrażenia ≥ Próg awarii i porażka kierowcy o 5+ → karta k20; [Zastosuj] — skutki mierzalne, reszta tekstem", "Zadaj Osobówce 25 obrażeń; zastosuj kilka awarii z karty pojazdu."),
    p("zegary", "Awarie (D5)", "Zegary: wyciek, chłodnica (2k10 rund), rozpęd po zgaśnięciu, naprawa tymczasowa (minuta) — w walce i poza nią", "Awaria 9, 13, 15; Czas → +1 runda / +10 min."),
    p("pozar", "Awarie (D5)", "Pożar (1): 2k6 ognia pojazdowi i jadącym na końcu tury kierowcy (karta MG)", "Awaria 1 w walce; koniec tury Gracza 1."),
    p("naprawy", "Naprawy (D19)", "Tymczasowa (jazda) i fachowa (postój): ST, stopień, koszt (10% ceny = cena części), Robota M2; Napraw karoserię", "Mechanik naprawia awarie i karoserię Osobówki.", "VETO"),
    p("wrak", "Wrak (D17)", "0 PW: wrak, jadący wysadzeni obok; płonący z paliwem — k4 rund do wybuchu (ogień wg rozmiaru, RO ZRC ST 15); Odbudowa", "Osobówka z awarią 1 do 0 PW.", "VETO"),
    // D16: broń montowana
    p("bron", "Broń montowana (D16)", "Strzelec na wieżyczce dostaje Browninga (bez wagi), wraca do pojazdu po zejściu; montaż jako Robota", "Gracz 3 przesiada się do Hammera na wieżyczkę; potem zejdź.", "VETO"),
    // D11: dostęp
    p("dostep", "Dostęp (D11)", "Gracz w środku ma prawa właściciela (ruch, karta, ładownia, uruchamianie); po wysiadce traci; upuszczone w środku ląduje w ładowni (WKK)", "Gracz 2: przesuń Osobówkę, otwórz kartę, upuść przedmiot z lalki.", "WKK"),
    // Wojownik autostrady (E7)
    p("wojownik", "Wojownik autostrady", "Kaskader z karty pojazdu; Drzwi w drzwi (Rajdowiec, Konwojent, Taranowanie) i Pancerna fura (OC, AC [B]) po zamianie zdolności", "Kierowca: trik na karcie Osobówki; MG podmienia zdolność na karcie postaci."),
    // §5: własne cechy
    p("cechy", "Katalog (§5)", "Liczby i własne cechy 10 pojazdów bez statbloku (interpolacja, RAI/WKK) — do weta", "Karty pojazdów z kompendium Pojazdy.", "VETO")
  ]
};
