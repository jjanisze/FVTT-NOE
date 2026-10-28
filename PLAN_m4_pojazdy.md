# PLAN — M4: Pojazdy (część 1) i pościgi (część 2)

> Status: **część 1 ZROBIONA** (E0–E8, noc 2026-10-19 — do weta MG, §10); **część 1b ZROBIONA** (E9–E11, pojazdy
> między scenami, §4.14–§4.16, 2026-10-19); **część 2: P1–P4 ZROBIONE** (złożona droga, metryka, jadący, serie i
> obszary, §6.2), **P5 — runda pytań** (§10, 11 pytań), P6 — stanowisko Poligonu przebudowane, bramka w §11;
> **część 3 — wierzchowce, PROJEKT** (§6.3, przeniesione z M6 2026-10-25).
> Decyzje MG D1–D31 (§1). Rozmiar: **XL** (część 1: L, część 1b: M, część 2: L — plansza od nowa).
> Wywołanie: `PLAN_beta.md` §0, krok 4 (przesunięty przed M6, MG 2026-10-18).
> Zastępuje §4–§7 `PLAN_poscigi.md` (karta pojazdu, manewry, awarie), a od 2026-10-19 także geometrię planszy
> (tamten §2.1, §2.3–§2.6 i D2) — §6.2 tutaj. Grafika planszy (motywy, pustynia, kołysanie — tamten §2.2) zostaje.
>
> RAW = `Neuro 5e/Podrecznik/NOE/` (październik), `s. N` = strona drukowana: pojazdy s. 260–265, pościgi s. 266–268,
> Wojownik autostrady s. 88–89. Warstwy: **NOE** (RAW), **RAI**, **WKK** — `scripts/wkk/README.md`. Repozytorium
> jest publiczne: parafrazy i numery stron, bez cytatów i bez fabuły.
>
> **Zasady tego planu:** oznaczać, nie blokować (MG cofa, co się nie wydarzyło); pojazd to samobieżna skrzynia, nie
> istota — działa w turze kierowcy i nie ma własnej lojalności; to, co da się policzyć, liczy moduł po kliknięciu MG,
> resztę pisze na karcie.

---

## 0. W skrócie

| Część | Co dostaje stół | Gdzie |
|---|---|---|
| **1. Pojazdy** | katalog 14 pojazdów (paczka), karta pojazdu, wsiadanie na miejsca z żetonami jadącymi razem z pojazdem, prześwietlenie i kropki, silnik (uruchom/zgaś, dym, drgania, dźwięk), jazda w turze kierowcy, skręty, potrącenia, awarie k20 ze skutkami i naprawami, Wojownik autostrady, stanowisko Poligonu | §4–§6 |
| **1b. Między scenami** | jedna reguła skali (obrys w metrach, znacznik na mapach w km), pamięć obsady i karta „Posadzić?”, Ctrl+X / Ctrl+V z załogą | §4.14–§4.16 |
| **2. Pościgi** | plansza od nowa — złożona droga (pojazdy w prawdziwej skali, tor = 36 m), metryka drogi dla zasięgów i obszarów, serie z celowaniem, jadący na planszy; paleta manewrów, Test Pościgu, komplikacje k20, ataki, wypadanie, koniec pościgu | §6.2 |
| **3. Wierzchowce** (z M6, 2026-10-25) | nośnik = pojazd albo istota: koń wiezie widocznego jeźdźca tym samym kodem co pickup; Inicjatywa jeźdźca, spadanie z siodła, atak z grzbietu | §6.3 |

```mermaid
flowchart LR
  E0[E0 Próba: obrys i jadący] --> E1[E1 Katalog i dane]
  E1 --> E2[E2 Karta pojazdu]
  E1 --> E3[E3 Wsiadanie, miejsca,<br/>prześwietlenie]
  E3 --> E4[E4 Silnik]
  E3 --> E5[E5 Jazda w walce,<br/>potrącenia]
  E2 --> E6[E6 Awarie i naprawy]
  E4 --> E6
  E5 --> E7[E7 Wojownik autostrady]
  E6 --> E8[E8 Grafika, Poligon, testy]
  E7 --> E8
  E8 --> E9[E9 Skala sceny,<br/>obrys w metrach]
  E9 --> E10[E10 Pamięć obsady]
  E10 --> E11[E11 Ctrl+X / Ctrl+V<br/>z załogą]
  E9 --> P1[P1 Plansza:<br/>złożona droga]
  P1 --> P2[P2 Metryka drogi]
  P2 --> P3[P3 Jadący na planszy]
  E11 --> P3
  P2 --> P4[P4 Serie i obszary]
  P3 --> P5[P5 Mechanika pościgu]
  P4 --> P5
  P5 --> P6[P6 Poligon, testy]
```

---

## 1. Decyzje MG (2026-10-18 – 2026-10-19)

| # | Decyzja |
|---|---|
| D1 | **Podział.** Część 1 — pojazdy poza pościgiem (s. 260–265) z awariami i naprawami, bo RAW wyzwala awarie także poza pościgiem; komplikacje 1–3 pościgu losują z tej samej tabeli. Część 2 — tylko tryb pościgu (s. 266–268). |
| D2 | **Jadący na mapie (wariant b).** Żetony postaci zostają na mapie, zmniejszone do miejsca i poza siatką, i jadą z pojazdem: pozycja, obrót (kierowca patrzący do przodu dalej patrzy do przodu po obrocie o 180°) i drgania silnika. |
| D3 | **Widok (doprecyzowanie D32, 2026-10-25).** Zakryte miejsca ukrywają jadących i pokazują kropki. Prześwietlenie mają MG, właściciele i jadący; sparowana grafika pokazuje wnętrze, pozostałe nadwozia przygasają. Otwarte miejsca ujawniają pełny żeton zamiast kropki. Układ miejsc może być dopasowany do grafiki. |
| D4 | **Wybór miejsca** w małym oknie z obrazem pojazdu z góry i klikalnymi miejscami; to samo okno dla „Przesiądź się”. |
| D5 | **Awarie: [Zastosuj] stosuje skutki mierzalne** (Szybkość, TT, pożar, wyciek paliwa, dym, zegary); fabularne — tekst na karcie. Zegary: **2k10 rund** wg RAW (w walce rundy, poza walką zegar świata, runda = 6 s). Płonący pojazd: **2k6 od ognia** na końcu tury kierowcy, jak jadący. |
| D6 | **10 pojazdów bez statbloku: improwizujemy.** Interpolacja z czterech statbloków jako podstawa plus własne, tanie i pewne cechy (§5), oznaczone jako RAI/WKK. |
| D7 | **Dwie wolne ręce: oznaczane.** MG mówi „nie, to się nie stało”, gracz robi **Zgaś** (bez kosztu) i wracamy do punktu wyjścia. Uruchomienie nie zużywa paliwa. Akcji nie liczymy ściśle właśnie po to, żeby dało się cofać pomyłki. |
| D8 | **Efekty silnika:** dym i drgania dla pojazdów silnikowych, trzy zestawy (benzyna, diesel, motocykl), ustawienie klienta wyłączające drgania. Ten sam efekt później dla maszyn Molocha. **Dźwięk: tylko uruchomienie i zgaszenie.** |
| D9 | **Tura pojazdu = tura kierowcy** (RAW: inicjatywa kierowcy). Pojazd nie wchodzi do trackera walki. |
| D10 | **Skręty wykrywane z ruchu:** zmiana kierunku ≥ 90° w turze kierowcy → karta MG z Testem MDR (Pojazdy). |
| D11 | **Dostęp i własność — dwie warstwy.** Własność stała (zwykła własność Foundry, ustawia MG) — dostęp także spoza pojazdu. Dostęp z obecności (postać siedzi w środku) — przesuwanie żetonu, karta, uruchamianie **i ładownia** pojazdu, w którym siedzisz (MG, 2026-10-19: upraszczamy). Bez stanów „kradziony” i „sporny”. (§4.4) |
| D12 | **Kluczyki i odpalanie na krótko (WKK).** Kluczyki pasują do jednego pojazdu (nie do innych tego typu; kopia żetonu tego samego pojazdu na innej scenie — pasują). MG tworzy kluczyki z karty pojazdu i ustawia stan: na kluczyk / odpalony na krótko. Na krótko wymaga narzędzi małego mechanika **albo** elektronika, ST wg klasy pojazdu; porażka — alarm, duża porażka — awaria 17, a gdzie nie ma awarii — obrażenia pojazdu; sukces trwale przełącza pojazd na „odpalony na krótko”. (§4.5) |
| D13 | **Obrys:** najpierw próba E0 z prostokątami; jeśli zawiedzie — kwadraty wg rozmiaru dnd5e. (§4.3) |
| D14 | **Kropki to uchwyty celowania:** wycelowanie w kropkę celuje w (dalej ukrytego) jadącego; karta ataku poda jego imię — to akceptowalne. (§4.2) |
| D15 | **Przesiądź się:** odległość między miejscami ×2 bez testu albo ×1 z ZRC (Akrobatyka) ST 10 (tylko w jadącym pojeździe; porażka o 5+ — Powalenie); stojący pojazd zawsze ×2. **WKK:** w jadącym pojeździe zmiana rzędu (przód↔tył, kabina↔paka) zawsze wymaga Akrobatyki. (§4.10) |
| D16 | **Broń montowana:** gdy strzelec siedzi na stanowisku, broń przechodzi do niego (flaga „zamontowana”: bez wagi, ręce na broni) i wraca do pojazdu, gdy opuści stanowisko — magazynki, tryby ognia i zacięcia działają bez zmian. **Montaż to Robota produkcji** zakładana przyciskiem MG na karcie pojazdu; moduł liczy godziny, surowce i test (MG, 2026-10-19). Browning na GMT400 leży dziś w bagażniku, nie jest zamontowany. (§4.11) |
| D17 | **Pojazd przy 0 PW:** wrak (grafika wraku, jadący wysadzeni obok, bez uruchamiania i ruchu); płonący (awaria 1) z paliwem w baku — odliczanie k4 rund i wybuch baku (ogień wg rozmiaru, RO ZRC — połowa). (§4.12) |
| D18 | **Światła:** przełącznik na pojeździe silnikowym (kierowca i MG), stożek do przodu; działają też przy zgaszonym silniku; awaria 17 je gasi. (§4.5) |
| D19 | **Naprawy, PW i wrak — improwizacja** (MG, 2026-10-19: „improwizuj”). Wzór: naprawa drona z M3 i tabela Naprawiania s. 146; liczby w §4.9, do weta przy E6. |

**Runda 5 (2026-10-19, po nocy) — pojazdy między scenami i plansza pościgu:**

| # | Decyzja |
|---|---|
| D20 | **Jeden aktor, wiele widoków.** Wspólny stan (PW, awarie, zegary, silnik, paliwo, ładownia, broń, wrak, pamięć obsady) ma pojazd o **powiązanym** aktorze — tak jest GMT400. Pojazdy z paczki są niepowiązane (bandyci: każdy żeton to osobna kopia, jak Hammer Posterunku). Pojazd drużyny musi być powiązany: karta drużyny czyta paliwo z aktora świata (`primaryVehicle`). |
| D21 | **Jedna reguła skali.** Obrys w metrach: rozmiar żetonu = metry ÷ metry na kratkę sceny — skala prawdziwa na każdej scenie taktycznej (także siatka 3 m) i na planszy pościgu. Gdy 1,5 m wychodzi za małe do narysowania (mapy w km) — pojazd jest zwykłym znacznikiem, bez miejsc. Na mapie podróży pojazd reprezentuje żeton drużyny (paliwo z `primaryVehicle`); znacznik pojazdu to ozdoba. (§4.14) |
| D22 | **Ctrl+X / Ctrl+V przenosi pojazd z załogą** między scenami — rdzeń 14 wycina między scenami z zachowaniem id. Bez przycisku z wyborem sceny. (§4.16) |
| D23 | **Pamięć obsady i karta „Posadzić?”** — pojazd pamięta, kto siedzi na którym miejscu; gdy pojazd albo zapamiętana postać pojawia się na scenie, MG dostaje kartę [Posadź] / [Pomiń]. Nic nie sadza się samo. (§4.15) |
| D24 | **Plansza pościgu — złożona droga.** Pojazdy w prawdziwej skali (70 px na 1,5 m, jak mapy kampanii); tor 280 px rysowany jako 6 m, mierzony jako 36 m. Między pojazdami w osi x liczą się znaczniki, w osi y — prawdziwe metry; wewnątrz pojazdu — prawdziwe metry w obu osiach („wyspy”). Plansza ×1,4. Przepisanie pościgów od nowa dozwolone. Odrzucone: osobna skala pionków (pojazdy nie w skali) i droga w prawdziwej skali (tor 1680 px, plansza ~23 500 px — wbrew abstrakcji znaczników RAW, ciągłe przybliżanie). (§6.2) |
| D25 | **Twardo w torach.** W pasie gry środek pojazdu zawsze na środku toru — bez Shift, bez połówek; to, co wyląduje obok (makro, cofnięcie), MG dociąga po ruchu. Kolejność w znaczniku — rzędy (y wolne, w metrach). Nakładania się żetonów pilnuje MG; pojazd dłuższy niż tor zachodzi na obrazie na sąsiedni, plakietka pokazuje jego znacznik. Strefa swobodna zostaje swobodna. |
| D26 | **Jadący jadą na planszę jako żetony** (odwraca D2 `PLAN_poscigi.md`): miejsca, kropki, prześwietlenie i przesiadka z części 1; ataki na kierowcę i pasażerów idą zwykłą drogą broni. |
| D27 | **Odległość na planszy liczy tylko metryka drogi** — zasięgi, cechy zależne od zasięgu, linijka (znów 36 m na tor), rzut, krawędzie, obszary; nigdy piksele. Strażnik w Quench. |
| D28 | **Serie (Długa, Miażdżąca) na planszy się celuje, nie przeciąga.** Podgląd na żywo, trafieni liczeni na drodze. Seria trafia **wielu jadących w jednym pojeździe i wiele pojazdów, jeśli ustawią się w linii** — jadących i same pojazdy (RAW wg MG). Karta z listą i [Zaznacz trafionych]. (§6.2.4) |
| D29 | **Ogień zaporowy na planszy przykleja się do pojazdu**, na którym go położono — łapie jego jadących także przy przesiadce. |
| D30 | **Rzeczy na drodze** (kolczatka, flara, mina) — wg znacznika, wyzwalane wjazdem pojazdu w ten znacznik (wynika z D25). |
| D31 | **Obraz między pojazdami nie musi zgadzać się z geometrią:** smuga może iść w bok albo do tyłu, obowiązuje lista trafionych. Rysunek wybuchu przycięty do pojazdów, których dosięga — **po pierwszej grze** (§10). |
| D32 | **Prezentacja miejsc, MG 2026-10-25.** Wspólny model rozdziela otwarte/zakryte miejsce i kolejność grafiki. Właz Hammera: pełny żeton zawsze widoczny zgodnie ze zwykłą widocznością Foundry, **nad dachem**, bez kropki. Kabina nadal zakryta. Grafiki Hammera bez zmian; rysowanie pod osobnym dachem odłożone. To fundament W1, bez uruchamiania całej części 3. |
| D33 | **Obsługa wieżyczek po becie, MG 2026-10-26.** Rozbudowane zasady stanowisk i wieżyczek odkładamy. Wstępne założenie: użycie broni na odpowiednim stanowisku ma niwelować wymogi/kary właściwości **Ciężka** oraz **Utrudnienie za atak z jadącego pojazdu**. To kierunek do doprecyzowania po becie, nie bieżąca zmiana mechaniki. |

---

## 2. RAW w pigułce

**Część 1 (s. 260–265):**
- *Wsiadanie jako kierowca* — pojazd ≤ 1,5 m, połowa Szybkości (w dół); potem reszta ruchu przepada, a postać jedzie
  Szybkością pojazdu. Silnik wymaga **akcji** uruchomienia; pojazd mięśniowy — ruchu kierowcy. **Kierownica = dwie
  wolne ręce.**
- *Wsiadanie jako pasażer* — bez dodatkowego kosztu; drzwi, fotel, okno — połowa Szybkości.
- *Kierowanie* — pojazdy specjalne (buldożer, czołg, dźwig): MG może zażądać Testu MDR (Pojazdy). Przyspieszenie
  daje dodatkowy ruch. Skręt o 90°: Szybkość ×½, chyba że MDR (Pojazdy) ST 10. Wsteczny: ×½. Obrót o 180° w ruchu:
  ST 20, porażka — awaria Przewrócenie.
- *Wypadanie* — 9 (3k6) obuchowych i Powalenie. *Trudny teren* — Szybkość ×½ i co turę test o ST MG, porażka —
  Szybkość 0; pojazdy terenowe: ×½ bez testów.
