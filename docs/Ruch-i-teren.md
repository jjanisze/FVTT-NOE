# Ruch i teren: ruch w turze, spadanie, latanie, woda, wspinaczka

Jak moduł prowadzi upadki, lotników, pływanie, walkę pod wodą i wspinaczkę. Strony w nawiasach to
*Neuroshima: Ostatnia Era* (wydanie październikowe). Koszt ruchu — trudny teren, pływanie i wspinanie
za podwójną cenę, zniesione przez Szybkość pływania albo wspinania — liczy sam dnd5e: jest zgodny z
podręcznikiem, więc moduł go nie rusza.

**Zasada ogólna:** moduł oznacza i podsuwa kartę, a decyduje MG. Testy wody i wspinaczki pojawiają się
same **tylko w walce**. Poza walką MG prosi o test sam (przycisk w HUD żetonu albo zwykły rzut) —
woda czy ściana nie muszą zatrzymywać gry, kiedy nikt nie liczy tur.

## Ruch i akcje w turze (s. 21–30, 37)

W walce karta postaci (panel **Stan**) pokazuje, co zostało w tej turze: **ruch** w metrach w bieżącym trybie
(chodzenie, pływanie…) oraz **A / B / R / I** — Akcja, Akcja Bonusowa, Reakcja, Darmowa interakcja — jako
„zostało / ile w ogóle”. Przekroczenie to liczba ujemna i czerwony napis; nic nie jest blokowane, a gra słowna jest
w porządku — akcja zagrana bez kliknięcia zostawia licznik 1/1 i nikt nie każe jej potem wpisywać. Liczniki są
pomocą, nie sędzią.

- **Ruch** liczy się z prawdziwej drogi żetonu (z trudnym terenem i czołganiem, jak liczy dnd5e). Ctrl+Z na mapie
  cofa ruch razem z kosztem. Przy przeciąganiu linijka jest **zielona** w znanej puli i **czerwona** poza nią, a
  etykieta mówi „zostaje X m” albo „ponad pulę −X m”. Zwykły ruch jest tylko w twojej turze — nie przechodzi na
  później (s. 26).
- **Przyspiesz, Biegnij, Unik, Odstąp** — przyciski w panelu: koszt (zwykle Akcja), dodatkowy ruch równy Szybkości
  (Bieganie: dwukrotności, tylko na nogach) z chwili wykonania i stan na żetonie. **Padnij** zjada resztę ruchu,
  **Powstań** kosztuje połowę Szybkości.
- **Poza swoją turą** te same przyciski działają jako wykonanie przygotowanej akcji w **Reakcji**: R zamiast A, świeży
  ruch tylko z tej akcji (Bieganie przy Szybkości 9 — 18 m). Gdy ruch się urwie, **[Zakończ reakcję]**.
- **Pomóż** (s. 30): w teście — wybierasz sojusznika i swoją biegłość, robisz test ST 10; sukces daje mu Ułatwienie
  w następnym teście tej samej umiejętności (najpóźniej do początku twojej następnej tury), porażka — Akcja przepada.
  W ataku — wyceluj we wroga do 1,5 m od siebie: sojusznik ma Ułatwienie w następnym ataku na niego. Albo słownie —
  sama Akcja. Pomoc zużywa się dopiero faktycznym rzutem sojusznika, nie otwarciem okna.
- **Wyczekaj** (s. 30): Akcja teraz, notatka i czynność opcjonalne — wystarczy słowo przy stole. Gdy przyjdzie
  okazja, **Reaguj → Wykonaj** (Reakcja); pominięta okazja nic nie kosztuje, a początek twojej tury kończy
  przygotowanie bez zwrotu Akcji. Po wykonaniu Biegnij, Przyspiesz, przedmiot albo Pomóż należą do tej samej reakcji
  — bez drugiej R. **Reaguj → Uzbrój** kieruje następną akcję w Reakcję także w twojej turze; **Reaguj → słownie**
  zapisuje reakcję zagraną bez kliknięć.
