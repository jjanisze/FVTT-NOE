# Grafiki stworzeń — portrety i żetony

Stan: 2026-10-31. Zakres GM: **obie grafiki dla każdego wpisu**, z pipeline'em zbliżonym do
istniejących par GM Craft Tavern. Generowanie przez wbudowane image_gen; nazwa modelu nie
jest udostępniana. [Instrukcja i narzędzia](dev/art/creatures/README.md),
[kolejka i wersje](dev/art/creatures/manifest.json).

## Aktualny etap — wszystkie 23 pary dostarczone, tylko zasoby

GM dopuścił rozbudowę i scalenie narzędzia oceny grafik. Kod mechaniki Foundry, buildy
paczek i regresje Claude'a pozostają poza zakresem; sprawdzamy wyłącznie narzędzie grafik.
Obowiązuje sekwencja **portret → akceptacja → żeton → akceptacja**. Wszystkie szesnaście par
Bestiariusza ma obie akceptacje i docelowe pliki; dostarczono też wszystkie trzy konie oraz
czterech towarzyszy — razem **23 pary**. Ostatnie zatwierdzone pary to Neoniedźwiedź p07/t01
(5/5, 4/5) i Mobsprzęt p01/t05 (4/5, 4/5). Kolejka grafik stworzeń jest zamknięta.
Alternatywy pozostają w historii. GM dostarczył szkice
Tarana, Korzca i gigantycznego pająka oraz wskazał istniejący koncept Mobsprzętu.
Potwierdził brak ilustracji pozostałych wpisów, więc ich kierunki pochodzą z NOE / `bestiary.json`.
[Lista do referencji i kierunki koni](dev/art/creatures/REFERENCJE.md).

Panel jest teraz częścią wspólnego serwera `review:graphics` / `review:icons`, pod zakładką
**Portrety i żetony** (`/creatures/`). `review:creatures` to alias tego samego serwera.
Sidebar przypina aktywną pracę, zwija plany i grupuje ukończone pary w drzewo kategorii.
Oceny i historia pozostają w dotychczasowych plikach.

Zdrowy koń: portret p01 zaakceptowany 5/5, żeton t01 zaakceptowany 4/5; oba finalne pliki
zapisane, kredyty i MISSING zaktualizowane, bez builda paczek. Teksańczyk: portret p02
i żeton t01 zaakceptowane 5/5, finalne pliki dostarczone. Skażony: GM potwierdził usunięcie
szumu w p06 (4/5), następnie poprosił o miejscowe bąble i dalsze wychudzenie. Bieżący
portret p09 zaakceptowany 5/5, żeton t02 zaakceptowany 4/5; para dostarczona.
Po uwadze GM o posturze t02 wyrównał projekcję do pozostałych koni. Wszystkie konie mają 800 px
i obrys wysokości 720 px, lecz dłuższy ogon t01 skracał tułów i przesuwał siodło około 60 px
w stronę głowy. t02 wykorzystuje tylko postawę/projekcję zdrowego konia; wcześniejszy t01
pozostaje w historii i kopii dostawy, a t02 jest teraz plikiem finalnym.
Starsze próby zachowano. Dokładne prompty i rejestr referencji są w katalogu obrazów.

Kliknięcie portretu otwiera teraz oryginał PNG w 1:1 (jeśli dostępny i zgodny z hashem),
z przewijaniem, przełączaniem na oceniany WEBP, opcjonalnym dopasowaniem i zamykaniem Esc.
W Chrome potwierdzono 1122×1402 px w stylu 1122×1402 px, WEBP 800×1000 px, przewijanie
w obu osiach na wąskim ekranie, zachowanie formularza i powrót fokusu. Dostęp do źródeł
jest ograniczony do zarejestrowanych plików. Testy narzędzia: 19; przygotowania: 4.

Pełny audyt rozszerzył kolejkę Bestiariusza z 11 do 16 par, osobno od 3 par koni i 4 par
towarzyszy: dodano Gigantycznego pająka, Neogatora, Neoniedźwiedzia, Psa mutka i Konwojenta.
Wszystkie te dodatkowe wpisy miały użyteczny alias żetonu, ale brak własnego portretu.
Referencje GM i potwierdzenie braku pozostałych ilustracji uzyskano przed generacją potworów.

