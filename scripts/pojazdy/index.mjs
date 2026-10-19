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
 *  - `awarie.mjs`      — Tabela awarii k20: wyzwalacze, [Zastosuj], zegary świata, tura kierowcy, karta obrażeń
 *  - `wrak.mjs`        — 0 PW: wrak, jadący wysadzeni, wybuch baku płonącego wraku
 *  - `naprawy.mjs`     — naprawa tymczasowa i fachowa (Robota M2), karoseria, Odbudowa
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
import {
  registerAwarie, AWARIE_POJAZDOW, efektyAwarii, aktywneAwariePojazdu, zaproponujAwarie, rzucAwarie, zastosujAwarie,
  kartaObrazen, zegaryPojazdu
} from "./awarie.mjs";
import { registerWrak, zrobWrak, wybuchBaku, cofnijWrak, jestWrakiem } from "./wrak.mjs";
import { registerNaprawy, naprawTymczasowo, naprawFachowo, naprawKaroserie, odbuduj, kosztNaprawyAwarii, kosztKaroserii, czesciZaKwote } from "./naprawy.mjs";
import { danePojazdu, jadacyPojazdu, jestPojazdem, miejscaPojazdu, miejsceOId, pojazdJadacego } from "./stan.mjs";
import * as geometria from "./geometria.mjs";

export function registerPojazdy() {
  registerZetonPojazdu();
  registerJadacy();
  registerOknoMiejsc();
  registerSilnik();
  registerEfektySilnika();
  registerAwarie();
  registerWrak();
  registerNaprawy();
}

export const pojazdyApi = {
  geometria,
  danePojazdu, miejscaPojazdu, miejsceOId, jadacyPojazdu, pojazdJadacego, jestPojazdem,
  instrukcjePoRuchu, przeswietlany, mozePrzeswietlic,
  zajeteMiejsca, kierowcaPojazdu, jedzie, odlegloscOdPojazdu, kosztPrzesiadki, opisMiejsca,
  wsiadz, wysiadz, przesiadz, wypadnij, wysadzWszystkich, otworzMiejsca,
  uruchom, zgas, przelaczSwiatla, utworzKluczyki, ustawNaKrotko, naKrotko, stanSilnika, warunkiUruchomienia,
  kluczykiPodReka, idKluczykow, punktRury, zagraj, ZESTAWY,
  AWARIE_POJAZDOW, efektyAwarii, aktywneAwariePojazdu, zaproponujAwarie, rzucAwarie, zastosujAwarie, kartaObrazen, zegaryPojazdu,
  zrobWrak, wybuchBaku, cofnijWrak, jestWrakiem,
  naprawTymczasowo, naprawFachowo, naprawKaroserie, odbuduj, kosztNaprawyAwarii, kosztKaroserii, czesciZaKwote,
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
