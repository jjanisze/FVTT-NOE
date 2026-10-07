# PLAN — M1: Walka i powrót do zdrowia wg RAW

> Status: **ZROBIONY — E0–E8** (2026-10-07): czyste zasady, umieranie, stabilizacja, silnik okoliczności
> ataku, Bieganie i Unikanie, Wyczerpanie wg reguł zdejmowania z widokiem, neutralizacja Stopnia z
> kalendarzykiem, zagrożenia, dokumentacja. Postęp i rozstrzygnięcia z wdrożenia w §11. Zatwierdzony
> 2026-10-06 (warstwa WKK, kalendarzyk §7.8, widok Wyczerpania §7.9; decyzje D1–D10, §6.1). Zostaje
> człowiekowi: ręczny przebieg MG zagrożeń w kampanii (E7) i weto rozstrzygnięć z §11.
> Rozmiar: **L** (PLAN_beta zakładał S–M; przegląd znalazł trzy ciche luki w regułach, które
> macierz oznaczała ✅ — §4, a rekonwalescencja urosła o kalendarzyk i widok Wyczerpania).
> Wywołanie: `PLAN_beta.md` M1.
>
> **Metoda (prośba MG).** Dla każdej reguły najpierw: *co robi dnd5e 5.3 i dlaczego*; potem: *czy
> ten powód dotyczy nas*; dopiero potem: *ile automatyki*. Wzorzec to Oporządzenie — dnd5e nie ma
> lalki nie dlatego, że byłaby bezużyteczna, tylko dlatego, że jego zasady nie domykają się dla
> istot nieludzkich. Nas to ograniczenie nie wiązało, więc lalkę zrobiliśmy.
>
> RAW = `Neuro 5e/Podrecznik/NOE/` (październik), `s. N` = strona drukowana.
> dnd5e = źródła systemu w wersji 5.3.0 (ścieżki `module/…` niżej są względem repozytorium systemu).
> Warstwy treści wg `scripts/wkk/README.md`: **NOE** (RAW), **RAI** (orzeczenia autora systemu,
> drzewo NOE z komentarzem), **WKK** (reguły tego stołu, `scripts/wkk/`, za przełącznikiem Kobalt).

---

## 1. Skala automatyki i kryteria

| Poziom | Nazwa | Co robi moduł | Kto rozstrzyga |
|---|---|---|---|
| T0 | Odnośnik | tekst RAW w opisie stanu, dymku, plakietce | stół |
| T1 | Przycisk MG | MG wyzwala; moduł rzuca i prowadzi księgowość (źródła, liczniki, zdejmowanie) | MG |
| T2 | Wykrycie + karta | moduł wykrywa, karta czatu z przyciskiem; zastosowanie robi człowiek | MG / gracz |
| T3 | Domyślne | moduł ustawia wartość domyślną w oknie rzutu, powód widoczny, można zmienić | gracz / MG |
| T4 | Automat | bezwarunkowy skutek RAW stosowany od razu, z linią na czacie | RAW |

Doktryna bez zmian (`PLAN_beta.md` §2): T4 tylko tam, gdzie RAW nie zostawia wyboru (brak RO, brak
decyzji); nigdy dwie akcje RAW w jednym kliknięciu; wykrycie oddzielone od rzutu obrażeń.

**Korzyść:** częstość przy stole · łatwo przeoczyć · koszt pomyłki (nieodwracalność) · różnica
względem 5e, które gracze znają „z palca” · księgowość (liczniki, zegary, źródła Wyczerpania) ·
nieoczywisty rachunek (kalendarzyk, §7.8).
**Koszt:** złożoność kodu i testów · narzut MG na przygotowanie (ustawienia, flagi na aktorach) ·
dodatkowe UI (okna, karty, kliknięcia) · ryzyko złej automatyki — fałszywe wykrycie jest gorsze
niż brak wykrycia, bo uczy stół ignorować karty.

**Czytanie RAW (zasady MG, 2026-10-06).**
1. Terminy zdefiniowane czytamy po definicji (Fuks → Przerzut → „nieudany Test k20”).
2. Reguła ma tylko te warunki zdejmowania, zerowania i wyjątki, które RAW zapisuje — nie dokładamy
   „rozsądnych” resetów ani zachowań z 5e. Przykład: uporczywe są tylko te rodzaje Wyczerpania,
   przy których RAW to zapisuje („nie może zostać usunięte, dopóki…”).
3. Orzeczenia autora systemu mają pierwszeństwo przed tekstem i są zapisywane jako RAI.
4. Gdy stół chce reguły ostrzejszej albo innej niż RAW, staje się ona **regułą WKK** za przełącznikiem
   Kobalt — RAW zostaje domyślnym zachowaniem NOE, nie jest „reinterpretowany”.

---

## 2. dnd5e 5.3 — co robi, czego nie robi, dlaczego

### 2.1 Inwentarz

| Reguła 5e | dnd5e 5.3 | Gdzie |
|---|---|---|
| Rzut przeciw śmierci → liczniki; 20 → 1 PW; 1 → dwie porażki; trzy porażki → komunikat | ✅ pełna automatyka | `Actor5e.rollDeathSave` |
| Leczenie z 0 PW zeruje liczniki | ✅ | `AttributesFields.preUpdateHP` |
| Test koncentracji po obrażeniach | ✅ — podpowiedź rzutu, nie zapis | `onUpdateHP` → `challengeConcentration` |
| Wyczerpanie: drabinka skutków, −1 poziom na DO | ✅ | `conditionEffects`, `exhaustionDelta` |
| Stany → skutki dla **własnych** testów, RO, Szybkości, Inicjatywy | ✅ | `hasConditionEffect` w `data/actor/templates/common.mjs`, `attributes.mjs` |
| Stany → skutki dla **własnych ataków** (Zatrucie, Wyczerpanie 3) | ❌ — zbiór `attackDisadvantage` jest zdefiniowany i nikt go nie czyta. Commit 882952d36: *„attack roll mode isn't currently functional pending #5176”* | `config.mjs` |
| Stany **celu** (Ułatwienie przeciw Powalonemu, Nieprzytomnemu…; auto-krytyk ≤ 1,5 m) | ❌ | — |
| Osłona | 🟡 statusy `coverHalf` / `coverThreeQuarters` na celu dodają do KP i RO ZRC — bez kierunku ataku, przełączane ręcznie | `Actor5e.coverBonus` |
| Zasięg daleki; atak dystansowy w zwarciu | ❌ — atak czyta z celu tylko KP | `documents/activity/attack.mjs` |
| Obrażenia przy 0 PW → porażka (krytyk: dwie) | ❌ — co więcej, przy 0 PW `onUpdateHP` kończy się przed hakiem `dnd5e.damageActor` (różnica PW = 0), więc nawet hak „otrzymał obrażenia” milczy | `data/actor/templates/attributes.mjs` |
| Masywne obrażenia → śmierć | ❌ — tylko odnośnik `instantdeath` do tekstu zasad | `config.mjs` |
| Stabilny | ❌ — status-znacznik `stable` istnieje, nic go nie nakłada. Po trzech sukcesach liczniki wracają do 0/0 i nic nie odróżnia stabilnego od umierającego | `rollDeathSave` |
| Nieprzytomność od 0 PW i jej koniec przy leczeniu | ❌ | — |
| Śmierć przeciwników przy 0 PW | ❌ — „Pokonany” w trackerze walki ręcznie; BN „ważny” (`traits.important`) pokazuje rzuty przeciw śmierci przy 0 PW | `npc-sheet.mjs` |
| Stabilizacja Medycyną; stabilny → 1 PW po 1k4 h | ❌ | — |
| Unik, Sprint | ❌ — status `dodging` bez skutków | `config.mjs` |
| Duszenie się, zimno, brak snu | ❌ — znaczniki `suffocation`, `dehydration`, `malnutrition` bez wyzwalaczy; dwa ostatnie tylko wstrzymują zdjęcie Wyczerpania na DO | `config.mjs`, `actor.mjs` |
| DO wymaga ≥ 1 PW (5e 2024) | ❌ | `Actor5e.longRest` |

### 2.2 Hipotezy — dlaczego

Wzór z inwentarza jest wyraźny: dnd5e automatyzuje **zmiany stanu jednego dokumentu, wywołane
jawnym zdarzeniem tego dokumentu** (rzut przeciw śmierci, odpoczynek, zmiana PW, wejście w stan)
i zostawia wszystko, co wymaga **kontekstu spoza aktora**. Siedem powodów:

- **R1 Ogólność.** System obsługuje tysiące stołów z regułami domowymi. Masywne obrażenia i
  natychmiastowa śmierć potworów to reguły, które stoły często wyłączają albo zmieniają — system
  nie narzuca ich nikomu.
- **R2 Kontekst relacyjny.** Tryb rzutu zależny od celu i geometrii (zasięg, wróg obok, stan celu,
  czy cię widzi) wymaga dyscypliny celowania, pomiaru na scenie i wiedzy o wzroku. W rdzeniu jedna
  kość ataku może dotyczyć kilku celów, których stany ciągną tryb w różne strony. Tę lukę
  wypełniają moduły (midi-qol). Nawet własne stany atakującego czekają na #5176.
