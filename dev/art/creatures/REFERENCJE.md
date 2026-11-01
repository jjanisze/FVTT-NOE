# Referencje i bieżące grafiki Bestiariusza

Stan: 2026-10-31. Obowiązuje **portret → akceptacja → żeton → akceptacja**.
Docelowe pliki ma **29 zatwierdzonych par**: czterech towarzyszy, trzy konie
i dwadzieścia dwa pozostałe wpisy Bestiariusza. Ostatnia dostawa to **Spawacz p06/t10,
4/5 i 5/5**. Wszystkie 29 par jest ukończone, bez aktywnych wpisów.
Własne portrety i żetony ma teraz **52/52 istot**.
Nie uruchamiano buildów paczek lub zmian świata. [Wersje i hashe dostaw](installed.json).

## Spawacz — p06/t10 zatwierdzone i dostarczone

Poprzedni raport zakończenia obejmował zamkniętą kolejkę, a nie cały Bestiariusz.
[Audyt wszystkich 52 istot](bestiary-coverage.json) potwierdza własne portrety i żetony
dla każdej istoty. Nakładka Death Breath jest wyłączona z liczby istot.

GM odrzucił wszystkie sześć istniejących p01 i zlecił regenerację. Z nowych portretów
zatwierdził Gangusa p02 (4/5), Kitchina p02 (5/5) i Techmorwę p02 (5/5), następnie ich
żetony t02 (wszystkie 5/5). Pary są dostarczone. Bit-boy p03/t02 i Cyngiel p04/t02 też zostały
zatwierdzone po 5/5 i dostarczone. Spawacz p06 uzyskał 4/5 i odblokował generację t01.

| Wpis | Bieżący portret | Co teraz ocenić |
|---|---|---|
| Bit-boy przewodnik | [p03](candidates/bit-boy-przewodnik/portrait-p03.webp), zatwierdzony 5/5 | [Żeton t02](candidates/bit-boy-przewodnik/token-t02.webp) zatwierdzony 5/5; para dostarczona |
| Cyngiel | [p04](candidates/cyngiel/portrait-p04.webp), zatwierdzony 5/5 | [Żeton t02](candidates/cyngiel/token-t02.webp) zatwierdzony 5/5; para dostarczona |
| Gangus żołnierz | [p02](candidates/gangus-zolnierz/portrait-p02.webp), zatwierdzony 4/5 | t02 zatwierdzony 5/5; para dostarczona |
| Kitchin | [p02](candidates/kitchin/portrait-p02.webp), zatwierdzony 5/5 | t02 zatwierdzony 5/5; para dostarczona |
| Spawacz | [p06](candidates/spawacz/portrait-p06.webp), zatwierdzony 4/5 | [t10](candidates/spawacz/token-t10.webp) zatwierdzony 5/5; para dostarczona |
| Techmorwa średnia | [p02](candidates/techmorwa-srednia/portrait-p02.webp), zatwierdzony 5/5 | t02 zatwierdzony 5/5; para dostarczona |

### Ostatnia partia — wybrano t10

GM ocenił **t03 na 5/5, do poprawy**. Wskazał wyłącznie dwie krótkie, podwinięte resztki
stawów przy górnej/tylnej krawędzi korpusu; pełne tylne nogi wychodzące w górne rogi
mają pozostać. Osiem poniższych edycji powstało niezależnie z tego samego źródłowego PNG t03
oraz zatwierdzonego portretu p06, z czterema parami instrukcji dotyczących tej samej poprawki.
Nie zmieniano kierunku postaci ani nie proszono o nową pozę.

| Wariant | Oceniany WEBP | Dokładny prompt i hashe wejść |
|---|---|---|
| F | [t07](candidates/spawacz/token-t07.webp) | [JSON](prompts/spawacz/token-t07.json) |
| G | [t08](candidates/spawacz/token-t08.webp) | [JSON](prompts/spawacz/token-t08.json) |
| H | [t09](candidates/spawacz/token-t09.webp) | [JSON](prompts/spawacz/token-t09.json) |
| I | [t10](candidates/spawacz/token-t10.webp) | [JSON](prompts/spawacz/token-t10.json) |
| J | [t11](candidates/spawacz/token-t11.webp) | [JSON](prompts/spawacz/token-t11.json) |
| K | [t12](candidates/spawacz/token-t12.webp) | [JSON](prompts/spawacz/token-t12.json) |
| L | [t13](candidates/spawacz/token-t13.webp) | [JSON](prompts/spawacz/token-t13.json) |
| M | [t14](candidates/spawacz/token-t14.webp) | [JSON](prompts/spawacz/token-t14.json) |

