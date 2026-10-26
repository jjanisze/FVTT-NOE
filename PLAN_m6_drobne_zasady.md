# PLAN — M6: Biegłości profesji, broń improwizowana, obiekty i woda

> Status: **W REALIZACJI** (od 2026-10-26). Decyzje MG D1–D12 z dwóch rund pytań (§4); ustalenia U1–U24 przeszły
> weto MG 2026-10-26 (kolumna „Decyzja MG” w §6, poprawki w §5); P1–P8 rozstrzygnięte tego samego dnia (§7); Łyżeczka
> WKK zaprojektowana z MG (§5.2.1). Spiki E0 — §11. Wywołanie: `PLAN_beta.md` §0 krok 5 i §3 M6. **Rozmiar: L** — `PLAN_beta.md` zakładał
> „S każda”; urosło o improwizację z dowolnego przedmiotu w ręce (D6), fizyczność obiektów na żądanie (D5) i Regiony
> wody (D9). **Przeniesione 2026-10-25 (MG):** wierzchowce (D7, D10) → `PLAN_m4_pojazdy.md` §6.3, część 3 — ten sam
> kod co pojazdy i niedokończona logika M4 (Inicjatywa za kierowcą, budżet ruchu nośnika); skok → `HANDOFF_movement_hotbar.md`
> (Skok jako operacja ruchu z wzorami NOE). Numeracja D/U/P zostaje, przeniesione pozycje mają odsyłacz.
> Materiał przegród z encji CDDA (P5) — przeniesiony do [`PLAN_1_0.md`](PLAN_1_0.md).
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
| Z14 | Awans `Trait` klasy (`buildClass`) nie ma `classRestriction`: **druga klasa daje pełny zestaw startowy** — rzuty obronne, wszystkie kategorie broni i pancerzy, pełną pulę umiejętności. RAW s. 59 („Biegłości”) i akapity „Jako postać wieloklasowa” każdej klasy dają tylko część; dane są w `CLASSES[c].multiclass`, ale nikt ich nie czyta | Trzecia dziura B6 (znaleziona przy U2). Naprawa w E1: dwa awanse `Trait` — `primary` i `secondary` (mechanizm dnd5e, `Advancement#appliesToClass`) |
| Z15 | `CLASSES.zlodziej.multiclass.tools.fixed` = `"slusarz"`, a klucz narzędzia to `slusarza` | Martwy klucz — poprawka razem z Z14 |

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
sygnał naruszenia (D11). Bez blokady. Tryb `upgrade` dnd5e obsługuje tylko cechy z ekspercką biegłością (umiejętności,
narzędzia — `TraitAdvancement#actorSelected`); broń i pancerze idą osobnym awansem `default`, a nadanie, które zastało
biegłość, dostaje to samo ostrzeżenie („Broń palna długa: masz już biegłość”) — D1 „nic nie przepada po cichu”.

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

**Cecha instrumentów (U22, P1).** RAW s. 132: „Cecha: Charyzma lub Zręczność”. Domyślna cecha klucza to CHA; okno
rzutu dnd5e pozwala wybrać inną cechę, więc ZRC jest o jeden klik — dokładnie „lub” z RAW, bez osobnego kodu.
Używanie wg RAW: „Zagraj znany kawałek” ST 10, „Improwizacja” ST 15 — dwie aktywności testu, jak w zestawach narzędzi.
Instrumenty elektryczne (gitara elektryczna i basowa, keyboard, kontrabas, mikser, skrzypce) — w opisie wymóg
wzmacniacza i zasilania (s. 132); bez automatyki.

**Identyfikatory przedmiotów bazowych.** `CONFIG.DND5E.tools[k].id` musi być znany synchronicznie przy `init`, a
id w paczce to SHA-1 (`idFor`) — w przeglądarce tylko asynchroniczne. Zamiast tego tabela literałów obok konfiguracji
narzędzi, a `validate-packs` sprawdza, że każdy wpis wskazuje przedmiot `tool` z tym `baseItem` (rozjazd = błąd budowania).

