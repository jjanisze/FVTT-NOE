# PLAN — M6: Biegłości profesji, broń improwizowana, obiekty i woda

> Status: **PROJEKT** (2026-10-25). Decyzje MG D1–D12 z dwóch rund pytań (§4); ustalenia projektu U1–U24 do weta MG
> (§6); otwarte P1–P8 (§7). Wywołanie: `PLAN_beta.md` §0 krok 5 i §3 M6. **Rozmiar: L** — `PLAN_beta.md` zakładał
> „S każda”; urosło o improwizację z dowolnego przedmiotu w ręce (D6), fizyczność obiektów na żądanie (D5) i Regiony
> wody (D9). **Przeniesione 2026-10-25 (MG):** wierzchowce (D7, D10) → `PLAN_m4_pojazdy.md` §6.3, część 3 — ten sam
> kod co pojazdy i niedokończona logika M4 (Inicjatywa za kierowcą, budżet ruchu nośnika); skok → `HANDOFF_movement_hotbar.md`
> (Skok jako operacja ruchu z wzorami NOE). Numeracja D/U/P zostaje, przeniesione pozycje mają odsyłacz.
> Nie implementować przed przejściem MG przez §4–§7.
>
> **Metoda (jak w M5).** Dla każdej reguły: *RAW* → *co robi stock dnd5e 6.0.6 (system i karta) i dlaczego* →
> *czy ten powód dotyczy nas* → *ile automatyki i za jaką cenę*. Gwiazda przewodnia z `PLAN_beta.md` §2: oznaczać,
> nie zakazywać; wykrycie, nie zastosowanie, gdy RAW zostawia decyzję MG; jeden magazyn stanu, jeden lejek zapisu.
>
> **Dlaczego możemy więcej niż dnd5e.** Stock dnd5e jest systemem ogólnym: nie wie, co postać trzyma w rękach, z czego
> zrobione są drzwi ani kto siedzi na koniu — więc zostawia to stołowi. My mamy węższy, dobrze zdefiniowany świat i
> już zbudowane modele: lalkę (ręce i chwyt), silnik okoliczności ataku, silnik TT i rozstrzygacz trafienia, nośniki
> z jadącymi (M4), Regiony z eksportu map. Każda pozycja niżej mówi, z którego z nich korzysta.
>
> RAW = `Neuro 5e/Podrecznik/NOE/` (październik), `s. N` = strona drukowana. dnd5e = źródła 6.0.6 (`module/…`
> względem repozytorium systemu), rdzeń = Foundry 14.369. Repozytorium jest publiczne: liczby, parafrazy i numery
> stron, bez cytatów z podręcznika i bez fabuły. Warstwy: **NOE** (RAW), **RAI** (drzewo NOE z opisem pochodzenia),
> **WKK** (`scripts/wkk/`, za przełącznikiem Kobalt) — `scripts/wkk/README.md`.

---

## 0. W skrócie

| Filar | Co dostaje stół | § |
|---|---|---|
| **Biegłości profesji** (dziura w B6) | profesja nadaje swoje biegłości awansem dnd5e; „już masz → Specjalizacja → ostrzeżenie” (D1); 12 instrumentów muzycznych jako biegłości (D2) — przy okazji Cwaniak i Kowboj dostają wreszcie swoje instrumenty | §5.1 |
| **Broń improwizowana** | dowolny przedmiot w ręce (medpak, skrzynka z narzędziami, łom) to broń: ukryty „bliźniak” liczony z wagi i ikony; kolbą i rękojeścią też | §5.2 |
| **Właściwości broni** | `długa` i `ciężka` w silniku okoliczności, `jednorazowa` — po strzale wyrzutnia znika, zostaje złom | §5.3 |
| **Niszczenie obiektów** | „fizyczność na żądanie”: MG nadaje zniszczalność drzwiom, kaflowi, drzewu, przedmiotowi na ziemi dopiero wtedy, gdy gracze się na nie uprą; `burząca`/`karczująca` ×2 | §5.4 |
| **Latanie** | spadanie dnd5e 6 z wyzwalaczem NOE (Nieprzytomność, Szybkość 0) i Powaleniem bez obrażeń | §5.5 |
| **Woda i wspinaczka** | Regiony wody z eksportu map (test Atletyki co turę, walka pod wodą), karta wspinaczki z lalką; skok — `HANDOFF_movement_hotbar.md` | §5.6 |
| ~~Nośniki~~ | wierzchowce przeniesione do `PLAN_m4_pojazdy.md` §6.3 | §5.7 |

---

## 1. Filozofia stock dnd5e — co bierzemy, a gdzie idziemy dalej

