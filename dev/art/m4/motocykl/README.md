# Motocykl — trzeci komplet grafiki (2026-10-26)

Bordowy ciężki cruiser z dwiema skórzanymi sakwami, szeroką kierownicą, osobnym siodłem
kierowcy i poduszką pasażera. Bez jeźdźców i uzbrojenia. Przód żetonu jest skierowany w dół.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-motocykl.webp` | 1024×1024, RGB, nieprzezroczysty |
| `tokens/pojazdy/motocykl.webp` | 150×450, RGBA, przezroczyste tło |

Motocykl nie potrzebuje wariantu bez dachu. Dwa miejsca mają prezentację `otwarta/nad`:
pełne postacie nad grafiką, bez kropek. Pojazdy zawierające wyłącznie otwarte miejsca nie
uruchamiają prześwietlenia ani przygaszania po najechaniu. Prawa dostępu i widoczność Foundry
pozostają obsługiwane przez istniejący model D32.

## Źródła i metoda

Wbudowany generator obrazów OpenAI; [pełne prompty i role referencji](prompts.json).
Portret Hammera posłużył jako odniesienie stylu, nowy portret ustalił wygląd motocykla.
[Autorski SVG](layout.svg), jego [raster](out/layout.png) i [model](model.json) ustaliły układ
dwóch kół i dwóch miejsc. Pierwsza generacja wydłużyła widelec i przesunęła siodło ku tyłowi;
edycja `out/token-v2.png` skróciła przód. `out/token-final.png` usuwa dodatkową środkową poduszkę.
Generator odchyla się od SVG, dlatego kotwice dopasowano do wybranego obrazu.

Źródła packera: `../in/portrety/motocykl.png`, `../in/pojazdy/motocykl.png`.
Packer tylko kadruje, skaluje i konwertuje; nie maluje ani nie usuwa tła.
Portret przekracza miękki budżet 100–150 KB przy domyślnej jakości packera.

## Miejsca i integracja

Środki miejsc w ułamkach całego obrazu, od lewego górnego rogu:

- kierowca: x=0,50, y=0,46;
- pasażer: x=0,50, y=0,265.

`KATALOG_POJAZDOW.motocykl.strefyGrafiki` zawiera ten układ; standardowe strefy zachowują
wcześniejsze kotwice i dostają otwartą prezentację. Własne strefy istniejących aktorów
nie są automatycznie migrowane. Generator kompendium przypina układ grafiki przy obecności
końcowego żetonu także wtedy, gdy pojazd nie ma pliku wnętrza.

Odtworzenie plików:

```sh
python dev/art/m4/pack.py --asset portrety/motocykl --asset pojazdy/motocykl
python dev/art/m4/pack.py --check --asset portrety/motocykl --asset pojazdy/motocykl
```

Szablon kompendium pobierze pliki i kotwice przy kolejnym `fvtt packs --only=pojazdy`.
Bieżący podgląd dodano przez API działającego Poligonu: jego kopie mają przypięte końcowe
pliki i strefy. Nie przebudowywano aktywnych paczek ani pozostałych scen Garażu.

## Podgląd i sprawdzenie

Poligon: **Garaż · Motocykl — grafika i obsada**, sonda **grafika-motocykl**.
Obok portretu stoją trzy rzeczywiste pojazdy: pusty, z kierowcą, z kierowcą i pasażerem.
Pod nimi grafiki tych samych postaci poza pojazdem. Podgląd używa pojazdu 120% oraz grafik
postaci w pierwotnej skali, zachowując indywidualne powiększenia. Eksperyment 85% zakończono
2026-10-26, przywracając skale żetonów i ich prototypów. Kampanijne obrazy,
obsada i skrypty podglądu pozostają poza publicznym repo. MG zaakceptował grafikę 2026-10-26.
Zgłoszona skala postaci wynika ze wspólnego zmniejszania obrysu do 0,5 przy wsiadaniu.
Podczas eksperymentu 85% tekstury dawało 42,5% oryginalnej grafiki poza pojazdem; po cofnięciu
eksperymentu pozostaje redukcja wynikająca z obrysu. [Diagnoza dla wszystkich podwozi](../../../audits/vehicle-occupant-scale-2026-10-26.md).

Walidacja WEBP i `npm test` przeszły. Quench pojazdów **36/36**. E2E `motocykl-art`:
trzy kroki, widok MG/kierowcy/obserwatora, najechanie, obrót z ruchem i wysiadka.
Regresja `pojazd-prezentacja`: sześć kroków. Bez błędów konsoli modułu.
Raport i pięć zrzutów: `logs/e2e/2026-10-25T23-18-10/`.
Sprawdzono również wynik generatora kompendium bez zapisu do paczek: portret, żeton,
kotwice motocykla bez wnętrza i zachowane pary Osobówki/Hammera.

[Lokalny podgląd z kotwicami](review.html).
