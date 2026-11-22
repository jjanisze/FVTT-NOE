# Zanurzenie — animowany efekt na sylwetce

**Zamknięte po akceptacji MG, 2026-10-29.** Końcowa korekta i podgląd dużych pionków
zaakceptowane („Good enough”). Sandbox zatrzymany i oddany do kolejnej pracy; Poligon
z podglądem pozostaje uruchomiony. Kod i plan M4 należą do osobnego zakresu Claude’a.

Wdrożenie po akceptacji MG, 2026-10-29. Zastępuje poglądową półokrągłą taflę; końcowe
żetony są top-down. Stare kandydaty i decyzje w panelu ikon pozostają zachowane.

**Korekta po ocenie wizualnej MG:** pierwsza implementacja była zbyt mało kontrastowa
(czysta 2/5, brudna/ścieki 0,25/5). Odrzucony szary materiał zachowano w archiwum.
Runtime ponownie używa dokładnie oryginalnej grafiki fal RGBA. Zachowuje jej nieregularne
rozjaśnienia i przezroczyste ogony fal; zmieniająca się alfa materiału odsłania pionka.
Kontrast został zwiększony, a ruch jest szybszy i ma większą amplitudę. Mętna i ściekowa
mają jasne grzbiety przy zachowaniu oliwkowo-szarej i brunatnej barwy. Czysta zachowuje
oryginalny cyjan. Dodatkowy test porównuje trzy fazy ruchu z pierwotną nakładką.

**Akceptacja MG i większe pionki:** korekta fal zaakceptowana („Idealnie”). Następna
zmiana zachowuje dolny skrajny poziom wody i podnosi górny o dodatkowe **15% logicznej
wysokości żetonu**. Wzrost jest jednostronny, bez zwiększania przezroczystości ani
zmiany zaakceptowanych barw. Dla 2×2 to dodatkowe 0,3 kratki, dla 3×3 — 0,45 kratki.
Woda obejmuje także dodatkowe primary meshe z tym samym właścicielem, np. osobną wieżę;
wszystkie korzystają z centrum i wysokości głównego pionka. Kod M4 i plan pojazdów
nie były w tej zmianie modyfikowane.

## Podgląd i obsługa

**Poligon → Arena → Karta prób → Grafika: Zanurzenie**, sonda `grafika-zanurzenie`.
Trzy kolumny porównują wodę mętną, ścieki i czystą. Górny rząd jest suchy,
niżej człowiek i pies mają Pod wodą; dolny rząd pokazuje cztery obroty.
Można obracać/przesuwać pionki i przełączać Pod wodą z HUD.
Galeria używa kopii istniejących istot z Bestiariusza; postacie kampanii nie są modyfikowane.

Duże obiekty: **Arena → Karta prób → Grafika: Zanurzenie — duże pionki**, sonda
`grafika-zanurzenie-duze`. Obrońca 2×2, Juggernaut 3×3, Osobówka oraz M2 Bradley z osobną
wieżą, w źródłowych rozmiarach i skalach. Trzy rzędy: sucho, mętna i czysta woda.
Obrót i najechanie na pojazd pozwalają sprawdzić wodę na wnętrzu. Ta osobna galeria
nie przesuwa wcześniejszych próbek ani nie resetuje Garażu czy Areny.
Instalacja dużego podglądu zachowała dokładnie 39 wcześniejszych scen, 437 pionków
i 447 aktorów; dodała jedną scenę i 12 próbek. Osiem mokrych pionków ma łącznie dziesięć
filtrowanych warstw (dwa Bradleye mają osobne wieże). Pojazdy nie otrzymują Uduszenia.

Instalacja dodała jedną scenę z 13 pionkami, zachowując dokładnie 38 wcześniejszych scen,
424 pionki i 445 aktorów. Po odświeżeniu manifestu serwera uzupełniono trzy Regiony
w tej samej galerii; wszystkie 437 pionków zachowały zapis. MG i Gracz 1 widzą
6 próbek mętnych, 2 ściekowe i 2 czyste, wszystkie z siłą 0,8 i jedną wspólną teksturą.
Chrome i serwer Poligonu uruchomiono ponownie na wyraźne polecenie MG.

- Efekt nakłada istniejący stan **Pod wodą** (`podWoda`). Zniesienie stanu usuwa filtr.
- Kierunek wody pozostaje zgodny z ekranem, niezależnie od obrotu pionka.
- Domyślnie woda jest mętna, siła efektu **0,8**. Jest to mnożnik warstwy materiału,
  a nie zakrycie 80% pikseli nieprzezroczystym kolorem.
- W zachowaniu Regionu **Woda**: **Wygląd wody** i **Siła efektu zanurzenia**.
  Poza Regionem ręcznie zanurzona postać korzysta z wartości domyślnych.
- Ustawienia modułu → **Animacja zanurzenia**: osobno dla każdego użytkownika.
  Wyłączenie pozostawia statyczną wodę na sylwetce.
- Region określa wygląd; samo wejście do niego nie wymusza zanurzenia. Wyjście z wody
  zachowuje dotychczasowe wynurzenie i reguły oddechu.

## Realizacja