- *Atakowanie w jadącym pojeździe* — przed atakiem ZRC (Akrobatyka) ST 10, porażka — Utrudnienie w Testach Ataku do
  następnej tury.
- *Tabela statystyk* (s. 262), statbloki Autobusu, Roweru, Motocykla, Osobówki (s. 262–264): Cofanie, Potrącenie,
  Skok, Akrobacja, Przerzutka [B], Szósty bieg [B], Gaz do dechy [B], Slalom [R].
- *Awarie pojazdów silnikowych* (s. 264–265): k20 przy obrażeniach ≥ Próg awarii albo porażce kierowcy w teście o
  więcej niż 5; naprawa tymczasowa w jeździe (akcja + test, 1 minuta) i fachowa na postoju (narzędzia małego
  mechanika, biegłość, części; Naprawianie s. 146).
- *Ruch wewnątrz jadącego pojazdu* (s. 266, pkt 3 — w rozdziale pościgów, ale opisuje każdy jadący pojazd): z połową
  Szybkości; „normalny ruch” — ZRC (Akrobatyka) ST 10, porażka o 5+ — Powalenie.

**Część 2 (s. 266–268):** znaczniki co 36 m, inicjatywa (przesunięcie tury za kierowcę), Test Pościgu (ST 5/10/15,
nat. 20 — znacznik więcej, nat. 1 — dwie komplikacje), ataki (osłona ½ = TT +2, atak na kierowcę), wypadanie (−3
znaczniki na rundę), koniec pościgu, komplikacje k20, manewry: Gazu!, Hample, Obrót 180°, Ostrożna jazda,
Stuknięcie, Zajechanie.

**Wojownik autostrady** (Twardziel, s. 88–89): Drzwi w drzwi (Rajdowiec, Konwojent, Taranowanie), Kaskader (schody,
skoki, dwa koła), Pancerna fura (OC, AC [B] — uruchomienie i zatrzymanie w akcji bonusowej). Biegłości: Pojazdy +
narzędzia małego mechanika (M6).

---

## 3. Co już mamy

| Element | Stan |
|---|---|
| Dane | `config/vehicles-data.mjs`: 14 podwozi z s. 262, rozbieżności RAW opisane; ST środowisk i stałe pościgu |
| Aktorzy | GMT400 (podwozie Hammer), Hammer Posterunku |
| Karta | stockowa `VehicleActorSheet` dnd5e + nasze wstawki: pasek paliwa (`party-travel.mjs`), przełącznik portret/żeton (`vehicle-portrait.mjs`). dnd5e 6.0.6 zmienił w karcie pojazdu 27 linii |
| Model dnd5e | `crew`/`passengers` = listy UUID aktorów, `hp.dt` = Próg obrażeń, `hp.mt` = Próg awarii, ładownia, rozmiar, przedmioty montowane (`mountable`: własne TT/PW — Browning na GMT400). Do ukrycia: stanowiska i progi akcji (statki 2014), stępka/szerokość, jakość, tempa podróży dnd5e |
| Awarie | `combat/maszyny.mjs` — rzut, [Zastosuj] dla MG, aktywne awarie, naprawa — dla maszyn Bestiariusza i dronów; wzorzec do ponownego użycia |
| Wokół | Naprawa (M2, `production/naprawa.mjs`), lalka (wolne ręce), przedmioty na ziemi (`ground-items.mjs`), Podpalenie (`combat/podpalenie.mjs`), osłona w oknie ataku (`combat/cover.mjs`), okoliczności ataku, trudny teren (`scenes/difficult-terrain-hint.mjs`), FOV 220° z obrotu żetonu (`config/fov.mjs`), Sequencer + JB2A |
| Pościg | plansza (Nevada, Ruiny Ameryki), przyciąganie, recentrowanie, interfejs MG; stanowiska Poligonu `poscig` i `droga` — geometria do przepisania (D24, §6.2) |

---

## 4. Architektura części 1

### 4.1 Jadący — żetony, które jadą z pojazdem (D2)

**Diagnoza 2026-10-26 — skala do poprawy.** Dotychczasowy rozmiar miejsca 0,5 pomniejsza także
grafikę jadącego o połowę, dodatkowo do ustawionych 85%. Potwierdzone na 14/14 podwozi.
Rozmiar miejsca trzeba oddzielić od prezentacji postaci; sama zmiana stałej przesunęłaby także
domyślne kotwice. [Pomiary i zakres poprawki](dev/audits/vehicle-occupant-scale-2026-10-26.md).
Poniżej opis dotychczasowego zachowania; w tej diagnozie nie zmieniano mechanizmu.

Rdzeń 14 ma już ten wzorzec dla Regionów przypiętych do żetonu: zmiany Regionu idą w tej samej operacji co ruch
żetonu, a w animacji Region odświeża się co klatkę (`client/documents/token.mjs` — `#computeAttachedRegionUpdates`,
`client/canvas/placeables/token.mjs` — `#animateAttachments`). Jadący robią to samo — **bez przepinania obiektów
PIXI**:

- **Stan:** flaga na żetonie jadącego `jazda = {pojazd: tokenId, miejsce, obrot}` (`obrot` — własny obrót względem
  pojazdu) i lista UUID aktorów w `crew`/`passengers` pojazdu (nośnik dnd5e, z którego korzysta też pościg).
- **Klatka:** w animacji pojazdu rdzeń wpisuje do dokumentu pośrednie `x/y/rotation` i woła wywołania co klatkę
  (`context.onAnimate`). Każdy klient liczy pozycję miejsca obróconą o kąt pojazdu i ustawia jadącego — z wizją,
  więc FOV 220° obraca się razem z pojazdem. Obrót jadącego = obrót pojazdu + `obrot`.
- **Koniec ruchu:** MG zapisuje końcowe pozycje jadących jedną operacją, bez animacji.
- **Drgania:** jeden ticker modułu dodaje to samo przesunięcie do siatki pojazdu i jego jadących — drżą razem.
- **Rozmiar:** w czasie jazdy żeton jadącego dostaje rozmiar miejsca (np. 0,5 kratki), oryginalny zapisany we fladze;
  wysiadanie, usunięcie pojazdu i przycisk MG „Wysadź wszystkich” go przywracają.
- **Wizja:** rdzeń nie wiąże wizji z widocznością żetonu (`Token#_isVisionSource` nie czyta `isVisible`), więc ukryty
  jadący dalej widzi — gracz patrzy z wnętrza pojazdu.

### 4.2 Prezentacja miejsc, kropki i prześwietlenie (D3, D32)

- **Ukrycie lokalne**, nie `hidden` dokumentu (ukryty dokument odebrałby graczowi własny żeton): nadpisanie
  `Token#isVisible` dla zakrytych miejsc — `false`, chyba że klient prześwietla pojazd albo kontroluje jadącego.
  Otwarte miejsce przechodzi zwykłą widoczność Foundry: mgła, ściany i ręczne `hidden` nadal obowiązują.
- **Kropki:** nakładka pojazdu, jedna kropka na postać na zakrytym miejscu (bez tożsamości), widoczna dla tych, którzy
  widzą pojazd. **Kropka jest uchwytem celowania (D14):** wycelowanie w nią ustawia cel na ukrytym jeźdźcu.
- **Prześwietlenie:** po najechaniu na pojazd — nadwozie do ok. 35% krycia, jadący widoczni i klikalni. Mają je MG,
  właściciele pojazdu i gracze z postacią w środku. Pozostali widzą kropki.
- **Zaznaczanie pojazdu:** ukryci jadący nie przyjmują kliknięć, więc klik w pojazd zaznacza pojazd; w
  prześwietleniu klik w jadącego zaznacza jadącego, Alt+klik przechodzi do pojazdu.

**Model D32.** Strefa może zawierać `prezentacja: { widocznosc: "otwarta", warstwa: "nad" }`;
`geometria.mjs` przenosi te dane na miejsca. Brak ustawienia oznacza `zakryta` i `nad`.
`prezentacja.mjs` rozstrzyga wspólnie widoczność, rozpoznawanie jadącego i kolejność rysowania.
`warstwa` jest względna wobec całej grafiki nośnika (`nad`/`pod`); osobny dach i maska włazu nie są wdrażane.
Hammer używa wyłącznie `nad`: pełny żeton strzelca pozostaje nad zamkniętym nadwoziem oraz odsłoniętym wnętrzem.
Względny porządek siatek liczony jest lokalnie po odświeżeniu rdzenia; nie zapisuje zmian sortowania przy najazdach.
Otwarte miejsce nie nadaje własności, dostępu do ładowni ani prawa prześwietlenia reszty kabiny. Okno Miejsca
i lista Załogi mogą rozpoznać widoczną postać na otwartym miejscu, pozostawiając pozostałe miejsca jako „zajęte”.
Prezentacja jest niezależna od `stanowisko` i `oslona`; właz zachowuje osłonę ¾ oraz mechanikę broni.
Istniejące własne strefy wymagają jawnego dodania prezentacji; podgląd Hammera w Poligonie aktualizujemy punktowo.

### 4.3 Obrys pojazdu (D13 — próba E0)

Rdzeń liczy kształt, pole kliknięcia, zajmowane kratki i odległości z `width`/`height` **bez obrotu**
(`Token#getShape`). Prostokątny samochód obrócony o 90° wyglądałby poziomo, a zajmował pionowo. Propozycja:
**prostokątny obrys w czterech kierunkach** — gdy kierunek jazdy przekracza 45°, moduł zamienia `width`↔`height`
(środek bez zmian), a obraz obraca się w środku. Kratki, odległości, sąsiedztwo i ataki okazyjne liczą się wtedy jak
dla każdej dużej istoty, tylko nieskwadratowej; skosy przybliża najbliższy kierunek. Obrót w miejscu nie jest
darmowy: pojazd obraca się w ruchu (D10), a nowe kratki po zamianie obrysu sprawdzają potrącenie (§4.7).
Wariant zapasowy, jeśli próba E0 się nie uda: kwadratowy obrys wg rozmiaru dnd5e.

### 4.4 Dostęp i własność (D11)

Pojazd nie ma lojalności — to samobieżna skrzynia. Dwie warstwy:
1. **Własność stała** — zwykła własność Foundry, ustawiana przez MG; pełny dostęp, z ładownią.
2. **Dostęp z obecności** — gracz, którego postać siedzi w środku, ma na czas jazdy prawa właściciela (przesuwa
   żeton, widzi kartę i ładownię, uruchamia, przesiada się). Wysiadka przywraca poprzednie prawa (zapis we fladze,
   zapis przez MG).

Cudzy pojazd z graczem w środku to po prostu warstwa 2; MG robi z niego własny, nadając własność. Upuszczone w
pojeździe (WKK) ląduje w ładowni, którą jadący i tak widzi.

### 4.5 Silnik (D7, D8)

- **Uruchom** (akcja; Pancerna fura — akcja bonusowa) i **Zgaś** (bez kosztu) z miejsca kierowcy. Oznaczenia: brak
  dwóch wolnych rąk (lalka), brak paliwa, awaria 15 (silnik) i 17 (zapłon), brak kluczyków. Uruchomienie nie zużywa
  paliwa.
- **Kluczyki (D12, WKK):** przedmiot z identyfikatorem pojazdu. Identyfikator żyje na aktorze pojazdu (żeton
  niepowiązany — w jego delcie), nadawany przy utworzeniu, więc duplikat aktora dostaje nowy, a skopiowany żeton
  tego samego pojazdu zachowuje stary. MG: **Utwórz kluczyki** i przełącznik **na kluczyk / odpalony na krótko** na
  karcie. Uruchom sprawdza kluczyki u kierowcy i w stacyjce (ładownia).
- **Na krótko (D12, WKK):** akcja kierowcy z narzędziami małego mechanika albo elektronika (test narzędzi), ST wg
  klasy pojazdu (jednoślady 10, osobowe i terenowe 15, ciężkie i pancerne 20). Porażka — alarm (dźwięk, szept do
  MG); porażka o 5+ — awaria 17, a pojazd bez awarii dostaje obrażenia; sukces — pojazd trwale „odpalony na krótko”
  (Uruchom bez kluczyków).
- **Stan:** flaga `silnik` na aktorze pojazdu. Pojazd silnikowy przy zgaszonym silniku: Szybkość 0 (oznaczane).
- **Efekty:** dym z rury — natywny `ParticleGenerator` rdzenia 14 (tryb efektu, kotwica na żetonie, obrót i rura w
  układzie pojazdu), liczony lokalnie na każdym kliencie z flagi `silnik` — nic nie zapisuje się w scenie. Darmowy
  JB2A nie ma kłębów spalin (tylko jasna mgła i linia dymu), więc teksturę kłębu generujemy sami (miękki gradient,
  `vfx/`). Drgania — ticker z §4.1. Zestawy: **benzyna** (jasne, rzadkie kłęby, drobne szybkie drgania), **diesel**
  (ciemna sadza, wolniejsze, większe drgania), **motocykl** (siwe obłoczki, bzyczenie). Później **maszyna** dla
  Molocha. Ustawienie klienta „Drgania pojazdów” (wł./wył.).
- **Dźwięk:** uruchomienie (per zestaw), zgaszenie, nieudane odpalenie (awaria 17), alarm (na krótko).
- **Światła (D18):** przełącznik **Światła** dla kierowcy i MG — światło żetonu stożkiem ok. 60° do przodu (jasne
  18 m, przyćmione 36 m), obraca się z pojazdem; działa bez silnika (akumulator); awaria 17 je gasi.

### 4.6 Jazda w walce (D9, D10)

- Pojazd poza trackerem; jego ruch liczy się w turze kierowcy. Moduł sumuje drogę pojazdu w turze kierowcy i oznacza
  przekroczenie Szybkości (Przyspieszenie kierowcy dodaje drugą Szybkość, wsteczny ×½).
- **Skręt ≥ 90°** w turze kierowcy → karta MG: MDR (Pojazdy) ST 10, porażka — Szybkość ×½ (do końca tury). **Obrót
  180° w ruchu** → ST 20, porażka — awaria 8 (Przewrócenie).
- **Trudny teren:** istniejące regiony trudnego terenu → karta MG z testem (ST MG), pojazdy terenowe bez testu.
- **Atak z jadącego pojazdu:** pojazd, który ruszył się w tej rundzie, daje jadącym atakującym domyślne Utrudnienie
  w oknie ataku z przyciskiem ZRC (Akrobatyka) ST 10 — silnik okoliczności ataku; Konwojent je wyłącza.
- **Osłona jadących:** domyślnie ½ (TT +2, RAW s. 266), stanowiska i pojazdy pancerne wg §5 — podpowiedź w oknie osłony.
- **Wypadanie:** usunięcie jadącego z jadącego pojazdu (przycisk MG albo awaria) → 3k6 i Powalenie, żeton obok.

### 4.7 Potrącenie i Taranowanie

Po ruchu pojazdu moduł liczy kratki, przez które przejechał obrys (droga + zamiana obrysu przy skręcie), i istoty w
nich. Karta MG: lista potrąconych z RO ZRC ST 15 (Taranowanie kierowcy — z Utrudnieniem), obrażenia wg rozmiaru
pojazdu (§5), Powalenie, „już Powalony — drugi raz tyle”. Ofiara mniejsza od pojazdu o dwa rozmiary lub więcej — RO i
obrażenia; większa — obrażenia dostają ofiara, pojazd i jadący (wzorzec Osobówki i Autobusu). Nic nie dzieje się bez
kliknięcia MG.

### 4.8 Awarie (D5)

Rzut k20 z karty: po obrażeniach ≥ `hp.mt` (wzorzec `maszyny.mjs`) i po porażce kierowcy o więcej niż 5. [Zastosuj]
tworzy efekt na pojeździe:

| k20 | Skutek po [Zastosuj] |
|---|---|
| 1 Pożar | Podpalenie pojazdu; koniec tury kierowcy — 2k6 ognia pojazdowi i każdemu jadącemu (karta) |
| 2 Guma | Szybkość −18 m |
| 3 Sprzęgło | przy każdym Teście (Pojazdy) kierowcy dodatkowy k6: 1–2 — pojazd traci ruch w tej turze (karta) |
| 4 Kierowanie | −5 do Testów (Pojazdy) kierowcy tego pojazdu |
| 5 Dym | Region przypięty do żetonu: wnętrze całkowicie przesłonięte |
| 6 Drzwi | wsiadanie i wysiadanie przez okno miejsc wymaga SIŁ (Atletyka) albo ZRC (Zwinne dłonie) ST 10 |
| 7 Oś | Szybkość 0 |
| 8 Przewrócenie | pojazd Powalony; 4k10 obuchowych pojazdowi i jadącym, RO SIŁ ST 10 — połowa (karta) |
| 9 Wyciek | −0,5 l paliwa na rundę (zegar) |
| 10 Kierownica | tylko prosto — skręt oznaczany |
| 11 Gaz | Szybkość ×½; bez Gaz do dechy, Szóstego biegu i Gazu! |
| 12 Błotnik | co turę kierowcy 50%: awaria 2 (karta) |
| 13 Chłodnica | zegar 2k10 rund → awaria 15 |
| 14 Hamulce | „Hamuj” na karcie pojazdu: MDR (Pojazdy) ST 15, porażka — awaria 8 |
| 15 Silnik | silnik gaśnie; trzy tury rozpędu z ½ Szybkości (zegar), potem 0 |
| 16 Maska | naprawa poprzedzona SIŁ (Atletyka) ST 15 |
| 17 Elektryka | Uruchom oznaczane „zapłon zawodzi”; światła pojazdu zgaszone |
| 18 Pancerz | TT −1 |
| 19 Jadący | losowy jadący: połowa obrażeń pojazdu, min. 2k10 (karta) |
| 20 Broń | broń montowana uszkodzona; bez broni — awaria 19 |

### 4.9 Naprawy, PW i wrak (D19 — improwizacja do weta)

Wzór: naprawa drona z M3 (`actors/drony-naprawa.mjs` — „Napraw PW” i „Napraw awarię” przez Robotę M2) i tabela
Naprawiania (s. 146), która sama podaje przykłady samochodowe: świece — Drobnostka, sprzęgło — Trochę roboty,
silnik — Skomplikowana harówa.

- **Cena części** = 10% ceny pojazdu. Od niej liczą się procenty z tabeli s. 146 — inaczej wymiana sprzęgła w
  Osobówce kosztowałaby 300 gb.
- **Tymczasowa** (w jeździe): akcja + test o ST „jazda”, sukces zawiesza skutek na 1 minutę (10 rund), potem
  wraca. Narzędzia małego mechanika albo przedmiot, który MG uzna; bez kolumny „jazda” — tylko na postoju.
- **Fachowa** (postój): ST awarii z kolumny „postój” wyznacza stopień — 10 Drobnostka, 15 Trochę roboty, 20
  Skomplikowana harówa. Koszt: 10 / 30 / 50% ceny części w surowcach (Osobówka 10 / 30 / 50 gb, Czołg 30 / 90 /
  150 gb). Czas: 1k4 min / 1k4 h / 2k4 h. Narzędzia małego mechanika i biegłość (RAW); awaria 17 — mechanika
  albo elektronika. Drobnostka to od razu test; wyższe stopnie — Robota M2 (godziny, surowce, test na końcu,
  zajęcie w Postoju). Skutek Roboty zdejmuje awarię (przekaźnik MG).
- **PW** („Napraw karoserię”, wzór drona): godzina pracy = 2k6 + mod. INT naprawiającego, narzędzia małego
  mechanika; koszt w surowcach: przywrócone PW × 10% ceny pojazdu / maks. PW — cała karoseria za 10% ceny
  (Osobówka ok. 100 gb i ok. 8 h, Czołg ok. 300 gb i kilka dni). W Postoju — zajęcie w budżecie pracy.
- **Wrak** (D17): najpierw **Odbudowa** — Skomplikowana harówa liczona od ceny pojazdu (ST 20, 50% ceny,
  2k4 h × rozmiar: Duża ×1, Wielka ×2, Ogromna ×4), potem pojazd ma 1 PW i jedną losową awarię „pamiątkę” (k20)
  do naprawy zwykłym trybem. Grafika wraku wraca do oryginału.

### 4.10 Przesiadka (D15)

RAW s. 266 pkt 3 (ruch wewnątrz jadącego pojazdu) czytany tak: połowa Szybkości bez testu, pełna — z ZRC
(Akrobatyka) ST 10. **Przesiądź się** w oknie miejsc: koszt = odległość między miejscami ×2 (sąsiednie ≈ 3 m) albo
×1 z testem, tylko w jadącym pojeździe; porażka o 5+ — Powalenie na nowym miejscu. Stojący pojazd: zawsze ×2, bez
testu. **WKK:** w jadącym pojeździe zmiana rzędu (przód↔tył, kabina↔paka) zawsze wymaga Akrobatyki. „Jadący”
pojazd = ruszył się w tej albo poprzedniej turze kierowcy.

### 4.11 Broń montowana (D16)

**D33, 2026-10-26 — po becie.** Rozbudowa obsługi wieżyczek i reguły stabilizacji są odłożone.
Wstępnie stanowisko ma niwelować wymogi/kary właściwości **Ciężka** i Utrudnienie wynikające
ze strzelania z jadącego pojazdu. Zakres stanowisk, sektory ostrzału, obracanie i szczegóły akcji
pozostają do ustalenia po becie. Poniższa dotychczasowa obsługa montażu i przekazywania broni
nie wprowadza jeszcze tych wyjątków.

**Grafika D33, MG 2026-10-27:** Bradley ma osobny kadłub i wyciętą z zatwierdzonego żetonu
wieżę. Oś to środek pierścienia kosza: (300,790) px w kadrze 720×1350, czyli (219,204)
w wycinku 495×627 zaczynającym się w (81,586). Teraz wieża dziedziczy obrót, skalę,
widoczność i drgania kadłuba, znika przy prześwietleniu. To warstwa grafiki bez stanu
niezależnego obrotu. **Docelowo po becie** ma obrócić się w kierunku celu przed strzałem;
ten sam obrót musi wtedy prowadzić dwa miejsca załogi wieży i ich znaczniki wokół osi.

**M1A1 Abrams, 2026-10-27:** ten sam renderer obsługuje osobną wieżę czołgu. Kadr 780×2100,
oś (389,884), wycinek (70,458,638,1588), oś w wycinku (319,426). Obrys kadłuba 2,6×5,6
kratki odpowiada viewportowi 780×1680; tekstura `fit: width`, kotwica (0,5; 0,4). Lufa
wystaje przed zajmowane pole. Celowanie po becie musi prowadzić **trzy** miejsca wieży
(dowódca, działonowy, ładowniczy); kierowca pozostaje związany z kadłubem.

**Montaż i demontaż to Roboty produkcji.** Produkcja już dziś ma Robotę ad hoc MG (dowolny przedmiot, cena i
narzędzia od MG — `production/okna.mjs` `oknoAdHoc`) i wyniki trzech rodzajów: przedmiot, aktor (dron), naprawa z
wtyczkami (`zarejestrujNaprawe` — tak naprawia się dron). Brakuje wyniku, który jest **skutkiem na innym
dokumencie**. E2 dodaje rejestr `zarejestrujSkutek(klucz, fn)` obok `zarejestrujNaprawe`: Robota niesie klucz i
dane, a po udanym teście woła skutek przez przekaźnik MG. Ten sam rejestr posłuży innym „projektom” MG.

- **Zamontuj (Robota)** na zakładce Uzbrojenie (MG): broń z ładowni, stanowisko, wykonawca. Domyślnie Trochę
  roboty liczone od ceny broni — ST 15, 30% ceny broni w surowcach, 1k4 h; narzędzia małego mechanika albo
  rusznikarza. MG zmienia wszystko w oknie, jak w Robocie ad hoc. Skutek: broń na stanowisku.
- **Zdejmij** — Drobnostka bez kosztów (1k4 × 10 min), skutek: broń w ładowni.
- MG może też zamontować od ręki (bez Roboty) — pojazd z katalogu albo z fabuły.

Zajęcie stanowiska przenosi broń do
strzelca ścieżką przenoszenia przedmiotów (`production/przenoszenie.mjs`), z flagą `zamontowana: <uuid pojazdu>`:
Udźwig jej nie liczy, lalka pokazuje ręce na broni montowanej, upuścić ani schować jej nie można. Opuszczenie
stanowiska, wysiadka, wypadnięcie, śmierć strzelca i przycisk MG oddają ją pojazdowi; sprawdzenie przy starcie
świata zwraca broń, której strzelec nie siedzi już na stanowisku.

### 4.12 Wrak i wybuch (D17)

Przy 0 PW: osobna grafika każdego z 14 podwozi (`GRAFIKI_WRAKOW` w `vehicles-data.mjs`),
oryginalna pełna tekstura we fladze i [Przywróć]
u MG; jadący wysadzeni na wolne pola obok, silnik zgaszony, Uruchom i ruch oznaczane. Płonący pojazd z paliwem:
odliczanie k4 rund i wybuch tym samym kodem co autodestrukcja — ogień wg rozmiaru (Duża 3k6 / 3 m, Wielka 4k6 /
4,5 m, Ogromna 6k6 / 6 m; RO ZRC ST 15 — połowa); wrak zostaje. Odbudowa wraku — §4.9.

### 4.13 Pojazdy, które nie są pojazdami

Moduł używa typu aktora `vehicle` także jako pojemnika: **Stos** z bebeszenia (`postoj/bebeszenie.mjs`) i
**Miejsce** z przenoszenia (`production/przenoszenie.mjs`). Każdy hak M4 sprawdza najpierw „prawdziwy pojazd” —
flagę podwozia nadaną przez katalog i migrację (E1) — i pomija pojemniki.

### 4.14 Skala sceny i obrys w metrach (D21, E9)

Dziś obrys w kratkach 1,5 m trafia wprost do `width`/`height` (paczka, migracja, `zeton.mjs` `instrukcjePoRuchu` po
każdym ruchu), a miejsca liczą się od `grid.size`. Na siatce 3 m pojazd wychodzi dwa razy za duży, na mapie w km —
kilometry, a MG po każdym ruchu przywraca ten rozmiar.

- **Kratka pojazdu** = px na 1,5 m = `grid.size × 1,5 / grid.distance` (km → ×1000); rozmiar żetonu w kratkach sceny
  = obrys × 1,5 / `grid.distance`. Geometria (`geometria.mjs`) już bierze kratkę parametrem — zmienia się tylko
  źródło liczby. Prototyp dalej niesie obrys dla 1,5 m; nowy żeton przelicza się przy utworzeniu wg sceny.
- **Znacznik:** kratka pojazdu < 20 px (mapy kampanii w km) → bez zamiany obrysu, miejsc, kropek, prześwietlenia,
  kart jazdy i potrąceń; rozmiar żetonu zostawia MG. Stan aktora działa dalej.
- **Plansza pościgu do czasu P1:** M4 nie rusza pionków — bez zmiany rozmiaru, wymuszonego obrotu i kart jazdy.
  Dziś (z kodu, nie odtworzone): po pierwszym ruchu MG robi z pionka 1×1 obrys GMT400 1,5×3,5 toru, przeciągnięcie
  na sąsiedni tor obraca go o 90°, a każda zmiana toru wystawia kartę jazdy.
- **Ostrzeżenie MG:** pojazd drużyny (`primaryVehicle`) z niepowiązanym prototypem albo żetonami (D20).

Mapy kampanii (2026-10-19): 33 taktyczne po 64 albo 70 px na 1,5 m, trzy mapy podróży w km (1, 5, 140 km na kratkę).

### 4.15 Pamięć obsady (D23, E10)

Dziś miejsce to flaga `jazda` na żetonie jadącego z id żetonu pojazdu **na tej samej scenie** — nowa scena, nowe id,
nikt nie siedzi. Aktor pojazdu zna tylko listy `crew`/`passengers` (UUID aktorów), bez miejsc.

- **Flaga `obsada`** na aktorze pojazdu: lista par `[uuid aktora, id miejsca]` (lista, nie obiekt — pułapka delty
  żetonu niepowiązanego, §11 E3). Zapis przez MG po posadzeniu, przesiadce i świadomej wysiadce (gracz, wypadnięcie,
  „Wysadź wszystkich”). Zdjęcie techniczne (usunięcie pojazdu, sprzątanie przy starcie świata, wycięcie do schowka)
  pamięci **nie** czyści. Posadzenie w innym pojeździe zdejmuje postać z pamięci poprzedniego.
- `crew`/`passengers` i dostęp z obecności (D11) liczą się z pamięci, nie z żetonów jednej sceny — koniec
  przeskakiwania dostępu, gdy ten sam pojazd stoi na dwóch scenach.
- **Karta MG** „{pojazd}: posadzić według ostatniego składu? {postać} — {miejsce}, …” [Posadź] [Pomiń]. Wyzwalacze:
  pojazd pojawia się na scenie taktycznej albo planszy bez zapamiętanej załogi; żeton zapamiętanej postaci pojawia się
  na scenie z tym pojazdem. [Posadź] tworzy brakujące żetony postaci powiązanych z prototypu i sadza. Nie na
  mapach-znacznikach.
- Później (miłe): okno miejsc na mapie podróży na samej pamięci — gracze wybierają miejsca w drodze.

### 4.16 Ctrl+X / Ctrl+V z załogą (D22, E11)

Rdzeń 14 (`client/canvas/layers/base/placeables-layer.mjs`, `pasteObjects`): wycięcie i wklejenie na innej scenie
tworzy żetony z **tym samym id**, jeśli wolne (`keepId`), potem kasuje oryginały (`replacements`); hak
`pasteToken(objects, data, {cut})` przychodzi przed utworzeniem. Flaga `jazda` wskazuje id pojazdu, więc zachowane id
= załoga dalej posadzona, bez przemapowania.

- **Wycinanie i kopiowanie:** owinięcie `TokenLayer#_getCopyableObjects` — jadący zaznaczonego pojazdu dołączają do
  schowka (są ukryci, MG ich nie zaznacza).
- **Wklejenie:** MG dopasowuje rozmiar pojazdu i miejsca do skali sceny docelowej (§4.14) jednym `moveTokens`
  (wzorzec `zapiszPoRuchu`).
- **Ctrl+C / Ctrl+V** pojazdu z załogą (bandyci z obsadą): nowe id, przemapowanie `jazda.pojazd` w `pasteToken`.
- **Na mapę-znacznik:** tylko pojazd; postacie powiązane zostają w pamięci obsady (§4.15); niepowiązani jadący —
  odmowa z ostrzeżeniem (straciliby PW z delty), zostają obok dawnego miejsca pojazdu.
- Schowek żyje w przeglądarce MG; nic nie znika przed wklejeniem. Bandycki pojazd z „Dodaj pojazd” na planszy to
  świeża kopia aktora bazowego (bez szkód z mapy taktycznej) — Ctrl+X / Ctrl+V niesie deltę żetonu.

---

## 5. Katalog pojazdów

Obrys w kratkach 1,5 m (szerokość × długość), do potwierdzenia w E0. SIŁ/ZRC/KON z interpolacji: ciężar i rozmiar →
SIŁ, zwrotność → ZRC, wytrzymałość → KON; kotwice — cztery statbloki RAW. **TT w bezruchu** = TT − 5 (wzorzec RAW).
**Potrącenie wg rozmiaru** (kotwice RAW: Wielka 3k10 / 4k10, Ogromna 6k10 / 8k10): Duża — 2k10 / 3k10. Niewrażliwości
jak w statblokach RAW.