## Towarzysze — ocena GM i poprawki

| Towarzysz | Portret | Żeton | Stan |
|---|---|---|---|
| Psi partner | p01 | t02 z p01 | GM: obie grafiki 5/5, zaakceptowane i zainstalowane |
| Zmutowany owad | p01 | t02 z p01 | Obie grafiki zaakceptowane 5/5 |
| Zmutowany ssak | p02 | t01 z p02 | GM przywrócił pierwotny niedźwiedzi kierunek; obie grafiki zaakceptowane 5/5 |
| Zmutowany gad | p03 | t03 z p03 | Obie grafiki zaakceptowane 5/5 |

Zapisane oceny GM są w `dev/art/creatures/review/feedback.json`; agent nie zmienia ich za GM.
Pies p01/t02 trafił do finalnych plików, zapisano dostawę i kredyty, przebudowano paczkę
`towarzysze` przez `fvtt packs --only=towarzysze`; walidacja paczek przeszła. Kampania
pozostała wyłączona, Poligon nie był restartowany ani reseedowany.

W aktualnej turze przywrócono same finalne pliki wszystkich czterech zaakceptowanych par,
kopiując dokładnie ocenione bajty. Ich wcześniejsza dostawa była nieobecna na dysku mimo
zachowanego rekordu. Odświeżono `installed.json`; bez ponownego builda paczek lub zmian świata.
Do ssaka użyto wskazanych przez GM wersji p02/t01, a nie późniejszej propozycji szopiej.

Historia poprzedniej iteracji: owad zachowuje zaakceptowany portret; poprawka żetonu
uzupełnia brakującą parę odnóży. GM odrzucił niedźwiedzi kierunek ssaka oraz aligatorową
sylwetkę gada. Nowe pary mają wizualnie sugerować zagrożenie zbliżone do zwykłego psa.
W próbie gada p02 generator powtórzył zbyt wysoką psią postawę referencji stylu; p03 obniża
tułów i rozstawia ugięte łapy na boki. Żeton t03 dodatkowo dopasowuje palce łap do portretu.
Wcześniejsze wersje pozostają do porównania.

To zmiana grafiki: rozmiar ssaka `lg` i Siła 18 nadal pochodzą z `companions.json` / NOE.
Statblocki i skale Foundry nie zostały zmienione w ramach uwag o wyglądzie.

Panel uruchamia `npm run review:creatures`. Przy nowej generacji domyślnie pokazuje wersję
nowszą od ostatniej oceny; poprzednia decyzja i uwagi są dostępne przy formularzu. Każda nowa
wersja zaczyna bez oceny. Sam zapis oceny nie instaluje plików.

## Bestiariusz — stan 16 par

| ID | Portret | Żeton |
|---|---|---|
| cywil | p01 zaakceptowany 4/5 | t02 zaakceptowany 5/5; para dostarczona |
| gangus-boss | p02 zaakceptowany 5/5 | t01 zaakceptowany 5/5; para dostarczona |
| generacja-ii-genotyp-gadzi | p01 zaakceptowany 5/5 | t01 zaakceptowany 5/5; para dostarczona |
| generacja-ii-genotyp-wilczy | p02 zaakceptowany 5/5 | t01 zaakceptowany 4/5; para dostarczona |
| generacja-iii-szpieg | p02 zaakceptowany 5/5 | t01 zaakceptowany 5/5; para dostarczona |
| korzec | p01 zaakceptowany 4/5 | t02 zaakceptowany 5/5; para dostarczona |
| mobsprzet | p01 zaakceptowany 4/5 | t05/A zaakceptowany 4/5; para dostarczona |
| pajak | p07 zaakceptowany 4/5 | t01 zaakceptowany 4/5; para dostarczona |
| roj-szczurow | p01 zaakceptowany 4/5 | t01 zaakceptowany 4/5; para dostarczona |
| szeryf | p02 zaakceptowany 4/5 | t02 zaakceptowany 4/5; para dostarczona |
| taran | p01 zaakceptowany 4/5 | t01 zaakceptowany 4/5; para dostarczona |
| gigantyczny-pajak | p01 zaakceptowany 4/5 | t01 zaakceptowany 4/5; para dostarczona |
| neogator | p02 zaakceptowany 4/5 | t01 zaakceptowany 4/5; para dostarczona |
| neoniedzwiedz | p07 zaakceptowany 5/5 | t01 zaakceptowany 4/5; para dostarczona |
| pies-mutek | p03 zaakceptowany 5/5 | t01 zaakceptowany 5/5; para dostarczona |
| konwojent-straznik | p02 zaakceptowany 3/5 | t02 zaakceptowany 5/5; para dostarczona |