- **Oporządzenie w walce** liczy się samo: dobycie albo schowanie broni, podniesienie — Darmowa interakcja [I]; druga
  taka czynność w turze — Używanie [A] (pokrywa je też Szybkie ręce); wyjęcie z plecaka — Akcja; pancerz — tyle Akcji,
  ile trwa zakładanie. Wytrącenie i inne mimowolne przenosiny nic nie kosztują.
- **Przedmiot użyty poza swoją turą** (medpak, granat) to wykonanie wyczekanej akcji — liczy się Reakcja, nie Akcja.
  Reakcja kończy się [Zakończ reakcję] albo najpóźniej z końcem tury, w której się wydarzyła.
- **Zryw** pyta najpierw: Akcja czy Akcja Bonusowa — dopiero wybór zużywa użycie. Poza własną turą karta ostrzega
  (Zryw jest tylko we własnej turze, s. 87). **Szybkie ręce** dają Akcję tylko
  do Używania przedmiotu. Po **Berserku** liczniki są przekreślone do końca twojej następnej tury (ruch zostaje).
- **[Skoryguj]** dopisuje albo zwalnia wydatek i dodaje lub odejmuje ruch — z powodem, bez kasowania historii. MG może
  też zdjąć znacznik „Reakcja zużyta” z żetonu: to korekta, nie nowa akcja.
- Z **Kolorem Kobaltu** (zasada 45 w [Kobalt.md](Kobalt.md)) licznik rozstrzyga sam zbiegi, o których podręcznik
  milczy: ruch po zmianie Szybkości w trakcie tury, przejście z chodu na pływanie, ruch w Reakcji. Bez Kobaltu w takiej
  sytuacji pokazuje „rozstrzygnij ręcznie”.

**Skróty na pasku.** Przyciski panelu (Przyspiesz, Biegnij, Unik, Odstąp, Padnij/Powstań, Skok, Pomóż, Wyczekaj,
Reaguj) można przeciągnąć na pasek makr — powstaje działający skrót tej samej operacji. Pusty pasek niczego nie
odbiera: wszystko jest też na karcie. Makro zdolności zdjęte z paska ręką gracza nie wraca samo przy następnej
synchronizacji (przeniesienie na inne pole to nie usunięcie); przywraca je jawnie
`game.modules.get("neuroshima-2026-overrides").api.hotbar.restore()`.

**Szablon paska.** Przycisk **Ułóż pasek** w panelu Stan (w walce i poza nią) układa sloty 1–0 z tego, co postać
ma: 1 — broń w ręce (albo pierwsza rozmieszczona), 2 — broń zapasowa, 3 — obsługa broni (wymiana magazynka,
przeładowanie albo ładowanie po naboju), 4–5 — dwie decyzje klasowe, 6 — przedmiot z akcją (medpak, granat), 7 — Unik,
8 — Odstąp, 9 — paleta **Ruch**, 0 — paleta **Więcej**. Czego postać nie ma, zostaje puste. Najpierw podgląd; twoich
makr moduł nie rusza — zajęty slot to konflikt, a element idzie za dziesiątkę. Makra modułu (zdolności, skróty) mogą
się przesunąć. Ułożenie przywraca zdolności szablonu zdjęte wcześniej z paska.

| Klasa | Decyzje klasowe (posiadane, w tej kolejności) |
| --- | --- |
| Brutal | Berserk, Z bara!, Solówa |
| Cwaniak | Szybka gadka, Cwaniacki zwód, Obelga, Głowa do góry!, Motywacja |
| Spec | Dobra rada, Szybkie badanie, Szybkie ręce, Inteligentna obrona |
| Twardziel | Przycelowanie, Kondycha, Zryw |
| Złodziej | Kocie kości, Matrix — Szybkie nogi są w palecie Ruch |
| Zwiadowca | Kłusownik |

Brak dwóch z listy — inne posiadane zdolności paska z akcją. Wybór Ulubionej broni to ustawienie, nie decyzja w turze
(atak za B wybierasz w „Sposobie ataku”). **Paleta Ruch:** Przyspiesz, Biegnij, Skok, Padnij/Powstań; Złodziej z
**Szybkimi nogami** dostaje ich warianty za Akcję Bonusową — Przyspiesz [B], Odstąp [B], Ukryj się [B] (Skradanie się).
**Paleta Więcej:** Pomóż, Manewr, kalkulator skoku, w walce też Wyczekaj, Reaguj i Zakończ reakcję. Otwarcie palety
nic nie kosztuje; poza walką zostają tylko rzeczy bez budżetu.

