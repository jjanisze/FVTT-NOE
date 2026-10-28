# Deskorolka — czternasty komplet grafiki

Dostarczona 2026-10-28; wygląd zachowany, na życzenie MG powiększona do 120%. Zużyty czarny grip, jasna klonowa sklejka,
cztery kremowe kółka i mała szara łatka z taśmy przy przednim końcu. Przód żetonu w dół.

| Zapisany plik modułu | Format |
|---|---|
| `tokens/portraits/pojazd-deskorolka.webp` | 1024×1024 RGB, nieprzezroczysty |
| `tokens/pojazdy/deskorolka.webp` | 180×216 RGBA, przezroczyste tło |

Obrys **0,6×0,72 kratki / 0,90×1,08 m**, widoczna sylwetka z kółkami **0,36×1,03 m**.
To 120% pierwotnego podglądu 0,5×0,6, zgodnie z korektą MG. Skala jadącego bez zmian.
Pierwotną kwadratową ramkę lekko wydłużono; pozostałe statystyki gry bez zmian. Jedno miejsce
stojące na środku, **x=0,50, y=0,50**. Prezentacja D32 `otwarta/nad`: pełna postać stale nad
deską, bez kropki, prześwietlenia i przygaszania. Bez silnika, paliwa, wydechu i wariantu wnętrza.

MG odłożył dopasowanie wielkości jadących na później po ocenie roweru. Bieżący rozmiar miejsca
0,5 kratki i źródłowe skale tekstur postaci pozostają bez zmian; ten komplet nie koryguje postawy
ani wielkości postaci na deskorolce.

## Metoda i odtworzenie

Wbudowane `image_gen.imagegen`, generowanie z referencjami; narzędzie nie ujawnia nazwy modelu.
[Pełne prompty i role wejść](prompts.json). Portret roweru dostarczył styl i scenerię; nowy portret
ustalił materiały deski. Autorski [SVG](layout.svg) i [raster](layout.png) wyznaczyły proporcje,
cztery kółka, dwie czwórki śrub i przednią łatkę. Generator namalował rzut z tych dwóch referencji.
Źródła: `portrait-v1.png`, `token-v1.png`. Wejścia packera: `../in/portrety/deskorolka.png`
i `../in/pojazdy/deskorolka.png`. Packer tylko kadruje, skaluje i konwertuje, zachowując alfę
(252/255 przy kotwicy). Portret około 444 KB, ponad miękki budżet 100–150 KB; żeton około 10 KB.

```sh
python dev/art/m4/gen_catalog.py
python dev/art/m4/pack.py --asset portrety/deskorolka --asset pojazdy/deskorolka
python dev/art/m4/deskorolka/validate.py
```

[Model](model.json), [walidacja](validation.json). Izolowana paczka `pojazdy` przebudowana
i zwalidowana w sandboxie.

## Poligon i sprawdzenie

**Garaż → Karta prób → Grafika: Deskorolka**, sonda `grafika-deskorolka`: portret, pusta deska,
deska z postacią i odpowiednik Commoner obok. Dodano też deskorolkę na Parkingu. Bez resetu:
zachowano 14 wcześniejszych scen i wszystkie 195 żetonów. Generator odtwarza Parking + 14
podglądów; po dodaniu porównania wraków Garaż ma łącznie 16 scen.

`npm test` zielony, Quench pojazdów **42/42**, E2E `garaz-grafika` **19/19**, bez błędów
konsoli modułu. Pierwotny raport i 24 zrzuty: `logs/e2e/2026-10-28T00-53-47/`, deskorolka nr 13.
Sprawdzono kartę prób dla MG i gracza, widoczną postać i celowanie, kotwicę po ruchu i obrocie,
wejście/zejście przez Miejsca, zachowanie poprzednich podglądów i odtworzenie bez duplikatów.
Po powiększeniu i dodaniu pierwszego wraku E2E **20/20**: `logs/e2e/2026-10-28T01-12-07/`.
Trzy istniejące deskorolki zachowały środki i obroty, 196 innych żetonów bez zmian.
Wszystkie 14 pojazdów ma portrety i żetony; z obrazów M4 pozostały trzy kategorie wraków.
