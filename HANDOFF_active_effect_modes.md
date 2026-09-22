# Hand-off — migracja `ACTIVE_EFFECT_MODES` → stringowe `type` (v14 → v16)

Napisane 2026-09-22, na gałęzi `classical_magazines` (magazynki), **poza jej zakresem** —
znalezione przy okazji, świadomie nietknięte. Wszystko poniżej jest sprawdzone w źródłach
FVTT 14 (`resources/app/common/documents/active-effect.mjs`, `common/constants.mjs`)
i przez `grep` po module, nie zgadywane. **Nie odkrywaj tego ponownie.**

Zakres: kod, jedna gałąź, własne testy. Nie doklejaj do niczego innego.

---

## 1. O co chodzi

FVTT 14 przestawił wpisy `changes[]` w Active Effectach z **liczbowego `mode`** na
**stringowy `type`**. Stare `CONST.ACTIVE_EFFECT_MODES` jest proxy, które przy każdym
odczycie wypluwa ostrzeżenie:

```
You are accessing CONST.ACTIVE_EFFECT_MODES.
Changes now have string types (see CONST.ACTIVE_EFFECT_CHANGE_TYPES).
Deprecated since Version 14 / removal in Version 16
```

U nas odpala się to **zaraz po zalogowaniu**, bo `udzwig-slowdown.mjs` buduje stałą
`ZONE_CHANGES` na poziomie modułu, czyli w momencie importu.

## 2. PUŁAPKA — przeczytaj zanim cokolwiek zmienisz

Komunikat odsyła do `CONST.ACTIVE_EFFECT_CHANGE_TYPES` i **kusi, żeby podmienić jedno na
drugie w miejscu**. To byłoby cicho złe:

```js
CONST.ACTIVE_EFFECT_MODES.ADD          // 2   — stary identyfikator trybu
CONST.ACTIVE_EFFECT_CHANGE_TYPES.add   // 20  — DOMYŚLNY PRIORYTET, nie tryb
```

`ACTIVE_EFFECT_CHANGE_TYPES` mapuje stringowe klucze na **domyślne priorytety**, nie na
identyfikatory trybu. Dowód wprost ze źródeł: `add: 20` i `subtract: 20` mają tę samą
wartość — gdyby to były tryby, nie dałoby się ich rozróżnić.

**Na dokumencie ma wylądować sam string**, nie wartość z tego obiektu:

```js
// ŹLE — wpisuje 20 jako tryb
{ key: "…", mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.add, value: "-1" }
// DOBRZE
{ key: "…", type: "add", value: "-1" }
```

W module jest już **precedens zrobiony poprawnie**: `scripts/combat/crit-riders.mjs`
(stała `MODE` — mapa stringów na same siebie, plus komentarz z tym samym ostrzeżeniem).
Użyj go jako wzorca, nie wymyślaj drugiego.

### Tabela odpowiedników

Wprost z `BaseActiveEffect.#MODES_TO_TYPES`:

| stary `mode` | liczba | nowy `type` |
|---|---|---|
| `CUSTOM`    | 0 | `"custom"` |
| `MULTIPLY`  | 1 | `"multiply"` |
| `ADD`       | 2 | `"add"` |
| `DOWNGRADE` | 3 | `"downgrade"` |
| `UPGRADE`   | 4 | `"upgrade"` |
| `OVERRIDE`  | 5 | `"override"` |

Nieznana liczba `n` ląduje jako `"custom.n"` — przydatne przy diagnozie, jeśli zobaczysz
taki `type` na żywym efekcie.

## 3. Czego NIE musisz robić — to jest de-ryzykowanie tej roboty

**Nie ma potrzeby migracji danych świata.** Rdzeń robi to sam, w `migrateData`:

* `changes` → `system.changes` (osobna przeprowadzka, patrz §5),
* każdy wpis z liczbowym `mode` i bez `type` dostaje `type` z tabeli wyżej, a `mode`
  jest usuwany.

Dzieje się to przy **każdym** wczytaniu źródła — zarówno dla efektów leżących w bazie, jak
i dla danych, które właśnie tworzysz. Dlatego dzisiejszy kod **działa poprawnie** i będzie
działał do v16; to ostrzeżenie, nie usterka.

Dodatkowo `BaseActiveEffect._shimChanges()` dokleja do każdego wpisu getter/setter `mode`,
więc **odczyt** `change.mode` też jeszcze działa (z własnym ostrzeżeniem).

Praktyczny wniosek: to jest **refaktor porządkujący przed v16**, a nie naprawa błędu.
Możesz go zrobić spokojnie i w całości, ale nie wolno przy okazji „poprawiać" działających
efektów — patrz §7.

## 4. Lista miejsc (13 użyć, stan na 2026-09-22)

### 4a. Zapisujące, z globalem `CONST` — zamiana wprost na `type: "…"`

| plik | linia | tryb |
|---|---|---|
| `scripts/actors/bez-dna.mjs` | 132 | `MULTIPLY` |
| `scripts/actors/cichy-krok.mjs` | 113 | `ADD` |
| `scripts/actors/samuraj.mjs` | 98 | `ADD` |
| `scripts/actors/udzwig-slowdown.mjs` | 77 | `MULTIPLY` |
| `scripts/actors/udzwig-slowdown.mjs` | 80 | `OVERRIDE` |
| `scripts/combat/zranienie.mjs` | 361 | `ADD` |
| `scripts/items/chemia.mjs` | 218 | `ADD` |

Numery linii są ze stanu na dzień pisania — sprawdź `grep -rn ACTIVE_EFFECT_MODES scripts/`
zamiast ufać im na słowo.