- **R3 Obrażenia oddzielone od ataku.** Tacka obrażeń nakłada liczby; to, czy był krytyk albo atak
  wręcz, w chwili nakładania nie jest pewne — obrażenia można nałożyć paskiem PW, makrem, z ręki.
- **R4 Czas.** Czas świata w Foundry płynie tylko wtedy, gdy ktoś go przesunie. dnd5e nie wiesza
  reguł na zegarze (1k4 h stabilnego, godzinny RO na mróz); wiesza je na jawnych zdarzeniach
  (odpoczynek, tura walki).
- **R5 Otoczenie.** System nie wie, czy postać jest pod wodą, w mrozie, czy spała. Wie MG.
- **R6 Nieodwracalność i sprawczość.** dnd5e zapisuje liczniki, ale nigdy nie nakłada `dead` —
  śmierć i „Pokonany” to decyzja człowieka.
- **R7 Uprawnienia.** Klient gracza nie pisze do cudzych aktorów; ustabilizowanie sojusznika to
  zapis na cudzym aktorze, czyli przekaźnik przez MG.

### 2.3 Które powody dotyczą nas

| Powód | Dotyczy nas? | Dlaczego |
|---|---|---|
| R1 Ogólność | **nie** | Jeden stół: RAW + RAI + nakładka WKK za przełącznikiem. Odstępstwo stołu to reguła WKK, nie brak reguły |
| R2 Kontekst relacyjny | **koszt już zapłacony** | Od `PLAN_tt.md` celowanie jest obowiązkowe: jeden rozstrzygacz trafienia z werdyktem per cel (`combat/trafienie.mjs`); Współpraca już mierzy odległości (`combat/pack-tactics.mjs`). Brakuje tylko „czy cię widzi” — przybliżamy stanem Oślepienie |
| R3 Obrażenia ≠ atak | **nie** | Krytyk i walka wręcz docierają do nakładania obrażeń: `isCriticalHitOn` czyta werdykt z karty ataku, `knockout.mjs` zbiera wręcz/dystans w `dnd5e.preCalculateDamage` |
| R4 Czas | **tak** | Ta sama Foundry. Odpowiedź jak w dnd5e: wieszamy na zdarzeniach — koniec odpoczynku, przesunięcie zegara (`world-clock.mjs`), tura walki; nigdy na czasie rzeczywistym |
| R5 Otoczenie | **tak** | Przyciski MG (T1); moduł tylko liczy i pamięta źródła |
| R6 Nieodwracalność | **tak** | Śmierć BG potwierdza MG (D1). Rzut przeciw śmierci „nie jest Testem k20” (s. 34), więc nie dotyczą go Przerzuty ani Fuksy — Fuks daje Przerzut, a Przerzut to ponowienie nieudanego Testu k20 (s. 17) |
| R7 Uprawnienia | **rozwiązane** | Przekaźnik MG istnieje (Oporządzenie, okno „Reakcje celu”, `PLAN_tt.md` §4.8.5) |

**Wniosek.** Jak przy lalce: dwa z siedmiu powodów (R1, R3) nas nie wiążą, a R2 i R7 rozwiązaliśmy
przy PLAN_tt. Granicę automatyki w tym planie wyznaczają czas, otoczenie i nieodwracalność.

NOE dodatkowo **podnosi stawkę** względem 5e: każde zejście do 0 PW i każdy krytyk to Stopień
Zranienia, który zostaje na dni; cios wręcz w leżącego to dwie porażki *i* krytyk (auto-krytyk
≤ 1,5 m), czyli Stopień, a przy Krytycznym — śmierć; Olbrzymie obrażenia przy niskich PW i kościach
broni palnej nie są rzadkością (§3); a gojenie Stopni bez medyka trwa tygodnie (§7.8). Pomyłka stołu
kosztuje tu więcej niż w 5e.

---

## 3. RAW — inwentarz M1 (NOE względem 5e)

| Reguła | s. | NOE | 5e (PHB 2024) | Różnica ważna? |
|---|---|---|---|---|
| Obrażenia przy 0 PW | 34 | +1 porażka; **atak wręcz: +2** | +1; krytyk: +2 | **tak** — inny wyzwalacz podwójnej porażki |
| Auto-krytyk ≤ 1,5 m (Nieprzytomność, Sparaliżowanie) | 35 | tak | tak | z wierszem wyżej: cios wręcz w leżącego BG = 2 porażki **i** Stopień Zranienia (s. 32) |
| Olbrzymie obrażenia | 34 | jedno zdarzenie ≥ **2× maks. PW** | nadwyżka ponad 0 ≥ maks. PW | **tak** — łagodniejsze dla rannych, ale częste: BG z 10 maks. PW, krytyk bronią 2k8+3 → **62%** śmierci na miejscu; nieudany RO przeciw dynamitowi 5k6 → **31%** |
| Maks. PW = 0 | 34 | śmierć | śmierć | — |
| Śmierć przeciwników przy 0 PW | 34 | domyślnie; MG może traktować ważnych BN jak BG | zwykle (DMG) | — |
| Nieprzytomność | 34 | od 0 PW do odzyskania ≥ 1 PW | to samo | — |
| Rzut przeciw śmierci | 17, 34 | k20 ≥ 10; „nie jest powiązany z żadną Cechą Bazową i nie jest też Testem k20” — bez Wyczerpania, premii do RO, Przerzutów i Fuksów | RO z Wyczerpaniem i premiami; Inspiracja | **tak** — Wyczerpanie już zdjęte (`zranienie.mjs`), premie jeszcze nie (F12) |
| Naturalna 20 / 1 | 16 | automatyczne tylko w **Teście Ataku** | to samo | RO (np. Regeneracji) może mieć szansę 0% albo 100% — kalendarzyk musi to umieć (§7.8) |
| Stabilizacja | 34 | Pomaganie + INT (Medycyna) ST 10; stabilny bez leczenia: 1 PW po **1k8 h**; obrażenia wznawiają rzuty | Pomoc + MDR (Medycyna) ST 10; 1k4 h | drobna |
| Stabilizacja sprzętem | 135, 142 | Mały medyk bez biegłości: akcja, automatycznie; Staza: Używanie, automatycznie | — | NOE |
| Neutralizacja Stopnia Zranienia | 32–33, 46 | **Regeneracja:** po 3 kolejnych DO → RO KON ST 15, sukces −1; porażka → powtórka po każdym następnym DO. **Pomoc medyczna:** po DO, leczący biegły w Medycynie z narzędziami małego medyka → −1. Szczegóły — D3, D4 | — | NOE |
| „Dno torby” (Aspiryna i Miętusy) | Sztuczki | „Możesz przywracać PW i **opiekować się rannymi**, nawet jeśli torba małego medyka jest pusta” | — | obejmuje Pomoc medyczną — przy regule WKK z ładunkiem (D4) taki medyk ładunku nie potrzebuje |
| Krytyczny Stopień a Wyczerpanie | 32, 35 | „Nadaje jeden poziom Wyczerpania”; DO zdejmuje jeden poziom dowolnego Wyczerpania, uporczywe są tylko rodzaje z zapisanym wyjątkiem — to nie jest jednym z nich. RAI: zejście na Poważny je zdejmuje. WKK: uporczywe do zejścia z Krytycznego (D5) | — | NOE / RAI / WKK |
| DO wymaga ≥ 1 PW | 45 | tak | tak | — |
| Bieganie [A] | 30 | +2× Szybkość do początku następnej tury; Utrudnienie do własnych Testów Ataku; ataki dystansowe przeciw tobie z Utrudnieniem do końca bieżącej tury; nie przy Powaleniu; nie dla istot nie chodzących | brak (jest tylko Sprint = Przyspieszenie) | NOE |
| Unikanie [A] | 30 | ataki przeciw tobie z Utrudnieniem, jeśli widzisz napastnika; Ułatwienie RO ZRC; przepada przy Obezwładnieniu / Szybkości 0 | to samo | — |
| Zasięg daleki | 28 | Utrudnienie; poza dalekim — pudło | to samo | — |
| Dystansowy w zwarciu | 28 | Utrudnienie, jeśli ≤ 1,5 m jest wróg, który cię widzi, jest przytomny i ma Szybkość > 0 | to samo | — |
| Osłona | 27–28 | każdy atak z drugiej strony osłony; liczy się najwyższa | to samo | — |
| Stany a ataki | 35 | własne Utrudnienie: Przerażenie, Zatrucie, Oślepienie, Pochwycenie (cele inne niż chwytający), Powalenie (wręcz), Unieruchomienie; własne Ułatwienie: Niewidoczność. Przeciw tobie Ułatwienie: Nieprzytomność, Ogłuszenie, Oślepienie, Unieruchomienie, Powalenie ≤ 1,5 m; Utrudnienie: Powalenie dalej, Niewidoczność | to samo | — |
| Sen | 45 | doba bez snu → RO KON ST 20 albo +1 Wyczerpanie | — | NOE |
| Uduszenie | 255, 259 | 1 + mod. KON minut (min. 30 s); potem +1 Wyczerpanie na końcu każdej tury; **wszystkie** zdejmowane po złapaniu oddechu; obrażenia przy wstrzymanym oddechu → RO KON ST 10 albo duszenie | podobnie | — |
| Przemarznięcie | 258 | RO KON ST 5 + 1 za każdy °C poniżej zera, co godzinę; koc — Ułatwienie, śpiwór — automatyczny sukces (s. 140, 142); DO w cieple zdejmuje **wszystkie** | ST 10 (DMG) | NOE skaluje ST |

