# Hand-off — Chemia, leki i narkotyki + naprawa kompendiów

Napisane 2026-08-22 przez poprzedniego agenta, po `v0.9.6` (commit `c60258c`).
Wszystko poniżej jest **zweryfikowane na żywym świecie**, nie zgadywane. Nie odkrywaj tego
ponownie.

---

## 1. Połączenie — zrób to najpierw, zajmuje 30 sekund

FoundryVTT **działa** i trzyma blokadę na LevelDB. Pracuj przez Chrome DevTools MCP, nie
przez `mcp_foundry-vtt_*`.

```
tool_search("chrome devtools list pages select page evaluate script")
mcp_chrome_devtoo_list_pages()      → jedna strona: "Foundry Virtual Tabletop"
mcp_chrome_devtoo_evaluate_script(function="async () => { ... }")
```

- **Port to 30009**, nie 30000: `http://localhost:30009/game`. Nigdy nie zapisuj go na sztywno w kodzie modułu.
- `.vscode/mcp.json` używa `--browserUrl http://127.0.0.1:9222`. Jeśli `list_pages` padnie,
  przeczytaj sekcję „Chrome DevTools MCP connection — SOLVED" w pamięci repo, zanim cokolwiek
  zaczniesz naprawiać. **Nie ubijaj i nie restartuj chrome.exe** — zabijesz sesję użytkownika.
- Świeży kod modułu ładujesz przez `location.reload()` w evaluate_script. Sesja zwykle przeżywa.
- `game.modules.get("neuroshima-2026-overrides").version` pokaże **0.9.5**, mimo że `module.json`
  ma 0.9.6 — manifesty są cache'owane przy starcie **serwera**. Kosmetyka, zignoruj.
- Import modułów w konsoli: `await import("/modules/neuroshima-2026-overrides/scripts/config/X.mjs")`.

---

## 2. Stan faktyczny — co JEST, a czego NIE MA

### Kompendia modułu (`game.packs`, stan na dziś)

| Pack | Typ | Wpisów | Uwaga |
|---|---|---|---|
| `klasy` | Item | 6 | OK |
| `profesje` | Item | 18 | OK |
| `zdolnosci-klasowe` | Item | 133 | OK |
| `bestiariusz` | Actor | 51 | OK |
| **`sztuczki`** | Item | **0** | `build-packs.mjs:1149` woła `writePack(PACK.sztuczki, [])` — **celowo pusty**, stary TODO. Źródło: `Tabele/Sztuczki.md` |
| **`lekarstwa`** | Item | **0** | Builder emituje 12 dokumentów (`build-packs.mjs:1099`), ale na dysku `packs/lekarstwa/` ma **359 bajtów** i zero plików `.ldb`. Build dla tego packa nigdy nie zapisał danych albo padł na blokadzie |

**Nie ma w ogóle packów na: broń, amunicję, pancerz, narzędzia, granaty, chemię/leki/narkotyki.**
Wszystkie 832 przedmioty żyją w folderach świata (`game.folders`, type `Item`):
Amunicja (20), Broń biała (20), Broń miotana (11), Broń palna ciężka/długa/krótka/pośrednia
(8/13/13/8), Broń specjalna (2), Granaty (12), Magazynki (6), Narzędzia (22), Loot (PC) (187),
Weapons (NPC) (81), Weapons (PC) (46), Blackjack (52)…

Aktor **Zbrojownia** (`4IYaZ7YQ1uy90FOz`, flaga `isZbrojownia`) to master 199 przedmiotów;
`scripts/items/zbrojownia-sync.mjs` pcha je do folderów świata. Zdecyduj świadomie, czy
kompendia mają być budowane z plików `config/*-data.mjs` (jak klasy) czy eksportowane ze
Zbrojowni — **i zapisz tę decyzję**. Konwencja repo mówi jasno: *packi to artefakt builda i
nigdy nie edytuje się ich ręcznie* (`dev/packs/build-packs.mjs`, nagłówek).

### Tooling do packów (już istnieje, nie pisz od nowa)

```
npm run build:packs        # node dev/packs/build-packs.mjs   (--only=nazwa,nazwa2)
npm run validate:packs
```

- **LevelDB jest single-writer. Foundry MUSI być wyłączony na czas builda.** To najbardziej
  prawdopodobna przyczyna pustego `lekarstwa`. Poproś użytkownika o wyłączenie serwera —
  nie ubijaj procesu sam.
- `idFor(kind, slug)` w builderze daje deterministyczne 16-znakowe id z SHA-1, żeby przebudowa
  nie unieważniała UUID-ów. Używaj go dla nowych packów.