### Historia kolejnych tur

Kontrola partii portretów 2026-10-30: wszystkie 16 obrazów i ich oryginały są dostępne
w panelu; brak nowych żetonów przed akceptacją. Pająk p02 pokazuje osiem nóg, konwojent
p02 ma odrębną twarz. Koń skażony p08 dodaje miejscowe bąble do bazy p06; wcześniejsze
próby i oceny zachowano. Walidacja 48 kandydatów, hashe źródeł i referencji bez błędów.
Panel: 17 wpisów do pracy (16 Bestiariusza i koń skażony), 6 ukończonych par.

Po zapisanych uwagach GM powstało dziewięć poprawionych portretów i osiem nowych
żetonów z zaakceptowanych źródeł. Bieżące wersje i linki: [rejestr](dev/art/creatures/REFERENCJE.md).
Pająk p04 poprawia widoczność tylnej nogi lżejszego p03; Korzec t02 wzmacnia rzut z góry.
Walidacja 67 kandydatów bez błędów. Nowe grafiki oczekują na własne oceny, bez dostawy
do finalnych ścieżek lub builda paczek.

Aktualizacja 2026-10-31: pięć zaakceptowanych par Bestiariusza dostarczono do finalnych
ścieżek. Pozostają trzy portrety (niedźwiedź p03, pies p03, Pająk p07) i dziewięć żetonów
do oceny. Mobsprzęt t02 korzysta z oryginalnego schematu trzech obudów; Pająk p07 z układu
ośmiu nóg i miejscowego dodania pary do frontalnego kadru. Próby p05/p06 zachowano.
Walidacja 81 kandydatów bez błędów; MISSING: 35 brakujących finalnych grafik.

Kolejna dostawa 2026-10-31: zapisano pięć nowych zatwierdzonych par — skażony koń,
konwojent, cywil, boss i szpieg. Łącznie 16 par ma finalne pliki. Bieżące nowe propozycje
to niedźwiedź p04, pies t01, Pająk t01, Mobsprzęt t03 i Szeryf t02 oraz skażony koń t02
wyrównujący postawę/siodło do pozostałych koni. Koń t01 pozostaje dostarczony.
Neogator i wilczy genotyp nadal czekają na pierwszą ocenę żetonów t01.
Walidacja 87 kandydatów bez błędów; MISSING: 26 brakujących finalnych grafik.

Najnowsza dostawa 2026-10-31: zatwierdzono i zapisano Neogatora p02/t01, Psa mutka p03/t01,
wilczy genotyp p02/t01, Pajaka p07/t01 i Szeryfa p02/t02. Dodatkowo zaakceptowany żeton
skażonego konia t02 zastąpił wcześniejszy t01. Łącznie **21 par** ma docelowe pliki.
Neoniedźwiedź p04 został odrzucony z powodu skumulowanych artefaktów kolejnych edycji;
p05/A, p06/B i p07/C powstały od zera, bez obrazów wejściowych. Wybór portretu poprzedza
generację żetonu. Mobsprzęt t04 przesuwa górny moduł na południe i ogranicza zabawkowy
wygląd materiałów zgodnie z uwagą do t03. Walidacja **91 kandydatów** bez błędów;
MISSING: **17 brakujących finalnych grafik**, w tym trzy pliki stworzeń oraz 14 glifów.
Nie uruchamiano buildów paczek, testów regresji lub zmian świata.