**Wieloklasowość (U2, Z14).** RAW s. 59 ogranicza przy wieloklasowości **tylko startowe biegłości klasy** („otrzymujesz
jedynie część startowych biegłości klasowych, co jest wyszczególnione w opisie każdej z klas”); profesji nie wymienia, a
„kiedy awansujesz na nowy poziom w danej klasie, otrzymujesz jej wszystkie zdolności dla danego poziomu”. Profesja
nadaje więc pełne biegłości także postaci wieloklasowej (U2 bez zmian, teraz z odsyłaczem). Klasy dostają dwa awanse
`Trait` na 1. poziomie: `classRestriction: "primary"` (dzisiejszy zestaw) i `"secondary"` (akapit „Jako postać
wieloklasowa”: KW zostaje w awansie HitPoints, bez rzutów obronnych). Cwaniak i Zwiadowca: „jednej wybranej
umiejętności” — bez listy klasy, w odróżnieniu od Speca, Twardziela i Złodzieja („z listy …”); czytamy dosłownie.
Istniejące postacie wieloklasowe z nadmiarem biegłości — audyt (D4) je wypisuje, nic nie zdejmuje sam.

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
   i menu przedmiotu — tym samym lejkiem (`game.neuroshima.lalka.place`), z tymi samymi kosztami ruchu. Chwyt
   (U3, MG): **poniżej 2 kg jednoręczny, od 2 kg oburęczny**; maks. waga do walki = SIŁ kg (cięższe — oznaczone, MG).
2. **Bliźniak.** Przy **pierwszym ataku improwizowanym z danej ręki** (nie przy samym wzięciu do ręki — mniej zapisów,
   bliźniak tylko dla tego, czym ktoś naprawdę bije) lejek **tworzy na aktorze ukrytą broń** z flagą
   `improwizacja: {zrodlo: itemId, reka}`: nazwa „<przedmiot> (improwizowana)”, ikona przedmiotu, typ
   `improwizowana` (nowy typ broni w `NEURO_WEAPON_TYPES`, istniejący **tylko** na bliźniakach), 1k4, waga 0 (waży
   źródło), aktywność ataku wręcz i rzutu 3/9 m. Jeden bliźniak na rękę (najwyżej dwa na aktora), **przepinany w
   miejscu** przy następnym ataku z tej ręki innym przedmiotem. **Nie kasujemy go, gdy źródło opuszcza rękę** (korekta
   E0c): po rzucie źródło jest już na ziemi, a przycisk „Obrażenia” i przerzut Fuksem na karcie ataku nadal szukają
   bliźniaka po UUID — skasowany psułby każdy rzut przedmiotem.
3. **Biegłość.** `weapon:improwizowana` w `weaponProficiencies` + mapa typów → natywne `proficiencyMultiplier`
   dnd5e daje PB tylko biegłym (Gladiator, §5.1). Bez nowego kodu w potoku ataku.
4. **Kolbą i rękojeścią.** Broń w ręce dostaje w Oporządzeniu i w oknie ataku akcję „Atak improwizowany” — ten sam
   bliźniak (1k4 obuchowe), źródłem jest broń.
5. **Typ obrażeń (U5, MG: każdy przedmiot dostaje typ).** Czysta funkcja `typObrazenImprowizowanych(item)`: flaga
   katalogu `obrazeniaImprowizowane` (ostre: nóż w zestawie, szkło, piła — cięte; szpikulec, śrubokręt — kłute),
   inaczej obuchowe. Selektor typu w oknie obrażeń (wzorzec kart `class-resource-dice.mjs`); MG poprawia, gracz proponuje.
6. **„Działa jak…”** (s. 253): MG na bliźniaku wybiera broń białą z katalogu — bliźniak kopiuje jej kość, właściwości
   i kategorię (wtedy biegłość w tej kategorii się liczy). Noga od stołu = bejsbol.
7. **Rzut.** Po rzucie źródło ląduje na ziemi ścieżką upuszczania (`actors/ground-items.mjs`); bliźniak zostaje
   (pkt 2); `powracajaca` nie dotyczy.
8. **Łyżeczka (Gladiator):** ten sam bliźniak, liczby z tabeli wagi (kość, chwyt), maks. waga = SIŁ kg, naturalna 1 →
   przedmiot dzielony na dwa o połowie wagi. Czysta funkcja `improwizacjaZ(item, opcje)` z tabelą w danych. Wariant
   Kobaltu — §5.2.1.
