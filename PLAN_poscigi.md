# PLAN — Pościgi i pojazdy

> Status: **CZĘŚCIOWO ZAIMPLEMENTOWANE** (2026-09-12). Działa: dane pojazdów, generowana
> plansza z przewijaną pustynią i torami, interfejs MG, przyciąganie do torów
> i recentrowanie pola, GMT400 i ścigający. Nie ma jeszcze: karty pojazdu, manewrów,
> tabel k20. Stan po punktach — §10.
>
> Dokument projektowy — pisz tutaj, implementuj w `scripts/scenes/poscig-*.mjs`,
> `scripts/actors/vehicle-sheet.mjs`, `scripts/config/vehicles-data.mjs`.
>
> Zasady źródłowe: podręcznik, „ZASADY POŚCIGÓW / WYŚCIGÓW POJAZDAMI" (s. 266–268),
> „AWARIE POJAZDÓW SILNIKOWYCH" (s. 264–265), tabela statystyk pojazdów (s. 262).
> Wcześniejszy szkic wymagań: `neuroshima_5e_modifications.md` §13.
> Powód, dla którego to powstaje teraz: finał sesji 13B przelewa się w pościg
> (`Neuro 5e/Sceny/Akt 2/Konspekt Sesja 13B.md`).

---

## 0. Decyzje podjęte przed pisaniem (2026-09-11, z MG)

Sześć pytań, na które kod nie mógł odpowiedzieć sam. Zapisane, bo każde z nich zmienia
kształt reszty dokumentu.

| # | Pytanie | Decyzja |
|---|---|---|
| D1 | Czym fizycznie jest plansza pościgu? | **Generowana scena FVTT.** Nie okno ApplicationV2. |
| D2 | Co stoi na planszy? | **Tylko pojazdy.** Załoga nie ma pozycji — jest danymi na pojeździe. Tokenów PC na planszy nie ma. |
| D3 | Kto może ruszyć pojazdem? | **Każdy członek załogi**, także bez ownershipu na aktorze pojazdu (relay przez GM-a). |
| D4 | Jak stosowany jest ruch? | **Nigdy sam.** Manewr/test wystawia kartę na czacie z przyciskiem; token rusza się dopiero po kliknięciu człowieka. |
| D5 | Statystyki GMT400 | **Podwozie Hammer** z tabeli podręcznikowej. |
| D6 | Animowana pustynia | **Proceduralna**, pieczona w runtime do `PIXI.Texture`, ścieżka podmienialna na autorską grafikę później. |
| D7 | Wyjście poza krawędź planszy | **Auto-recentrowanie** całego pola. |
| D8 | Zakres pierwszej wersji | Plansza + karta pojazdu + GMT400 + manewry. Awarie/komplikacje **losowane, ale stosowane ręcznie przez MG.** |

---

## 1. Dlaczego scena, a nie własne okno

RAW opisuje pościg jako „umowny układ odniesienia" z kapslami na stole. Kuszące jest
zbudowanie tego jako osobnego okna z własnym `<canvas>`. To była zła droga i warto, żeby
następny czytelnik wiedział dlaczego, zanim spróbuje.