| Temat | Stock dnd5e 6.0.6 (system + karta) | Dlaczego tak | Dotyczy nas? | Bierzemy / idziemy dalej |
|---|---|---|---|---|
| Biegłości z klasy i podklasy | Awans `Trait` na przedmiocie klasy/podklasy/tła/featu (`documents/advancement/trait.mjs`); tryby `default`, `expertise`, `forcedExpertise`, `upgrade` („biegłość, a jeśli już jest — ekspercka”), `mastery`; `allowReplacements`; podklasa stosuje awans przy poziomie klasy rodzica. Karta pokazuje wynik jako pigułki biegłości | Dane, nie kod: każdy przedmiot opisuje, co daje; okno awansu robi wybory | Tak, w 100% | **Bierzemy wprost.** Tryb `upgrade` to dosłownie klauzula NOE „jeśli już masz — Specjalizacja”. Nasze dopowiedzenie: ostrzeżenie, gdy Specjalizacja już jest (D1) |
| Kategorie narzędzi | `CONFIG.DND5E.tools[key].id` wskazuje przedmiot bazowy w kompendium; kategoria (`tool:music:*`) pochodzi z `system.type.value` tego przedmiotu (`documents/actor/trait.mjs` `categories()`) | Lista narzędzi rośnie z kompendium, nie z kodu | Tak | Dziś mamy 22 zestawy bez przedmiotów bazowych (`config/tools.mjs`, `id: ""`), więc kategorii brak. Spike E0b: przedmioty bazowe → natywne „Zestawy narzędzi” i „Instrumenty” |
| Broń improwizowana | Typ broni `improv` (`config.mjs`), biegłość tylko z flagi atutu `tavernBrawlerFeat` (`data/item/weapon.mjs` `proficiencyMultiplier`); obrażenia i zasięg wpisuje człowiek na przedmiocie | System nie wie, co postać ma w ręce, więc improwizacja = osobny przedmiot zrobiony ręcznie | **Nie** — wiemy, co jest w ręce (lalka) | Idziemy dalej (D6): przedmiot w ręce **dostaje** ukrytego bliźniaka-broń; typ `improwizowana` istnieje tylko na bliźniakach |
| Właściwości broni | `hvy` rozpoznana, kary z 2024 nieegzekwowane; `rch` opisowa; `lod`, `amm`, `two`, `lgt` w potoku ataku. 6.0 ma też **reguły Efektów Aktywnych z warunkami na danych rzutu** (`dnd5e.advantage`/`bonus`, `roll.attack.type`, `roll.item`…) | Bez kontekstu (dwójnóg, odległość) system nie ma czego sprawdzić | Nie — mamy dwójnóg/trójnóg (`weapons/addons.mjs`, flagi rozstawienia) i odległość w silniku okoliczności | `długa`, `ciężka` jako wiersze silnika okoliczności (scena, ulepszenia, powód w dymku — reguła 6.0 tego nie zobaczy); `jednorazowa` jak stockowy `autoDestroy` materiałów, ale z podmianą na złom (D8). Reguły 6.0 — w M7 (`PLAN_m7_zdolnosci.md` §1) |
| Obiekty | Brak typu aktora „obiekt”. 6.0 dał **natywny Próg obrażeń `hp.dt` wszystkim typom aktorów** (`data/actor/templates/attributes.mjs` `hitPoints`, egzekwowany w `Actor5e#calculateDamage`, omijany przez `options.ignore.threshold`). Pojazd ma `hp.dt` i `hp.mt` | Obiekty w 5e to rzecz MG; system daje tylko klocki | Częściowo — nie da się zrobić obiektu z każdego kafla (D5) | Klocki bierzemy (natywny `hp.dt`, odporności, mnożnik `options.multiplier`); obiekt powstaje **na żądanie** z tabel NOE |
| Spadanie i latanie | 6.0: status `falling`, gdy żeton wisi nad powierzchnią; lotnik spada przy Powaleniu albo Obezwładnieniu, chyba że `hover` (`documents/token.mjs` `_isFalling`); MG klika ikonę statusu → `plummet()` → karta obrażeń; Powalenie tylko, gdy upadek zadał obrażenia (`rules/falling.mjs`) | Reguła 2024 + MG w pętli | Tak — liczby już podmienione (`config/spadanie.mjs`) | Bierzemy mechanizm; zmieniamy tylko wyzwalacz i Powalenie bez obrażeń (§5.5) |
| Pływanie, wspinanie, skok | Akcje ruchu rdzenia v14 (`walk/fly/swim/climb/jump/crawl`); dnd5e liczy pływanie i wspinanie bez Szybkości jako koszt ×2 (`walkFallback`, `TokenDocument5e.getMovementActionCostFunction`), z trudnym terenem ×3; skok kosztuje ×1 i nie ma limitu | Koszt ruchu da się policzyć z danych aktora, zasięg skoku i testy — już nie | Tak — RAW NOE liczy dokładnie tak samo (s. 255, 257) | Koszt bierzemy bez zmian. Dokładamy Regiony wody i kartę wspinaczki (§5.6); limit skoku — `HANDOFF_movement_hotbar.md` |
| Wierzchowce | Brak w dnd5e i w rdzeniu | Wymaga wiedzy o dwóch żetonach naraz | Nie — M4 ma już model „jadących” | Uogólniamy M4 (D7) — w `PLAN_m4_pojazdy.md` §6.3 |

**Zasada z tej tabeli:** gdzie dnd5e ma mechanizm zgodny z RAW, bierzemy go bez przeróbek (spadanie, koszt ruchu,
Trait, `hp.dt`). Gdzie dnd5e zostawia rzecz stołowi z braku kontekstu, a my ten kontekst mamy — automatyzujemy, ale
oznaczamy, nie blokujemy.

---

## 2. RAW — inwentarz M6

- **Biegłości profesji** (s. 69–101, „BIEGŁOŚCI <PROFESJI>”). 18 profesji, każda: stałe nadania i/lub wybory
  (umiejętność, zestaw narzędzi, instrument, kategoria broni, ciężkie pancerze). Pięć profesji ma klauzulę „jeśli
  już masz — Specjalizacja” (Gladiator — Atletyka/Akrobatyka; Wojownik autostrady — Pojazdy i mechanik; Kurier —
  mechanik i Pojazdy; Zabójca maszyn — Technika). Gwiazda: Specjalizacja w jednym instrumencie. Gladiator: biegłość
  w broni improwizowanej. Zabójca: biegłość we wszystkich broniach. Zabójca maszyn: wyszkolenie w ciężkich
  pancerzach. Ogólna reguła Specjalizacji (s. 17): PB liczona podwójnie; **brak ogólnej reguły dla zdublowanej
  biegłości** — luka RAW, rozstrzyga D1.
- **Instrumenty muzyczne** — tabela k12 (s. 132, 12 pozycji). Cwaniak: 2 instrumenty + 1 zestaw narzędzi (s. 72);
  Kowboj: 1 instrument; Gwiazda: Specjalizacja w 1; Sztuczka Muzyk: 2.
- **Broń improwizowana** (s. 253): każdy przedmiot użyty jako broń, także broń biała i palna użyta niezgodnie z
  przeznaczeniem (kolba, rękojeść); bez PB w Teście Ataku; 1k4 obrażeń typu wg MG; rzut 3/9 m; MG może uznać, że
  działa jak podobna broń biała. Łyżeczka (Gladiator): biegłość, rzut do 6 m, maks. waga = SIŁ kg, kość i chwyt z
  wagi, naturalna 1 — przedmiot pęka na dwie części.
- **Właściwości broni** (s. 117–118): `długa` — Utrudnienie do celu ≤ 3 m, chyba że ma Szybkość 0; `ciężka` — bez
  dwójnogu/trójnogu albo SIŁ 15+ Utrudnienie, a cele mają Ułatwienie do RO przeciw serii; `jednorazowa` — jeden
  strzał, bez ponownego ładowania; `burząca` — ×2 obiektom; `karczująca` — ×2 (cięte) roślinom i drewnu. Kolba
  składana (s. 129) zdejmuje `długą` po złożeniu.
- **Obiekty** (s. 253–254): TT z materiału (8 progów 11–23), PW z rozmiaru × kruchości (5 × 3, stała albo kości),
  wielkie obiekty dzielone na fragmenty, niewrażliwość na trucizny i psychiczne, opcjonalny Próg obrażeń, brak Cech
  — automatyczna porażka każdego RO; kruchy przedmiot MG może pozwolić zniszczyć bez testu. Obiektem jest też pojazd
  (hasło „Obiekt”, s. 254). Przedmiot noszony nie jest celem; leżący — podlega niszczeniu.