9. **Ukrycie wszędzie:** karta (ekwipunek, Oporządzenie), udźwig, handel, stół wymiany, szabrowanie, rozbiórka,
   eksport postaci, `validate-packs` (żaden bliźniak w paczkach), audyt ekwipunku.

**Dlaczego trwały bliźniak, a nie przedmiot tymczasowy:** cały potok — okno ataku, okoliczności, TT, werdykt, karta
obrażeń, przerzuty — szuka przedmiotu przez UUID z wiadomości. Przedmiot niezapisany przeżyje rzut, ale nie przycisk
„Obrażenia” ani przerzut Fuksem. Koszt trwałego: jeden zapis na wzięcie do ręki, który i tak robi lejek lalki.

**Pochodnia (WKK)** zostaje własną bronią. **Broń palna rzucona** — to też bliźniak (źródło: broń).

**Wykonalność:** średnia. Ryzyka: wyciek bliźniaków do list (mitygacja: jeden predykat `jestBliźniakiem` i test
każdego widoku; karta dnd5e 6 ma hak `dnd5e.filterItem` — `false` chowa przedmiot we wszystkich listach karty),
uprawnienia gracza do tworzenia przedmiotów na własnym aktorze (są), kopiowanie aktora (bliźniak jedzie z nim —
nieszkodliwy, ukryty i bez wagi; przepina go pierwszy atak).

#### 5.2.1 Łyżeczka — wariant Kobaltu (WKK, MG 2026-10-26)

**Diagnoza.** RAW (s. 69–70): biegłość w „łyżeczce” — zbędna, bo profesja Gladiatora już daje biegłość w broni
improwizowanej; rzut do 6 m — ledwie lepiej niż 3/9 m; jedyny realny zysk to tabela wagi (1k6 do 5 kg, 2k6/3k6/4k6
oburęcznie do 20 kg, zamiast 1k4). **Odrzucone (MG):** Specjalizacja w broni (PB ×2 w Teście Ataku) — rozbija wąskie
pasmo TT na wyższych poziomach („Gladiator zestruga Juggernauta łyżeczką”); D&D nie ma eksperckiej biegłości w broni z
tego powodu. Kierunek MG: *weapon master*, *tavern brawler* — dopiski przy trafieniu i w ekonomii akcji, nie premia do
trafienia.

**Kobalt (za przełącznikiem, `scripts/wkk/`), na RAW-owej tabeli wagi:**

| Dopisek | Działanie |
|---|---|
| **Zawsze coś pod ręką** | Raz na turę, Darmowa Interakcja: łapiesz przedmiot z otoczenia, którego nie masz w ekwipunku — wybierasz klasę wagi do SIŁ kg (i nazwę). MG może zawetować na pustej scenie (karta z przyciskiem). Bliźniak bez źródła (`zrodlo: null`, `zOtoczenia: true`); naturalna 1 — przedmiot pęka, jak w RAW |
| **Dalszy rzut** | Rzut łyżeczką 6/18 m (normalny/daleki) zamiast płaskich 6 m; tabela wagi działa także dla rzutu |
| **Właściwość z rodzaju** (*weapon master*) | RAW: „kość i typ obrażeń zależne są od wagi i **rodzaju** przedmiotu (ustal to z MG)”. Gdy łyżeczka trafia do ręki, gracz wybiera **jedną** właściwość NOE, do której pasuje rodzaj przedmiotu; lista bramkowana wagą: ≤ 5 kg Lekka · Obalająca · Unieruchamiająca; 6–11 kg Obalająca · Powalająca · Unieruchamiająca; 12–17 i 18–20 kg Powalająca · Burząca. MG może zawetować na karcie. Same istniejące właściwości z istniejącą automatyką (`combat/obalajaca.mjs`, `wkk/combat/weapon-save-properties.mjs`, §5.4 dla Burzącej) |
| **Przerzut jedynek** (*tavern brawler*) | Kości obrażeń łyżeczki, które wypadną 1, przerzucasz raz — modyfikator kości rdzenia `r1` (`3d6r1`; `rr` przerzucałby do skutku) |

Przykłady: wąż ogrodowy 3 kg — Unieruchamiająca; hydrant 18 kg — Burząca; felga 8 kg — Powalająca; dwa medpaki po
0,5 kg — Lekka (drugi atak w [B]).