- Pack, którego Foundry nigdy nie widział, wymaga zapisu w `module.json` → `packs[]` **oraz**
  `packFolders[0].packs[]` (folder „Neuroshima", `#6b3f1f`).

### Dane źródłowe (Obsidian, workspace „Kampania")

| Plik | Zawartość |
|---|---|
| `Tabele/ChemiaIDrugi.md` | **Główne źródło dla tego zadania.** 14 środków leczniczych, 9 narkotyków/używek, 3 materiały pirotechniczne, tabela schematów produkcji (ST/czas/surowce) |
| `Tabele/Bronie/*.md` | BronPalna, BronBiala, BronMiotana, Amunicja, Ulepszenia, WlasciwosciBroni |
| `Tabele/Narzedzia.md` | 22 zestawy narzędzi (już w kodzie: `config/toolkits-data.mjs`) |
| `Tabele/Pancerz.md`, `Tabele/Zywnosc.md`, `Tabele/Sztuczki.md` | reszta |

### Co w kodzie już dotyka leków

- `scripts/config/medicine-data.mjs` — `MEDICINES` (12 kluczy: desmopresyna, preparatyKrwiopochodne,
  aspirynaK, dracophen, reminex, relanium, wapniak, psychotropy, actinix, radoff, radmov,
  antybiotyk), `medicineItemData(key, overrides)`, `medicinesForDisease`, `MEDICINE_FLAVOR`.
  **To są leki na CHOROBY** — nie pokrywają się z `ChemiaIDrugi.md` (Medpak, AR-23, AR-35 BETA,
  Painkiller, Taurus, Deadline, Anestix, Detoks, Trybiotyl, Neuro-Cola, WD-Tabs…). Rozstrzygnij,
  czy to jeden zbiór czy dwa, zanim zaczniesz pisać dane.
- `scripts/actors/health-panel.mjs:258` — `_grantMedicine()` czyta z packa `lekarstwa`, a gdy
  pack jest pusty, **po cichu** spada na `medicineItemData(key)`. Funkcja działa, więc pusty
  pack nie rzuca się w oczy. To dlatego nikt tego nie zauważył.
- `CONFIG.DND5E.consumableTypes.lekarstwo` już istnieje (własny typ modułu) z podtypami
  `przewlekla | popromienna | antybiotyk | inne`. Podtypy `poison` (contact/ingested/inhaled/injury)
  i `potion` z SRD też są dostępne.

### API modułu (`game.neuroshima`)

`AMMO_CALIBERS`, `AMMO_CALIBER_MAP`, `GRENADE_TYPES`, `GRENADE_MAP`, `TOOLKITS`, `createToolkits`,
`health`, `falling`, `conditions`, `vfx`, `sounds`, `props`, `maps`, `trudnyTeren`.

Dla narkotyków najważniejsze:

```js
const C = game.neuroshima.conditions;
C.tracks();                       // ["upojenie", "skazenie", "zranienie"]
C.get(actor, "upojenie");         // rzuca na nieznanym id — to celowe
await C.set(actor, "upojenie", 2);
await C.adjust(actor, "zranienie", -1);
await C.drink(actor);             // +1 Upojenie
await C.soberUp(actor);
game.neuroshima.health.syncEffects(actor);
```

Wyczerpanie: `addExhaustion(actor, sourceKey)` / `removeExhaustion` z
`scripts/config/exhaustion.mjs`. Źródła w `EXHAUSTION_SOURCES` (11 kluczy, każde z `color`
barwiącym pips w panelu Stan). **Jeśli narkotyk daje Wyczerpanie, prawdopodobnie zasługuje na
własny klucz źródła** — tak zrobiono z `choroba` w v0.9.6.

---

## 3. Zadanie

### A. Naprawa kompendiów

1. Ustal, dlaczego `lekarstwa` jest pusty (podejrzenie: build przy działającym Foundry), napraw,
   przebuduj, zweryfikuj `game.packs.get("...lekarstwa").index.size === 12`.
2. Zapełnij `sztuczki` z `Tabele/Sztuczki.md`. Uwaga: `build-packs.mjs:301` zostawia pustą pulę
   `pool: []` w ItemChoice klas — **po zapełnieniu packa trzeba tam wpiąć UUID-y**, inaczej gracze
   dalej nie wybiorą sztuczki przy awansie. To jest ta połowa roboty, o której łatwo zapomnieć.
3. Dodaj brakujące kompendia (broń / amunicja / pancerz / narzędzia / granaty / chemia). Ustal
   z użytkownikiem zakres, zanim wygenerujesz 800 przedmiotów.

### B. Chemia, leki i narkotyki — efekty i karty czatu

Zbuduj przedmioty z `Tabele/ChemiaIDrugi.md` jako `consumable`, **wzorując się na tym, jak robi
to dnd5e**: aktywności + Active Effects na przedmiocie, nie własny silnik od zera.

Zweryfikuj każdy efekt na żywym aktorze. Rzeczy, które są tu naprawdę trudne i wymagają decyzji:

- **Efekty odroczone i „po upływie"** — Anestix (odporność 1 min, potem RO Kondycja ST 20 albo
  +1 Stopień Zranienia), Deadline (regeneracja 10 min, potem RO ST 15). dnd5e nie ma
  wbudowanego „zrób coś, gdy efekt wygaśnie". Trzeba haka na czasie/turach albo przycisku
  w karcie czatu. **Zdecyduj i uzasadnij, nie udawaj, że działa.**
