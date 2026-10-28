# Autobus — szósty komplet grafiki (2026-10-26)

**Zatwierdzony przez MG 2026-10-27**, po korekcie pochylonej szyby: portret, żeton z dachem,
wnętrze i dopasowanie obsady.

Zużyty północnoamerykański autobus miejski: kremowe nadwozie z turkusowym dolnym pasem,
dwie osie, dwa zamknięte włazy w łatanym dachu, sklejka w dwóch tylnych oknach portretu.
Przód inspirowany GMC New Look „Fishbowl”: zaokrąglona, pochylona szyba jest czytelnym
pasem szkła w rzucie pionowym. Portret i żeton z dachem pokazują ten sam kierunek konstrukcji.
MG zatwierdził układ: **kierowca + 20 pasażerów**, pięć rzędów po cztery fotele, przejście
pośrodku i wolna podłoga użytkowa z tyłu. Przód żetonu skierowany w dół.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-autobus.webp` | 1024×1024, RGB |
| `tokens/pojazdy/autobus.webp` | 600×2400, RGBA, dach |
| `tokens/pojazdy/wnetrza/autobus.webp` | 600×2400, RGBA, wnętrze |

## Źródła i zgodność pary

Wbudowany generator obrazów OpenAI; [pełne prompty i role referencji](prompts.json).
Portret Hammera wyznacza styl. Portret autobusu określa wygląd, a autorski [SVG](layout.svg),
[raster](layout.png) i [model](model.json) określają układ. Pierwsze wnętrze `roof-off-v1.png`
miało tylko 16 miejsc pasażerskich i zostało odrzucone. Edycja `roof-off-v2.png` ma komplet
20 foteli plus kierowcę. Dach `roof-on-v1.png` powstał nad tym wnętrzem.

**Korekta szyby, 2026-10-27:** MG wskazał brak widocznej szyby w pierwotnym rzucie.
Nowy przód opiera się na pochylonej panoramicznej szybie New Look, opisanej przez
[Seashore Trolley Museum](https://collections.trolleymuseum.org/items/343). Powstały
`portrait-v2.png` i `roof-on-windshield-v2.png`. Rejestracja edycji dopasowuje ją do już
skalibrowanej ramki, bez ponownego poszerzania nadwozia. Kompozytor przenosi tylko przedni
obszar, zachowując wcześniejszy dach i tył poza nim. Wnętrze jest identyczne pikselowo
z wersją sprzed zmiany; wszystkie 21 kotwic zachowane. Archiwalne obrazy:
`portrait-v1.png`, `roof-on-before-windshield.png`, `roof-off-before-windshield.png`.

Generator zmienił proporcje płótna i położenia elementów. [Kalibracja kadru](frame.py)
usuwa nadmiar przezroczystego marginesu, dopasowuje rzut do 600×2400 i przywraca szerokość
nadwozia ze szkicu. Środkowe pasmo poszerza się, a wyłącznie boczne marginesy lusterek zwężają;
wszystkie operacje są zapisanym skalowaniem pikseli, bez domalowywania. Końcowe kotwice
dopasowano do foteli po tej kalibracji.

[Kompozytor](compose.py) używa wnętrza jako wspólnej podstawy i przenosi tylko powierzchnię
dachu, z 6 px przejścia do środka maski. Cała mapa alfa pochodzi z podstawy. Koła, lusterka,
zderzaki, komin i pozostałe piksele poza maską są identyczne. Oba żetony zapisane jako
**bezstratny WEBP**, ok. 1,46 MB na plik. [Walidator](validate.py) potwierdza **0 różniących się
pikseli wspólnego obszaru zewnętrznego (434 896 px)**, 0 różnic alfa i pełną zgodność odkodowanych
WEBP z kompozytorem. [Wyniki, kadry i sumy kontrolne](validation.json).

Źródła końcowe: `roof-off-native.png`, `roof-on-native.png`. Wejścia packera:
`../in/wnetrza/autobus.png`, `../in/pojazdy/autobus.png`, `../in/portrety/autobus.png`.
Portret przekracza miękki budżet 100–150 KB przy standardowej jakości packera.

```sh
python dev/art/m4/autobus/compose.py
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset pojazdy/autobus --asset wnetrza/autobus --asset portrety/autobus
python dev/art/m4/pack.py --check --asset pojazdy/autobus --asset wnetrza/autobus --asset portrety/autobus
python dev/art/m4/autobus/validate.py
```

## Miejsca i rozmiar

Obrys katalogowy **2×8 kratki**, ramka **3×12 m**. Nadwozie w środkowym przekroju ma
**2,575 m szerokości**; cała widoczna grafika z lusterkami i zderzakami **2,915×11,515 m**
przy alfa >8. To pomiar wygenerowanej grafiki, nie deklaracja konkretnego modelu fabrycznego.

Końcowe kotwice od lewego górnego rogu:

- kierowca `(0,737; 0,833)`, po prawej stronie obrazu;
- kolumny pasażerów `0,788 / 0,640 / 0,365 / 0,217`, z przerwą na przejście;
- rzędy od przodu `0,728 / 0,64525 / 0,5625 / 0,47975 / 0,397`;
- wydech `(0,78; 0,02)`.

`strefyGrafiki` zawiera osobny fotel kierowcy i 20 miejsc pasażerów. Wszystkie zakryte pod
dachem; tylna podłoga nie dodaje miejsc obsady. Domyślny układ bez grafiki zachowany.
Własne układy istniejących aktorów nie są automatycznie migrowane. Mechaniczne zmniejszanie
jadących do 0,5 kratki pozostaje dotychczasowe, skale tekstur źródłowe, bez eksperymentu 85%.

## Poligon

**Garaż → Karta prób → Grafika: Autobus**, scena **Garaż · Autobus — wnętrze i obsada**.
Portret, pusty pojazd, pusty wzorzec wnętrza, pełna obsada 21 osób i ich odpowiedniki poza
pojazdem. Dłuższy autobus i cztery rzędy 21 grafik odniesienia mieszczą się na powiększonej
scenie 28×25 kratek. Mniejsze podglądy zachowują dotychczasowy układ. Reset Garażu odtwarza
Parking i wszystkie sześć podglądów; autobus trafia także na Parking.

Próba MG **Grafika i obsada autobusu** (`grafika-autobus`): porównaj pusty dach i wnętrze,
prześwietl obsadzony autobus, odsuń kursor jako obserwator, sprawdź 21 foteli, przejście i tylną
podłogę. Przesuń i obróć na wolnym miejscu; wsiądź i wysiądź przez okno Miejsc.
Grafika i dopasowanie pionków zaakceptowane przez MG 2026-10-27 po korekcie szyby.

Kompendium pobierze obrazy i układ przy następnym `fvtt packs --only=pojazdy`.
Generator Garażu przypina bieżące pliki i miejsca także przy starszej paczce otwartego Poligonu.

Walidacja ukończona 2026-10-27: `npm test`, Quench pojazdów **37/37** po przebudowie
odizolowanej paczki piaskownicy, E2E **garaz-grafika 9/9**, bez błędów konsoli modułu.
Raport i osiem zrzutów: `logs/e2e/2026-10-26T21-13-27/`, m.in.
`garaz-grafika-08-gm-bus_exposed_interior_with_all_21_occupants.jpg`.
Test obejmuje odkrycie/zakrycie 21 osób, wszystkie kotwice po manewrze na wolnym miejscu,
wsiadanie na ostatni fotel przez okno i wysiadanie oraz odtwarzanie scen bez duplikatów.
Instalacja na działającym Poligonie zachowała sześć wcześniejszych scen i 78 żetonów.
Obie karty Poligonu potwierdzają brak różnic pikseli zewnętrznych również na teksturach PIXI;
błąd pozycji kotwic poniżej jednego piksela sceny. Brak zmiany skal postaci.

Po korekcie szyby: ponowione `npm test` i E2E **9/9**, bez błędów modułu;
`logs/e2e/2026-10-26T23-23-09/`. Obydwie karty działającego Poligonu mają nowe tekstury;
szyba obecna w odkodowanym obrazie, 0 różnic pikseli poza górną częścią nadwozia.
Walidator sprawdza również brak zmian wcześniejszego wnętrza i dachu poza edycją przodu.