- **Latanie** (s. 253): Nieprzytomność albo Szybkość 0 → spada i dostaje obrażenia od upadku; Powalenie → opada
  pionowo bez obrażeń. Spadanie (s. 259): 1k6 za każde 1,5 m.
- **Pływanie** (s. 255): koszt ×2 (×3 w grząskim), bez kosztu z Szybkością pływania; wejście w ubraniu i sprzęcie —
  na żądanie MG SIŁ (Atletyka) ST 10 z utrudnieniami pancerza, porażka — Szybkość 0, ponowny test na początku tury;
  trudne wody ST 15/20/25. **Ruch i walka pod wodą** (s. 255–256): bez Szybkości pływania test co turę; wstrzymanie
  oddechu 1 + mod. KON minut, obrażenia → RO KON ST 10 albo Uduszenie; broń palna pod wodą: zasięg 30 cm,
  Utrudnienie, zacięcie ≤ 5, połowa obrażeń; znad wody w zanurzony cel — Utrudnienie, > 30 cm zawsze chybia;
  miotana/rzucana: Utrudnienie, 1,5 m, połowa; wręcz w zanurzony cel Utrudnienie (chyba że Szybkość pływania);
  częściowe zanurzenie — Osłona ½ albo ¾. *Odsyłacz do Uduszenia mówi s. 257, hasło stoi na s. 259 — literówka RAW.*
- **Skakanie** (s. 256) — w `HANDOFF_movement_hotbar.md` §3 (Skok jako operacja ruchu, wzory NOE, lądowanie w
  trudnym terenie, Skok Gladiatora).
- **Wspinanie** (s. 257): koszt ×2 (×3 w trudnym), test SIŁ (Atletyka) ST 10+, **dwie wolne ręce**, ciężki plecak —
  Utrudnienie.
- **Walka na wierzchowcu** (s. 257) — w `PLAN_m4_pojazdy.md` §6.3.

---

## 3. Stan kodu — znaleziska

| # | Znalezisko | Skutek |
|---|---|---|
| Z1 | `buildProfession` (`dev/packs/build-packs.mjs`) nadaje tylko wybory zdolności; `PROFESSIONS` (`config/classes-data.mjs`) nie ma pola biegłości, choć komentarz mówi, że „`proficiencies` jest nadawane”. Tekst jest w `dev/classes/professions.json` | Dziura B6 z `PLAN_beta.md` — potwierdzona dla 18/18 profesji |
| Z2 | `buildClass` czyta tylko `tools.fixed` i `tools.choice`; Cwaniak ma `tools: { instruments: 2, any: 1 }` | **Cwaniak od zera też nie dostaje narzędzi ani instrumentów** — druga dziura B6, nieznana dotąd |
| Z3 | `config/tools.mjs`: 22 zestawy, jedna kategoria, `id: ""` (bez przedmiotów bazowych); instrumenty istnieją tylko jako wiersze tabeli szabrowania (`config/szabrowanie-data.mjs`) | Instrumentów nie da się dziś nadać ani wybrać |
| Z4 | `config/weapons.mjs` wycina typ `improv` (`NEURO_WEAPON_TYPES`); jedyna broń improwizowana to Pochodnia (WKK) | Brak klucza biegłości dla Gladiatora |
| Z5 | Lalka (`actors/doll-model.mjs` `classifyItem`) rozpoznaje tylko broń, tarcze, pancerze, latarki, gogle; „nieznane nigdy nie jest zgadywane” | Medpaku nie da się wziąć do ręki — potrzebna jawna nowa rodzina |
| Z6 | `jednorazowa` (LAW) to broń „nietrackowana” (`weapons/magazine-model.mjs`) — strzela bez końca | Do naprawy w §5.3 |
| Z7 | `combat/bestiary-thresholds.mjs` zeruje obrażenia poniżej progu we fladze Bestiariusza, bo „dnd5e modeluje próg tylko na pojazdach” — w 6.0.6 już nieaktualne (natywny `hp.dt` na każdym aktorze) | Obiekty używają natywnego `hp.dt`; przeniesienie Bestiariusza na `hp.dt` to osobna pozycja (P7), nie M6 |
| Z8, Z9 | Jadący zawsze ukryci; rdzeń M4 pyta o pojazd w jednym miejscu | Przeniesione z wierzchowcami — `PLAN_m4_pojazdy.md` §6.3 |
| Z10 | Moduł ma własne zachowania Regionów (`scenes/transitions.mjs`: `trudnePrzejscie`, `strefaSkazenia`, `skok`) — `skok` liczy już zasięg NOE i rozbieg z drogi ruchu | Woda to kolejny typ obok nich; czystą funkcję zasięgu skoku wydziela `HANDOFF_movement_hotbar.md` (krok 3) i z niej korzysta Region `skok` |
| Z11 | Eksporter map oznacza ściany klasą przegrody (`Maps/tools/wall_rules.py`: `door`, `window`, `fence`, `gate`, `railing`…) bez materiału; aktualizacja sceny (`scenes/map-sync.mjs`) kasuje i odtwarza wszystko z flagą `source`, zachowując tylko stan drzwi | Zniszczona ściana wróciłaby po ponownym eksporcie — potrzebna pamięć zniszczeń (U11) |
| Z12 | Silnik okoliczności ma rejestr źródeł spoza tabeli (`combat/okolicznosci.mjs` `zarejestrujZrodloOkolicznosci`) i czystą tabelę RAW (`config/okolicznosci-ataku.mjs`) | `długa`, `ciężka`, woda — nowe wiersze, nie nowe `if` |
| Z13 | Komentarz w `config/spadanie.mjs` mówi, że „na scenach bez powierzchni nic się nie dzieje”; `TokenDocument5e#_findSupportingSurface` w 6.0.6 traktuje podstawę poziomu jako podłogę, gdy powierzchni brak | Do sprawdzenia w spike'u E0e; poprawić komentarz albo zachowanie |

---

## 4. Decyzje MG (2026-10-25)