### 4b. Trzy moduły danych, które CELOWO nie używają `CONST`

`scripts/config/chemia-data.mjs` (69), `scripts/config/disease-effects.mjs` (48),
`scripts/config/levelled-conditions-data.mjs` (18) mają liczby **wypisane z palca**
(`const ADD = 2;`) z komentarzem wyjaśniającym dlaczego: te pliki importuje builder
kompendiów i `node --check`, gdzie **globalu `CONST` po prostu nie ma**.

Dla ciebie to dobra wiadomość: stringi nie potrzebują żadnego globala, więc te trzy pliki
robią się **prostsze**, a nie trudniejsze — lokalne stałe znikają razem z komentarzem
o ich powodzie. Nie zostawiaj osieroconego `const ADD = 2;`.

**Uwaga:** te dane lądują w packach. Po zmianie **przebuduj packi**
(`npm run build:packs` + `npm run validate:packs`) przy **całkowicie zamkniętym Foundry** —
trzyma LevelDB otwarte.

### 4c. Testy — te CZYTAJĄ `mode`, nie zapominaj o nich

* `scripts/tests/udzwig.test.mjs` 139, 152 — fikstury (zapis).
* `scripts/tests/choroby.test.mjs` 38, 39, 53, 66 — **odczyt** `change.mode` przy
  klasyfikowaniu efektów chorób. Działają dziś tylko dzięki shimowi z §3. Po migracji
  mają czytać `change.type` i porównywać ze stringami.

### 4d. Już zrobione — nie ruszaj

`scripts/combat/crit-riders.mjs` (39–49) jest na nowym API. To wzorzec, nie zaległość.

## 5. Druga przeprowadzka, która cię ukąsi: `changes` → `system.changes`

W v14 `changes` **nie jest już polem `ActiveEffect`** — przeniosło się do `system.changes`,
z shimem. Odróżnij dwie rzeczy, bo `grep` po `.changes` zwraca głównie tę pierwszą:

* **Nasze własne obiekty danych** nazwane `changes` (`DISEASE_EFFECTS[…].changes`,
  `cfg.changes`, `rider.effect.changes`) — to zwykłe struktury w naszych plikach
  konfiguracyjnych, przeprowadzka rdzenia ich **nie dotyczy**.
* **Odczyt z żywego dokumentu efektu** — dotyczy. Sprawdź zwłaszcza
  `scripts/actors/disease-effects.mjs:189` i `scripts/actors/levelled-conditions.mjs:358`.
  Oba robią `JSON.stringify(current.changes) !== JSON.stringify(target.changes)`, gdzie
  `current` bywa dokumentem, a `target` naszą strukturą. Dziś obie strony schodzą się przez
  shim, ale **to porównanie zacznie kłamać jako pierwsze**, gdy jedna strona będzie miała
  `type`, a druga `mode`: efekt będzie wtedy przepisywany w kółko albo nigdy. To jest
  najbardziej prawdopodobne miejsce na cichą regresję w całej tej robocie — zacznij od
  niego, nie od końca listy z §4.

## 6. Jak to zweryfikować (i czego nie uznać za sukces)

1. `npm test`, `npm run validate:css`, graf ESM — jak zwykle, przed i po.
2. Quench na żywo: `game.neuroshima.tests.run()`. Punkt odniesienia **412/412**
   (stan z 2026-09-22, po naprawach z tej samej sesji). Uruchom **kilka razy** — paczka
   `magazynki` miała niedawno flakującą fiksturę i warto wiedzieć, że to już nie wraca.
3. **Ręcznie, na żywym aktorze** — bo to jedyny sposób zobaczyć, czy efekt naprawdę
   działa, a nie tylko „tworzy się bez błędu". Dla każdego z czterech:
   * **Udźwig** — przeciąż postaci plecak: Szybkość ma spaść do połowy (`multiply`),
     a przy unieruchomieniu do zera (`override`). To jedyne dwa różne tryby w jednym pliku.
   * **Bez dna** — mnożnik udźwigu.
   * **Cichy krok**, **Samuraj** — dodatki (`add`).
   * **Chemia** i **Zranienie** — kary/bonusy z `add`.
4. Sprawdź w konsoli `effect.system.changes[0].type` — ma być **stringiem**. Jeśli widzisz
   `"custom.20"`, to znaczy, że ktoś wpisał priorytet zamiast trybu, czyli dokładnie
   pułapka z §2.

**Czego nie uznawać za sukces:** zniknięcia ostrzeżenia z konsoli. dnd5e 5.3 ma **własnych
35 użyć** `ACTIVE_EFFECT_MODES` i będzie je wypisywać niezależnie od nas, dopóki system nie
zrobi swojej migracji. Miarą jest **nasz kod i działające efekty**, nie cisza w konsoli.

## 7. Czego nie robić

* Nie migruj danych świata skryptem — rdzeń robi to sam (§3), a własna migracja może tylko
  zepsuć efekty, które dziś działają.
* Nie tłumacz `mode` na `CONST.ACTIVE_EFFECT_CHANGE_TYPES.*` (§2).
* Nie wrzucaj tego do gałęzi z inną tematyką. Dotyka czterech niezależnych mechanik
  (Udźwig, Bez dna, Samuraj, Cichy krok) plus Chemii i Zranienia — przy regresji chcesz móc
  cofnąć samą tę zmianę.
* Nie zostawiaj tego pliku po zakończeniu — skasuj `HANDOFF_active_effect_modes.md`
  w tym samym commicie, w którym migracja wchodzi. Taka jest konwencja tego repo
  (patrz `CLAUDE.md`).
