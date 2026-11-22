/**
 * Garderoba (§5.2, P1): the sheet and inventory — shell, Stan, Zasoby, lalka, pas, sections, Udźwig,
 * pips, ulepszenia, Fuksy, PD, hotbar. Personas at loadout extremes: Goły, one typical per class,
 * Chomik (~600 items: Przeciążenie and Unieruchomienie, the scale case), full oporządzenie, power
 * armour, an armed NPC (the 180 px sidebar), Opiekun (the companion bar).
 */

import { p } from "./_wspolne.mjs";
import { packDocs } from "../lib/packs.mjs";

export default {
  id: "garderoba", name: "Garderoba", prio: "P1", icon: "fa-solid fa-shirt",
  opis: "Karta i ekwipunek. Goły, sześć typowych postaci klas, Chomik (~600 przedmiotów), Żołnierz w pełnym oporządzeniu (pas, magazynki, Kamizelka taktyczna), Weteran w pancerzu wspomaganym, uzbrojony Gangus (BN), Opiekun z Luckym, psem i dronem.",
  gracze: 3,
  klucz: ["chomik"],
  async build(k) {
    const s = await k.scene("przebieralnia", { name: "Garderoba", w: 30, h: 20, color: "#3f4250", main: true });
    const goly = await k.persona("goly", "goly", { owner: "Gracz 1" });
    const klasy = [];
    for (const id of ["brutal-1", "cwaniak-1", "spec-1", "twardziel-1", "zlodziej-1", "zwiadowca-1"]) klasy.push(await k.persona(id, id, { owner: "Gracz 2" }));
    const chomik = await k.persona("chomik", "chomik", { owner: "Gracz 3" });
    // Chomik: everything from the item packs on top of the loadout (the scale case of §3.4).
    if (chomik) {
      const all = [];
      for (const pack of ["bron", "pancerze", "amunicja", "magazynki", "granaty", "lekarstwa", "narzedzia", "sprzet"]) all.push(...(await packDocs(pack)).map(d => game.items.fromCompendium(d)));
      for (let i = 0; i < all.length; i += 100) await chomik.createEmbeddedDocuments("Item", all.slice(i, i + 100));
      await k.surowce(chomik, { CZ: 40, MK: 120, CH: 20 });
      k.note(`Chomik: ${chomik.items.size} przedmiotów`);
    }
    const zol = await k.persona("oporzadzenie", "zolnierz-5", { owner: "Gracz 1", name: "Żołnierz w oporządzeniu" });
    await k.give(zol, [
      { ref: "pancerze:Kamizelka taktyczna", place: "auto" }, { ref: "pancerze:Ochraniacze rąk (para)", place: "auto" }, { ref: "pancerze:Ochraniacze nóg (para)", place: "auto" },
      { ref: "sprzet:Kwas (fiolka)", qty: 2, place: "belt" }, { ref: "sprzet:Staza", place: "belt" }, { ref: "sprzet:Detonator radiowy", place: "belt" },
      { ref: "bron:Nóż taktyczny", place: "melee" }, { ref: "sprzet:Latarka czołówka", place: "headGear" }, { ref: "sprzet:Gogle noktowizyjne", place: "faceGear" },
      { ref: "lekarstwa:Medpak", qty: 3 }, { ref: "amunicja:{76239ak}", qty: 60 }
    ]);
    // Power armour instead of the class loadout's armour. A helmet over it asks (D23) — that is the
    // GM's probe below, so the Hełm waits in the pack.
    const wet = await k.persona("weteran", "weteran", { owner: "Gracz 2", loadout: [
      { ref: "pancerze:Pancerz wspomagany Stalowej Policji", place: "auto" }, { ref: "pancerze:Hełm" },
      { ref: "bron:Minigun", place: "hand.0", load: true }, { ref: "bron:B 92", place: "ranged", load: true }
    ] });
    const npc = await k.fromPack("gangus", "bestiariusz", "gangus-zolnierz");
    const opiekun = await k.persona("opiekun", "mafiozo", { owner: "Gracz 3", name: "Opiekun" });
    if (opiekun) {
      const T = game.neuroshima.towarzysze;
      await k.adopt("opiekun-lucky", await T.utworz(opiekun, { rodzaj: "prawa-reka", nazwa: "Lucky (Opiekuna)", zrodlo: "moja-prawa-reka" }));
      await k.adopt("opiekun-pies", await T.utworz(opiekun, { rodzaj: "psi-partner", nazwa: "Burek", zrodlo: "partner" }));
      const dron = await game.neuroshima.drony.utworzDrona(opiekun, "dron-kroczacy", { tworca: opiekun, nazwa: "Garderobiany" });
      await k.adopt("opiekun-dron", dron?.dron);
    }
    await k.seat("Gracz 1", zol);
    await k.seat("Gracz 2", wet);
    await k.seat("Gracz 3", chomik);
    const row = (list, y) => list.filter(Boolean).map((a, i) => [a, 2 + i * 2, y]);
    await k.tokens(s, [...row([goly, chomik, zol, wet, opiekun, npc], 3), ...row(klasy, 8), ...row([k.actors["opiekun-lucky"], k.actors["opiekun-pies"]], 13)]);
    return { osoby: Object.values(k.actors).length, chomik: chomik?.items.size ?? 0 };
  },
  proby: [
    p("m9-finish-routing", "Wygląd M9", "Porównaj ikonę fizycznego C4 z czynnością Detonuj, narzędzia medyka z Uzupełnij zapas oraz cechę stworzenia Naprawianie z naprawą drona. Sprzęt ma kolor rodziny, czynność sprzętu jasny glif, cecha stworzenia neutralne tło. Neodrugs, Tornado, oba rodzaje Narkotyków i Cygaro bez linii brzegowej. Poprawki partii 128: Trucizna (chemia) bez kropki w prawym dolnym rogu; Beretta B92 i rewolwer .22 bez oderwanych pikseli, z marginesem jak reszta broni.", "Kompendia, nowo dodane przedmioty i przedmioty Poligonu po odświeżeniu ścieżek (`node dev/poligon/ikony-m9.mjs`); ikony 44 / 32 / 24 / 16 px. Galeria → strony „Rodzina · chemicals / weapon” i „Wspólne glify”."),
    p("lalka-dok", "Lalka", "Dokowanie panelu lalki przy 1366×768, 1920×1080, 2560×1440; dwie karty otwarte; mała i duża skala interfejsu; motyw jasny i ciemny", "Wariant → wygląd; zmieniaj rozmiar okna przeglądarki."),
    p("przeciaganie", "Lalka", "Przeciąganie plecak ↔ lalka ↔ pas ↔ ziemia — czy animacja wyparcia czyta się jak „to poszło tam”?", "Żołnierz w oporządzeniu; przeciągnij broń do ręki zajętej."),
    p("udzwig", "Ekwipunek", "Pasek Udźwigu i legenda u Chomika; kolejność i gęstość sekcji przy ~600 przedmiotach; przewijanie przy edycji ilości", "Karta Chomika, Zasoby; Liczniki → klatki."),
    p("pipy", "Ekwipunek", "Pipy, plakietki, dymki (rozkład TT): nachodzenie, obcinanie, kontrast", "Najedź na TT, na plakietki broni."),
    p("gracz", "Ekwipunek", "Miejsce gracza: co gracz może przeciągnąć; czy przekaźnik MG jest natychmiastowy?", "Okna Gracza 1–3."),
    p("bn", "Karta BN", "Uzbrojony BN: pasek boczny 180 px, broń, reakcje", "Karta Gangusa."),
    p("opiekun", "Towarzysze", "Pasek towarzyszy z trzema (człowiek, pies, dron) — miejsce na karcie", "Karta Opiekuna."),
    p("pd-fuksy", "Karta", "PD, Fuksy, hotbar zdolności — czytelność i kliknięcia", "Karty typowych postaci klas."),
    p("hotbar-wlasnosc", "Karta", "Pasek MG i gracza ma własne makra; reset stanowiska lub utrata zdolności nie kasują skrótów drugiego użytkownika", "MG i Gracz 1 z Berserkiem; usuń zdolność u MG, potem resetuj stanowisko i sprawdź pasek gracza."),
    // M9 E3 — pionowy wycinek języka wizualnego (PLAN_m9_style.md §9; makieta: dev/visual/m9-components/index.html).
    p("m9-karta", "Wygląd M9", "Karta postaci w nowym języku: tło Field kit, imię z linią w kolorze klasy, tabliczki TT/Inicjatywa/Szybkość/Biegłość i Poziom zamiast tarcz i heksów, grafit bez złota. Czy karta wygląda jak NOE, a nie przemalowane 5e? Czy coś jest trudniej znaleźć niż wcześniej?", "Karty sześciu typowych postaci klas i Żołnierza; porównaj kolor linii pod imieniem między klasami."),
    p("m9-wiersze", "Wygląd M9", "Wiersze zdolności i ekwipunku: ikona 44 px bez ramki, znak kosztu (zielone koło A, pomarańczowy trójkąt B, gwiazda R, kwadrat I) przed nazwą, podpis „Zdolność klasowa / Sztuczka / profesji”. Czy da się szybko znaleźć wszystko, co kosztuje B?", "Zakładka Zdolności i Ekwipunek dowolnej postaci klasy; Chomik — długa lista."),
    p("m9-wyczerpane", "Wygląd M9", "Zdolność z 0 użyć: czerwony skos na ikonie i powód z terminem odnowienia pod nazwą — czytelne bez najeżdżania? Ikona nie jest przyciemniona.", "Użyj Kondychy (albo innej zdolności z użyciami) do zera; potem odpoczynek."),
    p("m9-ciemny", "Wygląd M9", "Wymuszony ciemny motyw: przełącz w ustawieniach Foundry motyw aplikacji na jasny — karty, okna przedmiotów, rzutów i karty czatu zostają ciemne, a pasek boczny, dziennik czatu i pasek makr są jak w Foundry.", "Ustawienia → Interfejs → motyw aplikacji: jasny; potem wróć do ciemnego."),
    p("m9-czat", "Wygląd M9", "Karty czatu ataku, obrażeń i testu: suma w ramce cyframi mono, przyciski Fuks/Forsuj/Motywacja jednym wyglądem; zwinięta karta zachowuje wynik i przyciski.", "Żołnierz: atak AK, obrażenia, test Medycyny; rozwiń i zwiń kartę."),
    p("kamizelka", "NOE / WKK", "Kamizelka taktyczna (+1 miejsce na pasie), Darmowe upuszczanie, wyłączenia pancerza wspomaganego (D23) — Hełm z plecaka Weterana na głowę", "Wariant NOE / WKK; Żołnierz i Weteran.", "WKK")
  ]
};