| # | Pytanie | Decyzja |
|---|---|---|
| D1 | Profesja daje biegłość, którą postać już ma | **Biegłość → Specjalizacja → Specjalizacja (ostrzeżenie) → …** Nadanie podnosi o stopień; gdy już jest Specjalizacja, nic nie przepada po cichu — gracz i MG dostają ostrzeżenie. RAI (luka RAW, §2) |
| D2 | Instrumenty | **12 instrumentów z tabeli k12 (s. 132) jako osobne biegłości** w kategorii „Instrumenty muzyczne” |
| D3 | Wolne wybory w profesji (np. Kaznodzieja „jedna dowolna umiejętność”) | **Tylko spośród nieposiadanych** (tryb `default` dnd5e); Specjalizacja tylko przy stałych nadaniach (D1) i tam, gdzie RAW mówi „jeśli już masz” |
| D4 | Istniejące postacie (BG kampanii, pregeny Jazdy Próbnej) | **Osobny hand-off dla LLM** po etapie E1 — narzędzie audytu robi ten etap, uzupełnianie robi tamten (§8, E1) |
| D5 | Niszczenie obiektów | **Zniszczalność dorzucana arbitralnie, tylko gdy potrzebna.** Nie każdy kafel jest obiektem; gracze mogą się uprzeć przy dowolnym przedmiocie, kaflu czy drzewie — wtedy MG nadaje „fizyczność”. Po zniszczeniu: szybka podmiana w Tiled i ponowny eksport albo X na warstwie rysunku |
| D6 | Broń improwizowana | **Dowolny przedmiot w ręce to broń improwizowana.** Typ `improv` na przedmiotach „się nie spina” (trzeba by przepisać cały ekwipunek). Zamiast tego: do ręki można wziąć dowolny przedmiot, a encja broni improwizowanej jest **dynamicznie generowanym, ukrytym elementem** z wagi i ikony przedmiotu |
| D7 | Wierzchowce | **Kierunek pełny, z generycyzacją mechaniki pojazdów** — ten sam kod obsługuje pickupy, rowery, konie i czołgi. **→ `PLAN_m4_pojazdy.md` §6.3** (MG, 2026-10-25) |
| D8 | Broń `jednorazowa` po strzale | **Znika**, jej miejsce zajmuje złom/śmieć bez opcji ataku — chyba że jako generyczny atak improwizowany (D6) |
| D9 | Pływanie, skakanie, wspinanie | **Podpowiedzi + Regiony wody z automatycznym testem Atletyki co turę; woda oznaczana w Tiled, po encjach** (mapy z wodą: Zasadzka, Arena). Skok — **→ `HANDOFF_movement_hotbar.md`** |
| D10 | Konie w styczniu? | „Drużyna graczy jest absolutnie nieprzewidywalna” — wierzchowce gotowe przed betą (**→ `PLAN_m4_pojazdy.md` §6.3**) |
| D11 | Reakcje (z rundy M7, dotyczy też M6) | Znacznik „Reakcja zużyta” + **dźwięk negatywny (buzz)**, gdy coś złego się stało; MG może zignorować. Ten sam sygnał dla naruszeń w M6 (wspinaczka bez wolnych rąk, `ciężka` bez oparcia) — `PLAN_m7_zdolnosci.md` §5.1 |
| D12 | Retroaktywność i kolejność | M6 i M7 przed betą (B2: wszystkie zmiany modeli z §10 przed zamrożeniem) |

---

## 5. Projekt

### 5.1 Biegłości profesji i instrumenty (B6)

**Stock:** subklasa 2024 nadaje biegłości awansem `Trait` na swoim poziomie (np. „Bonus Proficiencies” na 3.).
Okno awansu (`TraitFlow`) robi wybory, karta pokazuje pigułki. Dokładnie tego chcemy.

**Dane.** `PROFESSIONS[pid].bieglosci` w `config/classes-data.mjs` — lista grup, każda to jeden awans `Trait`:

```js
// Sędzia: Śledztwo, Zastraszanie, 1 zestaw narzędzi, 1 kategoria broni (D1, D3)
bieglosci: [
  { nadania: ["skills:sle", "skills:zas"], tryb: "upgrade" },        // stałe → D1
  { wybory: [{ ile: 1, pula: ["tool:tool:*"] },                       // zestaw (bez instrumentów)
             { ile: 1, pula: ["weapon:*"] }], tryb: "default" }       // wolne → D3
]
```

Tryby wg RAW: stałe nadania → `upgrade` (D1); wybory → `default` (D3), z wyjątkiem wyborów z klauzulą „jeśli już
masz” (Gladiator: Atletyka/Akrobatyka → `upgrade`); Gwiazda: Specjalizacja w instrumencie → `forcedExpertise`.
Gladiator → `weapon:improwizowana` (§5.2), Zabójca → wszystkie kategorie broni (stałe nadania, bez wieloznacznika —
`grants` dnd5e oczekuje kluczy), Zabójca maszyn → `armor:hvy`. Gwiazda „dwie umiejętności albo umiejętność i zestaw”
= dwa wybory po 1: `skills:*` oraz `skills:*` ∪ `tool:tool:*` (równoważne, bez kombinatoryki).

Źródło prawdy: tekst w `professions.json`; dane strukturalne pisane ręcznie w `classes-data.mjs` (18 wpisów — parser
tekstu byłby droższy niż wpisy), **test warstwy 1 porównuje** strukturę z tekstem (każda wymieniona umiejętność,
narzędzie i kategoria występuje w danych).

**Ostrzeżenie (D1).** Tryb `upgrade` przy wartości 2 zostawia 2 (`TraitAdvancement#apply`). Hak
`dnd5e.preAdvancementManagerComplete` porównuje oryginał z klonem: każde nadanie `upgrade`, które zastało
Specjalizację, daje szept do gracza i MG („Medycyna: masz już Specjalizację — profesja nic tu nie dodaje”) i
sygnał naruszenia (D11). Bez blokady.

**Instrumenty (D2).** 12 kluczy narzędzi (`akordeon`, `banjo`, …) z cechą rządzącą wg P1. Dwie drogi:
1. **Przedmioty bazowe (zalecane, spike E0b):** 22 zestawy + 12 instrumentów jako przedmioty `tool` w paczce
   (`system.type.value`: `tool` / `music`), `CONFIG.DND5E.tools[k].id` → UUID w kompendium, `toolTypes` =
   `{tool: "Zestawy narzędzi", music: "Instrumenty muzyczne"}`. dnd5e sam grupuje, wieloznaczniki `tool:music:*`
   działają w awansie i w oknie biegłości na karcie. Wymaga przepisania obejścia etykiet w `config/tools.mjs`
   (`keyLabel` przez `toolProficiencies`) — klucze na aktorach się nie zmieniają, migracji danych nie ma.
2. **Jawne pule (zapas):** płaska lista 34 kluczy, pule wypisane w danych. Działa bez spike'u, bez grupowania.

Przy okazji: Cwaniak (`instruments: 2, any: 1`), Kowboj (1 instrument) i Sztuczka Muzyk (dziś „dopisuje gracz”)
dostają awanse. Instrumenty jako przedmioty trafiają do katalogu handlu i szabrowania (tabela k12 wskazuje
przedmiot zamiast nazwy).

