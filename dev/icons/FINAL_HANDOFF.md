# Icon session complete — 2026-10-17

**Zanurzenie — implementacja po ocenie MG, 2026-10-29:** półokrągłą taflę zastąpił
animowany filtr na sylwetce pionka, ze wspólną teksturą `vfx/water-surface.webp`.
Po odrzuceniu słabo widocznej pierwszej wersji tekstura ponownie używa oryginalnej grafiki RGBA;
renderer zachowuje jej grzbiety i zmienną alfę, z mocniejszym kontrastem i ruchem.
Domyślnie siła 80% i mętna woda; Region „Woda” wybiera profil mętna / ścieki / czysta.
Obrót pionka nie obraca wody. Podgląd: **Poligon → Arena → Karta prób → Grafika: Zanurzenie**.
Ikony z B119–120 nadal korzystają z własnej kolejki ocen; ich zapisów nie zmieniano.
[Obsługa i testy](../../HANDOFF_m6_zanurzenie.md).

**Instrumenty i woda — kandydaci do oceny, 2026-10-29:** zgodnie z potwierdzonym zakresem
przygotowano 12 instrumentów, dwa stany i nakładkę zanurzenia. Batches 119–120: 14 białych
glifów w dotychczasowym pipeline; kontrabas dostał szerszą korektę po ocenie przy 16 px.
Pierwszy kandydat nakładki był półprzezroczystą turkusową taflą, z kartą „Nakładka zanurzenia”
i zakładką **Zanurzenie**; pozostał jako archiwalny podgląd. Razem 15 kart w istniejącym panelu.
Żetony 4 towarzyszy i 11 istot pozostają poza tym zakresem. Grafiki są kandydatami;
`iconReady`, ikony stanów, paczki i światy zachowane. [Źródła i podgląd](m6-pass/README.md).
Walidacja: B119 9/9 i B120 5/5; globalnie 921 par PNG/SVG. Chrome: 60 obrazów bez braków,
sześć płócien nakładki; suwak, porównania i rozmiar 70 px działają. Zachowano wszystkie
557 wcześniejszych kart i zapisane decyzje MG; dowody `m6-pass/review-ready.json`.

**Ładunki i ostatnie ruiny, 2026-10-29:** magazyn i wnętrze wraku zapakowano z gotowych
źródeł MG. Wszystkie dziewięć grafik mapowych jest dostarczonych: Mołotow, dynamit, C4,
oba IED oraz granaty improwizowany, dymny, hukowy i zapalający. Dalsze generacje ukończyły
początkową częściową dostawę. Mołotow ma źródło bez płomienia; ogień dodaje moduł.
Poligon: **Strzelnica → Karta prób →
Grafika: Granaty i ładunki**, sonda `grafika-granaty`; powiększenia i próbki na dwóch tłach.
Początkowo dodano jedną scenę z 20 nieuzbrojonymi próbkami; przed jej aktywacją potwierdzono dokładne
zachowanie wszystkich 37 wcześniejszych scen i 424 żetonów.
Galeria uzupełnia tę samą scenę do 45 próbek, zachowując istniejące grupy.
Końcowy komplet: E2E **6/6** z Sequencer/JB2A, bez błędów konsoli,
`logs/e2e/2026-10-29T00-32-09/report.json` i trzy zrzuty. `npm test` i walidacja 37 obrazów M5 przechodzą.
Poligon: dodano 25 próbek w tej samej scenie, zachowano wszystkie wcześniejsze 20;
pozostałe 37 scen i 424 żetony identyczne. Oba klienty odświeżone.
Pierwsza częściowa dostawa: E2E `explosive-art` 5/5,
raport i dwa zrzuty `logs/e2e/2026-10-29T00-02-54/`.
[Źródła i pełne prompty](../art/m5/explosives/README.md).