---

## 4. Stan kodu — znaleziska

- **F1 — cichy martwy kod.** `config/conditions.mjs` dopisuje Przerażenie i Zatrucie do
  `conditionEffects.attackDisadvantage`. dnd5e 5.3 tego zbioru nie czyta (§2.1). **Przerażenie i
  Zatrucie nie dają dziś Utrudnienia do ataków.** Macierz (`IMPLEMENTATION.md`, „stany ✅”) mówiła
  nieprawdę — poprawiona na 🟡 przy pisaniu tego planu.
- **F2 — stany celu nie istnieją dla rzutu ataku.** Żaden plik nie daje Ułatwienia przeciw
  Nieprzytomnemu / Powalonemu / Oślepionemu ani auto-krytyku ≤ 1,5 m. Unikanie (`dodging`) to sam
  znacznik z opisem.
- **F3 — Nieprzytomność się nie kończy.** `zranienie.mjs` nakłada `unconscious` przy zejściu do 0 PW;
  nic jej nie zdejmuje — ani leczenie, ani naturalna 20 w rzucie przeciw śmierci. Wyleczony BG
  leży, dopóki ktoś nie kliknie.
- **F4 — dwie reprezentacje „stabilny”.** dnd5e po trzech sukcesach zeruje liczniki (0/0);
  `items/toolkit-medyk.mjs` `_stabilise` ustawia sukcesy na 3. Status `stable` nigdy nie jest
  nakładany. Po resecie dnd5e nic nie blokuje kolejnego rzutu przeciw śmierci.
- **F5 — śmierć bez lejka.** Trzy porażki → karta Ostatniej akcji (`knockout.mjs`); piąty Stopień →
  linia na czacie; Wyczerpanie 6 → ostrzeżenie w przerzutach; nigdzie `dead` (poza jedną chemią).
  BN przy 0 PW dostają Nieprzytomność i Stopień.
- **F6 — dziewięć wstrzyknięć trybu ataku na dwóch hakach:** `armor-rules`, `udzwig-attack-disadvantage`,
  `grip`, `obalajaca`, `pack-tactics`, `disease-effects`, `levelled-conditions`, `addons` (+ premia
  `samuraj`). Każde z własną plakietką albo bez. Cztery nowe źródła tego planu dołożone po staremu
  dałyby trzynaście.
- **F7 — reguły zdejmowania Wyczerpania a RAW** (`config/exhaustion.mjs`). Zasada (§1, pkt 2):
  źródło schodzi zwykłym DO, chyba że RAW mówi inaczej. RAW mówi inaczej dla: **Odwodnienia** i
  **Niedożywienia** (nie schodzi, dopóki nie wypije / nie zje), **Przemarznięcia** (DO w cieple
  zdejmuje wszystkie — dodatkowo), **Uduszenia** (złapanie oddechu zdejmuje wszystkie — dodatkowo),
  **Skażenia** (RadOff usuwa skutki napromieniowania — dodatkowo). Dziś `restClears: false` mają też
  `bezsennosc`, `przemarznie`, `skazenie` i `zranienie` — niezgodnie z RAW (`zranienie` zgodnie z WKK, D5).
- **F8 — obrażenia przy 0 PW.** Nie da się ich złapać na `updateActor` ani `dnd5e.damageActor` (§2.1).
  Jedyne miejsce: `dnd5e.preApplyDamage` (PW przed) + `dnd5e.applyDamage` (`amount` przed
  obcięciem do 0 — to samo daje Olbrzymie obrażenia).
- **F9 — odpoczynek.** Zakłócenie tylko jako notatka (`config/rest.mjs`, świadomie); DO przy 0 PW
  nieblokowany.
- **F10 — Staza** nie istnieje jako przedmiot (`actors/handy-items.mjs`).
- **F11 — Osłona** pytana tylko przy atakach dystansowych (`combat/cover.mjs`, `_isRangedAttackActivity`).
- **F12 — rzut przeciw śmierci nie jest czystą k20.** dnd5e liczy go wspólną ścieżką rzutów cech:
  dokłada globalną premię do RO (`system.bonuses.abilities.save`), `death.bonuses.save` i tryb
  `death.roll.mode`. Hak `preRollDeathSave` w `zranienie.mjs` zdejmuje dziś tylko `@exhaustion`.
  Fuks: `combat/rerolls.mjs` nie wymienia typu `death` — potwierdzić na żywej karcie.
- **F13 — który poziom zdejmuje DO.** `onPreRestCompleted` bierze **najstarszy** poziom ze źródła
  z `restClears` — kolejność przypadkowa względem tego, co gracza czeka. Przy regułach D5 i U10
  kolejność zaczyna mieć znaczenie (U14).
- **F15 — `addExhaustion` czyta pochodny poziom** (znalezione w E1, 2026-10-07). Tuż po zapisie
  `system.attributes.exhaustion` jest o 1 w tyle za `_source`; kilka wywołań pod rząd gubi poziomy, a
  `exhaustionSources` rośnie ponad poziom (żywo: 7 źródeł przy poziomie 4). Do naprawy w E5 — czytać
  `_source` albo długość listy źródeł; `regulaZdejmowania` i tak zakłada, że lista = poziomy.
- **F14 — pipki Wyczerpania** (`actors/sheet-shell.mjs` `_buildTrackRow`, `actors/party-sheet.mjs`,
  `styles/neuroshima.css` `.neuro-stan-pip`) różnią się tylko barwą źródła; nic nie mówi, który
  poziom zejdzie odpoczynkiem, a który nie (§7.9).

---

## 5. Ocena per reguła

| Reguła | dnd5e | Powód | Dotyczy nas | Częstość | Przeoczenie / koszt błędu | Poziom | Koszt |
|---|---|---|---|---|---|---|---|
| Porażki przy obrażeniach na 0 PW (wręcz: 2) | ❌ | R3 | nie | każdy powalony BG | wysoki — inny niż 5e, liczony w biegu | **T4** | S |
| Auto-krytyk ≤ 1,5 m w Nieprzytomnego / Sparaliżowanego | ❌ | R2 | nie | rzadko, ale wtedy decyduje o życiu | wysoki (Stopień → śmierć) | **T4** w werdykcie | S |
| Olbrzymie obrażenia; maks. PW = 0 | ❌ | R1, R6 | R6 tak | często na niskich poziomach | nieodwracalne | **T2** (D1) | S |
| Śmierć BG (dowolna przyczyna) | ❌ | R6 | tak | — | nieodwracalne | **T2** — karta MG (D1) | S |
| BN przy 0 PW | ❌ | R1 | nie | każda walka | niski, ale żmudny | **T4** domyślnie martwy + **T2** karta „umiera” (D2) | S |
| Nieprzytomność: wejście i koniec | ❌ | — | — | każdy powalony | średni (F3) | **T4** | S |
| Stabilny: stan, blokada rzutów, wznowienie po obrażeniach | ❌ | R4 | — | każdy powalony | średni | **T4** | S |
| Stabilizacja (Pomaganie + Medycyna; medyk; Staza) | ❌ | R7 | rozwiązane | każdy powalony | niski | **T2** — przycisk dla gracza | M |
| Stabilny → 1 PW po 1k8 h | ❌ | R4 | tak | czasem | niski, ale nikt nie pamięta | **T4** na przesunięciu zegara | S |
| DO wymaga ≥ 1 PW | ❌ | — | — | czasem | średni (pełne PW za darmo) | **T4** odmowa z wyjaśnieniem | S |
| Regeneracja Stopnia | — | — | NOE | po każdej ciężkiej walce | wysoki — licznik dni | **T4** licznik + **T2** RO | M |
| Pomoc medyczna | — | — | NOE / WKK | j.w. | średni | **T1** — wybór drogi przed rzutem (D4) | S–M |
| Kalendarzyk zdrowia | — | — | NOE | po każdej ciężkiej walce | rachunek nieoczywisty (§7.8) | **T0** — prognoza, nic nie zapisuje | S–M |
| Wyczerpanie: kolejność zdejmowania, uporczywość, widok | 🟡 | — | — | stale | średni (F13, F14) | **T4** + widok | S |
| Zasięg daleki; dystansowy w zwarciu | ❌ | R2 | koszt zapłacony | wiele razy na walkę | średni | **T3** | M (silnik) |
| Stany atakującego i celu w rzucie ataku | ❌ | R2 | koszt zapłacony | wiele razy na walkę | średni; dziś cicho błędne (F1) | **T3** (D6) | M |
| Bieganie, Unikanie | ❌ | — | — | co walkę | średni | znacznik + **T3** przez silnik | S |
| Osłona przy ataku wręcz | 🟡 | — | — | rzadko | niski | **T3** bez okna | S |
| Uduszenie | ❌ | R5 | tak | rzadko | średni (licznik tur) | **T1** + T4 w trakcie | S–M |
| Przemarznięcie | ❌ | R4, R5 | tak | sezonowo | średni (ST, co godzinę) | **T1** | S |
| Sen | ❌ | R5 | tak | rzadko | niski | **T1** | S |

