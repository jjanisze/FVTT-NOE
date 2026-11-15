# M9 — Przebudowa wizualna NOE przed betą

> **Status: projekt wizualny ZATWIERDZONY przez MG, 2026-11-15; implementacja przed nami.** Zakres zlecony przez MG: czytelne rozróżnianie treści,
> ładniejsza i spójna grafika, własny język NOE na kartach przed betą. Kierunek MG: **pragmatyzm Jagged Alliance 2
> z affordancjami współczesnego oprogramowania** (punkty odniesienia: JA 1.13 / Baldur's Gate 3). Funkcja,
> użyteczność i czytelność mają pierwszeństwo. Grafit i metal są blisko obecnego ciemnego motywu;
> rozwijamy ten punkt wyjścia. **Wybory review proposal 07 są zamknięte — §0.**
>
> To własny plan M9 z [drogi do bety](PLAN_beta.md), rozwijający [studium ikon](PLAN_icon_design.md).
> **Ikony są częścią M9.** Przed betą karty mają dostać rozpoznawalną oprawę NOE obejmującą również
> powierzchnie, typografię, nagłówki, zakładki, zasoby, wiersze, okna i czat.
> Decyzje wizualne są ustalone; audyt konsumentów i potok ikon (E1–E2) są odblokowane.

<a id="locked-style"></a>
## 0. Zamknięta specyfikacja wizualna — 2026-11-15

**MG: „Choices locked in, commit to plan”**, na podstawie eksportu **NOE M9 — review proposal 07**.
Ta sekcja i wersjonowany [profil `noe-m9-r07-v1`](dev/icons/finish/style-profile.json) są źródłem prawdy
dla implementacji. Wcześniejsze warianty i porównania poniżej są materiałem historycznym.

| Ustawienie | Wybór zatwierdzony |
| --- | --- |
| Source palette | **Bone Pochodzenia** (`bone`) |
| Unavailable | **Red slash · dark outline** (`dark`) |
| Paintjob | **Neutral graphite** (`graphite`) |
| Glyph | **Colored ground** (`ground`) dla tożsamości i zdolności postaci |
| Frame | **No housing** (`bare`) — bez ramki, grubego paska źródła i bevelu |
| Size | **44 CSS px**, wobec dotychczasowej referencji 32 px |
| Information | **row** — koszt, licznik i powód w wierszu / podpisie skrótu |
| Action costs | **shapes** — kształt + kolor + litera A/B/R/I, zgodnie z wybraną opcją tablicy |
| Palette coverage | **Wszystkie 19 proponowanych rodzin treści**; profesje dziedziczą klasę |
| Sprzęt fizyczny | Wcześniej ustalony podział: goły kolorowy glif rodziny sprzętu |
| Sztuczki / ogólne zdolności | Wspólne tło **Generic**, niezależne od klasy właściciela |
| Filtr i stany | Bez filtra całej karty; glif ma pełną nieprzezroczystość we wszystkich stanach |

`Colored ground` zamyka recepturę zdolności/tożsamości, zachowując podział sprzęt/zdolności z rozmowy.
Zwykłe czynności i kontrolki używają gołego glifu w kolorze tekstu motywu. Aktywna, pasywna i mieszana zdolność
dzielą ten sam język źródła. Czerwony skos jest celową nakładką niedostępności operacji.

### Osiem źródeł — wartości zatwierdzone

| Źródło | Tło | Glif | Akcent źródła |
| --- | --- | --- | --- |
| Brutal | `#6d2623` | `#ffffff` | `#d57362` |
| Cwaniak | `#4f4100` | `#ffffff` | `#ddc052` |
| Spec | `#00484e` | `#ffffff` | `#56c5ce` |
| Twardziel | `#263574` | `#ffffff` | `#7999ef` |
| Złodziej | `#4e2b6d` | `#ffffff` | `#bb85ea` |
| Zwiadowca | `#28481e` | `#ffffff` | `#9dc96a` |
| Generic | `#383e45` | `#ffffff` | `#b8c1c9` |
| Pochodzenia | **`#dfd1b1`** | **`#161b20`** | `#dfd1b1` |

Neutral graphite: powierzchnia `#191e23`, panel `#293038`, tekst `#edf0f2`, tekst drugorzędny `#b2bdc6`,
linie `#454f58`, akcent interfejsu `#bdc6cd`. Kolory sprzętu i mapowanie wszystkich 19 rodzin są w profilu.
Zatwierdzone pary pełnych kolorów glif/tło mają co najmniej 10:1 przed maską, zmniejszeniem i końcowym renderem.

### Koszt i dostępność

A: zielone koło `#68c585`; B: pomarańczowy trójkąt `#f5ad49`; R: czteroramienna gwiazda `#e3a0e9`;
I: niebieski kwadrat `#83c8ed`. Litery pozostają przy figurach (`shapes`, nie wariant `compact`).

Niedostępność: czerwony skos `#ff554d`, ciemny obrys `#10161b`, bez dodatkowej jasnej krawędzi.
Geometria wybrana na tablicy: −45°, długość 112% ikony, grubość `clamp(2px, 5.5% rozmiaru, 4px)`, obrys 1 CSS px.
Glifu nie przyciemniamy. Powód i licznik pozostają widoczne. Samo ostrzeżenie budżetu M8 oraz brak danych
nie dostają skosu; aktywny efekt i brak kolejnych użyć pozostają odrębnymi informacjami. W zdolności mieszanej
znak dotyczy niedostępnej operacji, a korzyści stałe pozostają czytelne.

### Co zamyka ta decyzja

**E0 zakończone.** Wybór palety, receptur, rozmiaru, ramki, rozmieszczenia informacji i nakładki niedostępności
nie wymaga kolejnego przeglądu wariantów. E1–E2 wdrażają tę specyfikację: audyt przypisań/konsumentów,
deterministyczne wykończenie i 24-tematowy pilot. Kolejne przeglądy oceniają jakość rzeczywistych eksportów,
kadrowanie i integrację na kartach; nie są ponownym wyborem zamkniętej palety.

Zamknięcie projektu wizualnego nie oznacza gotowych assetów, wdrożonego potoku ani zakończonego M9.
Typografia, szczegółowy układ komponentów i pozostałe powierzchnie M9 nadal wymagają implementacji i dowodów.

## 1. Cel i granice

1. Szybko odróżniamy przedmiot, zdolność, czynność i stałą korzyść oraz A/B/R/I, użycia i dostępność.
2. Te same sygnały znaczą to samo na karcie, pasku, w kompendium i czacie.
3. NOE ma własną, użytkową tożsamość wizualną; karta przestaje polegać na domyślnej oprawie 5e.
4. Zmiany wizualne zachowują mechanikę i znane ścieżki obsługi. Przebudowa układu musi rozwiązywać
   konkretny problem znaleziony w audycie, z pokazanym przed/po.

M9 odpowiada za prezentację stanu. [M8](PLAN_m8_ruch_i_ekonomia_akcji.md) odpowiada za ekonomię akcji,
budżety, koszty, grupowanie ataków i ich zapis. M9 korzysta z tego kontraktu, bez drugiego licznika.
Ostrzeżenie budżetu pozostaje ostrzeżeniem: nowa ramka nie może zmienić go w blokadę.
Stany zakazu, warunku, wyczerpania i nieznanego wyniku pokazujemy z konkretną przyczyną.

## 2. Brief wizualny i decyzje

### Ustalone przez MG — 2026-11-15

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

### Warianty badane przed zamknięciem — zapis przeglądu

Poniższa tabela zapisuje wcześniejsze porównania. Rozstrzygnięcia są zamknięte w §0; warianty odrzucone
nie są otwartymi pytaniami ani upoważnieniem do zmiany zatwierdzonego profilu.

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

### Wyraźniejsza paleta ośmiu źródeł — propozycje wersji 06

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

### Podział receptur — propozycja wersji 05

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

### Pełna proponowana paleta treści — wersja 04

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

## 3. Język informacji

| Pytanie gracza | Kanał | Reguła proponowana |
| --- | --- | --- |
| Co to jest? | Sylwetka + nazwa | Zachowujemy zatwierdzone glify i rozpoznawalny temat |
| Skąd pochodzi? | Spokojny akcent w UI + podpis źródła | Tożsamość klasy/rodziny, nie kolor aktualnego właściciela; akcent nie zabiera obszaru glifu |
| Co mogę wykonać? | Wiersz/przycisk operacji | Opis przedmiotu i wykonanie czynności mają różne affordancje |
| Ile kosztuje? | Znak kształt/kolor + A / B / R / I w etykiecie operacji | Poza glifem. Inne czasy wypisane; zdolność z kilkoma operacjami nie dostaje jednej mylącej litery |
| Ile zostało? | Liczba pozostałe/pojemność | Zasób użyć niezależny od budżetu A/B/R/I; oba mogą wystąpić jednocześnie |
| Czy efekt działa? | „WŁ.” w obszarze stanu | Aktywność efektu niezależna od gotowości kolejnego użycia; bez obrysu nachodzącego na glif |
| Dlaczego niegotowe? | Znacznik + konkretna przyczyna | Zużyty budżet, 0 użyć, zakaz, brak warunku i brak danych są odrębne |
| Co jest wybrane? | Zaznaczenie kontrolki | Inne niż stan aktywnego efektu; focus klawiatury czytelny niezależnie |

Na tablicy wszystkie liczby i stany to **niezależne przykłady**. Makieta pojedynczej karty musi mieć spójny
wspólny budżet. Projekt nie udaje pomiaru dostępności z działającego Foundry.

Przypadki obowiązkowe: Aramis (stałe + Wytrącenie B), zdolność z wyzwalaczem bez prostej litery akcji
(np. Wściekły cios), wiele aktywności o różnych kosztach, brak aktywności, nieznany stan, 0 użyć,
duża liczba użyć, aktywne i zarazem wyczerpane, zakaz mimo niewydanej puli, ostrzeżenie M8 mimo pozostałych użyć.
Pasywności nie wyprowadzamy z samego `action: null` ani koloru obrazka.

Po D6 propozycja skali zwykłego wiersza to **44 px**, do porównania z 32/48 px. Nie pomniejszamy gęstego glifu
wyłącznie po to, żeby zachować starą wysokość wiersza. 64/48 px dla tożsamości i nagłówków; 24/16 px pozostają
próbami granic czytelności i konsumentami wymagającymi uproszczonego symbolu albo nazwy, a nie dowodem, że glif działa.
Informację operacyjną trzymamy poza grafiką we wszystkich rozmiarach.
Glif zachowuje pełną nieprzezroczystość także przy braku warunku lub wyczerpaniu zasobu, niezależnie od wariantu
obudowy. Stan opisują tekst/znak i licznik; przyciemnianie gęstej sylwetki obniża jej rozpoznawalność.
**D10 — celowy wyjątek od ochrony powierzchni glifu:** niedostępna operacja dostaje wąską czerwoną ukośną kreskę
na istniejącym rysunku, z obrysem oddzielającym ją od jasnego glifu i kolorowego tła. Koszty i liczniki nadal są obok.
Samo wydanie puli z ostrzeżeniem M8 nie uruchamia czerwonego skosu. Brak danych pozostaje znakiem zapytania.
Aktywny efekt może mieć jednocześnie 0 kolejnych użyć: stan WŁ. pozostaje, kreska dotyczy kolejnego użycia.
Zdolność mieszana nie traci korzyści stałych; niedostępność jej operacji pokazujemy przy tej operacji, zamiast
przekreślać rodzica i sugerować utratę wszystkich korzyści. Docelowa projekcja korzysta z jawnej dostępności
operacji; odczyt demonstracyjnego `0/3` na tablicy nie jest projektem reguł wykonania.
Nazwy i powody pozostają dostępne bez hover; tooltip może je rozwijać. Kolor zawsze ma odpowiednik w znaku/tekście.
Kolory istniejących stanów pochodzą nadal z [state-colors.mjs](scripts/config/state-colors.mjs).

## 4. Zakres powierzchni przed betą

| Powierzchnia | Praca M9 | Dowód odbioru |
| --- | --- | --- |
| Karta postaci i BN | Powierzchnie, nagłówek, zakładki, typografia, zasoby, czynności, ekwipunek, zdolności, istniejąca lalka/pas | Ta sama postać w widoku codziennym i walce; także BN oraz długa lista sprzętu |
| Karty przedmiotów / aktywności | Nagłówek, akcje, źródło, stan, liczniki, obszary edycji | Broń z wieloma aktywnościami, narzędzie, medycyna, mieszana zdolność |
| Pasek i panel tury M8 | Wspólne ikony, koszt, użycia, warunki, focus/wybór; zachowanie M8 | 0 użyć, aktywny efekt, B 0/1 z ostrzeżeniem, R poza turą, brak danych |
| Awans, wybór klasy/profesji/Pochodzenia/Sztuczki | Tożsamość i skala, wiersze z lookupów cech/biegłości | Większa ilustracja i mały wiersz tego samego wpisu |
| Czat i okna użycia/rzutu | Własna hierarchia NOE, przyciski i czytelne wyniki; zamknięcie PM13 | Pasek Fuksa/Forsowania i adnotacje widoczne również w podsumowaniu |
| Pojazdy, wierzchowce, towarzysze i drony | Wspólne powierzchnie i komponenty tam, gdzie już mamy własne UI | Próbka każdej rodziny; specjalne kontrolki nie giną w nowej oprawie |
| Kompendium, sidebar, HUD stanów | Rozpoznawalne ikony i zgodne sygnały; bez polegania na CSS karty | Te same zasoby poza kartą, raster i SVG, prawdziwe tekstury canvas |
| Jasny i ciemny motyw | Czytelność obu; ciemny prowadzi brief | Ta sama zawartość bez gubienia stanów, napisów i obrysu |

Przed E3 audyt ustali konkretne selektory i producentów kontekstu, także wariant sci-fi. Własny wygląd NOE
ma wynikać ze wspólnych tokenów i komponentów, bez ręcznych poprawek dla setek obrazków.
Obecny filtr całej karty `sepia(.15) contrast(1.05) brightness(.85)` trzeba porównać z nowymi eksportami.
Propozycja: zastąpić go tokenami powierzchni/komponentów po przeglądzie; nie nakładać filtra na tekst i stany
bez weryfikacji. Istniejące obejścia skali/kontrastu ikon narzędzi oraz natywne złote ramki wymagają audytu,
aby obrazek nie dostał dwóch sprzecznych obudów.

## 5. Potok ikon — kontrakt implementacyjny zatwierdzonego profilu

Wejściem jest [profil `noe-m9-r07-v1`](dev/icons/finish/style-profile.json). Zmiana receptury wizualnej wymaga
nowej jawnej wersji profilu; audyt E1 i generator E2 korzystają z wybranego zestawu, bez ponownego wyboru V1–V12.

Obecny potok [Pipeline.md](dev/icons/Pipeline.md) nadal produkuje zatwierdzane białe glify.
Nowy etap to deterministyczne **wykończenie**, z zachowaniem źródeł i ich decyzji przeglądu.

```text
zatwierdzony glif + źródło i hash
  → manifest semantyczny (rodzina, źródło, receptura, konsumenci)
  → audyt kadru i opcjonalne zatwierdzone korekty optyczne
  → wersjonowana receptura (kolor, chroniony obszar glifu, marginesy; obudowa panelu osobno)
  → próbny WEBP + wariant bez obudowy / glif interfejsu
  → porównanie w skali i prawdziwych konsumentach
  → akceptacja wykończenia powiązana z hashem źródła i receptury
  → jawna integracja w builderach/configach → walidacja paczek
```

- Manifest ma stabilny ID, względną ścieżkę źródła, hash, rodzinę, kanoniczne źródło zdolności, wersję receptury,
  opcjonalną zatwierdzoną korektę optyczną, cele wyjściowe i status przeglądu. Nie zgadujemy rodziny z nazwy pliku.
- Źródłowych SVG/WEBP i zatwierdzonych sylwetek nie nadpisujemy. Generacja kandydata nie zmienia paczek ani świata.
- Kolor i tło źródła są eksportowane zgodnie z profilem; nie dodajemy obudowy, bevelu ani obrysu. **A/B/R/I, użycia i stany pozostają live**;
  nie generujemy bitmapy dla każdej liczby, klasy właściciela lub sytuacji bojowej.
- Rozdzielamy akceptację glifu, geometrii i wykończenia. Kolejka przeglądu zachowuje dotychczasowe decyzje/notatki;
  nowe wykończenia mają osobny profil walidacji. Walidator białych masterów nadal ma wymagać bieli.
- Pierwsza implementacja potrzebuje trybu podglądu/dry-run, `--check` na nieaktualne wyniki, deterministycznych
  ustawień eksportu, listy błędnych/brakujących przypisań i raportu zmienionych plików. Nazwy poleceń ustalimy w E2.
- WEBP dla dostarczanych rastrów; SVG i białe maski zachowują istniejące zastosowania interfejsu. Dwukolorowość
  obiektowa wymaga autorskich masek; sam biały glif nie zawiera informacji o skórze, metalu i tkaninie.
- Walidacja sprawdza rzeczywiste piksele po eksporcie, marginesy, alpha i obcięcie, obie powierzchnie,
  raster/SVG oraz natywne style konsumenta. Same metryki kadru i próbki kolorów nie dowodzą czytelności.
- Integracja zmienia producentów przypisań i generuje wynik zgodnie z AGENTS; nie edytuje ręcznie paczek.
  Istniejące dokumenty świata i ręcznie wybrane grafiki mają osobny raport różnic/migrację z kopią zapasową.
  Zachowujemy ID/UUID, a przy braku wykończenia działa stary glif.

**Pilot:** 24 tematy ze studium ikon (6 klas, 2 profesje, 2 Pochodzenia, 2 zdolności Pochodzeń,
3 Sztuczki, 3 zdolności klasowe, 4 rodziny sprzętu, 2 czynności broni), plus osobne przykłady stanów.
Stan warunkowy/zasób nie zwiększa liczby masterów. Wymagany co najmniej jeden konsument config/trait lookup,
nie tylko `item.img`. Najpierw porównanie eksportu, potem karta w piaskownicy, dopiero potem cała biblioteka.

## 6. Etapy i punkty rozmowy

| Etap | Rezultat | Warunek przejścia |
| --- | --- | --- |
| E0 — tablica i plan | **Zakończone:** wybory proposal 07 zamknięte przez MG, §0 i profil `noe-m9-r07-v1` | **Spełnione 2026-11-15**; historyczne porównania pozostają odniesieniem |
| E1 — audyt konsumentów i specyfikacja | Mapa powierzchni i źródeł danych, tokeny, znaczenie sygnałów, makieta docelowego wiersza i nagłówka | Wybrane decyzje mają wzorce i reguły fallback; brak sprzeczności z M8 |
| E2 — potok i pilot | Generator wykończeń z profilu, manifest, osobny przegląd, 24 eksporty i raport `--check` | Jakość rzeczywistych eksportów w docelowych 44 px i pozostałych skalach; zatwierdzony wygląd bez ponownego wybierania receptury |
| E3 — pionowy wycinek | Jedna rzeczywista karta z nową oprawą, ikonami i stanami, podgląd czatu/okna | MG ocenia całość; sandbox/layer-6 i zrzuty przed/po; zatwierdzamy dalszy rollout |
| E4 — karty i kontrolki | Postać/BN, przedmioty, awans, wspólne elementy pojazdów/towarzyszy, pasek M8 | Długie polskie teksty, edycja, drag/drop i dostęp gracza działają; oba motywy |
| E5 — czat i pełna biblioteka | PM13, podsumowania, rodziny ikon z manifestu, kompendia/HUD | Fuksy/Forsowanie i adnotacje zachowane; identyfikatory i istniejące wybory grafik stabilne |
| E6 — odbiór bety | Macierz poniżej, Poligon, dokumentacja i komplet zdjęć do zwiastuna | M9 zaakceptowane przez MG; bramki wydania zielone dla implementacji |

E0 zamknięte decyzją MG. E1–E2 są odblokowane, natomiast cały M9 pozostaje otwarty do wdrożenia i odbioru.
Szacunek wdrożenia ustalimy po audycie E1 z gotową recepturą. Liczba przeglądów jakości i zakres zmian układu decydują
o koszcie; wcześniejsze „1–2 tygodnie stylów” w drodze do bety to orientacja, nie zobowiązanie.

## 7. Macierz odbioru i definicja końca

| Sprawdzamy | Wymagany rezultat / dowód |
| --- | --- |
| Rozpoznanie | Zadania: znajdź B, odróżnij R od korzyści stałej, wskaż brak użyć i ostrzeżenie budżetu. Porównanie z dotychczasowym UI; obserwacje MG/gracza, bez deklarowania niezmierzonej poprawy szybkości |
| Czytelność | 44 CSS px jako zatwierdzony rozmiar roboczy; 16/24/32/48/64 jako dodatkowe skale i fallback konsumentów. Normalne powiększenie, DPR 1/2, jasne/ciemne powierzchnie, grayscale; znaczenie bez odczytania koloru |
| Stany | Gotowe, aktywne, pasywne, mieszane, wyzwalacz, brak danych, 0 użyć, >99 użyć, zakaz i przekroczony budżet; także kombinacje aktywne + 0 użyć |
| Kontrolki | Widoczny hover/focus/wybór; klawiatura; opis i powód bez hover; brak blokady z samego ostrzeżenia M8 |
| Karty | Postać, BN, przedmiot i próbki rodzin z §4; długie nazwy/diakrytyki, małe okno i długa lista; selekcja, edycja, rozwijanie i przeciąganie działają |
| Czat / PM13 | Pełna i zwinięta karta; pasek Fuksa/Forsowania, adnotacje i powiązany rzut widoczne; brak zduplikowanych kontrolek |
| Integracja ikon | Manifest bez zgadywanych mapowań; białe mastery nienaruszone; nowe wykończenia mają akceptacje/hash; bare/raster/SVG nie dostają podwójnych ramek |
| Dane i odtwarzanie | Generator odtwarza wynik, `--check` zielone, odpowiednie walidacje paczek; brak zmiany ID i niezamierzonej migracji świata |
| Regresja | Dla zmienionego UI wymagany sandbox/layer-6 ze zrzutami zgodnie z TESTING; właściwe testy statyczne i pełna bramka wydania przed betą |
| Odbiór MG | Uzupełnione sondy Garderoby i Galerii; po zmianach czatu również właściwe sondy rzutów; reseed wyłącznie na prośbę MG |
| Materiały | `docs/` opisuje nowe sygnały; IMPLEMENTATION zgodne; reprezentatywne zdjęcia karty, ekwipunku, zdolności, walki i czatu do zwiastuna |

M9 kończy się po akceptacji wspólnego języka i wdrożonych powierzchni przedbetowych, z dowodami macierzy.
Tablica, plan i sam eksport ikon nie zamykają etapu. Ponowne ilustracje całej biblioteki, ozdobne tekstury,
animowany HUD i pełna wymiana układu 5e nie są osobnymi wymaganiami M9; dokładamy je tylko przy konkretnym uzasadnieniu.

## 8. Wejścia techniczne

- [Studium ikon i normalizacji](PLAN_icon_design.md), [aktualny potok](dev/icons/Pipeline.md),
  [kontrakt przeglądu](dev/icons/review/README.md), [braki grafiki](dev/icons/MISSING.md).
- [Style](styles/neuroshima.css), [pasek](scripts/actors/ability-hotbar.mjs),
  [ekonomia akcji i ruch](PLAN_m8_ruch_i_ekonomia_akcji.md).
- [PM13 i D8](PLAN_migracja_dnd5e6.md), [testy i wymagania UI](TESTING.md),
  [Garderoba](dev/poligon/stations/garderoba.mjs), [Galeria](dev/poligon/stations/galeria.mjs).
- Interaktywna tablica lokalna rozwija wcześniejsze studium „Icon design study”; jej eksport przeglądu
  ma schemat `noe-m9-style-review/v1`. Jest prototypem CSS z zatwierdzonych glifów, nie generatorem assetów.
