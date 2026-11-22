# PLAN — Magazynki symulacyjne

Status: **ZREALIZOWANY** — 2026-09-22, gałąź `classical_magazines`. Decyzje MG zapadły
2026-09-21, punkty otwarte (§12a) rozstrzygnięte 2026-09-22 — patrz §15 na końcu.

Ten dokument zostaje jako **projekt i uzasadnienie**, nie jako lista zadań. Co faktycznie
powstało i gdzie, opisuje `IMPLEMENTATION.md` (36).

Zastępuje `PLAN_magazine_system.md` (magazynki kwantowe, zrealizowane w `actors/magazine-inventory.mjs`
+ `weapons/magazine.mjs`). Tamten dokument zostaje jako historia decyzji, ale opisany w nim model
jest **wycofywany** — patrz §2.

Kontekst: konsultacja z autorem mechaniki (Marcin Kubiesa) co do tego, jak magazynki powinny
działać w *Neuroshima: Ostatnia Era*. Wnioski z niej są wpisane w poszczególne sekcje poniżej.

---

## 1. Decyzja

Magazynek jest **fizycznym pojemnikiem na naboje**, przypisanym do konkretnego **modelu broni**,
o **uporządkowanej** zawartości. Ładuje się go i rozładowuje ręcznie, wyłącznie poza walką.
W walce można go tylko wymienić na inny, lub wypiąć.

Trzy filary:

1. **Per model broni.** Magazynek od AR nie wejdzie do Scara. RAW wycenia magazynki tylko per
   kategoria broni, ale autor wprost: *„jak już robisz do tego bezbolesne oprogramowanie, to
   oczywiście lepiej zrób z podziałem na modele broni"*. Kluczem jest **magwell** — domyślnie
   równy modelowi, ale pozwalający wariantom tej samej broni dzielić magazynki (§3).
2. **Zawartość jako kolejka.** Magazynek trzyma listę kalibrów w kolejności podawania, nie jeden
   typ i licznik. W świecie NOE mieszany magazynek jest normą, nie wyjątkiem — postać może biegać
   z jednym dum-dum w komorze, trzema przedwojennymi i trzema samoróbkami w magazynku.
   Model, który tego nie unosi, działa **na niekorzyść gracza**.
3. **Zero automatyki uzupełniania.** Heurystyka „które z trzech 7.62 napełnić" nie ma dobrej
   odpowiedzi. Ładowanie to jawna interakcja gracza, jak czyszczenie broni.

### Jak czytamy liczbę z tabeli

RAW, właściwość **Mag./Bęb.**:

> Ta wartość informuje, ile naboi można **jednorazowo załadować** do konkretnego typu broni.

„Jednorazowo" modyfikuje *załadować*, nie *mieści* — to ograniczenie na **pojedynczą czynność
ładowania**, nie na fizyczną pojemność. Trzydziesty pierwszy nabój nie wchodzi „jednorazowo";
wchodzi osobnym aktem (dosłanie z magazynka, potem podmiana magazynka na pełny). Dlatego pojemność
magazynka = liczba z tabeli, a pojemność **broni** = liczba z tabeli + komora (§5).

---

## 2. Co znika

Magazynki kwantowe (amunicja materializuje się w momencie wymiany, magazynki same z siebie nic nie
trzymają) wypadają z modułu. Do usunięcia:

| Element | Plik |
|---|---|
| Flaga `ready` i całe jej odczytywanie/zapisywanie | `actors/magazine-inventory.mjs`, `weapons/magazine.mjs` |
| Kolumna „Gotowych" + jej przyciski ± | `actors/magazine-inventory.mjs` |
| `_restoreQuantumMagazines`, `_restoreQuantumMagazinesForActor` | `weapons/magazine.mjs` |
| Hooki `deleteCombat` / `deleteCombatant` | `weapons/magazine.mjs`, `registerMagazines()` |
| `restoreQuantumMagazinesForActor` w `__testing` + testy, które go wołają | `weapons/magazine.mjs`, `scripts/tests/amunicja.test.mjs` |
| 6 podtypów `magazine-*` jako **model** | `actors/magazine-inventory.mjs` |
| Ciągnięcie naboi z luźnej puli przy wymianie magazynka w walce | `_onClickReload`, krok 4–5 |

`MAG_SUBTYPES` / `MAG_LABELS` / `MAG_ICONS` zostają, ale degradowane do **klas rozmiaru** — służą
już tylko do ikon, cen i wag. **Nie są kluczem kompatybilności** i nie są fallbackiem dla broni
o nieustalonym modelu: taka broń po prostu nie obsługuje wymiennych magazynków (§3).

### Magazynek generyczny przestaje istnieć jako przedmiot

**Nie wolno stworzyć itemu „Magazynek (broń palna pośrednia)".** Kategoria broni jest odtąd
wyłącznie **pojęciem cennikowym** — można kupić „Magazynek do Desert Eagle", nie „Magazynek do
pistoletu". Wynika to z per-model (§3), ale trzeba to powiedzieć wprost, bo generyczne magazynki
mają dwa wejścia tylnymi drzwiami: `Tabele/Sklepy/Dostepnosc.md` i `Integracje/loot_generator.py`
produkują je dziś pod taką właśnie nazwą. Oba wymagają zmiany razem z tą przebudową.

**Ikony natomiast zostają i są potrzebne.** „Magazynek do AR" bierze ikonę karabinową, „do Desert
Eagle" pistoletową — dokładnie te same sześć plików co dziś. Alternatywa to 28 dedykowanych ikon,
czyli trzy pełne batche na przedmioty, które i tak wyglądają tak samo.

### Magazynki Chromowe — odłożone

Cytat z Chromu: *„Amunicja. Kto by ją liczył? Masz spluwę, więc masz do niej kulki. Ale przez to,
że się tym nie martwisz, bywa, że zapomnisz ją załadować. Kiedy w Teście Ataku bronią palną
wypadnie naturalna 1, zamiast wystrzału słyszysz głuche kliknięcie, oznaczające pusty magazynek."*

Czyli Chrom to **brak liczenia amunicji w ogóle** + kara na naturalnej 1 — a nie magazynki
kwantowe. Implementacja: jeden hook na wyniku ataku bronią palną, `WeaponSound.EMPTY_CLICK` (już
jest), zablokowanie obrażeń, cały aparat `mag`/`uses` wyłączony. Tanie, ale **nie w tym kawałku** —
Kolory (Rdza / Rtęć / Stal / Chrom) są osobnym, znacznie większym tematem i mają niski priorytet.
Dla wszystkich pozostałych Kolorów i dla braku Koloru obowiązuje model symulacyjny z tego planu.

---

## 3. Tożsamość modelu broni — bez fuzzy matchingu

Magazynek musi wiedzieć, do jakiego **modelu** pasuje. Broń tworzona ręcznie w świecie nie ma
sluga z tabel, a nazwy w świecie rozjechały się z `weapons-data.mjs` („Trzydziestka", „AK").
Zgadywanie po nazwie jest niedopuszczalne. Trzy warstwy:

1. **Pack stempluje sluga.** `dev/packs/build-packs.mjs` używa już deterministycznych ID
   (`idFor("weapon", id)`). Dopisujemy do każdego przedmiotu broni
   `flags.<MODULE_ID>.weaponId = <slug>`. Przeżywa drag&drop, duplikację, eksport, import.
2. **`_stats.compendiumSource` jako darmowy backup.** Zweryfikowane w źródle FVTT v14:
   `ClientDocument.fromDropData()` (`client/documents/abstract/client-document.mjs:988`) stempluje
   UUID źródła na dokumencie **zanim** karta postaci zobaczy dane — dla każdego drag&dropa, bez
   naszego kodu. Deterministyczne ID packa robią z mapowania UUID → slug czysty lookup.