---

## 6. Rozstrzygnięcia

### 6.1 Decyzje MG (2026-10-06)

**D1 — śmierć BG: karta MG.** Trzy porażki, piąty Stopień, Olbrzymie obrażenia, maks. PW = 0,
Wyczerpanie 6 → karta „Śmierć” z przyczyną i liczbami, **[Potwierdź]** / **[Cofnij]**; potwierdza
MG. Przy trzech porażkach karta przypomina o Ostatniej akcji. **Bez Fuksa:** rzut przeciw śmierci
nie jest Testem k20, a Przerzut — więc i Fuks — dotyczy tylko nieudanego Testu k20 (s. 17, 34).

**D2 — BN przy 0 PW: domyślnie martwy, MG decyduje w chwili upadku.** BN, którego PW spadają do 0,
dostaje `dead` („Pokonany”, tracker go pomija), a MG — kartę widoczną tylko dla siebie z przyciskiem
**[Rzuty przeciw śmierci]**: zamienia śmierć na Nieprzytomność + Stopień za 0 PW i wprowadza BN w
maszynę umierania (§7.2), co daje graczom szansę go ratować. To samo działanie jest w panelu Stan BN
na później (np. „chcemy go przesłuchać”). Nokautowanie wręcz ma pierwszeństwo (BN zostaje na 1 PW).
*Uzasadnienie:* dla zwykłego BN „leży” i „martwy” różnią się dziś tylko pomijaniem w trackerze i
ikoną — przedmioty z rąk lecą przy 0 PW tak czy inaczej (`ground-items.mjs`), Podpalenie i
Krwawienie nie patrzą na PW. Różnica pojawia się dopiero z maszyną umierania M1, i to MG wybiera,
kto do niej wchodzi. Flaga dnd5e „important” niepotrzebna.

**D3 — Regeneracja: licznik DO od pierwszego Stopnia.**
- Licznik startuje z pierwszym Stopniem i rośnie o 1 za każdy **ukończony** DO. Podróż, obrażenia,
  nowe Stopnie ani dni bez odpoczynku go **nie** zerują — to bazowe, najgorsze tempo gojenia.
  „Kolejnych” czytamy jako „następnych”, nie „bez przerwy”.
- Licznik ≥ 3 → RO KON ST 15. Porażka → powtórka po każdym następnym DO. **Sukces → −1 Stopień i
  licznik od zera** (RAW dosłownie — powtórka „następnego dnia” zapisana tylko dla porażki).
- Stopień 0 → licznik znika; kolejny Stopień zaczyna od nowa.
- Wcześniejsza notka `PLAN_beta.md` („przerwany DO / obrażenia zerują licznik”) myliła przerwanie
  trwającego DO (RAW, s. 45) z resetem gojenia — RAW tego nie mówi. Przerwany DO to orzeczenie MG
  (Krótki odpoczynek albo nic) i po prostu nie dolicza się do licznika.

**D4 — Pomoc medyczna.**
- **Bez łączenia z Regeneracją** (NOE, interpretacja MG). Na każdy DO ranny wybiera **jedną** drogę —
  pomoc medyczna albo ciało leczy się samo — **przed** jakimkolwiek rzutem. Kto wybrał ciało, rzucił
  i oblał, temu na medyka tego dnia już za późno.
- Dzień z medykiem **nie dotyka licznika** (+1 jak każdy DO, bez zerowania), **chyba że** tego dnia
  należał się RO Regeneracji — wtedy licznik stoi: dzień się nie liczy, RO czeka na następny DO.
- Warunki RAW: leczący biegły w Medycynie, ma narzędzia małego medyka. Skutek: −1 Stopień,
  **bez testu**. Tylko w ramach DO — w „bezwymiarowej przestrzeni odpoczynku”, jak inne zajęcia
  (`actors/rest-activities.mjs`); nigdy w walce.
- **WKK: kosztuje jeden ładunek narzędzi** i **zajmuje oboje** — leczącego i pacjenta (D7).
  „Dno torby” (Aspiryna i Miętusy) obejmuje „opiekowanie się rannymi” z pustą torbą, więc taki
  medyk ładunku nie zużywa — wynika z RAW, nie wymaga decyzji.
- NOE bez Kobaltu: bez ładunku (U13).

**D5 — Wyczerpanie z Krytycznego Stopnia — trzy warstwy.**
- **NOE (RAW):** zwykłe Wyczerpanie. DO zdejmuje jeden poziom dowolnego Wyczerpania (s. 35, 46);
  uporczywe są tylko rodzaje z zapisanym wyjątkiem (Odwodnienie, Niedożywienie) — Zranienie do nich
  nie należy.
- **RAI (orzeczenie autora systemu, 2026-10-06):** zejście z Krytycznego (4) na Poważny (3) zdejmuje
  poziom Wyczerpania ze Zranienia, jeśli jeszcze jest.
- **WKK (reguła stołu, „i może kiedyś errata”):** Wyczerpanie ze Zranienia jest **uporczywe** — DO go
  nie zdejmuje; schodzi tylko z zejściem z Krytycznego. Ponowne wejście w Krytyczny nadaje je znowu.
- Koszt WKK w liczbach (§7.8): przy RO KON +0 mediana gojenia z Krytycznego rośnie z 20 do 22 DO.

**D6 — silnik okoliczności ataku: pełny zakres w M1.** Silnik + źródła M1 + stany atakującego i celu
+ auto-krytyk; przeniesienie dziewięciu starych wstrzyknięć (F6) jako ostatni krok etapu, po
zielonym e2e.

**D7 — WKK „zajmuje oboje”: cały DO, jeden pacjent.** Leczący opatruje dokładnie jednego pacjenta
na DO i żadne z nich nie bierze tego DO innych zajęć (produkcja, naprawa, czyszczenie broni,
gotowanie, polowanie). W rejestrze zajęć: Pomoc medyczna zajmuje cały budżet obojga.

**D8 — samoleczenie.**
- **NOE (RAW): nie.** „Otrzymanie fachowej pomocy medycznej” opisuje dwie osoby.
- **WKK: tak, z testem ST 20; porażka dodaje Stopień Zranienia.** Zasady pochodne (domyślne, do
  weta MG): test to **Test Inteligencji (Medycyna)** — ta sama umiejętność, która warunkuje Pomoc
  medyczną; ładunek schodzi także przy porażce (opatrunek zużyty); cały DO zajęty jak w D7; to droga
  „medyk”, więc licznik Regeneracji działa jak w D4 (stoi, gdy należał się RO); dodany Stopień nie
  zeruje licznika (D3). **Uwaga:** porażka przy Krytycznym to piąty Stopień, czyli śmierć — przez
  kartę „Śmierć” (D1); okno DO ostrzega przed wyborem tej drogi przy Krytycznym. Test k20, więc
  Fuks wolno (s. 17).

**D9 — kalendarzyk: okienko z dwoma wierszami, tylko do odczytu.** „Samo ciało” / „Z pomocą
medyczną co DO”; dzień bieżący z kalendarza świata; podział na tygodnie; bez interakcji (przewijanie
paska dni dozwolone). Szczegóły §7.8.

**D10 — widok Wyczerpania: koło, a uporczywe — koło w kwadratowej ramce.** Każdy poziom to ta sama
pipka (koło); uporczywość to modyfikator dołożony do niej, nie inny kształt — „to samo, ale
zablokowane”. Uporczywe z lewej, skrajne prawe koło bez ramki schodzi przy następnym DO.
Szczegóły §7.9.

### 6.2 Ustalone w projekcie (jedno sensowne wyjście)

- **U1 Jeden magazyn stanu umierania** — natywne pola dnd5e: `hp.value`, `death.success/failure`,
  statusy `unconscious`, `stable`, `dead`. Moduł dokłada tylko lejek zapisu i widoki (wzorzec
  Zranienia). `_stabilise` medyka przechodzi przez lejek (F4).
- **U2 Obrażenia przy 0 PW bez kontekstu** (pasek PW, makro): jedna porażka; karta pokazuje
  „+1 (atak wręcz)” jako przycisk dla MG.
- **U3 „Jedno zdarzenie” Olbrzymich obrażeń** = jedno nałożenie jednej karty obrażeń na jeden cel
  (wszystkie części obrażeń razem); ręczna zmiana PW = jedno zdarzenie.
- **U4 Nieprzytomność kończy się** przy przejściu z 0 PW na > 0 — tylko ta nałożona przez zejście
  do 0 (znacznik pochodzenia). Sen i Nokautowanie (1 PW + Nieprzytomność) zostają nietknięte.
- **U5 1k8 h stabilnego** — rzut ślepy dla MG w chwili stabilizacji, termin zapisany na aktorze;
  rozstrzyga hak przesunięcia czasu świata (MG). Zegar stoi → nic się nie dzieje (doktryna
  `world-clock.mjs`).
- **U6 DO przy 0 PW** — odmowa w haku `dnd5e.preLongRest` z wyjaśnieniem i podpowiedzią (stabilny
  odzyska 1 PW po 1k8 h; przesuń zegar). Wynika z tego: pacjent przy 0 PW nie dostanie też Pomocy
  medycznej ani nie doliczy DO do licznika.
