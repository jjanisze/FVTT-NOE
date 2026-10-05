# Plansza pościgu

Przycisk z flagą w narzędziach Żetonów otwiera okno „Nowy pościg”. Na istniejącej planszy
zmienia się w przycisk ustawień. Oba okna pozwalają wybrać **Pustynię Nevady**, **Przedmieścia
w ruinach** albo **Nuklearną zimę**. Motyw jest wyglądem planszy; środowisko ustala ST Testu
Pościgu. Można je dowolnie łączyć. Starsze plansze pokazują pustynię Nevady.

Nevada ma realistyczne bitmapowe tło widziane pod kątem około 45°: zniszczony asfalt,
suche pobocza i wzgórza. Dwie bliższe warstwy pokazują górne części roślin, znaków i ruin.
Mogą na chwilę zasłonić pojazd, ale przepuszczają kliknięcia, celowanie i przeciąganie.
Tło dobiera kolejne odcinki drogi, doliny, wzgórza i płaskowyże oraz różne elementy pierwszego
planu. Grafiki wczytuje z wyprzedzeniem, a nieużywane zwalnia. Nowy pościg zaczyna z tempem 2;
tempo można zmienić w ustawieniach planszy. Zapisane tempo istniejącego pościgu zostaje zachowane.

Pojazdy w pasie pościgu patrzą w prawo. Środek żetonu rozstrzyga, czy jest w pasie, czy
w strefie swobodnej pod linią. W strefie swobodnej MG może obracać żetony dowolnie.

Pojazd przyciągnięty do środka toru delikatnie drży i kołysze się. Przytrzymanie Shifta przy
upuszczaniu między torami wyłącza jego kołysanie. „Tempo tła” steruje ruchem scenerii
i animacją pojazdów; zero zatrzymuje oba. Animacja nie zmienia pozycji, obrotu ani zasięgów
zapisanych w dokumentach.

Każdy użytkownik ma własne ustawienie modułu **„Animacja pojazdów na planszy pościgu”**.
Jest domyślnie włączone. Wyłączenie od razu przywraca zwykłe położenie grafiki żetonów;
nie wpływa na wybór innych graczy ani na przewijanie tła.

## Grafika pojazdu z innym kierunkiem przodu

Domyślnie przód grafiki wskazuje dół obrazka: dokument otrzymuje obrót 270°. Dla grafiki
wskazującej w prawo ustaw na aktorze flagę `poscigFacingOffset` na 90; w górę — na 180;
w lewo — na −90. Korekta dotyczy wyłącznie plansz pościgu. Przykład dla wybranego aktora:

```js
await actor.setFlag("neuroshima-2026-overrides", "poscigFacingOffset", 90);
```

Po zmianie flagi wejdź ponownie na planszę. Obrót jest właściwością dokumentu żetonu;
celowanie i efekty korzystające z jego obrotu widzą tę samą wartość. Na planszy pościgu
blokada obrotu żetonu zostaje wyłączona, żeby grafika mogła przyjąć ustawiony kierunek.