**Gotowość do tury.** U góry ekranu gracz widzi pasek: „Twoja tura za X” (X — ilu widocznych uczestników jest
przed tobą; ukrytych moduł nie liczy i nie zdradza), „Gotuj się, jesteś następny” z krótkim dźwiękiem i „Twoja tura” z
dźwiękiem startu i zegarem `m:ss.cc` — po 30 s żółtym, po 60 s czerwonym. Zegar liczy cały niepauzowany czas tury
(decyzje, reakcje, szukanie reguły), niczego nie karze i nigdzie nie wysyła; w pauzie stoi. Dźwięki biorą się z motywu
walki (ustawienia walki rdzenia); głośność, wyciszenie, animację i „licz też moich innych bohaterów” zmienisz w
ustawieniach modułu (klient). MG dostaje sygnały tylko dla przypisanej sobie postaci.

### Trudny teren bez Tiled (s. 26)

Region z zachowaniem **Trudny teren** dnd5e i **przyczyną**: schody, stok / pochyły teren, gruz / kamienie,
zagracenie, niski strop, mokradło / bagno, piasek, śnieg, lód, woda (przeszkoda wodna), zarośla, sieci. Przyczyna mówi
zdolnościom, co ignorują; Region bez przyczyny („inne”) spowalnia każdego poza Cichym krokiem. Dwa nachodzące trudne
tereny to dalej 3 m za 1,5 m.

- **Preset MG.** W warstwie Regionów przycisk ze zboczem (**Trudny teren — preset**): wybierz przyczyny i rysuj — każdy
  nowy Region dostaje zachowanie, nazwę („Trudny teren — Schody”) i widoczność MG; gracz widzi go, gdy planuje ruch
  swoim żetonem (jak strefy z map Tiled), chyba że Region jest ukryty. Z zaznaczonym Regionem preset dopisuje
  przyczyny do jego zachowania. „Wyłącz preset” — znowu zwykłe Regiony. Preset żyje tylko w twojej przeglądarce.
- **Odporności zdolności** (liczy sam dnd5e): **Cichy krok** — każdy trudny teren; **Człowiek-pająk** (Po dwa naraz) —
  schody i stok, ale gruz na schodach dalej spowalnia; **Włóczykij** — mokradło i piasek, przeszkoda wodna nie.
- **Człowiek-pająk, Alpinista:** Szybkość wspinania równa Szybkości tylko przy obu rękach wolnych albo zajętych
  Sprzętem do wspinaczki (sprzęt w plecaku nie wystarcza) — przeliczane z lalki. **Zabezpieczenie:** Ułatwienie w RO,
  gdy porażka to upadek (zsuwanie się po drabinie i ścianie na przejściach).
- **Ciągnięcie** (s. 35) — tryb ruchu żetonu obok Czołgania (HUD żetonu, linijka): każde 1,5 m kosztuje +1,5 m, chyba
  że trzymasz pochwyconego o co najmniej dwa rozmiary mniejszego; leżąc — jeszcze czołganie. Dopłaty się sumują:
  czołganie, trudny teren i ciągnięcie to 6 m za 1,5 m.
- **Sam obrazek mapy:** [Skoryguj] → Ruch.
- **Scena w innych jednostkach niż metry** (ft, km): moduł nie przelicza po cichu — linijka bez koloru z „scena w ft —
  rozlicz ręcznie”, a ruch nie schodzi z licznika (zostaje na karcie jako ostrzeżenie).

**Wsiadanie i dosiadanie w walce** (s. 257, 260–261) schodzi z licznika ruchu we własnej turze: kierowca — połowa
Szybkości i reszta przepada; pasażer — nic, a zamknięte drzwi, fotel albo okno dolicza przycisk **Drzwi, fotel albo
okno** na karcie wsiadania (raz); wierzchowiec — połowa Szybkości bez zaokrąglania (9 m → 4,5 m), Jeździec 1,5 m;
przesiadka — swój koszt z karty. Poza swoją turą zostaje sam opis na karcie.

