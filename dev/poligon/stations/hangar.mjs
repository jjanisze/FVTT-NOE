/**
 * Hangar — the M3 benchmark (PLAN_human_testing.md §5.0): companions and drones, never played at a
 * table. Yard ≥ 150 m with markers at 20 / 50 / 100 m from the operator's spot and a walled shed; a
 * Basement scene "pod ziemią". Five seats: Gracz 1 the creator with the factory controller, Gracz 2 the
 * homemade controller (handover), Gracz 3 a human partner's owner, Gracz 4 a Prawa ręka, Gracz 5 EMP.
 * The veto walk: every *rozstrzygnięcie do weta MG* from PLAN_m3_towarzysze.md §11, one probe each.
 */

import { MOD, p, tokenActor } from "./_wspolne.mjs";

const V = (id, grupa, tekst, jak = "") => p(`weto-${id}`, `Weto ${grupa}`, tekst, jak, "VETO");

export default {
  id: "hangar", name: "Hangar", prio: "P0", icon: "fa-solid fa-robot",
  opis: "M3 — towarzysze i drony. Podwórze 150 m (znaczniki 20/50/100 m, szopa ze ścianą), Piwnica „pod ziemią”. Haker (Gracz 1, kontroler fabryczny, dron kroczący rozłożony z UZI, latający złożony, Robota drona w toku), Łowca z Kłem (Gracz 2, kontroler domowy), Sędzia z partnerką (Gracz 3), Mafiozo z Luckym (Gracz 4), Zabójca Maszyn z Emiterem (Gracz 5). Cele: Obrońca, Spawacz, Gangus Kapo, Cywil, Pies mutek.",
  gracze: 5,
  klucz: ["haker", "kroczak"],
  async build(k) {
    const yard = await k.scene("podworze", { name: "Hangar · Podwórze", w: 110, h: 26, color: "#4b4a3c", main: true });
    const m = v => k.sq(yard, v);
    const ox = 4;
    const oy = 13;
    await k.labels(yard, [
      [ox - 2, oy + 2, "OPERATOR", { size: 24, fill: "#000000" }],
      [ox + m(20) - 0.5, 1, "20 m", { size: 40 }], [ox + m(50) - 0.5, 1, "50 m", { size: 40 }],
      [ox + m(100) - 0.5, 1, "100 m", { size: 40 }], [ox + m(150) - 0.5, 1, "150 m", { size: 40 }]
    ]);
    // Painted lines at each distance — no walls: the drone must drive straight through them.
    await k.stripes(yard, [20, 50, 100, 150].map(d => [ox + m(d) + 0.5, 3, 0.06, 20]).filter(s => s[0] < 109));
    const bx = Math.round(ox + m(30));
    await k.walls(yard, k.room(bx, 4, 7, 6, { door: { side: "s", at: 3 } }));
    await k.labels(yard, [[bx, 2.6, "Szopa — ściana między operatorem a dronem (zasięg przez przeszkody)", { size: 22 }]]);

    const basement = await k.scene("piwnica", {
      name: "Hangar · Piwnica (pod ziemią)", w: 40, h: 20, color: "#2a2724", darkness: 0.7, globalLight: false,
      flags: { [MOD]: { podZiemia: true } }
    });
    await k.walls(basement, [...k.room(2, 2, 36, 16, { door: { side: "w", at: 7 } }), [14, 2, 14, 12], [26, 8, 26, 18], [14, 12, 20, 12, "door"]]);
    await k.lights(basement, [{ x: 6, y: 9, bright: 2, dim: 6, color: "#ffd8a0" }]);
    await k.labels(basement, [[3, 0.6, "PIWNICA — scena „pod ziemią”: zasięg kontrolera jak przez ściany. Zwiad dronem aż do FAILSAFE.", { size: 22 }]]);

    // Cast.
    const haker = await k.persona("haker", "haker", { owner: "Gracz 1" });
    const lowca = await k.persona("lowca", "lowca", { owner: "Gracz 2" });
    const sedzia = await k.persona("sedzia", "sedzia", { owner: "Gracz 3" });
    const mafiozo = await k.persona("mafiozo", "mafiozo", { owner: "Gracz 4" });
    const zm = await k.persona("zabojca", "zabojca-maszyn", { owner: "Gracz 5" });
    for (const [u, a] of [["Gracz 1", haker], ["Gracz 2", lowca], ["Gracz 3", sedzia], ["Gracz 4", mafiozo], ["Gracz 5", zm]]) await k.seat(u, a);
    await k.party([haker, lowca, sedzia, mafiozo, zm]);

    // Controllers in hand: factory (Gracz 1), homemade (Gracz 2) — the handover D12.
    const [kf] = await k.give(haker, [{ ref: "sprzet:Kontroler zdalnego sterowania" }]);
    if (kf) await k.place(haker, kf, "hand.1");
    const [kd] = await k.give(lowca, [{ ref: "sprzet:Kontroler zdalnego sterowania (domowej roboty)" }]);
    if (kd) await k.place(lowca, kd, "hand.1");
    // STR 8: one 20 kg accumulator and the hacker kit keep the creator under Udźwig (two left her immobile).
    await k.give(haker, [{ ref: "sprzet:Akumulator", qty: 1 }, { ref: "sprzet:Baterie", qty: 4 }]);
    await k.surowce(haker, { CE: 15, CH: 1, CZ: 10, MK: 9 });

    // Drones through the module's funnel; the station adopts them so a reset removes them.
    const D = game.neuroshima.drony;
    const walk = await D.utworzDrona(haker, "dron-kroczacy", { tworca: haker, nazwa: "Kroczak" });
    await k.adopt("kroczak", walk?.dron);
    if (walk?.dron) await k.give(walk.dron, [{ ref: "bron:UZI", load: true }]);
    const fly = await D.utworzDrona(haker, "dron-latajacy", { tworca: haker, nazwa: "Osa" });
    await k.adopt("osa", fly?.dron);

    // A drone Robota part-way done (Scenariusz zero starts with finishing it).
    const P = game.neuroshima.produkcja;
    try {
      const dostep = P.przepisy(haker).find(x => x.przepis.wynik?.ref === "tabela:dron-kroczacy" && x.zrodla.length);
      const robota = dostep ? await P.start(haker, dostep.przepis, { mimoBrakow: true }) : null;
      if (robota) {
        const d = P.daneRoboty(robota);
        if (d?.wymagane) await P.pracuj(robota, Math.floor(d.wymagane * 0.85), { cicho: true, odlozTest: true });
        k.note(`Robota: ${robota.name}`);
      } else k.miss("Robota drona (brak przepisu dostępnego Hakerowi)");
    } catch (err) {
      k.miss(`Robota drona: ${err.message}`);
    }

    // Companions through the module's funnel (party first, so they join it).
    const T = game.neuroshima.towarzysze;
    await k.adopt("partnerka", await T.utworz(sedzia, { rodzaj: "ludzki-partner", nazwa: "Partnerka", zrodlo: "partner" }));
    await k.adopt("kiel", await T.utworz(lowca, { rodzaj: "zmutowany-ssak", nazwa: "Kieł", zrodlo: "oswajanie-zwierzat" }));
    await k.adopt("lucky", await T.utworz(mafiozo, { rodzaj: "prawa-reka", nazwa: "Lucky", zrodlo: "moja-prawa-reka" }));

    // Targets.
    const obronca = await k.fromPack("obronca", "bestiariusz", "obronca");
    const spawacz = await k.fromPack("spawacz", "bestiariusz", "spawacz");
    const kapo = await k.fromPack("kapo", "bestiariusz", "gangus-kapo");
    const cywil = await k.fromPack("cywil", "bestiariusz", "cywil");
    const pies = await k.fromPack("pies", "bestiariusz", "pies-mutek");

    const A = k.actors;
    await k.tokens(yard, [
      [haker, ox, oy], [lowca, ox, oy + 2], [sedzia, ox, oy - 2], [mafiozo, ox - 2, oy + 4], [zm, ox - 2, oy - 4],
      [A.partnerka, ox + 1, oy - 2], [A.kiel, ox + 1, oy + 2], [A.lucky, ox - 1, oy + 4],
      [obronca, ox + m(15), oy - 6], [spawacz, ox + m(15), oy - 3], [kapo, ox + m(15), oy + 3], [cywil, ox + m(15), oy + 6], [pies, ox + m(18), oy + 8]
    ]);
    if (walk?.uchwyt) await D.rozloz(walk.uchwyt, { pozycja: { x: (ox + 1) * 100, y: oy * 100 }, scena: yard });
    return {
      drony: [walk?.dron?.name, fly?.dron?.name].filter(Boolean),
      towarzysze: ["partnerka", "kiel", "lucky"].filter(x => A[x]).map(x => A[x].name),
      cele: [obronca, spawacz, kapo, cywil, pies].filter(Boolean).map(a => a.name),
      kapoStopnie: tokenActor(yard, kapo) ? game.neuroshima.towarzysze.maStopnieZranienia?.(tokenActor(yard, kapo)) ?? null : null
    };
  },
  narzedzia: [
    { label: "Piwnica", icon: "fa-solid fa-stairs", run: () => game.poligon.stations.view('hangar', 'piwnica') },
    { label: "Podwórze", icon: "fa-solid fa-sun", run: () => game.poligon.stations.view('hangar', 'podworze') }
  ],
  proby: [
    // Towarzysze
    p("pasek", "Towarzysze", "Pasek właściciela na 212 px z dwoma towarzyszami i dronem — czytelny?", "Karta Hakera (dwa drony) i Sędziego; wąskie okno."),
    p("plakietka", "Towarzysze", "Plakietka i dymek rozkładu na karcie towarzysza", "Pasek → [Karta] Partnerki / Kła / Lucky'ego."),
    p("grupa", "Towarzysze", "Grupa inicjatywy w trackerze: towarzysz pod właścicielem, rzut gracza przechodzi na grupę", "Zaznacz osoby + cele → walka; rzut z miejsca Gracza 3."),
    p("komenda", "Towarzysze", "Komenda → tura towarzysza; bez Komendy karta „bez komendy” i [Cofnij] u MG", "Gracz 3: Partner → Komenda w swojej turze; następna runda bez niej."),
    p("rpr", "Towarzysze", "Towarzysz przy 0 PW: karty Rzutów Przeciw Śmierci u gracza-właściciela", "Obrażenia na Partnerkę do 0."),
    p("druzyna", "Towarzysze", "Karta drużyny: towarzysze pod właścicielami, pula medyków DO, brudna woda dla zwierząt", "Drużyna Poligonu → karta."),
    // Tworzenie
    p("kreator", "Tworzenie", "Narzędzie MG [Nowy towarzysz] → kreator gracza (Cechy → Pochodzenie → klasa) w jego oknie", "Pasek Mafiozo (Gracz 4) → [Nowy towarzysz]."),
    p("k6", "Tworzenie", "Oswajanie: k6 zwierzęcia (rzut tylko dla MG); [Odłącz]", "Pasek Łowcy → [Nowy towarzysz]."),
    p("u23", "Tworzenie", "Klasa „Towarzysz” upuszczona na postać gracza → pytanie, „Nie” nic nie dodaje", "Kompendium Klasy → Towarzysz na kartę Hakera."),
    // Dron, ręce, przedmioty
    p("robota", "Dron", "Robota drona → uchwyt z „System ruszył …”, waga uchwytu na pasku Udźwigu", "Karta Hakera → Produkcja → dokończ Robotę."),
    p("klon", "Dron", "Odmowa klonu uchwytu; Rozłóż — podgląd i kliknięcie; Złóż — ostrzeżenie z daleka", "Osa: Rozłóż obok; potem Złóż Kroczaka z 10 m."),
    p("reka", "Dron", "[Weź do ręki] — lalka przekłada rzeczy z ręki; plakietki „atak wymaga Steruj [A]” i „druga aktywacja”; [R]", "W walce: Komenda [B] z kontrolerem w plecaku, atak UZI, Steruj [A], Reaguj."),
    // Tryb zdalny
    p("esc", "Tryb zdalny", "Esc najpierw zamyka okna, potem wychodzi; WASD rusza drona, strzałki tylko widok; kamera podąża", "Gracz 1: Przejmij sterowanie poza walką."),
    p("obraz", "Tryb zdalny", "Obraz analogowy na 20 / 50 / 100 m, przez ścianę szopy i w Piwnicy", "Prowadź Kroczaka wzdłuż znaczników; potem Piwnica."),
    p("failsafe", "Tryb zdalny", "FAILSAFE: moment i czytelność; cięcie wraca kontrolę i widok", "Piwnica: jedź dalej niż zasięg."),
    p("osd", "Tryb zdalny", "OSD przy 1366×768, 1920×1080 i 2560×1440, obok czatu i paska bocznego: lista akcji, ARMED i amunicja, BAT LOW", "Zmień rozmiar okna przeglądarki; Wariant → skala interfejsu."),
    p("przejecie", "Tryb zdalny", "Przekazanie do Gracza 2 (kontroler domowy, 20 m przez ściany)", "Gracz 2 → Przejmij sterowanie Kroczakiem."),
    p("klatki", "Tryb zdalny", "Czas klatki z filtrem FPV", "Liczniki → klatki wł., minuta w trybie zdalnym."),
    // Awarie, naprawy, zasilanie
    p("awaria", "Awarie", "Karta [Zastosuj]: MG widzi, gracz nie; pominięte wpisy; ikona „Wyłączony”", "Kości → k20; krytyk na Kroczaka."),
    p("spada", "Awarie", "Latający dron wyłączony w powietrzu → karta „Spada”", "Osa rozłożona, w górze, do 0 PW."),
    p("bateria", "Zasilanie", "Akumulator na uchwycie i w OSD po skoku zegara; Włóż akumulator", "Czas → +1 h, +10 min."),
    p("usun-drona", "Zasilanie", "Usunięcie drona albo operatora w trybie zdalnym kończy sesję bez błędów zasilania i własności", "Przejmij sterowanie, usuń drona, potem powtórz z usunięciem operatora; sprawdź konsolę."),
    p("naprawa", "Naprawy", "Napraw PW (1 h); ta sama awaria naprawiona pod NOE (karta MG) i pod WKK (Robota z częściami); wrak", "Wariant NOE/WKK, uchwyt → Napraw.", "WKK"),
    // EMP
    p("emp-obronca", "EMP", "Trafienie w Obrońcę przy TT 10 + ZRC — czy powód jest widoczny", "Gracz 5: Emiter EMP w Obrońcę."),
    p("emp-tacka", "EMP", "Tacka ×0 przeciw istocie żywej; Porażenie tylko maszyn; karta 230 V", "Strzał w Psa mutka i w Spawacza; Naładuj (230 V)."),
    // Bestiariusz s. 205
    p("kapo", "Bestiariusz", "Gangus Kapo przy 0 PW umiera zamiast „BN pada” — czy walka z pięcioma takimi się nie wlecze?", "Kapo do 0 PW; wyobraź sobie pięciu."),
    p("cywil", "Bestiariusz", "Krytyk na Cywilu nie daje Stopnia", "Kości → 20; atak na Cywila."),
    // Weto — §11 PLAN_m3_towarzysze.md
    V("e0-awaria", "E0", "„Awaria nie dotyczy maszyny”: 1 broń, 6 amunicja, 3/7/14/18 ataki, 15/16 wręcz; dron bez broni: 6 → 8, 18 → 19"),
    V("e0-chemia", "E0", "Chemia przy harówie podniesionej (PW ≤ ½): 4, nie 1 z przepisu"),
    V("e0-pwmin", "E0", "PW min. 1 dla każdego wzoru — ujemny modyfikator nie zabija"),
    V("e0-manip", "E0", "[A] z manipulatorem: Pochwycenie i Wytrącenie; Odepchnięcie ma każdy dron"),
    V("e0-sygnal", "E0", "Krzywa sygnału: czysto do ¼ zasięgu, 0,5 w połowie, sam szum na krawędzi — „przy 0,5 OSD ledwo czytelne?”", "Obraz na 20/50/100 m."),
    V("e1-pwreczne", "E1", "Ręcznie wpisane maks. PW ludzkiego towarzysza wygrywa; wyłącznik pwOverride jak u BG"),
    V("e1-biezace", "E1", "Bieżące PW nie rosną same przy wzroście maks.; przyrost o deltę przy awansie właściciela"),
    V("e1-nagroda", "E1", "Okno nagrody nie pokazuje towarzyszy (gamble i PD)"),
    V("e2-dolaczanie", "E2", "Właściciel w walce ciągnie towarzysza z żetonem na scenie; towarzysz dodany sam dołącza do grupy"),
    V("e2-rzut", "E2", "Rzut za towarzysza w grupie rzuca za właściciela, inaczej nic — towarzysz nigdy nie ma własnej inicjatywy"),
    V("e2-komenda", "E2", "Komenda poza turą / poza walką — tylko karta; zatrzask tylko dla rodzajów zdolności"),
    V("e2-zero", "E2", "Towarzysz przy 0 PW ma turę zawsze (RPŚ), bez Unikania i pominięcia"),
    V("e2-karta", "E2", "Karta „bez komendy” jawna, [Cofnij] tylko MG, działa też z następnej rundy"),
    V("e3-dymek", "E3", "Dymek rozkładu mówi „PB właściciela” (imię w plakietce)"),
    V("e3-medycy", "E3", "Pula medyków: postacie i towarzysze-postacie; zwierzę nie"),
    V("e3-zachod", "E3", "Zachód słońca liczy ludzkiego towarzysza, zwierzęcia nie"),
    V("e3-kolor", "E3", "Kolor PW na pasku: zielony / bursztynowy / czerwony od ½ i ¼"),
    V("e4-kolejnosc", "E4", "Kolejność kreatora: Cechy → Pochodzenie → klasa"),
    V("e4-klasa", "E4", "Jedna klasa „Towarzysz” dla Ludzkiego partnera i Prawej ręki"),
    V("e4-k6", "E4", "Oswajanie domyślnie rzuca k6 (tylko MG); MG może wybrać zwierzę wprost"),
    V("e4-szept", "E4", "Szept po utworzeniu do graczy właściciela i MG; karta otwiera się MG"),
    V("e4-szablon", "E4", "Szablon bez właściciela: TT bez PB, PW z szablonu (widok w kompendium)"),
    V("e7c-bateria", "E7c", "Nowy dron z pełną baterią"),
    V("e8a-tura", "E8a", "Koniec tury operatora kończy tryb zdalny"),
    V("e8a-zasieg", "E8a", "Poza zasięgiem nie ma aktywacji — komunikat z odległością, bez karty"),
    V("e8a-zeton", "E8a", "Operator musi mieć żeton na scenie drona („kontroler nie ma skąd nadawać”)"),
    V("e8a-esc", "E8a", "Esc najpierw zamyka okna i menu, potem wychodzi"),
    V("e8a-walka", "E8a", "Przejmij sterowanie w walce odmawia — wejściem są Komenda [B] i Steruj [A]"),
    V("e8b-filtr", "E8b", "Wygląd kamery w filtrze ekranu; MG kontrolujący żeton drona widzi tylko „Kamerę drona” (kolor w świetle, cz-b w ciemności — D38)"),
    V("e8b-szum", "E8b", "Wyłączony dron gaśnie w szum, wyjście po 1,5 s"),
    V("e8b-ruch", "E8b", "Bez przełącznika ruchu dla toczenia i rwania (gdyby przeszkadzało — ustawienie użytkownika)"),
    V("e8c-miejsce", "E8c", "OSD w wolnej części kanwy (między narzędziami a prawą kolumną, nad makrami)"),
    V("e8c-wielkosc", "E8c", "24 wiersze na wysokość ekranu"),
    V("e8c-armed", "E8c", "ARMED także poza walką (Przejmij sterowanie); w Komendzie [B] nie"),
    V("e8c-low", "E8c", "RSSI LOW poniżej 0,25 jakości; BAT LOW poniżej 20%"),
    V("e9-posiadacz", "E9", "Naprawia posiadacz uchwytu"),
    V("e9-koszt", "E9", "Pod NOE stopnie M2 liczą koszt z ceny uchwytu (70/90 gb); MG może [Naprawione]"),
    V("e9-jedna", "E9", "Jedna Robota naprawy na drona naraz"),
    V("e9-wylaczony", "E9", "Dron Wyłączony / wrak nie odpowiada na kontroler"),
    V("e10-narzedzia", "E10", "Emiter EMP: narzędzia przepisu — elektronika"),
    V("e10-waga", "E10", "Emiter: 8 kg, 200 gb"),
    V("e10-230v", "E10", "Ładowanie z 230 V to karta z przyciskiem MG"),
    V("e10-pancerz", "E10", "Pancerz zamontowany na dronie — MG decyduje (moduł nie wie)"),
    p("scenariusz-zero", "Scenariusz zero", "Cała sesja: Robota kończy się → Gracz 1 zwiad w Piwnicy do FAILSAFE → Gracz 2 przejmuje z podwórza → walka (partnerzy z i bez Komendy, atak drona w [A], [R], krytyk → awaria, latający wyłączony w powietrzu, EMP na Obrońcę, Kapo umiera) → Napraw PW, awaria pod NOE, potem Kobalt i Robota, skok zegara i bateria, DO z pulą medyków, dzienne zapasy", "Trzy miejsca graczy; zapisuj Uwagi po drodze.")
  ]
};
