# Wóz strażacki — ósmy komplet grafiki (2026-10-27)

Stary amerykański wóz gaśniczy z kabiną nad silnikiem, wyblakły czerwony lakier i kremowy dach.
Pochylona przednia szyba jest widoczna z góry. Pięć miejsc kabiny w dwóch rzędach (3+2),
otwarty pomost z działkiem wodnym, złożone węże i drabina przy prawej burcie obrazu.
Szósta postać stoi za działkiem: pełny pionek nad pojazdem, stale widoczny. Przód skierowany w dół.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-woz-strazacki.webp` | 1024×1024, RGB |
| `tokens/pojazdy/woz-strazacki.webp` | 600×1800, RGBA, bezstratny |
| `tokens/pojazdy/wnetrza/woz-strazacki.webp` | 600×1800, RGBA, bezstratny |

## Źródła i metoda

Wbudowany generator obrazów OpenAI. [Pełne prompty i role referencji](prompts.json).
Portret Hammera wyznacza styl; `portrait-v1.png` wygląd wozu, `portrait-v2.png` poprawia kadr.
Autorski [SVG](layout.svg), [raster](layout.png) i [model](model.json) wyznaczają układ dwóch osi,
pięciu foteli i pomostu. Pierwszy żeton pokazywał zbyt dużo pionowej przedniej ściany i ukrywał
przednie koła. `roof-off-v2.png` poprawia rzut i cztery widoczne opony; stanowi bazę końcowej pary.
`frame.py` dopasowuje przezroczysty kadr i szerokość nadwozia do ramki katalogowej.

`roof-on-v1.png` dodaje dach. `roof-on-glass-v2.png` usuwa wymyślone przebitki wnętrza z szyby:
przy tej perspektywie szkło odbija niebo. `compose.py` rejestruje kabinę względem jej dolnych ścian,
kopiuje tylko poprawione szyby i nakłada skończoną maskę dachu na kanoniczny żeton bez dachu.
Nie maluje sprzętu ani podłogi. [Maska](roof-mask.png) zachowuje także pierwotny komin wydechu.
Cały tył, pomost, działko, węże, drabina, koła, lusterka i dolny zderzak są wspólne pikselowo.
Alfa również jest wspólna. Generator tworzy grafiki; skrypty tylko kadrują, skalują i komponują.

Bezstratne pliki mają po ok. 1,44 MB; portret 419 KB przekracza miękki budżet 100–150 KB
przy standardowej jakości packera. [Walidacja, pomiary i sumy kontrolne](validation.json).
Wejścia packera: `../in/pojazdy/woz-strazacki.png`, `../in/wnetrza/woz-strazacki.png`,
`../in/portrety/woz-strazacki.png`. Końcowe źródła pary: `roof-on-native.png` i `roof-off-native.png`.

```sh
python dev/art/m4/woz-strazacki/compose.py
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset pojazdy/woz-strazacki --asset wnetrza/woz-strazacki --asset portrety/woz-strazacki
python dev/art/m4/pack.py --check --asset pojazdy/woz-strazacki --asset wnetrza/woz-strazacki --asset portrety/woz-strazacki
python dev/art/m4/woz-strazacki/validate.py
```

## Skala, miejsca i podgląd

Katalog **2×6 kratek**, ramka **3×9 m**. Widoczny obrys z lusterkami: **2,94×8,64 m** przy alfa >8.
Kotwice od lewego górnego rogu: pierwszy rząd **(0,70; 0,86), (0,50; 0,86), (0,30; 0,86)**,
drugi **(0,6833; 0,743), (0,3167; 0,743)**. Kierowca na prawym przednim fotelu obrazu.
Operator działka **(0,50; 0,495)**, za uchwytami; wydech **(0,8633; 0,6694)**.
Pięć miejsc kabiny zakrytych, działko `otwarta/nad`. Identyfikatory miejsc zachowane.
Skale tekstur postaci źródłowe; istniejący rozmiar jadącego 0,5 kratki pozostaje bez zmian.
Nie zmieniano reguł działka ani nie rozszerzano odłożonej po becie obsługi wieżyczek.

**Poligon → Garaż → Karta prób → Grafika: Wóz strażacki**.
Scena **Garaż · Wóz strażacki — kabina i pomost**: portret, pusty dach, puste wnętrze,
pełna sześcioosobowa obsada i te same postacie dnd5e obok. Generator Garażu odtwarza dziewięć scen
łącznie z Parkingiem. Obsługuje osobny slug pliku `woz-strazacki` dla katalogowego `wozStrazacki`.
W działającym Poligonie dodano tylko nowy podgląd i podmieniono grafikę istniejącego wozu
na Parkingu. Osiem starych scen i 131 pozostałych żetonów zachowano; wóz zachował geometrię i skalę.
Świeży szablon kompendium wybiera nowe obrazy i kotwice przy następnym przebudowaniu paczki.
Istniejące aktory kampanii i ich własne układy nie były migrowane. **Ocena estetyki MG otwarta.**

## Sprawdzenie

Packer, alfa, sześć kotwic i świeży szablon w pamięci poprawne. **668 917** wspólnych pikseli
poza maską dachu: **0 różnic**, podobnie w alfie i między kompozytorem a wysłanymi WEBP.
Sandbox E2E **garaz-grafika 11/11**, bez błędów konsoli modułu:
`logs/e2e/2026-10-27T00-14-04/report.json`. Zrzuty 04 (wnętrze) i 05 (obserwator, dach i operator).
Test obejmuje pięć zakrytych pionków kabiny, pełny pionek operatora nad pojazdem, celowanie,
wszystkie sześć kotwic po obrocie i ruchu, dziewięć przycisków, zachowanie starych podglądów i reset.
Próba MG: `grafika-woz-strazacki`.

Pełny `npm test` nie przechodzi: niezwiązany z tą grafiką skaner `message-flags` wskazuje
`scripts/weapons/wlasciwosci.mjs:138`, starszy odczyt `getFlag("dnd5e", "activity.uuid")`.
Walidacja paczek testowych, języków i siedem testów scenerii przechodzą. Pliku broni nie zmieniano.