3. **Migracja kasuje i odtwarza.** Świat jest w trakcie importu i jeszcze się na nim nie grało, więc
   instancje broni palnej można skasować i utworzyć od nowa z kompendium — patrz §10.

Rozstrzyganie w runtime, w tej kolejności, bez żadnego dopasowania rozmytego:

```
flags.<MODULE_ID>.weaponId
  → _stats.compendiumSource (UUID → slug przez mapę deterministycznych ID)
  → system.identifier
  → null  ⇒ broń nie obsługuje magazynków wymiennych; klasy rozmiaru służą już tylko do ikon
```

Magazynki idą tym samym wzorcem: pack stempluje `flags.<MODULE_ID>.magazine.id`, runtime rozwiązuje
z niego definicję w `magazines-data.mjs`. Magazynek o nierozpoznanym `id` jest inertny — tak samo
jak broń o nierozpoznanym modelu.

### Magwell — które bronie dzielą magazynek

Kluczem kompatybilności **nie jest slug broni**, tylko **magwell** (gniazdo magazynka), domyślnie
równy slugowi:

```js
// config/weapons-data.mjs
{ id: "desert-eagle", caliber: "44mag", mag: { kind: "mag", max: 8 } }   // magwell = "desert-eagle"
// wkk/config/weapons-data.mjs
{ id: "zloty-desert-eagle", magwell: "desert-eagle", … }                  // dzieli magazynki z DE
```

```
magwellOf(weapon) = entry.magwell ?? entry.id
magazynek pasuje ⟺ mag.magwell === magwellOf(weapon)
```

Jedno opcjonalne pole, jedno `??`. Bez niego każda nazwana/unikalna wersja standardowej broni
(Złoty Desert Eagle Lorentza i wszystko, co przyjdzie po nim) wymagałaby własnych magazynków, co
jest i nierealistyczne, i upierdliwe przy stole.

Dwie rzeczy do pilnowania:

- **Generator pomija wpisy z jawnym `magwell`** — inaczej wyprodukuje „Magazynek do Złotego Desert
  Eagle" obok normalnego.
- **Asercja danych:** wszystkie bronie o wspólnym `magwell` muszą mieć ten sam `caliber` i to samo
  `mag.max`. Różna pojemność znaczyłaby, że fizycznie nie mogą dzielić magazynka.

### `magazines-data.mjs` — generowana podstawa + ręczne warianty

Nie wpisujemy 28 magazynków ręcznie. Podstawę generujemy z `weapons-data.mjs`:

- jeden magazynek na każdą broń z `mag.kind === "mag"` (20 modeli),
- jedna szybkoładowarka na każdy kaliber rewolwerowy z `mag.kind === "beb"` (22lr, 38spl, 45acp,
  44mag — wszystkie 6-strzałowe),
- jedna taśma na każdą broń z `mag.kind === "belt"` (Browning 250, Minimi 100, The Pig 200,
  Minigun 1000),
- **dwa kołczany, uniwersalne** — patrz niżej.

### Kołczan — jedyny prawdziwie uniwersalny pojemnik

RAW: *„Strzała — amunicja do **wszystkich** łuków"*, *„Bełt — amunicja do **wszystkich** kusz"*,
a `Amunicja.md` wycenia „Kołczan na bełty/strzały" jedną pozycją (15 gb / 60%). Czyli tutaj
uniwersalność jest zasadą, nie uproszczeniem.

W kodzie nie jest to wyjątek, tylko dwa wpisy w danych: wszystkie łuki dostają `magwell: "luk"`,
wszystkie kusze `magwell: "kusza"`. Mechanizm z §3 obsługuje to bez jednej linijki więcej.

Każdy wpis ma **własne `id`**, niezależne od sluga broni — to jest to, co pozwala obsłużyć
magazynki o różnej pojemności:

```js
{ id: "mag-ar",    magwell: "ar", caliber: "556", capacity: 30, … }  // generowany, standardowy
{ id: "mag-ar-50", magwell: "ar", caliber: "556", capacity: 50, … }  // wariant RAW, patrz niżej
```

Runtime nigdzie nie zakłada, że model broni ma dokładnie jeden magazynek — `capacity` czytane jest
z wpiętego magazynka, więc AR z pięćdziesiątką pokazuje 51 bez zmiany kodu. `mag.max`
w `weapons-data.mjs` znaczy odtąd „pojemność **standardowego** magazynka tego modelu" — czyli
dokładnie to, czym jest w tabeli podręcznikowej.

### Warianty pojemności są RAW, nie funkcją na przyszłość

`Tabele/Narzedzia.md` ma gotową usługę rusznikarską:

> | Zmiana pojemności magazynka | magazynki wymienne + mały rusznikarz (ST 15) | **BPK: 5/10/20/30; BPP i BPD: 30/50/100** | 20 gb |

Czyli usługa rusznikarska, która już istnieje w zasadach — mechanizm wariantów musi być gotowy
od początku, bo inaczej dorabianie go później oznacza migrację.

**Ale na start generujemy tylko jeden wariant.** Pełna siatka (każdy `magwell` × każda dozwolona
pojemność) to kilkadziesiąt dodatkowych wpisów w packu i w folderze Zbrojowni, zanim ktokolwiek
zapłacił rusznikarzowi za pierwszy. Jeden wpis wystarczy jako smoke test całej ścieżki
(definicja → pack → instancja → `capacity` czytane z magazynka → `max` na karcie):

```js
{ id: "mag-hk-g3-50", magwell: "hk-g3", caliber: "762", capacity: 50, … }
```

H&K G3 to broń Alana, a 50 to środkowa z RAW-owych opcji dla BPD (30/50/100) — widać różnicę
względem standardowej trzydziestki, a nie wygląda absurdalnie jak bęben na 100. Wpis jest
RAW-legalny, więc **NOE, nie WKK**; to, że akurat Alan dostał taką sztukę, jest zdarzeniem
w świecie, nie treścią modułu.

Resztę wariantów dopisuje się wtedy, gdy ktoś faktycznie pójdzie do rusznikarza.

### Cena i waga — z RAW, per kategoria broni