## Spadanie (s. 43)

Żeton zostawiony nad niższą podłogą dostaje status **Spadanie**. MG klika ikonę statusu na żetonie —
żeton opada, a w czacie pojawia się karta obrażeń (1k6 obuchowych za każde 1,5 m, bez górnej
granicy) z ofiarą już na tacce. Obrażenia nałożone z tacki dają Powalenie, jeśli coś zadały;
Osteoporoza mnoży wynik. Działa na każdej scenie: bez wyznaczonych podłóg za podłogę liczy się
podstawa poziomu.

Na upadek, którego mapa nie widzi — urwisko namalowane na tle, skok do studni z opowieści, upadek do
wody — MG ma narzędzie **Spadanie** w kontrolkach żetonów: wysokość i „do cieczy” (Reakcja, Test
Atletyki albo Akrobatyki ST 10 — sukces bez obrażeń, porażka połowa). Przycisk **Opuść bezpiecznie**
w HUD żetonu ze Spadaniem opuszcza go na podłogę niżej bez karty (lina, kontrolowane zejście).

## Latanie (s. 253)

Istota z Szybkością lotu nie spada, dopóki może latać:

| Stan lotnika | Co się dzieje |
|---|---|
| Nieprzytomność (także śmierć) | spada — karta obrażeń |
| Szybkość 0: Pochwycenie, Sparaliżowanie, Unieruchomienie, Wyłączenie, Udźwig maksymalny, Tonie, lot zbity karami do 0 | spada — karta obrażeń |
| samo Powalenie | **opada bez obrażeń** — kliknięcie ikony Spadania opuszcza żeton, karty nie ma |
| samo Obezwładnienie (też Ogłuszenie) | **zostaje w powietrzu** |

Lot z efektu (plecak odrzutowy) też czyni lotnikiem. Istota, która się unosi (ustawienie „Unoszenie”
w Szybkości), nie spada wcale.

## Woda (s. 255)

Wodę na mapie wyznacza **Region** z zachowaniem **Woda**: głębokość (*płytka* — brodzenie, *głęboka* —
pływanie), nurt i to, czy jest grząska. Nurt ustala ST testów: spokojna woda 10, rwąca rzeka 15,
wzburzony ocean 20, wir 25. Grząskie (błoto) kosztuje więcej ruchu — dodaj na tym samym Regionie
zwykły trudny teren dnd5e.

W walce:

- **Wejście do głębokiej wody** w ubraniu i ze sprzętem — MG dostaje szept z przyciskiem
  **Wymagaj testu**: podręcznik mówi „MG może wymagać”, więc to on decyduje. Wtedy właściciel postaci
  dostaje kartę z Testem Siły (Atletyka) ST 10.
- **Początek tury w głębokiej wodzie bez Szybkości pływania** — karta z Testem Siły (Atletyka) ze ST
  nurtu dla gracza.
- **Porażka:** statusy **Tonie** (Szybkość 0, opadanie na dno) i **Pod wodą**; postać zaczyna
  wstrzymywać oddech. **Sukces:** Tonie znika, a postać, którą wciągnęło tonięcie, wypływa.
- **Pancerz** z Utrudnieniem w kolumnie „Skradanie się/Pływanie” daje Utrudnienie do tego testu (s. 53).
- Fuks, który zamienia porażkę w sukces, cofa jej skutek.
- **Wyjście z wody** zdejmuje Tonie i Pod wodą.

Poza walką i poza kolejką MG ma w HUD żetonu stojącego w wodzie przycisk **Test pływania** (karta ze
ST nurtu tej wody).

### Pod wodą

Status **Pod wodą** nakłada porażka testu albo sam gracz lub MG z HUD (nurkowanie z własnej woli).
Postać wstrzymuje oddech przez 1 + modyfikator Kondycji minut, odliczane w turach; obrażenia w tym
czasie dają kartę z Rzutem Obronnym na Kondycję ST 10, a porażka — Uduszenie (te same zasady co
narzędzie Zagrożenia, [Umieranie i zdrowie](Umieranie-i-zdrowie.md)). Wynurzenie przywraca oddech.
Maszyny nie oddychają.