Bez zmian w RAW: biegłość (zbędna, zostaje), maks. waga = SIŁ, naturalna 1 → dwie połówki. Plakietka pokrycia w M7
(`PLAN_m7_zdolnosci.md` §3, Łyżeczka) wskazuje ten akapit.

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
rozmiar, kruchość, kotwica. Rozmiar żetonu z rozmiaru obiektu. **Bez grafiki (P8, MG):** obiekt to tylko licznik PW i
odporności nałożony na coś, co już jest w świecie (drzwi, kafel, drzewo z tła) — przezroczysta tekstura i sama ramka
(obrys pola żetonu), widoczna dla wszystkich, żeby gracze mogli go wskazać jako cel. MG tworzy go na żądanie, tylko dla
tego, co gracze chcą zaatakować — żeby nie mnożyć tysięcy obiektów na scenie.

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
w raporcie, dopóki MG nie podmieni mapy. **Przycisk „Zniszczenia” (U11, MG)** w kontrolkach MG: okno z listą zniszczeń
sceny (co, kiedy, kotwica) i opcjami na wpis — pokaż na mapie, przywróć (odtwórz przegrodę/kafel, skasuj X),
zapomnij (podmienione w Tiled — `map-sync` znów odtwarza z eksportu) — oraz „zapomnij wszystkie”.

**Wykonalność:** średnia. Natywny `hp.dt` i delta żetonu usuwają większość kodu. Ryzyka: RO w ścieżkach zbiorczych
(inwentarz wywołań `rollSavingThrow` — kilkanaście miejsc), silnik TT dla `npc` bez Cech (TT podana wprost — metoda
„stała”). Materiał z eksportera (encje CDDA) — świadomie poza M6, w `PLAN_1_0.md` (P5).

### 5.5 Latanie (s. 253)

**Stock 6.0.6** (`documents/token.mjs`): lotnik nie spada, dopóki nie jest Powalony ani Obezwładniony; `hover`
zwalnia. NOE: spada przy **Nieprzytomności albo Szybkości 0** (Pochwycenie, Unieruchomienie, Sparaliżowanie…,
Szybkość ruchu 0), z obrażeniami; przy **Powaleniu opada bez obrażeń**.

**Projekt:** opakowanie metod na prototypie `CONFIG.Token.documentClass` (E0e: wzorzec modułu — `actors/drony.mjs`
`_inferMovementAction`; podklasa dokumentu niczego by nie dodała) — `_isFalling`
(warunki NOE, predykat Szybkości 0 wspólny z silnikiem okoliczności — `BEZ_RUCHU`) i `plummet()` — gdy jedynym
powodem jest Powalenie, opadnięcie ruchem `fall` bez karty obrażeń. Reszta zostaje stockowa: status Spadanie, klik MG,
karta, Osteoporoza (`combat/falling.mjs`), Kocie kości „Cztery łapy” (M7) na tej samej karcie. Drony latające (M3):
Wyłączenie przy 0 PW = spadanie. Samo Obezwładnienie lotnika **nie** strąca (stock tak; NOE wymienia tylko
Nieprzytomność i Szybkość 0). Z13 (E0e): w 6.0.6 scena bez powierzchni ma podłogi w podstawach poziomów, więc spadanie
działa na każdej scenie — poprawiamy komentarze w `config/spadanie.mjs` i `combat/falling.mjs`, zachowanie zostaje.

**Wykonalność:** niska. Ryzyko: `_isFalling` jest `@internal` — wersja dnd5e i tak przypięta na betę; test warstwy 2
pilnuje kontraktu.

### 5.6 Woda i wspinaczka (D9)

**Koszt ruchu** — bez zmian (stock zgodny z RAW). Sprawdzamy tylko, że ustawienie `movementAutomation` dnd5e jest
włączone w świecie zalecanym (bramka wydania, krok `boot`).

