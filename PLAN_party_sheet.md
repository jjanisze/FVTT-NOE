# Neuroshima Override Plan: Karta Drużyny (Group Actor Sheet)

> **Status: PLAN.** Nic jeszcze nie zaimplementowane. Badania na żywo (FVTT v14.364 / dnd5e 5.3.0,
> aktor `Psychole z Vegas` = `tDA39MPlvFjc0rlW`) wykonane 2026-XX; wnioski w §0.

## Cel

Zamienić domyślną kartę drużyny dnd5e (`GroupActorSheet`) w narzędzie do prowadzenia
neuroshimowej wyprawy: stan drużyny (KW + Wyczerpanie + Zranienie), podróż (tempo, biom,
trudny teren), zapasy (jedzenie, woda, leki, paliwo) i sensowny ekwipunek drużynowy
z bagażnikiem pojazdu.

---

## §0. Stan zastany — ustalenia z badania

### Klasa i szablony do nadpisania

| Element | Ścieżka |
|---|---|
| Klasa | `dnd5e/module/applications/actor/group-sheet.mjs` — `GroupActorSheet extends MultiActorSheet` |
| Nagłówek (Travel Pace, XP) | `dnd5e/templates/actors/group/header.hbs` |
| Wiersz członka (KW, HP, staty) | `dnd5e/templates/actors/group/member.hbs` |
| Zakładka Ekwipunek | `dnd5e/templates/actors/group/inventory.hbs` |

`static PARTS = { header, tabs, members, inventory, biography }`,
`static TABS = [members, inventory, biography]`,
`static DEFAULT_OPTIONS.actions = { award, changePace, roll, toggleInventory }`.

### Model danych grupy (`dnd5e/module/data/actor/group.mjs`)

- `primaryVehicle` — `ForeignDocumentField(BaseActor)`. **Zerowany**, jeśli pojazd nie jest
  członkiem grupy albo nie jest `system.isVehicle` (linie 169–170).
- `getTravelPace()` (222) — jeśli `primaryVehicle` istnieje, tempa liczone są z jego
  `system.attributes.travel.paces`, inaczej z `attributes.travel.paces` grupy.
- `getInventorySource()` na karcie czyta flagę `dnd5e.inventorySource`:
  `"group"` (domyślnie) albo `"vehicle"` → `system.primaryVehicle`.

### Stan świata (na dziś)

- Grupa `Psychole z Vegas`: **0 własnych itemów**, 0 gb, 5 członków (wszyscy `character`,
  rozmiar `med`), `primaryVehicle = null`.
- Istnieje aktor typu `vehicle` **`GMT400`** (`Wke8ursIGVbKLMUF`, 16 itemów) — **nie jest
  członkiem grupy**, więc karta drużyny go nie widzi.
- Zapasy istnieją jako doraźne itemy `loot` na kartach postaci: `Konserwa (Alan)`,
  `Manierka (2) (Buźka)` itd. Brak jakiejkolwiek struktury.
- Umiejętności w tym świecie mają **polskie klucze** (`skr` = Skradanie się).
  `member.hbs` ma zaszyte na sztywno `prc`, `ste`, `sur` → w tym świecie to martwe klucze.

### Punkt 3 — „Ekwipunek search broke": rozstrzygnięcie

Search **nie jest zepsuty**. Test na żywo (3 tymczasowe itemy, wyczyszczone po teście):
`zzz` → wszystko ukryte, `Kanister` → tylko Kanister, wyczyszczenie → powrót; kliknięcia
`sort`/`group`/`filter` → zero błędów JS; `app._filters.inventory` aktualizuje się poprawnie.

Realny problem to **błędne założenie + zerowa zawartość**: zakładka Ekwipunek karty drużyny
pokazuje **wyłącznie itemy należące do aktora-grupy** (albo do `primaryVehicle`), a nie
zsumowany ekwipunek członków. Grupa ma 0 itemów → search wygląda na martwy.

Dodatkowo (kosmetyka/i18n, do naprawy przy okazji): `Search inventory`, `Contents`,
`Travel Pace`, `Slow`, `LAND/WATER/AIR`, `Advancement`, `XP POOL`, `AVG. LEVEL` — nieprzetłumaczone.