**Weryfikacja.** `validate-packs`: każda profesja ma co najmniej jeden awans `Trait` na swoim pierwszym poziomie,
każdy klucz istnieje w `CONFIG`. e2e `postac`: nowa postać do 3. poziomu z profesją, w tym przypadek D1 (biegłość →
Specjalizacja) i ostrzeżenie. Audyt: `game.neuroshima.bieglosci.audyt(actor)` — czego postaci brakuje względem klasy,
profesji, Pochodzenia i Sztuczek (z odpowiedzią „nie wiadomo, co wybrał” dla wyborów) — narzędzie dla hand-offu D4.

**Wykonalność:** niska–średnia. Awans na subklasie i tryby to stock. Ryzyko: obejście etykiet narzędzi (droga 1).

### 5.2 Broń improwizowana — bliźniak przedmiotu w ręce (D6)

**Stock:** `improv` + atut + ręcznie zrobiony przedmiot. Dla nas to droga, której MG nie chce: przedmiot musiałby
już być bronią.

**Projekt.**
1. **Lalka — nowa rodzina `wRece`** (jawna, nie zgadywana): każdy przedmiot fizyczny (`weight > 0`, typy `loot`,
   `tool`, `consumable`, `equipment` bez rodziny, `container` do P2) można **wziąć do ręki** akcją z Oporządzenia
   i menu przedmiotu — tym samym lejkiem (`game.neuroshima.lalka.place`), z tymi samymi kosztami ruchu. Chwyt:
   jednoręczny do progu wagi, powyżej oburęczny (U3).
2. **Bliźniak.** Lejek lalki, gdy w ręce ląduje przedmiot bez własnego ataku, **tworzy na aktorze ukrytą broń**
   z flagą `improwizacja: {zrodlo: itemId, reka}`: nazwa „<przedmiot> (improwizowana)”, ikona przedmiotu, typ
   `improwizowana` (nowy typ broni w `NEURO_WEAPON_TYPES`, istniejący **tylko** na bliźniakach), 1k4, waga 0 (waży
   źródło), aktywność ataku wręcz i rzutu 3/9 m. Gdy źródło opuszcza rękę — lejek kasuje bliźniaka. Jeden bliźniak
   na rękę, aktualizowany w miejscu przy zamianie przedmiotu (mniej zapisów niż tworzenie i kasowanie).
3. **Biegłość.** `weapon:improwizowana` w `weaponProficiencies` + mapa typów → natywne `proficiencyMultiplier`
   dnd5e daje PB tylko biegłym (Gladiator, §5.1). Bez nowego kodu w potoku ataku.
4. **Kolbą i rękojeścią.** Broń w ręce dostaje w Oporządzeniu i w oknie ataku akcję „Atak improwizowany” — ten sam
   bliźniak (1k4 obuchowe), źródłem jest broń.
5. **Typ obrażeń.** Domyślnie obuchowe; selektor typu w oknie obrażeń (wzorzec kart `class-resource-dice.mjs`); MG
   poprawia, gracz proponuje.
6. **„Działa jak…”** (s. 253): MG na bliźniaku wybiera broń białą z katalogu — bliźniak kopiuje jej kość, właściwości
   i kategorię (wtedy biegłość w tej kategorii się liczy). Noga od stołu = bejsbol.
7. **Rzut.** Po rzucie źródło ląduje na ziemi ścieżką upuszczania (`actors/ground-items.mjs`), bliźniak znika;
   `powracajaca` nie dotyczy.
8. **Łyżeczka (Gladiator, M7):** ten sam bliźniak, inne liczby z tabeli wagi (kość, chwyt), rzut 6 m, maks. waga =
   SIŁ kg, naturalna 1 → przedmiot dzielony na dwa o połowie wagi. Czysta funkcja `improwizacjaZ(item, opcje)` z
   tabelą w danych.
9. **Ukrycie wszędzie:** karta (ekwipunek, Oporządzenie), udźwig, handel, stół wymiany, szabrowanie, rozbiórka,
   eksport postaci, `validate-packs` (żaden bliźniak w paczkach), audyt ekwipunku.

**Dlaczego trwały bliźniak, a nie przedmiot tymczasowy:** cały potok — okno ataku, okoliczności, TT, werdykt, karta
obrażeń, przerzuty — szuka przedmiotu przez UUID z wiadomości. Przedmiot niezapisany przeżyje rzut, ale nie przycisk
„Obrażenia” ani przerzut Fuksem. Koszt trwałego: jeden zapis na wzięcie do ręki, który i tak robi lejek lalki.

**Pochodnia (WKK)** zostaje własną bronią. **Broń palna rzucona** — to też bliźniak (źródło: broń).

**Wykonalność:** średnia. Ryzyka: wyciek bliźniaków do list (mitygacja: jeden predykat `jestBliźniakiem` i test
każdego widoku), uprawnienia gracza do tworzenia przedmiotów na własnym aktorze (są), kopiowanie aktora (bliźniak
jedzie z nim — kasujemy osierocone przy przygotowaniu danych).

### 5.3 Właściwości broni: `długa`, `ciężka`, `jednorazowa`

- **`długa`** — wiersz RAW w `ZRODLA_OKOLICZNOSCI`: atak dystansowy, cel ≤ 3 m, cel nie ma Szybkości 0 →
  Utrudnienie. Migawka ataku dostaje `bron.wlasciwosci` (z broni, amunicji i ulepszeń — złożona kolba składana zdejmuje
  `długą`; stan złożenia jak przełącznik dwójnogu w `weapons/addons.mjs`).
- **`ciężka`** — wiersz RAW: brak SIŁ 15+, brak rozstawionego dwójnogu/trójnogu (flagi rozstawienia już istnieją),
  broń nie stoi na stanowisku pojazdu (M4), brak ręcznego „oparcia” (przełącznik w oknie — murek, parapet, leżenie;
  oznaczane) → Utrudnienie. Seria z takiej broni: karta RO serii (`weapons/fire-modes.mjs`) dostaje Ułatwienie dla celów.
- **`jednorazowa`** (D8) — strzał zużywa broń: lejek lalki **zamienia** ją w ręce na „Zużytą wyrzutnię” (`loot`, waga i
  ikona z katalogu, wartość złomu dla rozbiórki M5), atak tylko przez bliźniaka (§5.2). Stockowy odpowiednik: materiał
  z `uses.autoDestroy`. Dźwięk strzału zostaje (`weapons/sounds.mjs`).

Zamyka `PLAN_weapon_properties.md` §3.3 i §5 (z §5.4 niżej).

### 5.4 Niszczenie obiektów — fizyczność na żądanie (D5)