`scripts/scenes/woda-efekty.mjs`: filtr PIXI na każdy primary mesh zanurzonego pionka,
wspólna tekstura `vfx/water-surface.webp` i jeden ticker na klienta. Filtr nie dodaje
żadnych pikseli poza alfą wyrenderowanej postaci. Poziom wody zależy od logicznego
centrum i wysokości żetonu, nie od obróconego prostokąta grafiki. Wyraźny dryf i falowanie,
z zachowaniem alfy i nieregularnych detali oryginalnej grafiki; brak odtwarzania maski na CPU.

Zmiana grafiki, skali, odbicia i ruch korzystają z aktualnego mesha. Woda poprzedza
filtry prezentacji, m.in. niewidzialność; nie ustawia widoczności pionka. Natywny shader
pierścienia pozostaje aktywny. Zniszczenie żetonu i teardown sceny sprzątają filtry,
a brak zanurzonych pionków zatrzymuje ticker. Wspólna tekstura pozostaje w cache Foundry.
Warstwy są rozpoznawane przez publicznego właściciela `mesh.object`; renderer nie importuje
kodu pojazdów. Wyjście z wody usuwa własne filtry z kadłuba i wieży, zachowując obce filtry.
Stan Pod wodą na aktorze typu `vehicle` nie tworzy Uduszenia ani licznika oddechu.

Diagnostyka tylko do odczytu: `game.neuroshima.woda.efekty.diagnostyka()`;
ponowne rozpoznanie profili: `game.neuroshima.woda.efekty.odswiez()`.
Źródło materiału i prompt: `dev/art/m6/water/`, autorstwo: `CREDITS.md`.

Serwer musi znać `documentTypes.RegionBehavior.woda` z manifestu modułu. Sama wymiana
skryptów w przeglądarce nie wystarcza przy starszym, skopiowanym manifeście Poligonu.
Generator sprawdza wynik utworzenia Regionów i zgłasza błąd zamiast udawać pełny podgląd;
potrafi uzupełnić Regiony w pierwszej częściowej galerii bez przesuwania pionków.

## Weryfikacja

Duże pionki i wyższe falowanie: `logs/e2e/2026-10-29T22-03-59/report.json` — **21/21 kroków**
(8 dotychczasowych efektów, 5 dużych obiektów, 8 zasad wody). MG i Gracz 1, brak błędów konsoli.
`npm test` przechodzi. `woda-duze` obejmuje wszystkie cztery obroty 0/90/180/270°,
niezmienioną alfę prawdziwych pionków 2×2/3×3 i pojazdów, zgodność kadłuba z wieżą,
odsłonięcie wnętrza kursorem, usuwanie filtra z zachowaniem obcych filtrów i ponowne otwarcie galerii.
Porównanie GPU na niejednolitym polu wody 200 i 400 px wykazuje identyczny stary i nowy dolny
skrajny poziom oraz przesunięcie górnego dokładnie o 30 i 60 px. Zrzuty:
`woda-duze-01-Gracz_1-large_and_huge_creatures_with_long_vehicles_and_separate_turrets.jpg`,
`woda-duze-02-gm-large_tokens_after_rotation_hover_and_layer_cleanup.jpg`.

Korekta czytelności: `logs/e2e/2026-10-29T21-37-57/report.json` — **8/8 kroków efektów**,
bez błędów konsoli. `npm test` przechodzi. Trzy zrzuty obejmują galerię, porównanie pierwotnej
grafiki z poprawką w trzech fazach ruchu i galerię po kontroli cyklu życia. Zbliżenie:
`woda-efekty-02-gm-original_painting_versus_readable_waves_at_three_animation_phases.jpg`.
Test ruchu sprawdza widoczną zmianę kolorów na dolnej części rzeczywistego pionka
dla każdego profilu, oprócz samego sprawdzenia zegara animacji. To dowód techniczny;
ocenę estetyki i czytelności nadal wystawia MG.

Testy: `npm test`; `fvtt e2e --suites=woda-efekty,woda` w sandboxie.
Pierwszy raport mechaniki: `logs/e2e/2026-10-29T20-44-13/report.json` — **15/15 kroków**
(7 efektów + 8 zasad), MG i Gracz 1, bez błędów konsoli i bez ostrzeżeń kompatybilności
pochodzących z modułu. Dwa zrzuty w tym samym katalogu:
`woda-efekty-01-Gracz_1-three_water_profiles_and_four_token_rotations.jpg` oraz
`woda-efekty-02-gm-animated_water_gallery_after_lifecycle_checks.jpg`. `npm test` również przechodzi.
Sonda sprawdza alfę i dolną część obrazu przy 0/90/180/270°, profile Regionów,
siłę 80%, wspólną teksturę, włączanie/wyłączanie animacji, zmianę grafiki,
odbicie i skalę, niewidzialność, pierścień, ukrycie oraz sprzątanie po zmianie sceny.
Pomiar czasu `canvas.app.render()` jest tylko orientacyjnym czasem zgłaszania renderu
na CPU; nie zastępuje pomiaru GPU ani nie gwarantuje FPS na innym komputerze.
Próba 40 renderów: około **1,35 ms** bez filtrów, **4,20 ms** z dwoma,
**4,79 ms** z dziesięcioma. Krótka, intensywna próba obejmuje też kolejkę sterownika;
wartości nie są kosztem samego shadera ani pomiarem płynności sesji.