**Regiony wody.** Nowe zachowanie `neuroshima-2026-overrides.woda` obok `strefaSkazenia` (`scenes/transitions.mjs`):
pola `glebokosc` (płytka — tylko trudny teren i Osłona ½ dla stojących; głęboka — pływanie), `nurt` (spokojna ST 10,
rwąca 15, wzburzona 20, wir 25), `grzaska` (koszt ×3 — trudny teren dnd5e na tym samym Regionie).
- **Tylko w walce (U15, MG: „poza walką nie liczymy wody — mistrz musi sam kazać”).** Poza walką Region niczego sam nie
  wystawia; MG ma w HUD żetonu stojącego w wodzie przycisk „Test pływania” (karta z ST nurtu) — ten sam, którym
  w walce może poprosić o test poza kolejką;
- `TOKEN_MOVE_IN` do głębokiej wody, w walce: karta MG „wejście w sprzęcie” (SIŁ (Atletyka) ST 10, Utrudnienia z
  pancerza liczy już `actors/armor-rules.mjs`) — RAW „MG może wymagać”, więc karta z przyciskiem, nie rzut;
- `TOKEN_TURN_START` w głębokiej wodzie bez Szybkości pływania: karta testu Atletyki ze ST nurtu; porażka → status
  „Tonie” (Szybkość 0, opada) do następnego testu. Zdarzenie przychodzi **tylko u aktywnego MG** (`Combat#onStartTurn`
  woła regiony u jednego MG — E0f), więc karta wychodzi od MG: szept do MG i właścicieli z przyciskiem rzutu dla gracza;
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
podłogi. Mapy do sprawdzenia: Zasadzka, Arena. MG (U14): Tiled eksportuje kafle wody — pod pływanie i pod status
zanurzenia.

**Grafika (U14, pytanie MG „czy jest grafika zanurzenia?”) — nie ma.** dnd5e ma tylko `suffocation.svg` (Uduszenie);
rdzeń — `icons/svg/waterfall.svg`. Do czasu dostawy: „Pod wodą” = `waterfall.svg`, „Tonie” = jej wariant z ikoną FA;
wiersze w `dev/icons/MISSING.md` (klasa A: dwie białe ikony statusu; klasa B: nakładka żetonu „zanurzony” —
falująca tafla na dolnej połowie żetonu).

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

## 6. Ustalenia projektu — po wecie MG (2026-10-26)

Kolumna „Decyzja MG” jest wpisana przez MG; tam, gdzie zmienia projekt, poprawka stoi w §5 (U2 — §5.1, U3 i U5 —
§5.2, U11 — §5.4, U14 i U15 — §5.6, U22 — §5.1).

