# Wóz strażacki — proporcje z portretu (2026-10-27)

Ósmy komplet grafiki, poprawiony po odrzuceniu pierwszej pary przez MG. Portret pozostał wzorcem:
krótsza bryła, kabina około 40% długości, węższy panel pompy 15%, tylna zabudowa 45%.
Drabina biegnie wyłącznie wzdłuż tylnej zabudowy. Opony wystają wyraźnie poza burty.
Pięć miejsc kabiny 3+2 i szósty operator przy działku wodnym na otwartym pomoście.
**Cały komplet zatwierdzony przez MG 2026-10-27.** Ostatnia poprawka dotyczy przodu wersji bez dachu:
usunięte dwa przesunięte koguty dachowe, kremowa półka i skrzynkowy rant; zamiast nich niski,
zaokrąglony brzeg kabiny. Grafika z dachem i wnętrze poza tą poprawką są identyczne pikselowo.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-woz-strazacki.webp` | 1024×1024, RGB; portret bez zmian |
| `tokens/pojazdy/woz-strazacki.webp` | 600×1650, RGBA, bezstratny |
| `tokens/pojazdy/wnetrza/woz-strazacki.webp` | 600×1650, RGBA, bezstratny |

## Źródła i metoda

Wbudowany generator obrazów OpenAI. [Prompty poprawki przodu](front-cutaway-prompts.json),
[prompty korekty proporcji](proportions-prompts.json),
[prompty portretu i pierwszej próby](prompts.json). Aktualny szkic [SVG](layout-v2.svg)
i [raster](layout.png) odtwarzają przewężenie za kabiną i długość drabiny z portretu.
`roof-off-v3.png` jest kanoniczną grafiką; `frame.py` kadruje i skaluje ją do ramki,
kalibrując granice trzech sekcji bez malowania. `roof-on-proportions-v2.png` dodaje dach.
`compose.py` nakłada [maskę kabiny](roof-mask.png), zachowuje wspólną alfę i wszystkie
pozostałe piksele. Przód wersji bez dachu pochodzi z `roof-off-front-v1.png`, ograniczony
[lokalną maską](front-mask.png). `roof-on-before-front-fix.png` i `roof-off-before-front-fix.png`
pozwalają sprawdzić zachowanie zaakceptowanej grafiki. Przód w dół; przednia szyba widoczna
z góry, z odbiciem zamiast wymyślonego wnętrza.

Pierwsza zbyt długa para jest zachowana jako `roof-on-before-proportions.png`,
`roof-off-before-proportions.png`; [dawna dokumentacja](README-v1.md) i pliki `*-v1.py/json/svg`
są historią odrzuconej próby. Aktualne źródła to `roof-on-native.png` i `roof-off-native.png`.
Packer pobiera je z `../in/pojazdy/woz-strazacki.png` i `../in/wnetrza/woz-strazacki.png`.
Pliki WEBP pary mają po około 1,22 MB; portret 419 KB przekracza miękki budżet packera.

```sh
python dev/art/m4/woz-strazacki/compose.py
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset pojazdy/woz-strazacki --asset wnetrza/woz-strazacki --asset portrety/woz-strazacki
python dev/art/m4/woz-strazacki/validate.py
```

## Wymiary i miejsca

Katalog **2×5,5 kratki**, ramka **3×8,25 m**. Widoczny obrys **2,90×7,70 m**; poprzednio
2,94×8,64 m. Próbka obrysu środka ma 80,1% szerokości tylnego nadwozia. Opony wystają po
około 25–28 cm na bok względem burty. [Pomiary i sumy kontrolne](validation.json).

Kotwice od lewego górnego rogu: przód **(0,685; 0,802), (0,50; 0,802), (0,335; 0,802)**;
tył **(0,683; 0,695), (0,341; 0,695)**. Operator **(0,64; 0,473)** za działkiem po prawej,
wydech **(0,242; 0,43)** po przeciwnej stronie niż drabina. [Model](model.json).
Pięć miejsc zakrytych, operator `otwarta/nad`. Skale tekstur postaci i dotychczasowy rozmiar
jadącego 0,5 kratki zachowane. Reguł działka ani odłożonych wieżyczek nie zmieniano.

## Poligon i sprawdzenie

**Garaż → Karta prób → Grafika: Wóz strażacki**, scena **Garaż · Wóz strażacki — kabina i pomost**.
Te same identyfikatory scen i aktorów. Poprawiono dwa wozy podglądu oraz jeden na Parkingu,
zachowując środki i skale jadących; 137 pozostałych żetonów bez zmian. Wzorzec wnętrza ma nową
wysokość. Generator i świeży szablon używają nowego obrysu; aktory kampanii nie były migrowane.

Walidacja: **495 537** wspólnych pikseli poza maską kabiny i przodu, **0 różnic**, wspólna alfa, zgodność
kompozytora z WEBP, mierzalne przewężenie i wysunięte opony. Packer i świeży szablon poprawne.
Cały zaakceptowany żeton z dachem: 0 zmienionych pikseli; żeton bez dachu poza maską przodu: 0.
Sandbox E2E **garaz-grafika 11/11**, bez błędów modułu; także krótszy obrys po resecie:
`logs/e2e/2026-10-27T00-51-21/report.json`, zrzuty 04 (wnętrze) i 05 (dach i operator).
Próba MG `grafika-woz-strazacki`. **Poprawiony przód wersji bez dachu również zatwierdzony.**

Pełny `npm test` nadal zatrzymuje niezwiązany odczyt `getFlag("dnd5e", "activity.uuid")`
w `scripts/weapons/wlasciwosci.mjs:138`. Pozostałe statyczne kontrole i siedem testów scenerii
przechodzą; pliku broni nie zmieniano.
