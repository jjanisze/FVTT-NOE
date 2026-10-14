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
    p("lalka-dok", "Lalka", "Dokowanie panelu lalki przy 1366×768, 1920×1080, 2560×1440; dwie karty otwarte; mała i duża skala interfejsu; motyw jasny i ciemny", "Wariant → wygląd; zmieniaj rozmiar okna przeglądarki."),
    p("przeciaganie", "Lalka", "Przeciąganie plecak ↔ lalka ↔ pas ↔ ziemia — czy animacja wyparcia czyta się jak „to poszło tam”?", "Żołnierz w oporządzeniu; przeciągnij broń do ręki zajętej."),
    p("udzwig", "Ekwipunek", "Pasek Udźwigu i legenda u Chomika; kolejność i gęstość sekcji przy ~600 przedmiotach; przewijanie przy edycji ilości", "Karta Chomika, Zasoby; Liczniki → klatki."),
    p("pipy", "Ekwipunek", "Pipy, plakietki, dymki (rozkład TT): nachodzenie, obcinanie, kontrast", "Najedź na TT, na plakietki broni."),
    p("gracz", "Ekwipunek", "Miejsce gracza: co gracz może przeciągnąć; czy przekaźnik MG jest natychmiastowy?", "Okna Gracza 1–3."),
    p("bn", "Karta BN", "Uzbrojony BN: pasek boczny 180 px, broń, reakcje", "Karta Gangusa."),
    p("opiekun", "Towarzysze", "Pasek towarzyszy z trzema (człowiek, pies, dron) — miejsce na karcie", "Karta Opiekuna."),
    p("pd-fuksy", "Karta", "PD, Fuksy, hotbar zdolności — czytelność i kliknięcia", "Karty typowych postaci klas."),
    p("hotbar-wlasnosc", "Karta", "Pasek MG i gracza ma własne makra; reset stanowiska lub utrata zdolności nie kasują skrótów drugiego użytkownika", "MG i Gracz 1 z Berserkiem; usuń zdolność u MG, potem resetuj stanowisko i sprawdź pasek gracza."),
    p("kamizelka", "NOE / WKK", "Kamizelka taktyczna (+1 miejsce na pasie), Darmowe upuszczanie, wyłączenia pancerza wspomaganego (D23) — Hełm z plecaka Weterana na głowę", "Wariant NOE / WKK; Żołnierz i Weteran.", "WKK")
  ]
};