**Wraki — kolejna korekta mniejszych, 2026-10-29:** MG poprosił także o poszarpanie małego
i szczególnie średniego: dziury przez stos, wyrwy w obrysie i wystające fragmenty. Nowe edycje
ich własnych źródeł v1: `maly-v2.png`, `sredni-v2.png`, `revision-jagged-prompts.json`.
Zastępuje to wcześniejszą decyzję zachowania ich bez zmian. Duży/gigantyczny pozostają v3.
Aktualny komplet sprawdzony: E2E 7/7, `logs/e2e/2026-10-28T23-34-40/report.json`, bez
błędów konsoli; oba klienty Poligonu odświeżone. Wszystkie 37 scen / 424 żetony zachowane.

**Wraki maszyn — poprawka 2026-10-29:** mały zaakceptowany i średni akceptowalny, oba
zachowane bitowo. Duży/gigantyczny v1 odrzucone jako okrągłe powtórzenia drobnych części;
zastąpione niezależnymi generacjami v2: dominujące zerwane płyty i konstrukcje, drobne
resztki w szczelinach, nieregularne obrysy i wyrwy. Spójność stylu nie jest już wymogiem.
Prompty `dev/art/m5/wraki/revision-v2-prompts.json`, wybór źródeł `selection.json`.
Ten sam podgląd **Złomowisko → Karta prób → Grafika: Wraki maszyn**, bez zmian skal pionków.
Kolejna prośba MG: więcej stopienia i zwęglenia. Aktywne v3 to edycje materiałów własnych
konstrukcji v2, zachowujące asymetrię i dominujące wielkie części; `revision-v3-prompts.json`.

**Wraki maszyn, 2026-10-28/29 — dostarczone, do oceny MG:** cztery wspólne stosy stopionych,
zwęglonych części: `tokens/wraki/{maly,sredni,duzy,gigantyczny}.webp`. Rozdzielczości
400/400/800/1600 px, wypełnienie 70/90/90/92%, alfa. Nie zachowują sylwetki konkretnej maszyny;
większe stosy zawierają więcej części i warstw. Runtime dobiera plik po rozmiarze, zachowuje pole
i skalę oraz Przywróć grafikę. **Złomowisko → Karta prób → Grafika: Wraki maszyn**, sonda
`grafika-wraki-maszyn`. [Źródła, prompty i pomiary](../art/m5/wraki/README.md).
`npm test` zielony; E2E **7/7 + 4/4**, bez błędów konsoli, dwa zrzuty:
`logs/e2e/2026-10-28T23-01-42/report.json`. Magazyn i wnętrze wraku zapakowano 2026-10-29
z gotowych źródeł MG, obecnych od 20 października; wcześniejszy audyt przeoczył PNG.

**Follow-up, 2026-10-18:** proficiency/skill UI and advancement headers
were outside the item-art completion scope. Live inspection found 51
colored stock rows plus six header lookups. Existing glyph candidates
were checked visually and are now wired through the native Trait UI. All 51
rows and six headers use module glyphs. Seven approved designs from Batches
112–114 are installed, including the chosen looming-face Intimidation icon and
knuckle-roll Sleight of Hand icon. Acrobatics keeps its current glyph by GM
choice. All proficiency artwork and wiring are complete.
Evidence: `PROFICIENCY_COVERAGE.md` and
`proficiency-icons-2026-10-18-approved.json`.

The earlier 557 review cards are resolved. The new M6 slice adds 15 cards for GM review;
it does not reopen earlier approvals or installations.
The last seven exact selections from the earlier pass are
installed as SVG/WEBP pairs, including the earlier Batch 110 Nowy Jork
design chosen by the GM. All twelve main origin emblems and five new
companion glyphs are delivered.

The explicitly authorized source wiring is complete: 53 Sztuczki, 80
bestiary entries, 11 companion entries, three fuel grades, medic refill
and Wyłączony. The audited source has zero art gaps, generic fallback
gaps, missing literal icon references or generated initials badges.

Verification: all 871 review candidate pairs pass; all 155 original
native placeholder deliveries retain their exact approved masks.
`node dev/icons/verify_final_integration.mjs` verifies real item builders,
the companion builder's prefixed IDs and 537 untouched reviews.
Evidence: `completed-2026-10-17.json`, `integration-2026-10-17.json`,
`module-coverage-2026-10-17.json`, and
`catalog-icons-2026-10-17-integrated.json`.