| # | Ustalenie | Warstwa | Decyzja MG | 
|---|---|---|---|
| U1 | Specjalizacja bez biegłości nie istnieje: `forcedExpertise` tylko Gwiazda (RAW wprost) | NOE | Zgadza się. Najpierw Biegłość, później Specjalizacja. |
| U2 | Biegłości profesji przy wieloklasowości — zawsze (RAW nie wyłącza) | NOE | Wymaga sprecyzowania, niejasne. RAW powinno już definiować co multiklasowe postacie dostają a czego nie |
| U3 | Chwyt bliźniaka: do 5 kg jednoręczny, powyżej oburęczny; maks. waga do walki = SIŁ kg — oba progi z tabeli Łyżeczki, stosowane do wszystkich (Łyżeczka zmienia tylko kość obrażeń i daje biegłość); cięższe — MG | RAI | Bliźniaka przedmiotu, w postaci broni improwizowanej? Nie, 2+kg oburęczna. |
| U4 | Bliźniak nie dodaje PB bez biegłości `improwizowana`; „Działa jak…” przenosi kategorię i właściwości wzorca | NOE | Tak |
| U5 | Typ obrażeń bliźniaka: domyślnie obuchowe, ostre narzędzia (nóż w zestawie, szkło) — cięte z flagi katalogu `obrazeniaImprowizowane` | RAI | Tak jest. Każdy przedmiot dostaje typ obrażeń gdy użyty jako broń improwizowana. |
| U6 | Broń w ręce jako improwizowana: 1k4 obuchowe, bez właściwości broni | NOE | Tak jest, zgodnie z RAW |
| U7 | Zużyta wyrzutnia: waga 50% LAW, rozbiórka na surowce wg M5 | RAI | Tak |
| U8 | `długa`: liczy się odległość od krawędzi żetonów (jak reszta silnika); `ciężka`: „oparcie” to ręczny przełącznik | NOE | Tak |
| U9 | Rozmiar obiektu z wagi przedmiotu: ≤ 1 kg Malutki, ≤ 10 kg Mały, ≤ 100 kg Średni, więcej Duży | RAI | Tak |
| U10 | Domyślne szablony przegród: drzwi — Średni, drewno, wytrzymały; drzwi stalowe — Średni, cienka blacha, twardy; okno — Duży, szkło, kruchy; płot — Duży, cienka blacha, wytrzymały; balustrada — Średni, drewno, wytrzymały | RAI | Tak |
| U11 | Pamięć zniszczeń na scenie chroni przed odtworzeniem przy ponownym eksporcie; MG czyści ją przyciskiem po podmianie w Tiled | — | Tak, wydaje się że zaczyna być potrzeba guzika z odpowiednimi opcjami interakcji |
| U12 | X po zniszczeniu widzą wszyscy; notka o Tiled — tylko MG | — | Tak |
| U13 | Lotnik Powalony opada tym samym ruchem `fall`, ale bez karty; Szybkość 0 = status z `BEZ_RUCHU` albo zerowa Szybkość ruchu po efektach | NOE | Tak |
| U14 | „Pod wodą” to status (HUD i Region), nie wysokość żetonu | — | Tak. Tiled powinno eksportować kafelki wody, na potrzeby pływania i ewentualnego statusu zanurzenia. Czy jest grafika zanurzenia? |
| U15 | Test wody na początku tury tylko w walce; poza walką — karta przy wejściu i co minutę zegara świata na żądanie MG | RAI | Poza walką nie liczymy wody - mistrz musi sam kazać |
| U16 | ~~Limit skoku~~ — `HANDOFF_movement_hotbar.md` (podpowiedź czy blokada: tamten §10) | — | N/A |
| U17–U21 | ~~Wierzchowce~~ — `PLAN_m4_pojazdy.md` §6.3 (W-U1–W-U5) | — | N/A |
| U22 | Instrumenty: cecha rządząca CHA dla wszystkich (Występy), do potwierdzenia — P1 | RAI | No.. tak, zgodnie z RAW. Jak inaczej? Dlaczego miałoby być inaczej? |
| U23 | Gwiazda „dwie umiejętności albo umiejętność i zestaw” = dwa wybory po 1 (drugi: umiejętność albo zestaw) | NOE | Tak |
| U24 | Zabójca „wszystkie bronie” = stałe nadanie 7 kategorii broni; `improwizowana` nie wchodzi — tę biegłość RAW nadaje jawnie (Gladiator) | RAI | Nie. Wszystkie to Wszystkie. | 

---

## 7. Otwarte → rozstrzygnięte (MG, 2026-10-26)

| # | Pytanie | Propozycja | Decyzja MG |
|---|---|---|---|
| P1 | Cecha rządząca instrumentów | CHA dla wszystkich (U22) | Wg RAW — s. 132 mówi „Charyzma lub Zręczność”: CHA domyślnie, ZRC w oknie rzutu (§5.1) |
| P2 | `container` (plecak, skrzynia) jako broń improwizowana z zawartością | Tak, waga z zawartością; zawartość zostaje | Tak |
| P3 | Akcja bonusowa jako drugi znacznik obok Reakcji | Rozstrzyga `PLAN_m7_zdolnosci.md` P1 | Bez zmian — M7 |
| P4 | ~~Pościg konny~~ | `PLAN_m4_pojazdy.md` §6.3, W-P1 | — |
| P5 | Materiał przegród z encji CDDA (opcja C) | Po becie; pole `material` w fladze ściany i tak zarezerwowane | **Jawny plan wydania 1.0 — [`PLAN_1_0.md`](PLAN_1_0.md) §2** |
| P6 | ~~Wierzchowce poza koniem~~ | `PLAN_m4_pojazdy.md` §6.3, W-P2 | — |
| P7 | Bestiariusz na natywny `hp.dt` zamiast flagi | PM — razem z PM1 (TT), bo zmienia dane | MG poprosił o wyjaśnienie — niżej; bez zmiany kolejności |
| P8 | Obiekt widoczny dla graczy przed zniszczeniem (ramka) czy tylko po wycelowaniu | Widoczny — gracze muszą móc go wskazać | **Licznik PW/odporności bez grafiki, tylko ramka na czymś, co już jest w świecie; MG tworzy go na żądanie, dla tego, co gracze chcą zaatakować** (§5.4) |

