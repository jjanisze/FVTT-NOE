# Motorower — dwunasty komplet grafiki

Dostarczony 2026-10-28. Mały motorower z niską ramą w stylu Super Cuba: turkusowy lakier,
kremowa osłona nóg, pojedyncze czarne siodło i otwarta czerwona skrzynka na bagażniku.
Portret, żeton i integracja zatwierdzone przez MG 2026-10-28 po powiększeniu do 120%.

| Zapisany plik modułu | Format |
|---|---|
| `tokens/portraits/pojazd-motorower.webp` | 1024×1024 RGB, nieprzezroczysty |
| `tokens/pojazdy/motorower.webp` | 180×468 RGBA, przezroczyste tło |

Przód w dół. Obrys **0,6×1,56 kratki / 0,90×2,34 m**, widoczna sylwetka **0,86×2,25 m**.
To przyjęte proporcje ilustracji do gry, nie specyfikacja konkretnego modelu fabrycznego.
Pierwszy podgląd 0,5×1,3 kratki powiększono do **120% na życzenie MG 2026-10-28**.
Obrys, grafika i położenie siodła rosną razem; skala i rozmiar kierowcy są bez zmian. Pozostałe
statystyki mechaniczne są bez zmian. Kotwica kierowcy to **x=0,50, y=0,36** pełnego obrazu;
wylot wydechu **x=0,25, y=0,18**. Skrzynka nie jest drugim miejscem.

Siodło ma prezentację D32 `otwarta/nad`: pełny pionek stale nad grafiką, bez kropki,
bez prześwietlenia i przygaszania po najechaniu. Ukrycie postaci i uprawnienia Foundry działają
jak dotąd. Układ `strefyGrafiki` trafia do nowych szablonów z natywnym żetonem. Standardowa
strefa dostaje otwartą prezentację, zachowując poprzednią kotwicę dla własnych grafik.
Własne strefy istniejących aktorów nie są automatycznie migrowane.

## Źródła i odtworzenie

Wbudowane narzędzie `image_gen.imagegen`; generator nie ujawnia nazwy modelu.
[Pełne prompty i role obrazów wejściowych](prompts.json). Portret motocykla dostarczył wyłącznie
styl i scenerię. Nowy portret ustalił wygląd motoroweru; druga wersja usunęła drobny znak
na pokrywie silnika. Autorski [SVG](layout.svg) i [raster](layout.png) ustaliły dwa koła,
jedno siodło, skrzynkę oraz zwarty przód. Rzut SVG został zrasteryzowany przeglądarką,
następnie generator namalował żeton z użyciem rzutu i portretu. Kotwicę dopasowano do
wybranego obrazu. Nie było potrzeby osobnego wnętrza ani wariantu bez dachu.

Źródła: `portrait-v1.png`, `portrait-v2.png`, `token-v1.png`; wejścia packera
`../in/portrety/motorower.png` i `../in/pojazdy/motorower.png`. Packer kadruje, skaluje
i konwertuje bez malowania. Zachowano wygenerowaną alfę, w tym 252/255 na siodle.
Portret ma około 359 KB i przekracza miękki budżet packera 100–150 KB, jak pozostałe
szczegółowe portrety pojazdów. Żeton ma około 28 KB.

```sh
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset portrety/motorower --asset pojazdy/motorower
python dev/art/m4/pack.py --check --asset portrety/motorower --asset pojazdy/motorower
python dev/art/m4/motorower/validate.py
```

[Model i kotwice](model.json), [walidacja](validation.json). Szablon kompendium jest generowany
z katalogu; przebudowano i zwalidowano izolowaną paczkę `pojazdy` w sandboxie.

## Poligon i sprawdzenie

**Garaż → Karta prób → Grafika: Motorower**, sonda `grafika-motorower`. Portret, pusty
pojazd, pojazd z kierowcą oraz odpowiednik kierowcy obok. Dwie wersje wystarczają przy jednym
miejscu; generator nie tworzy drugiego identycznego obsadzonego wariantu. Postać pochodzi
z dnd5e Commoner, tekstura w skali źródłowej 1; pojazdy w rozmiarze katalogowym. Zwykła
redukcja obrysu postaci do miejsca 0,5 kratki nadal działa; eksperymentu 85% nie przywracano.

Dodano bez resetu: zachowano 12 wcześniejszych scen Garażu i wszystkie 186 żetonów.
Na Parkingu dodano motorower. Generator odtwarza Parking i 12 podglądów, razem 13 scen.
`npm test` zielony, Quench pojazdów **42/42**, sandbox E2E `garaz-grafika` **17/17**,
bez błędów konsoli modułu. Raport po korekcie 120% i 22 zrzuty: `logs/e2e/2026-10-28T00-15-54/`, motorower
na zrzucie 11. Sprawdzono kartę prób dla MG i gracza, stałą widoczność i celowanie w kierowcę,
ruch z obrotem, kotwicę, wsiadanie/wysiadanie przez okno Miejsc, zachowanie poprzednich
podglądów oraz świeże odtworzenie bez duplikatów.
