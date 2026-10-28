# Rower — trzynasty komplet grafiki

Dostarczony 2026-10-28. MG przeszedł do kolejnego pojazdu, odkładając dopasowanie wielkości
postaci na później; bieżące skale rowerzysty pozostają bez zmian. Stalowy rower z musztardową ramą, srebrnymi błotnikami,
czarnym siodłem i pustym drucianym koszykiem na tylnym bagażniku. Przód żetonu w dół.

| Zapisany plik modułu | Format |
|---|---|
| `tokens/portraits/pojazd-rower.webp` | 1024×1024 RGB, nieprzezroczysty |
| `tokens/pojazdy/rower.webp` | 180×450 RGBA, przezroczyste tło |

Obrys **0,6×1,5 kratki / 0,90×2,25 m**, widoczna sylwetka **0,72×2,19 m**. Wielkość dobrana
względem zaakceptowanego, powiększonego motoroweru. To proporcje ilustracji do gry, nie
specyfikacja konkretnego modelu. Pierwotny obrys 0,5×1 wydłużono; inne statystyki gry bez zmian.
Jedno miejsce na siodle: **x=0,50, y=0,31** obrazu. Koszyk nie jest miejscem pasażera.

Prezentacja D32 `otwarta/nad`: rowerzysta stale widoczny nad grafiką, bez kropki, przygaszania
i prześwietlenia. Postać w źródłowej skali tekstury 1; zwykły obrys jadącego 0,5 kratki pozostaje.
Brak silnika, wydechu i paliwa; etykieta podglądu wskazuje tylko okno Miejsc. Własne układy
miejsc istniejących aktorów nie są migrowane.

## Metoda i odtworzenie

Wbudowane `image_gen.imagegen`, generowanie z referencjami; nazwa modelu nie jest ujawniana.
[Pełne prompty i role wejść](prompts.json). Portret motoroweru dostarczył styl i scenerię.
Nowy portret ustalił wygląd roweru, autorski [SVG](layout.svg) i [raster](layout.png) — proporcje
dwóch wąskich kół, siodła, koszyka i kierownicy. Generator namalował żeton z rzutu i portretu.
Kotwicę zmierzono na wybranym obrazie; nie przyjęto jej wprost z SVG. Bez wariantu bez dachu.

Źródła `portrait-v1.png`, `token-v1.png`; wejścia packera `../in/portrety/rower.png` i
`../in/pojazdy/rower.png`. Packer tylko kadruje, skaluje i konwertuje. Zachowana alfa generatora,
253/255 przy siodle, oraz prześwity koszyka. Portret około 409 KB, ponad miękki budżet 100–150 KB;
żeton około 21 KB. [Model](model.json), [walidacja](validation.json).

```sh
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset portrety/rower --asset pojazdy/rower
python dev/art/m4/rower/validate.py
```

## Podgląd i sprawdzenie

**Garaż → Karta prób → Grafika: Rower**, sonda `grafika-rower`: portret, pusty rower,
rower z postacią i ten sam Commoner poza pojazdem. Wbudowany w generator Garażu, wraz
z aktualizacją roweru na Parkingu. Bez resetu: zachowano 13 wcześniejszych scen i 190 innych
żetonów; środek istniejącego roweru nie zmienił się. Garaż odtwarza 14 scen: Parking + 13 podglądów.

`npm test` zielony, Quench pojazdów **42/42**, E2E `garaz-grafika` **18/18**, bez błędów konsoli modułu. Raport i 23 zrzuty:
`logs/e2e/2026-10-28T00-26-06/`, rower nr 12. Pokrycie: karta prób MG/gracza, widoczna
i dostępna do celowania postać, ruch i obrót kotwicy, wsiadanie/wysiadanie przez Miejsca,
zachowanie istniejących podglądów i odtworzenie bez duplikatów. Izolowana paczka `pojazdy`
przebudowana i zwalidowana; pliki WEBP oraz prześwity koszyka sprawdzone przez `validate.py`.
