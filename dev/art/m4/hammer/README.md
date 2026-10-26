# Hammer — drugi komplet grafiki (2026-10-25)

Aktualizacja D32: strzelec na otwartym włazie jest widoczny jako pełny żeton **nad dachem**,
bez kropki. Cztery fotele kabiny pozostają zakryte do prześwietlenia. Model `prezentacja` jest
niezależny od grafiki i osłony; pliki obrazów nie zostały zmienione. Sonda: `wlaz-widoczny`.
Sprawdzenie D32: Quench 35/35, E2E `pojazd-prezentacja` i regresja `pojazd` przeszły;
raport oraz zrzuty: `logs/e2e/2026-10-25T20-33-50/` w katalogu modułu.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-hammer.webp` | 1024×1024, RGB |
| `tokens/pojazdy/hammer.webp` | 450×900, RGBA |
| `tokens/pojazdy/wnetrza/hammer.webp` | 450×900, RGBA |

Piaskowa wojskowa terenówka: cztery wyraźne koła na dwóch osiach, cztery osobne fotele,
szeroki tunel środkowy, centralne stanowisko pod pustym włazem i tylny przedział bagażowy.
Bez oznaczeń, ludzi, uzbrojenia i dodatkowego koła zapasowego. Przód obu żetonów jest skierowany w dół.

## Metoda i źródła

Narzędzie: wbudowany generator obrazów OpenAI. [Pełne prompty i role referencji](prompts.json).
Najpierw powstał portret, z portretem Osobówki wyłącznie jako odniesieniem stylu. Autorski
[SVG](layout.svg) i [model](model.json) ustaliły proporcje wnętrza. Następnie powstała malarska
wersja bez dachu, a nad nią dach, szyby i słupki. Osobna edycja przesunęła właz nad platformę.

Źródła w tym katalogu: `out/roof-off.png`, `out/roof-on.png` (pierwszy dach, właz zbyt daleko ku tyłowi),
`out/roof-on-final.png` (końcowy dach). Źródła packera: `../in/portrety/hammer.png`,
`../in/pojazdy/hammer.png`, `../in/wnetrza/hammer.png`.
Packer tylko kadruje, skaluje i konwertuje; nie maluje ani nie usuwa tła.

Obie wersje powstały w kadrze 887×1774; końcowe pliki mają identyczny kadr 450×900 i rzeczywistą
przezroczystość. IoU sylwetek źródeł dla alfa >128 wynosi **99,62%**.
[Pomiary źródeł](validation.json). SVG kontroluje kompozycję; generator odchyla się od niego,
więc pozycje miejsc dopasowano do finalnej grafiki. Wymiary modelu są koncepcyjne.

## Miejsca i integracja

Środki miejsc od lewego górnego rogu całego żetonu:

- przód: x=0,67/0,33, y=0,53;
- tył: x=0,67/0,33, y=0,36;
- właz: x=0,50, y=0,435, stanowisko z osłoną 3/4; nie jest piątym fotelem.

`KATALOG_POJAZDOW.hammer.strefyGrafiki` jest wybierane przez istniejący generator kompendium,
gdy wykryje parę plików. Domyślne strefy innych grafik i istniejących aktorów pozostają osobne.
Odtworzenie plików: `python dev/art/m4/gen_catalog.py`, następnie
`python dev/art/m4/pack.py --asset portrety/hammer --asset pojazdy/hammer --asset wnetrza/hammer`.
Aktualizacja szablonu kompendium: `npm run fvtt -- packs --only=pojazdy` dla wybranego profilu.

W bieżącej sesji restart Poligonu został wstrzymany przez `refused-human-present`: były aktywne
sesje spoza rejestru narzędzia. Podgląd dodano przez API do działającego świata; jego kopie Hammera
mają przypiętą końcową parę i strefy. Nie przebudowywano aktywnego kompendium ani stanowisk.

## Podgląd i sprawdzenie

Poligon: **Garaż · Hammer — grafika i wnętrze**, osobna scena Garażu. Portret, pusty dach,
puste wnętrze oraz obsadzony Hammer stoją obok siebie. Auto 120%; grafika pasażerów w pierwotnej
skali. Eksperymentalne 85% cofnięto 2026-10-26 na żetonach i prototypach kopii podglądowych.
Prywatne grafiki BG i skrypty obsady pozostają poza publicznym repo. Sonda Garażu: `grafika-hammer`.

Walidacja WEBP oraz `npm test` przeszły; Quench `pojazdy` **31/31** w piaskownicy.
Zrzuty i wynik kontroli przełączania dachu oraz pięciu pasażerów zapisano w prywatnym katalogu
podglądu. Ocena estetyki przez MG pozostaje otwarta.

[Lokalny podgląd z suwakiem dachu i kotwicami](review.html).