Oględziny agenta: wszystkie osiem usuwa wskazaną parę, zachowując sześć pełnych podpór
i oba ramiona narzędziowe. Różnią się rekonstrukcją tylnego brzegu i drobnymi zmianami
powierzchni metalu. GM zatwierdził **t10 na 5/5** i dostarczono parę p06/t10.
Finalne pliki: `tokens/portraits/spawacz.webp` i `tokens/spawacz.webp`.
Pozostałe nowe wersje nie mają ocen GM ani dostawy. Oryginalne PNG pozostają
w `in/spawacz/token-t07.png`–`token-t14.png`, dostępne do inspekcji z panelu.

Arkusze: `out/spawacz-phantom-batch.jpg` — baza t03 i osiem pełnych sylwetek;
`out/spawacz-phantom-rear-details.jpg` — same wycinki miejsca poprawki.
Poniższe wcześniejsze próby pozostają historią, z niezmienionymi zapisami ocen.

### Poprzednia seria — przed wyborem t03

Odrzucone p01 pozostają jako niezmienione kopie dotychczasowych portretów GM z zapisanymi
decyzjami. Zachowano też wszystkie próby pośrednie. Spawacz p04 zmniejszył plamy, ale na
próbkach 1:1 pozostała delikatna siatka; p05 odmalowuje wnętrza płyt gładką powłoką bez
rozmywania rzeczywistych łączeń. Pierwszy żeton Kitchina miał pięć par nóg; t02 dodaje
szóstą. Gangus i Techmorwa dostają bardziej pionową kamerę względem t01.
Po zaakceptowaniu czystej geometrii Spawacza GM poprosił o ponowne przybrudzenie kontrolowanymi,
dużymi śladami. p06 dodaje tę patynę na bazie p05, pozostawiając szerokie spokojne płaszczyzny.
GM ocenił t01 na **2/5, do poprawy**: nogi wychodziły z naramienników, a narzędzia
z przednich nóg lub spod korpusu. Sama liczba 6+2 nie oznacza poprawnej anatomii.
Na prośbę GM powstało pięć niezależnych generacji, każda z p06 i schematu mocowań,
bez przenoszenia błędnych pikseli z t01. [Schemat v1](geometry/spawacz-attachment-v1.svg)
oddziela sześć dolnych gniazd biodrowych i dwa gniazda barkowe. [Schemat v2](geometry/spawacz-attachment-v2.svg)
dodatkowo rozsuwa ramiona na zewnątrz i przednie podpory ku osi, odsłaniając gniazda pod
półprzezroczystą bryłą pomocniczą; przezroczysty tułów nie jest częścią finalnej grafiki.

| Próba | Żeton | Kontrola przygotowania, nie ocena GM | Dokładny prompt |
|---|---|---|---|
| A | [t02](candidates/spawacz/token-t02.webp) | Nadal zlewa przednie nogi z łokciami; zachowana jako nieudana próba | [JSON](prompts/spawacz/token-t02.json) |
| B | [t03](candidates/spawacz/token-t03.webp) | Osobne ramiona barkowe; sprawdź przebieg nóg za przedramionami | [JSON](prompts/spawacz/token-t03.json) |
| C | [t04](candidates/spawacz/token-t04.webp) | Bardziej zwarty układ; sprawdź tylne mocowania i skrzyżowania | [JSON](prompts/spawacz/token-t04.json) |
| D | [t05](candidates/spawacz/token-t05.webp) | Wyróżniony w poprzedniej kontroli: narzędzia na zewnątrz, przednie nogi bliżej osi; GM następnie wybrał t03 | [JSON](prompts/spawacz/token-t05.json) |
| E | [t06](candidates/spawacz/token-t06.webp) | Tylne nogi wyglądają na mocowane w górnych płytach; zachowana jako nieudana próba | [JSON](prompts/spawacz/token-t06.json) |

Z nowej ósemki zatwierdzono i dostarczono t10. Pozostałe próby są dostępne do porównania.
Kliknięcie portretu otwiera oryginał w 1:1.

Arkusz poprzedniej serii: `out/spawacz-attachment-shortlist.jpg`, z portretem p06 i wariantami B/C/D
oraz próbkami 70/140 px na dwóch tłach. Wszystkie źródłowe PNG są dostępne w panelu.
Starsze arkusze: `out/spawacz-approved-portrait-token.jpg`, `out/spawacz-attachment-variants.jpg`,
`out/remaining-three-review.jpg`,
`out/three-portrait-revisions.jpg`,
`out/three-approved-portrait-token-pairs.jpg` i `out/spawacz-surface-1to1.jpg`.
Dokładne instrukcje: `prompts/<id>/`. Starszy arkusz sześciu portretów pozostaje w historii.