| Pojazd | Rozmiar | Obrys | Miejsca | Silnik | SIŁ/ZRC/KON | Cechy (RAW / *RAI* / **WKK**) |
|---|---|---|---|---|---|---|
| Osobówka | Wielka | 1,5×3 | 1+4 | benzyna | 20/12/16 | Cofanie, Potrącenie, Skok, Gaz do dechy [B], Slalom [R] |
| Autobus | Ogromna | 2×8 | 1+20 | diesel | 26/8/20 | Cofanie (¼, Utrudnienie), Potrącenie, Skok |
| Motocykl | Duża | 0,5×1,5 | 1+1 | motocykl | 16/16/12 | Akrobacja, Skok, Szósty bieg [B], Slalom [R] |
| Rower | Średnia | 0,6×1,5 | 1 | — | 10/18/10 | Akrobacja, Skok, Uciążliwy pancerz, Przerzutka [B], Slalom [R] |
| Buggy | Duża | 1,4×2,8 | 1+1 | benzyna | 16/16/12 | *Terenówka* (trudny teren ×½ bez testów — s. 261), *Skok* jak motocykl, *Potrącenie*, Slalom [R]; **Otwarta rama** — jadący nigdy nie mają więcej niż ½ osłony |
| Hammer | Wielka | 1,5×3 | 1+4 | diesel | 20/10/18 | *Terenówka*, *Cofanie*, *Potrącenie*, *Gaz do dechy* [B]; **Wieżyczka** — stanowisko na dachu: ¾ osłony, broń montowana strzela w każdą stronę |
| Ciężarówka | Ogromna | 2×6 | 3 + paka 8 | diesel | 24/8/18 | *Cofanie* jak Autobus, *Potrącenie*; **Paka** — miejsca stojące: ½ osłony, w jadącej ciężarówce ZRC (Akrobatyka) ST 10 na początku tury albo Powalenie |
| Wóz strażacki | Ogromna | 2×5,5 | 1+5 | diesel | 24/8/18 | *Cofanie*, *Potrącenie*; **Działko wodne** [A, stanowisko] — linia 18 m: gasi Podpalenie i ogień, istoty RO SIŁ ST 13 albo odepchnięte o 3 m i Powalone, zbiornik na 10 strzałów; **Syrena** [B] — Utrudnienie do Testów MDR (Percepcja) opartych na słuchu w promieniu 30 m do następnej tury |
| Buldożer | Ogromna | 2,5×4 | 1+1 | diesel | 28/6/22 | **Gąsienice** — gruz i trudny teren bez kary; **Lemiesz** [A] — spycha przeszkody i mniejsze pojazdy, istoty przed lemieszem RO SIŁ ST 15 albo przepchnięte i Powalone; Niszczenie obiektów ×2 (M6); bez Gazu do dechy |
| Czołg — M1A1 Abrams | Ogromna | 2,6×5,6 kadłub; lufa poza obrysem | 4: kierowca, dowódca, działonowy, ładowniczy | diesel | 28/6/24 | *Gąsienice*; **Wieża** — stanowisko działonowego strzela w każdą stronę; **Pancerne wnętrze** — jadący mają całkowitą osłonę, strzelają tylko z broni montowanej; **Miażdżenie** — Powalona istota nie ma RO przeciw Potrąceniu |
| Bojowy wóz piechoty — M2A2 Bradley | Ogromna | 2,4×4,5 | 3 + desant 6 (WKK, wybór MG) | diesel | 26/8/22 | *Gąsienice*, *Pancerne wnętrze*; **Desant** — rampa: desant wysiada bez kosztu ruchu; **Strzelnice** — desant strzela ze środka z ¾ osłony |
| Traktor | Wielka | 1,5×2,5 | 1+1 | diesel | 22/8/18 | *Terenówka*; **Uciąg** [A] — holuje pojazd do swojego rozmiaru albo przyczepę (Szybkość obu ×½), wyciąga z rowu i gruzu |
| Motorower | Średnia | 0,6×1,56 | 1 | motocykl | 12/14/10 | *Akrobacja* (ST 10), Slalom [R]; **Oszczędny** — 2 l/100 km |
| Deskorolka | Mała | 0,6×0,72 | 1 | — | 6/16/8 | *Uciążliwy pancerz*; **Ollie** — raz w turze za ½ Szybkości ZRC (Akrobatyka) ST 10: przeskok przez krawężnik lub przeszkodę do 1 m, porażka — Powalenie |

Zasada doboru własnych cech: jedna–dwie na pojazd, każda to tekst na karcie plus co najwyżej jedna flaga albo jedna
karta z RO — nic, co wymaga nowej geometrii. Cechy pościgowe (Rajdowiec, Stuknięcie większym pojazdem) — część 2.

---

## 6. Etapy

### 6.1 Część 1

| Etap | Zakres | Rozmiar | Gotowe gdy |
|---|---|---|---|
| **E0** | **Próba w piaskownicy**: obrys prostokątny z zamianą w czterech kierunkach (§4.3), jadący w animacji (pozycja, obrót, wizja, FOV), drgania wspólne, ukrycie i prześwietlenie, Alt+klik. Osobówka z czterema jadącymi, jazda po łuku i obrót o 180°. | S–M | nagranie i zrzuty w przekazaniu; decyzja MG: prostokąt czy wariant zapasowy |
| **E1** | **Katalog i dane**: 14 pojazdów → paczka `pojazdy` (cechy jako zdolności pojazdu z aktywnościami tam, gdzie tanio), obrysy, miejsca, zestaw silnika, punkt rury, flaga podwozia (§4.13); `validate-packs`; GMT400 i Hammer Posterunku — nasza migracja (podwozie, miejsca, obrys). | M | paczka zbudowana, Quench danych |
| **E2** | **Karta pojazdu**: podklasa z zakładkami Pojazd, Załoga, Ładownia, Uzbrojenie, Awarie, Opis; stan własności (§4.4); martwe pola dnd5e ukryte; obie dotychczasowe wstawki działają; rejestr skutków Roboty i montaż broni (§4.11). | M–L | e2e karty, zrzuty; Robota montażu kończy się bronią na stanowisku |
| **E3** | **Wsiadanie i miejsca**: okno miejsc, Wsiądź / Wysiądź / Przesiądź się (koszty z RAW, §2), jadący i ich rozmiar, kropki, prześwietlenie, dostęp z obecności, **WKK:** upuszczone w pojeździe ląduje w ładowni, wypadanie. | L | e2e: gracz wsiada, jedzie, przesiada się, wysiada; drugi gracz widzi kropki |
| **E4** | **Silnik**: Uruchom/Zgaś, kluczyki i na krótko, oznaczenia, zestawy efektów, ustawienie drgań, dźwięki, światła, paliwo i wyciek. | M | e2e i Quench; zrzuty efektów |
| **E5** | **Jazda w walce**: tura kierowcy, budżet ruchu, wsteczny, skręty i obrót, trudny teren, atak z jadącego pojazdu, osłona jadących, potrącenie, broń montowana. | L | e2e `pojazd` w walce |
| **E6** | **Awarie, naprawy, wrak**: dane k20, wyzwalacze, skutki z §4.8, zegary, naprawy tymczasowe i fachowe, „Napraw karoserię”, wrak, wybuch i Odbudowa (§4.9, §4.12). | L | Quench każdej awarii i kosztów; e2e naprawy i wraku |
| **E7** | **Wojownik autostrady** poza pościgiem: Konwojent, Taranowanie, Kaskader (karty testów), Pancerna fura (OC, AC [B]); Rajdowiec — Ułatwienie w walce i +50% Szybkości. Plakietki pokrycia. | S–M | rejestr zdolności zaktualizowany |
| **E8** | **Grafika, Poligon, testy**: zamówienia w `dev/icons/MISSING.md` (14 żetonów z góry, 14 portretów, dźwięki), stanowisko Poligonu **Garaż**, pełna bramka. | M | bramka zielona; stanowisko z sondami |
| **E9** | **Skala sceny** (§4.14): obrys w metrach, znacznik poniżej progu, plansza pościgu nietknięta do P1, ostrzeżenie o niepowiązanym pojeździe drużyny. | S–M | Quench formuły (1,5 m / 3 m / km / plansza); e2e `poscig` z pojazdem z katalogu — bez zmiany rozmiaru i obrotu |
| **E10** | **Pamięć obsady** (§4.15): flaga `obsada`, załoga i dostęp z pamięci, karta „Posadzić?” z tworzeniem żetonów. | S–M | Quench pamięci; e2e: pojazd na drugiej scenie, karta, posadzenie |
| **E11** | **Ctrl+X / Ctrl+V z załogą** (§4.16). | S | e2e: wycięcie pojazdu z trzema jadącymi, wklejenie na scenie o innej siatce, jadący na miejscach |

### 6.2 Część 2 — pościg na złożonej drodze (D24–D31)

RAW abstrahuje pościg do znaczników co 36 m; jadący, miejsca, wybuchy i serie potrzebują prawdziwych metrów. Jedna
skala siatki zawsze psuje jedno z dwojga: tor 36 m robi z pojazdu 8 px, tor w skali pojazdów każe serii (36 m)
przeciąć osiem torów. Złożona droga trzyma oba: **każdy pojazd to wyspa w prawdziwej skali, przypięta do drogi
środkiem**; między wyspami liczą się znaczniki.

#### 6.2.1 Plansza

| Parametr | Dziś (`PLAN_poscigi.md` §2.1) | Nowa |
|---|---|---|
| Tor = kratka siatki | 200 px, `grid.distance` 36 m | 280 px, `grid.distance` 6 m — pojazdy i szablony w prawdziwej skali (70 px na 1,5 m) |
| Szerokość (12 torów + 2 marginesy) | 2800 px | 3920 px (×1,4) |
| Pionek | 1×1 tor | pojazd z obrysem w prawdziwej skali, przodem w prawo |
| Pas gry | 1300 px | jezdnia na trzy pojazdy obok siebie (~13,5 m); wysokość pasa i warstw motywów — w P1 |

- **Przyciąganie (D25):** x zawsze na środek toru, y wolne; plakietka toru na pojeździe, poświata kolumny toru
  pojazdu gracza (jest). Pojazdy do 6 m (GMT400 5,25 m, Hammer, jednoślady) mieszczą się w torze; ciężarówka 9 m
  zajmuje 1,5 toru, najdłuższe 12 m — dwa.
- **Rozstawianie** (`dodajPojazd`): wg prawdziwej długości i szerokości, w wolnym rzędzie; potem karta „Posadzić?”
  (E10). Przejście z mapy taktycznej: Ctrl+X / Ctrl+V z załogą (E11).
- **Recentrowanie** przesuwa o całe tory także szablony i rzeczy na drodze; jadący jadą z pojazdem (część 1).
- **Obrót:** plansza już stawia pojazdy przodem w prawo (`poscig-motion.mjs`); M4 nie wymusza obrotu z ruchu.
- **Grafika:** motywy ×1,4 — pasy są kafelkowane po szerokości sceny, rekwizyty strumieniowane wg widoku; pomiar FPS
  w e2e `poscig`. Stanowiska Poligonu `poscig` i `droga` — od nowa.

#### 6.2.2 Metryka drogi (D27)

Każdy żeton na planszy ma współrzędne drogi w metrach:

- **S (wzdłuż)** = 36 m × tor środka jego pojazdu + przesunięcie od środka pojazdu w prawdziwych metrach;
- **T (w poprzek)** = prawdziwe metry z y;
- przynależność: jadący i pojazd — swój pojazd; punkt na obrysie pojazdu albo do 1,5 m od niego (środek wybuchu,
  punkt linijki) — ten pojazd; reszta — goła droga, S = 36 m × tor pod punktem;
- odległość = linia prosta w (S, T).

Przykład MG — dwa autobusy, B o znacznik przed A, rzędy 4,5 m od siebie: strzelec 4,5 m przed środkiem A, cel 4,5 m
za środkiem B → 27 m wzdłuż i 4,5 m w poprzek, ok. 27,4 m do przodu, choć na obrazie cel jest za strzelcem i rząd
niżej (D31). To jest pierwszy test Quench metryki.

Podpięcia, wyłącznie na planszy:

| Konsument | Gdzie | Jak |
|---|---|---|
| zasięgi, cechy zależne od zasięgu, linijka i ruch rdzenia | `canvas.grid.measurePath` (`combat/okolicznosci.mjs`, `combat/pack-tactics.mjs`, `weapons/addons.mjs`, linijka) | nadpisanie na instancji siatki planszy |
| odległość krawędzi | `combat/okolicznosci.mjs` `odlegloscKrawedzi` | gałąź planszy — dziś liczy zajęte kratki, czyli całe tory |
| rzut | `scenes/area-picker.mjs` `measureMeters` | naprawa: `measurePath([{A, B}])` ma zły kształt i po cichu schodzi do pikseli |
| obszary | `weapons/fire-modes.mjs` `_templateContainsToken`, granaty i ładunki (`actors/grenade-inventory.mjs`) | punkt wirtualny (§6.2.3) |
| zasięg sygnału dronów | `actors/drony-zdalne.mjs` | dziś `dystansZnacznikow` — przejście na metrykę |

Strażnik: Quench sprawdza, że każdy konsument z tabeli daje na planszy wynik metryki, nie pikseli; reguła trafia do
`ARCHITECTURE.md` razem z P2.

#### 6.2.3 Obszary — wybuchy i ogień zaporowy

- Szablon rysuje się w prawdziwej skali w miejscu trafienia (siatka 6 m na tor — rdzeń sam przelicza metry).
- **Kto w środku:** punkt wirtualny = środek szablonu na obrazie + (pozycja drogi żetonu − pozycja drogi środka) ×
  px/m, potem `region.testPoint` — działa dla każdego kształtu. Trafieni podświetleni i wypisani na karcie.
- **Ogień zaporowy (D29):** strefa przyklejona do pojazdu (współrzędne w układzie wyspy) — jedzie z nim i łapie
  jadących przy przesiadce; wyzwalacz `onUpdateTokenSuppressiveFire` sprawdza metryką drogi.
- Rysunek dużego wybuchu może zachodzić na pojazd w sąsiednim rzędzie, którego nie trafia — lista decyduje (D31),
  przycięcie po pierwszej grze (§10).

#### 6.2.4 Serie — tryb celowania (D28)

Dziś Długa seria (linia 36 × 1,5 m) i Miażdżąca (150 × 3 m) to aktywności z RO: dnd5e daje przeciągnąć linię, a RO
rzuca ten, kto naciśnie przycisk, za **zaznaczone** żetony (`rollSaveWithCover`) — kto jest w linii, ocenia oko. Na
planszy oko widzi obraz, nie geometrię, więc trafionych liczy moduł:

1. Na planszy `dnd5e.preCreateMeasuredTemplate` → `false`; zamiast przeciągania startuje tryb celowania.
2. Linia biegnie od miejsca strzelca, kierunkiem po drodze ku temu, co pod kursorem (pojazd — prawdziwe metry; goła
   droga — znaczniki wzdłuż, metry w poprzek).
3. Podgląd na żywo: obwódka na każdym żetonie, który linia trafi, smuga od strzelca do kursora. Klik — ognia; Esc
   albo prawy — rezygnacja.
4. Trafieni: jadący, których miejsce leży w długości i połowie szerokości linii, i **pojazdy**, przez które linia
   przechodzi. Własny pojazd strzelca domyślnie pominięty (strzela się z niego); bratobójczy ogień — decyzja MG.
5. Karta: trafieni jadący i osobno pojazdy, [Zaznacz trafionych]; dalej istniejący przycisk RO (osłona, ZRC/SIŁ,
   Powalenie) bez zmian.

**Wiele celów:** linia wzdłuż pojazdu bierze każdego jadącego w połowie szerokości od niej — GMT400 ma 2,25 m i trzy
miejsca w rzędzie: Miażdżąca bierze wszystkie, Długa większość, zależnie od celowania. **Wiele pojazdów:** w jednym
rzędzie Miażdżąca (150 m) sięga ok. czterech znaczników, Długa (36 m) następnego (tył GMT400 o znacznik dalej to ok.
31 m od strzelca z przodu własnego pojazdu). Po skosie przez rzędy (4,5 m w poprzek na 36 m wzdłuż) linia z rzędu 1
przez pojazd w rzędzie 2 o znacznik dalej wchodzi w rząd 3 o dwa znaczniki — kąt jest prawdziwy, stromy skos wyjeżdża
z drogi. Później (miłe): Shift+klik drugiego celu — „poprowadź przez oba”.

#### 6.2.5 Mechanika pościgu (runda pytań przed P5)

Paleta manewrów (Gazu!, Hample, Obrót 180°, Ostrożna jazda, Stuknięcie, Zajechanie) dla załogi z pamięci obsady; Test
Pościgu z ST planszy, nat. 20/1; komplikacje k20 (1–3 → awarie z części 1); ataki w pościgu (osłona ½, atak na
kierowcę i jego test, Przewrócenie); wypadanie (−3 znaczniki na rundę); warunki końca (meta, przewaga 7, 10 rund);
Rajdowiec w pościgu; zasada D4 starego planu — ruch tylko po kliknięciu; rzeczy na drodze wg znacznika (D30). Na
planszy pojazd zawsze „jedzie”: przesiadka zawsze z kosztem RAW, atak z jadącego pojazdu zawsze z Utrudnieniem.

#### 6.2.6 Etapy części 2

| Etap | Zakres | Rozmiar | Gotowe gdy |
|---|---|---|---|
| **P1** | **Plansza od nowa** (§6.2.1): tory 280 px, rzędy, twarde przyciąganie, plakietki, rozstawianie wg obrysu, recentrowanie z szablonami, motywy ×1,4. | M | e2e `poscig`: rozstawienie, zmiana toru, recentrowanie; pomiar FPS |
| **P2** | **Metryka drogi** (§6.2.2) i jej podpięcia, strażnik Quench, reguła w `ARCHITECTURE.md`. | M | Quench: przykład MG, każdy konsument z tabeli |
| **P3** | **Jadący na planszy** (D26): wyspy z części 1, pojazd zawsze jedzie, osłona ½, atak na kierowcę. | S–M | e2e: posadzenie, przesiadka, atak między pojazdami z zasięgiem z metryki |
| **P4** | **Serie i obszary** (§6.2.3–§6.2.4). | M | e2e: Miażdżąca przez dwa pojazdy w rzędzie, granat w jednym pojeździe, ogień zaporowy jadący z pojazdem |
| **P5** | **Mechanika pościgu** (§6.2.5) — po rundzie pytań. | M–L | pościg od startu do mety bez notatek MG (`PLAN_beta.md`, M4) |
| **P6** | **Poligon i bramka**: stanowiska `poscig` i `droga` od nowa, sondy D24–D31, `release:check`. | M | bramka zielona |

