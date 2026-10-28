# Buldożer — dziewiąty komplet grafiki (2026-10-27)

Stary żółty buldożer z dwiema stalowymi gąsienicami, szerokim lemieszem z przodu i pojedynczym
zębem zrywaka z tyłu. Za silnikiem otwarte stanowisko: większy fotel operatora po lewej obrazu,
mniejsze siedzenie pomocnika po prawej. Dwie dźwignie przed operatorem, bez kierownicy.
Rama ochronna bez daszka i szyb; oba pełne pionki stale nad pojazdem. Przód żetonu w dół.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-buldozer.webp` | 1024×1024, RGB |
| `tokens/pojazdy/buldozer.webp` | 750×1200, RGBA |

## Źródła i metoda

Wbudowany generator obrazów OpenAI. [Pełne prompty i role referencji](prompts.json).
Portret Hammera wyznacza styl malowania; `portrait-v1.png` określa wygląd i układ elementów.
Autorski [SVG](layout.svg), [raster](layout.png) i [model](model.json) wyznaczają dwie gąsienice,
lemiesz, ramiona hydrauliczne, maskę, dwa otwarte siedzenia i pojedynczy zrywak.
`token-v1.png` ma 992×1586; `frame.py` kadruje alfę i skaluje równomiernie z marginesem do
750×1200, bez malowania i bez zmiany proporcji. Lemiesz ma widoczną powierzchnię roboczą
dla czytelności żetonu. Otwarty pojazd używa jednego obrazu, bez osobnej wersji dachu.

Wejścia packera: `../in/pojazdy/buldozer.png`, `../in/portrety/buldozer.png`.
Żeton 347 KB, portret 436 KB; portret przekracza miękki budżet 100–150 KB przy standardowej
jakości packera. [Pomiary, alfa i sumy kontrolne](validation.json).

```sh
python dev/art/m4/buldozer/frame.py
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset pojazdy/buldozer --asset portrety/buldozer
python dev/art/m4/pack.py --check --asset pojazdy/buldozer --asset portrety/buldozer
python dev/art/m4/buldozer/measure.py
```

## Skala, miejsca i podgląd

Katalog **2,5×4 kratki**, ramka **3,75×6 m**. Widoczna grafika **3,55×5,78 m**, alfa >8.
Kotwice od lewego górnego rogu: operator **(0,4387; 0,3867)**, pomocnik **(0,5747; 0,3867)**.
Wydech **(0,451; 0,538)**. `strefyGrafiki` dopasowuje kotwice do końcowego obrazu; zachowuje
identyfikatory `kabina-0-0` i `kabina-0-1`. Oba układy mają prezentację `otwarta/nad`.
Skale tekstur postaci są źródłowe. Dotychczasowy rozmiar jadącego 0,5 kratki pozostaje bez zmian.
Starsze własne układy aktorów nie są automatycznie migrowane.

**Poligon → Garaż → Karta prób → Grafika: Buldożer**; scena **Garaż · Buldożer — gąsienice i obsada**.
Portret, pusty pojazd, sam operator, pełna obsada i te same postacie dnd5e obok.
Generator Garażu odtwarza dziesięć scen, łącznie z Parkingiem; Parking zawiera buldożer.
Dodanie nowego podglądu do działającego Poligonu zachowało wszystkie 146 wcześniejszych
żetonów na dziewięciu scenach. Kampania i jej aktory bez zmian. Świeży szablon kompendium
wybiera natywne pliki przy następnym przebudowaniu paczki; Garaż przypina je także przy starszej paczce.

Próba MG `grafika-buldozer`: zgodność portretu i żetonu, lemiesz/gąsienice/zrywak, dwa fotele,
stała widoczność, celowanie, ruch i obrót oraz wsiadanie i wysiadanie. **Zatwierdzony przez MG 2026-10-27:** portret, żeton, proporcje i oba miejsca.

## Walidacja

Packer, wymiary, alfa, dwie kotwice i świeży szablon w pamięci poprawne. Sandbox E2E
**garaz-grafika 12/12**, bez błędów konsoli modułu: `logs/e2e/2026-10-27T19-08-07/report.json`.
Zrzut 10: `garaz-grafika-10-Gracz_2-buldozer_two_exposed_riders_above_open_vehicle.jpg`.
Test obejmuje obu jadących nad pojazdem bez najechania, celowanie, kotwice po ruchu i obrocie,
wejście pomocnika i wyjście przez Miejsca, dziesięć przycisków, zachowanie podglądów i reset.

Pełny `npm test` nadal zatrzymuje niezwiązany skan `message-flags` w
`scripts/weapons/wlasciwosci.mjs:138` (`getFlag("dnd5e", "activity.uuid")`). Pozostałe kontrole
statyczne i siedem testów scenerii przechodzą; pliku broni nie zmieniano.