- **U7 „Wróg, który cię widzi”** = żeton o przeciwnej dyspozycji, nieukryty, bez Nieprzytomności /
  Oślepienia / Pochwycenia / Sparaliżowania / Unieruchomienia, Szybkość > 0. Wzrok przybliżony
  Oślepieniem — linia widzenia przez ściany poza zakresem (koszt R2, którego nie płacimy).
- **U8 Bieganie i Unikanie jako statusy** (jak istniejący znacznik `dodging`), przełączane z HUD
  żetonu i z karty; zdejmowane na początku następnej tury właściciela. Strona obronna Biegania
  („do końca bieżącej tury”) to warunek „cel biegnie i trwa jego tura” — dotyczy tylko reakcji i
  Wyczekania, więc bez drugiego efektu. Szybkość ×3 — informacyjnie (moduł nie pilnuje ruchu).
- **U9 Osłona przy ataku wręcz** — wiersz osłony w oknie ataku wręcz, domyślnie „Brak”, bez
  osobnego okna i bez „przez osłonę”. Przy dystansowych bez zmian.
- **U10 Źródła Wyczerpania** dostają regułę zdejmowania zamiast samego `restClears`, wg §1 pkt 2;
  jedna funkcja `regulaZdejmowania(zrodlo, { kobalt })` — czytają ją odpoczynek, widok (§7.9) i
  kalendarzyk (§7.8):
  - zwykły DO (−1): `bezsennosc`, `kac`, `forsowanie`, `ogolne`, `przemarznie`, `uduszenie`,
    `skazenie`, `zranienie` (NOE);
  - uporczywe do warunku: `odwodnienie` (napój), `niedozywienie` (jedzenie), `zranienie` (WKK:
    zejście z Krytycznego);
  - dodatkowe wyjścia, wszystkie naraz: `przemarznie` (DO w cieple), `uduszenie` (oddech), `skazenie`
    (RadOff — sprawdzić, czy chemia już to robi), `zranienie` (RAI: zejście z Krytycznego);
  - bez zmian w M1: `choroba` (wg choroby), `deadline` (wg źródła).
- **U11 Staza** — przedmiot z akcją Używanie → stabilizacja przez lejek (S, etap E2).
- **U12 Rzut przeciw śmierci = czysta k20** — `preRollDeathSave` zdejmuje wszystkie części poza kością
  i tryb przewagi/utrudnienia (F12); karta bez przycisku Fuksa.
- **U13 Pomoc medyczna, NOE bez Kobaltu:** nie zużywa ładunku (RAW wymaga „posiadania” narzędzi;
  zapas jest „na pięciokrotne leczenie”, czyli przywracanie PW). Leczącym może być BN (lekarz
  w osadzie) — MG wybiera „BN” zamiast medyka drużyny; jego zapasy i cena to sprawa MG.
- **U14 Który poziom zdejmuje zwykły DO** (F13). RAW mówi tylko „−1 poziom”; wybór źródła to
  artefakt śledzenia źródeł, więc bierzemy kolejność, która nigdy nie szkodzi graczowi: najpierw
  poziomy bez innego wyjścia (Bezsenność, Kac, Forsowanie, Ogólne), potem te z dodatkowym wyjściem
  (Przemarznięcie, Uduszenie, Skażenie, Zranienie w NOE); w obrębie grupy — najstarszy. Uporczywe
  nigdy. Ta sama kolejność rządzi widokiem (§7.9) i kalendarzykiem (§7.8).

---

## 7. Projekt

### 7.1 Czyste zasady — `config/umieranie-rules.mjs`, `config/rekonwalescencja-rules.mjs` (bez Foundry, warstwa 1)

- `porazkiZaObrazenia({ pwPrzed, obrazenia, wrecz })` → 0 / 1 / 2
- `olbrzymieObrazenia({ obrazenia, maksPW })`, `smiercZMaksPW(maksPW)`
- `stabilnyGodziny()` → formuła `1d8`
- `regeneracjaPoDO({ licznik, droga })` → `{ licznik, rzutNalezny }` — droga `"cialo"`: licznik + 1,
  rzut należny przy ≥ 3; droga `"medyk"`: licznik + 1, chyba że tego dnia należał się rzut — wtedy
  bez zmian (D4)
- `regeneracjaPoRzucie({ licznik, sukces })` → sukces: 0; porażka: bez zmian
- `regulaZdejmowania(zrodlo, { kobalt })`, `kolejnoscDO(zrodla, { kobalt })` (U10, U14)
- `szansaRO({ premia, tryb, wyczerpanie, st })` — bez naturalnej 20/1 (s. 16), z Ułatwieniem /
  Utrudnieniem
- `prognozaZdrowia(…)` (§7.8) — składa się wyłącznie z funkcji wyżej, więc prognoza i żywe reguły
  nie mogą się rozjechać
- `oddechTur(modKON)`, `stMrozu(tempC)`, `stSnu()` = 20

### 7.2 Umieranie — `combat/umieranie.mjs`

Maszyna stanów per aktor: **przytomny → umierający → stabilny → przytomny**, plus **martwy**.
Lejek: `wejdzWUmieranie`, `dodajPorazki`, `stabilizuj`, `ocuc`, `zaproponujSmierc(przyczyna)`,
`potwierdzSmierc`. Przejmuje Nieprzytomność z `zranienie.mjs` (Stopień zostaje tam).
Maszyna obejmuje BG oraz BN wprowadzonych kartą (D2; flaga epizodu na aktorze).

Haki: `preUpdateActor` / `updateActor` (zejście do 0 i powrót > 0) · `dnd5e.preApplyDamage`
(PW przed) · `dnd5e.applyDamage` (porażki, Olbrzymie obrażenia, wznowienie stabilnego) ·
`dnd5e.rollDeathSave` (trzy sukcesy → `stabilizuj` zamiast resetu dnd5e; trzy porażki →
`zaproponujSmierc("rzuty")`) · `dnd5e.preRollDeathSave` (blokada, gdy stabilny; czysta k20 — U12) ·
aktualizacja maks. PW (= 0 → śmierć).

**Karta „Umiera”** — jedna na epizod, aktualizowana na żywo: tor sukcesów i porażek, przyczyna
zejścia, przyciski: [Rzut przeciw śmierci] (właściciel), [Stabilizuj — Medycyna ST 10] (postać
gracza, który kliknął; akcja Pomaganie; zapis przez przekaźnik), [Mały medyk], [Staza]; dla MG
[+1 porażka (wręcz)] (U2). Wzór: karta Krwawienia (`combat/bleeding.mjs`, przycisk Medycyny).

**Karta „Śmierć”** (D1) — przyczyna, liczby, przy rzutach Ostatnia akcja; [Potwierdź] → `dead`,
„Pokonany” w walce; [Cofnij] → stan sprzed.

**Karta „BN pada”** (D2) — tylko dla MG; BN już `dead`; [Rzuty przeciw śmierci] → zamiana na
Nieprzytomność + Stopień za 0 PW + `wejdzWUmieranie`. Ten sam przycisk w panelu Stan BN.

### 7.3 Stabilizacja

Magazyn: status `stable` (polska nazwa „Stabilny”). Źródła przez `stabilizuj`: trzy sukcesy,
Pomaganie + Medycyna ST 10, medyk bez biegłości, Staza. Termin 1 PW zapisany na aktorze (U5);
hak `updateWorldTime` (MG) → 1 PW, `ocuc`, linia na czacie. Obrażenia stabilnego → zdjęcie
`stable` + porażki (§7.2).

### 7.4 Neutralizacja Stopnia Zranienia

Klient rejestru zajęć odpoczynku (`actors/rest-activities.mjs`), tylko DO.

**Rekonwalescencja** (sekcja u każdego rannego): licznik n/3 (D3), wybór drogi na ten DO:
**[Ciało]** / **[Pomoc medyczna: ‹medyk drużyny | BN›]** (D4) i odnośnik do kalendarzyka (§7.8).
Walidacja medyka: biegłość w Medycynie, narzędzia małego medyka, a z Kobaltem — ładunek albo
„Dno torby”; medyk zajęty innym pacjentem / pacjent zajęty innym medykiem — niedostępny (D7).

**Opieka medyczna** (sekcja u medyka): pacjent, który go wybrał — widok tej samej pary, nie drugie
źródło prawdy. Z Kobaltem para zajmuje cały budżet zajęć obojga (D7), a ładunek schodzi
w `dnd5e.restCompleted` (anulowany DO nic nie zjada — reguła rejestru).

**Samoleczenie** (tylko z Kobaltem, D8): u rannego medyka trzecia droga **[Sam sobie: Medycyna
ST 20]**; przy Krytycznym z ostrzeżeniem „porażka = piąty Stopień = śmierć”. Po DO karta z
przyciskiem testu dla właściciela; sukces −1 Stopień, porażka `applyZranienie` („Samoleczenie”);
ładunek schodzi w obu przypadkach.

**Po DO:** droga ciało z należnym rzutem → karta z przyciskiem [RO na Kondycję ST 15] dla
właściciela (wybór drogi już zamknięty — „za późno na medyka”); droga medyk → −1 Stopień
(przekaźnik). Licznik wg `regeneracjaPoDO` / `regeneracjaPoRzucie`; flaga aktora
`rekonwalescencja = { licznik }`. Kolejność w obrębie DO: najpierw Wyczerpanie −1 (U14), potem
RO — rzut widzi Wyczerpanie już po odpoczynku.