### 6.3 Część 3 — nośniki: wierzchowce (z M6, MG 2026-10-25)

> Przeniesione z `PLAN_m6_drobne_zasady.md` (tamten §5.7, decyzje D7 i D10, ustalenia U17–U21, otwarte P4 i P6).
> Powód: to refaktor kodu części 1 (`pojazdy/stan.mjs`, jadący, żeton) pod te same testy (e2e `pojazd`, Garaż), a dwie
> niedokończone sprawy tego planu to ten sam problem dla pojazdu i konia — **Inicjatywa za kierowcą** (§10, pytanie 7)
> i **budżet ruchu nośnika z deklarowanymi akcjami** (znany brak „Akcje bonusowe cech” w §10; `HANDOFF_movement_hotbar.md`
> §3 zostawia ruch pojazdów temu planowi). Rozmiar: **L**. Nie blokuje M6 ani M7.

**RAW (s. 257).** Wierzchowiec ≥ 1 rozmiar większy od jeźdźca, z siodłem; wsiadanie i zsiadanie za ½ Szybkości, w
zasięgu 1,5 m. Wyszkolony: Inicjatywa jeźdźca, rusza się w jego turze, ma tylko Bieganie, Przyspieszenie, Odstąpienie,
Unikanie; niewyszkolony robi, co chce; po zsiadaniu w walce zachowuje Inicjatywę i dba o siebie. Przemieszczenie
wierzchowca wbrew woli albo Powalenie jeźdźca lub wierzchowca → RO ZRC ST 10, porażka — spadasz 1,5 m obok z
Powaleniem. Atak z grzbietu jadącego wierzchowca bez biegłości w Tresurze — Utrudnienie. Zdolności: Jeździec (Wyjadacz
Zwiadowcy), Rodeo (Sztuczka), Zawsze w siodle (Kowboj). Stock dnd5e i rdzeń: brak wierzchowców.

**Decyzje MG (2026-10-25).** **W-D1:** kierunek pełny, z generycyzacją mechaniki pojazdów — ten sam kod obsługuje
pickupy, rowery, konie i czołgi. **W-D2:** gotowe przed betą („drużyna graczy jest absolutnie nieprzewidywalna”).

**Pojęcie.** *Nośnik* = aktor, którego żeton wiezie żetony jadących na miejscach. Dziś: pojazd (`vehicle` z flagą
`pojazd`). Po części 3: także istota z flagą `wierzchowiec`. Profil nośnika decyduje o reszcie:

| Cecha | `pojazd` | `wierzchowiec` |
|---|---|---|
| Aktor | `vehicle` | `npc` (Bestiariusz: koń zdrowy, skażony, teksańczyk; ujeżdżone Rodeo) |
| Miejsca, obrys, ruch jadących w animacji, wsiadanie/wysiadanie, wypadanie, pamięć obsady, Ctrl+X/V | wspólne (`stan.mjs`, `jadacy.mjs`, `zeton.mjs`, `schowek.mjs`) | wspólne |
| Jadący | ukryci + kropki + prześwietlenie (dziś) albo widoczni (W-U1) | **widoczni**, nad nośnikiem |
| Sterowanie | kierowca, test Pojazdów, karty jazdy, silnik, paliwo, kluczyki, awarie, wrak | jeździec; wyszkolony — w turze jeźdźca, tylko Bieganie / Przyspieszenie / Odstąpienie / Unikanie; niewyszkolony — MG |
| Inicjatywa | tura kierowcy; przesunięcie tury pasażera (§10, pytanie 7) | Inicjatywa wierzchowca = jeźdźca — **ten sam mechanizm co pytanie 7** (W-U6); po zsiadaniu zachowuje wartość |
| Budżet ruchu | Szybkość pojazdu, Gazu! / Gaz do dechy | Szybkość wierzchowca + jego Przyspieszenie / Bieganie deklarowane przez jeźdźca — model przydziału z `HANDOFF_movement_hotbar.md` §5, przydział należy do żetonu nośnika (W-P3) |
| Wsiadanie | koszty z części 1 | ½ Szybkości w zasięgu 1,5 m; Jeździec — 1,5 m (M7) |
| Wypadanie | część 1 | przemieszczenie wbrew woli albo Powalenie jeźdźca/wierzchowca → karta RO ZRC ST 10; porażka — 1,5 m obok, Powalenie (ścieżka wypadania części 1) |
| Atak z grzbietu | Utrudnienie z jadącego pojazdu, Akrobatyka znosi | Utrudnienie z jadącego wierzchowca bez biegłości w Tresurze; Jeździec znosi dla dystansowych (M7) — wiersz silnika okoliczności, „jedzie” jak `jedzie()` pojazdu |
| Cel | pojazd albo jadący przez kropkę | wierzchowiec albo jeździec — zwykłe celowanie |
| Utrzymanie | paliwo | jedzenie i woda (M5 — jak towarzysze); Zawsze w siodle (M7, karta) |

**Kod.** Warstwa w `pojazdy/stan.mjs`: `profilNosnika(actor)` (`pojazd` | `wierzchowiec` | `null`), `jestNosnikiem`,
`daneNosnika`, `miejscaNosnika` — stare nazwy (`jestPojazdem`, `danePojazdu`…) zostają jako aliasy o węższym
znaczeniu (tylko pojazd). Każdy moduł `pojazdy/*` dostaje jawną decyzję: wspólny (jadący, okno miejsc, schowek,
obsada, geometria, żeton) albo pojazdowy (silnik, efekty silnika, awarie, naprawy, wrak, kluczyki, broń montowana,
pościg). Katalog z wpisem `kon` (Duża, obrys 1 × 2 kratki, miejsca: jeździec + pasażer, profil `wierzchowiec`);
Bestiariusz (`dev/bestiary/gen_bestiary.py`, `AUTOMATION`) nadaje koniom flagę. `crew`/`passengers` dnd5e piszemy
tylko dla `vehicle`; wierzchowiec trzyma obsadę we fladze `obsada` (już istnieje).

**Wykonalność:** wysoka złożoność, średnie ryzyko — część 1 jest świeża i każda zmiana idzie pod e2e `pojazd` i
Garaż. Spike W0 przed refaktorem.

**Ustalenia — do weta MG.**

| # | Ustalenie | Warstwa |
|---|---|---|
| W-U1 | Otwarte miejsca dostają też motocykl, motorower, rower, deskorolka, buggy (otwarta rama). Korzystają ze wspólnego modelu D32; wdrożone: właz Hammera, oba miejsca motocykla, osiem miejsc otwartej paki ciężarówki i oba fotele buggy (grafika 2026-10-26), pozostałe profile w W1. Widoczność określamy per miejsce, aby nośnik mógł mieć jednocześnie zakrytą kabinę i otwarte stanowisko. | RAI |
| W-U2 | Wierzchowiec zawsze ≥ 1 rozmiar większy od jeźdźca — sprawdzane przy wsiadaniu (oznaczane) | NOE |
| W-U3 | Wyszkolenie: flaga `wyszkolony` na aktorze (domyślnie tak dla koni z katalogu; Rodeo — wyszkolony tylko dla ujeżdżającego) | NOE |
| W-U4 | Niewyszkolony wierzchowiec: jeździec jedzie, ruchem steruje MG (żeton bez prawa ruchu dla gracza) | NOE |
| W-U5 | Obsada konia przechodzi Ctrl+X / Ctrl+V jak pojazdu (E9–E11) | — |
| W-U6 | Inicjatywa wierzchowca i „tura pasażera za kierowcą” (pytanie 7) — jedno narzędzie: kombatant nośnika dostaje Inicjatywę jeźdźca/kierowcy i wspólną grupę (wzorzec towarzyszy M3, `combat/towarzysze-walka.mjs`) | NOE |

**Otwarte.** **W-P1** pościg konny — po becie (plansza zostaje pojazdowa). **W-P2** wierzchowce poza koniem (muł,
neogator z Rodeo, gigamut) — katalog otwarty; na betę koń + „dowolna istota z flagą”. **W-P3** budżet ruchu nośnika:
wspólny model z handoffu ruchu (przydział na żetonie nośnika, deklaruje jeździec/kierowca) czy zostaje dzisiejszy
budżet jazdy z E5 — propozycja: wspólny, razem z kartami jazdy, gdy handoff dojdzie do kroku 2.

| Etap | Zakres | Rozmiar | Gotowe gdy |
|---|---|---|---|
| **W0** | Spike: koń z widocznym jeźdźcem przez animację jadących na scenie taktycznej (dwóch klientów); wspólna Inicjatywa nośnika i jeźdźca | S | notatka tak/nie w §11 |
| **W1** | Warstwa profilu w `stan.mjs`, aliasy, klasyfikacja `pojazdy/*`; otwarte miejsca W-U1 na fundamencie D32 (`prezentacja.mjs`, już używany przez właz Hammera) | M | e2e `pojazd` zielone bez zmian; sonda Garażu „motocykl” |
| **W2** | Katalog `kon`, flaga z Bestiariusza, wsiadanie (½ Szybkości, rozmiar, wyszkolenie) | S–M | Quench profilu; e2e: wsiadanie na konia |
| **W3** | Walka: Inicjatywa (W-U6, razem z pytaniem 7), ruch wierzchowca w turze jeźdźca z jego akcjami (W-P3), niewyszkolony i po zsiadaniu | M | e2e `wierzchowiec`: jazda w walce dwóch rund |
| **W4** | Spadanie z siodła, atak z grzbietu (silnik okoliczności), utrzymanie (M5) | S–M | e2e: Powalenie konia → karta RO jeźdźca |
| **W5** | Poligon — stanowisko **Stajnia** obok Garażu, plakietki Jeźdźca, Rodeo, Zawsze w siodle (z M7) | S–M | sondy dla W-U1–W-U6 |

---

## 7. Testy i Poligon

- **Quench:** czyste funkcje — obrys po obrocie, pozycja miejsca w układzie pojazdu, koszt przesiadki, potrącenie
  (kratki drogi), skutki awarii, zegary, interpolacja katalogu.
- **e2e `pojazd`:** MG + dwóch graczy: wsiadanie, uruchomienie, jazda z obrotem, kropki u gracza spoza pojazdu,
  prześwietlenie u gracza w środku, atak z jadącego pojazdu, potrącenie manekina, awaria i naprawa.
- **Poligon — stanowisko Garaż:** Osobówka, Motocykl, Rower, Ciężarówka z paką, Wóz strażacki; manekiny do potrąceń;
  sondy dla każdej decyzji D2–D10 i każdej własnej cechy z §5.
- **Część 1b:** Quench kratki pojazdu (1,5 m, 3 m, km, plansza) i pamięci obsady; e2e: druga scena z kartą
  „Posadzić?”, Ctrl+X / Ctrl+V pojazdu z trzema jadącymi na scenę o innej siatce.
- **Część 2:** Quench metryki drogi (przykład MG z dwoma autobusami) i strażnik konsumentów (D27); e2e `poscig` —
  rozstawienie, serie przez dwa pojazdy, ogień zaporowy jadący z pojazdem; stanowiska Poligonu `poscig` i `droga`.
- **Część 3:** Quench profilu nośnika i wspólnej Inicjatywy; e2e `wierzchowiec` i regresja `pojazd`; stanowisko
  Poligonu **Stajnia** (§6.3).

## 8. Grafika i dźwięk

Do `dev/icons/MISSING.md`: 14 żetonów z góry (jeden obraz, prostokąt zgodny z obrysem, przezroczyste tło, rura
wydechowa w stałym miejscu), 14 portretów, 14 indywidualnych wraków pojazdów (decyzja MG 2026-10-28; wraki z M5
to drony i maszyny), dźwięki: uruchomienie benzyna/diesel/motocykl, zgaszenie, nieudane odpalenie, alarm. Dym i
wybuch — z JB2A.

## 9. Ryzyka

| Ryzyko | Ograniczenie |
|---|---|
| Synchronizacja jadących w animacji (wiele odcinków drogi, łańcuch animacji) | próba E0 przed czymkolwiek innym; zapis końcowy przez MG zawsze naprawia obraz |
| Obrys prostokątny niezgodny z rdzeniem | E0; wariant zapasowy — kwadrat |
| Zmiana rozmiaru jadącego zostaje po awarii klienta | przywracanie przy wysiadce, usunięciu pojazdu, przycisk MG, sprawdzenie przy starcie |
| Ukrycie lokalne a inne moduły (Splatter, nazwy) | ukrycie przez `isVisible` — rdzeń sam chowa pasek, nazwę, efekty |
| Wydajność efektów silnika | jeden ticker na scenę, ustawienie klienta |
| Nowy kod liczy na planszy piksele zamiast drogi | D27: strażnik Quench i reguła w `ARCHITECTURE.md` |
| Celowanie serii zbyt czułe na gołej drodze (x ściśnięty 6×) | kursor na pojeździe daje prawdziwe metry; później Shift+klik „przez oba” |
| Wycinanie między scenami — zmiana zachowania rdzenia | e2e E11 łapie brak zachowanego id |
| Wydajność szerszej planszy | pomiar FPS w e2e `poscig` (progi `PLAN_poscigi.md` §2.2a — zalecenia) |

## 10. Otwarte pytania i weto

Brak blokujących. **Do weta MG** (wszystko zaimprowizowane tej nocy, każde na Poligonie, stanowisko Garaż):

| Co | Gdzie | Sonda Garażu |
|---|---|---|
| Obrys prostokątny (E0 — agent wybrał prostokąt, bo nie był znacząco problematyczny) | §4.3, `pojazdy/zeton.mjs` | `obrys` |
| Katalog: statystyki 10 pojazdów bez statbloku, obrysy, miejsca, bak i spalanie, własne cechy | §5, `config/vehicles-data.mjs` | `cechy` |
| ST na krótko (10/15/20 wg klasy), wybuch baku (k4 rund, ogień wg rozmiaru, RO ZRC ST 15) | §4.5, §4.12 | `kluczyki`, `wrak` |
| Naprawy: cena części 10%, stopnie z ST „postój”, karoseria 2k6 + INT na godzinę, Odbudowa | §4.9 | `naprawy`, `wrak` |
| Montaż broni: Trochę roboty od ceny broni, CZ/MK po połowie; narzędzia mechanika albo rusznikarza | §4.11 | `bron` |
| Efekty silnika: gęstość i barwa dymu, siła drgań w trzech zestawach | §4.5, `pojazdy/efekty-silnika.mjs` (`ZESTAWY`) | `silnik`, `drgania` |
| Kropka jako uchwyt celowania — prawy klik (klawisz T nie celuje w ukrytego jadącego) | D14 | `celowanie` |

Część 1b — bez otwartych pytań. Część 2 — runda pytań o mechanikę pościgu (§6.2.5) przed P5 (RAW s. 266–268
przeczytane 2026-10-19; propozycje agenta w nawiasach):

1. **Ruch po znacznikach** (pkt 3: znacznik za każde 36 m w turze kierowcy, brak ruchu — znacznik w tył). Kierowca
   przeciąga pojazd po torach, moduł liczy znaczniki z Szybkości (Gazu!, Rajdowiec ×1,5, awarie) i oznacza przekroczenie,
   koniec tury bez ruchu → karta MG [Cofnij o znacznik] — *czy* ruch tylko przyciskiem z karty (stary D4)?
   (Przeciąganie z budżetem, jak w części 1.)
2. **Test Pościgu** (pkt 4): karta z rzutem na początku tury kierowcy czy przy pierwszym ruchu? Nat. 20 — [+1 znacznik],
   nat. 1 — dwie komplikacje. (Początek tury.)
3. **Komplikacje k20** (s. 267): rzut z karty po porażce; [Zastosuj] dla mierzalnych (znaczniki, obrażenia, Szybkość ½,
   trudny teren, stany, awaria z tabeli dla 1–3), testy jako przyciski na karcie, reszta tekst. (Tak.)
4. **Walka wręcz na planszy** (pkt 5: „na tym samym znaczniku”): metryka drogi liczy rzędy w prawdziwych metrach (4,5 m
   — poza zasięgiem 1,5 m). Wręcz: ten sam znacznik = zasięg niezależnie od rzędu (RAW) czy prawdziwe metry (burta
   w burtę)? (RAW: ten sam znacznik.)
5. **Atakowanie kierowcy** (pkt 5): obrażenia kierowcy na planszy → karta z Testem (Pojazdy) ST max(10, ½ obrażeń);
   porażka [Cofnij o znacznik], o 5+ [Przewrócenie] (awaria 8). (Tak.)
