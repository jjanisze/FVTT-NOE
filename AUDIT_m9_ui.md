# M9 — inwentaryzacja interfejsu przed przebudową

**2026-11-15 · Foundry 14.369 / dnd5e 6.0.6 · audyt wstępny E1.**
Zakres obejmuje **33 rodziny powierzchni do przeglądu**, opisane poniżej. To jednostki planowania,
nie liczba osobnych projektów graficznych. Wspólne okno, wiersz, przycisk czy karta czatu mają dostać
jeden komponent i reguły wariantów. Zatwierdzony profil ikon i paleta pozostają w
[M9 §0](PLAN_m9_style.md#locked-style).

Przed tym audytem Chrome służył do rozwoju i kontroli lokalnej tablicy ikon. Nie był to przegląd
działających kart Foundry. Teraz zarejestrowano **14 rzeczywistych widoków w istniejącej piaskownicy**:
[galeria „przed”](dev/visual/reference/2026-11-15/index.html),
[manifest z rejestrami runtime](dev/visual/reference/2026-11-15/manifest.json).
Otwierano istniejące karty i zmieniano zakładki; nie zatwierdzano akcji, rzutów ani formularzy.
Pełny audyt wizualny wszystkich zakładek, ról i przepływów pozostaje zadaniem E1/E3–E5.

**Uzupełnienie graficzne:** [dwa nowe tła zastępujące smoka PC i osiem prób na karcie](dev/art/m9/index.html).
[M9 §6](PLAN_m9_style.md) dodaje siedem grup grafiki do rozstrzygnięcia: banery, materiały,
odznaki, ornamenty, podkłady klas/typów, grafiki zastępcze i podkłady małych powierzchni.
To assety dla poniższych 33 rodzin, a nie dodatkowe rodziny ekranów. **MG: Workshop zachować,
generowany rysunek odrzucić.** [Przegląd 02](dev/art/m9/r02/index.html) dodaje sześć nowych kierunków
i 21 prób na karcie; formalne motywy korzystają z oryginalnych rysunków/map i fotografii, z zachowaniem ich geometrii.
[Przegląd 03](dev/art/m9/r03/index.html): MG szczególnie polubił fizyczny nylon; cztery rozwinięcia
siatki rip-stop, MOLLE i szycia + oryginał, 15 prób na karcie. **MG wybrał oryginalny Field kit dla głównej
karty postaci**, dokładny PNG i hash w [zapisie wyboru](dev/art/m9/selection.json). Warianty z przeglądu 03
nie są wybrane dla PC; grafika pozostałych kart pozostaje otwarta.

## Co zostało policzone

| Jednostka | Stan na dzień audytu | Znaczenie dla M9 |
| --- | --- | --- |
| Główne karty aktorów NOE | **4**: PC, BN, pojazd, drużyna | Każda ma własną strukturę i wymaga bezpośredniego przeglądu |
| Deklarowane zakładki tych kart | **27**: 8 + 6 + 8 + 5 | Część warunkowa; nie wszystkie 27 występuje jednocześnie |
| Typy Item w dostarczanych kompendiach | **9** | Wspólna karta `ItemSheet5e`, różne treści/zakładki |
| Zarejestrowane typy aktywności | **22**, w tym **9 NOE** | Rejestr typów, nie 22 unikatowe układy edytora ani dowód użycia każdego typu |
| Własne dodatkowe klasy ApplicationV2 | **11** | Lalka, zdrowie, dwa okna pojazdu, siedem okien postoju/handlu |
| Wywołania DialogV2 | **126 miejsc w 67 plikach** | 60 `wait`, 30 `prompt`, 36 `confirm`; wspólna oprawa + przegląd treści przepływów |
| Tworzenie wiadomości czatu | **232 miejsca w 97 plikach** | To producenci danych, nie 232 projekty kart |
| Hooki renderowania czatu | **52 rejestracje w 50 plikach** | Wiele funkcji dopisuje przyciski/adnotacje do tej samej wiadomości |
| Szablony modułu | **25 plików HBS** | Także fragmenty; wiele okien powstaje inline albo dziedziczy szablony dnd5e |
| Kompendia | **19**, razem **934 rekordy najwyższego poziomu** | 836 Item, 72 Actor, 26 RollTable; dane, nie osobne projekty UI |
| Unikatowe obrazy w tych rekordach | **592**, w tym **518 ścieżek do ikon modułu** | Dolna granica audytu odwołań; nie obejmuje wszystkich embedded Items/aktywności/lookupów |
| Pliki w `icons/` | **1716**: 951 SVG, 345 WEBP, 420 PNG | Mastery, wrappery, wyniki i warianty; nie 1716 niezależnych tematów do narysowania |
| Ścieżki ikon po pominięciu rozszerzenia | **954** | Nadal obejmują warianty; dokładną liczbę tematów/eksportów ustali manifest E1 |

Źródła: odczyt rejestrów i indeksów kompendiów w piaskownicy oraz
[inwentarz kodu](dev/visual/source-inventory.json), odtwarzany poleceniem
`node dev/visual/audit-sources.mjs`. Analiza obejmuje importy osiągalne z `scripts/main.mjs`, bez testów.
To analiza leksykalna, nie pełny AST: pośrednie fabryki i wyrażenia w template literalach wymagają
ręcznego sprawdzenia. Liczby wywołań nie oznaczają liczby odmiennych ekranów.

## 33 rodziny powierzchni

Status **zrzut** oznacza reprezentatywną próbkę, nie zakończony odbiór rodziny.
Status **źródła** oznacza potwierdzone miejsce w implementacji/rejestrze, wymagające jeszcze próby wizualnej.

### Karty i edytory — 8 rodzin

| ID | Rodzina | Zakres / właściciel | Dowód i dalszy przegląd |
| --- | --- | --- | --- |
| 01 | PC | `NeuroshimaCharacterSheet`: nagłówek, portret, PW/KW, stany, pas, ulubione, ekwipunek, zasoby, produkcja, cechy/PD, zdolności, efekty, biografia | **Zrzuty** ekwipunku, zdolności, zasobów; pozostałe zakładki i tryb edycji do próby. [Shell](scripts/actors/sheet-shell.mjs) |
| 02 | BN | `NeuroshimaNPCSheet`: statystyki, akcje, ekwipunek, zasoby, efekty i warianty towarzysza/drona/wierzchowca | **Zrzuty** BN, drona i konia. Te warianty nie są dodatkowymi zarejestrowanymi rodzinami kart |
| 03 | Pojazd | `KartaPojazdu`: parametry/paliwo, załoga/miejsca, ładownia, uzbrojenie, awarie, efekty, opis | **Zrzuty** przeglądu i awarii; pojazd uzbrojony i obsadzenie załogi do próby. [Karta](scripts/pojazdy/karta.mjs) |
| 04 | Drużyna | `NeuroshimaGroupSheet`: członkowie, podróż/transport, ekwipunek, zapasy, postój, kronika | **Zrzuty** członków i postoju. Własny nagłówek i listy; nie mieści się w próbie PC. [Karta](scripts/actors/party-sheet.mjs) |
| 05 | Przedmiot / treść | `ItemSheet5e`: broń, sprzęt, consumable, loot, tool, feat, class, subclass, background | **Zrzuty** broni i zdolności; reszta typów oraz szczegóły/aktywności/efekty/rozwój do próby |
| 06 | Edytor aktywności | Wspólne pola identity/activation/effect i szczegóły typu, w tym dziewięć typów NOE | **Zrzut** `AttackSheet`; przeładowanie, serie, narzędzia i pozostałe używane warianty do próby |
| 07 | Tworzenie i rozwój postaci | AdvancementManager, wybór klasy/profesji/Pochodzenia/Sztuczki, granty i wybory biegłości | **Źródła**: natywne `module/applications/advancement/` dnd5e oraz lookupy i buildery NOE; wszystkie kroki, wybór i cofanie do próby |
| 08 | Edytor ActiveEffect | Aktywność, czas trwania, zmiany i powiązanie ze źródłem | **Źródła**: natywne `module/applications/active-effect/` dnd5e; stan aktywny na karcie i edycja do próby |

Deklaracje zakładek runtime: PC `inventory, zasoby, produkcja, details, features, effects, biography,
specialTraits`; BN `features, inventory, zasoby, effects, biography, specialTraits`; pojazd
`pojazd, zaloga, inventory, crew, uzbrojenie, awarie, effects, description`; drużyna
`members, inventory, zapasy, postoj, biography`. W pojeździe stockowe `crew` i NOE `zaloga` są
wariantami, a `uzbrojenie` zależy od wyposażenia. Lista deklaracji nie zastępuje kontroli widocznych zakładek.

### Natywne przepływy użycia/rzutu — 5 rodzin

| ID | Rodzina | Zakres / właściciel | Dowód i dalszy przegląd |
| --- | --- | --- | --- |
| 09 | Wybór i użycie aktywności | ActivityChoiceDialog, ActivityUsageDialog, wybór celu/zasobu tam, gdzie występuje | **Zrzut samej powłoki użycia**, otwartej bez uruchamiania aktywności z minimalną konfiguracją. Pełne przepływy zużycia nadal do próby |
| 10 | Rzut ataku | AttackRollConfigurationDialog; broń, tryb, premie, Ułatwienie/Utrudnienie, kontrolki NOE | **Źródła**: natywne aplikacje dice i hooki NOE; właściwy dialog i wynik do próby |
| 11 | Rzut obrażeń / leczenia | DamageRollConfigurationDialog, dodatkowe kości, typy i podsumowanie | **Źródła**; normalny/krytyczny rzut, redukcje i przyciski do próby |
| 12 | Test / RO / umiejętność / narzędzie | D20RollConfigurationDialog, SkillToolRollConfigurationDialog i wspólna baza | **Źródła**; inicjatywa, charakterystyka, RO, umiejętność i narzędzie jako warianty |
| 13 | Odpoczynek | Krótki i długi odpoczynek, własna obsługa NOE | **Źródła**: [rest](scripts/config/rest.mjs), [czynności odpoczynku](scripts/actors/rest-activities.mjs); zasoby, wybory i podsumowanie do próby |

### Własne dodatkowe okna — 11 rodzin

Wszystkie poniższe klasy zostały znalezione w aktywnym grafie importów. Wymagają oddzielnej próby
wizualnej; obecne zrzuty kart nie dowodzą wyglądu tych okien.

| ID | Rodzina / klasa | Właściciel |
| --- | --- | --- |
| 14 | Lalka / `DollPanel` | [doll-panel.mjs](scripts/actors/doll-panel.mjs) |
| 15 | Kalendarzyk zdrowia / `KalendarzykZdrowia` | [rekonwalescencja.mjs](scripts/actors/rekonwalescencja.mjs) |
| 16 | Miejsca w pojeździe / `OknoMiejsc` | [okno-miejsc.mjs](scripts/pojazdy/okno-miejsc.mjs) |
| 17 | Paleta czynności pojazdu / `OknoPalety` | [paleta.mjs](scripts/pojazdy/paleta.mjs) |
| 18 | Bebeszenie / `BebeszenieOkno` | [bebeszenie.mjs](scripts/postoj/bebeszenie.mjs) |
| 19 | Cennik MG / `CennikMG` | [cennik.mjs](scripts/postoj/cennik.mjs) |
| 20 | Szkic doby / `DobaOkno` | [doba-okno.mjs](scripts/postoj/doba-okno.mjs) |
| 21 | Handel / `HandelOkno` | [handel.mjs](scripts/postoj/handel.mjs) |
| 22 | Przeskok czasu / `PrzeskokOkno` | [przeskok.mjs](scripts/postoj/przeskok.mjs) |
| 23 | Stół wymiany / `StolWymiany` | [stol-wymiany.mjs](scripts/postoj/stol-wymiany.mjs) |
| 24 | Szabrowanie / `SzabrowanieOkno` | [szabrowanie.mjs](scripts/postoj/szabrowanie.mjs) |

### Powierzchnie wspólne i poza kartą — 9 rodzin

| ID | Rodzina | Zakres / właściciel | Dowód i dalszy przegląd |
| --- | --- | --- | --- |
| 25 | Pozostałe formularze i potwierdzenia NOE | DialogV2: leczenie/stany, amunicja, produkcja, handel, podróż, pojazdy, decyzje MG; konfiguracja NOE | **Źródła**: 126 punktów wywołania w [inwentarzu](dev/visual/source-inventory.json). Wspólna powłoka, a treści grupowane po przepływie, nie osobna skórka dla każdego wywołania |
| 26 | Dziennik czatu i karty wyników | Użycie, atak, obrażenia, testy, podróż/postój/produkcja; tray, Fuksy/Forsowanie, adnotacje i kontrolki po rzucie | **Źródła**: [chat-message-data](scripts/config/chat-message-data.mjs), [chat-card-dom](scripts/config/chat-card-dom.mjs) i hooki z inwentarza. Potrzebne pełne/zwinięte karty, whisper i uprawnienia gracza |
| 27 | Dymki mowy na canvas | Core `ChatBubbles`, `templates/hud/chat-bubble.hbs` Foundry; osobny komponent od wiadomości czatu | **Źródła**: core `client/canvas/animation/chat-bubbles.mjs`; brak własnego override znalezionego w module. Długi tekst, kontrast na mapie i rozmiar do próby |
| 28 | Paski i panel walki/tury | Pasek zdolności, skróty, budżety i ostrzeżenia M8, selekcja, zwijanie, combat tracker | **Źródła** i elementy widoczne na zrzutach; pełna próba walki potrzebna. [Pasek](scripts/actors/ability-hotbar.mjs), [panel ekonomii](scripts/actors/ekonomia-karta.mjs) |
| 29 | Token HUD i stany na tokenie | Przyciski stanów, poziomy, wybór aktywnego efektu, nakładki canvas | **Źródła**: [levelled-conditions](scripts/actors/levelled-conditions.mjs), kontrolki ruchu/środowiska; rastry i tekstury także bez CSS karty |
| 30 | Plansza i kontrolki pościgu | Legenda, znaczniki, tura, kontrolki i panele na canvas | **Źródła**: [poscig-ui](scripts/scenes/poscig-ui.mjs), [poscig-canvas](scripts/scenes/poscig-canvas.mjs); zgodność sygnałów UI i czytelność na istniejącej planszy do próby |
| 31 | Kamera drona i OSD | Stan, sterowanie, sygnał, celowanie i napisy OSD | **Źródła**: [drony-osd](scripts/actors/drony-osd.mjs), [obraz](scripts/actors/drony-obraz.mjs). Zachować uzasadniony, funkcjonalny charakter OSD; sprawdzić kontrast |
| 32 | Tooltipy, popovery, menu kontekstowe i komunikaty | Karta przedmiotu przy hover, powody niedostępności, opisy stanów, ostrzeżenia, błędy i focus | **Źródła**: współdzielone komponenty Foundry/dnd5e i `.neuro-stan-tip`; próba klawiaturą, bez hover oraz długich polskich opisów |
| 33 | Kompendia, sidebar i listy wyboru | Miniatury, etykiety źródła, drag/drop, wyszukiwanie i selektory dokumentów | **Źródła/runtime**: 19 kompendiów; prawdziwe małe konsumery 16/24/32 px do próby. Większy glif na karcie nie rozwiązuje automatycznie miniatur |

## Co zmienia obejrzenie istniejących kart

- **Filtr PC zmienia kolory całego okna.** Runtime pokazał `sepia(0.15) contrast(1.05) brightness(0.85)`
  na PC i `none` na BN, pojeździe, drużynie, ItemSheet i edytorze aktywności. Wdrożenie palety wymaga
  usunięcia filtra PC i ustawienia powierzchni komponentami, zgodnie z zatwierdzonym profilem.
- **Rozmiar 44 px ma koszt układu.** Gęste wiersze zdolności/ekwipunku, kolumny użyć, podaktywności
  i długie nazwy potrzebują rzeczywistej próby. Nie wystarczy podmiana pliku przy dotychczasowym CSS.
- **Oprawa 5e nadal dominuje poza glifem.** Złote obwódki i ornamenty, tarcze statystyk, szeryfowe
  nagłówki/etykiety, czerwone belki i graficzne tła są widoczne w obecnych kartach. M9 musi objąć
  hierarchię, typografię, powierzchnie i kontrolki. Bieżący font bazowy okien to Signika;
  zrzuty pokazują też odrębne style tekstu wewnątrz kart.
- **Karty nie mają jednego układu.** BN ma inne statystyki i kolumny niż PC; pojazd — techniczny
  sidebar/paliwo/załogę; drużyna — podróż i duże listy członków. Każda potrzebuje próbki przed/po.
- **Stany wychodzą poza listę ikon.** PW/KW, wyczerpanie, zranienia, skażenie, paliwo, amunicja,
  budżet tury i dostępność operacji muszą dzielić jednoznaczne sygnały, przy zachowaniu odrębnych znaczeń.
- **Czat ma wielu producentów.** Wspólny komponent wyniku i przycisku powinien obsłużyć treści
  z wielu podsystemów; ręczne poprawianie każdego fragmentu utrwaliłoby różnice.

## Następne dowody i granice audytu

1. **E1b:** przypisać konsumentów ikon i typy treści do semantycznego manifestu; policzyć właściwe mastery
   i eksporty po odjęciu wrapperów, starych wariantów i wspólnych ścieżek. Odwołania z embedded Items,
   aktywności, lookupów cech, stanów i HUD uzupełniają dolną granicę 518 ścieżek.
2. **E1/E3:** zaprojektować wspólne tokeny i komponenty, następnie pokazać pionowy wycinek:
   PC ekwipunek + zdolności + jeden pełny przepływ użycia/rzutu + wynik na czacie.
   Rzeczywista próba 44 px sprawdza liczbę widocznych wierszy, długie nazwy, koszt i stan.
3. **E4:** przenieść sprawdzony język na BN, pojazd, drużynę, ItemSheet, rozwój, zdrowie i okna postoju.
   Każdy ID 01–33 dostaje właściciela, status zmiany lub świadomego zachowania oraz dowód.
4. **E5/E6:** pełna biblioteka, czat, HUD/canvas i odbiór gracza/MG. Próby jasne/ciemne, małe okna,
   lista pusta/długa, edycja/odczyt, brak uprawnień, brak zasobu, aktywne + wyczerpane oraz brak danych.

W obecnej próbce nie sprawdzono wizualnie wszystkich 27 deklaracji zakładek, 11 dodatkowych okien,
pełnych dialogów rzutu, tworzenia/awansu, kart czatu, dymków, pościgu, OSD i obu ról/motywów.
Są jawnie wpisane do zakresu, a nie zaliczone na podstawie samego znalezienia klasy w kodzie.

Zarejestrowana stockowa karta `EncounterActorSheet` oraz nieużywane w kompendiach typy race/spell/
container/backpack/facility wymagają kontroli zgodności wspólnych stylów, gdy mają zastosowanie;
nie są obecnie dodatkowymi głównymi rodzinami NOE. Samo istnienie komponentu w dnd5e nie tworzy
wymagania osobnego projektu. Poligonowe i deweloperskie panele diagnostyczne pozostają narzędziami testów.

## Odtwarzanie materiału

`node dev/visual/audit-sources.mjs` odtwarza inwentarz kodu i plików ikon.
`node dev/visual/capture-audit.mjs --date=YYYY-MM-DD` wymaga gotowej sesji GM w istniejącej
piaskownicy agenta i aktorów przykładowych z obecnego zestawu. Nie uruchamia świata ani nie resetuje Poligonu.
`--only=pc-inventory,npc-features` odświeża wybrane istniejące wpisy danego dnia.
`node dev/visual/build-gallery.mjs dev/visual/reference/YYYY-MM-DD` tworzy galerię offline z manifestu.
Wyniki nie zawierają adresów połączenia, portów ani ścieżek użytkownika.