**Wyczerpanie z Krytycznego** (D5): `applyZranienie` na Krytyczny nadaje je jak dziś; spadek z
Krytycznego (z dowolnej drogi i z ręcznych pipek) zdejmuje je, jeśli jest (RAI); uporczywość —
tylko z Kobaltem (`regulaZdejmowania`).

### 7.5 Okoliczności ataku — `config/okolicznosci-ataku.mjs` (czyste) + `combat/okolicznosci.mjs`

Wejście: stan atakującego, stan celu, odległość, zasięgi broni, wręcz / dystans, wrogowie w
promieniu 1,5 m. Wyjście: `{ ulatwienia: [powód], utrudnienia: [powód], autoKrytyk: powód | null }`.
Jeden hak `dnd5e.preRollAttack` ustawia domyślne `advantage` / `disadvantage` (oba → zwykły rzut,
reguła 5e) i zapisuje `roll.options.neuroOkolicznosci`; jedna grupa plakietek na karcie ataku +
dymek z rozkładem, jak dymek TT („Ułatwienie: Współpraca · Utrudnienie: zasięg daleki — znoszą
się”). Auto-krytyk wchodzi do werdyktu rozstrzygacza (`combat/trafienie.mjs`), więc dalej płynie
sam: Stopień Zranienia (`isCriticalHitOn`), podwojenie kości obrażeń. Odległość — pomiar jak
w `pack-tactics.mjs`, od krawędzi żetonów. Ostatni krok (D6): stare wstrzyknięcia (F6) stają się
źródłami silnika, ich testy zostają; `conditionEffects.attackDisadvantage` (F1) — usunięte.

### 7.6 Akcje: Bieganie, Unikanie

Statusy `bieganie` i istniejący `dodging` (U8); silnik czyta je jako źródła. Przyspieszenie —
tylko odnośnik (T0), bo dotyczy ruchu, którego moduł nie pilnuje.

### 7.7 Zagrożenia — przyciski MG obok Skażenia

- **Uduszenie:** status z fazą „wstrzymuje oddech (zostało N tur)” / „dusi się”; koniec tury
  właściciela → odliczanie albo +1 Wyczerpanie (`uduszenie`); zdjęcie statusu = złapanie oddechu
  → zdjęcie wszystkich poziomów z tego źródła. Obrażenia przy wstrzymanym oddechu → karta RO KON
  ST 10.
- **Przemarznięcie:** okno MG: temperatura °C, liczba godzin, zaznaczone żetony; per postać
  „ciepło ubrany” (pomija), śpiwór (sukces), koc (Ułatwienie) → N rzutów, źródło `przemarznie`.
  W oknie DO pole „w cieple” → zdjęcie wszystkich poziomów z tego źródła (U10).
- **Sen:** przycisk „Doba bez snu” dla zaznaczonych → RO KON ST 20 → `bezsennosc`.

### 7.8 Kalendarzyk zdrowia

**Po co.** Gracz nie policzy w głowie, kiedy wyzdrowieje: licznik trzech DO, RO ST 15 z karą −2 za
każdy poziom Wyczerpania, który sam schodzi z każdym DO, zero naturalnej 20, powtórki po porażce,
reset po sukcesie, a do tego wybór medyka na każdy dzień. Z Krytycznego, bez medyka:

| RO na Kondycję | NOE: najszybciej / zwykle / 9 na 10 | WKK (Wyczerpanie Krytycznego uporczywe) |
|---|---|---|
| +5 | 12 / 15 / 19 DO | 12 / 15 / 19 DO |
| +2 | 12 / 17 / 23 | 12 / 18 / 25 |
| +0 | 12 / 20 / 29 | 12 / 22 / 32 |
| −1 | 12 / 23 / 33 | 12 / 25 / 38 |

Z medykiem co DO: **4 DO** (z Kobaltem — 4 ładunki). Do dwóch innych poziomów Wyczerpania nie
zmienia nic — znikają, zanim padnie pierwszy rzut (trzeci DO). **Najgorszego przypadku nie ma**:
porażki mogą się powtarzać bez końca (99 na 100 mieści się w 23–53 DO), więc zamiast „najgorzej”
pokazujemy „9 na 10”.

**Rachunek.** `prognozaZdrowia({ stopien, licznik, zrodlaWyczerpania, szansa, kobalt, droga, maxDO })`
— dokładny rozkład (programowanie dynamiczne po stanach Stopień × licznik × Wyczerpanie, DO po DO),
bez Monte Carlo; stan jest malutki, wynik deterministyczny i testowalny. Szansa RO z karty aktora
(premia do RO KON, Ułatwienie / Utrudnienie), minus aktualne Wyczerpanie w danym dniu. Wynik:
dla każdego DO — szansa „zdrowy” (Stopień 0 i zero Wyczerpania schodzącego odpoczynkiem) oraz
progi: najszybciej / zwykle (½) / 9 na 10; osobno dla każdego Stopnia po drodze.

**Założenia, pokazane w oknie:** codzienny DO (dni bez DO po prostu przesuwają termin, D3); Fuksy
pominięte (przerzut RO to wybór gracza); uporczywe Wyczerpanie z warunkiem zewnętrznym (woda,
jedzenie) — nie ustępuje, z dopiskiem „zależy od…”; nowe rany, choroby i zmiany premii unieważniają
prognozę — liczona na nowo przy każdym otwarciu.

**Widok** (D9): przycisk przy torze Stopnia w panelu Stan → okienko tylko do odczytu, dla
właściciela i MG:
- dwa wiersze: **„Samo ciało”** i **„Z pomocą medyczną co DO”** (z Kobaltem dopisek z liczbą
  ładunków); w każdym najszybciej / zwykle / 9 na 10 jako liczba DO i data świata;
- **dzień bieżący z kalendarza świata** (`game.time.calendar`, formatowanie `formatWorldTime`
  z `world-clock.mjs` — ta sama data, co w widżecie kalendarza i na czacie), daty przy założeniu
  odpoczynku bez przerwy;
- pod wierszami pasek dni barwiony szansą „zdrowy”, **z podziałem na tygodnie** (dzień tygodnia
  z `timeToComponents`; długość tygodnia z kalendarza świata) i znacznikami trzech progów oraz
  zejścia każdego Stopnia; pasek przewija się w poziomie, nic poza tym nie jest klikalne;
- słowa dla gracza, nie statystyka: „zwykle”, „prawie na pewno (9 na 10)”; szansa 0% → „samo się
  nie zagoi, dopóki…” zamiast daty;
- poza v1: wiersz „Sam sobie medykiem” (D8) — prognoza musiałaby pokazywać ryzyko śmierci przy
  Krytycznym; planer dni z medykiem.

### 7.9 Wyczerpanie na karcie — uporczywe i przejściowe

Dziś pipki różnią się tylko barwą źródła (F14). Potrzeba (MG): od pierwszego spojrzenia odróżnić
poziomy, które zejdą odpoczynkiem, od tych, które nie zejdą. Rozumiemy: **uporczywe** = zwykły DO
ich nie zdejmuje (potrzebny warunek); **przejściowe** = zdejmuje je DO.

Wybrany wariant (D10) — koło z ramką:
- każdy poziom to **koło** w barwie źródła; uporczywe dostaje **kwadratową ramkę** wokół koła —
  modyfikator tej samej pipki, nie inny znak (czytelny bez rozróżniania barw);
- ramka w jednym neutralnym tonie dla wszystkich źródeł (token `--neuro-color-uporczywe`), żeby
  czytała się zawsze tak samo: „zablokowane”, niezależnie od tego, skąd poziom pochodzi;
- CSS: ramka jako `::before` pipki (`position: absolute`, kilka pikseli na zewnątrz, małe
  zaokrąglenie rogów) — nie `outline` ani `box-shadow`, bo te w Chrome idą za `border-radius`
  i dałyby okrąg. Każda pipka zajmuje miejsce jak z ramką, więc tor nie skacze, gdy ramka się
  pojawia lub znika; ramka nie gryzie się z poświatą `.terminal.filled`;
- kolejność pipek = kolejność zdejmowania (U14): uporczywe z lewej, przejściowe w prawo, **skrajna
  prawa schodzi przy następnym DO** — tor „opróżnia się od prawej”;
- dymek pipki: źródło + droga wyjścia, słowami gracza: „Zejdzie przy następnym Długim odpoczynku” /
  „Uporczywe — zejdzie, gdy wypijesz dzienną porcję wody” / „Wszystkie naraz: Długi odpoczynek
  w cieple” / „Uporczywe (WKK) — póki Stopień Zranienia jest Krytyczny”;
- ten sam znak na karcie drużyny (`party-sheet.mjs`); ikona na żetonie bez zmian (cyfra poziomu);
- sam CSS, bez nowych grafik (żadnego wiersza w `dev/icons/MISSING.md`); jeśli wariant użyje glifu
  Font Awesome — rodzina z tej instalacji (FA 7), nie „Font Awesome 6”.

---

## 8. Etapy