**Model.** Jeden aktor bazowy „Obiekt” (`npc` z flagą `obiekt`, w paczce modułu, importowany do świata raz) i
**żetony niepowiązane** z deltą na sztukę: TT (`ac.flat`), PW, Próg obrażeń (natywny `hp.dt`, §1), materiał,
rozmiar, kruchość, kotwica. Rozmiar żetonu z rozmiaru obiektu. Grafika: półprzezroczysta ramka z ikoną materiału
(widać, że to „uchwyt” do celowania, nie rekwizyt).

**Narzędzie MG „Ufizycznij”** (kontrolki żetonów, tylko MG) — kotwice:
- **przegroda z eksportu** (drzwi, okno, płot, brama, balustrada; zaznaczenie odcinka ściany): domyślny rozmiar i
  materiał z klasy przegrody (drzwi → Średni, drewno; płot → Duży, cienka blacha) — MG poprawia w oknie;
- **kafel** (rekwizyt z eksportu, `propId`) i **rysunek**;
- **przedmiot na ziemi** (`ground-items.mjs`): rozmiar z wagi przedmiotu (U9);
- **punkt** (drzewo z tła, beczka namalowana na mapie): sam obiekt, bez kotwicy.

Okno: materiał (tabela TT), rozmiar × kruchość (tabela PW: wartość stała albo „rzuć kości”), Próg obrażeń, nazwa,
„drewno/roślina” (dla `karczującej`), „kruchy — zniszcz od razu” (s. 253: bez testu, w akcji Atakowania/Używania).
Szablony szybkie: „drzwi drewniane”, „drzwi stalowe”, „okno”, „kłódka”, „beczka”, „drzewo”.

**Zasady obiektu.**
- RO: automatyczna porażka — hak `dnd5e.preRollSavingThrow` zwraca `false` i wystawia kartę „automatyczna porażka”;
  ścieżki zbiorcze (granaty, serie, autodestrukcja, wybuch baku) pytają `jestObiektem()` i liczą pełne obrażenia.
- Niewrażliwość: `traits.di` = trucizna, psychiczne (w delcie).
- `burząca` ×2, `karczująca` ×2 (cięte, cel drewno/roślina): `dnd5e.preCalculateDamage` → `options.multiplier`,
  właściwość czytana z broni i amunicji tym samym czytnikiem co `combat/armour-piercing.mjs`. **Pojazd jest obiektem**
  (s. 254) — mnożnik działa też na pojazdy i wraki; Lemiesz buldożera (M4) korzysta z tego samego.
- `ppanc` omija Próg — natywnie (`options.ignore.threshold` już ustawiane).
- Pancerz, Zranienie, rzuty przeciw śmierci, Tchórzliwość, Splatter — wyłączone dla obiektów (jeden predykat).

**Zniszczenie (0 PW)** — karta MG z przyciskami według kotwicy: [Otwórz drzwi] / [Usuń przegrodę] / [Ukryj kafel] /
[Usuń przedmiot] / [Zostaw]; zawsze: żeton obiektu znika, na warstwie rysunku powstaje **X** (rysunek bez flagi
eksportera — przeżyje aktualizację mapy) i notka „podmień w Tiled przy następnym eksporcie”. Pamięć zniszczeń (U11):
flaga sceny z identyfikatorami zniszczonych przegród i kafli eksportera — `map-sync.mjs` ich nie odtwarza i mówi o tym
w raporcie, dopóki MG nie podmieni mapy.

**Wykonalność:** średnia. Natywny `hp.dt` i delta żetonu usuwają większość kodu. Ryzyka: RO w ścieżkach zbiorczych
(inwentarz wywołań `rollSavingThrow` — kilkanaście miejsc), silnik TT dla `npc` bez Cech (TT podana wprost — metoda
„stała”). Materiał z eksportera (encje CDDA) — świadomie poza M6 (P5).

### 5.5 Latanie (s. 253)

**Stock 6.0.6** (`documents/token.mjs`): lotnik nie spada, dopóki nie jest Powalony ani Obezwładniony; `hover`
zwalnia. NOE: spada przy **Nieprzytomności albo Szybkości 0** (Pochwycenie, Unieruchomienie, Sparaliżowanie…,
Szybkość ruchu 0), z obrażeniami; przy **Powaleniu opada bez obrażeń**.

**Projekt:** podklasa `TokenDocument5e` (albo opakowanie metody — spike E0e wybiera) z nadpisanym `_isFalling`
(warunki NOE, predykat Szybkości 0 wspólny z silnikiem okoliczności — `BEZ_RUCHU`) i `plummet()` — gdy jedynym
powodem jest Powalenie, opadnięcie ruchem `fall` bez karty obrażeń. Reszta zostaje stockowa: status Spadanie, klik MG,
karta, Osteoporoza (`combat/falling.mjs`), Kocie kości „Cztery łapy” (M7) na tej samej karcie. Drony latające (M3):
Wyłączenie przy 0 PW = spadanie.

**Wykonalność:** niska. Ryzyko: `_isFalling` jest `@internal` — wersja dnd5e i tak przypięta na betę; test warstwy 2
pilnuje kontraktu.

### 5.6 Woda i wspinaczka (D9)

**Koszt ruchu** — bez zmian (stock zgodny z RAW). Sprawdzamy tylko, że ustawienie `movementAutomation` dnd5e jest
włączone w świecie zalecanym (bramka wydania, krok `boot`).

**Regiony wody.** Nowe zachowanie `neuroshima-2026-overrides.woda` obok `strefaSkazenia` (`scenes/transitions.mjs`):
pola `glebokosc` (płytka — tylko trudny teren i Osłona ½ dla stojących; głęboka — pływanie), `nurt` (spokojna ST 10,
rwąca 15, wzburzona 20, wir 25), `grzaska` (koszt ×3 — trudny teren dnd5e na tym samym Regionie).
- `TOKEN_MOVE_IN` do głębokiej wody: karta MG „wejście w sprzęcie” (SIŁ (Atletyka) ST 10, Utrudnienia z pancerza
  liczy już `actors/armor-rules.mjs`) — oznaczane, MG może pominąć;
- `TOKEN_TURN_START` w głębokiej wodzie bez Szybkości pływania: karta testu Atletyki ze ST nurtu; porażka → status
  „Tonie” (Szybkość 0, opada) do następnego testu;
- status „Pod wodą” (z porażki albo z HUD — „Nurkuj”): licznik oddechu 1 + mod. KON minut w rundach; obrażenia →
  RO KON ST 10 albo Uduszenie — narzędzie z `actors/zagrozenia.mjs` (faza Uduszenia już istnieje).