**P7 — co to jest `hp.dt`.** dnd5e 6.0 dał każdemu typowi aktora pole `system.attributes.hp.dt` — Próg obrażeń (5.3
miał je tylko na pojazdach). `Actor5e#calculateDamage` liczy najpierw niewrażliwości, modyfikacje, mnożnik
(`options.multiplier`), odporność i podatność, sumuje i dopiero wtedy, gdy suma jest dodatnia, a mniejsza niż `dt`,
zeruje całość (chyba że `options.ignore.threshold` — tak już działa `ppanc` i `przebijająca`). To dokładnie NOE s. 254:
„najpierw RO, następnie odporność, a na końcu Próg”, liczony od obrażeń jednego ataku. Dziś 6 istot Bestiariusza trzyma
Próg we fladze `bestiary.damageThreshold`, a nasz hak `dnd5e.preCalculateDamage` (`combat/bestiary-thresholds.mjs`)
zeruje obrażenia poniżej niego — napisany, kiedy dnd5e nie miał progu poza pojazdami. **I odbiega od RAW:** `pre…` widzi
obrażenia przed odpornością, więc 8 obrażeń w istotę z odpornością i Progiem 5 przechodzi (8 ≥ 5), a potem odporność
zostawia 4 — RAW daje 0 (8 → 4 → poniżej progu). Kolejność poprawiamy w E4 bez zmiany danych (hak na
`dnd5e.calculateDamage`, po odporności — tam, gdzie liczy dnd5e). Przeniesienie = generator Bestiariusza wpisuje
`hp.dt`, hak znika, taca obrażeń sama pokazuje „próg” (dziś pokazuje pełne obrażenia, a potem dostaje 0). Obiekty z M6
od razu używają `hp.dt`, więc po P7 jest jedna implementacja zamiast dwóch. Czemu nie teraz: zmienia zapisane dane
aktorów Bestiariusza (paczka i kopie w świecie) — tak jak PM1 (TT jako obliczenie KP dnd5e), więc obie zmiany idą
razem jednym przebudowaniem i jedną migracją, przed zamrożeniem modeli (B2).

---|---|---|
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
| **E1** | Biegłości profesji (§5.1): dane 18 profesji, instrumenty (droga z E0b), Cwaniak/Kowboj/Muzyk, `weapon:improwizowana`, `armor:hvy`, ostrzeżenie D1, biegłości wieloklasowe (Z14, Z15), `validate-packs`, e2e `postac` do 3. poziomu, `bieglosci.audyt()`. Na koniec: **`HANDOFF_bieglosci_retro.md`** dla LLM (D4) — lista postaci, wynik audytu, zasady uzupełniania, co pytać MG | M | E0a, E0b | Postać od zera ma komplet; audyt zwraca braki BG kampanii i pregenów |
| **E2** | Właściwości broni (§5.3): `długa`, `ciężka` (+ RO serii), `jednorazowa` → zużyta wyrzutnia | S–M | — | Testy warstwy 1 wierszy; e2e `combat` krok LAW |
| **E3** | Improwizacja (§5.2): rodzina `wRece`, bliźniak, kolba, „Działa jak…”, rzut na ziemię, ukrycie wszędzie, Łyżeczka (liczby RAW + wariant Kobaltu, §5.2.1) | M–L | E0c, E1 (biegłość) | e2e `improwizacja` (gracz bije medpakiem, rzuca łomem, Gladiator z PB); stanowisko Poligonu |
| **E4** | Obiekty (§5.4): aktor bazowy, okno z tabelami, Ufizycznij z kotwicami, auto-porażka RO (inwentarz ścieżek), ×2, zniszczenie z kartą, X, pamięć zniszczeń w `map-sync`, przycisk „Zniszczenia” (U11), kolejność Progu Bestiariusza po odporności (§7, P7) | M–L | — | e2e `obiekt` (drzwi z eksportu: strzał, granat, `burząca`, otwarcie); stanowisko Poligonu |
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

### E0 — spiki (2026-10-26)

