# M9 — historia przeglądów (do 2026-11-16)

> Przeniesione z [PLAN_m9_style.md](../../../PLAN_m9_style.md) 2026-11-16 bez zmian merytorycznych; linki dostosowane
> do nowej lokalizacji, dopisany krótki zapis przeglądu 04.
> **Materiał historyczny.** Źródłem prawdy jest [§0 planu](../../../PLAN_m9_style.md#locked-style) i
> [profil `noe-m9-r07-v1`](../../icons/finish/style-profile.json). Warianty odrzucone nie są otwartymi pytaniami
> ani upoważnieniem do zmiany zatwierdzonego profilu. Tablica przeglądu ikon żyje w vaulcie kampanii
> (`Integracje/icon-design-2026-10-18/`), poza tym repozytorium.

## 1. Ustalenia MG z rozmowy — 2026-11-15

| ID | Ustalenie | Konsekwencja |
| --- | --- | --- |
| D1 | Funkcjonalnie, pragmatycznie, użytkowo; skojarzenie z JA2, współczesne affordancje | Jasne operacje, stany, selekcja, hover i focus; sprzętowy charakter zamiast ozdób |
| D2 | Grafit / metal blisko obecnej karty to właściwy punkt wyjścia | Mała zmiana bazowych powierzchni; własna hierarchia i detale NOE |
| D3 | Ikony mają lepiej komunikować koszt, użycia i dostępność, a całość być spójna | Oddzielne kanały informacji i wspólne komponenty między ekranami |
| D4 | Częste rozmowy i przeglądy; potok po ustaleniu decyzji | Najpierw konkretne porównania, potem receptura i eksport próbny |
| D5 | Własna oprawa kart przed betą, ikony jako część większej pracy | Samo pokolorowanie biblioteki nie zamyka M9 |
| D6 | Pierwszy przegląd: ramki i nakładki zasłaniają gęsty glif; nawet białe mastery przy 32 px są zbyt drobne | Chronimy całą powierzchnię glifu. Koszt/użycia/stan poza grafiką; próba większa o około 1/3 |
| D7 | Colored ground wymaga większego kontrastu we wszystkich przypadkach | Wersja 04: biel glifu i głębsze barwne tło; próg próbki 10:1 jest propozycją techniczną, nie dowodem czytelności małego glifu |
| D8 | Przegląd kolorów musi obejmować wszystkie klasy i kompletną proponowaną listę | Każdy wariant pokazuje 6 klas i 13 pozostałych rodzin; źródło/HEX są jawne |
| D9 | MG proponuje znaki akcji BG3 jako kształt + kolor | Wersja 04 testuje koło A, trójkąt B i czteroramienną gwiazdę R poza glifem; litery pozostają. Niebieski kwadrat I to osobna propozycja NOE |
| D10 | Niedostępność ma być wyraźniejsza: istniejący glif z czerwoną ukośną kreską i obrysem | Wersja 07 testuje wąski czerwony skos z ciemną lub podwójną obwódką; glif zachowuje pełną nieprzezroczystość |

**Korekta po D6:** wersja 03 tablicy zaczyna od **44 px bez ramki i nakładek**, wobec białego mastera 32 px.
44 px to propozycja do oceny (około +1/3, dokładnie +37,5%), nie zaakceptowany docelowy rozmiar.
Wariant z ramką i nakładkami zachowany jako poprzedni eksperyment. Nie jest już rekomendacją.

## 2. Warianty badane przed zamknięciem — zapis przeglądu

| ID | Wybór | Warianty / punkt startowy |
| --- | --- | --- |
| V1 | Paintjob | Ciepła stal / neutralny grafit / chłodniejsza stal taktyczna. Start: ciepła stal |
| V2 | Miejsce koloru | Jasny glif + akcent źródła / kolorowy glif / mocniej barwione tło. Różne receptury dla tożsamości, zdolności i sprzętu |
| V3 | Obudowa glifu | Po D6: bez ramki. Obudowa panelu/wiersza może budować styl bez zabierania pikseli grafice |
| V4 | Informacja operacyjna | Po D6: poza glifem. Porównujemy układ wiersza, podpisy skrótu i ewentualny osobny pas obok |
| V5 | Paleta źródeł | Sześć klas, neutralne współdzielone, Sztuczki, Pochodzenia, kilka rodzin sprzętu — punktem wyjścia paleta studium |
| V6 | Powierzchnie i litery | Grafitowe panele, oszczędny metal; tekst użytkowy, liczby/podpisy techniczne. Dobór z istniejących fontów z polskimi literami |
| V7 | Stan bez ikony / brak danych | Jawny tekst i znak zastępczy; brak danych nie może wyglądać jak gotowość |
| V8 | Rozmiar roboczy | 32 px jako punkt odniesienia; propozycja 44 px, porównanie 48/64 i kosztu większej wysokości wiersza |
| V9 | Znaki ekonomii akcji | Wzorzec BG3: zielone koło A, pomarańczowy trójkąt B, magentowa gwiazda R; rozszerzenie NOE: niebieski kwadrat I. Przełącznik porównania z samymi literami |
| V10 | Podział receptur według roli treści | Wersja 05: fizyczny sprzęt jako goły kolorowy/jasny glif; tożsamości i zdolności na barwnym tle; zwykłe czynności gołe. Propozycja do porównania, bez zamknięcia decyzji |
| V11 | Osiem wyraźniejszych kolorów źródła | Wersja 06: szersza paleta, alternatywa z jasnym Pochodzeniem i poprzednia stonowana paleta jako punkt odniesienia. Do wyboru MG |
| V12 | Obrys kreski niedostępności | Wersja 07: czerwony skos z ciemnym obrysem albo dodatkową jasną krawędzią. Poprzedni sam tekst zachowany do porównania |

**Dalsza próba obudowy:** po usunięciu pozostałości grubego paska źródła MG zaproponował jego kolor na głównym
obrysie. Warianty z ramką testują teraz akcent źródła na istniejącej linii 1 px (także narożniki), bez dodatkowego
paska. Obrys aktywnego efektu pozostaje osobnym zewnętrznym sygnałem. Domyślna próba bez obudowy pozostaje
dostępna; to kolejny wariant do oceny V3, bez decyzji produkcyjnej.

## 3. Wyraźniejsza paleta ośmiu źródeł — propozycje wersji 06

MG poprosił o wyraźniejsze kolory Brutala, Cwaniaka, Speca, Twardziela, Złodzieja, Zwiadowcy, Generic i Pochodzeń.
Wcześniejsze miedź/mosiądz/piasek są bliskie sobie; mocne przyciemnianie podobnych akcentów dalej je zbliżało.
Nowa propozycja definiuje **rzeczywiste tła**, z osobnym akcentem do kolorowego glifu; nie oceniamy tylko jasnej próbki.

| Źródło | Kierunek | Tło „Separated hues” | Akcent do gołego glifu |
| --- | --- | --- | --- |
| Brutal | Rdzawa czerwień | `#6d2623` | `#d57362` |
| Cwaniak | Złoto | `#4f4100` | `#ddc052` |
| Spec | Cyjan / petrol | `#00484e` | `#56c5ce` |
| Twardziel | Kobalt | `#263574` | `#7999ef` |
| Złodziej | Fiolet | `#4e2b6d` | `#bb85ea` |
| Zwiadowca | Zieleń | `#28481e` | `#9dc96a` |
| Generic | Neutralny grafit | `#383e45` | `#b8c1c9` |
| Pochodzenia | Malina / burgund | `#642844` | `#dc8fad` |

W tym wariancie glif na tle jest biały. Alternatywa **Bone Pochodzenia** zachowuje siedem pozostałych kolorów,
a Pochodzenia mają jasne tło `#dfd1b1` i ciemny glif `#161b20`: dodatkowa różnica jasności zamiast kolejnej
podobnej ciemnej barwy. To świadoma alternatywa do oceny, nie zatwierdzone odstępstwo od wspólnej bieli.
Oba warianty mają kontrast pełnych kolorów co najmniej 10:1; nie jest to gwarancja rozróżnialności ośmiu barw
przy każdym rodzaju widzenia kolorów. Nazwy i różne glify pozostają potrzebne.

Tablica pokazuje obok siebie nowe warianty i poprzednią paletę. Każdy wiersz ma własny glif 44 px oraz
ten sam porównawczy glif 32 px. Wybór aktualizuje osiem źródeł, przykłady zdolności i barwy źródeł w pełnej
palecie treści. Sprzęt i znaki A/B/R/I zachowują własne role. Wcześniejsza tabela 19 rodzin poniżej opisuje
punkt wyjścia wersji 04; nie zatwierdza wcześniejszych kolorów klas ponad nowymi propozycjami.

## 4. Podział receptur — propozycja wersji 05

MG rozważa użycie obu receptur i preferuje kolorowy lub jasny goły glif dla przedmiotów. Poniższy podział
to rekomendacja do oceny na tablicy; nie oznacza zatwierdzenia wariantu dla całej biblioteki.

| Rola treści | Receptura proponowana | Skąd kolor |
| --- | --- | --- |
| Fizyczny sprzęt: broń, amunicja, pancerz, narzędzia, medycyna, fanty | Goły kolorowy glif, alternatywnie jasny | Rodzina sprzętu; nigdy klasa właściciela |
| Klasa / profesja i ich zdolności | Biały glif na barwnym tle | Kanoniczna klasa; profesja dziedziczy rodzica |
| Wszystkie Sztuczki i zdolności bez jednej klasy źródłowej | Biały glif na wspólnym neutralnym tle | Propozycja neutralnego grafitu `#b3bec5`; porównanie z wcześniejszym mosiądzem `#c3ab6c` |
| Pochodzenia i ich zdolności | Biały glif na wspólnym tle | Istniejąca propozycja kamień/piasek `#c2b28f` |
| Zwykłe czynności i kontrolki, np. Unikanie, strzał, przeładowanie | Goły jasny glif | Neutralny interfejs; znaki kosztu obok |
| Stany / efekty | Dotychczasowa oprawa stanów | `state-colors.mjs`, bez kolorowania klasą |

**Tło oznacza tożsamość/zdolność postaci, nie aktywność.** Korzyść stała, zdolność mieszana i zdolność aktywowana
otrzymują tę samą recepturę. Znak kosztu oraz stan poza glifem mówią, co można wykonać i dlaczego.
Klasa źródłowa jest stała; Sztuczka Aramis nie dostaje koloru klasy postaci, która ją posiada.
Neutralne tło Sztuczek unika skojarzenia z Cwaniakiem, którego odcień pokrywa się z wcześniejszą propozycją mosiądzu.

Operacja broni pozostaje operacją przy sprzęcie. Samo wyposażenie lub użycie przedmiotu nie przełącza go na
recepturę zdolności. Osobna zdolność nadana przez przedmiot zachowuje jawne źródło; nie dziedziczy koloru klasy
właściciela. Współdzielona czynność podstawowa i ogólna zdolność postaci to różne role mimo słowa „ogólna”.
Manifest ma klasyfikować te role semantycznie: dokument Foundry typu Item może być zarówno sprzętem, jak i feat.

Tablica pokazuje mieszany zestaw oraz dwa niezależne wybory: kolorowy/jasny sprzęt i neutralne/mosiężne tło
Sztuczek. Pełne 19 rodzin niżej pozostaje porównaniem możliwych kolorów. Wariant neutralny nie zmienia po cichu
wcześniejszej palety; jest osobną propozycją do rozstrzygnięcia przed potokiem wykończeń.

## 5. Pełna proponowana paleta treści — wersja 04

Poniżej jest komplet **tej propozycji**, nie gotowa klasyfikacja wszystkich dokumentów. Profesje dziedziczą klasę.
Zbieżność koloru Cwaniaka i Sztuczek jest świadoma; kolor nie zastępuje podpisu i symbolu. Kolejny audyt
manifestu ma wskazać każdy wpis bez przypisania albo z wieloma możliwymi rodzinami.

| Rodzina | Kolor bazowy |
| --- | --- |
| Brutal | `#bf8962` |
| Cwaniak | `#c3ab6c` |
| Spec | `#77b7b0` |
| Twardziel | `#8aa7c4` |
| Złodziej | `#a99cbe` |
| Zwiadowca | `#9fb082` |
| Pochodzenia i ich zdolności | `#c2b28f` |
| Sztuczki | `#c3ab6c` |
| Zdolności współdzielone / neutralne | `#b3bec5` |
| Broń | `#c3cbd2` |
| Amunicja / magazynki | `#d0b27a` |
| Pancerze | `#bdbaa5` |
| Narzędzia / elektronika | `#8cbbb2` |
| Sprzęt medyczny | `#a7c6ad` |
| Chemia / używki | `#b8abc6` |
| Wybuchowe / paliwo | `#c99f6e` |
| Żywność / woda / przetrwanie | `#c5b58e` |
| Fanty / wartościowe / ogólne | `#b5b9b6` |
| Czynności / UI | `#e9e3d6` |

Kolor bazowy identyfikuje rodzinę; dla receptury colored ground wyprowadzamy ciemniejszy odcień tła
i biały glif. Próbka wymaga co najmniej 10:1 dla pełnych kolorów przed filtrem, maską i zmniejszeniem.
Dla gołego kolorowego glifu na jasnej powierzchni testujemy ciemniejszy odcień tego samego koloru.
Nie zamienia to próby pikseli i oceny MG. Paleta istniejących stanów pozostaje w `state-colors.mjs`;
cztery kolory ekonomii akcji to osobna rola funkcjonalna.

| Koszt | Kształt | Kolor próbny | Pochodzenie |
| --- | --- | --- | --- |
| A | Koło | `#68c585` zielony | Wzorzec BG3 |
| B | Trójkąt | `#f5ad49` pomarańczowy | Wzorzec BG3 |
| R | Gwiazda czteroramienna | `#e3a0e9` magenta | Wzorzec BG3 |
| I | Kwadrat | `#83c8ed` niebieski | Propozycja NOE |

Wzorce obejrzane w [referencjach BG3](https://bg3.wiki/wiki/Actions): koło, trójkąt, gwiazda.
Podgląd rysuje własne proste figury CSS. Koszt ma stały kształt; liczba i przyczyna osobno pokazują
zużycie, zakaz, warunek i nieznany stan. Kolor akcji nie oznacza „gotowe”, a 0/1 nie zmienia kształtu kosztu.
Na jasnym tle odcień znaku może być ciemniejszy. I 0/1 ma wskazać kolejne Używanie A według M8.

Zapis decyzji: wariant + rozmiar i kontekst + co zachować + co poprawić + data MG. Wybór w przeglądarce,
eksport JSON i preferencja agenta **nie są akceptacją produkcyjną**. Zatwierdzony zestaw trafi tutaj przed E2.
Przeglądy obejmują kolejno: **tablicę → eksport próbny → jedną prawdziwą kartę → pozostałe powierzchnie**.

## 6. Grafika zastępcza — przeglądy 01–03

MG wskazał smoczy/szkieletowy motyw tła 5e jako konkretną grafikę do zastąpienia i poprosił o wersję
lub kilka wersji **przed przekazaniem planu**. M9 obejmuje również zamówienie, przegląd i wdrożenie grafiki;
lista zmian CSS i potok ikon nie wyczerpują tego zakresu.

### Przegląd 01

[Przegląd 01](index.html), [prompty, mastery i pochodzenie](manifest.json).

| Kandydat | Rzeczywista grafika | Charakter | Status |
| --- | --- | --- | --- |
| A — grafitowa blacha / Workshop | [WEBP](workshop-v1.webp) | Spokojny panel zużytego sprzętu, materiał i oszczędne łączenie po prawej | **MG: zachować** |
| B — generowany rysunek warsztatowy | [WEBP historyczny](field-drawing-v1.webp) | Pseudotechniczna grafika AI | **MG: odrzucony; nie wdrażać** |

Oba: autorska generacja `image_gen`, 2172 × 724 px, master PNG + bezstratny WEBP.
Nie przerabiają oryginalnej ilustracji 5e. Osiem zrzutów Chrome w istniejącej piaskownicy pokazuje:
obecne tło, neutralną próbę bez ilustracji, A/B na zdolnościach, A/B w ekwipunku oraz A/B przy 820 px.
Warianty zmieniają tło i bazową powierzchnię oraz wyłączają filtr PC. Pozostałe kontrolki i stare ikony
są istniejące, a nie docelowe M9. Style próbne usunięto po zrzutach; produkcyjny CSS i dokumenty bez zmian.

### Przegląd 02 — alternatywy; Field kit wybrany dla PC

[Porównanie na karcie i samych grafik](r02/index.html). Workshop pozostaje bez zmiany pliku. Sześć nowych kierunków:

| Kierunek | Grafika | Pochodzenie |
| --- | --- | --- |
| Field kit | [płótno i taśma](r02/field-kit-v1.webp) | Studium materiału `image_gen` |
| Roadside | [asfalt i zatarta krawędź drogi](r02/roadside-v1.webp) | Studium materiału `image_gen` |
| Shelter | [matowy beton](r02/shelter-v1.webp) | Studium materiału `image_gen` |
| Motor plate | [autentyczny rysunek silnika](r02/patent-v1.webp) | Nikola Tesla, US381968, 1888, fig. 9; oryginalny skan, kadr i ton na podłożu Workshop |
| Survey | [mapa topograficzna](r02/survey-v1.webp) | USGS Pittsburgh, wydanie 1907 / dodruk 1937; oryginalne ulice i poziomice |
| Steel town | [przemysłowy krajobraz](r02/steel-town-v1.webp) | Fotografia Walkera Evansa, 1935, Library of Congress; oryginalna architektura |

**Reguła wykonania tego pakietu po uwadze MG:** AI nie tworzy formalnych rysunków, schematów, map ani udawanego pisma technicznego.
Takie motywy korzystają z autentycznych istniejących źródeł: kadrowanie, jednolita skala, filtr i kompozycja,
z zachowaniem oryginalnej geometrii. Generatywny retusz nie zmienia ich linii i oznaczeń.
Trzy nowe materiały są generacjami; trzy motywy archiwalne przygotowano deterministycznie z zachowanych źródeł.
[Manifest](r02/manifest.json) przechowuje mastery, prompty, źródła, receptury i hashe;
[credits](r02/CREDITS.md) — autorów i status ponownego użycia.
**21 zrzutów** pokazuje wszystkie siedem opcji na zdolnościach, ekwipunku i przy szerokości 820 px.

### Przegląd 03 — rozwinięcie preferowanego nylonu

MG szczególnie polubił fizyczny materiał Field kit i poprosił o warianty z siatką rip-stop, nylonową taśmą MOLLE,
wzmocnieniami i technikami szycia. [Porównanie](r03/index.html) pokazuje oryginał i cztery nowe obrazy:

| Wariant | Grafika | Wyróżnik |
| --- | --- | --- |
| Rip-stop | [WEBP](r03/ripstop-v1.webp) | Duże spokojne pole siatki splotu, wąskie wykończenie krawędzi |
| MOLLE | [WEBP](r03/molle-v1.webp) | Poziome rzędy taśmy, punkty mocowania i pętle |
| Reinforced | [WEBP](r03/reinforced-v1.webp) | Pionowa taśma, box-X, rygle i podwójny szew panelu |
| Field pouch | [WEBP](r03/field-pouch-v1.webp) | Warstwowy narożnik kieszeni, lamowanie i przeszycia |

Oryginalny PNG Field kit był referencją wszystkich czterech generacji `image_gen`.
Mastery, pełne prompty i hashe: [manifest przeglądu 03](r03/manifest.json).
**15 zrzutów:** pięć materiałów × zdolności, ekwipunek, okno 820 px. Galeria dodaje widok splotu/szwów 1:1
i porównanie obok oryginału. **MG wybrał oryginalny Field kit dla głównej karty postaci** ([zapis wyboru](selection.json)).
Cztery nowe warianty pozostają historycznymi alternatywami, niewybranymi dla PC.

### Przegląd 04 (rozmowa 2026-11-16) — pozostałe karty

Bez nowych grafik. MG przypisał istniejące kandydaty: BN — Field kit, pojazd — Workshop, drużyna — Survey,
przedmioty — Workshop; dialogi, czat i małe okna bez banera. Zapis w §0.3 planu (D14).