**Walka pod wodą** — wiersze silnika okoliczności i potoku obrażeń: atakujący albo cel „Pod wodą” → broń palna:
Utrudnienie, zasięg 0,3 m (praktycznie wręcz), zacięcie przy ≤ 5 (`weapons/jams.mjs` dostaje próg z kontekstu),
połowa obrażeń (`preCalculateDamage`); znad wody w zanurzony cel — Utrudnienie, poza 30 cm uwaga „chybia”; miotana i
rzucana — Utrudnienie, 1,5 m, połowa; wręcz w zanurzony cel — Utrudnienie, chyba że Szybkość pływania; cel w płytkiej
wodzie — domyślna Osłona ½ w oknie (`combat/cover.mjs`).

**Eksporter map (repo Map, osobny commit):** encje wody CDDA (`t_water_sh` → płytka, `t_water_dp` → głęboka,
`t_water_moving_*` → rwąca, słona → wzburzona) → Regiony z flagą `source: "water"` i zachowaniem `woda`; ręczne
nadpisanie w Tiled (warstwa obiektów „woda” z właściwościami `glebokosc`, `nurt`). `map-sync.mjs` odtwarza je jak
podłogi. Mapy do sprawdzenia: Zasadzka, Arena.

**Skok** — `HANDOFF_movement_hotbar.md` (Skok jako operacja ruchu z wzorami NOE, krok 3 tamtej kolejności): limit
dal/wzwyż, rozbieg, lądowanie w trudnym terenie, Zwinność szczura, Skok Gladiatora. Region `skok` (zaprojektowane
wyrwy) zostaje bez zmian i korzysta z tej samej czystej funkcji.

**Wspinaczka.** Akcja `climb`: przy pierwszym odcinku wspinaczki w turze — karta SIŁ (Atletyka) ST 10 (MG podnosi
do 15+); **lalka sprawdza dwie wolne ręce** (inaczej sygnał naruszenia), udźwig ponad próg albo ciężki plecak →
Utrudnienie w karcie.

**Karta referencyjna** — strona w dzienniku zasad modułu i `docs/Ruch-i-teren.md`: pływanie, pod wodą, wspinanie,
latanie (skok — handoff ruchu, wierzchowiec — M4 §6.3, dopisują swoje strony).

**Wykonalność:** średnia. Zdarzenia `TOKEN_TURN_START`/`TOKEN_MOVE_IN` są w rdzeniu (`CONST.REGION_EVENTS`); wzorzec
zachowań już działa w module. Ryzyko: interakcja „Pod wodą” z wysokością żetonu i spadaniem — status, nie wysokość
(U14).

### 5.7 ~~Nośniki: pojazdy i wierzchowce~~ — przeniesione

Całość (pojęcie nośnika, profil `wierzchowiec`, jadący widoczni, Inicjatywa jeźdźca, spadanie z siodła, atak z
grzbietu, katalog `kon`, spike, etapy) — **`PLAN_m4_pojazdy.md` §6.3, część 3** (MG, 2026-10-25).

---

## 6. Ustalenia projektu — do weta MG

| # | Ustalenie | Warstwa |
|---|---|---|
| U1 | Specjalizacja bez biegłości nie istnieje: `forcedExpertise` tylko Gwiazda (RAW wprost) | NOE |
| U2 | Biegłości profesji przy wieloklasowości — zawsze (RAW nie wyłącza) | NOE |
| U3 | Chwyt bliźniaka: do 5 kg jednoręczny, powyżej oburęczny; maks. waga do walki = SIŁ kg — oba progi z tabeli Łyżeczki, stosowane do wszystkich (Łyżeczka zmienia tylko kość obrażeń i daje biegłość); cięższe — MG | RAI |
| U4 | Bliźniak nie dodaje PB bez biegłości `improwizowana`; „Działa jak…” przenosi kategorię i właściwości wzorca | NOE |
| U5 | Typ obrażeń bliźniaka: domyślnie obuchowe, ostre narzędzia (nóż w zestawie, szkło) — cięte z flagi katalogu `obrazeniaImprowizowane` | RAI |
| U6 | Broń w ręce jako improwizowana: 1k4 obuchowe, bez właściwości broni | NOE |
| U7 | Zużyta wyrzutnia: waga 50% LAW, rozbiórka na surowce wg M5 | RAI |
| U8 | `długa`: liczy się odległość od krawędzi żetonów (jak reszta silnika); `ciężka`: „oparcie” to ręczny przełącznik | NOE |
| U9 | Rozmiar obiektu z wagi przedmiotu: ≤ 1 kg Malutki, ≤ 10 kg Mały, ≤ 100 kg Średni, więcej Duży | RAI |
| U10 | Domyślne szablony przegród: drzwi — Średni, drewno, wytrzymały; drzwi stalowe — Średni, cienka blacha, twardy; okno — Duży, szkło, kruchy; płot — Duży, cienka blacha, wytrzymały; balustrada — Średni, drewno, wytrzymały | RAI |
| U11 | Pamięć zniszczeń na scenie chroni przed odtworzeniem przy ponownym eksporcie; MG czyści ją przyciskiem po podmianie w Tiled | — |
| U12 | X po zniszczeniu widzą wszyscy; notka o Tiled — tylko MG | — |
| U13 | Lotnik Powalony opada tym samym ruchem `fall`, ale bez karty; Szybkość 0 = status z `BEZ_RUCHU` albo zerowa Szybkość ruchu po efektach | NOE |
| U14 | „Pod wodą” to status (HUD i Region), nie wysokość żetonu | — |
| U15 | Test wody na początku tury tylko w walce; poza walką — karta przy wejściu i co minutę zegara świata na żądanie MG | RAI |
| U16 | ~~Limit skoku~~ — `HANDOFF_movement_hotbar.md` (podpowiedź czy blokada: tamten §10) | — |
| U17–U21 | ~~Wierzchowce~~ — `PLAN_m4_pojazdy.md` §6.3 (W-U1–W-U5) | — |
| U22 | Instrumenty: cecha rządząca CHA dla wszystkich (Występy), do potwierdzenia — P1 | RAI |
| U23 | Gwiazda „dwie umiejętności albo umiejętność i zestaw” = dwa wybory po 1 (drugi: umiejętność albo zestaw) | NOE |
| U24 | Zabójca „wszystkie bronie” = stałe nadanie 7 kategorii broni; `improwizowana` nie wchodzi — tę biegłość RAW nadaje jawnie (Gladiator) | RAI |

---

## 7. Otwarte