Z kodu dnd5e 6.0.6 i rdzenia 14.369; każde „tak” sprawdza na żywo test etapu, który z niego korzysta.

| Spike | Wynik | Notatka |
|---|---|---|
| **a** `Trait` `upgrade` na subklasie + ostrzeżenie | **Tak** | `TraitAdvancement#apply`: `upgrade` 0→1, 1→2, 2→2 (bez zmiany). `actorSelected` w trybie innym niż `default` bierze tylko cechy z `expertise` (umiejętności, narzędzia) — broń i pancerz w osobnym awansie `default` (§5.1). Awanse subklasy stosują się przy poziomie klasy rodzica (wzorzec 2024). Ostrzeżenie: `dnd5e.preAdvancementManagerComplete(manager, actorUpdates, …)` — porównanie `manager.actor` z klonem. Przy okazji Z14: `classRestriction` + `Advancement#appliesToClass` to gotowy mechanizm dla biegłości wieloklasowych. Na żywo: e2e `postac` (E1) |
| **b** Przedmioty bazowe narzędzi → natywne kategorie | **Tak, droga 1** | Indeks paczek przychodzi z danymi świata (konstruktor `CompendiumCollection` czyta `metadata.index`), więc `Trait.keyLabel` znajduje nazwę przedmiotu bazowego synchronicznie od `setup`; `categories()` dociąga `system.type.value` sam. **22 zestawy już są przedmiotami bazowymi** w paczce `narzedzia` (`idFor("toolkit", id)`, `type.value: "tool"`) — dochodzi tylko 12 instrumentów (`music`). Lustro etykiet w `toolProficiencies` znika (dublowałoby wpisy w kategoriach). Id literałami + `validate-packs` (§5.1). Do poprawy przy okazji: `tool-expr.mjs` (`TOOL_KEYS` vs `CONFIG.DND5E.tools` — test w obie strony), lista narzędzi w `postoj/zajecia.mjs`, ikony biegłości (12 nowych — MISSING), `config.test.mjs` |
| **c** Bliźniak w lejku lalki | **Tak, z korektą** | Karta dnd5e 6 filtruje każdą listę przez `_filterItem` → hak `dnd5e.filterItem` (`false` = ukryj). Lalka pomija bliźniaka (`dollSlot: "none"`; typ `improwizowana` poza `MELEE_TYPES`/`RANGED_TYPES`). Właściciel tworzy przedmioty na swoim aktorze. **Korekta §5.2:** bliźniak powstaje przy pierwszym ataku, nie przy wzięciu do ręki, i nie znika z ręką (rzut → przycisk „Obrażenia” po UUID). Na żywo: e2e `improwizacja` (E3) |
| ~~d~~ | — | W0 w M4 |
| **e** `_isFalling`/`plummet` | **Opakowanie prototypu** | Wzorzec modułu (`actors/drony.mjs` `_inferMovementAction`); podklasa nic nie daje. Z13: scena bez powierzchni ma podłogę w podstawie każdego poziomu — spadanie działa wszędzie; komentarze do poprawy. Stock strąca lotnika także przy Obezwładnieniu — NOE nie (§5.5) |
| **f** Region wody: `TOKEN_TURN_START` | **U aktywnego MG** | `Combat#onStartTurn` (tylko jeden MG) → `#triggerRegionEvents`; `event.user` to ten MG. Zachowanie `woda` nie filtruje po `isSelf` poruszającego (jak `TOKEN_MOVE_IN` w `transitions.mjs`), tylko po `game.user.isActiveGM`, i wystawia kartę od MG (§5.6) |

**Korekty planu z E0 i z weta:** §3 Z14–Z15; §5.1 (wieloklasowość, cecha instrumentów, id literałami, ostrzeżenie
dla broni i pancerzy); §5.2 (bliźniak leniwy i trwały, chwyt 2 kg, typ obrażeń każdego przedmiotu, §5.2.1 Łyżeczka
WKK); §5.4 (P8 bez grafiki, przycisk „Zniszczenia”); §5.5 (opakowanie, Obezwładnienie); §5.6 (woda tylko w walce,
karta od MG, grafika — MISSING); §7 (decyzje, `hp.dt`, kolejność Progu w E4); `PLAN_1_0.md` (P5).