After the GM closed Foundry and explicitly authorized the rebuild, all
18 compendium packs were rebuilt with `npm run fvtt -- packs`.
Pack validation passed. A hash-verified recovery snapshot was preserved;
comparison confirms all 907 documents and every record ID survive.
Exactly 151 records changed, exclusively their `img` fields; all other
data is unchanged. Evidence: `pack-rebuild-2026-10-17.json`.
Foundry remains closed; no campaign repoint was run.

<!-- gm-remaining:start -->
## Do podpięcia — przez MG

**Pojazdy, 2026-10-28:** wszystkie czternaście podglądów pojazdów oraz porównanie wraków są częścią Garażu. Karta prób
ma Parking, przyciski Grafika czternastu pojazdów oraz Grafika: Wraki — wszystkie pojazdy. Reset odtwarza wszystkie szesnaście
scen z rozmiarami katalogowymi i stockowymi postaciami dnd5e; Parking też używa nowych grafik.
E2E `garaz-grafika` 20/20, Quench pojazdów 42/42, pełny `npm test` zielony.
Szczegóły starszych porównań skali poniżej są historyczne.

- **14 indywidualnych wraków, 2026-10-28:** zatwierdzony sedan zachowany bez zmian;
  13 nowych wraków z własnych żetonów bazowych do wspólnej oceny MG. Sonda `grafika-wraki`,
  28 pojazdów w parach sprawny/wrak na jednej scenie. Runtime wybiera grafikę po podwoziu,
  zachowuje transformację tekstury i przy cofnięciu odtwarza pełny oryginał.
  [Pliki i prompty](../art/m4/wraki/README.md). Kolejka M4: tylko 7 dźwięków.

- **Deskorolka — czternasty komplet, 2026-10-28:** portret i otwarty żeton, na życzenie MG
  powiększony do 120%: 180×216, obrys 0,6×0,72, widoczny 0,36×1,03 m. Jedno miejsce stojące,
  pełna postać nad deską. Rozmiar postaci bez zmian; jego regulacja odłożona przez MG.
  [Pliki i prompty](../art/m4/deskorolka/README.md).

- **Rower — trzynasty komplet, 2026-10-28, grafika zachowana, wielkość postaci do późniejszej regulacji:** portret 1024×1024 i żeton 180×450,
  musztardowa rama, srebrne błotniki i druciany tylny koszyk. Jedno otwarte siodło, kotwica
  50% / 31%, obrys 0,6×1,5, widoczny 0,72×2,19 m. **Grafika: Rower**, sonda `grafika-rower`.
  Zachowano 13 scen i 190 innych żetonów; rower na Parkingu zaktualizowany w miejscu.
  [Pliki i pełne prompty](../art/m4/rower/README.md). Kolejka: 6 obrazów + 7 dźwięków.

- **Motorower — dwunasty komplet, zatwierdzony przez MG 2026-10-28:** zaakceptowany kierunek
  portretu, żeton 180×468, turkusowy lakier, kremowa osłona i czerwona skrzynka. Jedno
  otwarte siodło, kierowca stale nad pojazdem. Na życzenie MG powiększony do 120%:
  obrys 0,6×1,56, widoczna sylwetka 0,86×2,25 m; rozmiar kierowcy bez zmian,
  kotwica 50% / 36%. **Grafika: Motorower**, sonda `grafika-motorower`. Zachowano 12 starych
  scen i 186 żetonów, dodano motorower na Parkingu. [Pliki i pełne prompty](../art/m4/motorower/README.md).
  Kolejka: 8 obrazów + 7 dźwięków.

- **M1A1 Abrams — jedenasty komplet, zatwierdzony przez MG 2026-10-27:** portret i para dach/wnętrze
  780×2100, osobny kadłub i wieża 638×1588, cztery miejsca. Obrys 2,6×5,6 obejmuje kadłub;
  lufa wystaje poza pole. Oś 389,884 w źródle / 319,426 w wycinku, złożenie warstw bez
  różnic pikselowych. **Grafika: M1A1 Abrams**, sonda `grafika-czolg`. Wieża podąża za
  kadłubem; niezależne celowanie po becie. Oryginalne skale postaci. Instalacja bez resetu,
  zachowano 11 starych scen i 175 innych żetonów; czołg na Parkingu podmieniony w miejscu.
  [Pliki, pełne prompty i podgląd osi](../art/m4/czolg/README.md). Kolejka: 10 obrazów + 7 dźwięków.