`Tabele/Bronie/Amunicja.md`, sekcja *Magazynki Wymienne* („Bronie z właściwością *Wmag* nie
posiadają wymiennych magazynków"):

| Kategoria broni | Cena | Dostępność |
|---|---|---|
| Broń palna krótka | 20 | 60% |
| Broń palna pośrednia | 30 | 50% |
| Broń palna długa | 35 | 40% |
| Broń palna ciężka | 50 | 10% |
| Kołczan na bełty/strzały | 15 | 60% |

**Te liczby zastępują `MAG_PRICES` z systemu kwantowego** (10/15/20/40/5/8), które nie miały
podstawy w RAW. Waga: 0,2 kg dla BPK wg `Tabele/Sklepy/Dostepnosc.md`, reszta skalowana.
RAW nie zna osobnej pozycji cenowej dla szybkoładowarki — wchodzi pod „broń palna krótka".

**Pułapka nazewnicza:** `caliber: "belt"` to **bełt** (kusza), a `mag.kind: "belt"` to **taśma**.
Ten sam string, dwa różne pola, dwa różne znaczenia. Generator musi filtrować po `mag.kind`,
nigdy po `caliber` — inaczej wyprodukuje taśmę do kuszy.

**Notatka do danych:** w tabelach jedyna kolizja (kaliber, pojemność) to Scar i HK G3 — oba 7.62 / 30.
Realnie te bronie magazynków nie dzielą, więc osobne wpisy są poprawne; gdyby decyzja była inna,
wystarczy `magwell` na jednym z nich.

**Miejsce na modyfikatory (nie budujemy teraz).** Duże magazynki bywają awaryjne — jeśli kiedyś
ma to wpływać na szansę zacięcia albo na poręczność broni, miejscem jest pole we wpisie
`magazines-data.mjs`, które czyta `weapons/jams.mjs` z wpiętego magazynka. **Nie** Active Effect na
itemie magazynka: AE aplikują się do aktora, nie do siostrzanego itemu, więc z magazynka na broń
nie przejdą.

---

## 4. Model danych

### Magazynek (item `consumable`)

```js
flags[MODULE_ID].magazine = {
  id: "mag-ar-40",             // klucz do magazines-data.mjs (magwell, caliber, capacity)
  rounds: ["556_ap", "556", …] // KOLEJKA W KOLEJNOŚCI WYSTRZAŁU; index 0 = następny
}
```

Na instancji siedzi **wyłącznie to, co się zmienia**. `magwell`, `caliber` i `capacity` żyją
w definicji (§3) — ten sam wzorzec co broń: pack stempluje `id`, runtime rozwiązuje resztę.

`rounds.length <= capacity`. Pusta tablica = magazynek pusty, ale nadal istnieje jako przedmiot.

**Kolejność to kolejność wystrzału, nie fizyczny stos.** Realnie magazynek jest stosem — ostatni
włożony wychodzi pierwszy — ale nikt tak nie myśli ani nie chce klikać. Lista jest zawsze
wyświetlana i edytowana w kolejności wystrzału. Kierunku fizycznego stosu nie modelujemy: zero
zysku, gwarantowane pomyłki.

**Magazynki nie stackują się.** Dwa magazynki 5.56 o różnej zawartości to dwa osobne dokumenty
Item; `system.quantity` zostaje na 1. To bezpośrednia konsekwencja §1.2 i główna zmiana w UI (§7).

### Broń (item `weapon`)

```js
flags[MODULE_ID].weaponId  = "ar"               // §3
flags[MODULE_ID].loadedMag = "<itemId>" | null  // wpięty magazynek
flags[MODULE_ID].chamber   = { caliberId: "556_ap" | null }   // null = pusta
```

`chamber` zastępuje dzisiejszą flagę `{ loaded: bool }` — `caliberId` niesie tę samą informację
(`null` = pusta) i dodatkowo typ naboju, który tam siedzi. Bez tego „dum-dum w komorze przy
samoróbkach w magazynku" nie da się wyrazić.

### Fasada — kluczowa decyzja migracyjna

`getMag()`, `setMag()`, `spendRound()`, `spendRounds()` **zachowują dzisiejszy kontrakt**:

```js
getMag(weapon) → { current, max, ammoType }
//   current  = (chamber ? 1 : 0) + source.rounds.length
//   max      = source.capacity + (hasChamber ? 1 : 0)      // §5
//   ammoType = kaliber naboju, który poleci następny (chamber → rounds[0])
```

Dzięki temu `weapons/fire-modes.mjs`, `weapons/jams.mjs`, `wkk/items/pistolet-na-race.mjs`,
`game.neuroshima.magazynki` i testy Quench **nie wymagają zmian**. Storage się zmienia, API nie.

`system.uses.max/spent` degraduje się do **widoku** — dnd5e i karta postaci nadal go pokazują, ale
źródłem prawdy jest magazynek. `_applyMagazineState` przestaje być właścicielem stanu.

---

## 5. Komora

### Dwa zadania, nie jedno

Komora robi dwie różne rzeczy i tylko jedna z nich jest specyficzna dla `przeladowanie`:

| Zadanie | Dla kogo | Potrzebne |
|---|---|---|
| **Stan** — pusta/pełna, wymaga czynności między strzałami | wyłącznie `przeladowanie` / `ladowanie` | tak, wprost RAW |
| **Zawartość** — jaki konkretnie nabój tam siedzi | każda broń z odpinalnym źródłem zasilania | tak, to dum-dum w komorze |

Dla broni automatycznej stan komory nigdy nie jest ciekawy — zawsze jest pełna, dopóki są naboje.
Ale zawartość jest, i to właśnie u broni z wymiennym magazynkiem, czyli u tych **bez**
`przeladowanie`: żeby komora miała *inny* nabój niż magazynek, trzeba było dosłać nabój, a potem
podmienić magazynek na inaczej załadowany. Stąd komora istnieje dla **każdej** broni; różni je tylko
sposób, w jaki się napełnia.

### Tryb podawania — wyprowadzony, nie zapisany

```
feed = "manual"  ⟺  właściwość przeladowanie LUB ladowanie
feed = "auto"    ⟺  wszystko pozostałe
```

Cykl strzału jest jeden dla wszystkich broni:

1. Komora pusta → suchy klik / trzeba przeładować.
2. Strzał — **kaliber z komory** decyduje o obrażeniach.
3. Komora pusta.
4. `auto` → natychmiast dociąga następny nabój ze źródła (magazynek / rura / bębenek).
   `manual` → zostaje pusta; gracz przeładowuje (`przeladowanie`) albo ładuje (`ladowanie`).

Zero nowych danych — `feed` czyta się z właściwości, które już są w `weapons-data.mjs`.

**Reguła musi patrzeć na właściwość, nie na `mag.kind`.** MGL1S ma `przeladowanie` + `beb`
(bez `wmag`), a kusza automatyczna `przeladowanie` + `wmag` — każda wersja wiążąca komorę
z `wmag` miałaby dziurę od pierwszego dnia.

### Pojemność: `+1`

Pojemność **magazynka** = liczba z tabeli. Pojemność **broni** = liczba z tabeli + komora.
Uzasadnienie w §1: RAW ogranicza pojedynczą czynność ładowania, nie fizyczną pojemność.

To, co z tego wynika w grze, jest celowe:

- Pusta broń + pełny magazynek → dosłanie z magazynka → **30/31**.
- Podmiana magazynka **zanim** się skończy → nabój w komorze zostaje → **31/31**.

Liczba na karcie sama uczy tactical reloadu, bez żadnej dodatkowej reguły.

### Które bronie mają komorę

`+1` dotyczy broni, w której źródło zasilania jest **odrębne od komory**:

| `+1` | Bez `+1` |
|---|---|
| `mag` (20 modeli), `belt` (4), `wmag` z osobną rurą: Pompka, Deer Hunter, R700, Lewar M95, Field 03, M1 US Rifle | `beb` — komory bębenka *są* pojemnością; oraz 7 broni, w których „magazynek" to same komory: Obrzyn, Dwururka, Samoróbka, Strzelba Palmera, Thumper, Bazooka, Moździerz |

Prawa kolumna to **jawne `chamber: false`** na 7 wpisach w `weapons-data.mjs` (`beb` wynika
z `mag.kind`). Nie da się tego wyprowadzić z istniejących pól: M1 (`wmag`, bez właściwości) dostaje
`+1`, a Obrzyn (`wmag`, bez właściwości) nie. Heurystyka `max >= 5` działałaby dziś i pękłaby przy
pierwszej nowej broni — 7 jawnych wpisów jest tańsze niż spryt.

### Kiedy pokazywać komorę w UI

Pokazuj, gdy jest **akcjonowalna** albo gdy się **różni**:

- `feed === "manual"` → zawsze; gracz musi wiedzieć, czy może strzelić,
- kaliber w komorze ≠ kaliber następnego naboju w źródle → zawsze (dum-dum),
- w pozostałych przypadkach → ukryj, to szum.

LAW nie ma wpisu `mag` ani kalibru i ma właściwość `jednorazowa` (`weapons.mjs:114` — *„Z broni
można wystrzelić tylko raz; nie da się do niej załadować ponownie amunicji"*). Nigdy nie był
w systemie magazynków.

---

## 6. Akcje i ekonomia akcji

### Poza walką

| Czynność | Efekt |
|---|---|
| **Załaduj magazynek** | okno ładowania (§7) — transfer luźne naboje → `rounds`, z wyborem typu i ilości |
| **Rozładuj magazynek** | transfer `rounds` → luźne naboje, **wyłącznie w całości** |
| **Wepnij / Wymień magazynek** | podmiana `loadedMag`, stary ląduje w ekwipunku ze swoją zawartością |
| **Wypnij magazynek** | `loadedMag = null`; magazynek trafia do ekwipunku z zawartością, broń zostaje z samym nabojem w komorze (`1/max`) |

Rozładowanie tylko w całości jest świadome: częściowe natychmiast rodzi pytanie „które trzy
naboje", a przy pełnym nie rodzi żadnego.

**Wypinanie dostaje każda broń z wymiennym magazynkiem** (`mag` i `belt`; `wmag` i `beb` nie mają
czego wypinać) i to jest celowe źródło zagrywek: postać mająca dwie bronie o wspólnym `magwell`
(§3) może wyjąć magazynek z jednej i nosić go jako zapasowy do drugiej — kosztem unieruchomienia
tej pierwszej na jednym naboju w komorze. Żadnej reguły specjalnej to nie wymaga; wychodzi samo
z `magwell` + komory.

**Wypięcie to wymiana z `null` jako celem** — jedna ścieżka kodu, jeden koszt, zero przypadku
specjalnego. Działa też w walce (§„W walce — dozwolone").

Każda z nich: karta czatu + dźwięk, wzorem czyszczenia broni. Bez automatycznego uzupełniania —
nigdy, w żadnym trybie.

### W walce — dozwolone

Wszystko poniżej jest wprost w RAW; moduł już to (poza wymianą magazynka) implementuje poprawnie.

| Czynność | Koszt | Źródło |
|---|---|---|
| Wymiana magazynka na inny **z ekwipunku**, z jego własną zawartością | akcja Używanie; Akcja bonusowa ze Sztuczką *Szybka wymiana* | Mag./Bęb. |
| **Wypięcie magazynka** bez wkładania nowego | j.w. — ta sama cena | patrz niżej |
| Załadowanie 1 naboju do **bębenka** rewolwera, albo całego bębenka szybkoładowarką | akcja Używanie; Akcja bonusowa ze Sztuczką *Szybkie przeładowanie* | Mag./Bęb., `beb` |
| Załadowanie 1 naboju do **magazynka wewnętrznego** (`wmag`) | akcja Używanie; Akcja bonusowa ze Sztuczką *Szybkie przeładowanie* | `wmag` |
| `ladowanie` — załadowanie nowej sztuki po każdym strzale | akcja Używanie **lub** Akcja bonusowa | `ladowanie` |
| `przeladowanie` — przeładowanie zamka/pompki po strzale, bez zużycia amunicji | darmowa interakcja **lub** Akcja bonusowa | `przeladowanie` |

**Dlaczego wypięcie kosztuje tyle co wymiana.** RAW wycenia wyłącznie wymianę i nie zna żadnej
tańszej kategorii, więc wymyślanie darmowej interakcji byłoby większą samowolką niż wycena przez
analogię. Exploita to nie tworzy: wypięcie zostawia broń na `1/max`, czyli jest ściśle gorsze
ofensywnie, a rozbicie wymiany na wypięcie + wepnięcie kosztuje dwie akcje zamiast jednej — więc
wymiana pozostaje efektywniejszą drogą. W zamian działają rzeczy, które powinny: oddanie magazynka
sojusznikowi z bronią o tym samym `magwell`, ściągnięcie magazynka z własnej drugiej broni
w środku walki, odmówienie broni przy rozbrajaniu.

Broń łamana nie jest osobnym przypadkiem: Obrzyn i Dwururka mają `Wmag. 2`, więc podlegają tej samej
regule co Pompka (`Wmag. 6`) i M1 US Rifle (`Wmag. 8`) — jeden nabój na akcję Używanie. Żadnej
właściwości „łamana" ani wyjątku w kodzie.

### W walce — zabronione

- **Ładowanie naboi do wymiennego magazynka.** RAW przewiduje ładowanie po jednym naboju wyłącznie
  dla `wmag` i `beb` — dla broni z wymiennym magazynkiem nie ma takiej czynności. Zgodne
  z konsultacją z autorem: przeciętna walka trwa poniżej minuty, więc to fizycznie nie działa.
- **Ciągnięcie naboi z plecaka wprost do broni z wymiennym magazynkiem.** To jest dzisiejszy bug —
  `_onClickReload` sprawdza gotowy magazynek, ale i tak odejmuje naboje od luźnej puli
  (`ammoItem.system.quantity`), więc `ready` był tylko licznikiem pozwoleń, nie źródłem amunicji.
- Pusta broń z wymiennym magazynkiem i bez zapasowego = martwa do końca walki. Gracz zmienia broń
  albo ściąga magazynek z innej własnej broni o tym samym `magwell`.
  (Użycie pustego obrzyna jako broni improwizowanej — osobny temat, poza tym kawałkiem.)

**Furtka RAI (§12), opcjonalna:** autor dopuszcza wpychanie pojedynczego naboju wprost do broni
z wymiennym magazynkiem — jako *wadę* takiej broni, okupioną testem Zwinnych dłoni (`zwi`, DEX).
RAW tego nie przewiduje, więc jest to świadome rozszerzenie. Do decyzji, czy wchodzi od razu, czy
zostaje zapisane na później.

**Do sprawdzenia poza tym kawałkiem:** RAW dopuszcza dla właściwości `ladowanie` Akcję bonusową
*bez żadnej Sztuczki* („kosztuje akcję Używanie lub Akcję Bonusową"), a `_getReloadPlan` daje tam
bonusową dopiero za `SZYBKIE_PRZELADOWANIE`. Osobny drobiazg, nie część tej przebudowy.

### Trzy przedmioty podręczne — RAW-owy limit, którego plan jeszcze nie ma

*Tworzenie postaci*, **Przedmioty podręczne**:

> Drobne przedmioty noszone przy pasie lub w kieszeni (medpak, granat, **zapasowy magazynek**).
> Możesz je wyciągnąć w ramach Darmowej Interakcji [I], ale skorzystanie z nich wymaga akcji
> Używanie. Możesz mieć przy sobie maksymalnie **trzy** przedmioty podręczne.

To jest RAW-owa odpowiedź na pytanie „ile zapasowych magazynków realnie użyjesz w walce":
najwyżej trzy, i **konkurują o te sloty z medpakami i granatami**. Wynika z tego rozróżnienie,
którego model danych jeszcze nie zna: magazynek **przy pasie** (Darmowa Interakcja) kontra
magazynek **w plecaku** (w walce niedostępny).

Do decyzji MG, czy wchodzi w tę przebudowę, czy jest osobnym kawałkiem — dotyczy nie tylko
magazynków, ale też leków i pirotechniki, więc może zasługiwać na własny plan. **Nie zostawiać
bez decyzji**: bez tego limitu postacie noszą dowolną liczbę magazynków i cała ekonomia
przeładowań z §6 traci zęby.

---

## 7. UI

### Panel „Zapasowe Magazynki" → lista per sztuka

Dziś: wiersz na *klasę* magazynka z kolumnami Ilość / Gotowych. Po zmianie: wiersz na **sztukę**,
bo każdy magazynek ma własną zawartość.

```
[ikona]  Magazynek do AR          18/30    12× AP, 6× smugowy        [Załaduj] [Rozładuj] [🗑]
[ikona]  Magazynek do AR           0/30    —                         [Załaduj]          [🗑]
[ikona]  Szybkoładowarka .38        6/6    6× .38 Special            [Rozładuj]         [🗑]
```

- Podgląd kolejki (co wyleci następne) — rozwijany, nie w wierszu.
- **Glow / pulsowanie** na wierszu, gdy magazynek nie jest pełny, a w ekwipunku jest pasujący
  kaliber. To jedyna podpowiedź automatu; decyzję podejmuje gracz.
- Grupowanie wizualne po modelu broni, żeby przy ośmiu magazynkach dało się to czytać.

### Karta broni

Który magazynek jest wpięty, stan komory z typem naboju (według reguły widoczności z §5), i co
wyleci następne.

### Okno ładowania magazynka

Otwierane z przycisku „Załaduj", wyłącznie poza walką. **Wiersz na typ amunicji, nie kolumna** —
kolumny skończą się przy piątym typie, a rodzin będzie przybywać wraz z dodatkami. Wiersze skalują
się bez końca i mieszczą opis efektu.

```
Magazynek do AR — 18/30                          [Rozładuj wszystko]
──────────────────────────────────────────────────────────────────
[ikona] 5,56 mm                          zapas: 47
        2k6 kłute                        [+1] [+5] [+10] [+50] [do pełna]
──────────────────────────────────────────────────────────────────
[ikona] 5,56 mm AP                       zapas: 6
        2k6 kłute • przebijająca         [+1] [+5] [+6 = wszystko]
──────────────────────────────────────────────────────────────────
Kolejność wystrzału:   ▸ 12× AP   ▸ 6× zwykły
```

Zasady:

- **Wiersze = `familyCalibers(caliber)`** dla kalibru magazynka. Posiadane typy u góry, zgodne ale
  nieposiadane — wyszarzone na dole, żeby gracz widział, czego szukać.
- **Clamping z dwóch stron.** Każdy przycisk tnie się o wolne miejsce **i** o zapas w ekwipunku;
  pokazuje realną liczbę albo jest wyszarzony.
- **`[do pełna]` jest per wiersz** — dopełnia typem z tego wiersza. Globalne „do pełna" przy
  mieszance nie ma sensownej odpowiedzi.
- Dodanie dopisuje **na koniec kolejności wystrzału** (§4).

**Dane są gotowe.** `AMMO_CALIBERS` niesie per kaliber `formula`, `type`, `props`, `note`, `price`,
`weight`, a `familyCalibers()` (`config/ammo-data.mjs`) zwraca zgodne typy — pole `family` już
grupuje `12ga_s`+`12ga_b` → `12ga` oraz `44mag`+`44mag_dd` → `44mag`. Efekt i opis renderują się
z tego, co jest; nowych pól nie trzeba.

**Blokada: ikony amunicji.** `44mag_dd` używa `ammo_44_mag.svg`, a `12ga_s` i `12ga_b` obie
`ammo_12_ga.svg` — czyli **obie istniejące rodziny są dziś wizualnie nierozróżnialne**. Zgłoszone
w `dev/icons/MISSING.md` (batch 40) z komentarzem, że to realna luka, nie kosmetyka. Pipeline
(`dev/icons/process_grid_N.py` → `icons/ammo/`) istnieje, więc to zadanie artystyczne — ale
blokujące dla tego okna, bo wiersze bez rozróżnialnych ikon są gorsze niż sam tekst.

---

## 8. Mieszana amunicja i obrażenia

Kaliber decyduje o formule obrażeń i o właściwościach (dum-dum → Krwawienie), więc przy kolejce
„AP, AP, smugowy" obrażenia zmieniają się **z pociskiem**, nie z magazynkiem.

Dziś `weapons/ammo.mjs` synchronizuje `system.damage.base` z `mag.ammoType` na hooku `updateItem`.
Przy kolejce znaczyłoby to zapis do bazy **przy każdym strzale**, a każdy `item.update()` na broni
odpala `syncWeaponFireModes` → `sync*BurstActivity`, które resetuje `damage.parts` i flagi modułu
(udokumentowany wzorzec clobbera, patrz `ARCHITECTURE.md`).

**Zamiast tego: wstrzykiwanie w momencie rzutu.** Ten sam wzorzec, którego moduł używa już dla
premii do ataku (`dnd5e.postBuildAttackRollConfig`) — odczytać kaliber następnego naboju i podmienić
obrażenia w konfiguracji rzutu. Zero zapisów do bazy, zero konfliktu z synchronizacją trybów ognia.

### Seria i dublet z mieszanego magazynka

KS/DS/MS zużywają N naboi, `dublet` dwa — i mogą być **różnych typów**. Reguła: zliczyć wystrzelone
pociski per kaliber, posortować malejąco po liczebności, wziąć pierwszy z listy. Czyli **decyduje
dominujący nabój serii**, nie pierwszy wystrzelony.

Remis rozstrzyga nabój, który poszedł **wcześniej** (niższy indeks w kolejce) — deterministycznie
i zgodnie z intuicją „co poleciało najpierw".

Przykład: KS (3 naboje) z magazynka `[AP, smugowy, AP, …]` → 2× AP, 1× smugowy → obrażenia jak AP.

### Niezmiennik: broń jest funkcją kolejki, nie ma własnego stanu

Kaliber niesie nie tylko `formula`, ale też **`props`** — dum-dum dokłada `rozrywajaca`
i `hollowpoint`, a te napędzają `wkk/combat/weapon-save-properties.mjs` i `combat/bleeding.mjs`.
Gdyby odświeżały się same obrażenia, dum-dum w komorze zadałby swoje kości, ale nie wywołał
Krwawienia. Obrażenia i właściwości idą zawsze razem.

Kolejkę przesuwa **więcej rzeczy niż strzał pojedynczy**: serie KS/DS/MS, `dublet`, ogień zaporowy,
zacięcie. Każda z nich może zmienić to, czym broń jest w następnej sekundzie. Stąd dwie zasady,
które trzeba trzymać bezwarunkowo:

1. **Nigdy nie cache'ujemy kalibru.** Nie ma pola „aktualny nabój broni". Jest kolejka i jej
   głowa, czytana w momencie rzutu.
2. **Jedno lejko.** Jedyną drogą wyjęcia naboi jest `consumeRounds(weapon, n) → caliberId[]`.
   Konfiguracja rzutu budowana jest **z tego, co ta funkcja zwróciła** — więc reguła dominującego
   naboju i odświeżenie właściwości dzieją się same, w jednym miejscu, dla wszystkich trybów ognia
   naraz. Nowy tryb ognia dodany za rok dostaje to gratis.

To jest też powód, dla którego §8 nie zapisuje niczego do `system.damage.base`: zapis byłby
cache'em, a cache trzeba byłoby unieważniać w każdym z tych miejsc osobno.

---

## 9. NPC — poza systemem

### To jest RAW, nie nasza decyzja

*Notatnik Łowcy*, sekcja **LICZENIE AMUNICJI**:

> **Jeden magazynek.** Przeciwnicy, którzy używają broni palnej, mają jeden pełny magazynek lub
> bębenek. Jako że walka rzadko kiedy trwa dłużej niż 6 rund, możesz założyć, że każdy ma
> wystarczającą ilość amunicji, żeby wykonać jeden strzał w rundzie.
>
> **Serie opróżniają magazynek.** Przeciwnicy, którzy mogą strzelać długą serią, wykonują ją
> określoną ilość razy, opróżniając tym samym cały magazynek broni. Zazwyczaj przechodzą wtedy
> do walki wręcz.
>
> **Boss jest wart liczenia.** […] Sprawdź, ile naboi mieści się w magazynku broni i zaznaczaj
> sobie wyczerpanie amunicji.

Czyli „jeden pełny magazynek na walkę" to zasada z podręcznika, a „(2/walkę)" w statblocku to jej
zastosowanie. Projekt poniżej jest implementacją RAW, nie uzupełnieniem.

### Reguła

**Aktorzy typu `npc` nie podlegają systemowi magazynków.** Jeden warunek, zero wyjątków — żadnych
magazynków jako przedmiotów, kalibrów, komory ani luźnej amunicji. Symulacja dotyczy wyłącznie
postaci graczy.

### NPC istniejący w świecie

Budżet amunicji (niżej) wchodzi przez `build-packs.mjs`, czyli do **kompendium**. NPC już postawieni
w świecie byli importowani wcześniej i przebudowa packa ich nie ruszy. Rozstrzygnięcie:

- **Generyczne pionki** (Żołnierz Posterunku itp.) — skasować i postawić na nowo z przebudowanego
  kompendium. Zero pracy, zero utraty czegokolwiek.
- **Nazwani NPC jako aktorzy świata** (np. Craddock) — **zostawić w spokoju**. Bramka
  `actor.type === "npc"` sprawia, że system magazynków ich nie widzi, więc nic się nie psuje.
  Jedyne, czego nie dostaną, to budżet amunicji — a RAW mówi wprost *„Boss jest wart liczenia"*,
  więc to jest dokładnie ten przypadek, w którym MG dopisuje `uses.max` + `recovery: initiative`
  ręcznie, na tym jednym NPC, kiedy uzna że warto. Jedna linijka, świadoma decyzja.

### Połowa tego działa już dziś, za darmo

Bestiariuszowe NPC są poza systemem z konstrukcji. `buildBestiaryItem` (`dev/packs/build-packs.mjs`)
emituje **`type: "feat"`**, nie `weapon`, z jawnym uzasadnieniem w komentarzu:

> *Every Bestiariusz action becomes a `feat` carrying an activity, not a `weapon`. […] routing claws
> and bites through the weapon pipeline would subject them to jams.mjs, magazine.mjs and
> melee-degradation.mjs, none of which apply to a claw.*

A `_isTrackedRangedWeapon()` wymaga `item.type === "weapon"`. Do zrobienia zostaje wyłącznie bramka
na NPC robionych ręcznie, którzy trzymają prawdziwe itemy `weapon`.

### Jak bestiariusz modeluje broń

Żołnierz Posterunku (`config/bestiary-data.mjs`):

```js
attacks:  [{ id: "ar", bonus: 6, damage: { formula: "2d6 + 3" }, kind: "rwak", range: 540 }]
features: [{ id: "ar-dluga-seria-2-walke", name: "AR długa seria (2/walkę)", … },
           { id: "szybkie-palce", section: "bonus",
             text: "Wymienia opróżniony magazynek lub usuwa zacięcie broni." }]
gear:     "2k6 papierosów, medpak, 5k6 naboi 5.56 mm, granat hukowy, …"
```

Atak ma płaski `bonus` i gotową formułę z wszystkim wliczonym. Limit to budżet na walkę zapisany
**w nazwie**; dziś nic go nie pilnuje — te itemy dostają `uses: { max: "", spent: 0, recovery: [] }`.

### Budżet amunicji — minimum, które wystarczy

Cel wprost z RAW: **NPC nie wystrzela więcej niż jeden pełny magazynek na walkę.** Bez itemu, bez
kalibru, bez ekwipunku — magazynek bierze się z powietrza, a stary znika.

- Item ataku dostaje `uses.max` = pojemność broni, wyciągnięta z `attacks[].id` → `weapons-data.mjs`
  `mag.max`. Ten link już istnieje w danych: `id: "ar"` w bestiariuszu to ten sam slug co `id: "ar"`
  w tabeli broni.
- `recovery: [{ period: "initiative", type: "recoverAll" }]` — natywny okres dnd5e
  (`config.mjs`, `limitedUsePeriods.initiative`, `type: "special"`), odnawia przy rzucie na
  inicjatywę, czyli raz na walkę. Zero kodu runtime, sama zmiana w builderze packa.
- „Szybkie palce" [B] → aktywność zerująca `uses.spent`.

Limit realnie gryzie: AR mieści 30, a długa seria to min. 10 naboi — dwie serie plus strzały
pojedyncze i żołnierz jest suchy, dokładnie jak w *Serie opróżniają magazynek*.

**Do zweryfikowania przy implementacji:** serie są osobnymi `feat`ami, więc żeby dzieliły pulę
z atakiem pojedynczym, ich `consumption.targets[]` musiałby celować w `itemUses` **innego itemu**.
Jeśli dnd5e 5.3 to unosi — jest fizycznie poprawnie i wciąż bez kodu. Jeśli nie — osobne pule,
lekko niefizyczne, ale zgodne z założeniem „minimalnie, żeby działało".

**Nieobsłużona reguła RAW:** *„Naturalna 1. Kiedy przeciwnikowi wypadnie naturalna 1 w czasie Testu
Ataku, jego broń palna trwale się zacina, a broń biała się łamie. W takim wypadku ucieka on z pola
walki lub używa innej broni."* — to osobna zasada dla przeciwników, różna od systemu zacięć dla
postaci w `weapons/jams.mjs`. Do sprawdzenia, czy moduł ją ma; nie jest częścią tej przebudowy.

### Loot — odlożony

Broń, której NPC **używa**, i broń, którą gracze z niego **zlootują**, to dwie różne rzeczy: ta
pierwsza to wpis w statbloku z wliczonymi modyfikatorami, ta druga to przedmiot z kompendium.
Generowanie lootu ma gotowy link (`attacks[].id` → slug) i string `gear`, ale nie wchodzi w zakres
tej przebudowy.

---

## 10. Migracja

Świat jest w trakcie importu i jeszcze się na nim nie grało, więc migracja może być brutalna
zamiast ostrożnej.

### Zakres

Postacie graczy: **Alan, Lorentz, Laffitte, Raynald, Victor**. Piekarz i Kier to nieaktualne postacie
testowe — ich broń to śmietnik po ręcznych testach MG i **nie trzeba jej odtwarzać**, wystarczy
skasować. NPC są poza systemem (§9), więc ich broni migracja nie dotyczy.

### Kroki

1. `foundry_backup_collection` na `actors` i `items`. Bez tego nie ruszamy.
2. **Pre-flight assertion:** przerwij i zaraportuj, jeśli którakolwiek kasowana broń ma
   `flags.<MODULE_ID>.addons`. Ulepszenia są kupowane przez graczy i kasowanie ich jest
   nieodwracalne. Wg ustaleń żadna grywalna postać ich nie ma — asercja jest po to, żeby
   „nie ma" nie było założeniem.
3. Skasować wszystkie instancje magazynków (`system.type.subtype` zaczyna się od `magazine-`)
   wraz z flagą `ready`.
4. Dla każdej broni palnej postaci gracza: zapamiętać `flags.<MODULE_ID>.mag.current`
   (liczba naboi) i `ammoType`, skasować instancję, utworzyć nową z kompendium — ta przychodzi
   z wystemplowanym `weaponId` (§3), więc dopasowanie po nazwie nie jest nigdzie potrzebne.
5. Każda odtworzona broń z `mag.kind === "mag"` dostaje **jeden wpięty magazynek**, załadowany
   zapamiętaną amunicją (→ komora + `rounds`). Postacie zaczynają gotowe do walki.
6. **Zero zapasowych magazynków.** Nikt nie dostaje luzem ani jednego — tylko ten w broni.
   Zapasowe są odtąd decyzją zakupową albo efektem wypięcia magazynka z innej broni o wspólnym
   `magwell` (§6).
7. Zweryfikować, że `getMag()` zwraca sensowne wartości dla wszystkich broni palnych postaci
   (skrypt sprawdzający, wzorem sweepu z `PLAN_weapon_properties.md`).

Broni palnych w tabelach jest 44 + złoty Desert Eagle Lorentza (WKK). To jest pełen zbiór docelowy —
wszystko poza nim w świecie jest artefaktem importu.

---

## 11. Kolejność prac

| Faza | Zakres |
|---|---|
| **0 — dane** | `chamber: false` na 7 wpisach (§5); `weaponId` w `build-packs.mjs`; wygenerowany `magazines-data.mjs`; pack magazynków |
| **1 — model** | Flagi z §4, fasada `getMag`/`spendRound` na nowym storage, `system.uses` jako widok |
| **2 — akcje** | Ładuj / Rozładuj / Wepnij / Wypnij; blokady bojowe z §6; usunięcie ciągnięcia z luźnej puli; bramka `actor.type === "npc"` |
| **3 — UI** | Lista per sztuka, okno ładowania, podgląd kolejki, glow, stan komory na karcie broni. **Zależy od ikon amunicji** (§7) |
| **4 — mieszanka** | Obrażenia z następnego naboju przez hook rzutu, nie przez `system.damage.base` |
| **5 — migracja** | §10 |
| **6 — NPC** | Budżet amunicji z `uses.max` + `recovery: initiative`; „Szybkie palce" zeruje. Data-only w `build-packs.mjs` |
| **7 — LAW** | Zamiana w „Zużyty LAW" (złom wart 1 gambla) po strzale |
| odlożone | Magazynki Chromowe (§2), loot z trupa (§9), tryb Red Orchestra (stan jako „ciężki / około połowy / lekki" zamiast liczby) |

---

## 12. Klasyfikacja: nowy kubełek RAI

Wg `scripts/wkk/README.md` reguła jest dziś twardo binarna: jeśli nie ma tego w podręczniku, to WKK.
Ten plan tworzy pierwszy przypadek, który się w nią nie mieści — mechanika **pochodząca od autora
systemu, ale nieopublikowana** (podział magazynków per model broni, zakaz ładowania magazynków
w walce, test Zwinnych dłoni przy wpychaniu pojedynczego naboju do broni z wymiennym magazynkiem).

Decyzja MG: to jest **RAI — per rozmowa z Marcinem**. Trzeci, wąski kubełek obok NOE i WKK.

Konsekwencje:

- Treść RAI zostaje w drzewie **NOE** (jest intencją autora, więc użyteczna dla innych stołów),
  ale każdy taki fragment dostaje w komentarzu jawny znacznik z podaniem, skąd pochodzi.
- **Nie** trafia do `scripts/wkk/` i nie jest bramkowana przełącznikiem Kobaltu.
- `wkk/README.md` wymaga dopisania tego kubełka — dziś jego reguła kłamie.
- Repo jest publiczne: przypisywanie imiennie autorowi nieopublikowanych ustaleń warto z nim
  uzgodnić, zanim wyląduje w komentarzu w kodzie.

Pozostaje WKK, bo nie pochodzi od autora: kolejka naboi per pocisk, komora jako osobny slot
z własnym kaliberem, reguła dominującego naboju w serii (§8).

## 12a. Punkty otwarte

1. **Trzy przedmioty podręczne (§6).** RAW ogranicza noszone przy pasie medpaki, granaty
   i zapasowe magazynki do trzech łącznie, z rozróżnieniem „przy pasie" (Darmowa Interakcja)
   od „w plecaku". Plan tego nie modeluje. Wchodzi w tę przebudowę czy dostaje własny plan?
   Bez tego ekonomia przeładowań z §6 traci zęby.
2. **Komora `+1` (§5).** Opiera się na czytaniu „jednorazowo załadować" jako ograniczenia
   *czynności*, nie pojemności. Druga lektura jest możliwa i wtedy `+1` jest zmianą zasad,
   nie uzupełnieniem. Jedyny punkt planu, w którym RAI napina RAW zamiast go uzupełniać —
   warto dopytać autora, jeśli będzie okazja.

---

## 13. Ryzyka techniczne

- **Clobber `syncWeaponFireModes`.** Każdy `item.update()` na broni odpala synchronizację trybów
  ognia, która resetuje `damage.parts` i flagi modułu. Podpinanie i odpinanie magazynka to
  `update()` na broni — wpadamy w to wprost. Patrz `ARCHITECTURE.md` i wzorzec z `_burstSelectionCache`.
- **Odpięty magazynek a tryby ognia.** Broń bez magazynka ma max 1 nabój (komora), więc seria jest
  fizycznie niemożliwa. Trzeba zdecydować: ukrywać aktywności KS/DS/MS/OZ czy odmawiać przy użyciu.
  `spendRounds()` już zwraca `false` przy niedoborze, więc odmowa jest tańsza.
- **Proliferacja przedmiotów.** Postać z ośmioma magazynkami ma osiem dokumentów Item zamiast
  jednego ze `quantity: 8`. Wydajnościowo bez znaczenia, ale UI (§7) musi to unieść czytelnie.
- **Panel enkumbracji.** `actors/encumbrance-breakdown.mjs` liczy wagę własnych paneli — waga
  magazynka musi teraz obejmować jego zawartość, inaczej pełny i pusty magazynek ważą tyle samo.
- **Kolizja `belt`.** `caliber: "belt"` (bełt) vs `mag.kind: "belt"` (taśma) — patrz §3.
- **Test spójności danych.** Żadna broń nie powinna mieć jednocześnie `przeladowanie`/`ladowanie`
  i trybu serii (`tryb_ks`/`tryb_ds`/`tryb_ms`) — manualne podawanie wyklucza serię. Dziś to
  prawda w danych, ale nic tego nie pilnuje. Asercja w Quench przy okazji fazy 1.
- **Asercja magwell.** Bronie dzielące `magwell` muszą mieć zgodny `caliber` i `mag.max` (§3).
- **Ulepszenia giną przy kasowaniu broni.** `flags.<MODULE_ID>.addons` (plus stan zestawów
  i dozownika) siedzi na instancji broni i jest kupowany przez graczy. Migracja §10 kasuje
  i odtwarza broń, więc pre-flight assertion z kroku 2 jest jedynym zabezpieczeniem — nie usuwać go
  „dla uproszczenia".
- **Ikony amunicji blokują fazę 3.** Dwie istniejące rodziny kalibrów dzielą grafikę — patrz §7.

---

## 14. Testy

Konwencje i czego nie testować: `TESTING.md` + `DEV_GUIDE.md §12`. Predykaty wystawiamy przez
`export const __testing = Object.freeze({…})`, jak dziś robią `weapons/fire-modes.mjs`
i `weapons/magazine.mjs`. **Nie wołamy `activity.use()`** — ciągnie dialogi, karty czatu, dźwięki
i Sequencer.

### Priorytet 1 — `system.uses` jako widok (faza 1)

Najbardziej prawdopodobny paskudny bug całej przebudowy. Dziś `_consumeSingleShotAmmo` czyta
**deltę** `uses.spent`, bo dnd5e samo dekrementuje przy użyciu aktywności. Gdy `uses` stanie się
wartością wyliczaną z magazynka, dnd5e nadal będzie do niego pisać → pętla albo podwójne odjęcie
naboju. Do pokrycia:

- jeden strzał zabiera **dokładnie jeden** nabój z kolejki (nie dwa, nie zero),
- zapis dnd5e do `uses.spent` nie uruchamia kaskady `updateItem` → sync → zapis,
- `uses.max` na karcie zgadza się z `capacity + komora` po każdej operacji.

### Priorytet 2 — kolejka i niezmiennik z §8

- `consumeRounds(weapon, n)` zwraca naboje **w kolejności wystrzału** i skraca kolejkę o `n`.
- Reguła dominującego naboju: `[AP, smugowy, AP]` → AP. Remis → wcześniejszy indeks.
- **Właściwości idą razem z obrażeniami**: dum-dum w kolejce daje `rozrywajaca` + `hollowpoint`
  w konfiguracji rzutu, a następny zwykły nabój ich nie ma. To jest test na regresję „broń
  zmutowała, ale zapomniała o tym powiedzieć".
- Kolejka nie jest cache'owana: dwie kolejne serie z różnych części magazynka dają różne wyniki.

### Priorytet 3 — reguły

- **Komora:** pusta broń + pełny magazynek → `30/31`; podmiana przed opróżnieniem → `31/31`.
- **`feed`:** `manual` dla `przeladowanie`/`ladowanie` (w tym MGL1S, który ma `beb`, nie `wmag`),
  `auto` dla reszty.
- **`magwell`:** magazynek do Desert Eagle pasuje do Złotego, magazynek do AR nie pasuje do Scara.
- **Blokady bojowe:** ładowanie naboi do wymiennego magazynka odrzucone; ładowanie 1 naboju do
  `wmag`/`beb` dozwolone; wypięcie dozwolone.
- **Bramka NPC:** `actor.type === "npc"` → system nie dotyka broni.

### Asercje na danych (nie na zachowaniu)

- Bronie dzielące `magwell` mają zgodny `caliber` i `mag.max`.
- Żadna broń nie ma naraz `przeladowanie`/`ladowanie` i trybu serii.
- Każdy `magwell` ma co najmniej jeden magazynek w `magazines-data.mjs`.
- Ceny magazynków zgadzają się z RAW (20/30/35/50/15 per kategoria).

### Kontrakt fasady (faza 1, zanim cokolwiek innego ruszy)

`weapons/fire-modes.mjs`, `weapons/jams.mjs`, `wkk/items/pistolet-na-race.mjs` i istniejące paczki
Quench **nie mogą wymagać zmian**. Jeśli któryś z ich testów zacznie padać, to znaczy, że fasada
`getMag`/`spendRound`/`spendRounds` z §4 została złamana — i to jest sygnał do naprawy fasady,
nie do poprawiania tamtych testów.

---

## 15. Rozstrzygnięcia MG (2026-09-22) i co z nich wyszło

Sześć pytań, których plan nie zamykał. Odpowiedzi MG, w kolejności, w jakiej padły.

### 15.1 Trzy przedmioty podręczne (§12a.1) — **trzymamy się RAW, ale nie blokujemy**

Limit trzech slotów jest egzekwowany na wejściu (nie da się oznaczyć czwartego przedmiotu
jako podręcznego) i jest **wspólny** dla magazynków, granatów i leków — RAW wymienia je
w jednym zdaniu. Ale **sięgnięcia do plecaka nie zabraniamy**: karta czatu pokazuje kolorem,
skąd przedmiot przyszedł, a MG decyduje, czy to coś kosztowało. Dobywanie z plecaka jest
umowne i nie jest śledzone co do sztuki.

To ta sama doktryna, co w reszcie modułu: automatyzujemy wykrywanie, nigdy zastosowanie.
Implementacja: `actors/handy-items.mjs`, pigułka na kartach magazynków, granatów i leków.

### 15.2 Furtka RAI (§6) — **odłożona, i to jako WKK, nie RAI**

Wpychanie pojedynczego naboju do broni z wymiennym magazynkiem za test Zwinnych dłoni
**nie wchodzi teraz**. Wejdzie jako house rule **WKK**, z przypisem dla Marcina za pomysł,
i z **ST zależnym od kalibru** — im większy nabój, tym trudniej wepchnąć go do gniazda.
Zapisane w `TODO_mechanika.md`.

Konsekwencja dla §12: kubełek RAI zostaje, ale ta konkretna mechanika do niego nie należy.
W drzewie NOE zostają dwie rzeczy pochodzące od autora: **podział magazynków per model broni**
i **zakaz ładowania magazynków w walce**.

### 15.3 Ikony amunicji (§7) — **nie blokują**

Grafika jest w produkcji; do czasu podmiany oba warianty rodziny dzielą jeden plik SVG,
a rozróżnia je **etykieta i opis efektu** w wierszu okna ładowania. Podmiana plików nie
wymaga zmiany kodu.

### 15.4 Zakres migracji (§10) — **folder `Postacie`, w tym Evie; folder `PC` nietknięty**

Evie jest sterowana przez gracza, więc ma mechanikę jak gracz — plan jej nie wymieniał, bo
powstał przed jej dołączeniem. Kier i Piekarz: broń palna skasowana bez odtwarzania.
Folder `PC` (Buźka, Carson, Dante, Góra, Iris, Kluczyk) zostaje w starym stanie — jego broń
ma nazwy spoza tabel, więc ląduje w gałęzi `null` z §3 i po prostu nie obsługuje wymiennych
magazynków.

### 15.5 Szybkoładowarka — **fizyczna, nabijana z góry, przelewana w bębenek**

Pojemnik z własną kolejką sześciu naboi, ładowany poza walką jak magazynek. W walce jedna
akcja Używanie przelewa całą zawartość do **pustego** bębenka i zostawia szybkoładowarkę pustą.
Nigdy nie jest `loadedMag` — bębenek trzyma naboje w samej broni.

Wynikło z tego rozstrzygnięcie, którego plan nie miał: **`wmag` i `beb` trzymają kolejkę
w `flags.<mod>.rounds` na broni**, a `getSource()` ujednolica „wpięty pojemnik" i „kolejka
wewnętrzna" do jednego kształtu. Dzięki temu rewolwer nie jest przypadkiem specjalnym nigdzie
powyżej warstwy danych.

MGL1S (`beb`, 40 mm) świadomie **nie** dostaje szybkoładowarki — granatnik bębenkowy ładuje
się pociskiem na akcję.

### 15.6 Komora dla czterech broni, których §5 nie klasyfikowała

| Broń | Komora | Dlaczego |
|---|---|---|
| Kusza automatyczna pistoletowa | **tak** | bełt na szynie jest odrębny od magazynka |
| Kusza automatyczna Cobra | **tak** | j.w.; ma `przeladowanie`, więc stan komory i tak jest akcjonowalny |
| Pistolet na Race (WKK) | nie | jednostrzałowa lufa nie ma czego dosyłać |
| Miotacz ognia | nie | zbiornik paliwa nie ma komory |

Lista `chamber: false` ma więc **dziewięć** wpisów, nie siedem.

### 15.7 Kołczan — **pełne źródło zasilania, pojemność 20**

Łuk i kusza bloczkowa biorą kołczan jako `loadedMag` i wchodzą do systemu na tych samych
szynach co broń palna. **20 to liczba wymyślona** — RAW nie podaje dla łuków Mag./Bęb. w ogóle,
bo nie liczy strzał. Kołczan jest tym, co je do systemu wprowadza: do 2026-09-22 strzały nie
były liczone wcale.

Kusze automatyczne (pistoletowa, Cobra) kołczana nie biorą — mają `wmag`, czyli własny
magazynek na szynie, uzupełniany z luźnej puli bełtów.

### 15.8 Bramka aktorów (§9) — biała lista, nie czarna

Reguła MG: **pionki graczy mają zabawę i złożoność, pionki MG są prostsze i szybsze w obsłudze.**
Stąd `actor.type === "character"` minus Zbrojownia, a nie „wszystko poza `npc`" — pojazd
z Browningiem na trójnogu też jest pionkiem MG, mimo że nie jest NPC-em, i czarna lista
wpuściłaby go do środka bez pytania.

### 15.9 Czego plan nie przewidział, a wyszło w praktyce

- **Złoty Desert Eagle nie istniał w katalogu.** Flagowy przykład dla `magwell` (§3) był
  wyłącznie ręcznie zrobionym itemem na karcie Lorentza. Bez wpisu migracja nie miałaby czego
  odtworzyć z kompendium, więc broń trafiła do `wkk/config/weapons-data.mjs`, spisana 1:1
  z jego egzemplarza.
- **`attack.bonus` ginął przy odtwarzaniu broni.** Premia „+1 do trafienia" Złotego DE siedziała
  w aktywności, a świeża broń z kompendium dostaje aktywności generowane od zera. Dodane pole
  `attackBonus` w tabeli broni i jego synchronizacja w `fire-modes.mjs` — pisana **tylko** gdy
  katalog ją deklaruje, żeby nie kasować ręcznych premii na broni NPC-ów.
- **Generyczne magazynki miały trzecie wejście.** Poza `Dostepnosc.md` i generatorem lootu
  (§2) trzecim był dialog „Dodaj magazynek" w panelu ekwipunku, który pozwalał stworzyć
  magazynek z klasy rozmiaru. Teraz wybiera się z katalogu per model.