Pionek na planszy pościgu **musi być prawdziwym tokenem**, bo RAW każe do niego strzelać
(„Atak dystansowy. Możesz zaatakować przeciwnika lub pojazd, który widzisz"), taranować go,
zadawać mu obrażenia i sprawdzać jego Próg awarii. Wszystko to w tym module już działa —
`weapons/engine.mjs`, karty obrażeń, `combat/*`, `bestiary-thresholds.mjs`. Pionek narysowany
w cudzym `<canvas>` nie jest celem: nie da się go otargetować, nie przyjmie karty obrażeń,
nie policzy Progu obrażeń. Odtworzenie tego to przepisanie połowy modułu.

Ta sama logika załatwia cel 4 (strefa swobodna): warstwa Rysunków to gotowy, znany MG
edytor. Nie piszemy własnego.

Koszt decyzji: pościg to przełączenie sceny, czyli zejście z mapy taktycznej. Akceptowany —
w sesji 13B pościg i tak jest osobnym aktem, nie nakładką na parking.

---

## 2. Plansza (cele 1–4)

### 2.1 Geometria

Jedna stała, z której wynika reszta: **1 znacznik pościgu = 36 m = 200 px = szerokość toru.**

| Parametr | Wartość | Skąd |
|---|---|---|
| `grid.type` | `0` (GRIDLESS) | Nic nie ma się przyciągać samo — przyciąganie jest nasze i warunkowe (§2.4). |
| `grid.size` | `200` | Szerokość toru. |
| `grid.distance` | `36` | Żeby linijka Foundry'ego czytała poziomo prawdziwe metry. |
| `grid.units` | `"m"` | Jak reszta świata. |
| Torów widocznych | `12` (ustawialne) | Start 1–4 + 7 znaczników przewagi = 11. Dwunasty to zapas. |
| `width` | `2800` | 12 × 200 + 2 × 200 marginesu. |
| `height` | `2200` | Pas pościgu 1300 + strefa swobodna 900. |
| `FREEFORM_Y` | `1300` | Granica: powyżej — tory, poniżej — swoboda. |

**Scena nie ma obrazu tła.** Tło rysuje warstwa PIXI (§2.2), a `backgroundColor` ustawiamy na
ciemny piaskowy, żeby nic nie migało przed pierwszą klatką. Uwaga na pułapkę v14 zapisaną
w pamięci projektu: `background.src` to tylko read-only shim nad `levels[0]`, więc scena
tworzona programowo dostaje jawną tablicę `levels: [{ name: "Pościg" }]` — bez niej scena
bywa niepoprawnie zbudowana, nawet jeśli tła i tak nie chcemy.

### 2.2 Animowana pustynia (cel 1)

Precedens jest w repo: `weapons/tracer-vfx.mjs` piecze tekstury proceduralnie do offscreen
canvas → `PIXI.Texture` i sam pisze w tickerze. Robimy to samo, więc nie ma tu nowej
technologii do wynalezienia — jest znany, działający wzorzec do skopiowania.

Trzy warstwy paralaksy, każda `PIXI.TilingSprite`, przewijane przez `tilePosition.x`:

| Warstwa | Mnożnik | Zawartość |
|---|---|---|
| Dalekie wydmy | `0.25` | Miękkie pasmo, niski kontrast, zamglone. |
| Grunt + skały | `1.00` | Główna faktura, na tej warstwie „mierzy się" prędkość. |
| Bliskie krzaki | `2.00` | Rozmyte plamy, wysoka częstotliwość. |

Tekstury pieczone raz przy starcie pościgu i trzymane w module. Ścieżka do ewentualnej
autorskiej grafiki zostaje **stałą w pliku** (`DESERT_TEXTURES = { far: null, mid: null, near: null }`) —
`null` znaczy „upiecz proceduralnie". Podmiana na PNG to zmiana trzech stringów, dokładnie
tak, jak `tracer-vfx.mjs` sam o sobie pisze („an authored PNG can be swapped in later").

**Gdzie to wisi.** `canvas.primary`, z `elevation: 0` i `sortLayer` między tłem sceny
a kaflami.

> **Poprawka z implementacji (2026-09-11).** Ten akapit mówił wcześniej
> „`canvas.stage.addChildAt(container, 0)`, bo scena pościgu nie ma obrazu tła, więc nic
> jej nie zamaluje". **To było błędne** i kosztowało pierwszą próbę: warstwa istniała, miała
> właściwe wymiary i `worldVisible === true`, a nie renderowała **nic**. Scena bez obrazu tła
> wcale nie zostawia pustego miejsca — `canvas.primary.background` to `PrimarySpriteMesh`,
> który maluje `levels[0].background.color` jako pełny nieprzezroczysty prostokąt, po naszej
> warstwie. Kolor tła sceny jest malowany jako obiekt, nie tylko ustawiany jako kolor
> czyszczenia renderera.
>
> Właściwe miejsce wynika z `PrimaryCanvasGroup.SORT_LAYERS`
> (`SCENE: 0, TILES: 500, DRAWINGS: 600, TOKENS: 700, WEATHER: 1000`) — `sortLayer: 100`
> siada nad tłem, a pod kaflami, rysunkami MG i tokenami. `elevation` **musi** być 0 (tyle ma
> tło), bo `_compareObjects` porównuje najpierw elewację i przy różnicy nigdy nie dojdzie
> do `sortLayer`.

**Prędkość przewijania** jest sterowana z flagi sceny (`tempo`, domyślnie umiarkowane) i MG
zmienia ją suwakiem w panelu. Świadomie **nie** wiążemy jej z Szybkością lidera: pozycje są
względne, więc „szybciej" nic nie znaczy mechanicznie, a wiązanie tego z danymi robi
mrugającą planszę przy każdym manewrze. Jeden moment wyjątkowy: przy auto-recentrowaniu
(§2.5) puszczamy krótkie przyspieszenie, żeby przesunięcie pola miało pokrycie w obrazie.

**Pułapki z pamięci projektu, do zastosowania wprost:**
- `sprite.mask` w tym środowisku po cichu nie działa — nie maskujemy warstw, tniemy je
  geometrią i pozycją.
- Ticker: `canvas.app.ticker` renderuje na priorytecie LOW; nasz update leci na NORMAL. Ten sam
  układ, co w `tracer-vfx.mjs` (patrz komentarz przy jego `_update`) — jeśli coś ma zniknąć,
  musi zniknąć przed renderem tej samej klatki, nie po.
- Ticker odpinamy w `canvasTearDown`. Warstwa żyje tylko na scenie pościgu.

### 2.3 Tory (cel 2)

Tory rysuje **ta sama warstwa PIXI**, nie dokumenty `Drawing`.

Powód jest jeden i rozstrzygający: przy auto-recentrowaniu (§2.5) numery torów muszą się
przenumerować natychmiast. Jako `Drawing` to 12 zapisów dokumentów na każde przesunięcie pola,
z ownershipem, replikacją i migotaniem. Jako PIXI to przypisanie do `text`. Dodatkowo warstwa
Rysunków zostaje **wolna dla MG** (cel 4) — nasze tory nie mieszają się z jego szkicami.

Każdy tor: pionowa linia, półprzezroczyste wypełnienie na przemian, numer u góry. Tor
z pojazdem gracza dostaje delikatną poświatę.

### 2.4 Przyciąganie (cel 3)

Scena jest gridless, więc Foundry **domyślnie nie przyciąga niczego** — swoboda jest stanem
wyjściowym, a przyciąganie tylko dokładamy. To odwrotnie niż w typowej scenie i dlatego jest
proste.

Cała logika w `preUpdateToken`:

```
jeśli scena nie jest planszą pościgu        → nie ruszaj
jeśli nowy y >= FREEFORM_Y                  → nie ruszaj (strefa swobodna)
jeśli trzymany SHIFT                        → nie ruszaj (świadome ustawienie międzytorowe)
w przeciwnym razie                          → przyciągnij x do środka najbliższego toru
                                              i zapisz flags[MODULE].poscigLane
```

> **Poprawka z implementacji (2026-09-12).** Powyższy pseudokod opisywał hak
> `preUpdateToken` i modyfikator **Alt**. Oba były błędne.
>
> **Alt → Shift.** To Foundry używa Shifta na „nie przyciągaj"
> (`Token#_onDragLeftMove` → `_updateDragDestination(…, {snap: !event.shiftKey})`). Uczenie
> MG drugiego skrótu na to samo byłoby czystym kosztem.
>
> **`preUpdateToken` → `TokenDocument#getSnappedPosition`.** Przepisywanie `changes.x`
> w `preUpdateToken` **nie działa w v14**: token nie ruszał się wtedy wcale — ani na pozycję
> przyciągniętą, ani na upuszczoną — i nie pojawiał się żaden błąd. Ruch jest rozstrzygany
> wcześniej, w statycznym `TokenDocument._preUpdateOperation`; zmiana `changes.x` po fakcie
> rozjeżdża się z policzoną trasą i cały komplet `MOVEMENT_FIELDS` zostaje wykasowany.
> Właściwy punkt to `getSnappedPosition` — jedyne miejsce, w którym Foundry *pyta*, gdzie ma
> trafić token, i pyta stamtąd o przeciąganie, strzałki, linijkę i podgląd trasy naraz.
> Bonus: wywołanie jest owinięte w `if (snap)`, więc obsługa Shifta wychodzi za darmo
> i nie ma w kodzie ani jednego odczytu modyfikatora.

Pionowo nic nie przyciągamy: w torze mieści się kilka pojazdów jeden pod drugim i to jest
pożądane — RAW rozstrzyga starcia po „tym samym znaczniku", nie po sąsiedztwie.

**Zasięgi liczymy z numerów torów, nie z linijki.** `|torA − torB| × 36 m`. Dystans mierzony
przez Foundry uwzględnia też rozjazd pionowy, który na tej planszy jest dekoracją — dwa
pojazdy w jednym torze, ale na przeciwnych końcach pasa, „dzieli" 234 m, co jest nieprawdą.
`grid.distance` jest ustawione (§2.1) wyłącznie dla wygody oka przy linijce.

### 2.5 Auto-recentrowanie (D7)

Po każdej zmianie toru: policz zajęte tory. Jeśli maksimum wychodzi poza ostatni tor albo
minimum poniżej pierwszego — przesuń **wszystkie** pionki pościgu o brakującą różnicę
i przenumeruj etykiety. Pozycje względne się nie zmieniają, bo RAW liczy tylko odległości
między uczestnikami.

Przesunięcie jest zapisem na cudzych tokenach, więc wykonuje je wyłącznie
`game.user.isActiveGM` — ten sam relay, którego używają już `flara.mjs`, `kolczatka.mjs`
i `grenade-inventory.mjs`. Gracz zapisuje tylko własny ruch; klient MG reaguje na `updateToken`
i robi resztę jednym `updateEmbeddedDocuments`.

Licznik „ile znaczników przewagi" i „która runda" idzie z flag sceny, nie z pozycji pikselowej —
przenumerowanie nie może gubić warunku końca pościgu (7 znaczników przewagi / 10 rund).

Dwie rzeczy, bez których to się psuje, obie wyszły dopiero przy pisaniu:

- **Przesunięcie musi być jednokrokowe.** Recentrowanie odpala się z haka ruchu, a samo
  przesuwa pionki, więc odpala się ponownie. Gdy rozstaw jest szerszy niż plansza, „dosuń
  lidera do krawędzi" wypycha ogon za przeciwną krawędź, następne wywołanie przesuwa pole
  z powrotem i plansza dygocze bez końca. Dlatego przy zbyt szerokim rozstawie
  `deltaRecentrowania()` **odmawia** (zwraca 0) i MG dostaje komunikat, żeby dodać tory.
- **Margines planszy musi mieć szerokość toru.** Foundry trzyma tokeny w prostokącie sceny,
  więc `MARGIN_X = LANE_W` daje dokładnie jedno pole przepełnienia z każdej strony — i to
  ono w ogóle pozwala wykryć wyjazd poza planszę. Węższy margines po cichu wyłączyłby
  recentrowanie.

### 2.6 Strefa swobodna (cel 4)

Dolne 900 px. Nie ma tam torów, nie ma przyciągania, nie ma logiki pościgu — tokeny
postawione poniżej `FREEFORM_Y` są dla mechaniki niewidoczne (nie wchodzą do liczenia
przewagi, nie są recentrowane).

MG rysuje tam natywną warstwą Rysunków: schemat wozu, kto na którym siedzeniu, kto wisi na
masce. Warstwa PIXI rysuje tylko poziomą linię podziału z podpisem, żeby granica była widoczna.

---

## 3. Model danych pojazdu (cel 6, część 1)

dnd5e ma typ aktora `vehicle` i jego model pokrywa większość Neuroshimy **bez żadnych
własnych pól**. To jest dokładnie ten przypadek z ARCHITECTURE §8: używamy natywnego
mechanizmu, dokładamy tylko to, czego naprawdę nie ma.

| Neuroshima | Pole dnd5e | Uwaga |
|---|---|---|
| TT | `attributes.ac.flat` (`calc: "flat"`) | |
| PW | `attributes.hp.value/max` | |
| Próg obrażeń | `attributes.hp.dt` | Natywne. |
| **Próg awarii** | `attributes.hp.mt` | Natywne „Mishap Threshold" — pasuje 1:1. |
| Szybkość | `attributes.movement.walk` (`units: "m"`) | |
| Ładowność | `attributes.capacity.cargo` | |
| Waga | `traits.weight` | Poprawić `units` na `kg`. |
| Cena | `attributes.price` | |
| Rozmiar | `traits.size` | Wielka → `huge`, Duża → `lg`, Ogromna → `grg`. |
| Załoga | `crew.max` / `crew.value` | `value` to tablica UUID aktorów — **nośnik D3**. |
| Siedzenia | `passengers.max` / `.value` | |
| Niewrażliwości | `traits.di` / `traits.ci` | |

Czego w modelu nie ma i skąd to bierzemy:

| Brakujące | Rozwiązanie |
|---|---|
| Paliwo, spalanie | **Już istnieje** — `flags[MODULE].paliwo = {value, max, spalanie}`, właściciel: `actors/party-travel.mjs`. Nie dublować. |
| TT w bezruchu | `flags[MODULE].ttBezruchu`. |
| Szybkość cofania | `flags[MODULE].cofanie`. |
| Stan awarii | `flags[MODULE].awarie[]` — w wersji 1 tylko lista tekstowa na karcie (D8). |
| `details.type` | dnd5e daje `land/water/air/space`. GMT400 ma dziś `"air"` — pomyłka do naprawienia. |

**Nie ruszamy schematu DataModel** (ARCHITECTURE §2) — żadnego zawężania `choices`.

---

## 4. Karta pojazdu (cel 6, część 2)

### 4.1 Kto już siedzi na tej karcie

Zanim cokolwiek — dwa pliki **już** wstrzykują się w `renderVehicleActorSheet` i oba muszą
przeżyć:

- `actors/party-travel.mjs:709` — pasek paliwa (`injectVehicleFuel`), wspólny generator
  z kartą drużyny.
- `actors/vehicle-portrait.mjs:101` — przełącznik portret/token, łata realnej luki w dnd5e.

### 4.2 Podejście: hybryda, jak `sheet-shell.mjs`

Ten sam wybór, co przy karcie postaci (`PLAN_sheet_shell.md` §2, decyzja C): cienka podklasa
`VehicleActorSheet` przejmuje **wyłącznie mapę zakładek** (`PARTS`/`TABS`), a treść zakładek
dalej wjeżdża hookiem i wstrzyknięciem do DOM. Dzięki temu obaj dotychczasowi najemcy działają
bez zmian, a martwe zakładki dnd5e (żeglarskie: keel, beam, draft) przestają się renderować
zamiast być chowane CSS-em.

Zakładki: **Pojazd** (TT/PW/progi/Szybkość/paliwo), **Załoga** (crew + passengers, przypisanie
kierowcy), **Ekwipunek** (ładownia — już działa), **Uzbrojenie** (broń zamontowana, np. Browning
M2 z trójnogu na GMT400), **Awarie**, **Opis**.

### 4.3 Dwie pułapki rejestracji, obie zapisane w ARCHITECTURE §9

- Nazwa hooka renderu jest **per podklasa**. Dla stockowej karty pojazdu potwierdzone jest
  `renderVehicleActorSheet`. Nasza podklasa doda do łańcucha własną nazwę, ale odziedziczy też
  tamtą — mimo to **instrumentować `Hooks.callAll` raz** po pierwszym renderze i zarejestrować
  się na nazwie, która faktycznie leci. To dokładnie ten błąd, który zjadł karty grupy.
- `makeDefault: true` **bezwarunkowo**, nigdy `game.user.isGM`. Bramkowanie po GM-ie powoduje,
  że każdy klient gracza po cichu liczy `false` i dostaje kartę stockową.

---

## 5. Manewry i Testy Pościgu (cel 7)

### 5.1 Paleta manewrów

`ApplicationV2`, pokazywana automatycznie, gdy aktywna scena jest planszą pościgu, a użytkownik
ma pojazd, którego jest załogą. Dla MG — zawsze, z wyborem pojazdu.

Uprawnienie liczone z **`vehicle.system.crew.value`** (tablica UUID aktorów): jeśli jest tam
postać gracza, gracz widzi manewry tego pojazdu — nawet nie mając ownershipu na aktorze
pojazdu. To jest realizacja D3 i dlatego `crew.value` na GMT400 trzeba wypełnić (§6).

Przyciski: **Gazu!**, **Hample**, **Obrót 180°**, **Ostrożna jazda**, **Stuknięcie**,
**Zajechanie**, plus osobno **Test Pościgu**. Każdy z nich to opis + ST + skutek, wprost z RAW.

### 5.2 Test Pościgu

ST z flagi sceny — preset środowiska ustawiany przez MG przy starcie pościgu:
otwarta przestrzeń **5**, ulice **10**, wąskie uliczki **15** (tabela s. 266).

Rzut idzie natywnym torem dnd5e: Test Mądrości (Pojazdy), klucz umiejętności w tym świecie to
**`poj`** (`config/skills.mjs:57`) — nie `veh`, nie `ste`-podobna kalka. Ten sam typ pomyłki,
przed którym ostrzega ARCHITECTURE §6 (zmiana klucza `CONFIG.DND5E` i system piszący w pole,
którego nikt nie czyta).

Wynik:
- sukces → brak komplikacji;
- porażka → komplikacja (k20, tabela s. 267);
- **naturalna 20** → brak komplikacji **i dodatkowy znacznik**;
- **naturalna 1** → dwie komplikacje;
- porażka o więcej niż 5 → dodatkowo rzut na Tabelę Awarii (s. 265).

Klasa Rajdowiec (`class-features-data.mjs:1019`) daje Ułatwienie na wszystkie Testy Pojazdów
w pościgu i +50% Szybkości — do wpięcia jako modyfikator, nie jako ręczna notatka.

### 5.3 Ruch nigdy nie dzieje się sam (D4)

To jest twarda reguła tego podsystemu i wynika wprost z konwencji modułu zapisanej
w ARCHITECTURE §5 i w pamięci projektu („automatyzuj wykrywanie, nigdy stosowanie").

Manewr **nie rusza tokenu**. Manewr:

1. wykonuje rzut (jeśli RAW go wymaga),
2. wystawia kartę na czacie z rozstrzygnięciem po ludzku,
3. daje na karcie przycisk: `Przesuń +1 znacznik` / `Cofnij o 2 znaczniki` / `Rzuć komplikację`,
4. token rusza się dopiero, gdy **człowiek kliknie**.

Liczba znaczników liczy się z RAW: `floor(przebyty dystans / 36 m)`. Dla GMT400 (36 m) to
1 znacznik; z manewrem Gazu! (+Szybkość) — 72 m, 2 znaczniki; z akcją bonusową Gaz do dechy
(+Szybkość × 2) — 108 m, 3 znaczniki. Brak ruchu w turze to **−1 znacznik**, i to też jest
przycisk, nie automat.

**Jak podpiąć przycisk — nie bubble-phase.** ARCHITECTURE §9 opisuje udokumentowaną porażkę:
`renderChatLog` + delegacja w fazie bąbelkowania po cichu nie zadziałała dla nowej klasy
przycisku (hook leciał, przycisk istniał, klik nie robił nic, zero błędów). Odporny wzorzec to
jedna rejestracja na `document` w **fazie przechwytywania**:
`document.addEventListener("click", fn, { capture: true })`.

Sam zapis pozycji to znowu relay: klika członek załogi, flagę zapisuje na swoim aktorze,
`game.user.isActiveGM` wykonuje `token.update()`. Przyciski widzi tylko MG i załoga tego pojazdu.

---

## 6. GMT400 (cel 5)

Stan zastany (`Wke8ursIGVbKLMUF`) to w praktyce jeżdżący bagażnik: PW 180, TT 14,
**Szybkość 9 m**, `details.type: "air"`, puste `crew`/`passengers`/`cargo`/`weight`,
`traits.weight.units: "lb"`. Szybkość 9 m to prędkość pieszego — na planszy pościgu wóz nie
ruszyłby się o ani jeden znacznik.

Podwozie: **Hammer** (D5).

| Pole | Wartość | Uwaga |
|---|---|---|
| Szybkość | **36 m** | Dokładnie 1 znacznik na turę. |
| Cofanie | **18 m** | Połowa, wzorem Osobówki (36/18). |
| TT | **17** | |
| TT w bezruchu | **12** | Wyprowadzone z wzorca −5 (Osobówka 15/10, Motocykl 15/10). Podręcznik nie podaje go dla Hammera wprost — **założenie, do potwierdzenia przez MG.** |
| PW | **100** | |
| Próg obrażeń | **10** | `hp.dt` |
| Próg awarii | **25** | `hp.mt` |
| Załoga | **5** | `crew.max` |
| Ładowność | **1 t** (podwozie) | Patrz rozbieżność niżej. |
| Rozmiar | **`huge`** | „Wielka maszyna", jak Osobówka. Dziś `lg`. |
| `details.type` | **`land`** | Dziś `air`. |
| Niewrażliwości | psychiczne, trucizna; stany poza Podpalenie/Powalenie/Unieruchomienie | Wzorem Osobówki. |

**Do rozstrzygnięcia przez MG — trzy rozbieżności, których nie ruszam sam:**

1. **PW 180 vs 100.** Obecne 180 jest prawie dwukrotnie powyżej podwozia. Może być śladem
   po dopancerzeniu (Raynald przebudował wóz w Bunkerville — `Lokacje/Bunkerville/Warsztat.md`),
   a może dryfem. Obniżenie do 100 realnie osłabia drużynę w sesji, w której ten wóz jest
   ich życiem.
2. **Paliwo: 80 l @ 20 l/100 km (w grze) vs 112 l @ 50 l/100 km (handout z Roll20).** To nie
   kosmetyka: 400 km zasięgu kontra 224 km. `party-travel.mjs` liczy z tego zasięg na karcie
   drużyny, więc zmiana natychmiast przestawi im planowanie podróży. **Domyślnie zostawiam
   wartości z gry** — są tym, czym drużyna gra.
3. **Ładownia: 1 t (podwozie) vs 500 kg (handout „Bagażnik SUVa").** Proponuję `capacity.cargo`
   = 500 kg jako realny bagażnik, a 1 t zapisać jako nośność całkowitą podwozia.

Poza tym: **Browning M2 z trójnogiem** już leży w ładowni jako `weapon`. Powinien być bronią
**zamontowaną** (zakładka Uzbrojenie, §4.2), a nie ładunkiem — inaczej strzelanie z niego
w pościgu nie ma reprezentacji.

Do wypełnienia obowiązkowo: `crew.value` — bez tego nikt nie zobaczy palety manewrów (§5.1).

---

## 7. Awarie i komplikacje (D8 — losujemy, nie stosujemy)

Obie tabele k20 (Awarie s. 265, Komplikacje s. 267) wchodzą jako **dane + rzut + karta czatu**,
bez automatycznego stosowania skutków. Powód nie jest wygodą — to konwencja z ARCHITECTURE §5:
mechanika, której moduł naprawdę nie egzekwuje, ma to powiedzieć głośno. Każdy wpis dostaje
pole `manual` z tekstem drukowanym na karcie pod „Nie automatyzujemy", jak `items/chemia.mjs`.

Powód merytoryczny: pozycje w rodzaju „Pożar", „Zranienie pasażera" czy „Dziura lub przepaść"
mają skutki, które MG i tak musi rozstrzygnąć fabularnie (kto siedzi gdzie, czy jest czym gasić,
co znaczy „stała przeszkoda dla wszystkich za tym pojazdem"). Automat, który zgaduje, jest
gorszy od czytelnej karty z ST naprawy.

Dane: `config/vehicles-data.mjs` → `AWARIE[]` (20 wpisów: opis, ST naprawy na postoju, ST
w jeździe lub `null`) i `KOMPLIKACJE[]` (20 wpisów). Katalog 14 podwozi z tabeli s. 262
**wypada z zakresu wersji 1** (D8) — struktura pliku ma go jednak przewidzieć, żeby dołożenie
było dopisaniem danych, a nie przebudową.

---

## 8. Pliki i API

```
scripts/scenes/poscig.mjs           — cykl życia pościgu, generowanie sceny, flagi, koniec
scripts/scenes/poscig-canvas.mjs    — warstwa PIXI: pustynia (§2.2) + tory (§2.3)
scripts/scenes/poscig-ui.mjs        — przycisk MG w narzędziach sceny + okna dialogowe
scripts/scenes/poscig-snap.mjs      — preUpdateToken, przyciąganie, recentrowanie (§2.4–2.5)
scripts/scenes/poscig-manewry.mjs   — paleta, testy, karty czatu, przyciski ruchu (§5)
scripts/actors/vehicle-sheet.mjs    — podklasa karty pojazdu (§4)
scripts/config/vehicles-data.mjs    — AWARIE, KOMPLIKACJE, ST środowiska, podwozia
styles/neuroshima.css               — paleta manewrów, zakładki karty pojazdu
```

**Wejście dla MG to przycisk w narzędziach sceny** (grupa Żetony, tylko MG), kontekstowy:
na zwykłej mapie „Pościg — nowa plansza", na planszy pościgu „Pościg — ustawienia planszy".
Osobne przyciski na jedno i drugie znaczyłyby, że na każdej scenie jeden jest nieczynny.
API poniżej zostaje dla makr i konsoli, ale **nie jest interfejsem** — mechanika, do której
jedynym wejściem jest wklejenie JS-a, w praktyce nie istnieje: MG w trakcie sesji nie otwiera
konsoli.

```js
game.neuroshima.poscig.oknoNowyPoscig()          // to samo, co przycisk
game.neuroshima.poscig.oknoUstawienia()
game.neuroshima.poscig.start({ tory: 12, srodowisko: "ulice", scigani: [...], scigajacy: [...] })
game.neuroshima.poscig.konfiguruj(scene, { tory, srodowisko, st, runda, tempoTla })
game.neuroshima.poscig.dodajPojazd(scene, "GMT400", { tor: 4, rola: "scigany" })
game.neuroshima.poscig.stan()                    // tory, runda, przewaga, warunek końca
```

Namespace obok istniejącego `game.neuroshima.manewry` (walka wręcz) — świadomie osobny,
bo to inny podsystem, nie rozszerzenie tamtego.

Ustawienia świata: `poscigTory` (domyślnie 12), `poscigTempoTla`.

---

## 9. Ryzyka

| Ryzyko | Zabezpieczenie |
|---|---|
| Warstwa PIXI przeżywa zmianę sceny i zostaje na mapie taktycznej | Twardy teardown na `canvasTearDown`; warstwa tworzona wyłącznie, gdy scena ma flagę pościgu. |
| `sprite.mask` po cichu nie działa (pamięć projektu) | Nie używać masek — geometria i pozycja. |
| Recentrowanie gubi warunek końca | Przewaga i runda w flagach sceny, nigdy liczone z pikseli. |
| Rozmiar tokenu pojazdu rozpycha tor | Pionki pościgu tworzone z jawnym `width/height`, niezależnym od `prototypeToken` (GMT400 ma 2×2). |
| Przycisk na karcie czatu nie reaguje | Rejestracja na `document` w fazie capture (ARCHITECTURE §9). |
| Karta pojazdu wraca do stockowej u graczy | `makeDefault: true` bezwarunkowo. |
| Zderzenie z `party-travel.mjs` o pasek paliwa | Podklasa nie renderuje paliwa sama; zostaje wstrzyknięcie. |

---

## 9a. Ciche pułapki v14 znalezione przy budowie planszy (2026-09-11 / 09-12)

Każda kosztowała czas i każda jest **całkowicie cicha** — ani jednego błędu w konsoli.

**1. Poziom sceny musi mieć `_id: "defaultLevel0000"`, inaczej nie ma żadnych tokenów.**
W v14 każdy token należy do poziomu (`TokenDocument#level`), a to pole ma
`initial: BaseScene.metadata.defaultLevelId`, czyli literalne `"defaultLevel0000"`.
Poziom utworzony przez `Scene.create({ levels: [{ name: … }] })` bez jawnego `_id` dostaje
id losowe — i każdy token wskazuje wtedy na poziom, którego nie ma. Objaw: dokumenty tokenów
siedzą w scenie poprawnie (`scene.tokens` je zwraca), `canvas.tokens.placeables` jest **puste**,
na płótnie nie ma nic. Foundry tworzy swój domyślny poziom dokładnie z tym id
(`client/documents/scene.mjs`), więc to nie obejście, tylko dorównanie do normy.

**2. Kolor tła sceny jest malowany jako obiekt, nie tylko jako kolor czyszczenia.**
Patrz poprawka w §2.2. Wniosek ogólny: **niczego własnego nie da się schować „pod" grupą
`rendered`** — to, co ma być tłem, musi wejść do `canvas.primary` i przejść przez
`_compareObjects`.

**3. Przycisk w narzędziach sceny trzeba rejestrować w `init`, nie w `ready`.**
`SceneControls#_configureRenderOptions` przelicza zestaw narzędzi (`#prepareControls()`,
a w nim hook `getSceneControlButtons`) **tylko** przy `options.isFirstRender` albo
`options.reset`. Hook zarejestrowany w `ready` jest już po pierwszym renderze paska —
przycisku nie ma i **`ui.controls.render()` tego nie naprawi**, bo zwykły render nie rusza
definicji narzędzi. Objaw mocno myli: hook siedzi poprawnie w `Hooks.events`, wywołany ręcznie
robi dokładnie to, co trzeba, w konsoli zero błędów, a w interfejsie pusto. `main.mjs` ma to
zresztą opisane od dawna przy `registerTracerDebugPanelControls()` — ostrzeżenie, którego
warto było posłuchać za pierwszym razem. Do odświeżenia kontekstowego tytułu po zmianie sceny
służy `ui.controls.render({ reset: true })`; aktywna grupa i wybrane narzędzie to osobny stan
(`#control` / `#tools`) i reset ich nie gubi.

**4. Ruchu tokenu nie da się przekierować z `preUpdateToken`.**
`TokenDocument._preUpdateOperation` (statyczne, na całą operację) woła `#preUpdateOperationMovement`,
które liczy trasę, wpisuje gotowy cel do `operation.updates[i]` i robi `delete operation.movement` —
wszystko **przed** hakiem `preUpdateToken`. Stąd komplet `MOVEMENT_FIELDS` w `changes` już przy
wejściu do haka. Zmiana `changes.x` w tym miejscu rozjeżdża się z policzoną trasą i
`#preUpdateMovement` kasuje cały komplet pól ruchu (`if (!planned && (passed.length === 0))`).
Efekt: **token nie rusza się w ogóle** — ani na nową pozycję, ani na pierwotną — bez błędu.
Punkt wejścia do przyciągania to `TokenDocument#getSnappedPosition`; obsługuje przeciąganie,
strzałki, linijkę i podgląd trasy naraz, a Foundry woła go tylko wtedy, gdy przyciąganie ma się
odbyć (`{snap: !event.shiftKey}`), więc modyfikator Shift dostaje się gratis.

**5. W hakach ruchu `TokenDocument#x` to jeszcze pozycja SPRZED ruchu.**
Zmierzone: w `updateToken` `changes.x === 1800`, a `doc.x === 1200`. Pozycja trafia do
dokumentu dopiero po animacji. Każda logika, która w tym haku czyta `doc.x` (albo iteruje
`scene.tokens`, żeby policzyć układ), pracuje na poprzedniej klatce — cicho i wiarygodnie.
Hak `moveToken(document, movement, …)` dostaje `movement.destination` z pozycją rozstrzygniętą
przez silnik i to on jest właściwym miejscem na reakcję „po ruchu".

**6. `PIXI.TilingSprite` potrzebuje jawnego `baseTexture.wrapMode = REPEAT`.**
Domyślny CLAMP wylewa skrajną kolumnę pikseli na sąsiedni kafel — cienka pionowa kreska
wędrująca przez planszę, najlepiej widoczna tam, gdzie warstwa jest przezroczysta.
Wysokości pasów nie są potęgami dwójki, więc nie ma co liczyć na domyślne zachowanie
sterownika. Drugie, niezależne źródło tej samej kreski: ścieżka kończąca się dokładnie na
`x = 0` / `x = TILE_W` dostaje antyaliasing na krawędzi — stąd `OVERDRAW` w `poscig-canvas.mjs`.

---

## 10. Kolejność robót

1. ✅ **`config/vehicles-data.mjs`** — 14 podwozi z tabeli s. 262, środowiska pościgu i stałe
   z zasad. AWARIE i KOMPLIKACJE (tabele k20) **jeszcze nie** — struktura je przewiduje.
2. ✅ **GMT400** — podwozie Hammer, PW 180 zostaje (decyzja MG). Szybkość 9 m → 36 m,
   `details.type` `air` → `land`, rozmiar `lg` → `huge`, progi 10/25, TT 17, załoga 5,
   ładownia 500 kg, waga w kg, niewrażliwości. Zostaje: `crew.value` i Browning jako broń
   zamontowana (§6).
3. ⬜ Karta pojazdu (§4) — podklasa + zakładki, oba istniejące wstrzyknięcia nietknięte.
4. ✅ **Scena pościgu (§2.1) + warstwa PIXI (§2.2–2.3)** — `scenes/poscig.mjs`,
   `scenes/poscig-canvas.mjs`. Plansza generowana, trójwarstwowa paralaksa 60 FPS,
   12 numerowanych torów, strefa swobodna. Pionki przesuwa się na razie ręcznie.
   Aktor ścigającego: **Hammer Posterunku** (podwozie prosto z tabeli, PW 100).
4a. ✅ **Interfejs MG** — `scenes/poscig-ui.mjs`. Kontekstowy przycisk w narzędziach sceny
   (grupa Żetony, tylko MG) + dwa okna: „Nowy pościg" (nazwa, tory, środowisko, wybór
   ściganych i ścigających, aktywacja dla stołu) oraz „Ustawienia" (stan planszy, tory,
   środowisko/ST, runda, tempo tła, dostawianie pojazdów).
5. ✅ **Przyciąganie i recentrowanie (§2.4–2.5)** — `scenes/poscig-snap.mjs`. Przyciąganie
   przez nadpisany `TokenDocument#getSnappedPosition` (X do środka toru, Y wolne, strefa
   swobodna nietknięta, Shift omija). Recentrowanie z haka `moveToken`, jednokrokowe,
   z odmową przy rozstawie szerszym niż plansza. Numer toru liczony z pozycji — bez flagi,
   która mogłaby się rozjechać.
6. ⬜ Paleta manewrów, testy, karty z przyciskami (§5).
7. ⬜ Komplikacje i awarie na kartach czatu (§7).

Punkty 1–4 wystarczą, żeby rozegrać pościg z 13B ręcznie. Reszta to wygoda.

**Scena testowa:** „Pościg — test" (12 torów, otwarta przestrzeń, ST 5), GMT400 na znaczniku 4,
Hammer Posterunku na znaczniku 1 — dokładnie pozycje startowe z RAW.

    game.neuroshima.poscig.start({ scigani: ["GMT400"], scigajacy: ["Hammer Posterunku"] })
    game.neuroshima.poscig.pokazStan()