Kolejność: częstość przy stole × koszt błędu, z zależnościami (silnik przed Bieganiem;
auto-krytyk wspiera umieranie; reguły Wyczerpania przed kalendarzykiem).

| Etap | Zakres | Rozmiar | Gotowe gdy |
|---|---|---|---|
| **E0** | Czyste zasady §7.1 + testy warstwy 1 (w tym `prognozaZdrowia` sprawdzona tabelą z §7.8) | S–M | zielone `npm test` i Quench |
| **E1** | Umieranie §7.2: porażki przy 0 PW, Olbrzymie obrażenia, maks. PW 0, koniec Nieprzytomności, karty „Umiera”, „Śmierć”, „BN pada”, czysta k20 (U12) | M | e2e `umieranie` zielone |
| **E2** | Stabilizacja §7.3 + Staza + DO przy 0 PW | M | j.w., gałąź stabilizacji i 1k8 h |
| **E3** | Okoliczności ataku §7.5: silnik, zasięg daleki, dystansowy w zwarciu, stany, auto-krytyk, osłona wręcz (U9); na końcu przeniesienie F6 | M–L | e2e `combat` rozszerzone o zasięg i stany; jedna grupa plakietek dla wszystkich źródeł |
| **E4** | Bieganie, Unikanie §7.6 | S | j.w. |
| **E5** | Wyczerpanie: reguły zdejmowania (U10), kolejność DO (U14), warstwa WKK, widok §7.9 | S–M | testy warstwy 1–3; pipki na karcie postaci i drużyny |
| **E6** | Neutralizacja §7.4 (NOE + WKK, w tym samoleczenie D8) + kalendarzyk §7.8 | M | e2e `rekonwalescencja` z Kobaltem i bez |
| **E7** | Zagrożenia §7.7 | M | testy warstwy 1–3; ręczny przebieg MG |
| **E8** | Rejestry, macierz, `docs/` dla graczy, `scripts/wkk/README.md` (RAI i WKK — §10), `PLAN_beta.md` M1 odhaczone | S | B7 dla tych wierszy |

**Sesje: E0–E2, potem E3–E4 (silnik może dostać własną), potem E5–E8.**

### Testy

- Warstwa 1: każda funkcja z §7.1 i §7.5 (tablice przypadków z RAW, w tym przykłady z podręcznika
  i decyzje D3–D5 jako przypadki brzegowe; `prognozaZdrowia` — tabela §7.8 jako wynik oczekiwany).
- Warstwa 6 (e2e, świat-piaskownica, `dev/e2e/`):
  - **`umieranie`** — BG zbity do 0 tacką MG; cios wręcz w leżącego (2 porażki + auto-krytyk →
    Stopień); drugi gracz (osobne logowanie) stabilizuje przyciskiem; zegar +8 h → 1 PW i koniec
    Nieprzytomności; leczenie zeruje liczniki; Olbrzymie obrażenia → karta → [Cofnij]; BN do 0 →
    `dead` + karta → [Rzuty przeciw śmierci].
  - **`rekonwalescencja`** — dwa przebiegi, z Kobaltem i bez: trzy DO → RO; porażka → RO po
    następnym DO; dzień z medykiem przy należnym RO → licznik stoi; Krytyczny → Poważny zdejmuje
    Wyczerpanie ze Zranienia; z Kobaltem DO go nie zdejmuje, a ładunek schodzi; bez Kobaltu
    odwrotnie; z Kobaltem medyk z pacjentem nie dostaje innych zajęć, a samoleczenie oblane dodaje
    Stopień; kalendarzyk przed i po zgadza się z licznikiem.
  - **`combat`** — zasięg daleki i dystansowy w zwarciu jako domyślne Utrudnienie z plakietką.
- Bez związku z M1, ale ta sama sesja e2e: brakujące w B6 zestawy (postać od zera przez awans,
  ogień ciągły KS) — `PLAN_beta.md` M0.

---

## 9. Poza planem

- Krwawienie wg Kolorów Neuroshimy (ten sam wzorzec „Pomaganie + Medycyna ST 10”, s. 201–202) —
  po becie, z Kolorami.
- Linia widzenia przez ściany dla „widzi cię” / Unikania (U7).
- Pilnowanie budżetu ruchu (Bieganie, Przyspieszenie, Stopień Lekki).
- Automatyczne zakłócenie odpoczynku (F9) — świadomie notatka.
- Kalendarzyk dla chorób (przebieg chorób ma własne zasady).

## 10. Po wdrożeniu — do zaktualizowania

- `IMPLEMENTATION.md` macierz: wiersze Osłona, „stany” (🟡 do E3), Neutralizacja, rzuty przeciw
  śmierci, Bieganie i Utrudnienie, Sen, Uduszenie / Przemarznięcie.
- `scripts/wkk/README.md`: tabela RAI — „Zejście z Krytycznego zdejmuje Wyczerpanie ze Zranienia”;
  tabela WKK — plik z regułami rekonwalescencji Kobaltu (Wyczerpanie ze Zranienia uporczywe; Pomoc
  medyczna: ładunek, cały DO i jeden pacjent; samoleczenie: Medycyna ST 20, porażka dodaje Stopień),
  np. `wkk/config/rekonwalescencja-kobalt.mjs`, czytany przez
  gospodarza tylko przy `isKobaltEnabled()` (wzorzec `wkk/config/doll-kobalt.mjs`).
- `PLAN_beta.md` M1 — odhaczyć. `docs/` — strona gracza „Umieranie i powrót do zdrowia” (z kalendarzykiem).

## 11. Postęp

**2026-10-07 — E0–E2 zrobione.** Szczegóły w changelogu `IMPLEMENTATION.md`; tu tylko to, co
wdrożenie dołożyło do planu.

- **E0:** `config/umieranie-rules.mjs`, `config/rekonwalescencja-rules.mjs`,
  `wkk/config/rekonwalescencja-kobalt.mjs`; paczki Quench `umieranie` (16) i `rekonwalescencja` (28).
  `prognozaZdrowia` odtwarza tabelę §7.8 co do dnia, w obu warstwach, bez strojenia — model planu i
  model kodu zgadzają się niezależnie. `szansa` to `{ premia, tryb, st }` (tryb jak `ADV_MODE` dnd5e).
  Odpoczynek dalej czyta `restClears` — przełączenie na `regulaZdejmowania` to E5.
- **E1–E2:** `combat/umieranie.mjs`, `items/staza.mjs`; Stopień za 0 PW i Nieprzytomność przeszły z
  `zranienie.mjs`, Ostatnia akcja z `knockout.mjs`, `_stabilise` medyka przez lejek. e2e `umieranie`
  (14 kroków) zielone i sprawdzone mutacjami; Quench 818/818 (kampania i piaskownica).
- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Olbrzymie obrażenia* liczą kwotę nałożenia po odpornościach, razem z tym, co wchłonęły
    tymczasowe PW („otrzymasz obrażenia”), wobec **efektywnych** maks. PW (po zmniejszeniu).
    Karta i tak jest T2.
  - *[Mały medyk] na karcie „Umiera”* stabilizuje automatycznie każdego, kto ma narzędzia — RAW
    s. 135: bez biegłości „automatycznie”, z biegłością „**też**” przywracanie PW. ST 10 z nagłówka
    zestawu (s. 135) nie użyty — kłóci się z tekstem.
  - *[Cofnij]* na karcie „Śmierć”: propozycja — odrzucona; potwierdzona — zdejmuje `dead`; przy trzech
    porażkach tor wraca do stanu sprzed ostatniego zdarzenia (inaczej dnd5e nie pozwala rzucać dalej).
  - *Karta „Śmierć”* jest szeptem do MG; stół widzi linię „nie żyje” dopiero po [Potwierdź].
    Ostatnią akcję rozgrywa się przed potwierdzeniem.
  - *Wyczerpanie 6*: dnd5e dopisywał efektowi Wyczerpania status `dead` sam
    (`_prepareExhaustionLevel`) — owinięte, decyduje karta (D1).
  - *Rzut przeciw śmierci* idzie bez okna konfiguracji (nie ma czego ustawiać — U12).
  - *Wykonawca:* haki odpalające u wszystkich działają u aktywnego MG; funkcje lejka wołane wprost —
    u dowolnego MG. Dwie karty tego samego MG (ten sam użytkownik) obie są „aktywnym MG” — każda
    automatyka modułu odpala wtedy podwójnie (żywo: przedmioty BN upuszczone dwa razy). To nie jest
    błąd M1, ale ograniczenie całego wzorca `activeGM`.
- **Zostaje na E3:** auto-krytyk ≤ 1,5 m w Nieprzytomnego (krok e2e „cios wręcz w leżącego” sprawdza
  dziś tylko dwie porażki). *Zrobione w E3, niżej.*

**2026-10-07 — E3–E4 zrobione.** `config/okolicznosci-ataku.mjs` (czysty silnik, tabela źródeł),
`combat/okolicznosci.mjs` (migawka, jeden hak, plakietki, rejestr źródeł), auto-TK w `resolveHit` i w
rzucie obrażeń (`combat/obrona.mjs`), osłona wręcz (`combat/cover.mjs`), status `bieganie`, przełączniki
Unikanie/Bieganie w panelu Stan. Paczka Quench `okolicznosci` (23); e2e `combat` (zasięg daleki,
zwarcie, Unikanie celu, Bieganie z karty, Udźwig przez rejestr) i `umieranie` (auto-TK → Stopień),
sprawdzone mutacją; Quench 836/836 w piaskownicy.

- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Poza zasięgiem dalekim* — plakietka-uwaga „atak chybia”, nie automatyczne pudło: pomiar od krawędzi
    żetonów bywa nieprecyzyjny, a fałszywe pudło jest gorsze od braku wykrycia.
  - *Pochwycenie* — pochwytującego zna tylko lalka (zajęta ręka BG). Gdy nie wiadomo, kto trzyma: cel
    dalej niż 1,5 m — Utrudnienie (nie może być pochwytującym); bliżej — uwaga „decyduje MG”.
  - *Niewidoczność atakującego* — Ułatwienie z dopiskiem „chyba że cel cię widzi” (zmysły specjalne są
    poza zasięgiem modułu; okno rzutu pozwala to cofnąć).
  - *Kilka celów* — tylko źródła atakującego wchodzą do trybu; stany i zasięg celów — uwaga na karcie.
    Auto-TK liczy się per cel (to werdykt, nie tryb).
  - *Przełączniki Unikanie/Bieganie* w panelu Stan pokazują się tylko w trwającej walce, w której postać
    uczestniczy; Bieganie zablokowane przy Powaleniu (s. 30).
  - *F6 to sześć wstrzyknięć, nie dziewięć*: Obalająca daje Utrudnienie do RO, ulepszenia broni i Samuraj —
    premie liczbowe; tryb rzutu ustawiały tylko pancerz bez wyszkolenia, Udźwig, strzał jedną ręką,
    Współpraca, choroby i Upojenie 3. Wszystkie są teraz źródłami silnika (jedna grupa plakietek);
    informacyjne pigułki chwytu (zwolnienie, dwuręczna, oburęczna) zostały w `combat/grip.mjs`.
  - *F1*: `conditionEffects.attackDisadvantage` zostaje jako pusty zbiór, nie znika — gdyby dnd5e zaczął go
    czytać, brak klucza mógłby rzucić wyjątkiem, a pełny zbiór dublowałby silnik.
- **Znalezione przy okazji i naprawione:** `actors/udzwig-slowdown.mjs` i `actors/bez-dna.mjs` zapisywały efekt
  naraz u MG i u właściciela (wyścig create/delete); teraz jeden zapisujący. Fixture e2e `skirmish` kończy
  walki przed skasowaniem sceny (rdzeń `Combat#_clearMovementHistoryOnExit` pisał w żeton skasowanej
  sceny).
- **Środowisko:** Quench w świecie kampanii przy zalogowanym drugim MG (MG gracza aktywnym) daje
  czerwone testy tam, gdzie haki działają u aktywnego MG — trzy takie w paczkach Pochodni, magazynków i
  konserwacji broni. W piaskownicy (jeden MG) wszystko zielone.

**2026-10-07 — E5–E8 zrobione.** Szczegóły w changelogu `IMPLEMENTATION.md`; tu to, co wdrożenie
dołożyło do planu.

- **E5:** odpoczynek na `regulaZdejmowania` / `kolejnoscDO`; `restClears` usunięte. F15 naprawione
  jednym lejkiem zapisu (poziom z `_source`, poziom = długość listy). Widok §7.9 w panelu Stan i na karcie
  drużyny (ramka `::before`, sprawdzona zrzutem). Paczka Quench `wyczerpanie` (10).
- **E6:** `actors/rekonwalescencja.mjs`, kalendarzyk z panelu Stan. Paczka `rekonwalescencja-dzien` (14);
  e2e `rekonwalescencja` przechodzi całą pętlę w NOE i w WKK.
- **E7:** `actors/zagrozenia.mjs`. Paczka `zagrozenia` (8); e2e `zagrozenia` to przebieg MG zrobiony przez
  agenta (narzędzie w kontrolkach, gracz klika swoje) — ręczny przebieg człowieka nadal do zrobienia.
- **E8:** `docs/Umieranie-i-zdrowie.md`, sekcja okoliczności w `docs/TT-i-reakcje.md`, zasady Kobaltu 14–16,
  wiersze RAI i WKK w `scripts/wkk/README.md`, macierz i tabela plików `IMPLEMENTATION.md` (pliki M1 z E0–E4
  też — nie było ich tam), `PLAN_beta.md` M1 odhaczone. Quench 879/879; e2e `boot`, `combat`, `umieranie`,
  `rekonwalescencja`, `zagrozenia` zielone razem.

- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Odwodnienie / Niedożywienie* — „nie może zostać usunięte, dopóki nie wypije / nie zje” czytane jako:
    uporczywe, póki aktor nosi znacznik `dehydration` / `malnutrition`; pełna racja w dziennym
    zapotrzebowaniu zdejmuje znacznik i od tego dnia poziomy schodzą zwykłymi DO (w grupie bez wyjścia).
    Poziom z tego źródła dodany ręcznie zapala znacznik.
  - *Taurus* („usuwa 1 poziom Wyczerpania”) — najnowszy poziom, który da się zdjąć; uporczywego nie rusza
    („nie może zostać usunięte” dotyczy każdego sposobu).
  - *Rozjazd danych (F15)* — nadmiar źródeł ponad poziom: odcinamy najnowsze (to ich poziomy zgubił
    wyścig); brak — dopełniamy wpisem „Ogólne (źródło nieznane)”.
  - *Droga na DO jako plan* — wybór z okna zostaje na pacjencie i obowiązuje przy kolejnym DO bez okna
    (odpoczynek drużyny). Medyk widzi u siebie „Opiekę medyczną” z tego samego planu.
  - *Medyk* — kandydaci: członkowie głównej drużyny dnd5e, bez niej postacie graczy; nieprzytomny medyk
    nikogo nie opatrzy; w NOE bez limitu pacjentów na medyka (D7 to WKK). Medyk, który w chwili DO nie
    spełnia warunków (np. pusta torba w WKK), nie opatruje — dzień liczy się jak ciało, z linią na karcie.
  - *Ładunek cudzego zestawu* (WKK) — przez przekaźnik MG; bez zalogowanego MG czeka, aż MG wejdzie.
  - *Karta RO* — rzut, którego nie było przed następnym DO, przepada; nowy DO daje nową kartę.
  - *Samoleczenie przy Krytycznym* — porażka to karta „Śmierć”; przerzut na sukces przywraca Stopień,
    ale kartę „Śmierć” odrzuca MG ([Cofnij]) — automat jej nie zamyka.
  - *Licznik na kartach* — po oblanym RO pokazujemy „3/3” zamiast „4/3” (RO po każdym DO).
  - *Kalendarzyk* — dwa paski dni (ciało i medyk) zamiast jednego; data dnia n = dziś + n dób.
  - *Narzędzie zagrożeń* — w kontrolkach żetonów obok Zachodu słońca i Spadania, nie „obok Skażenia”:
    Skażenie nie ma narzędzia MG (jego RO to wiersz panelu Stan właściciela), a mróz i sen działają na
    zaznaczonych żetonach.
  - *Uduszenie* — odliczanie i poziomy tylko w walce (koniec tury); poza walką MG prowadzi to oknem.
    Pierwszy poziom na końcu pierwszej tury bez powietrza, nie tej, w której się skończyło.
  - *Mróz* — śpiwór i koc zaznaczone z góry, gdy postać ma przedmiot o takiej nazwie; decyduje MG.
- **Znalezione przy okazji i naprawione:** Fuks na rzucie, którego autorem jest MG — `update` cudzej
  wiadomości rzucał wyjątek po zjedzeniu Fuksa, hak `neuroshima.rerolled` nie odpalał, pasek wracał.
  Dotyczyło już RO Niedożywienia z zapasów drużyny; przy zagrożeniach (rzuca MG) byłoby stałe.

**2026-10-07 — przegląd MG po E8.** „Samo ciało” nazywa się teraz **„Gojenie”** (D9 i §7.8 piszą starą
nazwę — decyzje zostają, zmienia się tylko etykieta). Wszystkie znaczniki czasu stanu gry to **czas
świata** (decyzja MG: „zawsze czas gry”); wiek poziomu Wyczerpania (U14) liczony z niego. Skażenie w
panelu Stan wyciszone, kreski z dymkami.
- **Rozstrzygnięte przez MG (2026-10-07):**
  - *„Brak korzyści z odbycia Długiego i Krótkiego odpoczynku”* (Choroba popromienna, Szczurza gorączka):
    DO się odbywa, korzyści z listy s. 45 (KW, PW, Cechy, zdolności, −1 Wyczerpanie) odebrane;
    neutralizacja Stopnia to osobny podrozdział — Regeneracja i Pomoc medyczna liczą ten dzień. KO
    dalej odwołany (jego korzyść to KW wydawane w oknie).
  - *Kalendarzyk liczy dzienny RO choroby* — dzień bez korzyści, poziom za porażkę, śmierć przy szóstym.
  - *Dni chorób na zegarze świata* — jeden zegar dla wszystkiego; blokada odpoczynku to doba gry.
  - Przy okazji: RO Zachodu słońca dostał karę za Wyczerpanie (ręczny `1d20` ją omijał).