**Kto dźwiga ekwipunek drużynowy (RAW + FVTT):**

1. **Aktor-grupa** — abstrakcyjna „wspólna kupa": kasa drużyny, łup jeszcze nierozdzielony,
   rzeczy niczyje. Bez udźwigu, bez przeciążenia.
2. **`primaryVehicle`** — realny bagażnik. Ma `attributes.capacity.cargo` (ładowność),
   liczy przeciążenie i steruje tempem podróży. **To jest właściwe miejsce na GMT400.**
3. **Karty postaci** — to, co ktoś faktycznie niesie; wchodzi do jego `Udźwigu`
   (Średni: Siła × 5 kg użytkowy / × 10 kg maksymalny, podręcznik ~17364).

Pasek boczny zakładki Ekwipunek już pokazuje obciążenie każdego członka
(Alan 31/75, Laffitte 13/52.5, Lorentz 85/120, Raynald 57/75, Victor 41/112.5) — to jedyne
miejsce, gdzie karta drużyny widzi rzeczy członków.

---

## §1. Architektura

Ten sam wzorzec, co `sheet-shell.mjs` dla kart postaci — **cienka podklasa** stockowej klasy
odczytanej z żywego rejestru + wypełnianie treści przez hooki/DOM.

```
scripts/actors/party-sheet.mjs      ← podklasa GroupActorSheet: PARTS, TABS, actions
scripts/actors/party-travel.mjs     ← panel Podróż (§3) + logika biomów/trudnego terenu
scripts/actors/party-supplies.mjs   ← logika zapasów (§4): zapotrzebowanie, polowanie, gotowanie
scripts/config/biomes-data.mjs      ← 10 biomów: id, label, ikona, opis
templates/party-header.hbs          ← zamiennik header.hbs
templates/party-tab-zapasy.hbs      ← nowa zakładka
styles/party-sheet.css              ← (albo sekcja w neuroshima.css)
```

Rejestracja: w hooku **`ready`** (nie `init`) — tak jak `sheet-shell.mjs`, żeby
`CONFIG.Actor.sheetClasses.group` był już zapełniony przez dnd5e.

```js
function _stockGroupSheet() {
  const registered = CONFIG.Actor.sheetClasses?.group ?? {};
  return Object.entries(registered).find(([id]) => id.startsWith("dnd5e."))?.[1]?.cls ?? null;
}
```