## Neoniedźwiedź — p07/t01 zatwierdzone i dostarczone

GM odrzucił kumulację szumu i artefaktów po kolejnych edycjach p01–p04. Poniższe wersje
powstały **niezależnie od zera, wyłącznie z opisu tekstowego**, bez obrazów wejściowych.
Zachowują koncepcję: olbrzymi chudy niedźwiedź, głównie łysa skóra z dużymi luźnymi fałdami,
ograniczone pasma futra i szerokie stare blizny. GM wybrał **p07/C, 5/5: „Perfect.”**.

| Wariant | Portret | Różnica |
|---|---|---|
| A | [p05](candidates/neoniedzwiedz/portrait-p05.webp) | Pochylona sylwetka, szeroki szkielet barków i węższa talia, cieplejsza skóra |
| B | [p06](candidates/neoniedzwiedz/portrait-p06.webp) | Wyższy, długonogi i najbardziej wychudzony; luźny fałd pod szyją |
| C — zatwierdzony 5/5 | [p07](candidates/neoniedzwiedz/portrait-p07.webp) | Dłuższy, niższy grzbiet, ciemniejsza skóra i ciężkie luźne fałdy |

Z zatwierdzonego p07 powstał [żeton t01](candidates/neoniedzwiedz/token-t01.webp), następnie
zatwierdzony 4/5 i dostarczony z portretem. Zachowuje głównie łysą skórę, szerokie fałdy, pasmo futra na grzbiecie i stare
blizny; ma cztery łapy, głowę na południe i prawdziwą alfę. Drugi obraz wejściowy dostarczał
tylko kamerę i sposób malowania, bez tożsamości lub rozmieszczenia futra.
Lokalny arkusz pary: `out/neoniedzwiedz-p07-token-t01.jpg`. Starsze próby i oceny pozostają
dostępne; porównanie portretów: `out/neoniedzwiedz-fresh-variants.jpg`.

Kliknięcie portretu otwiera oryginalny PNG **1:1**. Przy żetonie sprawdź zgodność anatomii,
duże płaszczyzny skóry i czytelność 70/140 px. Finalne pliki: `tokens/portraits/neoniedzwiedz.webp`
i `tokens/neoniedzwiedz.webp`; dokładnie zatwierdzone bajty.

## Mobsprzęt — p01/t05 zatwierdzone i dostarczone

[Poprzedni żeton t04](candidates/mobsprzet/token-t04.webp) korzysta z zatwierdzonego
[portretu p01](candidates/mobsprzet/portrait-p01.webp). Górny moduł z lufą i anteną przesunięto
w dół, aby bardziej zachodził na segment środkowy. Materiały są bardziej stonowane i matowe,
z naprawianymi płytami, ciemnymi przegubami i praktycznymi mocowaniami. Zachowano prostą
oś północ–południe, cztery koła, jedną lufę i czytelność trzech obudów.

GM ocenił t04 na **4/5, do poprawy**: jeszcze bardziej przesunąć wieżę na południe i wygenerować
kilka wariantów. Każdy poniższy powstał niezależnie z t04 i zatwierdzonego portretu p01.

| Wariant | Żeton | Cechy do porównania |
|---|---|---|
| A | [t05](candidates/mobsprzet/token-t05.webp) | Umiarkowane dodatkowe przesunięcie, widoczny tylny pas środkowej obudowy |
| B | [t06](candidates/mobsprzet/token-t06.webp) | Wyraźnie odsłonięty tył środka i większa część wieży nad przednią częścią korpusu |
| C | [t07](candidates/mobsprzet/token-t07.webp) | Zwarta piętrowa bryła, inna projekcja połączeń między obudowami |

Generator nie wykonuje sztywnych przesunięć zaznaczonego wycinka. Wartości w promptach są
celem, a nie pomiarem rezultatu; warianty zmieniają też nieco projekcję podwozia. Porównuj
rzeczywiste położenie wieży względem osi kół, proporcje obudów i zgodność z portretem.
Arkusz t04/t05/t06/t07 w jednakowych ramkach oraz 70/140 px: `out/mobsprzet-turret-variants.jpg`.
GM wybrał **t05/A, 4/5** do zatwierdzonego **p01, 4/5**. Ta para jest już dostarczona:
`tokens/portraits/mobsprzet.webp` i `tokens/mobsprzet.webp`. Alternatywy t06/B i t07/C oraz
starsze próby pozostają do porównania. Poprzedni finalny portret zachowano w lokalnej kopii dostawy.

