# Hand-off — Audyt builda i ekwipunku całej drużyny (Victor, Alan, Lorentz, Laffitte,
# Raynald + byli BG: Kier, Piekarz)

Napisane 2026-09-07 przez poprzedniego agenta, po commitach `21f8668` → `6040b91` →
`0dfd39f` (patrz `git log`). Zlecone wprost przez użytkownika po tym, jak ten agent
popełnił realny błąd na Victorze (patrz sekcja 1B) — stąd przekazanie do innego modelu.
**Przeczytaj tę sekcję w całości, zanim cokolwiek ruszysz — 1B to najważniejsza część tego
pliku.** Wszystko poniżej jest zweryfikowane na żywym świecie (Chrome DevTools MCP), nie
zgadywane — poza jawnie oznaczonymi hipotezami w sekcji 4.

**Sprawdź też `HANDOFF_ekwipunek.md`** (inny temat — ikony/aliasy/audyt kompletności z
2026-08-29, wciąż otwarty, nieskasowany) — nie duplikuj tamtej pracy, nie ignoruj jej
sekcji 2.

---

## 0. Zadanie

To samo, co zrobiono dla Victora (część 1, IMPLEMENTATION.md (19)–(20)), zrobić dla
**całej reszty drużyny**: Alan, Lorentz, Laffitte, Raynald, plus dwaj byli BG: Kier,
Piekarz. Dla każdej postaci:

1. **Spójność builda** — czy ma wszystkie zdolności klasowe/profesji należne swojemu
   poziomowi, nie więcej, nie mniej. Metoda w sekcji 1B — **to jest część, w której
   poprzedni agent się pomylił, przeczytaj ją dwa razy**.
2. **Ekwipunek** — czy każdy przedmiot ma właściwy `type`, realną cenę/wagę/opis, właściwą
   ikonę (poza feat-ami — patrz niżej), poprawną nazwę (bez literówek/kości wpisanych w
   nazwę/aliasów importu). Wzorce w sekcji 2.
3. Jeśli postać ma towarzysza (Partner/Zwierzę — tak jak Victor ma Evie), sprawdź go też,
   przeciwko jego własnej dokumentacji w `Neuro 5e/Postacie/**/*.md`, jeśli taka istnieje.
4. Zapisz wynik jako kolejny, ponumerowany wpis w `IMPLEMENTATION.md` — **następny numer:
   (21)**. Jeśli znajdziesz się w błędzie już PO zapisaniu wpisu, dopisz KOLEJNY wpis z
   korektą (tak jak (20) poprawił (19)) — nigdy nie edytuj cichcem starszego wpisu.

---

## 1A. Stan wyjściowy każdej postaci (zebrane na żywo, 2026-09-07)

| Postać | Actor ID | Klasa | Profesja | Featów | Innych itemów | Uwaga |
|---|---|---|---|---|---|---|
| Victor von Blitz | `ZmNkNTY1YzhlY2Fk` | Zwiadowca 3 | Sędzia | 14 | 23 | **Zrobione w tej sesji** — patrz 1C |
| Alan | `YWJmZDNlNzMyOGVh` | Zwiadowca 3 | Łowca Mutantów | 8 | 25 | Ekwipunek zrobiony w POPRZEDNIEJ sesji (IMPLEMENTATION.md (17)); **build NIGDY nie sprawdzony metodą z 1B** |
| Lorentz | `YWRiNDdlMTIyZTg2` | Twardziel 3 | Kowboj | 9 | 27 | Nietknięty |
| Laffitte | `NDQxN2RkMTJiOGNh` | Cwaniak 3 | **brak subklasy** | 10 | 4 | ⚠️ Zobacz 4A — silny trop, poziom 3 bez profesji to prawdopodobnie realna dziura |
| Raynald of Châtillon | `NjBkNTk3OWY1ODRj` | Spec 3 | Monter | 15 | 25 | Nietknięty (dostał tylko punktowy fix regexa wody w (17)) |
| Kier | `ZDI4OGZiMGY0NzMz` | **`<unknown class>` 2** | brak | 1 | 3 | ⚠️ Zobacz 4B — to wygląda dokładnie jak przypadek, do którego zbudowano `migrateClasses()` |
| Piekarz | `MDczZGFlMTBkMWQ5` | Brutal 3 | Gladiator | 8 | 38 | Nietknięty buildowo; ekwipunek dotykany wielokrotnie w przeszłości (żetony, batch 29 — patrz IMPLEMENTATION.md) |

