# Wraki maszyn i dronów — cztery wspólne stosy

2026-10-29, korekty po ocenie MG: aktualne cztery grafiki mają nieregularne obrysy i wyraźną
hierarchię wielkości części. Spójność stylu nie jest już wymogiem. Wszystkie nowe warianty
czekają na ocenę MG w tym samym podglądzie.

- Mały v2 i średni v2: edycje własnych v1 — poszarpane, wystające fragmenty, wyrwy w obrysie
  i prawdziwie przezroczyste dziury przez stos. Zachowują wcześniejsze malowanie i mieszankę
  dużych oraz drobnych elementów. Szczególnie średni przestaje być okrągłym plackiem części.
- Duży v3 i gigantyczny v3: niezależnie wygenerowane ciężkie konstrukcje v2, potem edycje
  materiałów. Dominują zerwane płyty, zgniecione obudowy i dźwigary; drobne resztki tkwią
  w szczelinach. Nadtopione krawędzie, zastygłe zacieki, pęcherze i osmolone powierzchnie
  pokazują stopienie i zwęglenie. Nie odtwarzają sylwetki określonego modelu maszyny.

Pierwsza ocena małego/średniego była pozytywna; późniejsza wyraźna prośba o poszarpanie
obu mniejszych zastąpiła wcześniejsze zachowanie ich bitowo. Wszystkie v1 pozostają w źródłach.

| Plik w `tokens/wraki/` | Rozdzielczość | Wypełnienie ramki | Rozmiary aktora |
|---|---|---|---|
| `maly.webp` | 400×400 | 70% | Malutki, Mały |
| `sredni.webp` | 400×400 | 90% | Średni |
| `duzy.webp` | 800×800 | 90% | Duży |
| `gigantyczny.webp` | 1600×1600 | 92% | Wielki, Ogromny |

Wszystkie WEBP RGBA z rzeczywistą alfą, otworami i czystymi marginesami. Wspólne materiały:
zastygły czarny żużel, matowa stal i przypalona miedź. Bez całych głów,
kończyn, kół, gąsienic, podwozi, rozpoznawalnych modeli, podłoża, cieni poza częściami,
płomieni, dymu i żarzących się elementów. Aktualne rozmiary plików w walidacji.

## Źródła i wykonanie

Wbudowane OpenAI `image_gen.imagegen`, bez API/CLI; narzędzie nie podaje modelu.
[Prompty pierwszej serii i role referencji](prompts.json): średni stos ustalił materiały,
trzy pochodne używały go jako referencji. To podejście odrzucone dla dużych wariantów.
[Nowe niezależne prompty](revision-v2-prompts.json), bez obrazów wejściowych, ustalają bryły.
[Edycje stopienia i zwęglenia](revision-v3-prompts.json) używają wyłącznie własnego v2 jako
referencji. [Poszarpanie mniejszych](revision-jagged-prompts.json) używa własnych v1.
Aktywne źródła w [selection.json](selection.json): `maly-v2.png`, `sredni-v2.png`,
`duzy-v3.png`, `gigantyczny-v3.png`. Starsze wersje zachowane jako źródła historyczne.

`prepare.py` dopasowuje widoczne granice do docelowego wypełnienia i centruje stos na
przezroczystej ramce. To tylko kadrowanie i skalowanie, bez malowania. Cztery wygenerowane
źródła mają 1254×1254 px; największy format 1600×1600 wymaga około 20% powiększenia
widocznego wycinka. Nie powstają przy tym nowe szczegóły. Przy rozmiarze na planszy pozostaje
czytelny; ewentualne dalsze poprawki zależą od oceny MG.
Packer używa przygotowanych PNG w `../in/wraki/` i koduje tylko wskazane cztery pliki.

```sh
python dev/art/m5/wraki/prepare.py
python dev/art/m5/pack.py --asset wraki/maly --asset wraki/sredni --asset wraki/duzy --asset wraki/gigantyczny
python dev/art/m5/wraki/validate.py
```