## Ostatnie zatwierdzone dostawy

| Wpis | Portret | Żeton | Oceny portret/żeton |
|---|---|---|---|
| Spawacz | p06 | t10 | 4/5 · 5/5 |
| Bit-boy przewodnik | p03 | t02 | 5/5 · 5/5 |
| Cyngiel | p04 | t02 | 5/5 · 5/5 |
| Gangus żołnierz | p02 | t02 | 4/5 · 5/5 |
| Kitchin | p02 | t02 | 5/5 · 5/5 |
| Techmorwa średnia | p02 | t02 | 5/5 · 5/5 |
| Neoniedźwiedź | p07 | t01 | 5/5 · 4/5 |
| Mobsprzęt | p01 | t05 | 4/5 · 4/5 |
| Koń skażony — wyrównana postawa | p09 | t02 | 5/5 · 4/5 |
| Neogator | p02 | t01 | 4/5 · 4/5 |
| Pies mutek | p03 | t01 | 5/5 · 5/5 |
| Generacja II — genotyp wilczy | p02 | t01 | 5/5 · 4/5 |
| Pająk — maszyna | p07 | t01 | 4/5 · 4/5 |
| Szeryf | p02 | t02 | 4/5 · 4/5 |

W poprzedniej turze pięć wpisów otrzymało nową dostawę, a koń skażony zatwierdzoną podmianę t01 → t02.
Starszy koń t01 pozostaje w kandydatach i kopii poprzedniej dostawy.

Wcześniej dostarczono pozostałe dziewięć par Bestiariusza, czterech towarzyszy oraz zdrowego
konia i Teksańczyka. Finalne ścieżki to `tokens/portraits/<id>.webp` i `tokens/<id>.webp`.
Dostawa kopiuje dokładnie ocenione bajty. [Rejestr dostaw](installed.json).
Żaden nowy wariant nie jest automatycznie zatwierdzany lub instalowany.

## Referencje, geometria i pochodzenie

GM dostarczył ilustracje Neuroshimy 1.5: **Taran**, **Korzec**, **Gigantyczny pająk** i później **Spawacz**.
Wyznaczają anatomię i proporcje; malowanie pochodzi z osobnych referencji stylu.
Dla pozostałych wpisów GM potwierdził brak ilustracji. Podstawą są opisy NOE z
`dev/bestiary/bestiary.json` oraz późniejsze wskazówki GM.

Mobsprzęt zachowuje koncept GM z jedną lufą, czterema kołami i piętrowymi obudowami.
[Oryginalny schemat](geometry/mobsprzet-layout-v1.svg) ujawnił trzy bryły w rzucie.
[Układ Pająka](geometry/pajak-layout-v1.svg) pomógł rozdzielić cztery nogi na każdą stronę.
[Rejestr renderów](geometry/manifest.json). Zatwierdzony Pająk p07 powstał po zmianie kadru
i miejscowym dodaniu pary nóg; t01 usuwa tylko tło, zachowując osiem nóg i dwie antenki.

Oryginały GM i rastrowe rendery referencji są w ignorowanym `in/references/`.
Nie trafiają do dystrybucji. [Źródła i hashe](reference-sources.json).
Dokładne instrukcje i role wejść: [prompty image_gen](prompts/).
Użyto wbudowanego narzędzia OpenAI; identyfikator modelu nie jest ujawniany.
Normalizacja wyłącznie kadruje, skaluje i zapisuje WEBP; nie maluje.

Dla koni porównano nie tylko obrys, lecz również projekcję tułowia i siodła. Dłuższy ogon
pierwszego skażonego t01 skracał tułów w kadrze i przesuwał siodło około 60 px ku głowie.
Zatwierdzony t02 wyrównuje postawę do pozostałych koni, zachowując chudość.
Historyczne arkusze: `out/horse-comparison.jpg`, `out/horse-comparison-t02.jpg`.

Rejestr ma **138 kandydatów w 29 parach**. Walidacja bieżącej partii obejmuje format, kadrowanie,
alfę, hashe i dokładne powiązania żetonów z zatwierdzonymi portretami. Własne portrety i żetony ma 52/52 istot.
Mapowania archiwalnych wejść po podmianie finalnych portretów są w `reference-sources.json`;
zamrożone prompty zachowują rzeczywistą historyczną ścieżkę i hash użytego obrazu.