Zapytanie, którym to zebrano (Chrome DevTools MCP, `evaluate_script`, `pageId` z
`list_pages`):
```js
const actor = game.actors.find(a => a.name === "..."); // dopasuj dokładnie po nazwie z tabeli
actor.items.filter(i => i.type === "class").map(i => `${i.name} ${i.system.levels}`);
actor.items.filter(i => i.type === "subclass").map(i => i.name);
```

## 1B. **Jak NAPRAWDĘ sprawdzić kompletność zdolności klasowych — poprzedni agent zrobił to źle za pierwszym razem**

### Co poszło nie tak

`scripts/config/classes-data.mjs` ma tabelę `levels{}` per klasa, np.:
```js
zwiadowca: { levels: { 3: [PROFESJA, "cichy-krok"], 6: [PROFESJA_LUB_SZTUCZKA], 10: [...] } }
```
gdzie `PROFESJA = "@profesja"`. Poprzedni agent przeczytał `PROFESSIONS.sedzia.abilities =
["jeden-z-nas", "rzuc-bron-i-gleba", "partner"]` (ta sama tablica-danych) i **zgadł**, że
wybór profesji przyznaje wszystkie trzy naraz. Dorobił Victorowi dwie zdolności, których
jeszcze nie zdobył. Użytkownik złapał to natychmiast — dokładnie dlatego ten agent nie
kontynuuje tego zadania.

`levels{}` to **źródło dla generatora paczek** (`dev/classes/gen_features.py`), nie samo
w sobie API mówiące „ile na raz". Prawda o tym żyje w **skompilowanym
`system.advancement`** konkretnego dokumentu klasy/podklasy w kompendium.

### Jak sprawdzić poprawnie — kod gotowy do wklejenia

```js
// 1. Klasa — jej WŁASNE advancement (moj-wrog/moj-biom/ulubiona-broń, cichy-krok itd. —
//    wszystko, co NIE jest profesją):
const klasyPack = await game.packs.get("neuroshima-2026-overrides.klasy").getDocuments();
const klasa = klasyPack.find(d => d.system.identifier === "zwiadowca"); // dopasuj klasę postaci
klasa.system.advancement.forEach(a => console.log(a.type, a.level, a.title, a.configuration));

// 2. Profesja — jej WŁASNE advancement (osobny dokument, osobna paczka!):
const profesjePack = await game.packs.get("neuroshima-2026-overrides.profesje").getDocuments();
const profesja = profesjePack.find(d => d.name === "Sędzia"); // dopasuj profesję postaci
profesja.system.advancement.forEach(a => console.log(a.type, a.level, a.title, a.configuration));
```

Dwa typy `a.type`, oba realne:
- **`ItemGrant`** — bezwarunkowe. WSZYSTKIE itemy w `a.configuration.items[]` należą się
  postaci, gdy tylko osiągnie `a.level`. Zero wyboru.
- **`ItemChoice`** — wybór. `a.configuration.choices["<poziom>"].count` mówi ile
  (prawie zawsze `1`, ale **sprawdź, nie zakładaj**). `a.configuration.pool[]` to lista
  kandydatów (UUID-y do `neuroshima-2026-overrides.zdolnosci-klasowe` i/lub `.sztuczki`).

