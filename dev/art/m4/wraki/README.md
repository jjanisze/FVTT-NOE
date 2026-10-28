# Wraki pojazdów — komplet 14 grafik

2026-10-28: decyzja MG zastępuje cztery wspólne kategorie **osobnym wrakiem każdego pojazdu**.
Zatwierdzony `tokens/wraki/pojazd-osobowy.webp` jest wyłącznie wrakiem Osobówki i pozostaje
bez zmian (SHA-256 sprawdzany w walidatorze). Pozostałe 13 grafik czeka na wspólną ocenę MG.

## Pliki i pochodzenie

Natywne WEBP RGBA: `tokens/wraki/pojazd-<slug>.webp`, wyjątek Osobówki: `pojazd-osobowy.webp`.
Lista 14 plików, rozmiary i statusy: [validation.json](validation.json), specyfikacja:
[../BRIEFS_MISSING.md](../BRIEFS_MISSING.md#vehicle-wrecks--14-delivered).
Wszystkie mają taką samą ramkę jak własny bazowy żeton, przód w dół i czyste przezroczyste
marginesy. Brak ludzi, płomieni, dymu, podłoża i rozsypanych obok odłamków.

Wbudowane `image_gen.imagegen`, edycja z referencjami, bez API/CLI. Narzędzie nie ujawnia modelu.
Każdy bazowy żeton ustala tożsamość i geometrię swojego wraku; zatwierdzony wrak Osobówki
służy wyłącznie jako wzór malowania i stopnia zniszczenia. Pełne prompty i role wejść:
[batch.json](batch.json); pierwotny sedan: [prompts.json](prompts.json).
Źródła nowych grafik: `variants/<slug>-v1.png`. Źródło sedana: `osobowy-v1.png`.

`prepare.py` przeskalowuje pełne wygenerowane płótno do natywnego formatu, bez wycinania
obiektu i malowania. To przywraca też proporcje długiego autobusu, które generator spłaszcza
do formatu 1:3. Packer koduje tylko nowe 13 plików; zaakceptowany WEBP sedana nie jest
ponownie kodowany. Wszystkie wraki razem: około 3,9 MB.

```sh
python dev/art/m4/gen_catalog.py
python dev/art/m4/wraki/prepare.py
# Package only selected new drops, e.g. --asset wraki/pojazd-hammer.
python dev/art/m4/pack.py --check
python dev/art/m4/wraki/validate.py
```

Przegląd obok sprawnych pojazdów: [review-contact.jpg](review-contact.jpg).
Pomiary skalowania: [framing.json](framing.json).
Katalog M4 ma 53 dostarczone zasoby; brakujących obrazów M4 już nie ma, pozostaje 7 dźwięków.

## Integracja

`GRAFIKI_WRAKOW` w `scripts/config/vehicles-data.mjs` mapuje 14 podwozi na 14 różnych plików.
`wrak.mjs` wybiera obraz po podwoziu, zachowując fit, kotwicę, skalę i tint tekstury.
Pełny oryginał trafia do flagi żetonu; cofnięcie wraku odtwarza całą teksturę. Starsze flagi
zawierające tylko src/tint są nadal obsługiwane. Przy braku właściwego pliku pozostaje
przyciemniona dotychczasowa grafika. Pole klasyfikacji `katalog.wrak` nie steruje już grafiką.

Abrams zachowuje płótno 780×2100 nad obrysem kadłuba 780×1680, fit width i kotwicę .5/.4.
Uszkodzone wieże Bradleya i Abramsa są namalowane w sprite wraku; renderer nie nakłada
sprawnej osobnej wieży. Wrak nie prześwieca się po najechaniu kursorem.

## Poligon

**Garaż → Karta prób → Grafika: Wraki — wszystkie pojazdy**, sonda `grafika-wraki`.
Jedna scena `wraki-art-review-v1`, 14 par: sprawny po lewej, wrak przy 0 PW po prawej.
To aktorzy pojazdów z rzeczywistym stanem wraku, utworzonym normalnym API.
Można obracać, przenosić i uszkodzić sprawny egzemplarz; cofnięcie na karcie czatu MG.

Poprzednia scena trzech porównań jest rozbudowywana w miejscu, z zachowaniem jej sześciu
żetonów i aktorów. Dochodzą 22 żetony; inne 15 scen i ich 200 żetonów pozostają bez zmian.
Generator odtwarza Parking + 14 podglądów pojazdów + wspólną galerię wraków (16 scen).
Ponowne przyjęcie gotowej galerii zachowuje ręczne pozycje i skale. Regulacja wielkości
postaci na jednośladach nadal odłożona przez MG.

## Sprawdzenie

`npm test` zielony; Quench pojazdów 42/42. E2E `garaz-grafika` obejmuje wszystkie 14
przejść 0 PW → indywidualny wrak → oryginalna pełna tekstura, widok gracza i MG, osobne
wieże, przeświecanie, nawigację, zachowanie ręcznych zmian i odtworzenie po resecie.
E2E **20/20**, 26 zrzutów:
`logs/e2e/2026-10-28T01-55-11/report.json`. Brak błędów konsoli i błędów modułu;
12 ostrzeżeń zgodności pochodzi spoza modułu. Przegląd wszystkich par: zrzut 25;
Abrams z pełną lufą pod kursorem MG: 26. Po przebiegu powiększono wyłącznie podpisy
galerii, aby dało się je czytać w widoku całej planszy; wygląd potwierdzony w Poligonie.

Instalacja w Poligonie zakończona: ta sama scena, 28 żetonów; zachowano sześć poprzednich
żetonów wraz z aktorami i pełne dokumenty pozostałych 15 scen (200 żetonów). Garaż ma teraz
16 scen / 228 żetonów. Wszystkie tekstury ładują się u MG i Gracza 1, osobne sprawne wieże
są widoczne tylko na dwóch sprawnych pojazdach opancerzonych. Oba klienty mają otwartą galerię.
