# Kolor Kobaltu (WKK)

> **Status: żywy dokument.** To jest **pełna lista** zasad domowych modułu — „W Kolorze Kobaltu”
> (WKK). Rośnie wraz z sesjami. Stan wdrożenia w module (✅/🚧) jest orientacyjny dla osób czytających
> kod; dla graczy liczy się tylko sama zasada. Moduł robi coś inaczej niż podręcznik, a tej rzeczy nie
> ma ani tutaj, ani w [Czego Kobalt nie obejmuje](#czego-kobalt-nie-obejmuje)? To błąd — zgłoś go jako
> [issue](https://github.com/jjanisze/FVTT-NOE/issues).

Na tej stronie: [czym jest Kobalt](#czym-jest-kobalt) · [trzy warstwy zasad](#trzy-warstwy-noe-rai-wkk) ·
[przełączniki](#przełączniki) · [spis zasad WKK](#spis-zasad-wkk) · [zasady po kolei](#zasady) ·
[czego Kobalt nie obejmuje](#czego-kobalt-nie-obejmuje).

## Czym jest Kobalt

Podręcznik *Neuroshima Ostatnia Era* opisuje Kolory jako gotowe profile nasilenia zasad, które
MG wybiera na starcie kampanii — m.in. Rdzę, Stal, Rtęć, Chrom. Są to profile **wykluczające się
nawzajem**: gra się w jednym z nich.

**Kobalt nie jest kolejnym takim profilem.** To zestaw domowych poprawek napisany w trakcie
budowy tego modułu na FoundryVTT, tam gdzie okazało się, że jakaś zasada z podręcznika jest
nieprzetestowana albo słabo się sprawdza na wirtualnym stole (śledzenie zasobów, którymi
normalnie zarządza sam gracz przy stole, zasięgi światła liczone "na oko" itd.). Unikalną cechą
Kobaltu jest to, że **da się go dołożyć do dowolnego innego koloru** — nie zastępuje Rdzy, Stali
czy Rtęci, tylko je poprawia.

W tej kampanii Kobalt jest **domyślnie włączony** (zakładamy, że zdecydowana większość stołów
gra z nim), i jest **przełączalny** — Ustawienia świata → moduł Neuroshima → *Kolor Kobaltu*. Jeśli
ktoś woli czystą literę podręcznika, wyłącza go jednym przełącznikiem — z jednym zastrzeżeniem:
treść, która w podręczniku nie ma odpowiednika (pochodnie, flara, kilka broni i przedmiotów), zostaje
także bez Kobaltu, bo nie ma do czego wracać. W [spisie](#spis-zasad-wkk) takie pozycje mają w kolumnie
*Przełącznik* wpis **zawsze**.

## Trzy warstwy: NOE, RAI, WKK

Każda zasada w module należy do jednej z trzech warstw:

| Warstwa | Skąd | Przełącznik Kobaltu |
|---|---|---|
| **NOE** | podręcznik *Neuroshima Ostatnia Era* | nie dotyczy — działa zawsze |
| **RAI** i odczytania MG | rozstrzygnięcia autora systemu tam, gdzie podręcznik milczy (RAI), i odczytania luk przez MG | nie dotyczy — działa zawsze ([lista](#czego-kobalt-nie-obejmuje)) |
| **WKK** | zasady domowe tego stołu — **ta strona** | większość wyłącza przełącznik; wyjątki oznaczone **zawsze** |

Reguła podziału jest prosta: jest w podręczniku — NOE; nie ma, ale pochodzi od autora systemu (RAI) albo tylko
wypełnia lukę, nie zmieniając żadnej liczby (odczytanie MG) — warstwa środkowa; nie ma i to nasza decyzja (nowe
przedmioty, inne liczby, nowe koszty) — WKK.
Szczegóły dla osób piszących kod: [`scripts/wkk/README.md`](../scripts/wkk/README.md).

## Przełączniki

Ustawienia świata → moduł Neuroshima. Podustawienia działają tylko przy włączonym *Kolorze Kobaltu*.

| Ustawienie | Domyślnie | Co włącza |
|---|---|---|
| **Kolor Kobaltu** | włączone | wszystkie zasady z wpisem *Kolor Kobaltu* w spisie |
| **Kobalt: sen (WKK)** | włączone | zasada 19 |
| **Kobalt: jakość wody (WKK)** | włączone | zasada 20 |
| **Darmowe upuszczanie (WKK)** | **wyłączone** | zasada 12; widoczne w ustawieniach tylko z Kobaltem |

Inne ustawienia modułu (Forsowanie, BN upuszczają broń przy 0 PW, Ilustracje postoju i reszta) nie
należą do Kobaltu i działają niezależnie od niego.

## Spis zasad WKK

*Przełącznik*: **Kolor Kobaltu** — działa tylko z Kobaltem; **Kobalt: sen** / **Kobalt: jakość wody** /
**Darmowe upuszczanie** — osobne podustawienie (patrz wyżej); **zawsze** — działa także bez Kobaltu
(podręcznik nie ma wersji, do której dałoby się wrócić). Kolumna *Bez Kobaltu* mówi, co dzieje się po
wyłączeniu; „—” znaczy: to samo, bo zasada działa zawsze.

| # | Zasada | Z Kobaltem | Bez Kobaltu | Przełącznik |
|---|---|---|---|---|
| 1 | Pochodnia improwizowana | 1k4 obuchowe, zapalona +1 od ognia, światło 360°; z CH + MK bez wymagań (🚧 dodawana ręcznie) | — | zawsze |
| 2 | Pochodnia smołowa | tylko do kupienia; lżejsza, pali się dłużej i jaśniej | — | zawsze |
| 3 | Doładowanie paliwa pochodni | 1 kg CH = pełny zbiornik | — | zawsze |
| 4 | Koszt zapalenia pochodni | zapalenie zjada 10% paliwa | — | zawsze |
| 5 | Latarki i pochodnie zamiast czołówek | czołówka to jedna z form Latarki | — | zawsze |
| 6 | Skrócone zasięgi latarek | 15 m jasne / 22 m słabe | 45 m / 180 m z podręcznika | Kolor Kobaltu |
| 7 | Flara | rzucana raca: czerwone światło 12 / 24 m przez minutę | — | zawsze |
| 8 | Pistolet na Race i Raca sygnałowa | strzał 1k4 od ognia albo flara w wybrany punkt | — | zawsze |
| 9 | Produkcja: profesja przyspiesza | jeden przepis ze wzoru; profesja 75% czasu, z pełnym zestawem 50%; bez ST 30 | tabele schematów Speca jako osobne przepisy obok standardowego | Kolor Kobaltu |
| 10 | Produkcja: porzucenie, waga Roboty i Schematu | porzucona Robota oddaje surowce; Robota waży coraz więcej; Schemat 1 g za godzinę | Roboty nie da się porzucić; waży tyle, co surowce; Schemat nic nie waży | Kolor Kobaltu |
| 11 | Pancerz wspomagany zajmuje Hełm, Głowę, Twarz i Strój | szczelny pancerz robi za maskę, stare zabawki idą do plecaka | wyklucza tylko ochraniacze, hełm wolno | Kolor Kobaltu |
| 12 | Darmowe upuszczanie | upuszczenie broni z własnej woli za darmo, k6: 1–2 — broń cierpi | Darmowa Interakcja (albo Używanie) | Darmowe upuszczanie |
| 13 | Śmieci sprzedawcy z Bestiariusza | maczuga, pałka policyjna, kamienny nóż, sztylet, młotek — BN przy 0 PW je upuszcza | te ataki nic nie zostawiają (bronie dalej są w kompendium) | Kolor Kobaltu |
| 14 | Uporczywe Wyczerpanie z Krytycznego | schodzi dopiero z zejściem z Krytycznego | Długi odpoczynek zdejmuje je jak każde inne | Kolor Kobaltu |
| 15 | Pomoc medyczna: ładunek i cały Długi odpoczynek | 1 ładunek narzędzi, medyk i pacjent nie robią nic innego | bez kosztu i bez zajmowania odpoczynku | Kolor Kobaltu |
| 16 | Samoleczenie | Test INT (Medycyna) ST 20: sukces −1 Stopień, porażka +1 | nie da się opatrzyć samego siebie | Kolor Kobaltu |
| 17 | Skup po połowie ceny | handlarz płaci 50% ceny regionu | 100% ceny regionu | Kolor Kobaltu |
| 18 | Osełka jako towar | u handlarzy i w zamówieniach | tylko przeróbka u kowala | Kolor Kobaltu |
| 19 | Sen: krótki sen męczy, Bezsenność trzeba odespać | 4–5 h — RO KON ST 10, 2–3 h — ST 15; Bezsenność schodzi odsypianiem | krótki sen bez RO (RO ST 20 dopiero po dobie bez snu) | Kobalt: sen |
| 20 | Jakość wody | brudna, radioaktywna, chemiczna — RO raz na dobę | woda nie ma skutków | Kobalt: jakość wody |
| 21 | Bogate życie przynosi szczęście | codzienna, rosnąca szansa na Fuksa | Bogate utrzymanie = Normalne | Kolor Kobaltu |
| 22 | Bebeszenie: Malutka bestia i Ogromna maszyna | dopisane wiersze tabeli | takich istot się nie bebeszy | Kolor Kobaltu |
| 23 | Broń postaci: Laska, Miecz, Złoty Desert Eagle | wpisy w tabeli broni | — | zawsze |
| 24 | Nabój .44 Mag (dum-dum) | Rozrywająca: RO KON ST 14 albo Krwawienie 1k8, aż do opatrzenia | — | zawsze |
| 25 | Granat sygnałowy | sygnał świetlny i dymny, bez obrażeń | — | zawsze |
| 26 | Kamizelka taktyczna | lekki pancerz TT 12, +1 przedmiot podręczny | — | zawsze |
| 27 | Pistolero (Kowboj) | zdolność z profesji, pistoletowy bliźniak Rewolwerowca | nie ma jej w puli awansu (już wybrana zostaje) | Kolor Kobaltu |
| 28 | Schizofrenia paranoidalna | choroba przewlekła z tabelą „Lekarz i farmaceuta” | nie ma jej na liście chorób (już przydzielona zostaje) | Kolor Kobaltu |
| 29 | Mizoofobia | fobia: zwierzę bliżej niż 1,5 m — RO MDR ST 16 | nie ma jej na liście fobii (już przydzielona zostaje) | Kolor Kobaltu |
| 30 | Światło Koktajlu Mołotowa | zapalona butelka świeci 1,5 / 4,5 m | butelka nie świeci | Kolor Kobaltu |
| 31 | Dziurawy hełm | po Krytycznej ochronie zostaje złom za 2 gb | hełm znika | Kolor Kobaltu |
| 32 | Nabój do wpiętego magazynka w walce | Akcja i Test Zwinnych dłoni, ST wg kalibru | w walce się nie da | Kolor Kobaltu |
| 33 | Magazynki: kolejka naboi, komora, nabój dominujący | każdy nabój osobno, w kolejności strzału; seria bije jak najliczniejszy | — | zawsze |
| 34 | Naprawa awarii drona | konkretne części wg awarii | MG mówi, jaka to robota | Kolor Kobaltu |
| 35 | Fabryczny kontroler zdalnego sterowania | dostępność 10%, bez przepisu standardowego | 30%, przepis standardowy | Kolor Kobaltu |
| 36 | Pojazdy: kluczyki i odpalanie na krótko | kluczyki pasują do jednego pojazdu; na krótko — Akcja z narzędziami | — | zawsze |
| 37 | Pojazdy: zmiana rzędu i ładownia | przesiadka między rzędami w jadącym — zawsze test; upuszczone ląduje w ładowni | — | zawsze |
| 38 | Pojazdy: broń montowana | montaż to Robota; strzelec trzyma broń bez wagi | — | zawsze |
| 39 | Pojazdy: naprawy i odbudowa wraku | część = 10% ceny pojazdu, karoseria 2k6 + INT PW na godzinę | — | zawsze |
| 40 | Pojazdy: wybuch baku | płonący wrak z paliwem wybucha po k4 rundach | — | zawsze |
| 41 | Pojazdy: cechy domowe | Gąsienice, Otwarta rama, Wieżyczka i inne | — | zawsze |
| 42 | Smaczki postaci: Żeton Luxor i gadżety | żeton kasyna za 10 gb, cztery przedmioty, które hałasują | — | zawsze |

## Zasady

### 1. Pochodnia improwizowana
<!-- kod: scripts/wkk/items/pochodnia.mjs (zasady 1–4) -->

Broń improwizowana — bez Premii Biegłości, **1k4 obuchowe**, zapalona dodaje **+1 od ognia**.
Rzuca światło na **360°**. Można ją wyprodukować bez żadnych wymagań (bez narzędzi, bez testu) z
czystych surowców **CH** (Chemia) i **MK** (Materiały konstrukcyjne) — patyk i coś łatwopalnego,
skręcone naprędce.

🚧 *Broń i mechanika paliwa działają; samo "wyprodukuj z CH+MK" jako akcja jeszcze nie istnieje —
na razie trzeba dodać przedmiot ręcznie. Pochodnia (obydwa warianty) działa niezależnie od
przełącznika Kobaltu — nie ma sensownego odpowiednika RAW, do którego dałoby się wrócić po
wyłączeniu.*

### 2. Pochodnia smołowa

Tylko do kupienia (nie da się jej wyprodukować). Lżejsza od improwizowanej, pali się dłużej i
świeci odrobinę mocniej. Rzuca światło na **360°**. Ta sama broń co improwizowana: **1k4
obuchowe**, zapalona +1 od ognia.

✅ *Zaimplementowane.*

### 3. Doładowanie paliwa pochodni

Paliwo do dowolnej pochodni (improwizowanej lub smołowej) można doładować, zużywając **1 kg CH**.
1 kg CH to zawsze **pełne doładowanie do 100%**, niezależnie od tego, ile paliwa zostało.

✅ *Zaimplementowane — akcja "Dolej paliwo (1 kg CH)" na karcie pochodni, zdejmuje 1 kg z
posiadanych zapasów CH (może użyć kilku mniejszych stosów naraz, jeśli żaden pojedynczy nie ma
pełnego kilograma) i doładowuje do 100%. Działa też podczas palenia się pochodni — po prostu
liczy czas wypalenia od nowa, od pełnego zbiornika. Nie działa na Wypaloną Pochodnię.*

### 4. Koszt zapalenia

Samo zapalenie pochodni (niezależnie od wariantu) zużywa **10% jej paliwa**, zanim jeszcze
zacznie świecić.

✅ *Zaimplementowane. Obowiązuje zawsze, niezależnie od przełącznika Kobaltu — to podstawowa
mechanika pochodni, nie osobna poprawka.*

### 5. Latarki i pochodnie zamiast czołówek

Czołówki w startowym ekwipunku zastąpione latarkami lub pochodniami — czołówka nie istnieje
jako osobny mechanicznie przedmiot, tylko jako jedna z fizycznych form Latarki.

✅ *Zaimplementowane (dotyczy też już wydanych postaci).*

### 6. Skrócone zasięgi latarek
<!-- kod: scripts/wkk/config/latarka-overrides.mjs → scripts/items/latarka.mjs -->

Zasięgi światła latarek są znacznie mniejsze niż w podręczniku: **45 m jasne → 15 m** (dokładnie
1/3 RAW — sprawdzone w praktyce na mapach silosów, dobrze się skaluje). Słabe światło nie
dziedziczy tej samej proporcji 1/3 (byłoby to 60 m) — **180 m słabe → 22 m** zamiast tego: 60 m
słabego światła zalewało niemal cały poziom naraz na typowej mapie tej kampanii (silosy budowane
jak dungeony), co psuło eksplorację i czyniło bezcelowym każdy przyszły sprzęt o większym
zasięgu. Kąty stożka (45°/90°) zostają bez zmian — zmienia się tylko zasięg, nie szerokość snopu
światła.

✅ *Zaimplementowane — działa razem z przełącznikiem Kobaltu: wyłączenie go w Ustawieniach
świata przywraca latarkom pełny zasięg z podręcznika.*

### 7. Flara

Ręczna raca sygnałowa/oświetleniowa — jeden ruch: rzuć i zapal. Ląduje we wskazanym punkcie i
pali się **czerwonym, mocno migoczącym światłem przez 1 minutę** (jasne 12 m, słabe 24 m — to
dwa razy więcej niż Pochodnia Smołowa), zanim zgaśnie na dobre. Światło blokują ściany jak
każde inne. Nie wymaga żadnej broni. Podręcznik nazywa efekt („flara świecąca przez 1 minutę, ST
15") jako jedno z zastosowań narzędzi Małego Rusznikarza — to jest przedmiot, który ten efekt
faktycznie daje w ręce.

✅ *Zaimplementowane (`scripts/wkk/items/flara.mjs`) — prawdziwe, samodzielne światło na scenie w punkcie
rzutu (nie tylko opisowy sygnał), niezależne od tego, gdzie potem stanie rzucający.*

### 8. Pistolet na Race i Raca sygnałowa

Jednostrzałowa broń domowa (nie z podręcznika) strzelająca racami sygnałowymi — ten sam kształt
mechaniczny co Samoróbka (Wmag. 1, wymaga ręcznego załadowania po każdym strzale). Główne
zastosowanie to sygnalizacja/oświetlenie punktu trafienia, tak jak Flara powyżej. Trafienie
bezpośrednie w cel: **1k4 od ognia**, cel wykonuje RO Zręczność ST 12 albo zostaje Podpalony (RO
rozstrzyga MG ręcznie, tak jak przy Koktajlu Mołotowa). Raca sygnałowa (amunicja) jest lżejsza i
lata dalej niż ręczna Flara, ale bez samego pistoletu jest bezużyteczna — odwrotnie niż Flara.

✅ *Zaimplementowane (`scripts/wkk/items/pistolet-na-race.mjs`) — broń ma teraz DWIE osobne aktywności:
zwykły **ATAK** (obrażenia od ognia w cel) oraz **Wystrzel flarę** (wybierz punkt na mapie zamiast
celu — raca ląduje i świeci dokładnie jak rzucona Flara, tylko na zasięg broni zamiast na SIŁę
strzelca). Pierwsza wersja miała tylko ATAK — to była właśnie luka, którą zgłosił Sonk ("strzeliłem,
ale nie ma jak zrzucić flary").*

✅ *Zaimplementowane (`scripts/wkk/config/weapons-data.mjs`, `scripts/wkk/config/ammo-data.mjs`) — bez przełącznika
Kobaltu: to całkowicie nowa treść, nie ma czystej wersji RAW, do której dałoby się wrócić po
wyłączeniu (ta sama logika co przy Pochodni).*

### 9. Produkcja: profesja przyspiesza, zamiast dawać osobne przepisy
<!-- kod: scripts/wkk/config/production-kobalt.mjs (zasady 9, 10, 35) → scripts/config/production-rules.mjs -->

Bez Kobaltu tabele schematów Speca (Pirotechnika, Rusznikarstwo, Farmacja, Mechanika,
Hakerstwo, Serwisowanie) to osobne przepisy z własnym ST, czasem i surowcami — część z nich jest
gorsza od zwykłego wzoru z rozdziału *Produkcja przedmiotów* (`docs/Errata-produkcja.md`).
Z Kobaltem każdy przedmiot ma jeden przepis — ze wzoru — a profesja jest **cechą wykonawcy**:

- przedmiot z listy twojej profesji robisz w **75% czasu**, a z **pełnym zestawem narzędzi
  profesji pod ręką** (np. Pirotechnika: chemik + rusznikarz) w **50%**; zestaw nigdy nie jest
  wymagany, tylko przyspiesza;
- czas liczy się z Fabrykatorem (kolejne ×0,5), ale nigdy nie spada poniżej **25%**;
- ST ze wzoru, tylko bez stopnia 30: przedmioty warte ponad 75 gb mają **ST 25**;
- surowce bez rabatu — Przydasie działa jak zawsze;
- Szybkiej produkcji profesja nie skraca (ma własną stawkę 1 min × 1 gb), Fabrykator tak.

Przykład: Koktajl Mołotowa to 5 h. Pirotechnik: 3:45, z oboma zestawami 2:30, z Fabrykatorem 1:15.

✅ *Zakładka Produkcja liczy czas i ST każdego przepisu z cechą profesji; Szybka produkcja jej nie
używa. Jak to wygląda przy stole — [Produkcja.md](Produkcja.md).*

### 10. Produkcja: porzucenie, waga Roboty, waga schematu

Podręcznik nie mówi, co się dzieje z porzuconą produkcją ani ile waży. Z Kobaltem:

- **Porzucenie** Roboty oddaje wszystkie surowce, dopóki postęp nie przekroczy **10%**; później
  połowę. Bez Kobaltu Roboty nie da się porzucić — tylko skończyć.
- **Waga Roboty** płynie od wagi surowców do wagi gotowego przedmiotu, proporcjonalnie do
  postępu. Bez Kobaltu Robota waży tyle, ile surowce, które do niej weszły, aż do ukończenia.
- **Schemat** waży **1 g na godzinę** produkcji (schemat traktora — 1000 h — to 1 kg dokumentacji).
  Bez Kobaltu schemat nic nie waży.

✅ *Porzucenie w menu Roboty (⋯), waga Roboty i Schematu w udźwigu; bez Kobaltu przycisku porzucenia
nie ma.*

### 11. Oporządzenie: pancerz wspomagany zabiera hełm, Głowę, Twarz i Strój
<!-- kod: scripts/wkk/config/doll-kobalt.mjs → scripts/actors/doll.mjs -->

W Oporządzeniu (zob. `PLAN_paper_doll.md`) pancerz wspomagany Stalowej Policji i wojskowy pancerz
hydrauliczny to w podręczniku zwykłe ciężkie pancerze: wykluczają ochraniacze, hełm wolno. Z
Kobaltem zajmują też **Hełm, Głowę, Twarz i Strój** — szczelność pancerza robi za maskę
przeciwgazową, a najlepszy pancerz w grze ma kosztować stare zabawki. Latarka na Ramieniu zostaje.

✅ *Założenie takiego pancerza zdejmuje rzeczy z tych slotów do plecaka; założenie czegoś na nie
pyta, czy zdjąć pancerz.*

### 12. Darmowe upuszczanie (opcja, domyślnie wyłączona)
<!-- kod: scripts/actors/ground-items.mjs (ustawienie darmoweUpuszczanie) -->

Bez Kobaltu upuszczenie broni to Darmowa Interakcja (albo Używanie, gdy [I] już zużyta) — jak
dobycie. Z opcją *Darmowe upuszczanie* upuszczenie broni **z własnej woli** nic nie kosztuje, ale
rzucasz **k6**: na 1–2 broń cierpi — ostrze dostaje wyszczerbienie, broń palna uszkodzenie (to
bardziej złożone urządzenie niż topór). Upuszczenie wymuszone (Wytrącenie, „Poddaj się!") nigdy
nie rzuca. Zasada z testów autora systemu.

✅ *Ustawienie świata „Darmowe upuszczanie (WKK)" — widoczne tylko z Kobaltem.*

### 13. Śmieci sprzedawcy z Bestiariusza

Część ludzi z Bestiariusza walczy przedmiotami, których nie ma w tabeli broni: maczugą, pałką
policyjną, kamiennym nożem, sztyletem, młotkiem. Z Kobaltem to prawdziwe bronie (słabsze od
najbliższych z podręcznika: Bejsbola, Noża taktycznego) i BN padający przy 0 PW je upuszcza. Bez
Kobaltu te ataki niczego nie zostawiają.

✅ *Statystyki: `scripts/wkk/config/weapons-data.mjs` — do przejrzenia przez MG.*

### 14. Wyczerpanie z Krytycznego Stopnia jest uporczywe
<!-- kod: scripts/wkk/config/rekonwalescencja-kobalt.mjs (zasady 14–16) → scripts/config/rekonwalescencja-rules.mjs -->

Podręcznik: Krytyczny Stopień Zranienia nadaje poziom Wyczerpania, a Długi odpoczynek zdejmuje
jeden poziom dowolnego Wyczerpania — ten też. Autor systemu dodał, że zejście z Krytycznego na
Poważny zdejmuje ten poziom od razu (to działa zawsze, także bez Kobaltu). Z Kobaltem ten poziom
jest **uporczywy**: odpoczynek go nie zdejmuje, schodzi dopiero z zejściem z Krytycznego. Ponowne
wejście w Krytyczny nadaje go znowu. Koszt w liczbach: przy RO na Kondycję +0 zwykły czas gojenia
z Krytycznego bez medyka rośnie z 20 do 22 Długich odpoczynków.

✅ *Pipka tego poziomu ma kwadratową ramkę; kalendarzyk zdrowia liczy z tą zasadą.*

### 15. Pomoc medyczna kosztuje ładunek i cały Długi odpoczynek

Podręcznik: medyk biegły w Medycynie, z narzędziami małego medyka, zdejmuje po Długim odpoczynku
jeden Stopień Zranienia — bez testu. Z Kobaltem kosztuje to **jeden ładunek** narzędzi (medyk ze
Sztuczką Aspiryna i Miętusy opatruje z pustą torbą — ładunku nie zużywa) i zajmuje **cały Długi
odpoczynek obojga**: medyk opatruje dokładnie jednego pacjenta, żadne z nich nie bierze innych zajęć
(produkcja, naprawa, czyszczenie broni, gotowanie, polowanie).

✅ *Okno Długiego odpoczynku wyszarza inne zajęcia pacjenta i medyka; ładunek schodzi po odpoczynku
(anulowany odpoczynek nic nie zjada).*

### 16. Samoleczenie

Podręcznik nie pozwala opatrzyć samego siebie („fachowa pomoc medyczna” to dwie osoby). Z Kobaltem
ranny medyk może: **Test Inteligencji (Medycyna) ST 20** zamiast Pomocy medycznej — sukces −1
Stopień, **porażka +1 Stopień**; ładunek schodzi w obu przypadkach, Długi odpoczynek jest zajęty
jak przy Pomocy medycznej. Przy Krytycznym porażka to piąty Stopień, czyli śmierć — okno ostrzega.
To Test k20, więc Fuks wolno.

✅ *Trzecia droga w sekcji Rekonwalescencja okna Długiego odpoczynku; karta z testem w czacie.*

### 17. Handlarz skupuje po połowie ceny
<!-- kod: scripts/wkk/config/handel-kobalt.mjs (zasady 17–18) → scripts/config/handel-rules.mjs -->

Podręcznik: towar sprzedaje się po cenie regionu. Z Kobaltem handlarz **skupuje po połowie** ceny regionalnej
(waluta lokalna w swoim regionie — pełna wartość). To punkt wyjścia, nie sufit: Wpływanie i korekta MG w oknie
wymiany podnoszą stawkę.

✅ *Wycena MG w oknie wymiany; gracz widzi tylko sumę z podręcznika.*

### 18. Osełka jako towar

Podręcznik: naostrzenie broni białej to przeróbka u kowala. Z Kobaltem **Osełka** jest też zwykłym towarem — na
listach handlarzy i w zamówieniach (dostępność 50%, cena jak w tabeli ulepszeń); używa jej właściciel broni.

✅ *Generator towaru i zamówienie specjalne.*

### 19. Sen: krótki sen męczy, Bezsenność trzeba odespać
<!-- kod: scripts/wkk/config/sen-kobalt.mjs → scripts/config/postoj-rules.mjs; ustawienie kobaltSen -->

Podręcznik: 6 h snu to Długi odpoczynek, krócej — mniej korzyści, doba bez snu — RO ST 20. Z Kobaltem
(podustawienie **Kobalt: sen**, domyślnie włączone):

- 4–5 h snu — korzyści Krótkiego odpoczynku i **Rzut Obronny na Kondycję ST 10**; 2–3 h — **ST 15**. Porażka to
  poziom Wyczerpania **Bezsenność**.
- **Bezsenność jest uporczywa** — zwykły Długi odpoczynek jej nie zdejmuje. Schodzi **odsypianiem**: 12 h snu
  zdejmuje jeden poziom, 18 h — dwa (dobrze przespana doba to także Długi odpoczynek, więc schodzi i zwykły
  poziom).

✅ *Pole snu w oknie Doby i w oknie Długiego odpoczynku; karta prośby z rzutem do gracza; pipka Bezsenności ma
kwadratową ramkę.*

### 20. Jakość wody
<!-- kod: scripts/wkk/config/woda-kobalt.mjs → scripts/config/postoj-rules.mjs; ustawienie kobaltWoda -->

Wycofana z druku zasada z wersji testowej systemu — na stole trudna do pilnowania, w Foundry łatwa. Z Kobaltem
(podustawienie **Kobalt: jakość wody**, domyślnie włączone), raz na dobę picia gorszej wody:

- **brudna** (Nędzne utrzymanie, zapasy) — RO na Kondycję ST 10, porażka: choroba zakaźna (biegunka); kto już
  choruje, nie rzuca. Gotowanie (15 min) albo tabletki uzdatniające robią z niej pitną — to na razie rozstrzyga MG,
  moduł uzdatniania nie automatyzuje;
- **skażona radioaktywnie** — RO ST 15, porażka: Wyczerpanie;
- **skażona chemicznie** — RO ST 15, porażka: 1k6 obrażeń od kwasu i Wyczerpanie.

Zapasy schodzą od najczystszej wody. Zwierzęta mogą pić brudną.

✅ *Rzut przy zatwierdzeniu doby, karta prośby do gracza.*

### 21. Bogate życie przynosi szczęście
<!-- kod: scripts/wkk/config/utrzymanie-kobalt.mjs → scripts/config/postoj-rules.mjs -->

Podręcznik: Bogate utrzymanie niczym mechanicznie nie różni się od Normalnego. Z Kobaltem każdy dzień Bogatego
życia daje szansę na **Fuksa** (na 7 dni), rosnącą z każdym dniem bez niego: pierwszego dnia 1 na 10, dziesiątego
— pewny. Fuks zeruje licznik.

✅ *Rzut przy zatwierdzeniu doby; przeskok liczy pewnego Fuksa co 10 dób.*

### 22. Bebeszenie najmniejszych bestii i największych maszyn
<!-- kod: scripts/wkk/config/bebeszenie-kobalt.mjs → scripts/config/bebeszenie-data.mjs -->

Tabele bebeszenia nie mają Malutkiej bestii ani Ogromnej maszyny. Z Kobaltem:

- **Malutka bestia** — 15 min, ST 5, 2 kg materiałów organicznych, 5 kg mięsa;
- **Ogromna maszyna** — dwa razy Wielka (64 h; chemikalia 100 kg, metal 6000 kg, elektronika 100 kg, części
  200 kg), ST 25 (podręcznik nie ma w bebeszeniu ST wyższego niż 25).

✅ *Okno bebeszenia oznacza takie wiersze jako WKK.*

### 23. Broń postaci: Laska, Miecz, Złoty Desert Eagle
<!-- kod: scripts/wkk/config/weapons-data.mjs (zasady 8, 13, 23) -->

Trzy bronie, które bohaterowie tej kampanii mieli na kartach, zanim moduł je spisał — podręcznik ich nie zna:

- **Laska** — broń biała, 1k6 obuchowe, finezyjna; 1 kg, 15 gb.
- **Miecz** — broń biała, 1k10 cięte, bez właściwości; 1,5 kg, 40 gb. Katana (ta sama kość, finezyjna i
  wszechstronna, ta sama cena) zostaje bronią wyraźnie lepszą — i tak ma być.
- **Złoty Desert Eagle** — pozłacany, mistrzowsko spasowany Desert Eagle: .44 Mag, magazynek na 8, **+1 do
  trafienia**, Obalająca; bierze zwykłe magazynki do Desert Eagle; 300 gb.

✅ *W kompendium broni zawsze — nie mają wersji z podręcznika, do której dałoby się wrócić.*

### 24. Nabój .44 Mag (dum-dum)
<!-- kod: scripts/wkk/config/ammo-data.mjs (zasady 8, 24, 25), scripts/wkk/combat/weapon-save-properties.mjs, scripts/wkk/combat/bleeding.mjs -->

Nabój z rozciętym czubkiem do .44 Mag — ta sama kość co zwykły (1k10 kłute), tylko rana brzydsza. Cały zysk
siedzi we właściwościach:

- **Rozrywająca** (tylko WKK) — żywa istota trafiona takim pociskiem, która nie ma redukcji, odporności ani
  niewrażliwości na obrażenia kłute (maszyna nigdy), wykonuje RO na Kondycję ST 14. Porażka — **Krwawienie
  (pocisk dum-dum)**: 1k8 obrażeń na **początku** każdej swojej tury. Tego krwawienia nie da się przeczekać —
  żaden RO go nie zatrzymuje, tylko opatrzenie rany (Medycyna ST 15).
- **Hollow-point** — pocisk rozpłaszcza się na przeszkodzie: osłona z niezerową redukcją zatrzymuje go całkowicie.
- **Obalająca**.

✅ *Właściwości przychodzą z naboju, nie z broni — znikają, gdy w komorze siedzi zwykły .44 Mag.*

### 25. Granat sygnałowy

Granat spoza podręcznikowych list „Granaty i im podobne” oraz „Miny i ładunki”: sygnał świetlny i dymny
widoczny z daleka, bez obrażeń. 20 gb, 0,3 kg, dostępność 40%.

✅ *W kompendium granatów zawsze.*

### 26. Kamizelka taktyczna
<!-- kod: scripts/wkk/config/armor-data.mjs -->

Lekki pancerz: kamizelka nośna z lekkimi płytami, obszyta ładownicami i kieszeniami. Liczy się jak Plate
carrier typ I z podręcznika (TT 12), ale ładownice dają **jeden przedmiot podręczny więcej** — takiego slotu
w podręczniku nie ma. 6 kg, 90 gb, dostępność 30%.

✅ *W kompendium pancerzy zawsze.*

### 27. Pistolero
<!-- kod: scripts/wkk/config/class-features-data.mjs → scripts/actors/kobalt-advancement.mjs -->

Zdolność z profesji Kowboja — siostra Rewolwerowca dla pistoletów (można wziąć obie):

- **Dobywanie** — jeden lub dwa pistolety z kabur dobywasz i chowasz bez darmowej interakcji;
- **Niezawodny** — pistolet w twoich rękach się nie zacina;
- **Jednoręki** — strzelasz z pistoletu jedną ręką bez Utrudnienia; pistolety są dla ciebie lekkie i poręczne;
- **Strzał z biodra** — +5 do Inicjatywy, gdy trzymasz pistolet albo będziesz go dobywać;
- **Powąchaj to** — celując z pistoletu do istoty w zasięgu 1,5 m, wykonujesz Test Zastraszania z Ułatwieniem
  (SIŁ albo CHA).

Szybkoładowacza nie ma — osiem naboi w magazynku robi swoje.

✅ *Niezawodny i Jednoręki liczy moduł, Dobywanie pokazuje Oporządzenie; Strzał z biodra i Powąchaj to rozlicza
gracz. Bez Kobaltu Pistolero nie ma w puli awansu Kowboja — postać, która już ją wybrała, zachowuje ją.*

### 28. Schizofrenia paranoidalna
<!-- kod: scripts/wkk/config/diseases-data.mjs → scripts/config/diseases-data.mjs -->

Choroba przewlekła ze stopniami identycznymi z podręcznikową Paranoją — przy stole to ta sama choroba pod inną
nazwą. Domowa jest tylko tabela **„Lekarz i farmaceuta”**: biorąc leki, rzuć 1k20.

- **1** — podmienili wszystkie tabletki: zniszcz 1k8 tabletek, zanim spostrzeżesz, że nie wszystkie są otrute;
- **2–10** — osłabili tabletki: żeby lek zadziałał, potrzebujesz podwójnej dawki;
- **11–19** — nie podmienili;
- **20** — tabletka puściła do ciebie oczko: jesteś pewien, że dziś obejdzie się bez leków.

Tej choroby się nie losuje — przydziela ją MG.

✅ *Bez Kobaltu nie ma jej na liście chorób w panelu zdrowia; przydzielona wcześniej działa dalej.*

### 29. Mizoofobia
<!-- kod: scripts/wkk/config/phobias-data.mjs → scripts/config/phobias-data.mjs -->

Lęk, kiedy dowolne zwierzę — nawet przyjazne — znajdzie się bliżej niż 1,5 m: RO na Mądrość **ST 16** (zamiast
zwykłego 15). Przemysłowy środek do dezynfekcji obniża ST do 14 i pozwala powtórzyć RO w chwili użycia (1 dawka
i akcja). Tej fobii się nie losuje — przydziela ją MG.

✅ *Bez Kobaltu nie ma jej na liście fobii; przydzielona wcześniej działa dalej.*

### 30. Światło Koktajlu Mołotowa
<!-- kod: scripts/wkk/config/molotov-light.mjs → scripts/actors/molotov.mjs -->

Podręcznik nie daje zapalonej butelce żadnego światła. Z Kobaltem płonąca szmata świeci słabo i mocno
migocze — **1,5 m jasnego, 4,5 m słabego** — w ręce i leżąc na ziemi. Światło zmienia to, co widzą żetony,
więc to zasada, nie ozdoba.

✅ *Bez Kobaltu butelka nie świeci.*

### 31. Dziurawy hełm
<!-- kod: scripts/wkk/config/dziurawy-helm.mjs → scripts/combat/obrona.mjs -->

Podręcznik (Krytyczna ochrona): hełm, który zamienił Trafienie Krytyczne na zwykłe, ulega zniszczeniu — znika.
Z Kobaltem w plecaku zostaje **Dziurawy hełm**: złom wart 2 gb, o wadze hełmu — do sprzedania albo na surowce.

✅ *Bez Kobaltu hełm po prostu znika.*

### 32. Nabój do wpiętego magazynka w walce
<!-- kod: scripts/wkk/config/pojedynczy-naboj.mjs → scripts/weapons/magazine.mjs -->

Bez Kobaltu w walce ładuje się pojedynczo tylko magazynek wewnętrzny i bębenek — do wymiennego magazynka naboi
się nie wkłada (rozstrzygnięcie autora systemu). Z Kobaltem nabój da się wepchnąć do magazynka **wpiętego w
broń**: Akcja i **Test Zręczności (Zwinne dłonie)** — ST 12 dla naboju pistoletowego, 14 dla śrutowego, 15 dla
karabinowego, 18 dla .50 BMG.

- Porażka — nabój upada na ziemię.
- Naturalna 1 — nabój wchodzi krzywo i broń się zacina; broń, która się nie zacina, traktuje to jak porażkę.
- Akcja przepada w każdym wypadku.

Pomysł dał autor systemu, liczby i skutki porażki są tego stołu — stąd WKK.

✅ *Przycisk „+1 nabój” na broni z wpiętym magazynkiem — tylko w walce.*

### 33. Magazynki: kolejka naboi, komora i nabój dominujący
<!-- kod: scripts/weapons/magazine-model.mjs (dominantCaliber), scripts/weapons/fire-modes.mjs -->

Trzy decyzje tego stołu, na których stoi cały system magazynków modułu:

- **Kolejka naboi** — każdy nabój jest śledzony osobno, w kolejności strzału; w jednym magazynku mogą siedzieć
  różne rodzaje.
- **Komora** — osobne miejsce na jeden nabój, z własnym rodzajem.
- **Nabój dominujący** — seria bije jak nabój, którego było w niej najwięcej; przy remisie ten, który poszedł
  pierwszy. Przykład: krótka seria z magazynka *przeciwpancerny, smugowy, przeciwpancerny* bije jak
  przeciwpancerny.

✅ *Działa zawsze — to fundament amunicji w module, bez niego nie byłoby czego wyłączać.*

### 34. Naprawa awarii drona
<!-- kod: scripts/wkk/config/naprawa-awarii-kobalt.mjs → scripts/config/towarzysze-rules.mjs, scripts/actors/drony-naprawa.mjs -->

Podręcznik nie ma tabeli napraw — bez Kobaltu **Napraw awarię** wysyła kartę do MG, który mówi, jaka to robota.
Z Kobaltem każda pozycja Tabeli awarii maszyn ma swój stopień naprawy i **konkretne części**: każdy wymieniony
surowiec w ułamku ilości z przepisu drona — Drobnostka ⅕, Trochę roboty ½, Skomplikowana harówa ¾ (w górę,
co najmniej 1); Chemia w stałej ilości 2 / 3 / 4. Dron na połowie PW lub mniej — naprawa o stopień trudniejsza.
Awarie 5, 10 i 12 mijają same, 20 to wrak.

✅ *Jak to wygląda przy stole — [Towarzysze i drony](Towarzysze-i-drony.md).*

### 35. Fabryczny kontroler zdalnego sterowania
<!-- kod: scripts/wkk/config/dostepnosc-kobalt.mjs → scripts/config/dostepnosc.mjs; BEZ_PRZEPISU_STANDARDOWEGO_KOBALT w scripts/wkk/config/production-kobalt.mjs -->

W świecie WKK fabryczny kontroler to znalezisko: dostępność **10%** zamiast 30% i **nie da się go zbudować** z
przepisu standardowego. Zwykłą drogą do drona zostaje kontroler domowej roboty ze schematu Hakera.

✅ *Bez Kobaltu: dostępność 30% i przepis standardowy jak dla każdego przedmiotu.*

### 36. Pojazdy: kluczyki i odpalanie na krótko
<!-- kod: scripts/pojazdy/silnik.mjs, ST_NA_KROTKO w scripts/config/vehicles-data.mjs -->

Kluczyki to przedmiot, który pasuje do **jednego** pojazdu. Bez nich kierowca może **odpalić na krótko**:
Akcja z narzędziami małego mechanika albo elektronika, ST wg klasy pojazdu — jednoślad 10, osobowy 15, ciężki i
pancerny 20.

- Sukces — pojazd na stałe jeździ bez kluczyków.
- Porażka — alarm (klakson, syrena).
- Porażka o 5 lub więcej — awaria 17: zapłon zawodzi, światła gasną.

✅ *Działa zawsze.*

### 37. Pojazdy: zmiana rzędu i ładownia
<!-- kod: scripts/pojazdy/jadacy.mjs (kosztPrzesiadki, zarejestrujLadownieUpuszczenia) -->

Podręcznik: przesiadka w jadącym pojeździe kosztuje podwójną odległość bez testu albo zwykłą z Testem
Zręczności (Akrobatyka) ST 10. Z WKK **zmiana rzędu** (albo strefy) w jadącym pojeździe zawsze wymaga testu.
Rzecz upuszczona w pojeździe nie spada na drogę — ląduje w ładowni.

✅ *Działa zawsze.*

### 38. Pojazdy: broń montowana
<!-- kod: scripts/pojazdy/bron.mjs -->

Montaż broni na stanowisku to **Robota** produkcji — domyślnie Trochę roboty od ceny broni (ST 15, 30% ceny w
surowcach, 1k4 h, narzędzia małego mechanika albo rusznikarza); MG może też zamontować od ręki. Zdjęcie —
Drobnostka bez kosztów. Kto siada na stanowisku, trzyma broń **bez wagi** — Udźwig jej nie liczy, a magazynki,
tryby ognia i zacięcia działają jak zwykle.

✅ *Działa zawsze.*

### 39. Pojazdy: naprawy i odbudowa wraku
<!-- kod: scripts/pojazdy/naprawy.mjs -->

Liczby to improwizacja tego stołu (do weta MG), oparta na tabeli Naprawiania:

- cena części = **10% ceny pojazdu**, od niej procenty tabeli Naprawiania;
- naprawa tymczasowa w czasie jazdy — Akcja i test, skutek awarii wstrzymany na minutę;
- naprawa fachowa na postoju — ST wyznacza stopień: 10 Drobnostka, 15 Trochę roboty, 20 Skomplikowana harówa;
- karoseria — godzina pracy przywraca **2k6 + mod. INT** PW (narzędzia małego mechanika), cała karoseria za 10%
  ceny pojazdu;
- odbudowa wraku — Skomplikowana harówa od ceny pojazdu, 2k4 h × rozmiar (Duża ×1, Wielka ×2, Ogromna ×4);
  potem 1 PW i jedna losowa awaria „na pamiątkę”.

✅ *Działa zawsze.*

### 40. Pojazdy: wybuch baku
<!-- kod: scripts/pojazdy/wrak.mjs -->

Płonący pojazd (awaria 1 albo Podpalenie) z paliwem w baku wybucha po **k4 rundach**: ogień wg rozmiaru — Duża
3k6 w promieniu 3 m, Wielka 4k6 / 4,5 m, Ogromna 6k6 / 6 m; RO na Zręczność ST 15 — połowa. Wrak zostaje.

✅ *Działa zawsze.*

### 41. Pojazdy: cechy domowe
<!-- kod: CECHY_POJAZDOW (warstwa "WKK") w scripts/config/vehicles-data.mjs -->

Cechy pojazdów, których nie ma w statblokach podręcznika:

- **Gąsienice** — gruz i trudny teren bez kary do Szybkości i bez testów.
- **Otwarta rama** — jadący nigdy nie mają więcej niż połowiczną osłonę.
- **Wieżyczka** — stanowisko na dachu: strzelec ma osłonę ¾, broń montowana strzela w każdą stronę.
- **Paka** — miejsca stojące z połowiczną osłoną; w jadącej ciężarówce stojący na pace na początku swojej tury
  zdaje Test Zręczności (Akrobatyka) ST 10 albo jest Powalony.
- **Działko wodne** (Akcja) — ze stanowiska linia 18 m: gasi Podpalenie i ogień; istoty w linii — RO na Siłę
  ST 13 albo odepchnięte o 3 m i Powalone. Zbiornik na 10 strzałów.
- **Syrena** (Akcja Bonusowa) — do następnej tury kierowcy Utrudnienie do Testów Mądrości (Percepcja) opartych
  na słuchu w promieniu 30 m.
- **Lemiesz** (Akcja) — spycha przeszkody i mniejsze pojazdy; istoty przed lemieszem — RO na Siłę ST 15 albo
  przepchnięte i Powalone; niszczenie obiektów ×2.
- **Wolny jak walec** — nie ma Gazu do dechy ani podobnych przyspieszeń.
- **Wieża** — stanowisko działonowego strzela w każdą stronę.
- **Pancerne wnętrze** — jadący mają całkowitą osłonę; ze środka strzelają tylko z broni montowanej.
- **Miażdżenie** — Powalona istota nie ma Rzutu Obronnego przeciw Potrąceniu.
- **Desant** — rampa: desant wysiada bez kosztu ruchu.
- **Strzelnice** — desant strzela ze środka z osłoną ¾.
- **Uciąg** (Akcja) — holuje pojazd do swojego rozmiaru albo przyczepę (Szybkość obu ×½); wyciąga z rowu i gruzu.
- **Oszczędny** — spalanie 2 l / 100 km.
- **Ollie** — raz w turze za połowę Szybkości, Test Zręczności (Akrobatyka) ST 10: przeskok przez krawężnik lub
  przeszkodę do 1 m; porażka — Powalenie.

Do tego załoga M2A2 Bradley: 3 członków załogi i 6 żołnierzy desantu zamiast ogólnej załogi 12 z podręcznika.

✅ *Działa zawsze. Statystyki pojazdów bez statbloku to nie WKK, tylko interpolacja — patrz
[niżej](#czego-kobalt-nie-obejmuje).*

### 42. Smaczki postaci: Żeton Luxor i gadżety
<!-- kod: scripts/wkk/items/zeton-luxor.mjs, scripts/wkk/items/gadzety.mjs -->

Rzeczy z kart bohaterów tej kampanii, bez mechaniki albo prawie bez:

- **Żeton Luxor** — plastikowy żeton kasyna, 10 gb przy stołach i okienkach należących do Grand Holdings; poza
  Vegas jego wartość to kwestia targu.
- **Gadżety**, które da się kliknąć — hałasują w miejscu na mapie, żeby stół to usłyszał: **Gumowa kaczuszka**,
  **Krótkofalówka**, **Przemysłowy środek do dezynfekcji**, **Długopis**. Baterie krótkofalówek śledzi (albo nie)
  MG.

✅ *Działa zawsze. Inne stoły, które zainstalują moduł, zobaczą żarty tego stołu — to świadomy koszt prostej
reguły podziału (`scripts/wkk/README.md`).*

## Czego Kobalt nie obejmuje

Wszystko, czego nie ma w spisie powyżej, jest z podręcznika (NOE), od autora systemu (RAI) albo jest
odczytaniem luki przez MG — i działa niezależnie od przełącznika. Z zasadami domowymi najłatwiej pomylić to,
czego w podręczniku nie ma, a co **nie jest** WKK:

**Rozstrzygnięcia autora systemu** (podziękowania — [README](../README.md#podziękowania)):

- magazynki są osobne dla każdego **modelu** broni, nie dla jej kategorii;
- w walce nie ładuje się naboi do wymiennego magazynka (zasada 32 dopuszcza to za test);
- zasięg rzutu granatem to co najmniej 18 m — „minimum 9” dotyczy modyfikatora;
- Widły Cywila zadają obrażenia kłute (wydanie październikowe zgubiło typ);
- tabele schematów Speca stoją **obok** przepisu standardowego, tylko dla tej profesji, i wymagają zestawu
  profesji oraz zwykłych narzędzi przedmiotu (z Kobaltem zastępuje je zasada 9);
- Oporządzenie — sloty ciała, ręce i kabury, ziemia jako miejsce upuszczenia, BN upuszczający broń przy 0 PW
  (osobne ustawienie, nie Kobalt) i reszta; pancerz wspomagany pozwala na hełm (z Kobaltem — zasada 11);
- Trudność Trafienia: metody liczenia konkurują i wygrywa najwyższa, stałe premie (Obłęd Berserkera,
  Kuloodporność, Zasłona i inne) dodają się do zwycięskiej;
- ochraniacze to pancerz w warunkach zdolności — wyłączają Gołą klatę, Tarczę wiary, Obłęd i Kuloodporność;
- zejście z Krytycznego Stopnia Zranienia zdejmuje Wyczerpanie, które ten Stopień nadał (z Kobaltem zasada 14
  robi z niego poziom uporczywy);
- Łyżeczka: tabela wagi tylko dla jej posiadacza; „działa jak…” broni improwizowanej to najwyżej broń 1k6 i tylko
  dla rzeczy przypominających broń; Łyżeczka i zasady broni improwizowanej się wykluczają;
- statystyki dziesięciu pojazdów bez statbloku są interpolowane z czterech statbloków podręcznika; Terenówka i
  Potrącenie przeniesione na pojazdy bez statbloku.

**Odczytania luk przez MG** — tam, gdzie podręcznik milczy: drony i towarzysze, handel i doba w osadzie,
szabrowanie i bebeszenie, broń improwizowana, obiekty i woda. Nie zmieniają żadnej wydrukowanej liczby, tylko
wypełniają brak. Opisują je strony tematyczne ([Towarzysze i drony](Towarzysze-i-drony.md),
[Handel i postój](Handel-i-postoj.md), [Wyprawy](Wyprawy.md),
[Broń improwizowana i obiekty](Bron-improwizowana-i-obiekty.md), [Ruch i teren](Ruch-i-teren.md)); pełna lista z
miejscami w kodzie — [`scripts/wkk/README.md`](../scripts/wkk/README.md#gm-readings-of-raw-gaps-m3). Pytania, które
czekają na autora — [Pytania do autora systemu](Pytania-do-autora.md).

## Dopisywanie nowej zasady

Każda nowa zasada Kobaltu to **osobny nagłówek `### N.`** i **wiersz o tym samym numerze w
[spisie](#spis-zasad-wkk)** — z kolumną *Przełącznik* (`Kolor Kobaltu`, podustawienie albo `zawsze`). Numerów
nie zmieniamy: odwołują się do nich inne strony i komentarze w kodzie. W miarę możności:

- co dokładnie się zmienia względem RAW (jeśli jest punkt odniesienia w podręczniku) i co jest bez Kobaltu,
- status wdrożenia w module (✅ / 🚧),
- jeśli mechanika jest nieoczywista (progi, wzory, wyjątki) — dopisz je od razu, nie zakładaj,
  że ktoś je "po prostu wie",
- pod nagłówkiem komentarz `<!-- kod: scripts/wkk/… -->` z plikiem, w którym zasada mieszka.

`npm test` (`dev/kobalt-doc-check.mjs`) pilnuje, żeby ta strona nie rozjechała się z kodem: każdy numer ma
nagłówek i wiersz spisu, każdy plik `scripts/wkk/` jest tu wskazany, a każda nazwa przedmiotu, choroby, fobii,
zdolności, cechy pojazdu i ustawienia WKK z kodu pada na tej stronie.

Techniczny plan wdrożenia (jak to jest/będzie spięte w kodzie, jedno ustawienie świata
`Kolor Kobaltu` czytane w kilku miejscach) — zobacz [`PLAN_kobalt.md`](../PLAN_kobalt.md).
