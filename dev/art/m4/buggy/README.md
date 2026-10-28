# Buggy — piąty komplet grafiki (2026-10-26)

Lekki dwuosobowy buggy: żółta rama rurowa z odpryskami i rdzą, dwa czarne kubełkowe fotele,
odsłonięty silnik z tyłu, cztery terenowe opony. Kokpit otwarty, bez dachu i szyb.
Przód żetonu skierowany w dół. Obie postacie pozostają widoczne nad ramą, również bez najechania.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-buggy.webp` | 1024×1024, RGB |
| `tokens/pojazdy/buggy.webp` | 420×840, RGBA |

## Źródła i metoda

Wbudowany generator obrazów OpenAI; [pełne prompty i role referencji](prompts.json).
Portret Hammera wyznacza styl malowania. Portret buggy określa pojazd, a autorski
[SVG](layout.svg), [raster](layout.png) i [model](model.json) wyznaczają geometrię żetonu:
dwie osie, dwa sąsiednie fotele, kierownica przed prawym fotelem na obrazie, silnik z tyłu.
Grafika źródłowa żetonu: `token-v1.png` (887×1774). Generator przesunął fotele względem
szkicu; końcowe kotwice dopasowano do rzeczywistego obrazu.

Wejścia packera: `../in/pojazdy/buggy.png`, `../in/portrety/buggy.png`.
Packer wyłącznie skaluje i konwertuje; zachowuje wygenerowaną przezroczystość, także między
elementami ramy. Otwarte buggy używa jednego żetonu, bez osobnej wersji wnętrza.
Portret przekracza miękki budżet 100–150 KB przy standardowej jakości packera.
[Pomiary i sumy kontrolne](validation.json).

```sh
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset pojazdy/buggy --asset portrety/buggy
python dev/art/m4/pack.py --check --asset pojazdy/buggy --asset portrety/buggy
python dev/art/m4/buggy/measure.py
```

## Miejsca i podgląd

**Korekta skali po ocenie MG:** pierwotny obrys 1×2 dawał zaledwie 1,47 m widocznej
szerokości opon. MG wskazał szeroką ramę pustynną typu FAV/DPV i zakres 2,03–2,13 m
jako właściwszy punkt odniesienia dla tej grafiki. Obecny obrys jest większy liniowo o 40%:
2,10×4,20 m ramki, **2,055×3,835 m widocznej grafiki** przy alfa >8. Zmiana jest w katalogu
i generatorach, bez mnożnika skali tekstury. Znormalizowane kotwice pozostały takie same;
odległości między nimi rosną z obrysem. Skale i rozmiary pionków postaci zachowane.
Nowy WEBP powstał przez ponowne skalowanie źródła 887×1774, bez generowania nowej grafiki.

Kotwice od lewego górnego rogu: kierowca **(0,635; 0,475)**, pasażer **(0,365; 0,475)**.
Wylot spalin **(0,50; 0,035)**. Obrys katalogowy **1,4×2,8 kratki**.
`strefyGrafiki` zachowuje dwa miejsca i osłonę 1/2; oba mają prezentację `otwarta/nad`.
Domyślny układ bez grafiki także ujawnia oba miejsca, zachowując wcześniejsze kotwice.
Własne układy istniejących aktorów nie są automatycznie migrowane. Mechaniczne zmniejszanie
jadących do 0,5 kratki pozostaje dotychczasowe; skale tekstur postaci są źródłowe, bez 85%.

**Poligon → Garaż → Karta prób → Grafika: Buggy**, scena **Garaż · Buggy — otwarta rama i obsada**.
Portret, pusty pojazd, sam kierowca, pełna obsada i te same postacie dnd5e obok.
Generator Garażu odtwarza podgląd i buggy na Parkingu. Dodanie podglądu do działającego
Poligonu zachowuje wcześniejsze sceny oraz ich ręczne położenia i skale.
Szablon kompendium pobierze grafikę przy następnym `fvtt packs --only=pojazdy`;
generator Garażu przypina bieżące obrazy także przy starszej paczce otwartego Poligonu.

Próba MG: **Grafika i obsada buggy** (`grafika-buggy`): grafika, kotwice obu foteli,
stała widoczność, obrót/ruch, celowanie, wsiadanie i wysiadanie. Ocena estetyki pozostaje otwarta.

Walidacja: WEBP, alfa i wypełnienie kadru, `npm test`, Quench pojazdów **37/37**, E2E
**garaz-grafika 8/8**, bez błędów konsoli modułu. Raport i sześć zrzutów:
`logs/e2e/2026-10-26T20-03-21/`, m.in.
`garaz-grafika-06-Gracz_2-buggy_two_exposed_riders_above_open_frame.jpg`.
Test gracza sprawdza widoczność obu pionków nad ramą bez najechania, zwykłe celowanie,
obie kotwice po obrocie, dostęp z panelu oraz reset bez utraty źródłowych skal.

Po korekcie skali: `npm test` i ponowiony E2E **8/8**, bez błędów konsoli modułu,
`logs/e2e/2026-10-26T20-24-31/` (zrzut buggy nr 06). Test sprawdza nowe wymiary także na
Parkingu po utworzeniu ze starszego kompendium. W działającym Garażu zmieniono cztery buggy,
zachowując ich środki i skale trzech jadących; 71 pozostałych żetonów zachowano bez zmian.
