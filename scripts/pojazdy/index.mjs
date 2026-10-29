/**
 * Neuroshima 5e — M4 Pojazdy (PLAN_m4_pojazdy). Rejestracja i `game.neuroshima.pojazdy`.
 *
 * Mapa plików:
 *  - `stan.mjs`        — co jest pojazdem, obrys, miejsca, kto jedzie (jedyne miejsce czytające flagi), skala sceny
 *  - `geometria.mjs`   — czyste funkcje: obrys w czterech kierunkach, układ miejsc, obroty
 *  - `prezentacja.mjs` — otwarte/zakryte miejsca, rozpoznawanie jadących i lokalna kolejność grafiki
 *  - `grafika.mjs`     — dopasowanie wnętrza i metadanych warstw do własnego obrazu żetonu
 *  - `wieza.mjs`       — osobna grafika wieży: oś, transformacja kadłuba, widoczność i sprzątanie
 *  - `zeton.mjs`       — podklasa żetonu: siatka w obrysie naturalnym, jadący w animacji, ukrycie,
 *                        kropki, prześwietlenie; zapis po ruchu (MG)
 *  - `historia.mjs`    — historia rdzenia pomija pochodne zapisy miejsc i obrysu (jedno Ctrl+Z na ruch)
 *  - `jadacy.mjs`      — wsiadanie, wysiadanie, przesiadka, wypadanie, dostęp z obecności, pamięć obsady (MG)
 *  - `obsada.mjs`      — karta „Posadzić?”: zapamiętana załoga na nowej scenie (§4.15)
 *  - `schowek.mjs`     — Ctrl+X / Ctrl+V pojazdu z załogą między scenami (§4.16)
 *  - `okno-miejsc.mjs` — okno miejsc i przyciski HUD żetonu
 *  - `silnik.mjs`      — Uruchom/Zgaś, światła, kluczyki, na krótko (oznaczenia i blokady)
 *  - `efekty-silnika.mjs` — dym (ParticleGenerator), drgania (ticker), dźwięk — lokalnie z flagi `silnik`
 *  - `awarie.mjs`      — Tabela awarii k20: wyzwalacze, [Zastosuj], zegary świata, tura kierowcy, karta obrażeń
 *  - `wrak.mjs`        — 0 PW: wrak, jadący wysadzeni, wybuch baku płonącego wraku
 *  - `naprawy.mjs`     — naprawa tymczasowa i fachowa (Robota M2), karoseria, Odbudowa
 *  - `jazda.mjs`       — tura kierowcy, budżet jazdy, skręty, teren, potrącenie, bezruch, atak z pojazdu, osłona jadących
 *  - `paleta.mjs`      — paleta kierowcy: akcje cech, bieg wsteczny, Przerzutka; efekty, ST, Utrudnienia, Slalom (D41)
 *  - `bron.mjs`        — broń montowana: montaż (Robota / od ręki), zdjęcie, broń za strzelcem
 *  - `katalog.mjs`     — aktor z paczki `pojazdy` (wynik produkcji, Poligon, MG)
 *  - `karta.mjs`       — karta pojazdu: zakładki Pojazd, Załoga, Uzbrojenie, Awarie (podklasa stockowej)
 *  - `wojownik.mjs`    — Wojownik autostrady: Rajdowiec, Konwojent, Taranowanie, Kaskader, Pancerna fura
 */

import { registerZetonPojazdu, instrukcjePoRuchu, przeswietlany, mozePrzeswietlic } from "./zeton.mjs";
import {
  registerJadacy, wsiadz, wysiadz, przesiadz, wypadnij, wysadzWszystkich, posadzGM, wysadzGM, synchronizujZaloge,
  zajeteMiejsca, kierowcaPojazdu, jedzie, odlegloscOdPojazdu, kosztPrzesiadki, opisMiejsca, pamiecPoUzgodnieniu
} from "./jadacy.mjs";
import { registerOknoMiejsc, otworzMiejsca } from "./okno-miejsc.mjs";
import { registerObsada, brakujacaObsada, posadzObsade } from "./obsada.mjs";
import { registerSchowek, czekaNaWklejenie } from "./schowek.mjs";
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
import {
  danePojazdu, jadacyPojazdu, jestPojazdem, kratkaPojazdu, miejscaPojazdu, miejsceOId, obsadaPojazdu, pojazdJadacego,
  rozmiarMiejsca, skalaPojazdu, trybSceny, wymiaryZetonu
} from "./stan.mjs";
import { registerJazda, szybkoscPojazdu, budzetJazdy, skretyNaDrodze, potraceniNaDrodze, akrobatykaPrzedAtakiem } from "./jazda.mjs";
import { registerPaleta, otworzPalete, uzyjPalety, ustawPrzerzutke, paletaPojazdu, pozycjePojazdu, budzetPalety, POZYCJE } from "./paleta.mjs";
import { registerBron, bronStanowisk, zamontujOdReki, zamontujRobota, zdejmij, synchronizujBron } from "./bron.mjs";
import { registerKatalog, utworzZKatalogu } from "./katalog.mjs";
import { registerKarta, zetonPojazdu } from "./karta.mjs";
import { registerWojownik, maZdolnosc, trikKaskadera, synchronizujOC } from "./wojownik.mjs";
import * as geometria from "./geometria.mjs";