- **M2A2 Bradley — dziesiąty komplet, 2026-10-27:** portret i para dach/wnętrze 720×1350,
  kierowca + dwóch członków załogi w wieży + sześciu żołnierzy na ławkach przy burtach,
  twarzami do siebie. Obrys 2,4×4,5; wspólny kadłub i alfa, 0 różnic pikseli poza maską
  górnej zabudowy. **Grafika: M2 Bradley**, sonda `grafika-bwp`. Bryła i układ zatwierdzone.
  Na życzenie MG wycięto osobną wieżę 495×627 i kadłub bez wieży; złożenie daje ten sam
  żeton pikselowo. Oś 300,790 w kadłubie / 219,204 w wycinku. Wieża dziedziczy obrót,
  skalę, widoczność i drgania pojazdu; celowanie pozostaje po becie.
  [Pliki, model, referencje i pełne prompty](../art/m4/bwp/README.md). Dodany bez resetu,
  zachowano 10 wcześniejszych scen i 155 żetonów. Kolejka: 12 obrazów + 7 dźwięków.

- **Buldożer — dziewiąty komplet, 2026-10-27:** portret i otwarty żeton 750×1200, dwie
  gąsienice, szeroki lemiesz i pojedynczy zrywak. Operator i pomocnik stale widoczni nad
  odkrytymi fotelami. **Grafika: Buldożer**, sonda `grafika-buldozer`; E2E 12/12.
  [Pliki, model i pełne prompty](../art/m4/buldozer/README.md). Zatwierdzony przez MG 2026-10-27.
  Dodany bez resetu, dziewięć wcześniejszych scen i 146 żetonów zachowanych.

- **Wóz strażacki — ósmy komplet, 2026-10-27:** portret i zgodna para 600×1650, pięć miejsc
  kabiny 3+2 i stale widoczny operator działka wodnego. Węże, drabina, działko i reszta
  nadwozia wspólne pikselowo. **Grafika: Wóz strażacki**, sonda `grafika-woz-strazacki`;
  E2E 11/11, bez błędów modułu. [Pliki i pełne prompty](../art/m4/woz-strazacki/README.md).
  Po uwagach MG: krótszy obrys 2×5,5, przewężenie pompy, proporcje kabina/pompa/tył 40/15/45,
  krótsza drabina i wystające opony. Poprawiona para zatwierdzona; trzy wozy zaktualizowane bez resetu,
  środki i skale postaci zachowane, 137 pozostałych żetonów bez zmian.
  Bryła i proporcje zatwierdzone przez MG. Ostatnia poprawka usuwa koguty i skrzynkowy rant
  przodu wersji bez dachu; ten fragment również zatwierdzony 2026-10-27. Dach zachowany pikselowo.

- **Traktor — siódmy komplet, 2026-10-27:** portret i otwarty żeton 450×750, czerwony,
  z dużymi tylnymi oponami. Kierowca na centralnym siodle, pasażer na błotniku; obaj stale
  widoczni. Obrys 1,5×2,5, widoczna grafika 2,08×3,27 m. **Grafika: Traktor**, sonda
  `grafika-traktor`; E2E 10/10. [Pliki, model i prompty](../art/m4/traktor/README.md).
  Zatwierdzony przez MG 2026-10-27. Dodany bez resetu siedmiu wcześniejszych scen i 123 żetonów.

- **Autobus — szósty komplet, ukończony 2026-10-27:** portret, dach i wnętrze z kierowcą,
  20 fotelami pasażerów i wolnym tyłem. Nadwozie 2,575 m szerokości, obrys katalogowy 2×8.
  Po korekcie MG przód New Look/Fishbowl z pochyloną szybą widoczną z góry; wnętrze bez zmian pikselowych.
  Bezstratny WEBP, 0 różnic pikseli poza dachem; wspólna alfa. Poligon: **Grafika: Autobus**,
  sonda `grafika-autobus`, 21 grafik odniesienia w czterech rzędach. Quench 37/37, E2E 9/9.
  [Pliki, model i prompty](../art/m4/autobus/README.md). Zatwierdzony przez MG 2026-10-27 po korekcie szyby.