**Zweryfikowane na żywo dla Zwiadowca/Sędzia** (nie zakładaj, że inne klasy/profesje mają
identyczny kształt — sprawdź każdą osobno, ale to jest wzorzec, którego szukaj):
- Klasa, poziom 1: `ItemChoice` „Mój wróg" (1 z 5 wariantów wroga) + **osobny**
  `ItemGrant` z TRZEMA bezwarunkowymi itemami: „Mój wróg" (rodzic, sam w sobie osobny
  item od wariantu!), „Mój biom", „Ulubiona broń". **To jest pułapka nr 2, w którą wpadł
  poprzedni agent** — zobaczył wariant („Mój wróg: Ludzie") i wziął go za cały feature,
  nie zauważając brakującego rodzica.
- Klasa, poziom 2: `ItemChoice` „Wyjadacz" (1 z 6) + `ItemGrant` z DWOMA: „Wyjadacz"
  (rodzic), „Kłusownik".
- Klasa, poziom 3: `ItemGrant` z JEDNYM: „Cichy krok". (Profesja NIE jest tu — patrz niżej.)
- **Profesja (Sędzia), poziom 3/6/10**: `ItemChoice`, `count: 1` na KAŻDYM z tych trzech
  poziomów. Pula na poziomie 3 to tylko 3 zdolności profesji. Pula na 6 i 10 to te same
  3 PLUS cała pula Sztuczek (53 pozycje) — gracz wybiera jedno z dwóch zbiorów. Czyli
  postać na poziomie 3 ma dokładnie JEDNĄ zdolność profesji, na poziomie 6-9 ma jedną LUB
  dwie (zależnie czy przy 6 wzięła profesję czy Sztuczkę), na poziomie 10-11 analogicznie
  jedną, dwie lub trzy, na poziomie 12 tak samo (nowych slotów profesji już nie ma).

### Algorytm audytu (do zbudowania lub wykonania ręcznie dla każdej postaci)

Dla postaci o klasie K, poziomie L, profesji P (jeśli ma subclass item):
1. Wczytaj `klasa.system.advancement` i `profesja.system.advancement` (jeśli P istnieje).
2. Dla każdego wpisu z `level <= L`:
   - `ItemGrant` → każdy UUID z `configuration.items` MUSI mieć odpowiednik na karcie
     (dopasuj po `flags["neuroshima-2026-overrides"].abilityId` zgodnym z UUID-owanym
     dokumentem — rozwiąż UUID → dokument → jego własny `abilityId`, potem szukaj tego
     `abilityId` wśród featów postaci). Brak = twardy błąd, dograj z paczki.
   - `ItemChoice` → policz, ile itemów z `configuration.pool` postać ma. Musi być
     dokładnie `configuration.choices["<poziom>"].count` (prawie zawsze dokładnie 1 na
     TEN poziom — ale dla profesji na poziomach 6/10 pamiętaj, że wybór mógł paść na
     Sztuczkę zamiast na pulę profesji, więc sprawdzaj **sumarycznie po wszystkich
     dotychczasowych `ItemChoice` z tej samej rodziny** (Mój wróg ma 3 okazje: 1/5/9;
     profesja ma 3 okazje: 3/6/10 dzielone ze Sztuczką), nie osobno po każdym poziomie —
     zbyt mało jest błędem, za dużo jest błędem, ale „ma 2 z 3 możliwych na tym etapie"
     jest OK, jeśli reszta poszła w Sztuczki.
3. Dla poziomów SZTUCZKA (4/8/12) i tych „LUB Sztuczka" sloty profesji, które NIE poszły
   w profesję: postać powinna mieć tyle featów z `flags[...].sztuczka` (dowolny klucz z
   `SZTUCZKI` w `sztuczki-data.mjs`) ile wynosi: (liczba czysto-Sztuczkowych slotów
   osiągniętych) + (liczba `PROFESJA_LUB_SZTUCZKA` slotów osiągniętych, które NIE zostały
   pokryte przez zdolność profesji). To da się policzyć: `sztuczki_na_karcie ==
   sztuczkowe_sloty_osiagniete + (profesja_sloty_osiagniete - profesja_zdolnosci_na_karcie)`.
   Nie próbuj zgadywać, KTÓRĄ konkretną Sztuczkę gracz by wybrał — tylko licz, czy suma
   się zgadza. Rozjazd = flaguj dla MG, nie zgaduj/nie dograj sam (w przeciwieństwie do
   punktu 2, gdzie treść jest jednoznaczna, tu wybór należy do gracza).

**To narzędzie NIE zostało zbudowane jako kod wielokrotnego użytku** (celowa decyzja
poprzedniego agenta, IMPLEMENTATION.md (19), żeby nie rozdymać zgłoszenia o jedną postać) —
ale przy 6 postaciach do zrobienia naraz, zbudowanie go raz jako
`scripts/actors/class-progression-audit.mjs` (`auditClassProgression()`/
`repairClassProgression()`, ten sam kształt co `auditWeapons()`) prawdopodobnie się teraz
opłaca. Twoja decyzja — ale jeśli robisz to ręcznie dla 6 postaci bez zbudowania narzędzia,
rozważ, czy to faktycznie szybsze.

## 1C. Co dokładnie jest zrobione na Victorze (nie zaczynaj od nowa)

- Build: kompletny wg metody z 1B, zweryfikowany wprost przeciwko `system.advancement`
  klasy Zwiadowca I profesji Sędzia (nie tylko `classes-data.mjs`). 14 featów, wszystkie
  odpowiadają dokładnie temu, co należy się na poziomie 3 — zero nadmiaru, zero braków.
  Zobacz IMPLEMENTATION.md (19) i (20) po pełną listę i historię pomyłki/korekty.
- Ekwipunek: pełny przegląd, wszystkie typy poprawione (loot→weapon/equipment/consumable
  tam, gdzie kość/formuła była wpisana w nazwę), nazwy/aliasy/waluta/ikony (poza featami)
  poprawione. Zobacz IMPLEMENTATION.md (19) po pełną listę.
- Evie (Partner Victora): sprawdzona przeciwko `Postacie/NPC/Evie.md` — PW/AC/Premia
  Biegłości/liczba biegłych RO/dwie zdolności (Sztuczka + Pochodzenie) zgadzają się.
  Jeden `Medpack 2k6+2` → `Medpak` fix, poza tym nietknięta. **Nie audytowano** reszty jej
  ekwipunku (Kajdanki, Odznaka, Torba patrolowa, Krótkofalówka policyjna, sama broń AR) ani
  jej builda metodą z 1B (nie ma własnej klasy — jest zbudowana ręcznie wg reguł zdolności
  Partner, nie przez Advancement Manager, więc metoda z 1B się nie stosuje wprost; sprawdź
  ją raczej przeciwko tekstowi zdolności Partner w `class-features-data.mjs`, klucz
  `"partner"`, i przeciwko jej własnemu markdownowi).
- **Nie zbudowano**: `auditClassProgression()` reużywalny (patrz 1B, decyzja świadoma).

---

## 2. Wzorce błędów w ekwipunku — ściągawka z Victora/Alana

Sprawdzone empirycznie na dwóch postaciach — prawdopodobnie powtórzą się na resztę:

1. **Kość/formuła/ilość wpisana w NAZWĘ itemu** = silny sygnał, że to martwy `loot`
   udający prawdziwy przedmiot. Przykłady znalezione: `"combat knife(1d2)"`,
   `"Medpack 2k6+2"`, `"4 sztyki 44 magnum"`, `"2 race oswietleniowe"`. Zamień na
   prawdziwy typ (`weapon`/`consumable`/`equipment`) z realnymi danymi z katalogu
   (`weapons-data.mjs`, `ammo-data.mjs`, `armor-data.mjs`) albo przez istniejącą fabrykę
   (`game.neuroshima.flara.create()`, `.baterie.create()`, `.zetonLuxor.create()`).
2. **`item.update({type: "..."})` NIE DZIAŁA** na już istniejącym dokumencie — Foundry
   cicho odrzuca całą aktualizację (nie tylko pole `type` — WSZYSTKIE pola w tym samym
   wywołaniu). Zawsze `createEmbeddedDocuments` (nowe dane) +
   `deleteEmbeddedDocuments` (stare), nigdy plain `update()` przy zmianie typu. Poprzedni
   agent złapał się na to DWA razy w tej samej sesji (Kurtka ćwiekowana zrobiona dobrze,
   Medpak najpierw źle przez `update()`, potem poprawiony) — nie powtarzaj.
3. **Broń typu `weapon` stworzona przez `createEmbeddedDocuments` ma pustą aktywność
   ataku** (`attack.type: {}`, `damage.parts: []`) — zawsze patchuj ręcznie zaraz po
   stworzeniu:
   ```js
   const activityId = Object.keys(created._source.system.activities)[0];
   await created.update({
     [`system.activities.${activityId}.attack.type.value`]: "melee", // albo "ranged"
     [`system.activities.${activityId}.attack.type.classification`]: "weapon",
     [`system.activities.${activityId}.damage.parts`]: [{ types: [...], custom: {enabled:false}, scaling: {number:1} }]
   });
   ```
4. **`WEAPON_NAME_ALIASES`** (`weapons-data.mjs`) — sprawdź PRZED założeniem, że statystyki
   broni są złe. Zawiera H&K G3, M1 Garand, 38-ka, Browning M2 (z trójnogiem), FN Minimi
   (taśma XXL). Alias naprawia TYLKO dopasowanie ikony (`auditWeapons()`), nigdy samą
   nazwę na karcie — jeśli widzisz starą nazwę, popraw ją ręcznie, `auditWeapons()` może
   nie zgłosić żadnego rozjazdu mimo to (bo dane mechaniczne już są poprawne).
5. **Ikona na portrecie aktora** (`worlds/OUTPUT/characters/.../avatar.png` jako `img`
   itemu) = Foundry nigdy nie dostał realnej ikony przy tworzeniu. Dla itemów **innych niż
   feat/Sztuczka**: sprawdź, czy pasująca ikona już istnieje w `icons/**` (często tak —
   po prostu nikt nie podpiął) — jeśli tak, popraw wskaźnik od razu, nie czekaj. Jeśli
   naprawdę potrzeba nowej grafiki, dopisz do `dev/icons/MISSING.md`.
   **Feat/Sztuczka ikony: NIE dotykaj, NIE dodawaj do kolejki — to osobny, duży,
   przyszły przebieg (decyzja użytkownika, 2026-09-07).**
6. Waluta: `CONFIG.DND5E.currencies` ma tylko `gb`. Większość świata wciąż ma
   `denomination:"gp"`. Napraw tylko to, czego i tak dotykasz z innego powodu (ta sama
   zasada co w (17)/(19)) — pełna migracja świata to osobna decyzja MG, dwukrotnie już
   świadomie odłożona, nie rób jej po cichu przy okazji.
7. Homebrew feat/Sztuczka bez `abilityId` i bez odpowiednika w
   `class-features-data.mjs`/`sztuczki-data.mjs`/`pochodzenia-data.mjs` **nie jest
   automatycznie błędem**. Sprawdź `scripts/migration/migrate-classes.mjs`'s `ALIASES`
   (niektóre wpisy to jawne `null` = „to homebrew, zostaw"). Nie wymyślaj mechaniki dla
   homebrew, jeśli nikt o to nie prosił — część kanonicznych Sztuczek też zostaje
   celowo ręczna (`auto: []` w `sztuczki-data.mjs`), to nie jest luka do załatania.

## 3. Narzędzia i dostęp

- **Tryb dostępu**: `mcp__chrome-devtools__list_pages` najpierw — jeśli strona
  "Foundry Virtual Tabletop" jest widoczna, świat żyje, pracuj przez CDP
  (`mcp__chrome-devtools__evaluate_script`). Jeśli nie, LevelDB przez
  `mcp__foundry-vtt__foundry_*`. Oba deferred — `ToolSearch` najpierw. Nigdy nie zapisuj
  portu na sztywno (`CLAUDE.md`, „No network specifics").
- `game.neuroshima.auditWeapons()` / `repairWeapons()` — dryf statystyk broni vs katalog.
- `game.neuroshima.inventoryAudit.auditInventory()` / `repairInventory()` — Surowce/
  Pirotechnika/Chemia/ikony Chemii/ilość i ładunki źródeł zasilania.
- `game.neuroshima.inventoryAudit.auditItemCompleteness()` — **na zawsze read-only**
  (DEV_GUIDE.md §14.3), brak wagi+ceny+źródła jednocześnie.
- `game.neuroshima.flara.create({actor, quantity})`, `.baterie.create(...)`,
  `.zetonLuxor.create(...)` — istniejące fabryki, użyj zamiast ręcznie sklejać dane.
- `game.modules.get("neuroshima-2026-overrides").api.migration.migrateClasses({actors,
  commit})` — dla postaci z placeholderową klasą (`identifier` spoza `CLASSES`, albo
  nazwana „Wybierz"). **Kier wygląda dokładnie jak ten przypadek** (`<unknown class>` 2)
  — sprawdź go tym narzędziem jako pierwszy krok, ZANIM spróbujesz audytu z 1B (audyt z
  1B nie ma sensu bez prawdziwej klasy). Dry-run domyślnie — przeczytaj raport przed
  `{commit:true}`.
- Paczki: `neuroshima-2026-overrides.{klasy,profesje,zdolnosci-klasowe,sztuczki,
  pochodzenia,zdolnosci-pochodzenia,amunicja,granaty,pancerze,bron,sprzet,narzedzia,
  lekarstwa,bestiariusz}`.
- Światowy audyt broni/kompletności **już uruchomiony raz w (17)** — zgłosił dryf na 7
  aktorach (broń) i 4 (kompletność), świadomie zostawiony MG. Uruchom ponownie
  (`auditWeapons()`/`auditInventory()`/`auditItemCompleteness()` bez filtra po aktorze)
  jako szybki start — prawdopodobnie właśnie ci powie, którzy z tych 6 mają najwięcej
  roboty i gdzie dokładnie.

## 4. Konkretne tropy do sprawdzenia jako pierwsze (hipotezy, niezweryfikowane)

### 4A. Laffitte — brak subklasy na poziomie 3, tylko 4 itemy poza featami
Cwaniak 3 bez żadnej subklasy (`actor.items.filter(i=>i.type==="subclass")` puste) — a
poziom 3 to dokładnie moment, w którym KAŻDA klasa w tym systemie przyznaje pierwszy wybór
profesji (`PROFESJA` w `classes-data.mjs`, potwierdzone dla Zwiadowcy w 1B — sprawdź, czy
Cwaniak ma identyczny kształt, ale prawdopodobnie tak). To wygląda jak realna, niedokończona
postać, nie świadomy wybór — ale **potwierdź z użytkownikiem/transkryptem sesji, zanim
przydzielisz profesję samodzielnie** (w przeciwieństwie do reszty audytu, wybór KTÓREJ
profesji to decyzja gracza/GM-a, nie coś do wydedukowania z danych). Tylko 4 itemy poza
featami też jest mało — porównaj z resztą drużyny (23–38) zanim uznasz to za normalne
(Cwaniak = gadający negocjator, może faktycznie nosi mało sprzętu, ale to hipoteza, nie
pewnik).

### 4B. Kier — `<unknown class>`, poziom 2, 1 feat, 3 itemy
To jest dokładnie kształt, jaki opisuje nagłówek `migrate-classes.mjs`: „broken placeholder
class item (`identifier: lessunknown-classgreater`...) lub nazwany Wybierz". Zacznij od:
```js
const api = game.modules.get("neuroshima-2026-overrides").api.migration;
await api.migrateClasses({ actors: ["Kier"] }); // dry run — przeczytaj raport
```
Kier to były BG — możliwe, że nigdy nie dokończono mu importu z Roll20. Sprawdź
`Neuro 5e/Postacie/BG/Kier.md` (jeśli istnieje) po kontekst fabularny/klasę, zanim
zdecydujesz, co powinien dostać.

### 4C. Piekarz — 38 itemów, najstarsza i najbardziej "obładowana" postać
Prawdopodobnie ma najwięcej drobnych, historycznych bugów (był centralnym punktem batchy
ikon 29, 37 i migracji żetonów) — ale też prawdopodobnie największy przez to koszt
przejrzenia. Zacznij od światowego audytu (sekcja 3) — jeśli Piekarz jest jednym z „4
aktorów z rozjazdem kompletności" z (17), to już wiadomo, gdzie zacząć.

---

**Skasuj ten plik, gdy zadanie się skończy** (konwencja repo, patrz
`HANDOFF_ekwipunek.md` / ARCHITECTURE.md → „Dokumentacja towarzysząca") — czyli gdy
wszystkie 6 postaci mają zapisany wpis w IMPLEMENTATION.md i sekcja 4 się wyjaśniła.
