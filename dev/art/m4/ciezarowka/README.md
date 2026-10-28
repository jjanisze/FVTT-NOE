# Ciężarówka — czwarty komplet grafiki (2026-10-26)

Wyblakła zielona ciężarówka z kremowymi drzwiami kierowcy i otwartą drewnianą paką.
Cztery wyraźne pozycje opon na dwóch osiach, trzy miejsca w jednym rzędzie w kabinie,
pusta podłoga paki i pojedynczy komin za kabiną. Bez ludzi, ładunku i uzbrojenia.
Przód obu żetonów skierowany w dół.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-ciezarowka.webp` | 1024×1024, RGB |
| `tokens/pojazdy/ciezarowka.webp` | 600×1800, RGBA, dach kabiny |
| `tokens/pojazdy/wnetrza/ciezarowka.webp` | 600×1800, RGBA, odsłonięta kabina |

## Metoda i źródła

Wbudowany generator obrazów OpenAI; [pełne prompty i role referencji](prompts.json).
Portret Hammera jest wyłącznie odniesieniem stylu. Nowy portret określa wygląd ciężarówki.
Autorski [SVG](layout.svg), [raster](layout.png) i [model](model.json) określają proporcje.
Najpierw powstało wnętrze z trzema siedzeniami; następna edycja dodała dach i szyby nad tą kabiną.
Paka pozostaje otwarta w obu wariantach. Końcowe kotwice dopasowano do obrazu, ponieważ generator
nie odwzorowuje szkicu idealnie.

Pierwsze źródła generatora: `roof-off.png`, `roof-on.png` (724×2172) oraz
`../in/portrety/ciezarowka.png`. Pierwsza para miała 99,28% pokrycia sylwetek, lecz paka
nie była identyczna, a siedzenia, kierownica i deska we wnętrzu były przesunięte w górę.

**Korekta v2 po uwagach MG:** [kompozytor](compose.py) używa zachowanych pikseli pierwszych
WEBP (`roof-on-native-v1.png`, `roof-off-native-v1.png`). Przenosi wnętrze o 26 px w dół
w rozdzielczości 600×1800, czyli ok. 9 px przy podglądzie 1:3. Siedzenia i kierownica
przesuwają się razem bez skalowania. Dopasowane są jedynie pusta podłoga z tyłu kabiny
i dolny skraj deski. Połączenie kabiny z nadwoziem ma 6 px łagodnego przejścia do środka maski.
Cała paka, koła, maska silnika i pozostały obszar poza kabiną pochodzą z wersji z dachem.

Końcowe źródła: `roof-on-v2.png`, `roof-off-v2.png`; kompozytor zapisuje też wejścia packera
`../in/pojazdy/ciezarowka.png`, `../in/wnetrza/ciezarowka.png`. Dla obu żetonów katalog
włącza **bezstratny WEBP** (ok. 1 MB na plik). Po odkodowaniu: **0 różniących się pikseli paki
i całego wspólnego obszaru poza kabiną (921 100 px)**. Wersja z dachem jest identyczna z
pierwszą zaakceptowaną wersją. [Walidator](validate.py) sprawdza także zachowanie przesuniętych
siedzeń i kierownicy oraz zgodność z kompozytorem. [Pomiary i sumy kontrolne](validation.json).
Długie boki wypełnione w 94,28%, rzeczywista przezroczystość na marginesie.
Portret przekracza miękki budżet 100–150 KB przy standardowej jakości packera.

## Miejsca i integracja

Środki miejsc od lewego górnego rogu całego żetonu:

- kabina: x=0,675 / 0,50 / 0,325, y=0,709444; kierowca po prawej stronie obrazu;
- paka: trzy osoby przy y=0,48 i trzy przy y=0,32, x=0,72 / 0,50 / 0,28;
- tył paki: dwie osoby przy y=0,16, x=0,66 / 0,34;
- wylot spalin: x=0,115, y=0,60.

`strefyGrafiki` jest przypinane przez generator kompendium i generator Garażu. Domyślne strefy
zachowują wcześniejsze kotwice. Osiem miejsc na pace ma prezentację `otwarta/nad`, również
w domyślnym profilu; trzy miejsca kabiny są zakryte do prześwietlenia. Zachowane stojące miejsca
i osłona 1/2. Własne strefy istniejących aktorów nie są automatycznie migrowane.
Mechanika zmniejszania jadących do 0,5 kratki pozostaje dotychczasowa.

```sh
python dev/art/m4/ciezarowka/compose.py
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset portrety/ciezarowka --asset pojazdy/ciezarowka --asset wnetrza/ciezarowka
python dev/art/m4/pack.py --check --asset portrety/ciezarowka --asset pojazdy/ciezarowka --asset wnetrza/ciezarowka
python dev/art/m4/ciezarowka/validate.py
```

Szablon kompendium pobierze parę przy następnym `fvtt packs --only=pojazdy`. Garaż przypina
bieżące grafiki i miejsca także przy starszej paczce działającego Poligonu.

## Podgląd

**Poligon → Garaż → Karta prób → Grafika: Ciężarówka**. Scena **Garaż · Ciężarówka — kabina i paka**
jest częścią generatora Garażu i wraca po jego resecie. Portret, pusty pojazd, puste wnętrze,
obsadzona ciężarówka z 11 osobami i te same grafiki poza pojazdem. Rozmiary katalogowe,
źródłowe skale ludzi dnd5e, bez mnożnika 85%. Osiem osób na pace widocznych przy zamkniętej
kabinie. Postacie odniesienia ułożone w dwóch rzędach.

Ocena wyglądu przez MG pozostaje otwarta. [Lokalny podgląd pary z suwakiem dachu](review.html).

Sprawdzenie: walidacja WEBP, `npm test`, Quench pojazdów **37/37**, E2E `garaz-grafika` **7/7**,
bez błędów konsoli modułu. Raport i pięć zrzutów: `logs/e2e/2026-10-26T19-19-25/`.
Test obejmuje trzy kropki kabiny, osiem widocznych osób paki, przełączenie wnętrza, pozycje
wszystkich jedenastu jadących po obrocie oraz odtworzenie sceny i źródłowych skal po resecie.

Po korekcie v2: `npm test` oraz ponowiony E2E **7/7**, bez błędów konsoli modułu;
`logs/e2e/2026-10-26T19-43-45/`, m.in. `garaz-grafika-05-gm-truck_exposed_cab_and_occupied_open_bed.jpg`.
Obie karty działającego Poligonu przeładowane; jego rzeczywiste tekstury PIXI również mają
0 różniących się pikseli paki i pozostałego obszaru poza kabiną. Zaktualizowano trzy kotwice
kabiny w podglądzie i na Parkingu bez resetowania scen ani zmiany skal i położeń pojazdów.