6. **Wypadanie w pościgu** (pkt 5): wypadnięty ląduje znacznik za pojazdem i cofa się o 3 znaczniki na rundę — moduł
   przesuwa go na początku rundy z kartą interakcji, czy tylko pisze? (Przesuwa, karta dla MG.)
7. **Inicjatywa za kierowcą** (pkt 2): jednorazowe przesunięcie tury pasażera za kierowcę — przycisk na HUD-zie
   jadącego? (Tak.) *Od 2026-10-25 to samo narzędzie służy Inicjatywie wierzchowca — §6.3, W-U6.*
8. **Koniec pościgu** (pkt 6): przewaga 7 i 10 rund — karta MG (wykrycie); meta — logiczny znacznik ustawiany przez MG,
   przeżywa recentrowanie? (Tak.)
9. **Manewry — gdzie**: paleta kierowcy na HUD-zie pojazdu (jak Uruchom/Światła) czy zakładka „Pościg” na karcie
   pojazdu? Gazu! [A], Hample [B], Obrót 180° [A], Ostrożna jazda [A], Stuknięcie [A], Zajechanie [A]. (HUD.)
10. **Pojazd trafiony serią** (D28): RO pojazdu na połowę czy pełne obrażenia przez Próg obrażeń?
11. **Rajdowiec** („podczas walki, wyścigu i pościgu”): na planszy zawsze, także poza walką? (Tak.)

### Znane braki części 1 (oznaczane na kartach albo do zrobienia)

- **Lalka a broń montowana** (D16): broń u strzelca ma wagę 0, ale lalka nie pokazuje rąk na niej i nie blokuje
  upuszczenia ani schowania; `equipped` zostaje fałszem (lalka go nadpisuje).
- **Bieg wsteczny**: pojazd zawsze obraca się w kierunku jazdy (D10 wykrywa skręty z obrotu); cofanie z ½ Szybkości
  i Utrudnieniem — tylko tekst cechy Cofanie.
- **Akcje bonusowe cech** (Gaz do dechy, Szósty bieg, Przerzutka, Slalom, Syrena, Działko wodne, Lemiesz, Uciąg,
  Ollie) — karty użycia z opisem; budżet ruchu ich nie dolicza (karta jazdy podaje Przyspieszenie).
- **Awaria 5 (dym)** — znacznik z tekstem, bez Regionu przesłaniającego wnętrze; **Paka** (Akrobatyka na początku
  tury stojących) — tekst.
- **TT w bezruchu** — tylko w walce (zmiana rundy); **spalanie** z jazdy po mapie — nie (podróż liczy karta drużyny).
- **Dźwięki** — cisza do dostawy plików (MISSING §P); grafika — atrapy.
- Rozmiar w pasku bocznym karty to etykiety dnd5e modułu (`huge` = „Ogromny”), a NOE mówi „Wielka maszyna” — rozjazd
  sprzed M4 (`tokens/README.md` też liczy Wielki = `huge`); nagłówek zakładki Pojazd pisze po NOE.
- GMT400 jeździ na atrapie Hammera — własny żeton z góry (Suburban, 1,5 × 3,5 kratki → 450 × 1050) to grafika kampanii.

### Znane braki części 2 (świadome, D31)

- **Rysunek wybuchu na planszy** — szablon rysowany w całości, może zachodzić na pojazdy, których nie trafia;
  przycięcie do trafionych pojazdów (własna grafika, bo maski tu nie działają) — **po pierwszej grze**.
- **Smugi między pojazdami** idą po obrazie (w bok, do tyłu) — zgodnie z D31, nie do naprawy.

## 11. Postęp

**2026-10-28 — komplet 14 indywidualnych wraków.** Wszystkie grafiki zapisane i
sprawdzone, w tym zaakceptowany sedan bez zmiany pliku. 13 nowych wraków czeka na ocenę MG.
`GRAFIKI_WRAKOW` wybiera obraz po podwoziu; zachowuje transformację i pełną kopię tekstury
do cofnięcia. Najechanie nie prześwietla wraku; uszkodzone wieże są częścią grafiki wraku.
**Garaż → Karta prób → Grafika: Wraki — wszystkie pojazdy**: 14 par sprawny/wrak na jednej
scenie, stały generator, sonda `grafika-wraki`. Katalog 53/53 obrazów, kolejka M4: tylko
7 dźwięków. `npm test` zielony, Quench **42/42**, E2E **20/20**, brak błędów konsoli.
Raport `logs/e2e/2026-10-28T01-55-11/`, 26 zrzutów (wraki 25–26).
Źródła, pełne prompty i pomiary: `dev/art/m4/wraki/`.
Poligon: rozbudowano dotychczasową scenę, zachowano jej 6 żetonów/aktorów i pełne
dokumenty 15 innych scen / 200 żetonów. Garaż: 16 scen / 228 żetonów. MG i Gracz 1
mają otwartą galerię, wszystkie 28 tekstur załadowane; 13 nowych grafik do oceny rano.

**2026-10-28 — zmiana decyzji MG: osobny wrak każdego pojazdu.** Zatwierdzony
`pojazd-osobowy.webp` zostaje wyłącznie wrakiem Osobówki. Zamiast czterech wspólnych
kategorii powstaje 14 osobnych grafik: Osobówka, Hammer, Motocykl, Rower, Buggy,
Ciężarówka, Autobus, Traktor, Wóz strażacki, Buldożer, M2 Bradley, M1A1 Abrams,
Motorower i Deskorolka. Pozostałe 13 wraków generowane z bazowych żetonów, z zachowaniem
bryły, skali i charakterystycznych elementów. MG zlecił autonomiczne wykonanie całej serii
i wspólny przegląd wszystkich wariantów w Poligonie rano. Wcześniejsze wpisy o wspólnych
wrakach kategorii są historyczne. Wielkość jadących nadal do osobnej rundy, bez zmian teraz.

**2026-10-28 — deskorolka i pierwszy wrak.** Ostatni z 14 pojazdów ma portret i żeton:
czarny grip, jasne kółka i przednia łatka. MG polecił powiększenie do 120%: 180×216,
obrys 0,6×0,72 kratki, widoczny 0,36×1,03 m. Trzy kopie powiększono z zachowaniem środka,
obrotu i rozmiaru jadącego; 196 innych żetonów bez zmian. Otwarte miejsce stojące nadal
jest jednym miejscem prowadzącego; test Załogi wyłącza tylko dodatkową pakę ciężarówki.
Po ocenie roweru MG odłożył regulację wielkości jadących (w aucie dobrze, na rowerze za mały).
Tego problemu nie korygowano grafiką ani zmianą skali postaci.

Wrak `tokens/wraki/pojazd-osobowy.webp`, 450×900, wspólny dla Osobówki/Hammera/Buggy,
do oceny MG. **Garaż → Karta prób → Grafika: Wrak auta osobowego**, `grafika-wrak-osobowy`:
trzy sprawne i trzy zniszczone pojazdy. `garaz-wraki.mjs` odtwarza porównanie w generatorze.
Zachowano 15 wcześniejszych scen i 200 żetonów. Garaż: Parking + 14 podglądów pojazdów
oraz porównanie wraków, razem 16 scen. Runtime bez zmian; natywny wrak pojawia się przy 0 PW,
cofnięcie przywraca oryginał. Quench **42/42**, `npm test` zielony, E2E Garażu **20/20**,
`logs/e2e/2026-10-28T01-12-07/` (25 zrzutów; wraki nr 25). Źródła: `dev/art/m4/deskorolka/`
i `dev/art/m4/wraki/`. Kolejka: 3 obrazy wraków + 7 dźwięków.

**2026-10-28 — motorower zaakceptowany; rower jako trzynasty komplet, do oceny MG.**
Stalowy rower z musztardową ramą, srebrnymi błotnikami i tylnym drucianym koszykiem.
Portret 1024×1024, żeton 180×450, obrys 0,6×1,5 (0,90×2,25 m), widoczny 0,72×2,19 m.
Wielkość względem zatwierdzonego motoroweru, kotwica zmierzona na siodle (0,50; 0,31).
Siodło `otwarta/nad`, rowerzysta stale widoczny; bez silnika i wydechu. Układ i skale postaci
jak w pozostałych podglądach. **Garaż → Karta prób → Grafika: Rower**, sonda `grafika-rower`.
Generator: Parking + 13 podglądów. Instalacja bez resetu: zachowano 13 wcześniejszych scen
i 190 innych żetonów, istniejący rower na Parkingu zaktualizowano z zachowaniem środka.
Quench **42/42**, E2E Garażu **18/18**, `npm test` zielony. Raport i 23 zrzuty:
`logs/e2e/2026-10-28T00-26-06/`, rower nr 12. Źródła: `dev/art/m4/rower/README.md`.
Kolejka: 6 obrazów + 7 dźwięków; z pojazdów została deskorolka.

**2026-10-28 — korekta wielkości motoroweru na życzenie MG.** Powiększenie do 120%:
obrys 0,6×1,56 kratki (0,90×2,34 m), żeton 180×468. Widoczna sylwetka 0,86×2,25 m.
Względna kotwica i wydech bez zmian; pionek kierowcy nie został powiększony.
Zaktualizowano katalog, generator i trzy istniejące kopie w Garażu, zachowując ich środki,
obroty i 187 innych żetonów. Bieżący podgląd zachowuje ręcznie ustawiony obrót 45°.
E2E Garażu **17/17**, `npm test` zielony; nowy rozmiar sprawdzany także po świeżym resecie.
Raport i 22 zrzuty: `logs/e2e/2026-10-28T00-15-54/`, motorower nr 11.

**2026-10-28 — motorower: dwunasty komplet grafiki, do oceny MG.** Turkusowy motorower
z kremową osłoną nóg, jednym czarnym siodłem i czerwoną skrzynką za kierowcą. Kierunek
portretu zatwierdzony. Portret 1024×1024, żeton 150×390. SVG → malowany rzut; obrys
wydłużono z 0,5×1 do 0,5×1,3, aby zachować proporcje, bez zmiany innych statystyk.
Widoczna sylwetka 0,72×1,87 m, kotwica (0,50; 0,36), wydech (0,25; 0,18).
Siodło `otwarta/nad`, pełny pionek stale nad pojazdem, bez kropek/prześwietlenia.
**Garaż → Karta prób → Grafika: Motorower**, sonda `grafika-motorower`: pusty, kierowca,
portret i odpowiednik postaci przy źródłowej skali. Jednomiejscowy podgląd ma dwa pojazdy,
bez powielania pełnej obsady. Generator: Parking + 12 podglądów. Instalacja bez resetu,
zachowano 12 wcześniejszych scen i 186 żetonów; motorower dodany na Parkingu.
Quench **42/42**, E2E `garaz-grafika` **17/17**, `npm test` zielony. Raport i 22 zrzuty:
`logs/e2e/2026-10-28T00-03-54/`, motorower zrzut 11. Źródła i pełne prompty:
`dev/art/m4/motorower/README.md`. Kolejka: 8 obrazów + 7 dźwięków.

**2026-10-27 — M1A1 Abrams: jedenasty komplet grafiki, zatwierdzony przez MG.** Portret 1024×1024,
pełny żeton i wnętrze 780×2100, osobny kadłub oraz wieża 638×1588. Geometria SVG →
malowane wnętrze → dach nad ustaloną kabiną; wspólny zewnętrzny kadłub i złożenie warstw
bez różnic pikselowych. Widoczny kadłub 3,65×7,93 m, z lufą 9,83 m; viewport 780×1680,
obrys 3,9×8,4 m, lufa wystaje poza pole. Cztery kotwice, oryginalne skale postaci.
**Garaż → Karta prób → Grafika: M1A1 Abrams**, sonda `grafika-czolg`; Parking + 11
podglądów. Instalacja bez resetu: zachowano 11 wcześniejszych scen i 175 innych żetonów,
istniejący czołg na Parkingu zaktualizowano z zachowaniem środka. Renderer wieży wspólny
z Bradleyem; niezależne celowanie nadal po becie. Quench **42/42**, E2E `garaz-grafika`
**16/16**, `npm test` zielony. Raport i 21 zrzutów: `logs/e2e/2026-10-27T22-35-25/`,
Abrams zrzuty 15–17 i 20–21. Źródła/prompty: `dev/art/m4/czolg/README.md`.
Kolejka: 10 obrazów + 7 dźwięków. Profil „diesel” jest dotychczasową kategorią mechaniki,
nie deklaracją rzeczywistego napędu Abramsa (turbina); parametrów gry nie zmieniono.

**2026-10-27 — Bradley zatwierdzony; osobna grafika wieży.** MG zaakceptował bryłę i układ
3+6, poprosił o wycięcie wieży i poprawną oś pod przyszłe celowanie. Bezstratne warstwy:
`tokens/pojazdy/kadluby/bwp.webp` (720×1350) i `tokens/pojazdy/wieze/bwp.webp` (495×627).
Złożenie daje 0 różnic pikseli względem zatwierdzonego kompletnego żetonu. `wiezaGrafiki`
przechowuje kadr, oś i wycinek; generator zapisuje je we fladze `pojazd.grafika.wieza`.
`pojazdy/wieza.mjs` rysuje górną warstwę w primary i prowadzi ją razem z kadłubem; D33
celowania i reguł pozostaje po becie. Prześwietlenie ukrywa wieżę. Własna grafika i wrak
nie dziedziczą nakładki. Brak nowych dokumentów żetonów i niezależnego kąta.
`npm test` zielony, Quench **40/40**, E2E **garaz-grafika 14/14**, brak błędów modułu;
`logs/e2e/2026-10-27T21-20-59/` (16 zrzutów). Próby: animowany skręt, wspólne drgania,
odbicie/skala, krycie/barwa/wysokość, ukrycie, własna grafika, odrysowanie i usunięcie bez
pozostawionych warstw. Garaż: `grafika-bwp`. [Podgląd osi](dev/art/m4/bwp/layers-review.html).

**2026-10-27 — M2A2 Bradley: dziesiąty komplet grafiki, według korekty MG.** Zamiast
ogólnego BWP: charakterystyczna kanciasta wieża dwuosobowa, boczny podwójny zasobnik,
pojedynczy kierowca po lewej pojazdu i przedział silnika po prawej. Załoga 3 + desant 6:
usunięto środkową trójkę siedzeń, boczne ławki po trzy zwrócone do siebie. Pojemność 9
jest świadomym WKK dla wybranego M2A2, zamiast ogólnej załogi 12 z tabeli NOE.
Portret 1024×1024 i para 720×1350, obrys 2,4×4,5 (3,6×6,75 m); widoczna bryła 3,385×6,55 m.
SVG → wnętrze → dach; cała wieża zarejestrowana nad koszem, wspólna alfa i 0 różnic pikseli
poza maską górnej zabudowy. Opcjonalne `obroty` w strefie określają początkowy kierunek
postaci na danym miejscu; później własny obrót działa dotychczasowo. D33 nadal po becie.
**Garaż → Karta prób → Grafika: M2 Bradley**, sonda `grafika-bwp`. Generator: Parking + 10 podglądów.
Dodany do żywego Poligonu bez resetu: zachowano 10 wcześniejszych scen i 155 żetonów.
`npm test` zielony, Quench **38/38**, E2E **garaz-grafika 13/13**, bez błędów modułu:
`logs/e2e/2026-10-27T20-44-08/`, zrzuty Bradleya 13–14. Źródła i pełne prompty:
`dev/art/m4/bwp/README.md`. Ocena MG otwarta. Kolejka: 12 obrazów + 7 dźwięków.

**2026-10-27 — buldożer: dziewiąty komplet grafiki.** Portret 1024×1024 i otwarty żeton
750×1200: dwie stalowe gąsienice, szeroki lemiesz, pojedynczy zrywak oraz fotel operatora
i mniejsze siedzenie pomocnika. Rama bez daszka i szyb, oba miejsca `otwarta/nad`.
Katalog 2,5×4, widoczny obrys 3,55×5,78 m. Kotwice i wydech dopasowane do obrazu,
skale postaci zachowane. Portret + SVG → żeton; kadrowanie i skalowanie równomierne.
**Grafika: Buldożer**, sonda `grafika-buldozer`; generator odtwarza dziesięć scen z Parkingiem.
Dodano nowy podgląd i pojazd bez resetu, zachowując 146 starych żetonów na dziewięciu scenach.
Packer, pomiary, świeży szablon i E2E **12/12**, bez błędów konsoli modułu:
`logs/e2e/2026-10-27T19-08-07/`, buldożer zrzut 10. Pełny `npm test` nadal zatrzymuje
niezwiązany skan flag w pliku broni. Źródła i prompty: `dev/art/m4/buldozer/README.md`.
MG zatwierdził portret, żeton, proporcje i oba miejsca 2026-10-27; kolejka 14 obrazów + 7 dźwięków.