| # | Pytanie | Propozycja |
|---|---|---|
| P1 | Cecha rządząca instrumentów | CHA dla wszystkich (U22) |
| P2 | `container` (plecak, skrzynia) jako broń improwizowana z zawartością | Tak, waga z zawartością; zawartość zostaje |
| P3 | Akcja bonusowa jako drugi znacznik obok Reakcji | Rozstrzyga `PLAN_m7_zdolnosci.md` P1 |
| P4 | ~~Pościg konny~~ | `PLAN_m4_pojazdy.md` §6.3, W-P1 |
| P5 | Materiał przegród z encji CDDA (opcja C) | Po becie; pole `material` w fladze ściany i tak zarezerwowane |
| P6 | ~~Wierzchowce poza koniem~~ | `PLAN_m4_pojazdy.md` §6.3, W-P2 |
| P7 | Bestiariusz na natywny `hp.dt` zamiast flagi | PM — razem z PM1 (TT), bo zmienia dane |
| P8 | Obiekt widoczny dla graczy przed zniszczeniem (ramka) czy tylko po wycelowaniu | Widoczny — gracze muszą móc go wskazać |

---

## 8. Etapy

Kolejność: E1 najpierw (dziura B6), potem od najtańszych. Wierzchowce (dawne E7) — `PLAN_m4_pojazdy.md` §6.3, W0–W5.

| Etap | Zakres | Rozmiar | Zależy od | Gotowe gdy |
|---|---|---|---|---|
| **E0** | Spiki: (a) `Trait` `upgrade` na subklasie + ostrzeżenie w `preAdvancementManagerComplete`; (b) przedmioty bazowe narzędzi → natywne kategorie; (c) bliźniak w lejku lalki u gracza (tworzenie, ukrycie, kasowanie, kopia aktora); (e) `_isFalling`/`plummet` — podklasa czy opakowanie, sceny bez powierzchni (Z13); (f) Region wody: `TOKEN_TURN_START` u właściwego klienta. ~~(d)~~ — W0 w M4 | S | — | Notatka tak/nie per spike w §11; korekta planu |
| **E1** | Biegłości profesji (§5.1): dane 18 profesji, instrumenty (droga z E0b), Cwaniak/Kowboj/Muzyk, `weapon:improwizowana`, `armor:hvy`, ostrzeżenie D1, `validate-packs`, e2e `postac` do 3. poziomu, `bieglosci.audyt()`. Na koniec: **`HANDOFF_bieglosci_retro.md`** dla LLM (D4) — lista postaci, wynik audytu, zasady uzupełniania, co pytać MG | M | E0a, E0b | Postać od zera ma komplet; audyt zwraca braki BG kampanii i pregenów |
| **E2** | Właściwości broni (§5.3): `długa`, `ciężka` (+ RO serii), `jednorazowa` → zużyta wyrzutnia | S–M | — | Testy warstwy 1 wierszy; e2e `combat` krok LAW |
| **E3** | Improwizacja (§5.2): rodzina `wRece`, bliźniak, kolba, „Działa jak…”, rzut na ziemię, ukrycie wszędzie, Łyżeczka (liczby) | M–L | E0c, E1 (biegłość) | e2e `improwizacja` (gracz bije medpakiem, rzuca łomem, Gladiator z PB); stanowisko Poligonu |
| **E4** | Obiekty (§5.4): aktor bazowy, okno z tabelami, Ufizycznij z kotwicami, auto-porażka RO (inwentarz ścieżek), ×2, zniszczenie z kartą, X, pamięć zniszczeń w `map-sync` | M–L | — | e2e `obiekt` (drzwi z eksportu: strzał, granat, `burząca`, otwarcie); stanowisko Poligonu |
| **E5** | Latanie (§5.5) | S | E0e | Testy warstwy 2: lotnik Nieprzytomny/Pochwycony spada z kartą, Powalony opada bez |
| **E6** | Woda i wspinaczka (§5.6) + eksporter map (repo Map) + karta referencyjna | M | E0f | e2e `woda` na scenie z Regionem; Zasadzka/Arena przeeksportowane |
| **E8** | Domknięcie: macierz w `IMPLEMENTATION.md`, `docs/` (Ruch-i-teren, Broń improwizowana w Walce, Obiekty dla MG), tabela RAI w `scripts/wkk/README.md` (D1, U3, U5, U7, U9, U10, U15), `PLAN_weapon_properties.md` §3.3/§5 zamknięte | S | wszystkie | Bramki B1, B4, B7 dla wierszy M6 |

### Testy

- **Warstwa 1 (czyste):** `bieglosciProfesji(pid)` vs tekst `professions.json`; `trybNadania` (D1/D3);
  `improwizacjaZ(item, {lyzeczka, silaKg})`; `ttObiektu(material)`, `pwObiektu(rozmiar, kruchosc, {rzut})`,
  `rozmiarZWagi`; wiersze `dluga`/`ciezka`/woda w `okolicznosci.test.mjs`; `czySpada(stan)` (NOE).
- **Warstwy 2–5 (Quench):** awans profesji na aktorze testowym; bliźniak przez lejek; obiekt i mnożnik w
  `calculateDamage`; RO obiektu; `_isFalling`; Region wody na scenie testowej.
- **Warstwa 6 (e2e, piaskownica):** `postac` (rozszerzone), `improwizacja`, `obiekt`, `woda`; regresja `combat`, `lalka`.
- **Warstwa 7 (Poligon):** nowe stanowisko **Arena** (woda, obiekty, improwizacja); sondy dla MG w hand-offie.

---

## 9. Poza planem

Materiał przegród z CDDA (P5), Bestiariusz na `hp.dt` (P7), automatyczne niszczenie terenu przez efekty obszarowe bez
„Ufizycznij” (wymagałoby fizyczności każdego kafla — odrzucone w D5), Kolory Neuroshimy. Wierzchowce i pościg konny —
`PLAN_m4_pojazdy.md` §6.3; skok i budżet ruchu — `HANDOFF_movement_hotbar.md`.

## 10. Zmiany modeli danych (B2) — wszystkie przed kandydatem

Klucze narzędzi (+12 instrumentów, przedmioty bazowe), typ broni `improwizowana` i bliźniaki na aktorach (flaga
`improwizacja`), aktor bazowy „Obiekt” i delta żetonów obiektów (flaga `obiekt`), flaga sceny pamięci zniszczeń, typ
zachowania Regionu `woda` i Regiony z eksportu, statusy „Pod wodą” i „Tonie”, awanse `Trait` w profesjach (przebudowa
paczek `profesje`, `klasy`, `sprzet`). Flaga `wierzchowiec` i katalog nośników — w B2 przez M4 §6.3.

## 11. Postęp

*(pusto — wpisy po etapach)*