/**
 * D20: wspólny stan (paliwo, PW, awarie, pamięć obsady) ma tylko aktor powiązany, a karta drużyny czyta paliwo z
 * aktora świata (`primaryVehicle`). Pojazd drużyny z niepowiązanym prototypem albo żetonem — ostrzeżenie dla MG.
 */
function niepowiazanyPojazdDruzyny(pojazd) {
  if (!jestPojazdem(pojazd)) return false;
  return !pojazd.prototypeToken?.actorLink
    || game.scenes.some(s => s.tokens.some(t => t.actorId === pojazd.id && !t.actorLink));
}

function ostrzezNiepowiazane(pojazd = null) {
  if (!game.user.isActiveGM) return;
  for (const grupa of game.actors.filter(a => a.type === "group")) {
    const v = grupa.system?.primaryVehicle;
    if (!v || (pojazd && v !== pojazd) || !niepowiazanyPojazdDruzyny(v)) continue;
    ui.notifications.warn(`${grupa.name}: pojazd drużyny ${v.name} ma niepowiązany żeton — paliwo i szkody rozjadą się `
      + "między mapą a kartą drużyny. Zaznacz „Link Actor Data” w prototypie i na żetonach.");
  }
}

function registerOstrzezenia() {
  Hooks.once("ready", () => ostrzezNiepowiazane());
  Hooks.on("createToken", doc => { if (!doc.actorLink && jestPojazdem(doc.actor)) ostrzezNiepowiazane(game.actors.get(doc.actorId)); });
}

export function registerPojazdy() {
  registerOstrzezenia();
  registerZetonPojazdu();
  registerJadacy();
  registerObsada();
  registerSchowek();
  registerOknoMiejsc();
  registerSilnik();
  registerEfektySilnika();
  registerAwarie();
  registerWrak();
  registerNaprawy();
  registerJazda();
  registerPaleta();
  registerBron();
  registerKatalog();
  registerKarta();
  registerWojownik();
}

export const pojazdyApi = {
  geometria,
  danePojazdu, miejscaPojazdu, miejsceOId, jadacyPojazdu, pojazdJadacego, jestPojazdem,
  kratkaPojazdu, skalaPojazdu, trybSceny, wymiaryZetonu, rozmiarMiejsca, niepowiazanyPojazdDruzyny,
  obsadaPojazdu, pamiecPoUzgodnieniu, brakujacaObsada, posadzObsade, czekaNaWklejenie,
  instrukcjePoRuchu, przeswietlany, mozePrzeswietlic,
  zajeteMiejsca, kierowcaPojazdu, jedzie, odlegloscOdPojazdu, kosztPrzesiadki, opisMiejsca,
  wsiadz, wysiadz, przesiadz, wypadnij, wysadzWszystkich, otworzMiejsca,
  uruchom, zgas, przelaczSwiatla, utworzKluczyki, ustawNaKrotko, naKrotko, stanSilnika, warunkiUruchomienia,
  kluczykiPodReka, idKluczykow, punktRury, zagraj, ZESTAWY,
  AWARIE_POJAZDOW, efektyAwarii, aktywneAwariePojazdu, zaproponujAwarie, rzucAwarie, zastosujAwarie, kartaObrazen, zegaryPojazdu,
  zrobWrak, wybuchBaku, cofnijWrak, jestWrakiem,
  bronStanowisk, zamontujOdReki, zamontujRobota, zdejmij, synchronizujBron, utworzZKatalogu, zetonPojazdu,
  maZdolnosc, trikKaskadera, synchronizujOC,
  szybkoscPojazdu, budzetJazdy, skretyNaDrodze, potraceniNaDrodze, akrobatykaPrzedAtakiem,
  paleta: { otworz: otworzPalete, uzyj: uzyjPalety, przerzutka: ustawPrzerzutke, stan: paletaPojazdu, pozycje: pozycjePojazdu, budzet: budzetPalety, POZYCJE },
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