**2026-10-27 — akceptacja bryły/proporcji wozu i poprawka przodu bez dachu.** MG zaakceptował
nową sylwetkę. Wskazał dwa koguty przesuwające się na przód przy zdjęciu dachu i nienaturalny
skrzynkowy rant. Edycja generatora usuwa lampy z dachem, zastępuje półkę niskim zaokrąglonym
brzegiem przy desce; lokalna maska zmienia wyłącznie przód cutaway. Cały dach i wnętrze poza
maską zachowane pikselowo, wspólna alfa, bez zmian obrysu, kotwic i dokumentów Poligonu.
495 537 wspólnych pikseli poza łączną maską; 0 różnic. E2E 11/11, brak błędów modułu:
`logs/e2e/2026-10-27T00-51-21/`, zrzuty 04–05. Źródła i prompt:
`dev/art/m4/woz-strazacki/front-cutaway-prompts.json`. MG zatwierdził poprawiony przód 2026-10-27;
cały komplet wozu strażackiego zaakceptowany.

**2026-10-27 — korekta bryły wozu strażackiego po odrzuceniu pierwszej pary przez MG.**
Nowy szkic z niezmienionego portretu: kabina/pompa/tył około 40/15/45% długości, węższa
sekcja panelu pompy, krótka drabina tylko na tylnej zabudowie, cztery opony wystające o 25–28 cm.
Para 600×1650, katalog 2×5,5 kratki; widoczna długość 7,70 m zamiast 8,64 m.
515 059 wspólnych pikseli poza kabiną, zero różnic i wspólna alfa. Nowe kotwice sześciu miejsc.
Trzy istniejące wozy w Garażu i wzorzec wnętrza poprawione bez resetu; środki pojazdów i skale
postaci zachowane, 137 innych żetonów bez zmian. E2E 11/11, brak błędów modułu:
`logs/e2e/2026-10-27T00-37-17/`, zrzuty 04–05. Pełny `npm test` nadal zatrzymuje niezwiązany
odczyt flagi w pliku broni. Źródła, pomiary i prompty: `dev/art/m4/woz-strazacki/README.md`.
Ocena nowej pary MG otwarta; kolejka bez zmian.

**2026-10-27 — wóz strażacki: ósmy komplet grafiki.** Portret 1024×1024 i para bezstratnych
żetonów 600×1800. Czerwono-kremowa kabina nad silnikiem, widoczna z góry pochylona szyba,
pięć foteli 3+2; szósty operator działka wodnego stale widoczny nad otwartym pomostem.
Geometria SVG → wnętrze → dach; korekta przednich kół i odbicia szyby. Wspólne 668 917 pikseli
poza maską kabiny, zero różnic; wspólna alfa. Obrys 2×6, widoczna grafika z lusterkami 2,94×8,64 m.
Skale postaci zachowane, reguły działka i odłożonych wieżyczek bez zmian.
**Grafika: Wóz strażacki**, sonda `grafika-woz-strazacki`; dziewięć scen Garażu z Parkingiem.
Instalacja bez resetu: osiem starych scen i 131 pozostałych żetonów zachowane, stojący wóz
otrzymał grafikę bez zmiany geometrii. E2E `garaz-grafika` **11/11**, bez błędów modułu:
`logs/e2e/2026-10-27T00-14-04/`, zrzuty 04–05. Packer i walidacja obrazu poprawne;
pełny `npm test` blokuje niezwiązany skan `message-flags` w `scripts/weapons/wlasciwosci.mjs:138`.
Źródła i prompty: `dev/art/m4/woz-strazacki/README.md`. Ocena MG otwarta; kolejka 16 obrazów + 7 dźwięków.

**2026-10-27 — traktor: siódmy komplet grafiki.** Portret 1024×1024 i otwarty żeton
450×750: wyblakła czerwień, cztery koła na dwóch osiach, centralne siodło i poduszka na
błotniku. Oryginalny SVG wyznacza geometrię, portret wygląd, kotwice dopasowane do wyniku.
Widoczny obrys 2,08×3,27 m w katalogowej ramce 1,5×2,5 kratki. Obie postacie `otwarta/nad`;
bez zmian skal tekstur postaci ani dotychczasowego rozmiaru miejsca 0,5 kratki. Stały przycisk
**Grafika: Traktor**, sonda `grafika-traktor`; generator tworzy Parking i siedem podglądów.
W działającym Poligonie dodano nową scenę i Parking bez resetu, zachowując 123 stare żetony.
`npm test`, packer i E2E `garaz-grafika` **10/10**, bez błędów konsoli modułu:
`logs/e2e/2026-10-26T23-44-08/` (traktor: zrzut 07). MG zatwierdził wygląd, proporcje i oba miejsca 2026-10-27.
Źródła i pełne prompty: `dev/art/m4/traktor/README.md`. Kolejka: 18 obrazów + 7 dźwięków.

**2026-10-27 — widoczna szyba autobusu.** Po uwadze MG przód portretu i zamkniętego żetonu
zmieniony na zaokrąglony, pochylony wariant inspirowany New Look/Fishbowl. Pas szkła i
wycieraczki widoczne w pionowym rzucie; prześwietlenie usuwa szybę razem z dachem.
Wnętrze zachowane pikselowo, 21 kotwic i skale bez zmian. Nowy przód komponowany lokalnie,
pozostały dach i zewnętrzne nadwozie zachowane. Walidacja pikseli, `npm test`, E2E Garażu 9/9;
`logs/e2e/2026-10-26T23-23-09/`. Obie karty Poligonu odświeżone bez resetu scen.
MG zatwierdził ostateczny komplet po korekcie szyby 2026-10-27.

**2026-10-27 — autobus: szósty komplet grafiki ukończony.** Portret 1024×1024 i zgodna para
600×2400. Zatwierdzony układ: kierowca + 20 pasażerów, pięć rzędów i wolna podłoga z tyłu.
Sylwetka/alfa wspólna, 0 różnic pikseli zewnętrznych poza dachem; bezstratny WEBP.
Nadwozie 2,575 m szerokości, grafika z lusterkami 2,915×11,515 m przy ramce 3×12 m.
Kotwice dopasowane do foteli; brak zmian skal postaci. Generator Garażu odtwarza siedem scen,
podgląd autobusu 28×25 mieści 21 grafik odniesienia w czterech rzędach. Zainstalowano na
Poligonie bez resetu sześciu wcześniejszych scen i bez zmian 78 istniejących żetonów.
`npm test`, Quench pojazdów 37/37 po przebudowie wyłącznie piaskownicowej paczki, E2E
`garaz-grafika` 9/9 bez błędów modułu; raport `logs/e2e/2026-10-26T21-13-27/`.
Źródła, prompty i kompozytor: `dev/art/m4/autobus/README.md`. Kolejka: 20 obrazów + 7 dźwięków.
Ocena estetyki MG: zatwierdzony 2026-10-27 po korekcie szyby.

**2026-10-26 — korekta skali buggy po ocenie MG.** Pierwotne 1×2 kratki dawało 1,47 m
szerokości grafiki. Dla szerokiej ramy pustynnej MG wskazał 2,03–2,13 m. Obrys katalogowy
1,4×2,8, żeton 420×840; widoczna grafika 2,055×3,835 m (alfa >8), ramka 2,10×4,20 m.
Kotwice rosną z pojazdem; skale postaci bez zmian. Spójność katalogu i podglądu zamiast
lokalnego mnożnika. Rozmiar mechaniczny Duża i pozostałe parametry zachowane.

**2026-10-26 — grafika buggy.** Piąty komplet: portret 1024×1024 i otwarty żeton 420×840,
żółta rama rurowa, dwa fotele obok siebie i silnik z tyłu. Geometria SVG → grafika; końcowe
kotwice dopasowane do foteli. Obaj jadący stale jako pełne pionki nad ramą, bez kropek;
zachowana osłona 1/2 i dotychczasowy rozmiar jadących. Podgląd pusty / kierowca / pełna obsada
w Garażu oraz pojazd na Parkingu; reset odtwarza teraz sześć scen. Starsze sceny Poligonu
zachowane bez zmian skal i pozycji. `npm test`, Quench pojazdów 37/37, E2E `garaz-grafika`
8/8 (widoczność bez najechania, celowanie, obrót i ruch obu kotwic, odtwarzanie).
Źródła i prompty: `dev/art/m4/buggy/README.md`. Ocena estetyki MG otwarta; kolejka 22 obrazy + 7 dźwięków.

**2026-10-26 — grafika ciężarówki.** Portret oraz para 600×1800: dach kabiny i wnętrze z trzema
miejscami; otwarta drewniana paka w obu wariantach. Po uwagach MG korekta v2: wnętrze
przesunięte o 26 px do zgodności z dachem; wspólna paka i reszta nadwozia skopiowane pikselowo.
Bezstratny WEBP; walidacja odkodowanych plików potwierdza 0 różniących się pikseli poza kabiną.
Kotwice kabiny i ośmiu miejsc paki dopasowane do obrazu; paka ma pełne widoczne postacie
nad podłogą, kabina pozostaje zakryta. Generator Garażu odtwarza czwarty podgląd i używa grafiki
na Parkingu. Odniesienia 11 osób układane w dwóch rzędach; bez eksperymentu 85%.
Sonda `grafika-ciezarowka`. Walidacja WEBP, `npm test`, Quench 37/37 i E2E `garaz-grafika` 7/7
zielone; raport `logs/e2e/2026-10-26T19-19-25/`. Ocena estetyki przez MG otwarta.

**2026-10-26 — podglądy grafiki częścią Garażu.** Generator odtwarza Parking i trzy sceny
Osobówki, Hammera oraz motocykla. Karta prób ma cztery skróty; Parking używa nowych grafik
i kotwic również przy starszej paczce działającego Poligonu. Nowe podglądy: rozmiary katalogowe,
stockowe postacie dnd5e ze źródłowymi skalami, portrety, puste pojazdy i pełna obsada.
Wdrożenie może zachować istniejące sceny i ręczne zmiany; Reset odtwarza wszystko ze źródeł.
Sonda `podglady-reset`. `npm test` i E2E `garaz-grafika` (6 kroków) zielone, bez błędów konsoli;
raport `logs/e2e/2026-10-26T18-52-05/`. Skrypt generatora: `dev/poligon/stations/garaz-grafika.mjs`.

**2026-10-26 — koniec eksperymentu 85%.** Na polecenie MG przywrócono pierwotne skale
postaci we wszystkich podglądach pojazdów: 39 żetonów i prototypów, 63 postacie zweryfikowane.
Podpisy i generatory podglądów poprawione. Zachowane indywidualne powiększenia postaci;
globalnego 0,85 nie wdrożono. Mechaniczne zmniejszanie jadących do 0,5 kratki pozostaje bez zmian.

**2026-10-26 — grafika motocykla i otwarte siodło.** Portret oraz żeton cruisera z dwoma miejscami.
Kotwice dopasowane do finalnej grafiki, kierowca i pasażer stale nad siodłem bez kropek.
Pojazd z wyłącznie otwartymi miejscami nie przygasa po najechaniu. Generator kompendium wybiera
`strefyGrafiki` także dla otwartej grafiki bez wnętrza. Poligon: osobna scena motocykla, sonda
`grafika-motocykl`, podgląd 120% / 85%. Quench 36/36; E2E `motocykl-art` i regresja
`pojazd-prezentacja` zielone, raport `logs/e2e/2026-10-25T23-18-10/`. Pełna W1 pozostaje odłożona.
Obsługa wieżyczek po becie zgodnie z D33; wyjątki od Ciężkiej i Utrudnienia są założeniem, nie implementacją.

**2026-10-25 — D32, otwarty właz Hammera.** Wdrożony wspólny model prezentacji miejsc:
zakryte/otwarte oraz lokalna warstwa grafiki względem nośnika. Właz pokazuje pełny żeton nad dachem,
bez kropki; kabina zachowuje dotychczasowy widok. Okno Miejsca i lista Załogi rozpoznają tylko
widocznego jadącego na otwartym miejscu. Osłona, broń montowana, własność i mechanika jazdy pozostają
niezależne. Grafiki Hammera bez zmian, osobny dach/maska odłożone. Quench pojazdów 35/35;
e2e `pojazd-prezentacja` i `pojazd` zielone, raport `logs/e2e/2026-10-25T20-33-50/`.
Poligon: istniejąca scena Hammera, sonda `wlaz-widoczny`. Fundament W1 gotowy; pełna część 3 pozostaje otwarta.

**2026-10-18 — projekt, runda 1.** Decyzje D1–D10; RAW s. 260–268 i s. 88–89 przeczytane; wykonalność jadących
sprawdzona w źródłach rdzenia 14.369 (wzorzec Regionów przypiętych do żetonu, wizja niezależna od widoczności).

**2026-10-18 — rundy 2–3.** D11–D18: własność w dwóch warstwach, kluczyki i na krótko, próba obrysu, kropki jako
uchwyty celowania, przesiadka z WKK dla zmiany rzędu, broń montowana u strzelca, wrak i wybuch baku, światła.
Znalezione po drodze: rdzeń nie obraca obrysu żetonu (§4.3); typ `vehicle` służy też za pojemnik (§4.13); darmowy
JB2A nie ma kłębów spalin — dym z natywnego `ParticleGenerator` (§4.5). Następny krok: E0.

**2026-10-19 — runda 4.** Dostęp z obecności obejmuje ładownię (bez osobnej grupy „Na siedzeniach”); montaż broni
jako Robota produkcji z nowym rejestrem skutków; naprawy, PW i odbudowa wraku zaimprowizowane wg naprawy drona i
tabeli s. 146 (D19).

**2026-10-19 (noc, agent sam) — zamówienie grafiki, E0.** MG przed wyjściem: obrys prostokątny, chyba że okaże się
*znacząco* problematyczny (wtedy kwadrat); commity na master po etapach, bez push; wolno w kampanii (migracja E1) i na
Poligonie (stanowisko Garaż). Najpierw zamówienie grafiki i dźwięków (MISSING §P, `dev/art/m4/`: 300 px na kratkę,
przód w dół, punkt rury) i atrapy `tokens/pojazdy/_placeholder/`.
*E0 — wynik: prostokąt.* Piaskownica `agent-m4-20261019`, Osobówka z czterema jadącymi: jazda po trzech odcinkach z
obrotami (w tym 180°) — 344 klatki, jadący najdalej **0,7 px** od miejsca; zamiana `width`↔`height` po dojechaniu
(pojazd bokiem 3×1,5, siatka w obrysie naturalnym 150×300 obrócona `mesh.angle`, kratki zajęte zgodnie z obrysem);
ukrycie lokalne, kropki, prześwietlenie (35%), wizja ukrytego jadącego u gracza działa. Ustalenia z rdzenia 14.369:
waypointy są zamrożone przed `preMoveToken` (nie da się dopisać zamiany obrysu do ścieżki), więc obrys i jadących
zapisuje aktywny MG po animacji jednym `moveTokens` z `displace` i `animate: false`; `_refreshState` też ustawia
`mesh.alpha` (przygaszenie trzeba nakładać w obu miejscach). Znane przybliżenia: w trakcie jazdy ramka i pole
kliknięcia mają jeszcze stary obrys; zajęte kratki dla połówek (1,5) liczy rdzeń po swojemu. Ani jedno nie psuje
mechaniki — zostaje prostokąt.

*E1 — katalog i dane.* Paczka `pojazdy` (14 aktorów, 52 cechy jako zdolności pojazdu, foldery silnikowe/mięśniowe)
z `PODWOZIA` + `KATALOG_POJAZDOW` (`dev/packs/build-pojazdy.mjs`); grafika z modułu, a do czasu dostawy atrapy.
Migracja `migrate-pojazdy.mjs` przebiegła w kampanii: GMT400 (nadpisanie: obrys 1,5×3,5, trzy rzędy — 8 miejsc,
pięć żetonów na scenach) i Hammer Posterunku dostały `pojazd = {podwozie, id}`, obrys i atrapę Hammera; okrągły kadr
z Roll20 leży we fladze `pojazd.zetonPrzed` (`api.migration.przywrocZetonyPojazdow()` go przywraca). Quench
`pojazdy` 14/14. GMT400 potrzebuje własnego żetonu z góry (Suburban, 450×1050) — to grafika kampanii, nie modułu.

