# Referencje i bieżące grafiki Bestiariusza

Stan: 2026-10-31. Obowiązuje **portret → akceptacja → żeton → akceptacja**.
Docelowe pliki mają **wszystkie 23 zatwierdzone pary**: czterech towarzyszy, trzy konie
i szesnaście wpisów Bestiariusza. Ostatnia dostawa to **Neoniedźwiedź p07/t01** i
**Mobsprzęt p01/t05**. Nie pozostał żaden brak w tej kolejce portretów/żetonów.
Nie uruchamiano buildów paczek lub zmian świata. [Wersje i hashe dostaw](installed.json).

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

GM dostarczył ilustracje Neuroshimy 1.5: **Taran**, **Korzec** i **Gigantyczny pająk**.
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

Walidacja: **95 kandydatów w 23 parach**, bez błędów formatu, kadru i powiązań.