- **Buggy — piąty komplet, 2026-10-26:** portret i otwarty żeton, żółta rama, dwa fotele,
  po ocenie MG obrys 1,4×2,8 i żeton 420×840: widoczna szerokość ok. 2,06 m (wcześniej 1,47 m).
  cztery terenowe koła, silnik z tyłu. Oba pełne pionki stale nad ramą, kierowca po prawej
  stronie obrazu. Poligon: **Grafika: Buggy**, sonda `grafika-buggy`. Quench 37/37, E2E 8/8.
  [Pliki, model i prompty](../art/m4/buggy/README.md). Ocena wyglądu MG otwarta.

- **Ciężarówka — czwarty komplet, 2026-10-26:** portret, dach kabiny i wnętrze z trzema miejscami;
  otwarta drewniana paka pozostaje taka sama. Osiem pełnych postaci paki widocznych przy zamkniętej
  kabinie; kotwice 3+8 dopasowane do grafiki. Korekta v2 po uwagach MG: wnętrze przesunięte
  o 26 px; paka i reszta nadwozia poza kabiną identyczne pikselowo w bezstratnym WEBP. Poligon: **Garaż ·
  Ciężarówka — kabina i paka**, sonda `grafika-ciezarowka`. Quench 37/37, E2E 7/7.
  [Pliki, źródła i prompty](../art/m4/ciezarowka/README.md). Ocena estetyki przez MG otwarta.

- **Motocykl — trzeci komplet, 2026-10-26:** portret i otwarty żeton cruisera z sakwami.
  Dwa miejsca pokazują pełne postacie nad siodłem, bez kropek i przygaszania po najechaniu.
  Poligon: **Garaż · Motocykl — grafika i obsada**, pusty, z kierowcą i z pasażerem;
  pojazd 120%, grafiki postaci w pierwotnej skali (85% cofnięto 2026-10-26). Sonda `grafika-motocykl`.
  Quench 36/36; E2E `motocykl-art` oraz regresja `pojazd-prezentacja` zielone.
  [Pliki i prompty](../art/m4/motocykl/README.md).

- **Hammer — drugi komplet, 2026-10-25:** portret, dach i wnętrze dostarczone. Cztery koła,
  cztery fotele i centralny właz; para ma 99,62% pokrycia sylwetek. Poligon: osobna scena
  **Garaż · Hammer — grafika i wnętrze**, pojazd 120%, grafika pasażerów w pierwotnej skali.
  Podgląd dodano przez API działającego świata; przebudowę aktywnego kompendium wstrzymała
  ochrona sesji użytkowników. Szablon pobierze nowe pliki i strefy przy kolejnym `fvtt packs`.
  Quench pojazdów 31/31; sonda `grafika-hammer`. [Pliki i prompty](../art/m4/hammer/README.md).

- **Osobówka — pierwszy komplet, 2026-10-22:** MG zaakceptował portret oraz zgodność wnętrza
  z nadwoziem. Poprawiono dodatkowe koła, uwydatniono właściwe cztery i zbliżono przednie kotwice.
  Para jest podpięta w kompendium; Quench 26/26, E2E 9 kroków. Poligon ma osobną scenę
  **Garaż · Osobówka — grafika i skala**: A/C auto 100%, B/D auto 120%; postacie w pierwotnych
  skalach po cofnięciu eksperymentu 85% (2026-10-26). Każda kolumna pokazuje też grafiki BG obok.
  MG ocenia wynik w FVTT i wybiera skalę przed kolejnym pojazdem. Nie migrowano aktorów kampanii.
  [Pliki, prompty i testy](../art/m4/OSOBOWKA.md). Sondy Garażu: `grafika`, `skala-grafiki`.

