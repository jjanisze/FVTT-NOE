# M8 — Ruch, ekonomia akcji i pasek walki

**Handoff do implementacji, 2026-11-15.** Pełny zakres zatwierdzony przez MG. Dokument nie oznacza wdrożenia M8.
Sprawdzona baza: moduł `0.21.0`, rewizja `3ec33f0`, Foundry `14.369`, dnd5e `6.0.6`.

Ten plik zastępuje `PLAN_m8_ruch.md` i [pierwotny handoff](HANDOFF_movement_hotbar.md).
[Audyt](AUDIT_m8_action_economy.md) zawiera datowane dowody, wcześniejsze korekty i granice wykonanych prób.
[AUDIT_shared_actions.md](AUDIT_shared_actions.md) opisuje dostęp gracza do akcji w starszej wersji modułu.
W razie różnicy aktualny kontrakt określa ten plan; audyt nie przywraca wycofanej interpretacji.

Czytaj kolejno: [zakres](#scope), [rozstrzygnięcia](#rules), [transakcje](#transactions), [ataki](#attacks),
[etapy](#delivery) i [odbiór](#acceptance). Stan wdrożenia: [§13](#progress). Przy integracji konkretnej zdolności sprawdź też [inwentarz](#inventory).

<a id="scope"></a>
## 1. Zakres i definicja rezultatu

M8 obejmuje **całość** poniższego zakresu, realizowaną etapami. Ruch nie jest jedynym wymaganym rezultatem.
Potwierdzenie zakresu przez MG nie wymaga ponownego zatwierdzania każdego etapu ani osobnego głosowania nad A/I.

| Obszar | Wymagany rezultat |
| --- | --- |
| Ruch | Pozostały ruch, deklaracje Przyspieszenia/Biegania, różne Szybkości, skoki, koszty bez przesunięcia, teren, korekty i Undo. |
| Ekonomia akcji | Wspólne A/B/R/I, granty ograniczone, Zryw, grupowanie ataków, zastąpienia ataku, Pomaganie i Wyczekanie. |
| Okno ataku | Źródło ataku w istniejącym oknie Ułatwienia/Utrudnienia; poprawne domyślne wartości także przy szybkim rzucie. |
| Interfejs | Stały dostęp z karty, paleta Ruch/Więcej, sześć początkowych szablonów paska, reakcje dostępne poza turą. |
| Gotowość | Kolejność widoczna dla gracza, dwa lokalne sygnały, lokalny zegar tury bez mechanicznych kar. |
| Integracje | Obecne M7, papierowa lalka, M3, M4 i M6; migracja starych zapisów, bez podwójnego naliczania. |
| Weryfikacja | Testy reguł, rzeczywiste przepływy gracza w piaskownicy, dokumentacja i stanowisko Poligonu. |

Zasady pracy:

1. **RAW NOE jest źródłem reguł.** Cytuj drukowane strony październikowego podręcznika w `Podrecznik/NOE/`.
   Nie kopiuj rozdziałów do publicznego repo. SRD pomaga tylko w jawnie wybranych uzupełnieniach.
2. **Automatyzuj, kiedy dane wystarczają.** Gdy nie wystarczają, zapewnij zwykłą deklarację, ręczny koszt lub korektę.
   MG nie musi korzystać z Tiled, pisać makr ani przygotowywać każdego fragmentu mapy.
3. **Liczniki są pomocnicze.** Przekroczenia, niespełnione warunki i limity czasu/liczby serii ostrzegają, a nie blokują
   wykonanie. Nie zmienia to RAW ani istniejącego obchodzenia się z amunicją, zacięciem i uszkodzeniem broni.
4. **Gra słowna jest poprawna.** Brak kliknięcia nie może tworzyć kary, obowiązkowego uzupełniania historii ani
   automatycznego Unikania/Wyczekania. Licznik opisuje zarejestrowane zdarzenia, nie dowód kompletności narracji.
5. **Bez nowych obowiązkowych okien dla zwykłego ataku.** Rozbuduj istniejące okno i wspólne domyślne wartości.
6. **Jedna semantyka i jeden zapis kosztu.** Karta, makro, pasek, Region, szybki rzut i skrót zdolności używają
   tych samych reguł. Zmienianie statusu przez MG nie jest deklaracją nowej akcji.

M4 zachowuje mechanikę pojazdów, pościgów i relacji nośnika; M6 rozstrzyga wodę, wspinaczkę i upadki;
M3 zachowuje komendy i kotwice tur towarzyszy. M8 integruje ich konteksty i koszty. Nowa lalka, nowy importer map,
pełny silnik przerywania ruchu atakami okazyjnymi oraz automatyczne rozumienie deklaracji w języku naturalnym
nie należą do zakresu. Automatyka może przypomnieć o ataku okazyjnym; nie ma udawać dowodu percepcji i zamiaru.

### 1.1. Co zmienia nasz zakres względem ogólnej karty 5e

To ocena architektury na podstawie obserwowanego zachowania, nie przypisanie intencji autorom dnd5e.

| Obserwacja hosta | Wniosek dla M8 |
| --- | --- |
| Linijka progów Szybkości nie wymaga kompletnego rozliczenia akcji. | Własne deklaracje umożliwiają dokładniejszy budżet, ale M8 przejmuje koszty utrzymania historii, anulowania i korekt. |
| Ogólna karta obsługuje liczne postacie i postacie zmienione w inne stworzenia. | Ludzcy BG i lalka poprawiają dane o rękach/ekwipunku; nie eliminują specjalnych NPC, nośników i dronów. |
| Aktywność lub rzut nie zawsze odpowiada całej akcji. | Kontrolowane wejścia modułu pozwalają rozliczać więcej; grupowanie, narracja i nieznane makra nadal potrzebują jawnej proweniencji/fallbacku. |
| Region wymaga semantycznego przygotowania mapy. | Natywny preset i tymczasowa dopłata obniżają próg wejścia. Tiled pozostaje opcjonalny, a obraz nie zastępuje danych o terenie. |

<a id="rules"></a>
## 2. RAW, przyjęte interpretacje i ręczne rozstrzygnięcia

Mechaniczne uzupełnienie luki oznaczamy **WKK**, także gdy pochodzi z rozsądnego odczytania lub odniesienia do 5e.
Istniejące rozstrzygnięcie autora pozostaje osobnym dowodem. Zwykła decyzja techniczna, która nie zmienia wyniku
gry, nie jest WKK. Stare oznaczenia D/W zachowano dla ciągłości audytu, nie jako listę pytań do ponownego otwarcia.

### 2.1. Rozstrzygnięcia obowiązujące

| ID | Kontrakt | Pochodzenie |
| --- | --- | --- |
| D6 | Pozostałe/pojemność; przekroczenie daje wartość ujemną. Uprawnienie do wykonania akcji jest osobne od wcześniejszych grantów i wydatków. | Decyzja interfejsu, bez zmiany mechaniki ran. |
| D9 / W11 | Dwie drukowane gałęzie Pomagania; asysta ataku nie otrzymuje wymyślonego terminu wygaśnięcia. | NOE s. 30. |
| D10–D13 | Heurystyka grupowania, źródło w obecnym oknie rzutu, składanie kosztów i pierwszeństwo pozytywnie zweryfikowanego Nożownika wśród pasujących B. | Potwierdzony kontrakt obsługi; szczegóły §7. |
| D14 / W02 | Grant zachowuje liczbę z chwili wykonania; późniejsza zmiana efektywnej Szybkości zmienia bazę raz. | Wybrana konwencja czasowa WKK. Drukowane −4,5 m rany nie jest WKK. |
| D15 | Limity czasowe/liczbowe i niezgodność trybów serii są doradcze. | Polityka egzekwowania, nie zniesienie limitów RAW. |
| D17 / W03 | Przy zmianie rodzaju Szybkości odejmij wspólny wcześniejszy koszt ruchu; bez nowej pełnej puli. | Wybrane uzupełnienie z SRD 5.2.1 s. 188; jawna proweniencja WKK tam, gdzie NOE milczy. |
| D18 | Zwykły ruch kończy się z własną turą; nie przechodzi do reakcji i nie odświeża się z jej rozpoczęciem. | NOE s. 26; korekta wcześniejszego, wycofanego przykładu 22,5 m. |
| D19 / W07 | Podejście Berserkera liczy zapłacony koszt; konieczne obejście przeszkody jest dopuszczalne. Próg to Szybkość, nie suma grantów. | NOE s. 67 i potwierdzony odczyt MG; zamiar/percepcja pozostają deklaracją. |
| D20 | Lądowanie Gladiatora nie daje darmowego przesunięcia z zajętego pola. | Zwykłe reguły zajętego miejsca, NOE s. 27, 70. |
| D21 / W12 | Wyczekanie może być zadeklarowane słownie. Pominięcie wyzwalacza nie wydaje R i nie usuwa przygotowania. Bez zatwierdzania przez MG w UI. | NOE s. 30 i uzgodniony przepływ. |
| D22 / W13 | Można przerwać niedokończone Atakowanie inną opłaconą A i wrócić do pozostałego ataku. | Jawna interpretacja WKK. NOE s. 22 mówi o jednej czynności naraz, ale nie opisuje tej sekwencji. |
| D23 | Zryw tylko we własnej turze; przygotowanie reakcji nie omija tego warunku. | NOE s. 87. |
| D24 / W15 | Zmęczenie po Berserku zabrania A/B/I/R do końca następnej własnej tury. Ruch nie jest przez to odbierany. | Potwierdzony zakres s. 67 w związku z listą typów na s. 21. |
| D25 | Zwykłe Wyczekanie przygotowuje A wykonaną później za R, nie daje ogólnej B ani darmowego ruchu bazowego. | NOE s. 23, 26, 30; nie importuj innego wariantu Ready z D&D. |
| D26 / W16 | Przyspieszenie działa do początku następnej własnej tury, również wykonane w R. | **RAI/WKK:** MG wybrał s. 21 wobec sprzecznego „w obecnej turze” na s. 29. To nie formalna errata. |
| D27 / W17 | Ochraniacze są pancerzem dla Gołej klaty/Obłędu Berserkera; nie zabraniają samego Berserku. | Druk s. 67, istniejąca klasyfikacja autora i doprecyzowanie MG. |
| D28 | Pełny zakres tego handoffu, obejmujący także A/I i ataki, jest zatwierdzony. | MG, 2026-11-15. |
| D29 / W01 | Domyślna siatka: krok prosty/ukośny 1,5 m; wysokość przez większą składową. | Wybrana konwencja spośród wskazówek NOE s. 26; §3. |
| D30 / W06 | Ruch z wyczekanej akcji korzysta wyłącznie z nowego grantu tej reakcji. Starszych grantów nie dokładamy. | Jawna interpretacja WKK; MG wybrał 18, nie 24 m w przykładzie Biegania. |
| D31 / W03 | Grant Przyspieszenia jest przypisany do wybranego rodzaju Szybkości. Chód 9/pływanie 18, grant chodu +9, chód 6 → pływanie: pozostaje 12. | Potwierdzony wynik MG; jawne uzupełnienie WKK. Nie przedstawiaj go jako bezspornego przykładu RAW 5e. |
| D32 / W06 | Ochrona przed ostrzałem z Biegania trwa do końca własnej aktualnej tury, a przy wykonaniu w R — **do końca tej reakcji**. | Druk s. 30 + wybrana przez MG interpretacja WKK dla reakcji. Nie do końca cudzej tury. |
| D33 / W08 | Obrażenia Skoku Gladiatora: `floor(max(długość, wysokość) / 3 m)d6`, bez sumowania składowych i bez zaokrąglania w górę. | Wybrana interpretacja WKK. 4,5 m w dal i 3 m w górę → 1k6. |
| D34 / W03 | Niezależne dopłaty do ruchu sumują się. Zwykły trudny teren naliczany najwyżej raz; tej samej przyczyny nie naliczaj podwójnie. | Wybrana konwencja WKK dla zbiegu reguł; składniki mają drukowane wartości. |

Nie ma otwartego głosowania nad W01/W03/W06/W08/W15–W17. Poniższe ręczne granice są częścią projektu, nie brakującą
decyzją blokującą implementację. W14 pozostaje wycofanym pytaniem o alokację; D30 usuwa potrzebę tego wyboru w reakcji.

### 2.2. Świadomie ograniczona automatyzacja

| Przypadek | Wymagane zachowanie |
| --- | --- |
| Złożona trajektoria skoku, prześwit, zamiar podejścia, percepcja przeciwnika | MG/gracz deklaruje fakt lub wynik. Nie interpretuj grafiki i nie wymyślaj paraboli. D33 liczy obrażenia zaakceptowanego skoku, nie dowodzi jego wykonalności. |
| Skoczek | ZRC zastępuje SIŁ w maksymalnej odległości skoku w dal; wybór Akrobatyki zamiast Atletyki dotyczy testów skakania. Nie rozszerzaj automatycznie na wzór wysokości. |
| Test lądowania | Drukowane ST 10 Akrobatyki po skoku w dal na trudny teren; brak uniwersalnego obowiązkowego testu każdego skoku/wysokiego lądowania. MG może zażądać testu. |
| Nietypowa kombinacja niewystarczająco opisanych efektów lub stworzenie bez danych | Jawny ręczny profil/koszt, źródło i korekta; brak zielonego potwierdzenia legalności. |
| Pomoc narracyjna, warunek Wyczekania | Notatka/deklaracja i ręczne rozstrzygnięcie; bez analizy prozy i dopasowywania nazw. |

WKK trafi przy implementacji do `scripts/wkk/`, rejestru oraz `docs/Kobalt.md`, z testem wariantu wyłączonego.
W trybie bez przyjętego uzupełnienia nie zastępuj go inną ukrytą interpretacją: pokaż ręczne rozstrzygnięcie.
Nie wyłączaj przez to drukowanych kosztów ran, zwykłych akcji lub terenu. Nie oznaczaj jako wdrożonych reguł, które
istnieją dopiero w tym planie.

<a id="measurement"></a>
## 3. Wspólny pomiar i koszt trasy

### 3.1. Domyślna konwencja

Na kwadratowej siatce 1,5 m używamy `EQUIDISTANT`. Dla prostego odcinka:

```text
h = max(abs(dx), abs(dy))            # dwie składowe poziome, przeliczone na metry
v = abs(elevation2 - elevation1)    # różnica wysokości w metrach
d = max(h, v)
```

To metryka Czebyszewa; taksówkowa sumuje składowe. W NOE s. 26 „oś X” oznacza w tym opisie dystans w płaszczyźnie,
a „oś Y” wysokość. Nie są to nazwy technicznych osi Foundry: canvas używa x/y, wysokość to elevation.
3 m w obu kierunkach poziomych → 3 m; poziomo 4,5 i pionowo 6 → 6 m. Koszt przejścia rzeczywistej trasy jest
sumą jej odcinków, nie odległością między samym początkiem i końcem. Obejścia ściany nie skracamy tym wzorem.

Jedna metryka obowiązuje dla linijki, ruchu, zasięgu broni i walki wręcz, warunków odległości zdolności oraz
odległości skoku. **Zasięg nie zawiera dopłat terenu.** Fizyczny dystans w poniższych opisach oznacza zmierzony
dystans przed dopłatami, nie osobny pomiar euklidesowy. Dla dużych żetonów zachowaj drukowane liczenie od zajmowanych
pól; nie stosuj ślepo odległości dwóch środków. Wysokości ciała nie zgaduj; jest potrzebna osobno do dosięgania.

Nie zmieniaj istniejących ustawień sceny ani plansz pościgu po cichu. Domyślny preset stosuje powyższą konwencję;
inna siatka/skala otrzymuje jawnie oznaczony pomiar zgodny między konsumentami lub ręczną obsługę. Waliduj jednostki
przed porównaniem wartości natywnych z metrami. Korzystaj z natywnych funkcji pomiaru/konwersji.

Pułapka źródłowa: Foundry `GRID_DIAGONALS.EXACT` to ważone kroki siatki, nie zawsze `Math.hypot` całego odcinka.
`segment.euclidean` jest inną wartością. Testuj konkretny wynik, nie nazwę ustawienia.
Nie twórz niezależnego kalkulatora pikseli obok natywnego pomiaru.

### 3.2. Koszty i składanie przyczyn

| Odcinek 1,5 m | Koszt | Warunek/źródło |
| --- | --- | --- |
| Zwykły chód | 1,5 m | NOE s. 26. |
| Trudny teren | 3 m | S. 26; kilka zwykłych źródeł trudności nadal 3 m. |
| Czołganie | 3 m | Połowa Szybkości, s. 37; reprezentowana jako dopłata dystansu. |
| Pływanie bez Szybkości pływania | 3 m | Dopłata 1,5; w grząskim środowisku dopłata 3 → koszt 4,5, s. 255. |
| Wspinanie bez Szybkości wspinania | 3 m | Dopłata 1,5; w trudnych warunkach dopłata 3 → koszt 4,5, s. 257. |
| Ciągnięcie/niesienie pochwyconego | +1,5 m | Wyjątek dwóch rozmiarów większego chwytającego, s. 35. Nie dodawaj drugi raz opisu „połowa Szybkości”. |
| Czołganie + trudny teren | 4,5 m | Baza + dwie dopłaty, D34. |
| Czołganie + trudny teren + ciągnięcie | 6 m | Baza + trzy niezależne dopłaty, D34. |
| Sam skok | 1,5 m | 1:1, s. 256; grunt pod lotem nie jest trasą chodu. |
| Upadek, rzeczywisty teleport, przesunięcie celu przez innego | 0 z dobrowolnego budżetu przemieszczanego | Zachowaj osobne skutki M6/zdolności. |

Szybkość pływania/wspinania usuwa odpowiednią dopłatę, nie wszystkie przyczyny trudności. Śliska trudna wspinaczka
nie ma otrzymać dwóch opłat za ten sam śliski fragment. Niezależne utrudnienie można dodać z własnym źródłem.
Nie rozciągaj D34 na wszystkie efekty: drukowane dzielenie Szybkości, blokada zera lub jawny mnożnik Regionu
zachowują odrębne znaczenie. Nie zamieniaj ich automatycznie w dodatkową zwykłą trudność.

Zwykły preset używa **`dnd5e.difficultTerrain`**, z filtracją ignorowanych przyczyn dla aktora. Dwa natywne takie
Regiony nie robią ×4; dwa ogólne `modifyMovementCost` ×2 mogą dać ×4 i nie są równoważnym presetem.
Przy natywnym `movementAutomation = none` pokaż koszt ręczny/niepełny, zamiast pozornie zweryfikowanego zera.

<a id="movement"></a>
## 4. Budżet ruchu, granty i konteksty

### 4.1. Obliczenia

Rozdziel efektywną Szybkość, pojemność ruchu i pozostały ruch. Nie zapisuj grantu jako zwiększenia statystyki Szybkości.

```text
capacity(mode, context) = eligibleBase(mode, context) + sum(eligibleFixedGrants(mode, context)) + corrections
spent(context) = chargedPathCosts + chargedNonPathCosts
remaining = capacity - spent
```

Własna tura ma jeden wspólny wcześniejszy koszt przy zmianie trybu. Bez grantów: chód 9/pływanie 18, chód 6 →
pływanie ma 12; po przepłynięciu kolejnych 6 ma 6, a chód nie ma już dostępnego ruchu. Sam wybór wolniejszego trybu
nie jest wydatkiem ani nowym naruszeniem historycznym. Kolejny faktyczny ruch może przekroczyć pulę i ostrzega.

D31 przypisuje grant do wybranego rodzaju **Szybkości**, nie do niezależnej puli czasu. Przyspieszenie chodu +9
nie powiększa osobnej Szybkości pływania 18: po chodzie 6 nadal zostaje 12 na pływanie. Czołganie/skok oraz
wspinanie/pływanie korzystające z chodu przy braku własnej Szybkości zachowują tę bazę i odpowiedni koszt.
Nie wymyślaj nowej specjalnej Szybkości z samej możliwości wybrania trybu. Bieganie dodatkowo wymaga właściwej
lokomocji na nogach; nie finansuje latania/pływania tylko dlatego, że istnieje wspólny interfejs trybów.

### 4.2. Zmiana Szybkości po grancie

| Kolejność | Pozostałe / pojemność |
| --- | --- |
| Szybkość 9, przejście 3 | 6 / 9 |
| Następnie Przyspieszenie +9 | 15 / 18 |
| Następnie lekka rana: Szybkość −4,5 | 10,5 / 13,5 |
| Początek następnej własnej tury | 4,5 / 4,5 |
| Odwrotna kolejność: przejście 3, rana, Przyspieszenie +4,5 | 6 / 9 |

D14: aktualna baza reaguje na rzeczywistą zmianę wartości pochodnej raz; starszy grant i zapłacone koszty są stałe.
Powtarzający się hook bez zmiany danych niczego nie dodaje. Wyleczenie przywraca bazę, nie tworzy kolejnego grantu.
Blokada Szybkości 0 nadal zabrania dobrowolnego ruchu; dodatnia liczba starszego grantu jej nie omija.
Zmniejszenie limitu po legalnym ruchu może dać bieżący niedobór, ale nie zmienia dawnego ruchu w dawne naruszenie.

### 4.3. Czas życia i reakcje ruchowe

| Źródło | Dostęp i koniec |
| --- | --- |
| Zwykła baza | Tylko własna tura; nie bankuje się poza nią. |
| Przyspieszenie | Stały grant do początku następnej własnej tury, D26 RAI/WKK; przypisany do wybranej Szybkości. |
| Bieganie | +2× efektywna Szybkość i Utrudnienie własnych ataków do początku następnej własnej tury, s. 30. |
| Ochrona dystansowa Biegania | Do końca bieżącej własnej tury albo do końca wykonującej je reakcji, D32 WKK. |
| Odstąpienie | Do końca bieżącej własnej tury, s. 30; nie ujednolicaj do początku następnej. |
| Roszada / Szaleńcza szarża | Własne drukowane terminy; niezależne źródła, nie przedłużenie zwykłego Biegania. |

Wyczekane Przyspieszenie/Bieganie tworzy grant **przy wykonaniu**, nie przy przygotowaniu. Przy Szybkości 9 daje
odpowiednio 9/18 m; gdy przed wykonaniem rana zmieniła ją na 4,5 — 4,5/9 m. R płatna raz, bez kolejnej A,
bez starego zwykłego 4,5 m i bez świeżej bazowej 9 m. D30 ogranicza tę reakcję do jej nowego grantu: nie dodajemy
resztek wcześniejszego Przyspieszenia/Biegania. Nie ma przez to potrzeby wybierania kolejności zużywania starych pul.

Wygaśnięcie i uprawnienie są odrębne. Dłuższy termin grantu nie pozwala chodzić między turami. Przy next-own-start
wygaszaj stare granty przed projekcją nowej bazy; nie sumuj przejściowo starego grantu z nową turą.
Stan nadwyżki/archiwum nie jest długiem przenoszonym jako kara na następną turę.

**Koniec reakcji musi być zdarzeniem M8.** Utrzymuj `reactionExecutionId` i rozróżniaj przygotowanie, wykonanie
oraz zakończenie. `postUseActivity` przed późniejszym ruchem nie dowodzi końca reakcji. Zagnieżdżona reakcja
przeciwnika nie kończy nadrzędnego ruchu. Standardowa kompletna trasa z waypointami kończy wykonanie automatycznie;
obsługa ruchu podzielonego/przerwanego zachowuje to samo ID i daje prosty `Zakończ reakcję`/korektę, bez kolejnej R.
Jeżeli koniec został rozstrzygnięty narracyjnie, można oznaczyć go ręcznie. Nie utrzymuj nieoznaczonej ochrony aż
do końca cudzej tury; przy nierozstrzygniętym kontekście pokaż, że wymaga on zakończenia/korekty.
W silniku okoliczności dodaj osobny dowód aktywnej ochrony reakcyjnej. Nie ustawiaj globalnie `turaCelu = true`,
aby wymusić tę korzyść; zmieniłoby to również inne warunki. Stan nieznany wymaga rozstrzygnięcia, zamiast
przyznawać bezterminowy automatyczny bonus. Zakończenie ochrony nie usuwa dłuższego własnego Utrudnienia.

### 4.4. Operacje niebędące zwykłym odcinkiem

Padnij: własna tura i niezerowa Szybkość, koszt aktualnej nieujemnej reszty. Nie zmienia faktu wcześniejszego ruchu
i nie konsumuje przyszłych grantów. Powstań kosztuje połowę aktualnej Szybkości; Sztuczka Padnij/Powstań daje 0.
Nadal powalona postać nie może legalnie Przyspieszyć/Biegać; po darmowym wstaniu może użyć nowego grantu.
Powalenie od ataku nie jest dobrowolnym Padnij, a administracyjne usunięcie stanu nie jest płatnym Powstań.

Wsiadanie/zsiadanie i transfer pobierają rzeczywisty koszt z M4, bez powtórnego liczenia. Zwykły przykład jazdy
wierzchem na s. 257 kosztuje 4,5 przy Szybkości 9: nie importuj automatycznie zaokrąglania z reguł pojazdów.
Osobisty koszt jeźdźca nie jest ruchem wierzchowca. Pasażer podążający za nośnikiem nie wydaje ruchu.

### 4.5. Skok

Jeden kalkulator służy palecie, makrom, Regionom i testom:

- Skok w dal: `SIŁ × 0,30 m`, po bezpośrednim rozbiegu co najmniej 3 m; z miejsca połowa.
- Wzwyż: `(2 + mod. SIŁ) × 0,30 m`, z analogicznym rozbiegiem/połową. Dosięganie dodaje 1,5× znany wzrost.
- Koszt skoku 1:1 plus osobno rzeczywiście wykonany rozbieg. Więcej ruchu nie zwiększa maksimum skoku.
- Rozbieg wynika z dystansu, nie kosztu trudnego terenu. Uwzględnia kilka dragów i poprawkę brakującej historii.
  Nie wymagaj dodatkowo prostej linii, osi mapy ani liczby kafelków: tego nie drukuje NOE.
- Maksimum 4,2 nie staje się 4,5 przez snapping. Na nowych mapach zalecamy rutynowe przeskoki po osiach i przerwy
  co 1,5 m, ale nie uzależniamy M8 od tej konwencji. Liczy się luka/wybicie/lądowanie, nie zawsze cały drag środka.
- Skoczek, aktywny Gladiator i wyjątki istot zmieniają właściwe parametry. Nie używaj natywnego `STR / 2` jako NOE.
- Test lądowania i niepewna geometria działają według §2.2. Upadek z krawędzi nie staje się automatycznie wysokością
  skoku do obrażeń Gladiatora; M6 zachowuje rozstrzygnięcie upadku.

Skok Gladiatora wymaga zdolności i Berserku; podwaja wysokość i odległość. Cel najwyżej o jeden rozmiar większy
wykonuje RO SIŁ ST `8 + mod. SIŁ + PB`; porażka daje Powalenie i obrażenia D33. 2,9 m → 0k6, 3 → 1k6,
4,5 poziomo/3 pionowo → 1k6, 6 → 2k6. Brak kości obrażeń nie usuwa drukowanej konsekwencji Powalenia.
Sam skok/RO celu nie wydaje A/B/R ani slotu Atakowania. Brak wymyślonego limitu raz na turę.
Zajęte pole nie daje darmowego ustawienia obok; obowiązują drukowane konsekwencje i późniejszy płatny ruch.

Zastąp domyślną ścieżkę Regionu `skok` wspólnym kalkulatorem. `ST_ZA_BRAK` 10/15, dodatkowy zasięg za test,
arbitralny margines porażki i darmowa relokacja nie mają potwierdzenia RAW: usuń je z domyślnej obsługi.
Rzeczywisty skok transportowany przez `teleportToken` nadal kosztuje raz. Rzeczywisty teleport kosztuje 0.
Nie usuwaj geometrii Regionów ani flag importera podczas migracji.

### 4.6. Pozostałe ograniczenia RAW

NOE s. 27 określa przechodzenie przez zajęte pola, wyjątki sojuszników/Nieprzytomności/rozmiaru, trudność,
zakaz dobrowolnego kończenia ruchu w cudzym miejscu i konsekwencje końca tury. Nie kopiuj domyślnej edycji dnd5e
bez sprawdzenia tych wyjątków. Reakcja ruchowa nie otrzymuje automatycznej ochrony przed atakami okazyjnymi.
Przerażenie zabrania dobrowolnego podejścia do źródła; nieznane źródło wymaga deklaracji.
Obezwładnienie nie jest samo w sobie uniwersalną Szybkością 0. Dla latania/upadku stosuj NOE s. 253, 259 i tekst
istoty, bez ogólnego importowania wyjątku hover. Zachowaj źródła Niewidoczności i kryteria końca Ukrywania się,
kierunek patrzenia s. 39 oraz widoczność; ruch nie deklaruje automatycznie Ukrywania się.
Podróż i dzienny marsz pozostają M5, nie przeliczaj Biegania z sześciu sekund na dzień marszu.

<a id="transactions"></a>
## 5. Jeden zapis zasobów i transakcje

### 5.1. Model i odpowiedzialność

Rozszerz `game.neuroshima.actions`; nie twórz konkurencyjnego rejestru obok M7. Zachowaj kompatybilność
`zadeklaruj`, `dodatkowa`, `znacznik`. Znaczniki B/R/HUD stają się projekcją lub zgodnym wejściem, nie drugą prawdą.
Obecne `postUseActivity` po zużyciu przedmiotu nie jest uniwersalnym punktem zatwierdzenia próby.

Minimalny kontrakt danych, bez wymogu tych konkretnych nazw plików:

| Dane | Wymagane pola/znaczenie |
| --- | --- |
| Kontekst | Wersja, combat UUID, aktor/syntetyczny aktor, token/combatant, unikalne wystąpienie tury, rewizja. Indeks rundy/tury nie wystarcza przy cofaniu i zmianie kolejności. |
| Operacja | Stabilne ID, rodzic/komponent, płatnik, źródło zdolności, stan przygotowana/wykonana/zakończona/skorygowana, migawka ostrzeżeń. |
| Grant | Rodzaj zasobu, liczba z chwili wykonania, dozwolone zastosowania/rodzaj Szybkości, źródło, termin, kontekst reakcji jeśli dotyczy. |
| Wydatek | Wektor A/B/R/I, instancja Atakowania/slot, koszt ruchu, ID natywnego ruchu/kontynuacji, zapłacone komponenty. |
| Skutki | Odrębne referencje zużycia przedmiotu, efektu, rzutu i wiadomości; etap wykonania każdego z nich. |
| Korekta | Kogo/co poprawiono, przyczyna i odwołanie do zdarzenia; nie kasuje dowodów innej operacji. |

Na klientach licz podgląd bez zapisu. Płatnik wynika z operacji, nie z aktualnie zaznaczonego celu; niejednoznaczny
aktor otrzymuje wybór lub ścieżkę ręczną. Nie używaj samej nazwy, ikony lub klasy jako dowodu posiadania zdolności.
Syntetyczne i połączone aktory oraz kilka tokenów jednego aktora wymagają jawnego przypisania do kontekstu.

Jeden wykonawca zapisuje dany ledger po kolei, ze stabilnym ID żądania i deduplikacją. Preferuj aktywnego MG;
bez niego wybierz deterministycznego uprawnionego właściciela albo pokaż oczekujące rozliczenie ręczne, gdy
nie da się bezpiecznie ustalić wykonawcy. Przejęcie roli nie może odtworzyć wydatków ani utworzyć drugiego lidera.
Waliduj rzeczywistego nadawcę i uprawnienia po stronie wykonawcy. Nie ufaj samemu `by`/UUID z ładunku.
Obecna kolejka M7 jest lokalna dla klienta, więc nie dowodzi odporności na równoczesny zapis dwóch klientów.

Zapis stanu i projekcje mają skończony, kontrolowany rozmiar. Zachowaj aktywne konteksty, potrzebne archiwum Undo
i niedokończone transakcje; nie zapisuj podglądu segmentu, każdego ticka zegara ani nieograniczonego logu hoverów.

### 5.2. Kolejność wykonania

```text
wybór/podgląd → końcowa konfiguracja → ponowna walidacja → rezerwacja/zapis próby → rzut/operacja → skutki → wynik
```

Anulowanie przed faktyczną próbą nie kosztuje. Porażka wykonanej próby nie jest anulowaniem. Kontekst konfiguracji
jest tymczasowy: zmiana A/B nie zmienia jeszcze aktora. Powtórny render i dostarczenie tej samej komendy niczego
nie wydają. Nowa intencjonalna próba ma nowe ID, nawet gdy przekracza limit.

Nie ma natywnej atomowej transakcji obejmującej aktora, token, przedmiot, efekt i czat. Zapisuj wykonane etapy.
Brak potwierdzenia zapisu nie dowodzi porażki; pytaj/ponawiaj to samo ID w pierwotnym kontekście. Opóźnione
potwierdzenie nie obciąża tury, która akurat trwa później. Błąd czatu nie odtwarza ataku i nie refunduje amunicji.
Oczekiwanie na wykonawcę jest ograniczone; po nim wykonanie działa z widocznym oczekującym/ręcznym rozliczeniem.
Brak MG/łączności nie staje się nową mechaniczną blokadą rzutu.

Natywne A/B/R nie mają ogólnego licznika zużycia w `activityActivationTypes`; nie myl z liczonymi zasobami
legendary/mythic. Zużycie aktywności/przedmiotu i debet M8 są różnymi odpowiedzialnościami.
Jeśli natywny przepływ zużył zasób przed późniejszym anulowanym oknem, przeorganizuj go lub zwróć dokładne
zarejestrowane delty. Sam zwrot A/B nie naprawia zużycia przedmiotu. Osobne faktycznie wykonane dobycie/aim nie
jest refundowane z powodu anulowania późniejszego ataku.

### 5.3. Ruch, Undo i cofanie inicjatywy

Natywne `movementHistory` i ID ruchu są dowodem kosztu. `recordToken` uruchamia się także przy wyczyszczeniu historii;
Foundry czyści historie **wszystkich** kombatantów na początku każdej tury. Nie odświeżaj dlatego wszystkim budżetu.
Archiwizuj potrzebne koszty i rozpoznawaj passed/pending/continuation, aby naliczać tylko zakończone odcinki raz.
`preMoveToken` jest synchroniczny: nie oczekuj w nim na dialog; przy polityce doradczej nie przerywaj dragu.

Natywne Undo ruchu przywraca pozycję i historię, więc M8 uzgadnia odpowiadający koszt w oryginalnym kontekście.
Nie cofa przy tym niezależnej B ani deklaracji Przyspieszenia. Ruch tokenu z powrotem nie jest sam w sobie Undo.
Ledgerowe aktualizacje nie tworzą kolejnych wpisów canvas Undo. Nie obiecuj Ctrl+Z całego ataku, trafienia,
amunicji, stanów i skutków. Fuks/reroll jest rewizją próby, nie zwrotem zasobu.

Zmiana kolejności i administracyjne cofnięcie tury nie tworzą darmowych nowych grantów. Przywracaj rozpoznany
kontekst lub udostępniaj jawną korektę, zamiast traktować powtórzony indeks jako nową turę. Efekty nadal aktywne
według własnego terminu nie giną z archiwizacją zwykłego ruchu.

<a id="actions"></a>
## 6. A/B/R/I, Pomaganie i Wyczekanie

### 6.1. Liczniki i uprawnienia

Zwykłe pule startują A/B/R/I `1/1`; wydanie A daje `0/1`, dodatkowa A bez grantu `−1/1` i ostrzeżenie.
R odzyskuje się na początku następnej własnej tury; musi pozostać osiągalna poza turą. Dodatkowy przedmiot po
wykorzystaniu darmowej I wymaga Używania [A], zamiast automatycznej drugiej darmowej I (NOE s. 25, 31, 37).
Wcześniej wykonane i niewykonane akcje pozostają rozróżnialne po wyleczeniu rany lub zmianie uprawnienia.

Rana/zabronienie akcji nie jest wydaniem zasobu. Poważne/Znaczące Zranienie stosuje własne zakazy B/R; status
nie kasuje legalnej historii. Zmęczenie po Berserku zakazuje wszystkich A/B/I/R do końca następnej własnej tury,
także po odświeżeniu liczników. Zryw nie znosi zakazu. Nie ustawiaj przez to Szybkości 0, nie odbieraj mowy,
nie nakładaj całego Obezwładnienia ani nie kończ tury automatycznie.

Niedostępna pula ma czytelną przyczynę i zachowany w szczegółach stan grantów/wydatków; samo późniejsze
ograniczenie nie staje się ostrzeżeniem o dawnym przekroczeniu. Wykonana mimo ostrzeżenia nowa próba zapisuje
własne naruszenie uprawnienia i koszt. Wygląd blokady jest projekcją, a nie odejmowaniem zasobu poniżej zera.

Zmęczenie licz od rzeczywistego końca Berserku: naturalnego lub drukowanego przerwania, do właściwego
next-own-end. Administracyjna korekta i późne sprzątanie po odpoczynku nie tworzą świeżej kary za dawny koniec.
Sprawdź również drukowane zakończenie 10 rund na końcu ostatniej własnej tury — sama `duration.remaining` tego
nie dowodzi. Obecna karta końca nie jest wdrożoną czasową blokadą uprawnień.

### 6.2. Zryw i akcje ograniczone

Zryw (s. 87): we własnej turze wybierz **jedną A albo B**; zużyj jedno użycie odnawiane KO/DO i dodaj jeden
grant. Sama zdolność nie wydaje A/B. Sekwencja A `0/1` → Zryw A `1/2` → druga A `0/2` jest poprawna.
Wybór następuje przed zużyciem; zamknięcie nie wybiera domyślnie A i niczego nie wydaje. Ponowienie tego samego ID
nie dodaje kolejnego grantu. Nie twórz I/R/ruchu ani nie aktywuj Zrywu automatycznie na podstawie nadmiarowych ataków.

Szybkie ręce (Spec 4, s. 79) dają dodatkową A **wyłącznie do Używania**, z własną liczbą użyć równą mod. ZRC
i odnowieniem KO; bez wymyślonego minimum 1. Zapisuj ograniczenie, nie tylko sumę A. Multiklasa może mieć
podstawową A + Zryw A + ograniczoną A: trzy A, ale tylko dwie do Atakowania. Trzecia akcja Atakowania ostrzega,
nawet gdy suma wygląda `0/3`. Właściwy ograniczony grant zostaje niewykorzystany. Zryw B nie daje jednocześnie A.

Dobywanie/chowanie zwykłej broni jest I; dodatkowa interakcja kosztuje A. Kliknięcie schowanej broni zachowuje
istniejące „dobądź i zatrzymaj się”. Plecak, pancerze, tarcze i wyjątki Pakowania/darmowego/podwójnego dobycia
biorą koszt z `doll-model.mjs`, nie z nowej heurystyki. Zapisuj koszt dopiero wykonanego przeniesienia przedmiotu.

### 6.3. Pomaganie

| Gałąź | Wykonanie i koszt | Skutek i koniec |
| --- | --- | --- |
| Umiejętność/narzędzie | A za próbę; wybierz jedną biegłość i sojusznika, test ST 10. MG ocenia możliwość pomocy. | Po sukcesie Ułatwienie następnego zgodnego testu sojusznika; koniec najpóźniej z początkiem następnej tury pomagającego. |
| Atak | A; wróg do 1,5 m od pomagającego i wskazany sojusznik; bez obowiązkowego testu pomocnika. | Ułatwienie następnego ataku tego sojusznika na tego wroga. Brak drukowanego czasowego wygaśnięcia. |
| Pomoc narracyjna | Słowna deklaracja, notatka, ręczny tryb rzutu/rozstrzygnięcie. | Brak analizy prozy, automatycznego testu lub kary krytycznej porażki wymyślonej przez moduł. |

Porażka pomocnika nadal zużywa A, ale nie daje grantu. Niepowiązany rzut lub inny cel nie konsumuje pomocy.
Zgodna faktyczna próba konsumuje ją nawet wtedy, gdy inne Utrudnienie znosi Ułatwienie; nie czekaj na „korzystny”
wynik. Otwarcie/anulowanie okna nie konsumuje pomocy. Fuks pozostaje tą samą próbą — bez ponownego grantu/debetu.

### 6.4. Wyczekanie

```text
przygotuj we własnej turze: A → deklaracja/notatka
pomiń okazję: brak wydatku R, przygotowanie pozostaje
wykonaj odpowiedź: R zamiast następnej A, koszty przedmiotu dopiero teraz
początek własnej tury: niewykorzystane przygotowanie wygasa, bez zwrotu A
```

Przycisk Wyczekanie może zapisać A i ogólny znacznik, bez obowiązkowego edytora warunku/payloadu. Link do
preferowanej czynności i notatka są opcjonalne. Gracz decyduje o R; MG rozstrzyga deklarację słownie. Nie ma
analizy wyzwalacza ani kliknięcia zatwierdzającego przez MG. Zaprogramowana akcja nie jest wykonywana przy przygotowaniu.

`Reaguj` może uzbroić kontekst dla następnej obsługiwanej operacji albo zapisać już wykonaną narracyjnie R.
Samo uzbrojenie nie wydaje R. Można też zaatakować bezpośrednio poza turą; nowy zwykły atak domyślnie używa R,
bez wymaganego wcześniejszego przycisku i bez zapisanej strukturalnej deklaracji. Nie dopisuj wstecz A tylko
dlatego, że wcześniejsze Wyczekanie było słowne. Nie oznaczaj każdego takiego ataku jako Atak Okazyjny.

Anulowanie przed wykonaniem nie wydaje R; nieudany wykonany atak/test ją wydaje. R już wykorzystana lub
zakazana nie odświeża się przez Wyczekanie: kolejna jawna próba działa z ostrzeżeniem i debetem. Brak/delecja
przedmiotu jest problemem technicznym wymagającym wyboru/ręcznego rozwiązania, a nie nowym budżetem.

Osobne przygotowania z rzeczywiście opłaconych A zachowaj, zamiast nadpisywać. Dają wybór odpowiedzi, ale dzielą
jedną R. Dwa przygotowania nie łączą Ataku i granatu w jedną dwuczynnościową R. Zryw poza własną turą nie jest
dozwolony. Własnoturowy wyzwalacz oceniaj według rzeczywistego czasu; nie zakładaj, że każda R to cudza tura.
Drugi/Trzeci atak ma drukowany warunek własnej tury: nie dopisuj tych ataków do zwykłej odpowiedzi poza turą.
Ruch wyczekany działa według §4.3. Zwykłe Wyczekanie nie zamienia zdolności wyłącznie B w dowolną akcję R.

### 6.5. Niewidoczna narracja

Przy niezarejestrowanym Pomaganiu/ataku/makrze A może nadal pokazywać 1/1. Koniec tury nie wymaga uzgodnienia
i niczego z tego nie przyznaje. Użytkownik może później poprawić klasyfikację lub koszt. Obsługiwane przepływy
korzystają z tego, co wiadomo; brak dowodu nie jest dowodem, że bohater nie działał lub nie trafił.
M3 zachowuje swoje drukowane zachowanie bez komendy — nie wnioskuj o komendzie z samego pozostałego B.

<a id="attacks"></a>
## 7. Ataki: źródło, grupowanie i zatwierdzenie

### 7.1. Instancje Atakowania

Instancja Atakowania kosztuje jedną A i zawiera faktyczną zdolność: zwykle 1, Drugi atak 2, Trzeci atak 3.
Drugi z dwóch klas nie sumuje się, Drugi+Trzeci nie daje pięciu (s. 59). Wieloatak istoty może mieć ograniczoną
sekwencję, więc nie traktuj każdego jako nieograniczonego ludzkiego Drugi atak.

Kolejność klasyfikacji:

1. Rewizja/Fuks, obrażenia, duplikat i anulowanie: brak nowego slotu/kosztu próby.
2. Jawne źródło B/R/akcji złożonej: własny koszt, bez slotu zwykłej A.
3. Znany tryb całej akcji, np. standardowa KS: A poza zwykłymi slotami, chyba że posiadana zdolność jawnie
   stanowi wyjątek (np. Grad ołowiu). Zastąpienie ataku zajmuje slot także bez rzutu atakującego.
4. Pozostały zwykły atak we własnej turze kontynuuje kwalifikującą otwartą instancję. Po wyczerpaniu rozpoczyna
   nową A, także z ujemnym licznikiem. Nie tworzy grantu ani automatycznie Zrywu.

Ruch, pudło, zmiana celu lub broni nie zamykają instancji. D22 dopuszcza Atak 1/2 → druga opłacona A na
Pomaganie → Atak 2/2. Wybieraj najnowszą pasującą otwartą instancję, z możliwością jawnego rozpoczęcia nowej.
Zryw A daje drugie Atakowanie z osobnymi slotami; cztery zwykłe ataki z Drugi atak to dwie A, nie cztery.
Sloty nie przechodzą do następnej tury. Heurystyka pomaga rozliczać, nie daje efektu zdolności z samej klasyfikacji.

Przykład bez rzutu ataku: Wytrącenie (s. 252) zastępuje pierwszy atak; **cel** wykonuje RO SIŁ/ZRC. Następny
cios toporem zajmuje drugi slot. Trzeci cios wymaga nowej A. Przegrane Wytrącenie nadal było próbą.
Standardowa KS bez Gradu → zwykły atak to dwie A; z właściwym Gradem dozwolona KS może zajmować zwykły slot.
Tę wiedzę dostarcza serwis trybu ognia; nie odgaduj jej z liczby wiadomości i samych rzutów k20.

Nieoznaczony atak B może zostać omyłkowo zaliczony do A i spowodować późniejszy fałszywy alarm; świadomie osobne
A mogą zostać zbyt oszczędnie połączone. Zapewnij tanią korektę instancji/źródła. Nie próbuj odtworzyć całej narracji.

### 7.2. Wybór w obecnym oknie rzutu

Pole źródła/`Sposób ataku` oferuje tylko właściwe możliwości: kontynuację A, nową A, nazwane źródła B oraz
kontekstowe R. Nazwa UI może zostać dopracowana przy implementacji; semantyka jest stała.
Okno zna aktora, przedmiot, aktywność, stan i opcjonalne cele. Najpierw wybrana broń/rodzaj ataku, potem źródła.

Domyślne wartości, wspólne dla pełnego i szybkiego rzutu:

1. Zachowaj jawny zamiar skrótu lub kontekst R, także gdy wymaga ostrzeżenia.
2. Kontynuuj legalną otwartą A z pozostałym slotem, nawet gdy licznik A wynosi 0/1.
3. Rozpocznij nową dostępną **nieograniczoną** A.
4. Gdy nie ma takiej A/slotu, wybierz właściwe legalne B, uwzględniając **cały** koszt z modyfikatorami.
   Wśród jednocześnie zweryfikowanych Promocji i Nożownika preferuj Nożownika. Nie sortuj innych zdolności po nazwie.
5. Gdy nie ma legalnego źródła B, zwykła nowa A z ostrzeżeniem. Nie podstawiaj niedozwolonego B, aby ukryć przekroczenie.

Brak posiadanej zdolności oznacza brak jej opcji. Posiadana zdolność pasująca do rodzaju ataku pozostaje wybieralna
przy niespełnionym/niezweryfikowanym warunku, z konkretnym ostrzeżeniem w oknie **i wyniku**. Przykład: Promocja
poza Berserkiem jest jawnym wyborem z ostrzeżeniem. Promocja nie daje B strzału z karabinu: to źródło ataku wręcz.
Brak Promocji nie usuwa innych drukowanych B, np. walki dwiema różnymi lekkimi broniami (s. 117), Karateki,
Ulubionej broni lub Nożownika. Każda zachowuje własne warunki i mechanikę.

### 7.3. Nożownik

Warunek: posiadana Sztuczka, wcześniejsze trafienie nożem we własnej turze i kolejny atak nożem tego samego
wroga za B (s. 105). Nie wymagaj identycznego egzemplarza noża. Wspólna obsługa obejmuje dotychczasowy przycisk
na karcie trafienia i zwykłe wejście z broni.

| Dowód | Obsługa |
| --- | --- |
| Pasujący cel i zapis trafienia | Zweryfikowane źródło B z obrażeniami krytycznymi po trafieniu; może być automatycznym wyborem. |
| Brak celu tokenowego | Wybieralne, ostrzeżenie o braku możliwości sprawdzenia i wskazówka celowania. Nie twórz celu ani trafienia. |
| Cel jest, brak zapisu trafienia | Wybieralne, ostrzeżenie o braku dowodu; nie twierdź, że narracyjne trafienie na pewno nie nastąpiło. |
| Znany sprzeczny cel/czas | Wybieralne z konkretnym ostrzeżeniem naruszenia. Bez automatycznej preferencji. |

Cel to `game.user.targets`, nie token kontrolowany. Pokazuj faktyczne przypisanie klawisza `core.target` przez
`game.keybindings.get`/natywny formatter, nie wpisane na stałe T. Żądanie niesie intencję i UUID-y pierwotnego
gracza; klient MG nie podstawia własnego zaznaczenia.

Jawnie wybrany bezcelowy Nożownik ma kontekst obrażeń krytycznych powiązany z **tą próbą**, także przy ręcznie
rozstrzygniętym trafieniu. Nie daje automatycznego trafienia, ofiary do aplikacji obrażeń ani wildcard efektu na
niepowiązany następny atak. Pudło nie zadaje obrażeń, Fuks używa tego samego kontekstu. Wielu źródeł krytyka nie
mnożymy wielokrotnie. Zmiana źródła przed zatwierdzeniem usuwa jego tymczasowe efekty, nie inne wybory.
Obecne wymaganie zgodności celu w `zapowiedzPasuje` nie realizuje samo tego bezcelowego wariantu.

### 7.4. Niezależne opcje i łączny koszt

Źródło ataku i dodatki, np. Przycelowanie, są niezależnymi składowymi. Nie spłaszczaj ich w jedno wzajemnie
wykluczające menu. Mogą ujawniać właściwe dodatkowe pola bez nowego obowiązkowego dialogu.

| Nowa operacja | Nowy koszt |
| --- | --- |
| Nowe Atakowanie A + nowe Przycelowanie B | A 1 + B 1. |
| Kontynuacja Atakowania + nowe Przycelowanie | Jeden istniejący slot + B 1. |
| Nożownik + nowe Przycelowanie | B 2; Zryw B może dać właściwe dwie B. |
| Promocja + nowe Przycelowanie | B 2, z mechaniką Promocji, bez efektu Nożownika. |
| Źródło ataku + już opłacone, pasujące Przycelowanie | Tylko nowy koszt źródła; dołącz ID istniejącej deklaracji celowania. |

Zmiana Nożownika na A zachowuje wybrane celowanie. Dwie B przy dostępnej jednej nadal wykonują się
z ostrzeżeniem; nie usuwaj dodatku ani nie wydawaj za niego arbitralnie A. B poszczególnych zdolności nie stają
się zamienne z A tylko dlatego, że istnieje złożony koszt A+B.
Końcowa wiadomość pokazuje prawdziwe koszty i oznacza dołączone wcześniej opłacone komponenty, bez drugiego debetu.

### 7.5. Wymagana migracja punktów zatwierdzenia

Natywne `AttackActivity.rollAttack` oczekuje kolejno na `buildConfigure`, a potem `buildEvaluate`.
Hooki `buildAttackRollConfig`/`postAttackRollConfiguration` są synchroniczne; Promise zwrócony przez listener
nie zatrzymuje pipeline. Przenoś nimi synchroniczny kontekst; nie zatwierdzaj kosztu przez nieoczekiwany async hook.
Zaimplementuj wąski, oczekiwany adapter dla zarządzanej próby po końcowej konfiguracji, przed oceną rzutu;
nie kopiuj całej metody systemu. Potwierdź ten punkt w E0/E6, także przy anulowaniu przez inny końcowy hook.
Pusta/anulowana tablica rzutów nie jest próbą. Manewry bez rzutu ataku mają własny oczekiwany punkt wykonania.

Refaktoryzacja musi objąć jednocześnie:

- `zdolnosci-akcje.mjs::dodatkowyAtak`, który dziś obciąża B przed otwarciem broni, i natywny adapter B/R M7;
- dotychczasowy twardy warunek Promocji przed oknem — ma być zgodny z wyborem warunkowym i ostrzeżeniem;
- Przycelowanie nowe kontra wcześniej opłacone oraz aktualne efekty intencji krytyka;
- manewry, właściwe aktywności serii, skróty i bezpośredni/szybki rzut;
- `lastBurstUse` dziś zapisane na przedmiocie: historia limitów musi należeć do aktora/rundy, także po zmianie broni;
- zapis korzenia/rewizji Fuksu: nowy wynik nie wydaje A/B/R/I, nie zajmuje slotu i nie dubluje efektów.

Najpierw wspólny model źródła/kosztu/skutków i stabilne ID, następnie migracja wejść, potem usunięcie starych
writerów. Nie zostawiaj starego i nowego listenera naliczającego ten sam koszt. Status Berserku, cele, broń,
budżet i wystąpienie tury ponownie sprawdzaj przy zatwierdzeniu. Zachowaj wybór gracza, dołącz nowy powód
ostrzeżenia i zamroź go w wyniku. Późniejsze włączenie Berserku nie usuwa ostrzeżenia z dawnej Promocji.
Rewizja wcześniejszego trafienia aktualizuje dostępne dowody kolejnych wyborów, ale nie refunduje automatycznie
już wykonanych zależnych operacji. Usunięcie czatu nie zwraca akcji.
Oryginalna wiadomość pokazuje koszt wykonanej akcji; osobna wiadomość Fuksu/przerzutu wskazuje rewizję i nie
otrzymuje nowej plakietki A/B/R/I. Nie przedstawiaj rzutu obrażeń jako następnego wydania akcji.

<a id="interface"></a>
## 8. Interfejs, teren i gotowość do tury

### 8.1. Dostęp i linijka

Na karcie stale dostępne: pozostały ruch przy Szybkości, `Ruch`, podstawowe akcje i reakcje. Pusta makrolista nie
odbiera żadnej operacji. Paleta Ruch zawiera tryby, skok, Padnij/Powstań, Przyspieszenie/Bieganie A oraz właściwe
warianty posiadanych zdolności B. Otwarcie palety i wybór trybu niczego nie wydają.

Linijka pokazuje dystans, płatny koszt i pozostały zadeklarowany budżet. Zielony oznacza zmieszczenie w znanej
puli, czerwony przekroczenie. Bez żółtej obietnicy niezadeklarowanego Przyspieszenia. Ostrzeżenie pozostaje
po wykonaniu i oferuje deklarację/korektę; nie skracaj trasy, nie deklaruj akcji automatycznie, nie pytaj co pole.
Wartości tekstowe i ikony uzupełniają kolory. Częściowo ręczny koszt lub nieznane warunki mają widoczną etykietę.
Nie rozlewaj stylów ruchu postaci na pojazdy, plansze pościgu lub wolne mierzenie z pustego miejsca.

`Zapisz koszt`, `Zadeklaruj akcję`, `Skoryguj` i wybór kontekstu są normalnymi funkcjami, nie edycją flag.
Eksploracja pokazuje możliwości/kalkulatory, bez wymyślonego sześciusekundowego budżetu poza walką.
Klawiatura, waypointy, wąska karta i wybór wielu tokenów muszą działać bez ryzyka obciążenia złego aktora.

### 8.2. Teren bez Tiled

| Przygotowanie | Obsługa |
| --- | --- |
| Tylko obraz mapy | Zwykły pomiar, tymczasowe oznaczenie trudnego odcinka lub ręczna dopłata. Obraz nie daje semantyki terenu. |
| Natywny Region | Prostokąt/poligon i preset `Trudny teren`; opcjonalna przyczyna: schody, stok, mokradło, piasek, śnieg/lód, gruz, inne. |
| Specjalistyczny Region | Woda/wspinaczka/skok i istniejąca karta M6; ręczna operacja pozostaje dostępna bez Regionu. |
| Tiled | Ta sama semantyka wykonania, z istniejącym pochodzeniem importu i zachowaniem ręcznych Regionów. |

Konwersja zwykłych Drawingów nie jest wymaganiem. Nie identyfikuj terenu tylko po `source=furniture`.
Wyjątek na schody/stok nie ignoruje nakładającego się gruzu. Nieznana przyczyna wymaga deklaracji, nie pełnej
niewrażliwości. Cichy krok ma inny, szerszy zakres niż Człowiek-pająk/Włóczykij/narty.
Ukryty teren, hazard i token nie mogą zostać ujawnione przez podgląd kosztu, nazwę lub zdalną trasę.

### 8.3. Pasek początkowy

Sześć szablonów opartych na rzeczywiście posiadanych przedmiotach/zdolnościach: Brutal, Cwaniak, Spec,
Twardziel, Złodziej, Zwiadowca. Zachowaj wzorzec dziesięciu slotów: broń główna/zapasowa, obsługa broni,
decyzje klasowe, ekwipunek, Unikanie, Odstąpienie, Ruch, Więcej. Nie jest to sztywna lista broni dla każdej klasy.
Złodziej otrzymuje swoje warianty B, nie klasowe B Bieganie. Zryw i zdolności wyższych poziomów pojawiają się
przy rzeczywistym posiadaniu; Twardziel na 1. poziomie nie dostaje automatycznie zawodu kierowcy.

Sztuczki dodają warianty właścicielom dowolnej klasy. Poszczególne operacje i palety dają się przeciągnąć jako
działające skróty; natywny drag umiejętności nie jest automatycznie makrem.
Zasiew wyłącznie przy jawnym onboardingu/odtworzeniu, z wersją użytkownik/postać. Zachowaj zajęte sloty,
przesunięcia, usunięcia i celowo pusty pasek. Uzgodnij z `ability-hotbar.mjs` brak samoczynnego odtwarzania usunięć.
Przywrócenie pokazuje dodawane elementy i konflikty. Użyj istniejących ikon/liczników/stanów; nowe grafiki nie są
warunkiem rozpoczęcia prac. Pochodzenie ikon paska opisuje `dev/icons/hotbar-pass/README.md`.

### 8.4. Lokalny panel tury

| Stan | Widok i sygnał |
| --- | --- |
| Oczekiwanie | `Twoja tura za X`; X to pozycje w widocznej inicjatywie, nie sekundy. R i przygotowania nadal dostępne. |
| Następny | `Gotuj się, jesteś następny`, jeden krótki osobny dźwięk i puls na przejściu. |
| Początek własnej tury | Liczniki, jeden dźwięk startu i krótki puls. |
| Własna tura | Mały zegar `m:ss.cc`, dyskretna animacja; po 30 s żółte pulsowanie, po 60 s czerwone. Bez dodatkowej syreny. |
| Pauza Foundry | Zatrzymany czas i animacja pilności; bez świeżych sygnałów. |

Zegar liczy całą rzeczywistą niepauzowaną turę: decyzje gracza, reakcje i szukanie reguły przez MG. Nie mierzy winy
uczestnika, nie nakłada kary, nie kończy tury i nie wysyła statystyk na czat/serwer. Obliczaj czas monotonicznie
minus rzeczywiste pauzy, nie dodawaniem interwału. Ogranicz odświeżanie DOM; setne nie wymagają 100 renderów/s.

Unikalne wystąpienie tury deduplikuje dźwięki i zegar. Rerender, zmiana tokenu, efekty i ruch nie resetują czasu.
Sesyjna pamięć klienta może zachować znany stan po reloadzie; pierwsze wejście w środku tury pokazuje czas
częściowy/nieznany i nie emituje fałszywego startu. Utrata łączności nie tworzy rzekomo wspólnego pełnego stopera.
Przy zmianach podczas pauzy odtwórz najwyżej aktualny właściwy sygnał, bez kolejki zaległych dźwięków.

Licz tylko widoczną kolejność, respektuj skip-defeated oraz kotwice M3/M4. Nie ujawniaj ukrytych kombatantów
przez licznik lub dźwięk. „Następny w widocznej kolejności” nie obiecuje braku ukrytej tury po drodze.
Domyślny podmiot powiadomień to przypisana postać, dodatkowi właśni kombatanci są jawnie włączani. Oglądanie
obcego tokenu go nie zmienia. MG posiadający wszystkie BN nie otrzymuje dlatego sygnałów dla każdego z nich.
Wierzchowiec/nośnik nie podwaja sygnału tury jeźdźca. Nie wymuszaj focusu, zmiany sceny lub przerwania pisania.

Dźwięki są lokalne. Natywne `nextUp`/`yourTurn`, `core.combatTheme` i `game.audio.interface` dostarczają zasobów;
M8 ma jednego właściciela tych sygnałów w zarządzanej walce, bez podwójnego natywnego odtworzenia. Nie przepisuj
ustawienia motywu użytkownika ani nie wyłączaj innych dźwięków. Core nie obsługuje całego wymaganego filtrowania
widoczności/pauzy/pierwszej tury. Wymagane lokalne mute/głośność, reduced-motion i czytelny wariant bez audio.

<a id="inventory"></a>
## 9. Inwentarz zdolności i właściciele integracji

Poniższa lista jest obowiązkową listą pokrycia: każdy wiersz otrzymuje automatykę lub konkretny działający fallback.
Istniejące efekty liczbowe nie są dodawane drugi raz. Używaj stabilnych `abilityId`/`originAbilityId`/`sztuczka`.

| Rodzina | NOE | Kontrakt integracji |
| --- | --- | --- |
| Człowiek-pająk | 102 | Warunkowa Szybkość wspinania: wolne obie ręce lub zestaw w ręku; wyjątek schodów/stoków; właściwe RO przeciw upadkowi. Obecny bezwarunkowy efekt wymaga korekty. |
| Grenadier / Stalowe jaja R | 103 | Podejście do granatu do 4,5 m, podniesienie/rzut i ochrona przed AO jako jedna drukowana reakcja. Bez świeżej bazy, osobnych I/A i wymaganej strefy granatu na mapie. |
| Manewry Mistrza walki wręcz | 104 | B Odstąpienie i wymuszone przesunięcie celu; istniejące rozstrzygnięcia manewrów. |
| Padnij/Powstań | 105 | +3 m, darmowe wstawanie i wyjątek AO. Dobrowolne Padnij nadal wydaje resztę. |
| Pewna ręka / Pewny strzał B | 105 | Przed ruchem i atakiem, Szybkość 0 do next-own-start. Dowód ruchu przeżywa czyszczenie historii innych tur. |
| Przycelowanie | 106 | Nogi → Powalenie; opony/gąsienice → połowa Szybkości nośnika do naprawy. Osobne skutki i źródła. |
| Rodeo | 106 | Oswajanie/TT i nośnik M4; brak podwójnej opłaty jeźdźca za Bieganie wierzchowca. |
| Szachista / Roszada | 107 | Unikanie dodaje własną TT/ochronę AO do next-own-start; nie mylić z Odstąpieniem. |
| Szybki Bill / Długie susy B | 107 | B Bieganie; to podzdolność, nie osobna Sztuczka do wyszukania. |
| Barbarka, Ławnik, Wrestler | 102, 104, 108 | Obserwuj Powalenie/Pochwycenie; stan ofiary nie jest jej dobrowolnym kosztem. |
| Bez trzymanki, Benzyna zamiast krwi, Plug & Play | 102, 105 | Właściwości kierowania M4; nie kopiować do chodzenia. |
| Ciszej niż cień | 102 | Przypomnienie wykrywania; brak automatycznego Ukrywania się za ruch. |
| Berserk / Szarża | 67 | Koszt podejścia i deklarowany zamiar D19; brak wymogu monotonicznego zbliżania. Zmęczenie D24, pancerz D27. |
| Szaleńcza szarża, Brutalny cios | 68 | +3 m i własna ochrona Przyspieszenia; Okulawienie celu −6 do początku następnej tury atakującego, bez drugiego takiego samego efektu. |
| Gladiator / Zew areny | 70 | Aktywny Berserk, Praca nóg, podwójny skok i D33. Bez darmowego pola lądowania i nowej A. |
| Szybkie nogi / Szybkie łapy | 91–92 | B Przyspieszenie/Odstąpienie/Ukrywanie, +3 m; brak klasowego B Biegania. |
| Podstępny atak | 92 | Faktyczne −1k6×1,5 m do **końca** następnej tury atakującego, nie do początku. Nie przeliczaj ponownie kości. |
| Kocie kości | 91–92 | Cztery łapy R przy upadku; Zgrabne łapy bez wymyślonego A/B/R. M6/rewizje zachowują własny koszt. |
| Zabójca / Jeden strzał / Celowanie B | 94 | Własny warunek braku ruchu i zakres broni/ognia. Nie dodawać blokady Szybkości z innego Pewnego strzału. |
| Cwaniacki zwód B | 73 | Bez ciężkiego pancerza B Odstąpienie z przechodzeniem przez wrogów; zachowaj wyjątek zajętego pola. |
| Szczur / Wspinacz / Skoczek | 94 | Szybkość wspinania i właściwa zamiana testu/maksimum; wysokość bez nieprzyjętego rozszerzenia ZRC. |
| Cichy krok, Sportowiec | 98 | Szeroka odporność na trudny teren; +3 m i Ułatwienie Atletyki przy wspinaniu/pływaniu/skoku, nie wszystkich testów Akrobatyki. |
| Mój biom | 96 | Drużynowa podróż w wybranym biomie; nie ogólna aura terenu w walce. |
| Jeździec, Zawsze w siodle, Kaskader, Pancerna fura | 97, 88–89 | Koszty i kotwice M4; rider/mount/vehicle nie dostają nowej puli przez przełączenie widoku. |
| Miami / Człowiek-aligator / Włóczykij | 62 | Szybkość pływania z **bazowej** Szybkości, selektywne mokradła/piasek; audyt obecnej formuły. |
| Missisipi / Chodźmy, na pewno już utonął | 62 | Ułatwienie Atletyki pływania i wstrzymanie oddechu M6, bez nowej Szybkości pływania. |
| Narty/kijki i sprzęt nurkowy | 141–142 | Aktywne użycie, nie samo posiadanie w plecaku; selektywna odporność/Speed z bazy i ręczna deklaracja użycia. |
| Rany, Wyczerpanie, udźwig, pancerz, choroby, alkohol, kolczatki | 32, 36, 109–111, 114, 140, 256–257 | Aktualna pochodna Szybkość i powody z obecnych usług; brak drugiego naliczenia i obchodzenia zera. |
| Nożownik, Promocja, inne źródła B, Rzeźnik | 70, 86, 98, 105, 117 | Rejestr źródeł §7; Rzeźnik +3 także dla broni palnej/dwuręcznej, jeśli w drugiej ręce nie ma **innej** broni. |

Normalni BG są ludźmi, ale NPC, towarzysze, wierzchowce i drony nadal mają specjalne Szybkości, rozmiary i wyjątki.
E0 inwentaryzuje wejścia Bestiariusza: m.in. Łowca/18 m/Skok łowcy, stałe skoki Bit-boya, Skakun, Wycofanie
Biodroida, szarże Obrońcy/Tarana i teren Juggernauta. Nie ograniczaj ich wzorem ludzkiej SIŁ.
Jeśli potrzeba nowego tagu możliwości, zmień wejście/builder i generator, nie ręcznie aktora Bestiariusza.
M3 dostarcza stan komend i podmioty tur; M8 nie dubluje kosztu komendy ani zasad zachowania bez komendy.

<a id="delivery"></a>
## 10. Kolejność implementacji i bramki

Wszystkie etapy należą do zatwierdzonego zakresu. Bramka oznacza wymagany dowód techniczny, nie nowe pytanie
o zgodę na wykonanie. Zaczynaj od `AGENTS.md`, `TESTING.md`, `dev/agent/README.md` i `fvtt doctor`.
Nie testuj w kampanii ani nie reseeduj Poligonu bez prośby MG. Zmiana bazowej wersji hosta wymaga ponownego
sprawdzenia właściwych punktów integracji, nie zgadywania na podstawie tego pliku.

| Etap | Praca | Dowód zakończenia |
| --- | --- | --- |
| E0 — mapa wejść i prototyp | Spisz operacje/źródła/writerów/commit/refund; zweryfikuj pomiar, historię i awaited seam ataku; inwentarz Bestiariusza i migracji. | Raport ścieżek i reprodukowalne próby na obecnej wersji, bez twierdzenia, że stary audit wdraża nowy tracker. |
| E1 — wspólny ledger | Konteksty tur/reakcji, granty, wektory kosztu, uprawnienia, deduplikacja, wykonawca/ack i korekty; zgodne API M7. | Dwa klienty, reload, retry/utrata ack, role gracza i brak wykonawcy; żaden writer nie nalicza drugi raz. |
| E2 — ruch i teren | Integracja natywnego pomiaru/history/Undo, D14/D17/D29–D31/D34, koszty bez przesunięcia, preset Regionu i ręczna dopłata. | Wektory ruchu/kosztu i natywne Undo, teren bez Tiled i selective immunity. |
| E3 — skok i M6 | Kalkulator NOE, cechy, lądowanie, Gladiator D33, refaktor Regionu, właściwe testy/upadki. | Ten sam wynik z karty/makra/Regionu, brak nieprzyjętych DC i darmowego transportu. |
| E4 — A/B/R/I | Migruj wszystkie deklaracje M7/lalki; Zryw, ograniczone granty, rany i zmęczenie Berserku. | Złożone pule, anulowanie, zachowana historia po leczeniu, prawidłowe terminy. |
| E5 — Pomaganie/Wyczekanie | Dwie gałęzie pomocy, przygotowanie/wykonanie R, świeży ruch R i zakończenie ochrony D32. | Rzeczywista tura gracza + innego aktora, deklaracja słowna, zagnieżdżona/przerwana reakcja, brak drugiej A/R. |
| E6 — ataki | Źródła, grupowanie, zamienniki, szybki/konfigurowany rzut, Nożownik, dodatki i migracja wczesnych writerów, historia serii aktora/rundy. | Oczekiwany commit po konfiguracji, wszystkie wejścia i anulowania, Fuks, brak podwójnych kosztów/skutków. |
| E7 — karta, palety i pasek | Linijka/readout, dostęp bez makr, sześć szablonów, synchronizator usunięć, korekty i dostępność. | Faktyczne kliki gracza, klawiatura, wąski widok, pusty/przerobiony pasek, trwałe ostrzeżenia. |
| E8 — gotowość | Panel poza/w trakcie tury, dwa dźwięki i zegar lokalny, współistnienie core i kotwic. | Pauza, tło, pierwsza tura/wejście w środku, reload, ukryta kolejność, właściciel wielu aktorów. |
| E9 — migracja i odbiór | Wyłącz zastąpione debit/reset paths M4/M7, dane generowane i legacy efekty; regresje, dokumentacja i probes Poligonu. | Macierz §11, zrzuty, aktualny raport bramki i brak fałszywych oznaczeń wdrożenia. |

Przed przełączeniem pojedynczego przepływu usuń jego stary koszt w tej samej zmianie. Małe kompletne przyrosty
są właściwe; pozostawienie dwóch właścicieli budżetu na okres przejściowy nie jest bezpieczną migracją.
Wstępne szacunki movement-only nie wyceniają całego M8. Oszacowanie techniczne po E0 nie zmienia zatwierdzonego zakresu.

<a id="acceptance"></a>
## 11. Macierz odbioru

Poniższe wyniki są kontraktem dla testów. Reguły testuj w prawdziwym środowisku zgodnie z `TESTING.md`; testy
czystych funkcji nie zastępują natywnych dokumentów, inputu i uprawnień. Nie dodawaj testów kopiujących implementację.

| ID | Przypadek | Oczekiwany wynik |
| --- | --- | --- |
| T01 | Szybkość 9; dwa dragi po 3; Undo drugiego | Koszt 6 → 3, pozostałe 3 → 6; niezależna B bez zmian. |
| T02 | Zmierzony ruch 12 przy puli 9 | Pozycja pozostaje, ruch −3/9 i trwałe tekstowe przekroczenie; brak automatycznej A/grantu. |
| T03 | Składowe poziome 4,5/4,5; wysokość 6 | Dystans prostego odcinka 6; zasięg nie zawiera dopłaty terenu. Trasa z obejściem sumuje odcinki. |
| T04 | 1,5 m crawl + DT; także z ciągnięciem | Koszt 4,5; z trzecią niezależną dopłatą 6, nie iloczyn mnożników. |
| T05 | Dwa DT, dwa generic ×2, schody+gruz z odpornością na schody | Odpowiednio ×2, odrębne ×4 i nadal ×2 od gruzu. `none` → jawny fallback kosztu. |
| T06 | Natywny Region kontra import; reimport | Ten sam koszt/podświetlenie; ręczny Region zachowany, bez fałszywej flagi importera. |
| T07 | 3/9 ruchu, Przyspieszenie, rana −4,5; odwrotna kolejność | D14: 10,5/13,5 kontra 6/9; powtórny hook niczego nie dodaje. Leczenie nie tworzy grantu. |
| T08 | Chód 9/pływanie 18, chód 6, pływanie 6, wybór chodu | Pływanie 12 → 6; chód po łącznym koszcie 12 bez dostępnego ruchu. Sam wybór nie jest wydatkiem. |
| T09 | Przyspieszenie chodu +9, chód 6, pływanie 18 | 12 m pływania, nie 21/30; grant nie przechodzi na osobną Szybkość. |
| T10 | 4,5/9 ruchu, koniec tury, wyczekany Dash/Run | Świeże 9/18 m, R raz, bez starej 4,5 lub nowej bazy 9. Rana przed R zmienia świeże liczby na 4,5/9. |
| T11 | Starszy grant ma 6, świeży Run R daje 18 | Reakcja ma 18, nie 24. Stary termin grantu nie daje dodatkowej dostępności. |
| T12 | Bieganie własnoturowe i w R; przerwanie zagnieżdżoną R | Ochrona do końca własnej tury lub całej nadrzędnej R, bez przedłużenia do końca cudzej tury. Własne Utrudnienie do next-own-start. |
| T13 | Padnij po 3/9; inflicted prone; feat-free Powstań → Dash | Koszt 6 tylko za dobrowolne Padnij; stan od ataku bez kosztu; po darmowym wstaniu legalny nowy grant. |
| T14 | D19: trudny teren, obejście ściany, wcześniejsze A Dash | 4,5 dystansu/koszt 9 może spełnić podejście; detour deklarowalny; próg Speed 9, nie capacity 18. |
| T15 | SIŁ 14 dal/wzwyż z rozbiegu i z miejsca | Dal 4,2/2,1; wzwyż 1,2/0,6; oddzielne dosięganie. Brak ceil do 4,5 i obowiązkowego testu zwykłego skoku. |
| T16 | Skoczek, Sportowiec, Gladiator, istota z własnym skokiem | Właściwa zamiana/adv/podwojenie/wyjątek. Bez ogólnego DEX high jump lub ludzkiego limitu dla NPC. |
| T17 | Gladiator 2,9/3/6; 4,5 poziomo+3 wysokości | 0/1/2k6 i 1k6; jeden koszt ruchu i RO celu; brak nowej A/slotu, raz-na-turę i darmowego pola obok. |
| T18 | Region skoku używa teleport transport; rzeczywisty teleport | Fizyczny skok płatny raz, prawdziwy teleport 0; brak domyślnego rozszerzenia zasięgu za DC 10/15. |
| T19 | Chód → wierzchowiec → jazda → zejście; pojazd/pasażer | Własne pule, koszty M4 raz; pasażer bez dobrowolnego wydatku, pojazd/pościg bez przeliczenia M8. |
| T20 | Człowiek-pająk ma zajęte ręce; sprzęt w plecaku | Warunkowa zdolność aktualizuje się; zachowany wyjątek zestawu w ręku, brak aktywacji z samego posiadania. |
| T21 | Core czyści wszystkie historie, reload/cofnięcie inicjatywy | Brak nowego budżetu innym aktorom, zgubienia aktywnych skutków i dublowania grantu. Undo odnosi się do właściwego kontekstu. |
| T22 | A 0/1 → Zryw A → A; anulowanie wyboru | 0/1 → 1/2 → 0/2; anulowanie nie wybiera A i nie wydaje użycia zdolności. |
| T23 | Base A + Zryw A + Szybkie ręce; trzy Attack | Tylko dwie nieograniczone; trzeci Attack ostrzega, ograniczona A do Używania nadal niezużyta. |
| T24 | Rana po legalnej B, potem leczenie; Berserk fatigue | Brak retroaktywnego naruszenia/refundu. A/B/I/R zakazane przez next-own-end mimo refresh; ruch nie odebrany. |
| T25 | Ochraniacze z aktywnym Berserkiem | Brak no-armour TT benefits; Berserk/pozostałe właściwe źródła działają, bez automatycznego końca i zmęczenia. |
| T26 | Dobądź, druga interakcja, atak | I, następnie Używanie A, następnie właściwy Attack; bez automatycznego ataku po dobyciu i darmowej zamiany broni. |
| T27 | Skill Help sukces/porażka, inny test, Fuks; Attack Help inny wróg | Koszt próby raz; zgodne zużycie/expiry; Attack Help bez testu pomocnika i wymyślonego next-turn TTL. |
| T28 | Słowne Ready, pominięty trigger, późniejsza R; dwie deklaracje | Brak wymaganego payloadu/akceptacji MG; pominięcie nic nie wydaje; R raz na wykonanie; wspólna pula, bez dwóch akcji za jedną R. |
| T29 | Próba Zrywu poza turą przy Ready; własnoturowy trigger | Zachowany drukowany warunek; własnoturowa R oceniana według rzeczywistej tury. Bez automatycznej B. |
| T30 | Drugi atak: atak, ruch, atak; Wytrącenie, atak | Jedna A i dwa sloty; save celu bez rzutu atakującego zajmuje slot. Trzecia próba nową A. |
| T31 | Atak 1/2 → inna opłacona A → atak 2/2; Zryw cztery ataki | D22 zachowuje instancję; Zryw daje dwie A po dwa, bez inferred grant lub darmowych dalszych ataków. |
| T32 | A 0/1, ale slot pozostał; brak A po pełnych slotach | Najpierw kontynuacja A, później legalne B; ograniczone Używanie nie udaje zwykłej A. |
| T33 | Promocja nieposiadana / poza Berserkiem / z bronią palną | Brak opcji / wybór z trwałym ostrzeżeniem / brak niepasującej B konwersji na strzał. |
| T34 | Nożownik zweryfikowany i Promocja; brak celu/dowodu | Wśród legalnych B domyślny zweryfikowany Nożownik; niezweryfikowany nadal jawnie wybieralny. Prawidłowy keybind/targets. |
| T35 | Nożownik bez celu, pudło, Fuks; zmiana noża | Krytyczne obrażenia tylko po trafieniu i dla tej próby, bez stworzonej ofiary/auto-hit; inny nóż jest dopuszczalny. |
| T36 | Nożownik + aim, przełączenie na A, już opłacony aim | 2B kontra A+B; aim pozostaje, opłacony komponent bez drugiego debetu. Krytyki nie mnożą się wielokrotnie. |
| T37 | Szybki rzut, nieaktualne dane w oknie, anulowanie przez końcowy hook | Te same wybory domyślne/ostrzeżenia; rewalidacja zachowuje wybór; anulowanie bez debetu, wcześniej zużyte zasoby uzgodnione. |
| T38 | Dwa klienty, duplicate/retry, brak ack, błąd czatu | Jeden zapis i skutek, pierwotny kontekst; bounded pending/manual bez ponownego rzutu i blokady wymagającej MG. |
| T39 | Standard KS/Grad, Zryw i zmiana broni | Właściwe A/sloty i wyjątki; historia aktora/rundy; timing/count ostrzega, amunicja/zacięcie zachowują własną obsługę. |
| T40 | Rzeźnik z dwuręczną bronią palną i zmienionym źródłem | Zachowane właściwe +3 bez nowej A/B; druga ręka na tej samej broni nie jest inną bronią. |
| T41 | Nowy atak poza turą; osobno Fuks/obrażenia | Nowy atak R, rewizja/obrażenia bez kolejnej R; brak wymogu zapisanej struktury Ready. |
| T42 | Słowna akcja zostawia A 1/1, End Turn | Brak obowiązkowego rozliczenia, kary i automatycznego Unikania/Ready. |
| T43 | Pusty pasek, usunięcie/przeniesienie makra, relog/restore | Pełny dostęp z karty; zmiany zachowane; restore jawny i respektuje konflikty. |
| T44 | Pause/background/reload/initial turn/mid-turn connection | Zegar liczy tylko znany niepauzowany czas; dwa sygnały raz, bez backlogu, resetu i fałszywego pełnego zera. |
| T45 | Ukryci, skip, mount/companion; MG owns all; core audio | Widoczna kolejność, brak ujawnień i podwójnych/mnogich dźwięków; R dostępna także podczas oczekiwania. |
| T46 | Zaskoczenie i drukowany atak przed walką z ≥30 m | NOE s. 25: właściwa Inicjatywa/wyjątek; bez starego D&D odbierającego A/R w pierwszej turze i bez pre-combat debetu R. |

Warstwa 6: faktyczne kliki, ruch i uprawnienia zwykłego gracza oraz MG, nie wyłącznie wywołania serwisu.
Zrzuty końcowego licznika/palety, czerwonego ostrzeżenia i wąskiego widoku. Zmierz responsywność na scenie gęstej
od Regionów; planowanie/hover nie zapisują dokumentów ani nie czekają na sieć. Poszerzaj regresję przy nowych
zmianach lub nierozstrzygniętym ryzyku, nie przez wielokrotne powtarzanie identycznej zielonej bramki.

Stanowisko Poligonu `ruch`: Podziel ruch; Przyspiesz/Biegnij; Teren bez Tiled; Schody i gruz; Skok z rozbiegu/z miejsca;
Padnij/Powstań; Przekrocz i skoryguj; Wsiądź/zsiądź; Pusty pasek; Dwa ataki; Zryw A/B; Pomóż; Wyczekaj i rusz w R;
Zakończ przerwaną R; Rana i leczenie; Zakończ Berserk; Słowna akcja; Następny/Twoja tura; Pauza i zegar.
Implementujący dodaje probes i opisuje je w handoffie. Reseed stanowiska wykonuje tylko na prośbę MG.

<a id="handoff"></a>
## 12. Stan przekazania i warunki zakończenia

**Nie pozostały pytania mechaniczne wymagające odpowiedzi MG przed rozpoczęciem implementacji.** Ręczne granice
§2.2 są zatwierdzonym sposobem obsługi niepewnej fikcji, nie upoważnieniem do dopisania nowej reguły RAW.
Układ DOM, nazwy nowych helperów, dokładne ikony, format schematu i organizacja małych zmian są decyzjami
implementującego w granicach kontraktów. Nowa rzeczywista sprzeczność źródeł wymaga jawnego zgłoszenia, nie ukrytej reguły.

Przed napisaniem kodu sprawdź mapę źródeł w [audycie](AUDIT_m8_action_economy.md), zwłaszcza synchroniczne hooki,
wczesne debit/refund, Bieganie w R, klasowe zakończenia i granicę M4. Istniejące próby z 2026-11-02 potwierdziły
Undo historii, niezależną B, dodatkową B, rzeczywiste Zryw/Fuks oraz nakładanie trudnego terenu; paczka istniejących
akcji miała 12/12. To nie testy nowej implementacji i nie dowód spełnienia T01–T46.

M8 jest dostarczone, gdy wszystkie etapy i właściwe przypadki odbiorowe mają dowód, każda pozycja inwentarza ma
automatykę albo używalny opisany fallback, stare writery nie naliczają równolegle, migracje i generatory są poprawne,
a `IMPLEMENTATION.md`, [PLAN_beta.md](PLAN_beta.md), pokrycie M7, API, `docs/Ruch-i-teren.md` i właściwe WKK opisują
**rzeczywiście wdrożone** zachowanie. Nie oznaczaj teraz checkboxów jako ukończonych. Walidacja dokumentu i
planowanie nie wymagają uruchamiania kampanii ani budowania paczek z niezmienionych danych.

Weryfikacja handoffu 2026-11-15: UTF-8, nowe/zmienione odsyłacze i kotwice, komplet T01–T46 oraz E0–E9 poprawne.
Kontrola ścieżek instrukcji: 21 plików, 1816 odwołań, 0 martwych. Nie wykonano nowej próby runtime M8.
Zastane usterki odsyłaczy/białych znaków poza zmienianą treścią porównano z HEAD i oddzielono od tego refaktoru.

<a id="progress"></a>
## 13. Stan wdrożenia (2026-11-15)

Baza: moduł `0.21.0` po `3ec33f0`, Foundry `14.369`, dnd5e `6.0.6`. Wdrożenie na gałęzi `m8-ruch-ekonomia`
(merge do `master` po odbiorze MG na Poligonie). Ten rozdział opisuje to, co **działa**; reszta planu pozostaje
kontraktem bez zmian.

### 13.1. Wdrożone

| Etap | Co działa | Gdzie | Dowód |
| --- | --- | --- | --- |
| E0 | Mapa writerów B/R (poniżej), pułapki hosta (§13.3). | ten rozdział | próby w piaskownicy |
| E1 | Ledger na fladze kombatanta (`flags.<mod>.m8`): instancja tury = (walka, kombatant, runda), cykl R, operacje z wektorem A/B/R/I, granty (także ograniczone), zakazy, wykonania reakcji, korekty, deduplikacja po id żądania, przycinanie archiwum. Jeden wykonawca: aktywny MG, bez niego deterministyczny właściciel; `User#query` z limitem czasu, oczekujące żądania ponawiane tym samym id w pierwotnej chwili. Fasada `game.neuroshima.actions` zgodna z M7 (`zadeklaruj`, `dodatkowa`, `znacznik`) + `deklaruj`, `koryguj`, `zakonczReakcje`, `zmeczenie`, `stan`. Znaczniki R/B to projekcja (z `_id` stanu), ręczna zmiana w HUD — korekta; stare znaczniki M7 importowane jako korekta. | `config/ekonomia-data.mjs`, `combat/ekonomia.mjs`, `actors/actions.mjs`, `config/actions-data.mjs` | Quench `ekonomia`, `akcje`; e2e `ruch` (gracz zapisuje przez MG) |
| E2 | Koszt z `moveToken` (natywny koszt przebytej części, ten sam id w kontynuacji raz), natywne Undo (`isUndo`) w pierwotnym kontekście, czyszczenie historii przez rdzeń bez nowego budżetu, `displace`/teleport poza budżetem, plansze pościgu i pojazdy wyłączone. Budżet D14/D17/D18/D30/D31 w czystym modelu; linijka zielona/czerwona z etykietą; wiadomość po przekroczeniu. Rodzaj terenu `stairs` („Schody”) dla Regionu dnd5e. | `combat/ekonomia.mjs`, `combat/ekonomia-linijka.mjs`, `templates/ruch/waypoint-label.hbs` | Quench (T01, T02, T07–T11, T13), e2e `ruch` (zrzut linijki) |
| E3 | Kalkulator NOE (w dal/wzwyż, rozbieg z dystansu i z kilku dragów, z miejsca połowa, sięgnięcie, Skoczek, Gladiator ×2, istoty wg opisu). Natywny ruch „Skok” (dnd5e 1:1) — ocena zasięgu po ruchu: trwałe ostrzeżenie w ledgerze (`zarejestrujUwagiRuchu`), poza walką wiadomość. Lądowanie po skoku w dal na trudnym terenie → karta Akrobatyki ST 10 (Powalenie). Skok Gladiatora na pole istoty → karta RO SIŁ (D33 jako WKK 46). Region `skok` na tym samym kalkulatorze: bez `ST_ZA_BRAK`, marginesu i relokacji; za krótki — pole szczeliny z zasięgu; koszt 1:1 do zapisu tego ruchu. [Skok] w panelu karty. | `config/skok-data.mjs`, `combat/skok.mjs`, `scenes/transitions.mjs`, `wkk/config/skok-kobalt.mjs` | Quench `skok` (T15–T18, wariant WKK wyłączony), e2e `ruch` (klik [Skok], zrzut kalkulatora, skok ponad zasięg zapisany przez MG) |
| E3 (reszta) | Stały skok istoty z cechy (generator Bestiariusza `kind: "skok"`, ten sam opis na starszych kopiach): zasięg w tabeli i ostrzeżeniu, skok warunkowy (Skok łowcy) opisowy. Sportowiec: Szybkość +3 m, Ułatwienie Atletyki w testach wspinaczki i pływania (źródło testu), przy skoku podpowiedź. Upadek (`fall`) poza ledgerem; zejście z krawędzi nie jest wysokością skoku ani Skoku Gladiatora. | `dev/bestiary/gen_bestiary.py`, `config/skok-data.mjs`, `combat/skok.mjs`, `config/zdolnosci-efekty.mjs` | Quench `skok` (23) |
| E4 (część) | A z natywnych aktywności `action` poza atakami (przedmiot → Używanie), B/R jak w M7; Zryw: wybór przed zużyciem, zamknięcie okna nic nie zużywa, grant z id wiadomości; Szybkie ręce: ograniczona A „uzywanie”; zakazy ran/Obezwładnienia; zmęczenie po Berserku D24 (koniec po ostatniej własnej turze i po drukowanym przerwaniu; ręczne wyłączenie i odpoczynek bez kary). | `actors/actions.mjs`, `combat/zdolnosci-karty.mjs`, `actors/class-state.mjs`, `dev/classes/gen_features.py` | Quench (T22, T23, T24, D24 na skompilowanych zdolnościach) |
| E4 (lalka) | Wykonane przeniesienie na lalce w walce → ledger: [I] (`interakcja`: zużyta → Używanie [A] z `cel: uzywanie`), Akcje z `moveCost` (plecak — Używanie, pancerz — `donTime` naraz). Ciche i mimowolne bez kosztu. | `actors/doll.mjs`, `actors/actions.mjs` | Quench `atakowanie` (T26), `lalka` |
| E5 | Deklaracja poza własną turą = wykonanie w R z nowym `reakcjaStart`, świeży grant tylko tej reakcji (D30), [Zakończ reakcję]. Wyczekanie: przygotowania w ledgerze (`przygotowania`), A teraz, R przy wykonaniu, pominięcie bez kosztu, wygaśnięcie z nowym cyklem bez zwrotu; Reaguj: wykonanie / uzbrojenie (klient, bez kosztu) / słownie; deklaracja i przedmiot w otwartej reakcji bez drugiej R (`reakcjaBezAkcji`); [A] przedmiotu poza turą → R (`akcja()`); reakcje zamykane ze zmianą tury; D32 jako WKK 47 (`ochronaBieguWReakcji`, `celBiegnieReakcja`). Pomaganie: test ST 10 / atak / słownie, pomoc na sojuszniku (`flags.pomoc`, przekaźnik MG), Ułatwienie z rejestru testów i silnika okoliczności, zużycie po rzucie, termin pomocy w teście. Zryw poza turą — ostrzeżenie na karcie (D23). | `config/ekonomia-data.mjs`, `actors/actions.mjs`, `combat/pomaganie.mjs`, `combat/ekonomia.mjs`, `config/okolicznosci-ataku.mjs`, `wkk/config/reakcja-kobalt.mjs`, `actors/ekonomia-karta.mjs` | Quench `wyczekanie` (T12, T27–T29, T41, wariant WKK 47), `ekonomia` (T10, T11); e2e `ruch` (klik [Wyczekaj], [Pomóż], [Reaguj] → [Biegnij], zamknięcie reakcji) |
| E7 (część) | Panel na karcie (Stan): ruch, A/B/R/I z dymkami, Przyspiesz/Biegnij/Unik/Odstąp/Padnij-Powstań, Skok, Pomóż, Wyczekaj, Reaguj, ostrzeżenia, przygotowania i pomoc od sojuszników, [Skoryguj], [Zakończ reakcję]; odświeżanie w miejscu. Zastąpił przełączniki Unikanie/Bieganie (U8). Przyciski przeciągalne na pasek jako działające skróty (`hotbarDrop`, `game.neuroshima.skroty`). Synchronizator usunięć w `ability-hotbar.mjs`: usunięte przez gracza makro zdolności nie wraca samo (`hotbarUsuniete`, zapis w `preUpdateUser`, przeniesienie ≠ usunięcie), jawne `restoreHotbar`. | `actors/ekonomia-karta.mjs`, `actors/sheet-shell.mjs`, `actors/ability-hotbar.mjs` | e2e `ruch`, `combat` (zrzuty); Quench `pasek-m8` (T43) |
| E2 (teren) | Przyczyny trudnego terenu NOE w `difficultTerrainTypes` (schody, zagracenie, niski strop dopisane, reszta z etykietą NOE); preset MG w kontrolkach Regionów (przyczyny, nazwa, widoczność MG, podświetlenie przy planowaniu, dopisanie do zaznaczonych). Odporności jako Efekty Aktywne: Człowiek-pająk — schody i stok, Włóczykij — mokradło i piasek (MG: bez wody), Cichy krok — wszystko; „inne” spowalnia. Alpinista z warunkiem rąk (`@neuro.rece`, T20), Zabezpieczenie w rejestrze Ułatwień (źródło „upadek”). Tryb ruchu „Ciągnięcie” (D34; MG: tryb natywny). Wsiadanie, dosiadanie, przesiadka M4 w budżecie ruchu (`zaplacRuch`; pasażer — przycisk Drzwi, MG), wierzchowiec bez zaokrąglania. Scena w ft/km — „rozlicz ręcznie” (MG). | `config/teren-data.mjs`, `scenes/teren-preset.mjs`, `actors/rece-dane.mjs`, `pojazdy/jadacy.mjs`, `combat/ekonomia.mjs`, `combat/ekonomia-linijka.mjs` | Quench `teren-m8` (12), `pojazdy`, `dogrywka-m7`, `sztuczki-dane` |
| E7 (szablony) | „Ułóż pasek” w panelu Stan (decyzja MG: przycisk; też poza walką): podgląd slotów 1–0, jeden zapis paska, makra użytkownika nietknięte (konflikt za dziesiątką), makra modułu przesuwane, wersja na użytkowniku, zdolności szablonu zdjęte z listy usuniętych. Sześć list decyzji klasowych (`SZABLONY`), obsługa broni z magazynka, palety Ruch/Więcej (Złodziej — warianty B Szybkich nóg; poza walką bez budżetu). Wygląd — M9. | `config/pasek-data.mjs`, `actors/pasek-szablony.mjs`, `actors/ekonomia-karta.mjs`, `actors/ability-hotbar.mjs` | Quench `pasek-m8` (planer, ułożenie, palety); e2e `ruch` (klik, podgląd, pasek gracza) |
| E6 (rdzeń) | Instancje Atakowania w ledgerze (`ataki`: sloty z Drugi/Trzeci atak, BN z opisu Ataku wielokrotnego), kontynuacja najnowszej otwartej (D22), wybór domyślny §7.2 (`domyslneZrodlo`), łączny koszt z Przycelowaniem (§7.4). Pole „Sposób ataku” w `AttackRollConfigurationDialog`; rejestr źródeł B z weryfikacją (Nożownik — cel i zapis trafienia, przy wyborze zapowiedź krytyka; Promocja — Berserk; Ulubiona broń — wcześniejszy atak). Zapis kosztu w opakowaniu `D20Roll.buildEvaluate` (oczekiwany punkt po konfiguracji, przed oceną; pusta tablica = anulowanie), koszt i ostrzeżenia we flagach wiadomości → plakietka. Migracja: `dodatkowyAtak` bez debetu przed oknem (zamiar na karcie użycia, `dodatkowyOplacony` dla aktywności [B] i Zamaszystego ciosu), Przycelowanie z okna — B w tej samej próbie zamiast `zadeklaruj` po rzucie. Fuks (`roll.reroll()`) omija zapis. Pojazdy i drony bez zapisu. | `config/ekonomia-data.mjs`, `combat/atakowanie.mjs`, `combat/zdolnosci-akcje.mjs`, `combat/przycelowanie.mjs` | Quench `atakowanie` (T30–T34, T36, T41, prawdziwy rzut: nowa A, kontynuacja, anulowanie), e2e `ruch` (okno ataku gracza, plakietka) |
| E6 (reszta) | Tryby ognia z Testem Ataku (`AKTYWNOSCI_ATAKU`: zwykły, Dublet, KS) płacą przy rzucie; KS bez Gradu ołowiu — tryb całej akcji (`calaA`, A poza slotami, D22), z Gradem — slot. „Raz w rundzie” KS/DS/MS ostrzega (T39, MG 2026-11-15), historia serii na aktorze. Manewry (Pochwycenie, Odepchnięcie, Wytrącenie) w slocie z „Sposobem ataku”, koszt przed RO celu; Z bara! opłacone. Nożownik z okna: krytyk tej próby (`dopiszAutoKrytyk`), bez celu — krytyczne obrażenia z karty. Korekta próby z plakietki (`opcjeKorektyAtaku`, `atakKorekta`). | `config/ekonomia-data.mjs`, `combat/atakowanie.mjs`, `weapons/fire-modes.mjs`, `combat/melee-maneuvers.mjs`, `combat/okolicznosci.mjs` | Quench `atakowanie` (T30 manewr, T39, §7.1 korekta, §7.3), `sztuczki-walka`; e2e `ruch` (korekta, manewr) |
| E8 | Panel gotowości (pasek u góry): pozycja w widocznej kolejności (ukryci nie liczą się, skipDefeated), następny, własna tura z zegarem `m:ss.cc` (30/60 s), pauza zatrzymuje; sygnały raz na instancję tury, pierwsza obserwacja bez startu, w pauzie bez świeżych; zegar w `sessionStorage`; dźwięki z `core.combatTheme` przez `game.audio.interface`, rdzeniowe nextUp/yourTurn wyciszone (`Combat#_playCombatSound`); podmiot: przypisana postać (+ opcja innych własnych). Ustawienia klienta: panel, dźwięki, głośność, animacja, inni. | `config/gotowosc-data.mjs`, `combat/gotowosc.mjs` | Quench `gotowosc` (T44, T45: model, wyciszenie rdzenia, panel w prawdziwej walce, pauza) |
| WKK | Zasada 45 w `docs/Kobalt.md`: D14, D17, D30, D31 pod „Kolor Kobaltu”; bez Kobaltu `reczne` („rozstrzygnij ręcznie”), linijka bez koloru. Zasada 46: D33 (obrażenia Skoku Gladiatora); bez Kobaltu kości „rozstrzygnij ręcznie”. Zasada 47: D32 (ochrona Biegania w Reakcji); bez Kobaltu uwaga w oknie ataku. | `wkk/config/ruch-kobalt.mjs`, `wkk/config/skok-kobalt.mjs`, `wkk/config/reakcja-kobalt.mjs` | Quench `ekonomia`, `skok`, `wyczekanie` (warianty wyłączone) |

Stanowisko Poligonu `ruch` — 37 prób dla tego, co powyżej (w tym pięć skoku — z istotą i Sportowcem, trzy Pomagania/Wyczekania/Reakcji, cztery ataków — z krótką serią i manewrem — korekta próby, dwie paska z szablonem, dwie gotowości i pięć terenu E2; Gladiator to persona `gladiator-5` z Zewem areny, Twardziel ma B 93R, Kurier `m7-slang` — Człowiek-pająk i Włóczykij, `zwiadowca-7-sportowiec`, Bit-boy); `stajnia` i `garaz` — po jednej próbie wsiadania w budżecie; `poziomy` — próby skoku przez szlam przepisane na kalkulator. Na Poligonie przebudowane 2026-11-15 na prośbę MG (`ruch` po E6 z B 93R; próba `szablon-paska` pojawia się po F5, bez przebudowy).

### 13.2. Mapa writerów B/R/A przed M8 i ich los

| Writer | Było | Teraz |
| --- | --- | --- |
| `actors/actions.mjs::_onPostUseActivity` | B/R przy `postUseActivity` | B/R/A (bez ataków) do ledgera, id = `uzycie-<wiadomość>`; [A] poza turą → R (`akcja()`) |
| `actors/class-state.mjs` (stany klasowe [B]/[R]) | `zadeklaruj` | bez zmian (lejek → ledger) |
| `combat/obrona.mjs` (Reakcje celu), `combat/zdolnosci-po-rzucie.mjs` (Motywacja, Spieprzysz to!, Kocie kości) | `zadeklaruj(R)` | bez zmian (lejek → ledger) |
| `combat/przycelowanie.mjs`, `combat/zdolnosci-akcje.mjs::dodatkowyAtak` | `zadeklaruj(B)` **przed** oknem broni | E6: B przy zapisie ataku (zamiar z karty użycia; Przycelowanie z okna w tej samej próbie); `wyceluj` [B] przed atakiem zostaje osobną akcją |
| Ataki bronią (wszystkie wejścia) | nie liczone | E6: `combat/atakowanie.mjs` — instancja A ze slotami / B / R w opakowaniu `buildEvaluate` |
| `combat/zdolnosci-karty.mjs::_zryw` | wybór po zużyciu, `?? "A"`, limit znacznika | wybór przed zużyciem, grant w ledgerze |
| Przełączniki Unikanie/Bieganie na karcie | sam status | deklaracja: koszt + grant + status raz |

### 13.3. Pułapki hosta znalezione przy wdrożeniu

- **Koszt ruchu tylko dla wyrenderowanego tokenu.** `TokenDocument#_preUpdateMovement` mierzy koszt tylko, gdy token
  jest na kanwie ruszającego; ruch z API na nieoglądanej scenie ma koszt 0 przy niezerowym dystansie. Ledger liczy
  wtedy dystans i oznacza koszt jako niepełny (bez terenu), zamiast przyjąć zero.
- **`combatTurn` w każdej aktualizacji kombatanta.** `Combatant._preUpdateOperation` dopisuje indeks bieżącego
  kombatanta u zlecającego; zapis, który doleci po zmianie tury, cofa lokalnie turę u wszystkich klientów. Zapisy
  ledgera idą z `{combatTurn: null, turnEvents: false}` (świeży obiekt opcji — zamrożony wywala zapis).
- **`toggleStatusEffect` szuka po `_id` stanu.** Efekt stanu z losowym id jest dla HUD-u niewidoczny (kliknięcie
  zakładało drugi). Projekcja R/B tworzy znaczniki z `_id` z `CONFIG.statusEffects`.
- **`revertRecordedMovement()` bez id** cofa do pierwszego ruchu historii; Ctrl+Z cofa ostatni.

### 13.4. Co zostaje (kolejność wg §10)

- **E2:** zamknięte 2026-11-15 (wiersz „E2 (teren)” w §13.1). Poza zakresem modułu zostają narty i kijki oraz sprzęt
  do nurkowania (brak przedmiotów w katalogu — odporność dopiszą, gdy powstaną) i przyczyna „zagracenie” w eksporterze
  map Tiled (dziś strefy mebli są „inne” — spowalniają każdego poza Cichym krokiem, zgodnie z §8.2).
- **E3:** zamknięte 2026-11-15 (wiersz „E3 (reszta)” w §13.1). Test Atletyki przy skoku moduł nie prosi (NOE go nie
  drukuje jako obowiązkowego); Sportowiec przy nim — podpowiedź.
- **E4 (reszta):** plakietki źródeł kosztu w kartach czatu przedmiotów (ataki mają plakietkę), dobycie ze szybkim
  atakiem („dobądź i zatrzymaj się”) w e2e, wyjątki Pakowania/podwójnego dobycia w e2e.
- **E5 (reszta):** Grenadier/Stalowe jaja R (podejście do granatu w jednej reakcji); zagnieżdżona reakcja przeciwnika
  (dziś: każda reakcja ma własne id, zamyka ją przycisk albo koniec tury). Atak w R i atak w otwartej reakcji — już w E6.
- **E6:** zamknięte 2026-11-15 (wiersz „E6 (reszta)” w §13.1): KS/Grad, Dublet, „raz w rundzie”, historia serii,
  manewry w slocie, Nożownik bez celu, jawna nowa A obok kontynuacji (od rdzenia E6), korekta po fakcie. T40 (Rzeźnik)
  pokrywa test `okolicznosci` (ta sama broń oburącz nie jest „inną bronią”); premia liczona z trzymanych broni w
  `premieObrazen`, które nie czyta źródła ataku — zmiana źródła jej nie dotyka.
- **E7 (reszta):** wąski widok karty i obsługa klawiaturą w e2e; ocena list decyzji klasowych przez MG na Poligonie
  (próba `szablon-paska`). Szablony i palety — zrobione 2026-11-15 (wiersz „E7 (szablony)” w §13.1); wygląd slotów
  należy do M9.
- **E8 (reszta):** kotwice tur M3/M4 (towarzysz w turze właściciela) w liczeniu „za X”, e2e z dwoma klientami i
  odtworzeniem po przeładowaniu, zrzuty paska.
- **E9:** migracja M4 (budżet wierzchowca/pojazdu obok ledgera), pełna macierz §11, `PLAN_beta.md`, pokrycie M7.
  **Migracja światów to osobny, ostatni krok** (decyzja MG, 2026-11-15): jedna procedura dla wszystkich światów
  (plakietki zdolności i Sztuczek — Zryw, Szybkie ręce, Grad ołowiu, Nożownik; stare znaczniki R/B, flagi Regionów
  `skok`, makra paska, opis KS w aktywnościach broni — `chatFlavor` „limit ataków pilnuje gracz”, dawne `lastBurstUse` na
  broniach; efekty Człowieka-pająka — stary bezwarunkowy „wspinaczka” na dwa nowe, Włóczykij — nowy efekt), uruchamiana po zakończeniu całego planu — nie rozdawana po kawałku przy kolejnych etapach.

e2e `dron` padało 2026-11-15 na nazwie w OSD: Chrome stał na monitorze pionowym, kaskada okien dała widoki
~1104 × 2306, a OSD liczyło znak z samej wysokości (~16 kolumn — nazwa znikała, akcje wchodziły na PW). Poprawione
u źródła: OSD trzyma co najmniej `MIN_KOLUMNY` (znak mniejszy w wąskim oknie) i zaczyna pod nawigacją scen;
runner nie daje okien wyższych niż 4:3. Przy okazji `clickCanvas` czeka na koniec przewijania przy krawędzi
(wskaźnik nowej karty stoi w rogu, a podgląd żetonu przewija widok) — inaczej klik trafiał o pole obok.