[Walidacja, sumy kontrolne i wypełnienie](validation.json), [przeskalowanie](framing.json),
[przegląd kształtów i wspólnej skali](review-contact.jpg). Metry w raporcie dotyczą texture scale 1.
Runtime zachowuje dotychczasowe pole i skalę każdego żetonu; istniejący Mały aktor może
mieć własne pomniejszenie. Żadne globalne skale postaci nie zostały zmienione.

## Integracja i Poligon

`combat/autodestrukcja.mjs` już obsługuje dokładne nazwy plików i przypisanie rozmiarów;
kod produkcyjny nie wymaga zmiany ani przebudowy kompendiów. Autodestrukcja używa nowych
grafik przy następnym wybuchu. Zachowana flaga oryginału i przycisk Przywróć grafikę.
Istniejące wraki ze starszym przyciemnieniem nie są automatycznie przepisywane.

**Poligon → Złomowisko → Karta prób → Grafika: Wraki maszyn**, sonda `grafika-wraki-maszyn`.
Stały generator `stations/zlomowisko-wraki.mjs`, scena `machine-wreck-art-review-v1`.
Spawacz, Gladiator, Obrońca i Juggernaut u góry; ich wspólne wraki u dołu, człowiek w skali
źródłowej obok. Przykładowe pola 1×1, 1×1, 2×2 i 3×3. Największy obraz jest też używany
na 4×4. Przyciskami Karty prób można przywracać grafikę i ponownie pokazywać wrak
zaznaczonych egzemplarzy podglądu. Kolejne przyjęcie galerii zachowuje ręczne ustawienia;
Reset Złomowiska odtwarza ją wraz z dotychczasowym placem.

## Sprawdzenie

Aktualny komplet `maly-v2 / sredni-v2 / duzy-v3 / gigantyczny-v3`: E2E `wraki-maszyn`
**7/7**, bez błędów konsoli. Raport i zrzut:
`logs/e2e/2026-10-28T23-34-40/report.json`. Format, alfa, marginesy i wypełnienie wszystkich
czterech plików sprawdzone. Klienci MG i Gracza 1 przeładowani z nowymi teksturami.
Przy tej poprawce nie zmieniono żadnego dokumentu Poligonu: porównanie SHA-256 pełnego
zestawu 37 scen / 424 żetonów przed i po jest identyczne. Źródłowe skale i ustawienia zachowane.

Pierwsza dostawa:
`npm test` zielony. E2E `wraki-maszyn` **7/7** i `autodestrukcja` **4/4**, bez błędów
konsoli i ostrzeżeń modułu. Raport: `logs/e2e/2026-10-28T23-01-42/report.json`, dwa zrzuty.
Sprawdzono wszystkie cztery pliki u MG i gracza, realne przyciski Karty prób, przywracanie,
zachowanie pól i skal (także .5×.5 i 4×4), ponowne przyjęcie i reset. Pełny przebieg
0 PW → rzut MG → odliczanie → wybuch → grafika wraku → Przywróć używa natywnego obrazu.

Testy czekają na pierwszy rysunek żetonu przed zmianą tekstury i na zakończenie przejścia
przed usunięciem. Poprzedni szybki test tworzył i zmieniał teksturę zanim rdzeń miał mesh;
nie dodano obejścia ani tłumienia błędów w produkcji.

Magazyn i wnętrze wraku w Szabrowaniu pozostają zadaniem MG w web UI; te obrazy nie były
generowane ani zmieniane w tej dostawie.

Instalacja w Poligonie: nowa scena z dziewięcioma żetonami; zachowano pełne dokumenty
36 wcześniejszych scen i wszystkie 415 wcześniejszych żetonów. Nie resetowano Złomowiska
ani Garażu. Podgląd otwarty u MG i Gracza 1. Źródłowe skale przykładów: Spawacz .71,
Gladiator .97, Obrońca .95, Juggernaut .98; człowiek 1. Grafiki wraków dziedziczą te skale.