*E3 — wsiadanie i miejsca.* Okno miejsc (obraz z góry, klikalne miejsca), Wsiądź / Przesiądź się / Wysiądź przez
przekaźnik MG, koszty RAW na kartach, dostęp z obecności, kropki jako uchwyty celowania (prawy klik), upuszczone w
pojeździe → ładownia (WKK), wypadanie (3k6 + Powalenie, bez RO — stosowane). Pułapki rdzenia: na aktorze żetonu
niepowiązanego `_del` nie usuwa klucza, a własność `INHERIT` zapętla `getUserLevel`; na aktorze świata `_del` w mapie
`ownership` nie przechodzi walidacji — dostęp to lista par, przywracany jawnym poziomem (INHERIT tylko u aktora świata).
*E4 — silnik.* Uruchom/Zgaś, światła (stożek 60°), kluczyki (id pojazdu, nowy dla aktora i żetonu niepowiązanego,
kopia wklejona zachowuje), na krótko; blokady: awaria 15/17, pusty bak; oznaczenia: ręce, kluczyki. Dym z
`ParticleGenerator`, drgania jednym tickerem, dźwięk tylko gdy plik jest.
*E6 — awarie, naprawy, wrak.* Tabela k20 s. 265 z ST napraw, wyzwalacze (≥ Próg awarii, porażka kierowcy o 5+),
[Zastosuj], zegary na zegarze świata (wyciek, chłodnica, rozpęd, zawieszenie, wybuch), pożar i błotnik na turze
kierowcy, karta obrażeń grupowych, naprawy przez Naprawę M2 z aktorem pojazdu jako celem, karoseria, wrak i wybuch
baku, Odbudowa. dnd5e 6: Szybkość w `movement.speeds.walk`, TT pojazdu przez `ac.flat`.
*E5 — jazda w walce.* Pojazd poza trackerem, budżet w turze kierowcy, skręty i zawracanie z ruchu (karta z testem),
trudny teren z Regionów (dnd5e liczy pola z istotami jako trudne, więc nie z kosztu drogi), potrącenie z listą istot
pod obrysem, bezruch (TT − 5), atak z jadącego pojazdu (Utrudnienie, Akrobatyka z HUD-u), domyślna osłona jadących.
*E2 — karta.* Podklasa stockowej karty pojazdu dnd5e 6 (zostają pasek boczny, cechy, ładownia, efekty, opis i obie
wcześniejsze wstawki): zakładki Pojazd, Załoga, Uzbrojenie, Awarie i naprawy; pojemniki — karta stockowa. Rejestr
skutków Roboty (`zarejestrujSkutek`): montaż broni jako Robota, broń za strzelcem (bez wagi), gotowy pojazd z
produkcji jako aktor z paczki.
*E7 — Wojownik autostrady.* Drzwi w drzwi (Rajdowiec, Konwojent, Taranowanie), Kaskader (trik z karty), Pancerna fura
(OC jako efekt w ruchu, AC [B] przy Uruchom); plakietki pokrycia, paczka `zdolnosci-klasowe` przebudowana.
*E8 — Poligon, testy.* Stanowisko **Garaż** (7 pojazdów, Osobówka z trzema jadącymi, Hammer z Browningiem na
wieżyczce, Gruzowisko, manekiny) zasiane na Poligonie — 26 sond, w tym każda decyzja D2–D18. e2e `pojazd` (MG + dwóch
graczy: wsiadanie, kropki u gracza z zewnątrz, silnik, jazda ze skrętem przez Cywila, awaria, wysiadka) zielone;
Quench całość 1229/1229 (w tym paczka `pojazdy`). Pełna bramka `release:check` — nie puszczona (Poligon zostaje otwarty:
straż `poligon:stop` liczy okna stanowisk jako ludzi, `--force` tylko na słowo MG).

**2026-10-19 — runda 5 (po nocy): pojazdy między scenami i plansza.** Pytanie MG: jak pojazd synchronizuje się
między scenami (mapa taktyczna 1,5 m, mapa regionu 1,5 km), czy jadący przechodzą razem z nim. Ustalone z kodu i
danych kampanii: wspólny stan ma tylko aktor powiązany (GMT400 tak; Hammer Posterunku i paczka — nie); miejsce
jadącego jest per scena (flaga na żetonie z id pojazdu tej sceny); obrys w kratkach psuje mapy w km i siatki inne niż
1,5 m; M4 psuje planszę pościgu (z kodu); rdzeń 14 wycina między scenami z zachowaniem id. Przyjęte: część 1b
(D20–D23) i złożona droga (D24–D31). Odrzucone po drodze: osobna skala pionków planszy (MG: pojazdy mają być w skali),
tor 4,5 m bez metryki (MG: giną zasięgi broni, cechy, wybuchy, serie), droga w prawdziwej skali (MG: wbrew abstrakcji
znaczników, ciągłe przybliżanie; zgoda najwyżej na ok. +50% planszy). Następny krok: E9.

*E9 — skala sceny.* `stan.mjs`: `kratkaPojazdu` (px na 1,5 m z siatki i jednostek sceny), `skalaPojazdu`,
`trybSceny` (taktyczna / plansza / znacznik, próg 20 px), `wymiaryZetonu`, `rozmiarMiejsca`; każdy konsument geometrii
(obrys, siatka, miejsca, kropki, prześwietlenie, potrącenie, trudny teren, rura, dym, drgania, wysiadka, odległość do
pojazdu) liczy w kratkach pojazdu, wymiary żetonów — w kratkach sceny. Nowy żeton pojazdu dostaje obrys w skali sceny;
znacznik: bez obrysu, miejsc, dymu, świateł i kart jazdy, wsiadanie odmówione; światła w jednostkach sceny (było 18 km
na mapie w km); koszt przesiadki zawsze w 1,5 m (był w metrach siatki sceny); ostrzeżenie o niepowiązanym pojeździe
drużyny. Próba w piaskownicy: dzisiejsza plansza — Osobówka z katalogu zostaje pionkiem 1×1 przodem w prawo po
przeciągnięciu i klawiszach, bez kart; siatka 3 m — 0,75×1,5, jadący 0,25 w środku, po jeździe bokiem zamiana obrysu,
po wysiadce 1×1; mapa w km — znacznik, wsiadanie odmówione. Po drodze: hak kluczyków z E4 pisał `delta.flags…` ścieżką
z kropkami — na pustej delcie (`getTokenDocument().toObject()`) walidacja odrzucała cały żeton, gdy inny hak dotknął
wcześniej źródła; teraz obiekt. Quench `pojazdy` 25/25.
*E10 — pamięć obsady.* Flaga `obsada` (pary uuid aktora / miejsce) uzgadniana w `synchronizujZaloge`: obecni na tej
scenie nadpisują swój wpis i zajęte miejsce, świadoma wysiadka (gracz, wypadnięcie, „Wysadź wszystkich”, wrak) czyści,
zdjęcie techniczne (usunięty pojazd, sprzątanie przy starcie) nie; usiąść gdzie indziej = zniknąć z pamięci innych
pojazdów. `crew`/`passengers` i dostęp z obecności liczone z pamięci. `obsada.mjs`: karta MG „Posadzić załogę?”
([Posadź] dostawia żetony postaci powiązanych z prototypu i sadza; [Pomiń] kasuje kartę) po pojawieniu się pojazdu
albo zapamiętanej postaci; sprawdzenie po całej paczce `createToken` (jeden takt MessageChannel). Próba w piaskownicy:
kierowca posadzony na A → pamięć i załoga; pojazd na B (siatka 3 m) → karta, [Posadź] dostawia żeton 0,25 i sadza, na A
dalej siedzi; usunięcie pojazdu z B — pamięć zostaje, ponowny pojazd → karta, istniejący żeton użyty; wysiadka → pamięć
i załoga puste; postać dostawiona na B do stojącego pojazdu → karta.
*E11 — Ctrl+X / Ctrl+V z załogą.* `schowek.mjs`: `TokenLayer#_getCopyableObjects` dorzuca jadących zaznaczonego
pojazdu; `pasteToken` daje pojazdowi klucz `schowek`, a jadącym ten klucz zamiast id i rozmiar miejsca sceny
docelowej; po paczce aktywny MG przepina ich na nowy żeton i ustawia na miejscach (`instrukcjePoRuchu`). Jadący bez
swojego pojazdu w schowku wraca do własnego rozmiaru. Mapa-znacznik: jedzie sam pojazd — powiązani znikają ze sceny
źródłowej (zostają w pamięci), niepowiązani zostają obok z ostrzeżeniem i wypadają z pamięci. Karta „Posadzić?” milczy,
póki pojazd czeka na przepięcie. Próba w piaskownicy: niepowiązana Osobówka (PW 33) z jadącym powiązanym i bandytą,
Ctrl+X z mapy 1,5 m → Ctrl+V na 3 m: pojazd 0,75×1,5 z PW 33, obaj na miejscach (0,25, w obrysie), bez karty; Ctrl+C /
Ctrl+V na tej samej scenie: dwa pojazdy, każdy ze swoimi dwoma jadącymi; Ctrl+X oryginału na mapę w km: na mapie sam
pojazd, żeton powiązanego zniknął, bandyta stoi obok, w pamięci — tylko powiązany.

*P1 — plansza od nowa.* `poscig.mjs`: `LANE_W` 280, `grid.distance` = `METRY_TORU_NA_OBRAZIE` (6 m — 70 px na 1,5 m),
`wersja: 2` we fladze, `staraPlansza()` (ostrzeżenie MG na starej planszy); pionki w prawdziwej skali przodem w prawo
(`wymiaryPionka`: pojazd z katalogu z obrysu, inny — prototyp w kratkach 1,5 m) z obrotem już w danych tworzenia
(inaczej obrys liczył się z obrotu 0 i autobus lądował o tor obok), rzędy wg wysokości (`yWTorze`). Pas zostaje 880 px
(ok. 19 m jezdni). `poscig-snap.mjs` (D25): łatka na `Token#_updateDragDestination`/`#_addDragWaypoint` wymusza
przyciąganie na planszy (Shift nie robi połówek), bezpiecznik MG dociąga pionek po ruchu spoza ścieżki,
recentrowanie przesuwa też kafelki, światła, rysunki i szablony w pasie; jadący wyłączeni z przyciągania i z obrotu
planszy, a kołysanie pojazdu niesie jego jadących (`poscig-motion.mjs`). Plakietka toru na pojeździe
(`poscig-canvas.mjs`). M4: bezpiecznik obrysu po utworzeniu żetonu pojazdu. Próba: Osobówka 210×105 px i Hammer na
środkach torów, autobus 560×140 w rzędzie pod Osobówką; jadący 35 px w obrysie, zmiana toru bez kart jazdy i obrotu,
pół toru obok → dociągnięcie, recentrowanie z jadącym, plakietka = numer toru z przesunięciem. Quench `poscig` 61/61,
`pojazdy` 25/25; e2e `poscig` (z nowym krokiem D25 i pomiarami FPS), `nevada-art`, `urban-art` zielone — testy liczą
pozycje z `torX`/`LANE_W`, kontrola „między torami” to żeton bez roli pościgu (pionków D25 nie wypuszcza z toru).

*P2 — metryka drogi.* `scenes/droga.mjs`: współrzędne drogi (S wzdłuż: 36 m × tor środka wyspy + przesunięcie w
prawdziwych metrach; T w poprzek: prawdziwe metry), wyspy = prostokąty pionków (+1,5 m), jadący → swój pojazd; łatka na
**prototypie** `SquareGrid#_measurePath` dla scen planszy (pierwsza wersja łatała instancję — rdzeń buduje siatkę sceny od
nowa przy każdym resecie danych, łatka ginęła po cichu); ruch żetonu (punkty z `action`/funkcją kosztu) — goła droga.
Konsumenci: linijka i zasięgi przez `measurePath`, `odlegloscKrawedzi` (gałąź planszy: środki, promienie, sąsiednie pole
1,5 m), `measureMeters` (plansza — metryka; poza planszą zostaje linia prosta, bo tak liczyło od v14: wywołanie
`measurePath([{A, B}])` było złe, a `measureDistance` już nie ma), sygnał dronów zdalnych. Reguła D27 w
`ARCHITECTURE.md` §11. Quench `poscig` 67/67 (przykład MG z dwoma autobusami: 27,4 m do przodu, w jednym autobusie 9 m,
siatka planszy: linijka po drodze, ruch o dwa tory 72 m). Próba na żywej planszy (autobusy w torach 1 i 2, rzędy 4,5 m,
strzelec z przodu A, cel z tyłu B, na obrazie cel za strzelcem): linijka 25,8 m, krawędź 26,5 m, rzut 25,8 m (piksele
dałyby 6,2 m), ruch o tor 36 m, o dwa — 72 m.

*P3 — jadący na planszy.* Część 1 działa na planszy bez zmian (wyspy w prawdziwej skali, pojazd zawsze „jedzie”,
domyślna osłona i atak z jadącego pojazdu z części 1). Doszła karta MG „Rola w pościgu?” ([Ścigany] / [Ścigający] /
[Poza pościgiem], `ustawRole`) dla pojazdu, który stanął na planszy bez roli — wklejony z mapy albo upuszczony z paska
nie liczyłby się do przewagi i recentrowania. Nowa suita e2e `poscig-jadacy` (MG + dwóch graczy) zielona: Gracz 1
kierowcą powiązanej Osobówki na mapie → Ctrl+X / Ctrl+V na nową planszę (pojazd 210×105 px przodem w prawo na torze 3,
jadący 35 px, mapa pusta, karta roli), Gracz 1 prześwietla swój pojazd, Gracz 2 widzi kropkę i nie widzi jadącego,
przesiadka w rzędzie — karta „Pojazd jedzie”, zasięg do Hammera trzy tory dalej ≈ 108 m (piksele dałyby < 30 m), zmiana
toru: kierowca w środku, bez obrotu i bez karty jazdy.

*P4 — serie i obszary.* `scenes/poscig-serie.mjs`: czysta geometria w przestrzeni drogi (`trafieniLinia` — pas linii
przez punkty miejsc i prostokąty pojazdów, `trafieniObszar` — koło / sześcian), cele planszy (jadący, pojazdy, reszta
w pasie; własny pojazd strzelca pominięty). Serie: `dnd5e.preCreateMeasuredTemplate` → `false` dla Długiej i
Miażdżącej na planszy, w zamian `pickCanvasPoint` z nowym `onPreview` (obwódki trafionych na żywo, smuga od strzelca do
kursora, licznik) i karta MG „trafieni na drodze” z [Zaznacz trafionych] / [Zaznacz pojazdy] — dalej zwykły przycisk RO.
Wybuch ładunku na planszy (`_spawnExplosiveMarker`) → ta sama karta. Ogień zaporowy: `_templateContainsToken` na planszy
— punkt wirtualny; strefa położona na pojeździe przypięta do jego żetonu (Region `attachment.token`, rdzeń 14 przesuwa
ją z pojazdem — D29). Quench `poscig` 72/72 (Miażdżąca wzdłuż rzędu: cztery znaczniki; Długa: następny; skos przez
rzędy; cały rząd siedzeń; wybuch nie sięga sąsiedniego rzędu o znacznik dalej). e2e `poscig-jadacy`: Miażdżąca kierowcy
na wóz bandytów dwa tory dalej — oba wozy i obaj jadący na karcie, własny pojazd poza listą; granat na Hammerze — tylko
Hammer; strefa na Hammerze przypięta, po zmianie toru jadący Hammera w strefie, drugi wóz poza nią.

*P6 (część) — Poligon i bramka.* Stanowisko **Pościg** przebudowane (plansza z fixture + Złożona droga z Osobówką graczy,
Hammerem i Autobusem bandytów z jadącymi, Parking z Buggy, Mapa regionu w km; sondy D21–D31) i zasiane na Poligonie
(strona MG Poligonu siedziała na starym grafie importów — twarde przeładowanie przez CDP). `release:check` na `88b630b`:
static, generatory, zip, paczki, wersje — zielone; piaskownica: wszystkie suity e2e w obu światach zielone poza
niezmiennikiem Obsady w suicie `poligon` (Drzwi w drzwi i Pancerna fura — automatyczne od E7, bez persony; dodane do
`COVERAGE` w `dev/poligon/roster.mjs`), Quench 1250/1251 (test sygnału drona na planszy pisany w pikselach toru 200 px —
pozycje z `torX`, plus nowy test złożonej drogi: tory × 36 m, w poprzek i w górę prawdziwe metry). Po poprawkach
(`490adc1`): **`release:check` zielony** — wszystkie kroki, wszystkie suity e2e w obu światach, Quench 1252/1252
(`logs/release/0.20.0-2026-10-19T15-49-55.json`). Na żywym Poligonie dobudowane dwie persony pokrycia (Obsada 44); jego
`coverage()` zgłasza jeszcze „Złomiarz” — stara persona Szczura sprzed `PROF_SZTUCZKA`, poza M4 (`poligon:obsada
--only=szczur-5 --rebuild`).
