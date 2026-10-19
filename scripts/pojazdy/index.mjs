/**
 * Neuroshima 5e — M4 Pojazdy (PLAN_m4_pojazdy). Rejestracja i `game.neuroshima.pojazdy`.
 *
 * Mapa plików:
 *  - `stan.mjs`        — co jest pojazdem, obrys, miejsca, kto jedzie (jedyne miejsce czytające flagi)
 *  - `geometria.mjs`   — czyste funkcje: obrys w czterech kierunkach, układ miejsc, obroty
 *  - `zeton.mjs`       — podklasa żetonu: siatka w obrysie naturalnym, jadący w animacji, ukrycie,
 *                        kropki, prześwietlenie; zapis po ruchu (MG)
 *  - `jadacy.mjs`      — wsiadanie, wysiadanie, przesiadka, wypadanie, dostęp z obecności (przez MG)
 *  - `okno-miejsc.mjs` — okno miejsc i przyciski HUD żetonu
 *  - `silnik.mjs`      — Uruchom/Zgaś, światła, kluczyki, na krótko (oznaczenia i blokady)
 *  - `efekty-silnika.mjs` — dym (ParticleGenerator), drgania (ticker), dźwięk — lokalnie z flagi `silnik`
 */

import { registerZetonPojazdu, instrukcjePoRuchu, przeswietlany, mozePrzeswietlic } from "./zeton.mjs";
import {
  registerJadacy, wsiadz, wysiadz, przesiadz, wypadnij, wysadzWszystkich, posadzGM, wysadzGM, synchronizujZaloge,
  zajeteMiejsca, kierowcaPojazdu, jedzie, odlegloscOdPojazdu, kosztPrzesiadki, opisMiejsca
} from "./jadacy.mjs";
import { registerOknoMiejsc, otworzMiejsca } from "./okno-miejsc.mjs";
import {
  registerSilnik, uruchom, zgas, przelaczSwiatla, utworzKluczyki, ustawNaKrotko, naKrotko, stanSilnika,
  warunkiUruchomienia, kluczykiPodReka, idKluczykow
} from "./silnik.mjs";
import { registerEfektySilnika, punktRury, zagraj, ZESTAWY } from "./efekty-silnika.mjs";
import { danePojazdu, jadacyPojazdu, jestPojazdem, miejscaPojazdu, miejsceOId, pojazdJadacego } from "./stan.mjs";
import * as geometria from "./geometria.mjs";

export function registerPojazdy() {
  registerZetonPojazdu();
  registerJadacy();
  registerOknoMiejsc();
  registerSilnik();
  registerEfektySilnika();
}

export const pojazdyApi = {
  geometria,
  danePojazdu, miejscaPojazdu, miejsceOId, jadacyPojazdu, pojazdJadacego, jestPojazdem,
  instrukcjePoRuchu, przeswietlany, mozePrzeswietlic,
  zajeteMiejsca, kierowcaPojazdu, jedzie, odlegloscOdPojazdu, kosztPrzesiadki, opisMiejsca,
  wsiadz, wysiadz, przesiadz, wypadnij, wysadzWszystkich, otworzMiejsca,
  uruchom, zgas, przelaczSwiatla, utworzKluczyki, ustawNaKrotko, naKrotko, stanSilnika, warunkiUruchomienia,
  kluczykiPodReka, idKluczykow, punktRury, zagraj, ZESTAWY,
  /** MG: posadzenie od razu, bez kosztów i kart (testy, Poligon). */
  async posadz(pojazd, jadacy, miejsce) {
    const zajete = zajeteMiejsca(pojazd);
    const ms = miejscaPojazdu(pojazd.actor);
    const cel = ms.find(m => m.id === miejsce) ?? ms.find(m => !zajete.has(m.id));
    if (!cel) throw new Error("Brak wolnego miejsca.");
    await posadzGM(pojazd, jadacy, cel);
    await synchronizujZaloge(pojazd);
    return cel.id;
  },
  wysadz: wysadzGM
};