### Walka pod wodą (s. 255–256)

Moduł ustawia domyślne Utrudnienie w oknie ataku i pokazuje powód na karcie — jak każdą inną
okoliczność; gracz i MG mogą je zmienić.

| Sytuacja | Skutek |
|---|---|
| strzał z broni palnej spod wody | Utrudnienie; pocisk leci 30 cm — dalej chybia (uwaga na karcie); broń zacina się przy wyniku 5 i mniej; **połowa obrażeń** |
| strzał znad wody w zanurzony cel | Utrudnienie; cel głębiej niż 30 cm — pocisk zawsze chybia (uwaga dla MG) |
| broń miotana albo rzucana w zanurzony cel | Utrudnienie; pod wodą najwyżej 1,5 m (uwaga); **połowa obrażeń** |
| atak wręcz w zanurzony cel | Utrudnienie, chyba że atakujący ma Szybkość pływania |
| cel stoi w płytkiej wodzie | domyślnie **Osłona ½** w oknie ataku (MG może zmienić na ¾) |

Połowę obrażeń nakłada tacka obrażeń (zaokrąglenie w dół) — nie trzeba jej wybierać ręcznie.

## Wspinaczka (s. 256)

Pierwszy odcinek wspinaczki w turze (ruch „wspinaczka”) wystawia kartę z Testem Siły (Atletyka):
**ST 10** albo **ST 15** dla śliskiej ściany i małej liczby chwytów — wybiera MG. Karta mówi też o:

- **dwóch wolnych rękach** — bez nich karta to zaznacza i słychać sygnał naruszenia; moduł nie blokuje
  ruchu, rozstrzyga MG;
- **ciężkim plecaku** (Udźwig ponad próg) — Utrudnienie do testu;
- **Szybkości wspinania** — bez dodatkowego kosztu ruchu.

Drabiny, schody i trudne przejścia między poziomami mają własne zasady i karty — wspinaczką tu nie są.

## Skok (s. 256, 70, 94)

Skok jest częścią ruchu i kosztuje go **1:1** — trudny teren pod lotem się nie liczy. Zasięg:

- **w dal** — 0,3 m × SIŁ po co najmniej **3 m rozbiegu** (zwykłego ruchu tuż przed skokiem, także z kilku
  przeciągnięć); z miejsca połowa. SIŁ 14: 4,2 m albo 2,1 m — bez zaokrąglania do pól;
- **wzwyż** — (2 + mod. SIŁ) × 0,3 m, z miejsca połowa; sięgnięcie to wysokość skoku + 1,5 × wzrost;
- **Skoczek** (Zwinność szczura) liczy skok w dal z ZRC; **Skok Gladiatora** (Zew areny w Berserku) podwaja oba.

Przycisk **[Skok]** w panelu Stan pokazuje tabelę zasięgów i ustawia żetonowi tryb ruchu **Skok** (sam wybór nic nie
kosztuje). Potem zwykłe przeciąganie: skok dalej niż zasięg albo bez rozbiegu jest wykonany, ale zostaje trwałe
ostrzeżenie na karcie. Po skoku w dal na **trudny teren** przychodzi karta z testem Akrobatyki ST 10 (porażka —
Powalenie). Skok Gladiatora na pole istoty (najwyżej o rozmiar większej) daje MG kartę RO na Siłę celu: porażka —
Powalenie i obrażenia (z Kolorem Kobaltu 1k6 za każde pełne 3 m; zasada 46 w [Kobalt.md](Kobalt.md)). Sam skok nie
wydaje Akcji. Istoty z Bestiariusza skaczą według swojego opisu — moduł nie przykłada do nich ludzkiego wzoru.

Region **Skok** nad zaprojektowaną wyrwą liczy to samo: okno pokazuje zasięg z rozbiegu i z miejsca (rozbieg
zaznaczony, gdy był), **Skocz** — doskok na lądowisko albo, gdy zasięg za krótki, lądowanie w tym polu wyrwy, do
którego sięga skok (z kartą strefy i testem lądowania). Nie ma rzutu za brakujący zasięg.