- **Biegłości / umiejętności — podpięte, 2026-10-18:** 51 wierszy i sześć
  nagłówków korzysta z zatwierdzonych glifów modułu. Batch 112: Historia,
  Pojazdy i dwa nagłówki dostarczone; Akrobatyka zachowuje obecny glif zgodnie
  z wyborem MG. Batch 113: Intuicja i Zastraszanie (wybrana groźna twarz)
  dostarczone. Batch 114: wybrany obrót monety na knykciach dostarczony jako
  Zwinne dłonie i podpięty. Wszystkie osiem kart biegłości zamknięte; nie ma
  pozostałych glifów ani mapowań do dostarczenia.
  Sandbox: natywne listy wyborów i etykiety bez zmian, 57 slotów TraitFlow
  sprawdzonych w obu motywach. Poligon: Kreator → ikony-bieglosci.
  Raport i lokalne zrzuty: `PROFICIENCY_COVERAGE.md`. Świata nie zmieniano.
- **Glify — kod gotowy, 2026-10-17:** wszystkie zatwierdzone grafiki oraz
  mapowania źródłowe są dostarczone. Nie trzeba ponownie przepinać kodu
  Sztuczek, Bestiariusza, towarzyszy, trzech paliw, uzupełnienia medyka ani
  stanu Wyłączony. Szczegóły: `FINAL_HANDOFF.md`, `BROAD_COVERAGE.md`.
- **Paczki — gotowe, 2026-10-17:** na zgodę MG przebudowano wszystkie
  18 paczek przy zamkniętym Foundry. Walidacja przeszła; 907 dokumentów
  i wszystkie identyfikatory zachowane. Zmieniło się tylko 151 pól `img`.
  Raport: `pack-rebuild-2026-10-17.json`. Kopia bezpieczeństwa jest lokalna.
- **Istniejące dokumenty:** starsze przedmioty i efekty w świecie nadal
  mogą mieć dawne `img`; ich aktualizację i bezpieczne odświeżenie modułu
  wykonuje MG. Agent nie modyfikował świata ani otwartych baz paczek.
- **Starsze dźwięki produkcji (§C 1–9):** gotowe pliki są w
  `sounds/produkcja/`; pozostałe podpięcia slotów `PRACA` i `ZDARZENIA`
  w `scripts/production/oprawa.mjs` są osobnym zadaniem.
- **Malowane obrazy (§B/§E/§G/§H):** handlarze, utrzymanie, siedem obozów oraz pięć ruin
  (apteka, biuro, piwnica, sklepik, warsztat; 2026-10-20) oraz cztery stosy wraków maszyn
  (2026-10-28/29) są dostarczone. Prompty i pochodzenie nowej serii: `../art/m5/wraki/`.
  Magazyn i wrak są dostarczone od 2026-10-29: zastane PNG 1659×948 RGB były poprawne,
  brakowało końcowych WEBP 1200×400. Dowody: `dev/art/m5/delivered-2026-10-29.json`.
  Wszystkie dziewięć leżących ładunków jest dostarczonych; dalsze generacje ukończyły
  pierwszą częściową dostawę. Źródła, rzeczywiste
  prompty, pochodzenie i podgląd: [eksplozje](../art/m5/explosives/README.md).
  Poligon: Strzelnica → Karta prób → Grafika: Granaty i ładunki, sonda `grafika-granaty`.
  Packer → kontrola WEBP → oznaczenie wiersza → CREDITS: AI-generated with
  OpenAI DALL-E, hand-edited by the GM. M5 używa dokładnych nazw plików.
  Pięć ruin sprawdzono w oknie Szabrowania na sandboxie: obrazy 1200×400,
  wyświetlane w proporcji 3:1; dwa ostatnie banery także sprawdzono w oknie i na kartach gracza.
  Poligon: Złomowisko → ilustracje-ruin (bez ponownego zasiewania stacji).
  Dowody: `dev/art/m5/delivered-2026-10-20.json`; lokalny podgląd
  `dev/art/m5/out/ruiny-delivery-2026-10-20.png` i zrzut
  `logs/recording-prep/loot-banners-2026-10-20-sandbox.png`.

Kolejka glifów jest zamknięta; Batch 112 pozostaje wolny dla nowych zadań.
<!-- gm-remaining:end -->