- **Kary skalowane liczbą dawek** — Painkiller: każda tabletka to −1 do testów Mądrości,
  a gdy kara przekroczy Mądrość, postać traci przytomność.
- **Szał bojowy AR-35 BETA** — moduł ma już mechanikę szału przy chorobach
  (`spec.rage` w `config/disease-effects.mjs`, pasek szału w `actors/disease-effects.mjs`).
  **Użyj jej ponownie**, nie pisz drugiej.
- **Limity dzienne** — Medpak max 2/dzień, AR-35 max 1/dzień (2. dawka = 75% śmierci).
  Licznik dni to `game.settings.get(MODULE_ID, "dayCounter")`, przesuwany przez Zachód słońca.
  Wzorzec „flaga trzyma numer dnia" jest już w v0.9.6: `NO_REST_FLAG` w `config/diseases-data.mjs`.
- **Uzależnienie / „blues" od Tornado** — czysto fabularne w podręczniku. Jeśli tego nie
  automatyzujesz, **napisz to wprost** w polu `manual`, tak jak zrobiono z chorobą zakaźną
  i Death Breath. Zasada domu: mechanika, która działa po cichu, to błąd.

---

## 4. Zweryfikowane wzorce dnd5e (odczytane z SRD w tym świecie)

**Mikstura lecznicza** — `dnd5e.equipment24.dmgPotionOfHeali`:

```js
type: "consumable",
system: {
  type: { value: "potion", subtype: "" },
  uses: { max: "1", spent: 0, autoDestroy: true, recovery: [] },
  activities: { <id>: {
    type: "heal", name: "Consume",
    healing: { number: 2, denomination: 4, bonus: "2", types: ["healing"] },
    consumption: { targets: [{ type: "itemUses", value: "1" }] }
  }}
}
```

**Trucizna z RO i obrażeniami** — `dnd5e.equipment24.dmgWyvernPoison0`:

```js
system: {
  type: { value: "poison", subtype: "injury" },
  activities: { <id>: {
    type: "save",
    save: { ability: ["con"], dc: { calculation: "", formula: "14" } },
    damage: { parts: [{ number: 7, denomination: 6, types: ["poison"] }], onSave: "half" }
  }}
}
```

**Nałożenie stanu po nieudanym RO** — `dnd5e.equipment24.dmgPotionOfPoiso`. To jest ten wzorzec,
którego będziesz potrzebować najczęściej: aktywność `save` linkuje do Active Effectu **na
przedmiocie**, przez jego `_id`:

```js
activities: { <id>: {
  type: "save",
  save: { ability: ["con"], dc: { formula: "13" } },
  damage: { parts: [{ number: 4, denomination: 6, types: ["poison"] }], onSave: "full" },
  effects: [{ _id: "lZOgSICPuR1fKxTL", onSave: false, level: { min: null, max: null } }]
}},
effects: [{
  _id: "lZOgSICPuR1fKxTL",
  name: "Poisoned",
  transfer: false,                                    // NIE przenosi się przez samo posiadanie
  statuses: ["poisoned"],
  duration: { value: 3600, units: "seconds", expiry: "turnStart" },
  changes: []
}]
```

`onSave: false` = efekt tylko przy porażce. `transfer: false` jest kluczowe — inaczej trucizna
działa, gdy leży w plecaku.

Typy aktywności dostępne w świecie: `attack, cast, check, damage, enchant, forward, heal, order,
save, summon, transform, utility` + własne modułu `neuroReload, neuroLoadOne, neuroMagSwap,
neuroKs, neuroDs, neuroMs, neuroOz`.

Typy obrażeń (`scripts/config/damage-types.mjs`): slashing, piercing, bludgeoning, fire,
**light („Od światła")**, lightning, acid, explosive, psychic, poison, radiant („Radioaktywne"),
cold, healing, temphp.

