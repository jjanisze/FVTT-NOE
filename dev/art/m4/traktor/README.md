# Traktor — siódmy komplet grafiki (2026-10-27)

Stary czerwony traktor rolniczy z wyblakłym lakierem i prostym pałąkiem bez daszka.
Cztery koła: duże tylne opony u góry, małe przednie u dołu. Kierowca na centralnym siodle,
pasażer na poduszce lewego błotnika pojazdu (prawa strona obrazu). Bez postaci w samej grafice.
Oba miejsca są otwarte: pełne pionki stale nad pojazdem, również bez najechania.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-traktor.webp` | 1024×1024, RGB |
| `tokens/pojazdy/traktor.webp` | 450×750, RGBA |

## Źródła i metoda

Wbudowany generator obrazów OpenAI; [pełne prompty i role referencji](prompts.json).
Portret Hammera wyznacza styl. `portrait-v1.png` wyznacza wygląd traktora, a autorski
[SVG](layout.svg), [raster](layout.png) i [model](model.json) wyznaczają układ dwóch osi,
centralnego siodła, bocznej poduszki i długiej maski. Żeton źródłowy `token-v1.png` ma
971×1620. Packer wyłącznie skaluje i konwertuje; zachowuje wygenerowaną przezroczystość.
Otwarty pojazd używa jednego obrazu, bez oddzielnego dachu i wnętrza.

Wejścia packera: `../in/pojazdy/traktor.png`, `../in/portrety/traktor.png`.
Portret ma 372 KB, przekracza miękki budżet 100–150 KB przy standardowej jakości packera.
Żeton ma 112 KB. [Pomiary, alfa i sumy kontrolne](validation.json).

```sh
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset pojazdy/traktor --asset portrety/traktor
python dev/art/m4/pack.py --check --asset pojazdy/traktor --asset portrety/traktor
python dev/art/m4/traktor/measure.py
```

## Skala, miejsca i podgląd

Katalog **1,5×2,5 kratki**: ramka **2,25×3,75 m**, widoczna grafika **2,08×3,27 m** przy
alfa >8. Kotwice od lewego górnego rogu: kierowca **(0,50; 0,32)**, pasażer
**(0,704444; 0,293333)**. Wylot spalin **(0,567; 0,499)**. Kotwice zmierzono na końcowym obrazie.
`strefyGrafiki` zachowuje identyfikatory dwóch miejsc `kabina-0-0` i `kabina-1-0`.
Obie wersje układu mają prezentację `otwarta/nad`. Starsze własne układy aktorów nie są migrowane.
Skale tekstur postaci są źródłowe; dotychczasowy rozmiar jadącego 0,5 kratki pozostaje.

**Poligon → Garaż → Karta prób → Grafika: Traktor**; scena **Garaż · Traktor — siodło i błotnik**.
Portret, pusty pojazd, sam kierowca, pełna obsada i te same dwie postacie dnd5e obok.
Generator Garażu odtwarza ten podgląd i traktor na Parkingu. Przy dodaniu do działającego
Poligonu zachowano wszystkie 123 istniejące żetony na siedmiu wcześniejszych scenach.
Świeży szablon wybiera natywne obrazy przy następnym przebudowaniu paczki; podgląd przypina je
także przy starszym kompendium. Kampania i jej paczki nie były przebudowywane.

Próba MG `grafika-traktor`: proporcje, dwa miejsca, stała widoczność, celowanie, ruch,
obrót oraz wsiadanie i wysiadanie. **Zatwierdzony przez MG 2026-10-27:** wygląd, proporcje i oba miejsca.

Walidacja: packer, alfa, wymiary i kotwice; świeży szablon wygenerowany w pamięci; `npm test`;
sandbox E2E **garaz-grafika 10/10**, bez błędów konsoli modułu. Raport:
`logs/e2e/2026-10-26T23-44-08/report.json`; zrzut traktora:
`garaz-grafika-07-Gracz_2-traktor_two_exposed_riders_above_open_vehicle.jpg`.
Test sprawdza obu jadących nad pojazdem, celowanie bez najechania, kotwice po obrocie,
wejście na błotnik i wyjście przez okno Miejsc, nawigację, zachowanie ręcznych zmian i reset.