Następna ocena 2026-10-31: Neoniedźwiedź p07/C zaakceptowany **5/5**, z niego wygenerowano
żeton t01 do osobnej oceny. Mobsprzęt t04 dostał **4/5, do poprawy** z prośbą o jeszcze niższą
wieżę i kilka wariantów. Niezależne edycje t04 dały t05/A, t06/B i t07/C; wszystkie pochodzą
z zatwierdzonego p01. Przesunięcia zadane w promptach nie są kalibracją pikselową rezultatów;
porównanie obejmuje również zmiany projekcji podwozia. Arkusze pary niedźwiedzia i wariantów
Mobsprzętu: `dev/art/creatures/out/`. **95 kandydatów**, nadal 21 dostarczonych par i 17 brakujących
finalnych grafik. Żadna nowa propozycja nie otrzymała automatycznej oceny lub dostawy.

Zamknięcie 2026-10-31: GM zatwierdził Neoniedźwiedzia t01 (4/5) i wybrał Mobsprzęt t05/A
(4/5). Obie pary dostarczono jako dokładnie ocenione WEBP, razem **23 zatwierdzone pary**.
Alternatywy oraz wcześniejsze finalne pliki pozostają w historii/kopiach dostaw. Zatwierdzono
i zapisano też 14 glifów instrumentów i stanów wodnych z B119–120. **Brak brakujących grafik
w aktualnej kolejce**; zostało 7 dźwięków pojazdów, w tym opcjonalna syrena. Podpięcie ikon
w konfiguracji, buildy paczek i aktualizacja aktorów są odłożone poza zakres „tylko zasoby”;
[handoff](dev/icons/FINAL_HANDOFF.md). Rejestr stworzeń nadal ma 95 kandydatów.

Kolejność można zmienić po ocenie pierwszej partii. Opisy i rozmiary pochodzą z
`dev/bestiary/bestiary.json`; nie edytować wygenerowanych danych Bestiariusza ręcznie.
Kolejka pozostaje w repo na kolejne sesje pracy; nie jest zadaniem uruchamianym w tle.

## Zasady kontynuacji

1. Portret jako źródło tożsamości, osobna referencja stylu/kamery dla żetonu. Bez przenoszenia
   wyposażenia z referencji stylu. Zachować ziemiste kolory, malarski detal i czytelną sylwetkę.
2. Każda poprawka dostaje nową wersję. Żeton wskazuje ID i SHA-256 portretu źródłowego.
3. Sprawdzić anatomię i zgodność pary, prawdziwą alfę, kierunek głowy, marginesy oraz 70 px.
   Normalizacja kadru nie zmienia skali postaci ani ustawień Poligonu.
4. Po decyzjach GM poprawiać wskazane wersje lub instalować zatwierdzone pary. Dostawa
   kopiuje dokładnie ocenione bajty; następnie kredyty i aktualizacja MISSING. Buildy paczek
   pozostają odłożone na czas obowiązującego zakresu „tylko zasoby”.
5. Ten etap to grafiki i osobny panel developerski. Nie zmienia M4, świata kampanii ani
   Poligonu i nie zajmuje mutexu sandboxa.

Sprawdzenie narzędzi: 4 testy serwera i 3 testy przygotowania/dostawy; walidacja 17 kandydatów
bez błędów. QA panelu w Chrome: cztery pary, osiem obrazów referencyjnych, wersje, ostrzeżenie
o niedopasowaniu portretu, podglądy, tła i obrót. Oceny testowe zapisują się wyłącznie w
tymczasowych fixtures. Szkic uwag przetrwał przeładowanie strony; testowy szkic usunięto.
Zrzut panelu pokazano w rozmowie. Po poprawkach QA potwierdza domyślne wersje: pies p01/t02,
owad p01/t02, ssak p03/t02, gad p03/t03; wszystkie obrazy załadowane, bez ostrzeżeń o
niedopasowaniu źródłowego portretu. Nowe wersje mają decyzję „Jeszcze nie oceniono”,
poprzednie uwagi są zachowane. Zatwierdzony pies ma dokładnie zaakceptowane hashe plików.

Pełne `npm test` przechodzi walidację rejestru testów, języka, dokumentacji WKK i 7 testów
scenerii, po czym zatrzymuje się na istniejącym już w HEAD ostrzeżeniu `deletion-syntax`
w `scripts/scenes/poscig-tura.mjs:389`. Pipeline grafik nie zmienia tego pliku.