Sequencer 4.2.2 jest aktywny (`game.neuroshima.vfx`, `sounds`). **JB2A_DnD5e jest zainstalowany.**
Wzorzec fallbacku: sprawdź `Sequencer.Database.entryExists(...)`, w razie braku użyj
`s.animation().on(token).tint(...)` — patrz `scripts/items/toolkit-medyk.mjs:_playHealVfx`.

---

## 5. Pułapki, które kosztowały poprzednie sesje

- **`item.createActivity(type, data, {renderSheet:false})`** — NIE `createEmbeddedDocuments("Activity")`
  (rzuca „Activity is not a valid embedded Document"). **Nigdy nie wstawiaj `activities` z zakodowanym
  `_id` w payloadzie tworzenia przedmiotu** — dnd5e 5.3 po cichu odrzuca i zwraca `undefined`.
  Twórz przedmiot, potem dodawaj aktywności.
- dnd5e **sam** tworzy domyślną aktywność przy tworzeniu przedmiotu. Generator narzędzi kasuje
  wszystkie (`item.deleteActivity`) i buduje od nowa. Zrób tak samo.
- `system.damage.base.formula` jest **getterem** — ustawiaj `number` + `denomination`.
- `actor.rollSavingThrow({ability, target: DC}, {configure:false}, {create:true})` — klucz DC to
  `target`, nie `targetValue`. Bez `configure:false` otwiera dialog i **zawiesza CDP**.
- Odporności/immunitety: `prepareResistImmune` kasuje stany z `actor.statuses` przy **każdym**
  prepareData — sprawdzaj immunitet zawczasu, nie licz na to, że stan się utrzyma.
- `actor.update()` → natychmiastowy odczyt pól pochodnych (`system.attributes.exhaustion`) bywa
  nieaktualny. Odpytaj ponownie w osobnym `evaluate_script`.
- `replace_string_in_file` psuje się na `\uXXXX` w polskim tekście — wpisuj litery wprost.
- Po ręcznej edycji `styles/neuroshima.css` **zawsze** `npm run validate:css` (exit 0). Plik ma
  historię „osierocone deklaracje po cichu ucinają resztę arkusza".

### Sprzątanie po testach — traktuj poważnie

W poprzedniej sesji masowe kasowanie czatu po `speaker.actor` skasowało **14 prawdziwych kart
z historii sesji**. Nie do odzyskania; jedyny backup ma trzy miesiące.

- Zbieraj **konkretne id** utworzonych wiadomości (`before`/`after` na `game.messages`) i kasuj
  tylko je. Filtr po samym aktorze to za mało — dołóż `m.timestamp > <start testu>`.
- Testuj na aktorze jednorazowym (`ZZ Test …` / prefiks `__`), nie na postaciach graczy.
- `sunsetCheck()` przesuwa **światowy** licznik dni. Przywróć go po teście.
- Postać testowa MG: **Piekarz** (`MDczZGFlMTBkMWQ5`). Zostaw ją dokładnie tak, jak zastałeś:
  wszystkie tory 0, Wyczerpanie 0, szybkość 9, `choroby: ["szalenstwoBostonskie"]`, jeden efekt
  „Szaleństwo bostońskie — Przewlekły". Drugi aktor testowy: Jaggernaut (NPC, `NjNlMzliYmVhNzk0`).
- Aktorzy do broni: „TESTER - Bez sztuczek" (`4IYaZ7YQ1uy90FOz`, on jest Zbrojownią),
  „TESTER - Ze sztuczkami" (`8kjvzT4K3g40IHjX`).

---

## 6. Konwencje repo

- Język: **polski** w kodzie i dokumentacji użytkownika (komentarze i nazwy techniczne — angielski).
- Komentarz pisze się tylko po to, żeby powiedzieć to, czego kod nie pokaże sam. Jedna linia.
  Bez powtarzania tego, co robi następna linia.
- Po zmianach: `module.json` → wersja w górę, wpis `### v0.X.Y — <tytuł> (data)` **na górze**
  changelogu w `IMPLEMENTATION.md`, po polsku. Głębsze wyjaśnienia idą do `DEV_GUIDE.md`.
- Nie twórz plików `.md` z opisem zmian, jeśli nikt o to nie prosił.
- Pamięć repo: `/memories/repo/fvtt-dev-context.md` — przeczytaj sekcje „Choroby — automation
  audit", „Access Mode Decision" i „CDP Gotchas" **zanim zaczniesz**. Dopisz, czego się nauczysz.

---

## 7. Stan git

Ostatni commit: `c60258c` — *feat(choroby): przegląd wszystkich chorób* (v0.9.6). Drzewo modułu
czyste. Repo `C:\Git\Neuroshima\Maps` ma niezacommitowaną, **niezwiązaną** robotę nad mapami —
nie ruszaj jej.