`PARTS` kopiowane klucz po kluczu (ARCHITECTURE.md: *mutate, don't replace*), z podmianą
`header` na własny szablon i wstawieniem `zapasy` po `inventory`.

`TABS` przechodzi przez `localize`, więc polskie literały działają bez pliku lang:

```js
static TABS = [
  { tab: "members",   label: "Drużyna",   icon: "fas fa-users" },
  { tab: "inventory", label: "Ekwipunek", svg: "systems/dnd5e/icons/svg/backpack.svg" },
  { tab: "zapasy",    label: "Zapasy",    icon: "fas fa-boxes-stacked" },
  { tab: "biography", label: "Kronika",   icon: "fas fa-feather" }
];
```

---

## §2. Punkt 1 — Pasek stanu członka (KW + Wyczerpanie + Zranienie)

### Problem

`member.hbs` renderuje dwa paski o pełnej szerokości: `hp-bar` (PW) i `hd-bar` (**KW**).
Wyczerpanie i Zranienie — dwa najważniejsze tory w Neuroshimie — nie są widoczne wcale.

### Rozwiązanie

Rozbić wiersz KW na **trzy równe segmenty w jednej linii**: `KW | WYCZ | ZRAN`.
Wysokość i typografia bez zmian, więc karta nie rośnie.

```
┌─────────────────────────────────────────────┐
│ Lorentz                                     │
│ PW  ████████████████░░░░░░░░░░  85 / 120    │
│ KW ███░  4/6 │ WYCZ ●●○○○○ 2 │ ZRAN ●○○ 1   │
│ [16] TT   [9 m] Szybkość   Sur +5 (15) …    │
└─────────────────────────────────────────────┘
```

### Źródło danych — **rejestr, nie duplikat**

Ten sam odwrócony kierunek zależności, co panel „Stan" na karcie postaci
(`sheet-shell.mjs:_statusTracks`):

| Tor | Skąd |
|---|---|
| Wyczerpanie | `actor.system.attributes.exhaustion`, `max` z `CONFIG.DND5E.conditionTypes.exhaustion.levels`, źródła z `getExhaustionSources(actor)` (kolory `EXHAUSTION_SOURCES[k].color`) |
| Zranienie | `getLevelledRegistry().get("zranienie")` → `{label, max, get, set, summary}` (rejestrowane w `combat/zranienie.mjs:84`) |

Karta drużyny **nie może** znać wewnętrznych flag Zranienia — czyta wyłącznie rejestr,
identycznie jak Token HUD. Publiczne API: `game.neuroshima.conditions.tracks()`.

### Implementacja

1. `_prepareMembersContext()` — nadpisać (`super` + wzbogacenie): dla każdego `member`
   doliczyć `member.tracks = [{id, name, value, max, pips:[{filled, color, tooltip}]}]`.
   Uszanować `member.hiddenStats` (brak uprawnień OBSERVER → nie pokazujemy stanu).
2. Własny szablon `templates/party-member.hbs` (kopia `member.hbs` z podmienionym blokiem
   `.bars`) — albo, mniej inwazyjnie, injekcja DOM w `_onRender`. **Preferowany szablon**:
   `member.hbs` jest wołany jako partial z `members.hbs`, więc trzeba podmienić i `members`
   part. Do zweryfikowania przy implementacji, czy taniej nadpisać `members.hbs`.
3. Pipsy **klikalne dla MG** (`track.set(...)`), read-only dla graczy — recykl
   `_buildTrackRow` z `sheet-shell.mjs` (wyekstrahować do wspólnego modułu, żeby nie
   duplikować tooltipów i kolorów).
4. Wyczerpanie na poziomie `max` → segment `terminal` (czerwony) + tooltip „Śmierć".

### Przy okazji

Naprawić zaszyte `prc` / `ste` / `sur` w sekcji `.stats` → mapa na klucze tego świata
(`spo` Spostrzegawczość?, `skr` Skradanie się, `prz` Przetrwanie?) — **do potwierdzenia
z `config/skills.mjs`** przed implementacją. Jeśli klucze nie istnieją, wiersz jest martwy.

---

## §3. Punkt 2 — Panel Podróż (zamiast Travel Pace)

Decyzja: **zastąpić natywną kartę `.movement.card` w całości.** Natywny model
(land/water/air, mile/dzień, `slow|normal|fast`) nie odwzorowuje neuroshimowych reguł.

### Reguły do zaimplementowania

**Tempo podróży** (podręcznik ~2448–2525), maks. **8 h marszu na dobę** (chyba że pojazd
z rotacją kierowców):

| Tempo | Na minutę | Na godzinę | Na dobę | Efekt |
|---|---|---|---|---|
| Bardzo szybkie | 500 m | 30 km | 240 km | **Utrudnienie** w Testach Mądrości (Percepcja/Survival); ukrycie **niemożliwe**. Wymaga pojazdu ≥30 km/h na przejezdnej drodze |
| Szybkie | 200 m | 12 km | 96 km | **Utrudnienie** w Testach Zręczności (Skradanie się). Wierzchowiec lub wolny pojazd, teren płaski/droga |
| Normalne | 100 m | 6 km | 48 km | Marsz po bezdrożach, ruinach, lasach |
| Powolne | 50 m | 3 km | 24 km | **Ułatwienie** w Testach Mądrości (Percepcja/Survival). Wymuszone przez **trudny teren** |

**Trudny teren** (~1357): każde 1,5 m ruchu kosztuje 3 m; efekty **się nie kumulują**.
Przykłady: zagracone pomieszczenia, niskie tunele, gruzy, schody, strome zbocza, zaspy,
przeszkody wodne, bagna.

**Ignorowanie trudnego terenu** (istniejące mechaniki w module i podręczniku):

| Źródło | Zakres | Stan |
|---|---|---|
| Zwiadowca 3 — *Cichy krok* | tylko posiadacz | ✅ `cichy-krok.mjs` (AE `system.attributes.movement.ignoredDifficultTerrain = all`) |
| Zwiadowca 1 — *Mój biom* | **cała drużyna**, pieszo, w wybranym biomie | ❌ brak |
| Sztuczka *Człowiek-pająk* → **Po dwa na raz** | pochyły teren i schody | ❌ brak |
| Bestiariusz — *Wszędołaz* | potwór | (poza zakresem) |

**Zwiadowca 1 — Mój biom** (~6296). Biomy: **Bagna, Góry, Las, Miasto, Neodżungla,
Podziemia, Preria, Pustynia, Ruiny, Tereny Maszyn**. W wybranym biomie:
- Ułatwienie do Testów Inteligencji i Mądrości z nim związanych,
- pieszo: **trudny teren nie spowalnia ciebie ani twojej drużyny**,
- **nikt i nic nie jest w stanie cię zaskoczyć**,
- samotnie: skradanie w tempie normalnego ruchu,
- 8 h szukania wody i pożywienia → **wyżywisz 4 osoby przez dobę**,
- tropiąc: dokładna liczebność, rozmiar i czas pozostawienia śladów.

Liczba biomów rośnie z poziomem: `@scale.zwiadowca.mojBiom` (2,2,2,3,3,3,4,4,4,5,5,5).

Inne sztuczki dotykające ruchu: **Szybkonogi** (+3 m Szybkości), **Sportowiec**
(Zwiadowca 7, +3 m + Ułatwienie do Atletyki), **Długie susy** (Bieganie jako Akcja Bonusowa),
**Pogoń** (Zwiadowca 11, RO gdzie porażka = Wyczerpanie z Ułatwieniem).

### Problem danych: który biom wybrał Zwiadowca?

Dziś zapisana jest **tylko liczba** biomów (`scale value`). **Który** — nigdzie.

Rozwiązanie: flaga na aktorze + picker.

```
flags["neuroshima-2026-overrides"].biomy = ["ruiny", "tereny-maszyn"]
```

- `scripts/config/biomes-data.mjs` — 10 biomów: `{ id, label, icon, hint }`.
- Picker na karcie postaci: w bloku zdolności klasowej `moj-biom` (obok istniejącego
  `resource: "@scale.zwiadowca.mojBiom"` w `class-features-data.mjs:559`) — N slotów,
  gdzie N = wartość scale value. Wybór ponad limit blokowany; spadek limitu tylko ostrzega.
- Helper: `getBiomy(actor)`, `partyBiomes(groupActor)` → `Map<biomId, Actor[]>`.

### Nowy panel w nagłówku

```
┌──────────── PODRÓŻ ────────────┐┌───── DRUŻYNA ─────┐
│ ◀  N O R M A L N E  ▶          ││ ŚR. POZIOM     3  │
│ 100 m/min · 6 km/h · 48 km/dobę││ PD (pula)      —  │
│ Biom:  [Ruiny ▾]   8 h/dobę    ││ Porządek marszu ▾ │
│ ⚠ Trudny teren — Lorentz (Mój  ││                   │
│   biom: Ruiny) prowadzi        ││                   │
│ ⓘ Utrudnienie: —               ││                   │
└────────────────────────────────┘└───────────────────┘
```

Elementy:
1. **Selektor tempa** — 4 polskie tempa (chevrony `◀ ▶`, akcja `changePace` przepisana na
   własną listę zamiast `CONFIG.DND5E.travelPace`). Zapis:
   `flags[MODULE].podroz.tempo`. Nie ruszamy `system.attributes.travel.pace`, żeby nie
   walczyć z natywnym `getTravelPace()`.
2. **Dystanse** wyliczane z tabeli, nie z `Movement`. Pokazać na minutę / godzinę / dobę
   (doba = 8 h; jeśli `primaryVehicle` z rotacją kierowców → checkbox „24 h" i ×3).
3. **Selektor biomu** (MG) — 10 biomów. Wybór biomu:
   - podświetla członków, którzy mają go w `flags.biomy` → **trudny teren nie spowalnia
     drużyny**, **drużyna nie może zostać zaskoczona**,
   - pokazuje ile osób może wyżywić 8 h zbieractwa (4 × liczba zwiadowców z tym biomem).
4. **Wiersz „Trudny teren"** — przełącznik MG. Gdy ON i brak biomu/Cichego kroku →
   tempo wymuszone na **Powolne** (jak natywne `slowed`), z tooltipem *dlaczego*.
5. **Wiersz konsekwencji** — automatyczne wypisanie Ułatwień/Utrudnień aktualnego tempa.
6. **Przycisk „Rozpocznij podróż" (MG)** — post do czatu z podsumowaniem: tempo, dystans,
   biom, kto prowadzi, jakie modyfikatory obowiązują, plus link do rzutu na Wydarzenia w podróży.
7. **Porządek marszu** (~2436) — lista drag-and-drop członków, zapis
   `flags[MODULE].porzadekMarszu = [uuid...]`. Warianty: *powierzchnia / zabudowania /
   podziemia*. Determinuje kto wchodzi w pułapki i kto jest najbliżej w walce.

### Automatyka modyfikatorów (faza 2, opcjonalna)

Hook `dnd5e.preRollSkillV2` / `postBuildSkillRollConfig` — jeśli grupa jest w trybie podróży
(`flags[MODULE].podroz.aktywna`), dokładać Ułatwienie/Utrudnienie do Percepcji / Survival /
Skradania wg tabeli tempa. Wzorzec gotowy w `cichy-krok.mjs`.

---

## §4. Punkt 4 — Zakładka Zapasy

Nowy PART + wpis w `TABS`. Wzorzec kontenera z `sheet-shell.mjs`:

```js
zapasy: { container: { classes: ["tab-body"], id: "tabs" },
          template: `modules/${MODULE_ID}/templates/party-tab-zapasy.hbs`,
          scrollable: [""] }
```

Korzeń szablonu:
`<section class="tab {{tab.cssClass}}" data-tab="{{tab.id}}" data-group="{{tab.group}}">`

### Reguły (podręcznik ~17316–17370, ~2740–2790)

**Niedożywienie** — dzienne zapotrzebowanie wg rozmiaru:
Malutki 100 g · Mały 0,25 kg · **Średni 0,5 kg** · Duży 2 kg · Wielki 8 kg · Ogromny 32 kg.
Zjedzenie < połowy → **RO na Kondycję ST 10** albo 1 poziom Wyczerpania na koniec dnia.
5 dni bez jedzenia → automatyczne Wyczerpanie 5. dnia i kolejny poziom każdego następnego.
Wyczerpania z niedożywienia **nie da się zdjąć**, dopóki nie zje się pełnej racji.
Oznaczenie na karcie: **„N"**.

**Odwodnienie** — dzienne zapotrzebowanie:
Malutki 0,5 l · Mały 1 l · **Średni 2 l** · Duży 30 l · Wielki 60 l · Ogromny 240 l.
Wypicie < połowy → **automatyczny** poziom Wyczerpania (bez RO). Oznaczenie: **„O"**.

**Polowanie** (Postój, ~2754): 1 h na postoju na pustkowiu → Test Mądrości (Survival)
**ST 15**. Sukces = źródło czystej wody **albo** jedzenie dla 1 osoby na 1 dobę.
Porażka o >5 → Wyczerpanie i nic nie znajdujesz.
*Modyfikator: Zwiadowca w swoim biomie — 8 h → jedzenie i woda dla 4 osób na dobę.*

**Gotowanie** (~2740): narzędzia małego kucharza + składniki + 2 h → Test narzędzi **ST 10**.
Sukces = **Ułatwienie w następnym RO** dla każdego, kto jadł. Wynik ≥20 → każdy dostaje
**Fuks** ważny 24 h.

**Ceny/dostępność** (~3520–3535, 9150): prowiant 5 gb / 0,5 kg / 70% · woda pitna 4 gb / 4 kg ·
uzupełnienia małego medyka 5 gb / 0,5 kg / 40%.

**Długi odpoczynek** (24 h, ≥6 h snu) — zdejmuje 1 poziom Wyczerpania, odnawia PW i wydane KW.
Przerywany przez: rzut na inicjatywę, obrażenia, podróż >1 h.

### Układ zakładki

```
╔══ JEDZENIE I WODA ═════════════════════════════════════════╗
║ Prowiant   12,5 kg    zapotrzebowanie 2,5 kg/dobę   5 dni  ║
║ Woda       18 l       zapotrzebowanie 10 l/dobę     1,8 dni║  ← czerwone <2 dni
║ [Zaspokój dzienne zapotrzebowanie]   [Polowanie ST 15]     ║
║ [Gotowanie ST 10]                                          ║
╠══ LEKI ════════════════════════════════════════════════════╣
║ RadOff 2 · Uzup. małego medyka 3 · Antybiotyk 0            ║
╠══ PALIWO ══════════════════════════════════════════════════╣
║ GMT400 — kanistry: 40 l · zasięg ~… km                     ║
╠══ SKŁAD ═══════════════════════════════════════════════════╣
║ Drużyna 0 kg · GMT400 132/450 kg · Nosi: Lorentz 85/120 …  ║
╚════════════════════════════════════════════════════════════╝
```

### Skąd liczyć stany

Skanować **itemy grupy + `primaryVehicle` + wszystkich członków** i klasyfikować.
Dziś zapasy to bezładne `loot` (`Konserwa (Alan)`, `Manierka (2) (Buźka)` …) — potrzebna
warstwa identyfikacji. Preferowana: **flaga typu zasobu na itemie**

```
flags["neuroshima-2026-overrides"].zasob = { kind: "jedzenie"|"woda"|"lek"|"paliwo", amount: 0.5, unit: "kg"|"l" }
```

plus fallback po nazwie (`/prowiant|konserw|racj/i`, `/woda|manierk|butelk/i`) dla itemów
bez flagi, żeby zakładka miała sens od pierwszego uruchomienia. Migracja jednorazowa
w `scripts/migration/` może doflagować istniejące itemy.

Wzorzec agregacji i UI — recykl z istniejących paneli `ammo-inventory.mjs` /
`surowce-inventory.mjs` (zakładka Zasoby na karcie postaci).

### Akcje

- **Zaspokój dzienne zapotrzebowanie** (MG) — odejmuje racje wg rozmiaru każdego członka;
  brakującym: jedzenie → RO na Kondycję ST 10, woda → automatyczne Wyczerpanie.
  Wywołanie przez istniejące `addExhaustion(actor, "niedozywienie" | "odwodnienie")`
  z `config/exhaustion.mjs` (kolory/źródła pipsów już to obsługują — sprawdzić, czy klucze
  źródeł istnieją; jeśli nie, dodać `niedozywienie` i `odwodnienie` do `EXHAUSTION_SOURCES`).
- **Polowanie** — rzut Survival ST 15 wybranego członka + auto-doliczenie wyniku do zapasów;
  bonus biomu Zwiadowcy uwzględniany automatycznie.
- **Gotowanie** — test narzędzi ST 10; ≥20 → rozdanie Fuksa (`fuks-pips.mjs`) wszystkim.
- Wszystko posyła kartę do czatu; nic nie dzieje się po cichu.

---

## §5. Punkt 3 — Ekwipunek: bagażnik i nawigacja

### 5.1 Podpiąć GMT400 jako `primaryVehicle` (natychmiastowa wygrana, zero kodu)

1. Dodać aktora `GMT400` (`Wke8ursIGVbKLMUF`) jako **członka** grupy `Psychole z Vegas`.
2. Ustawić `system.primaryVehicle` na tego aktora.
3. Karta natychmiast pokaże w `.inventory-element .currency` natywny `split-button`
   (`_renderInventoryToggle` / akcja `toggleInventory`) przełączający
   **Drużyna ⇄ GMT400** — to jest gotowy „bagażnik", z ładownością i przeciążeniem.
4. Bonus: `getTravelPace()` zacznie liczyć tempa z pojazdu.

**Do zrobienia w kodzie:** spolszczyć etykiety tego przełącznika i ustawić
`system.attributes.capacity.cargo.units` na `kg` (dziś `lb`).

### 5.2 Search obejmujący ekwipunek członków

Domyślnie `_filterChildren("items")` → `_filterItems(this.inventorySource.items)`.
Rozszerzyć o trzeci tryb źródła:

- Flaga `dnd5e.inventorySource` przyjmuje dodatkowo `"party"` (albo własna flaga modułu),
- w tym trybie `inventorySource.items` = wirtualna kolekcja: itemy grupy + pojazdu +
  wszystkich członków, każdy z `item.parent` do wyświetlenia właściciela,
- w wierszu itemu dodać kolumnę/pigułkę **właściciela** (portret + imię),
- read-only dla graczy bez uprawnień do danej postaci (`testUserPermission(OBSERVER)`).

Uwaga wydajnościowa: kolekcja budowana raz w `_prepareContext`, nie per-keystroke
(`FILTER_DEBOUNCE_MS = 200` i tak dławi input).

### 5.3 „Jump to" / nawigacja

- Kliknięcie właściciela w wierszu itemu → otwiera kartę tej postaci na Ekwipunku.
- Przycisk **„Do bagażnika"** przy każdym itemie w trybie `party` → przenosi item do
  `primaryVehicle` (i odwrotnie: **„Wydaj"** → wybór członka).
  Karta już wspiera drop itemu na członka (`_onDropItem` przekazuje do `_onDropCreateItems`
  właściwego aktora) — przyciski to tylko wygodniejszy wariant tego samego.
- Skrót w pasku bocznym: klik w portret członka → filtruje listę do jego itemów
  (ustawia `app._filters.inventory.owner`).

### 5.4 i18n

Dodać `lang/pl.json` do modułu i nadpisać co najmniej:
`DND5E.InventorySearch`, `DND5E.Inventory.Grouping.Contents`, `DND5E.TRAVEL.*`,
`DND5E.AdvancementTitle`, `DND5E.ExperiencePoints.Pool`, `DND5E.LevelAvg`.
(Część i tak zniknie razem z podmienionym nagłówkiem — §3.)

---

## §6. Kolejność dostarczania

| Faza | Zakres | Ryzyko |
|---|---|---|
| **0** | §5.1 — GMT400 jako `primaryVehicle`, `capacity.cargo.units = kg`, `lang/pl.json` | zerowe, bez kodu sheetu |
| **1** | §1 szkielet `party-sheet.mjs` + §2 paski KW/Wyczerpanie/Zranienie | niskie — czysty rejestr + szablon |
| **2** | §3 panel Podróż (tempo, dystanse, trudny teren) **bez** biomów | średnie — podmiana `header.hbs` |
| **3** | `biomes-data.mjs` + picker „Mój biom" na karcie postaci + wpięcie w panel Podróży | średnie — dotyka karty postaci |
| **4** | §4 zakładka Zapasy: jedzenie/woda + Niedożywienie/Odwodnienie | średnie — nowa warstwa danych (flaga `zasob`) |
| **5** | §4 polowanie / gotowanie / leki / paliwo | niskie |
| **6** | §5.2–5.3 search po ekwipunku członków + „jump to" / „do bagażnika" | wysokie — nadpisanie `_filterChildren` |
| **7** | §3 automatyka Ułatwień/Utrudnień tempa; porządek marszu | niskie |

## §7. Do potwierdzenia przed implementacją

1. **Klucze umiejętności tego świata** — `config/skills.mjs`: czy istnieją odpowiedniki
   `prc` (Spostrzegawczość), `sur` (Survival/Przetrwanie)? `skr` jest potwierdzone.
2. Czy `EXHAUSTION_SOURCES` ma już klucze `niedozywienie` / `odwodnienie` (karta postaci
   używa skrótów **N** i **O**).
3. Czy podmiana `header` PART wystarczy, czy `members` PART też trzeba podmienić, żeby
   dostać własny `member.hbs` (partial jest wołany z `members.hbs`).
4. Czy `GMT400` ma sensowne `system.details.type` (`land`) — od tego zależy mnożnik tempa
   w `getTravelPace()`.

## §8. Poza zakresem

- Kalendarz / upływ czasu podróży (dziś `dayCounter` z `health-panel.mjs` — ewentualne
  wpięcie później).
- Losowe tabele Wydarzeń w podróży (przycisk będzie, tabela osobno).
- Ekonomia kosztu utrzymania i Długiego postoju (~2790–2830).
